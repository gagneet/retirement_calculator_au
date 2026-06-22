# Post-deployment recheck - advanced, advanced-v2, reverse calculators

Date: 2026-06-22

Files reviewed:

- `Australian-Retirement-Analysis-2026-06-22-1.pdf` - appears to be the updated advanced-v2 report.
- `Australian-Retirement-Analysis-2026-06-22.pdf` - appears to be the classic advanced report.
- `retirement-reverse-planner-report.pdf` - reverse planner export.
- `retirement-inputs-2026-06-22T00-01.json` - classic advanced input export.
- `retirement-inputs-advanced-v2-2026-06-21T12-06.json` - advanced-v2 input export.

## Executive summary

The deployed outputs are improved, but the system is still not internally reconciled across advanced, advanced-v2 and reverse.

The advanced-v2 output changed materially after deployment: it now reports total financial assets at retirement of about **$7.30M**, projected deterministic final balance of about **$7.28M**, and Monte Carlo median final balance of about **$69.35M**. The classic advanced report still reports **$9.456M** total assets at retirement and **$4.278M** deterministic final balance. The reverse planner still reports the same **$9.456M** total assets, **$5.399M super at retirement**, and **$278,636/year sustainable income**, which means reverse is still reading the classic/stale forward projection or a different bridge summary rather than the updated advanced-v2 projection.

The investment property handling is still too optimistic and not transparent enough. The input property is currently underwater: value **$530,000**, loan **$574,000**, purchase price **$644,900**. That is current equity of **-$44,000** before selling costs. A sale now would likely require cash to clear the loan after selling costs, and the tool needs to surface this as a negative-equity/liquidity warning, not just show an attractive strategy impact.

The suggestions engine has a real regression: many suggestions show negative impact even though they are listed as recommendations with medium priority and standard feasibility. The likely cause is not that all those suggestions are truly bad; it is that the suggestions are comparing final deterministic balances without explaining path-dependent risk, depletion age, confidence change, spending shortfall, estate trade-off, or whether the baseline is already over-funded. The output must distinguish "lower final estate but still safe" from "worse plan / depletion risk".

The reports still do not give the user a clear mortgage timeline. They should show primary residence mortgage payoff age/year, investment property loan payoff age/year, outstanding loan at retirement, interest cost, net rental cashflow, and negative-equity recovery age.

## Key output changes observed

### advanced-v2 report

The updated advanced-v2 report now shows:

- Total financial assets at retirement: **$7,299,996.15**.
- Projected final deterministic balance: **$7,282,209.84**.
- Monte Carlo success rate: **95.94%**.
- Monte Carlo median balance: **$69,350,690.01**.
- Investment property current value **$530,000**, loan **$574,000**, equity **-$44,000**, weekly rent **$554**, gross yield **5.44%**, strategy **Hold indefinitely**.

This is materially different from the previous report and shows that the new deployment changed advanced-v2 outputs.

### classic advanced report

The classic advanced report still shows:

- Lifestyle target: **$121,006**.
- Total financial assets at retirement: **$9,455,906.99**.
- Projected final deterministic balance: **$4,278,409.19**.
- Monte Carlo analysis not run.
- Overseas Portugal section is now present.

This explains why reverse still looks like it may be connected to a non-advanced-v2 projection.

### reverse report

The reverse report still looks inconsistent with the advanced-v2 report:

- Reverse total assets at retirement: **$9,455,907**.
- Reverse super at retirement: **$5,399,132**.
- Reverse sustainable income: **$278,636/year**.
- Reverse current snapshot still says **Household Single**, **salary $0**, **super $0**, **cash $0**, even while it uses imported forward projection values in the top summary.

This is still a major defect. The reverse planner should not show a zero/manual snapshot while also presenting a populated imported projection.

## Investment property issue

### Input reality

The JSON data shows:

- Investment property value: **$530,000**.
- Investment property loan: **$574,000**.
- Purchase price: **$644,900**.
- Weekly rent: **$554**.
- Annual property expenses: **$4,412** plus strata **$3,500** and land tax **$2,207**.
- Investment loan rate: **6.82%**.
- Property growth assumption: **2.75%**.
- Property type: **unit**.

The property is underwater today:

```text
Current equity = $530,000 - $574,000 = -$44,000
```

