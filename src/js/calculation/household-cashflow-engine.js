import ENHANCED_CONFIG from '../config.js';
import { calculatePostTaxIncome } from '../utils.js';

const annualise = (monthly) => monthly * 12;

export function calculateMonthlyLoanPayment(balance, annualRate, months = 360) {
    if (!(balance > 0) || !(months > 0)) return 0;
    if (!(annualRate > 0)) return balance / months;
    const monthlyRate = annualRate / 12;
    return (balance * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months));
}

export function deriveHouseholdCashflow(canonicalInput) {
    const { household, income, cashflow, currentAssets } = canonicalInput;
    const salarySacrifice = cashflow.explicitAnnualSalarySacrifice + cashflow.partnerExplicitAnnualSalarySacrifice;
    const taxableSalary = Math.max(0, income.annualSalary - cashflow.explicitAnnualSalarySacrifice);
    const partnerTaxableSalary = Math.max(0, income.partnerAnnualSalary - cashflow.partnerExplicitAnnualSalarySacrifice);
    const otherIncome = income.businessIncome + income.investmentIncomeOutsideSuper;
    const grossHouseholdIncome = income.annualSalary + income.partnerAnnualSalary + otherIncome;
    const postTaxSalary = calculatePostTaxIncome(
        taxableSalary,
        ENHANCED_CONFIG.TAX_BRACKETS,
        income.hasPrivateHealthCover
    );
    const partnerPostTaxSalary = calculatePostTaxIncome(
        partnerTaxableSalary,
        ENHANCED_CONFIG.TAX_BRACKETS,
        income.hasPrivateHealthCover
    );
    const estimatedPostTaxIncome = Math.max(0, postTaxSalary + partnerPostTaxSalary + (otherIncome * 0.70));
    const estimatedTax = Math.max(0, grossHouseholdIncome - salarySacrifice - estimatedPostTaxIncome);
    const postTaxIncome = cashflow.currentMonthlyIncome > 0
        ? annualise(cashflow.currentMonthlyIncome)
        : estimatedPostTaxIncome;
    const currentAnnualSpending = cashflow.totalSpendProvided
        ? annualise(cashflow.currentMonthlyTotalSpend)
        : annualise(cashflow.currentMonthlyHousingCosts + cashflow.currentMonthlyLivingCosts + cashflow.currentMonthlyHealthcareCosts);
    const baseMonthlyMortgagePayment = cashflow.mortgageIncludedInSpending
        ? 0
        : cashflow.currentMonthlyMortgagePayment > 0
            ? cashflow.currentMonthlyMortgagePayment
            : calculateMonthlyLoanPayment(currentAssets.mortgageBalance, currentAssets.mortgageRate);
    const annualMortgageRepayments = annualise(baseMonthlyMortgagePayment);
    const explicitInvestmentContributions = annualise(cashflow.explicitMonthlyInvestmentContribution);
    const canAllocateSurplus = cashflow.hasDetailedExpenses && currentAnnualSpending > 0;
    const annualSurplus = canAllocateSurplus
        ? postTaxIncome - currentAnnualSpending - annualMortgageRepayments - explicitInvestmentContributions
        : null;
    const availableSurplus = Math.max(0, annualSurplus || 0);
    const allocations = { cash: 0, stocks: 0, super: 0, mortgage: 0 };
    const superByMember = { primary: 0, partner: 0 };

    if (cashflow.surplusAllocationMode === 'invest') {
        allocations.stocks = availableSurplus;
    } else if (cashflow.surplusAllocationMode === 'mortgage_first') {
        allocations.mortgage = Math.min(availableSurplus, currentAssets.mortgageBalance);
        allocations.stocks = availableSurplus - allocations.mortgage;
    } else if (cashflow.surplusAllocationMode === 'super_first') {
        const concessionalCap = ENHANCED_CONFIG.CONCESSIONAL_CAP || 30000;
        const primaryCapRoom = Math.max(
            0,
            concessionalCap - income.employerSuperAnnual - cashflow.explicitAnnualSalarySacrifice
        );
        const partnerCapRoom = household.householdType === 'couple'
            ? Math.max(
                0,
                concessionalCap - income.partnerEmployerSuperAnnual - cashflow.partnerExplicitAnnualSalarySacrifice
            )
            : 0;
        superByMember.primary = Math.min(availableSurplus, primaryCapRoom);
        superByMember.partner = Math.min(
            availableSurplus - superByMember.primary,
            partnerCapRoom
        );
        allocations.super = superByMember.primary + superByMember.partner;
        allocations.stocks = availableSurplus - allocations.super;
    } else if (cashflow.surplusAllocationMode === 'custom_split') {
        const requested = {
            cash: annualise(cashflow.surplusToCashMonthly),
            stocks: annualise(cashflow.surplusToStocksMonthly),
            super: cashflow.surplusToSuperAnnual,
            mortgage: Math.min(
                annualise(cashflow.surplusToMortgageMonthly),
                currentAssets.mortgageBalance
            ),
        };
        const requestedTotal = Object.values(requested).reduce((sum, value) => sum + value, 0);
        const scale = requestedTotal > 0 ? Math.min(1, availableSurplus / requestedTotal) : 0;
        Object.keys(allocations).forEach((key) => {
            allocations[key] = requested[key] * scale;
        });
    } else {
        allocations.cash = availableSurplus;
    }

    const allocatedSurplus = Object.values(allocations).reduce((sum, value) => sum + value, 0);
    const unallocatedSurplus = Math.max(0, availableSurplus - allocatedSurplus);
    const warnings = [];
    if (!cashflow.hasDetailedExpenses) warnings.push('Current household spending is missing, so no implicit surplus was allocated.');
    if (cashflow.hasDetailedExpenses && currentAnnualSpending <= 0) {
        warnings.push('Current household spending must be greater than zero before surplus can be allocated.');
    }
    if (annualSurplus !== null && annualSurplus < 0) warnings.push('Household spending and contributions exceed estimated post-tax income.');
    const requestedCustomAllocation = annualise(cashflow.surplusToCashMonthly)
        + annualise(cashflow.surplusToStocksMonthly)
        + cashflow.surplusToSuperAnnual
        + annualise(cashflow.surplusToMortgageMonthly);
    if (cashflow.surplusAllocationMode === 'custom_split' && requestedCustomAllocation > availableSurplus + 0.01) {
        warnings.push('Custom surplus allocations were capped at the available household surplus.');
    }
    if (
        cashflow.surplusAllocationMode === 'custom_split'
        && annualise(cashflow.surplusToMortgageMonthly) > currentAssets.mortgageBalance
    ) {
        warnings.push('Custom mortgage allocation was capped at the outstanding mortgage balance.');
    }
    if (cashflow.surplusAllocationMode === 'super_first') {
        warnings.push('Super-first amounts require the projection adapter to model contribution tax and changed take-home pay.');
    }
    if (unallocatedSurplus > 0.01) warnings.push('Some household surplus is unallocated.');
    if (otherIncome > 0) warnings.push('Business and non-super investment income uses the simulator simplified 30% tax assumption.');
    if (
        cashflow.currentMonthlySurplus !== null
        && annualSurplus !== null
        && Math.abs(cashflow.currentMonthlySurplus - (annualSurplus / 12)) > 1
    ) {
        warnings.push('The entered monthly surplus does not match derived household cashflow.');
    }

    return {
        grossHouseholdIncome,
        estimatedTax,
        postTaxIncome,
        canAllocateSurplus,
        currentAnnualSpending,
        baseMonthlyMortgagePayment,
        annualMortgageRepayments,
        explicitSuperContributions: salarySacrifice,
        explicitInvestmentContributions,
        annualSurplus,
        monthlySurplus: annualSurplus === null ? null : annualSurplus / 12,
        allocations,
        superByMember,
        allocatedSurplus,
        unallocatedSurplus,
        warnings,
    };
}
