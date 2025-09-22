// js/app.js - Main Application Controller

import { ENHANCED_CONFIG } from './config.js';
import RetirementSimulator from './simulator.js';
import ChartManager from './charts.js';
import { 
    $, 
    safeGetValue, 
    safeGetChecked, 
    safeGetSelectValue,
    safeSetValue,
    safeSetText,
    safeSetHTML,
    formatCurrency,
    formatPercent,
    updateProgress,
    exportToCSV,
    exportToXLSX,
    exportToPDF,
    showTab,
    debounce,
    showNotification
} from './utils.js';

class RetirementCalculatorApp {
    constructor() {
        this.simulator = new RetirementSimulator();
        this.chartManager = new ChartManager();
        this.currentResults = null;
        this.isCalculating = false;
        
        this.initializeApp();
    }

    initializeApp() {
        this.setupEventListeners();
        this.updateUIElements();
        this.performInitialCalculation();
    }

    // Input collection with complete property support
    collectInputs() {
        return {
            // Personal details
            yourCurrentAge: safeGetValue('yourCurrentAge', 49),
            partnerCurrentAge: safeGetValue('partnerCurrentAge', 47),
            retirementAge: safeGetValue('retirementAge', 72),
            partnerRetirementAge: safeGetValue('partnerRetirementAge', 62),
            yourLifespan: safeGetValue('yourLifespan', 95),
            partnerLifespan: safeGetValue('partnerLifespan', 99),
            
            // Risk profile
            riskTolerance: safeGetValue('riskTolerance', 6),
            hasEmergencyFund: safeGetSelectValue('hasEmergencyFund', 'partial'),
            hasDebt: safeGetSelectValue('hasDebt', 'minimal'),
            dependents: safeGetValue('dependents', 0),
            
            // Financial details
            yourSalary: safeGetValue('yourSalary', 214000),
            partnerSalary: safeGetValue('partnerSalary', 34500),
            yourCurrentSuper: safeGetValue('yourCurrentSuper', 312000),
            partnerCurrentSuper: safeGetValue('partnerCurrentSuper', 150000),
            currentSavings: safeGetValue('currentSavings', 55000),
            currentStocks: safeGetValue('currentStocks', 62000),
            monthlyStockContribution: safeGetValue('monthlyStockContribution', 800),
            percentIncomeSaved: safeGetValue('percentIncomeSaved', 9) / 100,
            
            // Property details
            homeValue: safeGetValue('homeValue', 810000),
            mortgageBalance: safeGetValue('mortgageBalance', 594000),
            mortgageRate: safeGetValue('mortgageRate', 5.37) / 100,
            monthlyMortgagePayment: safeGetValue('monthlyMortgagePayment', 3584),
            planToDownsize: safeGetSelectValue('planToDownsize', 'false') === 'true',
            
            // Investment property
            hasInvestmentProperty: safeGetChecked('hasInvestmentProperty', false),
            investmentPropertyValue: safeGetValue('investmentPropertyValue', 550000),
            investmentPropertyLoan: safeGetValue('investmentPropertyLoan', 574000),
            investmentPropertyRate: safeGetValue('investmentPropertyRate', 6.2) / 100,
            weeklyRentalIncome: safeGetValue('weeklyRentalIncome', 554),
            annualPropertyExpenses: safeGetValue('annualPropertyExpenses', 9675),
            propertyGrowthRate: safeGetValue('propertyGrowthRate', 4.5),
            sellPropertyYears: safeGetValue('sellPropertyYears', 15),
            capitalGainsTaxRate: safeGetValue('capitalGainsTaxRate', 22.5),
            
            // Healthcare & aged care
            currentHealthcareCosts: safeGetValue('currentHealthcareCosts', 3500),
            healthcareInflation: safeGetValue('healthcareInflation', 6.5),
            agedCareProbability: safeGetValue('agedCareProbability', 65),
            agedCareStartAge: safeGetValue('agedCareStartAge', 85),
            agedCareDuration: safeGetValue('agedCareDuration', 3.5),
            agedCareAnnualCost: safeGetValue('agedCareAnnualCost', 75000),
            
            // Economic assumptions
            inflation: safeGetValue('inflation', 2.87) / 100,
            investmentReturn: safeGetValue('investmentReturn', 5.61) / 100,
            returnDeclineRate: safeGetValue('returnDeclineRate', 0.03),
            savingsReturn: safeGetValue('savingsReturn', 1.40) / 100,
            superReturn: safeGetValue('superReturn', 8.75) / 100,
            superContributionRate: ENHANCED_CONFIG.SUPER_GUARANTEE_RATE,
            salaryGrowthRate: safeGetValue('salaryGrowthRate', 1.5),
            leanYearsStart: safeGetValue('leanYearsStart', 5),
            leanYearsReduction: safeGetValue('leanYearsReduction', 25),
            
            // Dynamic allocation
            useGlidePath: safeGetChecked('useGlidePath', true),
            glidePathRule: safeGetSelectValue('glidePathRule', '110minus'),
            frankingCreditBenefit: safeGetValue('frankingCreditBenefit', 1.2),
            australianEquityAllocation: safeGetValue('australianEquityAllocation', 40),
            allocEquities: safeGetValue('allocEquities', 60),
            allocBonds: safeGetValue('allocBonds', 30),
            allocCash: safeGetValue('allocCash', 10),
            
            // Pension system
            asfaComfortable: safeGetValue('asfaComfortable', 73875),
            agePensionMax: safeGetValue('agePensionMax', 45037),
            pensionAssetThreshold: safeGetValue('pensionAssetThreshold', 470000),
            pensionAssetLimit: safeGetValue('pensionAssetLimit', 1031000),
            pensionIncomeThreshold: safeGetValue('pensionIncomeThreshold', 372),
            
            // Simulation controls
            returnVolatility: safeGetValue('returnVolatility', 12) / 100,
            enableShocks: safeGetChecked('enableShocks', false),
            shockProbability: safeGetValue('shockProbability', 5) / 100,
            shockMagnitude: safeGetValue('shockMagnitude', -25) / 100,
            numRuns: safeGetValue('numRuns', 5000)
        };
    }

