# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

This file gives architectural context that would otherwise have to be re-derived by reading many files.
See also `AGENTS.md` (repo conventions) and `.github/copilot-instructions.md`.

---

## Project Overview

**Australian Retirement Calculator** — a browser-only (no backend) retirement planning tool for the
Australian financial system. All computation runs in JavaScript in the browser; no data leaves the device.
`dist/` is generated output served by nginx at `https://retirement.gagneet.com`; `src/` is the source of truth.

**Tech stack**: ES2020 modules, webpack 5, Tailwind CSS (CDN), Chart.js, jsPDF 3.x, jsPDF-autotable,
XLSX.js, Jest (jsdom) for unit tests, Playwright for e2e, k6 for load.

**Current version**: 2.4.0 (`package.json`)

---

## Commands

```bash
npm ci                 # install pinned deps (node_modules is NOT checked in)
npm run build          # webpack production build → dist/
npm test               # Jest (tests/unit + tests/integration; tests/e2e and tests/perf ignored)
npm test -- --runInBand        # serial run — deterministic local verification
npm run deploy         # bash deploy.sh — npm ci + build + deploy to nginx. Verify dist/ first.
npx serve dist         # file:// will not work (ES modules) — must be served over HTTP
```

Focused tests:

```bash
npx jest tests/unit/retirement-v3-fields.test.js --runInBand
npx jest tests/unit/chart-safety.test.js -t "destroyChart does not throw"
```

E2E and load (Playwright is installed under `playwright_modules/`, not `node_modules`; repo scripts
call that local binary directly, and the config targets the **live site**, not localhost):

```bash
npm run test:e2e
npm run test:e2e:ui
npm run test:e2e:report
./playwright_modules/node_modules/.bin/playwright test tests/e2e/05-basic-calculation.spec.js --project=chromium
./playwright_modules/node_modules/.bin/playwright test --grep "disclaimer" --project=chromium
npm run test:load      # k6, advanced-v2 only
npm run test:load:all  # k6, all six calculator pages + asset/cache budgets
npm run test:perf      # engine + bundle-size budgets (excluded from `npm test`)
```

`test:load*` need `BASE_URL`, e.g. `BASE_URL=https://retirement.gagneet.com npm run test:load:all`.

There is **no lint script**. Before shipping calculator work: focused Jest → `npm test -- --runInBand`
→ `npm run build` → `git diff --check`.

---

## Page Surfaces and Webpack Entries

Webpack has five entries; each page is emitted via `HtmlWebpackPlugin` with an explicit `chunks` list.
Static pages (privacy, terms, methodology, guides…) deliberately get `chunks: []`.

| Page | Entry | Controller |
|------|-------|-----------|
| `index.html`, `advanced.html` | `main` | `src/js/app.js` (classic calculator) |
| `advanced-v2.html` | `advancedV2` | `src/js/advanced-v2.js` |
| `retirement.html` | `retirementV3` | `src/js/retirement-v3.js` (**isolated V3 surface**) |
| `reverse.html` | `reverseV1` | `src/js/reverse-ui.js` (reverse planner) |
| `comparison.html` | `comparison` | `src/js/comparison.js` |
| `advanced-design.html` | *(none)* | `advanced-design-ui.js` / `advanced-design-engine.js` **copied verbatim** by CopyPlugin as standalone ES modules — not bundled, so they may not use bare-specifier imports |

Per `AGENTS.md`: treat `retirement.html` + `retirement-v3.js` as the isolated V3 surface unless the task
explicitly asks to modify Advanced V2.

**Build output is code-split.** `optimization.splitChunks` extracts modules used by 2+ entries into a
`shared` chunk, plus a `runtime` chunk. Every page loads `runtime → shared → <entry>` in that order
(HtmlWebpackPlugin injects them). Entry chunks are ~110–165KB; `shared` is ~550KB and cached across pages.
Budgets are enforced by `tests/perf/bundle-budget.test.js`. `main` (index + advanced classic) is still
~730KB because `app.js` is one ~633KB module — splitting it needs a source refactor.

**Google Analytics** is loaded by `src/js/google-analytics.js`, imported and called by all five entries.
Do not re-inline a `gtag` snippet in a page — `tests/unit/analytics-coverage.test.js` fails the build for
that. `advanced-design.html` is the one exemption (no bundle, so it keeps an inline snippet).

