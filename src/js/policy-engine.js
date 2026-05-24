/**
 * policy-engine.js — Single Source of Truth for Australian Retirement Policy
 *
 * All legislative constants, pension rates, deeming rules, tax brackets,
 * super caps, and portability rules are sourced from here.
 *
 * Every section carries:
 *   - effectiveDate: when these rates took effect
 *   - nextReviewDate: next scheduled indexation date
 *   - source: government body responsible
 *   - sourceUrl: authoritative URL for verification
 *
 * Result screens should display: "Rules used as at [POLICY_EFFECTIVE_DATE]"
 *
 * Policy regression tests (tests/unit/policy-regression.test.js) will fail
 * when POLICY_NEXT_REVIEW_DATE has passed and config metadata is stale.
 *
 * Services Australia adjusts Age Pension rates every 20 March and 20 September.
 */

import { ENHANCED_CONFIG } from './config.js';

// ============================================================
// POLICY ENGINE: derive all policy values from config
// so there is ONE canonical source, never two copies.
// ============================================================

/**
 * Returns the current policy metadata block.
 * Call this to populate "Rules used as at" displays.
 */
export function getPolicyMetadata() {
    return {
        effectiveDate: ENHANCED_CONFIG.POLICY_EFFECTIVE_DATE,
        nextReviewDate: ENHANCED_CONFIG.POLICY_NEXT_REVIEW_DATE,
        source: ENHANCED_CONFIG.POLICY_SOURCE,
        sourceUrl: ENHANCED_CONFIG.POLICY_SOURCE_URL,
        configVersion: ENHANCED_CONFIG.version,
        // Derived: is today past the next review date?
        isPossiblyStale: new Date() > new Date(ENHANCED_CONFIG.POLICY_NEXT_REVIEW_DATE)
    };
}

// ============================================================
// DEEMING ENGINE
// ============================================================

/**
 * Calculate annual deemed income from financial assets.
 *
 * Services Australia deems income from a broad set of financial assets including:
 *   - account-based pensions
 *   - superannuation in retirement phase
 *   - savings accounts and term deposits
 *   - managed investments
 *   - listed shares and securities
 *   - some income streams
 *
 * Verified 14 May 2026 via servicesaustralia.gov.au/deeming?context=22526 and DVA updates:
 *   - Thresholds UNCHANGED at $64,200 (singles) / $106,200 (couples combined)
 *   - Rates INCREASED from 20 March 2026 to 1.25% (lower) and 3.25% (upper)
 *   - Previous rates (Sept 2025): 0.75% lower, 2.75% upper
 *
 * Singles:  1.25% on first $64,200; 3.25% above — VERIFIED
 * Couples:  1.25% on first $106,200 combined; 3.25% above — VERIFIED
 *
 * @param {number} financialAssets - Total assessable financial assets (AUD)
 * @param {boolean} isCouple - Whether to apply couple threshold
 * @returns {number} Annual deemed income (AUD)
 */
export function calculateDeemedIncome(financialAssets, isCouple = false) {
    const assets = Math.max(0, financialAssets || 0);
    const threshold = isCouple
        ? ENHANCED_CONFIG.DEMING_THRESHOLD_COUPLE
        : ENHANCED_CONFIG.DEMING_THRESHOLD_SINGLE;

    const lowerPortion = Math.min(assets, threshold);
    const upperPortion = Math.max(0, assets - threshold);

    return (lowerPortion * ENHANCED_CONFIG.DEMING_RATE_LOWER) +
        (upperPortion * ENHANCED_CONFIG.DEMING_RATE_UPPER);
}

/**
 * Build the total financial assets amount that is subject to deeming.
 *
 * Services Australia deems a broader set than just super + listed shares,
 * including savings accounts, term deposits, managed investments, listed
 * shares and securities, and some income streams.
 *
 * This helper fixes the prior overseas-retirement.js bug where only
 * investmentBalance was used for deeming, understating deemed income.
 *
 * @param {Object} finances - Financial data object with the primary person's assets
 * @param {Object|null} [partnerFinances] - Optional separate finances object for partner.
 *   Pass null (default) for single-person calculations.
 *   When provided, ALL partner financial asset fields are included — mirroring the
 *   same set of fields as the primary person to avoid an incomplete deeming base.
 * @returns {number} Total deem-able financial assets (AUD)
 */
