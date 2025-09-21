/**
 * Enhanced Australian Retirement Calculator - Main Application Controller
 * Orchestrates all modules and handles user interactions, calculations, and results display
 */

import { CONFIG } from './config.js';
import { Utils } from './utils.js';
import RetirementSimulator, { TaxCalculator, PensionCalculator, HealthcareCalculator, PortfolioCalculator } from './simulator.js';
import { chartManager } from './charts.js';

// Main Application Class
class RetirementCalculatorApp {
    constructor() {
        this.currentResults = null;
        this.monteCarloResults = null;
        this.simulator = null;
        
        // Initialize the application
        this.init();
    }

    /**
     * Initialize the application
     */
    async init() {
        console.log('Initializing Enhanced Australian Retirement Calculator...');
        
        // Load saved inputs
        this.loadSavedInputs();
        
        // Set up event listeners
        this.setupEventListeners();
        
        // Update risk assessment
        this.updateRiskAssessment();
        
        // Run initial calculation
        await this.calculateRetirement();
        
        console.log('Application initialized successfully');
    }

    /**
     * Set up all event listeners
     */
    setupEventListeners() {
        // Main calculation buttons
        Utils.DOM.addListener('btnCalculate', 'click', () => this.calculateRetirement());
        Utils.DOM.addListener('btnAdvancedMonteCarlo', 'click', () => this.runMonteCarloSimulation());
        Utils.DOM.addListener('btnStressTest', 'click', () => this.runStressTest());
        Utils.DOM.addListener('btnExportCSV', 'click', () => this.exportResults());

        // Input change handlers for auto-calculation
        const inputIds = [
            'yourCurrentAge', 'partnerCurrentAge', 'retirementAge', 'partnerRetirementAge',
            'yourLifespan', 'partnerLifespan', 'yourSalary', 'partnerSalary', 'currentSuper',
            'currentSavings', 'currentStocks', 'monthlyStockContribution', 'percentIncomeSaved',
            'homeValue', 'mortgageBalance', 'mortgageRate', 'planToDownsize',
            'currentHealthExpenses', 'healthInflationRate', 'agedCareProbability', 'agedCareCost',
            'privateHealthInsurance', 'investmentPropertyValue', 'investmentPropertyLoan',
            'weeklyRentalIncome', 'annualPropertyExpenses', 'sellPropertyYears',
            'allocEquities', 'allocBonds', 'allocCash', 'frankingCredits', 'dynamicAllocation',
            'inflation', 'investmentReturn', 'superReturn', 'returnVolatility',
            'asfaComfortable', 'agePensionMax', 'pensionAssetThreshold', 'pensionAssetLimit'
        ];

        inputIds.forEach(id => {
            Utils.DOM.addListener(id, 'change', () => {
                this.saveInputs();
                this.updateRiskAssessment();
                // Debounced auto-calculation
                clearTimeout(this.autoCalcTimeout);
                this.autoCalcTimeout = setTimeout(() => this.calculateRetirement(), 1000);
            });
        });

        // Risk tolerance change handler
        Utils.DOM.addListener('riskTolerance', 'change', () => {
            this.updateRiskAssessment();
            this.updateAllocationFromRisk();
        });

        // Preset allocation handler
        Utils.DOM.addListener('presetAllocation', 'change', () => {
            this.updateAllocationFromPreset();
        });

        // Market shocks toggle
        Utils.DOM.addListener('enableMarketShocks', 'change', (e) => {
            Utils.DOM.toggle('shockControls', e.target.checked);
        });

        // Window resize handler for charts
        window.addEventListener('resize', () => {
            chartManager.resizeAllCharts();
        });
    }