**`nginx` serves this repo's `dist/` directly**, so `npm run build` publishes to
`https://retirement.gagneet.com`. There is no separate upload step — treat a build as a deploy.

---

## Calculation Layer (`src/js/calculation/`) — read this first

This is the consolidation layer that all three forward calculators now route through. It sits **between**
the page controllers and the raw engines, and is the reason the same inputs produce the same numbers on
Classic, V2 and V3.

```
raw form inputs
  → input-adapters/{advanced-classic,advanced-v2,reverse-manual}-adapter.js
  → canonical-input-schema.js        normaliseCanonicalInput() → CanonicalInput (versioned)
  → household-cashflow-engine.js     deriveHouseholdCashflow(), estimateMonthlySpending() (ABS-based)
  → ProjectionService.computeProjection()   ← projection-service.js
        · policy/normalise-inputs.js  normaliseInputs / sanitiseInputs
        · input-reconciliation-validator.js  blocking issues / warnings / information
        · projection-cache.js         FNV-1a hash of {policyVersion, canonicalInput, rawInput}
        · simulator.simulateRetirement(...)
```

- `ProjectionService` is constructed per page with `{ simulator, adapter, engineInputBuilder, resultAdapter, summaryBuilder, policyVersion }`.
  `app.js`, `advanced-v2.js` and `retirement-v3.js` each build one; **`reverse-ui.js` does not** —
  the reverse planner has its own solver stack.
- `canonical-engine-adapter.js` — `applyCanonicalCashflowToEngineInputs()` merges derived cashflow into engine inputs.
- `save-data-schema.js` — `buildCanonicalSaveData()` unifies save/export JSON between Classic and V2
  (detects V2 by short field names like `age`, `retireAge`, `superBal`). Both pages must call it before serialising.
- `reverse-scenario-engine.js`, `investment-property-position.js` — shared scenario/property position logic.

`src/js/policy/`: `normalise-inputs.js` (rate normalisation, `DECLINE_MAX`, `RETURN_CEILING`,
`SIMULATION_DEFAULTS` alignment), `validate-inputs.js`, `stress-helpers.js` (`buildStressedInputs`).

---

## Simulation Pipelines

There are three largely independent calculation pipelines, plus the reverse solver stack.

### Pipeline A — `simulator.js` / `RetirementSimulator`

The primary engine. Used (via `ProjectionService`) by `app.js`, `advanced-v2.js` and `retirement-v3.js`.

- Class-based: `new RetirementSimulator(config)`.
- `simulateRetirement(inputs, useRandomReturns = false, stressScenario = null, scenarioReturns = null)` — the entry point ProjectionService calls.
- `runSimulation(inputs)` → year-by-year array; `runMonteCarlo(inputs, numRuns)` → percentile array.
- `stochasticRate(centralRate, isStochastic, floor, sigma)` — Box-Muller normal draw. Legacy two-arg form `stochasticRate(rate, floor)` still works via detection.
- `getSalaryForYear(baseSalary, year, inputs, isPartner, overrideInflation, overrideSalaryGrowth)` — supports `salaryGrowthType` (`standard` / `career` / `stagnant`), lean years, reduced income scenarios, carer reduction, and optional ageism (`enableAgeism`).
- It imports selectively from `simulation_engine/` (`calculateSpending`, `getSGRate`, `calcSuperTax`) — those sub-engines are shared, not Pipeline-B-only.

### Pipeline B — `simulation_engine/life_simulation_engine.js`

Reached only through `simulation_engine/index.js` → `runFullSimulation(userInputs, options)`, which
`app.js` calls for the deeper analysis flows (MC, strategy optimiser, recommendations). It is **no longer**
the main path for `advanced-v2.html`.

- Functional: `runLifeSimulation(userInputs)` → `{ yearlyData, summary }`.
- Sub-engines: `income_engine` (`projectSalary`, `projectPartnerSalary`, `calcInvestmentIncome`),
  `expense_engine`, `spending_engine` (`calculateSpending`, 5 strategies), `super_engine`,
  `investment_engine`, `property_engine`, `pension_engine`, `tax_engine`, `shock_engine`,
  `life_event_engine`, `monte_carlo_engine`, `strategy_engine`, `recommendation_engine`, `financial_state`.
