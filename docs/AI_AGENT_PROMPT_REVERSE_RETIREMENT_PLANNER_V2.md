# AI Agent Prompt V2: Build the Reverse / Goal-Seek Retirement Planner

## Repository

Target repository: `gagneet/retirement_calculator_au`

You are an AI coding agent implementing a new Reverse Retirement Planner for the existing Australian Retirement Calculator. The current product is primarily a forward simulator. The new capability must answer the inverse question:

> Given the retirement outcome the user wants, what needs to change today to make that outcome feasible?

This is not a standalone toy calculator. Build it as a goal-seeking wrapper around the existing simulator and policy modules.

---

## Implementation objective

Implement a new reverse calculator page that can answer, for example:

> I am 49 and want to retire at 71 with $80,000 per year after tax in today’s dollars. What salary, super balance, annual contribution, mortgage position, investment property rent/equity, overseas retirement setting, and inheritance target would make this achievable?

The result must be honest, scenario-based and action-oriented. It must not return only one “magic number”. It must return a ranked set of feasible trade-off levers.

Example output pattern:

```text
Goal:
Retire at 71 with $80,000/year after tax in today’s dollars.

Current path:
Projected sustainable income: $63,500/year
Monte Carlo confidence: 58%
Estate at age 95: $110,000

Gap:
$16,500/year income gap
22 percentage point confidence gap
$250,000 estate gap

Most feasible actions:
1. Add $13,800/year concessional super until age 71
2. Or retire at 73.2 instead of 71
3. Or clear the mortgage by age 67 and add $6,200/year to super
4. Or add an investment property producing $9,500/year net rent
5. Or compare Malaysia/Thailand/India retirement with FX, health and visa buffers
6. Or reduce the inheritance target by $180,000
```

---

## Non-negotiable design principle

The forward simulator is the source of truth.

Do not duplicate retirement projection logic. The reverse planner must repeatedly call the existing simulation engine and evaluate whether a modified scenario meets the requested target.

Inspect and reuse these existing modules before writing new logic:

```text
src/js/simulator.js
src/js/config.js
src/js/enhanced-config.js
src/js/utils.js
src/js/decision-support-engine.js
src/js/overseas-retirement.js
src/js/country-profiles.js
src/js/policy-engine.js
src/js/super-policy.js
src/js/simulation_engine/tax_engine.js
src/js/simulation_engine/super_engine.js
src/js/enhanced-monte-carlo.js
```

The existing `RetirementSimulator` already imports tax, super, Age Pension, deeming, property cash-flow, overseas portability, stochastic rates and Monte Carlo functionality. Reuse it.

---

## Repo-specific facts to respect

The repo uses webpack and already has entry points for `main`, `comparison`, and `advancedV2` in `webpack.config.js`. Add a new entry point for the reverse planner and an `HtmlWebpackPlugin` page for `reverse.html`.

Recommended additions:

```text
src/reverse.html
src/js/reverse-planner.js
src/js/reverse-solver.js
src/js/reverse-scenarios.js
src/js/reverse-ui.js
src/js/reverse-worker.js
src/js/reverse-assumptions.js
src/js/reverse-report.js
src/js/reverse-storage.js
src/js/reverse-charts.js
```

Recommended tests:

```text
tests/unit/reverse-solver.test.js
tests/unit/reverse-scenarios.test.js
tests/unit/reverse-assumptions.test.js
tests/unit/reverse-integration.test.js
tests/e2e/reverse-planner.spec.js
```

Use the existing scripts:

```bash
npm test
npm run build
npm run test:e2e
```

Do not introduce a new framework. Keep the app as vanilla JS / ES modules unless the repo already uses something else.

---

## Financial methodology

### 1. Inputs are in today’s dollars

The user enters retirement income in today’s money.

```js
const targetNominalIncomeAtRetirement =
  targetAnnualIncomeToday * Math.pow(1 + inflationRate, yearsToRetirement);
```

Display both values:

```text
Target lifestyle: $80,000/year in today’s dollars
Equivalent at retirement: $146,700/year if inflation averages 2.8% over 22 years
```