export function buildDeemedAssets(finances, partnerFinances = null) {
    const sumFinancialAssets = (f) => f
        ? (f.superBalance || 0) +
          (f.investmentBalance || 0) +
          (f.savingsBalance || 0) +
          (f.termDeposits || 0) +
          (f.managedFunds || 0) +
          (f.listedShares || 0) +
          (f.otherFinancialAssets || 0)
        : 0;

    return sumFinancialAssets(finances) + sumFinancialAssets(partnerFinances);
}

// ============================================================
// AGE PENSION MEANS TEST ENGINE
// ============================================================

/**
 * Apply the Age Pension asset and income means tests.
 *
 * Asset test: pension reduces by $3/fortnight per $1,000 above threshold.
 * Income test: pension reduces by 50 cents per dollar above fortnightly threshold.
 * The LOWER of the two results determines the actual pension payable.
 *
 * @param {number} assets - Total assessable assets (AUD)
 * @param {number} income - Total annual income including deemed income (AUD)
 * @param {number} maxPension - Maximum annual pension (AUD)
 * @param {number} assetThreshold - Assets for full pension
 * @param {number} assetLimit - Assets above which pension = 0
 * @param {number} incomeThreshold - Fortnightly income for full pension
 * @returns {{ annualPension: number, limitingTest: string, pensionFromAssets: number, pensionFromIncome: number }}
 */
export function applyMeansTest(assets, income, maxPension, assetThreshold, assetLimit, incomeThreshold) {
    const fortnights = ENHANCED_CONFIG.FORTNIGHTS_IN_YEAR;

    // Asset test
    let pensionFromAssets;
    if (assets <= assetThreshold) {
        pensionFromAssets = maxPension;
    } else if (assets < assetLimit) {
        const excessAssets = assets - assetThreshold;
        const reduction = (excessAssets / 1000) * 3 * fortnights;
        pensionFromAssets = Math.max(0, maxPension - reduction);
    } else {
        pensionFromAssets = 0;
    }

    // Income test
    const fortnightlyIncome = income / fortnights;
    let pensionFromIncome = maxPension;
    if (fortnightlyIncome > incomeThreshold) {
        const excessIncome = fortnightlyIncome - incomeThreshold;
        const reduction = excessIncome * 0.5 * fortnights;
        pensionFromIncome = Math.max(0, maxPension - reduction);
    }

    const annualPension = Math.min(pensionFromAssets, pensionFromIncome);
    const limitingTest = pensionFromAssets <= pensionFromIncome ? 'Assets Test' : 'Income Test';

    return { annualPension, limitingTest, pensionFromAssets, pensionFromIncome };
}

/**
 * Get the correct asset thresholds for a given household type.
 * Homeowner vs non-homeowner thresholds differ by NON_HOMEOWNER_ASSET_SUPPLEMENT.
 *
 * @param {boolean} isCouple
 * @param {boolean} homeowner
 * @returns {{ assetThreshold: number, assetLimit: number, incomeThreshold: number, maxPension: number }}
 */
export function getPensionThresholds(isCouple, homeowner) {
    const cfg = ENHANCED_CONFIG;

    if (isCouple) {
        return {
            assetThreshold: homeowner ? cfg.COUPLE_ASSET_THRESHOLD : cfg.COUPLE_ASSET_THRESHOLD_NON_HOMEOWNER,
            assetLimit: homeowner ? cfg.COUPLE_ASSET_LIMIT : cfg.COUPLE_ASSET_LIMIT_NON_HOMEOWNER,
            incomeThreshold: cfg.COUPLE_INCOME_THRESHOLD,
            maxPension: cfg.COUPLE_PENSION_MAX
        };
    }

    return {
        assetThreshold: homeowner ? cfg.SINGLE_ASSET_THRESHOLD : cfg.SINGLE_ASSET_THRESHOLD_NON_HOMEOWNER,
        assetLimit: homeowner ? cfg.SINGLE_ASSET_LIMIT : cfg.SINGLE_ASSET_LIMIT_NON_HOMEOWNER,
        incomeThreshold: cfg.SINGLE_INCOME_THRESHOLD,
        maxPension: cfg.SINGLE_PENSION_MAX
    };
}

