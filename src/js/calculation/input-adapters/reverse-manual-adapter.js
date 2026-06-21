import { normaliseCanonicalInput } from '../canonical-input-schema.js';

export function adaptReverseManualInput(input = {}) {
    const isCouple = input.householdType === 'couple'
        || input.isCouple === true
        || input.isSingleCalculation === false
        || Number(input.partnerAge ?? input.partnerCurrentAge) > 0;
    const mortgageBalance = input.mortgageBalance || 0;
    const homeowner = input.homeowner !== false;
    const primaryResidenceType = homeowner
        ? (mortgageBalance > 0 ? 'own_home_with_mortgage' : 'own_home')
        : ((input.primaryRentMonthly || 0) > 0 ? 'renting' : 'no_home');

    return normaliseCanonicalInput({
        household: {
            householdType: isCouple ? 'couple' : 'single',
            currentAge: input.currentAge ?? input.yourCurrentAge,
            partnerAge: input.partnerAge ?? input.partnerCurrentAge,
            retirementAge: input.retirementAge,
            partnerRetirementAge: input.partnerRetirementAge,
            lifespan: input.lifespan ?? input.yourLifespan,
            partnerLifespan: input.partnerLifespan,
        },
        income: {
            annualSalary: input.annualSalary ?? input.yourSalary,
            partnerAnnualSalary: input.partnerAnnualSalary ?? input.partnerSalary,
            salaryIncomeMode: 'gross',
            partnerSalaryIncomeMode: 'gross',
            businessIncome: input.businessIncome,
            investmentIncomeOutsideSuper: input.investmentIncome,
            employerSuperAnnual: input.employerSG,
            partnerEmployerSuperAnnual: input.partnerEmployerSG,
            hasPrivateHealthCover: input.hasPrivateHealthCover !== false,
        },
        currentAssets: {
            currentSuperBalance: input.currentSuperBalance ?? input.superBalance ?? input.yourCurrentSuper,
            partnerCurrentSuperBalance: input.partnerSuperBalance ?? input.partnerCurrentSuper,
            cashSavings: input.cashSavings ?? input.currentSavings,
            stocksPortfolio: input.stocksPortfolio ?? input.currentStocks,
            homeValue: input.homeValue,
            mortgageBalance,
            mortgageRate: input.mortgageRate,
            investmentPropertyValue: input.investmentPropertyValue,
            investmentPropertyLoan: input.investmentPropertyLoan,
        },
        cashflow: {
            hasDetailedExpenses: Boolean(input.useDetailedCashflow || input.useDetailedExpenseInputs),
            currentMonthlyIncome: input.currentMonthlyIncome,
            currentMonthlyHousingCosts: input.currentMonthlyHousingCosts,
            currentMonthlyLivingCosts: input.currentMonthlyLivingCosts,
            currentMonthlyHealthcareCosts: (input.currentHealthcareCosts || 0) / 12,
            currentMonthlyMortgagePayment: input.monthlyMortgagePayment,
            explicitMonthlyInvestmentContribution: input.monthlyInvestment ?? input.monthlyStockContribution,
            explicitAnnualSalarySacrifice: input.salarySacrifice ?? input.yourAdditionalSuperContribution,
            partnerExplicitAnnualSalarySacrifice: input.partnerSalarySacrifice ?? input.partnerAdditionalSuperContribution,
            surplusAllocationMode: input.surplusAllocationMode || 'cash',
        },
        retirementTarget: {
            targetAnnualIncomeToday: input.targetAnnualIncomeToday ?? input.asfaComfortable,
            confidenceTarget: input.confidenceTarget ?? input.successProbabilityTarget,
            minimumEstateToday: input.minimumEstateToday ?? input.legacyGoal,
        },
        housingAndPension: {
            primaryResidenceType,
            homeowner,
            primaryRentMonthly: input.primaryRentMonthly,
            includeAgePension: input.includeAgePension !== false,
            pensionAssetThreshold: input.pensionAssetThreshold,
            pensionAssetCutoff: input.pensionAssetLimit,
            pensionIncomeThreshold: input.pensionIncomeThreshold,
        },
        scenarioToggles: {
            includeSuper: input.includeSuper !== false,
            includeNonSuperInvestments: input.includeNonSuperInvestments !== false,
            includeInvestmentProperty: Boolean(input.hasInvestmentProperty),
            sellInvestmentPropertyAtRetirement: Boolean(input.sellInvestmentPropertyAtRetirement),
            includeDownsizing: Boolean(input.planToDownsize),
            includeAgedCare: Boolean(input.includeAgedCare),
            includeOverseasRetirement: Boolean(input.goingOverseas),
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
