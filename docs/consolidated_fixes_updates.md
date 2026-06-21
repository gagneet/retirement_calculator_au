# 📘 Consolidation Summary & PR Review Context (Formatted Markdown)

## 1. Primary Requests & Intent

### **Request 1 — Complete Remaining Calculator Consolidation Fixes**
The user asked to review the consolidation implementation described in:

- `docs/calculator_consolidation_agent_prompt.md`
- `docs/calculator_consolidation_analysis.md`

They had already implemented:

- Stochastic rate defects fix  
- Safe engine bridge (`ProjectionService`)  
- Advanced‑v2 migration with opt‑in cashflow  
- Canonical normalization idempotency fix  
- Classic advanced migration through `ProjectionService`  
- Reverse planner single‑projection‑source migration  
- Reverse manual mode using one projection object  
- `solveForCurrentInvestmentBalance` restored to `solveAllLevers`  
- Scenario Builder UI/engine  

Remaining items were to be completed.

---

### **Request 2 — Reverify All Work**
The user asked to:

- Re‑audit all previous updates  
- Identify mistakes, missing steps, unsupported assumptions, invented details  
- Rewrite updates more carefully  
- Provide confidence ratings (1–10)  
- Commit fixes separately  
- Create a PR to merge to master  

---

### **Request 3 — Review PR #100**
The user asked to run a code review on PR #100 using the `/code-review` skill.

---

## 2. Key Technical Concepts

### **Australian Retirement Calculator**
- Browser‑only static site  
- All computation in JavaScript  

### **Three Calculation Pipelines**
1. **Pipeline A** — `simulator.js` / `RetirementSimulator` (used by `advanced.html`)  
2. **Pipeline B** — `life_simulation_engine.js` (used by `advanced-v2.html`)  
3. **Pipeline C** — `advanced-design-engine.js`  

### **Consolidation Architecture**
- Canonical input schema  
- Input adapters  
- Household cashflow engine  
- `ProjectionService`  
- `RetirementSimulator`  
- Shared result/PDF/reverse  

### **ProjectionService**
- Normalises once  
- Builds engine inputs once  
- Deterministic simulation  
- Caches by FNV‑1a hash  

### **Household Cashflow Engine**
- Surplus = post‑tax income − spending − mortgage − explicit contributions  
- Allocation modes: cash / invest / mortgage_first / super_first / custom_split  
- Warnings for missing or zero spending  

### **ReverseScenarioEngine**
- 10 comparison paths  
- Calls `ReverseRetirementSolver.solveAllLevers()`  
- Produces required salary/super/savings outputs  

### **Bisection Solvers**
- `solveForCurrentInvestmentBalance`  
- `solveForCurrentSuperBalance`  
- `solveForSalary`  
- `solveForExtraAnnualSuper`  
- `solveForExtraSavings`  
- `solveForNetRent`  
- `solveForRetirementAge`  

### **Stochastic Sigma by Asset Class**
- Inflation/healthcare: 40%  
- Salary/savings: 30%  
- Super: 60% (floor −30%)  

### **Nominal vs Real**
- Savings always nominal  
- Real‑terms toggle is display‑only  

### **Input Hash**
- FNV‑1a over canonical input + raw input + policy version  

### **Tech Stack**
- ES2020 modules  
- Webpack 5  
- Tailwind CSS  
- Chart.js  
- jsPDF 3.x  
- Jest  

### **Australian Rules 2025–26**
- SG 12%  
- Concessional cap $30k  
- Non‑concessional $120k  
- Transfer Balance Cap $2M  
- Div 293 threshold $250k  

---

## 3. Files & Code Sections

### **`reverse-solver.js`**
Fix: `solveForCurrentInvestmentBalance()` was implemented but never called.

```js
investmentBalResult,   // added
solveForCurrentInvestmentBalance(...),  // added
```

---

### **`reverse-planner.js`**
Added missing partner fields:

```js
partnerCurrentAge: ...
partnerRetirementAge: ...
partnerLifespan: ...
```

---

### **`reverse-scenario-engine.js`**
New file implementing:

- Scenario definitions  
- Scenario application  
- Solver mapping  
- 10 scenario paths  

---

### **`reverse.html`**
Added Scenario Builder section:

- 9 input fields  
- 8 toggles  
- 11‑column results table  

---

### **`reverse-ui.js`**
Enhancements:

- Imported `ReverseScenarioEngine`  
- Added XSS‑safe `escapeHtml()`  
- Added scenario builder logic  
- Added PDF export integration  

---

### **Unit Tests**
- Added tests for `solveAllLevers`  
- Added 10 tests for `ReverseScenarioEngine`  

---

## 4. Errors & Fixes Identified

### **XSS Escape Fix**
`scenario.scenarioName` was unescaped in HTML injection.  
Fixed by wrapping with `escapeHtml()`.

---

### **Missing Test for Investment Balance Solver**
Added regression tests ensuring:

- `investmentBalance` is included  
- All lever types present  
- `currentScore` and `currentResult` returned  

---

## 5. Problem Solving Summary

- All **1122** existing tests passed  
- Added **10** new tests → total **1132**  
- Build compiles cleanly  
- PR #100 created with structured commits  

---

## 6. Verified Items During Re‑Audit

- Asset thresholds confirmed  
- Mock simulator compatibility validated  
- `applyTargetToEngineInputs` preserves `sellPropertyYears`  
- `adaptReverseManualInput` handles dual field names correctly  

---

## 7. All User Messages (Condensed)

1. Implement remaining consolidation fixes  
2. Pause + reverify + rewrite + confidence ratings + commit + PR  
3. Review PR  

---

## 8. Pending Tasks

- Complete PR #100 code review  
- Multi‑angle analysis was in progress when interrupted  

---

## 9. Current Work

The `/code-review` skill had fetched the 2773‑line diff and was entering analysis phases when the summary request interrupted it.

  Summary

  3 correctness bugs that affect calculation output:
  - Salary sigma 0.3 → should be 0.4 — Pipeline A MC underestimates salary variance by 25% vs spec.
  - Checkbox null-coercion — reverse planner scenario toggles unreliable when section is absent/not-yet-rendered.
  - noCurrentAssets leaves cashflow injections live — "salary only" scenario receives hidden $X/yr surplus, understating required salary.

  2 data-integrity bugs in new infrastructure:
  - mortgage_first unit mismatch — lump-sum balance treated as annual repayment capacity.
  - Dead fallback for imported zero-spend projections — silent $0 spending base after import.

  1 test fragility (removed Math.random pin without useStochasticReturns guards).

  4 cleanup/efficiency findings: sequential scenario solves (10× slower than needed), escapeHtml duplication with diverging implementations, unbounded
  projection cache, super_first concessional-cap double-count risk.

  The three correctness bugs and the two data bugs are the most important to address before merge. The salary sigma is also a CLAUDE.md convention violation
  (documented spec in §Stochastic Rate Model).

---------------------------------------------------------

