// scenario-matrix.js - Comprehensive Scenario Comparison Matrix
// Provides side-by-side analysis of different retirement strategies

import { ENHANCED_CONFIG } from './config.js';
import { ENHANCED_FINANCIAL_CONFIG } from './enhanced-config.js';
import { formatCurrency, formatPercent } from './utils.js';

export class ScenarioComparisonMatrix {
    constructor(simulator) {
        this.simulator = simulator;
        this.config = ENHANCED_CONFIG;
        this.financialConfig = ENHANCED_FINANCIAL_CONFIG;
    }

    // Generate comprehensive scenario matrix for different strategies
    async generateScenarioMatrix(baseInputs, progressCallback = null) {
        const scenarios = this.generateScenarioVariations(baseInputs);
        const results = [];

        for (let i = 0; i < scenarios.length; i++) {
            const scenario = scenarios[i];
            const progressPercent = (i / scenarios.length) * 100;

            if (progressCallback) {
                await progressCallback(progressPercent, `Analyzing ${scenario.name}...`);
            }

            // Run both deterministic and Monte Carlo for each scenario
            const deterministicResult = this.simulator.simulateRetirement(scenario.inputs, false);
            const monteCarloResult = await this.simulator.runEnhancedMonteCarloSimulation(
                scenario.inputs, 2000, null
            );

            results.push({
                ...scenario,
                deterministicResult,
                monteCarloResult,
                comparisonMetrics: this.calculateComparisonMetrics(
                    deterministicResult,
                    monteCarloResult,
                    baseInputs
                )
            });
        }

        return this.formatScenarioMatrix(results, baseInputs);
    }

    // Generate different scenario variations for comparison
    generateScenarioVariations(baseInputs) {
        const scenarios = [
            {
                name: "Current Plan",
                description: "Your current retirement strategy",
                category: "baseline",
                inputs: { ...baseInputs },
                color: "#3B82F6"
            }
        ];

        // Contribution variations
        scenarios.push({
            name: "Extra $200/month",
            description: "Increase monthly investment by $200",
            category: "contributions",
            inputs: {
                ...baseInputs,
                monthlyInvestment: (baseInputs.monthlyInvestment || 0) + 200
            },
            color: "#10B981"
        });

        scenarios.push({
            name: "Extra $500/month",
            description: "Increase monthly investment by $500",
            category: "contributions",
            inputs: {
                ...baseInputs,
                monthlyInvestment: (baseInputs.monthlyInvestment || 0) + 500
            },
            color: "#059669"
        });

        scenarios.push({
            name: "Max Super Contributions",
            description: "Maximize superannuation contributions ($27,500/year)",
            category: "contributions",
            inputs: {
                ...baseInputs,
                yourSuper: Math.min(27500, baseInputs.yourSalary * 0.1),
                partnerSuper: baseInputs.isSingleCalculation ? 0 :
                    Math.min(27500, baseInputs.partnerSalary * 0.1)
            },
            color: "#047857"
        });

        // Retirement age variations
        const ageVariations = [-2, -1, 1, 2, 3];
        ageVariations.forEach(adjustment => {
            const newAge = baseInputs.retirementAge + adjustment;
            if (newAge >= 60 && newAge <= 75) {
                scenarios.push({
                    name: `Retire at ${newAge}`,
                    description: `${adjustment > 0 ? 'Delay' : 'Advance'} retirement by ${Math.abs(adjustment)} year${Math.abs(adjustment) > 1 ? 's' : ''}`,
                    category: "retirement_age",
                    inputs: {
                        ...baseInputs,
                        retirementAge: newAge
                    },
                    color: adjustment > 0 ? "#DC2626" : "#7C3AED"
                });
            }
        });

        // Asset allocation variations
        scenarios.push({
            name: "Conservative (50/30/20)",
            description: "Lower risk portfolio allocation",
            category: "allocation",
            inputs: {
                ...baseInputs,
                equityAllocation: 50,
                bondsAllocation: 30,
                cashAllocation: 20
            },
            color: "#F59E0B"
        });

        scenarios.push({
            name: "Aggressive (80/15/5)",
            description: "Higher risk portfolio allocation",
            category: "allocation",
            inputs: {
                ...baseInputs,
                equityAllocation: 80,
                bondsAllocation: 15,
                cashAllocation: 5
            },
            color: "#EF4444"
        });

        scenarios.push({
            name: "Balanced (65/25/10)",
            description: "Balanced portfolio allocation",
            category: "allocation",
            inputs: {
                ...baseInputs,
                equityAllocation: 65,
                bondsAllocation: 25,
                cashAllocation: 10
            },
            color: "#8B5CF6"
        });

        // Property scenarios (if applicable)
        if (baseInputs.hasInvestmentProperty) {
            scenarios.push({
                name: "Sell Property Early",
                description: "Sell investment property 5 years earlier",
                category: "property",
                inputs: {
                    ...baseInputs,
                    propertyStrategy: "sell_early"
                },
                color: "#F97316"
            });

            scenarios.push({
                name: "Keep Property Forever",
                description: "Never sell investment property",
                category: "property",
                inputs: {
                    ...baseInputs,
                    propertyStrategy: "keep_forever"
                },
                color: "#06B6D4"
            });
        }

        // Expense variations
        scenarios.push({
            name: "Reduced Expenses (-20%)",
            description: "Lower retirement income needs",
            category: "expenses",
            inputs: {
                ...baseInputs,
                desiredRetirementIncome: baseInputs.desiredRetirementIncome * 0.8
            },
            color: "#84CC16"
        });

        scenarios.push({
            name: "Higher Expenses (+20%)",
            description: "Higher retirement income needs",
            category: "expenses",
            inputs: {
                ...baseInputs,
                desiredRetirementIncome: baseInputs.desiredRetirementIncome * 1.2
            },
            color: "#EC4899"
        });

        // Market return scenarios
        scenarios.push({
            name: "Conservative Returns (5%)",
            description: "Lower market return expectations",
            category: "returns",
            inputs: {
                ...baseInputs,
                expectedReturn: 5
            },
            color: "#6B7280"
        });

        scenarios.push({
            name: "Optimistic Returns (9%)",
            description: "Higher market return expectations",
            category: "returns",
            inputs: {
                ...baseInputs,
                expectedReturn: 9
            },
            color: "#10B981"
        });

        return scenarios.slice(0, 12); // Limit to 12 scenarios for performance
    }