- Per-year stochastic draws happen at the **top of the year loop** in `life_simulation_engine.js` for CPI
  inflation, healthcare inflation, property growth and salary growth. The drawn rate is passed as an
  optional override to sub-engine functions: `fn(currentValue, ..., inputs, yearXxxRate = null)`. When
  `yearXxxRate` is provided it wins; when null the function uses `inputs.xxxRate` (deterministic) or its own
  inline draw if `inputs.useStochasticReturns === true`.
- Cumulative inflation factor is maintained year-by-year in `life_simulation_engine.js`. At retirement the
  **retirement-phase factor resets to 1** (base spending is in nominal retirement-year dollars); it multiplies
  *after* spending is calculated so year-0 spending = base × 1. Passed to `calculateSpending` as `cumulativeInflationFactor`.

### Pipeline C — `advanced-design-engine.js`

Used by `advanced-design.html`. Standalone: **no external imports allowed** (copied verbatim, not bundled).

- `new AdvancedDesignEngine()`; `calculate(inputs)` runs 500 MC paths and returns the median-income run.
- `calculateDeterministic(inputs)` — single fixed-rate projection for explainability.
- `calculateSensitivity(inputs)` — uses the deterministic baseline; MC noise would obscure small deltas.
- `_runSimulation(p, stress, stochastic)`, `_runMonteCarlo(p, numRuns)` (sorts by `annualRetirementIncome`, returns the run at `n/2` plus `successRate`, `p10Income`, `p90Income`).
- Inlined helpers: `normalDraw(mean, sigma)`, `arrayMedian(arr)`.

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

### Shared Property Module (`src/js/property/`)

Import only from `property/index.js` (the public API; internal helpers are intentionally not re-exported):
`propertyTypes.js` (enums, city growth/yield tables, `validatePropertyInput`), `propertyCashflow.js`
(amortisation, `calcAnnualPropertyCashflow`, `calcSaleProceeds`, `calcIRR`), `propertyTax.js`,
`propertyMonteCarlo.js`, `propertyComparison.js`, `propertyReverseSolver.js`, `historicalData.js`.
UI wiring lives in `property-housing-ui.js` (`initPropertyHousingUI`).

---

## Key Design Rules

### Nominal vs Real Values

Savings balances are **always nominal** (actual future dollars). Inflation grows expenses, not savings.
The "real terms" toggle is display-only — it does not change how balances are stored or calculated.
If asked "why does savings show $270 not $151?": $270 is correct (nominal); $151 is purchasing-power-adjusted
and only shown on request. Use `deflateToToday` (`utils.js`) at the display boundary.

### Age Pension Parameters Are Single-Sourced

`config.js` is the source of truth for every legislated Age Pension figure. They are indexed by Services
Australia 2-3 times a year: full-pension asset thresholds and the income free area and deeming thresholds
on **1 July**; part-pension asset cut-offs on **20 March and 20 September**. `POLICY_EFFECTIVE_DATE` records
the applied indexation.

Two copies cannot import config and are hand-maintained — `advanced-design-engine.js` (Pipeline C, copied
verbatim so it cannot import) and the pre-JS `value="…"` attributes in the HTML forms.
`tests/unit/pension-constant-sync.test.js` fails if any copy drifts. Never hardcode a pension figure in a
controller; read it from `ENHANCED_CONFIG`.

**Pension parameters are indexed across the projection.** Every figure is legislated in today's dollars, so
`simulator.js` multiplies the payment rate, asset threshold, asset cut-off, income free area and deeming
thresholds by `inflationFactorBeforeAdvance` (the cumulative CPI factor for that year, seeded from the
accumulation phase so it measures from today). Holding them flat means-tests inflated balances against
today's limits and understates the pension in later years. A user override is a today's-dollars statement of
policy too, so indexation applies to whichever value wins.

**Eligibility.** `inputs.agePensionAge` is real — it gates the single branch, is passed into
`calculateAgePensionForCouple`, and sets the AWLR residence window. It defaults to
`config.OVERSEAS_RETIREMENT.PENSION_AGE` (67). `resolveCouplePensionParameters` in `utils.js` is the one
place couple parameters are resolved; the couple functions previously accepted a `config` argument and
ignored it. Covered by `tests/unit/pension-model.test.js`.

