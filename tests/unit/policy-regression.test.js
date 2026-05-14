/**
 * policy-regression.test.js
 *
 * Policy regression tests that WILL FAIL when:
 * 1. Services Australia updates Age Pension rates (every 20 March and 20 September)
 *    and the config metadata is not updated to reflect the new rates.
 * 2. Someone accidentally reverts deeming rates or pension maximums to old values.
 * 3. The next review date has passed and rates have not been reviewed.
 *
 * QA CHECKLIST — Run these tests after each Age Pension indexation:
 * 1. Check servicesaustralia.gov.au/how-much-age-pension-you-can-get for new rates
 * 2. Check servicesaustralia.gov.au/deeming for new deeming rates
 * 3. Check servicesaustralia.gov.au/assets for new asset thresholds
 * 4. Update config.js with new values and new POLICY_EFFECTIVE_DATE
 * 5. Update POLICY_NEXT_REVIEW_DATE to next indexation date
 * 6. Run this test suite — all tests should pass
 * 7. Update sources metadata with new lastUpdated dates
 */

import { ENHANCED_CONFIG } from '../../src/js/config.js';

const C = ENHANCED_CONFIG;

// ============================================================
// POLICY FRESHNESS GUARD
// ============================================================
describe('Policy freshness guard', () => {
    test('POLICY_EFFECTIVE_DATE is defined and valid', () => {
        expect(C.POLICY_EFFECTIVE_DATE).toBeDefined();
        expect(C.POLICY_EFFECTIVE_DATE).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test('POLICY_NEXT_REVIEW_DATE is defined and valid', () => {
        expect(C.POLICY_NEXT_REVIEW_DATE).toBeDefined();
        expect(C.POLICY_NEXT_REVIEW_DATE).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    test('POLICY_NEXT_REVIEW_DATE is after POLICY_EFFECTIVE_DATE', () => {
        const effective = new Date(C.POLICY_EFFECTIVE_DATE);
        const nextReview = new Date(C.POLICY_NEXT_REVIEW_DATE);
        expect(nextReview > effective).toBe(true);
    });

    /**
     * STALENESS TEST: This test FAILS if today is past the next review date.
     *
     * If this test fails, it means Services Australia has likely updated Age Pension
     * rates and the config needs to be reviewed and updated.
     *
     * When updating:
     * 1. Update POLICY_EFFECTIVE_DATE to the new effective date
     * 2. Update POLICY_NEXT_REVIEW_DATE to the following indexation date
     * 3. Update all rate constants with new values
     * 4. Update sources.DEMING_THRESHOLDS.lastUpdated and sources.PENSION_MAXIMUMS.lastUpdated
     */
    test('STALENESS GUARD: config has not passed its next review date', () => {
        const nextReview = new Date(C.POLICY_NEXT_REVIEW_DATE);
        const today = new Date();
        // Allow a 30-day grace period after review date before failing
        const gracePeriodMs = 30 * 24 * 60 * 60 * 1000;

        if (today > new Date(nextReview.getTime() + gracePeriodMs)) {
            // Instead of failing hard, this provides a clear error message
            throw new Error(
                `POLICY STALE: Config next review date was ${C.POLICY_NEXT_REVIEW_DATE} ` +
                `(today is ${today.toISOString().slice(0, 10)}). ` +
                `Services Australia may have updated Age Pension rates. ` +
                `Check: https://www.servicesaustralia.gov.au/how-much-age-pension-you-can-get ` +
                `and update config.js with new values.`
            );
        }
        // If we reach here, config is current
        expect(true).toBe(true);
    });
});

// ============================================================
// DEEMING RATE REGRESSION
// ============================================================
describe('Deeming rate regression', () => {
    /**
     * Services Australia published these rates effective 20 March 2026:
     * - 1.25% on amounts below the threshold
     * - 3.25% on amounts above the threshold
     *
     * Previous rates (Sept 2025): 0.75% / 2.75%
     * Rate changes are published at: servicesaustralia.gov.au/deeming
     */

    test('lower deeming rate is 1.25% (March 2026)', () => {
        expect(C.DEMING_RATE_LOWER).toBe(0.0125);
    });

    test('upper deeming rate is 3.25% (March 2026)', () => {
        expect(C.DEMING_RATE_UPPER).toBe(0.0325);
    });

    test('lower deeming rate is NOT the Sept 2025 value (0.75%)', () => {
        expect(C.DEMING_RATE_LOWER).not.toBe(0.0075);
    });

    test('upper deeming rate is NOT the Sept 2025 value (2.75%)', () => {
        expect(C.DEMING_RATE_UPPER).not.toBe(0.0275);
    });

    test('single deeming threshold is defined and reasonable', () => {
        expect(C.DEMING_THRESHOLD_SINGLE).toBeGreaterThan(50000);
        expect(C.DEMING_THRESHOLD_SINGLE).toBeLessThan(200000);
    });

    test('couple deeming threshold is larger than single threshold', () => {
        expect(C.DEMING_THRESHOLD_COUPLE).toBeGreaterThan(C.DEMING_THRESHOLD_SINGLE);
    });

    test('deeming source metadata is up-to-date (2026)', () => {
        const src = C.sources.DEMING_THRESHOLDS;
        expect(src).toBeDefined();
        expect(src.lastUpdated).toMatch(/^2026/);
    });
});

// ============================================================
// AGE PENSION RATE REGRESSION
// ============================================================
describe('Age Pension rate regression', () => {
    /**
     * Services Australia published these rates effective 20 March 2026:
     * - Single: $1,200.90 per fortnight
     * - Couple combined: $1,810.40 per fortnight
     *
     * Annual: multiply by 26 fortnights
     */

    const SINGLE_FN_RATE = 1200.90;
    const COUPLE_FN_RATE = 1810.40;

    test('single pension max is approx $1,200.90/fn × 26 fortnights', () => {
        const expectedAnnual = SINGLE_FN_RATE * 26;
        // Allow ±$10 rounding
        expect(C.SINGLE_PENSION_MAX).toBeGreaterThanOrEqual(expectedAnnual - 10);
        expect(C.SINGLE_PENSION_MAX).toBeLessThanOrEqual(expectedAnnual + 10);
    });

    test('couple pension max is approx $1,810.40/fn × 26 fortnights', () => {
        const expectedAnnual = COUPLE_FN_RATE * 26;
        // Allow ±$10 rounding
        expect(C.COUPLE_PENSION_MAX).toBeGreaterThanOrEqual(expectedAnnual - 10);
        expect(C.COUPLE_PENSION_MAX).toBeLessThanOrEqual(expectedAnnual + 10);
    });

    test('couple max is greater than single max', () => {
        expect(C.COUPLE_PENSION_MAX).toBeGreaterThan(C.SINGLE_PENSION_MAX);
    });

    test('single max is NOT the Sept 2025 value ($30,646)', () => {
        // Old value: $1,178.70/fn × 26 = $30,646.20
        expect(C.SINGLE_PENSION_MAX).not.toBe(30646);
    });

    test('couple max is NOT the Sept 2025 value ($46,202)', () => {
        // Old value: $1,777.00/fn × 26 = $46,202
        expect(C.COUPLE_PENSION_MAX).not.toBe(46202);
    });

    test('pension source metadata is up-to-date (2026)', () => {
        const src = C.sources.PENSION_MAXIMUMS;
        expect(src).toBeDefined();
        expect(src.lastUpdated).toMatch(/^2026/);
    });

    /**
     * PINNED VALUES — Verified 14 May 2026 from servicesaustralia.gov.au/how-much-age-pension-you-can-get
     * Single: $1,200.90/fn × 26 = $31,223.40 → stored as 31223
     * Couple combined: $1,810.40/fn × 26 = $47,070.40 → stored as 47070
     */
    test('PINNED: single pension max matches verified March 2026 value ($1,200.90/fn × 26)', () => {
        expect(C.SINGLE_PENSION_MAX).toBe(31223);
    });

    test('PINNED: couple pension max matches verified March 2026 value ($1,810.40/fn × 26)', () => {
        expect(C.COUPLE_PENSION_MAX).toBe(47070);
    });
});

// ============================================================
// ASSET THRESHOLD REGRESSION
// ============================================================
describe('Asset threshold regression', () => {
    test('single homeowner full pension threshold is above $300,000', () => {
        expect(C.SINGLE_ASSET_THRESHOLD).toBeGreaterThan(300000);
    });

    test('single homeowner part pension cutoff is below $800,000', () => {
        expect(C.SINGLE_ASSET_LIMIT).toBeLessThan(800000);
    });

    test('couple homeowner full pension threshold is above $450,000', () => {
        expect(C.COUPLE_ASSET_THRESHOLD).toBeGreaterThan(450000);
    });

    test('couple homeowner part pension cutoff is above $1,000,000', () => {
        expect(C.COUPLE_ASSET_LIMIT).toBeGreaterThan(1000000);
    });

    test('non-homeowner supplement is defined and positive', () => {
        expect(C.NON_HOMEOWNER_ASSET_SUPPLEMENT).toBeGreaterThan(0);
    });

    test('non-homeowner thresholds are exactly supplement higher than homeowner equivalents', () => {
        // Verified 14 May 2026: supplement is consistently $258,000 across all four thresholds
        const supp = C.NON_HOMEOWNER_ASSET_SUPPLEMENT;
        expect(supp).toBe(258000);
        expect(C.SINGLE_ASSET_THRESHOLD_NON_HOMEOWNER - C.SINGLE_ASSET_THRESHOLD).toBe(supp);
        expect(C.SINGLE_ASSET_LIMIT_NON_HOMEOWNER - C.SINGLE_ASSET_LIMIT).toBe(supp);
        expect(C.COUPLE_ASSET_THRESHOLD_NON_HOMEOWNER - C.COUPLE_ASSET_THRESHOLD).toBe(supp);
        expect(C.COUPLE_ASSET_LIMIT_NON_HOMEOWNER - C.COUPLE_ASSET_LIMIT).toBe(supp);
    });

    /**
     * PINNED VALUES — Verified 14 May 2026 from servicesaustralia.gov.au/assets-test-for-age-pension
     * These tests fail immediately if someone changes a threshold without updating the source comment.
     */
    test('PINNED: single homeowner thresholds match verified March 2026 values', () => {
        expect(C.SINGLE_ASSET_THRESHOLD).toBe(321500);
        expect(C.SINGLE_ASSET_LIMIT).toBe(722000);
    });

    test('PINNED: single non-homeowner thresholds match verified March 2026 values', () => {
        expect(C.SINGLE_ASSET_THRESHOLD_NON_HOMEOWNER).toBe(579500);
        expect(C.SINGLE_ASSET_LIMIT_NON_HOMEOWNER).toBe(980000);
    });

    test('PINNED: couple homeowner thresholds match verified March 2026 values', () => {
        expect(C.COUPLE_ASSET_THRESHOLD).toBe(481500);
        expect(C.COUPLE_ASSET_LIMIT).toBe(1085000);
    });

    test('PINNED: couple non-homeowner thresholds match verified March 2026 values', () => {
        expect(C.COUPLE_ASSET_THRESHOLD_NON_HOMEOWNER).toBe(739500);
        expect(C.COUPLE_ASSET_LIMIT_NON_HOMEOWNER).toBe(1343000);
    });

    test('asset thresholds source metadata is up-to-date (2026)', () => {
        const src = C.sources.ASSET_THRESHOLDS;
        expect(src).toBeDefined();
        expect(src.lastUpdated).toMatch(/^2026/);
    });
});

// ============================================================
// INCOME THRESHOLD REGRESSION
// ============================================================
describe('Income threshold regression', () => {
    test('single income threshold is defined and reasonable (per fortnight)', () => {
        expect(C.SINGLE_INCOME_THRESHOLD).toBeGreaterThan(150);
        expect(C.SINGLE_INCOME_THRESHOLD).toBeLessThan(500);
    });

    test('couple income threshold is greater than single threshold', () => {
        expect(C.COUPLE_INCOME_THRESHOLD).toBeGreaterThan(C.SINGLE_INCOME_THRESHOLD);
    });

    test('income threshold source metadata is up-to-date (2026)', () => {
        const src = C.sources.INCOME_THRESHOLDS;
        expect(src).toBeDefined();
        expect(src.lastUpdated).toMatch(/^2026/);
    });

    /**
     * PINNED VALUES — Verified 14 May 2026 from servicesaustralia.gov.au/income-test-for-age-pension
     * Income thresholds are UNCHANGED from Sept 2025 ($218 single, $380 couple).
     */
    test('PINNED: income thresholds match verified March 2026 values (unchanged from Sept 2025)', () => {
        expect(C.SINGLE_INCOME_THRESHOLD).toBe(218);
        expect(C.COUPLE_INCOME_THRESHOLD).toBe(380);
    });
});

// ============================================================
// OVERSEAS RETIREMENT RULES REGRESSION
// ============================================================
describe('Overseas retirement rules regression', () => {
    const OVS = C.OVERSEAS_RETIREMENT;

    test('pension age is 67', () => {
        expect(OVS.PENSION_AGE).toBe(67);
    });

    test('short absence threshold is 6 weeks', () => {
        expect(OVS.SHORT_ABSENCE_WEEKS).toBe(6);
    });

    test('portability threshold is 26 weeks', () => {
        expect(OVS.PORTABILITY_THRESHOLD_WEEKS).toBe(26);
    });

    test('AWLR required for full portability is 35 years', () => {
        expect(OVS.AWLR_REQUIRED_FOR_FULL).toBe(35);
    });

    test('return waiting period is 2 years (non-agreement countries)', () => {
        expect(OVS.RETURN_WAITING_PERIOD_YEARS).toBe(2);
    });

    test('supplement reduction amounts are positive', () => {
        expect(OVS.PENSION_SUPPLEMENT_REDUCTION_SINGLE).toBeGreaterThan(0);
        expect(OVS.PENSION_SUPPLEMENT_REDUCTION_COUPLE).toBeGreaterThan(0);
    });

    test('agreement countries list contains expected countries', () => {
        // These countries have had agreements for many years and should remain
        const expectedCountries = ['usa', 'ireland', 'germany', 'new-zealand', 'italy'];
        expectedCountries.forEach(country => {
            expect(OVS.AGREEMENT_COUNTRIES).toContain(country);
        });
    });
});

// ============================================================
// TAX BRACKETS REGRESSION
// ============================================================
describe('Tax bracket regression', () => {
    test('2025-26: lowest rate is 16% on $18,201-$45,000', () => {
        const bracket = C.TAX_BRACKETS.find(b => b.min === 18201);
        expect(bracket).toBeDefined();
        expect(bracket.rate).toBe(0.16);
    });

    test('2026-27: lowest rate drops to 15%', () => {
        const bracket = C.TAX_BRACKETS_2026_27.find(b => b.min === 18201);
        expect(bracket).toBeDefined();
        expect(bracket.rate).toBe(0.15);
    });

    test('2027-28: lowest rate drops to 14%', () => {
        const bracket = C.TAX_BRACKETS_2027_28.find(b => b.min === 18201);
        expect(bracket).toBeDefined();
        expect(bracket.rate).toBe(0.14);
    });

    test('WATO: $250 per year from FY2027-28', () => {
        expect(C.WATO_AMOUNT).toBe(250);
        expect(C.WATO_START_FY).toBe(2028);
    });

    test('all bracket schedules have zero-rate band (tax-free threshold)', () => {
        const taxFreeThreshold = 18200;
        [C.TAX_BRACKETS, C.TAX_BRACKETS_2026_27, C.TAX_BRACKETS_2027_28].forEach(schedule => {
            const zeroBand = schedule.find(b => b.rate === 0);
            expect(zeroBand).toBeDefined();
            expect(zeroBand.max).toBe(taxFreeThreshold);
        });
    });
});

// ============================================================
// SUPER CAPS REGRESSION
// ============================================================
describe('Super caps regression', () => {
    test('concessional cap is $30,000 (2024-25+)', () => {
        expect(C.CONCESSIONAL_CAP).toBe(30000);
    });

    test('non-concessional cap is $120,000', () => {
        expect(C.NON_CONCESSIONAL_CAP).toBe(120000);
    });

    test('transfer balance cap is $2,000,000', () => {
        expect(C.TRANSFER_BALANCE_CAP).toBe(2000000);
    });

    test('NCC block threshold matches transfer balance cap', () => {
        expect(C.TSB_NCC_BLOCK_THRESHOLD).toBe(C.TRANSFER_BALANCE_CAP);
    });
});

// ============================================================
// MINIMUM DRAWDOWN RATES REGRESSION
// ============================================================
describe('Minimum drawdown rates regression', () => {
    test('drawdown rates array has all required age bands', () => {
        // ATO Schedule 7 requires bands starting at 0 and going to 95+
        const rates = C.MIN_PENSION_DRAWDOWN_RATES;
        expect(rates.some(r => r.minAge === 0)).toBe(true);
        expect(rates.some(r => r.maxAge >= 999)).toBe(true);
    });

    test('drawdown rates are monotonically non-decreasing with age', () => {
        const sorted = [...C.MIN_PENSION_DRAWDOWN_RATES].sort((a, b) => a.minAge - b.minAge);
        for (let i = 1; i < sorted.length; i++) {
            expect(sorted[i].rate).toBeGreaterThanOrEqual(sorted[i - 1].rate);
        }
    });

    test('under-65 rate is 4%', () => {
        const band = C.MIN_PENSION_DRAWDOWN_RATES.find(r => r.minAge === 0 && r.maxAge === 64);
        expect(band).toBeDefined();
        expect(band.rate).toBe(0.04);
    });

    test('95+ rate is 14%', () => {
        const band = C.MIN_PENSION_DRAWDOWN_RATES.find(r => r.minAge === 95);
        expect(band).toBeDefined();
        expect(band.rate).toBe(0.14);
    });
});
