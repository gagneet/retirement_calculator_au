# TASKS.md — Retirement Calculator: Remaining Work

Generated: 2026-05-15  
Test status: **671 tests passing, 0 failures** across 28 suites.  
Build status: **Clean** (webpack, 2 pre-existing size warnings only).

---

## Context

The recent bug-fix pass (enhancements.md Phase 1 & 2) corrected calculation errors in the life simulation Pipeline B (`simulation_engine/`). The underlying problem stated in enhancements.md remains partially open: **three independent calculation pipelines exist and they disagree with each other**. The tasks below are grouped by priority and describe precisely what must be done to converge on a single, auditable output.

---

## Priority 1 — Data correctness: outputs that are currently wrong

### TASK-001: Unify the Age Pension engine

**Problem:** Three separate age pension implementations exist:
- `src/js/utils.js` — `calculateAgePension()` / `calculateAgePensionForCouple()` (Pipeline A, most complete)
- `src/js/simulation_engine/pension_engine.js` — `calcPensionForYear()` (Pipeline B, thin wrapper, uses correct config values but lacks work bonus and overseas rules)
- `src/js/advanced-design-engine.js` — hardcoded 2024-25 constants, single/homeowner only, no income test deeming

**Required actions:**
1. Make `pension_engine.js` delegate to `calculateAgePension()` / `calculateAgePensionForCouple()` from `utils.js` instead of reimplementing means-test logic.
2. Delete the standalone constants in `advanced-design-engine.js` (`AGE_PENSION.FULL_SINGLE_PA`, `ASSETS_LOWER`, `ASSETS_UPPER`) and replace with imports from `config.js`.
3. Confirm deeming rates (`DEMING_RATE_LOWER`, `DEMING_RATE_UPPER`) from `config.js` flow through all three paths. Currently `pension_engine.js` calls `calculateDeemedIncome()` from `utils.js` ✓, but `advanced-design-engine.js` does not use deeming at all.
4. Add a test: same inputs produce identical pension output from all three code paths.

**Files:** `simulation_engine/pension_engine.js`, `advanced-design-engine.js`, `utils.js`

---

### TASK-002: Unify the super contributions tax calculation

**Problem:** The main simulator (`simulator.js`, Pipeline A) computes super tax using `calculateAustralianTax()` inline with Division 293 logic. The life simulation engine (`life_simulation_engine.js`, Pipeline B) now correctly uses `calcSuperTax()` from `tax_engine.js`. The advanced design engine (`advanced-design-engine.js`, Pipeline C) uses a hardcoded flat 15% with no Division 293.

**Required actions:**
1. Replace the inline super tax calculation in `simulator.js` with a call to `calcSuperTax()` from `simulation_engine/tax_engine.js` to make both pipelines use identical logic.
2. Remove the flat `0.15` hardcoding in `advanced-design-engine.js` and use `calcSuperTax()`.
3. Verify Division 293 fires correctly for the template user (salary $202,509 + $24,301 SG = $226,810 — below $250k threshold, so no surcharge in current year but may trigger in future years as salary grows).

**Files:** `simulator.js`, `advanced-design-engine.js`, `simulation_engine/tax_engine.js`

---

### TASK-003: Unify the Monte Carlo engine

**Problem:** Two Monte Carlo engines exist:
- `enhanced-monte-carlo.js` (Pipeline A) — regime-aware, per-year sampling, used by `simulator.js`
- `simulation_engine/monte_carlo_engine.js` (Pipeline B) — now fixed to do per-year sampling via `useStochasticReturns`, but uses a simpler return model

**The core issue:** Both engines call `runLifeSimulation()` or `simulateRetirement()` with different underlying assumptions about portfolio return, property cycles, and spending strategy. A user who clicks "Run Monte Carlo" in the main calculator vs the Life Simulation tab gets different probabilistic results for identical inputs.

**Required actions:**
1. Make `monte_carlo_engine.js` (Pipeline B) a thin wrapper that calls `simulator.js` `simulateRetirement()` with `useRandomReturns: true` instead of `runLifeSimulation()`. This is the recommended architecture from enhancements.md.
2. The `useRandomReturns` flag in Pipeline A already draws per-year returns correctly via `EnhancedMonteCarloEngine.generateRegimeAwareReturns()`. Pipeline B should use this same engine.
3. Alternatively: if the life-simulation tab is to remain separate (e.g. it serves a different UI purpose), add a prominent disclaimer that its probability outputs use a simplified model vs the main calculator.