    /**
     * Collect all input values
     */
    collectInputs() {
        return {
            // Personal details
            yourCurrentAge: Utils.DOM.getNumericValue('yourCurrentAge', CONFIG.DEFAULTS.yourCurrentAge),
            partnerCurrentAge: Utils.DOM.getNumericValue('partnerCurrentAge', CONFIG.DEFAULTS.partnerCurrentAge),
            retirementAge: Utils.DOM.getNumericValue('retirementAge', CONFIG.DEFAULTS.retirementAge),
            partnerRetirementAge: Utils.DOM.getNumericValue('partnerRetirementAge', CONFIG.DEFAULTS.partnerRetirementAge),
            yourLifespan: Utils.DOM.getNumericValue('yourLifespan', CONFIG.DEFAULTS.yourLifespan),
            partnerLifespan: Utils.DOM.getNumericValue('partnerLifespan', CONFIG.DEFAULTS.partnerLifespan),

            // Financial details
            yourSalary: Utils.DOM.getNumericValue('yourSalary', CONFIG.DEFAULTS.yourSalary),
            partnerSalary: Utils.DOM.getNumericValue('partnerSalary', CONFIG.DEFAULTS.partnerSalary),
            currentSuper: Utils.DOM.getNumericValue('currentSuper', CONFIG.DEFAULTS.currentSuper),
            currentSavings: Utils.DOM.getNumericValue('currentSavings', CONFIG.DEFAULTS.currentSavings),
            currentStocks: Utils.DOM.getNumericValue('currentStocks', CONFIG.DEFAULTS.currentStocks),
            monthlyStockContribution: Utils.DOM.getNumericValue('monthlyStockContribution', CONFIG.DEFAULTS.monthlyStockContribution),
            percentIncomeSaved: Utils.DOM.getNumericValue('percentIncomeSaved', CONFIG.DEFAULTS.percentIncomeSaved),

            // Property
            homeValue: Utils.DOM.getNumericValue('homeValue', CONFIG.DEFAULTS.homeValue),
            mortgageBalance: Utils.DOM.getNumericValue('mortgageBalance', CONFIG.DEFAULTS.mortgageBalance),
            mortgageRate: Utils.DOM.getNumericValue('mortgageRate', CONFIG.DEFAULTS.mortgageRate),
            planToDownsize: Utils.DOM.getBooleanValue('planToDownsize', CONFIG.DEFAULTS.planToDownsize),

            // Healthcare (Enhanced)
            currentHealthExpenses: Utils.DOM.getNumericValue('currentHealthExpenses', CONFIG.DEFAULTS.currentHealthExpenses),
            healthInflationRate: Utils.DOM.getNumericValue('healthInflationRate', CONFIG.DEFAULTS.healthInflationRate),
            agedCareProbability: Utils.DOM.getNumericValue('agedCareProbability', CONFIG.DEFAULTS.agedCareProbability),
            agedCareCost: Utils.DOM.getNumericValue('agedCareCost', CONFIG.DEFAULTS.agedCareCost),
            privateHealthInsurance: Utils.DOM.getBooleanValue('privateHealthInsurance', CONFIG.DEFAULTS.privateHealthInsurance),

            // Investment property
            investmentPropertyValue: Utils.DOM.getNumericValue('investmentPropertyValue', 0),
            investmentPropertyLoan: Utils.DOM.getNumericValue('investmentPropertyLoan', 0),
            weeklyRentalIncome: Utils.DOM.getNumericValue('weeklyRentalIncome', 0),
            annualPropertyExpenses: Utils.DOM.getNumericValue('annualPropertyExpenses', 0),
            sellPropertyYears: Utils.DOM.getNumericValue('sellPropertyYears', 0),

            // Risk and allocation
            riskTolerance: Utils.DOM.get('riskTolerance')?.value || 'growth',
            dynamicAllocation: Utils.DOM.getBooleanValue('dynamicAllocation', CONFIG.DEFAULTS.dynamicAllocation),
            allocEquities: Utils.DOM.getNumericValue('allocEquities', CONFIG.DEFAULTS.allocEquities),
            allocBonds: Utils.DOM.getNumericValue('allocBonds', CONFIG.DEFAULTS.allocBonds),
            allocCash: Utils.DOM.getNumericValue('allocCash', CONFIG.DEFAULTS.allocCash),
            frankingCredits: Utils.DOM.getBooleanValue('frankingCredits', CONFIG.DEFAULTS.frankingCredits),

            // Economic assumptions
            inflation: Utils.DOM.getNumericValue('inflation', CONFIG.DEFAULTS.inflation),
            investmentReturn: Utils.DOM.getNumericValue('investmentReturn', CONFIG.DEFAULTS.investmentReturn),
            superReturn: Utils.DOM.getNumericValue('superReturn', CONFIG.DEFAULTS.superReturn),
            returnVolatility: Utils.DOM.getNumericValue('returnVolatility', CONFIG.DEFAULTS.returnVolatility),

            // Australian pension system
            asfaComfortable: Utils.DOM.getNumericValue('asfaComfortable', CONFIG.DEFAULTS.asfaComfortable),
            agePensionMax: Utils.DOM.getNumericValue('agePensionMax', CONFIG.DEFAULTS.agePensionMax),
            pensionAssetThreshold: Utils.DOM.getNumericValue('pensionAssetThreshold', CONFIG.DEFAULTS.pensionAssetThreshold),
            pensionAssetLimit: Utils.DOM.getNumericValue('pensionAssetLimit', CONFIG.DEFAULTS.pensionAssetLimit),

            // Simulation settings
            numRuns: parseInt(Utils.DOM.get('numRuns')?.value || CONFIG.DEFAULTS.numRuns),
            enableSequenceRisk: Utils.DOM.getBooleanValue('enableSequenceRisk', CONFIG.DEFAULTS.enableSequenceRisk),
            enableMarketShocks: Utils.DOM.getBooleanValue('enableMarketShocks', CONFIG.DEFAULTS.enableMarketShocks),
            shockProbability: Utils.DOM.getNumericValue('shockProbability', CONFIG.DEFAULTS.shockProbability),
            shockMagnitude: Utils.DOM.getNumericValue('shockMagnitude', CONFIG.DEFAULTS.shockMagnitude)
        };
    }

