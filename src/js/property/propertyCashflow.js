/**
 * propertyCashflow.js - Mortgage amortisation and annual property cashflow engine.
 *
 * Pure functions — no side effects, no DOM, no imports except types.
 * All monetary values are nominal (future) dollars unless labelled 'real'.
 */

import { LOAN_TYPE, REPAYMENT_FREQUENCY, SELLING_COSTS } from './propertyTypes.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fin = (v, def = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : def;
};

/** Convert an annual rate to the equivalent rate per payment period. */
function periodicRate(annualRate, periodsPerYear) {
    return Math.pow(1 + annualRate, 1 / periodsPerYear) - 1;
}

/** Payments per year for a given repayment frequency. */
function paymentsPerYear(frequency) {
    const map = {
        [REPAYMENT_FREQUENCY.WEEKLY]:      52,
        [REPAYMENT_FREQUENCY.FORTNIGHTLY]: 26,
        [REPAYMENT_FREQUENCY.MONTHLY]:     12,
        [REPAYMENT_FREQUENCY.ANNUAL]:       1,
    };
    return map[frequency] ?? 12;
}

// ---------------------------------------------------------------------------
// Mortgage amortisation
// ---------------------------------------------------------------------------

/**
 * Calculate the standard P&I repayment for a given loan.
 *
 * @param {number} principal      - Loan amount
 * @param {number} annualRate     - Annual interest rate (decimal)
 * @param {number} termYears      - Total loan term in years
 * @param {string} [frequency]    - REPAYMENT_FREQUENCY constant (default monthly)
 * @returns {number} Payment per period
 */
export function calcPandIRepayment(principal, annualRate, termYears, frequency = REPAYMENT_FREQUENCY.MONTHLY) {
    if (principal <= 0 || termYears <= 0) return 0;
    const n  = paymentsPerYear(frequency);
    const r  = periodicRate(fin(annualRate), n);
    const nP = termYears * n;
    if (r === 0) return principal / nP;
    return principal * (r * Math.pow(1 + r, nP)) / (Math.pow(1 + r, nP) - 1);
}

/**
 * Calculate interest-only repayment per period.
 */
export function calcInterestOnlyRepayment(principal, annualRate, frequency = REPAYMENT_FREQUENCY.MONTHLY) {
    if (principal <= 0) return 0;
    const n = paymentsPerYear(frequency);
    const r = periodicRate(fin(annualRate), n);
    return principal * r;
}

/**
 * Amortise a loan over one full year (12 monthly steps for P&I, or 1 step for I/O).
 * Returns the loan balance at end of year, total interest paid, and total principal paid.
 *
 * @param {number} openingBalance  - Loan balance at start of year
 * @param {number} annualRate      - Current interest rate (decimal)
 * @param {number} termYears       - Original loan term in years
 * @param {number} remainingYears  - Years remaining at start of this year
 * @param {string} loanType        - LOAN_TYPE constant
 * @param {number} offsetBalance   - Offset account balance (reduces interest)
 * @returns {{ closingBalance: number, interestPaid: number, principalPaid: number, periodicPayment: number }}
 */
export function amortiseOneYear(openingBalance, annualRate, termYears, remainingYears, loanType = LOAN_TYPE.PRINCIPAL_INTEREST, offsetBalance = 0) {
    const effectiveBalance = Math.max(0, openingBalance - Math.max(0, fin(offsetBalance)));
    if (effectiveBalance <= 0) {
        return { closingBalance: 0, interestPaid: 0, principalPaid: openingBalance, periodicPayment: 0 };
    }

    if (loanType === LOAN_TYPE.INTEREST_ONLY) {
        const annualInterest = effectiveBalance * fin(annualRate);
        return {
            closingBalance: openingBalance,
            interestPaid:   annualInterest,
            principalPaid:  0,
            periodicPayment: annualInterest / 12,
        };
    }

    // P&I: step month-by-month to get precise closing balance
    const monthlyRate = periodicRate(fin(annualRate), 12);
    const totalPayments = Math.max(1, Math.round(fin(remainingYears, termYears) * 12));
    const payment = calcPandIRepayment(effectiveBalance, fin(annualRate), fin(remainingYears, termYears));

    let balance = effectiveBalance;
    let totalInterest = 0;
    const months = Math.min(12, totalPayments);

    for (let m = 0; m < months; m++) {
        const interest = balance * monthlyRate;
        const principal = Math.max(0, payment - interest);
        totalInterest += interest;
        balance = Math.max(0, balance - principal);
    }

    const principalPaid = effectiveBalance - balance;
    return {
        closingBalance:  balance + Math.max(0, openingBalance - effectiveBalance),
        interestPaid:    totalInterest,
        principalPaid:   principalPaid,
        periodicPayment: payment,
    };
}

