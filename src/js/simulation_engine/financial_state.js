/**
 * financial_state.js – Annual Financial Snapshot
 *
 * Represents the complete financial state of a person at a given age.
 * Each year of the life simulation produces one FinancialState snapshot.
 */

export class FinancialState {
    /**
     * @param {number} age
     * @param {Object} [overrides] – optional initial field overrides
     */
    constructor(age, overrides = {}) {
        this.age = age;

        // Income
        this.salary = 0;
        this.partnerSalary = 0;
        this.rentalIncome = 0;
        this.trustDistributions = 0;
        this.pensionIncome = 0;
        this.investmentIncome = 0;

        // Expenses
        this.livingExpenses = 0;
        this.mortgagePayment = 0;
        this.healthcareCosts = 0;
        this.agedCareCosts = 0;
        this.educationCosts = 0;

        // Super
        this.superBalance = 0;
        this.partnerSuperBalance = 0;
        this.superContributions = 0;
        this.superWithdrawal = 0;

        // Investment assets
        this.investmentAssets = 0;      // stocks + savings
        this.propertyAssets = 0;        // investment property market value
        this.trustAssets = 0;

        // Liabilities
        this.mortgageBalance = 0;
        this.investmentPropertyLoan = 0;

        // Tax
        this.taxableIncome = 0;
        this.incomeTax = 0;

        // Derived
        this.netWorth = 0;
        this.annualCashFlow = 0;

        // Life events active this year
        this.activeEvents = [];

        // Apply any overrides passed in
        Object.assign(this, overrides);
    }

    /**
     * Compute net worth and cash flow from current state fields.
     */
    recalculate() {
        const totalAssets = this.superBalance + this.partnerSuperBalance
            + this.investmentAssets + this.propertyAssets + this.trustAssets;
        const totalLiabilities = this.mortgageBalance + this.investmentPropertyLoan;
        this.netWorth = totalAssets - totalLiabilities;

        const totalIncome = this.salary + this.partnerSalary
            + this.rentalIncome + this.trustDistributions
            + this.pensionIncome + this.investmentIncome
            + this.superWithdrawal;
        const totalExpenses = this.livingExpenses + this.mortgagePayment
            + this.healthcareCosts + this.agedCareCosts
            + this.educationCosts + this.incomeTax;
        this.annualCashFlow = totalIncome - totalExpenses;

        return this;
    }

    /**
     * Return a plain object snapshot (for serialisation / charting).
     */
    toSnapshot() {
        return { ...this };
    }
}

export default FinancialState;