    /**
     * Main retirement calculation
     */
    async calculateRetirement() {
        try {
            Utils.Debug.time('Main Calculation');

            const inputs = this.collectInputs();
            
            // Validate inputs
            const validation = this.validateInputs(inputs);
            if (!validation.valid) {
                this.displayError(validation.message);
                return;
            }

            // Create simulator and run calculation
            this.simulator = new RetirementSimulator(inputs);
            this.currentResults = this.simulator.simulate();

            // Display results
            this.displaySummaryResults(inputs, this.currentResults);
            this.displayProjectionTable(this.currentResults);
            this.displayHealthcareAnalysis(inputs, this.currentResults);
            this.displayOptimizationRecommendations(inputs, this.currentResults);

            // Create basic charts
            chartManager.renderHistogram('histChart', [this.currentResults.finalBalance], 'Deterministic Result');
            chartManager.renderHealthcareChart('healthcareChart', this.currentResults.healthcareCosts, inputs);

            Utils.Debug.timeEnd('Main Calculation');
            console.log('Calculation completed successfully');

        } catch (error) {
            console.error('Calculation error:', error);
            this.displayError('An error occurred during calculation. Please check your inputs and try again.');
        }
    }

    /**
     * Run Monte Carlo simulation
     */
    async runMonteCarloSimulation() {
        if (!this.simulator) {
            await this.calculateRetirement();
        }

        const inputs = this.collectInputs();
        const numRuns = inputs.numRuns;

        try {
            Utils.Progress.show();
            
            // Run Monte Carlo simulation with progress updates
            this.monteCarloResults = await this.simulator.runMonteCarlo(numRuns, (progress, text) => {
                Utils.Progress.update(progress, text);
            });

            Utils.Progress.hide();

            // Display Monte Carlo results
            this.displayMonteCarloResults(this.monteCarloResults);
            
            // Create advanced charts
            chartManager.renderHistogram('histChart', this.monteCarloResults.outcomes, 'Monte Carlo Results');
            chartManager.renderFanChart('fanChart', this.monteCarloResults.paths, this.currentResults.balances, inputs);

            // Switch to charts tab
            Utils.Tabs.show('charts');

            console.log('Monte Carlo simulation completed');

        } catch (error) {
            Utils.Progress.hide();
            console.error('Monte Carlo simulation error:', error);
            this.displayError('An error occurred during Monte Carlo simulation.');
        }
    }

