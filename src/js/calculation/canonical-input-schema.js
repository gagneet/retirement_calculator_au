import { normaliseRate } from '../policy/normalise-inputs.js';

export const CANONICAL_INPUT_SCHEMA_VERSION = 'calculator-input-v1';

const number = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

export function normaliseCanonicalInput(input = {}) {
    const householdType = input.household?.householdType === 'couple' ? 'couple' : 'single';
    const cashflow = input.cashflow || {};
    const hasDetailedExpenses = cashflow.hasDetailedExpenses ?? [
        'currentMonthlyTotalSpend',
        'currentMonthlyHousingCosts',
        'currentMonthlyLivingCosts',
    ].some((field) => Object.prototype.hasOwnProperty.call(cashflow, field));
    const totalSpendProvided = cashflow.totalSpendProvided
        ?? Object.prototype.hasOwnProperty.call(cashflow, 'currentMonthlyTotalSpend');
    return {
        schemaVersion: CANONICAL_INPUT_SCHEMA_VERSION,
        household: {
            householdType,
            currentAge: number(input.household?.currentAge, 50),
            partnerAge: householdType === 'couple' ? number(input.household?.partnerAge, 50) : null,
            retirementAge: number(input.household?.retirementAge, 67),
            partnerRetirementAge: householdType === 'couple' ? number(input.household?.partnerRetirementAge, 67) : null,
            lifespan: number(input.household?.lifespan, 90),
            partnerLifespan: householdType === 'couple' ? number(input.household?.partnerLifespan, 90) : null,
        },
        income: {
            annualSalary: number(input.income?.annualSalary),
            partnerAnnualSalary: householdType === 'couple' ? number(input.income?.partnerAnnualSalary) : 0,
            salaryIncomeMode: input.income?.salaryIncomeMode || 'gross',
            partnerSalaryIncomeMode: input.income?.partnerSalaryIncomeMode || 'gross',
            businessIncome: number(input.income?.businessIncome),
            investmentIncomeOutsideSuper: number(input.income?.investmentIncomeOutsideSuper),
            employerSuperAnnual: number(input.income?.employerSuperAnnual),
            partnerEmployerSuperAnnual: householdType === 'couple' ? number(input.income?.partnerEmployerSuperAnnual) : 0,
            hasPrivateHealthCover: input.income?.hasPrivateHealthCover !== false,
        },
        currentAssets: {
            currentSuperBalance: number(input.currentAssets?.currentSuperBalance),
            partnerCurrentSuperBalance: householdType === 'couple' ? number(input.currentAssets?.partnerCurrentSuperBalance) : 0,
            cashSavings: number(input.currentAssets?.cashSavings),
            stocksPortfolio: number(input.currentAssets?.stocksPortfolio),
            homeValue: number(input.currentAssets?.homeValue),
            mortgageBalance: number(input.currentAssets?.mortgageBalance),
            mortgageRate: normaliseRate(input.currentAssets?.mortgageRate, 0),
            investmentPropertyValue: number(input.currentAssets?.investmentPropertyValue),
            investmentPropertyLoan: number(input.currentAssets?.investmentPropertyLoan),
        },
        cashflow: {
            hasDetailedExpenses: Boolean(hasDetailedExpenses),
            totalSpendProvided: Boolean(totalSpendProvided),
            spendingIsEstimated: Boolean(cashflow.spendingIsEstimated),
            currentMonthlyIncome: number(cashflow.currentMonthlyIncome),
            currentMonthlyHousingCosts: number(cashflow.currentMonthlyHousingCosts),
            currentMonthlyLivingCosts: number(cashflow.currentMonthlyLivingCosts),
            currentMonthlyHealthcareCosts: number(cashflow.currentMonthlyHealthcareCosts),
            currentMonthlyTotalSpend: number(cashflow.currentMonthlyTotalSpend),
            currentMonthlySurplus: cashflow.currentMonthlySurplus == null ? null : number(cashflow.currentMonthlySurplus),
            explicitMonthlyInvestmentContribution: number(cashflow.explicitMonthlyInvestmentContribution),
            explicitAnnualSalarySacrifice: number(cashflow.explicitAnnualSalarySacrifice),
            partnerExplicitAnnualSalarySacrifice: number(cashflow.partnerExplicitAnnualSalarySacrifice),
            currentMonthlyMortgagePayment: number(cashflow.currentMonthlyMortgagePayment),
            mortgageIncludedInSpending: Boolean(cashflow.mortgageIncludedInSpending),
            surplusAllocationMode: ['cash', 'invest', 'mortgage_first', 'super_first', 'custom_split'].includes(cashflow.surplusAllocationMode)
                ? cashflow.surplusAllocationMode
                : 'cash',
            surplusToCashMonthly: number(cashflow.surplusToCashMonthly),
            surplusToStocksMonthly: number(cashflow.surplusToStocksMonthly),
            surplusToSuperAnnual: number(cashflow.surplusToSuperAnnual),
            surplusToMortgageMonthly: number(cashflow.surplusToMortgageMonthly),
        },
        retirementTarget: {
            targetAnnualIncomeToday: number(input.retirementTarget?.targetAnnualIncomeToday),
            targetIncomeTaxBasis: 'after_tax_today_dollars',
            confidenceTarget: normaliseRate(input.retirementTarget?.confidenceTarget, 0.8),
            minimumEstateToday: number(input.retirementTarget?.minimumEstateToday),
        },
        housingAndPension: {
            primaryResidenceType: input.housingAndPension?.primaryResidenceType || 'own_home',
            homeowner: Boolean(input.housingAndPension?.homeowner),
            primaryRentMonthly: number(input.housingAndPension?.primaryRentMonthly),
            includeAgePension: input.housingAndPension?.includeAgePension !== false,
            pensionAssetThreshold: input.housingAndPension?.pensionAssetThreshold == null ? null : number(input.housingAndPension.pensionAssetThreshold),
            pensionAssetCutoff: input.housingAndPension?.pensionAssetCutoff == null ? null : number(input.housingAndPension.pensionAssetCutoff),
            pensionIncomeThreshold: input.housingAndPension?.pensionIncomeThreshold == null ? null : number(input.housingAndPension.pensionIncomeThreshold),
        },
        scenarioToggles: {
            includeSuper: input.scenarioToggles?.includeSuper !== false,
            includeNonSuperInvestments: input.scenarioToggles?.includeNonSuperInvestments !== false,
            includeInvestmentProperty: Boolean(input.scenarioToggles?.includeInvestmentProperty),
            sellInvestmentPropertyAtRetirement: Boolean(input.scenarioToggles?.sellInvestmentPropertyAtRetirement),
            includeDownsizing: Boolean(input.scenarioToggles?.includeDownsizing),
            includeAgedCare: Boolean(input.scenarioToggles?.includeAgedCare),
            includeOverseasRetirement: Boolean(input.scenarioToggles?.includeOverseasRetirement),
        },
        assumptions: {
            inflationRate: normaliseRate(input.assumptions?.inflationRate, 0.026),
            wageGrowthRate: normaliseRate(input.assumptions?.wageGrowthRate, 0.02),
            superReturnRate: normaliseRate(input.assumptions?.superReturnRate, 0.075),
            investmentReturnRate: normaliseRate(input.assumptions?.investmentReturnRate, 0.065),
            propertyGrowthRate: normaliseRate(input.assumptions?.propertyGrowthRate, 0.04),
            retirementDrawdownRate: normaliseRate(input.assumptions?.retirementDrawdownRate, 0.04),
        },
    };
}
