# AI Agent Prompt — Correct Reverse Retirement Planner into a Gap Analysis + Action Plan

## Context

Repository: `gagneet/retirement_calculator_au`

Live pages:

- Forward Advanced Calculator: `advanced-v2.html`
- Older Advanced Calculator: `advanced.html`
- Current Reverse Planner: `reverse.html`

The current implementation of `reverse.html` is not aligned with the intended product. It behaves like another input-heavy retirement calculator. The intended product is a **reverse gap-analysis and action-planning page** that starts from the real current scenario already entered in the forward calculator, compares that scenario against the user's desired retirement goal, and then uses reverse calculations to show what must change today to reach the goal.

The Reverse Planner must not primarily ask the user to re-enter the same details as the forward calculator. It should import/use the forward scenario as the baseline and then ask only for the missing goal settings.

## Core Product Requirement

Build the Reverse Retirement Planner as:

> “You told the Advanced Calculator where you are today. Now tell us the retirement outcome you want. We will compare your current path against that target and show the gap, problems, risks and the most feasible actions to close the gap.”

It must answer:

- What does the user's current Advanced Calculator scenario produce?
- What retirement income / estate / confidence does the user want?
- What is the shortfall or surplus?
- Which parts of the current situation are causing the gap?
- What exactly needs to change today?
- Which action is most feasible: salary sacrifice, extra savings, mortgage paydown, retire later, partner income, super equalisation, investment property, overseas retirement, reduced inheritance target, lower target income, etc.?
- What is the comparison between current path and required path?

## Diagnosis of Current Problem

The current `reverse.html` has a full form with age, salary, super, mortgage and other fields. This makes it feel like a duplicate forward calculator.

This must be changed.

The Reverse Planner should be driven by `rc_forward_scenario` persisted from `app.js` and by equivalent storage from `advanced-v2.html` if available.

Current code already stores forward scenario inputs in `src/js/app.js` using:

```js
localStorage.setItem('rc_forward_scenario', JSON.stringify(inputs));
```

This storage bridge must become the primary baseline source.

## Required UX Change

### New reverse page layout

Replace the current input-first page with this flow:

1. **Baseline Import / Current Path Panel**
   - Show whether a saved Advanced Calculator scenario was found.
   - If found, automatically load it by default.
   - Show a human-readable summary of current inputs:
     - current age
     - partner age if applicable
     - retirement age from forward calculator
     - salary / partner salary
     - current super / partner super
     - home value
     - mortgage balance
     - mortgage repayment
     - investment property details
     - cash / shares / other assets
     - target lifespan
   - Add buttons:
     - “Use Advanced Calculator data”
     - “Refresh from Advanced Calculator”
     - “Edit source data in Advanced Calculator”
     - “Start with manual fallback” only when no saved scenario exists.

2. **Target Goal Panel**
   Only ask for the goal that may not exist in the forward calculator:
   - desired annual retirement income in today's dollars
   - confidence target, e.g. 70%, 80%, 90%
   - retirement age goal if different from current calculator retirement age
   - plan-to age / lifespan if different
   - minimum estate or inheritance target in today's dollars
   - include/exclude Age Pension
   - Australia vs overseas comparison

3. **Current Path vs Required Path Comparison**
   This is the main output.

   Use a table/card comparison like:

   | Area | Current path from Advanced Calculator | Required path to meet goal | Gap / problem | Recommended action |
   |---|---:|---:|---:|---|
   | Retirement income | $X/year | $80,000/year | -$Y/year | Add $Z/year super or retire N years later |
   | Capital at retirement | $A | $B | -$C | Increase savings by $D/month |
   | Super at retirement | $A | $B | -$C | Salary sacrifice $D/year |
   | Mortgage at retirement | $A | $0 preferred | $A debt remains | Pay $D/month extra or refinance |
   | Age Pension | $A/year | $B/year assumed | risk / means-tested | show with/without pension |
   | Estate/inheritance | $A | $B | -$C | reduce estate target or save more |
   | Confidence | X% | 80% | -Y pts | stress-tested solution needed |

4. **Problem Detection Panel**
   Identify issues from the imported current scenario:
   - retirement age too early for desired income
   - mortgage remains at retirement
   - super balance too low for age/income
   - partner super imbalance
   - over-reliance on Age Pension
   - property cash flow weak or negative
   - investment return assumptions too optimistic
   - inflation shock vulnerability
   - sequence-of-returns vulnerability
   - high inheritance target conflicts with spending goal
   - overseas option reduces income need but adds FX/health/tax risk

