/**
 * propertyComparison.js - Property vs ETF / Super comparison engine.
 *
 * Compares the after-tax, after-cost outcome of:
 *   - Investment property (via propertyMonteCarlo deterministic)
 *   - ETF / diversified share portfolio
 *   - Additional superannuation contributions
 *
 * Also supports policy comparison (current vs proposed 2027).
 */

import { PROPERTY_POLICY_MODE } from './propertyTypes.js';
import { runPropertyDeterministic, runPropertyMonteCarlo } from './propertyMonteCarlo.js';

const fin = (v, def = 0) => { const n = Number(v); return Number.isFinite(n) ? n : def; };

// ---------------------------------------------------------------------------
// ETF / super growth projection (simple compound)
// ---------------------------------------------------------------------------

/**
 * Project an ETF or super investment over N years.
 *
 * @param {number} initialAmount  - Starting capital
 * @param {number} annualReturn   - Expected nominal return (decimal, e.g. 0.085)
 * @param {number} annualContrib  - Additional annual contribution
 * @param {number} years
 * @param {number} taxRate        - Tax on annual distributions (0 for super in accumulation)
 * @returns {{ finalValue, totalContributed, realFinalValue, irr, yearlyValues }}
 */
export function projectETF(initialAmount, annualReturn, annualContrib = 0, years = 20, taxRate = 0, inflationRate = 0.036) {
    let value = fin(initialAmount);
    const contrib = fin(annualContrib);
    let totalContrib = fin(initialAmount);
    const yearlyValues = [];

    for (let y = 0; y < years; y++) {
        const pretaxReturn = value * fin(annualReturn);
        const afterTaxReturn = pretaxReturn * (1 - fin(taxRate));
        value = value + afterTaxReturn + contrib;
        totalContrib += contrib;
        yearlyValues.push({ year: y + 1, value, afterTaxReturn });
    }

    const cpiMult = Math.pow(1 + fin(inflationRate, 0.036), years);
    const realFinalValue = value / cpiMult;

    return { finalValue: value, totalContributed: totalContrib, realFinalValue, yearlyValues };
}

/**
 * Project a super balance in accumulation phase.
 *
 * @param {number} balance        - Current super balance
 * @param {number} annualReturn   - Expected return (default 8.5% for balanced fund)
 * @param {number} annualContrib  - Additional concessional contributions
 * @param {number} years
 * @returns {{ finalValue, totalContributed, realFinalValue, yearlyValues }}
 */
export function projectSuper(balance, annualReturn = 0.085, annualContrib = 0, years = 20, inflationRate = 0.036) {
    return projectETF(balance, annualReturn, annualContrib, years, 0.15, inflationRate);
}

// ---------------------------------------------------------------------------
// Core comparison
// ---------------------------------------------------------------------------

/**
 * Compare property investment vs ETF alternative given the same initial capital.
 *
 * The same upfront cash (deposit + buying costs) is assumed invested in ETF
 * as the alternative. Annual negative cashflow from property is also treated
 * as additional ETF contributions in the alternative.
 *
 * @param {Object} prop        - PropertyInput
 * @param {Object} propOpts    - { holdYears, startPropertyValue, startLoanBalance, propertyGrowthRate, inflationRate, policy }
 * @param {Object} etfOpts     - { annualReturn, taxRate }
 * @returns {Object} Comparison result
 */
