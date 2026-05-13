/**
 * index.js – Unified advanced-simulation API
 *
 * The advanced app historically surfaced multiple calculation engines with
 * materially different assumptions. For the in-app "Life Simulation" workflow,
 * route everything through RetirementSimulator so users see a single answer
 * across the advanced experience.
 */

import { ENHANCED_CONFIG } from '../config.js';
import RetirementSimulator from '../simulator.js';
import { generateRecommendations } from './recommendation_engine.js';

export { runLifeSimulation }                        from './life_simulation_engine.js';
export { runMonteCarlo }                            from './monte_carlo_engine.js';
export { runStrategyOptimiser }                     from './strategy_engine.js';
export { generateRecommendations }                  from './recommendation_engine.js';
export { buildLifeEvents, getActiveEvents }         from './life_event_engine.js';
export { SPENDING_STRATEGIES, calculateSpending }   from './spending_engine.js';
export { FinancialState }                           from './financial_state.js';

const estimateFinalNetWorth = (result) => {
    const finalYear = result.yearlyData?.[result.yearlyData.length - 1];
    if (!finalYear) return result.finalBalance || 0;
    return Math.max(0, (finalYear.endBalance || 0) + (finalYear.nonLiquidAssets || 0));
};

const deriveTimeline = (result) => {
    return (result.yearlyData || []).map((year) => ({
        age: year.age,
        netWorth: Math.max(0, (year.endBalance || 0) + (year.nonLiquidAssets || 0)),
        superBalance: Math.max(0, year.endBalance || 0),
        partnerSuperBalance: 0,
        investmentAssets: Math.max(0, year.nonLiquidAssets || 0),
    }));
};

const findRuinAge = (result, inputs) => {
    const ruinIndex = (result.balances || []).findIndex(balance => balance <= 0);
    return ruinIndex === -1 ? null : (inputs.retirementAge + ruinIndex);
};

const findWorstCaseRuinAge = (paths, retirementAge) => {
    let worstCaseRuinAge = null;
    (paths || []).forEach((path) => {
        const ruinIndex = path.findIndex(balance => balance <= 0);
        if (ruinIndex === -1) return;
        const ruinAge = retirementAge + ruinIndex;
        if (worstCaseRuinAge === null || ruinAge < worstCaseRuinAge) {
            worstCaseRuinAge = ruinAge;
        }
    });
    return worstCaseRuinAge;
};

const buildStrategies = (simulator, userInputs, baselineResult) => {
    const baselineNetWorth = estimateFinalNetWorth(baselineResult);
    const baseContributionRate = userInputs.employerSuperContributionRate ??
        userInputs.superContributionRate ??
        ENHANCED_CONFIG.SUPER_GUARANTEE_RATE;

    const tests = [
        ['Delay retirement by 1 year', { retirementAge: (userInputs.retirementAge || 65) + 1 }],
        ['Delay retirement by 2 years', { retirementAge: (userInputs.retirementAge || 65) + 2 }],
        ['Delay retirement by 3 years', { retirementAge: (userInputs.retirementAge || 65) + 3 }],
        ['Increase super contributions to +2%', {
            employerSuperContributionRate: Math.min(1, baseContributionRate + 0.02),
            superContributionRate: Math.min(1, baseContributionRate + 0.02),
        }],
        ['Increase super contributions to +5%', {
            employerSuperContributionRate: Math.min(1, baseContributionRate + 0.05),
            superContributionRate: Math.min(1, baseContributionRate + 0.05),
        }],
        ['Reduce retirement spending by 5%', { asfaComfortable: (userInputs.asfaComfortable || 73031) * 0.95 }],
        ['Reduce retirement spending by 8%', { asfaComfortable: (userInputs.asfaComfortable || 73031) * 0.92 }],
        ['Reduce retirement spending by 10%', { asfaComfortable: (userInputs.asfaComfortable || 73031) * 0.90 }],
    ];

    if (userInputs.hasInvestmentProperty) {
        tests.push([
            'Sell investment property at age 65',
            { sellPropertyYears: Math.max(1, 65 - (userInputs.yourCurrentAge || 45)) }
        ]);
    }

    return tests.map(([description, overrides]) => {
        const scenarioInputs = { ...userInputs, ...overrides };
        const scenarioResult = simulator.simulateRetirement(scenarioInputs, false);
        const finalNetWorth = estimateFinalNetWorth(scenarioResult);

        return {
            strategy: description,
            description,
            retirementWealth: scenarioResult.totalFinancialAssets,
            finalNetWorth,
            netWorthDelta: finalNetWorth - baselineNetWorth,
            success: (scenarioResult.finalBalance || 0) > 0,
            ruinAge: findRuinAge(scenarioResult, scenarioInputs),
        };
    }).sort((a, b) => {
        if (a.success !== b.success) return a.success ? -1 : 1;
        return b.netWorthDelta - a.netWorthDelta;
    });
};

export const runFullSimulation = async (userInputs, options = {}) => {
    const { numRuns = 500, progressCallback = null } = options;
    const simulator = new RetirementSimulator(ENHANCED_CONFIG);

    const baselineProjection = simulator.simulateRetirement(userInputs, false);
    const monteCarloResults = await simulator.runEnhancedMonteCarloSimulation(
        userInputs,
        numRuns,
        progressCallback
    );

    const baseline = {
        timeline: deriveTimeline(baselineProjection),
        retirementWealth: baselineProjection.totalFinancialAssets,
        finalNetWorth: estimateFinalNetWorth(baselineProjection),
        ruinAge: findRuinAge(baselineProjection, userInputs),
        success: (baselineProjection.finalBalance || 0) > 0,
    };

    const monteCarlo = {
        probabilityOfSuccess: (monteCarloResults.successRate || 0) * 100,
        medianRetirementWealth: baselineProjection.totalFinancialAssets,
        medianFinalNetWorth: monteCarloResults.median,
        worstCaseRuinAge: findWorstCaseRuinAge(monteCarloResults.paths, userInputs.retirementAge || 65),
        percentiles: {
            p10NetWorth: monteCarloResults.percentiles?.p10 ?? monteCarloResults.percentile10 ?? 0,
            p25NetWorth: monteCarloResults.percentiles?.p25 ?? 0,
            p50NetWorth: monteCarloResults.percentiles?.p50 ?? monteCarloResults.median ?? 0,
            p75NetWorth: monteCarloResults.percentiles?.p75 ?? 0,
            p90NetWorth: monteCarloResults.percentiles?.p90 ?? monteCarloResults.percentile90 ?? 0,
        },
        lifestyleCutProbability: (monteCarloResults.shortfallRisk || 0) * 100,
        runs: numRuns,
        outcomes: monteCarloResults.outcomes,
        paths: monteCarloResults.paths,
    };

    const strategies = buildStrategies(simulator, userInputs, baselineProjection);
    const recommendations = generateRecommendations(monteCarlo, strategies, userInputs);

    return { baseline, monteCarlo, strategies, recommendations };
};

export default { runFullSimulation };
