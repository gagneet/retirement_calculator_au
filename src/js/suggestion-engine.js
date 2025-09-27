// js/suggestion-engine.js - The New Dynamic and Comprehensive Suggestion Engine

import { ENHANCED_CONFIG } from './config.js';
import { formatCurrency, formatPercent } from './utils.js';
import MarketDataEngine from './market-data.js';

export class SuggestionEngine {
    constructor(simulator, inputs, results) {
        this.simulator = simulator;
        this.inputs = inputs;
        this.results = results;
        this.marketData = new MarketDataEngine();
        this.suggestions = [];
    }

    // Main method to generate all recommendations
    async generateSuggestions() {
        console.log("Starting comprehensive suggestion engine...");

        // 1. Generate specific, persona-based suggestions first
        this.generateSuggestionsForSarah();
        this.generateSuggestionsForMarkAndLisa();
        this.generateSuggestionsForRobert();
        this.generateSuggestionsForJenny();

        // 2. Run baseline simulation for deeper, scenario-based analysis
        const baseline = await this.runBaselineAnalysis();
        if (baseline) {
            const recommendationPromises = [
                this.analyzeHomeOwnership(baseline),
                this.analyzeInvestmentProperty(baseline),
                this.analyzeStocksAndShares(baseline),
                this.analyzeTrustStructures(baseline),
                this.analyzeEarlyRetirement(baseline),
                this.analyzeInvestmentOptimization(baseline),
                this.analyzeSuperannuationStrategy(baseline),
                this.analyzeAdditionalStrategies(baseline)
            ];

            const allCategoryRecs = await Promise.all(recommendationPromises);
            allCategoryRecs.forEach(catRecs => {
                if (Array.isArray(catRecs)) {
                    this.suggestions.push(...catRecs);
                }
            });
        }

        // 3. Prioritize and return all collected suggestions
        return this.prioritizeSuggestions();
    }

    // --- Persona-based suggestions ---
    generateSuggestionsForSarah() {
        const { yourSalary, yourCurrentAge, retirementAge } = this.inputs;
        const preservationAge = this.getPreservationAge(yourCurrentAge);
        const div293Threshold = 250000;

        // Suggestion for Division 293 Tax
        if (yourSalary > div293Threshold) {
            const concessionalContribution = yourSalary * this.inputs.employerSuperContribution;
            const taxableContribution = Math.min(concessionalContribution, 27500);
            const div293Impact = taxableContribution * 0.15;
            const netContribution = taxableContribution - div293Impact;

            this.suggestions.push({
                category: "Tax & Super",
                priority: "High",
                title: "Optimize for Division 293 Tax",
                description: `Your salary of ${formatCurrency(yourSalary)} triggers Division 293 tax, adding an extra 15% tax on your super contributions, costing you an estimated ${formatCurrency(div293Impact)} this year.`,
                actions: [
                    `Your effective concessional contribution is closer to ${formatCurrency(netContribution)} instead of ${formatCurrency(taxableContribution)}.`,
                    "Consider strategies like salary sacrificing to a car or using non-concessional contributions to build wealth outside this tax.",
                    "Maximizing non-concessional contributions up to the $110,000 cap can be more tax-effective."
                ],
                confidence: 0.95
            });
        }

        // Suggestion for bridging the preservation age gap
        if (retirementAge < preservationAge) {
            const gapYears = preservationAge - retirementAge;
            const annualExpenses = this.inputs.asfaComfortable;
            const bridgeAmount = gapYears * annualExpenses;

            this.suggestions.push({
                category: "Retirement Planning",
                priority: "High",
                title: "Bridge the Preservation Age Gap",
                description: `You plan to retire at ${retirementAge}, but can't access your super until preservation age (${preservationAge}). You have a ${gapYears}-year gap to fund.`,
                actions: [
                    `You will need a 'bridging account' with approximately ${formatCurrency(bridgeAmount)} in non-super assets (savings, stocks) to cover your expenses during this period.`,
                    "Review your non-super investment strategy to ensure these funds will be available when needed."
                ],
                confidence: 0.9
            });
        }
    }