Internally, the existing simulator may already project nominal values. Preserve its behaviour. Deflate final outputs to today’s dollars for user display.

### 2. Analytical capital-target pre-compute

Before expensive numerical solving, calculate a rough target capital seed. This gives an instant headline estimate and tightens bisection brackets.

```js
function estimateRequiredCapitalAtRetirement({
  targetIncomeToday,
  yearsToRetirement,
  inflationRate,
  estimatedAgePensionAtRetirement,
  safeWithdrawalRate
}) {
  const targetIncomeNominal = targetIncomeToday * Math.pow(1 + inflationRate, yearsToRetirement);
  const privateIncomeRequired = Math.max(0, targetIncomeNominal - estimatedAgePensionAtRetirement);
  return privateIncomeRequired / safeWithdrawalRate;
}
```

Use configurable SWR defaults:

```js
safeWithdrawalRate: {
  conservative: 0.035,
  default: 0.04,
  dynamicSpendingUpper: 0.05
}
```

Do not use ASFA lump sums as a direct capital target if also modelling Age Pension, because ASFA lump sums already assume home ownership and part Age Pension.

### 3. Required contribution seed

Use a sinking-fund inversion to estimate the annual contribution needed before running the full numerical solver:

```js
function estimateRequiredAnnualContribution({
  targetCapitalAtRetirement,
  currentBalance,
  yearsToRetirement,
  annualReturn
}) {
  const n = yearsToRetirement;
  const r = annualReturn;
  if (n <= 0) return Infinity;
  if (Math.abs(r) < 1e-9) {
    return Math.max(0, (targetCapitalAtRetirement - currentBalance) / n);
  }
  const futureCurrent = currentBalance * Math.pow(1 + r, n);
  const annuityFactor = (Math.pow(1 + r, n) - 1) / r;
  return Math.max(0, (targetCapitalAtRetirement - futureCurrent) / annuityFactor);
}
```

This is only a seed. The final answer must come from running the existing forward simulator.

---

## Solver design

### Core API

Implement a generic solver module:

```js
export async function solveFor({
  lever,
  target,
  baseInputs,
  constraints,
  evaluator,
  bracket,
  tolerance,
  maxIterations = 60,
  method = 'bisection'
}) {}
```

The evaluator must call the existing simulator.

```js
export class ReverseRetirementSolver {
  constructor({ config, simulator, decisionEngineFactory }) {
    this.config = config;
    this.simulator = simulator;
    this.decisionEngineFactory = decisionEngineFactory;
  }

  async evaluateScenario(inputs, target, options = {}) {}
  scoreScenario(simulationResult, target) {}
  async solveAllLevers(baseInputs, target, constraints) {}
}
```

### Primary method: bisection

Use bisection as the shipped method because Australian tax, Age Pension and contribution-cap interactions create kinks and flat spots.

```js
export async function binarySolve({ low, high, tolerance, maxIterations, testFn }) {
  let lo = low;
  let hi = high;
  let best = null;

  const lowResult = await testFn(lo);
  const highResult = await testFn(hi);

  if (lowResult.passesGoal) return { value: lo, result: lowResult, iterations: 0 };
  if (!highResult.passesGoal) return { feasible: false, lowResult, highResult };

  for (let i = 0; i < maxIterations; i++) {
    const mid = (lo + hi) / 2;
    const result = await testFn(mid);

    if (result.passesGoal) {
      best = { value: mid, result, iterations: i + 1, feasible: true };
      hi = mid;
    } else {
      lo = mid;
    }

    if (Math.abs(hi - lo) <= tolerance) break;
  }

  return best || { feasible: false };
}
```

### Optional method: secant/Newton accelerator

You may implement secant/Newton only as an accelerator. Always fall back to bisection if:

```text
- derivative is zero or unstable
- result jumps outside bracket
- pension/tax flat spots cause non-convergence
- max iterations is reached
```

### Single-lever solves to implement first

Implement these first because they are monotonic and testable:

