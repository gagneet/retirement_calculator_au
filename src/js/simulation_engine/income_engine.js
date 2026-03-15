/**
 * income_engine.js – Year-by-Year Income Modelling
 *
 * Handles salary growth, semi-retirement income reduction, and post-retirement
 * investment income.  All monetary amounts are in today's nominal dollars
 * (inflation is applied by the caller when projecting).
 */

/**
 * Apply annual salary growth including partial retirement transitions.
 *
 * @param {number} currentSalary      – current gross salary
 * @param {number} age                – current age
 * @param {Object} inputs             – user inputs (decimal rates)
 * @returns {number} updated gross salary
 */
export const projectSalary = (currentSalary, age, inputs) => {
    const {
        retirementAge = 65,
        salaryGrowthRate = 0.015,
        semiRetirementAge = null,
        semiRetirementIncomeFraction = 0.5,
        incomeDropAge = null,
        incomeDropFraction = 0.7,
    } = inputs;

    // Fully retired
    if (age >= retirementAge) return 0;

    let salary = currentSalary * (1 + salaryGrowthRate);

    // Optional income-drop event (e.g. reduced hours, career change)
    if (incomeDropAge !== null && age >= incomeDropAge && age < retirementAge) {
        // Apply only on the transition year
        if (age === incomeDropAge) {
            salary = salary * incomeDropFraction;
        }
    }

    // Semi-retirement phase
    if (semiRetirementAge !== null && age >= semiRetirementAge && age < retirementAge) {
        if (age === semiRetirementAge) {
            salary = salary * semiRetirementIncomeFraction;
        }
    }

    return Math.max(0, salary);
};

/**
 * Apply annual salary growth for a partner.
 *
 * @param {number} currentSalary
 * @param {number} age
 * @param {Object} inputs  – uses partnerRetirementAge, salaryGrowthRate
 * @returns {number}
 */
export const projectPartnerSalary = (currentSalary, age, inputs) => {
    const {
        partnerRetirementAge = 65,
        salaryGrowthRate = 0.015,
    } = inputs;

    if (age >= partnerRetirementAge) return 0;
    return currentSalary * (1 + salaryGrowthRate);
};

/**
 * Calculate annual investment/dividend income from non-super assets.
 *
 * @param {number} investmentAssets   – current stock + savings balance
 * @param {Object} inputs             – uses investmentReturn, dividendYield, allocEquities
 * @returns {number} annual income (dividends/distributions only, not capital gains)
 */
export const calcInvestmentIncome = (investmentAssets, inputs) => {
    const {
        dividendYield = 0.045,
        allocEquities = 0.6,
    } = inputs;
    return investmentAssets * allocEquities * dividendYield;
};

export default { projectSalary, projectPartnerSalary, calcInvestmentIncome };
