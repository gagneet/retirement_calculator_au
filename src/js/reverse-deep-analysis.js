/**
 * reverse-deep-analysis.js — "What if?" deep-dive analysis functions
 *
 * Each function uses bisection to answer a forward-looking question:
 *  1. For a given retirement age, what salary is needed?
 *  2. What would my home / savings need to be worth today?
 *  3. How much can I reduce my salary and still meet my goal?
 *  4. What is the earliest age at which I could move overseas?
 *
 * Dependencies: bisectionSolve, scoreScenario, yearsToRetirement
 * from reverse-solver.js
 */

import {
    bisectionSolve,
    scoreScenario,
    yearsToRetirement,
    solveForCurrentHomeValue,
    solveForCurrentInvestmentBalance,
} from './reverse-solver.js';

const DEFAULT_INFLATION = 0.026;
const DEFAULT_SWR = 0.04;

/**
 * Helper: build a passes() function for bisection over a single input key.
 * Replicates the private makePasses() from reverse-solver.js so that
 * callers in THIS module do not need to reach into solver internals.
 *
 * yearsToRetirement is evaluated once at closure-creation time because
 * the override key does not affect retirementAge.  Functions that DO
 * vary retirementAge (age-salary curve, overseas age) define their own
 * passes() with an inline ytr computed per iteration.
 */
function _makePasses(simulator, baseInputs, target, overrideKey, inflationRate, swr) {
    const ytr = yearsToRetirement(baseInputs);
    return async (value) => {
        const inputs = { ...baseInputs, [overrideKey]: value };
        try {
            const result = simulator.simulateRetirement(inputs, false);
            const score = scoreScenario(result, target, inflationRate, ytr, swr);
            return score.passesGoal;
        } catch {
            return false;
        }
    };
}

// ---------------------------------------------------------------------------
// 1. Retirement age → required salary curve
// ---------------------------------------------------------------------------

/**
 * For each retirement age (current → 75), find the minimum annual salary
 * that would make the goal achievable.
 *
 * NOTE: yearsToRetirement cannot be used here because retirementAge
 * changes on every iteration; ytr is calculated inline instead.
 *
 * @param {RetirementSimulator} simulator
 * @param {object} baseInputs     Normalised simulator inputs
 * @param {object} target         Target goal object
 * @returns {Promise<Array<{retirementAge, requiredSalary, feasible}>>}
 */
export async function calculateRetirementAgeSalaryCurve(simulator, baseInputs, target) {
    const inflationRate = baseInputs.inflation ?? DEFAULT_INFLATION;
    const swr = DEFAULT_SWR;
    const currentAge = baseInputs.yourCurrentAge || 50;
    const startAge = Math.max(currentAge + 1, baseInputs.retirementAge || 65);
    const curve = [];

    for (let age = startAge; age <= 75; age += 1) {
        const passes = async (salary) => {
            const inputs = {
                ...baseInputs,
                retirementAge: Math.round(age),
                yourSalary: salary,
            };
            try {
                const result = simulator.simulateRetirement(inputs, false);
                const ytr = Math.max(1, Math.round(age) - currentAge);
                const score = scoreScenario(result, target, inflationRate, ytr, swr);
                return score.passesGoal;
            } catch {
                return false;
            }
        };

        const solved = await bisectionSolve({
            lo: 0,
            hi: 500000,
            tol: 1000,
            passes,
        });

        curve.push({
            retirementAge: age,
            requiredSalary: solved,
            feasible: solved !== null,
        });
    }

    return curve;
}

// ---------------------------------------------------------------------------
// 2. Required current values (home value + investment balance)
// ---------------------------------------------------------------------------

/**
 * Solve for the home value and liquid investment balance needed today.
 *
 * Delegates to solveForCurrentHomeValue and
 * solveForCurrentInvestmentBalance from reverse-solver.js so that the
 * bisection logic lives in a single place.
 *
 * @param {RetirementSimulator} simulator
 * @param {object} baseInputs
 * @param {object} target
 * @returns {Promise<{homeValue: object, investmentBalance: object}>}
 */
export async function calculateRequiredCurrentValues(simulator, baseInputs, target) {
    const [homeResult, savingsResult] = await Promise.all([
        solveForCurrentHomeValue(simulator, baseInputs, target),
        solveForCurrentInvestmentBalance(simulator, baseInputs, target),
    ]);

    return {
        homeValue: {
            current: baseInputs.homeValue || 0,
            required: homeResult.solved,
            feasible: homeResult.feasible,
        },
        investmentBalance: {
            current: baseInputs.currentSavings || 0,
            required: savingsResult.solved,
            feasible: savingsResult.feasible,
        },
    };
}