5. **Ranked Action Plan Panel**
   Show ranked levers from reverse solving.

   Example:

   ```text
   Your current plan is projected to fund $62,400/year, but your target is $80,000/year.
   You need to close a $17,600/year income gap.

   Most feasible options:
   1. Salary sacrifice an extra $13,800/year until age 71.
   2. Or retire at 73.3 instead of 71.
   3. Or pay $1,050/month extra into the mortgage and add $5,400/year to super.
   4. Or reduce the target to $72,000/year and preserve the estate target.
   5. Or retire in Malaysia/Thailand with FX and health-risk buffers.
   ```

6. **Scenario Comparison Cards**
   Generate at least these scenarios:
   - Current path / do nothing
   - Required path / meet target
   - Retire later path
   - Super boost path
   - Mortgage-free path
   - Partner-income or super-equalisation path for couples
   - Property/rent path if applicable
   - Overseas retirement path if enabled
   - Lower inheritance or estate-preservation path

7. **Plain-English Explanation**
   Explain why each action works:
   - extra super improves compounding and tax efficiency
   - later retirement gives more accumulation years and fewer drawdown years
   - mortgage-free retirement reduces required spending
   - partner super equalisation improves household resilience
   - overseas retirement lowers spending but adds uncertainty

## Required Data Flow

### Source of truth

The source of current financial data must be the forward calculator scenario object, not the reverse page form.

Use this priority order:

1. `localStorage.rc_forward_scenario`
2. any advanced-v2 specific saved scenario key if present in the codebase
3. imported scenario pasted/uploaded manually, if implemented
4. manual fallback fields only if no forward scenario exists

### Do not duplicate forward-calculator data entry

The reverse page must not present salary, super, mortgage, property and investment fields as the primary interface when a forward scenario exists.

Those fields may exist only inside a collapsed “Imported baseline details” or “Manual fallback” section.

### Baseline scenario object

Create a canonical adapter:

```js
export function buildReverseBaselineFromForwardScenario(forwardInputs) {
  return {
    source: 'advanced-calculator',
    importedAt: new Date().toISOString(),
    inputs: normalisedInputs,
    displaySummary,
    missingFields,
    warnings
  };
}
```

The adapter must normalise differences between `advanced.html` and `advanced-v2.html` field names.

## Required Calculation Behaviour

### Step 1 — Run current path

Run the imported baseline through the existing simulator without changing it.

```js
const currentPath = simulator.simulateRetirement(importedInputs, false);
```

Extract:

- sustainable retirement income in today's dollars
- capital at retirement
- super at retirement
- non-super assets at retirement
- home equity
- mortgage balance at retirement
- investment property net income/equity
- expected Age Pension
- estate at lifespan
- depletion age if any
- confidence / Monte Carlo success if available

### Step 2 — Build target

Build target from goal panel:

```js
const target = {
  targetAnnualIncomeToday,
  targetRetirementAge,
  confidenceTarget,
  includeAgePension,
  minimumEstateToday,
  householdType,
  countryMode,
  stressMode
};
```

### Step 3 — Score gap

Create a `compareCurrentToTarget()` function:

```js
export function compareCurrentToTarget(currentPath, target, assumptions) {
  return {
    incomeGapToday,
    capitalGapAtRetirement,
    superGapAtRetirement,
    mortgageProblem,
    estateGapToday,
    confidenceGap,
    agePensionReliance,
    problemFlags,
    severity
  };
}
```

### Step 4 — Reverse solve levers

Use the current imported baseline as the starting point. Mutate one lever at a time and run the simulator repeatedly.

Required levers:

- extra salary sacrifice / concessional contribution
- extra after-tax savings / monthly investment
- required gross salary if single earner
- partner income if couple and partner earning is low/zero
- retirement age delay
- mortgage extra repayment / mortgage-free age
- investment property net rent or sale/paydown option
- target spend reduction
- inheritance target reduction
- overseas country spending adjustment
- Age Pension with/without sensitivity

Each lever must return:

```js
{
  id,
  label,
  baselineValue,
  requiredValue,
  delta,
  unit,
  feasible,
  feasibilityScore,
  reason,
  warnings,
  scenarioResult,
  comparisonAgainstCurrent
}
```

### Step 5 — Rank levers

Rank by feasibility, not just mathematical success.

Suggested scoring:

```js
feasibilityScore =
  affordabilityScore * 0.30 +
  controlScore * 0.20 +
  taxEfficiencyScore * 0.15 +
  riskReductionScore * 0.15 +
  lifestyleDisruptionScore * 0.10 +
  reversibilityScore * 0.10;
```

