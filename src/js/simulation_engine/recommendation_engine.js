/**
 * recommendation_engine.js – Retirement Recommendation Generator
 *
 * Analyses Monte Carlo and strategy results to produce prioritised,
 * plain-English recommendations for improving retirement outcomes.
 *
 * Disclaimer: Provides general financial projections only. Not financial advice.
 */

/**
 * Generate ranked recommendations from simulation results.
 *
 * @param {Object} mcResults        – result from runMonteCarlo
 * @param {Array}  strategyResults  – result from runStrategyOptimiser (sorted)
 * @param {Object} userInputs       – full user inputs
 * @returns {{
 *   successProbability: number,
 *   outcome: 'excellent'|'good'|'fair'|'poor',
 *   recommendations: Array<{ priority: number, title: string, detail: string, impactAud: number|null }>,
 *   disclaimer: string,
 * }}
 */
export const generateRecommendations = (mcResults, strategyResults = [], userInputs = {}) => {
    const successProbability = mcResults.probabilityOfSuccess || 0;

    // Classify outcome
    let outcome;
    if (successProbability >= 85) outcome = 'excellent';
    else if (successProbability >= 70) outcome = 'good';
    else if (successProbability >= 50) outcome = 'fair';
    else outcome = 'poor';

    const recommendations = [];

    // ── Recommendation 1: Super contributions ────────────────────────────────
    const currentSuperRate = userInputs.superContributionRate || 0.115;
    if (currentSuperRate < 0.15 && successProbability < 85) {
        const superStrat = strategyResults.find(s => s.strategy.includes('+5%'));
        recommendations.push({
            priority:  1,
            title:     'Increase voluntary super contributions',
            detail:    `Increasing your super contributions to ${Math.round((currentSuperRate + 0.05) * 100)}% `
                     + `could significantly boost your retirement balance. Consider salary sacrificing `
                     + `up to the concessional cap ($30,000 p.a.).`,
            impactAud: superStrat ? Math.round(superStrat.netWorthDelta) : null,
        });
    }

    // ── Recommendation 2: Delay retirement ───────────────────────────────────
    if (successProbability < 75) {
        const delay2 = strategyResults.find(s => s.strategy.includes('2 years'));
        recommendations.push({
            priority:  2,
            title:     'Consider delaying retirement by 2–3 years',
            detail:    `Working 2–3 additional years gives your super more time to grow, reduces `
                     + `the length of your retirement, and may increase Age Pension entitlements.`,
            impactAud: delay2 ? Math.round(delay2.netWorthDelta) : null,
        });
    }

    // ── Recommendation 3: Dynamic spending strategy ───────────────────────────
    if (successProbability < 80 && mcResults.lifestyleCutProbability > 20) {
        const guardrailStrat = strategyResults.find(s => s.strategy.includes('guardrail'));
        recommendations.push({
            priority:  3,
            title:     'Adopt a flexible (guardrail) spending strategy',
            detail:    `A guardrail spending strategy adjusts withdrawals based on portfolio `
                     + `performance — spending more in good years and less in bad years. `
                     + `This can improve success probability by 10–15% compared to fixed spending.`,
            impactAud: guardrailStrat ? Math.round(guardrailStrat.netWorthDelta) : null,
        });
    }

    // ── Recommendation 4: Reduce spending ────────────────────────────────────
    if (successProbability < 65) {
        const reduce8 = strategyResults.find(s => s.strategy.includes('8%'));
        recommendations.push({
            priority:  4,
            title:     'Review retirement spending target',
            detail:    `Reducing your planned retirement spending by 8% ($${Math.round((userInputs.asfaComfortable || 73031) * 0.08).toLocaleString()} p.a.) `
                     + `materially extends portfolio longevity. Consider which lifestyle costs are discretionary.`,
            impactAud: reduce8 ? Math.round(reduce8.netWorthDelta) : null,
        });
    }

    // ── Recommendation 5: Downsize property ──────────────────────────────────
    if (userInputs.hasInvestmentProperty && successProbability < 70) {
        recommendations.push({
            priority:  5,
            title:     'Consider selling investment property to fund retirement',
            detail:    `Selling your investment property at or before retirement can free up `
                     + `significant capital for a super contribution (downsizer contributions `
                     + `up to $300,000 per person) and reduce debt obligations.`,
            impactAud: null,
        });
    }

    // ── Recommendation 6: Age Pension optimisation ───────────────────────────
    if (mcResults.medianRetirementWealth < 1500000) {
        recommendations.push({
            priority:  6,
            title:     'Optimise Age Pension entitlements',
            detail:    `At your projected retirement wealth level, Age Pension may provide `
                     + `meaningful supplementary income. Ensure assets are structured to maximise `
                     + `entitlements (e.g. home equity excluded from assets test).`,
            impactAud: null,
        });
    }

    // Sort by priority
    recommendations.sort((a, b) => a.priority - b.priority);

    return {
        successProbability: Math.round(successProbability),
        outcome,
        recommendations,
        disclaimer: 'This simulator provides general financial projections only. '
                  + 'It does not constitute financial advice. '
                  + 'Users should consult a licensed financial adviser before making financial decisions.',
    };
};

export default { generateRecommendations };
