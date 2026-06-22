# Retirement Calculator Trustworthiness Audit — JSON Reconciliation, Calculation Validation, and UI/PDF Fixes

_Date: 2026-06-22_  
_Scope: `advanced.html`, `advanced-v2.html`, `reverse.html`, latest uploaded Advanced and Advanced-v2 JSON exports, and current repository code inspected through GitHub connector._

## Executive conclusion

The summary you received is directionally correct and should be acted on. The biggest issue is not one single formula. It is that the three calculators are still accepting **different field names, different units, different defaults, and different scenario assumptions**, then presenting results as if they are equivalent.

The most trust-damaging current risks are:

1. **`returnDeclineRate: 0.2` in the Advanced JSON is unsafe and must be sanitised.** The simulator treats `returnDeclineRate` as a decimal annual decrement. The code comment expects a value like `0.0003`, not `0.2`. A value of `0.2` means 20 percentage points per projection year and is capable of swinging results by millions.
2. **The JSON exports are not equivalent.** Advanced and advanced-v2 mostly agree on ages, salary, balances and property values, but diverge on returns, inflation, detailed cashflow, credit card debt, dependents, future property scenario, investment property acquisition data, and mortgage payment.
3. **The investment property maths is partly right, but the reporting is misleading.** The PDF shows a 5.44% gross yield but not the negative net cashflow, negative equity, selling cash-call, or capital-loss carry-forward.
4. **Suggestions are being ranked and labelled by terminal balance delta.** That makes good risk-reducing actions look “negative” and speculative high-growth actions look “positive”. Suggestions need depletion age, success-rate change, 10th percentile downside, and amount-at-risk.
5. **Reverse remains a data-binding risk.** The output still needs to prove which projection source and hash it used, and it must stop showing single/$0 snapshots when imported household data is couple/high-income.

---

## 1. Validation of the supplied summary

### 1.1 `returnDeclineRate` problem — validated

The summary is correct. In `src/js/simulator.js`, `getReturnForYear(baseReturn, year, declineRate)` computes:

```js
return Math.max(minReturn, baseReturn - declineRate * year);
```

The inline comment says the expected value is approximately `0.0003` for a 0.03% annual decline. The Advanced JSON contains:

```json
"returnDeclineRate": 0.2
```

That is unsafe because `0.2` is already less than `1`, so the generic rate normaliser will not divide it by 100. It will pass through as `0.2`.

### Required fix

Add a domain-specific sanitizer, not just generic percentage normalisation:

```js
function sanitiseReturnDeclineRate(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0.0003;

  // UI percentage form: 0.03 means 0.03%/yr.
  if (n > 0.01 && n <= 1) {
    console.warn("returnDeclineRate looked too high; interpreting as percentage input", n);
    return n / 100;
  }

  // Hard guard: more than 1% return decline per year is not valid for this model.
  if (n > 0.01) return 0.0003;

  return Math.max(0, n);
}
```

Better still: rename it in the UI to `annualReturnDeclineRateDecimal` or remove it from user exports until fully explained.

### 1.2 9% / optimistic base case — validated

The Advanced JSON uses:

```json
"investmentReturn": 0.09,
"superReturn": 0.09,
"scenarioMode": "optimistic"
```

Advanced-v2 uses lower investment return but still optimistic mode:

```json
"invReturn": 4.45,
"superGrowth": 8.32,
"scenarioMode": "optimistic"
```

A base case should not silently be optimistic. The UI should make users choose one of:

- Conservative
- Base / expected
- Optimistic

The PDF should print a conspicuous label: **Projection basis: Optimistic**.

### 1.3 Investment property framing — validated

Using the uploaded JSON values:

| Metric | Value |
|---|---:|
| Current property value | $530,000 |
| Current loan | $574,000 |
| Current equity | $-44,000 |
| Purchase price | $644,900 |
| Gross rent | $28,808 / yr |
| Vacancy-adjusted rent | $28,232 / yr |
| Approx interest at 6.82% | $39,147 / yr |
| Strata + expenses + land tax | $10,119 / yr |
| Approx net rental cashflow before tax | $-21,034 / yr |
| Expected property growth at 2.75% | $14,575 / yr |
| Approx net economic position before tax | $-6,459 / yr |
| Approx sale cash-call with 5% selling costs | $-70,500 |

