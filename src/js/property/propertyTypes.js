/**
 * propertyTypes.js - Shared type constants and validation helpers for
 * the Property & Housing module.
 *
 * Used by all calculators (advanced, advanced-v2/v3, reverse, retirement-v3).
 * No imports from other modules — this file has zero dependencies.
 */

// ---------------------------------------------------------------------------
// Enum-style string constants
// ---------------------------------------------------------------------------

export const PROPERTY_USE = {
    PRIMARY_RESIDENCE: 'primary_residence',
    INVESTMENT: 'investment_property',
    FUTURE_PRIMARY: 'future_primary_residence',
    FUTURE_INVESTMENT: 'future_investment_property',
};

export const ACQUISITION_STATUS = {
    ALREADY_OWNED: 'already_owned',
    PLANNED_PURCHASE: 'planned_purchase',
    REVERSE_CALCULATED: 'reverse_calculated_required_property',
};

export const LOAN_TYPE = {
    PRINCIPAL_INTEREST: 'principal_interest',
    INTEREST_ONLY: 'interest_only',
    SPLIT: 'split',
};

export const REPAYMENT_FREQUENCY = {
    WEEKLY: 'weekly',
    FORTNIGHTLY: 'fortnightly',
    MONTHLY: 'monthly',
    ANNUAL: 'annual',
};

export const PROPERTY_POLICY_MODE = {
    CURRENT: 'current_rules',
    PROPOSED_2027: 'proposed_2027_rules',
    COMPARE: 'compare_current_vs_proposed',
    CUSTOM: 'custom',
};

export const RETIREMENT_STRATEGY = {
    SELL: 'sell_at_retirement',
    KEEP: 'keep_into_retirement',
    DOWNSIZE: 'downsize_at_retirement',
};

// ---------------------------------------------------------------------------
// Australian property growth rates by city (long-run averages, decimal p.a.)
// Source: CoreLogic/RBA historical data through 2025
// ---------------------------------------------------------------------------
export const CITY_GROWTH_RATES = {
    sydney:    0.071,
    melbourne: 0.063,
    brisbane:  0.068,
    perth:     0.058,
    adelaide:  0.065,
    hobart:    0.055,
    darwin:    0.040,
    canberra:  0.062,
    national:  0.065,
};

// Rental yields by city (gross, decimal)
export const CITY_RENTAL_YIELDS = {
    sydney:    0.030,
    melbourne: 0.033,
    brisbane:  0.042,
    perth:     0.050,
    adelaide:  0.043,
    hobart:    0.040,
    darwin:    0.055,
    canberra:  0.038,
    national:  0.038,
};

// Rent growth by city (long-run p.a., decimal)
export const CITY_RENT_GROWTH = {
    sydney:    0.035,
    melbourne: 0.030,
    brisbane:  0.038,
    perth:     0.032,
    adelaide:  0.033,
    hobart:    0.028,
    darwin:    0.025,
    canberra:  0.030,
    national:  0.032,
};

// ---------------------------------------------------------------------------
// Australian tax policy defaults (financial year 2025-26)
// ---------------------------------------------------------------------------
export const TAX_POLICY_DEFAULTS = {
    // Current rules
    currentCgtDiscountRate: 0.50,
    negativeGearingCurrentAllowed: true,
    pporMainResidenceExemption: true,

    // Proposed 2027 rules (configurable assumptions — NOT law)
    negativeGearingProposedEstablishedAllowed: false,
    negativeGearingProposedNewBuildAllowed: true,
    carriedForwardLossesAllowed: true,
    proposedMinimumCgtRate: 0.20,
    proposedUsesInflationIndexation: true,

    // Effective CGT rate helpers (discount × marginal; no double-dipping)
    marginalTaxRateDefault: 0.325,
};

// ---------------------------------------------------------------------------
// Stochastic defaults for property Monte Carlo
// ---------------------------------------------------------------------------
export const STOCHASTIC_DEFAULTS = {
    interestRateMean: 0.0612,
    interestRateSigma: 0.015,
    interestRateFloor: 0.02,
    interestRateCeiling: 0.12,

    inflationMean: 0.036,
    inflationSigma: 0.012,
    inflationFloor: 0.005,

    propertyGrowthSigmaFactor: 0.60,
    propertyGrowthFloor: -0.15,

    rentGrowthSigmaFactor: 0.40,
    rentGrowthFloor: -0.05,

    vacancyShockProbability: 0.05,
    maintenanceShockProbability: 0.03,
    maintenanceShockMultiplier: 3.0,
};

// ---------------------------------------------------------------------------
// Selling cost defaults (AU market)
// ---------------------------------------------------------------------------
export const SELLING_COSTS = {
    agentCommissionRate: 0.022,
    marketingCost: 3500,
    legalFees: 1800,
    otherCosts: 500,
};

export const BUYING_COSTS = {
    stampDutyRate: 0.04,      // approximate average across states
    legalFees: 1500,
    inspectionCosts: 800,
    loanEstablishment: 600,
    otherCosts: 500,
};

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

export function validatePropertyInput(p) {
    const errors = [];

    if (!p.id)          errors.push('Property must have an id');
    if (!PROPERTY_USE[Object.keys(PROPERTY_USE).find(k => PROPERTY_USE[k] === p.useType)])
        errors.push(`Unknown useType: ${p.useType}`);

    if (p.useType === PROPERTY_USE.INVESTMENT && !(p.weeklyRent > 0))
        errors.push('Investment property must have a positive weeklyRent');

    if (p.ownershipUserPct == null || p.ownershipUserPct < 0 || p.ownershipUserPct > 100)
        errors.push('ownershipUserPct must be between 0 and 100');

    const partnerPct = p.ownershipPartnerPct ?? 0;
    if (Math.abs(p.ownershipUserPct + partnerPct - 100) > 0.1)
        errors.push('Ownership percentages must sum to 100');

    if (p.purchaseDate && p.saleDate && new Date(p.purchaseDate) >= new Date(p.saleDate))
        errors.push('Purchase date must be before sale date');

    if (p.isNewBuild === false && p.taxPolicy?.policyMode === PROPERTY_POLICY_MODE.PROPOSED_2027)
        errors.push('Established property cannot claim new-build proposed-rule treatment');

    return errors;
}

export default {
    PROPERTY_USE,
    ACQUISITION_STATUS,
    LOAN_TYPE,
    REPAYMENT_FREQUENCY,
    PROPERTY_POLICY_MODE,
    RETIREMENT_STRATEGY,
    CITY_GROWTH_RATES,
    CITY_RENTAL_YIELDS,
    CITY_RENT_GROWTH,
    TAX_POLICY_DEFAULTS,
    STOCHASTIC_DEFAULTS,
    SELLING_COSTS,
    BUYING_COSTS,
    validatePropertyInput,
};
