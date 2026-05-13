import RetirementSimulator from '../../src/js/simulator.js';
import ENHANCED_CONFIG from '../../src/js/config.js';

describe('RetirementSimulator dynamic allocation', () => {
    test('falls back to the standard glide path when the requested rule is unknown', () => {
        const simulator = new RetirementSimulator(ENHANCED_CONFIG);

        const fallbackAllocation = simulator.calculateDynamicAllocation(45, 'unknown-rule');
        const standardAllocation = simulator.calculateDynamicAllocation(45, '110minus');

        expect(fallbackAllocation).toEqual(standardAllocation);
    });
});
