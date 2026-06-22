# Post-Fix Verification Audit: Advanced, Advanced-v2, Reverse Planner, Overseas Logic, and PDF Outputs

**Date:** 2026-06-22  
**Repository:** `gagneet/retirement_calculator_au`  
**Primary evidence reviewed:**

- `docs/issues_and_gap_analysis_overseas_super.md`
- `docs/load_data_advanced-v2.json` equivalent uploaded as `retirement-inputs-advanced-v2-2026-06-21T12-06.json`
- Uploaded `retirement-inputs-2026-06-22T00-01.json`
- Uploaded PDF reports:
  - `Australian-Retirement-Analysis-2026-06-21.pdf`
  - `Australian-Retirement-Analysis-2026-06-22.pdf`
  - `retirement-reverse-planner-report.pdf`
- Current live code in:
  - `src/js/advanced-v2.js`
  - `src/js/reverse-planner.js`
  - `src/js/reverse-solver.js`
  - `src/js/reverse-ui.js`
  - `src/js/forward-projection-bridge.js`
  - `src/js/calculation/*`
  - `src/js/country-profiles.js`
  - `src/js/overseas-retirement.js`
  - `src/js/simulator.js`

This report is a code and output verification audit. It is not personal financial advice and does not validate that any specific retirement decision is safe.

---

## 1. Executive summary

The recent implementation has fixed several of the structural issues identified in the earlier audit, but the calculators are **not yet reliable enough to use for a retirement-age decision**.

The most important result is this:

> The **advanced-v2 cashflow/surplus fix is partly implemented correctly**, but the **reverse planner and PDF export are still presenting stale, mixed, or mislabelled values**.

The code now has a shared `ProjectionService`, an `advanced-v2` canonical adapter, a household cashflow engine, and a canonical engine adapter. That is the right direction. The simulator also now accepts `annualCashSavingsContribution`, which means surplus can flow into cash savings rather than disappearing.

However, the latest uploaded reverse PDF still shows clear evidence that the reverse report is using the wrong display path or stale projection summary:

- It reports **current sustainable income of $278,636/year**, which is still effectively a 4%-capacity style number, not the actual Year-1 planned spending requirement.
- It shows the household as **Single**, age **50**, salary **$0**, super **$0**, cash **$0**, while the scenario builder table on the same report uses the imported advanced-v2 values such as salary **$235,158**, super **$336,330**, and cash **$65,000**.
- The scenario builder is present, but many rows show the same "no change needed" output, indicating the display layer and/or solver target still needs better scenario isolation and validation.

The advanced PDF has improved from the earlier report in some areas, but it still has serious output quality problems:

- The 2026-06-22 advanced PDF shows **Overseas Retirement Scenarios** as repeated `N/A` rows even though the uploaded JSON has `goingOverseas: true` and destination Portugal.
- Monte Carlo median and chart outputs are still suspiciously large relative to the deterministic result.
- AI recommendations are included, but some are duplicated, truncated, missing confidence, or detached from the scenario assumptions that generated them.
- Several tables are not decision-grade because they do not show whether figures are nominal, today-dollar, SWR capacity, planned spending, or actual engine drawdown.

---

## 2. What appears fixed

### 2.1 Advanced-v2 now uses the shared projection service

`advanced-v2.js` now constructs a `ProjectionService` with:

- `adaptAdvancedV2Input`
- `applyCanonicalCashflowToEngineInputs`
- `buildEngineInputs`
- `adaptEngineOutput`

This is a correct structural move. It reduces the risk of `advanced-v2` running its own siloed calculation path.

**Evidence in code:** `src/js/advanced-v2.js` lines 48-66.

### 2.2 Advanced-v2 input reading now captures detailed cashflow fields

`readInputs()` now reads:

- `useDetailedCashflow`
- `currentMonthlyIncome`
- `currentMonthlyLivingCosts`
- `surplusAllocationMode`
- `monthlyStockContrib`
- salary sacrifice fields

**Evidence in code:** `src/js/advanced-v2.js` input block around income and savings.

This directly addresses the earlier issue where current household spend and surplus were not consistently carried into the engine.

### 2.3 Household surplus now has a proper derivation layer

`deriveHouseholdCashflow()` now calculates:

- gross household income
- estimated post-tax income
- current annual spending
- mortgage repayments
- explicit investment contributions
- annual surplus
- allocation to cash, stocks, super, or mortgage

The default surplus mode is cash, which is a safe default because it prevents unallocated surplus from disappearing.

