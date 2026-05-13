# Calculation Audit — Bug Report & Budget 2026-27 Changes

**Audit date:** 2026-05-13  
**Auditor:** OpenCode analysis  
**Scope:** `src/js/simulator.js`, `src/js/utils.js`, `src/js/app.js`, `src/js/config.js`,  
`src/js/simulation_engine/tax_engine.js`, `src/js/simulation_engine/pension_engine.js`

---

## Root Cause Pattern

The application uses a **two-stage percentage parsing** convention:

1. HTML inputs store percentages in human-readable form (e.g. `value="3.82"` for 3.82 %)  
2. `app.js → collectInputs()` converts them to decimals with `/100` before passing to the simulator  
3. Several functions inside `simulator.js` then divide **again** by 100, producing values 100× too small

This "double-divide" pattern affects multiple fields and produces either severely understated or overstated projected amounts.

---

## Bug 1 — Tax Bracket Off-by-One (NEGLIGIBLE)

| | |
|---|---|
| **File** | `src/js/utils.js:504–518` (`calculateAustralianTax`) |
| **Severity** | Negligible (cents level) |
| **Status** | Fixed in this commit |

### Description

ATO brackets are defined with a 1-dollar gap between consecutive bands:

```js
{ min: 0,     max: 18200, rate: 0    },   // width 18 200
{ min: 18201, max: 45000, rate: 0.16 },   // width 26 799  ← should be 26 800
```

The loop computes taxable width as `bracket.max - bracket.min`, which gives 26 799 instead of
26 800 for the second bracket. Income sitting at a boundary (e.g. exactly $45 000) has its final
$1 taxed in the next-higher bracket.

### Impact

Over-charge of $0.14–$0.52 per taxpayer per bracket crossed. Immaterial for projection purposes.

### Fix

Replace `bracket.max - bracket.min` with `bracket.max - bracket.min + 1` for every non-zero-minimum
bracket, or redefine max/min to be contiguous (max = next min − 1).

---

## Bug 2 — `salaryGrowthRate` Double-Divided (HIGH)

| | |
|---|---|
| **File** | `src/js/simulator.js:575` (`getSalaryForYear`) |
| **Severity** | HIGH |
| **Status** | Fixed in this commit |

### Description

```js
// inputs.salaryGrowthRate is already decimal (0.015 = 1.5 %) after app.js /100
const realGrowthRate = inputs.salaryGrowthRate / 100;   // ← BUG: 0.015/100 = 0.00015
let salary = baseSalary * Math.pow(1 + realGrowthRate + inflationRate, year);
```

### Impact

At $164 000 salary over 19 years to retirement:

| | Final salary |
|---|---|
| **Correct** (1.5 % real + 2.6 % inflation = 4.1 % nominal) | ~$352 000 |
| **Actual** (0.0015 % real + 2.6 % nominal) | ~$268 000 |
| **Under-stated by** | ~$84 000 |

Super contributions (12 % of salary) are proportionally understated every year, reducing
the accumulated super balance at retirement.

### Fix

Remove the `/100` in `getSalaryForYear`:

```js
const realGrowthRate = inputs.salaryGrowthRate;   // already decimal
```

---

## Bug 3 — `leanYearsReduction` Double-Divided (HIGH)

| | |
|---|---|
| **File** | `src/js/simulator.js:582` (`getSalaryForYear`) |
| **Severity** | HIGH |
| **Status** | Fixed in this commit |

### Description

```js
// inputs.leanYearsReduction = 0.38 (38 % as decimal)
salary *= (1 - inputs.leanYearsReduction / 100);   // ← BUG: 1 - 0.0038 = only 0.38% reduction
```

### Impact

| | Salary in lean years |
|---|---|
| **Correct** (38 % reduction) | $124 000 from $200 000 |
| **Actual** (0.38 % reduction) | $199 240 from $200 000 |

Lean years have virtually no effect on the simulation. Pre-retirement savings are overstated.

### Fix

```js
salary *= (1 - inputs.leanYearsReduction);   // already decimal
```

---

## Bug 4 — `healthcareInflation` Double-Divided (MODERATE)

| | |
|---|---|
| **File** | `src/js/simulator.js:410, 417, 1183` (`projectHealthcareCosts`, `calculateAgedCareCosts`) |
| **Severity** | Moderate |
| **Status** | Fixed in this commit |

### Description

```js
// inputs.healthcareInflation = 0.0382 (3.82 % as decimal)
return currentCosts * Math.pow(1 + healthcareInflation / 100, years);  // ← BUG: 0.000382/yr
```

### Impact

| Scenario | Healthcare at age 69 (20 yrs) |
|---|---|
| **Correct** (3.82 %/yr) | ~$7 408 |
| **Actual** (0.0382 %/yr) | ~$3 527 |
| **Under-stated by** | ~$3 881 /yr |

