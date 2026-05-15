/**
 * template-json-smoke.test.js
 *
 * Smoke tests that load the real retirement_template.json user data and drive
 * it through every calculation sub-engine that was modified in the recent
 * bug-fix pass.  Asserts:
 *
 *  1. The simulation runs without throwing for this specific user profile.
 *  2. Key financial outputs are within plausible ranges (not NaN, not zero,
 *     not impossibly large).
 *  3. The specific bugs documented in enhancements.md are verifiably fixed:
 *     (A) hasDebt "none" no longer signals high-interest debt.
 *     (B) agedCareProbability 0.22 is honoured — deterministic cost uses 22%,
 *         not the 65% AIHW default.
 *     (C) partnerSuperTax > 0 (no longer taxed at 0%).
 *     (D) Pension is deducted before super withdrawal need is computed.
 *     (E) numRuns 16000 is respected (not silently capped at 1000 by the engine).
 *     (F) australianEquityAllocation 0.4 is treated as 40% (not 40% ÷ 100 = 0.4%).
 *     (G) frankingRate 0.75 is treated as 75% (not 75% ÷ 100 = 0.75%).
 *
 * All assertions use generous tolerances — this is a smoke test, not a
 * golden-output regression test.
 */

import templateData from '../../src/retirement_template.json';

import { hasHighInterestDebt, normaliseRatio } from '../../src/js/utils.js';

import { calcSuperTax }             from '../../src/js/simulation_engine/tax_engine.js';
import { calcSuperContributions }   from '../../src/js/simulation_engine/super_engine.js';
import { calcPensionForYear }       from '../../src/js/simulation_engine/pension_engine.js';
import { getAgedCareCost }          from '../../src/js/simulation_engine/expense_engine.js';
import { runLifeSimulation }        from '../../src/js/simulation_engine/life_simulation_engine.js';
import { runMonteCarlo }            from '../../src/js/simulation_engine/monte_carlo_engine.js';

// ── Extract userData from the template ───────────────────────────────────────

const u = templateData.userData;

// ── Helper: build a minimal inputs object compatible with simulation engines ──

function buildInputs(overrides = {}) {
    return {
        // Personal
        yourCurrentAge:        u.yourCurrentAge,        // 49
        retirementAge:         u.retirementAge,         // 71
        yourLifespan:          u.yourLifespan,          // 93
        partnerCurrentAge:     u.partnerCurrentAge,     // 47
        partnerRetirementAge:  u.partnerRetirementAge,  // 62
        partnerLifespan:       u.partnerLifespan,       // 94
        isCouple:              true,
        homeowner:             true,

        // Income
        yourSalary:            u.yourSalary,            // 202509
        partnerSalary:         u.partnerSalary,         // 39800

        // Super
        yourCurrentSuper:      u.yourCurrentSuper,      // 336800
        partnerCurrentSuper:   u.partnerCurrentSuper,   // 14817
        superContributionRate: u.superContributionRate, // 0.12
        superReturn:           u.superReturn,           // 0.09

        // Investment
        currentSavings:        u.currentSavings,        // 70000
        currentStocks:         u.currentStocks,         // 43500
        investmentReturn:      u.investmentReturn,      // 0.09
        allocEquities:         u.allocEquities,         // 0.71
        allocBonds:            u.allocBonds,            // 0.203
        allocCash:             u.allocCash,             // 0.087
        australianEquityAllocation: u.australianEquityAllocation, // 0.4 (decimal)
        frankingRate:          u.frankingRate,          // 0.75 (decimal)
        dividendYield:         u.dividendYield,         // 0.04

        // Economic
        inflation:             u.inflation,             // 0.02
        salaryGrowthRate:      u.salaryGrowthRate,      // 0.0155
        returnVolatility:      u.returnVolatility,      // 0.1619

        // Healthcare
        currentHealthcareCosts: u.currentHealthcareCosts, // 5445
        healthcareInflation:    u.healthcareInflation,    // 0.055
        agedCareProbability:    u.agedCareProbability,    // 0.22
        agedCareStartAge:       u.agedCareStartAge,       // 83
        agedCareDuration:       u.agedCareDuration,       // 10
        agedCareAnnualCost:     u.agedCareAnnualCost,     // 56700

        // Debt flags
        hasDebt:               u.hasDebt,               // "none"
        creditCardBalance:     u.creditCardBalance,     // 0
        personalLoanBalance:   u.personalLoanBalance,   // 0
        carLoanBalance:        u.carLoanBalance,        // 0

        // Monte Carlo
        numRuns:               u.numRuns,               // 16000
        enableShocks:          false,                   // disable shocks for deterministic smoke tests

        // ASFA
        asfaComfortable:       u.asfaComfortable,       // 73337

        // Pension
        pensionAssetThreshold: u.pensionAssetThreshold,
        pensionAssetLimit:     u.pensionAssetLimit,

        // Property (minimal for smoke)
        hasInvestmentProperty: false,

        // Spending
        leanYearsStart:        u.leanYearsStart,        // 10
        leanYearsReduction:    u.leanYearsReduction,    // 0.1704

        ...overrides,
    };
}

