/**
 * AdvancedDesignUI
 * UI controller for the Advanced Design Calculator page.
 * Coordinates inputs → engine → chart/results rendering.
 */

import { AdvancedDesignEngine } from './advanced-design-engine.js';

class AdvancedDesignUI {

    constructor() {
        this.engine = new AdvancedDesignEngine();
        this.chart  = null;
        this.lastResults = null;
        this.lastScenarios = null;
    }

    init() {
        this._setupTheme();
        this._setupNav();
        this._setupAccordions();
        this._setupPresetButtons();
        this._setupTooltips();
        this._setupCalculateButton();
        this._setupToggleSwitches();
        this._setupStressTestToggle();
        this._setupDisclaimerCollapse();
        this._setupMethodologyAccordion();
        this._setupRealNominalToggle();
    }

    /* ------------------------------------------------------------------ */
    /* Theme                                                                */
    /* ------------------------------------------------------------------ */

    _setupTheme() {
        const toggle = document.getElementById('themeToggle');
        if (!toggle) return;
        const apply = theme => {
            document.documentElement.setAttribute('data-theme', theme);
            localStorage.setItem('retirement-calc-theme', theme);
            const sunIcon  = toggle.querySelector('.sun-icon');
            const moonIcon = toggle.querySelector('.moon-icon');
            if (sunIcon)  sunIcon.style.display  = theme === 'dark' ? 'none'  : 'block';
            if (moonIcon) moonIcon.style.display = theme === 'dark' ? 'block' : 'none';
            if (this.chart) this._updateChartTheme(theme);
        };
        const current = localStorage.getItem('retirement-calc-theme') || 'light';
        apply(current);
        toggle.addEventListener('click', () => {
            const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
            apply(next);
        });
    }

    _updateChartTheme(theme) {
        if (!this.chart) return;
        const gridColor = theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
        const textColor = theme === 'dark' ? '#d1d5db' : '#374151';
        this.chart.options.scales.x.ticks.color = textColor;
        this.chart.options.scales.y.ticks.color = textColor;
        this.chart.options.scales.x.grid.color  = gridColor;
        this.chart.options.scales.y.grid.color  = gridColor;
        this.chart.update();
    }

    /* ------------------------------------------------------------------ */
    /* Navigation dropdown                                                  */
    /* ------------------------------------------------------------------ */

    _setupNav() {
        const btn      = document.getElementById('navMenuButton');
        const dropdown = document.getElementById('navDropdown');
        if (!btn || !dropdown) return;

        btn.addEventListener('click', e => {
            e.stopPropagation();
            dropdown.classList.toggle('hidden');
        });
        document.addEventListener('click', () => dropdown.classList.add('hidden'));
    }

    /* ------------------------------------------------------------------ */
    /* Collapsible input section accordions                                 */
    /* ------------------------------------------------------------------ */

    _setupAccordions() {
        document.querySelectorAll('[data-accordion-toggle]').forEach(btn => {
            btn.addEventListener('click', () => {
                const targetId = btn.getAttribute('data-accordion-toggle');
                const body     = document.getElementById(targetId);
                if (!body) return;
                const icon = btn.querySelector('[data-accordion-icon]');
                const isOpen = !body.classList.contains('hidden');
                body.classList.toggle('hidden', isOpen);
                if (icon) icon.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
            });
        });
    }

    /* ------------------------------------------------------------------ */
    /* Preset buttons                                                       */
    /* ------------------------------------------------------------------ */

    _setupPresetButtons() {
        const presets = AdvancedDesignEngine.PRESETS;
        const setField = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val;
        };

        document.getElementById('preset-conservative')?.addEventListener('click', () => {
            setField('superReturn',   presets.conservative.superReturn);
            setField('savingsReturn', presets.conservative.savingsReturn);
            setField('inflation',     presets.conservative.inflation);
            this._highlightPreset('preset-conservative');
        });

