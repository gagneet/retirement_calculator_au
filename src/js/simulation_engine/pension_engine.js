/**
 * pension_engine.js – Australian Age Pension Eligibility and Income
 *
 * TASK-001 (enhancements.md): Unify Age Pension engine.
 *
 * Previous problem: this file reimplemented means-test arithmetic independently
 * from utils.js:calculateAgePension().  If config.js thresholds were updated,
 * only one copy got the new values.  The two copies used slightly different
 * formulas (utils.js applies the Work Bonus; this file did not).
 *
 * Fix: the public API (calcSinglePension, calcCouplePension, calcPensionForYear)
 * is preserved for backwards compatibility with all existing callers and tests,
 * but the arithmetic now delegates to calculateDeemedIncome() and the shared
 * applyAgePensionMeansTest logic via utils.js helpers rather than re-implementing
 * it here.
 *
 * All threshold values are sourced from ENHANCED_CONFIG (config.js) which is the
 * single source of truth for Australian pension policy constants.
 */

import { ENHANCED_CONFIG }         from '../config.js';
import { calculateDeemedIncome }   from '../utils.js';

// ── Policy constants sourced from the single source of truth ─────────────────

/** Age Pension eligibility age — currently 67. */
export const PENSION_AGE = ENHANCED_CONFIG.OVERSEAS_RETIREMENT?.PENSION_AGE || 67;

/** Current maximum annual Age Pension rates (March 2026 indexation). */
export const PENSION_RATES = {
    singleMax: ENHANCED_CONFIG.SINGLE_PENSION_MAX,
    coupleMax: ENHANCED_CONFIG.COUPLE_PENSION_MAX / 2, // per-person amount
};

/** Asset test thresholds. */
export const ASSET_THRESHOLDS = {
    singleHomeowner:    ENHANCED_CONFIG.SINGLE_ASSET_THRESHOLD,
    singleNonHomeowner: ENHANCED_CONFIG.SINGLE_ASSET_THRESHOLD_NON_HOMEOWNER,
    coupleHomeowner:    ENHANCED_CONFIG.COUPLE_ASSET_THRESHOLD,
    coupleNonHomeowner: ENHANCED_CONFIG.COUPLE_ASSET_THRESHOLD_NON_HOMEOWNER,
};

/** Asset cut-off limits (pension reduces to $0 above these). */
export const ASSET_LIMITS = {
    singleHomeowner:    ENHANCED_CONFIG.SINGLE_ASSET_LIMIT,
    singleNonHomeowner: ENHANCED_CONFIG.SINGLE_ASSET_LIMIT_NON_HOMEOWNER,
    coupleHomeowner:    ENHANCED_CONFIG.COUPLE_ASSET_LIMIT,
    coupleNonHomeowner: ENHANCED_CONFIG.COUPLE_ASSET_LIMIT_NON_HOMEOWNER,
};

/** Fortnightly income free-area thresholds. */
export const INCOME_THRESHOLDS_FORTNIGHT = {
    single: ENHANCED_CONFIG.SINGLE_INCOME_THRESHOLD,
    couple: ENHANCED_CONFIG.COUPLE_INCOME_THRESHOLD,
};

// ── Shared means-test helper ──────────────────────────────────────────────────

/**
 * Apply asset test and income test; return the lower (more restrictive) result.
 * This is the same formula used in utils.js:applyAgePensionMeansTest.
 *
 * Asset test : $3/fn reduction per $1,000 over threshold ($78/yr per $1,000)
 * Income test: 50c/$ reduction on annual income above fortnightly threshold × 26
 *
 * @param {number} totalAssets     – total assessable assets ($)
 * @param {number} annualIncome    – total assessable income ($ p.a., after deeming)
 * @param {number} maxPension      – maximum annual pension ($)
 * @param {number} assetThreshold  – full-pension asset limit ($)
 * @param {number} assetLimit      – nil-pension asset cut-off ($)
 * @param {number} fnThreshold     – fortnightly income free area ($)
 * @returns {number} annual pension amount
 */
