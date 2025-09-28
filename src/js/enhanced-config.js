// enhanced-config.js - Centralized Configuration with Admin Interface Support
// ALL financial constants, assumptions, and configurable values in one place
// Last Updated: 2025-01-15 | Source: Australian Government, ABS, RBA data

export const ENHANCED_FINANCIAL_CONFIG = {
    // ===== METADATA FOR ADMIN INTERFACE =====
    _metadata: {
        version: "1.0.0",
        lastUpdated: "2025-01-15",
        sources: ["ABS", "RBA", "ASIC", "APRA", "Australian Government"],
        nextReviewDate: "2025-07-15",
        autoUpdateEnabled: false
    },

    // ===== AUSTRALIAN FINANCIAL SYSTEM CONSTANTS =====
    australianSystem: {
        _category: "Australian Financial System",
        _description: "Core constants from Australian government and financial system",
        _lastResearched: "2025-01-15",
        _sources: ["Australian Government", "ATO", "Services Australia"],

        SUPER_GUARANTEE_RATE: {
            value: 0.12,
            description: "Current superannuation guarantee rate",
            source: "ATO",
            lastUpdated: "2025-01-15",
            nextReview: "2025-07-01",
            isGovernmentSet: true
        },
        CORPORATE_TAX_RATE: {
            value: 0.30,
            description: "Australian corporate tax rate",
            source: "ATO",
            lastUpdated: "2025-01-15",
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

    // ===== TAXATION SYSTEM =====
    taxation: {
        _category: "Australian Taxation System",
        _description: "Tax rates, thresholds and rules from ATO",
        _lastResearched: "2025-01-15",
        _sources: ["ATO"],

        DIVISION_293_THRESHOLD: {
            value: 250000,
            description: "Salary threshold for Division 293 additional super tax",
            source: "ATO",
            lastUpdated: "2025-01-15",
            isGovernmentSet: true
        },
        DIVISION_293_TAX_RATE: {
            value: 0.15,
            description: "Additional tax rate on super contributions over threshold",
            source: "ATO",
            lastUpdated: "2025-01-15",
            isGovernmentSet: true
        }
    },

    // ===== GOVERNMENT DATA & THRESHOLDS =====
    governmentData: {
        _category: "Government Data & Thresholds",
        _description: "Key rates and thresholds from ATO, Services Australia, etc.",
        _lastResearched: "2025-01-15",
        _sources: ["ATO", "Services Australia", "Department of Health"],

        ATO_TAX_BRACKETS_2025: {
            _description: "Income tax brackets for 2025-26",
            brackets: [
                { limit: 18200, rate: 0 },
                { limit: 45000, rate: 0.19 },
                { limit: 120000, rate: 0.30 },
                { limit: 180000, rate: 0.37 },
                { limit: Infinity, rate: 0.45 }
            ],
            source: "ATO",
            isGovernmentSet: true
        },

        CENTRELINK_DEEMING_RATES_2025: {
            _description: "Asset deeming rates for Age Pension income test for 2025-26",
            lower_threshold_single: { value: 60400 },
            lower_threshold_couple: { value: 100200 },
            lower_rate: { value: 0.0025 },
            upper_rate: { value: 0.0225 },
            source: "Services Australia",
            isGovernmentSet: true
        },

        WORK_BONUS: {
            _description: "Centrelink Work Bonus rules",
            max_accrual: { value: 11800 },
            fortnightly_income_exemption: { value: 300 },
            source: "Services Australia",
            isGovernmentSet: true
        },

        RENT_ASSISTANCE_RATES_2025: {
            _description: "Maximum fortnightly rent assistance rates",
            single_max_rate: { value: 188.20 },
            couple_max_rate: { value: 177.20 },
            source: "Services Australia",
            isGovernmentSet: true
        },

        COMMONWEALTH_SENIORS_HEALTH_CARD_THRESHOLDS_2025: {
            _description: "Income test thresholds for CSHC",
            single_threshold: { value: 95400 },
            couple_threshold: { value: 152640 },
            source: "Services Australia",
            isGovernmentSet: true
        },

        PBS_SAFETY_NET_THRESHOLDS_2025: {
            _description: "Pharmaceutical Benefits Scheme (PBS) Safety Net thresholds",
            general: { value: 1647.90 },
            concession: { value: 277.20 },
            source: "Department of Health",
            isGovernmentSet: true
        },

        AGED_CARE_MEANS_TEST_2025: {
             _description: "Key figures for aged care means testing (DAP/DAC)",
            income_free_area_single: { value: 32819.80 },
            income_free_area_couple_each: { value: 32319.80 },
            asset_free_area: { value: 59500 },
            first_asset_threshold: { value: 201231.20 },
            source: "My Aged Care",
            isGovernmentSet: true
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
                currency: "AUD"
            },
            SINGLE_BASE: {
                value: 2835,
                description: "Monthly living expenses for single person (ABS 2025)",
                source: "ABS Household Expenditure Survey"
            },
            PER_CHILD: {
                value: 630,
                description: "Additional monthly cost per child (ABS 2025)",
                source: "ABS Household Expenditure Survey"
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
    }
};

// Re-export for convenience
export default ENHANCED_FINANCIAL_CONFIG;
export const CONFIG = ENHANCED_FINANCIAL_CONFIG;