// ---------------------------------------------------------------------------
// 3. Salary reduction tolerance
// ---------------------------------------------------------------------------

/**
 * How much can annual salary be reduced and still meet the goal?
 *
 * @param {RetirementSimulator} simulator
 * @param {object} baseInputs
 * @param {object} target
 * @returns {Promise<{currentSalary, minRequiredSalary, feasible, maxReduction, reductionPercent}>}
 */
export async function calculateSalaryReductionTolerance(simulator, baseInputs, target) {
    const inflationRate = baseInputs.inflation ?? DEFAULT_INFLATION;
    const swr = DEFAULT_SWR;
    const currentSalary = baseInputs.yourSalary || 0;

    if (currentSalary <= 0) {
        return {
            currentSalary: 0,
            minRequiredSalary: null,
            feasible: false,
            maxReduction: null,
            reductionPercent: null,
        };
    }

    const passes = _makePasses(simulator, baseInputs, target, 'yourSalary', inflationRate, swr);

    const minSalary = await bisectionSolve({
        lo: 0,
        hi: currentSalary,
        tol: 1000,
        passes,
    });

    const feasible = minSalary !== null;
    const reduction = feasible ? currentSalary - minSalary : null;

    return {
        currentSalary,
        minRequiredSalary: minSalary,
        feasible,
        maxReduction: reduction,
        reductionPercent: reduction != null ? (reduction / currentSalary) * 100 : null,
    };
}

// ---------------------------------------------------------------------------
// 4. Optimal overseas move age
// ---------------------------------------------------------------------------

/**
 * Find the earliest age at which moving overseas (with a lower cost of
 * living) makes the retirement goal achievable at the current salary.
 *
 * Uses a cost-of-living factor (default 0.70 = 70 % of Australian costs).
 * This is a simplified model — a production version would read per-country
 * indices from country-profiles.js.
 *
 * NOTE: yearsToRetirement cannot be used here because moveAge (which
 * becomes retirementAge) changes per iteration; ytr is inline.
 *
 * @param {RetirementSimulator} simulator
 * @param {object} baseInputs
 * @param {object} target
 * @param {number} [costFactor=0.70]  Overseas cost multiplier (1 = same as AU)
 * @returns {Promise<{optimalAge: number|null, analysis: Array, feasible: boolean}>}
 */
export async function calculateOptimalOverseasAge(simulator, baseInputs, target, costFactor = 0.70) {
    const inflationRate = baseInputs.inflation ?? DEFAULT_INFLATION;
    const swr = DEFAULT_SWR;
    const currentAge = baseInputs.yourCurrentAge || 50;
    const currentSalary = baseInputs.yourSalary || 0;
    const targetIncome = target.targetAnnualIncomeToday || 80000;
    const overseasTargetIncome = targetIncome * costFactor;

    const overseasTarget = {
        ...target,
        targetAnnualIncomeToday: overseasTargetIncome,
    };

    const results = [];

    for (let age = 55; age <= 75; age += 1) {
        const ytr = Math.max(1, age - currentAge);

        const passes = async (salary) => {
            const inputs = {
                ...baseInputs,
                retirementAge: Math.round(age),
                yourSalary: salary,
            };
            try {
                const result = simulator.simulateRetirement(inputs, false);
                const score = scoreScenario(result, overseasTarget, inflationRate, ytr, swr);
                return score.passesGoal;
            } catch {
                return false;
            }
        };

        const solved = await bisectionSolve({
            lo: 0,
            hi: 500000,
            tol: 1000,
            passes,
        });

        const worksWithCurrentSalary = currentSalary > 0
            ? await passes(currentSalary)
            : false;

        results.push({
            moveAge: age,
            requiredSalary: solved,
            feasible: solved !== null,
            worksWithCurrentSalary,
            annualTargetOverseas: overseasTargetIncome,
        });
    }

    const optimal = results.find(r => r.worksWithCurrentSalary)
        || results.find(r => r.feasible)
        || null;

    return {
        optimalAge: optimal ? optimal.moveAge : null,
        feasible: results.some(r => r.feasible),
        worksWithCurrentSalary: results.some(r => r.worksWithCurrentSalary),
        analysis: results,
    };
}
