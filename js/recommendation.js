// js/recommendation.js - The Decision Support Engine

import { ENHANCED_CONFIG } from './config.js';
import { formatCurrency, formatPercent, updateProgress } from './utils.js';
import RetirementSimulator from './simulator.js';

class RecommendationEngine {
    constructor(simulator, inputs) {
        if (!simulator || !inputs) {
            throw new Error("RecommendationEngine requires a simulator instance and user inputs.");
        }
        this.simulator = simulator;
        this.baseInputs = inputs;
        this.recommendations = [];
    }

    /**
     * The main method to generate all recommendations.
     * It runs a baseline simulation and then invokes specific analyzers
     * to generate and test alternative scenarios.
     * @returns {Promise<Array<Object>>} A promise that resolves to an array of recommendation objects.
     */
    async generateRecommendations() {
        console.log("Starting recommendation engine...");

        // Step 1: Run baseline simulation to understand the current situation
        const baselineResults = await this.runBaselineSimulation();
        if (!baselineResults) {
            console.error("Baseline simulation failed. Cannot generate recommendations.");
            return [];
        }

        // Step 2: Dynamically generate a list of relevant scenarios to test
        const scenariosToTest = this.generateScenarios(baselineResults);
        if (scenariosToTest.length === 0) {
            console.log("No relevant scenarios to test. The current plan looks optimal.");
            // Or, provide some default recommendations
        }

        // Step 3: Run all generated scenarios against the baseline
        const comparisonResults = await this.runScenarioComparisons(scenariosToTest);

        // Step 4: Analyze the comparison results and format them into human-readable advice
        this.recommendations = this.formatRecommendations(comparisonResults, baselineResults);

        console.log("Recommendation engine finished.");
        return this.recommendations;
    }

    /**
     * Runs the initial Monte Carlo simulation to get baseline metrics.
     * @returns {Promise<Object|null>} The results of the baseline Monte Carlo simulation.
     */
    async runBaselineSimulation() {
        try {
            // Use a reasonable number of runs for the baseline analysis
            const baselineMC = await this.simulator.runMonteCarloSimulation(this.baseInputs, 1000, null);
            const baselineDeterministic = this.simulator.simulateRetirement(this.baseInputs, false);

            return {
                name: "Current Plan",
                description: "Your financial outlook based on the current inputs.",
                monteCarlo: baselineMC,
                deterministic: baselineDeterministic,
                successRate: baselineMC.successRate,
                medianBalance: baselineMC.median
            };
        } catch (error) {
            console.error("Error running baseline simulation:", error);
            return null;
        }
    }

    /**
     * Orchestrates the generation of all potential scenarios based on baseline results.
     * @param {Object} baselineResults - The results from the baseline simulation.
     * @returns {Array<Object>} A list of scenario objects to be tested.
     */
    generateScenarios(baselineResults) {
        let scenarios = [];

        scenarios = scenarios.concat(this._analyzeInvestmentProperty(baselineResults));
        scenarios = scenarios.concat(this._analyzeHomeOwnership(baselineResults));
        scenarios = scenarios.concat(this._analyzeContributions(baselineResults));
        scenarios = scenarios.concat(this._analyzeInvestmentStrategy(baselineResults));
        scenarios = scenarios.concat(this._analyzeRetirementAge(baselineResults));

        // Remove duplicate scenarios if any
        const uniqueScenarios = Array.from(new Map(scenarios.map(s => [s.name, s])).values());

        return uniqueScenarios;
    }

    /**
     * Analyzes scenarios related to selling the primary home (downsizing).
     * @param {Object} baselineResults - The results from the baseline simulation.
     * @returns {Array<Object>} A list of scenarios to test.
     */
    _analyzeHomeOwnership(baselineResults) {
        const scenarios = [];
        const successRate = baselineResults.successRate;
        const { planToDownsize, homeValue } = this.baseInputs;

        // Condition: Not already planning to downsize, home is valuable, and success rate can be improved.
        if (!planToDownsize && homeValue > 1000000 && successRate < 0.85) {
            scenarios.push({
                name: "Downsize Home at Retirement",
                description: "Sell your current home and move to a less expensive one at retirement, unlocking equity to invest.",
                modifications: { planToDownsize: true }
            });
        }
        return scenarios;
    }

