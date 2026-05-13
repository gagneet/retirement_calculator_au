# Tests

This directory contains the Jest-based test suite for the Australian Retirement Calculator.

## Directory Structure

```
tests/
├── __mocks__/
│   └── fileMock.js                        # Mock for CSS/LESS/SCSS imports
├── unit/
│   ├── advanced-page-structure.test.js    # advanced.html UX fixes: action buttons, grid, dark mode, back links
│   ├── calculation-audit.test.js          # ★ Calculation audit: 8 bug fixes + Budget 2026-27 measures
│   ├── chart-safety.test.js               # Chart.js undefined safety checks
│   ├── export-functions.test.js           # CSV, XLSX, PDF export functions
│   ├── home-page-structure.test.js        # index.html action buttons & HTML structure
│   ├── json-import-percentage.test.js     # JSON import: percentage decimal→% conversion for all fields
│   ├── life-simulation-engine.test.js     # Life simulation engine calculations
│   ├── navigation.test.js                 # Redirect loop prevention & button visibility
│   ├── new-fields.test.js                 # New fields: AU residency, reduced income, carer impact (Items 7, 9, 10)
│   ├── new-fields-2026.test.js            # 2026 schema: education costs, overseas income, etc.
│   ├── sitemap-seo.test.js                # sitemap.xml completeness and HTTPS URL validation
│   └── tax-calculations.test.js           # Australian tax bracket calculations (updated for Bug 1 & 5 fixes)
├── integration/
│   └── outcome-tab.test.js                # Fix 5: Outcome tab overview bar visibility
└── README.md                              # This file
```

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npx jest --testPathPattern=tests/ --coverage

# Run a specific test file
npx jest tests/unit/chart-safety.test.js

