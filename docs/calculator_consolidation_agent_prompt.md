# Agent Prompt: Consolidate Advanced, Advanced-v2, and Reverse Retirement Calculator Logic

## Role

You are a senior retirement-calculation engineer and frontend refactoring agent working on the `gagneet/retirement_calculator_au` repository.

Your task is to consolidate the calculation logic across:

- `advanced.html`
- `advanced-v2.html`
- `reverse.html`

The goal is to make all three calculators use one shared calculation pipeline, one canonical input schema, one cashflow model, and one projection service.

Do **not** remove the current UI or existing reverse planner behaviour unless a section is provably broken. Preserve existing functionality and add the new scenario-builder capability on top.

---

## Primary Objective

Refactor the retirement calculator so that `advanced`, `advanced-v2`, and `reverse` no longer run siloed calculations or duplicate similar logic.

All calculators must follow this pipeline:

```text
UI form
  -> UI-specific adapter
  -> CanonicalInput
  -> shared input normalisation
  -> household cashflow engine
  -> canonical EngineInputs
  -> ProjectionService.computeProjection()
  -> RetirementSimulator.simulateRetirement()
  -> shared result summary / charts / reverse planner / PDF
```

The reverse calculator must also gain a new top-level section:

```text
Scenario Builder: What do we need today?
```

This section should answer questions such as:

> As a couple aged 49 and 47, wanting to retire at 67 on $84,000/year after tax in today’s dollars, what salary, superannuation, savings, investments, property, pension, and monthly surplus do we need today?

It must support toggles for:

- Superannuation included/excluded
- Age Pension included/excluded
- Own home / own home with mortgage / renting / no home
- Non-super investments included/excluded
- Investment property retained/sold/excluded
- Downsizing included/excluded
- Aged care included/excluded
- Overseas retirement included/excluded
- Confidence target

---

## Known Defects and Risks to Fix

### 1. Advanced-v2 discards household surplus

There is a serious modelling problem in advanced-v2.

The current advanced-v2 mapping sets or behaves like:

```js
useDetailedExpenseInputs: false,
currentMonthlyHousingCosts: 0,
currentMonthlyLivingCosts: 0,
```

It also derives savings largely from explicit `monthlyStockContribution` / `percentIncomeSaved`.

This means a household with:

```text
Income: $20,000/month
Spending: $7,000/month
Surplus: $13,000/month
```

may not have the $13,000/month surplus automatically carried into cash, investments, mortgage offset, super, or any other asset bucket. The surplus can effectively disappear from the accumulation model.

This must be fixed before projections can be trusted.

Expected behaviour:

```text
post-tax household income
minus current spending
minus mortgage repayments
minus explicit investment/super contributions
= available surplus
```

Then allocate available surplus according to a defined strategy:

```text
Default: surplus to cash/non-super savings
Optional: auto-invest surplus
Optional: mortgage-first, then invest
Optional: super-first up to concessional cap, then invest/cash
Optional: custom split
```

### 2. Multiple input normalisation paths

The codebase has several normalisation paths. This causes inconsistent assumptions across calculators.

Consolidate all normalisation into one shared pathway. The existing `src/js/policy/normalise-inputs.js` should be treated as the starting point for canonical normalisation, unless a better shared module already exists.

Do not keep separate hidden conversions for:

- percentages
- inflation
- investment returns
- wage growth
- super contribution rates
- retirement spending
- Age Pension settings
- property assumptions
- expense inputs

### 3. Reverse planner has a runtime bug

Find and fix the undefined reference in reverse planner logic:

```js
g.normalizedValue = totalAchieved > 0 ? g.achievedValue / totalAchieved : 0;
```

`g` and `totalAchieved` are not defined in that scope. Remove this line or move the intended normalisation into the actual gap-analysis code where the relevant objects exist.

### 4. Reverse uses mixed projection sources

Reverse currently imports data from advanced/advanced-v2 and may also recompute or fallback through manual inputs. Ensure all reverse outputs use a single projection object and input hash.

The following must all derive from the same projection state:

- current path
- required value cards
- action levers
- scenario-builder table
- charts
- PDF export
- warnings and assumptions

### 5. Legacy baseline adapter is incomplete

The reverse baseline adapter maps only a subset of the forward calculator fields. Preserve it only as a legacy fallback.

For current advanced-v2 and advanced projections, use a complete projection bridge that carries:

- canonical inputs
- engine inputs
- simulation output
- adapted result
- yearly data
- summary
- assumptions
- policy version
- input hash
- warnings/diagnostics

---

## Required New Shared Modules