    // Calculate comparison metrics for each scenario
    calculateComparisonMetrics(deterministicResult, monteCarloResult, baseInputs) {
        const baseFinalBalance = baseInputs.currentSavings + baseInputs.yourCurrentSuper + baseInputs.partnerCurrentSuper;

        return {
            finalBalance: deterministicResult.finalBalance,
            successRate: monteCarloResult.successRate,
            median: monteCarloResult.median,
            percentile10: monteCarloResult.percentiles?.p10 || 0,
            percentile90: monteCarloResult.percentiles?.p90 || 0,
            tailRisk: monteCarloResult.var95 || monteCarloResult.percentiles?.p5 || 0,
            riskAdjustedReturn: this.calculateRiskAdjustedReturn(monteCarloResult),
            sharpeRatio: this.calculateSharpeRatio(monteCarloResult),
            maxDrawdown: this.calculateMaxDrawdown(deterministicResult.balances),
            probabilityOfSuccess: monteCarloResult.successRate,
            expectedShortfall: monteCarloResult.cvar95 || 0,
            volatility: monteCarloResult.standardDeviation || 0,
            skewness: monteCarloResult.skewness || 0
        };
    }

    // Calculate risk-adjusted return metric
    calculateRiskAdjustedReturn(monteCarloResult) {
        if (!monteCarloResult.mean || !monteCarloResult.standardDeviation) return 0;
        return monteCarloResult.mean / Math.max(monteCarloResult.standardDeviation, 1);
    }

    // Calculate Sharpe ratio approximation
    calculateSharpeRatio(monteCarloResult) {
        if (!monteCarloResult.mean || !monteCarloResult.standardDeviation) return 0;
        const riskFreeRate = 50000; // Approximate risk-free outcome
        return (monteCarloResult.mean - riskFreeRate) / Math.max(monteCarloResult.standardDeviation, 1);
    }

