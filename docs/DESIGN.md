---
name: "Australian Retirement Calculator"
version: "2.0.0"
description: >
  Design system for retirement.gagneet.com — an ASIC-compliant financial
  well-being tool designed as an editorial, income-first decision-support
  system. One coherent product, two modes (Base / Advanced), one trusted engine.

tokens:
  colors:
    # ── Primary palette — deep navy with warm financial gold ──────────────
    navy-950:
      value: "#0D1421"
      description: "Deepest background surface (dark mode)"
    navy-900:
      value: "#102040"
      description: "Primary dark surface"
    navy-800:
      value: "#1B3A5C"
      description: "Secondary dark surface / card background"
    navy-700:
      value: "#245180"
      description: "Interactive dark element / hover state"

    gold-500:
      value: "#C9A227"
      description: "Primary accent — financial authority, retirement milestone markers"
    gold-400:
      value: "#D4B45A"
      description: "Gold hover / active state"
    gold-100:
      value: "#FBF5E2"
      description: "Gold tint for highlighted inputs"

    # ── Income adequacy — semantic traffic-light ──────────────────────────
    income-healthy:
      value: "#2D6A4F"
      description: "≥70% income replacement ratio — on track"
    income-caution:
      value: "#E07B39"
      description: "50–70% income replacement — review needed"
    income-critical:
      value: "#B5342A"
      description: "<50% income replacement — shortfall"

    # ── Neutral surfaces ──────────────────────────────────────────────────
    cream-50:
      value: "#FAF8F5"
      description: "Light-mode primary background — warm, not harsh white"
    cream-100:
      value: "#F3F0EA"
      description: "Light-mode card / panel surface"
    cream-200:
      value: "#E8E3D8"
      description: "Light-mode border / divider"

    charcoal-900:
      value: "#1A1A2E"
      description: "Primary text colour"
    charcoal-700:
      value: "#374151"
      description: "Secondary text / subheadings"
    charcoal-400:
      value: "#9CA3AF"
      description: "Tertiary / placeholder / icon text"
    charcoal-100:
      value: "#F3F4F6"
      description: "Light surface / disabled state"

    # ── Data visualisation — accessible, WCAG AA tested ──────────────────
    chart-primary:
      value: "#1B4F72"
      description: "Balanced scenario line (primary)"
    chart-secondary:
      value: "#148A7E"
      description: "Aggressive scenario line"
    chart-tertiary:
      value: "#6B7FD6"
      description: "Conservative scenario line"
    chart-milestone:
      value: "#C9A227"
      description: "Retirement age vertical marker"
    chart-depletion:
      value: "#B91C1C"
      description: "Depletion point marker"
    chart-grid:
      value: "rgba(0,0,0,0.06)"
      description: "Subtle grid lines — visible but not dominant"

  typography:
    fontFamilies:
      display:
        value: "'Playfair Display', Georgia, serif"
        description: >
          Section headings, KPI labels — editorial authority (Financial Times aesthetic).
          Signals gravitas without corporate coldness.
      body:
        value: "'Source Serif 4', Georgia, serif"
        description: >
          Body text and explanatory copy — highly readable at length, reinforces
          the editorial positioning.
      data:
        value: "'JetBrains Mono', 'Courier New', monospace"
        description: >
          ALL monetary values and percentages. Monospace ensures column alignment
          and signals precision — numbers should look like numbers.
      ui:
        value: "'DM Sans', system-ui, sans-serif"
        description: >
          Form labels, buttons, navigation, tooltips — clean utility sans-serif
          that does not compete with display type.

    fontSizes:
      kpi-hero:
        value: "3rem"
        lineHeight: "1.1"
        description: "Primary retirement income figure — the hero metric"
      kpi-secondary:
        value: "1.875rem"
        lineHeight: "1.2"
        description: "Secondary KPIs (balance, pension, replacement ratio)"
      heading-section:
        value: "1.25rem"
        lineHeight: "1.4"
        description: "Tab and panel section headings"
      body:
        value: "0.9375rem"
        lineHeight: "1.6"
        description: "Standard explanatory body text"
      label:
        value: "0.75rem"
        lineHeight: "1.4"
        description: "Form field labels, captions, footnotes"
      data:
        value: "1rem"
        lineHeight: "1.5"
        description: "Data values in tables and sensitivity bars"

  spacing:
    section:
      value: "2rem"
      description: "Between major page sections"
    card:
      value: "1.5rem"
      description: "Card internal padding"
    field:
      value: "1rem"
      description: "Between form fields"
    inline:
      value: "0.5rem"
      description: "Inline element spacing"

  borderRadius:
    card:
      value: "0.75rem"
      description: "Standard card / panel radius"
    button:
      value: "0.5rem"
      description: "Button border radius"
    badge:
      value: "9999px"
      description: "Pill badges and tags"
    input:
      value: "0.375rem"
      description: "Form input border radius"

  shadows:
    card:
      value: "0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.06)"
      description: "Default card elevation"
    card-hover:
      value: "0 4px 16px rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.08)"
      description: "Elevated card on hover / active"
    kpi-ring:
      value: "0 0 0 4px rgba(201,162,39,0.18)"
      description: "Gold focus ring on KPI cards after calculation"
    input-focus:
      value: "0 0 0 3px rgba(37,99,235,0.15)"
      description: "Input focus ring (blue, accessible)"

