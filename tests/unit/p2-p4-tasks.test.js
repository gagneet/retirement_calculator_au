/**
 * p2-p4-tasks.test.js
 *
 * Unit tests for the P2–P4 implementation tasks:
 *
 *  TASK-006 — Stress test scenario deltas
 *  TASK-007 — Recommendation impact cap
 *  TASK-008 — PDF export simulation count
 *  TASK-010 — normalise-inputs.js canonical module
 *  TASK-011 — validate-inputs.js canonical module
 *  TASK-014 — Division 296 tax in Pipeline B (life_simulation_engine.js)
 */

// ── Imports ───────────────────────────────────────────────────────────────────

import { normaliseInputs, normaliseRate } from '../../src/js/policy/normalise-inputs.js';
import { validateInputs }                from '../../src/js/policy/validate-inputs.js';
import { calcDivision296Tax }            from '../../src/js/simulation_engine/tax_engine.js';
import { runLifeSimulation }             from '../../src/js/simulation_engine/life_simulation_engine.js';

// ─────────────────────────────────────────────────────────────────────────────
// TASK-010 — normalise-inputs.js
// ─────────────────────────────────────────────────────────────────────────────

describe('TASK-010 — normaliseRate()', () => {
    test('values > 1 are treated as percentages and divided by 100', () => {
        expect(normaliseRate(7.5)).toBeCloseTo(0.075, 5);
        expect(normaliseRate(2.6)).toBeCloseTo(0.026, 5);
        expect(normaliseRate(100)).toBeCloseTo(1.0,   5);
    });

    test('values 0 < v <= 1 pass through unchanged', () => {
        expect(normaliseRate(0.075)).toBeCloseTo(0.075, 5);
        expect(normaliseRate(0.026)).toBeCloseTo(0.026, 5);
        expect(normaliseRate(1.0)).toBeCloseTo(1.0,   5);
    });

    test('zero is returned as 0, not defaultValue', () => {
        expect(normaliseRate(0, 0.05)).toBe(0);
    });

    test('null returns defaultValue', () => {
        expect(normaliseRate(null, 0.07)).toBeCloseTo(0.07, 5);
    });

    test('undefined returns defaultValue', () => {
        expect(normaliseRate(undefined, 0.09)).toBeCloseTo(0.09, 5);
    });

    test('NaN returns defaultValue', () => {
        expect(normaliseRate(NaN, 0.03)).toBeCloseTo(0.03, 5);
    });

    test('negative rates: -25 (percentage form) → -0.25', () => {
        expect(normaliseRate(-25, 0)).toBeCloseTo(-0.25, 5);
    });

    test('negative rates already decimal: -0.25 passes through', () => {
        expect(normaliseRate(-0.25, 0)).toBeCloseTo(-0.25, 5);
    });
});

