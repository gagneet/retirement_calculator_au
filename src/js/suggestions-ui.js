// suggestions-ui.js — Shared HTML builder for the Suggestions / Action Plan experience.
//
// Used by both advanced-v2.js (renderAiPanel) and app.js (displayCategorizedSuggestions).
// All functions return HTML strings; no direct DOM mutation here — callers set innerHTML.
//
// ⚠ DISCLAIMER language: all generated content uses "consider / may / could" framing.
//   Never use "you should", "you must", or product names.

import { formatCurrency, formatPercent } from './utils.js';
import { computeOutcomeBand, estimateExtraMonthlyContribution, estimateYearsDelay } from './outcome-bands.js';
import { getSource } from './policy-sources.js';
import ENHANCED_CONFIG from './config.js';

// ASFA benchmarks are stored under OVERSEAS_RETIREMENT in config.js
const PENSION_CFG = ENHANCED_CONFIG.OVERSEAS_RETIREMENT || {};
const RICH_CFG    = ENHANCED_CONFIG.RICH_TARGETS || {};

// ─── DISCLAIMER ──────────────────────────────────────────────────────────────

export const DISCLAIMER_HTML = `
<div class="suggestions-disclaimer" role="note" aria-label="Disclaimer" style="
  background:var(--surface-2,#f8fafc);border:1px solid var(--border,#e2e8f0);
  border-radius:12px;padding:14px 18px;font-size:12px;color:var(--ink-3,#64748b);
  line-height:1.6;margin-bottom:20px">
  <b style="color:var(--ink-2,#475569)">General information only.</b>
  This calculator provides general education and scenario modelling, not personal
  financial advice. It does not consider all personal circumstances. Consider speaking
  with a licensed financial adviser, tax adviser, Services Australia Financial
  Information Service officer, or your super fund before making major decisions.
  Pension rates, contribution caps, and tax rules change — always verify current
  figures with <a href="https://www.servicesaustralia.gov.au" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline">Services Australia</a>,
  <a href="https://www.ato.gov.au" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline">ATO</a>, or
  <a href="https://moneysmart.gov.au" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline">MoneySmart</a>.
</div>`;

// ─── READINESS SUMMARY CARD ──────────────────────────────────────────────────

/**
 * Build the top-level readiness summary card.
 * @param {import('./outcome-bands.js').OutcomeBandResult} band
 * @param {Object} [opts]
 * @param {string} [opts.nextAction]   Short text for "Recommended next action"
 */
export function buildReadinessSummaryCard(band, opts = {}) {
  const pct = band.successRate !== null
    ? `<div class="sg-metric"><div class="sg-metric-k">Monte Carlo success</div><div class="sg-metric-v">${Math.round(band.successRate * 100)}%</div></div>`
    : '';

  const depletionStr = band.depletionAge
    ? `<div class="sg-metric sg-metric--warn"><div class="sg-metric-k">Projected depletion</div><div class="sg-metric-v">age ${band.depletionAge}</div></div>`
    : '';

  const gapStr = band.annualGapToComfortable > 0
    ? `<div class="sg-metric sg-metric--warn"><div class="sg-metric-k">Annual gap to comfortable</div><div class="sg-metric-v">${formatCurrency(band.annualGapToComfortable)}/yr</div></div>`
    : `<div class="sg-metric sg-metric--good"><div class="sg-metric-k">Annual surplus vs comfortable</div><div class="sg-metric-v">${formatCurrency(Math.abs(band.annualGapToComfortable))}/yr</div></div>`;

  const nextAction = opts.nextAction
    ? `<div style="margin-top:16px;padding:12px 14px;background:var(--surface,#fff);border-radius:10px;border:1px solid var(--border,#e2e8f0)">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:var(--ink-3,#64748b);margin-bottom:4px">Recommended next action</div>
        <div style="font-weight:600;color:var(--ink-1,#1e293b)">${escHtml(opts.nextAction)}</div>
       </div>`
    : '';

  return `
<div class="sg-readiness" style="
  border-radius:18px;border:2px solid ${band.colour};
  padding:20px 22px 18px;margin-bottom:20px;
  background:var(--surface,#fff)">
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">
    <span style="font-size:2rem" aria-hidden="true">${band.icon}</span>
    <div>
      <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:var(--ink-3,#64748b)">Retirement readiness</div>
      <div style="font-weight:800;font-size:1.35rem;color:${band.colour}">${escHtml(band.label)}</div>
    </div>
  </div>
  <p style="margin:0 0 14px;color:var(--ink-2,#475569);font-size:14px;line-height:1.55">${escHtml(band.headline)}</p>
  <div class="sg-metrics-row" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px">
    ${pct}
    ${gapStr}
    ${depletionStr}
    <div class="sg-metric"><div class="sg-metric-k">Projected income</div><div class="sg-metric-v">${formatCurrency(band.projectedAnnualIncome)}/yr</div></div>
  </div>
  ${nextAction}
</div>`;
}

// ─── COMFORTABLE / RICH COMPARISON TABLE ────────────────────────────────────

/**
 * Build the Comfortable vs Rich comparison panel.
 * @param {import('./outcome-bands.js').OutcomeBandResult} band
 * @param {Object} opts
 * @param {number} opts.yearsToRetirement
 * @param {number} [opts.annualSalary]
 * @param {boolean} [opts.isCouple]
 * @param {number} [opts.richMultiplier]
 */
