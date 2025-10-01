# Implementation Notes - Age Pension Enhancements

## PROMPT 1: Non-Pensioner Partner Age Pension Handling - COMPLETED

### Implementation Summary

Added comprehensive Age Pension calculation for couples where one partner is under Age Pension age (67).

### New Function: `calculateAgePensionForCouple()`

**Location:** `/src/js/utils.js` (lines 658-887)

**Purpose:** Correctly calculates Age Pension when one partner is under 67, ensuring non-pensioner's income and assets are included in the combined assessment.

### Key Features

1. **Three Scenarios Handled:**
   - Neither eligible (both under 67)
   - Both eligible (both 67+) - standard couple calculation
   - **One eligible (CRITICAL CASE)** - non-pensioner partner's income/assets included

2. **Critical Rules Implemented:**
   - ✅ Non-pensioner's salary included in combined income test
   - ✅ Non-pensioner's super and investments included in combined assets test
   - ✅ Couple thresholds used (not single) even though only one receives payment
   - ✅ Payment is couple rate divided by 2 (one recipient only)
   - ✅ Projects outcome when both become eligible

3. **Optimization Strategies Generated:**
   - Super contribution splitting (if imbalance > $50k)
   - Younger partner income optimization (if earning > $50k)
   - Retirement timing coordination (if age gap >= 3 years)
   - Asset reallocation strategies

### Usage Example

```javascript
import { calculateAgePensionForCouple } from './utils.js';

const person1 = {
    age: 67,
    super: 300000,
    investments: 100000,
    salary: 0
};

const person2 = {
    age: 62,
    super: 150000,
    investments: 50000,
    salary: 80000
};

const homeowner = true;
const config = {}; // Not currently used, reserved for future

const result = calculateAgePensionForCouple(person1, person2, homeowner, config);

// Result structure:
// {
//     eligible: true,
//     scenario: 'ONE_ELIGIBLE',
//     recipientCount: 1,
//     eligiblePartner: { age: 67, name: 'Partner 1' },
//     nonEligiblePartner: { age: 62, name: 'Partner 2', yearsUntilEligible: 5, salary: 80000 },
//     combinedAssessment: {
//         income: 80000,
//         assets: 600000,
//         warning: '⚠️ Non-pensioner partner's income and assets included in assessment'
//     },
//     currentPension: { annual: XXXXX, fortnight: XXX },
//     limitingTest: 'Income Test' or 'Assets Test',
//     whenBothEligible: {
//         yearsUntil: 5,
//         expectedPension: XXXXX,
//         increase: XXXX,
//         increasePercent: 'XX.X'
//     },
//     strategies: [
//         { type: '...', priority: 'HIGH', description: '...', action: '...', benefit: '...', timeframe: '...' }
//     ]
// }
```

### Integration Points

To integrate with simulator.js:

1. Import the function:
```javascript
import { calculateAgePensionForCouple } from './utils.js';
```

2. Replace existing Age Pension calculation (around line 1008 in simulator.js):
```javascript
// Old code:
const pensionIncome = calculateAgePension(
    assessableAssets,
    propertyIncome,
    isCouple,
    isCouple ? inputs.agePensionMax : this.config.SINGLE_PENSION_MAX,
    isCouple ? inputs.pensionAssetThreshold : this.config.SINGLE_ASSET_THRESHOLD,
    isCouple ? inputs.pensionAssetLimit : this.config.SINGLE_ASSET_LIMIT,
    isCouple ? inputs.pensionIncomeThreshold : this.config.SINGLE_INCOME_THRESHOLD
);

// New code (when couple):
if (isCouple) {
    const person1 = {
        age: yourCurrentAge,
        super: inputs.yourCurrentSuper,
        investments: currentBalance, // or appropriate asset value
        salary: i === 0 ? inputs.yourSalary : 0 // salary only in first year
    };

    const person2 = {
        age: partnerCurrentAge,
        super: inputs.partnerCurrentSuper,
        investments: 0, // adjust as needed
        salary: i === 0 ? inputs.partnerSalary : 0
    };

    const homeowner = inputs.homeValue > 0 && !inputs.planToDownsize;
    const pensionResult = calculateAgePensionForCouple(person1, person2, homeowner, {});

    const pensionIncome = pensionResult.eligible ? pensionResult.currentPension.annual : 0;

    // Store pension result for display
    if (i === 0) {
        yearlyData[yearlyData.length - 1].pensionDetails = pensionResult;
    }
} else {
    // Keep existing single person calculation
    const pensionIncome = calculateAgePension(...);
}
```

