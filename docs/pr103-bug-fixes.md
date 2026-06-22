# PR #103 Code Review — Confirmed Bug Fixes

**Branch**: `fix/calculator_trustworthiness_json_reconciliation`
**Reviewed**: 2026-06-22
**Source**: Automated multi-angle code review (8 angles × 6 candidates, verified)

---

## Bug #1 — HIGH: CGT Post-2027 wrong cost-base in `calculatePropertySale`

**File**: `src/js/simulator.js` line 1036  
**Status**: CONFIRMED

### Root cause
`calculateCGTPost2027(saleValue, saleValue - capitalLoss.taxableGain, ...)` passes a synthetic "adjusted purchase price" instead of `propertyCostBase`. Inside `calculateCGTPost2027`, the second argument is used **both** to compute `totalGain = salePrice - purchasePrice` AND to compute the inflation-indexed cost base `indexedBase = purchasePrice × (1+inflation)^years`. The synthetic value corrupts the inflation indexation, understating the real gain and producing lower CGT than legally required.

### Impact
Only triggers when: (a) user has enabled proposed Budget 2026-27 measures AND (b) the sale year is after 2027 AND (c) there is an opening capital-loss pool. The current-law `calculateCGT` path at line 1049 is NOT affected — that path is correct.

### Fix
Pass `propertyCostBase` as the purchase price (for correct indexation) and scale the resulting CGT proportionally by `taxableGain / capitalGain` to account for the loss pool offset.

---

## Bug #2 — HIGH: Negative `netSaleProceedsToday` corrupts `currentStocks` in recommendations

**File**: `src/js/recommendation.js` lines 394 and 665  
**Status**: CONFIRMED (two instances)

### Root cause
Both property-sale recommendation scenarios add `propertyPosition.netSaleProceedsToday` to `currentStocks` unconditionally. For an underwater investment property (loan > value + selling costs + CGT), `netSaleProceedsToday` is negative. Adding a negative value produces a negative stock portfolio, which corrupts the entire simulation run for that recommendation scenario.

### Instance A (line 394): "Sell Investment Property Immediately"
```js
currentStocks: this.baseInputs.currentStocks + saleProceeds  // saleProceeds can be < 0
```

### Instance B (line 665): "Sell Investment Property for Super Boost"
```js
currentStocks: this.baseInputs.currentStocks + netProceeds  // netProceeds can be < 0
```

### Fix
Clamp the modification to `Math.max(0, saleProceeds)`. A negative-equity sale produces no reinvestable capital; the simulation should model removing the property burden with zero proceeds injected into the portfolio.

---

## Bug #3 — MEDIUM: `evaluateSaleTiming` missing `capitalLossPool` argument

**File**: `src/js/app.js` line 5403  
**Status**: CONFIRMED

### Root cause
`calculatePropertySale` was updated to accept a third argument `openingCapitalLossPool` (default 0). The main simulation loop at `simulator.js:2052` correctly passes `capitalLossPool`. However, `evaluateSaleTiming` in `app.js` still calls `calculatePropertySale(inputs, saleYear)` with only two arguments, silently using pool=0.

### Impact
Any accrued capital losses are excluded from the CGT calculation in property-timing comparisons. CGT is overstated in the "optimal sale year" comparison, making some sale years look worse than they actually are.

### Fix
Thread `capitalLossPool` from the enclosing simulation context into `evaluateSaleTiming`, or accept it as an argument.

---

## Bug #4 — MEDIUM: `deflateToToday` uses `retirementAge` fallback instead of lifespan

**File**: `src/js/utils.js` lines 2070–2072  
**Status**: CONFIRMED

### Root cause
```js
Math.max(0, (inputs.yourLifespan || inputs.retirementAge || 90) - inputs.yourCurrentAge)
```
When `inputs.yourLifespan` is 0 or absent, this falls back to `inputs.retirementAge`. MC final balances are at end-of-life (lifespan), so the deflation horizon should always be `lifespan - currentAge`. Using `retirementAge` (e.g. 67) instead of lifespan (e.g. 90) deflates over too few years.

### Impact
For a user aged 45 retiring at 65 with lifespan 90: horizon = 65-45 = 20 years instead of 45 years. The "today's $" MC values are over-stated by factor `(1.026^45)/(1.026^20) ≈ 1.9×` — nearly double the correct real-terms value — making the PDF look ~90% more optimistic.

### Fix
Replace fallback chain with explicit lifespan-or-90 default:
```js
const lifespanHorizon = Math.max(0, (inputs.yourLifespan || 90) - (inputs.yourCurrentAge || 0));
```
Never fall back to `retirementAge` — the MC balances are at end-of-life, not retirement.

---

## Bug #5 — MEDIUM: `validateProjectionSnapshot` hash check is a tautology

**File**: `src/js/forward-projection-bridge.js` line 222  
**Status**: CONFIRMED

### Root cause
`extractProjectionSnapshot(payload)` copies `payload.inputHash` directly into `snapshot.inputHash` (line 198). Then `validateProjectionSnapshot` checks:
```js
if (payload.inputHash && snapshot.inputHash !== payload.inputHash)
```
Since `snapshot.inputHash` was set to `payload.inputHash`, this condition is **always false**. The integrity check that is supposed to catch stale or mismatched projections never fires.

