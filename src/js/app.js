import '../css/styles.css';
// js/app.js - Main Application Controller

import { ENHANCED_CONFIG } from './config.js';
import { ENHANCED_FINANCIAL_CONFIG } from './enhanced-config.js';
import RetirementSimulator from './simulator.js';
import MarketDataEngine from './market-data.js';
import { initializeTrustUI } from './trust-ui.js';
import ThemeManager from './theme.js';
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
    exportUserData,
    importUserData,
    populateFormFromData,
    showTab,
    debounce,
    showNotification,
    saveToLocalStorage,
    loadFromLocalStorage,
    initializeTooltips,
    addTooltipBottomStyles,
    initializeCurrencyInputs,
    initializePercentageInputs
} from './utils.js';

class RetirementCalculatorApp {
    constructor() {
        this.simulator = new RetirementSimulator();
        this.chartManager = null; // Will be lazy-loaded
        this.marketData = new MarketDataEngine();
        this.themeManager = new ThemeManager();
        this.currentResults = null;
        this.isCalculating = false;

        this.initializeApp();
    }

    initializeApp() {
        this.loadSavedInputs(); // Load saved inputs first
        this.setupEventListeners();
        this.setupAutoSave(); // Setup auto-save functionality
        this.setupCashFlowUI(); // Setup cash flow validation and UI
        this.setupDependentCalculations(); // Setup enhanced dependent calculations
        this.addSuggestionStyles(); // Add CSS styles for suggestion modifications
        this.updateUIElements();
        initializeTrustUI(); // Initialize trust UI functionality

        // Initialize tooltip system
        addTooltipBottomStyles(); // Add bottom positioning styles
        initializeTooltips(); // Initialize tooltip functionality
        initializeCurrencyInputs(); // Initialize currency input formatting
        initializePercentageInputs(); // Initialize percentage input formatting

        this.performInitialCalculation();
    }

