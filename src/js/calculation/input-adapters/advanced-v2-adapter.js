import { normaliseCanonicalInput } from '../canonical-input-schema.js';
import { estimateMonthlySpending } from '../household-cashflow-engine.js';
import {
    DEFAULT_MAX_CONTRIBUTION_BASE_PER_QUARTER,
    EMPLOYER_SUPER_MODES,
    SALARY_INCOME_MODES,
    resolveEmployerSuper,
} from '../../super-policy.js';

export function adaptAdvancedV2Input(input = {}) {
    const isCouple = input.household === 'couple';
    const rawResidenceType = input.primaryResidenceType
        || (input.mortgage > 0 ? 'own_with_mortgage' : 'own_outright');
    const residenceType = rawResidenceType === 'own_with_mortgage' || rawResidenceType === 'own_mortgage'
        ? 'own_home_with_mortgage'
        : rawResidenceType === 'own_outright'
            ? 'own_home'
            : rawResidenceType === 'renting'
                ? 'renting'
                : 'no_home';
    const homeowner = residenceType === 'own_home' || residenceType === 'own_home_with_mortgage';
    const employerRate = Math.abs(Number(input.employerRate || 12)) > 1
        ? Number(input.employerRate || 12) / 100
        : Number(input.employerRate || 0.12);
    const commonSuperOptions = {
        sgRate: employerRate,
        maxContributionBasePerQuarter: input.maxContributionBasePerQuarter
            || DEFAULT_MAX_CONTRIBUTION_BASE_PER_QUARTER,
        applyMaxContributionBase: input.applyMaxContributionBase !== false,
    };
    const primaryIncome = resolveEmployerSuper({
        ...commonSuperOptions,
        employmentIncome: input.salary || 0,
        incomeMode: input.salaryIncomeMode || SALARY_INCOME_MODES.EXCLUDING_SUPER,
        employerSuperMode: input.employerSuperMode || EMPLOYER_SUPER_MODES.CALCULATED,
        employerSuperOverrideAmount: input.employerSuperOverrideAmount,
    });
    const partnerIncome = resolveEmployerSuper({
        ...commonSuperOptions,
        employmentIncome: isCouple ? (input.partnerSalary || 0) : 0,
        incomeMode: input.partnerSalaryIncomeMode || input.salaryIncomeMode || SALARY_INCOME_MODES.EXCLUDING_SUPER,
        employerSuperMode: isCouple
            ? (input.partnerEmployerSuperMode || EMPLOYER_SUPER_MODES.CALCULATED)
            : EMPLOYER_SUPER_MODES.CALCULATED,
        employerSuperOverrideAmount: isCouple ? input.partnerEmployerSuperOverrideAmount : 0,
    });

    // Toggle ON means the user has confirmed their spending value (even if zero — the engine
    // will emit a "must be greater than zero" warning in that case, which is correct).
    // Toggle OFF means derive from ABS household averages so surplus allocation can still run.
    const hasExplicitSpend = Boolean(input.useDetailedCashflow);
    const spendEstimate = hasExplicitSpend
        ? null
        : estimateMonthlySpending({
            householdType: isCouple ? 'couple' : 'single',
            dependents: input.dependents || 0,
            healthcareMonthly: (input.healthcareCost || 0) / 12,
            rentMonthly: input.primaryRentMonthly || 0,
        });

    return normaliseCanonicalInput({
        household: {
            householdType: isCouple ? 'couple' : 'single',
            currentAge: input.age,
            partnerAge: input.partnerAge,
            retirementAge: input.retireAge,
            partnerRetirementAge: input.partnerRetireAge,
            lifespan: input.lifespan,
            partnerLifespan: input.partnerLifespan,
        },
        income: {
            annualSalary: primaryIncome.cashSalary,
            partnerAnnualSalary: partnerIncome.cashSalary,
            salaryIncomeMode: 'gross',
            partnerSalaryIncomeMode: 'gross',
            businessIncome: input.businessIncome,
            investmentIncomeOutsideSuper: input.investmentIncomeOutsideSuper,
            employerSuperAnnual: primaryIncome.employerSG,
            partnerEmployerSuperAnnual: partnerIncome.employerSG,
            hasPrivateHealthCover: input.hasPrivateHospital !== false,
        },
        currentAssets: {
            currentSuperBalance: input.superBal,
            partnerCurrentSuperBalance: input.partnerSuperBal,
            cashSavings: input.cash,
            stocksPortfolio: input.stocks,
            homeValue: input.homeValue,
            mortgageBalance: input.mortgage,
            mortgageRate: input.mortgageRate,
            investmentPropertyValue: input.ipValue,
            investmentPropertyLoan: input.ipLoan,
        },
        debts: {
            creditCardBalance: input.ccBalance,
            creditCardRate: input.ccRate,
            personalLoanBalance: input.personalLoan,
            personalLoanRate: input.personalLoanRate,
            carLoanBalance: input.carLoan,
            carLoanRate: input.carLoanRate,
            hecsBalance: input.hecsBalance,
        },
        cashflow: {
            hasDetailedExpenses: hasExplicitSpend || spendEstimate !== null,
            spendingIsEstimated: !hasExplicitSpend,
            currentMonthlyIncome: input.currentMonthlyIncome,
            currentMonthlyTotalSpend: hasExplicitSpend
                ? input.currentMonthlyLivingCosts
                : spendEstimate?.total,
            currentMonthlyHealthcareCosts: (input.healthcareCost || 0) / 12,
            currentMonthlyMortgagePayment: input.monthlyMortgagePayment,
            explicitMonthlyInvestmentContribution: input.monthlyStockContrib,
            explicitAnnualSalarySacrifice: input.salarySacrifice,
            partnerExplicitAnnualSalarySacrifice: input.partnerSalarySacrifice,
            surplusAllocationMode: input.surplusAllocationMode || 'cash',
            surplusToCashMonthly: input.surplusToCashMonthly,
            surplusToStocksMonthly: input.surplusToStocksMonthly,
            surplusToSuperAnnual: input.surplusToSuperAnnual,
            surplusToMortgageMonthly: input.surplusToMortgageMonthly,
        },
        retirementTarget: {
            targetAnnualIncomeToday: input.desiredIncome,
            confidenceTarget: input.confidenceTarget,
            minimumEstateToday: input.legacyGoal,
        },
        housingAndPension: {
            primaryResidenceType: residenceType,
            homeowner,
            primaryRentMonthly: input.primaryRentMonthly,
            includeAgePension: input.includeAgePension !== false,
            pensionAssetThreshold: input.pensionAssetThreshold,
            pensionAssetCutoff: input.pensionAssetCutoff,
            pensionIncomeThreshold: input.pensionIncomeThreshold,
            agePensionMaxAnnual: isCouple ? input.pensionAnnualCouple : input.pensionAnnualSingle,
        },
        investmentProperty: {
            purchasePrice: input.ipPurchasePrice,
            purchaseYear: input.ipPurchaseYear,
            loanType: input.ipLoanType,
            interestRate: input.ipRate,
            weeklyRentalIncome: input.ipWeeklyRent,
            annualOperatingExpenses: input.ipAnnualExpenses,
            annualStrataLevy: input.ipStrataLevy,
            annualLandTax: input.landTax,
            vacancyRate: input.ipVacancyRate,
            capitalGainsTaxRate: input.capitalGainsTaxRate,
            state: input.ipState,
            type: input.ipType,
        },
        healthAndAgedCare: {
            currentAnnualHealthcareCosts: input.healthcareCost,
            healthcareInflationRate: input.healthcareInflation,
        },
        scenarioToggles: {
            includeSuper: true,
            includeNonSuperInvestments: true,
            includeInvestmentProperty: input.investmentProperty,
            includeDownsizing: input.downsizePlan === 'yes',
            includeAgedCare: (input.agedCareProbability || 0) > 0,
            includeOverseasRetirement: input.goingOverseas,
        },
        assumptions: {
            inflationRate: input.inflation,
            wageGrowthRate: input.salaryGrowthRate,
            superReturnRate: input.superGrowth,
            investmentReturnRate: input.invReturn,
            propertyGrowthRate: input.ipGrowthRate,
            returnDeclineRate: input.returnDeclineRate,
            scenarioMode: input.scenarioMode,
        },
    });
}
