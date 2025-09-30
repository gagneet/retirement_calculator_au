// dynamic-allocation-engine.js - Dynamic Asset Allocation Optimization Engine
// Advanced portfolio management with lifecycle-based allocation, rebalancing, and optimization

import { ENHANCED_CONFIG } from './config.js';
import { ENHANCED_FINANCIAL_CONFIG } from './enhanced-config.js';
import { formatCurrency, formatPercent, randomNormal } from './utils.js';

export class DynamicAllocationEngine {
    constructor() {
        this.config = ENHANCED_CONFIG;
        this.financialConfig = ENHANCED_FINANCIAL_CONFIG;

        // Dynamic allocation strategies
        this.allocationStrategies = this.initializeAllocationStrategies();

        // Rebalancing rules
        this.rebalancingRules = this.initializeRebalancingRules();

        // Market condition indicators
        this.marketIndicators = this.initializeMarketIndicators();
    }

    // Initialize comprehensive allocation strategies
    initializeAllocationStrategies() {
        return {
            lifecycle: {
                name: "Lifecycle Strategy",
                description: "Age-based allocation that becomes more conservative over time",
                rules: {
                    "aggressive_young": {
                        ageRange: [20, 35],
                        baseAllocation: { equity: 90, bonds: 8, cash: 2 },
                        riskTolerance: "very_high",
                        rebalanceFrequency: "annual"
                    },
                    "growth_accumulation": {
                        ageRange: [35, 50],
                        baseAllocation: { equity: 80, bonds: 15, cash: 5 },
                        riskTolerance: "high",
                        rebalanceFrequency: "semi_annual"
                    },
                    "balanced_pre_retirement": {
                        ageRange: [50, 60],
                        baseAllocation: { equity: 65, bonds: 25, cash: 10 },
                        riskTolerance: "moderate",
                        rebalanceFrequency: "quarterly"
                    },
                    "conservative_transition": {
                        ageRange: [60, 67],
                        baseAllocation: { equity: 50, bonds: 35, cash: 15 },
                        riskTolerance: "moderate_low",
                        rebalanceFrequency: "monthly"
                    },
                    "retirement_income": {
                        ageRange: [67, 999],
                        baseAllocation: { equity: 40, bonds: 45, cash: 15 },
                        riskTolerance: "low",
                        rebalanceFrequency: "monthly"
                    }
                }
            },

            glide_path: {
                name: "Target Date Glide Path",
                description: "Mathematical glide path reducing equity exposure as retirement approaches",
                formulas: {
                    "110_minus_age": {
                        name: "110 Minus Age Rule",
                        formula: (age) => Math.max(20, Math.min(90, 110 - age)),
                        description: "Equity % = 110 - age, conservative approach"
                    },
                    "120_minus_age": {
                        name: "120 Minus Age Rule",
                        formula: (age) => Math.max(25, Math.min(95, 120 - age)),
                        description: "Equity % = 120 - age, aggressive approach"
                    },
                    "custom_glide_path": {
                        name: "Optimized Custom Glide Path",
                        formula: (age, yearsToRetirement) => {
                            if (yearsToRetirement > 30) return Math.min(95, 125 - age);
                            if (yearsToRetirement > 20) return Math.min(90, 115 - age);
                            if (yearsToRetirement > 10) return Math.min(80, 105 - age);
                            if (yearsToRetirement > 5) return Math.min(70, 95 - age);
                            return Math.max(30, 85 - age);
                        },
                        description: "Custom optimized glide path based on years to retirement"
                    }
                }
            },

            tactical: {
                name: "Tactical Asset Allocation",
                description: "Strategic overweights/underweights based on market conditions",
                strategies: {
                    "momentum": {
                        description: "Follow market momentum with trend indicators",
                        signals: ["market_trend", "volatility_regime", "economic_cycle"],
                        adjustmentRange: { equity: [-10, +15], bonds: [-5, +10] }
                    },
                    "contrarian": {
                        description: "Contrarian approach buying dips and selling peaks",
                        signals: ["market_valuation", "sentiment_indicators", "volatility_spikes"],
                        adjustmentRange: { equity: [-5, +20], bonds: [-10, +5] }
                    },
                    "defensive": {
                        description: "Risk-off positioning during uncertain periods",
                        signals: ["recession_probability", "market_stress", "policy_uncertainty"],
                        adjustmentRange: { equity: [-20, +5], bonds: [-5, +15], cash: [-5, +10] }
                    }
                }
            },

            risk_parity: {
                name: "Risk Parity Allocation",
                description: "Equal risk contribution from each asset class",
                implementation: {
                    "equal_risk_contribution": {
                        targetRiskContribution: { equity: 0.33, bonds: 0.33, alternatives: 0.34 },
                        leverageAllowed: false,
                        rebalanceThreshold: 0.05
                    },
                    "volatility_weighted": {
                        description: "Weight inversely to volatility for risk parity",
                        targetVolatility: 0.10,
                        lookbackPeriod: 252 // trading days
                    }
                }
            },

            factor_based: {
                name: "Factor-Based Allocation",
                description: "Systematic factor exposure allocation",
                factors: {
                    "value": {
                        description: "Value factor exposure",
                        targetAllocation: 0.20,
                        instruments: ["value_stocks", "value_etfs"]
                    },
                    "momentum": {
                        description: "Momentum factor exposure",
                        targetAllocation: 0.15,
                        instruments: ["momentum_stocks", "momentum_etfs"]
                    },
                    "quality": {
                        description: "Quality factor exposure",
                        targetAllocation: 0.25,
                        instruments: ["quality_stocks", "dividend_stocks"]
                    },
                    "size": {
                        description: "Small cap exposure",
                        targetAllocation: 0.10,
                        instruments: ["small_cap_stocks", "small_cap_etfs"]
                    }
                }
            }
        };
    }

