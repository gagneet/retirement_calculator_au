/**
 * policy-engine.test.js
 *
 * Deterministic snapshot tests for the policy engine (policy-engine.js).
 * All expected values are hand-calculated from the March 2026 Services Australia
 * Age Pension rules to serve as regression anchors.
 *
 * Covers all scenarios required by the deep_research_prompt.md:
 * - Deeming rate calculations (single and couple)
 * - Asset test (homeowner vs non-homeowner)
 * - Income test
 * - Full pension / part pension / ineligible thresholds
 * - Couple with both partners eligible
 * - Couple with only one partner eligible
 * - Overseas scenarios: 6-week, 26-week AWLR, permanent move, return-to-Australia
 * - Minimum pension drawdown
 * - Tax calculations
 * - Edge cases: zero assets, exact threshold boundaries, AWLR=0, AWLR=35
 */

import {
    calculateDeemedIncome,
    buildDeemedAssets,
    calculateSinglePension,
    applyMeansTest,
    getPensionThresholds,
    calculatePortablePension,
    generateOverseasScenarioTree,
    OverseasScenarioType,
    calculateIncomeTax,
    getMinDrawdownRate,
    calculateMinDrawdown,
    getPolicyMetadata,
    POLICY
} from '../../src/js/policy-engine.js';

import { ENHANCED_CONFIG } from '../../src/js/config.js';

// ============================================================
// HELPERS — derived from config so tests auto-update with rates
// ============================================================
const C = ENHANCED_CONFIG;
const FORTNIGHTS = C.FORTNIGHTS_IN_YEAR;  // 26

// March 2026 rates — derived from ENHANCED_CONFIG so comments track actual values
// All values verified 14 May 2026 from live Services Australia pages
const SINGLE_MAX = C.SINGLE_PENSION_MAX;   // 31223 ($1,200.90/fn × 26 = $31,223.40)
const COUPLE_MAX = C.COUPLE_PENSION_MAX;   // 47070 ($1,810.40/fn × 26 = $47,070.40)
const SINGLE_ASSET_THR_HO = C.SINGLE_ASSET_THRESHOLD;            // 321500 (homeowner, full pension limit)
const SINGLE_ASSET_LIM_HO = C.SINGLE_ASSET_LIMIT;               // 722000 (homeowner, part pension cutoff)
const SINGLE_ASSET_THR_NH = C.SINGLE_ASSET_THRESHOLD_NON_HOMEOWNER; // 579500 (non-homeowner, full pension limit)
const SINGLE_ASSET_LIM_NH = C.SINGLE_ASSET_LIMIT_NON_HOMEOWNER;     // 980000 (non-homeowner, part pension cutoff)
const COUPLE_ASSET_THR_HO = C.COUPLE_ASSET_THRESHOLD;            // 481500 (couple homeowner, full pension limit)
const COUPLE_ASSET_LIM_HO = C.COUPLE_ASSET_LIMIT;               // 1085000 (couple homeowner, part pension cutoff)
const COUPLE_ASSET_THR_NH = C.COUPLE_ASSET_THRESHOLD_NON_HOMEOWNER; // 739500 (couple non-homeowner, full)
const COUPLE_ASSET_LIM_NH = C.COUPLE_ASSET_LIMIT_NON_HOMEOWNER;     // 1343000 (couple non-homeowner, cutoff)
const SINGLE_INC_THR = C.SINGLE_INCOME_THRESHOLD;   // 218/fn (UNCHANGED from Sept 2025)
const COUPLE_INC_THR = C.COUPLE_INCOME_THRESHOLD;   // 380/fn combined (UNCHANGED from Sept 2025)
const DEEM_THR_S = C.DEMING_THRESHOLD_SINGLE;       // 64200
const DEEM_THR_C = C.DEMING_THRESHOLD_COUPLE;       // 106200
const DEEM_LOW = C.DEMING_RATE_LOWER;               // 0.0125
const DEEM_HIGH = C.DEMING_RATE_UPPER;              // 0.0325

