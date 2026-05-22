// ============================================================
// src/js/advanced-v2.js
// Thin vanilla controller for the redesigned advanced page.
// Wires the new DOM to existing calculation engines.
// ============================================================

import '../css/styles.css';
import '../css/redesign.css';
import ENHANCED_CONFIG from './config.js';
import RetirementSimulator from './simulator.js';
import RecommendationEngine from './recommendation.js';
import OverseasRetirementAnalyzer from './overseas-retirement.js';
import { RiskProfilingEngine } from './risk-profiling-engine.js';
import { buildStressedInputs, normaliseStressScenarioForTest } from './policy/stress-helpers.js';
import {
  exportToPDF,
  formatCurrency,
  formatPercent,
  importUserData,
  showNotification,
  calculateStateLandTax,
  initializeTooltips,
} from './utils.js';

const simulator = new RetirementSimulator(ENHANCED_CONFIG);
const { DEFAULTS } = ENHANCED_CONFIG;
const riskProfiler = new RiskProfilingEngine(ENHANCED_CONFIG);

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
  usa: 'USA',
  thailand: 'THAILAND',
  vietnam: 'VIETNAM',
  malaysia: 'MALAYSIA',
  bali: 'BALI',
  philippines: 'PHILIPPINES',
};

const APP_STATE = {
  input: null,
  engineInputs: null,
  simulation: null,
  adaptedResult: null,
  monteCarloResults: null,
  retirementAgeResult: null,
  stressTestResults: [],
  recommendations: [],
  riskProfile: null,
  allocationStrategy: null,
  overseasAnalysis: null,
  overseasExportData: null,
  chartManager: { charts: {} },
};
let initialFormState = null;
let bootStarted = false;

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

function deriveMortgagePayment(balance, annualRate) {
  if (!(balance > 0)) return 0;
  if (!(annualRate > 0)) return balance / 360;

  const monthlyRate = annualRate / 12;
  const months = 360;

  return (balance * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months));
}

