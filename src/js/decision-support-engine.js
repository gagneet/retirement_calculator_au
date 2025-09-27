// js/decision-support-engine.js - Comprehensive Decision Support Engine

import { ENHANCED_CONFIG } from './config.js';
import { formatCurrency, formatPercent, calculateCGT, calculateAgePension } from './utils.js';
import MarketDataEngine from './market-data.js';

export class DecisionSupportEngine {
    constructor(simulator, inputs) {
        this.simulator = simulator;
        this.inputs = inputs;
        this.marketData = new MarketDataEngine();
        this.recommendations = [];
    }

    // Main method to generate comprehensive recommendations
    async generateComprehensiveRecommendations() {
        console.log("Starting comprehensive decision support engine...");

        // Run baseline simulation
        const baseline = await this.runBaselineAnalysis();
        if (!baseline) return [];

        // Generate all categories of recommendations
        const recommendations = {
            homeOwnership: await this.analyzeHomeOwnership(baseline),
            investmentProperty: await this.analyzeInvestmentProperty(baseline),
            stocksShares: await this.analyzeStocksAndShares(baseline),
            trustStructures: await this.analyzeTrustStructures(baseline),
            earlyRetirement: await this.analyzeEarlyRetirement(baseline),
            investmentOptimization: await this.analyzeInvestmentOptimization(baseline),
            superannuationStrategy: await this.analyzeSuperannuationStrategy(baseline),
            additionalStrategies: await this.analyzeAdditionalStrategies(baseline)
        };

        // Combine and prioritize all recommendations
        return this.prioritizeRecommendations(recommendations, baseline);
    }

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

    // 1. Home Ownership Analysis - Sell or Keep Current Home
    async analyzeHomeOwnership(baseline) {
        const { homeValue, planToDownsize, yourCurrentAge, retirementAge } = this.inputs;
        const recommendations = [];

        if (!homeValue || homeValue < 500000) {
            return [{
                category: "Home Ownership",
                priority: "low",
                recommendation: "Current home value too low for downsizing benefits",
                analysis: "No significant benefit from downsizing strategy"
            }];
        }

        const downsizingScenarios = [
            { timing: "At retirement", years: baseline.yearsToRetirement },
            { timing: "5 years before retirement", years: baseline.yearsToRetirement - 5 },
            { timing: "At age 75", years: 75 - yourCurrentAge }
        ];

        for (const scenario of downsizingScenarios) {
            if (scenario.years <= 0) continue;

            const downsizeInputs = {
                ...this.inputs,
                planToDownsize: true,
                downsizeAge: yourCurrentAge + scenario.years
            };

            const downsizeResult = await this.simulator.runMonteCarloSimulation(downsizeInputs, 500);
            const improvement = downsizeResult.successRate - baseline.successRate;

            if (improvement > 0.05) {
                const equityReleased = homeValue * 0.4; // Assuming 40% equity release
                recommendations.push({
                    category: "Home Ownership",
                    priority: improvement > 0.15 ? "high" : "medium",
                    action: `Downsize home ${scenario.timing.toLowerCase()}`,
                    timing: scenario.timing,
                    expectedBenefit: `Success rate improves by ${formatPercent(improvement)}`,
                    financialImpact: `Release approximately ${formatCurrency(equityReleased)} in equity`,
                    recommendation: `Consider downsizing your home ${scenario.timing.toLowerCase()}. This could release ${formatCurrency(equityReleased)} in equity and improve your retirement success rate by ${formatPercent(improvement)}.`,
                    confidence: 0.8
                });
            }
        }

        // Age Pension implications
        if (homeValue > 1500000) {
            recommendations.push({
                category: "Home Ownership",
                priority: "medium",
                action: "Downsize to maximize Age Pension eligibility",
                timing: "Before retirement",
                expectedBenefit: "Increased Age Pension entitlement",
                recommendation: "Your home value may affect Age Pension eligibility. Downsizing could increase your pension entitlement while releasing capital for investment.",
                confidence: 0.9
            });
        }

        return recommendations.length > 0 ? recommendations : [{
            category: "Home Ownership",
            priority: "low",
            recommendation: "Current home strategy appears optimal",
            analysis: "No significant benefits from downsizing detected"
        }];
    }

