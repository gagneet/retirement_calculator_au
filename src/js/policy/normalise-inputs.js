/**
 * normalise-inputs.js — Canonical Input Normalisation Module
 *
 * TASK-010: Create a single function that converts raw user inputs (from JSON
 * import, form scraping, or test fixtures) into the decimal-form representation
 * expected by all simulation engines.
 *
 * Problem this solves: input normalisation (dividing percentages by 100, parsing
 * strings, applying defaults) was scattered across app.js collectInputs(),
 * life_simulation_engine.js SIMULATION_DEFAULTS, and advanced-design-engine.js
 * _normalise().  Different entry points produced different results for the same
 * raw value, causing the ratio/percentage confusion documented in enhancements.md.
 *
 * Design rules:
 *  1. Values stored as percentages in the JSON (0–100) are converted to decimals (0–1).
 *  2. Values already in decimal form (0–1 or absolute dollar/count values) pass through.
 *  3. The function is idempotent: calling it twice on already-normalised inputs is safe.
 *  4. Missing rate fields are filled from ENHANCED_CONFIG.DEFAULTS (after /100).
 *  5. Output is tagged with _normalisedAt for debug tracing.
 *
 * ── Rate fields (percentage-form in UI/older exports; already decimal in template JSON) ──
 *   inflation, investmentReturn, superReturn, savingsReturn, salaryGrowthRate,
 *   returnDeclineRate, healthcareInflation, mortgageRate, investmentPropertyRate,
 *   propertyGrowthRate, capitalGainsTaxRate, returnVolatility, shockProbability,
 *   shockMagnitude, leanYearsReduction, allocEquities, allocBonds, allocCash,
 *   australianEquityAllocation, dividendYield, frankingRate,
 *   carerReducedWorkPercent, trustTaxRate, trustAttributionPercentage,
 *   beneficiaryAllocation, vacancyRate, maintenanceInflation,
 *   extremeInflationProbability, propertyCrashProbability,
 *   percentIncomeSaved, agedCareProbability, volatilityComfort.
 *
 * ── Absolute fields (NOT divided — dollar amounts, counts, ages) ──
 *   salaries, super balances, savings, property values, loan amounts,
 *   numRuns, ages, lifespans, ASFA comfortable, pension maximums, thresholds,
 *   frankingCreditBenefit (multiplier 1.2, not a rate).
 *
 * ── Already-decimal rate fields (pass through unchanged) ──
 *   creditCardRate, personalLoanRate, carLoanRate (stored as decimals in JSON,
 *   e.g. 0.2395; the UI divides by 100 before storing so they never arrive as 23.95).
 *   superContributionRate, employerSuperContributionRate (always decimal 0.12 or null).
 *   globalRiskFactor: a 0–1 multiplier (up to 5% extra volatility in simulator.js),
 *     NOT a 0–100 percentage — value passes through unchanged.
 */

import { ENHANCED_CONFIG } from '../config.js';

// ── Percentage fields: need /100 when value > 1 ──────────────────────────────
// These are rates/fractions that can arrive as percentages (e.g. 7.5 for 7.5%)
// from older exports or UI form scraping, but are already decimals in the
// canonical template JSON (e.g. 0.075).  normaliseRate() detects the form.
const RATE_FIELDS = new Set([
    'inflation', 'investmentReturn', 'superReturn', 'savingsReturn',
    'salaryGrowthRate', 'returnDeclineRate', 'healthcareInflation',
    'mortgageRate', 'investmentPropertyRate', 'propertyGrowthRate',
    'capitalGainsTaxRate', 'returnVolatility', 'shockProbability', 'shockMagnitude',
    'leanYearsReduction', 'allocEquities', 'allocBonds', 'allocCash',
    'australianEquityAllocation', 'dividendYield', 'frankingRate',
    'carerReducedWorkPercent', 'trustTaxRate', 'trustAttributionPercentage',
    'beneficiaryAllocation', 'vacancyRate', 'maintenanceInflation',
    'extremeInflationProbability', 'propertyCrashProbability',
    'percentIncomeSaved',
    'agedCareProbability',   // 0–1 in template JSON; may arrive as 0–100 from older exports
    'volatilityComfort',
    'overseasAudFxChange',   // e.g. -0.5 for -0.5%/yr
]);

