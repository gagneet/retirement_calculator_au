/**
 * reverse-ui.js - UI controller for the Reverse Retirement Planner page
 *
 * Responsibilities:
 *  - Form input collection (simple + advanced modes)
 *  - localStorage bridge (import from forward calculator)
 *  - DOM result rendering
 *  - Overseas comparison cards rendering
 */

import { ReversePlanner } from './reverse-planner.js';
import {
    generatePlainEnglishSummary,
    generateAssumptionsText,
    formatLeverAsAction,
    DISCLAIMER_TEXT,
} from './reverse-report.js';

const STORAGE_KEY = 'rc_forward_scenario';

const CURRENCY_FORMAT = new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
});

function fmt(v) { return CURRENCY_FORMAT.format(Math.round(v)); }
function el(id) { return document.getElementById(id); }
function safeText(id, text) {
    const elem = el(id);
    if (elem) elem.textContent = text;
}
function safeHtml(id, html) {
    const elem = el(id);
    if (elem) elem.innerHTML = html;
}
function hide(id) {
    const elem = el(id);
    if (elem) elem.classList.add('hidden');
}
function show(id) {
    const elem = el(id);
    if (elem) elem.classList.remove('hidden');
}

// ---------------------------------------------------------------------------
// ReverseUI class
// ---------------------------------------------------------------------------

export class ReverseUI {
    constructor() {
        this.planner = new ReversePlanner();
        this.lastResult = null;
        this.isCalculating = false;
    }

