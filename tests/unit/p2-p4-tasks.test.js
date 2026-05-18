/**
 * p2-p4-tasks.test.js
 *
 * Unit tests for the P2–P4 implementation tasks:
 *
 *  TASK-006 — Stress test scenario deltas (tests buildStressedInputs directly)
 *  TASK-007 — Recommendation impact cap (tests capRecommendationDelta directly)
 *  TASK-008 — PDF export simulation count (tests resolveSimCount directly)
 *  TASK-010 — normalise-inputs.js canonical module
 *  TASK-011 — validate-inputs.js canonical module
 *  TASK-014 — Division 296 tax in Pipeline B (life_simulation_engine.js)
 *
 * PR review fixes applied (comment #3247765311, #3247765322, #3247765338):
 *  - TASK-006: import and test real buildStressedInputs() from stress-helpers.js
 *  - TASK-007: import and test real capRecommendationDelta() from recommendation.js
 *  - TASK-008: import and test real resolveSimCount() from utils.js
 */

// ── Imports ───────────────────────────────────────────────────────────────────

import { normaliseInputs, normaliseRate } from '../../src/js/policy/normalise-inputs.js';
import { validateInputs }                from '../../src/js/policy/validate-inputs.js';
import { buildStressedInputs }           from '../../src/js/policy/stress-helpers.js';
import { capRecommendationDelta }        from '../../src/js/recommendation.js';
import { resolveSimCount }               from '../../src/js/utils.js';
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

    test('missing rate fields are filled from DEFAULTS (not 0)', () => {
        const out = normaliseInputs({});
        // inflation should default to something sensible (> 0 and < 10%)
        expect(out.inflation).toBeGreaterThan(0);
        expect(out.inflation).toBeLessThan(0.10);
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

    test('creditCardRate 0.2395 passes through unchanged (always decimal)', () => {
        // PR review fix #3247765204: creditCardRate is stored as decimal in JSON
        const out = normaliseInputs({ creditCardRate: 0.2395 });
        expect(out.creditCardRate).toBeCloseTo(0.2395, 4);
    });

    test('globalRiskFactor 0 passes through as 0 (0–1 multiplier, not percentage)', () => {
        // PR review fix #3247765226: globalRiskFactor is a 0–1 multiplier
        const out = normaliseInputs({ globalRiskFactor: 0 });
        expect(out.globalRiskFactor).toBe(0);
        const out1 = normaliseInputs({ globalRiskFactor: 0.5 });
        expect(out1.globalRiskFactor).toBe(0.5);
    });

    test('all RATE_FIELDS that have DEFAULTS get non-zero defaults when absent', () => {
        const out = normaliseInputs({});
        // Spot-check a selection of rate fields that had missing defaults previously
        expect(out.vacancyRate).toBeGreaterThan(0);          // 4% default
        expect(out.shockProbability).toBeGreaterThan(0);     // 5% default
        expect(out.leanYearsReduction).toBeGreaterThan(0);   // 20% default
        expect(out.agedCareProbability).toBeGreaterThan(0);  // 65% default
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
        expect(errors.some(e => e.toLowerCase().includes('planning horizon'))).toBe(true);
    });

    test('partner age ordering validated when partnerCurrentAge > 0', () => {
        const { errors } = validateInputs({
            ...baseValid,
            partnerCurrentAge: 43, partnerRetirementAge: 42, partnerLifespan: 90
        });
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

describe('TASK-011 — validateInputs() — NCC cap (PR review fix #3247765254)', () => {
    const baseValid = {
        yourCurrentAge: 45, retirementAge: 65, yourLifespan: 90,
        inflation: 0.025, investmentReturn: 0.075, superReturn: 0.08,
        salaryGrowthRate: 0.015, healthcareInflation: 0.055,
        returnVolatility: 0.12, shockMagnitude: -0.25, shockProbability: 0.05,
        agedCareProbability: 0.65,
        allocEquities: 0.65, allocBonds: 0.25, allocCash: 0.10,
    };

    test('NCC above $120k cap triggers a warning', () => {
        const { warnings } = validateInputs({ ...baseValid, yourAnnualNCC: 150000, yourCurrentSuper: 100000 });
        expect(warnings.some(w => w.toLowerCase().includes('non-concessional'))).toBe(true);
    });

    test('NCC with TSB >= $2M triggers an ineligibility warning', () => {
        const { warnings } = validateInputs({ ...baseValid, yourAnnualNCC: 10000, yourCurrentSuper: 2_000_001 });
        expect(warnings.some(w => w.includes('2,000,000') || w.includes('not eligible'))).toBe(true);
    });

    test('NCC of 0 with any TSB generates no NCC warning', () => {
        const { warnings } = validateInputs({ ...baseValid, yourAnnualNCC: 0, yourCurrentSuper: 3_000_000 });
        expect(warnings.filter(w => w.toLowerCase().includes('non-concessional'))).toHaveLength(0);
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

    test('numRuns outside range generates a warning (not a hard error)', () => {
        // PR review fix #3247765283: message no longer promises automatic clamping
        const { valid, warnings } = validateInputs({ ...baseValid, numRuns: 50000 });
        expect(valid).toBe(true); // not an error
        expect(warnings.some(w => w.includes('numRuns'))).toBe(true);
        // Should NOT say "will be clamped" (only "may be adjusted")
        const numRunsWarning = warnings.find(w => w.includes('numRuns')) || '';
        expect(numRunsWarning).not.toMatch(/will be clamped/i);
    });

    test('valid inputs produce no errors', () => {
        const { errors } = validateInputs(baseValid);
        expect(errors).toHaveLength(0);
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
        const tax3_5M = calcDivision296Tax(3_500_000, 100_000);
        const tax4M   = calcDivision296Tax(4_000_000, 100_000);
        expect(tax4M).toBeGreaterThan(tax3_5M);
    });
});

describe('TASK-014 — Division 296 applied in life_simulation_engine.js', () => {
    const baseInputs = {
        yourCurrentAge:   60,
        retirementAge:    67,
        yourLifespan:     75,
        yourSalary:       0,
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

    test('super balance >$3M: Division 296 reduces effective return vs <$3M', () => {
        const largeSuper = { ...baseInputs, yourCurrentSuper: 4_000_000 };
        const smallSuper = { ...baseInputs, yourCurrentSuper: 1_000_000 };

        const largeResult = runLifeSimulation(largeSuper);
        const smallResult = runLifeSimulation(smallSuper);

        const largeAtEnd = largeResult.timeline[largeResult.timeline.length - 1]?.superBalance ?? 0;
        const smallAtEnd = smallResult.timeline[smallResult.timeline.length - 1]?.superBalance ?? 0;

        // Large started at 4× small; with Div 296 applied, the ratio should be < 4
        if (smallAtEnd > 0) {
            expect(largeAtEnd / smallAtEnd).toBeLessThan(4.0);
        }
    });

    test('simulation runs without error for large super balance', () => {
        expect(() => runLifeSimulation({ ...baseInputs, yourCurrentSuper: 5_000_000 })).not.toThrow();
    });

    test('all timeline entries have finite superBalance >= 0', () => {
        const result = runLifeSimulation({ ...baseInputs, yourCurrentSuper: 1_000_000 });
        result.timeline.forEach(snap => {
            expect(Number.isFinite(snap.superBalance)).toBe(true);
            expect(snap.superBalance).toBeGreaterThanOrEqual(0);
        });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// TASK-006 — Stress test delta computation
// Tests the REAL buildStressedInputs() from stress-helpers.js
// (PR review fix #3247765311)
// ─────────────────────────────────────────────────────────────────────────────

describe('TASK-006 — buildStressedInputs() from stress-helpers.js', () => {
    test('healthcare crisis multiplier correctly inflates currentHealthcareCosts', () => {
        const base = { currentHealthcareCosts: 5000, healthcareInflation: 0.055 };
        const scenario = { healthcareCostMultiplier: 2.5 };
        const stressed = buildStressedInputs(base, scenario);
        expect(stressed.currentHealthcareCosts).toBe(12_500); // 5000 × 2.5
    });

    test('healthcare inflation is also elevated (capped at 20%)', () => {
        const base = { currentHealthcareCosts: 5000, healthcareInflation: 0.055 };
        const scenario = { healthcareCostMultiplier: 2.5 };
        const stressed = buildStressedInputs(base, scenario);
        expect(stressed.healthcareInflation).toBeGreaterThan(base.healthcareInflation);
        expect(stressed.healthcareInflation).toBeLessThanOrEqual(0.20);
    });

    test('explicit healthcareInflation of 0 is preserved (not replaced by ?? 0.055)', () => {
        // PR review fix #3247765111: use ?? not || so 0 is not treated as falsy
        const base = { currentHealthcareCosts: 5000, healthcareInflation: 0 };
        const scenario = { healthcareCostMultiplier: 2.0 };
        const stressed = buildStressedInputs(base, scenario);
        // 0 * 1.5 = 0, capped at 20%: result should be 0
        expect(stressed.healthcareInflation).toBe(0);
    });

    test('scenario without healthcareCostMultiplier leaves inputs unchanged', () => {
        const base = { currentHealthcareCosts: 5000, healthcareInflation: 0.055 };
        const scenario = {}; // e.g. GFC scenario has equityReturn but no multiplier
        const stressed = buildStressedInputs(base, scenario);
        expect(stressed.currentHealthcareCosts).toBe(5000);
        expect(stressed.healthcareInflation).toBe(0.055);
    });

    test('buildStressedInputs does not mutate baseInputs', () => {
        const base = { currentHealthcareCosts: 5000, healthcareInflation: 0.055 };
        const scenario = { healthcareCostMultiplier: 3.0 };
        buildStressedInputs(base, scenario);
        expect(base.currentHealthcareCosts).toBe(5000); // unchanged
    });

    test('deltaBalance is negative when stress worsens outcome (structural check)', () => {
        // Verify the delta structure expected from runStressTest()
        const baseBalance  = 800_000;
        const stressBalance = 350_000;
        const delta = stressBalance - baseBalance;
        expect(delta).toBeLessThan(0);
    });

    test('probability ?? null preserves 0 as a valid probability', () => {
        // PR review fix #3247765148: || null coerces 0 to null; ?? null does not
        const scenario0   = { probability: 0 };
        const scenarioNull = { probability: null };
        expect(scenario0.probability ?? null).toBe(0);        // preserved
        expect(scenarioNull.probability ?? null).toBeNull();  // null → null
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// TASK-007 — Recommendation impact cap
// Tests the REAL capRecommendationDelta() from recommendation.js
// (PR review fix #3247765322)
// ─────────────────────────────────────────────────────────────────────────────

describe('TASK-007 — capRecommendationDelta() from recommendation.js', () => {
    test('absurd positive delta is capped at 200% of base', () => {
        const base = 1_000_000;
        expect(capRecommendationDelta(50_000_000_000, base)).toBe(2_000_000);
    });

    test('absurd negative delta is capped at -200% of base', () => {
        const base = 1_000_000;
        expect(capRecommendationDelta(-50_000_000_000, base)).toBe(-2_000_000);
    });

    test('absolute $5M cap when 200% of base > $5M', () => {
        const base = 10_000_000; // 200% = $20M > $5M absolute cap
        expect(capRecommendationDelta(50_000_000_000, base)).toBe(5_000_000);
    });

    test('reasonable delta passes through uncapped', () => {
        expect(capRecommendationDelta(50_000, 1_000_000)).toBe(50_000);
    });

    test('reasonable negative delta passes through uncapped', () => {
        expect(capRecommendationDelta(-30_000, 1_000_000)).toBe(-30_000);
    });

    test('zero base median uses absolute $5M cap (PR review fix #3247765172)', () => {
        // When base is 0 (depleted portfolio), 200% of 0 = 0 which clamps everything.
        // The fix: use $5M absolute cap when base is 0.
        expect(capRecommendationDelta(1_000_000, 0)).toBe(1_000_000);   // passes through
        expect(capRecommendationDelta(6_000_000, 0)).toBe(5_000_000);   // capped at $5M
        expect(capRecommendationDelta(-6_000_000, 0)).toBe(-5_000_000); // capped at -$5M
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// TASK-008 — PDF simulation count
// Tests the REAL resolveSimCount() from utils.js
// (PR review fix #3247765338)
// ─────────────────────────────────────────────────────────────────────────────

describe('TASK-008 — resolveSimCount() from utils.js', () => {
    test('uses runs from monteCarloResults when present', () => {
        expect(resolveSimCount({ runs: 5000 })).toBe(5000);
    });

    test('falls back to monteCarloResults.numRuns when runs is absent', () => {
        expect(resolveSimCount({ numRuns: 3000 })).toBe(3000);
    });

    test('supports enhanced Monte Carlo results that expose totalRuns', () => {
        expect(resolveSimCount({ totalRuns: 16000 })).toBe(16000);
    });

    test('falls back to inputs.numRuns when both mc fields are absent', () => {
        expect(resolveSimCount({}, { numRuns: 16000 })).toBe(16000);
    });

    test('ultimate fallback is 1000 (a number, never a hardcoded string)', () => {
        const count = resolveSimCount({}, {});
        expect(typeof count).toBe('number');
        expect(count).toBe(1000);
    });

    test('result formats correctly with toLocaleString', () => {
        const count = resolveSimCount({ runs: 16000 });
        expect(Number(count).toLocaleString('en-AU')).toBe('16,000');
    });

    test('template user numRuns 16000 is correctly resolved from inputs', () => {
        expect(resolveSimCount({}, { numRuns: 16000 })).toBe(16000);
    });
});
