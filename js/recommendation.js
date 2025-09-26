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
     * Analyzes scenarios related to selling the primary home with cash flow analysis.
     * @param {Object} baselineResults - The results from the baseline simulation.
     * @returns {Array<Object>} A list of scenarios to test.
     */
    _analyzeHomeOwnership(baselineResults) {
        const scenarios = [];
        const successRate = baselineResults.successRate;
        const { planToDownsize, homeValue, mortgageBalance } = this.baseInputs;

        // Get cash flow analysis to understand mortgage payment impact
        const cashFlowAnalysis = this.simulator.calculateCashFlowAnalysis(this.baseInputs);
        const monthlyHousingCost = cashFlowAnalysis.expenses.housing.monthlyTotal;
        const monthlyMortgage = cashFlowAnalysis.expenses.housing.mortgagePayment;
        const netHomeEquity = homeValue - (mortgageBalance || 0);

        // Scenario 1: Standard downsizing if high value home and poor success rate
        if (!planToDownsize && homeValue > 800000 && successRate < 0.85) {
            const downsizeProceeds = netHomeEquity * 0.6; // Assume 60% of equity unlocked
            const monthlyIncome = Math.round((downsizeProceeds * 0.05) / 12); // 5% withdrawal rate

            scenarios.push({
                name: "Downsize Home at Retirement",
                description: `Sell $${homeValue.toLocaleString()} home and downsize, unlocking $${downsizeProceeds.toLocaleString()} for retirement investments.`,
                modifications: { planToDownsize: true },
                feasibility: "Major Lifestyle Change",
                factorsChanged: [
                    `Home equity unlocked: $${downsizeProceeds.toLocaleString()}`,
                    `Potential monthly income: $${monthlyIncome}`,
                    `Reduced ongoing housing costs`,
                    `Increased retirement investment base`,
                    `May require location/size adjustment`
                ]
            });
        }

        // Scenario 2: Early downsizing if high mortgage payments relative to income
        if (!planToDownsize && mortgageBalance > 200000 && monthlyMortgage > cashFlowAnalysis.cashFlow.monthlyNetIncome * 0.3) {
            const earlyDownsizeProceeds = netHomeEquity * 0.4; // Conservative early downsize
            const mortgageReduction = mortgageBalance * 0.7; // Assume reduce mortgage by 70%
            const monthlyCashFlowImprovement = monthlyMortgage * 0.7;

            scenarios.push({
                name: "Early Home Downsizing for Cash Flow",
                description: `Downsize now to reduce mortgage burden ($${monthlyMortgage}/month) and improve cash flow by $${monthlyCashFlowImprovement}/month.`,
                modifications: {
                    homeValue: homeValue * 0.6,
                    mortgageBalance: mortgageBalance * 0.3,
                    currentStocks: this.baseInputs.currentStocks + earlyDownsizeProceeds
                },
                feasibility: "Significant Lifestyle Change",
                factorsChanged: [
                    `Mortgage payment reduction: $${monthlyMortgage} → $${Math.round(monthlyMortgage * 0.3)}/month`,
                    `Monthly cash flow improvement: $${monthlyCashFlowImprovement}`,
                    `Additional investment capital: $${earlyDownsizeProceeds.toLocaleString()}`,
                    `Annual savings capacity increase: $${(monthlyCashFlowImprovement * 12).toLocaleString()}`,
                    `Reduces housing stress ratio significantly`
                ]
            });
        }

        // Scenario 3: Reverse mortgage if very high value home but poor cash flow
        if (homeValue > 1200000 && cashFlowAnalysis.cashFlow.status === 'stressed' && this.baseInputs.yourCurrentAge > 55) {
            const reverseMortgageAmount = Math.min(homeValue * 0.3, 500000); // 30% of value or $500k max
            const monthlyIncome = Math.round(reverseMortgageAmount / 12 / 10); // Spread over 10 years

            scenarios.push({
                name: "Reverse Mortgage for Cash Flow",
                description: `Use reverse mortgage to unlock $${reverseMortgageAmount.toLocaleString()} from your high-value home while staying put.`,
                modifications: {
                    currentStocks: this.baseInputs.currentStocks + reverseMortgageAmount,
                    mortgageBalance: (mortgageBalance || 0) + reverseMortgageAmount
                },
                feasibility: "Complex Financial Product",
                factorsChanged: [
                    `Home equity accessed: $${reverseMortgageAmount.toLocaleString()}`,
                    `Monthly cash flow boost: $${monthlyIncome}`,
                    `No monthly repayments required`,
                    `Interest compounds against home value`,
                    `Allows staying in family home`
                ]
            });
        }

        return scenarios;
    }

    /**
     * Analyzes scenarios related to the investment property with cash flow considerations.
     * @returns {Array<Object>} A list of scenarios to test.
     */
    _analyzeInvestmentProperty() {
        const scenarios = [];
        if (!this.baseInputs.hasInvestmentProperty) {
            return scenarios;
        }

        const yearsToRetirement = this.baseInputs.retirementAge - this.baseInputs.yourCurrentAge;
        const propertyValue = this.baseInputs.investmentPropertyValue || 600000;
        const propertyLoan = this.baseInputs.investmentPropertyLoan || 0;
        const weeklyRent = this.baseInputs.weeklyRentalIncome || 500;
        const annualRent = weeklyRent * 52;
        const annualExpenses = this.baseInputs.annualPropertyExpenses || 5000;
        const netAnnualIncome = annualRent - annualExpenses;
        const netEquity = propertyValue - propertyLoan;

        // Get cash flow analysis to understand property's impact on overall finances
        const cashFlowAnalysis = this.simulator.calculateCashFlowAnalysis(this.baseInputs);
        const monthlyDisposableIncome = cashFlowAnalysis.cashFlow.monthlyDisposableIncome;

        // Scenario 1: Sell property immediately if negative gearing is straining cash flow
        if (netAnnualIncome < 0 && monthlyDisposableIncome < 500) {
            const saleProceeds = netEquity * 0.95; // Account for selling costs
            const monthlyCashFlowImprovement = Math.abs(netAnnualIncome) / 12;

            scenarios.push({
                name: "Sell Investment Property Immediately",
                description: `Property is negatively geared (costing $${Math.abs(netAnnualIncome).toLocaleString()}/year) while you have limited cash flow.`,
                modifications: {
                    hasInvestmentProperty: false,
                    currentStocks: this.baseInputs.currentStocks + saleProceeds
                },
                feasibility: "Immediate Cash Flow Relief",
                factorsChanged: [
                    `Eliminates negative gearing cost: $${Math.abs(netAnnualIncome).toLocaleString()}/year`,
                    `Monthly cash flow improvement: $${Math.round(monthlyCashFlowImprovement)}`,
                    `Sale proceeds for diversified investments: $${saleProceeds.toLocaleString()}`,
                    `Reduces investment concentration risk`,
                    `Eliminates property management burden`
                ]
            });
        }

        // Scenario 2: Sell property at retirement (standard strategy)
        if (yearsToRetirement > 0 && yearsToRetirement < 15) {
            const projectedValue = propertyValue * Math.pow(1.04, yearsToRetirement); // 4% growth assumption
            const projectedEquity = projectedValue - propertyLoan; // Assume no principal paydown for simplicity

            scenarios.push({
                name: "Sell Investment Property at Retirement",
                description: `Hold property for ${yearsToRetirement} years, then sell and invest proceeds for retirement income.`,
                modifications: { sellPropertyYears: yearsToRetirement },
                feasibility: "Standard Strategy",
                factorsChanged: [
                    `Projected sale value: $${projectedValue.toLocaleString()}`,
                    `Estimated net proceeds: $${projectedEquity.toLocaleString()}`,
                    `${yearsToRetirement} years of rental income first`,
                    `Capital gains tax on growth portion`,
                    `Converts to diversified retirement income`
                ]
            });
        }

        // Scenario 3: Sell property in 5 years (if strong cash flow allows waiting)
        if (monthlyDisposableIncome > 1000 && netAnnualIncome > -5000) {
            const fiveYearValue = propertyValue * Math.pow(1.04, 5);
            const fiveYearEquity = fiveYearValue - propertyLoan;

            scenarios.push({
                name: "Sell Investment Property in 5 Years",
                description: `Hold for medium term to capture more growth, then sell and reinvest proceeds.`,
                modifications: { sellPropertyYears: 5 },
                feasibility: "Medium-term Strategy",
                factorsChanged: [
                    `5-year projected value: $${fiveYearValue.toLocaleString()}`,
                    `Estimated net proceeds: $${fiveYearEquity.toLocaleString()}`,
                    `Captures moderate capital appreciation`,
                    `Reduces CGT holding period risk`,
                    `Earlier access to diversified investments`
                ]
            });
        }

        // Scenario 4: Keep property indefinitely (if strong positive cash flow)
        if (netAnnualIncome > 10000 && monthlyDisposableIncome > 800) {
            const annualIncomeInRetirement = netAnnualIncome * 1.5; // Assume rent growth over time

            scenarios.push({
                name: "Keep Investment Property Indefinitely",
                description: `Property generates strong income ($${netAnnualIncome.toLocaleString()}/year) and you have sufficient cash flow to maintain it.`,
                modifications: { sellPropertyYears: 0 },
                feasibility: "Income-Focused Strategy",
                factorsChanged: [
                    `Current annual net income: $${netAnnualIncome.toLocaleString()}`,
                    `Projected retirement income: $${Math.round(annualIncomeInRetirement).toLocaleString()}/year`,
                    `Maintains capital growth potential`,
                    `Provides inflation-linked income stream`,
                    `Requires ongoing property management`
                ]
            });
        }

        // Scenario 5: Partial refinancing to improve cash flow (if equity available)
        if (netAnnualIncome < 0 && netEquity > 200000 && monthlyDisposableIncome < 1000) {
            const refinanceAmount = Math.min(netEquity * 0.3, 150000);
            const monthlyIncome = Math.round((refinanceAmount * 0.05) / 12); // 5% yield assumption

            scenarios.push({
                name: "Refinance Property to Improve Cash Flow",
                description: `Extract $${refinanceAmount.toLocaleString()} equity and invest in income-producing assets to offset negative gearing.`,
                modifications: {
                    investmentPropertyLoan: propertyLoan + refinanceAmount,
                    currentStocks: this.baseInputs.currentStocks + refinanceAmount
                },
                feasibility: "Financial Restructure",
                factorsChanged: [
                    `Extract property equity: $${refinanceAmount.toLocaleString()}`,
                    `Invest in diversified income assets`,
                    `Potential monthly income offset: $${monthlyIncome}`,
                    `Reduces negative gearing impact`,
                    `Maintains property exposure with better cash flow`
                ]
            });
        }

        return scenarios;
    }

    /**
     * Analyzes scenarios related to increasing contributions with realistic cash flow constraints.
     * @param {Object} baselineResults - The results from the baseline simulation.
     * @returns {Array<Object>} A list of scenarios to test.
     */
    _analyzeContributions(baselineResults) {
        const scenarios = [];

        // First, analyze actual cash flow using the simulator's cash flow analysis
        const cashFlowAnalysis = this.simulator.calculateCashFlowAnalysis(this.baseInputs);
        const monthlyDisposableIncome = cashFlowAnalysis.cashFlow.monthlyDisposableIncome;
        const savingsCapacity = cashFlowAnalysis.savingsAnalysis;

        const totalIncome = this.baseInputs.yourSalary + this.baseInputs.partnerSalary;
        const currentSavingsRate = this.baseInputs.percentIncomeSaved;
        const superGuarantee = 0.12; // 12% super guarantee

        // Only suggest contribution increases if there is actual capacity
        if (savingsCapacity.canIncreaseSavings) {

            // Scenario 1: Salary sacrifice additional super (based on actual capacity)
            const maxConcessional = 30000; // 2025 concessional cap
            const currentSuperContrib = totalIncome * superGuarantee;
            const availableRoom = Math.max(0, maxConcessional - currentSuperContrib);

            if (availableRoom > 1000 && monthlyDisposableIncome > 200) {
                // Base additional contribution on actual disposable income, not theoretical percentages
                const maxAffordable = Math.min(monthlyDisposableIncome * 0.5, availableRoom / 12); // 50% of disposable or cap room
                const additionalMonthly = Math.max(100, Math.round(maxAffordable / 50) * 50); // Round to $50 increments, minimum $100
                const additionalContrib = additionalMonthly * 12;

                if (additionalContrib > 500) {
                    scenarios.push({
                        name: "Salary Sacrifice to Super (Cash Flow Optimized)",
                        description: `Based on your disposable income of $${Math.round(monthlyDisposableIncome)}/month, salary sacrifice $${additionalContrib.toLocaleString()} annually.`,
                        modifications: { additionalSuperContributions: additionalContrib / totalIncome },
                        feasibility: savingsCapacity.hasStrongCapacity ? "Easily Affordable" : "Manageable",
                        factorsChanged: [
                            `Monthly super increase: $${additionalMonthly} (within disposable income)`,
                            `Annual super boost: $${additionalContrib.toLocaleString()}`,
                            `Tax savings: ~$${Math.round(additionalContrib * 0.325).toLocaleString()}`,
                            `Remaining disposable income: $${Math.round(monthlyDisposableIncome - additionalMonthly)}/month`,
                            `Uses ${Math.round(availableRoom - additionalContrib).toLocaleString()} of concessional cap room`
                        ]
                    });
                }
            }

            // Scenario 2: Increase monthly investments (realistic based on cash flow)
            const currentMonthly = this.baseInputs.monthlyStockContribution || 0;
            const affordableIncrease = Math.min(monthlyDisposableIncome * 0.6, 1000); // 60% of disposable or $1000 max
            const additionalMonthly = Math.max(100, Math.round(affordableIncrease / 100) * 100); // Round to $100, minimum $100

            if (additionalMonthly > 0 && monthlyDisposableIncome > additionalMonthly) {
                const newMonthly = currentMonthly + additionalMonthly;
                scenarios.push({
                    name: `Increase Monthly Investments by $${additionalMonthly}`,
                    description: `Boost monthly investments from $${currentMonthly} to $${newMonthly} based on your available cash flow.`,
                    modifications: { monthlyStockContribution: newMonthly },
                    feasibility: additionalMonthly <= monthlyDisposableIncome * 0.4 ? "Comfortable" : "Tight but manageable",
                    factorsChanged: [
                        `Monthly investments: $${currentMonthly} → $${newMonthly}`,
                        `Uses $${additionalMonthly} of $${Math.round(monthlyDisposableIncome)} disposable income`,
                        `Annual investment increase: $${(additionalMonthly * 12).toLocaleString()}`,
                        `Compounds over ${this.baseInputs.retirementAge - this.baseInputs.yourCurrentAge} years to retirement`,
                        `Remaining monthly buffer: $${Math.round(monthlyDisposableIncome - additionalMonthly)}`
                    ]
                });
            }

        } else {
            // If no savings capacity, suggest alternative strategies

            // Asset sale scenarios for generating investment capacity
            if (this.baseInputs.hasInvestmentProperty || this.baseInputs.currentStocks > 50000) {

                if (this.baseInputs.hasInvestmentProperty) {
                    const propertyValue = this.baseInputs.investmentPropertyValue || 600000;
                    const propertyLoan = this.baseInputs.investmentPropertyLoan || 0;
                    const netProceeds = propertyValue - propertyLoan;
                    const additionalMonthly = Math.round((netProceeds * 0.05) / 12); // 5% withdrawal rate monthly

                    scenarios.push({
                        name: "Sell Investment Property for Super Boost",
                        description: `With limited cash flow ($${Math.round(monthlyDisposableIncome)}/month), sell investment property to fund retirement savings.`,
                        modifications: { hasInvestmentProperty: false, currentStocks: this.baseInputs.currentStocks + netProceeds },
                        feasibility: "Major Financial Restructure",
                        factorsChanged: [
                            `Eliminates property management and loan payments`,
                            `Adds $${netProceeds.toLocaleString()} to investment portfolio`,
                            `Potential monthly income boost: $${additionalMonthly}`,
                            `Removes property concentration risk`,
                            `Increases liquidity for retirement needs`
                        ]
                    });
                }

                if (this.baseInputs.currentStocks > 100000) {
                    const rebalanceAmount = this.baseInputs.currentStocks * 0.2; // 20% of current stocks

                    scenarios.push({
                        name: "Rebalance Investments to Super",
                        description: `Transfer $${rebalanceAmount.toLocaleString()} from taxable investments to superannuation for tax efficiency.`,
                        modifications: {
                            currentStocks: this.baseInputs.currentStocks - rebalanceAmount,
                            additionalSuperContributions: Math.min(rebalanceAmount / totalIncome, 0.1) // Cap at 10% of income
                        },
                        feasibility: "Tax Optimization Strategy",
                        factorsChanged: [
                            `Reduces taxable investment balance by $${rebalanceAmount.toLocaleString()}`,
                            `Increases super contributions significantly`,
                            `Improves tax efficiency (super vs. taxable)`,
                            `No change to monthly cash flow requirements`,
                            `Better asset protection in super environment`
                        ]
                    });
                }
            }

            // Expense reduction scenarios
            if (cashFlowAnalysis.opportunities && cashFlowAnalysis.opportunities.length > 0) {
                const topOpportunity = cashFlowAnalysis.opportunities[0];
                const monthlySavings = topOpportunity.monthlySavings || 200;

                scenarios.push({
                    name: "Optimize Expenses to Increase Savings",
                    description: `${topOpportunity.description} to free up $${monthlySavings}/month for retirement savings.`,
                    modifications: { monthlyStockContribution: (this.baseInputs.monthlyStockContribution || 0) + monthlySavings },
                    feasibility: "Lifestyle Adjustment Required",
                    factorsChanged: [
                        `${topOpportunity.action}`,
                        `Monthly savings increase: $${monthlySavings}`,
                        `Annual additional investments: $${(monthlySavings * 12).toLocaleString()}`,
                        `Improves long-term financial security`,
                        `May require budgeting discipline`
                    ]
                });
            }
        }

        return scenarios;
    }

    /**
     * Analyzes scenarios related to investment strategy (asset allocation).
     * @param {Object} baselineResults - The results from the baseline simulation.
     * @returns {Array<Object>} A list of scenarios to test.
     */
    _analyzeInvestmentStrategy(baselineResults) {
        const scenarios = [];
        const currentEquities = this.baseInputs.allocEquities;
        const currentBonds = this.baseInputs.allocBonds;
        const currentCash = this.baseInputs.allocCash;
        const age = this.baseInputs.yourCurrentAge;
        const yearsToRetirement = this.baseInputs.retirementAge - age;

        // Always test allocation scenarios for comparison

        // Scenario 1: Age-appropriate aggressive allocation (if currently conservative)
        if (currentEquities < 70 && yearsToRetirement > 10) {
            const targetEquities = Math.min(85, Math.max(70, 110 - age)); // Rule of 110
            const newEquities = Math.min(90, targetEquities);
            const newBonds = Math.max(5, Math.round((100 - newEquities) * 0.8));
            const newCash = 100 - newEquities - newBonds;

            scenarios.push({
                name: "Age-Appropriate Aggressive Strategy",
                description: `Increase equity allocation to ${newEquities}% based on your age (${age}) and ${yearsToRetirement} years to retirement.`,
                modifications: {
                    useGlidePath: false,
                    allocEquities: newEquities,
                    allocBonds: newBonds,
                    allocCash: newCash
                },
                factorsChanged: [
                    `Equity allocation: ${currentEquities}% → ${newEquities}%`,
                    `Bond allocation: ${currentBonds}% → ${newBonds}%`,
                    `Cash allocation: ${currentCash}% → ${newCash}%`,
                    `Expected higher returns with more volatility`,
                    `Suitable for ${yearsToRetirement}+ year time horizon`
                ]
            });
        }

        // Scenario 2: Conservative pre-retirement allocation (if approaching retirement)
        if (currentEquities > 50 && yearsToRetirement <= 10) {
            const targetEquities = Math.max(40, 70 - (10 - yearsToRetirement) * 5); // Reduce as retirement approaches
            const newEquities = targetEquities;
            const newBonds = Math.min(50, Math.round((100 - newEquities) * 0.7));
            const newCash = 100 - newEquities - newBonds;

            scenarios.push({
                name: "Pre-Retirement Conservative Strategy",
                description: `Reduce equity allocation to ${newEquities}% to lower volatility as retirement approaches.`,
                modifications: {
                    useGlidePath: false,
                    allocEquities: newEquities,
                    allocBonds: newBonds,
                    allocCash: newCash
                },
                factorsChanged: [
                    `Equity allocation: ${currentEquities}% → ${newEquities}%`,
                    `Bond allocation: ${currentBonds}% → ${newBonds}%`,
                    `Cash allocation: ${currentCash}% → ${newCash}%`,
                    `Lower volatility reduces sequence-of-returns risk`,
                    `More stable near-term returns for retirement`
                ]
            });
        }

        // Scenario 3: Balanced approach (if currently at extremes)
        if (currentEquities < 40 || currentEquities > 80) {
            const balancedEquities = 60;
            const balancedBonds = 30;
            const balancedCash = 10;

            scenarios.push({
                name: "Balanced 60/30/10 Strategy",
                description: `Adopt a balanced approach with ${balancedEquities}% equities, ${balancedBonds}% bonds, ${balancedCash}% cash.`,
                modifications: {
                    useGlidePath: false,
                    allocEquities: balancedEquities,
                    allocBonds: balancedBonds,
                    allocCash: balancedCash
                },
                factorsChanged: [
                    `Equity allocation: ${currentEquities}% → ${balancedEquities}%`,
                    `Bond allocation: ${currentBonds}% → ${balancedBonds}%`,
                    `Cash allocation: ${currentCash}% → ${balancedCash}%`,
                    `Moderate risk/return profile`,
                    `Good balance for most age groups`
                ]
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
        const currentAge = this.baseInputs.yourCurrentAge;
        const retirementAge = this.baseInputs.retirementAge;
        const partnerRetirementAge = this.baseInputs.partnerRetirementAge;
        const yearsToRetirement = retirementAge - currentAge;

        // Always test retirement age scenarios for comparison, not just if success rate is low

        // Scenario 1: Retire 2 years later (if not already near max working age)
        if (retirementAge < 68) {
            const newRetirementAge = Math.min(70, retirementAge + 2);
            const newPartnerAge = Math.min(70, partnerRetirementAge + 2);
            scenarios.push({
                name: "Retire 2 Years Later",
                description: `Extend retirement from age ${retirementAge} to ${newRetirementAge}. Extra working years provide more contributions and compound growth.`,
                modifications: {
                    retirementAge: newRetirementAge,
                    partnerRetirementAge: newPartnerAge
                },
                factorsChanged: [
                    `Your retirement age: ${retirementAge} → ${newRetirementAge}`,
                    `Partner retirement age: ${partnerRetirementAge} → ${newPartnerAge}`,
                    `Extra super contributions for ${newRetirementAge - retirementAge} years`,
                    `Delayed drawdown allows more compound growth`
                ]
            });
        }

        // Scenario 2: Retire 2 years earlier (if currently planning to work past 65)
        if (retirementAge > 62) {
            const newRetirementAge = Math.max(60, retirementAge - 2);
            const newPartnerAge = Math.max(60, partnerRetirementAge - 2);
            scenarios.push({
                name: "Retire 2 Years Earlier",
                description: `Bring forward retirement from age ${retirementAge} to ${newRetirementAge}. Earlier retirement but less time for accumulation.`,
                modifications: {
                    retirementAge: newRetirementAge,
                    partnerRetirementAge: newPartnerAge
                },
                factorsChanged: [
                    `Your retirement age: ${retirementAge} → ${newRetirementAge}`,
                    `Partner retirement age: ${partnerRetirementAge} → ${newPartnerAge}`,
                    `Fewer super contribution years`,
                    `Earlier drawdown reduces compound growth`,
                    `Longer retirement period to fund`
                ]
            });
        }

        // Scenario 3: Major extension for poor success rates
        if (baselineResults.successRate < 0.7 && retirementAge < 67) {
            const extension = yearsToRetirement > 10 ? 5 : 3; // Smaller extension if close to retirement
            const newRetirementAge = Math.min(70, retirementAge + extension);
            const newPartnerAge = Math.min(70, partnerRetirementAge + extension);
            scenarios.push({
                name: `Retire ${extension} Years Later`,
                description: `With ${(baselineResults.successRate * 100).toFixed(0)}% success rate, working ${extension} extra years significantly improves outcomes.`,
                modifications: {
                    retirementAge: newRetirementAge,
                    partnerRetirementAge: newPartnerAge
                },
                factorsChanged: [
                    `Your retirement age: ${retirementAge} → ${newRetirementAge}`,
                    `Partner retirement age: ${partnerRetirementAge} → ${newPartnerAge}`,
                    `${extension} extra years of salary and super contributions`,
                    `${extension} fewer years of retirement to fund`,
                    `Significantly more compound growth time`
                ]
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
        let feasibility = scenario.feasibility || "Standard Strategy"; // Get feasibility from scenario
        let factorsChanged = scenario.factorsChanged || []; // Get detailed factors

        if (successDiff > 0.05) impact = "high-positive";
        else if (successDiff > 0) impact = "positive";
        else if (successDiff < -0.05) impact = "high-negative";
        else if (successDiff < 0) impact = "negative";

        // Categorize and format based on scenario name
        if (scenario.name.includes("Property")) {
            category = "Investment Property";
            summary = this._formatPropertyRecommendation(scenario, baseResult);
        } else if (scenario.name.includes("Downsize") || scenario.name.includes("Home")) {
            category = "Home Ownership";
            summary = this._formatDownsizeRecommendation(scenario, baseResult);
        } else if (scenario.name.includes("Increase") || scenario.name.includes("Savings Rate") || scenario.name.includes("Super") || scenario.name.includes("Optimize Expenses")) {
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

        // Enhanced summary with feasibility and cash flow considerations
        if (feasibility && feasibility !== "Standard Strategy") {
            summary += ` Feasibility: ${feasibility}.`;
        }

        return {
            title,
            category,
            summary,
            impact,
            feasibility,
            factorsChanged,
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