// ── Absolute fields (never divided — dollar amounts, ages, counts) ─────────────
const ABSOLUTE_FIELDS = new Set([
    'yourCurrentAge', 'partnerCurrentAge', 'retirementAge', 'partnerRetirementAge',
    'yourLifespan', 'partnerLifespan',
    'yourSalary', 'partnerSalary',
    'yourCurrentSuper', 'partnerCurrentSuper',
    'currentSavings', 'currentStocks',
    'homeValue', 'mortgageBalance', 'monthlyMortgagePayment',
    'investmentPropertyValue', 'investmentPropertyLoan',
    'investmentPropertyPurchasePrice', 'investmentPropertyPurchaseYear',
    'weeklyRentalIncome', 'annualPropertyExpenses', 'landTax',
    'sellPropertyYears',
    'currentHealthcareCosts', 'agedCareStartAge', 'agedCareDuration', 'agedCareAnnualCost',
    'asfaComfortable', 'agePensionMax',
    'pensionAssetThreshold', 'pensionAssetLimit', 'pensionIncomeThreshold',
    'trustNetAssets', 'trustAnnualDistributions',
    'numRuns', 'leanYearsStart',
    'creditCardBalance', 'personalLoanBalance', 'carLoanBalance', 'hecsBalance',
    'smsfAdminCosts',
    'yourAdditionalSuperContribution', 'partnerAdditionalSuperContribution',
    'yourAnnualNCC', 'partnerAnnualNCC',
    'concessionalCapUsed', 'spouseContribution',
    'educationCostPerChild',
    'annualTravelBudget', 'annualHobbyBudget',
    'legacyGoal',
    'dependents',
    'riskTolerance',
    'monthlyStockContribution',
    'ageCameToAustralia', 'ageStartedEarningAustralia',
    'partnerAgeCameToAustralia', 'partnerAgeStartedEarningAustralia',
    'reducedIncomeAge', 'reducedIncomeSalary',
    'partnerReducedIncomeAge', 'partnerReducedIncomeSalary',
    'carerYearsExpected', 'carerAnnualExpense',
    'frankingCreditBenefit',  // multiplier (e.g. 1.2), not a rate
    'familyTrustIncomeDistribution',
    'currentMonthlyHousingCosts', 'currentMonthlyLivingCosts',
    // ── Fields that are already-decimal rates (pass through — never percentage form) ──
    // PR review fix #3247765204: these were wrongly in ABSOLUTE_FIELDS.
    // They are rates, but stored in decimal form in all known exports and the UI.
    // Moving them here acknowledges they're NOT absolute amounts while still
    // preventing the normaliser from dividing them again.
    'creditCardRate',               // e.g. 0.2395 — template JSON, not 23.95
    'personalLoanRate',             // e.g. 0.14
    'carLoanRate',                  // e.g. 0.0785
    'superContributionRate',        // e.g. 0.12 or null
    'employerSuperContributionRate',// e.g. 0.12 or null
    // PR review fix #3247765226: globalRiskFactor is a 0–1 multiplier (adds up to 5%
    // extra volatility in simulator.js), NOT a 0–100 percentage score.
    'globalRiskFactor',
]);

// ── Normalise a single rate value ─────────────────────────────────────────────

/**
 * Convert a value that might be a percentage (e.g. 7.5) or already a decimal
 * (e.g. 0.075) into decimal form.  Treats values with absolute value > 1 as
 * percentages and divides by 100.
 *
 * Edge cases:
 *   null / undefined / ''  → returns defaultValue
 *   NaN / Infinity         → returns defaultValue
 *   0                      → returns 0 (intentional zero allocation is valid)
 *   -25 (% form)           → returns -0.25 (|-25| > 1 → divide)
 *   -0.25 (decimal)        → returns -0.25 (|-0.25| ≤ 1 → pass through)
 *
 * @param {*}      value        – raw input value
 * @param {number} defaultValue – used when value is absent/invalid
 */
export const normaliseRate = (value, defaultValue = 0) => {
    if (value === null || value === undefined || value === '') return defaultValue;
    const n = Number(value);
    if (!isFinite(n)) return defaultValue;
    return Math.abs(n) > 1 ? n / 100 : n;
};

// ── Build the full defaultRates map from ENHANCED_CONFIG.DEFAULTS ─────────────

/**
 * Build a map from RATE_FIELD key → decimal default value.
 *
 * PR review fix #3247765188: the previous implementation only mapped 14 of the
 * 30+ RATE_FIELDS to defaults, leaving the rest falling back to 0 when a field
 * was absent.  This function derives decimal defaults for all RATE_FIELDS from
 * the merged ENHANCED_CONFIG.DEFAULTS object.
 *
 * Config stores all rate defaults in PERCENTAGE form (e.g. inflation: 2.5),
 * so we apply normaliseRate() to convert each to decimal.
 */