**Files:** `simulation_engine/monte_carlo_engine.js`, `simulator.js`, `enhanced-monte-carlo.js`

---

### TASK-004: Fix investment income model inconsistency

**Problem (architectural):** `growInvestmentAssets()` uses `investmentReturn` as a total return (capital gains + dividends reinvested). `calcInvestmentIncome()` computes a separate dividend income stream from the same asset base. These two models should not coexist without being reconciled:

- In **pre-retirement**, `investIncome` is included in `totalIncome` for tax — this is correct because dividends are taxable.
- The total return in `growInvestmentAssets` already includes those dividends as reinvested capital — they are double-modelled (taxed + reinvested).
- In **retirement**, the audit-pass fix removed `investIncome` from the super withdrawal offset (correct), but the tax over-collection on a total-return base remains.

**Required actions:**
1. Decide on one model: either **total-return** (dividends reinvested, no separate cash income) or **income + capital gain** (dividends paid as cash, only capital gain component grows balance).
2. If total-return is kept: remove `calcInvestmentIncome()` from `totalIncome`/`taxableIncome` in `life_simulation_engine.js`. Tax is already implicitly captured via the return rate.
3. If income + capital gain is kept: split `investmentReturn` into `capitalGainRate` and `dividendYield` in the model, and only apply `capitalGainRate` in `growInvestmentAssets`.
4. The main simulator (`simulator.js`) uses Pipeline A's approach — verify it is also consistent with the chosen model.

**Files:** `simulation_engine/life_simulation_engine.js`, `simulation_engine/investment_engine.js`, `simulation_engine/income_engine.js`

---

### TASK-005: Fix advanced-design-engine.js stale constants and simplified logic

**Problem:** `advanced-design-engine.js` (Pipeline C) is fully self-contained with:
- Age pension constants from 2024-25 (now out of date — March 2026 rates apply)
- No income deeming on financial assets
- No couple pension support
- Inputs are in percentage form (`superReturn: 7.5`) while all other engines use decimals (`superReturn: 0.075`)
- No Division 293, no Division 296, no CGT reform toggle

**Required actions:**
1. Import pension thresholds from `config.js` (`ENHANCED_CONFIG`) instead of hardcoding.
2. Add deeming-based income test using `calculateDeemedIncome()` from `utils.js`.
3. Normalise inputs at entry using `normaliseRatio()` from `utils.js` so the engine is consistent with the rest of the codebase.
4. Add a clear `// Pipeline C — simplified model` comment and link to the unified engine as the canonical source.
5. Consider whether this engine should be retired in favour of routing the advanced design page through `simulator.js`.

**Files:** `advanced-design-engine.js`, `config.js`, `utils.js`

---

## Priority 2 — Output correctness: reports and exports that show wrong values

### TASK-006: Stress tests must apply scenario deltas to the calculation engine

**Problem (from enhancements.md §3.5):** Stress test scenarios in the PDF/Excel export show the same final balance as the base plan because the stress object is labelled but the modified inputs are not actually fed into the simulation engine.

**Required actions:**
1. In `simulator.js`, locate `STRESS_SCENARIOS` usage and confirm that `applyStress(inputs, stress)` modifies the inputs before passing them to `simulateRetirement()`.
2. Each stress test result must be computed as:
   ```js
   const stressedInputs = applyStress(canonicalInputs, scenario);
   const stressResult   = simulator.simulateRetirement(stressedInputs);
   ```
3. The delta vs base (`stressResult.finalBalance - baseResult.finalBalance`) must be shown in the PDF/Excel, not a hard-coded or label-only output.
4. Add a unit test: for a "Market Crash" stress scenario, `stressResult.finalBalance` must be strictly less than `baseResult.finalBalance`.

**Files:** `simulator.js`, `utils.js` (PDF/Excel export functions)

---

### TASK-007: Recommendation impact values must be scenario deltas, not formula shortcuts

**Problem (from enhancements.md §3.6):** Recommendation impact figures (e.g. "increase contributions adds $X to retirement balance") use simplified formulas that have produced billions-of-dollars outputs. The correct approach is to re-run the simulation with the recommendation applied and take the difference.

**Required actions:**
1. In `recommendation.js`, replace any shortcut impact formula with:
   ```js
   const baseResult  = simulator.simulateRetirement(canonicalInputs);
   const scenarioInputs = { ...canonicalInputs, ...rec.modifications };
   const recResult   = simulator.simulateRetirement(scenarioInputs);
   const impact = recResult.finalBalance - baseResult.finalBalance;
   ```
