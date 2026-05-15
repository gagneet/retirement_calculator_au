// ============================================================
// src/js/advanced-v2.js
// Thin vanilla controller for the redesigned advanced page.
// Wires the new DOM to existing calculation engines.
// ============================================================

import '../css/styles.css';
import '../css/redesign.css';
import ENHANCED_CONFIG from './config.js';
import RetirementSimulator from './simulator.js';

const simulator = new RetirementSimulator(ENHANCED_CONFIG);
const { DEFAULTS } = ENHANCED_CONFIG;

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

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function pct(value, fallbackPercent = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallbackPercent / 100;
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
  const investmentPropertyRate = pct(DEFAULTS.property.investmentPropertyRate, DEFAULTS.property.investmentPropertyRate);
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
    partnerLifespan: isCouple ? (inp.partnerLifespan || DEFAULTS.personal.partnerLifespan) : 0,
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
    investmentPropertyValue: inp.ipValue,
    investmentPropertyLoan: inp.ipLoan,
    investmentPropertyRate,
    weeklyRentalIncome: inp.ipWeeklyRent,
    annualPropertyExpenses: inp.ipAnnualExpenses,
    propertyGrowthRate: pct(inp.ipGrowthRate || DEFAULTS.property.propertyGrowthRate, DEFAULTS.property.propertyGrowthRate),
    propertyState: inp.ipState || '',
    landTax: 0,
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
    trustType: DEFAULTS.trust.trustType,
    trustControlLevel: DEFAULTS.trust.trustControlLevel,
    trustNetAssets: 0,
    trustAttributionPercentage: 1,
    trustAnnualDistributions: 0,
    trustTaxRate: 0.3,
    familyTrustIncomeDistribution: 0,
    beneficiaryAllocation: 1,
    homeInTrust: false,
    investmentPropertyInTrust: false,
    stocksInTrust: false,

    returnVolatility: pct(inp.returnVolatility || DEFAULTS.simulation.returnVolatility, DEFAULTS.simulation.returnVolatility),
    enableShocks: inp.enableShocks,
    shockProbability: pct(DEFAULTS.simulation.shockProbability, DEFAULTS.simulation.shockProbability),
    shockMagnitude: pct(DEFAULTS.simulation.shockMagnitude, DEFAULTS.simulation.shockMagnitude),
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
    reducedIncomeAge: 0,
    reducedIncomeSalary: 0,
    partnerReducedIncomeAge: 0,
    partnerReducedIncomeSalary: 0,

    businessIncome: inp.businessIncome,
    investmentIncome: inp.investmentIncomeOutsideSuper,
    isCarerForParents: inp.isCarer,
    carerReducedWorkPercent: 0,
    carerYearsExpected: 0,
    carerAnnualExpense: inp.annualParentSupport,
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
    smsfAdminCosts: 3500,
    annualTravelBudget: 0,
    annualHobbyBudget: 0,
    legacyGoal: 0,
    legacyGoalType: 'none',
    enableProposedBudget2026: inp.budget2627,
  };
}

function buildProjectionYears(inp, simulation) {
  const retirementYears = simulation.yearlyData.map((year) => ({
    age: year.age,
    totalAssets: Math.max(0, (year.endBalance || 0) + (year.nonLiquidAssets || 0)),
    retired: true,
    withdraw: Math.max(0, year.withdrawal || year.superIncome || 0),
    pension: Math.max(0, year.pensionIncome || 0),
  }));

  if (!retirementYears.length) return [];

  const currentAssets = Math.max(
    0,
    inp.superBal +
    (inp.household === 'couple' ? inp.partnerSuperBal : 0) +
    inp.cash +
    inp.stocks
  );
  const firstRetirementAssets = retirementYears[0].totalAssets || currentAssets;
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

  return [...bridgeYears, ...retirementYears];
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
  const lastsUntil = simulation.depletionAge || inp.lifespan;
  const coverageScore = monthlyPaycheck / targetMonthly;
  const longevityScore = lastsUntil >= inp.lifespan
    ? 1
    : clamp((lastsUntil - inp.retireAge) / Math.max(1, inp.lifespan - inp.retireAge), 0, 1);

  return {
    monthlyPaycheck,
    superAtRetire: firstRetirementYear.startBalance / inflationFactor,
    breakdown: {
      super: Math.max(0, superIncomeToday),
      pension: Math.max(0, pensionIncomeToday),
      other: Math.max(0, otherIncomeToday),
    },
    confidence: clamp((coverageScore * 0.7) + (longevityScore * 0.3), 0.2, 0.98),
    gapMonthly: Math.max(0, targetMonthly - monthlyPaycheck),
    lastsUntil,
    years: buildProjectionYears(inp, simulation),
  };
}