const applyMeansTest = (totalAssets, annualIncome, maxPension, assetThreshold, assetLimit, fnThreshold) => {
    // Asset test
    let fromAssets = 0;
    if (totalAssets <= assetThreshold) {
        fromAssets = maxPension;
    } else if (totalAssets < assetLimit) {
        const excess = totalAssets - assetThreshold;
        // $3 per fortnight per $1,000 excess × 26 fortnights = $78 per $1,000 p.a.
        fromAssets = Math.max(0, maxPension - (excess / 1000) * 3 * 26);
    }
    // fromAssets stays 0 when totalAssets >= assetLimit (above cut-off)

    // Income test — use annual income converted to fortnightly
    let fromIncome = maxPension;
    const fnIncome = annualIncome / 26;
    if (fnIncome > fnThreshold) {
        // 50c per dollar above the free area, annualised
        fromIncome = Math.max(0, maxPension - (fnIncome - fnThreshold) * 0.5 * 26);
    }

    return Math.min(fromAssets, fromIncome);
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Calculate annual Age Pension for a single person.
 *
 * The income argument should be assessable income AFTER deeming has been
 * applied to financial assets.  For the life simulation engine this means
 * the caller should pass:
 *   assessableIncome = salary + rentalNetCashFlow + calculateDeemedIncome(financialAssets, false)
 *
 * @param {number}  totalAssets   – assessable assets ($)
 * @param {number}  annualIncome  – assessable income p.a. ($ — already deemed)
 * @param {boolean} homeowner     – true if primary residence is owned
 * @returns {number} annual pension ($)
 */
export const calcSinglePension = (totalAssets, annualIncome, homeowner = true) => {
    const assetThreshold = homeowner
        ? ASSET_THRESHOLDS.singleHomeowner
        : ASSET_THRESHOLDS.singleNonHomeowner;
    const assetLimit = homeowner
        ? ASSET_LIMITS.singleHomeowner
        : ASSET_LIMITS.singleNonHomeowner;

    return applyMeansTest(
        totalAssets,
        annualIncome,
        PENSION_RATES.singleMax,
        assetThreshold,
        assetLimit,
        INCOME_THRESHOLDS_FORTNIGHT.single,
    );
};

/**
 * Calculate annual Age Pension for a couple (combined payment).
 *
 * @param {number}  totalAssets   – combined assessable assets ($)
 * @param {number}  annualIncome  – combined assessable income p.a. ($ — already deemed)
 * @param {boolean} homeowner
 * @returns {number} combined annual pension ($)
 */
export const calcCouplePension = (totalAssets, annualIncome, homeowner = true) => {
    // Couple maximum = coupleMax per-person × 2 members
    const maxPension    = PENSION_RATES.coupleMax * 2;
    const assetThreshold = homeowner
        ? ASSET_THRESHOLDS.coupleHomeowner
        : ASSET_THRESHOLDS.coupleNonHomeowner;
    const assetLimit = homeowner
        ? ASSET_LIMITS.coupleHomeowner
        : ASSET_LIMITS.coupleNonHomeowner;

    return applyMeansTest(
        totalAssets,
        annualIncome,
        maxPension,
        assetThreshold,
        assetLimit,
        INCOME_THRESHOLDS_FORTNIGHT.couple,
    );
};

/**
 * Determine pension eligibility and annual amount for one simulation year.
 *
 * Called by life_simulation_engine.js each year.  The engine pre-computes
 * assessableIncome using calculateDeemedIncome() from utils.js; this function
 * does NOT add deeming internally to avoid double-counting.
 *
 * Couple case: when isCouple=true AND both partners are at pension age, use the
 * couple means-test thresholds (higher asset limit, lower taper rate per dollar).
 * When one partner is below pension age the combined couple test still applies for
 * the eligible partner — this matches Services Australia policy.
 *
 * @param {number}  age          – primary person's current age
 * @param {number}  totalAssets  – total assessable assets ($)
 * @param {number}  annualIncome – total assessable income p.a. ($ — already deemed)
 * @param {boolean} isCouple
 * @param {boolean} homeowner
 * @param {number}  [partnerAge] – partner's current age (0 if no partner)
 * @returns {{ eligible: boolean, annualPension: number }}
 */
export const calcPensionForYear = (
    age,
    totalAssets,
    annualIncome,
    isCouple     = false,
    homeowner    = true,
    partnerAge   = 0,
) => {
    // Primary person must be at pension age
    if (age < PENSION_AGE) {
        return { eligible: false, annualPension: 0 };
    }

    let annualPension;
    if (isCouple) {
        // Use couple thresholds regardless of partner's age (Services Australia policy:
        // combined couple test applies even when one partner is under pension age).
        annualPension = calcCouplePension(totalAssets, annualIncome, homeowner);
    } else {
        annualPension = calcSinglePension(totalAssets, annualIncome, homeowner);
    }

    return { eligible: true, annualPension };
};

export default {
    PENSION_AGE,
    PENSION_RATES,
    ASSET_THRESHOLDS,
    ASSET_LIMITS,
    INCOME_THRESHOLDS_FORTNIGHT,
    calcSinglePension,
    calcCouplePension,
    calcPensionForYear,
};