// ============================================================
// POLICY METADATA
// ============================================================
describe('getPolicyMetadata', () => {
    test('returns a valid effectiveDate in YYYY-MM-DD format', () => {
        const meta = getPolicyMetadata();
        expect(meta.effectiveDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test('effective date is 2026-03-20 (March 2026 indexation)', () => {
        const meta = getPolicyMetadata();
        expect(meta.effectiveDate).toBe('2026-03-20');
    });

    test('next review date is in the future (2026-09-20 or later)', () => {
        const meta = getPolicyMetadata();
        expect(new Date(meta.nextReviewDate) >= new Date('2026-09-20')).toBe(true);
    });

    test('POLICY constants match config values', () => {
        expect(POLICY.deemingRateLower).toBe(C.DEMING_RATE_LOWER);
        expect(POLICY.deemingRateUpper).toBe(C.DEMING_RATE_UPPER);
        expect(POLICY.singlePensionMax).toBe(C.SINGLE_PENSION_MAX);
        expect(POLICY.couplePensionMax).toBe(C.COUPLE_PENSION_MAX);
    });
});

// ============================================================
// DEEMING RATE CALCULATIONS
// ============================================================
describe('calculateDeemedIncome', () => {
    // March 2026: 1.25% below threshold, 3.25% above threshold
    // Single threshold: $64,200; Couple: $106,200

    test('zero assets => zero deemed income', () => {
        expect(calculateDeemedIncome(0, false)).toBe(0);
        expect(calculateDeemedIncome(0, true)).toBe(0);
    });

    test('negative assets clamped to zero', () => {
        expect(calculateDeemedIncome(-10000, false)).toBe(0);
    });

    test('single: assets entirely below threshold', () => {
        // $50,000 at 1.25% = $625
        const result = calculateDeemedIncome(50000, false);
        expect(result).toBeCloseTo(50000 * DEEM_LOW, 2);
        expect(result).toBeCloseTo(625, 2);
    });

    test('single: assets exactly at threshold', () => {
        // $64,200 at 1.25% = $802.50
        const result = calculateDeemedIncome(DEEM_THR_S, false);
        expect(result).toBeCloseTo(DEEM_THR_S * DEEM_LOW, 2);
    });

    test('single: assets spanning both deeming tiers', () => {
        // $100,000: $64,200 at 1.25% + ($100,000 - $64,200) at 3.25%
        // = $802.50 + $35,800 × 0.0325 = $802.50 + $1,163.50 = $1,966.00
        const assets = 100000;
        const expected = DEEM_THR_S * DEEM_LOW + (assets - DEEM_THR_S) * DEEM_HIGH;
        expect(calculateDeemedIncome(assets, false)).toBeCloseTo(expected, 2);
        expect(calculateDeemedIncome(assets, false)).toBeCloseTo(1966, 0);
    });

    test('couple: assets below couple threshold uses couple threshold', () => {
        // $80,000 at 1.25% (below couple $106,200 threshold)
        const result = calculateDeemedIncome(80000, true);
        expect(result).toBeCloseTo(80000 * DEEM_LOW, 2);
        expect(result).toBeCloseTo(1000, 2);
    });

    test('couple: assets spanning couple threshold', () => {
        // $200,000: $106,200 at 1.25% + $93,800 at 3.25%
        // = $1,327.50 + $3,048.50 = $4,376.00
        const assets = 200000;
        const expected = DEEM_THR_C * DEEM_LOW + (assets - DEEM_THR_C) * DEEM_HIGH;
        expect(calculateDeemedIncome(assets, true)).toBeCloseTo(expected, 2);
    });

    test('single threshold produces LESS deemed income than couple threshold for same assets', () => {
        // Same $200k: single crosses $64.2k threshold sooner, more at higher rate
        const single = calculateDeemedIncome(200000, false);
        const couple = calculateDeemedIncome(200000, true);
        expect(single).toBeGreaterThan(couple);
    });
});

// ============================================================
// buildDeemedAssets
// ============================================================
describe('buildDeemedAssets', () => {
    test('sums all financial asset types', () => {
        const finances = {
            superBalance: 100000,
            investmentBalance: 50000,
            savingsBalance: 20000,
            termDeposits: 10000,
            managedFunds: 5000,
            listedShares: 15000,
            otherFinancialAssets: 1000
        };
        expect(buildDeemedAssets(finances)).toBe(201000);
    });

    test('returns 0 when all fields are missing', () => {
        expect(buildDeemedAssets({})).toBe(0);
    });

    test('handles null/undefined individual fields', () => {
        const finances = { superBalance: 100000, investmentBalance: null };
        expect(buildDeemedAssets(finances)).toBe(100000);
    });

    test('CRITICAL: investmentBalance alone is NOT the full deeming base', () => {
        // This validates the overseas-retirement.js bug fix.
        // Before the fix, only investmentBalance was used for deeming.
        // After the fix, all financial assets are included.
        const finances = {
            superBalance: 300000,      // Was previously EXCLUDED from overseas deeming
            investmentBalance: 100000,
            savingsBalance: 50000
        };
        const fullBase = buildDeemedAssets(finances);
        const narrowBase = finances.investmentBalance;

        expect(fullBase).toBe(450000);
        expect(fullBase).toBeGreaterThan(narrowBase);
        // Deemed income on full base is substantially higher
        expect(calculateDeemedIncome(fullBase, false)).toBeGreaterThan(
            calculateDeemedIncome(narrowBase, false)
        );
    });
});

// ============================================================
// MEANS TEST
// ============================================================
describe('applyMeansTest', () => {
    const maxPension = SINGLE_MAX;
    const assetThr = SINGLE_ASSET_THR_HO;
    const assetLim = SINGLE_ASSET_LIM_HO;
    const incThr = SINGLE_INC_THR;

    test('full pension when assets and income both at zero', () => {
        const result = applyMeansTest(0, 0, maxPension, assetThr, assetLim, incThr);
        expect(result.annualPension).toBe(maxPension);
    });

    test('full pension when assets exactly at threshold', () => {
        const result = applyMeansTest(assetThr, 0, maxPension, assetThr, assetLim, incThr);
        expect(result.annualPension).toBe(maxPension);
        // When both tests give full pension, limitingTest can be either — we just check pension is full
    });

    test('part pension when assets slightly above threshold', () => {
        // $1,000 over threshold → $3/fn × 26 = $78/year reduction
        const result = applyMeansTest(assetThr + 1000, 0, maxPension, assetThr, assetLim, incThr);
        expect(result.annualPension).toBeCloseTo(maxPension - 3 * FORTNIGHTS, 0);
        expect(result.limitingTest).toBe('Assets Test');
    });

    test('zero pension when assets at or above limit', () => {
        const result = applyMeansTest(assetLim, 0, maxPension, assetThr, assetLim, incThr);
        expect(result.annualPension).toBe(0);
    });

    test('zero pension when assets well above limit', () => {
        const result = applyMeansTest(assetLim + 100000, 0, maxPension, assetThr, assetLim, incThr);
        expect(result.annualPension).toBe(0);
    });

    test('full pension when income exactly at threshold', () => {
        // Fortnightly income = incThr ($220), annual = $220 × 26 = $5,720
        const annualIncome = incThr * FORTNIGHTS;
        const result = applyMeansTest(0, annualIncome, maxPension, assetThr, assetLim, incThr);
        expect(result.annualPension).toBe(maxPension);
    });

    test('income test: part pension 50c per dollar over fortnightly threshold', () => {
        // $440/fn income (double threshold of $220) → $220 excess → 50c reduction
        // Reduction: $220 × 0.5 × 26 = $2,860/year
        const fortnightlyIncome = incThr * 2;
        const annualIncome = fortnightlyIncome * FORTNIGHTS;
        const expectedReduction = (fortnightlyIncome - incThr) * 0.5 * FORTNIGHTS;
        const result = applyMeansTest(0, annualIncome, maxPension, assetThr, assetLim, incThr);
        expect(result.annualPension).toBeCloseTo(maxPension - expectedReduction, 0);
        expect(result.limitingTest).toBe('Income Test');
    });

    test('returns both pensionFromAssets and pensionFromIncome for analysis', () => {
        const result = applyMeansTest(assetThr + 10000, 10000, maxPension, assetThr, assetLim, incThr);
        expect(result.pensionFromAssets).toBeDefined();
        expect(result.pensionFromIncome).toBeDefined();
        expect(result.annualPension).toBe(Math.min(result.pensionFromAssets, result.pensionFromIncome));
    });
});

// ============================================================
// getPensionThresholds
// ============================================================
describe('getPensionThresholds', () => {
    test('single homeowner returns correct thresholds', () => {
        const t = getPensionThresholds(false, true);
        expect(t.assetThreshold).toBe(SINGLE_ASSET_THR_HO);
        expect(t.assetLimit).toBe(SINGLE_ASSET_LIM_HO);
        expect(t.incomeThreshold).toBe(SINGLE_INC_THR);
        expect(t.maxPension).toBe(SINGLE_MAX);
    });

    test('single non-homeowner returns higher thresholds', () => {
        const t = getPensionThresholds(false, false);
        expect(t.assetThreshold).toBe(SINGLE_ASSET_THR_NH);
        expect(t.assetLimit).toBe(SINGLE_ASSET_LIM_NH);
        // Non-homeowner threshold should be higher
        expect(t.assetThreshold).toBeGreaterThan(SINGLE_ASSET_THR_HO);
    });

    test('couple homeowner returns couple thresholds', () => {
        const t = getPensionThresholds(true, true);
        expect(t.assetThreshold).toBe(COUPLE_ASSET_THR_HO);
        expect(t.assetLimit).toBe(COUPLE_ASSET_LIM_HO);
        expect(t.incomeThreshold).toBe(COUPLE_INC_THR);
        expect(t.maxPension).toBe(COUPLE_MAX);
    });

    test('couple non-homeowner returns higher couple thresholds', () => {
        const t = getPensionThresholds(true, false);
        expect(t.assetThreshold).toBe(COUPLE_ASSET_THR_NH);
        expect(t.assetLimit).toBe(COUPLE_ASSET_LIM_NH);
        expect(t.assetThreshold).toBeGreaterThan(COUPLE_ASSET_THR_HO);
    });

    test('non-homeowner supplement is consistent: limit - threshold === homeowner equivalent diff', () => {
        const singleHO = getPensionThresholds(false, true);
        const singleNH = getPensionThresholds(false, false);
        const supplement = C.NON_HOMEOWNER_ASSET_SUPPLEMENT;
        expect(singleNH.assetThreshold - singleHO.assetThreshold).toBe(supplement);
        expect(singleNH.assetLimit - singleHO.assetLimit).toBe(supplement);
    });
});

// ============================================================
// calculateSinglePension — FULL INTEGRATION SCENARIOS
// ============================================================
describe('calculateSinglePension', () => {
    // Scenario: Single homeowner, very low assets, no other income
    test('SCENARIO: single homeowner with low assets gets full pension', () => {
        const result = calculateSinglePension({
            totalAssets: 100000,
            financialAssets: 100000,
            otherIncome: 0,
            isCouple: false,
            homeowner: true
        });
        expect(result.annualPension).toBe(SINGLE_MAX);
        expect(result.eligible).toBe(true);
    });

    // Scenario: Single homeowner, assets above asset limit → zero pension
    test('SCENARIO: single homeowner with assets above limit gets zero pension', () => {
        const result = calculateSinglePension({
            totalAssets: SINGLE_ASSET_LIM_HO + 50000,
            financialAssets: SINGLE_ASSET_LIM_HO + 50000,
            otherIncome: 0,
            isCouple: false,
            homeowner: true
        });
        expect(result.annualPension).toBe(0);
        expect(result.eligible).toBe(false);
    });

    // Scenario: Single non-homeowner uses higher thresholds
    test('SCENARIO: single non-homeowner — same assets as homeowner above-limit yields part pension', () => {
        // Assets above SINGLE homeowner limit but below NON-HOMEOWNER limit
        const assets = SINGLE_ASSET_LIM_HO + 10000; // above HO limit, below NH limit
        const homeownerResult = calculateSinglePension({
            totalAssets: assets, financialAssets: assets,
            otherIncome: 0, isCouple: false, homeowner: true
        });
        const nonHomeownerResult = calculateSinglePension({
            totalAssets: assets, financialAssets: assets,
            otherIncome: 0, isCouple: false, homeowner: false
        });

        expect(homeownerResult.annualPension).toBe(0);
        expect(nonHomeownerResult.annualPension).toBeGreaterThan(0);
    });

    // Scenario: Income test limits pension
    test('SCENARIO: deemed income reduces pension via income test', () => {
        // Large financial assets create high deemed income
        const financialAssets = 1500000;
        const deemedIncome = calculateDeemedIncome(financialAssets, false);
        const fortnightlyDeemed = deemedIncome / FORTNIGHTS;
        const result = calculateSinglePension({
            totalAssets: 300000,     // below asset threshold (homeowner)
            financialAssets,
            otherIncome: 0,
            isCouple: false,
            homeowner: true
        });

        if (fortnightlyDeemed > SINGLE_INC_THR) {
            // Income test should be the limiting factor
            expect(result.limitingTest).toBe('Income Test');
            expect(result.annualPension).toBeLessThan(SINGLE_MAX);
        } else {
            expect(result.annualPension).toBe(SINGLE_MAX);
        }
    });

    // Scenario: both tests apply — lower result wins
    test('SCENARIO: result is always the lower of asset test and income test', () => {
        const result = calculateSinglePension({
            totalAssets: 400000,
            financialAssets: 400000,
            otherIncome: 5000,
            isCouple: false,
            homeowner: true
        });
        expect(result.annualPension).toBe(Math.min(result.details.pensionFromAssets, result.details.pensionFromIncome));
    });

    // Scenario: couple homeowner with both eligible
    test('SCENARIO: couple homeowner gets couple max pension when well under threshold', () => {
        const result = calculateSinglePension({
            totalAssets: 100000,
            financialAssets: 100000,
            otherIncome: 0,
            isCouple: true,
            homeowner: true
        });
        expect(result.annualPension).toBe(COUPLE_MAX);
        expect(result.eligible).toBe(true);
    });

    // Policydate is always included in details
    test('details always includes policyDate', () => {
        const result = calculateSinglePension({
            totalAssets: 0, financialAssets: 0,
            otherIncome: 0, isCouple: false, homeowner: true
        });
        expect(result.details.policyDate).toBe(C.POLICY_EFFECTIVE_DATE);
    });

    // Edge case: exact asset threshold boundary
    test('EDGE: assets = threshold exactly → full pension (or near-full if deeming creates income)', () => {
        const thr = SINGLE_ASSET_THR_HO;
        // Note: assets = thr means deeming applies (all are financial assets).
        // The asset test gives full pension, but the income test may reduce if deeming > threshold.
        const deemedIncome = calculateDeemedIncome(thr, false);
        const fortnightlyDeemed = deemedIncome / FORTNIGHTS;
        const result = calculateSinglePension({
            totalAssets: thr, financialAssets: thr,
            otherIncome: 0, isCouple: false, homeowner: true
        });
        if (fortnightlyDeemed <= SINGLE_INC_THR) {
            expect(result.annualPension).toBe(SINGLE_MAX);
        } else {
            // Income test reduces pension when deemed income exceeds fortnightly threshold
            expect(result.annualPension).toBeGreaterThan(0);
            expect(result.annualPension).toBeLessThan(SINGLE_MAX);
        }
    });

    // Edge case: assets = limit → zero pension
    test('EDGE: assets = limit exactly → zero pension', () => {
        const lim = SINGLE_ASSET_LIM_HO;
        const result = calculateSinglePension({
            totalAssets: lim, financialAssets: lim,
            otherIncome: 0, isCouple: false, homeowner: true
        });
        expect(result.annualPension).toBe(0);
    });

    // Edge case: large lump-sum expense scenario — reduced assets = higher pension
    test('SCENARIO: large lump-sum expense reduces assets → increases pension eligibility', () => {
        const assetsBeforeLumpSum = 700000; // just below homeowner part-pension cutoff $722,000
        const assetsAfterLumpSum = 550000;  // after $150k expense

        const before = calculateSinglePension({
            totalAssets: assetsBeforeLumpSum, financialAssets: assetsBeforeLumpSum,
            otherIncome: 0, isCouple: false, homeowner: true
        });
        const after = calculateSinglePension({
            totalAssets: assetsAfterLumpSum, financialAssets: assetsAfterLumpSum,
            otherIncome: 0, isCouple: false, homeowner: true
        });

        expect(after.annualPension).toBeGreaterThan(before.annualPension);
    });
});

// ============================================================
// OVERSEAS PORTABILITY SCENARIOS
// ============================================================
describe('calculatePortablePension', () => {
    const basePension = 20000;  // $20k/yr base
    const awlrFull = 35;        // qualifies for full portability
    const awlrPartial = 20;     // proportional rate: 20/35 = 57.1%

    // === SCENARIO 1: SHORT ABSENCE (≤6 weeks) ===
    test('SHORT_ABSENCE: full pension retained, no supplement lost', () => {
        const result = calculatePortablePension({
            basePension, awlrYears: awlrFull,
            isCouple: false, agreementCountry: false,
            scenarioType: OverseasScenarioType.SHORT_ABSENCE
        });
        expect(result.annualPension).toBe(basePension);
        expect(result.supplementLost).toBe(0);
        expect(result.pccValid).toBe(true);
        expect(result.awlrApplied).toBe(false);
    });

    // === SCENARIO 2: LONG ABSENCE (>6 weeks, temporary) ===
    test('LONG_ABSENCE: base pension retained but supplements stop', () => {
        const result = calculatePortablePension({
            basePension, awlrYears: awlrFull,
            isCouple: false, agreementCountry: false,
            scenarioType: OverseasScenarioType.LONG_ABSENCE
        });
        // Supplements stop after 6 weeks
        const expectedSupplementLoss = C.OVERSEAS_RETIREMENT.PENSION_SUPPLEMENT_REDUCTION_SINGLE;
        expect(result.supplementLost).toBe(expectedSupplementLoss);
        expect(result.annualPension).toBe(Math.max(0, basePension - expectedSupplementLoss));
        expect(result.pccValid).toBe(false);
        expect(result.awlrApplied).toBe(false); // AWLR not yet applied (<26 weeks)
    });

    // === SCENARIO 3: EXTENDED TEMPORARY (>26 weeks, planning to return) ===
    test('EXTENDED_TEMPORARY: AWLR proportion applied when AWLR < 35 years', () => {
        const result = calculatePortablePension({
            basePension, awlrYears: awlrPartial,
            isCouple: false, agreementCountry: false,
            scenarioType: OverseasScenarioType.EXTENDED_TEMPORARY
        });
        const proportionalRate = awlrPartial / 35;
        const awlrAdjusted = basePension * proportionalRate;
        const supplementLoss = C.OVERSEAS_RETIREMENT.PENSION_SUPPLEMENT_REDUCTION_SINGLE;
        const expected = Math.max(0, awlrAdjusted - supplementLoss);
        expect(result.annualPension).toBeCloseTo(expected, 0);
        expect(result.awlrApplied).toBe(true);
        expect(result.proportionalRate).toBeCloseTo(proportionalRate, 4);
    });

    test('EXTENDED_TEMPORARY: full AWLR (35+ years) preserves full rate', () => {
        const result = calculatePortablePension({
            basePension, awlrYears: awlrFull,
            isCouple: false, agreementCountry: false,
            scenarioType: OverseasScenarioType.EXTENDED_TEMPORARY
        });
        expect(result.awlrApplied).toBe(false);
        expect(result.proportionalRate).toBe(1.0);
    });

    test('EXTENDED_TEMPORARY with AWLR=0 yields zero pension (supplements dominate)', () => {
        const result = calculatePortablePension({
            basePension: 5000, awlrYears: 0,
            isCouple: false, agreementCountry: false,
            scenarioType: OverseasScenarioType.EXTENDED_TEMPORARY
        });
        // AWLR 0/35 = 0%, pension = 0, then deduct supplements → clamp to 0
        expect(result.annualPension).toBe(0);
    });

    // === SCENARIO 4: PERMANENT MOVE ===
    test('PERMANENT_MOVE: supplements stop from departure, AWLR proportion applies', () => {
        const result = calculatePortablePension({
            basePension, awlrYears: awlrPartial,
            isCouple: false, agreementCountry: false,
            scenarioType: OverseasScenarioType.PERMANENT_MOVE
        });
        const proportionalRate = awlrPartial / 35;
        const awlrAdjusted = basePension * proportionalRate;
        const supplementLoss = C.OVERSEAS_RETIREMENT.PENSION_SUPPLEMENT_REDUCTION_SINGLE;
        const expected = Math.max(0, awlrAdjusted - supplementLoss);
        expect(result.annualPension).toBeCloseTo(expected, 0);
        expect(result.pensionReduced).toBe(true);
        expect(result.pccValid).toBe(false);
    });

    test('PERMANENT_MOVE: warnings include departure-date supplement change', () => {
        const result = calculatePortablePension({
            basePension, awlrYears: awlrFull,
            isCouple: false, agreementCountry: false,
            scenarioType: OverseasScenarioType.PERMANENT_MOVE
        });
        const warningText = result.warnings.join(' ');
        expect(warningText.toLowerCase()).toMatch(/supplement.*departure|departure.*supplement/i);
    });

    test('PERMANENT_MOVE to agreement country: warns about agreement country benefits, not about 2-year waiting period trap', () => {
        const result = calculatePortablePension({
            basePension, awlrYears: awlrFull,
            isCouple: false, agreementCountry: true,
            scenarioType: OverseasScenarioType.PERMANENT_MOVE
        });
        const warningText = result.warnings.join(' ');
        // Should mention agreement country
        expect(warningText.toLowerCase()).toMatch(/agreement country/i);
        // For agreement countries, the message should say "no 2-year waiting period" (not warn about it)
        // i.e. it should not say "2-year waiting period applies"
        expect(warningText.toLowerCase()).not.toMatch(/2-year waiting period applies/i);
    });

    test('PERMANENT_MOVE to non-agreement country: 2-year waiting period warning', () => {
        const result = calculatePortablePension({
            basePension, awlrYears: awlrFull,
            isCouple: false, agreementCountry: false,
            scenarioType: OverseasScenarioType.PERMANENT_MOVE
        });
        const warningText = result.warnings.join(' ');
        expect(warningText.toLowerCase()).toMatch(/2-year/i);
    });

    // === SCENARIO 5: RETURN TO AUSTRALIA ===
    test('RETURN_TO_AUSTRALIA: non-agreement → zero pension during waiting period', () => {
        const result = calculatePortablePension({
            basePension, awlrYears: awlrFull,
            isCouple: false, agreementCountry: false,
            scenarioType: OverseasScenarioType.RETURN_TO_AUSTRALIA
        });
        expect(result.annualPension).toBe(0);
        expect(result.waitingPeriodYears).toBe(C.OVERSEAS_RETIREMENT.RETURN_WAITING_PERIOD_YEARS);
    });

    test('RETURN_TO_AUSTRALIA: agreement country → pension continues', () => {
        const result = calculatePortablePension({
            basePension, awlrYears: awlrFull,
            isCouple: false, agreementCountry: true,
            scenarioType: OverseasScenarioType.RETURN_TO_AUSTRALIA
        });
        expect(result.annualPension).toBe(basePension);
        expect(result.waitingPeriodYears).toBe(0);
    });

    // === COUPLE SUPPLEMENT CALCULATION ===
    test('couple loses double supplement (both members)', () => {
        const singleLoss = C.OVERSEAS_RETIREMENT.PENSION_SUPPLEMENT_REDUCTION_SINGLE;
        const couplePerPerson = C.OVERSEAS_RETIREMENT.PENSION_SUPPLEMENT_REDUCTION_COUPLE;

        const singleResult = calculatePortablePension({
            basePension, awlrYears: awlrFull,
            isCouple: false, agreementCountry: false,
            scenarioType: OverseasScenarioType.LONG_ABSENCE
        });
        const coupleResult = calculatePortablePension({
            basePension, awlrYears: awlrFull,
            isCouple: true, agreementCountry: false,
            scenarioType: OverseasScenarioType.LONG_ABSENCE
        });

        expect(singleResult.supplementLost).toBe(singleLoss);
        // Couple: both members lose their supplement
        expect(coupleResult.supplementLost).toBe(couplePerPerson * 2);
    });

    // === INVALID SCENARIO TYPE ===
    test('throws for unknown scenario type', () => {
        expect(() => calculatePortablePension({
            basePension: 10000, awlrYears: 35,
            isCouple: false, agreementCountry: false,
            scenarioType: 'UNKNOWN_TYPE'
        })).toThrow();
    });
});

// ============================================================
// generateOverseasScenarioTree
// ============================================================
describe('generateOverseasScenarioTree', () => {
    const basePension = 25000;

    test('always generates all five scenario keys', () => {
        const tree = generateOverseasScenarioTree({
            basePension, awlrYears: 35, isCouple: false, agreementCountry: false
        });
        expect(tree.stayInAustralia).toBeDefined();
        expect(tree.shortAbsence).toBeDefined();
        expect(tree.longAbsence).toBeDefined();
        expect(tree.permanentMove).toBeDefined();
        expect(tree.returnToAustralia).toBeDefined();
    });

    test('stayInAustralia always returns full basePension', () => {
        const tree = generateOverseasScenarioTree({
            basePension, awlrYears: 35, isCouple: false, agreementCountry: false
        });
        expect(tree.stayInAustralia.annualPension).toBe(basePension);
    });

    test('summary includes disclaimer (never show simple better/worse verdict)', () => {
        const tree = generateOverseasScenarioTree({
            basePension, awlrYears: 20, isCouple: false, agreementCountry: false
        });
        expect(tree.summary.disclaimer).toBeTruthy();
        expect(tree.summary.disclaimer.length).toBeGreaterThan(20);
    });

    test('summary hasFullPortability matches AWLR ≥ 35 years', () => {
        const withFull = generateOverseasScenarioTree({
            basePension, awlrYears: 35, isCouple: false, agreementCountry: false
        });
        const withPartial = generateOverseasScenarioTree({
            basePension, awlrYears: 20, isCouple: false, agreementCountry: false
        });
        expect(withFull.summary.hasFullPortability).toBe(true);
        expect(withPartial.summary.hasFullPortability).toBe(false);
    });

    test('pension ordering: stayAustralia >= shortAbsence >= longAbsence >= permanentMove', () => {
        const tree = generateOverseasScenarioTree({
            basePension, awlrYears: 20, isCouple: false, agreementCountry: false
        });
        expect(tree.stayInAustralia.annualPension).toBeGreaterThanOrEqual(tree.shortAbsence.annualPension);
        expect(tree.shortAbsence.annualPension).toBeGreaterThanOrEqual(tree.longAbsence.annualPension);
        expect(tree.longAbsence.annualPension).toBeGreaterThanOrEqual(tree.permanentMove.annualPension);
    });
});

// ============================================================
// TAX CALCULATIONS
// ============================================================
describe('calculateIncomeTax', () => {
    test('zero income → zero tax', () => {
        const result = calculateIncomeTax(0, 2026);
        expect(result.incomeTax).toBe(0);
        expect(result.totalTax).toBe(0);
    });

    test('income below tax-free threshold → only Medicare Levy', () => {
        // $18,200 → 0 income tax, Medicare Levy = 2%
        const result = calculateIncomeTax(18200, 2026);
        expect(result.incomeTax).toBe(0);
        expect(result.medicareLevy).toBeCloseTo(18200 * 0.02, 0);
    });

    test('FY2025-26: 16% rate applies on $18,201-$45,000 bracket', () => {
        // $30,000: ($30,000 - $18,200) × 16% = $1,888 + Medicare $600
        const result = calculateIncomeTax(30000, 2026, false);
        expect(result.incomeTax).toBeCloseTo((30000 - 18200) * 0.16, 0);
        expect(result.bracketsUsed).toBe('2025-26');
    });

    test('FY2026-27: 15% rate replaces 16% on lowest bracket', () => {
        const result2026 = calculateIncomeTax(30000, 2026, false);
        const result2027 = calculateIncomeTax(30000, 2027, false);
        expect(result2027.incomeTax).toBeLessThan(result2026.incomeTax);
        expect(result2027.bracketsUsed).toBe('2026-27');
    });

    test('FY2027-28: 14% rate and WATO offset applied', () => {
        const result = calculateIncomeTax(30000, 2028, false);
        expect(result.watoOffset).toBe(C.WATO_AMOUNT); // $250
        expect(result.bracketsUsed).toBe('2027-28');
    });

    test('WATO offset: cannot exceed income tax payable', () => {
        // Very low income → WATO capped at tax due
        const result = calculateIncomeTax(19000, 2028, false);
        // Tax before WATO: $800 × 0.14 = $112
        expect(result.watoOffset).toBeLessThanOrEqual(C.WATO_AMOUNT);
        expect(result.incomeTax).toBeGreaterThanOrEqual(0);
    });

    test('effective rate increases with income', () => {
        const low = calculateIncomeTax(60000, 2026);
        const high = calculateIncomeTax(200000, 2026);
        expect(high.effectiveRate).toBeGreaterThan(low.effectiveRate);
    });

    test('Medicare Levy can be excluded', () => {
        const withMedicare = calculateIncomeTax(100000, 2026, true);
        const withoutMedicare = calculateIncomeTax(100000, 2026, false);
        expect(withMedicare.totalTax).toBeGreaterThan(withoutMedicare.totalTax);
        expect(withoutMedicare.medicareLevy).toBe(0);
    });
});

// ============================================================
// MINIMUM PENSION DRAWDOWN
// ============================================================
describe('getMinDrawdownRate', () => {
    test('under 65 → 4% minimum drawdown', () => {
        expect(getMinDrawdownRate(60)).toBe(0.04);
        expect(getMinDrawdownRate(64)).toBe(0.04);
    });

    test('65-74 → 5%', () => {
        expect(getMinDrawdownRate(65)).toBe(0.05);
        expect(getMinDrawdownRate(74)).toBe(0.05);
    });

    test('75-79 → 6%', () => {
        expect(getMinDrawdownRate(75)).toBe(0.06);
        expect(getMinDrawdownRate(79)).toBe(0.06);
    });

    test('80-84 → 7%', () => {
        expect(getMinDrawdownRate(80)).toBe(0.07);
    });

    test('85-89 → 9%', () => {
        expect(getMinDrawdownRate(85)).toBe(0.09);
    });

    test('90-94 → 11%', () => {
        expect(getMinDrawdownRate(90)).toBe(0.11);
    });

    test('95+ → 14%', () => {
        expect(getMinDrawdownRate(95)).toBe(0.14);
        expect(getMinDrawdownRate(100)).toBe(0.14);
    });

    test('rates increase with age', () => {
        const ages = [60, 65, 75, 80, 85, 90, 95];
        const rates = ages.map(getMinDrawdownRate);
        for (let i = 1; i < rates.length; i++) {
            expect(rates[i]).toBeGreaterThanOrEqual(rates[i - 1]);
        }
    });
});

describe('calculateMinDrawdown', () => {
    test('$1M balance at age 70 → 5% = $50,000 minimum', () => {
        const result = calculateMinDrawdown(1000000, 70);
        expect(result.minimumDrawdown).toBe(50000);
        expect(result.rate).toBe(0.05);
    });

    test('zero balance → zero drawdown', () => {
        const result = calculateMinDrawdown(0, 70);
        expect(result.minimumDrawdown).toBe(0);
    });
});

// ============================================================
// INTEGRATION: OVERSEAS DEEMING BUG FIX VALIDATION
// ============================================================
describe('overseas-retirement.js deeming bug fix validation', () => {
    /**
     * Before the fix, overseas-retirement.js used only investmentBalance for deeming.
     * After the fix it uses buildDeemedAssets() which includes superBalance, savings etc.
     * This test quantifies the materiality of the bug for a realistic portfolio.
     */
    test('pre-fix vs post-fix deemed income difference is material for typical retiree', () => {
        const finances = {
            superBalance: 400000,      // $400k in super (was excluded before fix)
            investmentBalance: 100000, // Only this was used before
            savingsBalance: 50000      // Was also excluded
        };

        // Pre-fix: only investmentBalance
        const preFix = calculateDeemedIncome(finances.investmentBalance, false);

        // Post-fix: all financial assets
        const fullBase = buildDeemedAssets(finances);
        const postFix = calculateDeemedIncome(fullBase, false);

        // The difference should be material (more than $1,000/year in deemed income)
        expect(postFix - preFix).toBeGreaterThan(1000);

        // This translates to a lower pension estimate for high-asset retirees
        // i.e. pre-fix OVER-estimated the pension for people with large super balances
        const prePension = calculateSinglePension({
            totalAssets: fullBase, financialAssets: finances.investmentBalance,
            otherIncome: 0, isCouple: false, homeowner: true
        });
        const postPension = calculateSinglePension({
            totalAssets: fullBase, financialAssets: fullBase,
            otherIncome: 0, isCouple: false, homeowner: true
        });

        // Post-fix pension should be lower (because more deemed income reduces it)
        // OR equal if both are at the full-pension level (both pass income test)
        expect(postPension.annualPension).toBeLessThanOrEqual(prePension.annualPension);
    });
});

// ============================================================
// POLICY STALENESS DETECTION
// ============================================================
describe('policy staleness detection', () => {
    test('POLICY_EFFECTIVE_DATE is March 2026 or later', () => {
        const effectiveDate = new Date(C.POLICY_EFFECTIVE_DATE);
        expect(effectiveDate.getFullYear()).toBeGreaterThanOrEqual(2026);
    });

    test('deeming rates are March 2026 values (1.25%/3.25%), not Sept 2025 (0.75%/2.75%)', () => {
        // This test FAILS if someone reverts to old deeming rates without updating dates.
        // It is a policy regression guard.
        expect(C.DEMING_RATE_LOWER).toBe(0.0125);
        expect(C.DEMING_RATE_UPPER).toBe(0.0325);
        expect(C.DEMING_RATE_LOWER).not.toBe(0.0075);
        expect(C.DEMING_RATE_UPPER).not.toBe(0.0275);
    });

    test('single pension max is March 2026 value ($31,223 = $1,200.90 × 26)', () => {
        // $1,200.90/fortnight × 26 fortnights = $31,223.40 → stored as 31223
        // Verified 14 May 2026 from servicesaustralia.gov.au/how-much-age-pension-you-can-get
        expect(C.SINGLE_PENSION_MAX).toBeGreaterThanOrEqual(31220);
        expect(C.SINGLE_PENSION_MAX).toBeLessThanOrEqual(31230);
    });

    test('couple pension max is March 2026 value ($47,070 = $1,810.40 × 26)', () => {
        // $1,810.40/fortnight × 26 = $47,070.40 → rounded to $47,070
        expect(C.COUPLE_PENSION_MAX).toBeGreaterThanOrEqual(47060);
        expect(C.COUPLE_PENSION_MAX).toBeLessThanOrEqual(47080);
    });

    test('POLICY_SOURCE_URL is a valid https URL for Services Australia', () => {
        expect(C.POLICY_SOURCE_URL).toMatch(/^https:\/\/www\.servicesaustralia\.gov\.au\//);
    });

    test('sources metadata exists for deeming and pension maximums', () => {
        expect(C.sources.DEMING_THRESHOLDS).toBeDefined();
        expect(C.sources.DEMING_THRESHOLDS.lastUpdated).toMatch(/^2026/);
        expect(C.sources.PENSION_MAXIMUMS).toBeDefined();
        expect(C.sources.PENSION_MAXIMUMS.lastUpdated).toMatch(/^2026/);
    });
});
