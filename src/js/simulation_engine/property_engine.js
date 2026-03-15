/**
 * property_engine.js – Investment Property Growth and Cash Flow
 *
 * Models annual investment property value growth, rental income,
 * loan repayment, and optional sale events.
 */

/**
 * Grow investment property value by one year.
 *
 * @param {number} currentValue        – current market value
 * @param {Object} inputs              – propertyGrowthRate, propertyCrashProbability (optional shock handled externally)
 * @returns {number} new property value
 */
export const growPropertyValue = (currentValue, inputs) => {
    const { propertyGrowthRate = 0.058 } = inputs;
    return currentValue * (1 + propertyGrowthRate);
};

/**
 * Calculate net annual rental cash flow.
 *
 * @param {Object} inputs  – weeklyRentalIncome, annualPropertyExpenses, vacancyRate, maintenanceInflation,
 *                           landTax, inflation, investmentPropertyLoan, investmentPropertyRate
 * @param {number} yearsElapsed  – years since start of simulation (for inflation adjustments)
 * @returns {{ grossRental: number, netCashFlow: number, interestCost: number }}
 */
export const calcPropertyCashFlow = (inputs, yearsElapsed = 0) => {
    const {
        weeklyRentalIncome = 0,
        annualPropertyExpenses = 0,
        vacancyRate = 0,
        maintenanceInflation = 0.04,
        landTax = 0,
        inflation = 0.026,
        investmentPropertyLoan = 0,
        investmentPropertyRate = 0.062,
    } = inputs;

    const grossRental = weeklyRentalIncome * 52 * (1 - vacancyRate);
    const inflatedExpenses = annualPropertyExpenses * Math.pow(1 + maintenanceInflation, yearsElapsed);
    const inflatedLandTax  = landTax * Math.pow(1 + inflation, yearsElapsed);
    const interestCost = investmentPropertyLoan * investmentPropertyRate;

    const netCashFlow = grossRental - inflatedExpenses - inflatedLandTax - interestCost;
    return { grossRental, netCashFlow, interestCost };
};

/**
 * Determine whether property should be sold this year.
 *
 * @param {number} age           – current age
 * @param {Object} inputs        – downsizingAge, sellPropertyYears, yourCurrentAge
 * @param {number} simulationAge – age at start of simulation
 * @returns {boolean}
 */
export const shouldSellProperty = (age, inputs, simulationAge) => {
    const {
        downsizingAge = null,
        sellPropertyYears = null,
        yourCurrentAge = simulationAge,
    } = inputs;

    if (downsizingAge !== null && age === downsizingAge) return true;
    if (sellPropertyYears !== null) {
        const sellAge = yourCurrentAge + sellPropertyYears;
        if (age === sellAge) return true;
    }
    return false;
};

/**
 * Calculate Capital Gains Tax on property sale.
 *
 * Applies 50% CGT discount for assets held > 12 months.
 *
 * @param {number} salePrice         – current market value
 * @param {number} purchasePrice     – original purchase price
 * @param {number} marginalTaxRate   – individual marginal tax rate (decimal)
 * @returns {number} CGT payable
 */
export const calcPropertyCGT = (salePrice, purchasePrice, marginalTaxRate = 0.325) => {
    const gain = salePrice - purchasePrice;
    if (gain <= 0) return 0;
    const taxableGain = gain * 0.5; // 50% discount for 12+ month holding
    return taxableGain * marginalTaxRate;
};

export default { growPropertyValue, calcPropertyCashFlow, shouldSellProperty, calcPropertyCGT };