// ---------------------------------------------------------------------------
// Annual property cashflow
// ---------------------------------------------------------------------------

/**
 * Calculate the full annual cashflow for one property for one year.
 *
 * @param {Object} prop           - PropertyInput object
 * @param {Object} yearContext    - { year, age, propertyValue, loanBalance, cpiGrowth, rentGrowth, interestRate }
 * @returns {Object} Annual ledger entry
 */
export function calcAnnualPropertyCashflow(prop, yearContext) {
    const {
        year        = 0,
        age         = null,
        propertyValue,
        loanBalance = 0,
        cpiGrowth   = 0.036,
        rentGrowth  = 0.032,
        interestRate,
    } = yearContext;

    const isPpor = prop.isPpor || prop.useType === 'primary_residence' || prop.useType === 'future_primary_residence';

    // --- Property value (caller grows it; we just use what's passed) ---
    const openingValue  = fin(propertyValue);
    const openingLoan   = fin(loanBalance);
    const effectiveRate = fin(interestRate ?? prop.interestRate, 0.062);
    const remainingYears = Math.max(1, fin(prop.remainingLoanYears ?? prop.loanTermYears, 30) - year);

    const amort = amortiseOneYear(openingLoan, effectiveRate, fin(prop.loanTermYears, 30), remainingYears, prop.loanType, prop.offsetBalance);

    // --- Rental income (PPOR has no rental income) ---
    let grossRent   = 0;
    let vacancyLoss = 0;
    let netRent     = 0;

    if (!isPpor) {
        const baseWeeklyRent = fin(prop.weeklyRent);
        const inflatedWeekly = baseWeeklyRent * Math.pow(1 + fin(rentGrowth), year);
        grossRent   = inflatedWeekly * 52;
        vacancyLoss = grossRent * fin(prop.vacancyWeeksPerYear, 2) / 52;
        netRent     = grossRent - vacancyLoss;
    }

    // --- Operating expenses (both PPOR and investment, but investment only for tax) ---
    const yearsElapsed = fin(year);
    const inflation    = fin(cpiGrowth);
    const expInflation = Math.pow(1 + inflation, yearsElapsed);

    const mgmtFee    = isPpor ? 0 : netRent * fin(prop.expenses?.managementPct, 0.08);
    const councilRates = fin(prop.expenses?.councilRates, 1200) * expInflation;
    const insurance  = fin(prop.expenses?.insurance, 1100) * expInflation;
    const maintenance = fin(prop.expenses?.maintenance, 2000) * expInflation;
    const strata     = fin(prop.expenses?.strata, 0) * expInflation;
    const landTax    = isPpor ? 0 : fin(prop.expenses?.landTax, 0) * expInflation;
    const waterRates = fin(prop.expenses?.waterRates, 800) * expInflation;
    const otherExp   = fin(prop.expenses?.other, 0) * expInflation;

    const totalOperatingExpenses = mgmtFee + councilRates + insurance + maintenance + strata + landTax + waterRates + otherExp;

    // --- Depreciation (investment only) ---
    const depreciation = isPpor ? 0 : fin(prop.depreciation?.annualDeduction, 0) + fin(prop.depreciation?.capitalWorks, 0);

    // --- Taxable rental income / loss ---
    const taxableRentalIncome = isPpor
        ? 0
        : netRent - amort.interestPaid - totalOperatingExpenses - depreciation;

    // --- Net cashflow before tax ---
    const netCashflowBeforeTax = isPpor
        ? -(amort.interestPaid + amort.principalPaid + totalOperatingExpenses)
        : netRent - amort.interestPaid - amort.principalPaid - totalOperatingExpenses;

    return {
        year,
        age,
        isPpor,
        openingValue,
        closingLoan:         amort.closingBalance,
        interestPaid:        amort.interestPaid,
        principalPaid:       amort.principalPaid,
        grossRent,
        vacancyLoss,
        netRent,
        managementFees:      mgmtFee,
        councilRates,
        insurance,
        maintenance,
        strata,
        landTax,
        waterRates,
        otherExpenses:       otherExp,
        totalOperatingExpenses,
        depreciation,
        taxableRentalIncome,
        netCashflowBeforeTax,
        equity:              openingValue - amort.closingBalance,
    };
}