    // Calculate maximum drawdown from balance history
    calculateMaxDrawdown(balances) {
        if (!balances || balances.length === 0) return 0;

        let maxDrawdown = 0;
        let peak = balances[0];

        for (let i = 1; i < balances.length; i++) {
            if (balances[i] > peak) {
                peak = balances[i];
            } else {
                const drawdown = (peak - balances[i]) / peak;
                maxDrawdown = Math.max(maxDrawdown, drawdown);
            }
        }

        return maxDrawdown;
    }

    // Format scenario matrix results for display
    formatScenarioMatrix(results, baseInputs) {
        const baselineResult = results.find(r => r.category === "baseline");

        return {
            scenarios: results,
            summary: this.generateMatrixSummary(results, baselineResult),
            rankings: this.rankScenarios(results),
            insights: this.generateScenarioInsights(results, baselineResult),
            recommendations: this.generateScenarioRecommendations(results, baseInputs)
        };
    }

    // Generate matrix summary statistics
    generateMatrixSummary(results, baseline) {
        const metrics = results.map(r => r.comparisonMetrics);

        return {
            totalScenariosAnalyzed: results.length,
            averageSuccessRate: metrics.reduce((sum, m) => sum + m.successRate, 0) / metrics.length,
            bestSuccessRate: Math.max(...metrics.map(m => m.successRate)),
            worstSuccessRate: Math.min(...metrics.map(m => m.successRate)),
            averageMedianOutcome: metrics.reduce((sum, m) => sum + m.median, 0) / metrics.length,
            bestMedianOutcome: Math.max(...metrics.map(m => m.median)),
            worstMedianOutcome: Math.min(...metrics.map(m => m.median)),
            baselineComparison: baseline ? {
                successRate: baseline.comparisonMetrics.successRate,
                median: baseline.comparisonMetrics.median
            } : null
        };
    }

    // Rank scenarios by multiple criteria
    rankScenarios(results) {
        const scoredResults = results.map(result => ({
            ...result,
            compositeScore: this.calculateCompositeScore(result.comparisonMetrics)
        }));

        return {
            byCompositeScore: scoredResults
                .sort((a, b) => b.compositeScore - a.compositeScore),
            bySuccessRate: results
                .sort((a, b) => b.comparisonMetrics.successRate - a.comparisonMetrics.successRate),
            byMedianOutcome: results
                .sort((a, b) => b.comparisonMetrics.median - a.comparisonMetrics.median),
            byRiskAdjusted: results
                .sort((a, b) => b.comparisonMetrics.riskAdjustedReturn - a.comparisonMetrics.riskAdjustedReturn),
            byTailRisk: results
                .sort((a, b) => b.comparisonMetrics.tailRisk - a.comparisonMetrics.tailRisk)
        };
    }

    // Calculate composite score for scenario ranking
    calculateCompositeScore(metrics) {
        // Weighted composite score prioritizing success rate and risk-adjusted returns
        const weights = {
            successRate: 0.4,
            riskAdjustedReturn: 0.3,
            median: 0.2,
            tailRisk: 0.1
        };

        // Normalize metrics to 0-100 scale
        const normalizedSuccessRate = metrics.successRate * 100;
        const normalizedRiskAdjusted = Math.max(0, Math.min(100, (metrics.riskAdjustedReturn + 1) * 50));
        const normalizedMedian = Math.max(0, Math.min(100, metrics.median / 5000)); // Assuming 500k is excellent
        const normalizedTailRisk = Math.max(0, Math.min(100, (metrics.tailRisk + 200000) / 4000)); // Less negative is better

        return weights.successRate * normalizedSuccessRate +
               weights.riskAdjustedReturn * normalizedRiskAdjusted +
               weights.median * normalizedMedian +
               weights.tailRisk * normalizedTailRisk;
    }