export function buildComfortableRichPanel(band, opts = {}) {
  const { yearsToRetirement = 10, annualSalary = 0, isCouple = false } = opts;

  const inc = band.projectedAnnualIncome;
  const asfa = band.asfaComfortableTarget;
  const rich = band.richTarget;

  const gapC = asfa - inc;
  const gapR = rich - inc;

  const extraMonthlyC = gapC > 0
    ? estimateExtraMonthlyContribution({ gapAnnual: gapC, yearsToRetirement })
    : 0;
  const extraMonthlyR = gapR > 0
    ? estimateExtraMonthlyContribution({ gapAnnual: gapR, yearsToRetirement })
    : 0;

  const extraYearsC = gapC > 0 && annualSalary > 0
    ? estimateYearsDelay({ gapAnnual: gapC, annualSalary })
    : 0;
  const extraYearsR = gapR > 0 && annualSalary > 0
    ? estimateYearsDelay({ gapAnnual: gapR, annualSalary })
    : 0;

  const richOptions = Array.isArray(RICH_CFG.OPTIONS) ? RICH_CFG.OPTIONS : [];
  const richLabel = richOptions.find(o => Math.abs(o.multiplier - (opts.richMultiplier || 1.5)) < 0.01)?.label || 'Rich / Aspirational';
  const asfaSource = getSource('asfa-retirement-standard');
  const asfaSourceLink = asfaSource
    ? `<a href="${asfaSource.url}" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline">${escHtml(asfaSource.label)}</a>`
    : '';

  function rowClass(gap) {
    if (gap > 0) return 'sg-table-row--warn';
    return 'sg-table-row--ok';
  }

  function gapCell(gap) {
    if (gap > 0) return `<span style="color:var(--red-600,#dc2626)">-${formatCurrency(gap)}/yr</span>`;
    return `<span style="color:var(--green-600,#16a34a)">+${formatCurrency(Math.abs(gap))}/yr</span>`;
  }

  return `
<div class="sg-panel" style="border-radius:16px;border:1px solid var(--border,#e2e8f0);overflow:hidden;margin-bottom:20px">
  <div style="padding:14px 18px;background:var(--surface-2,#f8fafc);border-bottom:1px solid var(--border,#e2e8f0)">
    <h4 style="margin:0;font-size:1rem;font-weight:700;color:var(--ink-1,#1e293b)">Retirement income targets</h4>
    <p style="margin:4px 0 0;font-size:12px;color:var(--ink-3,#64748b)">
      ASFA ${isCouple ? 'couple' : 'single'} Comfortable benchmark — Dec 2025 quarter.
      ${asfaSourceLink}
    </p>
  </div>
  <div style="overflow-x:auto">
    <table style="width:100%;border-collapse:collapse;font-size:13px">
      <thead>
        <tr style="background:var(--surface-2,#f8fafc)">
          <th style="padding:10px 16px;text-align:left;font-weight:600;color:var(--ink-2,#475569)">Target</th>
          <th style="padding:10px 16px;text-align:right;font-weight:600;color:var(--ink-2,#475569)">Annual income</th>
          <th style="padding:10px 16px;text-align:right;font-weight:600;color:var(--ink-2,#475569)">Gap/surplus</th>
          <th style="padding:10px 16px;text-align:right;font-weight:600;color:var(--ink-2,#475569)">Est. extra/mo to close</th>
          <th style="padding:10px 16px;text-align:right;font-weight:600;color:var(--ink-2,#475569)">Est. extra years to close</th>
        </tr>
      </thead>
      <tbody>
        <tr class="${rowClass(0)}">
          <td style="padding:10px 16px;color:var(--ink-2,#475569);font-weight:600">Your current plan</td>
          <td style="padding:10px 16px;text-align:right;font-weight:700;color:var(--ink-1,#1e293b)">${formatCurrency(inc)}/yr</td>
          <td style="padding:10px 16px;text-align:right">—</td>
          <td style="padding:10px 16px;text-align:right">—</td>
          <td style="padding:10px 16px;text-align:right">—</td>
        </tr>
        <tr class="${rowClass(gapC)}" style="border-top:1px solid var(--border,#e2e8f0)">
          <td style="padding:10px 16px;color:var(--ink-2,#475569);font-weight:600">ASFA Comfortable</td>
          <td style="padding:10px 16px;text-align:right">${formatCurrency(asfa)}/yr</td>
          <td style="padding:10px 16px;text-align:right">${gapCell(gapC)}</td>
          <td style="padding:10px 16px;text-align:right">${extraMonthlyC > 0 ? '~' + formatCurrency(extraMonthlyC) + '/mo' : '✓ Met'}</td>
          <td style="padding:10px 16px;text-align:right">${extraYearsC > 0 ? '~' + extraYearsC + ' yr' + (extraYearsC !== 1 ? 's' : '') : '✓ Met'}</td>
        </tr>
        <tr class="${rowClass(gapR)}" style="border-top:1px solid var(--border,#e2e8f0)">
          <td style="padding:10px 16px;color:var(--ink-2,#475569);font-weight:600">${escHtml(richLabel)}</td>
          <td style="padding:10px 16px;text-align:right">${formatCurrency(rich)}/yr</td>
          <td style="padding:10px 16px;text-align:right">${gapCell(gapR)}</td>
          <td style="padding:10px 16px;text-align:right">${extraMonthlyR > 0 ? '~' + formatCurrency(extraMonthlyR) + '/mo' : '✓ Met'}</td>
          <td style="padding:10px 16px;text-align:right">${extraYearsR > 0 ? '~' + extraYearsR + ' yr' + (extraYearsR !== 1 ? 's' : '') : '✓ Met'}</td>
        </tr>
      </tbody>
    </table>
  </div>
  <div style="padding:10px 16px;font-size:11px;color:var(--ink-3,#64748b);border-top:1px solid var(--border,#e2e8f0)">
    Estimates assume a 4% drawdown rate and 6.5% super return. "Extra/mo" and "Extra years" are indicative only.
    Speak to a licensed financial adviser for personal projections.
  </div>
</div>`;
}

