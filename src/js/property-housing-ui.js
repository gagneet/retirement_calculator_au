/**
 * property-housing-ui.js - UI controller for the Property & Housing section.
 *
 * Handles:
 * - Toggle visibility of subsections
 * - Dynamic investment property cards
 * - Run MC and render chart results
 * - Policy comparison UI
 * - Sell/keep/downsize analysis
 *
 * Imported by advanced-v2.js, retirement-v3.js.
 * Does NOT import page-specific state — callers pass inputs in.
 */

import {
    PROPERTY_USE,
    LOAN_TYPE,
    PROPERTY_POLICY_MODE,
    CITY_GROWTH_RATES,
    TAX_POLICY_DEFAULTS,
    validatePropertyInput,
    runPropertyMonteCarlo,
    runPropertyDeterministic,
    comparePropertyPoliciesMC,
    compareRetirementStrategies,
    comparePropertyVsETF,
    calcCGT,
    buildEffectivePolicy,
    buildHistoricalAnchorRates,
    estimateCurrentValueFromHistory,
} from './property/index.js';

import { formatCurrency } from './utils.js';

// ---------------------------------------------------------------------------
// Investment property card template
// ---------------------------------------------------------------------------

let _cardCounter = 0;

function makeCardId() {
    return `ip-card-${++_cardCounter}`;
}

/**
 * Create a DOM element for one investment property card.
 * Returns { el, id } where el is the card element and id is its unique card id.
 */