**Both pipelines share one policy resolver.** `utils.js:resolveAgePensionPolicy({ isCouple, homeowner,
pensionAge, maxPension, assetThreshold, assetLimit, incomeThreshold, indexationFactor })` is the single
place Age Pension policy is resolved; every value falls back to `config.js`. Pipeline B's
`calcSinglePension` / `calcCouplePension` / `calcPensionForYear` each take an optional trailing `policy`
object (backwards compatible — omitting it reproduces the legislated defaults), and
`life_simulation_engine.js` builds one per year from `inputs` plus that year's inflation factor.
`tests/unit/pension-engine-policy.test.js` asserts the two pipelines return identical pensions for
identical inputs, so they cannot drift apart.

Pipeline A's *single* branch still resolves inline against `this.config` rather than the shared helper.
That is deliberate: `RetirementSimulator` is constructed with different config objects by different
callers, so routing it through the resolver (which reads `ENHANCED_CONFIG`) would change semantics.
The parity tests cover the risk instead.

`RetirementSimulator` **requires** a config argument — `simulateRetirement()` reads `this.config.SIMULATION`
and throws a `TypeError` without it. `comparison.js` constructed it with none, which broke every scenario
comparison; guarded now by `tests/unit/simulator-config-required.test.js`.

### Stochastic Rate Model

Each year draws independently from N(median, σ) via Box-Muller:

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

MC output reports the **p50 outcome** — the actual run at the 50th percentile of `annualRetirementIncome`.
All fields (yearByYear, depletionYear, retirementBalance…) come from that single run. Do not compute a
per-field average across runs.

### Ageism Modelling (opt-in)

`inputs.enableAgeism` must be `true`. `inputs.ageismStartAge` defaults to 50. Pattern: 3 years of stagnant
growth after onset, then capped modest growth.

Pipeline distinction — **intentional, do not "fix"**:
- Pipeline A (`getSalaryForYear`) caps the *real* growth rate; salary still tracks CPI during the static phase.
- Pipeline B (`projectSalary`) caps the *nominal* growth rate; real purchasing power declines during the static phase.

### PDF Generation

- jsPDF 3.x (`window.jspdf.jsPDF`) + jsPDF-autotable.
- **No emoji in PDF output** — jsPDF built-in fonts (Helvetica, Times, Courier) are Latin-1; emoji garble. Use ASCII.
- `exportToPDF(inputs, results, chartManager, app)` — `app` is the bridge object with
  `currentMonteCarloResults`, `currentRecommendations`, `currentSuggestions`, `currentStressTestResults`,
  `currentRiskProfile`, `currentAllocationStrategy`, `currentOverseasData`, `plainEnglishNarrative`.
- `buildExportAppBridge()` in `advanced-v2.js` builds `app` from `APP_STATE`.
- `exportSuggestionsAsPdf(selectedRecs, band)` must pass `APP_STATE.chartManager` as the **3rd** arg (data goes 4th).

---

## Conventions

- Keep calculation logic out of `app.js` / page controllers. New financial modelling belongs in `simulator.js`,
  `simulation_engine/`, `calculation/`, `property/`, or a focused engine module; controllers coordinate UI state and event wiring.
- Internal financial values are numeric; percentages are stored as decimals and formatted at the UI boundary
  through `utils.js`. Reuse `safeGetValue`, `safeSetValue`, `parseFormattedNumber`, `formatCurrency`,
  `formatPercent`, `showNotification` and the input-initialisation helpers rather than reading/formatting DOM values ad hoc.
- Preserve the config/versioning flow. `version-manager.js` is authoritative for schema versions; imported user
  data must keep passing its stored `version` into `populateFormFromData(...)` so older exports hydrate correctly.
- CDN-backed globals (Chart.js, XLSX, jsPDF) are expected at runtime but guarded — tests cover missing-global
  behavior. Follow the existing availability checks.
- ES modules, `const`/`let`, camelCase; classes PascalCase (`ProjectionService`, `RetirementSimulator`);
  policy constants stay uppercase where already modelled that way.
- Branch convention: `claude/<descriptor>` for AI-generated branches. PRs target `master`; short imperative
  commit subjects; docs-only commits may use `docs:`.

### Persisted browser state

