/**
 * reverse-solver.js - Goal-seeking bisection solver for the Reverse Retirement Planner
 *
 * Wraps RetirementSimulator to answer: "Given the retirement outcome I want,
 * what needs to change today?"
 *
 * Design rules:
 *  - No duplicated projection/tax/pension/deeming math — calls existing engines
 *  - No hardcoded policy values — reads from ENHANCED_CONFIG
 *  - Uses fast deterministic simulateRetirement() for bisection inner loops
 *  - MC validation only on solved results (not every bisection step)
 */

import { ENHANCED_CONFIG } from './config.js';
import { RetirementSimulator } from './simulator.js';

// ---------------------------------------------------------------------------
// Constants (sourced from ENHANCED_CONFIG or sensible defaults)
// ---------------------------------------------------------------------------
const DEFAULT_SWR = 0.04;        // Safe withdrawal rate
const DEFAULT_INFLATION = ENHANCED_CONFIG.INFLATION_RATE || 0.026;
const CONCESSIONAL_CAP = ENHANCED_CONFIG.CONCESSIONAL_CAP || 30000;

// ---------------------------------------------------------------------------
// Capital estimation (analytical seed for bisection brackets)
// ---------------------------------------------------------------------------

/**
 * Estimate capital needed at retirement (nominal dollars) to sustain a
 * given real income in today's dollars.
 *
 * @param {number} targetIncomeToday    Target annual income in today's dollars
 * @param {number} yearsToRetirement    Years from now until retirement
 * @param {number} inflationRate        Annual inflation rate (decimal)
 * @param {number} agePensionNominal    Expected age pension at retirement (nominal $)
 * @param {number} swr                  Safe withdrawal rate (default 0.04)
 * @returns {number} Estimated capital required (nominal $) at retirement date
 */
export function estimateRequiredCapital(
    targetIncomeToday,
    yearsToRetirement,
    inflationRate = DEFAULT_INFLATION,
    agePensionNominal = 0,
    swr = DEFAULT_SWR
) {
    if (yearsToRetirement <= 0) {
        const privateNeeded = Math.max(0, targetIncomeToday - agePensionNominal);
        return privateNeeded / swr;
    }
    const nominalTarget = targetIncomeToday * Math.pow(1 + inflationRate, yearsToRetirement);
    const privateIncomeNeeded = Math.max(0, nominalTarget - agePensionNominal);
    if (swr <= 0) return 0;
    return privateIncomeNeeded / swr;
}

// ---------------------------------------------------------------------------
// Bisection solver
// ---------------------------------------------------------------------------

/**
 * Bisection solver: finds the minimum value in [lo, hi] for which passes(x) === true.
 * Assumes passes(hi) is true and passes(lo) is false.
 *
 * @param {object} opts
 * @param {number}   opts.lo       Lower bound (passes returns false here)
 * @param {number}   opts.hi       Upper bound (passes returns true here)
 * @param {number}   opts.tol      Convergence tolerance (stop when hi-lo <= tol)
 * @param {number}   [opts.maxIter=60]   Maximum iterations
 * @param {Function} opts.passes   async/sync function (x) => boolean
 * @returns {Promise<number|null>} Solved value, or null if infeasible
 */
export async function bisectionSolve({ lo, hi, tol, maxIter = 60, passes }) {
    // Verify feasibility at hi
    const hiPasses = await passes(hi);
    if (!hiPasses) return null; // infeasible even at maximum

    // If already feasible at lo, return lo (no change needed)
    const loPasses = await passes(lo);
    if (loPasses) return lo;

    let best = hi;
    for (let i = 0; i < maxIter && (hi - lo) > tol; i++) {
        const mid = (lo + hi) / 2;
        if (await passes(mid)) {
            best = mid;
            hi = mid;
        } else {
            lo = mid;
        }
    }
    return best;
}

// ---------------------------------------------------------------------------
// Outcome scoring
// ---------------------------------------------------------------------------

/**
 * Score a deterministic simulation result against a retirement target.
 *
 * @param {object} simResult          Return value of simulateRetirement(inputs, false)
 * @param {object} target             Target object (see ReversePlanner target schema)
 * @param {number} inflationRate      Annual inflation (decimal)
 * @param {number} yearsToRetirement  Years until retirement age
 * @param {number} swr                Safe withdrawal rate
 * @returns {object} { passesGoal, passesIncome, sustainableIncomeToday, totalAssetsNominal, incomeGap, capitalGap }
 */
