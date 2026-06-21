# AI Agent Prompt — Reverse Retirement Planner V3: Hidden Post-Calculation Gap Analysis Layer

## Mission

Refactor the Reverse Retirement Planner so it is **not** a second data-entry calculator.

The Reverse Planner must become a **hidden post-calculation analysis layer** that runs after the existing Advanced Calculator / Advanced V2 calculator has completed its normal forward projection.

The user journey should be:

1. User enters their real current financial situation in:
   - `advanced-v2.html`, and/or
   - `advanced.html`.
2. User runs the existing forward retirement calculation.
3. The app saves:
   - the user’s current input scenario,
   - the selected/desired retirement age,
   - the forward-calculation results,
   - enough metadata to know whether the scenario is single/couple and which calculator generated it.
4. The results area on the Advanced Calculator shows a new call-to-action/tab/link:
   - **“See what you need to change to reach your retirement goal”**
   - or **“Reverse Plan / Gap Analysis”**.
5. Clicking that link opens `reverse.html`.
6. `reverse.html` loads the saved Advanced Calculator scenario and forward results.
7. `reverse.html` shows:
   - the user’s current position,
   - the forward-predicted outcome,
   - the target outcome based on the chosen retirement age and desired retirement income,
   - the reverse-engineered required values,
   - the gaps/problems,
   - ranked practical actions to close the gap.
8. On `reverse.html`, the user may adjust only the **goal variables**, not re-enter the whole current financial situation:
   - retirement age,
   - desired retirement income in today’s dollars,
   - confidence level,
   - inheritance/estate target,
   - Australia vs overseas comparison.
9. When those goal variables change, reverse.html recalculates the gap and required actions using the original saved current-data baseline.

## Product Principle

The Reverse Planner answers:

> “Given the real current financial data I already entered in the Advanced Calculator, and the retirement age and income I want, what is the gap between my current path and my required path — and what do I need to change?”

It must **not** ask the user to re-enter all the same fields again.

The reverse solver is an internal engine. The visible feature is a **post-results comparison and action-plan page**.

## Mandatory UX Behaviour

### Advanced Calculator / Advanced V2 changes

Add or confirm a field for:

```text
Desired retirement age
```

If a retirement age field already exists, reuse it.

If it is missing from either `advanced.html` or `advanced-v2.html`, add it in the relevant input section.

The field rules:

- must be greater than current age;
- for couples, allow either:
  - one household retirement age, or
  - separate user/partner retirement ages if the calculator already supports that model;
- default sensibly, for example 67, 70, or existing retirementAge config;
- display validation if retirement age <= current age.

After the forward calculation completes, save the full scenario and results to localStorage.

Use a canonical bridge object such as:

```js
localStorage.setItem('rc_forward_scenario', JSON.stringify({
  schemaVersion: 3,
  sourcePage: 'advanced-v2', // or 'advanced'
  createdAt: new Date().toISOString(),
  currentInputs: normalizedInputs,
  forwardResults: normalizedResults,
  household: {
    type: 'single' | 'couple',
    currentAge,
    partnerAge,
    desiredRetirementAge,
    partnerDesiredRetirementAge
  },
  goalDefaults: {
    retirementAge: desiredRetirementAge,
    targetAnnualIncomeToday: inferredOrDefaultTargetIncome,
    targetIncomeBasis: 'today_dollars_after_tax',
    confidenceTarget: 0.8,
    estateTargetToday: 0,
    locationMode: 'australia'
  },
  assumptions: {
    inflationRate,
    returnAssumptions,
    agePensionEnabled,
    taxYear,
    configVersion
  }
}));
```

Do not save only raw form fields. Save enough normalised information so `reverse.html` can explain the current path without recalculating from incomplete data.

### New link/tab/vector from Advanced results

Add a CTA in the results area after calculation completes:

```text
Reverse Plan: See what you need to change to reach this retirement goal
```

The CTA must only be prominent after a successful calculation.

It should link to:

```text
reverse.html?source=advanced-v2
```

or:

```text
reverse.html?source=advanced
```

If there is already a tabbed results UI, add a tab/vector for:

```text
Forward Projection | Reverse Gap Analysis
```

The Reverse Gap Analysis tab may either:

- open `reverse.html`, or
- render an embedded preview and offer “Open full reverse plan”.

### reverse.html behaviour

`reverse.html` must be result-first, not form-first.

On page load:

1. Try to read `rc_forward_scenario`.
2. Validate schema version and required fields.
3. If valid:
   - show “Imported from Advanced Calculator” banner;
   - show current situation summary;
   - show forward outcome summary;
   - show goal controls;
   - run reverse analysis;
   - show comparison and action plan.
