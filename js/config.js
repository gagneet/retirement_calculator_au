/**
 * Enhanced Australian Retirement Calculator - Configuration Module
 * Contains all Australian-specific constants, tax brackets, pension rules, and validation settings
 */

// Australian Tax System Constants (2024-25)
export const TAX_CONFIG = {
    // Income tax brackets
    TAX_BRACKETS: [
        { min: 0, max: 18200, rate: 0 },
        { min: 18200, max: 45000, rate: 0.19 },
        { min: 45000, max: 120000, rate: 0.325 },
        { min: 120000, max: 180000, rate: 0.37 },
        { min: 180000, max: Infinity, rate: 0.45 }
    ],
    
    // Medicare and other levies
    MEDICARE_LEVY: 0.02,
    MEDICARE_SURCHARGE_THRESHOLD: {
        single: 97000,
        couple: 194000
    },
    
    // Super and investment taxation
    SUPER_TAX_RATE: 0.15,
    SUPER_TAX_FREE_AGE: 60,
    CGT_DISCOUNT: 0.5,
    CGT_DISCOUNT_HOLDING_PERIOD: 12 // months
};

// Australian Pension System (2024-25)
export const PENSION_CONFIG = {
    // Maximum pension rates (per fortnight)
    MAX_PENSION_SINGLE: 1096.70,
    MAX_PENSION_COUPLE: 1653.60,
    
    // Asset test thresholds
    ASSET_THRESHOLD_SINGLE_HOMEOWNER: 321500,
    ASSET_THRESHOLD_COUPLE_HOMEOWNER: 481500,
    ASSET_THRESHOLD_SINGLE_NON_HOMEOWNER: 556500,
    ASSET_THRESHOLD_COUPLE_NON_HOMEOWNER: 716500,
    
    // Asset test limits (pension cuts out)
    ASSET_LIMIT_SINGLE_HOMEOWNER: 686500,
    ASSET_LIMIT_COUPLE_HOMEOWNER: 1031000,
    ASSET_LIMIT_SINGLE_NON_HOMEOWNER: 921500,
    ASSET_LIMIT_COUPLE_NON_HOMEOWNER: 1171000,
    
    // Income test thresholds (per fortnight)
    INCOME_THRESHOLD_SINGLE: 212,
    INCOME_THRESHOLD_COUPLE: 372,
    
    // Deeming thresholds and rates
    DEEMING_THRESHOLD_SINGLE: 60400,
    DEEMING_THRESHOLD_COUPLE: 100200,
    DEEMING_RATE_LOWER: 0.0025,
    DEEMING_RATE_UPPER: 0.0225,
    
    // Reduction rates
    ASSET_REDUCTION_RATE: 3.00, // per $1000 over threshold per fortnight
    INCOME_REDUCTION_RATE: 0.50 // 50 cents per dollar over threshold
};

// Superannuation System
export const SUPER_CONFIG = {
    GUARANTEE_RATE: 0.12, // 12% from July 2025
    CONCESSIONAL_CAP: 30000,
    NON_CONCESSIONAL_CAP: 120000,
    PRESERVATION_AGE: 60,
    ACCESS_AGE: 65,
    
    // Contribution caps and limits
    CARRY_FORWARD_YEARS: 5,
    TOTAL_SUPER_BALANCE_LIMIT: 1900000,
    
    // Default allocation by age (conservative approach)
    DEFAULT_ALLOCATIONS: {
        20: { equity: 90, bonds: 8, cash: 2 },
        30: { equity: 85, bonds: 12, cash: 3 },
        40: { equity: 80, bonds: 15, cash: 5 },
        50: { equity: 70, bonds: 20, cash: 10 },
        60: { equity: 60, bonds: 25, cash: 15 },
        65: { equity: 50, bonds: 30, cash: 20 },
        70: { equity: 40, bonds: 35, cash: 25 }
    }
};

// Healthcare and Aged Care (Enhanced)
export const HEALTHCARE_CONFIG = {
    // Healthcare inflation rates (historically higher than general inflation)
    HEALTHCARE_INFLATION_RATE: 0.065, // 6.5% annually
    HOSPITAL_INFLATION_RATE: 0.075,   // 7.5% annually
    
    // Aged care probability by age (Australian data)
    AGED_CARE_PROBABILITY: {
        65: 0.15,  // 15% chance by age 65
        70: 0.25,  // 25% chance by age 70
        75: 0.40,  // 40% chance by age 75
        80: 0.55,  // 55% chance by age 80
        85: 0.70,  // 70% chance by age 85
        90: 0.85   // 85% chance by age 90+
    },
    
    // Aged care cost estimates (2024)
    AGED_CARE_COSTS: {
        LOW_CARE: 350000,      // Home care packages
        MEDIUM_CARE: 450000,   // Residential aged care
        HIGH_CARE: 650000      // High care/dementia
    },
    
    // Medicare and private health
    MEDICARE_SAFETY_NET: 770.30,
    EXTENDED_SAFETY_NET: 2538.40,
    PRIVATE_HEALTH_LIFETIME_LOADING: 0.02, // 2% per year after 31
    
    // Average health expenses by age (annual)
    HEALTH_EXPENSES_BY_AGE: {
        50: 3500,
        55: 4200,
        60: 5000,
        65: 6500,
        70: 8500,
        75: 11000,
        80: 14500,
        85: 19000,
        90: 25000
    }
};