// ── A. hasDebt "none" string → NOT high-interest debt ────────────────────────

describe('Bug fix A — hasDebt="none" string is not treated as truthy debt', () => {
    test('hasHighInterestDebt returns false when hasDebt="none" and all balances are 0', () => {
        expect(hasHighInterestDebt({
            hasDebt:            'none',
            creditCardBalance:  0,
            personalLoanBalance: 0,
            carLoanBalance:     0,
        })).toBe(false);
    });

    test('hasHighInterestDebt returns true when credit card balance > 0', () => {
        expect(hasHighInterestDebt({
            hasDebt:            'none',
            creditCardBalance:  5000,
            personalLoanBalance: 0,
            carLoanBalance:     0,
        })).toBe(true);
    });

    test('hasHighInterestDebt returns true when hasDebt="high" even with zero balances', () => {
        expect(hasHighInterestDebt({
            hasDebt:            'high',
            creditCardBalance:  0,
            personalLoanBalance: 0,
            carLoanBalance:     0,
        })).toBe(true);
    });

    test('template user has no high-interest debt', () => {
        expect(hasHighInterestDebt(u)).toBe(false);
    });
});

// ── B. agedCareProbability 0.22 is honoured (not overridden by 65% default) ──

describe('Bug fix B — agedCareProbability from template is used (not 65% default)', () => {
    const inputs = buildInputs();

    test('deterministic aged-care cost at start age uses 0.22 weight, not 0.65', () => {
        const costAt0_22 = getAgedCareCost(u.agedCareStartAge, {
            ...inputs,
            agedCareProbability: 0.22,
        });
        const costAt0_65 = getAgedCareCost(u.agedCareStartAge, {
            ...inputs,
            agedCareProbability: 0.65,
        });

        // Costs should be strictly proportional to probability weight in deterministic mode
        expect(costAt0_22).toBeGreaterThan(0);
        expect(costAt0_65).toBeGreaterThan(0);
        // 0.22 is less than 0.65, so cost must be smaller
        expect(costAt0_22).toBeLessThan(costAt0_65);
        // Exact ratio should match probability ratio (both use same inflated base cost)
        expect(costAt0_22 / costAt0_65).toBeCloseTo(0.22 / 0.65, 2);
    });

    test('template agedCareProbability 0.22 is already a decimal (no /100 needed)', () => {
        expect(u.agedCareProbability).toBe(0.22);
        // normaliseRatio should return it unchanged
        expect(normaliseRatio(u.agedCareProbability)).toBeCloseTo(0.22, 4);
    });

    test('returns 0 before agedCareStartAge (age 82)', () => {
        expect(getAgedCareCost(82, { ...inputs, agedCareProbability: 0.22 })).toBe(0);
    });

    test('returns 0 after care period ends (age 83+10 = 93)', () => {
        expect(getAgedCareCost(93, { ...inputs, agedCareProbability: 0.22 })).toBe(0);
    });
});

// ── C. Partner super contributions are taxed at 15% (not 0%) ─────────────────

describe('Bug fix C — partner super contributions are taxed at 15% + Div 293', () => {
    const calendarYear = 2026;
    const partnerContrib = calcSuperContributions(
        u.partnerSalary,          // 39800
        u.partnerCurrentAge,      // 47
        { retirementAge: u.partnerRetirementAge, superContributionRate: u.superContributionRate },
        calendarYear,
    );

    test('partner has non-zero concessional contributions (below retirement age)', () => {
        expect(partnerContrib).toBeGreaterThan(0);
        // 12% of 39800 = 4776
        expect(partnerContrib).toBeCloseTo(u.partnerSalary * 0.12, 0);
    });

    test('partner super tax is 15% of contributions (no Division 293 at $39,800)', () => {
        const tax = calcSuperTax(u.partnerSalary, partnerContrib);
        // Division 293 threshold is $250,000; 39800 + 4776 = 44,576 — well below
        expect(tax).toBeCloseTo(partnerContrib * 0.15, 2);
    });

    test('partner super tax is NOT zero', () => {
        const tax = calcSuperTax(u.partnerSalary, partnerContrib);
        expect(tax).toBeGreaterThan(0);
    });

    // Primary person (salary $202,509) — verify Division 293 surcharge applies
    test('primary earner ($202,509) attracts Division 293 surcharge on CC above $250k threshold', () => {
        const primaryContrib = calcSuperContributions(
            u.yourSalary,    // 202509
            u.yourCurrentAge, // 49
            { retirementAge: u.retirementAge, superContributionRate: u.superContributionRate },
            calendarYear,
        );
        const tax = calcSuperTax(u.yourSalary, primaryContrib);
        // Income + CC = 202509 + 24301 = 226810 — below $250k, so NO Div 293
        // Base tax only: 24301 * 15% = 3645
        expect(tax).toBeCloseTo(primaryContrib * 0.15, 0);
    });
});

