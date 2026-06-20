/**
 * reverse-deep-analysis.js — "What if?" deep-dive analysis functions
 *
 * Each function uses bisection to answer a forward-looking question:
 *  1. For a given retirement age, what salary is needed?
 *  2. What would my home / savings need to be worth today?
 *  3. How much can I reduce my salary and still meet my goal?
 *  4. What is the earliest age at which I could move overseas?
 *
 * Dependencies: bisectionSolve from reverse-solver.js
 * and evaluateEngineGoal from reverse-success-predicate.js
 */

import {
    bisectionSolve,
    yearsToRetirement,
    solveForCurrentHomeValue,
    solveForCurrentInvestmentBalance,
} from './reverse-solver.js';
import { evaluateEngineGoal, applyTargetToEngineInputs } from './reverse-success-predicate.js';

const DEFAULT_INFLATION = 0.026;
const DEFAULT_SWR = 0.04;

/**
 * Helper: build a passes() function for bisection over a single input key.
 * Uses applyTargetToEngineInputs() and evaluateEngineGoal() instead of SWR.
 */
function _makePasses(simulator, baseInputs, target, overrideKey, inflationRate, swr) {
    const ytr = yearsToRetirement(baseInputs);
    return async (value) => {
        const inputs = applyTargetToEngineInputs(baseInputs, target, {});
        inputs[overrideKey] = value;
        try {
            const result = simulator.simulateRetirement(inputs, false);
            const evalResult = evaluateEngineGoal(result, target, inputs, { yearsToRetirement: ytr, swr });
            return evalResult.passesGoal;
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
    const swr = target.swr ?? DEFAULT_SWR;
    const currentAge = baseInputs.yourCurrentAge || 50;
    const startAge = currentAge + 1;
    const curve = [];

    for (let age = startAge; age <= 75; age += 1) {
        const passes = async (salary) => {
            const inputs = applyTargetToEngineInputs(baseInputs, target, {});
            inputs.retirementAge = Math.round(age);
            inputs.yourSalary = salary;
            try {
                const result = simulator.simulateRetirement(inputs, false);
                const ytr = Math.max(1, Math.round(age) - currentAge);
                const evalResult = evaluateEngineGoal(result, target, inputs, { yearsToRetirement: ytr, swr });
                return evalResult.passesGoal;
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
    const swr = target.swr ?? DEFAULT_SWR;
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

    // Check if already failing at current salary
    const currentPasses = _makePasses(simulator, baseInputs, target, 'yourSalary', inflationRate, swr);
    if (!(await currentPasses(currentSalary))) {
        return {
            currentSalary,
            minRequiredSalary: null,
            feasible: false,
            maxReduction: null,
            reductionPercent: null,
            status: 'not_applicable',
            explanation: 'Salary reduction tolerance cannot be calculated because the current salary does not meet the target.',
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
 * living) makes the retirement goal achievable at the current salary,
 * WITHOUT changing the retirement age (they remain separate).
 *
 * Uses country profiles from country-profiles.js for cost-of-living data.
 * Falls back to a simplified cost factor when no profile is available.
 *
 * IMPORTANT: retirementAge is fixed at the user's chosen value.
 * Only overseasStartAge varies per iteration.  The two are never conflated.
 *
 * @param {RetirementSimulator} simulator
 * @param {object} baseInputs
 * @param {object} target
 * @param {number} [costFactor=0.70]  Overseas cost multiplier (1 = same as AU)
 * @param {object} [countryProfile=null]  Country profile from country-profiles.js
 * @returns {Promise<{optimalAge: number|null, analysis: Array, feasible: boolean}>}
 */
export async function calculateOptimalOverseasAge(simulator, baseInputs, target, costFactor = 0.70, countryProfile = null) {
    const inflationRate = baseInputs.inflation ?? DEFAULT_INFLATION;
    const swr = target.swr ?? DEFAULT_SWR;
    const currentAge = baseInputs.yourCurrentAge || 50;
    const currentSalary = baseInputs.yourSalary || 0;
    const retirementAge = target.retirementAge || baseInputs.retirementAge || 65;
    const targetIncome = target.targetAnnualIncomeToday || 80000;

    // Use country profile cost factor if available, else the passed factor
    const effectiveCostFactor = countryProfile?.costFactor ?? costFactor;
    const overseasTargetIncome = targetIncome * effectiveCostFactor;

    const overseasTarget = {
        ...target,
        targetAnnualIncomeToday: overseasTargetIncome,
        retirementAge,
    };

    // Iterate over overseas move ages, NOT retirement ages.
    // Start from currentAge + 1, go up to max(lifespan, retirementAge)
    const maxAge = Math.max(target.lifespan || 90, retirementAge + 20);
    const startAge = Math.max(currentAge + 1, retirementAge - 20);
    const results = [];

    for (let age = startAge; age <= maxAge; age += 1) {
        const ytr = Math.max(1, retirementAge - currentAge);

        const passes = async (salary) => {
            const inputs = applyTargetToEngineInputs(baseInputs, { ...overseasTarget, targetAnnualIncomeToday: overseasTargetIncome }, {});
            inputs.yourSalary = salary;
            inputs.goingOverseas = true;
            inputs.overseasStartAge = age;
            inputs.retirementAge = retirementAge;
            try {
                const result = simulator.simulateRetirement(inputs, false);
                const evalResult = evaluateEngineGoal(result, overseasTarget, inputs, { yearsToRetirement: ytr, swr });
                return evalResult.passesGoal;
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
            retirementAge,
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
        optimalRetirementAge: retirementAge,
        feasible: results.some(r => r.feasible),
        worksWithCurrentSalary: results.some(r => r.worksWithCurrentSalary),
        analysis: results,
    };
}