**Evidence in code:** `src/js/calculation/household-cashflow-engine.js`.

### 2.4 The simulator now recognises `annualCashSavingsContribution`

The simulator pre-retirement accumulation loop now checks `inputs.annualCashSavingsContribution`. If present, it uses that as annual cash savings instead of recomputing a crude post-tax residual.

This is important because the canonical adapter can now pass an exact surplus allocation result into the simulator.

**Evidence in code:** `src/js/simulator.js` annual cash savings logic.

### 2.5 The old reverse manual-mode `g.normalizedValue` crash appears fixed

The earlier undefined `g.normalizedValue` line is no longer present in `ReversePlanner.buildCurrentPath()`.

**Status:** fixed.

### 2.6 India and Portugal country-profile factual issues are partly fixed

The repository version of `country-profiles.js` now correctly marks:

- India as having a social security agreement.
- Portugal as having a social security agreement.
- Portugal NHR as closed to new applicants, with retirees generally not covered by the replacement IFICI-style regime.

This resolves the two largest factual errors from the earlier audit.

---

## 3. Critical issues still remaining

### Issue 1 - Reverse planner still uses the imported projection summary path incorrectly

**Severity:** Critical  
**Affected calculator:** Reverse  
**Affected files:**

- `src/js/reverse-planner.js`
- `src/js/forward-projection-bridge.js`
- `src/js/reverse-ui.js`

`reverse-solver.js` was improved to separate planned spending from SWR capacity. `scoreScenario()` now uses planned spending and exposes `swrCapacityToday` separately.

However, `ReversePlanner.solve()` still has a special path for loaded forward projections:

```js
if (hasCompleteProjection && projection?.summary) {
  currentPath = extractCurrentPathFromProjection(...)
  currentPath.incomeGap = target - currentPath.currentAnnualIncomeToday
  currentPath.meetsGoal = currentPath.currentAnnualIncomeToday >= target
}
```

That bypasses `scoreScenario()` and `evaluateEngineGoal()`.

`extractCurrentPathFromProjection()` in `forward-projection-bridge.js` uses:

```js
const monthly = summary.monthlyRetirementIncomeToday ?? payload?.adaptedResult?.monthlyPaycheck ?? 0;
const annual = summary.annualRetirementIncomeToday ?? monthly * 12;
...
sustainableIncomeToday: annual
```

If `summary.monthlyRetirementIncomeToday` is stale or still sourced from the older "monthly paycheck" / SWR-like value, the reverse planner will keep showing the wrong sustainable income.

**Output evidence:** The uploaded reverse PDF still says:

- `CURRENT SUSTAINABLE INCOME $278,636/year`
- `TOTAL ASSETS AT RETIREMENT $9,455,907`
- `SUPER AT RETIREMENT $5,399,132`

This matches the previous stale projection family, not the corrected planned-spending interpretation.

**Required fix:**

Remove the summary-only shortcut as the authoritative path.

Preferred implementation:

```js
if (hasCompleteProjection && projection?.engineInputs && projection?.simulation) {
  const engineInputs = applyTargetToEngineInputs(
    projection.engineInputs,
    resolvedTarget,
    {}
  );

  currentPath = this.buildCurrentPath(
    engineInputs,
    resolvedTarget,
    projection.simulation
  );
}
```

Or, if `extractCurrentPathFromProjection()` is retained, it must extract the actual retirement-year planned spending from:

- `retirementRow.plannedSpending`
- `retirementRow.totalPlannedSpending`
- `retirementRow.withdrawal` only if clearly defined as planned spending, not total withdrawal
- never `monthlyPaycheck` unless that value is explicitly proven to be planned Year-1 spending

Add a regression test:

```text
Given a projection where:
- totalAssetsAtRetirement = 9,455,907
- targetAnnualIncomeToday = 80,000
- plannedSpendingToday = 57,503
- SWR capacity = 278,636

Reverse currentPath.sustainableIncomeToday must equal about 57,503, not 278,636.
```

---

### Issue 2 - Reverse PDF snapshot is still using the wrong input object

**Severity:** Critical  
**Affected calculator:** Reverse PDF export  
**Affected file:** `src/js/reverse-ui.js`

The uploaded reverse report page 2 shows:

- household: Single
- age: 50
- salary: $0
- super: $0
- cash: $0
- monthly investment: $0
- home value: $830,000

But the same PDF page 1 scenario-builder table shows the selected plan using:

- salary: $235,158/year
- super: $336,330
- non-super now: $65,000
- monthly surplus: $300/month

This proves the PDF is mixing two state sources:

1. scenario builder uses the imported forward projection or scenario projection input
2. current financial snapshot uses `result.inputs`, which in `ReversePlanner.solve()` is currently `baseInputs` normalised from the reverse form/manual path

**Required fix:**

When a complete forward projection is present, return projection-backed display inputs:

```js
const displayInputs = hasCompleteProjection
  ? projection.engineInputs
  : baseInputs;

return {
  ...
  inputs: displayInputs,
  rawReverseInputs: baseInputs,
  projectionEngineInputs: projection.engineInputs,
}
```

Then update `handlePdfExport()` to use `projection.engineInputs` or `result.displayInputs`, not `result.inputs`, for the snapshot.

Add a test:

```text
Load forward projection with salary=235158 and super=336330.
Run reverse planner from imported projection.
Export PDF model object.
Expected snapshot salary is 235158, super is 336330, household is couple.
It must not show salary=0 or household=single.
```

---

### Issue 3 - Forward projection bridge still stores ambiguous "monthlyRetirementIncomeToday"

**Severity:** High  
**Affected files:**

- `src/js/forward-projection-bridge.js`
- `src/js/advanced-v2.js`
- `src/js/utils.js` PDF export

`buildForwardProjectionPayload()` stores:

```js
const monthlyPaycheck = adaptedResult?.monthlyPaycheck || 0;
const annualRetirementIncomeToday = monthlyPaycheck * 12;
```

The name `monthlyPaycheck` is ambiguous and historically appears to have represented capacity/SWR in parts of the app. The bridge should not store ambiguous summary fields that can be reused incorrectly.

**Required fix:**

Replace or augment the summary with explicit fields:

```js
summary: {
  targetAnnualIncomeToday,
  plannedSpendingYear1Today,
  plannedSpendingYear1Nominal,
  swrCapacityToday,
  swrCapacityNominal,
  actualWithdrawalYear1Nominal,
  retirementYear,
  displayUnits,
  deflator,
}
```

Then update all report cards to use:

- "Planned retirement spending" = planned spending
- "Sustainable capacity at 4%" = SWR reference only
- "Actual first-year portfolio withdrawal" = withdrawal after pension/property/other income
- "Target income" = the user's desired target

Never label SWR capacity as spending, income need, or paycheck.

---

### Issue 4 - Scenario builder is present but not yet decision-grade

**Severity:** High  
**Affected files:**

- `src/js/calculation/reverse-scenario-engine.js`
- `src/js/reverse-ui.js`

The new scenario builder is a good start. It generates rows such as:

- Selected plan
- Own home + super + Age Pension
- Own home + super + no Age Pension
- Renting + super + Age Pension
- Non-super only
- Property retained/sold
- No current assets
- Aged-care-adjusted
- Conservative stress

But the output currently has three weaknesses:

1. Many rows return the same current values, so the user cannot tell whether the scenario truly differs or whether the plan is simply already above target.
2. The PDF scenario table omits important columns already calculated by the engine:
   - property equity / rental income
   - assets at retirement
   - estate at lifespan
   - `meetsGoal`
   - warnings
3. Warnings are collapsed into a single info box, rather than tied to the scenario that generated them.

**Required fix:**

Add a richer scenario result schema:

```js
{
  scenarioName,
  activeToggles,
  requiredCurrentSuper,
  requiredCurrentNonSuperInvestments,
  requiredCurrentGrossSalary,
  requiredMonthlySurplus,
  requiredAnnualSalarySacrifice,
  requiredPropertyEquityOrRentalIncome,
  expectedAgePensionContribution,
  expectedAssetsAtRetirement,
  expectedEstateAtLifespan,
  plannedSpendingToday,
  swrCapacityToday,
  meetsGoal,
  bindingConstraint,
  warnings,
  assumptions,
}
```

PDF should include a wide scenario appendix or landscape table.

---

### Issue 5 - Super-at-retirement reconciliation is still not proven

**Severity:** High  
**Affected calculators:** Advanced-v2, Reverse  
**Affected files:**

- `src/js/simulator.js`
- `src/js/advanced-v2.js`
- `src/js/forward-projection-bridge.js`
- `src/js/reverse-ui.js`

The earlier audit identified a major overstatement:

- app showed super at retirement around `$5.4M`
- closed-form oracle estimated about `$3.56M nominal`, or about `$2.03M real`, from the same inputs

The current code has improved super contribution tax handling and Division 296 logic, but the latest uploaded reverse PDF still shows `$5,399,132`, so the output problem remains visible in at least the reverse-report path.