/**
 * Calculate annual Age Pension for a single person (or one eligible partner).
 *
 * @param {Object} params
 * @param {number} params.totalAssets - Total assessable assets
 * @param {number} params.financialAssets - Financial assets subject to deeming
 * @param {number} params.otherIncome - Non-deemed annual income
 * @param {boolean} params.isCouple - Apply couple thresholds
 * @param {boolean} params.homeowner - Homeowner or non-homeowner thresholds
 * @returns {{ annualPension: number, limitingTest: string, eligible: boolean, details: Object }}
 */
export function calculateSinglePension({ totalAssets, financialAssets, otherIncome, isCouple, homeowner }) {
    const thresholds = getPensionThresholds(isCouple, homeowner);
    const deemedIncome = calculateDeemedIncome(financialAssets, isCouple);
    const totalIncome = (otherIncome || 0) + deemedIncome;

    const result = applyMeansTest(
        totalAssets,
        totalIncome,
        thresholds.maxPension,
        thresholds.assetThreshold,
        thresholds.assetLimit,
        thresholds.incomeThreshold
    );

    return {
        annualPension: result.annualPension,
        fortnightlyPension: Math.round(result.annualPension / ENHANCED_CONFIG.FORTNIGHTS_IN_YEAR),
        limitingTest: result.limitingTest,
        eligible: result.annualPension > 0,
        details: {
            deemedIncome,
            totalIncome,
            pensionFromAssets: result.pensionFromAssets,
            pensionFromIncome: result.pensionFromIncome,
            thresholds,
            policyDate: ENHANCED_CONFIG.POLICY_EFFECTIVE_DATE
        }
    };
}

// ============================================================
// OVERSEAS PORTABILITY ENGINE
// ============================================================

/**
 * OVERSEAS ABSENCE SCENARIO TYPES
 *
 * Services Australia distinguishes three meaningful scenarios:
 *
 * SCENARIO_SHORT_ABSENCE (<=6 weeks):
 *   Full pension rate continues including Pension Supplement top-up
 *   and Energy Supplement. Pensioner Concession Card remains valid.
 *
 * SCENARIO_LONG_ABSENCE (>6 weeks, <=26 weeks, temporary):
 *   - Pension base rate: UNCHANGED
 *   - Pension Supplement: drops to BASIC RATE only (top-up lost)
 *   - Energy Supplement: STOPS
 *   - PCC: cancelled after 6 weeks
 *   - AWLR proportion: NOT yet applied (only after 26 weeks)
 *
 * SCENARIO_EXTENDED_TEMPORARY (>26 weeks, temporary, intent to return):
 *   - AWLR-proportional rate applies to full pension amount
 *   - Supplement losses from SCENARIO_LONG_ABSENCE continue
 *   - If AWLR >= 35 years: full rate preserved
 *
 * SCENARIO_PERMANENT_MOVE (living overseas, no return intent):
 *   - Supplement changes apply FROM DEPARTURE DATE (not after 6 weeks)
 *   - AWLR proportion applies after 26 weeks
 *   - If return to Australia within 2 years: 2-year waiting period applies
 *   - Exception: agreement countries, humanitarian visas
 *
 * SCENARIO_RETURN_TO_AUSTRALIA:
 *   - If left and stayed away: 2-year former resident waiting period
 *   - Agreement country exceptions apply
 */
export const OverseasScenarioType = {
    SHORT_ABSENCE: 'SHORT_ABSENCE',           // <= 6 weeks
    LONG_ABSENCE: 'LONG_ABSENCE',             // 6-26 weeks
    EXTENDED_TEMPORARY: 'EXTENDED_TEMPORARY', // >26 weeks, planning to return
    PERMANENT_MOVE: 'PERMANENT_MOVE',          // living overseas permanently
    RETURN_TO_AUSTRALIA: 'RETURN_TO_AUSTRALIA' // returning after extended absence
};