    // Initialize rebalancing rules and triggers
    initializeRebalancingRules() {
        return {
            threshold_based: {
                name: "Threshold-Based Rebalancing",
                description: "Rebalance when allocation drifts beyond set thresholds",
                thresholds: {
                    conservative: 0.05,    // 5% drift triggers rebalance
                    moderate: 0.075,       // 7.5% drift triggers rebalance
                    aggressive: 0.10       // 10% drift triggers rebalance
                },
                minimumPeriod: 30 // days between rebalances
            },

            calendar_based: {
                name: "Calendar-Based Rebalancing",
                description: "Rebalance on fixed calendar schedule",
                schedules: {
                    monthly: { frequency: 12, description: "Monthly rebalancing" },
                    quarterly: { frequency: 4, description: "Quarterly rebalancing" },
                    semi_annual: { frequency: 2, description: "Semi-annual rebalancing" },
                    annual: { frequency: 1, description: "Annual rebalancing" }
                }
            },

            volatility_based: {
                name: "Volatility-Based Rebalancing",
                description: "Rebalance frequency increases with market volatility",
                rules: {
                    low_volatility: { threshold: 0.15, frequency: 4 },      // Quarterly when vol < 15%
                    normal_volatility: { threshold: 0.25, frequency: 6 },   // Bi-monthly when vol 15-25%
                    high_volatility: { threshold: 0.35, frequency: 12 },    // Monthly when vol 25-35%
                    extreme_volatility: { threshold: 999, frequency: 26 }    // Bi-weekly when vol > 35%
                }
            },

            opportunity_based: {
                name: "Opportunity-Based Rebalancing",
                description: "Rebalance to take advantage of market dislocations",
                triggers: {
                    market_crash: {
                        description: "Significant market decline creates buying opportunity",
                        threshold: -0.15,        // 15% market decline
                        action: "increase_equity_allocation",
                        magnitude: 0.10          // Increase equity allocation by 10%
                    },
                    market_euphoria: {
                        description: "Market euphoria suggests taking profits",
                        threshold: 0.25,         // 25% rapid gain
                        action: "decrease_equity_allocation",
                        magnitude: 0.08          // Decrease equity allocation by 8%
                    },
                    volatility_spike: {
                        description: "Volatility spike creates rebalancing opportunity",
                        threshold: 0.30,         // VIX equivalent > 30
                        action: "contrarian_rebalance",
                        magnitude: 0.05
                    }
                }
            }
        };
    }