    generateSuggestionsForMarkAndLisa() {
        const { businessStructure, businessYearsHeld, businessActiveAssetValue, propertyCashFlowStatus, numberOfProperties } = this.inputs;

        // 15-year CGT exemption suggestion
        if (businessStructure !== 'none' && businessYearsHeld >= 15 && this.inputs.retirementAge > this.inputs.yourCurrentAge) {
             const cgtCap = 1705000;
             const potentialContribution = Math.min(businessActiveAssetValue, cgtCap);

            this.suggestions.push({
                category: "Business Strategy",
                priority: "High",
                title: "Unlock 15-Year CGT Exemption for Your Business",
                description: `As you've held your business for ${businessYearsHeld} years and are planning to retire, you may qualify for the 15-year CGT exemption on the sale of your business assets.`,
                actions: [
                    `This could allow you to contribute up to ${formatCurrency(potentialContribution)} from the sale proceeds into your super, completely tax-free.`,
                    "This is one of the most powerful small business concessions. Consult a financial advisor to confirm your eligibility and plan the sale."
                ],
                confidence: 0.8
            });
        }

        // Negative gearing suggestion
        if (propertyCashFlowStatus === 'negative' && numberOfProperties > 0) {
            const annualLoss = this.inputs.annualPropertyExpenses + (this.inputs.investmentPropertyLoan * this.inputs.investmentPropertyRate) - (this.inputs.weeklyRentalIncome * 52);
            const afterTaxLoss = annualLoss * (1 - 0.37); // Assuming 37% marginal tax rate for simplicity

            this.suggestions.push({
                category: "Property Strategy",
                priority: "Medium",
                title: "Assess Impact of Negative Gearing",
                description: `Your investment property is negatively geared, creating an estimated annual cash loss of ${formatCurrency(annualLoss)}.`,
                actions: [
                    `While this provides a tax deduction, it reduces your pre-retirement cash flow by an estimated ${formatCurrency(afterTaxLoss)} per year.`,
                    "Review if the potential capital growth outweighs this annual cash drain on your ability to save for retirement."
                ],
                confidence: 0.75
            });
        }
    }

    generateSuggestionsForRobert() {
        const { homeOwnershipStatus, yourCurrentAge, totalSuperBalanceLastJune } = this.inputs;

        // Unused concessional cap suggestion
        const unusedCap = this.calculateUnusedConcessionalCap();
        if (unusedCap > 10000) {
            const concessionalCap = 27500;
            const maxContributionThisYear = concessionalCap + unusedCap;

            this.suggestions.push({
                category: "Superannuation Strategy",
                priority: "High",
                title: "Utilize Carry-Forward Concessional Contributions",
                description: `Your Total Super Balance of ${formatCurrency(totalSuperBalanceLastJune)} allows you to use the 'carry-forward' rule. You have an estimated ${formatCurrency(unusedCap)} in unused concessional (pre-tax) contributions from prior years.`,
                actions: [
                    `You can contribute up to ${formatCurrency(maxContributionThisYear)} to your super this financial year as a tax-deductible contribution.`,
                    `This is a powerful way to significantly boost your super and reduce your tax. Action is needed before June 30.`
                ],
                confidence: 0.9
            });
        }

        // Downsizer suggestion
        if (homeOwnershipStatus === 'owner' && yourCurrentAge >= 55) {
             this.suggestions.push({
                category: "Home Ownership",
                priority: "High",
                title: "Plan for a Downsizer Super Contribution",
                description: "If you sell your main residence after turning 55, you may be eligible to make a one-off downsizer contribution of up to $300,000 (or $600,000 for a couple) to your super.",
                actions: [
                    "This contribution is separate from the normal caps and can be made even if your Total Super Balance is high.",
                    "If you plan to sell your home, this is a fantastic way to transfer a large amount of capital into the tax-effective super environment."
                ],
                confidence: 0.85
            });
        }
    }