function deriveAgedCareDuration(inp) {
  const yearsRemaining = (inp.lifespan || 0) - (inp.agedCareStartAge || 0);
  return yearsRemaining > 0
    ? Math.max(1, Math.min(DEFAULTS.healthcare.agedCareDuration, Math.round(yearsRemaining)))
    : DEFAULTS.healthcare.agedCareDuration;
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
  const isCouple = inp.household === 'couple' && (
    inp.partnerAge > 0 ||
    inp.partnerSalary > 0 ||
    inp.partnerSuperBal > 0
  );
  const desiredIncome = inp.desiredIncome || DEFAULTS.pension.asfaComfortable;
  const employerContributionRate = pct(inp.employerRate || DEFAULTS.economic.employerSuperContributionRate || 12, 12);
  const mortgageRate = pct(inp.mortgageRate || DEFAULTS.property.mortgageRate, DEFAULTS.property.mortgageRate);
  const investmentPropertyRate = pct(inp.ipRate || DEFAULTS.property.investmentPropertyRate, DEFAULTS.property.investmentPropertyRate);
  const pensionAssetThreshold = inp.pensionAssetThreshold || (
    isCouple ? ENHANCED_CONFIG.COUPLE_ASSET_THRESHOLD : ENHANCED_CONFIG.SINGLE_ASSET_THRESHOLD
  );
  const pensionAssetLimit = inp.pensionAssetCutoff || (
    isCouple ? ENHANCED_CONFIG.COUPLE_ASSET_LIMIT : ENHANCED_CONFIG.SINGLE_ASSET_LIMIT
  );
  const agePensionMax = isCouple
    ? (inp.pensionAnnualCouple || ENHANCED_CONFIG.COUPLE_PENSION_MAX)
    : (inp.pensionAnnualSingle || ENHANCED_CONFIG.SINGLE_PENSION_MAX);

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
    homeowner: inp.homeValue > 0,
    ownsHome: inp.homeValue > 0,

    riskTolerance: inp.riskTolerance || DEFAULTS.risk.riskTolerance,
    hasEmergencyFund: EMERGENCY_FUND_MAP[inp.emergencyFund] || DEFAULTS.risk.hasEmergencyFund,
    hasDebt: DEBT_MAP[inp.highInterestDebt] || DEFAULTS.risk.hasDebt,
    dependents: inp.dependents,
    lossReaction: inp.riskReactionDrop || 'monitor',
    investmentExperience: EXPERIENCE_MAP[inp.investmentExperience] ?? 2,
    marketUnderstanding: inp.marketKnowledge || 'moderate',
    volatilityComfort: pct(inp.volatilityComfort || 15, 15),

    annualSalary: inp.salary,
    partnerAnnualSalary: isCouple ? inp.partnerSalary : 0,
    yourSalary: inp.salary,
    partnerSalary: isCouple ? inp.partnerSalary : 0,
    superBalance: inp.superBal,
    partnerSuperBalance: isCouple ? inp.partnerSuperBal : 0,
    yourCurrentSuper: inp.superBal,
    partnerCurrentSuper: isCouple ? inp.partnerSuperBal : 0,
    savings: inp.cash,
    investments: inp.stocks,
    currentSavings: inp.cash,
    currentStocks: inp.stocks,
    monthlyStockContribution: inp.monthlyStockContrib,
    percentIncomeSaved: (inp.salary + (isCouple ? inp.partnerSalary : 0)) > 0
      ? clamp((inp.monthlyStockContrib * 12) / (inp.salary + (isCouple ? inp.partnerSalary : 0)), 0, 1)
      : 0,
    useDetailedExpenseInputs: false,
    currentMonthlyHousingCosts: 0,
    currentMonthlyLivingCosts: 0,

    homeValue: inp.homeValue,
    mortgageBalance: inp.mortgage,
    mortgageRate,
    monthlyMortgagePayment: deriveMortgagePayment(inp.mortgage, mortgageRate),
    mortgageTermLeft: inp.mortgage > 0 ? 30 : 0,
    planToDownsize: inp.downsizePlan === 'yes',

    hasInvestmentProperty: inp.investmentProperty,
    investmentPropertyType: inp.ipType || 'unit',
    investmentPropertyValue: inp.ipValue,
    investmentPropertyLoan: inp.ipLoan,
    investmentPropertyRate,
    weeklyRentalIncome: inp.ipWeeklyRent,
    annualPropertyExpenses: inp.ipAnnualExpenses,
    // strataLevy is stored separately from annualPropertyExpenses so the engine
    // can model it as a unit-specific structural cost that inflates independently.
    // For houses ipStrataLevy is 0; the UI auto-fills a default for units/townhouses.
    investmentPropertyStrataLevy: inp.ipType === 'house' ? 0 : (inp.ipStrataLevy || 0),
    propertyGrowthRate: pct(inp.ipGrowthRate || DEFAULTS.property.propertyGrowthRate, DEFAULTS.property.propertyGrowthRate),
    propertyState: inp.ipState || '',
    landTax: deriveLandTax(inp),
    sellPropertyYears: DEFAULTS.property.sellPropertyYears,
    capitalGainsTaxRate: pct(DEFAULTS.property.capitalGainsTaxRate, DEFAULTS.property.capitalGainsTaxRate),

    hasPrivateHealthCover: inp.hasPrivateHospital,
    ageFirstPrivateCover: inp.ageFirstHadCover || null,
    currentHealthcareCosts: inp.healthcareCost,
    healthcareInflation: pct(DEFAULTS.healthcare.healthcareInflation, DEFAULTS.healthcare.healthcareInflation),
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
    pensionIncomeThreshold: isCouple ? ENHANCED_CONFIG.COUPLE_INCOME_THRESHOLD : ENHANCED_CONFIG.SINGLE_INCOME_THRESHOLD,

    inflation: pct(inp.inflation || DEFAULTS.economic.inflation, DEFAULTS.economic.inflation),
    investmentReturn: pct(inp.invReturn || DEFAULTS.economic.investmentReturn, DEFAULTS.economic.investmentReturn),
    returnDeclineRate: pct(DEFAULTS.economic.returnDeclineRate, DEFAULTS.economic.returnDeclineRate),
    savingsReturn: pct(inp.savingsReturn || DEFAULTS.economic.savingsReturn, DEFAULTS.economic.savingsReturn),
    superReturn: pct(inp.superGrowth || DEFAULTS.economic.superReturn, DEFAULTS.economic.superReturn),
    employerSuperContributionRate: employerContributionRate,
    superContributionRate: employerContributionRate,
    salaryGrowthRate: pct(DEFAULTS.economic.salaryGrowthRate, DEFAULTS.economic.salaryGrowthRate),
    leanYearsStart: DEFAULTS.economic.leanYearsStart,
    leanYearsReduction: pct(DEFAULTS.economic.leanYearsReduction, DEFAULTS.economic.leanYearsReduction),

    useGlidePath: DEFAULTS.allocation.useGlidePath,
    glidePathRule: DEFAULTS.allocation.glidePathRule,
    frankingCreditBenefit: DEFAULTS.allocation.frankingCreditBenefit,
    australianEquityAllocation: pct(DEFAULTS.allocation.australianEquityAllocation, DEFAULTS.allocation.australianEquityAllocation),
    dividendYield: pct(DEFAULTS.allocation.dividendYield, DEFAULTS.allocation.dividendYield),
    frankingRate: pct(DEFAULTS.allocation.frankingRate, DEFAULTS.allocation.frankingRate),
    allocEquities: pct(DEFAULTS.allocation.allocEquities, DEFAULTS.allocation.allocEquities),
    allocBonds: pct(DEFAULTS.allocation.allocBonds, DEFAULTS.allocation.allocBonds),
    allocCash: pct(DEFAULTS.allocation.allocCash, DEFAULTS.allocation.allocCash),

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
    globalRiskFactor: 0,
    extremeInflationProbability: 0,
    propertyCrashProbability: 0,

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
      // Use nullish coalescing so explicit carerAnnualExpense=0 is preserved and
      // annualParentSupport only acts as a fallback when carerAnnualExpense is unset.
      const parentCareExpense = inp.isCarer
        ? (inp.carerAnnualExpense ?? inp.annualParentSupport ?? 0)
        : (inp.annualParentSupport || 0);
      const spousalExpense = inp.hasSpousalMaintenance ? (inp.annualSpousalMaintenance || 0) : 0;
      const childSupportExpense = inp.hasChildSupport ? (inp.annualChildSupport || 0) : 0;
      const totalFamilyExpense = parentCareExpense + spousalExpense + childSupportExpense;
      return {
        isCarerForParents: !!(inp.isCarer || (inp.annualParentSupport || 0) > 0),
        carerReducedWorkPercent: inp.isCarer ? pct(inp.carerReducedWorkPercent) : 0,
        carerYearsExpected: inp.isCarer ? (inp.carerYearsExpected || 0) : ((inp.annualParentSupport || 0) > 0 ? 999 : 0),
        carerAnnualExpense: totalFamilyExpense,
      };
    })(),
    agedParentsLocation: inp.agedParentsLocation || 'australia',
    privateSchool: inp.privateSchool,
    universitySupport: inp.uniSupport,
    educationCostPerChild: inp.educationCostPerChild,
    yourAdditionalSuperContribution: inp.salarySacrifice,
    partnerAdditionalSuperContribution: isCouple ? inp.partnerSalarySacrifice : 0,
    yourAnnualNCC: inp.ncc,
    partnerAnnualNCC: isCouple ? inp.partnerNCC : 0,
    concessionalCapUsed: inp.concessionalUsedThisYear,
    spouseContribution: inp.spouseContribution,
    downsizeContribution: inp.useDownsizer,
    hasSMSF: inp.hasSmsf,
    smsfAdminCosts: inp.smsfAdminCosts ?? 3500,
    smsfInvestmentStrategy: inp.smsfInvestmentStrategy || 'balanced',
    annualTravelBudget: 0,
    annualHobbyBudget: 0,
    legacyGoal: inp.legacyGoal || 0,
    legacyGoalType: inp.legacyGoalType || 'none',
    enableProposedBudget2026: inp.budget2627,

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
    overseasAudFxChange: pct(inp.overseasAudFxChange !== undefined ? inp.overseasAudFxChange : -1, -1),
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

    // Age-related optional costs
    enableHomeModifications: Boolean(inp.enableHomeModifications),
    homeModificationCost: inp.homeModificationCost || 0,
    homeModificationAge: inp.homeModificationAge || 78,
    homeModificationRecurring: inp.homeModificationRecurring || 0,
    enableAnnuity: Boolean(inp.enableAnnuity),
    annuityPurchaseAge: inp.annuityPurchaseAge || 67,
    annuityLumpSum: inp.annuityLumpSum || 0,
    annuityAnnualIncome: inp.annuityAnnualIncome || 0,
    enableTieredSpending: Boolean(inp.enableTieredSpending),
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

  const inflationFactor = Math.pow(
    1 + (engineInputs.inflation || 0),
    Math.max(0, engineInputs.retirementAge - engineInputs.yourCurrentAge)
  );
  const superIncomeToday = (firstRetirementYear.superIncome || firstRetirementYear.withdrawal || 0) / inflationFactor;
  const pensionIncomeToday = (firstRetirementYear.pensionIncome || 0) / inflationFactor;
  const otherIncomeToday = (firstRetirementYear.otherIncome || 0) / inflationFactor;
  const annualIncomeToday = superIncomeToday + pensionIncomeToday + otherIncomeToday;
  const monthlyPaycheck = annualIncomeToday / 12;
  const targetMonthly = Math.max(1, inp.desiredIncome / 12);
  const effectivePlanAge = inp.lifespan > 0 ? inp.lifespan : 120;
  const lastsUntil = simulation.depletionAge || effectivePlanAge;
  const coverageScore = monthlyPaycheck / targetMonthly;
  const longevityScore = lastsUntil >= effectivePlanAge
    ? 1
    : clamp((lastsUntil - inp.retireAge) / Math.max(1, effectivePlanAge - inp.retireAge), 0, 1);

  return {
    monthlyPaycheck,
    superAtRetire: firstRetirementYear.startBalance / inflationFactor,
    breakdown: {
      super: Math.max(0, superIncomeToday),
      pension: Math.max(0, pensionIncomeToday),
      other: Math.max(0, otherIncomeToday),
    },
    confidence: clamp((coverageScore * 0.7) + (longevityScore * 0.3), 0, 0.98),
    gapMonthly: Math.max(0, targetMonthly - monthlyPaycheck),
    lastsUntil,
    isCouple: engineInputs.isCouple,
    years: buildProjectionYears(inp, simulation),
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
}

