# Retirement Calculator — Cross-Report Audit & Fix Plan

**Date:** 22 June 2026
**Scope:** `advanced-v2.html` (Report 1) + `reverse.html` (Report 2), reconciled against the exported input JSON (`retirement-inputs-advanced-v2-2026-06-21`) and the `gagneet/retirement_calculator_au` codebase.
**Method:** Inputs re-modelled independently in Python; headline figures traced to source lines; external policy facts verified against Services Australia / DSS and Portuguese tax sources (June 2026).

---

## 0. Bottom line

The *conclusion* both reports reach — you are self-funded and your money outlasts you to 95+ in Australia, India or Portugal — is almost certainly **directionally correct**. Even on a deliberately deflated, honest rebuild of your portfolio, a 4% draw funds **~$86k–$142k/yr**, which dwarfs the India target ($31,400/yr) and Portugal target ($58,400/yr) the tool itself computes.

But the **numbers on the page are not trustworthy as displayed**. Three independent problems stack up:

1. **Over-projection** — super at retirement is shown as **$5.4M** when the inputs support **~$3.56M nominal / ~$2.03M in today's dollars** (≈ 50% high), and the card mislabels it "Inflation-adjusted".
2. **A headline that isn't what it says** — "Monthly retirement income $23,220" is a *4%-SWR-on-assets proxy*, not your planned drawdown. Your modelled lifestyle need is **$4,792/mo**. The headline overstates real spend by **~4.8×**.
3. **Two external-data errors** — India is hard-coded as having **no** pension agreement (false since 2016), and Portugal's plan leans on the **NHR** tax scheme (closed to new applicants since end-2024).

Severity-ranked issues and fixes follow.

---

## 1. Calculation / over-projection issues

### 1.1 — Super-at-retirement card overstates by ~50% and is mislabelled — **HIGH**
**Where:** `src/js/advanced-v2.js:2533-2535` (card), value sourced via `:59 superAtRetirementToday = adaptedResult.superAtRetire`.

**Evidence (independent rebuild from your JSON):**

| Quantity | Reconciled | App shows |
|---|---|---|
| His super @71 (nominal, 8.32%, reduced income from 58) | ~$3.19M | — |
| Partner super @ his-71 (nominal) | ~$0.38M | — |
| **Combined super @ retirement (nominal)** | **~$3.56M** | **$5.4M** |
| Combined super in **today's dollars** (÷1.0258²²) | **~$2.03M** | $5.4M ("Inflation-adjusted") |

The card is ~50% above the nominal figure and ~2.6× the real figure, yet labelled *Inflation-adjusted*. Two faults are tangled here: the **value is over-projected**, and the **deflator is not applied** to this card (it *is* applied in the Year-by-Year table — see `:716` comment "Deflated to today's dollars in paintYearTable").