/**
 * Calculate portable Age Pension for each overseas scenario.
 *
 * @param {Object} params
 * @param {number} params.basePension - Pension if staying in Australia (annual AUD)
 * @param {number} params.awlrYears - Australian Working Life Residence years (age 16 to pension age)
 * @param {boolean} params.isCouple - Couple or single
 * @param {boolean} params.agreementCountry - Destination has social security agreement with Australia
 * @param {string} params.scenarioType - One of OverseasScenarioType
 * @param {number} [params.shortAbsenceWeeks] - Override for the supplement-preserving absence window
 * @returns {Object} Pension outcome for the given scenario
 */
export function calculatePortablePension({
    basePension,
    awlrYears,
    isCouple,
    agreementCountry,
    scenarioType,
    shortAbsenceWeeks
}) {
    const cfg = ENHANCED_CONFIG.OVERSEAS_RETIREMENT;
    const effectiveShortAbsenceWeeks = shortAbsenceWeeks ?? cfg.SHORT_ABSENCE_WEEKS;

    // AWLR proportion — clamp to [0, AWLR_TOTAL_YEARS] to guard against negative/invalid input
    const awlr = Math.min(Math.max(0, awlrYears || 0), cfg.AWLR_TOTAL_YEARS);
    const proportionalRate = Math.min(awlr / cfg.AWLR_REQUIRED_FOR_FULL, 1.0);
    const hasFullPortability = awlr >= cfg.AWLR_REQUIRED_FOR_FULL;

    // Supplement annual reductions
    const supplementLoss = isCouple
        ? cfg.PENSION_SUPPLEMENT_REDUCTION_COUPLE * 2  // both members of couple lose supplement
        : cfg.PENSION_SUPPLEMENT_REDUCTION_SINGLE;

    switch (scenarioType) {
        case OverseasScenarioType.SHORT_ABSENCE:
            // Full pension + all supplements preserved
            return {
                scenarioType,
                annualPension: basePension,
                description: `Full pension continues for up to ${effectiveShortAbsenceWeeks} weeks`,
                supplementLost: 0,
                awlrApplied: false,
                pensionReduced: false,
                pccValid: true,
                warnings: []
            };

        case OverseasScenarioType.LONG_ABSENCE:
            // Base rate unchanged; supplements stop after the current short-absence window.
            return {
                scenarioType,
                annualPension: Math.max(0, basePension - supplementLoss),
                description: `Base pension continues; Pension Supplement top-up and Energy Supplement stop after ${effectiveShortAbsenceWeeks} weeks`,
                supplementLost: supplementLoss,
                awlrApplied: false,
                pensionReduced: supplementLoss > 0,
                pccValid: false,
                warnings: [
                    `Pensioner Concession Card cancelled after ${effectiveShortAbsenceWeeks} weeks overseas`,
                    'Pension Supplement reduced to basic rate only',
                    'Energy Supplement stops'
                ]
            };

        case OverseasScenarioType.EXTENDED_TEMPORARY: {
            // AWLR proportion applies after 26 weeks.
            // Correct logic: The Basic Pension Rate is pro-rated. The Pension Supplement (Basic) is NOT pro-rated.
            // Energy Supplement and Supplement Top-up are lost.
            const annualBasicSupplement = isCouple ? cfg.PENSION_SUPPLEMENT_BASIC_COUPLE * 2 * 26 : cfg.PENSION_SUPPLEMENT_BASIC_SINGLE * 26;
            // 1. Isolate the base pension rate (excluding all supplements)
            const fullAnnualSupplement = supplementLoss + annualBasicSupplement;
            const basePensionRateOnly = Math.max(0, basePension - fullAnnualSupplement);
            // 2. Pro-rate the base rate by AWLR; 3. Add back retained basic supplement
            const proRatedBase = basePensionRateOnly * proportionalRate;
            const finalPension = (basePension > 0) ? (proRatedBase + annualBasicSupplement) : 0;
            const awlrWarning = hasFullPortability
                ? null
                : `AWLR: ${awlr}/${cfg.AWLR_REQUIRED_FOR_FULL} years — base rate reduced to ${(proportionalRate * 100).toFixed(1)}%`;

            return {
                scenarioType,
                annualPension: finalPension,
                description: `Pension ${hasFullPortability ? 'continues at full rate' : `basic rate reduced to ${(proportionalRate * 100).toFixed(1)}%`} after 26 weeks`,
                supplementLost: supplementLoss,
                awlrApplied: !hasFullPortability,
                awlrYears: awlr,
                awlrRequired: cfg.AWLR_REQUIRED_FOR_FULL,
                proportionalRate,
                pensionReduced: !hasFullPortability || supplementLoss > 0,
                pccValid: false,
                warnings: [
                    ...(awlrWarning ? [awlrWarning] : []),
                    `Supplement losses from the ${effectiveShortAbsenceWeeks}-week threshold continue`,
                    agreementCountry ? 'Agreement country: favourable portability rules apply' : '2-year waiting period applies if you return to Australia within 2 years'
                ].filter(Boolean)
            };
        }

        case OverseasScenarioType.PERMANENT_MOVE: {
            // Supplements stop FROM DEPARTURE (not after 6 weeks)
            // AWLR proportion applies after 26 weeks
            const annualBasicSupplement = isCouple ? cfg.PENSION_SUPPLEMENT_BASIC_COUPLE * 2 * 26 : cfg.PENSION_SUPPLEMENT_BASIC_SINGLE * 26;
            const fullAnnualSupplement = supplementLoss + annualBasicSupplement;
            const basePensionRateOnly = Math.max(0, basePension - fullAnnualSupplement);
            const proRatedBase = basePensionRateOnly * proportionalRate;
            const finalPension = (basePension > 0) ? (proRatedBase + annualBasicSupplement) : 0;

            return {
                scenarioType,
                annualPension: finalPension,
                description: 'Permanent move: supplement reductions apply from departure date; AWLR proportion applies after 26 weeks',
                supplementLost: supplementLoss,
                awlrApplied: !hasFullPortability,
                awlrYears: awlr,
                awlrRequired: cfg.AWLR_REQUIRED_FOR_FULL,
                proportionalRate,
                pensionReduced: true,
                pccValid: false,
                warnings: [
                    'Supplement reductions apply immediately from departure date (permanent move)',
                    '⚠️ Important: You must usually be an Australian resident in the country for at least 2 years after the pension is granted for it to remain portable.',
                    hasFullPortability
                        ? 'Full AWLR (35+ years): base pension rate preserved'
                        : `Reduced AWLR (${awlr} years): base pension at ${(proportionalRate * 100).toFixed(1)}% after 26 weeks`,
                    agreementCountry
                        ? 'Agreement country: no 2-year waiting period on return'
                        : `Non-agreement country: 2-year waiting period applies if you return within ${cfg.RETURN_WAITING_PERIOD_YEARS} years`
                ]
            };
        }

        case OverseasScenarioType.RETURN_TO_AUSTRALIA:
            // Waiting period scenario
            return {
                scenarioType,
                annualPension: agreementCountry ? basePension : 0,
                description: agreementCountry
                    ? 'Agreement country: pension may continue or be reinstated quickly on return'
                    : `Non-agreement country: ${cfg.RETURN_WAITING_PERIOD_YEARS}-year former resident waiting period before pension restarts`,
                supplementLost: 0,
                awlrApplied: false,
                pensionReduced: !agreementCountry,
                pccValid: false,
                waitingPeriodYears: agreementCountry ? 0 : cfg.RETURN_WAITING_PERIOD_YEARS,
                warnings: agreementCountry
                    ? ['Confirm exact reinstatement rules with Services Australia for your agreement country']
                    : [
                        `${cfg.RETURN_WAITING_PERIOD_YEARS}-year former resident waiting period applies`,
                        'Exception: humanitarian visas may exempt from waiting period',
                        'Apply to Services Australia immediately on return to Australia'
                    ]
            };

        default:
            throw new Error(`Unknown overseas scenario type: ${scenarioType}`);
    }
}

