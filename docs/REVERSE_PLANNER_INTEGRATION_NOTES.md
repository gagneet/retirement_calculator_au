# Reverse Planner Integration Notes — Phase 0 Audit

**Date:** 2026-06-20
**Branch:** feature/reverse-retirement-planner
**Auditor:** Claude Code

---

## Purpose

This document records audit findings made before writing any reverse planner code. It serves as the source of truth for integration decisions and should be consulted when debugging unexpected behaviour.

---

## 1. Simulator Entry Point

**File:** `src/js/simulator.js`
**Class:** `RetirementSimulator`
**Primary method:** `simulateRetirement(inputs, useRandomReturns = false, stressScenario = null, scenarioReturns = null)`

### Input Normalisation

`simulateRetirement` calls `normaliseInputsForSimulation(inputs)` first. This method accepts **two alias schemas**:
- **Already-normalised** (field `yourCurrentAge` defined): passthrough, no remapping
- **Short-form aliases** (field `age` defined, `yourCurrentAge` undefined): remapped to long form

The reverse planner uses the **already-normalised** form (long-form field names) to avoid ambiguity.

### Key input field names (verified by grep)

| Reverse Planner concept | Simulator field name | Notes |
|---|---|---|
| Current age | `yourCurrentAge` | |
| Retirement age | `retirementAge` | |
| Annual salary | `yourSalary` | |
| Super balance | `yourCurrentSuper` | |
| Extra super (salary sacrifice) | `yourAdditionalSuperContribution` | Annual $, not monthly |
| Monthly stock/ETF savings | `monthlyStockContribution` | |
| Mortgage balance | `mortgageBalance` | |
| Monthly mortgage payment | `monthlyMortgagePayment` | |
| Weekly rental income | `weeklyRentalIncome` | |
| Has investment property | `hasInvestmentProperty` | boolean |

### Return value (verified from lines 2780–2810)

```js
{
  finalBalance,            // Balance at end of lifespan
  totalFinancialAssets,    // Super + savings + stocks at retirement
  yearlyData,              // Array of year-by-year snapshots
  balances,                // Array of balance snapshots
  accumulatedSuperBalance,
  accumulatedSavingsBalance,
  accumulatedInvestmentPortfolio,
  depletionAge,            // Age when balance hits zero (or null)
  peakWealth,
  peakWealthAge,
  mortgagePayoffAge,
  // ... and others
}
```

### Sustainable income derivation

The simulator does NOT return a `sustainableIncome` field. The reverse planner derives it:
```js
sustainableIncomeNominal = totalFinancialAssets * SWR  // SWR default = 0.04
sustainableIncomeToday = sustainableIncomeNominal / deflator
deflator = Math.pow(1 + inflationRate, yearsToRetirement)
```

---

## 2. Config Keys

**File:** `src/js/config.js`

| Key | Value | Note |
|---|---|---|
| `CONCESSIONAL_CAP` | 30000 | ATO 2024-25 (line 446) |
| `NON_CONCESSIONAL_CAP` | 120000 | |
| `SUPER_GUARANTEE_RATE` | 0.12 | 12% (line 13) |
| `SINGLE_PENSION_MAX` | 31223 | March 2026 (line 29) |
| `COUPLE_PENSION_MAX` | 47070 | March 2026 (line 30) |
| `DEMING_RATE_LOWER` | 0.0125 | Spelling: DEMING (not DEEMING) — must preserve |
| `DEMING_RATE_UPPER` | 0.0325 | Same spelling caveat |
| `INFLATION_RATE` | Not in ENHANCED_CONFIG | Use 0.026 as fallback |

**Warning:** `INFLATION_RATE` is not a top-level key in ENHANCED_CONFIG (as of audit date). Always use `ENHANCED_CONFIG.INFLATION_RATE || 0.026`.

---

## 3. WhatIfEngine Assessment

