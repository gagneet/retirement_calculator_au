# Australian Retirement Calculator

A comprehensive, privacy-first retirement planning tool built specifically for the Australian financial system. Runs entirely in the browser — no data leaves your device.

Covers superannuation optimisation, investment property, age pension, stochastic Monte Carlo simulation, and AI-generated recommendations across the full retirement lifecycle.

---

## Version History

### v2.4.0 — Canonical Save Schema & UI Enhancements (July 2026)

- **Canonical Save Schema**: Unified the JSON save format between Classic Advanced and Advanced V2 calculators. Both pages now export a consistent `userData` object using the classic expanded schema, ensuring cross-page compatibility.
- **UI State Preservation**: Page-specific UI state (like V2's Target Builder settings) is now preserved under `uiState.advancedV2`, outside the main `userData`.
- **Advanced V2 UI Enhancements**: Key retirement metrics (paycheck, super at retirement, funded breakdown) now display both today's dollars and nominal future values, improving transparency around inflation impacts.
- **Import/Export Reliability**: Fixed several omissions in the V2 mapping function (`buildEngineInputs`) and ensured consistent unit handling (percentages vs. decimals) across all save operations.
- **User Safety**: Added a confirmation dialog before loading data from a JSON file to prevent accidental loss of unsaved changes.

### v2.3.0 — Stochastic Simulation, Median Output & PDF Fixes (June 2026)

**Simulation engine overhaul across all three calculation pipelines:**

- **Per-year stochastic rates**: Growth rates are now drawn independently each year from a normal distribution (Box-Muller transform) rather than applying a single fixed compound rate across all years. Each year gets its own inflation, property growth, salary growth, super return and savings return.
- **Median output**: All Monte Carlo results now report the **median** outcome (p50), not the average. The median is the run at the 50th percentile of retirement income outcomes — a single self-consistent simulation path. `successRate`, `p10Income`, and `p90Income` are also returned.
- **Nominal vs real values**: Savings balances are shown in nominal (actual) dollars. A $100 deposit at 10% for 10 years shows ~$270, not ~$151 in today's dollars. Expenses grow at the inflation rate. The "real terms" toggle remains available as a user-controlled display option.
- **Cumulative inflation fix**: Fixed a compounding bug where `fixedSpending()` was raising a single randomly-drawn year's inflation rate to the power of N years (`(draw)^N`). The correct formula accumulates year-by-year: `base × (1+i₁) × (1+i₂) × … × (1+iₙ)`. The retirement-phase cumulative factor now correctly resets to 1 at retirement start (base spending is in nominal retirement-year dollars) and accumulates *after* spending is calculated each year.
- **Asset-class volatility**: Each asset class uses a calibrated sigma:
  - Super / investment returns: σ = max(3%, rate × 60%)
  - Property growth: σ = max(3%, rate × 60%), floor −15%
  - Savings / cash: σ = max(0.5%, rate × 30%), floor 0% (deposit guarantee)
  - Salary growth: σ = max(0.5%, rate × 40%), floor −5%
  - Inflation (CPI): σ = max(0.5%, rate × 40%), floor 0.1%
  - Healthcare inflation: σ = max(1%, rate × 40%)
- **Salary ageism modelling** (opt-in via `enableAgeism`): Models late-career salary stagnation from age discrimination, reduced advancement, and health factors. Configurable onset age (`ageismStartAge`, default 50). Pattern: zero growth for first 3 years after onset → modest capped growth thereafter.
- **PDF fixes**:
  - Removed emoji characters from PDF output (jsPDF built-in fonts are Latin-1 only; emoji produced garbled/corrupt text).
  - Fixed `exportSuggestionsAsPdf()` argument-order bug: suggestions data was being passed as the third argument (`chartManager`) instead of the fourth (`app` bridge), breaking chart rendering and suppressing the Suggestions & Action Plan section.
  - Added `currentSuggestions` to the export app bridge so both the standard PDF button and the action-plan PDF export include recommendations.
- **MC representative run**: Fixed inconsistency where the median-balance run's fields were mixed with a separately-computed income median. All returned fields now come from the single run at the 50th percentile of income outcomes.
- **Sensitivity analysis**: `calculateSensitivity()` switches to a deterministic baseline to avoid Monte Carlo noise obscuring small parameter deltas.

### v2.2.0 — Reverse Planner Deep Analysis & Review Hardening (June 2026)

- **Reverse Retirement Planner** at `reverse.html`: Goal-seeking planner that answers "what needs to change today?" Uses bisection solvers to find the minimum adjustment required across 11 levers (salary, super contributions, retirement age, super balance, savings, mortgage, rent, spending, estate, home value, investment balance).
- **Deep Analysis Panels**: Four "what-if?" cards after the main calculation:
  - *When can I retire* — required salary at each retirement age (55–75)
  - *What you need today* — required home value and investment balance
  - *Salary reduction tolerance* — how much salary can drop while still meeting the goal
  - *Optimal overseas move age* — earliest age at which overseas retirement works
- **Forward Projection Bridge**: `forward-projection-bridge.js` reads `rc_forward_projection_v1` from localStorage, enabling data flow from the Advanced Calculator into the Reverse Planner.
- **PDF Export** (reverse planner): jsPDF-based report with autoTable comparison table, ranked action plan, and full disclaimer.
- **Simulator fixes**: Stochastic inflation uses per-year per-run rates; franking credits have NaN protection.
- **Test suite**: 9 test files, 2,539 tests covering solvers, round-trips, gap analysis, baseline adapter, scenarios, projection bridge, parity, integration, and bridge integration.

### v2.1.1 — Reverse Retirement Planner (June 2026)

Initial release of the Reverse Planner with bisection solvers, comparison tables, scenario cards, and PDF export.

### v2.1.0 — Final QA, Policy & Export Hardening (June 2026)

- Terminology alignment: Core Projection, Suggestions & Action Plan, salary package modes, SG cap, Division 293 warning, future property, windfall.
- Export coverage: PDF and XLSX include package mode, calculated cash salary, employer SG, SG override, concessional cap status, Division 293 warning, scenario-only vs included-in-base status.
- Performance: Core Projection does not eagerly run Suggestions, stress tests, overseas or retirement-age tools — on-demand only, marked stale after input changes.
- Full Jest suite: 41 suites / 934 tests.

### v2.0.0 — Advanced Calculator v2 & Super Guarantee Salary Package Handling (June 2026)

- **Salary input modes**: Base salary excluding super vs. total package including super.
- **Maximum contribution base**: 2025-26 cap ($62,500/quarter, $250,000 annualised); compulsory SG capped at $30,000.
- **Concessional cap visibility**: Salary sacrifice guidance includes employer SG, prior contributions, remaining room under the $30,000 cap.
- **Division 293 warnings**: High-income cases where concessional contributions may attract additional 15% tax.
- **Shared policy helper**: Advanced, advanced-v2, and simplified calculator all use the same employer SG/package calculation path.

### v1.x — Advanced Calculator (2025–2026)

- 4-column responsive grid layout (Personal & Risk Profile, Property Portfolio, Economic & Asset Allocation, Australian Pension System)
- Monte Carlo simulation (500–10,000 runs), stress testing, scenario comparison
- Comprehensive Decision Support Engine across 8 strategic areas
- Onboarding wizard with 5-step guided flow
- Healthcare cost inflation (6.5%), aged care probability modelling
- Investment property with CGT, negative gearing, depreciation
- Age pension asset/income test with deeming rates
- Trust structure analysis (family trusts, SMSF)
- Market cycle analysis for Sydney, Melbourne, Brisbane, Perth, Adelaide
- XLSX and PDF export with multi-sheet workbooks

---

## Calculator Pages

| Page | URL | Purpose |
|------|-----|---------|
| Landing | `index.html` | Product overview and quick-start |
| Advanced Calculator | `advanced.html` | Full retirement projection (onboarding wizard) |
| Advanced v2 | `advanced-v2.html` | Streamlined advanced calculator with MC, stress tests, overseas analysis |
| Reverse Planner | `reverse.html` | Goal-seeking: what needs to change today? |

---

## Key Features

### Stochastic Simulation (three pipelines)

**Pipeline A — `simulator.js` / `RetirementSimulator`**
Used by `app.js` (classic advanced calculator).

- `stochasticRate(rate, isStochastic, floor, sigma)` draws from N(rate, σ) via Box-Muller; legacy two-arg call automatically detected.
- `getSalaryForYear()`: supports `standard`, `career`, `stagnant` growth types; optional ageism modelling (opt-in); reduced income scenarios; carer reduction.
- Monte Carlo: 500–10,000 runs; success rate; percentile outcomes.

**Pipeline B — `life_simulation_engine.js`**
Used by `advanced-v2.js`.

- Per-year draws at the top of each year's loop for: inflation, healthcare inflation, property growth, salary growth.
- Cumulative inflation factor `(1+i₁)×(1+i₂)×…` passed to `spending_engine.js` for the FIXED spending strategy.
- Sub-engines (`super_engine`, `investment_engine`, `property_engine`, `expense_engine`, `income_engine`) each accept an optional `yearXxxReturn` override from the caller; fall back to their own stochastic draw or deterministic median.

**Pipeline C — `advanced-design-engine.js`**
Used by the advanced-design page.

- Full Monte Carlo (500 runs by default, configurable).
- `_runSimulation(p, stress, stochastic)`: per-year draws for super, savings, inflation.
- `_runMonteCarlo(p, numRuns)`: runs N paths, sorts by `annualRetirementIncome`, returns the median run as a self-consistent result plus `successRate`, `p10Income`, `p90Income`.
- `calculateDeterministic(inputs)`: single fixed-rate run for explainability/sensitivity.
- `calculateSensitivity(inputs)`: uses deterministic baseline to avoid MC noise in delta comparisons.

### Australian Financial System

- **Superannuation**: 12% SG with salary package modes, maximum contribution base ($62,500/quarter), concessional cap ($30,000), non-concessional cap ($120,000), $3M tax, carry-forward rules, Transfer Balance Cap ($2M from July 2025), Division 293 warnings.
- **Age Pension**: Asset test (taper $3/fortnight per $1,000 over threshold), income test with deeming rates, work bonus.
- **Tax**: 2024-25 progressive brackets, CGT 50% discount, franking credits, negative gearing, PAYG withholding.
- **Healthcare**: 6.5% healthcare-specific inflation (vs. 2.9% general CPI), aged care probability modelling (65% likelihood, $350K–$550K lifetime cost).

### Salary Ageism Modelling (opt-in)

Enable via `inputs.enableAgeism = true`. Configure onset with `inputs.ageismStartAge` (default: 50).

**Pattern:**
- Years 0–2 after onset: no growth (real salary stagnates in Pipeline A / nominal salary frozen in Pipeline B)
- Year 3+: growth capped at 0.5% above the pipeline's baseline

**Pipeline distinction:**
- Pipeline A (`getSalaryForYear`): caps the *real* growth component. Salary still keeps pace with CPI during the static phase.
- Pipeline B (`projectSalary`): caps the *nominal* growth rate. Real purchasing power declines during the static phase (stronger effect).

### PDF Export

- jsPDF 3.x + jsPDF-autotable for tables.
- Charts exported as JPEG via `chart.toBase64Image()`.
- Bottom-line section uses plain ASCII labels (emoji are not supported by jsPDF's built-in Latin-1 fonts).
- `exportToPDF(inputs, results, chartManager, app)`: fourth arg is the app bridge object containing Monte Carlo results, recommendations, stress tests, risk profile, allocation strategy, overseas data.
- `exportSuggestionsAsPdf(selectedRecs, band)`: passes `APP_STATE.chartManager` as third arg and a merged bridge (including `currentSuggestions`) as fourth — fixing a prior argument-order bug that suppressed the Suggestions section.

---

## File Structure

```
retirement_calculator_au/
├── src/
│   ├── js/
│   │   ├── simulator.js                  # Pipeline A: core simulation engine (RetirementSimulator class)
│   │   ├── app.js                        # Main app controller for classic advanced calculator
│   │   ├── utils.js                      # Formatting, DOM helpers, PDF/XLSX/CSV export
│   │   ├── charts.js                     # Chart.js rendering (fan, histogram, allocation, property)
│   │   ├── config.js                     # Tax brackets, super caps, pension thresholds, defaults
│   │   ├── enhanced-config.js            # Extended config with healthcare, aged care, stress parameters
│   │   │
│   │   ├── simulation_engine/            # Pipeline B sub-engines (used by life_simulation_engine)
│   │   │   ├── life_simulation_engine.js # Year-by-year simulation orchestrator (Pipeline B)
│   │   │   ├── income_engine.js          # Salary projection, ageism modelling
│   │   │   ├── expense_engine.js         # Living expenses, healthcare costs (per-year inflation)
│   │   │   ├── spending_engine.js        # Retirement spending strategies (fixed, guardrails, %)
│   │   │   ├── super_engine.js           # Super balance growth, contribution calculations
│   │   │   ├── investment_engine.js      # Savings and investment asset growth
│   │   │   ├── property_engine.js        # Property value growth, rental yield, CGT
│   │   │   ├── pension_engine.js         # Age pension calculations
│   │   │   ├── tax_engine.js             # Income tax, CGT, Medicare levy
│   │   │   ├── financial_state.js        # Year-state snapshot structure
│   │   │   ├── life_event_engine.js      # Life events (windfall, inheritance, carer)
│   │   │   ├── monte_carlo_engine.js     # MC orchestration for Pipeline B
│   │   │   ├── recommendation_engine.js  # In-engine recommendation generation
│   │   │   ├── shock_engine.js           # Market shock events
│   │   │   ├── strategy_engine.js        # Optimisation strategies
│   │   │   └── index.js                  # Barrel export
│   │   │
│   │   ├── advanced-design-engine.js     # Pipeline C: AdvancedDesignEngine class (MC, sensitivity)
│   │   ├── advanced-design-ui.js         # Pipeline C UI renderer
│   │   ├── advanced-v2.js                # Advanced v2 page controller (uses Pipeline B)
│   │   │
│   │   ├── decision-support-engine.js    # Strategic recommendations across 8 areas
│   │   ├── enhanced-monte-carlo.js       # High-run-count MC (5,000+) with confidence scoring
│   │   ├── market-data.js                # Australian property market cycles (2020-2026)
│   │   ├── tax-optimizer.js              # Tax optimisation strategies
│   │   ├── property-analysis.js          # Investment property cash flow and CGT
│   │   ├── dynamic-allocation-engine.js  # Age-based asset allocation glide paths
│   │   ├── risk-profiling-engine.js      # Three-dimensional risk assessment
│   │   ├── healthcare-modeling.js        # Healthcare cost inflation and aged care
│   │   ├── overseas-retirement.js        # Overseas retirement cost and pension portability
│   │   ├── country-profiles.js           # Country-specific retirement cost data
│   │   ├── scenario-matrix.js            # Multi-scenario comparison matrix
│   │   ├── what-if-engine.js             # What-if scenario analysis
│   │   ├── outcome-engine.js             # Outcome band classification
│   │   ├── outcome-bands.js              # Band thresholds and labels
│   │   ├── action-generator.js           # Action item generation for outcome bands
│   │   ├── suggestions-ui.js             # Suggestions & Action Plan UI
│   │   ├── trust-ui.js                   # Trust structure UI
│   │   ├── policy-engine.js              # Super policy calculations (SG, caps, Division 293)
│   │   ├── super-policy.js               # Super policy constants and helpers
│   │   ├── policy-sources.js             # Policy data sources and citations
│   │   ├── resilience-scenarios.js       # Stress test scenario definitions
│   │   ├── retirement-cost-analyzer.js   # Retirement cost breakdown analysis
│   │   ├── cgt-calculator.js             # Capital gains tax calculations
│   │   ├── contribution-calculator.js    # Contribution cap and tax calculations
│   │   ├── housing-optimizer.js          # Downsizing and home equity strategies
│   │   ├── personalized-qa-engine.js     # Personalised Q&A recommendations
│   │   ├── persona-intelligence.js       # Financial persona detection (High Earner, etc.)
│   │   ├── onboarding-wizard.js          # 5-step guided onboarding experience
│   │   ├── config-helper.js              # Config access helpers
│   │   ├── performance-profiler.js       # Render timing and profiling
│   │   ├── analytics.js                  # Usage analytics
│   │   ├── theme.js                      # Light/dark mode
│   │   ├── site-chrome.js                # Shared header/footer
│   │   ├── version-manager.js            # Version display
│   │   ├── field-tooltips.js             # Input field tooltip content
│   │   ├── comparison.js                 # Side-by-side plan comparison
│   │   ├── animated-demo.js              # Landing page animations
│   │   ├── howto-interactive.js          # Interactive how-to guide
│   │   │
│   │   ├── reverse-planner.js            # Reverse planner orchestration
│   │   ├── reverse-solver.js             # Bisection goal-seeking solvers (11 levers)
│   │   ├── reverse-ui.js                 # Reverse planner page controller (webpack entry)
│   │   ├── reverse-gap-analysis.js       # Gap comparison tables
│   │   ├── reverse-baseline-adapter.js   # Forward calculator data import
│   │   ├── reverse-scenarios.js          # Scenario comparison cards
│   │   ├── reverse-report.js             # PDF and plain-English report generators
│   │   ├── reverse-deep-analysis.js      # "What-if?" deep-dive (retirement age curve, etc.)
│   │   ├── reverse-success-predicate.js  # Success/failure evaluation for reverse planner
│   │   └── forward-projection-bridge.js  # Reads localStorage projection for reverse planner
│   │
│   ├── css/
│   │   └── styles.css
│   ├── assets/
│   ├── advanced.html
│   ├── advanced-v2.html
│   ├── reverse.html
│   └── index.html
│
├── tests/
│   └── unit/                             # Jest test suite
│
├── dist/                                 # Webpack build output
├── webpack.config.js
├── package.json                          # v2.3.0
├── CLAUDE.md                             # AI assistant context and development guide
└── README.md
```

---

## Setup

### Prerequisites

- Node.js 18+, npm 9+

### Quick Start

```bash
git clone <repository-url>
cd retirement_calculator_au
npm install
npm run build
# Serve dist/ via any HTTP server — file:// will not work (ES6 modules)
npx serve dist
# Open http://localhost:3000/advanced-v2.html
```

### Development

```bash
npm run dev        # webpack watch mode
npm test           # Jest unit tests
npm run test:watch # Jest in watch mode
```

### Serving Options

```bash
python -m http.server 8000     # Python 3
npx serve dist                 # Node.js (recommended)
php -S localhost:8000          # PHP
```

Always serve from `dist/`, not `src/` — webpack handles module bundling.

---

## Calculation Model

### Nominal vs Real Values

Savings balances are shown in **nominal** (actual future) dollars throughout. Inflation is not subtracted from savings balances — it only inflates expense projections. Example: $100 at 10% for 10 years = **$270 shown**, not $151. Purchasing power is a separate optional display toggle.

### Stochastic Rate Model

Each year draws its own rate independently from N(median, σ). The sigma for each asset class:

| Asset class | σ formula | Floor |
|-------------|-----------|-------|
| Super / equity returns | max(3%, rate × 60%) | −30% |
| Investment assets | max(2%, rate × 50%) | — |
| Property | max(3%, rate × 60%) | −15% |
| Savings / cash | max(0.5%, rate × 30%) | 0% |
| Salary growth | max(0.5%, rate × 40%) | −5% |
| CPI inflation | max(0.5%, rate × 40%) | 0.1% |
| Healthcare inflation | max(1%, rate × 40%) | 0.1% |

### Spending Strategies (Pipeline B)

Five strategies in `spending_engine.js`:

| Strategy | Description |
|----------|-------------|
| `fixed` | Base spending × cumulative inflation factor (year-by-year product) |
| `guardrails` | ±10% when portfolio crosses upper/lower guardrail thresholds |
| `percentage` | Fixed withdrawal rate of current portfolio |
| `floor_upside` | Essential floor + variable lifestyle component scaled to portfolio |
| `guyton_klinger` | Full Guyton-Klinger rule set (inflation adjustment, preservation, prosperity) |

### Superannuation (2025-26)

| Parameter | Value |
|-----------|-------|
| SG rate | 12% |
| Concessional cap | $30,000 |
| Non-concessional cap | $120,000 (if balance < $2M) |
| Maximum contribution base | $250,000 pa ($62,500/quarter) |
| Transfer Balance Cap | $2,000,000 (from July 2025) |
| $3M tax | 15% on earnings above $3M |
| Carry-forward | Up to 5 prior years' unused concessional cap (balance < $500K) |
| Division 293 threshold | $250,000 (income + concessional contributions) |

### Age Pension (2025-26)

- **Asset test**: $3/fortnight reduction per $1,000 above threshold
- **Income test**: deeming rates applied to financial assets
- **Work bonus**: additional income allowance for working pensioners
- Both tests applied; lower pension determines entitlement

---

## Australian Data Sources

| Source | Used For |
|--------|---------|
| ASFA Retirement Standard | Comfortable retirement income benchmarks |
| Australian Bureau of Statistics | Life expectancy, CPI, healthcare costs |
| Department of Social Services | Pension rates, asset/income thresholds |
| Reserve Bank of Australia | Cash rate, economic assumptions |
| Australian Institute of Health and Welfare | Aged care probability, costs |
| Australian Taxation Office | Tax brackets, super caps, CGT rules |
| CoreLogic / PropTrack / REI | Property market data and cycles |
| Treasury | $3M super tax, regulatory updates |

---

## Export and Reporting

| Format | Contents |
|--------|---------|
| PDF | Executive summary, MC results, AI recommendations, risk analysis, key assumptions, enhanced analysis sections, charts, year-by-year projections |
| XLSX | Summary sheet, year-by-year data, assumptions, AI recommendations, suggestions, persona recommendations |
| CSV | Year-by-year projections |
| JSON | Full input/output data for save/restore |

PDF generation uses jsPDF 3.x with jsPDF-autotable. Charts are embedded as JPEG images. All text uses Helvetica (Latin-1) — emoji are replaced with ASCII labels.

---

## Browser Compatibility

| Browser | Minimum Version |
|---------|----------------|
| Chrome | 90+ |
| Firefox | 85+ |
| Safari | 14+ |
| Edge | 90+ |

Required: ES2020, Canvas API, CSS Grid, localStorage, Web Workers (optional for background MC).

---

## Disclaimers

- **Not financial advice.** Results are estimates based on user inputs and assumptions.
- **No data leaves your device.** All computation runs in-browser.
- **Verify current rules.** Australian financial regulations change annually — confirm current super caps, pension thresholds, and tax brackets with the ATO and DSS.
- **Consult professionals.** Engage a licensed financial adviser before implementing any strategy suggested by this tool.

---

## Contributing

1. Follow the ES2020+ module pattern used throughout.
2. Add JSDoc on public functions.
3. Keep calculation logic in engine modules; keep UI concerns in `*-ui.js` files.
4. Run the full Jest suite before raising a PR: `npm test`.
5. Update `CLAUDE.md` when adding new modules or changing architecture.

---

*Last updated: July 2026 — v2.4.0 | Australian financial regulations as of 2025-26*