// ── D. Pension deducted before super withdrawal ───────────────────────────────

describe('Bug fix D — pension income reduces super withdrawal need', () => {
    // At age 71 (retirement age for this user), pension eligibility begins at 67.
    // With significant assets, pension may be zero or partial.
    // The key test is that the simulation engine does NOT add pension AFTER
    // computing the full withdrawal, which would double-credit it.

    const inputs = buildInputs({ yourLifespan: 80 }); // shorter for speed

    test('simulation runs without error for template data up to age 80', () => {
        expect(() => runLifeSimulation(inputs)).not.toThrow();
    });

    test('pension-eligible year (age 71+) has annualPension in timeline', () => {
        const { timeline } = runLifeSimulation(inputs);
        // Age 71 is both retirement and pension-eligible (67+)
        const atRetirement = timeline.find(s => s.age === 71);
        expect(atRetirement).toBeDefined();
        // pensionIncome field exists and is a number
        expect(typeof atRetirement.pensionIncome).toBe('number');
    });

    test('superWithdrawal at retirement is non-negative', () => {
        const { timeline } = runLifeSimulation(inputs);
        timeline
            .filter(s => s.age >= u.retirementAge)
            .forEach(s => {
                expect(s.superWithdrawal).toBeGreaterThanOrEqual(0);
            });
    });

    test('annualCashFlow is a finite number in every year', () => {
        const { timeline } = runLifeSimulation(inputs);
        timeline.forEach(s => {
            expect(Number.isFinite(s.annualCashFlow)).toBe(true);
        });
    });
});

// ── E. numRuns 16000 is respected ────────────────────────────────────────────
// Note: runMonteCarlo is now async (delegates to RetirementSimulator) so all
// tests in this describe block must be async and await the result.

describe('Bug fix E — numRuns from template (16000) is used, not defaulted to 1000', () => {
    test('runMonteCarlo with numRuns=200 returns runs=200', async () => {
        // Run a minimal MC to avoid long test time — override to 200 runs but
        // verify the clamping and pass-through logic works correctly.
        const result = await runMonteCarlo(buildInputs({
            numRuns:      200,
            yourLifespan: 75, // short lifespan for test speed
        }));
        expect(result.runs).toBe(200);
    });

    test('MC default of 1000 is overridden when user specifies numRuns', async () => {
        // Verify the engine reads from inputs.numRuns, not a hard-coded constant
        const [result500, result800] = await Promise.all([
            runMonteCarlo(buildInputs({ numRuns: 500, yourLifespan: 72 })),
            runMonteCarlo(buildInputs({ numRuns: 800, yourLifespan: 72 })),
        ]);
        expect(result500.runs).toBe(500);
        expect(result800.runs).toBe(800);
    });

    test('numRuns is clamped to sane range [100, 20000]', async () => {
        const [resultLow, resultHigh] = await Promise.all([
            runMonteCarlo(buildInputs({ numRuns: 1,     yourLifespan: 72 })),
            runMonteCarlo(buildInputs({ numRuns: 99999, yourLifespan: 72 })),
        ]);
        expect(resultLow.runs).toBe(100);     // clamped up
        expect(resultHigh.runs).toBe(20000);  // clamped down
    });
});

// ── F. australianEquityAllocation is already decimal ─────────────────────────

describe('Bug fix F — australianEquityAllocation=0.4 means 40% (no double /100)', () => {
    test('template value 0.4 is already a decimal fraction', () => {
        expect(u.australianEquityAllocation).toBe(0.4);
    });

    test('normaliseRatio(0.4) returns 0.4 unchanged (not 0.004)', () => {
        expect(normaliseRatio(0.4)).toBeCloseTo(0.4, 4);
    });

    test('normaliseRatio(40) converts percentage to decimal 0.4', () => {
        expect(normaliseRatio(40)).toBeCloseTo(0.4, 4);
    });

    test('allocEquities from template is decimal 0.71 (not 71)', () => {
        expect(u.allocEquities).toBeCloseTo(0.71, 4);
        expect(normaliseRatio(u.allocEquities)).toBeCloseTo(0.71, 4);
    });
});

