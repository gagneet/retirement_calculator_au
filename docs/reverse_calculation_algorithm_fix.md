# AI Agent Final Prompt — Reverse Retirement Planner Engine-Truthful Fix & Five Reverse Questions (V5)

**Target repository:** `gagneet/retirement_calculator_au`  
**Target branch:** `master`  
**Primary pages:** `src/advanced.html`, `src/advanced-v2.html`, `src/reverse.html`  
**Primary modules to inspect/fix:** `src/js/advanced-v2.js`, `src/js/app.js`, `src/js/simulator.js`, `src/js/reverse-ui.js`, `src/js/reverse-planner.js`, `src/js/reverse-solver.js`, `src/js/reverse-deep-analysis.js`, `src/js/forward-projection-bridge.js`, `src/js/reverse-scenarios.js`, `src/js/country-profiles.js`, `src/js/config.js`, tests under `tests/`.

---

## 0. Read this first

You are fixing the existing Reverse Retirement Planner. Do **not** rebuild it as a separate calculator. Do **not** duplicate the Advanced Calculator input form. The reverse page is a post-result analysis layer that must use the same forward projection engine and the same completed forward scenario produced by `advanced-v2.html` and/or `advanced.html`.

Before changing code, read:

1. `docs/REVERSE_PLANNER_AUDIT_FINDINGS.md`
2. `docs/AI_AGENT_FIX_PROMPT_REVERSE_PLANNER.md`
3. `docs/AI_AGENT_PROMPT_REVERSE_PLANNER_PARITY_REPAIR_V4.md` if present
4. The current `master` versions of the files listed above

The uploaded audit found that the scaffolding is mostly correct, including the forward-to-reverse handoff and current-path card, but the reverse answers are still at risk because some solver logic judges success with a flat safe-withdrawal-rate proxy instead of the simulator's actual drawdown result. The audit also found inconsistent Age Pension handling and an overseas optimiser that may conflate overseas move age with retirement age. Treat these as correctness defects, not UI polish.

---

## 1. Prime directive

The **simulator is the source of truth**.

Every reverse answer must be calculated by running the real forward simulation with the user's goal applied to the simulator inputs, then judging success using the simulator's own sustainability outputs:

- `finalBalance`
- `depletionAge`
- `depletionYear`
- `effectiveYourLifespan`
- `effectivePartnerLifespan`
- `yearlyData[]`
- `yearlyData[].pensionIncome`
- `mortgagePayoffAge`
- `accumulatedSuperBalance`
- `totalFinancialAssets`
- any current equivalent projection/adapted result used by Advanced v2

Do **not** use:

```js
totalAssets * swr + pension
```

as the goal-success test.

Safe withdrawal rate may remain only as:

1. a rough educational reference; and/or
2. a bracket seed for bisection.

It must never be presented as the final engine-calculated answer unless clearly labelled as an approximate proxy.

---

## 2. Product intent

The reverse planner must answer:

> "Given the actual data I entered in Advanced Calculator, what can I do today to reach the retirement age and retirement income I want?"

The visible reverse page should show:

1. the imported current position from Advanced Calculator;
2. the engine-derived current path;
3. the user’s goal controls;
4. the five reverse answers;
5. clear issues and limitations;
6. ranked action options; and
7. honest warnings when the model cannot compute a reliable answer.

The reverse page must support the URL:

```text
/reverse.html?from=advanced-v2
```

and should prefer the latest saved forward projection payload over reconstructing data manually.

---

## 3. Mandatory first task: parity before more features

Before improving the five reverse questions, create or repair the parity test that proves `reverse.html` is using the same forward scenario as `advanced-v2.html`.

### Required parity behaviour

Given a realistic Advanced v2 scenario:

1. Run the real Advanced v2 base projection path or a testable equivalent.
2. Persist or build the same object written to `rc_forward_projection_v1`.
3. Load that projection through the reverse bridge.
4. Assert that the reverse current-path card equals the Advanced v2 result within tolerance.

Minimum assertions:

```text
reverse.currentPath.annualIncomeToday ≈ advancedV2.adaptedResult.monthlyPaycheck * 12
reverse.currentPath.superAtRetirement ≈ advancedV2.adaptedResult.superAtRetire
reverse.currentPath.confidence ≈ advancedV2.adaptedResult.confidence
reverse.currentPath.lastsUntil ≈ advancedV2.adaptedResult.lastsUntil
```