### Fix
The hash check should compare the snapshot hash against a freshly computed hash of the current engine inputs, not against the snapshot's own copy of the payload hash. Since we don't recompute here, remove this tautological check and add a warning if `snapshot.inputHash` is null (meaning no hash was ever stored).

---

## Bug #6 — LOW: Double median row in PDF Monte Carlo table

**File**: `src/js/utils.js` line 2069  
**Status**: CONFIRMED

### Root cause
When the real-terms rows (`'Median (today\'s $)'`) were added, the nominal `'Median Final Balance (nominal)'` row was not removed. The PDF now shows two rows with "Median" in the label with different dollar values and no explanation of the difference.

### Fix
Remove the `'Median Final Balance (nominal)'` row, replacing it with the real-terms median. The `'Median (today\'s $)'` row is more useful in a financial planning context and is already present.

---

## Bug #7 — MEDIUM: `returnDeclineRate` legacy import amplification in advanced-v2

**File**: `src/js/advanced-v2.js` line 1799  
**Status**: PLAUSIBLE (edge case for old JSON exports)

### Root cause
`normalizeImportedUserData` applies `toDisplayPercent()` (×100) to `returnDeclineRate` from the JSON. Then `buildEngineInputs` divides by 100. For current-format decimal JSON values (e.g. `0.002`), this round-trips correctly: `toDisplayPercent(0.002) = 0.2 → /100 = 0.002`. 

For hypothetical old-format values stored as display-percent (e.g. `0.2` meaning 0.2%/yr): `toDisplayPercent(0.2) = 20 → /100 = 0.2` — a 100× amplification producing a 20%/yr decline rate.

### Note
No current template files store `returnDeclineRate` in display-percent form, so this bug is latent. However, the code is fragile. `sanitiseReturnDeclineRate` in `normalise-inputs.js` would detect and fix this in the engine pipeline, but it runs AFTER `buildEngineInputs`.

### Fix
Ensure `sanitiseReturnDeclineRate` is always applied in the engine pipeline, which it already is via `projection-service.js`. Add a documented note that `normalizeImportedUserData` assumes decimal form from JSON exports.

---

## Bug #8 — LOW: Latent `vacancyLoss` overwrite from ledger spread in simulator

**File**: `src/js/simulator.js` line 983  
**Status**: PLAUSIBLE (latent — not triggered by normalised inputs)

### Root cause
The `...ledger` spread at line 983 overwrites all keys from `buildInvestmentPropertyLedgerEntry`. The ledger computes `vacancyLoss` internally from `inputs.vacancyRate` via its `rate()` helper. If `inputs.vacancyRate` arrives in integer-percent form (e.g. `4` instead of `0.04`) and bypasses normalisation, the engine and ledger compute different vacancyLoss values; the spread overwrites the caller's value with the ledger's version (100× smaller).

### Fix
Explicitly exclude `vacancyLoss` and `depreciation` from the spread, since those are already computed by the engine and the ledger's values are reporting duplicates:
```js
const { netCashflowBeforeTax, netCashflowAfterTax, ...otherLedgerFields } = ledger;
return {
    ...
    vacancyLoss,
    depreciation,
    ...otherLedgerFields,
    netRentalCash: netCashflowBeforeTax,
    ...
};
```

---

## Bug #9 — LOW: Stale `importedScenario` snapshot in reverse-ui

**File**: `src/js/reverse-ui.js` line 846  
**Status**: PLAUSIBLE (edge case on re-import)

### Root cause
`this.importedScenario` is set once at line 312 during `checkProjectionFirst()`. At line 846, `validateProjectionSnapshot(this.forwardProjection, this.importedScenario)` uses the pre-computed snapshot. If `this.forwardProjection` is subsequently updated (e.g. by a second import), `this.importedScenario` still describes the first projection. The cross-checks (couple/single, positive salary/super/cash) would then run against mismatched data.

### Fix
Derive the snapshot fresh at validation time from `this.forwardProjection`, or update `this.importedScenario` whenever `this.forwardProjection` changes.

---

## Priority Order for Fixes

| # | Severity | File | Line | Bug |
|---|----------|------|------|-----|
| 1 | HIGH | `simulator.js` | 1036 | CGT Post-2027 wrong cost-base |
| 2 | HIGH | `recommendation.js` | 394, 665 | Negative proceeds → negative stocks |
| 3 | MEDIUM | `app.js` | 5403 | evaluateSaleTiming missing capitalLossPool |
| 4 | MEDIUM | `utils.js` | 2070 | deflateToToday wrong horizon fallback |
| 5 | MEDIUM | `forward-projection-bridge.js` | 222 | Hash check tautology |
| 6 | LOW | `utils.js` | 2069 | Double median row in PDF |
| 7 | MEDIUM | `advanced-v2.js` | 1799 | returnDeclineRate legacy import note |
| 8 | LOW | `simulator.js` | 983 | Latent vacancyLoss overwrite |
| 9 | LOW | `reverse-ui.js` | 846 | Stale importedScenario snapshot |
