# AI Agent Prompt: Reverse Retirement Planner for Australian Retirement Calculator

## Role

You are an expert AI coding agent working on the `gagneet/retirement_calculator_au` repository.

Your task is to implement a new **Reverse Retirement Planner** for the existing Australian retirement calculator.

The existing calculator is primarily a forward simulator: it asks the user for current age, assets, salary, superannuation, home ownership, mortgage, investment properties and retirement assumptions, then projects whether the user is likely to have enough money in retirement.

The new reverse planner must answer the opposite question:

> Given the retirement outcome the user wants, what do they need to do from today to make that outcome realistic?

This must be implemented as a practical, honest planning tool, not a simplistic “magic number” calculator.

---

## High-level product goal

Build a reverse retirement calculator that helps a user answer questions such as:

- I am currently 49 and want to retire at 71. What salary, super balance, home equity, mortgage position, investments and savings rate do I need today?
- If I want $80,000 per year after tax in today’s dollars, what actions make that realistic?
- If I am single versus part of a couple, how does the required savings path change?
- If only one partner earns income, what salary is required?
- If both partners earn equally, what does each need to contribute?
- If one partner has low income and low super, what options improve the result?
- If one partner has low super but high income, what contribution strategy helps?
- If the target is not reachable, what trade-offs are available?
- Would retiring overseas materially improve the outcome?
- Can the household still leave an inheritance to children, grandchildren or a trust?

The output must be action-oriented:

> “Your current plan is projected to fund about $62,000/year in today’s dollars with 61% confidence. To reach $80,000/year with 80% confidence, your most feasible levers are: add $14,200/year to super, retire 2.5 years later, clear your mortgage by age 67, or reduce your inheritance target by $180,000.”

---

## Existing codebase integration requirement

Do **not** build a disconnected calculator.

The reverse planner must reuse the existing forward calculator wherever possible.

Expected existing modules to inspect and reuse:

- `simulator.js`
- `config.js`
- `decision-support-engine.js`
- any existing tax, superannuation, Age Pension, property, Monte Carlo, overseas, inflation, spending and retirement lifecycle modules

The reverse planner should sit above the existing simulator as a **goal-seeking wrapper**.

Preferred architecture:

```text
User target
  ↓
Build scenario inputs
  ↓
Run existing forward simulator
  ↓
Measure gap against target
  ↓
Change one or more levers
  ↓
Run simulator again
  ↓
Rank feasible solutions
```

---

## New page and files

Create a new page or mode for the reverse calculator.

Preferred page:

```text
/reverse.html
```

Preferred new JavaScript files:

```text
src/js/reverse-planner.js
src/js/reverse-solver.js
src/js/reverse-scenarios.js
src/js/reverse-ui.js
src/js/reverse-report.js
```

Adapt paths to match the actual repository structure.

Do not duplicate large blocks of logic already present in the forward calculator. Import and reuse existing functions where possible.

---

## Core implementation principle

The existing forward calculator is the truth engine.

The reverse planner should repeatedly call the forward simulator with changed assumptions until it finds one or more scenarios that meet the user’s target.

Implement this conceptual API:

```js
solveRetirementGoal(inputs, target, levers, constraints)
```

Where `inputs` are the current financial details, `target` is the desired retirement outcome, `levers` are the variables the solver may change, and `constraints` are user limits such as maximum salary sacrifice, maximum retirement age, willingness to retire overseas, or whether the family home may be sold.

---

## Target model

The target object should support at least:

```js
{
  currentAge: 49,
  retirementAge: 71,
  householdType: "single" | "couple",
  targetAnnualIncomeToday: 80000,
  targetIncomeIsAfterTax: true,
  locationMode: "australia" | "overseas" | "compare",
  overseasCountries: [
    "Thailand",
    "Portugal",
    "Spain",
    "New Zealand",
    "Malaysia",
    "India",
    "United Kingdom",
    "United States",
    "Canada"
  ],
  successProbabilityTarget: 0.8,
  lifespanAgePrimary: 95,
  lifespanAgePartner: 98,
  minimumEstateToday: 0,
  preserveHomeAsInheritance: false,
  includeAgePension: true,
  inflationRate: 0.028,
  stressMode: "base" | "bad_first_decade" | "high_inflation" | "property_shock" | "combined_crisis"
}
```