Onboarding, disclaimer, comparison, theme and the forward→reverse bridge all depend on localStorage:
`retirement-calculator-inputs`, `disclaimerAccepted`, `hasVisitedCalculator`, `outcome_plan`,
`rc_forward_projection_v1`, `rc_forward_scenario`, `retirement-calc-theme`, `retirement-v3-theme`,
`howto-progress`. Changing a key breaks in-flight user sessions.

---

## APP_STATE (advanced-v2.js)

```js
APP_STATE = {
  input:              {},   // raw form inputs
  engineInputs:       {},   // normalised engine inputs (from buildEngineInputs)
  simulation:         null, // projection result
  adaptedResult:      null, // adapted result for UI
  monteCarloResults:  null, // { successRate, median, percentile10, percentile90, ... }
  recommendations:    [],
  stressTestResults:  [],
  riskProfile:        null,
  allocationStrategy: null,
  overseasExportData: null,
  chartManager:       { charts: {} },   // Chart.js instances keyed by ID
};
```

---

## Test Suite

- `tests/unit/` (~60 suites) — engines, policy, adapters, parity, UI structure, SEO/tooltip coverage.
  Notable: `financial-simulation-invariants`, `calculation-consolidation`, `reconciliation`,
  `canonical-schema`, `advanced-classic-v2-normalized-parity`, `reverse-projection-parity`,
  `policy-regression`, `simulator-stochastic-rate`, `retirement-v3-fields`, `trustworthiness-guardrails`.
- `tests/integration/` — `outcome-tab`, `reverse-integration`, `reverse-forward-bridge`.
- `tests/e2e/` — 13 Playwright specs (`01-landing-page` … `13-advanced-v2-scenarios`) plus `helpers/` and `scenarios/`. Ignored by Jest.
- `tests/load/k6-advanced-v2.js` — k6 load script.

Name new Jest files `*.test.js` and place them in the matching suite directory. Add focused regression tests
for adapter, import/export, policy and projection changes; add Playwright coverage when UI behavior changes.

---

## Common Pitfalls

1. **Don't use `Math.pow(rate, N)` for stochastic spending.** The fixed-spending path uses a cumulative factor accumulated year-by-year. `Math.pow` is only for the deterministic path in `fixedSpending()`.
2. **`cumulativeRetirementInflationFactor` resets to 1 at retirement** — not to the pre-retirement cumulative value. It accumulates *after* spending is calculated each retirement year.
3. **PDF emoji = garbled text.** ASCII only in any string passed to jsPDF.
4. **`exportSuggestionsAsPdf`'s third argument is `chartManager`**, not the data object.
5. **Ageism is opt-in.** `inputs.enableAgeism` must be true; never default it on.
6. **Pipeline A `realGrowthRate` is real, not nominal** — `inflationRate` is added separately in `getSalaryForYear`. Pipeline B `effectiveGrowthRate` is nominal (includes inflation).
7. **Sensitivity analysis must use `calculateDeterministic`.** Never `calculate()` (stochastic) — MC noise obscures small parameter deltas.
8. **The median MC run is median by income, not balance.** `_runMonteCarlo` sorts by `annualRetirementIncome`; all returned fields come from that one run.
9. **`advanced-design-*.js` cannot import anything.** They are copied verbatim by CopyPlugin and loaded as standalone browser modules.
10. **Bypassing `ProjectionService` reintroduces cross-calculator drift.** New forward-calculator inputs need the adapter + canonical schema updated, or Classic/V2/V3 will disagree.
11. **`ProjectionService` caches on an input hash** that includes `policyVersion`. Bumping policy constants without bumping `policyVersion` can serve stale projections.
12. **Playwright hits the live site**, so e2e failures may reflect what is deployed, not the working tree.
13. **`readInputs()` in `retirement-v3.js` is memoised** against a revision counter bumped by a delegated
    `input`/`change` listener installed at *module scope*. Any code that sets a field's `.value`/`.checked`
    programmatically must call `markFormDirty()` — a silent write is otherwise served stale until the next
    `runAction()`, which re-anchors the memo. Guarded by `tests/unit/form-read-memoisation.test.js`.
14. **A build is a deploy.** nginx serves `dist/` from the repo.

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

`config.js` and `enhanced-config.js` hold the exact values used and may be more current than this table.
