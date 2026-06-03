export const SALARY_INCOME_MODES = {
    EXCLUDING_SUPER: 'excluding_super',
    PACKAGE_INCLUDING_SUPER: 'package_including_super',
};

export const EMPLOYER_SUPER_MODES = {
    CALCULATED: 'calculated',
    MANUAL_OVERRIDE: 'manual_override',
};

// Policy sources: ATO policy source id 'ato-super-guarantee' for SG rate and maximum super contribution base.
// ATO policy source id 'ato-contribution-caps' for concessional cap.
// ATO policy source id 'ato-division-293' for high-income Division 293 warning threshold.
export const DEFAULT_MAX_CONTRIBUTION_BASE_PER_QUARTER = 62500;
export const DEFAULT_CONCESSIONAL_CAP = 30000;
export const DEFAULT_DIVISION_293_THRESHOLD = 250000;

const toNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

export function calculateEmployerSuper({
    employmentIncome = 0,
    incomeMode = SALARY_INCOME_MODES.EXCLUDING_SUPER,
    sgRate = 0.12,
    maxContributionBasePerQuarter = DEFAULT_MAX_CONTRIBUTION_BASE_PER_QUARTER,
    payPeriodsPerYear = 4,
    applyMaxContributionBase = true,
} = {}) {
    const income = Math.max(0, toNumber(employmentIncome));
    const rate = Math.max(0, toNumber(sgRate, 0.12));
    const annualBase = Math.max(0, toNumber(maxContributionBasePerQuarter, DEFAULT_MAX_CONTRIBUTION_BASE_PER_QUARTER)) * Math.max(0, toNumber(payPeriodsPerYear, 4));
    const maxEmployerSG = applyMaxContributionBase ? annualBase * rate : Infinity;
    const cappedEmployerSG = Number.isFinite(maxEmployerSG) ? maxEmployerSG : income * rate;

    if (income <= 0 || rate <= 0) {
        return {
            incomeMode,
            employmentIncome: income,
            cashSalary: income,
            annualOTEForSG: 0,
            employerSG: 0,
            totalPackage: income,
            maxContributionBaseAnnual: annualBase,
            maxEmployerSG: Number.isFinite(maxEmployerSG) ? maxEmployerSG : null,
            sgCapApplied: false,
        };
    }

    if (incomeMode === SALARY_INCOME_MODES.PACKAGE_INCLUDING_SUPER) {
        const uncappedCashSalary = income / (1 + rate);
        const uncappedEmployerSG = income - uncappedCashSalary;
        const capApplies = applyMaxContributionBase && uncappedCashSalary > annualBase;
        const employerSG = capApplies ? cappedEmployerSG : uncappedEmployerSG;
        const cashSalary = Math.max(0, income - employerSG);

        return {
            incomeMode,
            employmentIncome: income,
            cashSalary,
            annualOTEForSG: capApplies ? annualBase : cashSalary,
            employerSG,
            totalPackage: income,
            maxContributionBaseAnnual: annualBase,
            maxEmployerSG: Number.isFinite(maxEmployerSG) ? maxEmployerSG : null,
            sgCapApplied: capApplies,
        };
    }

    const annualOTEForSG = applyMaxContributionBase ? Math.min(income, annualBase) : income;
    const employerSG = annualOTEForSG * rate;

    return {
        incomeMode: SALARY_INCOME_MODES.EXCLUDING_SUPER,
        employmentIncome: income,
        cashSalary: income,
        annualOTEForSG,
        employerSG,
        totalPackage: income + employerSG,
        maxContributionBaseAnnual: annualBase,
        maxEmployerSG: Number.isFinite(maxEmployerSG) ? maxEmployerSG : null,
        sgCapApplied: applyMaxContributionBase && income > annualBase,
    };
}