components:
  kpi-card:
    description: >
      Primary retirement income display card — the hero element of every results view.
      The income figure is the answer to "will I be okay?"
    properties:
      background: cream-50
      border: "1px solid {cream-200}"
      border-radius: card
      shadow: card
      label-font: display
      label-size: label
      label-color: charcoal-400
      value-font: data
      value-size: kpi-hero
      value-color: charcoal-900
      padding: card

  income-status-badge:
    description: >
      Pill badge attached to the income KPI card showing income replacement
      ratio adequacy. Colour-coded to the three-tier adequacy system.
    states:
      healthy:
        background: income-healthy
        color: white
        label: "On Track (≥70%)"
      caution:
        background: income-caution
        color: white
        label: "Review Needed (50–70%)"
      critical:
        background: income-critical
        color: white
        label: "Shortfall (<50%)"

  scenario-preset-button:
    description: >
      Quick-switch buttons for Conservative / Balanced / Aggressive scenario presets.
      Clicking one sets all assumption fields to that preset's values simultaneously.
    base:
      font: ui
      size: label
      border-radius: button
      padding: "0.5rem 1rem"
      transition: "background 150ms, box-shadow 150ms"
    conservative:
      background: "#EFF6FF"
      color: "#1E40AF"
      border: "1px solid #BFDBFE"
    balanced:
      background: "#F0FDF4"
      color: "#166534"
      border: "1px solid #BBF7D0"
    aggressive:
      background: "#FEF3C7"
      color: "#92400E"
      border: "1px solid #FDE68A"
    active-ring:
      value: "2px solid {gold-500}, offset 2px"
      description: "Ring applied to the currently-active preset button"

  assumption-tooltip:
    description: >
      (i) info icon adjacent to each assumption input that reveals historical
      source, typical range, and model basis on hover or keyboard focus.
      Serves dual purpose: user education AND ASIC RG 244 compliance.
    icon:
      size: "14px"
      color: charcoal-400
      hover-color: gold-500
    popup:
      background: charcoal-900
      color: white
      border-radius: "0.375rem"
      padding: "0.5rem 0.75rem"
      max-width: "280px"
      font: ui
      font-size: label
      shadow: "0 4px 12px rgba(0,0,0,0.25)"

  depletion-warning:
    description: >
      Conditional banner shown when the deterministic model projects funds
      depleting before the planning horizon. Tone is explanatory, not alarming.
      Only goes red when the median Monte Carlo scenario depletes.
    moderate:
      background: "#FFFBEB"
      border: "1px solid #F59E0B"
      border-left: "4px solid #F59E0B"
      icon: "⚠️"
      heading-color: "#92400E"
    critical:
      background: "#FEF2F2"
      border: "1px solid #DC2626"
      border-left: "4px solid #DC2626"
      icon: "🔴"
      heading-color: "#991B1B"

  sensitivity-bar:
    description: >
      Horizontal bar in the Sensitivity Analysis panel. Bars are sorted by
      absolute impact on annual retirement income (largest driver at top).
      Value shown inline: "+$4,200/yr" or "-$3,100/yr".
    positive:
      fill: income-healthy
    negative:
      fill: income-critical
    neutral:
      fill: charcoal-400
    label-font: ui
    label-size: label
    value-font: data
    value-size: label
    animation: "width 500ms ease-out, stagger 80ms per bar"

  methodology-accordion:
    description: >
      Expandable "How this is calculated" section at the bottom of each results
      view. Contains formula-level explanation, assumption sources, and limitations.
      This single element dramatically improves trust and ASIC defensibility.
    trigger:
      background: cream-100
      border: "1px solid {cream-200}"
      font: ui
      font-size: body
      icon: "chevron-down, rotates 180deg when open"
    body:
      background: cream-50
      padding: card
      font: body
      font-size: body
      color: charcoal-700

---

# Design Philosophy

## Positioning Statement

This is an **educational retirement modelling tool** — not a financial advice
service. The design communicates three qualities simultaneously:

1. **Precision** — Numbers are the product. Monospaced fonts and clear hierarchy
   signal that calculations are taken seriously.
