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
import '../css/site-chrome.css';
import './site-chrome.js';
import { ReversePlanner } from './reverse-planner.js';
import {
    importForwardScenario,
    buildReverseBaselineFromForwardScenario,
} from './reverse-baseline-adapter.js';
import {
    loadForwardProjection,
    extractCurrentPathFromProjection,
} from './forward-projection-bridge.js';
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
import {
    calculateRetirementAgeSalaryCurve,
    calculateRequiredCurrentValues,
    calculateSalaryReductionTolerance,
    calculateOptimalOverseasAge,
} from './reverse-deep-analysis.js';

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
        this.lastCalculationHash = null; // dirty-flag
    }

    /**
     * Execute a render function with error isolation.
     * If the render throws, the error is logged and execution continues
     * so a single broken panel never blanks the entire results section.
     */
    _renderSafe(fn) {
        try {
            fn();
        } catch (err) {
            console.error('ReverseUI render error (isolated):', err);
        }
    }

    /**
     * Initialise the UI: import baseline, attach event listeners.
     */
    init() {
        this.checkProjectionFirst();

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
            householdToggle.addEventListener('click', () => {
                setTimeout(() => this.toggleCoupleFields(), 0);
            });
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

        // PDF export button
        const pdfBtn = el('rp-export-pdf');
        if (pdfBtn) {
            pdfBtn.addEventListener('click', () => this.handlePdfExport());
        }

        // Disclaimer
        safeHtml('rp-disclaimer', DISCLAIMER_TEXT);

        // Accordion sections — single-open behaviour
        this._initAccordion();
    }

    /**
     * Check for complete forward projection first (rc_forward_projection_v1).
     * Fall back to legacy rc_forward_scenario adapter.
     */
    checkProjectionFirst() {
        const projection = loadForwardProjection();
        if (projection?.summary) {
            this.forwardProjection = projection;
            this.currentPath = extractCurrentPathFromProjection(projection);
            this.importedScenario = projection.input || null;
            this._renderProjectionPanel(projection);
            this._prefillGoalControlsFromProjection(projection);
            // Defer to end of microtask queue so the DOM is fully settled
            Promise.resolve().then(() => this.handleCalculate());
        } else {
            this.checkLocalStorageForImport();
        }
    }

    /**
     * Render the projection import panel showing the source calculator's results.
     */
    _renderProjectionPanel(projection) {
        show('rp-baseline-found');
        hide('rp-baseline-not-found');

        const sourceName = projection.source === 'advanced-v2' ? 'Advanced Calculator v2' : 'Advanced Calculator';
        const savedAt = projection.savedAt ? new Date(projection.savedAt).toLocaleString('en-AU') : 'recently';
        safeText('rp-baseline-source-name', sourceName + ' · ' + savedAt);

        const s = projection.summary;
        const summaryParts = [
            `Age ${s.currentAge}`,
            `Retire at ${s.retirementAge}`,
            `Income ${fmt(s.monthlyRetirementIncomeToday)}/month`,
            `Super ${fmt(s.superAtRetirementToday)}`,
            `Lasts to age ${s.lastsUntil}`,
        ];
        if (s.confidence) summaryParts.push(`Confidence ${(s.confidence * 100).toFixed(0)}%`);
        safeHtml('rp-baseline-summary', summaryParts.join(' · '));
    }

    /**
     * Pre-fill goal controls from the projection summary.
     */
    _prefillGoalControlsFromProjection(projection) {
        const s = projection.summary;
        const desiredIncome = el('rp-desired-income');
        if (desiredIncome && !desiredIncome.value) {
            desiredIncome.value = String(s.targetAnnualIncomeToday || Math.round(s.annualRetirementIncomeToday));
        }
        const retireAgeField = el('rp-retirement-age');
        if (retireAgeField && !retireAgeField.value) {
            retireAgeField.value = String(s.retirementAge || 67);
        }
        const confidenceField = el('rp-confidence');
        if (confidenceField && !confidenceField.value) {
            confidenceField.value = String(s.confidence ? Math.round(s.confidence * 100) : 80);
        }
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

            // Dirty-flag: skip if inputs haven't changed since last calculation
            const currentHash = JSON.stringify({ inputs, target });
            if (this.lastCalculationHash && currentHash === this.lastCalculationHash && this.lastResult) {
                this.isCalculating = false;
                if (calcBtn) {
                    calcBtn.disabled = false;
                    calcBtn.textContent = 'Compare my current path to my retirement goal';
                }
                hide('rp-loading-overlay');
                show('rp-results-section');
                // Brief "up to date" badge on the button
                if (calcBtn) {
                    const prev = calcBtn.textContent;
                    calcBtn.textContent = 'Results up to date — no changes detected';
                    setTimeout(() => { if (calcBtn) calcBtn.textContent = prev; }, 3000);
                }
                return;
            }

            const result = await this.planner.solve(inputs, target, { includeOverseas: true });

            this.lastResult = result;
            this.lastCalculationHash = currentHash;

            // Run gap analysis
            const gap = compareCurrentToTarget(result.currentPath, result.target);

            // Render all panels with individual error isolation so one failure
            // does not suppress downstream renders.
            this._renderSafe(() => this.renderResults(result));
            this._renderSafe(() => this.renderCurrentVsRequiredComparison(result, gap));
            this._renderSafe(() => this.renderProblemFlags(gap));
            this._renderSafe(() => this.renderWhatYouNeedToday(result));
            this._renderSafe(() => this.renderRankedActionPlan(result));
            this._renderSafe(() => this.renderScenarioComparisonCards(result));
            this._renderSafe(() => this.renderOverseasComparison(result));
            this._renderDeepAnalysisAsync(result).catch(e => {
                console.error('Deep analysis render error:', e);
            });

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
     * Export all results as a comprehensive PDF using jsPDF.
     */
    handlePdfExport() {
        if (!this.lastResult) {
            const btn = el('rp-export-pdf');
            if (btn) { btn.textContent = 'Run calculation first'; setTimeout(() => { btn.textContent = 'Export PDF Report'; }, 3000); }
            return;
        }

        if (typeof window.jspdf === 'undefined') {
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        const { target, currentPath, top3Actions, rankedLevers, inputs, summary } = this.lastResult;

        // Compute shared constants
        const ytr = Number.isFinite(currentPath.yearsToRetirement) && currentPath.yearsToRetirement >= 1
            ? Math.round(currentPath.yearsToRetirement)
            : Math.max(1, (target.retirementAge || 67) - (currentPath.currentAge || target.currentAge || 50));
        const INF = currentPath.inflationRate || 0.026;
        const RET_AGE = target.retirementAge ?? 67;
        const LIFESPAN = target.lifespan ?? 90;
        const SWR = currentPath.swr || 0.04;
        const RETIRE_YEAR = new Date().getFullYear() + ytr;
        const MEETS = currentPath.meetsGoal;

        const PAGE_W = 210;
        const MARGIN = 14;
        const CW = PAGE_W - MARGIN * 2;
        let y = 18;

        // Helpers
        const cur = (v) => '$' + Math.round(v || 0).toLocaleString('en-AU');
        const pct = (v) => (((v || 0) * 100).toFixed(1)) + '%';
        const num = (v) => Math.round(v || 0).toLocaleString('en-AU');

        function newPage() { doc.addPage(); y = 18; }
        function checkPage(need = 12) { if (y + need > 280) newPage(); }

        function setFont(size, style = 'normal', color = [30, 41, 59]) {
            doc.setFont('Helvetica', style);
            doc.setFontSize(size);
            if (Array.isArray(color)) doc.setTextColor(...color);
            else doc.setTextColor(color);
        }

        function text(str, x, yy, size, style, color) {
            setFont(size || 10, style || 'normal', color || [51, 65, 85]);
            doc.text(String(str), x, yy);
        }

        function heading(label, size = 12) {
            checkPage(10);
            setFont(size, 'bold', [15, 23, 42]);
            doc.text(label, MARGIN, y);
            y += size * 0.5 + 2;
            doc.setDrawColor(203, 213, 225);
            doc.line(MARGIN, y, PAGE_W - MARGIN, y);
            y += 5;
        }

        function bullet(label, value, indent = 0) {
            checkPage(7);
            setFont(9, 'normal', [71, 85, 105]);
            doc.text(label, MARGIN + indent, y);
            setFont(9, 'bold', [15, 23, 42]);
            doc.text(value, PAGE_W - MARGIN, y, { align: 'right' });
            y += 6;
        }

        function autoTable(head, body, opts = {}) {
            if (typeof doc.autoTable !== 'function') return;
            checkPage(20);
            doc.autoTable({
                startY: y,
                margin: { left: MARGIN, right: MARGIN },
                tableWidth: CW,
                headStyles: { fillColor: [15, 23, 42], fontSize: 8, fontStyle: 'bold', textColor: [255, 255, 255] },
                bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                ...opts,
                head: [head],
                body,
            });
            y = doc.lastAutoTable.finalY + 6;
        }

        function infoBox(lines, bgColor = [239, 246, 255], borderColor = [59, 130, 246]) {
            checkPage(lines.length * 6 + 8);
            const bh = lines.length * 6 + 6;
            doc.setFillColor(...bgColor);
            doc.setDrawColor(...borderColor);
            doc.roundedRect(MARGIN, y, CW, bh, 2, 2, 'FD');
            lines.forEach((line, i) => {
                setFont(8.5, i === 0 ? 'bold' : 'normal', [30, 64, 175]);
                doc.text(line, MARGIN + 4, y + 7 + i * 6);
            });
            y += bh + 5;
        }

        // ── PAGE 1: COVER + EXECUTIVE SUMMARY ───────────────────────────────

        // Header bar
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, PAGE_W, 28, 'F');
        setFont(16, 'bold', [255, 255, 255]);
        doc.text('Reverse Retirement Planner', MARGIN, 12);
        setFont(9, 'normal', [148, 163, 184]);
        doc.text('Goal-Gap Analysis & Action Plan', MARGIN, 20);
        setFont(8, 'normal', [148, 163, 184]);
        doc.text(`Generated ${new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}`, PAGE_W - MARGIN, 20, { align: 'right' });
        y = 36;

        // Status banner
        const bannerBg = MEETS ? [209, 250, 229] : [254, 226, 226];
        const bannerFg = MEETS ? [5, 150, 105] : [220, 38, 38];
        const bannerText = MEETS
            ? `ON TRACK: Your current plan supports ${cur(target.targetAnnualIncomeToday)}/year in retirement`
            : `SHORTFALL: ${cur(currentPath.incomeGap)}/year gap to your ${cur(target.targetAnnualIncomeToday)}/year retirement goal`;
        doc.setFillColor(...bannerBg);
        doc.rect(MARGIN, y, CW, 10, 'F');
        setFont(9, 'bold', bannerFg);
        doc.text(bannerText, PAGE_W / 2, y + 6.5, { align: 'center' });
        y += 16;

        // Two-column key metrics
        heading('Executive Summary', 11);
        const leftX = MARGIN;
        const rightX = PAGE_W / 2 + 2;
        const colW = CW / 2 - 4;

        function kv(label, value, x, yy, valColor = [15, 23, 42]) {
            setFont(7.5, 'normal', [100, 116, 139]);
            doc.text(label.toUpperCase(), x, yy);
            setFont(10, 'bold', valColor);
            doc.text(value, x, yy + 5);
        }

        kv('Your goal', cur(target.targetAnnualIncomeToday) + '/year', leftX, y);
        kv('Retire at', `Age ${RET_AGE} (${ytr} years away)`, rightX, y);
        y += 14;
        kv('Current sustainable income', cur(currentPath.sustainableIncomeToday) + '/year', leftX, y, MEETS ? [5, 150, 105] : [220, 38, 38]);
        kv('Plan to age', String(LIFESPAN), rightX, y);
        y += 14;
        const nominalAssets = currentPath.totalAssetsNominal || 0;
        const superAtRet = currentPath.superAtRetirement || currentPath.score?.superAtRetirement || 0;
        kv('Total assets at retirement', cur(nominalAssets) + ' (nominal)', leftX, y);
        kv('Super at retirement', cur(superAtRet), rightX, y);
        y += 14;
        const agePension = currentPath.agePensionNominal || 0;
        kv('Age Pension (at retirement)', cur(agePension) + '/year', leftX, y);
        kv('Capital required', cur(currentPath.requiredCapital), rightX, y);
        y += 18;

        // Gap callout if shortfall
        if (!MEETS) {
            const capGap = currentPath.capitalGap || 0;
            infoBox([
                `Capital shortfall: ${cur(capGap)} needs to be closed before age ${RET_AGE}`,
                `Income shortfall: ${cur(currentPath.incomeGap)}/year in today's dollars`,
                `Nominal target income in ${RETIRE_YEAR}: ${cur(target.targetAnnualIncomeToday * Math.pow(1 + INF, ytr))}/year`,
            ], [255, 237, 213], [234, 88, 12]);
        } else {
            infoBox([
                `Your current plan is projected to meet your retirement goal.`,
                `Continue current savings and review annually to maintain this position.`,
            ], [209, 250, 229], [5, 150, 105]);
        }

        // ── PAGE 1/2: CURRENT FINANCIAL SNAPSHOT ────────────────────────────
        heading('Your Current Financial Snapshot', 11);

        const inp = inputs || {};
        autoTable(
            ['Category', 'Detail', 'Value'],
            [
                ['Age & timing', 'Your current age', String(inp.yourCurrentAge || target.currentAge || '—')],
                ['Age & timing', 'Planned retirement age', `Age ${RET_AGE}`],
                ['Age & timing', 'Planning horizon', `Age ${LIFESPAN} (${LIFESPAN - (inp.yourCurrentAge || RET_AGE)} years in retirement)`],
                ['Age & timing', 'Household', target.householdType === 'couple' ? 'Couple' : 'Single'],
                ['Income', 'Your annual salary', cur(inp.yourSalary || inp.annualSalary)],
                inp.partnerSalary > 0 ? ['Income', 'Partner annual salary', cur(inp.partnerSalary)] : null,
                ['Income', 'Employer SG contribution', pct(inp.employerSuperContributionRate || 0.12) + ' of salary'],
                ['Income', 'Salary sacrifice (concessional)', cur(inp.yourAdditionalSuperContribution) + '/year'],
                ['Super', 'Your super balance today', cur(inp.yourCurrentSuper)],
                inp.partnerCurrentSuper > 0 ? ['Super', 'Partner super balance today', cur(inp.partnerCurrentSuper)] : null,
                ['Savings & investments', 'Cash savings', cur(inp.currentSavings)],
                ['Savings & investments', 'Shares / ETF portfolio', cur(inp.currentStocks)],
                ['Savings & investments', 'Monthly investment contribution', cur(inp.monthlyStockContribution) + '/month'],
                inp.homeValue > 0 ? ['Property', 'Home value', cur(inp.homeValue)] : null,
                inp.mortgageBalance > 0 ? ['Property', 'Mortgage balance', cur(inp.mortgageBalance)] : null,
                inp.mortgageBalance > 0 ? ['Property', 'Monthly mortgage payment', cur(inp.monthlyMortgagePayment) + '/month'] : null,
                inp.hasInvestmentProperty ? ['Property', 'Investment property value', cur(inp.investmentPropertyValue)] : null,
                inp.hasInvestmentProperty ? ['Property', 'Weekly rental income', cur(inp.weeklyRentalIncome) + '/week'] : null,
            ].filter(Boolean),
            {
                columnStyles: {
                    0: { fontStyle: 'bold', cellWidth: 45 },
                    1: { cellWidth: 80 },
                    2: { halign: 'right', cellWidth: 47 },
                },
            }
        );

        // ── PAGE 2: WHAT YOU NEED TO DO TODAY ───────────────────────────────
        checkPage(20);
        heading('What You Need to Do Today to Reach Your Goal', 11);

        setFont(8.5, 'normal', [71, 85, 105]);
        const introText = `To achieve ${cur(target.targetAnnualIncomeToday)}/year in retirement at age ${RET_AGE}, the table below shows ` +
            `the specific changes required TODAY. Each lever is independent — implementing any single feasible lever closes the gap.`;
        const splitIntro = doc.splitTextToSize(introText, CW);
        splitIntro.forEach(line => { doc.text(line, MARGIN, y); y += 5; });
        y += 3;

        const feasibleLevers = (rankedLevers || []).filter(l => l.feasible);
        const infeasibleLevers = (rankedLevers || []).filter(l => !l.feasible);

        // Maps solver lever key → formatted "current value" string for the PDF table.
        // Lever keys come from reverse-solver.js: extraAnnualSuper, salary, retirementAge,
        // superBalance, extraSavings, mortgageRepayment, netRent, homeValue,
        // investmentBalance, spendingReduction, estateAdjustment.
        function leverCurrentValue(lever, inp2) {
            switch (lever.lever) {
                case 'extraAnnualSuper':   return cur(inp2.yourAdditionalSuperContribution || 0) + '/yr';
                case 'salary':             return cur(inp2.yourSalary || inp2.annualSalary || 0) + '/yr';
                case 'retirementAge':      return `Age ${inp2.retirementAge || RET_AGE}`;
                case 'superBalance':       return cur(inp2.yourCurrentSuper || 0);
                case 'extraSavings':       return cur(inp2.monthlyStockContribution || 0) + '/mo';
                case 'mortgageRepayment':  return cur(inp2.monthlyMortgagePayment || 0) + '/mo';
                case 'netRent':            return cur(inp2.weeklyRentalIncome || 0) + '/week';
                case 'homeValue':          return cur(inp2.homeValue || 0);
                case 'investmentBalance':  return cur((inp2.currentStocks || 0) + (inp2.currentSavings || 0));
                case 'spendingReduction':  return cur(target.targetAnnualIncomeToday) + '/yr';
                case 'estateAdjustment':   return cur(target.minimumEstateToday || 0);
                default:                   return '—';
            }
        }

        function leverRequiredValue(lever) {
            if (lever.solved === null || lever.solved === undefined) return '—';
            switch (lever.lever) {
                case 'extraAnnualSuper':   return cur(lever.solved) + '/yr total';
                case 'salary':             return cur(lever.solved) + '/yr';
                case 'retirementAge':      return `Age ${Math.round(lever.solved)}`;
                case 'superBalance':       return cur(lever.solved);
                case 'extraSavings':       return cur(lever.solved) + '/mo';
                case 'mortgageRepayment':  return cur(lever.solved) + '/mo';
                case 'netRent':            return cur(lever.solved) + '/week';
                case 'homeValue':          return cur(lever.solved);
                case 'investmentBalance':  return cur(lever.solved);
                case 'spendingReduction':  return cur(lever.solved) + '/yr';
                case 'estateAdjustment':   return cur(lever.solved);
                default:                   return lever.value !== null && lever.value !== undefined ? cur(lever.value) : '—';
            }
        }

        function leverChangeNeeded(lever) {
            if (!lever.feasible) return 'Infeasible alone';
            if (lever.value === 0 || lever.value === null) return 'No change needed';
            switch (lever.unit) {
                case 'AUD/year':     return `Add ${cur(lever.value)}/year`;
                case 'AUD/month':    return `Add ${cur(lever.value)}/month`;
                case 'AUD/week':     return `Add ${cur(lever.value)}/week`;
                case 'AUD lump sum': return `Top up ${cur(lever.value)}`;
                case 'AUD':          return `Increase by ${cur(lever.value)}`;
                case 'years':        return `Delay by ${lever.value} year${lever.value !== 1 ? 's' : ''}`;
                default:             return lever.description || '—';
            }
        }

        if (feasibleLevers.length > 0) {
            autoTable(
                ['Lever', 'Current Value', 'Required Value', 'Change Needed', 'Annual Impact'],
                feasibleLevers.map(lever => [
                    lever.label,
                    leverCurrentValue(lever, inp),
                    leverRequiredValue(lever),
                    leverChangeNeeded(lever),
                    lever.unit === 'AUD/year' ? cur(lever.value) + '/yr'
                        : lever.unit === 'AUD/month' ? cur((lever.value || 0) * 12) + '/yr'
                        : '—',
                ]),
                {
                    headStyles: { fillColor: [5, 150, 105] },
                    columnStyles: {
                        0: { fontStyle: 'bold', cellWidth: 45 },
                        1: { halign: 'right', cellWidth: 32 },
                        2: { halign: 'right', cellWidth: 32 },
                        3: { halign: 'right', cellWidth: 40 },
                        4: { halign: 'right', cellWidth: 28 },
                    },
                }
            );
        } else {
            checkPage(12);
            setFont(9, 'italic', [100, 116, 139]);
            doc.text('No single lever can bridge the gap alone. A combination of changes is required.', MARGIN, y);
            y += 8;
        }

        // Top recommended actions — numbered list with full detail
        checkPage(20);
        heading('Top Recommended Actions', 11);

        if (top3Actions.length > 0) {
            top3Actions.forEach((lever, i) => {
                checkPage(18);
                // Action number badge
                doc.setFillColor(15, 23, 42);
                doc.circle(MARGIN + 4, y + 1, 4, 'F');
                setFont(8, 'bold', [255, 255, 255]);
                doc.text(String(i + 1), MARGIN + 4, y + 2.5, { align: 'center' });

                setFont(10, 'bold', [15, 23, 42]);
                doc.text(lever.label, MARGIN + 11, y + 2);
                y += 9;
                setFont(8.5, 'normal', [71, 85, 105]);
                const descLines = doc.splitTextToSize(lever.description || '', CW - 11);
                descLines.forEach(line => { doc.text(line, MARGIN + 11, y); y += 5; });
                if (lever.regulatoryNote) {
                    setFont(7.5, 'italic', [100, 116, 139]);
                    doc.text('Note: ' + lever.regulatoryNote, MARGIN + 11, y);
                    y += 5;
                }
                y += 3;
            });
        } else {
            checkPage(10);
            setFont(9, 'italic', [100, 116, 139]);
            doc.text('Speak to a licensed financial adviser for a personalised combination strategy.', MARGIN, y);
            y += 8;
        }

        // ── PAGE 3: GAP ANALYSIS TABLE ───────────────────────────────────────
        checkPage(30);
        heading('Detailed Gap Analysis — Current vs Required', 11);

        const gap = compareCurrentToTarget(currentPath, target);
        const gapRows = buildComparisonTable(gap, currentPath, target);

        autoTable(
            ['Metric', 'Your Current Position', 'Required for Goal', 'Gap', 'Action'],
            gapRows.map(row => [row.label, row.current, row.required, row.gap, row.recommendedAction]),
            {
                columnStyles: {
                    0: { fontStyle: 'bold', cellWidth: 38 },
                    1: { halign: 'right', cellWidth: 35 },
                    2: { halign: 'right', cellWidth: 35 },
                    3: { halign: 'right', cellWidth: 25, fontStyle: 'bold' },
                    4: { cellWidth: 44 },
                },
                didParseCell: (data) => {
                    if (data.column.index === 3 && data.section === 'body') {
                        const val = data.cell.text[0];
                        if (val && val !== '—') {
                            data.cell.styles.textColor = [220, 38, 38];
                        } else {
                            data.cell.styles.textColor = [5, 150, 105];
                        }
                    }
                },
            }
        );

        // Problem flags
        if (gap.problemFlags && gap.problemFlags.length > 0) {
            checkPage(15);
            heading('Issues Identified', 10);
            const sevColor = { high: [220, 38, 38], medium: [234, 88, 12], low: [59, 130, 246] };
            gap.problemFlags.forEach(flag => {
                checkPage(14);
                const col = sevColor[flag.severity] || [71, 85, 105];
                doc.setFillColor(...col);
                doc.rect(MARGIN, y, 3, 9, 'F');
                setFont(9, 'bold', col);
                doc.text(flag.label, MARGIN + 6, y + 4);
                setFont(8, 'normal', [71, 85, 105]);
                const detailLines = doc.splitTextToSize(flag.detail || '', CW - 10);
                detailLines.forEach((line, li) => { doc.text(line, MARGIN + 6, y + 9 + li * 4.5); });
                y += 9 + detailLines.length * 4.5 + 4;
            });
        }

        // ── PAGE 3/4: RETIREMENT PROJECTIONS ────────────────────────────────
        checkPage(30);
        heading('Retirement Projections', 11);

        const nomInc = currentPath.sustainableIncomeToday * Math.pow(1 + INF, ytr);
        const nomTarget = target.targetAnnualIncomeToday * Math.pow(1 + INF, ytr);
        const yourSuperRet = currentPath.score?.yourSuperAtRetirement || superAtRet;
        const partnerSuperRet = currentPath.score?.partnerSuperAtRetirement || 0;
        const simResult = currentPath.simResult;
        const depletionAge = simResult?.depletionAge || null;

        autoTable(
            ['Projection Item', 'Value', 'Notes'],
            [
                ['Super at retirement', cur(superAtRet), 'Combined household super balance'],
                yourSuperRet !== superAtRet ? ['  Your super at retirement', cur(yourSuperRet), 'Your individual share'] : null,
                partnerSuperRet > 0 ? ['  Partner super at retirement', cur(partnerSuperRet), 'Partner individual share'] : null,
                ['Total financial assets', cur(nominalAssets), 'Super + investments + savings (nominal)'],
                ['Capital required for goal', cur(currentPath.requiredCapital), `At ${pct(SWR)} safe withdrawal rate`],
                ['Capital gap', MEETS ? 'None' : cur(currentPath.capitalGap), MEETS ? 'Goal achieved' : 'Additional capital needed'],
                ['Sustainable income (today $)', cur(currentPath.sustainableIncomeToday) + '/yr', 'In today\'s purchasing power'],
                ['Sustainable income (' + RETIRE_YEAR + ' $)', cur(nomInc) + '/yr', 'In retirement-year dollars'],
                ['Target income (' + RETIRE_YEAR + ' $)', cur(nomTarget) + '/yr', 'Goal after inflation adjustment'],
                ['Age Pension at retirement', cur(agePension) + '/yr', 'Means-tested estimate (nominal)'],
                depletionAge ? ['Portfolio depletion age', `Age ${depletionAge}`, depletionAge >= LIFESPAN ? 'Lasts full planning period' : 'SHORTFALL before plan end'] : null,
                !depletionAge ? ['Portfolio lasts to', `Age ${LIFESPAN}+`, 'No depletion within planning period'] : null,
                (currentPath.mortgageBalance || 0) > 0 ? ['Mortgage at retirement', cur(currentPath.mortgageBalance), 'Remaining balance — must be serviced from assets'] : null,
            ].filter(Boolean),
            {
                columnStyles: {
                    0: { fontStyle: 'bold', cellWidth: 70 },
                    1: { halign: 'right', cellWidth: 40 },
                    2: { cellWidth: 67 },
                },
                didParseCell: (data) => {
                    if (data.section === 'body' && data.column.index === 0) {
                        if (String(data.cell.text[0]).startsWith('  ')) {
                            data.cell.styles.fontStyle = 'normal';
                            data.cell.styles.textColor = [100, 116, 139];
                        }
                    }
                },
            }
        );

        // ── PAGE 4: ALL LEVERS ANALYSED ──────────────────────────────────────
        checkPage(30);
        heading('All Levers Analysed', 11);

        setFont(8, 'normal', [100, 116, 139]);
        doc.text('Each lever is assessed independently. Combining multiple levers will close the gap faster.', MARGIN, y);
        y += 7;

        if (rankedLevers && rankedLevers.length > 0) {
            autoTable(
                ['Lever', 'Feasible?', 'Current', 'Solved Value', 'Change Required', 'Description'],
                rankedLevers.map(lever => [
                    lever.label,
                    lever.feasible ? 'Yes' : 'No',
                    leverCurrentValue(lever, inp),
                    lever.feasible ? leverRequiredValue(lever) : '—',
                    lever.feasible ? leverChangeNeeded(lever) : lever.description || 'Insufficient alone',
                    lever.feasible ? '' : (lever.description || ''),
                ]),
                {
                    headStyles: { fillColor: [30, 41, 59] },
                    columnStyles: {
                        0: { fontStyle: 'bold', cellWidth: 38 },
                        1: { halign: 'center', cellWidth: 17 },
                        2: { halign: 'right', cellWidth: 26 },
                        3: { halign: 'right', cellWidth: 28 },
                        4: { cellWidth: 38 },
                        5: { cellWidth: 30 },
                    },
                    didParseCell: (data) => {
                        if (data.section === 'body' && data.column.index === 1) {
                            const val = data.cell.text[0];
                            data.cell.styles.textColor = val === 'Yes' ? [5, 150, 105] : [220, 38, 38];
                            data.cell.styles.fontStyle = 'bold';
                        }
                    },
                }
            );
        }

        // Infeasible levers explanation
        if (infeasibleLevers.length > 0) {
            checkPage(15);
            setFont(9, 'bold', [100, 116, 139]);
            doc.text('Levers that cannot bridge the gap alone:', MARGIN, y);
            y += 6;
            infeasibleLevers.forEach(lever => {
                checkPage(8);
                setFont(8, 'normal', [100, 116, 139]);
                const lines = doc.splitTextToSize(`- ${lever.label}: ${lever.description || ''}`, CW);
                lines.forEach(line => { doc.text(line, MARGIN + 3, y); y += 4.5; });
            });
            y += 4;
        }

        // ── PAGE 5: ASSUMPTIONS ──────────────────────────────────────────────
        checkPage(30);
        heading('Assumptions & Methodology', 11);

        autoTable(
            ['Assumption', 'Value', 'Source / Notes'],
            [
                ['Inflation rate', pct(INF), 'RBA target band / ABS CPI'],
                ['Safe withdrawal rate', pct(SWR), 'Trinity study / FI community standard'],
                ['Super return (net)', pct(inp.superReturn || 0.075), 'APRA MySuper balanced 10-yr median'],
                ['Investment return', pct(inp.investmentReturn || 0.07), 'ASX / diversified portfolio long-run'],
                ['Salary growth rate', pct(inp.salaryGrowthRate || 0.02), 'ABS Wage Price Index long-run real'],
                ['Savings return', pct(inp.savingsReturn || 0.035), 'High-interest savings account rate'],
                ['Super Guarantee rate', pct(inp.employerSuperContributionRate || 0.12), 'ATO legislated SG rate (FY2025-26)'],
                ['Concessional cap', '$30,000/year', 'ATO limit FY2024-25 and FY2025-26'],
                ['Age Pension age', '67', 'Services Australia current qualifying age'],
                ['Age Pension included', target.includeAgePension ? 'Yes (means-tested)' : 'No', 'Services Australia rates'],
                ['Household type', target.householdType === 'couple' ? 'Couple' : 'Single', 'Affects pension thresholds'],
                ['Years to retirement', String(ytr), `Current age to age ${RET_AGE}`],
                ['Planning horizon', `${LIFESPAN - (inp.yourCurrentAge || RET_AGE)} years in retirement`, `Age ${RET_AGE} to ${LIFESPAN}`],
            ],
            {
                columnStyles: {
                    0: { fontStyle: 'bold', cellWidth: 55 },
                    1: { halign: 'right', cellWidth: 30 },
                    2: { cellWidth: 92 },
                },
            }
        );

        // Disclaimer
        checkPage(30);
        doc.setFillColor(241, 245, 249);
        const dlY = y;
        const disclaimerText = 'GENERAL INFORMATION ONLY — NOT FINANCIAL ADVICE. This report is produced by an automated calculator and provides general scenario modelling only. It is not personal financial, tax, legal, migration or estate-planning advice. Projections are illustrative estimates based on inputs you provided and assumptions listed above. Actual outcomes will differ due to changes in markets, legislation, personal circumstances, longevity, and other factors not modelled here. Past performance does not guarantee future results. Always seek advice from a licensed financial adviser (AFS Licence holder) before making investment or retirement planning decisions. Centrelink entitlements, taxation, and superannuation rules may change. Superannuation balances and Age Pension entitlements are subject to legislative change.';
        const dLines = doc.splitTextToSize(disclaimerText, CW - 8);
        doc.roundedRect(MARGIN, dlY, CW, dLines.length * 3.8 + 10, 2, 2, 'F');
        setFont(7, 'bold', [100, 116, 139]);
        doc.text('DISCLAIMER', MARGIN + 4, dlY + 6);
        setFont(6.5, 'normal', [100, 116, 139]);
        dLines.forEach((line, i) => { doc.text(line, MARGIN + 4, dlY + 11 + i * 3.8); });

        // Page numbers
        const totalPages = doc.getNumberOfPages();
        for (let p = 1; p <= totalPages; p++) {
            doc.setPage(p);
            setFont(7, 'normal', [148, 163, 184]);
            doc.text(`Page ${p} of ${totalPages}`, PAGE_W - MARGIN, 293, { align: 'right' });
            doc.text('Retirement Calculator AU — Reverse Planner Report', MARGIN, 293);
        }

        doc.save('retirement-reverse-planner-report.pdf');
    }

    /**
     * Render the main results — headline, goal summary, current path, action intro, assumptions.
     */
    renderResults(result) {
        const { target, currentPath, top3Actions, summary } = result;
        const plainEnglish = generatePlainEnglishSummary(result);

        safeText('rp-headline', plainEnglish.headline);

        // Goal summary (today's dollars + nominal at retirement)
        const ytr = Number.isFinite(currentPath.yearsToRetirement) && currentPath.yearsToRetirement >= 1
            ? Math.round(currentPath.yearsToRetirement)
            : Math.max(1, (target.retirementAge || 67) - (currentPath.currentAge || target.currentAge || 50));
        const inflationRate = currentPath.inflationRate || 0.026;
        const retirementAge = target.retirementAge ?? currentPath.retirementAge ?? 67;
        const lifespan = target.lifespan ?? currentPath.lifespan ?? 90;
        const retirementYear = new Date().getFullYear() + ytr;

        const nominalTarget = target.targetAnnualIncomeToday *
            Math.pow(1 + inflationRate, ytr);
        safeText('rp-goal-today', fmt(target.targetAnnualIncomeToday) + '/year');
        safeText('rp-goal-nominal', `≈ ${fmt(nominalTarget)}/year in ${retirementYear} dollars`);
        safeText('rp-goal-retire-age', `Age ${retirementAge}`);
        safeText('rp-goal-lifespan', `Age ${lifespan}`);

        // Current path — both income values are in today's dollars (same base year),
        // making the goal vs current comparison directly meaningful.
        // Nominal figures shown as context ("what that means in retirement-year $").
        const nominalIncome = currentPath.sustainableIncomeToday *
            Math.pow(1 + inflationRate, ytr);
        const nominalAssets = currentPath.totalAssetsNominal || 0;
        const todayAssets = nominalAssets > 0
            ? nominalAssets / Math.pow(1 + inflationRate, ytr)
            : 0;
        safeText('rp-current-income', fmt(currentPath.sustainableIncomeToday) + '/year');
        safeText('rp-current-nominal', `≈ ${fmt(nominalIncome)}/year in ${retirementYear} dollars`);
        safeText('rp-current-assets', `${fmt(nominalAssets)} nominal (${fmt(todayAssets)} today's $)`);
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
    /**
     * Render "What You Need to Do Today" panel — current vs required values per lever.
     */
    renderWhatYouNeedToday(result) {
        const { target, currentPath, rankedLevers, inputs } = result;
        const inp = inputs || {};
        const RET_AGE = target.retirementAge || 67;
        const ytr = currentPath.yearsToRetirement || Math.max(1, RET_AGE - (target.currentAge || 50));

        const panel = el('rp-today-panel');
        const tbody = el('rp-today-tbody');
        const intro = el('rp-today-intro');
        const infeasibleNote = el('rp-today-infeasible');
        if (!panel || !tbody) return;

        // Intro text
        if (intro) {
            intro.textContent = `To achieve ${fmt(target.targetAnnualIncomeToday)}/year income at retirement (age ${RET_AGE}, ` +
                `${ytr} year${ytr !== 1 ? 's' : ''} away), each row below is an independent path that closes the gap alone. ` +
                `Combining multiple levers will close the gap faster.`;
        }

        const feasible = (rankedLevers || []).filter(l => l.feasible);
        const allInfeasible = feasible.length === 0;

        if (infeasibleNote) {
            infeasibleNote.classList.toggle('hidden', !allInfeasible);
        }

        // Maps lever key → current value string from inputs
        const currentVal = (lever) => {
            switch (lever.lever) {
                case 'extraAnnualSuper':   return fmt(inp.yourAdditionalSuperContribution || 0) + '/yr';
                case 'salary':             return fmt(inp.yourSalary || inp.annualSalary || 0) + '/yr';
                case 'retirementAge':      return `Age ${inp.retirementAge || RET_AGE}`;
                case 'superBalance':       return fmt(inp.yourCurrentSuper || 0);
                case 'extraSavings':       return fmt(inp.monthlyStockContribution || 0) + '/mo';
                case 'mortgageRepayment':  return fmt(inp.monthlyMortgagePayment || 0) + '/mo';
                case 'netRent':            return fmt(inp.weeklyRentalIncome || 0) + '/wk';
                case 'homeValue':          return fmt(inp.homeValue || 0);
                case 'investmentBalance':  return fmt((inp.currentStocks || 0) + (inp.currentSavings || 0));
                case 'spendingReduction':  return fmt(target.targetAnnualIncomeToday) + '/yr';
                case 'estateAdjustment':   return fmt(target.minimumEstateToday || 0);
                default:                   return '—';
            }
        };

        // Maps lever → required value string
        const requiredVal = (lever) => {
            if (lever.solved === null || lever.solved === undefined) return '—';
            switch (lever.lever) {
                case 'extraAnnualSuper':   return fmt(lever.solved) + '/yr total';
                case 'salary':             return fmt(lever.solved) + '/yr';
                case 'retirementAge':      return `Age ${Math.round(lever.solved)}`;
                case 'superBalance':       return fmt(lever.solved);
                case 'extraSavings':       return fmt(lever.solved) + '/mo';
                case 'mortgageRepayment':  return fmt(lever.solved) + '/mo';
                case 'netRent':            return fmt(lever.solved) + '/wk';
                case 'homeValue':          return fmt(lever.solved);
                case 'investmentBalance':  return fmt(lever.solved);
                case 'spendingReduction':  return fmt(lever.solved) + '/yr';
                case 'estateAdjustment':   return fmt(lever.solved);
                default:                   return lever.value !== null && lever.value !== undefined ? fmt(lever.value) : '—';
            }
        };

        // Maps lever → "change needed" string
        const changeNeeded = (lever) => {
            if (!lever.feasible) return '<span style="color:var(--ink-3)">Infeasible alone</span>';
            if (!lever.value) return 'No change needed';
            switch (lever.unit) {
                case 'AUD/year':     return `<b>Add ${fmt(lever.value)}/year</b>`;
                case 'AUD/month':    return `<b>Add ${fmt(lever.value)}/month</b>`;
                case 'AUD/week':     return `<b>Add ${fmt(lever.value)}/week</b>`;
                case 'AUD lump sum': return `<b>Top up ${fmt(lever.value)}</b>`;
                case 'AUD':          return `<b>Increase by ${fmt(lever.value)}</b>`;
                case 'years':        return `<b>Delay ${lever.value} yr${lever.value !== 1 ? 's' : ''}</b>`;
                default:             return lever.description || '—';
            }
        };

        // Annual impact for feasible levers
        const annualImpact = (lever) => {
            if (!lever.feasible || !lever.value) return '—';
            switch (lever.unit) {
                case 'AUD/year':  return `+${fmt(lever.value)}/yr`;
                case 'AUD/month': return `+${fmt((lever.value || 0) * 12)}/yr`;
                default: return '—';
            }
        };

        // Render all levers — feasible first (highlighted), then infeasible (greyed)
        const leversToShow = [
            ...feasible,
            ...(rankedLevers || []).filter(l => !l.feasible),
        ];

        tbody.innerHTML = leversToShow.map((lever, i) => {
            const isFeasible = lever.feasible;
            const rowBg = isFeasible && i < feasible.length
                ? (i === 0 ? 'background:var(--accent-soft,#eff6ff)' : '')
                : 'opacity:0.55';
            return `<tr style="${rowBg}">
                <td style="font-weight:600">${lever.label}${isFeasible && i === 0 ? ' <span style="font-size:10px;color:var(--accent);font-weight:700">BEST</span>' : ''}</td>
                <td style="text-align:right;color:var(--ink-2)">${currentVal(lever)}</td>
                <td style="text-align:right;color:${isFeasible ? 'var(--accent)' : 'var(--ink-3)'}">${requiredVal(lever)}</td>
                <td style="text-align:right">${changeNeeded(lever)}</td>
                <td style="text-align:right;color:var(--ink-2)">${annualImpact(lever)}</td>
            </tr>`;
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

    // -----------------------------------------------------------------------
    // Deep analysis (reverse-deep-analysis.js)
    // -----------------------------------------------------------------------

    /**
     * Run all four deep-analysis functions and render their results.
     *
     * Each analysis runs independently with per-task error isolation so that
     * a single failure never blanks the entire section.
     */
    async _renderDeepAnalysisAsync(result) {
        const section = el('rp-deep-analysis-section');
        if (!section) return;

        const inputs = result.inputs || {};
        const target = result.target || {};

        show('rp-deep-analysis-section');

        await Promise.all([
            this._renderAgeSalaryCurve(inputs, target).catch(e => {
                console.error('Age-salary curve render error:', e);
                safeHtml('rp-age-salary-curve', '<p class="text-sm" style="color:var(--ink-3)">Analysis unavailable</p>');
            }),
            this._renderRequiredValues(inputs, target).catch(e => {
                console.error('Required values render error:', e);
                safeHtml('rp-required-values', '<p class="text-sm" style="color:var(--ink-3)">Analysis unavailable</p>');
            }),
            this._renderSalaryTolerance(inputs, target).catch(e => {
                console.error('Salary tolerance render error:', e);
                safeHtml('rp-salary-tolerance', '<p class="text-sm" style="color:var(--ink-3)">Analysis unavailable</p>');
            }),
            this._renderOverseasAgeAnalysis(inputs, target).catch(e => {
                console.error('Overseas age analysis render error:', e);
                safeHtml('rp-overseas-age-analysis', '<p class="text-sm" style="color:var(--ink-3)">Analysis unavailable</p>');
            }),
        ]);
    }

    /**
     * Render card 1: When can I retire — retirement age vs required salary curve.
     */
    async _renderAgeSalaryCurve(inputs, target) {
        const container = el('rp-age-salary-curve');
        if (!container) return;

        const simulator = this.planner.simulator;
        const curve = await calculateRetirementAgeSalaryCurve(simulator, inputs, target);

        if (!curve || curve.length === 0) {
            container.innerHTML = '<p class="text-sm" style="color:var(--ink-3)">No data available</p>';
            return;
        }

        const currentRetireAge = target.retirementAge || 65;

        let html = '<div style="overflow-x:auto"><table class="year-table" style="min-width:400px;font-size:12px"><thead><tr><th>Retirement age</th><th class="text-right">Required salary</th><th class="text-right">Feasible</th></tr></thead><tbody>';

        curve.forEach(pt => {
            const isCurrent = pt.retirementAge === currentRetireAge;
            const bg = isCurrent ? 'var(--accent-soft)' : 'transparent';
            const feasibleIcon = pt.feasible ? '✓' : '✗';
            const feasibleColor = pt.feasible ? 'var(--accent)' : 'var(--ink-3)';
            const salaryStr = pt.feasible
                ? fmt(pt.requiredSalary) + '/yr'
                : '—';

            html += `<tr style="background:${bg}">
                <td style="font-weight:${isCurrent ? '700' : '400'}">${pt.retirementAge}${isCurrent ? ' (current target)' : ''}</td>
                <td class="text-right">${salaryStr}</td>
                <td class="text-right" style="color:${feasibleColor}">${feasibleIcon}</td>
            </tr>`;
        });

        html += '</tbody></table></div>';

        // Summary
        const earliestFeasible = curve.find(pt => pt.feasible);
        const summaryHtml = earliestFeasible
            ? `<p style="font-size:12px;color:var(--ink-2);margin-top:8px">Earliest feasible retirement age: <strong>${earliestFeasible.retirementAge}</strong> (requires salary of ${fmt(earliestFeasible.requiredSalary)}/yr)</p>`
            : '<p style="font-size:12px;color:var(--rose);margin-top:8px">Cannot achieve goal at any retirement age up to 75 within modelled salary range ($500k cap)</p>';

        container.innerHTML = html + summaryHtml;
    }

    /**
     * Render card 2: What you need today — required home value + investment balance.
     */
    async _renderRequiredValues(inputs, target) {
        const container = el('rp-required-values');
        if (!container) return;

        const simulator = this.planner.simulator;
        const values = await calculateRequiredCurrentValues(simulator, inputs, target);

        const homeRow = values.homeValue;
        const savingsRow = values.investmentBalance;

        container.innerHTML = `
            <div style="display:flex;flex-direction:column;gap:8px">
                <div style="display:flex;justify-content:space-between;padding:10px 12px;border-radius:8px;background:var(--surface-2);border:1px solid var(--border)">
                    <div>
                        <div style="font-weight:600;font-size:13px;color:var(--ink)">Home value</div>
                        <div style="font-size:11px;color:var(--ink-3)">Current: ${homeRow.current ? fmt(homeRow.current) : '—'}</div>
                    </div>
                    <div style="text-align:right">
                        <div style="font-weight:600;font-size:13px;color:${homeRow.feasible ? 'var(--accent)' : 'var(--rose)'}">${homeRow.feasible ? fmt(homeRow.required) : '—'}</div>
                        <div style="font-size:11px;color:var(--ink-3)">${homeRow.feasible ? 'Required' : 'Infeasible'}</div>
                    </div>
                </div>
                <div style="display:flex;justify-content:space-between;padding:10px 12px;border-radius:8px;background:var(--surface-2);border:1px solid var(--border)">
                    <div>
                        <div style="font-weight:600;font-size:13px;color:var(--ink)">Investment balance</div>
                        <div style="font-size:11px;color:var(--ink-3)">Current: ${savingsRow.current ? fmt(savingsRow.current) : '—'}</div>
                    </div>
                    <div style="text-align:right">
                        <div style="font-weight:600;font-size:13px;color:${savingsRow.feasible ? 'var(--accent)' : 'var(--rose)'}">${savingsRow.feasible ? fmt(savingsRow.required) : '—'}</div>
                        <div style="font-size:11px;color:var(--ink-3)">${savingsRow.feasible ? 'Required' : 'Infeasible'}</div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render card 3: Salary reduction tolerance.
     */
    async _renderSalaryTolerance(inputs, target) {
        const container = el('rp-salary-tolerance');
        if (!container) return;

        const simulator = this.planner.simulator;
        const tolerance = await calculateSalaryReductionTolerance(simulator, inputs, target);

        if (tolerance.currentSalary <= 0) {
            container.innerHTML = '<p style="font-size:12px;color:var(--ink-3)">No current salary data available for reduction analysis.</p>';
            return;
        }

        if (!tolerance.feasible) {
            container.innerHTML = '<p style="font-size:12px;color:var(--rose)">Salary cannot be reduced below current level while still meeting your retirement goal.</p>';
            return;
        }

        container.innerHTML = `
            <div style="display:flex;flex-direction:column;gap:8px">
                <div style="display:flex;justify-content:space-between;padding:10px 12px;border-radius:8px;background:var(--accent-soft);border:1px solid var(--accent)">
                    <div>
                        <div style="font-weight:600;font-size:13px;color:var(--ink)">Current salary</div>
                    </div>
                    <div style="font-weight:600;font-size:13px;color:var(--ink)">${fmt(tolerance.currentSalary)}/yr</div>
                </div>
                <div style="display:flex;justify-content:space-between;padding:10px 12px;border-radius:8px;background:var(--surface-2);border:1px solid var(--border)">
                    <div>
                        <div style="font-weight:600;font-size:13px;color:var(--ink)">Minimum required salary</div>
                    </div>
                    <div style="font-weight:600;font-size:13px;color:var(--accent)">${tolerance.minRequiredSalary != null ? fmt(tolerance.minRequiredSalary) + '/yr' : '—'}</div>
                </div>
                <div style="display:flex;justify-content:space-between;padding:10px 12px;border-radius:8px;background:var(--surface-2);border:1px solid var(--border)">
                    <div>
                        <div style="font-weight:600;font-size:13px;color:var(--ink)">Maximum reduction</div>
                    </div>
                    <div style="text-align:right">
                        <div style="font-weight:600;font-size:13px;color:var(--accent)">${tolerance.maxReduction != null ? fmt(tolerance.maxReduction) + '/yr' : '—'}</div>
                        <div style="font-size:11px;color:var(--ink-3)">${tolerance.reductionPercent != null ? tolerance.reductionPercent.toFixed(1) + '% of current salary' : ''}</div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render card 4: Optimal overseas move age analysis.
     */
    async _renderOverseasAgeAnalysis(inputs, target) {
        const container = el('rp-overseas-age-analysis');
        if (!container) return;

        const simulator = this.planner.simulator;
        const analysis = await calculateOptimalOverseasAge(simulator, inputs, target);

        if (!analysis.feasible) {
            container.innerHTML = '<p style="font-size:12px;color:var(--ink-3)">Overseas retirement is not projected to be feasible at any age within modelled parameters.</p>';
            return;
        }

        // Summary header
        let summaryHtml = '';
        if (analysis.optimalAge) {
            if (analysis.worksWithCurrentSalary) {
                summaryHtml = `<p style="font-size:12px;color:var(--accent);font-weight:600;margin-bottom:8px">Optimal move age: <strong>${analysis.optimalAge}</strong> (works with current salary)</p>`;
            } else {
                summaryHtml = `<p style="font-size:12px;color:var(--amber);font-weight:600;margin-bottom:8px">Optimal move age: <strong>${analysis.optimalAge}</strong> (may require salary adjustment)</p>`;
            }
        }

        // Table
        let tableHtml = '<div style="overflow-x:auto"><table class="year-table" style="min-width:400px;font-size:12px"><thead><tr><th>Move age</th><th class="text-right">Required salary</th><th class="text-right">Overseas target</th><th class="text-right">Works now?</th></tr></thead><tbody>';

        analysis.analysis.forEach(pt => {
            const isOptimal = pt.moveAge === analysis.optimalAge;
            const bg = isOptimal ? 'var(--accent-soft)' : 'transparent';
            const salaryStr = pt.feasible ? fmt(pt.requiredSalary) + '/yr' : '—';
            const worksStr = pt.worksWithCurrentSalary ? '✓' : '—';
            const worksColor = pt.worksWithCurrentSalary ? 'var(--accent)' : 'var(--ink-3)';

            tableHtml += `<tr style="background:${bg}">
                <td style="font-weight:${isOptimal ? '700' : '400'}">${pt.moveAge}${isOptimal ? ' (optimal)' : ''}</td>
                <td class="text-right">${salaryStr}</td>
                <td class="text-right">${fmt(pt.annualTargetOverseas)}/yr</td>
                <td class="text-right" style="color:${worksColor}">${worksStr}</td>
            </tr>`;
        });

        tableHtml += '</tbody></table></div>';

        container.innerHTML = summaryHtml + tableHtml;
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
