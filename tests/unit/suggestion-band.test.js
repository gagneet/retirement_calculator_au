/**
 * suggestion-band.test.js — Suggestion risk metrics and ranking tests (Task 3 of engine fixes)
 *
 * Tests firstDepletionAge, amountAtRisk, classifyRecommendation, and riskRank.
 * See: src/js/recommendation.js
 */

import {
    firstDepletionAge,
    amountAtRisk,
    classifyRecommendation,
    riskRank,
} from '../../src/js/recommendation.js';

describe('firstDepletionAge', () => {
    test('returns null when the plan survives (never depletes)', () => {
        const yearly = [
            { age: 70, endBalance: 500000 },
            { age: 71, endBalance: 400000 },
            { age: 72, endBalance: 300000 },
        ];
        expect(firstDepletionAge(yearly, 70)).toBeNull();
    });

    test('returns the age of first zero or negative balance', () => {
        const yearly = [
            { age: 80, endBalance: 200000 },
            { age: 81, endBalance: 50000 },
            { age: 82, endBalance: 0 },
            { age: 83, endBalance: -10000 },
        ];
        expect(firstDepletionAge(yearly, 80)).toBe(82);
    });

    test('recognises entries flagged as depleted even with positive balance field', () => {
        const yearly = [
            { age: 75, endBalance: 100, depleted: false },
            { age: 76, endBalance: 100, depleted: true },
        ];
        expect(firstDepletionAge(yearly, 75)).toBe(76);
    });

    test('empty yearly array returns null', () => {
        expect(firstDepletionAge([], 70)).toBeNull();
    });

    test('falls back to index-based age when age field is missing', () => {
        const yearly = [{ endBalance: 1000 }, { endBalance: 0 }];
        expect(firstDepletionAge(yearly, 70)).toBe(71);
    });
});

describe('amountAtRisk', () => {
    test('returns 0 when no shortfalls exist', () => {
        const yearly = [
            { shortfall: 0, yearsAhead: 0 },
            { shortfall: 0, yearsAhead: 1 },
        ];
        expect(amountAtRisk(yearly, 0.025)).toBe(0);
    });

    test('deflates shortfalls to today\'s dollars', () => {
        // shortfall 10000 in year 1 at 2.5% inflation → today's $ ≈ 9756
        const yearly = [
            { shortfall: 0, yearsAhead: 0 },
            { shortfall: 10000, yearsAhead: 1 },
        ];
        expect(amountAtRisk(yearly, 0.025)).toBeCloseTo(10000 / 1.025, 1);
    });

    test('sums multiple shortfall years', () => {
        const inflation = 0.03;
        const yearly = [
            { shortfall: 5000, yearsAhead: 1 },
            { shortfall: 8000, yearsAhead: 2 },
        ];
        const expected = 5000 / 1.03 + 8000 / (1.03 ** 2);
        expect(amountAtRisk(yearly, inflation)).toBeCloseTo(expected, 1);
    });

    test('returns 0 for empty array', () => {
        expect(amountAtRisk([], 0.025)).toBe(0);
    });

    test('amountAtRisk is 0 when p10 never depletes (no shortfalls)', () => {
        const yearly = [
            { shortfall: 0, yearsAhead: 0 },
            { shortfall: 0, yearsAhead: 1 },
            { shortfall: 0, yearsAhead: 2 },
        ];
        expect(amountAtRisk(yearly, 0.025)).toBe(0);
    });
});

describe('classifyRecommendation', () => {
    test('positive balance, no risk worsening → recommended', () => {
        expect(classifyRecommendation({
            finalBalanceDelta: 100000,
            successRateDelta: 0,
            baselineDepletionAge: null,
            scenarioDepletionAge: null,
        })).toBe('recommended');
    });

    test('negative balance, improved success rate → trade_off', () => {
        expect(classifyRecommendation({
            finalBalanceDelta: -100000,
            successRateDelta: 0.05,
            baselineDepletionAge: null,
            scenarioDepletionAge: null,
        })).toBe('trade_off');
    });

    test('negative balance, depletion age improves (later) → trade_off', () => {
        expect(classifyRecommendation({
            finalBalanceDelta: -100000,
            successRateDelta: 0,
            baselineDepletionAge: 85,
            scenarioDepletionAge: 90,
        })).toBe('trade_off');
    });

    test('negative balance, no risk improvement → not_recommended', () => {
        expect(classifyRecommendation({
            finalBalanceDelta: -100000,
            successRateDelta: 0,
            baselineDepletionAge: null,
            scenarioDepletionAge: null,
        })).toBe('not_recommended');
    });

    test('positive balance but risk worsens → not_recommended', () => {
        expect(classifyRecommendation({
            finalBalanceDelta: 50000,
            successRateDelta: -0.05,
            baselineDepletionAge: null,
            scenarioDepletionAge: 88,
        })).toBe('not_recommended');
    });

    test('educational scenario flagged as educational_only', () => {
        expect(classifyRecommendation({
            finalBalanceDelta: -50000,
            successRateDelta: 0,
        }, true)).toBe('educational_only');
    });
});

describe('riskRank', () => {
    test('higher success rate ranks first', () => {
        const recs = [
            { band: { successRate: 0.9, depletionAge: 88, amountAtRisk: 0, balanceDelta: 100000 } },
            { band: { successRate: 0.97, depletionAge: null, amountAtRisk: 0, balanceDelta: 50000 } },
        ];
        recs.sort(riskRank);
        expect(recs[0].band.successRate).toBe(0.97);
    });

    test('same success: later depletion age ranks first (null = never = best)', () => {
        const recs = [
            { band: { successRate: null, depletionAge: 88, amountAtRisk: 0, balanceDelta: 0 } },
            { band: { successRate: null, depletionAge: null, amountAtRisk: 0, balanceDelta: 0 } },
        ];
        recs.sort(riskRank);
        expect(recs[0].band.depletionAge).toBeNull();
    });

    test('same success + depletion: lower amount-at-risk ranks first', () => {
        const recs = [
            { band: { successRate: 0.9, depletionAge: 88, amountAtRisk: 50000, balanceDelta: 0 } },
            { band: { successRate: 0.9, depletionAge: 88, amountAtRisk: 10000, balanceDelta: 0 } },
        ];
        recs.sort(riskRank);
        expect(recs[0].band.amountAtRisk).toBe(10000);
    });

    test('tie-break: higher balance delta wins', () => {
        const recs = [
            { band: { successRate: 0.9, depletionAge: 88, amountAtRisk: 0, balanceDelta: 10000 } },
            { band: { successRate: 0.9, depletionAge: 88, amountAtRisk: 0, balanceDelta: 200000 } },
        ];
        recs.sort(riskRank);
        expect(recs[0].band.balanceDelta).toBe(200000);
    });

    test('empty band does not throw', () => {
        const recs = [{ band: {} }, { band: {} }];
        expect(() => recs.sort(riskRank)).not.toThrow();
    });

    test('missing band does not throw', () => {
        const recs = [{}, {}];
        expect(() => recs.sort(riskRank)).not.toThrow();
    });
});
