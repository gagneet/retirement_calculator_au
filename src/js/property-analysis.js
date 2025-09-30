// property-analysis.js - Advanced Australian Property Analysis with Buy/Sell Scenarios
// Comprehensive property strategy analysis including timing, tax implications, and market scenarios

import { ENHANCED_CONFIG } from './config.js';
import { ENHANCED_FINANCIAL_CONFIG } from './enhanced-config.js';
import { formatCurrency, formatPercent, randomNormal, calculateCGT } from './utils.js';

export class PropertyAnalysisEngine {
    constructor() {
        this.config = ENHANCED_CONFIG;
        this.financialConfig = ENHANCED_FINANCIAL_CONFIG;

        // Australian property market data from config
        const propConfig = this.financialConfig.propertyAnalysis;
        this.propertyMarketData = {
            // Average annual growth rates by capital city (2024 data)
            capitalGrowthRates: {
                sydney: propConfig.CAPITAL_CITY_GROWTH_RATES.SYDNEY.value,
                melbourne: propConfig.CAPITAL_CITY_GROWTH_RATES.MELBOURNE.value,
                brisbane: propConfig.CAPITAL_CITY_GROWTH_RATES.BRISBANE.value,
                perth: propConfig.CAPITAL_CITY_GROWTH_RATES.PERTH.value,
                adelaide: propConfig.CAPITAL_CITY_GROWTH_RATES.ADELAIDE.value,
                hobart: propConfig.CAPITAL_CITY_GROWTH_RATES.HOBART.value,
                darwin: propConfig.CAPITAL_CITY_GROWTH_RATES.DARWIN.value,
                canberra: propConfig.CAPITAL_CITY_GROWTH_RATES.CANBERRA.value,
                national: propConfig.CAPITAL_CITY_GROWTH_RATES.NATIONAL.value
            },

            // Rental yield assumptions by location
            rentalYields: {
                sydney: propConfig.RENTAL_YIELDS.SYDNEY.value,
                melbourne: propConfig.RENTAL_YIELDS.MELBOURNE.value,
                brisbane: propConfig.RENTAL_YIELDS.BRISBANE.value,
                perth: propConfig.RENTAL_YIELDS.PERTH.value,
                adelaide: propConfig.RENTAL_YIELDS.ADELAIDE.value,
                hobart: propConfig.RENTAL_YIELDS.HOBART.value,
                darwin: propConfig.RENTAL_YIELDS.DARWIN.value,
                canberra: propConfig.RENTAL_YIELDS.CANBERRA.value,
                national: propConfig.RENTAL_YIELDS.NATIONAL.value
            },

            // Property transaction costs
            transactionCosts: {
                buying: {
                    stampDuty: propConfig.TRANSACTION_COSTS_DETAILED.STAMP_DUTY_AVERAGE.value,
                    legalFees: propConfig.TRANSACTION_COSTS_DETAILED.LEGAL_FEES_BUYING.value,
                    inspectionCosts: propConfig.TRANSACTION_COSTS_DETAILED.INSPECTION_COSTS.value,
                    loanCosts: propConfig.TRANSACTION_COSTS_DETAILED.LOAN_ESTABLISHMENT.value,
                    otherCosts: propConfig.TRANSACTION_COSTS_DETAILED.BUYING_OTHER_COSTS.value
                },
                selling: {
                    agentCommission: propConfig.TRANSACTION_COSTS_DETAILED.AGENT_COMMISSION.value,
                    marketing: propConfig.TRANSACTION_COSTS_DETAILED.MARKETING_COSTS.value,
                    legalFees: propConfig.TRANSACTION_COSTS_DETAILED.LEGAL_FEES_SELLING.value,
                    otherCosts: propConfig.TRANSACTION_COSTS_DETAILED.SELLING_OTHER_COSTS.value
                }
            },

            // Property market cycles (7-year cycles)
            marketCycles: {
                currentPhase: 'recovery',    // 2024 market position
                phases: {
                    recovery: { duration: 2, multiplier: 1.1, volatility: 0.08 },
                    boom: { duration: 2, multiplier: 1.3, volatility: 0.12 },
                    peak: { duration: 1, multiplier: 1.0, volatility: 0.15 },
                    decline: { duration: 2, multiplier: 0.85, volatility: 0.18 }
                }
            }
        };
    }

