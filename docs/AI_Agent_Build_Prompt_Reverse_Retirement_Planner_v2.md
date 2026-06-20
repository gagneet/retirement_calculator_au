# AI Agent Build Prompt — Reverse Retirement Planner (repo-grounded v2)

**Target repo:** `gagneet/retirement_calculator_au`
**Supersedes:** `AI_AGENT_PROMPT_REVERSE_RETIREMENT_PLANNER.md` (v1). The product
vision, required questions, output format, edge cases, guardrails and phasing in v1
are good — **keep them**. This v2 replaces only the *integration layer*, which v1
guessed. Where v1 and this document disagree on file names, function names,
localStorage keys, config, stress API, country data or tests, **this document wins**
because the facts below were read directly from the repository.

---

## 0. VERIFIED REPOSITORY FACTS — DO NOT RE-GUESS THESE

These were confirmed by reading the actual source. Treat them as ground truth.
If reality differs when you inspect the code, trust the code and report the drift —
but do **not** invent alternatives to the names below.

### Canonical entry points (the "truth engine" to wrap)
- **High-level black-box (use this as `f(inputs) → outcome`):**
  `runFullSimulation(userInputs, { numRuns = 500, progressCallback })`
  exported from `src/js/simulation_engine/index.js`.
  Returns `{ baseline, monteCarlo, strategies, recommendations }` where:
  - `baseline.retirementWealth`, `baseline.finalNetWorth`, `baseline.ruinAge`, `baseline.success`
  - `monteCarlo.probabilityOfSuccess` (0–100), `monteCarlo.medianFinalNetWorth`,
    `monteCarlo.percentiles.{p10,p25,p50,p75,p90}NetWorth`, `monteCarlo.lifestyleCutProbability`
  - `monteCarlo.probabilityOfSuccess` is the **confidence metric** for the solver's success test.
- **Deterministic-only fast path:** `new RetirementSimulator(ENHANCED_CONFIG).simulateRetirement(userInputs, useRandom=false)`
  (class in `src/js/simulator.js`). Use this for fast inner solver loops; reserve
  the full Monte Carlo path for confidence-tier refinement.
- **Simplified outcome path:** `calculateRetirementOutcome(userInputs)` /
  `OutcomeEngine` (`src/js/outcome-engine.js`) — reveals the canonical input aliases
  (`currentAge|age`, `superBalance|yourCurrentSuper`, `annualSalary|salary`,
  `partnerSuperBalance|partnerCurrentSuper`, etc.). **Normalise reverse-planner
  inputs through the same alias map** so the solver and forward calc never diverge.

### Existing lever engine — EXTEND, do not reinvent
- `WhatIfEngine` (`src/js/what-if-engine.js`) and its helper
  `testStrategy(baseInputs, baseOutcome, strategyType, value)` **already implement**
  these levers: `'extraSuper'`, `'extraMortgage'`, `'delayRetirement'`,
  `'reduceExpenses'`, `'extraSavings'`.
  → The reverse solver's `solveForExtraSuper`, `solveForMortgagePaydown`,
    `solveForRetirementAge`, `solveForAnnualSavings` and "reduce target spend" levers
    must **wrap `testStrategy` / `WhatIfEngine`**, not re-derive the projection deltas.
  → Only the **new** levers need fresh solver code: `solveForSalary`,
    `solveForCurrentSuperBalance`, `solveForNetRent`, `solveForOverseasCountry`,
    `solveForEstateAdjustment`. Add corresponding `strategyType` cases to
    `WhatIfEngine` rather than building a parallel evaluator.

### Config — already current, already canonical
- **`src/js/config.js` exports `ENHANCED_CONFIG`** (v2.1.0, `lastUpdated: '2026-06-03'`).
  It is the single source of truth. Other config files exist
  (`enhanced-config.js`, `config-v0.9.0.js`, `config-conservative.js`,
  `config-helper.js`) — **do not** add constants to those; read from `ENHANCED_CONFIG`.
