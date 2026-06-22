# Agent Implementation Spec — Engine & Reporting Fixes (4 tasks)

**Repo:** `gagneet/retirement_calculator_au`  **Base:** HEAD `eaa007e`
**Author of spec:** post-deploy audit, 22 Jun 2026
**Format:** sequential, self-contained tasks. Implement in order. Each task lists files, exact edits, tests, acceptance criteria, and boundaries.

## Conventions for the agent
- Line numbers are from HEAD `eaa007e`; **confirm the surrounding 5 lines before editing** — do not blind-apply by line number.
- Reuse existing helpers: `pct()`, `num()`, `deflateToToday()` (`utils.js:282`), the `warn()` pattern in `policy/validate-inputs.js`, `capRecommendationDelta()` (`recommendation.js:44`).
- Do **not** change return-generation maths, MC engine internals, pension logic, or country profiles in this spec — those are out of scope here.
- Every task ships with Jest tests. Tests must pass before the task is considered done.
- Keep changes additive where possible; preserve existing exports.

---

## TASK 1 — Input sanitiser (`returnDeclineRate`, return ceilings, scenario mode)

### Problem
`returnDeclineRate: 0.2` in saved inputs is interpreted at `simulator.js:1146` as a 20-percentage-point/year decline (`baseReturn − declineRate × year`), collapsing returns to the floor. The field is expected to be ~`0.0003`. Separately, saved `investmentReturn/superReturn = 0.09` and `scenarioMode:"optimistic"` bypass the corrected config defaults. A single sanitiser pass on load fixes all three and emits warnings.

### Files
- `src/js/normalise-inputs.js` (extend; FX normalisation already lives here)
- `src/js/policy/validate-inputs.js` (emit warnings)
- consumed by whatever calls `normaliseInputs` before `runSimulation`

### Edit 1.1 — add `sanitiseInputs` to `normalise-inputs.js`
```js
// --- Plausibility sanitiser. Runs AFTER unit normalisation, BEFORE simulation. ---
// Returns { inputs, warnings:[{field, severity, message, from, to}] }.
export const RETURN_CEILING   = 0.105;   // nominal; above this is implausible long-run
export const RETURN_OPTIMISTIC = 0.085;  // above this: keep but warn
export const DECLINE_MAX      = 0.02;    // 2%/yr is already aggressive; 0.2 is a units error
export const DECLINE_DEFAULT  = 0.0003;

export function sanitiseInputs(input, config = {}) {
  const inputs = { ...input };
  const warnings = [];
  const flag = (field, from, to, severity, message) => {
    inputs[field] = to;
    warnings.push({ field, from, to, severity, message });
  };

  // 1) returnDeclineRate: anything > DECLINE_MAX is almost certainly mis-scaled.
  const decline = num(inputs.returnDeclineRate, DECLINE_DEFAULT);
  if (decline > DECLINE_MAX) {
    flag('returnDeclineRate', decline, DECLINE_DEFAULT, 'error',
      `returnDeclineRate ${decline} implies returns fall ${(decline*100).toFixed(0)}pp/yr ` +
      `(non-physical). Reset to ${DECLINE_DEFAULT}. If you intended a real decline, enter a value ≤ ${DECLINE_MAX}.`);
  }

  // 2) Return ceilings (handle all aliases used across pages).
  for (const f of ['investmentReturn', 'superReturn', 'invReturn', 'superGrowth']) {
    if (inputs[f] == null) continue;
    const r = pct(inputs[f], null);
    if (r == null) continue;
    if (r > RETURN_CEILING) {
      const fallback = (f.startsWith('super') ? config.DEFAULT_SUPER_RETURN : config.DEFAULT_EQUITY_RETURN) ?? 0.075;
      flag(f, r, fallback, 'error',
        `${f} ${(r*100).toFixed(1)}% exceeds the ${(RETURN_CEILING*100)}% plausibility ceiling; using ${(fallback*100).toFixed(1)}%.`);
    } else if (r > RETURN_OPTIMISTIC) {
      warnings.push({ field: f, from: r, to: r, severity: 'warning',
        message: `${f} ${(r*100).toFixed(1)}% is optimistic for a long-run base case.` });
    }
  }

  // 3) Headline scenario mode: the headline projection runs 'base'; the saved mode is
  //    preserved separately for the explicit optimistic/pessimistic band view.
  inputs.headlineScenarioMode = 'base';
  if ((inputs.scenarioMode || 'base') !== 'base') {
    warnings.push({ field: 'scenarioMode', from: inputs.scenarioMode, to: 'base', severity: 'warning',
      message: `Headline projection forced to 'base'; '${inputs.scenarioMode}' is shown only as a band.` });
  }

  return { inputs, warnings };
}
```

