import { ENHANCED_CONFIG } from '../../src/js/config.js';
import { ReverseScenarioEngine } from '../../src/js/calculation/reverse-scenario-engine.js';

const baseInputs = {
    yourCurrentAge: 49,
    partnerCurrentAge: 47,
    retirementAge: 67,
    partnerRetirementAge: 67,
    yourLifespan: 92,
    partnerLifespan: 92,
    isCouple: true,
    isSingleCalculation: false,
    yourSalary: 120000,
    partnerSalary: 80000,
    yourCurrentSuper: 200000,
    partnerCurrentSuper: 100000,
    currentSavings: 50000,
    currentStocks: 25000,
    monthlyStockContribution: 1000,
    homeowner: true,
    homeValue: 900000,
    mortgageBalance: 200000,
    monthlyMortgagePayment: 2500,
    hasInvestmentProperty: true,
    investmentPropertyValue: 600000,
    investmentPropertyLoan: 300000,
    weeklyRentalIncome: 600,
    annualPropertyExpenses: 10000,
    inflation: 0.026,
    investmentReturn: 0.07,
    superReturn: 0.075,
};

const target = {
    currentAge: 49,
    retirementAge: 67,
    lifespan: 92,
    targetAnnualIncomeToday: 84000,
    successProbabilityTarget: 0.8,
    includeAgePension: true,
};