    generateSuggestionsForJenny() {
        const { partTimeWorkIncome, yourCurrentAge } = this.inputs;

        // Work Bonus suggestion
        if (partTimeWorkIncome > 0 && yourCurrentAge >= 67) {
            const workBonusMax = 11800;
            const incomeToAssess = Math.max(0, partTimeWorkIncome - workBonusMax);
            const pensionReduction = incomeToAssess * 0.5;
            const netGain = partTimeWorkIncome - pensionReduction;

            this.suggestions.push({
                category: "Age Pension Strategy",
                priority: "Medium",
                title: "Maximize Your Work Bonus",
                description: `Your planned work income of ${formatCurrency(partTimeWorkIncome)}/year can be optimized with the Centrelink Work Bonus.`,
                actions: [
                    `The first ${formatCurrency(workBonusMax)} of income is exempt. Only ${formatCurrency(incomeToAssess)} will be assessed, reducing your pension by just ${formatCurrency(pensionReduction)}.`,
                    `Your net financial gain from working is an estimated ${formatCurrency(netGain)} per year.`,
                ],
                confidence: 0.9
            });
        }

        // Asset Test suggestion
        if (this.results && this.results.totalFinancialAssets) {
            const assetLimit = this.inputs.pensionAssetLimit;
            const assessableAssets = this.results.totalFinancialAssets;

            if (assessableAssets > assetLimit && assessableAssets < assetLimit + 50000) {
                const excessAssets = assessableAssets - assetLimit;
                const annualPensionLoss = (excessAssets / 1000) * 3 * 26;

                 this.suggestions.push({
                    category: "Age Pension Strategy",
                    priority: "High",
                    title: "Optimize Your Assets for the Age Pension",
                    description: `Your assets are ${formatCurrency(excessAssets)} over the Age Pension limit, costing you ${formatCurrency(annualPensionLoss)} in pension payments per year.`,
                    actions: [
                        `Gifting up to $10,000 to your children could reduce your assessable assets and increase your pension.`,
                        `Pre-paying funeral expenses via a funeral bond (up to ~$15k) can also be an exempt asset.`,
                        `Making home improvements is another way to reduce assessable assets, as your home is exempt.`
                    ],
                    confidence: 0.8
                });
            }
        }
    }

    getPreservationAge(currentAge) {
        const birthYear = new Date().getFullYear() - currentAge;
        if (birthYear < 1960) return 55;
        if (birthYear === 1960) return 56;
        if (birthYear === 1961) return 57;
        if (birthYear === 1962) return 58;
        if (birthYear === 1963) return 59;
        return 60; // For birth years 1964 and later
    }


    // --- Deeper Analysis Methods (from decision-support-engine) ---
    async runBaselineAnalysis() {
        try {
            const monteCarlo = await this.simulator.runMonteCarloSimulation(this.inputs, 1000);
            const deterministic = this.simulator.simulateRetirement(this.inputs);
            const riskProfile = this.calculateRiskProfile();

            return {
                monteCarlo,
                deterministic,
                successRate: monteCarlo.successRate,
                medianBalance: monteCarlo.median,
                riskProfile,
                currentAge: this.inputs.yourCurrentAge,
                retirementAge: this.inputs.retirementAge,
                yearsToRetirement: this.inputs.retirementAge - this.inputs.yourCurrentAge
            };
        } catch (error) {
            console.error("Baseline analysis failed:", error);
            return null;
        }
    }

