---

## 1. Golden rules (read before writing any code)

1. **Never modify the math.** Do not change formulas, rates, drawdown logic, Monte-Carlo sampling, CGT computation, Age Pension means-testing, or any function body inside the calculation engines **except** to consume a NEW canonical field that is currently ignored. If a feature already has an engine (it usually does), you are *wiring inputs to it*, not rewriting it.
2. **The canonical schema is the single source of truth.** All inputs flow: **Form DOM → form input-collector → input adapter → `normaliseCanonicalInput()` → projection service → engines.** Every new field MUST be added to `src/js/calculation/canonical-input-schema.js` first, with a safe default, then mapped through the adapters. Never let an engine read a raw form value directly.
3. **Additive, backwards-compatible changes only.** Every new canonical field gets a default that reproduces *today's* behaviour when the field is absent or zero (e.g. `frankingRate` default such that franking credits = existing result; `leanYearsReduction` default `0`; glide path default `off`). Existing saved scenarios (`save-data-schema.js`) must still load and produce identical numbers.
4. **Parity is two-directional.** When you add a field to V2, also map it in `advanced-classic-adapter.js` if classic already exposes it, so both front-ends populate the same canonical key. Do not let the two adapters drift.
5. **No new dependencies, no framework migration.** Match the existing vanilla-JS module style (ES modules, the patterns already in `src/js/`). Keep the DESIGN.md design tokens.
6. **Test after every feature.** Run the existing test suite and the input-reconciliation validator (`src/js/calculation/input-reconciliation-validator.js`) after each field is wired. A green reconciliation run is your proof that calculations were not disturbed.

---

## 2. Architecture you are working within (orient first)

Before editing, read these files to understand the pipeline. **Do not skip this.**

| Layer | File(s) | Role |
|---|---|---|
| **Canonical schema** | `src/js/calculation/canonical-input-schema.js` | The contract. `normaliseCanonicalInput(input)` returns the normalised object every engine consumes. **All new fields land here.** |
| **Input adapters** | `src/js/calculation/input-adapters/advanced-v2-adapter.js`, `advanced-classic-adapter.js`, `reverse-manual-adapter.js` | Translate each form's raw field bag into the shape `normaliseCanonicalInput()` expects. |
| **Reconciliation** | `src/js/calculation/input-reconciliation-validator.js` | Cross-checks adapters produce consistent canonical output. **Your regression guard.** |
| **Projection** | `src/js/calculation/projection-service.js`, `forward-projection-bridge.js`, `household-cashflow-engine.js` | Runs the year-by-year projection from canonical input. |
| **Feature engines** | `dynamic-allocation-engine.js` (glide path), `cgt-calculator.js` (property CGT), `enhanced-monte-carlo.js` (stress tails), `healthcare-modeling.js` (aged care), `housing-optimizer.js` (downsizing), `contribution-calculator.js`, `investment-property-position.js`, `outcome-bands.js`, `decision-support-engine.js`, `action-generator.js` | The math. **Mostly already built** — you are feeding them, not rewriting them. |
| **V2 UI** | `advanced-v2.html`, `src/js/advanced-v2.js` (~260 KB) | The form markup and its input-collection + render logic. |
| **Classic UI** | `advanced.html`, `src/js/app.js` (~645 KB) | Reference for fields V2 lacks. |
| **Onboarding** | `src/js/onboarding-wizard.js` (~190 KB) | The 5-step guided flow. |
| **Support systems** | `field-tooltips.js` (the (i) help system), `config.js` (defaults/rates), `charts.js`, `comparison.js` | Tooltips, defaults, visualisation. |

**Key finding that makes this tractable:** the feature engines for the missing items already exist. `dynamic-allocation-engine.js` (35 KB) implements glide paths; `cgt-calculator.js` (22 KB) implements capital-gains tax; `enhanced-monte-carlo.js` (27 KB) implements stochastic stress. They are simply **not connected to canonical inputs from V2.** Your work is the wiring, not the modelling.

---

## 3. The wiring chain — follow this for EVERY new field

For each new field, perform these seven steps in order. Do not shortcut.