---

## Required reverse questions

The reverse planner should be able to answer the following questions.

### 1. Required extra annual savings

How much extra must the household save or invest per year from now until retirement to meet the target?

Output:

```text
Required additional annual saving: $X/year
Equivalent monthly amount: $Y/month
Confidence level: Z%
```

### 2. Required extra super contribution

How much extra must be contributed to super each year?

Support:

- concessional contribution
- non-concessional contribution
- partner contribution
- contribution splitting where supported by the current model
- cap warning if the suggested amount may exceed current caps

Output:

```text
Required extra super contribution: $X/year until age 71
Estimated effect: improves retirement income by $Y/year
```

### 3. Required gross salary

If the user or household wants the target outcome, what gross salary is required under different earning patterns?

Support household earning patterns:

```text
single earner
couple, one earner
couple, equal earners
couple, one high earner and one low earner
couple, low-super partner with low income
couple, low-super partner with high income
```

Output examples:

```text
One-earner couple: required gross salary is about $X/year.
Equal-earner couple: each partner requires about $Y/year.
High/low income couple: partner A requires $X/year and partner B requires $Y/year.
```

### 4. Required current super balance

Given no change in current salary or contribution behaviour, what super balance would be required today to meet the target?

Output:

```text
Current super needed today: $X
Current super gap: $Y
```

### 5. Required retirement age

If the current plan does not meet the target, what retirement age would make it feasible?

Output:

```text
Target is not feasible at 71 under current assumptions.
It becomes feasible around age 73.4 with 80% confidence.
```

### 6. Mortgage-free retirement path

Calculate whether the user is likely to enter retirement mortgage-free.

If not, solve for:

- extra monthly repayment required
- age at which mortgage is cleared
- retirement income reduction if mortgage remains

Output:

```text
Your mortgage is projected to have $X remaining at retirement.
To clear it by age 71, you need to pay about $Y extra per month.
Clearing the mortgage reduces required retirement income by about $Z/year.
```

### 7. Investment property rent/equity requirement

If an investment property exists or the user is considering one, solve for:

- required net rent
- required gross rent after expenses/vacancy
- property value/equity needed
- whether selling property at retirement improves the result
- whether paying down investment debt is better than buying another property

Output:

```text
To close the retirement gap using property income alone, you need about $X/year net rent.
Assuming 75% rent reliability after costs and vacancy, this implies about $Y/year gross rent.
```

### 8. Overseas retirement comparison

Compare retirement in Australia with common overseas destinations for Australians:

- Thailand
- Portugal
- Spain
- New Zealand
- Malaysia
- India
- United Kingdom
- United States
- Canada

For each country, model or clearly warn about:

- local cost-of-living adjustment
- rent or housing assumptions
- AUD exchange rate impact
- FX volatility buffer
- Age Pension portability implications
- Australian tax residency risk
- local tax risk
- reciprocal healthcare availability or lack of it
- private health insurance requirement
- visa/residency uncertainty
- cost of returning to Australia

Do not overstate certainty. Overseas retirement outputs must be cautious and transparent.

Output example:

```text
Malaysia scenario:
Estimated equivalent drawdown: $52,000–$62,000 AUD/year
Add FX buffer: 10%
Add health/visa buffer: $6,000–$12,000/year
Result: potentially feasible, but with healthcare, tax residency, visa and currency risks.
```

### 9. Estate, inheritance and trust objective

Support optional estate targets:

```js
{
  preserveHome: true,
  minimumEstateTodayDollars: 500000,
  childrenInheritanceTodayDollars: 300000,
  grandchildrenEducationFundTodayDollars: 100000,
  trustVehicle: "none" | "family_trust" | "testamentary_trust" | "smsf_estate_plan",
  allowHomeEquityUse: false
}
```

Success should optionally mean:

```text
Money lasts to target lifespan age AND ending estate is greater than the inheritance target.
```

Output example:

```text
Your retirement income target is achievable, but preserving a $500,000 estate reduces success confidence from 84% to 63%.
```

---

## Inflation treatment