    // Update risk profile display
    updateRiskProfile(inputs) {
        const capacity = this.simulator.calculateRiskCapacity(inputs);
        const tolerance = inputs.riskTolerance * 10;
        const requirement = this.simulator.calculateRiskRequirement(inputs);

        // Update risk bars
        const riskCapacityBar = $('riskCapacityBar');
        const riskToleranceBar = $('riskToleranceBar');
        const riskRequirementBar = $('riskRequirementBar');

        if (riskCapacityBar) riskCapacityBar.style.width = `${capacity}%`;
        if (riskToleranceBar) riskToleranceBar.style.width = `${tolerance}%`;
        if (riskRequirementBar) riskRequirementBar.style.width = `${requirement}%`;

        // Update risk text
        safeSetText('riskCapacityText', `${capacity.toFixed(0)}% (${capacity > 70 ? 'High' : capacity > 40 ? 'Moderate' : 'Low'})`);
        safeSetText('riskToleranceText', `${tolerance.toFixed(0)}% (${tolerance > 70 ? 'Aggressive' : tolerance > 40 ? 'Balanced' : 'Conservative'})`);
        safeSetText('riskRequirementText', `${requirement.toFixed(0)}% (${requirement > 70 ? 'High' : requirement > 40 ? 'Moderate' : 'Low'})`);
    }

    // Update recommended allocation display
    updateRecommendedAllocation(inputs) {
        if (inputs.useGlidePath) {
            const allocation = this.simulator.calculateDynamicAllocation(inputs.yourCurrentAge, inputs.glidePathRule);
            safeSetHTML('recommendedAllocation', 
                `Equity: ${allocation.equity}% | Bonds: ${allocation.bonds.toFixed(0)}% | Cash: ${allocation.cash.toFixed(0)}%`
            );
        } else {
            safeSetText('recommendedAllocation', 'Using custom allocation');
        }
    }

    // Main calculation function
    async calculateRetirement() {
        if (this.isCalculating) return;
        
        this.isCalculating = true;
        
        try {
            const inputs = this.collectInputs();
            const result = this.simulator.simulateRetirement(inputs, false);
            this.currentResults = result;
            
            // Update UI
            this.updateRiskProfile(inputs);
            this.updateRecommendedAllocation(inputs);
            this.displaySummaryResults(result, inputs);
            this.displayYearByYearProjection(result);
            this.displayPropertyAnalysis(result, inputs);
            this.displayRiskAnalysis(result, inputs);
            this.displayOptimizationStrategies(result, inputs);
            
            // Render charts
            this.chartManager.renderCompleteAnalysis(result, inputs);
            
            showNotification('Calculation completed successfully', 'success');
            
        } catch (error) {
            console.error('Calculation error:', error);
            showNotification('Error in calculation: ' + error.message, 'error');
        } finally {
            this.isCalculating = false;
        }
    }