    async analyzeHomeOwnership(baseline) {
        const { homeValue, yourCurrentAge } = this.inputs;
        const recommendations = [];

        if (!homeValue || homeValue < 500000) return [];

        const downsizingScenarios = [
            { timing: "At retirement", years: baseline.yearsToRetirement },
            { timing: "5 years before retirement", years: baseline.yearsToRetirement - 5 },
            { timing: "At age 75", years: 75 - yourCurrentAge }
        ];

        for (const scenario of downsizingScenarios) {
            if (scenario.years <= 0) continue;
            const downsizeInputs = { ...this.inputs, planToDownsize: true, downsizeAge: yourCurrentAge + scenario.years };
            const downsizeResult = await this.simulator.runMonteCarloSimulation(downsizeInputs, 500);
            const improvement = downsizeResult.successRate - baseline.successRate;

            if (improvement > 0.05) {
                const equityReleased = homeValue * 0.4; // Simplified
                recommendations.push({
                    category: "Home Ownership",
                    priority: improvement > 0.15 ? "high" : "medium",
                    action: `Downsize home ${scenario.timing.toLowerCase()}`,
                    recommendation: `Consider downsizing your home ${scenario.timing.toLowerCase()}. This could release ~${formatCurrency(equityReleased)} and improve your success rate by ${formatPercent(improvement)}.`,
                    confidence: 0.8
                });
            }
        }
        return recommendations;
    }

    async analyzeInvestmentProperty(baseline) {
        if (!this.inputs.hasInvestmentProperty) return [];
        // Logic for existing property...
        return [];
    }

    async analyzeStocksAndShares(baseline) { return []; }
    async analyzeTrustStructures(baseline) { return []; }
    async analyzeEarlyRetirement(baseline) { return []; }
    async analyzeInvestmentOptimization(baseline) { return []; }
    async analyzeSuperannuationStrategy(baseline) { return []; }
    async analyzeAdditionalStrategies(baseline) { return []; }

    calculateRiskProfile() {
        return {
            capacity: this.simulator.calculateRiskCapacity(this.inputs),
            tolerance: this.inputs.riskTolerance || 50,
            requirement: this.simulator.calculateRiskRequirement(this.inputs)
        };
    }

    prioritizeSuggestions() {
        const priorityOrder = { High: 3, Medium: 2, Low: 1 };
        // Use a Set to remove duplicate suggestions based on title
        const uniqueSuggestions = Array.from(new Map(this.suggestions.map(s => [s.title, s])).values());

        uniqueSuggestions.sort((a, b) => {
            const aPriority = priorityOrder[a.priority] || 0;
            const bPriority = priorityOrder[b.priority] || 0;
            return bPriority - aPriority;
        });
        return uniqueSuggestions;
    }