```text
1. Required extra annual super contribution
2. Required extra annual non-super saving/investment
3. Required gross salary
4. Feasible retirement age
5. Required current super balance
6. Required mortgage extra repayment
7. Required net investment property rent
8. Required target spending reduction
9. Required estate/inheritance target adjustment
```

### Multi-lever trade-off frontier

Do not build a six-dimensional optimiser in v1. Instead:

1. Solve each lever independently.
2. Rank the results by feasibility.
3. For selected pairs, build an iso-goal curve.

Examples:

```text
extra contribution vs retirement age
mortgage repayment vs super contribution
inheritance target vs success confidence
Australia spend vs overseas spend
```

---

## Scenario scoring

A scenario passes only when it satisfies all enabled target dimensions:

```js
function scoreScenario({ deterministic, monteCarlo }, target) {
  const incomeToday = deterministic.sustainableIncomeToday ?? deterministic.realAnnualIncome;
  const estateToday = deterministic.endingEstateToday ?? deterministic.finalBalanceToday ?? 0;
  const successRate = monteCarlo?.successRate ?? deterministic.successRate ?? 0;

  return {
    passesIncome: incomeToday >= target.targetAnnualIncomeToday,
    passesConfidence: successRate >= target.successProbabilityTarget,
    passesEstate: estateToday >= (target.minimumEstateToday || 0),
    incomeGap: target.targetAnnualIncomeToday - incomeToday,
    confidenceGap: target.successProbabilityTarget - successRate,
    estateGap: (target.minimumEstateToday || 0) - estateToday,
    successRate,
    incomeToday,
    estateToday,
    passesGoal: incomeToday >= target.targetAnnualIncomeToday &&
      successRate >= target.successProbabilityTarget &&
      estateToday >= (target.minimumEstateToday || 0)
  };
}
```

If the existing simulator returns different field names, write an adapter in `reverse-scenarios.js`. Do not modify simulator output shape unnecessarily.

---

## Risk, Monte Carlo and performance

### Two-stage solve

Use two-stage solving for performance:

```text
Stage 1: deterministic / median solve for instant response
Stage 2: Monte Carlo percentile solve in Web Worker
```

The UI must clearly label:

```text
Fast estimate
Risk-adjusted estimate
80% confidence estimate
Bad-first-decade estimate
```

### Web Worker

Run expensive reverse solves inside `src/js/reverse-worker.js`.

The worker should accept:

```js
{
  type: 'RUN_REVERSE_SOLVE',
  baseInputs,
  target,
  constraints,
  enabledLevers,
  options
}
```

The worker should post:

```js
{ type: 'PROGRESS', completed, total, currentLever }
{ type: 'PARTIAL_RESULT', lever, result }
{ type: 'COMPLETE', results, summary }
{ type: 'ERROR', message, details }
```

Cache scenario evaluations by stable input hash:

```js
const cacheKey = stableHash({ inputs, target, options });
```

Do not let Monte Carlo solving freeze the browser.

### Stress presets

Add configurable stress presets:

```js
export const REVERSE_STRESS_PRESETS = {
  base: {},
  badFirstDecade: {
    equityReturnOverrideYears: { 0: -0.20, 1: -0.15, 2: 0.02 },
    lowerReturnsForYears: 10
  },
  highInflation: {
    inflationShock: 0.06,
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

Apply these by adapting inputs passed to the simulator rather than hacking the simulator internals unless a clean stress-test hook already exists.

---

## Policy/config requirements

Before implementing solver outputs, audit `src/js/config.js` and related policy modules.

Important requirements:

```text
- Age Pension thresholds and deeming rates must reflect the current configured policy date.
- The March 2026 deeming rates are 1.25% lower and 3.25% upper.
- The config currently uses the spelling DEMING_* in places. Do not casually rename these keys and break existing code. If adding corrected DEEMING_* aliases, keep backwards-compatible DEMING_* references or update all references safely with tests.
- Concessional cap, non-concessional cap, SG rate, max contribution base, Division 293 threshold, transfer balance cap and Age Pension settings must come from config/policy modules, not hard-coded in reverse-solver.js.
```

If a policy constant is missing, add it to config with:

```js
{
  value,
  effectiveDate,
  source,
  lastVerified,
  note
}
```

But do not block v1 on perfect policy coverage. Mark missing rules as assumptions.

---

## Household scenario matrix

The reverse planner must work at household level while respecting per-person limits.

Support:

```text
single
couple_one_earner
couple_equal_earners
couple_high_low_income
couple_low_super_high_income
couple_low_super_low_income
couple_different_ages
couple_one_retired_one_working
```

For couples, model:

```text
combined retirement spending target
separate ages
separate retirement ages
separate salary
separate super balances
separate concessional caps
separate non-concessional caps
combined Age Pension income/assets test
partner with super in accumulation before pension age, where applicable in existing model
survivor/longevity scenario where one partner outlives the other
```

Implement routing rules:

```text
High income + low super: prefer carry-forward concessional contributions where eligible.
One earner + low/non-earning spouse: show spouse contribution and contribution splitting options.
Low income + low super: do not over-prioritise salary sacrifice; show LISTO/co-contribution/spouse levers if supported by config.
Equal earners: split contributions evenly until caps or cash-flow constraints bind.
```

If LISTO, co-contribution, spouse offset or carry-forward rules are not currently implemented, add placeholders in the recommendation layer with clear “not modelled yet” status rather than pretending the dollar result includes them.

---

## Mortgage and property levers

### Mortgage-free path

Solve for:

```text
projected mortgage balance at retirement
extra monthly repayment required to clear by retirement
age mortgage is cleared
retirement income drag if mortgage remains
```

Output example:

```text
Your mortgage is projected to have $182,000 remaining at retirement.
To clear it by age 71, add about $740/month.
A mortgage-free retirement lowers the required income target by approximately $14,000/year.
```

### Investment property

Support existing and hypothetical properties.

Solve for:

```text
required net rent
required gross rent after vacancy/maintenance/management buffers
required equity/property value
hold vs sell at retirement
pay down investment loan vs invest elsewhere
```

Do not recommend buying property simply because it closes a spreadsheet gap. Rank it lower than super/mortgage levers unless the user has enough deposit/cash-flow and accepts concentration, debt, vacancy and policy risk.

---

## Overseas retirement module

Implement this as an overlay on target spending, not as a replacement for the Australian projection engine.

Countries to include:

```text
Thailand
Portugal
Spain
New Zealand
Malaysia
India
United Kingdom
United States
Canada
```

Create `src/js/reverse-assumptions.js` with configurable defaults:

```js
export const OVERSEAS_RETIREMENT_ASSUMPTIONS = {
  Thailand: {
    costOfLivingFactor: 0.55,
    fxBuffer: 0.15,
    healthInsuranceAnnual: 9000,
    reciprocalHealthcare: false,
    socialSecurityAgreement: false,
    taxComplexity: 'medium',
    visaRisk: 'medium',
    notes: ['Private health cover required', 'FX risk material']
  },
  Malaysia: {
    costOfLivingFactor: 0.60,
    fxBuffer: 0.15,
    healthInsuranceAnnual: 8000,
    reciprocalHealthcare: false,
    socialSecurityAgreement: false,
    taxComplexity: 'medium',
    visaRisk: 'medium'
  },
  India: {
    costOfLivingFactor: 0.35,
    fxBuffer: 0.20,
    healthInsuranceAnnual: 7000,
    reciprocalHealthcare: false,
    socialSecurityAgreement: true,
    taxComplexity: 'medium',
    visaRisk: 'medium'
  },
  NewZealand: {
    costOfLivingFactor: 0.95,
    fxBuffer: 0.08,
    healthInsuranceAnnual: 3000,
    reciprocalHealthcare: true,
    socialSecurityAgreement: true,
    taxComplexity: 'medium',
    visaRisk: 'lower'
  },
  UnitedKingdom: {
    costOfLivingFactor: 1.00,
    fxBuffer: 0.12,
    healthInsuranceAnnual: 4000,
    reciprocalHealthcare: true,
    socialSecurityAgreement: false,
    taxComplexity: 'medium',
    visaRisk: 'medium'
  },
  UnitedStates: {
    costOfLivingFactor: 1.10,
    fxBuffer: 0.15,
    healthInsuranceAnnual: 18000,
    reciprocalHealthcare: false,
    socialSecurityAgreement: true,
    taxComplexity: 'very_high',
    visaRisk: 'high',
    notes: ['US tax treatment of Australian super can be complex and adverse']
  }
};
```

Mark these values as assumptions, not facts. Allow users to override:

```text
cost of living factor
AUD exchange-rate buffer
annual healthcare/private insurance buffer
annual flights/return-to-Australia buffer
local tax buffer
visa/residency buffer
```

Overseas adjusted target:

```js
function adjustTargetForOverseas(targetAnnualIncomeToday, country) {
  const a = OVERSEAS_RETIREMENT_ASSUMPTIONS[country];
  const base = targetAnnualIncomeToday * a.costOfLivingFactor;
  const fxRisk = base * a.fxBuffer;
  return base + fxRisk + a.healthInsuranceAnnual + (a.travelBufferAnnual || 0) + (a.taxBufferAnnual || 0);
}
```

UI warning must include:

```text
Overseas retirement results are scenario estimates only. They depend on exchange rates, tax residency, Age Pension portability, visa status, healthcare access, private insurance costs and whether you may need to return to Australia.
```

Special warnings:

```text
United States: flag as high tax/healthcare complexity for Australian super and retirees.
Countries without reciprocal healthcare: require private health buffer.
Countries without social security agreement: show portability/residency caution.
```

---

## Age Pension portability for overseas scenarios

Implement a simple v1 overlay if detailed portability is not already in `policy-engine.js`.

Fields:

```js
{
  overseasAbsenceWeeks,
  australianWorkingLifeResidenceYears,
  formerResidentClaimingAfterReturn,
  agreementCountry
}
```

Rules to model or warn about:

```text
Age Pension may be payable overseas, but rate and supplements can change after time overseas.
After extended absence, payment can depend on Australian Working Life Residence.
Former residents may face additional claiming/portability restrictions.
Agreement countries can affect claiming and totalisation.
```

Do not overstate this. If detailed calculation is not implemented, show a warning and run a sensitivity:

```text
100% Age Pension portability
75% Age Pension portability
50% Age Pension portability
0% Age Pension portability
```

---

## Estate, inheritance and trust objectives

Add optional estate constraints:

```js
estatePlanning: {
  preserveHome: true,
  minimumEstateTodayDollars: 500000,
  childrenInheritanceTodayDollars: 300000,
  grandchildrenEducationFundTodayDollars: 100000,
  trustVehicle: 'none' | 'family_trust' | 'testamentary_trust' | 'smsf_estate_plan',
  allowHomeEquityUse: false
}
```

Success definition becomes:

```text
money lasts to lifespan age
AND retirement income target is met
AND confidence threshold is met
AND estate target is met if enabled
```

Show the trade-off:

```text
Your income target is achievable with 84% confidence.
Preserving a $500,000 estate lowers confidence to 63%.
```

Do not provide legal drafting advice. Provide scenario impact only.

---

## Feasibility ranking

When a goal is not reached, solve all enabled levers and rank by:

```js
feasibilityScore =
  affordabilityScore * 0.25 +
  taxEfficiencyScore * 0.20 +
  riskReductionScore * 0.20 +
  behaviourScore * 0.15 +
  reversibilityScore * 0.10 +
  certaintyScore * 0.10 -
  complexityPenalty -
  regulatoryRiskPenalty;
