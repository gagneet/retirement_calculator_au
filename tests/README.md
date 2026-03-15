# Tests

This directory contains the Jest-based test suite for the Australian Retirement Calculator.

## Directory Structure

```
tests/
├── __mocks__/
│   └── fileMock.js                    # Mock for CSS/LESS/SCSS imports
├── unit/
│   ├── chart-safety.test.js           # Chart.js undefined safety checks
│   ├── export-functions.test.js       # CSV, XLSX, PDF export functions
│   ├── home-page-structure.test.js    # index.html action buttons & HTML structure
│   ├── life-simulation-engine.test.js # Life simulation engine calculations
│   ├── navigation.test.js             # Redirect loop prevention & button visibility
│   ├── new-fields.test.js             # New fields: AU residency, reduced income, carer impact (Items 7, 9, 10)
│   ├── new-fields-2026.test.js        # 2026 schema: education costs, overseas income, etc.
│   ├── sitemap-seo.test.js            # sitemap.xml completeness and HTTPS URL validation
│   └── tax-calculations.test.js       # Australian tax bracket calculations
├── integration/
│   └── outcome-tab.test.js            # Fix 5: Outcome tab overview bar visibility
└── README.md                          # This file
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

**`chart-safety.test.js`**
- Verifies `destroyChart` does not throw a ReferenceError when `Chart` global is undefined
- Verifies chart destruction works correctly when Chart.js is loaded
- Covers the `renderFanChart` guard that was added to prevent crashes

**`navigation.test.js`**
- Tests that first-time visitors are redirected to onboarding
- Tests that `?skip=true` query parameter bypasses the onboarding redirect
- Tests that returning visitors (with `hasVisitedCalculator` in localStorage) are not redirected
- Tests the show/hide button logic for the advanced calculator form

**`tax-calculations.test.js`**
- Tests Australian 2024-25 income tax bracket calculations
- Verifies tax-free threshold (under $18,200 = $0 tax)
- Tests each tax bracket: 0%, 16%, 30%, 37%, 45%
- Tests Capital Gains Tax with 50% discount for 12+ month holdings
- Tests Age Pension asset test taper logic
- Tests homeowner vs non-homeowner thresholds (+$242,000 supplement)

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

**`home-page-structure.test.js`**
- Verifies the `action-buttons-container` div exists in `src/index.html`
- Verifies the `btnCalculate` and `btnMonteCarlo` button IDs exist
- Confirms `section-personal-risk`, `section-property`, `section-economic`, and `section-pension` all exist
- Validates correct sibling ordering: property > economic > pension each appear after personal-risk
- Verifies `section-property`, `section-economic`, and `section-pension` are NOT nested inside `section-personal-risk` (checks closing divs exist between them)
- Confirms the How It Works section contains "Quick Start" text and that it appears before the `advancedCalculatorForm` grid (not inside the calculator form)
- Verifies `action-buttons-container` appears before `advancedCalculatorForm`
- Confirms the 4-column grid layout class `lg:grid-cols-4` is present

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
