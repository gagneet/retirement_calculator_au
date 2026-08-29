/**
 * pension_engine.js – Australian Age Pension Eligibility and Income
 *
 * TASK-001 (enhancements.md): Unify Age Pension engine.
 * PR review fixes applied:
 *   #3247147250/#3247147483: One-partner-eligible case pays half the couple
 *     combined pension (only one person receives the payment).
 *   #3247147483: Work Bonus applied to employment income before the income
 *     test, matching utils.js:calculateAgePension() behaviour.
 *
 * All threshold values are sourced from ENHANCED_CONFIG (config.js) which is the
 * single source of truth for Australian pension policy constants.
 */

import { ENHANCED_CONFIG }       from '../config.js';
import { applyWorkBonus, resolveAgePensionPolicy } from '../utils.js';

// ── Policy constants sourced from the single source of truth ─────────────────

/**
 * Default Age Pension eligibility age — 67 for everyone born on or after 1 Jan 1957.
 *
 * This is the fallback only. Every function below accepts an optional `policy` object
 * so a projection can override the qualifying age, the means-test parameters, and apply
 * a CPI indexation factor. Policy resolution is shared with Pipeline A through
 * utils.js:resolveAgePensionPolicy, so the two pipelines cannot drift apart.
 */
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
 *
 * Asset test : $3/fn reduction per $1,000 over threshold ($78/yr per $1,000)
 * Income test: 50c/$ reduction on annual income above fortnightly threshold × 26
 *
 * @param {number} totalAssets    – total assessable assets ($)
 * @param {number} annualIncome   – total assessable income p.a. ($ — after deeming + Work Bonus)
 * @param {number} maxPension     – maximum annual pension ($)
 * @param {number} assetThreshold – full-pension asset limit ($)
 * @param {number} assetLimit     – nil-pension asset cut-off ($)
 * @param {number} fnThreshold    – fortnightly income free area ($)
 * @returns {number} annual pension amount
 */
