/**
 * monte_carlo_engine.js – Monte Carlo Runner for Life Simulation
 *
 * Runs the life simulation many times with random volatility applied each run,
 * then aggregates results into probability-of-success, percentile bands, and
 * worst-case metrics.
 */

import { runLifeSimulation } from './life_simulation_engine.js';
import { simulateAnnualReturn } from './shock_engine.js';

// ── Default Monte Carlo parameters ───────────────────────────────────────────

const MC_DEFAULTS = {
    numRuns:          1000,
    returnVolatility: 0.12,
    enableShocks:     true,
    shockProbability: 0.05,
    shockMagnitude:   -0.25,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const median = (arr) => {
    if (!arr.length) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
};

const percentile = (arr, p) => {
    if (!arr.length) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index  = (p / 100) * (sorted.length - 1);
    const lower  = Math.floor(index);
    const upper  = Math.ceil(index);
    if (lower === upper) return sorted[lower];
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
};

// ── Main Monte Carlo runner ───────────────────────────────────────────────────

/**
 * Run Monte Carlo life simulations.
 *
 * Each run uses a randomly perturbed investmentReturn drawn from a normal
 * distribution with the same mean but with returnVolatility as std-dev.
 *
 * @param {Object} userInputs           – full user inputs (same as runLifeSimulation)
 * @param {Function} [progressCallback] – optional fn(completed, total) for progress reporting
 * @returns {{
 *   probabilityOfSuccess:    number,   // 0–100 %
 *   medianRetirementWealth:  number,
 *   medianFinalNetWorth:     number,
 *   worstCaseRuinAge:        number|null,
 *   percentiles: {
 *     p10NetWorth: number,
 *     p25NetWorth: number,
 *     p50NetWorth: number,
 *     p75NetWorth: number,
 *     p90NetWorth: number,
 *   },
 *   lifestyleCutProbability: number,   // fraction of runs where spending cut ≥ 1 time
 *   runs: number,
 * }}
 */
export const runMonteCarlo = (userInputs, progressCallback = null) => {
    const inputs = { ...MC_DEFAULTS, ...userInputs };
    const { numRuns, returnVolatility, investmentReturn = 0.056 } = inputs;

    const successCount      = { success: 0 };
    const finalNetWorths    = [];
    const retirementWealths = [];
    const ruinAges          = [];
    let lifestyleCuts       = 0;

    for (let run = 0; run < numRuns; run++) {
        // Perturb annual return for this run
        const perturbedReturn = Math.max(-0.5,
            simulateAnnualReturn(investmentReturn, returnVolatility));
        const runInputs = { ...inputs, investmentReturn: perturbedReturn };

        const result = runLifeSimulation(runInputs);

        if (result.success) successCount.success++;
        finalNetWorths.push(result.finalNetWorth);
        retirementWealths.push(result.retirementWealth);
        if (result.ruinAge !== null) ruinAges.push(result.ruinAge);

        // Check if spending was cut (proxy: any year with negative cashflow)
        const hadSpendingCut = result.timeline.some(s => s.annualCashFlow < -5000);
        if (hadSpendingCut) lifestyleCuts++;

        if (progressCallback && run % 100 === 0) {
            progressCallback(run, numRuns);
        }
    }

    return {
        probabilityOfSuccess:   (successCount.success / numRuns) * 100,
        medianRetirementWealth: median(retirementWealths),
        medianFinalNetWorth:    median(finalNetWorths),
        worstCaseRuinAge:       ruinAges.length > 0 ? Math.min(...ruinAges) : null,
        percentiles: {
            p10NetWorth: percentile(finalNetWorths, 10),
            p25NetWorth: percentile(finalNetWorths, 25),
            p50NetWorth: percentile(finalNetWorths, 50),
            p75NetWorth: percentile(finalNetWorths, 75),
            p90NetWorth: percentile(finalNetWorths, 90),
        },
        lifestyleCutProbability: (lifestyleCuts / numRuns) * 100,
        runs: numRuns,
    };
};

export default { runMonteCarlo };
