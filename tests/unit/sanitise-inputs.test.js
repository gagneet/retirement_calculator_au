/**
 * sanitise-inputs.test.js — Input sanitiser unit tests (Task 1 of engine fixes)
 *
 * Tests for sanitiseInputs / sanitiseReturnDeclineRate / return-ceiling checks.
 * See: src/js/policy/normalise-inputs.js
 */

import {
    sanitiseInputs,
    sanitiseReturnDeclineRate,
    RETURN_CEILING,
    RETURN_OPTIMISTIC,
    DECLINE_MAX,
    DECLINE_DEFAULT,
} from '../../src/js/policy/normalise-inputs.js';

describe('sanitiseReturnDeclineRate', () => {
    test('safe decimal passthrough — value within DECLINE_MAX', () => {
        const result = sanitiseReturnDeclineRate(0.0003);
        expect(result.value).toBeCloseTo(0.0003);
        expect(result.migrated).toBe(false);
        expect(result.reason).toBeNull();
    });

    test('zero is safe and passes through', () => {
        const result = sanitiseReturnDeclineRate(0);
        expect(result.value).toBe(0);
        expect(result.migrated).toBe(false);
    });

    test('missing / non-finite returns DECLINE_DEFAULT', () => {
        // null → Number(null) = 0, which is within range; treated as "safe"
        expect(sanitiseReturnDeclineRate(null).value).toBeCloseTo(0);
        // undefined / NaN / Infinity → non-finite → DECLINE_DEFAULT
        expect(sanitiseReturnDeclineRate(undefined).value).toBeCloseTo(DECLINE_DEFAULT);
        expect(sanitiseReturnDeclineRate(NaN).value).toBeCloseTo(DECLINE_DEFAULT);
        expect(sanitiseReturnDeclineRate(Infinity).value).toBeCloseTo(DECLINE_DEFAULT);
        expect(sanitiseReturnDeclineRate(undefined).reason).toBe('missing_or_non_finite');
    });

    test('legacy percentage form 0.2 migrates to 0.002 (0.2%/yr)', () => {
        // A value of 0.2 stored from a UI that saved in %-form is interpreted as 0.2%/yr
        // and migrated to the decimal equivalent 0.002, which is within DECLINE_MAX.
        const result = sanitiseReturnDeclineRate(0.2);
        expect(result.value).toBeCloseTo(0.002);
        expect(result.migrated).toBe(true);
        expect(result.reason).toBe('legacy_percent_to_decimal');
    });

    test('value at the boundary DECLINE_MAX is accepted without migration', () => {
        const result = sanitiseReturnDeclineRate(DECLINE_MAX);
        expect(result.value).toBeCloseTo(DECLINE_MAX);
        expect(result.migrated).toBe(false);
    });

    test('value 5 (unsafe, cannot be migrated) is flagged outside_supported_range', () => {
        const result = sanitiseReturnDeclineRate(5);
        expect(result.reason).toBe('outside_supported_range');
        expect(result.migrated).toBe(false);
    });
});

describe('sanitiseInputs — returnDeclineRate', () => {
    test('0.2 is migrated to 0.002 and produces a warning on returnDeclineRate', () => {
        const { inputs, warnings } = sanitiseInputs({ returnDeclineRate: 0.2 }, {});
        expect(inputs.returnDeclineRate).toBeCloseTo(0.002);
        const w = warnings.find(w => w.field === 'returnDeclineRate');
        expect(w).toBeDefined();
    });

    test('safe value 0.0003 passes through without warnings', () => {
        const { inputs, warnings } = sanitiseInputs({ returnDeclineRate: 0.0003 }, {});
        expect(inputs.returnDeclineRate).toBeCloseTo(0.0003);
        const rdrWarnings = warnings.filter(w => w.field === 'returnDeclineRate');
        expect(rdrWarnings).toHaveLength(0);
    });

    test('missing returnDeclineRate uses DECLINE_DEFAULT', () => {
        const { inputs } = sanitiseInputs({}, {});
        expect(inputs.returnDeclineRate).toBeCloseTo(DECLINE_DEFAULT);
    });
});

describe('sanitiseInputs — return ceilings', () => {
    test('superReturn above RETURN_CEILING is clamped to config fallback', () => {
        const { inputs, warnings } = sanitiseInputs(
            { superReturn: 0.12 },
            { DEFAULT_SUPER_RETURN: 0.075 }
        );
        expect(inputs.superReturn).toBeLessThanOrEqual(RETURN_CEILING);
        const w = warnings.find(w => w.field === 'superReturn');
        expect(w).toBeDefined();
        expect(w.severity).toBe('error');
    });

    test('investmentReturn above RETURN_CEILING is clamped', () => {
        const { inputs, warnings } = sanitiseInputs(
            { investmentReturn: 0.15 },
            { DEFAULT_EQUITY_RETURN: 0.065 }
        );
        expect(inputs.investmentReturn).toBeLessThanOrEqual(RETURN_CEILING);
        expect(warnings.find(w => w.field === 'investmentReturn').severity).toBe('error');
    });

    test('return between RETURN_OPTIMISTIC and RETURN_CEILING produces a warning, no clamping', () => {
        const { inputs, warnings } = sanitiseInputs(
            { investmentReturn: 0.09 },
            {}
        );
        // Not clamped — between RETURN_OPTIMISTIC and RETURN_CEILING
        expect(inputs.investmentReturn).toBeCloseTo(0.09);
        const w = warnings.find(w => w.field === 'investmentReturn');
        expect(w).toBeDefined();
        expect(w.severity).toBe('warning');
    });

    test('return at or below RETURN_OPTIMISTIC produces no return-ceiling warning', () => {
        const { warnings } = sanitiseInputs({ investmentReturn: 0.07 }, {});
        const w = warnings.find(w => w.field === 'investmentReturn');
        expect(w).toBeUndefined();
    });

    test('null return field is skipped without error', () => {
        expect(() => sanitiseInputs({ superReturn: null }, {})).not.toThrow();
    });
});

describe('sanitiseInputs — headlineScenarioMode', () => {
    test('valid scenarioMode is preserved in headlineScenarioMode', () => {
        const { inputs } = sanitiseInputs({ scenarioMode: 'optimistic' }, {});
        expect(inputs.headlineScenarioMode).toBe('optimistic');
    });

    test('missing scenarioMode sets headlineScenarioMode to baseline', () => {
        const { inputs } = sanitiseInputs({}, {});
        expect(inputs.headlineScenarioMode).toBe('baseline');
    });

    test('unknown scenarioMode sets headlineScenarioMode to baseline', () => {
        const { inputs } = sanitiseInputs({ scenarioMode: 'aggressive' }, {});
        expect(inputs.headlineScenarioMode).toBe('baseline');
    });

    test('base scenarioMode passes through as headlineScenarioMode', () => {
        const { inputs } = sanitiseInputs({ scenarioMode: 'base' }, {});
        expect(inputs.headlineScenarioMode).toBe('base');
    });
});

describe('exported constants', () => {
    test('RETURN_CEILING > RETURN_OPTIMISTIC > DECLINE_MAX > DECLINE_DEFAULT', () => {
        expect(RETURN_CEILING).toBeGreaterThan(RETURN_OPTIMISTIC);
        expect(DECLINE_MAX).toBeGreaterThan(DECLINE_DEFAULT);
    });
});
