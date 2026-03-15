/**
 * spending_engine.js – Dynamic Retirement Spending Strategies
 *
 * Implements five retirement spending strategies that determine annual
 * spending based on portfolio performance:
 *
 *  1. fixed          – constant spending adjusted for inflation only
 *  2. guardrails     – Kitces/Guyton guardrail system
 *  3. percentage     – fixed withdrawal rate of current portfolio
 *  4. floor_upside   – essential floor + variable lifestyle component
 *  5. guyton_klinger – full Guyton-Klinger rule set
 */

export const SPENDING_STRATEGIES = {
    FIXED:          'fixed',
    GUARDRAILS:     'guardrails',
    PERCENTAGE:     'percentage',
    FLOOR_UPSIDE:   'floor_upside',
    GUYTON_KLINGER: 'guyton_klinger',
};

// ── Strategy 1: Fixed ─────────────────────────────────────────────────────────

/**
 * Inflation-adjusted fixed spending.
 *
 * @param {number} baseSpending  – initial retirement spending
 * @param {number} inflation     – annual inflation rate
 * @param {number} yearsRetired  – years since retirement
 * @returns {number}
 */
export const fixedSpending = (baseSpending, inflation, yearsRetired) => {
    return baseSpending * Math.pow(1 + inflation, yearsRetired);
};

// ── Strategy 2: Guardrails ────────────────────────────────────────────────────

/**
 * Guardrail spending rule.
 *
 * Increases spending by 10% when portfolio exceeds upper guardrail;
 * decreases by 10% when portfolio falls below lower guardrail.
 *
 * @param {number} currentSpending    – last year's spending
 * @param {number} portfolioValue     – current total investable assets
 * @param {number} initialPortfolio   – portfolio value at retirement start
 * @param {Object} params             – upperGuardrail, lowerGuardrail (multipliers, default 1.2 / 0.8)
 * @returns {number} adjusted spending
 */
export const guardrailSpending = (currentSpending, portfolioValue, initialPortfolio, params = {}) => {
    const {
        upperGuardrail = 1.2,
        lowerGuardrail = 0.8,
    } = params;

    const upperThreshold = initialPortfolio * upperGuardrail;
    const lowerThreshold = initialPortfolio * lowerGuardrail;

    if (portfolioValue > upperThreshold) {
        return currentSpending * 1.10;
    }
    if (portfolioValue < lowerThreshold) {
        return currentSpending * 0.90;
    }
    return currentSpending;
};

// ── Strategy 3: Percentage withdrawal ────────────────────────────────────────

/**
 * Percentage-of-portfolio spending.
 *
 * @param {number} portfolioValue    – current portfolio
 * @param {number} withdrawalRate    – e.g. 0.04 for 4%
 * @returns {number}
 */
export const percentageSpending = (portfolioValue, withdrawalRate = 0.045) => {
    return portfolioValue * withdrawalRate;
};

// ── Strategy 4: Floor and Upside ─────────────────────────────────────────────

/**
 * Floor-and-upside spending.
 *
 * Essential spending is never reduced; lifestyle component is scaled by
 * portfolio performance relative to initial portfolio.
 *
 * @param {number} essentialSpending  – minimum non-negotiable spending
 * @param {number} lifestyleSpending  – discretionary lifestyle amount
 * @param {number} portfolioValue
 * @param {number} initialPortfolio
 * @returns {number}
 */
export const floorUpsideSpending = (essentialSpending, lifestyleSpending, portfolioValue, initialPortfolio) => {
    const ratio = initialPortfolio > 0 ? portfolioValue / initialPortfolio : 1;
    const lifestyleAdjusted = lifestyleSpending * Math.min(1.2, Math.max(0, ratio));
    return essentialSpending + lifestyleAdjusted;
};

// ── Strategy 5: Guyton-Klinger ────────────────────────────────────────────────

