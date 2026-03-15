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
 * @param {number} age       – current age
 * @param {Object} inputs    – agedCareStartAge, agedCareDuration, agedCareAnnualCost, inflation
 * @returns {number} annual aged-care cost (0 if not applicable)
 */
export const getAgedCareCost = (age, inputs) => {
    const {
        agedCareStartAge = 85,
        agedCareDuration = 3,
        agedCareAnnualCost = 75000,
        inflation = 0.026,
        retirementAge = 65,
    } = inputs;

    if (age < agedCareStartAge || age >= agedCareStartAge + agedCareDuration) return 0;

    // Inflate cost from retirement onwards
    const yearsFromRetirement = Math.max(0, agedCareStartAge - retirementAge);
    return agedCareAnnualCost * Math.pow(1 + inflation, yearsFromRetirement);
};

export default { getSpendingPhaseMultiplier, projectLivingExpenses, projectHealthcareCosts, getAgedCareCost };