export function comparePropertyVsETF(prop, propOpts = {}, etfOpts = {}) {
    const holdYears    = fin(propOpts.holdYears, 20);
    const inflation    = fin(propOpts.inflationRate, 0.036);
    const etfReturn    = fin(etfOpts.annualReturn, 0.085);
    const etfTaxRate   = fin(etfOpts.taxRate, 0.235);

    // Property path
    const propResult = runPropertyDeterministic(prop, propOpts);

    // ETF alternative: invest the same upfront cash
    const initialCapital = fin(propResult.totalCashContributed);  // deposit paid in year 0
    const annualCashNeeded = propResult.yearlyData.map(y => Math.max(0, -y.netCashflowAfterTax));
    let etfValue = initialCapital;
    const etfYearlyValues = [];
    let etfTotalContrib = initialCapital;

    for (let y = 0; y < holdYears; y++) {
        const pretaxReturn   = etfValue * etfReturn;
        const afterTaxReturn = pretaxReturn * (1 - etfTaxRate);
        const extraContrib   = annualCashNeeded[y] ?? 0;  // invest what would have been cash top-up
        etfValue = etfValue + afterTaxReturn + extraContrib;
        etfTotalContrib += extraContrib;
        etfYearlyValues.push({ year: y + 1, value: etfValue, annualReturn: afterTaxReturn });
    }

    const cpiMult           = Math.pow(1 + inflation, holdYears);
    const etfRealFinalValue = etfValue / cpiMult;
    const propRealProfit    = propResult.realAfterTaxProfit;

    return {
        holdYears,
        property: {
            finalValue:         propResult.finalValue,
            finalEquity:        propResult.finalEquity,
            netSaleProceeds:    propResult.saleProceeds,
            totalCashIn:        propResult.totalCashContributed,
            realAfterTaxProfit: propRealProfit,
            irr:                propResult.irr,
            cgtPayable:         propResult.cgtPayable,
            yearlyValues:       propResult.yearlyData.map(y => ({ year: y.year, value: y.value, equity: y.equity })),
        },
        etf: {
            finalValue:         etfValue,
            realFinalValue:     etfRealFinalValue,
            totalContributed:   etfTotalContrib,
            realProfit:         etfRealFinalValue - initialCapital,
            yearlyValues:       etfYearlyValues,
        },
        difference: {
            realProfit:         propRealProfit - (etfRealFinalValue - initialCapital),
            finalValue:         propResult.finalEquity - etfValue,
            winner:             propRealProfit >= (etfRealFinalValue - initialCapital) ? 'property' : 'etf',
        },
    };
}

/**
 * Compare property investment vs additional super contributions.
 */
export function comparePropertyVsSuper(prop, propOpts = {}, superOpts = {}) {
    const holdYears   = fin(propOpts.holdYears, 20);
    const inflation   = fin(propOpts.inflationRate, 0.036);
    const superReturn = fin(superOpts.annualReturn, 0.085);

    const propResult       = runPropertyDeterministic(prop, propOpts);
    const initialCapital   = fin(propResult.totalCashContributed);
    const annualTopUps     = propResult.yearlyData.map(y => Math.max(0, -y.netCashflowAfterTax));

    const totalAnnualContrib = annualTopUps.length > 0
        ? annualTopUps.reduce((a, b) => a + b, 0) / annualTopUps.length
        : 0;

    const superResult = projectSuper(initialCapital, superReturn, totalAnnualContrib, holdYears, inflation);
    const cpiMult = Math.pow(1 + inflation, holdYears);

    return {
        holdYears,
        property: {
            finalEquity:        propResult.finalEquity,
            netSaleProceeds:    propResult.saleProceeds,
            realAfterTaxProfit: propResult.realAfterTaxProfit,
            irr:                propResult.irr,
        },
        super: {
            finalBalance:       superResult.finalValue,
            realFinalBalance:   superResult.realFinalValue,
            totalContributed:   superResult.totalContributed,
            realProfit:         superResult.realFinalValue - initialCapital,
        },
        difference: {
            winner: propResult.realAfterTaxProfit >= (superResult.realFinalValue - initialCapital) ? 'property' : 'super',
        },
    };
}

/**
 * Full comparison: property under current policy vs proposed policy vs ETF vs super.
 * Uses deterministic projection for all paths; use MC separately for distributions.
 */
export function fullComparisonMatrix(prop, opts = {}) {
    const currentPolicy  = { ...prop.taxPolicy, policyMode: PROPERTY_POLICY_MODE.CURRENT };
    const proposedPolicy = { ...prop.taxPolicy, policyMode: PROPERTY_POLICY_MODE.PROPOSED_2027 };

    const currentVsEtf  = comparePropertyVsETF(prop, { ...opts, policy: currentPolicy  }, opts.etf);
    const proposedVsEtf = comparePropertyVsETF(prop, { ...opts, policy: proposedPolicy }, opts.etf);
    const currentVsSuper  = comparePropertyVsSuper(prop, { ...opts, policy: currentPolicy  }, opts.super);

    return {
        currentRules:  currentVsEtf,
        proposedRules: proposedVsEtf,
        superComparison: currentVsSuper,
        summary: {
            bestOption: [
                { label: 'Property (current rules)', value: currentVsEtf.property.realAfterTaxProfit },
                { label: 'Property (proposed 2027)', value: proposedVsEtf.property.realAfterTaxProfit },
                { label: 'ETF',                      value: currentVsEtf.etf.realProfit },
                { label: 'Super',                    value: currentVsSuper.super.realProfit },
            ].reduce((a, b) => (b.value > a.value ? b : a)).label,
        },
    };
}

export default {
    projectETF,
    projectSuper,
    comparePropertyVsETF,
    comparePropertyVsSuper,
    fullComparisonMatrix,
};