The user should enter retirement spending in today’s dollars.

Convert internally to nominal dollars using:

```text
targetNominalIncomeAtRetirement = targetIncomeToday × (1 + inflationRate) ^ yearsToRetirement
```

Example:

```text
Age now: 49
Retire at: 71
Years: 22
Target today: $80,000
Inflation: 2.8%
Nominal retirement-year target = $80,000 × 1.028^22 ≈ $146,700/year
```

The UI should show both:

```text
Target lifestyle: $80,000/year in today’s money
Equivalent at retirement: about $146,700/year if inflation averages 2.8%
```

All final results should be displayed primarily in today’s dollars, with optional nominal figures.

---

## Sequence-of-returns and crisis testing

Do not solve only against average returns.

The reverse planner must run at least these modes:

```text
base case
80% Monte Carlo confidence
bad first decade
high inflation
property shock
combined crisis
```

Suggested stress preset structure:

```js
const STRESS_PRESETS = {
  base: {},
  badFirstDecade: {
    equityReturnOverrideYears: { 0: -0.18, 1: -0.08, 2: 0.02 },
    lowerReturnsForYears: 10
  },
  highInflation: {
    inflationShock: 0.045,
    durationYears: 10
  },
  propertyShock: {
    propertyValueDrop: 0.20,
    rentDrop: 0.10,
    interestRateIncrease: 0.02
  },
  combinedCrisis: {
    badFirstDecade: true,
    highInflation: true,
    propertyShock: true
  }
};
```

Output should show the cost of robustness:

```text
Base-case extra super required: $9,800/year
80% confidence extra super required: $14,200/year
Bad-first-decade extra super required: $19,600/year
```

---

## Age Pension interaction

The calculator must not ask “how much super do I need?” in isolation.

It must account for Age Pension, if the existing codebase already supports it.

Each simulated retirement year should consider:

```js
agePension = calculateAgePension({
  age,
  coupleStatus,
  homeOwnerStatus,
  assessableAssets,
  deemedIncome,
  rentalIncome,
  overseasStatus
});
```

Then compute:

```text
requiredPrivateIncome = targetAfterTaxSpending - Age Pension - net rent - other income
```

The output should clearly explain whether the target is mostly funded by:

- private super and investments
- part Age Pension
- full or near-full Age Pension
- property rent
- overseas cost reduction
- home equity use

---

## Solver behaviour

### Single-variable goal seeking

Use binary search / bisection for monotonic variables such as:

- extra annual super contribution
- extra annual savings
- required salary
- required retirement age
- extra mortgage repayment
- required current super balance
- required net rent

Pseudo-code:

```js
async function binarySolve({ low, high, tolerance, maxIterations, testFn }) {
  let best = null;

  for (let i = 0; i < maxIterations; i++) {
    const mid = (low + high) / 2;
    const result = await testFn(mid);

    if (result.passesGoal) {
      best = { value: mid, result };
      high = mid;
    } else {
      low = mid;
    }

    if (Math.abs(high - low) <= tolerance) break;
  }

  return best;
}
```

### Multi-variable trade-off frontier

Do not pretend there is only one correct answer.

Generate a set of ranked trade-off options:

```text
Option A: Add $14,200/year to concessional super
Option B: Retire at 73.4 instead of 71
Option C: Pay $1,100/month extra into the mortgage until age 67
Option D: Add an investment property producing $9,500/year net rent
Option E: Retire overseas with a 15% FX and healthcare buffer
Option F: Reduce inheritance target by $180,000
```

### Feasibility scoring

Rank each option by a transparent feasibility score.

Suggested scoring factors:

```text
affordability
behavioural difficulty
tax efficiency
risk reduction
certainty
reversibility
time to impact
complexity
regulatory uncertainty
```

Avoid ranking “assume higher investment returns” as a high-quality solution. It is not a user-controlled lever.

---

## Required classes/functions

Implement or adapt the following conceptual classes.

