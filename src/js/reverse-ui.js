/**
 * reverse-ui.js - UI controller for the Reverse Retirement Planner page
 *
 * Responsibilities:
 *  1. Baseline import from forward calculator (localStorage bridge)
 *  2. Target goal collection
 *  3. Rendering comparison tables, problem flags, action plans
 *  4. Scenario comparison cards and overseas comparison
 */

import '../css/redesign.css';
import { ReversePlanner } from './reverse-planner.js';
import {
    importForwardScenario,
    buildReverseBaselineFromForwardScenario,
} from './reverse-baseline-adapter.js';
import {
    compareCurrentToTarget,
    buildComparisonTable,
} from './reverse-gap-analysis.js';
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
        this.baseline = null;
        this.manualInput = false;
        this.importedScenario = null;
    }

    /**
     * Initialise the UI: import baseline, attach event listeners.
     */
    init() {
        this.checkLocalStorageForImport();

        // Calculate button
        const calcBtn = el('rp-calculate-btn');
        if (calcBtn) {
            calcBtn.addEventListener('click', () => this.handleCalculate());
        }

        // Manual fallback toggle
        const showManual = el('rp-show-manual-fallback');
        if (showManual) {
            showManual.addEventListener('click', () => {
                this.manualInput = true;
                show('rp-manual-fallback-section');
                hide('rp-baseline-not-found');
            });
        }

        // Household type toggle (manual mode)
        const householdToggle = el('rp-household-type');
        if (householdToggle) {
            householdToggle.addEventListener('change', () => this.toggleCoupleFields());
        }

        // Homeowner toggle (manual mode)
        const homeToggle = el('rp-homeowner');
        if (homeToggle) {
            homeToggle.addEventListener('change', () => {
                const mortgageRow = el('rp-mortgage-row');
                if (mortgageRow) {
                    mortgageRow.classList.toggle('hidden', homeToggle.value !== 'yes');
                }
            });
        }

        // Baseline import buttons
        const useBaseline = el('rp-use-baseline');
        if (useBaseline) {
            useBaseline.addEventListener('click', () => this.applyBaselineImport());
        }

        const refreshBaseline = el('rp-refresh-baseline');
        if (refreshBaseline) {
            refreshBaseline.addEventListener('click', () => this.refreshBaseline());
        }

        // Disclaimer
        safeHtml('rp-disclaimer', DISCLAIMER_TEXT);

        // Accordion sections — single-open behaviour
        this._initAccordion();
    }

    /**
     * Initialise accordion sections (single-open).
     */
    _initAccordion() {
        document.querySelectorAll('.section').forEach((section) => {
            const isOpen = section.classList.contains('open');
            section.classList.toggle('open', isOpen);
            const body = section.querySelector('.section-body');
            if (body) body.hidden = !isOpen;
        });

        document.querySelectorAll('.section-head').forEach((head) => {
            head.addEventListener('click', () => {
                const section = head.closest('.section');
                const wasOpen = section.classList.contains('open');
                document.querySelectorAll('.section').forEach((s) => {
                    s.classList.remove('open');
                    const b = s.querySelector('.section-body');
                    if (b) b.hidden = true;
                });
                if (!wasOpen) {
                    section.classList.add('open');
                    const body = section.querySelector('.section-body');
                    if (body) body.hidden = false;
                }
            });
        });
    }

    /**
     * Check localStorage for forward calculator data and render baseline panel.
     */
    checkLocalStorageForImport() {
        const baseline = importForwardScenario();

        if (baseline && baseline.exists) {
            this.baseline = baseline;
            this.renderBaselineImportPanel(baseline);
        } else {
            // No data found — show manual option
            show('rp-baseline-not-found');
            hide('rp-baseline-found');
            safeText('rp-baseline-source-name', 'No data');
        }
    }

    /**
     * Render the baseline import panel with a summary of imported data.
     *
     * @param {object} baseline  Canonical baseline from buildReverseBaselineFromForwardScenario()
     */
    renderBaselineImportPanel(baseline) {
        if (!baseline || !baseline.exists) {
            show('rp-baseline-not-found');
            hide('rp-baseline-found');
            return;
        }

        show('rp-baseline-found');
        hide('rp-baseline-not-found');

        const sourceName = baseline.source === 'advanced-v2' ? 'Advanced Calculator v2' : 'Advanced Calculator';
        safeText('rp-baseline-source-name', sourceName + ' · imported ' + new Date(baseline.importedAt).toLocaleString('en-AU'));

        // Summary
        safeHtml('rp-baseline-summary', baseline.displaySummary);

        // Warnings
        if (baseline.warnings && baseline.warnings.length > 0) {
            show('rp-baseline-warnings');
            safeHtml('rp-baseline-warnings', baseline.warnings.map(w => '⚠ ' + w).join('<br>'));
        } else {
            hide('rp-baseline-warnings');
        }
    }

    /**
     * Apply the baseline import — fill the collected input for calculation.
     */
    applyBaselineImport() {
        if (!this.baseline) return;
        this._populateFromBaseline(this.baseline);
    }

    /**
     * Refresh baseline from localStorage.
     */
    refreshBaseline() {
        const baseline = importForwardScenario();
        if (baseline && baseline.exists) {
            this.baseline = baseline;
            this.renderBaselineImportPanel(baseline);
        }
    }

    /**
     * Populate internal state from a baseline object.
     */
    _populateFromBaseline(baseline) {
        this.importedScenario = baseline.inputs;
    }

    /**
     * Show/hide couple-specific fields.
     */
    toggleCoupleFields() {
        const householdEl = el('rp-household-type');
        const coupleSection = el('rp-couple-section');
        if (!householdEl || !coupleSection) return;
        const isCouple = householdEl.value === 'couple';
        coupleSection.classList.toggle('hidden', !isCouple);
    }

    /**
     * Collect inputs from either the baseline import or manual fallback form.
     *
     * @returns {{ inputs: object, target: object }}
     */
    collectInputs() {
        const numVal = (id, fallback = 0) => {
            const elem = el(id);
            const n = Number(elem?.value ?? fallback);
            return Number.isFinite(n) ? n : fallback;
        };
        const strVal = (id, fallback = '') => el(id)?.value ?? fallback;

        // If we have an imported baseline, use it as the primary source
        if (this.importedScenario) {
            return this._collectFromBaseline();
        }

        // Otherwise collect from manual form
        return this._collectFromManualForm(numVal, strVal);
    }

    /**
     * Build inputs from the imported baseline scenario.
     */
    _collectFromBaseline() {
        const i = this.importedScenario;
        const numVal = (id, fallback = 0) => {
            const elem = el(id);
            const n = Number(elem?.value ?? fallback);
            return Number.isFinite(n) ? n : fallback;
        };
        const strVal = (id, fallback = '') => el(id)?.value ?? fallback;
        
        const targetIncome = numVal('rp-desired-income', 80000);
        const confidenceStr = strVal('rp-confidence', '80');
        const confidenceTarget = Number(confidenceStr) / 100;
        const includeAgePension = strVal('rp-include-age-pension', 'yes') === 'yes';
        const lifespan = numVal('rp-lifespan', 90);
        const minEstate = numVal('rp-min-estate', 0);

        const inputs = {
            currentAge: i.currentAge,
            retirementAge: i.retirementAge,
            annualSalary: i.annualSalary,
            currentSuperBalance: i.currentSuperBalance,
            salarySacrifice: i.salarySacrifice || 0,
            homeowner: i.homeowner,
            mortgageBalance: i.mortgageBalance,
            monthlyMortgagePayment: i.monthlyMortgagePayment,
            householdType: i.isCouple ? 'couple' : 'single',
            isCouple: i.isCouple,
            lifespan: lifespan || i.lifespan,
            partnerSalary: i.partnerSalary || 0,
            partnerSuperBalance: i.partnerCurrentSuper || 0,
            cashSavings: i.cashSavings,
            stocksPortfolio: i.stocksPortfolio,
            monthlyInvestment: i.monthlyInvestment || 0,
            hasInvestmentProperty: i.hasInvestmentProperty || false,
            weeklyRentalIncome: i.weeklyRentalIncome || 0,
            investmentPropertyValue: i.investmentPropertyValue || 0,
            annualPropertyExpenses: i.annualPropertyExpenses || 0,
            propertyGrowthRate: i.propertyGrowthRate || 0.04,
            inflation: i.inflation || 0.026,
            investmentReturn: i.investmentReturn || 0.07,
            superReturn: i.superReturn || 0.075,
            salaryGrowthRate: i.salaryGrowthRate || 0.02,
            homeValue: i.homeValue || 0,
        };

        const target = {
            targetAnnualIncomeToday: targetIncome,
            retirementAge: i.retirementAge,
            currentAge: i.currentAge,
            successProbabilityTarget: confidenceTarget,
            minimumEstateToday: minEstate,
            includeAgePension,
            householdType: i.isCouple ? 'couple' : 'single',
            lifespan: lifespan || i.lifespan,
        };

        return { inputs, target };
    }

    /**
     * Build inputs from manual fallback form fields.
     */
    _collectFromManualForm(numVal, strVal) {
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
            cashSavings: 0,
            stocksPortfolio: 0,
            monthlyInvestment: numVal('rp-monthly-investment'),
            hasInvestmentProperty: el('rp-has-property')?.checked || false,
            weeklyRentalIncome: numVal('rp-weekly-rent'),
            investmentPropertyValue: 0,
            annualPropertyExpenses: 0,
            propertyGrowthRate: 0.04,
            inflation: pctVal('rp-inflation', 2.6),
            investmentReturn: pctVal('rp-investment-return', 7),
            superReturn: pctVal('rp-super-return', 7.5),
            salaryGrowthRate: pctVal('rp-salary-growth', 2),
            homeValue: 0,
        };

        if (isCouple) {
            inputs.partnerSalary = numVal('rp-partner-salary');
            inputs.partnerSuperBalance = numVal('rp-partner-super');
        }

        const targetIncome = numVal('rp-desired-income', 80000);
        const confidenceStr = strVal('rp-confidence', '80');
        const confidenceTarget = Number(confidenceStr) / 100;
        const includeAgePension = strVal('rp-include-age-pension', 'yes') === 'yes';
        const minEstate = numVal('rp-min-estate', 0);

        const target = {
            targetAnnualIncomeToday: targetIncome,
            retirementAge: inputs.retirementAge,
            currentAge: inputs.currentAge,
            successProbabilityTarget: confidenceTarget,
            minimumEstateToday: minEstate,
            includeAgePension,
            householdType,
            lifespan: inputs.lifespan,
        };

        return { inputs, target };
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

        show('rp-loading-overlay');
        hide('rp-results-section');
        hide('rp-error-section');

        try {
            const { inputs, target } = this.collectInputs();
            const result = await this.planner.solve(inputs, target, { includeOverseas: true });

            this.lastResult = result;

            // Run gap analysis
            const gap = compareCurrentToTarget(result.currentPath, result.target);

            // Render all panels
            this.renderResults(result);
            this.renderCurrentVsRequiredComparison(result, gap);
            this.renderProblemFlags(gap);
            this.renderRankedActionPlan(result);
            this.renderScenarioComparisonCards(result);
            this.renderOverseasComparison(result);

            show('rp-results-section');
        } catch (err) {
            console.error('Reverse planner error:', err);
            safeText('rp-error-message', err.message || 'An unexpected error occurred. Please check your inputs.');
            show('rp-error-section');
        } finally {
            hide('rp-loading-overlay');
            this.isCalculating = false;
            if (calcBtn) {
                calcBtn.disabled = false;
                calcBtn.textContent = 'Compare my current path to my retirement goal';
            }
        }
    }

    /**
     * Render the main results — headline, goal summary, current path, action intro, assumptions.
     */
    renderResults(result) {
        const { target, currentPath, top3Actions, summary } = result;
        const plainEnglish = generatePlainEnglishSummary(result);

        safeText('rp-headline', plainEnglish.headline);

        // Goal summary (today's dollars + nominal at retirement)
        const ytr = currentPath.yearsToRetirement;
        const nominalTarget = target.targetAnnualIncomeToday *
            Math.pow(1 + currentPath.inflationRate, ytr);
        safeText('rp-goal-today', fmt(target.targetAnnualIncomeToday) + '/year');
        safeText('rp-goal-nominal', `≈ ${fmt(nominalTarget)}/year in ${new Date().getFullYear() + ytr} dollars`);
        safeText('rp-goal-retire-age', `Age ${target.retirementAge}`);
        safeText('rp-goal-lifespan', `Age ${target.lifespan}`);

        // Current path
        safeText('rp-current-income', fmt(currentPath.sustainableIncomeToday) + '/year');
        safeText('rp-current-assets', fmt(currentPath.totalAssetsNominal));
        const statusEl = el('rp-goal-status');
        if (statusEl) {
            const meetsGoal = currentPath.meetsGoal;
            statusEl.textContent = meetsGoal ? 'On track' : 'Shortfall';
            const bg = meetsGoal ? 'var(--accent-soft)' : 'var(--rose-soft)';
            const fg = meetsGoal ? 'var(--accent-ink)' : 'var(--rose)';
            statusEl.style.background = bg;
            statusEl.style.color = fg;
        }

        show('rp-summary-section');

        // Action intro
        const actionIntro = el('rp-action-intro');
        if (actionIntro) {
            if (top3Actions.length > 0) {
                const gapLabel = currentPath.meetsGoal
                    ? `Your current plan meets your ${fmt(target.targetAnnualIncomeToday)}/year goal.`
                    : `You need to close a ${fmt(currentPath.incomeGap)}/year gap.`;
                actionIntro.textContent = gapLabel + ' Ranked actions from most feasible:';
            } else {
                actionIntro.textContent = 'No single lever can close the gap — a combination is needed.';
            }
        }

        // Assumptions
        const assumptions = generateAssumptionsText(target, result.inputs);
        const assumEl = el('rp-assumptions-list');
        if (assumEl) {
            assumEl.innerHTML = assumptions.map(a => `<li>${a}</li>`).join('');
        }

        // Pattern caution
        if (plainEnglish.cautionText) {
            safeText('rp-pattern-note', plainEnglish.cautionText);
            show('rp-pattern-note-section');
        } else {
            hide('rp-pattern-note-section');
        }
    }

    /**
     * Render the current vs required comparison table (Panel 3).
     */
    renderCurrentVsRequiredComparison(result, gap) {
        const tbody = el('rp-comp-tbody');
        if (!tbody) return;

        const rows = buildComparisonTable(gap, result.currentPath, result.target);
        tbody.innerHTML = rows.map(row => `
            <tr>
                <td><strong>${row.label}</strong></td>
                <td style="text-align:right">${row.current}</td>
                <td style="text-align:right">${row.required}</td>
                <td style="text-align:right;color:${row.hasGap ? 'var(--rose)' : 'var(--accent)'};font-weight:600">${row.gap}</td>
                <td style="font-size:12.5px;color:var(--ink-2)">${row.recommendedAction}</td>
            </tr>
        `).join('');
    }

    /**
     * Render problem detection flags (Panel 4).
     */
    renderProblemFlags(gap) {
        const panel = el('rp-problems-panel');
        const list = el('rp-problems-list');
        if (!panel || !list) return;

        if (!gap.problemFlags || gap.problemFlags.length === 0) {
            hide('rp-problems-panel');
            return;
        }

        show('rp-problems-panel');
        list.innerHTML = gap.problemFlags.map(p => {
            const sevColors = {
                high: 'var(--rose)',
                medium: 'var(--amber)',
                low: 'var(--accent)',
            };
            const bgColors = {
                high: 'var(--rose-soft)',
                medium: 'var(--amber-soft)',
                low: 'var(--accent-soft)',
            };
            return `
            <div style="display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border-radius:12px;background:${bgColors[p.severity] || 'var(--surface-2)'};border-color:${sevColors[p.severity] || 'var(--border)'}">
                <span style="font-size:16px;flex-shrink:0">${p.severity === 'high' ? '🔴' : p.severity === 'medium' ? '🟡' : '🔵'}</span>
                <div>
                    <strong style="color:var(--ink)">${p.label}</strong>
                    <div style="font-size:12.5px;color:var(--ink-2);margin-top:2px">${p.detail}</div>
                </div>
            </div>
            `;
        }).join('');
    }

    /**
     * Render ranked action plan (Panel 5).
     */
    renderRankedActionPlan(result) {
        const { top3Actions, rankedLevers } = result;

        // Top 3 actions table
        this._renderActionsTable(top3Actions);

        // All levers detail
        this._renderAllLevers(rankedLevers);
    }

    /**
     * Render scenario comparison cards (Panel 6).
     */
    renderScenarioComparisonCards(result) {
        const container = el('rp-scenario-cards');
        if (!container) return;

        const { target, currentPath } = result;

        const scenarios = this._buildScenarios(result);

        if (scenarios.length === 0) {
            container.innerHTML = '<p class="text-sm text-gray-500">Scenario comparison available after calculation.</p>';
            return;
        }

        container.innerHTML = scenarios.map(s => `
            <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px">
                <h4 style="margin:0;font-size:14px;font-weight:700;color:var(--ink)">${s.label}</h4>
                <div style="font-size:12px;color:var(--ink-3);margin-top:4px">${s.description}</div>
                <div style="margin-top:8px;display:flex;align-items:baseline;gap:6px">
                    <span style="font-weight:600;color:var(--ink);font-size:14px">${s.income}</span>
                    <span style="color:var(--ink-3)">·</span>
                    <span style="color:${s.isBest ? 'var(--accent)' : 'var(--ink-2)'};font-weight:${s.isBest ? '600' : '400'};font-size:12px">${s.status}</span>
                </div>
                ${s.detail ? `<div style="font-size:11.5px;color:var(--ink-3);margin-top:4px">${s.detail}</div>` : ''}
            </div>
        `).join('');
    }

    /**
     * Build scenario data for comparison cards.
     */
    _buildScenarios(result) {
        const { target, currentPath, top3Actions, rankedLevers } = result;
        const scenarios = [];

        // Current path
        scenarios.push({
            label: 'Current path',
            description: 'Do nothing — continue as planned',
            income: fmt(currentPath.sustainableIncomeToday) + '/yr',
            status: currentPath.meetsGoal ? 'Meets goal' : 'Shortfall',
            isBest: false,
            detail: currentPath.meetsGoal ? '' : `Gap of ${fmt(currentPath.incomeGap)}/yr`,
        });

        // Meet target (use best feasible lever)
        const bestLever = top3Actions[0];
        if (bestLever && bestLever.feasible) {
            scenarios.push({
                label: 'Meet target',
                description: bestLever.label,
                income: fmt(target.targetAnnualIncomeToday) + '/yr',
                status: 'Goal achieved',
                isBest: true,
                detail: bestLever.description,
            });
        }

        // Retire later path
        const retireLever = rankedLevers.find(l => l.lever === 'retirementAge' && l.feasible);
        if (retireLever) {
            scenarios.push({
                label: 'Retire later',
                description: `Retire at age ${retireLever.solved}`,
                income: fmt(target.targetAnnualIncomeToday) + '/yr',
                status: 'Goal achieved',
                isBest: false,
                detail: `${retireLever.value} year${retireLever.value !== 1 ? 's' : ''} later`,
            });
        }

        // Super boost
        const superLever = rankedLevers.find(l => l.lever === 'extraAnnualSuper' && l.feasible);
        if (superLever) {
            scenarios.push({
                label: 'Super boost',
                description: 'Extra salary sacrifice',
                income: fmt(target.targetAnnualIncomeToday) + '/yr',
                status: 'Goal achieved',
                isBest: false,
                detail: `Save ${fmt(superLever.value)}/year extra`,
            });
        }

        // Mortgage-free path
        const mortgageLever = rankedLevers.find(l => l.lever === 'mortgageRepayment');
        if (mortgageLever && mortgageLever.feasible) {
            scenarios.push({
                label: 'Mortgage-free retirement',
                description: 'Clear mortgage before retirement',
                income: fmt(target.targetAnnualIncomeToday) + '/yr',
                status: mortgageLever.feasible ? 'Improves cashflow' : 'N/A',
                isBest: false,
                detail: mortgageLever.description,
            });
        }

        // Reduce target
        const spendLever = rankedLevers.find(l => l.lever === 'spendingReduction' && l.feasible);
        if (spendLever) {
            scenarios.push({
                label: 'Reduce target',
                description: 'Lower retirement spending goal',
                income: fmt(spendLever.solved) + '/yr',
                status: 'Adjusted goal',
                isBest: false,
                detail: `Target reduced by ${fmt(spendLever.value)}/yr`,
            });
        }

        return scenarios;
    }

    /**
     * Render the top 3 actions table.
     */
    _renderActionsTable(actions) {
        const tbody = el('rp-actions-tbody');
        if (!tbody) return;

        if (actions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="rp-no-actions">No single lever can bridge the gap — a combination of changes or professional advice is recommended.</td></tr>';
            return;
        }

        tbody.innerHTML = actions.map((lever, i) => `
            <tr>
                <td style="font-family:var(--font-mono);color:var(--ink-3);font-size:11px">${i + 1}</td>
                <td style="font-weight:600;color:var(--ink);font-size:13px">${lever.label}</td>
                <td style="color:var(--ink-2);font-size:12.5px">${lever.description}</td>
            </tr>
        `).join('');
    }

    /**
     * Render all levers in a collapsed details section.
     */
    _renderAllLevers(allLevers) {
        const container = el('rp-all-levers');
        if (!container) return;

        const feasible = allLevers.filter(l => l.feasible);
        const infeasible = allLevers.filter(l => !l.feasible);

        const renderGroup = (levers, title) => {
            if (levers.length === 0) return '';
            const rows = levers.map(lever => {
                const bg = lever.feasible ? 'var(--accent-soft)' : 'var(--surface-2)';
                const bd = lever.feasible ? 'var(--accent)' : 'var(--border)';
                return `
                <div style="display:flex;gap:10px;padding:10px 12px;border-radius:8px;background:${bg};border:1px solid ${bd};margin-bottom:6px">
                    <span style="flex-shrink:0;font-size:14px;color:${lever.feasible ? 'var(--accent-ink)' : 'var(--ink-3)'}">${lever.feasible ? '✓' : '✗'}</span>
                    <div style="display:flex;flex-direction:column;gap:2px">
                        <strong style="font-size:13px;color:var(--ink)">${lever.label}</strong>
                        <span style="font-size:12px;color:var(--ink-2)">${formatLeverAsAction(lever)}</span>
                    </div>
                </div>
                `;
            }).join('');
            return `<div style="margin-bottom:12px"><h4 style="font-size:11.5px;text-transform:uppercase;letter-spacing:0.05em;color:var(--ink-3);font-weight:600;margin:0 0 6px">${title}</h4>${rows}</div>`;
        };

        container.innerHTML =
            renderGroup(feasible, 'Feasible levers') +
            renderGroup(infeasible, 'Levers that cannot bridge the gap alone');
    }

    /**
     * Render the overseas comparison section.
     */
    renderOverseasComparison(result) {
        const { overseasComparison } = result;
        if (!overseasComparison) return;

        const container = el('rp-overseas-cards');
        if (!container) return;

        const targetAUD = result.target.targetAnnualIncomeToday;

        container.innerHTML = overseasComparison.map(country => {
            const saving = targetAUD - country.adjustedTargetAUD;
            const savingColor = saving > 0 ? 'var(--accent)' : 'var(--rose)';
            const savingText = saving > 0
                ? `Save ${fmt(saving)}/year vs Australia`
                : `${fmt(-saving)}/year more than Australia`;

            const agreementBadge = country.socialSecurityAgreement
                ? `<span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600;background:var(--accent-soft);color:var(--accent-ink);margin-top:8px">Pension agreement</span>`
                : `<span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600;background:var(--surface-3);color:var(--ink-3);margin-top:8px">No pension agreement</span>`;

            return `
                <div style="background:var(--surface);border:1px solid var(--border);border-radius:10px;padding:14px">
                    <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px">
                        <h4 style="margin:0;font-size:14px;font-weight:700;color:var(--ink)">${country.name}</h4>
                        <span style="font-size:11px;color:var(--ink-3)">${country.region}</span>
                    </div>
                    <div style="font-size:13px;color:var(--ink);margin-bottom:6px">
                        Target income: <strong>${fmt(country.adjustedTargetAUD)}/year AUD</strong>
                    </div>
                    <div style="font-size:11.5px;color:var(--ink-2);display:flex;flex-direction:column;gap:2px;margin-bottom:6px">
                        <span>Cost index: ${(country.costIndex * 100).toFixed(0)}% of Australia</span>
                        ${country.healthInsuranceAnnual > 0
                            ? `<span>+ ${fmt(country.healthInsuranceAnnual)}/year health insurance</span>`
                            : ''}
                        <span>+ ${fmt(country.fxBuffer)}/year FX buffer</span>
                    </div>
                    <div style="color:${savingColor};font-weight:600;font-size:12px">${savingText}</div>
                    ${agreementBadge}
                </div>
            `;
        }).join('');
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function numValFromId(id, fallback) {
    const elem = el(id);
    const n = Number(elem?.value ?? fallback);
    return Number.isFinite(n) ? n : fallback;
}

function strValFromId(id, fallback) {
    return el(id)?.value ?? fallback;
}

// ---------------------------------------------------------------------------
// Auto-init when module is loaded as entry point
// ---------------------------------------------------------------------------

if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        const ui = new ReverseUI();
        ui.init();
        window._reverseUI = ui;
    });
}
