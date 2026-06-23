// ============================================================
// src/js/retirement-v3.js
// Thin vanilla controller for the V3 retirement page.
// Wires the new DOM to existing calculation engines.
// ============================================================

import '../css/styles.css';
import '../css/redesign.css';
import '../css/retirement-v3.css';
import '../css/site-chrome.css';
import './site-chrome.js';
import ENHANCED_CONFIG from './config.js';
import RetirementSimulator from './simulator.js';
import RecommendationEngine from './recommendation.js';
import profiler from './performance-profiler.js';
import OverseasRetirementAnalyzer from './overseas-retirement.js';
import { RiskProfilingEngine } from './risk-profiling-engine.js';
import { buildStressedInputs, normaliseStressScenarioForTest } from './policy/stress-helpers.js';
import {
  calculateConcessionalCapStatus,
  calculateEmployerSuper,
  EMPLOYER_SUPER_MODES,
  DEFAULT_MAX_CONTRIBUTION_BASE_PER_QUARTER,
  SALARY_INCOME_MODES,
  resolveEmployerSuper,
  shouldWarnDivision293,
} from './super-policy.js';
import {
  exportToPDF,
  exportUserData,
  formatCurrency,
  formatPercent,
  deflateToToday,
  importUserData,
  showNotification,
  calculateStateLandTax,
  initializeTooltips,
} from './utils.js';
import {
  buildCanonicalSaveData,
  extractAdvancedV2UiState,
} from './calculation/save-data-schema.js';
import { buildForwardProjectionPayload, storeForwardProjection } from './forward-projection-bridge.js';
import { adaptAdvancedV2Input } from './calculation/input-adapters/advanced-v2-adapter.js';
import { applyCanonicalCashflowToEngineInputs } from './calculation/canonical-engine-adapter.js';
import { ProjectionService } from './calculation/projection-service.js';
import { estimateMonthlySpending, SPENDING_ESTIMATED_WARNING_PREFIX } from './calculation/household-cashflow-engine.js';

const simulator = new RetirementSimulator(ENHANCED_CONFIG);
const { DEFAULTS } = ENHANCED_CONFIG;
const riskProfiler = new RiskProfilingEngine(ENHANCED_CONFIG);
const projectionService = new ProjectionService({
  simulator,
  adapter: adaptAdvancedV2Input,
  engineInputBuilder: (rawInput, { canonicalInput, derivedCashflow }) => (
    applyCanonicalCashflowToEngineInputs(
      buildEngineInputs(rawInput),
      canonicalInput,
      derivedCashflow
    )
  ),
  resultAdapter: adaptEngineOutput,
  summaryBuilder: ({ canonicalInput, simulation, adaptedResult }) => ({
    targetAnnualIncomeToday: canonicalInput.retirementTarget.targetAnnualIncomeToday,
    monthlyRetirementIncomeToday: (adaptedResult.plannedSpendingToday / 12),
    superAtRetirementToday: adaptedResult.superAtRetire,
    estateAtLifespan: simulation.finalBalance,
  }),
  policyVersion: '2026.1',
});

const EXPERIENCE_MAP = {
  none: 0,
  '1_3': 1,
  '3_7': 2,
  '7_15': 3,
  '15_plus': 4,
};

const EMERGENCY_FUND_MAP = {
  '6plus': 'full',
  '3_6': 'partial',
  '1_3': 'partial',
  none: 'none',
};

const DEBT_MAP = {
  none: 'minimal',
  under_10k: 'moderate',
  '10_50k': 'moderate',
  over_50k: 'significant',
};

const PENSION_MEANS_TEST_DEFAULTS = {
  single: {
    threshold: ENHANCED_CONFIG.SINGLE_ASSET_THRESHOLD,
    cutoff: ENHANCED_CONFIG.SINGLE_ASSET_LIMIT,
  },
  couple: {
    threshold: ENHANCED_CONFIG.COUPLE_ASSET_THRESHOLD,
    cutoff: ENHANCED_CONFIG.COUPLE_ASSET_LIMIT,
  },
};

const COUNTRY_CODE_MAP = {
  portugal: 'PORTUGAL',
  spain: 'SPAIN',
  italy: 'ITALY',
  canada: 'CANADA',
  newzealand: 'NEW_ZEALAND',
  nz: 'NEW_ZEALAND',
  japan: 'JAPAN',
  india: 'INDIA',
  uk: 'UNITED_KINGDOM',
  united_kingdom: 'UNITED_KINGDOM',
  usa: 'USA',
  thailand: 'THAILAND',
  vietnam: 'VIETNAM',
  malaysia: 'MALAYSIA',
  bali: 'BALI',
  philippines: 'PHILIPPINES',
};
const OVERSEAS_DEST_CURRENCY_MAP = ENHANCED_CONFIG.OVERSEAS_RETIREMENT?.DESTINATION_CURRENCY_MAP || {};
const OVERSEAS_DEST_FX_ASSUMPTIONS = ENHANCED_CONFIG.OVERSEAS_RETIREMENT?.DESTINATION_AUD_FX_ASSUMPTIONS || {};
const OVERSEAS_DEST_FX_MEDIAN_MAP = ENHANCED_CONFIG.OVERSEAS_RETIREMENT?.DESTINATION_AUD_FX_MEDIAN_10Y_CHANGE_PCT || {};

const APP_STATE = {
  input: null,
  engineInputs: null,
  simulation: null,
  adaptedResult: null,
  projection: null,
  monteCarloResults: null,
  retirementAgeResult: null,
  stressTestResults: [],
  recommendations: [],
  riskProfile: null,
  allocationStrategy: null,
  overseasAnalysis: null,
  overseasExportData: null,
  chartManager: { charts: {} },
  monteCarloChartRender: {
    lastKey: null,
    scheduled: false,
  },
  currentInputSignature: null,
  secondaryAnalysis: {
    recommendations: { lastInputSignature: null, stale: false },
    stress: { lastInputSignature: null, stale: false },
    overseas: { lastInputSignature: null, stale: false },
    retirementAge: { lastInputSignature: null, stale: false },
  },
};
let initialFormState = null;
let bootStarted = false;
const SECONDARY_ANALYSIS_KEYS = ['recommendations', 'stress', 'overseas', 'retirementAge'];

// Dirty-flag tracking: compare input snapshots to avoid re-running expensive tools
// when nothing has changed since the last full analysis.
let lastFullAnalysisHash = null;
let lastMcHash = null;

function getInputsHash() {
  try {
    return JSON.stringify(readInputs());
  } catch {
    return null;
  }
}

function markCalcButtonState(isDirty) {
  ['btn-calc-full', 'btn-calculate'].forEach((id) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    if (isDirty) {
      btn.classList.remove('btn-uptodate');
      btn.title = '';
    } else {
      btn.classList.add('btn-uptodate');
      btn.title = 'No changes since last calculation';
    }
  });
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function pct(value, fallbackPercent = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallbackPercent > 0 && fallbackPercent <= 1 ? fallbackPercent : fallbackPercent / 100;
  }
  if (numeric > 0 && numeric <= 1) return numeric;
  return numeric / 100;
}

function getDefaultFxChangeDisplayPercent(destination, fallback = -1) {
  const key = String(destination || "").toLowerCase();
  const assumption = OVERSEAS_DEST_FX_ASSUMPTIONS[key];
  if (assumption && Number.isFinite(Number(assumption.medianAnnualChangePct))) {
    return Number(assumption.medianAnnualChangePct);
  }
  if (Number.isFinite(Number(OVERSEAS_DEST_FX_MEDIAN_MAP[key]))) {
    return Number(OVERSEAS_DEST_FX_MEDIAN_MAP[key]);
  }
  return fallback;
}

function normalizeFxChangeDisplayPercent(value, destination = "", fallback = -1) {
  const destinationDefault = getDefaultFxChangeDisplayPercent(destination, fallback);
  if (value === null || value === undefined || value === "") return destinationDefault;

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return destinationDefault;

  if (Math.abs(numeric) <= 0.1) {
    return parseFloat((numeric * 100).toFixed(2));
  }

  if (Math.abs(numeric) <= 10) {
    return parseFloat(numeric.toFixed(2));
  }

  return destinationDefault;
}

function normalizeFxChangeRate(value, destination = "", fallback = -1) {
  return pct(normalizeFxChangeDisplayPercent(value, destination, fallback), fallback);
}

function deriveMortgagePayment(balance, annualRate) {
  if (!(balance > 0)) return 0;
  if (!(annualRate > 0)) return balance / 360;

  const monthlyRate = annualRate / 12;
  const months = 360;

  return (balance * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months));
}

function deriveAgedCareDuration(inp) {
  if (inp.agedCareDuration !== undefined && inp.agedCareDuration !== null && inp.agedCareDuration !== "") {
    const explicit = Number(inp.agedCareDuration);
    if (Number.isFinite(explicit)) return Math.max(0, explicit);
  }

  const yearsRemaining = (inp.lifespan || 0) - (inp.agedCareStartAge || 0);
  return yearsRemaining > 0 ? Math.round(yearsRemaining) : DEFAULTS.healthcare.agedCareDuration;
}

function normalizeResidenceType(inp = {}) {
  const raw = inp.primaryResidenceType || inp.housingStatus || inp.residenceType;
  if (raw === "own_with_mortgage") return "own_mortgage";
  if (raw === "living_with_family") return "family";
  if (raw === "other") return "other";
  if (raw === "own_mortgage" || raw === "own_outright" || raw === "renting" || raw === "family") return raw;
  if ((Number(inp.mortgage) || 0) > 0) return "own_mortgage";
  if ((Number(inp.homeValue) || 0) > 0) return "own_outright";
  return "own_mortgage";
}

function isHomeownerResidence(residenceType) {
  return residenceType === "own_mortgage" || residenceType === "own_outright";
}

function isMortgageResidence(residenceType) {
  return residenceType === "own_mortgage";
}

function isNonHomeownerResidence(residenceType) {
  return !isHomeownerResidence(residenceType);
}

function getAsfaComfortableAmount(household = 'couple') {
  return household === 'single' ? 52085 : 73337;
}

function calculateRichTargetAmount({
  household = 'couple',
  richTarget = '1.0',
  customAmount = 0,
  bufferPct = 0,
} = {}) {
  const base = getAsfaComfortableAmount(household);
  const multiplier = richTarget === 'custom' ? null : (parseFloat(richTarget) || 1);
  const target = multiplier === null
    ? Math.max(0, parseFloat(customAmount) || base)
    : base * multiplier;
  return Math.round(target * (1 + Math.max(0, parseFloat(bufferPct) || 0) / 100));
}

function calculateTargetBuilderTotal({
  currentMonthlyIncome = 0,
  monthlyHousingOffset = 0,
  monthlyCostsEnding = 0,
  annualHealthcare = 0,
  annualHousingCost = 0,
  bufferPct = 0,
} = {}) {
  const baseMonthly = Math.max(
    0,
    Number(currentMonthlyIncome || 0)
      - Number(monthlyHousingOffset || 0)
      - Number(monthlyCostsEnding || 0)
  );
  const baseAnnual = (baseMonthly * 12)
    + Math.max(0, Number(annualHealthcare || 0))
    + Math.max(0, Number(annualHousingCost || 0));
  return Math.round(baseAnnual * (1 + Math.max(0, Number(bufferPct || 0)) / 100));
}

function resolveResidenceAwarePensionDefault(value, currentDefault, staleOppositeDefault) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return currentDefault;
  return numeric === staleOppositeDefault ? currentDefault : numeric;
}

function deriveLandTax(inp) {
  if (!inp.investmentProperty) return 0;
  if (inp.landTax > 0) return inp.landTax;
  return calculateStateLandTax(inp.ipValue, inp.ipState, ENHANCED_CONFIG);
}

function getHouseholdPensionDefaults(household = 'couple') {
  return PENSION_MEANS_TEST_DEFAULTS[household] || PENSION_MEANS_TEST_DEFAULTS.couple;
}

function syncPensionMeansTestFields(force = false) {
  const thresholdInput = document.getElementById('pensionAssetThreshold');
  const cutoffInput = document.getElementById('pensionAssetCutoff');
  if (!thresholdInput || !cutoffInput) return;

  const householdSeg = document.querySelector('[data-bind="household"]');
  const household = householdSeg?.dataset?.value || 'couple';
  const defaults = getHouseholdPensionDefaults(household);

  if (force || thresholdInput.dataset.autoDefault !== 'false') {
    thresholdInput.value = String(defaults.threshold);
    thresholdInput.dataset.autoDefault = 'true';
  }

  if (force || cutoffInput.dataset.autoDefault !== 'false') {
    cutoffInput.value = String(defaults.cutoff);
    cutoffInput.dataset.autoDefault = 'true';
  }
}

function initPensionFieldDefaults() {
  ['pensionAssetThreshold', 'pensionAssetCutoff'].forEach((id) => {
    const field = document.getElementById(id);
    if (!field) return;

    field.dataset.autoDefault = 'true';
    field.addEventListener('input', () => {
      field.dataset.autoDefault = 'false';
    });
  });

  syncPensionMeansTestFields(true);
}

function buildEngineInputs(inp) {
  const isCouple = inp.household === 'couple';
  const desiredIncome = inp.desiredIncome ?? DEFAULTS.pension.asfaComfortable;
  const employerContributionRate = pct(inp.employerRate || DEFAULTS.economic.employerSuperContributionRate || 12, 12);
  const mortgageRate = pct(inp.mortgageRate || DEFAULTS.property.mortgageRate, DEFAULTS.property.mortgageRate);
  const investmentPropertyRate = pct(inp.ipRate || DEFAULTS.property.investmentPropertyRate, DEFAULTS.property.investmentPropertyRate);
  const primaryResidenceType = normalizeResidenceType(inp);
  const isNonHomeowner = isNonHomeownerResidence(primaryResidenceType);
  const ownsPrimaryHome = isHomeownerResidence(primaryResidenceType);
  const hasPrimaryMortgage = isMortgageResidence(primaryResidenceType);
  const pensionAssetThresholdDefault = isCouple
    ? (isNonHomeowner ? ENHANCED_CONFIG.COUPLE_ASSET_THRESHOLD_NON_HOMEOWNER : ENHANCED_CONFIG.COUPLE_ASSET_THRESHOLD)
    : (isNonHomeowner ? ENHANCED_CONFIG.SINGLE_ASSET_THRESHOLD_NON_HOMEOWNER : ENHANCED_CONFIG.SINGLE_ASSET_THRESHOLD);
  const pensionAssetLimitDefault = isCouple
    ? (isNonHomeowner ? ENHANCED_CONFIG.COUPLE_ASSET_LIMIT_NON_HOMEOWNER : ENHANCED_CONFIG.COUPLE_ASSET_LIMIT)
    : (isNonHomeowner ? ENHANCED_CONFIG.SINGLE_ASSET_LIMIT_NON_HOMEOWNER : ENHANCED_CONFIG.SINGLE_ASSET_LIMIT);
  const staleThresholdDefault = isCouple
    ? (isNonHomeowner ? ENHANCED_CONFIG.COUPLE_ASSET_THRESHOLD : ENHANCED_CONFIG.COUPLE_ASSET_THRESHOLD_NON_HOMEOWNER)
    : (isNonHomeowner ? ENHANCED_CONFIG.SINGLE_ASSET_THRESHOLD : ENHANCED_CONFIG.SINGLE_ASSET_THRESHOLD_NON_HOMEOWNER);
  const staleLimitDefault = isCouple
    ? (isNonHomeowner ? ENHANCED_CONFIG.COUPLE_ASSET_LIMIT : ENHANCED_CONFIG.COUPLE_ASSET_LIMIT_NON_HOMEOWNER)
    : (isNonHomeowner ? ENHANCED_CONFIG.SINGLE_ASSET_LIMIT : ENHANCED_CONFIG.SINGLE_ASSET_LIMIT_NON_HOMEOWNER);
  const pensionAssetThreshold = resolveResidenceAwarePensionDefault(
    inp.pensionAssetThreshold,
    pensionAssetThresholdDefault,
    staleThresholdDefault
  );
  const pensionAssetLimit = resolveResidenceAwarePensionDefault(
    inp.pensionAssetCutoff,
    pensionAssetLimitDefault,
    staleLimitDefault
  );
  const agePensionMax = isCouple
    ? (inp.pensionAnnualCouple || ENHANCED_CONFIG.COUPLE_PENSION_MAX)
    : (inp.pensionAnnualSingle || ENHANCED_CONFIG.SINGLE_PENSION_MAX);
  const applyMaxContributionBase = inp.applyMaxContributionBase !== false;
  const maxContributionBasePerQuarter = inp.maxContributionBasePerQuarter || DEFAULT_MAX_CONTRIBUTION_BASE_PER_QUARTER;
  const salarySuper = resolveEmployerSuper({
    employmentIncome: inp.salary,
    incomeMode: inp.salaryIncomeMode || SALARY_INCOME_MODES.EXCLUDING_SUPER,
    sgRate: employerContributionRate,
    maxContributionBasePerQuarter,
    applyMaxContributionBase,
    employerSuperMode: inp.employerSuperMode || EMPLOYER_SUPER_MODES.CALCULATED,
    employerSuperOverrideAmount: inp.employerSuperOverrideAmount,
  });
  const partnerSalarySuper = resolveEmployerSuper({
    employmentIncome: isCouple ? inp.partnerSalary : 0,
    incomeMode: inp.partnerSalaryIncomeMode || inp.salaryIncomeMode || SALARY_INCOME_MODES.EXCLUDING_SUPER,
    sgRate: employerContributionRate,
    maxContributionBasePerQuarter,
    applyMaxContributionBase,
    employerSuperMode: isCouple ? (inp.partnerEmployerSuperMode || EMPLOYER_SUPER_MODES.CALCULATED) : EMPLOYER_SUPER_MODES.CALCULATED,
    employerSuperOverrideAmount: isCouple ? inp.partnerEmployerSuperOverrideAmount : 0,
  });

  return {
    currentAge: inp.age,
    age: inp.age,
    partnerAge: isCouple ? inp.partnerAge : 0,
    retirementAge: inp.retireAge,
    partnerRetirementAge: isCouple ? (inp.partnerRetireAge || DEFAULTS.personal.partnerRetirementAge) : 0,
    yourCurrentAge: inp.age,
    partnerCurrentAge: isCouple ? inp.partnerAge : 0,
    yourLifespan: inp.lifespan,
    // partnerLifespan=0 means "open-ended" (simulate to age 120). Use ?? so 0 is not
    // replaced by the default; only null/undefined fall back to the default.
    partnerLifespan: isCouple ? (inp.partnerLifespan ?? DEFAULTS.personal.partnerLifespan) : 0,
    lifeExpectancy: inp.lifespan,
    yourGender: inp.gender === 'prefer_not_say' ? 'unspecified' : inp.gender,
    partnerGender: isCouple && inp.partnerGender !== 'prefer_not_say' ? inp.partnerGender : 'unspecified',
    hasPartner: isCouple,
    isSingleCalculation: !isCouple,
    isCouple,
    homeowner: ownsPrimaryHome,
    ownsHome: ownsPrimaryHome,
    primaryResidenceType,

    riskTolerance: inp.riskTolerance || DEFAULTS.risk.riskTolerance,
    hasEmergencyFund: EMERGENCY_FUND_MAP[inp.emergencyFund] || DEFAULTS.risk.hasEmergencyFund,
    hasDebt: DEBT_MAP[inp.highInterestDebt] || DEFAULTS.risk.hasDebt,
    dependents: inp.dependents,
    lossReaction: inp.riskReactionDrop || 'monitor',
    investmentExperience: EXPERIENCE_MAP[inp.investmentExperience] ?? 2,
    marketUnderstanding: inp.marketKnowledge || 'moderate',
    volatilityComfort: pct(inp.volatilityComfort || 15, 15),

    annualSalary: salarySuper.cashSalary,
    partnerAnnualSalary: isCouple ? partnerSalarySuper.cashSalary : 0,
    yourSalary: salarySuper.cashSalary,
    partnerSalary: isCouple ? partnerSalarySuper.cashSalary : 0,
    yourEmploymentIncome: inp.salary,
    partnerEmploymentIncome: isCouple ? inp.partnerSalary : 0,
    salaryIncomeMode: inp.salaryIncomeMode || SALARY_INCOME_MODES.EXCLUDING_SUPER,
    partnerSalaryIncomeMode: inp.partnerSalaryIncomeMode || inp.salaryIncomeMode || SALARY_INCOME_MODES.EXCLUDING_SUPER,
    applyMaxContributionBase,
    maxContributionBasePerQuarter,
    calculatedEmployerSG: salarySuper.calculatedEmployerSG,
    employerSG: salarySuper.employerSG,
    employerSuperMode: salarySuper.employerSuperMode,
    employerSuperOverrideAmount: salarySuper.employerSuperOverrideAmount,
    employerSuperOverridden: salarySuper.employerSuperOverridden,
    partnerCalculatedEmployerSG: partnerSalarySuper.calculatedEmployerSG,
    partnerEmployerSG: isCouple ? partnerSalarySuper.employerSG : 0,
    partnerEmployerSuperMode: isCouple ? partnerSalarySuper.employerSuperMode : EMPLOYER_SUPER_MODES.CALCULATED,
    partnerEmployerSuperOverrideAmount: isCouple ? partnerSalarySuper.employerSuperOverrideAmount : 0,
    partnerEmployerSuperOverridden: isCouple ? partnerSalarySuper.employerSuperOverridden : false,
    superBalance: inp.superBal,
    partnerSuperBalance: isCouple ? inp.partnerSuperBal : 0,
    yourCurrentSuper: inp.superBal,
    partnerCurrentSuper: isCouple ? inp.partnerSuperBal : 0,
    savings: inp.cash,
    investments: inp.stocks,
    currentSavings: inp.cash,
    currentStocks: inp.stocks,
    monthlyStockContribution: inp.monthlyStockContrib,
    percentIncomeSaved: (salarySuper.cashSalary + (isCouple ? partnerSalarySuper.cashSalary : 0)) > 0
      ? clamp((inp.monthlyStockContrib * 12) / (salarySuper.cashSalary + (isCouple ? partnerSalarySuper.cashSalary : 0)), 0, 1)
      : 0,
    useDetailedExpenseInputs: Boolean(inp.useDetailedCashflow),
    currentMonthlyHousingCosts: inp.monthlyMortgagePayment || inp.builderMortgage || 0,
    currentMonthlyLivingCosts: inp.currentMonthlyLivingCosts || 0,

    homeValue: ownsPrimaryHome ? inp.homeValue : 0,
    mortgageBalance: hasPrimaryMortgage ? inp.mortgage : 0,
    mortgageRate: hasPrimaryMortgage ? mortgageRate : 0,
    monthlyMortgagePayment: hasPrimaryMortgage ? (inp.monthlyMortgagePayment || deriveMortgagePayment(inp.mortgage, mortgageRate)) : 0,
    mortgageTermLeft: hasPrimaryMortgage ? (inp.mortgage > 0 ? 30 : 0) : 0,
    primaryRentMonthly: isNonHomeowner ? (inp.primaryRentMonthly || 0) : 0,
    primaryRentAnnual: isNonHomeowner ? (inp.primaryRentMonthly || 0) * 12 : 0,
    planToDownsize: inp.downsizePlan === 'yes',
    downsizeAge: inp.downsizeAge,
    downsizeTargetHomeValue: inp.downsizeTargetHomeValue,
    downsizeTransactionCost: inp.downsizeTransactionCost,
    downsizeOngoingFees: inp.downsizeOngoingFees,

    hasInvestmentProperty: inp.investmentProperty,
    investmentPropertyType: inp.ipType || 'unit',
    investmentPropertyValue: inp.ipValue,
    investmentPropertyLoan: inp.ipLoan,
    investmentPropertyRate,
    investmentPropertyPurchasePrice: inp.ipPurchasePrice || inp.ipValue,
    investmentPropertyPurchaseYear: inp.ipPurchaseYear || null,
    investmentPropertyLoanType: inp.ipLoanType || 'pi',
    weeklyRentalIncome: inp.ipWeeklyRent,
    annualPropertyExpenses: inp.ipAnnualExpenses,
    // strataLevy is stored separately from annualPropertyExpenses so the engine
    // can model it as a unit-specific structural cost that inflates independently.
    // For houses ipStrataLevy is 0; the UI auto-fills a default for units/townhouses.
    investmentPropertyStrataLevy: inp.ipType === 'house' ? 0 : (inp.ipStrataLevy || 0),
    propertyGrowthRate: pct(inp.ipGrowthRate || DEFAULTS.property.propertyGrowthRate, DEFAULTS.property.propertyGrowthRate),
    propertyState: inp.ipState || '',
    landTax: deriveLandTax(inp),
    vacancyRate: pct(inp.ipVacancyRate ?? 4, 4),
    sellPropertyYears: inp.sellPropertyYears ?? DEFAULTS.property.sellPropertyYears,
    capitalGainsTaxRate: pct(inp.capitalGainsTaxRate ?? 23.5, 23.5),
    maintenanceInflation: pct(inp.maintenanceInflation ?? 3.5, 3.5),

    hasPrivateHealthCover: inp.hasPrivateHospital,
    ageFirstPrivateCover: inp.ageFirstHadCover || null,
    currentHealthcareCosts: inp.healthcareCost,
    healthcareInflation: pct(inp.healthcareInflation ?? 5.5, 5.5),
    healthCondition: inp.healthCondition || 'good',
    agedCareProbability: pct(inp.agedCareProbability || DEFAULTS.healthcare.agedCareProbability, DEFAULTS.healthcare.agedCareProbability),
    agedCareStartAge: inp.agedCareStartAge,
    agedCareDuration: deriveAgedCareDuration(inp),
    agedCareAnnualCost: inp.agedCareAnnualCost,

    targetRetirementIncome: desiredIncome,
    retirementStandard: 'comfortable',
    asfaComfortable: desiredIncome,
    agePensionAge: inp.agePensionAge || 67,
    agePensionMax,
    pensionAssetThreshold,
    pensionAssetLimit,
    pensionIncomeThreshold: inp.pensionIncomeThreshold || (isCouple ? ENHANCED_CONFIG.COUPLE_INCOME_THRESHOLD : ENHANCED_CONFIG.SINGLE_INCOME_THRESHOLD),

    inflation: pct(inp.inflation || DEFAULTS.economic.inflation, DEFAULTS.economic.inflation),
    investmentReturn: pct(inp.invReturn || DEFAULTS.economic.investmentReturn, DEFAULTS.economic.investmentReturn),
    // UI value is percentage points per year: 0.03 means 0.03%, or 0.0003 decimal.
    returnDeclineRate: (inp.returnDeclineRate ?? 0.03) / 100,
    savingsReturn: pct(inp.savingsReturn || DEFAULTS.economic.savingsReturn, DEFAULTS.economic.savingsReturn),
    superReturn: pct(inp.superGrowth || DEFAULTS.economic.superReturn, DEFAULTS.economic.superReturn),
    employerSuperContributionRate: employerContributionRate,
    superContributionRate: employerContributionRate,
    salaryGrowthRate: pct(inp.salaryGrowthRate ?? 2, 2),
    leanYearsStart: inp.leanYearsStart ?? DEFAULTS.economic.leanYearsStart,
    leanYearsReduction: pct(inp.leanYearsReduction ?? DEFAULTS.economic.leanYearsReduction, DEFAULTS.economic.leanYearsReduction),

    useGlidePath: inp.useGlidePath ?? DEFAULTS.allocation.useGlidePath,
    glidePathRule: inp.glidePathRule || DEFAULTS.allocation.glidePathRule,
    frankingCreditBenefit: DEFAULTS.allocation.frankingCreditBenefit,
    australianEquityAllocation: pct(inp.australianEquityAllocation ?? DEFAULTS.allocation.australianEquityAllocation, DEFAULTS.allocation.australianEquityAllocation),
    dividendYield: pct(inp.dividendYield ?? DEFAULTS.allocation.dividendYield, DEFAULTS.allocation.dividendYield),
    frankingRate: pct(inp.frankingRate ?? DEFAULTS.allocation.frankingRate, DEFAULTS.allocation.frankingRate),
    allocEquities: pct(inp.allocEquities ?? DEFAULTS.allocation.allocEquities, DEFAULTS.allocation.allocEquities),
    allocBonds: pct(inp.allocBonds ?? DEFAULTS.allocation.allocBonds, DEFAULTS.allocation.allocBonds),
    allocCash: pct(inp.allocCash ?? DEFAULTS.allocation.allocCash, DEFAULTS.allocation.allocCash),

    hasTrustAssets: inp.hasTrust,
    trustType: inp.trustType || DEFAULTS.trust.trustType,
    trustControlLevel: inp.trustControlLevel || DEFAULTS.trust.trustControlLevel,
    trustNetAssets: inp.trustNetAssets || 0,
    trustAttributionPercentage: pct(inp.trustAttributionPercentage ?? 100, 100),
    trustAnnualDistributions: inp.trustAnnualDistributions || 0,
    trustTaxRate: pct(inp.trustTaxRate ?? 30, 30),
    familyTrustIncomeDistribution: inp.familyTrustIncomeDistribution || 0,
    beneficiaryAllocation: pct(inp.beneficiaryAllocation ?? 100, 100),
    homeInTrust: inp.homeInTrust || false,
    investmentPropertyInTrust: inp.investmentPropertyInTrust || false,
    stocksInTrust: inp.stocksInTrust || false,

    returnVolatility: pct(inp.returnVolatility || DEFAULTS.simulation.returnVolatility, DEFAULTS.simulation.returnVolatility),
    enableShocks: inp.enableShocks,
    shockProbability: pct(inp.shockProbability ?? DEFAULTS.simulation.shockProbability, DEFAULTS.simulation.shockProbability),
    shockMagnitude: pct(inp.shockMagnitude ?? DEFAULTS.simulation.shockMagnitude, DEFAULTS.simulation.shockMagnitude),
    numRuns: inp.mcRuns || DEFAULTS.simulation.numRuns,
    useLongevityDistribution: inp.sampleLifespan,
    scenarioMode: inp.scenarioMode || 'baseline',
    globalRiskFactor: inp.globalRiskFactor ?? 0,
    extremeInflationProbability: pct(inp.extremeInflationProbability ?? 0, 0),
    propertyCrashProbability: pct(inp.propertyCrashProbability ?? 0, 0),

    ageCameToAustralia: inp.ageCameToAU,
    ageStartedEarningAustralia: inp.ageStartedEarningAU,
    partnerAgeCameToAustralia: isCouple ? inp.partnerAgeCameToAU : 0,
    partnerAgeStartedEarningAustralia: isCouple ? inp.partnerAgeStartedEarningAU : 0,

    enableReducedIncome: inp.reducedIncomeEnabled,
    reducedIncomeAge: inp.reducedIncomeEnabled ? inp.reducedIncomeAge : 0,
    reducedIncomeSalary: inp.reducedIncomeEnabled ? inp.reducedIncomeSalary : 0,
    partnerReducedIncomeAge: isCouple && inp.reducedIncomeEnabled ? inp.partnerReducedIncomeAge : 0,
    partnerReducedIncomeSalary: isCouple && inp.reducedIncomeEnabled ? inp.partnerReducedIncomeSalary : 0,

    businessIncome: inp.businessIncome,
    investmentIncome: inp.investmentIncomeOutsideSuper,
    // Family obligations: any non-zero expense must reach the simulator regardless of isCarer flag.
    // The simulator gates expenses on isCarerForParents && carerYearsExpected > 0 && year <= carerYearsExpected.
    // When isCarer=false but obligations exist: set isCarerForParents=true, carerYearsExpected=999 (indefinite),
    // carerReducedWorkPercent=0 so there is no work-reduction side-effect.
    // When isCarer=true: work reduction and carer expenses apply for carerYearsExpected years.
    // NOTE: time-bounded legal obligations (spousalMaintenanceEndsAge, youngestChildAge) are not yet
    // enforced per-year — they run for the full carerYearsExpected window. This is a known limitation.
    ...(() => {
      const parentCareExpense = inp.isCarer
        ? (inp.carerAnnualExpense ?? inp.annualParentSupport ?? 0)
        : (inp.annualParentSupport || 0);
      const spousalExpense = inp.hasSpousalMaintenance ? (inp.annualSpousalMaintenance || 0) : 0;
      const childSupportExpense = inp.hasChildSupport ? (inp.annualChildSupport || 0) : 0;
      const totalFamilyExpense = parentCareExpense + spousalExpense + childSupportExpense;
      const hasFamilyObligations = totalFamilyExpense > 0;
      return {
        isCarerForParents: !!(inp.isCarer || hasFamilyObligations),
        carerReducedWorkPercent: inp.isCarer ? pct(inp.carerReducedWorkPercent) : 0,
        carerYearsExpected: inp.isCarer ? (inp.carerYearsExpected || 0) : (hasFamilyObligations ? 999 : 0),
        carerAnnualExpense: totalFamilyExpense,
      };
    })(),
    agedParentsLocation: inp.agedParentsLocation || 'australia',
    privateSchool: inp.privateSchool,
    universitySupport: inp.uniSupport,
    educationCostPerChild: inp.educationCostPerChild,
    salaryGrowthType: inp.salaryGrowthType,
    yourAdditionalSuperContribution: inp.salarySacrifice,
    partnerAdditionalSuperContribution: isCouple ? inp.partnerSalarySacrifice : 0,
    yourAnnualNCC: inp.ncc,
    partnerAnnualNCC: isCouple ? inp.partnerNCC : 0,
    concessionalCapUsed: inp.concessionalUsedThisYear,
    spouseContribution: isCouple ? inp.spouseContribution : 0,
    downsizeContribution: inp.useDownsizer,
    hasSMSF: inp.hasSmsf,
    smsfAdminCosts: inp.smsfAdminCosts ?? 3500,
    smsfInvestmentStrategy: inp.smsfInvestmentStrategy || 'balanced',
    annualTravelBudget: 0,
    annualHobbyBudget: 0,
    legacyGoal: inp.legacyGoal || 0,
    legacyGoalType: inp.legacyGoalType || 'none',
    futurePropertyScenario: inp.futurePropertyScenario || { enabled: false, includeInBasePlan: false, scenarioOnly: true },
    inheritanceScenario: inp.inheritanceScenario || { enabled: false, includeInBasePlan: false, scenarioOnly: true },
    enableProposedBudget2026: inp.budget2627,

    homeModificationsCost: inp.homeModBudget,
    homeModificationsAge: inp.homeModAge,

    goingOverseas: inp.goingOverseas,
    overseasStartAge: inp.goingOverseas ? (inp.ageMovingOverseas || 0) : 0,
    overseasAnnualBudget: inp.goingOverseas ? (inp.annualLivingCostOverseas || 0) : 0,
    overseasReturnFrequency: inp.returnFrequency || 'never',
    overseasMoveType: inp.overseasMoveType || 'permanent',
    overseasTaxResidency: inp.overseasTaxResidency || 'australian',
    overseasHealthCover: inp.overseasHealthCover || 'international_private',
    maintainResidency: Boolean(inp.maintainResidency),
    overseasPropertyStrategy: inp.propertyStrategy || 'keep-personal',
    overseasTrustBeneficiaries: inp.trustBeneficiaries || 'you-only',
    overseasSuperAccessStrategy: inp.superAccess || 'pension-mode',
    overseasAgreementCountry: Boolean(inp.overseasAgreementCountry),
    overseasFallbackAge: inp.overseasFallbackAge || 0,
    overseasFallbackTrigger: inp.overseasFallbackTrigger || 'none',
    overseasSpendingCurrency: inp.overseasSpendingCurrency || 'AUD',
    overseasAudFxChange: normalizeFxChangeRate(inp.overseasAudFxChange, inp.destination, -1),
    overseasHousingType: inp.overseasHousingType || 'rent',
    overseasAnnualRent: inp.overseasAnnualRent || 0,
    overseasDestination: inp.destination || '',

    creditCardBalance: inp.ccBalance,
    creditCardRate: pct(inp.ccRate || 20, 20),
    personalLoanBalance: inp.personalLoan,
    personalLoanRate: pct(inp.personalLoanRate || 9, 9),
    carLoanBalance: inp.carLoan,
    carLoanRate: pct(inp.carLoanRate || 8, 8),
    hecsBalance: inp.hecsBalance,

    // Ensure expanded canonical debt names are also present for engine/save parity
    ccBalance: inp.ccBalance,
    ccRate: pct(inp.ccRate || 20, 20),
    personalLoan: inp.personalLoan,
    carLoan: inp.carLoan,

    // Age-related optional costs
    enableHomeModifications: Boolean(inp.enableHomeModifications),
    homeModificationCost: inp.homeModificationCost || 0,
    homeModificationAge: inp.homeModificationAge || 78,
    homeModificationRecurring: inp.homeModificationRecurring || 0,
    enableAnnuity: Boolean(inp.enableAnnuity),
    annuityPurchaseAge: inp.annuityPurchaseAge || 67,
    annuityLumpSum: inp.annuityLumpSum || 0,
    annuityAnnualIncome: inp.annuityAnnualIncome || 0,
    enableTieredSpending: Boolean(inp.enableTieredSpending || inp.spendingStrategy === 'go_go_slow_go_no_go'),
    tieredSpendingActiveAge: inp.tieredSpendingActiveAge || 75,
    tieredSpendingFrailAge: inp.tieredSpendingFrailAge || 85,
    tieredSpendingActiveMultiplier: pct(inp.tieredSpendingActiveMultiplier || 110, 110),
    tieredSpendingStableMultiplier: pct(inp.tieredSpendingStableMultiplier || 90, 90),
    tieredSpendingFrailMultiplier: pct(inp.tieredSpendingFrailMultiplier || 115, 115),
  };
}

