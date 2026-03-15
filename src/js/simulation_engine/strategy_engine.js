/**
 * strategy_engine.js – Retirement Strategy Optimiser
 *
 * Tests a defined set of strategy variants against the user's baseline and
 * returns the improvement each strategy provides to retirement success
 * probability and median final net worth.
 *
 * Strategies tested:
 *  1. Delay retirement by 1, 2, 3 years
 *  2. Increase super contributions (+2%, +5%)
 *  3. Reduce annual spending by 5%, 8%, 10%
 *  4. Switch to dynamic guardrail spending
 *  5. Sell investment property at downsizing age
 */

import { runLifeSimulation }  from './life_simulation_engine.js';
import { SPENDING_STRATEGIES } from './spending_engine.js';

/**
 * Run a single strategy variant and return key metrics.
 *
 * @param {Object} baseInputs   – original user inputs
 * @param {Object} overrides    – fields to override for this strategy
 * @returns {{ retirementWealth: number, finalNetWorth: number, success: boolean, ruinAge: number|null }}
 */
const runVariant = (baseInputs, overrides) => {
    const inputs = { ...baseInputs, ...overrides };
    const { retirementWealth, finalNetWorth, success, ruinAge } = runLifeSimulation(inputs);
    return { retirementWealth, finalNetWorth, success, ruinAge };
};

/**
 * Run all strategy variants and rank them by improvement.
 *
 * @param {Object} userInputs     – full user inputs
 * @param {Object} baselineResult – result from runLifeSimulation with userInputs
 * @returns {Array<{
 *   strategy:          string,
 *   description:       string,
 *   retirementWealth:  number,
 *   finalNetWorth:     number,
 *   netWorthDelta:     number,
 *   success:           boolean,
 * }>} strategies sorted best first
 */
export const runStrategyOptimiser = (userInputs, baselineResult) => {
    const baseline = baselineResult || runLifeSimulation(userInputs);
    const strategies = [];

    const test = (description, overrides) => {
        const result = runVariant(userInputs, overrides);
        strategies.push({
            strategy:         description,
            description,
            retirementWealth: result.retirementWealth,
            finalNetWorth:    result.finalNetWorth,
            netWorthDelta:    result.finalNetWorth - baseline.finalNetWorth,
            success:          result.success,
            ruinAge:          result.ruinAge,
        });
    };

    // ── Delay retirement ──────────────────────────────────────────────────────
    const baseRetirement = userInputs.retirementAge || 65;
    test('Delay retirement by 1 year',  { retirementAge: baseRetirement + 1 });
    test('Delay retirement by 2 years', { retirementAge: baseRetirement + 2 });
    test('Delay retirement by 3 years', { retirementAge: baseRetirement + 3 });

    // ── Increase super contributions ──────────────────────────────────────────
    const baseSuperRate = userInputs.superContributionRate || 0.12;
    test('Increase super contributions to +2%', { superContributionRate: baseSuperRate + 0.02 });
    test('Increase super contributions to +5%', { superContributionRate: baseSuperRate + 0.05 });

    // ── Reduce spending ───────────────────────────────────────────────────────
    const baseAsfa = userInputs.asfaComfortable || 73031;
    test('Reduce retirement spending by 5%',  { asfaComfortable: baseAsfa * 0.95 });
    test('Reduce retirement spending by 8%',  { asfaComfortable: baseAsfa * 0.92 });
    test('Reduce retirement spending by 10%', { asfaComfortable: baseAsfa * 0.90 });

    // ── Switch to guardrail spending ──────────────────────────────────────────
    test('Adopt guardrail dynamic spending strategy', {
        spendingStrategy: SPENDING_STRATEGIES.GUARDRAILS,
    });

    // ── Sell investment property earlier ─────────────────────────────────────
    if (userInputs.hasInvestmentProperty) {
        test('Sell investment property at age 65', {
            downsizingAge: 65,
        });
    }

    // Sort: successful strategies first, then by net worth improvement
    strategies.sort((a, b) => {
        if (a.success !== b.success) return a.success ? -1 : 1;
        return b.netWorthDelta - a.netWorthDelta;
    });

    return strategies;
};

export default { runStrategyOptimiser };
