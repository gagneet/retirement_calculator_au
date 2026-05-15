import RetirementSimulator from '../../src/js/simulator.js';
import ENHANCED_CONFIG from '../../src/js/config.js';

const buildInputs = (overrides = {}) => ({
    yourCurrentAge: 60,
    partnerCurrentAge: 60,
    retirementAge: 62,
    partnerRetirementAge: 62,
    yourLifespan: 90,
    partnerLifespan: 90,
    yourSalary: 0,
    partnerSalary: 0,
    yourCurrentSuper: 100000,
    partnerCurrentSuper: 100000,
    currentSavings: 0,
    currentStocks: 0,
    monthlyStockContribution: 0,
    percentIncomeSaved: 0,
    inflation: 0,
    investmentReturn: 0,
    superReturn: 0,
    savingsReturn: 0,
    returnDeclineRate: 0,
    employerSuperContributionRate: 0.12,
    superContributionRate: 0.12,
    salaryGrowthRate: 0,
    useGlidePath: false,
    glidePathRule: '110minus',
    allocEquities: 0.6,
    allocBonds: 0.3,
    allocCash: 0.1,
    asfaComfortable: 30000,
    agePensionMax: 0,
    pensionAssetThreshold: 0,
    pensionAssetLimit: 0,
    pensionIncomeThreshold: 0,
    hasTrustAssets: false,
    trustType: 'family',
    trustControlLevel: 'high',
    trustNetAssets: 0,
    trustAttributionPercentage: 1,
    trustAnnualDistributions: 0,
    trustTaxRate: 0,
    homeInTrust: false,
    investmentPropertyInTrust: false,
    stocksInTrust: false,
    useDetailedExpenseInputs: false,
    currentMonthlyHousingCosts: 0,
    currentMonthlyLivingCosts: 0,
    planToDownsize: false,
    returnVolatility: 0,
    enableShocks: false,
    shockProbability: 0,
    shockMagnitude: 0,
    numRuns: 10,
    scenarioMode: 'baseline',
    isSingleCalculation: false,
    creditCardBalance: 0,
    personalLoanBalance: 0,
    carLoanBalance: 0,
    creditCardRate: 0.2,
    personalLoanRate: 0.09,
    carLoanRate: 0.08,
    healthCondition: 'good',
    annualTravelBudget: 0,
    annualHobbyBudget: 0,
    hasInvestmentProperty: false,
    investmentPropertyValue: 0,
    investmentPropertyLoan: 0,
    investmentPropertyRate: 0.06,
    investmentPropertyLoanType: 'pi',
    propertyGrowthRate: 0,
    homeValue: 0,
    mortgageBalance: 0,
    mortgageRate: 0.06,
    monthlyMortgagePayment: 0,
    currentHealthcareCosts: 0,
    healthcareInflation: 0,
    agedCareProbability: 0,
    agedCareStartAge: 90,
    agedCareDuration: 0,
    agedCareAnnualCost: 0,
    ageCameToAustralia: 0,
    hasPrivateHealthCover: false,
    ageFirstPrivateCover: 0,
    concessionalCapUsed: 0,
    yourAdditionalSuperContribution: 0,
    partnerAdditionalSuperContribution: 0,
    yourAnnualNCC: 0,
    partnerAnnualNCC: 0,
    businessIncome: 0,
    investmentIncome: 0,
    isCarerForParents: false,
    carerAnnualExpense: 0,
    carerYearsExpected: 0,
    educationCostPerChild: 0,
    privateSchool: false,
    universitySupport: false,
    childrenUnder5: 0,
    childrenPrimary: 0,
    teenagers: 0,
    globalRiskFactor: 0,
    extremeInflationProbability: 0,
    propertyCrashProbability: 0,
    enableProposedBudget2026: false,
    yourLifespanMode: 'fixed',
    ...overrides,
});

describe('RetirementSimulator NCC bring-forward modelling', () => {
    const createSimulator = () => {
        const simulator = new RetirementSimulator(ENHANCED_CONFIG);
        simulator.calculateEnhancedReturn = jest.fn(() => 0);
        simulator.calculatePortfolioReturn = jest.fn(() => 0);
        simulator.projectHealthcareCosts = jest.fn(() => 0);
        simulator.calculateAgedCareCosts = jest.fn(() => ({ expectedCost: 0 }));
        simulator.extractBaseExpensesFromCashFlow = jest.fn(() => ({
            housingExpense: 0,
            livingExpense: 0,
            mortgagePayment: 0,
        }));
        return simulator;
    };

    test('applies bring-forward eligibility separately to each member of a couple', () => {
        const simulator = createSimulator();
        const result = simulator.simulateRetirement(buildInputs({
            retirementAge: 61,
            partnerRetirementAge: 61,
            yourAnnualNCC: 360000,
            partnerAnnualNCC: 360000,
        }), false);

        expect(result.accumulatedSuperBalance).toBe(920000);
    });

    test('carries unused bring-forward cap into later years for the same member', () => {
        const simulator = createSimulator();
        const result = simulator.simulateRetirement(buildInputs({
            isSingleCalculation: true,
            partnerCurrentAge: 0,
            partnerRetirementAge: 0,
            partnerLifespan: 0,
            partnerCurrentSuper: 0,
            retirementAge: 62,
            yourCurrentSuper: 100000,
            yourAnnualNCC: 200000,
        }), false);

        // Year 1: $200k contribution triggers the 3-year bring-forward window.
        // Year 2: the remaining $160k of the $360k cap is still available.
        expect(result.accumulatedSuperBalance).toBe(460000);
    });
});