function deriveWithdrawSource(superBal, nonSuperBal) {
  const s = superBal ?? 0;
  const n = nonSuperBal ?? 0;
  if (s <= 0 && n <= 0) return 'depleted';
  if (s <= 0) return 'savings';
  if (n <= 0) return 'super';
  const superFraction = s / (s + n);
  if (superFraction > 0.85) return 'super';
  if (superFraction < 0.15) return 'savings';
  return 'mixed';
}

function buildProjectionYears(inp, simulation) {
  const accumulationHistory = Array.isArray(simulation.accumulationHistory)
    ? simulation.accumulationHistory
    : [];
  // Retirement rows come from the simulator's authoritative yearly output. The
  // super/non-super columns are optional display fields added for the redesigned
  // table; when they are unavailable, the renderer falls back to total assets.
  const retirementYears = (simulation.yearlyData || []).map((year) => ({
    year: year.year,
    age: year.age,
    superBalance: Number.isFinite(year.endSuperBalance) ? year.endSuperBalance : null,
    nonSuperLiquidAssets: Number.isFinite(year.endNonSuperBalance) ? year.endNonSuperBalance : null,
    liquidAssets: year.endBalance ?? year.liquidAssets ?? 0,
    nonLiquidAssets: year.nonLiquidAssets ?? 0,
    totalAssets: (year.endBalance ?? 0) + (year.nonLiquidAssets ?? 0),
    retired: true,
    withdraw: Math.max(0, year.withdrawal || year.superIncome || 0),
    pension: Math.max(0, year.pensionIncome || 0),
    otherIncome: year.otherIncome || 0,
    withdrawSource: deriveWithdrawSource(year.endSuperBalance, year.endNonSuperBalance),
    overseasYear: year.overseasYear ?? false,
    travelCost: year.travelCost ?? 0,
    // Annual planned living expenses (healthcare + aged care + base spending).
    // Deflated to today's dollars in paintYearTable for the expenses column.
    plannedSpending: year.totalPlannedSpending ?? year.coreSpending ?? 0,
  }));

  if (accumulationHistory.length) {
    const bridgeYears = accumulationHistory
      .filter((year) => year.age < inp.retireAge)
      .map((year) => ({
        year: year.year,
        age: year.age,
        superBalance: year.superBalance ?? null,
        nonSuperLiquidAssets: year.nonSuperLiquidAssets ?? null,
        liquidAssets: year.liquidAssets ?? 0,
        nonLiquidAssets: year.nonLiquidAssets ?? 0,
        totalAssets: year.totalAssets ?? ((year.liquidAssets || 0) + (year.nonLiquidAssets || 0)),
        retired: false,
        withdraw: 0,
        pension: 0,
        otherIncome: 0,
        withdrawSource: 'accumulating',
        overseasYear: false,
        travelCost: 0,
      }));
    return [...bridgeYears, ...retirementYears];
  }

  const fallbackRetirementYears = simulation.yearlyData.map((year) => ({
    age: year.age,
    totalAssets: Math.max(0, (year.endBalance || 0) + (year.nonLiquidAssets || 0)),
    retired: true,
    withdraw: Math.max(0, year.withdrawal || year.superIncome || 0),
    pension: Math.max(0, year.pensionIncome || 0),
  }));

  if (!fallbackRetirementYears.length) return [];

  const currentAssets = Math.max(
    0,
    inp.superBal +
    (inp.household === 'couple' ? inp.partnerSuperBal : 0) +
    inp.cash +
    inp.stocks
  );
  const firstRetirementAssets = fallbackRetirementYears[0].totalAssets || currentAssets;
  const yearsToRetire = Math.max(0, inp.retireAge - inp.age);
  const growthRate = currentAssets > 0 && firstRetirementAssets > 0 && yearsToRetire > 0
    ? Math.pow(firstRetirementAssets / currentAssets, 1 / yearsToRetire) - 1
    : 0;

  const bridgeYears = Array.from({ length: yearsToRetire }, (_, index) => {
    const age = inp.age + index;
    const projectedAssets = currentAssets > 0
      ? currentAssets * Math.pow(1 + growthRate, index)
      : firstRetirementAssets * ((index + 1) / Math.max(1, yearsToRetire + 1));

    return {
      age,
      totalAssets: Math.max(0, projectedAssets),
      retired: false,
      withdraw: 0,
      pension: 0,
    };
  });

  return [...bridgeYears, ...fallbackRetirementYears];
}

function adaptEngineOutput(inp, engineInputs, simulation) {
  const firstRetirementYear = simulation.yearlyData[0];
  if (!firstRetirementYear) {
    throw new Error('Simulation did not produce retirement-year data.');
  }

  const yearsToRetire = Math.max(0, engineInputs.retirementAge - engineInputs.yourCurrentAge);
  const inflationRate = engineInputs.inflation || 0.026;
  
  const superIncomeToday = deflateToToday(firstRetirementYear.superIncome || firstRetirementYear.withdrawal || 0, yearsToRetire, inflationRate);
  const pensionIncomeToday = deflateToToday(firstRetirementYear.pensionIncome || 0, yearsToRetire, inflationRate);
  const otherIncomeToday = deflateToToday(firstRetirementYear.otherIncome || 0, yearsToRetire, inflationRate);
  
  const annualIncomeToday = superIncomeToday + pensionIncomeToday + otherIncomeToday;
  const monthlyPaycheck = annualIncomeToday / 12;

  // Safe Withdrawal Rate (SWR) proxy for educational reference
  const totalAssetsNominal = firstRetirementYear.startBalance || 0;
  const swrAnnualNominal = totalAssetsNominal * 0.04 + (firstRetirementYear.pensionIncome || 0);
  const swrMonthlyToday = deflateToToday(swrAnnualNominal, yearsToRetire, inflationRate) / 12;

  // Planned spending in Year 1 (headline metric)
  const plannedSpendingToday = deflateToToday(firstRetirementYear.plannedSpending || firstRetirementYear.totalPlannedSpending || 0, yearsToRetire, inflationRate);

  const targetMonthly = Math.max(1, inp.desiredIncome / 12);
  const effectivePlanAge = inp.lifespan > 0 ? inp.lifespan : 120;
  const lastsUntil = Math.min(simulation.depletionAge || effectivePlanAge, effectivePlanAge);
  
  // Use planned spending for coverage score
  const coverageScore = (plannedSpendingToday / 12) / targetMonthly;
  const longevityScore = lastsUntil >= effectivePlanAge
    ? 1
    : clamp((lastsUntil - inp.retireAge) / Math.max(1, effectivePlanAge - inp.retireAge), 0, 1);

  // Surplus: when mandatory minimum super drawdown exceeds target spending, the excess
  // is reinvested (see simulator.js surplus reinvestment logic).  Expose it here so the
  // UI can show users where their surplus is allocated (40% savings, 30% investment,
  // 30% liquid emergency fund).
  const surplusAnnualToday = deflateToToday(firstRetirementYear.surplusWithdrawal || 0, yearsToRetire, inflationRate);
  const surplusMonthly = surplusAnnualToday / 12;
  const surplusAllocation = firstRetirementYear.surplusAllocation || null;

  const plannedSpendingNominal = firstRetirementYear.plannedSpending || firstRetirementYear.totalPlannedSpending || 0;

  return {
    monthlyPaycheck,
    annualIncome: annualIncomeToday || plannedSpendingToday,
    plannedSpendingToday,
    plannedSpendingNominal: firstRetirementYear.totalPlannedSpending || firstRetirementYear.plannedSpending || 0,
    swrMonthlyToday,
    superAtRetire: deflateToToday(firstRetirementYear.startBalance || 0, yearsToRetire, inflationRate),
    superAtRetireNominal: firstRetirementYear.startBalance || 0,
    breakdown: {
      super: deflateToToday(firstRetirementYear.fundingBreakdown?.draw || 0, yearsToRetire, inflationRate),
      pension: deflateToToday(firstRetirementYear.fundingBreakdown?.pension || 0, yearsToRetire, inflationRate),
      other: deflateToToday(firstRetirementYear.fundingBreakdown?.other || 0, yearsToRetire, inflationRate),
      tax: deflateToToday(firstRetirementYear.fundingBreakdown?.tax || 0, yearsToRetire, inflationRate),
    },
    breakdownNominal: {
      super: firstRetirementYear.fundingBreakdown?.draw || 0,
      pension: firstRetirementYear.fundingBreakdown?.pension || 0,
      other: firstRetirementYear.fundingBreakdown?.other || 0,
      tax: firstRetirementYear.fundingBreakdown?.tax || 0,
    },
    confidence: clamp((coverageScore * 0.7) + (longevityScore * 0.3), 0, 0.98),
    gapMonthly: Math.max(0, targetMonthly - (plannedSpendingToday / 12)),
    lastsUntil,
    isCouple: engineInputs.isCouple,
    years: buildProjectionYears(inp, simulation),
    surplusMonthly,
    surplusAllocation,
  };
}

// ============================================================
// 1. ACCORDION — single-open behaviour
// ============================================================
function setSectionOpenState(section, isOpen) {
  if (!section) return;
  section.classList.toggle('open', isOpen);

  const head = section.querySelector('.section-head');
  const body = section.querySelector('.section-body');

  if (head) {
    head.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  }

  if (body) {
    body.hidden = !isOpen;
    body.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
  }
}

function initAccordion() {
  document.querySelectorAll('.section').forEach((section) => {
    setSectionOpenState(section, section.classList.contains('open'));
  });

  document.querySelectorAll('.section-head').forEach((head) => {
    head.addEventListener('click', () => {
      const section = head.closest('.section');
      const wasOpen = section.classList.contains('open');
      document.querySelectorAll('.section').forEach((s) => setSectionOpenState(s, false));
      if (!wasOpen) setSectionOpenState(section, true);
    });
  });
}

// ============================================================
// 2. SEGMENTED CONTROLS — pseudo-radio buttons
// ============================================================
function initSegmented() {
  document.querySelectorAll('.segmented').forEach((seg) => {
    const bindKey = seg.dataset.bind;
    const target = seg.dataset.target;       // optional: set a numeric input
    // Initialise dataset.value from whichever button has class="on" so that
    // applyHouseholdVisibility() works correctly on first load (before any click).
    const initialOn = seg.querySelector('button.on');
    if (initialOn && !seg.dataset.value) {
      seg.dataset.value = initialOn.dataset.value;
    }
    seg.querySelectorAll('button').forEach((b) => {
      b.addEventListener('click', () => {
        seg.querySelectorAll('button').forEach((x) => x.classList.remove('on'));
        b.classList.add('on');
        // Store value as data attr on the segmented container for readInputs()
        seg.dataset.value = b.dataset.value;
        // If this preset is mapped to a number field, update it
        if (target) {
          const inp = document.getElementById(target);
          if (inp) {
            inp.value = b.dataset.value;
            inp.dispatchEvent(new Event('input'));
          }
        }
        // Special: household toggle controls partner-field visibility
        if (bindKey === 'household') {
          applyHouseholdVisibility();
          syncPensionMeansTestFields();
        }
        recalc();
      });
    });
  });
}

function applyHouseholdVisibility() {
  const seg = document.querySelector('[data-bind="household"]');
  const value = seg && seg.dataset.value ? seg.dataset.value : 'couple';
  document.querySelectorAll('[data-household]').forEach((el) => {
    el.hidden = el.dataset.household !== value;
  });
  document.querySelectorAll('[data-visible-when]').forEach((el) => {
    el.hidden = el.dataset.visibleWhen !== value;
  });

  // A.5: Adjust healthcare cost default for single vs couple
  const hcField = document.getElementById('healthcareCost');
  if (hcField && hcField.dataset.autoDefault !== 'false' && !hcField.dataset.userEdited) {
    hcField.value = value === 'single' ? 2200 : 4800;
    hcField.dataset.autoDefault = 'true';
  }

  // A.3: Update lifestyle preset ASFA values for single vs couple
  const presetSeg = document.querySelector('[data-bind="lifestylePreset"]');
  if (presetSeg) {
    const isSingle = value === 'single';
    const presetMap = {
      // ASFA Dec 2025 quarter: single comfortable $52,085 / couple comfortable $73,337
      Modest:      isSingle ? 32915  : 47383,
      Comfortable: isSingle ? 52085  : 73337,
      Premium:     isSingle ? 78000  : 110000,
    };
    presetSeg.querySelectorAll('button').forEach((b) => {
      const label = b.textContent.trim();
      if (presetMap[label] !== undefined) {
        b.dataset.value = String(presetMap[label]);
        if (b.classList.contains('on')) {
          const target = presetSeg.dataset.target;
          if (target) {
            const inp = document.getElementById(target);
            if (inp) inp.value = b.dataset.value;
          }
        }
      }
    });
    // Update the help text
    const helpEl = presetSeg.closest('.field')?.querySelector('.field-help');
    if (helpEl) {
      helpEl.textContent = isSingle
        ? 'ASFA Dec 2025 quarter. Single: Modest $32,915 · Comfortable $52,085. Premium ($78k) is a planning estimate.'
        : 'ASFA Dec 2025 quarter. Couple: Modest $47,383 · Comfortable $73,337. Premium ($110k) is a planning estimate.';
    }
  }

  // Update desired income field help text
  const desiredIncomeHelp = document.querySelector('#desiredIncome + .field-help, label[for="desiredIncome"] ~ .field-help');
  // also check via closest .field
  const desiredIncomeField = document.getElementById('desiredIncome');
  if (desiredIncomeField) {
    const fieldHelp = desiredIncomeField.closest('.field')?.querySelector('.field-help');
    if (fieldHelp) {
      fieldHelp.innerHTML = value === 'single'
        ? 'ASFA Dec 2025 quarter. <b>Single:</b> Modest $32,915 · Comfortable $52,085. Use presets above or enter your own target.'
        : 'ASFA Dec 2025 quarter. <b>Couple:</b> Modest $47,383 · Comfortable $73,337. Use presets above or enter your own target.';
    }
  }

  document.dispatchEvent(new CustomEvent('adv2:household-changed', { detail: { household: value } }));
}

// ============================================================
// 3. ADVANCED FIELDS — show / hide
// ============================================================
const TIER_ORDER = { basic: 0, standard: 1, advanced: 2 };
let activeTier = 'basic';

function tierAllows(floor = 'basic') {
  return TIER_ORDER[activeTier] >= (TIER_ORDER[floor] ?? TIER_ORDER.basic);
}

function applyAdvancedVisibility() {
  document.documentElement.dataset.retirementTier = activeTier;
  document.querySelectorAll('[data-tier-section]').forEach((el) => {
    el.hidden = !tierAllows(el.dataset.tierSection || 'basic');
  });
  document.querySelectorAll('[data-advanced="true"]').forEach((el) => {
    el.hidden = activeTier !== 'advanced';
  });
  const btn = document.getElementById('btn-advanced');
  if (btn) {
    btn.textContent = activeTier === 'advanced' ? 'Advanced tier on' : 'Switch to Advanced';
    btn.style.background = activeTier === 'advanced' ? 'var(--accent-soft)' : '';
    btn.style.color = activeTier === 'advanced' ? 'var(--accent-ink)' : '';
    btn.style.borderColor = activeTier === 'advanced' ? 'var(--accent)' : '';
  }
  document.querySelectorAll('[data-tier-button]').forEach((tierButton) => {
    const isActive = tierButton.dataset.tierButton === activeTier;
    tierButton.classList.toggle('on', isActive);
    tierButton.setAttribute('aria-pressed', String(isActive));
  });
  const progress = document.getElementById('tier-progress');
  if (progress) {
    const hiddenCount = Array.from(document.querySelectorAll('[data-tier-section]'))
      .filter((section) => !tierAllows(section.dataset.tierSection || 'basic')).length;
    progress.textContent = activeTier === 'basic'
      ? `${hiddenCount} deeper planning groups are pre-filled and retained.`
      : activeTier === 'standard'
        ? `${hiddenCount} advanced-only groups are pre-filled and retained.`
        : 'Every V3 planning group is visible.';
  }
  renumberSections();
}
function renumberSections() {
  let n = 0;
  document.querySelectorAll('.section').forEach((s) => {
    if (s.hidden || !tierAllows(s.dataset.tierSection || 'basic')) {
      s.style.display = 'none';
      return;
    }
    s.style.display = '';
    n += 1;
    const num = s.querySelector('.section-num');
    if (num) num.textContent = String(n);
  });
}

// ============================================================
// 4. CONDITIONAL FIELDS (investment property, overseas, ...)
// ============================================================
function bindConditional(toggleId, containerAttr) {
  const tg = document.getElementById(toggleId);
  if (!tg) return;
  const apply = () => {
    document.querySelectorAll(`[${containerAttr}]`).forEach((el) => {
      el.hidden = !tg.checked;
    });
  };
  tg.addEventListener('change', () => { apply(); recalc(); });
  apply();
}

function updateSmsfLowBalanceWarning() {
  const warning = document.getElementById('smsfLowBalanceWarning');
  if (!warning) return;
  const hasSmsf = document.getElementById('hasSmsf');
  const superBal = document.getElementById('superBal');
  const balance = superBal ? (parseFloat(superBal.value) || 0) : 0;
  warning.hidden = !(hasSmsf?.checked && balance < 300000);
}

// ============================================================
// 5. READ INPUTS
// ============================================================
function num(id, fallback = 0) {
  const el = document.getElementById(id);
  if (!el) return fallback;
  const v = parseFloat(el.value);
  return isNaN(v) ? fallback : v;
}
function val(id, fallback = '') {
  const el = document.getElementById(id);
  return el ? el.value : fallback;
}
function chk(id) {
  const el = document.getElementById(id);
  return !!(el && el.checked);
}

function readInputs() {
  const householdSeg = document.querySelector('[data-bind="household"]');
  const household = householdSeg ? (householdSeg.dataset.value || 'couple') : 'couple';

  return {
    // Personal
    household,
    age: num('age', 49),
    retireAge: num('retireAge', 65),
    // lifespan=0 means open-ended (simulate to age 120). Any non-zero value must exceed
    // the user's current age; clamp silently here so a stale/invalid value never
    // produces a negative simulation window (the field validator handles the user warning).
    lifespan: (() => {
      const v = num('lifespan', 90);
      const age = num('age', 49);
      if (v === 0) return 0;
      return v > age ? v : 0; // fall back to open-ended rather than crash
    })(),
    gender: val('gender', 'prefer_not_say'),
    salaryGrowthType: val('salaryGrowthType', 'standard'),
    ageCameToAU: num('ageCameToAU'),
    ageStartedEarningAU: num('ageStartedEarningAU'),
    partnerAge: num('partnerAge'),
    partnerRetireAge: num('partnerRetireAge'),
    partnerLifespan: (() => {
      const v = num('partnerLifespan', 0);
      const pAge = num('partnerAge', 0);
      if (v === 0) return 0;
      return (pAge > 0 && v <= pAge) ? 0 : v;
    })(),
    partnerGender: val('partnerGender', 'prefer_not_say'),
    partnerAgeCameToAU: num('partnerAgeCameToAU'),
    partnerAgeStartedEarningAU: num('partnerAgeStartedEarningAU'),

    // Risk
    riskTolerance: num('riskTolerance', 6),
    riskReactionDrop: val('riskReactionDrop'),
    investmentExperience: val('investmentExperience'),
    marketKnowledge: val('marketKnowledge'),
    volatilityComfort: val('volatilityComfort'),
    emergencyFund: val('emergencyFund'),
    highInterestDebt: val('highInterestDebt'),

    // Income & savings
    salary: num('salary'),
    salaryIncomeMode: val('salaryIncomeMode', SALARY_INCOME_MODES.EXCLUDING_SUPER),
    partnerSalary: num('partnerSalary'),
    partnerSalaryIncomeMode: val('partnerSalaryIncomeMode', val('salaryIncomeMode', SALARY_INCOME_MODES.EXCLUDING_SUPER)),
    superBal: num('superBal'),
    partnerSuperBal: num('partnerSuperBal'),
    cash: num('cash'),
    stocks: num('stocks'),
    monthlyStockContrib: num('monthlyStockContrib'),
    useDetailedCashflow: chk('useDetailedCashflow'),
    currentMonthlyIncome: num('currentMonthlyIncome'),
    currentMonthlyLivingCosts: num('currentMonthlyLivingCosts'),
    surplusAllocationMode: val('surplusAllocationMode', 'cash'),
    salarySacrifice: num('salarySacrifice'),
    partnerSalarySacrifice: num('partnerSalarySacrifice'),
    employerRate: num('employerRate', 12),
    employerSuperMode: chk('employerSuperOverrideEnabled') ? EMPLOYER_SUPER_MODES.MANUAL_OVERRIDE : EMPLOYER_SUPER_MODES.CALCULATED,
    employerSuperOverrideAmount: num('employerSuperOverrideAmount'),
    partnerEmployerSuperMode: chk('partnerEmployerSuperOverrideEnabled') ? EMPLOYER_SUPER_MODES.MANUAL_OVERRIDE : EMPLOYER_SUPER_MODES.CALCULATED,
    partnerEmployerSuperOverrideAmount: num('partnerEmployerSuperOverrideAmount'),
    applyMaxContributionBase: chk('applyMaxContributionBase'),
    maxContributionBasePerQuarter: num('maxContributionBasePerQuarter', DEFAULT_MAX_CONTRIBUTION_BASE_PER_QUARTER),
    ncc: num('ncc'),
    partnerNCC: num('partnerNCC'),
    concessionalUsedThisYear: num('concessionalUsedThisYear'),
    spouseContribution: num('spouseContribution'),
    useDownsizer: chk('useDownsizer'),
    useFHSS: chk('useFHSS'),
    reducedIncomeEnabled: chk('reducedIncomeEnabled'),
    reducedIncomeAge: num('reducedIncomeAge'),
    reducedIncomeSalary: num('reducedIncomeSalary'),
    partnerReducedIncomeAge: num('partnerReducedIncomeAge'),
    partnerReducedIncomeSalary: num('partnerReducedIncomeSalary'),
    businessIncome: num('businessIncome'),
    investmentIncomeOutsideSuper: num('investmentIncomeOutsideSuper'),
    dividendYield: num('dividendYield', DEFAULTS.allocation.dividendYield),
    frankingRate: num('frankingRate', DEFAULTS.allocation.frankingRate),
    australianEquityAllocation: num('australianEquityAllocation', DEFAULTS.allocation.australianEquityAllocation),

    // Family
    dependents: num('dependents'),
    educationCostPerChild: num('educationCostPerChild'),
    privateSchool: chk('privateSchool'),
    uniSupport: chk('uniSupport'),
    isCarer: chk('isCarer'),
    annualParentSupport: num('annualParentSupport'),
    carerReducedWorkPercent: num('carerReducedWorkPercent'),
    carerYearsExpected: num('carerYearsExpected'),
    agedParentsLocation: val('agedParentsLocation', 'australia'),
    carerAnnualExpense: num('carerAnnualExpense'),

    // Property & debt
    primaryResidenceType: val('primaryResidenceType', 'own_mortgage'),
    primaryRentMonthly: num('primaryRentMonthly', 0),
    homeValue: num('homeValue'),
    mortgage: num('mortgage'),
    mortgageRate: num('mortgageRate'),
    monthlyMortgagePayment: num('monthlyMortgagePayment'),
    downsizePlan: (document.querySelector('[data-bind="downsizePlan"]') || {}).dataset?.value || 'no',
    downsizeAge: num('downsizeAge', 75),
    downsizeTargetHomeValue: num('downsizeTargetHomeValue', 800000),
    downsizeTransactionCost: num('downsizeTransactionCost', 6.6),
    downsizeOngoingFees: num('downsizeOngoingFees', 12000),
    ccBalance: num('ccBalance'),
    ccRate: num('ccRate'),
    personalLoan: num('personalLoan'),
    personalLoanRate: num('personalLoanRate', 9),
    carLoan: num('carLoan'),
    carLoanRate: num('carLoanRate', 8),
    hecsBalance: num('hecsBalance'),
    investmentProperty: chk('investmentProperty'),
    ipType: val('ipType', 'unit'),
    ipStrataLevy: num('ipStrataLevy', 0),
    ipValue: num('ipValue'),
    ipLoan: num('ipLoan'),
    ipRate: num('ipRate', DEFAULTS.property.investmentPropertyRate),
    ipPurchasePrice: num('ipPurchasePrice'),
    ipPurchaseYear: num('ipPurchaseYear', null),
    ipLoanType: val('ipLoanType', 'pi'),
    capitalGainsTaxRate: num('capitalGainsTaxRate', 23.5),
    sellPropertyYears: num('sellPropertyYears', DEFAULTS.property.sellPropertyYears),
    maintenanceInflation: num('maintenanceInflation', 3.5),
    ipWeeklyRent: num('ipWeeklyRent'),
    ipAnnualExpenses: num('ipAnnualExpenses'),
    landTax: num('landTax'),
    ipGrowthRate: num('ipGrowthRate'),
    ipState: val('ipState'),
    ipVacancyRate: num('ipVacancyRate', 4),

    // SMSF & Trust
    hasSmsf: chk('hasSmsf'),
    smsfAdminCosts: num('smsfAdminCosts', 3500),
    smsfInvestmentStrategy: val('smsfInvestmentStrategy', 'balanced'),
    hasTrust: chk('hasTrust'),
    trustType: val('trustType', 'discretionary'),
    trustControlLevel: val('trustControlLevel', 'high'),
    trustNetAssets: num('trustNetAssets'),
    trustAttributionPercentage: num('trustAttributionPercentage', 100),
    trustAnnualDistributions: num('trustAnnualDistributions'),
    homeInTrust: chk('homeInTrust'),
    investmentPropertyInTrust: chk('investmentPropertyInTrust'),
    stocksInTrust: chk('stocksInTrust'),
    trustTaxRate: num('trustTaxRate', 30),
    familyTrustIncomeDistribution: num('familyTrustIncomeDistribution'),
    beneficiaryAllocation: num('beneficiaryAllocation', 100),

    // Goal
    desiredIncome: num('desiredIncome', 73000),
    desiredIncomeMode: (document.querySelector('[data-bind="desiredIncomeMode"]') || {}).dataset?.value || 'manual',
    richTarget: val('richTarget', '1.0'),
    richTargetCustom: num('richTargetCustom', 0),
    builderCurrentIncome: num('builderCurrentIncome', 8500),
    builderMortgage: num('builderMortgage', 3200),
    builderChildren: num('builderChildren', 1200),
    builderBuffer: num('builderBuffer', 10),
    legacyGoal: num('legacyGoal', 0),
    legacyGoalType: val('legacyGoalType', 'none'),
    futurePropertyScenario: {
      enabled: chk('futurePropertyEnabled'),
      includeInBasePlan: chk('futurePropertyIncludeInBase'),
      eventType: val('futurePropertyEventType', 'buy_primary_home'),
      age: num('futurePropertyAge', 0),
      propertyValue: num('futurePropertyValue', 0),
      mortgage: num('futurePropertyMortgage', 0),
      ownershipShare: num('futurePropertyOwnershipShare', 100) / 100,
      roleAfterEvent: val('futurePropertyRole', 'primary_residence'),
      scenarioOnly: !chk('futurePropertyIncludeInBase'),
    },
    inheritanceScenario: {
      enabled: chk('inheritanceScenarioEnabled'),
      includeInBasePlan: chk('inheritanceIncludeInBase'),
      age: num('inheritanceScenarioAge', 0),
      certainty: val('inheritanceConfidence', val('inheritanceCertainty', 'speculative')),
      type: val('inheritanceType', 'cash'),
      grossValue: num('inheritanceGrossValue', 0),
      estimatedCosts: num('inheritanceEstimatedCosts', 0),
      use: val('inheritanceUse', 'invest'),
      scenarioOnly: !chk('inheritanceIncludeInBase'),
    },

    // Healthcare
    hasPrivateHospital: chk('hasPrivateHospital'),
    healthCondition: val('healthCondition'),
    healthcareCost: num('healthcareCost'),
    healthcareInflation: num('healthcareInflation', 5.5),
    ageFirstHadCover: num('ageFirstHadCover'),
    homeModAge: num('homeModAge', 75),
    homeModBudget: num('homeModBudget', 20000),
    agedCareProbability: num('agedCareProbability'),
    agedCareStartAge: num('agedCareStartAge'),
    agedCareAnnualCost: num('agedCareAnnualCost'),

    // Age-related optional costs (Section 13)
    enableHomeModifications: chk('enableHomeModifications'),
    homeModificationCost: num('homeModificationCost', 25000),
    homeModificationAge: num('homeModificationAge', 78),
    homeModificationRecurring: num('homeModificationRecurring', 2000),
    enableAnnuity: chk('enableAnnuity'),
    annuityPurchaseAge: num('annuityPurchaseAge', 67),
    annuityLumpSum: num('annuityLumpSum', 200000),
    annuityAnnualIncome: num('annuityAnnualIncome', 14000),
    enableTieredSpending: chk('enableTieredSpending'),
    tieredSpendingActiveAge: num('tieredSpendingActiveAge', 75),
    tieredSpendingFrailAge: num('tieredSpendingFrailAge', 85),
    tieredSpendingActiveMultiplier: num('tieredSpendingActiveMultiplier', 110),
    tieredSpendingStableMultiplier: num('tieredSpendingStableMultiplier', 90),
    tieredSpendingFrailMultiplier: num('tieredSpendingFrailMultiplier', 115),
    leanYearsStart: num('leanYearsStart', DEFAULTS.economic.leanYearsStart),
    leanYearsReduction: num('leanYearsReduction', DEFAULTS.economic.leanYearsReduction),
    spendingStrategy: val('spendingStrategy', 'steady'),

    // Markets
    inflation: num('inflation', 2.6),
    invReturn: num('invReturn', 6.5),
    superGrowth: num('superGrowth', 7.5),
    savingsReturn: num('savingsReturn', 1.4),
    salaryGrowthRate: num('salaryGrowthRate', 2),
    returnDeclineRate: num('returnDeclineRate', 0.03),
    useGlidePath: chk('useGlidePath'),
    glidePathRule: val('glidePathRule', DEFAULTS.allocation.glidePathRule),
    allocEquities: num('allocEquities', DEFAULTS.allocation.allocEquities),
    allocBonds: num('allocBonds', DEFAULTS.allocation.allocBonds),
    allocCash: num('allocCash', DEFAULTS.allocation.allocCash),

    // Pension
    agePensionAge: num('agePensionAge', 67),
    pensionAnnualSingle: num('pensionAnnualSingle', 31223),
    pensionAnnualCouple: num('pensionAnnualCouple', 47070),
    pensionAssetThreshold: num('pensionAssetThreshold', getHouseholdPensionDefaults(household).threshold),
    pensionAssetCutoff: num('pensionAssetCutoff', getHouseholdPensionDefaults(household).cutoff),
    pensionIncomeThreshold: num('pensionIncomeThreshold', household === 'couple' ? 380 : 212),

    // Simulation
    mcRuns: (() => {
      const sel = document.getElementById('mcRuns');
      if (sel?.value === 'custom') {
        const v = parseInt(document.getElementById('mcRunsCustom')?.value) || 2000;
        return Math.min(20000, Math.max(100, v));
      }
      return parseInt(sel?.value) || 500;
    })(),
    returnVolatility: num('returnVolatility', 12),
    scenarioMode: val('scenarioMode', 'baseline'),
    enableShocks: chk('enableShocks'),
    shockProbability: num('shockProbability', DEFAULTS.simulation.shockProbability),
    shockMagnitude: num('shockMagnitude', DEFAULTS.simulation.shockMagnitude),
    extremeInflationProbability: num('extremeInflationProbability', 0),
    propertyCrashProbability: num('propertyCrashProbability', 0),
    globalRiskFactor: num('globalRiskFactor', 0),
    sampleLifespan: chk('sampleLifespan'),
    budget2627: chk('budget2627'),
    // FHSS fields captured for display/eligibility checks only — not yet wired into simulation engine.
    // Properly modeling FHSS release mechanics (withdrawal timing, tax treatment on release) requires
    // a dedicated pre-retirement phase that the current simulator doesn't support.
    fhssTotalContributions: num('fhssTotalContributions', 0),
    fhssAnnualContribution: num('fhssAnnualContribution', 0),
    hasSpousalMaintenance: chk('hasSpousalMaintenance'),
    annualSpousalMaintenance: num('annualSpousalMaintenance', 0),
    spousalMaintenanceEndsAge: num('spousalMaintenanceEndsAge', 0),
    hasChildSupport: chk('hasChildSupport'),
    annualChildSupport: num('annualChildSupport', 0),
    youngestChildAge: num('youngestChildAge', 0),

    // Overseas
    goingOverseas: chk('goingOverseas'),
    destination: val('destination'),
    australianResidenceYears: num('australianResidenceYears'),
    ageMovingOverseas: num('ageMovingOverseas'),
    annualLivingCostOverseas: num('annualLivingCostOverseas', 40000),
    returnFrequency: val('returnFrequency', 'never'),
    overseasMoveType: val('overseasMoveType', 'permanent'),
    overseasAgreementCountry: chk('overseasAgreementCountry'),
    overseasTaxResidency: val('overseasTaxResidency', 'australian'),
    overseasHealthCover: val('overseasHealthCover', 'international_private'),
    maintainResidency: chk('maintainResidency'),
    propertyStrategy: val('propertyStrategy', 'keep-personal'),
    trustBeneficiaries: val('trustBeneficiaries', 'you-only'),
    superAccess: val('superAccess', 'pension-mode'),
    estimatedLivingCosts: num('estimatedLivingCosts', 60000),
    overseasSpendingCurrency: val('overseasSpendingCurrency', 'AUD'),
    overseasAudFxChange: num('overseasAudFxChange', -1),
    overseasHousingType: val('overseasHousingType', 'rent'),
    overseasAnnualRent: num('overseasAnnualRent', 12000),
    overseasFallbackAge: num('overseasFallbackAge'),
    overseasFallbackTrigger: val('overseasFallbackTrigger', 'none'),
  };
}

