/**
 * tests/unit/reverse-deep-analysis.test.js
 *
 * Unit tests for the deep-analysis module.
 * Mocks RetirementSimulator for deterministic results.
 */

import {
    calculateRetirementAgeSalaryCurve,
    calculateRequiredCurrentValues,
    calculateSalaryReductionTolerance,
    calculateOptimalOverseasAge,
} from '../../src/js/reverse-deep-analysis.js';

// ---------------------------------------------------------------------------
// Mock RetirementSimulator
// ---------------------------------------------------------------------------

jest.mock('../../src/js/simulator.js', () => {
    class RetirementSimulator {
        constructor(config) { this.config = config; }
        simulateRetirement(inputs) {
            const yearsToRetire = Math.max(1, (inputs.retirementAge || 67) - (inputs.yourCurrentAge || 50));
            const annualSaving = (inputs.yourSalary || 0) * 0.15 +
                (inputs.yourAdditionalSuperContribution || 0) +
                (inputs.monthlyStockContribution || 0) * 12;
            const growthFactor = Math.pow(1.06, yearsToRetire);
            const totalFinancialAssets =
                ((inputs.yourCurrentSuper || 0) + (inputs.currentSavings || 0) +
                 (inputs.homeValue || 0) * 0.5) * growthFactor +
                annualSaving * ((growthFactor - 1) / 0.06);
            return {
                finalBalance: totalFinancialAssets * 0.5,
                totalFinancialAssets,
                yearlyData: [],
                balances: [],
            };
        }
    }
    return { RetirementSimulator };
});

jest.mock('../../src/js/config.js', () => ({
    ENHANCED_CONFIG: {
        SUPER_GUARANTEE_RATE: 0.12,
        CONCESSIONAL_CAP: 30000,
        SINGLE_PENSION_MAX: 31223,
        COUPLE_PENSION_MAX: 47070,
        INFLATION_RATE: 0.026,
    }
}));

// ---------------------------------------------------------------------------
// Shared test data
// ---------------------------------------------------------------------------

const { RetirementSimulator } = require('../../src/js/simulator.js');
const { ENHANCED_CONFIG } = require('../../src/js/config.js');
const simulator = new RetirementSimulator(ENHANCED_CONFIG);

const baseInputs = {
    yourCurrentAge: 50,
    retirementAge: 65,
    yourSalary: 120000,
    yourCurrentSuper: 300000,
    currentSavings: 80000,
    homeValue: 700000,
    yourAdditionalSuperContribution: 0,
    monthlyStockContribution: 0,
    employerSuperContributionRate: 0.12,
    inflation: 0.026,
    yourLifespan: 90,
};

// ---------------------------------------------------------------------------
// 1. calculateRetirementAgeSalaryCurve
// ---------------------------------------------------------------------------

describe('calculateRetirementAgeSalaryCurve', () => {
    test('returns array of curve points', async () => {
        const target = { targetAnnualIncomeToday: 50000 };
        const curve = await calculateRetirementAgeSalaryCurve(simulator, baseInputs, target);
        expect(Array.isArray(curve)).toBe(true);
        expect(curve.length).toBeGreaterThan(0);
        curve.forEach(pt => {
            expect(pt).toHaveProperty('retirementAge');
            expect(pt).toHaveProperty('requiredSalary');
            expect(pt).toHaveProperty('feasible');
        });
    });

    test('starts from currentAge + 1', async () => {
        const target = { targetAnnualIncomeToday: 50000 };
        const curve = await calculateRetirementAgeSalaryCurve(simulator, baseInputs, target);
        expect(curve[0].retirementAge).toBe(baseInputs.yourCurrentAge + 1);
    });

    test('respects custom swr from target', async () => {
        const lowSwrTarget = { targetAnnualIncomeToday: 50000, swr: 0.03 };
        const curve = await calculateRetirementAgeSalaryCurve(simulator, baseInputs, lowSwrTarget);
        expect(Array.isArray(curve)).toBe(true);
        expect(curve.length).toBeGreaterThan(0);
    });

    test('ends at age 75', async () => {
        const target = { targetAnnualIncomeToday: 50000 };
        const curve = await calculateRetirementAgeSalaryCurve(simulator, baseInputs, target);
        expect(curve[curve.length - 1].retirementAge).toBe(75);
    });
});

// ---------------------------------------------------------------------------
// 2. calculateRequiredCurrentValues
// ---------------------------------------------------------------------------