Both ongoing healthcare costs and aged care costs are significantly understated.

### Fix

Remove `/100` in all three call sites:

```js
return currentCosts * Math.pow(1 + healthcareInflation, years);
```

---

## Bug 5 — CGT Double-Discount (HIGH for property sellers)

| | |
|---|---|
| **File** | `src/js/utils.js:563–571` (`calculateCGT`) |
| **Severity** | HIGH |
| **Status** | Fixed in this commit |

### Description

`capitalGainsTaxRate` is stored and displayed as the **effective rate** — i.e. the marginal rate
already multiplied by the 50 % CGT discount:

```js
// app.js refreshCapitalGainsTaxDefault():
const cgtRate = marginalRate * 0.5;   // e.g. 45 % × 50 % = 22.5 % (effective rate)
```

But `calculateCGT()` applies the 50 % discount **again**:

```js
const taxableGain = discountApplies ? capitalGain * 0.5 : capitalGain;   // 50 % discount
return taxableGain * marginalTaxRate;   // marginalTaxRate is actually the effective rate!
```

### Impact

| Scenario | CGT on $400k gain at 22.5 % effective rate |
|---|---|
| **Correct** | $90 000 |
| **Actual** | $45 000 |

Net sale proceeds from investment property are overstated by $45 000 in this example.
The projected retirement balance is inflated whenever a property is sold.

### Fix

`calculateCGT` should receive and use the effective (post-discount) rate directly, without
re-applying the 50 % discount internally:

```js
export const calculateCGT = (salePrice, purchasePrice, isResident, holdingPeriod, effectiveCGTRate) => {
    const capitalGain = salePrice - purchasePrice;
    if (capitalGain <= 0) return 0;
    // effectiveCGTRate already incorporates the 50 % discount (applied in app.js)
    return capitalGain * effectiveCGTRate;
};
```

---

## Bug 6 — `returnDeclineRate` Double-Divided (LOW)

| | |
|---|---|
| **File** | `src/js/simulator.js:633` (`getReturnForYear`) |
| **Severity** | Low |
| **Status** | Fixed in this commit |

### Description

```js
// inputs.returnDeclineRate = 0.0003 (0.03 % as decimal)
return Math.max(minReturn, baseReturn - (declineRate / 100) * year);   // ← BUG
```

The division makes the per-year decline 100× weaker than intended.

### Impact

| Year 20 return reduction | |
|---|---|
| **Correct** | 0.6 % less return |
| **Actual** | 0.006 % less return |

Because the decline rate is tiny by design, this has minimal real-world impact but is
inconsistent with the contract of the function.

### Fix

```js
return Math.max(minReturn, baseReturn - declineRate * year);   // already decimal
```

---

## Bug 7 — Primary Home Grows at `inflation` Not `propertyGrowthRate` (HIGH)

| | |
|---|---|
| **File** | `src/js/simulator.js:1109` (pre-retirement) and `1505–1506` (in-retirement) |
| **Severity** | HIGH |
| **Status** | Fixed in this commit |

### Description

The primary home value at retirement is projected using general CPI inflation rather than
the property-specific growth rate:

```js
// Pre-retirement (line 1109)
const homeValueAtRetirement = inputs.homeValue
    * Math.pow(1 + inputs.inflation, yearsToRetirement);   // ← should use propertyGrowthRate

// In-retirement equity (line 1505-1506)
const currentHomeEquity = homeEquityAtRetirement
    * Math.pow(1 + inputs.inflation, yearsFromRetirement);   // ← same issue
```

### Impact

| $1 M home over 20 years | |
|---|---|
| **Using inflation** (2.6 %/yr) | $1.67 M |
| **Using property growth** (5.8 %/yr) | $3.09 M |
| **Under-stated by** | ~$1.4 M |

This also reduces accessible downsizer equity (70 % of home equity) by ~$980 000 in the
above example.

### Fix

```js
const homeValueAtRetirement = inputs.homeValue
    * Math.pow(1 + inputs.propertyGrowthRate, yearsToRetirement);

// In-retirement (use same rate):
const currentHomeEquity = homeEquityAtRetirement
    * Math.pow(1 + inputs.propertyGrowthRate, yearsFromRetirement);
```

---

## Bug 8 — `agedCareProbability` Double-Divided (DISPLAY ONLY)

| | |
|---|---|
| **File** | `src/js/simulator.js:419` (`calculateAgedCareCosts`) |
| **Severity** | Low — display value only |
| **Status** | Fixed in this commit |

### Description

```js
// inputs.agedCareProbability = 0.22 (22 % as decimal)
const probability = inputs.agedCareProbability / 100;   // ← BUG: 0.0022
```