function runEngine(inp) {
  return profiler.measure('retirement-v3.core.projectionService', () => (
    projectionService.computeProjection(inp, { sourceCalculator: 'retirement-v3' }).adaptedResult
  ));
}

function computeBaseState(inp = null) {
  const input = inp || profiler.measure('retirement-v3.input.readInputs', () => readInputs());
  const projection = profiler.measure('retirement-v3.core.projectionService', () => (
    projectionService.computeProjection(input, { sourceCalculator: 'retirement-v3' })
  ));
  const { engineInputs, simulation, adaptedResult } = projection;

  // Persist inputs to localStorage so the Reverse Planner can import them
  try {
    localStorage.setItem('rc_forward_scenario', JSON.stringify(input));
  } catch {
    // localStorage may be unavailable — silently skip
  }

  // Store complete forward projection payload for Reverse Planner
  const projectionPayload = buildForwardProjectionPayload({
    source: 'retirement-v3',
    input,
    engineInputs,
    simulation,
    adaptedResult,
    monteCarloResults: APP_STATE?.monteCarloResults || null,
    recommendations: APP_STATE?.recommendations || null,
    stressTestResults: APP_STATE?.stressTestResults || null,
    canonicalInput: projection.canonicalInput,
    derivedCashflow: projection.derivedCashflow,
    inputHash: projection.inputHash,
    projectionHash: projection.projectionHash,
    policyVersion: projection.policyVersion,
    diagnostics: projection.diagnostics,
    warnings: projection.warnings,
  });
  storeForwardProjection(projectionPayload);

  return { input, engineInputs, simulation, adaptedResult, projection };
}

function buildInputSignature(input = {}) {
  const stable = {};
  Object.keys(input).sort().forEach((key) => {
    stable[key] = input[key];
  });
  return JSON.stringify(stable);
}

function hasSecondaryResult(key) {
  if (key === 'recommendations') return (APP_STATE.recommendations || []).length > 0;
  if (key === 'stress') return (APP_STATE.stressTestResults || []).length > 0;
  if (key === 'overseas') return Boolean(APP_STATE.overseasAnalysis);
  if (key === 'retirementAge') return Boolean(APP_STATE.retirementAgeResult);
  return false;
}

function markSecondaryAnalysisFresh(key, runSignature = APP_STATE.currentInputSignature) {
  const state = APP_STATE.secondaryAnalysis[key];
  if (!state) return;
  state.lastInputSignature = runSignature || null;
  state.stale = Boolean(runSignature) && runSignature !== APP_STATE.currentInputSignature;
}

function updateSecondaryAnalysisStaleStates() {
  const current = APP_STATE.currentInputSignature;
  SECONDARY_ANALYSIS_KEYS.forEach((key) => {
    const state = APP_STATE.secondaryAnalysis[key];
    if (!state) return;
    if (!hasSecondaryResult(key)) {
      state.stale = false;
      return;
    }
    state.stale = Boolean(state.lastInputSignature) && state.lastInputSignature !== current;
  });
}

function getSecondaryAnalysisState(key) {
  return APP_STATE.secondaryAnalysis[key] || { stale: false, lastInputSignature: null };
}

function syncToolButtonStates() {
  const aiBtn = document.getElementById('tool-ai');
  if (!aiBtn) return;
  if (!aiBtn.dataset.originalInnerHtml) {
    aiBtn.dataset.originalInnerHtml = aiBtn.innerHTML;
  }
  const state = getSecondaryAnalysisState('recommendations');
  const hasResult = (APP_STATE.recommendations || []).length > 0;
  if (hasResult && !state.stale) {
    aiBtn.disabled = true;
    aiBtn.innerHTML = '<span class="ic">✅</span> Suggestions &amp; Action Plan <span class="sm">Up to date — change inputs to refresh</span>';
  } else {
    aiBtn.disabled = false;
    aiBtn.innerHTML = aiBtn.dataset.originalInnerHtml;
  }
}

function secondaryStaleNotice({
  title,
  message,
  buttonLabel,
  toolId,
}) {
  return `
    <div style="padding:14px;border:1px solid var(--gold,#f59e0b);border-radius:12px;background:var(--gold-soft,#fffbeb)">
      <div style="font-weight:700;color:var(--gold,#b45309)">Needs refresh</div>
      <p style="margin:6px 0 10px;color:var(--ink-2)"><b>${escapeHtml(title)}</b> ${escapeHtml(message)}</p>
      <button type="button" class="iconbtn primary" data-refresh-tool="${escapeHtml(toolId)}">${escapeHtml(buttonLabel)}</button>
    </div>
  `;
}

function syncAppState(baseState = computeBaseState()) {
  APP_STATE.input = baseState.input;
  APP_STATE.engineInputs = baseState.engineInputs;
  APP_STATE.simulation = baseState.simulation;
  APP_STATE.adaptedResult = baseState.adaptedResult;
  APP_STATE.projection = baseState.projection || null;
  APP_STATE.currentInputSignature = buildInputSignature(baseState.input);
  updateSecondaryAnalysisStaleStates();
  return baseState;
}

function resetDerivedAnalysis() {
  APP_STATE.monteCarloResults = null;
  APP_STATE.retirementAgeResult = null;
  APP_STATE.stressTestResults = [];
  APP_STATE.recommendations = [];
  APP_STATE.riskProfile = null;
  APP_STATE.allocationStrategy = null;
  APP_STATE.overseasAnalysis = null;
  APP_STATE.overseasExportData = null;
  APP_STATE.monteCarloChartRender.lastKey = null;
  APP_STATE.monteCarloChartRender.scheduled = false;
  SECONDARY_ANALYSIS_KEYS.forEach((key) => {
    APP_STATE.secondaryAnalysis[key].lastInputSignature = null;
    APP_STATE.secondaryAnalysis[key].stale = false;
  });
}