### Display Recommendations

When displaying results, check for non-pensioner partner scenario:

```javascript
if (pensionDetails && pensionDetails.scenario === 'ONE_ELIGIBLE') {
    // Display warning
    console.warn(pensionDetails.combinedAssessment.warning);

    // Display strategies
    pensionDetails.strategies.forEach(strategy => {
        console.log(`${strategy.priority}: ${strategy.type}`);
        console.log(`Action: ${strategy.action}`);
        console.log(`Benefit: ${strategy.benefit}`);
    });

    // Display future projection
    console.log(`When both eligible (in ${pensionDetails.whenBothEligible.yearsUntil} years):`);
    console.log(`Expected pension: $${pensionDetails.whenBothEligible.expectedPension.toLocaleString()}`);
    console.log(`Increase: $${pensionDetails.whenBothEligible.increase.toLocaleString()} (${pensionDetails.whenBothEligible.increasePercent}%)`);
}
```

### Test Cases

**Test Case 1: One partner eligible**
- Person 1: Age 67, Super $300k, Investments $100k, Salary $0
- Person 2: Age 62, Super $150k, Investments $50k, Salary $80k
- Expected: Combined assets $600k, combined income $80k, pension reduced, show strategies

**Test Case 2: Both eligible**
- Both age 68, similar super balances
- Expected: Standard couple calculation, no special warnings

**Test Case 3: Neither eligible**
- Both under 67
- Expected: Not eligible, show years until eligibility

### Next Steps for Full Integration

1. Update simulator.js to call new function when couple status detected
2. Add UI section in index.html to display non-pensioner partner warnings
3. Update results display in app.js to show strategies
4. Add to decision-support-engine.js recommendations

### Configuration Constants Used

From `config.js`:
- Asset threshold (homeowner couple): $470,000
- Asset threshold (non-homeowner couple): $712,500
- Asset limit (homeowner couple): $1,031,000
- Income threshold (couple, fortnight): $380
- Maximum rate (couple combined, annual): $46,202 (1777 * 26)
- Taper rate (assets): $3 per fortnight per $1,000
- Taper rate (income): 50 cents per dollar

### Files Modified

- `/src/js/utils.js` - Added new functions (lines 658-887)

### Status

✅ Core calculation logic: COMPLETE
✅ Strategy generation: COMPLETE
✅ Build verification: COMPLETE
⏳ Simulator integration: PENDING (documented above)
⏳ UI display: PENDING (documented above)
⏳ Full testing: PENDING

---

## PROMPT 2: Housing Strategy Wizard - COMPLETED

### Implementation Summary

Added comprehensive housing strategy analysis for Australians aged 40-65 facing critical housing decisions: downsizing, reverse mortgages, aged care accommodation, and granny flat arrangements.

### New Module: `HousingOptimizer`

**Location:** `/src/js/housing-optimizer.js`

**Purpose:** Analyze all major housing strategies with concrete financial projections and comparisons.

### Key Features Implemented

1. **Downsizing Scenario Comparator**
   - Calculates net proceeds from selling current home and buying smaller
   - Models 3 allocation options: (1) Max to super, (2) Balanced, (3) All investments
   - Projects 20-year outcomes for each option
   - Shows Age Pension impact (home equity → assessable assets)
   - Recommends best strategy based on outcomes