    // Initialize market condition indicators
    initializeMarketIndicators() {
        return {
            valuation_metrics: {
                market_pe: { current: 22, historical_average: 18, percentile: 75 },
                cape_ratio: { current: 28, historical_average: 17, percentile: 85 },
                market_cap_to_gdp: { current: 1.8, historical_average: 1.2, percentile: 90 }
            },
            economic_indicators: {
                yield_curve: { spread: 0.015, status: "normal" }, // 10Y-2Y spread
                unemployment_rate: { current: 0.037, trend: "stable" },
                inflation_rate: { current: 0.029, target: 0.025, trend: "rising" },
                gdp_growth: { current: 0.025, trend: "moderate" }
            },
            market_technicals: {
                trend: { direction: "up", strength: 0.7, duration: 180 },
                volatility: { current: 0.18, historical_average: 0.15, regime: "normal" },
                momentum: { short_term: 0.05, medium_term: 0.12, long_term: 0.08 }
            },
            sentiment_indicators: {
                fear_greed_index: { current: 65, interpretation: "neutral_to_greedy" },
                vix_level: { current: 18, historical_average: 20, regime: "normal" },
                investor_sentiment: { retail: "bullish", institutional: "cautious" }
            }
        };
    }

    // Generate optimal dynamic allocation strategy
    generateOptimalAllocation(inputs, riskProfile, marketConditions = null) {
        // --- Performance Concern ---
        // TODO: This is a computationally expensive function. Implement caching based on a hash of the inputs
        // and riskProfile to avoid recalculating for the same parameters.
        const allocation = {
            strategy: null,
            allocation: {},
            rationale: "",
            rebalancingPlan: null,
            expectedMetrics: {},
            tacticalAdjustments: [],
            implementationSteps: []
        };

        const age = inputs.yourCurrentAge || 50;
        const yearsToRetirement = Math.max(0, (inputs.retirementAge || 67) - age);
        const riskScore = riskProfile?.overallScore || 60;

        // Select primary allocation strategy
        allocation.strategy = this.selectOptimalStrategy(inputs, riskProfile, yearsToRetirement);

        // Generate base allocation
        allocation.allocation = this.calculateBaseAllocation(allocation.strategy, age, yearsToRetirement, riskScore);

        // Apply tactical adjustments if appropriate
        if (marketConditions && allocation.strategy.allowTactical) {
            allocation.tacticalAdjustments = this.calculateTacticalAdjustments(
                allocation.allocation,
                marketConditions,
                riskScore
            );

            // Apply tactical adjustments
            allocation.allocation = this.applyTacticalAdjustments(
                allocation.allocation,
                allocation.tacticalAdjustments
            );
        }

        // Generate rebalancing plan
        allocation.rebalancingPlan = this.generateRebalancingPlan(allocation.strategy, riskScore, age);

        // Calculate expected metrics
        allocation.expectedMetrics = this.calculateExpectedMetrics(allocation.allocation);

        // Generate implementation steps
        allocation.implementationSteps = this.generateImplementationSteps(allocation, inputs);

        // Create rationale
        allocation.rationale = this.generateAllocationRationale(allocation, inputs, riskProfile);

        return allocation;
    }