**Fix:**
- Decide one unit for the summary cards (recommend **today's dollars**, to match the Year-by-Year default toggle) and apply the same deflator used in `paintYearTable` to `superAtRetire` before rendering.
- If the card stays nominal, change the label from "Inflation-adjusted" to "Future dollars".
- Then chase the residual over-projection in 1.2/1.3 below.

### 1.2 — Return assumptions are inverted and "optimistic" mode compounds it — **HIGH**
**Where:** input JSON `superGrowth: 8.32`, `invReturn: 4.45`, `scenarioMode: "optimistic"`; wiring at `src/js/simulator.js:1285-1286`.

Balanced **super is assumed to grow faster (8.32%) than your outside-super equities (4.45%)** — that is backwards: a diversified share/ETF portfolio is higher-risk than a balanced super option and should not return *less*. The 8.32% is also above the APRA balanced 10-yr median you cite elsewhere (~7.5%). With `scenarioMode:"optimistic"` selected, the engine is running a best-case path and presenting it as the base case.

**Fix:**
- Sanity-check the two return fields — they look swapped or mis-entered. A defensible base case is roughly **super 7.0–7.5% / diversified equities 7.0–8.0% nominal**.
- Default `scenarioMode` to **"base"/"balanced"**, not "optimistic", for the headline projection. Surface optimistic/pessimistic as explicit bands, not the default.

### 1.3 — Post-fix inflation from the BUGS.md remediation — **HIGH (regression risk)**
`BUGS.md` records eight "double-divide" fixes. Critically, **most of those bugs were *under*-statements** (salary growth, healthcare, lean-years, home growth at CPI instead of property rate — Bug 7). Correcting them all **pushes balances up**, and Bug 7's fix in particular inflates home equity (hence downsizer proceeds) materially. Combined with 1.2, the model has likely swung from under- to **over**-projecting.

**Fix:** Add a **reconciliation regression test** (see §6) that asserts super-at-retirement stays within a tolerance band of a closed-form accumulation from the same inputs. This is the single highest-leverage guardrail.

### 1.4 — The identical `$9,455,907` across two differently-configured reports — **HIGH**
Doc 1 (reverse, retire 67, single, 7.0/7.5%) and Doc 2 (advanced, retire 71, couple, 4.45/8.32%) both print **total financial assets = $9,455,906.99**, byte-for-byte. Different age, household, and returns cannot produce an identical balance from a live recompute. This points to a **shared cached/stale projection** being read by both surfaces (consistent with the "shared projection hash" design).

**Fix:** Ensure each report recomputes from its own resolved input set, or — if a shared projection is intentional — make the **shared inputs explicit and identical on both pages**, and stamp the projection hash visibly so divergence is detectable.

---

## 2. Presentation / labelling issues

### 2.1 — "Monthly retirement income $23,220" is an SWR proxy, not planned drawdown — **HIGH**
**Where:** the reference SWR line `src/js/reverse-solver.js:141` (`sustainableIncomeNominal = totalAssetsNominal * swr + agePensionNominal`) is explicitly flagged in code as *"reference only — NOT used for pass/fail"* (`:140`), yet the same quantity is surfaced as the **lead metric** on both reports.

**Proof it's the proxy, not a drawdown:**
- `$23,220/mo × 12 = $278,640/yr`
- Reverse report "sustainable income" = `$278,636/yr` (same number)
- Implied asset base `= 278,640 / 0.04 = $6.97M` ≈ Doc 2's "25× rule target $6,909,450"
- Your **actual modelled lifestyle need** = `$57,503/yr = $4,792/mo`

So the headline tells you that you could *sustainably draw* $23k/mo, while your plan *actually spends* ~$4.8k/mo — a **4.8× gap** that reads as "your paycheck meets ASFA" when the two figures aren't the same concept.

**Fix:** The "Monthly retirement income" card should show **planned drawdown** (your tiered/target spend net of pension), with the SWR sustainable-capacity figure relabelled as a separate, clearly-named "Maximum sustainable draw (4% reference)" metric.

### 2.2 — "Impact spread 87 years" is non-physical — **MEDIUM**
**Where:** `src/js/advanced-v2.js:2463`. With a plan horizon of ~53 years from today, a "87 years' difference in portfolio longevity" is meaningless — it arises from differencing two longevity numbers where the strong-early-returns path **never depletes** (so longevity is capped/sentinel) against the crash path. Differencing a real number against a "never runs out" sentinel yields a nonsense spread.

**Fix:** Cap longevity at the plan horizon, and when either path is non-depleting, render the spread as e.g. "crash path depletes at age X; strong path never depletes within plan" rather than a subtracted year count.

### 2.3 — Year-by-Year expenses roughly halve at age 102 — **MEDIUM (verify)**
The table drops from ~$11,931/mo (age 101) to ~$6,073/mo (age 102) — about a **49% cut**, coinciding with `lifespan: 102` (first death → couple becomes single). Survivor spending should be **~65–70% of couple**, not ~50%. Code uses `* 0.7` factors at `simulator.js:324/335`, so the displayed ~50% looks steeper than the coded survivor factor — possibly the **tiered-spending multiplier** (`tieredSpendingFrailMultiplier:115`) interacting with the survivor transition, or a double-application.

**Fix:** Trace the couple→single transition and confirm exactly one survivor factor (~0.67) applies, and that it composes (not stacks) with tiered-spending multipliers.

### 2.4 — "Income gap: On track" with no number — **LOW**
The gap card shows "On track" but no signed figure. Given the over-projection, "on track" is doing a lot of work. Show the actual gap (target need − sustainable draw) so the user can see the margin.

---

## 3. Reverse-planner-specific (Report 2)

### 3.1 — Lever table reads "No change needed" for almost every lever — **HIGH**
Because the displayed "sustainable income" (§2.1) is an inflated SWR proxy, the gap is computed as already-met, so every independent lever solves to "No change needed". The engine-based pass/fail (`reverse-solver.js:138 evaluateEngineGoal`) may be correct, but the **report renders the SWR-proxy gap**, not the engine gap — so the two disagree and the user sees a table of no-ops.

**Fix:** Render lever gaps from the **same engine evaluation** used for pass/fail, not from the SWR reference line. Remove the SWR proxy from any user-facing gap/lever output entirely (keep it only as an internal seed for the solver bracket, per its stated purpose).

### 3.2 — Reverse "Current Financial Snapshot" shows zeros — **MEDIUM**
In the reverse PDF, the snapshot prints salary $0 / super $0 / savings $0 while the scenario builder uses the real $336,330 / $235,158. This is a **data-binding break** between the reverse input adapter and the snapshot renderer (likely `reverse-baseline-adapter.js`). Fix the binding so the snapshot reflects resolved inputs.

### 3.3 — "40 years in retirement" for age 67→90 — **LOW**
Arithmetic label bug (67→90 = 23 years). Recompute horizon labels from `retireAge`/`lifespan` rather than a stored constant.

---

## 4. Overseas data issues

### 4.1 — India hard-coded as "No pension agreement" — **HIGH (factual error)**
**Where:** `src/js/country-profiles.js:17` `INDIA.socialSecurityAgreement: false` ("No agreement — general portability rules apply").

This is **wrong**. The Australia–India Social Security Agreement has been in force since **1 January 2016**. Former Australian residents living in India **can claim the Australian Age Pension without returning to Australia**, and residence/insurance periods can be totalised.

**Important nuance to model (not just flip the flag):** the overseas Age Pension is **means-tested and proportional to Australian Working Life Residence (AWLR)** — full rate needs **45 years** AWLR. Your JSON has `ageCameToAU: 34`; with pension age 67 that's a maximum AWLR of ~33 years → roughly **33/45 ≈ 73%** of the means-tested rate *if* you were under the asset test. (At present both reports show $0 pension because you're above the asset cutoff, so this mainly matters in late-life draw-down scenarios.)