    // Display enhanced summary results
    displaySummaryResults(result, inputs) {
        const yearsToRetirement = inputs.retirementAge - inputs.yourCurrentAge;
        const requiredAnnualIncomeInRetirement = inputs.asfaComfortable * Math.pow(1 + inputs.inflation, yearsToRetirement);

        safeSetHTML('summaryResults', `
            <div class="p-3 bg-blue-50 rounded flex justify-between">
                <strong>Years to Retirement:</strong> 
                <span>${yearsToRetirement}</span>
            </div>
            <div class="p-3 bg-blue-50 rounded flex justify-between">
                <strong>Future Super:</strong> 
                <span class="font-semibold">${formatCurrency(result.futureSuper)}</span>
            </div>
            <div class="p-3 bg-blue-50 rounded flex justify-between">
                <strong>Future Savings:</strong> 
                <span class="font-semibold">${formatCurrency(result.futureSavings)}</span>
            </div>
            <div class="p-3 bg-blue-50 rounded flex justify-between">
                <strong>Future Investments:</strong> 
                <span class="font-semibold">${formatCurrency(result.futureStocks)}</span>
            </div>
            <div class="p-3 bg-green-50 rounded flex justify-between">
                <strong>Accessible Home Equity:</strong> 
                <span class="font-semibold">${formatCurrency(result.accessibleHomeEquity)}</span>
            </div>
            ${inputs.hasInvestmentProperty ? `
            <div class="p-3 bg-yellow-50 rounded flex justify-between">
                <strong>Property Equity:</strong> 
                <span class="font-semibold">${formatCurrency(result.propertyEquity)}</span>
            </div>
            ` : ''}
            <div class="p-3 bg-green-50 rounded flex justify-between">
                <strong>Total Assets at Retirement:</strong> 
                <span class="font-bold text-lg">${formatCurrency(result.totalFinancialAssets + result.accessibleHomeEquity)}</span>
            </div>
            <div class="p-3 bg-red-50 rounded flex justify-between">
                <strong>Income Needed (ASFA):</strong> 
                <span class="font-bold text-lg">${formatCurrency(requiredAnnualIncomeInRetirement)}</span>
            </div>
            <div class="p-3 bg-purple-50 rounded flex justify-between">
                <strong>Expected Aged Care Costs:</strong> 
                <span class="font-semibold">${formatCurrency(result.agedCareCosts.expectedCost)}</span>
            </div>
        `);

        // Final result
        const finalResultContainer = $('finalResult');
        if (finalResultContainer) {
            if (result.finalBalance > 0) {
                finalResultContainer.className = 'mt-4 p-4 rounded-lg bg-green-100 text-green-800';
                finalResultContainer.innerHTML = `
                    <div class="font-bold text-xl">Retirement Goal Met ✓</div>
                    <div class="mt-1">Projected remaining assets at age ${inputs.partnerLifespan}: <strong>${formatCurrency(result.finalBalance)}</strong></div>
                `;
            } else {
                finalResultContainer.className = 'mt-4 p-4 rounded-lg bg-red-100 text-red-800';
                finalResultContainer.innerHTML = `
                    <div class="font-bold text-xl">Retirement Shortfall ⚠️</div>
                    <div class="mt-1">Assets projected to be depleted before end of lifespan</div>
                `;
            }
        }

        // Enhanced recommendations
        const recommendations = this.generateEnhancedRecommendations(inputs, result);
        safeSetHTML('enhancedRecommendationsList', recommendations.map(r => `<li>${r}</li>`).join(''));
    }

    // Display year-by-year projection table
    displayYearByYearProjection(result) {
        const projectionTable = $('projectionTable');
        if (!projectionTable) return;

        projectionTable.innerHTML = '';
        
        result.yearlyData.slice(0, 30).forEach(data => {
            if (data.depleted) {
                projectionTable.innerHTML += `
                    <tr class="bg-red-100">
                        <td colspan="7" class="px-4 py-2 text-center font-bold">
                            Financial assets depleted in ${data.year}
                        </td>
                    </tr>
                `;
                return;
            }

            projectionTable.innerHTML += `
                <tr>
                    <td class="px-4 py-2">${data.year}</td>
                    <td class="px-4 py-2">${data.age}</td>
                    <td class="px-4 py-2">${formatCurrency(data.startBalance)}</td>
                    <td class="px-4 py-2 text-blue-600">+${formatCurrency(data.propertyIncome || 0)}</td>
                    <td class="px-4 py-2 text-red-600">-${formatCurrency(data.healthcareCost)}</td>
                    <td class="px-4 py-2 text-red-600">-${formatCurrency(data.agedCareCost)}</td>
                    <td class="px-4 py-2 font-semibold">${formatCurrency(data.endBalance)}</td>
                </tr>
            `;
        });
    }