    // Comprehensive property strategy analysis
    analyzePropertyStrategy(inputs, existingSimulationResult = null) {
        const analysis = {
            currentPortfolio: null,
            buyScenarios: [],
            sellScenarios: [],
            holdScenarios: [],
            recommendations: [],
            taxImplications: {},
            riskAssessment: {},
            optimalStrategy: null
        };

        // Analyze current property holdings
        if (inputs.hasInvestmentProperty) {
            analysis.currentPortfolio = this.analyzeCurrentProperty(inputs);
            analysis.sellScenarios = this.generateSellScenarios(inputs);
            analysis.holdScenarios = this.generateHoldScenarios(inputs);
        }

        // Analyze potential property purchases
        if (!inputs.hasInvestmentProperty || inputs.considerAdditionalProperty) {
            analysis.buyScenarios = this.generateBuyScenarios(inputs);
        }

        // Calculate tax implications for each scenario
        analysis.taxImplications = this.calculateTaxImplications(inputs, analysis);

        // Perform risk assessment
        analysis.riskAssessment = this.assessPropertyRisks(inputs, analysis);

        // Generate strategic recommendations
        analysis.recommendations = this.generatePropertyRecommendations(inputs, analysis);

        // Identify optimal strategy
        analysis.optimalStrategy = this.identifyOptimalStrategy(analysis, inputs);

        return analysis;
    }

    // Analyze current property holdings
    analyzeCurrentProperty(inputs) {
        const currentValue = inputs.propertyValue || 0;
        const outstandingLoan = inputs.propertyLoan || 0;
        const weeklyRent = inputs.weeklyRent || 0;

        const equity = currentValue - outstandingLoan;
        const annualRent = weeklyRent * 52;
        const grossYield = currentValue > 0 ? annualRent / currentValue : 0;

        // Estimate location-based performance
        const location = inputs.propertyLocation || 'national';
        const expectedGrowthRate = this.propertyMarketData.capitalGrowthRates[location] ||
            this.propertyMarketData.capitalGrowthRates.national;

        // Calculate cash flow
        const cashFlow = this.calculatePropertyCashFlow(inputs);

        // Estimate current CGT liability if sold now
        const purchasePrice = inputs.propertyPurchasePrice || currentValue * 0.7; // Assume 30% growth if not provided
        const cgtLiability = calculateCGT(currentValue - purchasePrice, inputs.holdingPeriod || 5);

        return {
            currentValue,
            outstandingLoan,
            equity,
            annualRent,
            grossYield,
            expectedGrowthRate,
            cashFlow,
            cgtLiability,
            location,
            performance: this.assessPropertyPerformance(grossYield, expectedGrowthRate),
            marketCycle: this.getCurrentMarketCycle()
        };
    }

    // Generate property selling scenarios
    generateSellScenarios(inputs) {
        const scenarios = [];
        const currentValue = inputs.propertyValue || 0;
        const outstandingLoan = inputs.propertyLoan || 0;

        // Immediate sale scenario
        scenarios.push(this.createSellScenario(inputs, {
            timing: 'immediate',
            description: 'Sell property immediately',
            salePrice: currentValue,
            years: 0
        }));

        // Future sale scenarios
        const futureSaleYears = [2, 5, 10];
        futureSaleYears.forEach(years => {
            const location = inputs.propertyLocation || 'national';
            const growthRate = this.propertyMarketData.capitalGrowthRates[location] || 0.061;

            scenarios.push(this.createSellScenario(inputs, {
                timing: `in_${years}_years`,
                description: `Sell property in ${years} years`,
                salePrice: currentValue * Math.pow(1 + growthRate, years),
                years
            }));
        });

        // Market timing scenarios
        scenarios.push(this.createSellScenario(inputs, {
            timing: 'next_peak',
            description: 'Sell at next market peak (estimated 3-4 years)',
            salePrice: currentValue * Math.pow(1.12, 3.5), // 12% growth to peak
            years: 3.5,
            marketTiming: true
        }));

        return scenarios;
    }