    /**
     * Initialise the UI: attach event listeners, check for import data.
     */
    init() {
        // Check for forward calculator data in localStorage
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const scenario = JSON.parse(stored);
                this.showImportBanner(scenario);
            }
        } catch {
            // localStorage unavailable or parse error — silently skip
        }

        // Calculate button
        const calcBtn = el('rp-calculate-btn');
        if (calcBtn) {
            calcBtn.addEventListener('click', () => this.handleCalculate());
        }

        // Toggle advanced section
        const advancedToggle = el('rp-advanced-toggle');
        const advancedSection = el('rp-advanced-section');
        if (advancedToggle && advancedSection) {
            advancedToggle.addEventListener('click', () => {
                const isHidden = advancedSection.classList.toggle('hidden');
                advancedToggle.textContent = isHidden ? 'Show advanced options ▼' : 'Hide advanced options ▲';
            });
        }

        // Toggle overseas section
        const overseasToggle = el('rp-overseas-toggle');
        const overseasSection = el('rp-overseas-section');
        if (overseasToggle && overseasSection) {
            overseasToggle.addEventListener('click', () => {
                const isHidden = overseasSection.classList.toggle('hidden');
                overseasToggle.textContent = isHidden ? 'Show overseas comparison ▼' : 'Hide overseas comparison ▲';
            });
        }

        // Import banner buttons
        const importYes = el('rp-import-yes');
        if (importYes) {
            importYes.addEventListener('click', () => this.applyImportedScenario());
        }
        const importNo = el('rp-import-no');
        if (importNo) {
            importNo.addEventListener('click', () => hide('rp-import-banner'));
        }

        // Household type toggle
        const householdToggle = el('rp-household-type');
        if (householdToggle) {
            householdToggle.addEventListener('change', () => this.toggleCoupleFields());
        }

        // Homeowner toggle
        const homeToggle = el('rp-homeowner');
        if (homeToggle) {
            homeToggle.addEventListener('change', () => {
                const mortgageRow = el('rp-mortgage-row');
                if (mortgageRow) {
                    mortgageRow.classList.toggle('hidden', homeToggle.value !== 'yes');
                }
            });
        }

        // Disclaimer
        safeHtml('rp-disclaimer', DISCLAIMER_TEXT);
    }

    /**
     * Show/hide couple-specific fields based on household type.
     */
    toggleCoupleFields() {
        const householdEl = el('rp-household-type');
        const coupleSection = el('rp-couple-section');
        if (!householdEl || !coupleSection) return;
        const isCouple = householdEl.value === 'couple';
        coupleSection.classList.toggle('hidden', !isCouple);
    }

    /**
     * Show the import banner with data from the forward calculator.
     *
     * @param {object} scenario  Parsed forward calculator scenario
     */
    showImportBanner(scenario) {
        this._importedScenario = scenario;
        const banner = el('rp-import-banner');
        if (!banner) return;

        // Show summary of imported data
        const summaryEl = el('rp-import-summary');
        if (summaryEl && scenario) {
            const age = scenario.yourCurrentAge || scenario.age || '?';
            const salary = scenario.yourSalary || scenario.salary || 0;
            const super_ = scenario.yourCurrentSuper || scenario.superBal || 0;
            summaryEl.textContent = `Age ${age}, salary ${fmt(salary)}, super ${fmt(super_)}`;
        }

        banner.classList.remove('hidden');
    }

    /**
     * Apply the imported forward calculator scenario to the form fields.
     */
    applyImportedScenario() {
        const scenario = this._importedScenario;
        if (!scenario) return;

        const setVal = (id, value) => {
            const elem = el(id);
            if (elem && value !== undefined && value !== null && value !== 0) {
                elem.value = value;
            }
        };

        setVal('rp-current-age', scenario.yourCurrentAge || scenario.age);
        setVal('rp-retirement-age', scenario.retirementAge || scenario.retireAge || 67);
        setVal('rp-annual-salary', scenario.yourSalary || scenario.salary);
        setVal('rp-super-balance', scenario.yourCurrentSuper || scenario.superBal);
        setVal('rp-mortgage-balance', scenario.mortgageBalance || scenario.mortgage);
        setVal('rp-monthly-mortgage', scenario.monthlyMortgagePayment);

        if (scenario.homeowner !== undefined) {
            const homeEl = el('rp-homeowner');
            if (homeEl) homeEl.value = scenario.homeowner ? 'yes' : 'no';
        }

        if (scenario.isCouple || scenario.household === 'couple') {
            const householdEl = el('rp-household-type');
            if (householdEl) {
                householdEl.value = 'couple';
                this.toggleCoupleFields();
            }
        }

        hide('rp-import-banner');
        show('rp-import-applied-notice');
    }

    /**
     * Collect simple mode inputs from the form.
     *
     * @returns {{ inputs: object, target: object }}
     */
    collectSimpleInputs() {
        const numVal = (id, fallback = 0) => {
            const elem = el(id);
            const n = Number(elem?.value ?? fallback);
            return Number.isFinite(n) ? n : fallback;
        };
        const strVal = (id, fallback = '') => el(id)?.value ?? fallback;
        const pctVal = (id, fallback = 0) => {
            const n = numVal(id, fallback);
            return Math.abs(n) > 1 ? n / 100 : n;
        };

        const householdType = strVal('rp-household-type', 'single');
        const isCouple = householdType === 'couple';

        const inputs = {
            currentAge: numVal('rp-current-age', 50),
            retirementAge: numVal('rp-retirement-age', 67),
            annualSalary: numVal('rp-annual-salary'),
            currentSuperBalance: numVal('rp-super-balance'),
            homeowner: strVal('rp-homeowner', 'yes') === 'yes',
            mortgageBalance: numVal('rp-mortgage-balance'),
            monthlyMortgagePayment: numVal('rp-monthly-mortgage'),
            householdType,
            isCouple,
            lifespan: numVal('rp-lifespan', 90),
        };

        // Couple fields
        if (isCouple) {
            inputs.partnerSalary = numVal('rp-partner-salary');
            inputs.partnerSuperBalance = numVal('rp-partner-super');
        }

        const targetIncomeToday = numVal('rp-desired-income', 73000);
        const confidenceStr = strVal('rp-confidence', '80');
        const confidenceTarget = Number(confidenceStr) / 100;
        const includeAgePension = strVal('rp-include-age-pension', 'yes') === 'yes';

        const target = {
            targetAnnualIncomeToday: targetIncomeToday,
            retirementAge: inputs.retirementAge,
            currentAge: inputs.currentAge,
            successProbabilityTarget: confidenceTarget,
            minimumEstateToday: 0,
            includeAgePension,
            householdType,
            lifespan: inputs.lifespan,
        };

        return { inputs, target };
    }

    /**
     * Collect advanced inputs (extends simple inputs).
     *
     * @returns {{ inputs: object, target: object }}
     */
    collectAdvancedInputs() {
        const { inputs, target } = this.collectSimpleInputs();
        const numVal = (id, fallback = 0) => {
            const elem = el(id);
            const n = Number(elem?.value ?? fallback);
            return Number.isFinite(n) ? n : fallback;
        };
        const pctVal = (id, fallback = 0) => {
            const n = numVal(id, fallback);
            return Math.abs(n) > 1 ? n / 100 : n;
        };

        return {
            inputs: {
                ...inputs,
                // Advanced fields
                monthlyInvestment: numVal('rp-monthly-investment'),
                hasInvestmentProperty: el('rp-has-property')?.checked || false,
                weeklyRentalIncome: numVal('rp-weekly-rent'),
                investmentReturn: pctVal('rp-investment-return', 7),
                superReturn: pctVal('rp-super-return', 7.5),
                inflation: pctVal('rp-inflation', 2.6),
                salaryGrowthRate: pctVal('rp-salary-growth', 2),
            },
            target: {
                ...target,
                minimumEstateToday: numVal('rp-min-estate'),
                swr: pctVal('rp-swr', 4),
            }
        };
    }

    /**
     * Handle the Calculate button click.
     */
    async handleCalculate() {
        if (this.isCalculating) return;
        this.isCalculating = true;

        const calcBtn = el('rp-calculate-btn');
        if (calcBtn) {
            calcBtn.disabled = true;
            calcBtn.textContent = 'Calculating…';
        }

        // Show loading state
        show('rp-loading');
        hide('rp-results-section');
        hide('rp-error-section');

        try {
            const { inputs, target } = this.collectAdvancedInputs();
            const result = await this.planner.solve(inputs, target, { includeOverseas: true });

            this.lastResult = result;
            this.renderResults(result);
            this.renderOverseasComparison(result);

            show('rp-results-section');
        } catch (err) {
            console.error('Reverse planner error:', err);
            safeText('rp-error-message', err.message || 'An unexpected error occurred. Please check your inputs.');
            show('rp-error-section');
        } finally {
            hide('rp-loading');
            this.isCalculating = false;
            if (calcBtn) {
                calcBtn.disabled = false;
                calcBtn.textContent = 'Calculate my path';
            }
        }
    }

    /**
     * Render the main results section.
     *
     * @param {object} result  Result from ReversePlanner.solve()
     */
    renderResults(result) {
        const { target, currentPath, top3Actions, rankedLevers, summary } = result;
        const plainEnglish = generatePlainEnglishSummary(result);

        // Headline
        safeHtml('rp-headline', plainEnglish.headline);

        // Goal summary
        safeText('rp-goal-today', fmt(target.targetAnnualIncomeToday) + '/year');
        const ytr = currentPath.yearsToRetirement;
        const nominalTarget = target.targetAnnualIncomeToday *
            Math.pow(1 + currentPath.inflationRate, ytr);
        safeText('rp-goal-nominal', `≈ ${fmt(nominalTarget)}/year in ${new Date().getFullYear() + ytr} dollars`);
        safeText('rp-goal-retire-age', `Age ${target.retirementAge}`);
        safeText('rp-goal-lifespan', `Plan to age ${target.lifespan}`);

        // Current path
        safeText('rp-current-income', fmt(currentPath.sustainableIncomeToday) + '/year');
        safeText('rp-current-assets', fmt(currentPath.totalAssetsNominal));

        // Gap analysis
        const meetsGoal = currentPath.meetsGoal;
        const statusEl = el('rp-goal-status');
        if (statusEl) {
            statusEl.textContent = meetsGoal ? 'On track' : 'Shortfall';
            statusEl.className = meetsGoal
                ? 'rp-status-badge rp-status-ok'
                : 'rp-status-badge rp-status-gap';
        }

        safeText('rp-income-gap', meetsGoal ? '—' : fmt(currentPath.incomeGap) + '/year shortfall');
        safeText('rp-capital-gap', meetsGoal ? '—' : fmt(currentPath.capitalGap) + ' capital shortfall');
        safeText('rp-gap-text', plainEnglish.gapText);

        // Top 3 actions table
        this._renderActionsTable(top3Actions);

        // All levers (detailed)
        this._renderAllLevers(rankedLevers);

        // Assumptions
        const assumptions = generateAssumptionsText(target, result.inputs);
        const assumEl = el('rp-assumptions-list');
        if (assumEl) {
            assumEl.innerHTML = assumptions.map(a => `<li>${a}</li>`).join('');
        }

        // Caution note
        if (plainEnglish.cautionText) {
            safeText('rp-pattern-note', plainEnglish.cautionText);
            show('rp-pattern-note-section');
        } else {
            hide('rp-pattern-note-section');
        }
    }

    /**
     * Render the top 3 actions table.
     *
     * @param {Array} actions  Top 3 lever results
     */
    _renderActionsTable(actions) {
        const tbody = el('rp-actions-tbody');
        if (!tbody) return;

        if (actions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="rp-no-actions">No single lever can bridge the gap — a combination of changes or professional advice is recommended.</td></tr>';
            return;
        }

        tbody.innerHTML = actions.map((lever, i) => `
            <tr class="rp-action-row">
                <td class="rp-action-rank">${i + 1}</td>
                <td class="rp-action-label">${lever.label}</td>
                <td class="rp-action-desc">${lever.description}</td>
            </tr>
        `).join('');
    }

    /**
     * Render all levers in a collapsed details section.
     *
     * @param {Array} allLevers  All lever results from solver
     */
    _renderAllLevers(allLevers) {
        const container = el('rp-all-levers');
        if (!container) return;

        const feasible = allLevers.filter(l => l.feasible);
        const infeasible = allLevers.filter(l => !l.feasible);

        const renderGroup = (levers, title) => {
            if (levers.length === 0) return '';
            const rows = levers.map(lever => `
                <div class="rp-lever-item ${lever.feasible ? 'rp-lever-feasible' : 'rp-lever-infeasible'}">
                    <span class="rp-lever-status">${lever.feasible ? '✓' : '✗'}</span>
                    <div class="rp-lever-content">
                        <strong>${lever.label}</strong>
                        <span class="rp-lever-desc">${formatLeverAsAction(lever)}</span>
                    </div>
                </div>
            `).join('');
            return `<div class="rp-lever-group"><h4>${title}</h4>${rows}</div>`;
        };

        container.innerHTML =
            renderGroup(feasible, 'Feasible levers') +
            renderGroup(infeasible, 'Levers that cannot bridge the gap alone');
    }

    /**
     * Render the overseas comparison section.
     *
     * @param {object} result  Result from ReversePlanner.solve()
     */
    renderOverseasComparison(result) {
        const { overseasComparison } = result;
        if (!overseasComparison) return;

        const container = el('rp-overseas-cards');
        if (!container) return;

        const targetAUD = result.target.targetAnnualIncomeToday;

        container.innerHTML = overseasComparison.map(country => {
            const saving = targetAUD - country.adjustedTargetAUD;
            const savingClass = saving > 0 ? 'rp-overseas-saving' : 'rp-overseas-more-expensive';
            const savingText = saving > 0
                ? `Save ${fmt(saving)}/year vs Australia`
                : `${fmt(-saving)}/year more than Australia`;

            const agreementBadge = country.socialSecurityAgreement
                ? '<span class="rp-badge rp-badge-green">Pension agreement</span>'
                : '<span class="rp-badge rp-badge-grey">No pension agreement</span>';

            return `
                <div class="rp-overseas-card">
                    <div class="rp-overseas-header">
                        <h4>${country.name}</h4>
                        <span class="rp-overseas-region">${country.region}</span>
                    </div>
                    <div class="rp-overseas-target">
                        Target income: <strong>${fmt(country.adjustedTargetAUD)}/year AUD</strong>
                    </div>
                    <div class="rp-overseas-breakdown">
                        <span>Cost index: ${(country.costIndex * 100).toFixed(0)}% of Australia</span>
                        ${country.healthInsuranceAnnual > 0
                            ? `<span>+ ${fmt(country.healthInsuranceAnnual)}/year health insurance</span>`
                            : ''}
                        <span>+ ${fmt(country.fxBuffer)}/year FX buffer</span>
                    </div>
                    <div class="${savingClass}">${savingText}</div>
                    ${agreementBadge}
                </div>
            `;
        }).join('');
    }
}

// ---------------------------------------------------------------------------
// Auto-init when module is loaded as entry point
// ---------------------------------------------------------------------------

if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        const ui = new ReverseUI();
        ui.init();
        // Expose for debugging
        window._reverseUI = ui;
    });
}
