import RetirementSimulator, { stochasticRate } from '../../src/js/simulator.js';
import ENHANCED_CONFIG from '../../src/js/config.js';

describe('stochasticRate', () => {
    test('returns the central rate when stochastic mode is disabled', () => {
        expect(stochasticRate(0.026, false, 0.005)).toBe(0.026);
    });

    test('stays within ±4pp band and respects floor in stochastic mode', () => {
        const randomSpy = jest.spyOn(Math, 'random')
            .mockReturnValueOnce(0) // lowest draw => -4pp perturbation
            .mockReturnValueOnce(1); // highest draw => +4pp perturbation

        expect(stochasticRate(0.03, true, 0.005)).toBe(0.005); // floored from -1%
        expect(stochasticRate(0.03, true, 0.005)).toBeCloseTo(0.07, 10);

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
