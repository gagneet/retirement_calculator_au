# CLAUDE.md — Developer Context for AI Assistants

This file gives AI assistants the architectural context needed to work effectively on this codebase without re-deriving it from scratch each session.

---

## Project Overview

**Australian Retirement Calculator** — a browser-only (no backend) retirement planning tool for the Australian financial system. All computation runs in JavaScript in the browser. No data leaves the user's device.

**Tech stack**: ES2020 modules, webpack 5, Tailwind CSS (CDN), Chart.js, jsPDF 3.x, jsPDF-autotable, XLSX.js, Jest for unit tests.

**Current version**: 2.3.0 (June 2026)

---

## Three Simulation Pipelines

The most important architectural fact. There are **three separate calculation pipelines** that are largely independent:

### Pipeline A — `simulator.js` / `RetirementSimulator`

Used by `app.js` (the classic `advanced.html` calculator).

- Class-based: `new RetirementSimulator(config)`.
- `runSimulation(inputs)` → year-by-year array.
- `stochasticRate(centralRate, isStochastic, floor, sigma)` — Box-Muller normal draw. Legacy two-arg form `stochasticRate(rate, floor)` still works via detection.
- `getSalaryForYear(baseSalary, year, inputs, isPartner, overrideInflation, overrideSalaryGrowth)` — supports `salaryGrowthType` (`standard` / `career` / `stagnant`), lean years, reduced income scenarios, carer reduction, and optional ageism (`enableAgeism`).
- `runMonteCarlo(inputs, numRuns)` — runs N simulations, returns percentile array.

### Pipeline B — `simulation_engine/life_simulation_engine.js`

Used by `advanced-v2.js` (the `advanced-v2.html` calculator).

- Functional: `runLifeSimulation(userInputs)` → `{ yearlyData, summary }`.
- Delegates to sub-engines in `simulation_engine/`:
  - `income_engine.js` — `projectSalary`, `projectPartnerSalary`, `calcInvestmentIncome`
  - `expense_engine.js` — `projectLivingExpenses`, `projectHealthcareCosts`
  - `spending_engine.js` — `calculateSpending` (5 strategies)
  - `super_engine.js` — `growSuperBalance`, `calcSuperContributions`
  - `investment_engine.js` — `growInvestmentAssets`, `growSavings`
  - `property_engine.js` — `growPropertyValue`
  - `pension_engine.js` — age pension calculations
  - `tax_engine.js` — income tax, Medicare levy
  - `shock_engine.js` — market shocks
- Per-year stochastic draws happen at the **top of the year loop** in `life_simulation_engine.js` for: CPI inflation, healthcare inflation, property growth, salary growth. The drawn rate is passed as an optional override to the sub-engine functions.
- Sub-engine functions signature: `fn(currentValue, ..., inputs, yearXxxRate = null)`. When `yearXxxRate` is provided (Pipeline B stochastic mode), it takes precedence over `inputs.xxxRate`. When null, the function uses `inputs.xxxRate` (deterministic) or its own inline stochastic draw if `inputs.useStochasticReturns === true`.
- Cumulative inflation factor: maintained in `life_simulation_engine.js` as a year-by-year product. At retirement, the **retirement-phase factor resets to 1** (base spending is in nominal retirement-year dollars). The factor multiplies *after* spending is calculated so year-0 spending = base × 1. This is passed to `spending_engine.calculateSpending` as `cumulativeInflationFactor`.

### Pipeline C — `advanced-design-engine.js`

Used by the advanced-design page.

- Class-based: `new AdvancedDesignEngine()`.
- `calculate(inputs)` — runs 500 MC paths, returns median-income run.
- `calculateDeterministic(inputs)` — single fixed-rate projection for explainability.
- `calculateSensitivity(inputs)` — uses deterministic baseline; MC noise would obscure small deltas.
- `_runSimulation(p, stress, stochastic)` — core year-by-year loop with optional per-year draws.
- `_runMonteCarlo(p, numRuns)` — runs N paths, sorts by `annualRetirementIncome`, returns the run at position `n/2` as the self-consistent median result plus `successRate`, `p10Income`, `p90Income`.
- Inlined helpers (no external imports allowed): `normalDraw(mean, sigma)` and `arrayMedian(arr)`.

---

## Key Design Rules

### Nominal vs Real Values

Savings balances are **always nominal** (actual future dollars). Inflation grows expenses, not savings. The "real terms" toggle is a display-only option — it does not change how balances are stored or calculated. If someone asks "why does savings show $270 not $151?", the answer is: $270 is correct (nominal), $151 would be purchasing-power-adjusted which we only show on user request.