    /**
     * Run stress testing scenarios
     */
    async runStressTest() {
        const inputs = this.collectInputs();
        
        const stressScenarios = [
            { name: 'Market Crash (-40%)', returnAdjustment: -40 },
            { name: 'High Inflation (+3%)', inflationAdjustment: 3 },
            { name: 'Low Returns (-2%)', returnAdjustment: -2 },
            { name: 'Healthcare Crisis (+100%)', healthcareAdjustment: 100 },
            { name: 'Combined Stress', returnAdjustment: -20, inflationAdjustment: 2, healthcareAdjustment: 50 }
        ];

        const stressResults = [];

        for (const scenario of stressScenarios) {
            const stressInputs = { ...inputs };
            
            if (scenario.returnAdjustment) {
                stressInputs.investmentReturn += scenario.returnAdjustment;
                stressInputs.superReturn += scenario.returnAdjustment;
            }
            
            if (scenario.inflationAdjustment) {
                stressInputs.inflation += scenario.inflationAdjustment;
            }
            
            if (scenario.healthcareAdjustment) {
                stressInputs.currentHealthExpenses *= (1 + scenario.healthcareAdjustment / 100);
            }

            const stressSimulator = new RetirementSimulator(stressInputs);
            const result = stressSimulator.simulate();
            
            stressResults.push({
                scenario: scenario.name,
                finalBalance: result.finalBalance,
                success: result.success
            });
        }

        this.displayStressTestResults(stressResults);
        Utils.Tabs.show('optimization');
    }

    /**
     * Display summary results
     */
    displaySummaryResults(inputs, results) {
        const yearsToRetirement = inputs.retirementAge - inputs.yourCurrentAge;
        const requiredIncome = inputs.asfaComfortable * Math.pow(1 + inputs.inflation / 100, yearsToRetirement);

        const summaryHTML = `
            <div class="p-3 bg-gray-50 rounded flex justify-between">
                <strong>Years to Retirement:</strong>
                <span>${yearsToRetirement}</span>
            </div>
            <div class="p-3 bg-blue-50 rounded flex justify-between">
                <strong>Future Superannuation:</strong>
                <span class="font-semibold">${Utils.Format.currency(results.futureSuper)}</span>
            </div>
            <div class="p-3 bg-blue-50 rounded flex justify-between">
                <strong>Future Savings:</strong>
                <span class="font-semibold">${Utils.Format.currency(results.futureSavings)}</span>
            </div>
            <div class="p-3 bg-blue-50 rounded flex justify-between">
                <strong>Future Investments:</strong>
                <span class="font-semibold">${Utils.Format.currency(results.futureStocks)}</span>
            </div>
            <div class="p-3 bg-green-50 rounded flex justify-between">
                <strong>Home Equity Available:</strong>
                <span class="font-semibold">${Utils.Format.currency(results.accessibleHomeEquity)}</span>
            </div>
            <div class="p-3 bg-green-50 rounded flex justify-between">
                <strong>Total Accessible Assets:</strong>
                <span class="font-bold text-lg">${Utils.Format.currency(results.totalAccessibleAssets)}</span>
            </div>
            <div class="p-3 bg-red-50 rounded flex justify-between">
                <strong>Income Needed (ASFA):</strong>
                <span class="font-bold text-lg">${Utils.Format.currency(requiredIncome)}</span>
            </div>
            <div class="p-3 bg-purple-50 rounded flex justify-between">
                <strong>Healthcare Costs (Total):</strong>
                <span class="font-semibold">${Utils.Format.currency(results.healthcareCosts?.combinedCosts || 0)}</span>
            </div>
        `;

        Utils.DOM.setHTML('summaryResults', summaryHTML);

        // Display final result
        const finalResultContainer = Utils.DOM.get('finalResult');
        if (results.success && results.finalBalance > 0) {
            finalResultContainer.className = 'result-card bg-green-100 text-green-800';
            finalResultContainer.innerHTML = `
                <div class="font-bold text-xl">✅ Retirement Goal Achieved</div>
                <div class="mt-1">Projected remaining assets: <strong>${Utils.Format.currency(results.finalBalance)}</strong></div>
                <div class="text-sm mt-2">Your retirement plan appears sustainable with current assumptions.</div>
            `;
        } else {
            finalResultContainer.className = 'result-card bg-red-100 text-red-800';
            finalResultContainer.innerHTML = `
                <div class="font-bold text-xl">⚠️ Retirement Shortfall Identified</div>
                <div class="mt-1">Assets may be depleted before end of lifespan</div>
                <div class="text-sm mt-2">Consider the optimization recommendations below.</div>
            `;
        }

        // Display risk analysis
        this.displayRiskAnalysis(inputs, results);
    }