    // 2. Investment Property Analysis
    async analyzeInvestmentProperty(baseline) {
        if (!this.inputs.hasInvestmentProperty) {
            return this.analyzePurchasingInvestmentProperty(baseline);
        }

        return this.analyzeExistingInvestmentProperty(baseline);
    }

    async analyzeExistingInvestmentProperty(baseline) {
        const recommendations = [];
        const { investmentPropertyValue, propertyLocation, yourCurrentAge } = this.inputs;

        // Get market-specific recommendations
        const marketRec = this.marketData.getCityRecommendation(
            propertyLocation || 'sydney',
            yourCurrentAge,
            this.inputs.retirementAge,
            baseline.riskProfile.tolerance
        );

        // Get optimal selling timeline
        const sellingScenarios = this.marketData.getOptimalSellingTimeline(
            propertyLocation || 'sydney',
            yourCurrentAge,
            investmentPropertyValue,
            investmentPropertyValue * 0.04 // Assuming 4% rental yield
        );

        // Test each selling scenario
        for (const scenario of sellingScenarios) {
            const sellInputs = {
                ...this.inputs,
                sellPropertyYears: scenario.timeline
            };

            const sellResult = await this.simulator.runMonteCarloSimulation(sellInputs, 500);
            const improvement = sellResult.successRate - baseline.successRate;

            recommendations.push({
                category: "Investment Property",
                priority: improvement > 0.1 ? "high" : improvement > 0.05 ? "medium" : "low",
                action: `Sell investment property in ${scenario.timeline} years`,
                timing: scenario.rationale,
                expectedBenefit: `Success rate change: ${formatPercent(improvement)}`,
                marketAnalysis: marketRec ? marketRec.sellTiming : "Based on historical cycles",
                recommendation: `${scenario.rationale}. Expected property value: ${formatCurrency(scenario.expectedValue)}. Success rate impact: ${formatPercent(improvement)}.`,
                confidence: scenario.confidence
            });
        }

        // Keep indefinitely scenario
        const keepInputs = { ...this.inputs, sellPropertyYears: 0 };
        const keepResult = await this.simulator.runMonteCarloSimulation(keepInputs, 500);
        const keepImprovement = keepResult.successRate - baseline.successRate;

        recommendations.push({
            category: "Investment Property",
            priority: keepImprovement > 0.05 ? "medium" : "low",
            action: "Keep property throughout retirement",
            timing: "Long-term hold strategy",
            expectedBenefit: `Ongoing rental income, success rate change: ${formatPercent(keepImprovement)}`,
            recommendation: `Keep the investment property for ongoing rental income. This provides ${formatPercent(keepImprovement)} change in success rate.`,
            confidence: 0.7
        });

        return recommendations.sort((a, b) => b.confidence - a.confidence);
    }

    async analyzePurchasingInvestmentProperty(baseline) {
        const recommendations = [];
        const availableCapital = this.inputs.currentSavings + (this.inputs.currentStocks * 0.8); // 80% of stocks available

        if (availableCapital < 100000) {
            return [{
                category: "Investment Property",
                priority: "low",
                recommendation: "Insufficient capital for investment property purchase",
                analysis: "Build savings first before considering property investment"
            }];
        }

        // Analyze different property locations
        const locations = ['sydney', 'melbourne', 'brisbane', 'perth', 'adelaide'];

        for (const location of locations) {
            const marketRec = this.marketData.getCityRecommendation(
                location,
                this.inputs.yourCurrentAge,
                this.inputs.retirementAge,
                baseline.riskProfile.tolerance
            );

            if (!marketRec) continue;

            // Estimate property purchase scenario
            const propertyValue = this.estimateAffordableProperty(availableCapital, location);

            recommendations.push({
                category: "Investment Property",
                priority: marketRec.currentCycle === 'trough' ? "high" : marketRec.currentCycle === 'recovery' ? "medium" : "low",
                action: `Purchase investment property in ${location}`,
                timing: marketRec.buyTiming,
                expectedBenefit: `${formatPercent(marketRec.expectedGrowth)} expected annual growth`,
                marketAnalysis: `${location} is in ${marketRec.currentCycle} phase`,
                recommendation: `Consider purchasing in ${location}. ${marketRec.buyTiming}. Expected growth: ${formatPercent(marketRec.expectedGrowth)} annually.`,
                estimatedValue: formatCurrency(propertyValue),
                confidence: marketRec.currentCycle === 'trough' ? 0.8 : 0.6
            });
        }

        return recommendations;
    }