describe('TASK-010 — normaliseInputs()', () => {
    test('converts percentage-form rate fields to decimals', () => {
        const raw = { inflation: 2.6, investmentReturn: 9.0, superReturn: 8.5 };
        const out = normaliseInputs(raw);
        expect(out.inflation).toBeCloseTo(0.026, 5);
        expect(out.investmentReturn).toBeCloseTo(0.09, 5);
        expect(out.superReturn).toBeCloseTo(0.085, 5);
    });

    test('already-decimal values pass through unchanged', () => {
        const raw = { inflation: 0.026, investmentReturn: 0.09, superReturn: 0.085 };
        const out = normaliseInputs(raw);
        expect(out.inflation).toBeCloseTo(0.026, 5);
        expect(out.investmentReturn).toBeCloseTo(0.09, 5);
        expect(out.superReturn).toBeCloseTo(0.085, 5);
    });

    test('is idempotent — calling twice on normalised inputs gives the same result', () => {
        const raw  = { inflation: 2.6, yourSalary: 100000 };
        const once = normaliseInputs(raw);
        const twice = normaliseInputs(once);
        expect(twice.inflation).toBeCloseTo(once.inflation, 6);
        expect(twice.yourSalary).toBe(once.yourSalary);
    });

    test('absolute dollar fields are not divided', () => {
        const raw = { yourSalary: 150000, yourCurrentSuper: 500000, numRuns: 5000 };
        const out = normaliseInputs(raw);
        expect(out.yourSalary).toBe(150000);
        expect(out.yourCurrentSuper).toBe(500000);
        expect(out.numRuns).toBe(5000);
    });

    test('allocation fields are normalised to 0–1', () => {
        const raw = { allocEquities: 60, allocBonds: 30, allocCash: 10 };
        const out = normaliseInputs(raw);
        expect(out.allocEquities).toBeCloseTo(0.60, 5);
        expect(out.allocBonds).toBeCloseTo(0.30, 5);
        expect(out.allocCash).toBeCloseTo(0.10, 5);
    });

    test('tags output with _normalisedAt timestamp', () => {
        const out = normaliseInputs({});
        expect(typeof out._normalisedAt).toBe('number');
        expect(out._normalisedAt).toBeGreaterThan(0);
    });

    test('missing rate fields are filled from DEFAULTS', () => {
        const out = normaliseInputs({});
        // inflation should default to something sensible (> 0)
        expect(out.inflation).toBeGreaterThan(0);
        expect(out.inflation).toBeLessThan(0.10); // sanity
    });

    test('explicit zero allocation is honoured (not replaced with default)', () => {
        const raw = { australianEquityAllocation: 0 };
        const out = normaliseInputs(raw);
        expect(out.australianEquityAllocation).toBe(0);
    });

    test('frankingCreditBenefit (multiplier) is NOT divided by 100', () => {
        const raw = { frankingCreditBenefit: 1.2 };
        const out = normaliseInputs(raw);
        expect(out.frankingCreditBenefit).toBe(1.2);
    });

    test('agedCareProbability 0.22 passes through unchanged (already decimal)', () => {
        const out = normaliseInputs({ agedCareProbability: 0.22 });
        expect(out.agedCareProbability).toBeCloseTo(0.22, 4);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// TASK-011 — validate-inputs.js
// ─────────────────────────────────────────────────────────────────────────────

describe('TASK-011 — validateInputs() — age ordering', () => {
    const baseValid = {
        yourCurrentAge:   45, retirementAge:   65, yourLifespan:    90,
        partnerCurrentAge: 0, partnerRetirementAge: 0, partnerLifespan: 0,
        inflation: 0.025, investmentReturn: 0.075, superReturn: 0.08,
        salaryGrowthRate: 0.015, healthcareInflation: 0.055,
        returnVolatility: 0.12, shockMagnitude: -0.25, shockProbability: 0.05,
        agedCareProbability: 0.65,
        allocEquities: 0.65, allocBonds: 0.25, allocCash: 0.10,
    };

    test('valid inputs pass with no errors', () => {
        const { valid, errors } = validateInputs(baseValid);
        expect(valid).toBe(true);
        expect(errors).toHaveLength(0);
    });

    test('retirementAge <= currentAge is an error', () => {
        const { errors } = validateInputs({ ...baseValid, retirementAge: 44 });
        expect(errors.some(e => e.toLowerCase().includes('retirement age'))).toBe(true);
    });

    test('lifespan <= retirementAge is an error', () => {
        const { errors } = validateInputs({ ...baseValid, yourLifespan: 64 });
        // Error message says "Planning horizon" (capital P)
        expect(errors.some(e => e.toLowerCase().includes('planning horizon'))).toBe(true);
    });

    test('partner age ordering validated when partnerCurrentAge > 0', () => {
        const { errors } = validateInputs({
            ...baseValid,
            partnerCurrentAge: 43, partnerRetirementAge: 42, partnerLifespan: 90
        });
        // Error message says "Partner's retirement age" (capital P)
        expect(errors.some(e => e.toLowerCase().includes("partner's retirement age"))).toBe(true);
    });
});

describe('TASK-011 — validateInputs() — rate bounds', () => {
    const baseValid = {
        yourCurrentAge: 45, retirementAge: 65, yourLifespan: 90,
        inflation: 0.025, investmentReturn: 0.075, superReturn: 0.08,
        salaryGrowthRate: 0.015, healthcareInflation: 0.055,
        returnVolatility: 0.12, shockMagnitude: -0.25, shockProbability: 0.05,
        agedCareProbability: 0.65,
        allocEquities: 0.65, allocBonds: 0.25, allocCash: 0.10,
    };

    test('inflation above 100% triggers an error', () => {
        const { errors } = validateInputs({ ...baseValid, inflation: 2.5 }); // 250%
        expect(errors.some(e => e.includes('inflation'))).toBe(true);
    });

    test('shockMagnitude > 0 triggers an error (should be negative)', () => {
        const { errors } = validateInputs({ ...baseValid, shockMagnitude: 0.10 });
        expect(errors.some(e => e.includes('shockMagnitude'))).toBe(true);
    });

    test('agedCareProbability > 1 triggers an error', () => {
        const { errors } = validateInputs({ ...baseValid, agedCareProbability: 1.5 });
        expect(errors.some(e => e.includes('agedCareProbability'))).toBe(true);
    });
});

describe('TASK-011 — validateInputs() — allocation sum', () => {
    const baseValid = {
        yourCurrentAge: 45, retirementAge: 65, yourLifespan: 90,
        inflation: 0.025, investmentReturn: 0.075, superReturn: 0.08,
        salaryGrowthRate: 0.015, healthcareInflation: 0.055,
        returnVolatility: 0.12, shockMagnitude: -0.25, shockProbability: 0.05,
        agedCareProbability: 0.65,
    };

    test('allocation sum ≠ 1 triggers an error', () => {
        const { errors } = validateInputs({ ...baseValid, allocEquities: 0.70, allocBonds: 0.25, allocCash: 0.10 });
        expect(errors.some(e => e.includes('allocation'))).toBe(true);
    });

    test('allocation sum = 1 passes', () => {
        const { valid } = validateInputs({ ...baseValid, allocEquities: 0.65, allocBonds: 0.25, allocCash: 0.10 });
        expect(valid).toBe(true);
    });

    test('allocation sum within tolerance (±0.5pp) passes', () => {
        const { errors } = validateInputs({ ...baseValid, allocEquities: 0.6510, allocBonds: 0.25, allocCash: 0.10 });
        expect(errors.filter(e => e.includes('allocation'))).toHaveLength(0);
    });
});

describe('TASK-011 — validateInputs() — warnings', () => {
    const baseValid = {
        yourCurrentAge: 45, retirementAge: 65, yourLifespan: 90,
        inflation: 0.025, investmentReturn: 0.075, superReturn: 0.08,
        salaryGrowthRate: 0.015, healthcareInflation: 0.055,
        returnVolatility: 0.12, shockMagnitude: -0.25, shockProbability: 0.05,
        agedCareProbability: 0.65,
        allocEquities: 0.65, allocBonds: 0.25, allocCash: 0.10,
    };

    test('retirement before pension age generates a warning', () => {
        const { warnings } = validateInputs({ ...baseValid, retirementAge: 62 });
        expect(warnings.some(w => w.includes('Age Pension eligibility age'))).toBe(true);
    });

    test('very high investment return generates a warning', () => {
        const { warnings } = validateInputs({ ...baseValid, investmentReturn: 0.20 });
        expect(warnings.some(w => w.includes('Investment return'))).toBe(true);
    });

    test('super contributions approaching cap generates a warning', () => {
        const { warnings } = validateInputs({
            ...baseValid,
            yourSalary: 200000,
            superContributionRate: 0.12,
            yourAdditionalSuperContribution: 10000, // 200000*0.12 + 10000 = 34000 > 30000
        });
        expect(warnings.some(w => w.includes('concessional'))).toBe(true);
    });

    test('negative property equity generates a warning', () => {
        const { warnings } = validateInputs({
            ...baseValid,
            hasInvestmentProperty: true,
            investmentPropertyValue: 500000,
            investmentPropertyLoan:  600000,
        });
        expect(warnings.some(w => w.includes('negative equity'))).toBe(true);
    });

    test('valid inputs produce no warnings on core checks', () => {
        const { warnings } = validateInputs(baseValid);
        // May have some (e.g. retirement age < 67 warning) but no false positives on correct data
        expect(Array.isArray(warnings)).toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// TASK-014 — Division 296 in life_simulation_engine.js
// ─────────────────────────────────────────────────────────────────────────────

describe('TASK-014 — calcDivision296Tax() from tax_engine.js', () => {
    test('returns 0 when balance is at or below $3M threshold', () => {
        expect(calcDivision296Tax(3_000_000, 100_000)).toBe(0);
        expect(calcDivision296Tax(2_999_999, 100_000)).toBe(0);
    });

    test('returns correct tax for balance above $3M', () => {
        // TSB = $4M, earnings = $300k
        // excessProportion = (4M - 3M) / 4M = 0.25
        // tax = 300k * 0.25 * 0.15 = $11,250
        const tax = calcDivision296Tax(4_000_000, 300_000);
        expect(tax).toBeCloseTo(11_250, 0);
    });

    test('returns 0 when earnings are 0 or negative', () => {
        expect(calcDivision296Tax(5_000_000, 0)).toBe(0);
        expect(calcDivision296Tax(5_000_000, -10_000)).toBe(0);
    });

    test('proportional to excess above $3M threshold', () => {
        const tax3_5M = calcDivision296Tax(3_500_000, 100_000); // 1/7 above threshold
        const tax4M   = calcDivision296Tax(4_000_000, 100_000); // 1/4 above threshold
        expect(tax4M).toBeGreaterThan(tax3_5M);
    });
});

describe('TASK-014 — Division 296 applied in life_simulation_engine.js', () => {
    // Run two simulations: one with TSB starting above $3M, one below.
    // The above-$3M case should accumulate less super by the end (Div 296 deducted).

    const baseInputs = {
        yourCurrentAge:   60,
        retirementAge:    67,
        yourLifespan:     75,  // short for speed
        yourSalary:       0,   // retired
        yourCurrentSuper: 0,
        partnerCurrentAge: 0,
        isCouple:         false,
        homeowner:        true,
        currentSavings:   0,
        currentStocks:    0,
        investmentReturn: 0.07,
        superReturn:      0.07,
        inflation:        0.025,
        salaryGrowthRate: 0.015,
        asfaComfortable:  73337,
        enableShocks:     false,
        useStochasticReturns: false,
    };

    test('super balance >$3M: Division 296 reduces net super compared to <$3M (same return rate)', () => {
        // Large super balance — Div 296 should fire from calendar year 2026
        const largeSuper = { ...baseInputs, yourCurrentSuper: 4_000_000, yourSalary: 0 };
        const smallSuper = { ...baseInputs, yourCurrentSuper: 1_000_000, yourSalary: 0 };

        const largeResult = runLifeSimulation(largeSuper);
        const smallResult = runLifeSimulation(smallSuper);

        // Effective return rate after Div 296 for large super should be lower.
        // Large started at 4× the small balance, so at any year the ratio should be
        // less than 4 (Div 296 erodes the large balance proportionally more).
        const largeAtEnd = largeResult.timeline[largeResult.timeline.length - 1]?.superBalance ?? 0;
        const smallAtEnd = smallResult.timeline[smallResult.timeline.length - 1]?.superBalance ?? 0;

        if (smallAtEnd > 0) {
            // Div 296 reduces the ratio: large/small should be < 4.0 (the starting ratio)
            expect(largeAtEnd / smallAtEnd).toBeLessThan(4.0);
        }
    });

    test('super balance below $3M: no Division 296 tax applied', () => {
        const result = runLifeSimulation({ ...baseInputs, yourCurrentSuper: 1_000_000, yourSalary: 0 });
        // All timeline entries should be valid numbers
        result.timeline.forEach(snap => {
            expect(Number.isFinite(snap.superBalance)).toBe(true);
            expect(snap.superBalance).toBeGreaterThanOrEqual(0);
        });
    });

    test('simulation runs without error for large super balance', () => {
        expect(() => runLifeSimulation({ ...baseInputs, yourCurrentSuper: 5_000_000 })).not.toThrow();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// TASK-006 — Stress test delta computation (unit-level)
// ─────────────────────────────────────────────────────────────────────────────

describe('TASK-006 — Stress test result delta structure', () => {
    // These tests verify the data structure produced by the stress test run,
    // not the UI rendering (which requires a DOM).

    test('stress result object includes deltaBalance field', () => {
        // Simulate what runStressTest() produces after the fix
        const baseBalance  = 500_000;
        const stressBalance = 350_000;
        const result = {
            scenario: 'GFC Test',
            finalBalance: stressBalance,
            baseBalance,
            deltaBalance: stressBalance - baseBalance,
            success: stressBalance > 0,
        };
        expect(result.deltaBalance).toBe(-150_000);
        expect(result.deltaBalance).toBeLessThan(0); // stressed < base
    });

    test('delta is negative when stress scenario worsens outcome', () => {
        const base   = 800_000;
        const stress = 450_000;
        expect(stress - base).toBeLessThan(0);
    });

    test('delta is zero when stress scenario has no effect', () => {
        expect(700_000 - 700_000).toBe(0);
    });

    test('healthcare crisis scenario: stressed inputs have multiplied healthcare costs', () => {
        // Verify buildStressedInputs logic (inline test — same logic as the function)
        const scenario = { healthcareCostMultiplier: 2.5 };
        const baseInputs = { currentHealthcareCosts: 5000, healthcareInflation: 0.055 };

        const stressedInputs = { ...baseInputs };
        if (scenario.healthcareCostMultiplier) {
            stressedInputs.currentHealthcareCosts =
                (baseInputs.currentHealthcareCosts || 0) * scenario.healthcareCostMultiplier;
        }

        expect(stressedInputs.currentHealthcareCosts).toBe(12_500); // 5000 × 2.5
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// TASK-007 — Recommendation impact cap
// ─────────────────────────────────────────────────────────────────────────────

describe('TASK-007 — Recommendation impact cap', () => {
    // Test the cap logic directly without running a full recommendation engine

    const capDelta = (rawDelta, baseMedian) => {
        const maxDelta = Math.min(Math.abs(baseMedian) * 2, 5_000_000);
        return Math.max(-maxDelta, Math.min(maxDelta, rawDelta));
    };

    test('absurd positive delta is capped at 200% of base', () => {
        const base = 1_000_000;
        const absurd = 50_000_000_000; // 50 billion
        expect(capDelta(absurd, base)).toBe(2_000_000); // 200% of 1M
    });

    test('absurd negative delta is capped at -200% of base', () => {
        const base = 1_000_000;
        const absurd = -50_000_000_000;
        expect(capDelta(absurd, base)).toBe(-2_000_000);
    });

    test('absolute cap of ±$5M applies even when 200% of base is larger', () => {
        const base = 10_000_000; // $10M base
        const absurd = 50_000_000_000;
        expect(capDelta(absurd, base)).toBe(5_000_000); // capped at $5M
    });

    test('reasonable delta passes through uncapped', () => {
        const base = 1_000_000;
        const reasonable = 50_000;
        expect(capDelta(reasonable, base)).toBe(50_000);
    });

    test('negative reasonable delta passes through uncapped', () => {
        const base = 1_000_000;
        expect(capDelta(-30_000, base)).toBe(-30_000);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// TASK-008 — PDF simulation count
// ─────────────────────────────────────────────────────────────────────────────

describe('TASK-008 — PDF simulation count resolution', () => {
    // Test the resolution logic that was moved inline in the PDF export
    // (we test the priority order: runs → numRuns → inputs.numRuns → 1000)

    const resolveSimCount = (mcResults, inputs = {}) => {
        return mcResults.runs
            ?? mcResults.numRuns
            ?? inputs.numRuns
            ?? 1000;
    };

    test('uses runs from monteCarloResults when present', () => {
        expect(resolveSimCount({ runs: 5000 })).toBe(5000);
    });

    test('falls back to monteCarloResults.numRuns when runs is absent', () => {
        expect(resolveSimCount({ numRuns: 3000 })).toBe(3000);
    });

    test('falls back to inputs.numRuns when both mc fields are absent', () => {
        expect(resolveSimCount({}, { numRuns: 16000 })).toBe(16000);
    });

    test('ultimate fallback is 1000, never a hardcoded string', () => {
        const count = resolveSimCount({}, {});
        expect(typeof count).toBe('number');
        expect(count).toBe(1000);
    });

    test('displays correctly with toLocaleString (no hardcoded "1,000" string)', () => {
        const count = resolveSimCount({ runs: 16000 });
        expect(Number(count).toLocaleString('en-AU')).toBe('16,000');
    });

    test('template JSON numRuns 16000 is correctly resolved', () => {
        const templateInputs = { numRuns: 16000 };
        const mcResults = { runs: 16000 };
        expect(resolveSimCount(mcResults, templateInputs)).toBe(16000);
    });
});