    /**
     * Display risk analysis
     */
    displayRiskAnalysis(inputs, results) {
        const allocation = {
            equity: inputs.allocEquities,
            bonds: inputs.allocBonds,
            cash: inputs.allocCash
        };
        
        const expectedReturn = PortfolioCalculator.calculatePortfolioReturn(allocation);
        const portfolioVolatility = PortfolioCalculator.calculatePortfolioVolatility(allocation);
        
        const riskLevel = portfolioVolatility > 0.15 ? 'high' : portfolioVolatility > 0.10 ? 'medium' : 'low';
        
        const riskAnalysisHTML = `
            <div class="risk-indicator risk-${riskLevel} p-4 rounded">
                <h4 class="font-semibold">Portfolio Risk Assessment</h4>
                <div class="mt-2 text-sm">
                    <div>Expected Return: ${Utils.Format.percentage(expectedReturn)}</div>
                    <div>Portfolio Volatility: ${Utils.Format.percentage(portfolioVolatility)}</div>
                    <div>Risk Level: <span class="font-semibold capitalize">${riskLevel}</span></div>
                </div>
            </div>
            <div class="p-4 bg-gray-50 rounded">
                <h4 class="font-semibold">Success Probability</h4>
                <div class="mt-2 text-sm">
                    <div>Based on deterministic analysis: ${results.success ? '✅ Success' : '❌ Shortfall'}</div>
                    <div class="text-xs text-gray-600 mt-1">Run Monte Carlo simulation for probability assessment</div>
                </div>
            </div>
        `;
        
        Utils.DOM.setHTML('riskAnalysis', riskAnalysisHTML);
    }

    /**
     * Display Monte Carlo results
     */
    displayMonteCarloResults(mcResults) {
        Utils.DOM.toggle('monteCarloResults', true);
        
        Utils.DOM.setText('mcRuns', mcResults.statistics.runs.toLocaleString());
        Utils.DOM.setText('mcSuccessRate', Utils.Format.percentage(mcResults.statistics.successRate));
        Utils.DOM.setText('mcMedian', Utils.Format.currency(mcResults.statistics.median));
        Utils.DOM.setText('mc10th', Utils.Format.currency(mcResults.statistics.p10));
    }

    /**
     * Display projection table
     */
    displayProjectionTable(results) {
        const tbody = Utils.DOM.get('projectionTable');
        if (!tbody || !results.yearlyData) return;

        let tableHTML = '';
        
        results.yearlyData.slice(0, 30).forEach(data => {
            if (data.depleted) {
                tableHTML += `
                    <tr class="bg-red-100">
                        <td colspan="9" class="px-4 py-2 text-center font-bold text-red-800">
                            Financial assets depleted in ${data.year} (Age ${data.age})
                        </td>
                    </tr>
                `;
                return;
            }

            tableHTML += `
                <tr class="hover:bg-gray-50">
                    <td class="px-4 py-2">${data.year}</td>
                    <td class="px-4 py-2">${data.age}</td>
                    <td class="px-4 py-2">${Utils.Format.currency(data.startBalance || data.balance)}</td>
                    <td class="px-4 py-2">-</td>
                    <td class="px-4 py-2 text-green-600">+${Utils.Format.currency(data.growth || 0)}</td>
                    <td class="px-4 py-2 text-red-600">-${Utils.Format.currency(data.withdrawal || 0)}</td>
                    <td class="px-4 py-2 text-orange-600">-${Utils.Format.currency(data.healthcareCost || 0)}</td>
                    <td class="px-4 py-2 text-blue-600">+${Utils.Format.currency(data.pension || 0)}</td>
                    <td class="px-4 py-2 font-semibold">${Utils.Format.currency(data.balance)}</td>
                </tr>
            `;
        });

        tbody.innerHTML = tableHTML;
    }