export function scoreScenario(
    simResult,
    target,
    inflationRate = DEFAULT_INFLATION,
    yearsToRetirement = 0,
    swr = DEFAULT_SWR
) {
    const finalBalance = simResult.finalBalance || 0;
    const totalAssetsNominal = simResult.totalFinancialAssets || 0;

    // Deflate nominal retirement assets back to today's dollars
    const deflator = yearsToRetirement > 0
        ? Math.pow(1 + inflationRate, yearsToRetirement)
        : 1;

    // Age pension (nominal at retirement) if opted-in
    const agePensionNominal = target.includeAgePension
        ? (simResult.yearlyData?.[0]?.pensionIncome || 0)
        : 0;

    const sustainableIncomeNominal = totalAssetsNominal * swr + agePensionNominal;
    const sustainableIncomeToday = sustainableIncomeNominal / deflator;

    const targetIncomeToday = target.targetAnnualIncomeToday || 0;
    const passesIncome = sustainableIncomeToday >= targetIncomeToday;

    const incomeGap = Math.max(0, targetIncomeToday - sustainableIncomeToday);
    const capitalGap = Math.max(0, estimateRequiredCapital(
        targetIncomeToday, yearsToRetirement, inflationRate, agePensionNominal, swr
    ) - totalAssetsNominal);

    return {
        passesGoal: passesIncome,
        passesIncome,
        sustainableIncomeToday,
        totalAssetsNominal,
        finalBalance,
        incomeGap,
        capitalGap,
        deflator
    };
}

// ---------------------------------------------------------------------------
// Shared simulator factory
// ---------------------------------------------------------------------------

function getSimulator() {
    return new RetirementSimulator(ENHANCED_CONFIG);
}

function yearsToRetirement(baseInputs) {
    const currentAge = baseInputs.yourCurrentAge || 0;
    const retAge = baseInputs.retirementAge || 65;
    return Math.max(1, retAge - currentAge);
}

function makePasses(simulator, baseInputs, target, overrideKey, inflationRate, swr) {
    const ytr = yearsToRetirement(baseInputs);
    return async (value) => {
        const inputs = { ...baseInputs, [overrideKey]: value };
        let result;
        try {
            result = simulator.simulateRetirement(inputs, false);
        } catch {
            return false;
        }
        const score = scoreScenario(result, target, inflationRate, ytr, swr);
        return score.passesGoal;
    };
}

// ---------------------------------------------------------------------------
// Single-lever solvers (each returns { solved, feasible, label, value, unit })
// ---------------------------------------------------------------------------

/**
 * Solve for extra annual concessional (salary sacrifice) super contribution.
 * Key varied: yourAdditionalSuperContribution (annual $)
 */
export async function solveForExtraAnnualSuper(simulator, baseInputs, target, options = {}) {
    const inflationRate = baseInputs.inflation ?? DEFAULT_INFLATION;
    const swr = options.swr ?? DEFAULT_SWR;
    const currentSG = (baseInputs.yourSalary || 0) * (baseInputs.employerSuperContributionRate ?? ENHANCED_CONFIG.SUPER_GUARANTEE_RATE);
    const currentVoluntary = baseInputs.yourAdditionalSuperContribution || 0;
    const maxExtra = Math.max(0, CONCESSIONAL_CAP - currentSG - currentVoluntary);

    const passes = makePasses(simulator, baseInputs, target, 'yourAdditionalSuperContribution', inflationRate, swr);

    const solved = await bisectionSolve({
        lo: currentVoluntary,
        hi: currentVoluntary + maxExtra,
        tol: 100,
        passes: (v) => passes(v)
    });

    const feasible = solved !== null;
    const extraNeeded = feasible ? Math.max(0, solved - currentVoluntary) : null;

    return {
        lever: 'extraAnnualSuper',
        label: 'Extra concessional super (salary sacrifice)',
        feasible,
        solved,
        extraNeeded,
        unit: 'AUD/year',
        value: extraNeeded,
        description: feasible
            ? `Add $${Math.round(extraNeeded).toLocaleString()}/year in salary sacrifice contributions`
            : `Maxing concessional cap ($${Math.round(maxExtra).toLocaleString()}/year extra) is insufficient`,
        regulatoryNote: `Concessional cap is $${CONCESSIONAL_CAP.toLocaleString()}/year (2024-25)`
    };
}

