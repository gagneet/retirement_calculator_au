export const FORWARD_PROJECTION_STORAGE_KEY = 'rc_forward_projection_v1';
export const LEGACY_FORWARD_SCENARIO_STORAGE_KEY = 'rc_forward_scenario';

export function findRetirementYearRow(payload, retirementAge) {
  const yearlyData = payload?.yearlyData || payload?.simulation?.yearlyData || payload?.adaptedResult?.years || [];
  return yearlyData.find(row => row.age === retirementAge) || yearlyData[0] || null;
}

export function buildForwardProjectionPayload({
  source,
  input,
  engineInputs,
  simulation,
  adaptedResult,
  monteCarloResults = null,
  recommendations = null,
  stressTestResults = null,
  canonicalInput = null,
  derivedCashflow = null,
  inputHash = null,
  projectionHash = null,
  policyVersion = null,
  diagnostics = null,
  warnings = [],
}) {
  const retirementAge = input?.retireAge || input?.retirementAge || engineInputs?.retirementAge || 65;
  const currentAge = input?.age || input?.yourCurrentAge || engineInputs?.yourCurrentAge || 50;
  const lifespan = input?.lifespan || engineInputs?.yourLifespan || 90;
  const householdType = input?.household || (input?.isCouple ? 'couple' : 'single')
    || (engineInputs?.isCouple ? 'couple' : 'single') || 'couple';

  const monthlyPaycheck = adaptedResult?.monthlyPaycheck || 0;
  const annualRetirementIncomeToday = monthlyPaycheck * 12;
  const superAtRetirementToday = adaptedResult?.superAtRetire || 0;

  const retirementRow = findRetirementYearRow({ simulation, adaptedResult }, retirementAge);

  const totalAssetsAtRetirement = retirementRow?.totalAssets ?? retirementRow?.totalFinancialAssets ?? simulation?.totalFinancialAssets ?? 0;
  const mortgageAtRetirement = retirementRow?.mortgageBalance ?? 0;
  const agePensionAtRetirement = retirementRow?.pensionIncome ?? retirementRow?.pension ?? 0;
  const otherLiquidAtRetirement = retirementRow?.otherLiquid ?? 0;
  const lastsUntil = adaptedResult?.lastsUntil ?? simulation?.depletionAge ?? lifespan;
  const confidence = adaptedResult?.confidence ?? null;
  const incomeGapMonthly = adaptedResult?.gapMonthly ?? Math.max(0, (input?.desiredIncome || 0) / 12 - monthlyPaycheck);
  const incomeGapAnnual = incomeGapMonthly * 12;
  const estateAtLifespan = simulation?.finalBalance ?? 0;

  const payload = {
    version: 1,
    schemaVersion: canonicalInput?.schemaVersion || null,
    source,
    savedAt: new Date().toISOString(),
    input,
    inputHash,
    projectionHash,
    policyVersion,
    canonicalInput,
    derivedCashflow,
    engineInputs,
    simulation,
    adaptedResult,
    yearlyData: simulation?.yearlyData || adaptedResult?.years || [],
    monteCarloResults,
    recommendations,
    stressTestResults,
    diagnostics,
    warnings,
    summary: {
      targetAnnualIncomeToday: input?.desiredIncome || input?.asfaComfortable || 0,
      plannedSpendingTargetToday: input?.desiredIncome || input?.asfaComfortable || 0,
      swrReferenceIncomeToday: (adaptedResult?.swrMonthlyToday || 0) * 12,
      modelledAnnualWithdrawalToday: adaptedResult?.plannedSpendingToday || input?.desiredIncome || input?.asfaComfortable || 0,
      monthlyRetirementIncomeToday: monthlyPaycheck,
      annualRetirementIncomeToday,
      superAtRetirementToday,
      totalAssetsAtRetirement,
      otherLiquidAtRetirement,
      mortgageAtRetirement,
      agePensionAtRetirement,
      lastsUntil,
      confidence,
      incomeGapMonthly,
      incomeGapAnnual,
      estateAtLifespan,
      retirementAge,
      currentAge,
      lifespan,
      householdType,
    },
  };

  return payload;
}