// ============================================================
// 3. ADVANCED FIELDS — show / hide
// ============================================================
let advancedOn = false;
function applyAdvancedVisibility() {
  document.querySelectorAll('[data-advanced="true"]').forEach((el) => {
    el.hidden = !advancedOn;
  });
  const btn = document.getElementById('btn-advanced');
  if (btn) {
    btn.textContent = advancedOn ? '✓ Advanced on' : '+ Show advanced fields';
    btn.style.background = advancedOn ? 'var(--accent-soft)' : '';
    btn.style.color = advancedOn ? 'var(--accent-ink)' : '';
    btn.style.borderColor = advancedOn ? 'var(--accent)' : '';
  }
  renumberSections();
}
function renumberSections() {
  let n = 0;
  document.querySelectorAll('.section').forEach((s) => {
    if (s.hidden || (s.dataset.advanced === 'true' && !advancedOn)) {
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
    partnerSalary: num('partnerSalary'),
    superBal: num('superBal'),
    partnerSuperBal: num('partnerSuperBal'),
    cash: num('cash'),
    stocks: num('stocks'),
    monthlyStockContrib: num('monthlyStockContrib'),
    salarySacrifice: num('salarySacrifice'),
    partnerSalarySacrifice: num('partnerSalarySacrifice'),
    employerRate: num('employerRate', 12),
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
    homeValue: num('homeValue'),
    mortgage: num('mortgage'),
    mortgageRate: num('mortgageRate'),
    downsizePlan: (document.querySelector('[data-bind="downsizePlan"]') || {}).dataset?.value || 'no',
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
    ipWeeklyRent: num('ipWeeklyRent'),
    ipAnnualExpenses: num('ipAnnualExpenses'),
    landTax: num('landTax'),
    ipGrowthRate: num('ipGrowthRate'),
    ipState: val('ipState'),

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
    legacyGoal: num('legacyGoal', 0),
    legacyGoalType: val('legacyGoalType', 'none'),

    // Healthcare
    hasPrivateHospital: chk('hasPrivateHospital'),
    healthCondition: val('healthCondition'),
    healthcareCost: num('healthcareCost'),
    ageFirstHadCover: num('ageFirstHadCover'),
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

    // Markets
    inflation: num('inflation', 2.6),
    invReturn: num('invReturn', 6.5),
    superGrowth: num('superGrowth', 7.5),
    savingsReturn: num('savingsReturn', 1.4),

    // Pension
    agePensionAge: num('agePensionAge', 67),
    pensionAnnualSingle: num('pensionAnnualSingle', 31223),
    pensionAnnualCouple: num('pensionAnnualCouple', 47070),
    pensionAssetThreshold: num('pensionAssetThreshold', getHouseholdPensionDefaults(household).threshold),
    pensionAssetCutoff: num('pensionAssetCutoff', getHouseholdPensionDefaults(household).cutoff),

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
    overseasAnnualRent: num('overseasAnnualRent', 18000),
    overseasFallbackAge: num('overseasFallbackAge'),
    overseasFallbackTrigger: val('overseasFallbackTrigger', 'none'),
  };
}

function runEngine(inp) {
  const engineInputs = buildEngineInputs(inp);
  const simulation = simulator.simulateRetirement(engineInputs, false);

  return adaptEngineOutput(inp, engineInputs, simulation);
}

function computeBaseState(inp = readInputs()) {
  const engineInputs = buildEngineInputs(inp);
  const simulation = simulator.simulateRetirement(engineInputs, false);
  const adaptedResult = adaptEngineOutput(inp, engineInputs, simulation);

  return { input: inp, engineInputs, simulation, adaptedResult };
}

function syncAppState(baseState = computeBaseState()) {
  APP_STATE.input = baseState.input;
  APP_STATE.engineInputs = baseState.engineInputs;
  APP_STATE.simulation = baseState.simulation;
  APP_STATE.adaptedResult = baseState.adaptedResult;
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
    currentStressTestResults: APP_STATE.stressTestResults,
    currentRiskProfile: APP_STATE.riskProfile,
    currentAllocationStrategy: APP_STATE.allocationStrategy,
    currentOverseasData: APP_STATE.overseasExportData,
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

    return {
      scenario: scenario.name,
      description: scenario.description,
      finalBalance,
      deltaBalance: finalBalance - baseBalance,
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
    return {
      ...base,
      ...userData,
      household: userData.household || base.household,
      downsizePlan: userData.downsizePlan || base.downsizePlan,
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
    salarySacrifice: userData.yourAdditionalSuperContribution ?? base.salarySacrifice,
    partnerSalarySacrifice: userData.partnerAdditionalSuperContribution ?? base.partnerSalarySacrifice,
    employerRate: userData.employerSuperContributionRate !== undefined ? toDisplayPercent(userData.employerSuperContributionRate) : base.employerRate,
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
    ipWeeklyRent: userData.weeklyRentalIncome ?? base.ipWeeklyRent,
    ipAnnualExpenses: userData.annualPropertyExpenses ?? base.ipAnnualExpenses,
    landTax: userData.landTax ?? base.landTax,
    ipGrowthRate: userData.propertyGrowthRate !== undefined ? toDisplayPercent(userData.propertyGrowthRate) : base.ipGrowthRate,
    ipState: userData.propertyState ?? base.ipState,
    hasSmsf: Boolean(userData.hasSMSF ?? base.hasSmsf),
    hasTrust: Boolean(userData.hasTrustAssets ?? base.hasTrust),
    desiredIncome: userData.targetRetirementIncome ?? userData.asfaComfortable ?? base.desiredIncome,
    hasPrivateHospital: Boolean(userData.hasPrivateHealthCover ?? base.hasPrivateHospital),
    healthCondition: userData.healthCondition ?? base.healthCondition,
    healthcareCost: userData.currentHealthcareCosts ?? base.healthcareCost,
    ageFirstHadCover: userData.ageFirstPrivateCover ?? base.ageFirstHadCover,
    agedCareProbability: userData.agedCareProbability !== undefined ? toDisplayPercent(userData.agedCareProbability) : base.agedCareProbability,
    agedCareStartAge: userData.agedCareStartAge ?? base.agedCareStartAge,
    agedCareAnnualCost: userData.agedCareAnnualCost ?? base.agedCareAnnualCost,
    inflation: userData.inflation !== undefined ? toDisplayPercent(userData.inflation) : base.inflation,
    invReturn: userData.investmentReturn !== undefined ? toDisplayPercent(userData.investmentReturn) : base.invReturn,
    superGrowth: userData.superReturn !== undefined ? toDisplayPercent(userData.superReturn) : base.superGrowth,
    savingsReturn: userData.savingsReturn !== undefined ? toDisplayPercent(userData.savingsReturn) : base.savingsReturn,
    agePensionAge: userData.agePensionAge ?? base.agePensionAge,
    [annualPensionField]: userData.agePensionMax ?? base[annualPensionField],
    pensionAssetThreshold: userData.pensionAssetThreshold ?? base.pensionAssetThreshold,
    pensionAssetCutoff: userData.pensionAssetLimit ?? base.pensionAssetCutoff,
    mcRuns: userData.numRuns ?? userData.mcRuns ?? base.mcRuns,
    returnVolatility: userData.returnVolatility !== undefined ? toDisplayPercent(userData.returnVolatility) : base.returnVolatility,
    scenarioMode: userData.scenarioMode ?? base.scenarioMode,
    enableShocks: Boolean(userData.enableShocks ?? base.enableShocks),
    shockProbability: userData.shockProbability ?? base.shockProbability,
    shockMagnitude: userData.shockMagnitude ?? base.shockMagnitude,
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
    overseasAudFxChange: userData.overseasAudFxChange ?? base.overseasAudFxChange,
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

function exportRedesignUserData(inputs, scenarioName = 'Advanced Calculator v2') {
  // Clamp float noise on rate fields before serialising.
  // These fields are stored as display-percent (e.g. "3.5" not "0.035").
  // Clamp float noise to 2 dp — String(parseFloat(x)) can produce 16.199999999997 etc.
  const cleanInputs = { ...inputs };
  const twoDP = [
    'inflation', 'invReturn', 'superGrowth', 'savingsReturn',
    'mortgageRate', 'ccRate', 'personalLoanRate', 'carLoanRate',
    'ipRate', 'ipGrowthRate', 'returnVolatility',
    'shockProbability', 'shockMagnitude',
    'agedCareProbability', 'employerRate', 'carerReducedWorkPercent',
  ];
  twoDP.forEach((k) => { if (cleanInputs[k] != null) cleanInputs[k] = parseFloat(Number(cleanInputs[k]).toFixed(2)); });

  const exportData = {
    version: '4.0',
    exportDate: new Date().toISOString(),
    scenarioName,
    userData: cleanInputs,
    metadata: {
      calculatorVersion: '2026.1',
      description: 'Australian Retirement Calculator - Advanced v2 input data',
      fields: Object.keys(inputs).length,
      page: 'advanced-v2',
      note: 'This file contains Advanced v2 input data for the redesigned calculator.',
    },
  };

  const timestamp = new Date().toISOString().slice(0, 16).replace(/[:.]/g, '-');
  const filename = `retirement-inputs-advanced-v2-${timestamp}.json`;
  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);

  showNotification('Your retirement data has been exported successfully!', 'success');
  return filename;
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
          <div class="mc-k">Median balance</div>
          <div class="mc-v">${fmt$(mc.median || 0, { compact: true })}</div>
          <div class="mc-sub">50th percentile</div>
        </div>
        <div class="mc-stat" style="border-color:var(--rose-soft)">
          <div class="mc-k">10th percentile</div>
          <div class="mc-v" style="color:var(--rose)">${fmt$(mc.percentile10 || 0, { compact: true })}</div>
          <div class="mc-sub">Pessimistic (1-in-10)</div>
        </div>
        <div class="mc-stat" style="border-color:var(--accent-soft)">
          <div class="mc-k">90th percentile</div>
          <div class="mc-v" style="color:var(--accent)">${fmt$(mc.percentile90 || 0, { compact: true })}</div>
          <div class="mc-sub">Optimistic (9-in-10)</div>
        </div>
        <div class="mc-stat" style="border-color:var(--rose-soft)">
          <div class="mc-k">Failure probability</div>
          <div class="mc-v" style="color:var(--rose)">${failPct.toFixed(1)}%</div>
          <div class="mc-sub">Risk of running out</div>
        </div>
      </div>

      <p style="margin:12px 0 0;font-size:12.5px;color:var(--ink-3);line-height:1.6">${escapeHtml(narrative)}</p>

      <div style="margin-top:10px;font-size:11.5px;color:var(--ink-4)">
        ⚑ Run the full simulation (↻ button) or individual Monte Carlo tool to update these results.
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
      earlyRiskHtml += `<div class="mc-stat" style="grid-column:1/-1"><div class="mc-k">Impact spread</div><div class="mc-v">${spreadYears} years</div><div class="mc-sub">A crash in year 1 vs strong early returns can mean ${spreadYears} years' difference in portfolio longevity</div></div>`;
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
  const summaryItems = [
    {
      label: 'Monthly retirement income',
      value: fmt$(state.adaptedResult?.monthlyPaycheck || 0),
      detail: 'Based on your current live inputs',
    },
    {
      label: 'Projected runway',
      value: `Age ${state.adaptedResult?.lastsUntil || '—'}`,
      detail: state.adaptedResult?.lastsUntil >= state.input?.lifespan ? 'Covers planned lifespan' : 'Needs more margin',
    },
    {
      label: 'Super at retirement',
      value: fmt$(state.adaptedResult?.superAtRetire || 0, { compact: true }),
      detail: 'Inflation-adjusted',
    },
    {
      label: 'Income gap',
      value: state.adaptedResult?.gapMonthly > 0 ? fmt$(state.adaptedResult.gapMonthly) : 'On track',
      detail: 'Gap versus your annual target income',
    },
  ];

  const monteCarloBlock = state.monteCarloResults
    ? buildMonteCarloDashboard(state.monteCarloResults, state.input)
    : `
      <div class="summary-chart">
        <h5>Full analysis</h5>
        <div class="desc">Run the full simulation to bring Monte Carlo, risk, and recommendations into this view.</div>
        <div class="metric">
          <div class="k">Current live confidence</div>
          <div class="v">${Math.round((state.adaptedResult?.confidence || 0) * 100)}%</div>
        </div>
      </div>`;

  const recommendationLead = state.recommendations?.[0]
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
  const earliest = state.retirementAgeResult;
  const stressLead = state.stressTestResults?.[0];
  const overseas = state.overseasAnalysis;
  const overseasBudget = state.overseasExportData?.scenarios?.[0]?.annualCost;

  setPanelHtml('whatif', `
    <div class="whatif-grid">
      <div class="whatif-card">
        <h5>When can I retire?</h5>
        <div class="desc">Earliest age that reaches a 70% Monte Carlo success rate.</div>
        ${earliest?.success ? `
          <div class="whatif-impact">
            <span class="pill good"><b>Age ${earliest.earliestRetirementAge}</b></span>
            <span class="pill"><b>${formatPercent(earliest.successRate || 0, 1)}</b> success</span>
            <span class="pill"><b>${earliest.yearsToWork}</b> more years</span>
          </div>
          <p style="margin:10px 0 0;color:var(--ink-3)">Median balance at that age: ${escapeHtml(formatCurrency(earliest.medianBalance || 0))}</p>
        ` : `
          <p style="margin:0;color:var(--ink-3)">${escapeHtml(earliest?.message || 'Use the "When can I retire?" tool to solve for an earlier viable retirement age.')}</p>
        `}
      </div>
      <div class="whatif-card">
        <h5>Stress test</h5>
        <div class="desc">Snapshot of prebuilt stress scenarios from the existing simulator.</div>
        ${stressLead ? `
          <div class="whatif-impact">
            <span class="pill"><b>${escapeHtml(stressLead.scenario)}</b></span>
            <span class="pill ${stressLead.deltaBalance >= 0 ? 'good' : ''}"><b>${stressLead.deltaBalance >= 0 ? '+' : ''}${escapeHtml(formatCurrency(stressLead.deltaBalance || 0))}</b></span>
          </div>
          <p style="margin:10px 0 0;color:var(--ink-3)">Final balance under this scenario: ${escapeHtml(formatCurrency(stressLead.finalBalance || 0))}</p>
        ` : `
          <p style="margin:0;color:var(--ink-3)">Use the Stress test tool to compare your base plan against market shocks.</p>
        `}
      </div>
      <div class="whatif-card">
        <h5>Monte Carlo band</h5>
        <div class="desc">Probabilistic range around your plan outcome.</div>
        ${state.monteCarloResults ? `
          <div class="whatif-impact">
            <span class="pill"><b>${formatPercent(state.monteCarloResults.successRate || 0, 1)}</b> success</span>
            <span class="pill"><b>${escapeHtml(formatCurrency(state.monteCarloResults.percentile10 || 0))}</b> downside</span>
          </div>
          <p style="margin:10px 0 0;color:var(--ink-3)">90th percentile outcome: ${escapeHtml(formatCurrency(state.monteCarloResults.percentile90 || 0))}</p>
        ` : `
          <p style="margin:0;color:var(--ink-3)">Run Monte Carlo to see best/base/worst-case ranges.</p>
        `}
      </div>
      <div class="whatif-card">
        <h5>Overseas plan</h5>
        <div class="desc">Destination-specific pension portability, cost and risk view.</div>
        ${overseas ? `
          <div class="whatif-impact">
            <span class="pill"><b>${escapeHtml(overseas.country)}</b></span>
            <span class="pill"><b>${escapeHtml(overseas.recommendations?.suitability || overseas.agePensionPortability?.rules?.status || 'Analysed')}</b></span>
          </div>
          <p style="margin:8px 0 0;color:var(--ink-3)">Annual cost: ${escapeHtml(formatCurrency(overseasBudget || 0))} · Pension overseas: ${escapeHtml(formatCurrency(overseas.agePensionPortability?.pensionCalculation?.overseas || 0))}/yr</p>
          <p style="margin:6px 0 0;font-size:12px;color:var(--ink-3)">See the <b>✈️ Overseas Plan</b> tab for full pension portability, tax, and risk details.</p>
        ` : `
          <p style="margin:0;color:var(--ink-3)">Enable an overseas destination above and click the Overseas Plan tool to see full analysis.</p>
        `}
      </div>
    </div>
  `);
}

function renderRiskPanel() {
  const risk = APP_STATE.riskProfile;
  const stressRows = APP_STATE.stressTestResults || [];

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
        <div class="desc">Run Monte Carlo or the full simulation to generate your three-dimensional risk assessment.</div>
        <p style="margin:8px 0 0;color:var(--ink-3)">Use the 📊 Monte Carlo tool in the sidebar to assess capacity, tolerance, and requirement scores.</p>
      </div>`;

  setPanelHtml('risk', `
    <div class="summary-grid">
      ${riskProfileSection}
      <div class="summary-chart">
        <h5>Stress scenarios</h5>
        <div class="desc">Deterministic shock outcomes — how your plan holds up under each scenario.</div>
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
                  ${!row.success ? ' <span style="color:var(--rose);font-weight:600">⚠ Depleted</span>' : ''}
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
  const analysis = APP_STATE.overseasAnalysis;
  const exportData = APP_STATE.overseasExportData;

  if (!analysis || analysis.error) {
    setPanelHtml('overseas', '<p style="color:var(--ink-3)">Enable an overseas destination in the Overseas section, then click the Overseas Plan tool.</p>');
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

function renderAiPanel() {
  const recommendations = APP_STATE.recommendations || [];
  const inp = APP_STATE.input || {};
  const engineInputs = APP_STATE.engineInputs || {};

  // Inject property sell-timing insight if applicable
  const sellTimingRec = generatePropertySellTimingInsight(inp, engineInputs);
  const allRecs = sellTimingRec
      ? [sellTimingRec, ...recommendations]
      : recommendations;

  if (!allRecs.length) {
    setPanelHtml('ai', '<p style="color:var(--ink-3)">Run AI suggestions or the full simulation to generate prioritised recommendations from the existing recommendation engine.</p>');
    return;
  }

  setPanelHtml('ai', `
    <div style="display:grid;gap:12px">
      ${allRecs.slice(0, 7).map((rec) => `
        <div style="padding:16px;border:1px solid var(--border);border-radius:18px;background:var(--surface)">
          <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start">
            <div>
              <div style="font-size:12px;color:var(--ink-3);text-transform:uppercase;letter-spacing:0.04em">${escapeHtml(rec.category || 'General')}</div>
              <div style="font-weight:700;margin-top:3px">${escapeHtml(rec.title || 'Recommendation')}</div>
            </div>
            <span class="chip">${escapeHtml(rec.impact || 'neutral')}</span>
          </div>
          <p style="margin:10px 0 0;color:var(--ink-2)">${escapeHtml(rec.description || '')}</p>
          ${rec.isSellTimingCard && rec.details?.length ? `
            <ul style="margin:8px 0 0;padding-left:18px;color:var(--ink-2);font-size:13px;display:grid;gap:6px">
              ${rec.details.map(d => `<li>${escapeHtml(d)}</li>`).join('')}
            </ul>
          ` : ''}
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
            ${rec.successRateDiff != null ? `<span class="chip">Success delta ${formatPercent(rec.successRateDiff, 1)}</span>` : ''}
            ${rec.medianBalanceDiff != null ? `<span class="chip">Balance delta ${escapeHtml(formatCurrency(rec.medianBalanceDiff || 0))}</span>` : ''}
            <span class="chip">${escapeHtml(rec.feasibility || 'Standard strategy')}</span>
          </div>
        </div>
      `).join('')}
    </div>
  `);
}

function renderAnalysisPanels() {
  renderSummaryPanel();
  renderWhatIfPanel();
  renderRiskPanel();
  renderAiPanel();
  renderOverseasPanel();
  // Re-render charts after panels rebuild their DOM (canvases are re-created by renderRiskPanel)
  if (APP_STATE.monteCarloResults) {
    // Use a microtask to ensure the DOM is updated before drawing
    Promise.resolve().then(() => renderMonteCarloCharts(APP_STATE.monteCarloResults, APP_STATE.input));
  }
}

async function runMonteCarloAnalysis() {
  const baseState = syncAppState();
  // Use engineInputs.numRuns (set by buildEngineInputs from the mcRuns form field).
  // This is the single source of truth — avoids any double-read discrepancy between
  // the select element and the already-computed engine state.
  const runsToUse = baseState.engineInputs.numRuns || DEFAULTS.simulation.numRuns || 500;

  // Wire up a progress callback so the loading overlay shows real progress for large runs.
  const progressBarEl = document.getElementById('adv2-progress-bar');
  const progressLabelEl = document.getElementById('adv2-loading-label');
  const progressSubEl = document.getElementById('adv2-loading-sub');

  const mcProgressCallback = runsToUse >= 500 ? async (completed, total) => {
    const pct = Math.round((completed / total) * 100);
    if (progressBarEl) progressBarEl.style.width = pct + '%';
    const remaining = total - completed;
    const approxSecs = Math.ceil((remaining / total) * (total > 5000 ? 45 : 15));
    if (progressLabelEl) progressLabelEl.textContent = `Running… ${pct}%`;
    if (progressSubEl) progressSubEl.textContent = `Completed ${completed.toLocaleString()} of ${total.toLocaleString()} runs${approxSecs > 2 ? ` — ~${approxSecs}s remaining` : ''}`;
    // Yield to the browser so the progress bar updates are visible
    await new Promise((resolve) => setTimeout(resolve, 0));
  } : null;

  if (progressBarEl) progressBarEl.style.width = '0%';

  APP_STATE.monteCarloResults = await simulator.runMonteCarloSimulation(
    baseState.engineInputs,
    runsToUse,
    mcProgressCallback
  );

  if (progressBarEl) progressBarEl.style.width = '100%';
  APP_STATE.riskProfile = normaliseRiskProfile(
    riskProfiler.generateRiskProfileSummary(baseState.engineInputs, APP_STATE.monteCarloResults)
  );
  APP_STATE.allocationStrategy = deriveAllocationStrategy(APP_STATE.riskProfile);
  renderAnalysisPanels();
  // Render fan chart + histogram into the Risk tab after panel HTML is written
  renderMonteCarloCharts(APP_STATE.monteCarloResults, APP_STATE.input);
  return APP_STATE.monteCarloResults;
}

async function runRetirementAgeAnalysis() {
  const baseState = syncAppState();
  APP_STATE.retirementAgeResult = await simulator.solveRetirementAge(baseState.engineInputs, 0.7);
  renderAnalysisPanels();
  return APP_STATE.retirementAgeResult;
}

function runStressAnalysis() {
  const baseState = syncAppState();
  APP_STATE.stressTestResults = buildStressScenarioResults(baseState);
  renderAnalysisPanels();
  return APP_STATE.stressTestResults;
}

async function runRecommendationAnalysis() {
  const baseState = syncAppState();
  const engine = new RecommendationEngine(simulator, baseState.engineInputs, ENHANCED_CONFIG);
  APP_STATE.recommendations = await engine.generateRecommendations();
  renderAnalysisPanels();
  return APP_STATE.recommendations;
}

function runOverseasAnalysis() {
  const baseState = syncAppState();
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
  APP_STATE.overseasAnalysis = analyzer.analyzeCountry(countryCode, fxOptions);

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

  APP_STATE.overseasExportData = buildOverseasExportData(
    APP_STATE.overseasAnalysis,
    baseState.input.annualLivingCostOverseas,
    getFinalBalanceValue(baseState.simulation, baseState.adaptedResult)
  );
  renderAnalysisPanels();
  return APP_STATE.overseasAnalysis;
}

async function runFullAnalysis() {
  await runMonteCarloAnalysis();
  await runRecommendationAnalysis();
  runStressAnalysis();
  if (APP_STATE.input?.goingOverseas && APP_STATE.input?.destination) {
    runOverseasAnalysis();
  }
  await runRetirementAgeAnalysis();
  renderAnalysisPanels();
  // Charts may have been cleared by renderAnalysisPanels — re-render them
  renderMonteCarloCharts(APP_STATE.monteCarloResults, APP_STATE.input);
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

function applyImportedUserData(userData) {
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
  applyImportedUserData(imported.userData || {});
  showNotification(`Loaded ${imported.scenarioName || 'saved retirement data'}.`, 'success');
}

function handleSaveData() {
  exportRedesignUserData(readInputs(), 'Advanced Calculator v2');
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
  if (!overlay) return;
  if (labelEl) labelEl.textContent = label;
  if (subEl)   subEl.textContent = OVERLAY_SUBTITLES[label] || 'This may take a moment…';
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
    const result = await handler();
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

function paint(result, inp) {
  // Hero
  setText('r-paycheck', Math.round(result.monthlyPaycheck).toLocaleString('en-AU'));
  setText('r-retire-age', inp.retireAge);
  // lifespan=0 means "simulate to depletion" (age 120). Show "any age" in the UI.
  const openEnded = !(inp.lifespan > 0);
  const effectiveLifespan = openEnded ? 120 : inp.lifespan;
  setText('r-lifespan', openEnded ? 'any age' : inp.lifespan);
  setText('r-combined', result.isCouple ? ' · combined' : '');

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
  const total = result.breakdown.super + result.breakdown.pension + (result.breakdown.other || 0) || 1;
  const superPct = (result.breakdown.super / total) * 100;
  const pensionPct = (result.breakdown.pension / total) * 100;
  setText('r-self-pct', Math.round(superPct) + '%');
  setText('r-super-pct', Math.round(superPct) + '%');
  setText('r-pension-pct', Math.round(pensionPct) + '%');
  setText('r-other-pct', Math.round(100 - superPct - pensionPct) + '%');

  // Metrics
  setHTML('r-super-at-retire', fmt$(result.superAtRetire, { compact: true }) + '<span class="sub">today\'s $</span>');
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
  const gauge = Math.min(100, Math.max(0, (result.monthlyPaycheck / targetMonthly) * 100));
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

  body.innerHTML = years.slice(0, 60).map((y, i) => {
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

    // Monthly expenses: deflate plannedSpending to today's dollars, then divide by 12.
    // Pre-retirement accumulation rows have plannedSpending=0, shown as em-dash.
    const expensesTip = y.retired && y.plannedSpending > 0
      ? `Planned annual living expenses for ${calYear}: ${formatAmount(y.plannedSpending, calYear)} nominal. Shown here deflated to today's purchasing power (÷12 for monthly).`
      : 'Pre-retirement year — no drawdown expenses modelled.';
    const monthlyExpensesToday = (y.retired && y.plannedSpending > 0)
      ? (() => {
          const yearsAhead = Math.max(0, calYear - currentYear);
          const inToday = y.plannedSpending / Math.pow(1 + inflR, yearsAhead);
          return '$' + Math.round(inToday / 12).toLocaleString('en-AU');
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
      <td title="${escapeHtml(expensesTip)}">${monthlyExpensesToday}</td>
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
      resetDerivedAnalysis();
      const baseState = syncAppState();
      paint(baseState.adaptedResult, baseState.input);
      renderAnalysisPanels();
      clearResultsError();
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
  if (adv) adv.addEventListener('click', () => { advancedOn = !advancedOn; applyAdvancedVisibility(); recalc(); });

  const calc = document.getElementById('btn-calc-full');
  const calcBar = document.getElementById('btn-calculate');
  [calc, calcBar].forEach((b) => b && b.addEventListener('click', () => {
    runAction(b, runFullAnalysis, {
      successMessage: 'Full simulation completed.',
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
    ['tool-when', runRetirementAgeAnalysis, 'Retirement-age solver updated.', 'whatif', 'Solving…'],
    ['tool-stress', runStressAnalysis, 'Stress scenarios updated.', 'risk', 'Testing…'],
    ['tool-ai', runRecommendationAnalysis, 'AI recommendations updated.', 'ai', 'Thinking…'],
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
}

export {
  adaptEngineOutput,
  applyImportedUserData,
  buildEngineInputs,
  getHouseholdPensionDefaults,
  mapDestinationCode,
  normalizeImportedUserData,
  normaliseRiskProfile,
  runEngine,
  setSectionOpenState,
  syncPensionMeansTestFields,
};

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

    // Auto-fill spending currency when overseas destination changes
    (function bindDestinationCurrency() {
      const destEl = document.getElementById('destination');
      const currEl = document.getElementById('overseasSpendingCurrency');
      if (!destEl || !currEl) return;
      const DEST_CURRENCY_MAP = {
        portugal: 'EUR', spain: 'EUR', italy: 'EUR',
        canada: 'CAD', newzealand: 'NZD', japan: 'JPY',
        india: 'INR', usa: 'USD', thailand: 'THB',
        vietnam: 'VND', malaysia: 'MYR', bali: 'IDR',
        philippines: 'PHP',
      };
      destEl.addEventListener('change', () => {
        const currency = DEST_CURRENCY_MAP[destEl.value];
        if (currency) currEl.value = currency;
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