### Stochastic Rate Model

Each year draws independently from N(median, σ) via Box-Muller. Sigmas by asset class:

```
Super / equity:    σ = max(3%,   |rate| × 60%),  floor = −30%
Investment assets: σ = max(2%,   |rate| × 50%),  floor = none
Property:          σ = max(3%,   |rate| × 60%),  floor = −15%
Savings / cash:    σ = max(0.5%, |rate| × 30%),  floor = 0%  (deposit guarantee)
Salary growth:     σ = max(0.5%, |rate| × 40%),  floor = −5%
CPI inflation:     σ = max(0.5%, |rate| × 40%),  floor = 0.1%
Healthcare infl:   σ = max(1%,   |rate| × 40%),  floor = 0.1%
```

### Median, Not Average

MC output reports the **p50 outcome** — the actual run at the 50th percentile of `annualRetirementIncome`. All fields (yearByYear, depletionYear, retirementBalance, etc.) come from that single run. Do not compute a per-field average across runs.

### Ageism Modelling (opt-in)

`inputs.enableAgeism` must be `true` to activate. `inputs.ageismStartAge` defaults to 50.

Pattern: 3 years of stagnant growth after onset, then capped modest growth.

**Pipeline distinction** (important):
- Pipeline A (`getSalaryForYear`): caps the *real* growth rate. Salary still tracks CPI during static phase.
- Pipeline B (`projectSalary`): caps the *nominal* growth rate. Real purchasing power declines during static phase.

This is intentional and documented in code comments. Do not "fix" it to be the same — the two pipelines have different salary representations.

### PDF Generation

- Library: jsPDF 3.x (window.jspdf.jsPDF) + jsPDF-autotable.
- **No emoji in PDF output** — jsPDF built-in fonts (Helvetica, Times, Courier) are Latin-1. Emoji produce garbled characters. Use plain ASCII alternatives.
- `exportToPDF(inputs, results, chartManager, app)` — `app` is the bridge object with `currentMonteCarloResults`, `currentRecommendations`, `currentSuggestions`, `currentStressTestResults`, `currentRiskProfile`, `currentAllocationStrategy`, `currentOverseasData`, `plainEnglishNarrative`.
- `buildExportAppBridge()` in `advanced-v2.js` builds the `app` object from `APP_STATE`.
- `exportSuggestionsAsPdf(selectedRecs, band)` must pass `APP_STATE.chartManager` as 3rd arg (not the data object).

---

## File Responsibilities

### Core Engines

| File | Role |
|------|------|
| `simulator.js` | Pipeline A: RetirementSimulator class, stochasticRate, getSalaryForYear, Monte Carlo |
| `simulation_engine/life_simulation_engine.js` | Pipeline B: year-loop orchestrator, per-year stochastic draws, cumulative inflation factor |
| `advanced-design-engine.js` | Pipeline C: AdvancedDesignEngine, MC, sensitivity, deterministic |
| `utils.js` | exportToPDF, exportToXLSX, exportToCSV, formatCurrency, formatPercent, DOM helpers |
| `config.js` | Super caps, tax brackets, pension thresholds, defaults |
| `enhanced-config.js` | Healthcare, aged care, stress test parameters |
| `policy-engine.js` | SG rate, salary package modes, max contribution base, Division 293 |

### Advanced v2 Page (`advanced-v2.html`)

| File | Role |
|------|------|
| `advanced-v2.js` | Page controller: syncAppState, buildEngineInputs, buildExportResults, buildExportAppBridge, handlePdfExport, exportSuggestionsAsPdf |
| `simulation_engine/*.js` | All Pipeline B sub-engines |
| `outcome-engine.js` | Outcome band classification |
| `outcome-bands.js` | Band thresholds and labels |
| `action-generator.js` | Action items for each band |
| `suggestions-ui.js` | Suggestions & Action Plan tab rendering |

### Reverse Planner (`reverse.html`)

| File | Role |
|------|------|
| `reverse-ui.js` | Page controller (webpack entry `reverseV1`) |
| `reverse-planner.js` | Orchestration |
| `reverse-solver.js` | Bisection solvers for 11 levers |
| `reverse-gap-analysis.js` | Comparison tables |
| `reverse-baseline-adapter.js` | Import from forward calculator localStorage |
| `reverse-scenarios.js` | Scenario cards |
| `reverse-report.js` | PDF and plain-English reports |
| `reverse-deep-analysis.js` | Four "what-if?" analyses |
| `reverse-success-predicate.js` | Success/failure evaluation |
| `forward-projection-bridge.js` | Reads `rc_forward_projection_v1` from localStorage |