```js
export class ReverseRetirementSolver {
  constructor(config, simulator, decisionEngine) {
    this.config = config;
    this.simulator = simulator;
    this.decisionEngine = decisionEngine;
  }

  async evaluateScenario(inputs, target) {
    // Run deterministic projection and Monte Carlo projection using existing simulator.
    // Return income, confidence, estate value, pension share, property income and shortfall.
  }

  scoreScenario(deterministic, monteCarlo, target) {
    // Determine whether the scenario meets income, confidence and estate goals.
  }

  async solveForExtraSuper(inputs, target, constraints) {}
  async solveForAnnualSavings(inputs, target, constraints) {}
  async solveForSalary(inputs, target, constraints) {}
  async solveForRetirementAge(inputs, target, constraints) {}
  async solveForCurrentSuperBalance(inputs, target, constraints) {}
  async solveForMortgagePaydown(inputs, target, constraints) {}
  async solveForNetRent(inputs, target, constraints) {}
  async solveForOverseasCountry(inputs, target, constraints) {}
  async solveForEstateAdjustment(inputs, target, constraints) {}

  async solveAllLevers(inputs, target, constraints) {
    // Run all enabled solvers, collect feasible options, rank and return.
  }

  rankResults(results) {
    // Rank options by feasibility and usefulness.
  }
}
```

---

## Forward calculator integration

The forward calculator should be able to pass its current scenario into the reverse planner.

Use local storage or an equivalent existing mechanism:

```js
const currentScenario = collectAdvancedInputs();
localStorage.setItem("retirementScenario", JSON.stringify(currentScenario));
```

The reverse page should read:

```js
const existingScenario = JSON.parse(localStorage.getItem("retirementScenario") || "null");
```

Then ask:

```text
Use your existing calculator inputs?
[Yes — solve from my current plan]
[No — start with simple reverse mode]
```

Do not require users to re-enter advanced data if they have already entered it in the forward calculator.

---

## User interface requirements

### Simple mode

Minimum inputs:

```text
current age
retirement age
single or couple
desired annual retirement income in today’s dollars
current super balance
homeowner status
mortgage balance, optional
current salary, optional
country preference: Australia / compare overseas
```

Simple mode output:

```text
on-track / not on-track
projected retirement income
income gap
required extra annual saving
required extra super contribution
required salary
feasible retirement age
top 3 trade-off levers
```

### Advanced mode

Advanced inputs:

```text
separate partner ages
separate partner incomes
separate super balances
current home value
mortgage balance
mortgage repayments
investment properties
rent
shares / ETFs / managed funds
cash
other debts
tax assumptions
super contribution settings
Age Pension assumptions
overseas retirement countries
inheritance target
Monte Carlo confidence target
stress test mode
```

Advanced output:

```text
retirement paycheck projection
capital drawdown chart
Age Pension share
mortgage-free timeline
property decision analysis
salary/contribution target
inheritance probability
Australia versus overseas comparison
ranked action plan
```

---

## Output format

A result should be written in plain English before detailed tables.

Example:

```text
Goal:
Retire at 71 with $80,000/year after tax in today’s dollars.

Current path:
Projected sustainable retirement income: $63,500/year
Monte Carlo confidence: 58%
Estate at age 95: $110,000

Gap:
$16,500/year income gap
22 percentage point confidence gap
$250,000 estate gap

Most feasible actions:
1. Add $13,800/year concessional super from now to age 71
2. Or retire at 73.2 instead of 71
3. Or clear mortgage by age 67 and add $6,200/year to super
4. Or retire in Malaysia/Thailand with a 15% FX buffer, but healthcare and visa risks apply
5. Or reduce inheritance target from $500,000 to $280,000
```

Then explain:

```text
Why this works:
Extra super improves compounding and tax efficiency.
Later retirement reduces drawdown years and adds SG contributions.
Mortgage-free retirement reduces annual spending pressure.
Overseas retirement reduces spending but increases healthcare, tax, visa and currency risks.
```

---

## Visualisation requirements

Where compatible with the existing UI, add:

- target versus projected income chart
- savings gap chart
- trade-off frontier chart
- confidence probability chart
- mortgage-free timeline
- Age Pension versus private income stacked view
- Australia versus overseas retirement comparison
- inheritance / estate depletion chart

Keep charts explainable. Avoid visual complexity that makes the calculator look precise beyond the quality of the assumptions.

---

## Recommendation engine integration