// ─── RECOMMENDATION CARD ─────────────────────────────────────────────────────

const IMPACT_STYLE = {
  'high-positive': { bg: 'oklch(0.95 0.05 155)', color: 'oklch(0.35 0.12 155)', label: '⬆⬆ High impact' },
  positive:        { bg: 'oklch(0.95 0.04 155)', color: 'oklch(0.40 0.10 155)', label: '⬆ Positive' },
  neutral:         { bg: 'oklch(0.95 0.01 100)', color: 'oklch(0.45 0.02 100)', label: '→ Neutral' },
  negative:        { bg: 'oklch(0.97 0.04 30)',  color: 'oklch(0.48 0.10 30)',  label: '⬇ Negative trade-off' },
  'high-negative': { bg: 'oklch(0.97 0.06 30)',  color: 'oklch(0.42 0.14 30)',  label: '⬇⬇ Significant trade-off' },
};

const FEASIBILITY_BADGE = {
  easy:     { label: 'Easy', colour: 'oklch(0.40 0.10 155)' },
  moderate: { label: 'Moderate', colour: 'oklch(0.45 0.08 75)' },
  complex:  { label: 'Complex', colour: 'oklch(0.45 0.10 30)' },
  'adviser-recommended': { label: 'See adviser', colour: 'oklch(0.40 0.08 285)' },
};

/**
 * Build a single recommendation card.
 * @param {Object} rec   Recommendation object from RecommendationEngine or ActionGenerator
 * @param {Object} [opts]
 * @param {boolean} [opts.selectable]  If true, show a checkbox for action plan builder
 * @param {boolean} [opts.tryScenario] If true, show "Try this scenario" button
 */
export function buildRecommendationCard(rec, opts = {}) {
  const impact   = IMPACT_STYLE[rec.impact || rec.impactLevel] || IMPACT_STYLE.neutral;
  const feasObj  = FEASIBILITY_BADGE[rec.feasibility] || FEASIBILITY_BADGE.moderate;
  const category = rec.category || rec.exportCategory || 'General';
  const priority = rec.priority || 'MEDIUM';

  const priorityBadge = priority === 'HIGH' || priority === 'high-positive'
    ? '<span class="sg-badge sg-badge--high">High priority</span>'
    : priority === 'LOW' || priority === 'low'
    ? '<span class="sg-badge sg-badge--low">Optional</span>'
    : '';

  const checkbox = opts.selectable
    ? `<input type="checkbox" class="sg-action-check" data-rec-id="${escHtml(rec.id || rec.title)}"
         aria-label="Select for action plan" style="width:16px;height:16px;accent-color:var(--brand,#0ea5e9)">`
    : '';

  const whyHtml = rec.whyItMatters || rec.description
    ? `<div style="margin-top:10px;font-size:13px;color:var(--ink-2,#475569)"><b>Why it matters:</b> ${escHtml(rec.whyItMatters || rec.description)}</div>`
    : '';

  const actionsHtml = buildActionsList(rec.actions || rec.howToImplement);
  const risksHtml = rec.risksAndTradeoffs
    ? `<div style="margin-top:10px;font-size:12px;color:var(--ink-3,#64748b)"><b>Trade-offs:</b> ${escHtml(rec.risksAndTradeoffs)}</div>`
    : '';

  const adviceHtml = rec.whenToSeekAdvice
    ? `<div style="margin-top:8px;font-size:12px;color:var(--ink-3,#64748b);font-style:italic">💬 ${escHtml(rec.whenToSeekAdvice)}</div>`
    : '';

  const modelledHtml = (rec.successRateDiff != null || rec.medianBalanceDiff != null || rec.modelledOutcome)
    ? buildModelledOutcome(rec)
    : '';

  const tryBtn = opts.tryScenario && !rec.isTryThisDisabled
    ? `<button class="sg-try-btn" data-rec-id="${escHtml(rec.id || rec.title)}"
         style="margin-top:12px;padding:7px 14px;border-radius:8px;border:1px solid var(--border,#e2e8f0);
         background:var(--surface,#fff);cursor:pointer;font-size:12px;font-weight:600">
         🔄 Try this scenario
       </button>`
    : '';

  const sourcesHtml = buildSourceRefs(rec.sourceRefs);

  return `
<div class="sg-rec-card" data-rec-id="${escHtml(rec.id || rec.title)}" style="
  border:1px solid var(--border,#e2e8f0);border-radius:18px;
  background:var(--surface,#fff);overflow:hidden">
  <div style="padding:16px 18px 12px;border-bottom:1px solid var(--border,#e2e8f0)">
    <div style="display:flex;gap:10px;align-items:flex-start">
      ${checkbox}
      <div style="flex:1;min-width:0">
        <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:6px">
          <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:var(--ink-3,#64748b)">${escHtml(category)}</span>
          ${priorityBadge}
          <span class="sg-badge" style="background:${impact.bg};color:${impact.color}">${impact.label}</span>
          <span class="sg-badge" style="color:${feasObj.colour}">${feasObj.label}</span>
          ${rec.timeframe ? `<span class="sg-badge">${escHtml(rec.timeframe)}</span>` : ''}
        </div>
        <div style="font-weight:700;font-size:1rem;color:var(--ink-1,#1e293b)">${escHtml(rec.title || rec.shortTitle || 'Recommendation')}</div>
      </div>
    </div>
    ${whyHtml}
  </div>
  <div style="padding:14px 18px">
    ${modelledHtml}
    ${actionsHtml}
    ${risksHtml}
    ${adviceHtml}
    ${sourcesHtml}
    ${tryBtn}
  </div>
</div>`;
}

