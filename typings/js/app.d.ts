
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
            declare interface stressInputsType {}
