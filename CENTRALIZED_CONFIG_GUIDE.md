# Centralized Configuration System

## 🎯 Overview

All hardcoded financial constants, assumptions, and configurable values have been centralized into a single, maintainable system. This enables:

1. ✅ **Single source of truth** for all financial parameters
2. ✅ **Admin interface ready** - easy programmatic updates
3. ✅ **Market research integration** - automated updates from ABS, RBA, etc.
4. ✅ **Audit trail** - track sources and last updated dates
5. ✅ **Future-proof** - easy to add new constants or modify existing ones

## 📁 File Structure

```
src/js/
├── config.js              # Legacy config (still used)
├── enhanced-config.js      # NEW: Centralized financial constants
└── config-helper.js        # NEW: Utility functions for easy access
```

## 🔧 Quick Usage Examples

### Basic Usage
```javascript
import { ENHANCED_FINANCIAL_CONFIG } from './enhanced-config.js';
import { ConfigHelper } from './config-helper.js';

// Direct access
const corporateTax = ENHANCED_FINANCIAL_CONFIG.australianSystem.CORPORATE_TAX_RATE.value;

// Helper method (recommended)
const corporateTax = ConfigHelper.corporateTaxRate;
const riskFreeRate = ConfigHelper.riskFreeRate;
```

### Getting Constants with Helper
```javascript
// Risk assessment thresholds
const successThresholds = ConfigHelper.successRateThresholds;
if (successRate < successThresholds.CRITICAL.value) {
    // Take action
}

// Asset allocation ratios
const bondReturn = baseReturn * ConfigHelper.bondMultiplier;
const cashReturn = baseReturn * ConfigHelper.cashMultiplier;

// Property calculations
const buildingValue = propertyValue * ConfigHelper.buildingValueRatio;
const sellingCosts = salePrice * ConfigHelper.propertySellingCosts;
```

## 📊 Configuration Categories

### 1. Australian Financial System (`australianSystem`)
- Corporate tax rate (30%)
- CGT discount (50%)
- Franking credit adjustments
- Government-mandated rates

### 2. Risk Assessment (`riskAssessment`)
- Success rate thresholds (50%, 70%, 85%, 95%)
- Portfolio-to-income ratios
- Risk-free rate assumptions
- Scoring factors

### 3. Asset Allocation (`assetAllocation`)
- Return expectation multipliers (Equity: 1.2, Bond: 0.6, Cash: 0.3)
- Dynamic allocation ratios
- Minimum allocation limits
- Rate adjustment sensitivity

### 4. Monte Carlo Parameters (`monteCarlo`)
- Correlation factors (Property: 15%, Portfolio: 5%)
- Volatility parameters
- Expense variation ranges
- Random simulation bounds

### 5. Property Investment (`propertyInvestment`)
- Building value ratio (80%)
- Transaction costs (6%)
- Growth limits (20% max)
- Depreciation rates

### 6. Cash Flow Analysis (`cashFlowAnalysis`)
- Living expenses (ABS 2025 data)
- Childcare costs ($135/day)
- Housing stress threshold (30%)
- Savings capacity ratios

### 7. Healthcare & Aged Care (`healthcareAgedCare`)
- Healthcare inflation (6.1% - ABS current)
- Aged care probability (65%)
- Average costs and durations

### 8. Stress Testing (`stressTesting`)
- Market crash scenarios (GFC: -40% equity)
- Healthcare inflation stress (7.5%)
- Longevity risk (age 95)

## 🎛️ Admin Interface Support

### Get All Updatable Constants
```javascript
const updatable = ConfigHelper.getUpdatableConstants();
// Returns array of all constants that can be updated via admin interface

updatable.forEach(constant => {
    console.log({
        category: constant.category,
        key: constant.key,
        currentValue: constant.value,
        description: constant.description,
        source: constant.source,
        lastUpdated: constant.lastUpdated
    });
});
```