The 2026-06-22 advanced PDF shows different numbers, but there is still no evidence that the closed-form oracle test is enforced.

**Required fix:**

Add a super reconciliation regression test using the Appendix A oracle from `docs/issues_and_gap_analysis_overseas_super.md`.

Test shape:

```text
Inputs:
- primary super 336,330
- partner super 15,120
- primary salary 235,158 dropping to 168,000 at age 58
- partner salary 41,220 dropping to 38,000 at partner age 62
- SG 12%
- partner salary sacrifice 2,000
- super return 8.32%
- contribution tax including Div293
- retirement age 71

Expected:
combined super at retirement should be within ±10% of independent oracle.
If the engine returns around 5.4M, fail.
```

Also add a report card:

```text
Super Reconciliation
Opening super
+ employer SG
+ salary sacrifice
- contribution tax / Div293
+ investment earnings
- annuity purchases
- Division 296
= projected super at retirement
```

---

### Issue 6 - Today's dollars vs nominal dollars are still not consistently separated

**Severity:** High  
**Affected calculators:** Advanced, Advanced-v2, Reverse, PDFs

The latest reports still mix nominal and real labels.

Examples from the uploaded reports:

- Reverse PDF says `Super at retirement $5,399,132`, without telling whether this is nominal or today's dollars.
- Advanced PDF page 20 year-by-year table is clearly nominal/inflated future dollars.
- Some summary cards use "current purchasing power" language, while detailed table values are future-year dollars.
- Some advanced-v2 bridge values store `superAtRetirementToday` but appear to use `adaptedResult.superAtRetire` directly.

**Required fix:**

Introduce an explicit money-unit object:

```js
{
  amountNominal,
  amountToday,
  deflator,
  baseYear,
  projectionYear,
  label: "today" | "nominal"
}
```

All cards and report tables should choose from that object.

Add a PDF assumption:

```text
All summary dashboard values are shown in today's dollars unless labelled "nominal".
All year-by-year table values are nominal future-year dollars.
```

---

### Issue 7 - Monte Carlo outputs remain suspiciously high

**Severity:** High  
**Affected calculator:** Advanced-v2 PDF and charts

The 2026-06-22 report shows:

- deterministic final balance around `$2.38M`
- Monte Carlo median final balance around `$58.99M`
- 90th percentile around `$116.59M`
- charts with a best-case path near hundreds of millions

That spread is not automatically impossible, but it is too extreme for a report intended to guide retirement planning unless clearly explained and tested.

Potential causes:

- stochastic returns have a high right tail and no upper clamp
- `scenarioMode` / optimistic assumptions carried into Monte Carlo
- Monte Carlo may be compounding a run-level rate and per-year rates inconsistently
- cash savings + investment contributions may be double-counted in some paths
- total financial assets may include property/home equity inconsistently
- Monte Carlo chart values may use net worth while deterministic card uses liquid balance

**Required fix:**

Add Monte Carlo sanity tests:

```text
1. With volatility=0 and shocks=false, Monte Carlo median must equal deterministic result within 1%.
2. With normal volatility, median must remain within a configured tolerance of deterministic, unless documented as a stochastic median using different assumptions.
3. Chart y-axis must say whether it is liquid assets, total assets, or net worth.
4. MC statistics and deterministic summary must use the same asset definition.
```

The PDF should add a "Monte Carlo interpretation" note when median is >3x deterministic.

---

### Issue 8 - Scenario mode defaults are improved but imported JSON can still silently use optimistic mode

**Severity:** Medium-high  
**Affected calculator:** Advanced-v2

`readInputs()` now defaults scenario mode to `baseline`, which is correct. However, the uploaded JSON still has `scenarioMode: "optimistic"`.

That means imported data can still produce optimistic base projections unless the UI and report explicitly warn the user.

**Required fix:**

On import:

- preserve `scenarioMode`, but show a visible warning if not `baseline`
- include scenario mode in every export summary
- add a button to "re-run as baseline"

PDF should include:

```text
Scenario mode: Optimistic
Warning: this is not the base case. Return and inflation assumptions have been adjusted.
```

---

### Issue 9 - Advanced PDF overseas section still fails to populate

**Severity:** High  
**Affected files:**

- `src/js/advanced-v2.js`
- `src/js/utils.js`
- `src/js/overseas-retirement.js`

The 2026-06-22 PDF has an Overseas Retirement Scenarios table showing only `N/A` rows, even though the JSON has:

- `goingOverseas: true`
- `overseasCountry: portugal`
- `overseasAnnualBudget: 60000`
- `overseasMoveType: extended_temporary`
- `overseasTaxResidency: australian`

The likely reason is export-state dependency:

```js
currentOverseasData: APP_STATE.overseasExportData
```

If the overseas analysis tab/tool has not run, `APP_STATE.overseasExportData` is null, so the PDF exports empty rows.

**Required fix:**

If `goingOverseas` is true, PDF export must either:

1. auto-run overseas analysis before export, or
2. compute a lightweight overseas summary directly from `APP_STATE.projection` + inputs, or
3. show "Overseas analysis not run" with a clear explanation, not `N/A` rows.

Add a regression test:

```text
Given goingOverseas=true and destination=portugal, PDF export data must include a Portugal overseas section even if the user did not manually open the Overseas tab.
```

---

### Issue 10 - AI recommendations are still not fully report-grade

**Severity:** Medium-high  
**Affected calculators:** Advanced, Advanced-v2 PDFs

The PDFs include AI recommendations, but the quality is inconsistent:

- Some earlier report rows show `NaN%` confidence.
- Some long recommendation descriptions are truncated mid-sentence.
- Recommendations are duplicated across multiple sections.
- Some suggestions are scenario-specific but do not show which assumptions were changed.
- Page 12 of the 2026-06-22 report has a blank "Home Ownership" recommendation row with `low N/A`.

**Required fix:**

Standardise recommendation schema:

```js
{
  id,
  title,
  category,
  priority,
  confidence,
  impactAmount,
  impactMetric,
  scenarioSource,
  triggerCondition,
  assumptionsChanged,
  actionSteps,
  caveats,
  modelReliability,
}
```

PDF should include:

- top 5 actions
- why each was recommended
- estimated impact
- caveats
- whether it is tax/legal/financial-advice-sensitive
- whether the suggestion is already implemented in the current plan

Do not print `NaN%`; use `Not scored`.

---

### Issue 11 - Classic advanced calculator still needs explicit parity verification

**Severity:** Medium  
**Affected calculator:** Advanced classic

The advanced-v2 path now uses canonical adapters. The classic advanced path still needs a parity audit.

Required test:

```text
Given one canonical fixture:
- advanced.html
- advanced-v2.html
- reverse imported projection

must produce equivalent engine inputs and equivalent deterministic result within tolerance.
```

The repository already has a test named `advanced-classic-v2-normalized-parity.test.js`, but the report should not be considered resolved until it covers:

- detailed cashflow
- surplus allocation
- investment property
- overseas
- super salary-package modes
- reduced-income years
- Age Pension / homeowner status
- future-property and inheritance scenario-only toggles

---

### Issue 12 - Country profile map includes USA but no USA profile was found in `country-profiles.js`

**Severity:** Medium  
**Affected file:** `src/js/advanced-v2.js`

`advanced-v2.js` maps `usa: 'USA'`, but searching the repository did not find a `USA` country profile in `country-profiles.js`.

**Risk:**

If the UI exposes USA, overseas analysis may return `Country not found` or export `N/A`.

**Required fix:**

Either:

- add a `USA` profile, or
- remove USA from the destination map/dropdown until the profile is implemented.

---

## 4. Overseas country data audit

The key modelling principle should be:

> Social Security Agreement status is **not** the same thing as "full pension guaranteed". The calculator must still apply Age Pension means tests, Australian Working Life Residence, overseas supplement rules, exchange-rate assumptions, local tax residency, healthcare, visa feasibility, and local cost-of-living assumptions.

Services Australia states that how much a person gets depends on where they live and how long they have lived/worked in each country, and income/assets still affect payment amounts. It also states that after more than 26 weeks overseas, Age Pension depends on Australian residence between age 16 and Age Pension age; 35+ years usually retains full rate, while fewer years generally gives a lower rate.

### Current code position

`overseas-retirement.js` now delegates pension estimation to `policy-engine.js`, which is the correct direction. It also computes AWLR, agreement status, and a scenario tree.

However, the country profile data is still too static for a high-trust retirement calculator. It needs source dates, policy dates, review flags, and a "confidence" field per country.

### Country-by-country review

