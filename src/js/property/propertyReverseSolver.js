/**
 * propertyReverseSolver.js - Bisection solvers for property reverse planning.
 *
 * Answers questions like:
 *   - What rent makes a property viable?
 *   - What purchase price maximises affordability given cashflow constraints?
 *   - What current equity is needed to reach target retirement income?
 *   - Does buying/keeping/selling a property improve retirement success?
 *
 * All solvers use bisection (no analytical shortcuts that might diverge).
 * No UI, no DOM. Pure functions.
 */

import { CITY_GROWTH_RATES, CITY_RENTAL_YIELDS, RETIREMENT_STRATEGY } from './propertyTypes.js';
import { runPropertyDeterministic } from './propertyMonteCarlo.js';
import { calcCGT, buildEffectivePolicy } from './propertyTax.js';
import { calcSaleProceeds, calcPandIRepayment } from './propertyCashflow.js';

const fin = (v, def = 0) => { const n = Number(v); return Number.isFinite(n) ? n : def; };

// ---------------------------------------------------------------------------
// Bisection engine
// ---------------------------------------------------------------------------

/**
 * General bisection solver.
 *
 * @param {Function} fn     - f(x) → signed error (positive = too high, negative = too low)
 * @param {number}   lo     - Lower bound
 * @param {number}   hi     - Upper bound
 * @param {number}   [tol]  - Convergence tolerance
 * @param {number}   [maxIter]
 * @returns {{ solved: boolean, value: number, iterations: number }}
 */
function bisect(fn, lo, hi, tol = 0.01, maxIter = 120) {
    let low = lo, high = hi;
    const fLo = fn(lo);
    const fHi = fn(hi);

    if (fLo * fHi > 0) {
        return { solved: false, value: (lo + hi) / 2, iterations: 0 };
    }

    let iter = 0;
    while (high - low > tol && iter < maxIter) {
        const mid  = (low + high) / 2;
        const fMid = fn(mid);
        if (Math.abs(fMid) < tol) return { solved: true, value: mid, iterations: iter };
        if (fLo * fMid < 0) high = mid;
        else                  low  = mid;
        iter++;
    }
    return { solved: true, value: (low + high) / 2, iterations: iter };
}

// ---------------------------------------------------------------------------
// Required weekly rent to break even (net cashflow >= threshold)
// ---------------------------------------------------------------------------

/**
 * Solve for the weekly rent that makes the property's annual net cashflow
 * equal to a target (default 0 = cash-flow neutral before tax).
 *
 * @param {Object} prop           - PropertyInput
 * @param {Object} yearContext    - { year, loanBalance, propertyValue, interestRate, cpiGrowth, rentGrowth }
 * @param {number} [targetCashflow] - Annual cashflow target (default 0)
 * @returns {{ solved, weeklyRent }}
 */
export function solveRequiredRent(prop, yearContext, targetCashflow = 0) {
    const { calcAnnualPropertyCashflow } = require('./propertyCashflow.js');

    function error(weeklyRent) {
        const cf = calcAnnualPropertyCashflow({ ...prop, weeklyRent }, yearContext);
        return cf.netCashflowBeforeTax - targetCashflow;
    }

    const result = bisect(error, 0, 5000, 0.50, 80);
    return { solved: result.solved, weeklyRent: Math.round(result.value * 2) / 2 };  // round to 50c
}

// ---------------------------------------------------------------------------
// Maximum purchase price given annual cashflow loss limit
// ---------------------------------------------------------------------------

/**
 * Solve for the maximum property purchase price where annual cashflow loss
 * does not exceed a constraint (e.g., $15,000/year negative cashflow maximum).
 *
 * @param {Object} prop              - PropertyInput template (interestRate, expenses, loanType, etc.)
 * @param {number} maxAnnualLoss     - Maximum acceptable negative cashflow (positive number)
 * @param {number} depositPct        - Deposit as fraction of price (e.g. 0.20)
 * @param {Object} opts              - { propertyGrowthRate, inflationRate, interestRate, holdYears }
 * @returns {{ solved, maxPurchasePrice }}
 */
export function solveMaxPurchasePrice(prop, maxAnnualLoss = 20000, depositPct = 0.20, opts = {}) {
    const interestRate = fin(opts.interestRate ?? prop.interestRate, 0.062);
    const loanTermYears = fin(prop.loanTermYears, 30);
    const city = prop.city ?? 'national';
    const rentalYield = CITY_RENTAL_YIELDS[city] ?? CITY_RENTAL_YIELDS.national;

    function error(price) {
        const loan = price * (1 - depositPct);
        const weeklyRent = (price * rentalYield) / 52;
        const yearContext = {
            year:          0,
            propertyValue: price,
            loanBalance:   loan,
            interestRate,
            cpiGrowth:     0.036,
            rentGrowth:    0,
        };
        const { calcAnnualPropertyCashflow } = require('./propertyCashflow.js');
        const cf = calcAnnualPropertyCashflow({ ...prop, weeklyRent, interestRate, loanTermYears }, yearContext);
        // error > 0 means loss too large (price too high)
        return -(cf.netCashflowBeforeTax) - maxAnnualLoss;
    }

    const result = bisect(error, 100000, 5000000, 500, 100);
    return { solved: result.solved, maxPurchasePrice: Math.round(result.value / 1000) * 1000 };
}

