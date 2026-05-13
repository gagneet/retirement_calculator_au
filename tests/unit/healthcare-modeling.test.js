import { ENHANCED_CONFIG } from '../../src/js/config.js';
import { HealthcareModelingEngine } from '../../src/js/healthcare-modeling.js';

describe('HealthcareModelingEngine', () => {
    const buildInputs = (overrides = {}) => ({
        yourCurrentAge: 45,
        retirementAge: 67,
        yourLifespan: 90,
        partnerCurrentAge: 0,
        partnerLifespan: 0,
        isSingleCalculation: true,
        gender: 'male',
        yourSalary: 90000,
        partnerSalary: 0,
        yourCurrentSuper: 250000,
        partnerCurrentSuper: 0,
        currentSavings: 50000,
        currentStocks: 20000,
        homeValue: 850000,
        currentHealthcareCosts: ENHANCED_CONFIG.DEFAULTS.healthcare.currentHealthcareCosts,
        healthcareInflation: ENHANCED_CONFIG.DEFAULTS.healthcare.healthcareInflation,
        agedCareStartAge: ENHANCED_CONFIG.DEFAULTS.healthcare.agedCareStartAge,
        agedCareDuration: ENHANCED_CONFIG.DEFAULTS.healthcare.agedCareDuration,
        ...overrides,
    });

    test('supports open-ended lifespan inputs without failing the analysis', () => {
        const engine = new HealthcareModelingEngine(ENHANCED_CONFIG);
        const projection = engine.calculateHealthcareCostProjection(buildInputs({ yourLifespan: 0 }));
        const summary = engine.generateHealthcareSummary(buildInputs({ yourLifespan: 0 }));

        expect(projection.validationErrors).toBeUndefined();
        expect(projection.yearlyProjections.length).toBeGreaterThan(0);
        expect(summary.totalLifetimeCost).toBeGreaterThan(0);
        expect(summary.agedCareProbability).toBeGreaterThan(0);
    });

    test('returns safe summary and simulation output when inputs are invalid', () => {
        const engine = new HealthcareModelingEngine(ENHANCED_CONFIG);
        const inputs = buildInputs({ currentHealthcareCosts: -1 });

        expect(() => engine.generateHealthcareSummary(inputs)).not.toThrow();
        expect(() => engine.simulateHealthcareCosts(inputs, 5)).not.toThrow();

        const summary = engine.generateHealthcareSummary(inputs);
        const simulation = engine.simulateHealthcareCosts(inputs, 5);

        expect(summary.agedCareProbability).toBe(0);
        expect(summary.majorRisks).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    type: 'data_validation',
                    severity: 'high',
                }),
            ])
        );
        expect(simulation.outcomes).toHaveLength(5);
        expect(simulation.percentile95).toBe(0);
    });

    test('uses the entered healthcare costs without double counting the out-of-pocket total', () => {
        const engine = new HealthcareModelingEngine(ENHANCED_CONFIG);
        const projection = engine.calculateHealthcareCostProjection(buildInputs({
            hasPrivateHealthInsurance: false,
            currentHealthcareCosts: 4200,
            yourCurrentAge: 60,
            yourLifespan: 61,
        }));

        expect(projection.yearlyProjections.length).toBeGreaterThan(0);
        expect(projection.yearlyProjections[0].totalCost).toBeCloseTo(4200, 6);
        expect(projection.yearlyProjections[0].totalCost).toBeCloseTo(
            Object.values(projection.yearlyProjections[0].outOfPocketCosts).reduce((sum, cost) => sum + cost, 0),
            6
        );
    });

    test('responds to higher healthcare inflation in later projection years', () => {
        const engine = new HealthcareModelingEngine(ENHANCED_CONFIG);
        const lowInflation = engine.calculateHealthcareCostProjection(buildInputs({
            currentHealthcareCosts: 3500,
            healthcareInflation: 0.02,
            yourCurrentAge: 60,
            yourLifespan: 61,
            hasPrivateHealthInsurance: false,
        }));
        const highInflation = engine.calculateHealthcareCostProjection(buildInputs({
            currentHealthcareCosts: 3500,
            healthcareInflation: 0.08,
            yourCurrentAge: 60,
            yourLifespan: 61,
            hasPrivateHealthInsurance: false,
        }));

        expect(lowInflation.yearlyProjections[1].totalCost).toBeLessThan(highInflation.yearlyProjections[1].totalCost);
    });

    test('monte carlo aged care add-on uses the conditional cost when an event occurs', () => {
        const engine = new HealthcareModelingEngine(ENHANCED_CONFIG);
        const inputs = buildInputs();
        const projection = engine.calculateHealthcareCostProjection(inputs);
        const expectedConditionalAgedCareCost = projection.agedCareProjections.totalExpectedCost / projection.agedCareProjections.probabilityOfNeed;
        const randomSpy = jest.spyOn(Math, 'random')
            .mockReturnValueOnce(0.5)
            .mockReturnValueOnce(0.25)
            .mockReturnValueOnce(0)
            .mockReturnValueOnce(0.5)
            .mockReturnValueOnce(0.25);

        const simulation = engine.simulateHealthcareCosts(inputs, 1);

        expect(simulation.outcomes).toHaveLength(1);
        expect(simulation.outcomes[0]).toBeCloseTo(projection.totalLifetimeCost + expectedConditionalAgedCareCost, 6);

        randomSpy.mockRestore();
    });

    test('aged care probabilities stay bounded when the starting age is below the first lookup band', () => {
        const engine = new HealthcareModelingEngine(ENHANCED_CONFIG);
        const agedCare = engine.calculateAgedCareProjections(buildInputs({
            yourCurrentAge: 45,
            isSingleCalculation: true,
        }));

        expect(agedCare.homeCare.probability).toBeGreaterThanOrEqual(0);
        expect(agedCare.residentialCare.probability).toBeGreaterThanOrEqual(0);
        expect(agedCare.probabilityOfNeed).toBeGreaterThanOrEqual(0);
        expect(agedCare.totalExpectedCost).toBeGreaterThanOrEqual(0);
    });
});