    // Generate insights from scenario analysis
    generateScenarioInsights(results, baseline) {
        const insights = [];

        if (!baseline) return insights;

        // Find best performing scenarios
        const bestOverall = results.reduce((best, current) =>
            current.comparisonMetrics.successRate > best.comparisonMetrics.successRate ? current : best
        );

        const mostImproved = results
            .filter(r => r.category !== "baseline")
            .reduce((best, current) => {
                const improvement = current.comparisonMetrics.successRate - baseline.comparisonMetrics.successRate;
                const bestImprovement = best.comparisonMetrics.successRate - baseline.comparisonMetrics.successRate;
                return improvement > bestImprovement ? current : best;
            });

        insights.push({
            type: "best_performer",
            title: "Top Performing Strategy",
            message: `The "${bestOverall.name}" strategy shows the highest success rate at ${(bestOverall.comparisonMetrics.successRate * 100).toFixed(1)}%, with a median outcome of ${formatCurrency(bestOverall.comparisonMetrics.median)}.`,
            scenario: bestOverall.name,
            impact: (bestOverall.comparisonMetrics.successRate - baseline.comparisonMetrics.successRate) * 100
        });

        if (mostImproved && mostImproved.comparisonMetrics.successRate > baseline.comparisonMetrics.successRate) {
            insights.push({
                type: "biggest_improvement",
                title: "Highest Impact Change",
                message: `${mostImproved.name} provides the biggest improvement over your current plan, increasing success rate by ${((mostImproved.comparisonMetrics.successRate - baseline.comparisonMetrics.successRate) * 100).toFixed(1)} percentage points.`,
                scenario: mostImproved.name,
                impact: (mostImproved.comparisonMetrics.successRate - baseline.comparisonMetrics.successRate) * 100
            });
        }

        // Analyze category performance
        const categoryPerformance = this.analyzeCategoryPerformance(results, baseline);
        categoryPerformance.forEach(category => {
            if (category.averageImprovement > 0) {
                insights.push({
                    type: "category_insight",
                    title: `${category.name} Impact`,
                    message: `${category.name} strategies show an average success rate improvement of ${category.averageImprovement.toFixed(1)} percentage points.`,
                    category: category.category,
                    impact: category.averageImprovement
                });
            }
        });

        return insights;
    }

    // Analyze performance by category
    analyzeCategoryPerformance(results, baseline) {
        const categories = {};

        results.forEach(result => {
            if (result.category === "baseline") return;

            if (!categories[result.category]) {
                categories[result.category] = {
                    name: this.getCategoryDisplayName(result.category),
                    category: result.category,
                    results: [],
                    improvements: []
                };
            }

            categories[result.category].results.push(result);
            categories[result.category].improvements.push(
                (result.comparisonMetrics.successRate - baseline.comparisonMetrics.successRate) * 100
            );
        });

        return Object.values(categories).map(category => ({
            ...category,
            averageImprovement: category.improvements.reduce((sum, imp) => sum + imp, 0) / category.improvements.length,
            bestImprovement: Math.max(...category.improvements),
            worstImprovement: Math.min(...category.improvements)
        }));
    }

    // Get display name for category
    getCategoryDisplayName(category) {
        const names = {
            contributions: "Increasing Contributions",
            retirement_age: "Retirement Timing",
            allocation: "Asset Allocation",
            property: "Property Strategy",
            expenses: "Expense Management",
            returns: "Market Expectations"
        };
        return names[category] || category;
    }