| Country / destination | Current profile status | Verification status | Issues to resolve |
|---|---:|---|---|
| India | Improved | Australia-India SSA is correctly marked true. | Ensure AWLR proportionality is applied. Do not show "full pension" unless AWLR and means tests support it. |
| Portugal | Improved | Portugal SSA correctly marked true; NHR closure is now reflected in code. | Ensure PDFs no longer say "NHR tax scheme" or "Under NHR: Australian super not taxed" for future retirees. Use standard Portuguese tax-residency caveats unless user is grandfathered. |
| Spain | Mostly plausible | Services Australia lists Spain as an agreement country. | Add timestamped tax/visa data and DTA caveats. |
| Italy | Mostly plausible | Services Australia lists Italy as an agreement country. | Add timestamped tax/visa data and local healthcare/registration caveats. |
| Canada | Mostly plausible | Services Australia lists Canada as an agreement country. | Retirement visa feasibility should not be over-simplified. Add tax-residency and provincial healthcare limitations. |
| New Zealand | Needs special handling | Services Australia has a separate NZ agreement page. | Do not treat NZ as a generic agreement country. NZ has special coordination/direct-deduction style complexities and needs a dedicated profile/model. |
| Japan | Needs detail | Services Australia lists Japan as an agreement country. | The profile should make clear whether the agreement affects Australian Age Pension, Japanese pension, or contribution coverage. Avoid implying full income support. |
| United Kingdom | Correctly not current SSA if profile says false | Services Australia says the UK agreement ended on 1 March 2001. | Keep `socialSecurityAgreement: false`; model UK pension separately only if user inputs UK entitlement. |
| Thailand | No SSA | Static cost/visa/tax data likely fragile. | Needs official retirement visa, health insurance, tax-residency and pension portability notes. |
| Bali / Indonesia | No SSA | Static profile likely fragile. | Treat Bali as Indonesia legally. Retirement/KITAS rules and tax residency need official verification. |
| Malaysia | No SSA | Static profile likely fragile. | MM2H rules have changed repeatedly; do not hard-code a long-lived retirement suitability score without source date. |
| Philippines | No SSA | Static profile likely fragile. | SRRV and tax/health assumptions need dated official sources. |
| Vietnam | No SSA | Static profile likely fragile. | No standard retirement visa path; long-term stay assumptions should be marked low-confidence. |
| USA | Mapping exists; profile not found | Services Australia lists USA as an agreement country. | Add `USA` country profile or remove USA mapping. |

### Required country profile schema

Replace simple static profiles with a source-aware schema:

```js
{
  code: 'PORTUGAL',
  name: 'Portugal',
  lastReviewed: '2026-06-22',
  reviewedBy: 'manual',
  sourceUrls: {
    socialSecurityAgreement: '...',
    taxResidency: '...',
    visa: '...',
    healthcare: '...',
    costOfLiving: '...',
    fx: '...'
  },
  socialSecurityAgreement: true,
  agreementType: 'AGE_PENSION_PORTABILITY_AND_CLAIMING',
  pensionModel: {
    applyMeansTest: true,
    applyAWLR: true,
    awlrYearsRequiredForFullRate: 35,
    canClaimFromCountry: true,
    supplementLossAfterWeeks: 6,
    specialRules: []
  },
  taxModel: {
    confidence: 'medium',
    localPensionTax: 'standard_resident_rates',
    grandfatheredSchemes: ['NHR for existing approved taxpayers only'],
    futureRetireeDefault: 'standard_resident_rates',
    notes: []
  },
  visaModel: {
    confidence: 'medium',
    retirementVisaAvailable: true,
    minimumIncomeOrAssetRequirement: null,
    sourceDate: 'YYYY-MM-DD'
  },
  healthcareModel: {
    confidence: 'medium',
    publicAccessLikely: false,
    privateCoverRequired: true
  },
  warnings: []
}
```

---

## 5. PDF output audit

### 5.1 Advanced PDF - 2026-06-22

Observed issues:

1. **Overseas section is empty**  
   The report prints repeated `Country N/A` rows, even though input data indicates Portugal overseas planning is enabled.

2. **Monte Carlo results look too high**  
   The report shows deterministic final balance around `$2.38M`, but Monte Carlo median around `$58.99M`. This needs validation before being presented as a planning result.

3. **Visual charts are hard to read**  
   The chart pages use a black background with small labels, which is not ideal for a PDF retirement report. They should use a light theme, larger labels, and clearer captions.

4. **Recommendations are not fully actionable**  
   The report includes many suggestions, but several are truncated, repeated, or not tied to specific input assumptions.

5. **No reconciliation section**  
   There is no section proving that super, cashflow, property equity, and pension figures reconcile from inputs to outputs.

6. **Units are unclear**  
   The report needs a visible split between:
   - today's dollars
   - future nominal dollars
   - annual vs monthly
   - planned spending vs sustainable capacity

