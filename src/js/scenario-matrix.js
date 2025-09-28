// js/scenario-matrix.js - Advanced Scenario Comparison Matrix Engine

import { formatCurrency, formatPercent } from './utils.js';
import { ENHANCED_FINANCIAL_CONFIG as ENHANCED_CONFIG } from './enhanced-config.js';

export default class ScenarioMatrixEngine {
    constructor(simulator, inputs) {
        this.simulator = simulator;
        this.baseInputs = inputs;
        this.matrixResults = null;
        this.scenarios = [];
    }

    // Generate comprehensive scenario matrix based on user profile
    async generateScenarioMatrix(progressCallback = null) {
        console.log("Generating comprehensive scenario comparison matrix...");

        try {
            // 1. Generate appropriate scenarios based on user profile
            this.scenarios = this.generatePersonalizedScenarios();

            // 2. Run all scenarios with Monte Carlo analysis
            const results = [];
            for (let i = 0; i < this.scenarios.length; i++) {
                const scenario = this.scenarios[i];
                if (progressCallback) {
                    await progressCallback(i, this.scenarios.length, `Analyzing: ${scenario.name}`);
                }

                const scenarioInputs = { ...this.baseInputs, ...scenario.modifications };

                // Run Monte Carlo for each scenario
                const monteCarloRuns = ENHANCED_CONFIG.scenarioAnalysis.SIMULATION_PARAMETERS.MONTE_CARLO_RUNS.value;
                const monteCarloResult = await this.simulator.runMonteCarloSimulation(
                    scenarioInputs, monteCarloRuns, null
                );

                // Run deterministic simulation for exact projections
                const deterministicResult = this.simulator.simulateRetirement(scenarioInputs, false);

                results.push({
                    ...scenario,
                    monteCarloResult,
                    deterministicResult,
                    riskScore: this.calculateScenarioRisk(monteCarloResult, deterministicResult),
                    opportunityScore: this.calculateOpportunityScore(monteCarloResult, deterministicResult),
                    feasibilityScore: this.calculateFeasibilityScore(scenario.modifications)
                });
            }

            // 3. Create comprehensive matrix analysis
            this.matrixResults = this.buildComparisonMatrix(results);
            return this.matrixResults;

        } catch (error) {
            console.error('Error generating scenario matrix:', error);
            throw new Error(`Failed to generate scenario matrix: ${error.message}`);
        }
    }

