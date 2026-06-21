# AI Agent Prompt — Reverse Planner Parity Repair v4

## Mission

You are working on the repository:

```text
https://github.com/gagneet/retirement_calculator_au
```

Branch target: `master`.

The current `reverse.html` implementation is producing absurd results because it is not using the actual completed projection from `advanced-v2.html` / `advanced.html`. It rehydrates a partial input object, loses important fields, reruns a different simplified projection, and then applies a crude SWR calculation to the wrong asset value.

Your task is to repair the Reverse Planner so that it becomes a post-result analysis layer over the existing forward calculators.

The Reverse Planner must not independently recreate the user's current path from a damaged subset of fields. It must consume the exact completed forward projection and then calculate gaps and actions from that baseline.

---

## Current observed failure

A user ran `advanced-v2.html` and got a strong/comfortable result:

```text
Monthly retirement income: about $20,088/month
Super at retirement: about $4.6M
Projected runway: to age 94
Confidence: about 98%
```

But `reverse.html` imported the same scenario and reported:

```text
Current projected path: $10,623/year
Total assets at retirement: $465,117
Income shortfall: $69,377/year
Mortgage remains at retirement: $595,000
Confidence: 20% vs target NaN%
Super at retirement vs target: target $0
```

These reverse results are invalid. They are caused by integration and calculation bugs, not by the user's financial data.

---

## Correct product behaviour

### Advanced Calculator pages

`advanced-v2.html` and `advanced.html` are the places where users enter their full financial data and run the forward prediction.

After the forward calculation finishes, those pages must persist a complete forward projection payload for the Reverse Planner.

### Reverse Planner page

`reverse.html` must be a post-calculation analysis page. It should:

1. Load the saved forward projection.
2. Display the user's current path using the exact same values shown by the source calculator.
3. Ask only for goal controls if needed:
   - desired retirement income in today's dollars;
   - target retirement age;
   - confidence target;
   - estate/inheritance target;
   - Australia vs overseas comparison options.
4. Compare:
   - current path from the completed forward projection;
   - required path for the user's goal;
   - gap;
   - recommended action.
5. Run reverse-solver levers only after the current baseline is correct.

The Reverse Planner is wrong if its imported current-path numbers do not match the source calculator within tolerance.

---

## Do not do these things

Do not rebuild `advanced-v2.html` inside `reverse.html`.

Do not make the reverse page a second large data-entry calculator.

Do not calculate current income from a partial adapter when a completed forward projection exists.

Do not use `simResult.totalFinancialAssets * SWR` as the current path when `adaptedResult.monthlyPaycheck` or source yearly rows are available.

Do not use full Age Pension maximums as a default current income source for high-asset households. Use the forward simulator's actual pension result.

Do not mix today's dollars and nominal retirement-year dollars in the same comparison row.

---

## Root causes to fix

### 1. Advanced v2 stores only raw input

Current `advanced-v2.js` builds:

```js
engineInputs
simulation
adaptedResult
```

but only stores the raw `input` to `localStorage.rc_forward_scenario`.

This is insufficient.

### 2. Reverse adapter loses fields

`reverse-baseline-adapter.js` maps only a subset of Advanced v2 data and has known bugs.

Known bug:

```js
salarySacrifice: num(isV2 ? raw.salarySacrifice : raw.yourAdditionalSuperContribution, 0),
salarySacrifice: num(isV2 ? 0 : raw.yourAdditionalSuperContribution, 0),
```

The second line overwrites the first. For Advanced v2, salary sacrifice becomes `0`.

Also ensure Advanced v2 `partnerSuperBal` maps to canonical `partnerCurrentSuper` / `partnerSuperBalance`.

### 3. Mortgage payment mismatch

Advanced v2 reads `mortgage` and `mortgageRate`, and has a helper that can derive payment. The reverse adapter expects `monthlyMortgagePayment`, often missing, causing false warnings and false mortgage-at-retirement issues.

### 4. Current path is recalculated differently

`reverse-solver.js` currently scores a scenario by computing:

```js
const sustainableIncomeNominal = totalAssetsNominal * swr + agePensionNominal;
const sustainableIncomeToday = sustainableIncomeNominal / deflator;
```

This is not equivalent to Advanced v2's `adaptedResult.monthlyPaycheck` and produces wildly different output.

