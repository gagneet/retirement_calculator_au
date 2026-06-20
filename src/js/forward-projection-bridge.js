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

  const payload = {
    version: 1,
    source,
    savedAt: new Date().toISOString(),
    input,
    engineInputs,
    simulation,
    adaptedResult,
    yearlyData: simulation?.yearlyData || adaptedResult?.years || [],
    monteCarloResults,
    recommendations,
    stressTestResults,
    summary: {
      targetAnnualIncomeToday: input?.desiredIncome || input?.asfaComfortable || 0,
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

  const monthly = summary.monthlyRetirementIncomeToday ?? payload?.adaptedResult?.monthlyPaycheck ?? 0;
  const annual = summary.annualRetirementIncomeToday ?? monthly * 12;

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
    currentMonthlyIncomeToday: monthly,
    currentAnnualIncomeToday: annual,
    sustainableIncomeToday: annual,
    superAtRetirement: summary.superAtRetirementToday ?? payload?.adaptedResult?.superAtRetire ?? retirementRow?.super ?? retirementRow?.accumulatedSuperBalance ?? 0,
    totalAssetsAtRetirement: summary.totalAssetsAtRetirement ?? retirementRow?.totalAssets ?? retirementRow?.totalFinancialAssets ?? 0,
    otherLiquidAtRetirement: summary.otherLiquidAtRetirement ?? retirementRow?.otherLiquid ?? 0,
    mortgageAtRetirement: summary.mortgageAtRetirement ?? retirementRow?.mortgageBalance ?? 0,
    agePensionAtRetirement: summary.agePensionAtRetirement ?? retirementRow?.pensionIncome ?? retirementRow?.pension ?? 0,
    estateAtLifespan: summary.estateAtLifespan ?? payload?.simulation?.finalBalance ?? 0,
    confidence,
    lastsUntil: summary.lastsUntil ?? payload?.adaptedResult?.lastsUntil,
    yearlyData: payload?.yearlyData || payload?.simulation?.yearlyData || payload?.adaptedResult?.years || [],
    meetsGoal: annual >= targetAnnualIncomeToday && (confidence === null || confidence >= confidenceTarget),
  };
}