    // Display property analysis
    displayPropertyAnalysis(result, inputs) {
        const propertyAnalysis = $('propertyAnalysis');
        if (!propertyAnalysis) return;

        if (!inputs.hasInvestmentProperty) {
            propertyAnalysis.innerHTML = `
                <div class="col-span-2 p-4 bg-gray-50 rounded text-center">
                    <p class="text-gray-600">No investment property included in analysis</p>
                </div>
            `;
            return;
        }

        const currentCashFlow = result.propertyHistory[0] || {};
        const keepVsSellAnalysis = this.analyzeKeepVsSell(inputs);

        propertyAnalysis.innerHTML = `
            <div class="property-card property-${currentCashFlow.netCashFlow > 0 ? 'positive' : 'negative'}">
                <h3 class="font-semibold mb-3">Current Property Performance</h3>
                <div class="space-y-2 text-sm">
                    <div class="flex justify-between">
                        <span>Annual Rental Income:</span>
                        <span class="font-medium">${formatCurrency(currentCashFlow.grossRental || 0)}</span>
                    </div>
                    <div class="flex justify-between">
                        <span>Annual Expenses:</span>
                        <span class="font-medium">-${formatCurrency(currentCashFlow.expenses || 0)}</span>
                    </div>
                    <div class="flex justify-between">
                        <span>Interest Cost:</span>
                        <span class="font-medium">-${formatCurrency(currentCashFlow.interestCost || 0)}</span>
                    </div>
                    <div class="flex justify-between border-t pt-2">
                        <span class="font-semibold">Net Cash Flow:</span>
                        <span class="font-semibold ${currentCashFlow.netCashFlow > 0 ? 'text-green-600' : 'text-red-600'}">
                            ${formatCurrency(currentCashFlow.netCashFlow || 0)}
                        </span>
                    </div>
                </div>
            </div>
            
            <div class="property-card">
                <h3 class="font-semibold mb-3">Keep vs Sell Analysis</h3>
                <div class="space-y-3 text-sm">
                    <div class="p-3 bg-white rounded">
                        <div class="font-medium">Keep Property Strategy:</div>
                        <div class="mt-1">Total return: ${formatPercent(keepVsSellAnalysis.keepTotalReturn)}</div>
                        <div>Net income contribution: ${formatCurrency(keepVsSellAnalysis.keepNetIncome)}</div>
                    </div>
                    <div class="p-3 bg-white rounded">
                        <div class="font-medium">Sell in ${inputs.sellPropertyYears} years:</div>
                        <div class="mt-1">Net proceeds: ${formatCurrency(keepVsSellAnalysis.sellNetProceeds)}</div>
                        <div>Portfolio investment return: ${formatPercent(keepVsSellAnalysis.sellInvestmentReturn)}</div>
                    </div>
                    <div class="p-2 bg-gray-100 rounded font-medium text-center">
                        ${keepVsSellAnalysis.recommendation}
                    </div>
                </div>
            </div>
        `;
    }

    // Display risk analysis
    displayRiskAnalysis(result, inputs) {
        const riskAnalysisContent = $('riskAnalysisContent');
        if (!riskAnalysisContent) return;

        const capacity = this.simulator.calculateRiskCapacity(inputs);
        const tolerance = inputs.riskTolerance * 10;
        const requirement = this.simulator.calculateRiskRequirement(inputs);

        riskAnalysisContent.innerHTML = `
            <div class="space-y-4">
                <div class="p-4 bg-blue-50 rounded">
                    <h3 class="font-semibold mb-3">Risk Profile Summary</h3>
                    <div class="space-y-3">
                        <div>
                            <div class="flex justify-between mb-1">
                                <span class="text-sm">Risk Capacity</span>
                                <span class="text-sm font-medium">${capacity}%</span>
                            </div>
                            <div class="risk-meter">
                                <div class="risk-indicator" style="left: ${capacity}%"></div>
                            </div>
                        </div>
                        <div>
                            <div class="flex justify-between mb-1">
                                <span class="text-sm">Risk Tolerance</span>
                                <span class="text-sm font-medium">${tolerance}%</span>
                            </div>
                            <div class="risk-meter">
                                <div class="risk-indicator" style="left: ${tolerance}%"></div>
                            </div>
                        </div>
                        <div>
                            <div class="flex justify-between mb-1">
                                <span class="text-sm">Risk Requirement</span>
                                <span class="text-sm font-medium">${requirement}%</span>
                            </div>
                            <div class="risk-meter">
                                <div class="risk-indicator" style="left: ${requirement}%"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="space-y-4">
                <div class="p-4 bg-yellow-50 rounded">
                    <h3 class="font-semibold mb-3">Key Risk Factors</h3>
                    <ul class="text-sm space-y-2">
                        <li>• <strong>Sequence of Returns Risk:</strong> ${result.finalBalance > 0 ? 'Low impact expected' : 'High impact - early losses could deplete portfolio'}</li>
                        <li>• <strong>Longevity Risk:</strong> ${inputs.partnerLifespan > 95 ? 'High - planning for extended lifespan' : 'Moderate - standard life expectancy'}</li>
                        <li>• <strong>Healthcare Cost Risk:</strong> ${inputs.healthcareInflation > 6 ? 'High - above-average inflation assumed' : 'Moderate - standard healthcare inflation'}</li>
                        <li>• <strong>Property Concentration Risk:</strong> ${inputs.hasInvestmentProperty ? 'Present - significant property exposure' : 'Low - diversified portfolio'}</li>
                    </ul>
                </div>
            </div>
        `;
    }