/**
 * Solve for required annual salary.
 * Key varied: yourSalary
 */
export async function solveForSalary(simulator, baseInputs, target, options = {}) {
    const inflationRate = baseInputs.inflation ?? DEFAULT_INFLATION;
    const swr = options.swr ?? DEFAULT_SWR;
    const currentSalary = baseInputs.yourSalary || 0;

    const passes = makePasses(simulator, baseInputs, target, 'yourSalary', inflationRate, swr);

    const solved = await bisectionSolve({
        lo: currentSalary,
        hi: 500000,
        tol: 1000,
        passes
    });

    const feasible = solved !== null;
    const increase = feasible ? Math.max(0, solved - currentSalary) : null;

    return {
        lever: 'salary',
        label: 'Increase annual salary',
        feasible,
        solved,
        extraNeeded: increase,
        unit: 'AUD/year',
        value: increase,
        description: feasible
            ? `Salary needs to be $${Math.round(solved).toLocaleString()}/year (increase of $${Math.round(increase).toLocaleString()}/year)`
            : 'Goal cannot be achieved by salary increase alone within modelled range ($500k cap)',
    };
}

/**
 * Solve for required retirement age.
 * Key varied: retirementAge
 */
export async function solveForRetirementAge(simulator, baseInputs, target, options = {}) {
    const inflationRate = baseInputs.inflation ?? DEFAULT_INFLATION;
    const swr = options.swr ?? DEFAULT_SWR;
    const currentAge = baseInputs.yourCurrentAge || 50;
    const currentRetireAge = baseInputs.retirementAge || 65;
    const minRetireAge = Math.max(currentAge + 1, 55);

    // For retirement age: higher age is more conservative → passes at higher ages
    // We want MINIMUM age at which goal is met
    // passes(x) = true means retiring at age x achieves goal
    const passes = async (retAge) => {
        const inputs = {
            ...baseInputs,
            retirementAge: Math.round(retAge),
            // Recalculate years to retirement for scoring
        };
        let result;
        try {
            result = simulator.simulateRetirement(inputs, false);
        } catch {
            return false;
        }
        const ytr = Math.max(1, Math.round(retAge) - currentAge);
        const score = scoreScenario(result, target, inflationRate, ytr, swr);
        return score.passesGoal;
    };

    const solved = await bisectionSolve({
        lo: minRetireAge,
        hi: 75,
        tol: 0.5,
        passes
    });

    const feasible = solved !== null;
    const solvedAge = feasible ? Math.round(solved) : null;
    const extraYears = feasible ? Math.max(0, solvedAge - currentRetireAge) : null;

    return {
        lever: 'retirementAge',
        label: 'Retire slightly later',
        feasible,
        solved: solvedAge,
        extraNeeded: extraYears,
        unit: 'years',
        value: extraYears,
        description: feasible
            ? `Retire at age ${solvedAge} (${extraYears > 0 ? `${extraYears} year${extraYears !== 1 ? 's' : ''} later` : 'no change needed'})`
            : 'Goal cannot be achieved by delaying retirement to age 75',
    };
}

/**
 * Solve for required current super balance (one-time lump sum top-up needed).
 * Key varied: yourCurrentSuper
 */
export async function solveForCurrentSuperBalance(simulator, baseInputs, target, options = {}) {
    const inflationRate = baseInputs.inflation ?? DEFAULT_INFLATION;
    const swr = options.swr ?? DEFAULT_SWR;
    const currentBalance = baseInputs.yourCurrentSuper || 0;

    const passes = makePasses(simulator, baseInputs, target, 'yourCurrentSuper', inflationRate, swr);

    const solved = await bisectionSolve({
        lo: currentBalance,
        hi: 3000000,
        tol: 1000,
        passes
    });

    const feasible = solved !== null;
    const topUpNeeded = feasible ? Math.max(0, solved - currentBalance) : null;

    return {
        lever: 'superBalance',
        label: 'Super balance top-up (lump sum)',
        feasible,
        solved,
        extraNeeded: topUpNeeded,
        unit: 'AUD lump sum',
        value: topUpNeeded,
        description: feasible
            ? `Super needs to be $${Math.round(solved).toLocaleString()} today (top-up of $${Math.round(topUpNeeded).toLocaleString()})`
            : 'Goal cannot be achieved by super top-up within modelled range ($3M cap)',
    };
}