### Edit 1.2 — call it on the load path
At the point where inputs are normalised before simulation (the existing `normaliseInputs(...)` call site), wrap with:
```js
const { inputs: sane, warnings: sanitiseWarnings } = sanitiseInputs(normalised, CONFIG);
// merge sanitiseWarnings into the warnings already surfaced by validate-inputs
```
Ensure the simulator reads `inputs.headlineScenarioMode` for the headline run (`simulator.js:1348` `_getScenarioAdjustments(inputs.scenarioMode || 'baseline')` → `inputs.headlineScenarioMode ?? 'baseline'`), and the optimistic/pessimistic **band** view still passes the original `scenarioMode`.

### Edit 1.3 — surface warnings
Render `sanitiseWarnings` through the same non-blocking warning UI added in the earlier `validate-inputs` work (amber, dismissible).

### Tests — `test/sanitise-inputs.test.js`
```js
import { sanitiseInputs } from '../src/js/normalise-inputs.js';
test('returnDeclineRate 0.2 is reset to default with an error', () => {
  const { inputs, warnings } = sanitiseInputs({ returnDeclineRate: 0.2 }, {});
  expect(inputs.returnDeclineRate).toBeCloseTo(0.0003);
  expect(warnings.find(w => w.field === 'returnDeclineRate').severity).toBe('error');
});
test('9% return is clamped below the ceiling', () => {
  const { inputs } = sanitiseInputs({ superReturn: 0.12 }, { DEFAULT_SUPER_RETURN: 0.075 });
  expect(inputs.superReturn).toBeLessThanOrEqual(0.105);
});
test('optimistic scenarioMode forced to base for headline', () => {
  const { inputs } = sanitiseInputs({ scenarioMode: 'optimistic' }, {});
  expect(inputs.headlineScenarioMode).toBe('base');
});
```

### Acceptance
- Loading the current `retirement-inputs-2026-06-22` JSON yields `returnDeclineRate ≈ 0.0003`, headline mode `base`, and at least 2 warnings.
- Deterministic final balance becomes stable across reloads (no $2.38M↔$7.28M swing).

### Boundaries
Do **not** silently rewrite the saved file; sanitise the in-memory copy only. Do not remove the user's ability to view an explicit optimistic band.

---

## TASK 2 — Investment-property net position + capital-loss carry-forward

### Problem
The IP sale maths is correct (CGT `$0` on a loss at `utils.js:937`; negative `netProceeds` correctly subtracted at `simulator.js:2010`), but (a) the report shows only **gross** yield (5.44%) and hides that the property is **negatively geared (~−$21k/yr)** and **below purchase price**, and (b) a **capital loss is not carried forward** to offset future gains.

### Files
- `src/js/simulator.js` (sale block ~`975-1045`; sale consumer ~`2010`)
- report payload builder (where property metrics are assembled for the PDF/UI)

