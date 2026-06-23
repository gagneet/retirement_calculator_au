// outcome-bands.js — Classify retirement readiness into outcome bands.
//
// Uses Monte Carlo success rate as the primary signal when available.
// Falls back to deterministic income-gap analysis (via OutcomeEngine) when MC
// has not been run.  Thresholds are read from ENHANCED_CONFIG.OUTCOME_BANDS so
// they can be adjusted without touching display code.

import ENHANCED_CONFIG from './config.js';

const BANDS    = ENHANCED_CONFIG.OUTCOME_BANDS;
const RICH_CFG = ENHANCED_CONFIG.RICH_TARGETS;
// ASFA comfortable benchmarks are stored under OVERSEAS_RETIREMENT in config.js
const PENSION_CFG = ENHANCED_CONFIG.OVERSEAS_RETIREMENT || {};

/**
 * @typedef {Object} OutcomeBandResult
 * @property {'critical'|'at_risk'|'needs_improvement'|'comfortable'|'strong'} band
 * @property {string} label          Human-readable label
 * @property {string} colour         CSS variable / token
 * @property {string} icon
 * @property {number|null} successRate  MC success rate 0–1 (null if not run)
 * @property {number} projectedAnnualIncome   Today's $ per year
 * @property {number} asfaComfortableTarget   Today's $ per year
 * @property {number} richTarget              Today's $ per year
 * @property {number} annualGapToComfortable  Positive = shortfall; negative = surplus
 * @property {number} annualGapToRich         Positive = shortfall; negative = surplus
 * @property {number|null} depletionAge       Age funds run out (null if never)
 * @property {string} headline               One-sentence plain-English summary
 */

/**
 * Compute the outcome band from available data.
 *
 * @param {Object} opts
 * @param {Object|null} opts.monteCarloResults  APP_STATE.monteCarloResults
 * @param {Object|null} opts.simulation         Deterministic simulation result
 * @param {Object|null} opts.adaptedResult      Normalised deterministic result
 * @param {Object} opts.inputs                  Raw user inputs (from syncAppState)
 * @param {Object} opts.engineInputs            Engine-normalised inputs
 * @param {number} [opts.richMultiplier]        Override Rich multiplier (default 1.5)
 * @param {number|null} [opts.customRichTarget] Custom annual target in today's $
 * @returns {OutcomeBandResult}
 */
export function computeOutcomeBand({
  monteCarloResults = null,
  simulation = null,
  adaptedResult = null,
  inputs = {},
  engineInputs = {},
  richMultiplier = null,
  customRichTarget = null,
}) {
  const isCouple = !!(engineInputs.hasPartner || inputs.hasPartner);
  const asfa = isCouple
    ? PENSION_CFG.ASFA_COUPLE_ANNUAL
    : PENSION_CFG.ASFA_SINGLE_ANNUAL;

  const multiplier = customRichTarget
    ? null
    : (richMultiplier ?? RICH_CFG.DEFAULT_MULTIPLIER);

  const richTarget = customRichTarget ?? asfa * multiplier;
  const comfortableTarget = asfa;

  // ── Projected income ────────────────────────────────────────────────────
  let projectedAnnualIncome = 0;
  if (adaptedResult?.annualIncome) {
    projectedAnnualIncome = adaptedResult.annualIncome;
  } else if (simulation?.annualIncome) {
    projectedAnnualIncome = simulation.annualIncome;
  }

  // ── Depletion age ───────────────────────────────────────────────────────
  let depletionAge = null;
  if (adaptedResult?.depletionAge || simulation?.depletionAge) {
    depletionAge = adaptedResult?.depletionAge ?? simulation?.depletionAge;
  }
  // Suppress deterministic depletion when MC shows strong success — showing
  // "runs out at age X" alongside an 80%+ success rate is contradictory.
  const successRate = monteCarloResults?.successRate ?? null;
  if (depletionAge !== null && successRate !== null && successRate >= 0.8) {
    depletionAge = null;
  }

  // ── Band classification ─────────────────────────────────────────────────
  let band;
  if (successRate !== null) {
    // Primary: Monte Carlo signal
    if (successRate < BANDS.CRITICAL_MAX) {
      band = 'critical';
    } else if (successRate < BANDS.AT_RISK_MAX) {
      band = 'at_risk';
    } else if (successRate < BANDS.NEEDS_IMPROVEMENT_MAX) {
      band = 'needs_improvement';
    } else if (successRate < BANDS.COMFORTABLE_MAX) {
      band = 'comfortable';
    } else {
      const surplusOK = (projectedAnnualIncome - comfortableTarget) >= BANDS.STRONG_SURPLUS_MIN;
      band = surplusOK ? 'strong' : 'comfortable';
    }
  } else {
    // Fallback: deterministic gap vs ASFA comfortable
    const gap = comfortableTarget - projectedAnnualIncome;
    if (gap > comfortableTarget * 0.40) {
      band = 'critical';
    } else if (gap > comfortableTarget * 0.15) {
      band = 'at_risk';
    } else if (gap > 0) {
      band = 'needs_improvement';
    } else if (projectedAnnualIncome - comfortableTarget < BANDS.STRONG_SURPLUS_MIN) {
      band = 'comfortable';
    } else {
      band = 'strong';
    }
  }

  // ── Band metadata ───────────────────────────────────────────────────────
  const META = {
    critical:          { label: 'Critical',           colour: 'var(--red-700,#b91c1c)',   icon: '🔴' },
    at_risk:           { label: 'At Risk',             colour: 'var(--orange-600,#ea580c)', icon: '🟠' },
    needs_improvement: { label: 'Needs Improvement',  colour: 'var(--amber-500,#f59e0b)',  icon: '🟡' },
    comfortable:       { label: 'Comfortable',         colour: 'var(--green-600,#16a34a)',  icon: '🟢' },
    strong:            { label: 'Strong',              colour: 'var(--emerald-600,#059669)', icon: '✨' },
  };

  const meta = META[band];

  const annualGapToComfortable = comfortableTarget - projectedAnnualIncome;
  const annualGapToRich = richTarget - projectedAnnualIncome;
  const lifespan = engineInputs.lifeExpectancy || inputs.lifeExpectancy || 90;
  const retireAge = engineInputs.retirementAge || inputs.retirementAge || 67;

  const headline = buildHeadline(band, {
    projectedAnnualIncome,
    annualGapToComfortable,
    successRate,
    depletionAge,
    lifespan,
    retireAge,
  });

  return {
    band,
    label: meta.label,
    colour: meta.colour,
    icon: meta.icon,
    successRate,
    projectedAnnualIncome,
    asfaComfortableTarget: comfortableTarget,
    richTarget,
    annualGapToComfortable,
    annualGapToRich,
    depletionAge,
    headline,
  };
}