    // Generate scenarios tailored to user's specific situation
    generatePersonalizedScenarios() {
        const scenarios = [];
        const age = this.baseInputs.yourCurrentAge;
        const salary = this.baseInputs.yourSalary;
        const superBalance = this.baseInputs.yourCurrentSuper + this.baseInputs.partnerCurrentSuper;
        const hasProperty = this.baseInputs.hasInvestmentProperty;

        // Base scenario (current plan)
        scenarios.push({
            name: "Current Plan",
            description: "Your current retirement strategy with existing settings",
            category: "baseline",
            modifications: {},
            impact: "baseline",
            difficulty: "current",
            timeframe: "ongoing"
        });

        // Age-based scenarios
        if (age < 50) {
            // Young professionals - focus on growth and optimization
            scenarios.push({
                name: "Aggressive Growth Strategy",
                description: "Higher equity allocation with maximum super contributions for long-term growth",
                category: "growth",
                modifications: {
                    allocEquities: 80,
                    allocBonds: 15,
                    allocCash: 5,
                    nonConcessionalContribution: Math.min(120000, this.baseInputs.currentSavings * 0.3),
                    percentIncomeSaved: Math.min(25, (this.baseInputs.percentIncomeSaved || 10) + 5)
                },
                impact: "high",
                difficulty: "moderate",
                timeframe: "long-term"
            });

            scenarios.push({
                name: "Early FIRE Strategy",
                description: "Financial Independence Retire Early - high savings rate with aggressive timeline",
                category: "lifestyle",
                modifications: {
                    retirementAge: Math.max(50, age + 15),
                    partnerRetirementAge: Math.max(50, (this.baseInputs.partnerCurrentAge || age) + 15),
                    percentIncomeSaved: 30,
                    monthlyStockContribution: (this.baseInputs.monthlyStockContribution || 0) + 2000,
                    asfaComfortable: (this.baseInputs.asfaComfortable || 70000) * 0.8 // Lower expenses for FIRE
                },
                impact: "high",
                difficulty: "high",
                timeframe: "medium-term"
            });
        }

        if (age >= 50 && age < 60) {
            // Pre-retirement planning
            scenarios.push({
                name: "Pre-Retirement Acceleration",
                description: "Catch-up contributions and strategic positioning for upcoming retirement",
                category: "acceleration",
                modifications: {
                    // Catch-up contributions
                    catchUpContributionAmount: Math.min(50000, this.baseInputs.currentSavings * 0.2),
                    // More conservative allocation as retirement approaches
                    allocEquities: Math.max(40, 70 - (age - 50) * 2),
                    allocBonds: Math.min(50, 25 + (age - 50) * 2),
                    // Increase savings rate if possible
                    percentIncomeSaved: Math.min(20, (this.baseInputs.percentIncomeSaved || 10) + 3)
                },
                impact: "high",
                difficulty: "moderate",
                timeframe: "short-term"
            });

            scenarios.push({
                name: "Transition to Part-Time",
                description: "Gradual retirement with part-time work to bridge to full retirement",
                category: "lifestyle",
                modifications: {
                    retirementAge: age + 5,
                    partTimeWorkIncome: salary * 0.4, // 40% of current salary
                    // More conservative allocation for transition period
                    allocEquities: 50,
                    allocBonds: 35,
                    allocCash: 15
                },
                impact: "medium",
                difficulty: "moderate",
                timeframe: "short-term"
            });
        }

        // High-income specific scenarios
        if (salary > 180000) {
            scenarios.push({
                name: "High-Income Tax Optimization",
                description: "Maximize tax-effective strategies for high earners including negative gearing and super",
                category: "tax-optimization",
                modifications: {
                    // Max out super contributions
                    nonConcessionalContribution: 120000, // Max non-concessional cap
                    // Consider additional property investment
                    ...(hasProperty ? {} : {
                        hasInvestmentProperty: true,
                        investmentPropertyValue: 800000,
                        investmentPropertyLoan: 640000, // 80% LVR
                        weeklyRentalIncome: 600,
                        numberOfProperties: 1
                    }),
                    // Aggressive tax-effective allocation
                    allocEquities: 70,
                    allocBonds: 20,
                    allocCash: 10
                },
                impact: "high",
                difficulty: "high",
                timeframe: "long-term"
            });
        }

        // Property-focused scenarios
        if (hasProperty) {
            scenarios.push({
                name: "Property Sale at Retirement",
                description: "Sell investment property at retirement to boost liquid assets",
                category: "property-strategy",
                modifications: {
                    sellPropertyYears: Math.max(1, this.baseInputs.retirementAge - age)
                },
                impact: "medium",
                difficulty: "low",
                timeframe: "medium-term"
            });

            scenarios.push({
                name: "Property Portfolio Expansion",
                description: "Leverage current property to build larger portfolio",
                category: "growth",
                modifications: {
                    numberOfProperties: Math.min(3, (this.baseInputs.numberOfProperties || 1) + 1),
                    // Adjust investment to account for additional property management
                    monthlyStockContribution: Math.max(0, (this.baseInputs.monthlyStockContribution || 0) - 500)
                },
                impact: "high",
                difficulty: "high",
                timeframe: "long-term"
            });
        }

        // Defensive/Conservative scenarios
        scenarios.push({
            name: "Conservative Strategy",
            description: "Lower-risk approach prioritizing capital preservation over growth",
            category: "defensive",
            modifications: {
                allocEquities: 30,
                allocBonds: 50,
                allocCash: 20,
                useGlidePath: false,
                // Plan for longer lifespan with conservative approach
                yourLifespan: Math.max(95, this.baseInputs.yourLifespan || 85),
                partnerLifespan: Math.max(95, this.baseInputs.partnerLifespan || 85)
            },
            impact: "low",
            difficulty: "low",
            timeframe: "long-term"
        });

        // Healthcare cost scenarios
        scenarios.push({
            name: "High Healthcare Cost Scenario",
            description: "Plan for above-average healthcare and aged care expenses",
            category: "risk-management",
            modifications: {
                healthcareInflation: 8.0, // Higher than default 6.5%
                agedCareProbability: 80,   // Higher probability
                agedCareAnnualCost: 95000, // Higher annual cost
                agedCareDuration: 4,       // Longer duration
                currentHealthcareCosts: (this.baseInputs.currentHealthcareCosts || 5000) * 1.5
            },
            impact: "medium",
            difficulty: "low",
            timeframe: "long-term"
        });

        // Market stress scenarios
        scenarios.push({
            name: "Market Downturn Scenario",
            description: "Conservative planning assuming prolonged market underperformance",
            category: "stress-test",
            modifications: {
                investmentReturn: Math.max(0.04, (this.baseInputs.investmentReturn || 0.07) - 0.02), // 2% lower returns
                propertyGrowthRate: Math.max(2, (this.baseInputs.propertyGrowthRate || 5) - 2), // 2% lower property growth
                inflation: Math.min(0.05, (this.baseInputs.inflation || 0.029) + 0.01) // 1% higher inflation
            },
            impact: "high",
            difficulty: "low",
            timeframe: "long-term"
        });

        // Lifestyle scenarios
        if (this.baseInputs.planToDownsize !== true) {
            scenarios.push({
                name: "Downsizing Strategy",
                description: "Sell family home and downsize to release equity for retirement",
                category: "lifestyle",
                modifications: {
                    planToDownsize: true,
                    // Assume downsizing frees up 30% of home equity
                    homeValue: this.baseInputs.homeValue * 0.7
                },
                impact: "medium",
                difficulty: "moderate",
                timeframe: "retirement"
            });
        }

        // Work longer scenario
        scenarios.push({
            name: "Work 2 Years Longer",
            description: "Extend working life by 2 years for additional security",
            category: "lifestyle",
            modifications: {
                retirementAge: this.baseInputs.retirementAge + 2,
                partnerRetirementAge: (this.baseInputs.partnerRetirementAge || this.baseInputs.retirementAge) + 2
            },
            impact: "medium",
            difficulty: "low",
            timeframe: "short-term"
        });

        const maxScenarios = ENHANCED_CONFIG.scenarioAnalysis.SIMULATION_PARAMETERS.MAX_SCENARIOS.value;
        return scenarios.slice(0, maxScenarios); // Limit scenarios for performance
    }