Summary:
     1. Primary Request and Intent:

     **Request 1:** The user asked to look through a calculator consolidation implementation (described in `docs/calculator_consolidation_agent_prompt.md`
     and `docs/calculator_consolidation_analysis.md`) and complete remaining fixes. They had already implemented: stochastic rate defects fix, safe engine
     bridge (ProjectionService), advanced-v2 migration with opt-in cashflow, canonical normalization idempotency fix, classic advanced migration through
     ProjectionService, reverse planner single-projection-source migration, reverse manual mode using one projection object,
     `solveForCurrentInvestmentBalance` restored to `solveAllLevers`, and Scenario Builder UI/engine. They wanted the remaining items completed.

     **Request 2:** "Pause and reverify all the work completed. I believe there may be a glitch or you have missed some information. Please go through and
     review your previous updates and implementations for: mistakes, missing steps, unsupported assumptions and invented details. Then rewrite the updates
     and implementations more carefully and give a confidence rating from 1-10 for each. Then separately commit the various fixes done, and create a PR for
     the branch to merge to master."

     **Request 3:** "review the PR" — asking to run a code review on PR #100 using the `/code-review` skill.

     2. Key Technical Concepts:

     - **Australian Retirement Calculator** — browser-only static site, no backend, all computation in JavaScript
     - **Three calculation pipelines**: Pipeline A (`simulator.js`/`RetirementSimulator` used by `advanced.html`), Pipeline B (`life_simulation_engine.js`
     used by `advanced-v2.html`), Pipeline C (`advanced-design-engine.js`)
     - **Calculator consolidation architecture**: canonical input schema → input adapters → household cashflow engine → ProjectionService →
     RetirementSimulator → shared result/PDF/reverse
     - **ProjectionService**: normalises once, builds engine inputs once, runs deterministic simulation, caches by input hash (FNV-1a hash)
     - **Household cashflow engine**: derives surplus = post-tax income - spending - mortgage - explicit contributions; allocates via surplusAllocationMode
     (cash/invest/mortgage_first/super_first/custom_split)
     - **ReverseScenarioEngine**: 10 comparison paths per household, calls `ReverseRetirementSolver.solveAllLevers()` per scenario, maps lever results to
     required-salary/super/savings output columns
     - **Bisection solvers**: `solveForCurrentInvestmentBalance`, `solveForCurrentSuperBalance`, `solveForSalary`, `solveForExtraAnnualSuper`,
     `solveForExtraSavings`, `solveForNetRent`, `solveForRetirementAge`
     - **Stochastic sigma by asset class**: type-specific via `stochasticSigmaForRate(rate, type)` — inflation/healthcare at 40%, salary/savings at 30%,
     super at 60%, super floor now -30% not 0%
     - **Nominal vs real values**: savings balances always nominal; real-terms toggle is display-only
     - **Input hash**: FNV-1a hash over stable-stringified canonical input + raw input + policy version
     - **Tech stack**: ES2020 modules, webpack 5, Tailwind CSS (CDN), Chart.js, jsPDF 3.x, Jest
     - **Australian financial rules 2025-26**: SG 12%, concessional cap $30k, non-concessional $120k, Transfer Balance Cap $2M, Division 293 threshold $250k

     3. Files and Code Sections:

     - **`src/js/reverse-solver.js`** (modified, committed in fix commit 8ef90cc)
       - Added `investmentBalResult` to the `solveAllLevers` destructuring and `Promise.all()` array and `allLevers` array
       - Pre-existing omission: `solveForCurrentInvestmentBalance()` was fully implemented but never called in `solveAllLevers()`
       ```js
       const [
           extraSuperResult,
           salaryResult,
           retireAgeResult,
           superBalResult,
           investmentBalResult,   // ← added
           extraSavingsResult,
           netRentResult,
       ] = await Promise.all([
           solveForExtraAnnualSuper(...),
           solveForSalary(...),
           solveForRetirementAge(...),
           solveForCurrentSuperBalance(...),
           solveForCurrentInvestmentBalance(...),  // ← added
           solveForExtraSavings(...),
           solveForNetRent(...),
       ]);
       ```

     - **`src/js/reverse-planner.js`** (modified, committed in fix commit 8ef90cc)
       - Added missing couple fields to `normaliseReversePlannerInputs()`:
       ```js
       partnerCurrentAge: isCouple ? num(rawInputs.partnerAge ?? rawInputs.partnerCurrentAge, 50) : 0,
       partnerRetirementAge: isCouple ? num(rawInputs.partnerRetirementAge ?? rawInputs.retirementAge, 67) : 0,
       partnerLifespan: isCouple ? num(rawInputs.partnerLifespan ?? rawInputs.lifespan ?? rawInputs.yourLifespan, 90) : 0,
       ```

     - **`src/js/calculation/reverse-scenario-engine.js`** (new, committed in feat commit ecee859)
       - `ReverseScenarioEngine` class with `buildScenarioDefinitions(selected)`, `applyScenario(baseEngineInputs, target, scenario)`, `solveScenario(...)`,
     `compareScenarios(...)`
       - 10 comparison paths: `selected`, `home_super_pension`, `home_super_private`, `renter_super_pension`, `non_super_only`, `property_retained`,
     `property_sold`, `salary_only`, `aged_care`, `stress`
       - `applyScenario` adjusts engine inputs based on toggles: zeroes super when `includeSuper:false`, sets `pensionAssetThreshold` based on
     homeowner/renter status using `this.config.COUPLE_ASSET_THRESHOLD_NON_HOMEOWNER` etc., sets `sellPropertyYears` for property-sold scenario, applies
     stress return/inflation deltas
       - Returns: `requiredCurrentSuper`, `requiredCurrentNonSuperInvestments`, `requiredCurrentGrossSalary`, `requiredMonthlySurplus`,
     `requiredAnnualSalarySacrifice`, `expectedAgePensionContribution`, `expectedAssetsAtRetirement`, `expectedEstateAtLifespan`, `meetsGoal`, `warnings`

     - **`src/reverse.html`** (modified, committed in feat commit ecee859)
       - Added new `<section>` with id `rsb-section` above the existing planner sections
       - 9 input fields: household, rsb-age, rsb-partner-age, rsb-retirement-age, rsb-target-income (default $84,000), rsb-confidence (select 70/80/90%),
     rsb-lifespan, rsb-home-status, rsb-primary-rent
       - 8 toggle checkboxes: rsb-include-super (checked), rsb-include-pension (checked), rsb-include-non-super (checked), rsb-include-property,
     rsb-sell-property, rsb-include-downsizing, rsb-include-aged-care, rsb-include-overseas
       - Results table with 11 columns: Scenario, Current super needed, Non-super needed, Gross salary needed, Monthly surplus, Salary sacrifice,
     Property/rent, Age Pension, Assets at retirement, Estate, Warnings
       - `<tbody id="rsb-results-body">` dynamically filled

     - **`src/js/reverse-ui.js`** (modified, committed in feat commit ecee859; escaping fix included)
       - Added `import { ReverseScenarioEngine } from './calculation/reverse-scenario-engine.js'`
       - Added `escapeHtml(value)` helper function for XSS defense
       - Added `this.scenarioEngine = new ReverseScenarioEngine(ENHANCED_CONFIG)` in constructor
       - Added `handleScenarioBuilder()`: reads `projectionInput` + `target` + `selected` via `collectScenarioBuilderInputs()`, calls
     `this.planner.projectionService.computeProjection()`, then `this.scenarioEngine.compareScenarios()`, stores `scenarioBuilderResults` with `inputHash`
       - Added `collectScenarioBuilderInputs()`: reads rsb-* element IDs, merges `this.forwardProjection?.engineInputs ||
     this.lastResult?.projection?.engineInputs || {}`
       - Added `renderScenarioBuilderResults(scenarioSet)`: builds table rows with `escapeHtml(scenario.scenarioName)` (fix applied during review)
       - PDF export: scenario builder section with `autoTable` of 7 columns + deduplicated warnings via `infoBox`

     - **`tests/unit/reverse-solver.test.js`** (modified, committed in test commit fd25b32)
       - Added `ReverseRetirementSolver` to imports
       - Added `describe('ReverseRetirementSolver.solveAllLevers', ...)` block with 3 tests:
         - `'includes investmentBalance in rankedLevers — regression for previously omitted solver'`
         - `'includes all expected lever types in output'` (checks extraAnnualSuper, extraSavings, salary, retirementAge, superBalance, investmentBalance)
         - `'returns currentScore and currentResult alongside rankedLevers'`

     - **`tests/unit/reverse-scenario-engine.test.js`** (new, committed in test commit fd25b32)
       - 10 tests in `describe('ReverseScenarioEngine', ...)`
       - Tests: scenario count (10), $84k couple paths present, Age Pension/renter toggles, super-off zeroes balances, noCurrentAssets zeroes all,
     property-retained preserves values (no `sellPropertyYears`), property-sold sets `sellPropertyYears > 0`, aged-care-on sets defaults, aged-care-off
     zeroes cost, stress reduces returns and raises inflation, solver output column mapping

     - **`src/js/calculation/projection-service.js`** (existing, read for verification)
       - `ProjectionService` class: adapter → canonical input → cashflow derivation → `normaliseInputs(engineInputBuilder(...))` → `simulateRetirement` →
     cache by FNV-1a hash
       - Returns full projection: `{ inputHash, policyVersion, schemaVersion, sourceCalculator, canonicalInput, derivedCashflow, engineInputs, simulation,
     adaptedResult, yearlyData, summary, diagnostics, warnings }`

     - **`src/js/calculation/household-cashflow-engine.js`** (existing, read for verification)
       - `deriveHouseholdCashflow(canonicalInput)`: returns `{ monthlySurplus, annualSurplus, allocations: {cash, stocks, super, mortgage}, allocatedSurplus,
     unallocatedSurplus, warnings, canAllocateSurplus }`
       - Guards: `canAllocateSurplus = cashflow.hasDetailedExpenses && currentAnnualSpending > 0`
       - Warning when spending missing: `'Current household spending is missing, so no implicit surplus was allocated.'`
       - Warning when spending zero: `'Current household spending must be greater than zero before surplus can be allocated.'`

     - **`src/js/calculation/canonical-input-schema.js`** (existing, read for verification)
       - `normaliseCanonicalInput(input)` with full schema: household, income, currentAssets, cashflow, retirementTarget, housingAndPension, scenarioToggles,
     assumptions
       - Returns `{ schemaVersion: 'calculator-input-v1', ... }`

     - **`src/js/calculation/input-adapters/reverse-manual-adapter.js`** (existing, read for verification)
       - `adaptReverseManualInput(input)`: handles dual field names like `input.currentAge ?? input.yourCurrentAge`, `input.annualSalary ??
     input.yourSalary`, etc.

     - **`src/js/simulator.js`** (existing, read for verification of stochastic fixes)
       - `stochasticSigmaForRate(centralRate, rateType)`: type-specific sigma with settings for inflation/healthcare/salary/super/savings/generic
       - Super now uses floor `-0.30` (was `0`): `stochasticRate(inputs.superReturn, useRandomReturns, -0.30, stochasticSigmaForRate(...))`
       - Per-run inflation uses `effectiveInputs.inflation` (scenario-adjusted), not raw `inputs.inflation`

     4. Errors and Fixes:

     - **`scenario.scenarioName` unescaped in `renderScenarioBuilderResults`**: Found during the reverify audit. The scenario name was injected directly into
     `innerHTML` as `<strong>${scenario.scenarioName}</strong>` while warnings correctly used `escapeHtml()`. Fixed by changing to
     `<strong>${escapeHtml(scenario.scenarioName)}</strong>`. Names are hardcoded so not a real XSS vector, but inconsistent with the existing escaping
     pattern and violates defense-in-depth.

     - **No test for `solveAllLevers` including `investmentBalance`**: The key regression gap for the solver fix. Added `ReverseRetirementSolver` to imports
     and a new `describe` block in `reverse-solver.test.js`. Tests use the existing jest mock for `simulator.js` and `config.js`.

     5. Problem Solving:

     **Solved:**
     - All 1122 pre-existing tests continued to pass throughout
     - After adding 10 new tests, total is 1132 passing across 55 suites
     - Build (`npm run build`) compiles all three webpack bundles without errors
     - Three logical commits organized by concern (fix/feat/test)
     - PR #100 created at https://github.com/gagneet/retirement_calculator_au/pull/100

     **Verified items during reverify:**
     - `COUPLE_ASSET_THRESHOLD_NON_HOMEOWNER` confirmed in `config.js` at line 43: `COUPLE_ASSET_THRESHOLD_NON_HOMEOWNER: 739500`
     - Mock simulator compatibility: `solveForCurrentInvestmentBalance` varies `currentSavings`; mock uses `currentSavings` in its formula
     - `applyTargetToEngineInputs` returns a spread that preserves `sellPropertyYears` when set (for sold scenario) or leaves it undefined (for retained
     scenario)
     - `adaptReverseManualInput` correctly handles engine-level field names from `baseEngineInputs` via dual-field lookups

     6. All User Messages:

     - **Message 1:** "Issues identified in the documents/files for the application: Prompt to follow and implement the fixes:
     docs/calculator_consolidation_agent_prompt.md / Calculator consolidation analysis: docs/calculator_consolidation_analysis.md / I have implemented some
     of these already, specially the items described below. Can you look through these and start implementing and completing the rest of the fixes. A summary
     and narrative of the fixes and what was done is below: [10 bullet points describing completed work including stochastic audit, engine bridge,
     advanced-v2 migration, parity testing, classic migration, reverse migration, manual mode, investment balance solver, scenario builder, confidence
     separation]"

     - **Message 2:** "Pause and reverify all the work completed. I believe there may be a glitch or you have missed some information. Please go through and
     review your previous updates and implementations for: mistakes, missing steps, unsupported assumptions and invented details. Then rewrite the updates
     and implementations more carefully and give a confidence rating from 1-10 for each. Then separately commit the various fixes done, and create a PR for
     the branch to merge to master"

     - **Message 3:** "review the PR"

     7. Pending Tasks:

     - **Complete PR #100 code review**: The `/code-review 100` skill was invoked and is executing. It fetched the PR diff (2773 lines, 6 commits ahead of
     master covering the full consolidation) and was running multi-angle analysis. The review was interrupted by the summary request before producing
     findings.

     8. Current Work:

     Immediately before this summary request, the code review of PR #100 was in progress. The `/code-review` skill had been invoked for PR #100 and was in
     Phase 0 (gathering the diff via `gh pr diff 100`) when interrupted. The diff is 2773 lines covering:
     - `src/advanced-v2.html` — new current household cashflow section
     - `src/js/` — multiple calculation modules, adapters, reverse planner/solver/UI
     - `src/js/calculation/reverse-scenario-engine.js` — new file
     - `tests/unit/` — new and modified test files
     - `src/reverse.html` — scenario builder section

     The review was set up with high-effort parameters: "3+5 angles × 6 candidates → 1-vote verify (recall-biased) → ≤10 findings".

     9. Optional Next Step:

     The user asked "review the PR" and the `/code-review` skill was invoked. The review process started but was interrupted by this summary request. The
     next step is to **complete the PR #100 code review** — running the multi-angle finder analysis (angles A through Conventions) across the full 2773-line
     diff and producing the verified findings JSON array.

     Direct quote from the most recent exchange:
     - User: "review the PR"
     - System launched `/code-review` with args `100`
     - Review was in progress: `gh pr diff 100 2>&1 > /tmp/pr100.diff` completed (2773 lines), `git log master..HEAD --oneline` showed 6 commits, and the
     8-angle finder process was about to begin

     If you need specific details from before compaction (like exact code snippets, error messages, or content you generated), read the full transcript at:
     /home/gagneet/.claude/projects/-home-gagneet-finance-retirement-calculator-au/379bee96-8d82-48a5-aafd-eeae15b8a3c3.jsonl
     Continue the conversation from where it left off without asking the user any further questions. Resume directly — do not acknowledge the summary, do not
     recap what was happening, do not preface with "I'll continue" or similar. Pick up the last task as if the break never happened.

                                                                                                                           09:57 AM claude-sonnet-4-6