    async generateActionableRiskAnalysis(baselineResults) {
        if (!baselineResults || !baselineResults.paths) {
            return {
                riskAnalysis: {
                    successRate: this.results.successRate || 0,
                    depletionAge: 'N/A',
                    depletionPercent: 100 - ((this.results.successRate || 0) * 100),
                    keyRisk: 'Run a full Monte Carlo simulation for detailed risk analysis.'
                },
                topImprovements: []
            };
        }

        const { successRate, paths, median } = baselineResults;

        // 1. Analyze Failure Scenarios
        const failurePaths = paths.filter(path => path[path.length - 1].endBalance < 0);
        const depletionPercent = (failurePaths.length / paths.length) * 100;
        let medianDepletionAge = 'N/A';
        if (failurePaths.length > 0) {
            const depletionAges = failurePaths.map(path => {
                const depletionPoint = path.find(year => year.endBalance < 0);
                return depletionPoint ? depletionPoint.age : this.inputs.yourLifespan;
            });
            depletionAges.sort((a, b) => a - b);
            medianDepletionAge = depletionAges[Math.floor(depletionAges.length / 2)];
        }

        const riskAnalysis = {
            successRate: successRate,
            depletionAge: medianDepletionAge,
            depletionPercent: depletionPercent,
            keyRisk: this.inputs.returnVolatility > 15 ? 'High market volatility' : 'Healthcare cost inflation'
        };

        // 2. Run "What-If" Scenarios for Top Improvements
        const improvements = [];
        const baseSuccessRate = successRate;

        // Scenario 1: Increase Contributions
        const fortnightlyIncrease = 200;
        const monthlyIncrease = fortnightlyIncrease * 26 / 12;
        const contributionInputs = { ...this.inputs, monthlyStockContribution: this.inputs.monthlyStockContribution + monthlyIncrease };
        const contributionResult = await this.simulator.runMonteCarloSimulation(contributionInputs, 500);
        if (contributionResult.successRate > baseSuccessRate) {
            improvements.push({
                title: `Increase contributions by ${formatCurrency(fortnightlyIncrease)}/fortnight`,
                newSuccessRate: contributionResult.successRate,
                cost: `Cost: ${formatCurrency(fortnightlyIncrease * 26)}/year now`,
                benefit: `Benefit: ${formatCurrency(contributionResult.median - median)} extra by retirement`
            });
        }

        // Scenario 2: Delay Retirement
        const retirementInputs = { ...this.inputs, retirementAge: this.inputs.retirementAge + 2 };
        const retirementResult = await this.simulator.runMonteCarloSimulation(retirementInputs, 500);
         if (retirementResult.successRate > baseSuccessRate) {
            improvements.push({
                title: `Delay retirement by 2 years`,
                newSuccessRate: retirementResult.successRate,
                cost: `Cost: 2 more years of work`,
                benefit: `Benefit: ${formatCurrency(retirementResult.median - median)} extra by retirement`
            });
        }

        // Scenario 3: Part-time work in retirement
        const workIncome = 20000;
        const workInputs = { ...this.inputs, partTimeWorkIncome: workIncome };
        const workResult = await this.simulator.runMonteCarloSimulation(workInputs, 500);
         if (workResult.successRate > baseSuccessRate) {
            improvements.push({
                title: `Part-time work age ${this.inputs.retirementAge}-${this.inputs.retirementAge + 2} (${formatCurrency(workIncome)}/year)`,
                newSuccessRate: workResult.successRate,
                cost: `Cost: Part-time work for 3 years`,
                benefit: `Adds ${formatCurrency(workIncome * 3)} cash + delays drawdown`
            });
        }

        // Rank improvements and get top 3
        const topImprovements = improvements
            .sort((a, b) => b.newSuccessRate - a.newSuccessRate)
            .slice(0, 3)
            .map(imp => ({
                ...imp,
                successRateChange: imp.newSuccessRate - baseSuccessRate
            }));

        return { riskAnalysis, topImprovements };
    }

    async generateSensitivityAnalysis() {
        const baselineResult = this.simulator.simulateRetirement(this.inputs);
        const baselineBalance = baselineResult.totalFinancialAssets;

        const scenarios = [
            { name: 'Return Rate Assumption', key: 'investmentReturn', change: 0.01, type: 'absolute', unit: '%' },
            { name: 'Healthcare Costs Inflation', key: 'healthcareInflation', change: 0.02, type: 'absolute', unit: '%' },
            { name: 'Property Sale Timing', key: 'sellPropertyYears', change: 5, type: 'absolute', unit: ' years' },
            { name: 'Aged Care Timing', key: 'agedCareStartAge', change: 2, type: 'absolute', unit: ' years' },
            { name: 'Contribution Increase', key: 'monthlyStockContribution', change: 217, type: 'up-only', unit: '/month' } // ~$100/fn
        ];

        let results = [];

        for (const scenario of scenarios) {
            let upResult, downResult;
            let impact;
            let description;

            if (scenario.type === 'absolute') {
                const upInputs = { ...this.inputs, [scenario.key]: this.inputs[scenario.key] + scenario.change };
                const downInputs = { ...this.inputs, [scenario.key]: this.inputs[scenario.key] - scenario.change };
                upResult = this.simulator.simulateRetirement(upInputs);
                downResult = this.simulator.simulateRetirement(downInputs);
                impact = Math.abs(upResult.totalFinancialAssets - downResult.totalFinancialAssets) / 2;
                 description = `A ±${scenario.change > 1 ? scenario.change : formatPercent(scenario.change, 0)}${scenario.unit} change results in a ~${formatCurrency(impact)} difference in your final balance.`;
            } else if (scenario.type === 'up-only') {
                const upInputs = { ...this.inputs, [scenario.key]: this.inputs[scenario.key] + scenario.change };
                upResult = this.simulator.simulateRetirement(upInputs);
                impact = Math.abs(upResult.totalFinancialAssets - baselineBalance);
                description = `A +${formatCurrency(scenario.change)}${scenario.unit} change results in a ~${formatCurrency(impact)} difference in your final balance.`;
            }

            if (impact > 0) {
                 results.push({
                    name: scenario.name,
                    impact: impact,
                    description: description
                });
            }
        }

        return results.sort((a, b) => b.impact - a.impact);
    }

