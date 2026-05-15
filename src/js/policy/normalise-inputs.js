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
 *  4. Missing fields are filled from ENHANCED_CONFIG.DEFAULTS.
 *  5. Output is tagged with _normalisedAt for debug tracing.
 *
 * Fields that ARE percentage-form in the JSON / form (need /100):
 *   inflation, investmentReturn, superReturn, savingsReturn, salaryGrowthRate,
 *   returnDeclineRate, healthcareInflation, mortgageRate, investmentPropertyRate,
 *   propertyGrowthRate, capitalGainsTaxRate, returnVolatility, shockProbability,
 *   shockMagnitude, leanYearsReduction, allocEquities, allocBonds, allocCash,
 *   australianEquityAllocation, dividendYield, frankingRate,
 *   carerReducedWorkPercent, trustTaxRate, trustAttributionPercentage,
 *   beneficiaryAllocation, vacancyRate, maintenanceInflation,
 *   extremeInflationProbability, propertyCrashProbability,
 *   percentIncomeSaved, globalRiskFactor (treated as 0–100 if > 1).
 *
 * Fields that are already absolute (NOT divided):
 *   salaries, super balances, savings, property values, loan amounts,
 *   numRuns, ages, lifespans, ASFA comfortable, pension maximums, thresholds,
 *   agedCareProbability (already decimal 0–1 in JSON),
 *   frankingCreditBenefit (already a multiplier, not a rate).
 */

import { ENHANCED_CONFIG } from '../config.js';

// ── Percentage fields: always need /100 when value > 1 ───────────────────────
// These are rates/fractions stored as percentages in the form/JSON (e.g. 7.5 for 7.5%).
// The template JSON already stores these as DECIMALS (e.g. 0.09 for 9%), so we
// use the normaliseRatio() approach: if > 1, divide by 100; otherwise pass through.
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
    // These are percentages in the form but already 0–1 in the JSON export
    'agedCareProbability',
    'volatilityComfort',
]);

// Fields that hold values the normaliser should NOT touch
// (absolute dollar amounts, counts, ages, IDs, strings, booleans).
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
    'creditCardRate', 'personalLoanRate', 'carLoanRate',
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
    'globalRiskFactor',       // 0–100 score, not a rate
    'currentMonthlyHousingCosts', 'currentMonthlyLivingCosts',
    'employerSuperContributionRate', // already decimal (0.12) or null
    'superContributionRate',        // already decimal (0.12) or null
]);

// ── Normalise a single rate value ─────────────────────────────────────────────

/**
 * Convert a value that might be a percentage (e.g. 7.5) or already a decimal
 * (e.g. 0.075) into decimal form.  Treats values > 1 as percentages.
 * Values already ≤ 1 (and >= -1 for negative rates like shockMagnitude) pass through.
 *
 * Edge cases:
 *   null / undefined → returns the defaultValue
 *   NaN              → returns the defaultValue
 *   0                → returns 0 (intentional zero allocation is valid)
 *
 * @param {*}      value        – raw input value
 * @param {number} defaultValue – used when value is absent/invalid
 */
export const normaliseRate = (value, defaultValue = 0) => {
    if (value === null || value === undefined || value === '') return defaultValue;
    const n = Number(value);
    if (!isFinite(n)) return defaultValue;
    // Values with absolute value > 1 are treated as percentage — divide by 100.
    // Negative rates (shockMagnitude = -0.25) are already < -1 when in % form (-25), so the
    // same rule applies: |-25| > 1 → divide.
    return Math.abs(n) > 1 ? n / 100 : n;
};

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
    const defaults = {
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

    // Map config defaults to flat field names (config uses percentage form for rates)
    const defaultRates = {
        inflation:          defaults.inflation        / 100,
        investmentReturn:   defaults.investmentReturn / 100,
        superReturn:        defaults.superReturn      / 100,
        savingsReturn:      defaults.savingsReturn    / 100,
        salaryGrowthRate:   defaults.salaryGrowthRate / 100,
        returnDeclineRate:  defaults.returnDeclineRate / 100,
        healthcareInflation: defaults.healthcareInflation / 100,
        returnVolatility:   defaults.returnVolatility / 100,
        allocEquities:      defaults.allocEquities    / 100,
        allocBonds:         defaults.allocBonds       / 100,
        allocCash:          defaults.allocCash        / 100,
        australianEquityAllocation: defaults.australianEquityAllocation / 100,
        dividendYield:      defaults.dividendYield    / 100,
        frankingRate:       defaults.frankingRate     / 100,
    };

    const result = {};

    // Process all known raw input keys
    for (const [key, rawValue] of Object.entries(rawInputs)) {
        if (RATE_FIELDS.has(key)) {
            // Rate field: normalise to decimal
            const defVal = defaultRates[key] ?? 0;
            result[key] = normaliseRate(rawValue, defVal);
        } else {
            // Absolute field or unknown: pass through as-is
            result[key] = rawValue;
        }
    }

    // Apply defaults for missing rate fields
    for (const key of RATE_FIELDS) {
        if (!(key in result) && key in defaultRates) {
            result[key] = defaultRates[key];
        }
    }

    // Apply defaults for missing absolute fields
    for (const [key, defVal] of Object.entries(defaults)) {
        if (!(key in result) && ABSOLUTE_FIELDS.has(key)) {
            result[key] = defVal;
        }
    }

    // Tag for debug tracing
    result._normalisedAt = Date.now();

    return result;
};

export default { normaliseInputs, normaliseRate };