    // Create detailed sell scenario
    createSellScenario(inputs, options) {
        const { salePrice, years, timing, description, marketTiming = false } = options;
        const currentValue = inputs.propertyValue || 0;
        const outstandingLoan = inputs.propertyLoan || 0;
        const purchasePrice = inputs.propertyPurchasePrice || currentValue * 0.7;

        // --- Safeguards and Validation ---
        if (salePrice < 0 || purchasePrice < 0 || outstandingLoan < 0) {
            console.error("Invalid input: Property values and loans cannot be negative.", { salePrice, purchasePrice, outstandingLoan });
            return null; // Return null to indicate failure
        }

        // Calculate transaction costs
        const sellingCosts = this.calculateSellingCosts(salePrice);

        // Calculate loan balance at sale time
        const remainingLoan = this.calculateRemainingLoan(outstandingLoan, years);

        // Calculate net proceeds
        const grossProceeds = salePrice - sellingCosts;
        const netProceeds = grossProceeds - remainingLoan;

        // --- Unit Test Recommendation ---
        // TODO: Add unit tests for calculateCGT to cover various holding periods and resident statuses.
        const capitalGain = salePrice - purchasePrice - sellingCosts;
        const cgtLiability = calculateCGT(capitalGain, (inputs.holdingPeriod || 5) + years);

        // Calculate after-tax proceeds
        const afterTaxProceeds = netProceeds - cgtLiability;

        // --- Bounds Checking ---
        if (afterTaxProceeds < -outstandingLoan || afterTaxProceeds > salePrice) {
            console.warn("Unusual after-tax proceeds calculated.", { afterTaxProceeds, salePrice });
        }

        // Estimate alternative investment returns
        const alternativeReturns = this.calculateAlternativeInvestmentReturns(afterTaxProceeds, years);

        return {
            timing,
            description,
            years,
            salePrice,
            sellingCosts,
            remainingLoan,
            grossProceeds,
            netProceeds,
            capitalGain,
            cgtLiability,
            afterTaxProceeds,
            alternativeReturns,
            marketTiming,
            netBenefit: alternativeReturns.finalValue - afterTaxProceeds,
            recommendation: this.assessSellScenario(afterTaxProceeds, alternativeReturns, marketTiming)
        };
    }

    // Generate property holding scenarios
    generateHoldScenarios(inputs) {
        const scenarios = [];
        const currentValue = inputs.propertyValue || 0;
        const location = inputs.propertyLocation || 'national';
        const growthRate = this.propertyMarketData.capitalGrowthRates[location] || 0.061;

        // Hold until retirement
        const yearsToRetirement = Math.max(1, inputs.retirementAge - inputs.yourCurrentAge);
        scenarios.push(this.createHoldScenario(inputs, {
            timing: 'until_retirement',
            description: `Hold property until retirement (${yearsToRetirement} years)`,
            years: yearsToRetirement,
            strategy: 'hold_and_rent'
        }));

        // Hold for 10 years (common investment strategy)
        scenarios.push(this.createHoldScenario(inputs, {
            timing: 'long_term',
            description: 'Hold property for 10 years',
            years: 10,
            strategy: 'long_term_growth'
        }));

        // Hold and improve scenario
        scenarios.push(this.createHoldScenario(inputs, {
            timing: 'hold_and_improve',
            description: 'Hold property and make improvements',
            years: 5,
            strategy: 'value_add',
            improvementCost: 50000,
            improvementValue: 80000
        }));

        return scenarios;
    }

    // Create detailed hold scenario
    createHoldScenario(inputs, options) {
        const { years, timing, description, strategy, improvementCost = 0, improvementValue = 0 } = options;
        const currentValue = inputs.propertyValue || 0;
        const location = inputs.propertyLocation || 'national';
        const growthRate = this.propertyMarketData.capitalGrowthRates[location] || 0.061;

        // Project property value
        const futureValue = (currentValue + improvementValue) * Math.pow(1 + growthRate, years);

        // Calculate total rental income
        const currentRent = (inputs.weeklyRent || 0) * 52;
        const rentalGrowthRate = 0.03; // 3% annual rent growth
        const totalRentalIncome = this.calculateTotalRentalIncome(currentRent, rentalGrowthRate, years);

        // Calculate holding costs
        const holdingCosts = this.calculateHoldingCosts(inputs, years) + improvementCost;

        // Net rental income after costs
        const netRentalIncome = totalRentalIncome - holdingCosts;

        // Total return calculation
        const capitalGrowth = futureValue - currentValue - improvementValue;
        const totalReturn = capitalGrowth + netRentalIncome;
        const annualizedReturn = Math.pow(totalReturn / currentValue + 1, 1/years) - 1;

        return {
            timing,
            description,
            years,
            strategy,
            currentValue,
            futureValue,
            capitalGrowth,
            totalRentalIncome,
            holdingCosts,
            netRentalIncome,
            improvementCost,
            improvementValue,
            totalReturn,
            annualizedReturn,
            recommendation: this.assessHoldScenario(annualizedReturn, strategy)
        };
    }