    async generateVisceralScenarios(baselineResults) {
        const scenarios = [];

        // 1. Current Plan (Baseline)
        scenarios.push({
            name: 'Current Plan',
            successRate: baselineResults.successRate,
            retirementIncome: this.getMedianRetirementIncome(baselineResults.paths),
            depletionAge: this.getMedianDepletionAge(baselineResults.paths, baselineResults.successRate),
            summary: `You risk running out at ${this.getMedianDepletionAge(baselineResults.paths, baselineResults.successRate, true)}`
        });

        // 2. +$200/fn contributions
        const fortnightlyIncrease = 200;
        const monthlyIncrease = (fortnightlyIncrease * 26) / 12;
        const contributionInputs = { ...this.inputs, monthlyStockContribution: this.inputs.monthlyStockContribution + monthlyIncrease };
        const contributionResult = await this.simulator.runMonteCarloSimulation(contributionInputs, 500);
        scenarios.push({
            name: `+$200/fn contributions`,
            successRate: contributionResult.successRate,
            retirementIncome: this.getMedianRetirementIncome(contributionResult.paths),
            depletionAge: this.getMedianDepletionAge(contributionResult.paths, contributionResult.successRate),
            summary: "Comfortable through life"
        });

        // 3. Delay retirement 2yrs
        const delayInputs = { ...this.inputs, retirementAge: this.inputs.retirementAge + 2 };
        const delayResult = await this.simulator.runMonteCarloSimulation(delayInputs, 500);
        scenarios.push({
            name: 'Delay retirement 2yrs',
            successRate: delayResult.successRate,
            retirementIncome: this.getMedianRetirementIncome(delayResult.paths),
            depletionAge: this.getMedianDepletionAge(delayResult.paths, delayResult.successRate),
            summary: "Very secure outcome"
        });

        // 4. Sell property now
        if (this.inputs.hasInvestmentProperty) {
            const sellNowInputs = { ...this.inputs, sellPropertyYears: 0 };
            const sellNowResult = await this.simulator.runMonteCarloSimulation(sellNowInputs, 500);
            scenarios.push({
                name: 'Sell property now',
                successRate: sellNowResult.successRate,
                retirementIncome: this.getMedianRetirementIncome(sellNowResult.paths),
                depletionAge: this.getMedianDepletionAge(sellNowResult.paths, sellNowResult.successRate),
                summary: "⚠️ Higher risk - don't do this"
            });
        }

        return scenarios;
    }

    getMedianRetirementIncome(paths) {
        if (!paths || paths.length === 0) return 0;
        const sortedPaths = [...paths].sort((a, b) => {
            const lastA = a[a.length - 1].endBalance;
            const lastB = b[b.length - 1].endBalance;
            return lastB - lastA;
        });
        const medianPath = sortedPaths[Math.floor(sortedPaths.length / 2)];

        // Find the first year of retirement in the median path
        const retirementYearData = medianPath.find(y => y.age >= this.inputs.retirementAge);
        return retirementYearData ? retirementYearData.withdrawal : 0;
    }