    // Select optimal allocation strategy
    selectOptimalStrategy(inputs, riskProfile, yearsToRetirement) {
        const riskScore = riskProfile?.overallScore || 60;
        const age = inputs.yourCurrentAge || 50;

        let selectedStrategy = {
            name: "lifecycle",
            type: "lifecycle",
            allowTactical: false,
            description: "Lifecycle-based allocation"
        };

        // Strategy selection logic
        if (yearsToRetirement > 20 && riskScore > 70) {
            selectedStrategy = {
                name: "aggressive_glide_path",
                type: "glide_path",
                formula: "120_minus_age",
                allowTactical: true,
                description: "Aggressive glide path with tactical adjustments"
            };
        } else if (yearsToRetirement > 10 && riskScore > 50) {
            selectedStrategy = {
                name: "custom_glide_path",
                type: "glide_path",
                formula: "custom_glide_path",
                allowTactical: riskScore > 60,
                description: "Custom optimized glide path"
            };
        } else if (yearsToRetirement <= 10 && riskScore < 40) {
            selectedStrategy = {
                name: "conservative_lifecycle",
                type: "lifecycle",
                phase: "conservative_transition",
                allowTactical: false,
                description: "Conservative lifecycle approach for near-retirees"
            };
        } else if (inputs.investmentExperience > 10 && riskScore > 80) {
            selectedStrategy = {
                name: "tactical_allocation",
                type: "tactical",
                strategy: "contrarian",
                allowTactical: true,
                description: "Tactical allocation with contrarian bias"
            };
        }

        return selectedStrategy;
    }

    // Calculate base allocation based on selected strategy
    calculateBaseAllocation(strategy, age, yearsToRetirement, riskScore) {
        let baseAllocation = { equity: 60, bonds: 30, cash: 10 };

        switch (strategy.type) {
            case "lifecycle":
                baseAllocation = this.calculateLifecycleAllocation(age, yearsToRetirement);
                break;

            case "glide_path":
                baseAllocation = this.calculateGlidePathAllocation(strategy.formula, age, yearsToRetirement);
                break;

            case "tactical":
                baseAllocation = this.calculateTacticalAllocation(strategy.strategy, riskScore);
                break;

            case "risk_parity":
                baseAllocation = this.calculateRiskParityAllocation();
                break;

            default:
                baseAllocation = this.calculateLifecycleAllocation(age, yearsToRetirement);
        }

        // Apply risk score adjustments
        baseAllocation = this.applyRiskScoreAdjustments(baseAllocation, riskScore);

        // Ensure allocations sum to 100% and meet minimum constraints
        return this.normalizeAndConstrain(baseAllocation);
    }

    // Calculate lifecycle-based allocation
    calculateLifecycleAllocation(age, yearsToRetirement) {
        const strategies = this.allocationStrategies.lifecycle.rules;

        // Find appropriate lifecycle phase
        for (const [phase, rules] of Object.entries(strategies)) {
            if (age >= rules.ageRange[0] && age <= rules.ageRange[1]) {
                return { ...rules.baseAllocation };
            }
        }

        // Default fallback
        return { equity: 60, bonds: 30, cash: 10 };
    }

    // Calculate glide path allocation
    calculateGlidePathAllocation(formulaName, age, yearsToRetirement) {
        const formulas = this.allocationStrategies.glide_path.formulas;
        const formula = formulas[formulaName];

        if (!formula) {
            return { equity: 60, bonds: 30, cash: 10 };
        }

        let equityPercentage;
        if (formulaName === "custom_glide_path") {
            equityPercentage = formula.formula(age, yearsToRetirement);
        } else {
            equityPercentage = formula.formula(age);
        }

        // Calculate bond and cash allocations
        const remainingAllocation = 100 - equityPercentage;
        const bondPercentage = Math.max(15, remainingAllocation * 0.75); // At least 15% bonds
        const cashPercentage = Math.max(5, remainingAllocation - bondPercentage); // At least 5% cash

        return {
            equity: Math.round(equityPercentage),
            bonds: Math.round(bondPercentage),
            cash: Math.round(cashPercentage)
        };
    }