2. **Transparency** — Every assumption is visible, explainable, and sourced.
   No black boxes. (i) tooltips on every modifiable parameter.
3. **Calibrated confidence** — Show what the model knows (ranges, scenarios)
   and explicitly acknowledge what it cannot predict (market volatility,
   legislative change, personal circumstances).

---

## The Five Design Principles

### 1. Income is the Hero Metric

The primary result is **annual retirement income** (with income replacement
ratio), not the superannuation balance. The balance is context. The income is
the answer to the user's real question: *"Will I be okay?"*

**Design implication:** The income figure (`kpi-hero`, 3rem, JetBrains Mono)
is the largest element on the results screen. The balance is secondary, in
`kpi-secondary` (1.875rem). The income replacement ratio badge sits alongside
the income figure — green, amber, or red — giving an immediate adequacy signal.

### 2. Transparency by Design (ASIC RG 244)

Every modifiable assumption carries an `(i)` tooltip icon showing:
- The historical basis (e.g., *"RBA inflation target: 2–3%. Long-run median
  2000–2025: 2.6%"*)
- The modelled default and why it was chosen
- An aggressiveness signal (*"Conservative / Reasonable / Aggressive"*)

This is not UX nicety — it is the primary ASIC compliance mechanism. A user
who understands that an 8.5% return assumption is *"above the historical
median for balanced super funds"* is an informed user.

### 3. Failure is Informative, Not Alarming

When the model shows depletion, the UI explains *why* and *what levers exist*,
rather than just showing a red number. Tone: *"Here is what the model shows
under these assumptions. Here are the variables that most affect this outcome."*

- **Amber** (`income-caution`) → deterministic depletion or Monte Carlo worst-10% depletes
- **Red** (`income-critical`) → Monte Carlo median depletes (serious signal)

The depletion warning always links to the Sensitivity Analysis section.

### 4. Neutral, Educational Language

ASIC RG 244 requires language that does not constitute personal financial advice.
All UI strings should be audited against this checklist:

| ❌ Remove | ✅ Replace with |
|---|---|
| "you should" | "you may wish to explore" |
| "optimize your retirement" | "model your retirement" |
| "personalized recommendations" | "suggestions based on your inputs" |
| "save more" | "increasing contributions illustrates..." |
| "recommended for you" | "this scenario shows..." |
| "grow your super" | "project your super" |

### 5. Progressive Disclosure

Full complexity should not overwhelm. The hierarchy:

```
Level 1: Three inputs → "Will I be OK?" (index.html Basic mode)
Level 2: Full calculator → Detailed projection (advanced.html)
Level 3: Advanced assumptions → Scenario sandbox (advanced-design.html)
```

Within Level 2 (advanced.html), assumption panels are collapsed by default
with a clear label indicating impact: *"Investment Assumptions (most impactful)"*.

---

## Color System

### Light Mode (default)

| Role | Token | Value |
|------|-------|-------|
| Page background | `cream-50` | `#FAF8F5` |
| Card surface | `cream-100` | `#F3F0EA` |
| Primary text | `charcoal-900` | `#1A1A2E` |
| Secondary text | `charcoal-700` | `#374151` |
| Accent / milestone | `gold-500` | `#C9A227` |

### Dark Mode

| Role | Token | Value |
|------|-------|-------|
| Page background | `navy-950` | `#0D1421` |
| Card surface | `navy-900` | `#102040` |
| Primary text | white | `#FFFFFF` |
| Secondary text | `charcoal-100` | `#F3F4F6` |
| Accent / milestone | `gold-500` | `#C9A227` |

### Income Adequacy (semantic — consistent across modes)

| Ratio | Token | Hex | Label |
|-------|-------|-----|-------|
| ≥ 70% | `income-healthy` | `#2D6A4F` | On Track |
| 50–70% | `income-caution` | `#E07B39` | Review Needed |
| < 50% | `income-critical` | `#B5342A` | Shortfall |

### Chart Colours (accessible, pattern + label redundancy)

| Scenario | Hex | Style |
|----------|-----|-------|
| Balanced | `#1B4F72` | Solid line (primary) |
| Aggressive | `#148A7E` | Dashed line |
| Conservative | `#6B7FD6` | Dotted line |
| Retirement marker | `#C9A227` gold | Vertical line |
| Depletion marker | `#B91C1C` red | Dot + tooltip |

---

## Typography

### Font Selection Rationale

**Playfair Display** (headings) — The editorial gravitas of the Financial Times
or The Economist. Signals authority without corporate coldness. Pairs naturally
with financial content that requires users to trust the source.

**JetBrains Mono** (all numbers) — Numbers *should look like numbers*. Monospace
ensures column alignment in tables. The coding-tool aesthetic signals precision
and calculation — appropriate for a modelling tool.

**DM Sans** (UI chrome) — Slightly geometric, clean utility sans-serif. Does
not compete with the display type. Highly legible at small sizes (tooltips, labels).

**Source Serif 4** (body) — Readable at length, matches the editorial tone of
the display font family. Used for explanatory text in methodology sections.

### Type Scale

```
KPI Hero      3rem / JetBrains Mono Bold    ← Annual income figure
KPI Label     0.75rem / Playfair Display     ← "Estimated Annual Income"
Section H2    1.25rem / DM Sans SemiBold     ← Tab headings
Body          0.9375rem / Source Serif 4     ← Explanatory copy
Caption       0.75rem / DM Sans              ← Labels, footnotes, tooltips
Data Table    1rem / JetBrains Mono          ← Numbers in tables/lists
```

---

## Motion & Interaction

### Page Load (one orchestrated sequence — not scattered micro-interactions)

```
0ms    Background colour fades in
100ms  FWT statement bar slides down from top
200ms  Page header fades up from translateY(10px)
300ms  First input section card appears
380ms  Second card appears
460ms  Third card appears
540ms  Action buttons appear
```

CSS animation-delay stagger on `.input-section-card:nth-child(n)`.

### Calculate → Results Transition

```
Button press:  scale(0.97) 80ms → scale(1.0) 80ms
Results panel: hidden → visible, translateY(20px) → translateY(0), 400ms ease-out
KPI numbers:   count up from 0 to final value, 800ms
Sensitivity bars: width 0% → final%, 500ms ease-out, stagger 80ms per bar
```

### Tooltips

Simple opacity 0→1 over 150ms. No movement — keeps attention on the data.

---

## Chart Design Guidelines

### Balance-Over-Time (primary results chart)

- **Three scenario lines**: conservative (dotted `#6B7FD6`), balanced (solid `#1B4F72`), aggressive (dashed `#148A7E`)
- **Retirement age marker**: vertical gold line with "Retirement Age" label above
- **Depletion marker**: red dot at the point a line crosses zero, with tooltip
- **No fills under lines** — cleaner for multiple overlapping scenarios
- **Grid**: subtle `rgba(0,0,0,0.06)` horizontal only
- **Axis labels**: DM Sans 11px, no rotated x-axis text

### Sensitivity Bar Chart

- Horizontal bars sorted by **absolute impact** (largest driver at top)
- Positive bars (income-improving): `income-healthy` green
- Negative bars (income-reducing): `income-critical` red
- Inline value label: `"+$4,200/yr"` or `"-$3,100/yr"` in JetBrains Mono

---

## ASIC Compliance Design Checklist

| Mechanism | Implementation |
|---|---|
| FWT statement | Persistent sticky bar — top of every page |
| General advice disclaimer | Modal on first visit (advanced.html) + footer on all pages |
| Assumption transparency | (i) tooltip on every modifiable parameter field |
| Scenario framing | All outputs carry scenario label (Conservative / Balanced / Aggressive) |
| Depletion tone | Explanatory ("model shows...") not predictive ("will run out") |
| Language audit | No "you should", "recommended for you", or "optimize" |
| Methodology disclosure | Expandable accordion on every results page |
| No personalisation default | No localStorage pre-fill without explicit user action |

---

## Component Inventory (By Page)

### index.html (Base Mode)
- Guided 3-step input form (age, super, salary)
- Single KPI card (estimated annual income + replacement ratio badge)
- "Want more control? Try Advanced Mode →" nudge link
- Inline disclaimer banner (not modal)

### advanced.html (Full Calculator)
- FWT statement bar (sticky)
- Blocking disclaimer modal (first visit only)
- 4-column input grid (colour-coded sections)
- Scenario preset buttons (Conservative / Balanced / Aggressive / Reset)
- Result tabs: Outcome → Summary → Suggestions → Charts → ...
- **Income KPI card** (hero) + replacement ratio badge
- **Depletion warning banner** (conditional, amber/red)
- **Sensitivity analysis panel** (top 3 drivers, horizontal bars)
- **Methodology accordion** (bottom of results section)

### advanced-design.html (Modelling Sandbox)
- Prominent ASIC disclaimer (starts expanded)
- Warning banner: "Advanced inputs significantly affect results"
- Collapsible input sections with (i) tooltips
- Scenario preset buttons
- Full-width Calculate button
- Primary KPI card + income replacement ratio badge
- Scenario comparison table (Conservative / Balanced / Aggressive)
- Sensitivity analysis
- Stress test panel (Sequence of Returns / Market Crash)
- Methodology accordion

---

*This DESIGN.md is maintained alongside the codebase. When adding new
features, update the component inventory and token definitions here first.
Design decisions made here take precedence over ad hoc Tailwind classes.*