    getMedianDepletionAge(paths, successRate, getAgeOnly = false) {
        const failureRate = 1 - successRate;
        if (failureRate < 0.01) { // Essentially 100% success
            return "90+";
        }

        const failurePaths = paths.filter(path => path[path.length - 1].endBalance <= 0);
        if (failurePaths.length === 0) {
            return "90+";
        }

        const depletionAges = failurePaths.map(path => {
            const depletionPoint = path.find(year => year.endBalance < 0);
            return depletionPoint ? depletionPoint.age : this.inputs.yourLifespan;
        });
        depletionAges.sort((a, b) => a - b);
        const medianAge = depletionAges[Math.floor(depletionAges.length / 2)];

        if (getAgeOnly) {
            return `age ${medianAge}`;
        }

        return `Age ${medianAge} (${(failureRate * 100).toFixed(0)}% risk)`;
    }

    getHealthCheckMetrics() {
        const { inputs, results } = this;
        if (!results || !results.yearlyData) {
            // Return default/error state if results are not available
            return {
                savingsRate: { status: '⚪', text: 'Awaiting calculation...', value: 'N/A' },
                pensionOptimization: { status: '⚪', text: 'Awaiting calculation...', value: 'N/A' },
                assetAllocation: { status: '⚪', text: 'Awaiting calculation...', value: 'N/A' },
                contributionCaps: { status: '⚪', text: 'Awaiting calculation...', value: 'N/A' },
                taxEfficiency: { status: '⚪', text: 'Awaiting calculation...', value: 'N/A' },
                riskCoverage: { status: '⚪', text: 'Awaiting calculation...', value: 'N/A' },
            };
        }

        const healthCheckConfig = ENHANCED_CONFIG.HEALTH_CHECK;
        const metrics = {};

        // 1. Savings Rate
        const savingsRate = inputs.percentIncomeSaved * 100;
        let savingsStatus = '🔴';
        let savingsText = `At ${savingsRate.toFixed(1)}%, this is below the recommended 10-15% for a strong retirement outlook.`;
        if (savingsRate >= healthCheckConfig.SAVINGS_RATE.GOOD) {
            savingsStatus = '🟢';
            savingsText = `Your ${savingsRate.toFixed(1)}% savings rate is excellent and on target.`;
        } else if (savingsRate >= healthCheckConfig.SAVINGS_RATE.OK) {
            savingsStatus = '🟡';
            savingsText = `Your ${savingsRate.toFixed(1)}% savings rate is a good start, but aiming for 10-15% will improve your outcome.`;
        }
        metrics.savingsRate = {
            status: savingsStatus,
            text: savingsText,
            value: `${savingsRate.toFixed(1)}%`
        };

        // 2. Age Pension Optimization
        const lastYearProjection = results.yearlyData[results.yearlyData.length - 2] || { pensionIncome: 0, endBalance: 0 };
        const pensionIncome = lastYearProjection.pensionIncome;
        let pensionStatus = '🟡';
        let pensionText = 'Your assets are within the pension taper rate zone.';
        if (pensionIncome === 0 && lastYearProjection.endBalance > inputs.pensionAssetLimit) {
            pensionStatus = '🟢';
            pensionText = 'You are not relying on the Age Pension, which is a strong position.';
        } else if (pensionIncome > 0 && lastYearProjection.endBalance < inputs.pensionAssetThreshold) {
            pensionStatus = '🟢';
            pensionText = 'You are positioned to receive the full Age Pension.';
        } else if (lastYearProjection.endBalance > inputs.pensionAssetLimit * 0.9 && lastYearProjection.endBalance < inputs.pensionAssetLimit * 1.1) {
            pensionStatus = '🔴';
            pensionText = `Your assets are just over the limit, costing you pension payments. A small reduction could yield significant benefits.`;
        }
        metrics.pensionOptimization = {
            status: pensionStatus,
            text: pensionText,
            value: 'Efficiency'
        };

        // 3. Asset Allocation
        const recommendedEquity = Math.max(30, 110 - inputs.yourCurrentAge);
        const actualEquity = inputs.riskTolerance * 10; // Simple proxy
        const allocationDiff = Math.abs(recommendedEquity - actualEquity);
        let allocationStatus = '🔴';
        let allocationText = `Your allocation seems misaligned with an age-appropriate strategy.`;
        if (allocationDiff <= healthCheckConfig.ASSET_ALLOCATION.GOOD) {
            allocationStatus = '🟢';
            allocationText = 'Your asset allocation is appropriate for your age.';
        } else if (allocationDiff <= healthCheckConfig.ASSET_ALLOCATION.OK) {
            allocationStatus = '🟡';
            allocationText = 'Your allocation could be moderately adjusted for your age.';
        }
        metrics.assetAllocation = {
            status: allocationStatus,
            text: allocationText,
            value: 'Appropriate'
        };

        // 4. Contribution Caps
        const concessionalCap = healthCheckConfig.CONTRIBUTION_CAPS.CONCESSIONAL_CAP;
        const currentConcessional = (inputs.yourSalary * inputs.employerSuperContribution) + (inputs.partnerSalary * inputs.employerSuperContribution);
        const unusedCap = concessionalCap * (inputs.isSingleCalculation ? 1 : 2) - currentConcessional;
        let capStatus = '🔴';
        let capText = `You are significantly underutilizing your concessional contribution cap by ~${formatCurrency(unusedCap)}.`;
        if (unusedCap <= healthCheckConfig.CONTRIBUTION_CAPS.GOOD) {
            capStatus = '🟢';
            capText = 'You are effectively using your concessional contribution cap.';
        } else if (unusedCap <= healthCheckConfig.CONTRIBUTION_CAPS.OK) {
            capStatus = '🟡';
            capText = `You have ~${formatCurrency(unusedCap)} of unused concessional cap space.`;
        }
        metrics.contributionCaps = {
            status: capStatus,
            text: capText,
            value: 'Utilized'
        };

        // 5. Tax Efficiency
        let taxStatus = '🟢';
        let taxText = 'Your tax situation appears efficient.';
        if (inputs.yourSalary > healthCheckConfig.TAX_EFFICIENCY.DIV293_THRESHOLD || inputs.partnerSalary > healthCheckConfig.TAX_EFFICIENCY.DIV293_THRESHOLD) {
            taxStatus = '🔴';
            taxText = `Division 293 tax is impacting your super contributions. Consider strategies to reduce taxable income.`;
        } else if (inputs.nonConcessionalContribution > 0 && unusedCap > 10000) {
            taxStatus = '🟡';
            taxText = 'Consider maximizing concessional contributions before making non-concessional ones for better tax outcomes.';
        }
        metrics.taxEfficiency = {
            status: taxStatus,
            text: taxText,
            value: 'Efficient'
        };

        // 6. Risk Coverage
        let riskStatus = '🔴';
        let riskText = 'Your plan does not seem to account for healthcare or aged care costs.';
        if (inputs.agedCareProbability > 0 && inputs.currentHealthcareCosts > 0) {
            riskStatus = '🟢';
            riskText = 'Your plan includes provisions for healthcare and aged care.';
        } else if (inputs.agedCareProbability > 0 || inputs.currentHealthcareCosts > 0) {
            riskStatus = '🟡';
            riskText = 'Your plan partially covers future health risks, but could be more comprehensive.';
        }
        metrics.riskCoverage = {
            status: riskStatus,
            text: riskText,
            value: 'Included'
        };

        return metrics;
    }
}