function buildActionsList(actions) {
  if (!actions || !actions.length) return '';
  const isStructured = typeof actions[0] === 'object';
  const items = isStructured
    ? actions.map(a => `<li style="margin-bottom:6px"><b>${escHtml(a.action || a.title || '')}</b>${a.detail ? ' — ' + escHtml(a.detail) : ''}</li>`).join('')
    : actions.map(a => `<li style="margin-bottom:4px">${escHtml(String(a))}</li>`).join('');
  return `<div style="margin-top:12px"><b style="font-size:13px">Steps to consider:</b><ol style="margin:8px 0 0;padding-left:18px;font-size:13px;color:var(--ink-2,#475569)">${items}</ol></div>`;
}

function buildModelledOutcome(rec) {
  const parts = [];
  if (rec.modelledOutcome) parts.push(`<span>${escHtml(rec.modelledOutcome)}</span>`);
  if (rec.successRateDiff != null && rec.successRateDiff !== 0) {
    const sign = rec.successRateDiff > 0 ? '+' : '';
    parts.push(`<span>Success rate: <b>${sign}${formatPercent(rec.successRateDiff, 1)}</b></span>`);
  }
  if (rec.medianBalanceDiff != null && rec.medianBalanceDiff !== 0) {
    const sign = rec.medianBalanceDiff > 0 ? '+' : '';
    parts.push(`<span>Balance at retirement: <b>${sign}${formatCurrency(rec.medianBalanceDiff)}</b></span>`);
  }
  if (rec.estimatedImpact) parts.push(`<span>${escHtml(rec.estimatedImpact)}</span>`);
  if (!parts.length) return '';
  return `<div style="display:flex;flex-wrap:wrap;gap:8px;padding:10px 12px;background:var(--surface-2,#f8fafc);border-radius:10px;font-size:12px;color:var(--ink-2,#475569);margin-bottom:10px">${parts.join('<span style="color:var(--ink-3)">·</span>')}</div>`;
}

function buildSourceRefs(refs) {
  if (!refs || !refs.length) return '';
  const links = refs.map(id => {
    const src = getSource(id);
    return src
      ? `<a href="${src.url}" target="_blank" rel="noopener" style="color:var(--ink-3,#64748b);text-decoration:underline;font-size:11px">${escHtml(src.label)}</a>`
      : '';
  }).filter(Boolean).join(' · ');
  return links ? `<div style="margin-top:10px">${links}</div>` : '';
}

// ─── FILTER TAB BAR ──────────────────────────────────────────────────────────

export const SUGGESTION_FILTERS = [
  { id: 'all',          label: 'All' },
  { id: 'high-impact',  label: '⬆⬆ High Impact' },
  { id: 'quick-wins',   label: '⚡ Quick Wins' },
  { id: 'contributions',label: '🏦 Super & Contributions' },
  { id: 'retirement-age', label: '⏳ Retirement Age' },
  { id: 'property',     label: '🏠 Property & Mortgage' },
  { id: 'overseas',     label: '✈️ Overseas' },
  { id: 'pension',      label: '🏛️ Age Pension' },
  { id: 'risk',         label: '⛑️ Risk & Stress Tests' },
  { id: 'aged-care',    label: '🏥 Aged Care' },
];

export function buildFilterTabBar(activeFilter = 'all') {
  return `
<div class="sg-filter-bar" role="tablist" aria-label="Suggestion filters"
  style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px">
  ${SUGGESTION_FILTERS.map(f => `
    <button role="tab" aria-selected="${f.id === activeFilter}"
      class="sg-filter-btn ${f.id === activeFilter ? 'sg-filter-btn--on' : ''}"
      data-filter="${f.id}"
      style="padding:6px 12px;border-radius:20px;border:1px solid var(--border,#e2e8f0);
        background:${f.id === activeFilter ? 'var(--brand,#0ea5e9)' : 'var(--surface,#fff)'};
        color:${f.id === activeFilter ? '#fff' : 'var(--ink-2,#475569)'};
        font-size:12px;font-weight:600;cursor:pointer;transition:background 0.15s">
      ${escHtml(f.label)}
    </button>`).join('')}
</div>`;
}

/** Assign filter tags to a recommendation based on its properties. */
export function getFilterTags(rec) {
  const tags = ['all'];
  const cat = (rec.category || '').toLowerCase();
  const title = (rec.title || '').toLowerCase();
  const name = cat + ' ' + title;

  if (rec.impact === 'high-positive' || rec.priority === 'HIGH') tags.push('high-impact');
  if (rec.feasibility === 'easy' && (rec.impact === 'high-positive' || rec.impact === 'positive')) tags.push('quick-wins');
  if (name.includes('contribution') || name.includes('super') || name.includes('salary')) tags.push('contributions');
  if (name.includes('retire') || name.includes('delay') || name.includes('part-time') || name.includes('timing')) tags.push('retirement-age');
  if (name.includes('property') || name.includes('home') || name.includes('mortgage') || name.includes('downsize')) tags.push('property');
  if (name.includes('overseas') || name.includes('international') || name.includes('abroad') || cat.includes('overseas')) tags.push('overseas');
  if (name.includes('pension') || name.includes('centrelink') || name.includes('age pension')) tags.push('pension');
  if (name.includes('stress') || name.includes('risk') || name.includes('allocation') || name.includes('insurance')) tags.push('risk');
  if (name.includes('aged care') || name.includes('healthcare') || name.includes('health')) tags.push('aged-care');

  return [...new Set(tags)];
}

// ─── RECOMMENDATIONS GRID ────────────────────────────────────────────────────

/**
 * Build the full recommendations section.
 * @param {Object[]} recs     Recommendation objects (already sorted/prioritised by caller)
 * @param {Object}   [opts]
 * @param {boolean}  [opts.selectable]   Show checkboxes for action plan builder
 * @param {boolean}  [opts.showDeeper]   Show "Run deeper analysis" button
 * @param {string}   [opts.activeFilter] Current filter tab
 */