2. **Reverse Mortgage / HEAS Calculator**
   - Projects equity erosion over 5, 10, 15, 20 years
   - Compares commercial (6.5%) vs government HEAS (4.85%)
   - Shows remaining equity at different ages
   - Compares with downsizing alternative
   - Demonstrates debt doubling time

3. **RAD vs DAP Aged Care Analyzer**
   - Calculates break-even between RAD and DAP
   - Uses current MPIR rate (7.61% Oct 2025)
   - Compares investment returns vs MPIR
   - Shows combination payment options
   - Considers average stay duration (2.5 years)

4. **Granny Flat Arrangement Analysis**
   - Explains concept and typical arrangements
   - Details Age Pension treatment (5-year lookback)
   - Lists benefits, risks, and legal requirements
   - **Strong warnings** about complexity
   - Requires specialist advice

### Configuration Added

**Location:** `/src/js/config.js` (lines 1303-1412)

Added `housingStrategy` configuration section with:
- Downsizing parameters (transaction costs, limits, growth rates)
- Reverse mortgage rates (commercial, HEAS, typical loan amounts)
- Aged care costs (MPIR, RAD amounts by city, average stay)
- Granny flat constants (transfer amounts, lookback period, legal costs)

### Usage Example

```javascript
import { HousingOptimizer } from './housing-optimizer.js';

const personalDetails = {
    age: 65,
    partnered: true
};

const financialData = {
    homeValue: 1200000,
    superBalance: 400000,
    investmentBalance: 100000
};

const optimizer = new HousingOptimizer(personalDetails, financialData);
const strategies = optimizer.generateHousingStrategies();

// Access specific analyses
const downsizing = strategies.downsizing;
// {
//     applicable: true,
//     netProceeds: 335000,
//     options: [ ... ],
//     recommendation: { best: 'Max to Super', reasoning: '...' }
// }

const reverseMortgage = strategies.reverseMortgage;
// {
//     applicable: true,
//     scenarios: [ ... ],
//     warnings: [ ... ],
//     recommendation: '...'
// }

const agedCare = strategies.agedCareAccommodation;
// {
//     applicable: true,
//     analysis: { typicalRAD: 500000, dailyDAP: 104, ... },
//     strategy: { recommendation: 'Pay Full DAP', reasoning: '...' }
// }

const grannyFlat = strategies.grannyFlat;
// {
//     applicable: true,
//     benefits: [ ... ],
//     risks: [ ... ],
//     recommendation: { priority: 'HIGH_CAUTION', ... }
// }
```

### Files Created/Modified

- **Created:** `/src/js/housing-optimizer.js` (476 lines)
- **Modified:** `/src/js/config.js` (added housing strategy configuration)

### Status

✅ Core calculation logic: COMPLETE
✅ All 4 housing strategies: COMPLETE
✅ Configuration constants: COMPLETE
✅ Build verification: COMPLETE
⏳ UI integration: PENDING (ready for developers)
⏳ Integration with decision-support-engine.js: PENDING

---

## PROMPT 3: Overseas Retirement Module - COMPLETED

### Implementation Summary

Added comprehensive overseas retirement analysis for 4 popular destinations: India, Portugal, Thailand, and Bali. Includes Age Pension portability calculations, tax implications, cost of living comparisons, and country-specific requirements.

### New Modules

**Country Profiles:** `/src/js/country-profiles.js` (600+ lines)
**Analyzer:** `/src/js/overseas-retirement.js` (350+ lines)

**Purpose:** Help Australians understand financial and practical implications of retiring overseas.

### Key Features Implemented

1. **Age Pension Portability Calculator**
   - AWLR (Australian Working Life Residence) calculation
   - Proportional pension for insufficient AWLR (<35 years)
   - Social Security Agreement vs No Agreement scenarios
   - Supplement reduction overseas ($865 single, $650 couple)
   - Projects pension amount in Australia vs overseas