● The PR covers the entire branch. Let me run the finder angles in parallel:

● Agent(Correctness angle A — line-by-line diff scan)
  ⎿  Prompt:
       You are performing a code review on a retirement calculator codebase. Read the diff at /tmp/pr100.diff (use Bash: cat /tmp/pr100.diff). Then read
       any touched functions in the actual source files to understand context.

       Find up to 6 candidates with concrete failure scenarios. Focus on: inverted/wrong conditions, null/undefined deref, missing await, falsy-zero
       checks, wrong-variable copy-paste, error swallowed in catch, unescaped regex, off-by-one.

       For each candidate return: file, line number (from the diff or source), one-line summary, concrete failure scenario (inputs → wrong
       output/crash).

       Key files to check after reading the diff:
       - src/js/calculation/reverse-scenario-engine.js
       - src/js/reverse-ui.js
       - src/js/reverse-solver.js
       - src/js/reverse-planner.js
       - src/js/advanced-v2.js (projection service wiring)
       - src/js/calculation/projection-service.js
       - src/js/calculation/household-cashflow-engine.js

       Return JSON array of candidates.
  ⎿  Response:
       Here are the 6 candidates with concrete failure scenarios:

       [
         {
           "file": "src/js/calculation/household-cashflow-engine.js",
           "line": 56,
           "summary": "mortgage_first allocation cap mixes annual-flow units with a total-balance dollar amount",
           "scenario": "User has $300 k/yr surplus and a $50 k mortgage remaining. allocations.mortgage = Math.min(300000, 50000) = 50 000 (annual
       dollars). The canonical-engine-adapter then adds allocations.mortgage / 12 ≈ $4 167/mo as extra mortgage repayment. After ~12 months the full
       balance is repaid, but the engine keeps adding the overpayment to monthlyMortgagePayment for the rest of the accumulation phase, inflating
       savings by thousands of dollars and understating liquid investments."
         },
         {
           "file": "src/js/calculation/canonical-engine-adapter.js",
           "line": 15,
           "summary": "When totalSpendProvided is true (advanced-v2 'detailed cashflow' mode), currentMonthlyHousingCosts is written as 0 because the v2
       adapter never populates that field — all spending lands in currentMonthlyLivingCosts",
           "scenario": "User on advanced-v2 enables 'Model income minus current spending', enters $7 000/mo total spend. The canonical adapter receives
       currentMonthlyTotalSpend = 7 000 and currentMonthlyHousingCosts = 0. canonical-engine-adapter (line 15) writes
       engineInputs.currentMonthlyHousingCosts = 0. simulator.extractBaseExpensesFromCashFlow (simulator.js line 3773) then returns housingExpense = 0,
       livingExpense = 7 000. buildRetirementSpendingPlan computes retirementHousing = 0 and derives a lower essentialBase than intended, causing
       retirement withdrawal to be systematically underestimated for every year of the retirement phase."
         },
         {
           "file": "src/js/calculation/reverse-scenario-engine.js",
           "line": 123,
           "summary": "noCurrentAssets scenario block zeroes balances but not annualCashSavingsContribution, so the 'salary and savings path from zero'
       scenario still receives the derived cashflow surplus as a free annual injection",
           "scenario": "User has detailed cashflow enabled with $156 k/yr surplus allocated to cash. canonical-engine-adapter set
       engineInputs.annualCashSavingsContribution = 156 000 before the scenario engine runs. applyScenario for key='salary_only' zeroes
       yourCurrentSuper, currentSavings, currentStocks, investmentPropertyValue — but not annualCashSavingsContribution. simulator.js line 1891 takes
       the Number.isFinite branch and accumulates $156 000/yr from day one. The scenario result shows far higher required salary than it should, because
       the projection is secretly receiving $156 k/yr regardless."
         },
         {
           "file": "src/js/advanced-v2.js",
           "line": 1690,
           "summary": "Dead ?? fallback in normalizeImportedUserData: the arithmetic sub-expression always produces a number, so
       base.currentMonthlyLivingCosts is never reached",
           "scenario": "Old userData imported from a pre-PR forward projection that used only top-level expenses (no currentMonthlyTotalSpend, all
       component fields absent). The expression evaluates (undefined ?? 0) + (undefined ?? 0) + (undefined ?? 0) / 12 = 0, which is a number, so `??
       base.currentMonthlyLivingCosts` is never consulted. Result: currentMonthlyLivingCosts is silently set to 0 instead of the UI default, and the
       next calculation (if detailed cashflow is on) derives a $0 spending base, inflating the computed surplus and overstating accumulation."
         },
         {
           "file": "src/js/reverse-ui.js",
           "line": 481,
           "summary": "el('rsb-include-pension')?.checked !== false always returns true when the DOM element is absent, treating the missing checkbox as
       'pension included' regardless of user intent",
           "scenario": "handleScenarioBuilder() is called programmatically (e.g. from a test harness or before the rsb-section has been rendered into
       the DOM). el('rsb-include-pension') returns null, so ?.checked is undefined. undefined !== false evaluates to true. Both target.includeAgePension
       and selected.includeAgePension are forced to true, overriding any intent to model a private-savings-only scenario. solveScenario passes
       suppressAgePension: false, and all scenarios including 'home_super_private' (which explicitly sets includeAgePension: false in
       buildScenarioDefinitions) receive pension income in their baseline projection, inflating estimated assets at retirement."
         },
         {
           "file": "src/js/reverse-planner.js",
           "line": 336,
           "summary": "When hasCompleteProjection is true, solverBaseInputs = { ...projection.engineInputs } unconditionally, but the loaded forward
       projection may have been computed with a different targetAnnualIncomeToday, making the bisection solver search for the wrong goal",
           "scenario": "User saves a forward projection targeting $60 000/yr income. Later opens Reverse Planner with a new target of $90 000/yr.
       loadedProjection passes hasCompleteProjection=true (it has inputHash, canonicalInput, engineInputs, simulation). projectionInput overrides
       asfaComfortable and targetAnnualIncomeToday to $90 000 (lines 279-282) but the projection is the stale loaded one — projection.engineInputs still
       has asfaComfortable = 60 000. solverBaseInputs = { ...projection.engineInputs } inherits asfaComfortable = 60 000. applyTargetToEngineInputs on
       line 338 is supposed to correct this, but if the field name written there differs from the one the success predicate reads (asfaComfortable vs
       targetAnnualIncomeToday), the solver bisects against the old $60 k target and reports required values that are far too low."
         }
       ]

       Summary of findings:

       1. household-cashflow-engine.js:56 — unit mismatch in mortgage_first cap. availableSurplus is an annual dollar amount;
       currentAssets.mortgageBalance is the total outstanding balance. When annual surplus exceeds the remaining balance, the engine allocates more than
       the whole debt as an annual extra payment, causing perpetual overpayment after the mortgage is cleared.
       2. canonical-engine-adapter.js:15 — housing always zero in totalSpendProvided mode. The advanced-v2 adapter maps everything to
       currentMonthlyTotalSpend but never populates currentMonthlyHousingCosts. The adapter writes it as 0, so buildRetirementSpendingPlan computes a
       zero housing line and underestimates essential retirement spending.
       3. reverse-scenario-engine.js:123 — noCurrentAssets block misses annualCashSavingsContribution. The salary_only scenario zeroes all asset
       balances and stock contributions but not the derived surplus contribution injected by the canonical cashflow adapter. The "start from zero"
       scenario silently receives the full derived surplus, inflating required-salary solver results.
       4. advanced-v2.js:1690 — dead ?? fallback. The arithmetic sub-expression (A??0)+(B??0)+(C??0)/12 always evaluates to a number (never
       null/undefined), so ?? base.currentMonthlyLivingCosts is unreachable. Importing legacy user data with no spending fields silently yields 0
       instead of the UI default.
       5. reverse-ui.js:481 — el()?.checked !== false misreads absent checkboxes as checked. If the DOM element is null, undefined !== false is true,
       forcing includeAgePension = true even when the user never saw or set the checkbox.
       6. reverse-planner.js:336 — stale asfaComfortable in solver base inputs when loaded projection target differs. When a complete forward projection
       is loaded, solverBaseInputs inherits the projection's original asfaComfortable target. If the user opens Reverse Planner with a different income
       target, the bisection solvers search against the old goal.
  ⎿  Done (79 tool uses · 110.6k tokens · 8m 41s)

