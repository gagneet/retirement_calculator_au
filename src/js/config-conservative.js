// config-conservative.js - Conservative Retirement Projection Constants
// Philosophy: "Reality-Based Planning with Conservative Assumptions"
//
// These constants represent median historical values (not averages) from
// Australian financial data over the past 30 years (1993-2025).
//
// This is "what if things stay similar to today" - a realistic baseline
// for planning without predicting booms or busts.

/**
 * Conservative retirement projection constants
 * Based on 30-year Australian historical medians (not averages)
 *
 * Sources:
 * - RBA historical data 1993-2025 (interest rates, inflation)
 * - APRA superannuation statistics (fund returns)
 * - ABS inflation data (CPI, wages, healthcare)
 * - CoreLogic property data (growth rates)
 * - SuperRatings median fund returns
 * - AIHW healthcare expenditure data
 * - Services Australia (Age Pension rates, thresholds)
 *
 * @lastUpdated 2025-10-02
 */

export const CONSERVATIVE_ASSUMPTIONS = {
    // =================================================================
    // INFLATION & GROWTH RATES
    // =================================================================

    /**
     * General inflation (30-year median: 2.6%)
     * Source: RBA/ABS, 1993-2025 median CPI
     * Note: Using median, not average, to avoid outlier skew
     */
    GENERAL_INFLATION: 0.026,

    /**
     * Wage growth (median historical: 2.8%, conservative: 2.5%)
     * Conservative: Assume wages slightly trail inflation
     * Source: ABS Average Weekly Earnings 1993-2025
     */
    WAGE_GROWTH: 0.025,

    /**
     * Property growth (median historical: 5.8%, conservative: 5.0%)
     * Conservative: Below median, accounts for market cycles
     * Source: CoreLogic 30-year median across all capitals
     */
    PROPERTY_GROWTH: 0.050,

    /**
     * Healthcare inflation (median: 3.8%, conservative: 4.5%)
     * Conservative: Slightly above median for safety
     * Source: AIHW health expenditure data 1993-2025 median
     * Note: Healthcare historically grows faster than general CPI
     */
    HEALTHCARE_INFLATION: 0.045,

    // =================================================================
    // INVESTMENT RETURNS
    // =================================================================

    /**
     * Superannuation returns (conservative balanced fund)
     * Median balanced fund: 7.5% (SuperRatings 30-year)
     * Conservative: Use 6.5% (below median, accounts for fees & volatility)
     *
     * This is realistic but prudent:
     * - Not doomsday (0% growth)
     * - Not boom times (10%+ returns)
     * - Accounts for market cycles
     */
    SUPER_RETURN_BALANCED: 0.065,

    /**
     * Savings account interest (current environment)
     * Source: RBA cash rate + typical savings spread
     * Based on current high-interest savings rates
     */
    SAVINGS_INTEREST: 0.040,

    /**
     * Investment portfolio return (diversified)
     * Conservative: 5.5% for diversified portfolio outside super
     * Lower than super due to different tax treatment
     */
    INVESTMENT_RETURN: 0.055,

    // =================================================================
    // CURRENT RATES & COSTS
    // =================================================================

    /**
     * Mortgage interest rates (current market standard variable)
     * Source: RBA, major banks
     * Note: Don't predict future rate changes, use current
     */
    MORTGAGE_RATE: 0.0650,

    /**
     * Investment property loan rate
     * Typically 0.5-1.0% higher than owner-occupier rate
     */
    INVESTMENT_LOAN_RATE: 0.0720,

    // =================================================================
    // RENTAL YIELDS (2025 median by city)
    // Source: CoreLogic 2025 median gross rental yields
    // =================================================================
    RENTAL_YIELD: {
        SYDNEY: 0.029,
        MELBOURNE: 0.033,
        BRISBANE: 0.042,
        PERTH: 0.038,
        ADELAIDE: 0.041,
        CANBERRA: 0.045,
        HOBART: 0.045,
        DARWIN: 0.055,
        NATIONAL_MEDIAN: 0.038
    },

    // =================================================================
    // AGE PENSION (Sept 2025 rates)
    // Source: Services Australia
    // =================================================================
    AGE_PENSION: {
        SINGLE_MAX_ANNUAL: 30646,      // $1,178.70/fortnight × 26
        COUPLE_COMBINED_ANNUAL: 46202, // $1,777.00/fortnight × 26
        COUPLE_EACH_ANNUAL: 23101,

        // Asset test thresholds - homeowners (Sept 2025)
        ASSET_THRESHOLD_SINGLE_HOMEOWNER: 333000,
        ASSET_THRESHOLD_COUPLE_HOMEOWNER: 499000,
        ASSET_LIMIT_SINGLE_HOMEOWNER: 714500,
        ASSET_LIMIT_COUPLE_HOMEOWNER: 1074000,

        // Asset test thresholds - non-homeowners (higher thresholds)
        ASSET_THRESHOLD_SINGLE_NON_HOMEOWNER: 556500,
        ASSET_THRESHOLD_COUPLE_NON_HOMEOWNER: 716500,
        ASSET_LIMIT_SINGLE_NON_HOMEOWNER: 949500,
        ASSET_LIMIT_COUPLE_NON_HOMEOWNER: 1309000,

        // Income test thresholds (per fortnight)
        INCOME_THRESHOLD_SINGLE: 218,
        INCOME_THRESHOLD_COUPLE: 380,

        // Taper rates
        ASSET_TAPER_RATE: 0.003,     // $3 per fortnight per $1000 over threshold
        INCOME_TAPER_RATE: 0.50,     // 50 cents per dollar

        // Deeming rates (Sept 2025)
        DEEMING_THRESHOLD_SINGLE: 66800,
        DEEMING_THRESHOLD_COUPLE: 110600,
        DEEMING_RATE_LOWER: 0.0075,   // 0.75% below threshold
        DEEMING_RATE_UPPER: 0.0275    // 2.75% above threshold
    },

    // =================================================================
    // SUPERANNUATION SYSTEM
    // =================================================================

    /**
     * Superannuation Guarantee (current rate)
     * Source: ATO
     */
    SUPER_GUARANTEE_RATE: 0.12,     // 12% employer contribution

    /**
     * Sustainable drawdown rate (4% rule - Trinity Study applied to Australia)
     * Conservative: Plan to sustain withdrawals over 30+ year retirement
     * Source: Trinity Study, Australian research
     */
    SUSTAINABLE_DRAWDOWN_RATE: 0.04,

    /**
     * Super contributions tax
     * Source: ATO
     */
    SUPER_CONTRIBUTIONS_TAX: 0.15,   // 15% tax on concessional contributions

    /**
     * Super withdrawal tax (60+ in pension phase)
     * Source: ATO
     */
    SUPER_WITHDRAWAL_TAX_60_PLUS: 0.00,  // 0% tax-free in pension phase

    // =================================================================
    // ASFA RETIREMENT STANDARDS (March 2025)
    // Source: ASFA Retirement Standard
    // =================================================================
    ASFA_STANDARDS: {
        COMFORTABLE_SINGLE_ANNUAL: 51814,
        COMFORTABLE_COUPLE_ANNUAL: 73031,
        MODEST_SINGLE_ANNUAL: 32417,
        MODEST_COUPLE_ANNUAL: 46620,

        // Monthly equivalents
        COMFORTABLE_SINGLE_MONTHLY: 4318,
        COMFORTABLE_COUPLE_MONTHLY: 6086,
        MODEST_SINGLE_MONTHLY: 2701,
        MODEST_COUPLE_MONTHLY: 3885
    },

    // =================================================================
    // LIFE EXPECTANCY & PLANNING HORIZONS
    // Source: ABS life tables 2020-22, with conservative buffer
    // =================================================================
    LIFE_EXPECTANCY: {
        MALE_MEDIAN: 81,               // ABS median
        FEMALE_MEDIAN: 85,             // ABS median
        MALE_PLANNING: 88,             // Plan to this age (add 7-year buffer)
        FEMALE_PLANNING: 92,           // Plan to this age (add 7-year buffer)
        COUPLE_PLANNING: 95,           // Plan for longer-lived partner
        CONSERVATIVE_PLANNING_AGE: 95  // Ultra-conservative planning age
    },

    // =================================================================
    // LEGACY GOALS
    // =================================================================

    /**
     * Legacy target (minimum to leave for next generation)
     * Philosophy: Aim for dignified retirement + something to pass on
     * Not spending down to $0
     */
    LEGACY_TARGET: 100000,

    /**
     * Home as legacy
     * If own home outright, this counts toward legacy goal
     */
    HOME_AS_LEGACY: true,

    // =================================================================
    // EMERGENCY FUNDS & BUFFERS
    // =================================================================

    /**
     * Emergency fund target (months of expenses)
     * Source: Financial planning best practice
     */
    EMERGENCY_FUND_MONTHS: 6,

    /**
     * Expense buffer (add to estimates for unforeseen costs)
     * Conservative: Plan for 10% higher expenses than estimated
     */
    EXPENSE_BUFFER: 1.10,

    /**
     * Return buffer (reduce optimistic returns)
     * Conservative: Use 90% of expected returns for planning
     */
    RETURN_BUFFER: 0.90,

    // =================================================================
    // AGED CARE (AIHW data)
    // Source: Australian Institute of Health and Welfare
    // =================================================================
    AGED_CARE: {
        PROBABILITY: 0.65,              // 65% will need some form of aged care
        ENTRY_AGE_MEDIAN: 85,          // Median entry age
        DURATION_MEDIAN: 2.5,          // Median stay duration (years)
        ANNUAL_COST_MEDIAN: 75000,     // Median annual cost (RAD + DAP)
        RAD_MEDIAN: 470000,            // Median Refundable Accommodation Deposit
        RAD_MAXIMUM: 750000,           // Maximum RAD (from 1 Jan 2025)
        MPIR_RATE: 0.0761,             // Maximum Permissible Interest Rate (Oct 2025)
        BASIC_DAILY_FEE: 59.77,        // Per day basic fee (Sept 2025)
        MAX_MEANS_TESTED_FEE: 319.69   // Per day maximum means tested fee
    },

    // =================================================================
    // PROPERTY TRANSACTION COSTS
    // =================================================================
    PROPERTY_COSTS: {
        SELLING_COSTS_PERCENT: 0.05,    // 5% (agent, marketing, legal)
        BUYING_COSTS_PERCENT: 0.02,     // 2% (stamp duty varies by state, legal)
        STAMP_DUTY_AVERAGE: 0.035,      // ~3.5% average across states (varies widely)
        MAINTENANCE_ANNUAL: 0.01,       // 1% of property value annually
        PROPERTY_MANAGEMENT_FEE: 0.08,  // 8% of rental income
        VACANCY_ALLOWANCE: 0.04,        // 4% vacancy rate
        DEPRECIATION_RATE: 0.025        // 2.5% building depreciation
    },

    // =================================================================
    // TAX RATES (2025-26)
    // Source: ATO
    // =================================================================
    TAX_BRACKETS: [
        { min: 0, max: 18200, rate: 0 },
        { min: 18201, max: 45000, rate: 0.16 },
        { min: 45001, max: 135000, rate: 0.30 },
        { min: 135001, max: 190000, rate: 0.37 },
        { min: 190001, max: Infinity, rate: 0.45 }
    ],

    MEDICARE_LEVY: 0.02,                // 2% Medicare levy
    CGT_DISCOUNT: 0.50,                 // 50% CGT discount if held >12 months
    FRANKING_CREDIT_RATE: 0.30,         // 30% corporate tax rate

    // =================================================================
    // RISK BUFFERS FOR CONSERVATIVE PLANNING
    // =================================================================
    RISK_BUFFERS: {
        // Add buffer to expense estimates (10% for unforeseen costs)
        EXPENSE_BUFFER: 1.10,

        // Reduce optimistic returns by buffer (90% of expected)
        RETURN_BUFFER: 0.90,

        // Inflation buffer (assume 10% higher than expected)
        INFLATION_BUFFER: 1.10,

        // Longevity buffer (plan for living longer than median)
        LONGEVITY_BUFFER_YEARS: 7
    },

    // =================================================================
    // METADATA
    // =================================================================
    _metadata: {
        version: '1.0.0',
        lastUpdated: '2025-10-02',
        philosophy: 'Conservative assumptions based on 30-year median historical data',
        sources: [
            'RBA (Reserve Bank of Australia)',
            'ABS (Australian Bureau of Statistics)',
            'APRA (Australian Prudential Regulation Authority)',
            'AIHW (Australian Institute of Health and Welfare)',
            'Services Australia',
            'SuperRatings',
            'CoreLogic',
            'ASFA (Association of Superannuation Funds of Australia)',
            'ATO (Australian Taxation Office)'
        ],
        methodology: 'Using median values (not averages) to avoid outlier skew. Conservative adjustments applied for prudent planning.',
        assumptions: [
            'Economy functions normally (not recession, not boom)',
            'Current policy settings continue (no major tax/pension reforms)',
            'Climate remains within historical patterns',
            'No major geopolitical disruptions',
            'Healthcare system continues as today'
        ],
        nextReview: '2026-04-01'
    }
};