Create or refactor toward this structure:

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

Use existing modules where suitable. Do not duplicate mature simulator, tax, pension, or policy code if it already exists.

---

## Canonical Input Schema

Create a canonical input object that all calculators use.

Minimum required fields:

```js
{
  schemaVersion: 'calculator-input-v1',

  household: {
    householdType: 'single' | 'couple',
    currentAge: number,
    partnerAge: number | null,
    retirementAge: number,
    partnerRetirementAge: number | null,
    lifespan: number,
    partnerLifespan: number | null
  },

  income: {
    annualSalary: number,
    partnerAnnualSalary: number,
    salaryIncomeMode: 'gross' | 'net',
    partnerSalaryIncomeMode: 'gross' | 'net',
    businessIncome: number,
    investmentIncomeOutsideSuper: number
  },

  currentAssets: {
    currentSuperBalance: number,
    partnerCurrentSuperBalance: number,
    cashSavings: number,
    stocksPortfolio: number,
    homeValue: number,
    mortgageBalance: number,
    investmentPropertyValue: number,
    investmentPropertyLoan: number
  },

  cashflow: {
    currentMonthlyIncome: number,
    currentMonthlyHousingCosts: number,
    currentMonthlyLivingCosts: number,
    currentMonthlyHealthcareCosts: number,
    currentMonthlyTotalSpend: number,
    currentMonthlySurplus: number,
    explicitMonthlyInvestmentContribution: number,
    explicitAnnualSalarySacrifice: number,
    surplusAllocationMode: 'cash' | 'invest' | 'mortgage_first' | 'super_first' | 'custom_split',
    surplusToCashMonthly: number,
    surplusToStocksMonthly: number,
    surplusToSuperAnnual: number,
    surplusToMortgageMonthly: number
  },

  retirementTarget: {
    targetAnnualIncomeToday: number,
    targetIncomeTaxBasis: 'after_tax_today_dollars',
    confidenceTarget: number,
    minimumEstateToday: number
  },

  housingAndPension: {
    primaryResidenceType: 'own_home' | 'own_home_with_mortgage' | 'renting' | 'no_home' | 'aged_care',
    homeowner: boolean,
    primaryRentMonthly: number,
    includeAgePension: boolean,
    pensionAssetThreshold: number | null,
    pensionAssetCutoff: number | null,
    pensionIncomeThreshold: number | null
  },

  scenarioToggles: {
    includeSuper: boolean,
    includeNonSuperInvestments: boolean,
    includeInvestmentProperty: boolean,
    sellInvestmentPropertyAtRetirement: boolean,
    includeDownsizing: boolean,
    includeAgedCare: boolean,
    includeOverseasRetirement: boolean
  },

  assumptions: {
    inflationRate: number,
    wageGrowthRate: number,
    superReturnRate: number,
    investmentReturnRate: number,
    propertyGrowthRate: number,
    retirementDrawdownRate: number
  }
}
```

Extend as needed, but do not create conflicting field names for the same concept.

---

## Household Cashflow Engine

Implement:

```js
function deriveHouseholdCashflow(canonicalInput) {
  // return derived cashflow and allocations
}
```

It must calculate:

```text
gross household income
estimated tax
post-tax income
current annual spending
current mortgage repayment assumptions
explicit super contributions
explicit investment contributions
annual surplus
monthly surplus
allocated surplus
unallocated surplus warnings
```

Important rule:

> A dollar of household surplus must never disappear. It must either be allocated to cash, investments, super, mortgage repayment, or explicitly shown as unallocated with a warning.

Default allocation:

```text
If detailed expenses are provided:
  surplus goes to cash/non-super savings by default.

If explicit monthly investment contribution is provided:
  that amount goes to investments.

If user selects auto-invest:
  surplus goes to investments.

If user selects mortgage-first:
  surplus goes to mortgage until paid off, then to investments/cash.

If user selects super-first:
  allocate up to concessional cap, then investments/cash.
```

---

## Projection Service

Create:

```js
class ProjectionService {
  computeProjection(rawInput, options = {}) {
    // returns complete projection object
  }
}
```

Return shape:

```js
{
  inputHash,
  policyVersion,
  schemaVersion,
  sourceCalculator: 'advanced' | 'advanced-v2' | 'reverse-manual' | 'reverse-scenario',
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

Requirements:

- Normalise once.
- Build engine inputs once.
- Run deterministic simulation once for the same input hash.
- Cache projection results by input hash.
- Allow Monte Carlo and stress tests to be attached but not recomputed unnecessarily.
- Return warnings for missing, inconsistent, or discarded values.

---

## Reverse Scenario Builder

Add a new top section to `reverse.html` and wire it from `reverse-ui.js`.

Section title:

```text
Scenario Builder: What do we need today?
```

Purpose:

```text
Allow users with little or no existing asset detail to estimate what they need today to reach a retirement-income target.
```

Inputs:

```text
Household type
Current age
Partner age
Retirement age
Desired after-tax retirement income in today’s dollars
Confidence target
Lifespan
Home status
Include Super
Include Age Pension
Include Non-super Investments
Include Investment Property
Sell Investment Property at Retirement
Include Downsizing
Include Aged Care
Include Overseas Retirement
```

Output table/cards:

```text
Scenario name
Required current super
Required current non-super investments
Required current gross salary
Required monthly surplus
Required annual salary sacrifice
Required investment property equity/rental income
Expected Age Pension contribution
Expected assets at retirement
Expected estate at lifespan
Warnings
```

Example scenarios for a couple aged 49 and 47 targeting $84,000/year:

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

Do not remove existing reverse planner results. Add this scenario builder above the current implementation.

---

## Reverse Solver Requirements

The reverse solver should support:

### Single-lever solves

```text
required current super
required current non-super investment balance
required current salary
required monthly savings/surplus
required retirement age delay
required annual salary sacrifice
```

### Combined-lever solves

```text
salary + monthly savings
salary sacrifice + non-super investments
mortgage-first then invest
investment property retained
investment property sold at retirement
Age Pension included/excluded
super included/excluded
homeowner vs renter/no-home
aged-care adjusted
```

Use binary search or monotonic solve where appropriate. If a target is impossible or non-monotonic, show a clear warning instead of a misleading number.

---

## PDF Export Requirements

Update reverse PDF export to include:

```text
Scenario Builder summary
Selected assumptions
Target income
Household profile
Scenario comparison table
Required salary/assets/monthly surplus
Age Pension assumptions
Property assumptions
Aged care assumptions if enabled
Warnings and limitations
Existing reverse planner output
```

The PDF must use the same projection/scenario results displayed on screen.

---

## Regression Tests

Add or update tests for the following.

### 1. Monthly surplus regression

Fixture:

```text
Household monthly income: $20,000
Current monthly spending: $7,000
Expected monthly surplus: $13,000
```

Expected:

```text
The $13,000/month surplus must be allocated or explicitly warned as unallocated.
It must not disappear from the accumulation path.
```

### 2. Advanced and advanced-v2 parity

Same canonical input fixture should produce the same engine inputs and deterministic projection within a small tolerance.

### 3. Reverse manual mode no crash

Clear forward projection from localStorage. Run reverse manual mode. It must not throw `g is not defined` or any undefined variable error.

### 4. Reverse imported projection consistency

Forward projection imported from advanced-v2 must produce a single input hash. Current path, levers, charts, scenario builder, and PDF must reference the same projection hash.

### 5. Scenario toggle behaviour

Verify that:

```text
Age Pension on/off changes required private capital.
Homeowner/renter changes thresholds and housing costs.
Super included/excluded changes required non-super assets.
Investment property retained/sold changes retirement assets and retirement income.
Aged care included/excluded changes late-life cashflow and estate value.
```

### 6. Projection cache

Same input hash should not recompute deterministic projection. Changed input must invalidate cache.

---

## Acceptance Criteria

The task is complete when:

- All three calculators use one canonical input schema.
- All three calculators use one projection service.
- No calculator independently duplicates pension, tax, savings, contribution, or projection logic.
- Advanced-v2 no longer discards monthly surplus.
- Reverse works with:
  - imported advanced projection,
  - imported advanced-v2 projection,
  - no imported projection/manual mode,
  - no-current-assets scenario mode.
- Reverse scenario builder answers the `$84,000/year` couple example with required salary/assets/savings values.
- Reverse PDF export includes the scenario-builder output.
- Regression tests cover the surplus-discard bug and calculator parity.
- Warnings are shown for missing inputs, impossible scenarios, or unallocated surplus.

---

## Implementation Notes

Keep changes incremental:

1. Add canonical schema and adapters.
2. Add household cashflow engine.
3. Add projection service and cache.
4. Move advanced-v2 to projection service.
5. Move classic advanced to projection service.
6. Move reverse to projection service.
7. Fix reverse undefined-variable bug.
8. Add scenario builder.
9. Update PDF export.
10. Add regression tests.

Prefer small, testable commits. Do not rewrite the entire UI before calculation correctness is fixed.