export function buildRecommendationsSection(recs, opts = {}) {
  if (!recs || !recs.length) {
    return `<div style="padding:24px;text-align:center;color:var(--ink-3,#64748b)">
      No suggestions available yet. Run the calculator to receive personalised scenario suggestions.
    </div>`;
  }

  const activeFilter = opts.activeFilter || 'all';
  const tagged = recs.map(r => ({ rec: r, tags: getFilterTags(r) }));
  const visible = activeFilter === 'all' ? tagged : tagged.filter(t => t.tags.includes(activeFilter));
  const displayCount = Math.min(visible.length, opts.selectable ? visible.length : 8);
  const hasMore = visible.length > displayCount && !opts.selectable;

  const cards = visible.slice(0, displayCount)
    .map(t => buildRecommendationCard(t.rec, { selectable: opts.selectable, tryScenario: true }))
    .join('');

  const deeperBtn = opts.showDeeper
    ? `<div style="text-align:center;margin-top:16px">
        <button id="sg-run-deeper" style="padding:10px 22px;border-radius:10px;border:1px solid var(--border,#e2e8f0);background:var(--surface,#fff);cursor:pointer;font-weight:600;font-size:13px">
          🔍 Run deeper analysis (all scenarios)
        </button>
      </div>`
    : '';

  const moreNote = hasMore
    ? `<p style="text-align:center;font-size:12px;color:var(--ink-3,#64748b);margin-top:8px">${visible.length - displayCount} more suggestions available — use Run deeper analysis</p>`
    : '';

  return `
<div class="sg-recs-grid" style="display:grid;gap:12px">
  ${cards}
</div>
${moreNote}
${deeperBtn}`;
}

// ─── AGE PENSION OVERSEAS GUIDANCE ──────────────────────────────────────────

/**
 * Build the "Taking Age Pension overseas" educational panel.
 * @param {Object} opts
 * @param {boolean} opts.nearPensionAge     True if user is within ~5 years of 67
 * @param {boolean} opts.isCouple
 * @param {boolean} opts.likelyEligible     Estimated from assets test
 * @param {number}  opts.awlrYears          Estimated Australian Working Life Residence years
 * @param {string|null} opts.selectedCountry Country name (or null)
 * @param {boolean} opts.hasAgreement
 * @param {string|null} opts.destination    Country code
 */
export function buildAgePensionOverseasPanel(opts = {}) {
  const {
    nearPensionAge = false,
    isCouple = false,
    likelyEligible = true,
    awlrYears = 35,
    selectedCountry = null,
    hasAgreement = false,
  } = opts;

  const agreementNote = hasAgreement
    ? `<li>✅ <b>${escHtml(selectedCountry || 'Your selected destination')}</b> has an Australian social security agreement. This <em>may</em> help you meet qualifying periods — check current agreement terms with Services Australia.</li>`
    : selectedCountry
    ? `<li>⚠️ <b>${escHtml(selectedCountry)}</b> does not appear on the Australian social security agreement list. Pension rules are more complex for non-agreement countries.</li>`
    : '';

  const awlrNote = awlrYears >= 35
    ? `<li>✅ Estimated Working Life Residence (AWLR): <b>${awlrYears} years</b>. Full-rate pension portability is more likely (35+ years required).</li>`
    : `<li>⚠️ Estimated AWLR: <b>${awlrYears} years</b>. Overseas pension may be proportionally reduced (35 AWLR years required for full rate). Confirm with Services Australia.</li>`;

  const eligNote = likelyEligible
    ? `<li>✅ Based on your modelled assets, you <em>may</em> be eligible for a full or partial Age Pension. Services Australia will apply the actual means test at the time of claim.</li>`
    : `<li>⚠️ Based on your modelled assets, you may not be eligible for Age Pension under the current means test. Circumstances can change — check with Services Australia.</li>`;

  const overseasSource = getSource('services-australia-overseas');
  const agreementsSource = getSource('services-australia-agreements');
  const overseasSourceLink = overseasSource
    ? `<a href="${overseasSource.url}" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline">${escHtml(overseasSource.label)}</a>`
    : 'Services Australia';
  const sourceLinks = [overseasSource, agreementsSource]
    .filter(Boolean)
    .map(src => `<a href="${src.url}" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline">${escHtml(src.label)}</a>`)
    .join(' · ');

  return `
<div class="sg-panel sg-panel--info" style="border-radius:16px;border:1px solid var(--border,#e2e8f0);overflow:hidden;margin-bottom:20px">
  <div style="padding:14px 18px;background:var(--surface-2,#f8fafc);border-bottom:1px solid var(--border,#e2e8f0)">
    <h4 style="margin:0;font-size:1rem;font-weight:700;color:var(--ink-1,#1e293b)">🏛️ Taking Age Pension overseas</h4>
    <p style="margin:4px 0 0;font-size:12px;color:var(--ink-3,#64748b)">
      General education only. Always confirm with
      ${overseasSourceLink}
      before making any relocation decision.
    </p>
  </div>
  <div style="padding:16px 18px">

    <div style="font-size:13px;color:var(--ink-2,#475569);margin-bottom:14px">
      <p style="margin:0 0 8px">Services Australia states that a person <em>may</em> receive Age Pension for the
      whole time they are outside Australia — including permanently — but payments
      <b>can change</b> depending on circumstances. Special rules apply if you leave
      within 2 years of returning to live in Australia.</p>
      <p style="margin:0">For countries with an international social security agreement, agreements
      can help you claim payments in Australia or the other country, and help you
      meet minimum qualifying periods.</p>
    </div>

    <h5 style="margin:0 0 8px;font-size:13px;font-weight:700;color:var(--ink-2,#475569)">Your estimated situation</h5>
    <ul style="margin:0 0 14px;padding-left:18px;font-size:13px;color:var(--ink-2,#475569);display:grid;gap:8px">
      ${eligNote}
      ${awlrNote}
      ${agreementNote}
    </ul>

    <h5 style="margin:0 0 8px;font-size:13px;font-weight:700;color:var(--ink-2,#475569)">What may change when you leave Australia</h5>
    <ul style="margin:0 0 14px;padding-left:18px;font-size:13px;color:var(--ink-2,#475569);display:grid;gap:6px">
      <li><b>Pension Supplement:</b> Reduces to the basic rate after 6 weeks abroad (the $14.10/fn basic amount is retained; Energy Supplement and other parts are lost).</li>
      <li><b>Rent Assistance:</b> Generally ceases once you leave Australia.</li>
      <li><b>Concession cards:</b> Commonwealth Seniors Health Card and Pensioner Concession Card entitlements may change or cease overseas.</li>
      <li><b>Medicare:</b> Coverage ceases once you permanently leave Australia. Private health insurance (if held) should be reviewed.</li>
      <li><b>Proportional pension (AWLR):</b> If you have fewer than 35 years AWLR, overseas pension may be reduced proportionally. Agreement countries may have different rules.</li>
      <li><b>Tax residency:</b> Leaving Australia may change your tax residency status. Non-residents pay different tax rates on Australian-sourced income. Seek tax advice.</li>
    </ul>

    <h5 style="margin:0 0 8px;font-size:13px;font-weight:700;color:var(--ink-2,#475569)">Checklist before relocating</h5>
    <ul style="margin:0;padding-left:18px;font-size:13px;color:var(--ink-2,#475569);display:grid;gap:6px">
      <li>☐ Confirm Age Pension eligibility with Services Australia before leaving</li>
      <li>☐ Check whether your destination has an Australian social security agreement</li>
      <li>☐ Confirm your Australian Working Life Residence (AWLR) years</li>
      <li>☐ Understand whether you can claim in Australia or must claim in the destination country</li>
      <li>☐ Update Centrelink / myGov with intended travel dates and destination</li>
      <li>☐ Review Pension Supplement and Energy Supplement impact</li>
      <li>☐ Seek tax residency advice (ATO and destination country)</li>
      <li>☐ Review Medicare status and arrange alternative health cover</li>
      <li>☐ Review super fund requirements for members living overseas</li>
      <li>☐ Consider currency risk — pension paid in AUD, expenses in local currency</li>
    </ul>

    <div style="margin-top:14px;padding:10px 12px;background:var(--surface-2,#f8fafc);border-radius:8px;font-size:11px;color:var(--ink-3,#64748b)">
      Sources:
      ${sourceLinks}
    </div>
  </div>
</div>`;
}

