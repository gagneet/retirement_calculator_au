Yes — I can now see the repository: `gagneet/retirement_calculator_au`.

The strongest finding is that your own repo already contains an audit document that confirms the same class of problems we identified from the PDF/Excel/JSON output: the app has **multiple calculation pipelines**, and they do not share the same pension, tax, super, scenario, Monte Carlo, and reporting logic. The audit explicitly says the advanced experience is weakened by **three different calculation engines** that “silently disagree with each other.” 

## 1. Current architecture problem

The audit identifies three pipelines:

| Pipeline       | Area                                          | Current role                                                      | Problem                                                      |
| -------------- | --------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------ |
| **Pipeline A** | `app.js → simulator.js`                       | Main calculator + deterministic projection + enhanced Monte Carlo | Best implementation, but not used everywhere                 |
| **Pipeline B** | `runFullSimulation()` / `simulation_engine/*` | Life simulation tab                                               | Uses separate pension, tax, withdrawal and Monte Carlo logic |
| **Pipeline C** | `advanced-design-engine.js`                   | Advanced design sandbox                                           | Standalone assumptions and simplified pension logic          |

The repo audit states Pipeline A is strongest for tax, contribution caps, trust handling and enhanced Monte Carlo, while Pipeline B contains the largest output distortions. 

This explains the contradictions in your generated report:

* deterministic final balance differs from Monte Carlo median
* stress tests sometimes show no effect
* healthcare scenario gives `$0`
* debt flags contradict inputs
* franking percentages are misread
* recommendation impacts are absurdly large
* aged-care probability differs from JSON
* scenario and report outputs appear to use different assumptions

The fix is to make **Pipeline A the core calculation engine** and force every tab, report, export, scenario, stress test, and recommendation module to call it.

## 2. Bugs already confirmed in the repo audit

### A. Age Pension modelling is wrong in Pipeline B

The audit says Pipeline B uses stale pension thresholds and separate pension logic instead of the shared config. 

More importantly, it says Pipeline B treats **actual super withdrawals as assessable income**, whereas Age Pension modelling should use deeming for financial assets/account-based pensions in the relevant cases. 

It also says the model calculates super withdrawal need **before subtracting pension income**, then adds pension later. 

That can produce a very misleading result:

```text
Wrong:
requiredDrawdown = spendingNeed - otherIncome
finalCashflow = requiredDrawdown + pension

Correct:
requiredDrawdown = spendingNeed - otherIncome - pension
finalCashflow = requiredDrawdown + otherIncome + pension
```

This matters because the current version can make retirement balances look stronger than they are.

### B. Retirement investment income is set to zero

The audit identifies that Pipeline B sets investment income to zero in retirement. 

That is not realistic. Retirees can still receive:

* dividends
* interest
* rental income
* distributions
* franking credits
* capital gains/losses

This can distort both retirement cash flow and Age Pension means testing.

### C. Partner super logic is inconsistent

The audit says partner super contributions are taxed at **0%** in Pipeline B, while the main person’s concessional contributions are taxed at 15%. 

That will overstate partner super over long periods.

It also says Pipeline B does not apply Division 293 for high-income earners. 

Given your uploaded JSON had your salary at about `$202,509`, this matters because Division 293 can become relevant depending on income plus concessional contributions.

### D. Monte Carlo is inconsistent

The audit says Pipeline B Monte Carlo samples **one return per run** and reuses it across all years, which removes most sequence-of-return risk. 

For retirement planning, this is a major issue. The whole point of Monte Carlo is that every year should have a different return path:

```ts
for each simulation:
  for each year:
    annualReturn = sampledReturnForThatYear()
```

Not:

```ts
annualReturn = sampledOnce()
for each year:
  useSameAnnualReturn()
```

Your enhanced Monte Carlo engine is described as the strongest stochastic engine in the repo and should become the only Monte Carlo engine used across the app. 

## 3. Bugs from your generated PDF/JSON that map to likely code issues

### 1. `hasDebt: "none"` being treated as true

Your JSON says:

```json
"hasDebt": "none",
"creditCardBalance": 0,
"personalLoanBalance": 0,
"carLoanBalance": 0,
"hecsBalance": 0
```

But the report says high-interest debt exists.

Likely issue:

```js
if (userData.hasDebt) {
  highInterestDebt = true;
}
```

In JavaScript, `"none"` is truthy.

Fix:

```ts
const highInterestDebt =
  Number(input.creditCardBalance || 0) > 0 ||
  Number(input.personalLoanBalance || 0) > 0 ||
  Number(input.carLoanBalance || 0) > 0;
```

Do not use `hasDebt` as a boolean unless it is actually a boolean.

### 2. `numRuns` ignored or report hard-coded

Your JSON says:

```json
"numRuns": 16000
```

But the PDF says “Based on 1,000 simulations.”

Fix:

```ts
const numRuns = Number(input.numRuns ?? 1000);

const monteCarloResult = runEnhancedMonteCarloSimulation({
  ...normalisedInputs,
  numRuns
});

report.monteCarloRunCount = monteCarloResult.numRuns;
```

Then the PDF/export should render the actual value from the result object, not a hard-coded string.

### 3. Percentage fields interpreted inconsistently

Your JSON says:

```json
"australianEquityAllocation": 0.4,
"frankingRate": 0.75
```

That should mean **40%** and **75%**.

But the report suggestion says Australian equity allocation is **0.4%**, which means one module treats ratios as percentages.

Add a canonical normaliser:

```ts
function normaliseRatio(value: number): number {
  if (value > 1 && value <= 100) return value / 100;
  return value;
}

function displayPercent(value: number): string {
  return `${(normaliseRatio(value) * 100).toFixed(1)}%`;
}
```

All internal calculations should use ratios. All UI/report displays should use percentages.

### 4. Aged-care probability is overwritten

Your JSON says:

```json
"agedCareProbability": 0.22
```

But the PDF says **13%**.

This means healthcare logic is probably using a default or derived assumption rather than the user’s explicit input.

Fix precedence:

```ts
const agedCareProbability =
  input.agedCareProbability != null
    ? normaliseRatio(input.agedCareProbability)
    : deriveAgedCareProbability(input);
```

Also report whether the value is:

```text
User supplied: 22%
```

or

```text
Model-derived: 13%
```

### 5. Scenario/stress tests not applying scenario deltas

The PDF showed several stress tests with the exact same final balance as the current plan. That suggests the stress object is being labelled but not actually passed into the calculation engine.

Correct structure:

```ts
const base = calculateRetirementPlan(inputs);

const stressResults = stressDefinitions.map(stress => {
  const stressedInputs = applyStress(inputs, stress);
  return {
    name: stress.name,
    result: calculateRetirementPlan(stressedInputs)
  };
});
```

Every scenario should be a modification of the same canonical input object, then calculated by the same engine.

### 6. Recommendation impacts are not calculated as scenario deltas

The PDF produced impossible impacts in the billions. That is probably caused by summing yearly balances, compounding deltas incorrectly, or treating `15` as `1500%`.

The only acceptable recommendation impact calculation should be:

```ts
impact =
  scenarioResult.deterministic.finalBalance -
  baseResult.deterministic.finalBalance;
```

For Monte Carlo:

```ts
medianImpact =
  scenarioResult.monteCarlo.medianFinalBalance -
  baseResult.monteCarlo.medianFinalBalance;

successRateImpact =
  scenarioResult.monteCarlo.successRate -
  baseResult.monteCarlo.successRate;
```

Never calculate recommendation impact from a shortcut formula if the full engine is available.

## 4. What should be coordinated/combined

These should be combined into shared modules:

```text
policy/
  tax-policy.ts
  super-policy.ts
  pension-policy.ts
  deeming-policy.ts
  drawdown-policy.ts
  contribution-caps.ts

engine/
  normalise-inputs.ts
  validate-inputs.ts
  household-timeline.ts
  projection-engine.ts
  monte-carlo-engine.ts
  scenario-runner.ts
  stress-runner.ts
  recommendation-runner.ts

reports/
  pdf-export.ts
  excel-export.ts
  chart-data.ts
```