### 5. Wrong asset point

Reverse appears to use a field like `simResult.totalFinancialAssets` as if it is capital at retirement. The correct source is the completed forward projection's retirement-age row or adapted result.

### 6. Broken confidence

Reverse reads confidence target in a way that can create `NaN`, and current confidence is a deterministic binary approximation rather than the source calculator's result.

### 7. Broken super target display

A bug in problem detection refers to `gaps.requiredCapital`, which is not passed in the expected object, causing target `$0` style messages.

---

## Required implementation plan

### Phase 1 — Add a complete forward projection bridge

Create or update a shared bridge module, preferably:

```text
src/js/forward-projection-bridge.js
```

The module should export:

```js
export const FORWARD_PROJECTION_STORAGE_KEY = 'rc_forward_projection_v1';
export const LEGACY_FORWARD_SCENARIO_STORAGE_KEY = 'rc_forward_scenario';

export function buildForwardProjectionPayload({
  source,
  input,
  engineInputs,
  simulation,
  adaptedResult,
  monteCarloResults = null,
  recommendations = null,
  stressTestResults = null,
}) { ... }

export function storeForwardProjection(payload) { ... }
export function loadForwardProjection() { ... }
export function extractCurrentPathFromProjection(payload, goalOverrides = {}) { ... }
export function findRetirementYearRow(payload, retirementAge) { ... }
```

#### Required payload shape

When a forward calculator completes, store:

```js
{
  version: 1,
  source: 'advanced-v2' | 'advanced',
  savedAt: new Date().toISOString(),
  input,
  engineInputs,
  simulation,
  adaptedResult,
  yearlyData,
  summary: {
    targetAnnualIncomeToday,
    monthlyRetirementIncomeToday,
    annualRetirementIncomeToday,
    superAtRetirementToday,
    totalAssetsAtRetirement,
    otherLiquidAtRetirement,
    mortgageAtRetirement,
    agePensionAtRetirement,
    lastsUntil,
    confidence,
    incomeGapMonthly,
    incomeGapAnnual,
    retirementAge,
    currentAge,
    lifespan,
    householdType
  }
}
```

Use source values when available.

For Advanced v2, the payload should primarily use:

```js
adaptedResult.monthlyPaycheck
adaptedResult.superAtRetire
adaptedResult.lastsUntil
adaptedResult.confidence
adaptedResult.gapMonthly
simulation.yearlyData
adaptedResult.years
```

Where `simulation.yearlyData` and `adaptedResult.years` have different shapes, normalise them in the bridge.

#### Do not break legacy storage

Keep writing `rc_forward_scenario` for backward compatibility, but `reverse.html` should prefer `rc_forward_projection_v1`.

---

### Phase 2 — Update `advanced-v2.js` to store the complete projection

In `computeBaseState()`, after computing:

```js
const input = ...;
const engineInputs = ...;
const simulation = ...;
const adaptedResult = ...;
```

store a complete payload:

```js
import { buildForwardProjectionPayload, storeForwardProjection } from './forward-projection-bridge.js';

const projectionPayload = buildForwardProjectionPayload({
  source: 'advanced-v2',
  input,
  engineInputs,
  simulation,
  adaptedResult,
  monteCarloResults: APP_STATE?.monteCarloResults || null,
  recommendations: APP_STATE?.recommendations || null,
  stressTestResults: APP_STATE?.stressTestResults || null,
});

storeForwardProjection(projectionPayload);
```

Retain this legacy line only as compatibility:

```js
localStorage.setItem('rc_forward_scenario', JSON.stringify(input));
```

Do not use the legacy input-only payload as the primary source for `reverse.html`.

---

### Phase 3 — Update `advanced.html` / `app.js` similarly

When the classic advanced calculator completes, store the same projection payload.

Use source:

```js
source: 'advanced'
```

If the classic page does not have an `adaptedResult`, build an equivalent summary from its existing output fields and yearly projection.

---

### Phase 4 — Make `reverse.html` projection-first

Update `reverse-ui.js` so that initialisation works like this:

```js
const projection = loadForwardProjection();

if (projection?.summary) {
  this.forwardProjection = projection;
  this.currentPath = extractCurrentPathFromProjection(projection);
  renderProjectionImportPanel(projection);
  prefillGoalControlsFromProjection(projection);
  autoRunGapAnalysis();
} else {
  fall back to legacy rc_forward_scenario adapter;
}
```

The reverse page should not require the user to click `Use Advanced Calculator data` if a valid projection exists. It should import and show it automatically.

### Current path must come from projection summary

Use:

```js
currentAnnualIncomeToday = projection.summary.annualRetirementIncomeToday;
currentMonthlyIncomeToday = projection.summary.monthlyRetirementIncomeToday;
currentSuperAtRetirement = projection.summary.superAtRetirementToday;
currentConfidence = projection.summary.confidence;
currentLastsUntil = projection.summary.lastsUntil;
currentAgePensionAtRetirement = projection.summary.agePensionAtRetirement;
currentMortgageAtRetirement = projection.summary.mortgageAtRetirement;
```

Do not recompute these from SWR unless the projection is missing.

---

### Phase 5 — Fix current-path extraction

Implement `extractCurrentPathFromProjection(payload, goalOverrides = {})`.

It should return a canonical current path object:

```js
{
  source,
  currentAge,
  retirementAge,
  lifespan,
  householdType,
  targetAnnualIncomeToday,
  currentAnnualIncomeToday,
  currentMonthlyIncomeToday,
  sustainableIncomeToday, // alias to currentAnnualIncomeToday
  superAtRetirement,
  totalAssetsAtRetirement,
  otherLiquidAtRetirement,
  mortgageAtRetirement,
  agePensionAtRetirement,
  estateAtLifespan,
  confidence,
  lastsUntil,
  yearlyData,
  assumptions,
  meetsGoal
}
```

`meetsGoal` should be based on the goal:

```js
currentAnnualIncomeToday >= targetAnnualIncomeToday
```

and, if confidence target exists:

```js
confidence >= confidenceTarget
```

Do not set confidence to `0`, `1`, or binary deterministic values if a source confidence exists.

---

### Phase 6 — Fix comparison table unit consistency

The visible comparison table must use today's dollars.

For example:

```text
Current income today: $241,000/year
Required income today: $80,000/year
Gap: On track / surplus $161,000/year
```

Nominal retirement-year dollars may be shown as secondary text only.

Do not compare nominal required capital to today's-dollar super without labelling and conversion.

For rows:

```text
Retirement income
Super at retirement
Capital at retirement
Mortgage at retirement
Age Pension
Estate/inheritance
Confidence
```

ensure current, required and gap are using the same basis.

---

### Phase 7 — Fix gap analysis bugs

Update `reverse-gap-analysis.js`.

#### Fix super target bug

Do not use:

```js
gaps.requiredCapital * 0.6
```

unless `requiredCapital` is guaranteed in the same object.

Prefer:

```js
gaps.targetSuper
```

or compute explicitly before calling `detectProblems`.

#### Fix duplicate object keys

There are duplicate `detail` keys in multiple problem objects. Remove duplicates so the intended message is clear.

#### Fix confidence NaN

Use safe parsing:

```js
function parseConfidence(value, fallback = 0.8) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return n > 1 ? n / 100 : n;
}
```

Use source confidence from projection first.

#### Fix Age Pension reliance

Age Pension reliance must use actual projected Age Pension from source yearly row or summary, not full maximum pension.

---

### Phase 8 — Repair reverse adapter fallback

`reverse-baseline-adapter.js` is now a fallback only, but still fix it.

Required corrections:

```js
partnerCurrentSuper: num(isV2 ? raw.partnerSuperBal : raw.partnerCurrentSuper, 0),
partnerSuperBalance: num(isV2 ? raw.partnerSuperBal : raw.partnerSuperBalance, 0),
salarySacrifice: num(isV2 ? raw.salarySacrifice : raw.yourAdditionalSuperContribution, 0),
partnerSalarySacrifice: num(isV2 ? raw.partnerSalarySacrifice : raw.partnerAdditionalSuperContribution, 0),
```

Remove duplicate `salarySacrifice`.

If mortgage balance is present and monthly payment is missing, derive it from balance and rate rather than warning immediately.

```js
monthlyMortgagePayment: raw.monthlyMortgagePayment || deriveMortgagePayment(raw.mortgage, raw.mortgageRate)
```