// ─── ANNUITY / LIFETIME INCOME GUIDANCE ──────────────────────────────────────

export function buildAnnuityGuidanceCard() {
  return `
<div class="sg-rec-card" style="border:1px solid var(--border,#e2e8f0);border-radius:18px;background:var(--surface,#fff);overflow:hidden;margin-top:12px">
  <div style="padding:14px 18px 10px;border-bottom:1px solid var(--border,#e2e8f0)">
    <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:var(--ink-3,#64748b);margin-bottom:4px">Longevity protection</div>
    <div style="font-weight:700;font-size:1rem;color:var(--ink-1,#1e293b)">Consider guaranteed income / annuity products</div>
  </div>
  <div style="padding:14px 18px;font-size:13px;color:var(--ink-2,#475569)">
    <p style="margin:0 0 12px">If you are concerned about outliving your money, products that provide guaranteed income may help manage longevity risk. The main categories available in Australia are:</p>

    <div style="display:grid;gap:10px">
      ${annuityProductRow('Account-based pension (ABP)',
        'Flexible, tax-effective income from your super. Investment returns vary; balance is not guaranteed for life. Subject to minimum drawdown rules.',
        'Flexibility, estate planning, ability to vary withdrawals. Not suitable if you need certainty of income.',
        'Longevity risk remains. If markets fall, balance reduces faster.',
        'moneysmart-account-based-pension')}
      ${annuityProductRow('Lifetime annuity',
        'Guaranteed income for life, regardless of how long you live. Income is fixed or indexed at purchase.',
        'Eliminates longevity risk. May help with Age Pension means testing (exempt asset rules may apply — check ATO and Services Australia).',
        'Gives up flexibility. Generally cannot be changed once purchased. Less liquid than ABP.',
        'moneysmart-annuities')}
      ${annuityProductRow('Fixed-term annuity',
        'Guaranteed income for a set period (e.g., 5 or 10 years). After the term, residual capital may be returned.',
        'Certainty of income for the term. Simpler than lifetime annuity.',
        'Not a solution for longevity risk beyond the term.',
        'moneysmart-annuities')}
      ${annuityProductRow('Investment-linked annuity',
        'Blends guaranteed and investment-linked income. Returns vary with underlying investment performance.',
        'Some upside potential while providing a base guaranteed amount.',
        'Complexity varies by product. Income is not fully guaranteed.',
        'moneysmart-annuities')}
    </div>

    <div style="margin-top:14px;padding:10px 12px;background:var(--surface-2,#f8fafc);border-radius:8px;font-size:12px;color:var(--ink-3,#64748b)">
      💬 <b>When to seek advice:</b> Consider speaking to a licensed financial adviser before purchasing any annuity product. Terms generally cannot be changed after purchase.
      This calculator does not endorse or recommend any specific product or provider.
      See <a href="https://moneysmart.gov.au/retirement-income/annuities" target="_blank" rel="noopener" style="color:inherit;text-decoration:underline">MoneySmart – Annuities</a> for further education.
    </div>
  </div>
</div>`;
}

