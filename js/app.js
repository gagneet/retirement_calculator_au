// js/app.js - Main Application Controller

import { ENHANCED_CONFIG } from './config.js';
import RetirementSimulator from './simulator.js';
import RecommendationEngine from './recommendation.js';
import DecisionSupportEngine from './decision-support-engine.js';
import MarketDataEngine from './market-data.js';
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
    showNotification,
    saveToLocalStorage,
    loadFromLocalStorage
} from './utils.js';

class RetirementCalculatorApp {
    constructor() {
        this.simulator = new RetirementSimulator();
        this.chartManager = new ChartManager();
        this.marketData = new MarketDataEngine();
        this.currentResults = null;
        this.isCalculating = false;

        this.initializeApp();
    }

    initializeApp() {
        this.loadSavedInputs(); // Load saved inputs first
        this.setupEventListeners();
        this.setupAutoSave(); // Setup auto-save functionality
        this.updateUIElements();
        this.performInitialCalculation();
    }

    // Input collection with complete property support
    collectInputs() {
        const config = ENHANCED_CONFIG.DEFAULTS;

        return {
            // Personal details
            yourCurrentAge: safeGetValue('yourCurrentAge', config.personal.yourCurrentAge),
            partnerCurrentAge: safeGetValue('partnerCurrentAge', config.personal.partnerCurrentAge),
            retirementAge: safeGetValue('retirementAge', config.personal.retirementAge),
            partnerRetirementAge: safeGetValue('partnerRetirementAge', config.personal.partnerRetirementAge),
            yourLifespan: safeGetValue('yourLifespan', config.personal.yourLifespan),
            partnerLifespan: safeGetValue('partnerLifespan', config.personal.partnerLifespan),

            // Risk profile
            riskTolerance: safeGetValue('riskTolerance', config.risk.riskTolerance),
            hasEmergencyFund: safeGetSelectValue('hasEmergencyFund', config.risk.hasEmergencyFund),
            hasDebt: safeGetSelectValue('hasDebt', config.risk.hasDebt),
            dependents: safeGetValue('dependents', config.risk.dependents),

            // Financial details
            yourSalary: safeGetValue('yourSalary', config.financial.yourSalary),
            partnerSalary: safeGetValue('partnerSalary', config.financial.partnerSalary),
            yourCurrentSuper: safeGetValue('yourCurrentSuper', config.financial.yourCurrentSuper),
            partnerCurrentSuper: safeGetValue('partnerCurrentSuper', config.financial.partnerCurrentSuper),
            currentSavings: safeGetValue('currentSavings', config.financial.currentSavings),
            currentStocks: safeGetValue('currentStocks', config.financial.currentStocks),
            monthlyStockContribution: safeGetValue('monthlyStockContribution', config.financial.monthlyStockContribution),
            percentIncomeSaved: safeGetValue('percentIncomeSaved', config.financial.percentIncomeSaved) / 100,

            // Property details
            homeValue: safeGetValue('homeValue', config.property.homeValue),
            mortgageBalance: safeGetValue('mortgageBalance', config.property.mortgageBalance),
            mortgageRate: safeGetValue('mortgageRate', config.property.mortgageRate) / 100,
            monthlyMortgagePayment: safeGetValue('monthlyMortgagePayment', config.property.monthlyMortgagePayment),
            planToDownsize: safeGetSelectValue('planToDownsize', 'false') === 'true',

            // Investment property
            hasInvestmentProperty: safeGetChecked('hasInvestmentProperty', config.property.hasInvestmentProperty),
            investmentPropertyValue: safeGetValue('investmentPropertyValue', config.property.investmentPropertyValue),
            investmentPropertyLoan: safeGetValue('investmentPropertyLoan', config.property.investmentPropertyLoan),
            investmentPropertyRate: safeGetValue('investmentPropertyRate', config.property.investmentPropertyRate) / 100,
            weeklyRentalIncome: safeGetValue('weeklyRentalIncome', config.property.weeklyRentalIncome),
            annualPropertyExpenses: safeGetValue('annualPropertyExpenses', config.property.annualPropertyExpenses),
            propertyGrowthRate: safeGetValue('propertyGrowthRate', config.property.propertyGrowthRate),
            sellPropertyYears: safeGetValue('sellPropertyYears', config.property.sellPropertyYears),
            capitalGainsTaxRate: safeGetValue('capitalGainsTaxRate', config.property.capitalGainsTaxRate),

            // Healthcare & aged care
            currentHealthcareCosts: safeGetValue('currentHealthcareCosts', config.healthcare.currentHealthcareCosts),
            healthcareInflation: safeGetValue('healthcareInflation', config.healthcare.healthcareInflation),
            agedCareProbability: safeGetValue('agedCareProbability', config.healthcare.agedCareProbability),
            agedCareStartAge: safeGetValue('agedCareStartAge', config.healthcare.agedCareStartAge),
            agedCareDuration: safeGetValue('agedCareDuration', config.healthcare.agedCareDuration),
            agedCareAnnualCost: safeGetValue('agedCareAnnualCost', config.healthcare.agedCareAnnualCost),

            // Economic assumptions
            inflation: safeGetValue('inflation', config.economic.inflation) / 100,
            investmentReturn: safeGetValue('investmentReturn', config.economic.investmentReturn) / 100,
            returnDeclineRate: safeGetValue('returnDeclineRate', config.economic.returnDeclineRate),
            savingsReturn: safeGetValue('savingsReturn', config.economic.savingsReturn) / 100,
            superReturn: safeGetValue('superReturn', config.economic.superReturn) / 100,
            superContributionRate: ENHANCED_CONFIG.SUPER_GUARANTEE_RATE,
            salaryGrowthRate: safeGetValue('salaryGrowthRate', config.economic.salaryGrowthRate),
            leanYearsStart: safeGetValue('leanYearsStart', config.economic.leanYearsStart),
            leanYearsReduction: safeGetValue('leanYearsReduction', config.economic.leanYearsReduction),

            // Dynamic allocation
            useGlidePath: safeGetChecked('useGlidePath', config.allocation.useGlidePath),
            glidePathRule: safeGetSelectValue('glidePathRule', config.allocation.glidePathRule),
            frankingCreditBenefit: safeGetValue('frankingCreditBenefit', config.allocation.frankingCreditBenefit),
            australianEquityAllocation: safeGetValue('australianEquityAllocation', config.allocation.australianEquityAllocation),
            dividendYield: safeGetValue('dividendYield', config.allocation.dividendYield),
            frankingRate: safeGetValue('frankingRate', config.allocation.frankingRate),
            allocEquities: safeGetValue('allocEquities', config.allocation.allocEquities),
            allocBonds: safeGetValue('allocBonds', config.allocation.allocBonds),
            allocCash: safeGetValue('allocCash', config.allocation.allocCash),

            // Pension system
            asfaComfortable: safeGetValue('asfaComfortable', config.pension.asfaComfortable),
            agePensionMax: safeGetValue('agePensionMax', config.pension.agePensionMax),
            pensionAssetThreshold: safeGetValue('pensionAssetThreshold', config.pension.pensionAssetThreshold),
            pensionAssetLimit: safeGetValue('pensionAssetLimit', config.pension.pensionAssetLimit),
            pensionIncomeThreshold: safeGetValue('pensionIncomeThreshold', config.pension.pensionIncomeThreshold),

            // Simulation controls
            returnVolatility: safeGetValue('returnVolatility', config.simulation.returnVolatility) / 100,
            enableShocks: safeGetChecked('enableShocks', config.simulation.enableShocks),
            shockProbability: safeGetValue('shockProbability', config.simulation.shockProbability) / 100,
            shockMagnitude: safeGetValue('shockMagnitude', config.simulation.shockMagnitude) / 100,
            numRuns: safeGetValue('numRuns', config.simulation.numRuns)
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
    async calculateRetirement(shouldScrollToResults = true) {
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

            // Show summary tab and conditionally scroll to results
            if (shouldScrollToResults) {
                showTab('summary', true);
                showNotification('Calculation completed successfully', 'success');
            } else {
                // For initial load, just switch tabs without scrolling or notification
                showTab('summary', false);
            }

        } catch (error) {
            console.error('Calculation error:', error);
            if (shouldScrollToResults) {
                showNotification('Error in calculation: ' + error.message, 'error');
            }
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
                    <div class="mt-1">Assets projected to be depleted before the end of subject's lifespan</div>
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

        // Get inputs for lifespan information
        const inputs = this.collectInputs();

        result.yearlyData.slice(0, 30).forEach(data => {
            if (data.depleted) {
                projectionTable.innerHTML += `
                    <tr class="bg-red-100">
                        <td colspan="11" class="px-4 py-2 text-center font-bold">
                            Financial assets depleted in ${data.year}
                        </td>
                    </tr>
                `;
                return;
            }

            // Format age display as "YourAge/PartnerAge" with '-' for deceased
            let ageDisplay = data.age;
            if (data.partnerAge !== undefined) {
                const yourAgeStr = data.yourAge > inputs.yourLifespan ? '-' : data.yourAge;
                const partnerAgeStr = data.partnerAge > inputs.partnerLifespan ? '-' : data.partnerAge;
                ageDisplay = `${yourAgeStr}/${partnerAgeStr}`;
            }

            projectionTable.innerHTML += `
                <tr>
                    <td class="px-4 py-2">${data.year}</td>
                    <td class="px-4 py-2">${ageDisplay}</td>
                    <td class="px-4 py-2 text-blue-600">${formatCurrency(data.startBalance)}</td>
                    <td class="px-4 py-2 text-gray-600">${formatCurrency(data.nonLiquidAssets || 0)}</td>
                    <td class="px-4 py-2 text-green-600">+${formatCurrency(data.growth || 0)}</td>
                    <td class="px-4 py-2 text-red-600">-${formatCurrency(data.withdrawal || 0)}</td>
                    <td class="px-4 py-2 text-blue-600">+${formatCurrency(data.propertyIncome || 0)}</td>
                    <td class="px-4 py-2 text-red-600">-${formatCurrency(data.healthcareCost)}</td>
                    <td class="px-4 py-2 text-red-600">-${formatCurrency(data.agedCareCost)}</td>
                    <td class="px-4 py-2 font-semibold">${formatCurrency(data.endBalance)}</td>
                    <td class="px-4 py-2 font-semibold text-purple-600">${formatCurrency((data.endBalance || 0) + (data.nonLiquidAssets || 0))}</td>
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
                    <p class="text-gray-600">No investment property is included in the analysis</p>
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
                    <div class="flex justify-between text-green-600">
                        <span>Depreciation Benefit:</span>
                        <span class="font-medium">+${formatCurrency(currentCashFlow.depreciation || 0)}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-xs text-gray-500">Outstanding Loan:</span>
                        <span class="text-xs text-gray-500">${formatCurrency(currentCashFlow.loanBalance || 0)}</span>
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
                <h3 class="font-semibold mb-3">Keep versus Sell Analysis</h3>
                <div class="space-y-3 text-sm">
                    <div class="p-3 bg-white rounded">
                        <div class="font-medium">Keep Property Strategy:</div>
                        <div class="mt-1">Total return: ${formatPercent(keepVsSellAnalysis.keepTotalReturn)}</div>
                        <div>${inputs.sellPropertyYears === 0 ? 'Annual' : 'Total'} net income contribution: ${formatCurrency(keepVsSellAnalysis.keepNetIncome)}</div>
                    </div>
                    ${inputs.sellPropertyYears > 0 ? `
                    <div class="p-3 bg-white rounded">
                        <div class="font-medium">Sell in ${inputs.sellPropertyYears} years:</div>
                        <div class="mt-1">Net proceeds: ${formatCurrency(keepVsSellAnalysis.sellNetProceeds)}</div>
                        <div>Portfolio investment return: ${formatPercent(keepVsSellAnalysis.sellInvestmentReturn)}</div>
                    </div>` : ''}
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
                    <h3 class="font-semibold mb-3">Risk Profile Summary
                        <span class="text-xs text-gray-600 ml-2 cursor-help" title="Your comprehensive risk assessment based on financial capacity, emotional tolerance, and return requirements">ℹ️</span>
                    </h3>
                    <div class="space-y-3">
                        <div>
                            <div class="flex justify-between mb-1">
                                <span class="text-sm cursor-help" title="Your financial ability to take risk based on income, assets, emergency funds, and time horizon. Higher capacity means you can financially afford more risk.">Risk Capacity 💰</span>
                                <span class="text-sm font-medium">${capacity}%</span>
                            </div>
                            <div class="risk-meter">
                                <div class="risk-indicator" style="left: ${capacity}%"></div>
                            </div>
                            <div class="text-xs text-gray-600 mt-1">
                                ${capacity < 40 ? 'Conservative - Limited ability to take risk' :
            capacity < 70 ? 'Moderate - Balanced risk capacity' :
                'High - Strong ability to handle risk'}
                            </div>
                        </div>
                        <div>
                            <div class="flex justify-between mb-1">
                                <span class="text-sm cursor-help" title="Your emotional comfort level with market volatility and potential losses. This reflects how you feel about risk, not your financial capacity.">Risk Tolerance 🎯</span>
                                <span class="text-sm font-medium">${tolerance}%</span>
                            </div>
                            <div class="risk-meter">
                                <div class="risk-indicator" style="left: ${tolerance}%"></div>
                            </div>
                            <div class="text-xs text-gray-600 mt-1">
                                ${tolerance < 40 ? 'Conservative investor - Prefers stability' :
            tolerance < 70 ? 'Moderate investor - Balanced approach' :
                'Aggressive investor - Comfortable with volatility'}
                            </div>
                        </div>
                        <div>
                            <div class="flex justify-between mb-1">
                                <span class="text-sm cursor-help" title="The level of investment risk you need to take to achieve your retirement goals. Higher requirement means you need higher returns to succeed.">Risk Requirement 🎲</span>
                                <span class="text-sm font-medium">${requirement}%</span>
                            </div>
                            <div class="risk-meter">
                                <div class="risk-indicator" style="left: ${requirement}%"></div>
                            </div>
                            <div class="text-xs text-gray-600 mt-1">
                                ${requirement < 40 ? 'Low risk needed - Goals achievable with conservative investments' :
            requirement < 70 ? 'Moderate risk needed - Balanced portfolio suggested' :
                'High risk needed - Aggressive growth required for goals'}
                            </div>
                        </div>
                    </div>
                    <div class="mt-4 p-3 bg-white rounded border">
                        <h4 class="font-medium text-sm mb-2">Risk Alignment Assessment:</h4>
                        <div class="text-xs text-gray-700">
                            ${Math.abs(capacity - tolerance) < 20 && Math.abs(capacity - requirement) < 20 ?
            '✅ <strong>Well Aligned:</strong> Your capacity, tolerance, and requirement are well matched. This suggests a suitable investment approach.' :
            '⚠️ <strong>Misalignment Detected:</strong> Significant differences between your risk metrics may require portfolio adjustments or goal modification.'}
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

        // Comprehensive analysis using proper cash flow calculations
        const yearsToSell = inputs.sellPropertyYears;
        const currentValue = inputs.investmentPropertyValue;

        // Use the simulator's proper property cash flow calculation
        const propertyCashFlow = this.simulator.calculatePropertyCashFlow(inputs, 0);
        const annualNetIncome = propertyCashFlow ? propertyCashFlow.netCashFlow : 0;

        // Handle keeping property indefinitely (sellPropertyYears = 0)
        if (yearsToSell === 0) {
            // When keeping indefinitely, show annual income contribution and long-term growth
            const longTermYears = 30; // Use 30 years for long-term projection
            const futureValue = currentValue * Math.pow(1 + inputs.propertyGrowthRate / 100, longTermYears);
            const totalNetIncome = annualNetIncome * longTermYears;

            return {
                keepTotalReturn: (totalNetIncome + (futureValue - currentValue)) / currentValue,
                keepNetIncome: annualNetIncome, // Show annual contribution when keeping indefinitely
                sellNetProceeds: 0, // Not selling
                sellInvestmentReturn: 0,
                recommendation: annualNetIncome > 0 ?
                    'Keeping property - generating positive cash flow' :
                    'Property has negative cash flow - consider selling'
            };
        }

        // Original logic for when selling in specific years
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

        const keepNetIncome = annualNetIncome * yearsToSell;

        return {
            keepTotalReturn: (keepNetIncome + (futureValue - currentValue)) / currentValue,
            keepNetIncome,
            sellNetProceeds,
            sellInvestmentReturn: this.calculatePortfolioReturn(inputs, yearsToSell),
            recommendation: sellNetProceeds > (keepNetIncome + currentValue) ?
                'Consider selling - higher returns from portfolio investment' :
                'Consider keeping - property provides better total return'
        };
    }

    // Calculate expected portfolio return for the property analysis
    calculatePortfolioReturn(inputs, yearsToSell) {
        // Get current allocation based on user's settings
        let allocation;
        const currentAge = inputs.yourCurrentAge;

        if (inputs.useGlidePath) {
            allocation = this.simulator.calculateDynamicAllocation(currentAge, inputs.glidePathRule);
        } else {
            allocation = {
                equity: inputs.allocEquities || 60,
                bonds: inputs.allocBonds || 30,
                cash: inputs.allocCash || 10
            };
        }

        // Calculate portfolio return using the same logic as the main simulation
        const baseReturn = this.simulator.calculateEnhancedReturn(
            allocation,
            inputs.investmentReturn,
            inputs
        );

        // Apply return decline if configured (average over the years to sell)
        let averageReturn = 0;
        for (let year = 1; year <= yearsToSell; year++) {
            const returnForYear = this.simulator.getReturnForYear(
                baseReturn,
                year,
                inputs.returnDeclineRate || 0
            );
            averageReturn += returnForYear;
        }

        return yearsToSell > 0 ? averageReturn / yearsToSell : baseReturn;
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

    // Enhanced Comprehensive Decision Support Engine
    async runRecommendationEngine() {
        if (this.isCalculating) return;
        this.isCalculating = true;

        try {
            const inputs = this.collectInputs();

            updateProgress(10, 'Initializing Comprehensive Decision Support Engine...');
            await new Promise(resolve => setTimeout(resolve, 0));

            // Use the new comprehensive decision support engine
            const decisionEngine = new DecisionSupportEngine(this.simulator, inputs);

            // This is a long process, so provide detailed feedback
            updateProgress(20, 'Analyzing market conditions and property cycles...');
            updateProgress(30, 'Running baseline Monte Carlo simulation...');
            updateProgress(40, 'Evaluating home ownership strategies...');
            updateProgress(50, 'Analyzing investment property timing...');
            updateProgress(60, 'Optimizing stock and share strategies...');
            updateProgress(70, 'Evaluating trust structures and tax benefits...');
            updateProgress(80, 'Analyzing superannuation optimization...');

            const comprehensiveRecommendations = await decisionEngine.generateComprehensiveRecommendations();

            updateProgress(90, 'Formatting comprehensive recommendations...');
            this.displayComprehensiveRecommendations(comprehensiveRecommendations);

            showTab('recommendations', true);
            updateProgress(100, 'Comprehensive AI Recommendations Generated!');
            showNotification('Successfully generated comprehensive AI recommendations covering all 8 strategic areas.', 'success');

        } catch (error) {
            console.error('Comprehensive Recommendation Engine error:', error);
            showNotification('Error generating comprehensive recommendations: ' + error.message, 'error');

            // Fallback to basic recommendations if comprehensive fails
            try {
                updateProgress(50, 'Falling back to basic recommendations...');
                const basicEngine = new RecommendationEngine(this.simulator, this.collectInputs());
                const basicRecommendations = await basicEngine.generateRecommendations();
                this.displayRecommendations(basicRecommendations);
                showTab('recommendations', true);
                showNotification('Generated basic recommendations (comprehensive engine had issues)', 'warning');
            } catch (fallbackError) {
                console.error('Fallback recommendation engine also failed:', fallbackError);
                showNotification('Both comprehensive and basic recommendation engines failed', 'error');
            }
        } finally {
            this.isCalculating = false;
            updateProgress(0);
        }
    }

    displayRecommendations(recommendations) {
        const container = $('recommendationsContainer');
        if (!container) return;

        if (recommendations.length === 0) {
            container.innerHTML = `
                <div class="p-4 bg-green-50 text-green-800 rounded-lg">
                    <h3 class="font-semibold">Your Plan Looks Solid!</h3>
                    <p>Our analysis did not identify any high-impact strategies that would significantly improve your current plan. This suggests you are on a good track. You can still explore alternative scenarios manually in the 'Scenario Compare' tab.</p>
                </div>
            `;
            return;
        }

        const impactColors = {
            'high-positive': 'border-green-500 bg-green-50',
            'positive': 'border-blue-500 bg-blue-50',
            'neutral': 'border-gray-300 bg-gray-50',
            'negative': 'border-yellow-500 bg-yellow-50',
            'high-negative': 'border-red-500 bg-red-50'
        };

        container.innerHTML = recommendations.map(rec => `
            <div class="recommendation-card p-4 rounded-lg border-l-4 ${impactColors[rec.impact]}">
                <div class="flex justify-between items-start">
                    <div>
                        <span class="text-xs font-semibold uppercase text-gray-500">${rec.category}</span>
                        <h4 class="font-bold text-lg text-gray-800">${rec.title}</h4>
                    </div>
                    <div class="text-right">
                        <div class="font-semibold text-sm ${rec.successRateDiff > 0 ? 'text-green-600' : 'text-red-600'}">
                            ${rec.successRateDiff > 0 ? '+' : ''}${formatPercent(rec.successRateDiff, 1)} Success Rate
                        </div>
                        <div class="text-xs text-gray-600">New Rate: ${formatPercent(rec.successRate)}</div>
                    </div>
                </div>
                <p class="mt-2 text-sm text-gray-700">${rec.summary}</p>
                <div class="mt-2 text-right text-xs text-gray-600">
                    Median Balance Change: 
                    <span class="font-medium ${rec.medianBalanceDiff > 0 ? 'text-green-600' : 'text-red-600'}">
                        ${rec.medianBalanceDiff > 0 ? '+' : ''}${formatCurrency(rec.medianBalanceDiff)}
                    </span>
                </div>
            </div>
        `).join('');
    }

    // Display comprehensive recommendations with enhanced categorization
    displayComprehensiveRecommendations(recommendations) {
        const container = $('recommendationsContainer');
        if (!container) return;

        if (recommendations.length === 0) {
            container.innerHTML = `
                <div class="p-4 bg-green-50 text-green-800 rounded-lg">
                    <h3 class="font-semibold">Your Comprehensive Plan Analysis Complete!</h3>
                    <p>Our comprehensive analysis across all 8 strategic areas suggests your current plan is well-optimized. You can explore specific scenarios manually in the 'Scenario Compare' tab.</p>
                </div>
            `;
            return;
        }

        // Group recommendations by category
        const groupedRecs = recommendations.reduce((acc, rec) => {
            if (!acc[rec.category]) {
                acc[rec.category] = [];
            }
            acc[rec.category].push(rec);
            return acc;
        }, {});

        const priorityColors = {
            'high': 'border-red-500 bg-red-50',
            'medium': 'border-yellow-500 bg-yellow-50',
            'low': 'border-blue-500 bg-blue-50'
        };

        const categoryIcons = {
            'Home Ownership': '🏠',
            'Investment Property': '🏢',
            'Stocks & Shares': '📈',
            'Trust Structures': '🏛️',
            'Early Retirement': '🏖️',
            'Investment Optimization': '💰',
            'Superannuation Strategy': '🛡️',
            'Healthcare Planning': '🏥',
            'Insurance Strategy': '☂️',
            'Estate Planning': '📋',
            'Age Pension Strategy': '🏛️',
            'Geographic Strategy': '🗺️'
        };

        let html = `
            <div class="mb-6 p-4 bg-blue-50 text-blue-900 rounded-lg">
                <h2 class="text-xl font-bold mb-2">🎯 Comprehensive Retirement Strategy Analysis</h2>
                <p class="text-sm">Generated ${recommendations.length} recommendations across ${Object.keys(groupedRecs).length} strategic areas. Recommendations are ordered by priority and confidence.</p>
            </div>
        `;

        // Display each category
        Object.entries(groupedRecs).forEach(([category, recs]) => {
            const icon = categoryIcons[category] || '📊';

            html += `
                <div class="mb-6">
                    <h3 class="text-lg font-semibold mb-3 text-gray-800">${icon} ${category}</h3>
                    <div class="space-y-3">
            `;

            recs.forEach(rec => {
                const priorityColor = priorityColors[rec.priority] || 'border-gray-300 bg-gray-50';
                const confidenceBadge = rec.confidence ?
                    `<span class="text-xs px-2 py-1 rounded-full ${rec.confidence > 0.8 ? 'bg-green-100 text-green-800' : rec.confidence > 0.6 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'}">
                        ${Math.round(rec.confidence * 100)}% confidence
                    </span>` : '';

                html += `
                    <div class="recommendation-card p-4 rounded-lg border-l-4 ${priorityColor}">
                        <div class="flex justify-between items-start mb-2">
                            <div class="flex-1">
                                <div class="flex items-center gap-2 mb-1">
                                    <span class="text-xs font-semibold uppercase px-2 py-1 rounded ${rec.priority === 'high' ? 'bg-red-100 text-red-700' : rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}">${rec.priority} priority</span>
                                    ${confidenceBadge}
                                </div>
                                <h4 class="font-bold text-base text-gray-800">${rec.action || rec.title}</h4>
                            </div>
                        </div>

                        <div class="mb-3">
                            <p class="text-sm text-gray-700 mb-2">${rec.recommendation || rec.summary}</p>
                            ${rec.timing ? `<p class="text-xs text-blue-600"><strong>Timing:</strong> ${rec.timing}</p>` : ''}
                            ${rec.expectedBenefit ? `<p class="text-xs text-green-600"><strong>Expected Benefit:</strong> ${rec.expectedBenefit}</p>` : ''}
                            ${rec.considerations ? `<p class="text-xs text-amber-600"><strong>Considerations:</strong> ${rec.considerations}</p>` : ''}
                        </div>

                        ${rec.successRate !== undefined ? `
                            <div class="flex justify-between text-xs text-gray-600 pt-2 border-t border-gray-200">
                                <span>Success Rate: <strong>${formatPercent(rec.successRate)}</strong></span>
                                ${rec.medianBalance ? `<span>Projected Balance: <strong>${formatCurrency(rec.medianBalance)}</strong></span>` : ''}
                            </div>
                        ` : ''}

                        ${rec.additionalBenefits ? `
                            <div class="mt-2 text-xs text-gray-600">
                                <strong>Additional Benefits:</strong> ${rec.additionalBenefits}
                            </div>
                        ` : ''}

                        ${rec.strategies && rec.strategies.length > 0 ? `
                            <div class="mt-2">
                                <strong class="text-xs text-gray-700">Strategies:</strong>
                                <ul class="text-xs text-gray-600 ml-4 mt-1">
                                    ${rec.strategies.map(strategy => `<li>• ${strategy}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                    </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        });

        // Add summary statistics
        const highPriorityCount = recommendations.filter(r => r.priority === 'high').length;
        const mediumPriorityCount = recommendations.filter(r => r.priority === 'medium').length;
        const avgConfidence = recommendations.filter(r => r.confidence).reduce((sum, r) => sum + r.confidence, 0) / recommendations.filter(r => r.confidence).length;

        html += `
            <div class="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 class="font-semibold text-gray-800 mb-2">📊 Analysis Summary</h3>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div class="text-center">
                        <div class="font-bold text-red-600">${highPriorityCount}</div>
                        <div class="text-gray-600">High Priority</div>
                    </div>
                    <div class="text-center">
                        <div class="font-bold text-yellow-600">${mediumPriorityCount}</div>
                        <div class="text-gray-600">Medium Priority</div>
                    </div>
                    <div class="text-center">
                        <div class="font-bold text-blue-600">${Object.keys(groupedRecs).length}</div>
                        <div class="text-gray-600">Categories</div>
                    </div>
                    <div class="text-center">
                        <div class="font-bold text-green-600">${Math.round(avgConfidence * 100)}%</div>
                        <div class="text-gray-600">Avg Confidence</div>
                    </div>
                </div>
                <p class="text-xs text-gray-600 mt-2">
                    🔍 Focus on high-priority recommendations first. Each recommendation includes confidence levels based on historical data and market analysis.
                </p>
            </div>
        `;

        container.innerHTML = html;
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

            // Switch to the 'charts' tab
            showTab('charts', true);

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
            showTab('riskAnalysis', true);

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

    // Retirement age solver
    async runRetirementSolver() {
        if (this.isCalculating) return;
        this.isCalculating = true;

        try {
            const inputs = this.collectInputs();

            updateProgress(10, 'Analyzing retirement scenarios...');

            // Run the retirement age solver
            const solverResult = await this.simulator.solveRetirementAge(inputs, 0.7); // 70% success rate target

            if (solverResult.success) {
                // Display results
                safeSetText('earliestRetirementAge', solverResult.earliestRetirementAge);
                safeSetText('yearsToWork', solverResult.yearsToWork);
                safeSetText('retirementSuccessRate', formatPercent(solverResult.successRate));
                safeSetText('retirementProjectedBalance', formatCurrency(solverResult.deterministicProjection.totalFinancialAssets));
                safeSetText('retirementMedianBalance', formatCurrency(solverResult.medianBalance));

                // Show results section
                const resultsSection = $('retirementSolverResults');
                if (resultsSection) {
                    resultsSection.classList.remove('hidden');
                }

                // Switch to optimization tab
                showTab('optimization', true);

                showNotification(`You can retire at age ${solverResult.earliestRetirementAge} with ${(solverResult.successRate * 100).toFixed(0)}% confidence!`, 'success');
            } else {
                showNotification(solverResult.message, 'error');
            }

            updateProgress(100, 'Analysis complete!');

        } catch (error) {
            console.error('Retirement solver error:', error);
            showNotification('Error in retirement analysis: ' + error.message, 'error');
        } finally {
            this.isCalculating = false;
            updateProgress(0);
        }
    }

    // Scenario comparison functionality
    initializeScenarioComparison() {
        const inputs = this.collectInputs();
        const availableScenarios = this.simulator.getCommonScenarios(inputs);

        this.populateScenarioCheckboxes(availableScenarios);
        showTab('scenarios', true);
    }

    populateScenarioCheckboxes(scenarios) {
        const container = $('scenarioCheckboxes');
        if (!container) return;

        container.innerHTML = scenarios.map((scenario, index) => `
            <div class="flex items-start p-3 border rounded-lg hover:bg-gray-50">
                <input type="checkbox"
                       id="scenario-${index}"
                       value="${index}"
                       class="mt-1 mr-3 h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                       ${index === 0 ? 'checked' : ''}>
                <div class="flex-1">
                    <label for="scenario-${index}" class="font-medium text-gray-900 cursor-pointer">
                        ${scenario.name}
                    </label>
                    <p class="text-sm text-gray-600 mt-1">${scenario.description}</p>
                </div>
            </div>
        `).join('');
    }

    toggleAllScenarios(checked) {
        const checkboxes = document.querySelectorAll('#scenarioCheckboxes input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = checked;
        });
    }

    async runScenarioComparison() {
        if (this.isCalculating) return;
        this.isCalculating = true;

        try {
            const inputs = this.collectInputs();
            const availableScenarios = this.simulator.getCommonScenarios(inputs);

            // Get selected scenarios
            const selectedIndices = Array.from(document.querySelectorAll('#scenarioCheckboxes input[type="checkbox"]:checked'))
                .map(checkbox => parseInt(checkbox.value));

            if (selectedIndices.length < 2) {
                showNotification('Please select at least 2 scenarios to compare', 'error');
                return;
            }

            const selectedScenarios = selectedIndices.map(index => availableScenarios[index]);

            updateProgress(10, 'Initializing scenario comparison...');

            // Progress callback for scenario comparison
            const progressCallback = async (current, total, message) => {
                const percentage = 10 + (current / total) * 80;
                updateProgress(percentage, message);
                await new Promise(resolve => setTimeout(resolve, 100));
            };

            const results = await this.simulator.runScenarioComparison(inputs, selectedScenarios, progressCallback);

            // Display results
            this.displayScenarioComparisonResults(results);

            updateProgress(100, 'Scenario comparison complete!');
            showNotification(`Successfully compared ${selectedScenarios.length} scenarios`, 'success');

        } catch (error) {
            console.error('Scenario comparison error:', error);
            showNotification('Error in scenario comparison: ' + error.message, 'error');
        } finally {
            this.isCalculating = false;
            updateProgress(0);
        }
    }

    displayScenarioComparisonResults(results) {
        const resultsContainer = $('scenarioComparisonResults');
        if (!resultsContainer) return;

        // Show results container
        resultsContainer.classList.remove('hidden');

        // Populate summary cards
        this.populateScenarioSummaryCards(results.scenarios);

        // Populate comparison table
        this.populateScenarioComparisonTable(results.scenarios);

        // Create comparison chart
        this.createScenarioComparisonChart(results.scenarios);
    }

    populateScenarioSummaryCards(scenarios) {
        const container = $('scenarioSummaryCards');
        if (!container) return;

        // Find best and worst scenarios
        const bestSuccess = scenarios.reduce((best, scenario) =>
            scenario.successRate > best.successRate ? scenario : best);
        const bestBalance = scenarios.reduce((best, scenario) =>
            scenario.medianBalance > best.medianBalance ? scenario : best);
        const worstScenario = scenarios.reduce((worst, scenario) =>
            scenario.successRate < worst.successRate ? scenario : worst);

        container.innerHTML = `
            <div class="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 class="font-semibold text-green-900">Best Success Rate</h4>
                <div class="text-2xl font-bold text-green-700">${formatPercent(bestSuccess.successRate)}</div>
                <div class="text-sm text-green-600">${bestSuccess.name}</div>
            </div>
            <div class="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 class="font-semibold text-blue-900">Highest Balance</h4>
                <div class="text-2xl font-bold text-blue-700">${formatCurrency(bestBalance.medianBalance)}</div>
                <div class="text-sm text-blue-600">${bestBalance.name}</div>
            </div>
            <div class="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <h4 class="font-semibold text-yellow-900">Riskiest Option</h4>
                <div class="text-2xl font-bold text-yellow-700">${formatPercent(worstScenario.successRate)}</div>
                <div class="text-sm text-yellow-600">${worstScenario.name}</div>
            </div>
        `;
    }

    populateScenarioComparisonTable(scenarios) {
        const tableBody = $('scenarioComparisonTable');
        if (!tableBody) return;

        tableBody.innerHTML = scenarios.map((scenario, index) => {
            const riskScore = this.simulator.calculateRiskAdjustedScore(scenario);
            const recommendation = index === 0 ? 'Baseline' :
                this.simulator.generateScenarioRecommendation(scenario, scenarios[0]);

            return `
                <tr class="${index === 0 ? 'bg-blue-50' : 'hover:bg-gray-50'}">
                    <td class="px-4 py-3 font-medium text-gray-900">
                        ${scenario.name}
                        ${index === 0 ? '<span class="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Baseline</span>' : ''}
                    </td>
                    <td class="px-4 py-3 text-center">
                        <span class="font-semibold ${scenario.successRate >= 0.7 ? 'text-green-600' : 'text-red-600'}">
                            ${formatPercent(scenario.successRate)}
                        </span>
                    </td>
                    <td class="px-4 py-3 text-center font-semibold">
                        ${formatCurrency(scenario.medianBalance)}
                    </td>
                    <td class="px-4 py-3 text-center">
                        <span class="px-2 py-1 rounded text-xs font-medium ${
                riskScore >= 70 ? 'bg-green-100 text-green-800' :
                    riskScore >= 50 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
            }">
                            ${riskScore.toFixed(0)}
                        </span>
                    </td>
                    <td class="px-4 py-3 text-center text-sm ${
                recommendation.includes('Strongly recommended') ? 'text-green-600 font-semibold' :
                    recommendation.includes('Recommended') ? 'text-blue-600' :
                        recommendation.includes('Not recommended') ? 'text-red-600' :
                            'text-gray-600'
            }">
                        ${recommendation}
                    </td>
                </tr>
            `;
        }).join('');
    }

    createScenarioComparisonChart(scenarios) {
        this.chartManager.destroyChart('scenarioComparisonChart');

        const canvas = $('scenarioComparisonChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        this.chartManager.charts.scenarioComparisonChart = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: scenarios.map((scenario, index) => ({
                    label: scenario.name,
                    data: [{
                        x: scenario.successRate * 100,
                        y: scenario.medianBalance / 1000000
                    }],
                    backgroundColor: index === 0 ? 'rgba(59, 130, 246, 0.8)' : `hsla(${index * 40}, 70%, 50%, 0.8)`,
                    borderColor: index === 0 ? 'rgb(59, 130, 246)' : `hsla(${index * 40}, 70%, 40%, 1)`,
                    pointRadius: 8,
                    pointHoverRadius: 10
                }))
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Scenario Success Rate vs. Median Balance'
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const scenario = scenarios[context.datasetIndex];
                                return [
                                    scenario.name,
                                    `Success Rate: ${formatPercent(scenario.successRate)}`,
                                    `Median Balance: ${formatCurrency(scenario.medianBalance)}`
                                ];
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Success Rate (%)' },
                        min: 0,
                        max: 100
                    },
                    y: {
                        title: { display: true, text: 'Median Balance ($M)' },
                        min: 0,
                        ticks: {
                            callback: (value) => `$${value.toFixed(1)}M`
                        }
                    }
                }
            }
        });
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
                exportToCSV(csvData, 'enhanced-retirement-projection.csv', this.collectInputs());
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
            btnCalculate.addEventListener('click', () => this.calculateRetirement(true));
        }

        // Recommendation Engine button
        const btnGenerateRecommendations = $('btnGenerateRecommendations');
        if (btnGenerateRecommendations) {
            btnGenerateRecommendations.addEventListener('click', () => this.runRecommendationEngine());
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

        // Retirement solver button
        const btnRetirementSolver = $('btnRetirementSolver');
        if (btnRetirementSolver) {
            btnRetirementSolver.addEventListener('click', () => this.runRetirementSolver());
        }

        // Scenario comparison button
        const btnScenarioComparison = $('btnScenarioComparison');
        if (btnScenarioComparison) {
            btnScenarioComparison.addEventListener('click', () => this.initializeScenarioComparison());
        }

        // Reset to defaults button
        const btnResetDefaults = $('btnResetDefaults');
        if (btnResetDefaults) {
            btnResetDefaults.addEventListener('click', () => this.resetToDefaults());
        }

        // Scenario comparison controls
        const btnSelectAllScenarios = $('btnSelectAllScenarios');
        const btnDeselectAllScenarios = $('btnDeselectAllScenarios');
        const btnRunComparison = $('btnRunComparison');

        if (btnSelectAllScenarios) {
            btnSelectAllScenarios.addEventListener('click', () => this.toggleAllScenarios(true));
        }
        if (btnDeselectAllScenarios) {
            btnDeselectAllScenarios.addEventListener('click', () => this.toggleAllScenarios(false));
        }
        if (btnRunComparison) {
            btnRunComparison.addEventListener('click', () => this.runScenarioComparison());
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
            // Update display and tooltip on change
            riskTolerance.addEventListener('input', (e) => {
                this.updateRiskToleranceDisplay(e.target.value);
            });

            // Debounced calculation update
            riskTolerance.addEventListener('input', debounce(() => {
                const inputs = this.collectInputs();
                this.updateRiskProfile(inputs);
            }, 300));

            // Show tooltip on hover/focus
            riskTolerance.addEventListener('mouseenter', () => {
                this.showRiskToleranceTooltip();
            });
            riskTolerance.addEventListener('mouseleave', () => {
                this.hideRiskToleranceTooltip();
            });
            riskTolerance.addEventListener('focus', () => {
                this.showRiskToleranceTooltip();
            });
            riskTolerance.addEventListener('blur', () => {
                this.hideRiskToleranceTooltip();
            });

            // Initialize display
            this.updateRiskToleranceDisplay(riskTolerance.value);
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
                // Recalculate when property status changes (don't scroll for auto-updates)
                setTimeout(() => this.calculateRetirement(false), 100);
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
                    // Auto-calculations from input changes don't scroll
                    this.calculateRetirement(false);
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
                        this.calculateRetirement(true);
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
        // Don't scroll to results on initial load - just populate data silently
        setTimeout(() => {
            this.calculateRetirement(false);
        }, 100);
    }

    // Risk tolerance display methods
    updateRiskToleranceDisplay(value) {
        const riskValue = parseInt(value);
        const riskValueDisplay = $('riskToleranceValue');
        const riskDescriptionDisplay = $('riskToleranceDescription');

        if (riskValueDisplay) {
            const labels = {
                1: { text: 'Very Conservative (1)', desc: 'Minimal risk, capital preservation focus, mostly cash and bonds' },
                2: { text: 'Conservative (2)', desc: 'Low risk tolerance, steady income preferred, bond-heavy allocation' },
                3: { text: 'Cautious (3)', desc: 'Below-average risk appetite, stability over growth, defensive approach' },
                4: { text: 'Moderate-Low (4)', desc: 'Some growth acceptable with capital protection, balanced-conservative' },
                5: { text: 'Moderate (5)', desc: 'Balanced approach, equal focus on growth and stability' },
                6: { text: 'Moderate (6)', desc: 'Balanced approach with moderate risk for steady growth' },
                7: { text: 'Moderate-High (7)', desc: 'Growth-focused with tolerance for volatility, equity-tilted portfolio' },
                8: { text: 'Aggressive (8)', desc: 'High risk tolerance, long-term growth priority, equity-heavy allocation' },
                9: { text: 'Very Aggressive (9)', desc: 'Maximum growth potential, accepts high volatility, aggressive allocation' },
                10: { text: 'Extremely Aggressive (10)', desc: 'Highest risk tolerance, maximum equity exposure, volatility welcomed' }
            };

            const riskProfile = labels[riskValue] || labels[6];
            riskValueDisplay.textContent = riskProfile.text;

            if (riskDescriptionDisplay) {
                riskDescriptionDisplay.textContent = riskProfile.desc;
            }
        }
    }

    showRiskToleranceTooltip() {
        const tooltip = $('riskToleranceTooltip');
        if (tooltip) {
            tooltip.classList.remove('hidden');
        }
    }

    hideRiskToleranceTooltip() {
        const tooltip = $('riskToleranceTooltip');
        if (tooltip) {
            tooltip.classList.add('hidden');
        }
    }

    // Form persistence methods
    getAllFormInputs() {
        /**
         * Get all form input IDs that should be persisted
         */
        return [
            // Personal details
            'yourCurrentAge', 'partnerCurrentAge', 'retirementAge', 'partnerRetirementAge',
            'yourLifespan', 'partnerLifespan',

            // Risk profile
            'riskTolerance', 'hasEmergencyFund', 'hasDebt', 'dependents',

            // Finances
            'yourSalary', 'partnerSalary', 'yourCurrentSuper', 'partnerCurrentSuper',
            'currentSavings', 'currentStocks', 'monthlyStockContribution', 'percentIncomeSaved',

            // Property
            'homeValue', 'mortgageBalance', 'mortgageRate', 'monthlyMortgagePayment',
            'planToDownsize', 'hasInvestmentProperty', 'investmentPropertyValue',
            'investmentPropertyLoan', 'investmentPropertyRate', 'weeklyRentalIncome',
            'annualPropertyExpenses', 'propertyGrowthRate', 'sellPropertyYears',
            'capitalGainsTaxRate',

            // Healthcare
            'currentHealthcareCosts', 'healthcareInflation', 'agedCareProbability',
            'agedCareStartAge', 'agedCareDuration', 'agedCareAnnualCost',

            // Economic
            'inflation', 'investmentReturn', 'returnDeclineRate', 'savingsReturn',
            'superReturn', 'useGlidePath', 'glidePathRule', 'australianEquityAllocation',
            'dividendYield', 'frankingRate', 'frankingCreditBenefit',

            // Salary progression
            'salaryGrowthRate', 'leanYearsStart', 'leanYearsReduction',

            // Pension system
            'asfaComfortable', 'agePensionMax', 'pensionAssetThreshold',
            'pensionAssetLimit', 'pensionIncomeThreshold',

            // Simulation
            'numRuns', 'returnVolatility', 'enableShocks', 'shockProbability', 'shockMagnitude'
        ];
    }

    saveAllInputs() {
        /**
         * Save all form inputs to localStorage
         */
        const formData = {};
        const inputIds = this.getAllFormInputs();

        inputIds.forEach(inputId => {
            const element = $(inputId);
            if (element) {
                if (element.type === 'checkbox') {
                    formData[inputId] = element.checked;
                } else if (element.type === 'radio') {
                    if (element.checked) {
                        formData[inputId] = element.value;
                    }
                } else {
                    formData[inputId] = element.value;
                }
            }
        });

        const success = saveToLocalStorage('retirement-calculator-inputs', formData);
        if (success) {
            console.log('Form inputs saved to localStorage');
        }
        return success;
    }

    loadSavedInputs() {
        /**
         * Load previously saved inputs from localStorage
         */
        const savedData = loadFromLocalStorage('retirement-calculator-inputs', {});

        if (Object.keys(savedData).length === 0) {
            // logger.info('No saved inputs found, using defaults');
            return false;
        }

        // logger.info('Loading saved inputs from localStorage');
        let loadedCount = 0;

        Object.entries(savedData).forEach(([inputId, value]) => {
            const element = $(inputId);
            if (element && value !== undefined && value !== null) {
                if (element.type === 'checkbox') {
                    element.checked = Boolean(value);
                } else if (element.type === 'radio') {
                    if (element.value === value) {
                        element.checked = true;
                    }
                } else {
                    element.value = value;
                }
                loadedCount++;
            }
        });

        // logger.info(`Loaded ${loadedCount} saved input values`);
        return loadedCount > 0;
    }

    resetToDefaults() {
        /**
         * Reset all form inputs to their default values
         */
        const config = ENHANCED_CONFIG.DEFAULTS;
        const inputIds = this.getAllFormInputs();

        inputIds.forEach(inputId => {
            const element = $(inputId);
            if (element) {
                // Get the default value from config
                let defaultValue = this.getDefaultValue(inputId, config);

                if (element.type === 'checkbox') {
                    element.checked = Boolean(defaultValue);
                } else if (element.type === 'radio') {
                    if (element.value === defaultValue) {
                        element.checked = true;
                    }
                } else {
                    element.value = defaultValue || '';
                }
            }
        });

        // Clear localStorage
        localStorage.removeItem('retirement-calculator-inputs');

        // Update risk tolerance display
        const riskTolerance = $('riskTolerance');
        if (riskTolerance) {
            this.updateRiskToleranceDisplay(riskTolerance.value);
        }

        // Trigger a calculation update
        this.calculateRetirement(false);

        showNotification('Form reset to default values', 'success');
        // logger.info('Form inputs reset to defaults');
    }

    getDefaultValue(inputId, config) {
        /**
         * Get default value for a given input ID from config
         */
        const defaultMap = {
            // Personal details
            'yourCurrentAge': config.personal.yourCurrentAge,
            'partnerCurrentAge': config.personal.partnerCurrentAge,
            'retirementAge': config.personal.retirementAge,
            'partnerRetirementAge': config.personal.partnerRetirementAge,
            'yourLifespan': config.personal.yourLifespan,
            'partnerLifespan': config.personal.partnerLifespan,

            // Risk profile
            'riskTolerance': config.risk.riskTolerance,
            'hasEmergencyFund': config.risk.hasEmergencyFund,
            'hasDebt': config.risk.hasDebt,
            'dependents': config.risk.dependents,

            // Finances
            'yourSalary': config.financial.yourSalary,
            'partnerSalary': config.financial.partnerSalary,
            'yourCurrentSuper': config.financial.yourCurrentSuper,
            'partnerCurrentSuper': config.financial.partnerCurrentSuper,
            'currentSavings': config.financial.currentSavings,
            'currentStocks': config.financial.currentStocks,
            'monthlyStockContribution': config.financial.monthlyStockContribution,
            'percentIncomeSaved': config.financial.percentIncomeSaved,

            // Property
            'homeValue': config.property.homeValue,
            'mortgageBalance': config.property.mortgageBalance,
            'mortgageRate': config.property.mortgageRate,
            'monthlyMortgagePayment': config.property.monthlyMortgagePayment,
            'planToDownsize': config.property.planToDownsize,
            'hasInvestmentProperty': config.property.hasInvestmentProperty,
            'investmentPropertyValue': config.property.investmentPropertyValue,
            'investmentPropertyLoan': config.property.investmentPropertyLoan,
            'investmentPropertyRate': config.property.investmentPropertyRate,
            'weeklyRentalIncome': config.property.weeklyRentalIncome,
            'annualPropertyExpenses': config.property.annualPropertyExpenses,
            'propertyGrowthRate': config.property.propertyGrowthRate,
            'sellPropertyYears': config.property.sellPropertyYears,
            'capitalGainsTaxRate': config.property.capitalGainsTaxRate,

            // Additional defaults for fields that might not be in config
            'useGlidePath': true,
            'glidePathRule': '110minus',
            'enableShocks': false
        };

        return defaultMap[inputId];
    }

    setupAutoSave() {
        /**
         * Setup automatic saving of form inputs when they change
         */
        const inputIds = this.getAllFormInputs();
        const debouncedSave = debounce(() => {
            this.saveAllInputs();
        }, 1000); // Save 1 second after user stops typing

        inputIds.forEach(inputId => {
            const element = $(inputId);
            if (element) {
                const eventType = element.type === 'checkbox' || element.type === 'radio' || element.type === 'select-one' ? 'change' : 'input';
                element.addEventListener(eventType, debouncedSave);
            }
        });

        console.log('Auto-save setup completed for form inputs');
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check browser compatibility first
    const isCompatible = checkBrowserCompatibility();

    if (!isCompatible.supported) {
        showCompatibilityError(isCompatible);
        return;
    }

    try {
        window.RetirementCalculatorApp = new RetirementCalculatorApp();
        console.log('Enhanced Australian Retirement Calculator initialized successfully');
    } catch (error) {
        console.error('Failed to initialize calculator:', error);
        showDetailedError(error);
    }
});