    // 3. Stocks and Shares Analysis
    async analyzeStocksAndShares(baseline) {
        const recommendations = [];
        const { currentStocks, allocEquities, retirementAge, yourCurrentAge } = this.inputs;

        if (currentStocks < 10000) {
            return [{
                category: "Stocks & Shares",
                priority: "medium",
                recommendation: "Build stock portfolio for better diversification",
                analysis: "Current stock holdings too low for effective portfolio"
            }];
        }

        // Analyze optimal selling strategies
        const sellingScenarios = [
            { timing: "Never - hold throughout retirement", sellPercent: 0 },
            { timing: "Reduce to 50% at retirement", sellPercent: 50 },
            { timing: "Reduce to 20% at age 70", sellPercent: 80 },
            { timing: "Sell all at retirement", sellPercent: 100 }
        ];

        for (const scenario of sellingScenarios) {
            // Simulate scenario - this would require extending the simulator
            const expectedReturn = this.calculateStockSellingImpact(scenario.sellPercent, baseline);

            recommendations.push({
                category: "Stocks & Shares",
                priority: "medium",
                action: scenario.timing,
                timing: scenario.timing,
                expectedBenefit: formatCurrency(expectedReturn.benefit),
                recommendation: `${scenario.timing}: ${scenario.sellPercent > 0 ? 'Provides liquidity' : 'Maintains growth potential'}. Estimated impact: ${formatCurrency(expectedReturn.benefit)}.`,
                confidence: 0.7
            });
        }

        // Growth vs income strategy
        const dividendFocus = this.inputs.dividendYield > 5;
        recommendations.push({
            category: "Stocks & Shares",
            priority: baseline.yearsToRetirement < 10 ? "high" : "medium",
            action: dividendFocus ? "Maintain dividend focus" : "Consider dividend-paying stocks",
            timing: "Current strategy adjustment",
            expectedBenefit: "Stable income in retirement",
            recommendation: dividendFocus ?
                `Current dividend yield of ${this.inputs.dividendYield.toFixed(1)}% provides good income. Consider maintaining this strategy.` :
                `Consider increasing allocation to dividend-paying stocks for retirement income.`,
            confidence: 0.8
        });

        return recommendations;
    }

    // 4. Trust Structure Analysis
    async analyzeTrustStructures(baseline) {
        const recommendations = [];
        const totalAssets = this.inputs.homeValue + this.inputs.investmentPropertyValue + this.inputs.currentStocks + this.inputs.currentSavings;
        const grossIncome = this.inputs.yourSalary + this.inputs.partnerSalary;

        // Trust structure only beneficial for significant assets
        if (totalAssets < 1000000) {
            return [{
                category: "Trust Structures",
                priority: "low",
                recommendation: "Trust structures not cost-effective for current asset level",
                analysis: "Consider when total assets exceed $1M"
            }];
        }

        // Family Trust Analysis
        const familyTrustBenefits = this.calculateFamilyTrustBenefits(grossIncome, totalAssets);

        if (familyTrustBenefits.taxSaving > 5000) {
            recommendations.push({
                category: "Trust Structures",
                priority: "high",
                action: "Establish Family Trust for investment assets",
                timing: "Within next 12 months",
                expectedBenefit: `Potential tax savings: ${formatCurrency(familyTrustBenefits.taxSaving)} annually`,
                recommendation: `A family trust could provide significant tax benefits through income splitting and capital gains distribution. Estimated annual tax saving: ${formatCurrency(familyTrustBenefits.taxSaving)}.`,
                additionalBenefits: "Asset protection, estate planning flexibility",
                confidence: 0.85
            });
        }

        // Investment property in trust
        if (this.inputs.hasInvestmentProperty) {
            recommendations.push({
                category: "Trust Structures",
                priority: "medium",
                action: "Consider holding investment property in trust",
                timing: "On next property purchase or restructure",
                expectedBenefit: "Tax efficiency and asset protection",
                recommendation: "Investment properties held in trust can provide better tax treatment and asset protection, especially for higher income earners.",
                considerations: "Higher borrowing costs, setup and ongoing fees",
                confidence: 0.7
            });
        }

        // Self-Managed Super Fund (SMSF)
        const superBalance = this.inputs.yourCurrentSuper + this.inputs.partnerCurrentSuper;
        if (superBalance > 200000) {
            recommendations.push({
                category: "Trust Structures",
                priority: "medium",
                action: "Consider Self-Managed Super Fund (SMSF)",
                timing: "When super balance exceeds $500K",
                expectedBenefit: "Greater investment control and potential cost savings",
                recommendation: `With current super balance of ${formatCurrency(superBalance)}, an SMSF may provide benefits when balance reaches $500K+.`,
                confidence: 0.6
            });
        }

        return recommendations;
    }