1. **Canonical schema** — add the field to the correct group in `normaliseCanonicalInput()` (`src/js/calculation/canonical-input-schema.js`) with a backwards-compatible default via the existing `number()` / `normaliseRate()` helpers.
2. **V2 adapter** — map the raw V2 form key to the canonical field in `advanced-v2-adapter.js`.
3. **Classic adapter parity** — if `advanced.html` already has the field, map it in `advanced-classic-adapter.js` to the same canonical key (if not already present).
4. **Engine consumption** — in the relevant feature engine, read the new canonical field. If the engine already reads it (classic path), confirm V2 now reaches the same code. If the field is genuinely new to the engine, add a guarded read that defaults to current behaviour when the field is at its default.
5. **HTML** — add the input to `advanced-v2.html` in the correct IA group (Section 5), with the right `id`, label, unit suffix, and a `NEW`/tier badge per the design.
6. **Input collection** — register the field in V2's input-collector inside `advanced-v2.js` so the DOM value reaches the adapter's `input` object.
7. **Tooltip + default** — add an (i) help entry in `field-tooltips.js` (historical basis, typical range, plain-English "what this changes") and a default in `config.js`.

Then: **run the test suite + reconciliation validator** and confirm an existing saved scenario produces identical output.

---

## 4. PART A — Close the six modelling gaps (feature parity)

Each sub-section below gives the canonical additions, adapter mappings, the engine that consumes it, and the guard that preserves today's results. Field IDs follow the existing camelCase convention — match neighbours in each adapter.

### A1 · Franking credits & dividend modelling  *(fully absent from V2)*

**Why:** Many AU retirees live off franked dividends; V2 currently cannot show franking-credit refunds at all.

- **Canonical** (`canonical-input-schema.js`, extend `income` and a new `equityIncome` block):
  - `income.dividendYield` → `normaliseRate(input.income?.dividendYield, 0.04)`
  - `income.frankingRate` → `normaliseRate(input.income?.frankingRate, 0.75)`
  - `income.australianEquityAllocation` → `normaliseRate(input.income?.australianEquityAllocation, 0.6)`
  - Default these so that if a scenario omits them, franking credit income computes to the **same value the engine produces today** (today: effectively zero franking contribution → set the *engine guard*, not the defaults, to preserve this; see engine note).
- **V2 adapter:** `dividendYield: input.dividendYield`, `frankingRate: input.frankingRate`, `australianEquityAllocation: input.auEquityAllocation`.
- **Classic adapter:** map from classic's existing `dividendYield` / `frankingRate` / `australianEquityAllocation` ids (confirm exact ids in `app.js`).
- **Engine:** franking credit = `stocksPortfolio × australianEquityAllocation × dividendYield × frankingRate × (gross-up & refundable-offset logic)`. Locate where investment income outside super is taxed in the projection/cashflow engine; add the franking-credit offset there. **Guard:** when `frankingRate` or `dividendYield` resolves to the default-absent case, the offset must equal the current result (typically 0), so legacy scenarios do not move.
- **HTML group:** "Income & super" (`#income`). Badge `NEW`, tier `Advanced`.
- **Tooltip:** explain franking, 75% typical franked proportion, refundable since 2000, "raises after-tax retirement income for AU-share-heavy portfolios."

### A2 · Dynamic asset allocation / glide path  *(absent from V2 — engine already exists)*

**Why:** V2 only offers static risk presets; real portfolios de-risk with age.

- **Canonical** (new `allocation` block):
  - `allocation.useGlidePath` → `Boolean(input.allocation?.useGlidePath)` (default `false`)
  - `allocation.glideStrategy` → one of `['age_based','target_date','static']`, default `'static'`
  - `allocation.equities` / `allocation.bonds` / `allocation.cash` → rates, defaults `0.6 / 0.3 / 0.1` (must sum to 1; validate).