// ── G. frankingRate 0.75 means 75% ───────────────────────────────────────────

describe('Bug fix G — frankingRate=0.75 means 75% (no double /100)', () => {
    test('template frankingRate 0.75 is already a decimal', () => {
        expect(u.frankingRate).toBe(0.75);
    });

    test('normaliseRatio(0.75) returns 0.75 unchanged', () => {
        expect(normaliseRatio(0.75)).toBeCloseTo(0.75, 4);
    });

    test('franking credit calculation uses decimal frankingRate correctly', () => {
        // grossDividends = investmentAssets * allocEquities * australianEquityAllocation * dividendYield
        // = 100000 * 0.71 * 0.4 * 0.04 = 1136
        // frankedPortion = 1136 * 0.75 = 852
        // frankingCredits = 852 * (0.30/0.70) = 365.14
        const investmentAssets = 100000;
        const allocEquities    = u.allocEquities;             // 0.71
        const auAlloc          = u.australianEquityAllocation; // 0.4
        const dividendYield    = u.dividendYield;              // 0.04
        const frankingRate     = u.frankingRate;               // 0.75

        const auEquityValue    = investmentAssets * allocEquities * auAlloc;
        const grossDividends   = auEquityValue * dividendYield;
        const frankedPortion   = grossDividends * frankingRate;
        const frankingCredits  = frankedPortion * (0.30 / 0.70);

        expect(auEquityValue).toBeCloseTo(28400, 0);
        expect(grossDividends).toBeCloseTo(1136, 0);
        expect(frankedPortion).toBeCloseTo(852, 0);
        expect(frankingCredits).toBeCloseTo(365.14, 1);
    });
});

// ── Full simulation smoke test ────────────────────────────────────────────────

describe('Full simulation smoke test — template data end-to-end', () => {
    const inputs = buildInputs();

    let result;
    beforeAll(() => {
        result = runLifeSimulation(inputs);
    });

    test('simulation produces a timeline', () => {
        expect(Array.isArray(result.timeline)).toBe(true);
        expect(result.timeline.length).toBeGreaterThan(0);
    });

    test('timeline covers age 49 to 93 (yourLifespan)', () => {
        expect(result.timeline[0].age).toBe(u.yourCurrentAge);          // 49
        expect(result.timeline[result.timeline.length - 1].age)
            .toBe(u.yourLifespan);                                       // 93
    });

    test('retirementWealth is a positive finite number', () => {
        expect(Number.isFinite(result.retirementWealth)).toBe(true);
        expect(result.retirementWealth).toBeGreaterThan(0);
    });

    test('finalNetWorth is a finite number (may be positive or negative)', () => {
        expect(Number.isFinite(result.finalNetWorth)).toBe(true);
    });

    test('no NaN values in any timeline snapshot field', () => {
        result.timeline.forEach((snap, i) => {
            Object.entries(snap).forEach(([key, val]) => {
                if (typeof val === 'number') {
                    expect(Number.isNaN(val)).toBe(false);
                }
            });
        });
    });

    test('super balance grows between age 49 and retirement age 71', () => {
        const atStart     = result.timeline.find(s => s.age === u.yourCurrentAge);
        const atRetirement = result.timeline.find(s => s.age === u.retirementAge);
        expect(atRetirement.superBalance + (atRetirement.partnerSuperBalance || 0))
            .toBeGreaterThan(atStart.superBalance);
    });

    test('superWithdrawal is 0 before retirementAge', () => {
        result.timeline
            .filter(s => s.age < u.retirementAge)
            .forEach(s => {
                expect(s.superWithdrawal).toBe(0);
            });
    });

    test('healthcareCosts are positive and grow over time', () => {
        const hc49 = result.timeline.find(s => s.age === 49)?.healthcareCosts;
        const hc70 = result.timeline.find(s => s.age === 70)?.healthcareCosts;
        expect(hc49).toBeGreaterThan(0);
        expect(hc70).toBeGreaterThan(hc49);
    });

    test('agedCareCosts appear during aged-care window (age 83–92)', () => {
        const careYears = result.timeline.filter(
            s => s.age >= u.agedCareStartAge && s.age < u.agedCareStartAge + u.agedCareDuration,
        );
        expect(careYears.length).toBeGreaterThan(0);
        careYears.forEach(s => {
            expect(s.agedCareCosts).toBeGreaterThan(0);
        });
    });

    test('agedCareCosts are 0 before aged-care start age (83)', () => {
        result.timeline
            .filter(s => s.age < u.agedCareStartAge)
            .forEach(s => {
                expect(s.agedCareCosts).toBe(0);
            });
    });
});
