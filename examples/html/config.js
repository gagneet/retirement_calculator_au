// config.js - Enhanced Australian Retirement Calculator Configuration
// All Australian-specific constants, rules, and default values

export const ENHANCED_CONFIG = {
    // Core Australian system constants
    SUPER_GUARANTEE_RATE: 0.12,
    DEMING_THRESHOLD: 106200,
    SINGLE_PENSION_MAX: 28000,
    SINGLE_ASSET_THRESHOLD: 301750,
    SINGLE_ASSET_LIMIT: 686500,
    SINGLE_INCOME_THRESHOLD: 212,
    HOME_EQUITY_ACCESS_RATE: 0.7,
    CGT_DISCOUNT: 0.5,
    FRANKING_CREDIT_RATE: 0.3,  // 30% company tax rate
    
    // Enhanced healthcare and aged care costs (2024 values)
    HEALTHCARE_COSTS: {
        home_package4: 56000,     // Home Care Package Level 4
        residential: 75000,       // Standard residential aged care
        premium: 120000,          // Premium residential care
        current_average: 3500     // Current average annual healthcare
    },
    
    // Investment property constants
    PROPERTY_COSTS: {
        SELLING_COSTS_PERCENT: 0.06,    // 6% total selling costs (agent, legal, etc)
        STAMP_DUTY_THRESHOLD: 600000,   // NSW threshold example
        DEPRECIATION_RATE: 0.025,       // 2.5% building depreciation
        MAINTENANCE_PERCENT: 0.01,      // 1% of value annually
        VACANCY_RATE: 0.04              // 4% vacancy allowance
    },
    
    // Risk profiling thresholds
    RISK_THRESHOLDS: {
        capacity: {
            low: 30,
            moderate: 60,
            high: 80
        },
        tolerance: {
            conservative: 30,
            balanced: 60,
            aggressive: 80
        }
    },
    
    // Asset allocation glide path rules
    GLIDE_PATH_RULES: {
        '120minus': age => Math.max(20, Math.min(90, 120 - age)),
        '110minus': age => Math.max(20, Math.min(80, 110 - age)),
        '100minus': age => Math.max(20, Math.min(70, 100 - age)),
        custom: (age, targetAtRetirement, retirementAge) => {
            if (age >= retirementAge) return targetAtRetirement;
            const yearsToRetirement = retirementAge - age;
            const startEquity = Math.min(90, targetAtRetirement + yearsToRetirement * 2);
            return Math.max(targetAtRetirement, startEquity - (age - 25) * 1.5);
        }
    },
    
    // Australian tax brackets (2024-25)
    TAX_BRACKETS: [
        { min: 0, max: 18200, rate: 0 },
        { min: 18200, max: 45000, rate: 0.19 },
        { min: 45000, max: 120000, rate: 0.325 },
        { min: 120000, max: 180000, rate: 0.37 },
        { min: 180000, max: Infinity, rate: 0.45 }
    ],
    
    // Healthcare inflation rates by condition
    HEALTHCARE_INFLATION: {
        none: 6.0,        // Base healthcare inflation
        minor: 6.5,       // Minor chronic conditions
        moderate: 7.0,    // Moderate health issues
        major: 8.0        // Major health conditions
    },
    
    // Stress test scenarios
    STRESS_SCENARIOS: [
        {
            name: 'Market Crash (GFC-style)',
            equityReturn: -0.4,
            bondReturn: 0.1,
            propertyReturn: -0.15,
            duration: 2,
            probability: 0.1
        },
        {
            name: 'Property Market// config.js - Enhanced Australian Retirement Calculator Configuration
// All Australian-specific constants, rules, and default values

export const ENHANCED_CONFIG = {
    // Core Australian system constants
    SUPER_GUARANTEE_RATE: 0.12,
    DEMING_THRESHOLD: 106200,
    SINGLE_PENSION_MAX: 28000,
    SINGLE_ASSET_THRESHOLD: 301750,
    SINGLE_ASSET_LIMIT: 686500,
    SINGLE_INCOME_THRESHOLD: 212,
    HOME_EQUITY_ACCESS_RATE: 0.7,
    CGT_DISCOUNT: 0.5,
    FRANKING_CREDIT_RATE: 0.3,  // 30% company tax rate
    
    // Enhanced healthcare and aged care costs (2024 values)
    HEALTHCARE_COSTS: {
        home_package4: 56000,     // Home Care Package Level 4
        residential: 75000,       // Standard residential aged care
        premium: 120000,          // Premium residential care
        current_average: 3500     // Current average annual healthcare
    },
    
    // Risk profiling thresholds
    RISK_THRESHOLDS: {
        capacity: {
            low: 30,
            moderate: 60,
            high: 80
        },
        tolerance: {
            conservative: 30,
            balanced: 60,
            aggressive: 80
        }
    },
    
    // Asset allocation glide path rules
    GLIDE_PATH_RULES: {
        '120minus': age => Math.max(20, Math.min(90, 120 - age)),
        '110minus': age => Math.max(20, Math.min(80, 110 - age)),
        '100minus': age => Math.max(20, Math.min(70, 100 - age)),
        custom: (age, targetAtRetirement, retirementAge) => {
            if (age >= retirementAge) return targetAtRetirement;
            const yearsToRetirement = retirementAge - age;
            const startEquity = Math.min(90, targetAtRetirement + yearsToRetirement * 2);
            return Math.max(targetAtRetirement, startEquity - (age - 25) * 1.5);
        }
    },
    
    // Australian tax brackets (2024-25)
    TAX_BRACKETS: [
        { min: 0, max: 18200, rate: 0 },
        { min: 18200, max: 45000, rate: 0.19 },
        { min: 45000, max: 120000, rate: 0.325 },
        { min: 120000, max: 180000, rate: 0.37 },
        { min: 180000, max: Infinity, rate: 0.45 }
    ],
    
    // Healthcare inflation rates by condition
    HEALTHCARE_INFLATION: {
        none: 6.0,        // Base healthcare inflation
        minor: 6.5,       // Minor chronic conditions
        moderate: 7.0,    // Moderate health issues
        major: 8.0        // Major health conditions
    },
    
    // Stress test scenarios
    STRESS_SCENARIOS: [
        {
            name: 'Market Crash (GFC-style)',
            equityReturn: -0.4,
            bondReturn: 0.1,
            duration: 2,
            probability: 0.1
        },
        {
            name: 'Stagflation Period',
            equityReturn: -0.1,
            bondReturn: -0.05,
            inflation: 0.08,
            duration: 3,
            probability: 0.05
        },
        {
            name: 'Interest Rate Shock',
            equityReturn: -0.15,
            bondReturn: -0.2,
            cashReturn: 0.08,
            duration: 1,
            probability: 0.15
        },
        {
            name: 'Healthcare Crisis',
            healthcareCostMultiplier: 2.5,
            duration: 5,
            probability: 0.2
        },
        {
            name: 'Extended Bear Market',
            equityReturn: -0.05,
            bondReturn: 0.02,
            duration: 7,
            probability: 0.08
        }
    ],
    
    // Default values for new users
    DEFAULTS: {
        personal: {
            yourCurrentAge: 45,
            partnerCurrentAge: 43,
            retirementAge: 65,
            partnerRetirementAge: 65,
            yourLifespan: 90,
            partnerLifespan: 92
        },
        financial: {
            yourSalary: 85000,
            partnerSalary: 65000,
            currentSuper: 150000,
            currentSavings: 25000,
            currentStocks: 15000,
            monthlyStockContribution: 500,
            percentIncomeSaved: 0.10
        },
        healthcare: {
            currentHealthcareCosts: 3500,
            healthcareInflation: 6.5,
            hasPrivateHealth: 'comprehensive',
            chronicConditions: 'none',
            agedCareProbability: 65,
            agedCareStartAge: 85,
            agedCareDuration: 3.5,
            agedCareType: 'residential'
        },
        economic: {
            inflation: 0.0287,
            investmentReturn: 0.0561,
            returnDeclineRate: 0.03,
            savingsReturn: 0.014,
            superReturn: 0.0875,
            salaryGrowthRate: 1.5
        },
        allocation: {
            useGlidePath: true,
            glidePathRule: '110minus',
            frankingCreditBenefit: 1.2,
            australianEquityAllocation: 40
        },
        risk: {
            riskTolerance: 6,
            hasEmergencyFund: 'partial',
            hasDebt: 'minimal',
            dependents: 0
        },
        simulation: {
            numRuns: 5000,
            returnVolatility: 0.12,
            enableShocks: false,
            shockProbability: 0.05,
            shockMagnitude: -0.25
        }
    },
    
    // Validation rules
    VALIDATION: {
        age: { min: 18, max: 100 },
        salary: { min: 0, max: 1000000 },
        percentage: { min: 0, max: 100 },
        currency: { min: 0, max: 10000000 },
        years: { min: 0.5, max: 50 },
        runs: { min: 1000, max: 10000 }
    },
    
    // Asset allocation presets
    ALLOCATION_PRESETS: {
        conservative: { equity: 30, bonds: 50, cash: 20 },
        balanced: { equity: 60, bonds: 30, cash: 10 },
        growth: { equity: 80, bonds: 15, cash: 5 },
        aggressive: { equity: 90, bonds: 8, cash: 2 }
    },
    
    // Behavioral nudge settings
    BEHAVIORAL_NUDGES: {
        autoRebalanceThreshold: 0.05,  // 5% drift triggers rebalance
        contributionEscalationCap: 0.03, // Max 3% annual increase
        defaultParticipation: true,
        lossFramingThreshold: 0.1  // 10% shortfall triggers loss framing
    }
};

// Export for use in other modules
export default ENHANCED_CONFIG;