    // 5. Early Retirement Analysis
    async analyzeEarlyRetirement(baseline) {
        const recommendations = [];
        const currentRetirementAge = this.inputs.retirementAge;

        // Test retiring 2, 5, and 10 years earlier
        const earlyRetirementScenarios = [2, 5, 10];

        for (const yearsEarlier of earlyRetirementScenarios) {
            const earlyAge = currentRetirementAge - yearsEarlier;
            if (earlyAge < 55) continue; // Minimum reasonable early retirement age

            const earlyInputs = {
                ...this.inputs,
                retirementAge: earlyAge,
                partnerRetirementAge: this.inputs.partnerRetirementAge - yearsEarlier
            };

            const earlyResult = await this.simulator.runMonteCarloSimulation(earlyInputs, 500);
            const successDifference = earlyResult.successRate - baseline.successRate;

            const requirements = this.calculateEarlyRetirementRequirements(yearsEarlier, baseline);

            recommendations.push({
                category: "Early Retirement",
                priority: successDifference > -0.1 ? "high" : successDifference > -0.2 ? "medium" : "low",
                action: `Retire ${yearsEarlier} years early at age ${earlyAge}`,
                timing: `Target retirement age: ${earlyAge}`,
                feasibility: successDifference > -0.1 ? "Feasible" : successDifference > -0.2 ? "Challenging" : "Difficult",
                requirements: requirements,
                expectedImpact: `Success rate: ${formatPercent(earlyResult.successRate)} (${formatPercent(successDifference)} vs current plan)`,
                recommendation: this.generateEarlyRetirementRecommendation(yearsEarlier, earlyAge, successDifference, requirements),
                confidence: 0.75
            });
        }

        return recommendations.sort((a, b) =>
            (b.feasibility === "Feasible" ? 2 : b.feasibility === "Challenging" ? 1 : 0) -
            (a.feasibility === "Feasible" ? 2 : a.feasibility === "Challenging" ? 1 : 0)
        );
    }