---

## APP_STATE (advanced-v2.js)

Key fields in the global `APP_STATE` object in `advanced-v2.js`:

```js
APP_STATE = {
  input:              {},   // raw form inputs
  engineInputs:       {},   // normalised engine inputs (from buildEngineInputs)
  simulation:         null, // Pipeline B result from runLifeSimulation
  adaptedResult:      null, // adapted result for UI
  monteCarloResults:  null, // MC summary { successRate, median, percentile10, percentile90, ... }
  recommendations:    [],   // AI recommendations array
  stressTestResults:  [],
  riskProfile:        null,
  allocationStrategy: null,
  overseasExportData: null,
  chartManager:       { charts: {} },   // Chart.js instances keyed by ID
  // ...
};
```

`buildExportAppBridge()` maps APP_STATE to the `app` parameter expected by `exportToPDF`.

---

## Test Suite

```
tests/unit/
├── solvers.test.js            # 359 tests — bisection solver accuracy
├── round-trips.test.js        # 263 tests — input/output round-trips
├── gap-analysis.test.js       # 295 tests — gap comparison logic
├── baseline-adapter.test.js   # 382 tests — forward data import
├── scenarios.test.js          # 324 tests — scenario comparison
├── projection-bridge.test.js  # 183 tests — localStorage bridge
├── parity.test.js             # 119 tests — Pipeline A/B parity checks
├── integration.test.js        # 284 tests — end-to-end simulation flows
└── bridge-integration.test.js # 330 tests — forward→reverse bridge integration
```

Run: `npm test` (Jest). Total: ~2,539 tests across 9 suites.

---

## Common Pitfalls

1. **Don't use `Math.pow(rate, N)` for stochastic spending.** The fixed-spending path uses a cumulative factor that accumulates year-by-year. Only use `Math.pow` for the deterministic path in `fixedSpending()`.

2. **`cumulativeRetirementInflationFactor` resets to 1 at retirement.** Not to the pre-retirement cumulative value. It accumulates *after* spending is calculated each retirement year.

3. **PDF emoji = garbled text.** Always use ASCII in any string passed to jsPDF text/table functions.

4. **`exportSuggestionsAsPdf` third argument is `chartManager`.** The data goes in the fourth argument (app bridge).

5. **Ageism is opt-in.** `inputs.enableAgeism` must be true. Don't activate it by default.

6. **Pipeline A `realGrowthRate` is real, not nominal.** `inflationRate` is added separately in `getSalaryForYear`. Pipeline B `effectiveGrowthRate` is nominal (includes inflation).

7. **Sensitivity analysis must use `calculateDeterministic`.** MC noise obscures small parameter deltas. Never use `calculate()` (stochastic) for sensitivity comparisons.

8. **The median MC run is the median by income, not balance.** `_runMonteCarlo` sorts by `annualRetirementIncome`. All returned fields come from that single run.

---

## Development Workflow

```bash
npm install         # install deps
npm run build       # webpack production build → dist/
npm run dev         # webpack watch mode
npm test            # run Jest suite
npx serve dist      # serve for manual testing
```

Branch convention: `claude/<descriptor>` for AI-generated branches.

PRs target `master`. The branch `claude/vibrant-bardeen-h23mto` contains v2.3.0 changes (PR #97).

---

## Australian Financial Rules (2025-26)

| Rule | Value |
|------|-------|
| Super Guarantee rate | 12% |
| Concessional cap | $30,000/year |
| Non-concessional cap | $120,000/year (balance < $2M) |
| Maximum contribution base | $250,000 pa / $62,500 per quarter |
| Transfer Balance Cap | $2,000,000 (from July 2025) |
| $3M super tax threshold | $3,000,000 (15% on earnings above) |
| Division 293 threshold | $250,000 (income + concessional contributions) |
| CGT discount | 50% for assets held > 12 months |
| Franking credit rate | 30% of dividend (corporate tax rate) |
| Age pension asset threshold (couple, homeowner) | ~$470,000 (varies by year) |
| Age pension income deeming | First $62,600 at 0.25%, above at 2.25% (singles 2025) |

Always check `config.js` and `enhanced-config.js` for the exact values used — they may be more current than this file.