The probability is only used to compute `expectedCost = totalCost * probability`, which
is a summary display value and **does not feed the live simulation loop**. Actual aged care
costs in the simulation are triggered purely by age range (`agedCareStartAge` to
`agedCareStartAge + agedCareDuration`) without using this probability.

### Fix

```js
const probability = inputs.agedCareProbability;   // already decimal
```

---

## Budget 2026-27 Tax Changes

Source: <https://budget.gov.au/content/02-cost-of-living.htm>  
        <https://budget.gov.au/content/04-tax-reform.htm>

### 1. Additional income tax rate cuts (legislated)

| Financial Year | Rate on $18 201–$45 000 | Change |
|---|---|---|
| 2025–26 (current) | **16 %** | — |
| 2026–27 (1 Jul 2026) | **15 %** | −1 pp |
| 2027–28 (1 Jul 2027) | **14 %** | −2 pp |

Already partially modelled: `TAX_BRACKETS_2026_27` exists in `config.js` with 15 %. The
2027-28 bracket at 14 % was **not** modelled prior to this update.

### 2. Working Australians Tax Offset (WATO) — from FY 2027-28

- Permanent annual offset of **up to $250** for all working Australians.
- Applies from 2027–28 income year onward.
- Phases out at high income (97 % of workers receive the full $250).
- Increases effective tax-free threshold by ~$1 800 to $19 985 (or $24 985 with LITO).

### 3. $1 000 Instant Tax Deduction — from FY 2026-27

- Workers can deduct **$1 000** from taxable income (work-related expenses) without receipts.
- Average tax saving $205 for 2026–27.
- At 30 % marginal rate this saves **$300/year**; at 16 %/$15 % it saves $160/$150.

### 4. Capital Gains Tax reform — from 1 Jul 2027

| Aspect | Current | From 1 Jul 2027 |
|---|---|---|
| Discount method | Flat 50 % discount | Inflation-indexed discount (real gain only) |
| Minimum tax | None | **30 % minimum** on the gain |
| Applies to | All assets | Gains accrued **after** 1 Jul 2027 |
| New builds | N/A | Can choose either method |

For modelling purposes the pre-reform 50 % discount continues to apply to gains accrued
before 1 Jul 2027. Post-reform gains use the inflation-indexed method with a 30 % floor.
This is modelled conservatively by splitting gains proportionally between pre- and
post-reform periods.

### 5. Negative Gearing restriction — from 1 Jul 2027

- **New rule:** Losses on **established** housing purchased after Budget night (13 May 2026)
  can only be offset against *residential property income*, not wages/other income.
- Unused losses carry forward but cannot be deducted from non-property income.
- **Grandfathered:** All properties held before Budget night keep existing treatment.
- **New builds** remain fully negatively geared.

Impact on the calculator: investment property cash-flow projections should flag when the
property is an established purchase post-Budget and the loss-offsetting benefit is limited.

### 6. Discretionary Trust minimum tax — from 1 Jul 2028

- Minimum **30 %** tax on distributions from discretionary trusts.
- Rollover relief 2027–2030 for restructuring.
- Modelled in the trust tax rate field (default will update to 30 %).

---

## Summary Table

| Bug # | Field | File | Severity | Fixed |
|---|---|---|---|---|
| 1 | Tax bracket boundary | utils.js:507–518 | Negligible | ✅ |
| 2 | `salaryGrowthRate` | simulator.js:575 | **HIGH** | ✅ |
| 3 | `leanYearsReduction` | simulator.js:582 | **HIGH** | ✅ |
| 4 | `healthcareInflation` | simulator.js:410,417,1183 | Moderate | ✅ |
| 5 | `capitalGainsTaxRate` | utils.js:568 | **HIGH** | ✅ |
| 6 | `returnDeclineRate` | simulator.js:633 | Low | ✅ |
| 7 | Home value growth rate | simulator.js:1109,1506 | **HIGH** | ✅ |
| 8 | `agedCareProbability` | simulator.js:419 | Low (display) | ✅ |

| Budget 2026-27 Item | Implemented |
|---|---|
| 15 % rate from 1 Jul 2026 | ✅ (was already in TAX_BRACKETS_2026_27) |
| 14 % rate from 1 Jul 2027 | ✅ TAX_BRACKETS_2027_28 added |
| WATO $250 offset from FY2027-28 | ✅ calculateWATO() added |
| $1 000 instant tax deduction from 2026-27 | ✅ modelled as $1 000 taxable income reduction |
| CGT reform (inflation-indexed + 30 % min) from 1 Jul 2027 | ✅ calculateCGT() updated |
| Negative gearing restriction from 1 Jul 2027 | ✅ warning flag + carry-forward modelling |
| Discretionary trust 30 % minimum tax from 1 Jul 2028 | ✅ trustTaxRate default updated |