function resetCoreDerivedAnalysis() {
  APP_STATE.monteCarloResults = null;
  APP_STATE.riskProfile = null;
  APP_STATE.allocationStrategy = null;
  APP_STATE.monteCarloChartRender.lastKey = null;
  APP_STATE.monteCarloChartRender.scheduled = false;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function setPanelHtml(tabName, html) {
  const panel = document.querySelector(`[data-tab-panel="${tabName}"]`);
  if (panel) panel.innerHTML = html;
}

function openTab(tabName) {
  const button = document.querySelector(`.analysis-tabs button[data-tab="${tabName}"]`);
  if (button) button.click();
}

function getActiveAnalysisTab() {
  const active = document.querySelector('.analysis-tabs button.on');
  return active?.dataset?.tab || 'summary';
}

function getDisplayUnits() {
  const segmented = document.querySelector('[data-bind="displayUnits"]');
  return segmented?.dataset?.value === 'nominal' ? 'nominal' : 'today';
}

function getFinalBalanceValue(result = APP_STATE.simulation, adaptedResult = APP_STATE.adaptedResult) {
  const lastYear = adaptedResult?.years?.[adaptedResult.years.length - 1];
  return result?.finalBalance ?? result?.totalFinancialAssets ?? lastYear?.totalAssets ?? 0;
}

function buildExportResults() {
  const simulation = APP_STATE.simulation;
  const adaptedResult = APP_STATE.adaptedResult;
  const yearlyData = simulation?.yearlyData || adaptedResult?.years?.map((year) => ({
    age: year.age,
    endBalance: year.totalAssets,
    withdrawal: year.withdraw,
    pensionIncome: year.pension,
  })) || [];

  return {
    ...(simulation || {}),
    yearlyData,
    monteCarloResults: APP_STATE.monteCarloResults,
    totalFinancialAssets: simulation?.totalFinancialAssets ?? getFinalBalanceValue(simulation, adaptedResult),
    accessibleHomeEquity: simulation?.accessibleHomeEquity ?? 0,
    finalBalance: getFinalBalanceValue(simulation, adaptedResult),
  };
}

function buildExportAppBridge() {
  return {
    currentMonteCarloResults: APP_STATE.monteCarloResults,
    currentRecommendations: APP_STATE.recommendations,
    currentComprehensiveRecommendations: APP_STATE.recommendations,
    currentSuggestions: APP_STATE.recommendations,
    currentStressTestResults: APP_STATE.stressTestResults,
    currentRiskProfile: APP_STATE.riskProfile,
    currentAllocationStrategy: APP_STATE.allocationStrategy,
    currentOverseasData: APP_STATE.overseasExportData,
    currentProjection: APP_STATE.projection,
    // Plain-English narrative text for PDF
    plainEnglishNarrative: APP_STATE.adaptedResult && APP_STATE.input
      ? buildPlainEnglishNarrativeText(APP_STATE.adaptedResult, APP_STATE.input, APP_STATE.monteCarloResults)
      : null,
  };
}

function normaliseRiskProfile(summary) {
  if (!summary) return null;

  return {
    overallRiskProfile: summary.overallRiskProfile,
    riskCapacity: summary.dimensions?.capacity?.score ?? null,
    riskTolerance: summary.dimensions?.tolerance?.score ?? null,
    riskRequirement: summary.dimensions?.requirement?.score ?? null,
    confidence: summary.confidenceLevel ?? null,
    recommendations: summary.topRecommendations || [],
    optimalAllocation: summary.optimalAllocation || null,
    misalignment: summary.misalignment || null,
    raw: summary,
  };
}

function deriveAllocationStrategy(riskProfile) {
  const allocation = riskProfile?.optimalAllocation;
  if (!allocation) return null;

  return {
    confidence: riskProfile.confidence,
    currentAllocation: {
      equity: allocation.growth ?? allocation.equity ?? null,
      bonds: allocation.defensive ?? allocation.bonds ?? null,
      cash: allocation.cash ?? null,
    },
    strategy: {
      name: riskProfile.overallRiskProfile || 'Balanced',
      description: riskProfile.misalignment?.message || 'Allocation aligned to your current risk profile.',
    },
    rationale: riskProfile.misalignment?.recommendation || null,
  };
}

function buildStressScenarioResults(baseState) {
  const baseBalance = getFinalBalanceValue(baseState.simulation, baseState.adaptedResult);

  return (ENHANCED_CONFIG.STRESS_SCENARIOS || []).map((scenario) => {
    // buildStressedInputs applies field-level modifiers (e.g. healthcare multiplier)
    const stressedInputs = buildStressedInputs(baseState.engineInputs, scenario);

    // normaliseStressScenarioForTest converts year1/year2/… objects into the
    // yearlyEquityReturns/yearlyBondReturns arrays that simulateRetirement expects,
    // and sets isRetirementTimed so the retirement-phase loop applies the shocks.
    const normalisedScenario = normaliseStressScenarioForTest(scenario);

    const stressedResult = simulator.runStressTest(stressedInputs, normalisedScenario);
    const finalBalance = stressedResult.finalBalance ?? stressedResult.totalFinancialAssets ?? 0;
    const depletionAge = stressedResult.depletionAge ?? null;

    return {
      scenario: scenario.name,
      description: scenario.description,
      finalBalance,
      deltaBalance: finalBalance - baseBalance,
      depletionAge,
      success: finalBalance > 0,
    };
  });
}

function mapDestinationCode(destination) {
  return COUNTRY_CODE_MAP[destination] || null;
}

function toDisplayPercent(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '';
  // Values already >1 are assumed to be display-percent already (e.g. from v2 saves).
  // Values <=1 are decimal fractions from legacy saves: multiply by 100 and round to
  // 4 significant decimal places to eliminate float noise (0.162 * 100 = 16.200000000000002).
  if (numeric > 1) return numeric;
  return parseFloat((numeric * 100).toFixed(4));
}

function normalizeImportedFxDisplayPercent(value, fallback = -1, destination = "") {
  return normalizeFxChangeDisplayPercent(value, destination, fallback);
}

function mapCanonicalEmergencyFund(value) {
  if (value === 'full') return '6plus';
  if (value === 'partial') return '3_6';
  return 'none';
}

function mapCanonicalDebt(value) {
  if (value === 'significant') return 'over_50k';
  if (value === 'moderate') return '10_50k';
  return 'none';
}

function isRedesignUserData(userData = {}) {
  return 'retireAge' in userData
    || 'superBal' in userData
    || 'downsizePlan' in userData
    || 'household' in userData;
}

function getBaselineImportState() {
  return { ...(initialFormState || readInputs()) };
}

function normalizeImportedUserData(userData = {}) {
  const base = getBaselineImportState();

  if (isRedesignUserData(userData)) {
    const destination = userData.destination || userData.overseasCountry || base.destination;
    return {
      ...base,
      ...userData,
      household: userData.household || base.household,
      downsizePlan: userData.downsizePlan || base.downsizePlan,
      destination,
      overseasAudFxChange: normalizeImportedFxDisplayPercent(
        userData.overseasAudFxChange,
        base.overseasAudFxChange,
        destination
      ),
    };
  }

  const importedHasPartner = userData.hasPartner
    || userData.isCouple
    || Number(userData.partnerCurrentAge) > 0
    || Number(userData.partnerSalary) > 0
    || Number(userData.partnerCurrentSuper) > 0;

  const annualPensionField = importedHasPartner ? 'pensionAnnualCouple' : 'pensionAnnualSingle';

  return {
    ...base,
    household: importedHasPartner ? 'couple' : 'single',
    age: userData.yourCurrentAge ?? base.age,
    retireAge: userData.retirementAge ?? base.retireAge,
    lifespan: userData.yourLifespan ?? userData.lifeExpectancy ?? base.lifespan,
    gender: userData.yourGender ?? base.gender,
    ageCameToAU: userData.ageCameToAustralia ?? base.ageCameToAU,
    ageStartedEarningAU: userData.ageStartedEarningAustralia ?? base.ageStartedEarningAU,
    partnerAge: userData.partnerCurrentAge ?? base.partnerAge,
    partnerRetireAge: userData.partnerRetirementAge ?? base.partnerRetireAge,
    partnerLifespan: userData.partnerLifespan ?? base.partnerLifespan,
    partnerGender: userData.partnerGender ?? base.partnerGender,
    partnerAgeCameToAU: userData.partnerAgeCameToAustralia ?? base.partnerAgeCameToAU,
    partnerAgeStartedEarningAU: userData.partnerAgeStartedEarningAustralia ?? base.partnerAgeStartedEarningAU,
    riskTolerance: userData.riskTolerance ?? base.riskTolerance,
    riskReactionDrop: userData.lossReaction ?? base.riskReactionDrop,
    investmentExperience: Object.entries(EXPERIENCE_MAP).find(([, value]) => value === userData.investmentExperience)?.[0] || base.investmentExperience,
    marketKnowledge: userData.marketUnderstanding ?? base.marketKnowledge,
    volatilityComfort: userData.volatilityComfort !== undefined ? toDisplayPercent(userData.volatilityComfort) : base.volatilityComfort,
    emergencyFund: mapCanonicalEmergencyFund(userData.hasEmergencyFund),
    highInterestDebt: mapCanonicalDebt(userData.hasDebt),
    salary: userData.yourSalary ?? userData.annualSalary ?? base.salary,
    partnerSalary: userData.partnerSalary ?? userData.partnerAnnualSalary ?? base.partnerSalary,
    superBal: userData.yourCurrentSuper ?? userData.superBalance ?? base.superBal,
    partnerSuperBal: userData.partnerCurrentSuper ?? userData.partnerSuperBalance ?? base.partnerSuperBal,
    cash: userData.currentSavings ?? userData.savings ?? base.cash,
    stocks: userData.currentStocks ?? userData.investments ?? base.stocks,
    monthlyStockContrib: userData.monthlyStockContribution ?? base.monthlyStockContrib,
    useDetailedCashflow: Boolean(userData.useDetailedCashflow ?? userData.useDetailedExpenseInputs ?? base.useDetailedCashflow),
    currentMonthlyIncome: userData.currentMonthlyIncome ?? base.currentMonthlyIncome,
    currentMonthlyLivingCosts: userData.currentMonthlyTotalSpend
      ?? (
        (userData.currentMonthlyHousingCosts ?? 0)
        + (userData.currentMonthlyLivingCosts ?? 0)
        + ((userData.currentHealthcareCosts ?? 0) / 12)
      )
      ?? base.currentMonthlyLivingCosts,
    surplusAllocationMode: userData.surplusAllocationMode ?? base.surplusAllocationMode,
    salarySacrifice: userData.yourAdditionalSuperContribution ?? base.salarySacrifice,
    partnerSalarySacrifice: userData.partnerAdditionalSuperContribution ?? base.partnerSalarySacrifice,
    employerRate: userData.employerSuperContributionRate !== undefined ? toDisplayPercent(userData.employerSuperContributionRate) : base.employerRate,
    employerSuperMode: userData.employerSuperMode ?? base.employerSuperMode,
    employerSuperOverrideAmount: userData.employerSuperOverrideAmount ?? base.employerSuperOverrideAmount,
    partnerEmployerSuperMode: userData.partnerEmployerSuperMode ?? base.partnerEmployerSuperMode,
    partnerEmployerSuperOverrideAmount: userData.partnerEmployerSuperOverrideAmount ?? base.partnerEmployerSuperOverrideAmount,
    ncc: userData.yourAnnualNCC ?? base.ncc,
    partnerNCC: userData.partnerAnnualNCC ?? base.partnerNCC,
    concessionalUsedThisYear: userData.concessionalCapUsed ?? base.concessionalUsedThisYear,
    spouseContribution: userData.spouseContribution ?? base.spouseContribution,
    useDownsizer: Boolean(userData.downsizeContribution ?? base.useDownsizer),
    reducedIncomeEnabled: Boolean(userData.enableReducedIncome ?? base.reducedIncomeEnabled),
    reducedIncomeAge: userData.reducedIncomeAge ?? base.reducedIncomeAge,
    reducedIncomeSalary: userData.reducedIncomeSalary ?? base.reducedIncomeSalary,
    partnerReducedIncomeAge: userData.partnerReducedIncomeAge ?? base.partnerReducedIncomeAge,
    partnerReducedIncomeSalary: userData.partnerReducedIncomeSalary ?? base.partnerReducedIncomeSalary,
    businessIncome: userData.businessIncome ?? base.businessIncome,
    investmentIncomeOutsideSuper: userData.investmentIncome ?? base.investmentIncomeOutsideSuper,
    dependents: userData.dependents ?? base.dependents,
    educationCostPerChild: userData.educationCostPerChild ?? base.educationCostPerChild,
    privateSchool: Boolean(userData.privateSchool ?? base.privateSchool),
    uniSupport: Boolean(userData.universitySupport ?? base.uniSupport),
    isCarer: Boolean(userData.isCarerForParents ?? base.isCarer),
    annualParentSupport: userData.carerAnnualExpense ?? base.annualParentSupport,
    carerReducedWorkPercent: userData.carerReducedWorkPercent !== undefined ? toDisplayPercent(userData.carerReducedWorkPercent) : base.carerReducedWorkPercent,
    carerYearsExpected: userData.carerYearsExpected ?? base.carerYearsExpected,
    homeValue: userData.homeValue ?? base.homeValue,
    mortgage: userData.mortgageBalance ?? base.mortgage,
    mortgageRate: userData.mortgageRate !== undefined ? toDisplayPercent(userData.mortgageRate) : base.mortgageRate,
    monthlyMortgagePayment: userData.monthlyMortgagePayment ?? base.monthlyMortgagePayment,
    downsizePlan: userData.planToDownsize === undefined ? base.downsizePlan : (userData.planToDownsize ? 'yes' : 'no'),
    ccBalance: userData.creditCardBalance ?? base.ccBalance,
    ccRate: userData.creditCardRate !== undefined ? toDisplayPercent(userData.creditCardRate) : base.ccRate,
    personalLoan: userData.personalLoanBalance ?? base.personalLoan,
    personalLoanRate: userData.personalLoanRate !== undefined ? toDisplayPercent(userData.personalLoanRate) : base.personalLoanRate,
    carLoan: userData.carLoanBalance ?? base.carLoan,
    carLoanRate: userData.carLoanRate !== undefined ? toDisplayPercent(userData.carLoanRate) : base.carLoanRate,
    hecsBalance: userData.hecsBalance ?? base.hecsBalance,
    investmentProperty: Boolean(userData.hasInvestmentProperty ?? base.investmentProperty),
    ipValue: userData.investmentPropertyValue ?? base.ipValue,
    ipLoan: userData.investmentPropertyLoan ?? base.ipLoan,
    ipRate: userData.investmentPropertyRate !== undefined ? toDisplayPercent(userData.investmentPropertyRate) : base.ipRate,
    ipPurchasePrice: userData.investmentPropertyPurchasePrice ?? base.ipPurchasePrice,
    ipPurchaseYear: userData.investmentPropertyPurchaseYear ?? base.ipPurchaseYear,
    ipLoanType: userData.investmentPropertyLoanType ?? base.ipLoanType,
    capitalGainsTaxRate: userData.capitalGainsTaxRate !== undefined ? toDisplayPercent(userData.capitalGainsTaxRate) : base.capitalGainsTaxRate,
    ipWeeklyRent: userData.weeklyRentalIncome ?? base.ipWeeklyRent,
    ipAnnualExpenses: userData.annualPropertyExpenses ?? base.ipAnnualExpenses,
    landTax: userData.landTax ?? base.landTax,
    ipGrowthRate: userData.propertyGrowthRate !== undefined ? toDisplayPercent(userData.propertyGrowthRate) : base.ipGrowthRate,
    ipState: userData.propertyState ?? base.ipState,
    ipVacancyRate: userData.vacancyRate !== undefined ? toDisplayPercent(userData.vacancyRate) : base.ipVacancyRate,
    dividendYield: userData.dividendYield !== undefined ? toDisplayPercent(userData.dividendYield) : base.dividendYield,
    frankingRate: userData.frankingRate !== undefined ? toDisplayPercent(userData.frankingRate) : base.frankingRate,
    australianEquityAllocation: userData.australianEquityAllocation !== undefined ? toDisplayPercent(userData.australianEquityAllocation) : base.australianEquityAllocation,
    sellPropertyYears: userData.sellPropertyYears ?? base.sellPropertyYears,
    maintenanceInflation: userData.maintenanceInflation !== undefined ? toDisplayPercent(userData.maintenanceInflation) : base.maintenanceInflation,
    hasSmsf: Boolean(userData.hasSMSF ?? base.hasSmsf),
    hasTrust: Boolean(userData.hasTrustAssets ?? base.hasTrust),
    desiredIncome: userData.targetRetirementIncome ?? userData.asfaComfortable ?? base.desiredIncome,
    hasPrivateHospital: Boolean(userData.hasPrivateHealthCover ?? base.hasPrivateHospital),
    healthCondition: userData.healthCondition ?? base.healthCondition,
    healthcareCost: userData.currentHealthcareCosts ?? base.healthcareCost,
    healthcareInflation: userData.healthcareInflation !== undefined ? toDisplayPercent(userData.healthcareInflation) : base.healthcareInflation,
    ageFirstHadCover: userData.ageFirstPrivateCover ?? base.ageFirstHadCover,
    agedCareProbability: userData.agedCareProbability !== undefined ? toDisplayPercent(userData.agedCareProbability) : base.agedCareProbability,
    agedCareStartAge: userData.agedCareStartAge ?? base.agedCareStartAge,
    agedCareAnnualCost: userData.agedCareAnnualCost ?? base.agedCareAnnualCost,
    inflation: userData.inflation !== undefined ? toDisplayPercent(userData.inflation) : base.inflation,
    invReturn: userData.investmentReturn !== undefined ? toDisplayPercent(userData.investmentReturn) : base.invReturn,
    superGrowth: userData.superReturn !== undefined ? toDisplayPercent(userData.superReturn) : base.superGrowth,
    savingsReturn: userData.savingsReturn !== undefined ? toDisplayPercent(userData.savingsReturn) : base.savingsReturn,
    salaryGrowthRate: userData.salaryGrowthRate !== undefined ? toDisplayPercent(userData.salaryGrowthRate) : base.salaryGrowthRate,
    leanYearsStart: userData.leanYearsStart ?? base.leanYearsStart,
    leanYearsReduction: userData.leanYearsReduction !== undefined ? toDisplayPercent(userData.leanYearsReduction) : base.leanYearsReduction,
    spendingStrategy: userData.spendingStrategy ?? base.spendingStrategy,
    useGlidePath: Boolean(userData.useGlidePath ?? base.useGlidePath),
    glidePathRule: userData.glidePathRule ?? base.glidePathRule,
    allocEquities: userData.allocEquities !== undefined ? toDisplayPercent(userData.allocEquities) : base.allocEquities,
    allocBonds: userData.allocBonds !== undefined ? toDisplayPercent(userData.allocBonds) : base.allocBonds,
    allocCash: userData.allocCash !== undefined ? toDisplayPercent(userData.allocCash) : base.allocCash,
    // userData.returnDeclineRate is assumed to be in decimal engine form (e.g. 0.002 for 0.2%/yr),
    // as exported by the classic calculator. toDisplayPercent converts it to display-% for the form.
    // If a future export ever stores display-% (e.g. 0.2), toDisplayPercent would amplify it 100×.
    // sanitiseReturnDeclineRate in the engine pipeline detects values > DECLINE_MAX and corrects them.
    returnDeclineRate: userData.returnDeclineRate !== undefined ? toDisplayPercent(userData.returnDeclineRate) : base.returnDeclineRate,
    agePensionAge: userData.agePensionAge ?? base.agePensionAge,
    [annualPensionField]: userData.agePensionMax ?? base[annualPensionField],
    pensionAssetThreshold: userData.pensionAssetThreshold ?? base.pensionAssetThreshold,
    pensionAssetCutoff: userData.pensionAssetLimit ?? base.pensionAssetCutoff,
    pensionIncomeThreshold: userData.pensionIncomeThreshold ?? base.pensionIncomeThreshold,
    mcRuns: userData.numRuns ?? userData.mcRuns ?? base.mcRuns,
    returnVolatility: userData.returnVolatility !== undefined ? toDisplayPercent(userData.returnVolatility) : base.returnVolatility,
    scenarioMode: userData.scenarioMode ?? base.scenarioMode,
    enableShocks: Boolean(userData.enableShocks ?? base.enableShocks),
    shockProbability: userData.shockProbability ?? base.shockProbability,
    shockMagnitude: userData.shockMagnitude ?? base.shockMagnitude,
    extremeInflationProbability: userData.extremeInflationProbability !== undefined ? toDisplayPercent(userData.extremeInflationProbability) : base.extremeInflationProbability,
    propertyCrashProbability: userData.propertyCrashProbability !== undefined ? toDisplayPercent(userData.propertyCrashProbability) : base.propertyCrashProbability,
    globalRiskFactor: userData.globalRiskFactor ?? base.globalRiskFactor,
    sampleLifespan: Boolean(userData.useLongevityDistribution ?? userData.sampleLifespan ?? base.sampleLifespan),
    budget2627: Boolean(userData.enableProposedBudget2026 ?? userData.budget2627 ?? base.budget2627),
    // New fields added in 2026 — mapped from both v2 names and any legacy equivalents
    fhssTotalContributions: userData.fhssTotalContributions ?? base.fhssTotalContributions,
    fhssAnnualContribution: userData.fhssAnnualContribution ?? base.fhssAnnualContribution,
    useFHSS: Boolean(userData.useFHSS ?? base.useFHSS),
    annualParentSupport: userData.annualParentSupport ?? userData.carerAnnualExpense ?? base.annualParentSupport,
    hasSpousalMaintenance: Boolean(userData.hasSpousalMaintenance ?? base.hasSpousalMaintenance),
    annualSpousalMaintenance: userData.annualSpousalMaintenance ?? base.annualSpousalMaintenance,
    spousalMaintenanceEndsAge: userData.spousalMaintenanceEndsAge ?? base.spousalMaintenanceEndsAge,
    hasChildSupport: Boolean(userData.hasChildSupport ?? base.hasChildSupport),
    annualChildSupport: userData.annualChildSupport ?? base.annualChildSupport,
    youngestChildAge: userData.youngestChildAge ?? base.youngestChildAge,
    // Overseas retirement — map classic advanced.html field names → v2 field names.
    // This ensures a JSON saved on either page loads correctly on the other.
    goingOverseas: userData.goingOverseas ?? (userData.overseasCountry ? userData.overseasCountry !== '' : base.goingOverseas),
    destination: userData.destination ?? userData.overseasCountry ?? base.destination,
    ageMovingOverseas: userData.ageMovingOverseas ?? userData.overseasAge ?? userData.overseasStartAge ?? base.ageMovingOverseas,
    annualLivingCostOverseas: userData.annualLivingCostOverseas ?? userData.estimatedLivingCosts ?? userData.overseasAnnualBudget ?? base.annualLivingCostOverseas,
    returnFrequency: userData.returnFrequency ?? userData.overseasReturnFrequency ?? base.returnFrequency,
    overseasMoveType: userData.overseasMoveType ?? base.overseasMoveType,
    overseasTaxResidency: userData.overseasTaxResidency ?? base.overseasTaxResidency,
    overseasHealthCover: userData.overseasHealthCover ?? base.overseasHealthCover,
    maintainResidency: Boolean(userData.maintainResidency ?? base.maintainResidency),
    overseasAgreementCountry: Boolean(userData.overseasAgreementCountry ?? base.overseasAgreementCountry),
    propertyStrategy: userData.propertyStrategy ?? base.propertyStrategy,
    trustBeneficiaries: userData.trustBeneficiaries ?? base.trustBeneficiaries,
    superAccess: userData.superAccess ?? base.superAccess,
    overseasSpendingCurrency: userData.overseasSpendingCurrency ?? base.overseasSpendingCurrency,
    overseasAudFxChange: userData.overseasAudFxChange !== undefined
      ? normalizeImportedFxDisplayPercent(userData.overseasAudFxChange, base.overseasAudFxChange, userData.destination ?? userData.overseasCountry ?? base.destination)
      : base.overseasAudFxChange,
    overseasHousingType: userData.overseasHousingType ?? base.overseasHousingType,
    overseasAnnualRent: userData.overseasAnnualRent ?? base.overseasAnnualRent,
    overseasFallbackAge: userData.overseasFallbackAge ?? base.overseasFallbackAge,
    overseasFallbackTrigger: userData.overseasFallbackTrigger ?? base.overseasFallbackTrigger,
    australianResidenceYears: userData.australianResidenceYears ?? base.australianResidenceYears,
    // Age-related optional costs (Section 13)
    enableHomeModifications: Boolean(userData.enableHomeModifications ?? base.enableHomeModifications),
    homeModificationCost: userData.homeModificationCost ?? base.homeModificationCost,
    homeModificationAge: userData.homeModificationAge ?? base.homeModificationAge,
    homeModificationRecurring: userData.homeModificationRecurring ?? base.homeModificationRecurring,
    enableAnnuity: Boolean(userData.enableAnnuity ?? base.enableAnnuity),
    annuityPurchaseAge: userData.annuityPurchaseAge ?? base.annuityPurchaseAge,
    annuityLumpSum: userData.annuityLumpSum ?? base.annuityLumpSum,
    annuityAnnualIncome: userData.annuityAnnualIncome ?? base.annuityAnnualIncome,
    enableTieredSpending: Boolean(userData.enableTieredSpending ?? base.enableTieredSpending),
    tieredSpendingActiveAge: userData.tieredSpendingActiveAge ?? base.tieredSpendingActiveAge,
    tieredSpendingFrailAge: userData.tieredSpendingFrailAge ?? base.tieredSpendingFrailAge,
    tieredSpendingActiveMultiplier: userData.tieredSpendingActiveMultiplier ?? base.tieredSpendingActiveMultiplier,
    tieredSpendingStableMultiplier: userData.tieredSpendingStableMultiplier ?? base.tieredSpendingStableMultiplier,
    tieredSpendingFrailMultiplier: userData.tieredSpendingFrailMultiplier ?? base.tieredSpendingFrailMultiplier,
  };
}

function exportRedesignUserData(inputs, scenarioName = 'Retirement Calculator v3') {
  const v2Inputs = inputs || readInputs();
  const canonicalInputs = buildCanonicalSaveData(v2Inputs, { source: 'advanced-v2' });
  const uiState = {
    advancedV2: extractAdvancedV2UiState(v2Inputs)
  };

  return exportUserData(canonicalInputs, scenarioName, {
      sourcePage: 'retirement-v3',
    uiState
  });
}

function buildOverseasAnalyzer(baseState) {
  return new OverseasRetirementAnalyzer(
    {
      age: baseState.input.age,
      retirementAge: baseState.input.retireAge,
      partnered: baseState.engineInputs?.isCouple,
      ageCameToAustralia: baseState.input.ageCameToAU,
      australianResidenceYears: baseState.input.australianResidenceYears > 0
        ? baseState.input.australianResidenceYears
        : baseState.input.ageCameToAU > 0
          ? Math.max(0, baseState.input.retireAge - baseState.input.ageCameToAU)
          : Math.max(0, baseState.input.retireAge - 16),
      enableProposedBudget2026: baseState.input.budget2627,
      overseasTaxResidency: baseState.input.overseasTaxResidency || 'australian',
    },
    {
      superBalance: baseState.input.superBal + (baseState.engineInputs?.isCouple ? baseState.input.partnerSuperBal : 0),
      investmentBalance: baseState.input.stocks,
      savingsBalance: baseState.input.cash,
      annualIncomeNeed: baseState.input.desiredIncome,
      enableProposedBudget2026: baseState.input.budget2627,
    }
  );
}

function buildOverseasExportData(analysis, annualBudget, finalBalance) {
  if (!analysis) return null;

  const annualCost = annualBudget > 0 ? annualBudget : (analysis.costOfLiving?.countryAnnual ?? 0);
  const monthlyBudget = Math.round(annualCost / 12);
  const australiaAnnual = analysis.costOfLiving?.australiaAnnual || 0;
  const costVsAustralia = australiaAnnual > 0
    ? Math.round(((annualCost - australiaAnnual) / australiaAnnual) * 100)
    : 0;
  const availableAnnualIncome = (APP_STATE.adaptedResult?.monthlyPaycheck || 0) * 12;
  const input = APP_STATE.input || {};

  return {
    config: {
      destinationCountry: analysis.country,
      currency: 'AUD',
      monthlyBudget,
      moveType: input.overseasMoveType || 'unknown',
      taxResidency: input.overseasTaxResidency || 'unknown',
      returnFrequency: input.returnFrequency || 'unknown',
      ageMovingOverseas: input.ageMovingOverseas || null,
    },
    scenarios: [
      {
        country: analysis.country,
        monthlyBudget,
        annualCost,
        yearsOfFunding: annualCost > 0 ? Math.max(0, Math.round(finalBalance / annualCost)) : null,
        costVsAustralia,
        suitabilityScore: analysis.riskAssessment?.overall === 'LOW' ? 80 : analysis.riskAssessment?.overall === 'MEDIUM' ? 65 : 50,
        availableAnnualIncome,
      },
    ],
    pensionPortability: analysis.agePensionPortability || null,
    taxImplications: analysis.taxImplications || null,
    healthcare: analysis.healthcare || null,
    riskAssessment: analysis.riskAssessment || null,
    recommendations: analysis.recommendations || null,
    overview: analysis.overview || null,
  };
}

// ============================================================
// 5a. MONTE CARLO DASHBOARD — rich HTML + Chart.js charts
// ============================================================

/**
 * Build the full Monte Carlo results dashboard HTML.
 * Called from renderSummaryPanel() when results are available.
 */
function buildMonteCarloDashboard(mc, inp) {
  const successPct = (mc.successRate || 0) * 100;
  const failPct = 100 - successPct;

  // SVG confidence gauge (half-arc, like advanced.html)
  const gaugeArcLen = 116.2; // circumference of half-arc (r=37 over 180°)
  const gaugeFill = (successPct / 100) * gaugeArcLen;
  const gaugeColor = successPct >= 90 ? '#22c55e' : successPct >= 70 ? '#f59e0b' : '#ef4444';
  const confidenceGaugeSvg = `
    <div class="confidence-gauge-wrap">
      <svg width="90" height="52" viewBox="0 0 90 52">
        <path d="M 8 46 A 37 37 0 0 1 82 46" fill="none" stroke="#e2e8f0" stroke-width="8" stroke-linecap="round"/>
        <path d="M 8 46 A 37 37 0 0 1 82 46" fill="none" stroke="${gaugeColor}" stroke-width="8"
              stroke-linecap="round" stroke-dasharray="${gaugeFill} ${gaugeArcLen - gaugeFill}"
              style="transition: stroke-dasharray 0.6s ease"/>
        <text x="45" y="44" text-anchor="middle" class="gauge-value-text"
              font-size="14" font-weight="700" fill="currentColor">${Math.round(successPct)}%</text>
      </svg>
      <div style="font-size:11px;color:var(--ink-3);text-align:center;margin-top:2px">Success rate</div>
    </div>`;

  // Narrative based on success rate
  let narrative = '';
  if (successPct >= 95) {
    narrative = 'Your plan has a very high probability of success. Even under adverse conditions your portfolio is projected to outlast your planned lifespan.';
  } else if (successPct >= 80) {
    narrative = 'Your plan is in good shape. Consider building a small buffer — increasing contributions or reducing discretionary spending — to lift confidence further.';
  } else if (successPct >= 60) {
    narrative = 'There is meaningful shortfall risk. Review your retirement age, spending targets, or contribution levels to improve the probability of success.';
  } else {
    narrative = 'Your current plan has a significant probability of running short. Major adjustments to spending, contributions, or retirement timing are recommended.';
  }

  const totalRuns = mc.totalRuns || mc.numRuns || (inp?.mcRuns) || '—';
  // MC balances are at end-of-life, so deflate over the full span to lifespan (not retirementAge).
  const horizonYears = Math.max(0, (inp?.lifespan || 90) - (inp?.age || 0));
  const inflation = (inp?.inflation || 0) > 1 ? inp.inflation / 100 : (inp?.inflation || 0);
  const p10Today = deflateToToday(mc.percentile10 || 0, horizonYears, inflation);
  const medianToday = deflateToToday(mc.median || 0, horizonYears, inflation);
  const p90Today = deflateToToday(mc.percentile90 || 0, horizonYears, inflation);
  const mortgagePayoff = APP_STATE.simulation?.mortgagePayoffAge;
  const downsideDepletion = Array.isArray(mc.yearlyPercentiles)
    ? mc.yearlyPercentiles.find(entry => entry.p10 <= 0)?.yearIndex
    : null;

  return `
    <div class="summary-chart" style="grid-column:1/-1">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px">
        <div>
          <h5 style="margin:0 0 4px">Monte Carlo Results</h5>
          <div class="desc">Based on ${typeof totalRuns === 'number' ? totalRuns.toLocaleString() : totalRuns} simulations accounting for market volatility</div>
        </div>
        ${confidenceGaugeSvg}
      </div>

      <div class="mc-results-grid" style="margin-top:14px">
        <div class="mc-stat">
          <div class="mc-k">Total runs</div>
          <div class="mc-v">${typeof totalRuns === 'number' ? totalRuns.toLocaleString() : totalRuns}</div>
        </div>
        <div class="mc-stat" style="border-color:${gaugeColor}40;background:${gaugeColor}10">
          <div class="mc-k">Success rate</div>
          <div class="mc-v" style="color:${gaugeColor}">${Math.round(successPct)}%</div>
          <div class="mc-sub">Probability of not running out</div>
        </div>
        <div class="mc-stat">
          <div class="mc-k">Median balance (today's $)</div>
          <div class="mc-v">${fmt$(medianToday, { compact: true })}</div>
          <div class="mc-sub">50th percentile · nominal ${fmt$(mc.median || 0, { compact: true })}</div>
        </div>
        <div class="mc-stat" style="border-color:var(--rose-soft)">
          <div class="mc-k">10th percentile</div>
          <div class="mc-v" style="color:var(--rose)">${fmt$(p10Today, { compact: true })}</div>
          <div class="mc-sub">Today's $ · pessimistic (1-in-10)</div>
        </div>
        <div class="mc-stat" style="border-color:var(--accent-soft)">
          <div class="mc-k">90th percentile</div>
          <div class="mc-v" style="color:var(--accent)">${fmt$(p90Today, { compact: true })}</div>
          <div class="mc-sub">Today's $ · optimistic (9-in-10)</div>
        </div>
        <div class="mc-stat" style="border-color:var(--rose-soft)">
          <div class="mc-k">Failure probability</div>
          <div class="mc-v" style="color:var(--rose)">${failPct.toFixed(1)}%</div>
          <div class="mc-sub">Risk of running out</div>
        </div>
      </div>

      <div style="margin-top:10px;font-size:12px;color:var(--ink-3)">
        Outcome markers: ${mortgagePayoff ? `mortgage cleared at age ${mortgagePayoff}` : 'mortgage not cleared within the plan'} ·
        ${downsideDepletion == null ? '10th-percentile path does not deplete' : `10th-percentile depletion around age ${(inp?.retireAge || 65) + downsideDepletion}`}
      </div>

      <p style="margin:12px 0 0;font-size:12.5px;color:var(--ink-3);line-height:1.6">${escapeHtml(narrative)}</p>

      <div style="margin-top:10px;font-size:11.5px;color:var(--ink-4)">
        ⚑ Run Core Projection (↻ button) or the Monte Carlo tool to update these results.
        Charts available in the <strong>Risk &amp; Resilience</strong> tab.
      </div>
    </div>`;
}

/**
 * Render the fan chart and histogram into the Risk tab canvases.
 * Called after runMonteCarloAnalysis() completes.
 */
function renderMonteCarloCharts(mc, inp) {
  if (typeof Chart === 'undefined' || !mc) return;

  const yearlyP = Array.isArray(mc.yearlyPercentiles) ? mc.yearlyPercentiles : [];
  const years = yearlyP.length > 0
    ? yearlyP.map((_, i) => (inp?.retireAge || 65) + i)
    : (inp ? Array.from(
      { length: Math.max(0, (inp.lifespan || 85) - (inp.retireAge || 65)) },
      (_, i) => (inp.retireAge || 65) + i
    ) : []);

  // ── Fan chart ──
  const fanWrap = document.getElementById('adv2-fan-chart-wrap');
  const fanCanvas = document.getElementById('adv2-fan-chart');
  if (fanWrap && fanCanvas && years.length > 0) {
    fanWrap.style.display = 'block';
    const existingFan = APP_STATE.chartManager.charts.adv2FanChart;
    if (existingFan) existingFan.destroy();

    const labels = years.map(String);

    let p10Data, p50Data, p90Data;
    if (yearlyP.length === years.length) {
      p10Data = yearlyP.map((y) => Math.max(0, y.p10 || 0));
      p50Data = yearlyP.map((y) => Math.max(0, y.p50 || 0));
      p90Data = yearlyP.map((y) => Math.max(0, y.p90 || 0));
    } else {
      // Fallback: simple linear extrapolation from known percentiles
      p50Data = years.map((_, i) => Math.max(0, (mc.median || 0) * (1 - i / years.length * 0.4)));
      p10Data = years.map((_, i) => Math.max(0, (mc.percentile10 || 0) * (1 - i / years.length * 0.6)));
      p90Data = years.map((_, i) => Math.max(0, (mc.percentile90 || 0) * (1 - i / years.length * 0.2)));
    }

    APP_STATE.chartManager.charts.adv2FanChart = new Chart(fanCanvas.getContext('2d'), {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: '90th percentile (optimistic)',
            data: p90Data,
            borderColor: 'oklch(0.50 0.09 155)',
            backgroundColor: 'oklch(0.50 0.09 155 / 0.12)',
            fill: '+1',
            borderWidth: 1.5,
            pointRadius: 0,
            tension: 0.3,
          },
          {
            label: 'Median',
            data: p50Data,
            borderColor: 'oklch(0.50 0.09 155)',
            backgroundColor: 'oklch(0.50 0.09 155 / 0.06)',
            fill: '+1',
            borderWidth: 2.5,
            pointRadius: 0,
            tension: 0.3,
          },
          {
            label: '10th percentile (pessimistic)',
            data: p10Data,
            borderColor: 'oklch(0.62 0.13 25)',
            backgroundColor: 'transparent',
            fill: false,
            borderWidth: 1.5,
            borderDash: [4, 3],
            pointRadius: 0,
            tension: 0.3,
          },
        ],
      },
      options: {
        animation: false,
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 2.5,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 14, font: { size: 11 } } },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ${fmt$(ctx.parsed.y, { compact: true })}`,
            },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 }, maxTicksLimit: 8 } },
          y: {
            ticks: {
              font: { size: 10 },
              callback: (v) => fmt$(v, { compact: true }),
              maxTicksLimit: 6,
            },
          },
        },
      },
    });
  }

  // ── Histogram ──
  // The MC result object stores final balances in mc.outcomes (from simulator.js
  // runMonteCarloSimulation) or mc.statistics?.outcomes (from EnhancedMonteCarloEngine).
  // mc.finalBalances does not exist — always use mc.outcomes.
  const histWrap = document.getElementById('adv2-hist-chart-wrap');
  const histCanvas = document.getElementById('adv2-hist-chart');
  const rawOutcomes = mc.outcomes || mc.statistics?.outcomes || [];
  if (histWrap && histCanvas && rawOutcomes.length > 0) {
    histWrap.style.display = 'block';
    const existingHist = APP_STATE.chartManager.charts.adv2HistChart;
    if (existingHist) existingHist.destroy();

    // Build histogram from final balances
    const balances = rawOutcomes
      .map((b) => Number(b))
      .filter((b) => Number.isFinite(b));
    if (!balances.length) return;
    const buckets = 20;
    const minBal = Math.min(...balances);
    const maxBal = Math.max(...balances);
    const range = maxBal - minBal;
    const bucketSize = range > 0 ? range / buckets : 1;
    const counts = Array(buckets).fill(0);
    balances.forEach((b) => {
      const normalised = bucketSize > 0 ? (b - minBal) / bucketSize : 0;
      const idx = Math.min(buckets - 1, Math.max(0, Math.floor(normalised)));
      counts[idx]++;
    });
    const histLabels = counts.map((_, i) => fmt$(minBal + ((i + 0.5) * bucketSize), { compact: true }));
    const medianBucket = Math.min(
      buckets - 1,
      Math.max(0, Math.floor(((mc.median || 0) - minBal) / bucketSize))
    );

    APP_STATE.chartManager.charts.adv2HistChart = new Chart(histCanvas.getContext('2d'), {
      type: 'bar',
      data: {
        labels: histLabels,
        datasets: [
          {
            label: 'Frequency',
            data: counts,
            backgroundColor: counts.map((_, i) =>
              i === medianBucket
                ? 'oklch(0.50 0.09 155 / 0.85)'
                : 'oklch(0.50 0.09 155 / 0.35)'
            ),
            borderColor: 'oklch(0.50 0.09 155)',
            borderWidth: 1,
          },
        ],
      },
      options: {
        animation: false,
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 2.5,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (items) => `Balance ~${items[0].label}`,
              label: (ctx) => `${ctx.parsed.y} simulations`,
            },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 9 }, maxTicksLimit: 8 } },
          y: { ticks: { font: { size: 10 }, maxTicksLimit: 5 }, title: { display: true, text: 'Scenarios', font: { size: 10 } } },
        },
      },
    });
  }
}

function buildCareerImpactBlock(inp) {
  if (!inp || !inp.age) return '';
  const items = [];

  // Caring for ageing parents (work-reduction impact)
  if (inp.isCarer && inp.carerYearsExpected > 0) {
    const reducedPct = inp.carerReducedWorkPercent || 0;
    const baseSalary = inp.salary || 0;
    const annualIncomeLoss = baseSalary * (reducedPct / 100);
    const totalIncomeLoss = annualIncomeLoss * inp.carerYearsExpected;
    const superLoss = totalIncomeLoss * 0.12;
    const yrs = inp.carerYearsExpected;
    items.push(`
      <div class="mc-stat">
        <div class="mc-k">Caring for parents · ${yrs} yr${yrs > 1 ? 's' : ''}</div>
        <div class="mc-v">−${reducedPct}% income</div>
        <div class="mc-sub">Est. ${fmt$(totalIncomeLoss, { compact: true })} income · ${fmt$(superLoss, { compact: true })} super foregone</div>
      </div>`);
  }

  // Family financial obligations (expenses) — shown independently of isCarer flag
  const carerExpenseOnly = inp.isCarer ? (inp.carerAnnualExpense || 0) : 0;
  const parentSupport = inp.annualParentSupport || 0;
  const spousalAmt = inp.hasSpousalMaintenance ? (inp.annualSpousalMaintenance || 0) : 0;
  const childSupportAmt = inp.hasChildSupport ? (inp.annualChildSupport || 0) : 0;
  const totalFamilyExpense = carerExpenseOnly + parentSupport + spousalAmt + childSupportAmt;
  if (totalFamilyExpense > 0) {
    const lines = [];
    if (carerExpenseOnly > 0) lines.push(`Carer costs ${fmt$(carerExpenseOnly)}/yr`);
    if (parentSupport > 0) lines.push(`Family support ${fmt$(parentSupport)}/yr`);
    if (spousalAmt > 0) lines.push(`Spousal maintenance ${fmt$(spousalAmt)}/yr`);
    if (childSupportAmt > 0) lines.push(`Child support ${fmt$(childSupportAmt)}/yr`);
    items.push(`
      <div class="mc-stat">
        <div class="mc-k">Family obligations</div>
        <div class="mc-v">${fmt$(totalFamilyExpense)}/yr total</div>
        <div class="mc-sub">${lines.join(' · ')}</div>
      </div>`);
  }

  // Reduced income before retirement (wind-down phase)
  if (inp.reducedIncomeEnabled && inp.reducedIncomeAge > 0 && inp.reducedIncomeSalary >= 0) {
    const retireAge = inp.retireAge || 65;
    const yearsReduced = Math.max(0, retireAge - inp.reducedIncomeAge);
    if (yearsReduced > 0) {
      const annualDiff = Math.max(0, (inp.salary || 0) - inp.reducedIncomeSalary);
      const cumulativeDiff = annualDiff * yearsReduced;
      const superDiff = cumulativeDiff * 0.12;
      items.push(`
      <div class="mc-stat">
        <div class="mc-k">Reduced income from age ${inp.reducedIncomeAge}</div>
        <div class="mc-v">${fmt$(inp.reducedIncomeSalary)}/yr</div>
        <div class="mc-sub">${yearsReduced} yr${yearsReduced > 1 ? 's' : ''} · ${fmt$(cumulativeDiff, { compact: true })} cumulative less · ${fmt$(superDiff, { compact: true })} super impact</div>
      </div>`);
    }
  }

  // Children's education costs
  const numChildren = inp.dependents || 0;
  if (numChildren > 0 && inp.educationCostPerChild > 0) {
    const yearsPerChild = inp.privateSchool ? 13 : (inp.uniSupport ? 3 : 0);
    const totalEd = numChildren * inp.educationCostPerChild * Math.max(1, yearsPerChild);
    items.push(`
      <div class="mc-stat">
        <div class="mc-k">Education · ${numChildren} child${numChildren > 1 ? 'ren' : ''}</div>
        <div class="mc-v">${fmt$(inp.educationCostPerChild)}/yr each</div>
        <div class="mc-sub">${inp.privateSchool ? 'Private school (13 yrs)' : inp.uniSupport ? 'University support (3 yrs)' : 'Annual contribution'} · Est. ${fmt$(totalEd, { compact: true })} total</div>
      </div>`);
  }

  // Overseas retirement cost summary
  if (inp.goingOverseas && inp.ageMovingOverseas > 0 && inp.annualLivingCostOverseas > 0) {
    const freq = inp.returnFrequency || 'never';
    const travelPerPerson = { annually: 5000, biannually: 10000, quarterly: 20000, seasonal: 30000, never: 0 }[freq] ?? 0;
    const travelTotal = travelPerPerson * (inp.household === 'couple' ? 2 : 1);
    const overseasTotal = inp.annualLivingCostOverseas + travelTotal;
    items.push(`
      <div class="mc-stat">
        <div class="mc-k">Overseas retirement from age ${inp.ageMovingOverseas}</div>
        <div class="mc-v">${fmt$(overseasTotal)}/yr</div>
        <div class="mc-sub">${fmt$(inp.annualLivingCostOverseas)} living + ${fmt$(travelTotal)} return travel (${freq})</div>
      </div>`);
  }

  if (!items.length) return '';

  return `
    <div class="summary-chart" style="grid-column:1/-1">
      <h5>Life events factored into this projection</h5>
      <div class="desc">These irregular income changes and expenses are already modelled year-by-year in the simulation. Monte Carlo runs scatter investment returns and inflation around these values — the Year-by-Year table reflects their direct impact.</div>
      <div class="mc-results-grid" style="margin-top:10px">
        ${items.join('')}
      </div>
    </div>`;
}

/**
 * Build a plain-text (no HTML) version of the narrative for PDF export.
 */
function buildPlainEnglishNarrativeText(adaptedResult, inp, mc) {
  if (!adaptedResult || !inp?.age) return null;

  const lastsUntil = adaptedResult.lastsUntil;
  const lifespan = inp.lifespan || 90;
  const monthlyPaycheck = adaptedResult.monthlyPaycheck || 0;
  const asfaMonthly = (inp.household === 'couple') ? 5900 : 4080;
  const asfaLabel = (inp.household === 'couple') ? 'ASFA comfortable couple' : 'ASFA comfortable single';

  const paycheckVsAsfa = monthlyPaycheck >= asfaMonthly
    ? `Your monthly retirement paycheck of ${fmt$(monthlyPaycheck)} meets the ${asfaLabel} standard of ${fmt$(asfaMonthly)}/month.`
    : `Your monthly retirement paycheck of ${fmt$(monthlyPaycheck)} is below the ${asfaLabel} standard of ${fmt$(asfaMonthly)}/month — consider increasing savings.`;

  let fundingLine;
  if (!lastsUntil || lastsUntil === 0) {
    fundingLine = 'Your funds are projected to run out before retirement — urgent action needed.';
  } else if (lastsUntil >= lifespan) {
    fundingLine = `Your retirement savings are projected to cover your full planned lifespan to age ${lifespan}.`;
  } else {
    const shortfall = lifespan - lastsUntil;
    fundingLine = `Your funds are projected to last until age ${lastsUntil}, which is ${shortfall} year${shortfall !== 1 ? 's' : ''} short of your planned lifespan (${lifespan}).`;
  }

  let topRisk = 'longevity';
  if (inp.healthCondition === 'poor' || inp.healthCondition === 'fair') topRisk = 'healthcare costs';
  else if (mc && (mc.successRate || 0) < 0.7) topRisk = 'investment sequence of returns';
  else if ((inp.inflation || 2.6) > 3.5) topRisk = 'high inflation';
  else if (lastsUntil && lastsUntil < lifespan) topRisk = 'insufficient savings rate';

  return `${fundingLine} ${paycheckVsAsfa} Your biggest risk factor is ${topRisk}. Use the AI Recommendations section for prioritised actions to strengthen your plan.`;
}

/**
 * Build a plain-English narrative summary of the retirement plan.
 * Surfaces the most important outcomes in 2–3 readable sentences.
 */
function buildPlainEnglishNarrative(adaptedResult, inp, mc) {
  if (!adaptedResult || !inp?.age) return '';

  const lastsUntil = adaptedResult.lastsUntil;
  const lifespan = inp.lifespan || 90;
  const retireAge = inp.retireAge || 65;
  const monthlyPaycheck = adaptedResult.monthlyPaycheck || 0;
  // ASFA comfortable 2025: $5,900/month couple, $4,080/month single
  const asfaMonthly = (inp.household === 'couple') ? 5900 : 4080;
  const asfaLabel = (inp.household === 'couple') ? 'ASFA comfortable couple' : 'ASFA comfortable single';
  const paycheckVsAsfa = monthlyPaycheck >= asfaMonthly
    ? `your monthly retirement paycheck of ${fmt$(monthlyPaycheck)} <b>meets</b> the ${asfaLabel} standard of ${fmt$(asfaMonthly)}/month`
    : `your monthly retirement paycheck of ${fmt$(monthlyPaycheck)} is <b>below</b> the ${asfaLabel} standard of ${fmt$(asfaMonthly)}/month — you may need to adjust your target income or savings rate`;

  let fundingLine;
  if (!lastsUntil || lastsUntil === 0) {
    fundingLine = 'Your funds are projected to <b>run out before retirement</b> — urgent action needed.';
  } else if (lastsUntil >= lifespan) {
    fundingLine = `Your retirement savings are projected to <b>cover your full planned lifespan to age ${lifespan}</b>.`;
  } else {
    const shortfall = lifespan - lastsUntil;
    fundingLine = `Your funds are projected to last until age <b>${lastsUntil}</b>, which is <b>${shortfall} year${shortfall !== 1 ? 's' : ''} short</b> of your planned lifespan (${lifespan}).`;
  }

  // Identify the top risk
  let topRisk = 'longevity';
  if (inp.healthCondition === 'poor' || inp.healthCondition === 'fair') topRisk = 'healthcare costs';
  else if (mc && (mc.successRate || 0) < 0.7) topRisk = 'investment sequence of returns';
  else if ((inp.inflation || 2.6) > 3.5) topRisk = 'high inflation';
  else if (lastsUntil && lastsUntil < lifespan) topRisk = 'insufficient savings rate';

  const riskLine = `Your biggest risk factor is <b>${topRisk}</b>.`;

  // Downsize extension hint
  const downsizeLine = (inp.downsizePlan === 'yes' && adaptedResult.superAtRetire > 0)
    ? ' Proceeding with your planned downsize will provide a lump-sum injection \u2014 revisit the Year-by-Year table after it is modelled.'
    : '';

  return `
    <div class="summary-chart" style="grid-column:1/-1;background:linear-gradient(135deg,var(--surface) 0%,color-mix(in srgb,var(--accent) 6%,var(--surface)) 100%);border:1.5px solid color-mix(in srgb,var(--accent) 25%,var(--border))">
      <h5 style="color:var(--accent)">📖 Plain-English Summary</h5>
      <p style="margin:0 0 10px;line-height:1.7;font-size:14px">${fundingLine} Based on your inputs, ${paycheckVsAsfa}.${downsizeLine}</p>
      <p style="margin:0;line-height:1.7;font-size:14px;color:var(--ink-2)">${riskLine} Use the <b>AI Recommendations</b> tab for prioritised actions to strengthen your plan.</p>
    </div>`;
}

/**
 * Build the "Retirement Target Builder" card — shows what income the user will
 * actually need in retirement by subtracting one-off pre-retirement costs from
 * their current spending.
 */
function buildRetirementTargetBuilder(inp) {
  if (!inp?.age) return '';

  const currentSpending = (inp.desiredIncome || 0);
  if (currentSpending <= 0) return '';

  // Mortgage costs that end at retirement
  const annualMortgage = inp.mortgage > 0
    ? Math.min(currentSpending * 0.25, (inp.mortgage * pct(inp.mortgageRate || 5, 5) * 1.1))
    : 0;

  // Children / education costs that end when youngest child finishes uni (est. age 22)
  const childrenCosts = inp.dependents > 0
    ? Math.min(currentSpending * 0.15,
        inp.dependents * ((inp.educationCostPerChild || 0) / Math.max(1, (22 - (inp.youngestChildAge || 10)))))
    : 0;

  // Healthcare premium uplift in retirement (healthcare tends to grow faster than general inflation)
  const hcUplift = (inp.hasPrivateHospital ? 2500 : 0) + (inp.healthCondition === 'fair' ? 3000 : 0) + (inp.healthCondition === 'poor' ? 6000 : 0);

  const estimatedRetirementNeed = Math.max(0, currentSpending - annualMortgage - childrenCosts + hcUplift);
  const monthly = Math.round(estimatedRetirementNeed / 12);
  const asfaComfortable = (inp.household === 'couple') ? 70800 : 48960;
  const rows = [
    { label: 'Your target retirement income', val: fmt$(currentSpending) + '/yr', note: 'As entered' },
    annualMortgage > 0 ? { label: '− Mortgage payments (end at retirement)', val: `−${fmt$(Math.round(annualMortgage))}/yr`, note: 'Freed up' } : null,
    childrenCosts > 0 ? { label: '− Children / education costs', val: `−${fmt$(Math.round(childrenCosts))}/yr`, note: 'Freed up' } : null,
    hcUplift > 0 ? { label: '+ Healthcare premium uplift', val: `+${fmt$(hcUplift)}/yr`, note: 'Retirement health costs tend to rise faster than CPI' } : null,
    { label: '= Estimated lifestyle need in retirement', val: `<b>${fmt$(Math.round(estimatedRetirementNeed))}/yr</b>`, note: `${fmt$(monthly)}/month`, bold: true },
    { label: 'ASFA comfortable standard (2025)', val: fmt$(asfaComfortable) + '/yr', note: `${(inp.household === 'couple') ? 'Couple' : 'Single'} — covers a comfortable lifestyle without being extravagant` },
  ].filter(Boolean);

  return `
    <div class="summary-chart" style="grid-column:1/-1">
      <h5>🎯 Retirement Target Builder</h5>
      <div class="desc">What you'll actually need in retirement — your current spending adjusted for costs that stop (mortgage, children) and costs that grow (healthcare).</div>
      <div class="mc-results-grid" style="margin-top:12px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr))">
        ${rows.map((r) => `
          <div class="mc-stat" style="${r.bold ? 'background:color-mix(in srgb,var(--accent) 8%,var(--surface));border:1px solid color-mix(in srgb,var(--accent) 20%,var(--border))' : ''}">
            <div class="mc-k">${r.label}</div>
            <div class="mc-v" style="${r.bold ? 'color:var(--accent)' : ''}">${r.val}</div>
            <div class="mc-sub">${r.note}</div>
          </div>
        `).join('')}
      </div>
      <p style="margin:10px 0 0;font-size:12px;color:var(--ink-3)">These adjustments are indicative only. Actual retirement costs vary by health, lifestyle, and personal circumstances.</p>
    </div>`;
}

/**
 * Build a Sequence of Returns Risk callout for the risk/summary panel.
 * Uses MC results when available to estimate early-crash vs late-crash impact.
 */
function buildSequenceOfReturnsCallout(mc, adaptedResult, inp) {
  if (!inp?.age || !adaptedResult) return '';

  // If we have MC results, compute early crash vs late crash delta
  // using available percentile outputs.
  let earlyRiskHtml = '';
  let lateRiskHtml = '';
  const mcWorst = mc?.percentiles?.p10 ?? mc?.percentile10;
  const mcBest = mc?.percentiles?.p90 ?? mc?.percentile90;
  if (mcWorst != null && mcBest != null) {
    const best = mcBest || 0;
    const worst = mcWorst || 0;
    const spread = best - worst;
    const spreadYears = adaptedResult?.monthlyPaycheck > 0
      ? Math.round(spread / ((adaptedResult.monthlyPaycheck * 12) || 1))
      : 0;
    earlyRiskHtml = `<div class="mc-stat"><div class="mc-k">🔴 Crash in Year 1 of retirement</div><div class="mc-v" style="color:var(--danger)">${fmt$(worst, { compact: true })}</div><div class="mc-sub">10th-percentile final balance</div></div>`;
    lateRiskHtml = `<div class="mc-stat"><div class="mc-k">🟢 Strong early returns</div><div class="mc-v" style="color:var(--success)">${fmt$(best, { compact: true })}</div><div class="mc-sub">90th-percentile final balance</div></div>`;
    if (spreadYears > 0) {
      const planHorizonYears = (inp.lifespan || 90) - (inp.retireAge || 65);
      const cappedSpread = Math.min(spreadYears, planHorizonYears);
      const suffix = spreadYears > planHorizonYears ? " (maximum plan horizon)" : "";
      
      let detailText = `A crash in year 1 vs strong early returns can mean ${cappedSpread} years' difference in portfolio longevity${suffix}.`;
      if (best > 0 && worst > 0 && spreadYears > planHorizonYears) {
          detailText = "The strong early returns path never depletes within your planned lifespan; the impact spread exceeds your planning horizon.";
      }

      earlyRiskHtml += `<div class="mc-stat" style="grid-column:1/-1"><div class="mc-k">Impact spread</div><div class="mc-v">${cappedSpread} years${suffix}</div><div class="mc-sub">${detailText}</div></div>`;
    }
  } else if (adaptedResult) {
    const baseBalance = adaptedResult.finalBalance || 0;
    const earlyBad = Math.round(baseBalance * 0.55); // ~45% drop scenario
    const lateBad = Math.round(baseBalance * 0.80);  // ~20% drop scenario
    earlyRiskHtml = `<div class="mc-stat"><div class="mc-k">🔴 Crash in Year 1 (estimated)</div><div class="mc-v" style="color:var(--danger)">${fmt$(earlyBad, { compact: true })}</div><div class="mc-sub">~45% reduction in final balance vs base case</div></div>`;
    lateRiskHtml = `<div class="mc-stat"><div class="mc-k">🟡 Crash in Year 10 (estimated)</div><div class="mc-v" style="color:var(--warning)">${fmt$(lateBad, { compact: true })}</div><div class="mc-sub">~20% reduction in final balance vs base case</div></div>`;
  }

  if (!earlyRiskHtml) return '';

  return `
    <div class="summary-chart">
      <h5>⚡ Sequence of Returns Risk</h5>
      <div class="desc">When a market crash occurs matters enormously. A crash in your first year of retirement is far more damaging than one a decade later — your portfolio has less time to recover while you're still drawing from it.</div>
      <div class="mc-results-grid" style="margin-top:10px">
        ${earlyRiskHtml}
        ${lateRiskHtml}
      </div>
      <p style="margin:10px 0 0;font-size:12px;color:var(--ink-3)">Run Monte Carlo with 5,000+ runs for a more accurate spread. Consider holding 1–2 years of income in cash as a buffer against early retirement crashes.</p>
    </div>`;
}

