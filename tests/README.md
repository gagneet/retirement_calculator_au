# Tests

This directory contains the Jest-based test suite for the Australian Retirement Calculator.

## Directory Structure

```
tests/
├── __mocks__/
│   └── fileMock.js          # Mock for CSS/LESS/SCSS imports
├── unit/
│   ├── chart-safety.test.js  # Chart.js undefined safety checks
│   ├── navigation.test.js    # Redirect loop prevention & button visibility
│   ├── new-fields.test.js    # New fields: AU residency, reduced income, carer impact (Items 7, 9, 10)
│   └── tax-calculations.test.js  # Australian tax bracket calculations
├── integration/
│   └── outcome-tab.test.js   # Fix 5: Outcome tab overview bar visibility
└── README.md                 # This file
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