    // 6. Investment Optimization Analysis
    async analyzeInvestmentOptimization(baseline) {
        const recommendations = [];
        const currentSavingsRate = this.inputs.percentIncomeSaved;
        const currentMonthlyStock = this.inputs.monthlyStockContribution;

        // Test increased investment amounts
        const investmentScenarios = [
            { description: "Increase monthly investments by $500", monthlyIncrease: 500 },
            { description: "Increase monthly investments by $1000", monthlyIncrease: 1000 },
            { description: "Increase the amount you save from income by 5%", savingsRateIncrease: 0.05 },
            { description: "Increase the amount you save from income by 10%", savingsRateIncrease: 0.10 }
        ];

        for (const scenario of investmentScenarios) {
            const modifiedInputs = { ...this.inputs };

            if (scenario.monthlyIncrease) {
                modifiedInputs.monthlyStockContribution = currentMonthlyStock + scenario.monthlyIncrease;
            } else if (scenario.savingsRateIncrease) {
                modifiedInputs.percentIncomeSaved = currentSavingsRate + scenario.savingsRateIncrease;
            }

            const result = await this.simulator.runMonteCarloSimulation(modifiedInputs, 500);
            const improvement = result.successRate - baseline.successRate;

            if (improvement > 0.02) { // Only recommend if >2% improvement
                recommendations.push({
                    category: "Investment Optimization",
                    priority: improvement > 0.1 ? "high" : "medium",
                    action: scenario.description,
                    timing: "Start immediately",
                    expectedBenefit: `Success rate improves by ${formatPercent(improvement)}`,
                    costBenefit: this.calculateCostBenefitRatio(scenario, improvement),
                    recommendation: `${scenario.description} could improve your success rate by ${formatPercent(improvement)}. Consider if you have available cash flow.`,
                    confidence: 0.8
                });
            }
        }

        // Asset allocation optimization
        const allocationRecommendations = await this.analyzeAssetAllocation(baseline);
        recommendations.push(...allocationRecommendations);

        return recommendations;
    }

    // 7. Superannuation Strategy Analysis
    async analyzeSuperannuationStrategy(baseline) {
        const recommendations = [];
        const currentSuper = this.inputs.yourCurrentSuper + this.inputs.partnerCurrentSuper;
        const grossIncome = this.inputs.yourSalary + this.inputs.partnerSalary;
        const currentAge = this.inputs.yourCurrentAge;

        // Concessional contribution optimization (2025 cap: $30,000)
        const currentConcessional = grossIncome * ENHANCED_CONFIG.SUPER_GUARANTEE_RATE; // Super Guarantee
        const additionalConcessionalCapacity = 30000 - currentConcessional;

        if (additionalConcessionalCapacity > 0 && grossIncome > 80000) {
            const taxSaving = additionalConcessionalCapacity * 0.15; // 15% vs marginal rate
            recommendations.push({
                category: "Superannuation Strategy",
                priority: "high",
                action: `Make additional concessional contributions of ${formatCurrency(additionalConcessionalCapacity)}`,
                timing: "Before June 30 each year",
                expectedBenefit: `Tax saving: ${formatCurrency(taxSaving)} annually`,
                recommendation: `You can contribute an additional ${formatCurrency(additionalConcessionalCapacity)} to super annually at 15% tax rate vs your marginal rate, saving approximately ${formatCurrency(taxSaving)}.`,
                confidence: 0.9
            });
        }

        // Non-concessional contributions (2025 cap: $120,000 if balance < $2M)
        if (currentSuper < 2000000 && this.inputs.currentSavings > 120000) {
            recommendations.push({
                category: "Superannuation Strategy",
                priority: "medium",
                action: "Consider non-concessional super contributions",
                timing: "While balance under $2M",
                expectedBenefit: "Tax-free growth in retirement phase",
                recommendation: `With super balance under $2M, you can contribute up to $120,000 annually (non-concessional) for tax-free growth in retirement.`,
                confidence: 0.7
            });
        }

        // $3M super tax consideration
        const projectedSuper = this.projectSuperBalance(currentSuper, baseline.yearsToRetirement);
        if (projectedSuper > 3000000) {
            recommendations.push({
                category: "Superannuation Strategy",
                priority: "high",
                action: "Manage super balance to minimize $3M tax impact",
                timing: "Before reaching $3M threshold",
                expectedBenefit: "Avoid additional 15% tax on earnings",
                recommendation: `Your super is projected to exceed $3M by retirement. Consider strategies to manage the balance and minimize the additional 15% tax on earnings above this threshold.`,
                strategies: ["Pension phase drawdowns", "Spouse contributions", "Non-super investments"],
                confidence: 0.85
            });
        }

        // Catch-up contributions (if balance < $500k)
        if (currentSuper < 500000 && currentAge > 40) {
            recommendations.push({
                category: "Superannuation Strategy",
                priority: "medium",
                action: "Utilize catch-up contribution provisions",
                timing: "Next 5 years",
                expectedBenefit: "Use unused concessional caps from previous years",
                recommendation: "With super balance under $500K, you can use unused concessional contribution caps from the last 5 years to boost your super.",
                confidence: 0.8
            });
        }

        return recommendations;
    }