The reverse planner should feed results into the existing decision support engine where possible.

Expected recommendation categories:

```text
super contributions
mortgage reduction
retirement age adjustment
salary / income requirement
spouse contribution or partner balance improvement
investment property hold/sell/buy
share portfolio / non-super investment
Age Pension interaction
overseas retirement
estate and inheritance planning
trust / testamentary planning prompts
```

Recommendations must be practical and ranked.

Avoid generic advice such as:

```text
Consider speaking to a financial adviser.
```

That can appear as a disclaimer, but the calculator must still provide useful scenario insights.

---

## Overseas retirement rules and warnings

For overseas retirement comparisons, create a country assumptions table.

Suggested structure:

```js
const OVERSEAS_RETIREMENT_COUNTRIES = {
  Thailand: {
    costOfLivingFactor: 0.55,
    fxVolatilityBuffer: 0.15,
    healthInsuranceBufferAnnual: 9000,
    reciprocalHealthcare: false,
    agePensionPortabilityRisk: "medium",
    taxResidencyRisk: "medium",
    visaRisk: "medium"
  },
  Malaysia: {
    costOfLivingFactor: 0.60,
    fxVolatilityBuffer: 0.15,
    healthInsuranceBufferAnnual: 8000,
    reciprocalHealthcare: false,
    agePensionPortabilityRisk: "medium",
    taxResidencyRisk: "medium",
    visaRisk: "medium"
  },
  NewZealand: {
    costOfLivingFactor: 0.95,
    fxVolatilityBuffer: 0.08,
    healthInsuranceBufferAnnual: 3000,
    reciprocalHealthcare: true,
    agePensionPortabilityRisk: "lower",
    taxResidencyRisk: "medium",
    visaRisk: "lower"
  }
};
```

The values above are placeholders. Mark them clearly as configurable assumptions unless authoritative data has been added.

The UI must show:

```text
Overseas retirement estimates are scenario estimates only. They depend heavily on exchange rates, visa status, tax residency, healthcare access, Age Pension portability and whether the retiree may need to return to Australia.
```

---

## Edge cases

Handle:

- retirement age less than or equal to current age
- target income less than zero or unrealistic
- current age below working age
- current age above Age Pension age
- couple with partner already retired
- partner with different retirement age
- zero super balance
- very high mortgage at retirement
- no home ownership
- investment property with negative cash flow
- user refusing all feasible levers
- target cannot be reached within constraints
- Monte Carlo failure despite deterministic success
- Age Pension produces a better result despite lower assets
- overseas country has high healthcare or visa uncertainty
- estate target prevents success even where income is achievable

---

## When no solution is feasible

Never return only “not possible”.

Return a ranked explanation:

```text
No solution was found within your selected constraints.

The target fails because:
- required income is too high for the asset base
- retirement age is too early
- mortgage remains too large at retirement
- estate target is too high
- contribution cap prevents enough super accumulation

Closest feasible alternatives:
1. Retire at 74 instead of 71
2. Reduce annual target from $80,000 to $71,000
3. Add $18,000/year to super and clear mortgage by 70
4. Allow partial use of home equity after age 85
5. Compare Malaysia, Thailand or India retirement scenarios with risk buffers
```

---

## Testing requirements

Add unit tests for:

- inflation conversion
- binary solver convergence
- extra super solver
- salary solver
- retirement age solver
- mortgage paydown solver
- net rent solver
- estate target scoring
- scenario scoring
- unreachable target handling
- couple one-earner scenario
- couple equal-earner scenario
- low-super partner scenario
- overseas country adjustment
- Monte Carlo success threshold logic

Add integration tests for:

- using forward calculator inputs in reverse planner
- simple reverse mode
- advanced reverse mode
- Australia-only retirement
- overseas comparison retirement
- inheritance target enabled
- stress test enabled

---

## Acceptance criteria

The implementation is acceptable when:

1. A user can open the reverse planner page.
2. A user can enter current age, retirement age, household type and desired retirement income.
3. The planner can reuse existing forward-calculator inputs when available.
4. The planner runs the existing simulation engine rather than duplicating projection logic.
5. The planner can solve for at least:
   - extra annual super contribution
   - required salary
   - feasible retirement age
   - required current super balance
   - extra mortgage repayment
