# python/config.py - Enhanced Australian Retirement Calculator Configuration
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
        "residential": 75000,
        "premium": 120000,
        "current_average": 3500
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
    # Asset allocation glide path rules - maps rule name to a function name in utils.py
    "GLIDE_PATH_RULES": {
        "120minus": "glide_path_120_minus_age",
        "110minus": "glide_path_110_minus_age",
        "100minus": "glide_path_100_minus_age"
    },
    
    # Australian tax brackets (2024-25)
    "TAX_BRACKETS": [
        { "min": 0, "max": 18200, "rate": 0 },
        { "min": 18200, "max": 45000, "rate": 0.19 },
        { "min": 45000, "max": 120000, "rate": 0.325 },
        { "min": 120000, "max": 180000, "rate": 0.37 },
        { "min": 180000, "max": float('inf'), "rate": 0.45 }
    ],
    
    # Healthcare inflation rates by condition
    "HEALTHCARE_INFLATION": {
        "none": 6.0,
        "minor": 6.5,
        "moderate": 7.0,
        "major": 8.0
    },
    
    # Stress test scenarios
    "STRESS_SCENARIOS": [
        {
            "name": "Market Crash (GFC-style)",
            "equityReturn": -0.4,
            "bondReturn": 0.1,
            "propertyReturn": -0.15,
            "duration": 2,
            "probability": 0.1
        },
        {
            "name": "Property Market Crash",
            "equityReturn": -0.1,
            "bondReturn": 0.02,
            "propertyReturn": -0.3,
            "duration": 3,
            "probability": 0.05
        },
        {
            "name": "Stagflation Period",
            "equityReturn": -0.1,
            "bondReturn": -0.05,
            "propertyReturn": 0.02,
            "inflation": 0.08,
            "duration": 3,
            "probability": 0.05
        },
        {
            "name": "Interest Rate Shock",
            "equityReturn": -0.15,
            "bondReturn": -0.2,
            "propertyReturn": -0.1,
            "cashReturn": 0.08,
            "duration": 1,
            "probability": 0.15
        },
        {
            "name": "Healthcare Crisis",
            "healthcareCostMultiplier": 2.5,
            "duration": 5,
            "probability": 0.2
        }
    ],
    
    # Default values for new users
    "DEFAULTS": {
        "personal": {
            "yourCurrentAge": 45,
            "partnerCurrentAge": 43,
            "retirementAge": 65,
            "partnerRetirementAge": 65,
            "yourLifespan": 90,
            "partnerLifespan": 92
        },
        "financial": {
            "yourSalary": 85000,
            "partnerSalary": 65000,
            "currentSuper": 150000,
            "currentSavings": 25000,
            "currentStocks": 15000,
            "monthlyStockContribution": 500,
            "percentIncomeSaved": 10
        },
        "property": {
            "homeValue": 750000,
            "mortgageBalance": 400000,
            "mortgageRate": 0.055,
            "monthlyMortgagePayment": 2800,
            "planToDownsize": False,
            "hasInvestmentProperty": False,
            "investmentPropertyValue": 550000,
            "investmentPropertyLoan": 400000,
            "investmentPropertyRate": 0.062,
            "weeklyRentalIncome": 550,
            "annualPropertyExpenses": 8000,
            "propertyGrowthRate": 0.045,
            "sellPropertyYears": 15,
            "capitalGainsTaxRate": 0.225
        },
        "healthcare": {
            "currentHealthcareCosts": 3500,
            "healthcareInflation": 6.5,
            "hasPrivateHealth": "comprehensive",
            "chronicConditions": "none",
            "agedCareProbability": 65,
            "agedCareStartAge": 85,
            "agedCareDuration": 3.5,
            "agedCareAnnualCost": 75000
        },
        "economic": {
            "inflation": 0.0287,
            "investmentReturn": 0.0561,
            "returnDeclineRate": 0.03,
            "savingsReturn": 0.014,
            "superReturn": 0.0875,
            "salaryGrowthRate": 1.5,
            "leanYearsStart": 5,
            "leanYearsReduction": 25
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
            "returnVolatility": 0.12,
            "enableShocks": False,
            "shockProbability": 0.05,
            "shockMagnitude": -0.25
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
        "age": { "min": 18, "max": 100 },
        "salary": { "min": 0, "max": 1000000 },
        "percentage": { "min": 0, "max": 100 },
        "currency": { "min": 0, "max": 10000000 },
        "years": { "min": 0.5, "max": 50 },
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
        "RISK_REQUIREMENT_SENSITIVITY_FACTOR": 5
    }
}