- **These values are ALREADY correct as at March 2026 — do not "update" or "fix" them:**
  - Deeming: `DEMING_RATE_LOWER: 0.0125`, `DEMING_RATE_UPPER: 0.0325`,
    `DEMING_THRESHOLD_SINGLE: 64200`, `DEMING_THRESHOLD_COUPLE: 106200`.
    (Note: the property prefix is `DEMING_` — a pre-existing spelling in the repo.
    Match it exactly; do not rename, it will break references.)
  - Age Pension full-pension asset thresholds (homeowner):
    `SINGLE_ASSET_THRESHOLD: 321500`, `COUPLE_ASSET_THRESHOLD: 481500`.
  - `SUPER_GUARANTEE_RATE: 0.12`, `NON_CONCESSIONAL_CAP: 120000`.
- The **README is stale** (it still references 2024–25 framing). Trust `config.js`,
  not `README.md`, for any legislative figure.

### Age Pension / tax / property logic locations (call these, don't re-implement)
- Pension means test + deeming: `src/js/simulation_engine/pension_engine.js` (+ `utils.js`).
- Tax: `src/js/simulation_engine/tax_engine.js`.
- Spending: `src/js/simulation_engine/spending_engine.js`.
- Property cash flow / CGT: `src/js/simulation_engine/property_engine.js`, `src/js/cgt-calculator.js`.
- Super policy: `src/js/super-policy.js`, `src/js/simulation_engine/super_engine.js`,
  `src/js/contribution-calculator.js`.

### Stress / resilience — real API (v1's `STRESS_PRESETS` shape is WRONG)
- Stress scenarios live in `ENHANCED_CONFIG.STRESS_SCENARIOS`.
- Apply them with `buildStressedInputs(baseInputs, scenario)` from
  `src/js/policy/stress-helpers.js` (and/or `ResilienceScenarioEngine` in
  `src/js/resilience-scenarios.js`).
  → Do **not** invent `equityReturnOverrideYears` / `propertyValueDrop` literals.
    Solve the reverse goal against inputs produced by `buildStressedInputs`, and
    against a Monte Carlo percentile (p10–p25) for the "robust" confidence tier.

### Overseas — rich data ALREADY EXISTS; reuse it
- `src/js/country-profiles.js` already defines structured profiles for
  **India, Portugal, Thailand, Spain, Malaysia, New Zealand, Canada, United States**
  with fields incl. `currency`, `agePension.portability`
  (`PROPORTIONAL_AFTER_26_WEEKS` | `FULL_WITH_AGREEMENT`), `agreementDetails`,
  `visa`, `costOfLiving.breakdown`, `healthcare`, `tax` (e.g. Portugal `nhrScheme`),
  and `risks`. `src/js/overseas-retirement.js` is the engine over these.
  → The reverse overseas comparison must **consume `country-profiles.js` +
    `overseas-retirement.js`**. Do NOT create the `OVERSEAS_RETIREMENT_COUNTRIES`
    placeholder table from v1 — it would be a worse duplicate.
  → **One genuine gap: the United Kingdom / England is MISSING** from
    `country-profiles.js`. Add a `UNITED_KINGDOM` profile in the same schema as the
    others. Correct facts to encode: AUD pension portability applies by Australian
    Working Life Residence (no current bilateral social-security agreement —
    the old UK agreement ended 1 March 2001); UK **does** have a Reciprocal Health
    Care Agreement with Australia (medically-necessary public care, time-limited per
    visit, visitor-style — not permanent-resident cover); Australia–UK Double Tax
    Agreement is in force (residence generally has taxing rights over periodic pensions).

### Recommendation engines — TWO exist; wire to both deliberately
- `generateRecommendations(mcResults, strategyResults, userInputs)`
  (`simulation_engine/recommendation_engine.js`) is **already in the
  `runFullSimulation` pipeline** — its output arrives in `result.recommendations`.