export function storeForwardProjection(payload) {
  try {
    localStorage.setItem(FORWARD_PROJECTION_STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function loadForwardProjection() {
  try {
    const stored = localStorage.getItem(FORWARD_PROJECTION_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function extractCurrentPathFromProjection(payload, goalOverrides = {}) {
  const input = payload?.input || {};
  const summary = payload?.summary || {};
  const retirementAge = goalOverrides.retirementAge || summary.retirementAge || input.retireAge || input.retirementAge || 65;
  const targetAnnualIncomeToday = goalOverrides.targetAnnualIncomeToday || summary.targetAnnualIncomeToday || input.desiredIncome || input.asfaComfortable || 0;
  const confidenceTarget = goalOverrides.confidenceTarget ?? 0.8;

  const retirementRow = findRetirementYearRow(payload, retirementAge);

  const plannedAnnual = summary.plannedSpendingTargetToday
    ?? summary.targetAnnualIncomeToday
    ?? payload?.adaptedResult?.plannedSpendingToday
    ?? 0;
  // Modelled income is the actual projected withdrawal (monthlyPaycheck × 12), not the target.
  const modelledMonthly = summary.monthlyRetirementIncomeToday ?? 0;
  const modelledAnnual = summary.annualRetirementIncomeToday ?? modelledMonthly * 12;
  const swrReferenceIncomeToday = summary.swrReferenceIncomeToday
    ?? (payload?.adaptedResult?.swrMonthlyToday || 0) * 12;

  let confidence = null;
  if (Number.isFinite(summary.confidence)) confidence = summary.confidence;
  else if (Number.isFinite(payload?.adaptedResult?.confidence)) confidence = payload.adaptedResult.confidence;

  return {
    source: payload?.source,
    currentAge: summary.currentAge ?? input.age ?? input.yourCurrentAge,
    retirementAge,
    lifespan: summary.lifespan ?? input.lifespan ?? input.yourLifespan,
    householdType: summary.householdType ?? input.household ?? (input.isCouple ? 'couple' : 'single'),
    targetAnnualIncomeToday,
    currentMonthlyIncomeToday: modelledMonthly,
    currentAnnualIncomeToday: modelledAnnual,
    // Compatibility alias. New UI/reporting must label this as an SWR reference,
    // not as the user's planned or guaranteed retirement income.
    sustainableIncomeToday: swrReferenceIncomeToday,
    swrReferenceIncomeToday,
    plannedSpendingTargetToday: plannedAnnual,
    modelledAnnualWithdrawalToday: summary.modelledAnnualWithdrawalToday ?? plannedAnnual,
    superAtRetirement: summary.superAtRetirementToday ?? payload?.adaptedResult?.superAtRetire ?? retirementRow?.super ?? retirementRow?.accumulatedSuperBalance ?? 0,
    totalAssetsAtRetirement: summary.totalAssetsAtRetirement ?? retirementRow?.totalAssets ?? retirementRow?.totalFinancialAssets ?? 0,
    otherLiquidAtRetirement: summary.otherLiquidAtRetirement ?? retirementRow?.otherLiquid ?? 0,
    mortgageAtRetirement: summary.mortgageAtRetirement ?? retirementRow?.mortgageBalance ?? 0,
    agePensionAtRetirement: summary.agePensionAtRetirement ?? retirementRow?.pensionIncome ?? retirementRow?.pension ?? 0,
    estateAtLifespan: summary.estateAtLifespan ?? payload?.simulation?.finalBalance ?? 0,
    confidence,
    lastsUntil: summary.lastsUntil ?? payload?.adaptedResult?.lastsUntil,
    yearlyData: payload?.yearlyData || payload?.simulation?.yearlyData || payload?.adaptedResult?.years || [],
    meetsGoal: modelledAnnual >= targetAnnualIncomeToday && (confidence === null || confidence >= confidenceTarget),
  };
}

export function extractProjectionSnapshot(payload = {}) {
  const engine = payload.engineInputs || {};
  const canonical = payload.canonicalInput || {};
  const household = canonical.household || {};
  const income = canonical.income || {};
  const assets = canonical.currentAssets || {};
  const cashflow = canonical.cashflow || {};
  const assumptions = canonical.assumptions || {};
  return {
    currentAge: household.currentAge ?? engine.yourCurrentAge ?? engine.currentAge ?? 0,
    partnerAge: household.partnerAge ?? engine.partnerCurrentAge ?? 0,
    retirementAge: household.retirementAge ?? engine.retirementAge ?? 0,
    lifespan: household.lifespan ?? engine.yourLifespan ?? 0,
    isCouple: household.householdType === 'couple' || Boolean(engine.isCouple),
    annualSalary: income.annualSalary ?? engine.yourSalary ?? engine.annualSalary ?? 0,
    partnerSalary: income.partnerAnnualSalary ?? engine.partnerSalary ?? 0,
    currentSuperBalance: assets.currentSuperBalance ?? engine.yourCurrentSuper ?? engine.superBalance ?? 0,
    partnerCurrentSuper: assets.partnerCurrentSuperBalance ?? engine.partnerCurrentSuper ?? engine.partnerSuperBalance ?? 0,
    cashSavings: assets.cashSavings ?? engine.currentSavings ?? engine.savings ?? 0,
    stocksPortfolio: assets.stocksPortfolio ?? engine.currentStocks ?? engine.investments ?? 0,
    homeValue: assets.homeValue ?? engine.homeValue ?? 0,
    mortgageBalance: assets.mortgageBalance ?? engine.mortgageBalance ?? 0,
    monthlyMortgagePayment: cashflow.currentMonthlyMortgagePayment ?? engine.monthlyMortgagePayment ?? 0,
    monthlyInvestment: cashflow.explicitMonthlyInvestmentContribution ?? engine.monthlyStockContribution ?? 0,
    hasInvestmentProperty: canonical.scenarioToggles?.includeInvestmentProperty ?? Boolean(engine.hasInvestmentProperty),
    investmentPropertyValue: assets.investmentPropertyValue ?? engine.investmentPropertyValue ?? 0,
    weeklyRentalIncome: canonical.investmentProperty?.weeklyRentalIncome ?? engine.weeklyRentalIncome ?? 0,
    annualPropertyExpenses: canonical.investmentProperty?.annualOperatingExpenses ?? engine.annualPropertyExpenses ?? 0,
    propertyGrowthRate: assumptions.propertyGrowthRate ?? engine.propertyGrowthRate ?? 0.04,
    inflation: assumptions.inflationRate ?? engine.inflation ?? 0.026,
    investmentReturn: assumptions.investmentReturnRate ?? engine.investmentReturn ?? 0.07,
    superReturn: assumptions.superReturnRate ?? engine.superReturn ?? 0.075,
    salaryGrowthRate: assumptions.wageGrowthRate ?? engine.salaryGrowthRate ?? 0.02,
    source: payload.source || 'unknown',
    inputHash: payload.inputHash || null,
    projectionHash: payload.projectionHash || null,
  };
}

export function validateProjectionSnapshot(payload = {}, snapshot = extractProjectionSnapshot(payload)) {
  const issues = [];
  const expectedCouple = payload.canonicalInput?.household?.householdType === 'couple'
    || payload.engineInputs?.isCouple === true;
  if (expectedCouple && !snapshot.isCouple) issues.push('Imported household is couple but reverse snapshot is single.');
  for (const [label, value] of [
    ['salary', snapshot.annualSalary],
    ['super', snapshot.currentSuperBalance],
    ['cash', snapshot.cashSavings],
  ]) {
    const sourceValue = label === 'salary'
      ? (payload.engineInputs?.yourSalary ?? payload.canonicalInput?.income?.annualSalary)
      : label === 'super'
        ? (payload.engineInputs?.yourCurrentSuper ?? payload.canonicalInput?.currentAssets?.currentSuperBalance)
        : (payload.engineInputs?.currentSavings ?? payload.canonicalInput?.currentAssets?.cashSavings);
    if (Number(sourceValue) > 0 && !(Number(value) > 0)) {
      issues.push(`Imported ${label} is positive but reverse snapshot shows $0.`);
    }
  }
  if (payload.inputHash && snapshot.inputHash !== payload.inputHash) issues.push('Reverse input hash does not match the imported projection.');
  return { valid: issues.length === 0, issues, snapshot };
}