The flow should become:

```text
Raw form / JSON
  ↓
normaliseInputs()
  ↓
validateInputs()
  ↓
calculateBaseProjection()
  ↓
calculateScenarios()
  ↓
calculateStressTests()
  ↓
calculateMonteCarlo()
  ↓
deriveRecommendationsFromScenarioDeltas()
  ↓
render UI / PDF / Excel
```

The audit itself recommends making one rules engine the source of truth for pension, tax, super and Monte Carlo assumptions. 

## 5. Data points that should be added

The audit lists several missing fields that would materially improve prediction quality, including DOB, actual household expenses, unused concessional cap history, property cost base, deeming/grandfathering status, work bonus data, and actuarial longevity preferences. 

For your calculator, I would prioritise these:

1. **Date of birth for each adult**
   Required for preservation age, Age Pension timing, and rule eligibility.

2. **Actual current household expenses**
   Do not infer expenses as a percentage of gross salary.

3. **Desired retirement spending by category**
   Separate base living costs, travel, healthcare, car replacement, home maintenance, hobbies, and legacy goals.

4. **Property cost base**
   Purchase price, stamp duty, legal costs, improvements, depreciation adjustments, sale costs.

5. **Super component split**
   Taxable vs tax-free component.

6. **Carry-forward concessional cap history**
   Especially important for strategy recommendations.

7. **Non-concessional contribution eligibility**
   Total super balance and bring-forward period.

8. **Retirement income tax status**
   Accumulation vs pension phase should be modelled separately.

9. **Age Pension residency eligibility**
   Especially relevant because your JSON includes age came to Australia and age started earning in Australia.

10. **Actual mortgage and investment-property amortisation**
    Current loan balance, rate, payment, loan type, remaining term, offset balance.

## 6. Implementation order I recommend

### Phase 1 — stop wrong outputs

Fix these first:

* `hasDebt` string truthiness bug
* percentage/ratio normalisation
* `numRuns` being ignored or hard-coded
* aged-care probability override
* recommendation impact calculation
* stress-test scenario application

These are user-visible trust issues.

### Phase 2 — pension/cashflow correctness

Use one Age Pension engine everywhere:

```ts
calculateAgePension({
  age,
  partnerAge,
  homeowner,
  assessableAssets,
  deemedIncome,
  employmentIncome,
  relationshipStatus
});
```

Replace actual super withdrawals in the income test with deemed income where appropriate.

Subtract pension before calculating portfolio withdrawal need.

### Phase 3 — consolidate engines

Make Pipeline A the core engine. Pipeline B and Pipeline C should become either:

* UI wrappers around Pipeline A, or
* removed/archived if they are prototypes.

The audit already recommends retiring or merging standalone pension thresholds in `simulation_engine/pension_engine.js` and the standalone rule set in `advanced-design-engine.js`. 

### Phase 4 — validation tests

Create golden tests for:

* single homeowner
* couple homeowner
* one partner retired / one still working
* investment property with negative equity
* high-income Division 293 case
* pension eligible case
* pension ineligible case
* downsizer case
* stress test crash at retirement
* Monte Carlo with fixed seed

Each test should assert:

```ts
expect(result.finalBalance).toBeCloseTo(expected, tolerance);
expect(result.successRate).toBeBetween(min, max);
expect(result.assumptionsUsed).toMatchSnapshot();
```

## 7. Bottom line

Your calculator has a strong foundation, especially the main `app.js → simulator.js` path and enhanced Monte Carlo design. But the generated PDF/Excel output is not yet decision-grade because different parts of the application are answering different questions with different engines.

The key change is:

> **One canonical retirement engine. Everything else — scenarios, stress tests, Monte Carlo, recommendations, charts, PDF and Excel — must call that same engine and only differ by input overrides.**

That will make the calculator behave more like MoneySmart-style planners: a user can ask, “Where will I be at age 71, 80, 90, or 95?” and the answer will be traceable to one set of assumptions, one projection engine, and one result object.