    // Generate scenario recommendations
    generateScenarioRecommendations(results, baseInputs) {
        const recommendations = [];
        const baseline = results.find(r => r.category === "baseline");
        if (!baseline) return recommendations;

        // Find scenarios with meaningful improvements
        const improvedScenarios = results
            .filter(r => r.category !== "baseline")
            .filter(r => r.comparisonMetrics.successRate > baseline.comparisonMetrics.successRate + 0.05)
            .sort((a, b) => b.comparisonMetrics.successRate - a.comparisonMetrics.successRate)
            .slice(0, 5);

        improvedScenarios.forEach((scenario, index) => {
            const improvement = (scenario.comparisonMetrics.successRate - baseline.comparisonMetrics.successRate) * 100;
            const medianImprovement = scenario.comparisonMetrics.median - baseline.comparisonMetrics.median;

            let difficulty = "Easy";
            let timeframe = "Immediate";

            // Assess implementation difficulty
            if (scenario.category === "contributions") {
                difficulty = medianImprovement > 100000 ? "Moderate" : "Easy";
                timeframe = "Next payroll cycle";
            } else if (scenario.category === "retirement_age") {
                difficulty = "Easy";
                timeframe = "Retirement planning";
            } else if (scenario.category === "allocation") {
                difficulty = "Easy";
                timeframe = "Next investment review";
            } else if (scenario.category === "property") {
                difficulty = "Complex";
                timeframe = "6-12 months";
            }

            recommendations.push({
                rank: index + 1,
                scenario: scenario.name,
                description: scenario.description,
                category: scenario.category,
                impact: improvement,
                medianImprovement,
                difficulty,
                timeframe,
                successRate: scenario.comparisonMetrics.successRate,
                riskLevel: this.assessRiskLevel(scenario.comparisonMetrics),
                priority: this.calculatePriority(improvement, difficulty)
            });
        });

        return recommendations;
    }

    // Assess risk level of scenario
    assessRiskLevel(metrics) {
        const volatility = metrics.volatility || 0;
        const tailRisk = Math.abs(metrics.tailRisk || 0);

        if (tailRisk < 50000 && volatility < 100000) return "Low";
        if (tailRisk < 150000 && volatility < 200000) return "Moderate";
        return "High";
    }

    // Calculate priority score for recommendations
    calculatePriority(improvement, difficulty) {
        const difficultyScore = difficulty === "Easy" ? 3 : difficulty === "Moderate" ? 2 : 1;
        const impactScore = improvement > 20 ? 3 : improvement > 10 ? 2 : 1;

        const score = impactScore * 2 + difficultyScore;

        if (score >= 8) return "High";
        if (score >= 6) return "Medium";
        return "Low";
    }

