/**
 * pension_engine.js – Australian Age Pension Eligibility and Income
 *
 * Thin wrapper around the pension means-test logic, extended to support
 * the life simulation year-by-year timeline.  Uses 2025 thresholds.
 */

import { ENHANCED_CONFIG } from '../config.js';

// Age Pension eligibility age
export const PENSION_AGE = ENHANCED_CONFIG.OVERSEAS_RETIREMENT?.PENSION_AGE || 67;

// Current Age Pension rates (annual)
export const PENSION_RATES = {
    singleMax: ENHANCED_CONFIG.SINGLE_PENSION_MAX,
    coupleMax: ENHANCED_CONFIG.COUPLE_PENSION_MAX / 2,
};

// Asset thresholds (homeowner / non-homeowner)
export const ASSET_THRESHOLDS = {
    singleHomeowner: ENHANCED_CONFIG.SINGLE_ASSET_THRESHOLD,
    singleNonHomeowner: ENHANCED_CONFIG.SINGLE_ASSET_THRESHOLD_NON_HOMEOWNER,
    coupleHomeowner: ENHANCED_CONFIG.COUPLE_ASSET_THRESHOLD,
    coupleNonHomeowner: ENHANCED_CONFIG.COUPLE_ASSET_THRESHOLD_NON_HOMEOWNER,
};

export const ASSET_LIMITS = {
    singleHomeowner: ENHANCED_CONFIG.SINGLE_ASSET_LIMIT,
    singleNonHomeowner: ENHANCED_CONFIG.SINGLE_ASSET_LIMIT_NON_HOMEOWNER,
    coupleHomeowner: ENHANCED_CONFIG.COUPLE_ASSET_LIMIT,
    coupleNonHomeowner: ENHANCED_CONFIG.COUPLE_ASSET_LIMIT_NON_HOMEOWNER,
};

// Fortnightly income thresholds
export const INCOME_THRESHOLDS_FORTNIGHT = {
    single: ENHANCED_CONFIG.SINGLE_INCOME_THRESHOLD,
    couple: ENHANCED_CONFIG.COUPLE_INCOME_THRESHOLD,
};

/**
 * Calculate annual Age Pension for a single person.
 *
 * @param {number} totalAssets        – assessable assets
 * @param {number} annualIncome       – assessable income
 * @param {boolean} homeowner         – whether primary residence is owned
 * @returns {number} annual pension amount
 */
export const calcSinglePension = (totalAssets, annualIncome, homeowner = true) => {
    const maxPension = PENSION_RATES.singleMax;
    const assetThreshold = homeowner ? ASSET_THRESHOLDS.singleHomeowner : ASSET_THRESHOLDS.singleNonHomeowner;
    const assetLimit     = homeowner ? ASSET_LIMITS.singleHomeowner     : ASSET_LIMITS.singleNonHomeowner;
    const incomeThreshold = INCOME_THRESHOLDS_FORTNIGHT.single;

    // Asset test: $3 per fortnight per $1,000 over threshold
    let pensionFromAssets = 0;
    if (totalAssets <= assetThreshold) {
        pensionFromAssets = maxPension;
    } else if (totalAssets < assetLimit) {
        const reduction = ((totalAssets - assetThreshold) / 1000) * 3 * 26;
        pensionFromAssets = Math.max(0, maxPension - reduction);
    }

    // Income test: 50c per dollar above fortnightly threshold
    let pensionFromIncome = maxPension;
    const fortnightlyIncome = annualIncome / 26;
    if (fortnightlyIncome > incomeThreshold) {
        const reduction = (fortnightlyIncome - incomeThreshold) * 0.5 * 26;
        pensionFromIncome = Math.max(0, maxPension - reduction);
    }

    return Math.min(pensionFromAssets, pensionFromIncome);
};

/**
 * Calculate annual Age Pension for a couple (combined).
 *
 * @param {number} totalAssets        – combined assessable assets
 * @param {number} annualIncome       – combined assessable income
 * @param {boolean} homeowner
 * @returns {number} combined annual pension
 */
export const calcCouplePension = (totalAssets, annualIncome, homeowner = true) => {
    const maxPension = PENSION_RATES.coupleMax * 2;
    const assetThreshold = homeowner ? ASSET_THRESHOLDS.coupleHomeowner : ASSET_THRESHOLDS.coupleNonHomeowner;
    const assetLimit     = homeowner ? ASSET_LIMITS.coupleHomeowner     : ASSET_LIMITS.coupleNonHomeowner;
    const incomeThreshold = INCOME_THRESHOLDS_FORTNIGHT.couple;

    let pensionFromAssets = 0;
    if (totalAssets <= assetThreshold) {
        pensionFromAssets = maxPension;
    } else if (totalAssets < assetLimit) {
        const reduction = ((totalAssets - assetThreshold) / 1000) * 3 * 26;
        pensionFromAssets = Math.max(0, maxPension - reduction);
    }

    let pensionFromIncome = maxPension;
    const fortnightlyIncome = annualIncome / 26;
    if (fortnightlyIncome > incomeThreshold) {
        const reduction = (fortnightlyIncome - incomeThreshold) * 0.5 * 26;
        pensionFromIncome = Math.max(0, maxPension - reduction);
    }

    return Math.min(pensionFromAssets, pensionFromIncome);
};

/**
 * Determine pension eligibility and amount for a simulation year.
 *
 * @param {number} age                – primary person's current age
 * @param {number} totalAssets        – total assessable assets
 * @param {number} annualIncome       – total assessable income (excl. pension)
 * @param {boolean} isCouple          – whether coupled
 * @param {boolean} homeowner         – whether home is owned
 * @returns {{ eligible: boolean, annualPension: number }}
 */
export const calcPensionForYear = (age, totalAssets, annualIncome, isCouple = false, homeowner = true) => {
    if (age < PENSION_AGE) {
        return { eligible: false, annualPension: 0 };
    }
    const annualPension = isCouple
        ? calcCouplePension(totalAssets, annualIncome, homeowner)
        : calcSinglePension(totalAssets, annualIncome, homeowner);
    return { eligible: true, annualPension };
};

export default { PENSION_AGE, PENSION_RATES, calcSinglePension, calcCouplePension, calcPensionForYear };