// Economic Assumptions and Market Data
export const ECONOMIC_CONFIG = {
    // Historical Australian market returns (1900-2024)
    HISTORICAL_RETURNS: {
        ASX_EQUITY: 0.095,      // 9.5% nominal historical average
        ASX_EQUITY_REAL: 0.065, // 6.5% real return
        BONDS: 0.055,           // 5.5% nominal
        BONDS_REAL: 0.025,      // 2.5% real
        CASH: 0.035,            // 3.5% nominal
        CASH_REAL: 0.005,       // 0.5% real
        PROPERTY: 0.085,        // 8.5% nominal (including rental yield)
        PROPERTY_REAL: 0.055    // 5.5% real
    },
    
    // Volatility (standard deviation)
    VOLATILITY: {
        ASX_EQUITY: 0.18,       // 18% annual volatility
        INTERNATIONAL_EQUITY: 0.16, // 16% annual volatility
        BONDS: 0.06,            // 6% annual volatility
        CASH: 0.02,             // 2% annual volatility
        PROPERTY: 0.12,         // 12% annual volatility
        BALANCED: 0.12          // 12% for balanced portfolio
    },
    
    // Franking credit benefits (unique to Australia)
    FRANKING_CREDIT_BENEFIT: 0.015, // 1.5% additional return for eligible investors
    
    // Market shock parameters
    MARKET_SHOCKS: {
        RECESSION_PROBABILITY: 0.08,    // 8% annual probability
        RECESSION_MAGNITUDE: -0.35,     // -35% market drop
        RECOVERY_YEARS: 2.5,           // 2.5 years average recovery
        
        BEAR_MARKET_PROBABILITY: 0.15, // 15% annual probability
        BEAR_MARKET_MAGNITUDE: -0.20,  // -20% market drop
        BEAR_RECOVERY_YEARS: 1.5       // 1.5 years average recovery
    },
    
    // Sequence of returns risk factors
    SEQUENCE_RISK_FACTORS: {
        EARLY_RETIREMENT_MULTIPLIER: 2.5, // Higher impact in early retirement
        WITHDRAWAL_PHASE_AMPLIFIER: 1.8   // Amplified during withdrawal phase
    }
};

// Asset Allocation Presets (Enhanced)
export const ALLOCATION_PRESETS = {
    conservative: { 
        equity: 30, 
        bonds: 50, 
        cash: 20,
        expectedReturn: 0.045,
        volatility: 0.08
    },
    balanced: { 
        equity: 60, 
        bonds: 30, 
        cash: 10,
        expectedReturn: 0.065,
        volatility: 0.12
    },
    growth: { 
        equity: 80, 
        bonds: 15, 
        cash: 5,
        expectedReturn: 0.085,
        volatility: 0.15
    },
    aggressive: { 
        equity: 90, 
        bonds: 8, 
        cash: 2,
        expectedReturn: 0.095,
        volatility: 0.18
    }
};

// Risk Tolerance Profiles
export const RISK_PROFILES = {
    conservative: {
        name: "Conservative",
        description: "Protect capital, steady income",
        riskScore: 2,
        timeHorizon: "Short-term (0-5 years)",
        maxEquity: 40,
        recommendedAllocation: "conservative"
    },
    moderate: {
        name: "Moderate", 
        description: "Balanced growth and income",
        riskScore: 4,
        timeHorizon: "Medium-term (5-10 years)",
        maxEquity: 70,
        recommendedAllocation: "balanced"
    },
    growth: {
        name: "Growth",
        description: "Long-term wealth building",
        riskScore: 6,
        timeHorizon: "Long-term (10+ years)",
        maxEquity: 85,
        recommendedAllocation: "growth"
    },
    aggressive: {
        name: "Aggressive",
        description: "Maximum growth potential",
        riskScore: 8,
        timeHorizon: "Very long-term (15+ years)",
        maxEquity: 95,
        recommendedAllocation: "aggressive"
    }
};

// Validation Rules
export const VALIDATION_RULES = {
    AGE: {
        MIN: 18,
        MAX: 100,
        RETIREMENT_MIN: 55,
        RETIREMENT_MAX: 75
    },
    SALARY: {
        MIN: 0,
        MAX: 5000000,
        REASONABLE_MAX: 500000
    },
    SUPER: {
        MIN: 0,
        MAX: 10000000,
        REASONABLE_MAX: 5000000
    },
    ALLOCATION: {
        MIN: 0,
        MAX: 100,
        TOTAL_MUST_EQUAL: 100,
        TOLERANCE: 1 // Allow 1% tolerance for rounding
    },
    RETURNS: {
        MIN: -0.50, // -50% (extreme bear market)
        MAX: 0.50,  // +50% (extreme bull market)
        REASONABLE_MIN: -0.20,
        REASONABLE_MAX: 0.20
    }
};