The property is not just “low yield”; it is currently underwater and materially negative cashflow. Showing only gross rental yield is misleading.

### Required PDF/UI fix

The Investment Property section should show:

```text
Current equity: -$44,000
Estimated sale costs: $26,500
Estimated cash required to sell now: about $70,500
Gross yield: 5.44%
Net cashflow before tax: about -$21,000/year
Net economic position after expected growth: about -$6,500/year
Capital gain/loss if sold today: about -$114,900 before costs
CGT payable: $0
Capital loss carried forward: yes, subject to tax advice
```

### 1.4 Negative suggestions — validated as design flaw

This is not necessarily a calculation error. It is a decision-support design error.

When a base case never depletes and uses optimistic/high returns, a terminal-balance delta becomes a poor ranking measure. Paying off debt, holding insurance, de-risking a portfolio, or keeping liquidity can legitimately reduce terminal wealth while improving resilience.

The suggestions engine should stop treating “final balance delta” as the primary metric.

### Required fix

Each suggestion must include:

```ts
{
  baselineFinalBalance,
  scenarioFinalBalance,
  finalBalanceDelta,
  baselineSuccessRate,
  scenarioSuccessRate,
  successRateDelta,
  baselineDepletionAge,
  scenarioDepletionAge,
  baselineP10FinalBalance,
  scenarioP10FinalBalance,
  amountAtRiskDelta,
  status: "recommended" | "trade_off" | "not_recommended" | "educational_only",
  explanation
}
```

Then rank by:

1. avoids depletion / improves depletion age,
2. improves 10th percentile outcome,
3. improves success rate,
4. reduces debt/risk,
5. final balance delta.

---

## 2. JSON reconciliation: Advanced vs Advanced-v2

The JSON files are not equivalent. They represent the same user conceptually, but not the same canonical input.

### 2.1 High-risk differences

| Area | Field | Advanced JSON | Advanced-v2 JSON | Risk |
|---|---|---:|---:|---|
| Cashflow | Detailed cashflow flag | `False` | `True` | Conflict |
| Cashflow | Current monthly income | `None` | `0` | V2 has zero placeholder |
| Cashflow | Monthly mortgage payment | `4401` | `None` | Missing in v2; engine derives ~$3,607 |
| Debt | Credit card balance | `0` | `11000` | Conflict |
| Dependents | Dependents | `1` | `0` | Conflict |
| Economic | Inflation | `0.02` | `2.58` | Conflict units/values: 2.00% vs 2.58% |
| Economic | Investment return | `0.09` | `4.45` | Conflict: 9.00% vs 4.45% |
| Economic | Super return | `0.09` | `8.32` | Conflict: 9.00% vs 8.32% |
| Economic | Return decline rate | `0.2` | `None` | Advanced only; value unsafe |
| Economic | Scenario mode | `optimistic` | `optimistic` | Both optimistic |
| Investment property | IP purchase price | `644900` | `None` | Missing in v2 |
| Investment property | IP purchase year | `2024` | `None` | Missing in v2 |
| Investment property | IP loan type | `pi` | `None` | Missing in v2 |
| Investment property | CGT rate | `0.235` | `None` | Missing in v2 |
| Downsize/future property | Future property scenario | `True` | `False` | Conflict |
| Health | Healthcare inflation | `0.055` | `None` | Missing in v2 |
| Health | Home mod cost/age | `25000 @ 78` | `25000 @ 78 plus homeModBudget 40000` | Potential duplicate/conflict |


### 2.2 Fields that are materially missing from Advanced-v2

Advanced-v2 is missing or not exporting several fields that the classic Advanced JSON has and that matter for calculations:

- `returnDeclineRate`
- `monthlyMortgagePayment`
- `investmentPropertyPurchasePrice`
- `investmentPropertyPurchaseYear`
- `investmentPropertyLoanType`
- `capitalGainsTaxRate`
- `sellPropertyYears`
- `healthcareInflation`
- `salaryGrowthRate`
- `pensionIncomeThreshold`
- `agePensionMax`
- `dependentDetails`
- `futurePropertyScenario` differs from Advanced
- `maintenanceInflation`, `vacancyRate`, `propertyCrashProbability`, `extremeInflationProbability`

