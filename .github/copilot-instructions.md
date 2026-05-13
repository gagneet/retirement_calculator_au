# Copilot Instructions

## Build and test commands

- `npm run build` builds the production webpack bundle into `dist/`.
- `npm test` runs the Jest suite configured for `tests/`.
- Run a single Jest file with `npx jest tests/unit/chart-safety.test.js`.
- Run a single Jest test by name with `npx jest tests/unit/chart-safety.test.js -t "destroyChart does not throw"`.
- `npm run test:e2e` runs the Playwright suite against `https://retirement.gagneet.com`.
- Run a single Playwright spec with `./playwright_modules/node_modules/.bin/playwright test tests/e2e/05-basic-calculation.spec.js --project=chromium`.
- Run a filtered Playwright test with `./playwright_modules/node_modules/.bin/playwright test --grep "disclaimer" --project=chromium`.
- There is no dedicated lint script in `package.json`.

## High-level architecture

- `src/js/app.js` is the main orchestration layer for `index.html` and `advanced.html`. It initializes versioned config, the core simulator, onboarding, disclaimer flow, tab/result rendering, imports/exports, and advanced analysis engines.
- `src/js/simulator.js` handles the detailed retirement projection logic used by the main calculator. `src/js/simulation_engine/` is a second analysis pipeline for life simulation, Monte Carlo, strategy optimisation, and recommendation generation; `runFullSimulation()` composes that pipeline for deeper analysis flows.
- `src/js/outcome-engine.js` is a separate conservative calculator that complements the full simulator with a simpler gap-analysis style projection.
- `src/js/utils.js` is shared infrastructure: DOM helpers, formatted input parsing, financial helpers, import/export, notifications, and local storage wrappers. `src/js/charts.js` owns Chart.js lifecycle and rendering.
- `src/js/comparison.js` is a separate entry point for `comparison.html`; it reads saved calculator inputs from local storage and builds comparison scenarios on top of the simulator.
- Webpack bundles two entry points (`main` and `comparison`), emits static pages into `dist/`, and copies some files verbatim. In particular, `advanced-design.html` uses standalone ES modules copied from `src/js/advanced-design-*.js` rather than the main bundle.

## Key conventions

- Treat `src/` as the source of truth and `dist/` as generated output served by nginx.
- Use `https://retirement.gagneet.com` for browser verification. Playwright is configured to hit that live site, and repository guidance explicitly says not to rely on localhost for testing.
- Preserve the config/versioning flow. `src/js/version-manager.js` is the authoritative entry for schema versions, and imported user data should continue to pass its stored `version` into `populateFormFromData(...)` so older exports hydrate correctly.
- Keep calculation logic out of `app.js` where possible. New financial modelling belongs in `simulator.js`, `simulation_engine/`, or focused engine modules; `app.js` should stay as the coordinator for UI state and event wiring.
- Internal financial values are numeric. Currency and percentages are formatted at the UI boundary through `utils.js`; percentages are stored as decimals and converted for display/input formatting.
- Reuse `utils.js` helpers such as `safeGetValue`, `safeSetValue`, `parseFormattedNumber`, `showNotification`, and the input-initialization helpers instead of reading or formatting DOM values ad hoc.
- Be careful with persisted browser state. The calculator, onboarding, disclaimer, comparison page, and outcome planning all depend on local-storage-backed flows such as `retirement-calculator-inputs`, `disclaimerAccepted`, `hasVisitedCalculator`, and `outcome_plan`.
- CDN-backed globals such as Chart.js, XLSX, and jsPDF are expected at runtime, but the codebase guards and tests missing-global behavior. Follow the existing pattern of checking availability before use.
- Playwright is intentionally installed under `playwright_modules/`, and repo scripts call that local binary directly.
