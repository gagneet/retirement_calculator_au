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

// FY2026-27: 16% → 15% on $18,201–$45,000 (Budget 2026-27 cost-of-living measure)
export const TAX_BRACKETS_2026_27 = [
    { min: 0,       max: 18200,   rate: 0,     base: 0 },
    { min: 18201,   max: 45000,   rate: 0.15,  base: 0 },
    { min: 45001,   max: 135000,  rate: 0.30,  base: 0 },
    { min: 135001,  max: 190000,  rate: 0.37,  base: 0 },
    { min: 190001,  max: Infinity, rate: 0.45, base: 0 },
];

// FY2027-28 onwards: 15% → 14% on $18,201–$45,000 (Budget 2026-27 second round)
// Source: budget.gov.au/content/02-cost-of-living.htm
export const TAX_BRACKETS_2027_28 = [
    { min: 0,       max: 18200,   rate: 0,     base: 0 },
    { min: 18201,   max: 45000,   rate: 0.14,  base: 0 },
    { min: 45001,   max: 135000,  rate: 0.30,  base: 0 },
    { min: 135001,  max: 190000,  rate: 0.37,  base: 0 },
    { min: 190001,  max: Infinity, rate: 0.45, base: 0 },
];

// Keep legacy name as alias so any external references don't break
export const TAX_BRACKETS_2025 = TAX_BRACKETS_2025_26;

// Working Australians Tax Offset (WATO) — Budget 2026-27, from FY 2027-28
// Up to $250 for all working Australians.
export const WATO_AMOUNT = 250;
export const WATO_START_FY = 2028;   // FY ending year

// Instant $1,000 work-related expense deduction — Budget 2026-27, from FY 2026-27
export const INSTANT_DEDUCTION_AMOUNT = 1000;
export const INSTANT_DEDUCTION_START_FY = 2027;   // FY ending year

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
 * Budget 2026-27: 14% rate from FY 2027-28 (fyYear >= 2028).
 */
const getBracketsForFY = (fyYear) => {
    if (fyYear >= 2028) return TAX_BRACKETS_2027_28;   // 14% (FY 2027-28 +)
    if (fyYear >= 2027) return TAX_BRACKETS_2026_27;   // 15% (FY 2026-27)
    return TAX_BRACKETS_2025_26;                        // 16% (current)
};

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
        // Use +1 for non-zero-minimum brackets to match ATO boundary widths exactly.
        const bracketWidth = b.min === 0 ? b.max : b.max - b.min + 1;
        const inBracket = Math.min(remaining, bracketWidth);
        tax += inBracket * b.rate;
        remaining -= inBracket;
    }
    return tax;
};

/**
 * Total income tax + Medicare levy for a given taxable income.
 * fyYear defaults to current calendar year + 1 to approximate the current financial year.
 *
 * Budget 2026-27 PROPOSED measures (NOT YET LAW) are only applied when
 * `enableProposedBudget` is true — this mirrors the inputs.enableProposedBudget2026
 * toggle in the main calculator.
 *
 * Legislated measures applied unconditionally:
 *  - 15% rate from FY 2026-27 (via getBracketsForFY)
 *
 * Proposed measures (guarded by enableProposedBudget flag):
 *  - $1,000 instant deduction from FY 2026-27 (fyYear >= 2027)
 *  - WATO $250 offset from FY 2027-28 (fyYear >= 2028)
 *  - 14% rate from FY 2027-28 (via getBracketsForFY)
 *
 * @param {number}  grossIncome
 * @param {number}  [fyYear]             – FY ending calendar year
 * @param {boolean} [enableProposedBudget=false] – set true to include Budget 2026-27 proposals
 */
export const calcIncomeTax = (grossIncome, fyYear, enableProposedBudget = false) => {
    if (!fyYear) fyYear = new Date().getFullYear() + 1;
    if (grossIncome <= 0) return 0;

    // Proposed: $1,000 instant deduction — only when opted in
    const instantDeduction = (enableProposedBudget && fyYear >= INSTANT_DEDUCTION_START_FY)
        ? Math.min(INSTANT_DEDUCTION_AMOUNT, grossIncome) : 0;
    const taxableIncome = Math.max(0, grossIncome - instantDeduction);

    // getBracketsForFY returns 14% brackets only when enableProposedBudget is considered;
    // without the flag, cap bracket selection at the 15% set (FY 2026-27, legislated).
    const effectiveFyYear = enableProposedBudget ? fyYear : Math.min(fyYear, 2027);
    const gross = calcGrossTax(taxableIncome, effectiveFyYear);
    const lito = calculateLITO(taxableIncome);

    // Proposed: WATO $250 offset — only when opted in
    const wato = (enableProposedBudget && fyYear >= WATO_START_FY && taxableIncome > 0 && taxableIncome <= 190000)
        ? WATO_AMOUNT : 0;

    const medicare = taxableIncome * MEDICARE_LEVY;
    return Math.max(0, gross - lito - wato + medicare);
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
 * @param {number}  grossSalary
 * @param {number}  [fyYear]
 * @param {boolean} [enableProposedBudget=false]
 */
export const calcPostTaxSalary = (grossSalary, fyYear, enableProposedBudget = false) => {
    return Math.max(0, grossSalary - calcIncomeTax(grossSalary, fyYear, enableProposedBudget));
};

export default {
    TAX_BRACKETS_2025_26, TAX_BRACKETS_2026_27, TAX_BRACKETS_2027_28, TAX_BRACKETS_2025,
    WATO_AMOUNT, WATO_START_FY, INSTANT_DEDUCTION_AMOUNT, INSTANT_DEDUCTION_START_FY,
    calcIncomeTax, calcGrossTax, calcLITO: calculateLITO, calcSuperTax, calcPostTaxSalary
};