### Edit 2.1 — compute and return the net rental position
In the property cash-flow section (near `simulator.js:927-933` where `annualInterest` is computed), add:
```js
const grossRent      = num(inputs.weeklyRentalIncome) * 52 * (1 - num(inputs.vacancyRate, 0));
const cashExpenses   = num(inputs.annualPropertyExpenses)
                     + num(inputs.investmentPropertyStrataLevy)
                     + num(inputs.landTax);
const netRentalCash  = grossRent - annualInterest - cashExpenses;     // negative => negatively geared
const grossYield     = (num(inputs.weeklyRentalIncome) * 52) / num(inputs.investmentPropertyValue);
const isNegativelyGeared = netRentalCash < 0;
const belowPurchase  = num(inputs.investmentPropertyValue) < num(inputs.investmentPropertyPurchasePrice, 0);
```
Thread `netRentalCash`, `grossYield`, `isNegativelyGeared`, `belowPurchase` into the property-analysis object that feeds the report.

### Edit 2.2 — capital-loss carry-forward pool
At simulation scope (where the year loop is set up), initialise `let capitalLossPool = 0;`. In the sale block, replace the CGT computation so a loss is banked and future gains are offset first:
```js
let taxableGain = capitalGain;                 // capitalGain = saleValue - propertyCostBase
let capitalLossRealised = 0;
if (taxableGain < 0) {
  capitalLossRealised = -taxableGain;
  capitalLossPool += capitalLossRealised;      // bank the loss
  taxableGain = 0;
} else if (capitalLossPool > 0) {
  const offset = Math.min(capitalLossPool, taxableGain);
  taxableGain -= offset;
  capitalLossPool -= offset;
}
// feed taxableGain (not raw capitalGain) into calculateCGT / calculateCGTPost2027
```
Use `taxableGain` in place of the raw gain when calling `calculateCGT(...)`. (Note: `calculateCGT` already floors ≤0 at `utils.js:937`, so passing `taxableGain` is safe.)

### Edit 2.3 — settlement shortfall flag
After `const netProceeds = saleValue - remainingLoan - sellingCosts - cgtPayable;`, add:
```js
const settlementShortfall = netProceeds < 0 ? -netProceeds : 0;  // cash needed to discharge the loan
```
Return `settlementShortfall`, `capitalLossRealised` in the sale result. At the consumer (`simulator.js:2010`), the existing `accumulatedInvestmentPortfolio += saleResult.netProceeds;` is correct (it already deducts a negative); add a guard/log if it pushes the portfolio below zero so the report can show a forced cash call.

### Report
Add to the Investment Property Analysis section: **Net rental (after interest & costs): −$X/yr (negatively geared)**, **Below purchase price: yes (−$Y)**, and on a "Sell now" suggestion, **Settlement shortfall: $Z cash required**.

### Tests — `test/property-cgt.test.js`
```js
test('capital loss yields zero CGT and banks the loss', () => {
  // value 530k, costBase 644.9k → loss 114.9k
  // assert cgtPayable === 0 and capitalLossPool increased by ~114900
});
test('banked loss offsets a later gain before tax', () => {
  // after a 114.9k loss, a later 100k gain should be fully offset → CGT 0, pool 14.9k remaining
});
test('negative netProceeds reduces the portfolio (no floor)', () => {
  // loan 574k > value 530k → settlementShortfall > 0, portfolio decreases on sale
});
```

### Acceptance
- Report shows the **net** (negative) rental position and "below purchase price", not just 5.44% gross.
- Selling at a loss charges $0 CGT, banks the loss, and a subsequent gain is offset.
- Selling underwater reduces liquid assets by the shortfall.

### Boundaries
Do not change `calculateCGT` signature or the 50%-discount logic. Capital losses offset **capital gains only**, never ordinary income.

---

## TASK 3 — Suggestion depletion / amount-at-risk + risk-based ranking

### Problem
`suggestions-ui.js:49-50` renders `band.depletionAge`, but `recommendation.js` never populates a `band`, so it never shows. With a non-depleting base, suggestions are ranked purely on terminal-balance delta (hence meaningless negatives). Add risk metrics and rank by them.

