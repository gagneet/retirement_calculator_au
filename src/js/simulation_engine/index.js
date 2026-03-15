/**
 * index.js – Financial Life Simulation Engine
 *
 * Public API for the Financial Life Simulation Engine.
 * Import this module to access all simulation capabilities.
 *
 * Usage:
 *   import { runLifeSimulation, runMonteCarlo, generateStrategyRecommendations }
 *       from './simulation_engine/index.js';
 */

export { runLifeSimulation }                        from './life_simulation_engine.js';
export { runMonteCarlo }                            from './monte_carlo_engine.js';
export { runStrategyOptimiser }                     from './strategy_engine.js';
export { generateRecommendations }                  from './recommendation_engine.js';
export { buildLifeEvents, getActiveEvents }         from './life_event_engine.js';
export { SPENDING_STRATEGIES, calculateSpending }   from './spending_engine.js';
export { FinancialState }                           from './financial_state.js';

/**
 * Convenience wrapper: run life simulation → Monte Carlo → strategy optimiser → recommendations.
 *
 * @param {Object} userInputs  – full user inputs JSON
 * @param {Object} [options]   – { numRuns, progressCallback }
 * @returns {{
 *   baseline:         Object,   // single deterministic run result
 *   monteCarlo:       Object,   // MC aggregated result
 *   strategies:       Array,    // ranked strategy variants
 *   recommendations:  Object,   // prioritised recommendations
 * }}
 */
export const runFullSimulation = async (userInputs, options = {}) => {
    const { runLifeSimulation: runLife }      = await import('./life_simulation_engine.js');
    const { runMonteCarlo: runMC }            = await import('./monte_carlo_engine.js');
    const { runStrategyOptimiser: runStrat }  = await import('./strategy_engine.js');
    const { generateRecommendations: genRec } = await import('./recommendation_engine.js');

    const { numRuns = 500, progressCallback = null } = options;

    const baseline       = runLife(userInputs);
    const monteCarlo     = runMC({ ...userInputs, numRuns }, progressCallback);
    const strategies     = runStrat(userInputs, baseline);
    const recommendations = genRec(monteCarlo, strategies, userInputs);

    return { baseline, monteCarlo, strategies, recommendations };
};

export default { runFullSimulation };