    // Generate property buying scenarios
    generateBuyScenarios(inputs) {
        const scenarios = [];

        // Get available investment capital
        const availableCapital = this.calculateAvailableCapital(inputs);
        const minCapital = this.financialConfig.propertyAnalysis.ANALYSIS_THRESHOLDS.MINIMUM_INVESTMENT_CAPITAL.value;

        if (availableCapital < minCapital) {
            return [{
                feasibility: 'insufficient_capital',
                description: 'Insufficient capital for property investment',
                requiredCapital: minCapital,
                availableCapital,
                recommendation: 'Consider building more capital through other investments first'
            }];
        }

        // Different property price points
        const propertyPrices = [400000, 600000, 800000, 1000000];

        propertyPrices.forEach(price => {
            if (this.isPropertyAffordable(price, availableCapital, inputs)) {
                scenarios.push(this.createBuyScenario(inputs, {
                    propertyPrice: price,
                    location: this.recommendLocation(price),
                    strategy: 'buy_and_hold'
                }));
            }
        });

        return scenarios;
    }

    // Create detailed buy scenario
    createBuyScenario(inputs, options) {
        const { propertyPrice, location, strategy } = options;
        const availableCapital = this.calculateAvailableCapital(inputs);

        // Calculate purchase requirements
        const deposit = propertyPrice * 0.2; // 20% deposit
        const buyingCosts = this.calculateBuyingCosts(propertyPrice);
        const totalUpfront = deposit + buyingCosts;
        const loanAmount = propertyPrice - deposit;

        // Estimate cash flow
        const rentalYield = this.propertyMarketData.rentalYields[location] || 0.038;
        const annualRent = propertyPrice * rentalYield;
        const weeklyRent = annualRent / 52;

        const cashFlow = this.calculateNewPropertyCashFlow({
            propertyPrice,
            loanAmount,
            annualRent,
            location
        });

        // Project 10-year returns
        const growthRate = this.propertyMarketData.capitalGrowthRates[location] || 0.061;
        const projectedReturns = this.projectPropertyReturns(propertyPrice, annualRent, growthRate, 10);

        return {
            propertyPrice,
            location,
            strategy,
            deposit,
            buyingCosts,
            totalUpfront,
            loanAmount,
            annualRent,
            weeklyRent,
            rentalYield,
            cashFlow,
            projectedReturns,
            affordability: this.assessAffordability(totalUpfront, cashFlow, availableCapital),
            recommendation: this.assessBuyScenario(cashFlow, projectedReturns, totalUpfront)
        };
    }

    // Calculate property cash flow
    calculatePropertyCashFlow(inputs) {
        // --- Unit Test Recommendation ---
        // TODO: Add unit tests for this function to validate cash flow calculations under various scenarios (e.g., interest-only vs. P&I loans).
        const annualRent = (inputs.weeklyRent || 0) * 52;
        const propertyValue = inputs.propertyValue || 0;
        const outstandingLoan = inputs.propertyLoan || 0;

        // --- Safeguards and Validation ---
        if (annualRent < 0 || propertyValue < 0 || outstandingLoan < 0) {
            console.error("Invalid input: Rent, property value, and loan cannot be negative.");
            return { netCashFlow: 0 }; // Return a neutral cash flow on error
        }

        // Estimate mortgage payments (assume 6% interest rate)
        const monthlyMortgage = outstandingLoan > 0 ?
            outstandingLoan * 0.06 / 12 * Math.pow(1 + 0.06/12, 300) / (Math.pow(1 + 0.06/12, 300) - 1) * 12 : 0;

        // Property expenses
        const rates = propertyValue * 0.01; // 1% of property value
        const insurance = 1200; // Annual property insurance
        const maintenance = propertyValue * 0.01; // 1% maintenance
        const management = annualRent * 0.08; // 8% property management
        const vacancy = annualRent * 0.04; // 4% vacancy allowance

        const totalExpenses = monthlyMortgage + rates + insurance + maintenance + management + vacancy;
        const netCashFlow = annualRent - totalExpenses;

        // --- Bounds Checking ---
        if (Math.abs(netCashFlow) > propertyValue) {
            console.warn("Calculated cash flow is unusually high relative to property value.", { netCashFlow, propertyValue });
        }

        return {
            annualRent,
            monthlyMortgage,
            rates,
            insurance,
            maintenance,
            management,
            vacancy,
            totalExpenses,
            netCashFlow,
            cashFlowYield: propertyValue > 0 ? netCashFlow / propertyValue : 0
        };
    }