// Browser compatibility check
function checkBrowserCompatibility() {
    const checks = {
        es6Classes: (function() {
            try {
                eval('class TestClass {}');
                return true;
            } catch (e) {
                return false;
            }
        })(),
        es6Modules: typeof Symbol !== 'undefined',
        fetch: typeof fetch !== 'undefined',
        localStorage: typeof localStorage !== 'undefined',
        promises: typeof Promise !== 'undefined',
        arrowFunctions: (function() {
            try {
                // Try to create an arrow function using the Function constructor
                return Function('return (() => true)();')() === true;
            } catch (e) {
                return false;
            }
        })()
    };

    const failed = Object.entries(checks).filter(([key, value]) => !value);

    return {
        supported: failed.length === 0,
        missing: failed.map(([key]) => key),
        userAgent: navigator.userAgent,
        isSafari: /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent),
        isMobile: /Mobi|Android/i.test(navigator.userAgent)
    };
}

// Show detailed error with diagnostics
function showDetailedError(error) {
    const compatibility = checkBrowserCompatibility();
    document.body.innerHTML = `
        <div class="min-h-screen bg-red-50 flex items-center justify-center p-4">
            <div class="max-w-lg p-6 bg-white rounded-lg shadow-lg text-center">
                <h1 class="text-xl font-bold text-red-600 mb-4">Initialization Error</h1>
                <p class="text-gray-600 mb-4">The retirement calculator failed to load properly.</p>

                <div class="text-left bg-gray-100 p-3 rounded mb-4 text-sm">
                    <strong>Error Details:</strong><br>
                    ${error.message || error}<br><br>
                    <strong>Browser:</strong> ${compatibility.userAgent}<br>
                    <strong>Safari:</strong> ${compatibility.isSafari}<br>
                    <strong>Mobile:</strong> ${compatibility.isMobile}
                </div>

                <div class="mb-4">
                    <button onclick="location.reload()" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mr-2">
                        Reload Page
                    </button>
                    <button onclick="fallbackMode()" class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                        Try Basic Mode
                    </button>
                </div>

                <p class="text-xs text-gray-500">If the issue persists, try using a different browser or updating your current browser.</p>
            </div>
        </div>
    `;
}