**File:** `src/js/what-if-engine.js`
**Decision:** WhatIfEngine methods are NOT used in the bisection solver. The reverse planner calls `simulateRetirement` directly in the bisection loop for accuracy. WhatIfEngine uses simplified quick-calc methods that don't match the full simulator's projection.

---

## 4. Country Profiles

**File:** `src/js/country-profiles.js`
**Schema** (from CANADA entry, lines 851–968):

```js
{
  name, region, currency,
  distanceFromAustralia, flightTime, overview,
  socialSecurityAgreement, agreementDetails,
  agePension: { portability, formerResidentRule, note },
  visa: { type, duration, requirements, easeOfAccess, cost, note },
  costOfLiving: { index, breakdown, note, healthcareNote },
  healthcare: { system, quality, rating, costs, insurance, considerations },
  tax: { doubleTaxAgreement, superTaxation, agreementSummary, residencyThreshold },
  climate,
  popularLocations: [{ name, description, cost, pros, cons }],
  languageBarrier, languageNote,
  risks: { overall, currency, healthcare, political },
  bestFor, challenges
}
```

**Missing country:** UNITED_KINGDOM — added in this PR.

**UK-specific facts:**
- No bilateral Social Security Agreement with Australia
- Reciprocal Health Care Agreement (RHCA): medically necessary care only
- Australia-UK DTA (Double Tax Agreement): prevents double taxation on pensions
- Age Pension portable under AWLR rules (may be reduced if fewer than 35 years AWLR)
- Ancestry visa: most practical route for Australian retirees with UK grandparent

---

## 5. localStorage Bridge

**Decision:** Add `localStorage.setItem('rc_forward_scenario', JSON.stringify(inputs))` to `app.js` after `collectInputs()` and before `simulateRetirement()` in `calculateRetirement()`.

**Key:** `rc_forward_scenario`
**Location in app.js:** Around line 1249 (inside `calculateRetirement` method, after validation, before simulation)

The reverse planner page reads this key on load and offers an import banner.

---

## 6. Webpack Entry

**Added:** `reverseV1: './src/js/reverse-ui.js'` to `webpack.config.js` entries
**HTML template:** `src/reverse.html` → output `reverse.html`
**Note:** reverse.html uses Tailwind CDN (no custom CSS bundle needed). The reverseV1 JS chunk handles all interactivity.

---

## 7. Test Infrastructure

**Test framework:** Jest v30, babel-jest, jest-environment-jsdom
**Test directories:**
- `tests/unit/` — unit tests per module
- `tests/integration/` — cross-module integration tests

**Mock pattern:** For unit tests, `simulator.js` and `config.js` are jest-mocked to avoid DOM dependencies. Integration tests use the real simulator with deterministic mode (`useRandomReturns = false`).

---

## 8. Known Limitations and Gotchas

1. **Bisection assumes monotonicity:** The solver assumes that increasing a lever value always improves the outcome. This holds for most levers (super, savings, retirement age) but may not hold for salary in edge cases (e.g., Division 293 super tax threshold). Accept this as a reasonable simplification.

2. **SWR simplification:** The safe withdrawal rate (default 4%) is applied to `totalFinancialAssets` at retirement. This includes super, savings, and stocks but NOT the primary residence (correctly excluded from liquid assets).

3. **Age Pension not included in SWR calculation:** The reverse planner treats age pension as a separate income stream, not capitalised into the SWR calculation. This is intentional and conservative — age pension amounts are uncertain over long time horizons.

4. **Concessional cap enforcement:** The `solveForExtraAnnualSuper` solver caps the search at `CONCESSIONAL_CAP - currentSG - currentVoluntary`. This correctly accounts for carry-forward provisions being unavailable in the simple form (conservative).

5. **Retirement age rounding:** `solveForRetirementAge` rounds to the nearest whole year. The simulator is designed for whole-year retirement ages.

6. **Couple lever limitation:** The reverse planner currently solves single levers (one variable at a time). Combining levers (e.g., extra super + retire later simultaneously) is left for a future phase. The report surfaces the top 3 single-lever actions.