    // Display optimization strategies
    displayOptimizationStrategies(result, inputs) {
        const optimizationContent = $('optimizationContent');
        if (!optimizationContent) return;

        const pensionOptimization = this.analyzePensionOptimization(result, inputs);
        const taxOptimization = this.analyzeTaxOptimization(inputs);
        const contributionOptimization = this.analyzeContributionOptimization(inputs);
        const allocationOptimization = this.analyzeAllocationOptimization(inputs);

        optimizationContent.innerHTML = `
            <div class="enhancement-highlight p-4 rounded-lg">
                <h3 class="text-lg font-semibold mb-3">Age Pension Optimization</h3>
                <div class="space-y-3 text-sm">
                    ${pensionOptimization.map(strategy => `<div>• ${strategy}</div>`).join('')}
                </div>
            </div>
            
            <div class="enhancement-highlight p-4 rounded-lg">
                <h3 class="text-lg font-semibold mb-3">Tax Optimization</h3>
                <div class="space-y-3 text-sm">
                    ${taxOptimization.map(strategy => `<div>• ${strategy}</div>`).join('')}
                </div>
            </div>
            
            <div class="enhancement-highlight p-4 rounded-lg">
                <h3 class="text-lg font-semibold mb-3">Contribution Strategies</h3>
                <div class="space-y-3 text-sm">
                    ${contributionOptimization.map(strategy => `<div>• ${strategy}</div>`).join('')}
                </div>
            </div>
            
            <div class="enhancement-highlight p-4 rounded-lg">
                <h3 class="text-lg font-semibold mb-3">Asset Allocation Optimization</h3>
                <div class="space-y-3 text-sm">
                    ${allocationOptimization.map(strategy => `<div>• ${strategy}</div>`).join('')}
                </div>
            </div>
        `;
    }

    // Analysis functions
    analyzeKeepVsSell(inputs) {
        if (!inputs.hasInvestmentProperty) return null;

        // Simplified analysis
        const yearsToSell = inputs.sellPropertyYears;
        const currentValue = inputs.investmentPropertyValue;
        const futureValue = currentValue * Math.pow(1 + inputs.propertyGrowthRate / 100, yearsToSell);
        const remainingLoan = this.simulator.calculatePropertyLoanBalance(
            inputs.investmentPropertyLoan, 
            inputs.investmentPropertyRate, 
            yearsToSell
        );
        
        const sellingCosts = futureValue * 0.06;
        const capitalGain = futureValue - currentValue;
        const cgtPayable = capitalGain * 0.5 * (inputs.capitalGainsTaxRate / 100);
        const sellNetProceeds = futureValue - remainingLoan - sellingCosts - cgtPayable;
        
        const annualRental = inputs.weeklyRentalIncome * 52;
        const keepNetIncome = (annualRental - inputs.annualPropertyExpenses) * yearsToSell;
        
        return {
            keepTotalReturn: (keepNetIncome + (futureValue - currentValue)) / currentValue,
            keepNetIncome,
            sellNetProceeds,
            sellInvestmentReturn: 0.07,
            recommendation: sellNetProceeds > (keepNetIncome + currentValue) ? 
                'Consider selling - higher returns from portfolio investment' : 
                'Consider keeping - property provides better total return'
        };
    }

    analyzePensionOptimization(result, inputs) {
        const strategies = [];
        const totalAssets = result.totalFinancialAssets + result.accessibleHomeEquity;
        
        if (totalAssets > inputs.pensionAssetThreshold) {
            strategies.push('Consider gifting strategies: $10K annually or $30K over 5 years');
            strategies.push('Funeral bonds up to $15,750 per person are exempt from asset test');
        }
        
        if (inputs.planToDownsize) {
            strategies.push('Downsizing can free up to $300K per person (exempt from asset test for 2 years)');
        }
        
        if (inputs.hasInvestmentProperty) {
            strategies.push('Investment property equity affects pension - consider timing of sale');
        }
        
        strategies.push('Account-based pensions vs annuities: Compare asset test treatment');
        
        return strategies;
    }

    analyzeTaxOptimization(inputs) {
        const strategies = [];
        const totalSalary = inputs.yourSalary + inputs.partnerSalary;
        
        if (totalSalary > 100000) {
            strategies.push('Maximize salary sacrifice to super ($30K cap including carry-forward)');
        }
        
        if (inputs.hasInvestmentProperty) {
            strategies.push('Maximize negative gearing benefits and depreciation claims');
            strategies.push('Consider timing property sale for optimal CGT treatment');
        }
        
        strategies.push('Focus on franking credit eligible Australian shares in retirement');
        strategies.push('Use spouse super contributions if income disparity exists');
        
        return strategies;
    }

