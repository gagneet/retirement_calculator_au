/**
 * propertyTax.js - Tax policy engine for the Property & Housing module.
 *
 * Supports:
 *   - Current rules (negative gearing, 50% CGT discount, PPOR exemption)
 *   - Proposed 2027 rules (configurable assumptions — NOT legislation)
 *   - Side-by-side comparison outputs
 *   - Partial PPOR CGT (mixed use)
 *
 * All policy parameters are configurable to reflect that proposed rules
 * are not yet law. Labels in the UI must warn users of this.
 */

import { PROPERTY_POLICY_MODE, TAX_POLICY_DEFAULTS } from './propertyTypes.js';

const fin = (v, def = 0) => { const n = Number(v); return Number.isFinite(n) ? n : def; };

// ---------------------------------------------------------------------------
// Tax bracket calculation (Australian 2025-26)
// ---------------------------------------------------------------------------

/**
 * Calculate Australian income tax + Medicare levy on a taxable income.
 * Tax-free threshold applies; LMITO/LITO not modelled (calculator caveat).
 *
 * @param {number} income - Taxable income (nominal $)
 * @returns {number} Total tax payable
 */
export function calcIncomeTax(income) {
    const i = Math.max(0, fin(income));
    const MEDICARE = 0.02;
    let tax = 0;
    if (i <= 18200)        tax = 0;
    else if (i <= 45000)   tax = (i - 18200) * 0.19;
    else if (i <= 135000)  tax = 5092 + (i - 45000) * 0.325;
    else if (i <= 190000)  tax = 34342 + (i - 135000) * 0.37;
    else                   tax = 54692 + (i - 190000) * 0.45;
    return tax + i * MEDICARE;
}

export function calcMarginalTaxRate(income) {
    const i = Math.max(0, fin(income));
    const ML = 0.02;
    if (i <= 18200)  return ML;
    if (i <= 45000)  return 0.19 + ML;
    if (i <= 135000) return 0.325 + ML;
    if (i <= 190000) return 0.37 + ML;
    return 0.45 + ML;
}

// ---------------------------------------------------------------------------
// Negative gearing
// ---------------------------------------------------------------------------

/**
 * Calculate annual negative gearing tax benefit / cost.
 *
 * @param {number} taxableRentalIncome  - Can be negative (loss) or positive (profit)
 * @param {number} marginalTaxRate      - Decimal tax rate of property owner
 * @param {Object} policy               - PropertyTaxPolicyConfig
 * @returns {{ taxBenefit: number, carriedForwardLoss: number }}
 */
export function calcNegativeGearingBenefit(taxableRentalIncome, marginalTaxRate, policy, openingCarriedLoss = 0) {
    const cfg = buildEffectivePolicy(policy);
    const income = fin(taxableRentalIncome);
    const mtr    = fin(marginalTaxRate, TAX_POLICY_DEFAULTS.marginalTaxRateDefault);
    const existingLoss = fin(openingCarriedLoss);

    let taxBenefit = 0;
    let closingCarriedLoss = existingLoss;

    if (!cfg.negativeGearingAllowed) {
        if (income < 0 && cfg.carriedForwardLossesAllowed) {
            closingCarriedLoss = existingLoss + Math.abs(income);
        }
        // Offset carried-forward losses against positive income
        if (income > 0 && closingCarriedLoss > 0) {
            const applied = Math.min(closingCarriedLoss, income);
            const netIncome = income - applied;
            closingCarriedLoss -= applied;
            taxBenefit = -(netIncome * mtr);
        } else if (income > 0) {
            taxBenefit = -(income * mtr);
        }
        // No immediate deduction when no negative gearing allowed
    } else {
        // Negative gearing allowed — loss deducts from taxable income
        taxBenefit = -(income * mtr); // positive when income < 0 (loss → tax refund)
    }

    return { taxBenefit, closingCarriedLoss };
}

// ---------------------------------------------------------------------------
// Capital Gains Tax
// ---------------------------------------------------------------------------