- **V2 adapter:** map `useGlidePath`, `glideStrategy`, `allocEquities/Bonds/Cash`.
- **Engine:** `dynamic-allocation-engine.js` already computes age-based glide. Wire canonical `allocation.*` into it and feed its per-year return into the projection **only when `useGlidePath === true`**. **Guard:** when `useGlidePath === false`, the projection must use the existing static `superReturnRate` / `investmentReturnRate` path unchanged — i.e. default behaviour is byte-identical to today.
- **HTML group:** "Assumptions & allocation" (`#engine`). Toggle + strategy select + 3-way equities/bonds/cash control. Tier `Advanced`.
- **Tooltip:** "110 − age" rule, what de-risking does to sequence-of-returns risk.

### A3 · Lean years / phased retirement  *(absent from V2)*

**Why:** Models a sabbatical or part-time wind-down before full retirement.

- **Canonical** (extend `retirementTarget` or new `lifestyle` block): `lifestyle.leanYearsReduction` → `normaliseRate(…, 0)`, plus optional `lifestyle.leanYearsCount` (int, default 0) and `lifestyle.spendingStrategy` ∈ `['steady','go_go_slow_go_no_go']` default `'steady'`.
- **Engine:** in the year-by-year spending build (`household-cashflow-engine.js` / projection), apply the reduction to the relevant years. **Guard:** `leanYearsReduction = 0` and `spendingStrategy = 'steady'` ⇒ identical to current steady-real-spend path.
- **HTML group:** "Retirement lifestyle" (`#live`). Tier `Advanced`.
- **Tooltip:** explain go-go / slow-go / no-go phases and the lean-years reduction.

### A4 · Investment-property sale timing & maintenance inflation  *(partial in V2)*

**Why:** V2 has vacancy, growth, state, and CGT *rate*, but **no sale year** and **no maintenance-cost inflation** — so it can't trigger CGT in a chosen year.

- **Canonical** (extend `investmentProperty` and `scenarioToggles`):
  - `investmentProperty.saleYearFromNow` → `input.investmentProperty?.saleYearFromNow ?? null`
  - `investmentProperty.maintenanceInflationRate` → `normaliseRate(…, 0.035)`
  - confirm/keep `scenarioToggles.sellInvestmentPropertyAtRetirement` and add ability to sell in a specific year.
