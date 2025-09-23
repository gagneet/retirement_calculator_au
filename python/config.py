# config.py - Enhanced Australian Retirement Calculator Configuration
# All Australian-specific constants, rules, and default values

ENHANCED_CONFIG = {
    # Core Australian system constants
    "SUPER_GUARANTEE_RATE": 0.12,
    "DEMING_THRESHOLD": 106200,
    "SINGLE_PENSION_MAX": 28000,
    "SINGLE_ASSET_THRESHOLD": 301750,
    "SINGLE_ASSET_LIMIT": 686500,
    "SINGLE_INCOME_THRESHOLD": 212,
    "HOME_EQUITY_ACCESS_RATE": 0.7,
    "CGT_DISCOUNT": 0.5,
    "FRANKING_CREDIT_RATE": 0.3,

    # Enhanced healthcare and aged care costs (2024 values)
    "HEALTHCARE_COSTS": {
        "home_package4": 56000,
        "residential": 76000,
        "premium": 120000,
        "current_average": 5200
    },

    # Investment property constants
    "PROPERTY_COSTS": {
        "SELLING_COSTS_PERCENT": 0.06,
        "STAMP_DUTY_THRESHOLD": 600000,
        "DEPRECIATION_RATE": 0.025,
        "MAINTENANCE_PERCENT": 0.01,
        "VACANCY_RATE": 0.04
    },

    # Risk profiling thresholds
    "RISK_THRESHOLDS": {
        "capacity": {
            "low": 30,
            "moderate": 60,
            "high": 80
        },
        "tolerance": {
            "conservative": 30,
            "balanced": 60,
            "aggressive": 80
        }
    },

    # Asset allocation glide path rules
    "GLIDE_PATH_RULES": {
        "120minus": "glide_path_120_minus_age",
        "110minus": "glide_path_110_minus_age",
        "100minus": "glide_path_100_minus_age"
    },

    # Australian tax brackets (2024-25)
    "TAX_BRACKETS": [
        { "min": 0, "max": 18200, "rate": 0 },
        { "min": 18201, "max": 45000, "rate": 0.16 },
        { "min": 45001, "max": 135000, "rate": 0.3 },
        { "min": 135001, "max": 190000, "rate": 0.37 },
        { "min": 190001, "max": float('inf'), "rate": 0.45 }
    ],

    # Healthcare inflation rates by condition
    "HEALTHCARE_INFLATION": {
        "none": 4.5,
        "minor": 4.75,
        "moderate": 6.0,
        "major": 9.0
    },

    # Historical Australian market patterns and volatility modeling
    "MARKET_REGIMES": {
        # Interest rate environments based on historical RBA patterns
        "interestRateRegimes": [
            { "name": "COVID Ultra-Low", "cashRate": 0.001, "duration": 2, "probability": 0.05, "period": "2020-2022" },
            { "name": "Low Rate", "cashRate": 0.02, "duration": 3, "probability": 0.15, "period": "2008-2020" },
            { "name": "Normal", "cashRate": 0.045, "duration": 5, "probability": 0.50, "period": "2000-2007" },
            { "name": "High Rate", "cashRate": 0.065, "duration": 3, "probability": 0.25, "period": "1980-2000" },
            { "name": "Crisis High", "cashRate": 0.085, "duration": 2, "probability": 0.05, "period": "1990s recession" }
        ],

        # Property cycles based on Australian historical patterns (7-year cycles)
        "propertyCycles": [
            { "phase": "Boom", "yearsInCycle": [1, 2], "baseReturn": 0.12, "volatility": 0.08, "probability": 0.20 },
            { "phase": "Peak", "yearsInCycle": [3], "baseReturn": 0.08, "volatility": 0.12, "probability": 0.10 },
            { "phase": "Decline", "yearsInCycle": [4, 5], "baseReturn": -0.05, "volatility": 0.15, "probability": 0.25 },
            { "phase": "Trough", "yearsInCycle": [6], "baseReturn": -0.02, "volatility": 0.10, "probability": 0.15 },
            { "phase": "Recovery", "yearsInCycle": [7, 1], "baseReturn": 0.06, "volatility": 0.08, "probability": 0.30 }
        ],

        # ASX market volatility patterns
        "equityMarketRegimes": [
            { "name": "Bull Market", "baseReturn": 0.10, "volatility": 0.12, "duration": 5, "probability": 0.35 },
            { "name": "Normal Market", "baseReturn": 0.07, "volatility": 0.15, "duration": 3, "probability": 0.40 },
            { "name": "Volatile Market", "baseReturn": 0.05, "volatility": 0.25, "duration": 2, "probability": 0.15 },
            { "name": "Bear Market", "baseReturn": -0.15, "volatility": 0.35, "duration": 1, "probability": 0.10 }
        ]
    },

    # Enhanced stress test scenarios based on Australian historical events
    "STRESS_SCENARIOS": [
        {
            "name": "COVID-19 Style Crash & Recovery",
            "year1": { "equityReturn": -0.35, "bondReturn": 0.08, "propertyReturn": 0.15, "cashRate": 0.001 },
            "year2": { "equityReturn": 0.25, "bondReturn": 0.02, "propertyReturn": 0.20, "cashRate": 0.001 },
            "duration": 2,
            "probability": 0.05,
            "description": "35% equity fall followed by rapid recovery, property boom, ultra-low rates"
        },
        {
            "name": "Global Financial Crisis",
            "year1": { "equityReturn": -0.40, "bondReturn": 0.10, "propertyReturn": -0.05, "cashRate": 0.02 },
            "year2": { "equityReturn": -0.20, "bondReturn": 0.08, "propertyReturn": -0.10, "cashRate": 0.015 },
            "duration": 2,
            "probability": 0.08,
            "description": "Severe market crash with modest property decline"
        },
        {
            "name": "Property Market Correction",
            "equityReturn": -0.05,
            "bondReturn": 0.02,
            "propertyReturn": -0.15,
            "duration": 3,
            "probability": 0.15,
            "description": "Major property price correction as seen 2022-2024"
        },
        {
            "name": "Mining Boom End",
            "equityReturn": -0.10,
            "bondReturn": 0.03,
            "propertyReturn": -0.25,
            "duration": 4,
            "probability": 0.10,
            "description": "End of commodity cycle affecting property and equities"
        },
        {
            "name": "Interest Rate Shock",
            "equityReturn": -0.15,
            "bondReturn": -0.20,
            "propertyReturn": -0.10,
            "cashReturn": 0.085,
            "duration": 1,
            "probability": 0.15,
            "description": "Rapid rate rise cycle like 2022-2023"
        },
        {
            "name": "Healthcare Crisis",
            "healthcareCostMultiplier": 2.5,
            "duration": 5,
            "probability": 0.20,
            "description": "Pandemic-style healthcare cost explosion"
        }
    ],

    # Default values for new users
    "DEFAULTS": {
        "personal": {
            "yourCurrentAge": 45,
            "partnerCurrentAge": 40,
            "retirementAge": 68,
            "partnerRetirementAge": 68,
            "yourLifespan": 95,
            "partnerLifespan": 99
        },
        "financial": {
            "yourSalary": 140000,
            "partnerSalary": 45000,
            "yourCurrentSuper": 200000,
            "partnerCurrentSuper": 190000,
            "currentSavings": 25000,
            "currentStocks": 15000,
            "monthlyStockContribution": 500,
            "percentIncomeSaved": 10
        },
        "property": {
            "homeValue": 1100000,
            "mortgageBalance": 900000,
            "mortgageRate": 0.0537,
            "monthlyMortgagePayment": 4100,
            "planToDownsize": True,
            "hasInvestmentProperty": False,
            "investmentPropertyValue": 550000,
            "investmentPropertyLoan": 400000,
            "investmentPropertyRate": 0.062,
            "weeklyRentalIncome": 550,
            "annualPropertyExpenses": 8000,
            "propertyGrowthRate": 4.5,
            "sellPropertyYears": 15,
            "capitalGainsTaxRate": 22.5
        },
        "healthcare": {
            "currentHealthcareCosts": 5200,
            "healthcareInflation": 4.5,
            "hasPrivateHealth": "comprehensive",
            "chronicConditions": "none",
            "agedCareProbability": 68,
            "agedCareStartAge": 88,
            "agedCareDuration": 7.5,
            "agedCareAnnualCost": 76000
        },
        "economic": {
            "inflation": 2.87,
            "investmentReturn": 5.61,
            "returnDeclineRate": 0.03,
            "savingsReturn": 1.4,
            "superReturn": 8.75,
            "salaryGrowthRate": 1.5
        },
        "allocation": {
            "useGlidePath": True,
            "glidePathRule": "110minus",
            "frankingCreditBenefit": 1.2,
            "australianEquityAllocation": 40
        },
        "risk": {
            "riskTolerance": 6,
            "hasEmergencyFund": "partial",
            "hasDebt": "minimal",
            "dependents": 0
        },
        "simulation": {
            "numRuns": 5000,
            "returnVolatility": 12,
            "enableShocks": False,
            "shockProbability": 5,
            "shockMagnitude": -25
        },
        "pension": {
            "asfaComfortable": 73875,
            "agePensionMax": 45037,
            "pensionAssetThreshold": 470000,
            "pensionAssetLimit": 1031000,
            "pensionIncomeThreshold": 372
        }
    },

    # Validation rules
    "VALIDATION": {
        "age": { "min": 18, "max": 120 },
        "salary": { "min": 0, "max": 1000000 },
        "percentage": { "min": 0, "max": 100 },
        "currency": { "min": 0, "max": 10000000 },
        "years": { "min": 0.5, "max": 65 },
        "runs": { "min": 1000, "max": 10000 }
    },

    # Asset allocation presets
    "ALLOCATION_PRESETS": {
        "conservative": { "equity": 30, "bonds": 50, "cash": 20 },
        "balanced": { "equity": 60, "bonds": 30, "cash": 10 },
        "growth": { "equity": 80, "bonds": 15, "cash": 5 },
        "aggressive": { "equity": 90, "bonds": 8, "cash": 2 }
    },

    # Behavioral nudge settings
    "BEHAVIORAL_NUDGES": {
        "autoRebalanceThreshold": 0.05,
        "contributionEscalationCap": 0.03,
        "defaultParticipation": True,
        "lossFramingThreshold": 0.1
    },

    # Constants used in calculations
    "CALCULATION_CONSTANTS": {
        "RISK_REQUIREMENT_ASSET_TARGET_MULTIPLIER": 25,
        "RISK_REQUIREMENT_RISK_FREE_RATE": 0.02,
        "RISK_REQUIREMENT_SENSITIVITY_FACTOR": 5,
        "RATE_ADJUSTMENT_FACTOR": 0.5,
        "BASELINE_RATE": 0.045,
        "LOAN_PAYMENT_HEURISTIC_MULTIPLIER": 1.5
    },

    # Franking credit calculations for Australian equities
    "FRANKING_CREDITS": {
        "CORPORATE_TAX_RATE": 0.30,
        "TYPICAL_FRANKING_RATE": 0.75,  # 75% of dividends are typically franked
        "AVERAGE_DIVIDEND_YIELD": 0.045  # 4.5% average dividend yield
    },

    # Advanced simulation parameters
    "SIMULATION_PARAMETERS": {
        "MIN_MONTE_CARLO_RUNS": 1000,
        "MAX_MONTE_CARLO_RUNS": 100000,
        "DEFAULT_MONTE_CARLO_RUNS": 5000,
        "CONFIDENCE_LEVELS": [0.1, 0.25, 0.5, 0.75, 0.9],
        "CHUNK_SIZE": 1000  # For processing large simulations
    },

    # Enhanced healthcare modeling
    "HEALTHCARE_MODELING": {
        "BASE_INFLATION_ADJUSTMENT": 1.65,  # Healthcare inflates 1.65x faster than general
        "CHRONIC_CONDITION_MULTIPLIERS": {
            "none": 1.0,
            "minor": 1.2,
            "moderate": 1.8,
            "major": 2.5
        },
        "PRIVATE_HEALTH_BENEFITS": {
            "none": 0.0,
            "basic": 0.15,
            "comprehensive": 0.35
        }
    },

    # Advanced analysis features
    "ANALYSIS_FEATURES": {
        "ENABLE_AI_RECOMMENDATIONS": True,
        "ENABLE_OPTIMIZATION_SUGGESTIONS": True,
        "ENABLE_SCENARIO_ANALYSIS": True,
        "ENABLE_STRESS_TESTING": True,
        "ENABLE_SENSITIVITY_ANALYSIS": True,
        "RECOMMENDATION_CATEGORIES": [
            "Risk Management",
            "Asset Allocation",
            "Property Strategy",
            "Retirement Timing",
            "Savings Strategy",
            "Tax Optimization",
            "Healthcare Planning",
            "Estate Planning"
        ]
    }
}