    /**
     * Analyzes scenarios related to the investment property.
     * @returns {Array<Object>} A list of scenarios to test.
     */
    _analyzeInvestmentProperty() {
        const scenarios = [];
        if (!this.baseInputs.hasInvestmentProperty) {
            return scenarios;
        }

        const yearsToRetirement = this.baseInputs.retirementAge - this.baseInputs.yourCurrentAge;

        // Scenario 1: Sell property at retirement
        if (yearsToRetirement > 0) {
            scenarios.push({
                name: "Sell Investment Property at Retirement",
                description: `Sell the investment property in ${yearsToRetirement} years (at retirement) and invest the proceeds.`,
                modifications: { sellPropertyYears: yearsToRetirement }
            });
        }

        // Scenario 2: Sell property 5 years from now
        scenarios.push({
            name: "Sell Investment Property in 5 Years",
            description: "Sell the investment property in 5 years and invest the proceeds, potentially capturing growth sooner.",
            modifications: { sellPropertyYears: 5 }
        });

        // Scenario 3: Sell property at age 75
        const yearsToAge75 = 75 - this.baseInputs.yourCurrentAge;
        if (yearsToAge75 > 0) {
            scenarios.push({
                name: "Sell Investment Property at Age 75",
                description: "Hold the property into retirement and sell at age 75, benefiting from rental income for longer.",
                modifications: { sellPropertyYears: yearsToAge75 }
            });
        }

        // Scenario 4: Keep property indefinitely
        scenarios.push({
            name: "Keep Investment Property Indefinitely",
            description: "Retain the investment property throughout retirement for ongoing rental income.",
            modifications: { sellPropertyYears: 0 } // 0 means never sell in the simulator
        });

        return scenarios;
    }

    /**
     * Analyzes scenarios related to increasing contributions.
     * @param {Object} baselineResults - The results from the baseline simulation.
     * @returns {Array<Object>} A list of scenarios to test.
     */
    _analyzeContributions(baselineResults) {
        const scenarios = [];
        if (baselineResults.successRate > 0.95) return scenarios; // Already in great shape

        // Scenario 1: Increase monthly savings/investments
        const increasedContribution = this.baseInputs.monthlyStockContribution + 500;
        scenarios.push({
            name: "Increase Monthly Investments by $500",
            description: `Boost your monthly investment contributions to ${formatCurrency(increasedContribution)} to accelerate asset growth.`,
            modifications: { monthlyStockContribution: increasedContribution }
        });

        // Scenario 2: Make additional super contributions (simplified)
        // A more complex implementation would check concessional/non-concessional caps.
        // For now, we simulate a simple increase in the savings rate, assuming it goes to super.
        const increasedSavingsRate = this.baseInputs.percentIncomeSaved * 1.25; // Increase by 25%
        scenarios.push({
            name: "Increase Savings Rate",
            description: `Increase your savings rate from ${formatPercent(this.baseInputs.percentIncomeSaved, 1)} to ${formatPercent(increasedSavingsRate, 1)} of your post-tax income.`,
            modifications: { percentIncomeSaved: increasedSavingsRate }
        });

        return scenarios;
    }

    /**
     * Analyzes scenarios related to investment strategy (asset allocation).
     * @returns {Array<Object>} A list of scenarios to test.
     */
    _analyzeInvestmentStrategy() {
        const scenarios = [];
        const currentEquities = this.baseInputs.allocEquities;

        // Scenario 1: More aggressive allocation
        if (currentEquities < 80) {
            let newEquities = Math.min(90, currentEquities + 15);
            let newBonds = Math.max(5, this.baseInputs.allocBonds - 10);
            let newCash = Math.max(5, this.baseInputs.allocCash - 5);
            const total = newEquities + newBonds + newCash;
            if (total !== 100) {
                newEquities = Math.round((newEquities / total) * 100);
                newBonds = Math.round((newBonds / total) * 100);
                newCash = 100 - newEquities - newBonds;
            }
            scenarios.push({
                name: "Adopt a More Aggressive Strategy",
                description: "Increase equity allocation by 15% for potentially higher long-term returns, accepting higher volatility.",
                modifications: {
                    useGlidePath: false,
                    allocEquities: newEquities,
                    allocBonds: newBonds,
                    allocCash: newCash
                }
            });
        }

        // Scenario 2: More conservative allocation
        if (currentEquities > 30) {
            let newEquities = Math.max(20, currentEquities - 15);
            let newBonds = Math.min(70, this.baseInputs.allocBonds + 10);
            let newCash = Math.min(20, this.baseInputs.allocCash + 5);
            const total = newEquities + newBonds + newCash;
            if (total !== 100) {
                newEquities = Math.round((newEquities / total) * 100);
                newBonds = Math.round((newBonds / total) * 100);
                newCash = 100 - newEquities - newBonds;
            }
            scenarios.push({
                name: "Adopt a More Conservative Strategy",
                description: "Decrease equity allocation by 15% to reduce portfolio risk, potentially lowering long-term returns.",
                modifications: {
                    useGlidePath: false,
                    allocEquities: newEquities,
                    allocBonds: newBonds,
                    allocCash: newCash
                }
            });
        }
        return scenarios;
    }

