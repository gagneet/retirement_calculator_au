/**
 * monte_carlo_engine.js – Monte Carlo Runner for Life Simulation (Pipeline B)
 *
 * TASK-003 (enhancements.md §Phase 1): Unify Monte Carlo engines.
 *
 * Previous problem: this module called runLifeSimulation() which used a simpler
 * return model than RetirementSimulator.runMonteCarloSimulation() (Pipeline A).
 * A user who clicked "Run Monte Carlo" in the main calculator vs the Life
 * Simulation tab got materially different probability figures for identical inputs.
 *
 * Fix: this module now delegates to RetirementSimulator so both tabs call the
 * same regime-aware, per-year stochastic engine.  The returned object keeps the
 * same field names as before so callers (recommendation_engine, tests, app.js)
 * need no changes.
 *
 * Schema mapping:
 *   Pipeline A successRate (0–1) → probabilityOfSuccess (0–100)
 *   Pipeline A median            → medianFinalNetWorth
 *   Pipeline A outcomes sorted   → percentile p10/p25/p50/p75/p90 NetWorth
 *   Pipeline A shortfallRisk     → lifestyleCutProbability
 */

import { ENHANCED_CONFIG } from '../config.js';
import RetirementSimulator from '../simulator.js';

// ── Default parameters (merged with userInputs before use) ───────────────────

const MC_DEFAULTS = {
    numRuns:          1000,
    returnVolatility: 0.12,
    enableShocks:     true,
    shockProbability: 0.05,
    shockMagnitude:   -0.25,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Interpolated percentile from a sorted numeric array.
 * @param {number[]} sortedArr - ascending sorted array
 * @param {number} p - percentile (0–100)
 */
const percentileFromSorted = (sortedArr, p) => {
    if (!sortedArr.length) return 0;
    const index  = (p / 100) * (sortedArr.length - 1);
    const lower  = Math.floor(index);
    const upper  = Math.ceil(index);
    if (lower === upper) return sortedArr[lower];
    return sortedArr[lower] + (sortedArr[upper] - sortedArr[lower]) * (index - lower);
};

const sortedMedian = (sortedArr) => {
    if (!sortedArr.length) return 0;
    const mid = Math.floor(sortedArr.length / 2);
    return sortedArr.length % 2 === 0
        ? (sortedArr[mid - 1] + sortedArr[mid]) / 2
        : sortedArr[mid];
};

// ── Main Monte Carlo runner ───────────────────────────────────────────────────

/**
 * Run Monte Carlo simulations using the canonical RetirementSimulator engine.
 *
 * Delegates to RetirementSimulator.runMonteCarloSimulation() so both the main
 * calculator and the Life Simulation tab use identical regime-aware stochastic
 * logic, longevity sampling, and aged-care probability modelling.
 *
 * @param {Object}   userInputs        – full user inputs (same as runLifeSimulation)
 * @param {Function} [progressCallback] – optional fn(completed, total)
 * @returns {Promise<{
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
 *   lifestyleCutProbability: number,
 *   runs:                    number,
 *   _engine:                 string,   // 'RetirementSimulator' for diagnostics
 * }>}
 */
export const runMonteCarlo = async (userInputs, progressCallback = null) => {
    const inputs = { ...MC_DEFAULTS, ...userInputs };

    // Normalise numRuns: honour user value, clamp to safe range.
    const numRuns = Math.max(100, Math.min(20000, Math.round(Number(inputs.numRuns) || 1000)));

    // Delegate to the canonical Pipeline A engine.
    const simulator = new RetirementSimulator(ENHANCED_CONFIG);
    const raw = await simulator.runMonteCarloSimulation(inputs, numRuns, progressCallback);

    // ── Map Pipeline A schema → Pipeline B schema (backwards compatible) ─────

    // Pipeline A outcomes is already sorted ascending.
    const sorted = raw.outcomes || [];

    // retirementWealth: use the median outcome (Pipeline A medianOutcome).
    const medianFinalNetWorth = raw.median ?? sortedMedian(sorted);

    // For Pipeline B callers that expect the retirement-phase wealth, approximate
    // from the sorted outcomes' 50th percentile (same value).
    const medianRetirementWealth = medianFinalNetWorth;

    // successRate (0–1) → probabilityOfSuccess (0–100)
    const probabilityOfSuccess = (raw.successRate ?? 0) * 100;

    // Worst-case ruin age: derive from paths if available.
    let worstCaseRuinAge = null;
    if (raw.paths && raw.paths.length > 0) {
        const retirementAge = inputs.retirementAge || 65;
        raw.paths.forEach((path) => {
            const ruinIndex = path.findIndex(balance => balance <= 0);
            if (ruinIndex === -1) return;
            const ruinAge = retirementAge + ruinIndex;
            if (worstCaseRuinAge === null || ruinAge < worstCaseRuinAge) {
                worstCaseRuinAge = ruinAge;
            }
        });
    }

    // shortfallRisk (0–1) → lifestyleCutProbability (0–100)
    const lifestyleCutProbability = (raw.shortfallRisk ?? raw.failureRate ?? 0) * 100;

    // Percentiles
    const p = raw.percentiles || {};
    const percentiles = {
        p10NetWorth: p.p10 ?? percentileFromSorted(sorted, 10),
        p25NetWorth: p.p25 ?? percentileFromSorted(sorted, 25),
        p50NetWorth: p.p50 ?? percentileFromSorted(sorted, 50),
        p75NetWorth: p.p75 ?? percentileFromSorted(sorted, 75),
        p90NetWorth: p.p90 ?? percentileFromSorted(sorted, 90),
    };

    return {
        probabilityOfSuccess,
        medianRetirementWealth,
        medianFinalNetWorth,
        worstCaseRuinAge,
        percentiles,
        lifestyleCutProbability,
        runs: numRuns,
        // Pass through additional Pipeline A fields so callers can use richer data.
        outcomes: sorted,
        paths:    raw.paths,
        longevityStats: raw.longevityStats,
        careStats: raw.careStats,
        _engine: 'RetirementSimulator',
    };
};

export default { runMonteCarlo };