That is before selling costs. With a rough 2.5% selling cost plus fixed sale costs, sale proceeds may be about **$511,750**, leaving a loan clearance shortfall of about **$62,250**. Because purchase price is above current value, there is no CGT gain today; there is a capital loss position, but the loan still has to be repaid in cash.

At 2.75% annual growth, the property value reaches the current loan amount after roughly **3 years**, ignoring loan amortisation. It reaches purchase price after roughly **7.2 years**. If the investment property loan is principal-and-interest, amortisation may improve this; if it is interest-only, the shortfall persists until capital growth closes it.

### Current code concerns

There are two property engines and they are not fully aligned:

1. `src/js/property-analysis.js` has a separate property strategy engine. It calculates sale scenarios, remaining loan, CGT and alternative investment returns. It computes net proceeds as sale value minus selling costs minus remaining loan, then subtracts CGT. However, its scoring can still turn negative sale proceeds into a positive-looking alternative-investment comparison because `alternativeReturns.finalValue - afterTaxProceeds` can be positive even when after-tax proceeds are negative. That makes an underwater sale look attractive if not explicitly guarded.

2. `src/js/simulator.js` has the simulator-side investment property cashflow and sale logic. This path has better handling for property value, negative growth and property cycles, but the report does not expose enough of the loan/cashflow mechanics to the user.

### Required fix

Add an explicit `InvestmentPropertyPosition` calculation shared by the simulator, suggestion engine and PDF:

```js
{
  currentValue,
  purchasePrice,
  currentLoan,
  currentEquity,
  estimatedSellingCosts,
  netSaleProceedsToday,
  cashRequiredToSellToday,
  capitalGainOrLossToday,
  annualRentGross,
  annualVacancyAllowance,
  annualOperatingExpenses,
  annualInterestCost,
  annualPrincipalRepayment,
  annualNetCashflowBeforeTax,
  annualNetCashflowAfterTaxEstimate,
  loanPayoffAge,
  loanPayoffYear,
  valueExceedsLoanAge,
  valueExceedsPurchasePriceAge,
  breakEvenOnTotalCostAge,
  currentRiskLabel
}
```

Rules:

- If `currentValue < currentLoan`, label as **negative equity**.
- If `netSaleProceedsToday < 0`, show **cash required to sell today**.
- Do not rank "sell now" as a positive strategy unless the model includes the cash shortfall and shows its source.
- If selling improves retirement because it stops negative cashflow, label it as **cashflow-risk reduction**, not as a capital gain.
- If sale produces a lower final estate but improves liquidity/risk, show both.

## Suggestions calculator regression

The advanced-v2 PDF shows several recommendations with negative impact, for example:

- Accelerate mortgage by $200/month: **-$725,199.05**.
- Widowed at Age 60: **-$318,588.16**.
- Increase Australian equity to 60%: **-$434,323.18**.
- 15% salary increase: **-$278,890.09**.
- Delay lean years by 2 years: **-$826,507.10**.
- 25% salary increase: **-$771,171.43**.

Some negative values are logically possible if the metric is final estate and the scenario changes timing, taxes, drawdown, contribution caps, or stochastic returns. But the current label says these are "personalized strategies to improve your retirement outcome", so negative values create a UX and trust problem.

### Likely root causes

1. The suggestion impact appears to use a single scalar final-balance delta, not a multi-metric outcome.
2. Recommendations are not filtered out or re-labelled when impact is negative.
3. The scenario may be recomputed under slightly different stochastic/random conditions, making small or even large deltas noisy.
4. Path-dependent scenarios such as salary increase, spouse death, insurance, or mortgage acceleration can reduce estate while improving risk, cashflow or insurance protection. The report does not explain which objective is being optimised.
5. Baseline is already over-funded, so the correct recommendation may be "optional optimisation" rather than "must improve final balance".

### Required fix

Change suggestion ranking from one `impact` number to a structured result:

```js
{
  title,
  category,
  objective: "increase_estate" | "reduce_depletion_risk" | "improve_liquidity" | "reduce_debt" | "protect_family" | "tax_optimisation",
  baselineFinalBalance,
  scenarioFinalBalance,
  deltaFinalBalance,
  baselineDepletionAge,
  scenarioDepletionAge,
  deltaDepletionAge,
  baselineSuccessRate,
  scenarioSuccessRate,
  deltaSuccessRate,
  baselineMinBalance,
  scenarioMinBalance,
  amountAtRisk,
  explanation,
  recommendationStatus: "recommended" | "neutral" | "trade_off" | "not_recommended"
}
```

