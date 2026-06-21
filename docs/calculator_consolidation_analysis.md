# Calculator Consolidation Analysis

## Scope

This document summarises the analysis of the calculator architecture across:

- classic advanced calculator: `advanced.html` / `src/js/app.js`
- advanced-v2 calculator: `advanced-v2.html` / `src/js/advanced-v2.js`
- reverse calculator: `reverse.html` / `src/js/reverse-ui.js`, `src/js/reverse-planner.js`, `src/js/reverse-solver.js`

The purpose is to identify why the calculators can produce inconsistent results, why some values appear to be discarded, and how to consolidate the system so projections become reliable.

---

## Executive Summary

The current application has a shared simulation engine, but the calculators still behave like separate applications because each has its own input-reading, input-normalisation, defaulting, and projection orchestration logic.

This creates three major risks:

1. The same UI concept can be interpreted differently by different calculators.
2. The same household can produce different results in advanced, advanced-v2, and reverse.
3. Some real-world cashflow values, especially monthly surplus, can disappear from the accumulation model.

The most important confirmed issue is in advanced-v2: detailed household expenses and surplus are not consistently mapped into the simulator. If a user earns `$20,000/month`, spends `$7,000/month`, and therefore has `$13,000/month` available, that surplus is not reliably allocated to investments, savings, super, or mortgage reduction unless separately entered as an explicit investment contribution.

This must be fixed before the projections can be considered trustworthy.

---

## Current Architecture

The webpack entry points indicate three separate calculator bundles:

```text
main        -> src/js/app.js
advancedV2  -> src/js/advanced-v2.js
reverseV1   -> src/js/reverse-ui.js
```

This is not inherently wrong, but each bundle currently owns too much calculation orchestration.

The desired structure should be:

```text
calculator UI bundle
  -> UI adapter only
  -> shared canonical input schema
  -> shared normalisation
  -> shared cashflow derivation
  -> shared projection service
  -> shared simulator
  -> shared result summaries
```

Instead, the current system has several overlapping paths:

```text
advanced-v2.js
  -> readInputs()
  -> buildEngineInputs()
  -> runEngine()
  -> computeBaseState()
  -> syncAppState()

reverse-planner.js
  -> normaliseReversePlannerInputs()
  -> create scenario inputs
  -> run reverse solver

simulator.js
  -> normaliseInputsForSimulation()
  -> accumulation/retirement simulation

policy/normalise-inputs.js
  -> intended shared normalisation layer
```

The presence of `policy/normalise-inputs.js` is important because it appears to be intended as a canonical normalisation module. The next refactor should build around it rather than adding yet another normaliser.

---

## Finding 1: Advanced-v2 Can Discard Household Surplus

### Symptom

The user enters current income and expenses, but the projection depletes assets too quickly or ignores accumulation before retirement.

Example:

```text
Monthly income:  $20,000
Monthly spend:   $7,000
Monthly surplus: $13,000
```

Expected:

```text
$13,000/month should be allocated to some asset bucket or explicitly flagged as unallocated.
```

Possible current behaviour:

```text
Only explicit monthly stock contribution or percent-income-saved is modelled.
The remaining income/spend difference is not carried forward.
```

### Why this happens

Advanced-v2 builds simulator inputs directly and sets detailed spending fields to disabled/zero. It derives savings from explicit investment contribution rather than household cashflow surplus.

The simulator then has no reliable way to know that household surplus exists.

### Required correction

Advanced-v2 must pass a derived cashflow model into the simulator.

The simulator must receive either:

```js
useDetailedExpenseInputs: true,
currentMonthlyHousingCosts,
currentMonthlyLivingCosts,
currentMonthlyHealthcareCosts,
monthlyStockContribution,
additionalCashSavingsMonthly,
extraMortgageRepaymentMonthly,
surplusAllocationMode
```

or a more general canonical cashflow object.

The important rule is:

> No surplus dollar should vanish. It must be allocated or warned.

---

## Finding 2: Duplicate Normalisation Creates Divergence

### Problem

Percentages, defaults, pension toggles, investment returns, retirement income, and household inputs can be converted in more than one place.

Examples of duplicated concerns:

- converting percentage values from UI to decimals
- defaulting inflation and return assumptions
- setting Age Pension assumptions
- mapping homeowner/renter status
- mapping expenses
- mapping partner fields
- mapping investment property values

### Risk

If advanced-v2 changes an assumption but reverse does not, or if reverse applies a fallback default different from advanced, the same scenario can return different answers.

### Required correction

Create one canonical schema and force every calculator through it.

The UI files should only do this:

```js
const rawUiInput = readUiFields();
const projection = ProjectionService.computeProjection(rawUiInput, {
  sourceCalculator: 'advanced-v2'
});
renderResults(projection);
```

The UI files should not own tax, pension, contribution, cashflow, or retirement projection assumptions.

---

## Finding 3: Reverse Planner Has an Undefined Variable Bug

### Problem

`ReversePlanner.buildCurrentPath()` contains a reference similar to:

```js
g.normalizedValue = totalAchieved > 0 ? g.achievedValue / totalAchieved : 0;
```

`g` and `totalAchieved` are not defined in that scope.

### Impact

Reverse manual mode or fallback mode can crash before returning useful results.

### Required correction

Remove the line or move the intended normalisation into the actual gap-analysis function where the gap object exists.

Add a regression test:

```text
Clear forward projection from localStorage.
Open reverse calculator.
Enter manual target.
Run calculation.
Expected: no undefined variable error.
```

---

## Finding 4: Reverse Imports Projection Data but Still Needs a Single Source of Truth

### Current behaviour

Reverse can import a richer forward projection from advanced/advanced-v2, and it can also fall back to older localStorage scenarios or manual form inputs.

This is useful, but it must be controlled.

### Risk

The screen may show a current-path result from one source while required-value cards or levers are calculated from another source.

### Required correction

Every reverse calculation should use one projection object:

```js
{
  inputHash,
  policyVersion,
  canonicalInput,
  derivedCashflow,
  engineInputs,
  simulation,
  adaptedResult,
  yearlyData,
  summary,
  diagnostics,
  warnings
}
```

If imported projection data is missing, stale, or schema-incompatible, recompute it through `ProjectionService` and generate a new input hash.

---

## Finding 5: The Reverse Baseline Adapter Is Only a Legacy Fallback

The reverse baseline adapter maps only a subset of fields from old advanced results.

It is useful for backward compatibility, but should not be the primary data path for current advanced-v2 projections.

The primary bridge should carry complete data:

```text
canonical input
engine inputs
derived cashflow
simulation result
yearly data
summary
recommendations
stress results
Monte Carlo result if already available
assumptions
input hash
policy version
```

---

## Target Architecture

Create this shared structure:

```text
src/js/calculation/
  canonical-input-schema.js
  input-adapters/
    advanced-classic-adapter.js
    advanced-v2-adapter.js
    reverse-manual-adapter.js
  household-cashflow-engine.js
  projection-service.js
  projection-cache.js
  reverse-scenario-engine.js
```

### Responsibilities

#### UI adapters

Only read UI fields and map them to canonical input names.

They should not perform major calculations.

#### Canonical input schema

Defines the one accepted shape for all household, asset, income, cashflow, property, pension, and scenario inputs.

#### Household cashflow engine

Calculates:

```text
gross income
estimated tax
post-tax income
current spending
explicit saving/investment/super contributions
mortgage payments
available surplus
surplus allocation
warnings
```

#### Projection service

Runs the complete projection once and returns one result object.

#### Projection cache

Avoids repeated deterministic calculation for the same input hash.

#### Reverse scenario engine

Builds and solves scenario combinations using the shared projection service.

---

## Recommended Migration Plan

### Phase 1: Safety Fixes

1. Fix reverse undefined-variable bug.
2. Add surplus-discard regression test.
3. Add reverse manual-mode smoke test.
4. Add basic projection parity fixture.

### Phase 2: Canonical Input and Cashflow

1. Create canonical input schema.
2. Create advanced-v2 adapter.
3. Create household cashflow engine.
4. Change advanced-v2 to derive and pass household surplus.
5. Add warnings for unallocated surplus.

### Phase 3: Projection Service

1. Create `ProjectionService.computeProjection()`.
2. Move advanced-v2 deterministic run through it.
3. Store complete projection object with input hash.
4. Attach adapted result and summaries to projection object.