function buildHeadline(band, { projectedAnnualIncome, annualGapToComfortable, successRate, depletionAge, lifespan, retireAge }) {
  const inc = fmt(projectedAnnualIncome);
  const pct = successRate !== null ? ` (${Math.round(successRate * 100)}% success rate)` : '';

  switch (band) {
    case 'critical':
      if (depletionAge && depletionAge < lifespan)
        return `Your money is projected to run out around age ${depletionAge}${pct}. Urgent action recommended.`;
      return `Your projected income of ${inc}/year falls well short of a comfortable retirement${pct}.`;
    case 'at_risk':
      return `Your plan is at risk — currently projecting ${inc}/year with a ${fmt(annualGapToComfortable)}/year shortfall${pct}.`;
    case 'needs_improvement':
      return `You're close but not quite on track — a ${fmt(annualGapToComfortable)}/year gap remains${pct}.`;
    case 'comfortable':
      return `You're on track for a comfortable retirement, projecting ${inc}/year${pct}.`;
    case 'strong':
      return `You're well positioned for an aspirational retirement, projecting ${inc}/year${pct}.`;
    default:
      return `Projected income: ${inc}/year${pct}.`;
  }
}

function fmt(n) {
  return '$' + Math.round(n).toLocaleString('en-AU');
}

/**
 * Compute extra monthly contribution (approximation) needed to close the gap
 * to a target annual income in today's dollars.
 *
 * Uses a simple FV annuity formula with conservative super growth of 6.5%.
 */
export function estimateExtraMonthlyContribution({ gapAnnual, yearsToRetirement, superReturnRate = 0.065 }) {
  if (gapAnnual <= 0 || yearsToRetirement <= 0) return 0;
  // Lump sum needed at retirement = gap / 4% drawdown
  const lumpSumNeeded = gapAnnual / 0.04;
  // Monthly contribution needed (FV annuity)
  const r = superReturnRate / 12;
  const n = yearsToRetirement * 12;
  const pmt = r === 0
    ? lumpSumNeeded / n
    : (lumpSumNeeded * r) / (Math.pow(1 + r, n) - 1);
  return Math.max(0, Math.round(pmt / 50) * 50); // round to $50
}

/**
 * Estimate years of delay (to retirement) needed to close the gap.
 * Approximation only — for display guidance.
 */
export function estimateYearsDelay({ gapAnnual, annualSalary, superGuaranteeRate = 0.12, superReturnRate = 0.065 }) {
  if (gapAnnual <= 0 || annualSalary <= 0) return 0;
  const lumpSumNeeded = gapAnnual / 0.04;
  const annualContribution = annualSalary * superGuaranteeRate;
  // Very rough: each extra year at retirement adds ~annualContribution * (1 + superReturnRate)^0.5
  const perYear = annualContribution * Math.pow(1 + superReturnRate, 0.5);
  return Math.max(1, Math.round(lumpSumNeeded / perYear));
}

export default { computeOutcomeBand, estimateExtraMonthlyContribution, estimateYearsDelay };