    // Calculate risk score for each scenario (0-100, lower is better)
    calculateScenarioRisk(monteCarloResult, deterministicResult) {
        let riskScore = 0;

        // Failure rate (40% weight)
        riskScore += monteCarloResult.failureRate * 40;

        // Volatility of outcomes (30% weight)
        const outcomes = monteCarloResult.outcomes || [];
        if (outcomes.length > 0) {
            const mean = outcomes.reduce((a, b) => a + b, 0) / outcomes.length;
            const variance = outcomes.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / outcomes.length;
            const stdDev = Math.sqrt(variance);
            const coefficientOfVariation = mean !== 0 ? stdDev / Math.abs(mean) : 1;
            riskScore += Math.min(30, coefficientOfVariation * 30);
        }

        // Shortfall magnitude (20% weight)
        const percentile10 = monteCarloResult.percentiles?.p10 || 0;
        if (percentile10 < 0) {
            const shortfallMagnitude = Math.abs(percentile10) / 1000000; // Scale to millions
            riskScore += Math.min(20, shortfallMagnitude * 10);
        }

        // Sequence of returns risk (10% weight)
        const earlyRetirementRisk = monteCarloResult.successRate < 0.7 ? 10 : 0;
        riskScore += earlyRetirementRisk;

        return Math.min(100, Math.max(0, riskScore));
    }