2. Confirm the impact sign is correct (positive = improvement).
3. Cap displayed impact to a plausible range (e.g. no single recommendation increases final balance by more than 200% of the base plan).
4. The `calculateFrankingCreditBenefit()` annual estimate is acceptable as a rough preview, but the retirement balance delta must come from a full simulation run.

**Files:** `recommendation.js`

---

### TASK-008: PDF/Excel export `monteCarloRunCount` must come from the result object

**Problem (from enhancements.md §3.2):** The exported PDF says "Based on 1,000 simulations" regardless of `numRuns` in inputs. The count is hardcoded in the export template.

**Required actions:**
1. In `utils.js` PDF export function, replace the hardcoded `"1,000 simulations"` string with `monteCarloResults.runs` or `inputs.numRuns`.
2. The export must read: `"Based on ${result.monteCarloRunCount.toLocaleString('en-AU')} simulations"`.
3. Add a test: export with `numRuns: 5000` produces a PDF data object where the simulation count field equals 5000.

**Files:** `utils.js` (export functions)

---

### TASK-009: agedCareProbability must report whether value is user-supplied or model-derived

**Problem (from enhancements.md §3.4):** The PDF shows 13% aged-care probability when the user supplied 22%. The fix in `expense_engine.js` now honours the user value, but the exported report does not distinguish between a user-supplied value and the AIHW default.

**Required actions:**
1. In the PDF/Excel export, add a footnote:
   - `"User supplied: 22%"` when `inputs.agedCareProbability` is explicitly set
   - `"Model default (AIHW): 65%"` when the field is absent
2. Pass an `_agedCareProbabilitySource` flag through the simulation result object.

**Files:** `utils.js`, `simulation_engine/expense_engine.js`

---

## Priority 3 — Architecture: prevent future divergence

### TASK-010: Create a canonical `normalise-inputs.js` module

**Problem:** Input normalisation (dividing percentages by 100, parsing strings, defaulting missing fields) is scattered across `app.js` `collectInputs()`, `simulator.js` constructor logic, `life_simulation_engine.js` defaults, and `advanced-design-engine.js` local conversions. Different entry points normalise differently, producing the ratio/percentage confusion documented in enhancements.md §3.3.

**Required actions:**
1. Create `src/js/policy/normalise-inputs.js` with a single `normaliseInputs(rawInputs)` function that:
   - Converts all percentage fields (stored as 0–100) to decimal (0–1).
   - Parses string booleans and numeric strings.
   - Applies defaults from `config.js` `DEFAULTS` for any missing field.
   - Tags the result with `_normalisedAt: Date.now()` for debug tracing.
2. All three pipelines must call `normaliseInputs()` as their first step before any calculation.
3. The template JSON (`retirement_template.json`) stores values already in decimal form — `normaliseInputs()` must detect this (using `normaliseRatio()`) and not divide again.

**Files:** new `src/js/policy/normalise-inputs.js`, `app.js`, `life_simulation_engine.js`, `advanced-design-engine.js`

---

### TASK-011: Create a canonical `validate-inputs.js` module

**Problem:** There is no single validation pass before simulation. Invalid inputs (e.g. `retirementAge < yourCurrentAge`, `inflation > 1.0`, `allocEquities + allocBonds + allocCash !== 1.0`) silently produce wrong outputs instead of being caught early.

**Required actions:**
1. Create `src/js/policy/validate-inputs.js` with `validateInputs(normalisedInputs)` returning `{ valid: boolean, errors: string[], warnings: string[] }`.
2. Validate: age ordering, allocation sum = 1 (±0.005 tolerance), all rates are decimals 0–1, lifespan > retirementAge, numRuns within [100, 20000].
3. Surface validation errors in the UI before running the simulation.
4. Add unit tests for all validation rules.

**Files:** new `src/js/policy/validate-inputs.js`, `app.js`

---

### TASK-012: Consolidate simulation result objects into one schema

**Problem:** `simulateRetirement()` (Pipeline A), `runLifeSimulation()` (Pipeline B), and `AdvancedDesignEngine.calculate()` (Pipeline C) return objects with different field names for the same concepts:

| Concept | Pipeline A | Pipeline B | Pipeline C |
|---|---|---|---|
| Final balance | `finalBalance` | `finalNetWorth` | `projections[last].balance` |
| Success probability | `monteCarlo.successRate` | `probabilityOfSuccess` | not computed |
| Year-by-year data | `yearlyData` | `timeline` | `projections` |

