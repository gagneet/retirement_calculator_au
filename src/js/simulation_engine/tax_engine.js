/**
 * tax_engine.js – Australian Income Tax Calculations
 *
 * Thin wrapper around the existing calculatePostTaxIncome / calculateAustralianTax
 * utilities, plus super contributions tax.  All rates are FY2025 values.
 */

// FY2025 income tax brackets (Australian resident)
export const TAX_BRACKETS_2025 = [
    { min: 0,       max: 18200,  rate: 0,      base: 0 },
    { min: 18201,   max: 45000,  rate: 0.19,   base: 0 },
    { min: 45001,   max: 120000, rate: 0.325,  base: 5092 },
    { min: 120001,  max: 180000, rate: 0.37,   base: 29467 },
    { min: 180001,  max: Infinity, rate: 0.45, base: 51667 },
];

// Medicare levy rate
export const MEDICARE_LEVY = 0.02;

// Low Income Tax Offset (LITO) – FY2025
export const LITO_MAX = 700;
export const LITO_PHASE_OUT_THRESHOLD = 37500;
export const LITO_PHASE_OUT_RATE = 0.05;   // 5c per $1 above $37,500
export const LITO_SECOND_PHASE_THRESHOLD = 45000;
export const LITO_SECOND_PHASE_RATE = 0.015; // 1.5c per $1 above $45,000

// Super contributions tax rate (concessional contributions)
export const SUPER_TAX_RATE = 0.15;
export const SUPER_HIGH_INCOME_RATE = 0.30; // Division 293

/**
 * Calculate LITO for a given taxable income.
 */
export const calculateLITO = (taxableIncome) => {
    if (taxableIncome <= LITO_PHASE_OUT_THRESHOLD) return LITO_MAX;
    if (taxableIncome <= LITO_SECOND_PHASE_THRESHOLD) {
        return Math.max(0, LITO_MAX - (taxableIncome - LITO_PHASE_OUT_THRESHOLD) * LITO_PHASE_OUT_RATE);
    }
    const firstReduction = (LITO_SECOND_PHASE_THRESHOLD - LITO_PHASE_OUT_THRESHOLD) * LITO_PHASE_OUT_RATE;
    const secondReduction = (taxableIncome - LITO_SECOND_PHASE_THRESHOLD) * LITO_SECOND_PHASE_RATE;
    return Math.max(0, LITO_MAX - firstReduction - secondReduction);
};

/**
 * Calculate Australian income tax (excluding Medicare levy and offsets).
 *
 * @param {number} taxableIncome
 * @returns {number} gross tax before offsets
 */
export const calcGrossTax = (taxableIncome) => {
    if (taxableIncome <= 0) return 0;
    const bracket = TAX_BRACKETS_2025.find(b => taxableIncome <= b.max);
    if (!bracket) return 0;
    return bracket.base + (taxableIncome - bracket.min + 1) * bracket.rate;
};

/**
 * Calculate total income tax + Medicare levy for a given taxable income.
 *
 * @param {number} taxableIncome
 * @returns {number} total annual tax payable
 */
export const calcIncomeTax = (taxableIncome) => {
    if (taxableIncome <= 0) return 0;
    const gross = calcGrossTax(taxableIncome);
    const lito = calculateLITO(taxableIncome);
    const medicare = taxableIncome * MEDICARE_LEVY;
    return Math.max(0, gross - lito + medicare);
};

/**
 * Calculate super contributions tax (concessional).
 *
 * @param {number} salary            – gross salary (pre-tax)
 * @param {number} superContribRate  – employer + voluntary rate (decimal, e.g. 0.115)
 * @param {boolean} highIncome       – true if salary > $250,000 (Division 293)
 * @returns {number} annual super contributions tax
 */
export const calcSuperTax = (salary, superContribRate, highIncome = false) => {
    const contributions = salary * superContribRate;
    const rate = highIncome ? SUPER_HIGH_INCOME_RATE : SUPER_TAX_RATE;
    return contributions * rate;
};

/**
 * Net post-tax salary (take-home pay).
 *
 * @param {number} grossSalary
 * @returns {number} after-tax income
 */
export const calcPostTaxSalary = (grossSalary) => {
    return Math.max(0, grossSalary - calcIncomeTax(grossSalary));
};

export default { TAX_BRACKETS_2025, calcIncomeTax, calcGrossTax, calcLITO: calculateLITO, calcSuperTax, calcPostTaxSalary };