    // Calculate opportunity score (0-100, higher is better)
    calculateOpportunityScore(monteCarloResult, deterministicResult) {
        let opportunityScore = 50; // Base score

        // Success rate (40% weight)
        opportunityScore += (monteCarloResult.successRate - 0.7) * 40;

        // Upside potential (30% weight)
        const percentile90 = monteCarloResult.percentiles?.p90 || 0;
        const median = monteCarloResult.median || 0;
        if (median > 0) {
            const upsidePotential = (percentile90 - median) / median;
            opportunityScore += Math.min(30, upsidePotential * 30);
        }

        // Final balance relative to baseline (20% weight)
        const finalBalance = deterministicResult.finalBalance || 0;
        if (finalBalance > 0) {
            const balanceScore = Math.min(20, (finalBalance / 1000000) * 5); // 5 points per million
            opportunityScore += balanceScore;
        }

        // Age pension optimization (10% weight)
        // Higher score if scenario optimizes for age pension eligibility
        if (deterministicResult.yearlyData) {
            const pensionYears = deterministicResult.yearlyData.filter(year => year.pensionIncome > 0).length;
            const totalRetirementYears = deterministicResult.yearlyData.length;
            if (totalRetirementYears > 0) {
                opportunityScore += (pensionYears / totalRetirementYears) * 10;
            }
        }

        return Math.min(100, Math.max(0, opportunityScore));
    }

    // Calculate feasibility score based on required changes (0-100, higher is easier)
    calculateFeasibilityScore(modifications) {
        let feasibilityScore = 100; // Start at maximum

        // Assess each modification for difficulty
        Object.entries(modifications).forEach(([key, value]) => {
            switch (key) {
                case 'retirementAge':
                    const ageChange = Math.abs(value - this.baseInputs.retirementAge);
                    feasibilityScore -= Math.min(20, ageChange * 2); // 2 points per year change
                    break;

                case 'percentIncomeSaved':
                    const savingsChange = Math.abs(value - (this.baseInputs.percentIncomeSaved || 10));
                    feasibilityScore -= Math.min(15, savingsChange * 1.5); // 1.5 points per % change
                    break;

                case 'nonConcessionalContribution':
                    if (value > (this.baseInputs.currentSavings || 0) * 0.5) {
                        feasibilityScore -= 10; // Major cash requirement
                    }
                    break;

                case 'hasInvestmentProperty':
                    if (value && !this.baseInputs.hasInvestmentProperty) {
                        feasibilityScore -= 15; // Requires property purchase
                    }
                    break;

                case 'planToDownsize':
                    if (value && !this.baseInputs.planToDownsize) {
                        feasibilityScore -= 8; // Lifestyle change required
                    }
                    break;

                case 'allocEquities':
                    const allocChange = Math.abs(value - (this.baseInputs.allocEquities || 60));
                    if (allocChange > 20) {
                        feasibilityScore -= 5; // Significant allocation change
                    }
                    break;

                default:
                    // Small penalty for any other changes
                    feasibilityScore -= 1;
            }
        });

        return Math.max(0, feasibilityScore);
    }

    // Build comprehensive comparison matrix
    buildComparisonMatrix(scenarioResults) {
        const baselineResult = scenarioResults.find(s => s.category === 'baseline') || scenarioResults[0];

        // Create comparison matrix
        const matrix = {
            baseline: baselineResult,
            scenarios: scenarioResults.filter(s => s !== baselineResult),
            analysis: {
                recommendedScenarios: [],
                riskAnalysis: this.analyzeRiskSpectrum(scenarioResults),
                opportunityAnalysis: this.analyzeOpportunitySpectrum(scenarioResults),
                tradeoffAnalysis: this.analyzeTradeoffs(scenarioResults)
            },
            summary: this.generateMatrixSummary(scenarioResults, baselineResult)
        };

        // Find recommended scenarios
        matrix.analysis.recommendedScenarios = this.identifyRecommendedScenarios(scenarioResults, baselineResult);

        return matrix;
    }

