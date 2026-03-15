/**
 * shock_engine.js – Random Economic Shock Events
 *
 * Generates stochastic economic shocks (market crashes, property downturns,
 * inflation spikes, health events) that are applied during Monte Carlo runs.
 */

/**
 * Simple Box-Muller normal random number generator.
 *
 * @param {number} mean
 * @param {number} stdDev
 * @returns {number}
 */
export const randomNormal = (mean, stdDev) => {
    const u1 = Math.random();
    const u2 = Math.random();
    const z  = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + z * stdDev;
};

/**
 * Generate a stochastic annual investment return using historical volatility.
 *
 * @param {number} expectedReturn   – mean annual return (decimal)
 * @param {number} volatility       – annual standard deviation (decimal)
 * @returns {number} simulated annual return
 */
export const simulateAnnualReturn = (expectedReturn, volatility) => {
    return randomNormal(expectedReturn, volatility);
};

/**
 * Apply a random market shock to the portfolio.
 *
 * @param {number} portfolioValue     – current portfolio value
 * @param {Object} inputs             – enableShocks, shockProbability, shockMagnitude
 * @returns {{ newValue: number, shockOccurred: boolean }}
 */
export const applyMarketShock = (portfolioValue, inputs) => {
    const {
        enableShocks = false,
        shockProbability = 0.05,
        shockMagnitude = -0.25,
    } = inputs;

    if (!enableShocks || Math.random() >= shockProbability) {
        return { newValue: portfolioValue, shockOccurred: false };
    }

    // Shock magnitude is negative (e.g. -0.25 = 25% loss)
    const newValue = Math.max(0, portfolioValue * (1 + shockMagnitude));
    return { newValue, shockOccurred: true };
};

/**
 * Apply a property-specific shock.
 *
 * @param {number} propertyValue
 * @param {Object} inputs              – propertyCrashProbability (decimal), enableShocks
 * @returns {{ newValue: number, shockOccurred: boolean }}
 */
export const applyPropertyShock = (propertyValue, inputs) => {
    const {
        enableShocks = false,
        propertyCrashProbability = 0.03,
    } = inputs;

    if (!enableShocks || Math.random() >= propertyCrashProbability) {
        return { newValue: propertyValue, shockOccurred: false };
    }

    // Property crash: -20% to -40% depending on severity
    const crashMagnitude = -0.20 - Math.random() * 0.20;
    const newValue = Math.max(0, propertyValue * (1 + crashMagnitude));
    return { newValue, shockOccurred: true };
};

/**
 * Apply extreme inflation shock.
 *
 * @param {number} baseInflation         – normal inflation rate
 * @param {Object} inputs                – extremeInflationProbability, enableShocks
 * @returns {number} effective inflation rate for this year
 */
export const applyInflationShock = (baseInflation, inputs) => {
    const {
        enableShocks = false,
        extremeInflationProbability = 0.02,
    } = inputs;

    if (!enableShocks || Math.random() >= extremeInflationProbability) {
        return baseInflation;
    }

    // Inflation spike: 2–3× normal
    return baseInflation * (2 + Math.random());
};

export default { randomNormal, simulateAnnualReturn, applyMarketShock, applyPropertyShock, applyInflationShock };