/**
 * Generate all five overseas comparison scenarios for a given person.
 * The research mandates: never show a simple "better overseas" verdict
 * without presenting all scenarios and their risks.
 *
 * Returns: stayInAustralia, shortAbsence, longAbsence, permanentMove, returnToAustralia
 *
 * @param {Object} params
 * @param {number} params.basePension - Pension if staying in Australia (annual AUD)
 * @param {number} params.awlrYears - AWLR years (age 16 to pension age)
 * @param {boolean} params.isCouple
 * @param {boolean} params.agreementCountry
 * @param {number} [params.shortAbsenceWeeks]
 * @returns {Object} All five scenarios plus summary
 */
export function generateOverseasScenarioTree({
    basePension,
    awlrYears,
    isCouple,
    agreementCountry,
    shortAbsenceWeeks
}) {
    const scenarios = {
        stayInAustralia: {
            label: 'Stay in Australia',
            annualPension: basePension,
            description: 'Full pension + all supplements. No portability complexity.',
            risks: [],
            supplements: 'Full supplements retained'
        },
        shortAbsence: calculatePortablePension({
            basePension, awlrYears, isCouple, agreementCountry, shortAbsenceWeeks,
            scenarioType: OverseasScenarioType.SHORT_ABSENCE
        }),
        longAbsence: calculatePortablePension({
            basePension, awlrYears, isCouple, agreementCountry, shortAbsenceWeeks,
            scenarioType: OverseasScenarioType.LONG_ABSENCE
        }),
        permanentMove: calculatePortablePension({
            basePension, awlrYears, isCouple, agreementCountry, shortAbsenceWeeks,
            scenarioType: OverseasScenarioType.PERMANENT_MOVE
        }),
        returnToAustralia: calculatePortablePension({
            basePension, awlrYears, isCouple, agreementCountry, shortAbsenceWeeks,
            scenarioType: OverseasScenarioType.RETURN_TO_AUSTRALIA
        })
    };

    // Summary: pension reduction for permanent move vs staying
    const permanentMovePension = scenarios.permanentMove.annualPension;
    const pensionImpact = basePension > 0
        ? ((basePension - permanentMovePension) / basePension * 100).toFixed(1)
        : '0';

    return {
        ...scenarios,
        summary: {
            basePension,
            permanentMovePension,
            pensionReductionPercent: pensionImpact,
            agreementCountry,
            awlrYears,
            hasFullPortability: awlrYears >= ENHANCED_CONFIG.OVERSEAS_RETIREMENT.AWLR_REQUIRED_FOR_FULL,
            shortAbsenceWeeks: shortAbsenceWeeks ?? ENHANCED_CONFIG.OVERSEAS_RETIREMENT.SHORT_ABSENCE_WEEKS,
            policyDate: ENHANCED_CONFIG.POLICY_EFFECTIVE_DATE,
            disclaimer: 'Never rely on these estimates alone. Confirm your personal entitlement with Services Australia before making any overseas move.'
        }
    };
}