**Required actions:**
1. Define a canonical result schema in a new `src/js/engine/result-schema.js` file.
2. Wrap each pipeline's output in an adapter that maps to the canonical schema.
3. All UI components, chart builders, export functions, and recommendation engines must consume the canonical schema only.
4. This makes it safe to swap underlying engines without breaking the UI.

**Files:** new `src/js/engine/result-schema.js`, `simulator.js`, `simulation_engine/life_simulation_engine.js`, `advanced-design-engine.js`, `app.js`, `charts.js`, `utils.js`

---

### TASK-013: Add golden-output regression tests

**Problem:** There are no fixed-seed, expected-output tests that would catch a regression in the core calculation. Changes to the engine can silently shift retirement balance projections by hundreds of thousands of dollars.

**Required actions:**
Create `tests/unit/golden-output.test.js` with at least the following cases, each with a fixed random seed (mock `Math.random` via Jest):

| Case | Description |
|---|---|
| Single homeowner | Age 55, retires 67, lives 90, no property, no partner |
| Couple homeowner | Template JSON values, deterministic mode |
| Investment property | Sold at year 10, CGT applied correctly |
| High income | Salary $250k, Division 293 fires |
| Pension eligible | Assets below threshold at 67, full pension |
| Pension ineligible | Assets above cutoff, zero pension |
| Stress test | "GFC" scenario produces lower balance than base |
| Monte Carlo fixed seed | 1000 runs, seed fixed, `probabilityOfSuccess` within ±1% |

Each test asserts `expect(result.finalBalance).toBeCloseTo(expectedValue, -3)` (nearest $1,000 tolerance).

**Files:** new `tests/unit/golden-output.test.js`

---

### TASK-014: Add Division 296 tax to all pipelines

**Problem:** Division 296 (15% additional tax on super earnings where TSB > $3M, effective 1 July 2026) is defined in `tax_engine.js` (`calcDivision296Tax`) but not called anywhere in the simulation loops. For users with large super balances, this is a material omission.

**Required actions:**
1. In `simulator.js` pre-retirement accumulation loop, after computing super balance growth, call `calcDivision296Tax(superBalance, annualEarnings)` and deduct from super.
2. In `life_simulation_engine.js`, add the same Division 296 deduction step.
3. Only apply from calendar year 2026 onward (it is already legislated).
4. Add a unit test: super balance > $3M produces lower net balance than one below $3M when Division 296 is active.

**Files:** `simulator.js`, `simulation_engine/life_simulation_engine.js`, `simulation_engine/tax_engine.js`

---

### TASK-015: Add carry-forward concessional cap calculation

**Problem:** The calculator accepts `yourAdditionalSuperContribution` (template: $3,240) and `partnerAdditionalSuperContribution` (template: $25,224) but does not validate these against the concessional contribution cap ($30,000/year) or check carry-forward eligibility (requires TSB < $500k at prior 30 June). If contributions exceed the cap, an excess tax of 32% applies — currently silently ignored.

**Required actions:**
1. In `simulator.js` and `life_simulation_engine.js`, cap total concessional contributions (SG + voluntary) at `ENHANCED_CONFIG.CONCESSIONAL_CAP` ($30,000).
2. Track unused cap amounts for carry-forward (requires TSB < $500k check).
3. Charge excess concessional contributions tax (marginal rate + 2% charge less the 15% already paid) on the excess.
4. Surface a warning in the UI when contributions are on track to breach the cap.

**Files:** `simulator.js`, `simulation_engine/life_simulation_engine.js`, `config.js`, `app.js`

---

## Priority 4 — UI and output clarity

### TASK-016: Display which engine produced each result

**Problem:** The main results page, Life Simulation tab, and Advanced Design page all show retirement projections without indicating which engine produced them or what assumptions differ. A user sees three different "final balance" numbers with no explanation.

**Required actions:**
1. Add a small metadata footer to each result panel: `"Calculation engine: Main (Pipeline A) — [date]"`, `"Life Simulation (Pipeline B)"`, `"Advanced Design (Pipeline C)"`.
2. Include a link to the Assumptions/Methodology page from each result.
3. When Pipeline B or C is used, add a visible warning: `"This uses a simplified calculation model. Use the Main Calculator for full tax and pension accuracy."`

**Files:** `index.html`, `src/js/app.js`, life simulation tab HTML

---

### TASK-017: Ensure all chart data comes from the canonical result object

**Problem:** `charts.js` receives data from multiple callers. Some charts are drawn from Pipeline A results, others from Pipeline B. If a user runs Monte Carlo and then looks at a chart, the chart data may have been drawn from a different simulation run than the one described in the text.