/**
 * Solve for extra annual savings (invested outside super).
 * Key varied: monthlyStockContribution (converted from annual savings)
 */
export async function solveForExtraSavings(simulator, baseInputs, target, options = {}) {
    const inflationRate = baseInputs.inflation ?? DEFAULT_INFLATION;
    const swr = options.swr ?? DEFAULT_SWR;
    const currentMonthly = baseInputs.monthlyStockContribution || 0;

    // Work in monthly amounts internally
    const passes = makePasses(simulator, baseInputs, target, 'monthlyStockContribution', inflationRate, swr);

    const solved = await bisectionSolve({
        lo: currentMonthly,
        hi: 10000, // $10k/month max = $120k/year
        tol: 10,
        passes
    });

    const feasible = solved !== null;
    const extraMonthly = feasible ? Math.max(0, solved - currentMonthly) : null;
    const extraAnnual = feasible ? extraMonthly * 12 : null;

    return {
        lever: 'extraSavings',
        label: 'Extra savings / redirect savings to investments',
        feasible,
        solved,
        extraNeeded: extraAnnual,
        unit: 'AUD/month',
        value: extraMonthly,
        description: feasible
            ? `Invest an extra $${Math.round(extraMonthly).toLocaleString()}/month ($${Math.round(extraAnnual).toLocaleString()}/year) outside super`
            : 'Goal cannot be achieved by additional savings alone within modelled range ($120k/year)',
    };
}

/**
 * Solve for extra monthly mortgage repayment (analytical — frees up cashflow at payoff).
 * This uses an analytical approach rather than bisection because the simulator
 * doesn't directly expose mortgage payoff year. We estimate the cashflow freed
 * by clearing the mortgage earlier.
 *
 * @returns {object} Lever result with estimated extra monthly payment
 */
export function solveForMortgageRepayment(baseInputs, target) {
    const mortgageBalance = baseInputs.mortgageBalance || 0;
    const monthlyPayment = baseInputs.monthlyMortgagePayment || 0;
    const mortgageRate = baseInputs.mortgageRate || 0.06;

    if (mortgageBalance <= 0) {
        return {
            lever: 'mortgageRepayment',
            label: 'Clear mortgage earlier',
            feasible: false,
            solved: null,
            extraNeeded: null,
            unit: 'AUD/month',
            value: null,
            description: 'No mortgage balance to optimise',
        };
    }

    // Analytical: how much extra monthly payment to pay off 5 years early?
    const currentAge = baseInputs.yourCurrentAge || 50;
    const retirementAge = baseInputs.retirementAge || 65;
    const yearsToRetire = Math.max(1, retirementAge - currentAge);
    const targetPayoffYears = Math.max(1, yearsToRetire - 5);

    // PMT formula: extra repayment to retire loan in targetPayoffYears
    const r = mortgageRate / 12;
    const n = targetPayoffYears * 12;
    let requiredPayment = 0;
    if (r > 0) {
        requiredPayment = mortgageBalance * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
    } else {
        requiredPayment = mortgageBalance / n;
    }

    const extraMonthly = Math.max(0, requiredPayment - monthlyPayment);

    return {
        lever: 'mortgageRepayment',
        label: 'Clear mortgage earlier',
        feasible: extraMonthly < 5000, // rough affordability check
        solved: requiredPayment,
        extraNeeded: extraMonthly,
        unit: 'AUD/month',
        value: extraMonthly,
        description: extraMonthly > 0
            ? `Pay an extra $${Math.round(extraMonthly).toLocaleString()}/month to clear mortgage ${5} years early`
            : 'Mortgage already on track to clear before retirement',
        note: 'Analytical estimate — run full simulation to confirm cashflow impact'
    };
}

/**
 * Solve for investment property net weekly rent.
 * Key varied: weeklyRentalIncome
 */