    // Analyze risk spectrum across scenarios
    analyzeRiskSpectrum(scenarioResults) {
        const riskLevels = scenarioResults.map(s => ({
            name: s.name,
            riskScore: s.riskScore,
            successRate: s.monteCarloResult.successRate,
            failureRate: s.monteCarloResult.failureRate
        })).sort((a, b) => a.riskScore - b.riskScore);

        return {
            lowest: riskLevels[0],
            highest: riskLevels[riskLevels.length - 1],
            spectrum: riskLevels,
            insights: this.generateRiskInsights(riskLevels)
        };
    }

    // Analyze opportunity spectrum across scenarios
    analyzeOpportunitySpectrum(scenarioResults) {
        const opportunities = scenarioResults.map(s => ({
            name: s.name,
            opportunityScore: s.opportunityScore,
            medianBalance: s.monteCarloResult.median,
            percentile90: s.monteCarloResult.percentiles?.p90 || 0
        })).sort((a, b) => b.opportunityScore - a.opportunityScore);

        return {
            highest: opportunities[0],
            lowest: opportunities[opportunities.length - 1],
            spectrum: opportunities,
            insights: this.generateOpportunityInsights(opportunities)
        };
    }

    // Analyze tradeoffs between scenarios
    analyzeTradeoffs(scenarioResults) {
        const tradeoffs = [];

        scenarioResults.forEach((scenario, i) => {
            scenarioResults.slice(i + 1).forEach(compareScenario => {
                if (scenario.category !== compareScenario.category) {
                    tradeoffs.push({
                        scenario1: scenario.name,
                        scenario2: compareScenario.name,
                        riskTradeoff: compareScenario.riskScore - scenario.riskScore,
                        opportunityTradeoff: compareScenario.opportunityScore - scenario.opportunityScore,
                        feasibilityTradeoff: compareScenario.feasibilityScore - scenario.feasibilityScore,
                        balanceTradeoff: (compareScenario.monteCarloResult.median || 0) - (scenario.monteCarloResult.median || 0)
                    });
                }
            });
        });

        // Sort by most interesting tradeoffs (high difference in multiple dimensions)
        return tradeoffs
            .map(t => ({
                ...t,
                interestScore: Math.abs(t.riskTradeoff) + Math.abs(t.opportunityTradeoff) + Math.abs(t.feasibilityTradeoff/10)
            }))
            .sort((a, b) => b.interestScore - a.interestScore)
            .slice(0, 5); // Top 5 most interesting tradeoffs
    }

    // Identify 2-3 recommended scenarios
    identifyRecommendedScenarios(scenarioResults, baseline) {
        const candidates = scenarioResults.filter(s => s !== baseline);

        // Score each scenario based on improvement over baseline
        const scored = candidates.map(scenario => {
            const successImprovement = scenario.monteCarloResult.successRate - baseline.monteCarloResult.successRate;
            const balanceImprovement = (scenario.monteCarloResult.median - baseline.monteCarloResult.median) / 1000000; // Scale to millions
            const riskReduction = baseline.riskScore - scenario.riskScore;

            const improvementScore =
                (successImprovement * 50) +           // Success rate improvement (most important)
                (balanceImprovement * 20) +           // Balance improvement
                (riskReduction * 15) +                // Risk reduction
                (scenario.feasibilityScore / 100 * 15); // Feasibility

            return {
                ...scenario,
                improvementScore,
                successImprovement,
                balanceImprovement: balanceImprovement * 1000000, // Convert back to dollars
                riskReduction
            };
        });

        // Return top 3 scenarios with meaningful improvements
        return scored
            .filter(s => s.improvementScore > 5) // Only meaningful improvements
            .sort((a, b) => b.improvementScore - a.improvementScore)
            .slice(0, 3)
            .map(s => ({
                name: s.name,
                description: s.description,
                category: s.category,
                improvementScore: s.improvementScore,
                improvements: {
                    successRate: s.successImprovement,
                    medianBalance: s.balanceImprovement,
                    riskReduction: s.riskReduction
                },
                feasibilityScore: s.feasibilityScore,
                difficulty: s.difficulty,
                timeframe: s.timeframe,
                keyModifications: this.summarizeModifications(s.modifications)
            }));
    }