export function createPropertyCard(existingData = {}) {
    const cardId = existingData._cardId || makeCardId();
    const city   = existingData.city ?? 'national';
    const purchaseYear = existingData.purchaseYear ?? '';

    const el = document.createElement('div');
    el.className  = 'property-card';
    el.dataset.cardId = cardId;
    el.style.cssText  = 'border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:12px;background:#fff;';

    el.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
        <strong class="card-label">${existingData.label || 'Investment Property'}</strong>
        <div>
          <button type="button" class="btn btn-link ip-card-toggle" data-card="${cardId}">Collapse</button>
          <button type="button" class="btn btn-link ip-card-remove" data-card="${cardId}" style="color:#ef4444;">Remove</button>
        </div>
      </div>
      <div class="ip-card-body" id="ip-body-${cardId}">
        <div class="fields three">
          <div class="field">
            <label class="field-label"><span>Property label</span></label>
            <div class="field-input"><input class="ip-label" type="text" value="${existingData.label || ''}" placeholder="e.g. Canberra unit" /></div>
          </div>
          <div class="field">
            <label class="field-label"><span>City / region</span></label>
            <div class="field-input">
              <select class="ip-city">
                ${Object.keys(CITY_GROWTH_RATES).map(c =>
                    `<option value="${c}" ${c === city ? 'selected' : ''}>${c.charAt(0).toUpperCase() + c.slice(1)}</option>`
                ).join('')}
              </select>
            </div>
          </div>
          <div class="field">
            <label class="field-label"><span>New build?</span></label>
            <div class="field-input">
              <select class="ip-is-new-build">
                <option value="false" ${!existingData.isNewBuild ? 'selected' : ''}>Established</option>
                <option value="true" ${existingData.isNewBuild ? 'selected' : ''}>New build</option>
              </select>
            </div>
          </div>
        </div>
        <div class="fields three">
          <div class="field"><label class="field-label"><span>Purchase price / cost base</span><span class="hint">$</span></label><div class="field-input has-prefix"><span class="prefix">$</span><input class="ip-purchase-price" type="number" value="${existingData.purchasePrice ?? 0}" /></div></div>
          <div class="field"><label class="field-label"><span>Purchase year</span></label><div class="field-input"><input class="ip-purchase-year" type="number" min="1900" max="2100" value="${purchaseYear}" placeholder="e.g. 2022" /></div></div>
          <div class="field"><label class="field-label"><span>Current / estimated value</span><span class="hint">$</span></label><div class="field-input has-prefix"><span class="prefix">$</span><input class="ip-current-value" type="number" value="${existingData.currentValue ?? 0}" /></div><div class="field-help">If you purchased before 2026, leave at 0 and click &ldquo;Estimate from history&rdquo; below.</div></div>
          <div class="field"><label class="field-label"><span>Current loan balance</span><span class="hint">$</span></label><div class="field-input has-prefix"><span class="prefix">$</span><input class="ip-loan-balance" type="number" value="${existingData.currentLoanBalance ?? 0}" /></div></div>
          <div class="field"><label class="field-label"><span>Loan rate</span><span class="hint">%</span></label><div class="field-input"><input class="ip-interest-rate" type="number" step="0.01" value="${existingData.interestRate != null ? (existingData.interestRate * 100).toFixed(2) : 6.35}" /><span class="suffix">%</span></div></div>
          <div class="field"><label class="field-label"><span>Loan type</span></label><div class="field-input"><select class="ip-loan-type"><option value="principal_interest" ${(existingData.loanType ?? 'principal_interest') === 'principal_interest' ? 'selected' : ''}>P&amp;I</option><option value="interest_only" ${existingData.loanType === 'interest_only' ? 'selected' : ''}>Interest only</option></select></div></div>
          <div class="field"><label class="field-label"><span>Loan term</span><span class="hint">yrs</span></label><div class="field-input"><input class="ip-loan-term" type="number" min="1" max="40" value="${existingData.loanTermYears ?? 30}" /><span class="suffix">yrs</span></div></div>
          <div class="field"><label class="field-label"><span>Offset balance</span><span class="hint">$</span></label><div class="field-input has-prefix"><span class="prefix">$</span><input class="ip-offset" type="number" value="${existingData.offsetBalance ?? 0}" /></div></div>
        </div>
        <div class="fields three">
          <div class="field"><label class="field-label"><span>Weekly rent</span><span class="hint">$/wk</span></label><div class="field-input has-prefix"><span class="prefix">$</span><input class="ip-weekly-rent" type="number" value="${existingData.weeklyRent ?? 0}" /><span class="suffix">/wk</span></div></div>
          <div class="field"><label class="field-label"><span>Vacancy weeks/yr</span></label><div class="field-input"><input class="ip-vacancy-weeks" type="number" min="0" max="52" value="${existingData.vacancyWeeksPerYear ?? 2}" /><span class="suffix">wks</span></div></div>
          <div class="field"><label class="field-label"><span>Mgmt fee</span><span class="hint">%</span></label><div class="field-input"><input class="ip-mgmt-pct" type="number" step="0.1" value="${existingData.expenses?.managementPct != null ? (existingData.expenses.managementPct * 100).toFixed(1) : 8}" /><span class="suffix">%</span></div></div>
          <div class="field"><label class="field-label"><span>Council rates</span><span class="hint">$/yr</span></label><div class="field-input has-prefix"><span class="prefix">$</span><input class="ip-council-rates" type="number" value="${existingData.expenses?.councilRates ?? 1200}" /></div></div>
          <div class="field"><label class="field-label"><span>Insurance</span><span class="hint">$/yr</span></label><div class="field-input has-prefix"><span class="prefix">$</span><input class="ip-insurance" type="number" value="${existingData.expenses?.insurance ?? 1100}" /></div></div>
          <div class="field"><label class="field-label"><span>Maintenance</span><span class="hint">$/yr</span></label><div class="field-input has-prefix"><span class="prefix">$</span><input class="ip-maintenance" type="number" value="${existingData.expenses?.maintenance ?? 2000}" /></div></div>
          <div class="field"><label class="field-label"><span>Strata levy</span><span class="hint">$/yr</span></label><div class="field-input has-prefix"><span class="prefix">$</span><input class="ip-strata" type="number" value="${existingData.expenses?.strata ?? 0}" /></div></div>
          <div class="field"><label class="field-label"><span>Land tax</span><span class="hint">$/yr</span></label><div class="field-input has-prefix"><span class="prefix">$</span><input class="ip-land-tax" type="number" value="${existingData.expenses?.landTax ?? 0}" /></div></div>
          <div class="field"><label class="field-label"><span>Water rates</span><span class="hint">$/yr</span></label><div class="field-input has-prefix"><span class="prefix">$</span><input class="ip-water-rates" type="number" value="${existingData.expenses?.waterRates ?? 800}" /></div></div>
        </div>
        <div class="fields two">
          <div class="field"><label class="field-label"><span>Annual depreciation deduction</span><span class="hint">$/yr</span></label><div class="field-input has-prefix"><span class="prefix">$</span><input class="ip-depreciation" type="number" value="${existingData.depreciation?.annualDeduction ?? 0}" /></div><div class="field-help">From a Quantity Surveyor's depreciation schedule.</div></div>
          <div class="field"><label class="field-label"><span>Capital works deduction</span><span class="hint">$/yr</span></label><div class="field-input has-prefix"><span class="prefix">$</span><input class="ip-cap-works" type="number" value="${existingData.depreciation?.capitalWorks ?? 0}" /></div></div>
        </div>
        <div class="fields two">
          <div class="field"><label class="field-label"><span>Your ownership</span><span class="hint">%</span></label><div class="field-input"><input class="ip-ownership-user" type="number" min="0" max="100" value="${existingData.ownershipUserPct ?? 100}" /><span class="suffix">%</span></div></div>
          <div class="field"><label class="field-label"><span>Partner ownership</span><span class="hint">%</span></label><div class="field-input"><input class="ip-ownership-partner" type="number" min="0" max="100" value="${existingData.ownershipPartnerPct ?? 0}" /><span class="suffix">%</span></div></div>
        </div>
        <div class="fields">
          <div class="field"><label class="field-label"><span>Strategy at retirement</span></label><div class="field-input"><select class="ip-retirement-strategy"><option value="sell_at_retirement" selected>Sell at retirement</option><option value="keep_into_retirement">Keep into retirement</option><option value="downsize_at_retirement">Downsize (swap for PPOR)</option></select></div></div>
        </div>
        <div class="fields">
          <button type="button" class="btn btn-secondary ip-estimate-value" data-card="${cardId}">Estimate current value from history</button>
          <span class="ip-estimate-output" style="margin-left:8px;font-size:0.9em;color:#64748b;"></span>
        </div>
        <div class="ip-validation-errors" style="color:#ef4444;font-size:0.9em;margin-top:6px;"></div>
      </div>
    `;

    return { el, cardId };
}

/**
 * Read all field values from a property card element.
 * Returns a PropertyInput-compatible object.
 */
export function readPropertyCard(cardEl) {
    const g = (sel) => cardEl.querySelector(sel);
    const val = (sel) => parseFloat(g(sel)?.value) || 0;
    const str = (sel) => g(sel)?.value ?? '';

    const purchaseYear = parseInt(str('.ip-purchase-year')) || null;
    const city         = str('.ip-city') || 'national';
    const isNewBuild   = str('.ip-is-new-build') === 'true';

    let currentValue = val('.ip-current-value');
    if (!currentValue && purchaseYear) {
        currentValue = estimateCurrentValueFromHistory(val('.ip-purchase-price'), city, purchaseYear);
    }

    return {
        _cardId:           cardEl.dataset.cardId,
        id:                cardEl.dataset.cardId,
        label:             str('.ip-label') || 'Investment Property',
        useType:           PROPERTY_USE.INVESTMENT,
        isPpor:            false,
        city,
        isNewBuild,
        purchasePrice:     val('.ip-purchase-price'),
        purchaseYear,
        currentValue,
        currentLoanBalance: val('.ip-loan-balance'),
        interestRate:      val('.ip-interest-rate') / 100,
        loanType:          str('.ip-loan-type'),
        loanTermYears:     val('.ip-loan-term'),
        offsetBalance:     val('.ip-offset'),
        weeklyRent:        val('.ip-weekly-rent'),
        vacancyWeeksPerYear: val('.ip-vacancy-weeks'),
        ownershipUserPct:  val('.ip-ownership-user'),
        ownershipPartnerPct: val('.ip-ownership-partner'),
        retirementStrategy: str('.ip-retirement-strategy'),
        expenses: {
            managementPct:  val('.ip-mgmt-pct') / 100,
            councilRates:   val('.ip-council-rates'),
            insurance:      val('.ip-insurance'),
            maintenance:    val('.ip-maintenance'),
            strata:         val('.ip-strata'),
            landTax:        val('.ip-land-tax'),
            waterRates:     val('.ip-water-rates'),
        },
        depreciation: {
            annualDeduction: val('.ip-depreciation'),
            capitalWorks:    val('.ip-cap-works'),
        },
    };
}

// ---------------------------------------------------------------------------
// Property policy reader
// ---------------------------------------------------------------------------

export function readPropertyPolicy(doc = document) {
    const mode = doc.getElementById('propertyPolicyMode')?.value ?? PROPERTY_POLICY_MODE.CURRENT;
    return {
        policyMode:                                mode,
        currentCgtDiscountRate:                    (parseFloat(doc.getElementById('currentCgtDiscountRate')?.value) || 50) / 100,
        negativeGearingCurrentAllowed:             doc.getElementById('negativeGearingCurrentAllowed')?.value !== 'false',
        negativeGearingProposedEstablishedAllowed: doc.getElementById('ngProposedEstablished')?.value === 'true',
        negativeGearingProposedNewBuildAllowed:    doc.getElementById('ngProposedNewBuild')?.value !== 'false',
        carriedForwardLossesAllowed:               doc.getElementById('carriedForwardLossesAllowed')?.value !== 'false',
        proposedUsesInflationIndexation:           doc.getElementById('proposedCgtIndexation')?.value !== 'false',
        proposedMinimumCgtRate:                    (parseFloat(doc.getElementById('proposedMinCgtRate')?.value) || 20) / 100,
        pporMainResidenceExemption:                true,
        marginalTaxRateUser:                       TAX_POLICY_DEFAULTS.marginalTaxRateDefault,
    };
}

// ---------------------------------------------------------------------------
// Property MC inputs reader
// ---------------------------------------------------------------------------

export function readPropertyMcInputs(doc = document) {
    const g = (id) => doc.getElementById(id);
    return {
        numRuns:            parseInt(g('propertyMcNumRuns')?.value) || 500,
        holdYears:          parseInt(g('propertyMcHoldYears')?.value) || 20,
        propertyGrowthRate: (parseFloat(g('propertyMcGrowthMean')?.value) || 6.5) / 100,
        inflationRate:      (parseFloat(g('propertyMcInflationMean')?.value) || 3.6) / 100,
    };
}

// ---------------------------------------------------------------------------
// Summary card renderer
// ---------------------------------------------------------------------------

function renderSummaryCard(label, value, sub = '') {
    return `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px 16px;min-width:140px;">
      <div style="font-size:0.75em;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">${label}</div>
      <div style="font-size:1.4em;font-weight:700;color:#1e293b;">${value}</div>
      ${sub ? `<div style="font-size:0.8em;color:#94a3b8;">${sub}</div>` : ''}
    </div>`;
}

export function renderMCSummaryCards(container, mcResult) {
    if (!container || !mcResult) return;
    container.style.cssText = 'display:flex;flex-wrap:wrap;gap:10px;margin-bottom:16px;';
    container.innerHTML = [
        renderSummaryCard('Median IRR', `${((mcResult.irr?.p50 ?? 0) * 100).toFixed(1)}%`, 'P25: ' + ((mcResult.irr?.p25 ?? 0) * 100).toFixed(1) + '% / P75: ' + ((mcResult.irr?.p75 ?? 0) * 100).toFixed(1) + '%'),
        renderSummaryCard('Success rate', `${(mcResult.successRate * 100).toFixed(0)}%`, 'Real profit > 0'),
        renderSummaryCard('Median equity', formatCurrency(mcResult.finalEquity?.p50 ?? 0), 'at end of hold'),
        renderSummaryCard('Median CGT', formatCurrency(mcResult.cgtPayable?.p50 ?? 0), 'on sale'),
        renderSummaryCard('Prob. real loss', `${(mcResult.probabilityOfRealLoss * 100).toFixed(0)}%`, ''),
    ].join('');
}

// ---------------------------------------------------------------------------
// Strategy comparison table
// ---------------------------------------------------------------------------

export function renderStrategyTable(container, result) {
    if (!container || !result) return;
    container.innerHTML = `
      <table style="width:100%;border-collapse:collapse;font-size:0.9em;">
        <thead><tr style="background:#f1f5f9;">
          <th style="padding:8px 12px;text-align:left;">Strategy</th>
          <th style="padding:8px 12px;text-align:right;">Est. real annual income</th>
          <th style="padding:8px 12px;text-align:right;">Net proceeds / equity</th>
        </tr></thead>
        <tbody>
          <tr style="border-top:1px solid #e2e8f0;${result.recommendedStrategy === 'sell_at_retirement' ? 'background:#f0fdf4;font-weight:600;' : ''}">
            <td style="padding:8px 12px;">Sell at retirement${result.recommendedStrategy === 'sell_at_retirement' ? ' (recommended)' : ''}</td>
            <td style="padding:8px 12px;text-align:right;">${formatCurrency(result.sell?.realAnnualIncome ?? 0)}/yr</td>
            <td style="padding:8px 12px;text-align:right;">${formatCurrency(result.sell?.netProceeds ?? 0)}</td>
          </tr>
          <tr style="border-top:1px solid #e2e8f0;${result.recommendedStrategy === 'keep_into_retirement' ? 'background:#f0fdf4;font-weight:600;' : ''}">
            <td style="padding:8px 12px;">Keep into retirement${result.recommendedStrategy === 'keep_into_retirement' ? ' (recommended)' : ''}</td>
            <td style="padding:8px 12px;text-align:right;">${formatCurrency(result.keep?.realAnnualRent ?? 0)}/yr rent</td>
            <td style="padding:8px 12px;text-align:right;">${formatCurrency(result.keep?.finalEquity ?? 0)} equity</td>
          </tr>
          <tr style="border-top:1px solid #e2e8f0;${result.recommendedStrategy === 'downsize_at_retirement' ? 'background:#f0fdf4;font-weight:600;' : ''}">
            <td style="padding:8px 12px;">Downsize${result.recommendedStrategy === 'downsize_at_retirement' ? ' (recommended)' : ''}</td>
            <td style="padding:8px 12px;text-align:right;">${formatCurrency(result.downsize?.realAnnualIncome ?? 0)}/yr</td>
            <td style="padding:8px 12px;text-align:right;">${formatCurrency(result.downsize?.freeSaleProceeds ?? 0)} freed</td>
          </tr>
        </tbody>
      </table>
    `;
}

// ---------------------------------------------------------------------------
// Init: wire up all UI toggles for the property-housing section
// ---------------------------------------------------------------------------

export function initPropertyHousingUI(doc = document) {
    const show = (id, visible) => {
        const el = doc.getElementById(id);
        if (el) el.hidden = !visible;
    };

    // PPOR detailed toggle
    doc.getElementById('ppor-detailed-enabled')?.addEventListener('change', function () {
        show('ppor-detailed-fields', this.checked);
    });

    // Partial rental toggle
    doc.getElementById('pporPartialRental')?.addEventListener('change', function () {
        show('ppor-partial-rental-fields', this.checked);
    });

    // PPOR downsize strategy toggle
    doc.getElementById('pporRetirementStrategy')?.addEventListener('change', function () {
        show('ppor-downsize-fields', this.value === 'downsize_at_retirement');
    });

    // Investment property detailed toggle
    const ipEnabled = doc.getElementById('ip-detailed-enabled');
    if (ipEnabled) {
        ipEnabled.addEventListener('change', function () {
            show('ip-detailed-cards', this.checked);
        });
    }

    // Add IP card button
    doc.getElementById('add-ip-card')?.addEventListener('click', () => {
        const container = doc.getElementById('ip-cards-container');
        if (!container) return;
        const { el, cardId } = createPropertyCard();
        container.appendChild(el);
        wireCardEvents(el, doc);
    });

    // Policy mode toggle
    doc.getElementById('propertyPolicyMode')?.addEventListener('change', function () {
        const isProposed = this.value !== PROPERTY_POLICY_MODE.CURRENT;
        show('property-policy-proposed', isProposed);
    });

    // MC toggle
    doc.getElementById('propertyMcEnabled')?.addEventListener('change', function () {
        show('property-mc-fields', this.checked);
    });

    // Planned purchase toggle
    doc.getElementById('planned-purchase-enabled')?.addEventListener('change', function () {
        show('planned-purchase-fields', this.checked);
    });

    // Planned purchase date — warn about 2027 window
    doc.getElementById('plannedPurchaseDate')?.addEventListener('change', function () {
        const val = this.value;
        if (val) {
            const d = new Date(val + '-01');
            const is2027 = d.getFullYear() === 2027 && d.getMonth() >= 6 && d.getMonth() <= 7;
            show('planned-purchase-2027-note', is2027);
        }
    });

    // Property comparison toggle
    doc.getElementById('propertyComparisonEnabled')?.addEventListener('change', function () {
        show('property-comparison-results', this.checked);
    });

    // Strategy analysis toggle
    doc.getElementById('propertyStrategyAnalysisEnabled')?.addEventListener('change', function () {
        show('property-strategy-results', this.checked);
    });

    // MC run button
    doc.getElementById('run-property-mc-btn')?.addEventListener('click', async () => {
        const cards = [...(doc.getElementById('ip-cards-container')?.querySelectorAll('.property-card') ?? [])];
        if (!cards.length) {
            alert('Add at least one investment property card first.');
            return;
        }
        const prop      = readPropertyCard(cards[0]);  // run MC on first property
        const policy    = readPropertyPolicy(doc);
        const mcInputs  = readPropertyMcInputs(doc);

        const btn = doc.getElementById('run-property-mc-btn');
        btn.disabled  = true;
        btn.textContent = 'Running…';

        try {
            const result = runPropertyMonteCarlo(prop, {
                ...mcInputs,
                startPropertyValue: prop.currentValue,
                startLoanBalance:   prop.currentLoanBalance,
                policy,
            });

            show('property-mc-results', true);
            renderMCSummaryCards(doc.getElementById('property-mc-summary-cards'), result);
            renderPropertyFanChart(doc.getElementById('property-value-fan-chart'), result.yearlyValueFan, 'Property value');
            renderPropertyFanChart(doc.getElementById('property-cashflow-fan-chart'), result.yearlyCashflowFan, 'Net cashflow after tax');
        } catch (e) {
            console.error('Property MC error:', e);
        } finally {
            btn.disabled  = false;
            btn.textContent = 'Run property Monte Carlo';
        }
    });
}

// ---------------------------------------------------------------------------
// Wire events for a single property card
// ---------------------------------------------------------------------------

function wireCardEvents(cardEl, doc) {
    cardEl.querySelector('.ip-card-remove')?.addEventListener('click', () => {
        cardEl.remove();
    });

    cardEl.querySelector('.ip-card-toggle')?.addEventListener('click', function () {
        const body = cardEl.querySelector('.ip-card-body');
        if (!body) return;
        const isHidden = body.style.display === 'none';
        body.style.display = isHidden ? '' : 'none';
        this.textContent   = isHidden ? 'Collapse' : 'Expand';
    });

    cardEl.querySelector('.ip-estimate-value')?.addEventListener('click', () => {
        const purchasePrice = parseFloat(cardEl.querySelector('.ip-purchase-price')?.value) || 0;
        const purchaseYear  = parseInt(cardEl.querySelector('.ip-purchase-year')?.value)  || null;
        const city          = cardEl.querySelector('.ip-city')?.value ?? 'national';
        if (!purchasePrice || !purchaseYear) {
            alert('Enter a purchase price and purchase year first.');
            return;
        }
        const estimated = estimateCurrentValueFromHistory(purchasePrice, city, purchaseYear);
        const input = cardEl.querySelector('.ip-current-value');
        if (input) input.value = estimated;
        const out = cardEl.querySelector('.ip-estimate-output');
        if (out) out.textContent = `Estimated: ${formatCurrency(estimated)} (based on historical city growth)`;
    });

    cardEl.querySelector('.ip-label')?.addEventListener('input', function () {
        cardEl.querySelector('.card-label').textContent = this.value || 'Investment Property';
    });
}

// ---------------------------------------------------------------------------
// Fan chart rendering (requires Chart.js to be loaded on page)
// ---------------------------------------------------------------------------

function renderPropertyFanChart(canvas, fanData, title) {
    if (!canvas || !fanData || !fanData.length) return;
    if (!window.Chart) return;

    const labels  = fanData.map(d => `Year ${d.year}`);
    const p10     = fanData.map(d => d.p10);
    const p50     = fanData.map(d => d.p50);
    const p90     = fanData.map(d => d.p90);

    // Chart.js 4.x official API: Chart.getChart(canvas) returns any existing instance.
    const existing = window.Chart.getChart?.(canvas);
    if (existing) existing.destroy();
    new window.Chart(canvas, {
        type: 'line',
        data: {
            labels,
            datasets: [
                { label: 'P90', data: p90, borderColor: '#94a3b8', borderWidth: 1, fill: false, pointRadius: 0 },
                { label: 'P50 (Median)', data: p50, borderColor: '#2563eb', borderWidth: 2, fill: false, pointRadius: 2 },
                { label: 'P10', data: p10, borderColor: '#94a3b8', borderWidth: 1, fill: false, pointRadius: 0 },
            ],
        },
        options: {
            responsive: true,
            plugins: { title: { display: true, text: title } },
            scales: { y: { ticks: { callback: (v) => formatCurrency(v) } } },
        },
    });
}

export default {
    createPropertyCard,
    readPropertyCard,
    readPropertyPolicy,
    readPropertyMcInputs,
    renderMCSummaryCards,
    renderStrategyTable,
    initPropertyHousingUI,
};