const applyMeansTest = (totalAssets, annualIncome, maxPension, assetThreshold, assetLimit, fnThreshold) => {
    // Asset test
    let fromAssets = 0;
    if (totalAssets <= assetThreshold) {
        fromAssets = maxPension;
    } else if (totalAssets < assetLimit) {
        const excess = totalAssets - assetThreshold;
        fromAssets = Math.max(0, maxPension - (excess / 1000) * 3 * 26);
    }

    // Income test — fortnightly income above the free area reduces pension 50c/$
    let fromIncome = maxPension;
    const fnIncome = annualIncome / 26;
    if (fnIncome > fnThreshold) {
        fromIncome = Math.max(0, maxPension - (fnIncome - fnThreshold) * 0.5 * 26);
    }

    return Math.min(fromAssets, fromIncome);
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Calculate annual Age Pension for a single person.
 *
 * The income argument should be assessable income AFTER deeming has been
 * applied to financial assets but BEFORE Work Bonus is applied to employment
 * income.  Employment income is passed separately so the Work Bonus exemption
 * can be applied inside this function (matching utils.js:calculateAgePension).
 *
 * @param {number}  totalAssets         – assessable assets ($)
 * @param {number}  nonEmploymentIncome – rental + deemedIncome + other ($ — already deemed)
 * @param {boolean} homeowner           – true if primary residence is owned
 * @param {number}  [employmentIncome=0] – salary/wages (Work Bonus applied internally)
 * @param {number}  [workBonusBalance=0] – accumulated Work Bonus balance ($0–$11,800)
 * @param {Object}  [policy={}]          – per-projection overrides + indexationFactor
 * @returns {number} annual pension ($)
 */
export const calcSinglePension = (
    totalAssets,
    nonEmploymentIncome,
    homeowner       = true,
    employmentIncome  = 0,
    workBonusBalance  = 0,
    policy            = {},
) => {
    const { maxRate, assetThreshold, assetLimit, incomeThreshold } =
        resolveAgePensionPolicy({ ...policy, isCouple: false, homeowner });

    // Apply Work Bonus: reduces assessable employment income for income-test purposes
    const { assessableEmploymentIncome } = applyWorkBonus(employmentIncome, workBonusBalance, false);
    const totalAssessableIncome = nonEmploymentIncome + assessableEmploymentIncome;

    return applyMeansTest(
        totalAssets,
        totalAssessableIncome,
        maxRate,
        assetThreshold,
        assetLimit,
        incomeThreshold,
    );
};

/**
 * Calculate annual Age Pension for a couple (combined payment).
 *
 * @param {number}  totalAssets         – combined assessable assets ($)
 * @param {number}  nonEmploymentIncome – combined deemed + rental + other ($ p.a.)
 * @param {boolean} homeowner
 * @param {number}  [employmentIncome=0]  – combined salary/wages of both partners
 * @param {number}  [workBonusBalance=0]  – combined accumulated Work Bonus balance
 * @param {Object}  [policy={}]           – per-projection overrides + indexationFactor
 * @returns {number} combined annual pension ($)
 */
export const calcCouplePension = (
    totalAssets,
    nonEmploymentIncome,
    homeowner        = true,
    employmentIncome   = 0,
    workBonusBalance   = 0,
    policy             = {},
) => {
    const { maxRate, assetThreshold, assetLimit, incomeThreshold } =
        resolveAgePensionPolicy({ ...policy, isCouple: true, homeowner });

    // Apply Work Bonus on combined employment income (isCouple=true doubles annual exemption)
    const { assessableEmploymentIncome } = applyWorkBonus(employmentIncome, workBonusBalance, true);
    const totalAssessableIncome = nonEmploymentIncome + assessableEmploymentIncome;

    return applyMeansTest(
        totalAssets,
        totalAssessableIncome,
        maxRate,
        assetThreshold,
        assetLimit,
        incomeThreshold,
    );
};

/**
 * Determine pension eligibility and annual amount for one simulation year.
 *
 * Called by life_simulation_engine.js each year.  The caller pre-computes:
 *   deemedIncome = calculateDeemedIncome(financialAssets, isCouple)
 * and passes employment income separately so the Work Bonus can be applied here.
 *
 * Couple eligibility rules (Services Australia):
 *  - Both partners ≥ 67: use full couple thresholds; return combined amount.
 *  - Primary ≥ 67, partner < 67: combined couple means test applies, but only
 *    ONE person receives the payment → return half the combined couple result.
 *  - Primary < 67, partner ≥ 67: primary is the non-eligible partner case.
 *    We return zero because the primary person (age param) is below pension age.
 *    The partner's pension will be calculated when the partner is tracked as primary.
 *  - Neither ≥ 67: not eligible.
 *
 * @param {number}  age                – primary person's current age
 * @param {number}  totalAssets        – total assessable assets ($)
 * @param {number}  nonEmploymentIncome – rental + deemed income (no employment, no salary)
 * @param {boolean} isCouple
 * @param {boolean} homeowner
 * @param {number}  [partnerAge=0]     – partner's current age (0 if no partner)
 * @param {number}  [employmentIncome=0] – combined employment income ($)
 * @param {number}  [workBonusBalance=0] – accumulated Work Bonus balance
 * @param {Object}  [policy={}]          – per-projection overrides: pensionAge,
 *        maxPension, assetThreshold, assetLimit, incomeThreshold, and
 *        indexationFactor (scales every dollar figure to the projection year).
 *        Omitted values fall back to the legislated figures in config.js.
 * @returns {{ eligible: boolean, annualPension: number }}
 */
export const calcPensionForYear = (
    age,
    totalAssets,
    nonEmploymentIncome,
    isCouple         = false,
    homeowner        = true,
    partnerAge       = 0,
    employmentIncome   = 0,
    workBonusBalance   = 0,
    policy             = {},
) => {
    // The qualifying age is resolved through the shared helper so an override reaches
    // both the eligibility gate here and the means-test parameters below.
    const { pensionAge } = resolveAgePensionPolicy({ ...policy, isCouple, homeowner });

    // Primary person must be at pension age to be the recipient
    if (age < pensionAge) {
        return { eligible: false, annualPension: 0 };
    }

    let annualPension;
    if (!isCouple) {
        // Single — straightforward
        annualPension = calcSinglePension(totalAssets, nonEmploymentIncome, homeowner, employmentIncome, workBonusBalance, policy);
    } else if (partnerAge >= pensionAge || partnerAge === 0) {
        // Both partners at pension age (or no partner age provided — assume both eligible):
        // combined couple means test, return full combined amount.
        annualPension = calcCouplePension(totalAssets, nonEmploymentIncome, homeowner, employmentIncome, workBonusBalance, policy);
    } else {
        // PR review fix #3247147250: One-partner-eligible case.
        // Primary is eligible but partner is under pension age.
        // Services Australia: combined couple means test applies (uses couple thresholds),
        // but only the eligible partner receives a payment → halve the combined result.
        const combinedPension = calcCouplePension(totalAssets, nonEmploymentIncome, homeowner, employmentIncome, workBonusBalance, policy);
        annualPension = combinedPension / 2;
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