    /**
     * Display healthcare analysis
     */
    displayHealthcareAnalysis(inputs, results) {
        const healthcareCosts = results.healthcareCosts || {};
        
        const analysisHTML = `
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div class="p-4 bg-blue-50 rounded">
                    <h4 class="font-semibold text-blue-900">Total Healthcare Costs</h4>
                    <div class="text-2xl font-bold text-blue-800">${Utils.Format.currency(healthcareCosts.totalHealthcareCosts || 0)}</div>
                    <div class="text-sm text-blue-600">Over retirement period</div>
                </div>
                <div class="p-4 bg-orange-50 rounded">
                    <h4 class="font-semibold text-orange-900">Expected Aged Care</h4>
                    <div class="text-2xl font-bold text-orange-800">${Utils.Format.currency(healthcareCosts.agedCareCosts || 0)}</div>
                    <div class="text-sm text-orange-600">${inputs.agedCareProbability}% probability</div>
                </div>
                <div class="p-4 bg-red-50 rounded">
                    <h4 class="font-semibold text-red-900">Combined Health Costs</h4>
                    <div class="text-2xl font-bold text-red-800">${Utils.Format.currency(healthcareCosts.combinedCosts || 0)}</div>
                    <div class="text-sm text-red-600">Healthcare + aged care</div>
                </div>
            </div>
            <div class="p-4 bg-yellow-50 rounded">
                <h4 class="font-semibold text-yellow-900">Healthcare Recommendations</h4>
                <ul class="list-disc ml-5 mt-2 text-sm text-yellow-800">
                    <li>Healthcare costs grow at ${inputs.healthInflationRate}% annually (above general inflation)</li>
                    <li>Consider maintaining private health insurance to reduce out-of-pocket costs</li>
                    <li>Budget for potential aged care needs (${inputs.agedCareProbability}% probability)</li>
                    <li>Health expenses increase significantly with age - plan accordingly</li>
                </ul>
            </div>
        `;

        Utils.DOM.setHTML('healthcareResults', analysisHTML);
    }

    /**
     * Display optimization recommendations
     */
    displayOptimizationRecommendations(inputs, results) {
        const recommendations = [];

        // Generate personalized recommendations
        if (!results.success) {
            recommendations.push('Consider increasing your savings rate or working longer');
            recommendations.push('Review your asset allocation - more growth assets may be needed');
            recommendations.push('Consider part-time work in early retirement');
        }

        if (inputs.dynamicAllocation) {
            recommendations.push('Using dynamic allocation strategy - good for age-appropriate risk management');
        } else {
            recommendations.push('Consider enabling dynamic allocation for age-appropriate risk adjustment');
        }

        if (inputs.frankingCredits) {
            recommendations.push('Franking credits included - maximizing Australian tax advantages');
        } else {
            recommendations.push('Consider Australian dividend-paying stocks for franking credit benefits');
        }

        if (inputs.planToDownsize) {
            recommendations.push('Downsizing planned - ensure property market timing is considered');
        } else {
            recommendations.push('Consider downsizing to access home equity tax-free');
        }

        // Healthcare recommendations
        if (inputs.currentHealthExpenses < 3000) {
            recommendations.push('Consider increasing healthcare budget - current expenses seem low');
        }

        if (!inputs.privateHealthInsurance) {
            recommendations.push('Consider private health insurance to manage healthcare costs');
        }

        // Tax optimization
        const marginalRate = TaxCalculator.getMarginalTaxRate(inputs.yourSalary);
        if (marginalRate > 0.37) {
            recommendations.push('High marginal tax rate - maximize super contributions and tax-effective investments');
        }

        recommendations.push('Regularly review and update your retirement plan');
        recommendations.push('Consider professional financial advice for complex strategies');

        // Display recommendations
        const recommendationsHTML = recommendations.map(rec => `<li>${rec}</li>`).join('');
        Utils.DOM.setHTML('recommendationsList', recommendationsHTML);
    }

    /**
     * Display stress test results
     */
    displayStressTestResults(stressResults) {
        const stressHTML = `
            <div class="space-y-4">
                <h3 class="text-lg font-semibold">Stress Test Results</h3>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    ${stressResults.map(result => `
                        <div class="p-4 rounded ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border">
                            <h4 class="font-semibold ${result.success ? 'text-green-900' : 'text-red-900'}">${result.scenario}</h4>
                            <div class="mt-2">
                                <div class="text-sm">Final Balance: ${Utils.Format.currency(result.finalBalance)}</div>
                                <div class="text-sm ${result.success ? 'text-green-600' : 'text-red-600'}">
                                    ${result.success ? '✅ Success' : '❌ Shortfall'}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        Utils.DOM.setHTML('optimizationResults', stressHTML);
    }