/**
 * Calculate CGT payable on sale of an investment property.
 *
 * Supports:
 *   - Current rules: 50% discount if held >12 months
 *   - Proposed rules: inflation-indexed cost base OR minimum 20% effective rate
 *   - PPOR exemption (full or partial)
 *
 * @param {Object} params
 * @param {number} params.salePrice
 * @param {number} params.purchasePrice      - Nominal cost base
 * @param {number} params.sellingCosts       - Deductible selling costs
 * @param {number} params.holdingYears       - Actual years held
 * @param {number} params.marginalTaxRate    - Owner's marginal tax rate
 * @param {boolean} params.isPpor            - Is PPOR main residence?
 * @param {number}  [params.pporPct]         - % of time used as PPOR (0-1 for partial)
 * @param {number}  [params.cpiCumulative]   - Cumulative CPI multiplier since purchase (for indexation)
 * @param {Object}  [params.policy]          - PropertyTaxPolicyConfig
 * @param {number}  [params.capitalLossPool] - Carried forward capital losses
 * @returns {{ cgtPayable, capitalGain, taxableGain, effectiveRate, capitalLossPool }}
 */
export function calcCGT(params) {
    const {
        salePrice,
        purchasePrice,
        sellingCosts      = 0,
        holdingYears      = 0,
        marginalTaxRate,
        isPpor            = false,
        pporPct           = 1,
        cpiCumulative     = 1,
        policy,
        capitalLossPool   = 0,
    } = params;

    const sp  = fin(salePrice);
    const pp  = fin(purchasePrice);
    const sc  = fin(sellingCosts);
    const mtr = fin(marginalTaxRate, TAX_POLICY_DEFAULTS.marginalTaxRateDefault);
    const cfg = buildEffectivePolicy(policy);

    const rawCapitalGain = sp - pp - sc;

    // PPOR main residence exemption
    if (isPpor && cfg.pporMainResidenceExemption) {
        if (fin(pporPct) >= 1) {
            return { cgtPayable: 0, capitalGain: rawCapitalGain, taxableGain: 0, effectiveRate: 0, capitalLossPool: fin(capitalLossPool) };
        }
        // Partial rental use — only non-PPOR portion taxed
    }

    const investmentGain = isPpor
        ? rawCapitalGain * (1 - fin(pporPct, 1))
        : rawCapitalGain;

    if (investmentGain <= 0) {
        const newPool = fin(capitalLossPool) + Math.abs(investmentGain);
        return { cgtPayable: 0, capitalGain: investmentGain, taxableGain: 0, effectiveRate: 0, capitalLossPool: newPool };
    }

    let discountedGain;

    if (cfg.policyMode === PROPERTY_POLICY_MODE.PROPOSED_2027 || cfg.policyMode === PROPERTY_POLICY_MODE.CUSTOM) {
        if (cfg.proposedUsesInflationIndexation) {
            // Indexed cost base: inflation-adjust purchase price, no discount
            const indexedCostBase = pp * fin(cpiCumulative, 1);
            const indexedGain     = Math.max(0, sp - indexedCostBase - sc);
            discountedGain = investmentGain < rawCapitalGain
                ? indexedGain * (1 - fin(pporPct, 0))
                : indexedGain;
        } else {
            discountedGain = investmentGain;
        }
    } else {
        // Current rules: 50% discount if held >12 months
        discountedGain = holdingYears >= 1
            ? investmentGain * (1 - fin(cfg.currentCgtDiscountRate, TAX_POLICY_DEFAULTS.currentCgtDiscountRate))
            : investmentGain;
    }

    // Apply capital loss pool
    let openPool = fin(capitalLossPool);
    let taxableGain = discountedGain;
    if (openPool > 0) {
        const applied = Math.min(openPool, taxableGain);
        taxableGain  -= applied;
        openPool     -= applied;
    }

    const rawCgt = taxableGain * mtr;

    // Proposed minimum CGT rate check
    let cgtPayable = rawCgt;
    if (cfg.policyMode === PROPERTY_POLICY_MODE.PROPOSED_2027 && cfg.proposedMinimumCgtRate > 0) {
        const minCgt = investmentGain * fin(cfg.proposedMinimumCgtRate, TAX_POLICY_DEFAULTS.proposedMinimumCgtRate);
        cgtPayable = Math.max(rawCgt, minCgt);
    }

    const effectiveRate = rawCapitalGain > 0 ? cgtPayable / rawCapitalGain : 0;

    return {
        cgtPayable,
        capitalGain:    investmentGain,
        discountedGain,
        taxableGain,
        effectiveRate,
        capitalLossPool: openPool,
    };
}

// ---------------------------------------------------------------------------
// Policy comparison helper
// ---------------------------------------------------------------------------

/**
 * Calculate CGT under both current and proposed 2027 rules for comparison.
 * Returns both results side-by-side.
 */