    // 8. Additional Strategies
    async analyzeAdditionalStrategies(baseline) {
        const recommendations = [];

        // Healthcare cost planning
        const healthcareRecommendation = this.analyzeHealthcarePlanning(baseline);
        if (healthcareRecommendation) recommendations.push(healthcareRecommendation);

        // Insurance analysis
        const insuranceRecommendations = this.analyzeInsuranceNeeds(baseline);
        recommendations.push(...insuranceRecommendations);

        // Estate planning
        const estateRecommendation = this.analyzeEstatePlanning(baseline);
        if (estateRecommendation) recommendations.push(estateRecommendation);

        // Age pension optimization
        const pensionRecommendation = this.analyzeAgePensionOptimization(baseline);
        if (pensionRecommendation) recommendations.push(pensionRecommendation);

        // Geographic arbitrage
        const locationRecommendations = this.analyzeGeographicArbitrage(baseline);
        recommendations.push(...locationRecommendations);

        return recommendations;
    }

    // Helper methods for calculations
    calculateRiskProfile() {
        return {
            capacity: this.simulator.calculateRiskCapacity(this.inputs),
            tolerance: this.inputs.riskTolerance || 50,
            requirement: this.simulator.calculateRiskRequirement(this.inputs)
        };
    }

    calculateFamilyTrustBenefits(grossIncome, totalAssets) {
        // Simplified calculation - actual would require detailed tax modeling
        const highMarginalRate = grossIncome > 190000 ? 0.47 : grossIncome > 135000 ? 0.39 : 0.32;
        const trustTaxRate = 0.30; // Company tax rate for undistributed income
        const estimatedInvestmentIncome = totalAssets * 0.04; // 4% return
        const potentialSaving = Math.max(0, (highMarginalRate - trustTaxRate) * estimatedInvestmentIncome);

        return {
            taxSaving: potentialSaving,
            setupCost: 2500,
            annualCost: 1500
        };
    }

    calculateEarlyRetirementRequirements(yearsEarlier, baseline) {
        const additionalSavingsNeeded = baseline.medianBalance * 0.1 * yearsEarlier; // Rough estimate
        return {
            additionalSavings: formatCurrency(additionalSavingsNeeded),
            recommendedActions: [
                "Increase savings rate significantly",
                "Reduce expenses in retirement",
                "Consider part-time work in early retirement",
                "Delay major purchases"
            ]
        };
    }

    generateEarlyRetirementRecommendation(yearsEarlier, targetAge, successDifference, requirements) {
        if (successDifference > -0.1) {
            return `Retiring ${yearsEarlier} years early at ${targetAge} appears feasible with your current strategy. ${requirements.additionalSavings} in additional savings would improve your prospects.`;
        } else if (successDifference > -0.2) {
            return `Early retirement at ${targetAge} is challenging but possible with significant lifestyle adjustments and increased savings of ${requirements.additionalSavings}.`;
        } else {
            return `Retiring ${yearsEarlier} years early would significantly impact your financial security. Consider reducing the early retirement timeframe or substantially increasing savings.`;
        }
    }

    calculateCostBenefitRatio(scenario, improvement) {
        if (scenario.monthlyIncrease) {
            const annualCost = scenario.monthlyIncrease * 12;
            const benefitValue = improvement * 1000000; // Rough value of 1% improvement
            return `Cost: ${formatCurrency(annualCost)}/year, Benefit ratio: ${(benefitValue / annualCost).toFixed(1)}:1`;
        }
        return "Benefit depends on available cash flow";
    }

    async analyzeAssetAllocation(baseline) {
        // This would analyze different asset allocation strategies
        return [{
            category: "Investment Optimization",
            priority: "medium",
            action: "Review asset allocation annually",
            timing: "Ongoing",
            recommendation: "Regularly review and rebalance your asset allocation based on age, market conditions, and risk tolerance."
        }];
    }