    /**
     * Update risk assessment display
     */
    updateRiskAssessment() {
        const riskTolerance = Utils.DOM.get('riskTolerance')?.value || 'growth';
        const profile = CONFIG.RISK_PROFILES[riskTolerance];
        
        if (!profile) return;

        const assessmentHTML = `
            <div class="risk-indicator risk-${riskTolerance === 'aggressive' ? 'high' : riskTolerance === 'conservative' ? 'low' : 'medium'}">
                <h4 class="font-semibold">${profile.name} Investor</h4>
                <div class="text-sm mt-1">
                    <div>${profile.description}</div>
                    <div class="mt-1">Time Horizon: ${profile.timeHorizon}</div>
                    <div>Risk Score: ${profile.riskScore}/10</div>
                </div>
            </div>
        `;

        Utils.DOM.setHTML('riskAssessment', assessmentHTML);
    }

    /**
     * Update allocation based on risk tolerance
     */
    updateAllocationFromRisk() {
        const riskTolerance = Utils.DOM.get('riskTolerance')?.value;
        if (!riskTolerance) return;

        const profile = CONFIG.RISK_PROFILES[riskTolerance];
        if (profile && profile.recommendedAllocation) {
            const allocation = CONFIG.ALLOCATIONS[profile.recommendedAllocation];
            if (allocation) {
                Utils.DOM.setValue('allocEquities', allocation.equity);
                Utils.DOM.setValue('allocBonds', allocation.bonds);
                Utils.DOM.setValue('allocCash', allocation.cash);
                Utils.DOM.setValue('presetAllocation', profile.recommendedAllocation);
            }
        }
    }

    /**
     * Update allocation from preset selection
     */
    updateAllocationFromPreset() {
        const preset = Utils.DOM.get('presetAllocation')?.value;
        if (!preset) return;

        const allocation = CONFIG.ALLOCATIONS[preset];
        if (allocation) {
            Utils.DOM.setValue('allocEquities', allocation.equity);
            Utils.DOM.setValue('allocBonds', allocation.bonds);
            Utils.DOM.setValue('allocCash', allocation.cash);
        }
    }

    /**
     * Validate inputs
     */
    validateInputs(inputs) {
        // Age validations
        const ageValidation = Utils.Validate.age(inputs.yourCurrentAge);
        if (!ageValidation.valid) return ageValidation;

        const retirementValidation = Utils.Validate.retirementAge(inputs.yourCurrentAge, inputs.retirementAge);
        if (!retirementValidation.valid) return retirementValidation;

        // Salary validations
        const salaryValidation = Utils.Validate.salary(inputs.yourSalary);
        if (!salaryValidation.valid) return salaryValidation;

        // Allocation validation
        const allocationValidation = Utils.Validate.allocation(inputs.allocEquities, inputs.allocBonds, inputs.allocCash);
        if (!allocationValidation.valid) return allocationValidation;

        return { valid: true };
    }

    /**
     * Save inputs to localStorage
     */
    saveInputs() {
        const inputs = this.collectInputs();
        Utils.File.saveToLocal('retirementCalculatorInputs', inputs);
    }

    /**
     * Load saved inputs from localStorage
     */
    loadSavedInputs() {
        const savedInputs = Utils.File.loadFromLocal('retirementCalculatorInputs');
        if (savedInputs) {
            Object.keys(savedInputs).forEach(key => {
                Utils.DOM.setValue(key, savedInputs[key]);
            });
        }
    }

    /**
     * Export results to CSV
     */
    exportResults() {
        if (!this.currentResults || !this.currentResults.yearlyData) {
            alert('No results to export. Please run a calculation first.');
            return;
        }

        const exportData = this.currentResults.yearlyData.map(data => ({
            Year: data.year,
            Age: data.age,
            Start_Balance: data.startBalance || data.balance,
            Income_Needed: data.incomeNeeded || 0,
            Pension_Received: data.pension || 0,
            Withdrawal_Amount: data.withdrawal || 0,
            Healthcare_Cost: data.healthcareCost || 0,
            Portfolio_Growth: data.growth || 0,
            End_Balance: data.balance
        }));

        Utils.File.exportCSV(exportData, `retirement_projection_${Utils.DateTime.currentYear()}.csv`);
    }

    /**
     * Display error message
     */
    displayError(message) {
        const errorHTML = `
            <div class="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
                <strong>Error:</strong> ${message}
            </div>
        `;
        
        // Show error in summary results area
        Utils.DOM.setHTML('summaryResults', errorHTML);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.retirementApp = new RetirementCalculatorApp();
});

// Export for global access
export default RetirementCalculatorApp;