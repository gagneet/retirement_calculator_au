# Retirement Calculator — Redesign PR Bundle

This bundle adds a **parallel redesigned page** at `/advanced-v2.html` without
touching your existing `advanced.html`, `app.js`, or any calculation engine.

## What's in the bundle

```
pr-bundle/
├── README.md                         ← this file
├── webpack.config.patch              ← patch to register the new page
└── src/
    ├── advanced-v2.html              ← new redesigned page (vanilla HTML)
    ├── css/
    │   └── redesign.css              ← design tokens + all component styles
    └── js/
        └── advanced-v2.js            ← thin controller (~600 lines, vanilla)
```

## Installation (5 commands)

From the root of `retirement_calculator_au`:

```bash
# 1. Drop the new files into your repo (preserves your existing files)
cp -r pr-bundle/src/* src/

# 2. Apply the webpack patch
patch -p0 < pr-bundle/webpack.config.patch
# If that fails, just hand-edit webpack.config.js — the patch is tiny (see below)

# 3. Build
npm run build

# 4. Preview locally
npx serve dist
# open http://localhost:3000/advanced-v2.html

# 5. Ship
bash deploy.sh
```

## What the new files do

### `src/advanced-v2.html`
A full vanilla HTML page with:
- Two-column shell (form on left, sticky live results on right)
- 12 accordion sections covering every field from the original `advanced.html`
- Sticky results card (hero number, runway indicator, mini timeline chart, donut, gauge)
- Tabbed analysis section (Summary / What-If / Year-by-Year / Risk / AI)
- Mobile-responsive drawer

**Every input has an `id` you can wire to your engines.** They follow the
naming convention you'd expect (`age`, `retireAge`, `salary`, `superBal`,
`mortgage`, `desiredIncome`, etc.). The first run will use the IDs as-is; if
your engines expect different IDs (`currentAge` instead of `age`, etc.), do a
find-replace in `advanced-v2.html` to match.

### `src/css/redesign.css`
Self-contained design system. Adds zero conflicts with `styles.css` because all
new classes (`.shell`, `.section`, `.field`, `.results-card`, `.runway`,
`.mini-chart`, etc.) are namespaced under top-level component names.

The CSS supports:
- `data-theme="dark|light"` on `<html>` (your existing `theme.js` works as-is)
- `data-density="compact|comfortable|spacious"`
- `data-text-size="standard|large|x-large"` (accessibility — recommend "large" for older users)
- `data-headline="upright|italic"`
- `data-contrast="normal|high"`
- `data-accent="indigo|rose|amber"` (default: eucalyptus)

### `src/js/advanced-v2.js`
Thin controller doing four things:
1. **Accordion** open/close (single-open behaviour)
2. **Form ↔ engine** bridge (reads all inputs into an object, calls engine)
3. **Live recalc** on every input change (100ms debounce)
4. **Paint** result into the sticky panel and analysis tabs

The file currently ships with a **stub projection engine** (`stubProjection`)
so the page works out of the box. To wire your real engine:

1. Open `src/js/advanced-v2.js`
2. Uncomment the imports at the top:
   ```js
   import { runProjection } from './outcome-engine.js';
   import { runMonteCarlo } from './enhanced-monte-carlo.js';
   // ... etc
   ```
3. In `runEngine()` (line ~290), replace `stubProjection(inp)` with your real call:
   ```js
   function runEngine(inp) {
     return runProjection(inp);
   }
   ```

Your engine's return shape needs to provide:
```js
{
  monthlyPaycheck: Number,             // today's $/month at retirement
  superAtRetire:   Number,             // total super balance at retirement
  breakdown:       { super, pension, other },  // annual $ from each source
  confidence:      0..1,               // Monte Carlo success rate
  gapMonthly:      Number,             // target − projected (positive = shortfall)
  lastsUntil:      Number,             // age at which funds run out
  years: [                             // year-by-year projection
    { age, totalAssets, retired, withdraw, pension }
  ]
}
```

If your engine returns a different shape, write a small adapter inside
`runEngine()` to translate.

## webpack.config.js — the patch in plain English

If `patch` fails, hand-edit `webpack.config.js`:

**Add to the `entry` object:**
```js
entry: {
    main: './src/js/app.js',
    comparison: './src/js/comparison.js',
    advancedV2: './src/js/advanced-v2.js',    // ← add this
},
```

**Add to the `plugins` array** (anywhere near the other `HtmlWebpackPlugin` calls):
```js
new HtmlWebpackPlugin({
    template: './src/advanced-v2.html',
    filename: 'advanced-v2.html',
    chunks: ['advancedV2'],
}),
```

That's it.

## Phased rollout

| Phase | Action | Time |
|---|---|---|
| **A** | Drop in the files, build, view at `/advanced-v2.html` (works out of the box with stub engine) | 30 min |
| **B** | Wire your real engine in `runEngine()` — single function change | 1–2 hr |
| **C** | Audit field IDs — adjust `advanced-v2.html` to match your engines if needed | 2–4 hr |
| **D** | Port your Monte Carlo, AI recommendations, and resilience engines into the analysis tabs | 1–2 days |
| **E** | Add a header banner on `/advanced.html` pointing users to the new version: "Try the new design →" | 15 min |
| **F** | After a feedback period, redirect `/advanced.html` → `/advanced-v2.html` | 5 min |

## Testing

Your existing Jest unit tests on the engines **stay green** — we don't change
any engine code. Add new tests for the controller (`advanced-v2.js`) and
clone your Playwright tests pointing at the new selectors when you're ready
to cut over.

## Questions / where to look

| Need | File |
|---|---|
| Change colours, typography, spacing | `src/css/redesign.css` (CSS custom properties at the top) |
| Add/remove a form field | `src/advanced-v2.html` (sections are numbered 1–12) |
| Wire an engine call | `src/js/advanced-v2.js` → `runEngine()` |
| Change which fields are "advanced" | Add/remove `data-advanced="true"` attribute on the parent element |
| Single/Couple visibility | Add `data-household="couple"` attribute to anything that should only show for couples |
| IP/Overseas conditional visibility | `bindConditional('investmentProperty', 'data-ip')` in `advanced-v2.js` |

## Acknowledgements

The design system follows WCAG AA contrast guidance and is calibrated for an
audience aged 40s–70s (larger touch targets, 15.5px base font, upright serif
headlines, color-coded runway indicator). Text-size tweak goes up to 19px
base for users with presbyopia.

Have fun. Ping me back with any blockers.