- `DecisionSupportEngine` (`src/js/decision-support-engine.js`) is the 8-area
  strategic engine. Feed the solved levers into it for the strategic action plan.

### Tests
- **Jest v30** (`babel-jest`, `jest-environment-jsdom`). Run with `npm test`
  (`jest --testPathPatterns=tests/`). There are ~41 existing suites in `tests/`.
  Playwright e2e exists separately (`npm run test:e2e`). **Put new unit/integration
  tests in `tests/` as Jest specs**, matching existing conventions. Do not introduce
  Vitest/Mocha.

### Scenario handoff — the real bridge (v1's localStorage key is FICTIONAL)
- The forward calc gathers inputs via `app.js → collectInputs()` and does **not**
  persist a scenario object. The keys that exist are `disclaimerAccepted`,
  `hasVisitedCalculator`, `howto-progress`, `retirement-calc-theme`,
  `retirementCalcFeedback`. **`retirementScenario` does not exist.**
  → Build the bridge: on the advanced forward page, persist
    `localStorage.setItem('rc_forward_scenario', JSON.stringify(app.collectInputs()))`
    (e.g. on Calculate, or behind an explicit "Use these in Reverse Planner" button),
    and read `rc_forward_scenario` on `reverse.html`. There are also
    `retirement_template*.json` files and `version-manager.js` — reuse the existing
    JSON import/export path if it already serialises a full scenario; prefer that over
    a new key if it exists. Inspect first.

---

## 1. MANDATORY PHASE 0 — INVENTORY BEFORE WRITING CODE

Before creating any file, produce a short written inventory (commit it as
`docs/REVERSE_PLANNER_INTEGRATION_NOTES.md`) covering:
1. The exact signature and return shape of `runFullSimulation`, `simulateRetirement`,
   `calculateRetirementOutcome`, and `WhatIfEngine.testStrategy` as they exist now.
2. The canonical `userInputs` schema (field names + aliases) from `OutcomeEngine.normalizeInputs` and `collectInputs()`.
3. Whether a full-scenario JSON export/import already exists (`version-manager.js`,
   template JSON) — and therefore whether the handoff bridge reuses it or adds `rc_forward_scenario`.
4. The real `STRESS_SCENARIOS` keys and the `buildStressedInputs` contract.
5. The `country-profiles.js` schema (so the new `UNITED_KINGDOM` entry matches exactly).
6. Which existing modules overlap with the planned reverse work and will be **reused vs
   extended**: `what-if-engine.js`, `outcome-engine.js`, `scenario-matrix.js`,
   `contribution-calculator.js`, `resilience-scenarios.js`, `action-generator.js`,
   `decision-support-engine.js`, `comparison.js`.

**Do not duplicate any logic an inventory item already provides.** If you find yourself
about to re-implement projection, tax, pension, deeming, property cash flow, Monte
Carlo, stress application, or an existing lever — stop and call the existing function.

---

## 2. NEW FILES (adapt to confirmed structure)

```
src/reverse.html                      # new page (mirror advanced.html shell/styling)
src/js/reverse-solver.js              # bisection/Newton root-finder + solveFor* (wraps WhatIfEngine + runFullSimulation)
src/js/reverse-planner.js             # orchestration: build inputs, run levers, rank, assemble result
src/js/reverse-scenarios.js           # household earning-pattern + couple-lever logic (see §4)
src/js/reverse-ui.js                  # simple + advanced UI, handoff import, charts wiring
src/js/reverse-report.js             # plain-English result + optional export (reuse existing report/export utils)
tests/reverse-solver.test.js          # Jest
tests/reverse-scenarios.test.js       # Jest
tests/reverse-integration.test.js     # Jest
docs/REVERSE_PLANNER_INTEGRATION_NOTES.md
```