4. If missing/invalid:
   - do not show a duplicate full calculator;
   - show a clear message:
     > “Run the Advanced Calculator first so we can reverse-plan from your real current data.”
   - provide links to `advanced-v2.html` and `advanced.html`.

## reverse.html visible sections

### 1. Imported Current Situation

Show a compact card/table using the saved Advanced Calculator data:

- source calculator;
- single/couple;
- current age(s);
- desired retirement age(s);
- salary/income summary;
- current super balance(s);
- home ownership and mortgage summary;
- investment property summary;
- other investments/cash if available;
- current savings/super contribution assumptions;
- Age Pension enabled/disabled;
- assumptions version/date.

This is read-only by default.

Provide a link:

```text
Edit current data in Advanced Calculator
```

This takes the user back to the correct source page.

### 2. Current Forward Projection

Show what the existing calculator predicted from the user’s current real data:

- projected retirement income in today’s dollars;
- projected retirement income at retirement in nominal dollars;
- projected super/assets at retirement;
- projected age pension component if available;
- projected mortgage balance at retirement;
- projected probability/success score if Monte Carlo data exists;
- projected estate/inheritance value if available.

This should be labelled:

```text
Your current path based on the data you entered
```

### 3. Goal Controls

Only expose goal variables:

- retirement age;
- desired annual retirement income in today’s dollars;
- income basis: after tax / spending target;
- confidence target: 50%, 70%, 80%, 90%;
- estate/inheritance target in today’s dollars;
- Australia / overseas comparison;
- optional country selector for overseas retirement.

These are the only major editable controls on `reverse.html`.

Do not ask again for:

- current age;
- salary;
- super balance;
- mortgage;
- properties;
- rent;
- contribution settings;
- couple status;
- partner super;
- etc.

Those must come from the Advanced Calculator scenario.

### 4. Current Path vs Required Path

This is the core output.

Render a comparison table/cards like:

| Area | Current path | Required path | Gap / issue | What to change |
|---|---:|---:|---:|---|
| Retirement age | 71 | 71 | — | Goal age used |
| Retirement income | $62,000/yr | $80,000/yr | -$18,000/yr | Increase super/savings or retire later |
| Super at retirement | $900,000 | $1,250,000 | -$350,000 | Add $X/yr salary sacrifice |
| Mortgage at retirement | $140,000 | $0 preferred | Debt remains | Pay $Y/month extra |
| Net property income | $A | $B | -$C | Improve rent/yield or sell/reallocate |
| Confidence | 58% | 80% | -22 pts | Use stress-tested lever set |
| Estate target | $100,000 | $300,000 | -$200,000 | Save more / reduce bequest / retire later |

The UI can be cards instead of a table, but it must clearly show:

```text
Current value → Required value → Gap → Action
```

### 5. Reverse-Engineered Required Values

Calculate required values from the saved baseline:

- required extra annual super contribution;
- required salary sacrifice amount;
- required gross salary if current income is insufficient;
- required savings rate;
- required retirement age if no other changes are made;
- required current super balance to be on track;
- required mortgage extra repayment to be debt-free by retirement;
- required net investment income/rent;
- required estate/inheritance trade-off;
- required overseas target spend adjustment if overseas mode is selected.

These should be computed using reverse goal-seeking, not static heuristics.

### 6. Ranked Action Plan

Show ranked actions, for example:

1. Salary sacrifice an extra `$X/year` until retirement.
2. Redirect `$Y/month` to mortgage to be debt-free by age `Z`.
3. Retire at `72.8` instead of `71` if contributions stay unchanged.
4. Increase household income by `$A/year` or partner income by `$B/year`.
5. Use investment property net rent of `$C/year`, or sell/reallocate if the current property is dragging the plan.
6. Lower target income from `$80,000` to `$D` to fit current path.
7. Consider overseas retirement in selected countries, with FX/health/tax caveats.
8. Reduce estate/inheritance target if lifestyle is higher priority.

Rank by feasibility, not purely by mathematical effect.

## Solver Model

The reverse solver should be hidden behind the page.

Use the existing forward simulator as the truth engine.

For a lever `x`, define:

```js
h(x) = outcomeFromForwardSimulator(inputsWithLeverX) - targetOutcome
```

Use bisection/binary search as the default solver.

For each lever:

1. take the imported current scenario;
2. clone it;
3. modify only one lever;
4. run the existing simulator;
5. compare outcome to target;
6. solve until tolerance reached;
7. return the required value and feasibility metadata.

