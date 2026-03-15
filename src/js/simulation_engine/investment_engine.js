/**
 * investment_engine.js – Investment Asset Returns
 *
 * Models the growth (and shocks) of non-super investment assets
 * (stocks, savings) over time.
 */

/**
 * Grow investment assets by one year applying asset allocation blending.
 *
 * @param {number} currentAssets   – start-of-year balance
 * @param {number} netContribution – annual net contribution (positive) or withdrawal (negative)
 * @param {Object} inputs          – investmentReturn, allocEquities, allocBonds, allocCash, returnVolatility
 * @param {number} [shockFactor]   – optional shock multiplier applied to portfolio (default 1.0)
 * @returns {number} end-of-year asset value
 */
export const growInvestmentAssets = (currentAssets, netContribution, inputs, shockFactor = 1.0) => {
    const {
        investmentReturn = 0.056,
        allocEquities = 0.6,
        allocBonds = 0.3,
        allocCash = 0.1,
        returnVolatility = 0.12,
    } = inputs;

    // Blended expected return (allocations are in decimal form, e.g. 0.6 for 60%)
    const equityReturn  = investmentReturn * 1.2;   // Equities above average return
    const bondReturn    = investmentReturn * 0.5;
    const cashReturn    = 0.014;

    const blendedReturn = allocEquities * equityReturn
                        + allocBonds    * bondReturn
                        + allocCash     * cashReturn;

    // Apply deterministic return (Monte Carlo volatility is handled by shock engine)
    const grown = (currentAssets + netContribution) * (1 + blendedReturn) * shockFactor;
    return Math.max(0, grown);
};

/**
 * Grow savings/cash assets separately at the savings return rate.
 *
 * @param {number} currentSavings
 * @param {number} netContribution
 * @param {Object} inputs           – savingsReturn, inflation
 * @returns {number} end-of-year savings
 */
export const growSavings = (currentSavings, netContribution, inputs) => {
    const { savingsReturn = 0.014 } = inputs;
    return Math.max(0, (currentSavings + netContribution) * (1 + savingsReturn));
};

export default { growInvestmentAssets, growSavings };
