/**
 * Age Pension model correctness.
 *
 * Covers three defects that survived because nothing exercised these paths:
 *
 *   1. No age gate on the single branch — eligibility was decided by the asset test alone,
 *      so a modest single retiring at 60 was paid the FULL Age Pension from age 60.
 *   2. `inputs.agePensionAge` was inert — the qualifying age was hardcoded to 67.
 *   3. calculateAgePensionForCouple accepted a `config` argument and ignored it, so the
 *      user's means-test inputs did nothing for couples while working for singles.
 *
 * Plus CPI indexation: every pension figure is legislated in today's dollars and indexed
 * by Services Australia 2-3 times a year, but the projection runs 30-40 years in nominal
 * dollars. Holding the parameters flat tested inflated balances against today's limits.
 */
import fs from 'fs';
import path from 'path';

const { calculateAgePensionForCouple, calculateDeemedIncome } = require('../../src/js/utils.js');
const { ENHANCED_CONFIG: C } = require('../../src/js/config.js');

const html = fs.readFileSync(path.resolve(__dirname, '../../src/retirement.html'), 'utf8');
document.body.innerHTML = (html.match(/<body[^>]*>([\s\S]*)<\/body>/i) || [, html])[1];
const v3 = require('../../src/js/retirement-v3.js');

const set = (id, v) => {
    const node = document.getElementById(id);
    if (!node) throw new Error(`missing #${id}`);
    node.value = String(v);
    node.dispatchEvent(new Event('input', { bubbles: true }));
};
const household = (h) => {
    const seg = document.querySelector('[data-bind="household"]');
    seg.dataset.value = h;
    document.dispatchEvent(new Event('change', { bubbles: true }));
};
const years = (state) => state.simulation.yearlyData || [];

/** A single on modest means who retires at 60 — nothing but an age gate stops the pension. */
function modestEarlyRetiree(overrides = {}) {
    household('single');
    set('age', 58); set('retireAge', 60); set('lifespan', 95);
    set('salary', 70000); set('superBal', 180000); set('cash', 20000); set('stocks', 0);
    set('desiredIncome', 45000); set('homeValue', 700000); set('mortgage', 0);
    set('inflation', overrides.inflation ?? 2.6);
    set('agePensionAge', overrides.agePensionAge ?? 67);
    set('pensionAnnualSingle', C.SINGLE_PENSION_MAX);
    set('pensionAssetThreshold', C.SINGLE_ASSET_THRESHOLD);
    set('pensionAssetCutoff', C.SINGLE_ASSET_LIMIT);
    return v3.computeBaseState();
}

describe('age gate', () => {
    test('no Age Pension is paid before the qualifying age', () => {
        const rows = years(modestEarlyRetiree());
        const early = rows.filter((r) => r.age < 67 && (r.pensionIncome || 0) > 0);
        expect(early).toEqual([]);
    });

    test('the pension starts exactly at the qualifying age', () => {
        const rows = years(modestEarlyRetiree());
        expect(rows.find((r) => (r.pensionIncome || 0) > 0).age).toBe(67);
    });

    test('agePensionAge is honoured — 70 delays the first payment by three years', () => {
        const at67 = years(modestEarlyRetiree({ agePensionAge: 67 }));
        const at70 = years(modestEarlyRetiree({ agePensionAge: 70 }));
        expect(at67.find((r) => (r.pensionIncome || 0) > 0).age).toBe(67);
        expect(at70.find((r) => (r.pensionIncome || 0) > 0).age).toBe(70);
    });
});

describe('CPI indexation of pension parameters', () => {
    test('the payment grows at the CPI assumption across the projection', () => {
        const paid = years(modestEarlyRetiree({ inflation: 2.6 })).filter((r) => (r.pensionIncome || 0) > 0);
        const first = paid[0];
        const last = paid[paid.length - 1];
        const implied = Math.pow(last.pensionIncome / first.pensionIncome, 1 / (last.age - first.age)) - 1;
        // Full-rate years track CPI exactly; allow a band for any taper years at the start.
        expect(implied).toBeGreaterThan(0.020);
        expect(implied).toBeLessThan(0.032);
    });

    test('a higher CPI assumption produces a higher nominal pension later in life', () => {
        const low = years(modestEarlyRetiree({ inflation: 2.0 })).filter((r) => (r.pensionIncome || 0) > 0);
        const high = years(modestEarlyRetiree({ inflation: 4.0 })).filter((r) => (r.pensionIncome || 0) > 0);
        expect(high[high.length - 1].pensionIncome).toBeGreaterThan(low[low.length - 1].pensionIncome);
    });

    test('deeming thresholds accept an indexation factor', () => {
        const assets = 200000;
        const flat = calculateDeemedIncome(assets, false, 1);
        const indexed = calculateDeemedIncome(assets, false, 2);
        // A higher threshold moves more of the balance into the lower deeming rate.
        expect(indexed).toBeLessThan(flat);
    });
});

describe('couple means-test parameters are honoured', () => {
    // financialAssets: 0 removes deemed income so the ASSET test alone decides the outcome.
    const person = (assets) => ({ age: 70, super: assets / 2, investments: 0, salary: 0, otherIncome: 0, financialAssets: 0 });
    const couple = (assets, config) => calculateAgePensionForCouple(person(assets), person(assets), true, config);

    test('defaults reproduce the legislated asset taper', () => {
        const excess = 700000 - C.COUPLE_ASSET_THRESHOLD;
        const expected = Math.round(C.COUPLE_PENSION_MAX - (excess / 1000) * 3 * C.FORTNIGHTS_IN_YEAR);
        expect(couple(700000, {}).currentPension.annual).toBe(expected);
    });

    test('assetThreshold override binds', () => {
        expect(couple(700000, { assetThreshold: 700000 }).currentPension.annual).toBe(C.COUPLE_PENSION_MAX);
    });

    test('assetLimit override binds', () => {
        expect(couple(700000, { assetLimit: 600000 }).currentPension.annual).toBe(0);
    });

    test('maxPension override binds', () => {
        expect(couple(700000, { maxPension: 20000, assetThreshold: 700000 }).currentPension.annual).toBe(20000);
    });

    test('pensionAge override gates eligibility', () => {
        const result = couple(700000, { pensionAge: 75 });
        expect(result.eligible).toBe(false);
        expect(result.reason).toContain('75');
    });

    test('indexationFactor scales every dollar figure', () => {
        expect(couple(1400000, {}).currentPension.annual).toBe(0);                 // over the cut-off
        expect(couple(1400000, { indexationFactor: 2 }).currentPension.annual).toBeGreaterThan(0);
    });

    test('non-homeowner thresholds are still selected correctly', () => {
        const homeowner = calculateAgePensionForCouple(person(800000), person(800000), true, {}).currentPension.annual;
        const renter = calculateAgePensionForCouple(person(800000), person(800000), false, {}).currentPension.annual;
        expect(renter).toBeGreaterThan(homeowner);
    });

    test('passing no config keeps the previous legislated behaviour', () => {
        expect(couple(700000, {}).currentPension.annual).toBe(couple(700000, undefined).currentPension.annual);
    });
});