Use safe percent normalisation for Advanced v2 fields, because v2 stores some rates as display percentages, e.g. `7.8`, not `0.078`.

---

### Phase 9 — Change reverse solver role

`ReverseRetirementSolver` may still be used to solve action levers, but it must not define the imported current path when a projection payload exists.

Refactor behaviour:

```js
if (forwardProjection exists) {
  currentPath = extractCurrentPathFromProjection(forwardProjection, target);
  // run levers from projection.engineInputs if required
} else {
  currentPath = buildCurrentPathFromInputsFallback(...);
}
```

If solving levers requires rerunning the simulator, use `projection.engineInputs` as the base, not the lossy adapter object.

---

### Phase 10 — Add parity tests

Add tests before considering this fixed.

#### Unit test: bridge stores/extracts Advanced v2 result

Create:

```text
tests/unit/forward-projection-bridge.test.js
```

Test:

```js
const payload = buildForwardProjectionPayload({
  source: 'advanced-v2',
  input: { age: 49, retireAge: 71, desiredIncome: 80000, household: 'couple' },
  engineInputs: { yourCurrentAge: 49, retirementAge: 71 },
  simulation: {
    yearlyData: [
      { age: 71, accumulatedSuperBalance: 4600000, totalFinancialAssets: 5476000, pensionIncome: 0 }
    ]
  },
  adaptedResult: {
    monthlyPaycheck: 20088,
    superAtRetire: 4600000,
    lastsUntil: 94,
    confidence: 0.98,
    gapMonthly: 0
  }
});

const currentPath = extractCurrentPathFromProjection(payload);
expect(currentPath.currentAnnualIncomeToday).toBeCloseTo(241056, -1);
expect(currentPath.superAtRetirement).toBeCloseTo(4600000, -2);
expect(currentPath.confidence).toBeCloseTo(0.98, 2);
expect(currentPath.agePensionAtRetirement).toBe(0);
```

#### Unit test: reverse current path parity

Create/update:

```text
tests/unit/reverse-projection-parity.test.js
```

Test that reverse current path equals projection summary, not SWR result.

#### Unit test: adapter bug fixes

Update:

```text
tests/unit/reverse-baseline-adapter.test.js
```

Verify:

```js
raw.salarySacrifice = 15000
raw.partnerSuperBal = 300000
```

import correctly.

#### Integration test: Advanced v2 to reverse bridge

Create/update:

```text
tests/integration/reverse-forward-bridge.test.js
```

Simulate an Advanced v2 payload and verify reverse display model shows the same values.

#### E2E / Playwright test

Create or update:

```text
tests/e2e/reverse-planner-parity.spec.js
```

Scenario:

1. Navigate to `advanced-v2.html`.
2. Fill/load a strong scenario.
3. Run the calculation.
4. Click/open Reverse Planner.
5. Assert reverse current path is not `$10,623/year`.
6. Assert it matches Advanced v2 monthly/annual retirement income within tolerance.
7. Assert confidence is not `NaN`.
8. Assert Age Pension is not full pension for high-asset scenario if source projection says `$0`.
9. Assert super target is not `$0` unless explicitly justified.

---

## Required acceptance criteria

The fix is complete only when all are true:

1. `advanced-v2.html` stores a complete `rc_forward_projection_v1` payload after every core calculation.
2. `advanced.html` stores a compatible payload after calculation.
3. `reverse.html` prefers `rc_forward_projection_v1` over legacy `rc_forward_scenario`.
4. Reverse current path matches source calculator values within tolerance:
   - monthly retirement income;
   - annual retirement income;
   - super at retirement;
   - confidence;
   - retirement age;
   - lifespan/runway;
   - Age Pension at retirement.
5. Reverse no longer reports a shortfall when Advanced v2 is clearly on track.
6. Reverse does not show `NaN%` anywhere.
7. Reverse does not show target super as `$0` unless the actual target is zero and labelled accordingly.
8. Reverse does not assume full Age Pension when the source projection shows no pension.
9. Mortgage warnings are based on actual projected mortgage status or derived payment, not merely missing monthly payment.
10. All new and existing Jest tests pass.
11. E2E parity test passes.

---

## Implementation notes

### Recommended current-path extraction logic