    analyzeContributionOptimization(inputs) {
        const strategies = [];
        
        strategies.push(`Current super guarantee: ${formatPercent(inputs.superContributionRate)} - increases to 12% by 2025`);
        
        if (inputs.yourSalary > 50000) {
            strategies.push('Consider additional voluntary super contributions for tax benefits');
        }
        
        if (!inputs.useGlidePath) {
            strategies.push('Enable dynamic allocation for age-appropriate risk management');
        }
        
        strategies.push('Dollar-cost averaging through regular contributions reduces market timing risk');
        
        return strategies;
    }

    analyzeAllocationOptimization(inputs) {
        const strategies = [];
        const capacity = this.simulator.calculateRiskCapacity(inputs);
        const tolerance = inputs.riskTolerance * 10;
        
        if (capacity > tolerance + 20) {
            strategies.push('You have capacity for higher risk allocation to potentially improve returns');
        }
        
        if (inputs.australianEquityAllocation < 30) {
            strategies.push('Consider increasing Australian equity allocation for franking credit benefits');
        }
        
        if (!inputs.useGlidePath) {
            strategies.push('Dynamic allocation glide paths automatically reduce risk as you age');
        }
        
        strategies.push('Regular rebalancing maintains target allocations and harvests gains');
        
        return strategies;
    }

    generateEnhancedRecommendations(inputs, result) {
        const recommendations = [];
        
        // Risk-based recommendations
        const capacity = this.simulator.calculateRiskCapacity(inputs);
        const tolerance = inputs.riskTolerance * 10;
        const requirement = this.simulator.calculateRiskRequirement(inputs);
        
        if (requirement > tolerance) {
            recommendations.push('Consider increasing risk tolerance or extending retirement timeline to meet goals');
        }
        
        if (capacity > tolerance + 20) {
            recommendations.push('You have capacity for higher risk to potentially improve returns');
        }
        
        // Healthcare recommendations
        if (inputs.currentHealthcareCosts < 2000) {
            recommendations.push('Consider budgeting more for healthcare costs - average is $3,500+ annually');
        }
        
        // Property recommendations
        if (inputs.hasInvestmentProperty) {
            const cashFlow = result.propertyHistory[0];
            if (cashFlow && cashFlow.netCashFlow < 0) {
                recommendations.push('Investment property has negative cash flow - review holding strategy');
            }
        }
        
        // Allocation recommendations
        if (!inputs.useGlidePath) {
            recommendations.push('Consider enabling dynamic allocation for age-appropriate risk management');
        }
        
        // Aged care preparation
        if (result.agedCareCosts.expectedCost > result.finalBalance * 0.3) {
            recommendations.push('Aged care costs represent significant portion of assets - consider insurance options');
        }
        
        return recommendations;
    }

    // Monte Carlo simulation
    async runMonteCarloSimulation() {
        if (this.isCalculating) return;
        
        this.isCalculating = true;
        
        try {
            const inputs = this.collectInputs();
            const runs = inputs.numRuns;
            
            const progressCallback = async (completed, total) => {
                const percentage = (completed / total) * 100;
                updateProgress(percentage, `Running simulation... ${completed}/${total}`);
                await new Promise(resolve => setTimeout(resolve, 0));
            };
            
            const results = await this.simulator.runMonteCarloSimulation(inputs, runs, progressCallback);
            
            // Update Monte Carlo results display
            const mcResults = $('monteCarloResults');
            if (mcResults) {
                mcResults.classList.remove('hidden');
                safeSetText('mcRuns', runs.toLocaleString());
                safeSetText('mcSuccessRate', formatPercent(results.successRate));
                safeSetText('mcMedian', formatCurrency(results.median));
                safeSetText('mc10th', formatCurrency(results.percentile10));
                safeSetText('mcConfidence', `${(results.successRate * 100).toFixed(0)}%`);
            }
            
            // Render Monte Carlo charts
            this.chartManager.renderMonteCarloFanChart(inputs, results.paths);
            this.chartManager.renderHistogram(results.outcomes);
            
            // Switch to charts tab
            showTab('charts');
            
            updateProgress(0);
            showNotification('Monte Carlo simulation completed', 'success');
            
        } catch (error) {
            console.error('Monte Carlo simulation error:', error);
            showNotification('Error in Monte Carlo simulation: ' + error.message, 'error');
        } finally {
            this.isCalculating = false;
            updateProgress(0);
        }
    }