These should either be part of the canonical schema or explicitly marked as unsupported by advanced-v2.

### 2.3 Fields that are additional in Advanced-v2

Advanced-v2 has useful UI-builder fields that are not in the classic Advanced export:

- `desiredIncome`
- `desiredIncomeMode`
- `builderCurrentIncome`
- `builderMortgage`
- `builderChildren`
- `builderBuffer`
- `surplusAllocationMode`
- `salarySacrifice`
- `partnerSalarySacrifice`
- `annualParentSupport`
- `ccBalance`
- `homeModAge`
- `homeModBudget`
- `agePensionAge`
- `pensionAnnualSingle`
- `pensionAnnualCouple`
- `australianResidenceYears`

These should not remain page-specific only. They need canonical aliases or a clear export namespace.

---

## 3. Canonical-input rectification plan

### 3.1 Create one canonical import/export contract

Add a versioned canonical export shape:

```json
{
  "schemaVersion": "retirement-canonical-input-v2",
  "sourcePage": "advanced-v2",
  "exportedAt": "...",
  "userData": {
    "household": {},
    "income": {},
    "assets": {},
    "cashflow": {},
    "debts": {},
    "primaryResidence": {},
    "investmentProperty": {},
    "superannuation": {},
    "healthAndAgedCare": {},
    "overseas": {},
    "assumptions": {},
    "scenarioToggles": {}
  }
}
```

Classic Advanced and advanced-v2 should both import/export this canonical shape. The legacy field names can still be accepted, but they should be converted immediately and validated.

### 3.2 Add a reconciliation validator

Create:

```text
src/js/calculation/input-reconciliation-validator.js
```

It should emit blocking errors, warnings, and information notes.

Blocking errors:

- rates outside safe range,
- negative ages or retirement before current age,
- asset values not finite,
- missing required salary/super/property fields.

Warnings:

- `scenarioMode === "optimistic"` used as base case,
- `returnDeclineRate > 0.01`,
- super return greater than investment return by more than 2 percentage points,
- investment property value below loan,
- investment property value below purchase price,
- detailed cashflow enabled but monthly income/spend missing or inconsistent,
- credit card balance present but high-interest-debt flag says none,
- advanced and advanced-v2 values disagree on the same canonical field.

Information notes:

- value converted from percent to decimal,
- value defaulted,
- field ignored.

---

## 4. Investment property fixes

### 4.1 Calculation fixes

The property model should maintain a full annual ledger:

```ts
{
  year,
  age,
  openingValue,
  closingValue,
  openingLoan,
  closingLoan,
  grossRent,
  vacancyLoss,
  netRent,
  interest,
  principal,
  strata,
  insurance,
  repairs,
  landTax,
  otherExpenses,
  depreciation,
  taxableRentalIncome,
  taxBenefitOrCost,
  netCashflowBeforeTax,
  netCashflowAfterTax,
  expectedCapitalGrowth,
  economicReturn,
  equity,
  saleValueIfSold,
  sellingCosts,
  loanDischarge,
  capitalGainOrLoss,
  cgtPayable,
  carriedForwardCapitalLoss,
  afterTaxSaleProceeds
}
```

### 4.2 Reporting fixes

Replace the current short property table with four sections:

1. **Position today**
   - value, loan, equity, loan-to-value ratio, purchase price, unrealised gain/loss.

2. **Cashflow today**
   - gross rent, vacancy, interest, principal, strata, land tax, other expenses, tax estimate, net cashflow.

3. **Sell-now estimate**
   - sale price, selling costs, loan discharge, CGT, carried-forward loss, cash required/proceeds.

4. **Hold vs sell comparison**
   - hold 5 years, sell at retirement, keep indefinitely, with P10/median/P90 and downside flags.

---

## 5. Mortgage payoff fixes

The primary mortgage should be surfaced in UI and PDF.

Using the uploaded data:

| Source | Balance | Rate | Payment | Estimated payoff |
|---|---:|---:|---:|---:|
| Advanced JSON | $594,000 | 6.12% | $4,401/mo | 19.1 years, approx age 68.1 |
| Advanced-v2 derived | $594,000 | 6.12% | $3,607/mo | 30.0 years, approx age 79.0 |