    // Generate HTML display for scenario matrix
    generateMatrixHTML(matrixResults) {
        const { scenarios, summary, rankings, insights, recommendations } = matrixResults;

        return `
            <div class="scenario-matrix-container">
                <div class="mb-6">
                    <h3 class="text-2xl font-bold text-gray-800 mb-2">📊 Scenario Comparison Matrix</h3>
                    <p class="text-gray-600">Compare different retirement strategies side-by-side</p>
                </div>

                <!-- Summary Statistics -->
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div class="bg-white p-4 rounded-lg shadow border">
                        <div class="text-sm text-gray-600">Scenarios Analyzed</div>
                        <div class="text-2xl font-bold text-blue-600">${summary.totalScenariosAnalyzed}</div>
                    </div>
                    <div class="bg-white p-4 rounded-lg shadow border">
                        <div class="text-sm text-gray-600">Best Success Rate</div>
                        <div class="text-2xl font-bold text-green-600">${(summary.bestSuccessRate * 100).toFixed(1)}%</div>
                    </div>
                    <div class="bg-white p-4 rounded-lg shadow border">
                        <div class="text-sm text-gray-600">Best Outcome</div>
                        <div class="text-2xl font-bold text-emerald-600">${formatCurrency(summary.bestMedianOutcome)}</div>
                    </div>
                    <div class="bg-white p-4 rounded-lg shadow border">
                        <div class="text-sm text-gray-600">Average Success Rate</div>
                        <div class="text-2xl font-bold text-blue-600">${(summary.averageSuccessRate * 100).toFixed(1)}%</div>
                    </div>
                </div>

                <!-- Top Recommendations -->
                <div class="bg-white p-6 rounded-lg shadow border mb-6">
                    <h4 class="text-lg font-semibold text-gray-800 mb-4">🎯 Top Recommendations</h4>
                    <div class="space-y-3">
                        ${recommendations.slice(0, 3).map(rec => `
                            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div class="flex-1">
                                    <div class="flex items-center gap-2 mb-1">
                                        <span class="px-2 py-1 text-xs font-medium rounded ${this.getPriorityColor(rec.priority)}">${rec.priority}</span>
                                        <span class="font-medium text-gray-800">${rec.scenario}</span>
                                    </div>
                                    <div class="text-sm text-gray-600">${rec.description}</div>
                                    <div class="text-xs text-gray-500 mt-1">
                                        Difficulty: ${rec.difficulty} • Impact: +${rec.impact.toFixed(1)}% success rate
                                    </div>
                                </div>
                                <div class="text-right">
                                    <div class="text-sm font-medium text-green-600">+${rec.impact.toFixed(1)}%</div>
                                    <div class="text-xs text-gray-500">${(rec.successRate * 100).toFixed(1)}% success</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Scenario Comparison Table -->
                <div class="bg-white rounded-lg shadow border overflow-hidden mb-6">
                    <div class="overflow-x-auto">
                        <table class="w-full">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Strategy</th>
                                    <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Success Rate</th>
                                    <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Median Outcome</th>
                                    <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">10th Percentile</th>
                                    <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">90th Percentile</th>
                                    <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Risk Level</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                ${rankings.byCompositeScore.slice(0, 8).map((scenario, index) => `
                                    <tr class="${scenario.category === 'baseline' ? 'bg-blue-50' : ''}">
                                        <td class="px-4 py-3">
                                            <div class="flex items-center">
                                                <div class="w-3 h-3 rounded-full mr-3" style="background-color: ${scenario.color}"></div>
                                                <div>
                                                    <div class="font-medium text-gray-900">${scenario.name}</div>
                                                    <div class="text-sm text-gray-500">${scenario.description}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td class="px-4 py-3 text-center">
                                            <span class="font-medium ${scenario.comparisonMetrics.successRate > 0.8 ? 'text-green-600' : scenario.comparisonMetrics.successRate > 0.6 ? 'text-yellow-600' : 'text-red-600'}">
                                                ${(scenario.comparisonMetrics.successRate * 100).toFixed(1)}%
                                            </span>
                                        </td>
                                        <td class="px-4 py-3 text-center text-sm font-medium">
                                            ${formatCurrency(scenario.comparisonMetrics.median)}
                                        </td>
                                        <td class="px-4 py-3 text-center text-sm">
                                            ${formatCurrency(scenario.comparisonMetrics.percentile10)}
                                        </td>
                                        <td class="px-4 py-3 text-center text-sm">
                                            ${formatCurrency(scenario.comparisonMetrics.percentile90)}
                                        </td>
                                        <td class="px-4 py-3 text-center">
                                            <span class="px-2 py-1 text-xs font-medium rounded ${this.getRiskLevelColor(this.assessRiskLevel(scenario.comparisonMetrics))}">
                                                ${this.assessRiskLevel(scenario.comparisonMetrics)}
                                            </span>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Key Insights -->
                <div class="bg-white p-6 rounded-lg shadow border">
                    <h4 class="text-lg font-semibold text-gray-800 mb-4">💡 Key Insights</h4>
                    <div class="space-y-3">
                        ${insights.map(insight => `
                            <div class="p-3 bg-gray-50 rounded-lg">
                                <div class="font-medium text-gray-800 mb-1">${insight.title}</div>
                                <div class="text-sm text-gray-600">${insight.message}</div>
                                ${insight.impact ? `<div class="text-xs text-green-600 mt-1">Impact: +${insight.impact.toFixed(1)} percentage points</div>` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    // Helper function to get priority color classes
    getPriorityColor(priority) {
        const colors = {
            "High": "bg-red-100 text-red-800",
            "Medium": "bg-yellow-100 text-yellow-800",
            "Low": "bg-green-100 text-green-800"
        };
        return colors[priority] || colors["Low"];
    }

    // Helper function to get risk level color classes
    getRiskLevelColor(riskLevel) {
        const colors = {
            "Low": "bg-green-100 text-green-800",
            "Moderate": "bg-yellow-100 text-yellow-800",
            "High": "bg-red-100 text-red-800"
        };
        return colors[riskLevel] || colors["Moderate"];
    }
}