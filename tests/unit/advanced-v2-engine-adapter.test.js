import { buildEngineInputs, runEngine } from '../../src/js/advanced-v2.js';

const buildRedesignInputs = (overrides = {}) => ({
    household: 'single',
    age: 45,
    retireAge: 65,
    lifespan: 90,
    gender: 'prefer_not_say',
    ageCameToAU: 0,
    ageStartedEarningAU: 0,
    partnerAge: 0,
    partnerRetireAge: 0,
    partnerLifespan: 0,
    partnerGender: 'prefer_not_say',
    partnerAgeCameToAU: 0,
    partnerAgeStartedEarningAU: 0,
    riskTolerance: 6,
    riskReactionDrop: 'monitor',
    investmentExperience: '3_7',
    marketKnowledge: 'moderate',
    volatilityComfort: '15',
    emergencyFund: '6plus',
    highInterestDebt: 'none',
    salary: 120000,
    partnerSalary: 0,
    superBal: 250000,
    partnerSuperBal: 0,
    cash: 50000,
    stocks: 40000,
    monthlyStockContrib: 500,
    salarySacrifice: 4000,
    partnerSalarySacrifice: 0,
    employerRate: 12,
    ncc: 0,
    partnerNCC: 0,
    concessionalUsedThisYear: 0,
    spouseContribution: 0,
    useDownsizer: false,
    useFHSS: false,
    reducedIncomeEnabled: false,
    businessIncome: 0,
    investmentIncomeOutsideSuper: 0,
    dependents: 0,
    educationCostPerChild: 0,
    privateSchool: false,
    uniSupport: false,
    isCarer: false,
    annualParentSupport: 0,
    homeValue: 850000,
    mortgage: 200000,
    mortgageRate: 6,
    downsizePlan: 'no',
    ccBalance: 0,
    ccRate: 19.99,
    personalLoan: 0,
    carLoan: 0,
    hecsBalance: 0,
    investmentProperty: false,
    ipValue: 0,
    ipLoan: 0,
    ipWeeklyRent: 0,
    ipAnnualExpenses: 0,
    ipGrowthRate: 4,
    ipState: '',
    hasSmsf: false,
    hasTrust: false,
    desiredIncome: 73000,
    hasPrivateHospital: true,
    healthCondition: 'good',
    healthcareCost: 4000,
    ageFirstHadCover: 31,
    agedCareProbability: 65,
    agedCareStartAge: 85,
    agedCareAnnualCost: 70000,
    inflation: 2.6,
    invReturn: 6.5,
    superGrowth: 7.5,
    savingsReturn: 1.4,
    agePensionAge: 67,
    pensionAnnualSingle: 31223,
    pensionAnnualCouple: 47070,
    pensionAssetThreshold: 321500,
    pensionAssetCutoff: 722000,
    mcRuns: 500,
    returnVolatility: 12,
    scenarioMode: 'baseline',
    enableShocks: false,
    sampleLifespan: false,
    budget2627: false,
    goingOverseas: false,
    destination: '',
    ageMovingOverseas: 0,
    annualLivingCostOverseas: 40000,
    ...overrides,
});

describe('advanced-v2 engine adapter', () => {
    test('maps redesigned fields onto simulator inputs with correct units', () => {
        const engineInputs = buildEngineInputs(buildRedesignInputs({
            household: 'couple',
            partnerAge: 43,
            partnerRetireAge: 64,
            partnerLifespan: 91,
            partnerSalary: 80000,
            partnerSuperBal: 150000,
            pensionAssetThreshold: 481500,
            pensionAssetCutoff: 1085000,
        }));

        expect(engineInputs.isCouple).toBe(true);
        expect(engineInputs.isSingleCalculation).toBe(false);
        expect(engineInputs.yourCurrentAge).toBe(45);
        expect(engineInputs.partnerCurrentAge).toBe(43);
        expect(engineInputs.inflation).toBeCloseTo(0.026);
        expect(engineInputs.investmentReturn).toBeCloseTo(0.065);
        expect(engineInputs.superReturn).toBeCloseTo(0.075);
        expect(engineInputs.employerSuperContributionRate).toBeCloseTo(0.12);
        expect(engineInputs.asfaComfortable).toBe(73000);
        expect(engineInputs.agePensionMax).toBe(47070);
        expect(engineInputs.pensionAssetThreshold).toBe(481500);
        expect(engineInputs.pensionAssetLimit).toBe(1085000);
        expect(engineInputs.useLongevityDistribution).toBe(false);
    });

    test('returns a real-engine result shaped for the redesigned UI', () => {
        const result = runEngine(buildRedesignInputs());

        expect(result.monthlyPaycheck).toBeGreaterThan(0);
        expect(result.superAtRetire).toBeGreaterThan(0);
        expect(result.confidence).toBeGreaterThanOrEqual(0.2);
        expect(result.confidence).toBeLessThanOrEqual(0.98);
        expect(result.lastsUntil).toBeGreaterThanOrEqual(65);
        expect(result.years.length).toBeGreaterThan(10);
        expect(result.years[0].age).toBe(45);
        expect(result.years.some((year) => year.retired)).toBe(true);
        expect(result.breakdown.super + result.breakdown.pension + result.breakdown.other).toBeGreaterThan(0);
    });
});