Tolerance: ±1% for monetary values, exact or ±1 year for ages.

### Required target-injection test

Add a test proving the reverse target actually reaches simulator drawdown:

```text
Given the same base inputs,
when targetAnnualIncomeToday changes from $80,000 to $120,000,
then the simulator result used by reverse must change:
- depletionAge changes, or
- finalBalance changes, or
- yearly withdrawals/income change materially.
```

This catches the defect where target income is written to the wrong key, such as `asfaComfortable`, while the simulator actually reads `desiredIncome`.

---

## 4. Fix the target-spend injection

Inspect `simulator.js` and confirm the exact field and unit convention for retirement spending.

The audit indicates the simulator reads:

```js
inputs.desiredIncome
```

Confirm whether `desiredIncome` is expected in today's dollars or nominal dollars. Record your finding in:

```text
docs/REVERSE_FIX_NOTES.md
```

Then implement a single helper, for example:

```js
export function applyTargetToEngineInputs(baseInputs, target, context = {}) {
  // returns clone of baseInputs with desiredIncome correctly set
}
```

This helper must:

1. clone the inputs;
2. set `desiredIncome` to `target.targetAnnualIncomeToday` converted only if the simulator expects nominal dollars;
3. carry `retirementAge`, `lifespan`, `partnerLifespan`, and `includeAgePension` consistently;
4. preserve all existing forward inputs; and
5. be used by **every** reverse solver evaluation.

Do not set target income only on `asfaComfortable` unless the simulator truly reads that key.

---

## 5. Replace proxy success with an engine-based success predicate

Create one shared predicate module, for example:

```text
src/js/reverse-success-predicate.js
```

Suggested API:

```js
export function evaluateEngineGoal(simResult, target, inputs, options = {}) {
  return {
    passesGoal,
    passesIncome,
    passesEstate,
    passesConfidence,
    lastsToTargetAge,
    depletionAge,
    finalBalance,
    effectiveLifespan,
    annualIncomeToday,
    pensionAnnualToday,
    pensionAnnualAtRetirement,
    estateToday,
    warnings,
    evidence
  };
}
```

### Success test

A deterministic result should pass if:

```text
the plan lasts to the required planning age / lifespan
AND any estate target is met
AND any mortgage/overseas constraints selected by the user are met
```

The preferred implementation is:

```js
const effectiveLifespan = getEffectivePlanningAge(simResult, inputs, target);
const lastsToLifespan =
  Number.isFinite(simResult.depletionAge)
    ? simResult.depletionAge >= effectiveLifespan
    : simResult.finalBalance > 0;
```

For open-ended/run-until-depletion mode, explicitly treat `depletionAge` as the main result and do not fake confidence.

### Confidence

Do not invent confidence from deterministic pass/fail.

Use confidence from:

1. imported forward projection if displaying the current path;
2. Monte Carlo result if available;
3. deterministic placeholder only if clearly labelled.

If only deterministic data exists, display:

```text
"Deterministic only — Monte Carlo confidence not available for this answer yet."
```

Do not display `NaN%`.

### Pension

Use the engine's per-year means-tested pension:

```js
yearlyData[].pensionIncome
```

Do not use:

1. year-0 pension when judging retirement income; or
2. maximum Age Pension as a shortcut.

For "WITH vs WITHOUT Age Pension", run the simulator twice:

1. normal pension rules;
2. a pension-suppressed scenario.

Then report the difference as:

```text
Age Pension value to this plan: $X/year or $Y capital equivalent
```

If the current code lacks a clean pension suppression flag, add one in a minimal way without changing default forward-calculator behaviour.

---

## 6. Implement the five required reverse answers

All five answers must call the real simulator through `applyTargetToEngineInputs()` and `evaluateEngineGoal()`.

Use bisection/root-finding where monotonic and bounded. Use grid search where the domain is discrete or non-smooth. Use Monte Carlo/stress refinement only after the deterministic answer is stable.

### 6.1 Answer 1 — "When can I retire and what salary is required?"

This is two related answers, not one.

#### A. Earliest feasible retirement age at current settings