    // Stress testing
    async runStressTest() {
        if (this.isCalculating) return;
        
        this.isCalculating = true;
        
        try {
            const inputs = this.collectInputs();
            const scenarios = ENHANCED_CONFIG.STRESS_SCENARIOS;
            const results = [];
            
            for (let i = 0; i < scenarios.length; i++) {
                updateProgress((i / scenarios.length) * 100, `Testing scenario: ${scenarios[i].name}`);
                const result = this.simulator.runStressTest(inputs, scenarios[i]);
                results.push({
                    scenario: scenarios[i].name,
                    finalBalance: result.finalBalance,
                    success: result.finalBalance > 0
                });
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            // Display stress test results
            this.displayStressTestResults(results);
            showTab('riskAnalysis');
            
            updateProgress(0);
            showNotification('Stress testing completed', 'success');
            
        } catch (error) {
            console.error('Stress test error:', error);
            showNotification('Error in stress testing: ' + error.message, 'error');
        } finally {
            this.isCalculating = false;
            updateProgress(0);
        }
    }

    displayStressTestResults(results) {
        const stressTestResults = $('stressTestResults');
        if (!stressTestResults) return;
        
        stressTestResults.innerHTML = results.map(result => `
            <div class="p-3 rounded ${result.success ? 'bg-green-50' : 'bg-red-50'}">
                <div class="font-medium">${result.scenario}</div>
                <div class="text-sm mt-1">
                    Final Balance: ${formatCurrency(result.finalBalance)}
                    <span class="ml-2 ${result.success ? 'text-green-600' : 'text-red-600'}">
                        ${result.success ? '✓ Survives' : '✗ Depleted'}
                    </span>
                </div>
            </div>
        `).join('');
    }

    // Export functionality
    exportResults(exportType) {
        if (!exportType) {
            showNotification('Export type must be specified.', 'warning');
            return;
        }

        if (!this.currentResults) {
            showNotification('No results to export. Please run a calculation first.', 'warning');
            return;
        }

        switch (exportType) {
            case 'csv':
                const csvData = this.currentResults.yearlyData.map(data => ({
                    Year: data.year,
                    Age: data.age,
                    Start_Balance: data.startBalance,
                    Return_Rate: data.returnRate,
                    Growth: data.growth,
                    Withdrawal: data.withdrawal,
                    Healthcare_Cost: data.healthcareCost,
                    Aged_Care_Cost: data.agedCareCost,
                    Property_Income: data.propertyIncome || 0,
                    Pension_Income: data.pensionIncome || 0,
                    End_Balance: data.endBalance
                }));
                exportToCSV(csvData, 'enhanced-retirement-projection.csv');
                break;
            case 'xlsx':
                exportToXLSX(this.collectInputs(), this.currentResults, this.chartManager);
                break;
            case 'pdf':
                exportToPDF(this.collectInputs(), this.currentResults, this.chartManager);
                break;
            default:
                showNotification(`Invalid export type: ${exportType}`, 'error');
        }
    }

    // UI update functions
    updateUIElements() {
        // Investment property section toggle
        const hasInvestmentProperty = $('hasInvestmentProperty');
        const investmentPropertySection = $('investmentPropertySection');
        
        if (hasInvestmentProperty && investmentPropertySection) {
            const togglePropertySection = () => {
                if (hasInvestmentProperty.checked) {
                    investmentPropertySection.classList.remove('hidden');
                } else {
                    investmentPropertySection.classList.add('hidden');
                }
            };
            
            hasInvestmentProperty.addEventListener('change', togglePropertySection);
            togglePropertySection(); // Initial state
        }

        // Update CGT rate based on marginal tax rate
        const updateCGTRate = () => {
            const totalSalary = safeGetValue('yourSalary', 0) + safeGetValue('partnerSalary', 0);
            let marginalRate = 0;
            
            if (totalSalary > 180000) marginalRate = 45;
            else if (totalSalary > 120000) marginalRate = 37;
            else if (totalSalary > 45000) marginalRate = 32.5;
            else if (totalSalary > 18200) marginalRate = 19;
            
            const cgtRate = marginalRate * 0.5; // 50% discount
            safeSetValue('capitalGainsTaxRate', cgtRate);
        };

        // Salary change listeners for CGT calculation
        const yourSalary = $('yourSalary');
        const partnerSalary = $('partnerSalary');
        if (yourSalary) yourSalary.addEventListener('blur', updateCGTRate);
        if (partnerSalary) partnerSalary.addEventListener('blur', updateCGTRate);
    }

    // Event listeners
    setupEventListeners() {
        // Main calculation button
        const btnCalculate = $('btnCalculate');
        if (btnCalculate) {
            btnCalculate.addEventListener('click', () => this.calculateRetirement());
        }

        // Monte Carlo button
        const btnMonteCarlo = $('btnMonteCarlo');
        if (btnMonteCarlo) {
            btnMonteCarlo.addEventListener('click', () => this.runMonteCarloSimulation());
        }

        // Stress test button
        const btnStressTest = $('btnStressTest');
        if (btnStressTest) {
            btnStressTest.addEventListener('click', () => this.runStressTest());
        }

        // Export dropdown functionality
        const btnExport = $('btnExport');
        const exportDropdown = $('exportDropdown');

        if (btnExport && exportDropdown) {
            btnExport.addEventListener('click', (e) => {
                e.stopPropagation();
                exportDropdown.classList.toggle('hidden');
            });

            document.addEventListener('click', (e) => {
                if (!exportDropdown.contains(e.target) && !btnExport.contains(e.target)) {
                    exportDropdown.classList.add('hidden');
                }
            });

            $('btnExportCSV').addEventListener('click', (e) => {
                e.preventDefault();
                this.exportResults('csv');
                exportDropdown.classList.add('hidden');
            });
            $('btnExportXLSX').addEventListener('click', (e) => {
                e.preventDefault();
                this.exportResults('xlsx');
                exportDropdown.classList.add('hidden');
            });
            $('btnExportPDF').addEventListener('click', (e) => {
                e.preventDefault();
                this.exportResults('pdf');
                exportDropdown.classList.add('hidden');
            });
        }

        // Auto-update on risk tolerance change
        const riskTolerance = $('riskTolerance');
        if (riskTolerance) {
            riskTolerance.addEventListener('input', debounce(() => {
                const inputs = this.collectInputs();
                this.updateRiskProfile(inputs);
            }, 300));
        }

        // Auto-update on glide path change
        const glidePathRule = $('glidePathRule');
        if (glidePathRule) {
            glidePathRule.addEventListener('change', () => {
                const inputs = this.collectInputs();
                this.updateRecommendedAllocation(inputs);
            });
        }

        // Enable/disable shock controls
        const enableShocks = $('enableShocks');
        const shockControls = $('shockControls');
        if (enableShocks && shockControls) {
            enableShocks.addEventListener('change', () => {
                if (enableShocks.checked) {
                    shockControls.classList.remove('hidden');
                } else {
                    shockControls.classList.add('hidden');
                }
            });
        }

        // Tab management - make showTab globally available
        window.showTab = showTab;

        // Property analysis chart toggle
        const hasInvestmentProperty = $('hasInvestmentProperty');
        if (hasInvestmentProperty) {
            hasInvestmentProperty.addEventListener('change', () => {
                // Recalculate when property status changes
                setTimeout(() => this.calculateRetirement(), 100);
            });
        }

        // Auto-calculate on significant input changes (debounced)
        const autoCalculateInputs = [
            'yourCurrentAge', 'retirementAge', 'yourSalary', 'yourCurrentSuper',  'partnerCurrentSuper',
            'hasInvestmentProperty', 'investmentPropertyValue', 'useGlidePath', 
            'weeklyRentalIncome', 'sellPropertyYears', 'agedCareStartAge'
        ];

        autoCalculateInputs.forEach(inputId => {
            const input = $(inputId);
            if (input) {
                const eventType = input.type === 'checkbox' ? 'change' : 'blur';
                input.addEventListener(eventType, debounce(() => {
                    this.calculateRetirement();
                }, 1000));
            }
        });

        // Real-time updates for immediate feedback
        const immediateUpdateInputs = ['riskTolerance', 'glidePathRule', 'useGlidePath'];
        immediateUpdateInputs.forEach(inputId => {
            const input = $(inputId);
            if (input) {
                input.addEventListener('input', debounce(() => {
                    const inputs = this.collectInputs();
                    this.updateRiskProfile(inputs);
                    this.updateRecommendedAllocation(inputs);
                }, 100));
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'Enter':
                        e.preventDefault();
                        this.calculateRetirement();
                        break;
                    case 'm':
                        e.preventDefault();
                        this.runMonteCarloSimulation();
                        break;
                    case 's':
                        e.preventDefault();
                        this.exportResults();
                        break;
                }
            }
        });
    }

    // Initial calculation
    performInitialCalculation() {
        // Delay initial calculation to ensure DOM is ready
        setTimeout(() => {
            this.calculateRetirement();
        }, 100);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        new RetirementCalculatorApp();
        console.log('Enhanced Australian Retirement Calculator initialized successfully');
    } catch (error) {
        console.error('Failed to initialize calculator:', error);
        document.body.innerHTML = `
            <div class="min-h-screen bg-red-50 flex items-center justify-center">
                <div class="max-w-md p-6 bg-white rounded-lg shadow-lg text-center">
                    <h1 class="text-xl font-bold text-red-600 mb-4">Initialization Error</h1>
                    <p class="text-gray-600 mb-4">The retirement calculator failed to load properly.</p>
                    <p class="text-sm text-gray-500">Please check the browser console for details and ensure all files are properly loaded.</p>
                    <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                        Reload Page
                    </button>
                </div>
            </div>
        `;
    }
});

export default RetirementCalculatorApp;