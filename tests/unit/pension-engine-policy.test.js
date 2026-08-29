/**
 * Pipeline B (simulation_engine/pension_engine.js) must honour the same per-projection
 * Age Pension policy as Pipeline A.
 *
 * Previously this engine read module-level constants captured at import time, so:
 *   - inputs.agePensionAge was inert here even after Pipeline A honoured it, meaning the
 *     classic calculator's deep-analysis flows silently used 67 regardless;
 *   - the means-test fields could not be overridden at all;
 *   - the parameters were held flat in nominal terms across a 30-40 year projection.
 *
 * Policy resolution is now shared with Pipeline A through utils.js:resolveAgePensionPolicy,
 * so the two pipelines cannot drift apart again.
 */
import {
    calcSinglePension,
    calcCouplePension,
    calcPensionForYear,
    PENSION_AGE,
} from '../../src/js/simulation_engine/pension_engine.js';
import { runLifeSimulation } from '../../src/js/simulation_engine/life_simulation_engine.js';
import { resolveAgePensionPolicy } from '../../src/js/utils.js';
import { ENHANCED_CONFIG as C } from '../../src/js/config.js';

describe('backwards compatibility', () => {
    test('omitting policy reproduces the legislated defaults exactly', () => {
        // Assets in the taper zone, no income, so the asset test alone decides.
        const withoutPolicy = calcSinglePension(400000, 0, true);
        const withEmptyPolicy = calcSinglePension(400000, 0, true, 0, 0, {});
        expect(withEmptyPolicy).toBe(withoutPolicy);

        const excess = 400000 - C.SINGLE_ASSET_THRESHOLD;
        expect(withoutPolicy).toBeCloseTo(C.SINGLE_PENSION_MAX - (excess / 1000) * 3 * 26, 2);
    });

    test('the exported PENSION_AGE default is unchanged', () => {
        expect(PENSION_AGE).toBe(67);
    });
});

describe('qualifying age is overridable', () => {
    test('a 70-year-old is eligible by default but not when pensionAge is 75', () => {
        expect(calcPensionForYear(70, 200000, 0, false, true).eligible).toBe(true);
        expect(calcPensionForYear(70, 200000, 0, false, true, 0, 0, 0, { pensionAge: 75 }).eligible).toBe(false);
    });

    test('lowering the qualifying age makes an earlier retiree eligible', () => {
        expect(calcPensionForYear(62, 200000, 0, false, true).eligible).toBe(false);
        expect(calcPensionForYear(62, 200000, 0, false, true, 0, 0, 0, { pensionAge: 60 }).eligible).toBe(true);
    });

    test('the couple one-eligible-partner split uses the overridden age', () => {
        // Primary 72, partner 68. With pensionAge 70 the partner is NOT eligible, so only
        // one person is paid and the combined result is halved.
        const bothEligible = calcPensionForYear(72, 300000, 0, true, true, 68, 0, 0, {});
        const oneEligible = calcPensionForYear(72, 300000, 0, true, true, 68, 0, 0, { pensionAge: 70 });
        expect(oneEligible.annualPension).toBeCloseTo(bothEligible.annualPension / 2, 2);
    });
});

describe('means-test parameters are overridable', () => {
    test('assetThreshold override binds for a single', () => {
        const base = calcSinglePension(400000, 0, true);
        const raised = calcSinglePension(400000, 0, true, 0, 0, { assetThreshold: 400000 });
        expect(raised).toBeGreaterThan(base);
        expect(raised).toBe(C.SINGLE_PENSION_MAX);
    });

    test('assetLimit override binds for a single', () => {
        expect(calcSinglePension(400000, 0, true, 0, 0, { assetLimit: 350000 })).toBe(0);
    });

    test('maxPension override binds for a couple', () => {
        const r = calcCouplePension(400000, 0, true, 0, 0, { maxPension: 20000, assetThreshold: 400000 });
        expect(r).toBe(20000);
    });

    test('incomeThreshold override binds', () => {
        // 26 x $1,000/fn of assessable income, well above the free area.
        const tight = calcSinglePension(100000, 26000, true, 0, 0, { incomeThreshold: 10 });
        const loose = calcSinglePension(100000, 26000, true, 0, 0, { incomeThreshold: 5000 });
        expect(loose).toBeGreaterThan(tight);
    });
});

describe('CPI indexation', () => {
    test('indexationFactor lifts the cut-off so an inflated balance stays eligible', () => {
        const assets = C.SINGLE_ASSET_LIMIT + 100000;      // above today's cut-off
        expect(calcSinglePension(assets, 0, true)).toBe(0);
        expect(calcSinglePension(assets, 0, true, 0, 0, { indexationFactor: 2 })).toBeGreaterThan(0);
    });

    test('indexationFactor scales the maximum payment', () => {
        const flat = calcSinglePension(0, 0, true);
        const indexed = calcSinglePension(0, 0, true, 0, 0, { indexationFactor: 1.5 });
        expect(indexed).toBeCloseTo(flat * 1.5, 2);
    });

    test('a factor of 1, zero or undefined all mean "no indexation"', () => {
        const flat = calcSinglePension(400000, 0, true);
        [1, 0, undefined, null, NaN, -3].forEach((factor) => {
            expect(calcSinglePension(400000, 0, true, 0, 0, { indexationFactor: factor })).toBe(flat);
        });
    });
});