Do not rank “assume higher investment returns” as a good lever. It can be shown as sensitivity only.

## Required Reverse Solver Rules

Use bisection as primary method.

Use deterministic solve first for UI responsiveness.

Use Monte Carlo/stress solver only after deterministic result is shown, preferably in a Web Worker.

For each lever:

```js
solveFor({
  baselineInputs,
  target,
  lever,
  low,
  high,
  tolerance,
  maxIterations,
  evaluate
})
```

The success condition must be target-based:

```js
passes =
  result.sustainableIncomeToday >= target.targetAnnualIncomeToday &&
  result.endingEstateToday >= target.minimumEstateToday &&
  result.successProbability >= target.confidenceTarget;
```

If a single lever cannot solve the gap, return infeasible and show combined strategies.

## Required UI Output Components

Create or refactor the reverse page into these components/functions:

- `renderBaselineImportPanel()`
- `renderImportedBaselineSummary()`
- `renderTargetGoalPanel()`
- `renderCurrentVsRequiredComparison()`
- `renderProblemFlags()`
- `renderRankedActionPlan()`
- `renderScenarioComparisonCards()`
- `renderOverseasComparison()`
- `renderAssumptionsAndWarnings()`

The primary visual should be the comparison, not the input form.

## Required Text Changes

Replace copy like:

> Tell us your goal. We'll show you the exact levers...

with:

> We use your Advanced Calculator data as your current path, then reverse-calculate what must change to reach your target retirement income.

Replace:

> Your details

with:

> Imported current position from Advanced Calculator

Replace:

> Calculate my path

with:

> Compare my current path to my retirement goal

## Required Advanced Calculator Integration

Add clear navigation from `advanced.html` and `advanced-v2.html`:

After a successful forward calculation, show a CTA:

```text
Want to know what to change to reach your target?
Open Reverse Planner using these inputs
```

The CTA should link to:

```text
/reverse.html?from=advanced
```

The reverse page should auto-load the saved scenario and display the baseline summary.

## Required Tests

Add or update Jest tests:

1. `tests/unit/reverse-baseline-adapter.test.js`
   - maps forward calculator inputs to reverse baseline
   - handles missing partner fields
   - handles `advanced.html` and `advanced-v2.html` naming differences

2. `tests/unit/reverse-gap-analysis.test.js`
   - detects income shortfall
   - detects mortgage-at-retirement problem
   - detects low-super-for-target problem
   - detects estate shortfall
   - detects partner super imbalance

3. `tests/unit/reverse-solver-roundtrip.test.js`
   - solve for extra super, feed result back into simulator, assert target is met within tolerance
   - solve for retirement age, feed result back into simulator, assert target is met
   - infeasible lever returns clear infeasible result

4. `tests/integration/reverse-forward-bridge.test.js`
   - stores `rc_forward_scenario`
   - reverse page imports it
   - imported baseline summary appears
   - comparison table uses imported values

5. Playwright smoke test if available:
   - run advanced calculator
   - click reverse planner CTA
   - verify reverse page shows imported scenario and current-vs-required comparison

## Acceptance Criteria

The implementation is correct only if:

- `reverse.html` no longer feels like a duplicate of `advanced-v2.html`.
- If `rc_forward_scenario` exists, the reverse page starts from that data automatically or with a prominent one-click import.
- The user only needs to provide target/goal fields, not re-enter the full financial position.
- The main output is a current-vs-required comparison.
- The page shows gaps, problems and recommended actions based on actual reverse solving.
- The output explicitly states what data came from the Advanced Calculator.
- The reverse planner can run without saved data, but manual mode is secondary.
- Tests prove the forward-to-reverse bridge and solver round-trip behaviour.

## Non-goals

Do not:

- Build another full forward calculator page.
- Duplicate all Advanced Calculator fields as the primary UI.
- Create a reverse result based on default sample values when a saved forward scenario exists.
- Treat overseas retirement as simply “cheaper country = solved”.
- Recommend higher assumed investment returns as a primary action.
- Duplicate tax, super, Age Pension or country constants if existing config modules already contain them.

## Final Implementation Instruction

Refactor the Reverse Retirement Planner so it becomes a comparison and action-planning layer on top of the existing Advanced Calculator scenario.

The page should read the user's current real financial situation from the saved forward calculator data, ask only for the retirement goal, run the existing simulator to establish the current path, run reverse-solver levers to identify what must change, and present a clear table/card comparison showing current path vs required path, gaps, risks and ranked actions.
