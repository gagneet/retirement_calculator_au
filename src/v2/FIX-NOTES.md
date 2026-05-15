# Fix Notes — advanced-v2.html issues

## Symptoms reported
1. **Results panel shows `$—` everywhere** (controller never paints)
2. **Caret/chevron icons on accordion section headers are invisible**

## Root causes

### Bug 1 — Invisible carets and other SVGs
HtmlWebpackPlugin in production mode minifies your HTML. The default minifier
lowercases ALL attribute names. **SVG attributes are case-sensitive** — when
`viewBox` becomes `viewbox`, the browser ignores it and the SVG collapses to
zero size. Same for `preserveAspectRatio`, etc.

**Fix:** updated `webpack.config.patch` to set `minify.caseSensitive: true` for
the new page. (Also added explicit `width="22" height="22"` to every chevron
SVG as belt-and-braces — they'll still render even if minifier is misconfigured.)

### Bug 2 — JS controller never runs / paints
Most likely one of:

- The script fired before DOM was ready
- An error in `boot()` killed execution silently
- An ID mismatch caused a null reference

**Fix:** updated `advanced-v2.js`:
- Boot no longer relies on `DOMContentLoaded` exclusively — it falls back to
  `setTimeout(boot, 0)` if DOM is already ready (which it always is for a
  webpack-injected `<script defer>`).
- Wrapped boot in try/catch — if anything throws, a **red banner appears in the
  results card** with the error message instead of failing silently.
- All `getElementById` calls in `paint()` now use a defensive `$()` helper that
  no-ops on missing elements, so one bad ID doesn't break the whole render.

## How to apply

```bash
# From repo root
cp pr-bundle/src/advanced-v2.html        src/advanced-v2.html
cp pr-bundle/src/js/advanced-v2.js       src/js/advanced-v2.js

# Re-apply webpack patch (or hand-edit — see below)
patch -p0 < pr-bundle/webpack.config.patch

# Build + deploy
npm run build
bash deploy.sh
```

If `patch` fails because you already applied an earlier version, just
**hand-edit** `webpack.config.js`: find your existing `advanced-v2.html`
`HtmlWebpackPlugin` entry and add the `minify` block:

```js
new HtmlWebpackPlugin({
    template: './src/advanced-v2.html',
    filename: 'advanced-v2.html',
    chunks: ['advancedV2'],
    minify: {
        collapseWhitespace: true,
        removeComments: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,
        caseSensitive: true,           // ← THIS is the SVG fix
    },
}),
```

## How to verify the fixes worked

1. Open `https://retirement.gagneet.com/advanced-v2.html`
2. Open browser DevTools (F12) → **Console** tab
3. You should see:
   ```
   [advanced-v2] boot starting
   [advanced-v2] boot complete
   ```
4. The results card should show a **non-`—` monthly paycheck** (something like
   `$3,250` from the default seed values)
5. Caret icons should be visible on every section header

## If results are STILL `—` after these fixes

The console will now tell us why. **Send me the console output.** Likely
candidates and what they mean:

| Console message | What it means | Fix |
|---|---|---|
| `[advanced-v2] BOOT FAILED: <error>` | Controller threw during init | Tell me the error |
| Nothing — no log at all | JS bundle didn't load | Network tab → look for failed request for `advancedV2.[hash].js` |
| `[advanced-v2] boot complete` but display still `—` | Engine returned bad shape | Inspect `result` object in `runEngine()` |

## Next step — wire your real engine

The page currently uses the **stub engine** (see `stubProjection` in
`advanced-v2.js`). It's plausible but not accurate. Once these two bugs are
verified fixed, replace `runEngine()` with your real engine call — see the
original README in this bundle for the expected return shape.