const buildDefaultRates = () => {
    const cfgDefaults = {
        ...ENHANCED_CONFIG.DEFAULTS.personal,
        ...ENHANCED_CONFIG.DEFAULTS.financial,
        ...ENHANCED_CONFIG.DEFAULTS.property,
        ...ENHANCED_CONFIG.DEFAULTS.healthcare,
        ...ENHANCED_CONFIG.DEFAULTS.economic,
        ...ENHANCED_CONFIG.DEFAULTS.allocation,
        ...ENHANCED_CONFIG.DEFAULTS.trust,
        ...ENHANCED_CONFIG.DEFAULTS.risk,
        ...ENHANCED_CONFIG.DEFAULTS.simulation,
        ...ENHANCED_CONFIG.DEFAULTS.pension,
    };

    // Supplement with hard-coded sensible defaults for fields not in DEFAULTS
    // (vacancyRate, maintenanceInflation, extremeInflationProbability etc.)
    const supplements = {
        vacancyRate:               0.04,   // 4% vacancy (app.js default)
        maintenanceInflation:      0.035,  // 3.5% (app.js default)
        trustTaxRate:              0.30,   // 30% (app.js default)
        trustAttributionPercentage: 1.0,   // 100% attribution (fully attributed)
        beneficiaryAllocation:     1.0,    // 100% to primary beneficiary
        extremeInflationProbability: 0.02, // 2% (app.js default /100)
        propertyCrashProbability:  0.03,   // 3% (app.js default /100)
        globalRiskFactor:          0,      // 0 multiplier (app.js default)
        carerReducedWorkPercent:   0,      // no carer reduction
        capitalGainsTaxRate:       0.225,  // 22.5% effective (45% × 50% discount)
        volatilityComfort:         0.2,    // template JSON default
    };

    const map = {};
    for (const key of RATE_FIELDS) {
        if (key in cfgDefaults) {
            // Config stores rates as percentages → normalise to decimal
            map[key] = normaliseRate(cfgDefaults[key], 0);
        } else if (key in supplements) {
            map[key] = supplements[key];
        } else {
            map[key] = 0; // safe fallback
        }
    }
    return map;
};

// Compute once at module load — the config is static.
const DEFAULT_RATES = buildDefaultRates();

// ── Main normalisation function ────────────────────────────────────────────────

/**
 * Normalise raw user inputs into the decimal form expected by all simulation engines.
 *
 * Safe to call on already-normalised inputs (idempotent for rate fields).
 * Always returns a new object — does not mutate the input.
 *
 * @param {Object} rawInputs  – raw inputs from JSON import, form, or test fixture
 * @returns {Object}          – normalised inputs with _normalisedAt timestamp
 */
export const normaliseInputs = (rawInputs = {}) => {
    const cfgDefaults = {
        ...ENHANCED_CONFIG.DEFAULTS.personal,
        ...ENHANCED_CONFIG.DEFAULTS.financial,
        ...ENHANCED_CONFIG.DEFAULTS.property,
        ...ENHANCED_CONFIG.DEFAULTS.healthcare,
        ...ENHANCED_CONFIG.DEFAULTS.economic,
        ...ENHANCED_CONFIG.DEFAULTS.allocation,
        ...ENHANCED_CONFIG.DEFAULTS.trust,
        ...ENHANCED_CONFIG.DEFAULTS.risk,
        ...ENHANCED_CONFIG.DEFAULTS.simulation,
        ...ENHANCED_CONFIG.DEFAULTS.pension,
    };

    const result = {};

    // Process all provided keys
    for (const [key, rawValue] of Object.entries(rawInputs)) {
        if (RATE_FIELDS.has(key)) {
            result[key] = normaliseRate(rawValue, DEFAULT_RATES[key] ?? 0);
        } else {
            // Absolute field, already-decimal rate, boolean, string, or unknown — pass through
            result[key] = rawValue;
        }
    }

    // Fill missing rate fields from DEFAULT_RATES
    for (const key of RATE_FIELDS) {
        if (!(key in result)) {
            result[key] = DEFAULT_RATES[key] ?? 0;
        }
    }

    // Fill missing absolute fields from cfgDefaults
    for (const [key, defVal] of Object.entries(cfgDefaults)) {
        if (!(key in result) && ABSOLUTE_FIELDS.has(key)) {
            result[key] = defVal;
        }
    }

    // Tag for debug tracing
    result._normalisedAt = Date.now();

    return result;
};

export default { normaliseInputs, normaliseRate };