```

Default ranking preference:

```text
1. Use concessional super headroom
2. Redirect existing savings / lift annual savings
3. Clear mortgage earlier
4. Retire slightly later
5. Adjust target spending
6. Use spouse/equalisation levers
7. Existing investment property optimisation
8. Buy new investment property
9. Overseas retirement
10. Reduce inheritance target
11. Assume higher investment returns — only as a risk scenario, never a primary recommendation
```

If a lever breaches constraints, return it as infeasible with the reason:

```text
Required salary sacrifice: $42,000/year
Status: infeasible under current concessional cap unless carry-forward cap is available.
```

---

## UI requirements

### Simple mode

Inputs:

```text
current age
retirement age
single/couple
desired annual income in today’s dollars
current super balance
salary
homeowner status
mortgage balance
include Age Pension yes/no
confidence target
```

Outputs:

```text
goal summary
current projected path
income gap
capital gap
confidence gap
top 3 actions
assumptions used
```

### Advanced mode

Inputs:

```text
partner age
partner retirement age
partner salary
partner super
home value
mortgage balance and rate
investment property value/debt/rent/expenses
shares/cash/other investments
estate target
overseas country comparison
stress test mode
Monte Carlo runs
```

Outputs:

```text
ranked lever table
trade-off frontier chart
Age Pension share chart
mortgage-free timeline
Australia vs overseas comparison
estate/inheritance chart
report/export section
```

### Forward calculator integration

Add a “Use in Reverse Planner” action to the advanced calculator if practical.

Persist current inputs:

```js
localStorage.setItem('retirementScenario:v1', JSON.stringify(currentScenario));
```

Reverse page reads:

```js
const existingScenario = JSON.parse(localStorage.getItem('retirementScenario:v1') || 'null');
```

If existing data is found, show:

```text
Use your existing Advanced Calculator inputs?
[Yes — solve from my current plan]
[No — start simple]
```

Also support importing from legacy/local keys if the repo already stores advanced inputs elsewhere.

---

## Charts

Implement only if compatible with existing chart utilities.

Useful charts:

```text
target vs projected income
capital gap over time
ranked lever impact bars
trade-off frontier: contribution vs retirement age
mortgage-free timeline
Age Pension vs private income stacked view
Australia vs overseas adjusted target
estate depletion / inheritance probability
```

Do not make the charts imply false precision. Always show assumptions.

---

## Edge cases

Handle:

```text
retirement age <= current age
current age > retirement age
zero super
very low or negative target
unrealistically high target
couple with different ages
partner already retired
mortgage remains after retirement
negative investment property cash flow
no feasible solution within constraints
Monte Carlo failure despite deterministic success
Age Pension cliff/kink causing non-smooth results
high assets reducing Age Pension
estate target preventing otherwise feasible income goal
overseas result cheaper but higher risk
US overseas scenario with high tax/healthcare complexity
```

---

## Tests

### Unit tests

Add tests for:

```text
inflation conversion
analytical capital target
required contribution seed
bisection convergence
no-bracket / infeasible result
scenario scoring
extra super solve
salary solve
retirement age solve
current super balance solve
mortgage repayment solve
net rent solve
target spending reduction solve
estate target scoring
overseas target adjustment
feasibility ranking
config alias/backwards compatibility for DEMING/DEEMING if changed
```

### Integration tests

Add tests for:

```text
reverse solver calls existing RetirementSimulator
solved extra contribution fed forward meets target
solved retirement age fed forward meets target
simple mode creates a result
advanced-mode scenario import from localStorage
Age Pension with/without comparison
overseas comparison returns warnings and adjusted targets
estate target lowers feasibility where applicable
```

### E2E tests

Add Playwright test for:

```text
open /reverse.html
enter age 49, retirement age 71, couple, $80,000 target
run planner
see current path, gap and ranked actions
change confidence target
see recalculated result
```

---

## Acceptance criteria

The work is complete when:

```text
1. /reverse.html builds and loads.
2. Webpack has a reverse entry and HTML page.
3. User can enter minimal reverse-planner inputs.
4. Reverse planner can import current forward-calculator scenario where available.
5. Solver uses RetirementSimulator rather than duplicating projection logic.
6. Bisection solver can solve at least extra super, salary, retirement age and current super balance.
7. Results are displayed in today’s dollars and nominal retirement-year dollars.
8. Planner distinguishes deterministic, Monte Carlo and stress-tested success.
9. Planner returns ranked trade-off levers when current path fails.
10. Couple/single and one-earner/equal-earner scenarios are represented.
11. Age Pension with/without comparison is shown where supported.
12. Overseas comparison includes the nine specified countries with warnings and overrideable assumptions.
13. Estate/inheritance target is included in scoring.
14. Tests are added and pass.
15. Existing forward calculator behaviour is not broken.
16. Build passes.
```

---

## Implementation sequence

### Phase 0 — Audit

```text
- Inspect simulator return shape.
- Inspect Advanced Calculator input collection and localStorage behaviour.
- Inspect existing config/policy constants.
- Confirm calculateAgePension/calculateAgePensionForCouple signatures.
- Confirm runMonteCarloSimulation and simulateRetirement signatures.
- Confirm existing chart/report utilities.
```

### Phase 1 — Solver foundation

```text
- Create reverse-solver.js.
- Implement binarySolve.
- Implement scenario adapter.
- Implement evaluateScenario.
- Implement scoreScenario.
- Add unit tests.
```

### Phase 2 — Analytical seed and simple levers

```text
- Create reverse-assumptions.js.
- Implement inflation conversion.
- Implement capital target seed.
- Implement required contribution seed.
- Implement solveForExtraSuper.
- Implement solveForRequiredSalary.
- Implement solveForRetirementAge.
- Implement solveForCurrentSuperBalance.
```

### Phase 3 — Page/UI

```text
- Create reverse.html.
- Create reverse-ui.js and reverse-planner.js.
- Add webpack entry and HtmlWebpackPlugin page.
- Add simple mode form.
- Render current path, gap and ranked results.
```

### Phase 4 — Forward/reverse integration

```text
- Add scenario export/import via localStorage.
- Add a link/button from advanced-v2 page if practical.
- Add integration tests.
```

### Phase 5 — Advanced levers

```text
- Mortgage-free solver.
- Net-rent/property solver.
- Target spending reduction solver.
- Estate/inheritance target solver.
- Household earning pattern variants.
```

### Phase 6 — Risk and worker

```text
- Add reverse-worker.js.
- Move expensive solves into worker.
- Add progress and partial results.
- Add Monte Carlo confidence solve.
- Add stress preset solve.
```

### Phase 7 — Overseas layer

```text
- Add nine-country assumptions table.
- Add cost-of-living/FX/healthcare target adjustment.
- Add Age Pension portability sensitivity.
- Add warning-heavy output.
```

### Phase 8 — Recommendations and reporting

```text
- Feed solved levers into DecisionSupportEngine or add a reverse-specific recommendation adapter.
- Add charts.
- Add export/report if existing report infrastructure allows.
- Add documentation and assumptions page section.
```

---

## Coding guardrails

```text
- Do not break existing forward calculator pages.
- Do not hard-code policy values inside the solver.
- Do not return guaranteed advice language.
- Do not hide infeasible constraints.
- Do not rank “higher assumed investment returns” as a real action.
- Do not make overseas retirement look risk-free.
- Do not ignore contribution caps.
- Do not ignore mortgage at retirement.
- Do not double-count Age Pension if using ASFA-style lump-sum benchmarks.
- Keep functions small and testable.
- Prefer adapters over modifying simulator output shape.
```

---

## Financial advice disclaimer text

Use this in the UI and report:

```text
This calculator provides general scenario modelling only. It is not personal financial, tax, legal, migration or estate-planning advice. It relies on assumptions that may be incomplete or change over time, including tax, superannuation, Age Pension, healthcare, visa, exchange-rate and investment-return assumptions. Consider professional advice before making major financial decisions.
```

---

## Final instruction to the AI coding agent

Build the Reverse Retirement Planner as a goal-seeking wrapper around the existing Australian retirement simulator. Start with robust bisection-based single-lever solving and analytical capital-target seeding. Reuse `RetirementSimulator`, config/policy modules, tax/super/Age Pension utilities and the decision-support engine. Add `/reverse.html`, a reverse solver module, scenario adapters, assumption tables, localStorage integration with the forward calculator, ranked trade-off outputs, household scenario support, mortgage/property levers, overseas retirement overlays, estate/inheritance constraints, Web Worker execution for Monte Carlo solves, and tests proving solved values fed back into the forward simulator meet the target. Keep the output useful, plain-English, transparent and honest about uncertainty.
