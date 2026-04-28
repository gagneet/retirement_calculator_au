/**
 * tax_engine.js – Australian Income Tax Calculations
 *
 * Used by the Life Simulator feature. Tax brackets updated to 2025-26 values.
 * The 16% rate drops to 15% from 1 July 2026 (FY 2026-27); calcIncomeTax accepts
 * an optional fyYear argument to select the right bracket set.
 */

// FY2025-26 income tax brackets (Australian resident, effective 1 July 2024)
export const TAX_BRACKETS_2025_26 = [
    { min: 0,       max: 18200,   rate: 0,     base: 0 },
    { min: 18201,   max: 45000,   rate: 0.16,  base: 0 },
    { min: 45001,   max: 135000,  rate: 0.30,  base: 0 },
    { min: 135001,  max: 190000,  rate: 0.37,  base: 0 },
    { min: 190001,  max: Infinity, rate: 0.45, base: 0 },
];

// FY2026-27 onwards: 16% → 15% on $18,201–$45,000
export const TAX_BRACKETS_2026_27 = [
    { min: 0,       max: 18200,   rate: 0,     base: 0 },
    { min: 18201,   max: 45000,   rate: 0.15,  base: 0 },
    { min: 45001,   max: 135000,  rate: 0.30,  base: 0 },
    { min: 135001,  max: 190000,  rate: 0.37,  base: 0 },
    { min: 190001,  max: Infinity, rate: 0.45, base: 0 },
];

// Keep legacy name as alias so any external references don't break
export const TAX_BRACKETS_2025 = TAX_BRACKETS_2025_26;

// Medicare levy rate (standard 2%)
export const MEDICARE_LEVY = 0.02;

// Low Income Tax Offset (LITO) – 2025-26
export const LITO_MAX = 700;
export const LITO_PHASE_OUT_THRESHOLD = 37500;
export const LITO_PHASE_OUT_RATE = 0.05;
export const LITO_SECOND_PHASE_THRESHOLD = 45000;
export const LITO_SECOND_PHASE_RATE = 0.015;

// Super contributions tax
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
 * Select the correct tax brackets for a given financial year.
 * fyYear is the ending year of the FY (e.g. 2026 for FY2025-26, 2027 for FY2026-27).
 */
const getBracketsForFY = (fyYear) =>
    fyYear >= 2027 ? TAX_BRACKETS_2026_27 : TAX_BRACKETS_2025_26;

/**
 * Calculate Australian income tax (excluding Medicare levy and LITO).
 * Uses a simple bracket iteration (no base pre-computation needed).
 */
export const calcGrossTax = (taxableIncome, fyYear) => {
    if (taxableIncome <= 0) return 0;
    const brackets = getBracketsForFY(fyYear);
    let tax = 0;
    let remaining = taxableIncome;
    for (const b of brackets) {
        if (remaining <= 0) break;
        const inBracket = Math.min(remaining, b.max - b.min);
        tax += inBracket * b.rate;
        remaining -= inBracket;
    }
    return tax;
};

/**
 * Total income tax + Medicare levy for a given taxable income.
 * fyYear defaults to current calendar year + 1 to approximate the current financial year.
 */
export const calcIncomeTax = (taxableIncome, fyYear) => {
    if (!fyYear) fyYear = new Date().getFullYear() + 1;
    if (taxableIncome <= 0) return 0;
    const gross = calcGrossTax(taxableIncome, fyYear);
    const lito = calculateLITO(taxableIncome);
    const medicare = taxableIncome * MEDICARE_LEVY;
    return Math.max(0, gross - lito + medicare);
};

/**
 * Super contributions tax on concessional contributions.
 */
export const calcSuperTax = (salary, superContribRate, highIncome = false) => {
    const contributions = salary * superContribRate;
    const rate = highIncome ? SUPER_HIGH_INCOME_RATE : SUPER_TAX_RATE;
    return contributions * rate;
};

/**
 * Net post-tax salary (take-home pay).
 */
export const calcPostTaxSalary = (grossSalary, fyYear) => {
    return Math.max(0, grossSalary - calcIncomeTax(grossSalary, fyYear));
};

export default { TAX_BRACKETS_2025_26, TAX_BRACKETS_2026_27, TAX_BRACKETS_2025, calcIncomeTax, calcGrossTax, calcLITO: calculateLITO, calcSuperTax, calcPostTaxSalary };