describe('calculateRequiredCurrentValues', () => {
    test('returns homeValue and investmentBalance objects', async () => {
        const target = { targetAnnualIncomeToday: 50000 };
        const result = await calculateRequiredCurrentValues(simulator, baseInputs, target);
        expect(result).toHaveProperty('homeValue');
        expect(result).toHaveProperty('investmentBalance');
        expect(result.homeValue).toHaveProperty('current');
        expect(result.homeValue).toHaveProperty('required');
        expect(result.homeValue).toHaveProperty('feasible');
        expect(result.investmentBalance).toHaveProperty('current');
        expect(result.investmentBalance).toHaveProperty('required');
        expect(result.investmentBalance).toHaveProperty('feasible');
    });

    test('current values match inputs', async () => {
        const target = { targetAnnualIncomeToday: 50000 };
        const result = await calculateRequiredCurrentValues(simulator, baseInputs, target);
        expect(result.homeValue.current).toBe(baseInputs.homeValue);
        expect(result.investmentBalance.current).toBe(baseInputs.currentSavings);
    });

    test('required values are >= current values when feasible', async () => {
        const target = { targetAnnualIncomeToday: 50000 };
        const result = await calculateRequiredCurrentValues(simulator, baseInputs, target);
        if (result.homeValue.feasible) {
            expect(result.homeValue.required).toBeGreaterThanOrEqual(result.homeValue.current);
        }
        if (result.investmentBalance.feasible) {
            expect(result.investmentBalance.required).toBeGreaterThanOrEqual(result.investmentBalance.current);
        }
    });
});

// ---------------------------------------------------------------------------
// 3. calculateSalaryReductionTolerance
// ---------------------------------------------------------------------------

describe('calculateSalaryReductionTolerance', () => {
    test('returns structured response', async () => {
        const target = { targetAnnualIncomeToday: 50000 };
        const result = await calculateSalaryReductionTolerance(simulator, baseInputs, target);
        expect(result).toHaveProperty('currentSalary');
        expect(result).toHaveProperty('minRequiredSalary');
        expect(result).toHaveProperty('feasible');
        expect(result).toHaveProperty('maxReduction');
        expect(result).toHaveProperty('reductionPercent');
    });

    test('currentSalary matches input', async () => {
        const target = { targetAnnualIncomeToday: 50000 };
        const result = await calculateSalaryReductionTolerance(simulator, baseInputs, target);
        expect(result.currentSalary).toBe(baseInputs.yourSalary);
    });

    test('returns infeasible when salary is zero', async () => {
        const zeroSalaryInputs = { ...baseInputs, yourSalary: 0 };
        const target = { targetAnnualIncomeToday: 50000 };
        const result = await calculateSalaryReductionTolerance(simulator, zeroSalaryInputs, target);
        expect(result.feasible).toBe(false);
        expect(result.minRequiredSalary).toBeNull();
    });

    test('respects custom swr from target', async () => {
        const target = { targetAnnualIncomeToday: 50000, swr: 0.03 };
        const result = await calculateSalaryReductionTolerance(simulator, baseInputs, target);
        expect(result).toHaveProperty('feasible');
    });
});

// ---------------------------------------------------------------------------
// 4. calculateOptimalOverseasAge
// ---------------------------------------------------------------------------

describe('calculateOptimalOverseasAge', () => {
    test('returns structured response', async () => {
        const target = { targetAnnualIncomeToday: 50000 };
        const result = await calculateOptimalOverseasAge(simulator, baseInputs, target);
        expect(result).toHaveProperty('optimalAge');
        expect(result).toHaveProperty('feasible');
        expect(result).toHaveProperty('worksWithCurrentSalary');
        expect(result).toHaveProperty('analysis');
        expect(Array.isArray(result.analysis)).toBe(true);
    });

    test('analysis points have required fields', async () => {
        const target = { targetAnnualIncomeToday: 50000 };
        const result = await calculateOptimalOverseasAge(simulator, baseInputs, target);
        result.analysis.forEach(pt => {
            expect(pt).toHaveProperty('moveAge');
            expect(pt).toHaveProperty('requiredSalary');
            expect(pt).toHaveProperty('feasible');
            expect(pt).toHaveProperty('worksWithCurrentSalary');
            expect(pt).toHaveProperty('annualTargetOverseas');
        });
    });

    test('starts from max(55, currentAge + 1)', async () => {
        const target = { targetAnnualIncomeToday: 50000 };
        const result = await calculateOptimalOverseasAge(simulator, baseInputs, target);
        const expectedStart = Math.max(55, baseInputs.yourCurrentAge + 1);
        expect(result.analysis[0].moveAge).toBe(expectedStart);
    });

    test('analysis ends at age 75', async () => {
        const target = { targetAnnualIncomeToday: 50000 };
        const result = await calculateOptimalOverseasAge(simulator, baseInputs, target);
        const last = result.analysis[result.analysis.length - 1];
        expect(last.moveAge).toBe(75);
    });

    test('applies costFactor to target income', async () => {
        const target = { targetAnnualIncomeToday: 80000 };
        const result = await calculateOptimalOverseasAge(simulator, baseInputs, target, 0.70);
        result.analysis.forEach(pt => {
            expect(pt.annualTargetOverseas).toBe(80000 * 0.70);
        });
    });

    test('respects custom swr from target', async () => {
        const target = { targetAnnualIncomeToday: 50000, swr: 0.03 };
        const result = await calculateOptimalOverseasAge(simulator, baseInputs, target);
        expect(result).toHaveProperty('feasible');
    });
});
