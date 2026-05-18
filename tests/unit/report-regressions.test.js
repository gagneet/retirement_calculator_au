import templateData from '../../src/retirement_template.json';
import { ENHANCED_CONFIG } from '../../src/js/config.js';
import RetirementSimulator from '../../src/js/simulator.js';
import RecommendationEngine from '../../src/js/recommendation.js';
import { RiskProfilingEngine } from '../../src/js/risk-profiling-engine.js';
import { HealthcareModelingEngine } from '../../src/js/healthcare-modeling.js';

describe('report regression fixes', () => {
    test('healthcare modeling honours an explicit aged care probability from inputs', () => {
        const engine = new HealthcareModelingEngine(ENHANCED_CONFIG);
        const inputs = {
            ...templateData.userData,
            isSingleCalculation: false,
            gender: 'male',
            agedCareProbability: 0.22,
        };

        const agedCare = engine.calculateAgedCareProjections(inputs);
        const summary = engine.generateHealthcareSummary(inputs);

        expect(agedCare.probabilityOfNeed).toBeCloseTo(0.22, 6);
        expect(summary.agedCareProbability).toBeCloseTo(0.22, 6);
    });

    test('risk tolerance on a 1-10 scale is normalised to the same score as 0-100 input', () => {
        const engine = new RiskProfilingEngine(ENHANCED_CONFIG);

        const fromTenPointScale = engine.assessRiskTolerance({ riskTolerance: 9 });
        const fromHundredPointScale = engine.assessRiskTolerance({ riskTolerance: 90 });

        expect(fromTenPointScale.score).toBeCloseTo(fromHundredPointScale.score, 6);
        expect(fromTenPointScale.score).toBeGreaterThan(60);
    });

    test('deterministic projection runs until the older partner lifespan is reached', () => {
        const simulator = new RetirementSimulator(ENHANCED_CONFIG);
        const result = simulator.simulateRetirement(templateData.userData, false);
        const finalYear = result.yearlyData.at(-1);

        expect(finalYear.partnerAge).toBe(templateData.userData.partnerLifespan);
        expect(finalYear.age).toBe(
            templateData.userData.yourCurrentAge +
            (templateData.userData.partnerLifespan - templateData.userData.partnerCurrentAge)
        );
    });

    test('recommendation baseline Monte Carlo honours the requested run count', async () => {
        const simulator = {
            runMonteCarloSimulation: jest.fn().mockResolvedValue({ successRate: 0.9, median: 1_000_000 }),
            simulateRetirement: jest.fn().mockReturnValue({ finalBalance: 900_000 }),
        };
        const engine = new RecommendationEngine(simulator, { numRuns: 16_000 }, ENHANCED_CONFIG);

        await engine.runBaselineSimulation();

        expect(simulator.runMonteCarloSimulation).toHaveBeenCalledWith(
            { numRuns: 16_000 },
            16_000,
            null
        );
    });

    test('salary sacrifice recommendation scenarios write to supported super contribution fields', () => {
        const simulator = {
            calculateCashFlowAnalysis: jest.fn().mockReturnValue({
                cashFlow: { monthlyDisposableIncome: 1_000 },
                savingsAnalysis: { canIncreaseSavings: true, hasStrongCapacity: true },
            }),
        };
        const engine = new RecommendationEngine(simulator, templateData.userData, ENHANCED_CONFIG);

        const modifications = engine.buildSalarySacrificeModifications(5_400);

        expect(modifications.additionalSuperContributions).toBeUndefined();
        const changedKey = Object.keys(modifications).find((key) =>
            ['yourAdditionalSuperContribution', 'partnerAdditionalSuperContribution'].includes(key)
        );

        expect(changedKey).toBeDefined();
        expect(modifications[changedKey]).toBeGreaterThan(templateData.userData[changedKey] || 0);
    });
});