Display rules:

- Positive final balance and no worse risk: **Recommended**.
- Lower final balance but improved success rate/depletion age/liquidity: **Trade-off**.
- Lower final balance and no compensating benefit: **Not recommended**.
- Insurance and widowhood scenarios should not be ranked as wealth improvements unless insurance proceeds are explicitly modelled. They belong in a protection/risk section.

## Mortgage and loan visibility gaps

The reports do not currently answer:

- When is the primary home mortgage paid off?
- Is it paid off before retirement?
- How much interest remains?
- When is the investment property loan paid off?
- Is the investment property still negatively geared/cashflow negative at retirement?
- When does property value exceed loan balance?
- What is the risk if property values fall another 10%, 15%, or 20%?

Using the classic JSON values for the primary residence mortgage:

- Primary mortgage balance: **$594,000**.
- Rate: **6.12%**.
- Monthly repayment: **$4,401**.
- Approximate payoff: **19.1 years**, around age **68** for the primary user if repayments continue and rates are constant.

This is not visible in the PDF. It should be surfaced because retirement age is 71, so the primary residence mortgage may be paid off before retirement, but not by a large margin.

For the investment property, if the current $574,000 loan is modelled as a new 30-year P&I loan at 6.82%, the indicative payment is about **$3,750/month**, or **$45,000/year**. Gross rent is about **$28,808/year**. After strata, land tax and other property expenses, the property can be cashflow negative by more than **$25,000/year** before tax. The simulator may be modelling only interest plus depreciation rather than full P&I cashflow, so the PDF should disclose exactly what basis is used.

## Stochastic/historical upside issue

The simulator now has a more serious stochastic property return path than before: property returns are regime-aware, recentred around the user-entered growth rate, and adjusted for property type. Units/apartments have a lower growth adjustment than houses. That is a good direction.

But the output still does not present the upside/downside story in a user-friendly way. Add a dedicated "Historical-style stochastic range" section:

```text
Primary home value at retirement:
  P10 / Median / P90
Investment property value at retirement:
  P10 / Median / P90
Investment property equity at retirement:
  P10 / Median / P90
Worst observed drawdown path:
  Max fall, recovery year, cash shortfall
Mortgage stress:
  6.82%, 8%, 10% rate scenarios
```

Do not present a single property value line as if it is certain. The property is currently underwater, so the downside distribution matters more than the median.

## Reverse planner still not fixed

The reverse planner still uses the forward projection bridge summary in a way that can preserve the misleading sustainable-income figure. The bridge stores `monthlyPaycheck` as `summary.monthlyRetirementIncomeToday` and then `extractCurrentPathFromProjection()` maps it directly to `sustainableIncomeToday`.

That is why reverse still shows `$278,636/year` as sustainable income, while the actual lifestyle target is `$84,000/year`. The reverse report must distinguish:

- retirement spending target,
- SWR reference income,
- modelled annual withdrawals,
- sustainable income under SWR,
- deterministic portfolio survival,
- Monte Carlo confidence.

Also, the snapshot fields in reverse still show manual defaults, not imported values. Fix `_collectFromBaseline()` and/or the PDF exporter so it uses `projection.engineInputs` and `projection.canonicalInput`, not manual DOM defaults or partial baseline fields.

## PDF improvements required

Add the following sections to the advanced and advanced-v2 PDFs:

1. **Data reconciliation panel**
   - Calculator source: advanced / advanced-v2 / reverse.
   - Input hash.
   - Projection hash.
   - Build/deployment version.
   - Whether MC was run.
   - Whether scenario builder was run.

2. **Cashflow reconciliation**
   - Gross household income.
   - Estimated tax.
   - Post-tax income.
   - Monthly spending.
   - Mortgage payment.
   - Explicit investments.
   - Derived surplus.
   - Surplus allocation.

3. **Mortgage timeline**
   - Primary mortgage payoff age/year.
   - Investment property loan payoff age/year.
   - Outstanding mortgage at retirement.
   - Rate stress table.