Solver:

```text
For age from currentAge + 1 to maxPlanningAge, or use bisection if monotonic:
  set retirementAge = candidateAge
  apply target income
  run simulator
  evaluate engine goal
Return the earliest candidate that passes.
```

Show:

```text
Earliest retirement age at your current settings: Age X
Chosen retirement age: Age Y
Difference: X - Y years
```

If the user is already on track at the chosen age, say so.

If no age passes before max age, say:

```text
"No feasible retirement age found up to age {maxAge} under current assumptions."
```

and offer ranked alternatives.

#### B. Required salary for chosen retirement age

Solver:

```text
Hold retirement age fixed.
Bisection over salary.
Each candidate salary must flow through:
- SG
- salary sacrifice constraints
- tax/Division 293 if modelled
- partner income where relevant
- reduced-income scenarios if applicable
Run simulator and evaluate engine goal.
```

Return:

```text
Minimum salary required from today: $X/year
Current salary: $Y/year
Gap: $X - $Y/year
```

For couples also show:

```text
Required combined household salary
Required primary earner salary if partner salary unchanged
Required partner salary if primary salary unchanged
Optional equal-split salary
```

Do not present salary answers if the current data is insufficient. Instead show an "insufficient inputs" status.

---

### 6.2 Answer 2 — "What amounts are required today?"

This must be a **Current vs Required Today** section.

Solve each lever independently while holding the others fixed:

1. salary today;
2. current superannuation balance;
3. current liquid investments outside super;
4. home/mortgage position;
5. investment property equity/rent;
6. optional estate/inheritance target;
7. optional contribution rate / salary sacrifice.

Do **not** imply that the user needs all required values simultaneously. Label these as "single-lever equivalents".

Use table columns:

```text
Lever
Current value
Required value today
Gap
Feasibility
Reliability
Explanation
```

#### Required current super

Bisection over `yourCurrentSuper` and, for couples, optionally partner super.

For couples return:

```text
Required combined super today
Suggested split
Partner imbalance note
```

Do not suggest breaching caps or transfer-balance limits without warning.

#### Required investments outside super

Bisection over liquid investment balance and/or monthly investment.

Return:

```text
Required current liquid investments
or
Required extra monthly investment
```

#### Home value / mortgage

Do **not** treat the family home as a normal liquid retirement asset unless the user has selected downsizing, selling, reverse mortgage, or home equity access.

Return more honest fields:

```text
Current home value
Current mortgage
Projected mortgage at retirement
Extra monthly repayment to clear by retirement
Required home equity release if downsizing is enabled
Whether home equity is being counted or excluded
```

If home equity is not accessible, say:

```text
"Home value is not counted as spendable retirement capital unless you downsize, sell, or use an equity-release strategy."
```

#### Investment property

Solve for one or more of:

```text
Required current investment property equity
Required weekly rent
Required net yield
Required sale proceeds at retirement
Required debt reduction
```

Use net rent after expenses and loan costs where the engine supports it.

Show:

```text
"Property value alone is not enough; cash flow, debt and sale strategy determine its usefulness."
```

---

### 6.3 Answer 3 — "If I want to achieve it sooner, what is required?"

Let the user choose an earlier retirement age. Default to:

```text
chosenRetirementAge - 1
chosenRetirementAge - 3
chosenRetirementAge - 5
```

For each earlier age, compute the compensating single-lever equivalent:

```text
extra salary required
extra annual super contribution required
extra monthly outside-super investment required
extra current super required
extra mortgage repayment required
target spending reduction required
estate target reduction required
overseas move option if selected
```

Return a ranked list:

```text
To retire at age X instead of Y, one of these would be required:
1. Add $A/year to super
2. Invest $B/month outside super
3. Increase salary to $C/year
4. Reduce retirement spending to $D/year
5. Move overseas at age E to destination F
```

Every item must include:

```text
status: exact / approximate / infeasible / insufficient-data
why: short explanation
```

Do not display mathematically possible but unrealistic answers as recommendations without a warning.

---

### 6.4 Answer 4 — "How much can I reduce salary and still meet the goal?"

This is a downward bisection problem.

Solver:

```text
lo = 0 or minimum living salary threshold if configured
hi = current salary
Find the lowest salary that still passes the engine goal.
maximumSalaryReduction = currentSalary - solvedSalaryFloor
```

Modes:

1. **Fixed contribution dollars** — salary sacrifice and monthly investments remain unchanged if affordable.
2. **Percentage-based contributions** — SG and optional contributions scale with salary.
3. **Couple modes**:
   - primary earner salary floor with partner unchanged;
   - partner salary floor with primary unchanged;
   - both reduce equally;
   - one partner stops work.

Return:

```text
You can reduce salary to $X/year and still meet the goal.
This is a reduction of $Y/year or Z%.
```

If the plan is already failing at current salary:

```text
"Salary reduction tolerance cannot be calculated because the current salary does not meet the target."
```

If the model cannot evaluate affordability of contributions after salary cut:

```text
"Approximate only — contribution affordability after salary reduction is not fully modelled."
```

---

### 6.5 Answer 5 — "At what age should the couple or single move overseas?"

Do not conflate overseas move age with retirement age.

Required model:

```text
retirementAge = chosen retirement age
moveAge = candidate overseas move age
destination = selected country or iterate all enabled countries
```

Candidate move ages:

```text
currentAge + 1 through max(lifespan, 120), bounded sensibly
```

For each candidate:

1. apply destination cost profile from `country-profiles.js`;
2. apply user-entered overseas annual cost if provided;
3. apply FX buffer and healthcare assumptions;
4. apply Age Pension portability:
   - supplements reduce after 6 weeks;
   - after 26 weeks, AWLR proportionality applies where relevant;
   - agreement-country metadata should be surfaced;
5. preserve separate retirement age;
6. run simulator and evaluate goal.

Return:

```text
Best overseas move age
Best destination under user's assumptions
Annual AUD spend required overseas
Savings vs Australia
Pension portability impact
Healthcare/FX/tax warning
Fallback return-age warning if applicable
```

If country data is incomplete:

```text
"Indicative only — destination profile is incomplete. Please review cost, tax and healthcare assumptions."
```

---

## 7. Add additional high-value reverse answers

Add these after the five core answers, or scaffold them behind collapsible sections.

### 7.1 Maximum sustainable retirement income

Question:

```text
"At my chosen retirement age, what is the highest annual income I can target?"
```

Solver:

```text
Bisection over targetAnnualIncomeToday.
For each candidate, apply target to desiredIncome and run simulator.
Return highest income that passes.
```

Show:

```text
Maximum sustainable income: $X/year today's dollars
Compared with ASFA comfortable: +/− $Y
```

### 7.2 Bridge-to-pension capital

For users retiring before Age Pension age:

```text
"How much private capital do I need before Age Pension starts?"
```

Calculate the extra private drawdown needed from retirement age to Age Pension age, using simulator yearly rows and target spend.

Show:

```text
Bridge period: age X to 67
Required bridge capital: $Y
```

If retirement age >= Age Pension age, show "Not applicable".

### 7.3 Mortgage-free retirement lever

Question:

```text
"What extra monthly repayment clears the mortgage by retirement?"
```

Use engine or amortisation helper. Return:

```text
Projected mortgage at retirement
Required extra monthly repayment
Interest saved
Effect on retirement target
```

### 7.4 Estate/inheritance capacity

Question:

```text
"How much can I leave behind if I do not change anything?"
```

Use engine ending balance, home equity inclusion rules, and estate target.

Show:

```text
Projected estate
Estate target
Gap/surplus
Whether home equity is included
```

### 7.5 Resilience buffer

Question:

```text
"What buffer do I need if the first decade of retirement is poor?"
```

Use existing stress scenarios and/or Monte Carlo.

Return:

```text
Deterministic answer
Stress-tested answer
Extra capital / later retirement / lower spending required
```

---

## 8. Honesty and reliability layer

Every reverse answer must carry a reliability/status object.

Suggested shape:

```js
{
  status: 'engine_exact' | 'deterministic_engine' | 'monte_carlo_validated' | 'approximate' | 'proxy_seed_only' | 'infeasible_in_range' | 'insufficient_inputs' | 'not_applicable',
  confidence: 'high' | 'medium' | 'low',
  warnings: [],
  assumptionsUsed: [],
  evidence: {
    inputFieldsChanged: [],
    simulatorFieldsRead: [],
    resultFieldsUsed: []
  }
}
```