```js
function extractCurrentPathFromProjection(payload, goalOverrides = {}) {
  const input = payload.input || {};
  const summary = payload.summary || {};
  const retirementAge = goalOverrides.retirementAge || summary.retirementAge || input.retireAge || input.retirementAge;
  const targetAnnualIncomeToday = goalOverrides.targetAnnualIncomeToday || summary.targetAnnualIncomeToday || input.desiredIncome || input.asfaComfortable || 0;
  const confidenceTarget = goalOverrides.confidenceTarget ?? 0.8;

  const retirementRow = findRetirementYearRow(payload, retirementAge);

  const monthly = summary.monthlyRetirementIncomeToday
    ?? payload.adaptedResult?.monthlyPaycheck
    ?? 0;

  const annual = summary.annualRetirementIncomeToday
    ?? monthly * 12;

  const confidence = Number.isFinite(summary.confidence)
    ? summary.confidence
    : Number.isFinite(payload.adaptedResult?.confidence)
      ? payload.adaptedResult.confidence
      : null;

  return {
    source: payload.source,
    currentAge: summary.currentAge ?? input.age ?? input.yourCurrentAge,
    retirementAge,
    lifespan: summary.lifespan ?? input.lifespan ?? input.yourLifespan,
    householdType: summary.householdType ?? input.household ?? (input.isCouple ? 'couple' : 'single'),
    targetAnnualIncomeToday,
    currentMonthlyIncomeToday: monthly,
    currentAnnualIncomeToday: annual,
    sustainableIncomeToday: annual,
    superAtRetirement: summary.superAtRetirementToday ?? payload.adaptedResult?.superAtRetire ?? retirementRow?.super ?? retirementRow?.accumulatedSuperBalance ?? 0,
    totalAssetsAtRetirement: summary.totalAssetsAtRetirement ?? retirementRow?.totalAssets ?? retirementRow?.totalFinancialAssets ?? 0,
    otherLiquidAtRetirement: summary.otherLiquidAtRetirement ?? retirementRow?.otherLiquid ?? 0,
    mortgageAtRetirement: summary.mortgageAtRetirement ?? retirementRow?.mortgageBalance ?? 0,
    agePensionAtRetirement: summary.agePensionAtRetirement ?? retirementRow?.pensionIncome ?? retirementRow?.pension ?? 0,
    estateAtLifespan: summary.estateAtLifespan ?? payload.simulation?.finalBalance ?? 0,
    confidence,
    lastsUntil: summary.lastsUntil ?? payload.adaptedResult?.lastsUntil,
    yearlyData: payload.yearlyData || payload.simulation?.yearlyData || payload.adaptedResult?.years || [],
    meetsGoal: annual >= targetAnnualIncomeToday && (confidence === null || confidence >= confidenceTarget),
  };
}
```

Adjust field names to actual repo data structures after inspecting the files.

---

## Validation checklist for the known failing scenario

Use the scenario from the user's screenshots as the regression reference.

The reverse page should show approximately:

```text
Current path income: about $20,088/month or $241,056/year
Target: $80,000/year
Income gap: On track / surplus, not shortfall
Super at retirement: about $4.6M, not $351k or $465k
Confidence: about 98%, not 20% or NaN
Age Pension: $0 if source projection says $0
Mortgage at retirement: use source projected value, not raw current mortgage by default
```

If the user changes target retirement income or retirement age on `reverse.html`, then recompute the gap and action plan, but keep the imported projection as the baseline unless the change requires a fresh simulator run.

---

## Final deliverables

1. Code changes implementing projection-first reverse planner parity.
2. `forward-projection-bridge.js` or equivalent shared bridge module.
3. Updates to `advanced-v2.js` and `app.js` to persist complete projection payloads.
4. Updates to `reverse-ui.js`, `reverse-planner.js`, `reverse-gap-analysis.js`, and `reverse-baseline-adapter.js`.
5. Unit tests and integration/e2e tests listed above.
6. No misleading reverse shortfall for scenarios that Advanced v2 reports as on track.

---

## Final instruction

Before making UI enhancements, make the numbers correct.

The first implementation milestone is parity:

```text
Reverse current path === Advanced Calculator current path
```

Only after parity passes should the reverse solver rank actions or show overseas comparisons.