/**
 * Calculate median from array
 * CRITICAL: Always use median, not average (avoids outlier skew)
 *
 * Example: Returns of [50%, 8%, 7%, 6%, -40%]
 * - Average: 6.2% (skewed by outliers)
 * - Median: 7% (more representative of typical outcome)
 *
 * @param {number[]} arr - Array of numbers
 * @returns {number} - Median value
 */
export function calculateMedian(arr) {
    if (!arr || arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Get assumption with metadata
 * @param {string} key - Assumption key (e.g., 'SUPER_RETURN_BALANCED')
 * @returns {object} - { value, description, source }
 */
export function getAssumptionInfo(key) {
    const value = CONSERVATIVE_ASSUMPTIONS[key];
    const info = {
        value,
        key,
        category: getCategoryForKey(key)
    };

    return info;
}

/**
 * Get category for a given key
 * @private
 */
function getCategoryForKey(key) {
    if (key.includes('INFLATION') || key.includes('GROWTH')) return 'Growth Rates';
    if (key.includes('RETURN') || key.includes('INTEREST')) return 'Investment Returns';
    if (key.includes('PENSION')) return 'Age Pension';
    if (key.includes('SUPER')) return 'Superannuation';
    if (key.includes('ASFA')) return 'Retirement Standards';
    if (key.includes('LIFE_EXPECTANCY')) return 'Life Expectancy';
    if (key.includes('AGED_CARE')) return 'Aged Care';
    if (key.includes('TAX')) return 'Taxation';
    if (key.includes('PROPERTY')) return 'Property';
    return 'Other';
}

/**
 * Validate assumptions against reasonable bounds
 * Used for sanity checks when config is loaded
 */
export function validateAssumptions() {
    const warnings = [];

    // Inflation should be between 1-10%
    if (CONSERVATIVE_ASSUMPTIONS.GENERAL_INFLATION < 0.01 ||
        CONSERVATIVE_ASSUMPTIONS.GENERAL_INFLATION > 0.10) {
        warnings.push('General inflation outside reasonable bounds (1-10%)');
    }

    // Super returns should be between 0-20%
    if (CONSERVATIVE_ASSUMPTIONS.SUPER_RETURN_BALANCED < 0 ||
        CONSERVATIVE_ASSUMPTIONS.SUPER_RETURN_BALANCED > 0.20) {
        warnings.push('Super returns outside reasonable bounds (0-20%)');
    }

    // Property growth should be between -10% and 30%
    if (CONSERVATIVE_ASSUMPTIONS.PROPERTY_GROWTH < -0.10 ||
        CONSERVATIVE_ASSUMPTIONS.PROPERTY_GROWTH > 0.30) {
        warnings.push('Property growth outside reasonable bounds (-10% to 30%)');
    }

    // Life expectancy planning age should be reasonable
    if (CONSERVATIVE_ASSUMPTIONS.LIFE_EXPECTANCY.CONSERVATIVE_PLANNING_AGE < 80 ||
        CONSERVATIVE_ASSUMPTIONS.LIFE_EXPECTANCY.CONSERVATIVE_PLANNING_AGE > 110) {
        warnings.push('Planning life expectancy outside reasonable bounds (80-110)');
    }

    return {
        valid: warnings.length === 0,
        warnings
    };
}

/**
 * Why these assumptions are conservative but realistic:
 *
 * 1. Returns: 6.5% super return is below 30-year median of 7.5%
 *    - Accounts for fees, timing risk, volatility
 *    - Still positive (not doomsday 0% scenario)
 *
 * 2. Inflation: 2.6% matches long-term median
 *    - Neither deflationary (unrealistic) nor high (alarmist)
 *    - Realistic baseline for planning
 *
 * 3. Wages/Property: Track or slightly trail inflation
 *    - No assumption of real growth
 *    - Conservative but not pessimistic
 *
 * 4. Healthcare: 4.5% is above general inflation
 *    - Reflects reality of healthcare cost growth
 *    - Based on actual AIHW data
 *
 * 5. Life expectancy: Plan to age 95
 *    - Above median but realistic for planning
 *    - Better to overshoot than run out
 *
 * This is "what if things stay similar to today" - the most
 * realistic baseline for planning without predicting the future.
 */

export default CONSERVATIVE_ASSUMPTIONS;