### 5.2 Advanced-v2 PDF - 2026-06-21

Observed issues:

1. It still says monthly retirement paycheck `$23,220`, which is the old problematic label.
2. It prints Portugal as relying on NHR-style assumptions.
3. It contains `NaN%` confidence values in AI recommendations.
4. It has total assets at retirement matching the reverse report, suggesting shared/stale projection risk.
5. It does not adequately disclose scenario mode as optimistic.

This older report should be treated as invalid for decision-making.

### 5.3 Reverse planner PDF

Observed issues:

1. **Wrong current sustainable income**  
   Shows `$278,636/year`, still not the true planned spending need.

2. **Wrong current snapshot**  
   Shows single household and zero salary/super/cash despite imported scenario data.

3. **Scenario builder table too narrow**  
   The PDF omits several important columns already available from the scenario engine.

4. **Warnings not scenario-specific**  
   Scenario warnings are combined, which reduces interpretability.

5. **No detailed methodology per lever**  
   The lever table says "No change needed" for many levers, but does not explain whether that is because:
   - the goal is already met,
   - the current values were used as lower bounds,
   - the target is too low,
   - the scenario is not materially different,
   - or the solver failed to isolate the lever.

---

## 6. Recommended PDF report enhancements

### 6.1 Add a one-page decision dashboard

The first page should show:

- Target income today
- Planned Year-1 spending
- 4% SWR capacity
- Actual portfolio withdrawal
- Age Pension contribution
- Assets at retirement: today-dollar and nominal
- Final estate: today-dollar and nominal
- Confidence / Monte Carlo success
- Data quality score
- Biggest risk
- Biggest lever

### 6.2 Add a cashflow reconciliation table

Example:

| Item | Annual | Monthly |
|---|---:|---:|
| Gross income | $x | $x |
| Estimated tax | -$x | -$x |
| Post-tax income | $x | $x |
| Living costs | -$x | -$x |
| Mortgage payments | -$x | -$x |
| Explicit investments | -$x | -$x |
| Derived surplus | $x | $x |
| Allocated to cash | $x | $x |
| Allocated to investments | $x | $x |
| Allocated to super | $x | $x |

### 6.3 Add a super waterfall

Show:

```text
Opening super
+ employer SG
+ salary sacrifice
+ NCC
- contribution tax
- Div293
- Div296
- annuity purchases
+ investment earnings
= super at retirement
```

### 6.4 Add a "money units" strip on every financial summary

Example:

```text
Summary values: today's dollars
Year-by-year table: nominal future dollars
Base year: 2026
Inflation assumption: 2.58%
```

### 6.5 Add an overseas fact-check appendix

For every overseas destination, include:

- social security agreement status
- can claim Age Pension from that country
- AWLR years
- proportional pension percentage
- means-test result
- local tax residency assumption
- NHR/retiree tax scheme status
- healthcare assumption
- visa assumption
- FX stress scenario
- last-reviewed date and source confidence

### 6.6 Improve recommendation UX

Each recommendation should show:

- What triggered it
- What number changes
- Impact in dollars and success-rate change
- Confidence
- Complexity
- Caveat
- Whether it is already reflected in the projection
- Whether professional advice is required

### 6.7 Add a scenario appendix

For each user-generated scenario:

- scenario name
- toggles selected
- input hash
- target
- result summary
- required actions
- warnings
- comparison vs baseline

---

## 7. Priority fix backlog

### P0 - Must fix before trusting reports

1. Reverse imported projection must use `buildCurrentPath()` / `scoreScenario()`, not summary `monthlyPaycheck`.
2. Reverse PDF snapshot must use projection engine inputs, not manual default inputs.
3. Add closed-form super reconciliation test.
4. Add planned-spending vs SWR regression test.
5. Add PDF export test for overseas-enabled Portugal case.
6. Fix `forward-projection-bridge.js` summary field names and semantics.

### P1 - High priority

7. Add Monte Carlo deterministic parity and sanity tests.
8. Separate today's dollars and nominal dollars in all summary cards.
9. Make scenario builder PDF output include assets, estate, warnings and toggles.
10. Add country-profile source dates and confidence levels.
11. Add USA profile or remove USA mapping.
12. Remove stale NHR language from all report paths.

### P2 - UX and robustness

13. Replace black-background charts with readable PDF-optimised charts.
14. Replace `NaN%` with `Not scored`.
15. Add data-quality warnings for stale projections and optimistic scenario mode.
16. Add a "Re-run all analyses before export" option.
17. Add a visible report generation metadata block:
    - calculator version
    - policy version
    - input hash
    - projection hash
    - generated date
    - source calculator
    - last full recompute timestamp

