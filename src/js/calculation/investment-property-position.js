const finite = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const rate = (value, fallback = 0) => {
    const parsed = finite(value, fallback);
    return Math.abs(parsed) > 1 ? parsed / 100 : parsed;
};

export function applyCapitalLossPool(capitalGain, openingPool = 0) {
    const rawGain = finite(capitalGain);
    let capitalLossPool = Math.max(0, finite(openingPool));
    let taxableGain = rawGain;
    let capitalLossRealised = 0;
    let capitalLossApplied = 0;

    if (taxableGain < 0) {
        capitalLossRealised = -taxableGain;
        capitalLossPool += capitalLossRealised;
        taxableGain = 0;
    } else if (capitalLossPool > 0) {
        capitalLossApplied = Math.min(capitalLossPool, taxableGain);
        taxableGain -= capitalLossApplied;
        capitalLossPool -= capitalLossApplied;
    }

    return { taxableGain, capitalLossPool, capitalLossRealised, capitalLossApplied };
}

export function buildInvestmentPropertyLedgerEntry(inputs = {}, options = {}) {
    const year = finite(options.year);
    const age = options.age == null ? null : finite(options.age);
    const openingValue = finite(options.openingValue, finite(inputs.investmentPropertyValue));
    const closingValue = finite(options.closingValue, openingValue);
    const openingLoan = finite(options.openingLoan, finite(inputs.investmentPropertyLoan));
    const closingLoan = finite(options.closingLoan, openingLoan);
    const grossRent = finite(options.grossRent, finite(inputs.weeklyRentalIncome) * 52);
    const vacancyLoss = finite(options.vacancyLoss, grossRent * rate(inputs.vacancyRate, 0.04));
    const netRent = grossRent - vacancyLoss;
    const interest = finite(options.interest, openingLoan * rate(inputs.investmentPropertyRate));
    const principal = Math.max(0, openingLoan - closingLoan);
    const strata = finite(options.strata, inputs.investmentPropertyStrataLevy);
    const landTax = finite(options.landTax, inputs.landTax);
    const otherExpenses = finite(options.otherExpenses, inputs.annualPropertyExpenses);
    const depreciation = finite(options.depreciation);
    const taxableRentalIncome = netRent - interest - strata - landTax - otherExpenses - depreciation;
    const marginalTaxRate = rate(inputs.propertyTaxRate ?? inputs.capitalGainsTaxRate, 0.235);
    const taxBenefitOrCost = -taxableRentalIncome * marginalTaxRate;
    const netCashflowBeforeTax = netRent - interest - principal - strata - landTax - otherExpenses;
    const netCashflowAfterTax = netCashflowBeforeTax + taxBenefitOrCost;
    const expectedCapitalGrowth = closingValue - openingValue;

    return {
        year,
        age,
        openingValue,
        closingValue,
        openingLoan,
        closingLoan,
        grossRent,
        vacancyLoss,
        netRent,
        interest,
        principal,
        strata,
        insurance: finite(options.insurance),
        repairs: finite(options.repairs),
        landTax,
        otherExpenses,
        depreciation,
        taxableRentalIncome,
        taxBenefitOrCost,
        netCashflowBeforeTax,
        netCashflowAfterTax,
        expectedCapitalGrowth,
        economicReturn: netCashflowAfterTax + expectedCapitalGrowth,
        equity: closingValue - closingLoan,
    };
}

export function buildInvestmentPropertyPosition(inputs = {}, options = {}) {
    const currentValue = finite(inputs.investmentPropertyValue);
    const currentLoan = finite(inputs.investmentPropertyLoan);
    const purchasePrice = finite(inputs.investmentPropertyPurchasePrice, currentValue);
    const sellingCostRate = rate(options.sellingCostRate, 0.05);
    const estimatedSellingCosts = currentValue * sellingCostRate + finite(options.fixedSellingCosts);
    const capitalGainOrLossToday = currentValue - purchasePrice;
    const loss = applyCapitalLossPool(capitalGainOrLossToday, finite(options.capitalLossPool));
    const effectiveCgtRate = rate(inputs.capitalGainsTaxRate, 0.235);
    const cgtPayable = loss.taxableGain * effectiveCgtRate;
    const netSaleProceedsToday = currentValue - estimatedSellingCosts - currentLoan - cgtPayable;
    const ledger = buildInvestmentPropertyLedgerEntry(inputs, {
        year: 0,
        age: inputs.yourCurrentAge,
        openingValue: currentValue,
        closingValue: currentValue,
        openingLoan: currentLoan,
        closingLoan: currentLoan,
    });

    return {
        currentValue,
        purchasePrice,
        currentLoan,
        currentEquity: currentValue - currentLoan,
        loanToValueRatio: currentValue > 0 ? currentLoan / currentValue : null,
        estimatedSellingCosts,
        netSaleProceedsToday,
        cashRequiredToSellToday: Math.max(0, -netSaleProceedsToday),
        capitalGainOrLossToday,
        cgtPayable,
        capitalLossCarriedForward: loss.capitalLossPool,
        annualRentGross: ledger.grossRent,
        annualVacancyAllowance: ledger.vacancyLoss,
        annualOperatingExpenses: ledger.strata + ledger.landTax + ledger.otherExpenses,
        annualInterestCost: ledger.interest,
        annualPrincipalRepayment: ledger.principal,
        annualNetCashflowBeforeTax: ledger.netCashflowBeforeTax,
        annualNetCashflowAfterTaxEstimate: ledger.netCashflowAfterTax,
        currentRiskLabel: currentValue < currentLoan ? 'negative_equity'
            : ledger.netCashflowBeforeTax < 0 ? 'negative_cashflow'
                : 'positive_equity',
        isNegativelyGeared: ledger.netCashflowBeforeTax < 0,
        belowPurchasePrice: currentValue < purchasePrice,
        ledger,
    };
}

export default { applyCapitalLossPool, buildInvestmentPropertyLedgerEntry, buildInvestmentPropertyPosition };