export async function solveForNetRent(simulator, baseInputs, target, options = {}) {
    if (!baseInputs.hasInvestmentProperty) {
        return {
            lever: 'netRent',
            label: 'Net rent optimisation',
            feasible: false,
            solved: null,
            extraNeeded: null,
            unit: 'AUD/week',
            value: null,
            description: 'No investment property in current scenario',
        };
    }

    const inflationRate = baseInputs.inflation ?? DEFAULT_INFLATION;
    const swr = options.swr ?? DEFAULT_SWR;
    const currentRent = baseInputs.weeklyRentalIncome || 0;

    const passes = makePasses(simulator, baseInputs, target, 'weeklyRentalIncome', inflationRate, swr);

    const solved = await bisectionSolve({
        lo: currentRent,
        hi: 2000, // $2,000/week = $104k/year
        tol: 5,
        passes
    });

    const feasible = solved !== null;
    const extraRent = feasible ? Math.max(0, solved - currentRent) : null;

    return {
        lever: 'netRent',
        label: 'Net rent optimisation',
        feasible,
        solved,
        extraNeeded: extraRent,
        unit: 'AUD/week',
        value: extraRent,
        description: feasible
            ? `Increase net weekly rent to $${Math.round(solved).toLocaleString()}/week (extra $${Math.round(extraRent).toLocaleString()}/week)`
            : 'Goal cannot be achieved by rent optimisation alone within modelled range',
    };
}

/**
 * Solve for target spending reduction — arithmetic, not bisection.
 * How much would the target income need to drop for the current plan to work?
 */
export function solveForTargetSpendingReduction(baseInputs, currentPathScore, target) {
    const sustainableToday = currentPathScore.sustainableIncomeToday || 0;
    const targetToday = target.targetAnnualIncomeToday || 0;

    if (sustainableToday >= targetToday) {
        return {
            lever: 'spendingReduction',
            label: 'Reduce target spending',
            feasible: true,
            solved: targetToday,
            extraNeeded: 0,
            reductionNeeded: 0,
            unit: 'AUD/year',
            value: 0,
            description: 'No spending reduction needed — current plan meets target',
        };
    }

    const reductionNeeded = Math.max(0, targetToday - sustainableToday);
    const reducedTarget = targetToday - reductionNeeded;

    return {
        lever: 'spendingReduction',
        label: 'Reduce target spending',
        feasible: reductionNeeded < targetToday * 0.5, // feasible if reduction < 50%
        solved: reducedTarget,
        extraNeeded: reductionNeeded,
        reductionNeeded,
        unit: 'AUD/year',
        value: reductionNeeded,
        description: `Reduce target income by $${Math.round(reductionNeeded).toLocaleString()}/year to $${Math.round(reducedTarget).toLocaleString()}/year`,
    };
}

/**
 * Solve for minimum estate goal — arithmetic.
 * How much can the estate target be reduced and still meet income goals?
 */
export function solveForEstateAdjustment(baseInputs, currentPathScore, target) {
    const minEstate = target.minimumEstateToday || 0;
    const sustainableToday = currentPathScore.sustainableIncomeToday || 0;
    const targetToday = target.targetAnnualIncomeToday || 0;

    if (sustainableToday >= targetToday) {
        return {
            lever: 'estateAdjustment',
            label: 'Reduce inheritance target',
            feasible: true,
            solved: minEstate,
            extraNeeded: 0,
            unit: 'AUD',
            value: 0,
            description: 'No estate reduction needed — current plan meets income target',
        };
    }

    // Reducing estate target effectively frees up capital for drawdown
    // If estate target is already 0, this lever is exhausted
    if (minEstate <= 0) {
        return {
            lever: 'estateAdjustment',
            label: 'Reduce inheritance target',
            feasible: false,
            solved: 0,
            extraNeeded: null,
            unit: 'AUD',
            value: null,
            description: 'No inheritance target to reduce — lever exhausted',
        };
    }

    const reductionNeeded = Math.min(minEstate, currentPathScore.capitalGap || 0);

    return {
        lever: 'estateAdjustment',
        label: 'Reduce inheritance target',
        feasible: true,
        solved: Math.max(0, minEstate - reductionNeeded),
        extraNeeded: reductionNeeded,
        unit: 'AUD',
        value: reductionNeeded,
        description: `Reduce inheritance target by $${Math.round(reductionNeeded).toLocaleString()} to free up retirement capital`,
    };
}

// ---------------------------------------------------------------------------
// Feasibility ranking
// ---------------------------------------------------------------------------

/**
 * Score a lever for feasibility/attractiveness ranking.
 * Higher is better. Returns a numeric score.
 */