● Agent(Correctness angle B — removed-behavior auditor)
  ⎿  Prompt:
       You are performing a code review on a retirement calculator codebase. Read the diff at /tmp/pr100.diff (use Bash: cat /tmp/pr100.diff).

       Your job: for every line the diff DELETES or replaces, name the invariant or behavior it enforced, then search the NEW code for where that
       invariant is re-established. If you can't find it, surface it as a candidate.

       Focus on:
       - Guards that were removed
       - Error paths that were dropped
       - Validations narrowed
       - Tests deleted that covered real cases
       - Fallback logic removed

       Key areas to check:
       - Were there any pre-existing checks in reverse-planner.js, reverse-solver.js that got removed?
       - Does the new projection-service path drop any field that was previously passed through?
       - Does normaliseInputs being called on already-normalised inputs cause double-conversion of rates?

       Return JSON array of up to 6 candidates: {file, line, summary, failure_scenario}
  ⎿  Response:
       Now I have a complete picture. Let me compile the final analysis:

       [
         {
           "file": "src/js/calculation/projection-service.js",
           "line": 64,
           "summary": "normaliseInputs() called on output of engineInputBuilder, which for the reverse-planner path may already contain decimal-form
       rates (normalised by normaliseReversePlannerInputs). Calling normaliseInputs again on a field like mortgageRate=0.06 is idempotent (|0.06|≤1
       passes through), but for a legacy export where mortgageRate arrived as 6.0 and was already converted to 0.06 by normaliseReversePlannerInputs,
       passing through normaliseInputs is fine. However, the engineInputBuilder in reverse-planner.js conditionally skips normaliseReversePlannerInputs
       when rawInput.yourCurrentAge is already finite — in that branch it spreads the raw engineInputs from the forward-projection localStorage. Those
       engineInputs were normalised once by the originating calculator. The second normaliseInputs call is idempotent for values ≤1, but if the stored
       engineInputs had any rate field > 1 (e.g. a RATE_FIELD that was not caught by the first normaliser), it will be divided by 100 again, silently
       halving a rate.",
           "failure_scenario": "User imports a forward projection saved before PR#100 where a rate field (e.g. leanYearsReduction=0.3) was stored at its
       display value. The reverse-planner engineInputBuilder spreads those stored engineInputs verbatim, then projection-service.js calls
       normaliseInputs on them. leanYearsReduction=0.3 satisfies |v|≤1 so it passes through — but any field that was accidentally stored as a percentage
       (>1) gets divided again, corrupting the projection silently."
         },
         {
           "file": "src/js/reverse-planner.js",
           "line": 288,
           "summary": "Removed hasEngineInputs guard replaced with unconditional `projection.engineInputs` spread. The old code checked that
       projection.engineInputs was a non-empty object with a recognisable age field before trusting it as the solver base. The new code unconditionally
       uses `projection.engineInputs` as solverBaseInputs with no fallback. If ProjectionService.computeProjection throws or if the engineInputBuilder
       returns an object without yourCurrentAge (e.g. when forward-projection localStorage has malformed engineInputs), `solverBaseInputs` will contain
       a structurally incomplete object and all solver calls will silently compute with age=undefined, producing NaN-filled results.",
           "failure_scenario": "If `loadedProjection.engineInputs` exists but is missing `yourCurrentAge` (e.g. stored from a pipeline that uses `age`
       instead), the removed guard would have fallen back to `baseInputs`. Now solverBaseInputs gets `yourCurrentAge=undefined`, causing the solver to
       compute yearsToRetirement as NaN, which propagates through bisection to produce Infinity or NaN targets for all levers."
         },
         {
           "file": "src/js/calculation/canonical-input-schema.js",
           "line": 18,
           "summary": "totalSpendProvided is derived purely from whether the key 'currentMonthlyTotalSpend' exists in cashflow, not from whether it is
       non-zero. The advanced-v2-adapter always passes cashflow.currentMonthlyTotalSpend=input.currentMonthlyLivingCosts even when useDetailedCashflow
       is false and currentMonthlyLivingCosts=0. This means totalSpendProvided becomes true even for users with the feature disabled, so
       household-cashflow-engine.js uses currentMonthlyTotalSpend=0 as the spending figure when hasDetailedExpenses=false — causing
       currentAnnualSpending=0 and canAllocateSurplus=false. The interaction with hasDetailedExpenses gating canAllocateSurplus saves it from
       double-counting, but the schema state (totalSpendProvided=true, hasDetailedExpenses=false) is inconsistent and could affect future consumers of
       canonicalInput.",
           "failure_scenario": "Any code that reads canonicalInput.cashflow.totalSpendProvided to decide spending basis (e.g. a future reporting layer)
       will see true even when the user never enabled detailed cashflow. This could cause incorrect UI labels or comparison logic to show 'total spend
       basis' when the user set explicit contributions only."
         },
         {
           "file": "src/js/reverse-planner.js",
           "line": 1405,
           "summary": "Deleted line `g.normalizedValue = totalAchieved > 0 ? g.achievedValue / totalAchieved : 0` removed from buildCurrentPath. This
       line no longer exists anywhere in the codebase — neither in the pre-PR nor post-PR versions (it appears to have referenced variables `g` and
       `totalAchieved` that are not declared elsewhere in buildCurrentPath). The deletion is correct in isolation but signals the line may have been a
       leftover from an old gap-loop that was partially cleaned up in an earlier PR, leaving dead code that this PR removes. No invariant is lost, but
       confirms the old gap analysis loop was silently writing to a `g` object that is no longer returned or tested.",
           "failure_scenario": "Non-issue for runtime, but indicates a test gap: no test in the existing suite asserted on
       `currentPath.gaps[*].normalizedValue`, so any consumer that was expecting a normalized weight breakdown of gap components will silently receive
       `undefined`."
         },
         {
           "file": "tests/integration/reverse-integration.test.js and tests/unit/reverse-solver-roundtrip.test.js",
           "line": 1957,
           "summary": "Both files removed the `beforeAll` that pinned `Math.random` to 0.5. The stated justification is that deterministic mode is now
       truly deterministic (Box-Muller with mocked random=0.5 was the old workaround). However, ProjectionService calls simulateRetirement with
       stochastic=false, so the simulator's stochasticRate should return the central value unchanged. But stochasticRate is called with isStochastic
       from `effectiveInputs.useStochasticReturns`, not from the second argument in all call sites — if any call site inside simulateRetirement passes
       `useRandomReturns=true` regardless of the deterministic flag, removing the Math.random pin will make those tests non-deterministic and bisection
       tolerances may occasionally fail.",
           "failure_scenario": "If any per-year stochasticRate call inside simulator.js uses `useRandomReturns` that evaluates to true in a test run
       (e.g. because a test fixture passes `useStochasticReturns: true` or a default evaluates truthy), the bisection solver round-trip tests will now
       produce different solved values across runs, causing sporadic CI failures that are hard to reproduce locally."
         },
         {
           "file": "src/js/calculation/canonical-engine-adapter.js",
           "line": 26,
           "summary": "When canAllocateSurplus is true and surplusAllocationMode='super_first', the adapter sets yourAdditionalSuperContribution +=
       derivedCashflow.superByMember.primary but does NOT update employerSuperContributionRate or flag that the additional super is post-tax vs pre-tax.
       The household-cashflow-engine warning notes this ('Super-first amounts require the projection adapter to model contribution tax'). The old code
       path had no surplus allocation at all, so no incorrect super contribution was ever injected. Now the engine receives inflated
       yourAdditionalSuperContribution without the corresponding concessional-cap check that app.js normally performs in validateInputs, so a user with
       a large surplus could silently exceed the $30,000 concessional cap and the simulator will not cap it.",
           "failure_scenario": "A couple with $20k/month income and $5k/month spending in 'super_first' mode: surplus=$15k/month=$180k/year. After
       employer SG, primaryCapRoom is only $18k. The engine correctly caps to $18k. But the adapter adds $18k to the existing
       yourAdditionalSuperContribution without checking whether the user already entered an explicit salary sacrifice that consumed part of that cap —
       resulting in total concessional contributions exceeding $30,000 with no warning and no cap enforcement in the simulation."
         }
       ]

       Here is the JSON array of candidates:

       [
         {
           "file": "src/js/calculation/projection-service.js",
           "line": 64,
           "summary": "normaliseInputs() called on engineInputBuilder output which, in the reverse-planner path, may already have decimal rates from a
       prior normalisation pass. The engineInputBuilder conditionally skips normaliseReversePlannerInputs when rawInput.yourCurrentAge is already
       finite, spreading stored localStorage engineInputs directly. If any RATE_FIELD value in those stored inputs is > 1 (e.g. from an older export),
       the second normaliseInputs call will halve it silently.",
           "failure_scenario": "User opens the reverse planner after importing a pre-PR100 forward projection where a rate field was stored as a
       percentage (>1). The stored engineInputs are spread verbatim by the engineInputBuilder, then normaliseInputs divides the field again, corrupting
       the projection with no error or warning."
         },
         {
           "file": "src/js/reverse-planner.js",
           "line": 336,
           "summary": "Removed hasEngineInputs guard (which checked projection.engineInputs was non-empty and had a valid age field) is not replaced.
       The new code unconditionally uses projection.engineInputs as solverBaseInputs. If engineInputBuilder returns an object without yourCurrentAge
       (possible when the forward-projection localStorage payload comes from a calculator that stores the field as 'age' instead), all solver calls
       receive yourCurrentAge=undefined, producing NaN yearsToRetirement through every bisection lever.",
           "failure_scenario": "A projection stored by the classic advanced.html page uses 'age' not 'yourCurrentAge' as the primary age key. The old
       guard fell back to baseInputs in this case; the new code blindly spreads the incomplete engineInputs, and every lever solve returns Infinity or
       NaN."
         },
         {
           "file": "src/js/calculation/canonical-input-schema.js",
           "line": 18,
           "summary": "totalSpendProvided is derived from key presence ('currentMonthlyTotalSpend' in cashflow), not from whether the value is non-zero
       or whether the user opted in. The advanced-v2-adapter always passes currentMonthlyTotalSpend=input.currentMonthlyLivingCosts even when
       useDetailedCashflow=false and the field value is 0. So totalSpendProvided becomes true regardless of the toggle, leaving canonicalInput in an
       inconsistent state (totalSpendProvided=true, hasDetailedExpenses=false) that any future consumer reading totalSpendProvided alone would
       misinterpret.",
           "failure_scenario": "A reporting layer or future canonical consumer reads canonicalInput.cashflow.totalSpendProvided=true and assumes a
       total-spend basis was entered, and switches to totalSpend-based expense display, even though the user left all cashflow fields at zero and never
       enabled detailed cashflow."
         },
         {
           "file": "tests/integration/reverse-integration.test.js and tests/unit/reverse-solver-roundtrip.test.js",
           "line": 1957,
           "summary": "Both test files removed the beforeAll that pinned Math.random to 0.5. The stated reason is that deterministic mode is now truly
       deterministic. However the flag controlling stochastic mode inside simulator.js is effectiveInputs.useStochasticReturns, not the second argument
       to simulateRetirement alone. If a test fixture inadvertently carries useStochasticReturns: true (or undefined where the default is truthy),
       removing the random pin will make bisection results vary across runs.",
           "failure_scenario": "A test fixture in either suite passes useStochasticReturns without explicitly setting it to false. The simulator draws
       random normal values, bisection converges to a slightly different fixed point each run, and a tolerance-bounded assertion like toBeCloseTo(x, 0)
       fails intermittently in CI."
         },
         {
           "file": "src/js/calculation/canonical-engine-adapter.js",
           "line": 34,
           "summary": "In super_first surplus allocation mode, the adapter increments yourAdditionalSuperContribution by
       derivedCashflow.superByMember.primary without checking whether existing explicit salary sacrifice (also stored in yourAdditionalSuperContribution
       after normalisation) has already consumed part or all of the concessional cap. The household-cashflow-engine computes capRoom against
       income.employerSuperAnnual and cashflow.explicitAnnualSalarySacrifice, but the adapter then adds the surplus super on top of the existing
       yourAdditionalSuperContribution without re-capping.",
           "failure_scenario": "A user with $18,000 salary sacrifice already entered and employer SG of $12,000 has zero remaining concessional cap.
       household-cashflow-engine correctly computes primaryCapRoom=0 so superByMember.primary=0. But if the user's explicit salary sacrifice was passed
       as salarySacrifice (raw) and normalised into yourAdditionalSuperContribution at a different point in the chain, the adapter may add a second copy
       of the sacrifice, silently doubling super contributions past the cap with no capping or warning in the simulation."
         },
         {
           "file": "src/js/reverse-planner.js",
           "line": 278,
           "summary": "When hasCompleteProjection is false (no valid localStorage projection), projectionInput is constructed from
       loadedProjection.engineInputs if they exist, even when hasCompleteProjection failed because canonicalInput.schemaVersion was absent. This means
       an old-format payload where engineInputs are present but canonicalInput is null will use those engineInputs as the raw input to
       projectionService.computeProjection, bypassing normaliseReversePlannerInputs entirely. The old code path in this branch was
       `buildCurrentPath(baseInputs, resolvedTarget)` which used fully normalised baseInputs.",
           "failure_scenario": "A v1 forward projection payload has engineInputs but no canonicalInput.schemaVersion. hasCompleteProjection=false, so
       the else branch runs computeProjection with loadedProjection.engineInputs. These inputs are already normalised engine-format objects, so
       adaptReverseManualInput maps them through canonical-input-schema (which applies normaliseRate to assumptions.*), then normaliseInputs is called
       again — double-normalising any rate field that arrives as a decimal in a RATE_FIELDS set that treats |v|>1 as a percentage. For values already ≤1
       this is idempotent, but the path is fragile and not tested."
         }
       ]
  ⎿  Done (41 tool uses · 96.7k tokens · 3m 39s)