function renderSummaryPanel() {
  const state = APP_STATE;
  const projectionQuality = state.projection?.diagnostics?.projectionQuality || {
    blockingIssues: [], warnings: [], information: [], valid: true,
  };
  const qualityBlock = `
    <div class="summary-chart" style="grid-column:1/-1;border:${projectionQuality.valid ? '1px solid var(--border)' : '2px solid var(--danger)'}">
      <h5>Projection Quality Check</h5>
      <div class="mc-results-grid" style="margin-top:10px">
        <div class="mc-stat"><div class="mc-k">Calculator source</div><div class="mc-v">retirement-v3</div></div>
        <div class="mc-stat"><div class="mc-k">Input hash</div><div class="mc-v" style="font-size:12px">${escapeHtml(state.projection?.inputHash || '—')}</div></div>
        <div class="mc-stat"><div class="mc-k">Projection hash</div><div class="mc-v" style="font-size:12px">${escapeHtml(state.projection?.projectionHash || '—')}</div></div>
        <div class="mc-stat"><div class="mc-k">Scenario mode</div><div class="mc-v">${escapeHtml(state.projection?.diagnostics?.scenarioMode || 'base')}</div></div>
        <div class="mc-stat"><div class="mc-k">Return basis</div><div class="mc-v">Nominal</div></div>
        <div class="mc-stat"><div class="mc-k">Monte Carlo</div><div class="mc-v">${state.monteCarloResults ? 'Run' : 'Not run'}</div></div>
        <div class="mc-stat"><div class="mc-k">Warnings</div><div class="mc-v">${projectionQuality.warnings?.length || 0}</div></div>
        <div class="mc-stat"><div class="mc-k">Blocking issues</div><div class="mc-v">${projectionQuality.blockingIssues?.length || 0}</div></div>
      </div>
      ${(projectionQuality.warnings || []).length ? `<ul style="margin:10px 0 0 18px">${projectionQuality.warnings.map(item => `<li>${escapeHtml(item.message)}</li>`).join('')}</ul>` : ''}
    </div>`;

  const bottomLine = document.getElementById('adv2-bottom-line');
  if (bottomLine) {
    bottomLine.style.display = 'block';

    // Lifestyle goals
    const blLifestyle = document.getElementById('bl-lifestyle');
    if (blLifestyle) {
      const status = state.simulation?.finalBalance > 0 ? 'Affordable' : 'Tight';
      const years = state.simulation?.depletionAge ? `until age ${state.simulation.depletionAge}` : `for full lifespan`;
      blLifestyle.innerHTML = `<strong>${status}:</strong> Plan sustains your lifestyle ${years}.`;
    }

    // Crash net
    const blCrash = document.getElementById('bl-crash');
    if (blCrash) {
      const hasBuffer = state.simulation?.accumulatedSavingsBalance > (state.input?.desiredIncome * 0.5);
      blCrash.innerHTML = hasBuffer
        ? `<strong>Resilient:</strong> ${fmt$(state.simulation.accumulatedSavingsBalance, {compact:true})} cash buffer available.`
        : `<strong>Exposure:</strong> Low cash reserves — downturn risk elevated.`;
    }

    // Transition
    const blTransition = document.getElementById('bl-transition');
    if (blTransition) {
      const startPensionYear = state.simulation?.yearlyData.find(y => y.pensionIncome > 0);
      blTransition.innerHTML = startPensionYear
        ? `<strong>Hybrid:</strong> Part-pension transition at age ${startPensionYear.age}.`
        : `<strong>Self-Funded:</strong> Fully funded for the projected period.`;
    }
  }

  const _spendToday = (state.adaptedResult?.plannedSpendingToday / 12) || 0;
  const _spendNominal = state.adaptedResult?.plannedSpendingNominal
    ? state.adaptedResult.plannedSpendingNominal / 12
    : (() => {
        const yrs = Math.max(0, (state.input?.retireAge || 67) - (state.input?.age || 50));
        return _spendToday * Math.pow(1 + (state.input?.inflation || 2.6) / 100, yrs);
      })();
  const summaryItems = [
    {
      label: 'Monthly planned spend (Yr 1)',
      value: fmt$(_spendToday),
      detail: `Today's $ · ≈ ${fmt$(Math.round(_spendNominal))} nominal at retirement`,
    },
    {
      label: 'Maximum sustainable draw',
      value: fmt$(state.adaptedResult?.swrMonthlyToday || 0),
      detail: '4% SWR ref (not for pass/fail)',
    },
    {
      label: 'Super at retirement',
      value: fmt$(state.adaptedResult?.superAtRetire || 0, { compact: true }),
      detail: "Today's dollars (inflation-adj)",
    },
    {
      label: 'Projected runway',
      value: `Age ${state.adaptedResult?.lastsUntil || '—'}`,
      detail: state.adaptedResult?.lastsUntil >= state.input?.lifespan ? 'Covers planned lifespan' : 'Needs more margin',
    },
  ];

  const monteCarloBlock = state.monteCarloResults
    ? buildMonteCarloDashboard(state.monteCarloResults, state.input)
    : `
      <div class="summary-chart">
        <h5>Core projection</h5>
        <div class="desc">Run Core Projection to refresh Monte Carlo and risk metrics. Suggestions, stress tests, overseas analysis, and retirement-age solve run on demand from Tools.</div>
        <div class="metric">
          <div class="k">Current live confidence</div>
          <div class="v">${Math.round((state.adaptedResult?.confidence || 0) * 100)}%</div>
        </div>
      </div>`;

  const recommendationState = getSecondaryAnalysisState('recommendations');
  const recommendationLead = recommendationState.stale
    ? `<div class="summary-chart">
        <h5>Top recommendation</h5>
        <div class="desc">Suggestions are from older inputs.</div>
        ${secondaryStaleNotice({
    title: 'Suggestions need refresh.',
    message: 'Run Suggestions again so this summary reflects your latest inputs.',
    buttonLabel: 'Refresh Suggestions',
    toolId: 'tool-ai',
  })}
      </div>`
    : state.recommendations?.[0]
    ? `<div class="summary-chart">
        <h5>Top recommendation</h5>
        <div class="desc">${escapeHtml(state.recommendations[0].category || 'Strategy')}</div>
        <p style="margin:0 0 8px;font-weight:600">${escapeHtml(state.recommendations[0].title || 'Recommendation')}</p>
        <p style="margin:0;color:var(--ink-3)">${escapeHtml(state.recommendations[0].description || '')}</p>
      </div>`
    : '';

  // Assumptions transparency section
  const inp = state.input || {};
  const assumptionsBlock = inp.age ? `
    <div class="summary-chart" style="grid-column:1/-1">
      <h5>Assumptions used in this projection</h5>
      <div class="desc">These values are from your inputs or model defaults. User-entered values are marked.</div>
      <div class="mc-results-grid" style="margin-top:10px">
        <div class="mc-stat">
          <div class="mc-k">Investment return</div>
          <div class="mc-v">${(inp.invReturn || ENHANCED_CONFIG.DEFAULTS?.economic?.investmentReturn * 100 || 6.5).toFixed(1)}%</div>
          <div class="mc-sub">User entered</div>
        </div>
        <div class="mc-stat">
          <div class="mc-k">Inflation</div>
          <div class="mc-v">${(inp.inflation || ENHANCED_CONFIG.DEFAULTS?.economic?.inflation * 100 || 2.5).toFixed(1)}%</div>
          <div class="mc-sub">User entered</div>
        </div>
        <div class="mc-stat">
          <div class="mc-k">Healthcare inflation</div>
          <div class="mc-v">${((ENHANCED_CONFIG.DEFAULTS?.healthcare?.healthcareInflation || 0.055) * 100).toFixed(1)}%</div>
          <div class="mc-sub">Model default (AIHW long-run)</div>
        </div>
        <div class="mc-stat">
          <div class="mc-k">Aged care probability</div>
          <div class="mc-v">${(inp.agedCareProbability || 65)}%</div>
          <div class="mc-sub">User entered / AIHW default 65%</div>
        </div>
        <div class="mc-stat">
          <div class="mc-k">Age Pension age</div>
          <div class="mc-v">${inp.agePensionAge || 67}</div>
          <div class="mc-sub">User entered / legislative default</div>
        </div>
        <div class="mc-stat">
          <div class="mc-k">Retirement spending</div>
          <div class="mc-v">${fmt$(inp.desiredIncome || 0, { compact: true })}/yr</div>
          <div class="mc-sub">User entered</div>
        </div>
      </div>
    </div>` : '';

  const careerImpactBlock = buildCareerImpactBlock(inp);
  const narrativeBlock = buildPlainEnglishNarrative(state.adaptedResult, inp, state.monteCarloResults);
  const targetBuilderBlock = buildRetirementTargetBuilder(inp);
  const sorBlock = buildSequenceOfReturnsCallout(state.monteCarloResults, state.adaptedResult, inp);

  setPanelHtml('summary', `
    <div class="summary-grid">
      ${qualityBlock}
      <div class="summary-chart">
        <h5>Plan summary</h5>
        <div class="desc">Live deterministic projection from the shared retirement simulator.</div>
        <div class="metrics">
          ${summaryItems.map((item) => `
            <div class="metric">
              <div class="k">${escapeHtml(item.label)}</div>
              <div class="v">${item.value}</div>
              <div class="sub">${escapeHtml(item.detail)}</div>
            </div>
          `).join('')}
        </div>
      </div>
      ${monteCarloBlock}
      ${narrativeBlock}
    </div>
    ${targetBuilderBlock}
    ${sorBlock}
    ${recommendationLead}
    ${careerImpactBlock}
    ${assumptionsBlock}
  `);
}

function renderWhatIfPanel() {
  const state = APP_STATE;
  const baseMonthly = Math.round((state.adaptedResult?.plannedSpendingToday || 0) / 12);
  const baseRunway = state.adaptedResult?.lastsUntil || '—';
  const baseSuperAtRetire = state.adaptedResult?.superAtRetire || 0;

  setPanelHtml('whatif', `
    <div class="whatif-live">
      <div class="whatif-card whatif-card-wide">
        <h5>Live What-If</h5>
        <div class="desc">These sliders clone the current V3 input, apply the change, and rerun the same projection service used by the form.</div>
        <div class="whatif-baseline">
          <span><b>${escapeHtml(formatCurrency(baseMonthly))}</b>/mo planned spend</span>
          <span><b>Age ${escapeHtml(String(baseRunway))}</b> runway</span>
          <span><b>${escapeHtml(formatCurrency(baseSuperAtRetire))}</b> super at retirement</span>
        </div>
      </div>
      <div class="whatif-card">
        <label class="whatif-slider-label" for="whatif-extra-super">Extra into super <b id="whatif-extra-super-label">$0/mo</b></label>
        <input id="whatif-extra-super" type="range" min="0" max="3000" step="50" value="0" data-whatif-slider="extraSuper" />
      </div>
      <div class="whatif-card">
        <label class="whatif-slider-label" for="whatif-extra-mortgage">Extra onto mortgage <b id="whatif-extra-mortgage-label">$0/mo</b></label>
        <input id="whatif-extra-mortgage" type="range" min="0" max="3000" step="50" value="0" data-whatif-slider="extraMortgage" />
      </div>
      <div class="whatif-card">
        <label class="whatif-slider-label" for="whatif-delay-retirement">Delay retirement <b id="whatif-delay-retirement-label">0 yrs</b></label>
        <input id="whatif-delay-retirement" type="range" min="0" max="10" step="1" value="0" data-whatif-slider="delayRetirement" />
      </div>
      <div class="whatif-card whatif-card-wide" id="whatif-live-result" aria-live="polite">
        <h5>Lift from these levers</h5>
        <div class="whatif-impact"><span class="pill">Move a slider to compare.</span></div>
      </div>
    </div>
  `);
  bindV3WhatIfControls();
}

let v3WhatIfDebounce;
function bindV3WhatIfControls() {
  const sliders = Array.from(document.querySelectorAll('[data-whatif-slider]'));
  if (!sliders.length) return;
  const update = () => {
    clearTimeout(v3WhatIfDebounce);
    v3WhatIfDebounce = setTimeout(runV3WhatIfProjection, 150);
  };
  sliders.forEach((slider) => slider.addEventListener('input', update));
  runV3WhatIfProjection();
}

function runV3WhatIfProjection() {
  const resultEl = document.getElementById('whatif-live-result');
  if (!resultEl || !APP_STATE.input || !APP_STATE.adaptedResult) return;
  const extraSuper = num('whatif-extra-super', 0);
  const extraMortgage = num('whatif-extra-mortgage', 0);
  const delayYears = num('whatif-delay-retirement', 0);
  setText('whatif-extra-super-label', `${formatCurrency(extraSuper)}/mo`);
  setText('whatif-extra-mortgage-label', `${formatCurrency(extraMortgage)}/mo`);
  setText('whatif-delay-retirement-label', `${delayYears} yrs`);

  const scenario = {
    ...APP_STATE.input,
    salarySacrifice: (APP_STATE.input.salarySacrifice || 0) + (extraSuper * 12),
    surplusToMortgageMonthly: (APP_STATE.input.surplusToMortgageMonthly || 0) + extraMortgage,
    retireAge: (APP_STATE.input.retireAge || 0) + delayYears,
  };
  if (scenario.household === 'couple' && scenario.partnerRetireAge) {
    scenario.partnerRetireAge += delayYears;
  }

  try {
    const projection = projectionService.computeProjection(scenario, { sourceCalculator: 'retirement-v3-whatif' });
    const next = projection.adaptedResult || {};
    const base = APP_STATE.adaptedResult || {};
    const superLift = (next.superAtRetire || 0) - (base.superAtRetire || 0);
    const runwayLift = Number.isFinite(Number(next.lastsUntil)) && Number.isFinite(Number(base.lastsUntil))
      ? Number(next.lastsUntil) - Number(base.lastsUntil)
      : 0;
    const monthly = Math.round((next.plannedSpendingToday || 0) / 12);
    const effectiveLifespan = scenario.lifespan === 0 ? 120 : scenario.lifespan;
    const status = (next.lastsUntil || 0) >= effectiveLifespan ? 'on track' : (next.lastsUntil || 0) >= effectiveLifespan - 5 ? 'review' : 'shortfall';
    resultEl.innerHTML = `
      <h5>Lift from these levers</h5>
      <div class="whatif-impact">
        <span class="pill good"><b>${escapeHtml(formatCurrency(monthly))}</b>/mo planned spend</span>
        <span class="pill"><b>${superLift >= 0 ? '+' : ''}${escapeHtml(formatCurrency(superLift))}</b> super at retirement</span>
        <span class="pill"><b>${runwayLift >= 0 ? '+' : ''}${runwayLift}</b> runway years</span>
        <span class="pill whatif-status-${status.replace(' ', '-')}"><b>${escapeHtml(status)}</b></span>
      </div>
      <p style="margin:10px 0 0;color:var(--ink-3)">Equivalent to editing annual salary sacrifice, mortgage surplus allocation, and retirement age in the form, then rerunning Core Projection.</p>
    `;
  } catch (error) {
    resultEl.innerHTML = `<h5>Lift from these levers</h5><p style="margin:0;color:var(--rose)">${escapeHtml(error.message || String(error))}</p>`;
  }
}

