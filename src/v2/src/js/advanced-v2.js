// ============================================================
// src/js/advanced-v2.js
// Thin vanilla controller for the redesigned advanced page.
// Wires the new DOM to existing calculation engines.
// ============================================================

import '../css/styles.css';
import '../css/redesign.css';

// ── Reuse your existing engines ──
// Replace the right-hand side with the actual module paths / exports
// in your repo. Each helper is documented inline so you can map quickly.
//
// import { runProjection }      from './outcome-engine.js';
// import { runMonteCarlo }      from './enhanced-monte-carlo.js';
// import { generateRecommendations } from './recommendation.js';
// import { resilienceScore }    from './resilience-scenarios.js';
// import './theme.js';
//
// Most of your engines currently read directly from DOM IDs in
// advanced.html. Because we've named every input in advanced-v2.html
// to MATCH those IDs (currentAge, retirementAge, salary, super, etc.),
// you should be able to import and call them with no signature changes.
//
// If a particular engine takes an explicit `inputs` object, use
// readInputs() below to build it.

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
        if (bindKey === 'household') applyHouseholdVisibility();
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

// ============================================================
// 6. STUB ENGINE — fast simplified projection
//    Replace with your real engine wiring (see top of file).
// ============================================================
function stubProjection(inp) {
  const inflR = inp.inflation / 100;
  const supR = inp.superGrowth / 100;
  const yearsToRetire = Math.max(0, inp.retireAge - inp.age);
  const yearsInRetire = Math.max(1, inp.lifespan - inp.retireAge);
  const sgRate = (inp.employerRate || 12) / 100;
  const hasPartner = inp.household === 'couple';

  // Project super to retirement
  let sup = inp.superBal;
  let pSup = hasPartner ? inp.partnerSuperBal : 0;
  for (let y = 0; y < yearsToRetire; y++) {
    const sg = inp.salary * sgRate * Math.pow(1 + inflR, y);
    const pSg = hasPartner ? inp.partnerSalary * sgRate * Math.pow(1 + inflR, y) : 0;
    const sac = inp.salarySacrifice * Math.pow(1 + inflR, y);
    sup = sup * (1 + supR) + (sg + sac) * 0.85;
    pSup = pSup * (1 + supR) + pSg * 0.85;
  }
  const superAtRetire = sup + pSup;
  // Simple drawdown
  const drawdownReal = superAtRetire / yearsInRetire / Math.pow(1 + inflR, yearsToRetire);
  const pensionBase = hasPartner ? inp.pensionAnnualCouple : inp.pensionAnnualSingle;
  const pensionTaper = superAtRetire >= inp.pensionAssetCutoff ? 0
    : superAtRetire <= inp.pensionAssetThreshold ? 1
    : 1 - (superAtRetire - inp.pensionAssetThreshold) / (inp.pensionAssetCutoff - inp.pensionAssetThreshold);
  const pensionReal = pensionBase * Math.max(0, pensionTaper);

  const totalAnnual = drawdownReal + pensionReal;
  const monthly = totalAnnual / 12;
  const gapMonthly = inp.desiredIncome / 12 - monthly;
  const confidence = Math.max(0.3, Math.min(0.95, monthly / (inp.desiredIncome / 12)));

  // Year-by-year for the mini chart and table
  const years = [];
  let assets = inp.superBal + (hasPartner ? inp.partnerSuperBal : 0) + inp.cash + inp.stocks;
  for (let y = 0; y <= (inp.lifespan - inp.age); y++) {
    const a = inp.age + y;
    if (a < inp.retireAge) {
      assets = assets * (1 + supR) + (inp.salary + (hasPartner ? inp.partnerSalary : 0)) * sgRate * Math.pow(1 + inflR, y);
    } else {
      assets = Math.max(0, assets * (1 + supR) - totalAnnual * Math.pow(1 + inflR, y));
    }
    years.push({ age: a, totalAssets: assets, retired: a >= inp.retireAge, withdraw: a >= inp.retireAge ? drawdownReal * Math.pow(1 + inflR, y) : 0, pension: a >= inp.agePensionAge ? pensionReal * Math.pow(1 + inflR, y) : 0 });
  }
  const lastsUntil = (years.findLast ? years.findLast(y => y.retired && y.totalAssets > 5000) : [...years].reverse().find(y => y.retired && y.totalAssets > 5000));

  return {
    monthlyPaycheck: monthly,
    superAtRetire,
    breakdown: { super: drawdownReal, pension: pensionReal, other: 0 },
    confidence,
    gapMonthly,
    lastsUntil: lastsUntil ? lastsUntil.age : inp.lifespan,
    years,
  };
}