- **Engine:** `cgt-calculator.js` + `investment-property-position.js` already compute CGT and the property position. Wire the sale year so the CGT event fires in that projection year; apply maintenance inflation to operating expenses. **Guard:** `saleYearFromNow = null` ⇒ no sale event (today's behaviour). Maintenance inflation default reproduces current expense growth.
- **Also fix:** the classic adapter does not currently map `sellInvestmentPropertyAtRetirement` — add it for parity.
- **HTML group:** "Home, property & debt" (`#own`). Two fields, tier `Advanced`.

### A5 · Stress-test probabilities  *(partial — single shock in V2)*

**Why:** V2 offers one shock magnitude/year; classic exposes probability knobs for richer Monte-Carlo tails.

- **Canonical** (new `stress` block consumed by Monte-Carlo): `stress.extremeInflationProbability` (rate, default `0`), `stress.propertyCrashProbability` (rate, default `0`), `stress.globalRiskFactor` (0–1, default `0`).
- **Engine:** `enhanced-monte-carlo.js` already samples adverse scenarios. Feed these probabilities into its sampler. **Guard:** all three at `0` ⇒ the deterministic/base projection and existing single-shock behaviour are unchanged; probabilities only widen the stochastic bands.
- **HTML group:** "Health, risk & stress tests" (`#risk`). Tier `Advanced`. Keep V2's existing single market-shock control.
- **Tooltip:** annualised probability vs one-off shock; link to `outcome-bands.js` percentiles.

### A6 · Downsize transaction cost & spending strategy surfacing  *(partial in V2)*

- **Canonical:** `scenarioToggles.downsizeTransactionCostRate` → `normaliseRate(…, 0.05)`; surface `lifestyle.spendingStrategy` (from A3) as an explicit selectable rather than implicit.
- **Engine:** `housing-optimizer.js` computes downsizing; subtract transaction cost from released equity. **Guard:** default 5% only applies when downsizing is enabled; disabled ⇒ no change.
- **HTML group:** "Home, property & debt" (`#own`).

> **After Part A:** run the full test suite + `input-reconciliation-validator`. Load three pre-existing saved scenarios and confirm **identical** projected income, balance curves, and Age Pension figures. Any drift = a guard is wrong; fix before continuing.

---

## 5. PART B — Restructure the UX into the new Information Architecture

Re-group V2's 13 data-shaped sections into **8 intent-based groups** (same fields, intuitive homes). Do not delete any existing field. Order tells a story: *today → money in → money out → people → lifestyle → risk → engine → edge cases.*

| # | Group (`id`) | User question | Absorbs (today's V2 sections) | Tier floor |
|---|---|---|---|---|
| 1 | You & your household (`#you`) | "Where do I stand today?" | About you · Risk profile | **Basic** |
| 2 | Income & super (`#income`) | "What do I earn & put away?" | Income & savings | **Basic** |
| 3 | Home, property & debt (`#own`) | "What do I own & owe?" | Property & debt | **Standard** |
| 4 | Dependents & family (`#family`) | "Who's counting on me?" | Dependents & family | **Standard** |
| 5 | Retirement lifestyle (`#live`) | "How do I want to live?" | Your retirement goal | **Basic** |
| 6 | Health, risk & stress (`#risk`) | "What could go wrong?" | Healthcare & aged care · Simulation | **Standard** |
| 7 | Assumptions & allocation (`#engine`) | "What does the model assume?" | Markets & economics | **Standard** |
| 8 | Tax structures & overseas (`#structures`) | "Any structures or edge cases?" | SMSF & trust · Overseas · Pension overrides | **Advanced** |

**Implementation:** each group is a collapsible accordion with the intent-question as an italic kicker above the title, a field-count + `N NEW` badge in the header, and a body that lays fields out in a responsive 2-column grid. Drop the literal 1–13 numbering — it implies a mandatory checklist. Mark optional groups; show an "essentials done" progress signal instead.

**Do not regress V2's net-new wins:** SMSF & trust structures, spousal maintenance & child support, overseas retirement (pension portability, AWLR proportioning, tax residency, FX), inheritance scenarios, the two-step Calculate → Explore rhythm, and inline help. Keep all of them.

---

## 6. PART C — Tiered progressive disclosure (Basic / Standard / Advanced)

The core UX fix. One form, three depths, one engine.

- **Tier switch** at the top of the form (segmented control): **Basic** ("Will I be OK?", ~10 fields), **Standard** ("The full picture", sensible default), **Advanced** ("Every lever").
- Each field and each group carries a **tier floor**. Render only fields whose tier ≤ the active tier. Groups whose floor exceeds the tier collapse out entirely.
- **Never lose data on tier change.** Stepping down hides fields but retains their values; stepping back up restores them. State lives in the existing V2 state object, not in the DOM.
- **Smart defaults:** every Advanced field ships pre-filled from `config.js` with a sourced default, clearly labelled "optional". No blank franking-rate boxes.
- Show a "🔒 N more fields in higher tiers — pre-filled with sourced defaults" affordance at the bottom of each tier.
- **Engine contract is tier-independent:** Basic simply submits the canonical object with defaults for everything the user didn't see. The number a Basic user gets is the same the engine would compute for those inputs at any tier.

**Persona presets (optional but recommended):** a 20-second persona pick that sets the starting tier — *First-timer → Basic*, *DIY/FIRE planner → Advanced*, *Adviser → Advanced + pension/rate overrides unlocked*.

---

## 7. PART D — Wire the What-If panel (currently a stub)

V2 ships **"Step 2 → Explore → What-If"** with placeholder text ("sliders coming online — wire to engine"). This is the single highest-leverage fix: it's the moment a number becomes a plan.

- Implement three live sliders: **extra into super** ($/mo), **extra onto mortgage** ($/mo), **delay retirement** (+years).
- On each slider input, clone the current canonical input, apply the delta, re-run `projection-service.js`, and update the projected-income KPI + adequacy badge + "lift from these levers" readout **without a full form re-submit** (debounce ~150 ms).
- Reuse the existing projection path — **do not** create a parallel calculation. The What-If result must equal what you'd get by editing the corresponding form fields and recalculating.
- Keep DESIGN.md's traffic-light adequacy semantics (on-track / review / shortfall).

---

## 8. PART E — Onboarding continuity

The 5-step wizard (`onboarding-wizard.js`) currently dead-ends into the dense form. Make it one continuous arc:

- The wizard **sets the tier** (default **Basic**) and **pre-fills** the form from its captured answers.
- The user lands in the form in their chosen tier with values already populated and a clear "add more detail" path that bumps the tier without restarting.
- Persist the captured answers through the existing save-data path (`save-data-schema.js`) so a refresh keeps continuity.

---

## 9. Two visual directions (pick per audience; default = Editorial)

The design review ships two skins for the same form. Use the design tokens already in `DESIGN.md`:

- **Editorial** (default): navy `#0D1421` / financial gold `#C9A227`, Playfair Display headings, Source Serif 4 body, JetBrains Mono numerals. For advisers and DIY planners. **This is the default — keep V2 on it.**
- **Approachable** (optional alternative): lighter cream surfaces, larger rounded inputs, plain-English questions ("How much is in your super?"), softer green accents. Tuned for first-timers with low financial literacy. If you build it, gate it behind a theme flag — do not fork the codebase.

---

## 10. Testing, validation & acceptance

**Run after every feature (non-negotiable):**
1. Existing unit/integration test suite — all green.
2. `input-reconciliation-validator.js` — V2 and classic adapters produce consistent canonical output for equivalent inputs.
3. **Regression scenarios:** keep 3–5 saved scenarios as fixtures. Their projected income, balance trajectory, Age Pension, and CGT outputs must be **identical** before and after your change (to the cent) whenever new fields are at their defaults.

**Acceptance criteria (definition of done):**
- [ ] All six missing features (A1–A6) are present in V2, wired through the canonical schema, and consumed by their engines.
- [ ] Setting any new field to its default reproduces today's result exactly (regression fixtures pass).
- [ ] V2 form is re-grouped into the 8 intent-based IA groups; no field deleted; V2's net-new wins retained.
- [ ] Basic / Standard / Advanced tier switch works; values survive tier changes; Basic shows ~10 fields.
- [ ] What-If sliders are live and re-run the real projection (no parallel math).
- [ ] Onboarding sets tier + pre-fills and lands the user in a continuous flow.
- [ ] Every new field has an (i) tooltip and a sourced default in `config.js`.
- [ ] No new runtime dependencies; DESIGN.md tokens respected; lint/format clean.

---

## 11. Suggested sequencing (PR-by-PR — keep diffs reviewable)

1. **PR 1 — Schema foundations:** extend `canonical-input-schema.js` with all new fields + defaults; update both adapters; add reconciliation cases. *No UI yet.* Prove regression fixtures still pass.
2. **PR 2 — Engine wiring:** connect franking, glide path, lean years, property sale, stress probabilities, downsize cost to their existing engines behind default-preserving guards.
3. **PR 3 — IA restructure:** re-group V2 HTML into the 8 groups; no behavioural change.
4. **PR 4 — Tier system:** Basic/Standard/Advanced switch + per-field tier floors + smart defaults + data-retention.
5. **PR 5 — What-If wiring:** live sliders → real projection.
6. **PR 6 — Onboarding continuity + tooltips + (optional) Approachable theme.**

Each PR: run the full test suite + reconciliation + regression fixtures before opening.

---

## 12. What NOT to do

- ❌ Do not rewrite or "optimise" any engine formula, Monte-Carlo sampler, CGT routine, or Age Pension means test.
- ❌ Do not let an engine read a raw DOM value — everything goes through the canonical schema.
- ❌ Do not change default rates in `config.js` for *existing* fields.
- ❌ Do not delete any V2 field during the IA restructure.
- ❌ Do not introduce a front-end framework, build step, or npm runtime dependency.
- ❌ Do not let the two adapters drift — parity fields map identically.
- ❌ Do not ship the What-If tab with placeholder text.

---

*Companion artifact: the interactive design review (`Retirement Calculator Review` - docs/retirement_interactive.html) — Overview, Gap Analysis, UX Audit, New IA, Workflow, and the live tier-switch + What-If prototype. Use it as the visual spec while implementing this prompt.*