describe('ReverseScenarioEngine', () => {
    test('builds the required comparison set including the $84k couple paths', () => {
        const engine = new ReverseScenarioEngine(ENHANCED_CONFIG, {
            solver: { solveAllLevers: jest.fn() },
        });

        const scenarios = engine.buildScenarioDefinitions({});

        expect(scenarios).toHaveLength(10);
        expect(scenarios.map((scenario) => scenario.key)).toEqual(expect.arrayContaining([
            'home_super_pension',
            'home_super_private',
            'renter_super_pension',
            'non_super_only',
            'property_retained',
            'property_sold',
            'salary_only',
            'aged_care',
            'stress',
        ]));
    });

    test('Age Pension and renter toggles alter engine inputs and thresholds', () => {
        const engine = new ReverseScenarioEngine(ENHANCED_CONFIG, {
            solver: { solveAllLevers: jest.fn() },
        });
        const renter = engine.applyScenario(baseInputs, target, {
            homeStatus: 'renting',
            includeAgePension: false,
            includeSuper: true,
            includeNonSuperInvestments: true,
            includeInvestmentProperty: false,
        });

        expect(renter.inputs.suppressAgePension).toBe(true);
        expect(renter.inputs.homeowner).toBe(false);
        expect(renter.inputs.homeValue).toBe(0);
        expect(renter.inputs.pensionAssetThreshold).toBe(
            ENHANCED_CONFIG.COUPLE_ASSET_THRESHOLD_NON_HOMEOWNER
        );
    });

    test('super off zeroes super balances and contribution rates', () => {
        const engine = new ReverseScenarioEngine(ENHANCED_CONFIG, {
            solver: { solveAllLevers: jest.fn() },
        });
        const result = engine.applyScenario(baseInputs, target, {
            homeStatus: 'own_home',
            includeSuper: false,
            includeAgePension: true,
            includeNonSuperInvestments: true,
            includeInvestmentProperty: false,
        });

        expect(result.inputs.yourCurrentSuper).toBe(0);
        expect(result.inputs.partnerCurrentSuper).toBe(0);
        expect(result.inputs.yourAdditionalSuperContribution).toBe(0);
        expect(result.inputs.employerSuperContributionRate).toBe(0);
    });

    test('noCurrentAssets scenario zeroes super, savings, and investment property', () => {
        const engine = new ReverseScenarioEngine(ENHANCED_CONFIG, {
            solver: { solveAllLevers: jest.fn() },
        });
        const result = engine.applyScenario(baseInputs, target, {
            homeStatus: 'own_home',
            includeSuper: true,
            includeAgePension: true,
            includeNonSuperInvestments: true,
            includeInvestmentProperty: false,
            noCurrentAssets: true,
        });

        expect(result.inputs.yourCurrentSuper).toBe(0);
        expect(result.inputs.partnerCurrentSuper).toBe(0);
        expect(result.inputs.currentSavings).toBe(0);
        expect(result.inputs.currentStocks).toBe(0);
        expect(result.inputs.investmentPropertyValue).toBe(0);
    });

    test('investment property retained includes property values and no sale year', () => {
        const engine = new ReverseScenarioEngine(ENHANCED_CONFIG, {
            solver: { solveAllLevers: jest.fn() },
        });
        const result = engine.applyScenario(baseInputs, target, {
            homeStatus: 'own_home',
            includeSuper: true,
            includeAgePension: true,
            includeNonSuperInvestments: true,
            includeInvestmentProperty: true,
            sellInvestmentPropertyAtRetirement: false,
        });

        expect(result.inputs.hasInvestmentProperty).toBe(true);
        expect(result.inputs.investmentPropertyValue).toBe(baseInputs.investmentPropertyValue);
        expect(result.inputs.sellPropertyYears).toBeUndefined();
    });

    test('investment property sold at retirement sets sellPropertyYears', () => {
        const engine = new ReverseScenarioEngine(ENHANCED_CONFIG, {
            solver: { solveAllLevers: jest.fn() },
        });
        const result = engine.applyScenario(baseInputs, target, {
            homeStatus: 'own_home',
            includeSuper: true,
            includeAgePension: true,
            includeNonSuperInvestments: true,
            includeInvestmentProperty: true,
            sellInvestmentPropertyAtRetirement: true,
        });

        expect(result.inputs.hasInvestmentProperty).toBe(true);
        expect(result.inputs.sellPropertyYears).toBeGreaterThan(0);
    });

    test('aged care on sets probability and annual cost defaults when not specified', () => {
        const engine = new ReverseScenarioEngine(ENHANCED_CONFIG, {
            solver: { solveAllLevers: jest.fn() },
        });
        const inputsWithoutAgedCare = { ...baseInputs, agedCareProbability: 0, agedCareAnnualCost: 0 };
        const result = engine.applyScenario(inputsWithoutAgedCare, target, {
            homeStatus: 'own_home',
            includeSuper: true,
            includeAgePension: true,
            includeNonSuperInvestments: true,
            includeAgedCare: true,
        });

        expect(result.inputs.agedCareProbability).toBeGreaterThan(0);
        expect(result.inputs.agedCareAnnualCost).toBeGreaterThan(0);
        expect(result.inputs.agedCareStartAge).toBeGreaterThan(0);
    });

    test('aged care off zeroes agedCareProbability', () => {
        const engine = new ReverseScenarioEngine(ENHANCED_CONFIG, {
            solver: { solveAllLevers: jest.fn() },
        });
        const result = engine.applyScenario(baseInputs, target, {
            homeStatus: 'own_home',
            includeSuper: true,
            includeAgePension: true,
            includeNonSuperInvestments: true,
            includeAgedCare: false,
        });

        expect(result.inputs.agedCareProbability).toBe(0);
        expect(result.inputs.agedCareAnnualCost).toBe(0);
    });

    test('stress scenario reduces returns and raises inflation', () => {
        const engine = new ReverseScenarioEngine(ENHANCED_CONFIG, {
            solver: { solveAllLevers: jest.fn() },
        });
        const normalResult = engine.applyScenario(baseInputs, target, {
            homeStatus: 'own_home',
            includeSuper: true,
            includeAgePension: true,
            includeNonSuperInvestments: true,
            stress: false,
        });
        const stressResult = engine.applyScenario(baseInputs, target, {
            homeStatus: 'own_home',
            includeSuper: true,
            includeAgePension: true,
            includeNonSuperInvestments: true,
            stress: true,
        });

        expect(stressResult.inputs.investmentReturn).toBeLessThan(normalResult.inputs.investmentReturn);
        expect(stressResult.inputs.superReturn).toBeLessThan(normalResult.inputs.superReturn);
        expect(stressResult.inputs.inflation).toBeGreaterThan(normalResult.inputs.inflation);
    });

    test('maps shared solver outputs into scenario-builder result columns', async () => {
        const rankedLevers = [
            { lever: 'superBalance', solved: 450000, feasible: true },
            { lever: 'investmentBalance', solved: 300000, feasible: true },
            { lever: 'salary', solved: 180000, feasible: true },
            { lever: 'extraSavings', solved: 2500, feasible: true },
            { lever: 'extraAnnualSuper', solved: 12000, feasible: true },
            { lever: 'netRent', solved: 700, feasible: true },
        ];
        const solver = {
            solveAllLevers: jest.fn().mockResolvedValue({
                rankedLevers,
                currentScore: {
                    totalAssetsNominal: 1500000,
                    estateToday: 250000,
                    passesGoal: true,
                },
                currentResult: {
                    yearlyData: [{ age: 67, pensionIncome: 20000 }],
                },
            }),
        };
        const engine = new ReverseScenarioEngine(ENHANCED_CONFIG, { solver });

        const result = await engine.solveScenario(baseInputs, target, {
            key: 'selected',
            name: 'Selected plan',
            homeStatus: 'own_home',
            includeAgePension: true,
            includeSuper: true,
            includeNonSuperInvestments: true,
            includeInvestmentProperty: true,
        });

        expect(result).toEqual(expect.objectContaining({
            requiredCurrentSuper: 450000,
            requiredCurrentNonSuperInvestments: 300000,
            requiredCurrentGrossSalary: 180000,
            requiredMonthlySurplus: 2500,
            requiredAnnualSalarySacrifice: 12000,
            requiredPropertyEquityOrRentalIncome: 700,
            expectedAgePensionContribution: 20000,
            expectedAssetsAtRetirement: 1500000,
            expectedEstateAtLifespan: 250000,
        }));
    });
});
