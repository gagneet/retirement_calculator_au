import RetirementSimulator from '../../src/js/simulator.js';
import ENHANCED_CONFIG from '../../src/js/config.js';

const buildInputs = (overrides = {}) => ({
    yourCurrentAge: 64,
    partnerCurrentAge: 0,
    retirementAge: 65,
    partnerRetirementAge: 0,
    yourLifespan: 0,
    partnerLifespan: 0,
    yourSalary: 0,
    partnerSalary: 0,
    yourCurrentSuper: 120000,
    partnerCurrentSuper: 0,
    currentSavings: 10000,
    currentStocks: 0,
    monthlyStockContribution: 0,
    percentIncomeSaved: 0,
    inflation: 0.025,
    investmentReturn: 0.04,
    superReturn: 0.05,
    savingsReturn: 0.02,
    returnDeclineRate: 0.01,
    employerSuperContributionRate: 0.12,
    superContributionRate: 0.12,
    salaryGrowthRate: 0.03,
    useGlidePath: false,
    glidePathRule: '110',
    allocEquities: 0.5,
    allocBonds: 0.3,
    allocCash: 0.2,
    asfaComfortable: 90000,
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
    returnVolatility: 0.1,
    enableShocks: false,
    shockProbability: 0,
    shockMagnitude: 0,
    numRuns: 100,
    scenarioMode: 'baseline',
    isSingleCalculation: true,
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
    propertyGrowthRate: 0.04,
    homeValue: 750000,
    mortgageBalance: 0,
    mortgageRate: 0.06,
    monthlyMortgagePayment: 0,
    currentHealthcareCosts: 2000,
    healthcareInflation: 0.05,
    agedCareProbability: 0.65,
    agedCareStartAge: 85,
    agedCareDuration: 3,
    agedCareAnnualCost: 50000,
    ageCameToAustralia: 0,
    hasPrivateHealthCover: false,
    ageFirstPrivateCover: 0,
    concessionalCapUsed: 0,
    yourAdditionalSuperContribution: 0,
    partnerAdditionalSuperContribution: 0,
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
    yourLifespanMode: 'depletion',
    ...overrides,
});

describe('RetirementSimulator open-ended lifespan mode', () => {
    const createSimulator = () => {
        const simulator = new RetirementSimulator(ENHANCED_CONFIG);
        simulator.calculateEnhancedReturn = jest.fn(() => 0.02);
        simulator.calculatePortfolioReturn = jest.fn(() => 0.02);
        simulator.projectHealthcareCosts = jest.fn(() => 0);
        simulator.calculateAgedCareCosts = jest.fn(() => ({ expectedCost: 0 }));
        simulator.extractBaseExpensesFromCashFlow = jest.fn(() => ({
            housingExpense: 0,
            livingExpense: 0,
            mortgagePayment: 0,
        }));
        return simulator;
    };

    test('treats zero lifespan as run-until-depletion mode for singles', () => {
        const simulator = createSimulator();
        const result = simulator.simulateRetirement(buildInputs(), false);

        expect(result.runUntilDepletionMode).toBe(true);
        expect(result.effectiveYourLifespan).toBe(120);
        expect(result.depletionAge).not.toBeNull();
        expect(result.depletionPensionIncome).toBeGreaterThanOrEqual(0);
    });

    test('captures partner age at depletion for couples using zero lifespan', () => {
        const simulator = createSimulator();
        const result = simulator.simulateRetirement(buildInputs({
            isSingleCalculation: false,
            partnerCurrentAge: 62,
            partnerRetirementAge: 65,
            partnerLifespan: 0,
            partnerCurrentSuper: 50000,
            asfaComfortable: 120000,
        }), false);

        expect(result.runUntilDepletionMode).toBe(true);
        expect(result.depletionAge).not.toBeNull();
        expect(result.depletionPartnerAge).not.toBeNull();
    });
});