    // Calculate new property cash flow
    calculateNewPropertyCashFlow(options) {
        const { propertyPrice, loanAmount, annualRent, location } = options;

        // Estimate mortgage payments (assume 6.5% interest rate for investment)
        const interestRate = 0.065;
        const loanTerm = 30; // years
        const monthlyRate = interestRate / 12;
        const totalPayments = loanTerm * 12;

        const monthlyMortgage = loanAmount > 0 ?
            loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) /
            (Math.pow(1 + monthlyRate, totalPayments) - 1) : 0;

        const annualMortgage = monthlyMortgage * 12;

        // Property expenses
        const rates = propertyPrice * 0.01; // 1% of property value
        const insurance = 1200; // Annual property insurance
        const maintenance = propertyPrice * 0.01; // 1% maintenance
        const management = annualRent * 0.08; // 8% property management
        const vacancy = annualRent * 0.04; // 4% vacancy allowance

        const totalExpenses = annualMortgage + rates + insurance + maintenance + management + vacancy;
        const netCashFlow = annualRent - totalExpenses;

        return {
            annualRent,
            annualMortgage,
            rates,
            insurance,
            maintenance,
            management,
            vacancy,
            totalExpenses,
            netCashFlow,
            weeklyOutOfPocket: netCashFlow < 0 ? Math.abs(netCashFlow) / 52 : 0
        };
    }

    // Calculate available investment capital
    calculateAvailableCapital(inputs) {
        const liquidAssets = (inputs.currentSavings || 0) + (inputs.currentStocks || 0);
        const monthlyInvestment = (inputs.monthlyInvestment || 0) * 12;

        // Conservative approach: use 70% of liquid assets + 2 years of monthly investments
        return liquidAssets * 0.7 + monthlyInvestment * 2;
    }

    // Calculate buying costs
    calculateBuyingCosts(propertyPrice) {
        const stampDuty = propertyPrice * this.propertyMarketData.transactionCosts.buying.stampDuty;
        const legalFees = this.propertyMarketData.transactionCosts.buying.legalFees;
        const inspectionCosts = this.propertyMarketData.transactionCosts.buying.inspectionCosts;
        const loanCosts = this.propertyMarketData.transactionCosts.buying.loanCosts;
        const otherCosts = this.propertyMarketData.transactionCosts.buying.otherCosts;

        return stampDuty + legalFees + inspectionCosts + loanCosts + otherCosts;
    }

    // Calculate selling costs
    calculateSellingCosts(salePrice) {
        const agentCommission = salePrice * this.propertyMarketData.transactionCosts.selling.agentCommission;
        const marketing = this.propertyMarketData.transactionCosts.selling.marketing;
        const legalFees = this.propertyMarketData.transactionCosts.selling.legalFees;
        const otherCosts = this.propertyMarketData.transactionCosts.selling.otherCosts;

        return agentCommission + marketing + legalFees + otherCosts;
    }

    // Calculate remaining loan balance
    calculateRemainingLoan(currentLoan, years) {
        if (currentLoan <= 0) return 0;

        // Assume standard 30-year P&I loan at 6.5%
        const monthlyRate = 0.065 / 12;
        const totalPayments = 30 * 12;
        const monthlyPayment = currentLoan * (monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) /
            (Math.pow(1 + monthlyRate, totalPayments) - 1);

        // Calculate balance after years of payments
        const paymentsRemaining = Math.max(0, totalPayments - years * 12);
        if (paymentsRemaining <= 0) return 0;

        return monthlyPayment * (Math.pow(1 + monthlyRate, paymentsRemaining) - 1) /
            (monthlyRate * Math.pow(1 + monthlyRate, paymentsRemaining));
    }

    // Calculate total rental income over period
    calculateTotalRentalIncome(currentRent, growthRate, years) {
        let totalIncome = 0;
        for (let year = 1; year <= years; year++) {
            const yearlyRent = currentRent * Math.pow(1 + growthRate, year);
            totalIncome += yearlyRent;
        }
        return totalIncome;
    }

    // Calculate holding costs over period
    calculateHoldingCosts(inputs, years) {
        const propertyValue = inputs.propertyValue || 0;
        const annualCosts = propertyValue * 0.02; // 2% of value annually (rates, insurance, maintenance)
        return annualCosts * years;
    }

    // Project property returns
    projectPropertyReturns(propertyPrice, annualRent, growthRate, years) {
        const futureValue = propertyPrice * Math.pow(1 + growthRate, years);
        const totalRentalIncome = this.calculateTotalRentalIncome(annualRent, 0.03, years);
        const holdingCosts = propertyPrice * 0.02 * years; // 2% annually

        const capitalGrowth = futureValue - propertyPrice;
        const netRentalIncome = totalRentalIncome - holdingCosts;
        const totalReturn = capitalGrowth + netRentalIncome;
        const annualizedReturn = Math.pow(totalReturn / propertyPrice + 1, 1/years) - 1;

        return {
            futureValue,
            capitalGrowth,
            totalRentalIncome,
            holdingCosts,
            netRentalIncome,
            totalReturn,
            annualizedReturn
        };
    }

    // Assess property risks
    assessPropertyRisks(inputs, analysis) {
        const risks = [];

        // Concentration risk
        const propertyValue = inputs.propertyValue || 0;
        const totalAssets = (inputs.yourCurrentSuper || 0) + (inputs.partnerCurrentSuper || 0) +
            (inputs.currentSavings || 0) + (inputs.currentStocks || 0) + propertyValue;

        if (propertyValue > totalAssets * 0.4) {
            risks.push({
                type: 'concentration',
                severity: 'high',
                description: `Property represents ${((propertyValue / totalAssets) * 100).toFixed(0)}% of total assets`,
                impact: 'High exposure to property market volatility'
            });
        }

        // Interest rate risk
        const outstandingLoan = inputs.propertyLoan || 0;
        if (outstandingLoan > propertyValue * 0.6) {
            risks.push({
                type: 'leverage',
                severity: 'medium',
                description: 'High loan-to-value ratio increases interest rate sensitivity',
                impact: 'Rising rates will significantly impact cash flow'
            });
        }

        // Liquidity risk
        risks.push({
            type: 'liquidity',
            severity: 'medium',
            description: 'Property is illiquid compared to shares or super',
            impact: 'Difficult to access capital quickly in emergencies'
        });

        // Location-specific risks
        const location = inputs.propertyLocation || 'national';
        if (['darwin', 'hobart'].includes(location.toLowerCase())) {
            risks.push({
                type: 'location',
                severity: 'medium',
                description: 'Smaller market with limited growth potential',
                impact: 'May underperform major capital cities'
            });
        }

        return {
            risks,
            overallRiskLevel: this.calculateOverallRisk(risks),
            riskScore: this.calculateRiskScore(risks, inputs)
        };
    }

    // Generate property recommendations
    generatePropertyRecommendations(inputs, analysis) {
        const recommendations = [];

        // Current property recommendations
        if (inputs.hasInvestmentProperty && analysis.currentPortfolio) {
            const portfolio = analysis.currentPortfolio;

            if (portfolio.grossYield < 0.03) {
                recommendations.push({
                    category: 'current_property',
                    priority: 'high',
                    title: 'Low Rental Yield Concern',
                    description: `Current gross yield of ${(portfolio.grossYield * 100).toFixed(1)}% is below market average`,
                    action: 'Consider selling and reinvesting in higher-yield property or shares'
                });
            }

            if (portfolio.cashFlow.netCashFlow < -10000) {
                recommendations.push({
                    category: 'current_property',
                    priority: 'medium',
                    title: 'Negative Cash Flow Management',
                    description: `Annual negative cash flow of ${formatCurrency(Math.abs(portfolio.cashFlow.netCashFlow))}`,
                    action: 'Review rent, refinance loan, or consider selling if unsustainable'
                });
            }
        }

        // Strategy recommendations based on analysis
        const optimalStrategy = analysis.optimalStrategy;
        if (optimalStrategy) {
            recommendations.push({
                category: 'strategy',
                priority: 'high',
                title: 'Optimal Property Strategy',
                description: optimalStrategy.description,
                action: optimalStrategy.recommendation,
                financialImpact: optimalStrategy.financialImpact
            });
        }

        // Risk mitigation recommendations
        const risks = analysis.riskAssessment.risks;
        risks.filter(r => r.severity === 'high').forEach(risk => {
            recommendations.push({
                category: 'risk_mitigation',
                priority: 'high',
                title: `Address ${risk.type} Risk`,
                description: risk.description,
                action: this.getRiskMitigationAction(risk.type)
            });
        });

        return recommendations;
    }

    // Get risk mitigation actions
    getRiskMitigationAction(riskType) {
        const actions = {
            concentration: 'Diversify portfolio by investing in shares or other asset classes',
            leverage: 'Consider paying down loan or fixing interest rate to manage exposure',
            liquidity: 'Maintain emergency fund in liquid investments separate from property',
            location: 'Consider diversifying to multiple locations or major capital cities'
        };
        return actions[riskType] || 'Seek professional advice for risk management';
    }

    // Identify optimal strategy
    identifyOptimalStrategy(analysis, inputs) {
        const strategies = [];

        // Evaluate sell scenarios
        if (analysis.sellScenarios) {
            analysis.sellScenarios.forEach(scenario => {
                if (scenario.netBenefit > 0) {
                    strategies.push({
                        type: 'sell',
                        scenario: scenario.timing,
                        description: scenario.description,
                        financialImpact: scenario.netBenefit,
                        recommendation: scenario.recommendation,
                        score: this.calculateStrategyScore(scenario, 'sell')
                    });
                }
            });
        }

        // Evaluate hold scenarios
        if (analysis.holdScenarios) {
            analysis.holdScenarios.forEach(scenario => {
                strategies.push({
                    type: 'hold',
                    scenario: scenario.timing,
                    description: scenario.description,
                    financialImpact: scenario.totalReturn,
                    recommendation: scenario.recommendation,
                    score: this.calculateStrategyScore(scenario, 'hold')
                });
            });
        }

        // Evaluate buy scenarios
        if (analysis.buyScenarios) {
            analysis.buyScenarios.filter(s => s.affordability?.feasible).forEach(scenario => {
                strategies.push({
                    type: 'buy',
                    scenario: 'new_purchase',
                    description: `Purchase ${formatCurrency(scenario.propertyPrice)} property in ${scenario.location}`,
                    financialImpact: scenario.projectedReturns?.totalReturn || 0,
                    recommendation: scenario.recommendation,
                    score: this.calculateStrategyScore(scenario, 'buy')
                });
            });
        }

        // Return highest scoring strategy
        strategies.sort((a, b) => b.score - a.score);
        return strategies[0] || null;
    }

    // Calculate strategy score
    calculateStrategyScore(scenario, type) {
        let score = 50; // Base score

        switch (type) {
            case 'sell':
                score += scenario.netBenefit > 50000 ? 30 : scenario.netBenefit > 0 ? 15 : -20;
                score += scenario.marketTiming ? 10 : 0;
                break;
            case 'hold':
                score += scenario.annualizedReturn > 0.08 ? 30 : scenario.annualizedReturn > 0.06 ? 15 : -10;
                score += scenario.strategy === 'value_add' ? 10 : 0;
                break;
            case 'buy':
                score += scenario.projectedReturns?.annualizedReturn > 0.08 ? 25 : -15;
                score += scenario.cashFlow?.netCashFlow > 0 ? 20 : -10;
                break;
        }

        return Math.max(0, Math.min(100, score));
    }

    // Helper methods for assessments
    assessPropertyPerformance(grossYield, growthRate) {
        const totalReturn = grossYield + growthRate;
        if (totalReturn > 0.10) return 'excellent';
        if (totalReturn > 0.08) return 'good';
        if (totalReturn > 0.06) return 'fair';
        return 'poor';
    }

    getCurrentMarketCycle() {
        return this.propertyMarketData.marketCycles.currentPhase;
    }

    isPropertyAffordable(price, availableCapital, inputs) {
        const requiredDeposit = price * 0.2;
        const buyingCosts = this.calculateBuyingCosts(price);
        const totalRequired = requiredDeposit + buyingCosts;

        return availableCapital >= totalRequired;
    }

    recommendLocation(budget) {
        // Simple location recommendation based on budget
        if (budget >= 800000) return 'sydney';
        if (budget >= 600000) return 'melbourne';
        if (budget >= 500000) return 'brisbane';
        return 'adelaide';
    }

    assessSellScenario(afterTaxProceeds, alternativeReturns, marketTiming) {
        if (alternativeReturns.finalValue > afterTaxProceeds * 1.2) {
            return 'Strongly consider selling - alternative investments offer better returns';
        }
        if (alternativeReturns.finalValue > afterTaxProceeds && marketTiming) {
            return 'Consider selling at market peak for optimal timing';
        }
        return 'Holding property may be preferable to selling';
    }

    assessHoldScenario(annualizedReturn, strategy) {
        if (annualizedReturn > 0.08) {
            return `Excellent strategy - ${strategy} approach projected to deliver strong returns`;
        }
        if (annualizedReturn > 0.06) {
            return `Good strategy - ${strategy} approach should meet market expectations`;
        }
        return `Consider alternative strategies - ${strategy} may underperform`;
    }

    assessBuyScenario(cashFlow, projectedReturns, upfrontCost) {
        if (projectedReturns?.annualizedReturn > 0.08 && cashFlow?.netCashFlow >= 0) {
            return 'Excellent investment opportunity - positive cash flow and strong growth potential';
        }
        if (projectedReturns?.annualizedReturn > 0.06) {
            return 'Good investment opportunity - solid returns expected';
        }
        return 'Consider carefully - returns may not justify the risk and illiquidity';
    }

    assessAffordability(totalUpfront, cashFlow, availableCapital) {
        const feasible = availableCapital >= totalUpfront;
        const cashFlowManageable = Math.abs(cashFlow?.netCashFlow || 0) < availableCapital * 0.1; // < 10% of capital annually

        return {
            feasible,
            cashFlowManageable,
            upfrontRequired: totalUpfront,
            availableCapital,
            shortfall: feasible ? 0 : totalUpfront - availableCapital
        };
    }

    calculateOverallRisk(risks) {
        const highRisks = risks.filter(r => r.severity === 'high').length;
        const mediumRisks = risks.filter(r => r.severity === 'medium').length;

        if (highRisks >= 2) return 'high';
        if (highRisks >= 1 || mediumRisks >= 3) return 'medium';
        return 'low';
    }

    calculateRiskScore(risks, inputs) {
        let score = 0;
        risks.forEach(risk => {
            if (risk.severity === 'high') score += 30;
            if (risk.severity === 'medium') score += 15;
            if (risk.severity === 'low') score += 5;
        });
        return Math.min(100, score);
    }

    calculateAlternativeInvestmentReturns(amount, years) {
        // Assume 7% average return in diversified share portfolio
        const shareReturn = 0.07;
        const finalValue = amount * Math.pow(1 + shareReturn, years);

        return {
            investmentAmount: amount,
            years,
            assumedReturn: shareReturn,
            finalValue,
            totalReturn: finalValue - amount,
            annualizedReturn: shareReturn
        };
    }

    // Generate property analysis summary for display
    generatePropertySummary(inputs) {
        const analysis = this.analyzePropertyStrategy(inputs);

        return {
            currentProperty: analysis.currentPortfolio,
            optimalStrategy: analysis.optimalStrategy,
            keyRisks: analysis.riskAssessment.risks.filter(r => r.severity === 'high' || r.severity === 'medium'),
            topRecommendations: analysis.recommendations.slice(0, 3),
            sellScenarios: analysis.sellScenarios?.slice(0, 3) || [],
            buyScenarios: analysis.buyScenarios?.slice(0, 2) || [],
            overallAssessment: this.generateOverallAssessment(analysis)
        };
    }

    generateOverallAssessment(analysis) {
        const risks = analysis.riskAssessment.risks;
        const strategy = analysis.optimalStrategy;

        let assessment = 'neutral';
        let description = 'Property strategy appears balanced with moderate risks and returns';

        if (risks.filter(r => r.severity === 'high').length >= 2) {
            assessment = 'caution';
            description = 'Property strategy has significant risks that should be addressed';
        } else if (strategy && strategy.score > 70) {
            assessment = 'positive';
            description = 'Property strategy shows good potential for strong returns';
        }

        return { assessment, description };
    }
}