// ---------------------------------------------------------------------------
// Required deposit for a target LVR
// ---------------------------------------------------------------------------

/**
 * Calculate required deposit and stamp duty for a target purchase.
 */
export function calcRequiredDeposit(purchasePrice, targetLvr = 0.80, state = 'nsw') {
    const price     = fin(purchasePrice);
    const deposit   = price * (1 - fin(targetLvr, 0.80));
    const stampDuty = estimateStampDuty(price, state);
    const legalFees = 1500;
    const other     = 1500;
    const totalUpfront = deposit + stampDuty + legalFees + other;
    return { deposit, stampDuty, legalFees, other, totalUpfront, lvr: targetLvr };
}

function estimateStampDuty(price, state = 'nsw') {
    // Simplified average; state-specific rates not modelled in detail
    const p = fin(price);
    if (p <= 0) return 0;
    // NSW rough calculation as representative
    if (p <= 14000)   return p * 0.0125;
    if (p <= 30000)   return 175   + (p - 14000)  * 0.015;
    if (p <= 80000)   return 415   + (p - 30000)  * 0.0175;
    if (p <= 300000)  return 1290  + (p - 80000)  * 0.035;
    if (p <= 1000000) return 8990  + (p - 300000) * 0.045;
    return 40490 + (p - 1000000) * 0.055;
}

// ---------------------------------------------------------------------------
// Required current equity for target retirement income
// ---------------------------------------------------------------------------

/**
 * Solve for the minimum current property equity that — when combined with
 * the sale proceeds at retirement — contributes enough to reach a target
 * retirement income (naive capital-needs estimate; integrate with reverse-solver
 * for full simulation).
 *
 * @param {number} targetRetirementIncomeToday - Real annual income target
 * @param {number} yearsToRetirement
 * @param {number} propertyGrowthRate          - Expected nominal growth rate
 * @param {number} inflationRate               - CPI rate
 * @param {number} safeWithdrawalRate          - Assumed SWR (default 4%)
 * @returns {{ requiredCurrentEquity, projectedEquityAtRetirement }}
 */
export function solveRequiredEquity(targetRetirementIncomeToday, yearsToRetirement, propertyGrowthRate = 0.065, inflationRate = 0.036, safeWithdrawalRate = 0.04) {
    const target   = fin(targetRetirementIncomeToday);
    const ytr      = Math.max(1, fin(yearsToRetirement));
    const growth   = fin(propertyGrowthRate, 0.065);
    const inf      = fin(inflationRate, 0.036);
    const swr      = fin(safeWithdrawalRate, 0.04);

    // Nominal capital needed at retirement
    const nominalIncomeAtRetirement = target * Math.pow(1 + inf, ytr);
    const capitalNeeded = nominalIncomeAtRetirement / swr;

    // What equity today grows to that capital via property appreciation
    const growthMultiplier = Math.pow(1 + growth, ytr);
    const requiredCurrentEquity = capitalNeeded / growthMultiplier;

    return {
        requiredCurrentEquity:       Math.round(requiredCurrentEquity),
        projectedEquityAtRetirement: Math.round(capitalNeeded),
        capitalNeeded:               Math.round(capitalNeeded),
        growthMultiplier,
        nominalIncomeAtRetirement:   Math.round(nominalIncomeAtRetirement),
    };
}

// ---------------------------------------------------------------------------
// Optimal sale timing
// ---------------------------------------------------------------------------

/**
 * Find the year at which selling the property maximises real after-tax
 * net proceeds (deterministic).
 *
 * @param {Object} prop     - PropertyInput
 * @param {Object} opts     - { maxHoldYears, startPropertyValue, startLoanBalance, propertyGrowthRate, inflationRate, policy }
 * @returns {{ optimalYear, maxNetProceeds, byYear }}
 */