This is a serious discrepancy. Advanced exports an actual mortgage payment of $4,401/month; advanced-v2 does not export the payment and the engine derives about $3,607/month from a 30-year amortisation. That changes surplus, payoff age, and retirement readiness.

### Required fix

Advanced-v2 should export and use:

```json
"monthlyMortgagePayment": 4401
```

or explicitly ask the user whether to use:

- actual current payment, or
- calculated minimum payment from balance/rate/term.

The report should show:

```text
Primary mortgage payoff: age 68.1 using your actual payment
Investment property loan payoff: [age or interest-only/no payoff]
Debt-free before retirement: Yes/No
```

---

## 6. Reverse calculator fixes

Reverse should not read stale localStorage and should not silently fall back to manual defaults when an imported projection exists.

Required UI/PDF fields:

```text
Projection source: advanced-v2 / advanced / manual
Input hash
Projection hash
Build version
Generated from deployed build timestamp
Household type
Current ages
Salary
Super today
Cash and investments today
Mortgage payment basis
Scenario builder status: run / not run
```

If any snapshot field is zero because manual mode is used, the report must say:

```text
Manual reverse mode used — no advanced/advanced-v2 projection was imported.
```

If imported projection exists but current snapshot shows zero/single, block export and show:

```text
Reverse projection is inconsistent with imported household data. Recalculate from advanced-v2 before exporting.
```

---

## 7. PDF and UX improvements

### 7.1 Add a trust/reconciliation panel to all PDFs

Put this near the top:

```text
Projection quality check
- Calculator source: advanced-v2
- Input schema: canonical v2
- Input hash: ...
- Projection hash: ...
- Scenario mode: Base / Conservative / Optimistic
- Monte Carlo: run / not run
- Return assumptions: base / user override
- Input warnings: 3
- Blocking issues: 0
```

### 7.2 Separate spending, SWR and sustainable income

Never label SWR as monthly retirement income.

Use:

```text
Planned spending target: $73,337/year today
Modelled retirement withdrawal: $X/year in retirement-year dollars
4% SWR reference on assets: $Y/year
Deterministic plan survival: survives to age N / depletes at age N
Monte Carlo success: X%
```

### 7.3 Add downside/median/upside chart

Use the existing Monte Carlo output but label it plainly:

```text
Downside 10th percentile: $...
Median 50th percentile: $...
Upside 90th percentile: $...
Worst 1%: $...
```

Mark:

- retirement age,
- mortgage payoff age,
- property sale year,
- depletion age if any,
- aged care start age.

### 7.4 Suggestions UX

Every suggestion card should say:

```text
Outcome type: improves risk / improves wealth / trade-off / educational only
Success rate: baseline → scenario
Depletion age: baseline → scenario
10th percentile final balance: baseline → scenario
Median final balance: baseline → scenario
Amount at risk: baseline → scenario
Why this may still be useful even if final balance falls
```

---

## 8. Regression tests to add

### 8.1 Return decline sanitizer

```js
expect(sanitiseReturnDeclineRate(0.2)).toBeCloseTo(0.002); // or reject/block
expect(sanitiseReturnDeclineRate(0.0003)).toBeCloseTo(0.0003);
expect(validateInputs({ returnDeclineRate: 0.2 })).toContainWarning();
```

Better: make `0.2` a blocking validation error unless a migration layer explicitly converts it from older UI percentage form.

### 8.2 Advanced vs advanced-v2 canonical parity

Given the two uploaded JSON files, after aliasing and unit conversion:

- matching fields should map to the same canonical fields,
- conflicting fields should be listed as warnings,
- missing fields should be defaulted only if safe.

### 8.3 Mortgage payment preservation

```js
expect(canonical.cashflow.currentMonthlyMortgagePayment).toBe(4401);
expect(mortgagePayoffAge).toBeCloseTo(68.1, 0.2);
```

### 8.4 Investment property underwater reporting

```js
expect(report.currentEquity).toBe(-44000);
expect(report.sellNow.afterTaxSaleProceeds).toBeLessThan(0);
expect(report.sellNow.cashRequiredToSell).toBeGreaterThan(0);
expect(report.capitalLossCarriedForward).toBeGreaterThan(0);
```