// ---------------------------------------------------------------------------
// Sale cashflow
// ---------------------------------------------------------------------------

/**
 * Calculate net sale proceeds for a property.
 *
 * @param {number} salePrice         - Current market value at time of sale
 * @param {number} loanBalance       - Remaining loan balance
 * @param {number} purchasePrice     - Original purchase price (cost base)
 * @param {number} cgtPayable        - Capital gains tax (calculated externally)
 * @param {Object} [costOverrides]   - Override default selling costs
 * @returns {{ grossProceeds, sellingCosts, netProceeds, capitalGain }}
 */
export function calcSaleProceeds(salePrice, loanBalance, purchasePrice, cgtPayable = 0, costOverrides = {}) {
    const sp = fin(salePrice);
    const lb = fin(loanBalance);

    const agentCommission  = sp * fin(costOverrides.agentCommissionRate, SELLING_COSTS.agentCommissionRate);
    const marketingCost    = fin(costOverrides.marketingCost, SELLING_COSTS.marketingCost);
    const legalFees        = fin(costOverrides.legalFees, SELLING_COSTS.legalFees);
    const otherCosts       = fin(costOverrides.otherCosts, SELLING_COSTS.otherCosts);
    const sellingCosts     = agentCommission + marketingCost + legalFees + otherCosts;

    const grossProceeds    = sp - sellingCosts;
    const capitalGain      = sp - fin(purchasePrice) - sellingCosts;
    const netProceeds      = grossProceeds - lb - cgtPayable;

    return {
        salePrice:    sp,
        sellingCosts,
        grossProceeds,
        capitalGain,
        loanBalance:  lb,
        cgtPayable,
        netProceeds,
    };
}

// ---------------------------------------------------------------------------
// IRR calculation
// ---------------------------------------------------------------------------

/**
 * Calculate the Internal Rate of Return for a series of cashflows.
 * Uses Newton-Raphson iteration.
 *
 * @param {number[]} cashflows - Array of cashflows (negative = outflow, positive = inflow)
 * @param {number}   [guess]   - Initial IRR guess (default 0.10)
 * @returns {number|null} IRR as decimal, or null if no convergence
 */
export function calcIRR(cashflows, guess = 0.10) {
    if (!cashflows || cashflows.length < 2) return null;

    let rate = guess;
    for (let iter = 0; iter < 200; iter++) {
        let npv = 0;
        let dnpv = 0;
        for (let t = 0; t < cashflows.length; t++) {
            const denom = Math.pow(1 + rate, t);
            npv  += cashflows[t] / denom;
            dnpv -= t * cashflows[t] / (denom * (1 + rate));
        }
        if (Math.abs(dnpv) < 1e-12) break;
        const next = rate - npv / dnpv;
        if (Math.abs(next - rate) < 1e-8) return next;
        rate = next;
    }
    return null;
}

/**
 * Calculate real (inflation-adjusted) after-tax profit from a property hold.
 *
 * @param {number} nominalNetProceeds   - Net proceeds after loan, CGT, selling costs
 * @param {number} totalCashContributed - Total investor cash out of pocket over hold period
 * @param {number} cumulativeInflation  - Inflation multiplier over hold period (e.g. 1.45)
 * @returns {number} Real after-tax profit
 */
export function calcRealAfterTaxProfit(nominalNetProceeds, totalCashContributed, cumulativeInflation) {
    const realNetProceeds = fin(nominalNetProceeds) / fin(cumulativeInflation, 1);
    return realNetProceeds - fin(totalCashContributed);
}

export default {
    calcPandIRepayment,
    calcInterestOnlyRepayment,
    amortiseOneYear,
    calcAnnualPropertyCashflow,
    calcSaleProceeds,
    calcIRR,
    calcRealAfterTaxProfit,
};