**Fix:**
- Set `INDIA.socialSecurityAgreement: true`, `portability: 'FULL_WITH_AGREEMENT'`.
- Implement the **AWLR proportionality** (`min(AWLR, 45)/45`) wherever overseas pension is paid, for *all* agreement countries — this is the more important structural fix than the boolean.

### 4.2 — Portugal plan assumes the NHR tax scheme — **HIGH (outdated)**
The Portugal scenario's appeal rests on the **NHR** regime (10% pension rate / foreign-income exemptions). NHR **closed to new applicants at end-2024**, transition ended **March 2025**. Its replacement, **IFICI**, is restricted to scientific-research/innovation professionals and **does not cover retirees**. A move in your 70s would face **standard Portuguese rates (up to ~48% + surcharges)**.

**Fix:** Remove the NHR assumption from `country-profiles.js` for Portugal; model standard resident rates for new arrivals, with a note that existing NHR holders are grandfathered to 2033. (The AU–Portugal social-security agreement flag, `:139 true`, is correct and can stay.)

### 4.3 — `overseasAudFxChange: -0.5` is ambiguous — **MEDIUM**
Is this **−0.5%** or **−50%** AUD depreciation? A −50% FX shock vs a −0.5% drift changes the overseas budget enormously. Confirm the unit and validate the field (the double-divide family of bugs in `BUGS.md` shows this codebase is prone to %-vs-decimal confusion).

---

## 5. Input-data issues in your JSON (independent of code)

These are *your inputs*, worth a second look before trusting any output:

- **Investment property is underwater:** `ipValue 530000` vs `ipLoan 574000` → **−$44k equity**, held 15 years. Model a "sell now / sell at retirement" branch; the negative-gearing changes from 1 Jul 2027 (in `BUGS.md`) may also bite if it's an established property.
- **Annuity purchased at 67 but you retire at 71:** `annuityPurchaseAge 67`, `retireAge 71`. Buying a $200k annuity *while still working* is unusual and pulls $200k out of compounding super 4 years early — confirm this is intended.
- **Credit card $11,000 @ 23.95%:** high-interest debt present (`ccBalance 11000`, `ccRate 23.95`) — confirm it's actually serviced/cleared in the projection, not ignored.
- **Target vs need mismatch:** `desiredIncome 73337` but the builder computes an actual need of **$57,503**. Decide which drives the simulation; using the higher figure is conservative but inconsistent with the "need" shown.
- **Legacy goal masks over-projection:** `legacyGoal 1000000`, yet the projected estate is **$4.49M** — the goal is exceeded ~4.5×, which makes "success" easy and hides the over-projection. Stress the plan against a $0 legacy to see the true margin.
- **Carer / overseas-parent support:** `isCarer true`, `annualParentSupport 3800`, `carerAnnualExpense 7400`, `carerYearsExpected 18`, parents overseas — confirm these flow into the cash-flow drag.

---

## 6. Recommended fix order (highest leverage first)

1. **Add a reconciliation regression test** — assert super-at-retirement and total-assets-at-retirement are within ±10% of a closed-form accumulation from the same inputs. This catches §1.1–§1.4 and any future drift in one assertion. *(Use the Python rebuild in the Appendix as the oracle.)*
2. **Fix the return assumptions / default scenario** (§1.2) — swap/sanity-check `superGrowth` vs `invReturn`; default to base not optimistic.
3. **Separate "planned drawdown" from "SWR sustainable capacity"** on every card and the reverse lever table (§2.1, §3.1) — this is the change that makes the reports *mean what they say*.
4. **Apply one consistent deflator** to all summary cards and fix the "Inflation-adjusted" label (§1.1).
5. **Fix India agreement flag + implement AWLR proportionality** for all agreement countries (§4.1); remove NHR from Portugal (§4.2).
6. Cosmetic/medium: impact-spread sentinel (§2.2), survivor-spending factor (§2.3), reverse snapshot binding (§3.2), FX unit validation (§4.3).

---

## Appendix A — Independent reconciliation (the oracle)

```
Inputs: super 336,330 @ 8.32% nominal, SG 12% of salary
        salary 235,158 → 168,000 from age 58 (reducedIncomeAge)
        partner super 15,120, partner salary 41,220 → 38,000 from 62, SS 2,000
        contributions taxed at 15%, horizon 49 → 71 (22 yrs)

His super @71 (nominal)        : ~$3,185,521
Partner super @ his-71 (nom)   : ~$375,320
COMBINED super @ retirement    : ~$3,560,841   (app shows $5.4M  → ~52% high)
  in today's dollars (÷1.0258²²): ~$2,033,168   (card labels $5.4M "Inflation-adjusted")

Headline 'monthly income' $23,220 → $278,640/yr
  = totalAssets × 0.04 + pension  (SWR proxy, reverse-solver.js:141)
  implied asset base $6.97M ≈ Doc2 '25× target' $6,909,450
Planned lifestyle need (builder) : $57,503/yr = $4,792/mo
  → headline overstates real drawdown by ~4.8×

Affordability (even on deflated honest portfolio):
  today's-$ real assets ~$2.14M  → 4% = ~$85,700/yr
  India need $31,400/yr ✓   Portugal need $58,400/yr ✓  (both comfortably covered)
```

## Appendix B — External facts verified (June 2026)

- **AU–India SSA:** in force since 1 Jan 2016; Age Pension claimable from India; means-tested + AWLR-proportional (full at 45 yrs AWLR). → `country-profiles.js` India flag is wrong.
- **AU–Portugal SSA:** exists; overseas rate proportional to working-life residence. → flag correct.
- **Portugal NHR:** closed to new applicants end-2024 (transition ended Mar 2025); replaced by IFICI (research/innovation only, not retirees). → Portugal tax assumption outdated.

*This document analyses your calculator's outputs and code; it is not personal financial advice. Confirm any relocation/retirement decision with a licensed adviser once the engine produces reconciled figures.*