export function solveOptimalSaleTiming(prop, opts = {}) {
    const maxHold = Math.min(40, fin(opts.maxHoldYears, 30));
    const byYear  = [];

    for (let y = 1; y <= maxHold; y++) {
        const result = runPropertyDeterministic(prop, { ...opts, holdYears: y });
        byYear.push({ year: y, realAfterTaxProfit: result.realAfterTaxProfit, irr: result.irr });
    }

    const best = byYear.reduce((a, b) => (b.realAfterTaxProfit > a.realAfterTaxProfit ? b : a), byYear[0]);

    return {
        optimalYear:     best?.year ?? maxHold,
        maxRealProfit:   best?.realAfterTaxProfit ?? 0,
        maxIrr:          best?.irr ?? null,
        byYear,
    };
}

// ---------------------------------------------------------------------------
// Keep vs sell vs downsize comparison
// ---------------------------------------------------------------------------

/**
 * Compare three retirement property strategies:
 *   1. Sell at retirement → reinvest in diversified portfolio
 *   2. Keep into retirement → draw rent + capital eventually
 *   3. Downsize → buy smaller home, put remaining equity into portfolio
 *
 * Returns projected real retirement income for each strategy.
 *
 * @param {Object} prop             - PropertyInput
 * @param {Object} retirementOpts   - { yearsToRetirement, targetIncomeToday, currentSuperBalance, safeWithdrawalRate, inflationRate, etfReturnRate }
 * @returns {{ sell, keep, downsize }}
 */
export function compareRetirementStrategies(prop, retirementOpts = {}) {
    const {
        yearsToRetirement  = 20,
        inflationRate      = 0.036,
        etfReturnRate      = 0.07,
        safeWithdrawalRate = 0.04,
        propertyGrowthRate,
        policy,
    } = retirementOpts;

    const holdYears = fin(yearsToRetirement);
    const city      = prop.city ?? 'national';
    const growth    = fin(propertyGrowthRate ?? CITY_GROWTH_RATES[city] ?? CITY_GROWTH_RATES.national);

    const det = runPropertyDeterministic(prop, {
        holdYears,
        startPropertyValue: fin(prop.currentValue),
        startLoanBalance:   fin(prop.currentLoanBalance),
        propertyGrowthRate: growth,
        inflationRate,
        policy,
    });

    const inflation     = fin(inflationRate, 0.036);
    const cpiMultiplier = Math.pow(1 + inflation, holdYears);

    // --- Strategy 1: SELL ---
    const sellNetProceeds = det.saleProceeds;
    const sellEtfIncome   = sellNetProceeds * fin(safeWithdrawalRate, 0.04);
    const sellRealIncome  = sellEtfIncome / cpiMultiplier;

    // --- Strategy 2: KEEP ---
    const keepRentalIncome = (det.yearlyData[holdYears - 1]?.grossRent ?? 0) * 0.85; // after expenses
    const keepRealRentalIncome = keepRentalIncome / cpiMultiplier;

    // --- Strategy 3: DOWNSIZE ---
    const futureValue       = det.finalValue;
    const downsizePct       = fin(prop.downsizePct, 0.60);   // buy a home at 60% of current value
    const sellingCostsPct   = 0.025;
    const smallerHome       = futureValue * downsizePct;
    const freeSaleProceeds  = futureValue * (1 - downsizePct - sellingCostsPct) - det.finalLoanBalance - det.cgtPayable;
    const downsizeEtfIncome = Math.max(0, freeSaleProceeds) * fin(safeWithdrawalRate, 0.04);
    const downsizeRealIncome = downsizeEtfIncome / cpiMultiplier;

    return {
        sell: {
            strategy:       RETIREMENT_STRATEGY.SELL,
            netProceeds:    Math.round(sellNetProceeds),
            annualIncome:   Math.round(sellEtfIncome),
            realAnnualIncome: Math.round(sellRealIncome),
        },
        keep: {
            strategy:       RETIREMENT_STRATEGY.KEEP,
            finalEquity:    Math.round(det.finalEquity),
            annualRent:     Math.round(keepRentalIncome),
            realAnnualRent: Math.round(keepRealRentalIncome),
        },
        downsize: {
            strategy:       RETIREMENT_STRATEGY.DOWNSIZE,
            smallerHome:    Math.round(smallerHome),
            freeSaleProceeds: Math.round(freeSaleProceeds),
            annualIncome:   Math.round(downsizeEtfIncome),
            realAnnualIncome: Math.round(downsizeRealIncome),
        },
        recommendedStrategy: [
            { s: RETIREMENT_STRATEGY.SELL,     v: sellRealIncome },
            { s: RETIREMENT_STRATEGY.KEEP,     v: keepRealRentalIncome },
            { s: RETIREMENT_STRATEGY.DOWNSIZE, v: downsizeRealIncome },
        ].reduce((a, b) => (b.v > a.v ? b : a)).s,
    };
}

export default {
    solveRequiredRent,
    solveMaxPurchasePrice,
    calcRequiredDeposit,
    solveRequiredEquity,
    solveOptimalSaleTiming,
    compareRetirementStrategies,
};