// Show compatibility error
function showCompatibilityError(compatibility) {
    document.body.innerHTML = `
        <div class="min-h-screen bg-yellow-50 flex items-center justify-center p-4">
            <div class="max-w-lg p-6 bg-white rounded-lg shadow-lg text-center">
                <h1 class="text-xl font-bold text-yellow-600 mb-4">Browser Compatibility Issue</h1>
                <p class="text-gray-600 mb-4">Your browser doesn't support some features required by this calculator.</p>

                <div class="text-left bg-gray-100 p-3 rounded mb-4 text-sm">
                    <strong>Missing Features:</strong><br>
                    ${compatibility.missing.join(', ')}<br><br>
                    <strong>Browser:</strong> ${compatibility.userAgent}
                </div>

                <div class="mb-4">
                    <button onclick="fallbackMode()" class="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                        Try Basic Mode
                    </button>
                </div>

                <p class="text-xs text-gray-500">Please update your browser or try using Chrome, Firefox, or Safari 14+.</p>
            </div>
        </div>
    `;
}

// Fallback mode for older browsers
// function fallbackMode() {
//     window.location.href = 'https://retirement.gagneet.com/index.html';
// }

function fallbackMode() {
    // Try local fallback first, then external
    const localFallback = './index.html';
    const externalFallback = '';

    // Check if local fallback exists
    fetch(localFallback, { method: 'HEAD' })
        .then(response => {
            if (response.ok) {
                window.location.href = localFallback;
            } else {
                window.location.href = externalFallback;
            }
        })
        .catch(() => {
            window.location.href = externalFallback;
        });
}

export default RetirementCalculatorApp;