2. **Tax Implications Analysis**
   - Australian tax residency considerations
   - Superannuation access and taxation
   - Double Tax Agreements (DTA)
   - Special schemes (Portugal NHR: 0% tax on foreign pension for 10 years)
   - Foreign vs Australian tax resident implications

3. **Cost of Living Comparison**
   - Indexed to Australian ASFA standard
   - Breakdown by category (accommodation, food, transport, utilities)
   - Savings calculation
   - City-specific variations

4. **Country-Specific Requirements**
   - Visa types, costs, and pathways to permanent residence
   - Healthcare system quality and costs
   - Risk assessment (currency, political, healthcare, distance)
   - Popular expat locations with pros/cons

### Country Profiles (4 Countries)

#### 1. **India**
- **Cost:** 35% of Australia (ultra-affordable)
- **Distance:** 6,500km (11-13 hours)
- **No SSA:** Proportional pension after 26 weeks
- **Visa:** OCI (lifelong) or tourist extendable
- **Best for:** Indian heritage, ultra-low cost, cultural enthusiasts

#### 2. **Portugal**
- **Cost:** 65% of Australia
- **Distance:** 17,000km (22-24 hours)
- **✓ SSA:** Full portability indefinitely
- **Visa:** D7 Retirement Visa (easy)
- **Tax:** NHR scheme - 0% on foreign pension for 10 years
- **Best for:** European lifestyle, tax advantages, excellent healthcare

#### 3. **Thailand**
- **Cost:** 45% of Australia
- **Distance:** 5,500km (7-9 hours direct)
- **No SSA:** Proportional pension after 26 weeks
- **Visa:** Non-O Long Stay (age 50+, easy)
- **Best for:** Beach lovers, budget-conscious, warm climate

#### 4. **Bali, Indonesia**
- **Cost:** 40% of Australia
- **Distance:** 2,500km (5-6 hours - closest!)
- **No SSA:** Proportional pension after 26 weeks
- **Visa:** Retirement visa (age 55+, moderate complexity)
- **Best for:** Close to Australia, wellness, beach, large Aussie expat community

### Usage Example

```javascript
import { OverseasRetirementAnalyzer } from './overseas-retirement.js';
import { COUNTRY_PROFILES } from './country-profiles.js';

const personalDetails = {
    age: 65,
    partnered: false,
    australianResidenceYears: 40 // For AWLR calculation
};

const financialData = {
    superBalance: 300000,
    investmentBalance: 100000,
    homeValue: 800000
};

const analyzer = new OverseasRetirementAnalyzer(personalDetails, financialData);
const result = analyzer.analyzeCountry('PORTUGAL');

// Result structure:
// {
//     country: 'Portugal',
//     overview: '...',
//     agePensionPortability: {
//         AWLR: 40,
//         AWLRPercentage: '114.3',
//         fullPortability: true,
//         hasAgreement: true,
//         pensionCalculation: {
//             inAustralia: 30667,
//             overseas: 29802,
//             reduction: 865,
//             reductionPercent: '2.8'
//         }
//     },
//     costOfLiving: {
//         australiaAnnual: 51814,
//         countryAnnual: 33679,
//         savings: 18135,
//         savingsPercent: '35.0'
//     },
//     recommendations: {
//         suitability: 'HIGHLY SUITABLE',
//         financialViability: { viable: true, surplus: ... },
//         keySteps: [ ... ]
//     }
// }

// Compare multiple countries
const comparison = analyzer.compareCountries(['INDIA', 'PORTUGAL', 'THAILAND', 'BALI']);
// {
//     countries: [ ... ],
//     summary: {
//         cheapest: 'India',
//         bestHealthcare: 'Portugal',
//         closestToAustralia: 'Bali, Indonesia',
//         bestPensionPortability: 'Portugal'
//     }
// }
```

### Helper Functions