    // Additional analysis methods
    analyzeHealthcarePlanning(baseline) {
        const yearsToRetirement = baseline.yearsToRetirement;
        const healthcareInflation = this.inputs.healthcareInflation || 6.5;
        const generalInflation = this.inputs.inflation * 100 || 2.9;

        if (yearsToRetirement < 20) {
            return {
                category: "Healthcare Planning",
                priority: "high",
                action: "Plan for healthcare cost inflation",
                timing: "Retirement planning",
                expectedBenefit: `Better prepared for ${healthcareInflation}% annual healthcare inflation`,
                recommendation: `Healthcare costs inflate at ${healthcareInflation}% annually vs ${generalInflation.toFixed(1)}% general inflation. Factor this into your retirement budget and consider health insurance options.`,
                confidence: 0.9
            };
        }
        return null;
    }

    analyzeInsuranceNeeds(baseline) {
        return [{
            category: "Insurance Strategy",
            priority: "medium",
            action: "Review life and TPD insurance in super",
            timing: "Annually",
            recommendation: "Ensure adequate life and Total & Permanent Disability insurance, particularly if you have dependents or debt."
        }];
    }

    analyzeEstatePlanning(baseline) {
        const totalAssets = this.inputs.homeValue + this.inputs.investmentPropertyValue + this.inputs.currentStocks + this.inputs.currentSavings;
        if (totalAssets > 1000000) {
            return {
                category: "Estate Planning",
                priority: "medium",
                action: "Update will and estate planning documents",
                timing: "Every 3-5 years or after major life changes",
                recommendation: `With assets of approximately ${formatCurrency(totalAssets)}, ensure your estate planning documents are current and tax-effective.`
            };
        }
        return null;
    }

    analyzeAgePensionOptimization(baseline) {
        return {
            category: "Age Pension Strategy",
            priority: "medium",
            action: "Optimize assets for Age Pension eligibility",
            timing: "5 years before retirement",
            recommendation: "Review asset allocation and timing strategies to maximize Age Pension entitlement while maintaining lifestyle."
        };
    }

    analyzeGeographicArbitrage(baseline) {
        if (this.inputs.homeValue > 1500000) {
            return [{
                category: "Geographic Strategy",
                priority: "low",
                action: "Consider interstate relocation for lower cost of living",
                timing: "At or before retirement",
                recommendation: "Moving to a lower cost area could significantly extend your retirement savings."
            }];
        }
        return [];
    }

    estimateAffordableProperty(availableCapital, location) {
        // Simplified calculation - 20% deposit
        const depositRatio = 0.2;
        return availableCapital / depositRatio;
    }

    calculateStockSellingImpact(sellPercent, baseline) {
        // Simplified calculation
        const currentValue = this.inputs.currentStocks;
        const sellAmount = currentValue * (sellPercent / 100);
        const cgtImpact = sellAmount * 0.125; // Approximate CGT after discount

        return {
            benefit: sellAmount - cgtImpact,
            liquidity: sellAmount,
            taxImpact: cgtImpact
        };
    }

    projectSuperBalance(currentBalance, years) {
        const growthRate = this.inputs.superReturn; // Use user's super return assumption
        const contributions = 30000; // Annual concessional contributions

        let projectedBalance = currentBalance;
        for (let year = 0; year < years; year++) {
            projectedBalance = (projectedBalance + contributions) * (1 + growthRate);
        }
        return projectedBalance;
    }

    // Prioritize and format final recommendations
    prioritizeRecommendations(categoryRecommendations, baseline) {
        const allRecommendations = [];

        // Flatten all categories
        Object.values(categoryRecommendations).forEach(categoryRecs => {
            if (Array.isArray(categoryRecs)) {
                allRecommendations.push(...categoryRecs);
            }
        });

        // Sort by priority and confidence
        const priorityOrder = { high: 3, medium: 2, low: 1 };

        return allRecommendations.sort((a, b) => {
            const aPriority = priorityOrder[a.priority] || 0;
            const bPriority = priorityOrder[b.priority] || 0;
            const aConfidence = a.confidence || 0.5;
            const bConfidence = b.confidence || 0.5;

            if (aPriority !== bPriority) {
                return bPriority - aPriority;
            }
            return bConfidence - aConfidence;
        });
    }
}

export default DecisionSupportEngine;