function renderRiskPanel() {
  const risk = APP_STATE.riskProfile;
  const stressStale = getSecondaryAnalysisState('stress').stale;
  const stressRows = stressStale ? [] : (APP_STATE.stressTestResults || []);

  // If neither risk profile nor stress results are available, show a prompt.
  if (!risk && stressRows.length === 0) {
    setPanelHtml('risk', '<p style="color:var(--ink-3)">Run Monte Carlo or the Stress Test tool to generate your risk profile and scenario results.</p>');
    return;
  }

  // Build the risk profile section — only when profile data is available.
  // If only stress tests have been run (risk === null), show a placeholder for the profile.
  const toleranceNote = risk && risk.riskTolerance != null && risk.riskCapacity != null
    && risk.riskTolerance > 75 && risk.riskCapacity < 60
    ? `<p style="margin:10px 0 0;font-size:12.5px;color:var(--gold);background:var(--gold-soft);border-radius:8px;padding:8px 10px">
        Your risk tolerance score is high (${risk.riskTolerance}/100), but your overall profile is ${escapeHtml(risk.overallRiskProfile || 'balanced')}
        because your risk capacity (${risk.riskCapacity}/100) is more moderate. The recommendation blends all three dimensions —
        capacity, tolerance, and requirement — rather than relying on tolerance alone.
       </p>`
    : (risk?.misalignment?.message ? `<p style="margin:12px 0 0;color:var(--ink-3)">${escapeHtml(risk.misalignment.message)}</p>` : '');

  // Risk profile section — shown when MC has been run; placeholder otherwise.
  const riskProfileSection = risk ? `
      <div class="summary-chart">
        <h5>Risk profile</h5>
        <div class="desc">Three-dimensional risk assessment: capacity × tolerance × requirement</div>
        <div class="mc-results-grid" style="margin-top:10px">
          <div class="mc-stat">
            <div class="mc-k">Capacity</div>
            <div class="mc-v">${risk.riskCapacity ?? '—'}</div>
            <div class="mc-sub">Ability to absorb losses</div>
          </div>
          <div class="mc-stat">
            <div class="mc-k">Tolerance</div>
            <div class="mc-v">${risk.riskTolerance ?? '—'}</div>
            <div class="mc-sub">Willingness to accept risk</div>
          </div>
          <div class="mc-stat">
            <div class="mc-k">Requirement</div>
            <div class="mc-v">${risk.riskRequirement ?? '—'}</div>
            <div class="mc-sub">Return needed for goals</div>
          </div>
          <div class="mc-stat">
            <div class="mc-k">Confidence</div>
            <div class="mc-v">${risk.confidence ?? '—'}<span style="font-size:11px">%</span></div>
            <div class="mc-sub">Assessment reliability</div>
          </div>
        </div>
        <div style="margin-top:10px;padding:10px;border-radius:12px;background:var(--accent-soft);font-size:13px;font-weight:600;color:var(--accent-ink)">
          Overall profile: ${escapeHtml(risk.overallRiskProfile || 'Balanced')}
        </div>
        ${toleranceNote}
      </div>` : `
      <div class="summary-chart">
        <h5>Risk profile</h5>
        <div class="desc">Run Monte Carlo or Core Projection to generate your three-dimensional risk assessment.</div>
        <p style="margin:8px 0 0;color:var(--ink-3)">Use the 📊 Monte Carlo tool in the sidebar to assess capacity, tolerance, and requirement scores.</p>
      </div>`;

  setPanelHtml('risk', `
    <div class="summary-grid">
      ${riskProfileSection}
      <div class="summary-chart">
        <h5>Stress scenarios</h5>
        <div class="desc">Deterministic shock outcomes — how your plan holds up under each scenario.</div>
        ${stressStale ? secondaryStaleNotice({
    title: 'Stress scenarios need refresh.',
    message: 'Inputs changed since your last stress test.',
    buttonLabel: 'Re-run Stress Test',
    toolId: 'tool-stress',
  }) : ''}
        ${stressRows.length ? `
          <div style="display:grid;gap:10px">
            ${stressRows.map((row) => `
              <div style="padding:12px;border:1px solid var(--border);border-radius:16px;background:var(--surface)">
                <div style="display:flex;justify-content:space-between;gap:12px;font-weight:600">
                  <span style="font-size:13px">${escapeHtml(row.scenario)}</span>
                  <span style="color:${row.deltaBalance >= 0 ? 'var(--accent)' : 'var(--rose)'}">
                    ${row.deltaBalance >= 0 ? '+' : ''}${escapeHtml(formatCurrency(row.deltaBalance || 0))}
                  </span>
                </div>
                <div style="margin-top:4px;font-size:12px;color:var(--ink-3)">
                  Final balance: ${escapeHtml(formatCurrency(row.finalBalance || 0))}
                  ${!row.success ? ` <span style="color:var(--rose);font-weight:600">⚠ Depleted${row.depletionAge ? ` at age ${row.depletionAge}` : ''}</span>` : ''}
                </div>
                ${row.description ? `<div style="margin-top:3px;font-size:11px;color:var(--ink-4)">${escapeHtml(row.description)}</div>` : ''}
              </div>
            `).join('')}
          </div>
        ` : '<p style="margin:0;color:var(--ink-3)">Run the Stress Test tool to see how your plan responds to market crashes and other adverse events.</p>'}
      </div>
    </div>
    ${risk?.recommendations?.length ? `
      <div class="summary-chart" style="margin-top:16px">
        <h5>Risk-led actions</h5>
        <div class="desc">Top recommendations from the risk profiling engine based on your three-dimensional profile.</div>
        <div style="display:grid;gap:10px">
          ${risk.recommendations.map((item) => `
            <div style="padding:12px;border:1px solid var(--border);border-radius:16px;background:var(--surface)">
              ${escapeHtml(typeof item === 'string' ? item : (item.recommendation || item.title || item.action || 'Review your allocation settings'))}
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
    <!-- Chart canvases (shown/hidden by renderMonteCarloCharts after JS runs) -->
    <div id="adv2-fan-chart-wrap" class="panel-chart-wrap" style="display:none">
      <h5>Portfolio Balance Over Time — Percentile Bands</h5>
      <canvas id="adv2-fan-chart" class="panel-chart-canvas"></canvas>
    </div>
    <div id="adv2-hist-chart-wrap" class="panel-chart-wrap" style="display:none;margin-top:14px">
      <h5>Final Balance Distribution</h5>
      <canvas id="adv2-hist-chart" class="panel-chart-canvas"></canvas>
    </div>
  `);
}

/**
 * Generate property sell-timing analysis for the AI recommendations panel.
 * Only produced when the user has an investment property.
 * Based on ABS RPPI / Domain / ATO research:
 *   - Never sell before 12 months (CGT discount loss)
 *   - Optimal windows: rate cycle peaks, vacancy rate rising above 2%, yield < cash rate + 1%
 *   - Unit-specific: flag approaching depreciation cliff (year 12-15 of new build)
 *   - Strata: flag if special levy risk is elevated (proxy: high strata levy amount)
 */
function generatePropertySellTimingInsight(inp, engineInputs) {
  if (!inp?.investmentProperty) return null;

  const propType  = inp.ipType || 'unit';
  const isUnit    = propType === 'unit';
  const isTownhouse = propType === 'townhouse';
  const growthRate  = (inp.ipGrowthRate || 4);
  const grossYield  = inp.ipWeeklyRent > 0 && inp.ipValue > 0
      ? (inp.ipWeeklyRent * 52 / inp.ipValue * 100) : 0;
  const strataLevy  = inp.ipStrataLevy || 0;
  const ipValue     = inp.ipValue || 0;
  const strataLevyPct = ipValue > 0 ? (strataLevy / ipValue * 100) : 0;

  // Signals
  const signals = [];
  let urgency = 'low';

  // Signal 1: CGT 12-month discount (always relevant if held < 12 months)
  signals.push('Hold for at least 12 months to secure the 50% CGT discount. Selling at 11 months vs 13 months can cost $30k–$50k+ per owner in extra tax on a typical capital gain.');

  // Signal 2: Yield vs holding cost
  if (grossYield > 0 && grossYield < 4.5) {
    signals.push(`Gross rental yield of ~${grossYield.toFixed(1)}% is below the typical AU investment loan rate (~6.5%). You are negatively geared — this is beneficial while your marginal tax rate is high, but re-evaluate if your income drops in retirement.`);
    urgency = 'medium';
  }

  // Signal 3: Unit-specific — strata levy erosion
  if ((isUnit || isTownhouse) && strataLevyPct > 1.0) {
    signals.push(`Annual strata levy of $${strataLevy.toLocaleString()} (${strataLevyPct.toFixed(1)}% of property value) materially erodes your net rental yield. High strata costs relative to value is a sell indicator, particularly if a special levy (e.g., building defects, cladding rectification) is forthcoming.`);
    urgency = 'medium';
  }

  // Signal 4: Unit depreciation cliff
  if (isUnit) {
    signals.push('If your unit was purchased new (post-1985), significant plant & equipment depreciation deductions typically exhaust around years 12–15. After this point, the tax benefit of negative gearing reduces materially — recalculate your after-tax position at that point.');
  }

  // Signal 5: Growth rate vs capital city benchmark
  if (growthRate < 4.5 && isUnit) {
    signals.push(`Your entered growth rate of ${growthRate.toFixed(1)}% p.a. is below the long-run AU unit average (~5.5%). With strata costs, your real net return may be approaching the break-even point where alternative investments (index funds, additional super) outperform on a risk-adjusted basis.`);
    urgency = 'high';
  }

  // Signal 6: House vs unit long-run differential reminder
  if (isUnit) {
    signals.push('Research note: Over 25-year horizons, Australian houses have outperformed units by ~1.5 pp p.a. due to land appreciation. Units provide higher rental yields (typically +2 pp) and better depreciation benefits in early years, but this reverses at longer horizons. If your planned hold period is 20+ years, consider whether a house in the same area would deliver better net returns.');
  }

  return {
    category: 'Investment Property',
    title: `${propType === 'house' ? 'House' : propType === 'townhouse' ? 'Townhouse' : 'Unit/Apartment'} sell-timing analysis`,
    impact: urgency === 'high' ? 'high' : urgency === 'medium' ? 'medium' : 'low',
    description: signals[0], // Lead signal
    details: signals.slice(1),
    feasibility: 'Property-specific analysis — consult a financial adviser and tax agent before selling',
    successRateDiff: null,
    medianBalanceDiff: null,
    isSellTimingCard: true,
  };
}

function renderOverseasPanel() {
  if (getSecondaryAnalysisState('overseas').stale) {
    setPanelHtml('overseas', secondaryStaleNotice({
      title: 'Overseas analysis needs refresh.',
      message: 'Inputs changed since your last overseas run.',
      buttonLabel: 'Refresh Overseas Analysis',
      toolId: 'tool-overseas',
    }));
    return;
  }

  const analysis = APP_STATE.overseasAnalysis;
  const exportData = APP_STATE.overseasExportData;

  if (!analysis || analysis.error) {
    setPanelHtml('overseas', '<p style="color:var(--ink-3)">Enable an overseas destination in the Overseas section, then click the Overseas Analysis tool.</p>');
    return;
  }

  const pension = analysis.agePensionPortability || {};
  const pc = pension.pensionCalculation || {};
  const cost = analysis.costOfLiving || {};
  const tax = analysis.taxImplications || {};
  const health = analysis.healthcare || {};
  const visa = analysis.visaRequirements || {};
  const risk = analysis.riskAssessment || {};
  const recs = analysis.recommendations || {};
  const fallback = analysis.fallbackScenario || null;
  const scenario = exportData?.scenarios?.[0] || {};
  const cfg = exportData?.config || {};

  const riskColor = (level) => level === 'LOW' ? 'var(--green)' : level === 'HIGH' ? 'var(--rose)' : 'var(--gold)';
  const riskBg   = (level) => level === 'LOW' ? 'var(--green-soft,#ecfdf5)' : level === 'HIGH' ? 'var(--rose-soft,#fff1f2)' : 'var(--gold-soft)';
  const suitColor = (s) => s === 'HIGHLY SUITABLE' ? 'var(--green)' : s === 'SUITABLE' ? 'var(--blue,#3b82f6)' : s === 'MODERATELY SUITABLE' ? 'var(--gold)' : 'var(--rose)';

  // AWLR progress bar
  const awlrYears = pension.AWLR || 0;
  const awlrPct = Math.min(100, Math.round((awlrYears / 35) * 100));
  const awlrColor = awlrPct >= 100 ? 'var(--green)' : awlrPct >= 70 ? 'var(--gold)' : 'var(--rose)';

  // 4-scenario tree rows
  const tree = pension.scenarioTree || {};
  const scenarioRows = [
    { label: 'Short absence (≤' + (pension.portabilityKickIn || 6) + ' wks)', data: tree.shortAbsence },
    { label: 'Long absence (6 wks – 26 wks)', data: tree.longAbsence },
    { label: 'Extended / proportional (>26 wks)', data: tree.proportional },
    { label: 'Permanent move', data: tree.permanentMove },
  ].filter(r => r.data);

  // Cost of living columns
  const annualBudget = scenario.annualCost || cost.countryAnnual || 0;
  const auAnnual = cost.australiaAnnual || 0;
  const saving = auAnnual > 0 ? auAnnual - annualBudget : 0;
  const savingPct = auAnnual > 0 ? Math.round(((auAnnual - annualBudget) / auAnnual) * 100) : 0;

  // Financial viability
  const viability = recs.financialViability || {};

  // Tax residency label map
  const residencyLabels = {
    australian: 'Maintain Australian residency',
    foreign: 'Become foreign tax resident',
    dta: 'Rely on Double Tax Agreement',
  };

  // Cost breakdown (from country profile breakdown object)
  const breakdown = cost.breakdown || {};

  setPanelHtml('overseas', `
    <div style="display:grid;gap:16px">

      <!-- ── Hero ── -->
      <div style="padding:20px;border:1px solid var(--border);border-radius:18px;background:var(--surface);display:grid;gap:12px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:10px">
          <div>
            <div style="font-size:20px;font-weight:800">${escapeHtml(analysis.country)}</div>
            <div style="color:var(--ink-3);font-size:13px;margin-top:2px">${escapeHtml(analysis.currency || '')}${analysis.distanceFromAustralia ? ` · ${(analysis.distanceFromAustralia / 1000).toFixed(0)}k km from AU` : ''}${analysis.flightTime ? ` · ${escapeHtml(analysis.flightTime)}` : ''}</div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
            <span class="chip" style="background:${suitColor(recs.suitability)};color:#fff;border-color:transparent">${escapeHtml(recs.suitability || '—')}</span>
            <span class="chip" style="background:${riskBg(risk.overall)};color:${riskColor(risk.overall)}">${escapeHtml(risk.overall || '?')} overall risk</span>
            ${pension.hasAgreement ? '<span class="chip" style="background:var(--green-soft,#ecfdf5);color:var(--green)">SSA country</span>' : ''}
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px">
          ${cfg.ageMovingOverseas ? `<div><div style="font-size:11px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.04em">Moving at age</div><div style="font-weight:700">${cfg.ageMovingOverseas}</div></div>` : ''}
          ${annualBudget ? `<div><div style="font-size:11px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.04em">Annual budget</div><div style="font-weight:700">${escapeHtml(formatCurrency(annualBudget))}</div></div>` : ''}
          ${scenario.yearsOfFunding != null ? `<div><div style="font-size:11px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.04em">Portfolio runway</div><div style="font-weight:700;color:${scenario.yearsOfFunding >= 30 ? 'var(--green)' : scenario.yearsOfFunding >= 20 ? 'var(--gold)' : 'var(--rose)'}">${scenario.yearsOfFunding} yrs</div></div>` : ''}
          ${saving !== 0 ? `<div><div style="font-size:11px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.04em">vs Australia</div><div style="font-weight:700;color:${saving > 0 ? 'var(--green)' : 'var(--rose)'}">${saving > 0 ? '-' : '+'}${Math.abs(savingPct)}%</div></div>` : ''}
          ${cfg.moveType ? `<div><div style="font-size:11px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.04em">Move type</div><div style="font-weight:700;text-transform:capitalize">${escapeHtml(cfg.moveType.replace('-', ' '))}</div></div>` : ''}
        </div>
        ${analysis.overview ? `<p style="margin:0;color:var(--ink-3);font-size:13px;border-top:1px solid var(--border);padding-top:10px">${escapeHtml(typeof analysis.overview === 'string' ? analysis.overview : '')}</p>` : ''}
      </div>

      <!-- ── Age Pension Portability ── -->
      <div style="padding:18px;border:1px solid var(--border);border-radius:18px;background:var(--surface)">
        <h5 style="margin:0 0 12px;font-size:14px">Age Pension Portability</h5>

        <!-- AWLR bar -->
        <div style="margin-bottom:14px">
          <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--ink-3);margin-bottom:4px">
            <span>Australian Working Life Residence (AWLR)</span>
            <span style="font-weight:700;color:${awlrColor}">${awlrYears} / 35 yrs (${awlrPct}%)</span>
          </div>
          <div style="height:6px;background:var(--border);border-radius:3px;overflow:hidden">
            <div style="height:100%;width:${awlrPct}%;background:${awlrColor};border-radius:3px;transition:width .3s"></div>
          </div>
          <div style="font-size:11px;color:var(--ink-3);margin-top:4px">${awlrPct >= 100 ? '✅ Full portability — no AWLR reduction' : `⚠️ Proportional: ${awlrPct}% of eligible rate after 26 weeks`}</div>
        </div>

        <!-- In Australia vs overseas amounts -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
          <div style="padding:10px;background:var(--bg);border-radius:10px;border:1px solid var(--border)">
            <div style="font-size:11px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.04em">Age Pension (AU)</div>
            <div style="font-size:18px;font-weight:800;margin-top:3px">${escapeHtml(formatCurrency(pc.inAustralia || 0))}</div>
            <div style="font-size:11px;color:var(--ink-3)">per year</div>
          </div>
          <div style="padding:10px;background:var(--bg);border-radius:10px;border:1px solid var(--border)">
            <div style="font-size:11px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.04em">Permanent overseas</div>
            <div style="font-size:18px;font-weight:800;margin-top:3px;color:${(pc.overseas || 0) < (pc.inAustralia || 0) ? 'var(--rose)' : 'var(--green)'}">${escapeHtml(formatCurrency(pc.overseas || 0))}</div>
            <div style="font-size:11px;color:var(--ink-3)">${pc.reductionPercent > 0 ? `−${pc.reductionPercent}% from supplement/AWLR` : 'per year'}</div>
          </div>
        </div>

        <!-- 4-scenario table -->
        ${scenarioRows.length ? `
        <table style="width:100%;font-size:12px;border-collapse:collapse">
          <thead>
            <tr style="border-bottom:1px solid var(--border)">
              <th style="text-align:left;padding:5px 6px;color:var(--ink-3);font-weight:600">Scenario</th>
              <th style="text-align:right;padding:5px 6px;color:var(--ink-3);font-weight:600">Annual pension</th>
              <th style="text-align:right;padding:5px 6px;color:var(--ink-3);font-weight:600">Supplement lost</th>
              <th style="text-align:left;padding:5px 6px;color:var(--ink-3);font-weight:600">Status</th>
            </tr>
          </thead>
          <tbody>
            ${scenarioRows.map(r => `
            <tr style="border-bottom:1px solid var(--border)">
              <td style="padding:6px;font-weight:500">${escapeHtml(r.label)}</td>
              <td style="padding:6px;text-align:right;font-weight:700">${escapeHtml(formatCurrency(r.data.annualPension || 0))}</td>
              <td style="padding:6px;text-align:right;color:${(r.data.supplementLost || 0) > 0 ? 'var(--rose)' : 'var(--ink-3)'}">${r.data.supplementLost > 0 ? '−' + escapeHtml(formatCurrency(r.data.supplementLost)) : '—'}</td>
              <td style="padding:6px">
                ${r.data.pccValid ? '<span style="color:var(--green);font-size:11px">✅ PCC valid</span>' : '<span style="color:var(--rose);font-size:11px">❌ PCC cancelled</span>'}
                ${r.data.awlrApplied ? `<span style="margin-left:6px;color:var(--gold);font-size:11px">AWLR ${Math.round((r.data.proportionalRate || 0) * 100)}%</span>` : ''}
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
        ` : ''}

        <!-- Rules summary -->
        ${pension.rules ? `
        <div style="margin-top:12px;padding:10px;background:var(--bg);border-radius:10px;font-size:12px">
          <div style="font-weight:600;margin-bottom:6px;color:${pension.hasAgreement ? 'var(--green)' : 'var(--gold)'}">${pension.hasAgreement ? '✅ Social Security Agreement country' : '⚠️ No social security agreement'}</div>
          ${pension.rules.initialPeriod ? `<div style="color:var(--ink-2);margin-bottom:3px">• ${escapeHtml(pension.rules.initialPeriod)}</div>` : ''}
          ${pension.rules.afterSixWeeks ? `<div style="color:var(--ink-2);margin-bottom:3px">• ${escapeHtml(pension.rules.afterSixWeeks)}</div>` : ''}
          ${pension.rules.afterSixMonths ? `<div style="color:var(--ink-2)">• ${escapeHtml(pension.rules.afterSixMonths)}</div>` : ''}
          ${(pension.rules.advantages || []).map(a => `<div style="color:var(--green);margin-top:3px">✅ ${escapeHtml(a)}</div>`).join('')}
          ${(pension.rules.disadvantages || []).map(d => `<div style="color:var(--rose);margin-top:3px">${escapeHtml(d)}</div>`).join('')}
        </div>` : ''}
      </div>

      <!-- ── Cost of Living ── -->
      <div style="padding:18px;border:1px solid var(--border);border-radius:18px;background:var(--surface)">
        <h5 style="margin:0 0 12px;font-size:14px">Cost of Living</h5>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:12px">
          <div style="padding:10px;background:var(--bg);border-radius:10px;border:1px solid var(--border)">
            <div style="font-size:11px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.04em">Estimated annual</div>
            <div style="font-size:18px;font-weight:800;margin-top:3px">${escapeHtml(formatCurrency(annualBudget))}</div>
            <div style="font-size:11px;color:var(--ink-3)">in ${escapeHtml(analysis.country)}</div>
          </div>
          <div style="padding:10px;background:var(--bg);border-radius:10px;border:1px solid var(--border)">
            <div style="font-size:11px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.04em">ASFA comfortable (AU)</div>
            <div style="font-size:18px;font-weight:800;margin-top:3px">${escapeHtml(formatCurrency(auAnnual))}</div>
            <div style="font-size:11px;color:var(--ink-3)">Australia baseline</div>
          </div>
          ${saving !== 0 ? `<div style="padding:10px;background:var(--bg);border-radius:10px;border:1px solid var(--border)">
            <div style="font-size:11px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.04em">${saving > 0 ? 'Annual saving' : 'Extra cost'}</div>
            <div style="font-size:18px;font-weight:800;margin-top:3px;color:${saving > 0 ? 'var(--green)' : 'var(--rose)'}">${escapeHtml(formatCurrency(Math.abs(saving)))}</div>
            <div style="font-size:11px;color:${saving > 0 ? 'var(--green)' : 'var(--rose)'}">${saving > 0 ? savingPct + '% cheaper' : Math.abs(savingPct) + '% more'}</div>
          </div>` : ''}
          ${cost.fxAdjustedAnnual && cost.fxAdjustedAnnual !== annualBudget ? `<div style="padding:10px;background:var(--bg);border-radius:10px;border:1px solid var(--border)">
            <div style="font-size:11px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.04em">FX-adjusted (${cost.projectionYears || 20}yr)</div>
            <div style="font-size:18px;font-weight:800;margin-top:3px;color:var(--gold)">${escapeHtml(formatCurrency(cost.fxAdjustedAnnual))}</div>
            <div style="font-size:11px;color:var(--ink-3)">${cost.audFxChangePerYear !== 0 ? (cost.audFxChangePerYear * 100).toFixed(1) + '%/yr AUD drift' : ''}</div>
          </div>` : ''}
        </div>
        ${cost.note ? `<p style="margin:0;font-size:12px;color:var(--ink-3)">${escapeHtml(cost.note)}</p>` : ''}
        ${cost.housingAdjustedAnnual && cost.housingAdjustedAnnual !== annualBudget ? `
        <div style="margin-top:10px;padding:8px 10px;border-radius:8px;background:var(--bg);font-size:12px;color:var(--ink-2)">
          Housing-adjusted (${escapeHtml(cost.housingType || 'rent')}): <b>${escapeHtml(formatCurrency(cost.housingAdjustedAnnual))}/yr</b>
          ${cost.effectiveHousingCost ? ` · Rent: ${escapeHtml(formatCurrency(cost.effectiveHousingCost))}/yr` : ''}
        </div>` : ''}
      </div>

      <!-- ── Tax + Healthcare ── -->
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px">

        <!-- Tax -->
        <div style="padding:18px;border:1px solid var(--border);border-radius:18px;background:var(--surface)">
          <h5 style="margin:0 0 10px;font-size:14px">Tax Implications</h5>
          ${tax.australianTaxResidency ? `
          <div style="font-weight:600;font-size:12px;margin-bottom:6px">${escapeHtml(tax.australianTaxResidency.status)}</div>
          <ul style="margin:0;padding-left:16px;font-size:12px;color:var(--ink-2);display:grid;gap:4px">
            ${(tax.australianTaxResidency.implications || []).map(i => `<li>${escapeHtml(i)}</li>`).join('')}
          </ul>
          ${tax.australianTaxResidency.transitionRisk ? `
          <div style="margin-top:8px;padding:6px 8px;border-radius:7px;background:var(--gold-soft);font-size:11px;color:var(--ink-1)">
            ⚠️ ${escapeHtml(tax.australianTaxResidency.transitionRisk.implication || '')}
          </div>` : ''}` : ''}
          ${tax.doubleTaxAgreement ? `
          <div style="margin-top:10px;padding:6px 8px;border-radius:7px;background:${tax.doubleTaxAgreement.exists ? 'var(--green-soft,#ecfdf5)' : 'var(--gold-soft)'};font-size:11px;color:var(--ink-1)">
            ${tax.doubleTaxAgreement.exists ? `✅ DTA exists — ${escapeHtml(tax.doubleTaxAgreement.summary)}` : `⚠️ No DTA — ${escapeHtml(tax.doubleTaxAgreement.summary || 'Consult a cross-border tax adviser')}`}
          </div>` : ''}
          ${tax.superannuation ? `
          <div style="margin-top:8px;font-size:12px;color:var(--ink-3)">
            <b>Super:</b> ${escapeHtml(tax.superannuation.taxation || '')}
          </div>` : ''}
        </div>

        <!-- Healthcare + Visa -->
        <div style="display:grid;gap:12px">
          <div style="padding:18px;border:1px solid var(--border);border-radius:18px;background:var(--surface)">
            <h5 style="margin:0 0 10px;font-size:14px">Healthcare</h5>
            ${health.rating != null ? `
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
              <div style="font-size:22px;font-weight:800;color:${health.rating >= 8 ? 'var(--green)' : health.rating >= 6 ? 'var(--gold)' : 'var(--rose)'}">${health.rating}/10</div>
              <div style="flex:1;height:6px;background:var(--border);border-radius:3px;overflow:hidden">
                <div style="height:100%;width:${Math.round(health.rating * 10)}%;background:${health.rating >= 8 ? 'var(--green)' : health.rating >= 6 ? 'var(--gold)' : 'var(--rose)'};border-radius:3px"></div>
              </div>
            </div>` : ''}
            ${health.quality ? `<p style="margin:0 0 4px;font-size:12px;color:var(--ink-2)">${escapeHtml(health.quality)}</p>` : ''}
            ${health.insurance ? `<p style="margin:0;font-size:11px;color:var(--ink-3)">Insurance: ${escapeHtml(health.insurance)}</p>` : ''}
          </div>
          <div style="padding:18px;border:1px solid var(--border);border-radius:18px;background:var(--surface)">
            <h5 style="margin:0 0 10px;font-size:14px">Visa</h5>
            ${visa.easeOfAccess ? `<span class="chip" style="background:${visa.easeOfAccess === 'EASY' ? 'var(--green-soft,#ecfdf5)' : visa.easeOfAccess === 'MODERATE' ? 'var(--gold-soft)' : 'var(--rose-soft)'};color:${visa.easeOfAccess === 'EASY' ? 'var(--green)' : visa.easeOfAccess === 'MODERATE' ? 'var(--gold)' : 'var(--rose)'}">Ease: ${escapeHtml(visa.easeOfAccess)}</span>` : ''}
            ${visa.type ? `<p style="margin:8px 0 4px;font-size:12px;font-weight:600">${escapeHtml(visa.type)}</p>` : ''}
            ${visa.duration ? `<p style="margin:0 0 4px;font-size:12px;color:var(--ink-2)">${escapeHtml(visa.duration)}</p>` : ''}
            ${visa.cost ? `<p style="margin:0;font-size:11px;color:var(--ink-3)">${escapeHtml(visa.cost)}</p>` : ''}
          </div>
        </div>
      </div>

      <!-- ── Risk Dashboard ── -->
      <div style="padding:18px;border:1px solid var(--border);border-radius:18px;background:var(--surface)">
        <h5 style="margin:0 0 12px;font-size:14px">Risk Assessment</h5>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:10px">
          ${[
            { label: 'Overall', level: risk.overall, note: '' },
            { label: 'Currency', level: risk.factors?.currency?.level, note: risk.factors?.currency?.note },
            { label: 'Healthcare', level: risk.factors?.healthcare?.level, note: risk.factors?.healthcare?.rating ? `Rating ${risk.factors.healthcare.rating}/10` : '' },
            { label: 'Political', level: risk.factors?.political?.level, note: risk.factors?.political?.note },
            { label: 'Distance', level: risk.factors?.distance?.level, note: risk.factors?.distance?.flightTime || '' },
          ].filter(f => f.level).map(f => `
            <div style="padding:10px;border-radius:10px;background:${riskBg(f.level)};border:1px solid ${riskColor(f.level)}22">
              <div style="font-size:11px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.04em">${escapeHtml(f.label)}</div>
              <div style="font-weight:700;color:${riskColor(f.level)};margin-top:3px">${escapeHtml(f.level)}</div>
              ${f.note ? `<div style="font-size:11px;color:var(--ink-3);margin-top:2px">${escapeHtml(f.note)}</div>` : ''}
            </div>`).join('')}
        </div>
      </div>

      <!-- ── Financial Viability ── -->
      ${viability.message ? `
      <div style="padding:14px 18px;border:1px solid var(--border);border-radius:14px;background:${viability.viable ? 'var(--green-soft,#ecfdf5)' : 'var(--rose-soft,#fff1f2)'};display:flex;gap:12px;align-items:flex-start">
        <div style="font-size:22px">${viability.viable ? '✅' : '⚠️'}</div>
        <div>
          <div style="font-weight:700;color:${viability.viable ? 'var(--green)' : 'var(--rose)'}">${escapeHtml(viability.message)}</div>
          ${viability.surplus != null ? `<div style="font-size:12px;color:var(--ink-2);margin-top:3px">Annual surplus on pension: ${escapeHtml(formatCurrency(viability.surplus))}</div>` : ''}
          ${viability.shortfall != null ? `<div style="font-size:12px;color:var(--ink-2);margin-top:3px">Annual shortfall to fund from portfolio: ${escapeHtml(formatCurrency(viability.shortfall))}</div>` : ''}
          ${viability.note ? `<div style="font-size:12px;color:var(--ink-3);margin-top:3px">${escapeHtml(viability.note)}</div>` : ''}
        </div>
      </div>` : ''}

      <!-- ── Fallback Scenario ── -->
      ${fallback ? `
      <div style="padding:18px;border:1px solid var(--border);border-radius:18px;background:var(--surface)">
        <h5 style="margin:0 0 10px;font-size:14px">Return-to-Australia Scenario</h5>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px">
          <span class="chip">Return at age ${fallback.fallbackAge}</span>
          <span class="chip">${fallback.yearsOverseas} yr${fallback.yearsOverseas !== 1 ? 's' : ''} overseas</span>
          <span class="chip">${escapeHtml(fallback.triggerLabel || '')}</span>
          ${fallback.waitingPeriod > 0 ? `<span class="chip" style="color:var(--rose)">${fallback.waitingPeriod}-yr waiting period</span>` : '<span class="chip" style="color:var(--green)">No waiting period</span>'}
        </div>
        ${fallback.pensionLostDuringWait && fallback.estimatedLostPension > 0 ? `
        <div style="padding:8px 10px;background:var(--rose-soft,#fff1f2);border-radius:8px;font-size:12px;color:var(--rose);margin-bottom:8px">
          ⚠️ Estimated pension suspended during waiting period: ${escapeHtml(formatCurrency(fallback.estimatedLostPension))}
        </div>` : ''}
        <ul style="margin:0;padding-left:0;list-style:none;font-size:12px;color:var(--ink-2);display:grid;gap:4px">
          ${(fallback.notes || []).map(n => `<li>${escapeHtml(n)}</li>`).join('')}
        </ul>
      </div>` : ''}

      <!-- ── Key Steps ── -->
      ${recs.keySteps?.length ? `
      <div style="padding:18px;border:1px solid var(--border);border-radius:18px;background:var(--surface)">
        <h5 style="margin:0 0 10px;font-size:14px">Key Action Steps</h5>
        <ol style="margin:0;padding-left:18px;font-size:13px;color:var(--ink-2);display:grid;gap:6px">
          ${recs.keySteps.map(s => `<li>${escapeHtml(s.replace(/^\d+\.\s*/, ''))}</li>`).join('')}
        </ol>
      </div>` : ''}

      <!-- ── Best For / Challenges ── -->
      ${(recs.bestFor?.length || recs.challenges?.length) ? `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px">
        ${recs.bestFor?.length ? `
        <div style="padding:16px;border:1px solid var(--border);border-radius:14px;background:var(--surface)">
          <h5 style="margin:0 0 8px;font-size:13px;color:var(--green)">Best for</h5>
          <ul style="margin:0;padding-left:16px;font-size:12px;color:var(--ink-2);display:grid;gap:4px">
            ${recs.bestFor.map(b => `<li>${escapeHtml(b)}</li>`).join('')}
          </ul>
        </div>` : ''}
        ${recs.challenges?.length ? `
        <div style="padding:16px;border:1px solid var(--border);border-radius:14px;background:var(--surface)">
          <h5 style="margin:0 0 8px;font-size:13px;color:var(--gold)">Challenges</h5>
          <ul style="margin:0;padding-left:16px;font-size:12px;color:var(--ink-2);display:grid;gap:4px">
            ${recs.challenges.map(c => `<li>${escapeHtml(c)}</li>`).join('')}
          </ul>
        </div>` : ''}
      </div>` : ''}

      ${(recs.additionalNotes?.length) ? `
      <div style="padding:10px 14px;background:var(--bg);border-radius:10px;font-size:12px;color:var(--ink-3)">
        ${recs.additionalNotes.map(n => `<p style="margin:0 0 4px">${escapeHtml(n)}</p>`).join('')}
      </div>` : ''}
    </div>
  `);
}

async function renderAiPanel() {
  if (getSecondaryAnalysisState('recommendations').stale) {
    setPanelHtml('ai', secondaryStaleNotice({
      title: 'Suggestions need refresh.',
      message: 'Inputs changed since the last suggestions run. Old suggestions are hidden until refreshed.',
      buttonLabel: 'Refresh Suggestions',
      toolId: 'tool-ai',
    }));
    return;
  }

  const recommendations = APP_STATE.recommendations || [];
  const inp = APP_STATE.input || {};
  const engineInputs = APP_STATE.engineInputs || {};

  let SuggestionsUI;
  let computeOutcomeBand;
  try {
    // Dynamically import suggestions-ui to avoid bloating the initial bundle
    ([SuggestionsUI, { computeOutcomeBand }] = await Promise.all([
      import('./suggestions-ui.js'),
      import('./outcome-bands.js'),
    ]));
  } catch (error) {
    console.error('Unable to load suggestions panel modules:', error);
    return;
  }

  // Inject property sell-timing insight if applicable
  const sellTimingRec = generatePropertySellTimingInsight(inp, engineInputs);
  const allRecs = sellTimingRec
      ? [sellTimingRec, ...recommendations]
      : recommendations;

  if (!allRecs.length && !APP_STATE.simulation && !APP_STATE.adaptedResult) {
    const sgContent = document.getElementById('sg-content');
    if (sgContent) return; // Keep the empty state HTML from the template
    setPanelHtml('ai', SuggestionsUI.buildEmptyState());
    return;
  }

  // Compute outcome band from available data
  const richTargetEl  = document.getElementById('richTarget');
  const richTargetVal = richTargetEl?.value || '1.5';
  const customRichEl  = document.getElementById('richTargetCustom');
  const richMultiplier = richTargetVal === 'custom' ? null : parseFloat(richTargetVal) || 1.5;
  const customRich     = richTargetVal === 'custom' && customRichEl
      ? parseFloat(customRichEl.value) || null
      : null;

  const band = computeOutcomeBand({
    monteCarloResults: APP_STATE.monteCarloResults,
    simulation: APP_STATE.simulation,
    adaptedResult: APP_STATE.adaptedResult,
    inputs: inp,
    engineInputs,
    richMultiplier,
    customRichTarget: customRich,
  });

  // Sort recommendations: HIGH priority first, then by successRateDiff desc
  const sortedRecs = [...allRecs].sort((a, b) => {
    const pOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    const pa = pOrder[a.priority] || 2;
    const pb = pOrder[b.priority] || 2;
    if (pa !== pb) return pb - pa;
    return (b.successRateDiff || 0) - (a.successRateDiff || 0);
  });

  // Overseas panel data
  const overseasOpts = APP_STATE.overseasAnalysis ? buildOverseasGuideOpts(inp, engineInputs, APP_STATE.overseasAnalysis) : null;

  // Whether to show annuity card (shown if any annuity rec exists or band is below comfortable)
  const showAnnuity = allRecs.some(r => (r.category || '').toLowerCase().includes('annuity'))
      || band.band === 'critical'
      || band.band === 'at_risk';

  const isCouple = !!(engineInputs.hasPartner || inp.hasPartner);
  const salary = engineInputs.yourSalary || inp.yourSalary || 0;
  const yearsToRetire = (engineInputs.retirementAge || inp.retirementAge || 67)
      - (engineInputs.yourCurrentAge || inp.yourCurrentAge || 50);

  const panelHtml = SuggestionsUI.buildFullSuggestionsPanel({
    band,
    recommendations: sortedRecs,
    overseasOpts,
    showAnnuity,
    selectable: true,
    yearsToRetirement: Math.max(1, yearsToRetire),
    annualSalary: salary,
    isCouple,
    richMultiplier: richMultiplier || 1.5,
  });

  setPanelHtml('ai', panelHtml);

  // Wire interactivity (filter tabs, checkboxes, try-scenario)
  const panelEl = document.querySelector('[data-tab-panel="ai"]');
  if (panelEl) {
    SuggestionsUI.wireSuggestionsInteractivity(panelEl, {
      recommendations: sortedRecs,
      selectable: true,
      onTryScenario: (rec) => applyRecommendationScenario(rec),
      onRunDeeper: () => runRecommendationAnalysis(),
      onExportPlan: (selected) => exportSuggestionsAsPdf(selected, band),
    });
  }
}

/** Build options for the Age Pension overseas guidance panel from existing overseas analysis. */
function buildOverseasGuideOpts(inp, engineInputs, overseasAnalysis) {
  if (!overseasAnalysis) return null;
  const currentAge = engineInputs.yourCurrentAge || inp.yourCurrentAge || 50;
  const pensionAge = 67;
  return {
    nearPensionAge: (pensionAge - currentAge) <= 7,
    isCouple: !!(engineInputs.hasPartner || inp.hasPartner),
    likelyEligible: overseasAnalysis.agePensionPortability?.eligible !== false,
    awlrYears: overseasAnalysis.agePensionPortability?.awlrYears ?? Math.max(10, currentAge - 15),
    selectedCountry: overseasAnalysis.country?.name || null,
    hasAgreement: overseasAnalysis.agePensionPortability?.hasAgreement || false,
    destination: inp.destination || null,
  };
}

/** Apply a recommendation's modifications to the form and re-run the simulation. */
async function applyRecommendationScenario(rec) {
  if (!rec?.modifications || rec.isTryThisDisabled) return;
  // Store originals so user can undo (best-effort key matching)
  const originals = {};
  for (const [key, val] of Object.entries(rec.modifications)) {
    const el = document.getElementById(key);
    if (el) { originals[key] = el.type === 'checkbox' ? el.checked : el.value; }
    setInputValue(key, val, { checkbox: typeof val === 'boolean' });
  }
  APP_STATE._scenarioOriginals = originals;
  showNotification(`Scenario applied: ${rec.title}. Re-running simulation…`, 'info');
  // Re-run the full simulation with modified inputs
  const calc = document.getElementById('btn-calc-full') || document.getElementById('btn-calculate');
  if (calc) calc.click();
}

/** Export selected action plan items and readiness summary to PDF. */
async function exportSuggestionsAsPdf(selectedRecs, band) {
  showNotification('Preparing PDF…', 'info');
  syncAppState();
  const recs = selectedRecs.length ? selectedRecs : (APP_STATE.recommendations || []);
  await exportToPDF(
    APP_STATE.engineInputs,
    buildExportResults(),
    APP_STATE.chartManager,
    {
      ...buildExportAppBridge(),
      currentSuggestions: recs,
      currentRecommendations: recs,
      currentComprehensiveRecommendations: recs,
      currentOutcomeBand: band,
    }
  );
}

function renderAnalysisPanels() {
  const activeTab = getActiveAnalysisTab();
  if (activeTab === 'summary') {
    profiler.measure('advanced-v2.post.render.summaryPanel', () => renderSummaryPanel());
  } else if (activeTab === 'whatif') {
    profiler.measure('advanced-v2.post.render.whatIfPanel', () => renderWhatIfPanel());
  } else if (activeTab === 'year') {
    const years = APP_STATE.adaptedResult?.years;
    const inp = APP_STATE.input;
    if (years?.length && inp) {
      profiler.measure('advanced-v2.post.render.yearTable', () => paintYearTable(years, inp));
    }
  } else if (activeTab === 'risk') {
    profiler.measure('advanced-v2.post.render.riskPanel', () => renderRiskPanel());
    scheduleVisibleRiskChartRender();
  } else if (activeTab === 'ai') {
    profiler.measure('advanced-v2.suggestions.render.aiPanel', () => renderAiPanel());
  } else if (activeTab === 'overseas') {
    profiler.measure('advanced-v2.post.render.overseasPanel', () => renderOverseasPanel());
  }
}

function getMonteCarloChartRenderKey(mc, inp) {
  if (!mc) return null;
  const outcomesLen = Array.isArray(mc.outcomes)
    ? mc.outcomes.length
    : Array.isArray(mc.statistics?.outcomes)
      ? mc.statistics.outcomes.length
      : 0;
  return [
    mc.totalRuns ?? mc.numRuns ?? 0,
    mc.successRate ?? 0,
    mc.median ?? 0,
    mc.percentile10 ?? 0,
    mc.percentile90 ?? 0,
    outcomesLen,
    inp?.retireAge ?? 0,
    inp?.lifespan ?? 0,
  ].join('|');
}

function scheduleVisibleRiskChartRender(force = false) {
  if (!APP_STATE.monteCarloResults) return;
  if (getActiveAnalysisTab() !== 'risk') return;

  const renderState = APP_STATE.monteCarloChartRender;
  const nextKey = getMonteCarloChartRenderKey(APP_STATE.monteCarloResults, APP_STATE.input);

  if (!force && renderState.lastKey === nextKey) return;
  if (renderState.scheduled) return;

  renderState.scheduled = true;
  Promise.resolve().then(() => {
    renderState.scheduled = false;
    if (getActiveAnalysisTab() !== 'risk' || !APP_STATE.monteCarloResults) return;
    const keyAtRender = getMonteCarloChartRenderKey(APP_STATE.monteCarloResults, APP_STATE.input);
    if (!force && renderState.lastKey === keyAtRender) return;
    profiler.measure('advanced-v2.post.chart.microtaskRenderMonteCarloCharts', () => {
      renderMonteCarloCharts(APP_STATE.monteCarloResults, APP_STATE.input);
    });
    renderState.lastKey = keyAtRender;
  });
}

// quiet=true suppresses the "no changes" notification when called from runFullAnalysis
async function runMonteCarloAnalysis({ quiet = false } = {}) {
  const baseState = syncAppState();
  // Skip if inputs haven't changed since last MC run (avoid re-running a costly simulation)
  const currentHash = getInputsHash();
  if (currentHash && currentHash === lastMcHash && APP_STATE.monteCarloResults) {
    if (!quiet) showNotification('No changes since last Monte Carlo run — results are up to date.', 'info');
    return;
  }
  // Use engineInputs.numRuns (set by buildEngineInputs from the mcRuns form field).
  // This is the single source of truth — avoids any double-read discrepancy between
  // the select element and the already-computed engine state.
  const runsToUse = baseState.engineInputs.numRuns || DEFAULTS.simulation.numRuns || 500;

  const progressBarEl = document.getElementById('adv2-progress-bar');
  const progressLabelEl = document.getElementById('adv2-loading-label');
  const progressSubEl = document.getElementById('adv2-loading-sub');

  // Helper: update bar, label, sub; optionally add a CSS phase class on the label.
  // Yields two ticks (rAF + setTimeout) so the browser has time to repaint.
  const setProgress = async (pct, label, sub, phaseClass = '') => {
    if (progressBarEl) {
      // First call with pct > 0: switch from indeterminate shimmer → determinate fill
      if (pct > 0 && !progressBarEl.classList.contains('is-determinate')) {
        progressBarEl.classList.add('is-determinate');
      }
      if (pct >= 100) progressBarEl.classList.add('is-complete');
      progressBarEl.style.width = pct + '%';
    }
    if (progressLabelEl) {
      progressLabelEl.textContent = label;
      progressLabelEl.className = 'adv2-loading-label' + (phaseClass ? ` ${phaseClass}` : '');
    }
    if (progressSubEl) progressSubEl.textContent = sub;
    await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
  };

  // Reset bar to indeterminate shimmer state for a clean start
  if (progressBarEl) {
    progressBarEl.classList.remove('is-determinate', 'is-complete');
    progressBarEl.style.width = '';
  }
  if (progressLabelEl) progressLabelEl.className = 'adv2-loading-label';

  // Phase allocation (% of bar):
  //   0 – 78%  →  Monte Carlo run loop     (progress callback every 100 runs)
  //  78 – 85%  →  Statistical analysis     (sort, percentiles, success rate)
  //  85 – 92%  →  Risk profile + strategy
  //  92 – 97%  →  Panel HTML rendering
  //  97 – 100% →  Chart drawing
  const MC_RUN_END = 78;

  const startTime = Date.now();

  const mcProgressCallback = async (completed, total) => {
    const runPct = Math.round((completed / total) * MC_RUN_END);

    if (completed === 0) {
      // First tick: switch to determinate mode showing the actual run count
      await setProgress(1, 'Running…', `0 / ${total.toLocaleString()} runs`);
      return;
    }

    if (completed === total) {
      // All runs done — move to analysis phase label before the bar jumps
      if (progressBarEl) {
        if (!progressBarEl.classList.contains('is-determinate')) progressBarEl.classList.add('is-determinate');
        progressBarEl.style.width = MC_RUN_END + '%';
      }
      if (progressLabelEl) { progressLabelEl.textContent = 'Analysing…'; progressLabelEl.className = 'adv2-loading-label phase-analyse'; }
      if (progressSubEl) progressSubEl.textContent = `All ${total.toLocaleString()} runs complete — computing statistics…`;
      await new Promise((resolve) => setTimeout(resolve, 0));
      return;
    }

    // Mid-run: update bar width + ETA
    if (progressBarEl) {
      if (!progressBarEl.classList.contains('is-determinate')) progressBarEl.classList.add('is-determinate');
      progressBarEl.style.width = runPct + '%';
    }
    if (progressSubEl) {
      const elapsed = (Date.now() - startTime) / 1000;
      const rate = completed / Math.max(elapsed, 0.001);
      const remaining = total - completed;
      const secsLeft = rate > 0 ? Math.ceil(remaining / rate) : null;
      const eta = secsLeft != null && secsLeft > 1
        ? ` — ~${secsLeft < 60 ? `${secsLeft}s` : `${Math.ceil(secsLeft / 60)}m`} left`
        : '';
      progressSubEl.textContent = `${completed.toLocaleString()} / ${total.toLocaleString()} runs${eta}`;
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
  };

  if (progressLabelEl) progressLabelEl.textContent = 'Running…';
  if (progressSubEl) progressSubEl.textContent = `Preparing ${runsToUse.toLocaleString()} Monte Carlo simulations…`;

  APP_STATE.monteCarloResults = await profiler.asyncMeasure('advanced-v2.core.monteCarloSimulation', () => simulator.runMonteCarloSimulation(
    baseState.engineInputs,
    runsToUse,
    mcProgressCallback
  ), { runs: runsToUse });

  // Phase: statistical analysis
  await setProgress(82, 'Analysing…',
    'Computing percentiles, success rate and sequence-of-returns risk…', 'phase-analyse');

  APP_STATE.riskProfile = profiler.measure('advanced-v2.post.riskProfile', () => normaliseRiskProfile(
    riskProfiler.generateRiskProfileSummary(baseState.engineInputs, APP_STATE.monteCarloResults)
  ));
  APP_STATE.allocationStrategy = profiler.measure('advanced-v2.post.allocationStrategy', () => deriveAllocationStrategy(APP_STATE.riskProfile));

  // Phase: build panel HTML (heaviest synchronous step)
  await setProgress(89, 'Building…',
    'Assembling risk profile, allocation strategy and summary panels…', 'phase-build');

  profiler.measure('advanced-v2.post.render.analysisPanels', () => renderAnalysisPanels());

  // Phase: chart drawing is now deferred until the Risk tab is visible.
  await setProgress(95, 'Rendering charts…',
    'Risk charts render when the Risk & Resilience tab is visible.', 'phase-render');

  // Briefly show "Done" before the overlay dismisses
  await setProgress(100, 'Done',
    `${runsToUse.toLocaleString()} runs complete.`, 'phase-done');
  await new Promise((resolve) => setTimeout(resolve, 350));

  lastMcHash = getInputsHash();
  profiler.report('advanced-v2 Monte Carlo profile');
  return APP_STATE.monteCarloResults;
}

async function runRetirementAgeAnalysis() {
  const baseState = syncAppState();
  const runSignature = buildInputSignature(baseState.input);
  APP_STATE.retirementAgeResult = await profiler.asyncMeasure('advanced-v2.core.retirementAgeSolve', () => simulator.solveRetirementAge(baseState.engineInputs, 0.7));
  markSecondaryAnalysisFresh('retirementAge', runSignature);
  profiler.measure('advanced-v2.post.render.analysisPanels', () => renderAnalysisPanels());
  return APP_STATE.retirementAgeResult;
}

function runStressAnalysis() {
  const baseState = syncAppState();
  const runSignature = buildInputSignature(baseState.input);
  const stressState = getSecondaryAnalysisState('stress');
  if (hasSecondaryResult('stress') && stressState.lastInputSignature === runSignature) {
    showNotification('No changes since last stress test — results are up to date.', 'info');
    return APP_STATE.stressTestResults;
  }
  APP_STATE.stressTestResults = profiler.measure('advanced-v2.post.stressTests', () => buildStressScenarioResults(baseState));
  markSecondaryAnalysisFresh('stress', runSignature);
  profiler.measure('advanced-v2.post.render.analysisPanels', () => renderAnalysisPanels());
  return APP_STATE.stressTestResults;
}

async function runRecommendationAnalysis() {
  const baseState = profiler.measure('advanced-v2.suggestions.input.syncBaseState', () => syncAppState());
  const runSignature = buildInputSignature(baseState.input);
  const engine = new RecommendationEngine(simulator, baseState.engineInputs, ENHANCED_CONFIG, {
    baselineMonteCarlo: APP_STATE.monteCarloResults,
    baselineDeterministic: APP_STATE.simulation,
    profiler,
    profilePrefix: 'advanced-v2.suggestions',
  });
  APP_STATE.recommendations = await profiler.asyncMeasure('advanced-v2.suggestions.totalGenerateRecommendations', () => engine.generateRecommendations());
  markSecondaryAnalysisFresh('recommendations', runSignature);
  profiler.measure('advanced-v2.suggestions.render.analysisPanels', () => renderAnalysisPanels());
  profiler.report('advanced-v2 Suggestions profile');
  setTimeout(() => syncToolButtonStates(), 0);
  return APP_STATE.recommendations;
}

function runOverseasAnalysis() {
  const baseState = syncAppState();
  const runSignature = buildInputSignature(baseState.input);
  const countryCode = mapDestinationCode(baseState.input.destination);
  if (!countryCode) {
    throw new Error('Choose a supported destination in the Overseas section first.');
  }

  const fxOptions = {
    audFxChangePerYear: baseState.engineInputs.overseasAudFxChange || -0.01,
    projectionYears: 20,
    housingType: baseState.input.overseasHousingType || 'rent',
    annualRentAUD: baseState.input.overseasAnnualRent || 0,
  };

  const analyzer = buildOverseasAnalyzer(baseState);
  APP_STATE.overseasAnalysis = profiler.measure('advanced-v2.post.overseasAnalysis', () => analyzer.analyzeCountry(countryCode, fxOptions));

  // Attach fallback scenario if a return age is configured
  const fallbackAge = baseState.input.overseasFallbackAge || 0;
  if (fallbackAge > 0) {
    APP_STATE.overseasAnalysis.fallbackScenario = analyzer.generateFallbackScenario(
      countryCode,
      fallbackAge,
      baseState.input.overseasFallbackTrigger || 'none',
      APP_STATE.overseasAnalysis.agePensionPortability?.hasAgreement || false
    );
  }

  APP_STATE.overseasExportData = profiler.measure('advanced-v2.post.overseasExportData', () => buildOverseasExportData(
    APP_STATE.overseasAnalysis,
    baseState.input.annualLivingCostOverseas,
    getFinalBalanceValue(baseState.simulation, baseState.adaptedResult)
  ));
  markSecondaryAnalysisFresh('overseas', runSignature);
  profiler.measure('advanced-v2.post.render.analysisPanels', () => renderAnalysisPanels());
  return APP_STATE.overseasAnalysis;
}

async function runFullAnalysis() {
  // Core run focuses on deterministic projection + Monte Carlo/risk only.
  // Secondary analyses remain on-demand and are stale-marked if inputs changed.
  const currentHash = getInputsHash();
  if (currentHash && currentHash === lastFullAnalysisHash) {
    showNotification('No changes since last calculation — results are up to date.', 'info');
    return;
  }
  const baseState = syncAppState();
  paint(baseState.adaptedResult, baseState.input);
  await runMonteCarloAnalysis({ quiet: true });
  lastFullAnalysisHash = getInputsHash();
  lastMcHash = lastFullAnalysisHash;
  markCalcButtonState(false);
  profiler.report('advanced-v2 full analysis profile');
}

function setSegmentedValue(bind, value) {
  const wrapper = document.querySelector(`[data-bind="${bind}"]`);
  if (!wrapper) return;
  wrapper.dataset.value = String(value);
  wrapper.querySelectorAll('button').forEach((button) => {
    button.classList.toggle('on', button.dataset.value === String(value));
  });
}

function setInputValue(id, value, options = {}) {
  const element = document.getElementById(id);
  if (!element || value == null) return;

  if (options.checkbox) {
    element.checked = Boolean(value);
  } else {
    element.value = value;
  }
}

// Round rate/percentage fields to their display precision after programmatic value assignment.
// `enforceDecimals` only fires on user-initiated change events, not on el.value = x.
function normalizeLoadedDecimals() {
  const twoDP = [
    'inflation', 'invReturn', 'superGrowth', 'savingsReturn',
    'mortgageRate', 'ccRate', 'personalLoanRate', 'carLoanRate',
    'ipRate', 'ipGrowthRate', 'returnVolatility',
  ];
  twoDP.forEach((id) => {
    const el = document.getElementById(id);
    if (el) { const v = parseFloat(el.value); if (!isNaN(v)) el.value = parseFloat(v.toFixed(2)); }
  });
}

function applyImportedUserData(userData, uiState = null) {
  const normalized = normalizeImportedUserData(userData);
  setSegmentedValue('household', normalized.household || 'single');
  setSegmentedValue('downsizePlan', normalized.downsizePlan || 'no');

  // Handle mcRuns specially: the select only accepts 200/500/1000/5000/10000/"custom".
  // If the loaded value doesn't match a standard option, route it through "custom".
  const MC_STANDARD = new Set(['200', '500', '1000', '5000', '10000']);
  if (normalized.mcRuns != null) {
    const mcSel = document.getElementById('mcRuns');
    const mcCustom = document.getElementById('mcRunsCustom');
    const mcWrap = document.getElementById('mcRunsCustomWrap');
    if (mcSel) {
      const strVal = String(normalized.mcRuns);
      if (MC_STANDARD.has(strVal)) {
        mcSel.value = strVal;
        if (mcWrap) mcWrap.style.display = 'none';
      } else if (mcCustom) {
        mcSel.value = 'custom';
        mcCustom.value = Math.min(20000, Math.max(100, Number(normalized.mcRuns) || 500));
        if (mcWrap) mcWrap.style.display = 'flex';
      }
    }
  }

  Object.entries(normalized).forEach(([key, value]) => {
    if (key === 'household' || key === 'downsizePlan' || key === 'mcRuns') return;
    const element = document.getElementById(key);
    if (!element || value == null) return;
    if (element.type === 'checkbox') {
      element.checked = Boolean(value);
    } else {
      element.value = value;
    }
  });

  if (normalized.pensionAssetThreshold !== undefined || normalized.pensionAssetCutoff !== undefined) {
    ['pensionAssetThreshold', 'pensionAssetCutoff'].forEach((id) => {
      const field = document.getElementById(id);
      if (field) field.dataset.autoDefault = 'false';
    });
  }

  // Normalize decimal precision: toDisplayPercent can introduce float noise (e.g. 0.162*100 = 16.200000000000002)
  normalizeLoadedDecimals();

  // Restore V2 UI State if present
  if (uiState && uiState.advancedV2) {
    const v2State = uiState.advancedV2;
    if (v2State.desiredIncomeMode) setSegmentedValue('desiredIncomeMode', v2State.desiredIncomeMode);
    if (v2State.richTarget) setInputValue('richTarget', v2State.richTarget);
    if (v2State.richTargetCustom) setInputValue('richTargetCustom', v2State.richTargetCustom);
    if (v2State.builderCurrentIncome) setInputValue('builderCurrentIncome', v2State.builderCurrentIncome);
    if (v2State.builderMortgage) setInputValue('builderMortgage', v2State.builderMortgage);
    if (v2State.builderChildren) setInputValue('builderChildren', v2State.builderChildren);
    if (v2State.builderBuffer) setInputValue('builderBuffer', v2State.builderBuffer);
    if (v2State.surplusAllocationMode) setInputValue('surplusAllocationMode', v2State.surplusAllocationMode);
    if (v2State.useDetailedCashflow) setInputValue('useDetailedCashflow', v2State.useDetailedCashflow, { checkbox: true });
    if (v2State.displayUnits) setSegmentedValue('displayUnits', v2State.displayUnits);
  }

  applyHouseholdVisibility();
  ['investmentProperty', 'goingOverseas', 'isCarer', 'hasSmsf', 'hasTrust',
   'hasSpousalMaintenance', 'hasChildSupport', 'useFHSS', 'enableShocks'].forEach((id) => {
    const checkbox = document.getElementById(id);
    if (checkbox) checkbox.dispatchEvent(new Event('change', { bubbles: true }));
  });
  recalc();
}

async function handleLoadData() {
  const imported = await importUserData();
  if (!imported) return;
  applyImportedUserData(imported.userData || {}, imported.uiState || null);
  showNotification(`Loaded ${imported.scenarioName || 'saved retirement data'}.`, 'success');
}

function handleSaveData() {
  exportRedesignUserData(readInputs(), 'Retirement Calculator v3');
}

function handlePdfExport() {
  syncAppState();
  exportToPDF(
    APP_STATE.engineInputs,
    buildExportResults(),
    APP_STATE.chartManager,
    buildExportAppBridge()
  );
}

// ── Loading overlay helpers ──
const OVERLAY_SUBTITLES = {
  'Running…':   'Crunching your retirement numbers…',
  'Solving…':   'Searching for the earliest viable retirement age…',
  'Testing…':   'Applying market shock scenarios to your plan…',
  'Thinking…':  'Generating personalised AI recommendations…',
  'Analysing…': 'Modelling overseas pension portability and costs…',
  'Exporting…': 'Generating your PDF report…',
  'Loading…':   'Importing your saved retirement data…',
};

function showLoadingOverlay(label = 'Running…') {
  const overlay = document.getElementById('adv2-loading-overlay');
  const labelEl = document.getElementById('adv2-loading-label');
  const subEl   = document.getElementById('adv2-loading-sub');
  const barEl   = document.getElementById('adv2-progress-bar');
  if (!overlay) return;
  if (labelEl) { labelEl.textContent = label; labelEl.className = 'adv2-loading-label'; }
  if (subEl)   subEl.textContent = OVERLAY_SUBTITLES[label] || 'This may take a moment…';
  // Reset bar to indeterminate shimmer for non-MC operations
  if (barEl) {
    barEl.classList.remove('is-determinate', 'is-complete');
    barEl.style.width = '';
  }
  overlay.classList.add('visible');
}

function hideLoadingOverlay() {
  const overlay = document.getElementById('adv2-loading-overlay');
  if (overlay) overlay.classList.remove('visible');
}

async function runAction(button, handler, {
  successMessage,
  targetTab,
  runningLabel,
} = {}) {
  const originalLabel = button?.dataset?.originalLabel || button?.innerHTML || '';
  if (button) {
    button.dataset.originalLabel = originalLabel;
    button.disabled = true;
    button.innerHTML = runningLabel || 'Running…';
  }

  showLoadingOverlay(runningLabel || 'Running…');

  // Yield to the browser so the overlay class change is painted before the
  // (potentially synchronous or microtask-only) handler blocks the main thread.
  await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));

  try {
    const result = await profiler.asyncMeasure(`advanced-v2.action.${successMessage || runningLabel || 'handler'}`, () => handler());
    if (targetTab) openTab(targetTab);
    if (successMessage) showNotification(successMessage, 'success');
    return result;
  } catch (error) {
    adv2Error('advanced-v2 action failed', error);
    showNotification(error.message || 'This action could not be completed.', 'error');
    return null;
  } finally {
    hideLoadingOverlay();
    if (button) {
      button.disabled = false;
      button.innerHTML = originalLabel;
    }
  }
}

// ============================================================
// 6. PAINT — sticky panel + tab content
// ============================================================
function fmt$(n, opts = {}) {
  if (!isFinite(n)) return '$—';
  const sign = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (opts.compact && abs >= 1000) {
    if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
    return `${sign}$${(abs / 1000).toFixed(abs >= 10_000 ? 0 : 1)}k`;
  }
  return sign + '$' + Math.round(abs).toLocaleString('en-AU');
}

function $(id) {
  return document.getElementById(id);
}

function show(id) {
  const element = $(id);
  if (element) element.classList.remove('hidden');
}

function hide(id) {
  const element = $(id);
  if (element) element.classList.add('hidden');
}

function setText(id, text) {
  const element = $(id);
  if (element) element.textContent = String(text);
}

function setHTML(id, html) {
  const element = $(id);
  if (element) element.innerHTML = html;
}

function adv2Info(...args) {
  if (typeof window !== 'undefined' && window.console && typeof window.console.info === 'function') {
    window.console.info(...args);
  }
}

function adv2Error(...args) {
  if (typeof window !== 'undefined' && window.console && typeof window.console.error === 'function') {
    window.console.error(...args);
  }
}

function showResultsError(message, prefix = 'Controller error') {
  const card = document.querySelector('.results-card');
  if (!card) return;

  let banner = document.getElementById('advanced-v2-error-banner');
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'advanced-v2-error-banner';
    banner.style.cssText = 'background:#fee;color:#900;padding:10px;border-radius:8px;margin-bottom:10px;font-size:12px;border:1px solid #f5c2c7';
    card.insertBefore(banner, card.firstChild);
  }

  banner.innerHTML = `<b>${escapeHtml(prefix)}:</b> ${escapeHtml(message)} — open the browser console for details.`;
}

function clearResultsError() {
  const banner = document.getElementById('advanced-v2-error-banner');
  if (banner) banner.remove();
}

function updateSpendingEstimateHint(inp) {
  const hint = document.getElementById('spending-estimate-hint');
  if (!hint) return;
  if (inp?.useDetailedCashflow) {
    hint.hidden = true;
    return;
  }
  const est = estimateMonthlySpending({
    householdType: inp?.household === 'couple' ? 'couple' : 'single',
    dependents: inp?.dependents || 0,
    healthcareMonthly: (inp?.healthcareCost || 0) / 12,
    rentMonthly: inp?.primaryRentMonthly || 0,
  });
  const parts = [`ABS base $${est.living.toLocaleString('en-AU')}`];
  if (est.childCosts > 0) parts.push(`${inp.dependents} child${inp.dependents > 1 ? 'ren' : ''} +$${est.childCosts.toLocaleString('en-AU')}`);
  if (est.housing > 0)    parts.push(`rent +$${est.housing.toLocaleString('en-AU')}`);
  if (est.healthcare > 0) parts.push(`healthcare +$${est.healthcare.toLocaleString('en-AU')}`);
  hint.textContent = `Estimated: $${est.total.toLocaleString('en-AU')}/mo (${parts.join(', ')}) — tick "Use my actual monthly spending" above to enter your exact figure`;
  hint.hidden = false;
}

function paint(result, inp) {
  updateSpendingEstimateHint(inp);

  const displayUnits = getDisplayUnits();
  const isNominal = displayUnits === 'nominal';

  const warningBox = $('r-projection-warnings');
  const warnings = (APP_STATE.projection?.warnings || []).filter(
    (w) => !w.startsWith(SPENDING_ESTIMATED_WARNING_PREFIX)
  );
  if (warningBox) {
    warningBox.hidden = warnings.length === 0;
    warningBox.style.cssText = 'margin:10px 0;padding:10px;border-radius:8px;background:var(--gold-soft,#fffbeb);border:1px solid var(--gold,#f59e0b);font-size:12px;color:var(--ink-2)';
    warningBox.innerHTML = warnings.length
      ? '<b>Projection input warning</b><ul style="margin:6px 0 0 18px">'
        + warnings.map((warning) => '<li>' + escapeHtml(warning) + '</li>').join('')
        + '</ul>'
      : '';
  }

  // Scenario mode badge — shown when non-baseline mode is active so users know the projection is adjusted
  const scenarioMode = APP_STATE.engineInputs?.headlineScenarioMode || APP_STATE.engineInputs?.scenarioMode || 'baseline';
  const scenarioBadge = $('r-scenario-badge');
  if (scenarioBadge) {
    const isNonBase = !['base', 'baseline'].includes(scenarioMode);
    scenarioBadge.hidden = !isNonBase;
    if (isNonBase) {
      const LABELS = { optimistic: 'Optimistic scenario', pessimistic: 'Pessimistic scenario', crisis: 'Crisis scenario' };
      const COLORS = { optimistic: 'var(--green-600,#16a34a)', pessimistic: 'var(--orange-600,#ea580c)', crisis: 'var(--red-700,#b91c1c)' };
      scenarioBadge.textContent = LABELS[scenarioMode] || scenarioMode;
      scenarioBadge.style.color = COLORS[scenarioMode] || 'var(--ink-2)';
    }
  }

  // Hero
  setText('r-paycheck', Math.round(result.plannedSpendingToday / 12).toLocaleString('en-AU'));
  // Show nominal (future $) equivalent alongside the today's $ hero metric
  const yearsToRetireCalc = Math.max(0, inp.retireAge - inp.age);
  const nominalMonthly = result.plannedSpendingNominal
    ? Math.round(result.plannedSpendingNominal / 12)
    : Math.round((result.plannedSpendingToday / 12) * Math.pow(1 + inp.inflation / 100, yearsToRetireCalc));
  setText('r-paycheck-nominal', nominalMonthly.toLocaleString('en-AU'));
  const nominalWrap = $('r-paycheck-nominal-wrap');
  if (nominalWrap) nominalWrap.hidden = yearsToRetireCalc <= 0;
  setText('r-retire-age', inp.retireAge);
  // lifespan=0 means "simulate to depletion" (age 120). Show "any age" in the UI.
  const openEnded = !(inp.lifespan > 0);
  const effectiveLifespan = openEnded ? 120 : inp.lifespan;
  setText('r-lifespan', openEnded ? 'any age' : inp.lifespan);
  setText('r-combined', result.isCouple ? ' · combined' : '');

  // Update hero units label to match active display mode
  const eyebrow = document.querySelector('.results-eyebrow');
  if (eyebrow) {
    eyebrow.innerHTML = `<span class="live-dot"></span> Live projection · ${isNominal ? 'nominal $' : "today's $"}`;
  }
  const heroUnit = document.querySelector('.hero-unit');
  if (heroUnit) {
    heroUnit.innerHTML = `planned <b>spend/mo</b> at retirement (age <span id="r-retire-age">${inp.retireAge}</span>) · ${isNominal ? 'nominal $' : "today's $"}<span id="r-combined">${result.isCouple ? ' · combined' : ''}</span>`;
  }

  // Runway — when open-ended, green only if money lasts to 120
  const ic = $('r-runway-icon');
  const ok = result.lastsUntil >= effectiveLifespan;
  const close = result.lastsUntil >= effectiveLifespan - 5;
  if (ic) {
    ic.textContent = ok ? '🟢' : close ? '🟡' : '🔴';
    ic.className = 'runway-icon' + (ok ? '' : close ? ' warn' : ' bad');
  }
  setText('r-runway', result.lastsUntil);

  // Donut
  paintDonut(result.breakdown);
  const total = (result.breakdown.super || 0) + (result.breakdown.pension || 0) + (result.breakdown.other || 0) || 1;
  const superPct = (result.breakdown.super / total) * 100;
  const pensionPct = (result.breakdown.pension / total) * 100;
  setText('r-self-pct', Math.round(superPct) + '%');
  setText('r-super-pct', Math.round(superPct) + '%');
  setText('r-pension-pct', Math.round(pensionPct) + '%');
  setText('r-other-pct', Math.round(100 - superPct - pensionPct) + '%');

  // Metrics
  const superBal = isNominal ? result.superAtRetireNominal : result.superAtRetire;
  setHTML('r-super-at-retire', fmt$(superBal, { compact: true }) + `<span class="sub">${isNominal ? 'nominal $' : "today's $"}</span>`);
  
  // Funded by breakdown
  const breakdown = isNominal ? result.breakdownNominal : result.breakdown;
  setText('r-funded-draw', fmt$(breakdown.super / 12));
  setText('r-funded-pension', fmt$(breakdown.pension / 12));
  setText('r-funded-other', fmt$((breakdown.other || 0) / 12));
  
  if (breakdown.tax > 0) {
    show('r-funded-tax-container');
    setText('r-funded-tax', '-' + fmt$(breakdown.tax / 12));
  } else {
    hide('r-funded-tax-container');
  }
  const conf = result.confidence * 100;
  const confLabel = conf >= 85 ? 'Strong' : conf >= 60 ? 'Moderate' : conf >= 35 ? 'Tight' : 'At risk';
  const confColor = conf >= 85 ? 'var(--accent)' : conf >= 60 ? 'var(--gold)' : conf >= 35 ? 'var(--amber)' : 'var(--rose)';
  const confEl = $('r-confidence');
  if (confEl) {
    confEl.innerHTML = Math.round(conf) + '%<span class="sub">' + confLabel + '</span>';
    confEl.style.color = confColor;
  }
  setText('r-confidence-label', confLabel);

  // Gauge
  const targetMonthly = inp.desiredIncome / 12;
  setText('r-goal', '$' + Math.round(targetMonthly).toLocaleString('en-AU'));
  const gauge = Math.min(100, Math.max(0, ((result.plannedSpendingToday / 12) / targetMonthly) * 100));
  const gaugeFill = $('r-gauge-fill');
  if (gaugeFill) gaugeFill.style.width = gauge + '%';
  const gap = result.gapMonthly;
  const gapEl = $('r-gap');
  if (gapEl) {
    if (gap > 0) {
      gapEl.textContent = '−$' + Math.round(gap).toLocaleString('en-AU') + '/mo';
      gapEl.style.color = 'var(--rose)';
    } else {
      gapEl.textContent = 'On track';
      gapEl.style.color = 'var(--accent)';
    }
  }

  // Surplus allocation panel
  paintSurplusPanel(result, inp);

  // Mini chart
  paintMiniChart(result.years, inp);
  setText('r-mini-range', `today → age ${result.years[result.years.length - 1]?.age ?? effectiveLifespan}`);

  // Hero stats
  setText('hs-age', inp.age);
  setText('hs-plan', openEnded ? 'any age' : inp.lifespan);
  setText('hs-salary', '$' + Math.round(inp.salary / 1000) + 'k');
  setText('hs-super', '$' + Math.round(inp.superBal / 1000) + 'k');
  setText('hs-yrs-to-retire', Math.max(0, inp.retireAge - inp.age));

  // Year table
  paintYearTable(result.years, inp);

  // Goal translation
  setText('goal-week', '$' + (inp.desiredIncome / 52).toFixed(0));
  setText('goal-month', '$' + (inp.desiredIncome / 12).toFixed(0));

  // Slider display
  const rt = $('riskTolerance');
  const rtd = $('riskTolerance-display');
  if (rt && rtd) rtd.textContent = rt.value + ' / 10';
}

// ── Surplus allocation panel ──────────────────────────────────────────────────
// Shown when mandatory minimum super drawdown exceeds target spending.
// The excess is reinvested in a split: 40% savings, 30% investment, 30% liquid.
function paintSurplusPanel(result, inp) {
  const container = $('r-surplus-panel');
  if (!container) return;

  const surplus = result.surplusMonthly || 0;
  const targetMonthly = inp.desiredIncome / 12;

  if (surplus < 1) {
    container.hidden = true;
    return;
  }

  const fmt = (n) => '$' + Math.round(n).toLocaleString('en-AU');
  const savingsM   = Math.round(surplus * 0.40);
  const investM    = Math.round(surplus * 0.30);
  const liquidM    = Math.round(surplus * 0.30);

  container.hidden = false;
  container.innerHTML = `
    <div class="surplus-panel-inner">
      <div class="surplus-header">
        <span class="surplus-icon">+</span>
        <span>Monthly surplus reinvested: <strong>${fmt(surplus)}/mo</strong></span>
      </div>
      <p class="surplus-desc">
        Your projected income (${fmt(result.monthlyPaycheck)}/mo) exceeds your target spending
        (${fmt(result.plannedSpendingToday / 12)}/mo). The surplus is automatically reinvested, extending your
        portfolio's longevity.
      </p>
      <div class="surplus-split">
        <div class="surplus-bucket surplus-savings">
          <div class="surplus-bucket-pct">40%</div>
          <div class="surplus-bucket-amt">${fmt(savingsM)}/mo</div>
          <div class="surplus-bucket-label">Savings</div>
        </div>
        <div class="surplus-bucket surplus-invest">
          <div class="surplus-bucket-pct">30%</div>
          <div class="surplus-bucket-amt">${fmt(investM)}/mo</div>
          <div class="surplus-bucket-label">Investment</div>
        </div>
        <div class="surplus-bucket surplus-liquid">
          <div class="surplus-bucket-pct">30%</div>
          <div class="surplus-bucket-amt">${fmt(liquidM)}/mo</div>
          <div class="surplus-bucket-label">Emergency fund</div>
        </div>
      </div>
    </div>`;
}

// ── Donut ──
function paintDonut(b) {
  const svg = $('r-donut');
  if (!svg) return;
  svg.innerHTML = '';
  const slices = [
    { v: b.super,   color: 'oklch(0.50 0.09 155)' },
    { v: b.pension, color: 'oklch(0.72 0.10 75)'  },
    { v: b.other,   color: 'oklch(0.62 0.13 25)'  },
  ];
  const total = slices.reduce((a, s) => a + s.v, 0) || 1;
  const r = 51, c = 2 * Math.PI * r;
  svg.innerHTML = `<circle cx="60" cy="60" r="${r}" fill="none" stroke="var(--surface-3)" stroke-width="18" />`;
  let offset = 0;
  slices.forEach((s) => {
    const len = (s.v / total) * c;
    svg.insertAdjacentHTML('beforeend',
      `<circle cx="60" cy="60" r="${r}" fill="none" stroke="${s.color}" stroke-width="18"
        stroke-dasharray="${len} ${c - len}" stroke-dashoffset="${-offset}" transform="rotate(-90 60 60)"/>`);
    offset += len;
  });
}

// ── Mini chart ──
function paintMiniChart(years, inp) {
  const svg = document.getElementById('r-mini-svg');
  if (!svg || !years.length) return;
  const w = 360, h = 96, pad = { l: 8, r: 8, t: 8, b: 18 };
  const innerW = w - pad.l - pad.r, innerH = h - pad.t - pad.b;
  const inflR = inp.inflation / 100;
  const data = years.map(y => ({ age: y.age, v: y.totalAssets / Math.pow(1 + inflR, y.age - inp.age), retired: y.retired }));
  const maxV = Math.max(...data.map(d => d.v), 1);
  const xs = i => pad.l + (i / Math.max(1, data.length - 1)) * innerW;
  const ys = v => pad.t + innerH - (v / maxV) * innerH;
  const path = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${xs(i)},${ys(d.v)}`).join(' ');
  const area = path + ` L${xs(data.length - 1)},${pad.t + innerH} L${xs(0)},${pad.t + innerH} Z`;
  const retIdx = data.findIndex(d => d.retired);
  const retX = retIdx >= 0 ? xs(retIdx) : null;
  const ticks = [0, Math.floor(data.length * 0.33), Math.floor(data.length * 0.66), data.length - 1];

  svg.innerHTML = `
    <defs>
      <linearGradient id="grad-mini" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.22"/>
        <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
      </linearGradient>
    </defs>
    ${retX !== null
      ? `<line x1="${retX}" x2="${retX}" y1="${pad.t - 2}" y2="${pad.t + innerH + 2}"
              stroke="var(--ink-3)" stroke-dasharray="2 3" stroke-width="1"/>
         <text x="${retX}" y="${pad.t - 4}" text-anchor="middle" font-size="9"
               fill="var(--ink-3)" font-family="var(--font-mono)">retire</text>`
      : ''}
    <path d="${area}" fill="url(#grad-mini)"/>
    <path d="${path}" stroke="var(--accent)" stroke-width="2" fill="none"/>
    ${ticks.map((i, k) => `<text x="${xs(i)}" y="${h - 4}"
        text-anchor="${k === 0 ? 'start' : k === ticks.length - 1 ? 'end' : 'middle'}"
        font-size="10" fill="var(--ink-3)" font-family="var(--font-mono)">${data[i].age}</text>`).join('')}
  `;
}

// ── Year table ──
function paintYearTable(years, inp) {
  const body = document.getElementById('year-tbody');
  if (!body) return;
  const currentYear = new Date().getFullYear();
  const inflR = inp.inflation / 100;
  const displayUnits = getDisplayUnits();
  const formatAmount = (value, year) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return '—';
    const yearsAhead = Math.max(0, (year || currentYear) - currentYear);
    const adjusted = displayUnits === 'today'
      ? numeric / Math.pow(1 + inflR, yearsAhead)
      : numeric;
    return '$' + Math.round(adjusted / 1000).toLocaleString('en-AU') + 'k';
  };

  const SOURCE_LABEL = { super: 'Super', savings: 'Savings', mixed: 'Mixed', depleted: 'Depleted', accumulating: '' };
  const SOURCE_CLASS = { super: 'src-super', savings: 'src-savings', mixed: 'src-mixed', depleted: 'src-depleted', accumulating: '' };

  // Update column header label to match active display mode
  const headerCell = document.querySelector('#year-tbody').closest('table')?.querySelector('th:nth-child(9)');
  if (headerCell) {
    headerCell.textContent = `Expenses/mo (${displayUnits === 'nominal' ? 'future $' : 'today\'s $'})`;
    headerCell.title = `Planned monthly living expenses for each year, shown in ${displayUnits === 'nominal' ? 'nominal (future) dollars — the actual projected cash amount for that year' : "today's dollars, deflated using the inflation rate you entered"}. Pre-retirement years show — as there are no drawdown expenses.`;
  }

  body.innerHTML = years.map((y, i) => {
    const calYear = y.year || (currentYear + i);
    const retireFlag = y.age === inp.retireAge;
    const pensionFlag = y.age >= inp.agePensionAge;
    const isOverseas = y.overseasYear;
    const travelCost = y.travelCost ?? 0;
    const livingCost = Math.max(0, (y.withdraw || 0) - travelCost);
    const srcLabel = SOURCE_LABEL[y.withdrawSource] || '';
    const srcCls = SOURCE_CLASS[y.withdrawSource] || '';

    const superTip = y.superBalance != null
      ? `Super balance at end of year ${calYear}. ${y.age >= 60 ? 'Tax-free in pension phase.' : 'Preservation age not yet reached.'}`
      : 'Super balance not available for this year.';

    const nonSuperTip = y.nonSuperLiquidAssets != null
      ? `Non-super liquid assets at end of year ${calYear}: cash, shares, ETFs and managed funds outside super.`
      : 'Non-super balance not available for this year.';

    const totalTip = `Total assets at end of year ${calYear}: super + non-super liquid + home equity + investment property equity.`;

    const withdrawBreakdown = isOverseas
      ? `Overseas living: ${formatAmount(livingCost, calYear)} + Return travel: ${formatAmount(travelCost, calYear)}. Source: ${srcLabel || '—'}.`
      : `Annual portfolio withdrawal to fund living expenses. Primary source: ${srcLabel || '—'}.`;

    const pensionTip = y.pension > 0
      ? `Age Pension income for year ${calYear}. Amount reflects assets/income test and any AWLR portability adjustment.`
      : `No Age Pension this year (assets/income test result or below pension age ${inp.agePensionAge}).`;

    const incomeTip = `Total retirement income for year ${calYear}: withdrawals + Age Pension + investment property income + other sources.`;

    // Monthly expenses: convert plannedSpending to the active display unit, then divide by 12.
    // Pre-retirement accumulation rows have plannedSpending=0, shown as em-dash.
    const expensesTip = y.retired && y.plannedSpending > 0
      ? `Planned annual living expenses for ${calYear}: ${formatAmount(y.plannedSpending, calYear)} (${displayUnits === 'nominal' ? 'nominal' : 'today\'s $'}). Shown per month.`
      : 'Pre-retirement year — no drawdown expenses modelled.';
    const monthlyExpenses = (y.retired && y.plannedSpending > 0)
      ? (() => {
          const yearsAhead = Math.max(0, calYear - currentYear);
          const adjusted = displayUnits === 'today'
            ? y.plannedSpending / Math.pow(1 + inflR, yearsAhead)
            : y.plannedSpending;
          return '$' + Math.round(adjusted / 12).toLocaleString('en-AU');
        })()
      : '—';

    return `<tr class="${retireFlag ? 'retire' : ''} ${pensionFlag ? 'pension' : ''} ${isOverseas ? 'overseas' : ''}">
      <td title="Calendar year">${calYear}${isOverseas ? ' ✈' : ''}</td>
      <td title="Age at start of year ${calYear}">${y.age}${retireFlag ? ' ★' : ''}</td>
      <td title="${escapeHtml(superTip)}">${formatAmount(y.superBalance, calYear)}</td>
      <td title="${escapeHtml(nonSuperTip)}">${formatAmount(y.nonSuperLiquidAssets, calYear)}</td>
      <td title="${escapeHtml(totalTip)}">${formatAmount(y.totalAssets, calYear)}</td>
      <td title="${escapeHtml(withdrawBreakdown)}">${formatAmount(y.withdraw, calYear)}${srcLabel ? ` <span class="wy-src ${escapeHtml(srcCls)}">${escapeHtml(srcLabel)}</span>` : ''}</td>
      <td title="${escapeHtml(pensionTip)}">${formatAmount(y.pension, calYear)}</td>
      <td title="${escapeHtml(incomeTip)}">${formatAmount((y.withdraw || 0) + (y.pension || 0) + (y.otherIncome || 0), calYear)}</td>
      <td title="${escapeHtml(expensesTip)}">${monthlyExpenses}</td>
    </tr>`;
  }).join('');
}

// ============================================================
// 7. LIVE RECALC (debounced)
// ============================================================
let debounce;
function recalc() {
  clearTimeout(debounce);
  debounce = setTimeout(() => {
    try {
      resetCoreDerivedAnalysis();
      const baseState = syncAppState();
      paint(baseState.adaptedResult, baseState.input);
      renderAnalysisPanels();
      syncToolButtonStates();
      clearResultsError();
      // Mark calculate buttons as dirty when inputs have changed since last full analysis
      const currentHash = getInputsHash();
      const isDirty = lastFullAnalysisHash === null || currentHash !== lastFullAnalysisHash;
      markCalcButtonState(isDirty);
    } catch (e) {
      adv2Error('recalc failed', e);
      showResultsError(e.message || String(e), 'Live calculation failed');
    }
  }, 100);
}

// ============================================================
// 8. ANALYSIS TABS
// ============================================================
function initTabs() {
  document.querySelectorAll('.analysis-tabs button').forEach((b) => {
    b.addEventListener('click', () => {
      const tab = b.dataset.tab;
      document.querySelectorAll('.analysis-tabs button').forEach((x) => x.classList.toggle('on', x === b));
      document.querySelectorAll('[data-tab-panel]').forEach((p) => {
        p.hidden = p.dataset.tabPanel !== tab;
      });
      renderAnalysisPanels();
    });
  });
  // Jump buttons inside the sticky panel and action strip
  document.querySelectorAll('[data-jump]').forEach((b) => {
    b.addEventListener('click', () => {
      const tab = b.dataset.jump;
      const btn = document.querySelector(`.analysis-tabs button[data-tab="${tab}"]`);
      if (btn) btn.click();
      const el = document.getElementById('analysis');
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' });
    });
  });
}

// ============================================================
// 9. TOPBAR + ACTION STRIP
// ============================================================
function initTopbar() {
  const btn = document.getElementById('btn-theme');
  if (btn) btn.addEventListener('click', () => {
    const cur = document.documentElement.getAttribute('data-theme');
    document.documentElement.setAttribute('data-theme', cur === 'dark' ? 'light' : 'dark');
  });

  const adv = document.getElementById('btn-advanced');
  if (adv) adv.addEventListener('click', () => { activeTier = activeTier === 'advanced' ? 'basic' : 'advanced'; applyAdvancedVisibility(); recalc(); });

  document.querySelectorAll('[data-tier-button]').forEach((tierButton) => {
    tierButton.addEventListener('click', () => {
      activeTier = tierButton.dataset.tierButton || 'basic';
      applyAdvancedVisibility();
      recalc();
    });
  });

  const calc = document.getElementById('btn-calc-full');
  const calcBar = document.getElementById('btn-calculate');
  [calc, calcBar].forEach((b) => b && b.addEventListener('click', () => {
    runAction(b, runFullAnalysis, {
      successMessage: 'Core projection updated.',
      targetTab: 'summary',
      runningLabel: 'Running…',
    });
  }));

  const load = document.getElementById('btn-load');
  const save = document.getElementById('btn-save');
  if (load) load.addEventListener('click', () => runAction(load, handleLoadData, { runningLabel: 'Loading…' }));
  if (save) save.addEventListener('click', handleSaveData);

  const tools = [
    ['tool-mc', runMonteCarloAnalysis, 'Monte Carlo analysis updated.', 'risk', 'Running…'],
    ['tool-when', runRetirementAgeAnalysis, 'Retirement Age Solver updated.', 'whatif', 'Solving…'],
    ['tool-stress', runStressAnalysis, 'Stress test updated.', 'risk', 'Testing…'],
    ['tool-ai', runRecommendationAnalysis, 'Suggestions and action plan updated.', 'ai', 'Thinking…'],
    ['tool-overseas', runOverseasAnalysis, 'Overseas analysis updated.', 'overseas', 'Analysing…'],
    ['tool-pdf', handlePdfExport, null, null, 'Exporting…'],
  ];

  tools.forEach(([id, handler, successMessage, targetTab, runningLabel]) => {
    const button = document.getElementById(id);
    if (!button) return;
    button.addEventListener('click', () => {
      runAction(button, handler, { successMessage, targetTab, runningLabel });
    });
  });

  const analysis = document.getElementById('analysis');
  if (analysis) {
    analysis.addEventListener('click', (event) => {
      const target = event.target.closest('[data-refresh-tool]');
      if (!target) return;
      const toolButton = document.getElementById(target.dataset.refreshTool);
      if (toolButton) toolButton.click();
    });
  }
}

export {
  APP_STATE,
  adaptEngineOutput,
  applyHouseholdVisibility,
  applyImportedUserData,
  buildEngineInputs,
  computeBaseState,
  calculateRichTargetAmount,
  calculateTargetBuilderTotal,
  getAsfaComfortableAmount,
  getHouseholdPensionDefaults,
  mapDestinationCode,
  normalizeImportedUserData,
  normaliseRiskProfile,
  runFullAnalysis,
  runOverseasAnalysis,
  runRecommendationAnalysis,
  runRetirementAgeAnalysis,
  runStressAnalysis,
  runEngine,
  resetDerivedAnalysis,
  resetCoreDerivedAnalysis,
  buildInputSignature,
  getSecondaryAnalysisState,
  markSecondaryAnalysisFresh,
  updateSecondaryAnalysisStaleStates,
  setSectionOpenState,
  syncAppState,
  syncPensionMeansTestFields,
};

function autoFillSalarySacrifice(yourEmployerSG, partnerEmployerSG, concessionalAlreadyUsed) {
  const cap = ENHANCED_CONFIG.CONCESSIONAL_CAP || 30000;

  const sacrificeEl = document.getElementById('salarySacrifice');
  if (sacrificeEl && sacrificeEl.dataset.userModified !== 'true') {
    const remaining = Math.max(0, cap - yourEmployerSG - (concessionalAlreadyUsed || 0));
    sacrificeEl.value = String(Math.round(remaining));
    sacrificeEl.dataset.autoCalculated = 'true';
  }

  const partnerEl = document.getElementById('partnerSalarySacrifice');
  if (partnerEl && partnerEl.dataset.userModified !== 'true') {
    const remaining = Math.max(0, cap - partnerEmployerSG);
    partnerEl.value = String(Math.round(remaining));
    partnerEl.dataset.autoCalculated = 'true';
  }
}

function updateIncomeSuperSummary() {
  const summary = document.getElementById("sgSummary");
  if (!summary) return;

  const inp = readInputs();
  const rate = pct(inp.employerRate || DEFAULTS.economic.employerSuperContributionRate || 12, 12);
  const your = resolveEmployerSuper({
    employmentIncome: inp.salary,
    incomeMode: inp.salaryIncomeMode,
    sgRate: rate,
    maxContributionBasePerQuarter: inp.maxContributionBasePerQuarter,
    applyMaxContributionBase: inp.applyMaxContributionBase !== false,
    employerSuperMode: inp.employerSuperMode,
    employerSuperOverrideAmount: inp.employerSuperOverrideAmount,
  });
  const partner = resolveEmployerSuper({
    employmentIncome: inp.partnerSalary || 0,
    incomeMode: inp.partnerSalaryIncomeMode,
    sgRate: rate,
    maxContributionBasePerQuarter: inp.maxContributionBasePerQuarter,
    applyMaxContributionBase: inp.applyMaxContributionBase !== false,
    employerSuperMode: inp.partnerEmployerSuperOverrideEnabled ? 'override' : 'standard',
    employerSuperOverrideAmount: inp.partnerEmployerSuperOverrideAmount,
  });

  autoFillSalarySacrifice(your.employerSG, partner.employerSG, inp.concessionalUsedThisYear);

  // Re-read after auto-fill so status reflects the auto-filled values
  const inpAfter = readInputs();
  const status = calculateConcessionalCapStatus({
    employerSG: your.employerSG,
    salarySacrifice: inpAfter.salarySacrifice,
    concessionalAlreadyUsed: inpAfter.concessionalUsedThisYear,
    concessionalCap: ENHANCED_CONFIG.CONCESSIONAL_CAP || 30000,
  });
  const warnings = [];
  if (your.sgCapApplied) warnings.push('Employer SG is normally capped by the maximum super contribution base. The calculated standard SG is ' + formatCurrency(your.calculatedEmployerSG) + '.');
  if (your.employerSuperOverridden) warnings.push('Employer SG manually overridden. Package-inclusive override recalculates cash salary within the package.');
  if (status.employerSGFillsCap) warnings.push("Employer SG alone reaches the concessional cap.");
  if (status.hasExcessConcessionalContribution) warnings.push("Salary sacrifice exceeds remaining concessional cap.");
  if (shouldWarnDivision293({
    cashSalary: your.cashSalary,
    totalPackage: your.totalPackage,
    lowTaxContributions: status.totalConcessional,
    threshold: ENHANCED_CONFIG.DIVISION_293_THRESHOLD || 250000,
  })) {
    warnings.push("Division 293 tax may apply to high-income earners. This can add an extra 15% tax to some or all concessional super contributions. Confirm with ATO or a tax adviser.");
  }

  summary.textContent = [
    "Cash salary " + formatCurrency(your.cashSalary),
    "employer SG " + formatCurrency(your.employerSG) + (your.employerSuperOverridden ? " manually overridden" : ""),
    "total package " + formatCurrency(your.totalPackage),
    "remaining concessional cap " + formatCurrency(Math.max(0, status.remainingConcessionalCap)),
    ...warnings,
  ].join(". ");
}

// ============================================================
// BOOT
// ============================================================
function boot() {
  if (bootStarted) return;
  bootStarted = true;

  try {
    adv2Info('[advanced-v2] boot starting');
    initAccordion();
    initSegmented();
    initTabs();
    initTopbar();
    // advanced-v2 relies on the shared tooltip backfill because many fields use
    // lightweight label markup instead of the classic page's inline tooltip HTML.
    initializeTooltips();
    initPensionFieldDefaults();
    // Mark sacrifice fields as user-modified when manually edited
    ['salarySacrifice', 'partnerSalarySacrifice'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => { el.dataset.userModified = 'true'; });
      }
    });

    [
      "salary",
      "salaryIncomeMode",
      "partnerSalary",
      "partnerSalaryIncomeMode",
      "salarySacrifice",
      "partnerSalarySacrifice",
      "concessionalUsedThisYear",
      "employerRate",
      "applyMaxContributionBase",
      "maxContributionBasePerQuarter",
      "employerSuperOverrideEnabled",
      "employerSuperOverrideAmount",
      "partnerEmployerSuperOverrideEnabled",
      "partnerEmployerSuperOverrideAmount",
    ].forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener("input", updateIncomeSuperSummary);
        el.addEventListener("change", updateIncomeSuperSummary);
      }
    });
    const resetEmployerSuperOverride = document.getElementById('resetEmployerSuperOverride');
    if (resetEmployerSuperOverride) {
      resetEmployerSuperOverride.addEventListener('click', () => {
        const current = readInputs();
        const calc = calculateEmployerSuper({
          employmentIncome: current.salary,
          incomeMode: current.salaryIncomeMode,
          sgRate: pct(current.employerRate || DEFAULTS.economic.employerSuperContributionRate || 12, 12),
          maxContributionBasePerQuarter: current.maxContributionBasePerQuarter,
          applyMaxContributionBase: current.applyMaxContributionBase !== false,
        });
        const field = document.getElementById('employerSuperOverrideAmount');
        if (field) field.value = String(Math.round(calc.employerSG));
        updateIncomeSuperSummary();
      });
    }
    updateIncomeSuperSummary();

    const getDesiredIncomeMode = () => document.querySelector('[data-bind="desiredIncomeMode"]')?.dataset?.value || 'manual';
    const setDesiredIncomeMode = (mode) => {
      const modeSeg = document.querySelector('[data-bind="desiredIncomeMode"]');
      if (!modeSeg) return;
      modeSeg.dataset.value = mode;
      modeSeg.querySelectorAll('button').forEach((button) => {
        button.classList.toggle('on', button.dataset.value === mode);
      });
    };
    const setDesiredIncome = (amount, sourceLabel) => {
      const desiredIncomeEl = document.getElementById('desiredIncome');
      if (!desiredIncomeEl) return;
      desiredIncomeEl.value = String(Math.round(amount));
      desiredIncomeEl.dataset.autoDefault = 'true';
      desiredIncomeEl.dataset.source = sourceLabel || '';
      desiredIncomeEl.dataset.suppressManual = 'true';
      desiredIncomeEl.dispatchEvent(new Event('input', { bubbles: true }));
      delete desiredIncomeEl.dataset.suppressManual;
      const sourceEl = document.getElementById('desiredIncomeSource');
      if (sourceEl) sourceEl.textContent = sourceLabel || 'Manual desired income';
    };
    const computeBuilderTargetFromInputs = () => {
      const i = readInputs();
      const residenceType = normalizeResidenceType(i);
      const continuingHousing = isNonHomeownerResidence(residenceType) ? i.primaryRentMonthly * 12 : 0;
      return calculateTargetBuilderTotal({
        currentMonthlyIncome: i.builderCurrentIncome,
        monthlyHousingOffset: i.builderMortgage,
        monthlyCostsEnding: i.builderChildren,
        annualHealthcare: i.healthcareCost,
        annualHousingCost: continuingHousing,
        bufferPct: i.builderBuffer,
      });
    };
    const syncBuilderEstimate = () => {
      const i = readInputs();
      const residenceType = normalizeResidenceType(i);
      const healthcareEl = document.getElementById('builderHealthcare');
      const housingEl = document.getElementById('builderHousingCost');
      const estimateEl = document.getElementById('builderTotalEstimate');
      const continuingHousing = isNonHomeownerResidence(residenceType) ? i.primaryRentMonthly * 12 : 0;
      if (healthcareEl) healthcareEl.value = String(Math.round(i.healthcareCost || 0));
      if (housingEl) housingEl.value = String(Math.round(continuingHousing));
      if (estimateEl) estimateEl.textContent = formatCurrency(computeBuilderTargetFromInputs());
    };
    const recomputeDesiredIncomeFromBuilder = () => {
      syncBuilderEstimate();
      if (getDesiredIncomeMode() !== 'builder') return;
      setDesiredIncome(computeBuilderTargetFromInputs(), 'Using builder total');
    };
    const recomputeDesiredIncomeFromGoalControls = () => {
      const desiredIncomeEl = document.getElementById('desiredIncome');
      if (desiredIncomeEl?.dataset?.autoDefault === 'false') return;
      const richSel = document.getElementById('richTarget');
      const customEl = document.getElementById('richTargetCustom');
      const bufferEl = document.getElementById('builderBuffer');
      if (!richSel || !bufferEl) return;
      const target = calculateRichTargetAmount({
        household: document.querySelector('[data-bind="household"]')?.dataset?.value || 'couple',
        richTarget: richSel.value || '1.0',
        customAmount: customEl?.value || 0,
        bufferPct: bufferEl.value || 0,
      });
      setDesiredIncome(target, `Using Rich target: ${richSel.options[richSel.selectedIndex]?.text || 'ASFA Comfortable'}`);
      syncBuilderEstimate();
    };
    document.addEventListener('adv2:household-changed', () => {
      recomputeDesiredIncomeFromBuilder();
      recomputeDesiredIncomeFromGoalControls();
    });

    const desiredIncomeEl = document.getElementById('desiredIncome');
    if (desiredIncomeEl) {
      desiredIncomeEl.dataset.autoDefault = desiredIncomeEl.dataset.autoDefault || 'true';
      desiredIncomeEl.addEventListener('input', () => {
        if (desiredIncomeEl.dataset.suppressManual === 'true') return;
        if (getDesiredIncomeMode() === 'manual') {
          desiredIncomeEl.dataset.autoDefault = 'false';
          desiredIncomeEl.dataset.source = 'manual';
          const sourceEl = document.getElementById('desiredIncomeSource');
          if (sourceEl) sourceEl.textContent = 'Manual desired income';
        }
      });
    }

    const desiredIncomeModeSeg = document.querySelector('[data-bind="desiredIncomeMode"]');
    if (desiredIncomeModeSeg) {
      desiredIncomeModeSeg.querySelectorAll('button').forEach((button) => {
        button.addEventListener('click', () => {
          if (button.dataset.value === 'builder') {
            recomputeDesiredIncomeFromBuilder();
          } else {
            const sourceEl = document.getElementById('desiredIncomeSource');
            if (sourceEl) sourceEl.textContent = 'Manual desired income';
          }
        });
      });
    }

    const btnApplyBuilder = document.getElementById('btn-apply-builder');
    if (btnApplyBuilder) {
      btnApplyBuilder.addEventListener('click', () => {
        setDesiredIncomeMode('builder');
        recomputeDesiredIncomeFromBuilder();
        showNotification(`Using builder target: ${formatCurrency(computeBuilderTargetFromInputs())}`, 'success');
      });
    }

    bindConditional('investmentProperty', 'data-ip');
    bindConditional('goingOverseas', 'data-overseas');

    // Show/hide the Overseas tab whenever the goingOverseas toggle changes
    (function () {
      const overseasCb = document.getElementById('goingOverseas');
      const overseasTabBtn = document.getElementById('overseas-tab-btn');
      if (!overseasCb || !overseasTabBtn) return;
      const syncTab = () => { overseasTabBtn.hidden = !overseasCb.checked; };
      overseasCb.addEventListener('change', syncTab);
      syncTab();
    }());

    // Show/hide custom rich target input and sync desired income target.
    (function () {
      const richSel  = document.getElementById('richTarget');
      const richWrap = document.getElementById('richTargetCustomWrap');
      const richCustom = document.getElementById('richTargetCustom');
      const bufferEl = document.getElementById('builderBuffer');
      if (!richSel || !richWrap) return;
      const syncRich = (apply = true) => {
        richWrap.style.display = richSel.value === 'custom' ? '' : 'none';
        if (apply) recomputeDesiredIncomeFromGoalControls();
      };
      richSel.addEventListener('change', () => syncRich(true));
      if (richCustom) {
        richCustom.addEventListener('input', recomputeDesiredIncomeFromGoalControls);
        richCustom.addEventListener('change', recomputeDesiredIncomeFromGoalControls);
      }
      if (bufferEl) {
        bufferEl.addEventListener('input', recomputeDesiredIncomeFromGoalControls);
        bufferEl.addEventListener('change', recomputeDesiredIncomeFromGoalControls);
      }
      syncRich(false);
    }());

    // Investment property type → auto-fill strata levy default and update growth rate hint
    (function () {
        const ipTypeSel      = document.getElementById('ipType');
        const ipStrataInput  = document.getElementById('ipStrataLevy');
        const ipGrowthInput  = document.getElementById('ipGrowthRate');
        if (!ipTypeSel || !ipStrataInput) return;

        // Strata levy defaults by property type (mirrors config.INVESTMENT_PROPERTY_TYPES)
        const strataDefaults = { house: 0, townhouse: 2500, unit: 6000 };
        // Growth rate structural adjustment (pp) relative to user's entered rate
        const growthAdj      = { house: 0, townhouse: -0.5, unit: -1.5 };

        function onTypeChange() {
            const type = ipTypeSel.value;
            // Only auto-fill strata if the field is still at a default value (don't overwrite user edits)
            const currentLevy = parseFloat(ipStrataInput.value) || 0;
            const isDefaultValue = Object.values(strataDefaults).includes(currentLevy);
            if (isDefaultValue) {
                ipStrataInput.value = strataDefaults[type] ?? 0;
            }
            // Update growth rate hint in the field-help below ipGrowthRate
            const adj = growthAdj[type] ?? 0;
            const hintEl = ipGrowthInput?.parentElement?.nextElementSibling;
            if (hintEl && hintEl.classList.contains('field-help')) {
                if (adj === 0) {
                    hintEl.textContent = 'Your expected long-run median growth rate. No structural adjustment applied for houses — full rate used.';
                } else {
                    hintEl.textContent = `Your expected long-run median growth rate. A structural adjustment of ${adj.toFixed(1)} pp is applied for ${type}s to reflect lower land content vs houses (ABS RPPI 25-year data).`;
                }
            }
            recalc();
        }

        ipTypeSel.addEventListener('change', onTypeChange);
        onTypeChange(); // run on boot to set initial state
    }());
    bindConditional('isCarer', 'data-carer');
    bindConditional('hasSmsf', 'data-smsf');
    bindConditional('hasTrust', 'data-trust');
    bindConditional('useFHSS', 'data-fhss');
    bindConditional('enableShocks', 'data-shocks');
    bindConditional('hasSpousalMaintenance', 'data-spousal');
    bindConditional('hasChildSupport', 'data-childsupport');
    bindConditional('enableHomeModifications', 'data-home-mods');
    bindConditional('enableAnnuity', 'data-annuity');
    bindConditional('enableTieredSpending', 'data-tiered-spending');

    // Monte Carlo custom runs show/hide + update sidebar label
    const mcRunsSel = document.getElementById('mcRuns');
    const mcRunsCustomWrap = document.getElementById('mcRunsCustomWrap');
    const mcRunsCustomInput = document.getElementById('mcRunsCustom');
    const toolMcLabel = document.getElementById('tool-mc-label');

    function updateMcRunsLabel() {
      if (!toolMcLabel || !mcRunsSel) return;
      let runs;
      if (mcRunsSel.value === 'custom') {
        runs = parseInt(mcRunsCustomInput?.value) || 2000;
        runs = Math.min(20000, Math.max(100, runs));
      } else {
        runs = parseInt(mcRunsSel.value) || 500;
      }
      toolMcLabel.textContent = runs.toLocaleString() + ' runs';
    }

    if (mcRunsSel && mcRunsCustomWrap) {
      const toggleMcCustom = () => { mcRunsCustomWrap.style.display = mcRunsSel.value === 'custom' ? 'flex' : 'none'; };
      mcRunsSel.addEventListener('change', () => { toggleMcCustom(); updateMcRunsLabel(); recalc(); });
      if (mcRunsCustomInput) {
        mcRunsCustomInput.addEventListener('input', updateMcRunsLabel);
        mcRunsCustomInput.addEventListener('change', updateMcRunsLabel);
      }
      toggleMcCustom();
      updateMcRunsLabel();
    }

    // Enforce decimal precision on key rate fields (on blur/change)
    function enforceDecimals(id, places) {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('change', () => {
        const v = parseFloat(el.value);
        if (!isNaN(v)) el.value = parseFloat(v.toFixed(places));
      });
    }
    ['inflation', 'invReturn', 'superGrowth', 'savingsReturn'].forEach(id => enforceDecimals(id, 2));
    ['mortgageRate', 'ccRate', 'personalLoanRate', 'carLoanRate', 'ipRate', 'ipGrowthRate', 'returnVolatility'].forEach(id => enforceDecimals(id, 2));

    // Lifespan validation: must be 0 (open-ended) OR strictly greater than the linked age field.
    // Runs on input so feedback is immediate; also re-checked when the age field changes.
    function bindLifespanValidation(lifespanId, ageId) {
      const lifespanEl = document.getElementById(lifespanId);
      const ageEl = document.getElementById(ageId);
      if (!lifespanEl || !ageEl) return;

      function validate() {
        const lifespan = parseInt(lifespanEl.value, 10);
        const age = parseInt(ageEl.value, 10);
        if (isNaN(lifespan) || lifespan === 0) {
          lifespanEl.setCustomValidity('');          // 0 = open-ended, always valid
        } else if (!isNaN(age) && lifespan <= age) {
          lifespanEl.setCustomValidity(
            `Must be greater than current age (${age}), or enter 0 to simulate until money runs out.`
          );
        } else {
          lifespanEl.setCustomValidity('');
        }
        lifespanEl.reportValidity && lifespanEl.reportValidity();
      }

      lifespanEl.addEventListener('input', validate);
      lifespanEl.addEventListener('change', validate);
      ageEl.addEventListener('input', validate);
      ageEl.addEventListener('change', validate);
    }

    bindLifespanValidation('lifespan', 'age');
    bindLifespanValidation('partnerLifespan', 'partnerAge');

    // Link returnFrequency to overseasMoveType:
    // A 'permanent' move means there are no return trips — lock frequency to 'never'.
    (function bindOverseasMoveType() {
      const moveTypeEl = document.getElementById('overseasMoveType');
      const returnFreqEl = document.getElementById('returnFrequency');
      if (!moveTypeEl || !returnFreqEl) return;

      function syncReturnFrequency() {
        if (moveTypeEl.value === 'permanent') {
          returnFreqEl.value = 'never';
          returnFreqEl.disabled = true;
          returnFreqEl.title = 'Return visits disabled for a permanent move';
        } else {
          returnFreqEl.disabled = false;
          returnFreqEl.title = '';
          if (returnFreqEl.value === 'never' && moveTypeEl.value !== 'permanent') {
            returnFreqEl.value = 'annually';
          }
        }
      }

      moveTypeEl.addEventListener('change', syncReturnFrequency);
      syncReturnFrequency();
    })();

    // trustBeneficiaries should only be active when a trust structure is in use.
    (function bindTrustBeneficiaries() {
      const propertyStratEl = document.getElementById('propertyStrategy');
      const hasTrustEl = document.getElementById('hasTrust');
      const benefRow = document.getElementById('trustBeneficiaries')?.closest('.field');
      if (!benefRow) return;

      function syncTrustBeneficiaries() {
        const usingTrust = (propertyStratEl?.value === 'transfer-trust') || Boolean(hasTrustEl?.checked);
        benefRow.style.opacity = usingTrust ? '' : '0.35';
        benefRow.title = usingTrust ? '' : 'Enable a trust structure above to configure beneficiaries';
        const sel = document.getElementById('trustBeneficiaries');
        if (sel) sel.disabled = !usingTrust;
      }

      if (propertyStratEl) propertyStratEl.addEventListener('change', syncTrustBeneficiaries);
      if (hasTrustEl) {
        hasTrustEl.addEventListener('change', syncTrustBeneficiaries);
        hasTrustEl.addEventListener('input', syncTrustBeneficiaries);
      }
      syncTrustBeneficiaries();
    })();

    // Mark healthcare cost field as user-edited when changed directly
    (function markHealthcareEdited() {
      const hcField = document.getElementById('healthcareCost');
      if (hcField) {
        hcField.dataset.autoDefault = hcField.dataset.autoDefault || 'true';
        const markManual = () => {
          hcField.dataset.userEdited = 'true';
          hcField.dataset.autoDefault = 'false';
        };
        hcField.addEventListener('input', markManual);
        hcField.addEventListener('change', markManual);
      }
    })();

    // A.6: Private hospital cover — affect MLS and show premium cost effect
    (function bindPrivateHospital() {
      const chkEl = document.getElementById('hasPrivateHospital');
      const ageEl = document.getElementById('ageFirstHadCover');
      if (!chkEl) return;
      function updatePrivateHospitalHelp() {
        const isChecked = chkEl.checked;
        const fieldDiv = chkEl.closest('.fields');
        let helpEl = fieldDiv?.querySelector('.private-hospital-help');
        if (!helpEl) {
          helpEl = document.createElement('div');
          helpEl.className = 'field-help private-hospital-help';
          fieldDiv?.appendChild(helpEl);
        }
        if (isChecked) {
          helpEl.innerHTML = '<b>Covered:</b> Avoids Medicare Levy Surcharge (1–1.5% of income for earnings above $93k). Annual hospital cover premium (~$2,800/yr single or ~$5,200/yr couple) is included in your healthcare cost above. Enter age you first got cover below for LHC loading.';
          if (ageEl) ageEl.closest('.field')?.removeAttribute('hidden');
        } else {
          helpEl.innerHTML = '<b>No cover:</b> If your income exceeds $93,000 (single) you pay Medicare Levy Surcharge (1–1.5% extra tax). Enable cover to model the tax saving vs premium cost trade-off.';
          if (ageEl) ageEl.closest('.field')?.setAttribute('hidden', '');
        }
      }
      chkEl.addEventListener('change', updatePrivateHospitalHelp);
      updatePrivateHospitalHelp();
    })();

    // A.8: Auto-fill spending currency AND FX change rate when overseas destination changes
    (function bindDestinationCurrency() {
      const destEl = document.getElementById('destination');
      const currEl = document.getElementById('overseasSpendingCurrency');
      const fxEl = document.getElementById('overseasAudFxChange');
      if (!destEl || !currEl) return;
      destEl.addEventListener('change', () => {
        const destination = destEl.value;
        const currency = OVERSEAS_DEST_CURRENCY_MAP[destination];
        if (currency) currEl.value = currency;
        if (fxEl && !fxEl.dataset.userEdited && OVERSEAS_DEST_FX_MEDIAN_MAP[destination] !== undefined) {
          fxEl.value = Number(OVERSEAS_DEST_FX_MEDIAN_MAP[destination]).toFixed(2);
        }
      });
      if (fxEl) {
        fxEl.addEventListener('input', () => { fxEl.dataset.userEdited = 'true'; });
      }
      if (destEl.value) {
        destEl.dispatchEvent(new Event('change'));
      }
    })();

    // A.9: Housing arrangement → rent defaults
    (function bindOverseasHousingType() {
      const housingEl = document.getElementById('overseasHousingType');
      const rentEl = document.getElementById('overseasAnnualRent');
      if (!housingEl || !rentEl) return;
      function updateRentField() {
        const isRenting = housingEl.value === 'rent' || housingEl.value === 'nomadic';
        const label = rentEl.closest('.field')?.querySelector('.field-label');
        if (!isRenting) {
          if (!rentEl.dataset.userEdited) {
            rentEl.value = '0';
          }
          if (label) label.querySelector('span:first-child').textContent = 'Annual accommodation cost (AUD equivalent)';
          rentEl.closest('.field').querySelector('.field-help').textContent = 'Not renting — enter $0 or an annual accommodation fee if applicable (e.g., village fees).';
        } else {
          if (!rentEl.dataset.userEdited) {
            rentEl.value = '12000';
          }
          if (label) label.querySelector('span:first-child').textContent = 'Annual rent (AUD equivalent)';
          rentEl.closest('.field').querySelector('.field-help').textContent = 'Annual rent converted to AUD at current rates. Subject to FX drift.';
        }
      }
      housingEl.addEventListener('change', updateRentField);
      rentEl.addEventListener('input', () => { rentEl.dataset.userEdited = 'true'; });
      updateRentField();
    })();

    // A.2: Primary residence type selector — show/hide mortgage and home value fields
    (function bindPrimaryResidenceType() {
      const typeEl = document.getElementById('primaryResidenceType');
      const homeDetails = document.getElementById('primary-home-details');
      const rentingFields = document.getElementById('renting-fields');
      const mortgageField = document.getElementById('mortgage-field');
      const mortgageRateField = document.getElementById('mortgage-rate-field');
      if (!typeEl) return;
      function updateResidenceFields() {
        const val = normalizeResidenceType({ primaryResidenceType: typeEl.value });
        const isOwner = isHomeownerResidence(val);
        const isRenting = isNonHomeownerResidence(val);
        const hasMortgage = isMortgageResidence(val);
        const homeValueEl = document.getElementById('homeValue');
        const mortgageEl = document.getElementById('mortgage');
        const mortgageRateEl = document.getElementById('mortgageRate');
        if (homeDetails) homeDetails.hidden = !isOwner;
        if (rentingFields) rentingFields.hidden = !isRenting;
        if (mortgageField) mortgageField.hidden = !hasMortgage;
        if (mortgageRateField) mortgageRateField.hidden = !hasMortgage;
        if (!isOwner) {
          if (homeValueEl && !homeValueEl.dataset.userEdited) homeValueEl.value = '0';
          if (mortgageEl && !mortgageEl.dataset.userEdited) mortgageEl.value = '0';
          if (mortgageRateEl && !mortgageRateEl.dataset.userEdited) mortgageRateEl.value = String(DEFAULTS.property.mortgageRate);
        }
        // Non-homeowner flag for pension means test (inform the hidden field or annotation)
        const isNonHomeowner = isRenting;
        // Update pension threshold if still at auto-default
        if (isNonHomeowner) {
          const householdSeg = document.querySelector('[data-bind="household"]');
          const household = householdSeg?.dataset?.value || 'couple';
          const threshField = document.getElementById('pensionAssetThreshold');
          const cutoffField = document.getElementById('pensionAssetCutoff');
          if (threshField?.dataset?.autoDefault !== 'false') {
            const nhThresh = household === 'single'
              ? ENHANCED_CONFIG.SINGLE_ASSET_THRESHOLD_NON_HOMEOWNER
              : ENHANCED_CONFIG.COUPLE_ASSET_THRESHOLD_NON_HOMEOWNER;
            if (threshField) { threshField.value = String(nhThresh); threshField.dataset.autoDefault = 'true'; }
          }
          if (cutoffField?.dataset?.autoDefault !== 'false') {
            const nhCutoff = household === 'single'
              ? ENHANCED_CONFIG.SINGLE_ASSET_LIMIT_NON_HOMEOWNER
              : ENHANCED_CONFIG.COUPLE_ASSET_LIMIT_NON_HOMEOWNER;
            if (cutoffField) { cutoffField.value = String(nhCutoff); cutoffField.dataset.autoDefault = 'true'; }
          }
        } else {
          syncPensionMeansTestFields();
        }
      }
      typeEl.addEventListener('change', () => { updateResidenceFields(); recomputeDesiredIncomeFromBuilder(); recalc(); });
      [document.getElementById('homeValue'), document.getElementById('mortgage'), document.getElementById('mortgageRate')]
        .forEach((el) => {
          if (el) el.addEventListener('input', () => { el.dataset.userEdited = 'true'; });
        });
      updateResidenceFields();
    })();

    // A.7: Enforce 2 decimal places on blur for economic rate fields
    (function bind2dpRates() {
      ['inflation', 'invReturn', 'superGrowth', 'savingsReturn', 'returnVolatility'].forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('blur', () => {
          const v = parseFloat(el.value);
          if (!isNaN(v)) el.value = v.toFixed(2);
        });
      });
    })();

    // Pre-fill expense builder from current form data on section open
    (function bindBuilderPrefill() {
      const builderSummary = document.getElementById('btn-apply-builder')?.closest('details')?.querySelector('summary');
        const syncBuilderFields = () => {
          const salaryEl = document.getElementById('salary');
          const partnerSalaryEl = document.getElementById('partnerSalary');
          const mortgageEl = document.getElementById('mortgage');
          const mortgageRateEl = document.getElementById('mortgageRate');
          const primaryRentEl = document.getElementById('primaryRentMonthly');
          const residenceTypeEl = document.getElementById('primaryResidenceType');
          const incomeField = document.getElementById('builderCurrentIncome');
          const mortField = document.getElementById('builderMortgage');
          if (!incomeField || !mortField) return;
        const household = document.querySelector('[data-bind="household"]')?.dataset?.value || 'couple';
        const includePartner = household === 'couple';
        // Always sync from current inputs so users don't have to duplicate values.
        if (salaryEl) {
          const salary = parseFloat(salaryEl.value) || 0;
          const partnerSalary = includePartner ? (parseFloat(partnerSalaryEl?.value) || 0) : 0;
          // Rough after-tax estimate: 70% of gross for planning purposes
          incomeField.value = Math.round((salary + partnerSalary) * 0.70 / 12);
        }
        const residenceType = normalizeResidenceType({ primaryResidenceType: residenceTypeEl?.value });
        if (isMortgageResidence(residenceType) && mortgageEl && mortgageRateEl) {
          const bal = parseFloat(mortgageEl.value) || 0;
          const rate = parseFloat(mortgageRateEl.value) / 100 || 0.06;
          if (bal > 0) {
            const monthly = (bal * (rate / 12)) / (1 - Math.pow(1 + rate / 12, -360));
            mortField.value = Math.round(monthly);
          } else {
            mortField.value = 0;
          }
        } else {
          mortField.value = 0;
        }
        syncBuilderEstimate();
        recomputeDesiredIncomeFromBuilder();
        };
        if (builderSummary) builderSummary.addEventListener('click', syncBuilderFields);
        ['salary', 'partnerSalary', 'mortgage', 'mortgageRate', 'primaryRentMonthly', 'primaryResidenceType', 'healthcareCost', 'builderBuffer']
          .forEach((id) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('input', syncBuilderFields);
            el.addEventListener('change', syncBuilderFields);
          });
        document.addEventListener('adv2:household-changed', syncBuilderFields);
        syncBuilderFields();
        const childrenEl = document.getElementById('builderChildren');
        if (childrenEl) childrenEl.addEventListener('input', () => { childrenEl.dataset.userEdited = 'true'; syncBuilderFields(); });
    })();

    // Link Overseas Move Type, Return Frequency and Tax Residency
    (function bindOverseasLogic() {
      const moveTypeEl = document.getElementById('overseasMoveType');
      const freqEl = document.getElementById('returnFrequency');
      const taxResEl = document.getElementById('overseasTaxResidency');
      if (!moveTypeEl || !freqEl || !taxResEl) return;

      moveTypeEl.addEventListener('change', () => {
        const moveType = moveTypeEl.value;
        if (moveType === 'permanent') {
          freqEl.value = 'never';
          taxResEl.value = 'foreign';
        } else if (moveType === 'short_absence') {
          freqEl.value = 'annually';
          taxResEl.value = 'australian';
        }
        recalc();
      });

      freqEl.addEventListener('change', () => {
        const freq = freqEl.value;
        if (freq === 'never') {
          moveTypeEl.value = 'permanent';
          taxResEl.value = 'foreign';
        } else if (freq === 'seasonal' || freq === 'quarterly') {
          moveTypeEl.value = 'extended_temporary';
          taxResEl.value = 'australian';
        }
        recalc();
      });
    })();

    document.querySelectorAll('.col-form input, .col-form select').forEach((el) => {
      el.addEventListener('input', recalc);
      el.addEventListener('change', recalc);
    });

    ['hasSmsf', 'superBal'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('change', updateSmsfLowBalanceWarning);
        el.addEventListener('input', updateSmsfLowBalanceWarning);
      }
    });
    updateSmsfLowBalanceWarning();

    applyHouseholdVisibility();
    applyAdvancedVisibility();

    // Reposition tooltip popups that would overflow the right or left viewport edge.
    // Runs on mouseenter so it recalculates after any layout shift (e.g. section open/close).
    // Adjusts `left` + `margin-left` on the .tooltiptext span in place; arrow stays centred.
    document.querySelectorAll('.tooltip').forEach((tooltipEl) => {
      tooltipEl.addEventListener('mouseenter', () => {
        const tip = tooltipEl.querySelector('.tooltiptext');
        if (!tip) return;

        // Reset any previous inline adjustment so getBoundingClientRect is unaffected
        tip.style.left = '';
        tip.style.marginLeft = '';

        const iconRect = tooltipEl.getBoundingClientRect();
        const tipW = tip.offsetWidth || 300;
        const vw = window.innerWidth;
        const iconCx = iconRect.left + iconRect.width / 2; // centre of the icon
        const MARGIN = 12; // minimum gap from viewport edge

        const idealLeft = iconCx - tipW / 2;           // default: centred on icon
        const clampedLeft = Math.max(MARGIN, Math.min(idealLeft, vw - tipW - MARGIN));

        if (Math.abs(clampedLeft - idealLeft) > 1) {
          // Convert clamped viewport-X back to a left offset relative to .tooltip
          const parentLeft = tooltipEl.getBoundingClientRect().left;
          tip.style.left = (clampedLeft - parentLeft) + 'px';
          tip.style.marginLeft = '0';
        }
      });
    });

    initialFormState = readInputs();
    recalc();
    clearResultsError();
    adv2Info('[advanced-v2] boot complete');
  } catch (error) {
    adv2Error('[advanced-v2] BOOT FAILED:', error);
    showResultsError(error.message || String(error));
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  setTimeout(boot, 0);
}
