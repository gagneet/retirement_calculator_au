// config-v0.9.0.js - Historical Configuration for Australian Retirement Calculator (Early 2023)

export const ENHANCED_CONFIG_V0_9_0 = {
    version: '0.9.0',
    lastUpdated: '2023-01-01',

    // Core Australian system constants for 2022-2023
    SUPER_GUARANTEE_RATE: 0.105,
    DEMING_THRESHOLD: 90000, // Approximate value for early 2023
    SINGLE_PENSION_MAX: 26700,
    SINGLE_ASSET_THRESHOLD: 280000,
    SINGLE_ASSET_LIMIT: 634500,
    SINGLE_INCOME_THRESHOLD: 190,
    HOME_EQUITY_ACCESS_RATE: 0.6,
    CGT_DISCOUNT: 0.5,
    FRANKING_CREDIT_RATE: 0.3,

    sources: {
        SUPER_GUARANTEE_RATE: { source: 'ATO', lastUpdated: '2022-07-01' },
        DEMING_THRESHOLD: { source: 'Services Australia', lastUpdated: '2022-07-01' },
        SINGLE_PENSION_MAX: { source: 'Services Australia', lastUpdated: '2022-09-20' },
        SINGLE_ASSET_THRESHOLD: { source: 'Services Australia', lastUpdated: '2022-07-01' },
        SINGLE_ASSET_LIMIT: { source: 'Services Australia', lastUpdated: '2022-07-01' },
        SINGLE_INCOME_THRESHOLD: { source: 'Services Australia', lastUpdated: '2022-09-20' },
        HOME_EQUITY_ACCESS_RATE: { source: 'Services Australia', lastUpdated: '2022-07-01' },
        CGT_DISCOUNT: { source: 'ATO', lastUpdated: '2022-07-01' },
        FRANKING_CREDIT_RATE: { source: 'ATO', lastUpdated: '2022-07-01' },
        inflation: { source: 'ABS', lastUpdated: '2023-01-25' },
        investmentReturn: { source: 'Internal Analysis', lastUpdated: '2023-01-01' },
        salaryGrowthRate: { source: 'ABS', lastUpdated: '2022-11-16' },
        superReturn: { source: 'Internal Analysis', lastUpdated: '2023-01-01' }
    },

    // Australian tax brackets for 2022-23
    TAX_BRACKETS: [
        { min: 0, max: 18200, rate: 0 },
        { min: 18201, max: 45000, rate: 0.19 },
        { min: 45001, max: 120000, rate: 0.325 },
        { min: 120001, max: 180000, rate: 0.37 },
        { min: 180001, max: Infinity, rate: 0.45 }
    ],

    // Default economic assumptions for early 2023
    DEFAULTS: {
        economic: {
            inflation: 0.078,  // 7.8% as decimal (ABS Q4 2022)
            investmentReturn: 0.065,  // 6.5% as decimal
            returnDeclineRate: 0.03,
            savingsReturn: 0.03,  // 3.0% as decimal
            superReturn: 0.075,  // 7.5% as decimal
            salaryGrowthRate: 0.03,  // 3.0% as decimal
        },
        // Other defaults can be inherited or set to historical values if needed
    },

    // Other configuration sections can be copied from the main config and adjusted if necessary
    // For this example, we are only changing the core constants and economic assumptions.
};

export default ENHANCED_CONFIG_V0_9_0;