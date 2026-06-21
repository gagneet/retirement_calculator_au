/**
 * super_engine.js – Superannuation Contributions & Withdrawals
 *
 * Handles annual super balance growth, employer and voluntary contributions,
 * super tax, and drawdown in retirement.
 */

// SG rate schedule (employer contributions)
const SG_SCHEDULE = [
    { fromYear: 2023, rate: 0.11  },
    { fromYear: 2024, rate: 0.115 },
    { fromYear: 2025, rate: 0.12  },
];

// Preservation age (can access super from this age)
export const PRESERVATION_AGE = 60;

/**
 * Return current Superannuation Guarantee rate for a given calendar year.
 *
 * @param {number} calendarYear  – e.g. 2025
 * @returns {number} SG rate as decimal
 */
export const getSGRate = (calendarYear) => {
    const schedule = [...SG_SCHEDULE].reverse().find(s => calendarYear >= s.fromYear);
    return schedule ? schedule.rate : 0.12;
};

/**
 * Calculate annual employer + voluntary super contributions (pre-tax).
 *
 * @param {number} grossSalary        – annual gross salary
 * @param {number} age                – current age
 * @param {Object} inputs             – superContributionRate, retirementAge
 * @param {number} calendarYear       – current calendar year
 * @returns {number} total annual super contributions
 */
export const calcSuperContributions = (grossSalary, age, inputs, calendarYear = 2025) => {
    const { retirementAge = 65, superContributionRate = null } = inputs;
    if (age >= retirementAge || grossSalary <= 0) return 0;

    const sgRate = getSGRate(calendarYear);
    const rate = superContributionRate !== null ? superContributionRate : sgRate;
    return grossSalary * rate;
};

/**
 * Grow a super balance by one year.
 *
 * @param {number} currentBalance     – start-of-year balance
 * @param {number} contributions      – annual contributions (gross, pre-tax)
 * @param {number} superTax           – contributions tax paid this year
 * @param {Object} inputs             – superReturn
 * @returns {number} end-of-year balance
 */
export const growSuperBalance = (currentBalance, contributions, superTax, inputs, yearSuperReturn = null) => {
    const { superReturn = 0.075, useStochasticReturns = false } = inputs;
    const netContributions = contributions - superTax;

    let effectiveReturn;
    if (yearSuperReturn !== null) {
        effectiveReturn = yearSuperReturn;
    } else if (useStochasticReturns) {
        // Per-year normal draw for super: σ = max(3%, rate×60%) reflects balanced-fund volatility
        const sigma = Math.max(0.03, Math.abs(superReturn) * 0.6);
        const u1 = Math.max(1e-10, Math.random());
        const u2 = Math.random();
        const z  = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        effectiveReturn = Math.max(-0.30, superReturn + z * sigma); // super funds can lose up to 30%
    } else {
        effectiveReturn = superReturn;
    }

    return (currentBalance + netContributions) * (1 + effectiveReturn);
};

/**
 * Calculate annual super withdrawal in retirement.
 *
 * Minimum annual drawdown rates (ATO pension phase):
 *  Age < 65: 4%, 65–74: 5%, 75–79: 6%, 80–84: 7%, 85–89: 9%, 90–94: 11%, 95+: 14%
 *
 * @param {number} superBalance       – current balance
 * @param {number} age                – current age
 * @param {number} requiredSpending   – annual spending requirement
 * @param {Object} inputs             – retirementAge
 * @returns {number} annual withdrawal amount
 */
export const calcSuperWithdrawal = (superBalance, age, requiredSpending, inputs) => {
    const { retirementAge = 65 } = inputs;

    if (age < Math.max(PRESERVATION_AGE, retirementAge)) return 0;
    if (superBalance <= 0) return 0;

    // Minimum drawdown rate
    let minRate;
    if (age < 65)      minRate = 0.04;
    else if (age < 75) minRate = 0.05;
    else if (age < 80) minRate = 0.06;
    else if (age < 85) minRate = 0.07;
    else if (age < 90) minRate = 0.09;
    else if (age < 95) minRate = 0.11;
    else               minRate = 0.14;

    const minWithdrawal = superBalance * minRate;
    // Draw at least the minimum; draw more if spending needs it
    const neededWithdrawal = Math.max(minWithdrawal, requiredSpending);
    return Math.min(neededWithdrawal, superBalance);
};

export default { getSGRate, calcSuperContributions, growSuperBalance, calcSuperWithdrawal, PRESERVATION_AGE };