    // Calculate tactical allocation adjustments
    calculateTacticalAdjustments(baseAllocation, marketConditions, riskScore) {
        const adjustments = [];

        if (!marketConditions) {
            return adjustments;
        }

        // Market valuation adjustments
        const valuationPercentile = marketConditions.valuation?.percentile || 50;
        if (valuationPercentile > 80) {
            adjustments.push({
                type: "valuation_defensive",
                description: "Markets appear overvalued - reducing equity exposure",
                equityAdjustment: -5,
                bondsAdjustment: +3,
                cashAdjustment: +2,
                confidence: 0.7
            });
        } else if (valuationPercentile < 20) {
            adjustments.push({
                type: "valuation_opportunistic",
                description: "Markets appear undervalued - increasing equity exposure",
                equityAdjustment: +8,
                bondsAdjustment: -5,
                cashAdjustment: -3,
                confidence: 0.8
            });
        }

        // Volatility regime adjustments
        const volatilityRegime = marketConditions.volatility?.regime || "normal";
        if (volatilityRegime === "high" && riskScore > 60) {
            adjustments.push({
                type: "volatility_opportunistic",
                description: "High volatility creates rebalancing opportunities",
                equityAdjustment: +3,
                bondsAdjustment: -2,
                cashAdjustment: -1,
                confidence: 0.6
            });
        } else if (volatilityRegime === "high" && riskScore <= 60) {
            adjustments.push({
                type: "volatility_defensive",
                description: "High volatility warrants defensive positioning",
                equityAdjustment: -4,
                bondsAdjustment: +2,
                cashAdjustment: +2,
                confidence: 0.7
            });
        }

        // Economic cycle adjustments
        const economicTrend = marketConditions.economic?.trend || "neutral";
        if (economicTrend === "recession" || economicTrend === "late_cycle") {
            adjustments.push({
                type: "economic_defensive",
                description: "Economic conditions favor defensive positioning",
                equityAdjustment: -6,
                bondsAdjustment: +4,
                cashAdjustment: +2,
                confidence: 0.8
            });
        }

        return adjustments;
    }

    // Apply tactical adjustments to base allocation
    applyTacticalAdjustments(baseAllocation, adjustments) {
        let adjustedAllocation = { ...baseAllocation };

        adjustments.forEach(adjustment => {
            // Weight adjustments by confidence level
            const weightedEquityAdj = (adjustment.equityAdjustment || 0) * adjustment.confidence;
            const weightedBondsAdj = (adjustment.bondsAdjustment || 0) * adjustment.confidence;
            const weightedCashAdj = (adjustment.cashAdjustment || 0) * adjustment.confidence;

            adjustedAllocation.equity += weightedEquityAdj;
            adjustedAllocation.bonds += weightedBondsAdj;
            adjustedAllocation.cash += weightedCashAdj;
        });

        return this.normalizeAndConstrain(adjustedAllocation);
    }

    // Apply risk score adjustments to allocation
    applyRiskScoreAdjustments(allocation, riskScore) {
        const adjustedAllocation = { ...allocation };

        // Risk score adjustments (0-100 scale)
        if (riskScore > 80) {
            // Very high risk: increase equity, decrease bonds/cash
            adjustedAllocation.equity += 5;
            adjustedAllocation.bonds -= 3;
            adjustedAllocation.cash -= 2;
        } else if (riskScore < 30) {
            // Very low risk: decrease equity, increase bonds/cash
            adjustedAllocation.equity -= 8;
            adjustedAllocation.bonds += 5;
            adjustedAllocation.cash += 3;
        } else if (riskScore < 50) {
            // Low-moderate risk: slight defensive tilt
            adjustedAllocation.equity -= 3;
            adjustedAllocation.bonds += 2;
            adjustedAllocation.cash += 1;
        }

        return adjustedAllocation;
    }