export function resolveEmployerSuper({
    employmentIncome = 0,
    incomeMode = SALARY_INCOME_MODES.EXCLUDING_SUPER,
    sgRate = 0.12,
    maxContributionBasePerQuarter = DEFAULT_MAX_CONTRIBUTION_BASE_PER_QUARTER,
    payPeriodsPerYear = 4,
    applyMaxContributionBase = true,
    employerSuperMode = EMPLOYER_SUPER_MODES.CALCULATED,
    employerSuperOverrideAmount = 0,
} = {}) {
    const calculated = calculateEmployerSuper({
        employmentIncome,
        incomeMode,
        sgRate,
        maxContributionBasePerQuarter,
        payPeriodsPerYear,
        applyMaxContributionBase,
    });
    const override = Math.max(0, toNumber(employerSuperOverrideAmount));
    const isManualOverride = employerSuperMode === EMPLOYER_SUPER_MODES.MANUAL_OVERRIDE;

    if (!isManualOverride) {
        return {
            ...calculated,
            calculatedEmployerSG: calculated.employerSG,
            employerSuperMode: EMPLOYER_SUPER_MODES.CALCULATED,
            employerSuperOverrideAmount: 0,
            employerSuperOverridden: false,
        };
    }

    const income = Math.max(0, toNumber(employmentIncome));
    const cashSalary = incomeMode === SALARY_INCOME_MODES.PACKAGE_INCLUDING_SUPER
        ? Math.max(0, income - override)
        : calculated.cashSalary;

    return {
        ...calculated,
        cashSalary,
        employerSG: override,
        totalPackage: incomeMode === SALARY_INCOME_MODES.PACKAGE_INCLUDING_SUPER
            ? income
            : cashSalary + override,
        annualOTEForSG: calculated.annualOTEForSG,
        calculatedEmployerSG: calculated.employerSG,
        employerSuperMode: EMPLOYER_SUPER_MODES.MANUAL_OVERRIDE,
        employerSuperOverrideAmount: override,
        employerSuperOverridden: true,
    };
}

export function calculateConcessionalCapStatus({
    employerSG = 0,
    salarySacrifice = 0,
    personalDeductibleContributions = 0,
    concessionalAlreadyUsed = 0,
    concessionalCap = DEFAULT_CONCESSIONAL_CAP,
} = {}) {
    const sg = Math.max(0, toNumber(employerSG));
    const sacrifice = Math.max(0, toNumber(salarySacrifice));
    const deductible = Math.max(0, toNumber(personalDeductibleContributions));
    const alreadyUsed = Math.max(0, toNumber(concessionalAlreadyUsed));
    const cap = Math.max(0, toNumber(concessionalCap, DEFAULT_CONCESSIONAL_CAP));
    const totalConcessional = sg + sacrifice + deductible + alreadyUsed;
    const remainingConcessionalCap = cap - totalConcessional;

    return {
        employerSG: sg,
        salarySacrifice: sacrifice,
        personalDeductibleContributions: deductible,
        concessionalAlreadyUsed: alreadyUsed,
        concessionalCap: cap,
        totalConcessional,
        remainingConcessionalCap,
        excessConcessionalContributions: Math.max(0, -remainingConcessionalCap),
        hasExcessConcessionalContribution: remainingConcessionalCap < 0,
        employerSGFillsCap: sg >= cap,
    };
}

export function shouldWarnDivision293({
    cashSalary = 0,
    totalPackage = 0,
    lowTaxContributions = 0,
    incomeForDiv293Estimate = null,
    threshold = DEFAULT_DIVISION_293_THRESHOLD,
} = {}) {
    const estimateIncome = incomeForDiv293Estimate !== null
        ? toNumber(incomeForDiv293Estimate)
        : Math.max(toNumber(cashSalary), toNumber(totalPackage));
    const contributions = Math.max(0, toNumber(lowTaxContributions));
    const limit = Math.max(0, toNumber(threshold, DEFAULT_DIVISION_293_THRESHOLD));

    return contributions > 0 && estimateIncome + contributions > limit;
}