`reverse-solver.js` must **not** import a heavy numeric library. Hand-roll bisection
(primary, guaranteed) and an optional secant/Newton fast-path with bisection fallback
on non-convergence. ~30 lines each.

---

## 3. SOLVER DESIGN

Outcome is **monotonic** in each single lever (↑ current super / salary / contributions /
net rent / years-to-retirement ⇒ ↑ outcome; ↑ target spend ⇒ ↓ outcome), so a unique
root exists per lever and bracketing is trivial. Use this.

```js
// reverse-solver.js — conceptual
async function bisectionSolve({ lo, hi, tol, maxIter = 60, passes }) {
  // `passes(x)` runs WhatIfEngine/runFullSimulation and returns true if goal met at x.
  // Assumes passes(hi) === true, passes(lo) === false (verify & widen bracket first).
  let best = null;
  for (let i = 0; i < maxIter && (hi - lo) > tol; i++) {
    const mid = (lo + hi) / 2;
    if (await passes(mid)) { best = mid; hi = mid; } else { lo = mid; }
  }
  return best; // smallest lever value that meets the goal
}
```

**Seed brackets analytically** to keep iterations low: convert the today's-dollars
after-tax target to a retirement-date capital target
`K = (T·(1+g)^n − P_ret) / SWR`, solved twice (P_ret = 0 = WITHOUT pension; P_ret from
`pension_engine` = WITH pension). Surface both; the WITH/WITHOUT difference is "what the
Age Pension is worth to this plan."

**Safe withdrawal rate (v1 omitted this):** default `SWR = 0.04`, user-adjustable
3.5%–5.0%. Anchor the conservative end on Morningstar's 3.9% fixed-real-spend figure;
expose Vanguard-style dynamic spending (cap +5% / floor −2.5% on real spend) as the
resilience option that justifies the higher end. Put these as named constants in config,
not magic numbers.

**Confidence tiers** (use `monteCarlo.probabilityOfSuccess` + percentiles + stress):
solve each lever for `base` (deterministic), `confidence` (≥ target %, e.g. 80%), and
`robust` (holds at p10–p25 and under `combinedCrisis` STRESS_SCENARIOS). Report all three
so the "cost of robustness" is explicit.

**Multi-lever = ranked single-lever solves, not a simultaneous solve.** Solve each lever
independently holding others fixed, then rank by a transparent feasibility score
(affordability, behavioural difficulty, tax efficiency, reversibility, certainty,
time-to-impact, regulatory uncertainty). Never rank "assume higher returns" as a lever.
For genuine 2-lever trade-offs (e.g. contributions × retirement age) plot an iso-goal
curve by solving lever B across a grid of lever A.

---

## 4. COUPLE / HOUSEHOLD LEVERS (v1 under-specified — fill these in)

The solver objective is **household** after-tax income, but caps are **per-person**
($30k concessional, $120k non-concessional, $2M TBC each) and the Age Pension means test
is **combined**. Build `reverse-scenarios.js` to route required contributions using the
real Australian levers, sourced from `super-policy.js` / `contribution-calculator.js`
where they exist:

- **Balance equalisation** is the master lever (doubles usable TBC to ~$4M tax-free,
  defers Div 296, can lift pension where a younger spouse's super is accumulation-phase
  and means-test-exempt until 67).
- **Spouse contribution tax offset** (up to $540; spouse income < $40k, full < $37k).
- **Contribution splitting** (up to 85% of concessional contributions to a spouse).
- **LISTO** (≤ $37k income) and **Government co-contribution** (cuts out $62,488) —
  subtract these government top-ups from the required private contribution.