    // Normalize allocations to sum to 100% and apply constraints
    normalizeAndConstrain(allocation) {
        // Apply minimum constraints from config
        const minAllocations = this.financialConfig.assetAllocation.MINIMUM_ALLOCATIONS;

        let constrainedAllocation = {
            equity: Math.max(20, Math.min(95, allocation.equity)),    // 20-95% equity range
            bonds: Math.max(minAllocations.BOND_MIN.value, allocation.bonds),
            cash: Math.max(minAllocations.CASH_MIN.value, allocation.cash)
        };

        // Normalize to sum to 100%
        const total = constrainedAllocation.equity + constrainedAllocation.bonds + constrainedAllocation.cash;
        if (total !== 100) {
            const scaleFactor = 100 / total;
            constrainedAllocation.equity = Math.round(constrainedAllocation.equity * scaleFactor);
            constrainedAllocation.bonds = Math.round(constrainedAllocation.bonds * scaleFactor);
            constrainedAllocation.cash = Math.round(constrainedAllocation.cash * scaleFactor);

            // Handle rounding errors
            const newTotal = constrainedAllocation.equity + constrainedAllocation.bonds + constrainedAllocation.cash;
            if (newTotal !== 100) {
                constrainedAllocation.equity += (100 - newTotal); // Adjust equity for rounding
            }
        }

        return constrainedAllocation;
    }

    // Generate comprehensive rebalancing plan
    generateRebalancingPlan(strategy, riskScore, age) {
        const rebalancingPlan = {
            primaryMethod: "threshold_based",
            frequency: "quarterly",
            thresholds: {},
            triggers: [],
            automationLevel: "manual",
            costConsiderations: {},
            nextReviewDate: null
        };

        // Select rebalancing frequency based on age and risk
        if (age >= 65) {
            rebalancingPlan.frequency = "monthly";
            rebalancingPlan.primaryMethod = "calendar_based";
        } else if (age >= 55) {
            rebalancingPlan.frequency = "quarterly";
        } else if (riskScore > 70) {
            rebalancingPlan.frequency = "semi_annual";
            rebalancingPlan.primaryMethod = "threshold_based";
        } else {
            rebalancingPlan.frequency = "annual";
        }

        // Set rebalancing thresholds based on risk profile
        if (riskScore > 70) {
            rebalancingPlan.thresholds = this.rebalancingRules.threshold_based.thresholds.aggressive;
        } else if (riskScore > 50) {
            rebalancingPlan.thresholds = this.rebalancingRules.threshold_based.thresholds.moderate;
        } else {
            rebalancingPlan.thresholds = this.rebalancingRules.threshold_based.thresholds.conservative;
        }

        // Add market-based triggers if tactical strategy
        if (strategy.allowTactical) {
            rebalancingPlan.triggers = [
                "market_volatility_spike",
                "significant_market_decline",
                "extreme_valuation_levels"
            ];
        }

        // Cost considerations
        rebalancingPlan.costConsiderations = {
            minimumRebalanceAmount: 5000,
            transactionCostThreshold: 0.005, // 0.5% max transaction costs
            taxEfficiency: age >= 60 ? "high_priority" : "moderate_priority"
        };

        // Next review date
        const reviewMonths = rebalancingPlan.frequency === "monthly" ? 1 :
            rebalancingPlan.frequency === "quarterly" ? 3 :
                rebalancingPlan.frequency === "semi_annual" ? 6 : 12;
        rebalancingPlan.nextReviewDate = new Date();
        rebalancingPlan.nextReviewDate.setMonth(rebalancingPlan.nextReviewDate.getMonth() + reviewMonths);

        return rebalancingPlan;
    }