### Update a Constant
```javascript
// Update healthcare inflation with new ABS data
const success = ConfigHelper.update(
    'healthcareAgedCare',
    'HEALTHCARE_INFLATION',
    6.3,
    {
        source: 'ABS CPI Health Sector Q2 2025',
        updatedBy: 'admin',
        researchDate: '2025-07-15'
    }
);

if (success) {
    console.log('Healthcare inflation updated to 6.3%');
}
```

### Get Constants Needing Updates
```javascript
const needsReview = ConfigHelper.getConstantsNeedingUpdate();
needsReview.forEach(constant => {
    console.log(`${constant.category}.${constant.key} is ${constant.daysOverdue} days overdue for review`);
});
```

## 🔄 Market Research Integration

### Example: Automated ABS Data Updates
```javascript
// Future implementation example
async function updateFromABS() {
    try {
        // Fetch latest CPI data from ABS API
        const healthData = await fetch('https://api.abs.gov.au/cpi/health');
        const newHealthcareInflation = healthData.healthSectorInflation;

        // Update config
        ConfigHelper.update(
            'healthcareAgedCare',
            'HEALTHCARE_INFLATION',
            newHealthcareInflation,
            {
                source: 'ABS API Auto-update',
                lastUpdated: new Date().toISOString()
            }
        );

        console.log(`Healthcare inflation auto-updated to ${newHealthcareInflation}%`);
    } catch (error) {
        console.error('Failed to update from ABS:', error);
    }
}
```

## ✅ Migration Benefits

### Before (Problems)
```javascript
// Scattered across multiple files
const corporateTaxRate = 0.30;  // simulator.js
const CORPORATE_TAX = 0.30;     // utils.js
const TAX_RATE = 30;            // app.js (as percentage)

// Inconsistent healthcare inflation
const healthcareInflation = 6.5;   // config.js
const healthcare = 3.82;           // index.html
const HEALTHCARE_RATE = 4.5;       // python/config.py
```

### After (Solution)
```javascript
// Single source of truth
const corporateTaxRate = ConfigHelper.corporateTaxRate; // Always 30%
const healthcareInflation = ConfigHelper.healthcareInflation; // Always current ABS data
```

## 🧪 Testing & Validation

### Test Configuration Access
```javascript
// Test that all critical constants are accessible
function testConfigAccess() {
    const tests = [
        { name: 'Corporate Tax Rate', value: ConfigHelper.corporateTaxRate, expected: 0.30 },
        { name: 'CGT Discount', value: ConfigHelper.cgtDiscount, expected: 0.50 },
        { name: 'Bond Multiplier', value: ConfigHelper.bondMultiplier, expected: 0.60 },
        { name: 'Risk Free Rate', value: ConfigHelper.riskFreeRate, expected: 0.03 }
    ];

    tests.forEach(test => {
        if (test.value === test.expected) {
            console.log(`✅ ${test.name}: ${test.value}`);
        } else {
            console.error(`❌ ${test.name}: Expected ${test.expected}, got ${test.value}`);
        }
    });
}
```

## 🔮 Future Enhancements

1. **Admin Dashboard** - Web interface to manage all constants
2. **API Integration** - Auto-updates from RBA, ABS, APRA
3. **A/B Testing** - Compare scenarios with different constant values
4. **Audit Logging** - Track all constant changes
5. **Validation Rules** - Ensure constants stay within reasonable bounds
6. **Export/Import** - Backup and restore configuration sets

## 📝 Developer Guidelines

### Adding New Constants
1. Add to appropriate category in `enhanced-config.js`
2. Include metadata (description, source, canBeUpdated)
3. Add convenience method to `ConfigHelper` if frequently used
4. Update documentation

### Updating Existing Constants
- Always use `ConfigHelper.update()` to maintain audit trail
- Include source and reason for change
- Test impact across the application

### Research Updates
- Check `ConfigHelper.getConstantsNeedingUpdate()` regularly
- Update constants based on latest ABS, RBA, government data
- Document sources and research dates

This centralized system transforms the retirement calculator from a maintenance nightmare into a professionally manageable financial application! 🎉