# Run in watch mode during development
npx jest --testPathPattern=tests/ --watch
```

## What is Tested

### Unit Tests

**`calculation-audit.test.js`** — 110 tests (★ new)

Comprehensive test suite that verifies the 8 calculation bug fixes and all Budget 2026-27
proposed measures. Every assertion uses independently verified reference data:

| Test group | Tests | Reference source |
|---|---|---|
| Bug 1: Tax bracket off-by-one | 5 | ATO bracket width arithmetic |
| Bug 2: salaryGrowthRate double-divide | 5 | First-principles nominal salary compound growth |
| Bug 3: leanYearsReduction double-divide | 5 | Percentage reduction arithmetic |
| Bug 4: healthcareInflation double-divide | 5 | AIHW 3.82% median rate, compound growth |
| Bug 5: CGT double-discount | 7 | ATO CGT with 50% discount, effective vs marginal rates |
| Bug 6: returnDeclineRate double-divide | 5 | Annual return arithmetic |
| Bug 7: Home grows at propertyGrowthRate | 6 | CoreLogic 5.8% median vs CPI 2.6% |
| Bug 8: agedCareProbability double-divide | 4 | Probability × cost arithmetic |
| ATO 2025-26 tax with LITO + Medicare | 9 | ATO Tax Withheld Calculator reference values |
| FY 2026-27 15% bracket (legislated) | 5 | Budget 2024-25 Stage 3 redesign ($268/yr max saving) |
| FY 2027-28 14% bracket (proposed) | 5 | Budget 2026-27 doc ($536 cumulative saving) |
| Proposed WATO $250 offset | 6 | Budget 2026-27 (97% receive full $250) |
| Proposed $1,000 instant deduction | 6 | Budget 2026-27 (reduces taxable income) |
| Proposed CGT reform post-2027 | 7 | Budget 2026-27 (inflation-indexed + 30% min) |
| Age Pension asset & income test | 13 | Services Australia Sept 2025 rates |
| Deeming rates | 6 | Services Australia Sept 2025 (0.75%/2.75%) |
| Toggle behaviour (proposed OFF by default) | 7 | Internal logic verification |

**Key design principles:**
- Tests are self-contained (inline implementations) — no imports from source that could
  accidentally re-import a bug
- All expected values are computed from first principles and independently verifiable
- The toggle group confirms proposed measures are `$0 / no-op` when disabled

**`chart-safety.test.js`**
- Verifies `destroyChart` does not throw a ReferenceError when `Chart` global is undefined
- Verifies chart destruction works correctly when Chart.js is loaded
- Covers the `renderFanChart` guard that was added to prevent crashes

**`navigation.test.js`**
- Verifies `index.html` is the main landing page — no auto-redirect to `advanced.html` for first-time or returning visitors
- Confirms the old `hasVisitedBefore`/`skipRedirect` auto-redirect conditional has been removed
- Tests `startOnboardingBtn` and `startOnboardingBtn2` click handlers set `sessionStorage.startOnboarding` and target `advanced.html?onboarding=true`
- Tests `advancedCalculatorForm` is hidden (`style="display:none"`) on page load for all visitor types
- Tests `showAdvancedCalculatorButton` does NOT have the `hidden` class (always visible)
- Tests `DOMContentLoaded` handler collapses the form and shows "Show Advanced Calculator (Optional)" text
- Tests `toggleAdvancedCalculator()`: first toggle expands with "Hide" text, second collapses with "Show" text, three toggles ends expanded

**`tax-calculations.test.js`** (updated)
- Tests Australian 2025-26 income tax bracket calculations using the **fixed** bracket-width
  implementation (Bug 1 fix: `bracket.max - bracket.min + 1` for non-zero-min brackets)
- Verifies tax-free threshold (under $18,200 = $0 tax)
- Tests each tax bracket: 0%, 16%, 30%, 37%, 45%
- Tests Capital Gains Tax using the **fixed** effective-rate semantics (Bug 5 fix):
  `effectiveCGTRate` already includes the 50% discount; function does not apply it again.
  Short holds (<1yr) double the rate back to marginal. Non-residents same as short hold.
- Tests Age Pension asset test taper logic
- Tests homeowner vs non-homeowner thresholds (+$242,000 supplement)

**`json-import-percentage.test.js`**
- Verifies the seven previously-missing fields are now included in `populateFormFromData`'s `percentageFields` and converted correctly (×100) on v4.0 JSON import: `carerReducedWorkPercent`, `vacancyRate`, `maintenanceInflation`, `trustTaxRate`, `beneficiaryAllocation`, `extremeInflationProbability`, `propertyCrashProbability`
- Regression-tests known-good fields (`investmentReturn`, `superReturn`, `salaryGrowthRate`, `inflation`, `returnDeclineRate`)
- Confirms v1.0/v2.0 (non-decimal) imports are NOT multiplied
- Asserts that all eight dependent percentage fields (`childrenUnder5Percent`, etc.) are absent from `initializePercentageInputs`'s field list — these are `type="number"` inputs and would become blank if `addPercentageFormatting` appended a `%` suffix
- Verifies `childrenUnder5Percent`, `childrenPrimaryPercent`, `teenagersPercent` are declared `type="number"` in `advanced.html`
- Confirms `investmentReturn`, `superReturn`, `salaryGrowthRate` have no `step` attribute (semantically invalid on `type="text"`) and are `type="text"`
- **Round-trip tests**: import decimal → form display (×100) → collectInputs (÷100) = original decimal — confirms the "Save Data adds extra zeros" bug is fixed
- **Double-division regression**: without version (old bug), `vacancyRate: 0.04` → form `0.04` → export `0.0004`; each re-import+save compounds the error
- **app.js version-passing**: verifies both import paths call `populateFormFromData(data.userData, data.version)` — the missing `data.version` argument was the root cause of `storedAsDecimal=false` and all export corruption

**`new-fields.test.js`**
- Tests Australian residency years calculation when `ageCameToAustralia` is provided
- Tests superannuation contribution years based on `ageStartedEarningAustralia`
- Tests reduced income scenario: salary switches at specified age
- Tests carer work-capacity reduction impact on income

**`export-functions.test.js`**
- Tests that `exportToCSV` generates a Blob of type `text/csv` and triggers an anchor download
- Tests that `exportToCSV` correctly applies age formatting when inputs are provided
- Tests that `exportToCSV` escapes CSV values containing commas
- Tests that `exportToXLSX` calls `showNotification` with `'error'` type when `XLSX` global is undefined and results exist
- Tests that `exportToPDF` calls `showNotification` with `'error'` type when `window.jspdf` is undefined and results exist
- Tests that `extractAnalysisData` returns the expected nine-key shape with null optional fields when `app` is null
- Tests that `addEnhancedAnalysisToXLSX` skips Suggestions and Persona Recommendations sheets when those fields are null

**`sitemap-seo.test.js`**
- Verifies `src/sitemap.xml` exists and is non-empty
- Confirms required URL entries are present: `/`, `advanced.html`, `how-to-use.html`, `comparison.html`
- Validates that all `<loc>` URLs use HTTPS and point to the production domain `retirement.gagneet.com`
- Checks that all `<priority>` values are between 0 and 1 (inclusive)
- Validates that all `<lastmod>` dates follow the `YYYY-MM-DD` format
- Confirms the root URL has priority `1.0` and `advanced.html` has priority >= 0.8

**`advanced-page-structure.test.js`**
- Verifies `action-buttons-container` does NOT have `class="hidden"` on load (Fix: always visible)
- Confirms the calculator grid has `md:grid-cols-2` breakpoint and `items-start` alignment
- Verifies the Australian Residency block has no `dark:bg-indigo-900` override
- Verifies the Aged Parents block has no `dark:bg-purple-900` override
- Verifies the Reduced Income block has no `dark:bg-amber-900` override
- Confirms all 11 result tabs contain a "Back to Action Buttons" link (summary, recommendations, suggestions, projection, property, riskAnalysis, charts, optimization, overseas, scenarios, lifeSimulator)
- Validates correct section ordering in the 4-column grid
- Checks all 6 key action button IDs exist
- Confirms all 12 tab `showTab()` calls are present
- Verifies `scrollToActionButtons` function is defined

**`home-page-structure.test.js`**
- Verifies the `action-buttons-container` div exists in `src/index.html`
- Verifies the `btnCalculate` and `btnMonteCarlo` button IDs exist
- Confirms `section-personal-risk`, `section-property`, `section-economic`, and `section-pension` all exist
- Validates correct sibling ordering: property > economic > pension each appear after personal-risk
- Verifies `section-property`, `section-economic`, and `section-pension` are NOT nested inside `section-personal-risk` (checks closing divs exist between them)
- Confirms the How It Works section contains "Quick Start" text and that it appears before the `advancedCalculatorForm` grid (not inside the calculator form)
- Verifies `action-buttons-container` appears before `advancedCalculatorForm`
- Confirms the 4-column grid layout class `lg:grid-cols-4` is present
- Verifies `showAdvancedCalculatorButton` does NOT have the `hidden` class (always visible on load)
- Verifies `advancedCalculatorForm` has `style="display:none"` (collapsed by default for all visitors)
- Confirms the old auto-redirect variables (`hasVisitedBefore`, `skipRedirect`) are absent from `index.html`
- Verifies `startOnboardingBtn` and `startOnboardingBtn2` IDs exist for user-initiated onboarding

### Integration Tests

**`outcome-tab.test.js`**
- Verifies the `outcome-overview-stats` bar is outside `outcome-view-container`
- Tests that the overview bar is visible before a calculation runs
- Tests that the view container can be hidden while the overview bar remains visible
- Tests the DOM structure order (overview bar appears before view container)

## Configuration

Jest is configured in `package.json`:
- **Test environment**: `jsdom` (browser-like DOM)
- **Transform**: `babel-jest` for ES6+ support
- **Module mapper**: CSS files are mocked via `fileMock.js`

## Notes

- These tests run on the calculation logic and DOM structure, not on live network requests
- Chart.js, jsPDF, and XLSX are external CDN dependencies and are mocked/guarded in tests
- The production URL is https://retirement.gagneet.com — always verify live behaviour after deployment