● Agent(Correctness angle C — cross-file call-site tracer)
  ⎿  Prompt:
       You are performing a code review on a retirement calculator codebase. Read the diff at /tmp/pr100.diff (use Bash: cat /tmp/pr100.diff).

       Your job: for each function the diff changes or adds, find its callers and check whether the change breaks any call site. Also check callees —
       does a parallel change make a call unsafe?

       Specific things to trace:
       1. solveAllLevers now returns investmentBalResult in its output. Check all callers of solveAllLevers in the codebase (grep for it) and verify
       they handle the new lever correctly.
       2. normaliseReversePlannerInputs now returns partnerCurrentAge, partnerRetirementAge, partnerLifespan. Find callers. Do any callers break or
       ignore these new fields?
       3. ReverseScenarioEngine.applyScenario — are this.config.COUPLE_ASSET_THRESHOLD, COUPLE_ASSET_LIMIT, SINGLE_ASSET_THRESHOLD, SINGLE_ASSET_LIMIT
       etc. all guaranteed to be present in the config passed to the constructor? (Check what config the ReverseUI passes)
       4. handleScenarioBuilder in reverse-ui.js calls this.planner.projectionService.computeProjection(projectionInput, ...) where projectionInput may
       contain engine-level fields mixed with raw UI fields. Does the projection service adapter handle this correctly?
       5. The compareScenarios call passes projection.engineInputs — these come from normaliseInputs(). Does applyScenario then call normaliseInputs
       again (double-normalisation)?

       Use Bash to grep for callers. Read the relevant source files. Return JSON array of up to 6 candidates: {file, line, summary, failure_scenario}
  ⎿  Response:
       I now have everything I need to produce the review. Here is the JSON array of findings:

       [
         {
           "file": "src/js/reverse-planner.js",
           "line": 340,
           "summary": "solveAllLevers caller destructures only { rankedLevers } — investmentBalResult is inside rankedLevers and is handled, but the
       return value comment only shows currentScore, currentResult, rankedLevers. This caller is fine; investmentBalResult is inside rankedLevers after
       rankLevers() is called in the solver, so it is automatically included in the ranked output and picked up by reverse-ui.js's switch-case for
       'investmentBalance'. No breakage here.",
           "failure_scenario": "No failure. The new lever enters rankedLevers via allLevers[], and both reverse-planner.js and reverse-ui.js already
       have 'investmentBalance' case handling in their switch statements (lines 961, 979, 1469, 1490 of reverse-ui.js). However, the new lever was not
       previously in rankedLevers, so any call sites that assumed a specific index in rankedLevers[] rather than using .find() would silently shift. All
       existing callers use .find(), so this is safe."
         },
         {
           "file": "src/js/reverse-ui.js",
           "line": 455,
           "summary": "handleScenarioBuilder passes projectionInput (containing raw UI fields like currentAge, yourCurrentAge, partnerAge,
       partnerCurrentAge, etc.) directly to this.planner.projectionService.computeProjection(). The ReversePlanner's engineInputBuilder has a guard: 'if
       Number.isFinite(rawInput.yourCurrentAge) → use rawInput as-is, else call normaliseReversePlannerInputs(rawInput)'. Since projectionInput sets
       yourCurrentAge: currentAge (a number), the guard passes through the raw object unchanged. The raw object also carries keys from baseEngineInputs
       (possibly from a prior engine run) mixed with the RSB form fields. The adaptReverseManualInput adapter reads input.currentAge ??
       input.yourCurrentAge for household.currentAge, so it correctly finds yourCurrentAge. However the raw object may also carry engine-level fields
       (e.g., _normalisedAt, canonicalInputSchemaVersion) from a prior engineInputs spread, which get hashed but do not break anything.",
           "failure_scenario": "No hard crash, but if baseEngineInputs comes from this.forwardProjection?.engineInputs (which already went through
       normaliseInputs and has _normalisedAt etc.), those stale metadata keys participate in the input hash, causing spurious cache misses on the second
       run when the scenario-builder re-runs with the same UI inputs but the prior engineInputs reference differs. Not a data correctness bug, but a
       performance/cache coherence issue."
         },
         {
           "file": "src/js/calculation/reverse-scenario-engine.js",
           "line": 143,
           "summary": "applyScenario reads this.config.COUPLE_ASSET_THRESHOLD, COUPLE_ASSET_LIMIT, SINGLE_ASSET_THRESHOLD, SINGLE_ASSET_LIMIT,
       COUPLE_ASSET_THRESHOLD_NON_HOMEOWNER, COUPLE_ASSET_LIMIT_NON_HOMEOWNER, SINGLE_ASSET_THRESHOLD_NON_HOMEOWNER, SINGLE_ASSET_LIMIT_NON_HOMEOWNER.
       ReverseUI passes ENHANCED_CONFIG to new ReverseScenarioEngine(ENHANCED_CONFIG). ENHANCED_CONFIG (config.js lines 37-44) defines all eight
       constants. No missing keys.",
           "failure_scenario": "Safe. All eight pension-threshold constants are present in ENHANCED_CONFIG. A risk would arise only if
       ReverseScenarioEngine were constructed with a different config object (e.g., a test stub). Tests in reverse-scenario-engine.test.js pass
       ENHANCED_CONFIG, which contains all constants."
         },
         {
           "file": "src/js/reverse-planner.js",
           "line": 67,
           "summary": "normaliseReversePlannerInputs now returns partnerCurrentAge, partnerRetirementAge, partnerLifespan. The only callers in src are:
       (1) the engineInputBuilder inside ReversePlanner.projectionService (line 138) — the returned object is passed as baseEngineInputs to
       applyCanonicalCashflowToEngineInputs and then to normaliseInputs in projection-service.js; (2) ReversePlanner.solve() (line 244) — result is used
       only as baseInputs for householdMeta building and the return value's inputs field. The simulator already reads partnerCurrentAge,
       partnerRetirementAge, partnerLifespan from inputs (simulator.js lines 1039, 1065, 1270-1272), so the new fields are additive and safe. Tests in
       reverse-planner-regression.test.js cover the single-household path where they are 0.",
           "failure_scenario": "No failure for the callers in src. However, any external caller that pattern-matches or spreads the return value
       expecting the old three-field shape (yourCurrentAge, retirementAge, yourLifespan) and doesn't tolerate extra keys could get confused — but no
       such caller exists in src. The new fields are ignored by callers that don't use them."
         },
         {
           "file": "src/js/reverse-planner.js",
           "line": 288,
           "summary": "When loadedProjection has engineInputs but is NOT treated as hasCompleteProjection (e.g., lacks inputHash or
       canonicalInput.schemaVersion), projectionInput is built as { ...loadedProjection.engineInputs, ... } and passed to
       projectionService.computeProjection(). The engineInputBuilder checks Number.isFinite(rawInput.yourCurrentAge). If loadedProjection.engineInputs
       uses the old field name yourCurrentAge (from the classic calculator), this passes. If however it uses a different key like 'age' (from
       advanced-v2), yourCurrentAge is undefined, and normaliseReversePlannerInputs is called on the engine-level object which lacks the expected
       rawInput fields (currentAge, partnerAge, etc.). normaliseReversePlannerInputs then falls back to defaults (age 50, retirement 67) rather than the
       loaded values.",
           "failure_scenario": "Regression: if a forward projection was stored by advanced-v2 (where engineInputs uses keys like 'age' not
       'yourCurrentAge') and the payload lacks inputHash, the reverse planner falls back to normaliseReversePlannerInputs on the engine inputs, reads
       default age 50 instead of the user's actual age, and produces a wrong solver baseline. The hasCompleteProjection guard was tightened in this diff
       to also require canonicalInput.schemaVersion, which means old payloads that have engineInputs and simulation but no inputHash/schemaVersion now
       fall through to projectionService.computeProjection with potentially mis-keyed engine inputs."
         },
         {
           "file": "src/js/calculation/projection-service.js",
           "line": 64,
           "summary": "ProjectionService.computeProjection() calls normaliseInputs() on the output of engineInputBuilder (line 64), and compareScenarios
       in ReverseScenarioEngine calls this.planner.projectionService.computeProjection(projectionInput) then passes projection.engineInputs directly to
       solveScenario → applyScenario → solver.solveAllLevers. The solver does NOT call normaliseInputs internally. So engineInputs has already been
       through normaliseInputs once (in projection-service). applyScenario then mutates a shallow copy and passes it to applyTargetToEngineInputs which
       also does not re-normalise. This is correct — no double-normalisation. The concern in question 5 is a false alarm: compareScenarios receives
       projection.engineInputs (already normalised) and applyScenario does not call normaliseInputs again.",
           "failure_scenario": "No double-normalisation bug. However, there is a subtle issue: applyScenario reads inputs.investmentReturn and
       inputs.superReturn (lines 1179-1181) but these fields come from the engine inputs produced by the reverse-manual adapter. If the user did not
       provide those fields in the RSB form and baseEngineInputs was empty (this.forwardProjection and this.lastResult?.projection?.engineInputs are
       both null on first load), investmentReturn and superReturn will be undefined, and the stress scenario applies 'Math.max(0, undefined - 0.02)' =
       0. This silently zeroes the return rates for the stress scenario rather than using sensible defaults."
         }
       ]

       Here is a summary of the findings:

       ---
       Finding 1 — solveAllLevers / investmentBalResult (safe)
       investmentBalResult is added to allLevers[] and flows into rankedLevers via rankLevers(). Both call sites in reverse-planner.js and reverse-ui.js
       consume rankedLevers generically using .find() / .filter(), and reverse-ui.js already has a case 'investmentBalance': in both its
       leverCurrentValue and leverRequiredValue switch blocks (lines 961, 979, 1469, 1490). No breakage.

       Finding 2 — normaliseReversePlannerInputs new partner fields (safe)
       The three new fields (partnerCurrentAge, partnerRetirementAge, partnerLifespan) are returned alongside the original fields. All callers in src/
       either spread the result into objects the simulator already reads (which consumes those fields correctly via simulator.js lines 1039, 1065,
       1270-1272) or use named destructuring that simply ignores the extra fields. Additive and safe.

       Finding 3 — ReverseScenarioEngine config keys (safe)
       All eight pension-threshold constants (COUPLE_ASSET_THRESHOLD, COUPLE_ASSET_LIMIT, SINGLE_ASSET_THRESHOLD, SINGLE_ASSET_LIMIT, and the four
       _NON_HOMEOWNER variants) are defined in ENHANCED_CONFIG at config.js lines 37-44. ReverseUI passes ENHANCED_CONFIG to new
       ReverseScenarioEngine(ENHANCED_CONFIG). No missing keys.

       Finding 4 — handleScenarioBuilder projectionInput with mixed fields (minor cache issue)
       The projectionInput built in collectScenarioBuilderInputs() spreads baseEngineInputs (which may already be a normalised engine-inputs object with
       _normalisedAt, canonicalInputSchemaVersion, etc.) together with fresh UI fields. These metadata keys from a prior engine run participate in the
       FNV-1a hash, causing spurious cache misses on repeat runs with identical user inputs. Not a data correctness bug but a cache coherence defect.

       Finding 5 — Potential regression on old forward projections without inputHash/schemaVersion (real bug)
       hasCompleteProjection now requires loadedProjection.inputHash && loadedProjection.canonicalInput?.schemaVersion. Old payloads stored before this
       PR (which have engineInputs and simulation but no inputHash) no longer qualify. They fall into the
       projectionService.computeProjection(projectionInput) branch where projectionInput = { ...loadedProjection.engineInputs, ... }. If those engine
       inputs use advanced-v2 key names (age not yourCurrentAge), the engineInputBuilder's guard Number.isFinite(rawInput.yourCurrentAge) evaluates
       undefined → false, so normaliseReversePlannerInputs() is called on the already-engine-level object and defaults age to 50 rather than the user's
       real age. File: /home/gagneet/finance/retirement_calculator_au/src/js/reverse-planner.js, line 278–291.

       Finding 6 — Stress scenario silently zeroes returns when RSB has no prior projection (real bug)
       In applyScenario (lines 1179-1181 of reverse-scenario-engine.js), the stress branch does:
       inputs.investmentReturn = Math.max(0, (inputs.investmentReturn || 0.07) - 0.02);
       inputs.superReturn = Math.max(0, (inputs.superReturn || 0.075) - 0.02);
       These fields are read from the engine inputs output by projectionService. When baseEngineInputs in collectScenarioBuilderInputs() comes from an
       empty object (no forward projection loaded, no prior result), the engine inputs go through normaliseInputs() which fills defaults, so
       investmentReturn and superReturn will actually be populated from DEFAULT_RATES. This is fine normally — but the || 0.07 / || 0.075 fallbacks in
       applyScenario are different from the normaliseInputs defaults, creating a subtle inconsistency if the normalised defaults ever differ. Not a hard
       crash, but worth verifying the default values agree.
  ⎿  Done (38 tool uses · 86.6k tokens · 2m 42s)

