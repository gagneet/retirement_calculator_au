/**
 * propertyMonteCarlo.js - Stochastic Monte Carlo engine for property projections.
 *
 * Runs N independent paths, each drawing per-year rates from normal distributions.
 * Supports seeded RNG for test reproducibility.
 *
 * Returns P10/P25/P50/P75/P90 percentiles for key outputs.
 */

import { CITY_GROWTH_RATES, STOCHASTIC_DEFAULTS, PROPERTY_POLICY_MODE } from './propertyTypes.js';
import { calcAnnualPropertyCashflow, calcSaleProceeds, calcIRR, calcRealAfterTaxProfit } from './propertyCashflow.js';
import { calcCGT, calcNegativeGearingBenefit, buildEffectivePolicy } from './propertyTax.js';

const fin = (v, def = 0) => { const n = Number(v); return Number.isFinite(n) ? n : def; };

// ---------------------------------------------------------------------------
// Seeded random number generator (Mulberry32) for reproducible MC
// ---------------------------------------------------------------------------

function mulberry32(seed) {
    return function () {
        let t = (seed += 0x6d2b79f5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function normalDraw(rand, mean, sigma, floor = null, ceiling = null) {
    const u1 = Math.max(1e-10, rand());
    const u2 = rand();
    const z  = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    let v = mean + z * sigma;
    if (floor   !== null) v = Math.max(floor,   v);
    if (ceiling !== null) v = Math.min(ceiling, v);
    return v;
}

// ---------------------------------------------------------------------------
// Single-path projection
// ---------------------------------------------------------------------------

/**
 * Run one deterministic or stochastic projection for a single property.
 *
 * @param {Object}   prop         - PropertyInput
 * @param {Object}   opts         - Simulation options
 * @param {Function} [rand]       - Random function (mulberry32 output or Math.random)
 * @returns {{ yearlyData, totalCashContributed, finalValue, finalEquity, irr, realAfterTaxProfit, cgtPayable }}
 */
function runOnePath(prop, opts, rand = Math.random) {
    const {
        holdYears,
        startPropertyValue,
        startLoanBalance,
        propertyGrowthRate,
        stochastic   = false,
        sDate,
        policy,
    } = opts;

    const sd       = STOCHASTIC_DEFAULTS;
    const city     = prop.city ?? 'national';
    const baseGrowth = fin(propertyGrowthRate ?? CITY_GROWTH_RATES[city] ?? CITY_GROWTH_RATES.national);
    const growthSigma = Math.max(0.02, Math.abs(baseGrowth) * sd.propertyGrowthSigmaFactor);

    const baseRent     = fin(prop.expenses?.rentGrowthRate ?? 0.032);
    const rentSigma    = Math.max(0.005, Math.abs(baseRent) * sd.rentGrowthSigmaFactor);

    const baseInflation = fin(opts.inflationRate ?? sd.inflationMean);
    const inflSigma     = Math.max(0.005, Math.abs(baseInflation) * 0.40);

    const baseInterest = fin(prop.interestRate ?? sd.interestRateMean);
    const intSigma     = sd.interestRateSigma;

    const cfg   = buildEffectivePolicy(policy ?? prop.taxPolicy);
    const mtr   = fin(cfg.marginalTaxRateUser);
    const pp    = fin(prop.purchasePrice ?? startPropertyValue);

    let propertyValue    = fin(startPropertyValue);
    let loanBalance      = fin(startLoanBalance ?? prop.currentLoanBalance);
    let cpiCumulative    = 1;
    let carriedLoss      = 0;
    let totalOutOfPocket = 0;
    const cashflows      = [-fin(prop.depositPaid ?? (pp - loanBalance))]; // initial outflow
    const yearlyData     = [];

    for (let y = 0; y < holdYears; y++) {
        const growthRate   = stochastic ? normalDraw(rand, baseGrowth,   growthSigma, sd.propertyGrowthFloor) : baseGrowth;
        const rentGrowth   = stochastic ? normalDraw(rand, baseRent,     rentSigma,   sd.rentGrowthFloor)     : baseRent;
        const cpiGrowth    = stochastic ? normalDraw(rand, baseInflation, inflSigma,   sd.inflationFloor)      : baseInflation;
        const interestRate = stochastic ? normalDraw(rand, baseInterest,  intSigma,    sd.interestRateFloor, sd.interestRateCeiling) : baseInterest;

        const newValue = propertyValue * (1 + growthRate);
        cpiCumulative *= (1 + cpiGrowth);

        const cashflow = calcAnnualPropertyCashflow(prop, {
            year:          y,
            propertyValue: newValue,
            loanBalance,
            cpiGrowth,
            rentGrowth,
            interestRate,
        });

        // Negative gearing benefit / tax
        const { taxBenefit, closingCarriedLoss } = calcNegativeGearingBenefit(
            cashflow.taxableRentalIncome,
            mtr,
            cfg,
            carriedLoss
        );
        carriedLoss = closingCarriedLoss;

        const netCashflowAfterTax = cashflow.netCashflowBeforeTax + taxBenefit;

        // Maintenance shocks
        let shockCost = 0;
        if (stochastic && rand() < sd.maintenanceShockProbability) {
            shockCost = fin(prop.expenses?.maintenance, 2000) * sd.maintenanceShockMultiplier;
        }

        const netYearCashflow = netCashflowAfterTax - shockCost;

        // Investor out-of-pocket for this year
        if (netYearCashflow < 0) totalOutOfPocket += Math.abs(netYearCashflow);

        cashflows.push(netYearCashflow);
        propertyValue = newValue;
        loanBalance   = cashflow.closingLoan;

        yearlyData.push({
            year:   y + 1,
            value:  propertyValue,
            loanBalance,
            equity: propertyValue - loanBalance,
            grossRent:      cashflow.grossRent,
            netRent:        cashflow.netRent,
            taxBenefit,
            netCashflowBeforeTax: cashflow.netCashflowBeforeTax,
            netCashflowAfterTax,
            taxableRentalIncome:  cashflow.taxableRentalIncome,
            interestPaid:   cashflow.interestPaid,
            growthRate,
            interestRate,
            cpiGrowth,
        });
    }

    // Sale at end of hold period
    const cgtResult = calcCGT({
        salePrice:      propertyValue,
        purchasePrice:  pp,
        sellingCosts:   0,
        holdingYears:   holdYears,
        marginalTaxRate: mtr,
        isPpor:         prop.isPpor,
        cpiCumulative,
        policy:         cfg,
        capitalLossPool: carriedLoss,
    });

    const saleProceeds = calcSaleProceeds(propertyValue, loanBalance, pp, cgtResult.cgtPayable);
    cashflows.push(saleProceeds.netProceeds);

    const irr = calcIRR(cashflows);
    const realAfterTaxProfit = calcRealAfterTaxProfit(saleProceeds.netProceeds, totalOutOfPocket, cpiCumulative);

    return {
        yearlyData,
        totalCashContributed: totalOutOfPocket + fin(prop.depositPaid ?? (pp - fin(startLoanBalance ?? prop.currentLoanBalance))),
        finalValue:           propertyValue,
        finalLoanBalance:     loanBalance,
        finalEquity:          propertyValue - loanBalance,
        saleProceeds:         saleProceeds.netProceeds,
        cgtPayable:           cgtResult.cgtPayable,
        irr,
        realAfterTaxProfit,
        carriedLoss,
    };
}

// ---------------------------------------------------------------------------
// Multi-path MC
// ---------------------------------------------------------------------------

const PERCENTILES = [10, 25, 50, 75, 90];

function percentileValue(sorted, p) {
    if (!sorted.length) return 0;
    const idx = Math.max(0, Math.round((p / 100) * sorted.length) - 1);
    return sorted[idx];
}

function buildPercentiles(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const result = {};
    for (const p of PERCENTILES) result[`p${p}`] = percentileValue(sorted, p);
    return result;
}

/**
 * Run N Monte Carlo paths for a single property.
 *
 * @param {Object} prop    - PropertyInput
 * @param {Object} opts    - { holdYears, startPropertyValue, startLoanBalance, propertyGrowthRate, inflationRate, policy, numRuns, seed }
 * @returns {Object} Percentile outputs + per-path data
 */
export function runPropertyMonteCarlo(prop, opts = {}) {
    const numRuns = Math.max(1, fin(opts.numRuns, 500));
    const seed    = opts.seed != null ? fin(opts.seed) : null;
    const rand    = seed != null ? mulberry32(seed) : Math.random;

    const results = [];
    for (let i = 0; i < numRuns; i++) {
        results.push(runOnePath(prop, { ...opts, stochastic: true }, rand));
    }

    // Collect key metrics for percentiles
    const irrVals      = results.map(r => r.irr ?? 0);
    const realProfits  = results.map(r => r.realAfterTaxProfit);
    const equityVals   = results.map(r => r.finalEquity);
    const saleVals     = results.map(r => r.saleProceeds);
    const cashContrib  = results.map(r => r.totalCashContributed);
    const cgtVals      = results.map(r => r.cgtPayable);

    // Fan chart: per-year value percentiles
    const holdYears    = fin(opts.holdYears, 20);
    const yearlyValueFan = [];
    for (let y = 0; y < holdYears; y++) {
        const yearVals = results.map(r => r.yearlyData[y]?.value ?? 0).sort((a, b) => a - b);
        yearlyValueFan.push({
            year:  y + 1,
            ...buildPercentiles(yearVals),
        });
    }

    const yearlyRentFan = [];
    for (let y = 0; y < holdYears; y++) {
        const rentVals = results.map(r => r.yearlyData[y]?.grossRent ?? 0).sort((a, b) => a - b);
        yearlyRentFan.push({ year: y + 1, ...buildPercentiles(rentVals) });
    }

    const yearlyCashflowFan = [];
    for (let y = 0; y < holdYears; y++) {
        const cfVals = results.map(r => r.yearlyData[y]?.netCashflowAfterTax ?? 0).sort((a, b) => a - b);
        yearlyCashflowFan.push({ year: y + 1, ...buildPercentiles(cfVals) });
    }

    const successRate = results.filter(r => r.realAfterTaxProfit > 0).length / numRuns;

    // Median run (by IRR)
    const sortedByIrr = [...results].sort((a, b) => (a.irr ?? 0) - (b.irr ?? 0));
    const medianRun   = sortedByIrr[Math.floor(numRuns / 2)];

    return {
        numRuns,
        successRate,
        probabilityOfRealLoss:       1 - successRate,
        irr:                         buildPercentiles(irrVals),
        realAfterTaxProfit:          buildPercentiles(realProfits),
        finalEquity:                 buildPercentiles(equityVals),
        saleProceeds:                buildPercentiles(saleVals),
        totalCashContributed:        buildPercentiles(cashContrib),
        cgtPayable:                  buildPercentiles(cgtVals),
        yearlyValueFan,
        yearlyRentFan,
        yearlyCashflowFan,
        medianRun,
        allResults: results,
    };
}

/**
 * Run deterministic (single-rate) projection — used for explainability and
 * sensitivity analysis (MC noise would obscure small parameter deltas).
 */
export function runPropertyDeterministic(prop, opts = {}) {
    return runOnePath(prop, { ...opts, stochastic: false }, () => 0.5);
}

/**
 * Compare two policy scenarios (current vs proposed 2027) across MC paths.
 * Uses the same seed so paths differ only in policy treatment.
 */
export function comparePropertyPoliciesMC(prop, opts = {}) {
    const seed = opts.seed ?? 42;
    const currentResult   = runPropertyMonteCarlo(prop, { ...opts, seed, policy: { ...opts.policy, policyMode: PROPERTY_POLICY_MODE.CURRENT } });
    const proposedResult  = runPropertyMonteCarlo(prop, { ...opts, seed, policy: { ...opts.policy, policyMode: PROPERTY_POLICY_MODE.PROPOSED_2027 } });

    return {
        current:  currentResult,
        proposed: proposedResult,
        irrDifference:         proposedResult.irr.p50         - currentResult.irr.p50,
        profitDifference:      proposedResult.realAfterTaxProfit.p50 - currentResult.realAfterTaxProfit.p50,
        cgtDifference:         proposedResult.cgtPayable.p50  - currentResult.cgtPayable.p50,
    };
}

export default {
    runPropertyMonteCarlo,
    runPropertyDeterministic,
    comparePropertyPoliciesMC,
};