        document.getElementById('preset-balanced')?.addEventListener('click', () => {
            setField('superReturn',   presets.balanced.superReturn);
            setField('savingsReturn', presets.balanced.savingsReturn);
            setField('inflation',     presets.balanced.inflation);
            this._highlightPreset('preset-balanced');
        });

        document.getElementById('preset-aggressive')?.addEventListener('click', () => {
            setField('superReturn',   presets.aggressive.superReturn);
            setField('savingsReturn', presets.aggressive.savingsReturn);
            setField('inflation',     presets.aggressive.inflation);
            this._highlightPreset('preset-aggressive');
        });

        document.getElementById('preset-reset')?.addEventListener('click', () => {
            setField('superReturn',   7.5);
            setField('savingsReturn', 6.0);
            setField('inflation',     2.6);
            this._highlightPreset(null);
        });
    }

    _highlightPreset(activeId) {
        ['preset-conservative', 'preset-balanced', 'preset-aggressive', 'preset-reset'].forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            const isActive = id === activeId;
            el.classList.toggle('ring-2',         isActive);
            el.classList.toggle('ring-indigo-500', isActive);
            el.classList.toggle('ring-offset-1',   isActive);
        });
    }

    /* ------------------------------------------------------------------ */
    /* Tooltips (hover on info icons)                                       */
    /* ------------------------------------------------------------------ */

    _setupTooltips() {
        document.querySelectorAll('[data-tooltip]').forEach(el => {
            const tip = document.createElement('div');
            tip.className = [
                'absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2',
                'w-64 px-3 py-2 rounded-md text-xs text-white bg-gray-800',
                'shadow-lg pointer-events-none opacity-0 transition-opacity duration-200',
            ].join(' ');
            tip.textContent = el.getAttribute('data-tooltip');
            el.style.position = 'relative';
            el.appendChild(tip);

            el.addEventListener('mouseenter', () => tip.style.opacity = '1');
            el.addEventListener('mouseleave', () => tip.style.opacity = '0');
            el.addEventListener('focus',      () => tip.style.opacity = '1');
            el.addEventListener('blur',       () => tip.style.opacity = '0');
        });
    }

    /* ------------------------------------------------------------------ */
    /* Toggle switches (% / $ contributions, withdrawal mode)              */
    /* ------------------------------------------------------------------ */

    _setupToggleSwitches() {
        // Contribution mode toggle
        const contribModeBtn = document.getElementById('contribModeToggle');
        const contribPctRow  = document.getElementById('contribPctRow');
        const contribAudRow  = document.getElementById('contribAudRow');
        if (contribModeBtn && contribPctRow && contribAudRow) {
            contribModeBtn.addEventListener('click', () => {
                const usePct = contribPctRow.classList.contains('hidden');
                contribPctRow.classList.toggle('hidden', !usePct);
                contribAudRow.classList.toggle('hidden',  usePct);
                contribModeBtn.textContent = usePct ? 'Switch to $' : 'Switch to %';
            });
        }

        // Withdrawal mode toggle
        const withdrawModeBtn = document.getElementById('withdrawModeToggle');
        const withdrawPctRow  = document.getElementById('withdrawPctRow');
        const withdrawAudRow  = document.getElementById('withdrawAudRow');
        if (withdrawModeBtn && withdrawPctRow && withdrawAudRow) {
            withdrawModeBtn.addEventListener('click', () => {
                const usePct = withdrawPctRow.classList.contains('hidden');
                withdrawPctRow.classList.toggle('hidden', !usePct);
                withdrawAudRow.classList.toggle('hidden',  usePct);
                withdrawModeBtn.textContent = usePct ? 'Switch to $' : 'Switch to %';
            });
        }
    }

    /* ------------------------------------------------------------------ */
    /* Stress test panel toggle                                             */
    /* ------------------------------------------------------------------ */

    _setupStressTestToggle() {
        const toggle = document.getElementById('stressTestToggle');
        const panel  = document.getElementById('stressTestPanel');
        if (!toggle || !panel) return;

        const seqCheck   = document.getElementById('stressSeqReturns');
        const crashRow   = document.getElementById('crashYearRow');
        const crashCheck = document.getElementById('stressMarketCrash');

        const updateCrashYearRowVisibility = () => {
            if (!crashRow) return;
            const hide = !!(seqCheck && seqCheck.checked) || !(crashCheck && crashCheck.checked);
            crashRow.classList.toggle('hidden', hide);
        };

        if (seqCheck) {
            seqCheck.addEventListener('change', () => {
                if (seqCheck.checked && crashCheck) crashCheck.checked = false;
                updateCrashYearRowVisibility();
            });
        }
        if (crashCheck) {
            crashCheck.addEventListener('change', () => {
                if (crashCheck.checked && seqCheck) seqCheck.checked = false;
                updateCrashYearRowVisibility();
            });
        }
        updateCrashYearRowVisibility();

        toggle.addEventListener('click', () => {
            const icon = toggle.querySelector('[data-accordion-icon]');
            const isOpen = !panel.classList.contains('hidden');
            panel.classList.toggle('hidden', isOpen);
            if (icon) icon.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
        });
    }

    /* ------------------------------------------------------------------ */
    /* ASIC disclaimer collapse                                             */
    /* ------------------------------------------------------------------ */

    _setupDisclaimerCollapse() {
        const btn  = document.getElementById('disclaimerCollapseBtn');
        const body = document.getElementById('disclaimerBody');
        if (!btn || !body) return;
        btn.addEventListener('click', () => {
            const open = !body.classList.contains('hidden');
            body.classList.toggle('hidden', open);
            btn.textContent = open ? 'Show details' : 'Hide details';
        });
    }

    /* ------------------------------------------------------------------ */
    /* "How this is calculated" methodology accordion                       */
    /* ------------------------------------------------------------------ */

    _setupMethodologyAccordion() {
        const btn  = document.getElementById('methodologyToggle');
        const body = document.getElementById('methodologyBody');
        if (!btn || !body) return;
        btn.addEventListener('click', () => {
            const open = !body.classList.contains('hidden');
            body.classList.toggle('hidden', open);
            const icon = btn.querySelector('[data-accordion-icon]');
            if (icon) icon.style.transform = open ? 'rotate(0deg)' : 'rotate(180deg)';
        });
    }

    /* ------------------------------------------------------------------ */
    /* Real vs Nominal toggle (re-renders results if already calculated)    */
    /* ------------------------------------------------------------------ */

    _setupRealNominalToggle() {
        const toggle = document.getElementById('realNominalToggle');
        if (!toggle) return;
        toggle.addEventListener('change', () => {
            if (this.lastResults) {
                const inputs = this._gatherInputs();
                this._calculate(inputs);
            }
        });
    }

    /* ------------------------------------------------------------------ */
    /* Calculate button                                                     */
    /* ------------------------------------------------------------------ */

    _setupCalculateButton() {
        const btn = document.getElementById('calculateBtn');
        if (!btn) return;
        btn.addEventListener('click', () => {
            const inputs = this._gatherInputs();
            if (!this._validate(inputs)) return;
            this._calculate(inputs);
        });
    }

    /* ------------------------------------------------------------------ */
    /* Gather inputs from form                                              */
    /* ------------------------------------------------------------------ */

    _gatherInputs() {
        const get = id => {
            const el = document.getElementById(id);
            return el ? Number(el.value) : 0;
        };
        const checked = id => {
            const el = document.getElementById(id);
            return el ? el.checked : false;
        };

        // Contribution: could be % of salary or $
        const contribAudHidden = document.getElementById('contribAudRow')?.classList.contains('hidden');
        let annualContribution;
        if (contribAudHidden) {
            // % mode
            const pct    = get('contribPct') / 100;
            const salary = get('currentSalary');
            annualContribution = salary * pct;
        } else {
            annualContribution = get('annualContribution');
        }

        // Withdrawal: could be % of balance or $
        const withdrawAudHidden = document.getElementById('withdrawAudRow')?.classList.contains('hidden');
        let annualWithdrawal;
        if (withdrawAudHidden) {
            const pct = get('withdrawPct') / 100;
            // Estimate retirement balance from current inputs to avoid using stale lastResults
            const _age    = get('currentAge');
            const _retAge = get('retirementAge');
            const _super  = get('currentSuper');
            const _rate   = (get('superReturn') || 7.5) / 100;
            const _yrs    = Math.max(0, _retAge - _age);
            const _estBal = _yrs > 0 && _rate > 0
                ? _super * Math.pow(1 + _rate, _yrs)
                  + annualContribution * ((Math.pow(1 + _rate, _yrs) - 1) / _rate)
                : _super + annualContribution * _yrs;
            annualWithdrawal = (_estBal || this.lastResults?.retirementBalance || 500_000) * pct;
        } else {
            annualWithdrawal = get('annualWithdrawal');
        }

        return {
            currentAge:           get('currentAge'),
            retirementAge:        get('retirementAge'),
            planningHorizon:      get('planningHorizon'),
            currentSuper:         get('currentSuper'),
            annualContribution,
            currentSalary:        get('currentSalary'),
            additionalSavings:    get('additionalSavings'),
            annualSavingsContrib: get('annualSavingsContrib'),
            superReturn:          get('superReturn'),
            savingsReturn:        get('savingsReturn'),
            inflation:            get('inflation'),
            realTerms:            checked('realNominalToggle'),
            annualWithdrawal,
            inflationAdjusted:    checked('inflationAdjusted'),
            stressSeqReturns:     checked('stressSeqReturns'),
            stressMarketCrash:    checked('stressMarketCrash'),
            crashYear:            get('crashYear') || 1,
        };
    }

    /* ------------------------------------------------------------------ */
    /* Validation                                                           */
    /* ------------------------------------------------------------------ */

    _validate(inputs) {
        const errors = [];
        if (inputs.currentAge < 18 || inputs.currentAge > 85)
            errors.push('Current age must be between 18 and 85.');
        if (inputs.retirementAge <= inputs.currentAge)
            errors.push('Retirement age must be greater than current age.');
        if (inputs.planningHorizon <= inputs.retirementAge)
            errors.push('Planning horizon must be greater than retirement age.');
        if (inputs.superReturn <= 0 || inputs.superReturn > 15)
            errors.push('Super return must be between 0.1% and 15%.');
        if (inputs.inflation < 0 || inputs.inflation > 8)
            errors.push('Inflation rate must be between 0% and 8%.');

        const errBox = document.getElementById('validationErrors');
        if (errBox) {
            if (errors.length > 0) {
                errBox.innerHTML = errors.map(e => `<p class="text-sm">• ${e}</p>`).join('');
                errBox.classList.remove('hidden');
                errBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                return false;
            } else {
                errBox.classList.add('hidden');
            }
        }
        return errors.length === 0;
    }

    /* ------------------------------------------------------------------ */
    /* Core calculation → render                                            */
    /* ------------------------------------------------------------------ */

    _calculate(inputs) {
        const btn = document.getElementById('calculateBtn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Calculating…';
        }

        // Use setTimeout so the browser can repaint before heavy work
        setTimeout(() => {
            try {
                const results   = this.engine.calculate(inputs);
                const scenarios = this.engine.calculateScenarioRanges(inputs);
                const sensitivity = this.engine.calculateSensitivity(inputs);

                this.lastResults   = results;
                this.lastScenarios = scenarios;

                this._renderPrimaryResults(results, inputs);
                this._renderScenarioTable(scenarios, inputs);
                this._renderSensitivity(sensitivity);
                this._renderStressTest(inputs, results);
                this._renderChart(results, scenarios, inputs);

                const section = document.getElementById('resultsSection');
                if (section) {
                    section.classList.remove('hidden');
                    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            } catch (err) {
                console.error('Calculation error:', err);
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.textContent = 'Run Model';
                }
            }
        }, 30);
    }

    /* ------------------------------------------------------------------ */
    /* Primary results panel                                                */
    /* ------------------------------------------------------------------ */

    _renderPrimaryResults(results, inputs) {
        const fmt = n => '$' + Math.round(n).toLocaleString('en-AU');
        const set = (id, html) => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = html;
        };

        set('res-income',  fmt(results.annualRetirementIncome));
        set('res-balance', fmt(results.retirementBalance));
        set('res-pension', fmt(results.agePensionEstimate));

        // Income replacement ratio with colour coding
        const irrEl = document.getElementById('res-irr');
        if (irrEl) {
            if (results.incomeReplacementRatio !== null) {
                const irr = results.incomeReplacementRatio;
                let colour = irr >= 70 ? 'text-green-600' : irr >= 50 ? 'text-amber-500' : 'text-red-500';
                irrEl.innerHTML = `<span class="${colour} font-bold">${irr.toFixed(1)}%</span> of pre-retirement salary`;
            } else {
                irrEl.textContent = 'Enter a salary to compute this ratio.';
            }
        }

        // Depletion / longevity notice
        const depletionEl   = document.getElementById('res-depletion');
        const failureNotice = document.getElementById('failureNotice');
        const failureAge    = document.getElementById('failureAge');
        if (depletionEl) {
            if (results.depletionYear && results.depletionYear <= results.planningHorizon) {
                depletionEl.innerHTML = `<span class="text-red-600 font-semibold">Funds projected to be exhausted at age ${results.depletionYear}</span>`;
                if (failureNotice) failureNotice.classList.remove('hidden');
                if (failureAge)    failureAge.textContent = results.depletionYear;
            } else {
                depletionEl.innerHTML = `<span class="text-green-600 font-semibold">Funds projected to last to age ${results.planningHorizon} (planning horizon)</span>`;
                if (failureNotice) failureNotice.classList.add('hidden');
            }
        }

        // Monte Carlo statistics — show success rate and income range when present
        const mcEl = document.getElementById('res-mc-stats');
        if (mcEl && results.mcRuns) {
            const successPct = Math.round((results.successRate || 0) * 100);
            const p10 = fmt(results.p10Income || 0);
            const p90 = fmt(results.p90Income || 0);
            let colour = successPct >= 80 ? 'text-green-700' : successPct >= 60 ? 'text-amber-600' : 'text-red-600';
            mcEl.innerHTML =
                `<span class="${colour} font-semibold">${successPct}% probability of success</span>` +
                ` &nbsp;·&nbsp; income range (p10–p90): ${p10} – ${p90}/yr` +
                ` &nbsp;·&nbsp; <span class="text-gray-500 text-xs">${results.mcRuns} simulations (median shown)</span>`;
        }

        // Real/Nominal label
        const termLabel = document.getElementById('res-termLabel');
        if (termLabel) {
            termLabel.textContent = inputs.realTerms
                ? "(all amounts in today's dollars — real terms)"
                : '(all amounts in future nominal dollars)';
        }
    }

    /* ------------------------------------------------------------------ */
    /* Scenario comparison table                                            */
    /* ------------------------------------------------------------------ */

    _renderScenarioTable(scenarios, inputs) {
        const fmt    = n => '$' + Math.round(n).toLocaleString('en-AU');
        const depAge = r  => r.depletionYear && r.depletionYear <= r.planningHorizon
            ? `Age ${r.depletionYear}` : `Age ${r.planningHorizon}+`;

        const rows = [
            { label: 'Conservative', key: 'conservative', cls: 'text-blue-700' },
            { label: 'Balanced',     key: 'balanced',     cls: 'text-indigo-700' },
            { label: 'Aggressive',   key: 'aggressive',   cls: 'text-purple-700' },
        ];

        const tbody = document.getElementById('scenarioTableBody');
        if (!tbody) return;
        tbody.innerHTML = rows.map(row => {
            const r = scenarios[row.key];
            return `<tr class="border-t border-gray-200">
                <td class="py-2 px-3 font-medium ${row.cls}">${row.label}</td>
                <td class="py-2 px-3">${fmt(r.annualRetirementIncome)}</td>
                <td class="py-2 px-3">${fmt(r.retirementBalance)}</td>
                <td class="py-2 px-3">${depAge(r)}</td>
            </tr>`;
        }).join('');
    }

    /* ------------------------------------------------------------------ */
    /* Sensitivity analysis                                                 */
    /* ------------------------------------------------------------------ */

    _renderSensitivity(drivers) {
        const container = document.getElementById('sensitivityList');
        if (!container) return;

        container.innerHTML = drivers.map((d, i) => {
            const sign  = d.impact >= 0 ? '+' : '';
            const colour = d.impact >= 0 ? 'text-green-600' : 'text-red-500';
            const barW  = Math.min(100, Math.abs(d.impact) / 500);   // rough scale
            return `
            <div class="mb-4">
                <div class="flex justify-between mb-1">
                    <span class="font-medium text-sm text-gray-800">${i + 1}. ${d.label}</span>
                    <span class="text-sm font-semibold ${colour}">${sign}$${Math.abs(Math.round(d.impact)).toLocaleString('en-AU')}/yr</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="h-2 rounded-full ${d.impact >= 0 ? 'bg-green-500' : 'bg-red-400'}" style="width:${barW}%"></div>
                </div>
                <p class="text-xs text-gray-600 mt-1">${d.description}</p>
            </div>`;
        }).join('');
    }

    /* ------------------------------------------------------------------ */
    /* Stress test results                                                  */
    /* ------------------------------------------------------------------ */

    _renderStressTest(inputs, baseResults) {
        const stressSection = document.getElementById('stressTestResults');
        if (!stressSection) return;

        const anyStress = inputs.stressSeqReturns || inputs.stressMarketCrash;
        if (!anyStress) {
            stressSection.classList.add('hidden');
            return;
        }

        const stressType = inputs.stressSeqReturns ? 'sequence-of-returns' : 'market-crash';
        const stressYear = inputs.crashYear;
        const stressed   = this.engine.runStressTest(inputs, stressType, stressYear);

        const fmt = n => '$' + Math.round(n).toLocaleString('en-AU');
        const depBase    = baseResults.depletionYear  ?? baseResults.planningHorizon;
        const depStressed = stressed.depletionYear    ?? stressed.planningHorizon;
        const diff        = depBase - depStressed;

        const label = stressType === 'sequence-of-returns'
            ? 'Sequence-of-returns stress (−10% in years 1–3 of retirement)'
            : `Market crash stress (−25% shock at retirement year ${stressYear})`;

        stressSection.classList.remove('hidden');
        const out = document.getElementById('stressTestOutput');
        if (out) {
            out.innerHTML = `
            <p class="font-medium text-amber-800 mb-2">${label}</p>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div>
                    <p class="text-gray-500">Stressed income</p>
                    <p class="font-bold text-gray-900">${fmt(stressed.annualRetirementIncome)}/yr</p>
                </div>
                <div>
                    <p class="text-gray-500">Without stress</p>
                    <p class="font-bold text-gray-900">Funds last to age ${depBase}</p>
                </div>
                <div>
                    <p class="text-gray-500">With stress</p>
                    <p class="font-bold ${diff > 0 ? 'text-red-600' : 'text-green-700'}">
                        Funds last to age ${depStressed}${diff > 0 ? ` (${diff} yr${diff !== 1 ? 's' : ''} shorter)` : ''}
                    </p>
                </div>
            </div>
            <p class="mt-3 text-xs text-amber-700">This models the impact of poor early-retirement returns. Results are illustrative only — actual outcomes depend on many factors outside this model.</p>`;
        }
    }

    /* ------------------------------------------------------------------ */
    /* Chart.js balance-over-time chart                                     */
    /* ------------------------------------------------------------------ */

    _renderChart(results, scenarios, inputs) {
        const canvas = document.getElementById('balanceChart');
        if (!canvas || typeof Chart === 'undefined') return;

        const theme     = localStorage.getItem('retirement-calc-theme') || 'light';
        const gridColor = theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';
        const textColor = theme === 'dark' ? '#d1d5db' : '#374151';

        // Collect ages across all scenarios (use balanced as master)
        const masterYears   = results.yearByYear;
        const conservYears  = scenarios.conservative.yearByYear;
        const aggressYears  = scenarios.aggressive.yearByYear;

        const labels = masterYears.map(y => y.age);
        const toData = arr => arr.map(y => y.totalBalance);

        const retireIdx = masterYears.findIndex(y => y.phase === 'decumulation');

        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }

        // Inline plugin for the retirement-age vertical marker (no external plugin needed)
        const retireLinePlugin = retireIdx >= 0 ? [{
            id: 'retireLine',
            afterDraw(chart) {
                const { ctx, scales: { x: xScale, y: yScale } } = chart;
                const px = xScale.getPixelForValue(retireIdx);
                ctx.save();
                ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
                ctx.lineWidth = 2;
                ctx.setLineDash([6, 3]);
                ctx.beginPath();
                ctx.moveTo(px, yScale.top);
                ctx.lineTo(px, yScale.bottom);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.fillStyle = '#ef4444';
                ctx.font = '11px sans-serif';
                ctx.fillText(`Retire age ${inputs.retirementAge}`, px + 4, yScale.top + 14);
                ctx.restore();
            },
        }] : [];

        this.chart = new Chart(canvas, {
            type: 'line',
            plugins: retireLinePlugin,
            data: {
                labels,
                datasets: [
                    {
                        label: 'Balanced scenario',
                        data:  toData(masterYears),
                        borderColor:     'rgba(99, 102, 241, 1)',
                        backgroundColor: 'rgba(99, 102, 241, 0.08)',
                        borderWidth: 2.5,
                        pointRadius: 0,
                        fill: false,
                        tension: 0.3,
                    },
                    {
                        label: 'Conservative scenario',
                        data:  toData(conservYears),
                        borderColor:     'rgba(59, 130, 246, 0.6)',
                        backgroundColor: 'transparent',
                        borderWidth: 1.5,
                        borderDash: [5, 4],
                        pointRadius: 0,
                        fill: false,
                        tension: 0.3,
                    },
                    {
                        label: 'Aggressive scenario',
                        data:  toData(aggressYears),
                        borderColor:     'rgba(139, 92, 246, 0.6)',
                        backgroundColor: 'transparent',
                        borderWidth: 1.5,
                        borderDash: [5, 4],
                        pointRadius: 0,
                        fill: false,
                        tension: 0.3,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: {
                        labels: { color: textColor, font: { size: 12 } },
                    },
                    tooltip: {
                        callbacks: {
                            label: ctx => {
                                const v = ctx.parsed.y;
                                return `${ctx.dataset.label}: $${Math.round(v).toLocaleString('en-AU')}`;
                            },
                        },
                    },
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Age', color: textColor },
                        ticks: { color: textColor, maxTicksLimit: 15 },
                        grid:  { color: gridColor },
                    },
                    y: {
                        title: { display: true, text: inputs.realTerms ? 'Balance (today\'s $)' : 'Balance (nominal $)', color: textColor },
                        ticks: {
                            color: textColor,
                            callback: v => '$' + (v >= 1_000_000
                                ? (v / 1_000_000).toFixed(1) + 'M'
                                : (v / 1_000).toFixed(0) + 'K'),
                        },
                        grid:  { color: gridColor },
                    },
                },
            },
        });
    }
}

/* ------------------------------------------------------------------ */
/* Bootstrap                                                            */
/* ------------------------------------------------------------------ */

document.addEventListener('DOMContentLoaded', () => {
    const ui = new AdvancedDesignUI();
    ui.init();
});