    /**
     * Analyzes scenarios related to changing the retirement age.
     * @param {Object} baselineResults - The results from the baseline simulation.
     * @returns {Array<Object>} A list of scenarios to test.
     */
    _analyzeRetirementAge(baselineResults) {
        const scenarios = [];
        if (baselineResults.successRate > 0.90) return scenarios; // No need to delay if already successful

        // Scenario 1: Retire 2 years later
        scenarios.push({
            name: "Retire 2 Years Later",
            description: "Work for an additional 2 years to allow for more contributions and investment growth.",
            modifications: {
                retirementAge: this.baseInputs.retirementAge + 2,
                partnerRetirementAge: this.baseInputs.partnerRetirementAge + 2
            }
        });

        // Scenario 2: Retire 5 years later (if success rate is poor)
        if (baselineResults.successRate < 0.6) {
            scenarios.push({
                name: "Retire 5 Years Later",
                description: "Working for an additional 5 years can significantly improve your retirement outcome.",
                modifications: {
                    retirementAge: this.baseInputs.retirementAge + 5,
                    partnerRetirementAge: this.baseInputs.partnerRetirementAge + 5
                }
            });
        }
        return scenarios;
    }

    /**
     * Runs the scenario comparison simulation.
     * @param {Array<Object>} scenarios - The list of scenarios to test.
     * @returns {Promise<Object>} The results from the scenario comparison.
     */
    async runScenarioComparisons(scenarios) {
        if (scenarios.length === 0) {
            return [];
        }
        // The first scenario is always the baseline
        const allScenarios = [
            { name: "Current Plan", description: "Your current strategy", modifications: {} },
            ...scenarios
        ];

        const results = await this.simulator.runScenarioComparison(this.baseInputs, allScenarios);
        return results.scenarios;
    }

    /**
     * Formats the raw comparison results into actionable recommendations.
     * @param {Array<Object>} comparisonResults - The results from runScenarioComparisons.
     * @param {Object} baselineResults - The baseline simulation results for comparison.
     * @returns {Array<Object>} A list of formatted recommendation objects.
     */
    formatRecommendations(comparisonResults, baselineResults) {
        const recommendations = [];
        if (!comparisonResults || comparisonResults.length <= 1) {
            return recommendations;
        }

        // The first result is always the baseline
        const baseResult = comparisonResults[0];

        // Sort scenarios by the biggest improvement in success rate
        const sortedScenarios = comparisonResults.slice(1).sort((a, b) => {
            return b.successRate - a.successRate;
        });

        for (const scenario of sortedScenarios) {
            const recommendation = this._createRecommendation(scenario, baseResult);
            if (recommendation) {
                recommendations.push(recommendation);
            }
        }

        return recommendations;
    }

    /**
     * Creates a single recommendation object by categorizing and formatting the scenario result.
     * @param {Object} scenario - The scenario result object.
     * @param {Object} baseResult - The baseline result for comparison.
     * @returns {Object|null} A formatted recommendation object or null.
     */
    _createRecommendation(scenario, baseResult) {
        const successDiff = scenario.successRate - baseResult.successRate;
        const balanceDiff = scenario.medianBalance - baseResult.medianBalance;

        // Ignore scenarios that don't make a meaningful difference
        if (Math.abs(successDiff) < 0.01 && Math.abs(balanceDiff) < 10000) {
            return null;
        }

        let category = "General";
        let title = scenario.name;
        let summary = "";
        let impact = "neutral";

        if (successDiff > 0.05) impact = "high-positive";
        else if (successDiff > 0) impact = "positive";
        else if (successDiff < -0.05) impact = "high-negative";
        else if (successDiff < 0) impact = "negative";

        // Categorize and format based on scenario name
        if (scenario.name.includes("Property")) {
            category = "Investment Property";
            summary = this._formatPropertyRecommendation(scenario, baseResult);
        } else if (scenario.name.includes("Downsize")) {
            category = "Home Ownership";
            summary = this._formatDownsizeRecommendation(scenario, baseResult);
        } else if (scenario.name.includes("Increase") || scenario.name.includes("Savings Rate")) {
            category = "Contributions";
            summary = this._formatContributionRecommendation(scenario, baseResult);
        } else if (scenario.name.includes("Strategy")) {
            category = "Investment Strategy";
            summary = this._formatAllocationRecommendation(scenario, baseResult);
        } else if (scenario.name.includes("Retire")) {
            category = "Retirement Age";
            summary = this._formatRetirementAgeRecommendation(scenario, baseResult);
        } else {
            summary = `This strategy changes your success rate by ${formatPercent(successDiff, 1)} and median final balance by ${formatCurrency(balanceDiff)}.`;
        }

        return {
            title,
            category,
            summary,
            impact,
            successRate: scenario.successRate,
            medianBalance: scenario.medianBalance,
            successRateDiff: successDiff,
            medianBalanceDiff: balanceDiff
        };
    }