### User-facing warning examples

If a bisection does not find a solution:

```text
"No solution found within the modelled range. This does not prove the goal is impossible; it means none of the tested values between $X and $Y met the target under these assumptions."
```

If only deterministic result exists:

```text
"This answer is deterministic. Run Monte Carlo to validate it against market volatility."
```

If overseas country data is incomplete:

```text
"This overseas result is indicative only because local tax, healthcare or visa assumptions are incomplete."
```

If home equity is counted:

```text
"This answer assumes you can access home equity. If you do not downsize, sell or use an equity-release strategy, this capital may not be available for spending."
```

If Age Pension is material:

```text
"This plan relies materially on Age Pension. Payments are means-tested and rules may change."
```

Never show `NaN`, `$0`, or `0%` when the correct state is unknown. Use `—` plus an explanation.

---

## 9. UI requirements for `reverse.html`

Add a new section, preferably after the current path/gap summary:

```text
Reverse Answers — What needs to change?
```

Cards:

1. **Earliest retirement age**
2. **Salary required**
3. **Required today**
4. **Retire sooner**
5. **Salary reduction tolerance**
6. **Overseas move age**
7. **Maximum sustainable income**
8. **Bridge-to-pension**
9. **Mortgage-free retirement**
10. **Resilience buffer**

Each card should include:

```text
Answer
Current value
Required value / threshold
Gap or surplus
Reliability badge
Plain-English explanation
"How calculated" disclosure
```

Use expandable details for:

```text
assumptions
inputs used
solver range
whether deterministic or Monte Carlo
why a value is approximate
```

Do not overload the page with raw tables first. Tables should support the cards.

---

## 10. Algorithm guidance

### Bisection solver

Use bisection for monotonic single-variable answers:

```js
async function solveBoundary({ low, high, tolerance, maxIterations, predicate }) {
  const lowPass = await predicate(low);
  const highPass = await predicate(high);

  if (lowPass) return { solved: low, status: 'already_passes' };
  if (!highPass) return { solved: null, status: 'infeasible_in_range' };

  let lo = low;
  let hi = high;
  for (let i = 0; i < maxIterations && Math.abs(hi - lo) > tolerance; i++) {
    const mid = (lo + hi) / 2;
    if (await predicate(mid)) hi = mid;
    else lo = mid;
  }
  return { solved: hi, status: 'solved' };
}
```

For downward solves such as salary reduction, invert the predicate correctly:

```text
Find the lowest salary that still passes.
```

### Grid search

Use grid search for:

```text
overseas move age
country selection
retirement age if monotonicity is broken by Age Pension, mortgage or property events
two-variable frontiers
```

### Two-stage solve

Default:

```text
Stage 1 — deterministic engine solve
Stage 2 — optional Monte Carlo / stress validation
```

Do not run expensive Monte Carlo in every bisection iteration unless using a Web Worker and caching.

### Caching

Cache simulations by stable hash of:

```text
inputs + target + lever + candidate value + mode
```

Do not cache across changed assumptions.

---

## 11. Required tests

Use Jest. Do not introduce another test framework.

### Mandatory tests

1. **Projection parity**
   - reverse current path equals advanced-v2 projection within tolerance.

2. **Target injection**
   - changing target income changes engine drawdown result used by reverse.

3. **No SWR success test**
   - test or grep assertion that `assets * swr` is not used as pass/fail logic.

4. **Means-tested pension**
   - high-asset scenario does not receive max pension shortcut.
   - lower-asset scenario receives engine pension from retirement rows.

5. **Earliest retirement age**
   - on-track scenario returns chosen age or earlier.
   - failing scenario returns later age or infeasible with explanation.

6. **Required salary**
   - increasing salary can solve a known shortfall.
   - no solution in configured range returns `infeasible_in_range`.

7. **Required today values**
   - required current super and required outside investments solve via engine predicate.
   - home value is not counted as liquid unless a home-equity strategy is enabled.

8. **Salary reduction tolerance**
   - a surplus scenario returns a salary floor below current salary.
   - a failing scenario returns `not_applicable`.

9. **Retire sooner**
   - earlier retirement increases required contribution/salary or returns infeasible.