4. **Investment property forensic table**
   - Value, loan, equity, sale costs, net sale proceeds today.
   - Cash required to sell today if negative.
   - Break-even age on loan, purchase price and total costs.
   - Net rental cashflow before and after loan costs.
   - Tax treatment assumptions.

5. **Suggestion trade-off table**
   - Baseline final balance.
   - Scenario final balance.
   - Delta final balance.
   - Depletion age.
   - Success-rate change.
   - Amount at risk.
   - Recommendation status.

6. **Reverse consistency section**
   - Imported from which calculator.
   - Imported household type.
   - Imported salary/super/cash/stocks.
   - Target income.
   - SWR reference income.
   - Actual modelled spending.

## Priority backlog

### P0 - must fix before trusting outputs

1. Reverse must import and display the same advanced-v2 projection used in the advanced-v2 PDF.
2. Reverse snapshot must stop showing salary/super/cash as zero when a projection is imported.
3. Sustainable income label must distinguish SWR reference income from actual lifestyle spending.
4. Suggestion engine must not show negative-impact items as simple "improvements".
5. Investment property negative equity must be explicit and must affect sell-now recommendations.

### P1 - high value

1. Add mortgage payoff timeline for both home and investment property.
2. Add property loan amortisation table and rate stress scenarios.
3. Add P10/median/P90 property stochastic outcomes.
4. Add report build/version/hash reconciliation.
5. Add scenario builder state to reverse PDF when not run and prompt user to run it.

### P2 - polish

1. Improve PDF formatting for long suggestion descriptions.
2. Add charts for cashflow surplus, mortgage balance and property equity.
3. Add a plain-English executive conclusion that explains trade-offs instead of just showing balances.

## Regression tests to add

1. **Investment property negative equity**
   - value 530k, loan 574k, purchase 644.9k.
   - Assert current equity is -44k.
   - Assert sale now produces cash shortfall after selling costs.
   - Assert "sell now" is not labelled as a capital-gain improvement.

2. **Suggestion negative impact classification**
   - If delta final balance < 0 and success rate does not improve, status must be `not_recommended`.
   - If delta final balance < 0 but success rate/liquidity improves, status must be `trade_off`.

3. **Reverse imported snapshot**
   - Imported advanced-v2 couple projection must render household `couple`, salary > 0, super > 0, cash > 0.
   - It must not fall back to manual defaults.

4. **Reverse projection source parity**
   - Reverse total assets at retirement must match the selected imported projection within tolerance.
   - If advanced-v2 is imported, reverse should not show classic advanced totals.

5. **Mortgage payoff**
   - Primary mortgage 594k, 6.12%, 4401/month should pay off in about 19.1 years.
   - Report must show payoff age/year and whether before retirement.

## Suggested implementation prompt

```markdown
Fix the deployed retirement calculator inconsistencies found in the 2026-06-22 post-deployment audit.

Focus areas:

1. Investment property negative equity:
   - Add a shared InvestmentPropertyPosition model.
   - Detect when current value is below current loan.
   - Include selling costs and cash required to discharge loan.
   - Do not rank sell-now as a positive capital strategy when net sale proceeds are negative.
   - Add property value-vs-loan and value-vs-purchase-price break-even ages.

2. Suggestions engine:
   - Replace single `impact` with structured baseline/scenario metrics.
   - Include delta final balance, depletion age, success-rate change, min balance and amount at risk.
   - Classify each suggestion as recommended, neutral, trade-off or not recommended.
   - Do not display negative-impact suggestions as "improve your retirement outcome" without explanation.

3. Mortgage timelines:
   - Add primary mortgage payoff age/year.
   - Add investment property loan payoff age/year.
   - Show outstanding balances at retirement.
   - Add rate stress scenarios.

4. Reverse planner:
   - Ensure reverse imports the currently selected/latest advanced-v2 projection, not stale classic advanced data.
   - Fix current snapshot to use projection.engineInputs/canonicalInput.
   - Stop showing salary, super and cash as zero for imported projections.
   - Rename sustainable income when it is SWR-derived, and separately show modelled spending/withdrawals.

5. PDF export:
   - Add calculation source, input hash, projection hash and build version.
   - Add cashflow reconciliation.
   - Add investment property forensic table.
   - Add suggestion trade-off table.
   - Add mortgage timeline.
```

