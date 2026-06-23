/**
 * src/js/calculation/save-data-schema.js
 *
 * Canonical schema for retirement calculator save data.
 * Unifies fields between Classic Advanced and Advanced V2 calculators.
 */

    ,"BG_INDEX": {"type": "string", "default": "latest"}
 * Normalises raw inputs into a canonical retirement save object.
 * Both Classic and V2 should call this before serialising JSON.
 *
 * @param {Object} sourceInputs - raw input object from either page
 * @param {Object} options - { source: 'advanced' | 'advanced-v2' }
 * @returns {Object} canonical userData object
 */
/**
 * Maps any input object (Classic, V2, or already canonical) to the canonical format.
 * Uses fallbacks for old V2 short names and handles unit conversions.
 */
export function buildCanonicalSaveData(sourceInputs = {}, options = {}) {
    const inputs = sourceInputs || {};
    // Detect source: advanced-v2 if short field names exist, otherwise advanced (classic/canonical)
    const isV2 = inputs.age !== undefined || inputs.retireAge !== undefined || inputs.superBal !== undefined || inputs.household !== undefined;
    const source = options.source || (isV2 ? 'advanced-v2' : 'advanced');

    const pct = (val) => {
        const n = parseFloat(val);
        if (isNaN(n)) return 0;

        let result;
        if (source === 'advanced-v2') {
            // V2 raw inputs are display values (e.g. 6.5 for 6.5%)
            // but we might be re-processing already converted values (0.065)
            // Rule: if it's already a decimal fraction (<= 0.15), keep it.
            // Exception: 0 stays 0.
            if (Math.abs(n) <= 0.15 && n !== 0) {
                result = n;
            } else {
                result = n / 100;
            }
        } else {
            // Classic/Canonical are already decimals
            result = n;
        }
        return Math.round(result * 10000) / 10000;
    };

    const isCouple = (inputs.isCouple === true || inputs.household === 'couple' || (inputs.hasPartner && inputs.hasPartner !== 'false'));

    const canonical = {
        // Personal
        yourCurrentAge: inputs.yourCurrentAge ?? inputs.age,
        partnerCurrentAge: isCouple ? (inputs.partnerCurrentAge ?? inputs.partnerAge) : 0,
        retirementAge: inputs.retirementAge ?? inputs.retireAge,
        partnerRetirementAge: isCouple ? (inputs.partnerRetirementAge ?? inputs.partnerRetireAge) : 0,
        yourLifespan: inputs.yourLifespan ?? inputs.lifespan,
        partnerLifespan: isCouple ? (inputs.partnerLifespan ?? 0) : 0,
        yourGender: inputs.yourGender ?? inputs.gender ?? 'unspecified',
        partnerGender: isCouple ? (inputs.partnerGender ?? 'unspecified') : 'unspecified',
        isCouple: isCouple,
        isSingleCalculation: !isCouple,

        // Finances
        yourSalary: inputs.yourSalary ?? inputs.salary,
        partnerSalary: isCouple ? (inputs.partnerSalary ?? 0) : 0,
        yourEmploymentIncome: inputs.yourEmploymentIncome ?? inputs.yourSalary ?? inputs.salary,
        partnerEmploymentIncome: isCouple ? (inputs.partnerEmploymentIncome ?? inputs.partnerSalary ?? 0) : 0,
        yourCurrentSuper: inputs.yourCurrentSuper ?? inputs.superBal,
        partnerCurrentSuper: isCouple ? (inputs.partnerCurrentSuper ?? inputs.partnerSuperBal) : 0,
        currentSavings: inputs.currentSavings ?? inputs.cash,
        currentStocks: inputs.currentStocks ?? inputs.stocks,
        monthlyStockContribution: inputs.monthlyStockContribution ?? inputs.monthlyStockContrib,

        // Cashflow
        useDetailedExpenseInputs: Boolean(inputs.useDetailedExpenseInputs ?? inputs.useDetailedCashflow),
        currentMonthlyHousingCosts: inputs.currentMonthlyHousingCosts ?? inputs.monthlyMortgagePayment ?? inputs.builderMortgage ?? 0,
        currentMonthlyLivingCosts: inputs.currentMonthlyLivingCosts ?? 0,

        // Property
        primaryResidenceType: inputs.primaryResidenceType,
        primaryRentMonthly: inputs.primaryRentMonthly,
        homeValue: inputs.homeValue,
        mortgageBalance: inputs.mortgageBalance ?? inputs.mortgage,
        mortgageRate: pct(inputs.mortgageRate),
        monthlyMortgagePayment: inputs.monthlyMortgagePayment,
        planToDownsize: inputs.planToDownsize ?? (inputs.downsizePlan === 'yes'),
        downsizeAge: inputs.downsizeAge,
        downsizeTargetHomeValue: inputs.downsizeTargetHomeValue,
        downsizeTransactionCost: pct(inputs.downsizeTransactionCost),
        downsizeOngoingFees: inputs.downsizeOngoingFees,

        // Investment Property
        hasInvestmentProperty: Boolean(inputs.hasInvestmentProperty ?? inputs.investmentProperty),
        investmentPropertyValue: inputs.investmentPropertyValue ?? inputs.ipValue,
        investmentPropertyLoan: inputs.investmentPropertyLoan ?? inputs.ipLoan,
        investmentPropertyRate: pct(inputs.investmentPropertyRate ?? inputs.ipRate),
        weeklyRentalIncome: inputs.weeklyRentalIncome ?? inputs.ipWeeklyRent,
        annualPropertyExpenses: inputs.annualPropertyExpenses ?? inputs.ipAnnualExpenses,
        propertyGrowthRate: pct(inputs.propertyGrowthRate ?? inputs.ipGrowthRate),
        propertyState: inputs.propertyState ?? inputs.ipState,
        investmentPropertyType: inputs.investmentPropertyType ?? (inputs.ipType || 'unit'),
        investmentPropertyStrataLevy: inputs.investmentPropertyStrataLevy ?? inputs.ipStrataLevy,
        investmentPropertyLoanType: inputs.investmentPropertyLoanType ?? (inputs.ipLoanType || 'pi'),
        investmentPropertyPurchasePrice: inputs.investmentPropertyPurchasePrice ?? (inputs.ipPurchasePrice ?? inputs.ipValue),
        investmentPropertyPurchaseYear: inputs.investmentPropertyPurchaseYear ?? inputs.ipPurchaseYear,
        vacancyRate: pct(inputs.vacancyRate ?? inputs.ipVacancyRate),
        capitalGainsTaxRate: pct(inputs.capitalGainsTaxRate),

        // Debts
        creditCardBalance: inputs.creditCardBalance ?? inputs.ccBalance,
        creditCardRate: pct(inputs.creditCardRate ?? inputs.ccRate),
        personalLoanBalance: inputs.personalLoanBalance ?? inputs.personalLoan,
        personalLoanRate: pct(inputs.personalLoanRate),
        carLoanBalance: inputs.carLoanBalance ?? inputs.carLoan,
        carLoanRate: pct(inputs.carLoanRate),
        hecsBalance: inputs.hecsBalance,

        // Healthcare
        hasPrivateHealthCover: Boolean(inputs.hasPrivateHealthCover ?? inputs.hasPrivateHospital),
        currentHealthcareCosts: inputs.currentHealthcareCosts ?? inputs.healthcareCost,
        healthcareInflation: pct(inputs.healthcareInflation),
        healthCondition: inputs.healthCondition,
        agedCareProbability: pct(inputs.agedCareProbability),
        agedCareStartAge: inputs.agedCareStartAge,
        agedCareAnnualCost: inputs.agedCareAnnualCost,

        // Economic
        inflation: pct(inputs.inflation),
        investmentReturn: pct(inputs.investmentReturn ?? inputs.invReturn),
        superReturn: pct(inputs.superReturn ?? inputs.superGrowth),
        savingsReturn: pct(inputs.savingsReturn),
        salaryGrowthRate: pct(inputs.salaryGrowthRate),
        returnVolatility: pct(inputs.returnVolatility),
        returnDeclineRate: (inputs.returnDeclineRate || 0) <= 0.1 ? (inputs.returnDeclineRate || 0) : (inputs.returnDeclineRate || 0) / 100,

        // Pension
        agePensionMax: isCouple ? (inputs.pensionAnnualCouple ?? inputs.agePensionMax) : (inputs.pensionAnnualSingle ?? inputs.agePensionMax),
        pensionAssetThreshold: inputs.pensionAssetThreshold,
        pensionAssetLimit: inputs.pensionAssetLimit ?? inputs.pensionAssetCutoff,
        pensionIncomeThreshold: inputs.pensionIncomeThreshold,

        // Simulation
        numRuns: inputs.numRuns ?? inputs.mcRuns,
        useLongevityDistribution: Boolean(inputs.useLongevityDistribution ?? inputs.sampleLifespan),
        enableShocks: Boolean(inputs.enableShocks),
        shockProbability: pct(inputs.shockProbability),
        shockMagnitude: pct(inputs.shockMagnitude),
        enableProposedBudget2026: Boolean(inputs.enableProposedBudget2026 ?? inputs.budget2627),

        // Trust / SMSF
        hasSMSF: Boolean(inputs.hasSMSF ?? inputs.hasSmsf),
        smsfAdminCosts: inputs.smsfAdminCosts,
        smsfInvestmentStrategy: inputs.smsfInvestmentStrategy,
        hasTrustAssets: Boolean(inputs.hasTrustAssets ?? inputs.hasTrust),
        trustType: inputs.trustType,
        trustNetAssets: inputs.trustNetAssets,
        trustAttributionPercentage: pct(inputs.trustAttributionPercentage),
        trustTaxRate: pct(inputs.trustTaxRate),

        // Overseas
        goingOverseas: Boolean(inputs.goingOverseas),
        overseasCountry: inputs.overseasCountry ?? inputs.destination,
        overseasAge: inputs.overseasAge ?? inputs.ageMovingOverseas,
        overseasAnnualBudget: inputs.overseasAnnualBudget ?? inputs.annualLivingCostOverseas,
        overseasReturnFrequency: inputs.overseasReturnFrequency ?? inputs.returnFrequency,
        overseasMoveType: inputs.overseasMoveType,
        overseasTaxResidency: inputs.overseasTaxResidency,
        overseasHealthCover: inputs.overseasHealthCover,
        overseasHousingType: inputs.overseasHousingType,
        overseasAnnualRent: inputs.overseasAnnualRent,
        overseasAudFxChange: pct(inputs.overseasAudFxChange),

        // Scenarios
        futurePropertyScenario: inputs.futurePropertyScenario,
        inheritanceScenario: inputs.inheritanceScenario,

        // Other
        dependents: inputs.dependents,
        salaryGrowthType: inputs.salaryGrowthType,
        employerSuperContributionRate: pct(inputs.employerSuperContributionRate ?? inputs.employerRate),
    };

    return normaliseSaveData(canonical);
}