/**
 * Guyton-Klinger rule set.
 *
 * Rules applied in order:
 *  1. Inflation adjustment rule – skip CPI increase if portfolio declined
 *  2. Capital preservation rule – cut 10% if withdrawal rate > 1.25× initial
 *  3. Prosperity rule           – increase 10% if withdrawal rate < 0.80× initial
 *
 * @param {number} currentSpending    – last year's spending
 * @param {number} portfolioValue     – current portfolio
 * @param {number} initialPortfolio   – portfolio at retirement
 * @param {number} initialSpending    – spending at retirement
 * @param {number} inflation          – CPI rate
 * @param {boolean} portfolioDeclined – whether portfolio fell this year
 * @returns {number} adjusted spending
 */
export const guytonKlingerSpending = (
    currentSpending,
    portfolioValue,
    initialPortfolio,
    initialSpending,
    inflation,
    portfolioDeclined,
) => {
    let spending = currentSpending;

    // Rule 1: Inflation adjustment – only apply if portfolio not declining
    if (!portfolioDeclined) {
        spending *= (1 + inflation);
    }

    // Current withdrawal rate
    const currentRate = portfolioValue > 0 ? spending / portfolioValue : 0;
    const initialRate = initialPortfolio > 0 ? initialSpending / initialPortfolio : 0.04;

    // Rule 2: Capital preservation – reduce if withdrawal rate too high
    if (currentRate > initialRate * 1.25) {
        spending *= 0.90;
    }

    // Rule 3: Prosperity – increase if withdrawal rate very low
    if (currentRate < initialRate * 0.80) {
        spending *= 1.10;
    }

    return Math.max(0, spending);
};

// ── Unified dispatcher ────────────────────────────────────────────────────────

/**
 * Calculate annual spending for a given strategy and simulation state.
 *
 * @param {Object} params
 * @param {string}  params.strategy            – one of SPENDING_STRATEGIES values
 * @param {number}  params.currentSpending      – previous year's spending
 * @param {number}  params.portfolioValue       – total investable assets this year
 * @param {number}  params.initialPortfolio     – portfolio at retirement
 * @param {number}  params.initialSpending      – spending at retirement
 * @param {number}  params.yearsRetired         – years since retirement
 * @param {number}  params.inflation            – current inflation rate
 * @param {boolean} params.portfolioDeclined    – true if portfolio fell this year
 * @param {Object}  params.inputs               – full user inputs
 * @returns {number} spending for this year
 */
export const calculateSpending = ({
    strategy           = SPENDING_STRATEGIES.FIXED,
    currentSpending,
    portfolioValue,
    initialPortfolio,
    initialSpending,
    yearsRetired       = 0,
    inflation          = 0.026,
    portfolioDeclined  = false,
    inputs             = {},
}) => {
    switch (strategy) {
        case SPENDING_STRATEGIES.FIXED:
            return fixedSpending(initialSpending, inflation, yearsRetired);

        case SPENDING_STRATEGIES.GUARDRAILS:
            return guardrailSpending(currentSpending, portfolioValue, initialPortfolio, {
                upperGuardrail: inputs.upperGuardrail || 1.2,
                lowerGuardrail: inputs.lowerGuardrail || 0.8,
            });

        case SPENDING_STRATEGIES.PERCENTAGE:
            return percentageSpending(portfolioValue, inputs.withdrawalRate || 0.045);

        case SPENDING_STRATEGIES.FLOOR_UPSIDE: {
            const essential  = inputs.essentialSpending  || initialSpending * 0.60;
            const lifestyle  = inputs.lifestyleSpending  || initialSpending * 0.40;
            return floorUpsideSpending(essential, lifestyle, portfolioValue, initialPortfolio);
        }

        case SPENDING_STRATEGIES.GUYTON_KLINGER:
            return guytonKlingerSpending(
                currentSpending,
                portfolioValue,
                initialPortfolio,
                initialSpending,
                inflation,
                portfolioDeclined,
            );

        default:
            return currentSpending;
    }
};

export default {
    SPENDING_STRATEGIES,
    fixedSpending,
    guardrailSpending,
    percentageSpending,
    floorUpsideSpending,
    guytonKlingerSpending,
    calculateSpending,
};