    _formatPropertyRecommendation(scenario, baseResult) {
        const successDiff = scenario.successRate - baseResult.successRate;

        let netProceeds = 0;
        if (scenario.deterministicResult?.propertyWasSold && scenario.deterministicResult.propertyHistory) {
            const saleEntry = scenario.deterministicResult.propertyHistory.find(entry => entry.saleResult);
            if (saleEntry && saleEntry.saleResult) {
                netProceeds = saleEntry.saleResult.netProceeds;
            }
        }

        let actionText = "";
        if (scenario.name.includes("at Retirement")) {
            actionText = "Selling your investment property when you retire";
        } else if (scenario.name.includes("in 5 Years")) {
            actionText = "Selling your investment property in 5 years";
        } else if (scenario.name.includes("at Age 75")) {
            actionText = "Holding your property until age 75 before selling";
        } else if (scenario.name.includes("Indefinitely")) {
            actionText = "Keeping your investment property throughout retirement";
        }

        const successChangeText = successDiff >= 0 ? `improves your success probability from ${formatPercent(baseResult.successRate)} to ${formatPercent(scenario.successRate)}` : `reduces your success probability from ${formatPercent(baseResult.successRate)} to ${formatPercent(scenario.successRate)}`;
        const proceedsText = netProceeds > 0 ? ` by unlocking approximately ${formatCurrency(netProceeds)} in equity` : "";
        const incomeText = scenario.name.includes("Indefinitely") ? " to provide ongoing rental income" : "";

        return `${actionText} ${successChangeText}${proceedsText}${incomeText}.`;
    }

    _formatDownsizeRecommendation(scenario, baseResult) {
        const successDiff = scenario.successRate - baseResult.successRate;
        const equityText = `unlocking ${formatCurrency(scenario.deterministicResult.accessibleHomeEquity)} of home equity`;

        return `Downsizing your home at retirement improves your success rate by ${formatPercent(successDiff, 1)}, ${equityText} to bolster your investment portfolio.`;
    }

    _formatContributionRecommendation(scenario, baseResult) {
        const successDiff = scenario.successRate - baseResult.successRate;
        const balanceDiff = scenario.medianBalance - baseResult.medianBalance;

        let actionText = "";
        if (scenario.name.includes("by $500")) {
            actionText = "Increasing your monthly investments by $500";
        } else {
            actionText = "Increasing your savings rate";
        }

        return `${actionText} improves your success rate by ${formatPercent(successDiff, 1)} and adds an estimated ${formatCurrency(balanceDiff)} to your median final balance. This is a highly effective strategy if you have the available cash flow.`;
    }

    _formatAllocationRecommendation(scenario, baseResult) {
        const successDiff = scenario.successRate - baseResult.successRate;
        const balanceDiff = scenario.medianBalance - baseResult.medianBalance;

        let tradeOffText = "";
        if (successDiff < 0 && balanceDiff > 0) {
            tradeOffText = `This is a trade-off between higher potential growth and short-term security.`;
        } else if (successDiff > 0 && balanceDiff < 0) {
            tradeOffText = `This strategy increases your security at the cost of lower potential long-term growth.`;
        }

        return `Adopting a ${scenario.name.includes("Aggressive") ? "more aggressive" : "more conservative"} allocation changes your median outcome by ${formatCurrency(balanceDiff)} and your success probability by ${formatPercent(successDiff, 1)}. ${tradeOffText}`;
    }

    _formatRetirementAgeRecommendation(scenario, baseResult) {
        const age = scenario.modifications?.retirementAge;
        if (typeof age === "number" && !isNaN(age)) {
            return `Working for additional years to retire at age ${age} increases your success rate from ${formatPercent(baseResult.successRate)} to ${formatPercent(scenario.successRate)}. This is one of the most powerful levers for improving your retirement outlook.`;
        } else {
            return `Working additional years increases your success rate from ${formatPercent(baseResult.successRate)} to ${formatPercent(scenario.successRate)}. This is one of the most powerful levers for improving your retirement outlook.`;
        }
    }
}

export default RecommendationEngine;