// REPLACE THIS with your real engine call:
function runEngine(inp) {
  // Example wiring (uncomment when you've imported your engine):
  // return runProjection(inp);
  return stubProjection(inp);
}

// ============================================================
// 7. PAINT — sticky panel + tab content
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

function $(id) { return document.getElementById(id); }
function setText(id, text) { const el = $(id); if (el) el.textContent = text; }
function setHTML(id, html) { const el = $(id); if (el) el.innerHTML = html; }

function paint(result, inp) {
  // Hero
  setText('r-paycheck', Math.round(result.monthlyPaycheck).toLocaleString('en-AU'));
  setText('r-retire-age', inp.retireAge);
  setText('r-lifespan', inp.lifespan);
  setText('r-combined', inp.household === 'couple' ? ' · combined' : '');

  // Runway
  const ic = $('r-runway-icon');
  const ok = result.lastsUntil >= inp.lifespan;
  const close = result.lastsUntil >= inp.lifespan - 5;
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

  // Metrics
  setHTML('r-super-at-retire',
    fmt$(result.superAtRetire, { compact: true }) + '<span class="sub">today\'s $</span>');
  const conf = result.confidence * 100;
  const confLabel = conf >= 85 ? 'Strong' : conf >= 60 ? 'Moderate' : conf >= 35 ? 'Tight' : 'At risk';
  const confColor = conf >= 85 ? 'var(--accent)' : conf >= 60 ? 'var(--gold)' : conf >= 35 ? 'var(--amber)' : 'var(--rose)';
  const confEl = $('r-confidence');
  if (confEl) {
    confEl.innerHTML = Math.round(conf) + '%<span class="sub">' + confLabel + '</span>';
    confEl.style.color = confColor;
  }

  // Gauge
  const targetMonthly = inp.desiredIncome / 12;
  setText('r-goal', '$' + Math.round(targetMonthly).toLocaleString('en-AU'));
  const gauge = Math.min(100, Math.max(0, (result.monthlyPaycheck / targetMonthly) * 100));
  const gfill = $('r-gauge-fill');
  if (gfill) gfill.style.width = gauge + '%';
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
  setText('r-mini-range', `today → age ${inp.lifespan}`);

  // Hero stats
  setText('hs-age', inp.age);
  setText('hs-plan', inp.lifespan);
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
// 8. LIVE RECALC (debounced)
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
// 9. ANALYSIS TABS
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
// 10. TOPBAR + ACTION STRIP
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

// ============================================================
// BOOT
// ============================================================
function boot() {
  try {
    console.log('[advanced-v2] boot starting');
    initAccordion();
    initSegmented();
    initTabs();
    initTopbar();
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
    console.log('[advanced-v2] boot complete');
  } catch (err) {
    console.error('[advanced-v2] BOOT FAILED:', err);
    // Show a visible error on-page so blank panel is diagnosable
    const card = document.querySelector('.results-card');
    if (card) {
      const banner = document.createElement('div');
      banner.style.cssText = 'background:#fee;color:#900;padding:10px;border-radius:8px;margin-bottom:10px;font-size:12px';
      banner.innerHTML = '<b>Controller error:</b> ' + (err.message || err) + ' — open the browser console for details.';
      card.insertBefore(banner, card.firstChild);
    }
  }
}

// Don't rely on DOMContentLoaded — the script may have been injected after it fired.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  // DOM already ready, run on next tick to let module finish evaluating
  setTimeout(boot, 0);
}