export function compareCGTPolicies(params) {
    const currentResult   = calcCGT({ ...params, policy: { ...params.policy, policyMode: PROPERTY_POLICY_MODE.CURRENT } });
    const proposedResult  = calcCGT({ ...params, policy: { ...params.policy, policyMode: PROPERTY_POLICY_MODE.PROPOSED_2027 } });

    return {
        current:  currentResult,
        proposed: proposedResult,
        saving:   proposedResult.cgtPayable - currentResult.cgtPayable,  // positive = proposed costs more
    };
}

/**
 * Compare annual negative gearing benefit under both policy modes.
 */
export function compareNegativeGearing(taxableRentalIncome, marginalTaxRate, policy, openingCarriedLoss = 0) {
    const currentResult  = calcNegativeGearingBenefit(
        taxableRentalIncome, marginalTaxRate,
        { ...policy, negativeGearingAllowed: true, carriedForwardLossesAllowed: false },
        openingCarriedLoss
    );
    const proposedResult = calcNegativeGearingBenefit(
        taxableRentalIncome, marginalTaxRate,
        buildEffectivePolicy({ ...policy, policyMode: PROPERTY_POLICY_MODE.PROPOSED_2027 }),
        openingCarriedLoss
    );

    return {
        current:  currentResult,
        proposed: proposedResult,
        annualDifference: proposedResult.taxBenefit - currentResult.taxBenefit,
    };
}

// ---------------------------------------------------------------------------
// Policy builder
// ---------------------------------------------------------------------------

/**
 * Build effective policy config from user inputs, filling in defaults.
 *
 * @param {Object} [policy] - Partial PropertyTaxPolicyConfig
 * @returns {Object} Full config
 */
export function buildEffectivePolicy(policy = {}) {
    const mode = policy?.policyMode ?? PROPERTY_POLICY_MODE.CURRENT;

    const isProposed = mode === PROPERTY_POLICY_MODE.PROPOSED_2027 || mode === PROPERTY_POLICY_MODE.CUSTOM;
    const isNewBuild = policy?.isNewBuild ?? false;

    return {
        policyMode:                                mode,
        marginalTaxRateUser:                       fin(policy?.marginalTaxRateUser,   TAX_POLICY_DEFAULTS.marginalTaxRateDefault),
        marginalTaxRatePartner:                    fin(policy?.marginalTaxRatePartner, TAX_POLICY_DEFAULTS.marginalTaxRateDefault),
        currentCgtDiscountRate:                    fin(policy?.currentCgtDiscountRate, TAX_POLICY_DEFAULTS.currentCgtDiscountRate),
        proposedMinimumCgtRate:                    fin(policy?.proposedMinimumCgtRate, TAX_POLICY_DEFAULTS.proposedMinimumCgtRate),
        proposedUsesInflationIndexation:           policy?.proposedUsesInflationIndexation ?? TAX_POLICY_DEFAULTS.proposedUsesInflationIndexation,
        negativeGearingAllowed:                    isProposed
            ? (isNewBuild ? TAX_POLICY_DEFAULTS.negativeGearingProposedNewBuildAllowed
                          : TAX_POLICY_DEFAULTS.negativeGearingProposedEstablishedAllowed)
            : TAX_POLICY_DEFAULTS.negativeGearingCurrentAllowed,
        negativeGearingCurrentAllowed:             fin(policy?.negativeGearingCurrentAllowed,          TAX_POLICY_DEFAULTS.negativeGearingCurrentAllowed),
        negativeGearingProposedEstablishedAllowed: fin(policy?.negativeGearingProposedEstablishedAllowed, TAX_POLICY_DEFAULTS.negativeGearingProposedEstablishedAllowed),
        negativeGearingProposedNewBuildAllowed:    fin(policy?.negativeGearingProposedNewBuildAllowed,    TAX_POLICY_DEFAULTS.negativeGearingProposedNewBuildAllowed),
        carriedForwardLossesAllowed:               policy?.carriedForwardLossesAllowed ?? TAX_POLICY_DEFAULTS.carriedForwardLossesAllowed,
        pporMainResidenceExemption:                policy?.pporMainResidenceExemption  ?? TAX_POLICY_DEFAULTS.pporMainResidenceExemption,
        isNewBuild,
    };
}

export default {
    calcIncomeTax,
    calcMarginalTaxRate,
    calcNegativeGearingBenefit,
    calcCGT,
    compareCGTPolicies,
    compareNegativeGearing,
    buildEffectivePolicy,
};