### 8.5 Suggestions risk metrics

```js
expect(recommendation.baselineDepletionAge).toBeDefined();
expect(recommendation.scenarioDepletionAge).toBeDefined();
expect(recommendation.amountAtRiskDelta).toBeDefined();
expect(recommendation.status).toMatch(/recommended|trade_off|not_recommended|educational_only/);
```

### 8.6 Reverse snapshot consistency

```js
expect(reverseReport.householdType).toBe("couple");
expect(reverseReport.salary).toBeGreaterThan(0);
expect(reverseReport.superToday).toBeGreaterThan(0);
expect(reverseReport.inputHash).toEqual(screenProjection.inputHash);
```

---

## 9. Priority implementation order

1. **Input sanitizer and canonical reconciliation**
   - Add `returnDeclineRate` guard.
   - Block optimistic scenario from silently being the base.
   - Normalize Advanced and Advanced-v2 exports into one canonical schema.

2. **Advanced-v2 missing field export**
   - Add `monthlyMortgagePayment`, investment property purchase price/year, CGT rate, loan type, healthcare inflation, salary growth rate.

3. **Reverse source integrity**
   - Require active projection source/hash.
   - Fix snapshot binding.
   - Separate SWR reference from spending and sustainable income.

4. **Investment property report**
   - Add net cashflow, negative equity, sell-now cash call, capital loss carry-forward.

5. **Suggestions rewrite**
   - Wire depletion age and amount-at-risk.
   - Rank by risk before terminal wealth.

6. **PDF trust panel and stochastic chart**
   - Add 10th/50th/90th bands.
   - Mark mortgage payoff, property sale and depletion ages.

---

## 10. Updated summary to use with the coding agent

```markdown
The latest audit confirms that the calculator is still at risk of producing misleading outputs because Advanced, Advanced-v2 and Reverse use different input schemas, different defaults and different interpretation of the same concepts.

The highest-priority defect is `returnDeclineRate`. The Advanced JSON contains `returnDeclineRate: 0.2`, while `simulator.js` expects a decimal annual decrement such as `0.0003`. The generic normaliser treats 0.2 as an already-normalised decimal, so the value is not corrected. Add a domain-specific sanitizer and validation warning/blocker for this field.

Advanced and Advanced-v2 must be reconciled to a canonical input schema. They match on ages, salary, super balances, cash, stocks, property value and loan balances, but diverge on inflation, investment return, super return, detailed cashflow, credit-card debt, dependents, future-property scenario, mortgage payment, and investment-property acquisition/tax fields. Advanced-v2 is missing purchase price, purchase year, CGT rate, loan type, salary growth, healthcare inflation and actual mortgage payment.

Investment property reporting must be improved. The model currently shows gross yield, but the property is underwater and negative cashflow. The report must show current equity, sale costs, cash required to discharge the loan, capital loss carried forward, net rental cashflow before/after tax, and hold-vs-sell stochastic outcomes.

The suggestions engine must stop ranking by final balance only. Each recommendation should include baseline/scenario success rate, depletion age, 10th percentile final balance, amount at risk, and terminal balance delta. Negative terminal-balance recommendations may still be useful if they reduce risk, so label them as trade-offs instead of poor suggestions.

Reverse must prove source integrity: projection source, input hash, projection hash, household type, salary, super today and scenario-builder status. It should block PDF export if imported data says couple/high-income but the reverse snapshot says single/$0.

PDFs need a trust panel, clear separation of planned spending vs SWR reference income, mortgage payoff age, investment property net position, and downside/median/upside Monte Carlo bands.
```

---

## 11. Decision on trustworthiness

Do not treat the current calculator output as user-trustworthy until these are fixed:

- `returnDeclineRate` cannot swing outputs by millions.
- Base case is not silently optimistic.
- Advanced and advanced-v2 produce the same canonical input for the same scenario.
- Reverse proves the projection source and does not show stale/manual defaults.
- Property reporting shows net position, not just gross yield.
- Suggestions include depletion and downside risk, not only terminal wealth.

Until then, add a visible UI banner:

> Results are currently being reconciled across calculator versions. Please review the Projection Quality Check panel and treat outputs as indicative only.