export function scoreLeverFeasibility(lever) {
    if (!lever.feasible) return -1000;

    let score = 0;

    // Base rank by lever type (from spec rank order)
    const rankMap = {
        extraAnnualSuper: 100,    // 1. Extra concessional super
        extraSavings: 90,         // 2. Extra savings
        mortgageRepayment: 80,    // 3. Clear mortgage earlier
        retirementAge: 70,        // 4. Retire slightly later
        spendingReduction: 60,    // 5. Reduce target spending
        netRent: 50,              // 7. Net rent optimisation
        estateAdjustment: 30,     // 10. Reduce inheritance target
        superBalance: 40,         // Lump sum super top-up
        salary: 45,               // Salary increase
    };
    score += rankMap[lever.lever] || 0;

    // Tax efficiency bonus for super lever
    if (lever.lever === 'extraAnnualSuper') score += 20;

    // Penalty if required value is large relative to typical thresholds
    const value = lever.value || 0;
    if (lever.lever === 'extraAnnualSuper' && value > 20000) score -= 10;
    if (lever.lever === 'salary' && value > 50000) score -= 15;
    if (lever.lever === 'superBalance' && value > 100000) score -= 20;
    if (lever.lever === 'spendingReduction' && (lever.reductionNeeded || 0) > 20000) score -= 25;

    // Reversibility bonus (some levers are more reversible than others)
    const reversible = ['extraAnnualSuper', 'extraSavings', 'mortgageRepayment', 'spendingReduction'];
    if (reversible.includes(lever.lever)) score += 5;

    return score;
}

/**
 * Rank an array of lever results by feasibility score (highest first).
 *
 * @param {Array} leverResults  Array of solver result objects
 * @returns {Array} Sorted array with feasibilityScore added
 */
export function rankLevers(leverResults) {
    return leverResults
        .map(lever => ({ ...lever, feasibilityScore: scoreLeverFeasibility(lever) }))
        .sort((a, b) => b.feasibilityScore - a.feasibilityScore);
}

// ---------------------------------------------------------------------------
// Main solver class
// ---------------------------------------------------------------------------

/**
 * ReverseRetirementSolver — orchestrates all single-lever solvers.
 */
export class ReverseRetirementSolver {
    constructor(config = ENHANCED_CONFIG) {
        this.config = config;
        this.simulator = new RetirementSimulator(config);
    }

    /**
     * Run all levers and return ranked results.
     *
     * @param {object} baseInputs   Normalized simulator inputs (direct field names)
     * @param {object} target       Target object with targetAnnualIncomeToday, etc.
     * @param {object} options      { swr, inflationRate }
     * @returns {Promise<Array>}    Ranked array of lever results
     */
    async solveAllLevers(baseInputs, target, options = {}) {
        const opts = { swr: DEFAULT_SWR, ...options };
        const ytr = yearsToRetirement(baseInputs);
        const inflationRate = baseInputs.inflation ?? DEFAULT_INFLATION;

        // Build current path score first (needed for arithmetic levers)
        let currentResult;
        try {
            currentResult = this.simulator.simulateRetirement(baseInputs, false);
        } catch (err) {
            throw new Error(`Could not run base simulation: ${err.message}`);
        }

        const currentScore = scoreScenario(currentResult, target, inflationRate, ytr, opts.swr);

        // Run all solvers in parallel for speed
        const [
            extraSuperResult,
            salaryResult,
            retireAgeResult,
            superBalResult,
            extraSavingsResult,
            netRentResult,
        ] = await Promise.all([
            solveForExtraAnnualSuper(this.simulator, baseInputs, target, opts),
            solveForSalary(this.simulator, baseInputs, target, opts),
            solveForRetirementAge(this.simulator, baseInputs, target, opts),
            solveForCurrentSuperBalance(this.simulator, baseInputs, target, opts),
            solveForExtraSavings(this.simulator, baseInputs, target, opts),
            solveForNetRent(this.simulator, baseInputs, target, opts),
        ]);

        // Analytical levers (synchronous)
        const mortgageResult = solveForMortgageRepayment(baseInputs, target);
        const spendingResult = solveForTargetSpendingReduction(baseInputs, currentScore, target);
        const estateResult = solveForEstateAdjustment(baseInputs, currentScore, target);

        const allLevers = [
            extraSuperResult,
            extraSavingsResult,
            mortgageResult,
            retireAgeResult,
            spendingResult,
            salaryResult,
            netRentResult,
            superBalResult,
            estateResult,
        ];

        return {
            currentScore,
            currentResult,
            rankedLevers: rankLevers(allLevers)
        };
    }
}