Start with deterministic solves for speed.

Then optionally run Monte Carlo/stress testing asynchronously or in a Web Worker.

### Required single-lever solves

Implement at least:

```js
solveForExtraAnnualSuperContribution()
solveForSalarySacrifice()
solveForRetirementAge()
solveForTargetIncomeAchievable()
solveForRequiredCurrentSuperBalance()
solveForMortgageExtraRepayment()
solveForNetInvestmentIncome()
solveForEstateTargetTradeoff()
```

### Important

The solver must not use default sample data if an imported scenario exists.

The imported Advanced Calculator data is the baseline.

## Advanced-v2 / advanced data bridge requirements

Create a shared module if necessary:

```text
src/js/scenario-bridge.js
```

Responsibilities:

```js
export function normalizeForwardScenario(rawInputs, rawResults, sourcePage) {}
export function saveForwardScenario(scenario) {}
export function loadForwardScenario() {}
export function validateForwardScenario(scenario) {}
export function buildReturnUrl(sourcePage) {}
```

Both `advanced.html` and `advanced-v2.html` should use this bridge.

`reverse.html` should not know the internal quirks of both pages. It should read the canonical bridge object.

## Goal defaults

When opening reverse.html, default the goal controls to:

- retirement age from Advanced Calculator if present;
- target income from existing desired income field if present;
- otherwise use ASFA comfortable benchmark depending on single/couple;
- confidence target 80%;
- estate target 0 unless provided;
- location Australia.

When the user changes retirement age or desired retirement income on reverse.html, recalculate:

- nominal target at retirement;
- required capital;
- required contribution/salary/retirement-age alternatives;
- comparison table;
- ranked actions.

## Inflation treatment

The desired retirement income input must be labelled:

```text
Desired annual retirement income in today’s dollars
```

Internally project to nominal dollars:

```js
nominalTarget = todayDollarTarget * Math.pow(1 + inflationRate, yearsToRetirement)
```

Display both:

```text
$80,000/year in today’s money
≈ $146,700/year at age 71 assuming 2.8% inflation
```

## Acceptance Criteria

### UX acceptance criteria

- `advanced-v2.html` and `advanced.html` ask for or preserve desired retirement age.
- After calculation, a visible Reverse Plan / Gap Analysis CTA appears.
- The CTA only appears after valid forward results exist.
- `reverse.html` loads the saved forward scenario automatically.
- `reverse.html` is not a duplicate data-entry form.
- `reverse.html` shows imported current situation and forward results first.
- `reverse.html` only asks the user to adjust goal variables.
- `reverse.html` shows Current Path vs Required Path.
- `reverse.html` shows gaps/problems clearly.
- `reverse.html` shows ranked actions.
- If no saved scenario exists, reverse.html directs the user back to Advanced Calculator.

### Calculation acceptance criteria

- Reverse values must be calculated from the imported current scenario.
- Changing retirement age on reverse.html recalculates all required values.
- Changing target income in today’s dollars recalculates nominal target and required values.
- Required contribution solve, retirement-age solve and achievable-income solve must round-trip through the forward simulator.
- Solver must not return fake precise answers if no bracket/solution exists.
- Solver must identify infeasible results and pivot to trade-offs.

### Test acceptance criteria

Add/modify Jest tests for:

- scenario bridge save/load/validate;
- reverse page behaviour with no scenario;
- reverse page behaviour with valid imported scenario;
- bisection solver round-trip;
- retirement age validation;
- target income inflation conversion;
- comparison row generation;
- action ranking.

Add Playwright/e2e test:

1. open advanced-v2;
2. enter or load a valid scenario;
3. set retirement age;
4. run calculation;
5. verify Reverse Plan CTA appears;
6. click CTA;
7. verify reverse.html imports scenario;
8. verify Current Path vs Required Path appears;
9. change target income;
10. verify gaps/actions update.

## Non-goals

Do not:

- rebuild the Advanced Calculator inside reverse.html;
- ask the user to re-enter their full financial situation;
- create a standalone reverse calculator independent of the forward results;
- show reverse results from default values when a real saved scenario is available;
- duplicate tax/super/Age Pension constants;
- bypass the existing simulator;
- produce financial advice language.

## Final expected user experience

A user should feel:

> “I entered my real data once in the Advanced Calculator. Now this Reverse Plan tells me whether my desired retirement age and income are realistic, what the gap is, and what I can change to make it work.”

The reverse calculator itself should be mostly invisible. The visible product is a **gap analysis and action plan generated after the forward calculation**.