// ============================================================
// TAX ENGINE
// ============================================================

/**
 * Calculate Australian income tax for a given year.
 * Automatically selects the correct tax bracket schedule.
 *
 * @param {number} taxableIncome - Annual taxable income (AUD)
 * @param {number} fiscalYear - Financial year ending (e.g. 2026 = FY2025-26)
 * @param {boolean} [includeMedicareLevy=true] - Whether to add Medicare Levy (2%)
 * @returns {{ incomeTax: number, medicareLevy: number, totalTax: number, effectiveRate: number }}
 */
export function calculateIncomeTax(taxableIncome, fiscalYear, includeMedicareLevy = true) {
    const income = Math.max(0, taxableIncome || 0);

    // Select bracket schedule based on fiscal year
    let brackets;
    if (fiscalYear >= 2028) {
        brackets = ENHANCED_CONFIG.TAX_BRACKETS_2027_28;
    } else if (fiscalYear >= 2027) {
        brackets = ENHANCED_CONFIG.TAX_BRACKETS_2026_27;
    } else {
        brackets = ENHANCED_CONFIG.TAX_BRACKETS;
    }

    let incomeTax = 0;
    for (const bracket of brackets) {
        if (income > bracket.min) {
            const taxableInBracket = Math.min(income, bracket.max === Infinity ? income : bracket.max) - bracket.min;
            incomeTax += taxableInBracket * bracket.rate;
        }
    }

    // Working Australians Tax Offset (WATO) from FY2027-28
    let watoOffset = 0;
    if (fiscalYear >= ENHANCED_CONFIG.WATO_START_FY) {
        watoOffset = Math.min(ENHANCED_CONFIG.WATO_AMOUNT, incomeTax);
        incomeTax = Math.max(0, incomeTax - watoOffset);
    }

    const medicareLevy = includeMedicareLevy ? income * 0.02 : 0;
    const totalTax = incomeTax + medicareLevy;
    const effectiveRate = income > 0 ? totalTax / income : 0;

    return {
        incomeTax: Math.round(incomeTax),
        medicareLevy: Math.round(medicareLevy),
        watoOffset: Math.round(watoOffset),
        totalTax: Math.round(totalTax),
        effectiveRate,
        bracketsUsed: fiscalYear >= 2028 ? '2027-28' : fiscalYear >= 2027 ? '2026-27' : '2025-26',
        policyDate: ENHANCED_CONFIG.POLICY_EFFECTIVE_DATE
    };
}