/**
 * Final normalisation of the canonical object.
 * Ensures default objects exist and alias fields are set.
 */
export function normaliseSaveData(input = {}) {
    const normalised = {
        ...input,

        // Ensure common canonical flags exist
        isSingleCalculation: input.isSingleCalculation ?? !input.isCouple,
        isCouple: input.isCouple ?? !input.isSingleCalculation,

        // Ensure classic names exist
        lifeExpectancy: input.lifeExpectancy ?? input.yourLifespan ?? 90,
        homeowner: input.homeowner ?? ['own_mortgage', 'own_outright'].includes(input.primaryResidenceType),

        // Ensure missing nested objects exist
        futurePropertyScenario: input.futurePropertyScenario ?? {
            enabled: false,
            includeInBasePlan: false,
            eventType: 'buy_primary_home',
            age: 0,
            propertyValue: 0,
            mortgage: 0,
            ownershipShare: 1,
            roleAfterEvent: 'primary_residence',
            scenarioOnly: true
        },

        inheritanceScenario: input.inheritanceScenario ?? {
            enabled: false,
            includeInBasePlan: false,
            age: 0,
            certainty: 'speculative',
            type: 'cash',
            grossValue: 0,
            estimatedCosts: 0,
            use: 'invest_outside_super',
            scenarioOnly: true
        },

        dependentDetails: input.dependentDetails ?? {
            childrenUnder5: 0,
            childrenUnder5Percent: 100,
            childrenPrimary: 0,
            childrenPrimaryPercent: 100,
            teenagers: 0,
            teenagersPercent: 100,
            adultDisabled: 0,
            adultDisabledPercent: 100,
            elderlyIndependent: 0,
            elderlyIndependentPercent: 100,
            elderlyHomeCare: 0,
            elderlyHomeCarePercent: 100,
            elderlyResidential: 0,
            elderlyResidentialPercent: 100,
            otherDependents: 0,
            otherDependentsPercent: 100
        }
    };

    return normalised;
}

/**
 * Extracts V2-specific UI state from the raw V2 inputs.
 * Saved under uiState.advancedV2 in the JSON file.
 */
export function extractAdvancedV2UiState(v2 = {}) {
    return {
        desiredIncomeMode: v2.desiredIncomeMode,
        richTarget: v2.richTarget,
        richTargetCustom: v2.richTargetCustom,
        builderCurrentIncome: v2.builderCurrentIncome,
        builderMortgage: v2.builderMortgage,
        builderChildren: v2.builderChildren,
        builderBuffer: v2.builderBuffer,
        surplusAllocationMode: v2.surplusAllocationMode,
        useDetailedCashflow: v2.useDetailedCashflow,
        // Also capture display units if applicable
        displayUnits: v2.displayUnits || 'today'
    };
}