### Files
- `src/js/recommendation.js` (per-suggestion evaluation ~`2117`)
- `src/js/suggestions-ui.js` (render + sort)

### Edit 3.1 — compute a `band` per suggestion
Where each suggestion's simulated result is available (alongside `rawBalanceDiff`/`capRecommendationDelta` at `recommendation.js:2117`), compute:
```js
// depletionAge: first projection age where liquid balance <= 0 (deterministic/median path)
function firstDepletionAge(yearly, startAge) {
  for (let i = 0; i < yearly.length; i++) {
    if (yearly[i].endBalance <= 0) return startAge + i;
  }
  return null; // survives the plan
}

// amountAtRisk (today's $): unfunded lifetime spending in the 10th-percentile path.
// If p10 never depletes, 0. Otherwise sum of (plannedSpend - availableFunds) over depleted years.
function amountAtRisk(p10Yearly, inflation) {
  let risk = 0;
  for (const y of p10Yearly) {
    if (y.shortfall > 0) risk += deflateToToday(y.shortfall, y.yearsAhead, inflation);
  }
  return Math.max(0, risk);
}

const band = {
  depletionAge: firstDepletionAge(suggestionResult.yearly, startAge),
  amountAtRisk: amountAtRisk(suggestionResult.p10Yearly ?? [], inflation),
  successRate:  suggestionResult.successRate ?? null,
  balanceDelta: capRecommendationDelta(rawBalanceDiff, baseResult.medianBalance),
};
rec.band = band;
```
If `p10Yearly` is not readily available per suggestion, approximate `amountAtRisk` from the deterministic path under a stress shock, and label it as such — but prefer the MC p10 when present.

### Edit 3.2 — rank by risk, not terminal balance
In `suggestions-ui.js` (sorting near `:365`/`:720`), replace terminal-delta sort with:
```js
function riskRank(a, b) {
  // 1) higher success rate first
  if ((b.band?.successRate ?? 0) !== (a.band?.successRate ?? 0))
    return (b.band?.successRate ?? 0) - (a.band?.successRate ?? 0);
  // 2) later/never depletion first (null = never = best)
  const da = a.band?.depletionAge ?? Infinity, db = b.band?.depletionAge ?? Infinity;
  if (db !== da) return db - da;
  // 3) lower amount-at-risk first
  if ((a.band?.amountAtRisk ?? 0) !== (b.band?.amountAtRisk ?? 0))
    return (a.band?.amountAtRisk ?? 0) - (b.band?.amountAtRisk ?? 0);
  // 4) tie-break on balance delta
  return (b.band?.balanceDelta ?? 0) - (a.band?.balanceDelta ?? 0);
}
recs.sort(riskRank);
```

### Edit 3.3 — relabel the delta
For a suggestion whose `successRate`/`depletionAge` is unchanged vs base but `balanceDelta < 0`, render it neutrally:
> "No change to depletion risk; forgoes ${fmt(-balanceDelta)} of terminal balance."
Reserve red styling for suggestions that **worsen** depletion age or success rate, not merely terminal balance.