- **Carry-forward concessional** (if a partner's total super balance < $500k) — detect
  unused-cap headroom and prefer it for a high-income/low-super partner (tax saving =
  marginal rate − 15%).

Required earning-pattern solve modes (each answers a slightly different question):
single earner / one-earner couple / equal earners / high-earner + low-super partner /
low-income + low-super partner / both-low. For high-income/low-super → carry-forward +
salary sacrifice. For low-income/low-super → spouse contrib + splitting + LISTO +
co-contribution, **not** their own salary sacrifice (little benefit at a 16% marginal rate).

---

## 5. BENCHMARK ANCHORS (use the latest quarter)

Anchor the target-income input against **ASFA March-2026-quarter** figures (homeowner,
ages 65–84): comfortable **$55,923 single / $78,566 couple**; show modest and renter
budgets too. Note the user's $80k example sits right on the couple-comfortable benchmark
and well above single-comfortable (so a single faces a materially higher private-capital
requirement — show that difference explicitly). Max Age Pension (20 Mar 2026):
~$31,223 single / ~$47,070 couple combined incl. supplements — but display the
means-tested *entitlement*, not the max. ASFA updates quarterly; surface the quarter used.

---

## 6. KEEP FROM v1 (unchanged)

All of the following from the v1 prompt are correct and carry over verbatim:
the target object model; the 9 required reverse questions (§1–§9); inflation treatment
(today's-dollars input, nominal internal, deflate for display); the edge-case list;
the "never return only 'not possible' — return ranked alternatives" rule; simple vs
advanced UI split; the plain-English-before-tables output format; estate/inheritance
targets; visualisation list; financial-advice guardrail + disclaimer; coding-style
expectations; acceptance criteria; and the Phase 1–6 build order — **with Phase 0
(§1 above) inserted first** and the integration corrections in §0 applied throughout.

---

## 7. ACCEPTANCE — additions to v1's list

In addition to v1's acceptance criteria, the build is acceptable only if:
- `runFullSimulation` (or `simulateRetirement` for the fast path) is the projection
  engine — **no projection/tax/pension/deeming/property maths is re-implemented** in
  reverse files (grep the diff to prove it).
- The `extraSuper`/`extraMortgage`/`delayRetirement`/`reduceExpenses`/`extraSavings`
  levers route through `WhatIfEngine.testStrategy`.
- Overseas comparison reads `country-profiles.js` + `overseas-retirement.js`; a new
  `UNITED_KINGDOM` profile is added in the existing schema; **no placeholder country
  table is introduced**.
- Stress uses `ENHANCED_CONFIG.STRESS_SCENARIOS` + `buildStressedInputs`.
- The forward→reverse handoff uses the real `collectInputs()` output via the
  `rc_forward_scenario` bridge (or the existing JSON template path).
- Legislative constants are read from `ENHANCED_CONFIG`; none are hardcoded or written
  to the other config files; the `DEMING_` spelling is preserved.
- Tests are Jest in `tests/`, pass alongside the existing suites, and include a
  **round-trip inversion test**: solve for lever X to hit target T, feed X forward
  through the simulator, assert outcome ≈ T within tolerance.

---

## 8. SUMMARY FOR THE AGENT

Build the Reverse Retirement Planner as a goal-seeking wrapper over the **existing**
engines. Inventory first (Phase 0). Wrap `runFullSimulation`/`simulateRetirement` and
extend `WhatIfEngine` for the levers it already has; add new solvers only for salary,
current-super, net-rent, overseas and estate. Reuse `country-profiles.js` /
`overseas-retirement.js` (add only the missing UK profile), `STRESS_SCENARIOS` /
`buildStressedInputs`, `pension_engine`, and both recommendation engines. Read all
legislative figures from `ENHANCED_CONFIG` (already current to March 2026; do not
"update" them). Implement bisection-primary single-lever solving with analytic bracket
seeding and an SWR anchor, WITH/WITHOUT Age Pension, base/confidence/robust tiers,
couple balance-equalisation with the real spouse/splitting/LISTO/co-contribution/
carry-forward levers, and a feasibility-ranked trade-off frontier. Honest, transparent,
testable; never re-implement what the repo already does.
