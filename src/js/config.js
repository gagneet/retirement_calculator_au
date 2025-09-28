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
    FRANKING_CREDIT_RATE: 0.3,
    BUSINESS_CGT_EXEMPTION_CAP: 1705000,
    WORK_BONUS_MAX: 11800,
    DOWNSIZER_CONTRIBUTION_SINGLE: 300000,
    DOWNSIZER_CONTRIBUTION_COUPLE: 600000,
    UNUSED_CAP_THRESHOLD: 10000,

    // Enhanced healthcare and aged care costs (2024 values)
    HEALTHCARE_COSTS: {
        home_package4: 56000,
        residential: 76000,
        premium: 120000,
        current_average: 5200
    },
    
    // Investment property constants
    PROPERTY_COSTS: {
        SELLING_COSTS_PERCENT: 0.06,
        STAMP_DUTY_THRESHOLD: 600000,
        DEPRECIATION_RATE: 0.025,
        MAINTENANCE_PERCENT: 0.01,
        VACANCY_RATE: 0.04
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
        "120minus": age => Math.max(20, Math.min(90, 120 - age)),
        "110minus": age => Math.max(20, Math.min(80, 110 - age)),
        "100minus": age => Math.max(20, Math.min(70, 100 - age))
    },
    
    // Australian tax brackets (2025-26)
    TAX_BRACKETS: [
        { min: 0, max: 18200, rate: 0 },
        { min: 18201, max: 45000, rate: 0.16 },
        { min: 45001, max: 135000, rate: 0.3 },
        { min: 135001, max: 190000, rate: 0.37 },
        { min: 190001, max: Infinity, rate: 0.45 }
    ],
    
    // Healthcare inflation rates by condition
    HEALTHCARE_INFLATION: {
        none: 4.5,
        minor: 4.75,
        moderate: 6.0,
        major: 9.0
    },
    
    // Historical Australian market patterns and volatility modeling
    MARKET_REGIMES: {
        // Interest rate environments based on historical RBA patterns
        interestRateRegimes: [
            { name: "COVID Ultra-Low", cashRate: 0.001, duration: 2, probability: 0.05, period: "2020-2022" },
            { name: "Low Rate", cashRate: 0.02, duration: 3, probability: 0.15, period: "2008-2020" },
            { name: "Normal", cashRate: 0.045, duration: 5, probability: 0.50, period: "2000-2007" },
            { name: "High Rate", cashRate: 0.065, duration: 3, probability: 0.25, period: "1980-2000" },
            { name: "Crisis High", cashRate: 0.085, duration: 2, probability: 0.05, period: "1990s recession" }
        ],

        // Property cycles based on Australian historical patterns (7-year cycles)
        propertyCycles: [
            { phase: "Boom", yearsInCycle: [1, 2], baseReturn: 0.12, volatility: 0.08, probability: 0.20 },
            { phase: "Peak", yearsInCycle: [3], baseReturn: 0.08, volatility: 0.12, probability: 0.10 },
            { phase: "Decline", yearsInCycle: [4, 5], baseReturn: -0.05, volatility: 0.15, probability: 0.25 },
            { phase: "Trough", yearsInCycle: [6], baseReturn: -0.02, volatility: 0.10, probability: 0.15 },
            { phase: "Recovery", yearsInCycle: [7, 1], baseReturn: 0.06, volatility: 0.08, probability: 0.30 }
        ],

        // ASX market volatility patterns
        equityMarketRegimes: [
            { name: "Bull Market", baseReturn: 0.10, volatility: 0.12, duration: 5, probability: 0.35 },
            { name: "Normal Market", baseReturn: 0.07, volatility: 0.15, duration: 3, probability: 0.40 },
            { name: "Volatile Market", baseReturn: 0.05, volatility: 0.25, duration: 2, probability: 0.15 },
            { name: "Bear Market", baseReturn: -0.15, volatility: 0.35, duration: 1, probability: 0.10 }
        ]
    },

    // Enhanced stress test scenarios based on Australian historical events
    STRESS_SCENARIOS: [
        {
            name: "COVID-19 Style Crash & Recovery",
            year1: { equityReturn: -0.35, bondReturn: 0.08, propertyReturn: 0.15, cashRate: 0.001 },
            year2: { equityReturn: 0.25, bondReturn: 0.02, propertyReturn: 0.20, cashRate: 0.001 },
            duration: 2,
            probability: 0.05,
            description: "35% equity fall followed by rapid recovery, property boom, ultra-low rates"
        },
        {
            name: "Global Financial Crisis",
            year1: { equityReturn: -0.40, bondReturn: 0.10, propertyReturn: -0.05, cashRate: 0.02 },
            year2: { equityReturn: -0.20, bondReturn: 0.08, propertyReturn: -0.10, cashRate: 0.015 },
            duration: 2,
            probability: 0.08,
            description: "Severe market crash with modest property decline"
        },
        {
            name: "Property Market Correction",
            equityReturn: -0.05,
            bondReturn: 0.02,
            propertyReturn: -0.15,
            duration: 3,
            probability: 0.15,
            description: "Major property price correction as seen 2022-2024"
        },
        {
            name: "Mining Boom End",
            equityReturn: -0.10,
            bondReturn: 0.03,
            propertyReturn: -0.25,
            duration: 4,
            probability: 0.10,
            description: "End of commodity cycle affecting property and equities"
        },
        {
            name: "Interest Rate Shock",
            equityReturn: -0.15,
            bondReturn: -0.20,
            propertyReturn: -0.10,
            cashReturn: 0.085,
            duration: 1,
            probability: 0.15,
            description: "Rapid rate rise cycle like 2022-2023"
        },
        {
            name: "Healthcare Crisis",
            healthcareCostMultiplier: 2.5,
            duration: 5,
            probability: 0.20,
            description: "Pandemic-style healthcare cost explosion"
        }
    ],

    // Trust-related constants and rules
    TRUST_RULES: {
        // Attribution rules based on control level
        ATTRIBUTION_RATES: {
            high: 1.0,      // 100% attribution for high control
            medium: 0.75,   // 75% attribution for medium control
            low: 0.50,      // 50% attribution for low control
            none: 0.0       // 0% attribution for no control
        },

        // Trust type risk factors
        TYPE_FACTORS: {
            discretionary: {
                baseAttribution: 1.0,
                centrelinkScrutiny: 'high',
                description: 'Discretionary Family Trust - highest scrutiny'
            },
            unit: {
                baseAttribution: 0.8,
                centrelinkScrutiny: 'medium',
                description: 'Unit Trust - clearer ownership structure'
            },
            hybrid: {
                baseAttribution: 0.9,
                centrelinkScrutiny: 'high',
                description: 'Hybrid Trust - complex assessment'
            },
            other: {
                baseAttribution: 0.85,
                centrelinkScrutiny: 'medium',
                description: 'Other Trust Structure'
            }
        },

        // Principal residence exemption rules
        HOME_EXEMPTION: {
            inPersonalName: true,   // Full exemption when in personal name
            inTrust: false,         // May lose exemption when in trust
            dependsOnControl: true  // Depends on level of control over trust
        },

        // Deeming rate adjustments for trust income
        DEEMING_ADJUSTMENTS: {
            trustDistributions: true,       // Trust distributions subject to deeming
            actualIncomeTest: false,        // Use deeming rather than actual income
            frankingCreditEligible: true   // Trust distributions can include franking credits
        }
    },

    // Default values for new users - consolidated from app.js
    DEFAULTS: {
        personal: {
            yourCurrentAge: 49,
            partnerCurrentAge: 47,
            retirementAge: 72,
            partnerRetirementAge: 62,
            yourLifespan: 95,
            partnerLifespan: 99
        },
        financial: {
            yourSalary: 214000,
            partnerSalary: 34500,
            yourCurrentSuper: 312000,
            partnerCurrentSuper: 150000,
            currentSavings: 55000,
            currentStocks: 62000,
            monthlyStockContribution: 800,
            percentIncomeSaved: 0.09  // 9% as decimal
        },
        property: {
            homeValue: 810000,
            mortgageBalance: 594000,
            mortgageRate: 0.0537,  // 5.37% as decimal
            monthlyMortgagePayment: 3584,
            planToDownsize: true,
            hasInvestmentProperty: false,
            investmentPropertyValue: 550000,
            investmentPropertyLoan: 574000,
            investmentPropertyRate: 0.062,  // 6.2% as decimal
            weeklyRentalIncome: 554,
            annualPropertyExpenses: 9675,
            propertyGrowthRate: 4.5,  // Stored as percentage
            sellPropertyYears: 15,
            capitalGainsTaxRate: 0.225  // 22.5% as decimal
        },
        healthcare: {
            currentHealthcareCosts: 3500,
            healthcareInflation: 6.1, // Based on ABS data April 2024 - health sector third highest inflation in Australia
            hasPrivateHealth: "comprehensive",
            chronicConditions: "none",
            agedCareProbability: 65,
            agedCareStartAge: 85,
            agedCareDuration: 3.5,
            agedCareAnnualCost: 75000
        },
        economic: {
            inflation: 0.0287,  // 2.87% as decimal
            investmentReturn: 0.0561,  // 5.61% as decimal
            returnDeclineRate: 0.03,
            savingsReturn: 0.0140,  // 1.40% as decimal
            superReturn: 0.0875,  // 8.75% as decimal
            salaryGrowthRate: 0.015,  // 1.5% as decimal
            leanYearsStart: 5,
            leanYearsReduction: 25
        },
        allocation: {
            useGlidePath: true,
            glidePathRule: "110minus",
            frankingCreditBenefit: 1.2,
            australianEquityAllocation: 40,
            dividendYield: 4.5,
            frankingRate: 75,
            allocEquities: 60,
            allocBonds: 30,
            allocCash: 10
        },
        trust: {
            hasTrustAssets: false,
            trustType: "discretionary",
            trustControlLevel: "high",
            trustNetAssets: 0,
            trustAttributionPercentage: 100,
            trustAnnualDistributions: 0,
            homeInTrust: false,
            investmentPropertyInTrust: false,
            stocksInTrust: false
        },
        risk: {
            riskTolerance: 6,
            hasEmergencyFund: "partial",
            hasDebt: "minimal",
            dependents: 0
        },
        simulation: {
            numRuns: 5000,
            returnVolatility: 0.12,  // 12% as decimal
            enableShocks: false,
            shockProbability: 0.05,  // 5% as decimal
            shockMagnitude: -0.25  // -25% as decimal
        },
        pension: {
            asfaComfortable: 73875,
            agePensionMax: 45037,
            pensionAssetThreshold: 470000,
            pensionAssetLimit: 1031000,
            pensionIncomeThreshold: 372
        }
    },
    
    // Validation rules
    VALIDATION: {
        age: { min: 18, max: 120 },
        salary: { min: 0, max: 1000000 },
        percentage: { min: 0, max: 100 },
        currency: { min: 0, max: 10000000 },
        years: { min: 0.5, max: 65 },
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
        autoRebalanceThreshold: 0.05,
        contributionEscalationCap: 0.03,
        defaultParticipation: true,
        lossFramingThreshold: 0.1
    },

    // Health Check Dashboard thresholds
    HEALTH_CHECK: {
        SAVINGS_RATE: {
            GOOD: 10,
            OK: 5
        },
        ASSET_ALLOCATION: {
            GOOD: 10,
            OK: 20
        },
        CONTRIBUTION_CAPS: {
            GOOD: 5000,
            OK: 15000,
            CONCESSIONAL_CAP: 27500
        },
        TAX_EFFICIENCY: {
            DIV293_THRESHOLD: 250000
        }
    }
};

export default ENHANCED_CONFIG;