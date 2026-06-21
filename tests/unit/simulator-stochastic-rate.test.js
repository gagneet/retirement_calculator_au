import RetirementSimulator, {
    stochasticRate,
    stochasticSigmaForRate,
} from '../../src/js/simulator.js';
import ENHANCED_CONFIG from '../../src/js/config.js';

describe('stochasticRate', () => {
    test('returns the central rate when stochastic mode is disabled', () => {
        expect(stochasticRate(0.026, false, 0.005)).toBe(0.026);
    });

    test('uses caller-provided sigma and respects the lower floor', () => {
        const fourSigmaTail = Math.exp(-8);
        const randomSpy = jest.spyOn(Math, 'random')
            .mockReturnValueOnce(fourSigmaTail)
            .mockReturnValueOnce(0.5)
            .mockReturnValueOnce(fourSigmaTail)
            .mockReturnValueOnce(0);

        expect(stochasticRate(0.03, true, 0.005, 0.01)).toBe(0.005);
        expect(stochasticRate(0.03, true, 0.005, 0.01)).toBeCloseTo(0.07, 10);

        randomSpy.mockRestore();
    });

    test('uses type-specific volatility consistent with the shared engines', () => {
        expect(stochasticSigmaForRate(0.026, 'inflation')).toBeCloseTo(0.0104, 10);
        expect(stochasticSigmaForRate(0.075, 'super')).toBeCloseTo(0.045, 10);
        expect(stochasticSigmaForRate(0.014, 'savings')).toBeCloseTo(0.005, 10);
    });

    test('allows negative super years while retaining the configured loss floor', () => {
        const randomSpy = jest.spyOn(Math, 'random')
            .mockReturnValueOnce(Math.exp(-8))
            .mockReturnValueOnce(0.5);

        expect(stochasticRate(0.075, true, -0.30, 0.045)).toBeCloseTo(-0.105, 10);

        randomSpy.mockRestore();
    });
});

describe('RetirementSimulator.calculatePropertyValue', () => {
    test('allows negative growth while enforcing PROPERTY_GROWTH_MIN_RATE', () => {
        const simulator = new RetirementSimulator(ENHANCED_CONFIG);

        const withNegativeRate = simulator.calculatePropertyValue(100000, -0.05, 1);
        expect(withNegativeRate).toBeCloseTo(95000, 5);

        const flooredRate = simulator.calculatePropertyValue(100000, -0.25, 1);
        expect(flooredRate).toBeCloseTo(85000, 5);
    });
});
