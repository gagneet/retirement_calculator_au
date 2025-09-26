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
        scenarios = scenarios.concat(this._analyzeMortgageAcceleration(baselineResults));
        scenarios = scenarios.concat(this._analyzeSalaryProgression(baselineResults));
        scenarios = scenarios.concat(this._analyzeFrankingCreditsOptimization(baselineResults));
        scenarios = scenarios.concat(this._analyzeEnhancedPropertyTiming(baselineResults));
        scenarios = scenarios.concat(this._analyzePartnerRetirementTiming(baselineResults));
        scenarios = scenarios.concat(this._analyzeInvestmentStrategy(baselineResults));
        scenarios = scenarios.concat(this._analyzeRetirementAge(baselineResults));
        scenarios = scenarios.concat(this._analyzeWidowWidowerScenarios(baselineResults));
        scenarios = scenarios.concat(this._analyzeInsuranceStrategies(baselineResults));

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
                description: `Property is negatively geared (costing $${Math.abs(netAnnualIncome).toLocaleString()}/year) while you have limited cash flow. **Impact: POSITIVE** - Immediate cash flow relief of $${Math.round(monthlyCashFlowImprovement)}/month. **Risk: LOW** - Eliminates property management and concentration risk. **Timeline: Immediate (2025)** - Sale can occur within 30-90 days, providing instant financial relief.`,
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
                description: `Hold property for ${yearsToRetirement} years, then sell and invest proceeds for retirement income. **Impact: MODERATE POSITIVE** - Potential capital growth to $${projectedValue.toLocaleString()} by ${2025 + yearsToRetirement}. **Risk: MEDIUM** - Property market and rental income volatility over ${yearsToRetirement} years. **Timeline: ${2025 + yearsToRetirement}** - Maximizes capital appreciation while providing rental income until retirement.`,
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
                description: `Hold for medium term to capture more growth, then sell and reinvest proceeds. **Impact: POSITIVE** - Estimated growth to $${fiveYearValue.toLocaleString()} by 2030. **Risk: MEDIUM** - 5-year property cycle exposure but reduces long-term market risk. **Timeline: 2030** - Balances growth potential with portfolio diversification timing.`,
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
                description: `Property generates strong income ($${netAnnualIncome.toLocaleString()}/year) and you have sufficient cash flow to maintain it. **Impact: HIGH POSITIVE** - Projected retirement income of $${Math.round(annualIncomeInRetirement).toLocaleString()}/year. **Risk: HIGH** - Long-term property market exposure and management burden. **Timeline: Indefinite** - Provides ongoing income stream but requires active management throughout retirement.`,
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
                description: `Extract $${refinanceAmount.toLocaleString()} equity and invest in income-producing assets to offset negative gearing. **Impact: POSITIVE** - Potential monthly income increase of $${monthlyIncome}. **Risk: MEDIUM** - Increases debt but diversifies income sources. **Timeline: 2025-2026** - Refinancing process takes 3-6 months to complete.`,
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

        // === INSURANCE CONSIDERATIONS FOR PROPERTY STRATEGY ===

        // Scenario 6: Property liquidation if TPD occurs (insurance impact analysis)
        if (netEquity > 300000 && (netAnnualIncome < 0 || monthlyDisposableIncome < 800)) {
            const tpdBenefit = 250000; // Default TPD insurance
            const emergencySaleProceeds = netEquity * 0.90; // Quick sale discount
            const totalEmergencyFunds = tpdBenefit + emergencySaleProceeds;

            scenarios.push({
                name: "Property Liquidation Strategy for TPD Protection",
                description: `What-if: TPD occurs and property needs quick sale. Combined insurance benefit and property liquidation provides substantial funds.`,
                modifications: {
                    hasInvestmentProperty: false,
                    currentStocks: this.baseInputs.currentStocks + emergencySaleProceeds + tpdBenefit,
                    yourSalary: 0, // TPD means no income
                    monthlyStockContribution: 0,
                    currentHealthcareCosts: (this.baseInputs.currentHealthcareCosts || 12000) + 35000 // TPD care costs
                },
                feasibility: "Insurance What-If Analysis",
                factorsChanged: [
                    `TPD insurance benefit: ${formatCurrency(tpdBenefit)}`,
                    `Emergency property sale proceeds: ${formatCurrency(emergencySaleProceeds)}`,
                    `Total emergency funds: ${formatCurrency(totalEmergencyFunds)}`,
                    `Eliminates property management burden during disability`,
                    `Provides liquid assets for care and living expenses`,
                    `Consider: Adequate insurance vs keeping illiquid property`
                ]
            });
        }

        // Scenario 7: Property retention with enhanced insurance (death benefit analysis)
        if (netEquity > 200000 && this.baseInputs.partnerSalary > 0) {
            const enhancedDeathBenefit = 500000; // Enhanced life insurance
            const ongoingPropertyIncome = netAnnualIncome > 0 ? netAnnualIncome : Math.abs(netAnnualIncome) * -1;

            scenarios.push({
                name: "Keep Property with Enhanced Life Insurance",
                description: `What-if: You die early but partner keeps property. Enhanced life insurance covers negative gearing and provides income.`,
                modifications: {
                    sellPropertyYears: 0, // Keep property
                    currentStocks: this.baseInputs.currentStocks + enhancedDeathBenefit,
                    yourSalary: 0, // Death means no primary income
                    monthlyStockContribution: 0,
                    isSingleCalculation: true,
                    asfaComfortable: (this.baseInputs.asfaComfortable || 70000) * 0.75 // Single person expenses
                },
                feasibility: "Enhanced Insurance Strategy",
                factorsChanged: [
                    `Enhanced death benefit: ${formatCurrency(enhancedDeathBenefit)}`,
                    `Property continues generating income: ${formatCurrency(Math.abs(ongoingPropertyIncome))}/year`,
                    `Partner keeps family wealth in property + shares`,
                    `Insurance covers property holding costs if negative geared`,
                    `Property provides inflation hedge for long-term wealth`,
                    `Consider: Higher life insurance premiums vs property benefits`
                ]
            });
        }

        // Scenario 8: Property concentration risk with insurance gap analysis
        if (netEquity > 400000) {
            const concentrationRisk = (netEquity / (netEquity + this.baseInputs.currentStocks + this.baseInputs.currentSavings)) * 100;
            const recommendedInsurance = netEquity * 0.8; // 80% of property value for protection

            if (concentrationRisk > 50) {
                scenarios.push({
                    name: "Address Property Concentration Risk with Insurance",
                    description: `${concentrationRisk.toFixed(0)}% of wealth in property creates concentration risk. Enhanced insurance protects against forced sale scenarios.`,
                    modifications: {
                        // Simulate enhanced insurance benefit
                        currentStocks: this.baseInputs.currentStocks + recommendedInsurance,
                        yourSalary: 0, // Worst case scenario - loss of income
                        isSingleCalculation: true
                    },
                    feasibility: "Risk Management Strategy",
                    factorsChanged: [
                        `Property concentration risk: ${concentrationRisk.toFixed(0)}% of total wealth`,
                        `Recommended insurance coverage: ${formatCurrency(recommendedInsurance)}`,
                        `Protects against forced property sale in crisis`,
                        `Provides liquidity alternative to property equity`,
                        `Insurance premiums vs potential property losses`,
                        `Consider: Gradual property diversification + adequate insurance`
                    ]
                });
            }
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
                            `Tax savings: ~$${Math.round(additionalContrib * 0.30).toLocaleString()}`,
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
     * Analyzes enhanced property timing scenarios with granular year-by-year analysis.
     * @param {Object} baselineResults - The results from the baseline simulation.
     * @returns {Array<Object>} A list of scenarios to test.
     */
    _analyzeEnhancedPropertyTiming(baselineResults) {
        const scenarios = [];
        if (!this.baseInputs.hasInvestmentProperty) {
            return scenarios;
        }

        const currentAge = this.baseInputs.yourCurrentAge;
        const retirementAge = this.baseInputs.retirementAge;
        const yearsToRetirement = retirementAge - currentAge;
        const propertyValue = this.baseInputs.investmentPropertyValue || 600000;
        const propertyLoan = this.baseInputs.investmentPropertyLoan || 0;
        const weeklyRent = this.baseInputs.weeklyRentalIncome || 500;
        const annualRent = weeklyRent * 52;
        const netEquity = propertyValue - propertyLoan;

        // Enhanced granular timing analysis - test selling every year from now until retirement+5
        const sellYearOptions = [];

        // Immediate sale (current year)
        sellYearOptions.push({
            years: 1,
            label: "Sell Investment Property Now",
            description: "Immediate sale to improve cash flow and diversify investments",
            rationale: "Convert illiquid property to liquid investments for better flexibility"
        });

        // Pre-retirement strategic timing (2, 3, 5 years before retirement)
        [2, 3, 5].forEach(yearsBefore => {
            const sellYear = Math.max(1, yearsToRetirement - yearsBefore);
            if (sellYear > 1 && sellYear < yearsToRetirement) {
                sellYearOptions.push({
                    years: sellYear,
                    label: `Sell ${yearsBefore} Years Before Retirement`,
                    description: `Strategic sale at age ${currentAge + sellYear} to optimize pre-retirement positioning`,
                    rationale: `Allows time to optimize asset allocation before retirement`
                });
            }
        });

        // At retirement timing
        if (yearsToRetirement > 1) {
            sellYearOptions.push({
                years: yearsToRetirement,
                label: "Sell at Retirement",
                description: `Sell when you retire at age ${retirementAge} for maximum capital growth`,
                rationale: "Standard strategy - maximize growth then convert to retirement income"
            });
        }

        // Post-retirement strategic timing (3, 5, 10 years after retirement)
        [3, 5, 10].forEach(yearsAfter => {
            const sellYear = yearsToRetirement + yearsAfter;
            if (sellYear <= 25) { // Don't project too far out
                sellYearOptions.push({
                    years: sellYear,
                    label: `Sell ${yearsAfter} Years After Retirement`,
                    description: `Hold for rental income in early retirement, sell at age ${retirementAge + yearsAfter}`,
                    rationale: "Income-first strategy with later capital access"
                });
            }
        });

        // Generate scenarios for each timing option
        sellYearOptions.forEach(option => {
            const projectedValue = this.simulator.calculatePropertyValue(
                propertyValue,
                this.baseInputs.propertyGrowthRate,
                option.years
            );
            const projectedEquity = projectedValue - propertyLoan; // Simplified - no principal paydown
            const cumulativeRent = annualRent * option.years;
            const totalReturn = projectedEquity + cumulativeRent - netEquity;
            const annualizedReturn = Math.pow((projectedEquity + cumulativeRent) / propertyValue, 1/option.years) - 1;

            scenarios.push({
                name: option.label,
                description: `${option.description}. ${option.rationale}.`,
                modifications: {
                    sellPropertyYears: option.years
                },
                feasibility: option.years <= 2 ? "Immediate Action" : option.years <= yearsToRetirement ? "Pre-Retirement Strategy" : "Post-Retirement Strategy",
                factorsChanged: [
                    `Sale year: ${option.years} (age ${currentAge + option.years})`,
                    `Projected property value: ${formatCurrency(projectedValue)}`,
                    `Estimated net proceeds: ${formatCurrency(projectedEquity)}`,
                    `Cumulative rental income: ${formatCurrency(cumulativeRent)}`,
                    `Total property return: ${formatCurrency(totalReturn)} (${(annualizedReturn * 100).toFixed(1)}% p.a.)`,
                    option.rationale
                ]
            });
        });

        return scenarios;
    }

    /**
     * Analyzes scenarios related to partner retirement timing optimization.
     * @param {Object} baselineResults - The results from the baseline simulation.
     * @returns {Array<Object>} A list of scenarios to test.
     */
    _analyzePartnerRetirementTiming(baselineResults) {
        const scenarios = [];
        const partnerCurrentAge = this.baseInputs.partnerCurrentAge;
        const partnerRetirementAge = this.baseInputs.partnerRetirementAge;
        const partnerSalary = this.baseInputs.partnerSalary;
        const yourRetirementAge = this.baseInputs.retirementAge;

        // Only analyze if there's a partner with income
        if (!partnerCurrentAge || partnerCurrentAge === 0 || !partnerSalary || partnerSalary === 0) {
            return scenarios;
        }

        const successRate = baselineResults.successRate;
        const partnerYearsToRetirement = partnerRetirementAge - partnerCurrentAge;

        // Scenario 1: Partner retires 2 years later
        if (partnerRetirementAge < 67 && successRate < 0.90) {
            const delayedRetirementAge = Math.min(70, partnerRetirementAge + 2);
            const extraWorkingYears = delayedRetirementAge - partnerRetirementAge;
            const extraContributions = partnerSalary * extraWorkingYears;
            const superContributions = extraContributions * 0.12; // Super guarantee

            scenarios.push({
                name: "Partner Retires 2 Years Later",
                description: `Partner works until age ${delayedRetirementAge} instead of ${partnerRetirementAge} to significantly improve household retirement security. **Impact: HIGH POSITIVE** - Additional ${formatCurrency(extraContributions)} salary plus ${formatCurrency(superContributions)} super contributions. **Risk: MEDIUM** - Depends on health and job availability. **Timeline: ${2025 + (delayedRetirementAge - partnerCurrentAge)}** - Partner retirement delayed to ${2025 + (delayedRetirementAge - partnerCurrentAge)}, improving success rate from ${(successRate * 100).toFixed(0)}%.`,
                modifications: {
                    partnerRetirementAge: delayedRetirementAge
                },
                feasibility: "Career Extension Required",
                factorsChanged: [
                    `Partner retirement age: ${partnerRetirementAge} → ${delayedRetirementAge}`,
                    `Extra working years: ${extraWorkingYears}`,
                    `Additional salary: ${formatCurrency(extraContributions)}`,
                    `Additional super contributions: ${formatCurrency(superContributions)}`,
                    `Improves success rate from ${(successRate * 100).toFixed(0)}%`,
                    "Consider: health, career sustainability, lifestyle preferences"
                ]
            });
        }

        // Scenario 2: Partner retires 4 years later (more significant impact)
        if (partnerRetirementAge < 65 && successRate < 0.80) {
            const delayedRetirementAge = Math.min(70, partnerRetirementAge + 4);
            const extraWorkingYears = delayedRetirementAge - partnerRetirementAge;
            const extraContributions = partnerSalary * extraWorkingYears;
            const superContributions = extraContributions * 0.12;
            const compoundBenefit = extraContributions * 1.3; // Rough estimate of compound effect

            scenarios.push({
                name: "Partner Retires 4 Years Later",
                description: `Partner extends career to age ${delayedRetirementAge} for maximum financial security - particularly valuable given current success rate of ${(successRate * 100).toFixed(0)}%. **Impact: VERY HIGH POSITIVE** - Total benefit with compound growth ~${formatCurrency(compoundBenefit)}. **Risk: HIGH** - Significant lifestyle impact and health considerations. **Timeline: ${2025 + (delayedRetirementAge - partnerCurrentAge)}** - Major career extension to ${2025 + (delayedRetirementAge - partnerCurrentAge)}, dramatically improving retirement security.`,
                modifications: {
                    partnerRetirementAge: delayedRetirementAge
                },
                feasibility: "Major Career Extension",
                factorsChanged: [
                    `Partner retirement age: ${partnerRetirementAge} → ${delayedRetirementAge}`,
                    `Extra working years: ${extraWorkingYears}`,
                    `Additional salary: ${formatCurrency(extraContributions)}`,
                    `Additional super contributions: ${formatCurrency(superContributions)}`,
                    `Total benefit with compound growth: ~${formatCurrency(compoundBenefit)}`,
                    "Major improvement to retirement success probability",
                    "Consider: significant lifestyle impact, health implications"
                ]
            });
        }

        // Scenario 3: Partner retires earlier but at same time as main person
        if (partnerRetirementAge > yourRetirementAge && partnerYearsToRetirement > 2) {
            const synchronizedAge = yourRetirementAge;
            const earlyYears = partnerRetirementAge - synchronizedAge;
            const lostContributions = partnerSalary * earlyYears;

            scenarios.push({
                name: "Synchronized Retirement Ages",
                description: `Partner retires at same time as you (age ${synchronizedAge}) instead of working until ${partnerRetirementAge} - lifestyle vs financial trade-off.`,
                modifications: {
                    partnerRetirementAge: synchronizedAge
                },
                feasibility: "Lifestyle Choice",
                factorsChanged: [
                    `Partner retirement age: ${partnerRetirementAge} → ${synchronizedAge}`,
                    `Retire together for synchronized lifestyle`,
                    `Reduced income: ${formatCurrency(lostContributions)} over ${earlyYears} years`,
                    "Benefits: shared retirement experiences, travel together",
                    "Consider: financial impact on overall retirement security"
                ]
            });
        }

        // Scenario 4: Staggered retirement (partner retires first)
        if (partnerCurrentAge > this.baseInputs.yourCurrentAge + 3 && partnerRetirementAge > 60) {
            const staggeredAge = Math.max(60, partnerRetirementAge - 2);
            const earlyYears = partnerRetirementAge - staggeredAge;

            scenarios.push({
                name: "Partner Retires First (Staggered)",
                description: `Partner retires at age ${staggeredAge}, ${earlyYears} years before originally planned, to provide household support and flexibility.`,
                modifications: {
                    partnerRetirementAge: staggeredAge
                },
                feasibility: "Household Strategy",
                factorsChanged: [
                    `Partner retires ${earlyYears} years early`,
                    "Provides household support during your peak earning years",
                    "Flexibility for family responsibilities",
                    "Partner available for health issues, grandchildren, etc.",
                    "Primary earner continues building retirement funds",
                    "Consider: reduced household income during transition"
                ]
            });
        }

        return scenarios;
    }

    /**
     * Analyzes scenarios related to mortgage acceleration and optimization.
     * @param {Object} baselineResults - The results from the baseline simulation.
     * @returns {Array<Object>} A list of scenarios to test.
     */
    _analyzeMortgageAcceleration(baselineResults) {
        const scenarios = [];
        const cashFlowAnalysis = this.simulator.calculateCashFlowAnalysis(this.baseInputs);
        const monthlyDisposableIncome = cashFlowAnalysis.cashFlow.monthlyDisposableIncome;
        const mortgageBalance = this.baseInputs.mortgageBalance;
        const mortgagePayment = this.baseInputs.monthlyMortgagePayment;
        const mortgageRate = this.baseInputs.mortgageRate;
        const currentAge = this.baseInputs.yourCurrentAge;
        const retirementAge = this.baseInputs.retirementAge;

        if (mortgageBalance > 0 && mortgagePayment > 0) {
            // Scenario 1: Accelerate mortgage with extra $200-500/month
            const extraPaymentOptions = [200, 350, 500].filter(amount => amount <= monthlyDisposableIncome * 0.6);

            extraPaymentOptions.forEach(extraPayment => {
                // Calculate years saved with extra payments
                const yearsSaved = this.calculateYearsSavedWithExtraPayments(
                    mortgageBalance,
                    mortgagePayment,
                    mortgageRate / 12,
                    extraPayment
                );
                const interestSaved = this.calculateInterestSaved(mortgageBalance, mortgagePayment, mortgageRate / 12, extraPayment);

                scenarios.push({
                    name: `Accelerate Mortgage with Extra $${extraPayment}/month`,
                    description: `Pay additional $${extraPayment} monthly towards mortgage principal to pay off loan ${yearsSaved.toFixed(1)} years earlier and save ${formatCurrency(interestSaved)} in interest. **Impact: HIGH POSITIVE** - Guaranteed savings of ${formatCurrency(interestSaved)} and debt freedom ${yearsSaved.toFixed(1)} years earlier. **Risk: LOW** - Guaranteed return equivalent to ${(mortgageRate * 100).toFixed(2)}% tax-free. **Timeline: ${Math.round(currentAge + (30 - yearsSaved))}** - Mortgage fully paid by age ${Math.round(currentAge + (30 - yearsSaved))}, freeing ${formatCurrency(mortgagePayment + extraPayment)}/month for retirement savings.`,
                    modifications: {
                        monthlyStockContribution: Math.max(0, this.baseInputs.monthlyStockContribution - extraPayment),
                        monthlyMortgagePayment: mortgagePayment + extraPayment
                    },
                    feasibility: extraPayment <= monthlyDisposableIncome * 0.4 ? "Easily Affordable" : "Requires budgeting",
                    factorsChanged: [
                        `Extra payment: $${extraPayment}/month`,
                        `Mortgage paid off ${yearsSaved.toFixed(1)} years earlier`,
                        `Total interest saved: ${formatCurrency(interestSaved)}`,
                        `Frees up ${formatCurrency(mortgagePayment + extraPayment)}/month from age ${Math.round(currentAge + (30 - yearsSaved))}`,
                        `Guaranteed return equivalent to ${(mortgageRate * 100).toFixed(2)}% tax-free`,
                        "Trade-off: Less money for share investments initially"
                    ]
                });
            });

            // Scenario 2: Compare mortgage vs investment strategy
            if (monthlyDisposableIncome > 300) {
                const investmentAmount = Math.min(500, monthlyDisposableIncome * 0.5);
                const mortgageVsInvestmentAnalysis = this.analyzeMortgageVsInvestment(
                    mortgageRate, this.baseInputs.investmentReturn, investmentAmount
                );

                scenarios.push({
                    name: `Invest Extra $${investmentAmount} Instead of Paying Down Mortgage`,
                    description: `Compare investing $${investmentAmount}/month vs paying down mortgage. ${mortgageVsInvestmentAnalysis.recommendation}.`,
                    modifications: {
                        monthlyStockContribution: this.baseInputs.monthlyStockContribution + investmentAmount
                    },
                    feasibility: "Standard Strategy",
                    factorsChanged: [
                        `Additional monthly investment: $${investmentAmount}`,
                        `Mortgage rate: ${(mortgageRate * 100).toFixed(2)}% (guaranteed return)`,
                        `Expected investment return: ${(this.baseInputs.investmentReturn * 100).toFixed(1)}% (variable)`,
                        mortgageVsInvestmentAnalysis.analysis,
                        "Higher liquidity with investments vs home equity",
                        "Consider: tax implications, risk tolerance, flexibility needs"
                    ]
                });
            }

            // Scenario 3: Refinancing opportunity analysis
            const currentRate = mortgageRate * 100;
            if (currentRate > 6.5) { // Above average 2025 rates
                const potentialNewRate = 6.2; // Current competitive rate
                const rateSaving = currentRate - potentialNewRate;
                const monthlySavings = (mortgageBalance * (rateSaving / 100)) / 12;

                scenarios.push({
                    name: "Refinance Mortgage for Lower Interest Rate",
                    description: `Your current rate of ${currentRate.toFixed(2)}% is above market average. Refinancing could save ${formatCurrency(monthlySavings)}/month.`,
                    modifications: {
                        mortgageRate: potentialNewRate / 100,
                        monthlyMortgagePayment: mortgagePayment - monthlySavings,
                        monthlyStockContribution: this.baseInputs.monthlyStockContribution + monthlySavings * 0.8
                    },
                    feasibility: "Refinancing Process Required",
                    factorsChanged: [
                        `Interest rate reduction: ${currentRate.toFixed(2)}% → ${potentialNewRate.toFixed(2)}%`,
                        `Monthly payment savings: ${formatCurrency(monthlySavings)}`,
                        `Annual savings: ${formatCurrency(monthlySavings * 12)}`,
                        `Extra for investments: ${formatCurrency(monthlySavings * 0.8)}/month`,
                        `Break-even period: ~2-3 years (including refinancing costs)`,
                        "Consider: refinancing fees, loan-to-value ratio, credit assessment"
                    ]
                });
            }

            // Scenario 4: Mortgage completion by specific target (e.g., 10 years)
            const targetYears = 10;
            if (targetYears < 25) { // Only if reasonable
                const requiredPayment = this.calculatePaymentForTargetYears(
                    mortgageBalance, mortgageRate / 12, targetYears * 12
                );
                const extraNeeded = requiredPayment - mortgagePayment;

                if (extraNeeded > 0 && extraNeeded <= monthlyDisposableIncome) {
                    scenarios.push({
                        name: `Pay Off Mortgage in Exactly ${targetYears} Years`,
                        description: `Increase payments by ${formatCurrency(extraNeeded)}/month to completely pay off mortgage in ${targetYears} years, freeing up all housing costs for retirement savings.`,
                        modifications: {
                            monthlyMortgagePayment: requiredPayment,
                            monthlyStockContribution: Math.max(0, this.baseInputs.monthlyStockContribution - extraNeeded)
                        },
                        feasibility: extraNeeded <= monthlyDisposableIncome * 0.5 ? "Achievable" : "Aggressive",
                        factorsChanged: [
                            `Extra monthly payment required: ${formatCurrency(extraNeeded)}`,
                            `Mortgage completed in exactly ${targetYears} years`,
                            `From age ${currentAge + targetYears}: ${formatCurrency(mortgagePayment + extraNeeded)}/month freed up`,
                            `${retirementAge - currentAge - targetYears} years of mortgage-free living before retirement`,
                            "Massive boost to retirement savings capacity in final working years",
                            "Consider: opportunity cost vs investment returns"
                        ]
                    });
                }
            }
        }

        return scenarios;
    }

    /**
     * Calculate years saved with extra mortgage payments
     */
    calculateYearsSavedWithExtraPayments(balance, monthlyPayment, monthlyRate, extraPayment) {
        if (monthlyRate === 0) return 0;

        // Original loan term
        const originalMonths = -Math.log(1 - (balance * monthlyRate) / monthlyPayment) / Math.log(1 + monthlyRate);

        // New loan term with extra payments
        const newMonthlyPayment = monthlyPayment + extraPayment;
        const newMonths = -Math.log(1 - (balance * monthlyRate) / newMonthlyPayment) / Math.log(1 + monthlyRate);

        return Math.max(0, (originalMonths - newMonths) / 12);
    }

    /**
     * Calculate total interest saved with extra payments
     */
    calculateInterestSaved(balance, monthlyPayment, monthlyRate, extraPayment) {
        if (monthlyRate === 0) return 0;

        const originalMonths = -Math.log(1 - (balance * monthlyRate) / monthlyPayment) / Math.log(1 + monthlyRate);
        const originalTotalPaid = monthlyPayment * originalMonths;

        const newMonthlyPayment = monthlyPayment + extraPayment;
        const newMonths = -Math.log(1 - (balance * monthlyRate) / newMonthlyPayment) / Math.log(1 + monthlyRate);
        const newTotalPaid = newMonthlyPayment * newMonths;

        return Math.max(0, originalTotalPaid - newTotalPaid);
    }

    /**
     * Calculate required payment for target loan term
     */
    calculatePaymentForTargetYears(balance, monthlyRate, targetMonths) {
        if (monthlyRate === 0) return balance / targetMonths;

        return balance * (monthlyRate * Math.pow(1 + monthlyRate, targetMonths)) /
            (Math.pow(1 + monthlyRate, targetMonths) - 1);
    }

    /**
     * Analyze mortgage vs investment decision
     */
    analyzeMortgageVsInvestment(mortgageRate, expectedInvestmentReturn, amount) {
        const rateDifference = expectedInvestmentReturn - mortgageRate;
        const ratePercentage = rateDifference * 100;

        if (rateDifference > 0.02) { // Investment return > mortgage rate + 2%
            return {
                recommendation: "Current rates favor investing over mortgage acceleration",
                analysis: `Investment expected return (${(expectedInvestmentReturn * 100).toFixed(1)}%) exceeds mortgage rate (${(mortgageRate * 100).toFixed(2)}%) by ${ratePercentage.toFixed(1)}%`
            };
        } else if (rateDifference < -0.01) { // Mortgage rate > investment return + 1%
            return {
                recommendation: "Current rates favor paying down mortgage first",
                analysis: `Mortgage rate (${(mortgageRate * 100).toFixed(2)}%) exceeds expected investment return (${(expectedInvestmentReturn * 100).toFixed(1)}%) - guaranteed savings`
            };
        } else {
            return {
                recommendation: "Rates are close - consider risk tolerance and liquidity needs",
                analysis: `Small difference between mortgage rate (${(mortgageRate * 100).toFixed(2)}%) and investment return (${(expectedInvestmentReturn * 100).toFixed(1)}%)`
            };
        }
    }

    /**
     * Analyzes scenarios related to salary progression and optimization.
     * @param {Object} baselineResults - The results from the baseline simulation.
     * @returns {Array<Object>} A list of scenarios to test.
     */
    _analyzeSalaryProgression(baselineResults) {
        const scenarios = [];
        const currentAge = this.baseInputs.yourCurrentAge;
        const retirementAge = this.baseInputs.retirementAge;
        const currentSalary = this.baseInputs.yourSalary;
        const partnerSalary = this.baseInputs.partnerSalary || 0;
        const totalCurrentIncome = currentSalary + partnerSalary;
        const yearsToRetirement = retirementAge - currentAge;

        // Scenario 1: Salary boost every 3 years (career progression)
        const currentGrowthRate = this.baseInputs.salaryGrowthRate;
        const enhancedGrowthRate = Math.min(currentGrowthRate + 1.5, 8); // Add 1.5% but cap at 8%
        const cyclicBoosts = Math.floor(yearsToRetirement / 3); // Number of 3-year cycles

        if (cyclicBoosts > 0) {
            scenarios.push({
                name: "Strategic Salary Boosts Every 3 Years",
                description: `Target ${enhancedGrowthRate.toFixed(1)}% annual salary growth through strategic career moves every 3 years - ${cyclicBoosts} opportunities before retirement. **Impact: HIGH POSITIVE** - Extra ${formatCurrency(totalCurrentIncome * 0.015)} annually, compounding over ${yearsToRetirement} years. **Risk: MEDIUM** - Requires active career planning and market opportunities. **Timeline: 2026, 2029, 2032...** - Strategic moves every 3 years to maximize earning potential before retirement.`,
                modifications: {
                    salaryGrowthRate: enhancedGrowthRate
                },
                feasibility: "Requires Active Career Planning",
                factorsChanged: [
                    `Salary growth: ${currentGrowthRate.toFixed(1)}% → ${enhancedGrowthRate.toFixed(1)}% annually`,
                    `${cyclicBoosts} strategic career moves (promotions/job changes) over ${yearsToRetirement} years`,
                    `Extra 1.5% growth = ${formatCurrency(totalCurrentIncome * 0.015)} more per year initially`,
                    `Compounds over ${yearsToRetirement} years to retirement`,
                    `Actions: skill development, networking, performance excellence, strategic job changes`,
                    "Consider: industry growth prospects, skill marketability"
                ]
            });
        }

        // Scenario 2: One-time significant salary boost (promotion/job change)
        const salaryBoostOptions = [0.15, 0.25, 0.35]; // 15%, 25%, 35% boosts
        const timingOptions = [2, 5]; // In 2 or 5 years

        salaryBoostOptions.forEach(boostPercent => {
            timingOptions.forEach(years => {
                if (years < yearsToRetirement) {
                    const boostAmount = totalCurrentIncome * boostPercent;
                    const cumulativeImpact = boostAmount * (yearsToRetirement - years);
                    const superImpact = cumulativeImpact * 0.12; // Super guarantee benefit

                    scenarios.push({
                        name: `${(boostPercent * 100).toFixed(0)}% Salary Boost in ${years} Years`,
                        description: `Target a major career move in ${years} years for a ${(boostPercent * 100).toFixed(0)}% salary increase - ${formatCurrency(boostAmount)} annually. **Impact: HIGH POSITIVE** - Cumulative extra earnings of ${formatCurrency(cumulativeImpact)} plus ${formatCurrency(superImpact)} additional super. **Risk: ${boostPercent <= 0.25 ? 'MEDIUM' : 'HIGH'}** - Depends on market conditions and career opportunities. **Timeline: ${2025 + years}** - Strategic career move targeted for ${2025 + years}, benefiting remaining ${yearsToRetirement - years} working years.`,
                        modifications: {
                            // This would require custom simulation logic for delayed salary boost
                            salaryGrowthRate: currentGrowthRate + (boostPercent * 100) / yearsToRetirement
                        },
                        feasibility: boostPercent <= 0.25 ? "Achievable with planning" : "Requires significant career change",
                        factorsChanged: [
                            `One-time boost: ${formatCurrency(boostAmount)} annually from year ${years}`,
                            `Cumulative extra earnings: ${formatCurrency(cumulativeImpact)}`,
                            `Additional super contributions: ${formatCurrency(superImpact)}`,
                            `Higher capacity for investments from increased salary`,
                            "Strategies: major promotion, industry change, executive role, consulting",
                            "Consider: job market conditions, skills development timeline"
                        ]
                    });
                }
            });
        });

        // Scenario 3: Adjust lean years timing for optimal earnings
        const currentLeanStart = this.baseInputs.leanYearsStart;
        const currentLeanReduction = this.baseInputs.leanYearsReduction;

        if (currentLeanStart > 0 && currentLeanReduction > 0) {
            // Delay lean years by 2-4 years to maximize peak earning period
            [2, 4].forEach(delayYears => {
                const newLeanStart = Math.max(0, currentLeanStart - delayYears);
                if (newLeanStart >= 0) {
                    const extraFullSalaryYears = delayYears;
                    const extraEarnings = totalCurrentIncome * extraFullSalaryYears;

                    scenarios.push({
                        name: `Delay Lean Years by ${delayYears} Years`,
                        description: `Push lean years from ${currentLeanStart} to ${newLeanStart} years before retirement to maximize peak earning potential.`,
                        modifications: {
                            leanYearsStart: newLeanStart
                        },
                        feasibility: "Career/Health Dependent",
                        factorsChanged: [
                            `Lean years timing: ${currentLeanStart} → ${newLeanStart} years before retirement`,
                            `Extra full salary years: ${extraFullSalaryYears}`,
                            `Additional earnings: ${formatCurrency(extraEarnings)}`,
                            `Higher super contributions during peak earning years`,
                            "Maintains full work intensity longer for maximum savings",
                            "Consider: work-life balance, health sustainability, burnout risk"
                        ]
                    });
                }
            });

            // Reduce lean years impact (less severe income reduction)
            const reducedImpact = Math.max(5, currentLeanReduction - 10); // Reduce by 10% but minimum 5%
            if (reducedImpact < currentLeanReduction) {
                const extraIncomePercent = currentLeanReduction - reducedImpact;
                const extraAnnualIncome = totalCurrentIncome * (extraIncomePercent / 100);
                const leanYearsDuration = Math.max(2, currentLeanStart); // Assume lean years last 2+ years
                const totalExtraIncome = extraAnnualIncome * leanYearsDuration;

                scenarios.push({
                    name: `Reduce Lean Years Impact to ${reducedImpact}%`,
                    description: `Maintain ${extraIncomePercent}% more income during lean years through part-time consulting, flexible work, or gradual retirement.`,
                    modifications: {
                        leanYearsReduction: reducedImpact
                    },
                    feasibility: "Flexible Work Arrangement",
                    factorsChanged: [
                        `Income reduction: ${currentLeanReduction}% → ${reducedImpact}%`,
                        `Extra ${extraIncomePercent}% income during pre-retirement years`,
                        `Additional income: ${formatCurrency(extraAnnualIncome)}/year for ~${leanYearsDuration} years`,
                        `Total extra earnings: ${formatCurrency(totalExtraIncome)}`,
                        "Strategies: consulting, part-time roles, phased retirement",
                        "Consider: skill marketability, industry demand, work flexibility"
                    ]
                });
            }
        }

        return scenarios;
    }

    /**
     * Analyzes scenarios related to franking credits optimization.
     * @param {Object} baselineResults - The results from the baseline simulation.
     * @returns {Array<Object>} A list of scenarios to test.
     */
    _analyzeFrankingCreditsOptimization(baselineResults) {
        const scenarios = [];
        const currentAge = this.baseInputs.yourCurrentAge;
        const retirementAge = this.baseInputs.retirementAge;
        const currentAustralianAllocation = this.baseInputs.australianEquityAllocation;
        const currentDividendYield = this.baseInputs.dividendYield;
        const currentFrankingRate = this.baseInputs.frankingRate;
        const currentEquityAllocation = this.baseInputs.allocEquities;
        const cashFlowAnalysis = this.simulator.calculateCashFlowAnalysis(this.baseInputs);
        const monthlyDisposableIncome = cashFlowAnalysis.cashFlow.monthlyDisposableIncome;
        const currentPortfolioValue = this.baseInputs.currentStocks + this.baseInputs.currentSavings;

        // Scenario 1: Optimize Australian equity allocation for franking credits
        if (currentAustralianAllocation < 50) {
            const targetAustralianAllocation = Math.min(60, currentAustralianAllocation + 20);
            const additionalFrankingBenefit = this.calculateFrankingCreditBenefit(
                targetAustralianAllocation - currentAustralianAllocation,
                currentEquityAllocation,
                currentDividendYield,
                currentFrankingRate,
                currentPortfolioValue
            );

            scenarios.push({
                name: `Increase Australian Equity to ${targetAustralianAllocation}% for Franking Credits`,
                description: `Boost Australian equity allocation from ${currentAustralianAllocation}% to ${targetAustralianAllocation}% to maximize franking credit benefits.`,
                modifications: {
                    australianEquityAllocation: targetAustralianAllocation
                },
                feasibility: "Portfolio Rebalancing",
                factorsChanged: [
                    `Australian equity: ${currentAustralianAllocation}% → ${targetAustralianAllocation}%`,
                    `Additional franking credits: ~${formatCurrency(additionalFrankingBenefit)}/year`,
                    `Fully refundable in retirement phase (SMSF or low income)`,
                    `Focus on ASX dividend champions: CBA, BHP, RIO, TLS, WBC`,
                    `${targetAustralianAllocation - currentAustralianAllocation}% more exposure to ASX dividend stocks`,
                    "Consider: home bias vs international diversification trade-off"
                ]
            });
        }

        // Scenario 2: Target high-franking dividend stocks
        if (currentFrankingRate < 80) {
            const targetFrankingRate = 85; // Target higher franking
            const currentBenefit = this.calculateFrankingCreditBenefit(
                currentAustralianAllocation, currentEquityAllocation, currentDividendYield, currentFrankingRate, currentPortfolioValue
            );
            const targetBenefit = this.calculateFrankingCreditBenefit(
                currentAustralianAllocation, currentEquityAllocation, currentDividendYield, targetFrankingRate, currentPortfolioValue
            );
            const additionalBenefit = targetBenefit - currentBenefit;

            scenarios.push({
                name: `Target Fully Franked Dividend Stocks (${targetFrankingRate}% franking)`,
                description: `Focus on fully franked dividend stocks to increase franking rate from ${currentFrankingRate}% to ${targetFrankingRate}% for maximum tax benefits.`,
                modifications: {
                    frankingRate: targetFrankingRate
                },
                feasibility: "Stock Selection Strategy",
                factorsChanged: [
                    `Franking rate: ${currentFrankingRate}% → ${targetFrankingRate}%`,
                    `Additional franking benefit: ${formatCurrency(additionalBenefit)}/year`,
                    "Target stocks: Big 4 banks (CBA, ANZ, WBC, NAB), Telstra, major miners",
                    "Avoid: REITs (no franking), international companies, tech growth stocks",
                    "Strategy: dividend aristocrats, consistent payout policies",
                    "Consider: Growth vs income trade-off, sector concentration risk"
                ]
            });
        }

        // Scenario 3: Increase monthly investment for franking benefits
        if (monthlyDisposableIncome > 200) {
            const additionalMonthlyOptions = [200, 350, 500].filter(amount => amount <= monthlyDisposableIncome * 0.6);

            additionalMonthlyOptions.forEach(additionalMonthly => {
                const annualIncrease = additionalMonthly * 12;
                const projectedPortfolioGrowth = annualIncrease * (retirementAge - currentAge); // Simplified
                const frankingBenefitIncrease = this.calculateFrankingCreditBenefit(
                    currentAustralianAllocation,
                    currentEquityAllocation,
                    currentDividendYield,
                    currentFrankingRate,
                    projectedPortfolioGrowth
                );

                scenarios.push({
                    name: `Invest Extra $${additionalMonthly}/month in Franking Credit Stocks`,
                    description: `Increase monthly investments by $${additionalMonthly}, strategically focused on high-franking Australian dividend stocks.`,
                    modifications: {
                        monthlyStockContribution: this.baseInputs.monthlyStockContribution + additionalMonthly,
                        australianEquityAllocation: Math.min(65, currentAustralianAllocation + 5)
                    },
                    feasibility: additionalMonthly <= monthlyDisposableIncome * 0.4 ? "Easily Manageable" : "Requires budgeting",
                    factorsChanged: [
                        `Extra monthly investment: $${additionalMonthly}`,
                        `Annual investment increase: ${formatCurrency(annualIncrease)}`,
                        `Projected additional franking credits: ~${formatCurrency(frankingBenefitIncrease)}/year at maturity`,
                        "Builds tax-effective retirement income stream",
                        "Focus on ASX 200 dividend-paying blue chips",
                        "Consider: Dollar-cost averaging benefits, dividend reinvestment"
                    ]
                });
            });
        }

        // Scenario 4: Super vs external investment for franking credits optimization
        const superContributionRoom = this.calculateSuperContributionRoom();
        if (superContributionRoom > 5000 && monthlyDisposableIncome > 300) {
            const additionalSuperAmount = Math.min(superContributionRoom, monthlyDisposableIncome * 12 * 0.4);
            const marginalTaxRate = this.calculateMarginalTaxRate();
            const taxSavings = additionalSuperAmount * (marginalTaxRate - 15) / 100; // Tax saving vs 15% super tax

            scenarios.push({
                name: `Salary Sacrifice $${Math.round(additionalSuperAmount/1000)}k for Franking Credits in Super`,
                description: `Salary sacrifice ${formatCurrency(additionalSuperAmount)} to super for franking credit benefits at 15% tax rate vs your ${marginalTaxRate}% marginal rate.`,
                modifications: {
                    additionalSuperContributions: additionalSuperAmount / (this.baseInputs.yourSalary + this.baseInputs.partnerSalary)
                },
                feasibility: "Salary Packaging Required",
                factorsChanged: [
                    `Additional super contribution: ${formatCurrency(additionalSuperAmount)}`,
                    `Tax savings: ${formatCurrency(taxSavings)} (${marginalTaxRate}% vs 15%)`,
                    "Franking credits accumulate tax-free in super environment",
                    "Full franking credit refunds in pension phase (age 60+)",
                    `Uses ${formatCurrency(superContributionRoom - additionalSuperAmount)} of remaining concessional cap`,
                    "Consider: Access restrictions until preservation age"
                ]
            });
        }

        return scenarios;
    }

    /**
     * Calculate franking credit benefit from allocation changes
     */
    calculateFrankingCreditBenefit(australianAllocation, equityAllocation, dividendYield, frankingRate, portfolioValue = 100000) {
        const australianEquityValue = portfolioValue * (equityAllocation / 100) * (australianAllocation / 100);
        const grossDividends = australianEquityValue * (dividendYield / 100);
        const frankedPortion = grossDividends * (frankingRate / 100);
        const frankingCredits = frankedPortion * (0.30 / 0.70); // 30% corporate tax rate
        return frankingCredits;
    }

    /**
     * Calculate super contribution room remaining
     */
    calculateSuperContributionRoom() {
        const totalIncome = this.baseInputs.yourSalary + this.baseInputs.partnerSalary;
        const currentSuperContrib = totalIncome * this.baseInputs.superContributionRate;
        const concessionalCap = 30000; // 2025 cap
        return Math.max(0, concessionalCap - currentSuperContrib);
    }

    /**
     * Calculate marginal tax rate for comparison
     */
    calculateMarginalTaxRate() {
        const totalIncome = this.baseInputs.yourSalary + this.baseInputs.partnerSalary;
        if (totalIncome <= 18200) return 0;
        if (totalIncome <= 45000) return 16;  // Updated for 2025-26
        if (totalIncome <= 135000) return 30; // Updated for 2025-26
        if (totalIncome <= 190000) return 37; // Updated for 2025-26
        return 45;
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
     * Analyzes widow/widower scenarios for comprehensive retirement planning.
     * @param {Object} baselineResults - The results from the baseline simulation.
     * @returns {Array<Object>} A list of scenarios to test.
     */
    _analyzeWidowWidowerScenarios(baselineResults) {
        const scenarios = [];
        const currentAge = this.baseInputs.yourCurrentAge;
        const partnerCurrentAge = this.baseInputs.partnerCurrentAge;
        const retirementAge = this.baseInputs.retirementAge;

        // Only analyze if there's a partner (couples scenario)
        if (!partnerCurrentAge || partnerCurrentAge === 0) {
            return scenarios;
        }

        const totalIncome = this.baseInputs.yourSalary + this.baseInputs.partnerSalary;
        const totalSuper = this.baseInputs.yourCurrentSuper + this.baseInputs.partnerCurrentSuper;

        // Scenario 1: Partner dies at age 70 (before full retirement)
        if (retirementAge < 70) {
            const remainingIncome = this.baseInputs.yourSalary; // Only your salary
            const incomeReduction = (this.baseInputs.partnerSalary / totalIncome) * 100;
            const survivorSuper = totalSuper * 1.15; // Death benefits typically include insurance

            scenarios.push({
                name: "Partner Dies at Age 70 (Pre-Retirement)",
                description: `Plan for partner passing before retirement. Income drops ${incomeReduction.toFixed(0)}% but you inherit superannuation death benefits.`,
                modifications: {
                    partnerSalary: 0,
                    partnerCurrentSuper: 0,
                    yourCurrentSuper: survivorSuper,
                    partnerLifespan: 70
                },
                feasibility: "Life Insurance Critical",
                factorsChanged: [
                    `Household income reduces by ${incomeReduction.toFixed(0)}% (${formatCurrency(this.baseInputs.partnerSalary)})`,
                    `Superannuation death benefits: ${formatCurrency(survivorSuper - this.baseInputs.yourCurrentSuper)}`,
                    `14-week bereavement payment from Centrelink`,
                    `Single person Age Pension thresholds apply`,
                    `Reduced living expenses but loss of economies of scale`
                ]
            });
        }

        // Scenario 2: You die early, partner continues alone
        const partnerIncome = this.baseInputs.partnerSalary;
        if (partnerIncome > 30000) { // Partner has meaningful income to continue
            const partnerIncomeReduction = (this.baseInputs.yourSalary / totalIncome) * 100;
            const partnerSurvivorSuper = totalSuper * 1.15;

            scenarios.push({
                name: "You Die at Age 70, Partner Survives",
                description: `Partner continues alone with ${(100 - partnerIncomeReduction).toFixed(0)}% of household income plus death benefits.`,
                modifications: {
                    yourSalary: 0,
                    yourCurrentSuper: 0,
                    partnerCurrentSuper: partnerSurvivorSuper,
                    yourLifespan: 70
                },
                feasibility: "Life Insurance Important",
                factorsChanged: [
                    `Partner's income: ${formatCurrency(partnerIncome)} (${(100 - partnerIncomeReduction).toFixed(0)}% of household)`,
                    `Partner inherits super death benefits: ${formatCurrency(partnerSurvivorSuper - this.baseInputs.partnerCurrentSuper)}`,
                    `Single person living costs and pension thresholds`,
                    `Partner may need to work longer or reduce retirement lifestyle`,
                    `Home ownership becomes more important for security`
                ]
            });
        }

        // Scenario 3: Early widowhood at age 60 (more common scenario)
        if (currentAge < 60) {
            const earlyWidowSuper = totalSuper * 1.2; // Higher insurance payouts typically
            const yearsToRetirement = retirementAge - 60;

            scenarios.push({
                name: "Widowed at Age 60",
                description: `Partner dies at 60, leaving you to navigate pre-retirement years alone with death benefits.`,
                modifications: {
                    partnerSalary: 0,
                    partnerCurrentSuper: 0,
                    yourCurrentSuper: earlyWidowSuper,
                    partnerLifespan: 60,
                    yourCurrentAge: 60 // Model from age 60 onwards
                },
                feasibility: "Requires Comprehensive Life Insurance",
                factorsChanged: [
                    `Immediate loss of partner's income: ${formatCurrency(this.baseInputs.partnerSalary)}`,
                    `Death benefit payout: ${formatCurrency(earlyWidowSuper - this.baseInputs.yourCurrentSuper)}`,
                    `${yearsToRetirement} years to rebuild financial position before retirement`,
                    `May qualify for widow allowance if eligible (women born before July 1955)`,
                    `Critical to have emergency fund and adequate life insurance coverage`
                ]
            });
        }

        // Scenario 4: Late-life widowhood at age 80 (in retirement)
        const retirementYears = 80 - retirementAge;
        if (retirementYears > 0) {
            scenarios.push({
                name: "Widowed at Age 80 (In Retirement)",
                description: `Partner dies during retirement. Single person pension thresholds apply, but reduced living costs.`,
                modifications: {
                    partnerLifespan: 80
                },
                feasibility: "Estate Planning Important",
                factorsChanged: [
                    `Change from couple to single Age Pension rate`,
                    `Reduced living expenses (single person household)`,
                    `Full access to home equity if needed`,
                    `Higher risk of aged care requirements`,
                    `Estate planning becomes critical for remaining assets`
                ]
            });
        }

        return scenarios;
    }

    /**
     * Analyzes insurance strategies and generates visible scenarios for all users
     * @param {Object} baselineResults - The results from the baseline simulation
     * @returns {Array} Array of insurance-related scenarios with recommendations
     */
    _analyzeInsuranceStrategies(baselineResults) {
        const scenarios = [];
        const inputs = this.baseInputs;
        const annualIncome = (inputs.yourSalary || 0) + (inputs.partnerSalary || 0);
        const totalSuper = (inputs.yourCurrentSuper || 0) + (inputs.partnerCurrentSuper || 0);
        const totalAssets = totalSuper + (inputs.yourOtherAssets || 0) + (inputs.partnerOtherAssets || 0);

        // TPD Coverage Analysis - Universal for all income earners
        if (annualIncome > 30000) {
            const recommendedTPD = Math.min(annualIncome * 6, 2000000);
            const currentTPD = inputs.yourTPDCover || 250000; // Default super TPD

            if (currentTPD < recommendedTPD * 0.6) {
                scenarios.push({
                    title: "Increase TPD Coverage to 6x Annual Income",
                    category: "Insurance",
                    description: `Current TPD: $${currentTPD.toLocaleString()}, Recommended: $${recommendedTPD.toLocaleString()}. **Impact: CRITICAL** - Protect against permanent disability. **Risk: HIGH without cover** - Family financial devastation. **Timeline: Immediate (2025)**`,
                    modifications: {
                        yourTPDCover: recommendedTPD
                    },
                    reasoning: "TPD should cover 6x annual income to replace lost earning capacity and cover care costs",
                    priority: "Critical",
                    impact: "Protection"
                });
            }
        }

        // Life Insurance Analysis - Universal for all with dependents or debt
        const mortgage = inputs.yourMortgage || 0;
        const hasFinancialDependents = (inputs.partnerSalary > 0) || mortgage > 0 || (inputs.yourCurrentAge < 50);

        if (hasFinancialDependents && annualIncome > 25000) {
            const recommendedLife = Math.max(
                mortgage + (annualIncome * 8),
                totalAssets * 0.4,
                400000
            );
            const currentLife = inputs.yourLifeInsurance || 280000; // Default super life cover

            if (currentLife < recommendedLife * 0.6) {
                scenarios.push({
                    title: "Optimize Life Insurance Coverage",
                    category: "Insurance",
                    description: `Current Life: $${currentLife.toLocaleString()}, Recommended: $${recommendedLife.toLocaleString()}. **Impact: CRITICAL** - Protect family's financial future. **Risk: EXTREME without cover** - Family poverty upon death. **Timeline: Immediate (2025)**`,
                    modifications: {
                        yourLifeInsurance: recommendedLife
                    },
                    reasoning: "Life insurance should cover mortgage plus 8x income for comprehensive family protection",
                    priority: "Critical",
                    impact: "Protection"
                });
            }
        }

        // Income Protection Analysis - Universal for all income earners
        if (annualIncome > 35000) {
            const recommendedIP = Math.min(annualIncome * 0.75, 180000); // 75% of income, monthly cap applies
            const currentIP = inputs.yourIncomeProtection || 0;

            if (currentIP < recommendedIP * 0.7) {
                scenarios.push({
                    title: "Add Comprehensive Income Protection",
                    category: "Insurance",
                    description: `Protect 75% of income ($${(recommendedIP/12).toLocaleString()}/month) if unable to work. **Impact: CRITICAL** - Maintain lifestyle during illness/injury. **Risk: HIGH without cover** - Cannot meet expenses. **Timeline: Immediate (2025)**`,
                    modifications: {
                        yourIncomeProtection: recommendedIP
                    },
                    reasoning: "Income protection maintains cash flow during temporary disability periods",
                    priority: "High",
                    impact: "Protection"
                });
            }
        }

        // Partner Insurance Analysis - Universal for dual-income couples
        if (inputs.partnerSalary && inputs.partnerSalary > 25000) {
            const partnerRecommendedLife = Math.max(
                mortgage * 0.5 + (inputs.partnerSalary * 6),
                250000
            );
            const partnerCurrentLife = inputs.partnerLifeInsurance || 280000;

            if (partnerCurrentLife < partnerRecommendedLife * 0.6) {
                scenarios.push({
                    title: "Review Partner Life Insurance Coverage",
                    category: "Insurance",
                    description: `Partner life: $${partnerCurrentLife.toLocaleString()}, Recommended: $${partnerRecommendedLife.toLocaleString()}. **Impact: IMPORTANT** - Dual protection strategy essential. **Risk: MEDIUM** - Partial family protection gap. **Timeline: Within 3 months (2025)**`,
                    modifications: {
                        partnerLifeInsurance: partnerRecommendedLife
                    },
                    reasoning: "Both partners need appropriate life insurance for complete family financial security",
                    priority: "Medium",
                    impact: "Protection"
                });
            }
        }

        // Trauma/Critical Illness Analysis - Universal for higher income earners
        if (annualIncome > 70000 && totalAssets < 800000) {
            const recommendedTrauma = Math.min(annualIncome * 3, 750000);
            scenarios.push({
                title: "Consider Trauma/Critical Illness Cover",
                category: "Insurance",
                description: `Add $${recommendedTrauma.toLocaleString()} trauma cover for 38 critical conditions. **Impact: IMPORTANT** - Lump sum for treatment and recovery. **Risk: MEDIUM** - Medical debt and income loss. **Timeline: Annual review (2025)**`,
                modifications: {
                    yourTraumaCover: recommendedTrauma
                },
                reasoning: "Trauma cover provides lump sum for critical illness treatment and recovery time without depleting retirement savings",
                priority: "Medium",
                impact: "Protection"
            });
        }

        // Insurance Optimization within Super - Universal optimization strategy
        const currentLife = inputs.yourLifeInsurance || 280000;
        if (currentLife > 300000 && totalSuper > 150000) {
            const superInsuranceOptimization = Math.min(currentLife * 0.6, 400000);
            scenarios.push({
                title: "Optimize Insurance Through Superannuation",
                category: "Insurance",
                description: `Move $${superInsuranceOptimization.toLocaleString()} life cover inside super for tax benefits. **Impact: POSITIVE** - Reduce premiums by 25-35%. **Risk: LOW** - Structured within regulated super. **Timeline: Next renewal (2025-2026)**`,
                modifications: {
                    yourLifeInsurance: currentLife - superInsuranceOptimization,
                    yourSuperInsuranceCover: superInsuranceOptimization
                },
                reasoning: "Insurance through super is tax-deductible from super balance and typically 25-35% cheaper than retail policies",
                priority: "Medium",
                impact: "Cost Savings"
            });
        }

        return scenarios;
    }

    /**
     * Provides hidden insurance coverage recommendations based on what-if analysis
     * This doesn't create visible scenarios but provides coverage amount suggestions
     * @param {Object} baselineResults - The results from the baseline simulation
     * @returns {Object} Insurance coverage recommendations with amounts
     */
    generateInsuranceRecommendations(baselineResults) {
        const successRate = baselineResults.successRate;
        const currentAge = this.baseInputs.yourCurrentAge;
        const retirementAge = this.baseInputs.retirementAge;
        const yearsToRetirement = retirementAge - currentAge;

        // Default insurance amounts from research
        const defaultTPD = 250000;
        const defaultDeath = 280000;
        const totalHouseholdIncome = this.baseInputs.yourSalary + (this.baseInputs.partnerSalary || 0);

        // Calculate recommended coverage based on research
        const recommendedDeathCover = Math.max(totalHouseholdIncome * 5, 400000); // 5x income or $400k min
        const recommendedTPDCover = Math.max(totalHouseholdIncome * 3, 300000); // 3x income or $300k min

        const recommendations = {
            currentCoverage: {
                death: defaultDeath,
                tpd: defaultTPD
            },
            recommendedCoverage: {
                death: recommendedDeathCover,
                tpd: recommendedTPDCover
            },
            gaps: {
                death: Math.max(0, recommendedDeathCover - defaultDeath),
                tpd: Math.max(0, recommendedTPDCover - defaultTPD)
            },
            priority: this.calculateInsurancePriority(successRate, yearsToRetirement),
            scenarios: this.calculateInsuranceWhatIfImpacts(baselineResults),
            costBenefit: this.calculateInsuranceCostBenefit(recommendedDeathCover, recommendedTPDCover, totalHouseholdIncome)
        };

        return recommendations;
    }

    /**
     * Calculate insurance priority based on financial situation
     */
    calculateInsurancePriority(successRate, yearsToRetirement) {
        if (successRate < 0.70) return "Critical - Low retirement success rate";
        if (successRate < 0.85 && yearsToRetirement < 10) return "High - Near retirement with moderate risk";
        if (yearsToRetirement < 5) return "High - Critical sequence-of-returns period";
        if (successRate < 0.90) return "Medium - Some financial risk present";
        return "Low - Strong financial position";
    }

    /**
     * Calculate what-if impact scenarios for insurance
     */
    calculateInsuranceWhatIfImpacts(baselineResults) {
        const impacts = [];
        const currentAge = this.baseInputs.yourCurrentAge;
        const retirementAge = this.baseInputs.retirementAge;
        const totalHouseholdIncome = this.baseInputs.yourSalary + (this.baseInputs.partnerSalary || 0);

        // Critical timing periods based on research
        const criticalPeriods = [
            { age: retirementAge - 2, description: "2 years before retirement (sequence-of-returns risk)" },
            { age: retirementAge + 3, description: "3 years after retirement (early retirement vulnerability)" }
        ];

        criticalPeriods.forEach(period => {
            if (period.age > currentAge && period.age < 90) {
                // TPD Impact
                impacts.push({
                    scenario: `TPD at age ${period.age}`,
                    description: period.description,
                    requiredCoverage: {
                        immediate: totalHouseholdIncome * 2, // 2 years of income for transition
                        ongoing: 35000, // Annual care costs
                        recommended: Math.max(totalHouseholdIncome * 3, 300000)
                    }
                });

                // Death Impact (if partner exists)
                if (this.baseInputs.partnerSalary > 0) {
                    const survivorIncome = this.baseInputs.partnerSalary;
                    const incomeGap = totalHouseholdIncome - survivorIncome;

                    impacts.push({
                        scenario: `Death at age ${period.age}`,
                        description: period.description,
                        requiredCoverage: {
                            incomeReplacement: incomeGap * 5, // 5 years income replacement
                            debt: this.baseInputs.mortgageBalance || 0,
                            recommended: Math.max(totalHouseholdIncome * 5, 400000)
                        }
                    });
                }
            }
        });

        return impacts;
    }

    /**
     * Calculate insurance cost-benefit analysis
     */
    calculateInsuranceCostBenefit(deathCover, tpdCover, householdIncome) {
        const currentAge = this.baseInputs.yourCurrentAge;

        // Rough premium estimates (varies significantly by health, occupation, etc.)
        const deathPremiumRate = currentAge < 40 ? 0.0008 : currentAge < 50 ? 0.0015 : 0.0025;
        const tpdPremiumRate = currentAge < 40 ? 0.0012 : currentAge < 50 ? 0.0020 : 0.0035;

        const estimatedAnnualPremiums = {
            death: deathCover * deathPremiumRate,
            tpd: tpdCover * tpdPremiumRate,
            total: (deathCover * deathPremiumRate) + (tpdCover * tpdPremiumRate)
        };

        return {
            estimatedAnnualPremiums,
            premiumAsPercentOfIncome: (estimatedAnnualPremiums.total / householdIncome) * 100,
            recommendation: estimatedAnnualPremiums.total / householdIncome < 0.02 ?
                "Affordable - less than 2% of income" :
                "Consider term life vs super fund insurance for cost efficiency"
        };
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
        let description = "";
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
            description = this._formatPropertyRecommendation(scenario, baseResult);
        } else if (scenario.name.includes("Downsize") || scenario.name.includes("Home")) {
            category = "Home Ownership";
            description = this._formatDownsizeRecommendation(scenario, baseResult);
        } else if (scenario.name.includes("Increase") || scenario.name.includes("Savings Rate") || scenario.name.includes("Super") || scenario.name.includes("Optimize Expenses")) {
            category = "Contributions";
            description = this._formatContributionRecommendation(scenario, baseResult);
        } else if (scenario.name.includes("Strategy")) {
            category = "Investment Strategy";
            description = this._formatAllocationRecommendation(scenario, baseResult);
        } else if (scenario.name.includes("Retire")) {
            category = "Retirement Age";
            description = this._formatRetirementAgeRecommendation(scenario, baseResult);
        } else {
            description = `This strategy changes your success rate by ${formatPercent(successDiff, 1)} and median final balance by ${formatCurrency(balanceDiff)}.`;
        }

        // Enhanced summary with feasibility and cash flow considerations
        if (feasibility && feasibility !== "Standard Strategy") {
            description += ` Feasibility: ${feasibility}.`;
        }

        return {
            title,
            category,
            description: scenario.description || description,
            modifications: scenario.modifications,
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