```javascript
import { getAgreementCountries, getCountriesByCost, getCountriesByDistance } from './country-profiles.js';

// Get countries with Social Security Agreements
const saaCountries = getAgreementCountries();
// [{ code: 'PORTUGAL', name: 'Portugal' }]

// Get countries costing 70% or less of Australia
const affordable = getCountriesByCost(0.70);
// [{ code: 'INDIA', name: 'India', costIndex: 0.35 }, ...]

// Get countries within 10,000km
const nearby = getCountriesByDistance(10000);
// [{ code: 'BALI', name: 'Bali, Indonesia', distance: 2500, flightTime: '5-6 hours' }, ...]
```

### Age Pension Key Facts

**AWLR Calculation:**
- Working life period: Age 16 to 67 (51 years)
- Full portability: 35+ years of AWLR
- Proportional: Less than 35 years
- Example: 30 years AWLR = 30/35 = 85.7% of pension

**Supplement:**
- Lost when living overseas
- Single: $865/year
- Couple: $650/year (combined)

**Social Security Agreements:**
- Full portability indefinitely
- No 2-year former resident rule
- Can apply while overseas
- Currently only Portugal (in this dataset)

### Files Created

- **Created:** `/src/js/country-profiles.js` (600+ lines)
- **Created:** `/src/js/overseas-retirement.js` (350+ lines)

### Status

✅ Core calculation logic: COMPLETE
✅ 4 country profiles: COMPLETE (India, Portugal, Thailand, Bali)
✅ AWLR calculations: COMPLETE
✅ Tax implications: COMPLETE
✅ Build verification: COMPLETE
⏳ UI integration: PENDING (ready for developers)
⏳ Integration with decision-support-engine.js: PENDING

### Expansion Ready

The module is designed for easy expansion:
- Add more countries by extending `COUNTRY_PROFILES` object
- Follow existing pattern for consistency
- Helper functions automatically include new countries

---

## Summary: All 3 Prompts IMPLEMENTED

### Files Created (8 files)
1. `/src/js/housing-optimizer.js` - Housing strategy analysis
2. `/src/js/country-profiles.js` - Country data for overseas retirement
3. `/src/js/overseas-retirement.js` - Overseas retirement analyzer
4. `IMPLEMENTATION_NOTES.md` - This documentation

### Files Modified (2 files)
1. `/src/js/utils.js` - Added `calculateAgePensionForCouple()` and helpers
2. `/src/js/config.js` - Added housing strategy configuration

### Build Status
✅ All modules compile successfully
✅ No build errors
✅ Webpack bundle size: 579 KiB (within acceptable range)

### Next Steps for Full Integration

1. **UI Integration** (for all 3 prompts):
   - Add UI sections to `index.html`
   - Add event handlers to `app.js`
   - Add display functions for results

2. **Decision Support Integration**:
   - Import new modules into `decision-support-engine.js`
   - Add recommendations based on new analyses
   - Trigger automatically when relevant

3. **Simulator Integration** (PROMPT 1 only):
   - Update Age Pension calculation in `simulator.js`
   - Use `calculateAgePensionForCouple()` when partnered
   - Store pension details in yearly data

4. **Testing**:
   - Manual testing of each feature
   - Verify calculations against real scenarios
   - Test edge cases (low AWLR, high age gap, etc.)

### Developer Integration Guide

All modules are **ready to use**. Each exports classes/functions that can be imported and used immediately:

```javascript
// PROMPT 1: Age Pension
import { calculateAgePensionForCouple } from './utils.js';

// PROMPT 2: Housing Strategy
import { HousingOptimizer } from './housing-optimizer.js';

// PROMPT 3: Overseas Retirement
import { OverseasRetirementAnalyzer } from './overseas-retirement.js';
import { COUNTRY_PROFILES } from './country-profiles.js';
```

Detailed usage examples provided in sections above.

---

**Implementation Date:** October 1, 2025
**Build Status:** ✅ SUCCESSFUL
**All 3 Prompts:** ✅ COMPLETE