function annuityProductRow(name, what, benefit, tradeoff, sourceId) {
  const src = getSource(sourceId);
  const link = src ? `<a href="${src.url}" target="_blank" rel="noopener" style="color:var(--ink-3,#64748b);text-decoration:underline;font-size:11px">${escHtml(src.label)}</a>` : '';
  return `
<div style="padding:10px 12px;background:var(--surface-2,#f8fafc);border-radius:10px">
  <div style="font-weight:700;margin-bottom:4px">${escHtml(name)}</div>
  <div style="margin-bottom:4px">${escHtml(what)}</div>
  <div style="font-size:12px;color:var(--green-700,#15803d)">✅ ${escHtml(benefit)}</div>
  <div style="font-size:12px;color:var(--orange-600,#ea580c)">⚠️ ${escHtml(tradeoff)}</div>
  ${link ? `<div style="margin-top:4px">${link}</div>` : ''}
</div>`;
}

// ─── ACTION PLAN BUILDER ──────────────────────────────────────────────────────

export function buildActionPlanSection(selectedRecs = []) {
  if (!selectedRecs.length) {
    return `<div style="padding:20px;text-align:center;color:var(--ink-3,#64748b);font-size:13px">
      Select recommendations above using the checkboxes to build your personalised action plan.
    </div>`;
  }

  const items = selectedRecs.map((r, i) => `
<div style="padding:12px 14px;border-bottom:1px solid var(--border,#e2e8f0);display:flex;gap:10px;align-items:flex-start">
  <span style="font-size:1.2rem;font-weight:800;color:var(--brand,#0ea5e9);min-width:24px">${i + 1}</span>
  <div>
    <div style="font-weight:700;font-size:13px;color:var(--ink-1,#1e293b)">${escHtml(r.title || r.shortTitle || '')}</div>
    <div style="font-size:12px;color:var(--ink-3,#64748b);margin-top:2px">${escHtml(r.category || '')}</div>
  </div>
</div>`).join('');

  return `
<div style="border:1px solid var(--border,#e2e8f0);border-radius:16px;overflow:hidden">
  <div style="padding:12px 16px;background:var(--surface-2,#f8fafc);border-bottom:1px solid var(--border,#e2e8f0);font-weight:700;font-size:14px">
    📋 Your action plan (${selectedRecs.length} selected)
  </div>
  ${items}
  <div style="padding:12px 16px;display:flex;gap:8px;justify-content:flex-end">
    <button id="sg-export-plan" style="padding:8px 16px;border-radius:8px;border:none;background:var(--brand,#0ea5e9);color:#fff;font-weight:600;cursor:pointer;font-size:13px">
      📄 Export action plan PDF
    </button>
    <button id="sg-clear-plan" style="padding:8px 14px;border-radius:8px;border:1px solid var(--border,#e2e8f0);background:var(--surface,#fff);cursor:pointer;font-size:13px">
      Clear
    </button>
  </div>
</div>`;
}

// ─── EMPTY STATE ──────────────────────────────────────────────────────────────

export function buildEmptyState() {
  return `
<div style="padding:40px 20px;text-align:center;color:var(--ink-3,#64748b)">
  <div style="font-size:3rem;margin-bottom:12px">🎯</div>
  <h4 style="margin:0 0 8px;font-size:1.1rem;color:var(--ink-2,#475569)">Run the calculator to receive personalised suggestions</h4>
  <p style="margin:0;max-width:400px;margin-inline:auto;font-size:13px;line-height:1.6">
    Enter your details and click <b>Run simulation</b> to see prioritised suggestions
    and scenario comparisons tailored to your retirement plan.
  </p>
</div>`;
}

// ─── FULL SUGGESTIONS PANEL ───────────────────────────────────────────────────

/**
 * Build the complete Suggestions / Action Plan panel HTML.
 * Call this from renderAiPanel() in advanced-v2.js and displaySuggestions() in app.js.
 *
 * @param {Object} opts
 * @param {import('./outcome-bands.js').OutcomeBandResult} opts.band
 * @param {Object[]}  opts.recommendations    Sorted recommendation objects
 * @param {Object}    [opts.overseasOpts]     Options for overseas panel (or null to hide)
 * @param {boolean}   [opts.showAnnuity]      Whether to show annuity guidance card
 * @param {boolean}   [opts.selectable]       Show action plan checkboxes
 * @param {number}    [opts.yearsToRetirement]
 * @param {number}    [opts.annualSalary]
 * @param {boolean}   [opts.isCouple]
 * @param {number}    [opts.richMultiplier]
 */