### Edit 3.4 — render the band
The slot at `suggestions-ui.js:49-50` already renders `band.depletionAge`. Add lines for `amountAtRisk` (today's $) and `successRate`.

### Tests — `test/suggestion-band.test.js`
```js
test('depletionAge is null when the plan survives', () => { /* survives → null → "never" */ });
test('amountAtRisk is 0 when p10 never depletes', () => { /* assert 0 */ });
test('risk rank prefers higher success then later depletion', () => {
  const recs = [{band:{successRate:0.9,depletionAge:88}}, {band:{successRate:0.97,depletionAge:null}}];
  recs.sort(riskRank);
  expect(recs[0].band.successRate).toBe(0.97);
});
```

### Acceptance
- Each suggestion shows depletion age (or "never"), amount-at-risk (today's $), and success rate.
- Negative terminal deltas that don't change risk are shown neutrally, not as red losses.
- Ordering is by risk, with terminal delta as a tie-break.

### Boundaries
Do not alter `capRecommendationDelta`. Do not fabricate `successRate`/`p10` — if a metric is unavailable for a suggestion, render "—" and exclude it from that sort key.

---

## TASK 4 — Mortgage payoff age + 10/50/90 outcome band in the report

### Problem
`mortgagePayoffAge` is computed (`simulator.js:2947-2962`) but never rendered. The stochastic upside (MC p90) exists but is shown only as an inflated raw number. Surface both, deflated to today's dollars, with payoff and depletion markers.

### Files
- `src/js/simulator.js` (ensure `mortgagePayoffAge`, MC `p10/p50/p90` paths are in the result payload)
- report builder (comprehensive PDF; v2 if data available)

### Edit 4.1 — expose payoff age
Ensure the simulation result includes `mortgagePayoffAge` (and `mortgagePayoffYear = currentCalendarYear + (mortgagePayoffAge - yourCurrentAge)`). Render in the Executive Summary:
> "Mortgage cleared at age {mortgagePayoffAge} ({mortgagePayoffYear})."
If `mortgagePayoffAge === null`, render "Mortgage not cleared within the plan."

### Edit 4.2 — outcome band (today's $)
Build a small series from MC percentile paths, deflated:
```js
const band = years.map((y, i) => ({
  age: startAge + i,
  p10: deflateToToday(p10Path[i], i, inflation),
  p50: deflateToToday(p50Path[i], i, inflation),
  p90: deflateToToday(p90Path[i], i, inflation),
}));
```
Render as a "Downside / Median / Upside (today's $)" fan with two vertical markers: **mortgage cleared (age N)** and, if `p10` depletes, **downside depletion (age M)**. Cap the axis at the plan horizon.

### Edit 4.3 — summary line
Add to the plan summary:
> "Range of outcomes at end of plan (today's $): downside {p10}, median {p50}, upside {p90}."
These must be **deflated** — do not print the nominal $69M/$126M figures as the headline.

### Tests — `test/report-band.test.js`
```js
test('mortgage payoff age renders when within plan', () => { /* age set → string contains "cleared at age" */ });
test('band values are deflated (today < nominal)', () => {
  // assert band p90 (today's $) < raw nominal p90
});
```

### Acceptance
- Executive Summary shows mortgage payoff age/year.
- Outcome band is in today's dollars with payoff (and any downside-depletion) marked.
- No undeflated 8-figure MC numbers appear as headline values.

### Boundaries
Do not change MC sampling or percentile computation — only read existing `p10/p50/p90` and deflate for display. If percentile **paths** (not just final values) aren't stored, add storage minimally without changing the sampling.

---

## Final verification checklist (run after all four tasks)
1. `npm test` green, including the four new test files and the existing reconciliation oracle.
2. Load `retirement-inputs-2026-06-22` → deterministic final balance stable on reload; warnings show `returnDeclineRate` reset and optimistic-return/scenario notices.
3. Comprehensive PDF: IP section shows net (negative) rental + below-purchase; suggestions show depletion age / amount-at-risk and risk-ordered; Executive Summary shows mortgage payoff age and a deflated 10/50/90 band.
4. Re-run the reconciliation: MC median should now sit a modest multiple above deterministic (not 25×); if it doesn't, the return-path unification (separate spec, TASK B3 in the prior audit) is still outstanding — flag it, do not paper over it here.

## Out of scope (tracked separately)
- Unifying the deterministic vs Monte-Carlo **return path** (the 25× median gap) — prior audit §B3.
- Survivor-state per-year trigger at first death — prior audit §B4.
- Reverse-report snapshot data-binding (age/super showing zeros) — prior audit §3.2.
- v1 advanced overseas "Country N/A" binding — prior audit §C4.

