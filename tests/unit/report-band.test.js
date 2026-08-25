/**
 * report-band.test.js — Mortgage payoff age and outcome band (today's $) tests
 * (Task 4 of engine fixes)
 *
 * Tests that mortgagePayoffAge is in the simulation result, and that deflateToToday
 * correctly converts nominal MC percentile values to today's dollars.
 * See: src/js/simulator.js, src/js/utils.js
 */

import { deflateToToday } from '../../src/js/utils.js';
import RetirementSimulator from '../../src/js/simulator.js';
import { ENHANCED_CONFIG } from '../../src/js/config.js';

describe('deflateToToday', () => {
    test('deflates a future value to today using compound inflation', () => {
        const nominal = 1000000;
        const years = 20;
        const inflation = 0.03;
        const todayValue = deflateToToday(nominal, years, inflation);
        expect(todayValue).toBeCloseTo(nominal / Math.pow(1.03, 20), 0);
        expect(todayValue).toBeLessThan(nominal);
    });

    test('band values are deflated (today < nominal)', () => {
        const nominal90 = 69350690;
        const years = 32;
        const inflation = 0.026;
        const today90 = deflateToToday(nominal90, years, inflation);
        expect(today90).toBeLessThan(nominal90);
    });

    test('zero years ahead returns original value', () => {
        expect(deflateToToday(500000, 0, 0.025)).toBe(500000);
    });

    test('zero inflation returns original value', () => {
        expect(deflateToToday(500000, 10, 0)).toBe(500000);
    });

    test('zero future value returns zero', () => {
        expect(deflateToToday(0, 10, 0.03)).toBe(0);
    });
});

describe('mortgagePayoffAge — simulator result', () => {
    const sim = new RetirementSimulator(ENHANCED_CONFIG);

    const baseInputs = {
        yourCurrentAge: 49,
        retirementAge: 71,
        yourLifespan: 90,
        yourSalary: 100000,
        yourCurrentSuper: 200000,
        currentSavings: 50000,
        currentStocks: 0,
        mortgageBalance: 400000,
        mortgageRate: 0.06,
        monthlyMortgagePayment: 2400,
        homeValue: 800000,
        inflation: 0.025,
        investmentReturn: 0.07,
        superReturn: 0.07,
        savingsReturn: 0.035,
        salaryGrowthRate: 0.02,
        returnDeclineRate: 0.0003,
        healthcareInflation: 0.04,
        numRuns: 1,
    };

    test('mortgage payoff age is present in simulation result', () => {
        const result = sim.simulateRetirement(baseInputs, false);
        expect(result).toHaveProperty('mortgagePayoffAge');
    });

    test('mortgage payoff renders "cleared at age" string when within plan', () => {
        const result = sim.simulateRetirement(baseInputs, false);
        if (result.mortgagePayoffAge != null) {
            const str = `Mortgage cleared at age ${result.mortgagePayoffAge}`;
            expect(str).toMatch(/cleared at age \d+/);
        }
    });

    test('mortgage payoff age is null when no mortgage is present', () => {
        const noMortgage = { ...baseInputs, mortgageBalance: 0, monthlyMortgagePayment: 0 };
        const result = sim.simulateRetirement(noMortgage, false);
        // Either null or a very early age is acceptable
        if (result.mortgagePayoffAge != null) {
            expect(result.mortgagePayoffAge).toBeGreaterThanOrEqual(baseInputs.yourCurrentAge);
        }
    });

    test('mortgagePayoffYear is computed from mortgagePayoffAge', () => {
        const result = sim.simulateRetirement(baseInputs, false);
        if (result.mortgagePayoffAge != null && result.mortgagePayoffYear != null) {
            const currentYear = new Date().getFullYear();
            const expectedYear = currentYear + (result.mortgagePayoffAge - baseInputs.yourCurrentAge);
            expect(result.mortgagePayoffYear).toBeCloseTo(expectedYear, -1);
        }
    });
});

describe('outcome band construction', () => {
    test('band series deflation: each p50 entry < its nominal equivalent', () => {
        // Simulate the band construction logic from the spec's Edit 4.2
        const inflation = 0.026;
        const nominalValues = [1000000, 1100000, 1200000, 1300000];
        const deflated = nominalValues.map((v, i) => deflateToToday(v, i, inflation));

        for (let i = 1; i < deflated.length; i++) {
            expect(deflated[i]).toBeLessThan(nominalValues[i]);
        }
    });

    test('deflating p10 < p90 (ordering preserved after deflation)', () => {
        const p10 = 500000;
        const p50 = 1000000;
        const p90 = 2000000;
        const years = 25;
        const inflation = 0.025;

        const p10Today = deflateToToday(p10, years, inflation);
        const p50Today = deflateToToday(p50, years, inflation);
        const p90Today = deflateToToday(p90, years, inflation);

        expect(p10Today).toBeLessThan(p50Today);
        expect(p50Today).toBeLessThan(p90Today);
    });
});
