/**
 * expense_engine.js – Annual Expense Modelling
 *
 * Models living expenses throughout the life timeline including:
 *  - Pre-retirement (income-based or ASFA standard)
 *  - Retirement spending phases (active / stable / slowdown / healthcare)
 *  - Healthcare cost escalation
 *  - Aged-care cost event
 *  - Dynamic spending phase multipliers
 */

// Retirement spending phase multipliers (fraction of initial retirement spending)
const SPENDING_PHASES = [
    { fromAge: 0,  toAge: 70, multiplier: 1.00 },   // Active phase
    { fromAge: 70, toAge: 80, multiplier: 0.85 },   // Stable phase
    { fromAge: 80, toAge: 90, multiplier: 0.75 },   // Slowdown phase
    { fromAge: 90, toAge: 999, multiplier: 0.65 },  // Healthcare-heavy phase
];

/**
 * Return the spending phase multiplier for a given retirement age.
 *
 * @param {number} age                 – current age
 * @param {number} retirementAge       – age at retirement
 * @returns {number} spending multiplier (1.0 = no change)
 */
export const getSpendingPhaseMultiplier = (age, retirementAge) => {
    if (age < retirementAge) return 1.0; // No phase adjustment before retirement
    const yearsRetired = age - retirementAge;
    const absoluteAge = age;
    const phase = SPENDING_PHASES.find(p => absoluteAge >= p.fromAge && absoluteAge < p.toAge);
    return phase ? phase.multiplier : 0.65;
};

/**
 * Project annual living expenses for a given year.
 *
 * Pre-retirement: fraction of gross income (simple proxy) or ASFA estimate.
 * Retirement: starts at asfaComfortable, then phases down with age.
 *
 * @param {number} currentExpenses     – previous year's expenses
 * @param {number} age                 – current age
 * @param {Object} inputs              – user inputs
 * @returns {number} projected annual living expenses
 */
export const projectLivingExpenses = (currentExpenses, age, inputs) => {
    const {
        retirementAge = 65,
        inflation = 0.026,
        asfaComfortable = 73031,
        leanYearsStart = 5,
        leanYearsReduction = 0.38,
    } = inputs;

    // Inflate expenses each year
    let expenses = currentExpenses * (1 + inflation);

    if (age >= retirementAge) {
        // Apply spending phase multiplier (U-shaped retirement spending curve)
        const phaseMultiplier = getSpendingPhaseMultiplier(age, retirementAge);

        // Lean-years reduction in early retirement (if enabled)
        const yearsRetired = age - retirementAge;
        const isLeanPeriod = yearsRetired >= leanYearsStart;
        const leanMultiplier = isLeanPeriod ? (1 - leanYearsReduction) : 1.0;

        expenses = expenses * phaseMultiplier * leanMultiplier;
    }

    return Math.max(0, expenses);
};

/**
 * Project annual healthcare costs with age-specific escalation.
 *
 * @param {number} currentHealthcareCosts  – base annual healthcare cost
 * @param {number} age                     – current age
 * @param {Object} inputs                  – user inputs
 * @returns {number} projected annual healthcare costs
 */
export const projectHealthcareCosts = (currentHealthcareCosts, age, inputs) => {
    const { healthcareInflation = 0.0382 } = inputs;

    let costs = currentHealthcareCosts * (1 + healthcareInflation);

    // Additional loading for older ages
    if (age >= 75 && age < 85) {
        costs *= 1.03;
    } else if (age >= 85) {
        costs *= 1.06;
    }

    return Math.max(0, costs);
};

/**
 * Return aged-care costs for the current year (if in aged-care phase).
 *
 * BUG FIX 1G: The user-supplied agedCareProbability is honoured as the primary
 * probability weight.  Previously the engine used a hard-coded model-derived
 * probability (65%), overriding the user's explicit input.
 *
 * Deterministic mode (default, used for single projection):
 *   Cost × probability — weighted expected cost for the projection year.
 *
 * Stochastic mode (useStochasticReturns=true, used in Monte Carlo):
 *   A Bernoulli draw at the start of aged-care age determines if care occurs;
 *   inside the care window the full cost applies.
 *
 * @param {number} age       – current age
 * @param {Object} inputs    – agedCareStartAge, agedCareDuration, agedCareAnnualCost,
 *                             agedCareProbability, inflation, retirementAge,
 *                             useStochasticReturns
 * @returns {number} annual aged-care cost (0 if not applicable)
 */
export const getAgedCareCost = (age, inputs) => {
    const {
        agedCareStartAge = 85,
        agedCareDuration = 3,
        agedCareAnnualCost = 75000,
        inflation = 0.026,
        retirementAge = 65,
        useStochasticReturns = false,
    } = inputs;

    if (age < agedCareStartAge || age >= agedCareStartAge + agedCareDuration) return 0;

    // BUG FIX 1G: Resolve aged-care probability from user input.
    // agedCareProbability may be supplied as a decimal (0.22) or percentage (22).
    // Honour the user value; fall back to AIHW population average of 65% only when absent.
    let probability = 0.65; // AIHW default — used only when not supplied by user
    if (inputs.agedCareProbability != null) {
        const raw = Number(inputs.agedCareProbability);
        // Normalise: values > 1 are treated as percentage (e.g. 22 → 0.22)
        probability = (raw > 1 && raw <= 100) ? raw / 100 : raw;
        probability = Math.max(0, Math.min(1, probability));
    }

    // Inflate cost from retirement onwards
    const yearsFromRetirement = Math.max(0, agedCareStartAge - retirementAge);
    const inflatedCost = agedCareAnnualCost * Math.pow(1 + inflation, yearsFromRetirement);

    if (useStochasticReturns) {
        // Stochastic: sample once per simulation run whether aged care occurs.
        // Store the result on the inputs object (passed by reference) so subsequent
        // years in the same run reuse the same outcome.
        //
        // PR review fix #3247147516: the original code only sampled when
        // age === agedCareStartAge. If a simulation starts after that age (e.g.
        // yourCurrentAge = 86 with agedCareStartAge = 83) the flag is never set,
        // returning 0 for every remaining care year.  Sample whenever the flag
        // is absent and the current age is anywhere inside the care window.
        if (inputs._agedCareOccurs === undefined) {
            inputs._agedCareOccurs = Math.random() < probability;
        }
        return (inputs._agedCareOccurs === true) ? inflatedCost : 0;
    }

    // Deterministic: weight by probability (expected value approach)
    return inflatedCost * probability;
};

export default { getSpendingPhaseMultiplier, projectLivingExpenses, projectHealthcareCosts, getAgedCareCost };
