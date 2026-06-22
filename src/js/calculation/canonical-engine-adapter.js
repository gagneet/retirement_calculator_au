export function applyCanonicalCashflowToEngineInputs(
    baseEngineInputs,
    canonicalInput,
    derivedCashflow
) {
    const engineInputs = {
        ...baseEngineInputs,
        canonicalInputSchemaVersion: derivedCashflow?.canAllocateSurplus
            ? canonicalInput.schemaVersion
            : 'calculator-input-v1',
    };

    if (!derivedCashflow?.canAllocateSurplus) return engineInputs;

    const allocations = derivedCashflow.allocations;
    engineInputs.useDetailedExpenseInputs = true;
    engineInputs.currentMonthlyHousingCosts = canonicalInput.cashflow.currentMonthlyHousingCosts;
    engineInputs.currentMonthlyLivingCosts = canonicalInput.cashflow.totalSpendProvided
        ? canonicalInput.cashflow.currentMonthlyTotalSpend
        : canonicalInput.cashflow.currentMonthlyLivingCosts;
    engineInputs.currentHealthcareCosts = canonicalInput.cashflow.totalSpendProvided
        ? 0
        : canonicalInput.cashflow.currentMonthlyHealthcareCosts * 12;
    engineInputs.annualCashSavingsContribution = allocations.cash;
    engineInputs.monthlyStockContribution = (baseEngineInputs.monthlyStockContribution || 0)
        + (allocations.stocks / 12);
    engineInputs.monthlyMortgagePayment = derivedCashflow.baseMonthlyMortgagePayment
        + (allocations.mortgage / 12);
    engineInputs.yourAdditionalSuperContribution = (baseEngineInputs.yourAdditionalSuperContribution || 0)
        + derivedCashflow.superByMember.primary;
    engineInputs.partnerAdditionalSuperContribution = (baseEngineInputs.partnerAdditionalSuperContribution || 0)
        + derivedCashflow.superByMember.partner;
    engineInputs.surplusAllocationMode = canonicalInput.cashflow.surplusAllocationMode;
    engineInputs.derivedAnnualSurplus = derivedCashflow.annualSurplus;
    return engineInputs;
}