    // Generate insights about risk spectrum
    generateRiskInsights(riskLevels) {
        const insights = [];

        const safest = riskLevels[0];
        const riskiest = riskLevels[riskLevels.length - 1];

        insights.push(`Safest strategy: "${safest.name}" with ${(safest.successRate * 100).toFixed(0)}% success rate`);
        insights.push(`Riskiest strategy: "${riskiest.name}" with ${(riskiest.successRate * 100).toFixed(0)}% success rate`);

        const goodRiskRewardRatio = riskLevels.filter(s => s.successRate > 0.8 && s.riskScore < 30);
        if (goodRiskRewardRatio.length > 0) {
            insights.push(`Best risk-adjusted options: ${goodRiskRewardRatio.map(s => s.name).join(', ')}`);
        }

        return insights;
    }

    // Generate insights about opportunity spectrum
    generateOpportunityInsights(opportunities) {
        const insights = [];

        const best = opportunities[0];
        const worst = opportunities[opportunities.length - 1];

        insights.push(`Highest opportunity: "${best.name}" with ${formatCurrency(best.medianBalance)} median outcome`);
        insights.push(`Most conservative outcome: "${worst.name}" with ${formatCurrency(worst.medianBalance)} median outcome`);

        const balanceDifference = best.medianBalance - worst.medianBalance;
        insights.push(`Strategy selection could impact final balance by ${formatCurrency(balanceDifference)}`);

        return insights;
    }

    // Generate overall matrix summary
    generateMatrixSummary(scenarioResults, baseline) {
        const summary = {
            totalScenariosAnalyzed: scenarioResults.length,
            baselineSuccessRate: baseline.monteCarloResult.successRate,
            baselineMedianBalance: baseline.monteCarloResult.median,
            improvementsPossible: scenarioResults.filter(s =>
                s.monteCarloResult.successRate > baseline.monteCarloResult.successRate + 0.05
            ).length,
            riskReductionsPossible: scenarioResults.filter(s =>
                s.riskScore < baseline.riskScore - 5
            ).length,
            keyFindings: []
        };

        // Generate key findings
        if (summary.improvementsPossible > 0) {
            summary.keyFindings.push(`${summary.improvementsPossible} scenarios show meaningful improvement over current plan`);
        }

        if (summary.riskReductionsPossible > 0) {
            summary.keyFindings.push(`${summary.riskReductionsPossible} scenarios offer lower risk while maintaining returns`);
        }

        const bestImprovement = Math.max(...scenarioResults.map(s => s.monteCarloResult.successRate));
        const improvementPotential = bestImprovement - baseline.monteCarloResult.successRate;
        if (improvementPotential > 0.1) {
            summary.keyFindings.push(`Success rate could potentially improve by ${(improvementPotential * 100).toFixed(0)} percentage points`);
        }

        return summary;
    }

    // Summarize key modifications for a scenario
    summarizeModifications(modifications) {
        const keyMods = [];

        Object.entries(modifications).forEach(([key, value]) => {
            switch (key) {
                case 'retirementAge':
                    keyMods.push(`Retire at ${value}`);
                    break;
                case 'allocEquities':
                    keyMods.push(`${value}% equity allocation`);
                    break;
                case 'percentIncomeSaved':
                    keyMods.push(`Save ${value}% of income`);
                    break;
                case 'planToDownsize':
                    if (value) keyMods.push('Downsize home');
                    break;
                case 'hasInvestmentProperty':
                    if (value) keyMods.push('Add investment property');
                    break;
                case 'nonConcessionalContribution':
                    if (value > 0) keyMods.push(`${formatCurrency(value)} extra super`);
                    break;
            }
        });

        return keyMods.slice(0, 3); // Top 3 key modifications
    }
}