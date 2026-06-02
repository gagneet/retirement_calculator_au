import {
    adaptEngineOutput,
    buildEngineInputs,
    getHouseholdPensionDefaults,
    mapDestinationCode,
    normalizeImportedUserData,
    normaliseRiskProfile,
    runEngine,
    setSectionOpenState,
    syncPensionMeansTestFields,
} from '../../src/js/advanced-v2.js';

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
    reducedIncomeAge: 0,
    reducedIncomeSalary: 0,
    partnerReducedIncomeAge: 0,
    partnerReducedIncomeSalary: 0,
    businessIncome: 0,
    investmentIncomeOutsideSuper: 0,
    dependents: 0,
    educationCostPerChild: 0,
    privateSchool: false,
    uniSupport: false,
    isCarer: false,
    annualParentSupport: 0,
    carerAnnualExpense: undefined,
    carerReducedWorkPercent: 0,
    carerYearsExpected: 0,
    homeValue: 850000,
    mortgage: 200000,
    mortgageRate: 6,
    downsizePlan: 'no',
    ccBalance: 0,
    ccRate: 19.99,
    personalLoan: 0,
    personalLoanRate: 9,
    carLoan: 0,
    carLoanRate: 8,
    hecsBalance: 0,
    investmentProperty: false,
    ipValue: 0,
    ipLoan: 0,
    ipRate: 6.35,
    ipWeeklyRent: 0,
    ipAnnualExpenses: 0,
    landTax: 0,
    ipGrowthRate: 4,
    ipState: '',
    hasSmsf: false,
    smsfAdminCosts: undefined,
    hasTrust: false,
    trustNetAssets: 0,
    trustAttributionPercentage: 100,
    trustAnnualDistributions: 0,
    trustTaxRate: 30,
    familyTrustIncomeDistribution: 0,
    beneficiaryAllocation: 100,
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
    beforeEach(() => {
        document.body.innerHTML = '';
    });

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

    test('accepts canonical ratio percentages without dividing them again', () => {
        const engineInputs = buildEngineInputs(buildRedesignInputs({
            inflation: 0.026,
            invReturn: 0.065,
            superGrowth: 0.075,
            employerRate: 0.12,
            mortgageRate: 0.06,
            ipRate: 0.0635,
        }));

        expect(engineInputs.inflation).toBeCloseTo(0.026);
        expect(engineInputs.investmentReturn).toBeCloseTo(0.065);
        expect(engineInputs.superReturn).toBeCloseTo(0.075);
        expect(engineInputs.employerSuperContributionRate).toBeCloseTo(0.12);
        expect(engineInputs.mortgageRate).toBeCloseTo(0.06);
        expect(engineInputs.investmentPropertyRate).toBeCloseTo(0.0635);
    });

    test('keeps single calculations single even when hidden partner fields still contain values', () => {
        const engineInputs = buildEngineInputs(buildRedesignInputs({
            household: 'single',
            partnerAge: 42,
            partnerSalary: 85000,
            partnerSuperBal: 160000,
            spouseContribution: 3000,
        }));

        expect(engineInputs.isCouple).toBe(false);
        expect(engineInputs.partnerCurrentAge).toBe(0);
        expect(engineInputs.partnerSalary).toBe(0);
        expect(engineInputs.partnerCurrentSuper).toBe(0);
        expect(engineInputs.spouseContribution).toBe(0);
    });

    test('maps debt, investment property, reduced income and carer fields into simulator inputs', () => {
        const engineInputs = buildEngineInputs(buildRedesignInputs({
            household: 'couple',
            partnerAge: 43,
            partnerSalary: 80000,
            partnerSuperBal: 150000,
            ccBalance: 4500,
            ccRate: 21.5,
            personalLoan: 12000,
            personalLoanRate: 10.2,
            carLoan: 18000,
            carLoanRate: 7.5,
            hecsBalance: 25000,
            investmentProperty: true,
            ipValue: 900000,
            ipLoan: 520000,
            ipRate: 6.45,
            ipWeeklyRent: 650,
            ipAnnualExpenses: 11000,
            landTax: 2400,
            reducedIncomeEnabled: true,
            reducedIncomeAge: 58,
            reducedIncomeSalary: 90000,
            partnerReducedIncomeAge: 60,
            partnerReducedIncomeSalary: 65000,
            isCarer: true,
            carerReducedWorkPercent: 20,
            carerYearsExpected: 5,
            annualParentSupport: 8000,
        }));

        expect(engineInputs.creditCardBalance).toBe(4500);
        expect(engineInputs.creditCardRate).toBeCloseTo(0.215);
        expect(engineInputs.personalLoanBalance).toBe(12000);
        expect(engineInputs.personalLoanRate).toBeCloseTo(0.102);
        expect(engineInputs.carLoanBalance).toBe(18000);
        expect(engineInputs.carLoanRate).toBeCloseTo(0.075);
        expect(engineInputs.hecsBalance).toBe(25000);
        expect(engineInputs.investmentPropertyRate).toBeCloseTo(0.0645);
        expect(engineInputs.landTax).toBe(2400);
        expect(engineInputs.reducedIncomeAge).toBe(58);
        expect(engineInputs.reducedIncomeSalary).toBe(90000);
        expect(engineInputs.partnerReducedIncomeAge).toBe(60);
        expect(engineInputs.partnerReducedIncomeSalary).toBe(65000);
        expect(engineInputs.carerReducedWorkPercent).toBeCloseTo(0.2);
        expect(engineInputs.carerYearsExpected).toBe(5);
        expect(engineInputs.carerAnnualExpense).toBe(8000);
    });

    test('calculates configured state land tax when no manual land tax is entered', () => {
        const engineInputs = buildEngineInputs(buildRedesignInputs({
            investmentProperty: true,
            ipValue: 900000,
            ipState: 'VIC',
            landTax: 0,
        }));

        expect(engineInputs.landTax).toBeGreaterThan(0);
    });

    test('uses current config defaults for household pension means tests', () => {
        expect(getHouseholdPensionDefaults('single')).toEqual({
            threshold: 321500,
            cutoff: 722000,
        });
        expect(getHouseholdPensionDefaults('couple')).toEqual({
            threshold: 481500,
            cutoff: 1085000,
        });
    });

    test('syncs pension asset fields when the household changes unless manually overridden', () => {
        document.body.innerHTML = `
            <div class="segmented" data-bind="household" data-value="single"></div>
            <input id="pensionAssetThreshold" value="481500" />
            <input id="pensionAssetCutoff" value="1085000" />
        `;

        syncPensionMeansTestFields(true);
        expect(document.getElementById('pensionAssetThreshold').value).toBe('321500');
        expect(document.getElementById('pensionAssetCutoff').value).toBe('722000');

        document.querySelector('[data-bind="household"]').dataset.value = 'couple';
        document.getElementById('pensionAssetThreshold').dataset.autoDefault = 'false';
        document.getElementById('pensionAssetThreshold').value = '400000';

        syncPensionMeansTestFields();
        expect(document.getElementById('pensionAssetThreshold').value).toBe('400000');
        expect(document.getElementById('pensionAssetCutoff').value).toBe('1085000');
    });

    test('returns a real-engine result shaped for the redesigned UI', () => {
        const result = runEngine(buildRedesignInputs());

        expect(result.monthlyPaycheck).toBeGreaterThan(0);
        expect(result.superAtRetire).toBeGreaterThan(0);
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(0.98);
        expect(result.lastsUntil).toBeGreaterThanOrEqual(65);
        expect(result.years.length).toBeGreaterThan(10);
        expect(result.years[0].age).toBe(45);
        expect(result.years[0].superBalance).toBeGreaterThan(0);
        expect(result.years.some((year) => year.retired)).toBe(true);
        expect(result.breakdown.super + result.breakdown.pension + result.breakdown.other).toBeGreaterThan(0);
    });

    test('lets confidence drop below the old artificial floor when coverage and longevity are both poor', () => {
        const inputs = buildRedesignInputs({
            age: 63,
            retireAge: 63,
            lifespan: 95,
            desiredIncome: 120000,
        });
        const engineInputs = buildEngineInputs(inputs);
        const result = adaptEngineOutput(inputs, engineInputs, {
            depletionAge: 63,
            yearlyData: [{
                age: 63,
                startBalance: 0,
                endBalance: 0,
                withdrawal: 0,
                superIncome: 0,
                pensionIncome: 0,
                otherIncome: 0,
                nonLiquidAssets: 0,
            }],
            accumulationHistory: [],
        });

        expect(result.gapMonthly).toBeGreaterThan(0);
        expect(result.confidence).toBe(0);
    });

    test('maps redesign overseas destinations to analyzer country codes', () => {
        expect(mapDestinationCode('portugal')).toBe('PORTUGAL');
        expect(mapDestinationCode('nz')).toBe('NEW_ZEALAND');
        expect(mapDestinationCode('newzealand')).toBe('NEW_ZEALAND');
        expect(mapDestinationCode('spain')).toBe('SPAIN');
        expect(mapDestinationCode('italy')).toBe('ITALY');
        expect(mapDestinationCode('canada')).toBe('CANADA');
        expect(mapDestinationCode('japan')).toBe('JAPAN');
        expect(mapDestinationCode('india')).toBe('INDIA');
        expect(mapDestinationCode('usa')).toBe('USA');
        expect(mapDestinationCode('bali')).toBe('BALI');
        expect(mapDestinationCode('philippines')).toBe('PHILIPPINES');
        expect(mapDestinationCode('')).toBeNull();
    });

    test('maps SMSF fields with nullish coalescing — explicit 0 is preserved', () => {
        const withZero = buildEngineInputs(buildRedesignInputs({ hasSmsf: true, smsfAdminCosts: 0 }));
        expect(withZero.hasSMSF).toBe(true);
        expect(withZero.smsfAdminCosts).toBe(0);

        const withDefault = buildEngineInputs(buildRedesignInputs({ hasSmsf: true }));
        expect(withDefault.smsfAdminCosts).toBe(3500);
    });

    test('maps trust fields with correct percent-to-ratio conversions', () => {
        const engineInputs = buildEngineInputs(buildRedesignInputs({
            hasTrust: true,
            trustType: 'discretionary',
            trustControlLevel: 'high',
            trustNetAssets: 500000,
            trustAttributionPercentage: 80,
            trustAnnualDistributions: 20000,
            trustTaxRate: 15,
            familyTrustIncomeDistribution: 10000,
            beneficiaryAllocation: 50,
        }));

        expect(engineInputs.hasTrustAssets).toBe(true);
        expect(engineInputs.trustNetAssets).toBe(500000);
        expect(engineInputs.trustAttributionPercentage).toBeCloseTo(0.8);
        expect(engineInputs.trustTaxRate).toBeCloseTo(0.15);
        expect(engineInputs.beneficiaryAllocation).toBeCloseTo(0.5);
        expect(engineInputs.trustAnnualDistributions).toBe(20000);
        expect(engineInputs.familyTrustIncomeDistribution).toBe(10000);
    });

    test('carerAnnualExpense uses nullish coalescing — explicit 0 is not replaced by annualParentSupport', () => {
        const withExplicitZero = buildEngineInputs(buildRedesignInputs({
            isCarer: true,
            carerAnnualExpense: 0,
            annualParentSupport: 8000,
        }));
        expect(withExplicitZero.carerAnnualExpense).toBe(0);

        const withFallback = buildEngineInputs(buildRedesignInputs({
            isCarer: true,
            annualParentSupport: 8000,
        }));
        expect(withFallback.carerAnnualExpense).toBe(8000);
    });

    test('normalises risk profile summary for export and rendering', () => {
        const profile = normaliseRiskProfile({
            overallRiskProfile: 'Balanced',
            confidenceLevel: 82,
            misalignment: { message: 'Well aligned' },
            optimalAllocation: { growth: 65, defensive: 25, cash: 10 },
            topRecommendations: ['Keep contributions steady'],
            dimensions: {
                capacity: { score: 78 },
                tolerance: { score: 64 },
                requirement: { score: 58 },
            },
        });

        expect(profile).toEqual({
            overallRiskProfile: 'Balanced',
            riskCapacity: 78,
            riskTolerance: 64,
            riskRequirement: 58,
            confidence: 82,
            recommendations: ['Keep contributions steady'],
            optimalAllocation: { growth: 65, defensive: 25, cash: 10 },
            misalignment: { message: 'Well aligned' },
            raw: expect.any(Object),
        });
    });

    test('normalizes canonical imported data into redesign fields', () => {
        const normalized = normalizeImportedUserData({
            yourCurrentAge: 50,
            retirementAge: 66,
            yourSalary: 140000,
            currentSavings: 75000,
            currentStocks: 30000,
            employerSuperContributionRate: 0.12,
            inflation: 0.027,
            investmentReturn: 0.068,
            hasPartner: true,
            partnerCurrentAge: 48,
            partnerSalary: 90000,
            partnerCurrentSuper: 180000,
            hasEmergencyFund: 'full',
            hasDebt: 'significant',
            planToDownsize: true,
            hasInvestmentProperty: true,
            healthCondition: 'fair',
            enableProposedBudget2026: true,
        });

        expect(normalized).toMatchObject({
            household: 'couple',
            age: 50,
            retireAge: 66,
            salary: 140000,
            cash: 75000,
            stocks: 30000,
            employerRate: 12,
            inflation: 2.7,
            partnerAge: 48,
            partnerSalary: 90000,
            partnerSuperBal: 180000,
            emergencyFund: '6plus',
            highInterestDebt: 'over_50k',
            downsizePlan: 'yes',
            investmentProperty: true,
            healthCondition: 'fair',
            budget2627: true,
        });
        expect(normalized.invReturn).toBeCloseTo(6.8);
    });

    test('preserves redesign-native overseas fields when importing redesign data', () => {
        const normalized = normalizeImportedUserData({
            household: 'single',
            age: 47,
            retireAge: 63,
            goingOverseas: true,
            destination: 'portugal',
            ageMovingOverseas: 67,
            annualLivingCostOverseas: 52000,
        });

        expect(normalized).toMatchObject({
            household: 'single',
            age: 47,
            retireAge: 63,
            goingOverseas: true,
            destination: 'portugal',
            ageMovingOverseas: 67,
            annualLivingCostOverseas: 52000,
        });
    });

    test('normalises imported overseas FX change display values into a sane percentage range', () => {
        const normalized = normalizeImportedUserData({
            yourCurrentAge: 46,
            retirementAge: 67,
            overseasAudFxChange: 62,
        });

        expect(normalized.overseasAudFxChange).toBeCloseTo(6.2);
    });

    test('updates accordion aria and hidden state when sections open and close', () => {
        document.body.innerHTML = `
            <section class="section open" data-section="personal">
                <button class="section-head" type="button"></button>
                <div class="section-body"></div>
            </section>
        `;

        const section = document.querySelector('.section');
        const head = document.querySelector('.section-head');
        const body = document.querySelector('.section-body');

        setSectionOpenState(section, false);
        expect(section.classList.contains('open')).toBe(false);
        expect(head.getAttribute('aria-expanded')).toBe('false');
        expect(body.hidden).toBe(true);
        expect(body.getAttribute('aria-hidden')).toBe('true');

        setSectionOpenState(section, true);
        expect(section.classList.contains('open')).toBe(true);
        expect(head.getAttribute('aria-expanded')).toBe('true');
        expect(body.hidden).toBe(false);
        expect(body.getAttribute('aria-hidden')).toBe('false');
    });
});