**Required actions:**
1. Audit all chart drawing functions in `charts.js` to confirm they read from a single shared result object.
2. Implement a result store: a module-level object in `app.js` that holds the most recent canonical result. All charts and exports must read from this store.
3. Add a "last calculated at" timestamp to the result store. Display it beneath charts so users can confirm the chart is current.

**Files:** `charts.js`, `app.js`

---

### TASK-018: Fix healthcare stress test producing $0 in PDF

**Problem (from enhancements.md §3 introductory paragraph):** The "Healthcare Crisis" stress scenario (2.5× healthcare cost multiplier) shows $0 in the PDF export. This is because `healthcareCostMultiplier` is defined in `STRESS_SCENARIOS` but never read by the simulation engine when processing this scenario type.

**Required actions:**
1. In the stress scenario application code, handle `healthcareCostMultiplier`:
   ```js
   const stressedInputs = {
       ...canonicalInputs,
       currentHealthcareCosts: canonicalInputs.currentHealthcareCosts * (stress.healthcareCostMultiplier || 1),
   };
   ```
2. Add a unit test: healthcare stress scenario produces higher costs and lower final balance than base plan.

**Files:** `simulator.js` (stress test application), `utils.js` (export)

---

### TASK-019: Add input validation for template JSON import

**Problem:** When a user imports `retirement_template.json`, there is no validation pass before the data is loaded into the form. Stale, out-of-range, or misformatted values silently produce wrong calculations.

**Required actions:**
1. After JSON import in `app.js`, run `validateInputs(normaliseInputs(importedData))`.
2. If errors are found, display them to the user in an import warning modal before loading.
3. Warn specifically about: values stored as percentages where decimals are expected (e.g. `inflation: 2.0` when `0.02` is required), missing required fields, and values that have changed format between calculator versions.

**Files:** `app.js`, new `src/js/policy/validate-inputs.js` (from TASK-011)

---

## Summary table

| Task | Area | Priority | Effort estimate |
|------|------|----------|-----------------|
| TASK-001 | Unify Age Pension engine | P1 | 2 days |
| TASK-002 | Unify super contributions tax | P1 | 0.5 days |
| TASK-003 | Unify Monte Carlo engine | P1 | 3 days |
| TASK-004 | Fix investment income model | P1 | 1 day |
| TASK-005 | Fix advanced-design-engine stale constants | P1 | 1 day |
| TASK-006 | Stress tests apply scenario deltas | P2 | 1.5 days |
| TASK-007 | Recommendation impacts from simulation | P2 | 2 days |
| TASK-008 | PDF export shows real numRuns | P2 | 0.5 days |
| TASK-009 | agedCareProbability source annotation | P2 | 0.5 days |
| TASK-010 | `normalise-inputs.js` canonical module | P3 | 1 day |
| TASK-011 | `validate-inputs.js` canonical module | P3 | 1 day |
| TASK-012 | Unified result schema | P3 | 2 days |
| TASK-013 | Golden-output regression tests | P3 | 2 days |
| TASK-014 | Division 296 tax in all pipelines | P3 | 1 day |
| TASK-015 | Carry-forward concessional cap | P3 | 1.5 days |
| TASK-016 | Display which engine produced each result | P4 | 0.5 days |
| TASK-017 | Charts from canonical result object | P4 | 1 day |
| TASK-018 | Fix healthcare stress test $0 output | P4 | 0.5 days |
| TASK-019 | Input validation on JSON import | P4 | 1 day |

**Total estimated effort: ~23 developer days**

---

## What has already been fixed

The following items from enhancements.md Phase 1 are complete and tested:

- ✅ `hasDebt` string truthiness bug (`utils.js`)
- ✅ Monte Carlo per-year return sampling (`monte_carlo_engine.js`)
- ✅ Partner super contributions taxed at 15% + Division 293 (`life_simulation_engine.js`)
- ✅ Pension subtracted before computing super withdrawal need (`life_simulation_engine.js`)
- ✅ `numRuns` from user input honoured in Monte Carlo
- ✅ `agedCareProbability` user value honoured over AIHW default (`expense_engine.js`)
- ✅ `australianEquityAllocation` and `frankingRate` decimal thresholds fixed (`recommendation.js`, `app.js`, `tax-optimizer.js`)
- ✅ Division 293 applied to both primary and partner super contributions
- ✅ Investment income double-count in retirement removed
- ✅ Unused imports cleaned up
- ✅ Scenario 3 decimal arithmetic corrected (`recommendation.js`)