● Agent(Angles: reuse + simplification + efficiency + altitude + conventions)
  ⎿  Prompt:
       You are performing a code review on a retirement calculator codebase. Read the diff at /tmp/pr100.diff (use Bash: cat /tmp/pr100.diff). Read
       CLAUDE.md at /home/gagneet/finance/retirement_calculator_au/CLAUDE.md and any relevant source files.

       Run 5 sub-angles and surface up to 6 total candidates:

       Reuse: Does any new code re-implement something already in the codebase? Grep shared/utility modules. Name the existing helper.

       Simplification: Redundant state, copy-paste with slight variation, deep nesting, dead code. Name the simpler form.

       Efficiency: Redundant computation, sequential independent operations, memory leaks from closures. In particular: does
       ReverseScenarioEngine.compareScenarios run scenarios sequentially in a for-loop when they could run in parallel? Does handleScenarioBuilder
       create a new projection for each call when the inputs haven't changed?

       Altitude: Is any fix a band-aid on shared infrastructure? Special-casing that should be generalized?

       Conventions (CLAUDE.md): Read CLAUDE.md carefully. Check:
       - "No emoji in PDF output" — do any strings added to PDF sections contain emoji?
       - "stochasticRate" usage conventions
       - Nominal vs real values — does any new code confuse them?
       - Pipeline A/B/C separation — does new code correctly stay in its lane?
       - Any comment styles that violate "default to writing no comments"?

       Quote the exact rule and exact line for any conventions finding.

       Return JSON array of up to 6 candidates: {file, line, summary, failure_scenario}
  ⎿  Response:
       Here is the review result:

       [
         {
           "file": "src/js/calculation/reverse-scenario-engine.js",
           "line": 186,
           "summary": "Efficiency: compareScenarios runs 10 scenario solves sequentially in a for-await loop instead of using Promise.all. Each
       solveScenario call awaits solver.solveAllLevers which itself uses Promise.all internally. The outer sequential loop leaves 9 of 10 lever-solve
       batches waiting for the previous one to finish.",
           "failure_scenario": "A single handleScenarioBuilder invocation takes approximately 10× longer than necessary for a user on a slow device.
       Since each solveScenario call is independent (baseEngineInputs is immutable), all 10 can be dispatched together: `const results = await
       Promise.all(definitions.map(def => this.solveScenario(baseEngineInputs, target, def, options)))`."
         },
         {
           "file": "src/js/reverse-ui.js",
           "line": 52,
           "summary": "Reuse: escapeHtml is re-defined verbatim in reverse-ui.js (line 52) when an identical function already exists at
       src/js/advanced-v2.js line 1458. The two implementations diverge on the single-quote encoding ('&#039;' vs '&#39;'). Neither is exported from a
       shared module.",
           "failure_scenario": "If the encoding logic is ever changed in one file the other silently stays stale. The fix is to export escapeHtml from
       utils.js (where it logically belongs alongside formatCurrency and DOM helpers) and import it in both callers."
         },
         {
           "file": "src/js/simulator.js",
           "line": 82,
           "summary": "Conventions (CLAUDE.md): stochasticSigmaForRate sets salary multiplier to 0.3, but CLAUDE.md §Stochastic Rate Model states
       'Salary growth: σ = max(0.5%, |rate| × 40%)'. Pipeline B (life_simulation_engine.js line 206) correctly uses 0.4. The new shared function
       diverges from the documented spec and from Pipeline B, undervolatilyzing salary variance in Pipeline A by 25%.",
           "failure_scenario": "MC runs via Pipeline A will show narrower salary distributions than Pipeline B for the same inputs. CLAUDE.md rule
       quoted verbatim: 'Salary growth: σ = max(0.5%, |rate| × 40%), floor = −5%'. Fixing: change `salary: { minimum: 0.005, multiplier: 0.3 }` to
       `multiplier: 0.4` in stochasticSigmaForRate."
         },
         {
           "file": "src/js/calculation/projection-cache.js",
           "line": 1,
           "summary": "Efficiency: ProjectionCache is an unbounded Map with no eviction policy. Each unique rawInput+policyVersion combination is cached
       forever in the module-level projectionService singleton. On the advanced-v2 page every form change with 'useDetailedCashflow' toggled or slider
       moved produces a new hash entry that is never released.",
           "failure_scenario": "A user who spends a long session adjusting inputs accumulates hundreds of cached projections (each holding a full
       simulation result including yearlyData arrays). On mobile devices or over a long session this can exhaust heap before a page refresh. A simple
       fix is a max-size LRU or just clearing the cache when size exceeds a threshold (e.g., 50 entries)."
         },
         {
           "file": "src/js/calculation/household-cashflow-engine.js",
           "line": 59,
           "summary": "Altitude: The super-first allocation path hard-codes `ENHANCED_CONFIG.CONCESSIONAL_CAP || 30000` as a fallback for the
       concessional cap room calculation. This is the same value already guaranteed by config.js (CONCESSIONAL_CAP: 30000) but the pattern bypasses the
       `policy-engine.js` cap resolution that already handles the SG rate, salary-sacrifice interactions, and carry-forward unused amounts.",
           "failure_scenario": "If config.js is updated to 2026-27 legislation (e.g., a scheduled cap increase to $32,500), the super-first allocation
       in household-cashflow-engine.js will continue to apply the old $30,000 cap because it reads the flat config key rather than going through the
       policy engine's full concessional capacity calculation. The fix is to import `calculateConcessionalCapRoom` (or equivalent) from policy-engine.js
       rather than reading the raw cap."
         },
         {
           "file": "src/js/calculation/projection-service.js",
           "line": 55,
           "summary": "Simplification: The inputHash deliberately includes rawInput alongside canonicalInput (comment: 'transitional until
       CanonicalInput covers every projection-relevant field'). However, both the rawInput object and the derivedCashflow are already derivable from
       canonicalInput once the adapters are complete. Including rawInput in the hash means structurally equivalent inputs that arrive with different
       key-name aliases (e.g., 'invReturn' vs 'investmentReturn') produce different hashes and bypass the cache, defeating its purpose.",
           "failure_scenario": "Callers like handleScenarioBuilder construct projectionInput by spreading forwardProjection.engineInputs over form
       fields. If the forward projection used 'investmentReturn' and the manual form uses 'invReturn', two identical economic scenarios will get
       different hashes and both be computed and stored. The comment acknowledges this is temporary; the fix is tracking when adapters are complete and
       removing rawInput from the hash at that point."
         }
       ]
  ⎿  Done (55 tool uses · 93.6k tokens · 3m 45s)
  ⎿  Referenced file src/js/reverse-ui.js
  ⎿  Read tests/unit/reverse-scenario-engine.test.js (263 lines)
  ⎿  Referenced file tests/unit/reverse-solver.test.js
  ⎿  Referenced file src/js/reverse-planner.js
  ⎿  Referenced file src/reverse.html
  ⎿  Skills restored (code-review)