// ASFA Retirement Standards (2024)
export const ASFA_STANDARDS = {
    COMFORTABLE_COUPLE: 73875,
    COMFORTABLE_SINGLE: 52085,
    MODEST_COUPLE: 45808,
    MODEST_SINGLE: 32417,
    
    // Annual growth rate for standards
    GROWTH_RATE: 0.025 // 2.5% annually
};

// Property Investment Constants
export const PROPERTY_CONFIG = {
    // Transaction costs
    STAMP_DUTY_RATE: 0.045,      // 4.5% average across Australia
    LEGAL_COSTS: 2500,
    INSPECTION_COSTS: 800,
    SELLING_COSTS: 0.03,         // 3% (agent fees, legal, etc.)
    
    // Ongoing costs
    COUNCIL_RATES: 0.008,        // 0.8% of property value annually
    INSURANCE_RATE: 0.003,       // 0.3% of property value annually
    MAINTENANCE_RATE: 0.015,     // 1.5% of property value annually
    VACANCY_RATE: 0.04,          // 4% vacancy rate
    PROPERTY_MANAGEMENT: 0.07,   // 7% of rental income
    
    // Tax benefits
    DEPRECIATION_RATE: 0.025,    // 2.5% depreciation annually
    NEGATIVE_GEARING_BENEFIT: 0.35, // Tax rate for high earners
    
    // Growth assumptions
    CAPITAL_GROWTH_RATE: 0.06,   // 6% annually (historical average)
    RENTAL_GROWTH_RATE: 0.035    // 3.5% annually
};

// Monte Carlo Simulation Settings
export const SIMULATION_CONFIG = {
    DEFAULT_RUNS: 5000,
    MIN_RUNS: 1000,
    MAX_RUNS: 10000,
    
    // Confidence intervals for reporting
    CONFIDENCE_INTERVALS: [0.05, 0.10, 0.25, 0.50, 0.75, 0.90, 0.95],
    
    // Correlation matrix for asset classes
    CORRELATIONS: {
        // [Equity, Bonds, Cash, Property]
        EQUITY: [1.0, -0.2, 0.1, 0.6],
        BONDS: [-0.2, 1.0, 0.3, 0.1],
        CASH: [0.1, 0.3, 1.0, 0.0],
        PROPERTY: [0.6, 0.1, 0.0, 1.0]
    },
    
    // Random number generation seeds for reproducibility
    RANDOM_SEEDS: true,
    
    // Progress reporting intervals
    PROGRESS_UPDATE_INTERVAL: 100 // Update progress every 100 runs
};

// Default Input Values
export const DEFAULT_VALUES = {
    // Personal details
    yourCurrentAge: 49,
    partnerCurrentAge: 47,
    retirementAge: 67,
    partnerRetirementAge: 62,
    yourLifespan: 95,
    partnerLifespan: 99,
    
    // Financial details
    yourSalary: 214000,
    partnerSalary: 34500,
    currentSuper: 312000,
    currentSavings: 55000,
    currentStocks: 62000,
    monthlyStockContribution: 800,
    percentIncomeSaved: 9,
    
    // Property
    homeValue: 810000,
    mortgageBalance: 594000,
    mortgageRate: 5.37,
    planToDownsize: false,
    
    // Healthcare (new)
    currentHealthExpenses: 5000,
    healthInflationRate: 6.5,
    agedCareProbability: 65,
    agedCareCost: 450000,
    privateHealthInsurance: true,
    
    // Investment allocation
    allocEquities: 80,
    allocBonds: 15,
    allocCash: 5,
    frankingCredits: true,
    dynamicAllocation: true,
    
    // Economic assumptions
    inflation: 2.87,
    investmentReturn: 7.2,
    superReturn: 8.75,
    returnVolatility: 15,
    
    // Pension system
    asfaComfortable: ASFA_STANDARDS.COMFORTABLE_COUPLE,
    agePensionMax: 45037,
    pensionAssetThreshold: PENSION_CONFIG.ASSET_THRESHOLD_COUPLE_HOMEOWNER,
    pensionAssetLimit: PENSION_CONFIG.ASSET_LIMIT_COUPLE_HOMEOWNER,
    
    // Simulation settings
    numRuns: 5000,
    enableSequenceRisk: true,
    enableMarketShocks: false,
    shockProbability: 8,
    shockMagnitude: -35
};

// Export all configurations as a single object for easy importing
export const CONFIG = {
    TAX: TAX_CONFIG,
    PENSION: PENSION_CONFIG,
    SUPER: SUPER_CONFIG,
    HEALTHCARE: HEALTHCARE_CONFIG,
    ECONOMIC: ECONOMIC_CONFIG,
    ALLOCATIONS: ALLOCATION_PRESETS,
    RISK_PROFILES: RISK_PROFILES,
    VALIDATION: VALIDATION_RULES,
    ASFA: ASFA_STANDARDS,
    PROPERTY: PROPERTY_CONFIG,
    SIMULATION: SIMULATION_CONFIG,
    DEFAULTS: DEFAULT_VALUES
};