// ============================================================
// SUPER DRAWDOWN ENGINE
// ============================================================

/**
 * Get the minimum annual pension drawdown rate for a given age.
 * Source: ATO Schedule 7 (2025).
 *
 * @param {number} age
 * @returns {number} Minimum drawdown rate (e.g. 0.05 = 5%)
 */
export function getMinDrawdownRate(age) {
    const rates = ENHANCED_CONFIG.MIN_PENSION_DRAWDOWN_RATES;
    const band = rates.find(r => age >= r.minAge && age <= r.maxAge);
    return band ? band.rate : 0.04; // default to 4% if no band matched
}

/**
 * Calculate minimum annual drawdown amount.
 *
 * @param {number} balance - Account balance at start of year
 * @param {number} age - Member's age at start of year
 * @returns {{ minimumDrawdown: number, rate: number }}
 */
export function calculateMinDrawdown(balance, age) {
    const rate = getMinDrawdownRate(age);
    return {
        minimumDrawdown: Math.max(0, balance * rate),
        rate
    };
}

// ============================================================
// EXPORT: policy constants re-exported for convenience
// (consumers should import from policy-engine, not config directly)
// ============================================================

export const POLICY = {
    effectiveDate: ENHANCED_CONFIG.POLICY_EFFECTIVE_DATE,
    nextReviewDate: ENHANCED_CONFIG.POLICY_NEXT_REVIEW_DATE,
    deemingRateLower: ENHANCED_CONFIG.DEMING_RATE_LOWER,
    deemingRateUpper: ENHANCED_CONFIG.DEMING_RATE_UPPER,
    deemingThresholdSingle: ENHANCED_CONFIG.DEMING_THRESHOLD_SINGLE,
    deemingThresholdCouple: ENHANCED_CONFIG.DEMING_THRESHOLD_COUPLE,
    singlePensionMax: ENHANCED_CONFIG.SINGLE_PENSION_MAX,
    couplePensionMax: ENHANCED_CONFIG.COUPLE_PENSION_MAX,
    pensionAge: ENHANCED_CONFIG.OVERSEAS_RETIREMENT.PENSION_AGE,
    awlrRequired: ENHANCED_CONFIG.OVERSEAS_RETIREMENT.AWLR_REQUIRED_FOR_FULL,
    shortAbsenceWeeks: ENHANCED_CONFIG.OVERSEAS_RETIREMENT.SHORT_ABSENCE_WEEKS,
    portabilityWeeks: ENHANCED_CONFIG.OVERSEAS_RETIREMENT.PORTABILITY_THRESHOLD_WEEKS
};