### Phase 4: Classic Advanced Parity

1. Create classic advanced adapter.
2. Move classic advanced through projection service.
3. Compare classic and advanced-v2 using canonical fixtures.

### Phase 5: Reverse Consolidation

1. Create reverse manual adapter.
2. Make reverse consume projection service.
3. Keep legacy baseline adapter only as fallback.
4. Ensure all reverse cards/charts/levers/PDF use one projection hash.

### Phase 6: Scenario Builder

1. Add UI section above existing reverse output.
2. Add scenario toggles.
3. Implement scenario engine.
4. Display required assets, salary, monthly surplus, super, investment property and pension contribution.
5. Add scenario results to PDF.

---

## Scenario Builder Design

### Purpose

The new reverse top section should support users who do not know their current detailed financial position.

It should answer:

```text
I am age X, my partner is age Y, and we want $Z/year after tax in retirement.
What do we need today?
```

### Minimum inputs

```text
Household type
Current age
Partner age
Retirement age
Target income today
Confidence target
Living situation
Funding-source toggles
```

### Output

Each scenario should show:

```text
Required current super
Required current non-super investments
Required current salary
Required monthly surplus
Required annual salary sacrifice
Required property equity or rental income
Age Pension contribution
Assets at retirement
Estate at lifespan
Warnings
```

### Example scenario set

For a couple aged 49 and 47 targeting `$84,000/year`:

```text
1. Own home + super + Age Pension + no investment property
2. Own home + super + no Age Pension
3. Renting/no home + super + Age Pension
4. Own home + non-super investments only
5. Own home + investment property retained
6. Own home + investment property sold at retirement
7. No current assets, required salary/savings path only
8. Aged-care-adjusted scenario
9. Conservative return / high inflation stress scenario
```

---

## Calculation Correctness Principles

Use these as engineering guardrails.

### 1. One household, one projection

A given household input should produce one canonical projection object. UI sections should not recompute their own results differently.

### 2. No disappearing money

All income must be accounted for:

```text
income -> tax -> spending -> explicit contributions -> surplus -> allocation/warning
```

### 3. UI labels must match calculation meaning

If a field says “monthly spending”, it must be treated as spending, not ignored or overwritten.

If a field says “desired retirement income after tax”, the engine must not treat it as pre-tax income unless explicitly converted and labelled.

### 4. Defaults must be visible

If the app assumes inflation, investment return, pension eligibility, home ownership, or surplus allocation, those assumptions should be shown in diagnostics or assumptions summary.

### 5. Reverse should not duplicate forward maths

Reverse should use forward projection repeatedly with changed inputs. It should not reimplement tax, pension, drawdown, super, or investment growth logic.

---

## Test Plan

### Unit tests

```text
canonical input mapping
percentage normalisation
cashflow derivation
surplus allocation
projection input hashing
reverse scenario construction
```

### Regression tests

```text
$20k income / $7k spend / $13k surplus does not disappear
advanced and advanced-v2 parity on canonical fixture
reverse manual mode no undefined variable crash
reverse imported projection uses one input hash
PDF uses displayed scenario results
```

### Scenario tests

```text
Age Pension on/off changes required private assets
homeowner/renter changes thresholds and spending
super on/off changes required non-super assets
investment property retained/sold changes outcome
aged care on/off changes late-life spending and estate
```

### UI smoke tests

```text
advanced.html still calculates
advanced-v2.html still calculates
reverse.html imports forward result
reverse.html works without forward result
PDF exports successfully
scenario builder renders result table
```

---

## Implementation Warnings

Do not solve this by adding more patched calculations inside `advanced-v2.js` or `reverse-ui.js`.

That would make the inconsistency worse.

The core fix is architectural:

```text
shared canonical input
shared cashflow
shared projection service
shared reverse scenario engine
```

Once this is in place, the UI can evolve safely.

---

## Definition of Done

The consolidation is complete when:

- Advanced, advanced-v2, and reverse use one projection pipeline.
- The `$13,000/month` surplus example is correctly handled.
- Reverse scenario builder can answer the `$84,000/year` couple target question.
- Reverse manual mode no longer crashes.
- PDF export includes the scenario builder.
- A change in one assumption affects all calculators consistently.
- Regression tests cover the previously observed defects.