// ============================================================
// 1. ACCORDION — single-open behaviour
// ============================================================
function initAccordion() {
  document.querySelectorAll('.section-head').forEach((head) => {
    head.addEventListener('click', () => {
      const section = head.closest('.section');
      const wasOpen = section.classList.contains('open');
      document.querySelectorAll('.section').forEach((s) => s.classList.remove('open'));
      if (!wasOpen) section.classList.add('open');
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
    lifespan: num('lifespan', 90),
    gender: val('gender', 'prefer_not_say'),
    ageCameToAU: num('ageCameToAU'),
    ageStartedEarningAU: num('ageStartedEarningAU'),
    partnerAge: num('partnerAge'),
    partnerRetireAge: num('partnerRetireAge'),
    partnerLifespan: num('partnerLifespan'),
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
    businessIncome: num('businessIncome'),
    investmentIncomeOutsideSuper: num('investmentIncomeOutsideSuper'),

    // Family
    dependents: num('dependents'),
    educationCostPerChild: num('educationCostPerChild'),
    privateSchool: chk('privateSchool'),
    uniSupport: chk('uniSupport'),
    isCarer: chk('isCarer'),
    annualParentSupport: num('annualParentSupport'),

    // Property & debt
    homeValue: num('homeValue'),
    mortgage: num('mortgage'),
    mortgageRate: num('mortgageRate'),
    downsizePlan: (document.querySelector('[data-bind="downsizePlan"]') || {}).dataset?.value || 'no',
    ccBalance: num('ccBalance'),
    ccRate: num('ccRate'),
    personalLoan: num('personalLoan'),
    carLoan: num('carLoan'),
    hecsBalance: num('hecsBalance'),
    investmentProperty: chk('investmentProperty'),
    ipValue: num('ipValue'),
    ipLoan: num('ipLoan'),
    ipWeeklyRent: num('ipWeeklyRent'),
    ipAnnualExpenses: num('ipAnnualExpenses'),
    ipGrowthRate: num('ipGrowthRate'),
    ipState: val('ipState'),

    // SMSF & Trust
    hasSmsf: chk('hasSmsf'),
    hasTrust: chk('hasTrust'),

    // Goal
    desiredIncome: num('desiredIncome', 73000),

    // Healthcare
    hasPrivateHospital: chk('hasPrivateHospital'),
    healthCondition: val('healthCondition'),
    healthcareCost: num('healthcareCost'),
    ageFirstHadCover: num('ageFirstHadCover'),
    agedCareProbability: num('agedCareProbability'),
    agedCareStartAge: num('agedCareStartAge'),
    agedCareAnnualCost: num('agedCareAnnualCost'),

    // Markets
    inflation: num('inflation', 2.6),
    invReturn: num('invReturn', 6.5),
    superGrowth: num('superGrowth', 7.5),
    savingsReturn: num('savingsReturn', 1.4),

    // Pension
    agePensionAge: num('agePensionAge', 67),
    pensionAnnualSingle: num('pensionAnnualSingle', 31223),
    pensionAnnualCouple: num('pensionAnnualCouple', 47070),
    pensionAssetThreshold: num('pensionAssetThreshold', 481500),
    pensionAssetCutoff: num('pensionAssetCutoff', 1074000),

    // Simulation
    mcRuns: num('mcRuns', 500),
    returnVolatility: num('returnVolatility', 12),
    scenarioMode: val('scenarioMode', 'baseline'),
    enableShocks: chk('enableShocks'),
    sampleLifespan: chk('sampleLifespan'),
    budget2627: chk('budget2627'),

    // Overseas
    goingOverseas: chk('goingOverseas'),
    destination: val('destination'),
    ageMovingOverseas: num('ageMovingOverseas'),
    annualLivingCostOverseas: num('annualLivingCostOverseas', 40000),
  };
}

function runEngine(inp) {
  const engineInputs = buildEngineInputs(inp);
  const simulation = simulator.simulateRetirement(engineInputs, false);

  return adaptEngineOutput(inp, engineInputs, simulation);
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

function paint(result, inp) {
  // Hero
  document.getElementById('r-paycheck').textContent = Math.round(result.monthlyPaycheck).toLocaleString('en-AU');
  document.getElementById('r-retire-age').textContent = inp.retireAge;
  document.getElementById('r-lifespan').textContent = inp.lifespan;
  document.getElementById('r-combined').textContent = inp.household === 'couple' ? ' · combined' : '';

  // Runway
  const ic = document.getElementById('r-runway-icon');
  const ok = result.lastsUntil >= inp.lifespan;
  const close = result.lastsUntil >= inp.lifespan - 5;
  ic.textContent = ok ? '🟢' : close ? '🟡' : '🔴';
  ic.className = 'runway-icon' + (ok ? '' : close ? ' warn' : ' bad');
  document.getElementById('r-runway').textContent = result.lastsUntil;

  // Donut
  paintDonut(result.breakdown);
  const total = result.breakdown.super + result.breakdown.pension + (result.breakdown.other || 0) || 1;
  const superPct = (result.breakdown.super / total) * 100;
  const pensionPct = (result.breakdown.pension / total) * 100;
  document.getElementById('r-self-pct').textContent = Math.round(superPct) + '%';
  document.getElementById('r-super-pct').textContent = Math.round(superPct) + '%';
  document.getElementById('r-pension-pct').textContent = Math.round(pensionPct) + '%';

  // Metrics
  document.getElementById('r-super-at-retire').innerHTML =
    fmt$(result.superAtRetire, { compact: true }) + '<span class="sub">today\'s $</span>';
  const conf = result.confidence * 100;
  const confLabel = conf >= 85 ? 'Strong' : conf >= 60 ? 'Moderate' : conf >= 35 ? 'Tight' : 'At risk';
  const confColor = conf >= 85 ? 'var(--accent)' : conf >= 60 ? 'var(--gold)' : conf >= 35 ? 'var(--amber)' : 'var(--rose)';
  const confEl = document.getElementById('r-confidence');
  confEl.innerHTML = Math.round(conf) + '%<span class="sub">' + confLabel + '</span>';
  confEl.style.color = confColor;

  // Gauge
  const targetMonthly = inp.desiredIncome / 12;
  document.getElementById('r-goal').textContent = '$' + Math.round(targetMonthly).toLocaleString('en-AU');
  const gauge = Math.min(100, Math.max(0, (result.monthlyPaycheck / targetMonthly) * 100));
  document.getElementById('r-gauge-fill').style.width = gauge + '%';
  const gap = result.gapMonthly;
  const gapEl = document.getElementById('r-gap');
  if (gap > 0) {
    gapEl.textContent = '−$' + Math.round(gap).toLocaleString('en-AU') + '/mo';
    gapEl.style.color = 'var(--rose)';
  } else {
    gapEl.textContent = 'On track';
    gapEl.style.color = 'var(--accent)';
  }

  // Mini chart
  paintMiniChart(result.years, inp);
  document.getElementById('r-mini-range').textContent = `today → age ${inp.lifespan}`;

  // Hero stats
  document.getElementById('hs-age').textContent = inp.age;
  document.getElementById('hs-plan').textContent = inp.lifespan;
  document.getElementById('hs-salary').textContent = '$' + Math.round(inp.salary / 1000) + 'k';
  document.getElementById('hs-super').textContent = '$' + Math.round(inp.superBal / 1000) + 'k';
  document.getElementById('hs-yrs-to-retire').textContent = Math.max(0, inp.retireAge - inp.age);

  // Year table
  paintYearTable(result.years, inp);

  // Goal translation
  document.getElementById('goal-week').textContent = '$' + (inp.desiredIncome / 52).toFixed(0);
  document.getElementById('goal-month').textContent = '$' + (inp.desiredIncome / 12).toFixed(0);

  // Slider display
  const rt = document.getElementById('riskTolerance');
  const rtd = document.getElementById('riskTolerance-display');
  if (rt && rtd) rtd.textContent = rt.value + ' / 10';
}

// ── Donut ──
function paintDonut(b) {
  const svg = document.getElementById('r-donut');
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
  const inflR = inp.inflation / 100;
  body.innerHTML = years.slice(0, 60).map((y, i) => {
    const k = (v) => v ? '$' + Math.round(v / Math.pow(1 + inflR, y.age - inp.age) / 1000) + 'k' : '—';
    return `<tr class="${y.age === inp.retireAge ? 'retire' : ''} ${y.age >= inp.agePensionAge ? 'pension' : ''}">
      <td>${2026 + i}</td>
      <td>${y.age}${y.age === inp.retireAge ? ' ★' : ''}</td>
      <td>${k(y.totalAssets * 0.85)}</td>
      <td>${k(y.totalAssets * 0.15)}</td>
      <td>${k(y.totalAssets)}</td>
      <td>${k(y.withdraw)}</td>
      <td>${k(y.pension)}</td>
      <td>${k(y.withdraw + y.pension)}</td>
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
      const inp = readInputs();
      const result = runEngine(inp);
      paint(result, inp);
    } catch (e) {
      console.error('recalc failed', e);
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
    // Hook your full Monte Carlo run here
    b.disabled = true;
    b.textContent = 'Running…';
    setTimeout(() => {
      recalc();
      b.disabled = false;
      b.textContent = b === calc ? '↻ Run full simulation' : '↻ Run simulation';
    }, 800);
  }));

  // Save / Load buttons — wire to existing handlers if present
  const load = document.getElementById('btn-load');
  const save = document.getElementById('btn-save');
  if (load && typeof window.loadDataFile === 'function') load.addEventListener('click', window.loadDataFile);
  if (save && typeof window.saveDataFile === 'function') save.addEventListener('click', window.saveDataFile);
}

export { buildEngineInputs, adaptEngineOutput, getHouseholdPensionDefaults, runEngine, syncPensionMeansTestFields };

// ============================================================
// BOOT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  initAccordion();
  initSegmented();
  initTabs();
  initTopbar();
  initPensionFieldDefaults();
  bindConditional('investmentProperty', 'data-ip');
  bindConditional('goingOverseas', 'data-overseas');

  // Wire every input/select to recalc
  document.querySelectorAll('.col-form input, .col-form select').forEach((el) => {
    el.addEventListener('input', recalc);
    el.addEventListener('change', recalc);
  });

  applyHouseholdVisibility();
  applyAdvancedVisibility();
  recalc();
});
