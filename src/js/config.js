// config.js - Enhanced Australian Retirement Calculator Configuration
// All Australian-specific constants, rules, and default values

export const ENHANCED_CONFIG = {
    version: '1.1.0',
    lastUpdated: '2025-10-01',

    // Core Australian system constants (Updated Sept 2025 - Services Australia)
    SUPER_GUARANTEE_RATE: 0.12,
    // Deeming thresholds (Sept 2025)
    DEMING_THRESHOLD_SINGLE: 64200,      // Lower deeming rate threshold - singles
    DEMING_THRESHOLD_COUPLE: 106200,     // Lower deeming rate threshold - couples
    DEMING_RATE_LOWER: 0.0075,           // 0.75% on amounts below threshold
    DEMING_RATE_UPPER: 0.0275,           // 2.75% on amounts above threshold
    // Age Pension maximums (Sept 2025)
    SINGLE_PENSION_MAX: 30646,           // $1,178.70/fortnight × 26 (updated from $28,000)
    COUPLE_PENSION_MAX: 46202,           // $1,777.00/fortnight × 26
    // Asset test thresholds - homeowners (Sept 2025)
    SINGLE_ASSET_THRESHOLD: 321500,              // Full pension limit (homeowner)
    SINGLE_ASSET_LIMIT: 714500,                  // Part pension cutoff (homeowner)
    SINGLE_ASSET_THRESHOLD_NON_HOMEOWNER: 563500, // Full pension limit (non-homeowner, +$242,000 supplement)
    SINGLE_ASSET_LIMIT_NON_HOMEOWNER: 956500,     // Part pension cutoff (non-homeowner, +$242,000 supplement)
    COUPLE_ASSET_THRESHOLD: 481500,              // Couple full pension limit (homeowner)
    COUPLE_ASSET_LIMIT: 1074000,                 // Couple part pension cutoff (homeowner)
    COUPLE_ASSET_THRESHOLD_NON_HOMEOWNER: 723500, // Couple full pension limit (non-homeowner, +$242,000 supplement)
    COUPLE_ASSET_LIMIT_NON_HOMEOWNER: 1316000,    // Couple part pension cutoff (non-homeowner, +$242,000 supplement)
    // Non-homeowner supplement (the additional amount added to all thresholds, Sept 2025)
    NON_HOMEOWNER_ASSET_SUPPLEMENT: 242000,
    // Income test thresholds (Sept 2025)
    SINGLE_INCOME_THRESHOLD: 218,        // Per fortnight (updated from $212)
    COUPLE_INCOME_THRESHOLD: 380,        // Per fortnight combined
    HOME_EQUITY_ACCESS_RATE: 0.7,
    CGT_DISCOUNT: 0.5,
    FRANKING_CREDIT_RATE: 0.3,
    // Calendar constants used across financial calculations
    WEEKS_IN_YEAR: 52,
    FORTNIGHTS_IN_YEAR: 26,
    MONTHS_IN_YEAR: 12,
    AVERAGE_WEEKS_PER_MONTH: 52 / 12,    // ≈4.333 - used to convert weekly amounts to monthly

    sources: {
        SUPER_GUARANTEE_RATE: { source: 'ATO', lastUpdated: '2025-10-01' },
        DEMING_THRESHOLDS: { source: 'Services Australia', lastUpdated: '2025-09-20', note: 'Updated to Sept 2025 rates' },
        PENSION_MAXIMUMS: { source: 'Services Australia', lastUpdated: '2025-09-20', note: 'Sept 2025 indexation' },
        ASSET_THRESHOLDS: { source: 'Services Australia', lastUpdated: '2025-09-20', note: 'Sept 2025 indexation' },
        INCOME_THRESHOLDS: { source: 'Services Australia', lastUpdated: '2025-09-20', note: 'Sept 2025 indexation' },
        HOME_EQUITY_ACCESS_RATE: { source: 'Services Australia', lastUpdated: '2025-10-01' },
        CGT_DISCOUNT: { source: 'ATO', lastUpdated: '2025-10-01' },
        FRANKING_CREDIT_RATE: { source: 'ATO', lastUpdated: '2025-10-01' },
        inflation: { source: 'RBA/ABS', lastUpdated: '2025-10-01', medianValue: true, note: 'Using 2.6% median 2000-2025' },
        investmentReturn: { source: 'APRA/Market Analysis', lastUpdated: '2025-10-01', medianValue: true },
        salaryGrowthRate: { source: 'ABS', lastUpdated: '2025-10-01' },
        superReturn: { source: 'APRA', lastUpdated: '2025-10-01', medianValue: true, note: 'Using 7.5% median balanced fund' },
        healthcareInflation: { source: 'AIHW', lastUpdated: '2025-10-01', medianValue: true, note: 'Using 3.8% median 2000-2025' }
    },

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

    // Fallback monthly expense estimates used when cash flow analysis is unavailable.
    // These represent typical Australian household costs (2025 ABS Household Expenditure Survey).
    EXPENSE_FALLBACKS: {
        DEFAULT_MONTHLY_HOUSING_COST: 3000,  // Rent/mortgage estimate when no data available
        DEFAULT_MONTHLY_LIVING_COST: 2500    // Food, transport, utilities estimate
    },

    // ===== OVERSEAS RETIREMENT CONSTANTS (Sept 2025) =====
    // Sources: Services Australia, Department of Social Services, ATO
    OVERSEAS_RETIREMENT: {
        // Age Pension portability rules
        PENSION_AGE: 67,                          // Current qualifying age for Age Pension
        AWLR_START_AGE: 16,                       // AWLR counted from age 16
        AWLR_END_AGE: 67,                         // AWLR counted to pension age (67 years)
        AWLR_TOTAL_YEARS: 51,                     // Total possible AWLR years (67 - 16)
        AWLR_REQUIRED_FOR_FULL: 35,               // Years of AWLR required for full portable pension
        SHORT_ABSENCE_WEEKS: 6,                   // Full pension + supplements up to 6 weeks
        PORTABILITY_THRESHOLD_WEEKS: 26,          // After 26 weeks, AWLR-proportional rate applies

        // Pension supplement annual amounts lost when living overseas (Sept 2025 rates)
        // Pension Supplement (basic rate retained but top-up lost) + Energy Supplement
        // Single:        $78.40 + $14.10 = $92.50/fortnight × 26 = ~$2,405/year
        // Couple (each): $59.10 + $10.60 = $69.70/fortnight per person × 26 = ~$1,812/year per person
        // Note: PENSION_SUPPLEMENT_REDUCTION_COUPLE is the per-person reduction; applies once each
        PENSION_SUPPLEMENT_REDUCTION_SINGLE: 2405,    // Annual reduction for a single person living overseas
        PENSION_SUPPLEMENT_REDUCTION_COUPLE: 1812,    // Annual reduction per person for each member of a couple overseas

        // ASFA comfortable retirement standard (2025, used for overseas cost comparisons)
        ASFA_SINGLE_ANNUAL: 51814,
        ASFA_COUPLE_ANNUAL: 73031,

        // Countries with Australian Social Security Agreements (as of 2025)
        // Source: Department of Social Services - dss.gov.au/international-social-security-agreements
        AGREEMENT_COUNTRIES: [
            'austria', 'belgium', 'canada', 'chile', 'croatia', 'cyprus', 'czech-republic',
            'denmark', 'estonia', 'finland', 'germany', 'greece', 'hungary', 'india',
            'ireland', 'italy', 'japan', 'south-korea', 'latvia', 'malta', 'netherlands',
            'new-zealand', 'north-macedonia', 'norway', 'poland', 'portugal', 'serbia',
            'slovak-republic', 'slovenia', 'spain', 'switzerland', 'usa', 'uruguay'
        ]
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

    // Australian tax brackets (2025-26) — 16% on $18,201–$45,000
    TAX_BRACKETS: [
        { min: 0, max: 18200, rate: 0 },
        { min: 18201, max: 45000, rate: 0.16 },
        { min: 45001, max: 135000, rate: 0.3 },
        { min: 135001, max: 190000, rate: 0.37 },
        { min: 190001, max: Infinity, rate: 0.45 }
    ],

    // Australian tax brackets from 1 July 2026 (FY 2026-27 onwards) — 16% drops to 15%
    TAX_BRACKETS_2026_27: [
        { min: 0, max: 18200, rate: 0 },
        { min: 18201, max: 45000, rate: 0.15 },
        { min: 45001, max: 135000, rate: 0.3 },
        { min: 135001, max: 190000, rate: 0.37 },
        { min: 190001, max: Infinity, rate: 0.45 }
    ],

    // Division 293 threshold: extra 15% contributions tax when income + concessional > $250,000
    DIVISION_293_THRESHOLD: 250000,

    // Concessional and non-concessional contribution caps (ATO 2024-25 onwards)
    CONCESSIONAL_CAP: 30000,
    NON_CONCESSIONAL_CAP: 110000,
    // NCC cap drops to $0 when total super balance (TSB) reaches this amount
    TSB_NCC_BLOCK_THRESHOLD: 2000000,

    // Transfer Balance Cap: maximum that can move to tax-free pension phase
    TRANSFER_BALANCE_CAP: 2000000,       // FY 2025-26
    TRANSFER_BALANCE_CAP_FY2027: 2100000, // FY 2026-27 (indexed)

    // Minimum pension drawdown rates for account-based pensions (ATO Schedule 7, 2025)
    // Key: minimum age for the rate; value: minimum annual drawdown as fraction of balance
    MIN_PENSION_DRAWDOWN_RATES: [
        { minAge: 0,  maxAge: 64, rate: 0.04 },
        { minAge: 65, maxAge: 74, rate: 0.05 },
        { minAge: 75, maxAge: 79, rate: 0.06 },
        { minAge: 80, maxAge: 84, rate: 0.07 },
        { minAge: 85, maxAge: 89, rate: 0.09 },
        { minAge: 90, maxAge: 94, rate: 0.11 },
        { minAge: 95, maxAge: 999, rate: 0.14 }
    ],

    // Medicare Levy Surcharge thresholds 2025-26 (singles without private hospital cover)
    // Surcharge: 1% at $93k+, 1.25% at $108k+, 1.5% at $144k+
    MLS_THRESHOLDS: [
        { min: 0,      max: 93000,   rate: 0 },
        { min: 93001,  max: 108000,  rate: 0.01 },
        { min: 108001, max: 144000,  rate: 0.0125 },
        { min: 144001, max: Infinity, rate: 0.015 }
    ],

    // Healthcare inflation rates by condition (Updated 2025-10-01 to AIHW median values)
    // NOTE: Previous settings were too high. AIHW median 2000-2025 is 3.8%, not 6%+
    HEALTHCARE_INFLATION: {
        none: 3.5,      // Below median - minimal healthcare needs
        minor: 3.8,     // Median - typical healthcare needs (AIHW 2000-2025 median)
        moderate: 4.5,  // Above median - increased healthcare needs
        major: 6.5      // Significantly above median - major health conditions
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
            yourLifespan: 85,
            partnerLifespan: 85
        },
        financial: {
            yourSalary: 214000,
            partnerSalary: 34500,
            yourCurrentSuper: 312000,
            partnerCurrentSuper: 150000,
            currentSavings: 55000,
            currentStocks: 62000,
            monthlyStockContribution: 900,
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
            propertyGrowthRate: 0.058,  // Updated 2025-10-01: CoreLogic median 2000-2025 - 5.8% as decimal
            sellPropertyYears: 15,
            capitalGainsTaxRate: 0.225  // 22.5% as decimal
        },
        healthcare: {
            currentHealthcareCosts: 3500,
            healthcareInflation: 0.0382, // Updated 2025-10-01: AIHW median 2000-2025 - 3.82% as decimal
            hasPrivateHealth: "comprehensive",
            chronicConditions: "none",
            agedCareProbability: 0.22, // Updated to 22% as decimal
            agedCareStartAge: 85,
            agedCareDuration: 3,
            agedCareAnnualCost: 75000
        },
        economic: {
            inflation: 0.026,   // Updated 2025-10-01: RBA/ABS median 2000-2025 (was 0.0287)
            investmentReturn: 0.0561,  // 5.61% as decimal
            returnDeclineRate: 0.0003, // 0.03% as decimal
            savingsReturn: 0.0140,  // 1.40% as decimal
            superReturn: 0.075,  // Updated 2025-10-01: APRA balanced fund median (was 0.0875)
            salaryGrowthRate: 0.015,  // 1.5% as decimal
            leanYearsStart: 5,
            leanYearsReduction: 0.38 // 38% as decimal
        },
        allocation: {
            useGlidePath: true,
            glidePathRule: "110minus",
            frankingCreditBenefit: 1.2,
            australianEquityAllocation: 40,
            dividendYield: 0.045, // 4.5% as decimal
            frankingRate: 0.75, // 75% as decimal
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
            asfaComfortable: 73031,      // Updated 2025-10-01: ASFA March 2025 (was 73875)
            agePensionMax: 46202,        // Updated 2025-10-01: Sept 2025 couple max (was 45037)
            pensionAssetThreshold: 481500,  // Updated 2025-10-01: Couple homeowner Sept 2025 (was 470000)
            pensionAssetLimit: 1074000,  // Updated 2025-10-01: Couple homeowner Sept 2025 (was 1031000)
            pensionIncomeThreshold: 380  // Updated 2025-10-01: Couple Sept 2025 fortnightly (was 372)
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

    financials: {
        // ===== METADATA FOR ADMIN INTERFACE =====
        _metadata: {
            version: "3.0.0",
            lastUpdated: "2025-01-11",
            sources: ["ABS", "RBA", "ASIC", "APRA", "Australian Government"],
            nextReviewDate: "2025-07-23",
            autoUpdateEnabled: false
        },

        // ===== AUSTRALIAN FINANCIAL SYSTEM CONSTANTS =====
        australianSystem: {
            _category: "Australian Financial System",
            _description: "Core constants from Australian government and financial system",
            _lastResearched: "2025-01-10",
            _sources: ["Australian Government", "ATO", "Services Australia"],

            SUPER_GUARANTEE_RATE: {
                value: 0.12,
                description: "Current superannuation guarantee rate",
                source: "ATO",
                lastUpdated: "2025-01-10",
                nextReview: "2025-07-02",
                isGovernmentSet: true
            },
            CORPORATE_TAX_RATE: {
                value: 0.30,
                description: "Australian corporate tax rate",
                source: "ATO",
                lastUpdated: "2025-01-01",
                isGovernmentSet: true
            },
            CGT_DISCOUNT: {
                value: 0.50,
                description: "Capital gains tax discount for assets held >12 months",
                source: "ATO",
                isGovernmentSet: true
            },
            FRANKING_CREDIT_ADJUSTMENT: {
                value: 1.2,
                description: "Franking credit calculation adjustment factor",
                source: "ATO calculations",
                isResearchDerived: true
            }
        },

        // ===== RISK ASSESSMENT PARAMETERS =====
        riskAssessment: {
            _category: "Risk Assessment & Scoring",
            _description: "Thresholds and factors for risk capacity, tolerance, and requirement calculations",
            _source: "Financial planning research and industry standards",

            SUCCESS_RATE_THRESHOLDS: {
                CRITICAL: { value: 0.50, description: "Below this requires immediate action" },
                LOW: { value: 0.70, description: "Requires attention and strategy adjustment" },
                ACCEPTABLE: { value: 0.85, description: "Acceptable success probability" },
                EXCELLENT: { value: 0.95, description: "Excellent success probability" }
            },
            PORTFOLIO_TO_INCOME_RATIOS: {
                VERY_HIGH: { value: 10, score: 25, description: "Very high capacity - 10+ times income" },
                HIGH: { value: 5, score: 20, description: "High capacity - 5+ times income" },
                MODERATE: { value: 3, score: 15, description: "Moderate capacity - 3+ times income" },
                BASIC: { value: 1, score: 10, description: "Basic capacity - 1+ times income" },
                LOW: { value: 0.5, score: 5, description: "Low capacity - 0.5+ times income" }
            },
            RISK_FREE_RATE: {
                value: 0.03,
                description: "Assumed risk-free rate for risk requirement calculations",
                source: "RBA cash rate historical average",
                canBeUpdated: true
            },
            TIME_HORIZON_FACTOR: {
                value: 1.2,
                description: "Time horizon weighting exponent",
                source: "Financial planning research",
                isResearchDerived: true
            },

            RISK_SCORING_RUBRICS: {
                capacity: {
                    income: {
                        description: "Annual household income stability and level",
                        scoring: {
                            veryHigh: { threshold: 200000, score: 100, description: "$200,000+ - Very high income capacity" },
                            high: { threshold: 120000, score: 80, description: "$120,000+ - High income capacity" },
                            moderate: { threshold: 80000, score: 60, description: "$80,000+ - Moderate income capacity" },
                            low: { threshold: 50000, score: 40, description: "$50,000+ - Limited income capacity" },
                            veryLow: { threshold: 0, score: 20, description: "Under $50,000 - Very limited capacity" }
                        }
                    },
                    assets: {
                        description: "Liquid assets and investment portfolio size",
                        scoring: {
                            veryHigh: { ratio: 10, score: 100, description: "10+ times annual expenses" },
                            high: { ratio: 5, score: 80, description: "5+ times annual expenses" },
                            moderate: { ratio: 2, score: 60, description: "2+ times annual expenses" },
                            low: { ratio: 1, score: 40, description: "1+ times annual expenses" },
                            veryLow: { ratio: 0, score: 20, description: "Less than annual expenses" }
                        }
                    },
                    timeHorizon: {
                        description: "Years until retirement and investment timeline",
                        scoring: {
                            veryLong: { years: 20, score: 100, description: "20+ years - Excellent time capacity" },
                            long: { years: 15, score: 80, description: "15+ years - Good time capacity" },
                            moderate: { years: 10, score: 60, description: "10+ years - Moderate time capacity" },
                            short: { years: 5, score: 40, description: "5+ years - Limited time capacity" },
                            veryShort: { years: 0, score: 20, description: "Under 5 years - Very limited time" }
                        }
                    },
                    emergencyFund: {
                        description: "Emergency fund adequacy and liquidity",
                        scoring: {
                            excellent: { months: 12, score: 100, description: "12+ months expenses - Excellent safety net" },
                            good: { months: 6, score: 80, description: "6+ months expenses - Good safety net" },
                            adequate: { months: 3, score: 60, description: "3+ months expenses - Adequate safety net" },
                            minimal: { months: 1, score: 40, description: "1+ month expenses - Minimal safety net" },
                            none: { months: 0, score: 20, description: "No emergency fund - High vulnerability" }
                        }
                    },
                    debt: {
                        description: "Debt levels relative to income and assets",
                        scoring: {
                            none: { ratio: 0, score: 100, description: "No debt - Maximum capacity" },
                            low: { ratio: 0.2, score: 80, description: "Low debt (<20% of income) - High capacity" },
                            moderate: { ratio: 0.4, score: 60, description: "Moderate debt (20-40% of income)" },
                            high: { ratio: 0.6, score: 40, description: "High debt (40-60% of income)" },
                            excessive: { ratio: 1, score: 20, description: "Excessive debt (>60% of income)" }
                        }
                    },
                    dependents: {
                        description: "Number of financial dependents and obligations",
                        scoring: {
                            none: { count: 0, score: 100, description: "No dependents - Maximum flexibility" },
                            few: { count: 1, score: 80, description: "1-2 dependents - High flexibility" },
                            moderate: { count: 3, score: 60, description: "3-4 dependents - Moderate flexibility" },
                            many: { count: 5, score: 40, description: "5+ dependents - Limited flexibility" },
                            significant: { count: 999, score: 20, description: "Significant care obligations" }
                        }
                    }
                },
                tolerance: {
                    reactionToLoss: {
                        description: "Emotional response to investment losses",
                        scoring: {
                            opportunistic: { score: 100, description: "See losses as buying opportunities" },
                            calm: { score: 80, description: "Stay calm and stick to plan" },
                            concerned: { score: 60, description: "Concerned but don't panic sell" },
                            anxious: { score: 40, description: "Lose sleep and consider selling" },
                            panic: { score: 20, description: "Panic sell at market lows" }
                        }
                    },
                    volatilityComfort: {
                        description: "Comfort with portfolio value fluctuations",
                        scoring: {
                            veryHigh: { range: 0.3, score: 100, description: "Comfortable with 30%+ swings" },
                            high: { range: 0.2, score: 80, description: "Comfortable with 20%+ swings" },
                            moderate: { range: 0.15, score: 60, description: "Comfortable with 15%+ swings" },
                            low: { range: 0.1, score: 40, description: "Comfortable with 10%+ swings" },
                            veryLow: { range: 0.05, score: 20, description: "Comfortable with 5%+ swings" }
                        }
                    },
                    experienceLevel: {
                        description: "Investment experience and market knowledge",
                        scoring: {
                            expert: { years: 15, score: 100, description: "15+ years experience, sophisticated investor" },
                            experienced: { years: 10, score: 80, description: "10+ years experience, knowledgeable" },
                            moderate: { years: 5, score: 60, description: "5+ years experience, learning" },
                            beginner: { years: 2, score: 40, description: "2+ years experience, basic knowledge" },
                            novice: { years: 0, score: 20, description: "New to investing, minimal knowledge" }
                        }
                    },
                    marketHistoryUnderstanding: {
                        description: "Understanding of historical market performance and cycles",
                        scoring: {
                            excellent: { score: 100, description: "Deep understanding of market cycles and history" },
                            good: { score: 80, description: "Good understanding of long-term market performance" },
                            moderate: { score: 60, description: "Basic understanding of market volatility" },
                            limited: { score: 40, description: "Limited understanding of market history" },
                            minimal: { score: 20, description: "Minimal understanding of market risks" }
                        }
                    }
                },
                requirement: {
                    retirementGap: {
                        description: "Gap between current savings trajectory and retirement needs",
                        scoring: {
                            surplus: { gap: -0.2, score: 20, description: "On track with surplus - Low risk needed" },
                            onTrack: { gap: 0, score: 40, description: "On track for goals - Moderate risk needed" },
                            shortfall: { gap: 0.3, score: 60, description: "30% shortfall - Higher risk needed" },
                            significant: { gap: 0.6, score: 80, description: "60% shortfall - High risk required" },
                            critical: { gap: 1, score: 100, description: "Major shortfall - Maximum risk required" }
                        }
                    },
                    inflationProtection: {
                        description: "Need for inflation protection over retirement period",
                        scoring: {
                            minimal: { years: 5, score: 20, description: "Short retirement - Minimal inflation risk" },
                            low: { years: 15, score: 40, description: "Moderate retirement - Low inflation risk" },
                            moderate: { years: 25, score: 60, description: "Long retirement - Moderate inflation risk" },
                            high: { years: 30, score: 80, description: "Very long retirement - High inflation risk" },
                            critical: { years: 35, score: 100, description: "Extreme longevity - Critical inflation risk" }
                        }
                    },
                    timeUrgency: {
                        description: "Urgency based on time remaining to retirement",
                        scoring: {
                            relaxed: { years: 25, score: 20, description: "25+ years - No time urgency" },
                            comfortable: { years: 15, score: 40, description: "15+ years - Comfortable timeline" },
                            moderate: { years: 10, score: 60, description: "10+ years - Moderate urgency" },
                            urgent: { years: 5, score: 80, description: "5+ years - High urgency" },
                            critical: { years: 2, score: 100, description: "2+ years - Critical urgency" }
                        }
                    },
                    goalAmbition: {
                        description: "Ambition level of retirement lifestyle goals",
                        scoring: {
                            basic: { replacement: 0.6, score: 20, description: "Basic needs - 60% income replacement" },
                            comfortable: { replacement: 0.7, score: 40, description: "Comfortable - 70% income replacement" },
                            maintain: { replacement: 0.8, score: 60, description: "Maintain lifestyle - 80% replacement" },
                            enhanced: { replacement: 0.9, score: 80, description: "Enhanced lifestyle - 90% replacement" },
                            luxury: { replacement: 1.2, score: 100, description: "Luxury retirement - 120%+ replacement" }
                        }
                    }
                }
            }
        },

        // ===== ASSET ALLOCATION CONSTANTS =====
        assetAllocation: {
            _category: "Asset Allocation & Portfolio Management",
            _description: "Default ratios and limits for portfolio construction",

            RETURN_EXPECTATIONS: {
                EQUITY_MULTIPLIER: {
                    value: 1.2,
                    description: "Equity return multiplier vs base return"
                },
                BOND_MULTIPLIER: {
                    value: 0.6,
                    description: "Bond return expectation (60% of equity)"
                },
                CASH_MULTIPLIER: {
                    value: 0.3,
                    description: "Cash return expectation (30% of equity)"
                }
            },
            DYNAMIC_ALLOCATION_RATIOS: {
                BOND_WEIGHT: {
                    value: 0.7,
                    description: "Bond weight in non-equity allocation"
                },
                CASH_WEIGHT: {
                    value: 0.3,
                    description: "Cash weight in non-equity allocation"
                }
            },
            MINIMUM_ALLOCATIONS: {
                BOND_MIN: { value: 10, description: "Minimum bond allocation percentage" },
                CASH_MIN: { value: 5, description: "Minimum cash allocation percentage" }
            },
            RETURN_LIMITS: {
                BOND_FLOOR: { value: -0.15, description: "Maximum bond loss in single year" },
                CASH_FLOOR: { value: 0.001, description: "Minimum cash return" },
                PROPERTY_FLOOR: { value: -0.30, description: "Maximum property loss (GFC level)" }
            },
            RATE_ADJUSTMENT_FACTORS: {
                BOND_SENSITIVITY: {
                    value: 0.5,
                    description: "Bond return sensitivity to interest rate changes"
                },
                CASH_SENSITIVITY: {
                    value: 0.8,
                    description: "Cash return sensitivity to interest rate changes"
                }
            },
            NORMAL_RATE_BASELINE: {
                value: 0.045,
                description: "Normal interest rate baseline for adjustments",
                source: "RBA historical normal rate",
                canBeUpdated: true
            }
        },

        // ===== MONTE CARLO & VOLATILITY PARAMETERS =====
        monteCarlo: {
            _category: "Monte Carlo Simulation Parameters",
            _description: "Volatility, correlation, and randomization factors",

            CORRELATION_FACTORS: {
                PROPERTY_CORRELATION: {
                    value: 0.15,
                    description: "Property return sequential correlation (higher persistence)"
                },
                PORTFOLIO_CORRELATION: {
                    value: 0.05,
                    description: "Diversified portfolio sequential correlation (lower)"
                }
            },
            VOLATILITY_PARAMETERS: {
                BOND_VOLATILITY: {
                    value: 0.04,
                    description: "Standard bond return volatility"
                }
            },
            EXPENSE_VARIATION_FACTORS: {
                HOUSING_VARIATION: {
                    value: 0.3,
                    description: "Housing expense variation range (±30%)"
                },
                LIVING_VARIATION: {
                    value: 0.4,
                    description: "Living expense variation range (±40%)"
                },
                DISCRETIONARY_RANGE: {
                    value: 20000,
                    description: "Discretionary spending variation (±$20,000)"
                },
                FALLBACK_VARIATION: {
                    value: 25000,
                    description: "Fallback ASFA variation (±$25,000)"
                }
            }
        },

        // ===== PROPERTY INVESTMENT CONSTANTS =====
        propertyInvestment: {
            _category: "Property Investment Parameters",
            _description: "Australian property market assumptions and calculations",

            VALUATION_ASSUMPTIONS: {
                BUILDING_VALUE_RATIO: {
                    value: 0.8,
                    description: "Building component of property value (for depreciation)"
                },
                DEPRECIATION_RATE: {
                    value: 0.025,
                    description: "Annual building depreciation rate (2.5%)"
                }
            },
            TRANSACTION_COSTS: {
                SELLING_COSTS_PERCENT: {
                    value: 0.06,
                    description: "Total property selling costs (6%)",
                    includes: ["Agent fees", "Legal", "Marketing", "Transfer duties"]
                }
            },
            GROWTH_LIMITS: {
                MAX_ANNUAL_GROWTH: {
                    value: 0.20,
                    description: "Maximum property growth rate cap (20%)"
                }
            }
        },

        // ===== CASH FLOW ANALYSIS CONSTANTS =====
        cashFlowAnalysis: {
            _category: "Cash Flow & Living Expense Analysis",
            _description: "Australian household expense data and thresholds",
            _source: "ABS Household Expenditure Survey 2025",

            BASE_LIVING_EXPENSES: {
                COUPLE_BASE: {
                    value: 4118,
                    description: "Monthly living expenses for couple (ABS 2025)",
                    source: "ABS Household Expenditure Survey",
                    currency: "AUD",
                    lastUpdated: "2025-01-15"
                },
                SINGLE_BASE: {
                    value: 2835,
                    description: "Monthly living expenses for single person (ABS 2025)",
                    source: "ABS Household Expenditure Survey",
                    currency: "AUD",
                    lastUpdated: "2025-01-15"
                },
                PER_CHILD: {
                    value: 630,
                    description: "Additional monthly cost per child (ABS 2025)",
                    source: "ABS Household Expenditure Survey",
                    currency: "AUD",
                    lastUpdated: "2025-01-15"
                }
            },
            AVERAGE_HOUSING_COSTS: {
                MORTGAGE_MONTHLY: {
                    value: 3961,
                    description: "Average monthly mortgage repayment Australia (2025)",
                    source: "Australian home loan statistics 2025",
                    currency: "AUD",
                    lastUpdated: "2025-01-15"
                },
                MORTGAGE_NSW: {
                    value: 4766,
                    description: "Average monthly mortgage repayment NSW (2025)",
                    source: "Australian home loan statistics 2025",
                    currency: "AUD",
                    lastUpdated: "2025-01-15"
                },
                MORTGAGE_TAS: {
                    value: 2812,
                    description: "Average monthly mortgage repayment Tasmania (2025)",
                    source: "Australian home loan statistics 2025",
                    currency: "AUD",
                    lastUpdated: "2025-01-15"
                },
                RENT_ESTIMATION: {
                    value: 0.7,
                    description: "Rent typically 70% of equivalent mortgage payment",
                    source: "Property market analysis 2025",
                    lastUpdated: "2025-01-15"
                }
            },
            ASFA_RETIREMENT_STANDARDS: {
                COUPLE_COMFORTABLE_ANNUAL: {
                    value: 73031,
                    description: "ASFA comfortable retirement for couple (annual)",
                    source: "ASFA Retirement Standard March 2025",
                    currency: "AUD",
                    lastUpdated: "2025-03-01"
                },
                COUPLE_COMFORTABLE_MONTHLY: {
                    value: 6086,
                    description: "ASFA comfortable retirement for couple (monthly)",
                    source: "ASFA Retirement Standard March 2025",
                    currency: "AUD",
                    lastUpdated: "2025-03-01"
                },
                SINGLE_COMFORTABLE_ANNUAL: {
                    value: 51814,
                    description: "ASFA comfortable retirement for single (annual)",
                    source: "ASFA Retirement Standard March 2025",
                    currency: "AUD",
                    lastUpdated: "2025-03-01"
                },
                SINGLE_COMFORTABLE_MONTHLY: {
                    value: 4318,
                    description: "ASFA comfortable retirement for single (monthly)",
                    source: "ASFA Retirement Standard March 2025",
                    currency: "AUD",
                    lastUpdated: "2025-03-01"
                }
            },
            CHILDCARE_COSTS: {
                DAILY_RATE: {
                    value: 135,
                    description: "Average daily childcare cost (2025)",
                    source: "Australian Government Department of Education",
                    canBeUpdated: true
                },
                SUBSIDY_FACTOR: {
                    value: 0.40,
                    description: "Average government childcare subsidy reduction (40%)"
                }
            },
            FINANCIAL_STRESS_INDICATORS: {
                HOUSING_STRESS_THRESHOLD: {
                    value: 0.30,
                    description: "Housing stress threshold (30% of income)",
                    source: "Australian housing affordability research"
                },
                MORTGAGE_INCOME_RATIO: {
                    value: 0.25,
                    description: "Mortgage payment warning threshold (25% of income)"
                }
            },
            SAVINGS_CAPACITY_RATIOS: {
                MODERATE_CAPACITY: {
                    value: 0.6,
                    description: "Conservative savings capacity ratio (60%)"
                },
                HIGH_CAPACITY: {
                    value: 0.7,
                    description: "Strong savings capacity ratio (70%)"
                }
            }
        },

        // ===== HEALTHCARE & AGED CARE =====
        healthcareAgedCare: {
            _category: "Healthcare & Aged Care Costs",
            _description: "Australian healthcare system costs and inflation",
            _source: "ABS, AIHW, Department of Health",

            CURRENT_COSTS: {
                AVERAGE_ANNUAL_HEALTHCARE: {
                    value: 5200,
                    description: "Average annual healthcare costs per person",
                    source: "AIHW Health Expenditure Australia 2024",
                    lastUpdated: "2025-01-15"
                }
            },
            INFLATION_RATES: {
                HEALTHCARE_INFLATION: {
                    value: 6.1,
                    description: "Healthcare inflation rate (% annually)",
                    source: "ABS Consumer Price Index - Health sector",
                    lastUpdated: "2025-01-15",
                    note: "Third highest inflation sector in Australia"
                }
            },
            AGED_CARE_ASSUMPTIONS: {
                PROBABILITY: {
                    value: 0.65,
                    description: "Probability of requiring aged care (65%)",
                    source: "Australian Government Productivity Commission"
                },
                ANNUAL_COST: {
                    value: 75000,
                    description: "Average annual aged care cost",
                    source: "Aged Care Financing Authority"
                },
                AVERAGE_DURATION: {
                    value: 3.5,
                    description: "Average duration in aged care (years)"
                }
            }
        },

        // ===== SCENARIO STRESS TESTING =====
        stressTesting: {
            _category: "Stress Testing & Scenario Analysis",
            _description: "Parameters for stress testing and scenario modeling",

            MARKET_CRASH_SCENARIOS: {
                GFC_STYLE: {
                    EQUITY_DECLINE: { value: -0.40, description: "Equity market decline (GFC 2008)" },
                    BOND_RESPONSE: { value: -0.05, description: "Bond market response to crisis" },
                    DURATION: { value: 1, description: "Crisis duration in years" }
                }
            },
            HEALTHCARE_STRESS: {
                HIGH_INFLATION_RATE: {
                    value: 7.5,
                    description: "Stress test healthcare inflation (7.5% vs baseline)"
                }
            },
            LONGEVITY_STRESS: {
                EXTENDED_LIFESPAN: {
                    value: 95,
                    description: "Longevity stress test age (95 years)"
                }
            }
        },

        // ===== UTILITY FUNCTIONS =====
        getConstant: function(category, key, subkey = null) {
            try {
                let value = this[category][key];
                if (subkey && value[subkey]) {
                    value = value[subkey];
                }
                return value?.value !== undefined ? value.value : value;
            } catch (error) {
                console.warn(`Config constant not found: ${category}.${key}${subkey ? `.${subkey}` : ''}`);
                return null;
            }
        },

        updateConstant: function(category, key, newValue, metadata = {}) {
            try {
                if (this[category] && this[category][key]) {
                    if (typeof this[category][key] === 'object' && this[category][key].value !== undefined) {
                        this[category][key].value = newValue;
                        this[category][key].lastUpdated = new Date().toISOString().split('T')[0];
                        if (metadata.source) this[category][key].source = metadata.source;
                    } else {
                        this[category][key] = newValue;
                    }
                    console.log(`Updated ${category}.${key} to ${newValue}`);
                    return true;
                }
            } catch (error) {
                console.error(`Failed to update ${category}.${key}:`, error);
            }
            return false;
        },

        getMetadata: function(category, key) {
            try {
                const item = this[category][key];
                if (typeof item === 'object' && item.value !== undefined) {
                    return {
                        value: item.value,
                        description: item.description,
                        source: item.source,
                        lastUpdated: item.lastUpdated,
                        canBeUpdated: item.canBeUpdated !== false
                    };
                }
            } catch (error) {
                console.warn(`Metadata not found for ${category}.${key}`);
            }
            return null;
        },

        // ===== MONTE CARLO SIMULATION CONSTANTS =====
        monteCarloSimulation: {
            _category: "Monte Carlo Simulation Parameters",
            _description: "Advanced Monte Carlo simulation configuration values",
            _source: "Financial modeling research and Australian market data",

            ASSET_CORRELATIONS: {
                EQUITY_BONDS: { value: -0.15, description: "Negative correlation during risk-off periods" },
                EQUITY_PROPERTY: { value: 0.35, description: "Moderate positive correlation with property" },
                EQUITY_INTERNATIONAL: { value: 0.75, description: "High correlation with global markets" },
                EQUITY_CASH: { value: -0.05, description: "Slight negative correlation with cash" },
                BONDS_PROPERTY: { value: -0.10, description: "Bonds to property correlation" },
                BONDS_INTERNATIONAL: { value: 0.20, description: "Bonds to international correlation" },
                BONDS_CASH: { value: 0.30, description: "Bonds to cash positive correlation" },
                PROPERTY_INTERNATIONAL: { value: 0.25, description: "Property to international correlation" },
                PROPERTY_CASH: { value: -0.05, description: "Property to cash correlation" }
            },

            VOLATILITY_CLUSTERING: {
                BASE_VOLATILITY: { value: 0.15, description: "Base volatility assumption" },
                HIGH_VOLATILITY_PERSISTENCE: { value: 0.7, description: "70% chance to stay in high volatility" },
                LOW_VOLATILITY_PERSISTENCE: { value: 0.6, description: "60% chance to stay in low volatility" },
                HIGH_VOLATILITY_MULTIPLIER: { value: 1.8, description: "High volatility period multiplier" },
                LOW_VOLATILITY_MULTIPLIER: { value: 0.6, description: "Low volatility period multiplier" },
                VOLATILITY_NOISE: { value: 0.2, description: "Random noise in volatility calculations" },
                HIGH_VOLATILITY_PROBABILITY: { value: 0.15, description: "Probability of entering high volatility" },
                LOW_VOLATILITY_PROBABILITY: { value: 0.1, description: "Probability of entering low volatility (0.25 - 0.15)" }
            },

            RETURN_CALCULATIONS: {
                BOND_VOLATILITY: { value: 0.08, description: "Bond return volatility" },
                BOND_VOLATILITY_ADJUSTMENT: { value: 0.5, description: "Bond volatility adjustment factor" },
                PROPERTY_BASE_VOLATILITY: { value: 0.12, description: "Property base volatility" },
                CASH_VOLATILITY: { value: 0.005, description: "Cash return volatility" },
                NORMAL_RATE_BASELINE: { value: 0.045, description: "Normal interest rate baseline (4.5%)" },
                EQUITY_RATE_SENSITIVITY: { value: -0.8, description: "Equity sensitivity to rate changes" },
                PROPERTY_RATE_SENSITIVITY: { value: -1.5, description: "Property sensitivity to rate changes" },
                BOND_DURATION: { value: 5, description: "Assumed portfolio bond duration" },
                EQUITY_SPILLOVER_THRESHOLD_POSITIVE: { value: 0.15, description: "Equity return threshold for positive spillover" },
                EQUITY_SPILLOVER_THRESHOLD_NEGATIVE: { value: -0.15, description: "Equity return threshold for negative spillover" },
                EQUITY_SPILLOVER_BOOST: { value: 0.02, description: "2% boost to property from strong equity" },
                EQUITY_SPILLOVER_DRAG: { value: -0.01, description: "1% drag on property from weak equity" }
            },

            RETURN_CAPS: {
                EQUITY_MAX: { value: 0.8, description: "Maximum equity return cap (80%)" },
                EQUITY_MIN: { value: -0.6, description: "Minimum equity return floor (-60%)" },
                BONDS_MAX: { value: 0.4, description: "Maximum bond return cap (40%)" },
                BONDS_MIN: { value: -0.3, description: "Minimum bond return floor (-30%)" },
                PROPERTY_MAX: { value: 0.5, description: "Maximum property return cap (50%)" },
                PROPERTY_MIN: { value: -0.4, description: "Minimum property return floor (-40%)" }
            },

            REGIME_TRANSITIONS: {
                EQUITY_REGIME_CHANGE_PROBABILITY: { value: 0.2, description: "20% chance of equity regime change each year" },
                NORMAL_REGIME_BIAS: { value: 1.5, description: "Bias factor toward normal regime" },
                REGIME_DURATION_NOISE: { value: 1, description: "Random noise in regime duration" }
            },

            BASE_RETURN_ASSUMPTIONS: {
                BOND_MULTIPLIER: { value: 0.6, description: "Bond return as 60% of equity expected return" },
                PROPERTY_MULTIPLIER: { value: 0.8, description: "Property return as 80% of equity expected return" },
                CASH_BASE_RETURN: { value: 0.03, description: "Cash base return assumption (3%)" }
            },

            CONFIDENCE_INTERVALS: {
                CI80_LOWER: { value: 0.1, description: "80% confidence interval lower bound (10th percentile)" },
                CI80_UPPER: { value: 0.9, description: "80% confidence interval upper bound (90th percentile)" },
                CI90_LOWER: { value: 0.05, description: "90% confidence interval lower bound (5th percentile)" },
                CI90_UPPER: { value: 0.95, description: "90% confidence interval upper bound (95th percentile)" },
                CI95_LOWER: { value: 0.025, description: "95% confidence interval lower bound (2.5th percentile)" },
                CI95_UPPER: { value: 0.975, description: "95% confidence interval upper bound (97.5th percentile)" }
            },

            TAIL_RISK_PERCENTILES: {
                EXPECTED_SHORTFALL_99: { value: 0.99, description: "99% expected shortfall calculation" },
                EXPECTED_SHORTFALL_95: { value: 0.95, description: "95% expected shortfall calculation" },
                EXPECTED_SHORTFALL_90: { value: 0.90, description: "90% expected shortfall calculation" }
            },

            SCENARIO_PERCENTILES: {
                PESSIMISTIC: { value: 0.1, description: "10th percentile for pessimistic scenario" },
                MEDIAN: { value: 0.5, description: "50th percentile for median scenario" },
                OPTIMISTIC: { value: 0.9, description: "90th percentile for optimistic scenario" }
            }
        },

        // ===== HEALTHCARE AND AGED CARE DETAILED CONFIG =====
        healthcareDetailed: {
            _category: "Healthcare Cost Modeling - Detailed Data",
            _description: "2024-2025 Australian healthcare costs and aged care projections",
            _source: "ABS, AIHW, Department of Health, Aged Care Financing Authority",
            _lastUpdated: "2025-01-15",

            PRIVATE_HEALTH_INSURANCE_PREMIUMS: {
                SINGLE_BASIC: { value: 1200, description: "Basic hospital cover - single", currency: "AUD/year" },
                SINGLE_STANDARD: { value: 1920, description: "Average comprehensive cover - single", currency: "AUD/year" },
                SINGLE_PREMIUM: { value: 3500, description: "Top tier cover with extras - single", currency: "AUD/year" },
                COUPLE_BASIC: { value: 2400, description: "Basic hospital cover - couple", currency: "AUD/year" },
                COUPLE_STANDARD: { value: 3840, description: "Average comprehensive cover - couple", currency: "AUD/year" },
                COUPLE_PREMIUM: { value: 7000, description: "Top tier cover with extras - couple", currency: "AUD/year" },
                FAMILY_BASIC: { value: 3600, description: "Basic hospital cover - family", currency: "AUD/year" },
                FAMILY_STANDARD: { value: 5760, description: "Average comprehensive cover - family", currency: "AUD/year" },
                FAMILY_PREMIUM: { value: 10500, description: "Top tier cover with extras - family", currency: "AUD/year" }
            },

            HEALTHCARE_INFLATION_RATES_DETAILED: {
                GENERAL_HEALTHCARE: { value: 0.04, description: "4% general health inflation", source: "ABS" },
                PRIVATE_INSURANCE: { value: 0.0373, description: "3.73% private insurance increases", source: "ABS" },
                MEDICAL_SERVICES: { value: 0.059, description: "5.9% medical and hospital services", source: "ABS" },
                AGED_CARE: { value: 0.065, description: "6.5% aged care specific inflation", source: "AIHW" },
                PHARMACEUTICALS: { value: 0.035, description: "3.5% PBS medicines", source: "PBS data" },
                DENTAL: { value: 0.055, description: "5.5% dental services", source: "ABS" },
                ALLIED_HEALTH: { value: 0.045, description: "4.5% allied health services", source: "ABS" }
            },

            OUT_OF_POCKET_COSTS_BY_AGE: {
                AGE_55_64: {
                    ANNUAL: { value: 2800, description: "Total annual out-of-pocket (age 55-64)" },
                    GP: { value: 450, description: "GP out-of-pocket costs" },
                    SPECIALIST: { value: 850, description: "Specialist out-of-pocket costs" },
                    DENTAL: { value: 650, description: "Dental out-of-pocket costs" },
                    ALLIED: { value: 400, description: "Allied health out-of-pocket costs" },
                    PHARMACEUTICALS: { value: 450, description: "Pharmaceutical out-of-pocket costs" }
                },
                AGE_65_74: {
                    ANNUAL: { value: 3800, description: "Total annual out-of-pocket (age 65-74)" },
                    GP: { value: 650, description: "GP out-of-pocket costs" },
                    SPECIALIST: { value: 1200, description: "Specialist out-of-pocket costs" },
                    DENTAL: { value: 800, description: "Dental out-of-pocket costs" },
                    ALLIED: { value: 600, description: "Allied health out-of-pocket costs" },
                    PHARMACEUTICALS: { value: 550, description: "Pharmaceutical out-of-pocket costs" }
                },
                AGE_75_84: {
                    ANNUAL: { value: 5200, description: "Total annual out-of-pocket (age 75-84)" },
                    GP: { value: 950, description: "GP out-of-pocket costs" },
                    SPECIALIST: { value: 1650, description: "Specialist out-of-pocket costs" },
                    DENTAL: { value: 900, description: "Dental out-of-pocket costs" },
                    ALLIED: { value: 850, description: "Allied health out-of-pocket costs" },
                    PHARMACEUTICALS: { value: 850, description: "Pharmaceutical out-of-pocket costs" }
                },
                AGE_85_PLUS: {
                    ANNUAL: { value: 6800, description: "Total annual out-of-pocket (age 85+)" },
                    GP: { value: 1200, description: "GP out-of-pocket costs" },
                    SPECIALIST: { value: 2100, description: "Specialist out-of-pocket costs" },
                    DENTAL: { value: 950, description: "Dental out-of-pocket costs" },
                    ALLIED: { value: 1200, description: "Allied health out-of-pocket costs" },
                    PHARMACEUTICALS: { value: 1350, description: "Pharmaceutical out-of-pocket costs" }
                }
            },

            AGED_CARE_2025_COSTS: {
                AVERAGE_RAD: { value: 470000, description: "Average Refundable Accommodation Deposit", source: "Aged Care Financing Authority" },
                MAXIMUM_RAD: { value: 750000, description: "Maximum RAD from 1 Jan 2025", source: "Australian Government" },
                MPIR_RATE: { value: 0.0778, description: "Maximum Permissible Interest Rate (July 2025)" },
                MPIR_RATE_OCT: { value: 0.0761, description: "Rate from October 2025" },
                BASIC_DAILY_FEE: { value: 59.77, description: "Per day basic fee (Sept 2025)", currency: "AUD/day" },
                MAXIMUM_MEANS_TESTED_FEE: { value: 319.69, description: "Per day maximum means tested fee", currency: "AUD/day" },
                ACCOMMODATION_SUPPLEMENT: { value: 67.40, description: "Per day for low means residents", currency: "AUD/day" },
                LIFETIME_CAP: { value: 130000, description: "Lifetime cap on home care contributions", currency: "AUD" }
            },

            HOME_CARE_PACKAGE_COSTS: {
                LEVEL_1: { value: 9500, description: "Basic services package", currency: "AUD/year" },
                LEVEL_2: { value: 17000, description: "Low level services package", currency: "AUD/year" },
                LEVEL_3: { value: 34000, description: "Intermediate services package", currency: "AUD/year" },
                LEVEL_4: { value: 52000, description: "High care services package", currency: "AUD/year" }
            },

            AGED_CARE_PROBABILITIES: {
                MALE_SINGLE_PROBABILITY_65: { value: 0.05, description: "Male single probability at age 65" },
                MALE_SINGLE_PROBABILITY_85: { value: 0.45, description: "Male single probability at age 85" },
                FEMALE_SINGLE_PROBABILITY_65: { value: 0.06, description: "Female single probability at age 65" },
                FEMALE_SINGLE_PROBABILITY_85: { value: 0.52, description: "Female single probability at age 85" },
                MALE_AVERAGE_AGE: { value: 82, description: "Average age males enter aged care" },
                MALE_AVERAGE_DURATION: { value: 2.8, description: "Average duration for males (years)" },
                FEMALE_AVERAGE_AGE: { value: 85, description: "Average age females enter aged care" },
                FEMALE_AVERAGE_DURATION: { value: 3.2, description: "Average duration for females (years)" }
            },

            CONDITION_COST_MULTIPLIERS: {
                DIABETES: { value: 1.2, description: "Cost multiplier for diabetes" },
                CARDIOVASCULAR: { value: 1.3, description: "Cost multiplier for cardiovascular conditions" },
                ARTHRITIS: { value: 1.1, description: "Cost multiplier for arthritis" },
                MENTAL_HEALTH: { value: 1.15, description: "Cost multiplier for mental health conditions" },
                CANCER: { value: 1.5, description: "Cost multiplier for cancer treatment" },
                AGE_85_MULTIPLIER: { value: 1.3, description: "Age-based multiplier for 85+" },
                AGE_75_MULTIPLIER: { value: 1.15, description: "Age-based multiplier for 75+" },
                MAX_CONDITION_MULTIPLIER: { value: 2.5, description: "Maximum condition cost multiplier cap" }
            },

            HOME_CARE_PROGRESSION: {
                START_AGE: { value: 70, description: "Typical home care start age" },
                LEVEL_1_DURATION: { value: 1.5, description: "Level 1 care duration (years)" },
                LEVEL_2_DURATION: { value: 2.0, description: "Level 2 care duration (years)" },
                LEVEL_3_DURATION: { value: 2.5, description: "Level 3 care duration (years)" },
                LEVEL_4_DURATION: { value: 2.0, description: "Level 4 care duration (years)" },
                HOME_CARE_PERCENTAGE: { value: 0.8, description: "80% of those needing care start with home care" },
                RESIDENTIAL_CARE_PERCENTAGE: { value: 0.3, description: "30% of those needing care go to residential" }
            },

            AGED_CARE_MEANS_TEST: {
                HIGH_MEANS_THRESHOLD_ASSETS: { value: 1000000, description: "High means test asset threshold" },
                HIGH_MEANS_THRESHOLD_INCOME: { value: 100000, description: "High means test income threshold" },
                LOW_MEANS_THRESHOLD_ASSETS: { value: 300000, description: "Low means test asset threshold" },
                LOW_MEANS_THRESHOLD_INCOME: { value: 50000, description: "Low means test income threshold" },
                HIGH_MEANS_CONTRIBUTION_RATE: { value: 0.8, description: "High means contribution rate (80%)" },
                BASE_CONTRIBUTION_RATE: { value: 0.5, description: "Base contribution rate (50%)" },
                FULL_PENSIONER_CONTRIBUTION_RATE: { value: 0.175, description: "Full pensioner contribution rate (17.5%)" }
            }
        },

        // ===== PROPERTY ANALYSIS CONSTANTS =====
        propertyAnalysis: {
            _category: "Property Analysis Parameters",
            _description: "Australian property market data and transaction costs",
            _source: "Property market research, real estate data",

            CAPITAL_CITY_GROWTH_RATES: {
                SYDNEY: { value: 0.065, description: "6.5% long-term average growth rate" },
                MELBOURNE: { value: 0.058, description: "5.8% long-term average growth rate" },
                BRISBANE: { value: 0.072, description: "7.2% strong growth market" },
                PERTH: { value: 0.063, description: "6.3% recovering market" },
                ADELAIDE: { value: 0.069, description: "6.9% strong performer" },
                HOBART: { value: 0.054, description: "5.4% maturing market" },
                DARWIN: { value: 0.041, description: "4.1% challenging market" },
                CANBERRA: { value: 0.067, description: "6.7% stable government market" },
                NATIONAL: { value: 0.061, description: "6.1% national average" }
            },

            RENTAL_YIELDS: {
                SYDNEY: { value: 0.029, description: "2.9% gross rental yield" },
                MELBOURNE: { value: 0.033, description: "3.3% gross rental yield" },
                BRISBANE: { value: 0.042, description: "4.2% gross rental yield" },
                PERTH: { value: 0.038, description: "3.8% gross rental yield" },
                ADELAIDE: { value: 0.041, description: "4.1% gross rental yield" },
                HOBART: { value: 0.045, description: "4.5% gross rental yield" },
                DARWIN: { value: 0.052, description: "5.2% gross rental yield" },
                CANBERRA: { value: 0.035, description: "3.5% gross rental yield" },
                NATIONAL: { value: 0.038, description: "3.8% national average yield" }
            },

            TRANSACTION_COSTS_DETAILED: {
                STAMP_DUTY_AVERAGE: { value: 0.035, description: "~3.5% average across states" },
                LEGAL_FEES_BUYING: { value: 1500, description: "Legal and conveyancing fees", currency: "AUD" },
                INSPECTION_COSTS: { value: 800, description: "Building and pest inspection", currency: "AUD" },
                LOAN_ESTABLISHMENT: { value: 1200, description: "Mortgage establishment fees", currency: "AUD" },
                BUYING_OTHER_COSTS: { value: 1000, description: "Moving, insurance, etc.", currency: "AUD" },
                AGENT_COMMISSION: { value: 0.025, description: "2.5% real estate agent commission" },
                MARKETING_COSTS: { value: 5000, description: "Marketing and advertising", currency: "AUD" },
                LEGAL_FEES_SELLING: { value: 1200, description: "Conveyancing fees", currency: "AUD" },
                SELLING_OTHER_COSTS: { value: 800, description: "Styling, repairs, etc.", currency: "AUD" }
            },

            PROPERTY_INVESTMENT_ASSUMPTIONS: {
                DEPOSIT_PERCENTAGE: { value: 0.2, description: "20% deposit requirement" },
                INVESTMENT_LOAN_RATE: { value: 0.065, description: "6.5% investment loan interest rate" },
                LOAN_TERM_YEARS: { value: 30, description: "30-year loan term" },
                PROPERTY_RATES: { value: 0.01, description: "1% of property value for rates" },
                PROPERTY_INSURANCE: { value: 1200, description: "Annual property insurance", currency: "AUD" },
                MAINTENANCE_PERCENTAGE: { value: 0.01, description: "1% maintenance costs" },
                PROPERTY_MANAGEMENT_RATE: { value: 0.08, description: "8% property management fees" },
                VACANCY_ALLOWANCE: { value: 0.04, description: "4% vacancy allowance" },
                RENTAL_GROWTH_RATE: { value: 0.03, description: "3% annual rent growth" },
                HOLDING_COSTS_PERCENTAGE: { value: 0.02, description: "2% of value annually (rates, insurance, maintenance)" }
            },

            ANALYSIS_THRESHOLDS: {
                MINIMUM_INVESTMENT_CAPITAL: { value: 100000, description: "Minimum capital for property investment" },
                AVAILABLE_CAPITAL_RATIO: { value: 0.7, description: "Use 70% of liquid assets for investment" },
                CAPITAL_BUFFER_YEARS: { value: 2, description: "2 years of monthly investments as buffer" },
                CONCENTRATION_RISK_THRESHOLD: { value: 0.4, description: "40% property allocation risk threshold" },
                HIGH_LVR_THRESHOLD: { value: 0.6, description: "60% LVR high leverage threshold" },
                LOW_YIELD_THRESHOLD: { value: 0.03, description: "3% low rental yield threshold" },
                NEGATIVE_CASHFLOW_THRESHOLD: { value: -10000, description: "Concerning negative cash flow level" },
                PROPERTY_PURCHASE_GROWTH_ASSUMPTION: { value: 0.7, description: "Assume 30% growth if no purchase price provided" }
            },

            STRATEGY_SCORING: {
                HIGH_NET_BENEFIT_THRESHOLD: { value: 50000, description: "High net benefit threshold for sell scenarios" },
                EXCELLENT_RETURN_THRESHOLD: { value: 0.08, description: "8% excellent return threshold" },
                GOOD_RETURN_THRESHOLD: { value: 0.06, description: "6% good return threshold" },
                POSITIVE_CASHFLOW_BONUS: { value: 20, description: "Bonus points for positive cash flow" },
                MARKET_TIMING_BONUS: { value: 10, description: "Bonus points for market timing" },
                VALUE_ADD_BONUS: { value: 10, description: "Bonus points for value-add strategy" },
                IMPROVEMENT_COST_EXAMPLE: { value: 50000, description: "Example improvement cost" },
                IMPROVEMENT_VALUE_EXAMPLE: { value: 80000, description: "Example improvement value add" },
                MARKET_PEAK_GROWTH: { value: 1.12, description: "12% growth to market peak assumption" },
                MARKET_PEAK_YEARS: { value: 3.5, description: "3.5 years to market peak estimation" }
            },

            ALTERNATIVE_INVESTMENT_ASSUMPTIONS: {
                SHARE_MARKET_RETURN: { value: 0.07, description: "7% average return in diversified share portfolio" },
                ALTERNATIVE_INVESTMENT_THRESHOLD: { value: 1.2, description: "20% better returns threshold for sell recommendation" }
            },

            AFFORDABILITY_THRESHOLDS: {
                CASH_FLOW_MANAGEABLE_RATIO: { value: 0.1, description: "Cash flow should be <10% of available capital annually" }
            }
        },

        // ===== PERSONA INTELLIGENCE CONSTANTS =====
        personaIntelligence: {
            _category: "Persona-Based Intelligence Parameters",
            _description: "Constants for persona detection and recommendation scoring",
            _source: "Financial planning research and behavioral finance",

            PERSONA_SCORING: {
                AGE_SCORE_WEIGHT: { value: 25, description: "Weight for age criteria matching" },
                INCOME_SCORE_WEIGHT: { value: 20, description: "Weight for income criteria matching" },
                SUPER_SCORE_WEIGHT: { value: 15, description: "Weight for super criteria matching" },
                NET_WORTH_SCORE_WEIGHT: { value: 15, description: "Weight for net worth criteria matching" },
                RETIREMENT_SCORE_WEIGHT: { value: 15, description: "Weight for retirement timeline criteria" },
                DEPENDENTS_SCORE_WEIGHT: { value: 20, description: "Weight for dependents criteria matching" },
                PROPERTY_SCORE_WEIGHT: { value: 20, description: "Weight for property ownership criteria" },
                PROPERTY_VALUE_BONUS: { value: 10, description: "Bonus for meeting property value criteria" }
            },

            RECOMMENDATION_THRESHOLDS: {
                HIGH_INCOME_SUPER_THRESHOLD: { value: 90000, description: "High income threshold for super optimization" },
                SUPER_PERCENTAGE_THRESHOLD: { value: 0.6, description: "Super as % of assets threshold (60%)" },
                POTENTIAL_CONTRIBUTION_PERCENTAGE: { value: 0.1, description: "10% of income as potential super contribution" },
                MAX_CONCESSIONAL_CONTRIBUTION: { value: 30000, description: "Maximum concessional super contribution limit (2024-25 onwards, indexed from $27,500)" },
                HIGH_MARGINAL_TAX_THRESHOLD: { value: 0.3, description: "30% marginal tax rate threshold" },
                TAX_SAVING_PERCENTAGE: { value: 0.05, description: "5% potential tax savings calculation" },
                LIFE_INSURANCE_MULTIPLIER: { value: 8, description: "8x annual income for life insurance recommendation" },
                EMERGENCY_FUND_MONTHS: { value: 6, description: "6 months expenses for emergency fund" },
                EMERGENCY_FUND_BASE_AMOUNT: { value: 5000, description: "Base amount for emergency fund calculation" }
            },

            INVESTMENT_STRATEGY_THRESHOLDS: {
                LONG_TIME_HORIZON: { value: 15, description: "15+ years considered long-term investment horizon" },
                HIGH_RISK_CAPACITY: { value: 60, description: "Risk capacity score threshold for aggressive allocation" },
                AGGRESSIVE_EQUITY_ALLOCATION: { value: 80, description: "80-90% equity for aggressive investors" },
                SUCCESS_RATE_IMPROVEMENT_THRESHOLD: { value: 0.8, description: "80% success rate target" },
                RETIREMENT_RISK_REDUCTION_HORIZON: { value: 10, description: "Start risk reduction 10 years before retirement" }
            },

            PRIORITY_SCORING: {
                HIGH_PRIORITY_SCORE: { value: 100, description: "Base score for high priority recommendations" },
                MEDIUM_PRIORITY_SCORE: { value: 60, description: "Base score for medium priority recommendations" },
                LOW_PRIORITY_SCORE: { value: 30, description: "Base score for low priority recommendations" },
                IMMEDIATE_TIMEFRAME_BONUS: { value: 50, description: "Bonus for immediate action items" },
                NEXT_REVIEW_TIMEFRAME_BONUS: { value: 30, description: "Bonus for next review items" },
                SIX_MONTH_TIMEFRAME_BONUS: { value: 20, description: "Bonus for 6-month timeframe items" },
                GRADUAL_TIMEFRAME_BONUS: { value: 10, description: "Bonus for gradual implementation items" },
                EASY_DIFFICULTY_BONUS: { value: 20, description: "Bonus for easy implementation" },
                MODERATE_DIFFICULTY_BONUS: { value: 10, description: "Bonus for moderate difficulty" },
                COMPLEX_DIFFICULTY_BONUS: { value: 5, description: "Bonus for complex implementation" },
                PERSONA_RELEVANCE_BONUS: { value: 25, description: "Bonus for persona-relevant recommendations" }
            },

            TAX_CALCULATIONS: {
                SUPER_TAX_RATE: { value: 0.15, description: "15% super contributions tax rate" },
                TOP_MARGINAL_TAX_RATE: { value: 0.45, description: "45% top marginal tax rate fallback" }
            }
        },

        // ===== HOUSING STRATEGY CONFIGURATION =====
        housingStrategy: {
            _category: "Housing Strategy Parameters",
            _description: "Configuration for downsizing, reverse mortgages, aged care, and granny flat analysis",
            _lastUpdated: "2025-10-01",

            downsizing: {
                TYPICAL_REDUCTION: {
                    value: 0.35,
                    description: "35% typical reduction in home value when downsizing"
                },
                TRANSACTION_COSTS: {
                    value: 0.05,
                    description: "5% total transaction costs (agent fees, stamp duty, moving, legal)"
                },
                DOWNSIZER_LIMIT_SINGLE: {
                    value: 300000,
                    description: "Maximum downsizer contribution to super for singles"
                },
                DOWNSIZER_LIMIT_COUPLE: {
                    value: 600000,
                    description: "Maximum downsizer contribution to super for couples (combined)"
                },
                SUPER_GROWTH_RATE: {
                    value: 0.07,
                    description: "Assumed super growth rate for projections (7% p.a.)"
                },
                INVESTMENT_GROWTH_RATE: {
                    value: 0.065,
                    description: "Assumed investment growth rate outside super (6.5% p.a.)"
                },
                CASH_GROWTH_RATE: {
                    value: 0.025,
                    description: "Assumed cash growth rate (2.5% p.a.)"
                }
            },

            reverseMortgage: {
                COMMERCIAL_RATE: {
                    value: 0.065,
                    description: "Typical commercial reverse mortgage rate (6.5% p.a.)"
                },
                HEAS_RATE: {
                    value: 0.0485,
                    description: "Government HEAS rate (4.85% - bond rate + margin)"
                },
                TYPICAL_LOAN_PERCENT: {
                    value: 0.20,
                    description: "Typical starting loan as percentage of home value (20%)"
                },
                PROPERTY_GROWTH_RATE: {
                    value: 0.03,
                    description: "Assumed property value growth for projections (3% p.a.)"
                },
                MINIMUM_AGE: {
                    value: 60,
                    description: "Minimum age for reverse mortgage eligibility"
                }
            },

            agedCare: {
                MPIR_RATE: {
                    value: 0.0761,
                    description: "Maximum Permissible Interest Rate (Oct 2025) - updated quarterly"
                },
                TYPICAL_RAD: {
                    value: 500000,
                    description: "Typical/median RAD amount Australia-wide"
                },
                RAD_BY_CITY: {
                    sydney: { value: 750000, description: "Typical RAD in Sydney" },
                    melbourne: { value: 650000, description: "Typical RAD in Melbourne" },
                    brisbane: { value: 500000, description: "Typical RAD in Brisbane" },
                    perth: { value: 450000, description: "Typical RAD in Perth" },
                    adelaide: { value: 420000, description: "Typical RAD in Adelaide" },
                    regional: { value: 350000, description: "Typical RAD in regional areas" }
                },
                AVERAGE_STAY_YEARS: {
                    value: 2.5,
                    description: "Average length of stay in aged care (years)"
                },
                INVESTMENT_RETURN: {
                    value: 0.065,
                    description: "Expected investment return for RAD vs DAP comparison (6.5% p.a.)"
                },
                TAX_DRAG: {
                    value: 0.15,
                    description: "Assumed tax on investment returns (15%)"
                }
            },

            grannyFlat: {
                TYPICAL_TRANSFER_PERCENT: {
                    value: 0.30,
                    description: "Typical asset transfer as percentage of home value (30%)"
                },
                LOOKBACK_PERIOD_YEARS: {
                    value: 5,
                    description: "Age Pension gifting lookback period (5 years)"
                },
                LEGAL_COSTS_MIN: {
                    value: 3000,
                    description: "Minimum legal costs to structure properly"
                },
                LEGAL_COSTS_MAX: {
                    value: 10000,
                    description: "Maximum legal costs for complex arrangements"
                }
            }
        }
    }
};

export default ENHANCED_CONFIG;