    // Calculate expected portfolio metrics
    calculateExpectedMetrics(allocation) {
        // Use returns and correlations from config
        const assetReturns = this.financialConfig.assetAllocation.RETURN_EXPECTATIONS;
        const baseReturn = 0.07; // 7% base equity return assumption

        const expectedReturn =
            (allocation.equity / 100) * (baseReturn * assetReturns.EQUITY_MULTIPLIER.value) +
            (allocation.bonds / 100) * (baseReturn * assetReturns.BOND_MULTIPLIER.value) +
            (allocation.cash / 100) * (baseReturn * assetReturns.CASH_MULTIPLIER.value);

        // Simplified volatility calculation (not accounting for correlations)
        const equityVol = 0.16;
        const bondVol = this.financialConfig.monteCarlo.VOLATILITY_PARAMETERS.BOND_VOLATILITY.value;
        const cashVol = 0.01;

        const expectedVolatility = Math.sqrt(
            Math.pow((allocation.equity / 100) * equityVol, 2) +
            Math.pow((allocation.bonds / 100) * bondVol, 2) +
            Math.pow((allocation.cash / 100) * cashVol, 2)
        );

        const sharpeRatio = expectedReturn / expectedVolatility;

        return {
            expectedAnnualReturn: expectedReturn,
            expectedVolatility: expectedVolatility,
            sharpeRatio: sharpeRatio,
            expectedDrawdown: expectedVolatility * 2.5, // Rough maximum drawdown estimate
            expectedRecoveryTime: expectedVolatility > 0.15 ? 3 : expectedVolatility > 0.10 ? 2 : 1 // years
        };
    }

    // Generate implementation steps
    generateImplementationSteps(allocation, inputs) {
        const steps = [];

        // Step 1: Asset allocation setup
        steps.push({
            phase: "setup",
            priority: "high",
            title: "Implement Target Asset Allocation",
            description: `Adjust portfolio to ${allocation.allocation.equity}% equity, ${allocation.allocation.bonds}% bonds, ${allocation.allocation.cash}% cash`,
            timeline: "immediate",
            complexity: "medium"
        });

        // Step 2: Rebalancing automation
        if (allocation.rebalancingPlan.frequency !== "manual") {
            steps.push({
                phase: "automation",
                priority: "medium",
                title: "Set Up Automatic Rebalancing",
                description: `Configure ${allocation.rebalancingPlan.frequency} rebalancing with ${allocation.rebalancingPlan.thresholds}% drift threshold`,
                timeline: "within_month",
                complexity: "low"
            });
        }

        // Step 3: Monitoring system
        steps.push({
            phase: "monitoring",
            priority: "medium",
            title: "Establish Portfolio Monitoring",
            description: "Set up regular portfolio review and performance tracking",
            timeline: "within_month",
            complexity: "low"
        });

        // Step 4: Tax optimization (if applicable)
        if (inputs.yourCurrentAge >= 55) {
            steps.push({
                phase: "optimization",
                priority: "high",
                title: "Optimize for Tax Efficiency",
                description: "Consider tax-advantaged accounts and tax-efficient fund placement",
                timeline: "next_quarter",
                complexity: "high"
            });
        }

        return steps;
    }

    // Generate allocation rationale
    generateAllocationRationale(allocation, inputs, riskProfile) {
        const age = inputs.yourCurrentAge || 50;
        const yearsToRetirement = Math.max(0, (inputs.retirementAge || 67) - age);
        const riskLevel = riskProfile?.riskProfile || "moderate";

        let rationale = `This ${allocation.strategy.description.toLowerCase()} is designed for your ${riskLevel} risk profile `;
        rationale += `with ${yearsToRetirement} years until retirement. `;

        // Strategy-specific rationale
        if (allocation.strategy.type === "glide_path") {
            rationale += `The glide path approach automatically reduces equity exposure as you approach retirement, `;
            rationale += `currently targeting ${allocation.allocation.equity}% equities at age ${age}. `;
        } else if (allocation.strategy.type === "lifecycle") {
            rationale += `The lifecycle approach matches your current life stage with appropriate risk levels. `;
        }

        // Tactical adjustments rationale
        if (allocation.tacticalAdjustments && allocation.tacticalAdjustments.length > 0) {
            rationale += `Current market conditions have prompted tactical adjustments: `;
            allocation.tacticalAdjustments.forEach(adj => {
                rationale += `${adj.description}. `;
            });
        }

        // Expected outcomes
        const expectedReturn = (allocation.expectedMetrics.expectedAnnualReturn * 100).toFixed(1);
        const expectedVol = (allocation.expectedMetrics.expectedVolatility * 100).toFixed(1);
        rationale += `This allocation targets ${expectedReturn}% annual returns with ${expectedVol}% volatility.`;

        return rationale;
    }