    // Input collection with complete property support
    collectInputs() {
        const config = ENHANCED_CONFIG.DEFAULTS;

        // Get raw partner values
        const partnerAgeInput = $('partnerCurrentAge');
        const partnerAgeValue = partnerAgeInput ? partnerAgeInput.value.trim() : '';
        const isPartnerAgeEmpty = partnerAgeValue === '' || partnerAgeValue === '0';

        // Get user age for partner calculations
        const userAge = safeGetValue('yourCurrentAge', config.personal.yourCurrentAge);

        // Check if any partner fields have values (excluding age)
        const partnerSalaryValue = $('partnerSalary') ? $('partnerSalary').value.trim() : '';
        const partnerSuperValue = $('partnerCurrentSuper') ? $('partnerCurrentSuper').value.trim() : '';
        const partnerRetirementValue = $('partnerRetirementAge') ? $('partnerRetirementAge').value.trim() : '';
        const partnerLifespanValue = $('partnerLifespan') ? $('partnerLifespan').value.trim() : '';

        const hasPartnerData = partnerSalaryValue !== '' || partnerSuperValue !== '' ||
                              partnerRetirementValue !== '' || partnerLifespanValue !== '';

        // Determine final partner age to use in calculations
        let finalPartnerAge = 0;
        if (!isPartnerAgeEmpty) {
            // Partner age is provided - use it
            finalPartnerAge = safeGetValue('partnerCurrentAge', 0);
        } else if (hasPartnerData) {
            // Partner age is blank but other partner data exists - use user age
            finalPartnerAge = userAge;
        }
        // If no partner age and no partner data, finalPartnerAge stays 0 (single calculation)

        return {
            // Personal details
            yourCurrentAge: userAge,
            partnerCurrentAge: finalPartnerAge,
            retirementAge: safeGetValue('retirementAge', config.personal.retirementAge),
            partnerRetirementAge: finalPartnerAge > 0 ? safeGetValue('partnerRetirementAge', config.personal.partnerRetirementAge) : 0,
            yourLifespan: safeGetValue('yourLifespan', config.personal.yourLifespan),
            partnerLifespan: finalPartnerAge > 0 ? safeGetValue('partnerLifespan', config.personal.partnerLifespan) : 0,

            // Risk profile
            riskTolerance: safeGetValue('riskTolerance', config.risk.riskTolerance),
            hasEmergencyFund: safeGetSelectValue('hasEmergencyFund', config.risk.hasEmergencyFund),
            hasDebt: safeGetSelectValue('hasDebt', config.risk.hasDebt),
            dependents: safeGetValue('dependents', config.risk.dependents),

            // Enhanced dependent details
            dependentDetails: {
                childrenUnder5: safeGetValue('childrenUnder5', 0),
                childrenUnder5Percent: safeGetValue('childrenUnder5Percent', 70),
                childrenPrimary: safeGetValue('childrenPrimary', 0),
                childrenPrimaryPercent: safeGetValue('childrenPrimaryPercent', 70),
                teenagers: safeGetValue('teenagers', 0),
                teenagersPercent: safeGetValue('teenagersPercent', 80),
                adultDisabled: safeGetValue('adultDisabled', 0),
                adultDisabledPercent: safeGetValue('adultDisabledPercent', 20),
                elderlyIndependent: safeGetValue('elderlyIndependent', 0),
                elderlyIndependentPercent: safeGetValue('elderlyIndependentPercent', 50),
                elderlyHomeCare: safeGetValue('elderlyHomeCare', 0),
                elderlyHomeCarePercent: safeGetValue('elderlyHomeCarePercent', 30),
                elderlyResidential: safeGetValue('elderlyResidential', 0),
                elderlyResidentialPercent: safeGetValue('elderlyResidentialPercent', 40),
                otherDependents: safeGetValue('otherDependents', 0),
                otherDependentsPercent: safeGetValue('otherDependentsPercent', 60)
            },

            // Financial details
            yourSalary: safeGetValue('yourSalary', config.financial.yourSalary),
            partnerSalary: finalPartnerAge > 0 ? safeGetValue('partnerSalary', 0) : 0,
            yourCurrentSuper: safeGetValue('yourCurrentSuper', config.financial.yourCurrentSuper),
            partnerCurrentSuper: finalPartnerAge > 0 ? safeGetValue('partnerCurrentSuper', 0) : 0,
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
            propertyGrowthRate: safeGetValue('propertyGrowthRate', config.property.propertyGrowthRate) / 100,
            sellPropertyYears: safeGetValue('sellPropertyYears', config.property.sellPropertyYears),
            capitalGainsTaxRate: safeGetValue('capitalGainsTaxRate', config.property.capitalGainsTaxRate) / 100,

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
            salaryGrowthRate: safeGetValue('salaryGrowthRate', config.economic.salaryGrowthRate) / 100,
            leanYearsStart: safeGetValue('leanYearsStart', config.economic.leanYearsStart),
            leanYearsReduction: safeGetValue('leanYearsReduction', config.economic.leanYearsReduction),

            // Dynamic allocation
            useGlidePath: safeGetChecked('useGlidePath', config.allocation.useGlidePath),
            glidePathRule: safeGetSelectValue('glidePathRule', config.allocation.glidePathRule),
            frankingCreditBenefit: safeGetValue('frankingCreditBenefit', config.allocation.frankingCreditBenefit),
            australianEquityAllocation: safeGetValue('australianEquityAllocation', config.allocation.australianEquityAllocation),
            dividendYield: safeGetValue('dividendYield', config.allocation.dividendYield),
            frankingRate: safeGetValue('frankingRate', config.allocation.frankingRate) / 100,
            allocEquities: safeGetValue('allocEquities', config.allocation.allocEquities),
            allocBonds: safeGetValue('allocBonds', config.allocation.allocBonds),
            allocCash: safeGetValue('allocCash', config.allocation.allocCash),

            // Pension system
            asfaComfortable: safeGetValue('asfaComfortable', config.pension.asfaComfortable),
            agePensionMax: safeGetValue('agePensionMax', config.pension.agePensionMax),
            pensionAssetThreshold: safeGetValue('pensionAssetThreshold', config.pension.pensionAssetThreshold),
            pensionAssetLimit: safeGetValue('pensionAssetLimit', config.pension.pensionAssetLimit),
            pensionIncomeThreshold: safeGetValue('pensionIncomeThreshold', config.pension.pensionIncomeThreshold),

            // Trust structure details
            hasTrustAssets: safeGetChecked('hasTrustAssets', config.trust.hasTrustAssets),
            trustType: safeGetSelectValue('trustType', config.trust.trustType),
            trustControlLevel: safeGetSelectValue('trustControlLevel', config.trust.trustControlLevel),
            trustNetAssets: safeGetValue('trustNetAssets', config.trust.trustNetAssets),
            trustAttributionPercentage: safeGetValue('trustAttributionPercentage', config.trust.trustAttributionPercentage),
            trustAnnualDistributions: safeGetValue('trustAnnualDistributions', config.trust.trustAnnualDistributions),
            homeInTrust: safeGetChecked('homeInTrust', config.trust.homeInTrust),
            investmentPropertyInTrust: safeGetChecked('investmentPropertyInTrust', config.trust.investmentPropertyInTrust),
            stocksInTrust: safeGetChecked('stocksInTrust', config.trust.stocksInTrust),

            // Simulation controls
            returnVolatility: safeGetValue('returnVolatility', config.simulation.returnVolatility) / 100,
            enableShocks: safeGetChecked('enableShocks', config.simulation.enableShocks),
            shockProbability: safeGetValue('shockProbability', config.simulation.shockProbability) / 100,
            shockMagnitude: safeGetValue('shockMagnitude', config.simulation.shockMagnitude) / 100,
            numRuns: safeGetValue('numRuns', config.simulation.numRuns),

            // Partnership status for calculations
            isSingleCalculation: finalPartnerAge === 0
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

    async getChartManager() {
        if (!this.chartManager) {
            const { default: ChartManager } = await import(/* webpackChunkName: "charts" */ './charts.js');
            this.chartManager = new ChartManager();
        }
        return this.chartManager;
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
            const chartManager = await this.getChartManager();
            chartManager.renderCompleteAnalysis(result, inputs);

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

    // Practical Risk Analysis with Visual Sliders and Actionable Recommendations
    displayRiskAnalysis(result, inputs) {
        const riskAnalysisContent = $('riskAnalysisContent');
        if (!riskAnalysisContent) return;

        // Generate comprehensive cash flow analysis with error handling
        let cashFlowAnalysis;
        try {
            cashFlowAnalysis = this.simulator.calculateCashFlowAnalysis(inputs);
            if (!cashFlowAnalysis || !cashFlowAnalysis.cashFlow) {
                throw new Error('Invalid cash flow analysis result');
            }
        } catch (error) {
            console.error('Cash flow analysis failed:', error);
            // Provide fallback data structure
            cashFlowAnalysis = {
                cashFlow: {
                    monthlyDisposable: 0,
                    status: 'unknown',
                    housingStressRatio: 0.3
                },
                expenses: { totalMonthly: 0 },
                opportunities: []
            };
        }
        const tolerance = inputs.riskTolerance * 10;
        const capacity = this.simulator.calculateRiskCapacity(inputs);

        // Pass Monte Carlo results for dynamic requirement calculation
        const monteCarloResults = this.currentMonteCarloResults || result.monteCarloResults || {};
        const requirement = this.simulator.calculateRiskRequirement(inputs, monteCarloResults);

        // Generate cash flow-aware recommendations
        const ageRecommendations = this.generateAgeBasedRecommendations(inputs, capacity, tolerance, cashFlowAnalysis);
        const diversificationSuggestions = this.generateDiversificationSuggestions(inputs, result, cashFlowAnalysis);
        const australianOpportunities = this.generateAustralianInvestmentOpportunities(inputs, monteCarloResults, cashFlowAnalysis);

        riskAnalysisContent.innerHTML = `
            <div class="space-y-6">
                <!-- Cash Flow Reality Check Section -->
                <div class="p-4 rounded-lg border ${this.getCashFlowStatusColor(cashFlowAnalysis.cashFlow.status)}">
                    <h3 class="text-lg font-semibold mb-4 text-gray-800">
                        💰 Cash Flow Reality Check
                    </h3>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div class="text-center">
                            <div class="text-xs text-gray-600">Monthly After Expenses</div>
                            <div class="text-xl font-bold ${cashFlowAnalysis.cashFlow.monthlyDisposable >= 0 ? 'text-green-600' : 'text-red-600'}">
                                ${cashFlowAnalysis.cashFlow.monthlyDisposable >= 0 ? '+' : ''}$${cashFlowAnalysis.cashFlow.monthlyDisposable.toFixed(0)}
                            </div>
                        </div>
                        <div class="text-center">
                            <div class="text-xs text-gray-600">Housing Stress Ratio</div>
                            <div class="text-lg font-bold ${cashFlowAnalysis.constraints.isHousingStressed ? 'text-red-600' : 'text-green-600'}">
                                ${cashFlowAnalysis.cashFlow.housingStressRatio.toFixed(1)}%
                            </div>
                        </div>
                        <div class="text-center">
                            <div class="text-xs text-gray-600">Max Monthly Savings</div>
                            <div class="text-lg font-bold text-blue-600">
                                $${cashFlowAnalysis.constraints.maxMonthlySavings.toFixed(0)}
                            </div>
                        </div>
                    </div>

                    <div class="text-sm text-gray-700 mb-3">
                        <strong>Status:</strong> ${cashFlowAnalysis.cashFlow.status}
                        ${cashFlowAnalysis.constraints.isHousingStressed ? ' • <span class="text-red-600 font-medium">Housing Stressed</span>' : ''}
                    </div>

                    <!-- Expense Breakdown -->
                    <details class="mb-3">
                        <summary class="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-800">
                            View Expense Breakdown ($${(cashFlowAnalysis.expenses.totalMonthly).toFixed(0)}/month)
                        </summary>
                        <div class="mt-2 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                            <div class="bg-white rounded p-2 border">
                                <div class="font-medium">Housing</div>
                                <div>$${cashFlowAnalysis.expenses.housing.monthlyTotal.toFixed(0)}</div>
                                <div class="text-gray-500">${cashFlowAnalysis.expenses.breakdown.housingDescription}</div>
                            </div>
                            <div class="bg-white rounded p-2 border">
                                <div class="font-medium">Living</div>
                                <div>$${cashFlowAnalysis.expenses.living.monthlyTotal.toFixed(0)}</div>
                                <div class="text-gray-500">${cashFlowAnalysis.expenses.breakdown.livingDescription}</div>
                            </div>
                            ${cashFlowAnalysis.expenses.dependents.monthlyTotal > 0 ? `
                                <div class="bg-white rounded p-2 border">
                                    <div class="font-medium">Dependents</div>
                                    <div>$${cashFlowAnalysis.expenses.dependents.monthlyTotal.toFixed(0)}</div>
                                    <div class="text-gray-500">${cashFlowAnalysis.expenses.breakdown.childcareDescription}</div>
                                </div>
                            ` : ''}
                            ${cashFlowAnalysis.expenses.familyExpenses.monthlyTotal > 0 ? `
                                <div class="bg-white rounded p-2 border">
                                    <div class="font-medium">Family</div>
                                    <div>$${cashFlowAnalysis.expenses.familyExpenses.monthlyTotal.toFixed(0)}</div>
                                    <div class="text-gray-500">${cashFlowAnalysis.expenses.breakdown.familyDescription}</div>
                                </div>
                            ` : ''}
                        </div>
                    </details>

                    <!-- Cash Flow Opportunities -->
                    ${cashFlowAnalysis.opportunities.length > 0 ? `
                        <div class="space-y-2">
                            ${cashFlowAnalysis.opportunities.map(opp => `
                                <div class="bg-white rounded p-3 border border-l-4 ${this.getCashFlowOpportunityColor(opp.type)}">
                                    <div class="font-medium text-sm">${opp.title}</div>
                                    <div class="text-xs text-gray-600 mt-1">${opp.description}</div>
                                    <ul class="text-xs text-gray-600 mt-2 ml-3">
                                        ${opp.suggestions.map(suggestion => `<li class="list-disc">${suggestion}</li>`).join('')}
                                    </ul>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>

                <!-- Top Section: Risk Profile and Immediate Actions -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- Risk Profile with Visual Sliders -->
                    <div class="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                        <h3 class="text-lg font-semibold mb-4 text-gray-800">
                            📊 Your Risk Profile Assessment
                        </h3>

                        <div class="space-y-4">
                            <!-- Risk Capacity Slider -->
                            <div>
                                <div class="flex justify-between mb-2">
                                    <span class="text-sm font-medium cursor-help" title="Your financial ability to take risk based on income, assets, time horizon, and emergency funds">
                                        💰 Risk Capacity
                                    </span>
                                    <span class="text-sm font-bold text-blue-600">${capacity.toFixed(1)}/100</span>
                                </div>
                                <div class="risk-meter">
                                    <div class="risk-indicator" style="left: ${capacity}%"></div>
                                    <div class="risk-triangle" style="left: ${capacity}%"></div>
                                </div>
                                <div class="text-xs text-gray-600 mt-1">
                                    ${this.getRiskCapacityExplanation(capacity, inputs)}
                                </div>
                            </div>

                            <!-- Risk Tolerance Slider -->
                            <div>
                                <div class="flex justify-between mb-2">
                                    <span class="text-sm font-medium cursor-help" title="Your comfort level with market ups and downs - this is what you set in the main form">
                                        🎯 Risk Tolerance
                                    </span>
                                    <span class="text-sm font-bold text-green-600">${tolerance.toFixed(1)}/100</span>
                                </div>
                                <div class="risk-meter">
                                    <div class="risk-indicator" style="left: ${tolerance}%"></div>
                                    <div class="risk-triangle" style="left: ${tolerance}%"></div>
                                </div>
                                <div class="text-xs text-gray-600 mt-1">
                                    ${this.getRiskToleranceExplanation(tolerance)}
                                </div>
                            </div>

                            <!-- Risk Requirement Slider -->
                            <div>
                                <div class="flex justify-between mb-2">
                                    <span class="text-sm font-medium cursor-help" title="The level of risk needed to achieve your retirement goals based on your current savings and targets">
                                        🎲 Risk Requirement
                                    </span>
                                    <span class="text-sm font-bold text-red-600">${requirement.toFixed(1)}/100</span>
                                </div>
                                <div class="risk-meter">
                                    <div class="risk-indicator" style="left: ${requirement}%"></div>
                                    <div class="risk-triangle" style="left: ${requirement}%"></div>
                                </div>
                                <div class="text-xs text-gray-600 mt-1">
                                    ${this.getRiskRequirementExplanation(requirement, monteCarloResults)}
                                </div>
                            </div>
                        </div>

                        <!-- Risk Alignment Summary -->
                        <div class="mt-4 p-3 rounded border ${this.getAlignmentSummaryColor(capacity, tolerance, requirement)}">
                            <div class="font-medium text-sm mb-1">
                                ${this.getRiskAlignmentSummary(capacity, tolerance, requirement)}
                            </div>
                            <div class="text-xs">
                                ${this.getRiskAlignmentAdvice(capacity, tolerance, requirement)}
                            </div>
                        </div>
                    </div>

                    <!-- Immediate Action Items -->
                    <div class="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-200">
                        <h4 class="font-semibold mb-3 text-blue-800">
                            ⚡ Immediate Action Items
                        </h4>
                        <div class="space-y-3">
                            ${this.generateImmediateActions(capacity, tolerance, requirement, inputs, monteCarloResults).map(action => `
                                <div class="flex items-start space-x-2 text-sm">
                                    <div class="text-blue-600 mt-0.5">•</div>
                                    <div>${action}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <!-- Middle Section: Age-Based and Australian Opportunities -->
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- Age-Based Investment Recommendations -->
                    <div class="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                        <h4 class="font-semibold mb-3 text-green-800">
                            🎂 Age-Based Investment Strategy (Age ${inputs.yourCurrentAge})
                        </h4>
                        <div class="space-y-3">
                            ${ageRecommendations.map(rec => `
                                <div class="bg-white rounded p-3 border border-green-100">
                                    <div class="font-medium text-sm text-gray-800">${rec.title}</div>
                                    <div class="text-xs text-gray-600 mt-1">${rec.description}</div>
                                    <div class="text-xs text-green-600 mt-2"><strong>Suggested Action:</strong> ${rec.action}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Australian Investment Opportunities -->
                    <div class="p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                        <h4 class="font-semibold mb-3 text-orange-800">
                            🇦🇺 Australian Investment Opportunities
                        </h4>
                        <div class="space-y-3">
                            ${australianOpportunities.map(opp => `
                                <div class="bg-white rounded p-3 border border-yellow-100">
                                    <div class="font-medium text-sm text-gray-800">${opp.title}</div>
                                    <div class="text-xs text-gray-600 mt-1">${opp.description}</div>
                                    <div class="text-xs text-orange-600 mt-2"><strong>How to implement:</strong> ${opp.implementation}</div>
                                    ${opp.benefit ? `<div class="text-xs text-green-600 mt-1"><strong>Benefit:</strong> ${opp.benefit}</div>` : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <!-- Bottom Section: Diversification Suggestions (Full Width) -->
                <div class="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
                    <h4 class="font-semibold mb-3 text-purple-800">
                        🎯 Risk Reduction Through Diversification
                    </h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        ${diversificationSuggestions.map(sug => `
                            <div class="bg-white rounded p-3 border border-purple-100">
                                <div class="font-medium text-sm text-gray-800">${sug.title}</div>
                                <div class="text-xs text-gray-600 mt-1">${sug.description}</div>
                                <div class="text-xs text-purple-600 mt-2"><strong>Implementation:</strong> ${sug.implementation}</div>
                                <div class="text-xs text-blue-600 mt-1"><strong>Risk Reduction:</strong> ${sug.riskReduction}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    // Helper methods for enhanced risk display
    getRiskLabel(score) {
        if (score < 30) return 'Conservative';
        if (score < 50) return 'Moderate-Conservative';
        if (score < 70) return 'Moderate';
        if (score < 85) return 'Moderate-Aggressive';
        return 'Aggressive';
    }

    getAlignmentColorClass(alignment) {
        const classes = {
            'well-aligned': 'bg-green-50 border-green-200',
            'slightly-misaligned': 'bg-yellow-50 border-yellow-200',
            'moderately-misaligned': 'bg-orange-50 border-orange-200',
            'severely-misaligned': 'bg-red-50 border-red-200'
        };
        return classes[alignment] || 'bg-gray-50 border-gray-200';
    }

    getAlignmentIcon(alignment) {
        const icons = {
            'well-aligned': '✅',
            'slightly-misaligned': '⚠️',
            'moderately-misaligned': '🔶',
            'severely-misaligned': '❌'
        };
        return icons[alignment] || '❓';
    }

    getSeverityBadgeClass(severity) {
        const classes = {
            'low': 'bg-green-100 text-green-800',
            'medium': 'bg-yellow-100 text-yellow-800',
            'high': 'bg-red-100 text-red-800'
        };
        return classes[severity] || 'bg-gray-100 text-gray-800';
    }

    getAlignmentDescription(alignment, capacity, tolerance, requirement) {
        switch(alignment) {
            case 'well-aligned':
                return 'Your risk metrics are well-balanced, indicating a coherent investment strategy that matches your financial situation, comfort level, and goals.';
            case 'slightly-misaligned':
                return `Minor differences detected between your risk metrics (C:${capacity}%, T:${tolerance}%, R:${requirement}%). Small adjustments may optimize your approach.`;
            case 'moderately-misaligned':
                return `Significant gaps exist between your risk capacity, tolerance, and requirements. This may indicate the need for strategy adjustments or goal modifications.`;
            case 'severely-misaligned':
                return `Major misalignment detected in your risk profile. Your financial situation, comfort level, and goals may be incompatible without significant changes.`;
            default:
                return 'Risk alignment assessment completed.';
        }
    }

    generateDynamicRecommendations(capacity, tolerance, requirement, assessment, mcResults) {
        const recommendations = [];

        if (mcResults.successRate && mcResults.successRate < ENHANCED_FINANCIAL_CONFIG.riskAssessment.SUCCESS_RATE_THRESHOLDS.LOW.value) {
            recommendations.push('• Consider increasing contributions or extending retirement age to improve success probability');
        }

        if (capacity > tolerance + 20) {
            recommendations.push('• Your financial capacity suggests you could benefit from investment education to increase risk comfort');
        }

        if (requirement > Math.max(capacity, tolerance) + 15) {
            recommendations.push('• Your goals may require either more aggressive investing or extending your timeline');
        }

        if (assessment.alignment === 'well-aligned') {
            recommendations.push('• Your risk profile is well-balanced - consider regular reviews as circumstances change');
        }

        return recommendations.length > 0 ? recommendations.join('<br>') : '• Your risk profile appears well-structured for your current situation';
    }

    // Generate narrative explanations for Monte Carlo charts
    generateMonteCarloNarrative(results, inputs) {
        const successRate = results.successRate * 100;
        const runs = inputs.numRuns || results.paths?.length || 1000;
        const median = results.median;
        const p10 = results.percentile10;
        const p90 = results.percentile90;

        let narrative = `
            <div class="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-4 mb-6 border border-indigo-200">
                <h3 class="text-lg font-semibold mb-3 text-indigo-800">🎯 Understanding Your Monte Carlo Analysis</h3>
                <div class="space-y-3 text-sm text-gray-700">
                    <p class="leading-relaxed">
                        <strong>What is Monte Carlo Simulation?</strong><br>
                        Think of this as running your retirement plan ${runs.toLocaleString()} times with different market conditions.
                        Each simulation uses realistic but random investment returns based on historical market data. This shows you the range of possible outcomes for your retirement.
                    </p>

                    <div class="grid md:grid-cols-2 gap-4 mt-4">
                        <div class="bg-white rounded p-3 border">
                            <strong class="text-blue-600">Success Rate: ${successRate.toFixed(1)}%</strong>
                            <p class="mt-1 text-xs">
                                ${this.getSuccessRateExplanation(successRate)}
                            </p>
                        </div>
                        <div class="bg-white rounded p-3 border">
                            <strong class="text-green-600">Median Outcome: ${formatCurrency(median)}</strong>
                            <p class="mt-1 text-xs">
                                In half of the simulations, you end up with more than this amount. In the other half, you have less.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        return narrative;
    }

    generateFanChartExplanation(inputs) {
        return `
            <div class="bg-blue-50 rounded-lg p-3 mb-4 text-sm">
                <h4 class="font-semibold mb-2 text-blue-800">📊 How to Read the Fan Chart</h4>
                <ul class="space-y-1 text-gray-700">
                    <li><strong class="text-blue-600">Blue Line (Median):</strong> The "typical" outcome - half of simulations are above this line, half below.</li>
                    <li><strong class="text-gray-600">Blue Shaded Area:</strong> Shows the range where 80% of outcomes fall (10th to 90th percentile).</li>
                    <li><strong class="text-green-600">Green Shaded Area:</strong> Shows where 50% of outcomes fall (25th to 75th percentile) - the most likely range.</li>
                    <li><strong>What it means:</strong> The wider the fan, the more uncertainty. Narrow fans suggest more predictable outcomes.</li>
                </ul>
                <div class="mt-2 p-2 bg-blue-100 rounded text-xs">
                    💡 <strong>Pro tip:</strong> Look at age ${inputs.retirementAge + 10} to see how your portfolio might look 10 years into retirement.
                </div>
            </div>
        `;
    }

    generateHistogramExplanation(results) {
        const median = results.median;
        const success = results.successRate * 100;

        return `
            <div class="bg-purple-50 rounded-lg p-3 mb-4 text-sm">
                <h4 class="font-semibold mb-2 text-purple-800">📈 How to Read the Distribution Chart</h4>
                <div class="space-y-2 text-gray-700">
                    <p><strong>Each bar shows:</strong> How many simulations ended with that final balance range.</p>
                    <p><strong>Taller bars:</strong> More common outcomes. <strong>Shorter bars:</strong> Less likely outcomes.</p>
                    <div class="grid grid-cols-2 gap-2 mt-3">
                        <div class="bg-white rounded p-2 border">
                            <div class="font-medium text-purple-600">Peak of Distribution</div>
                            <div class="text-xs">Shows the most common final balance range</div>
                        </div>
                        <div class="bg-white rounded p-2 border">
                            <div class="font-medium text-green-600">${success.toFixed(0)}% Success Rate</div>
                            <div class="text-xs">Percentage of bars to the right of $0</div>
                        </div>
                    </div>
                </div>
                <div class="mt-2 p-2 bg-purple-100 rounded text-xs">
                    💡 <strong>What to look for:</strong> A distribution shifted right (toward positive balances) indicates a robust retirement plan.
                </div>
            </div>
        `;
    }

    getSuccessRateExplanation(successRate) {
        if (successRate >= 90) {
            return "Excellent! Your plan succeeds in almost all market scenarios. You have a very robust retirement strategy.";
        } else if (successRate >= 80) {
            return "Very good! Your plan works in most scenarios. Some minor tweaks could improve confidence.";
        } else if (successRate >= 70) {
            return "Solid foundation, but there's room for improvement. Consider increasing contributions or extending your retirement age slightly.";
        } else if (successRate >= 60) {
            return "Your plan faces some challenges in difficult market conditions. Significant adjustments may be needed.";
        } else {
            return "Your plan struggles in many scenarios. Major changes to contributions, retirement age, or expenses are likely needed.";
        }
    }

    // Enhanced helper methods for practical risk analysis
    getRiskCapacityExplanation(capacity, inputs) {
        const age = inputs.yourCurrentAge;
        const yearsToRetirement = inputs.retirementAge - age;

        if (capacity >= 80) {
            return `Strong capacity - ${yearsToRetirement} years to retirement, solid emergency funds, and good income stability give you flexibility to handle market volatility.`;
        } else if (capacity >= 60) {
            return `Good capacity - You have reasonable ability to weather market downturns, with ${yearsToRetirement} years until retirement providing recovery time.`;
        } else if (capacity >= 40) {
            return `Moderate capacity - Limited by time horizon or financial constraints. Consider building emergency funds before taking higher risks.`;
        } else {
            return `Low capacity - High debt, limited emergency funds, or short time horizon restrict your ability to handle market volatility safely.`;
        }
    }

    getRiskToleranceExplanation(tolerance) {
        if (tolerance >= 80) {
            return "High comfort with volatility - You're willing to accept significant ups and downs for potential long-term growth.";
        } else if (tolerance >= 60) {
            return "Moderate comfort - You can accept some volatility but prefer more balanced, steadier growth approaches.";
        } else if (tolerance >= 40) {
            return "Conservative preference - You prefer stability and are uncomfortable with significant portfolio swings.";
        } else {
            return "Very conservative - You prioritize capital preservation and steady returns over growth potential.";
        }
    }

    getRiskRequirementExplanation(requirement, monteCarloResults) {
        const successRate = monteCarloResults.successRate ? (monteCarloResults.successRate * 100).toFixed(0) : 'Unknown';

        if (requirement >= 80) {
            return `High growth needed - Your current savings require aggressive investing to meet retirement goals. Success rate: ${successRate}%.`;
        } else if (requirement >= 60) {
            return `Moderate growth needed - Balanced portfolio approach should work, but some risk is necessary for success.`;
        } else if (requirement >= 40) {
            return `Conservative approach viable - Your savings are on track, allowing for more stability-focused investments.`;
        } else {
            return `Low risk sufficient - You're well-positioned for retirement and can afford conservative investments.`;
        }
    }

    getAlignmentSummaryColor(capacity, tolerance, requirement) {
        const maxDiff = Math.max(Math.abs(capacity - tolerance), Math.abs(capacity - requirement), Math.abs(tolerance - requirement));

        if (maxDiff <= 15) return 'bg-green-100 border-green-300';
        if (maxDiff <= 30) return 'bg-yellow-100 border-yellow-300';
        return 'bg-red-100 border-red-300';
    }

    getRiskAlignmentSummary(capacity, tolerance, requirement) {
        const maxDiff = Math.max(Math.abs(capacity - tolerance), Math.abs(capacity - requirement), Math.abs(tolerance - requirement));

        if (maxDiff <= 15) {
            return "✅ Well Aligned - Your financial situation, comfort level, and goals work well together.";
        } else if (maxDiff <= 30) {
            return "⚠️ Some Misalignment - Minor adjustments could optimize your investment approach.";
        } else {
            return "❌ Significant Misalignment - Important changes needed to align your strategy with reality.";
        }
    }

    getRiskAlignmentAdvice(capacity, tolerance, requirement) {
        if (capacity > tolerance + 20) {
            return "Your financial capacity suggests you could take more risk than you're comfortable with. Consider investment education to increase confidence.";
        } else if (tolerance > capacity + 20) {
            return "Your risk comfort exceeds your financial ability. Focus on building emergency funds and reducing debt before increasing risk.";
        } else if (requirement > Math.max(capacity, tolerance) + 20) {
            return "Your goals require more risk than you can afford or feel comfortable with. Consider extending retirement age or increasing contributions.";
        } else {
            return "Continue monitoring as your situation changes, and adjust your approach as you get closer to retirement.";
        }
    }

    generateAgeBasedRecommendations(inputs, capacity, tolerance) {
        const age = inputs.yourCurrentAge;
        const yearsToRetirement = inputs.retirementAge - age;
        const recommendations = [];

        if (age <= 35) {
            recommendations.push({
                title: "High Growth Opportunity Window",
                description: `At ${age}, you have 25+ years of compounding ahead. Time is your greatest asset for wealth building.`,
                action: "Consider 80-90% equities if your capacity allows. Focus on Australian shares with franking credits and international diversification."
            });

            recommendations.push({
                title: "Take Advantage of Franking Credits",
                description: "Young investors can maximize franking credit benefits over decades of investing.",
                action: "Allocate 40-60% to Australian dividend-paying stocks (CBA, WOW, TLS) for tax-effective income."
            });
        } else if (age <= 50) {
            recommendations.push({
                title: "Peak Earning Years Strategy",
                description: `Your 40s and early 50s are typically peak earning years. Maximize contributions while you can.`,
                action: "Consider salary sacrificing additional super contributions. Review your allocation - aim for 70-80% growth assets."
            });

            recommendations.push({
                title: "Diversification Focus",
                description: "Balance Australian franking credits with international exposure for risk management.",
                action: "Split growth assets: 50% Australian equities, 30% international shares, 20% property/REITs."
            });
        } else if (age <= 60) {
            recommendations.push({
                title: "Pre-Retirement Transition",
                description: `With ${yearsToRetirement} years to retirement, start gradually reducing volatility while maintaining growth.`,
                action: "Consider 'bond tent' strategy - reduce equities by 2-3% per year. Maintain some Australian dividend stocks."
            });

            recommendations.push({
                title: "Pension Phase Planning",
                description: "Plan for tax-free phase after 60 where franking credits become even more valuable.",
                action: "Position high-dividend Australian stocks for pension phase when all income becomes tax-free."
            });
        } else {
            recommendations.push({
                title: "Capital Preservation Focus",
                description: "At 60+, protecting what you've built becomes more important than aggressive growth.",
                action: "Target 50-60% growth assets maximum. Focus on quality dividend stocks and defensive assets."
            });

            recommendations.push({
                title: "Pension Phase Benefits",
                description: "In super pension phase, all investment income is tax-free, making franked dividends even more attractive.",
                action: "Maximize franked dividend income in super. Consider 60% Australian shares, 40% defensive assets."
            });
        }

        return recommendations;
    }

    generateAustralianInvestmentOpportunities(inputs, monteCarloResults) {
        const opportunities = [];
        const successRate = monteCarloResults.successRate ? monteCarloResults.successRate * 100 : 70;

        opportunities.push({
            title: "Enhanced Franking Credits Strategy",
            description: "Australian companies pay fully-franked dividends, providing tax credits worth up to 30% extra income.",
            implementation: "Focus on ASX dividend aristocrats: CBA, ANZ, BHP, RIO, WES, COL. Aim for 40-60% of equity allocation.",
            benefit: `Could boost after-tax returns by 1-2% annually, worth $10K-30K over retirement depending on your tax situation.`
        });

        opportunities.push({
            title: "Superannuation Contribution Strategies",
            description: "Tax-effective super contributions can significantly boost retirement savings.",
            implementation: "Salary sacrifice to $30K annual cap (concessional). Consider spouse contributions and government co-contributions.",
            benefit: "Tax savings of 16-30% on contributions, plus compound growth in tax-sheltered environment."
        });

        if (inputs.yourCurrentAge >= 50) {
            opportunities.push({
                title: "Catch-Up Contributions (Age 50+)",
                description: "Higher contribution limits available for those approaching retirement.",
                implementation: "Use catch-up provisions to contribute additional $7,500 annually to super from unused cap space.",
                benefit: "Extra tax deductions and accelerated retirement savings in final working years."
            });
        }

        opportunities.push({
            title: "Australian Property Investment Trusts (REITs)",
            description: "Diversify beyond direct property with liquid, professionally managed real estate investments.",
            implementation: "Consider VAS (Vanguard Australian Shares), ILF (iShares Core Composite Bond), or A-REITs like SCG, MGR.",
            benefit: "Exposure to commercial property returns with better liquidity than direct investment."
        });

        if (successRate < 80) {
            opportunities.push({
                title: "International Diversification",
                description: "Reduce home country bias with global exposure while maintaining Australian base.",
                implementation: "Target 30-40% international equities through VGS (Vanguard MSCI World) or IVV (S&P 500).",
                benefit: "Better risk-adjusted returns and currency diversification to improve retirement success rate."
            });
        }

        return opportunities;
    }

    generateDiversificationSuggestions(inputs, result) {
        const suggestions = [];
        const hasProperty = inputs.hasInvestmentProperty;
        const currentSavings = inputs.currentSavings || 0;
        const stocksAllocation = inputs.currentStocks || 0;

        suggestions.push({
            title: "Emergency Fund Optimization",
            description: "Maintain 3-6 months expenses in high-yield savings before increasing investment risk.",
            implementation: "Use online banks (ING, UBank, CUA) offering 4-5% on savings. Keep separate from investment funds.",
            riskReduction: "Reduces need to sell investments during market downturns, protecting long-term growth."
        });

        if (!hasProperty && currentSavings > 50000) {
            suggestions.push({
                title: "Consider Investment Property vs REITs",
                description: "Diversify into property through direct investment or Real Estate Investment Trusts.",
                implementation: "REITs offer liquidity and diversification without direct property management. Consider A-REITs or global property funds.",
                riskReduction: "Property provides inflation hedge and income diversification beyond shares and bonds."
            });
        }

        suggestions.push({
            title: "Bond Ladder or Term Deposits",
            description: "Reduce volatility with fixed-income investments matching your risk capacity.",
            implementation: "Build ladder of 1-5 year government bonds or bank term deposits. Consider TIPS for inflation protection.",
            riskReduction: "Provides steady income and capital stability, reducing overall portfolio volatility by 20-30%."
        });

        if (stocksAllocation > currentSavings * 2) {
            suggestions.push({
                title: "Rebalance Asset Concentration",
                description: "Your stock allocation appears high relative to total savings, increasing concentration risk.",
                implementation: "Gradually rebalance to target allocation. Consider dollar-cost averaging over 6-12 months.",
                riskReduction: "Reduces single-asset-class risk and smooths investment returns over time."
            });
        }

        suggestions.push({
            title: "International Currency Exposure",
            description: "Hedge against Australian dollar fluctuations with global investments.",
            implementation: "Allocate 20-30% to international shares (VGS, IVV) or currency-hedged options (VGAD, IHVV).",
            riskReduction: "Protects against local economic downturns and provides currency diversification."
        });

        return suggestions;
    }

    generateImmediateActions(capacity, tolerance, requirement, inputs, monteCarloResults) {
        const actions = [];
        const successRate = monteCarloResults.successRate ? monteCarloResults.successRate * 100 : 70;
        const age = inputs.yourCurrentAge;

        if (Math.abs(capacity - tolerance) > 25) {
            if (capacity > tolerance) {
                actions.push("Consider investment education to build confidence - your finances support more risk than you're taking");
            } else {
                actions.push("Focus on building emergency funds and paying down debt before increasing investment risk");
            }
        }

        if (successRate < 70) {
            actions.push(`Your ${successRate.toFixed(0)}% success rate suggests increasing super contributions by $50-100 weekly could significantly improve outcomes`);
        }

        if (requirement > 70 && tolerance < 50) {
            actions.push("Your goals require higher returns - consider working 2-3 years longer or increasing contributions rather than taking uncomfortable risks");
        }

        if (age < 45 && capacity > 70 && tolerance < 60) {
            actions.push("At your age, time is your biggest asset - consider gradually increasing your risk tolerance through education and small steps");
        }

        if (age >= 55 && tolerance > 80) {
            actions.push("Consider gradually reducing risk as you approach retirement - implement a 'bond tent' strategy over the next 5-10 years");
        }

        if (!inputs.hasInvestmentProperty && inputs.currentSavings > 100000) {
            actions.push("With significant savings, consider property investment or REITs for diversification beyond stocks and super");
        }

        if (inputs.yourSalary + inputs.partnerSalary > 120000) {
            actions.push("Review salary sacrificing to super - you're likely in higher tax brackets where super contributions provide significant tax benefits");
        }

        return actions.length > 0 ? actions : ["Your risk profile appears well-balanced - continue regular reviews as your situation changes"];
    }

    // Display optimization strategies
    displayOptimizationStrategies(result, inputs) {
        const optimizationContent = $('optimizationContent');
        if (!optimizationContent) return;

        try {
            // Enhanced cash flow analysis for prioritizing strategies
            const cashFlowAnalysis = this.simulator.calculateCashFlowAnalysis(inputs);
            console.log('Cash flow analysis result:', cashFlowAnalysis); // Debug log

            if (!cashFlowAnalysis || !cashFlowAnalysis.cashFlow) {
                console.error('Cash flow analysis failed - using fallback');
                optimizationContent.innerHTML = '<div class="p-4 text-red-600">Cash flow analysis temporarily unavailable. Please try again.</div>';
                return;
            }

            const monthlyDisposableIncome = cashFlowAnalysis.cashFlow.monthlyDisposableIncome || 0;
            const savingsCapacity = cashFlowAnalysis.savingsAnalysis || {
                canIncreaseSavings: monthlyDisposableIncome > 200,
                hasStrongCapacity: monthlyDisposableIncome > 1000,
                opportunities: []
            };
            console.log('Savings capacity:', savingsCapacity); // Debug log

            // Prioritize strategies based on cash flow constraints
            const cashFlowOptimization = this.analyzeCashFlowOptimization(cashFlowAnalysis, inputs);
            const expenseOptimization = this.analyzeExpenseOptimization(cashFlowAnalysis, inputs);
            const incomeOptimization = this.analyzeIncomeOptimization(savingsCapacity, inputs);

            const pensionOptimization = this.analyzePensionOptimization(result, inputs);
            const taxOptimization = this.analyzeTaxOptimization(inputs);
            const contributionOptimization = this.analyzeContributionOptimization(inputs);
            const allocationOptimization = this.analyzeAllocationOptimization(inputs);

            optimizationContent.innerHTML = `
            <!-- Priority 1: Cash Flow Analysis -->
            <div class="enhancement-highlight p-4 rounded-lg border-l-4 ${monthlyDisposableIncome < 500 ? 'border-red-500 bg-red-50' : monthlyDisposableIncome < 1000 ? 'border-yellow-500 bg-yellow-50' : 'border-green-500 bg-green-50'}">
                <h3 class="text-lg font-semibold mb-3">Cash Flow Optimization (Priority #1)</h3>
                <div class="mb-3 p-3 rounded ${monthlyDisposableIncome < 500 ? 'bg-red-100' : monthlyDisposableIncome < 1000 ? 'bg-yellow-100' : 'bg-green-100'}">
                    <div class="text-sm font-medium">Current Monthly Disposable Income: <span class="font-bold">${formatCurrency(monthlyDisposableIncome, 0, true)}/month</span></div>
                    <div class="text-xs mt-1">Status: ${cashFlowAnalysis.cashFlow.status.charAt(0).toUpperCase() + cashFlowAnalysis.cashFlow.status.slice(1)} cash flow</div>
                </div>
                <div class="space-y-3 text-sm">
                    ${cashFlowOptimization.map(strategy => `<div>• ${strategy}</div>`).join('')}
                </div>
            </div>

            <!-- Priority 2: Expense vs Income Strategies -->
            <div class="enhancement-highlight p-4 rounded-lg">
                <h3 class="text-lg font-semibold mb-3">Expense vs Income Optimization</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div class="p-3 rounded ${savingsCapacity.canIncreaseSavings ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}">
                        <h4 class="font-medium text-sm mb-2">Income Strategies</h4>
                        <div class="space-y-2 text-xs">
                            ${incomeOptimization.map(strategy => `<div>• ${strategy}</div>`).join('')}
                        </div>
                    </div>
                    <div class="p-3 rounded bg-blue-50 border border-blue-200">
                        <h4 class="font-medium text-sm mb-2">Expense Strategies</h4>
                        <div class="space-y-2 text-xs">
                            ${expenseOptimization.map(strategy => `<div>• ${strategy}</div>`).join('')}
                        </div>
                    </div>
                </div>
            </div>

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
        } catch (error) {
            console.error('Error in optimization display:', error);
            optimizationContent.innerHTML = `
                <div class="p-4 bg-red-50 border border-red-200 rounded-lg">
                    <h3 class="font-semibold text-red-800 mb-2">Optimization Analysis Unavailable</h3>
                    <p class="text-sm text-red-600">There was an error analyzing your optimization strategies. Please check your inputs and try again.</p>
                </div>
            `;
        }
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

        const sellingCosts = futureValue * ENHANCED_FINANCIAL_CONFIG.propertyInvestment.TRANSACTION_COSTS.SELLING_COSTS_PERCENT.value;
        const capitalGain = futureValue - currentValue;
        const cgtPayable = capitalGain * ENHANCED_FINANCIAL_CONFIG.australianSystem.CGT_DISCOUNT.value * (inputs.capitalGainsTaxRate / 100);
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

    // Cash Flow Optimization Analysis
    analyzeCashFlowOptimization(cashFlowAnalysis, inputs) {
        const strategies = [];
        const monthlyDisposableIncome = cashFlowAnalysis.cashFlow.monthlyDisposableIncome;
        const status = cashFlowAnalysis.cashFlow.status;

        if (status === 'stressed' || monthlyDisposableIncome < 200) {
            strategies.push('🚨 Immediate action needed: Negative cash flow threatens retirement savings capacity');
            if (cashFlowAnalysis.expenses.housing.mortgagePayment > 0) {
                strategies.push('Consider downsizing or refinancing to reduce mortgage payments');
            }
            strategies.push('Review all discretionary spending to find immediate savings');
        } else if (status === 'tight' || monthlyDisposableIncome < 500) {
            strategies.push('⚠️ Limited capacity: Focus on expense optimization before increasing savings');
            strategies.push('Small savings increases ($100-200/month) may be possible');
        } else if (status === 'moderate' || monthlyDisposableIncome < 1000) {
            strategies.push('✅ Moderate capacity: Balanced approach to savings and lifestyle');
            strategies.push(`Consider increasing retirement savings by up to $${Math.round(monthlyDisposableIncome * 0.6)}/month`);
        } else {
            strategies.push('🎯 Strong capacity: Maximize retirement contributions while maintaining quality of life');
            strategies.push(`You could comfortably increase savings by $${Math.round(monthlyDisposableIncome * 0.7)}/month`);
        }

        return strategies;
    }

    // Expense Optimization Analysis
    analyzeExpenseOptimization(cashFlowAnalysis, inputs) {
        try {
            const strategies = [];
            const expenses = cashFlowAnalysis.expenses || {};
            const monthlyNetIncome = cashFlowAnalysis.monthlyNetIncome || cashFlowAnalysis.income?.netMonthly || 0;

            // Housing cost optimization
            if (expenses.housing && expenses.housing.mortgagePayment > monthlyNetIncome * 0.25) {
                strategies.push('Consider refinancing or downsizing to reduce mortgage burden');
            }

            // Dependent cost optimization
            if (expenses.dependents && expenses.dependents.monthlyTotal > 2000) {
                strategies.push('Review dependent care subsidies and tax benefits to optimize costs');
                strategies.push('Consider family daycare, nanny sharing, or support from extended family');
            }

            // General expense strategies
            strategies.push('Track spending for 3 months to identify reduction opportunities');
            strategies.push('Review insurance policies annually for better rates');
            strategies.push('Consolidate subscriptions and memberships to reduce ongoing costs');

            if (cashFlowAnalysis.opportunities && cashFlowAnalysis.opportunities.length > 0) {
                const topOpportunity = cashFlowAnalysis.opportunities[0];
                strategies.push(`💡 ${topOpportunity.action || topOpportunity.title} could save $${topOpportunity.monthlySavings || 200}/month`);
            }

            return strategies;
        } catch (error) {
            console.error('Error in analyzeExpenseOptimization:', error);
            return ['Unable to generate expense optimization strategies at this time.'];
        }
    }

    // Income Optimization Analysis
    analyzeIncomeOptimization(savingsCapacity, inputs) {
        const strategies = [];
        const totalIncome = inputs.yourSalary + inputs.partnerSalary;

        if (savingsCapacity.canIncreaseSavings) {
            if (totalIncome > 100000) {
                strategies.push('Salary sacrifice to superannuation for tax benefits');
                strategies.push('Consider income splitting strategies if applicable');
            }
            strategies.push('Maximize employer superannuation matching contributions');
            strategies.push('Review investment contributions for compound growth benefits');
        } else {
            strategies.push('⚠️ Limited savings capacity - focus on expense reduction first');
            strategies.push('Consider side income or skill development for future income growth');
            if (inputs.hasInvestmentProperty) {
                strategies.push('Sell negatively geared property to improve cash flow');
            }
            if (inputs.currentStocks > 50000) {
                strategies.push('Consider rebalancing investments for better cash flow');
            }
        }

        // Career development strategies
        if (inputs.yourCurrentAge < 55) {
            strategies.push('Invest in professional development for income growth potential');
        }

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
            const { default: DecisionSupportEngine } = await import(/* webpackChunkName: "decision-support" */ './decision-support-engine.js');
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
                const { default: RecommendationEngine } = await import(/* webpackChunkName: "recommendation" */ './recommendation.js');
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

    // Generate Personalized Suggestions for the new Suggestions tab
    async generatePersonalizedSuggestions() {
        if (this.isCalculating) return;
        this.isCalculating = true;

        try {
            const inputs = this.collectInputs();

            // Store original inputs for undo functionality
            this.originalInputs = { ...inputs };

            // Show loading state
            const loadingDiv = $('suggestionsLoading');
            const buttonDiv = $('generateSuggestionsBtn');
            if (loadingDiv) loadingDiv.classList.remove('hidden');
            if (buttonDiv) buttonDiv.style.opacity = '0.5';

            updateProgress(10, 'Analyzing your financial situation...');
            await new Promise(resolve => setTimeout(resolve, 100));

            // Use the RecommendationEngine with our enhanced scenarios
            const { default: RecommendationEngine } = await import(/* webpackChunkName: "recommendation" */ './recommendation.js');
            const recommendationEngine = new RecommendationEngine(this.simulator, inputs);

            updateProgress(30, 'Running baseline calculation...');
            const baselineResults = await this.simulator.runMonteCarloSimulation(inputs, 1000);

            updateProgress(50, 'Generating actionable suggestions...');
            const scenarios = await recommendationEngine.generateRecommendations();

            // Store scenarios for Try This functionality
            this.lastGeneratedSuggestions = scenarios;

            updateProgress(80, 'Categorizing suggestions...');
            await new Promise(resolve => setTimeout(resolve, 100));

            // Debug: Log scenarios structure
            console.log('Generated scenarios:', scenarios);
            console.log('Scenarios length:', scenarios ? scenarios.length : 'scenarios is null/undefined');
            if (scenarios && scenarios.length > 0) {
                console.log('First scenario structure:', scenarios[0]);
                console.log('First scenario keys:', Object.keys(scenarios[0]));
            }

            // Categorize scenarios for the suggestions UI
            const categorizedSuggestions = this.categorizeSuggestionsForUI(scenarios);

            updateProgress(95, 'Displaying suggestions...');
            this.displayCategorizedSuggestions(categorizedSuggestions);

            updateProgress(100, 'Suggestions generated successfully!');
            showNotification(`Generated ${scenarios.length} personalized suggestions across ${Object.keys(categorizedSuggestions).length} categories.`, 'success');

        } catch (error) {
            console.error('Generate Suggestions error:', error);
            showNotification('Error generating suggestions: ' + error.message, 'error');
        } finally {
            this.isCalculating = false;
            updateProgress(0);

            // Hide loading state
            const loadingDiv = $('suggestionsLoading');
            const buttonDiv = $('generateSuggestionsBtn');
            if (loadingDiv) loadingDiv.classList.add('hidden');
            if (buttonDiv) buttonDiv.style.opacity = '1';
        }
    }

    // Categorize suggestions for the new UI structure
    categorizeSuggestionsForUI(scenarios) {
        const categories = {
            property: [],
            income: [],
            investment: [],
            timing: [],
            mortgage: [],
            insurance: []
        };

        // Safety check for scenarios array
        if (!Array.isArray(scenarios)) {
            console.warn('Scenarios is not an array:', scenarios);
            return categories;
        }

        scenarios.forEach(scenario => {
            // Safety check for scenario structure
            if (!scenario || (typeof scenario !== 'object')) {
                console.warn('Invalid scenario object:', scenario);
                return;
            }

            // Categorize based on scenario name and content
            const name = (scenario.name || scenario.title || scenario.description || '').toLowerCase();

            if (name.includes('property') || name.includes('sell') || name.includes('home') || name.includes('downsize')) {
                categories.property.push(scenario);
            } else if (name.includes('salary') || name.includes('lean') || name.includes('income') || name.includes('boost')) {
                categories.income.push(scenario);
            } else if (name.includes('franking') || name.includes('investment') || name.includes('stock') || name.includes('equity') || name.includes('allocation')) {
                categories.investment.push(scenario);
            } else if (name.includes('retire') || name.includes('partner') || name.includes('timing') || name.includes('years')) {
                categories.timing.push(scenario);
            } else if (name.includes('mortgage') || name.includes('refinance') || name.includes('accelerate') || name.includes('payment')) {
                categories.mortgage.push(scenario);
            } else if (name.includes('insurance') || name.includes('tpd') || name.includes('death') || name.includes('disability')) {
                categories.insurance.push(scenario);
            } else {
                // Default to investment category
                categories.investment.push(scenario);
            }
        });

        return categories;
    }

    // Display categorized suggestions in the new UI
    displayCategorizedSuggestions(categories) {
        // Property suggestions
        this.populateSuggestionCategory('propertySuggestions', categories.property, 'property');

        // Income suggestions
        this.populateSuggestionCategory('incomeSuggestions', categories.income, 'income');

        // Investment suggestions
        this.populateSuggestionCategory('investmentSuggestions', categories.investment, 'investment');

        // Timing suggestions
        this.populateSuggestionCategory('timingSuggestions', categories.timing, 'timing');

        // Mortgage suggestions
        this.populateSuggestionCategory('mortgageSuggestions', categories.mortgage, 'mortgage');

        // Insurance suggestions
        this.populateSuggestionCategory('insuranceSuggestions', categories.insurance, 'insurance');

        // Show the what-if comparison section if we have suggestions
        const totalSuggestions = Object.values(categories).reduce((sum, cat) => sum + cat.length, 0);
        if (totalSuggestions > 0) {
            const whatIfDiv = $('whatIfComparison');
            if (whatIfDiv) whatIfDiv.classList.remove('hidden');
        }
    }

    // Populate a specific suggestion category
    populateSuggestionCategory(elementId, suggestions, categoryType) {
        const container = $(elementId);
        if (!container) return;

        if (suggestions.length === 0) {
            container.innerHTML = `
                <div class="text-sm text-gray-500 italic">
                    No specific suggestions for this category based on your current situation.
                </div>
            `;
            return;
        }

        // Sort by potential impact (if available)
        suggestions.sort((a, b) => {
            if (a.medianBalanceDiff && b.medianBalanceDiff) {
                return b.medianBalanceDiff - a.medianBalanceDiff;
            }
            return 0;
        });

        // Take top 3 suggestions per category to avoid overwhelm
        const topSuggestions = suggestions.slice(0, 3);

        container.innerHTML = topSuggestions.map(suggestion => `
            <div class="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div class="flex justify-between items-start mb-2">
                    <h4 class="font-semibold text-sm text-gray-800">${suggestion.name || suggestion.title || 'Suggestion'}</h4>
                    <span class="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                        ${suggestion.feasibility || 'Action Required'}
                    </span>
                </div>

                <p class="text-xs text-gray-600 mb-3">${this.formatDescriptionHTML(suggestion.description) || 'No description available'}</p>

                ${suggestion.factorsChanged && Array.isArray(suggestion.factorsChanged) && suggestion.factorsChanged.length > 0 ? `
                    <div class="text-xs text-gray-500 mb-3">
                        <strong>Key Changes:</strong>
                        <ul class="mt-1 ml-3 list-disc space-y-0.5">
                            ${suggestion.factorsChanged.slice(0, 2).map(factor => `<li>${factor}</li>`).join('')}
                            ${suggestion.factorsChanged.length > 2 ? `<li class="italic">...and ${suggestion.factorsChanged.length - 2} more</li>` : ''}
                        </ul>
                    </div>
                ` : ''}

                <div class="flex justify-between items-center">
                    ${this.getImpactDisplay(suggestion)}

                    <button
                        class="text-xs px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
                        onclick="app.applySuggestion('${(suggestion.name || suggestion.title || 'Unknown').replace(/'/g, "\\'")}')"
                    >
                        Try This →
                    </button>
                </div>
            </div>
        `).join('');
    }

    // Apply a suggestion to the form inputs
    applySuggestion(suggestionName) {
        if (!this.lastGeneratedSuggestions) {
            showNotification('Please generate suggestions first', 'error');
            return;
        }

        // Find the suggestion by name
        const suggestion = this.lastGeneratedSuggestions.find(s =>
            (s.name || s.title || '') === suggestionName
        );

        if (!suggestion || !suggestion.modifications) {
            showNotification(`This "${suggestionName}" is for informational purposes. The functionality to automatically apply this change is currently under development.`, 'info');
            return;
        }

        try {
            // Apply modifications to form inputs
            const applied = this.applyModificationsToForm(suggestion.modifications);

            if (applied > 0) {
                showNotification(`Applied suggestion: "${suggestionName}". Modified ${applied} field(s). Running calculation...`, 'success');

                // Show which tab has the suggestion tab and scroll to it if needed
                this.highlightModifiedFields(suggestion.modifications);

                // Automatically trigger recalculation
                setTimeout(() => {
                    this.calculateRetirement(true);
                    showNotification(`Calculation complete! View results in the "📊 Results" tab.`, 'info');
                }, 1000); // Small delay to let user see the field changes

                // Show undo button
                this.showUndoButton();
            } else {
                showNotification(`No applicable modifications found for: "${suggestionName}"`, 'warning');
            }
        } catch (error) {
            console.error('Error applying suggestion:', error);
            showNotification(`Error applying suggestion: ${error.message}`, 'error');
        }
    }

    // Apply modifications object to form fields
    applyModificationsToForm(modifications) {
        let appliedCount = 0;
        const fieldMap = this.getFormFieldMapping();

        Object.entries(modifications).forEach(([key, value]) => {
            const fieldId = fieldMap[key];
            if (fieldId) {
                const input = $(fieldId);
                if (input) {
                    // Handle different input types
                    if (input.type === 'checkbox') {
                        input.checked = Boolean(value);
                    } else if (input.tagName === 'SELECT') {
                        input.value = value;
                    } else {
                        input.value = value;
                    }

                    // Trigger any change events to update dependent fields
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                    appliedCount++;

                    // Add visual indicator that field was modified
                    input.classList.add('suggestion-modified');
                    setTimeout(() => input.classList.remove('suggestion-modified'), 3000);
                }
            }
        });

        return appliedCount;
    }

    // Map modification keys to form field IDs
    getFormFieldMapping() {
        return {
            // Personal fields
            'yourCurrentAge': 'yourCurrentAge',
            'partnerCurrentAge': 'partnerCurrentAge',
            'retirementAge': 'retirementAge',
            'partnerRetirementAge': 'partnerRetirementAge',
            'yourLifespan': 'yourLifespan',
            'partnerLifespan': 'partnerLifespan',

            // Financial fields
            'yourSalary': 'yourSalary',
            'partnerSalary': 'partnerSalary',
            'yourCurrentSuper': 'yourCurrentSuper',
            'partnerCurrentSuper': 'partnerCurrentSuper',
            'currentSavings': 'currentSavings',
            'currentStocks': 'currentStocks',
            'monthlyStockContribution': 'monthlyStockContribution',
            'percentIncomeSaved': 'percentIncomeSaved',
            'salaryGrowthRate': 'salaryGrowthRate',
            'additionalSuperContributions': 'additionalSuperContributions',

            // Property fields
            'homeValue': 'homeValue',
            'mortgageBalance': 'mortgageBalance',
            'mortgageRate': 'mortgageRate',
            'monthlyMortgagePayment': 'monthlyMortgagePayment',
            'planToDownsize': 'planToDownsize',
            'hasInvestmentProperty': 'hasInvestmentProperty',
            'investmentPropertyValue': 'investmentPropertyValue',
            'investmentPropertyLoan': 'investmentPropertyLoan',
            'investmentPropertyRate': 'investmentPropertyRate',
            'weeklyRentalIncome': 'weeklyRentalIncome',
            'annualPropertyExpenses': 'annualPropertyExpenses',
            'propertyGrowthRate': 'propertyGrowthRate',
            'sellPropertyYears': 'sellPropertyYears',
            'capitalGainsTaxRate': 'capitalGainsTaxRate',

            // Investment fields
            'australianEquityAllocation': 'australianEquityAllocation',
            'frankingRate': 'frankingRate',

            // Lean years fields
            'leanYearsStart': 'leanYearsStart',
            'leanYearsReduction': 'leanYearsReduction'
        };
    }

    // Highlight modified fields visually
    highlightModifiedFields(modifications) {
        const fieldMap = this.getFormFieldMapping();

        Object.keys(modifications).forEach(key => {
            const fieldId = fieldMap[key];
            if (fieldId) {
                const input = $(fieldId);
                if (input) {
                    // Scroll to first modified field
                    if (Object.keys(modifications)[0] === key) {
                        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }
            }
        });
    }

    // Add CSS styles for suggestion modifications
    addSuggestionStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .suggestion-modified {
                border: 2px solid #10B981 !important;
                box-shadow: 0 0 10px rgba(16, 185, 129, 0.3) !important;
                transition: all 0.3s ease !important;
                animation: suggestModifiedPulse 0.5s ease-in-out;
            }

            @keyframes suggestModifiedPulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.05); }
                100% { transform: scale(1); }
            }
        `;
        document.head.appendChild(style);
    }

    // Show undo button for reverting suggestion changes
    showUndoButton() {
        // Remove existing undo button if present
        const existingUndo = $('undoSuggestionBtn');
        if (existingUndo) existingUndo.remove();

        // Create undo button
        const undoButton = document.createElement('button');
        undoButton.id = 'undoSuggestionBtn';
        undoButton.className = 'fixed bottom-4 right-4 px-4 py-2 bg-red-600 text-white rounded-lg shadow-lg hover:bg-red-700 transition-colors z-50';
        undoButton.innerHTML = '↶ Undo Changes';
        undoButton.onclick = () => this.undoSuggestionChanges();

        document.body.appendChild(undoButton);

        // Auto-hide after 10 seconds
        setTimeout(() => {
            if ($('undoSuggestionBtn')) {
                $('undoSuggestionBtn').remove();
            }
        }, 10000);
    }

    // Undo suggestion changes and restore original inputs
    undoSuggestionChanges() {
        if (!this.originalInputs) {
            showNotification('No original inputs to restore', 'warning');
            return;
        }

        try {
            const fieldMap = this.getFormFieldMapping();
            let restoredCount = 0;

            // Restore all form fields to original values
            Object.entries(this.originalInputs).forEach(([key, value]) => {
                const fieldId = fieldMap[key] || key; // Try direct mapping first, then key as ID
                const input = $(fieldId);

                if (input) {
                    if (input.type === 'checkbox') {
                        input.checked = Boolean(value);
                    } else if (input.tagName === 'SELECT') {
                        input.value = value;
                    } else {
                        input.value = value;
                    }

                    // Trigger change events
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                    restoredCount++;

                    // Add visual indicator
                    input.classList.add('suggestion-modified');
                    setTimeout(() => input.classList.remove('suggestion-modified'), 2000);
                }
            });

            // Remove undo button
            const undoButton = $('undoSuggestionBtn');
            if (undoButton) undoButton.remove();

            showNotification(`Restored ${restoredCount} fields to original values. Click "Calculate Enhanced Projection" if needed.`, 'success');

        } catch (error) {
            console.error('Error undoing changes:', error);
            showNotification(`Error undoing changes: ${error.message}`, 'error');
        }
    }

    // Format description text with markdown-style formatting to HTML
    formatDescriptionHTML(description) {
        if (!description) return 'No description available.';

        return description
            .replace(/\*\*Impact: (.*?)\*\*/g, '<span class="inline-block px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-semibold mr-2">Impact: $1</span>')
            .replace(/\*\*Risk: (.*?)\*\*/g, '<span class="inline-block px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-semibold mr-2">Risk: $1</span>')
            .replace(/\*\*Timeline: (.*?)\*\*/g, '<span class="inline-block px-2 py-0.5 bg-purple-100 text-purple-800 rounded text-xs font-semibold">Timeline: $1</span>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); // Fallback for other bold text
    }

    // Get appropriate impact display based on scenario type
    getImpactDisplay(suggestion) {
        const name = suggestion.name || suggestion.title || '';

        // For retirement timing scenarios, show success rate improvement
        if (name.includes('Retires') || name.includes('Retirement Age')) {
            if (suggestion.successRate && this.baseResult && this.baseResult.successRate) {
                const successImprovement = suggestion.successRate - this.baseResult.successRate;
                const isPositive = successImprovement > 0;
                return `<span class="text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}">
                    Success Rate: ${isPositive ? '+' : ''}${(successImprovement * 100).toFixed(1)}%
                </span>`;
            }
        }

        // For mortgage acceleration scenarios, show interest savings instead of balance difference
        if (name.includes('Accelerate Mortgage') || name.includes('Extra $')) {
            // Extract interest savings from description if available
            const description = suggestion.description || '';
            const savingsMatch = description.match(/save\s+([^s]+)\s+in interest/i);
            if (savingsMatch) {
                return `<span class="text-xs font-medium text-green-600">
                    Interest Saved: ${savingsMatch[1].trim()}
                </span>`;
            }
        }

        // For salary/career scenarios, show success rate improvement if available
        if (name.includes('Salary') || name.includes('Strategic') || name.includes('Boost')) {
            if (suggestion.successRate && this.baseResult && this.baseResult.successRate) {
                const successImprovement = suggestion.successRate - this.baseResult.successRate;
                const isPositive = successImprovement > 0;
                return `<span class="text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}">
                    Success Rate: ${isPositive ? '+' : ''}${(successImprovement * 100).toFixed(1)}%
                </span>`;
            }
        }

        // For property scenarios with positive descriptions but negative balance diff, show cash flow impact
        if ((name.includes('Property') || name.includes('Sell') || name.includes('Keep')) &&
            suggestion.description && suggestion.description.includes('POSITIVE') &&
            suggestion.medianBalanceDiff && suggestion.medianBalanceDiff < 0) {

            // Extract cash flow improvement from description
            const description = suggestion.description || '';
            const cashFlowMatch = description.match(/(\$[\d,]+)\/month/);
            const incomeMatch = description.match(/income.*(\$[\d,]+)\/year/);

            if (cashFlowMatch) {
                return `<span class="text-xs font-medium text-green-600">
                    Cash Flow: +${cashFlowMatch[1]}/month
                </span>`;
            } else if (incomeMatch) {
                return `<span class="text-xs font-medium text-green-600">
                    Annual Income: ${incomeMatch[1]}
                </span>`;
            }
        }

        // For scenarios with explicitly positive descriptions but negative medianBalanceDiff,
        // show success rate if available to avoid confusion
        if (suggestion.description &&
            (suggestion.description.includes('HIGH POSITIVE') || suggestion.description.includes('VERY HIGH POSITIVE')) &&
            suggestion.medianBalanceDiff && suggestion.medianBalanceDiff < 0 &&
            suggestion.successRate && this.baseResult && this.baseResult.successRate) {

            const successImprovement = suggestion.successRate - this.baseResult.successRate;
            const isPositive = successImprovement > 0;
            return `<span class="text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}">
                Success Rate: ${isPositive ? '+' : ''}${(successImprovement * 100).toFixed(1)}%
            </span>`;
        }

        // For other scenarios, use the traditional balance difference
        if (suggestion.medianBalanceDiff) {
            const isPositive = suggestion.medianBalanceDiff > 0;
            return `<span class="text-xs font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}">
                Impact: ${isPositive ? '+' : ''}${formatCurrency(suggestion.medianBalanceDiff)}
            </span>`;
        }

        return '<span class="text-xs text-gray-400">Impact: Calculating...</span>';
    }

    // Generate overseas retirement scenarios
    async generateOverseasScenarios() {
        try {
            // Show loading state
            const loadingDiv = $('overseasScenariosLoading');
            const resultsDiv = $('overseasScenariosResults');
            const placeholderDiv = $('overseasScenariosPlaceholder');
            const button = $('generateOverseasScenarios');

            if (loadingDiv) loadingDiv.classList.remove('hidden');
            if (resultsDiv) resultsDiv.classList.add('hidden');
            if (placeholderDiv) placeholderDiv.classList.add('hidden');
            if (button) button.disabled = true;

            // Collect overseas configuration inputs
            const overseasConfig = this.collectOverseasConfig();
            const baseInputs = this.collectInputs();

            // Generate scenarios based on configuration
            await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate processing time
            const scenarios = this.generateOverseasScenariosData(overseasConfig, baseInputs);

            // Update status banner
            this.updateOverseasStatus(overseasConfig, scenarios);

            // Display scenarios
            this.displayOverseasScenarios(scenarios);

            // Hide loading and show results
            if (loadingDiv) loadingDiv.classList.add('hidden');
            if (resultsDiv) resultsDiv.classList.remove('hidden');
            if (button) button.disabled = false;

            showNotification(`Generated ${scenarios.length} overseas retirement scenarios`, 'success');

        } catch (error) {
            console.error('Error generating overseas scenarios:', error);
            showNotification(`Error generating overseas scenarios: ${error.message}`, 'error');

            // Hide loading on error
            const loadingDiv = $('overseasScenariosLoading');
            const button = $('generateOverseasScenarios');
            if (loadingDiv) loadingDiv.classList.add('hidden');
            if (button) button.disabled = false;
        }
    }

    // Collect overseas configuration from form inputs
    collectOverseasConfig() {
        return {
            country: safeGetValue('overseasCountry', ''),
            departureAge: parseInt(safeGetValue('overseasAge', 65)),
            returnFrequency: safeGetValue('returnFrequency', 'annually'),
            maintainResidency: safeGetValue('maintainResidency', false, 'checked'),
            propertyStrategy: safeGetValue('propertyStrategy', 'keep-personal'),
            trustBeneficiaries: safeGetValue('trustBeneficiaries', 'you-only'),
            superAccess: safeGetValue('superAccess', 'pension-mode'),
            estimatedLivingCosts: parseFloat(safeGetValue('estimatedLivingCosts', 60000))
        };
    }

    // Generate overseas scenarios data based on configuration
    generateOverseasScenariosData(config, baseInputs) {
        const scenarios = [];
        const currentAge = baseInputs.yourCurrentAge;
        const retirementAge = baseInputs.retirementAge;

        // Country-specific data
        const countryData = this.getCountryData(config.country);

        // Scenario 1: Depart at retirement vs current plan
        scenarios.push({
            title: `Retire to ${countryData.displayName} at Age ${config.departureAge}`,
            description: `Move to ${countryData.displayName} at age ${config.departureAge} with ${config.returnFrequency.replace('_', ' ')} visits to Australia.`,
            impact: this.calculateOverseasImpact(config, baseInputs, 'retirement-departure'),
            agePensionStatus: this.calculateAgePensionImpact(config, baseInputs),
            taxImplications: this.calculateTaxImplications(config, baseInputs),
            riskLevel: config.maintainResidency ? 'MEDIUM' : 'HIGH',
            timeline: `${2025 + (config.departureAge - currentAge)}`,
            keyFactors: [
                `Living costs: $${config.estimatedLivingCosts.toLocaleString()}/year`,
                `Age pension: ${this.calculateAgePensionImpact(config, baseInputs)}`,
                `Tax residency: ${config.maintainResidency ? 'Australian' : countryData.displayName}`,
                `Property: ${config.propertyStrategy.replace('-', ' ')}`,
                `Healthcare: ${countryData.healthcareNotes}`
            ]
        });

        // Scenario 2: Property strategy impact
        if (baseInputs.hasInvestmentProperty) {
            scenarios.push({
                title: `${config.propertyStrategy === 'transfer-trust' ? 'Trust Structure' : 'Property Sale'} Strategy`,
                description: `${config.propertyStrategy === 'transfer-trust' ?
                    'Transfer properties to family trust before departure to optimize tax and Centrelink treatment' :
                    'Sell investment property before/after departure to optimize capital gains tax'}`,
                impact: this.calculatePropertyStrategyImpact(config, baseInputs),
                agePensionStatus: config.propertyStrategy === 'transfer-trust' ? 'May be attributed to you' : 'Reduced asset test impact',
                taxImplications: this.calculatePropertyTaxImpact(config, baseInputs),
                riskLevel: config.propertyStrategy === 'transfer-trust' ? 'HIGH' : 'MEDIUM',
                timeline: `${2025 + Math.max(0, config.departureAge - currentAge - 2)}`,
                keyFactors: [
                    `Current property value: $${baseInputs.investmentPropertyValue?.toLocaleString() || 'N/A'}`,
                    `Strategy: ${config.propertyStrategy.replace('-', ' ')}`,
                    `CGT timing: ${config.propertyStrategy.includes('before') ? 'Before departure' : 'After residency change'}`,
                    `Centrelink impact: ${config.propertyStrategy === 'sell-before' ? 'Significant asset reduction' : 'Complex attribution rules'}`,
                    `Trust beneficiaries: ${config.trustBeneficiaries.replace('-', ' ')}`
                ]
            });
        }

        // Scenario 3: Superannuation strategy
        scenarios.push({
            title: `${config.superAccess === 'pension-mode' ? 'Pension Payments' : 'Lump Sum'} Superannuation Strategy`,
            description: `Access superannuation via ${config.superAccess.replace('-', ' ')} ${config.superAccess === 'pension-mode' ? 'while living overseas' : 'before departure'}`,
            impact: this.calculateSuperStrategyImpact(config, baseInputs),
            agePensionStatus: config.superAccess === 'full-lump' ? 'Better asset test position' : 'Deemed income applies',
            taxImplications: this.calculateSuperTaxImpact(config, baseInputs),
            riskLevel: config.superAccess === 'pension-mode' ? 'LOW' : 'MEDIUM',
            timeline: config.superAccess === 'pension-mode' ? 'Ongoing from retirement' : 'Before departure',
            keyFactors: [
                `Total super: $${(baseInputs.yourCurrentSuper + baseInputs.partnerCurrentSuper).toLocaleString()}`,
                `Access strategy: ${config.superAccess.replace('-', ' ')}`,
                `Tax treatment: ${config.maintainResidency ? 'Australian tax resident' : 'May be taxed as non-resident'}`,
                `Age pension impact: ${config.superAccess === 'full-lump' ? 'Reduces assets test' : 'Ongoing deemed income'}`,
                `Currency risk: ${config.superAccess === 'pension-mode' ? 'Ongoing AUD exposure' : 'One-time conversion'}`
            ]
        });

        // Scenario 4: Tax residency impact
        scenarios.push({
            title: `${config.maintainResidency ? 'Maintain' : 'Cease'} Australian Tax Residency`,
            description: `${config.maintainResidency ?
                'Keep Australian tax residency and pay tax on worldwide income' :
                'Become non-resident and only pay Australian tax on Australian-source income'}`,
            impact: this.calculateResidencyImpact(config, baseInputs),
            agePensionStatus: config.maintainResidency ? 'No residency issues' : 'Must meet portability rules',
            taxImplications: this.calculateResidencyTaxImpact(config, baseInputs),
            riskLevel: config.maintainResidency ? 'LOW' : 'HIGH',
            timeline: 'Determined at departure',
            keyFactors: [
                `Australian tax: ${config.maintainResidency ? 'All income taxed' : 'Only Australian-source income'}`,
                `${countryData.displayName} tax: ${config.maintainResidency ? 'May create double taxation' : 'Becomes primary tax residence'}`,
                `Age pension: ${config.maintainResidency ? 'Full portability if eligible' : 'Subject to portability limits'}`,
                `Investment income: ${config.maintainResidency ? 'Taxed in Australia' : 'Withholding tax applies'}`,
                `Professional advice: Essential for complex tax planning`
            ]
        });

        // Scenario 5: Return frequency impact
        if (config.returnFrequency !== 'never') {
            scenarios.push({
                title: `${config.returnFrequency.charAt(0).toUpperCase() + config.returnFrequency.slice(1)} Return Pattern`,
                description: `Maintain ${config.returnFrequency} visits to Australia to ${config.returnFrequency === 'seasonal' ? 'potentially maintain tax residency' : 'stay connected but likely be non-resident'}`,
                impact: this.calculateReturnFrequencyImpact(config, baseInputs),
                agePensionStatus: this.calculateReturnPensionImpact(config.returnFrequency),
                taxImplications: this.calculateReturnTaxImpact(config.returnFrequency),
                riskLevel: config.returnFrequency === 'seasonal' ? 'MEDIUM' : 'LOW',
                timeline: 'Annual pattern',
                keyFactors: [
                    `Time in Australia: ${this.getReturnTimeDescription(config.returnFrequency)}`,
                    `Tax residency: ${config.returnFrequency === 'seasonal' ? 'May maintain if other factors support' : 'Likely non-resident'}`,
                    `Age pension: ${config.returnFrequency === 'seasonal' ? 'May avoid portability limits' : 'Subject to overseas limits'}`,
                    `Travel costs: Budget for regular flights and accommodation`,
                    `Healthcare: Maintain Medicare access during Australian visits`
                ]
            });
        }

        return scenarios;
    }

    // Get country-specific data
    getCountryData(country) {
        const countryMap = {
            'portugal': { displayName: 'Portugal', healthcareNotes: 'Public healthcare available', taxTreaty: true },
            'spain': { displayName: 'Spain', healthcareNotes: 'EU healthcare reciprocity', taxTreaty: true },
            'italy': { displayName: 'Italy', healthcareNotes: 'Regional healthcare systems', taxTreaty: true },
            'usa': { displayName: 'United States', healthcareNotes: 'Private insurance essential', taxTreaty: true },
            'canada': { displayName: 'Canada', healthcareNotes: 'Provincial healthcare systems', taxTreaty: true },
            'newzealand': { displayName: 'New Zealand', healthcareNotes: 'Reciprocal healthcare agreement', taxTreaty: true },
            'india': { displayName: 'India', healthcareNotes: 'Private insurance recommended', taxTreaty: true },
            'thailand': { displayName: 'Thailand', healthcareNotes: 'Expat health insurance needed', taxTreaty: false },
            'philippines': { displayName: 'Philippines', healthcareNotes: 'Private healthcare advisable', taxTreaty: false },
            'malaysia': { displayName: 'Malaysia', healthcareNotes: 'MM2H healthcare benefits', taxTreaty: true },
            'other': { displayName: 'Selected Country', healthcareNotes: 'Research local healthcare', taxTreaty: false }
        };
        return countryMap[country] || countryMap['other'];
    }

    // Calculate various impacts (placeholder implementations)
    calculateOverseasImpact(config, baseInputs, type) {
        const costDiff = baseInputs.currentSavings * 0.1; // Simplified calculation
        return config.estimatedLivingCosts < 80000 ? 'POSITIVE' : 'NEUTRAL';
    }

    calculateAgePensionImpact(config, baseInputs) {
        if (config.returnFrequency === 'seasonal') return 'May maintain full pension';
        if (config.returnFrequency === 'never') return 'Outside Australia rate applies';
        return 'Portability rules apply after 26 weeks';
    }

    calculateTaxImplications(config, baseInputs) {
        if (config.maintainResidency) return 'Australian tax on worldwide income';
        return 'Non-resident withholding tax on Australian income';
    }

    calculatePropertyStrategyImpact(config, baseInputs) {
        if (config.propertyStrategy === 'sell-before') return 'POSITIVE';
        if (config.propertyStrategy === 'transfer-trust') return 'COMPLEX';
        return 'NEUTRAL';
    }

    calculatePropertyTaxImpact(config, baseInputs) {
        if (config.propertyStrategy.includes('sell')) return 'Capital gains tax implications';
        return 'Ongoing rental income tax obligations';
    }

    calculateSuperStrategyImpact(config, baseInputs) {
        const totalSuper = baseInputs.yourCurrentSuper + baseInputs.partnerCurrentSuper;
        return totalSuper > 500000 ? 'HIGH POSITIVE' : 'POSITIVE';
    }

    calculateSuperTaxImpact(config, baseInputs) {
        if (config.superAccess === 'pension-mode') return 'Ongoing pension tax treatment';
        return 'Lump sum tax treatment applies';
    }

    calculateResidencyImpact(config, baseInputs) {
        return config.maintainResidency ? 'NEUTRAL' : 'HIGH POSITIVE';
    }

    calculateResidencyTaxImpact(config, baseInputs) {
        if (config.maintainResidency) return 'Pay Australian tax on all income';
        return 'Only Australian-source income taxed in Australia';
    }

    calculateReturnFrequencyImpact(config, baseInputs) {
        const travelCosts = config.returnFrequency === 'seasonal' ? 20000 : 10000;
        return travelCosts < baseInputs.currentSavings * 0.05 ? 'NEUTRAL' : 'NEGATIVE';
    }

    calculateReturnPensionImpact(frequency) {
        if (frequency === 'seasonal') return 'May maintain full rate';
        if (frequency === 'quarterly') return 'Portability may apply';
        return 'Overseas rate likely';
    }

    calculateReturnTaxImpact(frequency) {
        if (frequency === 'seasonal') return 'May remain tax resident';
        return 'Likely non-resident treatment';
    }

    getReturnTimeDescription(frequency) {
        const descriptions = {
            'annually': '3-4 weeks per year',
            'biannually': '6-8 weeks total per year',
            'quarterly': '3-4 months per year',
            'seasonal': '6 months each year'
        };
        return descriptions[frequency] || 'Varies';
    }

    // Update overseas status banner
    updateOverseasStatus(config, scenarios) {
        const pensionStatus = $('overseasPensionStatus');
        const taxStatus = $('overseasTaxStatus');
        const assetStatus = $('overseasAssetStatus');

        if (pensionStatus) {
            pensionStatus.textContent = this.calculateAgePensionImpact(config, this.collectInputs());
        }
        if (taxStatus) {
            taxStatus.textContent = config.maintainResidency ? 'Australian resident' : 'Non-resident likely';
        }
        if (assetStatus) {
            assetStatus.textContent = config.propertyStrategy === 'transfer-trust' ? 'Trust structure' : 'Personal ownership';
        }
    }

    // Display overseas scenarios in the UI
    displayOverseasScenarios(scenarios) {
        const container = $('overseasScenariosResults');
        if (!container) return;

        const grid = container.querySelector('.grid');
        if (!grid) return;

        grid.innerHTML = scenarios.map(scenario => `
            <div class="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow">
                <div class="flex justify-between items-start mb-3">
                    <h4 class="font-semibold text-gray-900">${scenario.title}</h4>
                    <span class="px-2 py-1 text-xs font-semibold rounded-full ${
                        scenario.riskLevel === 'LOW' ? 'bg-green-100 text-green-800' :
                        scenario.riskLevel === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                    }">
                        Risk: ${scenario.riskLevel}
                    </span>
                </div>

                <p class="text-sm text-gray-600 mb-4">${scenario.description}</p>

                <div class="space-y-3 mb-4">
                    <div>
                        <span class="text-xs font-medium text-gray-700">Impact:</span>
                        <span class="text-xs ml-2 px-2 py-1 rounded ${
                            scenario.impact === 'POSITIVE' || scenario.impact === 'HIGH POSITIVE' || scenario.impact === 'VERY HIGH POSITIVE'
                                ? 'bg-green-100 text-green-800' :
                            scenario.impact === 'NEGATIVE' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                        }">${scenario.impact}</span>
                    </div>

                    <div>
                        <span class="text-xs font-medium text-gray-700">Age Pension:</span>
                        <span class="text-xs ml-2 text-gray-600">${scenario.agePensionStatus}</span>
                    </div>

                    <div>
                        <span class="text-xs font-medium text-gray-700">Tax:</span>
                        <span class="text-xs ml-2 text-gray-600">${scenario.taxImplications}</span>
                    </div>

                    <div>
                        <span class="text-xs font-medium text-gray-700">Timeline:</span>
                        <span class="text-xs ml-2 px-2 py-1 bg-purple-100 text-purple-800 rounded">${scenario.timeline}</span>
                    </div>
                </div>

                <div class="border-t pt-3">
                    <span class="text-xs font-medium text-gray-700 mb-2 block">Key Factors:</span>
                    <ul class="text-xs text-gray-600 space-y-1">
                        ${scenario.keyFactors.map(factor => `<li>• ${factor}</li>`).join('')}
                    </ul>
                </div>
            </div>
        `).join('');
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
                        <div class="flex items-center gap-2 mb-1">
                            <span class="text-xs font-semibold uppercase text-gray-500">${rec.category}</span>
                            ${rec.feasibility && rec.feasibility !== 'Standard Strategy' ?
                                `<span class="text-xs px-2 py-1 rounded ${rec.feasibility.includes('Easily') || rec.feasibility.includes('Comfortable') ? 'bg-green-100 text-green-700' :
                                  rec.feasibility.includes('Major') || rec.feasibility.includes('Complex') ? 'bg-red-100 text-red-700' :
                                  'bg-yellow-100 text-yellow-700'}">${rec.feasibility}</span>` : ''}
                        </div>
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
                ${rec.factorsChanged && rec.factorsChanged.length > 0 ? `
                    <div class="mt-3 text-xs text-gray-600 bg-gray-50 p-2 rounded">
                        <strong>What Changes:</strong>
                        <ul class="mt-1 ml-3 list-disc space-y-0.5">
                            ${rec.factorsChanged.slice(0, 4).map(factor => `<li>${factor}</li>`).join('')}
                            ${rec.factorsChanged.length > 4 ? `<li class="text-gray-400">...and ${rec.factorsChanged.length - 4} more changes</li>` : ''}
                        </ul>
                    </div>
                ` : ''}
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

            // Store results for Risk Analysis tab
            this.currentMonteCarloResults = results;

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

            // Add narrative explanation
            const narrativeContainer = $('monteCarloNarrative');
            if (narrativeContainer) {
                narrativeContainer.innerHTML = this.generateMonteCarloNarrative(results, inputs);
                narrativeContainer.classList.remove('hidden');
            }

            // Add chart explanations
            const fanChartContainer = $('fanChartContainer');
            if (fanChartContainer) {
                const existingExplanation = fanChartContainer.querySelector('.chart-explanation');
                if (existingExplanation) {
                    existingExplanation.remove();
                }

                const explanationDiv = document.createElement('div');
                explanationDiv.className = 'chart-explanation';
                explanationDiv.innerHTML = this.generateFanChartExplanation(inputs);
                fanChartContainer.insertBefore(explanationDiv, fanChartContainer.firstChild);
            }

            const histChartContainer = $('histChartContainer');
            if (histChartContainer) {
                const existingExplanation = histChartContainer.querySelector('.chart-explanation');
                if (existingExplanation) {
                    existingExplanation.remove();
                }

                const explanationDiv = document.createElement('div');
                explanationDiv.className = 'chart-explanation';
                explanationDiv.innerHTML = this.generateHistogramExplanation(results);
                histChartContainer.insertBefore(explanationDiv, histChartContainer.firstChild);
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

        const currentPlan = scenarios[0]; // Current Plan is always first
        const alternativeScenarios = scenarios.slice(1);

        // Find best alternative scenario (excluding current plan)
        let bestAlternative = null;
        let worstAlternative = null;

        if (alternativeScenarios.length > 0) {
            bestAlternative = alternativeScenarios.reduce((best, scenario) => {
                const bestScore = (best.successRate * 0.7) + ((best.medianBalance / currentPlan.medianBalance) * 0.3);
                const scenarioScore = (scenario.successRate * 0.7) + ((scenario.medianBalance / currentPlan.medianBalance) * 0.3);
                return scenarioScore > bestScore ? scenario : best;
            });

            worstAlternative = alternativeScenarios.reduce((worst, scenario) =>
                scenario.successRate < worst.successRate ? scenario : worst);
        }

        container.innerHTML = `
            <div class="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 class="font-semibold text-blue-900">Your Current Plan</h4>
                <div class="text-lg font-bold text-blue-700">${formatPercent(currentPlan.successRate)} Success</div>
                <div class="text-sm text-blue-600">${formatCurrency(currentPlan.medianBalance)} median balance</div>
            </div>
            ${bestAlternative ? `
            <div class="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 class="font-semibold text-green-900">Best Alternative</h4>
                <div class="text-lg font-bold text-green-700">${formatPercent(bestAlternative.successRate)} Success</div>
                <div class="text-sm text-green-600">${bestAlternative.name}</div>
                <div class="text-xs text-green-500 mt-1">
                    ${((bestAlternative.successRate - currentPlan.successRate) * 100).toFixed(1)}% vs Current Plan
                </div>
            </div>
            ` : ''}
            ${worstAlternative ? `
            <div class="p-4 bg-red-50 border border-red-200 rounded-lg">
                <h4 class="font-semibold text-red-900">Riskiest Alternative</h4>
                <div class="text-lg font-bold text-red-700">${formatPercent(worstAlternative.successRate)} Success</div>
                <div class="text-sm text-red-600">${worstAlternative.name}</div>
                <div class="text-xs text-red-500 mt-1">
                    ${((worstAlternative.successRate - currentPlan.successRate) * 100).toFixed(1)}% vs Current Plan
                </div>
            </div>
            ` : ''}
        `;
    }

    populateScenarioComparisonTable(scenarios) {
        const tableBody = $('scenarioComparisonTable');
        if (!tableBody) return;

        const baseScenario = scenarios[0]; // Current Plan is always first

        tableBody.innerHTML = scenarios.map((scenario, index) => {
            const riskScore = index === 0 ?
                this.simulator.calculateRiskAdjustedScore(scenario) :
                this.simulator.calculateRiskAdjustedScore(scenario, baseScenario);

            const recommendation = index === 0 ? 'Current Plan (Baseline)' :
                this.simulator.generateScenarioRecommendation(scenario, baseScenario);

            // Calculate difference indicators
            let successRateIndicator = '';
            let balanceIndicator = '';

            if (index > 0) {
                const successDiff = scenario.successRate - baseScenario.successRate;
                const balanceDiff = scenario.medianBalance - baseScenario.medianBalance;

                successRateIndicator = successDiff > 0.01 ? '↗️' : successDiff < -0.01 ? '↘️' : '→';
                balanceIndicator = balanceDiff > 10000 ? '↗️' : balanceDiff < -10000 ? '↘️' : '→';
            }

            return `
                <tr class="${index === 0 ? 'bg-blue-50' : 'hover:bg-gray-50'}">
                    <td class="px-4 py-3 font-medium text-gray-900">
                        ${scenario.name}
                        ${index === 0 ? '<span class="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Baseline</span>' : ''}
                    </td>
                    <td class="px-4 py-3 text-center">
                        <div class="flex items-center justify-center space-x-1">
                            <span class="font-semibold ${scenario.successRate >= 0.7 ? 'text-green-600' : scenario.successRate >= 0.5 ? 'text-yellow-600' : 'text-red-600'}">
                                ${formatPercent(scenario.successRate)}
                            </span>
                            ${successRateIndicator ? `<span class="text-xs">${successRateIndicator}</span>` : ''}
                        </div>
                    </td>
                    <td class="px-4 py-3 text-center">
                        <div class="flex items-center justify-center space-x-1">
                            <span class="font-semibold">
                                ${formatCurrency(scenario.medianBalance)}
                            </span>
                            ${balanceIndicator ? `<span class="text-xs">${balanceIndicator}</span>` : ''}
                        </div>
                    </td>
                    <td class="px-4 py-3 text-center">
                        <div class="flex flex-col items-center">
                            <span class="px-2 py-1 rounded text-xs font-medium ${
                index === 0 ? 'bg-blue-100 text-blue-800' :
                    riskScore >= 60 ? 'bg-green-100 text-green-800' :
                        riskScore >= 40 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
            }">
                                ${riskScore}
                            </span>
                            <span class="text-xs text-gray-500 mt-1">
                                ${index === 0 ? 'Quality' : 'vs Base'}
                            </span>
                        </div>
                    </td>
                    <td class="px-4 py-3 text-center text-sm ${
                index === 0 ? 'text-blue-600 font-medium' :
                    recommendation.includes('+') && (recommendation.includes('success') || recommendation.includes('balance')) ? 'text-green-600 font-medium' :
                        recommendation.includes('-') ? 'text-red-600' :
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

        // Double-check for any existing chart on this canvas
        const existingChart = Chart.getChart(canvas);
        if (existingChart) {
            console.warn('Found existing chart on scenarioComparisonChart canvas, destroying it');
            existingChart.destroy();
        }

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
    async exportResults(exportType) {
        if (!exportType) {
            showNotification('Export type must be specified.', 'warning');
            return;
        }

        if (!this.currentResults) {
            showNotification('No results to export. Please run a calculation first.', 'warning');
            return;
        }

        const { exportToCSV, exportToXLSX, exportToPDF } = await import(/* webpackChunkName: "export-utils" */ './utils.js');

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
                const chartManagerXLSX = await this.getChartManager();
                exportToXLSX(this.collectInputs(), this.currentResults, chartManagerXLSX, this);
                break;
            case 'pdf':
                const chartManagerPDF = await this.getChartManager();
                exportToPDF(this.collectInputs(), this.currentResults, chartManagerPDF, this);
                break;
            default:
                showNotification(`Invalid export type: ${exportType}`, 'error');
        }
    }

    // User Data Export/Import functionality
    async exportUserInputs() {
        const inputs = this.collectInputs();
        const scenarioName = prompt('Enter a name for this scenario:', 'My Retirement Plan') || 'My Retirement Plan';
        exportUserData(inputs, scenarioName);
    }

    async importUserInputs() {
        try {
            const importedData = await importUserData();

            // Populate the form with imported data
            const result = populateFormFromData(importedData.userData);

            // Trigger currency and percentage input formatting
            initializeCurrencyInputs();
            initializePercentageInputs();

            // Update risk profile and allocation displays
            setTimeout(() => {
                const inputs = this.collectInputs();
                this.updateRiskProfile(inputs);
                this.updateRecommendedAllocation(inputs);

                // Optionally trigger a calculation
                this.calculateRetirement(false);
            }, 100);

        } catch (error) {
            showNotification(error, 'error');
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

            if (totalSalary > 190000) marginalRate = 45;
            else if (totalSalary > 135000) marginalRate = 37;
            else if (totalSalary > 45000) marginalRate = 30;
            else if (totalSalary > 18200) marginalRate = 16;

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
        // Prevent duplicate event listener setup
        if (this.eventListenersSetup) {
            return;
        }
        this.eventListenersSetup = true;

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

        // Generate Suggestions button
        const btnGenerateSuggestions = $('generateSuggestionsBtn');
        if (btnGenerateSuggestions) {
            btnGenerateSuggestions.addEventListener('click', () => this.generatePersonalizedSuggestions());
        }

        // Generate Overseas Scenarios button
        const btnGenerateOverseasScenarios = $('generateOverseasScenarios');
        if (btnGenerateOverseasScenarios) {
            btnGenerateOverseasScenarios.addEventListener('click', () => this.generateOverseasScenarios());
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
            btnScenarioComparison.addEventListener('click', () => {
                // Initialize scenario comparison tab
                this.initializeScenarioComparison();
                // TODO: Save current inputs before navigating
                // This removes the navigation to new page for Scenario's
                // this.saveInputs();
                // Navigate to comparison page
                // window.location.href = 'comparison.html';
            });
        }

        // Reset to defaults button
        const btnResetDefaults = $('btnResetDefaults');
        if (btnResetDefaults) {
            btnResetDefaults.addEventListener('click', () => this.resetToDefaults());
        }

        // Clear Cache button
        const btnClearCache = $('clearCacheBtn');
        if (btnClearCache) {
            btnClearCache.addEventListener('click', () => this.clearCache());
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

        // User Data Import/Export buttons
        const btnExportUserData = $('btnExportUserData');
        const btnImportUserData = $('btnImportUserData');

        if (btnExportUserData) {
            btnExportUserData.addEventListener('click', (e) => {
                e.preventDefault();
                this.exportUserInputs();
            });
        }

        if (btnImportUserData) {
            btnImportUserData.addEventListener('click', (e) => {
                e.preventDefault();
                this.importUserInputs();
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

            // Show tooltip on hover/focus - enhanced for all browsers including Edge
            riskTolerance.addEventListener('mouseenter', (e) => {
                this.showRiskToleranceTooltip(e);
            });
            riskTolerance.addEventListener('mouseleave', (e) => {
                this.hideRiskToleranceTooltip(e);
            });
            riskTolerance.addEventListener('focus', (e) => {
                this.showRiskToleranceTooltip(e);
            });
            riskTolerance.addEventListener('blur', (e) => {
                this.hideRiskToleranceTooltip(e);
            });

            // Additional events for better Edge support
            riskTolerance.addEventListener('pointerenter', (e) => {
                this.showRiskToleranceTooltip(e);
            });
            riskTolerance.addEventListener('pointerleave', (e) => {
                this.hideRiskToleranceTooltip(e);
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

        // Partner field dependency logic
        this.setupPartnerFieldDependencies();

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

    // Setup partner field dependencies
    setupPartnerFieldDependencies() {
        const partnerAgeField = $('partnerCurrentAge');
        const partnerFields = [
            'partnerRetirementAge',
            'partnerLifespan',
            'partnerSalary',
            'partnerCurrentSuper'
        ];

        if (!partnerAgeField) return;

        // Function to handle partner field clearing
        const handlePartnerDependencies = () => {
            const partnerAge = partnerAgeField.value.trim();
            const isPartnerAgeEmpty = partnerAge === '' || partnerAge === '0';

            partnerFields.forEach(fieldId => {
                const field = $(fieldId);
                if (field) {
                    if (isPartnerAgeEmpty) {
                        // Clear field values but keep them enabled
                        field.value = '';
                        // Add subtle styling to indicate dependency
                        field.style.backgroundColor = '#fafafa';
                        field.style.borderColor = '#d1d5db';
                    } else {
                        // Restore normal styling when partner age is provided
                        field.style.backgroundColor = '';
                        field.style.borderColor = '';

                        // If field is empty after age is entered, set reasonable defaults
                        if (field.value.trim() === '') {
                            switch (fieldId) {
                                case 'partnerRetirementAge':
                                    field.value = '60';
                                    break;
                                case 'partnerLifespan':
                                    field.value = '99';
                                    break;
                                case 'partnerSalary':
                                    field.value = '0';
                                    break;
                                case 'partnerCurrentSuper':
                                    field.value = '0';
                                    break;
                            }
                        }
                    }
                }
            });
        };

        // Set up event listener on partner age field
        partnerAgeField.addEventListener('input', handlePartnerDependencies);
        partnerAgeField.addEventListener('blur', handlePartnerDependencies);

        // Run immediately if elements exist, otherwise wait for DOM ready
        if (partnerAgeField && partnerFields.every(id => $(id))) {
            handlePartnerDependencies();
        } else {
            // Fallback for cases where DOM isn't fully ready
            document.addEventListener('DOMContentLoaded', handlePartnerDependencies);
        }
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

    showRiskToleranceTooltip(event) {
        const tooltip = $('riskToleranceTooltip');
        if (tooltip) {
            // Force show tooltip for all browsers
            tooltip.classList.remove('hidden');
            tooltip.style.display = 'block';
            tooltip.style.opacity = '1';

            // Ensure the description is updated
            const riskTolerance = $('riskTolerance');
            if (riskTolerance) {
                this.updateRiskToleranceDisplay(riskTolerance.value);
            }
        }
    }

    hideRiskToleranceTooltip(event) {
        const tooltip = $('riskToleranceTooltip');
        if (tooltip) {
            // Use a small delay to allow for smooth transitions
            setTimeout(() => {
                tooltip.classList.add('hidden');
                tooltip.style.display = '';
                tooltip.style.opacity = '';
            }, 150);
        }
    }

    // Form persistence methods
    /**
     * Returns a categorized object of all form input IDs that should be persisted.
     * Each key represents a category, and its value is an array of input field IDs.
     * This structure improves maintainability and clarity for form persistence.
     *
     * Example return value:
     * {
     *   personalDetails: ['yourCurrentAge', ...],
     *   riskProfile: ['riskTolerance', ...],
     *   ...
     * }
     */
    getAllFormInputs() {
        return {
            personalDetails: [
                'yourCurrentAge', 'partnerCurrentAge', 'retirementAge', 'partnerRetirementAge',
                'yourLifespan', 'partnerLifespan'
            ],
            riskProfile: [
                'riskTolerance', 'hasEmergencyFund', 'hasDebt', 'dependents'
            ],
            finances: [
                'yourSalary', 'partnerSalary', 'yourCurrentSuper', 'partnerCurrentSuper',
                'currentSavings', 'currentStocks', 'monthlyStockContribution', 'percentIncomeSaved'
            ],
            property: [
                'homeValue', 'mortgageBalance', 'mortgageRate', 'monthlyMortgagePayment',
                'planToDownsize', 'hasInvestmentProperty', 'investmentPropertyValue',
                'investmentPropertyLoan', 'investmentPropertyRate', 'weeklyRentalIncome',
                'annualPropertyExpenses', 'propertyGrowthRate', 'sellPropertyYears',
                'capitalGainsTaxRate'
            ],
            trust: [
                'hasTrustAssets', 'trustType', 'trustControlLevel', 'trustNetAssets',
                'trustAttributionPercentage', 'trustAnnualDistributions', 'homeInTrust',
                'investmentPropertyInTrust', 'stocksInTrust'
            ],
            healthcare: [
                'currentHealthcareCosts', 'healthcareInflation', 'agedCareProbability',
                'agedCareStartAge', 'agedCareDuration', 'agedCareAnnualCost'
            ],
            economic: [
                'inflation', 'investmentReturn', 'returnDeclineRate', 'savingsReturn',
                'superReturn', 'useGlidePath', 'glidePathRule', 'australianEquityAllocation',
                'dividendYield', 'frankingRate', 'frankingCreditBenefit'
            ],
            salaryProgression: [
                'salaryGrowthRate', 'leanYearsStart', 'leanYearsReduction'
            ],
            pensionSystem: [
                'asfaComfortable', 'agePensionMax', 'pensionAssetThreshold',
                'pensionAssetLimit', 'pensionIncomeThreshold'
            ],
            simulation: [
                'numRuns', 'returnVolatility', 'enableShocks', 'shockProbability', 'shockMagnitude'
            ]
        };
    }

    saveAllInputs() {
        /**
         * Save all form inputs to localStorage
         */
        const formData = {};
        const inputIds = Object.values(this.getAllFormInputs()).flat();

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
        const inputIds = Object.values(this.getAllFormInputs()).flat();

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

            // Trust
            'hasTrustAssets': config.trust.hasTrustAssets,
            'trustType': config.trust.trustType,
            'trustControlLevel': config.trust.trustControlLevel,
            'trustNetAssets': config.trust.trustNetAssets,
            'trustAttributionPercentage': config.trust.trustAttributionPercentage,
            'trustAnnualDistributions': config.trust.trustAnnualDistributions,
            'homeInTrust': config.trust.homeInTrust,
            'investmentPropertyInTrust': config.trust.investmentPropertyInTrust,
            'stocksInTrust': config.trust.stocksInTrust,

            // Healthcare
            'currentHealthcareCosts': config.healthcare.currentHealthcareCosts,
            'healthcareInflation': config.healthcare.healthcareInflation,
            'agedCareProbability': config.healthcare.agedCareProbability,
            'agedCareStartAge': config.healthcare.agedCareStartAge,
            'agedCareDuration': config.healthcare.agedCareDuration,
            'agedCareAnnualCost': config.healthcare.agedCareAnnualCost,

            // Economic
            'inflation': config.economic.inflation,
            'investmentReturn': config.economic.investmentReturn,
            'returnDeclineRate': config.economic.returnDeclineRate,
            'savingsReturn': config.economic.savingsReturn,
            'superReturn': config.economic.superReturn,
            'useGlidePath': config.allocation.useGlidePath,
            'glidePathRule': config.allocation.glidePathRule,
            'australianEquityAllocation': config.allocation.australianEquityAllocation,
            'dividendYield': config.allocation.dividendYield,
            'frankingRate': config.allocation.frankingRate,
            'frankingCreditBenefit': config.allocation.frankingCreditBenefit,

            // Salary Progression
            'salaryGrowthRate': config.economic.salaryGrowthRate,
            'leanYearsStart': config.economic.leanYearsStart,
            'leanYearsReduction': config.economic.leanYearsReduction,

            // Pension System
            'asfaComfortable': config.pension.asfaComfortable,
            'agePensionMax': config.pension.agePensionMax,
            'pensionAssetThreshold': config.pension.pensionAssetThreshold,
            'pensionAssetLimit': config.pension.pensionAssetLimit,
            'pensionIncomeThreshold': config.pension.pensionIncomeThreshold,

            // Simulation
            'numRuns': config.simulation.numRuns,
            'returnVolatility': config.simulation.returnVolatility,
            'enableShocks': config.simulation.enableShocks,
            'shockProbability': config.simulation.shockProbability,
            'shockMagnitude': config.simulation.shockMagnitude
        };

        return defaultMap[inputId];
    }

    clearCache() {
        if (confirm('Are you sure you want to clear the cache? This will reset all your inputs to the default values.')) {
            // Clear localStorage and sessionStorage
            localStorage.clear();
            sessionStorage.clear();

            // Clear cookies
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i];
                const eqPos = cookie.indexOf('=');
                const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
                document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
            }

            // Force a hard reload
            location.reload(true);
        }
    }

    setupAutoSave() {
        /**
         * Setup automatic saving of form inputs when they change
         */
        const inputIds = Object.values(this.getAllFormInputs()).flat();
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

    // Cash Flow Input Validation and UI Enhancement
    validateCashFlowInputs(inputs) {
        const validationResults = {
            isValid: true,
            warnings: [],
            errors: [],
            suggestions: []
        };

        // Validate income vs expenses logic
        const totalIncome = inputs.yourSalary + inputs.partnerSalary;
        const monthlyMortgage = inputs.monthlyMortgagePayment || 0;
        const annualMortgage = monthlyMortgage * 12;

        // Housing stress validation
        if (annualMortgage > totalIncome * 0.3) {
            validationResults.warnings.push({
                field: 'monthlyMortgagePayment',
                message: `Mortgage payments (${((annualMortgage / totalIncome) * 100).toFixed(0)}%) exceed recommended 30% of gross income`,
                suggestion: 'Consider refinancing or downsizing to improve cash flow'
            });
        }

        // Dependents validation
        if (inputs.dependents > 0 && totalIncome < 80000) {
            validationResults.warnings.push({
                field: 'dependents',
                message: `Supporting ${inputs.dependents} dependents on $${totalIncome.toLocaleString()} income may be financially challenging`,
                suggestion: 'Consider strategies to increase income or reduce dependent-related costs'
            });
        }
        // Healthcare cost validation
        const expectedHealthcare = 2000 + (inputs.dependents * 1000) + (inputs.yourCurrentAge > 50 ? 2000 : 0);
        if (inputs.currentHealthcareCosts < expectedHealthcare * 0.7) {
            validationResults.suggestions.push({
                field: 'currentHealthcareCosts',
                message: `Healthcare costs may be underestimated. Consider increasing to $${expectedHealthcare.toLocaleString()}`,
                suggestion: 'Review actual medical, dental, and insurance expenses'
            });
        }

        // Savings validation
        const currentSavingsRate = inputs.percentIncomeSaved;
        if (currentSavingsRate > 0.25 && monthlyMortgage > totalIncome / 12 * 0.25) {
            validationResults.warnings.push({
                field: 'percentIncomeSaved',
                message: 'High savings rate combined with high mortgage may create cash flow stress',
                suggestion: 'Verify this savings rate is sustainable with current expenses'
            });
        }

        return validationResults;
    }

    // Enhanced UI feedback for cash flow inputs
    setupCashFlowUI() {
        const keyFields = ['yourSalary', 'partnerSalary', 'monthlyMortgagePayment', 'dependents', 'currentHealthcareCosts'];

        keyFields.forEach(fieldId => {
            const element = $(fieldId);
            if (element) {
                element.addEventListener('blur', () => {
                    this.validateAndDisplayCashFlowFeedback();
                });
            }
        });

        // Add cash flow status indicator to the page
        this.addCashFlowStatusIndicator();
    }

    validateAndDisplayCashFlowFeedback() {
        const inputs = this.collectInputs();
        const validation = this.validateCashFlowInputs(inputs);
        const cashFlowAnalysis = this.simulator.calculateCashFlowAnalysis(inputs);

        // Update cash flow status indicator
        this.updateCashFlowStatusIndicator(cashFlowAnalysis, validation);
    }

    addCashFlowStatusIndicator() {
        // Add a cash flow status section to the Risk Profile section
        const riskSection = $('riskTolerance')?.closest('.mb-6');
        if (riskSection) {
            const statusDiv = document.createElement('div');
            statusDiv.id = 'cashFlowStatus';
            statusDiv.className = 'mt-4 p-3 rounded-lg border';
            statusDiv.innerHTML = `
                <div class="flex items-center justify-between">
                    <span class="text-sm font-medium">Cash Flow Status:</span>
                    <span id="cashFlowStatusText" class="text-sm">Calculating...</span>
                </div>
                <div id="cashFlowDetails" class="mt-2 text-xs text-gray-600 hidden"></div>
            `;
            riskSection.appendChild(statusDiv);
        }
    }

    updateCashFlowStatusIndicator(cashFlowAnalysis, validation) {
        const statusDiv = $('cashFlowStatus');
        const statusText = $('cashFlowStatusText');
        const detailsDiv = $('cashFlowDetails');

        if (!statusDiv || !statusText || !detailsDiv) return;

        const status = cashFlowAnalysis.cashFlow.status;
        const monthlyDisposable = cashFlowAnalysis.cashFlow.monthlyDisposableIncome;

        // Update status colors and text
        statusDiv.className = 'mt-4 p-3 rounded-lg border';
        let statusColor = '';
        let statusMessage = '';

        switch (status) {
            case 'excellent':
                statusColor = 'border-green-500 bg-green-50';
                statusMessage = `Excellent ($${Math.round(monthlyDisposable)}/month available)`;
                break;
            case 'good':
                statusColor = 'border-blue-500 bg-blue-50';
                statusMessage = `Good ($${Math.round(monthlyDisposable)}/month available)`;
                break;
            case 'moderate':
                statusColor = 'border-yellow-500 bg-yellow-50';
                statusMessage = `Moderate ($${Math.round(monthlyDisposable)}/month available)`;
                break;
            case 'tight':
                statusColor = 'border-orange-500 bg-orange-50';
                statusMessage = `Tight ($${Math.round(monthlyDisposable)}/month available)`;
                break;
            case 'stressed':
                statusColor = 'border-red-500 bg-red-50';
                statusMessage = `Stressed ($${Math.round(monthlyDisposable)}/month deficit)`;
                break;
        }

        statusDiv.className += ` ${statusColor}`;
        statusText.textContent = statusMessage;

        // Show validation warnings
        if (validation.warnings.length > 0 || validation.suggestions.length > 0) {
            const allIssues = [...validation.warnings, ...validation.suggestions];
            detailsDiv.innerHTML = allIssues.map(issue =>
                `<div class="mb-1">⚠️ ${issue.message}</div>`
            ).join('');
            detailsDiv.classList.remove('hidden');
        } else {
            detailsDiv.classList.add('hidden');
        }
    }

    // Enhanced Dependent Calculations Setup
    setupDependentCalculations() {
        // Setup collapsible dependent details
        const totalDependentsCountField = $('totalDependentsCount');
        const dependentDetailsSection = $('dependentDetailsSection');
        const dependentSummarySection = $('dependentSummarySection');

        if (totalDependentsCountField && dependentDetailsSection) {
            totalDependentsCountField.addEventListener('input', () => {
                const count = parseInt(totalDependentsCountField.value) || 0;
                if (count > 0) {
                    dependentDetailsSection.classList.remove('hidden');
                    if (dependentSummarySection) {
                        dependentSummarySection.classList.add('hidden');
                    }
                } else {
                    dependentDetailsSection.classList.add('hidden');
                    if (dependentSummarySection) {
                        dependentSummarySection.classList.add('hidden');
                    }
                }
                this.calculateDependentCosts();
            });
        }

        // Setup global collapse/expand functions
        window.showDependentDetails = () => {
            if (dependentDetailsSection) {
                dependentDetailsSection.classList.remove('hidden');
            }
            if (dependentSummarySection) {
                dependentSummarySection.classList.add('hidden');
            }
        };

        window.collapseDependentDetails = () => {
            if (dependentDetailsSection) {
                dependentDetailsSection.classList.add('hidden');
            }
            if (dependentSummarySection) {
                dependentSummarySection.classList.remove('hidden');
            }
            this.updateDependentSummary();
        };

        window.showAllCategories = () => {
            const categories = [
                'childrenUnder5', 'childrenPrimary', 'teenagers', 'adultDisabled',
                'elderlyIndependent', 'elderlyHomeCare', 'elderlyResidential', 'otherDependents'
            ];
            categories.forEach(category => {
                const rowElement = $(category + 'Row');
                if (rowElement) {
                    rowElement.classList.remove('hidden');
                }
            });
        };

        const dependentFields = [
            'childrenUnder5', 'childrenUnder5Percent',
            'childrenPrimary', 'childrenPrimaryPercent',
            'teenagers', 'teenagersPercent',
            'adultDisabled', 'adultDisabledPercent',
            'elderlyIndependent', 'elderlyIndependentPercent',
            'elderlyHomeCare', 'elderlyHomeCarePercent',
            'elderlyResidential', 'elderlyResidentialPercent',
            'otherDependents', 'otherDependentsPercent'
        ];

        // Add event listeners to all dependent fields
        dependentFields.forEach(fieldId => {
            const element = $(fieldId);
            if (element) {
                element.addEventListener('input', () => {
                    this.calculateDependentCosts();
                    this.showOnlyPopulatedCategories();
                    this.updateDependentSummary();
                });
            }
        });

        // Initial calculation
        this.calculateDependentCosts();
    }

    updateDependentSummary() {
        const categories = [
            { id: 'childrenUnder5', name: 'Children (0-5)' },
            { id: 'childrenPrimary', name: 'Children (6-12)' },
            { id: 'teenagers', name: 'Teenagers (13-18)' },
            { id: 'adultDisabled', name: 'Adult Disabled' },
            { id: 'elderlyIndependent', name: 'Elderly Independent' },
            { id: 'elderlyHomeCare', name: 'Elderly Home Care' },
            { id: 'elderlyResidential', name: 'Elderly Residential' },
            { id: 'otherDependents', name: 'Other Dependents' }
        ];

        const populatedCategories = [];
        categories.forEach(category => {
            const count = parseInt(safeGetValue(category.id, 0)) || 0;
            const percent = parseInt(safeGetValue(category.id + 'Percent', 0)) || 0;
            if (count > 0 && percent > 0) {
                populatedCategories.push(`${count} ${category.name} (${percent}%)`);
            }
        });

        const summaryTextEl = $('dependentSummaryText');
        if (summaryTextEl) {
            if (populatedCategories.length > 0) {
                summaryTextEl.textContent = populatedCategories.join(', ');
            } else {
                summaryTextEl.textContent = 'No dependents configured - Click to add';
            }
        }
    }

    showOnlyPopulatedCategories() {
        const categories = [
            'childrenUnder5', 'childrenPrimary', 'teenagers', 'adultDisabled',
            'elderlyIndependent', 'elderlyHomeCare', 'elderlyResidential', 'otherDependents'
        ];

        categories.forEach(category => {
            const count = parseInt(safeGetValue(category, 0)) || 0;
            const percent = parseInt(safeGetValue(category + 'Percent', 0)) || 0;
            const rowElement = $(category + 'Row');

            if (rowElement) {
                if (count > 0 && percent > 0) {
                    rowElement.classList.remove('hidden');
                } else {
                    rowElement.classList.add('hidden');
                }
            }
        });
    }

    calculateDependentCosts() {
        // Monthly cost estimates based on 2025 Australian data
        const monthlyCosts = {
            childrenUnder5: 2835, // $135/day × 21 days/month
            childrenPrimary: 800,  // School, activities, after-school care
            teenagers: 600,        // Technology, activities, pre-independence
            adultDisabled: 500,    // Your portion after NDIS covers most
            elderlyIndependent: 200, // Occasional support
            elderlyHomeCare: 400,   // Your extras beyond government support
            elderlyResidential: 1500, // Your portion of residential care
            otherDependents: 300    // Variable support
        };

        let totalDependents = 0;
        let totalSystemCost = 0;
        let yourMonthlyCost = 0;

        // Calculate costs for each category
        Object.keys(monthlyCosts).forEach(category => {
            const countField = $(category);
            const percentField = $(category + 'Percent');

            if (countField && percentField) {
                const count = parseInt(countField.value) || 0;
                const percent = parseInt(percentField.value) || 0;

                totalDependents += count;
                const categorySystemCost = count * monthlyCosts[category];
                const categoryYourCost = categorySystemCost * (percent / 100);

                totalSystemCost += categorySystemCost;
                yourMonthlyCost += categoryYourCost;
            }
        });

        // Calculate overall percentage
        const yourSharePercent = totalSystemCost > 0 ? (yourMonthlyCost / totalSystemCost * 100) : 0;

        // Update display elements
        const totalDependentsEl = $('totalDependents');
        const yourMonthlyCostEl = $('yourMonthlyCost');
        const totalSystemCostEl = $('totalSystemCost');
        const yourSharePercentEl = $('yourSharePercent');
        const hiddenDependentsField = $('dependents');

        if (totalDependentsEl) totalDependentsEl.textContent = totalDependents;
        if (yourMonthlyCostEl) yourMonthlyCostEl.textContent = `$${Math.round(yourMonthlyCost).toLocaleString()}`;
        if (totalSystemCostEl) totalSystemCostEl.textContent = `$${Math.round(totalSystemCost).toLocaleString()}/month`;
        if (yourSharePercentEl) yourSharePercentEl.textContent = `${Math.round(yourSharePercent)}%`;

        // Update hidden field for backward compatibility
        if (hiddenDependentsField) hiddenDependentsField.value = totalDependents;

        // Update cash flow status if needed
        if (this.validateAndDisplayCashFlowFeedback) {
            this.validateAndDisplayCashFlowFeedback();
        }
    }

    // Cash Flow Analysis Helper Functions
    getCashFlowStatusColor(status) {
        const colorMap = {
            'excellent': 'border-green-500 bg-green-50',
            'good': 'border-blue-500 bg-blue-50',
            'moderate': 'border-yellow-500 bg-yellow-50',
            'tight': 'border-orange-500 bg-orange-50',
            'stressed': 'border-red-500 bg-red-50'
        };
        return colorMap[status] || colorMap['moderate'];
    }

    getCashFlowOpportunityColor(type) {
        const colorMap = {
            'immediate': 'border-l-green-500',
            'short_term': 'border-l-blue-500',
            'medium_term': 'border-l-yellow-500',
            'long_term': 'border-l-purple-500',
            'major_change': 'border-l-red-500'
        };
        return colorMap[type] || colorMap['medium_term'];
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

// Auto-initialize when loaded - prevent double initialization
function initializeApp() {
    // Prevent double initialization
    if (window.app && window.app.isInitialized) {
        console.log('App already exists & initialized, skipping initialization...');
        return;
    }

    try {
        const app = new RetirementCalculatorApp();
        window.app = app;
        window.RetirementCalculatorApp = RetirementCalculatorApp;

        // The app auto-initializes in constructor, so just mark as initialized
        app.isInitialized = true;
        console.log('✅ Australian Retirement Calculator loaded successfully');
    } catch (error) {
        console.error('Failed to initialize app:', error);
    }
}

// Initialize based on DOM state
if (document.readyState === 'loading') {
    // DOM is still loading, wait for DOMContentLoaded
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    // DOM is already loaded, initialize immediately
    initializeApp();
}