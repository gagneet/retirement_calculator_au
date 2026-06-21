import { normaliseCanonicalInput } from '../canonical-input-schema.js';

function residenceType(input) {
    if (input.primaryResidenceType === 'renting') return 'renting';
    if (input.primaryResidenceType === 'family' || input.primaryResidenceType === 'other') return 'no_home';
    if ((input.mortgageBalance || 0) > 0) return 'own_home_with_mortgage';
    return input.homeowner === false ? 'no_home' : 'own_home';
}

export function adaptAdvancedClassicInput(input = {}) {
    const isCouple = input.isCouple === true
        || input.isSingleCalculation === false
        || Number(input.partnerCurrentAge) > 0;
    const primaryResidenceType = residenceType(input);
    return normaliseCanonicalInput({
        household: {
            householdType: isCouple ? 'couple' : 'single',
            currentAge: input.yourCurrentAge,
            partnerAge: input.partnerCurrentAge,
            retirementAge: input.retirementAge,
            partnerRetirementAge: input.partnerRetirementAge,
            lifespan: input.yourLifespan,
            partnerLifespan: input.partnerLifespan,
        },
        income: {
            annualSalary: input.yourSalary,
            partnerAnnualSalary: input.partnerSalary,
            salaryIncomeMode: 'gross',
            partnerSalaryIncomeMode: 'gross',
            businessIncome: input.businessIncome,
            investmentIncomeOutsideSuper: input.investmentIncome,
            employerSuperAnnual: input.employerSG,
            partnerEmployerSuperAnnual: input.partnerEmployerSG,
            hasPrivateHealthCover: input.hasPrivateHealthCover !== false,
        },
        currentAssets: {
            currentSuperBalance: input.yourCurrentSuper,
            partnerCurrentSuperBalance: input.partnerCurrentSuper,
            cashSavings: input.currentSavings,
            stocksPortfolio: input.currentStocks,
            homeValue: input.homeValue,
            mortgageBalance: input.mortgageBalance,
            mortgageRate: input.mortgageRate,
            investmentPropertyValue: input.investmentPropertyValue,
            investmentPropertyLoan: input.investmentPropertyLoan,
        },
        cashflow: {
            hasDetailedExpenses: Boolean(input.useDetailedExpenseInputs),
            currentMonthlyHousingCosts: input.currentMonthlyHousingCosts,
            currentMonthlyLivingCosts: input.currentMonthlyLivingCosts,
            currentMonthlyHealthcareCosts: (input.currentHealthcareCosts || 0) / 12,
            mortgageIncludedInSpending: true,
            explicitMonthlyInvestmentContribution: input.monthlyStockContribution,
            explicitAnnualSalarySacrifice: input.yourAdditionalSuperContribution,
            partnerExplicitAnnualSalarySacrifice: input.partnerAdditionalSuperContribution,
            surplusAllocationMode: input.surplusAllocationMode || 'cash',
        },
        retirementTarget: {
            targetAnnualIncomeToday: input.asfaComfortable,
            confidenceTarget: input.confidenceTarget,
            minimumEstateToday: input.legacyGoal,
        },
        housingAndPension: {
            primaryResidenceType,
            homeowner: primaryResidenceType === 'own_home' || primaryResidenceType === 'own_home_with_mortgage',
            primaryRentMonthly: input.primaryRentMonthly,
            includeAgePension: input.includeAgePension !== false,
            pensionAssetThreshold: input.pensionAssetThreshold,
            pensionAssetCutoff: input.pensionAssetLimit,
            pensionIncomeThreshold: input.pensionIncomeThreshold,
        },
        scenarioToggles: {
            includeSuper: true,
            includeNonSuperInvestments: true,
            includeInvestmentProperty: input.hasInvestmentProperty,
            includeDownsizing: input.planToDownsize,
            includeAgedCare: (input.agedCareProbability || 0) > 0,
            includeOverseasRetirement: input.goingOverseas,
        },
        assumptions: {
            inflationRate: input.inflation,
            wageGrowthRate: input.salaryGrowthRate,
            superReturnRate: input.superReturn,
            investmentReturnRate: input.investmentReturn,
            propertyGrowthRate: input.propertyGrowthRate,
        },
    });
}