    // Generate dynamic allocation summary for display
    generateAllocationSummary(inputs, riskProfile, marketConditions = null) {
        const allocation = this.generateOptimalAllocation(inputs, riskProfile, marketConditions);

        return {
            strategy: allocation.strategy,
            currentAllocation: allocation.allocation,
            expectedMetrics: {
                expectedReturn: formatPercent(allocation.expectedMetrics.expectedAnnualReturn),
                expectedVolatility: formatPercent(allocation.expectedMetrics.expectedVolatility),
                sharpeRatio: allocation.expectedMetrics.sharpeRatio.toFixed(2),
                maxDrawdown: formatPercent(allocation.expectedMetrics.expectedDrawdown)
            },
            rebalancingPlan: {
                frequency: allocation.rebalancingPlan.frequency,
                method: allocation.rebalancingPlan.primaryMethod,
                nextReview: allocation.rebalancingPlan.nextReviewDate
            },
            tacticalAdjustments: allocation.tacticalAdjustments,
            implementationSteps: allocation.implementationSteps.slice(0, 3), // Top 3 steps
            rationale: allocation.rationale,
            confidence: this.calculateAllocationConfidence(allocation, inputs, riskProfile)
        };
    }

    // Calculate confidence in allocation recommendation
    calculateAllocationConfidence(allocation, inputs, riskProfile) {
        let confidence = 70; // Base confidence

        // Data quality factors
        const dataCompleteness = this.calculateDataCompleteness(inputs);
        confidence += dataCompleteness * 20;

        // Risk profile alignment
        if (riskProfile && riskProfile.confidenceLevel) {
            confidence += (riskProfile.confidenceLevel - 50) * 0.2;
        }

        // Strategy appropriateness
        if (allocation.strategy.type === "lifecycle" || allocation.strategy.type === "glide_path") {
            confidence += 10; // Well-established strategies
        }

        return Math.min(100, Math.max(50, confidence));
    }

    // Calculate data completeness score
    calculateDataCompleteness(inputs) {
        const requiredFields = [
            'yourCurrentAge', 'retirementAge', 'yourSalary', 'yourCurrentSuper',
            'currentSavings', 'currentStocks', 'riskTolerance'
        ];

        const completedFields = requiredFields.filter(field =>
            inputs[field] !== undefined && inputs[field] !== null && inputs[field] !== ''
        ).length;

        return completedFields / requiredFields.length;
    }

    // Additional helper methods
    calculateTacticalAllocation(strategyName, riskScore) {
        // Simplified tactical allocation - would be more complex in practice
        const baseAllocation = { equity: 60, bonds: 30, cash: 10 };

        if (strategyName === "contrarian") {
            // Contrarian approach - favor undervalued assets
            baseAllocation.equity += 10;
            baseAllocation.bonds -= 5;
            baseAllocation.cash -= 5;
        } else if (strategyName === "momentum") {
            // Momentum approach - follow trends
            baseAllocation.equity += 5;
            baseAllocation.bonds -= 3;
            baseAllocation.cash -= 2;
        }

        return baseAllocation;
    }

    calculateRiskParityAllocation() {
        // Simplified risk parity - equal risk contribution
        return { equity: 45, bonds: 40, cash: 15 };
    }
}