---

## 8. Suggested regression test suite

```text
tests/unit/reverse-imported-projection-current-path.test.js
  - imported forward projection must derive currentPath through scoreScenario
  - currentPath.sustainableIncomeToday must be planned spending, not SWR capacity

tests/unit/reverse-pdf-snapshot-binding.test.js
  - PDF model must show imported projection salary, super, cash and household type

tests/unit/super-closed-form-oracle.test.js
  - super at retirement within ±10% of independent oracle

tests/unit/advanced-v2-surplus-allocation.test.js
  - $20k/month income, $7k/month spend allocates $13k/month surplus
  - cash mode increases annualCashSavingsContribution
  - invest mode increases monthlyStockContribution
  - mortgage-first mode increases monthlyMortgagePayment

tests/unit/monte-carlo-sanity.test.js
  - volatility=0 => MC median ≈ deterministic
  - no stochastic path can silently reuse stale result hash

tests/unit/overseas-enabled-pdf-export.test.js
  - goingOverseas=true + Portugal produces populated overseas PDF data

tests/unit/country-profile-schema.test.js
  - every mapped country has a profile
  - every profile has socialSecurityAgreement, AWLR handling, tax confidence, visa confidence, lastReviewed, sourceUrls

tests/unit/pdf-recommendation-integrity.test.js
  - no NaN confidence
  - no blank recommendation title
  - all recommendations include trigger and caveat
```

---

## 9. Implementation prompt for the next coding pass

```markdown
# Task: Complete post-fix reconciliation for Advanced, Advanced-v2, Reverse, Overseas and PDF exports

## Objective

Make the calculator outputs trustworthy and internally consistent across advanced, advanced-v2, reverse planner, overseas modelling and PDF reports.

## Highest-priority fixes

1. In `ReversePlanner.solve()`, stop using `extractCurrentPathFromProjection()` as the authoritative current path when a complete forward projection exists. Use `buildCurrentPath(projection.engineInputs, resolvedTarget, projection.simulation)` or recompute through `ProjectionService`.
2. Update `forward-projection-bridge.js` to stop using ambiguous `monthlyRetirementIncomeToday` / `monthlyPaycheck` as sustainable income. Store explicit fields:
   - `plannedSpendingYear1Today`
   - `plannedSpendingYear1Nominal`
   - `swrCapacityToday`
   - `swrCapacityNominal`
   - `actualWithdrawalYear1Nominal`
3. Fix reverse PDF snapshot binding. Use projection engine inputs for salary, super, cash, household and property data when imported projection exists.
4. Add a closed-form super-at-retirement oracle test using the audit Appendix A case.
5. Add a planned-spending vs SWR regression test.
6. Add an overseas PDF export regression: Portugal input must not produce `N/A` overseas rows.
7. Add Monte Carlo sanity tests:
   - volatility=0 must match deterministic
   - median must use same asset definition as deterministic summary
8. Add source-aware country profile schema and either add USA profile or remove USA mapping.
9. Update all PDFs:
   - planned spending and SWR capacity must be separate
   - today's dollars and nominal values must be labelled
   - scenario builder output must include toggles, warnings, assets at retirement and estate
   - overseas section must be populated or explicitly say analysis was not run
   - recommendations must not show NaN or blank titles

## Acceptance criteria

- Reverse PDF no longer shows `$278,636/year` as sustainable income unless that is actual Year-1 planned spending.
- Reverse PDF snapshot reflects imported advanced-v2 data, not manual defaults.
- Advanced PDF with Portugal overseas enabled has a populated Portugal overseas section.
- Super at retirement passes independent oracle within ±10%.
- No PDF shows `Country N/A`, `NaN%`, blank recommendation titles, or stale NHR language for Portugal.
- Every mapped overseas country has a profile or is removed from the UI.
- All summary cards state whether values are today's dollars or nominal dollars.
```

---

## 10. Final position

The implementation is moving in the right direction. The shared cashflow and projection infrastructure is now visible in the code and should be retained.

But the reports are still not trustworthy because the final displayed values are not consistently generated from the corrected engine path. The most urgent problem is no longer the lack of a cashflow engine; it is the **last-mile binding** between:

```text
canonical projection -> reverse current path -> scenario solver -> PDF export
```

Until that binding is fixed and covered by regression tests, the calculators can still reach a broadly correct conclusion while showing incorrect amounts, labels, household inputs, and recommendation logic.
