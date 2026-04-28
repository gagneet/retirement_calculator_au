# End-to-End (E2E) Playwright Tests

Browser-based tests that run against the live production site at https://retirement.gagneet.com.
They cover every user-facing workflow from a real browser perspective.

## Prerequisites

Playwright and Chromium are installed in the project-local `playwright_modules/` directory
(required because the main `node_modules/` is owned by root from a prior `sudo npm install`).

```bash
# Already installed — no action needed
# If you ever need to reinstall:
npm install --prefix playwright_modules @playwright/test
playwright_modules/node_modules/.bin/playwright install chromium
```

## Running Tests

```bash
# Full suite (Chromium + Mobile) — ~15-20 min
npm run test:e2e

# Chromium only (faster)
./playwright_modules/node_modules/.bin/playwright test --project=chromium

# Single spec file
./playwright_modules/node_modules/.bin/playwright test tests/e2e/05-basic-calculation.spec.js --project=chromium

# With pattern filter
./playwright_modules/node_modules/.bin/playwright test --grep "disclaimer" --project=chromium

# Interactive UI mode (requires display)
npm run test:e2e:ui

# View HTML report after run
npm run test:e2e:report
```

## Test Files

| File | What it covers |
|------|---------------|
| `01-landing-page.spec.js` | Landing page (index.html) — hero, CTAs, navigation, SEO |
| `02-disclaimer.spec.js` | Disclaimer modal — first visit, acceptance, localStorage persistence |
| `03-onboarding.spec.js` | Onboarding wizard — 5-step flow, breadcrumb, navigation buttons |
| `04-calculator-form.spec.js` | Calculator form — visibility, input fields, default values, toggle |
| `05-basic-calculation.spec.js` | Core calculation — runs projection, outcome data, summary tab |
| `06-result-tabs.spec.js` | All 12 result tabs — navigation, content verification, what-if sliders |
| `07-advanced-analysis.spec.js` | Advanced tools — Monte Carlo, Stress Test, AI Recommendations, etc. |
| `08-export.spec.js` | Export — CSV download, XLSX/PDF trigger, dropdown behaviour |
| `09-data-management.spec.js` | Save/load data, reset defaults, localStorage, theme toggle |
| `10-navigation.spec.js` | Nav menu, all static pages, mobile hamburger, sitemap |
| `11-australian-financial-rules.spec.js` | AU-specific: Age Pension, Super, investment property, ASFA |
| `12-accessibility-performance.spec.js` | Keyboard nav, ARIA labels, page load times, responsive layout, error handling |

## Helpers (`helpers/page-utils.js`)

| Function | Purpose |
|----------|---------|
| `bypassDisclaimer(page)` | Sets `disclaimerAccepted` in localStorage before page load |
| `acceptDisclaimer(page)` | Clicks the accept button to test the actual modal flow |
| `showCalculatorForm(page)` | Forces the calculator form visible (bypasses onboarding container) |
| `waitForCalculationResults(page)` | Waits for summary tab to be populated (app lands here after `btnCalculate`) |
| `goToOutcomeTab(page)` | Clicks the Outcome tab and ensures `outcome-view-container` is active |
| `openExportDropdown(page)` | Clicks Export button and returns the dropdown locator |

## Key Behavioural Notes

- **After calculation**: `btnCalculate` triggers `showTab('summary')`, so the app always
  lands on the **Summary tab** after a calculation. Tests checking outcome-tab elements
  must call `goToOutcomeTab()` first.

- **Outcome view container**: `#outcome-view-container` only shows when it has `.active`
  class. The JS adds this in `displayOutcomeResults()`. When tests bypass onboarding
  (via `showCalculatorForm`), the outcome engine may fail silently. `goToOutcomeTab()`
  programmatically adds `.active` so tests can assert on the data that WAS populated.

- **Disclaimer bypass**: All tests that use `advanced.html` call `bypassDisclaimer()` via
  `addInitScript` to skip the modal. Tests in `02-disclaimer.spec.js` explicitly clear
  the localStorage key first to test the modal flow.

- **Monte Carlo tests**: `07-advanced-analysis.spec.js` uses `numRuns: 1000` (minimum)
  for the Monte Carlo test to keep duration reasonable. Full runs with 10,000 iterations
  take 60+ seconds.

## Configuration

See `playwright.config.js` in the project root. The base URL is `https://retirement.gagneet.com`.
Screenshots, videos and traces are captured on failure in `test-results/`.
The HTML report is generated at `playwright-report/`.