describe('both pipelines share one policy resolver', () => {
    test('resolveAgePensionPolicy returns the legislated figures for a single homeowner', () => {
        const p = resolveAgePensionPolicy({ isCouple: false, homeowner: true });
        expect(p.maxRate).toBe(C.SINGLE_PENSION_MAX);
        expect(p.assetThreshold).toBe(C.SINGLE_ASSET_THRESHOLD);
        expect(p.assetLimit).toBe(C.SINGLE_ASSET_LIMIT);
        expect(p.incomeThreshold).toBe(C.SINGLE_INCOME_THRESHOLD);
        expect(p.pensionAge).toBe(67);
    });

    test('non-homeowner and couple variants select the right defaults', () => {
        expect(resolveAgePensionPolicy({ homeowner: false }).assetThreshold)
            .toBe(C.SINGLE_ASSET_THRESHOLD_NON_HOMEOWNER);
        expect(resolveAgePensionPolicy({ isCouple: true, homeowner: true }).assetThreshold)
            .toBe(C.COUPLE_ASSET_THRESHOLD);
        expect(resolveAgePensionPolicy({ isCouple: true, homeowner: false }).assetLimit)
            .toBe(C.COUPLE_ASSET_LIMIT_NON_HOMEOWNER);
    });
});

describe('end-to-end through runLifeSimulation (the classic page deep-analysis path)', () => {
    // Modest means so the asset test never blocks the pension - only the age gate can.
    const modest = {
        yourCurrentAge: 60, retirementAge: 62, yourLifespan: 92,
        yourSalary: 65000, yourCurrentSuper: 150000, currentSavings: 20000,
        asfaComfortable: 45000,
        inflation: 0.026, investmentReturn: 0.056, superReturn: 0.075,
        salaryGrowthRate: 0.015, enableShocks: false,
    };
    // Assets stay high so the means-test parameters actually bind.
    const wealthy = {
        yourCurrentAge: 66, retirementAge: 67, yourLifespan: 80,
        yourSalary: 90000, yourCurrentSuper: 500000, currentSavings: 100000,
        asfaComfortable: 40000,
        inflation: 0.026, investmentReturn: 0.056, superReturn: 0.075,
        salaryGrowthRate: 0.015, enableShocks: false,
    };
    const firstPaid = (inputs) => (runLifeSimulation(inputs).timeline || []).find((r) => (r.pensionIncome || 0) > 0);
    const paidYears = (inputs) => (runLifeSimulation(inputs).timeline || []).filter((r) => (r.pensionIncome || 0) > 0).length;

    test('the pension starts at 67 by default and at 70 when overridden', () => {
        expect(firstPaid(modest).age).toBe(67);
        expect(firstPaid({ ...modest, agePensionAge: 70 }).age).toBe(70);
    });

    test('no pension is paid before the qualifying age', () => {
        const early = (runLifeSimulation(modest).timeline || []).filter((r) => r.age < 67 && (r.pensionIncome || 0) > 0);
        expect(early).toEqual([]);
    });

    test('the payment is indexed at the CPI assumption', () => {
        const paid = (runLifeSimulation(modest).timeline || []).filter((r) => (r.pensionIncome || 0) > 0);
        const first = paid[0];
        const last = paid[paid.length - 1];
        const implied = Math.pow(last.pensionIncome / first.pensionIncome, 1 / (last.age - first.age)) - 1;
        expect(implied).toBeGreaterThan(0.020);
        expect(implied).toBeLessThan(0.032);
    });

    test('assetLimit override reaches the engine', () => {
        expect(paidYears(wealthy)).toBeGreaterThan(0);
        expect(paidYears({ ...wealthy, pensionAssetLimit: 1000 })).toBe(0);
    });

    test('assetThreshold and agePensionMax overrides reach the engine', () => {
        const base = firstPaid(wealthy).pensionIncome;
        const raised = firstPaid({ ...wealthy, pensionAssetThreshold: 5000000 }).pensionIncome;
        expect(raised).toBeGreaterThan(base);

        const capped = firstPaid({ ...wealthy, pensionAssetThreshold: 5000000, agePensionMax: 9000 }).pensionIncome;
        expect(capped).toBeLessThan(raised);
    });
});

describe('Pipeline A and Pipeline B agree on the same means test', () => {
    // Pipeline A's single path goes through utils.js:calculateAgePension; Pipeline B's
    // goes through pension_engine.js:calcSinglePension. They are separate implementations
    // of the same legislated test, so they must agree for identical inputs - otherwise the
    // classic calculator's deep analysis contradicts its own projection.
    const { calculateAgePension } = require('../../src/js/utils.js');

    const pipelineA = (assets, income, policy = {}) => {
        const p = resolveAgePensionPolicy({ ...policy, isCouple: false, homeowner: true });
        return calculateAgePension(assets, income, false, p.maxRate, p.assetThreshold, p.assetLimit, p.incomeThreshold);
    };
    const pipelineB = (assets, income, policy = {}) => calcSinglePension(assets, income, true, 0, 0, policy);

    test.each([
        ['full pension, no income', 100000, 0],
        ['asset test binding', 400000, 0],
        ['just under the cut-off', C.SINGLE_ASSET_LIMIT - 1000, 0],
        ['above the cut-off', C.SINGLE_ASSET_LIMIT + 50000, 0],
        ['income test binding', 100000, 40000],
        ['both tests binding', 450000, 30000],
    ])('%s', (_label, assets, income) => {
        expect(pipelineB(assets, income)).toBeCloseTo(pipelineA(assets, income), 6);
    });

    test('they agree under an indexation factor too', () => {
        const policy = { indexationFactor: 1.8 };
        expect(pipelineB(600000, 20000, policy)).toBeCloseTo(pipelineA(600000, 20000, policy), 6);
    });

    test('they agree under a means-test override', () => {
        const policy = { assetThreshold: 500000, maxPension: 25000 };
        expect(pipelineB(520000, 0, policy)).toBeCloseTo(pipelineA(520000, 0, policy), 6);
    });
});