10. **Overseas move age**
    - move age and retirement age are separate.
    - two countries produce different answers based on country profiles.
    - Age Pension portability is surfaced.

11. **UI rendering**
    - no `NaN`, `undefined`, or misleading `$0` appears when a value is unknown.
    - reliability badges appear.

12. **Forward regression**
    - existing Advanced v2 behaviour unchanged.

---

## 12. Files likely to change

Likely:

```text
src/js/reverse-success-predicate.js          // new
src/js/reverse-solver.js                     // replace proxy predicate; add five solvers
src/js/reverse-deep-analysis.js              // share predicate; overseas rework
src/js/reverse-planner.js                    // orchestrate answer cards; target injection
src/js/reverse-ui.js                         // render Reverse Answers section
src/js/forward-projection-bridge.js          // ensure complete current-path extraction
src/js/reverse-scenarios.js                  // overseas adjustment and pension portability integration
src/js/config.js                             // named solver caps/defaults only; do not hardcode policy
src/js/advanced-v2.js                        // only if projection payload misses required fields
src/js/app.js                                // only if advanced.html payload misses required fields
tests/unit/*
tests/integration/*
tests/e2e/*
docs/REVERSE_FIX_NOTES.md
```

Do not modify `simulator.js` unless a small explicit flag is required to suppress Age Pension for the WITH/WITHOUT comparison. Any simulator change must have forward-regression tests.

---

## 13. Acceptance criteria

The task is complete only when:

1. `reverse.html?from=advanced-v2` imports the exact latest Advanced v2 projection and the current-path card matches Advanced v2.
2. Changing target retirement income changes the simulator drawdown used by reverse.
3. All five reverse answers are produced from engine simulations, not SWR proxy formulas.
4. Results clearly distinguish:
   - deterministic answer;
   - Monte Carlo/stress-tested answer;
   - approximate/proxy answer;
   - infeasible in range;
   - insufficient input.
5. Means-tested Age Pension comes from simulator yearly rows, not max pension or year-0 pension.
6. Overseas optimiser uses country profiles, separates move age from retirement age, and shows pension portability/FX/health warnings.
7. No user-facing `NaN`, `undefined`, or false `$0` appears.
8. All new tests pass and existing tests pass with `npm test`.
9. `docs/REVERSE_FIX_NOTES.md` documents:
   - desiredIncome unit convention;
   - before/after bug summary;
   - all assumptions;
   - any values that remain approximate.

---

## 14. Implementation order

Follow this order exactly:

1. Inventory current code and write `docs/REVERSE_FIX_NOTES.md`.
2. Add failing parity and target-injection tests.
3. Implement `applyTargetToEngineInputs`.
4. Implement shared engine success predicate.
5. Replace SWR pass/fail logic in all reverse solvers.
6. Fix Age Pension handling.
7. Repair existing five answers to use engine predicate.
8. Rework overseas move-age optimiser.
9. Add honesty/reliability statuses.
10. Add UI cards and disclosures.
11. Add additional reverse answers.
12. Run full tests and manual browser verification.

Do not start with UI. Correctness first.

---

## 15. Manual verification checklist

After implementation:

1. Open `advanced-v2.html`.
2. Enter a strong scenario that clearly passes.
3. Run the projection.
4. Open `reverse.html?from=advanced-v2`.
5. Confirm current path matches Advanced v2.
6. Change target income upward.
7. Confirm required values increase.
8. Change target income downward.
9. Confirm required values decrease or show surplus.
10. Set retirement age earlier.
11. Confirm "retire sooner" answers become harder.
12. Enable overseas destination.
13. Confirm overseas answer changes by country and move age.
14. Check the page for:
    - no `NaN`;
    - no fake `$0`;
    - no contradictory "on track" vs "shortfall" for the same target;
    - visible warnings where approximate.

---

## 16. User trust requirement

This calculator must be honest over being impressive.

If an answer cannot be computed reliably, say:

```text
"We could not calculate a reliable value from the current data."
```

Then explain:

```text
why,
what data is missing,
what approximation was used if any,
and what the user can change to get a better answer.
```

Never hide uncertainty. Never turn a bracket seed, SWR estimate, or incomplete country profile into a precise-looking answer.

