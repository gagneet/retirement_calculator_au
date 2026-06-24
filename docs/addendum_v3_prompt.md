## ⚠️ Addendum v2 — READ THIS FIRST (reconciliation with the live V3 + new design decisions)

Since v1 of this prompt was written, most of it has shipped as **`retirement.html` (V3)**. This addendum **re-scopes the work**: it tells you what is already done (do not rebuild it), what is genuinely still outstanding (focus here), and adds two design decisions made after v1. Everything in sections 0–12 below remains the canonical engineering method — but treat the field list there through the lens of this addendum.

### A. What already shipped in V3 — verify, do NOT rebuild

The live V3 already implements, and matches this spec:
- **The Basic / Standard / Advanced tier system**, with the exact retention contract: *"Hidden fields keep their values and are still submitted with defaults, so changing tier changes the interface, not the calculation contract."* ✅
- **The 8 intent-based group names and questions** ("Where do I stand today?", "What do I earn and put away?", "Who is counting on me?", "What do I own and owe?", "How do I want to live?", "What does the model assume?"). ✅
- **Tiered spending "smile curve"** (Active → Stable → Frail multipliers) — this implements the *spending-strategy* item (was A6). ✅
- **Reduced-income scenario** (income drop at a chosen age, you + partner) — this covers *lean years* (was A3). ✅
- **Annual market-shock probability** + magnitude, plus bounded ±4pp inflation/return variation in Monte Carlo — this covers most of *stress probabilities* (was A5). ✅
- **What-If tab** now exists in "Step 2 — Explore" (was a stub). ✅ — confirm the sliders actually re-run the projection (see §D below); if still placeholder, wire it.
- **Lifetime annuity / longevity insurance** input. ✅

### B. What is STILL outstanding — focus the work here

1. **Franking credits & dividend modelling (was §A1) — STILL ABSENT. Highest-value remaining gap.** No dividend yield, franking rate, or Australian-equity-allocation field exists anywhere in V3. Implement per §A1 below in full. For AU retirees living off franked dividends this is a real, missing income line.
2. **Dynamic asset allocation / glide path (was §A2) — STILL ABSENT.** Section 9 is titled "Assumptions & allocation" but contains only return/inflation assumptions — there is **no allocation control and no age-based de-risking**. Add the glide-path toggle + equities/bonds/cash split per §A2. The engine (`dynamic-allocation-engine.js`) already exists; wire it.
3. **Investment-property maintenance-cost inflation (was §A4) — STILL MISSING.** Sale timing is now partly covered by the "Future property plan" scenario, so you may drop the separate sale-year field, but the **maintenance-cost inflation %** is still absent. Add it.
4. **Downsize transaction cost % (was §A6) — STILL MISSING.** Downsizing exists (new home value, ongoing fees, downsizer contribution) but there is **no transaction-cost %** (agent + stamp duty + moving). Add it; subtract from released equity in `housing-optimizer.js`.
5. **Granular stress probabilities (was §A5) — OPTIONAL, not a blocker.** One combined market-shock probability exists. Separate *extreme-inflation* and *property-crash* probabilities are a refinement, not required for parity. Implement only if low-cost.
6. **Section numbering / group fragmentation — UX FIX.** V3 keeps the 1–13 numbering, and the 8 group names now **repeat across numbered cards** (sections 1 & 2 are both "You & your household"; 7 & 13 both "Retirement lifestyle"; 6, 10 & 12 all "Tax structures & overseas"). This is more confusing than no numbering. **Either** consolidate each group into a single card with a tier-gated "advanced" sub-region, **or** drop the sequential numbers and label purely by group + tier badge. Do not present the same group name under two different numbers.

### C. NEW design decision #1 — two real, toggleable themes

The review now ships **two complete visual directions** as a live toggle, not a swatch. Both must be real, switchable at runtime via a single theme flag (no code fork, no duplicated markup — only token values change). Default = **Editorial**.

| Token | **Editorial** (default — advisers, DIY/FIRE) | **Approachable** (first-timers, low literacy) |
|---|---|---|
| Page / stage bg | Navy `#0D1421`; stage flush | Cream `#F4F1EA` stage, 22px radius, `#E3DCCC` border |
| Card | `#0F1A2E`, 14px radius, hairline white border | `#FFFFFF`, 16px radius, `0 2px 10px rgba(30,30,50,.06)` shadow |
| Group kicker (the question) | Playfair Display *italic*, gold `#D4B45A` | DM Sans 600, green `#2D9C6F` |
| Group title | DM Sans 600, `#FAF8F5` | DM Sans 700, `#1A1A2E` |
| Field label | DM Sans 500, `#C9C6BE`, 12.5px | DM Sans 600, `#374151`, 13px |
| Input | `#0B1422`, 1px border, 6px radius, 38px min-h | `#fff`, 2px `#E8E3D8` border, 11px radius, 42px min-h |
| Input value | JetBrains Mono, `#FAF8F5` | DM Sans 600, `#1A1A2E` |
| Accent / primary | Gold `#C9A227` | Green `#2D9C6F` |
| `NEW` badge | gold bg, navy text, mono | green bg, white text, DM Sans |
| KPI value | JetBrains Mono 700, 42px | DM Sans 800, 42px |
| Body copy | Source Serif 4 | DM Sans |

Editorial keeps DESIGN.md gravitas (Playfair / Source Serif / JetBrains Mono numerals). Approachable is warmer, rounder, larger touch targets, plain-English questions ("How much is in your super?"), green accents — tuned for anxiety reduction. Gate it behind a `data-theme` attribute or a single theme object consumed by all components. **Ship Editorial as default; expose Approachable as a user/account preference.**

### D. NEW design decision #2 — two DISTINCT slider types (form vs What-If)

The main form and the sidebar/Explore panel use sliders for **different jobs and they must behave and look different**:

- **Form sliders = data entry.** (e.g. risk tolerance 1–10, allocation %, volatility σ.) Thin display-style track. Their value **mutates the saved canonical input** and persists with the scenario. Setting one and submitting changes the stored plan.
- **What-If sliders = live levers.** (extra super $/mo, extra mortgage $/mo, delay retirement +yrs.) Tactile, filled track in the accent colour. On input they must **clone the current canonical input, apply the delta, re-run `projection-service.js`, and update the KPI live — WITHOUT writing back to the saved inputs.** Releasing the slider does not commit; the user explicitly "applies" a scenario if they want it persisted.

**Implementation contract for What-If:** never mutate the stored input object from a What-If slider. Build a transient copy each tick (debounce ~150ms), project it through the *same* engine path the form uses, and render the delta ("lift from these levers: +$X/yr"). This keeps "testing a scenario" cleanly separate from "changing my data" — and is the difference between the two slider styles you'll see in the prototype. Different ranges, steps, and styling between the two are expected and correct.

---