6. The planner displays inflation-adjusted results in today’s dollars and retirement-year dollars.
7. The planner distinguishes deterministic success from Monte Carlo confidence.
8. The planner provides ranked trade-off options when the target is not currently reachable.
9. The planner supports single and couple scenarios.
10. The planner supports one-earner, equal-earner, high/low-earner and low-super partner scenarios.
11. The planner includes Age Pension interaction where the existing codebase supports it.
12. The planner includes overseas comparison placeholders for Thailand, Portugal, Spain, New Zealand, Malaysia, India, United Kingdom, United States and Canada.
13. The planner supports estate/inheritance targets.
14. The output is plain-English, honest, and avoids implying guaranteed financial outcomes.
15. Tests are added for the solver and scenario scoring.

---

## Financial advice guardrails

This is a calculator and educational scenario tool, not personal financial advice.

The UI and reports must include a clear disclaimer:

```text
This calculator provides general scenario modelling only. It does not consider all personal circumstances and is not financial, tax, legal or migration advice. Age Pension, tax, superannuation, healthcare, visa and overseas-residency rules can change. Consider professional advice before making major retirement, superannuation, property, tax or estate-planning decisions.
```

However, do not use the disclaimer as an excuse to provide vague output. The calculator must still provide specific scenario results based on user inputs.

---

## Implementation sequence

Recommended build order:

### Phase 1: Solver foundation

- Inspect existing simulator and config modules.
- Identify callable simulation entry points.
- Create `reverse-solver.js`.
- Implement `evaluateScenario()` and `scoreScenario()`.
- Implement generic `binarySolve()`.
- Implement extra super, salary and retirement age solvers.

### Phase 2: Reverse planner UI

- Create `reverse.html`.
- Add simple mode inputs.
- Add ability to import existing forward-calculator scenario from local storage.
- Display target, current path, gap and top trade-offs.

### Phase 3: Household and mortgage/property scenarios

- Add household earning patterns.
- Add separate partner super balances and incomes.
- Add mortgage paydown solver.
- Add investment property rent/equity solver.

### Phase 4: Risk and confidence

- Add Monte Carlo success target.
- Add stress presets.
- Show base case versus robust case.

### Phase 5: Overseas and estate planning

- Add overseas country assumption table.
- Add Age Pension portability warning layer.
- Add reciprocal healthcare/tax/visa warning fields.
- Add estate and inheritance target modelling.

### Phase 6: Reporting and polish

- Add downloadable report if the repo already supports report generation.
- Add charts.
- Add decision support engine recommendations.
- Add tests and documentation.

---

## Coding style expectations

- Keep functions small and testable.
- Prefer pure functions for financial calculations.
- Avoid hard-coded magic numbers without named config entries.
- Keep assumptions in config files or clearly labelled assumption tables.
- Reuse existing formatter functions for currency, percentage and age display.
- Avoid introducing a heavy framework unless already used by the project.
- Preserve existing calculator behaviour.
- Do not break the forward calculator.
- Add comments only where the reasoning is not obvious.

---

## Final deliverables

The AI coding agent should produce:

1. New reverse planner page or mode.
2. Reverse solver module.
3. Scenario and assumption module.
4. UI integration with existing forward calculator inputs.
5. Ranked trade-off results.
6. Basic overseas comparison layer.
7. Estate/inheritance target support.
8. Tests for solver logic.
9. Short implementation documentation.
10. Clear disclaimers and assumption notes.

---

## Summary instruction for the coding agent

Build the Reverse Retirement Planner as a goal-seeking wrapper around the existing Australian retirement simulator. The planner must determine what a user needs to change today to reach a desired retirement age, income, confidence level, country of retirement and inheritance outcome. Reuse the existing simulator, config and decision-support modules. Implement binary solvers for single levers, a ranked trade-off frontier for multi-lever alternatives, inflation-adjusted targets, Monte Carlo/stress confidence, Age Pension interaction, household earning permutations, mortgage/property levers, overseas retirement comparison and estate planning constraints. The result must be practical, transparent, testable and honest about uncertainty.