export function buildFullSuggestionsPanel(opts = {}) {
  const {
    band,
    recommendations = [],
    overseasOpts = null,
    showAnnuity = false,
    selectable = true,
    yearsToRetirement = 10,
    annualSalary = 0,
    isCouple = false,
    richMultiplier = 1.5,
  } = opts;

  if (!band) return buildEmptyState();

  const actionableRecs = recommendations.filter((r) => r.type !== 'scenario');
  const whatIfScenarios = recommendations.filter((r) => r.type === 'scenario');

  const nextAction = determineNextAction(band, actionableRecs);

  return `
<div class="suggestions-panel" id="sg-panel">
  ${DISCLAIMER_HTML}
  ${buildReadinessSummaryCard(band, { nextAction })}
  ${buildComfortableRichPanel(band, { yearsToRetirement, annualSalary, isCouple, richMultiplier })}

  <div style="margin-bottom:16px">
    <h4 style="margin:0 0 4px;font-size:1rem;font-weight:700;color:var(--ink-1,#1e293b)">Personalised suggestions</h4>
    <p style="margin:0;font-size:12px;color:var(--ink-3,#64748b)">
      Based on your inputs and calculated results. Sorted by estimated impact.
      Run the full simulation for deeper Monte Carlo scenario comparisons.
    </p>
  </div>
  ${buildFilterTabBar('all')}
  <div id="sg-recs-container">
    ${buildRecommendationsSection(actionableRecs, { selectable, showDeeper: true })}
  </div>

  ${whatIfScenarios.length > 0 ? `
  <div style="margin-top:28px;margin-bottom:16px">
    <h4 style="margin:0 0 4px;font-size:1rem;font-weight:700;color:var(--ink-1,#1e293b)">What-if scenarios</h4>
    <p style="margin:0;font-size:12px;color:var(--ink-3,#64748b)">
      Life events that are not recommendations — these show the projected impact if a specific situation arises.
    </p>
  </div>
  <div id="sg-scenarios-container">
    ${buildRecommendationsSection(whatIfScenarios, { selectable: false, showDeeper: true })}
  </div>` : ''}

  ${showAnnuity ? buildAnnuityGuidanceCard() : ''}
  ${overseasOpts ? buildAgePensionOverseasPanel(overseasOpts) : ''}

  ${selectable ? `
  <div style="margin-top:24px">
    <h4 style="margin:0 0 12px;font-size:1rem;font-weight:700;color:var(--ink-1,#1e293b)">📋 Build your action plan</h4>
    <div id="sg-action-plan">${buildActionPlanSection([])}</div>
  </div>` : ''}
</div>`;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function determineNextAction(band, recs) {
  if (!recs || !recs.length) return null;
  const top = recs.find(r => r.priority === 'HIGH' || r.impact === 'high-positive') || recs[0];
  if (!top) return null;
  return top.title || top.shortTitle || null;
}

/** Safely escape HTML special chars. */
export function escHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/** Wire interactive filter tabs and checkbox action plan after innerHTML is set. */
export function wireSuggestionsInteractivity(containerEl, opts = {}) {
  if (!containerEl) return;
  containerEl._sgInteractivityOpts = opts;
  if (containerEl.dataset.sgInteractivityBound === 'true') return;
  containerEl.dataset.sgInteractivityBound = 'true';

  containerEl.addEventListener('click', event => {
    const currentOpts = containerEl._sgInteractivityOpts || {};
    const button = event.target.closest('button');
    if (!button || !containerEl.contains(button)) return;

    if (button.classList.contains('sg-filter-btn')) {
      const filter = button.dataset.filter;
      containerEl.querySelectorAll('.sg-filter-btn').forEach(b => {
        const on = b.dataset.filter === filter;
        b.classList.toggle('sg-filter-btn--on', on);
        b.style.background = on ? 'var(--brand,#0ea5e9)' : 'var(--surface,#fff)';
        b.style.color = on ? '#fff' : 'var(--ink-2,#475569)';
        b.setAttribute('aria-selected', on);
      });
      const recsContainer = containerEl.querySelector('#sg-recs-container');
      if (recsContainer && currentOpts.recommendations) {
        const actionableOnly = currentOpts.recommendations.filter((r) => r.type !== 'scenario');
        recsContainer.innerHTML = buildRecommendationsSection(actionableOnly, {
          selectable: currentOpts.selectable,
          showDeeper: true,
          activeFilter: filter,
        });
      }
      return;
    }

    if (button.classList.contains('sg-try-btn')) {
      const id = button.dataset.recId;
      const rec = currentOpts.recommendations?.find(r => (r.id || r.title) === id);
      if (rec && currentOpts.onTryScenario) currentOpts.onTryScenario(rec);
      return;
    }

    if (button.id === 'sg-run-deeper' && currentOpts.onRunDeeper) {
      currentOpts.onRunDeeper();
      return;
    }

    if (button.id === 'sg-export-plan' && currentOpts.onExportPlan) {
      currentOpts.onExportPlan(getSelectedRecommendations(containerEl, currentOpts.recommendations));
      return;
    }

    if (button.id === 'sg-clear-plan') {
      containerEl.querySelectorAll('.sg-action-check').forEach(cb => { cb.checked = false; });
      const planEl = containerEl.querySelector('#sg-action-plan');
      if (planEl) planEl.innerHTML = buildActionPlanSection([]);
    }
  });

  containerEl.addEventListener('change', event => {
    const currentOpts = containerEl._sgInteractivityOpts || {};
    const checkbox = event.target.closest('.sg-action-check');
    if (!checkbox || !currentOpts.selectable) return;
    const planEl = containerEl.querySelector('#sg-action-plan');
    if (planEl) {
      planEl.innerHTML = buildActionPlanSection(getSelectedRecommendations(containerEl, currentOpts.recommendations));
    }
  });
}

function getSelectedRecommendations(containerEl, recommendations = []) {
  const selected = [];
  containerEl.querySelectorAll('.sg-action-check:checked').forEach(checkbox => {
    const id = checkbox.dataset.recId;
    const rec = recommendations.find(r => (r.id || r.title) === id);
    if (rec) selected.push(rec);
  });
  return selected;
}

export default {
  buildFullSuggestionsPanel,
  buildReadinessSummaryCard,
  buildComfortableRichPanel,
  buildRecommendationsSection,
  buildRecommendationCard,
  buildFilterTabBar,
  buildAgePensionOverseasPanel,
  buildAnnuityGuidanceCard,
  buildActionPlanSection,
  buildEmptyState,
  wireSuggestionsInteractivity,
  DISCLAIMER_HTML,
  SUGGESTION_FILTERS,
  escHtml,
  getFilterTags,
};
