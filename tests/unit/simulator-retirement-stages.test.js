import RetirementSimulator from '../../src/js/simulator.js';
import ENHANCED_CONFIG from '../../src/js/config.js';

const buildInputs = (overrides = {}) => ({
    yourCurrentAge: 64,
    partnerCurrentAge: 0,
    retirementAge: 65,
    partnerRetirementAge: 0,
    yourLifespan: 95,
    partnerLifespan: 0,
    yourSalary: 0,
    partnerSalary: 0,
    yourCurrentSuper: 1500000,
    partnerCurrentSuper: 0,
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
    glidePathRule: '110',
    allocEquities: 0.5,
    allocBonds: 0.3,
    allocCash: 0.2,
    asfaComfortable: 24000,
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
    numRuns: 5,
    scenarioMode: 'baseline',
    isSingleCalculation: true,
    creditCardBalance: 0,
    personalLoanBalance: 0,
    carLoanBalance: 0,
    creditCardRate: 0.2,
    personalLoanRate: 0.09,
    carLoanRate: 0.08,
    healthCondition: 'good',
    annualTravelBudget: 12000,
    annualHobbyBudget: 6000,
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
    agedCareProbability: 1,
    agedCareStartAge: 85,
    agedCareDuration: 2,
    agedCareAnnualCost: 10000,
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

describe('RetirementSimulator staged retirement modelling', () => {
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

    test('weights deterministic aged care costs by the configured probability', () => {
        const simulator = createSimulator();
        const result = simulator.simulateRetirement(buildInputs({
            yourCurrentSuper: 300000,
            agedCareProbability: 0.5,
            agedCareStartAge: 65,
            agedCareDuration: 1,
            agedCareAnnualCost: 10000,
        }), false);

        const firstRetirementYear = result.yearlyData.find(year => year.age === 65);

        expect(result.agedCareProfile.costWeight).toBe(0.5);
        expect(firstRetirementYear.agedCareCost).toBe(5000);
    });

    test('records lifecycle, funding, and decumulation stages in yearly output', () => {
        const simulator = createSimulator();
        const result = simulator.simulateRetirement(buildInputs(), false);

        const bridgeYear = result.yearlyData.find(year => year.age === 65);
        const stableYear = result.yearlyData.find(year => year.age === 75);
        const careYear = result.yearlyData.find(year => year.age === 85);

        expect(bridgeYear.lifecycleStage).toBe('pre_pension_bridge');
        expect(bridgeYear.fundingStage).toBe('self_funded');
        expect(bridgeYear.decumulationStrategy).toBe('floor_upside');
        expect(stableYear.lifecycleStage).toBe('stable_retirement');
        expect(careYear.lifecycleStage).toBe('late_life_care');
        expect(careYear.discretionarySpending).toBeLessThan(bridgeYear.discretionarySpending);
    });

    test('reports aged care event frequency in Monte Carlo output', async () => {
        const simulator = createSimulator();
        const result = await simulator.runMonteCarloSimulation(buildInputs({
            agedCareProbability: 1,
            agedCareStartAge: 70,
            agedCareDuration: 1,
        }), 5);

        expect(result.careStats.configuredProbability).toBe(1);
        expect(result.careStats.simulatedEventRate).toBe(1);
    });
});
