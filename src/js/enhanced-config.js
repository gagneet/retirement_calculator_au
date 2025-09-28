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
    },

    // ===== QUICK WINS CONFIGURATION =====
    quickWins: {
        _category: "Quick Wins Prioritization System",
        _description: "Configuration for identifying and scoring quick win opportunities",

        SCORING_WEIGHTS: {
            TIME_TO_IMPLEMENT: {
                value: 0.40,
                description: "Weight for time to implement factor in Quick Win scoring"
            },
            FINANCIAL_IMPACT: {
                value: 0.30,
                description: "Weight for financial impact factor in Quick Win scoring"
            },
            IMPLEMENTATION_DIFFICULTY: {
                value: 0.20,
                description: "Weight for implementation difficulty factor in Quick Win scoring"
            },
            CONFIDENCE_LEVEL: {
                value: 0.10,
                description: "Weight for confidence level factor in Quick Win scoring"
            }
        },

        TIME_THRESHOLDS: {
            SAME_DAY: {
                value: 30,
                description: "Days threshold for same-day implementation (2 bonus points)",
                unit: "days"
            },
            WITHIN_WEEK: {
                value: 180,
                description: "Days threshold for within-week implementation (1.5 bonus points)",
                unit: "days"
            },
            WITHIN_MONTH: {
                value: 365,
                description: "Days threshold for within-month implementation (1 bonus point)",
                unit: "days"
            }
        },

        IMPACT_THRESHOLDS: {
            HIGH_IMPACT: {
                value: 50000,
                description: "Dollar amount threshold for high impact classification",
                unit: "AUD"
            },
            MEDIUM_IMPACT: {
                value: 20000,
                description: "Dollar amount threshold for medium impact classification",
                unit: "AUD"
            },
            LOW_IMPACT: {
                value: 5000,
                description: "Dollar amount threshold for low impact classification",
                unit: "AUD"
            }
        },

        QUICK_WIN_THRESHOLD: {
            value: 7.0,
            description: "Minimum score (out of 10) to qualify as a Quick Win",
            unit: "score"
        },

        CATEGORY_BONUSES: {
            TAX_SUPER: {
                value: 0.3,
                description: "Bonus points for tax and superannuation optimizations"
            },
            INVESTMENT_OPTIMIZATION: {
                value: 0.2,
                description: "Bonus points for investment optimization strategies"
            },
            DEBT_MANAGEMENT: {
                value: 0.4,
                description: "Bonus points for debt management strategies"
            }
        },

        ESTIMATES: {
            EMPLOYER_SUPER_GAP_MULTIPLIER: {
                value: 1.0,
                description: "Multiplier for calculating employer super contribution gaps"
            },
            TAX_SAVINGS_MULTIPLIER: {
                value: 0.2,
                description: "Multiplier for estimating tax savings from concessional contributions"
            },
            DEBT_ELIMINATION_ESTIMATE: {
                value: 25000,
                description: "Estimated value for high-interest debt elimination benefit",
                unit: "AUD"
            },
            EMERGENCY_FUND_VALUE: {
                value: 15000,
                description: "Estimated risk mitigation value of establishing emergency fund",
                unit: "AUD"
            },
            FEE_AUDIT_SAVINGS: {
                value: 30000,
                description: "Estimated long-term savings from investment fee optimization",
                unit: "AUD"
            },
            TAX_LOCATION_SAVINGS: {
                value: 12000,
                description: "Estimated annual tax savings from optimized asset location",
                unit: "AUD"
            }
        }
    },

    // ===== SCENARIO ANALYSIS CONFIGURATION =====
    scenarioAnalysis: {
        _category: "Scenario Comparison Matrix System",
        _description: "Configuration for scenario generation and analysis",

        SIMULATION_PARAMETERS: {
            MONTE_CARLO_RUNS: {
                value: 1000,
                description: "Number of Monte Carlo simulation runs per scenario"
            },
            MAX_SCENARIOS: {
                value: 10,
                description: "Maximum number of scenarios to analyze for performance"
            }
        },

        SCORING_WEIGHTS: {
            SUCCESS_RATE_WEIGHT: {
                value: 50,
                description: "Weight for success rate improvement in scenario scoring"
            },
            BALANCE_IMPROVEMENT_WEIGHT: {
                value: 20,
                description: "Weight for balance improvement in scenario scoring"
            },
            RISK_REDUCTION_WEIGHT: {
                value: 15,
                description: "Weight for risk reduction in scenario scoring"
            },
            FEASIBILITY_WEIGHT: {
                value: 15,
                description: "Weight for implementation feasibility in scenario scoring"
            }
        },

        RISK_SCORE_WEIGHTS: {
            FAILURE_RATE: {
                value: 40,
                description: "Weight for failure rate in risk scoring"
            },
            OUTCOME_VOLATILITY: {
                value: 30,
                description: "Weight for outcome volatility in risk scoring"
            },
            SHORTFALL_MAGNITUDE: {
                value: 20,
                description: "Weight for shortfall magnitude in risk scoring"
            },
            SEQUENCE_RISK: {
                value: 10,
                description: "Weight for sequence of returns risk in risk scoring"
            }
        },

        OPPORTUNITY_SCORE_WEIGHTS: {
            SUCCESS_RATE: {
                value: 40,
                description: "Weight for success rate in opportunity scoring"
            },
            UPSIDE_POTENTIAL: {
                value: 30,
                description: "Weight for upside potential in opportunity scoring"
            },
            FINAL_BALANCE: {
                value: 20,
                description: "Weight for final balance in opportunity scoring"
            },
            PENSION_OPTIMIZATION: {
                value: 10,
                description: "Weight for age pension optimization in opportunity scoring"
            }
        },

        FEASIBILITY_PENALTIES: {
            RETIREMENT_AGE_CHANGE: {
                value: 2,
                description: "Penalty points per year of retirement age change"
            },
            SAVINGS_RATE_CHANGE: {
                value: 1.5,
                description: "Penalty points per percentage point of savings rate change"
            },
            MAJOR_CASH_REQUIREMENT: {
                value: 10,
                description: "Penalty for scenarios requiring major cash outlay"
            },
            PROPERTY_PURCHASE: {
                value: 15,
                description: "Penalty for scenarios requiring property purchase"
            },
            LIFESTYLE_CHANGE: {
                value: 8,
                description: "Penalty for scenarios requiring lifestyle changes"
            },
            ALLOCATION_CHANGE: {
                value: 5,
                description: "Penalty for significant asset allocation changes"
            }
        },

        AGE_BASED_SCENARIOS: {
            YOUNG_PROFESSIONAL_THRESHOLD: {
                value: 50,
                description: "Age threshold for young professional scenarios",
                unit: "years"
            },
            PRE_RETIREMENT_THRESHOLD: {
                value: 60,
                description: "Age threshold for pre-retirement scenarios",
                unit: "years"
            },
            HIGH_INCOME_THRESHOLD: {
                value: 180000,
                description: "Income threshold for high-income specific scenarios",
                unit: "AUD"
            }
        },

        SCENARIO_MODIFICATIONS: {
            AGGRESSIVE_EQUITY_ALLOCATION: {
                value: 80,
                description: "Equity percentage for aggressive growth scenarios",
                unit: "percent"
            },
            CONSERVATIVE_EQUITY_ALLOCATION: {
                value: 30,
                description: "Equity percentage for conservative scenarios",
                unit: "percent"
            },
            FIRE_SAVINGS_RATE: {
                value: 30,
                description: "Target savings rate for FIRE scenarios",
                unit: "percent"
            },
            HIGH_HEALTHCARE_INFLATION: {
                value: 8.0,
                description: "Healthcare inflation rate for stress scenarios",
                unit: "percent"
            },
            EXTENDED_LIFESPAN: {
                value: 95,
                description: "Extended lifespan for longevity risk scenarios",
                unit: "years"
            },
            MARKET_STRESS_RETURN_REDUCTION: {
                value: 0.02,
                description: "Return reduction for market stress scenarios",
                unit: "decimal"
            }
        }
    },

    // ===== CONTEXTUAL INTELLIGENCE CONFIGURATION =====
    contextualIntelligence: {
        _category: "Contextual Intelligence System",
        _description: "Smart guidance and personalization configuration",

        PERSONA_TRIGGERS: {
            HIGH_EARNER_THRESHOLD: {
                value: 150000,
                description: "Combined income threshold to trigger high earner persona",
                unit: "AUD"
            },
            BUSINESS_OWNER_THRESHOLD: {
                value: 100000,
                description: "Business asset threshold to trigger business owner persona",
                unit: "AUD"
            },
            PROPERTY_INVESTOR_THRESHOLD: {
                value: 1,
                description: "Number of investment properties to trigger investor persona",
                unit: "properties"
            },
            LATE_STARTER_AGE_THRESHOLD: {
                value: 50,
                description: "Age threshold to trigger late starter persona",
                unit: "years"
            },
            LOW_SUPER_THRESHOLD: {
                value: 100000,
                description: "Super balance threshold for late starter classification",
                unit: "AUD"
            }
        },

        CONFIDENCE_SCORING: {
            BASE_SCORE_PER_STEP: {
                value: 15,
                description: "Base confidence points awarded per completed onboarding step"
            },
            COMPLETE_PROFILE_BONUS: {
                value: 20,
                description: "Bonus points for completing full financial profile"
            },
            REALISTIC_GOALS_BONUS: {
                value: 10,
                description: "Bonus points for setting realistic retirement goals"
            },
            COMPREHENSIVE_PLANNING_BONUS: {
                value: 15,
                description: "Bonus points for comprehensive retirement planning approach"
            }
        },

        GUIDANCE_THRESHOLDS: {
            SUGGESTION_CONFIDENCE_THRESHOLD: {
                value: 70,
                description: "Minimum confidence score to show advanced suggestions"
            },
            SCENARIO_ANALYSIS_THRESHOLD: {
                value: 80,
                description: "Minimum confidence score to recommend scenario analysis"
            },
            BASIC_GUIDANCE_THRESHOLD: {
                value: 40,
                description: "Minimum confidence score for basic guidance display"
            }
        },

        ALERT_TRIGGERS: {
            LOW_SAVINGS_RATE: {
                value: 5,
                description: "Savings rate percentage below which to trigger savings alert",
                unit: "percent"
            },
            HIGH_DEBT_RATIO: {
                value: 0.3,
                description: "Debt to income ratio above which to trigger debt alert",
                unit: "ratio"
            },
            INSUFFICIENT_EMERGENCY_FUND: {
                value: 3,
                description: "Months of expenses below which to trigger emergency fund alert",
                unit: "months"
            },
            LATE_RETIREMENT_START: {
                value: 45,
                description: "Age above which to trigger retirement planning urgency alert",
                unit: "years"
            }
        }
    },

    // ===== CENTRELINK / SERVICES AUSTRALIA CALCULATIONS =====
    centrelink: {
        _category: "Centrelink Pension Calculations",
        _description: "Official rates and thresholds for Age Pension calculations",
        _lastResearched: "2025-01-15",
        _sources: ["Services Australia", "Australian Government"],

        pensionRates: {
            COUPLE: {
                MAX_PENSION_PER_YEAR: {
                    value: 45037,
                    description: "Maximum Age Pension per year for couple (combined)",
                    source: "Services Australia",
                    unit: "AUD"
                }
            },
            SINGLE: {
                MAX_PENSION_PER_YEAR: {
                    value: 28756,
                    description: "Maximum Age Pension per year for single person",
                    source: "Services Australia",
                    unit: "AUD"
                }
            }
        },

        assetTest: {
            COUPLE: {
                ASSET_FREE_AREA_HOMEOWNER: {
                    value: 470000,
                    description: "Asset free area for couple homeowners",
                    source: "Services Australia",
                    unit: "AUD"
                },
                ASSET_FREE_AREA_NON_HOMEOWNER: {
                    value: 693500,
                    description: "Asset free area for couple non-homeowners",
                    source: "Services Australia",
                    unit: "AUD"
                },
                ASSET_LIMIT_HOMEOWNER: {
                    value: 1031000,
                    description: "Asset limit for couple homeowners (no pension beyond this)",
                    source: "Services Australia",
                    unit: "AUD"
                },
                ASSET_LIMIT_NON_HOMEOWNER: {
                    value: 1254500,
                    description: "Asset limit for couple non-homeowners",
                    source: "Services Australia",
                    unit: "AUD"
                }
            },
            SINGLE: {
                ASSET_FREE_AREA_HOMEOWNER: {
                    value: 301750,
                    description: "Asset free area for single homeowner",
                    source: "Services Australia",
                    unit: "AUD"
                },
                ASSET_FREE_AREA_NON_HOMEOWNER: {
                    value: 525250,
                    description: "Asset free area for single non-homeowner",
                    source: "Services Australia",
                    unit: "AUD"
                },
                ASSET_LIMIT_HOMEOWNER: {
                    value: 686500,
                    description: "Asset limit for single homeowner",
                    source: "Services Australia",
                    unit: "AUD"
                },
                ASSET_LIMIT_NON_HOMEOWNER: {
                    value: 910000,
                    description: "Asset limit for single non-homeowner",
                    source: "Services Australia",
                    unit: "AUD"
                }
            }
        },

        incomeTest: {
            COUPLE: {
                INCOME_FREE_AREA_PER_YEAR: {
                    value: 372,
                    description: "Income free area per year for couple (combined)",
                    source: "Services Australia",
                    unit: "AUD"
                }
            },
            SINGLE: {
                INCOME_FREE_AREA_PER_YEAR: {
                    value: 212,
                    description: "Income free area per year for single person",
                    source: "Services Australia",
                    unit: "AUD"
                }
            }
        },

        workBonus: {
            UPFRONT_CREDIT: {
                value: 4000,
                description: "Upfront work bonus credit",
                source: "Services Australia",
                unit: "AUD"
            },
            ACCRUAL_PER_YEAR: {
                value: 300,
                description: "Annual work bonus accrual",
                source: "Services Australia",
                unit: "AUD"
            }
        },

        deemingRates: {
            COUPLE_LOWER_THRESHOLD: {
                value: 102000,
                description: "Lower deeming threshold for couple (combined)",
                source: "Services Australia",
                unit: "AUD"
            },
            SINGLE_LOWER_THRESHOLD: {
                value: 68000,
                description: "Lower deeming threshold for single person",
                source: "Services Australia",
                unit: "AUD"
            },
            LOWER_RATE: {
                value: 0.0225,
                description: "Lower deeming rate (2.25%)",
                source: "Services Australia",
                unit: "rate"
            },
            UPPER_RATE: {
                value: 0.0475,
                description: "Upper deeming rate (4.75%)",
                source: "Services Australia",
                unit: "rate"
            }
        },

        rentAssistance: {
            COUPLE: {
                THRESHOLD: {
                    value: 150,
                    description: "Minimum rent threshold for couple to receive assistance",
                    source: "Services Australia",
                    unit: "AUD per week"
                },
                MAX_ASSISTANCE: {
                    value: 169,
                    description: "Maximum rent assistance for couple per week",
                    source: "Services Australia",
                    unit: "AUD per week"
                }
            },
            SINGLE: {
                THRESHOLD: {
                    value: 126,
                    description: "Minimum rent threshold for single person",
                    source: "Services Australia",
                    unit: "AUD per week"
                },
                MAX_ASSISTANCE: {
                    value: 169,
                    description: "Maximum rent assistance for single person per week",
                    source: "Services Australia",
                    unit: "AUD per week"
                }
            }
        },

        cshc: {
            COUPLE_INCOME_THRESHOLD: {
                value: 100000,
                description: "Income threshold for Commonwealth Seniors Health Card (couple)",
                source: "Services Australia",
                unit: "AUD per year"
            },
            SINGLE_INCOME_THRESHOLD: {
                value: 61284,
                description: "Income threshold for Commonwealth Seniors Health Card (single)",
                source: "Services Australia",
                unit: "AUD per year"
            }
        }
    }
};

// Re-export for convenience
export default ENHANCED_FINANCIAL_CONFIG;
export const CONFIG = ENHANCED_FINANCIAL_CONFIG;