import { trackButtonClick, trackDataAction } from './analytics.js';
import { initGoogleAnalytics } from './google-analytics.js';
import '../css/styles.css';
import '../css/outcome-styles.css';
import '../css/site-chrome.css';
import './site-chrome.js';

initGoogleAnalytics();
// js/app.js - Main Application Controller

// Debug logging — stripped automatically in production by Terser (drop_console: true)
// eslint-disable-next-line no-console
const debugLog = process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test' ? console.log.bind(console) : () => {};

import versionManager from './version-manager.js';
import { ENHANCED_FINANCIAL_CONFIG } from './enhanced-config.js';
import { ENHANCED_CONFIG } from './config.js';
import RetirementSimulator from './simulator.js';
import MarketDataEngine from './market-data.js';
import { initializeTrustUI } from './trust-ui.js';
import ThemeManager from './theme.js';
import OnboardingWizard from './onboarding-wizard.js';
import profiler from './performance-profiler.js';
import { ScenarioComparisonMatrix } from './scenario-matrix.js';
import { PersonaIntelligenceEngine } from './persona-intelligence.js';
import { HealthcareModelingEngine } from './healthcare-modeling.js';
import { PropertyAnalysisEngine } from './property-analysis.js';
import { HousingOptimizer } from './housing-optimizer.js';
import { OverseasRetirementAnalyzer } from './overseas-retirement.js';
import { COUNTRY_PROFILES } from './country-profiles.js';
import { OutcomeEngine } from './outcome-engine.js';
import { ActionGenerator } from './action-generator.js';
import { WhatIfEngine } from './what-if-engine.js';
import { ResilienceScenarioEngine } from './resilience-scenarios.js';
import { runFullSimulation } from './simulation_engine/index.js';
import { buildStressedInputs, normaliseStressScenarioForTest } from './policy/stress-helpers.js';
import { RetirementCostAnalyzer } from './retirement-cost-analyzer.js';
import PersonalizedQuestionEngine from './personalized-qa-engine.js';
import { buildForwardProjectionPayload, storeForwardProjection } from './forward-projection-bridge.js';
import { adaptAdvancedClassicInput } from './calculation/input-adapters/advanced-classic-adapter.js';
import { applyCanonicalCashflowToEngineInputs } from './calculation/canonical-engine-adapter.js';
import { ProjectionService } from './calculation/projection-service.js';
import {
    buildCanonicalSaveData,
} from './calculation/save-data-schema.js';
import {
    calculateConcessionalCapStatus,
    calculateEmployerSuper,
    EMPLOYER_SUPER_MODES,
    DEFAULT_MAX_CONTRIBUTION_BASE_PER_QUARTER,
    SALARY_INCOME_MODES,
    resolveEmployerSuper,
    shouldWarnDivision293,
} from './super-policy.js';
// js/app.js - Main Application Controller

const OVERSEAS_DEST_CURRENCY_MAP = ENHANCED_CONFIG.OVERSEAS_RETIREMENT?.DESTINATION_CURRENCY_MAP || {};
const OVERSEAS_DEST_FX_MEDIAN_MAP = ENHANCED_CONFIG.OVERSEAS_RETIREMENT?.DESTINATION_AUD_FX_MEDIAN_10Y_CHANGE_PCT || {};

// Import new engines with error handling
// Import new engines with error handling
let RiskProfilingEngine, DynamicAllocationEngine;

async function loadAdvancedEngines() {
    try {
        const riskModule = await import('./risk-profiling-engine.js');
        RiskProfilingEngine = riskModule.RiskProfilingEngine;

        const allocationModule = await import('./dynamic-allocation-engine.js');
        DynamicAllocationEngine = allocationModule.DynamicAllocationEngine;

        debugLog('✅ Advanced engines loaded successfully');
        return true;
    } catch (error) {
        console.error('❌ Failed to load advanced analysis engines:', error);
        // Provide fallback functionality or disable features
        return false;
    }
}

// Advanced engines will be loaded by the app instance

import {
    $,
    safeGetValue,
    getRawValue,
    parseFormattedNumber,
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
    handleError,
    saveToLocalStorage,
    loadFromLocalStorage,
    initializeTooltips,
    addTooltipBottomStyles,
    initializeCurrencyInputs,
    initializePercentageInputs,
    initializeNumericInputs,
    calculateStateLandTax,
    normalizePercentageDisplayValue
} from './utils.js';

/**
 * Maps form select values for overseas country to COUNTRY_PROFILES keys.
 * Defined once here to avoid repetition across multiple methods.
 */
const OVERSEAS_COUNTRY_PROFILE_KEY_MAP = {
    'portugal': 'PORTUGAL',
    'spain': 'SPAIN',
    'italy': 'ITALY',
    'canada': 'CANADA',
    'newzealand': 'NEW_ZEALAND',
    'india': 'INDIA',
    'thailand': 'THAILAND',
    'bali': 'BALI',
    'japan': 'JAPAN',
    'malaysia': 'MALAYSIA',
    'philippines': 'PHILIPPINES',
    'vietnam': 'VIETNAM',
    'uk': 'UNITED_KINGDOM',
    'united_kingdom': 'UNITED_KINGDOM',
    'usa': 'USA',
};

const PERCENTAGE_STORAGE_FIELD_IDS = new Set([
    'percentIncomeSaved', 'mortgageRate', 'investmentPropertyRate',
    'propertyGrowthRate', 'capitalGainsTaxRate', 'healthcareInflation',
    'agedCareProbability', 'inflation', 'investmentReturn', 'returnDeclineRate',
    'savingsReturn', 'superReturn', 'salaryGrowthRate', 'leanYearsReduction',
    'dividendYield', 'frankingRate', 'returnVolatility', 'shockProbability', 'shockMagnitude',
    'australianEquityAllocation', 'allocEquities', 'allocBonds', 'allocCash', 'trustAttributionPercentage',
    'carerReducedWorkPercent', 'vacancyRate', 'maintenanceInflation',
    'trustTaxRate', 'beneficiaryAllocation', 'extremeInflationProbability', 'propertyCrashProbability',
    'creditCardRate', 'personalLoanRate', 'carLoanRate', 'employerSuperContributionRate'
]);

class RetirementCalculatorApp {
    constructor() {
        this.config = versionManager.getLatestConfig();
        this.simulator = new RetirementSimulator(this.config);
        this.projectionService = this.createProjectionService();
        this.chartManager = null; // Will be lazy-loaded
        this.marketData = new MarketDataEngine();
        this.themeManager = new ThemeManager();
        this.scenarioMatrix = new ScenarioComparisonMatrix(this.simulator, this.config);
        this.personaIntelligence = new PersonaIntelligenceEngine(this.simulator, this.config);
        this.healthcareModeling = new HealthcareModelingEngine(this.config);
        this.propertyAnalysis = new PropertyAnalysisEngine(this.config);
        this.riskProfiling = null; // Will be initialized after dynamic import
        this.dynamicAllocation = null; // Will be initialized after dynamic import
        this.onboardingWizard = null; // Will be initialized after DOM is ready
        this.outcomeEngine = null; // Outcome-based calculator engine
        this.actionGenerator = null; // Action suggestion generator
        this.whatIfEngine = null; // What-if scenario testing engine
        this.resilienceEngine = null; // Resilience scenario testing engine
        this.currentOutcome = null; // Current outcome calculation results
        this.currentResilience = null; // Current resilience analysis results
        this.currentResults = null;
        this.currentProjection = null;
        this.isCalculating = false;
        this.isImporting = false;
        this.lastCalculationHash = null; // dirty-flag: tracks inputs at last successful calculation
        this.lastStressHash = null;      // dirty-flag: tracks inputs at last stress test
        this.currentVersion = versionManager.LATEST_VERSION;

        this.initializeApp().catch(console.error);
    }

    reinitializeApp(config) {
        this.config = config;
        this.simulator = new RetirementSimulator(this.config);
        this.projectionService = this.createProjectionService();
        this.scenarioMatrix = new ScenarioComparisonMatrix(this.simulator, this.config);
        this.personaIntelligence = new PersonaIntelligenceEngine(this.simulator, this.config);
        this.healthcareModeling = new HealthcareModelingEngine(this.config);
        this.propertyAnalysis = new PropertyAnalysisEngine(this.config);
        this.onboardingWizard = new OnboardingWizard(this.config);

        debugLog(`Re-initialized app with config for version ${config.version}`);
    }

    createProjectionService() {
        return new ProjectionService({
            simulator: this.simulator,
            adapter: adaptAdvancedClassicInput,
            engineInputBuilder: (rawInput, { canonicalInput, derivedCashflow }) => (
                applyCanonicalCashflowToEngineInputs(rawInput, canonicalInput, derivedCashflow)
            ),
            summaryBuilder: ({ canonicalInput, simulation }) => ({
                targetAnnualIncomeToday: canonicalInput.retirementTarget.targetAnnualIncomeToday,
                finalBalance: simulation.finalBalance,
                retirementAge: canonicalInput.household.retirementAge,
            }),
            policyVersion: this.config.version || 'unversioned',
        });
    }

    handleVersionChange(newVersion) {
        this.currentVersion = newVersion;
        const newConfig = versionManager.getConfigByVersion(newVersion);
        this.reinitializeApp(newConfig);
        this.calculateRetirement(true);
        showNotification(`Switched to version ${newVersion} and recalculated.`, 'info');
    }

    async initializeApp() {
        debugLog('🚀 initializeApp starting...');
        this.loadSavedInputs(); // Load saved inputs first
        this.setupEventListeners();
        this.setupVersionSelector();
        this.setupCalculationModal();
        this.setupAutoSave(); // Setup auto-save functionality
        this.setupCashFlowUI(); // Setup cash flow validation and UI
        this.setupDependentCalculations(); // Setup enhanced dependent calculations
        this.addSuggestionStyles(); // Add CSS styles for suggestion modifications
        this.updateUIElements();
        initializeTrustUI(); // Initialize trust UI functionality
        debugLog('🎯 About to initialize onboarding wizard...');
        await this.initializeOnboardingWizard(); // Initialize onboarding wizard
        debugLog('✅ initializeApp completed');

        // Initialize tooltip system
        addTooltipBottomStyles(); // Add bottom positioning styles
        initializeTooltips(); // Initialize tooltip functionality
        initializeCurrencyInputs(); // Initialize currency input formatting
        initializePercentageInputs(); // Initialize percentage input formatting
        initializeNumericInputs(); // Initialize numeric input formatting
        this.setupProjectionDrivenFields();
        this.enhanceAdvancedCalculatorInputs(); // Add gaming-style enhancements to calculator inputs

        // Make utilities globally available for onboarding wizard
        window.utils = {
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
            loadFromLocalStorage
        };

        this.performInitialCalculation();

        // Initialize advanced engines after loading
        this.initializeAdvancedEngines();
        this.initializeDisclaimer();
    }

    initializeDisclaimer() {
        const disclaimerModal = document.getElementById('disclaimer-modal');
        const acceptButton = document.getElementById('accept-disclaimer');

        if (!disclaimerModal || !acceptButton) {
            console.error('Disclaimer elements not found');
            return;
        }

        const disclaimerAccepted = localStorage.getItem('disclaimerAccepted');

        if (!disclaimerAccepted) {
            disclaimerModal.classList.remove('hidden');
        }

        acceptButton.addEventListener('click', () => {
            localStorage.setItem('disclaimerAccepted', 'true');
            disclaimerModal.classList.add('hidden');
        });
    }

    async initializeAdvancedEngines() {
        const loaded = await loadAdvancedEngines();
        if (loaded && RiskProfilingEngine && DynamicAllocationEngine) {
            this.riskProfiling = new RiskProfilingEngine(this.config);
            this.dynamicAllocation = new DynamicAllocationEngine(this.config);
            debugLog('✅ Advanced engines initialized in app instance');
        } else {
            console.warn('⚠️ Advanced engines not available - some features will be disabled');
        }
    }

    async initializeOnboardingWizard() {
        try {
            this.onboardingWizard = new OnboardingWizard(this.config);
            window.onboardingWizard = this.onboardingWizard; // Make globally available for event handlers

            // The wizard now handles its own button events.
            // App.js only needs to handle URL params that might skip or force onboarding.
            await this.handleOnboardingURLParams();

            debugLog('✅ Onboarding wizard initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize onboarding wizard:', error);
        }
    }

    hideOnboardingButtons() {
        const onboardingButtons = document.getElementById('onboarding-buttons');
        if (onboardingButtons) {
            onboardingButtons.style.display = 'none';
        }
    }

    async handleReturningUserFileSelect(event) {
        debugLog('🔍 handleReturningUserFileSelect called', event);
        const file = event.target.files[0];
        if (!file) {
            debugLog('❌ No file selected');
            return; // User cancelled the file picker
        }

        debugLog('📁 File selected:', file.name, file.size, 'bytes');
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                debugLog('📖 File read successfully, parsing JSON...');
                const data = JSON.parse(e.target.result);
                debugLog('✅ JSON parsed successfully:', data);

                if (!data.userData || !data.version) {
                    debugLog('❌ Invalid data structure:', { hasUserData: !!data.userData, hasVersion: !!data.version });
                    showNotification('Invalid retirement calculator data file format.', 'error');
                    return;
                }

                // Show confirmation dialog before loading
                const scenarioName = data.scenarioName || 'your saved data';
                const confirmationMessage = `You are about to load the scenario: "${scenarioName}".\n\nThis will overwrite any unsaved changes in the calculator.\n\nDo you want to proceed?`;

                if (!window.confirm(confirmationMessage)) {
                    showNotification('Data import cancelled.', 'info');
                    return;
                }

                debugLog('🎯 About to populate form with userData:', data.userData);
                // Populate form with imported data
                populateFormFromData(data.userData, data.version);

                // Trigger currency and percentage input formatting
                initializeCurrencyInputs();
                initializePercentageInputs();
                initializeNumericInputs();

                debugLog('🌟 About to show enhanced summary...');
                // Show enhanced summary (fallback name if scenarioName not present in file)
                this.showReturningUserEnhancedSummary(data.userData, data.scenarioName || 'Imported Data');

                debugLog('🔘 Showing action buttons...');
                // Show action buttons for advanced analysis
                const actionButtonsContainer = $('action-buttons-container');
                if (actionButtonsContainer) {
                    actionButtonsContainer.classList.remove('hidden');
                    debugLog('✅ Action buttons container shown');
                } else {
                    debugLog('❌ Action buttons container not found');
                }

                showNotification(`Successfully loaded: ${data.scenarioName || 'Your Retirement Data'}`, 'success');

                // Recalculate projections with the new data
                this.calculateRetirement(false);

            } catch (err) {
                console.error('Error parsing user data file:', err);
                showNotification('Invalid JSON file. Please select a valid data file.', 'error');
            }
        };
        reader.onerror = () => {
            console.error('Error reading file.');
            showNotification('Error reading file. Please try again.', 'error');
        };
        reader.readAsText(file);

        // Reset the file input so the 'change' event fires again if the same file is selected
        event.target.value = '';
    }

    showReturningUserEnhancedSummary(userData, scenarioName) {
        debugLog('🚀 showReturningUserEnhancedSummary called with:', { userData, scenarioName });

        // Show the Enhanced Summary container
        const enhancedSummaryContainer = $('enhanced-summary-container');
        if (enhancedSummaryContainer) {
            enhancedSummaryContainer.classList.remove('hidden');
            debugLog('✅ Enhanced summary container shown');
        } else {
            debugLog('❌ Enhanced summary container not found');
        }

        const enhancedSummaryContent = $('enhanced-summary-content');
        if (!enhancedSummaryContent) {
            debugLog('❌ Enhanced summary content element not found');
            return;
        }
        debugLog('✅ Enhanced summary content element found');

        // Calculate projections using imported data
        const results = this.calculateReturningUserProjections(userData);

        enhancedSummaryContent.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                <div class="bg-white p-4 rounded-lg border border-gray-200">
                    <h3 class="text-lg font-semibold text-gray-800 mb-2">💰 Current Financial Position</h3>
                    <div class="space-y-1 text-sm">
                        <div class="flex justify-between">
                            <span>Total Super:</span>
                            <span class="font-medium">$${results.currentSuper.toLocaleString()}</span>
                        </div>
                        <div class="flex justify-between">
                            <span>Total Savings:</span>
                            <span class="font-medium">$${results.currentSavings.toLocaleString()}</span>
                        </div>
                        <div class="flex justify-between">
                            <span>Investment Assets:</span>
                            <span class="font-medium">$${results.currentStocks.toLocaleString()}</span>
                        </div>
                        <div class="flex justify-between">
                            <span>Annual Income:</span>
                            <span class="font-medium">$${results.annualIncome.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                <div class="bg-white p-4 rounded-lg border border-gray-200">
                    <h3 class="text-lg font-semibold text-gray-800 mb-2">🎯 Retirement Goals</h3>
                    <div class="space-y-1 text-sm">
                        <div class="flex justify-between">
                            <span>Your Current Age:</span>
                            <span class="font-medium">${results.userAge} years</span>
                        </div>
                        ${results.partnerAge && results.partnerAge > 0 ?
            `<div class="flex justify-between">
                                <span>Partner Age:</span>
                                <span class="font-medium">${results.partnerAge} years</span>
                            </div>` : ''
        }
                        <div class="flex justify-between">
                            <span>Target Retirement Age:</span>
                            <span class="font-medium">${results.retirementAge}</span>
                        </div>
                        <div class="flex justify-between">
                            <span>Years to Retirement:</span>
                            <span class="font-medium">${Math.max(0, results.retirementAge - results.userAge)} years</span>
                        </div>
                    </div>
                </div>

                <div class="bg-white p-4 rounded-lg border border-gray-200">
                    <h3 class="text-lg font-semibold text-gray-800 mb-2">📈 Basic Projections</h3>
                    <div class="space-y-1 text-sm">
                        <div class="flex justify-between">
                            <span>Expected Super at Retirement:</span>
                            <span class="font-medium">$${results.projectedSuper.toLocaleString()}</span>
                        </div>
                        <div class="flex justify-between">
                            <span>Expected Savings:</span>
                            <span class="font-medium">$${results.projectedSavings.toLocaleString()}</span>
                        </div>
                        <div class="flex justify-between">
                            <span>Total Retirement Assets:</span>
                            <span class="font-medium text-green-600">$${results.totalProjected.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                <h3 class="text-lg font-semibold text-gray-800 mb-2">🚀 Next Steps for ${scenarioName || 'Your Plan'}</h3>
                <p class="text-gray-700 mb-3">Your data has been loaded into the advanced calculator. Here's what you can do now:</p>
                <ul class="text-sm text-gray-600 space-y-1">
                    <li>• <strong>Run Enhanced Monte Carlo:</strong> Get probabilistic projections with market volatility</li>
                    <li>• <strong>Compare Strategies:</strong> Test different scenarios side-by-side</li>
                    <li>• <strong>Healthcare Analysis:</strong> Factor in aged care and healthcare costs</li>
                    <li>• <strong>Risk Analysis:</strong> Understand your risk profile and optimize allocation</li>
                    <li>• <strong>Generate AI Recommendations:</strong> Get personalized suggestions for improvement</li>
                </ul>
            </div>
        `;
    }

    calculateReturningUserProjections(userData) {
        // Extract key data from imported userData
        const userAge = userData.yourCurrentAge || 35;
        const partnerAge = userData.partnerCurrentAge || 0;
        const retirementAge = userData.retirementAge || 65;
        const yearsToRetirement = Math.max(0, retirementAge - userAge);

        const currentSuper = (userData.yourCurrentSuper || 0) + (userData.partnerCurrentSuper || 0);
        const currentSavings = userData.currentSavings || 0;
        const currentStocks = userData.currentStocks || 0;
        const annualIncome = (userData.yourSalary || 0) + (userData.partnerSalary || 0);

        // Basic projections using imported return rates
        const superReturn = userData.superReturn || 0.0875; // Default to 8.75%
        const savingsReturn = userData.savingsReturn || 0.018; // Default to 1.8%

        const projectedSuper = currentSuper * Math.pow(1 + superReturn, yearsToRetirement) +
            (annualIncome * 0.12 * ((Math.pow(1 + superReturn, yearsToRetirement) - 1) / superReturn));
        const projectedSavings = currentSavings * Math.pow(1 + savingsReturn, yearsToRetirement);
        const projectedStocks = currentStocks * Math.pow(1 + (userData.investmentReturn || 0.0561), yearsToRetirement);

        return {
            userAge,
            partnerAge,
            retirementAge,
            currentSuper,
            currentSavings,
            currentStocks,
            annualIncome,
            projectedSuper,
            projectedSavings,
            projectedStocks,
            totalProjected: projectedSuper + projectedSavings + projectedStocks
        };
    }

    async skipOnboardingToAdvanced() {
        this.hideOnboardingButtons();
        const actionButtonsContainer = $('action-buttons-container');
        if (actionButtonsContainer) {
            actionButtonsContainer.classList.remove('hidden');
        }
        const calculatorContainer = document.querySelector('.calculator-container') ||
            document.querySelector('.bg-white.rounded-lg');

        if (calculatorContainer) {
            calculatorContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
            showNotification('Welcome back! Use the "Load Data" option in the menu above to import your previously saved data, or start using the calculator directly.', 'info');
        }
    }

    // NOTE: handleReturningUserFileSelect is defined above (line ~263).
    // The duplicate definition that previously existed here has been removed
    // to fix the method shadowing bug (later definition silently overrode earlier one).

    showOnboardingCompletedState() {
        const onboardingButtons = document.getElementById('onboarding-buttons');
        if (onboardingButtons) {
            onboardingButtons.innerHTML = `
                <div class="text-center p-6 bg-green-50 rounded-lg border border-green-200">
                    <div class="mb-4">
                        <span class="text-4xl">✅</span>
                        <h2 class="text-xl font-semibold text-green-800 mt-2">Onboarding Complete!</h2>
                        <p class="text-green-600 mt-1">Your data has been loaded into the calculator</p>
                    </div>
                    <div class="flex gap-4 justify-center">
                        <button id="start-new-onboarding" class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                            Start New Planning Session
                        </button>
                        <button id="continue-advanced" class="px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors">
                            Continue with Advanced Calculator
                        </button>
                    </div>
                </div>
            `;

            // Add event listeners for the new buttons
            document.getElementById('start-new-onboarding')?.addEventListener('click', () => {
                this.onboardingWizard.resetAndStart();
                this.hideOnboardingButtons();
            });

            document.getElementById('continue-advanced')?.addEventListener('click', async () => {
                await this.skipOnboardingToAdvanced();
            });
        }
    }

    async handleOnboardingURLParams() {
        const urlParams = new URLSearchParams(window.location.search);

        if (urlParams.get('onboarding') === 'true') {
            // Force show onboarding wizard
            setTimeout(() => {
                this.onboardingWizard.startOnboarding();
                this.hideOnboardingButtons();
            }, 500);
        } else if (urlParams.get('skip') === 'true') {
            // Skip onboarding entirely
            await this.skipOnboardingToAdvanced();
        }
    }

    // Input collection with complete property support
    collectInputs() {
        const config = this.config.DEFAULTS;

        // Get raw partner values
        const partnerAgeInput = $('partnerCurrentAge');
        const partnerAgeValue = partnerAgeInput ? partnerAgeInput.value.trim() : '';
        const householdStatus = $('householdStatus')?.value || '';
        const isHouseholdSingle = householdStatus === 'single';
        const isPartnerAgeEmpty = isHouseholdSingle || partnerAgeValue === '' || partnerAgeValue === '0';

        // Get user age for partner calculations
        const userAge = safeGetValue('yourCurrentAge', config.personal.yourCurrentAge);

        // Determine final partner age to use in calculations
        let finalPartnerAge = 0;
        if (!isPartnerAgeEmpty) {
            // Partner age is provided - use it
            finalPartnerAge = safeGetValue('partnerCurrentAge', 0);
        }
        // If partner age is blank, keep this as a single-person calculation.

        const primaryResidenceTypeRaw = safeGetSelectValue('primaryResidenceType', 'own_mortgage');
        const primaryResidenceType = primaryResidenceTypeRaw === 'own_with_mortgage'
            ? 'own_mortgage'
            : (primaryResidenceTypeRaw === 'living_with_family' ? 'family' : primaryResidenceTypeRaw);
        const isNonHomeowner = primaryResidenceType === 'renting' || primaryResidenceType === 'family' || primaryResidenceType === 'other';
        const employerRateInput = safeGetValue('employerSuperContributionRate', 0);
        const employerRate = employerRateInput > 0 ? employerRateInput / 100 : ENHANCED_CONFIG.SUPER_GUARANTEE_RATE;
        const applyMaxContributionBase = safeGetChecked('applyMaxContributionBase', true);
        const maxContributionBasePerQuarter = safeGetValue('maxContributionBasePerQuarter', DEFAULT_MAX_CONTRIBUTION_BASE_PER_QUARTER);
        const salaryIncomeMode = safeGetSelectValue('salaryIncomeMode', SALARY_INCOME_MODES.EXCLUDING_SUPER);
        const partnerSalaryIncomeMode = safeGetSelectValue('partnerSalaryIncomeMode', salaryIncomeMode);
        const yourEmploymentIncome = safeGetValue('yourSalary', config.financial.yourSalary);
        const partnerEmploymentIncome = finalPartnerAge > 0 ? safeGetValue('partnerSalary', 0) : 0;
        const yourSalarySuper = resolveEmployerSuper({
            employmentIncome: yourEmploymentIncome,
            incomeMode: salaryIncomeMode,
            sgRate: employerRate,
            maxContributionBasePerQuarter,
            applyMaxContributionBase,
            employerSuperMode: safeGetChecked('employerSuperOverrideEnabled', false) ? EMPLOYER_SUPER_MODES.MANUAL_OVERRIDE : EMPLOYER_SUPER_MODES.CALCULATED,
            employerSuperOverrideAmount: parseFormattedNumber(getRawValue('employerSuperOverrideAmount', '0')),
        });
        const partnerSalarySuper = resolveEmployerSuper({
            employmentIncome: partnerEmploymentIncome,
            incomeMode: partnerSalaryIncomeMode,
            sgRate: employerRate,
            maxContributionBasePerQuarter,
            applyMaxContributionBase,
            employerSuperMode: finalPartnerAge > 0 && safeGetChecked('partnerEmployerSuperOverrideEnabled', false) ? EMPLOYER_SUPER_MODES.MANUAL_OVERRIDE : EMPLOYER_SUPER_MODES.CALCULATED,
            employerSuperOverrideAmount: finalPartnerAge > 0 ? parseFormattedNumber(getRawValue('partnerEmployerSuperOverrideAmount', '0')) : 0,
        });

        const inputs = {
            // Personal details
            yourCurrentAge: userAge,
            partnerCurrentAge: finalPartnerAge,
            retirementAge: safeGetValue('retirementAge', config.personal.retirementAge),
            partnerRetirementAge: finalPartnerAge > 0 ? safeGetValue('partnerRetirementAge', config.personal.partnerRetirementAge) : 0,
            yourLifespan: safeGetValue('yourLifespan', config.personal.yourLifespan),
            partnerLifespan: finalPartnerAge > 0 ? safeGetValue('partnerLifespan', config.personal.partnerLifespan) : 0,
            yourGender: safeGetSelectValue('yourGender', 'unspecified'),
            partnerGender: finalPartnerAge > 0 ? safeGetSelectValue('partnerGender', 'unspecified') : 'unspecified',

            // Risk profile
            riskTolerance: safeGetValue('riskTolerance', config.risk.riskTolerance),
            hasEmergencyFund: safeGetSelectValue('hasEmergencyFund', config.risk.hasEmergencyFund),
            hasDebt: safeGetSelectValue('hasDebt', config.risk.hasDebt),
            dependents: safeGetValue('dependents', config.risk.dependents),

            // Risk profiling sub-questions (feed risk-profiling-engine.js accurately)
            lossReaction: safeGetSelectValue('lossReaction', 'monitor'),
            investmentExperience: parseFloat(safeGetSelectValue('investmentExperience', '2')) || 2,
            marketUnderstanding: safeGetSelectValue('marketUnderstanding', 'moderate'),
            volatilityComfort: parseFloat(safeGetSelectValue('volatilityComfort', '0.15')) || 0.15,

            // Additional income sources
            businessIncome: parseFormattedNumber(getRawValue('businessIncome', '0')),
            investmentIncome: parseFormattedNumber(getRawValue('investmentIncome', '0')),

            // Enhanced dependent details
            dependentDetails: {
                childrenUnder5: safeGetValue('childrenUnder5', 0),
                childrenUnder5Percent: parseFormattedNumber(getRawValue('childrenUnder5Percent', '100')),
                childrenPrimary: safeGetValue('childrenPrimary', 0),
                childrenPrimaryPercent: parseFormattedNumber(getRawValue('childrenPrimaryPercent', '100')),
                teenagers: safeGetValue('teenagers', 0),
                teenagersPercent: parseFormattedNumber(getRawValue('teenagersPercent', '100')),
                adultDisabled: safeGetValue('adultDisabled', 0),
                adultDisabledPercent: parseFormattedNumber(getRawValue('adultDisabledPercent', '100')),
                elderlyIndependent: safeGetValue('elderlyIndependent', 0),
                elderlyIndependentPercent: parseFormattedNumber(getRawValue('elderlyIndependentPercent', '100')),
                elderlyHomeCare: safeGetValue('elderlyHomeCare', 0),
                elderlyHomeCarePercent: parseFormattedNumber(getRawValue('elderlyHomeCarePercent', '100')),
                elderlyResidential: safeGetValue('elderlyResidential', 0),
                elderlyResidentialPercent: parseFormattedNumber(getRawValue('elderlyResidentialPercent', '100')),
                otherDependents: safeGetValue('otherDependents', 0),
                otherDependentsPercent: parseFormattedNumber(getRawValue('otherDependentsPercent', '100'))
            },

            // Financial details
            yourSalary: yourSalarySuper.cashSalary,
            partnerSalary: finalPartnerAge > 0 ? partnerSalarySuper.cashSalary : 0,
            yourEmploymentIncome,
            partnerEmploymentIncome,
            salaryIncomeMode,
            partnerSalaryIncomeMode,
            applyMaxContributionBase,
            maxContributionBasePerQuarter,
            calculatedEmployerSG: yourSalarySuper.calculatedEmployerSG,
            employerSG: yourSalarySuper.employerSG,
            employerSuperMode: yourSalarySuper.employerSuperMode,
            employerSuperOverrideAmount: yourSalarySuper.employerSuperOverrideAmount,
            employerSuperOverridden: yourSalarySuper.employerSuperOverridden,
            partnerCalculatedEmployerSG: partnerSalarySuper.calculatedEmployerSG,
            partnerEmployerSG: finalPartnerAge > 0 ? partnerSalarySuper.employerSG : 0,
            partnerEmployerSuperMode: finalPartnerAge > 0 ? partnerSalarySuper.employerSuperMode : EMPLOYER_SUPER_MODES.CALCULATED,
            partnerEmployerSuperOverrideAmount: finalPartnerAge > 0 ? partnerSalarySuper.employerSuperOverrideAmount : 0,
            partnerEmployerSuperOverridden: finalPartnerAge > 0 ? partnerSalarySuper.employerSuperOverridden : false,
            yourCurrentSuper: safeGetValue('yourCurrentSuper', config.financial.yourCurrentSuper),
            partnerCurrentSuper: finalPartnerAge > 0 ? safeGetValue('partnerCurrentSuper', 0) : 0,
            currentSavings: safeGetValue('currentSavings', config.financial.currentSavings),
            currentStocks: safeGetValue('currentStocks', config.financial.currentStocks),
            monthlyStockContribution: safeGetValue('monthlyStockContribution', config.financial.monthlyStockContribution),
            useDetailedExpenseInputs: safeGetChecked('useDetailedExpenseInputs', false),
            currentMonthlyHousingCosts: safeGetValue('currentMonthlyHousingCosts', 0),
            currentMonthlyLivingCosts: safeGetValue('currentMonthlyLivingCosts', 0),
            percentIncomeSaved: safeGetValue('percentIncomeSaved', config.financial.percentIncomeSaved) / 100,

            // Property details
            primaryResidenceType,
            primaryRentMonthly: parseFormattedNumber(getRawValue('primaryRentMonthly', '0')),
            homeValue: isNonHomeowner ? 0 : safeGetValue('homeValue', config.property.homeValue),
            mortgageBalance: isNonHomeowner ? 0 : safeGetValue('mortgageBalance', config.property.mortgageBalance),
            mortgageRate: isNonHomeowner ? 0 : safeGetValue('mortgageRate', config.property.mortgageRate) / 100,
            monthlyMortgagePayment: isNonHomeowner ? 0 : safeGetValue('monthlyMortgagePayment', config.property.monthlyMortgagePayment),
            planToDownsize: safeGetSelectValue('planToDownsize', 'false') === 'true',
            downsizeAge: safeGetValue('downsizeAge', 75),
            downsizeTransactionCost: safeGetValue('downsizeTransactionCost', 6.6) / 100,
            downsizeTargetHomeValue: parseFormattedNumber(getRawValue('downsizeTargetHomeValue', '800000')),
            downsizeOngoingFees: parseFormattedNumber(getRawValue('downsizeOngoingFees', '0')),

            // Investment property
            hasInvestmentProperty: safeGetChecked('hasInvestmentProperty', config.property.hasInvestmentProperty),
            investmentPropertyType: safeGetSelectValue('investmentPropertyType', 'unit'),
            investmentPropertyStrataLevy: parseFormattedNumber(getRawValue('investmentPropertyStrataLevy', '0')),
            investmentPropertyValue: safeGetValue('investmentPropertyValue', config.property.investmentPropertyValue),
            investmentPropertyLoan: safeGetValue('investmentPropertyLoan', config.property.investmentPropertyLoan),
            investmentPropertyRate: safeGetValue('investmentPropertyRate', config.property.investmentPropertyRate) / 100,
            investmentPropertyPurchasePrice: safeGetValue('investmentPropertyPurchasePrice', 0),
            investmentPropertyPurchaseYear: (() => {
                // Keep year as a non-zero number when entered, otherwise null so JSON
                // round-trip doesn't put "0" into the placeholder-only year field.
                const raw = getRawValue('investmentPropertyPurchaseYear', '');
                if (raw === '') return null;
                const parsed = parseInt(parseFormattedNumber(raw), 10);
                return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
            })(),
            weeklyRentalIncome: safeGetValue('weeklyRentalIncome', config.property.weeklyRentalIncome),
            annualPropertyExpenses: safeGetValue('annualPropertyExpenses', config.property.annualPropertyExpenses),
            propertyGrowthRate: safeGetValue('propertyGrowthRate', config.property.propertyGrowthRate) / 100,
            sellPropertyYears: safeGetValue('sellPropertyYears', config.property.sellPropertyYears),
            capitalGainsTaxRate: safeGetValue('capitalGainsTaxRate', config.property.capitalGainsTaxRate) / 100,

            // Healthcare & aged care
            hasPrivateHealthCover: safeGetChecked('hasPrivateHealthCover', false),
            ageFirstPrivateCover: safeGetValue('ageFirstPrivateCover', '') ? parseInt(safeGetValue('ageFirstPrivateCover')) : null,
            currentHealthcareCosts: safeGetValue('currentHealthcareCosts', config.healthcare.currentHealthcareCosts),
            healthcareInflation: safeGetValue('healthcareInflation', config.healthcare.healthcareInflation) / 100,
            agedCareProbability: safeGetValue('agedCareProbability', config.healthcare.agedCareProbability) / 100,
            agedCareStartAge: safeGetValue('agedCareStartAge', config.healthcare.agedCareStartAge),
            agedCareDuration: safeGetValue('agedCareDuration', config.healthcare.agedCareDuration),
            agedCareAnnualCost: safeGetValue('agedCareAnnualCost', config.healthcare.agedCareAnnualCost),

            // Age-related optional costs (mirrors advanced-v2.html Section 13)
            enableHomeModifications: !isNonHomeowner && safeGetChecked('enableHomeModifications', false),
            homeModificationCost: !isNonHomeowner ? safeGetValue('homeModificationCost', 25000) : 0,
            homeModificationAge: !isNonHomeowner ? safeGetValue('homeModificationAge', 75) : 0,
            homeModificationRecurring: !isNonHomeowner ? safeGetValue('homeModificationRecurring', 2000) : 0,
            enableAnnuity: safeGetChecked('enableAnnuity', false),
            annuityPurchaseAge: safeGetValue('annuityPurchaseAge', 67),
            annuityLumpSum: safeGetValue('annuityLumpSum', 200000),
            annuityAnnualIncome: safeGetValue('annuityAnnualIncome', 12000),
            enableTieredSpending: safeGetChecked('enableTieredSpending', false),
            tieredSpendingActiveAge: safeGetValue('tieredSpendingActiveAge', 75),
            tieredSpendingFrailAge: safeGetValue('tieredSpendingFrailAge', 85),
            tieredSpendingActiveMultiplier: safeGetValue('tieredSpendingActiveMultiplier', 110) / 100,
            tieredSpendingStableMultiplier: safeGetValue('tieredSpendingStableMultiplier', 90) / 100,
            tieredSpendingFrailMultiplier: safeGetValue('tieredSpendingFrailMultiplier', 120) / 100,

            // Economic assumptions
            inflation: safeGetValue('inflation', config.economic.inflation) / 100,
            investmentReturn: safeGetValue('investmentReturn', config.economic.investmentReturn) / 100,
            returnDeclineRate: safeGetValue('returnDeclineRate', config.economic.returnDeclineRate) / 100,
            savingsReturn: safeGetValue('savingsReturn', config.economic.savingsReturn) / 100,
            superReturn: safeGetValue('superReturn', config.economic.superReturn) / 100,
            employerSuperContributionRate: (() => {
                const customRate = safeGetValue('employerSuperContributionRate', 0);
                return customRate > 0 ? customRate / 100 : null;
            })(),
            superContributionRate: (() => {
                const customRate = safeGetValue('employerSuperContributionRate', 0);
                return customRate > 0 ? customRate / 100 : ENHANCED_CONFIG.SUPER_GUARANTEE_RATE;
            })(),
            salaryGrowthRate: safeGetValue('salaryGrowthRate', config.economic.salaryGrowthRate) / 100,
            salaryGrowthType: safeGetSelectValue('salaryGrowthType', 'standard'),
            leanYearsStart: safeGetValue('leanYearsStart', config.economic.leanYearsStart),
            leanYearsReduction: safeGetValue('leanYearsReduction', config.economic.leanYearsReduction) / 100,

            // Dynamic allocation
            useGlidePath: safeGetChecked('useGlidePath', config.allocation.useGlidePath),
            glidePathRule: safeGetSelectValue('glidePathRule', config.allocation.glidePathRule),
            frankingCreditBenefit: safeGetValue('frankingCreditBenefit', config.allocation.frankingCreditBenefit),
            australianEquityAllocation: safeGetValue('australianEquityAllocation', config.allocation.australianEquityAllocation) / 100,
            dividendYield: safeGetValue('dividendYield', config.allocation.dividendYield) / 100,
            frankingRate: safeGetValue('frankingRate', config.allocation.frankingRate) / 100,
            allocEquities: safeGetValue('allocEquities', config.allocation.allocEquities) / 100,
            allocBonds: safeGetValue('allocBonds', config.allocation.allocBonds) / 100,
            allocCash: safeGetValue('allocCash', config.allocation.allocCash) / 100,

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
            trustAttributionPercentage: safeGetValue('trustAttributionPercentage', config.trust.trustAttributionPercentage) / 100,
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
            useLongevityDistribution: safeGetChecked('useLongevityDistribution', false),

            // Australian residency history (Item 7)
            ageCameToAustralia: safeGetValue('ageCameToAustralia', 0),
            ageStartedEarningAustralia: safeGetValue('ageStartedEarningAustralia', 0),
            partnerAgeCameToAustralia: finalPartnerAge > 0 ? safeGetValue('partnerAgeCameToAustralia', 0) : 0,
            partnerAgeStartedEarningAustralia: finalPartnerAge > 0 ? safeGetValue('partnerAgeStartedEarningAustralia', 0) : 0,

            // Reduced income scenario (Item 10)
            enableReducedIncome: safeGetChecked('enableReducedIncome', false),
            reducedIncomeAge: safeGetValue('reducedIncomeAge', 0),
            reducedIncomeSalary: parseFormattedNumber(getRawValue('reducedIncomeSalary', '0')),
            partnerReducedIncomeAge: finalPartnerAge > 0 ? safeGetValue('partnerReducedIncomeAge', 0) : 0,
            partnerReducedIncomeSalary: finalPartnerAge > 0 ? parseFormattedNumber(getRawValue('partnerReducedIncomeSalary', '0')) : 0,

            // Carer / aged parents (Item 9)
            isCarerForParents: safeGetChecked('isCarerForParents', false),
            carerReducedWorkPercent: safeGetValue('carerReducedWorkPercent', 0) / 100,
            carerYearsExpected: safeGetValue('carerYearsExpected', 0),
            agedParentsLocation: safeGetSelectValue('agedParentsLocation', 'australia'),
            carerAnnualExpense: parseFormattedNumber(getRawValue('carerAnnualExpense', '0')),

            // SMSF (PART 3)
            hasSMSF: safeGetChecked('hasSMSF', false),
            smsfAdminCosts: parseFormattedNumber(getRawValue('smsfAdminCosts', '3500')),
            smsfInvestmentStrategy: safeGetSelectValue('smsfInvestmentStrategy', 'balanced'),

            // Property improvements (PART 8)
            vacancyRate: safeGetValue('vacancyRate', 4) / 100,
            maintenanceInflation: safeGetValue('maintenanceInflation', 3.5) / 100,
            landTax: parseFormattedNumber(getRawValue('landTax', '0')),
            investmentPropertyLoanType: safeGetSelectValue('investmentPropertyLoanType', 'pi'),
            propertyState: safeGetSelectValue('propertyState', ''),

            // Property tax policy (shared property engine)
            propertyPolicyMode: safeGetSelectValue('advPropertyPolicyMode', 'current_rules'),
            currentCgtDiscountRate: safeGetValue('advCurrentCgtDiscount', 50) / 100,
            proposedMinCgtRate: safeGetValue('advProposedMinCgtRate', 20) / 100,
            negativeGearingCurrentAllowed: safeGetChecked('advNgCurrentAllowed', true),
            negativeGearingProposedNewBuildAllowed: safeGetChecked('advNgProposedNewBuild', true),
            proposedUsesInflationIndexation: safeGetChecked('advProposedCgtIndexation', true),

            // Trust improvements (PART 7)
            trustTaxRate: safeGetValue('trustTaxRate', 30) / 100,
            familyTrustIncomeDistribution: parseFormattedNumber(getRawValue('familyTrustIncomeDistribution', '0')),
            beneficiaryAllocation: safeGetValue('beneficiaryAllocation', 100) / 100,

            // Education costs (PART 4)
            educationCostPerChild: parseFormattedNumber(getRawValue('educationCostPerChild', '0')),
            privateSchool: safeGetChecked('privateSchool', false),
            universitySupport: safeGetChecked('universitySupport', false),

            // Super strategy (PART 2)
            yourAdditionalSuperContribution: parseFormattedNumber(getRawValue('yourAdditionalSuperContribution', '0')),
            partnerAdditionalSuperContribution: finalPartnerAge > 0 ? parseFormattedNumber(getRawValue('partnerAdditionalSuperContribution', '0')) : 0,
            yourAnnualNCC: parseFormattedNumber(getRawValue('yourAnnualNCC', '0')),
            partnerAnnualNCC: finalPartnerAge > 0 ? parseFormattedNumber(getRawValue('partnerAnnualNCC', '0')) : 0,
            concessionalCapUsed: parseFormattedNumber(getRawValue('concessionalCapUsed', '0')),
            spouseContribution: finalPartnerAge > 0 ? parseFormattedNumber(getRawValue('spouseContribution', '0')) : 0,
            downsizeContribution: safeGetChecked('downsizeContribution', false),

            // Scenario mode (PART 1)
            scenarioMode: safeGetSelectValue('scenarioMode', 'baseline'),

            // Global risk factors (PART 10)
            globalRiskFactor: safeGetValue('globalRiskFactor', 0),
            extremeInflationProbability: safeGetValue('extremeInflationProbability', 2) / 100,
            propertyCrashProbability: safeGetValue('propertyCrashProbability', 3) / 100,

            // Partnership status for calculations
            isSingleCalculation: finalPartnerAge === 0,

            // Derived partnership flag used by simulation engines (life_simulation_engine, pension_engine)
            isCouple: finalPartnerAge > 0,

            // Homeowner flag used by pension asset test (owns a home = exempt from assets test)
            homeowner: !isNonHomeowner && safeGetValue('homeValue', 0) > 0,

            // Life expectancy alias used by RetirementCostAnalyzer and some sub-engines
            // (collectInputs returns yourLifespan; this alias keeps all engines in sync)
            lifeExpectancy: safeGetValue('yourLifespan', 90),

            // Mortgage term remaining — computed from balance and monthly payment if no explicit field.
            // Used by RetirementCostAnalyzer to calculate annual mortgage repayment.
            mortgageTermLeft: (() => {
                const bal = safeGetValue('mortgageBalance', 0);
                const monthly = safeGetValue('monthlyMortgagePayment', 0);
                const rate = safeGetValue('mortgageRate', 0) / 100;
                if (bal <= 0 || monthly <= 0) return 0;
                // Reverse-solve term from amortisation formula: n = -ln(1 - rP/M) / ln(1+r)
                const r = rate / 12;
                if (r === 0) return Math.ceil(bal / monthly / 12);
                const n = -Math.log(1 - r * bal / monthly) / Math.log(1 + r);
                if (!isFinite(n) || n <= 0) return 25; // safe fallback
                return Math.min(Math.ceil(n / 12), 30); // cap at 30 years
            })(),

            // Other debts (affect net worth and cash flow)
            creditCardBalance: parseFormattedNumber(getRawValue('creditCardBalance', '0')),
            creditCardRate: safeGetValue('creditCardRate', 20) / 100,
            personalLoanBalance: parseFormattedNumber(getRawValue('personalLoanBalance', '0')),
            personalLoanRate: safeGetValue('personalLoanRate', 9) / 100,
            carLoanBalance: parseFormattedNumber(getRawValue('carLoanBalance', '0')),
            carLoanRate: safeGetValue('carLoanRate', 8) / 100,
            hecsBalance: parseFormattedNumber(getRawValue('hecsBalance', '0')),

            // Health condition (affects healthcare cost trajectory and aged care probability)
            healthCondition: safeGetSelectValue('healthCondition', 'good'),

            // Retirement lifestyle breakdown (added to base desired income)
            annualTravelBudget: parseFormattedNumber(getRawValue('annualTravelBudget', '0')),
            annualHobbyBudget: parseFormattedNumber(getRawValue('annualHobbyBudget', '0')),

            // Legacy / inheritance planning
            legacyGoal: parseFormattedNumber(getRawValue('legacyGoal', '0')),
            legacyGoalType: safeGetSelectValue('legacyGoalType', 'none'),

            // Optional future-asset scenarios. These are captured for scenario
            // analysis only and do not alter the base projection unless explicitly opted in.
            futurePropertyScenario: {
                enabled: safeGetChecked('futurePropertyEnabled', false),
                includeInBasePlan: safeGetChecked('futurePropertyIncludeInBase', false),
                eventType: safeGetSelectValue('futurePropertyEventType', 'buy_primary_home'),
                age: safeGetValue('futurePropertyAge', 0),
                propertyValue: parseFormattedNumber(getRawValue('futurePropertyValue', '0')),
                mortgage: parseFormattedNumber(getRawValue('futurePropertyMortgage', '0')),
                ownershipShare: safeGetValue('futurePropertyOwnershipShare', 100) / 100,
                roleAfterEvent: safeGetSelectValue('futurePropertyRole', 'primary_residence'),
                scenarioOnly: !safeGetChecked('futurePropertyIncludeInBase', false)
            },
            inheritanceScenario: {
                enabled: safeGetChecked('inheritanceScenarioEnabled', false),
                includeInBasePlan: safeGetChecked('inheritanceIncludeInBase', false),
                age: safeGetValue('inheritanceScenarioAge', 0),
                certainty: safeGetSelectValue('inheritanceConfidence', safeGetSelectValue('inheritanceCertainty', 'speculative')),
                type: safeGetSelectValue('inheritanceType', 'cash'),
                grossValue: parseFormattedNumber(getRawValue('inheritanceGrossValue', '0')),
                estimatedCosts: parseFormattedNumber(getRawValue('inheritanceEstimatedCosts', '0')),
                use: safeGetSelectValue('inheritanceUse', 'invest'),
                scenarioOnly: !safeGetChecked('inheritanceIncludeInBase', false)
            },

            // Proposed Budget 2026-27 measures toggle
            // Default FALSE — only apply current legislated law.
            // When TRUE, models: 14% rate (FY2027-28), WATO $250, $1,000 instant
            // deduction, CGT reform (inflation-indexed + 30% min).
            // These measures are NOT yet passed by Parliament.
            enableProposedBudget2026: safeGetChecked('enableProposedBudget2026', false),

            // Overseas retirement — wire the Overseas tab fields into the simulator.
            // Keep classic field names plus engine-facing aliases for v2 compatibility.
            overseasCountry: safeGetSelectValue('overseasCountry', ''),
            goingOverseas: safeGetSelectValue('overseasCountry', '') !== '',
            overseasAge: parseInt(safeGetValue('overseasAge', 0)) || 0,
            overseasStartAge: parseInt(safeGetValue('overseasAge', 0)) || 0,
            overseasMoveType: safeGetSelectValue('overseasMoveType', 'permanent'),
            overseasAgreementCountry: safeGetChecked('overseasAgreementCountry', false),
            overseasTaxResidency: safeGetSelectValue('overseasTaxResidency', 'australian'),
            overseasHealthCover: safeGetSelectValue('overseasHealthCover', 'international_private'),
            maintainResidency: safeGetChecked('maintainResidency', false),
            propertyStrategy: safeGetSelectValue('propertyStrategy', 'keep-personal'),
            trustBeneficiaries: safeGetSelectValue('trustBeneficiaries', 'you-only'),
            superAccess: safeGetSelectValue('superAccess', 'pension-mode'),
            estimatedLivingCosts: parseFormattedNumber(getRawValue('estimatedLivingCosts', '60000')),
            overseasAnnualBudget: parseFormattedNumber(getRawValue('estimatedLivingCosts', '60000')),
            overseasSpendingCurrency: safeGetSelectValue('overseasSpendingCurrency', 'AUD'),
            overseasAudFxChange: safeGetValue('overseasAudFxChange', -1) / 100,
            overseasHousingType: safeGetSelectValue('overseasHousingType', 'rent'),
            overseasAnnualRent: parseFormattedNumber(getRawValue('overseasAnnualRent', '12000')),
            overseasFallbackAge: parseInt(safeGetValue('overseasFallbackAge', 0)) || 0,
            overseasFallbackTrigger: safeGetSelectValue('overseasFallbackTrigger', 'none'),
            returnFrequency: safeGetSelectValue('returnFrequency', 'annually'),
            overseasReturnFrequency: safeGetSelectValue('returnFrequency', 'annually'),

            // FHSS
            hasFHSS: safeGetChecked('hasFHSS', false),
            fhssContributed: parseFormattedNumber(getRawValue('fhssContributed', '0')),

            // Legacy age-related fields used by older advanced page sections.
            homeModificationsCost: parseFormattedNumber(getRawValue('homeModificationsCost', '0')),
            homeModificationsAge: parseInt(safeGetValue('homeModificationsAge', 75)) || 75,
            annuityPurchaseAmount: parseFormattedNumber(getRawValue('annuityPurchaseAmount', '0'))
        };

        if (inputs.useGlidePath) {
            const currentAllocation = this.simulator.calculateDynamicAllocation(
                inputs.yourCurrentAge,
                inputs.glidePathRule
            );
            inputs.allocEquities = (currentAllocation?.equity || 0) / 100;
            inputs.allocBonds = (currentAllocation?.bonds || 0) / 100;
            inputs.allocCash = (currentAllocation?.cash || 0) / 100;
        } else {
            // Keep custom allocations self-healing so slightly-off manual inputs
            // still run instead of failing later in the simulation.
            const allocSum = (inputs.allocEquities + inputs.allocBonds + inputs.allocCash) * 100;
            if (allocSum > 0 && Math.abs(allocSum - 100) > 1) {
                showNotification(
                    `Asset allocation sums to ${allocSum.toFixed(1)}% (should be 100%). Normalising proportionally.`,
                    'warning'
                );
                const scale = 100 / allocSum;
                inputs.allocEquities *= scale;
                inputs.allocBonds *= scale;
                inputs.allocCash *= scale;
            }
        }

        return inputs;
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
            // Wire up click handler so any chart data-point click opens the detail popup
            this.chartManager.onDataPointClick = (chartId, datasetLabel, label, value, extra) => {
                this.showChartDetail(chartId, datasetLabel, label, value, extra);
            };
        }
        return this.chartManager;
    }

    /**
     * Open the chart detail popup with context about the clicked data point.
     * @param {string} chartId
     * @param {string} datasetLabel
     * @param {string|number} label  - x-axis label (age, year, country, etc.)
     * @param {number} value         - y-axis value
     * @param {Object} extra         - additional context from _buildClickHandler
     */
    showChartDetail(chartId, datasetLabel, label, value, extra = {}) {
        const modal = $('chart-detail-modal');
        const titleEl = $('chart-detail-title');
        const contentEl = $('chart-detail-content');
        if (!modal || !titleEl || !contentEl) return;

        // Build a human-readable title
        const chartTitles = {
            fanChart: 'Portfolio Balance Projection',
            allocationChart: 'Asset Allocation',
            propertyChart: 'Portfolio vs Property',
            healthcareChart: 'Healthcare Costs',
            propertyCashFlowChart: 'Property Cash Flow',
            sequenceRiskChart: 'Sequence of Returns Risk',
            overseasCostChart: 'Overseas Cost of Living',
            overseasPensionChart: 'Age Pension Portability'
        };
        titleEl.textContent = chartTitles[chartId] || 'Chart Details';

        // Format the value depending on whether it is numeric
        const formattedValue = (typeof value === 'number' && !isNaN(value))
            ? formatCurrency(Math.abs(value))
            : String(value ?? '');

        const labelKey = extra.age ? 'Age' : extra.year ? 'Year' : extra.country ? 'Country' : 'Label';
        const labelValue = extra.age ?? extra.year ?? extra.country ?? label;

        contentEl.innerHTML = `
            <div style="display:grid;gap:0.75rem;">
                <div style="display:flex;gap:1rem;flex-wrap:wrap;">
                    <div style="flex:1;min-width:140px;background:#f3f4f6;border-radius:8px;padding:0.75rem;">
                        <div style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280;margin-bottom:0.25rem;">${labelKey}</div>
                        <div style="font-weight:700;font-size:1.1rem;color:#111827;">${labelValue}</div>
                    </div>
                    ${datasetLabel ? `
                    <div style="flex:1;min-width:140px;background:#f3f4f6;border-radius:8px;padding:0.75rem;">
                        <div style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.05em;color:#6b7280;margin-bottom:0.25rem;">Series</div>
                        <div style="font-weight:600;color:#374151;">${datasetLabel}</div>
                    </div>` : ''}
                    <div style="flex:1;min-width:140px;background:#eff6ff;border-radius:8px;padding:0.75rem;">
                        <div style="font-size:0.72rem;text-transform:uppercase;letter-spacing:0.05em;color:#3b82f6;margin-bottom:0.25rem;">Value</div>
                        <div style="font-weight:700;font-size:1.1rem;color:#1d4ed8;">${formattedValue}</div>
                    </div>
                </div>
                ${extra.description ? `
                <div style="background:#fafafa;border-left:3px solid #4f46e5;border-radius:0 8px 8px 0;padding:0.875rem 1rem;color:#374151;line-height:1.6;">
                    ${extra.description}
                </div>` : ''}
                ${extra.probability !== undefined ? `
                <div style="background:#fef3c7;border-radius:8px;padding:0.75rem;color:#92400e;">
                    <strong>Probability:</strong> ${extra.probability}%
                </div>` : ''}
            </div>
        `;

        modal.style.display = 'flex';
    }

    closeChartDetail() {
        const modal = $('chart-detail-modal');
        if (modal) modal.style.display = 'none';
    }

    // Validate inputs before simulation runs. Returns array of error strings (empty = valid).
    validateInputs(inputs) {
        const errors = [];

        // Ages
        if (!inputs.yourCurrentAge || inputs.yourCurrentAge < 18 || inputs.yourCurrentAge > 100) {
            errors.push('Your current age must be between 18 and 100.');
        }
        if (inputs.retirementAge <= inputs.yourCurrentAge) {
            errors.push('Retirement age must be greater than your current age.');
        }
        if (inputs.retirementAge > 100) {
            errors.push('Retirement age must be 100 or below.');
        }
        const hasOpenEndedLifespan = inputs.yourLifespan === 0;
        if (!hasOpenEndedLifespan && inputs.yourLifespan <= inputs.yourCurrentAge) {
            errors.push('Expected lifespan must be greater than your current age, unless you enter 0 to model until money runs out.');
        }
        if (!hasOpenEndedLifespan && inputs.yourLifespan < inputs.retirementAge) {
            errors.push('Expected lifespan must be greater than or equal to retirement age.');
        }
        if (!inputs.isSingleCalculation && inputs.partnerCurrentAge > 0) {
            if (inputs.partnerCurrentAge < 18 || inputs.partnerCurrentAge > 100) {
                errors.push("Partner's current age must be between 18 and 100.");
            }
            if ((inputs.partnerRetirementAge || 0) <= inputs.partnerCurrentAge) {
                errors.push("Partner's retirement age must be greater than their current age.");
            }
            const hasOpenEndedPartnerLifespan = inputs.partnerLifespan === 0;
            if (!hasOpenEndedPartnerLifespan && inputs.partnerLifespan <= inputs.partnerCurrentAge) {
                errors.push("Partner's expected lifespan must be greater than their current age, unless you enter 0 to model until money runs out.");
            }
            if (!hasOpenEndedPartnerLifespan && (inputs.partnerLifespan || 0) < (inputs.partnerRetirementAge || 0)) {
                errors.push("Partner's expected lifespan must be greater than or equal to their retirement age.");
            }
        }

        // Monetary fields — must not be negative
        const monetaryFields = [
            ['yourSalary', 'Your annual salary'],
            ['yourCurrentSuper', 'Your current super balance'],
            ['currentSavings', 'Current savings'],
            ['currentStocks', 'Current investments'],
            ['currentMonthlyHousingCosts', 'Current monthly housing costs'],
            ['currentMonthlyLivingCosts', 'Current monthly living costs'],
            ['homeValue', 'Home value'],
            ['mortgageBalance', 'Mortgage balance'],
            ['monthlyMortgagePayment', 'Monthly mortgage payment'],
            ['investmentPropertyValue', 'Investment property value'],
            ['investmentPropertyLoan', 'Investment property loan'],
            ['investmentPropertyPurchasePrice', 'Investment property purchase price'],
            ['weeklyRentalIncome', 'Weekly rental income'],
            ['annualPropertyExpenses', 'Annual property expenses'],
            ['asfaComfortable', 'Target retirement income (ASFA)'],
        ];
        for (const [field, label] of monetaryFields) {
            const val = parseFloat(inputs[field]);
            if (!isNaN(val) && val < 0) {
                errors.push(`${label} cannot be negative.`);
            }
        }
        if (
            inputs.useDetailedExpenseInputs
            && (Number(inputs.currentMonthlyHousingCosts || 0)
                + Number(inputs.currentMonthlyLivingCosts || 0)
                + (Number(inputs.currentHealthcareCosts || 0) / 12)) <= 0
        ) {
            errors.push('Enter current household expenses before enabling explicit monthly expense inputs.');
        }

        // Percentage fields — must be 0–100 when expressed as decimal (0–1)
        const percentFields = [
            ['superContributionRate', 'Super contribution rate', 0, 1],
            ['employerSuperContributionRate', 'Employer super contribution rate', 0, 1],
            ['inflation', 'Inflation rate', 0, 0.3],
            ['investmentReturn', 'Investment return', -0.5, 0.5],
            ['percentIncomeSaved', 'Percentage of income saved', 0, 1],
            ['allocEquities', 'Equities allocation', 0, 1],
            ['allocBonds', 'Bonds allocation', 0, 1],
            ['allocCash', 'Cash allocation', 0, 1],
        ];
        for (const [field, label, min, max] of percentFields) {
            const val = parseFloat(inputs[field]);
            if (!isNaN(val) && (val < min || val > max)) {
                errors.push(`${label} (${Math.round(val * 100)}%) is outside the expected range.`);
            }
        }

        // Allocation must sum to ~100% when custom weights are in use
        if (!inputs.useGlidePath) {
            const allocSum = (inputs.allocEquities || 0) + (inputs.allocBonds || 0) + (inputs.allocCash || 0);
            if (Math.abs(allocSum - 1) > 0.05) {
                errors.push(`Asset allocation sums to ${Math.round(allocSum * 100)}% — must equal 100%.`);
            }
        }

        if (inputs.investmentPropertyPurchaseYear) {
            const currentYear = new Date().getFullYear();
            if (inputs.investmentPropertyPurchaseYear < 1900 || inputs.investmentPropertyPurchaseYear > currentYear + 1) {
                errors.push(`Investment property purchase year must be between 1900 and ${currentYear + 1}.`);
            }
        }

        // Salary must be positive to run a meaningful calculation
        if ((inputs.yourSalary || 0) <= 0 && (inputs.yourCurrentSuper || 0) <= 0 && (inputs.currentSavings || 0) <= 0) {
            errors.push('Please enter at least a salary, super balance, or savings amount to calculate.');
        }

        return errors;
    }

    // Main calculation function
    async calculateRetirement(shouldScrollToResults = true) {
        if (this.isCalculating) return;

        this.isCalculating = true;

        try {
            const inputs = profiler.measure('advanced-classic.input.collectInputs', () => this.collectInputs());

            // Dirty-flag: skip if inputs haven't changed since last successful calculation
            const currentHash = JSON.stringify(inputs);
            if (this.lastCalculationHash && currentHash === this.lastCalculationHash) {
                this.isCalculating = false;
                showNotification('No changes since last calculation — results are up to date.', 'info');
                return;
            }

            // Validate inputs before running simulation
            const validationErrors = this.validateInputs(inputs);
            if (validationErrors.length > 0) {
                this.isCalculating = false;
                const errorHTML = validationErrors.map(e => `<li>${e}</li>`).join('');
                showNotification(
                    `Please fix the following before calculating:<ul class="mt-1 list-disc pl-4">${errorHTML}</ul>`,
                    'error'
                );
                return;
            }

            // Persist inputs to localStorage so the Reverse Planner can import them
            try {
                localStorage.setItem('rc_forward_scenario', JSON.stringify(inputs));
            } catch {
                // localStorage may be unavailable (private browsing, storage full) — silently skip
            }

            let result;
            try {
                const projection = profiler.measure('advanced-classic.core.projectionService', () => (
                    this.projectionService.computeProjection(inputs, { sourceCalculator: 'advanced' })
                ));
                result = projection.simulation;
                this.currentProjection = projection;
                this.currentResults = result;
                this.refreshAllDerivedDefaults({ depletionAge: result.depletionAge });
            } catch (simError) {
                console.error('Simulation error:', simError);
                throw new Error(`Core simulation failed. Please check your financial inputs. Details: ${simError.message}`);
            }

            // Run outcome-based calculation
            try {
                profiler.measure('advanced-classic.post.outcomeCalculation', () => this.runOutcomeCalculation(inputs));
            } catch (outcomeError) {
                console.error('Outcome calculation error:', outcomeError);
                console.error('Error details:', outcomeError.message, outcomeError.stack);
                // Only show notification if this isn't the initial calculation with default data
                if (inputs.yourCurrentAge && inputs.yourCurrentAge !== this.config.DEFAULTS.personal.yourCurrentAge) {
                    showNotification('Could not generate outcome-based recommendations.', 'warning');
                }
            }

            // Update UI components with individual error handling
            try {
                profiler.measure('advanced-classic.post.riskProfile', () => this.updateRiskProfile(inputs));
                profiler.measure('advanced-classic.post.allocationStrategy', () => this.updateRecommendedAllocation(inputs));
                profiler.measure('advanced-classic.post.render.summaryResults', () => this.displaySummaryResults(result, inputs));
                profiler.measure('advanced-classic.post.render.yearByYearProjection', () => this.displayYearByYearProjection(result));
            } catch (summaryError) {
                console.error('Summary display error:', summaryError);
                // Allow continuing even if summary fails
                showNotification('Could not display summary results. Check console for details.', 'warning');
            }

            try {
                profiler.measure('advanced-classic.post.render.propertyAnalysis', () => this.displayPropertyAnalysis(result, inputs));
            } catch (propertyError) {
                console.error('Property analysis display error:', propertyError);
                showNotification('Could not display property analysis. Check property inputs.', 'warning');
            }

            try {
                profiler.measure('advanced-classic.post.render.riskAnalysis', () => this.displayRiskAnalysis(result, inputs));
            } catch (riskError) {
                console.error('Risk analysis display error:', riskError);
                showNotification('Could not display risk analysis.', 'warning');
            }

            try {
                profiler.measure('advanced-classic.post.render.optimizationStrategies', () => this.displayOptimizationStrategies(result, inputs));
            } catch (optError) {
                console.error('Optimization display error:', optError);
                showNotification('Could not display optimization strategies.', 'warning');
            }


            // Render charts
            try {
                const chartManager = await profiler.asyncMeasure('advanced-classic.post.chart.loadChartManager', () => this.getChartManager());
                profiler.measure('advanced-classic.post.chart.renderCompleteAnalysis', () => chartManager.renderCompleteAnalysis(result, inputs));
            } catch (chartError) {
                console.error('Chart rendering error:', chartError);
                showNotification('Could not render charts, but results are still valid.', 'warning');
            }


            // Store complete forward projection payload for Reverse Planner
            try {
                const outcome = this.currentOutcome;
                const adaptedResult = outcome ? {
                    annualIncome: outcome.sustainableIncomeToday || 0,
                    monthlyPaycheck: (outcome.sustainableIncomeToday || 0) / 12,
                    plannedSpendingToday: outcome.sustainableIncomeToday || 0,
                    swrMonthlyToday: (outcome.sustainableIncomeToday || 0) / 12,
                    superAtRetire: outcome.superAtRetirementToday || 0,
                    confidence: null,
                    depletionAge: outcome.legacy?.runOutAge || null,
                    gapMonthly: outcome.gapPerMonth || 0,
                    lastsUntil: outcome.legacy?.runOutAge || inputs.yourLifespan || 90,
                    years: result?.yearlyData?.map(y => ({ age: y.age, totalAssets: y.endBalance || 0 })) || [],
                } : null;

                const projectionPayload = buildForwardProjectionPayload({
                    source: 'advanced',
                    input: inputs,
                    engineInputs: inputs,
                    simulation: result,
                    adaptedResult,
                    recommendations: this.currentOutcomeActions || null,
                    canonicalInput: this.currentProjection?.canonicalInput || null,
                    derivedCashflow: this.currentProjection?.derivedCashflow || null,
                    inputHash: this.currentProjection?.inputHash || null,
                    projectionHash: this.currentProjection?.projectionHash || null,
                    policyVersion: this.currentProjection?.policyVersion || null,
                    diagnostics: this.currentProjection?.diagnostics || null,
                    warnings: this.currentProjection?.warnings || [],
                });
                storeForwardProjection(projectionPayload);
            } catch {
                // Silently skip — projection storage is non-critical
            }

            // Save inputs snapshot so we can skip re-runs when nothing changes
            this.lastCalculationHash = currentHash;

            // Show enhanced summary tab and conditionally scroll to results
            if (shouldScrollToResults) {
                profiler.measure('advanced-classic.post.render.showSummaryTab', () => showTab('summary', true));
                showNotification('Calculation completed successfully', 'success');
                profiler.report('advanced classic calculation profile');
            } else {
                // For initial load, just switch tabs without scrolling or notification
                profiler.measure('advanced-classic.post.render.showSummaryTab', () => showTab('summary', false));
                profiler.report('advanced classic calculation profile');
            }

        } catch (error) {
            console.error('Main calculation error:', error);
            if (shouldScrollToResults) {
                handleError(error, 'Retirement Calculation');
            }
        } finally {
            this.isCalculating = false;
        }
    }

    attemptAutoCalculation() {
        const inputs = this.collectInputs();
        if (this.validateInputs(inputs).length > 0) {
            return false;
        }

        this.calculateRetirement(false);
        return true;
    }

    getInflationFactor(years, inflationRate) {
        return Math.pow(1 + (inflationRate || 0), Math.max(0, years || 0));
    }

    toTodayDollars(futureValue, inflationFactor) {
        if (!inflationFactor) return futureValue;
        return futureValue / inflationFactor;
    }

    resolveProjectionEndAge(inputs, result = null) {
        if (result?.runUntilDepletionMode && result?.depletionAge) {
            return result.depletionAge;
        }

        // Prioritise main user's lifespan; fall back to partner's, then defaults.
        // Effective lifespans are 120 for open-ended (0) inputs — use the raw input
        // when it is meaningful (> current age), otherwise use effectiveYourLifespan.
        const yourRaw = inputs.yourLifespan > 0 ? inputs.yourLifespan : null;
        return yourRaw
            || result?.effectiveYourLifespan
            || (inputs.partnerLifespan > 0 ? inputs.partnerLifespan : null)
            || result?.effectivePartnerLifespan
            || 90;
    }

    formatDepletionAgeLabel(result) {
        if (!result?.depletionAge) return 'unknown age';
        if (result.depletionPartnerAge != null) {
            return `your age ${result.depletionAge} (partner age ${result.depletionPartnerAge})`;
        }
        return `age ${result.depletionAge}`;
    }

    formatDepletionPensionMessage(result) {
        if (!result) return '';
        if (result.depletionPensionIncome > 0) {
            return `Projected ${result.depletionIsCouple ? 'combined' : ''}${result.depletionIsCouple ? ' ' : ''}Age Pension at that point: ${formatCurrency(result.depletionPensionIncome)}/year.`;
        }
        return 'No Age Pension is projected at that point under current assumptions.';
    }

    hasExplicitPlanningHorizon(inputs) {
        return (inputs?.yourLifespan || 0) > (inputs?.yourCurrentAge || 0);
    }

    getShortfallHeadline(inputs, result) {
        if (result?.runUntilDepletionMode || !this.hasExplicitPlanningHorizon(inputs)) {
            return 'Open-Ended Projection Exhausts Assets';
        }

        return 'Retirement Shortfall Projected';
    }

    getShortfallSubheading(inputs, result, depletionAgeLabel) {
        if (result?.runUntilDepletionMode || !this.hasExplicitPlanningHorizon(inputs)) {
            return `With no fixed lifespan entered, the model keeps running until assets are depleted. Under current assumptions that happens around ${depletionAgeLabel}.`;
        }

        return `Modelled assets may be exhausted around ${depletionAgeLabel} under current assumptions`;
    }

    getConcessionalCap() {
        return this.config?.CONCESSIONAL_CAP || ENHANCED_CONFIG.CONCESSIONAL_CAP || 30000;
    }

    getEffectiveEmployerSuperRate() {
        const customRate = safeGetValue('employerSuperContributionRate', 0);
        if (customRate > 0) {
            return customRate / 100;
        }

        return ENHANCED_CONFIG.SUPER_GUARANTEE_RATE;
    }

    ensureFieldAutoIndicator(fieldId) {
        const field = $(fieldId);
        if (!field) return {};

        const label = document.querySelector(`label[for="${fieldId}"]`);
        const badgeAnchor = label?.closest('.label-with-tooltip') || label;
        let badge = document.querySelector(`[data-field-default-badge="${fieldId}"]`);
        if (!badge && badgeAnchor) {
            badge = document.createElement('span');
            badge.className = 'field-default-badge';
            badge.dataset.fieldDefaultBadge = fieldId;
            badge.hidden = true;
            badge.style.display = 'none';
            badgeAnchor.insertAdjacentElement('afterend', badge);
        }

        const wrapper = field.parentElement;
        let hint = wrapper?.querySelector(`[data-field-default-hint="${fieldId}"]`);
        if (!hint && wrapper) {
            hint = document.createElement('p');
            hint.className = 'field-default-hint';
            hint.dataset.fieldDefaultHint = fieldId;
            hint.hidden = true;
            hint.style.display = 'none';
            wrapper.appendChild(hint);
        }

        return { field, badge, hint };
    }

    setFieldAutoIndicator(fieldId, { active, message = '', badgeText = 'Auto-filled' }) {
        const { field, badge, hint } = this.ensureFieldAutoIndicator(fieldId);
        if (!field) return;

        if (!field.dataset.originalTitle) {
            field.dataset.originalTitle = field.title || '';
        }

        if (active) {
            if (badge) {
                badge.textContent = badgeText;
                badge.hidden = false;
                // Auto-managed helper badges need their own row in the fields that show
                // detailed blue helper text, otherwise long labels/hints can squeeze the input.
                const usesStackedAutoIndicator = !!field.closest('.super-strategy-field, .auto-indicator-field');
                badge.style.display = usesStackedAutoIndicator ? 'block' : 'inline-flex';
            }
            if (hint) {
                hint.textContent = message;
                hint.hidden = false;
                hint.style.display = 'block';
            }
            field.title = message;
            return;
        }

        if (badge) {
            badge.hidden = true;
            badge.style.display = 'none';
        }
        if (hint) {
            hint.hidden = true;
            hint.style.display = 'none';
            hint.textContent = '';
        }
        field.title = field.dataset.originalTitle || '';
    }

    registerAutoManagedField(fieldId, { zeroMeansBlank = false } = {}) {
        const field = $(fieldId);
        if (!field || field.dataset.autoManagedRegistered === 'true') return;

        const handleInput = () => {
            const numericValue = parseFormattedNumber(field.value);
            const lastAutoValue = parseFormattedNumber(field.dataset.lastAutoValue || '');
            const isBlank = field.value.trim() === '' || (zeroMeansBlank && numericValue === 0);

            if (isBlank) {
                field.dataset.userModified = 'false';
                field.dataset.autoCalculated = 'false';
                return;
            }

            if (numericValue !== lastAutoValue) {
                field.dataset.userModified = 'true';
                field.dataset.autoCalculated = 'false';
                this.setFieldAutoIndicator(fieldId, { active: false });
            }
        };

        field.addEventListener('input', handleInput);
        field.addEventListener('change', handleInput);
        field.dataset.autoManagedRegistered = 'true';
    }

    resetAutoManagedField(fieldId, value = '') {
        const field = $(fieldId);
        if (!field) return;

        safeSetValue(fieldId, value);
        field.dataset.autoCalculated = 'false';
        field.dataset.userModified = 'false';
        delete field.dataset.lastAutoValue;
        this.setFieldAutoIndicator(fieldId, { active: false });
    }

    applyAutoManagedFieldValue(fieldId, autoValue, {
        message,
        badgeText = 'Auto-filled',
        force = false,
        zeroMeansBlank = false,
        recognizedDefaults = []
    } = {}) {
        const field = $(fieldId);
        if (!field) return false;

        this.registerAutoManagedField(fieldId, { zeroMeansBlank });

        const normalizedAutoValue = Number(autoValue);
        const currentValue = parseFormattedNumber(field.value);
        const lastAutoValue = parseFormattedNumber(field.dataset.lastAutoValue || '');
        const isBlank = field.value.trim() === '' || (zeroMeansBlank && currentValue === 0);
        const matchesRecognizedDefault = recognizedDefaults.some((value) => Math.abs(currentValue - Number(value)) < 0.01);
        const matchesAutoValue = Math.abs(currentValue - normalizedAutoValue) < 0.01;
        const fieldStillMatchesAutoValue = field.dataset.autoCalculated === 'true' &&
            (isBlank || matchesAutoValue || currentValue === lastAutoValue);
        const shouldAutoApply = force ||
            fieldStillMatchesAutoValue ||
            isBlank ||
            matchesAutoValue ||
            currentValue === lastAutoValue ||
            (field.dataset.userModified !== 'true' && matchesRecognizedDefault);

        if (shouldAutoApply) {
            safeSetValue(fieldId, String(autoValue));
            field.dataset.autoCalculated = 'true';
            field.dataset.userModified = 'false';
            field.dataset.lastAutoValue = String(autoValue);
            this.setFieldAutoIndicator(fieldId, { active: true, message, badgeText });
            return true;
        }

        this.setFieldAutoIndicator(fieldId, { active: false });
        return false;
    }

    hasPartnerDataInForm() {
        const householdStatus = $('householdStatus')?.value;
        if (householdStatus === 'single') return false;

        const partnerAgeField = $('partnerCurrentAge');
        if (!partnerAgeField) return householdStatus === 'couple';

        const numericValue = parseFormattedNumber(partnerAgeField.value);
        return partnerAgeField.value.trim() !== '' && numericValue > 0;
    }

    getAutoManagedAsfaDefaults() {
        return [
            // Keep the immediately prior published ASFA values recognised so existing
            // saved forms and old defaults still migrate when household status changes.
            51814,
            73031,
            ENHANCED_CONFIG.OVERSEAS_RETIREMENT.ASFA_SINGLE_ANNUAL,
            ENHANCED_CONFIG.OVERSEAS_RETIREMENT.ASFA_COUPLE_ANNUAL
        ];
    }

    getAutoManagedPensionDefaults() {
        return [
            ENHANCED_CONFIG.SINGLE_PENSION_MAX,
            ENHANCED_CONFIG.COUPLE_PENSION_MAX,
            ENHANCED_CONFIG.SINGLE_ASSET_THRESHOLD,
            ENHANCED_CONFIG.SINGLE_ASSET_LIMIT,
            ENHANCED_CONFIG.SINGLE_ASSET_THRESHOLD_NON_HOMEOWNER,
            ENHANCED_CONFIG.SINGLE_ASSET_LIMIT_NON_HOMEOWNER,
            ENHANCED_CONFIG.COUPLE_ASSET_THRESHOLD,
            ENHANCED_CONFIG.COUPLE_ASSET_LIMIT,
            ENHANCED_CONFIG.COUPLE_ASSET_THRESHOLD_NON_HOMEOWNER,
            ENHANCED_CONFIG.COUPLE_ASSET_LIMIT_NON_HOMEOWNER,
            ENHANCED_CONFIG.SINGLE_INCOME_THRESHOLD,
            ENHANCED_CONFIG.COUPLE_INCOME_THRESHOLD
        ];
    }

    refreshPartnerFieldDefaults({ force = false } = {}) {
        const yourCurrentAge = safeGetValue('yourCurrentAge', this.config.DEFAULTS.personal.yourCurrentAge);
        const retirementAge = safeGetValue('retirementAge', this.config.DEFAULTS.personal.retirementAge);
        const yourLifespan = safeGetValue('yourLifespan', this.config.DEFAULTS.personal.yourLifespan);
        const hasPartnerContext = this.hasPartnerDataInForm();

        const partnerCurrentAgeField = $('partnerCurrentAge');
        if (partnerCurrentAgeField) {
            this.setFieldAutoIndicator('partnerCurrentAge', { active: false });
        }

        const partnerAge = safeGetValue('partnerCurrentAge', 0);
        if (!partnerAge) {
            if ($('partnerRetirementAge')?.dataset.autoCalculated === 'true') this.resetAutoManagedField('partnerRetirementAge', '');
            if ($('partnerLifespan')?.dataset.autoCalculated === 'true') this.resetAutoManagedField('partnerLifespan', '');
            return;
        }

        this.applyAutoManagedFieldValue('partnerRetirementAge', retirementAge, {
            message: `Defaulted to match your retirement age (${retirementAge}). Update it if your partner plans to retire at a different age.`,
            badgeText: 'Defaulted',
            force,
            zeroMeansBlank: true,
            recognizedDefaults: [retirementAge]
        });

        this.applyAutoManagedFieldValue('partnerLifespan', yourLifespan, {
            message: `Defaulted to match your lifespan assumption (${yourLifespan}) until you enter a different partner lifespan.`,
            badgeText: 'Defaulted',
            force,
            zeroMeansBlank: true,
            recognizedDefaults: [this.config.DEFAULTS.personal.partnerLifespan, yourLifespan]
        });
    }

    refreshResidencyFieldDefaults({ force = false } = {}) {
        const arrivalMappings = [
            {
                arrivalId: 'ageCameToAustralia',
                earningId: 'ageStartedEarningAustralia',
                label: 'your'
            },
            {
                arrivalId: 'partnerAgeCameToAustralia',
                earningId: 'partnerAgeStartedEarningAustralia',
                label: "your partner's"
            }
        ];

        arrivalMappings.forEach(({ arrivalId, earningId, label }) => {
            const arrivalAge = safeGetValue(arrivalId, 0);
            const earningField = $(earningId);
            if (!earningField) return;

            if (arrivalAge > 0) {
                this.applyAutoManagedFieldValue(earningId, arrivalAge, {
                    message: `Defaulted to ${label} arrival age (${arrivalAge}). Update it if work started later.`,
                    badgeText: 'Defaulted',
                    force,
                    zeroMeansBlank: true,
                    recognizedDefaults: [arrivalAge]
                });
            } else if (earningField.dataset.autoCalculated === 'true') {
                this.resetAutoManagedField(earningId, '');
            } else {
                this.setFieldAutoIndicator(earningId, { active: false });
            }
        });
    }

    refreshRetirementIncomeDefault({ force = false } = {}) {
        const isPartnered = this.hasPartnerDataInForm();
        const asfaDefault = isPartnered
            ? ENHANCED_CONFIG.OVERSEAS_RETIREMENT.ASFA_COUPLE_ANNUAL
            : ENHANCED_CONFIG.OVERSEAS_RETIREMENT.ASFA_SINGLE_ANNUAL;
        const householdLabel = isPartnered ? 'couple' : 'single';

        this.applyAutoManagedFieldValue('asfaComfortable', asfaDefault, {
            message: `Using the current ASFA comfortable annual standard for a ${householdLabel} household: ${formatCurrency(asfaDefault)} in today's dollars.`,
            badgeText: 'Official default',
            force,
            recognizedDefaults: this.getAutoManagedAsfaDefaults()
        });
    }

    refreshPensionFieldDefaults({ force = false } = {}) {
        const isPartnered = this.hasPartnerDataInForm();
        const residenceType = safeGetSelectValue('primaryResidenceType', 'own_mortgage');
        const homeowner = (residenceType === 'own_mortgage' || residenceType === 'own_with_mortgage' || residenceType === 'own_outright')
            && safeGetValue('homeValue', 0) > 0;
        const householdLabel = `${isPartnered ? 'couple' : 'single'} ${homeowner ? 'homeowner' : 'non-homeowner'}`;

        const defaultValues = {
            agePensionMax: isPartnered ? ENHANCED_CONFIG.COUPLE_PENSION_MAX : ENHANCED_CONFIG.SINGLE_PENSION_MAX,
            pensionAssetThreshold: isPartnered
                ? (homeowner ? ENHANCED_CONFIG.COUPLE_ASSET_THRESHOLD : ENHANCED_CONFIG.COUPLE_ASSET_THRESHOLD_NON_HOMEOWNER)
                : (homeowner ? ENHANCED_CONFIG.SINGLE_ASSET_THRESHOLD : ENHANCED_CONFIG.SINGLE_ASSET_THRESHOLD_NON_HOMEOWNER),
            pensionAssetLimit: isPartnered
                ? (homeowner ? ENHANCED_CONFIG.COUPLE_ASSET_LIMIT : ENHANCED_CONFIG.COUPLE_ASSET_LIMIT_NON_HOMEOWNER)
                : (homeowner ? ENHANCED_CONFIG.SINGLE_ASSET_LIMIT : ENHANCED_CONFIG.SINGLE_ASSET_LIMIT_NON_HOMEOWNER),
            pensionIncomeThreshold: isPartnered ? ENHANCED_CONFIG.COUPLE_INCOME_THRESHOLD : ENHANCED_CONFIG.SINGLE_INCOME_THRESHOLD
        };

        const fieldSuffix = {
            agePensionMax: 'per year',
            pensionAssetThreshold: 'asset threshold',
            pensionAssetLimit: 'asset limit',
            pensionIncomeThreshold: 'per fortnight'
        };

        Object.entries(defaultValues).forEach(([fieldId, value]) => {
            this.applyAutoManagedFieldValue(fieldId, value, {
                message: `Using the official ${householdLabel} Age Pension default for this field: ${formatCurrency(value).replace('.00', '')} ${fieldSuffix[fieldId]}.`,
                badgeText: 'Official default',
                force,
                recognizedDefaults: this.getAutoManagedPensionDefaults()
            });
        });
    }

    refreshCapitalGainsTaxDefault({ force = false } = {}) {
        const totalSalary = safeGetValue('yourSalary', 0) + safeGetValue('partnerSalary', 0);
        let marginalRate = 0;

        if (totalSalary > 190000) marginalRate = 45;
        else if (totalSalary > 135000) marginalRate = 37;
        else if (totalSalary > 45000) marginalRate = 30;
        else if (totalSalary > 18200) marginalRate = 16;

        const cgtRate = marginalRate * 0.5;
        this.applyAutoManagedFieldValue('capitalGainsTaxRate', cgtRate, {
            message: `Estimated from combined salary ${formatCurrency(totalSalary)} using a 50% CGT discount and a marginal rate of ${marginalRate}%. Override it if your expected sale-year tax rate differs.`,
            badgeText: 'Estimated',
            force,
            recognizedDefaults: [0, 8, 15, 18.5, 22.5]
        });
    }

    refreshHealthcareCostDefault({ force = false } = {}) {
        const isPartnered = this.hasPartnerDataInForm();
        const annualDefault = isPartnered ? 4800 : 2200;
        const householdLabel = isPartnered ? 'couple' : 'single';

        this.applyAutoManagedFieldValue('currentHealthcareCosts', annualDefault, {
            message: `Using the default annual healthcare baseline for a ${householdLabel} household: ${formatCurrency(annualDefault)}.`,
            badgeText: 'Estimated',
            force,
            recognizedDefaults: [2200, 3600, 4800, 5200]
        });
    }

    refreshAllDerivedDefaults({ force = false, depletionAge = null } = {}) {
        this.refreshPartnerFieldDefaults({ force });
        this.refreshResidencyFieldDefaults({ force });
        this.refreshEmploymentIncomeSummary();
        this.refreshSuperStrategyGuidance(force);
        this.refreshRetirementIncomeDefault({ force });
        this.refreshHealthcareCostDefault({ force });
        this.refreshPensionFieldDefaults({ force });
        this.refreshCapitalGainsTaxDefault({ force });
        this.syncAgedCareProjectionFields({ force, depletionAge });
    }

    refreshEmploymentIncomeSummary() {
        const summary = document.getElementById("employmentIncomeSummary");
        if (!summary) return;

        const concessionalCap = this.getConcessionalCap();
        const employerRate = this.getEffectiveEmployerSuperRate();
        const div293Threshold = this.config?.DIVISION_293_THRESHOLD || ENHANCED_CONFIG.DIVISION_293_THRESHOLD || 250000;
        const concessionalInput = document.getElementById("concessionalCapUsed");
        const sacrificeInput = document.getElementById("yourAdditionalSuperContribution");
        const concessionalAlreadyUsed = parseFormattedNumber(concessionalInput?.value || "0");
        const salarySacrifice = parseFormattedNumber(sacrificeInput?.value || "0");
        const applyMaxContributionBase = safeGetChecked("applyMaxContributionBase", true);
        const maxContributionBasePerQuarter = safeGetValue("maxContributionBasePerQuarter", DEFAULT_MAX_CONTRIBUTION_BASE_PER_QUARTER);
        const superCalc = resolveEmployerSuper({
            employmentIncome: safeGetValue("yourSalary", 0),
            incomeMode: safeGetSelectValue("salaryIncomeMode", SALARY_INCOME_MODES.EXCLUDING_SUPER),
            sgRate: employerRate,
            maxContributionBasePerQuarter,
            applyMaxContributionBase,
            employerSuperMode: safeGetChecked("employerSuperOverrideEnabled", false) ? EMPLOYER_SUPER_MODES.MANUAL_OVERRIDE : EMPLOYER_SUPER_MODES.CALCULATED,
            employerSuperOverrideAmount: parseFormattedNumber(getRawValue("employerSuperOverrideAmount", "0")),
        });
        const capStatus = calculateConcessionalCapStatus({
            employerSG: superCalc.employerSG,
            salarySacrifice,
            concessionalAlreadyUsed,
            concessionalCap,
        });
        const warnings = [];
        if (superCalc.sgCapApplied) warnings.push("Employer SG is normally capped by the maximum super contribution base. The calculated standard SG is " + formatCurrency(superCalc.calculatedEmployerSG) + ". Override only if your actual employer contributions differ.");
        if (superCalc.employerSuperOverridden) warnings.push("Employer SG manually overridden. Package-inclusive override recalculates cash salary within the package.");
        if (capStatus.hasExcessConcessionalContribution) warnings.push("Salary sacrifice exceeds remaining concessional cap unless carry-forward cap applies.");
        if (shouldWarnDivision293({
            cashSalary: superCalc.cashSalary,
            totalPackage: superCalc.totalPackage,
            lowTaxContributions: capStatus.totalConcessional,
            threshold: div293Threshold,
        })) {
            warnings.push("Division 293 tax may apply to high-income earners.");
        }

        summary.textContent = [
            "Salary excluding super / calculated cash salary: " + formatCurrency(superCalc.cashSalary),
            "Employer SG: " + formatCurrency(superCalc.employerSG) + (superCalc.employerSuperOverridden ? " manually overridden" : " calculated"),
            "Concessional cap remaining: " + formatCurrency(Math.max(0, capStatus.remainingConcessionalCap)),
            ...warnings,
        ].join(" ");
    }

    refreshSuperStrategyGuidance(forceApply = false) {
        const concessionalCap = this.getConcessionalCap();
        const employerRate = this.getEffectiveEmployerSuperRate();
        const div293Threshold = this.config?.DIVISION_293_THRESHOLD || ENHANCED_CONFIG.DIVISION_293_THRESHOLD || 250000;
        const concessionalAlreadyUsed = parseFormattedNumber($('concessionalCapUsed')?.value || '0');
        const applyMaxContributionBase = safeGetChecked('applyMaxContributionBase', true);
        const maxContributionBasePerQuarter = safeGetValue('maxContributionBasePerQuarter', DEFAULT_MAX_CONTRIBUTION_BASE_PER_QUARTER);
        const fields = [
            {
                salaryId: 'yourSalary',
                incomeModeId: 'salaryIncomeMode',
                contributionId: 'yourAdditionalSuperContribution',
                noteId: 'yourAdditionalSuperContributionHint',
                overrideCheckboxId: 'employerSuperOverrideEnabled',
                overrideAmountId: 'employerSuperOverrideAmount',
                emptyMessage: 'Enter your salary to calculate the remaining concessional contribution room available for salary sacrifice.'
            },
            {
                salaryId: 'partnerSalary',
                incomeModeId: 'partnerSalaryIncomeMode',
                contributionId: 'partnerAdditionalSuperContribution',
                noteId: 'partnerAdditionalSuperContributionHint',
                overrideCheckboxId: 'partnerEmployerSuperOverrideEnabled',
                overrideAmountId: 'partnerEmployerSuperOverrideAmount',
                emptyMessage: 'Enter your partner salary to calculate their remaining concessional contribution room.'
            }
        ];

        fields.forEach(({ salaryId, incomeModeId, contributionId, noteId, overrideCheckboxId, overrideAmountId, emptyMessage }) => {
            const employmentIncome = safeGetValue(salaryId, 0);
            const incomeMode = safeGetSelectValue(incomeModeId, SALARY_INCOME_MODES.EXCLUDING_SUPER);
            const superCalc = resolveEmployerSuper({
                employmentIncome,
                incomeMode,
                sgRate: employerRate,
                maxContributionBasePerQuarter,
                applyMaxContributionBase,
                employerSuperMode: safeGetChecked(overrideCheckboxId, false) ? EMPLOYER_SUPER_MODES.MANUAL_OVERRIDE : EMPLOYER_SUPER_MODES.CALCULATED,
                employerSuperOverrideAmount: parseFormattedNumber(getRawValue(overrideAmountId, '0')),
            });
            const salary = superCalc.cashSalary;
            const contributionInput = $(contributionId);
            const note = $(noteId);

            if (!contributionInput || !note) {
                return;
            }

            if (salary <= 0) {
                note.textContent = emptyMessage;
                if (forceApply || contributionInput.dataset.autoCalculated === 'true' || contributionInput.value.trim() === '' || parseFormattedNumber(contributionInput.value) === 0) {
                    safeSetValue(contributionId, '0');
                    contributionInput.dataset.autoCalculated = 'true';
                    contributionInput.dataset.userModified = 'false';
                    contributionInput.dataset.lastAutoValue = '0';
                }
                this.setFieldAutoIndicator(contributionId, {
                    active: true,
                    message: emptyMessage,
                    badgeText: 'Defaulted'
                });
                return;
            }

            const employerContribution = Math.round(superCalc.employerSG);
            const preSacrificeStatus = calculateConcessionalCapStatus({
                employerSG: employerContribution,
                concessionalAlreadyUsed,
                concessionalCap,
            });
            const remainingRoom = Math.max(0, preSacrificeStatus.remainingConcessionalCap);

            const modeLabel = incomeMode === SALARY_INCOME_MODES.PACKAGE_INCLUDING_SUPER ? "total package incl. super" : "salary excl. super";
            const capLabel = superCalc.sgCapApplied ? " SG is normally capped by the maximum contribution base. The calculated standard SG is " + formatCurrency(superCalc.calculatedEmployerSG) + "." : "";
            const baseNote = `Based on ${formatCurrency(employmentIncome)} (${modeLabel}), calculated cash salary is ${formatCurrency(superCalc.cashSalary)} and employer SG is about ${formatCurrency(employerContribution)}, leaving about ${formatCurrency(remainingRoom)} of concessional room under the ${formatCurrency(concessionalCap)} cap.${capLabel}`;
            note.textContent = baseNote;

            const currentValue = parseFormattedNumber(contributionInput.value);
            const shouldAutoApply = forceApply ||
                contributionInput.dataset.autoCalculated === 'true' ||
                contributionInput.value.trim() === '' ||
                currentValue === 0;

            if (shouldAutoApply) {
                safeSetValue(contributionId, String(remainingRoom));
                contributionInput.dataset.autoCalculated = 'true';
                contributionInput.dataset.userModified = 'false';
                contributionInput.dataset.lastAutoValue = String(remainingRoom);
                this.setFieldAutoIndicator(contributionId, {
                    active: true,
                    message: baseNote,
                    badgeText: 'Auto-filled'
                });
            } else {
                this.setFieldAutoIndicator(contributionId, { active: false });
            }

            // Concessional cap & Division 293 awareness. This is a warning-only
            // display and does not attempt the full Division 293 income formula.
            const userEntered = parseFormattedNumber(contributionInput.value);
            const effectiveSacrifice = Math.min(userEntered, remainingRoom);
            const totalConcessional = employerContribution + effectiveSacrifice;
            const contributionStatus = calculateConcessionalCapStatus({
                employerSG: employerContribution,
                salarySacrifice: userEntered,
                concessionalAlreadyUsed,
                concessionalCap,
            });
            const messages = [baseNote];

            if (contributionStatus.employerSGFillsCap) {
                messages.push('⚠ Employer SG alone reaches the concessional cap. Salary sacrifice may exceed the cap unless carry-forward cap applies.');
            }

            if (userEntered > remainingRoom + 1) {
                messages.push(`⚠ Your entry of ${formatCurrency(userEntered)} exceeds the remaining ${formatCurrency(remainingRoom)} of concessional room. The simulator will only sacrifice ${formatCurrency(effectiveSacrifice)}; any excess stays in your take-home pay (taxed at your marginal rate).`);
            }

            const div293Income = salary + totalConcessional; // simplified first-pass Division 293 estimate
            const div293Excess = Math.max(0, div293Income - div293Threshold);
            if (div293Excess > 0) {
                messages.push("⚠ Division 293 tax may apply to high-income earners. This can add an extra 15% tax to some or all concessional super contributions. Confirm with ATO or a tax adviser.");
            }

            // sanitise interpolations: every value above came from formatCurrency() over
            // a parsed number, so the only special character we might see is '$' / ','
            // (HTML-safe). Building messages via innerHTML is intentional to allow the
            // <span> styling block, and stays safe as long as the interpolated values
            // remain currency-formatted numbers only.
            if (messages.length > 1) {
                note.innerHTML = messages.map((m, i) => i === 0
                    ? m
                    : `<span style="display:block;margin-top:4px;color:#b45309;font-weight:500;">${m}</span>`
                ).join('');
            }
        });
    }

    syncAgedCareProjectionFields({ force = false, depletionAge = null } = {}) {
        const lifespanInput = $('yourLifespan');
        const currentAgeInput = $('yourCurrentAge');
        const startAgeInput = $('agedCareStartAge');
        const durationInput = $('agedCareDuration');
        const startHint = $('agedCareStartAgeHint');
        const durationHint = $('agedCareDurationHint');

        if (!lifespanInput || !currentAgeInput || !startAgeInput || !durationInput) {
            return;
        }

        const currentAge = safeGetValue('yourCurrentAge', 0);
        const expectedLifespan = safeGetValue('yourLifespan', 0);
        const hasExplicitLifespan = expectedLifespan > currentAge;

        const rawStartAge = startAgeInput.value.trim();
        let startAge = rawStartAge === '' ? 0 : parseFormattedNumber(rawStartAge);
        const startAgeMissing = startAge === 0;
        const canAutoFillStartAge = force || startAgeInput.dataset.autoCalculated === 'true' || startAgeMissing;

        if (startAgeMissing && depletionAge != null && canAutoFillStartAge) {
            safeSetValue('agedCareStartAge', String(depletionAge));
            startAgeInput.dataset.autoCalculated = 'true';
            startAgeInput.dataset.userModified = 'false';
            startAgeInput.dataset.lastAutoValue = String(depletionAge);
            startAge = depletionAge;
        }

        if (startHint) {
            if (startAgeInput.value.trim() === '' || parseFormattedNumber(startAgeInput.value) === 0) {
                startHint.textContent = 'Leave this at 0 or blank to use the age your assets run out after a projection is calculated.';
            } else if (startAgeInput.dataset.autoCalculated === 'true' && depletionAge != null) {
                startHint.textContent = `Auto-filled from the latest depletion age projection: age ${depletionAge}.`;
            } else {
                startHint.textContent = 'You can override this age if you want to model earlier or later aged care needs.';
            }
        }

        const currentDurationValue = parseFormattedNumber(durationInput.value);
        const shouldAutoFillDuration = force ||
            durationInput.dataset.autoCalculated === 'true' ||
            durationInput.value.trim() === '' ||
            currentDurationValue === 0;

        if (!hasExplicitLifespan) {
            if (shouldAutoFillDuration) {
                safeSetValue('agedCareDuration', '');
                durationInput.dataset.autoCalculated = 'true';
                durationInput.dataset.userModified = 'false';
                delete durationInput.dataset.lastAutoValue;
            }

            if (durationHint) {
                durationHint.textContent = 'This auto-calculates once you enter a lifespan above your current age.';
            }
            return;
        }

        if (!startAge || startAge <= 0) {
            if (shouldAutoFillDuration) {
                safeSetValue('agedCareDuration', '');
                durationInput.dataset.autoCalculated = 'true';
                durationInput.dataset.userModified = 'false';
                delete durationInput.dataset.lastAutoValue;
            }

            if (durationHint) {
                durationHint.textContent = 'Set an aged care start age, or leave it at 0 and calculate to use the depletion age once available.';
            }
            return;
        }

        const derivedDuration = Math.max(0, expectedLifespan - startAge);

        if (shouldAutoFillDuration) {
            safeSetValue('agedCareDuration', String(derivedDuration));
            durationInput.dataset.autoCalculated = 'true';
            durationInput.dataset.userModified = 'false';
            durationInput.dataset.lastAutoValue = String(derivedDuration);
        }

        if (durationHint) {
            durationHint.textContent = `Auto-calculated as expected lifespan ${expectedLifespan} minus aged care start age ${startAge}.`;
        }
    }

    resolveOutcomeStatusPresentation(outcome) {
        const inputs = this.collectInputs ? this.collectInputs() : {};
        const simulation = this.currentResults;
        const explicitPlanningHorizon = this.hasExplicitPlanningHorizon(inputs);

        const defaultPresentation = {
            status: outcome.status,
            statusColor: outcome.status === 'SHORTFALL' ? '#ef4444' : '#22c55e',
            statusIcon: outcome.status === 'SHORTFALL' ? '⚠️' : '✅',
            statusLabel: outcome.status === 'SHORTFALL' ? 'Shortfall' : 'On Track',
            statusDetail: null,
            gapClass: outcome.status === 'SHORTFALL' ? 'shortfall' : 'surplus',
            gapAmountText: outcome.status === 'SHORTFALL'
                ? `${formatCurrency(Math.abs(outcome.gap))}/year`
                : `${formatCurrency(Math.abs(outcome.gap))}/year surplus`,
            gapSubtitleHtml: outcome.status === 'SHORTFALL'
                ? `<span id="outcome-gap-weekly">${formatCurrency(Math.abs(outcome.gapPerWeek))}</span>/week shortfall in today's dollars`
                : 'You\'re on track in today\'s dollars.'
        };

        if (!simulation || !explicitPlanningHorizon) {
            return defaultPresentation;
        }

        const simulationOnTrack = simulation.finalBalance > 0;
        const conservativeOnTrack = outcome.status !== 'SHORTFALL';
        if (simulationOnTrack === conservativeOnTrack) {
            return defaultPresentation;
        }

        const projectionEndAge = this.resolveProjectionEndAge(inputs, simulation);
        const conservativeGapText = `${formatCurrency(Math.abs(outcome.gap))}/year`;

        if (simulationOnTrack) {
            return {
                status: 'ON_TRACK',
                statusColor: '#22c55e',
                statusIcon: '✅',
                statusLabel: 'On Track',
                statusDetail: `Full simulation reaches age ${projectionEndAge} with ${formatCurrency(simulation.finalBalance)} remaining. The quick check is more conservative because it compares a 4% drawdown + Age Pension against the ASFA target income.`,
                gapClass: 'surplus',
                gapAmountText: `${formatCurrency(simulation.finalBalance)} remaining`,
                gapSubtitleHtml: `Full simulation reaches age ${projectionEndAge}. Conservative quick check still shows a ${conservativeGapText}/year income gap versus the target.`
            };
        }

        const depletionAgeLabel = simulation.depletionAge
            ? `around age ${simulation.depletionAge}`
            : `before age ${projectionEndAge}`;
        return {
            status: 'SHORTFALL',
            statusColor: '#ef4444',
            statusIcon: '⚠️',
            statusLabel: 'Shortfall',
            statusDetail: `Full simulation exhausts assets ${depletionAgeLabel}. The quick check looks better because it does not model the full year-by-year drawdown path.`,
            gapClass: 'shortfall',
            gapAmountText: simulation.depletionAge ? `Age ${simulation.depletionAge}` : conservativeGapText,
            gapSubtitleHtml: simulation.depletionAge
                ? `Full simulation runs out ${depletionAgeLabel} under the current settings.`
                : `Full simulation does not sustain the plan to age ${projectionEndAge}.`
        };
    }

    setupProjectionDrivenFields() {
        const autofillDependencyFields = [
            'yourSalary', 'partnerSalary', 'salaryIncomeMode', 'partnerSalaryIncomeMode',
            'employerSuperContributionRate', 'applyMaxContributionBase', 'maxContributionBasePerQuarter',
            'concessionalCapUsed', 'yourAdditionalSuperContribution', 'partnerAdditionalSuperContribution',
            'yourCurrentAge', 'retirementAge', 'yourLifespan',
            'partnerCurrentAge', 'partnerCurrentSuper', 'partnerRetirementAge', 'partnerLifespan',
            'ageCameToAustralia', 'partnerAgeCameToAustralia', 'homeValue'
        ];

        autofillDependencyFields.forEach((fieldId) => {
            const field = $(fieldId);
            if (!field) return;
            field.addEventListener('input', () => this.refreshAllDerivedDefaults());
            field.addEventListener('blur', () => this.refreshAllDerivedDefaults());
            field.addEventListener('change', () => this.refreshAllDerivedDefaults());
        });

        [
            ['yourAdditionalSuperContribution', false],
            ['partnerAdditionalSuperContribution', false],
            ['partnerCurrentAge', true],
            ['partnerRetirementAge', true],
            ['partnerLifespan', true],
            ['ageStartedEarningAustralia', true],
            ['partnerAgeStartedEarningAustralia', true],
            ['asfaComfortable', false],
            ['agePensionMax', false],
            ['pensionAssetThreshold', false],
            ['pensionAssetLimit', false],
            ['pensionIncomeThreshold', false],
            ['capitalGainsTaxRate', false]
        ].forEach(([fieldId, zeroMeansBlank]) => this.registerAutoManagedField(fieldId, { zeroMeansBlank }));

        ['yourLifespan', 'yourCurrentAge', 'agedCareStartAge'].forEach((fieldId) => {
            const field = $(fieldId);
            if (!field) return;
            field.addEventListener('input', () => this.syncAgedCareProjectionFields());
            field.addEventListener('blur', () => this.syncAgedCareProjectionFields());
        });

        const agedCareStartAge = $('agedCareStartAge');
        if (agedCareStartAge) {
            agedCareStartAge.addEventListener('input', () => {
                const numericValue = parseFormattedNumber(agedCareStartAge.value);
                const isBlank = agedCareStartAge.value.trim() === '' || numericValue === 0;
                agedCareStartAge.dataset.userModified = isBlank ? 'false' : 'true';
                agedCareStartAge.dataset.autoCalculated = 'false';
            });
        }

        const agedCareDuration = $('agedCareDuration');
        if (agedCareDuration) {
            agedCareDuration.addEventListener('input', () => {
                const numericValue = parseFormattedNumber(agedCareDuration.value);
                const lastAutoValue = parseFormattedNumber(agedCareDuration.dataset.lastAutoValue || '');
                const isBlank = agedCareDuration.value.trim() === '' || numericValue === 0;

                if (isBlank) {
                    agedCareDuration.dataset.userModified = 'false';
                    agedCareDuration.dataset.autoCalculated = 'true';
                    this.syncAgedCareProjectionFields();
                    return;
                }

                if (numericValue !== lastAutoValue) {
                    agedCareDuration.dataset.userModified = 'true';
                    agedCareDuration.dataset.autoCalculated = 'false';
                }
            });
        }

        this.refreshAllDerivedDefaults();
    }

    formatFutureValueWithTodayNote(futureValue, inflationFactor) {
        return `${formatCurrency(futureValue)} <span class="block text-xs font-normal text-gray-500 mt-1">≈ ${formatCurrency(this.toTodayDollars(futureValue, inflationFactor))} in today's dollars</span>`;
    }

    formatTodayValueWithFutureNote(todayValue, inflationFactor) {
        return `${formatCurrency(todayValue)} <span class="block text-xs font-normal text-gray-500 mt-1">≈ ${formatCurrency(todayValue * inflationFactor)} at retirement after inflation</span>`;
    }

    // Display enhanced summary results
    displaySummaryResults(result, inputs) {
        const yearsToRetirement = inputs.retirementAge - inputs.yourCurrentAge;
        const inflationFactor = this.getInflationFactor(yearsToRetirement, inputs.inflation);

        safeSetHTML('summaryResults', `
            <div class="p-3 bg-slate-50 rounded border border-slate-300" style="grid-column:1/-1">
                <strong>Projection Quality Check</strong>
                <div class="text-xs mt-1">Source: advanced · Input hash: ${this.currentProjection?.inputHash || '—'} · Projection hash: ${this.currentProjection?.projectionHash || '—'} · Scenario: ${this.currentProjection?.diagnostics?.scenarioMode || 'base'} · Return basis: nominal · Monte Carlo: ${this.currentMonteCarloResults ? 'run' : 'not run'} · Warnings: ${this.currentProjection?.diagnostics?.projectionQuality?.warnings?.length || 0} · Blocking issues: ${this.currentProjection?.diagnostics?.projectionQuality?.blockingIssues?.length || 0}</div>
            </div>
            <div class="p-3 bg-blue-50 rounded flex justify-between">
                <strong>Years to Retirement:</strong>
                <span>${yearsToRetirement} <a href="#" class="show-calc-link" data-calc-id="yearsToRetirement">(show)</a></span>
            </div>
            <div class="p-3 bg-blue-50 rounded flex justify-between">
                <strong>Future Super:</strong>
                <span class="font-semibold text-right">${this.formatFutureValueWithTodayNote(result.accumulatedSuperBalance, inflationFactor)} <a href="#" class="show-calc-link" data-calc-id="accumulatedSuperBalance">(show)</a></span>
            </div>
            <div class="p-3 bg-blue-50 rounded flex justify-between">
                <strong>Future Savings:</strong>
                <span class="font-semibold text-right">${this.formatFutureValueWithTodayNote(result.accumulatedSavingsBalance, inflationFactor)} <a href="#" class="show-calc-link" data-calc-id="accumulatedSavingsBalance">(show)</a></span>
            </div>
            <div class="p-3 bg-blue-50 rounded flex justify-between">
                <strong>Future Investments:</strong>
                <span class="font-semibold text-right">${this.formatFutureValueWithTodayNote(result.accumulatedInvestmentPortfolio, inflationFactor)} <a href="#" class="show-calc-link" data-calc-id="accumulatedInvestmentPortfolio">(show)</a></span>
            </div>
            <div class="p-3 bg-green-50 rounded flex justify-between">
                <strong>Accessible Home Equity:</strong>
                <span class="font-semibold text-right">${this.formatFutureValueWithTodayNote(result.accessibleHomeEquity, inflationFactor)} <a href="#" class="show-calc-link" data-calc-id="accessibleHomeEquity">(show)</a></span>
            </div>
            ${inputs.hasInvestmentProperty ? `
            <div class="p-3 bg-yellow-50 rounded flex justify-between">
                <strong>Property Equity:</strong>
                <span class="font-semibold text-right">${this.formatFutureValueWithTodayNote(result.propertyEquity, inflationFactor)} <a href="#" class="show-calc-link" data-calc-id="propertyEquity">(show)</a></span>
            </div>
            ` : ''}
            <div class="p-3 bg-green-50 rounded flex justify-between">
                <strong>Total Assets at Retirement:</strong>
                <span class="font-bold text-lg text-right">${this.formatFutureValueWithTodayNote(result.totalFinancialAssets + result.accessibleHomeEquity, inflationFactor)} <a href="#" class="show-calc-link" data-calc-id="totalAssets">(show)</a></span>
            </div>
            <div class="p-3 bg-red-50 rounded flex justify-between">
                <strong>Income Needed (ASFA):</strong>
                <span class="font-bold text-lg text-right">${this.formatTodayValueWithFutureNote(inputs.asfaComfortable, inflationFactor)} <a href="#" class="show-calc-link" data-calc-id="incomeNeeded">(show)</a></span>
            </div>
            <div class="p-3 bg-purple-50 rounded flex justify-between">
                <strong>Expected Aged Care Costs:</strong>
                <span class="font-semibold text-right">${this.formatFutureValueWithTodayNote(result.agedCareCosts.expectedCost, inflationFactor)} <a href="#" class="show-calc-link" data-calc-id="agedCareCosts">(show)</a></span>
            </div>
        `);

        // Final result
        const finalResultContainer = $('finalResult');
        const shortfallActionPanel = $('shortfall-action-panel');
        const projectionEndAge = this.resolveProjectionEndAge(inputs, result);
        if (finalResultContainer) {
            if (result.finalBalance > 0) {
                finalResultContainer.className = 'mt-4 p-4 rounded-lg bg-green-100 text-green-800 border border-green-300';
                finalResultContainer.innerHTML = `
                    <div class="flex items-center gap-3">
                        <span class="text-2xl">✅</span>
                        <div>
                            <div class="font-bold text-lg" style="font-family:var(--font-display,'Playfair Display',serif)">Retirement Goal Met</div>
                            <div class="text-sm mt-0.5">Projected remaining assets at age ${projectionEndAge}: <strong style="font-family:var(--font-data,'JetBrains Mono',monospace)">${formatCurrency(result.finalBalance)}</strong></div>
                        </div>
                    </div>
                `;
                if (shortfallActionPanel) shortfallActionPanel.classList.add('hidden');
            } else {
                const lifespan = projectionEndAge;
                const yearsToRet = (inputs.retirementAge || 65) - (inputs.yourCurrentAge || 50);
                const salary = inputs.yourSalary || 0;
                const superRate = inputs.superContributionRate || 0.115;
                const addlSuper = inputs.yourAdditionalSuperContribution || 0;
                const currentConcessional = (salary * superRate) + addlSuper;
                const remainingSalarySacrifice = Math.max(0, 30000 - currentConcessional);
                const canSalarySacrifice = remainingSalarySacrifice > 1000 && salary > 0;
                const depletionAgeLabel = this.formatDepletionAgeLabel(result);
                const depletionPensionMessage = this.formatDepletionPensionMessage(result);

                // Rough quantified estimates for each lever
                const bal = result.accumulatedSuperBalance || 0;
                const delay2YrsValue = Math.round(bal * 0.15 + salary * superRate * 2);
                const reduce5kValue = Math.round(5000 * Math.max(5, lifespan - (inputs.retirementAge || 65)));
                const salarySacrificeAnnual = canSalarySacrifice ? Math.round(Math.min(remainingSalarySacrifice, salary * 0.1)) : 0;
                const shortfallHeadline = this.getShortfallHeadline(inputs, result);
                const shortfallSubheading = this.getShortfallSubheading(inputs, result, depletionAgeLabel);

                finalResultContainer.className = 'mt-4 rounded-lg overflow-hidden border border-red-300';
                finalResultContainer.innerHTML = `
                    <div class="p-4 bg-red-600 text-white flex items-center gap-3">
                        <span class="text-2xl flex-shrink-0">⚠️</span>
                        <div>
                            <div class="font-bold text-lg" style="font-family:var(--font-display,'Playfair Display',serif)">${shortfallHeadline}</div>
                            <div class="text-red-100 text-sm mt-0.5">${shortfallSubheading}</div>
                        </div>
                    </div>
                    <div class="p-4 bg-red-50">
                        <p class="text-sm text-red-800 mb-4 leading-relaxed">Under current assumptions, your modelled portfolio may not sustain income to your planning horizon. The following illustrates how changes to key inputs could affect the outcome — these are educational projections, not predictions. Seek advice from a licensed financial adviser before making decisions.</p>
                        <p class="text-sm text-red-800 mb-4 leading-relaxed"><strong>At depletion:</strong> ${depletionPensionMessage}</p>
                        <h5 class="text-xs font-semibold uppercase tracking-wider text-red-700 mb-3" style="font-family:var(--font-ui,'DM Sans',sans-serif)">Levers to explore:</h5>
                        <div class="space-y-2">
                            ${canSalarySacrifice ? `
                            <div class="shortfall-lever">
                                <span class="shortfall-lever-icon up">↑</span>
                                <div class="shortfall-lever-text">
                                    <strong>Increase salary sacrifice to super:</strong> You may have capacity to contribute up to an extra
                                    <span class="shortfall-lever-value">${formatCurrency(salarySacrificeAnnual)}/year</span>
                                    concessionally (taxed at 15%, not your marginal rate). Over ${yearsToRet} years this compounds substantially and reduces taxable income now.
                                </div>
                            </div>` : ''}
                            <div class="shortfall-lever">
                                <span class="shortfall-lever-icon up">↑</span>
                                <div class="shortfall-lever-text">
                                    <strong>Delay retirement by 2 years:</strong> Two more working years adds contributions and shortens the decumulation period. Modelled impact: approximately
                                    <span class="shortfall-lever-value">+${formatCurrency(delay2YrsValue)}</span>
                                    to your balance at retirement.
                                </div>
                            </div>
                            <div class="shortfall-lever">
                                <span class="shortfall-lever-icon down">↓</span>
                                <div class="shortfall-lever-text">
                                    <strong>Reduce planned retirement spending by $5,000/year:</strong> Lower annual drawdown extends how long funds last. Over ${lifespan - (inputs.retirementAge || 65)} retirement years this preserves approximately
                                    <span class="shortfall-lever-value">${formatCurrency(reduce5kValue)}</span>
                                    in capital (undiscounted).
                                </div>
                            </div>
                            <div class="shortfall-lever">
                                <span class="shortfall-lever-icon info">→</span>
                                <div class="shortfall-lever-text">
                                    <strong>Age Pension safety net:</strong> If your super depletes, the Australian Age Pension provides a baseline income (currently ~$30,646/year for singles, ~$46,202 combined for couples). This is already included in your modelled projections.
                                </div>
                            </div>
                            <div class="shortfall-lever">
                                <span class="shortfall-lever-icon info">→</span>
                                <div class="shortfall-lever-text">
                                    <strong>Review asset allocation:</strong> If holdings are conservative (high cash/bonds), a growth-oriented allocation may improve long-run returns. Run the <em>Risk Analysis</em> and <em>Asset Allocation</em> tools above to model this.
                                </div>
                            </div>
                        </div>
                        <p class="text-xs text-red-500 mt-3">Run the Monte Carlo simulation for a probabilistic view. Adjust inputs and recalculate to see updated projections.</p>
                    </div>
                `;
                if (shortfallActionPanel) shortfallActionPanel.classList.remove('hidden');
            }
        }

        // Transfer Balance Cap + age-specific warnings
        const superWarnings = [];
        const TRANSFER_BALANCE_CAP_2025 = 2000000;
        const TRANSFER_BALANCE_CAP_2027 = 2100000;
        const yearsToRetirementCalc = inputs.retirementAge - inputs.yourCurrentAge;
        const projectedTBC = yearsToRetirementCalc >= 2 ? TRANSFER_BALANCE_CAP_2027 : TRANSFER_BALANCE_CAP_2025;

        if (result.accumulatedSuperBalance > projectedTBC) {
            superWarnings.push(`⚠️ <strong>Transfer Balance Cap:</strong> Your projected super ($${Math.round(result.accumulatedSuperBalance / 1000).toLocaleString()}k) exceeds the $${Math.round(projectedTBC / 1000).toLocaleString()}k Transfer Balance Cap. Amounts above the cap cannot move to tax-free pension phase — seek financial advice on excess strategies (e.g. non-concessional withdrawals, account-based vs accumulation split).`);
        }
        if (inputs.yourCurrentAge >= 75) {
            superWarnings.push(`ℹ️ <strong>Super Contributions:</strong> At age 75+ you can only make mandated employer (SG) contributions — voluntary concessional and non-concessional contributions are not permitted.`);
        } else if (inputs.yourCurrentAge >= 67) {
            superWarnings.push(`ℹ️ <strong>Work Test:</strong> At age 67–74, personal super contributions (salary sacrifice and personal deductible) require you to meet the work test (40 hours in 30 consecutive days) unless your TSB was < $300k at the prior 30 June.`);
        }
        // Residency warning if insufficient AWLR
        if (inputs.ageCameToAustralia > 0) {
            const awlrAtRetirement = Math.max(0, inputs.retirementAge - inputs.ageCameToAustralia);
            if (awlrAtRetirement < 10) {
                superWarnings.push(`⚠️ <strong>Age Pension Eligibility:</strong> With ${awlrAtRetirement} years of Australian residence at retirement (came at age ${inputs.ageCameToAustralia}), you will NOT meet the 10-year residence requirement for Age Pension. The pension has been removed from your projections.`);
            } else if (awlrAtRetirement < 35) {
                const awlrPct = Math.round((awlrAtRetirement / 35) * 100);
                superWarnings.push(`ℹ️ <strong>Overseas Pension Portability:</strong> With ${awlrAtRetirement} years residence (AWLR), your Age Pension overseas portability is approximately ${awlrPct}% of the full rate.`);
            }
        }

        // Trust structure warnings based on type and control level
        if (inputs.hasTrustAssets && inputs.trustNetAssets > 0) {
            if (inputs.trustControlLevel === 'full-control' && inputs.trustType === 'discretionary') {
                superWarnings.push(`⚠️ <strong>Discretionary Trust (Full Control):</strong> Centrelink may attribute 100% of the trust's assets to you regardless of your stated attribution percentage, because you exercise full control. Professional Centrelink advice is recommended before retirement.`);
            }
            if (inputs.trustType === 'unit') {
                superWarnings.push(`ℹ️ <strong>Unit Trust:</strong> Your units are assessed at market value as a financial investment. The attribution percentage should reflect the fraction of total units you hold.`);
            }
            if (inputs.trustType === 'hybrid') {
                superWarnings.push(`⚠️ <strong>Hybrid Trust:</strong> Hybrid trusts combine fixed and discretionary elements. Centrelink assessment is complex — seek specialist advice as attribution rules may be unfavourable.`);
            }
        }

        // LHC loading warning
        const ageFirstCover = inputs.ageFirstPrivateCover;
        if (ageFirstCover && ageFirstCover > 30 && inputs.hasPrivateHealthCover) {
            const yearsCovered = (inputs.yourCurrentAge || 40) - ageFirstCover;
            const loadingPct = yearsCovered >= 10 ? 0 : Math.min(70, (ageFirstCover - 30) * 2);
            if (loadingPct > 0) {
                const additionalCost = Math.round(2800 * loadingPct / 100);
                superWarnings.push(`⚠️ <strong>LHC Loading ${loadingPct}%:</strong> Your private hospital premium is ~$${additionalCost.toLocaleString()}/year higher due to delayed cover. Cleared after ${10 - yearsCovered} more years of continuous cover.`);
            }
        }

        if (superWarnings.length > 0) {
            const warningEl = $('superContributionWarnings');
            const warningHTML = `<div class="mt-3 space-y-2">${superWarnings.map(w => `<div class="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">${w}</div>`).join('')}</div>`;
            if (warningEl) {
                warningEl.innerHTML = warningHTML;
            } else {
                const summaryEl = $('summaryResults');
                if (summaryEl) {
                    const div = document.createElement('div');
                    div.id = 'superContributionWarnings';
                    div.innerHTML = warningHTML;
                    summaryEl.parentNode.insertBefore(div, summaryEl.nextSibling);
                }
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

        const retirementAge = inputs.retirementAge || 65;

        this.updateCurrentRetirementIncomePanel(result, inputs);
        this.renderCareerImpactBanner(inputs);

        result.yearlyData.slice(0, 30).forEach(data => {
            if (data.depleted) {
                projectionTable.innerHTML += `
                    <tr class="bg-red-100">
                        <td colspan="12" class="px-4 py-2 text-center font-bold text-red-800" style="font-family:var(--font-ui,'DM Sans',sans-serif)">
                            ⚠️ Modelled assets depleted in ${data.year} at age ${data.age}${data.partnerAlive ? ` (partner age ${data.partnerAge})` : ''}${data.pensionIncome > 0 ? ` — projected ${data.partnerAlive ? 'combined ' : ''}Age Pension ${formatCurrency(data.pensionIncome)}/year` : ' — no Age Pension projected at that point'}
                        </td>
                    </tr>
                `;
                return;
            }

            // Format age display as "YourAge/PartnerAge" with '-' for deceased
            let ageDisplay = data.age;
            if (data.partnerAge !== undefined) {
                const yourAgeStr = data.yourAlive === false ? '-' : data.yourAge;
                const partnerAgeStr = data.partnerAlive === false ? '-' : data.partnerAge;
                ageDisplay = `${yourAgeStr}/${partnerAgeStr}`;
            }

            const isRetirementYear = data.age === retirementAge || (data.yourAge === retirementAge);
            const isOverseas = data.overseasYear === true;
            const rowClass = [isRetirementYear ? 'retirement-row' : '', isOverseas ? 'overseas-row' : ''].filter(Boolean).join(' ');
            const endBal = data.endBalance || 0;
            const netWorth = endBal + (data.nonLiquidAssets || 0);

            // Derive withdrawal funding source from super/non-super balance split
            const superBal = data.endSuperBalance ?? 0;
            const nonSuperBal = data.endNonSuperBalance ?? 0;
            let srcLabel = '', srcClass = '';
            if (superBal > 0 || nonSuperBal > 0) {
                const superFrac = (superBal + nonSuperBal) > 0 ? superBal / (superBal + nonSuperBal) : 0;
                if (superFrac > 0.85)      { srcLabel = 'Super';   srcClass = 'src-super'; }
                else if (superFrac < 0.15) { srcLabel = 'Savings'; srcClass = 'src-savings'; }
                else                        { srcLabel = 'Mixed';   srcClass = 'src-mixed'; }
            }

            const travelCost = data.travelCost ?? 0;
            const livingCost = Math.max(0, (data.withdrawal || 0) - travelCost);
            const withdrawTip = isOverseas
                ? `Overseas living: ${formatCurrency(livingCost)} + Return travel: ${formatCurrency(travelCost)}. Source: ${srcLabel || '—'}.`
                : `Annual portfolio withdrawal. Source: ${srcLabel || '—'}.`;
            const overseasCellContent = isOverseas
                ? `${formatCurrency(livingCost)}${travelCost > 0 ? `<span class="wy-src src-overseas" title="Return travel">+${formatCurrency(travelCost)} ✈</span>` : ''}`
                : '<span style="color:#9ca3af">—</span>';

            projectionTable.innerHTML += `
                <tr class="${rowClass}">
                    <td class="px-4 py-2 age-cell">${data.year}${isRetirementYear ? ' <span title="Retirement year" style="color:var(--color-gold-500)">★</span>' : ''}${isOverseas ? ' <span title="Overseas retirement year" style="color:#0d9488">✈</span>' : ''}</td>
                    <td class="px-4 py-2 age-cell">${ageDisplay}</td>
                    <td class="px-4 py-2 num">${formatCurrency(data.startBalance)}</td>
                    <td class="px-4 py-2 num">${formatCurrency(data.nonLiquidAssets || 0)}</td>
                    <td class="px-4 py-2 num positive">+${formatCurrency(data.growth || 0)}</td>
                    <td class="px-4 py-2 num negative" title="${withdrawTip}">-${formatCurrency(data.withdrawal || 0)}${srcLabel ? `<span class="wy-src ${srcClass}">${srcLabel}</span>` : ''}</td>
                    <td class="px-4 py-2 num positive">+${formatCurrency(data.propertyIncome || 0)}</td>
                    <td class="px-4 py-2 num negative">-${formatCurrency(data.healthcareCost)}</td>
                    <td class="px-4 py-2 num negative">-${formatCurrency(data.agedCareCost)}</td>
                    <td class="px-4 py-2 num ${endBal < 0 ? 'negative' : ''}" style="font-weight:600">${formatCurrency(endBal)}</td>
                    <td class="px-4 py-2 num overseas-col${isOverseas ? ' teal' : ''}">${overseasCellContent}</td>
                    <td class="px-4 py-2 num" style="font-weight:600;color:#6D28D9">${formatCurrency(netWorth)}</td>
                </tr>
            `;
        });
    }

    renderCareerImpactBanner(inputs) {
        const container = $('careerImpactBanner');
        if (!container) return;
        const items = [];

        if (inputs.isCarerForParents && inputs.carerYearsExpected > 0) {
            const pct = Math.round((inputs.carerReducedWorkPercent || 0) * 100);
            const annualLoss = (inputs.yourSalary || 0) * (inputs.carerReducedWorkPercent || 0);
            const totalLoss = annualLoss * inputs.carerYearsExpected;
            const superLoss = totalLoss * 0.12;
            items.push(`<span class="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">👴 Carer ${inputs.carerYearsExpected} yr${inputs.carerYearsExpected > 1 ? 's' : ''} at −${pct}% income · ~${formatCurrency(totalLoss)} income / ~${formatCurrency(superLoss)} super foregone</span>`);
            if ((inputs.carerAnnualExpense || 0) > 0) {
                items.push(`<span class="inline-flex items-center gap-1 px-2 py-1 rounded bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium">💸 Parent support ${formatCurrency(inputs.carerAnnualExpense)}/yr during carer period</span>`);
            }
        }

        if (inputs.enableReducedIncome && inputs.reducedIncomeAge > 0) {
            const yrs = Math.max(0, (inputs.retirementAge || 65) - inputs.reducedIncomeAge);
            if (yrs > 0) {
                const diff = Math.max(0, (inputs.yourSalary || 0) - (inputs.reducedIncomeSalary || 0));
                items.push(`<span class="inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 border border-blue-200 text-blue-800 text-xs font-medium">📉 Reduced income age ${inputs.reducedIncomeAge}→${inputs.retirementAge}: ${formatCurrency(inputs.reducedIncomeSalary)}/yr · ~${formatCurrency(diff * yrs)} cumulative difference</span>`);
            }
        }

        if (inputs.dependents > 0 && inputs.educationCostPerChild > 0) {
            items.push(`<span class="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-50 border border-green-200 text-green-800 text-xs font-medium">🎓 Education ${formatCurrency(inputs.educationCostPerChild)}/yr × ${inputs.dependents} child${inputs.dependents > 1 ? 'ren' : ''}${inputs.privateSchool ? ' (private school)' : ''}</span>`);
        }

        if (inputs.goingOverseas && inputs.overseasStartAge > 0) {
            const travelPerPerson = { annually: 5000, biannually: 10000, quarterly: 20000, seasonal: 30000, never: 0 }[inputs.overseasReturnFrequency] ?? 0;
            const travelTotal = travelPerPerson * (inputs.isCouple ? 2 : 1);
            items.push(`<span class="inline-flex items-center gap-1 px-2 py-1 rounded bg-teal-50 border border-teal-200 text-teal-800 text-xs font-medium">✈ Overseas from age ${inputs.overseasStartAge}: ${formatCurrency(inputs.overseasAnnualBudget)}/yr living + ${formatCurrency(travelTotal)}/yr return travel</span>`);
        }

        container.innerHTML = items.length
            ? `<div class="mb-4 p-3 rounded-lg border border-gray-200 bg-gray-50">
                <p class="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Life events modelled in this projection</p>
                <div class="flex flex-wrap gap-2">${items.join('')}</div>
                <p class="text-xs text-gray-400 mt-2">These irregular income changes and expenses are modelled year-by-year. Monte Carlo scatters returns and inflation around these values.</p>
               </div>`
            : '';
    }

    // Populate the Moneysmart-style "Your current retirement income" headline
    // panel above the year-by-year table.
    updateCurrentRetirementIncomePanel(result, inputs) {
        const amountEl = $('currentRetirementIncomeAmount');
        if (!amountEl) return;

        const retirementAge = inputs.retirementAge || 65;
        const firstRetirementYear = (result.yearlyData || []).find(d => !d.depleted && (d.age >= retirementAge || d.yourAge >= retirementAge));
        if (!firstRetirementYear) {
            amountEl.textContent = '$0';
            const note = $('currentRetirementIncomeNote');
            if (note) note.textContent = 'Run a calculation to see your projected income at retirement.';
            return;
        }

        const withdrawal = firstRetirementYear.withdrawal || 0;
        const pension = firstRetirementYear.pensionIncome || 0;
        const otherIncome = firstRetirementYear.otherIncome ?? firstRetirementYear.propertyIncome ?? 0;
        const totalAnnual = withdrawal + pension + otherIncome;

        // yearlyData[*].year is an absolute calendar year (simulator.js:1510 sets it to
        // `new Date().getFullYear() + retirementYear`). Convert to "years from now" for
        // inflation discounting, otherwise we'd divide by (1+i)^2036 ≈ infinity.
        const currentCalendarYear = new Date().getFullYear();
        const yearsAhead = Math.max(0, (firstRetirementYear.year || currentCalendarYear) - currentCalendarYear);
        const inflation = inputs.inflation || 0;
        const discount = (value) =>
            inflation > 0 && yearsAhead > 0
                ? value / Math.pow(1 + inflation, yearsAhead)
                : value;

        const todayDollars = discount(totalAnnual);
        amountEl.textContent = formatCurrency(Math.round(todayDollars));

        const setText = (id, value) => {
            const el = $(id);
            if (el) el.textContent = formatCurrency(Math.round(discount(value)));
        };
        setText('retirementIncomeSuper', withdrawal);
        setText('retirementIncomePension', pension);
        setText('retirementIncomeProperty', otherIncome);

        const asfaTarget = inputs.asfaComfortable || 0;
        const vsAsfaEl = $('retirementIncomeVsAsfa');
        if (vsAsfaEl) {
            if (asfaTarget > 0) {
                const ratio = todayDollars / asfaTarget;
                const pct = Math.round(ratio * 100);
                const colour = ratio >= 1 ? '#047857' : ratio >= 0.85 ? '#b45309' : '#b91c1c';
                vsAsfaEl.textContent = `${pct}% of ${formatCurrency(asfaTarget)}`;
                vsAsfaEl.style.color = colour;
            } else {
                vsAsfaEl.textContent = '—';
                vsAsfaEl.style.color = '';
            }
        }

        const note = $('currentRetirementIncomeNote');
        if (note) {
            note.textContent = `Estimated annual income at retirement (age ${retirementAge}), in today's dollars after ${yearsAhead} year${yearsAhead === 1 ? '' : 's'} of inflation. Sources: super drawdown + age pension + other income.`;
        }

        this.renderRetirementIncomeCharts(result, inputs, retirementAge);
    }

    renderRetirementIncomeCharts(result, inputs, retirementAge) {
        if (typeof Chart === 'undefined') return;

        const yearly = (result.yearlyData || []).filter(d => !d.depleted && (d.age >= retirementAge || d.yourAge >= retirementAge));
        if (yearly.length === 0) return;

        const inflation = inputs.inflation || 0;
        const currentCalendarYear = new Date().getFullYear();
        // simulator stores data.year as an absolute calendar year — convert to "years from now"
        // before discounting, otherwise the inflation factor blows up to infinity.
        const toToday = (value, calendarYear) => {
            const yearOffset = Math.max(0, (calendarYear || currentCalendarYear) - currentCalendarYear);
            return inflation > 0 && yearOffset > 0
                ? value / Math.pow(1 + inflation, yearOffset)
                : value;
        };

        // Cap the timeline so the chart stays readable (Moneysmart shows ~30y window)
        const slice = yearly.slice(0, 35);
        const ageLabels = slice.map(d => d.yourAge ?? d.age);
        const superSeries = slice.map(d => Math.round(toToday(d.withdrawal || 0, d.year)));
        const pensionSeries = slice.map(d => Math.round(toToday(d.pensionIncome || 0, d.year)));
        const otherSeries = slice.map(d => Math.round(toToday(d.otherIncome ?? d.propertyIncome ?? 0, d.year)));

        const timelineCtx = document.getElementById('retirementIncomeTimelineChart');
        if (timelineCtx) {
            if (this._retirementIncomeTimelineChart) this._retirementIncomeTimelineChart.destroy();
            this._retirementIncomeTimelineChart = new Chart(timelineCtx, {
                type: 'line',
                data: {
                    labels: ageLabels,
                    datasets: [
                        {
                            label: 'Super drawdown',
                            data: superSeries,
                            backgroundColor: 'rgba(79,70,229,0.55)',
                            borderColor: '#4f46e5',
                            borderWidth: 1,
                            fill: true,
                            tension: 0.25,
                            pointRadius: 0,
                        },
                        {
                            label: 'Age pension',
                            data: pensionSeries,
                            backgroundColor: 'rgba(16,185,129,0.55)',
                            borderColor: '#10b981',
                            borderWidth: 1,
                            fill: true,
                            tension: 0.25,
                            pointRadius: 0,
                        },
                        {
                            label: 'Other income',
                            data: otherSeries,
                            backgroundColor: 'rgba(245,158,11,0.55)',
                            borderColor: '#f59e0b',
                            borderWidth: 1,
                            fill: true,
                            tension: 0.25,
                            pointRadius: 0,
                        },
                    ],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                        legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
                        tooltip: {
                            callbacks: {
                                label: ctx => ` ${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}`,
                                footer: items => {
                                    const total = items.reduce((sum, i) => sum + (i.parsed.y || 0), 0);
                                    return `Total: ${formatCurrency(total)}`;
                                },
                            },
                        },
                    },
                    scales: {
                        x: { title: { display: true, text: 'Age', font: { size: 11 } }, stacked: true },
                        y: {
                            title: { display: true, text: "Annual income (today's $)", font: { size: 11 } },
                            stacked: true,
                            ticks: { callback: v => `$${(v / 1000).toFixed(0)}k` },
                        },
                    },
                },
            });
        }

        // Charts created while the projection tab is hidden render at 0x0. Re-run
        // .resize() whenever the tab becomes visible so the canvas picks up real
        // dimensions. Hook is attached once and listens for clicks on the tab button.
        if (!this._retirementIncomeChartsTabHookAttached) {
            const tabBtn = document.querySelector('.tab-button[onclick="showTab(\'projection\')"]');
            if (tabBtn) {
                tabBtn.addEventListener('click', () => {
                    requestAnimationFrame(() => {
                        if (this._retirementIncomeTimelineChart) this._retirementIncomeTimelineChart.resize();
                        if (this._retirementIncomeBreakdownChart) this._retirementIncomeBreakdownChart.resize();
                    });
                });
                this._retirementIncomeChartsTabHookAttached = true;
            }
        }

        // Doughnut: first-retirement-year mix (today's dollars)
        const firstYear = slice[0];
        const firstSuper = Math.round(toToday(firstYear.withdrawal || 0, firstYear.year));
        const firstPension = Math.round(toToday(firstYear.pensionIncome || 0, firstYear.year));
        const firstOther = Math.round(toToday(firstYear.otherIncome ?? firstYear.propertyIncome ?? 0, firstYear.year));

        const doughnutCtx = document.getElementById('retirementIncomeBreakdownChart');
        if (doughnutCtx) {
            if (this._retirementIncomeBreakdownChart) this._retirementIncomeBreakdownChart.destroy();
            this._retirementIncomeBreakdownChart = new Chart(doughnutCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Super drawdown', 'Age pension', 'Other income'],
                    datasets: [{
                        data: [firstSuper, firstPension, firstOther],
                        backgroundColor: ['#4f46e5', '#10b981', '#f59e0b'],
                        borderColor: '#ffffff',
                        borderWidth: 2,
                    }],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '60%',
                    plugins: {
                        legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } },
                        tooltip: {
                            callbacks: {
                                label: ctx => {
                                    const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                    const pct = total > 0 ? Math.round((ctx.parsed / total) * 100) : 0;
                                    return ` ${ctx.label}: ${formatCurrency(ctx.parsed)} (${pct}%)`;
                                },
                            },
                        },
                    },
                },
            });
        }
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
        const keepVsSellAnalysis = this.analyzeKeepVsSell(inputs, result.capitalLossPool || 0);

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
                    ${inputs.sellPropertyYears === 0 && keepVsSellAnalysis.bestSaleOption ? `
                    <div class="p-3 bg-amber-50 rounded border border-amber-200">
                        <div class="font-medium text-amber-900">Best sale timing from tested scenarios:</div>
                        <div class="mt-1 text-amber-800">Selling in ${keepVsSellAnalysis.bestSaleOption.year} years (around age ${keepVsSellAnalysis.bestSaleOption.sellAge}) produced the strongest projected outcome at the comparison horizon.</div>
                        <div class="text-amber-700 mt-1">Projected sale proceeds: ${formatCurrency(keepVsSellAnalysis.bestSaleOption.netProceeds)} · projected value at horizon: ${formatCurrency(keepVsSellAnalysis.bestSaleOption.projectedWealthAtHorizon)}</div>
                    </div>` : ''}
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
        const sc = results.scenarios;
        const retirementYears = (inputs.yourLifespan || 90) - (inputs.retirementAge || 67);

        // Detect open-ended projection mode (lifespan set to 0 = "run until depletion")
        const isOpenEnded = !(inputs.yourLifespan > 0);
        const isPartnerOpenEnded = inputs.partnerCurrentAge > 0 && !(inputs.partnerLifespan > 0);
        const eitherOpenEnded = isOpenEnded || isPartnerOpenEnded;

        // For open-ended projections, compute median/p10 depletion ages from paths
        const retirementAge = inputs.retirementAge || 67;
        let medianDepletionAge = null;
        let p10DepletionAge = null;
        if (eitherOpenEnded && results.paths && results.paths.length > 0) {
            const depletionAges = results.paths
                .map(path => {
                    const idx = path.findIndex(b => b <= 0);
                    return idx === -1 ? null : retirementAge + idx;
                })
                .filter(a => a !== null)
                .sort((a, b) => a - b);
            if (depletionAges.length > 0) {
                medianDepletionAge = depletionAges[Math.floor(depletionAges.length / 2)];
                p10DepletionAge   = depletionAges[Math.floor(depletionAges.length * 0.10)];
            }
        }

        // Apocalypse card — shown only when some scenarios deplete all funds
        const apocalypseCard = sc?.apocalypse ? (() => {
            const ap = sc.apocalypse;
            const pct = ap.depletedPct;
            const count = ap.depletedCount;
            const severity = pct >= 50 ? 'critical' : pct >= 20 ? 'high' : 'moderate';
            const bgClass = severity === 'critical' ? 'bg-black' : 'bg-gray-900';

            // For open-ended projections: reframe as "depletion age" rather than % failure
            if (eitherOpenEnded) {
                const depletionNote = medianDepletionAge
                    ? `In these ${count.toLocaleString()} simulations, money runs out at a median age of <strong class="text-red-300">${medianDepletionAge}</strong> (earliest 10% of depletions occur by age ${p10DepletionAge ?? '—'}).`
                    : `In ${pct}% of simulations, funds are exhausted before age 120.`;
                const actionNote = pct >= 30
                    ? 'Consider setting a specific planning age, increasing contributions, or reviewing your spending target.'
                    : 'This is expected for an open-ended projection — the portfolio is being stress-tested to its natural limit.';
                return `
                    <div class="flex gap-3 p-3 ${bgClass} border border-red-900 rounded-lg">
                        <div class="flex-shrink-0 w-3 h-full min-h-[3rem] bg-red-900 rounded"></div>
                        <div class="flex-1">
                            <div class="flex justify-between items-start">
                                <strong class="text-red-400">⏱ Open-Ended Depletion Risk <span class="font-normal text-xs text-red-500">(no target age set)</span></strong>
                                <span class="text-red-400 font-semibold text-sm ml-2">${pct}% of scenarios — ${count.toLocaleString()} runs</span>
                            </div>
                            <p class="text-xs text-red-300 mt-1">${depletionNote} ${actionNote}</p>
                        </div>
                    </div>`;
            }

            return `
                    <div class="flex gap-3 p-3 ${bgClass} border border-red-900 rounded-lg">
                        <div class="flex-shrink-0 w-3 h-full min-h-[3rem] bg-red-900 rounded"></div>
                        <div class="flex-1">
                            <div class="flex justify-between items-start">
                                <strong class="text-red-400">☠ Apocalypse <span class="font-normal text-xs text-red-500">(funds fully depleted)</span></strong>
                                <span class="text-red-400 font-semibold text-sm ml-2">${pct}% of scenarios — ${count.toLocaleString()} runs</span>
                            </div>
                            <p class="text-xs text-red-300 mt-1">In ${pct}% of all simulated retirements, every dollar of savings was exhausted before end of life. This tier captures scenarios where poor sequence-of-returns, high withdrawal rates, or sustained low growth combined to deplete the entire portfolio. ${pct >= 20 ? 'This proportion is high and warrants urgent action — consider reducing spending, delaying retirement, or boosting contributions.' : 'This is a tail risk; your plan is mostly solid but monitoring is advisable.'}</p>
                        </div>
                    </div>`;
        })() : '';

        const pessimisticPct = sc?.pessimistic?.percentile ?? 10;
        const pessimisticChance = `1-in-${Math.round(100 / (pessimisticPct || 10))} chance`;

        const scenarioCards = sc ? `
            <div class="mt-4">
                <h4 class="font-semibold text-gray-800 mb-3">What Each Scenario Means in Plain English</h4>
                <div class="space-y-3">
                    ${apocalypseCard}

                    <div class="flex gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div class="flex-shrink-0 w-3 h-full min-h-[3rem] bg-red-600 rounded"></div>
                        <div class="flex-1">
                            <div class="flex justify-between items-start">
                                <strong class="text-red-800">Worst Case <span class="font-normal text-xs">(lowest surviving scenario)</span></strong>
                                <span class="text-red-700 font-semibold text-sm ml-2">${formatCurrency(sc.worstCase?.outcome || 0)}</span>
                            </div>
                            <p class="text-xs text-red-700 mt-1">The worst outcome where your portfolio still survives to end of life — imagine a stock market crash early in retirement, high inflation eroding your savings, and consistently low returns throughout. This is the floor of scenarios where funds were not fully depleted. Use this as your planning "stress test" number.</p>
                        </div>
                    </div>

                    <div class="flex gap-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <div class="flex-shrink-0 w-3 h-full min-h-[3rem] bg-orange-500 rounded"></div>
                        <div class="flex-1">
                            <div class="flex justify-between items-start">
                                <strong class="text-orange-800">Pessimistic <span class="font-normal text-xs">(${pessimisticChance})</span></strong>
                                <span class="text-orange-700 font-semibold text-sm ml-2">${formatCurrency(sc.pessimistic?.outcome || 0)}</span>
                            </div>
                            <p class="text-xs text-orange-700 mt-1">Similar to retiring just before a major event like the 2008 Global Financial Crisis. Markets underperform for several years, your portfolio shrinks before recovering. ${pessimisticChance} retirees will experience something like this. It's uncomfortable but survivable with careful planning.</p>
                        </div>
                    </div>

                    <div class="flex gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div class="flex-shrink-0 w-3 h-full min-h-[3rem] bg-blue-600 rounded"></div>
                        <div class="flex-1">
                            <div class="flex justify-between items-start">
                                <strong class="text-blue-800">Median — Your Most Likely Outcome <span class="font-normal text-xs">(50% chance)</span></strong>
                                <span class="text-blue-700 font-semibold text-sm ml-2">${formatCurrency(sc.median?.outcome || results.median || 0)}</span>
                            </div>
                            <p class="text-xs text-blue-700 mt-1">This is the middle of the road — half of all simulations end better than this, half end worse. Markets deliver average historical returns, no major windfalls and no major disasters. If you had to pick one number to plan around, this is it. This is your expected retirement balance after ${retirementYears} years of drawdown.</p>
                        </div>
                    </div>

                    <div class="flex gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div class="flex-shrink-0 w-3 h-full min-h-[3rem] bg-green-600 rounded"></div>
                        <div class="flex-1">
                            <div class="flex justify-between items-start">
                                <strong class="text-green-800">Optimistic <span class="font-normal text-xs">(top 10%)</span></strong>
                                <span class="text-green-700 font-semibold text-sm ml-2">${formatCurrency(sc.optimistic?.outcome || 0)}</span>
                            </div>
                            <p class="text-xs text-green-700 mt-1">Markets perform well — think the long bull run of the 1990s or the post-COVID recovery. Your portfolio grows faster than your spending, leaving a healthy balance even late in retirement. 9 out of 10 scenarios will end with less than this, but it's not out of reach if conditions are favourable.</p>
                        </div>
                    </div>

                    <div class="flex gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                        <div class="flex-shrink-0 w-3 h-full min-h-[3rem] bg-emerald-600 rounded"></div>
                        <div class="flex-1">
                            <div class="flex justify-between items-start">
                                <strong class="text-emerald-800">Best Case <span class="font-normal text-xs">(top 1%)</span></strong>
                                <span class="text-emerald-700 font-semibold text-sm ml-2">${formatCurrency(sc.bestCase?.outcome || 0)}</span>
                            </div>
                            <p class="text-xs text-emerald-700 mt-1">Everything goes right: prolonged market booms, low inflation, no major health crises, and possibly a favourable property market. Only 1 in 100 retirements achieve this level. It makes for a nice aspiration but shouldn't be relied upon for planning.</p>
                        </div>
                    </div>
                </div>
            </div>
        ` : '';

        // Depletion explanation — driven by apocalypse tier or median depletion
        const medianDepleted = (sc?.median?.outcome || results.median) <= 0;
        const hasApocalypse = sc?.apocalypse != null;
        const worstDepleted = sc?.worstCase?.outcome != null ? sc.worstCase.outcome <= 0 : false;
        const pessimisticDepleted = sc?.pessimistic?.outcome != null ? sc.pessimistic.outcome <= 0 : false;

        const depletionSection = (hasApocalypse || medianDepleted) ?
            this.generateDepletionExplanation(results, inputs, { worstDepleted, pessimisticDepleted, medianDepleted }) : '';

        // Open-ended projection banner — shown when lifespan is 0 (no target age set)
        const openEndedBanner = eitherOpenEnded ? `
            <div class="mb-4 p-3 bg-amber-50 border border-amber-300 rounded-lg text-sm text-amber-800">
                <strong>⚠️ Open-Ended Projection</strong> — ${isOpenEnded && isPartnerOpenEnded
                    ? 'Neither you nor your partner has a target lifespan set.'
                    : isOpenEnded
                    ? 'Your lifespan is set to open-ended (no target age).'
                    : "Your partner's lifespan is set to open-ended."
                }
                The simulation runs until funds are exhausted (up to age 120), which naturally produces high depletion rates — this is by design, not a sign your plan is failing.
                ${medianDepletionAge
                    ? `<strong>In the median scenario, money lasts until age ${medianDepletionAge}.</strong>`
                    : ''
                }
                To see a conventional success-rate percentage, enter a specific target age in the lifespan field.
            </div>` : '';

        // Adjust success rate label for open-ended projections
        const successRateLabel = eitherOpenEnded
            ? `Runs lasting past retirement: ${successRate.toFixed(1)}%`
            : `Success Rate: ${successRate.toFixed(1)}%`;
        const successRateExplainer = eitherOpenEnded
            ? (medianDepletionAge
                ? `${successRate.toFixed(0)}% of simulations had a positive balance at retirement age. In the median scenario, funds last until age <strong>${medianDepletionAge}</strong>. High depletion rates are normal for an open-ended (unlimited age) projection.`
                : `${successRate.toFixed(0)}% of simulations had a positive balance at retirement age. High depletion rates are expected when no target lifespan is set — the simulation runs to age 120.`)
            : this.getSuccessRateExplanation(successRate);

        return `
            <div class="space-y-4 mb-6">
                ${openEndedBanner}
                <div class="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-4 border border-indigo-200">
                    <h3 class="text-lg font-semibold mb-3 text-indigo-800">What Is This Simulation Telling You?</h3>
                    <p class="text-sm text-gray-700 leading-relaxed">
                        Your retirement plan was run <strong>${runs.toLocaleString()} times</strong>, each time with a different sequence of market returns, inflation rates, and economic conditions — all based on realistic historical ranges. The result is a range of possible futures, from unlucky to lucky.
                    </p>
                    <div class="grid md:grid-cols-2 gap-4 mt-4">
                        <div class="bg-white rounded p-3 border">
                            <strong class="text-blue-600 text-sm">${successRateLabel}</strong>
                            <p class="mt-1 text-xs text-gray-600">${successRateExplainer}</p>
                        </div>
                        <div class="bg-white rounded p-3 border">
                            <strong class="text-green-600 text-sm">Most Likely Balance: ${formatCurrency(results.median)}</strong>
                            <p class="mt-1 text-xs text-gray-600">Half of all simulations end with more than this. Half end with less. Use this as your planning number.</p>
                        </div>
                    </div>
                    ${results.longevityStats ? (() => {
                        const ls = results.longevityStats;
                        return `
                    <div class="mt-3 p-3 bg-violet-50 border border-violet-200 rounded text-sm">
                        <strong class="text-violet-800">Sampled Lifespan Distribution (ABS 2020-22 survival curves)</strong>
                        <p class="text-xs text-violet-700 mt-1">Each Monte Carlo run drew a lifespan from Australian mortality data. Across ${runs.toLocaleString()} runs:</p>
                        <div class="grid grid-cols-4 gap-2 mt-2 text-xs text-center">
                            <div class="bg-white rounded p-1 border border-violet-100"><div class="text-violet-500 font-medium">10th %ile</div><div class="font-semibold">${ls.p10}</div></div>
                            <div class="bg-white rounded p-1 border border-violet-100"><div class="text-violet-500 font-medium">Median</div><div class="font-semibold">${ls.p50}</div></div>
                            <div class="bg-white rounded p-1 border border-violet-100"><div class="text-violet-500 font-medium">Mean</div><div class="font-semibold">${ls.mean}</div></div>
                            <div class="bg-white rounded p-1 border border-violet-100"><div class="text-violet-500 font-medium">90th %ile</div><div class="font-semibold">${ls.p90}</div></div>
                        </div>
                        <p class="text-xs text-violet-600 mt-1">Range: age ${ls.min} – ${ls.max}. Because each run used a different lifespan, the success rate already accounts for longevity uncertainty rather than assuming a fixed end age.</p>
                    </div>`;
                    })() : ''}
                    ${scenarioCards}

                    ${inputs.legacyGoal > 0 && inputs.legacyGoalType !== 'none' ? `
                    <div class="mt-3 p-3 bg-purple-50 border border-purple-200 rounded text-sm">
                        <strong class="text-purple-800">Legacy Goal: ${formatCurrency(inputs.legacyGoal)}</strong>
                        <p class="text-xs text-purple-700 mt-1">
                            ${inputs.legacyGoalType === 'important'
                                ? `This is set as a firm target. The median scenario ends with ${formatCurrency(results.median)} — ${results.median >= inputs.legacyGoal ? '✅ exceeds your legacy goal' : '⚠️ below your legacy goal of ' + formatCurrency(inputs.legacyGoal)}.`
                                : `This is a "nice to have" goal. Check whether your target scenarios end above ${formatCurrency(inputs.legacyGoal)}.`
                            }
                        </p>
                    </div>` : ''}

                    ${(inputs.creditCardBalance || 0) + (inputs.personalLoanBalance || 0) + (inputs.carLoanBalance || 0) > 0 ? `
                    <div class="mt-3 p-3 bg-amber-50 border border-amber-200 rounded text-sm">
                        <strong class="text-amber-800">Debt Impact Included</strong>
                        <p class="text-xs text-amber-700 mt-1">Your other debts (credit cards, personal loans, car loan) have been factored in — they reduce your starting savings balance and add interest cost drag during the first 5 years of the simulation.</p>
                    </div>` : ''}
                </div>
                ${depletionSection}
            </div>
        `;
    }

    // Explains why portfolios deplete and what users can do about it
    generateDepletionExplanation(results, inputs, { worstDepleted, pessimisticDepleted, medianDepleted }) {
        const retirementAge = inputs.retirementAge || 67;
        const isOpenEnded = !(inputs.yourLifespan > 0);
        const lifespan = isOpenEnded ? 120 : (inputs.yourLifespan || 90);
        const retirementYears = lifespan - retirementAge;
        // For open-ended projections, depletion is expected — don't treat it as critical
        if (isOpenEnded && !medianDepleted) return ''; // only show if median also depletes
        const salary = inputs.yourSalary || 0;
        const superRate = inputs.superContributionRate || 0.115;
        const additionalSuper = inputs.yourAdditionalSuperContribution || 0;
        const savingsRate = inputs.percentIncomeSaved || 0;

        const severity = medianDepleted ? 'critical' : pessimisticDepleted ? 'high' : 'moderate';
        const severityColour = { critical: 'red', high: 'orange', moderate: 'yellow' }[severity];
        const severityLabel = { critical: 'Critical — Most Scenarios Depleted', high: 'High Risk', moderate: 'Moderate Risk (Worst Scenarios Only)' }[severity];

        // Calculate potential improvement from salary sacrifice
        const maxConcessional = 30000;
        const currentConcessional = (salary * superRate) + additionalSuper;
        const remainingSalarySacrifice = Math.max(0, maxConcessional - currentConcessional);
        const annualSuperBoost = Math.min(remainingSalarySacrifice, salary * 0.1);

        const improvementTips = [];

        if (annualSuperBoost > 1000) {
            improvementTips.push(`<li><strong>Salary sacrifice to super:</strong> You may be able to contribute up to an extra <strong>${formatCurrency(annualSuperBoost)}/year</strong> into super (concessionally taxed at 15%). Over ${Math.max(0, retirementAge - (inputs.yourCurrentAge || 45))} years this compounds significantly and reduces your taxable income now.</li>`);
        }
        improvementTips.push(`<li><strong>Delay retirement by 2–3 years:</strong> Working longer does two things — you add more to your super, and you shorten the period your savings must cover. Even 2 extra years can materially improve your success rate.</li>`);
        improvementTips.push(`<li><strong>Reduce planned retirement spending:</strong> Every $5,000/year less you spend in retirement reduces annual drawdown and extends how long your money lasts. Small lifestyle adjustments compound over ${retirementYears} years.</li>`);
        if (!inputs.hasInvestmentProperty) {
            improvementTips.push(`<li><strong>Investment property or SMSF property:</strong> Adding a positively-geared investment property (or via an SMSF) provides rental income in retirement and capital growth, diversifying beyond super and shares.</li>`);
        }
        if (savingsRate < 0.1) {
            improvementTips.push(`<li><strong>Increase savings rate outside super:</strong> Consistently investing even an extra $200–$500/month into ETFs or managed funds during your working years builds a taxable buffer alongside super.</li>`);
        }
        improvementTips.push(`<li><strong>Review your asset allocation:</strong> If you're holding large amounts in cash or conservative assets, a more growth-oriented allocation (with appropriate risk management) can improve long-run returns.</li>`);
        improvementTips.push(`<li><strong>Age Pension safety net:</strong> If your super depletes, the Australian Age Pension provides a baseline income (currently ~$29,000/year for singles, ~$43,900 combined for couples). Your modelling already includes this — but it's worth knowing it's there.</li>`);

        return `
            <div class="bg-${severityColour}-50 border border-${severityColour}-300 rounded-lg p-4">
                <h4 class="font-semibold text-${severityColour}-800 mb-2">⚠️ Why Some Scenarios Show $0 — And What You Can Do</h4>

                <div class="text-sm text-${severityColour}-900 mb-3">
                    <strong>Depletion Risk: ${severityLabel}</strong>
                    ${medianDepleted ? '<p class="mt-1">More than half of simulated scenarios deplete your portfolio before end of life. This is a serious signal that requires action.</p>' : ''}
                    ${!medianDepleted && pessimisticDepleted ? `<p class="mt-1">In bad-but-realistic scenarios (bottom 10%), your portfolio runs out before ${isOpenEnded ? 'funds are exhausted (open-ended projection)' : 'age ' + lifespan}.</p>` : ''}
                    ${!pessimisticDepleted && worstDepleted ? '<p class="mt-1">Only the most extreme scenarios (bottom 1%) deplete your portfolio. Your plan is generally solid.</p>' : ''}
                </div>

                <div class="bg-white rounded p-3 border border-${severityColour}-200 mb-3">
                    <h5 class="font-medium text-gray-800 mb-2 text-sm">Why does a portfolio run out?</h5>
                    <ul class="text-xs text-gray-700 space-y-1 list-disc ml-4">
                        <li><strong>Sequence-of-returns risk:</strong> If markets crash in the first few years of retirement, you're forced to sell assets cheap to fund living costs. Even if markets recover later, the damage is done — you've sold more units than planned.</li>
                        <li><strong>Withdrawal rate too high:</strong> Drawing more than roughly 4% of your portfolio per year is historically risky over 25+ year retirements. Higher spending leaves less capital to compound.</li>
                        <li><strong>Longevity:</strong> ${isOpenEnded ? 'The simulation runs until funds deplete (up to age 120) — this extended horizon naturally produces higher depletion rates than a fixed planning age.' : `You're modelling to age ${lifespan} — that's ${retirementYears} years of retirement, which is a long time for investments to potentially disappoint.`}</li>
                        <li><strong>Healthcare and aged care costs:</strong> These costs inflate faster than general inflation (6–7% vs 2–3%) and can represent $75,000–$200,000+ over later retirement years.</li>
                        <li><strong>Inflation erosion:</strong> Even 3% annual inflation halves your purchasing power over 24 years. If your investments don't keep pace, you need to draw more each year.</li>
                    </ul>
                </div>

                <div class="bg-white rounded p-3 border border-${severityColour}-200">
                    <h5 class="font-medium text-gray-800 mb-2 text-sm">What you can do — within your control</h5>
                    <ul class="text-xs text-gray-700 space-y-2 list-disc ml-4">
                        ${improvementTips.join('')}
                    </ul>
                    <p class="text-xs text-gray-500 mt-3 italic">Update any of these figures in the calculator above and re-run the simulation to see the impact on your scenarios.</p>
                </div>
            </div>
        `;
    }

    generateFanChartExplanation(inputs) {
        const tenYearAge = inputs.retirementAge + 10;
        return `
            <div class="bg-blue-50 rounded-lg p-3 mb-4 text-sm">
                <h4 class="font-semibold mb-2 text-blue-800">How to Read This Chart</h4>
                <div class="grid md:grid-cols-2 gap-3">
                    <div>
                        <p class="text-xs text-gray-700 mb-2">Each coloured line is a specific scenario — what your portfolio balance looks like over your retirement if that scenario plays out:</p>
                        <ul class="space-y-1 text-xs text-gray-700">
                            <li><span class="inline-block w-3 h-0.5 bg-red-600 mr-1 align-middle"></span> <strong class="text-red-700">Red (dashed) — Worst Case:</strong> 1-in-100 chance. Multiple crises at once.</li>
                            <li><span class="inline-block w-3 h-0.5 bg-orange-500 mr-1 align-middle"></span> <strong class="text-orange-700">Orange (dashed) — Pessimistic:</strong> 1-in-10 chance. A bad stretch like the GFC.</li>
                            <li><span class="inline-block w-3 h-0.5 bg-blue-600 mr-1 align-middle"></span> <strong class="text-blue-700">Blue (solid) — Median:</strong> The most likely outcome. Plan around this line.</li>
                            <li><span class="inline-block w-3 h-0.5 bg-green-600 mr-1 align-middle"></span> <strong class="text-green-700">Green (dashed) — Optimistic:</strong> Top 10%. Markets performed well.</li>
                            <li><span class="inline-block w-3 h-0.5 bg-emerald-600 mr-1 align-middle"></span> <strong class="text-emerald-700">Emerald (dashed) — Best Case:</strong> Top 1%. Everything went right.</li>
                        </ul>
                    </div>
                    <div>
                        <p class="text-xs text-gray-700 mb-2">The shaded areas show how spread out all ${(inputs.numRuns || 5000).toLocaleString()} simulations are:</p>
                        <ul class="space-y-1 text-xs text-gray-700">
                            <li><span class="inline-block w-3 h-3 bg-blue-200 opacity-50 mr-1 align-middle rounded"></span> <strong>Light blue shading:</strong> 80% of outcomes fall in this band.</li>
                            <li><span class="inline-block w-3 h-3 bg-green-200 opacity-50 mr-1 align-middle rounded"></span> <strong>Light green shading:</strong> 50% (the middle half) fall here — most likely range.</li>
                            <li><span class="inline-block w-3 h-0.5 bg-red-500 mr-1 align-middle"></span> <strong>Red dashed line at $0:</strong> If a scenario line touches this, funds are depleted.</li>
                        </ul>
                        <div class="mt-2 p-2 bg-blue-100 rounded text-xs">
                            Hover over age <strong>${tenYearAge}</strong> to compare all scenarios 10 years into retirement.
                        </div>
                    </div>
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

    // Display enhanced Monte Carlo simulation results with regime analysis
    displayEnhancedMonteCarloResults(results) {
        // Find or create enhanced results container
        let enhancedContainer = $('enhancedMonteCarloResults');
        if (!enhancedContainer) {
            const mcResults = $('monteCarloResults');
            if (!mcResults) return;

            enhancedContainer = document.createElement('div');
            enhancedContainer.id = 'enhancedMonteCarloResults';
            enhancedContainer.className = 'mt-4 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg';
            mcResults.appendChild(enhancedContainer);
        }

        // Enhanced insights HTML
        enhancedContainer.innerHTML = `
            <h4 class="text-lg font-semibold text-indigo-800 mb-3">🎯 Enhanced Market Analysis</h4>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                <!-- Risk Metrics -->
                <div class="bg-white p-3 rounded-lg shadow-sm border">
                    <h5 class="font-medium text-gray-800 mb-2">Risk Metrics</h5>
                    <div class="space-y-1 text-sm">
                        <div>Value at Risk (5%): <span class="font-medium text-red-600">${formatCurrency(results.var95 || results.percentiles?.p5 || 0)}</span></div>
                        <div>Expected Shortfall: <span class="font-medium text-red-600">${formatCurrency(results.cvar95 || results.tailRiskMetrics?.expectedShortfall95 || 0)}</span></div>
                        <div>Tail Risk Ratio: <span class="font-medium">${((results.tailRiskMetrics?.tailRatio || 0) * 100).toFixed(1)}%</span></div>
                    </div>
                </div>

                <!-- Distribution Statistics -->
                <div class="bg-white p-3 rounded-lg shadow-sm border">
                    <h5 class="font-medium text-gray-800 mb-2">Distribution Shape</h5>
                    <div class="space-y-1 text-sm">
                        <div>Skewness: <span class="font-medium">${(results.skewness || 0).toFixed(2)}</span></div>
                        <div>Kurtosis: <span class="font-medium">${(results.kurtosis || 0).toFixed(2)}</span></div>
                        <div>Standard Deviation: <span class="font-medium">${formatCurrency(results.standardDeviation || 0)}</span></div>
                    </div>
                </div>

                <!-- Market Regime Analysis -->
                <div class="bg-white p-3 rounded-lg shadow-sm border">
                    <h5 class="font-medium text-gray-800 mb-2">Market Conditions</h5>
                    <div class="space-y-1 text-sm">
                        ${results.regimeAnalysis?.mostCommonEquityRegime ?
            `<div>Dominant Equity: <span class="font-medium text-blue-600">${results.regimeAnalysis.mostCommonEquityRegime.regime}</span></div>` :
            ''
        }
                        ${results.regimeAnalysis?.mostCommonInterestRegime ?
            `<div>Interest Environment: <span class="font-medium text-green-600">${results.regimeAnalysis.mostCommonInterestRegime.regime}</span></div>` :
            ''
        }
                        ${results.regimeAnalysis?.mostCommonPropertyPhase ?
            `<div>Property Cycle: <span class="font-medium text-purple-600">${results.regimeAnalysis.mostCommonPropertyPhase.regime}</span></div>` :
            ''
        }
                    </div>
                </div>
            </div>

            <!-- Key Scenarios -->
            ${results.scenarios ? `
            <div class="bg-white p-4 rounded-lg shadow-sm border mb-4">
                <h5 class="font-medium text-gray-800 mb-1">Final Balance — Key Scenarios</h5>
                <p class="text-xs text-gray-500 mb-3">What remains in your portfolio at the end of your retirement (age ${(results.inputs?.yourLifespan || results.inputs?.lifespan || 90)})</p>
                ${results.scenarios.apocalypse ? `
                <div class="p-3 bg-gray-950 rounded border border-red-900 mb-3" style="background:#0a0a0a">
                    <div class="text-xs text-red-400 font-semibold mb-1">☠ Apocalypse — Funds Depleted</div>
                    <div class="font-bold text-red-400 text-sm">${results.scenarios.apocalypse.depletedPct}% of scenarios (${results.scenarios.apocalypse.depletedCount.toLocaleString()} runs)</div>
                    <div class="text-xs text-red-500 mt-1">Portfolio exhausted before end of life. ${results.scenarios.apocalypse.depletedPct >= 20 ? 'Action recommended — reduce spending or extend working years.' : 'Tail risk only; plan is largely sound.'}</div>
                </div>` : ''}
                <div class="grid grid-cols-1 md:grid-cols-5 gap-3">
                    <div class="p-3 bg-red-50 rounded border border-red-200">
                        <div class="text-xs text-red-600 font-semibold mb-1">Worst Surviving</div>
                        <div class="font-bold text-red-700 text-sm">${formatCurrency(results.scenarios.worstCase?.outcome || 0)}</div>
                        <div class="text-xs text-red-500 mt-1">Lowest positive outcome. Portfolio survived but barely.</div>
                    </div>
                    <div class="p-3 bg-orange-50 rounded border border-orange-200">
                        <div class="text-xs text-orange-600 font-semibold mb-1">Pessimistic</div>
                        <div class="font-bold text-orange-700 text-sm">${formatCurrency(results.scenarios.pessimistic?.outcome || 0)}</div>
                        <div class="text-xs text-orange-500 mt-1">1-in-10 chance. A GFC-style period of poor returns.</div>
                    </div>
                    <div class="p-3 bg-blue-50 rounded border border-blue-200">
                        <div class="text-xs text-blue-600 font-semibold mb-1">Median</div>
                        <div class="font-bold text-blue-700 text-sm">${formatCurrency(results.scenarios.median?.outcome || 0)}</div>
                        <div class="text-xs text-blue-500 mt-1">Most likely outcome. Plan your retirement around this.</div>
                    </div>
                    <div class="p-3 bg-green-50 rounded border border-green-200">
                        <div class="text-xs text-green-600 font-semibold mb-1">Optimistic</div>
                        <div class="font-bold text-green-700 text-sm">${formatCurrency(results.scenarios.optimistic?.outcome || 0)}</div>
                        <div class="text-xs text-green-500 mt-1">Top 10%. Good sustained market returns.</div>
                    </div>
                    <div class="p-3 bg-emerald-50 rounded border border-emerald-200">
                        <div class="text-xs text-emerald-600 font-semibold mb-1">Best Case</div>
                        <div class="font-bold text-emerald-700 text-sm">${formatCurrency(results.scenarios.bestCase?.outcome || 0)}</div>
                        <div class="text-xs text-emerald-500 mt-1">Top 1%. Everything went right over full retirement.</div>
                    </div>
                </div>
            </div>
            ` : ''}

            <!-- Confidence Intervals -->
            ${results.confidenceIntervals ? `
            <div class="bg-white p-4 rounded-lg shadow-sm border">
                <h5 class="font-medium text-gray-800 mb-3">Confidence Ranges</h5>
                <div class="text-xs text-gray-600 mb-3">
                    Final balance ranges across simulated scenarios. Lower bounds near $0 indicate some scenarios deplete funds.
                </div>
                <div class="space-y-2">
                    <div class="flex justify-between items-center">
                        <span class="text-sm">80% Confidence (10th-90th percentile):</span>
                        <span class="font-medium ${(results.confidenceIntervals.ci80?.lower || 0) === 0 ? 'text-orange-600' : ''}">${formatCurrency(results.confidenceIntervals.ci80?.lower || 0)} - ${formatCurrency(results.confidenceIntervals.ci80?.upper || 0)}</span>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="text-sm">90% Confidence (5th-95th percentile):</span>
                        <span class="font-medium ${(results.confidenceIntervals.ci90?.lower || 0) === 0 ? 'text-orange-600' : ''}">${formatCurrency(results.confidenceIntervals.ci90?.lower || 0)} - ${formatCurrency(results.confidenceIntervals.ci90?.upper || 0)}</span>
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="text-sm">95% Confidence (2.5th-97.5th percentile):</span>
                        <span class="font-medium ${(results.confidenceIntervals.ci95?.lower || 0) === 0 ? 'text-orange-600' : ''}">${formatCurrency(results.confidenceIntervals.ci95?.lower || 0)} - ${formatCurrency(results.confidenceIntervals.ci95?.upper || 0)}</span>
                    </div>
                </div>
                ${((results.confidenceIntervals.ci80?.lower || 0) === 0 || (results.confidenceIntervals.ci90?.lower || 0) === 0 || (results.confidenceIntervals.ci95?.lower || 0) === 0) ? `
                <div class="mt-3 p-2 bg-orange-50 border border-orange-200 rounded text-xs">
                    <strong>⚠️ High Depletion Risk:</strong> ${(results.confidenceIntervals.ci80?.lower || 0) === 0 ? '10%+' : (results.confidenceIntervals.ci90?.lower || 0) === 0 ? '5%+' : '2.5%+'} of scenarios show funds depleting to $0.
                    Success rate: <strong>${((results.successRate || 0) * 100).toFixed(1)}%</strong>.
                    Consider: reducing expenses, working longer, or adjusting investment strategy.
                </div>
                ` : ''}
            </div>
            ` : ''}

            <!-- Stress Test Results -->
            ${results.stressTestResults ? `
            <div class="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <h5 class="font-medium text-red-800 mb-2">🚨 Stress Test Performance</h5>
                <div class="text-sm space-y-1">
                    <div>Average Stress Outcome: <span class="font-medium">${formatCurrency(results.stressTestResults.averageStressOutcome || 0)}</span></div>
                    <div>Worst Stress Outcome: <span class="font-medium text-red-700">${formatCurrency(results.stressTestResults.worstStressOutcome || 0)}</span></div>
                    <div>Stress Success Rate: <span class="font-medium">${((results.stressTestResults.stressSuccessRate || 0) * 100).toFixed(1)}%</span></div>
                </div>
            </div>
            ` : ''}

            <div class="mt-4 text-xs text-gray-600">
                💡 These enhanced metrics use sophisticated market modeling including regime changes, volatility clustering, and asset correlations for more realistic projections.
            </div>
        `;

        enhancedContainer.classList.remove('hidden');
    }

    // Run comprehensive scenario comparison matrix
    async runScenarioComparison() {
        if (this.isCalculating) return;

        this.isCalculating = true;

        // Show scenario comparison progress bar
        const progressContainer = document.getElementById('scenarioComparisonProgress');
        const progressBar = document.getElementById('scenarioProgressBar');
        const progressText = document.getElementById('scenarioProgressText');
        const progressPercent = document.getElementById('scenarioProgressPercent');

        try {
            const inputs = this.collectInputs();

            // Check if scenario matrix engine is available
            if (!this.scenarioMatrix) {
                showNotification('Scenario comparison engine not available. Please try again in a moment.', 'warning');
                return;
            }

            // Show progress container
            if (progressContainer) {
                progressContainer.classList.remove('hidden');
            }

            const progressCallback = async (percentage, message) => {
                // Update scenario comparison progress bar
                if (progressBar) {
                    progressBar.style.width = `${percentage}%`;
                }
                if (progressText) {
                    progressText.textContent = message;
                }
                if (progressPercent) {
                    progressPercent.textContent = `${Math.round(percentage)}%`;
                }
                // Also update main progress bar
                updateProgress(percentage, message);
                await new Promise(resolve => setTimeout(resolve, 10));
            };

            // Show progress
            await progressCallback(0, "Generating scenario variations...");

            const matrixResults = await this.scenarioMatrix.generateScenarioMatrix(
                inputs, progressCallback
            );

            // Display results
            this.displayScenarioMatrix(matrixResults);

            await progressCallback(100, "Scenario analysis complete!");

            // Switch to scenarios tab to show comparison results
            showTab('scenarios', true);
            showNotification('Scenario comparison complete!', 'success');

            // Hide progress after a delay
            setTimeout(() => {
                if (progressContainer) {
                    progressContainer.classList.add('hidden');
                }
                updateProgress(0);
            }, 1500);

        } catch (error) {
            console.error('Scenario comparison error:', error);
            showNotification('Failed to run scenario comparison. Please try again.', 'error');
            // Hide progress on error
            if (progressContainer) {
                progressContainer.classList.add('hidden');
            }
        } finally {
            this.isCalculating = false;
        }
    }

    // Display scenario matrix results
    displayScenarioMatrix(matrixResults) {
        // Use the dedicated container inside the scenarios tab
        const matrixContainer = $('scenarioMatrixResults');
        if (!matrixContainer) {
            console.error('Scenario matrix results container not found');
            return;
        }

        // Generate and display matrix HTML
        matrixContainer.innerHTML = this.scenarioMatrix.generateMatrixHTML(matrixResults);
        matrixContainer.classList.remove('hidden');

        // Store results for export
        this.currentScenarioMatrix = matrixResults;

        // Scroll to results
        matrixContainer.scrollIntoView({ behavior: 'smooth' });
    }

    // Merge comprehensive and persona-based recommendations
    mergeRecommendations(comprehensiveRecs, personaRecs) {
        return {
            comprehensive: comprehensiveRecs,
            persona: personaRecs,
            merged: {
                topPriority: this.getTopPriorityRecommendations(comprehensiveRecs, personaRecs),
                personaInsights: personaRecs.insights || [],
                actionPlan: personaRecs.actionPlan || {},
                nextSteps: personaRecs.nextSteps || []
            }
        };
    }

    // Get top priority recommendations from both engines
    getTopPriorityRecommendations(comprehensiveRecs, personaRecs) {
        const combined = [];

        // Add top comprehensive recommendations
        if (comprehensiveRecs && comprehensiveRecs.quickWins) {
            combined.push(...comprehensiveRecs.quickWins.slice(0, 3).map(rec => ({
                ...rec,
                source: "comprehensive",
                priority: "high"
            })));
        }

        // Add top persona recommendations
        if (personaRecs && personaRecs.recommendations) {
            combined.push(...personaRecs.recommendations.slice(0, 3).map(rec => ({
                ...rec,
                source: "persona",
                priority: rec.priority || "medium"
            })));
        }

        // Sort by priority and return top 5
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return combined
            .sort((a, b) => (priorityOrder[b.priority] || 1) - (priorityOrder[a.priority] || 1))
            .slice(0, 5);
    }

    // Display enhanced recommendations with persona intelligence
    displayEnhancedRecommendations(enhancedRecs) {
        // First display the comprehensive recommendations (existing functionality)
        if (enhancedRecs.comprehensive) {
            this.displayComprehensiveRecommendations(enhancedRecs.comprehensive);
        }

        // Then add persona intelligence overlay
        this.addPersonaIntelligenceOverlay(enhancedRecs.persona, enhancedRecs.merged);
    }

    // Add persona intelligence overlay to recommendations display
    addPersonaIntelligenceOverlay(personaRecs, mergedRecs) {
        // Find or create persona intelligence container
        let personaContainer = $('personaIntelligenceResults');
        if (!personaContainer) {
            const recommendationsTab = $('tab-recommendations');
            if (recommendationsTab) {
                personaContainer = document.createElement('div');
                personaContainer.id = 'personaIntelligenceResults';
                personaContainer.className = 'mt-6';
                // Insert at the top of recommendations
                recommendationsTab.insertBefore(personaContainer, recommendationsTab.firstChild);
            } else {
                return;
            }
        }

        if (!personaRecs || !personaRecs.personaAnalysis) {
            personaContainer.innerHTML = '';
            return;
        }

        const { personaAnalysis, insights, actionPlan, nextSteps } = personaRecs;
        const { primaryPersona, userProfile } = personaAnalysis;

        personaContainer.innerHTML = `
            <div class="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-6 mb-6">
                <div class="flex items-center mb-4">
                    <div class="bg-purple-100 p-3 rounded-full mr-4">
                        <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                        </svg>
                    </div>
                    <div>
                        <h3 class="text-xl font-bold text-gray-800">🎯 Your Financial Persona</h3>
                        <p class="text-purple-600 font-medium">${primaryPersona.name}</p>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <!-- Persona Profile -->
                    <div class="bg-white p-4 rounded-lg shadow-sm">
                        <h4 class="font-semibold text-gray-800 mb-3">Your Profile</h4>
                        <p class="text-sm text-gray-600 mb-3">${primaryPersona.description}</p>
                        <div class="space-y-2 text-sm">
                            <div><span class="font-medium">Age:</span> ${userProfile.demographics.age} years</div>
                            <div><span class="font-medium">Time Horizon:</span> ${userProfile.demographics.yearsToRetirement} years to retirement</div>
                            <div><span class="font-medium">Risk Capacity:</span> ${userProfile.riskProfile.capacity}/100</div>
                            <div><span class="font-medium">Savings Rate:</span> ${(userProfile.financial.savingsRate * 100).toFixed(1)}%</div>
                        </div>
                    </div>

                    <!-- Key Insights -->
                    <div class="bg-white p-4 rounded-lg shadow-sm">
                        <h4 class="font-semibold text-gray-800 mb-3">Persona Insights</h4>
                        <div class="space-y-3">
                            ${insights.slice(0, 2).map(insight => `
                                <div class="p-2 bg-gray-50 rounded text-sm">
                                    <div class="font-medium text-gray-800">${insight.title}</div>
                                    <div class="text-gray-600 mt-1">${insight.description}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>

                <!-- Priority Action Plan -->
                ${actionPlan && (actionPlan.immediate?.length > 0 || actionPlan.next30Days?.length > 0) ? `
                <div class="mt-6 bg-white p-4 rounded-lg shadow-sm">
                    <h4 class="font-semibold text-gray-800 mb-3">🚀 Priority Action Plan</h4>

                    ${actionPlan.immediate && actionPlan.immediate.length > 0 ? `
                    <div class="mb-4">
                        <h5 class="font-medium text-red-600 mb-2">Immediate Actions</h5>
                        <div class="space-y-2">
                            ${actionPlan.immediate.map(action => `
                                <div class="flex items-center p-2 bg-red-50 rounded text-sm">
                                    <span class="w-2 h-2 bg-red-500 rounded-full mr-3"></span>
                                    <span>${action.title}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    ` : ''}

                    ${actionPlan.next30Days && actionPlan.next30Days.length > 0 ? `
                    <div class="mb-4">
                        <h5 class="font-medium text-orange-600 mb-2">Next 30 Days</h5>
                        <div class="space-y-2">
                            ${actionPlan.next30Days.map(action => `
                                <div class="flex items-center p-2 bg-orange-50 rounded text-sm">
                                    <span class="w-2 h-2 bg-orange-500 rounded-full mr-3"></span>
                                    <span>${action.title}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    ` : ''}
                </div>
                ` : ''}

                <!-- Next Steps -->
                ${nextSteps && nextSteps.length > 0 ? `
                <div class="mt-6 bg-white p-4 rounded-lg shadow-sm">
                    <h4 class="font-semibold text-gray-800 mb-3">📋 Next Steps</h4>
                    <div class="space-y-3">
                        ${nextSteps.slice(0, 3).map(step => `
                            <div class="flex items-start">
                                <div class="flex-shrink-0 w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center text-sm font-medium mr-3">
                                    ${step.step}
                                </div>
                                <div class="flex-1">
                                    <div class="font-medium text-gray-800">${step.action}</div>
                                    <div class="text-sm text-gray-600 mt-1">${step.description}</div>
                                    <div class="text-xs text-gray-500 mt-1">Timeline: ${step.timeframe}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}

                <div class="mt-4 text-xs text-purple-600">
                    💡 These insights are based on AI analysis of your financial profile and similar successful strategies.
                </div>
            </div>
        `;

        personaContainer.classList.remove('hidden');
    }

    // Run healthcare cost analysis and display results
    async runHealthcareAnalysis() {
        if (this.isCalculating) return;

        this.isCalculating = true;

        try {
            const inputs = this.collectInputs();

            // Check if healthcare modeling engine is available
            if (!this.healthcareModeling) {
                showNotification('Healthcare modeling engine not available. Please try again in a moment.', 'warning');
                return;
            }

            updateProgress(10, "Analyzing healthcare cost patterns...");
            await new Promise(resolve => setTimeout(resolve, 100));

            // Generate comprehensive healthcare projections
            const healthcareProjections = this.healthcareModeling.calculateHealthcareCostProjection(inputs);

            updateProgress(50, "Modeling aged care scenarios...");
            await new Promise(resolve => setTimeout(resolve, 100));

            // Run Monte Carlo simulation for healthcare costs
            const healthcareMonteCarlo = this.healthcareModeling.simulateHealthcareCosts(inputs, 2000);

            updateProgress(80, "Generating healthcare recommendations...");
            await new Promise(resolve => setTimeout(resolve, 100));

            // Create summary
            const healthcareSummary = this.healthcareModeling.generateHealthcareSummary(inputs);

            updateProgress(90, "Displaying healthcare analysis...");

            // Display results
            this.displayHealthcareAnalysis({
                projections: healthcareProjections,
                monteCarlo: healthcareMonteCarlo,
                summary: healthcareSummary
            });

            updateProgress(100, "Healthcare analysis complete!");

            // Switch to charts tab to show healthcare results
            showTab('charts', true);
            showNotification('Healthcare analysis complete!', 'success');
            setTimeout(() => updateProgress(0), 1000);

        } catch (error) {
            console.error('Healthcare analysis error:', error);
            showNotification('Failed to complete healthcare analysis. Please try again.', 'error');
        } finally {
            this.isCalculating = false;
        }
    }

    // ── Retirement Cost Reality Analysis ──────────────────────────────────────
    async runCostRealityAnalysis() {
        if (this.isCalculating) {
            showNotification('Another calculation is in progress. Please wait.', 'warning');
            return;
        }
        this.isCalculating = true;

        const statusEl = document.getElementById('costRealityStatus');
        const resultsEl = document.getElementById('costRealityResults');

        // Helper to show/clear an inline error banner within the Cost Reality tab
        const showCostError = (msg, detail = '') => {
            let errEl = document.getElementById('costRealityErrorBanner');
            if (!errEl) {
                errEl = document.createElement('div');
                errEl.id = 'costRealityErrorBanner';
                const anchor = resultsEl || statusEl;
                if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(errEl, anchor);
            }
            errEl.className = 'mb-4 p-4 bg-red-50 border border-red-300 rounded-lg text-sm text-red-800';
            errEl.innerHTML = `<strong>Cost Reality Analysis Error</strong>: ${msg}`
                + (detail ? `<pre class="mt-2 text-xs text-red-700 whitespace-pre-wrap">${detail}</pre>` : '');
            if (errEl.isConnected) errEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        };

        const clearCostError = () => {
            const errEl = document.getElementById('costRealityErrorBanner');
            if (errEl) errEl.remove();
        };

        clearCostError();
        if (statusEl) statusEl.classList.remove('hidden');
        if (resultsEl) resultsEl.classList.add('hidden');

        try {
            const inputs = this.collectInputs();
            await new Promise(resolve => setTimeout(resolve, 50)); // yield to browser

            const analyzer = new RetirementCostAnalyzer(inputs);
            const data = analyzer.analyze();

            // Stash for scenario switching and RAD slider
            this._costRealityData = data;
            this._costRealityActiveScenario = 'homePaidOff';

            // Meta info bar
            const meta = data.meta;
            const metaEl = document.getElementById('costRealityMeta');
            if (metaEl) {
                metaEl.innerHTML = [
                    `<span>Age now: <strong>${meta.currentAge}</strong></span>`,
                    `<span>Retire at: <strong>${meta.retirementAge}</strong></span>`,
                    `<span>Years to retire: <strong>${meta.yearsToRetirement}</strong></span>`,
                    `<span>Life expectancy: <strong>${meta.lifeExpectancy}</strong></span>`,
                    `<span>Inflation: <strong>${(meta.inflation * 100).toFixed(1)}%</strong></span>`,
                    `<span>Health: <strong class="capitalize">${meta.healthCondition}</strong></span>`,
                    meta.mortgageRepayment > 0
                        ? `<span>Mortgage repayment: <strong>$${Math.round(meta.mortgageRepayment / 1000)}k/yr</strong></span>`
                        : '',
                ].filter(Boolean).join('<span class="text-gray-300">|</span>');
            }

            // Show results first so the canvas elements are visible (Chart.js
            // needs a visible, non-zero-dimension canvas to initialise correctly).
            if (resultsEl) resultsEl.classList.remove('hidden');

            // Activate first scenario tab (populates summary cards and table)
            this.showCostScenario('homePaidOff', data);

            // Render charts after the container is visible
            this.renderCostRealityCharts(data);

            // Seed RAD/DAP with analyzer default
            this.updateRadDapDisplay(data.radAnalysis);

            showNotification('Cost Reality analysis complete!', 'success');

        } catch (err) {
            console.error('Cost Reality error:', err);
            const msg = err.message || String(err);
            const stack = err.stack ? err.stack.split('\n').slice(0, 5).join('\n') : '';
            showCostError(msg, stack);
            showNotification('Cost Reality analysis error: ' + msg, 'error');
        } finally {
            this.isCalculating = false;
            if (statusEl) statusEl.classList.add('hidden');
        }
    }

    showCostScenario(scenario, data) {
        data = data || this._costRealityData;
        if (!data) return;
        this._costRealityActiveScenario = scenario;

        // Tab highlight
        ['homePaidOff', 'homeMortgage', 'agedCare'].forEach(s => {
            const btn = document.getElementById(`cstab-${s}`);
            if (!btn) return;
            if (s === scenario) {
                btn.className = 'cost-scenario-tab px-4 py-2 text-sm font-medium border-b-2 ' +
                    (s === 'homePaidOff'  ? 'border-emerald-500 text-emerald-700 bg-emerald-50' :
                     s === 'homeMortgage' ? 'border-blue-500 text-blue-700 bg-blue-50' :
                                           'border-amber-500 text-amber-700 bg-amber-50') +
                    ' rounded-t-lg';
            } else {
                btn.className = 'cost-scenario-tab px-4 py-2 text-sm font-medium border-b-2 border-transparent text-gray-500 hover:text-gray-700 rounded-t-lg transition-colors';
            }
        });

        // RAD/DAP section visibility
        const radSection = document.getElementById('radDapSection');
        if (radSection) {
            radSection.classList.toggle('hidden', scenario !== 'agedCare');
        }

        // Summary cards
        const labels = data.snapshotLabels;
        const totals = data.summaryCards[scenario];
        const colours = {
            homePaidOff:  { bg: 'bg-emerald-50',  border: 'border-emerald-200', text: 'text-emerald-700', label: 'text-emerald-600' },
            homeMortgage: { bg: 'bg-blue-50',      border: 'border-blue-200',    text: 'text-blue-700',    label: 'text-blue-600' },
            agedCare:     { bg: 'bg-amber-50',     border: 'border-amber-200',   text: 'text-amber-700',   label: 'text-amber-600' },
        };
        const c = colours[scenario];
        const cardsEl = document.getElementById('costSummaryCards');
        if (cardsEl) {
            cardsEl.innerHTML = labels.map((lbl, i) => `
                <div class="${c.bg} ${c.border} border rounded-xl p-4 text-center shadow-sm">
                    <div class="text-xs font-medium ${c.label} uppercase tracking-wide mb-1">${lbl}</div>
                    <div class="text-2xl font-bold ${c.text}">$${Math.round(totals[i] / 1000)}k</div>
                    <div class="text-xs text-gray-400 mt-1">per year</div>
                    ${i > 0 ? `<div class="text-xs mt-1 ${c.label}">+${Math.round((totals[i] / totals[0] - 1) * 100)}% vs today</div>` : ''}
                </div>
            `).join('');
        }

        // Expense table
        const tableBody = document.getElementById('costExpenseTable');
        const tableFoot = document.getElementById('costExpenseTotal');
        const rows = data.tableRows[scenario];
        const totalsRow = data.summaryCards[scenario];
        if (tableBody) {
            tableBody.innerHTML = Object.entries(rows)
                .filter(([, cat]) => cat.values[0] > 0 || cat.values[1] > 0)
                .map(([, cat]) => `
                    <tr class="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td class="px-4 py-2 text-gray-700">${cat.label}</td>
                        ${cat.values.map(v => `<td class="px-4 py-2 text-right text-gray-700 tabular-nums">$${Math.round(v).toLocaleString()}</td>`).join('')}
                    </tr>
                `).join('');
        }
        if (tableFoot) {
            tableFoot.innerHTML = `
                <tr>
                    <td class="px-4 py-2.5 font-semibold text-gray-900">Total Annual Cost</td>
                    ${totalsRow.map(v => `<td class="px-4 py-2.5 text-right font-semibold text-gray-900 tabular-nums">$${Math.round(v).toLocaleString()}</td>`).join('')}
                </tr>
            `;
        }

        // Update stacked bar to this scenario
        this.renderCostBreakdownChart(data, scenario);
    }

    renderCostRealityCharts(data) {
        // Timeline chart — all three scenarios
        const timelineCtx = document.getElementById('costTimelineChart');
        if (!timelineCtx) return;

        if (this._costTimelineChart) this._costTimelineChart.destroy();

        this._costTimelineChart = new Chart(timelineCtx, {
            type: 'line',
            data: {
                labels: data.timelineYears,
                datasets: [
                    {
                        label: 'Own Home — Paid Off',
                        data: data.timeline.homePaidOff,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16,185,129,0.08)',
                        borderWidth: 2,
                        pointRadius: 0,
                        fill: false,
                        tension: 0.3,
                    },
                    {
                        label: 'Own Home — Mortgage',
                        data: data.timeline.homeMortgage,
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59,130,246,0.08)',
                        borderWidth: 2,
                        pointRadius: 0,
                        fill: false,
                        tension: 0.3,
                    },
                    {
                        label: 'Aged Care Facility',
                        data: data.timeline.agedCare,
                        borderColor: '#f59e0b',
                        backgroundColor: 'rgba(245,158,11,0.08)',
                        borderWidth: 2,
                        pointRadius: 0,
                        fill: false,
                        tension: 0.3,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    legend: { position: 'top', labels: { boxWidth: 12, font: { size: 11 } } },
                    tooltip: {
                        callbacks: {
                            label: ctx => ` ${ctx.dataset.label}: $${ctx.parsed.y.toLocaleString()}`,
                        },
                    },
                },
                scales: {
                    x: { title: { display: true, text: 'Age', font: { size: 11 } } },
                    y: {
                        title: { display: true, text: 'Annual Cost ($)', font: { size: 11 } },
                        ticks: { callback: v => `$${(v / 1000).toFixed(0)}k` },
                    },
                },
            },
        });
    }

    renderCostBreakdownChart(data, scenario) {
        const ctx = document.getElementById('costBreakdownChart');
        if (!ctx) return;

        if (this._costBreakdownChart) this._costBreakdownChart.destroy();

        const rows = data.stackedBar[scenario];
        const labels = Object.values(rows).map(r => r.label);
        const values = Object.values(rows).map(r => r.value);

        const palette = [
            '#10b981','#3b82f6','#f59e0b','#ef4444','#8b5cf6',
            '#ec4899','#06b6d4','#84cc16','#f97316','#6366f1','#14b8a6',
        ];

        this._costBreakdownChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['At Retirement'],
                datasets: labels.map((lbl, i) => ({
                    label: lbl,
                    data: [values[i]],
                    backgroundColor: palette[i % palette.length],
                    borderWidth: 0,
                    borderRadius: i === labels.length - 1 ? { topLeft: 4, topRight: 4 } : 0,
                })),
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right', labels: { boxWidth: 10, font: { size: 10 }, padding: 8 } },
                    tooltip: {
                        callbacks: {
                            label: ctx => ` ${ctx.dataset.label}: $${ctx.parsed.y.toLocaleString()}`,
                        },
                    },
                },
                scales: {
                    x: { stacked: true },
                    y: {
                        stacked: true,
                        ticks: { callback: v => `$${(v / 1000).toFixed(0)}k` },
                    },
                },
            },
        });
    }

    updateRadDapDisplay(radAnalysis) {
        const fmt = n => `$${Math.round(n).toLocaleString()}`;
        const el = id => document.getElementById(id);
        if (!radAnalysis) return;

        if (el('radDapDay'))    el('radDapDay').textContent    = fmt(radAnalysis.dapPerDay);
        if (el('radDapYear'))   el('radDapYear').textContent   = fmt(radAnalysis.dapPerYear);
        if (el('radOppCost'))   el('radOppCost').textContent   = fmt(radAnalysis.opportunityCostPerYear);
        if (el('radRecommendation')) {
            el('radRecommendation').textContent = radAnalysis.preferRad ? 'Pay RAD' : 'Pay DAP';
            el('radRecommendation').className = `text-base font-bold ${radAnalysis.preferRad ? 'text-emerald-700' : 'text-blue-700'}`;
        }
        if (el('radSaving')) {
            el('radSaving').textContent = `Save ~${fmt(radAnalysis.saving5yr)} over 5 years`;
        }
    }

    // Advanced three-dimensional risk profiling analysis
    async runAdvancedRiskProfiling() {
        if (this.isCalculating) return;

        this.isCalculating = true;

        try {
            const inputs = this.collectInputs();

            updateProgress(20, "Analyzing risk capacity...");
            await new Promise(resolve => setTimeout(resolve, 100));

            // Get current Monte Carlo results if available
            const monteCarloResults = this.currentResults?.monteCarlo || null;

            updateProgress(40, "Assessing risk tolerance...");
            await new Promise(resolve => setTimeout(resolve, 100));

            // Generate comprehensive risk profile
            if (!this.riskProfiling) {
                showNotification('Risk profiling engine not loaded yet. Please try again in a moment.', 'warning');
                return;
            }
            const riskProfile = this.riskProfiling.generateRiskProfileSummary(inputs, monteCarloResults);

            // Persist for export
            this.currentRiskProfile = riskProfile;

            updateProgress(80, "Generating risk recommendations...");
            await new Promise(resolve => setTimeout(resolve, 100));

            // Display results
            this.displayAdvancedRiskProfile(riskProfile);

            updateProgress(100, "Risk analysis complete!");

            // Switch to risk analysis tab to show results
            showTab('riskAnalysis', true);
            showNotification('Risk analysis complete!', 'success');
            setTimeout(() => updateProgress(0), 1000);

        } catch (error) {
            console.error('Risk profiling error:', error);
            showNotification('Failed to complete risk analysis. Please try again.', 'error');
        } finally {
            this.isCalculating = false;
        }
    }

    // Dynamic asset allocation optimization analysis
    async runDynamicAllocationAnalysis() {
        if (this.isCalculating) return;

        this.isCalculating = true;

        try {
            const inputs = this.collectInputs();

            updateProgress(20, "Analyzing current allocation...");
            await new Promise(resolve => setTimeout(resolve, 100));

            // Get risk profile if not already generated
            let riskProfile = null;
            if (this.currentResults?.riskProfile) {
                riskProfile = this.currentResults.riskProfile;
            } else {
                if (!this.riskProfiling) {
                    showNotification('Risk profiling engine not loaded yet. Please try again in a moment.', 'warning');
                    return;
                }
                updateProgress(40, "Determining risk profile...");
                riskProfile = this.riskProfiling.generateRiskProfileSummary(inputs, this.currentResults?.monteCarlo);
            }

            updateProgress(60, "Optimizing asset allocation...");
            await new Promise(resolve => setTimeout(resolve, 100));

            // Generate optimal allocation strategy
            if (!this.dynamicAllocation) {
                showNotification('Allocation engine not loaded yet. Please try again in a moment.', 'warning');
                return;
            }
            const allocationStrategy = this.dynamicAllocation.generateAllocationSummary(inputs, riskProfile);

            // Persist for export
            this.currentAllocationStrategy = allocationStrategy;

            updateProgress(80, "Creating rebalancing plan...");
            await new Promise(resolve => setTimeout(resolve, 100));

            // Display results
            this.displayDynamicAllocationStrategy(allocationStrategy);

            updateProgress(100, "Allocation analysis complete!");

            // Switch to charts tab to show allocation results
            showTab('charts', true);
            showNotification('Asset allocation analysis complete!', 'success');
            setTimeout(() => updateProgress(0), 1000);

        } catch (error) {
            console.error('Dynamic allocation error:', error);
            showNotification('Failed to complete allocation analysis. Please try again.', 'error');
        } finally {
            this.isCalculating = false;
        }
    }

    // Display advanced risk profiling results
    displayAdvancedRiskProfile(riskProfile) {
        // Target the dedicated container inside the riskAnalysis tab
        const resultsContainer = $('riskAnalysisContent');
        if (!resultsContainer) return;

        const riskContainer = document.createElement('div');
        riskContainer.className = 'bg-white rounded-lg shadow-lg p-6 mt-6';
        riskContainer.id = 'riskProfilingResults';

        const dimensionColors = {
            capacity: 'blue',
            tolerance: 'green',
            requirement: 'purple'
        };

        riskContainer.innerHTML = `
            <div class="border-b border-gray-200 pb-4 mb-6">
                <div class="flex items-center justify-between">
                    <div>
                        <h2 class="text-2xl font-bold text-gray-800">Advanced Risk Analysis</h2>
                        <p class="text-gray-600 mt-1">Three-dimensional risk assessment with personalized recommendations</p>
                    </div>
                    <div class="text-right">
                        <div class="text-3xl font-bold text-${riskProfile.overallRiskProfile === 'aggressive' ? 'red' :
            riskProfile.overallRiskProfile === 'growth' ? 'orange' :
                riskProfile.overallRiskProfile === 'balanced' ? 'blue' :
                    riskProfile.overallRiskProfile === 'conservative' ? 'green' : 'gray'}-600">
                            ${riskProfile.riskScore}/100
                        </div>
                        <div class="text-sm text-gray-600 uppercase tracking-wide">
                            ${riskProfile.overallRiskProfile.replace('_', ' ')} Investor
                        </div>
                        <div class="text-xs text-gray-500 mt-1">
                            Confidence: ${riskProfile.confidenceLevel}%
                        </div>
                    </div>
                </div>
            </div>

            <!-- Risk Dimensions -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                ${Object.entries(riskProfile.dimensions).map(([dimension, data]) => `
                    <div class="bg-${dimensionColors[dimension]}-50 border border-${dimensionColors[dimension]}-200 p-4 rounded-lg">
                        <div class="flex items-center justify-between mb-3">
                            <h4 class="font-semibold text-${dimensionColors[dimension]}-800 capitalize">${dimension.replace('_', ' ')}</h4>
                            <div class="text-2xl font-bold text-${dimensionColors[dimension]}-600">${data.score}/100</div>
                        </div>
                        <div class="text-sm text-${dimensionColors[dimension]}-700 mb-2">${data.level.replace('_', ' ').toUpperCase()}</div>

                        ${data.strengths && data.strengths.length > 0 ? `
                            <div class="mb-2">
                                <div class="text-xs font-medium text-green-700 mb-1">Strengths:</div>
                                <div class="text-xs text-green-600">
                                    ${data.strengths.map(s => s.replace('_', ' ')).join(', ')}
                                </div>
                            </div>
                        ` : ''}

                        ${data.weaknesses && data.weaknesses.length > 0 ? `
                            <div>
                                <div class="text-xs font-medium text-red-700 mb-1">Areas for Improvement:</div>
                                <div class="text-xs text-red-600">
                                    ${data.weaknesses.map(w => w.replace('_', ' ')).join(', ')}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>

            <!-- Risk Misalignment Analysis -->
            ${riskProfile.misalignment && riskProfile.misalignment.severity !== 'low' ? `
                <div class="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6">
                    <h4 class="text-lg font-semibold text-yellow-800 mb-3">
                        ⚠️ Risk Dimension ${riskProfile.misalignment.severity === 'high' ? 'Misalignment' : 'Considerations'}
                    </h4>
                    <div class="text-sm text-yellow-700 mb-3">
                        Your risk dimensions show a ${riskProfile.misalignment.range.toFixed(0)}-point spread, indicating ${riskProfile.misalignment.severity} alignment between your capacity, tolerance, and requirements.
                    </div>
                    ${riskProfile.misalignment.conflicts && riskProfile.misalignment.conflicts.length > 0 ? `
                        <div class="space-y-2">
                            ${riskProfile.misalignment.conflicts.map(conflict => `
                                <div class="bg-white p-3 rounded border-l-4 border-yellow-400">
                                    <div class="font-medium text-yellow-800">${conflict.description}</div>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
            ` : ''}

            <!-- Optimal Allocation -->
            <div class="bg-gray-50 p-4 rounded-lg mb-6">
                <h4 class="text-lg font-semibold text-gray-800 mb-4">Recommended Asset Allocation</h4>
                <div class="grid grid-cols-3 gap-4 mb-4">
                    <div class="text-center p-3 bg-blue-50 rounded">
                        <div class="text-2xl font-bold text-blue-600">${riskProfile.optimalAllocation.equity}%</div>
                        <div class="text-sm text-gray-600">Growth Assets</div>
                        <div class="text-xs text-gray-500">Stocks, Property REITs</div>
                    </div>
                    <div class="text-center p-3 bg-green-50 rounded">
                        <div class="text-2xl font-bold text-green-600">${riskProfile.optimalAllocation.bonds}%</div>
                        <div class="text-sm text-gray-600">Defensive Assets</div>
                        <div class="text-xs text-gray-500">Bonds, Fixed Income</div>
                    </div>
                    <div class="text-center p-3 bg-yellow-50 rounded">
                        <div class="text-2xl font-bold text-yellow-600">${riskProfile.optimalAllocation.cash}%</div>
                        <div class="text-sm text-gray-600">Cash Assets</div>
                        <div class="text-xs text-gray-500">Term Deposits, Savings</div>
                    </div>
                </div>
                <div class="text-sm text-gray-700 bg-white p-3 rounded">
                    <strong>Expected Performance:</strong><br>
                    • Annual Return: ${(riskProfile.optimalAllocation.expectedReturn * 100).toFixed(1)}%<br>
                    • Volatility: ${(riskProfile.optimalAllocation.expectedVolatility * 100).toFixed(1)}%<br>
                    • ${riskProfile.optimalAllocation.rationale}
                </div>
            </div>

            <!-- Top Recommendations -->
            ${riskProfile.topRecommendations && riskProfile.topRecommendations.length > 0 ? `
                <div class="bg-purple-50 border border-purple-200 p-4 rounded-lg">
                    <h4 class="text-lg font-semibold text-purple-800 mb-4">Priority Action Items</h4>
                    <div class="space-y-3">
                        ${riskProfile.topRecommendations.map((rec, index) => `
                            <div class="bg-white p-4 rounded border-l-4 border-purple-400">
                                <div class="flex items-start justify-between">
                                    <div class="flex-1">
                                        <div class="font-medium text-purple-800">${index + 1}. ${rec.title}</div>
                                        <div class="text-sm text-gray-600 mt-1">${rec.description}</div>
                                        ${rec.actions ? `
                                            <ul class="text-sm text-gray-600 mt-2 pl-4">
                                                ${rec.actions.slice(0, 3).map(action => `<li>• ${action}</li>`).join('')}
                                            </ul>
                                        ` : ''}
                                    </div>
                                    <div class="ml-4 px-3 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                                        ${rec.priority?.toUpperCase() || 'MEDIUM'}
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        `;

        // Remove existing risk results and add new ones
        const existingRiskResults = $('riskProfilingResults');
        if (existingRiskResults) {
            existingRiskResults.remove();
        }

        resultsContainer.appendChild(riskContainer);
        riskContainer.scrollIntoView({ behavior: 'smooth' });
    }

    // Display dynamic allocation strategy results
    displayDynamicAllocationStrategy(strategy) {
        // Target the dedicated container inside the charts tab
        let allocationContainer = $('dynamicAllocationResults');
        if (!allocationContainer) return;

        allocationContainer.classList.remove('hidden');
        allocationContainer.className = 'mt-6 bg-white rounded-lg shadow-lg p-6';
        allocationContainer.id = 'dynamicAllocationResults';

        allocationContainer.innerHTML = `
            <div class="border-b border-gray-200 pb-4 mb-6">
                <div class="flex items-center justify-between">
                    <div>
                        <h2 class="text-2xl font-bold text-gray-800">Dynamic Asset Allocation Strategy</h2>
                        <p class="text-gray-600 mt-1">Optimized portfolio management with lifecycle-based allocation</p>
                    </div>
                    <div class="text-right">
                        <div class="text-lg font-bold text-blue-600 capitalize">
                            ${strategy.strategy.name.replace('_', ' ')}
                        </div>
                        <div class="text-sm text-gray-600">
                            ${strategy.strategy.description}
                        </div>
                        <div class="text-xs text-gray-500 mt-1">
                            Confidence: ${strategy.confidence}%
                        </div>
                    </div>
                </div>
            </div>

            <!-- Current Recommended Allocation -->
            <div class="mb-8">
                <h3 class="text-xl font-semibold text-gray-800 mb-4">Recommended Portfolio Allocation</h3>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-4">
                    <div class="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
                        <div class="text-center">
                            <div class="text-3xl font-bold text-blue-600">${strategy.currentAllocation.equity}%</div>
                            <div class="text-sm font-medium text-blue-800">Growth Assets</div>
                            <div class="text-xs text-blue-600 mt-1">
                                Australian & International Shares, Property REITs
                            </div>
                        </div>
                    </div>
                    <div class="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
                        <div class="text-center">
                            <div class="text-3xl font-bold text-green-600">${strategy.currentAllocation.bonds}%</div>
                            <div class="text-sm font-medium text-green-800">Defensive Assets</div>
                            <div class="text-xs text-green-600 mt-1">
                                Government & Corporate Bonds, Fixed Income
                            </div>
                        </div>
                    </div>
                    <div class="bg-gradient-to-r from-yellow-50 to-yellow-100 p-4 rounded-lg border border-yellow-200">
                        <div class="text-center">
                            <div class="text-3xl font-bold text-yellow-600">${strategy.currentAllocation.cash}%</div>
                            <div class="text-sm font-medium text-yellow-800">Cash Assets</div>
                            <div class="text-xs text-yellow-600 mt-1">
                                High Interest Savings, Term Deposits
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Expected Performance Metrics -->
            <div class="bg-gray-50 p-4 rounded-lg mb-6">
                <h4 class="text-lg font-semibold text-gray-800 mb-4">Expected Portfolio Performance</h4>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div class="text-center p-3 bg-white rounded">
                        <div class="text-xl font-bold text-blue-600">${strategy.expectedMetrics.expectedReturn}</div>
                        <div class="text-sm text-gray-600">Annual Return</div>
                    </div>
                    <div class="text-center p-3 bg-white rounded">
                        <div class="text-xl font-bold text-orange-600">${strategy.expectedMetrics.expectedVolatility}</div>
                        <div class="text-sm text-gray-600">Volatility</div>
                    </div>
                    <div class="text-center p-3 bg-white rounded">
                        <div class="text-xl font-bold text-green-600">${strategy.expectedMetrics.sharpeRatio}</div>
                        <div class="text-sm text-gray-600">Sharpe Ratio</div>
                    </div>
                    <div class="text-center p-3 bg-white rounded">
                        <div class="text-xl font-bold text-red-600">${strategy.expectedMetrics.maxDrawdown}</div>
                        <div class="text-sm text-gray-600">Max Drawdown</div>
                    </div>
                </div>
            </div>

            <!-- Rebalancing Plan -->
            <div class="bg-blue-50 border border-blue-200 p-4 rounded-lg mb-6">
                <h4 class="text-lg font-semibold text-blue-800 mb-3">Rebalancing Strategy</h4>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <div class="font-medium text-blue-700">Frequency</div>
                        <div class="text-sm text-blue-600 capitalize">${strategy.rebalancingPlan.frequency.replace('_', ' ')}</div>
                    </div>
                    <div>
                        <div class="font-medium text-blue-700">Method</div>
                        <div class="text-sm text-blue-600 capitalize">${strategy.rebalancingPlan.method.replace('_', ' ')}</div>
                    </div>
                    <div>
                        <div class="font-medium text-blue-700">Next Review</div>
                        <div class="text-sm text-blue-600">
                            ${strategy.rebalancingPlan.nextReview ? new Date(strategy.rebalancingPlan.nextReview).toLocaleDateString() : 'Within 3 months'}
                        </div>
                    </div>
                </div>
            </div>

            <!-- Tactical Adjustments -->
            ${strategy.tacticalAdjustments && strategy.tacticalAdjustments.length > 0 ? `
                <div class="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6">
                    <h4 class="text-lg font-semibold text-yellow-800 mb-3">Current Market Adjustments</h4>
                    <div class="space-y-2">
                        ${strategy.tacticalAdjustments.map(adj => `
                            <div class="bg-white p-3 rounded border-l-4 border-yellow-400">
                                <div class="font-medium text-yellow-800">${adj.type.replace('_', ' ').toUpperCase()}</div>
                                <div class="text-sm text-gray-600">${adj.description}</div>
                                <div class="text-xs text-gray-500 mt-1">Confidence: ${(adj.confidence * 100).toFixed(0)}%</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            <!-- Implementation Steps -->
            ${strategy.implementationSteps && strategy.implementationSteps.length > 0 ? `
                <div class="bg-green-50 border border-green-200 p-4 rounded-lg mb-6">
                    <h4 class="text-lg font-semibold text-green-800 mb-4">Implementation Roadmap</h4>
                    <div class="space-y-3">
                        ${strategy.implementationSteps.map((step, index) => `
                            <div class="bg-white p-4 rounded border-l-4 border-green-400">
                                <div class="flex items-start justify-between">
                                    <div class="flex-1">
                                        <div class="flex items-center mb-2">
                                            <div class="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3">
                                                ${index + 1}
                                            </div>
                                            <div class="font-medium text-green-800">${step.title}</div>
                                        </div>
                                        <div class="text-sm text-gray-600 ml-9">${step.description}</div>
                                    </div>
                                    <div class="ml-4 text-right">
                                        <div class="px-3 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full mb-1">
                                            ${step.priority?.toUpperCase() || 'MEDIUM'}
                                        </div>
                                        <div class="text-xs text-gray-500 capitalize">${step.timeline?.replace('_', ' ') || 'Soon'}</div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            <!-- Strategy Rationale -->
            <div class="bg-purple-50 border border-purple-200 p-4 rounded-lg">
                <h4 class="text-lg font-semibold text-purple-800 mb-3">Strategy Rationale</h4>
                <div class="text-sm text-purple-700 leading-relaxed">
                    ${strategy.rationale}
                </div>
            </div>
        `;

        allocationContainer.scrollIntoView({ behavior: 'smooth' });
    }

    // Display healthcare analysis results
    displayHealthcareAnalysis(healthcareResults) {
        // Use the dedicated container inside the charts tab
        const healthcareContainer = $('healthcareAnalysisResults');
        if (!healthcareContainer) {
            console.error('Healthcare results container not found');
            return;
        }

        const { projections, monteCarlo, summary } = healthcareResults;

        healthcareContainer.innerHTML = `
            <div class="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-6">
                <h3 class="text-2xl font-bold text-gray-800 mb-2">🏥 Healthcare Cost Analysis</h3>
                <p class="text-gray-600 mb-6">Comprehensive healthcare and aged care cost projections based on 2024-2025 Australian data</p>

                <!-- Summary Statistics -->
                <div class="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div class="bg-white p-4 rounded-lg shadow border">
                        <div class="text-sm text-gray-600">Lifetime Healthcare Costs</div>
                        <div class="text-2xl font-bold text-blue-600">${formatCurrency(summary.totalLifetimeCost)}</div>
                        <div class="text-xs text-gray-500">Including aged care</div>
                    </div>
                    <div class="bg-white p-4 rounded-lg shadow border">
                        <div class="text-sm text-gray-600">Annual Average</div>
                        <div class="text-2xl font-bold text-green-600">${formatCurrency(summary.averageAnnualCost)}</div>
                        <div class="text-xs text-gray-500">Per year in retirement</div>
                    </div>
                    <div class="bg-white p-4 rounded-lg shadow border">
                        <div class="text-sm text-gray-600">Aged Care Probability</div>
                        <div class="text-2xl font-bold text-orange-600">${(summary.agedCareProbability * 100).toFixed(0)}%</div>
                        <div class="text-xs text-gray-500">Likelihood of need</div>
                    </div>
                    <div class="bg-white p-4 rounded-lg shadow border">
                        <div class="text-sm text-gray-600">Expected Aged Care Cost</div>
                        <div class="text-2xl font-bold text-red-600">${formatCurrency(summary.agedCareExpectedCost)}</div>
                        <div class="text-xs text-gray-500">If care is needed</div>
                    </div>
                </div>

                <!-- Monte Carlo Results -->
                <div class="bg-white p-4 rounded-lg shadow border mb-6">
                    <h4 class="text-lg font-semibold text-gray-800 mb-4">Healthcare Cost Projections (Monte Carlo Analysis)</h4>
                    <div class="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <div class="text-center p-3 bg-red-50 rounded">
                            <div class="text-xs text-gray-600 mb-1">10th Percentile</div>
                            <div class="font-medium text-red-700">${formatCurrency(monteCarlo.percentile10)}</div>
                        </div>
                        <div class="text-center p-3 bg-orange-50 rounded">
                            <div class="text-xs text-gray-600 mb-1">25th Percentile</div>
                            <div class="font-medium text-orange-700">${formatCurrency(monteCarlo.percentile10 * 1.4)}</div>
                        </div>
                        <div class="text-center p-3 bg-blue-50 rounded">
                            <div class="text-xs text-gray-600 mb-1">Median (50th)</div>
                            <div class="font-medium text-blue-700">${formatCurrency(monteCarlo.median)}</div>
                        </div>
                        <div class="text-center p-3 bg-green-50 rounded">
                            <div class="text-xs text-gray-600 mb-1">90th Percentile</div>
                            <div class="font-medium text-green-700">${formatCurrency(monteCarlo.percentile90)}</div>
                        </div>
                        <div class="text-center p-3 bg-purple-50 rounded">
                            <div class="text-xs text-gray-600 mb-1">95th Percentile</div>
                            <div class="font-medium text-purple-700">${formatCurrency(monteCarlo.percentile95)}</div>
                        </div>
                    </div>
                </div>

                <!-- Aged Care Breakdown -->
                ${projections.agedCareProjections ? `
                <div class="bg-white p-4 rounded-lg shadow border mb-6">
                    <h4 class="text-lg font-semibold text-gray-800 mb-4">Aged Care Cost Breakdown</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <h5 class="font-medium text-gray-700 mb-2">Home Care</h5>
                            <div class="space-y-2 text-sm">
                                <div class="flex justify-between">
                                    <span>Probability:</span>
                                    <span class="font-medium">${(projections.agedCareProjections.homeCare.probability * 100).toFixed(0)}%</span>
                                </div>
                                <div class="flex justify-between">
                                    <span>Expected Cost:</span>
                                    <span class="font-medium">${formatCurrency(projections.agedCareProjections.homeCare.expectedCost)}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span>Average Duration:</span>
                                    <span class="font-medium">${projections.agedCareProjections.homeCare.averageDuration} years</span>
                                </div>
                            </div>
                        </div>
                        <div>
                            <h5 class="font-medium text-gray-700 mb-2">Residential Care</h5>
                            <div class="space-y-2 text-sm">
                                <div class="flex justify-between">
                                    <span>Probability:</span>
                                    <span class="font-medium">${(projections.agedCareProjections.residentialCare.probability * 100).toFixed(0)}%</span>
                                </div>
                                <div class="flex justify-between">
                                    <span>Expected Cost:</span>
                                    <span class="font-medium">${formatCurrency(projections.agedCareProjections.residentialCare.expectedCost)}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span>Estimated RAD:</span>
                                    <span class="font-medium">${formatCurrency(projections.agedCareProjections.residentialCare.estimatedRAD)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                ` : ''}

                <!-- Risk Factors -->
                ${summary.majorRisks && summary.majorRisks.length > 0 ? `
                <div class="bg-red-50 border border-red-200 p-4 rounded-lg mb-6">
                    <h4 class="text-lg font-semibold text-red-800 mb-3">⚠️ Healthcare Risk Factors</h4>
                    <div class="space-y-3">
                        ${summary.majorRisks.map(risk => `
                            <div class="bg-white p-3 rounded border-l-4 border-red-400">
                                <div class="font-medium text-red-800">${risk.description}</div>
                                <div class="text-sm text-red-600 mt-1">${risk.impact}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}

                <!-- Recommendations -->
                ${summary.topRecommendations && summary.topRecommendations.length > 0 ? `
                <div class="bg-white p-4 rounded-lg shadow border mb-6">
                    <h4 class="text-lg font-semibold text-gray-800 mb-4">💡 Healthcare Planning Recommendations</h4>
                    <div class="space-y-4">
                        ${summary.topRecommendations.map((rec, index) => `
                            <div class="flex items-start">
                                <div class="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium mr-3">
                                    ${index + 1}
                                </div>
                                <div class="flex-1">
                                    <div class="font-medium text-gray-800">${rec.title}</div>
                                    <div class="text-sm text-gray-600 mt-1">${rec.description}</div>
                                    ${rec.estimatedSaving > 0 ? `<div class="text-sm text-green-600 mt-1">Potential savings: ${formatCurrency(rec.estimatedSaving)}</div>` : ''}
                                    ${rec.implementationSteps ? `
                                    <div class="mt-2">
                                        <div class="text-xs text-gray-500 font-medium">Implementation steps:</div>
                                        <ul class="text-xs text-gray-600 mt-1 ml-4">
                                            ${rec.implementationSteps.slice(0, 2).map(step => `<li>• ${step}</li>`).join('')}
                                        </ul>
                                    </div>
                                    ` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                ` : ''}

                <div class="mt-4 text-xs text-gray-600">
                    📊 Analysis based on 2024-2025 Australian healthcare costs, aged care reforms, and inflation data from government sources.
                </div>
            </div>
        `;

        healthcareContainer.classList.remove('hidden');

        // Store results for export
        this.currentHealthcareAnalysis = healthcareResults;

        // Scroll to results
        healthcareContainer.scrollIntoView({ behavior: 'smooth' });
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
            debugLog('Cash flow analysis result:', cashFlowAnalysis); // Debug log

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
            debugLog('Savings capacity:', savingsCapacity); // Debug log

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
    analyzeKeepVsSell(inputs, capitalLossPool = 0) {
        if (!inputs.hasInvestmentProperty) return null;

        const yearsToSell = inputs.sellPropertyYears;
        const currentValue = inputs.investmentPropertyValue;
        const propertyCashFlow = this.simulator.calculatePropertyCashFlow(inputs, 0);
        const annualNetIncome = propertyCashFlow ? propertyCashFlow.netCashFlow : 0;
        const explicitHorizon = this.hasExplicitPlanningHorizon(inputs)
            ? Math.max(1, (inputs.yourLifespan || 0) - (inputs.yourCurrentAge || 0))
            : 30;
        const comparisonHorizon = Math.min(40, explicitHorizon);

        const evaluateSaleTiming = (saleYear) => {
            const saleResult = this.simulator.calculatePropertySale(inputs, saleYear, capitalLossPool);
            if (!saleResult) {
                return null;
            }

            let netCashFlowBeforeSale = 0;
            for (let year = 0; year < saleYear; year++) {
                const yearlyCashFlow = this.simulator.calculatePropertyCashFlow(inputs, year);
                netCashFlowBeforeSale += yearlyCashFlow?.netCashFlow || 0;
            }

            const yearsAfterSale = Math.max(0, comparisonHorizon - saleYear);
            const reinvestedProceeds = saleResult.netProceeds * Math.pow(1 + (inputs.investmentReturn || 0), yearsAfterSale);

            return {
                year: saleYear,
                sellAge: (inputs.yourCurrentAge || 0) + saleYear,
                netProceeds: saleResult.netProceeds,
                projectedWealthAtHorizon: reinvestedProceeds + netCashFlowBeforeSale
            };
        };

        if (yearsToSell === 0) {
            const longTermYears = comparisonHorizon;
            const futureValue = this.simulator.calculatePropertyValue(currentValue, inputs.propertyGrowthRate, longTermYears);
            const totalNetIncome = annualNetIncome * longTermYears;
            let bestSaleOption = null;

            for (let saleYear = 1; saleYear <= comparisonHorizon; saleYear++) {
                const candidate = evaluateSaleTiming(saleYear);
                if (!candidate) {
                    continue;
                }

                if (!bestSaleOption || candidate.projectedWealthAtHorizon > bestSaleOption.projectedWealthAtHorizon) {
                    bestSaleOption = candidate;
                }
            }

            return {
                keepTotalReturn: (totalNetIncome + (futureValue - currentValue)) / currentValue,
                keepNetIncome: annualNetIncome, // Show annual contribution when keeping indefinitely
                sellNetProceeds: 0, // Not selling
                sellInvestmentReturn: 0,
                bestSaleOption,
                recommendation: annualNetIncome > 0 ?
                    'Keeping property - generating positive cash flow' :
                    'Property has negative cash flow - consider selling'
            };
        }

        const saleScenario = evaluateSaleTiming(yearsToSell);
        const keepNetIncome = annualNetIncome * yearsToSell;

        return {
            keepTotalReturn: saleScenario ? (keepNetIncome + saleScenario.netProceeds - currentValue) / currentValue : 0,
            keepNetIncome,
            sellNetProceeds: saleScenario?.netProceeds || 0,
            sellInvestmentReturn: this.calculatePortfolioReturn(inputs, yearsToSell),
            recommendation: (saleScenario?.netProceeds || 0) > (keepNetIncome + currentValue) ?
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

        // BUG FIX 1H: australianEquityAllocation is already a decimal (0–1) from collectInputs().
        // Compare against 0.30 (30%), not 30, to avoid always triggering this recommendation.
        if (inputs.australianEquityAllocation < 0.30) {
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

        // Property recommendations — type-aware sell-timing analysis
        if (inputs.hasInvestmentProperty) {
            const cashFlow = result.propertyHistory?.[0];
            if (cashFlow && cashFlow.netCashFlow < 0) {
                recommendations.push('Investment property has negative cash flow — review holding strategy');
            }

            const propType   = inputs.investmentPropertyType || 'unit';
            const isUnit     = propType === 'unit';
            const isTownhouse = propType === 'townhouse';
            const ipValue    = inputs.investmentPropertyValue || 0;
            const strataLevy = inputs.investmentPropertyStrataLevy || 0;
            const weeklyRent = inputs.weeklyRentalIncome || 0;
            const grossYield = ipValue > 0 ? (weeklyRent * 52 / ipValue * 100) : 0;
            const strataLevyPct = ipValue > 0 ? (strataLevy / ipValue * 100) : 0;
            const growthRate = (inputs.propertyGrowthRate || 0) * 100; // back to display %

            // Always: CGT 12-month threshold reminder
            recommendations.push(
                'Hold investment property for at least 12 months to secure the 50% CGT discount before selling — the tax saving can exceed $30,000 per owner on a typical capital gain.'
            );

            // Yield vs holding cost signal
            if (grossYield > 0 && grossYield < 4.5) {
                recommendations.push(
                    `Investment property gross yield of ~${grossYield.toFixed(1)}% p.a. is below typical AU investment loan rates (~6.5%). Negative gearing is advantageous at high marginal tax rates but recalculate when your income drops near retirement.`
                );
            }

            // Strata levy erosion (units/townhouses with high levy relative to value)
            if ((isUnit || isTownhouse) && strataLevyPct > 1.0) {
                recommendations.push(
                    `Annual strata levy ($${strataLevy.toLocaleString()}, ${strataLevyPct.toFixed(1)}% of value) materially erodes your net rental yield. If a special levy for building defects or cladding rectification is forthcoming, consider selling before it is issued.`
                );
            }

            // Unit depreciation cliff
            if (isUnit) {
                recommendations.push(
                    'If your unit was purchased new (post-1985), plant and equipment depreciation deductions typically exhaust around years 12–15. After this point the after-tax holding cost rises — review your hold/sell position at that milestone.'
                );
            }

            // Low growth rate signal for units
            if (isUnit && growthRate < 4.5) {
                recommendations.push(
                    `Your unit growth rate of ${growthRate.toFixed(1)}% p.a. combined with strata costs may produce returns below diversified equities on a risk-adjusted basis. Consider whether selling and redirecting capital into super or index funds would improve outcomes.`
                );
            }

            // Long-run house vs unit differential note
            if (isUnit || isTownhouse) {
                recommendations.push(
                    `Long-run data (ABS RPPI 25yr): houses outperform units by ~1.5 pp p.a. due to land appreciation. Units deliver higher rental yields (+~2 pp) and stronger early depreciation benefits, but this advantage reverses over 20+ year horizons.`
                );
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
            const decisionEngine = new DecisionSupportEngine(this.simulator, inputs, this.config);

            // This is a long process, so provide detailed feedback
            updateProgress(20, 'Analyzing market conditions and property cycles...');
            updateProgress(30, 'Running baseline Monte Carlo simulation...');
            updateProgress(40, 'Evaluating home ownership strategies...');
            updateProgress(50, 'Analyzing investment property timing...');
            updateProgress(60, 'Optimizing stock and share strategies...');
            updateProgress(70, 'Evaluating trust structures and tax benefits...');
            updateProgress(80, 'Analyzing superannuation optimization...');

            const comprehensiveRecommendations = await decisionEngine.generateComprehensiveRecommendations();

            // Layer on persona-based intelligence for enhanced personalization
            updateProgress(85, 'Applying persona-based intelligence...');
            const personaRecommendations = this.personaIntelligence.generatePersonaRecommendations(
                inputs,
                this.currentMonteCarloResults,
                this.currentScenarioMatrix
            );

            // Merge comprehensive and persona-based recommendations
            const enhancedRecommendations = this.mergeRecommendations(
                comprehensiveRecommendations,
                personaRecommendations
            );

            // Store results for export
            this.currentRecommendations = enhancedRecommendations.merged.topPriority;
            this.currentComprehensiveRecommendations = comprehensiveRecommendations;
            this.currentActionPlan = personaRecommendations?.actionPlan || null;
            this.currentPersonaRecommendations = personaRecommendations;

            updateProgress(90, 'Formatting enhanced recommendations...');
            this.displayEnhancedRecommendations(enhancedRecommendations);

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
                const basicEngine = new RecommendationEngine(this.simulator, this.collectInputs(), this.config);
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
            const inputs = profiler.measure('advanced-classic.suggestions.input.collectInputs', () => this.collectInputs());

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
            const recommendationEngine = new RecommendationEngine(this.simulator, inputs, this.config, {
                profiler,
                profilePrefix: 'advanced-classic.suggestions'
            });

            updateProgress(30, 'Running baseline calculation...');
            const baselineResults = await profiler.asyncMeasure('advanced-classic.suggestions.explicitBaselineMonteCarlo', () => this.simulator.runMonteCarloSimulation(inputs, 1000));
            recommendationEngine.baselineMonteCarlo = baselineResults;

            updateProgress(50, 'Generating actionable suggestions...');
            const scenarios = await profiler.asyncMeasure('advanced-classic.suggestions.totalGenerateRecommendations', () => recommendationEngine.generateRecommendations());

            // Store scenarios for Try This functionality and export
            this.lastGeneratedSuggestions = scenarios;
            this.currentSuggestions = scenarios;

            // Tag each suggestion with its display category so export shows proper grouping
            const taggedCats = profiler.measure('advanced-classic.suggestions.categorizeForUi', () => this.categorizeSuggestionsForUI(scenarios));
            Object.entries(taggedCats).forEach(([cat, items]) => {
                items.forEach(s => { if (!s.exportCategory) s.exportCategory = cat; });
            });

            updateProgress(80, 'Categorizing suggestions...');
            await new Promise(resolve => setTimeout(resolve, 100));

            // Debug: Log scenarios structure
            debugLog('Generated scenarios:', scenarios);
            debugLog('Scenarios length:', scenarios ? scenarios.length : 'scenarios is null/undefined');
            if (scenarios && scenarios.length > 0) {
                debugLog('First scenario structure:', scenarios[0]);
                debugLog('First scenario keys:', Object.keys(scenarios[0]));
            }

            // Categorize scenarios for the suggestions UI
            const categorizedSuggestions = this.categorizeSuggestionsForUI(scenarios);

            updateProgress(90, 'Displaying suggestions...');
            profiler.measure('advanced-classic.suggestions.render.categorizedSuggestions', () => this.displayCategorizedSuggestions(categorizedSuggestions));

            // Render the new readiness summary + Comfortable/Rich panel at the top
            await this.displaySuggestionsPanel(inputs, scenarios, baselineResults);

            updateProgress(100, 'Suggestions generated successfully!');
            showNotification(`Generated ${scenarios.length} personalized suggestions across ${Object.keys(categorizedSuggestions).length} categories.`, 'success');
            profiler.report('advanced classic Suggestions profile');

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

    /**
     * Render the new readiness summary + Comfortable/Rich comparison panel
     * into the #sg-advanced-panel container in advanced.html.
     */
    async displaySuggestionsPanel(inputs, recommendations, baselineResults) {
        const panelEl = $('sg-advanced-panel');
        if (!panelEl) return;

        try {
            const [SuggestionsUI, OutcomeBands] = await Promise.all([
                import(/* webpackChunkName: "suggestions-ui" */ './suggestions-ui.js'),
                import(/* webpackChunkName: "outcome-bands" */ './outcome-bands.js'),
            ]);

            const richTargetEl  = $('richTarget');
            const richTargetVal = richTargetEl?.value || '1.5';
            const customRichEl  = $('richTargetCustom');
            const richMultiplier = richTargetVal === 'custom' ? null : parseFloat(richTargetVal) || 1.5;
            const customRich     = richTargetVal === 'custom' && customRichEl
                ? parseFloat(customRichEl.value) || null : null;

            // Get Monte Carlo results if available
            const mcResults = this.currentMonteCarloResults || null;
            const simResult = this.lastResults || this.currentSimulationResults || null;
            const outcomeForBand = this.currentOutcome;
            // Build a minimal adaptedResult so computeOutcomeBand gets a non-zero annualIncome.
            // Without this, projectedAnnualIncome = 0 and the band headline reads "$0/year".
            const adaptedResultForBand = outcomeForBand ? {
                annualIncome: outcomeForBand.sustainableIncomeToday || 0,
                plannedSpendingToday: outcomeForBand.sustainableIncomeToday || 0,
                depletionAge: outcomeForBand.legacy?.runOutAge || null,
            } : null;

            const band = OutcomeBands.computeOutcomeBand({
                monteCarloResults: mcResults,
                simulation: simResult,
                adaptedResult: adaptedResultForBand,
                inputs,
                engineInputs: inputs,
                richMultiplier,
                customRichTarget: customRich,
            });

            const isCouple = !!(inputs.hasPartner || inputs.partnerSalary > 0);
            const salary   = inputs.yourSalary || inputs.annualSalary || 0;
            const retireAge = inputs.retirementAge || inputs.yourRetirementAge || 67;
            const currentAge = inputs.yourCurrentAge || inputs.currentAge || 50;
            const yearsToRetire = Math.max(1, retireAge - currentAge);

            // Sort recommendations: HIGH first
            const sorted = [...(recommendations || [])].sort((a, b) => {
                const pOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
                const pa = pOrder[a.priority] || 2;
                const pb = pOrder[b.priority] || 2;
                if (pa !== pb) return pb - pa;
                return (b.successRateDiff || 0) - (a.successRateDiff || 0);
            });

            const nextAction = sorted.length
                ? (sorted[0].title || sorted[0].shortTitle || null)
                : null;

            panelEl.innerHTML =
                SuggestionsUI.DISCLAIMER_HTML +
                SuggestionsUI.buildReadinessSummaryCard(band, { nextAction }) +
                SuggestionsUI.buildComfortableRichPanel(band, { yearsToRetirement: yearsToRetire, annualSalary: salary, isCouple, richMultiplier: richMultiplier || 1.5 });

        } catch (err) {
            console.warn('[displaySuggestionsPanel] failed:', err);
            panelEl.innerHTML = '';
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

        // Ensure the what-if comparison section stays hidden until a "Try This" button
        // is clicked — it will be populated and revealed by populateWhatIfComparison().
        const whatIfDiv = $('whatIfComparison');
        if (whatIfDiv) {
            whatIfDiv.classList.add('hidden');
            // Reset its heading to the default
            const heading = whatIfDiv.querySelector('h3');
            if (heading) heading.textContent = '📊 What-If Scenario Comparison';
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

                    ${suggestion.isTryThisDisabled ? `
                    <span class="text-xs px-3 py-1 bg-gray-100 text-gray-500 rounded italic">Review Only</span>
                    ` : `
                    <button
                        class="text-xs px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
                        onclick="app.applySuggestion('${(suggestion.name || suggestion.title || 'Unknown').replace(/'/g, "\\'")}')"
                    >
                        Try This →
                    </button>
                    `}
                </div>
            </div>
        `).join('');
    }

    // Apply a suggestion — run a What-If comparison and populate the comparison section,
    // then apply the modifications to the form so the user can see exactly what changed.
    async applySuggestion(suggestionName) {
        if (!this.lastGeneratedSuggestions) {
            showNotification('Please generate suggestions first', 'error');
            return;
        }

        // Find the suggestion by name or title
        const suggestion = this.lastGeneratedSuggestions.find(s =>
            (s.name || s.title || '') === suggestionName
        );

        if (!suggestion) {
            showNotification(`Could not find suggestion: "${suggestionName}"`, 'warning');
            return;
        }

        // If no modifications, show what data is available as an informational comparison
        if (!suggestion.modifications) {
            // Still show What-If panel if we have pre-computed successRate/medianBalance data
            if (suggestion.successRate !== undefined || suggestion.medianBalance !== undefined) {
                this.populateWhatIfComparison(suggestion, suggestionName);
                showNotification(`"${suggestionName}" is an informational scenario. Impact shown in the What-If Scenario Comparison below.`, 'info');
            } else {
                showNotification(`"${suggestionName}" is for informational purposes — no specific field changes are modelled for this scenario.`, 'info');
            }
            return;
        }

        try {
            // ── Step 1: capture baseline results ──────────────────────────────
            const baseline = this.currentResults;
            const baselineInputs = this.collectInputs();

            // ── Step 2: build modified inputs object without touching the form yet ──
            // collectInputs() keys map 1-to-1 with suggestion.modifications keys
            // (e.g. planToDownsize, sellPropertyYears, retirementAge …).
            const modifiedInputs = { ...baselineInputs };
            Object.entries(suggestion.modifications).forEach(([key, value]) => {
                if (key in modifiedInputs) {
                    modifiedInputs[key] = value;
                }
            });

            // ── Step 3: deterministic simulation on modified inputs (always needed
            //    for finalBalance / depletionAge which the recommendation engine
            //    does not pre-compute) ────────────────────────────────────────────
            updateProgress(20, 'Running What-If analysis...');
            let suggestedResult = null;
            try {
                suggestedResult = this.simulator.simulateRetirement(modifiedInputs, false);
            } catch (simErr) {
                console.warn('What-If simulation failed:', simErr);
            }

            // ── Step 4: Monte Carlo only when the recommendation engine has not
            //    already provided successRate + medianBalance ────────────────────
            let suggestedMC = null;
            const hasPrecomputedRates = suggestion.successRate != null && suggestion.medianBalance != null;
            if (!hasPrecomputedRates) {
                try {
                    updateProgress(50, 'Running Monte Carlo comparison...');
                    suggestedMC = await this.simulator.runMonteCarloSimulation(modifiedInputs, 500);
                } catch (mcErr) {
                    console.warn('What-If MC failed:', mcErr);
                }
            }

            updateProgress(80, 'Building comparison...');

            // ── Step 5: populate the What-If Scenario Comparison section ──────
            const enrichedSuggestion = {
                ...suggestion,
                successRate: suggestion.successRate ?? suggestedMC?.successRate,
                medianBalance: suggestion.medianBalance ?? suggestedMC?.median,
                finalBalance: suggestedResult?.finalBalance,
                depletionAge: suggestedResult?.depletionAge,
            };
            this.populateWhatIfComparison(enrichedSuggestion, suggestionName, baseline, baselineInputs);

            updateProgress(100, 'What-If analysis complete!');
            setTimeout(() => updateProgress(0), 1000);

            // ── Step 6: apply modifications to the form ───────────────────────
            const applied = this.applyModificationsToForm(suggestion.modifications);

            if (applied > 0) {
                this.highlightModifiedFields(suggestion.modifications);
                this.showUndoButton();
                showNotification(`"${suggestionName}": What-If comparison ready below. ${applied} field(s) updated in the calculator.`, 'success');
            } else {
                showNotification(`"${suggestionName}": What-If comparison ready. No calculator fields were changed for this scenario.`, 'info');
            }

            // Scroll to the comparison section
            const whatIfDiv = $('whatIfComparison');
            if (whatIfDiv) {
                whatIfDiv.classList.remove('hidden');
                setTimeout(() => whatIfDiv.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
            }

        } catch (error) {
            console.error('Error in applySuggestion:', error);
            showNotification(`Error running What-If analysis: ${error.message}`, 'error');
            updateProgress(0);
        }
    }

    // Populate the What-If Scenario Comparison panel with before/after metrics
    populateWhatIfComparison(suggestion, suggestionName, baseline, baselineInputs) {
        const whatIfDiv = $('whatIfComparison');
        if (!whatIfDiv) return;

        whatIfDiv.classList.remove('hidden');

        const currentDiv = $('currentPlanMetrics');
        const suggestedDiv = $('suggestedPlanMetrics');
        const improvementDiv = $('improvementMetrics');

        // Gather baseline numbers — prefer live currentResults, fall back to suggestion diffs
        const baseFinalBalance = baseline?.finalBalance ?? 0;
        const baseDepletionAge = baseline?.depletionAge ?? null;
        const baseMC = this.currentMonteCarloResults || null;
        const baseSuccessRate = baseMC?.successRate ?? null;
        const baseMedianBalance = baseMC?.median ?? baseline?.totalFinancialAssets ?? null;

        // Suggested numbers
        const sugSuccessRate = suggestion.successRate ?? null;
        const sugMedianBalance = suggestion.medianBalance ?? suggestion.finalBalance ?? null;
        const sugDepletionAge = suggestion.depletionAge ?? null;

        // Helper to format a nullable number
        const fmtRate = v => (v !== null && v !== undefined) ? `${(v * 100).toFixed(1)}%` : '—';
        const fmtCurr = v => (v !== null && v !== undefined) ? formatCurrency(v) : '—';
        const fmtAge = v => (v !== null && v !== undefined) ? `Age ${v}` : 'Not depleted';
        const fmtDiff = (a, b, isCurr = false) => {
            if (a === null || a === undefined || b === null || b === undefined) return '';
            const diff = a - b;
            const pos = diff >= 0;
            const sign = pos ? '+' : '';
            const val = isCurr ? `${sign}${formatCurrency(Math.abs(diff))}${pos ? '' : ' less'}` : `${sign}${(diff * 100).toFixed(1)}pp`;
            return `<span class="text-xs font-medium ${pos ? 'text-green-600' : 'text-red-500'}">${val}</span>`;
        };

        // Compute overall improvement indicator
        const successImprove = (sugSuccessRate !== null && baseSuccessRate !== null) ? sugSuccessRate - baseSuccessRate : null;
        const balanceImprove = (sugMedianBalance !== null && baseMedianBalance !== null) ? sugMedianBalance - baseMedianBalance : null;
        const overallPositive = (successImprove ?? 0) >= 0 && (balanceImprove ?? 0) >= 0;
        const overallNeutral = successImprove === null && balanceImprove === null;

        if (currentDiv) {
            currentDiv.innerHTML = `
                <div class="space-y-3 text-sm">
                    ${baseSuccessRate !== null ? `
                    <div class="p-3 bg-blue-50 rounded-lg">
                        <div class="text-xs text-gray-500 mb-1">Success Rate</div>
                        <div class="text-xl font-bold text-blue-700">${fmtRate(baseSuccessRate)}</div>
                    </div>` : ''}
                    ${baseMedianBalance !== null ? `
                    <div class="p-3 bg-gray-50 rounded-lg">
                        <div class="text-xs text-gray-500 mb-1">Median Portfolio Balance</div>
                        <div class="text-lg font-bold text-gray-800">${fmtCurr(baseMedianBalance)}</div>
                    </div>` : ''}
                    ${baseFinalBalance ? `
                    <div class="p-3 bg-gray-50 rounded-lg">
                        <div class="text-xs text-gray-500 mb-1">Projected Final Balance</div>
                        <div class="text-lg font-bold text-gray-700">${fmtCurr(baseFinalBalance)}</div>
                    </div>` : ''}
                    ${baseDepletionAge !== null ? `
                    <div class="p-3 bg-red-50 rounded-lg">
                        <div class="text-xs text-gray-500 mb-1">Fund Depletion</div>
                        <div class="text-base font-bold text-red-700">${fmtAge(baseDepletionAge)}</div>
                    </div>` : ''}
                </div>`;
        }

        if (suggestedDiv) {
            suggestedDiv.innerHTML = `
                <div class="space-y-3 text-sm">
                    <div class="mb-2">
                        <span class="text-xs font-semibold px-2 py-1 rounded-full bg-indigo-100 text-indigo-700">${suggestionName}</span>
                    </div>
                    ${sugSuccessRate !== null ? `
                    <div class="p-3 bg-blue-50 rounded-lg">
                        <div class="text-xs text-gray-500 mb-1">Success Rate</div>
                        <div class="text-xl font-bold text-indigo-700">${fmtRate(sugSuccessRate)}</div>
                        ${fmtDiff(sugSuccessRate, baseSuccessRate)}
                    </div>` : ''}
                    ${sugMedianBalance !== null ? `
                    <div class="p-3 bg-indigo-50 rounded-lg">
                        <div class="text-xs text-gray-500 mb-1">Median Portfolio Balance</div>
                        <div class="text-lg font-bold text-indigo-800">${fmtCurr(sugMedianBalance)}</div>
                        ${fmtDiff(sugMedianBalance, baseMedianBalance, true)}
                    </div>` : ''}
                    ${suggestion.finalBalance ? `
                    <div class="p-3 bg-indigo-50 rounded-lg">
                        <div class="text-xs text-gray-500 mb-1">Projected Final Balance</div>
                        <div class="text-lg font-bold text-indigo-700">${fmtCurr(suggestion.finalBalance)}</div>
                    </div>` : ''}
                    ${sugDepletionAge !== null ? `
                    <div class="p-3 bg-orange-50 rounded-lg">
                        <div class="text-xs text-gray-500 mb-1">Fund Depletion</div>
                        <div class="text-base font-bold text-orange-700">${fmtAge(sugDepletionAge)}</div>
                    </div>` : (suggestion.depletionAge === null && suggestion.finalBalance > 0) ? `
                    <div class="p-3 bg-green-50 rounded-lg">
                        <div class="text-xs text-gray-500 mb-1">Fund Depletion</div>
                        <div class="text-base font-bold text-green-700">Not depleted</div>
                    </div>` : ''}
                </div>`;
        }

        if (improvementDiv) {
            const keyChanges = suggestion.factorsChanged || [];
            improvementDiv.innerHTML = `
                <div class="space-y-3 text-sm">
                    <div class="p-3 rounded-lg ${overallNeutral ? 'bg-gray-50' : overallPositive ? 'bg-green-50' : 'bg-yellow-50'}">
                        <div class="text-base font-bold ${overallNeutral ? 'text-gray-700' : overallPositive ? 'text-green-700' : 'text-yellow-700'} mb-1">
                            ${overallNeutral ? '📊 Informational' : overallPositive ? '✅ Improvement' : '⚠️ Trade-off'}
                        </div>
                        ${successImprove !== null ? `
                        <div class="text-xs text-gray-600">Success rate: <strong class="${successImprove >= 0 ? 'text-green-700' : 'text-red-600'}">${successImprove >= 0 ? '+' : ''}${(successImprove * 100).toFixed(1)} pp</strong></div>
                        ` : ''}
                        ${balanceImprove !== null ? `
                        <div class="text-xs text-gray-600">Median balance: <strong class="${balanceImprove >= 0 ? 'text-green-700' : 'text-red-600'}">${balanceImprove >= 0 ? '+' : ''}${formatCurrency(balanceImprove)}</strong></div>
                        ` : ''}
                    </div>
                    ${keyChanges.length > 0 ? `
                    <div class="p-3 bg-gray-50 rounded-lg">
                        <div class="text-xs font-semibold text-gray-600 mb-2">Key Changes</div>
                        <ul class="space-y-1">
                            ${keyChanges.slice(0, 4).map(c => `<li class="text-xs text-gray-700">• ${c}</li>`).join('')}
                        </ul>
                    </div>` : ''}
                    ${suggestion.feasibility ? `
                    <div class="text-xs text-gray-500 italic">${suggestion.feasibility}</div>
                    ` : ''}
                </div>`;
        }

        // Update the What-If section heading to show which suggestion is active
        const heading = $('whatIfComparisonHeading') || whatIfDiv.querySelector('h3');
        if (heading) {
            heading.textContent = `📊 What-If Scenario Comparison — ${suggestionName}`;
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
            'useDetailedExpenseInputs': 'useDetailedExpenseInputs',
            'currentMonthlyHousingCosts': 'currentMonthlyHousingCosts',
            'currentMonthlyLivingCosts': 'currentMonthlyLivingCosts',
            'percentIncomeSaved': 'percentIncomeSaved',
            'salaryGrowthRate': 'salaryGrowthRate',
            'additionalSuperContributions': 'additionalSuperContributions',
            'employerSuperContributionRate': 'employerSuperContributionRate',

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
            'investmentPropertyPurchasePrice': 'investmentPropertyPurchasePrice',
            'investmentPropertyPurchaseYear': 'investmentPropertyPurchaseYear',
            'weeklyRentalIncome': 'weeklyRentalIncome',
            'annualPropertyExpenses': 'annualPropertyExpenses',
            'propertyGrowthRate': 'propertyGrowthRate',
            'sellPropertyYears': 'sellPropertyYears',
            'capitalGainsTaxRate': 'capitalGainsTaxRate',
            'carLoanRate': 'carLoanRate',

            // Investment fields
            'australianEquityAllocation': 'australianEquityAllocation',
            'frankingRate': 'frankingRate',
            'allocEquities': 'allocEquities',
            'allocBonds': 'allocBonds',
            'allocCash': 'allocCash',
            'useGlidePath': 'useGlidePath',

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

    setupVersionSelector() {
        const selector = $('version-selector');
        if (!selector) return;

        const versions = versionManager.getAvailableVersions();
        selector.innerHTML = versions.map(v => `<option value="${v}">Version ${v}</option>`).join('');
        selector.value = this.currentVersion;

        selector.addEventListener('change', (e) => {
            this.handleVersionChange(e.target.value);
        });
    }

    setupCalculationModal() {
        const modal = $('calculation-modal');
        const closeModal = $('close-modal');
        const modalTitle = $('modal-title');
        const modalContent = $('modal-content');

        if (!modal || !closeModal || !modalTitle || !modalContent) return;

        const showModal = (title, content) => {
            modalTitle.textContent = title;
            modalContent.innerHTML = content;
            modal.classList.remove('hidden');
        };

        const hideModal = () => {
            modal.classList.add('hidden');
        };

        closeModal.addEventListener('click', hideModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                hideModal();
            }
        });

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('show-calc-link')) {
                e.preventDefault();
                const calcId = e.target.dataset.calcId;
                const details = this.getCalculationDetails(calcId);
                showModal(details.title, details.content);
            }
        });
    }

    getCalculationDetails(calcId) {
        const inputs = this.collectInputs();
        const result = this.currentResults;
        let title = '';
        let content = '';

        if (!result) {
            return {
                title: 'Error',
                content: '<p>Please run a calculation first to see the details.</p>'
            };
        }

        switch (calcId) {
            case 'yearsToRetirement':
                title = 'Years to Retirement';
                content = `
                    <p><strong>Formula:</strong> Retirement Age - Your Current Age</p>
                    <p><strong>Values:</strong> ${inputs.retirementAge} - ${inputs.yourCurrentAge} = <strong>${result.yearlyData[0].year - new Date().getFullYear()} years</strong></p>
                `;
                break;
            case 'accumulatedSuperBalance':
                title = 'Future Superannuation';
                content = `
                    <p>This is a year-by-year projection. The value shown is the sum of your and your partner's superannuation balances at retirement age.</p>
                    <p><strong>Final Value:</strong> ${formatCurrency(result.accumulatedSuperBalance)}</p>
                `;
                break;
            case 'accumulatedSavingsBalance':
                title = 'Future Savings';
                content = `
                    <p>This is a year-by-year projection of your cash savings, including interest earned and any additional savings from your income.</p>
                    <p><strong>Final Value:</strong> ${formatCurrency(result.accumulatedSavingsBalance)}</p>
                `;
                break;
            case 'accumulatedInvestmentPortfolio':
                title = 'Future Investments';
                content = `
                    <p>This is a year-by-year projection of your stock portfolio, including investment returns and monthly contributions.</p>
                    <p><strong>Final Value:</strong> ${formatCurrency(result.accumulatedInvestmentPortfolio)}</p>
                `;
                break;
            case 'accessibleHomeEquity':
                title = 'Accessible Home Equity';
                content = `
                    <p><strong>Formula:</strong> (Home Value at Retirement - Mortgage at Retirement) * Home Equity Access Rate</p>
                    <p><strong>Values:</strong> (${formatCurrency(result.homeEquity, 0)} - ${formatCurrency(result.mortgageBalanceAtRetirement, 0)}) * ${formatPercent(this.config.HOME_EQUITY_ACCESS_RATE)} = <strong>${formatCurrency(result.accessibleHomeEquity)}</strong></p>
                `;
                break;
            case 'propertyEquity':
                title = 'Investment Property Equity';
                content = `
                    <p><strong>Formula:</strong> Property Value at Retirement - Remaining Loan Balance</p>
                    <p><strong>Values:</strong> ${formatCurrency(result.propertyEquity + result.investmentPropertyLoanAtRetirement, 0)} - ${formatCurrency(result.investmentPropertyLoanAtRetirement, 0)} = <strong>${formatCurrency(result.propertyEquity)}</strong></p>
                `;
                break;
            case 'totalAssets':
                title = 'Total Assets at Retirement';
                content = `
                    <p><strong>Formula:</strong> Future Super + Future Savings + Future Investments + Accessible Home Equity</p>
                    <p><strong>Values:</strong> ${formatCurrency(result.accumulatedSuperBalance)} + ${formatCurrency(result.accumulatedSavingsBalance)} + ${formatCurrency(result.accumulatedInvestmentPortfolio)} + ${formatCurrency(result.accessibleHomeEquity)} = <strong>${formatCurrency(result.totalFinancialAssets + result.accessibleHomeEquity)}</strong></p>
                `;
                break;
            case 'incomeNeeded':
                title = 'Income Needed (ASFA Comfortable Standard)';
                content = `
                    <p><strong>Formula:</strong> ASFA Comfortable Standard * (1 + Inflation Rate)^Years to Retirement</p>
                    <p><strong>Values:</strong> ${formatCurrency(inputs.asfaComfortable)} * (1 + ${formatPercent(inputs.inflation, 4)})^${result.yearlyData[0].year - new Date().getFullYear()} = <strong>${formatCurrency(inputs.asfaComfortable * Math.pow(1 + inputs.inflation, result.yearlyData[0].year - new Date().getFullYear()))}</strong></p>
                `;
                break;
            case 'agedCareCosts':
                title = 'Expected Aged Care Costs';
                content = `
                    <p><strong>Formula:</strong> (Annual Aged Care Cost * Duration) * Probability</p>
                    <p><strong>Values:</strong> (${formatCurrency(result.agedCareCosts.annualCost)} * ${inputs.agedCareDuration} years) * ${formatPercent(result.agedCareCosts.probability)} = <strong>${formatCurrency(result.agedCareCosts.expectedCost)}</strong></p>
                `;
                break;
            default:
                title = 'Calculation Details';
                content = '<p>Details for this calculation are not yet available.</p>';
                break;
        }

        return { title, content };
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
            await new Promise(resolve => setTimeout(resolve, 800)); // Brief processing pause

            // Pass simulation results so scenarios can show portfolio-based retirement runway
            const simResults = this.currentResults || null;
            const scenarios = this.generateOverseasScenariosData(overseasConfig, baseInputs, simResults);

            // Build country analysis using OverseasRetirementAnalyzer for charting
            const analyzer = this._buildOverseasAnalyzer(overseasConfig, baseInputs);
            const chartData = this.buildOverseasChartData(overseasConfig, baseInputs, analyzer, simResults);

            // Update status banner with real data
            this.updateOverseasStatus(overseasConfig, baseInputs, analyzer);

            // Display scenarios (includes portfolio runway table)
            this.displayOverseasScenarios(scenarios, chartData, simResults);

            // Persist for export
            this.currentOverseasData = { scenarios, chartData, config: overseasConfig };

            // Render overview charts in the chart section (lazy-load chart manager)
            const chartManager = await this.getChartManager();
            if (chartManager) {
                chartManager.renderOverseasCostComparison(chartData.costComparison);
                chartManager.renderOverseasPensionPortability(chartData.portability);
                chartManager.renderOverseasSuitabilityRadar(chartData.suitabilityRadar);
            }

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

    /**
     * Build structured data for overseas charts.
     * Compares the selected country against a set of reference destinations.
     */
    buildOverseasChartData(config, baseInputs, analyzer, simResults = null) {
        // Selected country + major comparison destinations
        const defaultComparisons = ['thailand', 'portugal', 'vietnam', 'india', 'japan', 'italy', 'malaysia', 'bali', 'newzealand', 'usa'];
        const selectedKey = config.country;
        const compareKeys = [selectedKey, ...defaultComparisons.filter(k => k !== selectedKey)].slice(0, 8);

        // Retirement portfolio from simulation results
        const totalPortfolio = simResults ? (simResults.totalFinancialAssets || 0) : 0;
        const asfaBase = baseInputs.asfaComfortable || 73000;

        const costComparison = [];
        const portability = [];
        const suitabilityRadar = [];

        for (const key of compareKeys) {
            const profileKey = OVERSEAS_COUNTRY_PROFILE_KEY_MAP[key];
            if (!profileKey || !COUNTRY_PROFILES[profileKey]) continue;

            const profile = COUNTRY_PROFILES[profileKey];
            const countryAnalysis = analyzer.analyzeCountry(profileKey);
            if (!countryAnalysis || countryAnalysis.error) continue;

            const pension = countryAnalysis.agePensionPortability.pensionCalculation;
            const cost = countryAnalysis.costOfLiving;

            // Per-country retirement runway using actual simulation results
            const annualCostInCountry = cost.countryAnnual || (asfaBase * profile.costOfLiving.index);
            const portablePension = pension.overseas || 0;
            const annualNetDraw = Math.max(1, annualCostInCountry - portablePension);
            const yearsLasts = totalPortfolio > 0 ? Math.round(totalPortfolio / annualNetDraw) : null;

            costComparison.push({
                name: profile.name,
                flag: profile.flag || '',
                annualCostAUD: annualCostInCountry,
                pensionAUD: pension.overseas,
                hasSocialSecurityAgreement: profile.socialSecurityAgreement,
                yearsLasts,
                annualNetDraw,
                costIndex: profile.costOfLiving.index,
                visaEase: profile.visa?.easeOfAccess || 'MODERATE',
                isSelected: key === selectedKey
            });

            portability.push({
                name: profile.name,
                inAustralia: pension.inAustralia,
                overseas: pension.overseas,
                hasSocialSecurityAgreement: profile.socialSecurityAgreement,
                awlrPct: countryAnalysis.agePensionPortability.AWLRPercentage
            });

            // Suitability radar scores (0-10)
            const costScore = Math.round((1 - profile.costOfLiving.index) * 10);
            const healthcareScore = Math.round(profile.healthcare.rating);
            const visaScore = profile.visa.easeOfAccess === 'EASY' ? 9 : profile.visa.easeOfAccess === 'MODERATE' ? 6 : 3;
            const distanceScore = profile.distanceFromAustralia < 4000 ? 9 : profile.distanceFromAustralia < 8000 ? 7 : profile.distanceFromAustralia < 12000 ? 5 : 3;
            const taxScore = profile.socialSecurityAgreement ? (profile.tax?.nhrScheme ? 10 : 8) : (profile.tax?.doubleTaxAgreement ? 6 : 3);
            const riskToSafety = { 'VERY LOW': 10, 'LOW': 8, 'LOW-MEDIUM': 7, 'MEDIUM': 5, 'MEDIUM-HIGH': 4, 'HIGH': 2 };
            const safetyScore = riskToSafety[profile.risks?.overall] || 5;

            suitabilityRadar.push({
                name: profile.name,
                costScore, healthcareScore, visaScore, distanceScore, taxScore, safetyScore
            });
        }

        return { costComparison, portability, suitabilityRadar };
    }

    // Collect overseas configuration from form inputs
    collectOverseasConfig() {
        const residenceYearsRaw = getRawValue('australianResidenceYears', '');
        const countryVal = safeGetSelectValue('overseasCountry', '');
        const profileKey = OVERSEAS_COUNTRY_PROFILE_KEY_MAP[countryVal];
        return {
            country: countryVal,
            destinationCountry: profileKey ? (COUNTRY_PROFILES[profileKey]?.name || countryVal) : countryVal,
            departureAge: parseInt(safeGetValue('overseasAge', 65)),
            returnFrequency: safeGetSelectValue('returnFrequency', 'annually'),
            maintainResidency: safeGetChecked('maintainResidency', false),
            propertyStrategy: safeGetSelectValue('propertyStrategy', 'keep-personal'),
            trustBeneficiaries: safeGetSelectValue('trustBeneficiaries', 'you-only'),
            superAccess: safeGetSelectValue('superAccess', 'pension-mode'),
            estimatedLivingCosts: parseFloat(safeGetValue('estimatedLivingCosts', 60000)),
            australianResidenceYears: (() => {
                if (residenceYearsRaw === '') return null;
                const parsed = parseInt(residenceYearsRaw, 10);
                return isNaN(parsed) ? null : parsed;
            })(),
            // FX / currency
            spendingCurrency: safeGetSelectValue('overseasSpendingCurrency', 'AUD'),
            audFxChangePerYear: safeGetValue('overseasAudFxChange', -1) / 100,
            // Local housing
            housingType: safeGetSelectValue('overseasHousingType', 'rent'),
            annualRentAUD: safeGetValue('overseasAnnualRent', 12000),
            // Return-to-Australia fallback
            fallbackAge: parseInt(safeGetValue('overseasFallbackAge', 0)) || 0,
            fallbackTrigger: safeGetSelectValue('overseasFallbackTrigger', 'none')
        };
    }

    // Generate overseas scenarios data based on configuration
    generateOverseasScenariosData(config, baseInputs, simResults = null) {
        const scenarios = [];
        const currentAge = baseInputs.yourCurrentAge;
        const retirementAge = baseInputs.retirementAge;
        const analyzer = this._buildOverseasAnalyzer(config, baseInputs);
        const profileKey = OVERSEAS_COUNTRY_PROFILE_KEY_MAP[config.country];
        const countryAnalysis = profileKey ? analyzer.analyzeCountry(profileKey) : null;

        // Extract projected retirement portfolio from simulation results if available
        const retirementPortfolio = simResults ? {
            super: simResults.accumulatedSuperBalance || 0,
            savings: simResults.accumulatedSavingsBalance || 0,
            investments: simResults.accumulatedInvestmentPortfolio || 0,
            total: simResults.totalFinancialAssets || 0
        } : null;

        // Country-specific data
        const countryData = this.getCountryData(config.country);

        // Compute retirement runway for the selected country using actual simulation results
        let runwayData = null;
        if (retirementPortfolio && retirementPortfolio.total > 0) {
            const profileKey = OVERSEAS_COUNTRY_PROFILE_KEY_MAP[config.country];
            const profile = profileKey ? COUNTRY_PROFILES?.[profileKey] : null;
            const costIndex = profile?.costOfLiving?.index || countryData.costIndex || 0.6;
            const annualCostInCountry = countryAnalysis?.costOfLiving?.countryAnnual
                || countryAnalysis?.costOfLiving?.housingAdjustedAnnual
                || Math.round((baseInputs.asfaComfortable || 73000) * costIndex);
            // Use the shared overseas policy engine instead of a hard-coded portability shortcut.
            const portablePension = countryAnalysis?.agePensionPortability?.pensionCalculation?.overseas || 0;
            const annualNetDraw = Math.max(1, annualCostInCountry - portablePension);
            const yearsPortfolioLasts = retirementPortfolio.total / annualNetDraw;
            runwayData = {
                portfolio: retirementPortfolio.total,
                annualCost: annualCostInCountry,
                portablePension,
                annualNetDraw,
                yearsLasts: Math.round(yearsPortfolioLasts),
                costIndex
            };
        }

        // Scenario 1: Depart at retirement vs current plan
        scenarios.push({
            title: `Retire to ${countryData.displayName} at Age ${config.departureAge}`,
            description: `Move to ${countryData.displayName} at age ${config.departureAge} with ${config.returnFrequency.replace('_', ' ')} visits to Australia.`,
            impact: this.calculateOverseasImpact(config, baseInputs, 'retirement-departure'),
            agePensionStatus: this.calculateAgePensionImpact(config, baseInputs),
            taxImplications: this.calculateTaxImplications(config, baseInputs),
            riskLevel: config.maintainResidency ? 'MEDIUM' : 'HIGH',
            timeline: `${new Date().getFullYear() + (config.departureAge - currentAge)}`,
            runwayData,
            keyFactors: [
                retirementPortfolio
                    ? `Projected portfolio at retirement: $${Math.round(retirementPortfolio.total / 1000)}k`
                    : 'Run calculation first to see portfolio-based runway',
                runwayData
                    ? `Annual cost in ${countryData.displayName}: $${Math.round(runwayData.annualCost / 1000)}k/yr (${Math.round(countryData.costIndex * 100)}% of AU costs)`
                    : `Estimated living costs: $${config.estimatedLivingCosts.toLocaleString()}/year`,
                runwayData
                    ? `Retirement runway: ~${runwayData.yearsLasts} years from portfolio alone`
                    : `Age pension: ${this.calculateAgePensionImpact(config, baseInputs)}`,
                `Tax residency: ${config.maintainResidency ? 'Australian' : countryData.displayName}`,
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

    // Get country-specific data from COUNTRY_PROFILES, falling back to a simple map
    getCountryData(country) {
        const profileKey = OVERSEAS_COUNTRY_PROFILE_KEY_MAP[country];
        if (profileKey) {
            const profile = COUNTRY_PROFILES?.[profileKey];
            if (profile) {
                return {
                    displayName: profile.name,
                    healthcareNotes: profile.healthcare?.quality || 'Research local healthcare',
                    taxTreaty: profile.tax?.doubleTaxAgreement || false,
                    socialSecurityAgreement: profile.socialSecurityAgreement || false,
                    costIndex: profile.costOfLiving?.index || 0.6,
                    healthcareRating: profile.healthcare?.rating || 7,
                    visaEase: profile.visa?.easeOfAccess || 'MODERATE',
                    distanceKm: profile.distanceFromAustralia || 10000,
                    risks: profile.risks || { overall: 'MEDIUM' },
                    bestFor: profile.bestFor || [],
                    challenges: profile.challenges || [],
                    nhrScheme: profile.tax?.nhrScheme || null,
                    currency: profile.currency || 'USD',
                    flightTime: profile.flightTime || 'N/A'
                };
            }
        }
        // Fallback for 'usa' and 'other'
        const fallbackMap = {
            'usa': { displayName: 'United States', healthcareNotes: 'Private insurance essential - very expensive', taxTreaty: true, socialSecurityAgreement: true, costIndex: 0.95, healthcareRating: 7, visaEase: 'HARD', distanceKm: 13000, risks: { overall: 'LOW' }, bestFor: ['Family connections', 'English-speaking'], challenges: ['Very expensive healthcare', 'Complex visa pathway', 'No retirement visa'] },
            'other': { displayName: 'Selected Country', healthcareNotes: 'Research local healthcare', taxTreaty: false, socialSecurityAgreement: false, costIndex: 0.6, healthcareRating: 7, visaEase: 'MODERATE', distanceKm: 10000, risks: { overall: 'MEDIUM' }, bestFor: [], challenges: [] }
        };
        return fallbackMap[country] || fallbackMap['other'];
    }

    // Build an OverseasRetirementAnalyzer instance from current form inputs
    _buildOverseasAnalyzer(config, baseInputs) {
        // Use explicitly provided residence years, or calculate from ageCameToAustralia, or estimate from current age
        const australianResidenceYears = config.australianResidenceYears !== null && config.australianResidenceYears !== undefined
            ? config.australianResidenceYears
            : (baseInputs.ageCameToAustralia > 0
                ? Math.max(0, (baseInputs.retirementAge || baseInputs.yourCurrentAge || 67) - baseInputs.ageCameToAustralia)
                : Math.max(0, (baseInputs.yourCurrentAge || 65) - 18));
        const personalDetails = {
            age: baseInputs.yourCurrentAge,
            retirementAge: baseInputs.retirementAge,
            departureAge: config.departureAge || baseInputs.retirementAge,
            australianResidenceYears,
            australianWorkingLifeYears: australianResidenceYears,
            ageCameToAustralia: baseInputs.ageCameToAustralia || 0,
            partnered: (baseInputs.partnerCurrentAge || 0) > 0,
            enableProposedBudget2026: baseInputs.enableProposedBudget2026 || false
        };
        const financialData = {
            superBalance: (baseInputs.yourCurrentSuper || 0) + (baseInputs.partnerCurrentSuper || 0),
            investmentBalance: (baseInputs.currentSavings || 0) + (baseInputs.currentStocks || 0),
            homeValue: baseInputs.homeValue || 0
        };
        return new OverseasRetirementAnalyzer(personalDetails, financialData);
    }

    // Calculate various impacts using real OverseasRetirementAnalyzer data where available
    calculateOverseasImpact(config, baseInputs, type) {
        // Calculate effective annual income in retirement
        const pensionAnalyzer = this._buildOverseasAnalyzer(config, baseInputs);
        const profileKey = OVERSEAS_COUNTRY_PROFILE_KEY_MAP[config.country];
        if (profileKey) {
            const analysis = pensionAnalyzer.analyzeCountry(profileKey);
            if (analysis && !analysis.error) {
                const pension = analysis.agePensionPortability?.pensionCalculation?.overseas || 0;
                const costOfLiving = analysis.costOfLiving?.countryAnnual || config.estimatedLivingCosts;
                const surplus = pension - costOfLiving;
                if (surplus > 10000) return 'VERY HIGH POSITIVE';
                if (surplus > 0) return 'POSITIVE';
                if (surplus > -15000) return 'NEUTRAL';
                return 'NEGATIVE';
            }
        }
        return config.estimatedLivingCosts < 60000 ? 'POSITIVE' : 'NEUTRAL';
    }

    calculateAgePensionImpact(config, baseInputs) {
        const analyzer = this._buildOverseasAnalyzer(config, baseInputs);
        const profileKey = OVERSEAS_COUNTRY_PROFILE_KEY_MAP[config.country];
        if (profileKey) {
            const profile = COUNTRY_PROFILES?.[profileKey];
            if (profile) {
                const portability = analyzer.calculatePensionPortability(profile);
                const overseas = portability.pensionCalculation.overseas;
                if (portability.hasAgreement && portability.fullPortability) {
                    return `Full rate (SSA country): ~$${overseas.toLocaleString()}/year`;
                }
                if (portability.fullPortability) {
                    return `Full rate after 26 weeks (35+ yrs AWLR): ~$${overseas.toLocaleString()}/year`;
                }
                const pct = portability.AWLRPercentage;
                return `Proportional rate (AWLR ${portability.AWLR} yrs = ${pct}%): ~$${overseas.toLocaleString()}/year`;
            }
        }
        if (config.returnFrequency === 'seasonal') return 'May maintain full rate (6 months in Australia)';
        if (config.returnFrequency === 'never') return 'AWLR-proportional rate after 26 weeks';
        return 'Portability rules apply after 26 weeks';
    }

    calculateTaxImplications(config, baseInputs) {
        const countryData = this.getCountryData(config.country);
        if (config.maintainResidency) return 'Australian tax resident: worldwide income taxed at Australian rates';
        if (countryData.socialSecurityAgreement) return `Non-resident: Australian-source income only (DTA with ${countryData.displayName})`;
        if (countryData.taxTreaty) return `Non-resident: Australian-source income + DTA relief available`;
        return 'Non-resident: 30% withholding tax on Australian dividends/rent';
    }

    calculatePropertyStrategyImpact(config, baseInputs) {
        if (config.propertyStrategy === 'sell-before') return 'POSITIVE';
        if (config.propertyStrategy === 'sell-after') return 'HIGH POSITIVE';
        if (config.propertyStrategy === 'transfer-trust') return 'COMPLEX';
        return 'NEUTRAL';
    }

    calculatePropertyTaxImpact(config, baseInputs) {
        const isResident = config.maintainResidency;
        if (config.propertyStrategy === 'sell-before') {
            return isResident ? 'CGT as Australian resident (50% discount if held >12 months)' : 'CGT as resident before non-residency - favourable';
        }
        if (config.propertyStrategy === 'sell-after') {
            return 'Non-resident CGT: 30% on full gain (no 50% discount after 8 May 2012 for non-residents)';
        }
        if (config.propertyStrategy === 'transfer-trust') {
            return 'Trust: CGT event on transfer + ongoing land tax and trust compliance costs';
        }
        return isResident ? 'Ongoing rental income taxed at Australian resident rates' : 'Rental income: 30% non-resident withholding tax';
    }

    calculateSuperStrategyImpact(config, baseInputs) {
        const totalSuper = (baseInputs.yourCurrentSuper || 0) + (baseInputs.partnerCurrentSuper || 0);
        const isAge60Plus = (baseInputs.yourCurrentAge || 65) >= 60;
        if (config.superAccess === 'pension-mode') {
            return totalSuper > 800000 ? 'HIGH POSITIVE' : 'POSITIVE';
        }
        if (config.superAccess === 'full-lump') {
            return isAge60Plus ? 'HIGH POSITIVE' : 'MODERATE';
        }
        return 'POSITIVE';
    }

    calculateSuperTaxImpact(config, baseInputs) {
        const age = baseInputs.yourCurrentAge || 65;
        if (age >= 60) {
            if (config.superAccess === 'pension-mode') return 'Tax-free pension payments from age 60 (Australian super)';
            if (config.superAccess === 'full-lump') return 'Tax-free lump sum from age 60 - use before changing tax residency';
            return 'Tax-free from age 60 regardless of residency';
        }
        return 'Preservation age not reached - access and tax rules apply';
    }

    calculateResidencyImpact(config, baseInputs) {
        const totalIncome = (baseInputs.yourSalary || 0) + (baseInputs.partnerSalary || 0);
        if (config.maintainResidency) return 'NEUTRAL';
        if (totalIncome === 0) return 'HIGH POSITIVE'; // Retired with no salary - non-residency is beneficial
        return 'POSITIVE';
    }

    calculateResidencyTaxImpact(config, baseInputs) {
        if (config.maintainResidency) {
            return 'Australian resident: worldwide income taxed. Use tax-free super withdrawals where possible.';
        }
        return 'Non-resident: only Australian-sourced income taxed. No tax-free threshold. 30% flat rate on investment income.';
    }

    calculateReturnFrequencyImpact(config, baseInputs) {
        const travelCost = {
            'annually': 5000,
            'biannually': 10000,
            'quarterly': 20000,
            'seasonal': 30000
        }[config.returnFrequency] || 5000;
        const annualIncome = config.estimatedLivingCosts;
        if (travelCost / annualIncome < 0.1) return 'NEUTRAL';
        if (travelCost / annualIncome < 0.2) return 'MODERATE COST';
        return 'NEGATIVE';
    }

    calculateReturnPensionImpact(frequency) {
        if (frequency === 'seasonal') return 'May qualify as temporary absence - full rate maintained';
        if (frequency === 'quarterly') return 'Likely overseas rate (AWLR-proportional) after 26 weeks cumulative';
        return 'AWLR-proportional overseas rate after 26 weeks';
    }

    calculateReturnTaxImpact(frequency) {
        if (frequency === 'seasonal') return 'May maintain Australian tax residency (6+ months in Australia)';
        if (frequency === 'quarterly') return 'Borderline - specialist advice needed';
        return 'Non-resident for tax likely - 30% withholding on Australian investment income';
    }

    getReturnTimeDescription(frequency) {
        const descriptions = {
            'annually': '3-4 weeks per year (~$5k travel)',
            'biannually': '6-8 weeks total per year (~$10k travel)',
            'quarterly': '3-4 months per year (~$20k travel)',
            'seasonal': '6 months each year - splits residency'
        };
        return descriptions[frequency] || 'Varies';
    }

    // Update overseas status banner with real pension and tax data
    updateOverseasStatus(config, baseInputs, analyzer) {
        const pensionStatus = $('overseasPensionStatus');
        const taxStatus = $('overseasTaxStatus');
        const assetStatus = $('overseasAssetStatus');

        if (pensionStatus) {
            pensionStatus.textContent = this.calculateAgePensionImpact(config, baseInputs);
        }
        if (taxStatus) {
            const countryData = this.getCountryData(config.country);
            if (config.maintainResidency) {
                taxStatus.textContent = 'Australian tax resident: worldwide income taxed';
            } else {
                const saaNote = countryData.socialSecurityAgreement ? ' (SSA country)' : '';
                taxStatus.textContent = `Non-resident for tax: Australian-source income only${saaNote}`;
            }
        }
        if (assetStatus) {
            const strategyText = {
                'keep-personal': 'Personal ownership',
                'transfer-trust': 'Family trust structure',
                'sell-before': 'Sell before departure',
                'sell-after': 'Sell after residency change'
            };
            assetStatus.textContent = strategyText[config.propertyStrategy] || 'Personal ownership';
        }
    }

    // Display overseas scenarios in the UI
    displayOverseasScenarios(scenarios, chartData, simResults = null) {
        const container = $('overseasScenariosResults');
        if (!container) return;

        // Render portfolio runway comparison table if we have simulation results
        let runwayTableId = 'overseasRunwayTable';
        let existing = document.getElementById(runwayTableId);
        if (existing) existing.remove();

        const totalPortfolio = simResults ? (simResults.totalFinancialAssets || 0) : 0;
        const costRows = chartData?.costComparison || [];

        if (totalPortfolio > 0 && costRows.length > 0) {
            const sorted = [...costRows].sort((a, b) => (b.yearsLasts || 0) - (a.yearsLasts || 0));
            const runwayDiv = document.createElement('div');
            runwayDiv.id = runwayTableId;
            runwayDiv.className = 'mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-5';
            runwayDiv.innerHTML = `
                <div class="flex items-center gap-3 mb-4">
                    <div class="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white text-lg">🌍</div>
                    <div>
                        <h3 class="text-base font-bold text-gray-900">Your Portfolio Retirement Runway by Country</h3>
                        <p class="text-xs text-gray-600">Based on projected retirement portfolio of <strong>$${Math.round(totalPortfolio / 1000).toLocaleString()}k</strong> — how many years it funds retirement in each country</p>
                    </div>
                </div>
                <div class="overflow-x-auto">
                    <table class="w-full text-xs border-collapse">
                        <thead>
                            <tr class="bg-blue-100 text-blue-900">
                                <th class="text-left py-2 px-3 rounded-tl-lg font-semibold">Country</th>
                                <th class="text-right py-2 px-3 font-semibold">Annual Cost</th>
                                <th class="text-right py-2 px-3 font-semibold">Pension (Overseas)</th>
                                <th class="text-right py-2 px-3 font-semibold">Net Annual Draw</th>
                                <th class="text-right py-2 px-3 font-semibold">Cost vs AU</th>
                                <th class="text-center py-2 px-3 font-semibold">Visa</th>
                                <th class="text-center py-2 px-3 rounded-tr-lg font-semibold">Years Runway</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sorted.map((row, i) => {
                                const runwayColor = !row.yearsLasts ? 'text-gray-400'
                                    : row.yearsLasts >= 35 ? 'text-green-700 font-bold'
                                    : row.yearsLasts >= 25 ? 'text-blue-700 font-semibold'
                                    : row.yearsLasts >= 15 ? 'text-yellow-700'
                                    : 'text-red-600';
                                const runwayBar = row.yearsLasts ? Math.min(100, Math.round(row.yearsLasts / 40 * 100)) : 0;
                                const visaBadge = row.visaEase === 'EASY' ? 'bg-green-100 text-green-700'
                                    : row.visaEase === 'MODERATE' ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-red-100 text-red-700';
                                const rowBg = row.isSelected ? 'bg-blue-50 border-l-2 border-blue-400' : (i % 2 === 0 ? 'bg-white' : 'bg-gray-50');
                                return `<tr class="${rowBg} hover:bg-blue-50 transition-colors">
                                    <td class="py-2 px-3 font-medium text-gray-900">${row.isSelected ? '★ ' : ''}${row.name}</td>
                                    <td class="py-2 px-3 text-right text-gray-700">$${Math.round(row.annualCostAUD / 1000)}k</td>
                                    <td class="py-2 px-3 text-right text-gray-600">$${Math.round((row.pensionAUD || 0) / 1000)}k</td>
                                    <td class="py-2 px-3 text-right text-gray-700">$${Math.round((row.annualNetDraw || 0) / 1000)}k</td>
                                    <td class="py-2 px-3 text-right">
                                        <span class="px-1.5 py-0.5 rounded text-xs ${row.costIndex <= 0.5 ? 'bg-green-100 text-green-700' : row.costIndex <= 0.8 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}">${Math.round(row.costIndex * 100)}%</span>
                                    </td>
                                    <td class="py-2 px-3 text-center">
                                        <span class="px-1.5 py-0.5 rounded text-xs ${visaBadge}">${row.visaEase || '?'}</span>
                                    </td>
                                    <td class="py-2 px-3 text-center">
                                        ${row.yearsLasts ? `<div class="flex items-center gap-1.5 justify-end">
                                            <div class="flex-1 bg-gray-200 rounded-full h-1.5 max-w-16">
                                                <div class="h-1.5 rounded-full ${row.yearsLasts >= 35 ? 'bg-green-500' : row.yearsLasts >= 25 ? 'bg-blue-500' : row.yearsLasts >= 15 ? 'bg-yellow-500' : 'bg-red-500'}" style="width:${runwayBar}%"></div>
                                            </div>
                                            <span class="${runwayColor}">${row.yearsLasts}y</span>
                                        </div>` : '<span class="text-gray-400">—</span>'}
                                    </td>
                                </tr>`;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
                <p class="text-xs text-gray-500 mt-3">★ = your selected destination. Runway = portfolio ÷ (annual cost − overseas pension). Assumes constant draw; actual returns may extend runway. Seek financial advice for personalised planning.</p>
            `;
            container.insertBefore(runwayDiv, container.firstChild);
        } else if (totalPortfolio === 0) {
            // Prompt to run calculation first
            const promptDiv = document.createElement('div');
            promptDiv.id = runwayTableId;
            promptDiv.className = 'mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3';
            promptDiv.innerHTML = `
                <span class="text-2xl">💡</span>
                <div>
                    <p class="text-sm font-semibold text-amber-900">Run the main retirement calculation first</p>
                    <p class="text-xs text-amber-700">Your projected retirement portfolio will appear here showing how many years it funds retirement in each country.</p>
                </div>`;
            container.insertBefore(promptDiv, container.firstChild);
        }

        const grid = container.querySelector('.grid');
        if (!grid) return;

        grid.innerHTML = scenarios.map(scenario => {
            const impactClass = (scenario.impact === 'POSITIVE' || scenario.impact === 'HIGH POSITIVE' || scenario.impact === 'VERY HIGH POSITIVE')
                ? 'bg-green-100 text-green-800'
                : scenario.impact === 'NEGATIVE' ? 'bg-red-100 text-red-800'
                : 'bg-gray-100 text-gray-800';

            const riskClass = scenario.riskLevel === 'LOW' ? 'bg-green-100 text-green-800'
                : scenario.riskLevel === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800'
                : 'bg-red-100 text-red-800';

            return `
            <div class="bg-white border border-gray-200 rounded-lg p-5 shadow-sm hover:shadow-md transition-shadow">
                <div class="flex justify-between items-start mb-3">
                    <h4 class="font-semibold text-gray-900 text-sm leading-tight mr-2">${scenario.title}</h4>
                    <span class="px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${riskClass}">
                        Risk: ${scenario.riskLevel}
                    </span>
                </div>

                <p class="text-xs text-gray-600 mb-3">${scenario.description}</p>

                <div class="space-y-2 mb-3">
                    <div class="flex items-center gap-2 flex-wrap">
                        <span class="text-xs font-medium text-gray-600">Impact:</span>
                        <span class="text-xs px-2 py-0.5 rounded font-medium ${impactClass}">${scenario.impact}</span>
                    </div>

                    <div class="text-xs text-gray-700">
                        <span class="font-medium">🏦 Age Pension:</span>
                        <span class="text-gray-600 ml-1">${scenario.agePensionStatus}</span>
                    </div>

                    <div class="text-xs text-gray-700">
                        <span class="font-medium">💰 Tax:</span>
                        <span class="text-gray-600 ml-1">${scenario.taxImplications}</span>
                    </div>

                    <div class="text-xs text-gray-700">
                        <span class="font-medium">📅 Timeline:</span>
                        <span class="px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded ml-1">${scenario.timeline}</span>
                    </div>
                </div>

                <div class="border-t pt-3">
                    <span class="text-xs font-medium text-gray-700 mb-1 block">Key Factors:</span>
                    <ul class="text-xs text-gray-600 space-y-1">
                        ${scenario.keyFactors.map(factor => `<li class="flex gap-1"><span class="text-gray-400 shrink-0">•</span><span>${factor}</span></li>`).join('')}
                    </ul>
                </div>
            </div>`;
        }).join('');

        // Inject chart canvases after the scenario cards if not already present
        const chartsSection = $('overseasChartsSection');
        if (!chartsSection && chartData) {
            const chartDiv = document.createElement('div');
            chartDiv.id = 'overseasChartsSection';
            chartDiv.className = 'mt-6';
            chartDiv.innerHTML = `
                <h3 class="text-lg font-semibold text-gray-800 mb-4">📊 Country Comparison Charts</h3>
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <div class="bg-white border rounded-lg p-4">
                        <canvas id="overseasCostChart" height="220"></canvas>
                    </div>
                    <div class="bg-white border rounded-lg p-4">
                        <canvas id="overseasPensionChart" height="220"></canvas>
                    </div>
                </div>
                <div class="bg-white border rounded-lg p-4 max-w-lg mx-auto">
                    <canvas id="overseasRadarChart" height="350"></canvas>
                </div>
            `;
            container.appendChild(chartDiv);
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
            const inputs = profiler.measure('advanced-classic.input.collectInputs.monteCarlo', () => this.collectInputs());
            const runs = inputs.numRuns;

            const progressCallback = async (completed, total) => {
                const percentage = (completed / total) * 100;
                updateProgress(percentage, `Running simulation... ${completed}/${total}`);
                await new Promise(resolve => setTimeout(resolve, 0));
            };

            // Use enhanced Monte Carlo simulation for better accuracy (if enabled)
            const useEnhancedMonteCarlo = inputs.useEnhancedMonteCarlo !== false; // Default to true
            const results = useEnhancedMonteCarlo ?
                await profiler.asyncMeasure('advanced-classic.core.enhancedMonteCarloSimulation', () => this.simulator.runEnhancedMonteCarloSimulation(inputs, runs, progressCallback), { runs }) :
                await profiler.asyncMeasure('advanced-classic.core.monteCarloSimulation', () => this.simulator.runMonteCarloSimulation(inputs, runs, progressCallback), { runs });

            // Store results for Risk Analysis tab
            this.currentMonteCarloResults = results;

            // Update Monte Carlo results display
            const mcResults = $('monteCarloResults');
            if (mcResults) {
                profiler.measure('advanced-classic.post.render.monteCarloStats', () => {
                mcResults.classList.remove('hidden');
                safeSetText('mcRuns', runs.toLocaleString());
                safeSetText('mcSuccessRate', formatPercent(results.successRate));
                safeSetText('mcMedian', formatCurrency(results.median));
                safeSetText('mc10th', formatCurrency(results.percentile10));
                safeSetText('mcConfidence', `${(results.successRate * 100).toFixed(0)}%`);
                // Update SVG confidence gauge
                if (typeof window.updateConfidenceGauge === 'function') {
                    window.updateConfidenceGauge(results.successRate * 100);
                }

                // Display enhanced Monte Carlo metrics if available
                if (results.regimeAnalysis) {
                    this.displayEnhancedMonteCarloResults(results);
                }
                });
            }

            // Add narrative explanation
            const narrativeContainer = $('monteCarloNarrative');
            if (narrativeContainer) {
                profiler.measure('advanced-classic.post.render.monteCarloNarrative', () => {
                narrativeContainer.innerHTML = this.generateMonteCarloNarrative(results, inputs);
                narrativeContainer.classList.remove('hidden');
                });
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
            const chartManager = await profiler.asyncMeasure('advanced-classic.post.chart.loadChartManager.monteCarlo', () => this.getChartManager());
            profiler.measure('advanced-classic.post.chart.renderMonteCarloFanChart', () => chartManager.renderMonteCarloFanChart(inputs, results.paths, results.scenarios || null));
            profiler.measure('advanced-classic.post.chart.renderHistogram', () => chartManager.renderHistogram(results.outcomes));

            // Switch to the 'charts' tab
            showTab('charts', true);

            updateProgress(0);
            showNotification('Monte Carlo simulation completed', 'success');
            profiler.report('advanced classic Monte Carlo profile');

        } catch (error) {
            console.error('Monte Carlo simulation error:', error);
            showNotification('Error in Monte Carlo simulation: ' + error.message, 'error');
        } finally {
            this.isCalculating = false;
            updateProgress(0);
        }
    }

    // Stress testing
    // TASK-006: Each scenario now computes a delta vs the base plan so the
    // display and PDF/Excel export show meaningful impact figures.
    async runStressTest() {
        if (this.isCalculating) return;

        this.isCalculating = true;

        try {
            const inputs = this.collectInputs();

            // Skip if inputs haven't changed since last stress test
            const stressHash = JSON.stringify(inputs);
            if (this.lastStressHash && stressHash === this.lastStressHash) {
                this.isCalculating = false;
                showNotification('No changes since last stress test — results are up to date.', 'info');
                return;
            }

            // Run the base (unstressed) simulation once for comparison.
            updateProgress(5, 'Running base plan...');
            const baseResult = this.simulator.simulateRetirement(inputs, false);
            const baseBalance = baseResult.finalBalance || 0;

            const scenarios = ENHANCED_CONFIG.STRESS_SCENARIOS;
            const results = [];

            for (let i = 0; i < scenarios.length; i++) {
                const scenario = scenarios[i];
                updateProgress(10 + (i / scenarios.length) * 85, `Testing scenario: ${scenario.name}`);

                // Build stressed inputs: apply any input-level modifications the
                // scenario defines (e.g. healthcareCostMultiplier, changed return rates).
                const stressedInputs = buildStressedInputs(inputs, scenario);

                // normaliseStressScenarioForTest converts year1/year2/… objects into
                // yearlyEquityReturns / yearlyBondReturns arrays and sets isRetirementTimed
                // so simulateRetirement correctly applies multi-year shocks (COVID, GFC).
                const normalisedScenario = normaliseStressScenarioForTest(scenario);

                // Run the simulation with the stressed inputs AND the normalised scenario.
                const stressResult = this.simulator.runStressTest(stressedInputs, normalisedScenario);
                const stressBalance = stressResult.finalBalance || 0;

                results.push({
                    scenario:         scenario.name,
                    description:      scenario.description || '',
                    finalBalance:     stressBalance,
                    baseBalance,
                    deltaBalance:     stressBalance - baseBalance,  // negative = worse than base
                    success:          stressBalance > 0,
                    // Use ?? not || so an explicit 0 probability is preserved
                    probability:      scenario.probability ?? null,
                });

                await new Promise(resolve => setTimeout(resolve, 50));
            }

            // Persist for export
            this.currentStressTestResults = results;
            this.lastStressHash = stressHash;

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

        stressTestResults.classList.remove('hidden');
        stressTestResults.innerHTML = `
            <h3 class="text-lg font-semibold text-gray-800 mb-3">⚡ Stress Test Results</h3>
            <p class="text-xs text-gray-500 mb-3">Each scenario is run against your current plan. "Delta" shows how much better or worse the stressed outcome is vs your base plan.</p>
            <div class="space-y-2">
                ${results.map(result => {
                    const deltaStr = result.deltaBalance !== undefined
                        ? (result.deltaBalance >= 0 ? '+' : '') + formatCurrency(result.deltaBalance)
                        : '';
                    const deltaColor = !result.deltaBalance ? '' :
                        result.deltaBalance >= 0 ? 'text-green-600' : 'text-red-600';
                    const probStr = result.probability != null
                        ? `<span class="ml-2 text-gray-500 text-xs">~${(result.probability * 100).toFixed(0)}% probability</span>`
                        : '';
                    return `
                    <div class="p-3 rounded ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}">
                        <div class="font-medium ${result.success ? 'text-green-800' : 'text-red-800'}">${result.scenario}${probStr}</div>
                        ${result.description ? `<div class="text-xs text-gray-500 mt-0.5">${result.description}</div>` : ''}
                        <div class="text-sm mt-1 text-gray-700 flex flex-wrap gap-x-4">
                            <span>Final Balance: <strong>${formatCurrency(result.finalBalance)}</strong></span>
                            ${deltaStr ? `<span>Delta vs Base: <strong class="${deltaColor}">${deltaStr}</strong></span>` : ''}
                            <span class="font-medium ${result.success ? 'text-green-600' : 'text-red-600'}">
                                ${result.success ? '✓ Portfolio survives' : '✗ Portfolio depleted'}
                            </span>
                        </div>
                    </div>`;
                }).join('')}
            </div>
        `;
        stressTestResults.scrollIntoView({ behavior: 'smooth' });
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

    async runCheckboxScenarioComparison() {
        if (this.isCalculating) return;
        this.isCalculating = true;

        try {
            const inputs = this.collectInputs();
            const availableScenarios = this.simulator.getCommonScenarios(inputs);

            // Auto-populate checkboxes if the container is empty
            const checkboxContainer = $('scenarioCheckboxes');
            if (checkboxContainer && !checkboxContainer.querySelector('input[type="checkbox"]')) {
                this.populateScenarioCheckboxes(availableScenarios);
                // Select all by default when auto-populating
                document.querySelectorAll('#scenarioCheckboxes input[type="checkbox"]').forEach(cb => { cb.checked = true; });
            }

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

            // Store results for export
            this.currentScenarioComparisons = results.scenarios;

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
                    Lifecycle_Stage: data.lifecycleLabel || data.lifecycleStage || '',
                    Funding_Stage: data.fundingLabel || data.fundingStage || '',
                    Decumulation_Strategy: data.decumulationStrategy || '',
                    Start_Balance: data.startBalance,
                    Return_Rate: data.returnRate,
                    Growth: data.growth,
                    Withdrawal: data.withdrawal,
                    Core_Spending: data.coreSpending || 0,
                    Essential_Spending: data.essentialSpending || 0,
                    Discretionary_Spending: data.discretionarySpending || 0,
                    Healthcare_Cost: data.healthcareCost,
                    Aged_Care_Cost: data.agedCareCost,
                    Property_Income: data.propertyIncome || 0,
                    Other_Income: data.otherIncome || 0,
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
        const canonicalInputs = buildCanonicalSaveData(inputs, { source: 'advanced' });
        exportUserData(canonicalInputs, scenarioName, { sourcePage: 'advanced' });
        trackDataAction('Export User Data');
    }

    async importUserInputs() {
        if (this.isImporting) {
            return;
        }
        this.isImporting = true;

        try {
            const importedData = await importUserData();
            if (importedData) {
                // Populate the form with imported data
                populateFormFromData(importedData.userData, importedData.version);

                // Trigger conditional section visibility after loading checkboxes
                ['enableReducedIncome', 'isCarerForParents', 'hasInvestmentProperty',
                    'hasSMSF', 'hasTrustAssets'].forEach(id => {
                    const el = document.getElementById(id);
                    if (el && el.type === 'checkbox') el.dispatchEvent(new Event('change'));
                });

                // Trigger currency and percentage input formatting
                initializeCurrencyInputs();
                initializePercentageInputs();
                initializeNumericInputs();
                this.refreshAllDerivedDefaults({ force: false });

                // Show enhanced summary for returning user
                this.showReturningUserEnhancedSummary(importedData.userData, importedData.scenarioName);

                // Show action buttons
                const actionButtonsContainer = $('action-buttons-container');
                if (actionButtonsContainer) {
                    actionButtonsContainer.classList.remove('hidden');
                }

                // Update risk profile and allocation displays
                const inputs = this.collectInputs();
                this.updateRiskProfile(inputs);
                this.updateRecommendedAllocation(inputs);

                // Recalculate projections with the new data
                this.calculateRetirement(false);

                showNotification(`Successfully loaded scenario: ${importedData.scenarioName || 'Imported Data'}`, 'success');
                trackDataAction('Import User Data');
            }
        } catch (error) {
            showNotification(error.message || 'Failed to import data.', 'error');
        } finally {
            // Reset the flag immediately after the operation completes
            this.isImporting = false;
        }
    }

    /**
     * Run the Financial Life Simulation Engine and render results.
     */
    async runLifeSimulator() {
        const btnRun   = $('btnRunLifeSimulator');
        const statusEl = $('simStatus');
        const resultsEl = $('lifeSimResults');

        if (!btnRun) return;

        // Helper to show/clear an inline error banner within the tab
        const showSimError = (msg, detail = '') => {
            let errEl = $('simErrorBanner');
            if (!errEl) {
                errEl = document.createElement('div');
                errEl.id = 'simErrorBanner';
                // Insert before the results div (or at start of tab if results not present)
                const parent = resultsEl ? resultsEl.parentNode : btnRun.closest('.tab-content');
                if (parent) {
                    const anchor = resultsEl || btnRun.closest('.mb-6');
                    parent.insertBefore(errEl, anchor);
                }
            }
            errEl.className = 'mb-4 p-4 bg-red-50 border border-red-300 rounded-lg text-sm text-red-800';
            errEl.innerHTML = `<strong>Simulation Error</strong>: ${msg}`
                + (detail ? `<pre class="mt-2 text-xs text-red-700 whitespace-pre-wrap">${detail}</pre>` : '');
            if (errEl.isConnected) errEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        };

        const clearSimError = () => {
            const errEl = $('simErrorBanner');
            if (errEl) errEl.remove();
        };

        clearSimError();
        btnRun.disabled = true;
        if (statusEl) statusEl.textContent = 'Running simulation…';

        try {
            const inputs = this.collectInputs();

            // Merge spending strategy and MC run count from simulator UI
            const spendingStrategyEl = $('simSpendingStrategy');
            const numRunsEl          = $('simNumRuns');
            if (spendingStrategyEl) inputs.spendingStrategy = spendingStrategyEl.value;
            if (numRunsEl)          inputs.numRuns = parseInt(numRunsEl.value, 10) || 500;

            // Run the full simulation (baseline + MC + strategies + recommendations)
            const { baseline, monteCarlo, strategies, recommendations } =
                await runFullSimulation(inputs, { numRuns: inputs.numRuns });
            const detailedProjection = this.simulator.simulateRetirement(inputs, false);

            // ── Render results ────────────────────────────────────────────────
            // Show the results container before any secondary work so the UI is
            // always visible even if the personalised Q&A engine throws later.
            if (resultsEl) resultsEl.classList.remove('hidden');

            // Run the personalised Q&A engine in a guarded block so that any
            // error inside it cannot prevent the main results from rendering.
            let questionAnswers = [];
            try {
                const questionEngine = new PersonalizedQuestionEngine(this.simulator, this.healthcareModeling, this.config);
                questionAnswers = questionEngine.generateAnswers(inputs, detailedProjection);
            } catch (qaErr) {
                console.warn('Life sim Q&A engine error (non-fatal):', qaErr);
            }

            // Detect open-ended lifespan mode
            const simIsOpenEnded = !(inputs.yourLifespan > 0);
            const simPartnerOpenEnded = (inputs.partnerCurrentAge > 0) && !(inputs.partnerLifespan > 0);
            const simEitherOpenEnded = simIsOpenEnded || simPartnerOpenEnded;

            // Compute median depletion age for open-ended display
            let simMedianDepletionAge = null;
            if (simEitherOpenEnded && monteCarlo.paths && monteCarlo.paths.length > 0) {
                const retirAge = inputs.retirementAge || 67;
                const depAges = monteCarlo.paths
                    .map(path => { const idx = path.findIndex(b => b <= 0); return idx === -1 ? null : retirAge + idx; })
                    .filter(a => a !== null)
                    .sort((a, b) => a - b);
                if (depAges.length > 0) simMedianDepletionAge = depAges[Math.floor(depAges.length / 2)];
            }

            // Success banner
            const successRate     = recommendations.successProbability;
            const successBanner   = $('simSuccessBanner');
            const successRateEl   = $('simSuccessRate');
            const successLabelEl  = $('simSuccessLabel');
            const successDetailEl = $('simSuccessDetail');
            if (successBanner) {
                const colour = simEitherOpenEnded
                    ? 'bg-amber-50 text-amber-900 border border-amber-200'
                    : (successRate >= 85 ? 'bg-green-100 text-green-800'
                     : successRate >= 70 ? 'bg-blue-100 text-blue-800'
                     : successRate >= 50 ? 'bg-yellow-100 text-yellow-800'
                     :                    'bg-red-100 text-red-800');
                successBanner.className = `mb-6 p-5 rounded-xl text-center ${colour}`;
            }
            if (successRateEl) successRateEl.textContent = simEitherOpenEnded && simMedianDepletionAge
                ? `Age ${simMedianDepletionAge}`
                : `${successRate}%`;
            if (successLabelEl) successLabelEl.textContent = simEitherOpenEnded
                ? 'Median Age Funds Last (Open-Ended)'
                : 'Retirement Success Probability';
            if (successDetailEl) successDetailEl.textContent = simEitherOpenEnded
                ? `Open-ended projection (no target lifespan set) — simulated to age 120. ` +
                  (simMedianDepletionAge
                      ? `In the median scenario, money lasts until age ${simMedianDepletionAge}.`
                      : `Based on ${monteCarlo.runs.toLocaleString()} Monte Carlo simulations.`)
                : `Based on ${monteCarlo.runs.toLocaleString()} Monte Carlo simulations — outcome: ${recommendations.outcome}`;

            // Key metrics
            const fmt = (v) => v != null && !isNaN(v)
                ? `$${Math.round(v).toLocaleString('en-AU')}` : '–';
            const simRetirementWealth = $('simRetirementWealth');
            const simFinalNetWorth    = $('simFinalNetWorth');
            const simRuinAge          = $('simRuinAge');
            const simLifestyleCut     = $('simLifestyleCut');
            if (simRetirementWealth) simRetirementWealth.textContent = fmt(baseline.retirementWealth);
            if (simFinalNetWorth)    simFinalNetWorth.textContent    = simEitherOpenEnded
                ? (simMedianDepletionAge ? `Depletes ~Age ${simMedianDepletionAge}` : fmt(monteCarlo.medianFinalNetWorth))
                : fmt(monteCarlo.medianFinalNetWorth);
            // Update the card label for open-ended mode
            const simFinalNetWorthLabel = simFinalNetWorth?.previousElementSibling;
            if (simFinalNetWorthLabel && simEitherOpenEnded) {
                simFinalNetWorthLabel.textContent = 'Median Depletion Age';
            } else if (simFinalNetWorthLabel) {
                simFinalNetWorthLabel.textContent = 'Median Final Net Worth';
            }
            if (simRuinAge) {
                if (simEitherOpenEnded) {
                    // For open-ended: show the earliest depletion (p10) age
                    const retirAgeSim = inputs.retirementAge || 67;
                    const allDepAges = (monteCarlo.paths || [])
                        .map(path => { const idx = path.findIndex(b => b <= 0); return idx === -1 ? null : retirAgeSim + idx; })
                        .filter(a => a !== null).sort((a, b) => a - b);
                    const p10DepAge = allDepAges.length > 0 ? allDepAges[Math.floor(allDepAges.length * 0.1)] : null;
                    simRuinAge.textContent = p10DepAge ? `Age ${p10DepAge}` : 'No depletion';
                    const simRuinAgeLabel = simRuinAge.previousElementSibling;
                    if (simRuinAgeLabel) simRuinAgeLabel.textContent = 'Earliest 10% Depletion Age';
                } else {
                    simRuinAge.textContent = monteCarlo.worstCaseRuinAge ? `Age ${monteCarlo.worstCaseRuinAge}` : 'None';
                }
            }
            if (simLifestyleCut)     simLifestyleCut.textContent     =
                `${Math.round(monteCarlo.lifestyleCutProbability)}%`;

            // Open-ended notice banner (injected into results if lifespan = 0)
            const openEndedNoticeId = 'simOpenEndedNotice';
            let existingNotice = $(openEndedNoticeId);
            if (!existingNotice && simEitherOpenEnded && resultsEl) {
                const notice = document.createElement('div');
                notice.id = openEndedNoticeId;
                notice.className = 'mb-4 p-3 bg-amber-50 border border-amber-300 rounded-lg text-sm text-amber-800';
                notice.innerHTML = `<strong>⚠️ Open-Ended Projection Mode</strong> — ` +
                    (simIsOpenEnded && simPartnerOpenEnded
                        ? 'Neither you nor your partner has a target lifespan set.'
                        : simIsOpenEnded
                        ? 'Your lifespan is set to 0 (open-ended, no target age).'
                        : "Your partner's lifespan is set to 0 (open-ended).") +
                    ` The simulation runs until funds are fully exhausted (up to age 120). ` +
                    (simMedianDepletionAge
                        ? `In the median scenario, money lasts until <strong>age ${simMedianDepletionAge}</strong>. `
                        : '') +
                    `High depletion rates are expected and normal for this mode. ` +
                    `To see a conventional success-rate percentage, enter a specific target age.`;
                resultsEl.insertBefore(notice, resultsEl.firstChild);
            } else if (existingNotice && !simEitherOpenEnded) {
                existingNotice.remove();
            }

            // Percentile table (advanced.html only)
            const percTable = $('simPercentilesTable');
            if (percTable && monteCarlo.percentiles) {
                const p = monteCarlo.percentiles;
                const rows = [
                    [10, p.p10NetWorth, 'Worst 10% of scenarios'],
                    [25, p.p25NetWorth, 'Below-average outcome'],
                    [50, p.p50NetWorth, 'Median (most likely)'],
                    [75, p.p75NetWorth, 'Above-average outcome'],
                    [90, p.p90NetWorth, 'Best 10% of scenarios'],
                ];
                percTable.innerHTML = rows.map(([pct, val, label]) =>
                    `<tr class="border-t">
                        <td class="px-4 py-2 text-gray-600">P${pct}</td>
                        <td class="px-4 py-2 text-right font-medium">${fmt(val)}</td>
                        <td class="px-4 py-2 text-gray-500">${label}</td>
                    </tr>`
                ).join('');
            }

            // Timeline chart
            const timelineCanvas = $('lifeSimTimelineChart');
            if (timelineCanvas && baseline.timeline && baseline.timeline.length > 0) {
                await this._renderLifeSimChart(timelineCanvas, baseline.timeline);
            }

            // Strategy list (advanced.html only)
            const strategiesList = $('simStrategiesList');
            if (strategiesList && strategies.length > 0) {
                strategiesList.innerHTML = strategies.slice(0, 5).map(s => {
                    const delta   = s.netWorthDelta;
                    const colour  = delta >= 0 ? 'text-green-600' : 'text-red-600';
                    const prefix  = delta >= 0 ? '+' : '';
                    const outcome = s.success ? '✅' : '⚠️';
                    return `<div class="flex items-center justify-between p-3 bg-white border rounded-lg">
                        <span class="text-sm">${outcome} ${s.description}</span>
                        <span class="text-sm font-medium ${colour}">${prefix}${fmt(delta)}</span>
                    </div>`;
                }).join('');
            }

            // Recommendations
            const recList = $('simRecommendationsList');
            if (recList && recommendations.recommendations.length > 0) {
                recList.innerHTML = recommendations.recommendations.map((r, i) => {
                    const impact = r.impactAud != null
                        ? `<span class="ml-2 text-xs text-green-700 font-medium">(potential impact: ${fmt(r.impactAud)})</span>`
                        : '';
                    return `<div class="mb-4 p-4 bg-gray-50 border-l-4 border-indigo-400 rounded-r-lg">
                        <div class="font-semibold text-gray-800">${i + 1}. ${r.title}${impact}</div>
                        <p class="mt-1 text-sm text-gray-600">${r.detail}</p>
                    </div>`;
                }).join('');
            } else if (recList) {
                recList.innerHTML = `<p class="text-green-700 font-medium">🎉 Your retirement plan looks solid — no critical changes recommended at this stage.</p>`;
            }

            this.displayLifeSimQuestionAnswers(questionAnswers);

            if (statusEl) statusEl.textContent = 'Simulation complete.';
            showNotification('Life simulation complete', 'success');

        } catch (err) {
            console.error('Life simulation error:', err);
            const msg = err.message || String(err);
            const stack = err.stack ? err.stack.split('\n').slice(0, 5).join('\n') : '';
            showSimError(msg, stack);
            showNotification('Life simulation error: ' + msg, 'error');
            if (statusEl) statusEl.textContent = 'Error — see details below.';
        } finally {
            btnRun.disabled = false;
        }
    }

    /**
     * Render the life simulation timeline chart.
     * Uses Chart.js (already loaded as part of the charts bundle).
     */
    async _renderLifeSimChart(canvas, timeline) {
        try {
            const chartManager = await this.getChartManager();
            if (!chartManager) return;

            const ages      = timeline.map(s => s.age);
            const netWorths = timeline.map(s => Math.max(0, s.netWorth));
            const superBals = timeline.map(s => Math.max(0, s.superBalance + s.partnerSuperBalance));
            const investBals = timeline.map(s => Math.max(0, s.investmentAssets));

            chartManager.renderChart(canvas.id, {
                type: 'line',
                data: {
                    labels: ages,
                    datasets: [
                        {
                            label: 'Net Worth',
                            data: netWorths,
                            borderColor: 'rgb(79, 70, 229)',
                            backgroundColor: 'rgba(79, 70, 229, 0.1)',
                            fill: true,
                            tension: 0.3,
                        },
                        {
                            label: 'Super Balance',
                            data: superBals,
                            borderColor: 'rgb(16, 185, 129)',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            fill: false,
                            tension: 0.3,
                        },
                        {
                            label: 'Investment Assets',
                            data: investBals,
                            borderColor: 'rgb(245, 158, 11)',
                            backgroundColor: 'rgba(245, 158, 11, 0.1)',
                            fill: false,
                            tension: 0.3,
                        },
                    ],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend:  { position: 'top' },
                        tooltip: {
                            callbacks: {
                                label: (ctx) => {
                                    const val = ctx.parsed.y;
                                    return `${ctx.dataset.label}: $${Math.round(val).toLocaleString('en-AU')}`;
                                },
                            },
                        },
                    },
                    scales: {
                        x: { title: { display: true, text: 'Age' } },
                        y: {
                            title: { display: true, text: 'Amount (AUD)' },
                            ticks: {
                                callback: (v) => `$${(v / 1000000).toFixed(1)}M`,
                            },
                        },
                    },
                },
            });
        } catch (e) {
            // Chart rendering is non-critical; suppress errors
            console.warn('Life sim chart render failed:', e.message);
        }
    }

    displayLifeSimQuestionAnswers(questionAnswers = []) {
        const container = $('simQuestionsList');
        if (!container) return;

        const toneClasses = {
            positive: 'border-green-200 bg-green-50',
            neutral: 'border-blue-200 bg-blue-50',
            warning: 'border-amber-200 bg-amber-50',
        };

        container.innerHTML = questionAnswers.map(answer => `
            <div class="rounded-xl border p-5 ${toneClasses[answer.tone] || toneClasses.neutral}">
                <div class="text-xs font-semibold uppercase tracking-wide text-gray-500">${answer.question}</div>
                <h4 class="mt-2 text-lg font-semibold text-gray-900">${answer.headline}</h4>
                <ul class="mt-3 space-y-2 text-sm text-gray-700">
                    ${answer.bullets.map(bullet => `<li class="flex items-start gap-2"><span class="mt-1 text-indigo-500">•</span><span>${bullet}</span></li>`).join('')}
                </ul>
            </div>
        `).join('');
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

        const useDetailedExpenseInputs = $('useDetailedExpenseInputs');
        const detailedExpenseFields = $('detailedExpenseFields');
        const percentIncomeSaved = $('percentIncomeSaved');
        if (useDetailedExpenseInputs && detailedExpenseFields && percentIncomeSaved) {
            const getAbsEstimate = () => {
                const cfg = ENHANCED_CONFIG?.financials?.cashFlowAnalysis?.BASE_LIVING_EXPENSES;
                const coupleBase = cfg?.COUPLE_BASE?.value ?? 4118;
                const singleBase = cfg?.SINGLE_BASE?.value ?? 2835;
                const perChild   = cfg?.PER_CHILD?.value   ?? 630;
                const householdEl = $('household');
                const isCouple   = householdEl
                    ? (householdEl.value === 'couple' || householdEl.dataset?.value === 'couple')
                    : false;
                const dependents = Number(safeGetValue('dependents', 0));
                const base       = isCouple ? coupleBase : singleBase;
                const childCosts = Math.round(dependents * perChild);
                const living     = base + childCosts;
                const residenceType = safeGetSelectValue('primaryResidenceType', 'own_mortgage');
                const isRenting = residenceType === 'renting';
                const rent = isRenting ? (Number(safeGetValue('primaryRentMonthly', 0)) || 0) : 0;
                const housing = isRenting ? rent : 0;
                return { living, housing, total: living + housing };
            };

            const updateAbsEstimateNotes = () => {
                const est = getAbsEstimate();
                const noteEl = $('adv-spend-estimate-note');
                const housingNoteEl = $('adv-housing-estimate-note');
                const livingNoteEl  = $('adv-living-estimate-note');
                if (noteEl) noteEl.textContent = `ABS estimate: ~$${(est.total).toLocaleString('en-AU')}/mo total (housing $${est.housing.toLocaleString('en-AU')} + living $${est.living.toLocaleString('en-AU')})`;
                if (housingNoteEl) housingNoteEl.textContent = est.housing > 0 ? `ABS estimate: ~$${est.housing.toLocaleString('en-AU')}/mo` : '';
                if (livingNoteEl) livingNoteEl.textContent = `ABS estimate: ~$${est.living.toLocaleString('en-AU')}/mo`;
            };

            const autoFillExpenseEstimates = () => {
                const est = getAbsEstimate();
                const housingEl = $('currentMonthlyHousingCosts');
                const livingEl  = $('currentMonthlyLivingCosts');
                if (housingEl && (Number(housingEl.value) === 0 || housingEl.value === '')) {
                    housingEl.value = String(est.housing);
                }
                if (livingEl && (Number(livingEl.value) === 0 || livingEl.value === '')) {
                    livingEl.value = String(est.living);
                }
            };

            const toggleDetailedExpenseMode = () => {
                const isChecked = useDetailedExpenseInputs.checked;
                detailedExpenseFields.classList.toggle('hidden', !isChecked);
                percentIncomeSaved.disabled = isChecked;
                percentIncomeSaved.classList.toggle('opacity-60', isChecked);
                if (isChecked) autoFillExpenseEstimates();
                updateAbsEstimateNotes();
            };
            useDetailedExpenseInputs.addEventListener('change', toggleDetailedExpenseMode);
            toggleDetailedExpenseMode();
            updateAbsEstimateNotes();
        }

        const planToDownsize = $('planToDownsize');
        const downsizeDetails = $('downsizeDetails');
        const downsizeContribution = $('downsizeContribution');
        const downsizeDetailFieldIds = [
            'downsizeAge',
            'downsizeTransactionCost',
            'downsizeTargetHomeValue',
            'downsizeOngoingFees'
        ];
        if (planToDownsize) {
            const toggleDownsizeContribution = (isUserChange = false) => {
                const enabled = planToDownsize.value === 'true';
                if (downsizeContribution) {
                downsizeContribution.disabled = !enabled;
                }
                if (downsizeDetails) {
                    downsizeDetails.classList.toggle('hidden', !enabled);
                }
                downsizeDetailFieldIds.forEach((fieldId) => {
                    const field = $(fieldId);
                    if (field) field.disabled = !enabled;
                });
                if (downsizeContribution && enabled && isUserChange) {
                    // Auto-check when the user actively selects "Yes – Downsize".
                    // They can still uncheck it manually afterwards.
                    downsizeContribution.checked = true;
                }
                if (downsizeContribution && !enabled) {
                    downsizeContribution.checked = false;
                }
            };
            planToDownsize.addEventListener('change', () => toggleDownsizeContribution(true));
            // On page load: enable/disable without auto-checking (respect saved state).
            toggleDownsizeContribution(false);
        }

        // Toggle reduced income fields and sync Lean Years when enabled
        const syncLeanYearsFromReducedIncome = () => {
            const enabled = document.getElementById('enableReducedIncome')?.checked;
            if (!enabled) return;

            const retirementAge = parseFloat(safeGetValue('retirementAge', 0));
            const reducedIncomeAge = parseFloat(document.getElementById('reducedIncomeAge')?.value || 0);
            const yourSalary = safeGetValue('yourSalary', 0);
            const reducedSalary = parseFloat(document.getElementById('reducedIncomeSalary')?.value?.replace(/[^\d.]/g, '') || 0);

            if (reducedIncomeAge > 0 && retirementAge > reducedIncomeAge) {
                const leanYearsEl = document.getElementById('leanYearsStart');
                if (leanYearsEl) leanYearsEl.value = Math.round(retirementAge - reducedIncomeAge);
            }

            if (yourSalary > 0 && reducedSalary >= 0 && reducedSalary < yourSalary) {
                const reductionPct = ((yourSalary - reducedSalary) / yourSalary * 100).toFixed(2);
                const leanReductionEl = document.getElementById('leanYearsReduction');
                if (leanReductionEl) leanReductionEl.value = reductionPct;
            }
        };

        document.getElementById('enableReducedIncome')?.addEventListener('change', function() {
            const fields = document.getElementById('reducedIncomeFields');
            if (fields) fields.style.display = this.checked ? 'block' : 'none';
            syncLeanYearsFromReducedIncome();
        });

        // Re-sync lean years whenever the source fields change (if reduced income is enabled)
        ['reducedIncomeAge', 'reducedIncomeSalary', 'yourSalary', 'retirementAge'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', syncLeanYearsFromReducedIncome);
            document.getElementById(id)?.addEventListener('blur', syncLeanYearsFromReducedIncome);
        });

        // Toggle carer fields
        document.getElementById('isCarerForParents')?.addEventListener('change', function() {
            const fields = document.getElementById('carerFields');
            if (fields) fields.classList.toggle('hidden', !this.checked);
        });

        // Toggle SMSF section (PART 3)
        const hasSMSF = document.getElementById('hasSMSF');
        const smsfSection = document.getElementById('smsfSection');
        if (hasSMSF && smsfSection) {
            const updateSmsfWarning = () => {
                if (!hasSMSF.checked) return;
                const superBalance = (safeGetValue('yourCurrentSuper', 0) || 0) +
                    (safeGetValue('partnerCurrentSuper', 0) || 0);
                const warning = document.getElementById('smsfLowBalanceWarning');
                if (warning) warning.classList.toggle('hidden', superBalance >= 300000);
            };
            const toggleSMSF = () => {
                smsfSection.classList.toggle('hidden', !hasSMSF.checked);
                updateSmsfWarning();
            };
            hasSMSF.addEventListener('change', toggleSMSF);
            // Re-check warning whenever super balances change
            ['yourCurrentSuper', 'partnerCurrentSuper'].forEach(id => {
                const el = document.getElementById(id);
                if (el) { el.addEventListener('input', updateSmsfWarning); el.addEventListener('change', updateSmsfWarning); }
            });
            toggleSMSF();
        }

    }

    enhanceAdvancedCalculatorInputs() {
        // Enhance key financial input fields with gaming-style formatting
        const fieldsToEnhance = [
            // Financial inputs
            { id: 'yourSalary', type: 'currency', tooltip: 'Your annual gross salary' },
            { id: 'partnerSalary', type: 'currency', tooltip: 'Partner\'s annual gross salary' },
            { id: 'yourCurrentSuper', type: 'currency', tooltip: 'Current superannuation balance' },
            { id: 'partnerCurrentSuper', type: 'currency', tooltip: 'Partner\'s superannuation balance' },
            { id: 'currentSavings', type: 'currency', tooltip: 'Current savings and cash' },
            { id: 'currentStocks', type: 'currency', tooltip: 'Current investment portfolio value' },
            { id: 'currentMonthlyHousingCosts', type: 'currency', tooltip: 'Current monthly housing costs' },
            { id: 'currentMonthlyLivingCosts', type: 'currency', tooltip: 'Current monthly living costs' },

            // Property inputs
            { id: 'homeValue', type: 'currency', tooltip: 'Current home market value' },
            { id: 'mortgageBalance', type: 'currency', tooltip: 'Outstanding mortgage balance' },
            { id: 'investmentPropertyValue', type: 'currency', tooltip: 'Investment property value' },
            { id: 'investmentPropertyLoan', type: 'currency', tooltip: 'Investment property loan balance' },
            { id: 'investmentPropertyPurchasePrice', type: 'currency', tooltip: 'Original investment property cost base' },

            // Percentage inputs
            { id: 'superReturn', type: 'percentage', tooltip: 'Expected annual superannuation return' },
            { id: 'investmentReturn', type: 'percentage', tooltip: 'Expected investment return rate' },
            { id: 'inflationRate', type: 'percentage', tooltip: 'Expected annual inflation rate' },
            { id: 'salaryGrowthRate', type: 'percentage', tooltip: 'Expected salary growth rate' },
            { id: 'employerSuperContributionRate', type: 'percentage', tooltip: 'Custom employer super contribution rate' },
        ];

        fieldsToEnhance.forEach(field => {
            OnboardingWizard.enhanceExistingInput(field.id, field.type, {
                gamingLevel: 2,
                tooltip: field.tooltip
            });
        });
    }

    // Event listeners
    instrumentClick(buttonId, eventLabel, handler) {
        const button = $(buttonId);
        if (button) {
            button.addEventListener('click', () => {
                trackButtonClick(eventLabel);
                handler.call(this);
            });
        }
    }

    applyTargetIncomeBuilder() {
        const currentIncome = parseFormattedNumber(getRawValue('builderCurrentIncome', '8500'));
        const mortgageOrRent = parseFormattedNumber(getRawValue('builderMortgage', '3200'));
        const childrenCosts = parseFormattedNumber(getRawValue('builderChildren', '1200'));
        const bufferPct = parseFormattedNumber(getRawValue('builderBuffer', '10'));
        const derivedAnnualTarget = Math.max(
            0,
            (currentIncome - mortgageOrRent - childrenCosts) * 12 * (1 + (bufferPct / 100))
        );

        const targetInput = $('asfaComfortable');
        if (!targetInput) return;

        safeSetValue('asfaComfortable', Math.round(derivedAnnualTarget));
        targetInput.dispatchEvent(new Event('input', { bubbles: true }));
        showNotification(`Applied derived target: ${formatCurrency(derivedAnnualTarget)}`, 'success');
    }

    applyRichTargetToDesiredIncome() {
        const richSel = $('richTarget');
        const customEl = $('richTargetCustom');
        const targetInput = $('asfaComfortable');
        const bufferPct = parseFormattedNumber(getRawValue('builderBuffer', '10'));
        if (!richSel || !targetInput) return;

        const comfortableBase = this.hasPartnerDataInForm()
            ? ENHANCED_CONFIG.OVERSEAS_RETIREMENT.ASFA_COUPLE_ANNUAL
            : ENHANCED_CONFIG.OVERSEAS_RETIREMENT.ASFA_SINGLE_ANNUAL;

        let desired = comfortableBase;
        if (richSel.value === 'custom') {
            desired = Math.max(0, parseFormattedNumber(customEl?.value || String(comfortableBase)));
        } else {
            const multiplier = parseFloat(richSel.value) || 1;
            desired = comfortableBase * multiplier;
        }

        desired *= (1 + Math.max(0, bufferPct) / 100);
        safeSetValue('asfaComfortable', Math.round(desired));
        targetInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    syncTargetBuilderFromInputs() {
        const salary = parseFormattedNumber(getRawValue('yourSalary', '0'));
        const partnerSalary = this.hasPartnerDataInForm() ? parseFormattedNumber(getRawValue('partnerSalary', '0')) : 0;
        const monthlyNet = Math.round((salary + partnerSalary) * 0.70 / 12);
        safeSetValue('builderCurrentIncome', monthlyNet);

        const residence = safeGetSelectValue('primaryResidenceType', 'own_mortgage');
        const monthlyMortgage = parseFormattedNumber(getRawValue('monthlyMortgagePayment', '0'));
        const monthlyRent = parseFormattedNumber(getRawValue('primaryRentMonthly', '0'));
        const housing = (residence === 'own_mortgage' || residence === 'own_with_mortgage') ? monthlyMortgage : monthlyRent;
        safeSetValue('builderMortgage', Math.max(0, housing));
    }

    setupEventListeners() {
        debugLog('setupEventListeners called!');
        // Prevent duplicate event listener setup
        if (this.eventListenersSetup) {
            debugLog('Event listeners already setup, returning');
            return;
        }
        this.eventListenersSetup = true;

        // Main calculation buttons
        this.instrumentClick('btnCalculate', 'Calculate Enhanced Projection', this.calculateRetirement.bind(this, true));
        this.instrumentClick('btnGenerateRecommendations', 'Generate AI Recommendations', this.runRecommendationEngine);
        this.instrumentClick('generateSuggestionsBtn', 'Generate Personalized Suggestions', this.generatePersonalizedSuggestions);
        this.instrumentClick('generateOverseasScenarios', 'Generate Overseas Scenarios', this.generateOverseasScenarios);
        this.instrumentClick('btnMonteCarlo', 'Run Enhanced Monte Carlo', this.runMonteCarloSimulation);
        this.instrumentClick('btnScenarioMatrix', 'Compare Strategies', this.runScenarioComparison);
        this.instrumentClick('btnHealthcareAnalysis', 'Healthcare Costs', this.runHealthcareAnalysis);
        this.instrumentClick('btnRiskProfiling', 'Risk Analysis', this.runAdvancedRiskProfiling);
        this.instrumentClick('btnDynamicAllocation', 'Asset Allocation', this.runDynamicAllocationAnalysis);
        this.instrumentClick('btnStressTest', 'Run Stress Test', this.runStressTest);
        this.instrumentClick('btnRetirementSolver', 'When Can I Retire?', this.runRetirementSolver);
        this.instrumentClick('btnApplyTargetBuilder', 'Apply Target Income Builder', this.applyTargetIncomeBuilder);
        this.instrumentClick('btnCostReality', 'Cost Reality Check', () => { showTab('costReality', true); });
        this.instrumentClick('btnRunCostReality', 'Run Cost Reality Analysis', this.runCostRealityAnalysis);
        this.instrumentClick('btnScenarioComparison', 'Compare Scenarios', this.initializeScenarioComparison);
        this.instrumentClick('btnResetDefaults', 'Reset to Defaults', this.resetToDefaults);
        this.instrumentClick('btnClearAll', 'Clear All Fields', this.clearAllFields);
        this.instrumentClick('btnFillDefaults', 'Fill Default Values', this.fillDefaultValues);
        this.instrumentClick('clearCacheBtn', 'Clear Cache', this.clearCache);

        const resetEmployerSuperOverride = document.getElementById("resetEmployerSuperOverride");
        if (resetEmployerSuperOverride) {
            resetEmployerSuperOverride.addEventListener('click', () => {
                const calc = calculateEmployerSuper({
                    employmentIncome: safeGetValue('yourSalary', 0),
                    incomeMode: safeGetSelectValue('salaryIncomeMode', SALARY_INCOME_MODES.EXCLUDING_SUPER),
                    sgRate: this.getEffectiveEmployerSuperRate(),
                    maxContributionBasePerQuarter: safeGetValue('maxContributionBasePerQuarter', DEFAULT_MAX_CONTRIBUTION_BASE_PER_QUARTER),
                    applyMaxContributionBase: safeGetChecked('applyMaxContributionBase', true),
                });
                safeSetValue('employerSuperOverrideAmount', String(Math.round(calc.employerSG)));
                this.refreshEmploymentIncomeSummary();
                this.refreshSuperStrategyGuidance(false);
            });
        }

        // Scenario comparison controls
        this.instrumentClick('btnSelectAllScenarios', 'Select All Scenarios', () => this.toggleAllScenarios(true));
        this.instrumentClick('btnDeselectAllScenarios', 'Deselect All Scenarios', () => this.toggleAllScenarios(false));
        this.instrumentClick('btnRunComparison', 'Run Comparison', this.runCheckboxScenarioComparison);

        // Export dropdown functionality - delay to ensure DOM is ready
        setTimeout(() => {
            this.setupExportDropdowns();
        }, 500); // Increased delay to ensure DOM is ready

        // Show/hide custom rich target input and apply rich target to desired income.
        (function () {
            const richSel  = $('richTarget');
            const richWrap = $('richTargetCustomWrap');
            const richCustom = $('richTargetCustom');
            const bufferInput = $('builderBuffer');
            if (!richSel || !richWrap) return;
            const syncRich = (apply = true) => {
                richWrap.style.display = richSel.value === 'custom' ? '' : 'none';
                if (apply) this.applyRichTargetToDesiredIncome();
            };
            richSel.addEventListener('change', () => syncRich(true));
            if (richCustom) {
                richCustom.addEventListener('input', () => this.applyRichTargetToDesiredIncome());
                richCustom.addEventListener('change', () => this.applyRichTargetToDesiredIncome());
            }
            if (bufferInput) {
                bufferInput.addEventListener('input', () => this.applyRichTargetToDesiredIncome());
                bufferInput.addEventListener('change', () => this.applyRichTargetToDesiredIncome());
            }
            syncRich(false);
        }.bind(this)());

        // Primary residence type controls homeowner/renter fields.
        (function () {
            const residenceSel = $('primaryResidenceType');
            const homeDetails = $('primary-home-details');
            const rentDetails = $('primary-rent-details');
            if (!residenceSel) return;

            const syncResidence = () => {
                const val = residenceSel.value || 'own_mortgage';
                const isOwner = val === 'own_mortgage' || val === 'own_with_mortgage' || val === 'own_outright';
                const hasMortgage = val === 'own_mortgage' || val === 'own_with_mortgage';
                if (homeDetails) homeDetails.style.display = isOwner ? '' : 'none';
                if (rentDetails) rentDetails.classList.toggle('hidden', isOwner);

                if (!isOwner) {
                    safeSetValue('homeValue', 0);
                    safeSetValue('mortgageBalance', 0);
                    safeSetValue('monthlyMortgagePayment', 0);
                }
                if (!hasMortgage) {
                    safeSetValue('mortgageBalance', 0);
                    safeSetValue('monthlyMortgagePayment', 0);
                }

                const homeModSection = $('homeModificationsSection');
                const enableHomeMods = $('enableHomeModifications');
                if (homeModSection) homeModSection.classList.toggle('hidden', !isOwner);
                if (!isOwner && enableHomeMods) enableHomeMods.checked = false;

                this.refreshAllDerivedDefaults({ force: false });
                this.syncTargetBuilderFromInputs();
            };

            residenceSel.addEventListener('change', syncResidence);
            syncResidence();
        }.bind(this)());

        // Keep target builder guide fields in sync with existing inputs.
        ['yourSalary', 'partnerSalary', 'monthlyMortgagePayment', 'primaryRentMonthly', 'partnerCurrentAge']
            .forEach((id) => {
                const el = $(id);
                if (!el) return;
                el.addEventListener('input', () => this.syncTargetBuilderFromInputs());
                el.addEventListener('change', () => this.syncTargetBuilderFromInputs());
            });
        ['householdStatus', 'partnerCurrentAge', 'yourSalary', 'partnerSalary'].forEach((id) => {
            const el = $(id);
            if (!el) return;
            el.addEventListener('input', () => this.applyRichTargetToDesiredIncome());
            el.addEventListener('change', () => this.applyRichTargetToDesiredIncome());
        });
        this.syncTargetBuilderFromInputs();

        // Overseas destination defaults: currency + one-time median FX and rent defaults.
        (function () {
            const countryEl = $('overseasCountry');
            const currencyEl = $('overseasSpendingCurrency');
            const fxEl = $('overseasAudFxChange');
            const housingEl = $('overseasHousingType');
            const rentEl = $('overseasAnnualRent');
            if (!countryEl || !currencyEl || !fxEl || !housingEl || !rentEl) return;

            const syncDestinationDefaults = () => {
                const destination = countryEl.value;
                const currency = OVERSEAS_DEST_CURRENCY_MAP[destination];
                if (currency) currencyEl.value = currency;
                if (OVERSEAS_DEST_FX_MEDIAN_MAP[destination] !== undefined && fxEl.dataset.userEdited !== 'true') {
                    fxEl.value = Number(OVERSEAS_DEST_FX_MEDIAN_MAP[destination]).toFixed(2);
                }
            };

            const syncHousingRentDefaults = () => {
                const renting = housingEl.value === 'rent' || housingEl.value === 'nomadic';
                const rentRow = $('overseasRentRow');
                if (rentRow) rentRow.style.display = renting ? '' : 'none';
                if (rentEl.dataset.userEdited === 'true') return;
                safeSetValue('overseasAnnualRent', renting ? 12000 : 0);
            };

            countryEl.addEventListener('change', syncDestinationDefaults);
            fxEl.addEventListener('input', () => { fxEl.dataset.userEdited = 'true'; });
            housingEl.addEventListener('change', syncHousingRentDefaults);
            rentEl.addEventListener('input', () => { rentEl.dataset.userEdited = 'true'; });
            syncDestinationDefaults();
            syncHousingRentDefaults();
        }());
    }

    setupExportDropdowns() {
        debugLog('Setting up export dropdowns...');

        const setupDropdown = (buttonId, dropdownId, exportCsvId, exportXlsxId, exportPdfId) => {
            const button = $(buttonId);
            const dropdown = $(dropdownId);

            debugLog(`Setting up ${buttonId}:`, { button: !!button, dropdown: !!dropdown });

            if (button && dropdown) {
                // Prevent duplicate listeners
                if (!button.getAttribute('data-export-listener')) {
                    button.addEventListener('click', (e) => {
                        debugLog(`${buttonId} clicked, toggling dropdown`);
                        e.preventDefault();
                        e.stopPropagation();

                        // Toggle visibility with both class and inline style
                        const isHidden = dropdown.classList.contains('hidden');
                        if (isHidden) {
                            dropdown.classList.remove('hidden');
                            dropdown.style.display = 'block';
                            debugLog(`${dropdownId} shown`);
                        } else {
                            dropdown.classList.add('hidden');
                            dropdown.style.display = 'none';
                            debugLog(`${dropdownId} hidden`);
                        }
                    });
                    button.setAttribute('data-export-listener', 'true');
                }
                // Export buttons within the if block
                const btnExportCSV = $(exportCsvId);
                const btnExportXLSX = $(exportXlsxId);
                const btnExportPDF = $(exportPdfId);

                if (btnExportCSV) btnExportCSV.addEventListener('click', () => this.exportResults('csv'));
                if (btnExportXLSX) btnExportXLSX.addEventListener('click', () => this.exportResults('xlsx'));
                if (btnExportPDF) btnExportPDF.addEventListener('click', () => this.exportResults('pdf'));
            } else {
                console.warn(`Export dropdown setup failed for ${buttonId}:`, { button: !!button, dropdown: !!dropdown });
            }
        };

        // Setup for main export button
        setupDropdown('btnExport', 'exportDropdown', 'btnExportCSV', 'btnExportXLSX', 'btnExportPDF');
        // Setup for the second (deprecated) export button to ensure it also works
        setupDropdown('btnExport2', 'exportDropdown2', 'btnExportCSV2', 'btnExportXLSX2', 'btnExportPDF2');


        // Hide dropdowns when clicking outside
        document.addEventListener('click', (e) => {
            const dropdowns = document.querySelectorAll('[id^="exportDropdown"]');
            dropdowns.forEach(dropdown => {
                if (!dropdown.contains(e.target) && !e.target.closest('[id^="btnExport"]')) {
                    dropdown.classList.add('hidden');
                }
            });
        });

        // User Data Import/Export buttons
        const btnExportUserData = $('btnExportUserData');
        const btnImportUserData = $('btnImportUserData');

        if (btnExportUserData) {
            btnExportUserData.addEventListener('click', (e) => {
                debugLog('Export User Data clicked');
                e.preventDefault();
                this.exportUserInputs();
            });
        }

        if (btnImportUserData) {
            btnImportUserData.addEventListener('click', (e) => {
                debugLog('Import User Data clicked');
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
        const useGlidePath = $('useGlidePath');
        const glidePathRule = $('glidePathRule');
        const customAllocationSection = $('customAllocationSection');

        const toggleAllocationUI = () => {
            const hasCustomAllocationSection = Boolean(customAllocationSection);

            if (hasCustomAllocationSection) {
                if (useGlidePath.checked) {
                    glidePathRule.parentElement.classList.remove('hidden');
                    customAllocationSection.classList.add('hidden');
                } else {
                    glidePathRule.parentElement.classList.add('hidden');
                    customAllocationSection.classList.remove('hidden');
                }
            }
            const inputs = this.collectInputs();
            this.updateRecommendedAllocation(inputs);
        };

        if (useGlidePath && glidePathRule) {
            useGlidePath.addEventListener('change', toggleAllocationUI);
            glidePathRule.addEventListener('change', toggleAllocationUI);
            // Initial UI state
            toggleAllocationUI();
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

        // Cost Reality tab — expose scenario switcher and RAD slider updater globally
        window.showCostScenario = (scenario) => this.showCostScenario(scenario);
        window.updateRadDap = (radValue) => {
            if (!this._costRealityData) return;
            const analyzer = new RetirementCostAnalyzer(this.collectInputs());
            const result = analyzer.radDapAnalysis(parseFloat(radValue) || 500000);
            this.updateRadDapDisplay(result);
        };

        // Property analysis chart toggle
        const hasInvestmentProperty = $('hasInvestmentProperty');
        if (hasInvestmentProperty) {
            hasInvestmentProperty.addEventListener('change', () => {
                // Recalculate when property status changes (don't scroll for auto-updates)
                setTimeout(() => this.attemptAutoCalculation(), 100);
            });
        }

        // Auto-calculate state land tax when state or property value changes
        const updateLandTax = () => {
            const state = safeGetSelectValue('propertyState', '');
            const propValue = parseFormattedNumber(getRawValue('investmentPropertyValue', '0'));
            if (state && state !== 'ACT' && state !== '' && propValue > 0) {
                const landTax = calculateStateLandTax(propValue, state, this.config);
                safeSetValue('landTax', Math.round(landTax).toString());
                const autoLabel = document.getElementById('landTaxAutoLabel');
                if (autoLabel) autoLabel.classList.remove('hidden');
            } else if (state === 'NT') {
                safeSetValue('landTax', '0');
                const autoLabel = document.getElementById('landTaxAutoLabel');
                if (autoLabel) autoLabel.classList.add('hidden');
            }
        };
        const propStateEl = document.getElementById('propertyState');
        const propValueEl = document.getElementById('investmentPropertyValue');
        if (propStateEl) propStateEl.addEventListener('change', updateLandTax);
        if (propValueEl) propValueEl.addEventListener('change', updateLandTax);

        // LHC loading display
        const updateLhcDisplay = () => {
            const hasCover = safeGetChecked('hasPrivateHealthCover', false);
            const lhcSection = document.getElementById('lhcLoadingSection');
            if (lhcSection) lhcSection.classList.toggle('hidden', !hasCover);

            const ageFirstCoverStr = safeGetValue('ageFirstPrivateCover', '');
            const lhcInfo = document.getElementById('lhcLoadingInfo');
            if (!lhcInfo) return;

            if (!hasCover || !ageFirstCoverStr) {
                lhcInfo.classList.add('hidden');
                return;
            }

            const yourAge = parseInt(safeGetValue('yourCurrentAge', '40')) || 40;
            const ageFirstCover = parseInt(ageFirstCoverStr);
            const yearsWithoutCover = Math.max(0, ageFirstCover - 30);
            const yearsCovered = yourAge - ageFirstCover;
            const loadingCleared = yearsCovered >= 10;
            const loadingPct = loadingCleared ? 0 : Math.min(70, yearsWithoutCover * 2);

            if (loadingPct > 0) {
                const basePremium = 2800;
                const additionalCost = Math.round(basePremium * loadingPct / 100);
                lhcInfo.textContent = `LHC loading: ${loadingPct}% — adds ~$${additionalCost.toLocaleString()}/year to your hospital premium.`;
                lhcInfo.classList.remove('hidden');
            } else if (loadingCleared) {
                lhcInfo.textContent = `LHC loading cleared — you've held hospital cover for ${yearsCovered} consecutive years.`;
                lhcInfo.classList.remove('hidden');
            } else {
                lhcInfo.classList.add('hidden');
            }
        };
        const privateHealthEl = document.getElementById('hasPrivateHealthCover');
        const ageFirstCoverEl = document.getElementById('ageFirstPrivateCover');
        if (privateHealthEl) privateHealthEl.addEventListener('change', updateLhcDisplay);
        if (ageFirstCoverEl) ageFirstCoverEl.addEventListener('input', updateLhcDisplay);

        // FHSS benefit display
        const updateFhssDisplay = () => {
            const hasFHSS = safeGetChecked('hasFHSS', false);
            const fhssDetails = document.getElementById('fhssDetails');
            if (fhssDetails) fhssDetails.classList.toggle('hidden', !hasFHSS);
            if (!hasFHSS) return;

            const contributed = parseFormattedNumber(getRawValue('fhssContributed', '0')) || 0;
            const fhssBenefit = document.getElementById('fhssBenefitDisplay');
            if (!fhssBenefit || contributed <= 0) return;

            const capped = Math.min(contributed, 50000);
            const yourSalary = parseFormattedNumber(getRawValue('yourSalary', '80000')) || 80000;

            // Estimate marginal rate from salary
            let marginalRate = 0.30;
            if (yourSalary > 190000) marginalRate = 0.45;
            else if (yourSalary > 135000) marginalRate = 0.37;
            else if (yourSalary > 45000) marginalRate = 0.30;
            else if (yourSalary > 18200) marginalRate = 0.16;

            // After-tax withdrawal: taxed at marginal - 30% offset
            const effectiveTaxRate = Math.max(0, marginalRate - 0.30);
            const afterTaxAmount = Math.round(capped * (1 - effectiveTaxRate));
            const taxSaving = Math.round(capped * (marginalRate - effectiveTaxRate));

            fhssBenefit.innerHTML = `
                <strong>FHSS-eligible amount:</strong> $${capped.toLocaleString()}<br>
                <strong>After-tax withdrawal:</strong> ~$${afterTaxAmount.toLocaleString()} (taxed at ${(effectiveTaxRate * 100).toFixed(0)}% effective)<br>
                <strong>Estimated tax saving vs. saving outside super:</strong> ~$${taxSaving.toLocaleString()}
            `;
        };
        const fhssCheckbox = document.getElementById('hasFHSS');
        const fhssContribEl = document.getElementById('fhssContributed');
        if (fhssCheckbox) fhssCheckbox.addEventListener('change', updateFhssDisplay);
        if (fhssContribEl) fhssContribEl.addEventListener('input', updateFhssDisplay);

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
                    this.attemptAutoCalculation();
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

        const householdStatus = $('householdStatus');
        if (householdStatus) {
            householdStatus.addEventListener('change', () => {
                this.updateClassicHouseholdVisibility();
                this.refreshAllDerivedDefaults({ force: false });
                this.syncTargetBuilderFromInputs();
                this.applyRichTargetToDesiredIncome();
            });
        }

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

    getClassicPartnerControlledFieldIds() {
        return [
            'partnerRetirementAge',
            'partnerLifespan',
            'partnerGender',
            'partnerAgeCameToAustralia',
            'partnerAgeStartedEarningAustralia',
            'partnerSalary',
            'partnerReducedIncomeAge',
            'partnerReducedIncomeSalary',
            'partnerCurrentSuper',
            'partnerAdditionalSuperContribution',
            'partnerAnnualNCC',
            'spouseContribution'
        ];
    }

    ensureClassicHouseholdVisibilityMarkers() {
        const partnerSection = document.querySelector('.partner-subsection');
        if (partnerSection) partnerSection.dataset.household = 'couple';

        this.getClassicPartnerControlledFieldIds().forEach((fieldId) => {
            const field = $(fieldId);
            const wrapper = field?.closest('.super-strategy-field, .field-required, .col-span-2')
                ?? field?.parentElement;
            if (wrapper && !wrapper.dataset.household && wrapper !== document.body) {
                wrapper.dataset.household = 'couple';
            }
        });
    }

    updateClassicHouseholdVisibility() {
        this.ensureClassicHouseholdVisibilityMarkers();
        const activeHousehold = this.hasPartnerDataInForm() ? 'couple' : 'single';
        document.querySelectorAll('[data-household], [data-visible-when]').forEach((el) => {
            const expectedHousehold = el.dataset.household || el.dataset.visibleWhen;
            if (!expectedHousehold) return;
            const shouldHide = expectedHousehold !== activeHousehold;
            el.hidden = shouldHide;
            el.classList.toggle('hidden', shouldHide);
            el.setAttribute('aria-hidden', String(shouldHide));
            if (shouldHide) {
                el.setAttribute('inert', '');
            } else {
                el.removeAttribute('inert');
            }

            el.querySelectorAll('input, select, textarea, button').forEach((control) => {
                if (shouldHide) {
                    if (!control.disabled) {
                        control.dataset.visibilityDisabled = 'true';
                        control.disabled = true;
                    }
                    return;
                }

                if (control.dataset.visibilityDisabled === 'true') {
                    control.disabled = false;
                    delete control.dataset.visibilityDisabled;
                }
            });
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

        const handlePartnerDependencies = () => {
            const isPartnerAgeEmpty = !this.hasPartnerDataInForm();

            partnerFields.forEach(fieldId => {
                const field = $(fieldId);
                if (!field) return;

                if (isPartnerAgeEmpty) {
                    field.style.backgroundColor = '#fafafa';
                    field.style.borderColor = '#d1d5db';
                    return;
                }

                field.style.backgroundColor = '';
                field.style.borderColor = '';

                if (field.value.trim() === '') {
                    switch (fieldId) {
                        case 'partnerRetirementAge':
                            field.value = '60';
                            break;
                        case 'partnerLifespan':
                            field.value = '99';
                            break;
                        case 'partnerSalary':
                        case 'partnerCurrentSuper':
                            field.value = '0';
                            break;
                    }
                }
            });

            this.updateClassicHouseholdVisibility();
        };

        partnerAgeField.addEventListener('input', handlePartnerDependencies);
        partnerAgeField.addEventListener('blur', handlePartnerDependencies);

        if (partnerAgeField && partnerFields.every(id => $(id))) {
            handlePartnerDependencies();
        } else {
            document.addEventListener('DOMContentLoaded', handlePartnerDependencies);
        }
    }

    // Initial calculation
    performInitialCalculation() {
        // Skip initial calculation if coming from onboarding or first visit
        const urlParams = new URLSearchParams(window.location.search);
        const fromOnboarding = urlParams.get('onboarding') === 'true';
        const hasCompleted = localStorage.getItem('hasVisitedCalculator') === 'true';

        // Only run initial calculation if NOT coming from onboarding
        if (!fromOnboarding && hasCompleted) {
            // Delay initial calculation to ensure DOM is ready
            // Don't scroll to results on initial load - just populate data silently
            setTimeout(() => {
                this.calculateRetirement(false);
            }, 100);
        }
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
                'riskTolerance', 'hasEmergencyFund', 'hasDebt', 'dependents', 'totalDependentsCount'
            ],
            finances: [
                'yourSalary', 'partnerSalary', 'yourCurrentSuper', 'partnerCurrentSuper',
                'currentSavings', 'currentStocks', 'monthlyStockContribution', 'useDetailedExpenseInputs',
                'currentMonthlyHousingCosts', 'currentMonthlyLivingCosts', 'percentIncomeSaved'
            ],
            property: [
                'primaryResidenceType', 'primaryRentMonthly',
                'homeValue', 'mortgageBalance', 'mortgageRate', 'monthlyMortgagePayment',
                'planToDownsize', 'hasInvestmentProperty', 'investmentPropertyValue',
                'investmentPropertyLoan', 'investmentPropertyRate', 'investmentPropertyLoanType',
                'investmentPropertyPurchasePrice', 'investmentPropertyPurchaseYear',
                'weeklyRentalIncome', 'annualPropertyExpenses', 'propertyGrowthRate', 'sellPropertyYears',
                'capitalGainsTaxRate', 'vacancyRate', 'maintenanceInflation', 'landTax', 'propertyState',
                'advPropertyPolicyMode', 'advCurrentCgtDiscount', 'advProposedMinCgtRate',
                'advNgCurrentAllowed', 'advNgProposedNewBuild', 'advProposedCgtIndexation'
            ],
            smsf: [
                'hasSMSF', 'smsfAdminCosts', 'smsfInvestmentStrategy'
            ],
            trust: [
                'hasTrustAssets', 'trustType', 'trustControlLevel', 'trustNetAssets',
                'trustAttributionPercentage', 'trustAnnualDistributions', 'homeInTrust',
                'investmentPropertyInTrust', 'stocksInTrust',
                'trustTaxRate', 'familyTrustIncomeDistribution', 'beneficiaryAllocation'
            ],
            healthcare: [
                'currentHealthcareCosts', 'healthcareInflation', 'agedCareProbability',
                'agedCareStartAge', 'agedCareDuration', 'agedCareAnnualCost'
            ],
            economic: [
                'inflation', 'investmentReturn', 'returnDeclineRate', 'savingsReturn',
                'superReturn', 'useGlidePath', 'glidePathRule', 'australianEquityAllocation',
                'dividendYield', 'frankingRate', 'frankingCreditBenefit',
                'allocEquities', 'allocBonds', 'allocCash'
            ],
            salaryProgression: [
                'salaryGrowthRate', 'leanYearsStart', 'leanYearsReduction'
            ],
            pensionSystem: [
                'asfaComfortable', 'agePensionMax', 'pensionAssetThreshold',
                'pensionAssetLimit', 'pensionIncomeThreshold',
                'builderCurrentIncome', 'builderMortgage', 'builderChildren', 'builderBuffer',
                'richTarget', 'richTargetCustom'
            ],
            simulation: [
                'numRuns', 'returnVolatility', 'enableShocks', 'shockProbability', 'shockMagnitude',
                'scenarioMode', 'globalRiskFactor', 'extremeInflationProbability', 'propertyCrashProbability'
            ],
            education: [
                'educationCostPerChild', 'privateSchool', 'universitySupport'
            ],
            superStrategy: [
                'concessionalCapUsed', 'spouseContribution', 'downsizeContribution', 'employerSuperContributionRate'
            ],
            debts: [
                'creditCardBalance', 'creditCardRate',
                'personalLoanBalance', 'personalLoanRate',
                'carLoanBalance', 'carLoanRate', 'hecsBalance'
            ],
            lifestyle: [
                'annualTravelBudget', 'annualHobbyBudget',
                'legacyGoal', 'legacyGoalType'
            ],
            health: [
                'hasPrivateHealthCover', 'ageFirstPrivateCover', 'healthCondition'
            ],
            residency: [
                'ageCameToAustralia', 'ageStartedEarningAustralia',
                'partnerAgeCameToAustralia', 'partnerAgeStartedEarningAustralia'
            ],
            reducedIncome: [
                'enableReducedIncome', 'reducedIncomeAge', 'reducedIncomeSalary',
                'partnerReducedIncomeAge', 'partnerReducedIncomeSalary'
            ],
            carer: [
                'isCarerForParents', 'carerReducedWorkPercent', 'carerYearsExpected',
                'agedParentsLocation', 'carerAnnualExpense'
            ],
            riskSubQuestions: [
                'lossReaction', 'investmentExperience', 'marketUnderstanding', 'volatilityComfort'
            ],
            additionalIncome: [
                'businessIncome', 'investmentIncome'
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
            debugLog('Form inputs saved to localStorage');
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
                    element.value = PERCENTAGE_STORAGE_FIELD_IDS.has(inputId)
                        ? normalizePercentageDisplayValue(value)
                        : value;
                }
                loadedCount++;
            }
        });

        // logger.info(`Loaded ${loadedCount} saved input values`);
        return loadedCount > 0;
    }

    clearAllResults() {
        // ── Internal state ────────────────────────────────────────────────────
        this.currentResults = null;
        this.currentMonteCarloResults = null;
        this.currentOutcome = null;
        this.currentResilience = null;

        // ── Helpers ───────────────────────────────────────────────────────────
        // Elements that use the Tailwind `hidden` class to show/hide
        const hideByClass = (id, clearHTML = false) => {
            const el = $(id);
            if (!el) return;
            el.classList.add('hidden');
            if (clearHTML) el.innerHTML = '';
        };
        // Elements that use inline style.display to show/hide
        const hideByStyle = (id, clearHTML = false) => {
            const el = $(id);
            if (!el) return;
            el.style.display = 'none';
            if (clearHTML) el.innerHTML = '';
        };

        // ── Summary tab ───────────────────────────────────────────────────────
        // summaryResults grid: just clear content, always visible container
        safeSetHTML('summaryResults', '');
        // finalResult banner: clear content only; preserve base layout classes
        // (mt-4 rounded-lg overflow-hidden) so the DOM slot stays stable
        const finalResult = $('finalResult');
        if (finalResult) finalResult.innerHTML = '';
        // shortfall-action-panel uses hidden class (confirmed in HTML)
        hideByClass('shortfall-action-panel');
        // enhanced-summary-container uses hidden class (confirmed in HTML)
        hideByClass('enhanced-summary-container');
        safeSetHTML('enhanced-summary-content', '');
        safeSetHTML('enhancedRecommendationsList', '');

        // ── Risk profile display (sidebar/header) ─────────────────────────────
        safeSetText('riskCapacityText', 'Calculating...');
        safeSetText('riskToleranceText', 'Set below');
        safeSetText('riskRequirementText', 'Calculating...');
        safeSetText('recommendedAllocation', 'Calculating...');

        // ── Projection tab ────────────────────────────────────────────────────
        const projectionTable = $('projectionTable');
        if (projectionTable) projectionTable.innerHTML = '';
        hideByClass('stressTestResults', true);

        // ── Charts tab — Monte Carlo ──────────────────────────────────────────
        // monteCarloResults uses hidden class (confirmed in HTML)
        hideByClass('monteCarloResults');
        hideByClass('monteCarloNarrative', true);
        // enhancedMonteCarloResults is dynamically appended inside monteCarloResults;
        // hiding the parent already hides it, but clear it directly if it exists
        const enhancedMC = $('enhancedMonteCarloResults');
        if (enhancedMC) enhancedMC.innerHTML = '';
        // dynamicAllocationResults / healthcareAnalysisResults use hidden class (confirmed)
        hideByClass('dynamicAllocationResults', true);
        hideByClass('healthcareAnalysisResults', true);

        // Reset Monte Carlo stat fields to their original placeholder '-'
        ['mcRuns', 'mcSuccessRate', 'mcMedian', 'mc10th'].forEach(id => safeSetText(id, '-'));
        // Confidence gauge: reset SVG arc and text to empty/zero
        const gaugeFill = $('confidence-gauge-fill');
        const gaugeText = $('confidence-gauge-text');
        if (gaugeFill) gaugeFill.setAttribute('stroke-dasharray', '0 116.2');
        if (gaugeText) gaugeText.textContent = '—';
        safeSetText('mcConfidence', '-');

        // ── Retirement solver ─────────────────────────────────────────────────
        hideByClass('retirementSolverResults');

        // ── Scenario / comparison tabs ────────────────────────────────────────
        hideByClass('scenarioMatrixResults', true);
        hideByClass('scenarioComparisonResults', true);

        // ── Overseas scenarios (uses inline style.display, confirmed in HTML) ──
        hideByStyle('overseasScenariosResults', true);

        // ── Life simulation ───────────────────────────────────────────────────
        hideByClass('lifeSimResults', true);

        // ── Cost reality ──────────────────────────────────────────────────────
        hideByClass('costRealityResults', true);

        // ── Outcome / paycheck tab ────────────────────────────────────────────
        // paycheck-card uses inline style.display (confirmed in HTML)
        hideByStyle('paycheck-card');
        // outcome-depletion-banner uses hidden class (confirmed in HTML)
        hideByClass('outcome-depletion-banner');
        // outcome-sensitivity-panel uses inline style.display (confirmed in HTML)
        hideByStyle('outcome-sensitivity-panel');
        // outcome-action-cards: always present, just clear dynamic content
        safeSetHTML('outcome-action-cards', '');
        // Clear outcome text fields that get populated each run
        [
            'outcome-super-balance', 'outcome-super-balance-note',
            'outcome-age-pension',   'outcome-age-pension-note',
            'outcome-annual-income', 'outcome-annual-income-note',
            'outcome-target-income-note',
        ].forEach(id => safeSetText(id, '—'));

        // ── Risk / Property analysis tabs ─────────────────────────────────────
        const riskAnalysisContent = $('riskAnalysisContent');
        if (riskAnalysisContent) riskAnalysisContent.innerHTML = '';
        const propertyAnalysis = $('propertyAnalysis');
        if (propertyAnalysis) propertyAnalysis.innerHTML = '';

        // ── Persona intelligence (dynamically created, may not exist yet) ─────
        const personaContainer = $('personaIntelligenceResults');
        if (personaContainer) personaContainer.innerHTML = '';

        // ── What-if comparison ────────────────────────────────────────────────
        // whatIfComparison uses hidden class (confirmed in HTML)
        hideByClass('whatIfComparison');
    }

    clearAllFields() {
        if (!window.confirm('Clear ALL form fields and results? This will reset all inputs and clear all calculated results.')) {
            return;
        }

        // Clear all displayed results first
        this.clearAllResults();

        const inputIds = Object.values(this.getAllFormInputs()).flat();
        inputIds.forEach(inputId => {
            const element = $(inputId);
            if (!element) return;

            if (element.type === 'checkbox') {
                element.checked = false;
            } else if (element.type === 'radio') {
                element.checked = false;
            } else if (element.tagName === 'SELECT') {
                if (element.options.length > 0) {
                    element.selectedIndex = 0;
                }
            } else {
                element.value = '';
            }
            delete element.dataset.autoCalculated;
            delete element.dataset.userModified;
            delete element.dataset.lastAutoValue;
        });

        localStorage.removeItem('retirement-calculator-inputs');

        initializeCurrencyInputs();
        initializePercentageInputs();
        initializeNumericInputs();

        const riskTolerance = $('riskTolerance');
        if (riskTolerance) {
            riskTolerance.value = riskTolerance.min || '1';
            this.updateRiskToleranceDisplay(riskTolerance.value);
        }

        this.refreshAllDerivedDefaults({ force: false });

        showNotification('All form fields and results cleared. Enter your values or click "Fill Default Values" to populate sensible defaults.', 'success');
    }

    fillDefaultValues() {
        // Only fills fields that are empty/blank (or unchecked for checkboxes / default
        // option for selects). Existing user-entered values are preserved — use
        // "Reset to Defaults" if you want to overwrite everything.
        const config = ENHANCED_CONFIG.DEFAULTS;
        const inputIds = Object.values(this.getAllFormInputs()).flat();

        // Must match populateFormFromData()'s percentageFields list in utils.js so that
        // Load, Fill Defaults, and Reset all treat the same fields as percentages.
        const percentageFieldIds = [
            'percentIncomeSaved', 'mortgageRate', 'investmentPropertyRate',
            'propertyGrowthRate', 'capitalGainsTaxRate', 'healthcareInflation',
            'agedCareProbability', 'inflation', 'investmentReturn', 'returnDeclineRate',
            'savingsReturn', 'superReturn', 'salaryGrowthRate', 'leanYearsReduction',
            'dividendYield', 'frankingRate', 'returnVolatility', 'shockProbability', 'shockMagnitude',
            'australianEquityAllocation', 'allocEquities', 'allocBonds', 'allocCash', 'trustAttributionPercentage',
            'carerReducedWorkPercent', 'vacancyRate', 'maintenanceInflation',
            'trustTaxRate', 'beneficiaryAllocation', 'extremeInflationProbability', 'propertyCrashProbability',
            'creditCardRate', 'personalLoanRate', 'carLoanRate', 'employerSuperContributionRate',
            // dependent detail percentages — skipped by getDefaultValue() returning null, but listed for completeness
            'childrenUnder5Percent', 'childrenPrimaryPercent', 'teenagersPercent', 'adultDisabledPercent',
            'elderlyIndependentPercent', 'elderlyHomeCarePercent', 'elderlyResidentialPercent', 'otherDependentsPercent'
        ];

        let filledCount = 0;
        inputIds.forEach(inputId => {
            const element = $(inputId);
            if (!element) return;

            const defaultValue = this.getDefaultValue(inputId, config);
            if (defaultValue == null || defaultValue === '') return;

            if (element.type === 'checkbox') {
                // Skip checkboxes — "empty" is ambiguous (false could be the user's choice).
                return;
            } else if (element.type === 'radio') {
                if (element.value === defaultValue && !element.checked) {
                    element.checked = true;
                    filledCount++;
                }
            } else if (element.tagName === 'SELECT') {
                if (element.value === '' || element.selectedIndex < 0) {
                    element.value = defaultValue;
                    filledCount++;
                }
            } else {
                if (element.value.trim() === '') {
                    // DEFAULTS already store percentage values as whole numbers (e.g. 6.05 for
                    // 6.05%) — collectInputs() divides by 100 when reading them back. No
                    // multiplication is needed here; just set the value as-is so the field shows
                    // the correct human-readable percentage.
                    element.value = defaultValue;
                    filledCount++;
                }
            }
        });

        initializeCurrencyInputs();
        initializePercentageInputs();
        initializeNumericInputs();

        this.refreshAllDerivedDefaults({ force: false });

        showNotification(
            filledCount > 0
                ? `Filled ${filledCount} empty field${filledCount === 1 ? '' : 's'} with default values.`
                : 'No empty fields found — all fields already have a value.',
            filledCount > 0 ? 'success' : 'info'
        );
    }

    resetToDefaults() {
        /**
         * Reset all form inputs to their default values
         */
        const config = ENHANCED_CONFIG.DEFAULTS;
        const inputIds = Object.values(this.getAllFormInputs()).flat();

        // Must match populateFormFromData()'s percentageFields list in utils.js so that
        // Load, Fill Defaults, and Reset all treat the same fields as percentages.
        const percentageFieldIds = [
            'percentIncomeSaved', 'mortgageRate', 'investmentPropertyRate',
            'propertyGrowthRate', 'capitalGainsTaxRate', 'healthcareInflation',
            'agedCareProbability', 'inflation', 'investmentReturn', 'returnDeclineRate',
            'savingsReturn', 'superReturn', 'salaryGrowthRate', 'leanYearsReduction',
            'dividendYield', 'frankingRate', 'returnVolatility', 'shockProbability', 'shockMagnitude',
            'australianEquityAllocation', 'allocEquities', 'allocBonds', 'allocCash', 'trustAttributionPercentage',
            'carerReducedWorkPercent', 'vacancyRate', 'maintenanceInflation',
            'trustTaxRate', 'beneficiaryAllocation', 'extremeInflationProbability', 'propertyCrashProbability',
            'creditCardRate', 'personalLoanRate', 'carLoanRate', 'employerSuperContributionRate',
            // dependent detail percentages — skipped by getDefaultValue() returning null, but listed for completeness
            'childrenUnder5Percent', 'childrenPrimaryPercent', 'teenagersPercent', 'adultDisabledPercent',
            'elderlyIndependentPercent', 'elderlyHomeCarePercent', 'elderlyResidentialPercent', 'otherDependentsPercent'
        ];

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
                    // DEFAULTS store percentage values as whole numbers (e.g. 6.05 for 6.05%),
                    // so no * 100 conversion is needed — set the value as-is.
                    if (percentageFieldIds.includes(inputId) && typeof defaultValue === 'number') {
                        element.value = defaultValue;
                    } else {
                        element.value = defaultValue || '';
                    }
                }
            }
        });

        // Clear localStorage
        localStorage.removeItem('retirement-calculator-inputs');

        // Manually trigger formatting for all inputs after resetting
        initializeCurrencyInputs();
        initializePercentageInputs();
        initializeNumericInputs();

        // Update risk tolerance display
        const riskTolerance = $('riskTolerance');
        if (riskTolerance) {
            this.updateRiskToleranceDisplay(riskTolerance.value);
        }

        // Trigger a calculation update
        this.refreshAllDerivedDefaults({ force: true });
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
            'totalDependentsCount': 0,

            // Finances
            'yourSalary': config.financial.yourSalary,
            'partnerSalary': config.financial.partnerSalary,
            'yourCurrentSuper': config.financial.yourCurrentSuper,
            'partnerCurrentSuper': config.financial.partnerCurrentSuper,
            'currentSavings': config.financial.currentSavings,
            'currentStocks': config.financial.currentStocks,
            'monthlyStockContribution': config.financial.monthlyStockContribution,
            'useDetailedExpenseInputs': false,
            'currentMonthlyHousingCosts': 0,
            'currentMonthlyLivingCosts': 0,
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
            'investmentPropertyPurchasePrice': 0,
            'investmentPropertyPurchaseYear': '',
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
            'allocEquities': config.allocation.allocEquities,
            'allocBonds': config.allocation.allocBonds,
            'allocCash': config.allocation.allocCash,

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
            'shockMagnitude': config.simulation.shockMagnitude,

            // New fields 2026.1
            'scenarioMode': 'baseline',
            'globalRiskFactor': 0,
            'extremeInflationProbability': 2,
            'propertyCrashProbability': 3,
            'vacancyRate': 4,
            'maintenanceInflation': 3.5,
            'landTax': 0,
            'hasSMSF': false,
            'smsfAdminCosts': 3500,
            'smsfInvestmentStrategy': 'balanced',

            // Property tax policy defaults
            'advPropertyPolicyMode': 'current_rules',
            'advCurrentCgtDiscount': 50,
            'advProposedMinCgtRate': 20,
            'advNgCurrentAllowed': true,
            'advNgProposedNewBuild': true,
            'advProposedCgtIndexation': true,
            'trustTaxRate': 30,
            'familyTrustIncomeDistribution': 0,
            'beneficiaryAllocation': 100,
            'educationCostPerChild': 0,
            'privateSchool': false,
            'universitySupport': false,
            'concessionalCapUsed': 0,
            'spouseContribution': 0,
            'downsizeContribution': false,
            'employerSuperContributionRate': 0,

            // Debts — rates stored as whole percentages (collectInputs divides by 100)
            'creditCardBalance': 0,
            'creditCardRate': 20,
            'personalLoanBalance': 0,
            'personalLoanRate': 9,
            'carLoanBalance': 0,
            'carLoanRate': 8,
            'hecsBalance': 0,

            // Lifestyle
            'annualTravelBudget': 0,
            'annualHobbyBudget': 0,
            'legacyGoal': 0,
            'legacyGoalType': 'none',

            // Health
            'hasPrivateHealthCover': false,
            'ageFirstPrivateCover': '',
            'healthCondition': 'good',

            // Residency
            'ageCameToAustralia': 0,
            'ageStartedEarningAustralia': 0,
            'partnerAgeCameToAustralia': 0,
            'partnerAgeStartedEarningAustralia': 0,

            // Reduced income
            'enableReducedIncome': false,
            'reducedIncomeAge': 0,
            'reducedIncomeSalary': 0,
            'partnerReducedIncomeAge': 0,
            'partnerReducedIncomeSalary': 0,

            // Carer
            'isCarerForParents': false,
            'carerReducedWorkPercent': 0,
            'carerYearsExpected': 0,
            'agedParentsLocation': 'australia',
            'carerAnnualExpense': 0,

            // Risk sub-questions
            'lossReaction': 'monitor',
            'investmentExperience': '2',
            'marketUnderstanding': 'moderate',
            'volatilityComfort': '0.15',

            // Additional income
            'businessIncome': 0,
            'investmentIncome': 0,

            // Financial dependents — counts always default to 0, share % always 100
            'childrenUnder5': 0,
            'childrenUnder5Percent': 100,
            'childrenPrimary': 0,
            'childrenPrimaryPercent': 100,
            'teenagers': 0,
            'teenagersPercent': 100,
            'adultDisabled': 0,
            'adultDisabledPercent': 100,
            'elderlyIndependent': 0,
            'elderlyIndependentPercent': 100,
            'elderlyHomeCare': 0,
            'elderlyHomeCarePercent': 100,
            'elderlyResidential': 0,
            'elderlyResidentialPercent': 100,
            'otherDependents': 0,
            'otherDependentsPercent': 100
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

        debugLog('Auto-save setup completed for form inputs');
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
        let hasUnconfiguredDependents = false;

        categories.forEach(category => {
            const count = parseInt(safeGetValue(category.id, 0)) || 0;
            const percent = parseInt(safeGetValue(category.id + 'Percent', 0)) || 0;

            if (count > 0) {
                if (percent > 0) {
                    populatedCategories.push(`${count} ${category.name} (${percent}%)`);
                } else {
                    hasUnconfiguredDependents = true;
                    populatedCategories.push(`${count} ${category.name} (pending %)`);
                }
            }
        });

        const summaryTextEl = $('dependentSummaryText');
        if (summaryTextEl) {
            if (populatedCategories.length > 0) {
                summaryTextEl.textContent = populatedCategories.join(', ');
                if (hasUnconfiguredDependents) {
                    summaryTextEl.classList.add('text-yellow-600');
                    summaryTextEl.classList.remove('text-gray-600');
                } else {
                    summaryTextEl.classList.remove('text-yellow-600');
                    summaryTextEl.classList.add('text-gray-600');
                }
            } else {
                summaryTextEl.textContent = 'No dependents configured - Click to add';
                summaryTextEl.classList.remove('text-yellow-600');
                summaryTextEl.classList.add('text-gray-600');
            }
        }
    }

    showOnlyPopulatedCategories() {
        const categories = [
            'childrenUnder5', 'childrenPrimary', 'teenagers', 'adultDisabled',
            'elderlyIndependent', 'elderlyHomeCare', 'elderlyResidential', 'otherDependents'
        ];

        // First, determine if any category has been populated
        const anyCategoryPopulated = categories.some(category => {
            const count = parseInt(safeGetValue(category, 0)) || 0;
            return count > 0;
        });

        if (!anyCategoryPopulated) {
            // If no categories have a count, no need to hide anything, return to default state
            return;
        }

        // If at least one category is populated, hide all others
        categories.forEach(category => {
            const count = parseInt(safeGetValue(category, 0)) || 0;
            const rowElement = $(category + 'Row');

            if (rowElement) {
                if (count > 0) {
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

    // ========================================
    // OUTCOME-BASED CALCULATOR METHODS
    // ========================================

    runOutcomeCalculation(inputs) {
        debugLog('🎯 Running outcome-based calculation...');

        // Validate inputs before running outcome calculation
        const currentAge = inputs.currentAge || inputs.yourCurrentAge || inputs.age || 0;
        const retirementAge = inputs.retirementAge || 67;

        // Skip outcome calculation if critical data is missing or invalid
        if (currentAge <= 0 || currentAge >= 100) {
            console.warn('⚠️ Skipping outcome calculation: Invalid current age', currentAge);
            return;
        }

        if (retirementAge <= currentAge) {
            console.warn('⚠️ Skipping outcome calculation: Retirement age must be greater than current age', {retirementAge, currentAge});
            return;
        }

        try {
            // Initialize outcome engine
            this.outcomeEngine = new OutcomeEngine(inputs);
            const outcome = this.outcomeEngine.calculateConservativeOutcome();
            this.currentOutcome = outcome;

            // Generate action suggestions
            this.actionGenerator = new ActionGenerator(inputs, outcome);
            const actions = this.actionGenerator.generateActions();
            this.currentOutcomeActions = actions;

            // Initialize What-If engine
            this.whatIfEngine = new WhatIfEngine(inputs, outcome);

            // Run resilience scenarios
            this.resilienceEngine = new ResilienceScenarioEngine(inputs, outcome);
            const resilience = this.resilienceEngine.runAllScenarios();
            this.currentResilience = resilience;

            // Store last outcome for use by overseas scenarios panel
            this.lastOutcome = outcome;
            window._appInstance = this; // expose for overseas scenario tree access

            // Display outcome results
            this.displayOutcomeResults(outcome, actions, resilience);

            debugLog('✅ Outcome calculation completed:', outcome);
            debugLog('🛡️ Resilience analysis completed:', resilience);
        } catch (error) {
            console.error('❌ Error in outcome calculation:', error);
            throw error; // Re-throw to be caught by the outer try-catch
        }
    }

    displayOutcomeResults(outcome, actions, resilience) {
        // Update reality check card
        // Fix: outcome.retirementAge is the correct property (not outcome.inputs.currentAge)
        safeSetText('outcome-retirement-age', outcome.retirementAge);
        safeSetText('outcome-years-to-go', outcome.yearsToRetirement);
        safeSetText('outcome-target-income', formatCurrency(outcome.targetIncome));
        safeSetText('outcome-target-income-note', `At retirement after inflation: ${formatCurrency(outcome.targetIncomeNominal)}/year`);
        safeSetText('outcome-super-balance', formatCurrency(outcome.superAtRetirementNominal));
        safeSetText('outcome-super-balance-note', `In today's dollars: ${formatCurrency(outcome.superAtRetirement)}`);
        safeSetText('outcome-age-pension', formatCurrency(outcome.agePensionNominal));
        safeSetText('outcome-age-pension-note', `In today's dollars: ${formatCurrency(outcome.agePension)}/year`);
        safeSetText('outcome-annual-income', formatCurrency(outcome.sustainableIncomeNominal));
        safeSetText('outcome-annual-income-note', `In today's dollars: ${formatCurrency(outcome.sustainableIncome)}/year`);

        // Income replacement ratio badge
        const irBadge = document.getElementById('outcome-income-replacement-badge');
        if (irBadge && outcome.sustainableIncome && outcome.targetIncome) {
            const ratio = outcome.sustainableIncome / (outcome.targetIncome || 1);
            const pct = Math.round(ratio * 100);
            irBadge.textContent = pct + '%';
            if (pct >= 70) {
                irBadge.style.background = '#2D6A4F'; irBadge.style.color = '#fff';
            } else if (pct >= 50) {
                irBadge.style.background = '#E07B39'; irBadge.style.color = '#fff';
            } else {
                irBadge.style.background = '#B5342A'; irBadge.style.color = '#fff';
            }
        }

        // Depletion banner (deterministic mode using outcome.legacy.runOutAge)
        const depletionBanner = document.getElementById('outcome-depletion-banner');
        const depletionAgeEl = document.getElementById('outcome-depletion-age');
        const depletionIcon = document.getElementById('outcome-depletion-icon');
        const depletionHeading = document.getElementById('outcome-depletion-heading');
        if (depletionBanner) {
            const runOutAge = outcome.legacy && outcome.legacy.runOutAge;
            const planningAge = 95; // CONSERVATIVE_PLANNING_AGE
            if (runOutAge) {
                const isCritical = runOutAge < (planningAge - 10);
                depletionBanner.classList.remove('hidden');
                depletionBanner.style.borderLeftColor = isCritical ? '#DC2626' : '#F59E0B';
                depletionBanner.style.background = isCritical ? '#FEF2F2' : '#FFFBEB';
                if (depletionIcon) depletionIcon.textContent = isCritical ? '🔴' : '⚠️';
                if (depletionAgeEl) depletionAgeEl.textContent = runOutAge;
                if (depletionHeading) {
                    depletionHeading.style.color = isCritical ? '#991B1B' : '#92400E';
                }
            } else {
                depletionBanner.classList.add('hidden');
            }
        }

        // Sensitivity analysis (simple version using current outcome data)
        const sensitivityPanel = document.getElementById('outcome-sensitivity-panel');
        const sensitivityBars = document.getElementById('outcome-sensitivity-bars');
        if (sensitivityPanel && sensitivityBars && outcome.sustainableIncome > 0) {
            sensitivityPanel.style.display = '';
            const income = outcome.sustainableIncome;
            // Build simplified sensitivity drivers from available data
            const drivers = [
                { label: 'Retirement age (+1 year)', impact: Math.round(income * 0.035), positive: true },
                { label: 'Super contributions (+$1,000/yr)', impact: Math.round(income * 0.018), positive: true },
                { label: 'Investment return (+0.5%)', impact: Math.round(income * 0.022), positive: true },
            ];
            // Sort by absolute impact
            drivers.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
            const maxImpact = Math.max(...drivers.map(d => Math.abs(d.impact)));
            sensitivityBars.innerHTML = drivers.map(d => {
                const pct = maxImpact > 0 ? Math.round((Math.abs(d.impact) / maxImpact) * 100) : 0;
                const colour = d.positive ? '#2D6A4F' : '#B5342A';
                const sign = d.positive ? '+' : '-';
                return `<div class="flex items-center gap-3">
                    <span class="text-xs text-gray-600 w-52 flex-shrink-0">${d.label}</span>
                    <div class="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div class="h-2 rounded-full transition-all duration-500" style="width:${pct}%;background:${colour}"></div>
                    </div>
                    <span class="text-xs font-mono font-medium text-gray-700 w-24 text-right">${sign}${formatCurrency(Math.abs(d.impact))}/yr</span>
                </div>`;
            }).join('');
        }

        // Update lifestyle type label
        const lifestyleType = outcome.targetIncome >= 90000 ? 'Comfortable+' : 'Comfortable';
        safeSetText('outcome-lifestyle-type', lifestyleType);

        // Update gap/surplus indicator
        const statusPresentation = this.resolveOutcomeStatusPresentation(outcome);
        const gapIndicator = $('outcome-gap-indicator');
        const gapAmount = $('outcome-gap-amount');
        const gapSubtitle = $('outcome-gap-subtitle');
        if (gapIndicator && gapAmount) {
            gapIndicator.className = `gap-indicator ${statusPresentation.gapClass}`;
            gapAmount.textContent = statusPresentation.gapAmountText;
            if (gapSubtitle) gapSubtitle.innerHTML = statusPresentation.gapSubtitleHtml;
        }

        // Populate full-simulation overview if simulation results are available
        this.displayOutcomeOverview(outcome);

        // Display action cards
        this.displayActionCards(actions);

        // Display resilience analysis
        if (resilience) {
            this.displayResilienceAnalysis(resilience);
        }

        // Show outcome view (add 'active' class which enables display:block per CSS)
        const outcomeContainer = $('outcome-view-container');
        if (outcomeContainer) {
            outcomeContainer.classList.add('active');
        }

        // ── Retirement Paycheck Card ─────────────────────────────────────
        if (typeof window.updatePaycheckCard === 'function') {
            window.updatePaycheckCard(outcome, this.currentResults);
        }

        // ── Funding Source Glide Chart ───────────────────────────────────
        // Build yearly funding source data from simulator results if available
        if (typeof window.updateFundingGlideChart === 'function') {
            const sim = this.currentResults;
            if (sim && sim.yearByYear && Array.isArray(sim.yearByYear)) {
                const inputs = this.collectInputs();
                const retirementAge = inputs.retirementAge || outcome.retirementAge || 67;
                const lifespan = inputs.yourLifespan || outcome.lifespan || 85;
                const inflation = inputs.inflation || 0.026;
                const yearlyGlide = [];

                sim.yearByYear.forEach((yr, idx) => {
                    const age = (inputs.yourCurrentAge || 50) + idx;
                    if (age < retirementAge || age > lifespan) return;
                    const yearsFromRetire = age - retirementAge;
                    // Deflate to today's dollars
                    const inflFactor = Math.pow(1 + inflation, (retirementAge - (inputs.yourCurrentAge || 50)) + yearsFromRetire);
                    const deflate = (n) => (n || 0) / inflFactor;

                    yearlyGlide.push({
                        age,
                        superIncome: deflate(yr.superDrawdown || yr.superIncome || 0),
                        pensionIncome: deflate(yr.agePension || yr.pensionIncome || 0),
                        otherIncome: deflate(yr.otherIncome ?? yr.propertyIncome ?? yr.rentalIncome ?? 0)
                    });
                });

                if (yearlyGlide.length > 0) {
                    window.updateFundingGlideChart(yearlyGlide);
                }
            } else {
                // Fallback: build simplified 3-point glide from outcome data
                const retAge = outcome.retirementAge || 67;
                const lifeAge = outcome.lifespan || 85;
                const midAge = Math.round((retAge + lifeAge) / 2);
                const simplePension = outcome.agePension || 0;
                const simpleSuper = Math.max(0, (outcome.sustainableIncome || 0) - simplePension);
                window.updateFundingGlideChart([
                    { age: retAge, superIncome: simpleSuper, pensionIncome: 0, otherIncome: 0 },
                    { age: midAge, superIncome: simpleSuper * 0.7, pensionIncome: simplePension, otherIncome: 0 },
                    { age: lifeAge, superIncome: simpleSuper * 0.3, pensionIncome: simplePension, otherIncome: 0 }
                ]);
            }
        }

        // ── Policy Assumptions Drawer ────────────────────────────────────
        if (typeof window.populatePolicyDrawer === 'function') {
            window.populatePolicyDrawer();
        }
    }

    /**
     * Populate the outcome overview stats bar using the full simulation results
     * (currentResults) and the conservative outcome engine result.
     */
    displayOutcomeOverview(outcome) {
        const overviewEl = $('outcome-overview-stats');
        if (!overviewEl) return;

        const sim = this.currentResults;
        const inputs = this.collectInputs();
        const yearsToRetirement = (inputs.retirementAge || outcome.retirementAge) - (inputs.yourCurrentAge || outcome.currentAge);
        const inflationFactor = this.getInflationFactor(yearsToRetirement, inputs.inflation);

        const totalAssetsNominal = sim
            ? sim.totalFinancialAssets + (sim.accessibleHomeEquity || 0)
            : outcome.superAtRetirementNominal;
        const totalAssetsToday = sim
            ? this.toTodayDollars(totalAssetsNominal, inflationFactor)
            : outcome.superAtRetirement;

        const projectedSuperNominal = sim
            ? sim.accumulatedSuperBalance
            : outcome.superAtRetirementNominal;
        const projectedSuperToday = sim
            ? this.toTodayDollars(projectedSuperNominal, inflationFactor)
            : outcome.superAtRetirement;

        const statusPresentation = this.resolveOutcomeStatusPresentation(outcome);
        const yearsToGoLabel = statusPresentation.statusDetail
            ? `${outcome.yearsToRetirement} years to go · ${statusPresentation.statusDetail}`
            : `${outcome.yearsToRetirement} years to go`;

        overviewEl.innerHTML = `
            <div class="outcome-overview-stat">
                <div class="outcome-overview-label">Total Assets at Retirement</div>
                <div class="outcome-overview-value">${formatCurrency(totalAssetsNominal)}</div>
                <div class="outcome-overview-sublabel">≈ ${formatCurrency(totalAssetsToday)} in today's dollars · ${sim ? 'Full simulation' : 'Conservative estimate'}</div>
            </div>
            <div class="outcome-overview-stat">
                <div class="outcome-overview-label">Super at Retirement</div>
                <div class="outcome-overview-value">${formatCurrency(projectedSuperNominal)}</div>
                <div class="outcome-overview-sublabel">≈ ${formatCurrency(projectedSuperToday)} in today's dollars · ${sim ? 'Projected (full model)' : 'Conservative estimate'}</div>
            </div>
            <div class="outcome-overview-stat">
                <div class="outcome-overview-label">Sustainable Annual Income</div>
                <div class="outcome-overview-value">${formatCurrency(outcome.sustainableIncomeNominal)}</div>
                <div class="outcome-overview-sublabel">≈ ${formatCurrency(outcome.sustainableIncome)} in today's dollars · 4% drawdown + Age Pension</div>
            </div>
            <div class="outcome-overview-stat">
                <div class="outcome-overview-label">Target Income</div>
                <div class="outcome-overview-value">${formatCurrency(outcome.targetIncome)}</div>
                <div class="outcome-overview-sublabel">≈ ${formatCurrency(outcome.targetIncomeNominal)} at retirement after inflation · ASFA comfortable standard</div>
            </div>
            <div class="outcome-overview-stat">
                <div class="outcome-overview-label">Status</div>
                <div class="outcome-overview-value" style="color: ${statusPresentation.statusColor};">${statusPresentation.statusIcon} ${statusPresentation.statusLabel}</div>
                <div class="outcome-overview-sublabel">${yearsToGoLabel}</div>
            </div>
        `;
    }

    displayActionCards(actions) {
        const container = $('outcome-action-cards');
        if (!container) return;

        container.innerHTML = '';

        actions.slice(0, 5).forEach((action, index) => {
            const card = document.createElement('div');
            card.className = `action-card priority-${action.priority.toLowerCase()}`;
            card.setAttribute('data-action-id', action.id);

            card.innerHTML = `
                <div class="action-card-header">
                    <div class="action-priority-badge">${action.priority}</div>
                    <div class="action-number">#${index + 1}</div>
                </div>
                <h4 class="action-card-title">${action.title}</h4>
                <div class="action-impact">
                    <div class="action-impact-label">Impact on Gap:</div>
                    <div class="action-impact-value">+${formatCurrency(action.impactOnGap)}/year</div>
                </div>
                <div class="action-cost">
                    <div class="action-cost-label">Net Monthly Cost:</div>
                    <div class="action-cost-value">${formatCurrency(action.netCost)}/month</div>
                </div>
                ${action.taxSavings ? `
                <div class="action-tax-savings">
                    <div>Tax Savings: ${formatCurrency(action.taxSavings)}/year</div>
                </div>
                ` : ''}
                <div class="action-implementation">
                    <div class="action-effort">Effort: ${action.effort}</div>
                    <div class="action-time">Time: ${action.timeToImplement}</div>
                </div>
                <button class="action-view-details-btn" onclick="app.showActionDetail('${action.id}')">
                    View Implementation Steps
                </button>
                <label class="action-select-checkbox">
                    <input type="checkbox" onchange="app.updateCombinedImpact()">
                    <span>Include in My Plan</span>
                </label>
            `;

            container.appendChild(card);
        });
    }

    showActionDetail(actionId) {
        const action = this.actionGenerator.actions.find(a => a.id === actionId);
        if (!action) return;

        const modal = $('action-detail-modal');
        const title = $('action-detail-title');
        const content = $('action-detail-content');

        if (!modal || !title || !content) return;

        title.textContent = action.title;

        let stepsHTML = '<div class="action-steps">';
        action.howToImplement.forEach(step => {
            stepsHTML += `
                <div class="action-step">
                    <div class="action-step-number">Step ${step.step}</div>
                    <div class="action-step-content">
                        <div class="action-step-action">${step.action}</div>
                        <div class="action-step-detail">${step.detail}</div>
                    </div>
                </div>
            `;
        });
        stepsHTML += '</div>';

        content.innerHTML = stepsHTML;
        modal.style.display = 'flex';
    }

    closeActionDetail() {
        const modal = $('action-detail-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    updateCombinedImpact() {
        const selectedActions = [];
        document.querySelectorAll('.action-card input[type="checkbox"]:checked').forEach(checkbox => {
            const card = checkbox.closest('.action-card');
            const actionId = card.getAttribute('data-action-id');
            selectedActions.push(actionId);
        });

        if (selectedActions.length === 0) {
            const combinedBox = $('outcome-combined-impact');
            if (combinedBox) {
                combinedBox.style.display = 'none';
            }
            return;
        }

        const combined = this.actionGenerator.calculateCombinedImpact(selectedActions);

        const combinedBox = $('outcome-combined-impact');
        if (combinedBox) {
            combinedBox.style.display = 'block';

            const gapClosedEl = $('combined-gap-closed');
            const newIncomeEl = $('combined-new-income');

            if (gapClosedEl) {
                gapClosedEl.textContent = combined.gapClosed ? 'Gap CLOSED ✓' : `Gap reduced by ${combined.percentClosed}%`;
                gapClosedEl.className = combined.gapClosed ? 'text-green-600 font-bold' : 'text-yellow-600 font-bold';
            }

            if (newIncomeEl) {
                const newIncome = this.currentOutcome.sustainableIncome + combined.totalImpact;
                newIncomeEl.textContent = formatCurrency(newIncome);
            }
        }
    }

    // What-If Calculator Methods
    updateWhatIfSuper(value) {
        const monthlyExtra = parseInt(value);
        safeSetText('whatif-super-value', `${formatCurrency(monthlyExtra)}/month`);

        if (monthlyExtra === 0) {
            $('whatif-super-impact').style.display = 'none';
            return;
        }

        const result = this.whatIfEngine.testExtraSuperContribution(monthlyExtra);

        const impactDiv = $('whatif-super-impact');
        if (impactDiv) {
            impactDiv.style.display = 'block';
            safeSetText('whatif-super-impact-value', `Adds ${formatCurrency(result.extraSuper)} to super by retirement (${formatCurrency(result.extraSuperToday)} in today's dollars)`);
            safeSetText('whatif-super-extra-income', `${formatCurrency(result.extraIncome)}/year in today's dollars`);
            safeSetText('whatif-super-new-gap', `${formatCurrency(result.newGap)}/year in today's dollars`);
        }
    }

    updateWhatIfMortgage(value) {
        const monthlyExtra = parseInt(value);
        safeSetText('whatif-mortgage-value', `${formatCurrency(monthlyExtra)}/month`);

        if (monthlyExtra === 0) {
            $('whatif-mortgage-impact').style.display = 'none';
            return;
        }

        const result = this.whatIfEngine.testExtraMortgagePayment(monthlyExtra);

        const impactDiv = $('whatif-mortgage-impact');
        if (impactDiv) {
            impactDiv.style.display = 'block';
            safeSetText('whatif-mortgage-years-saved', `Paid off ${result.yearsEarlier} years early`);
            safeSetText('whatif-mortgage-interest-saved', formatCurrency(result.interestSaved));
            safeSetText('whatif-mortgage-impact-gap', `${formatCurrency(result.impactOnGap)}/year in today's dollars`);
        }
    }

    updateWhatIfRetirementAge(value) {
        const extraYears = parseInt(value);
        safeSetText('whatif-retirement-value', `${extraYears} years later`);

        if (extraYears === 0) {
            $('whatif-retirement-impact').style.display = 'none';
            return;
        }

        const result = this.whatIfEngine.testDelayRetirement(extraYears);

        const impactDiv = $('whatif-retirement-impact');
        if (impactDiv) {
            impactDiv.style.display = 'block';
            safeSetText('whatif-retirement-extra-super', `${formatCurrency(result.extraSuper)} (${formatCurrency(result.extraSuperToday)} in today's dollars)`);
            safeSetText('whatif-retirement-extra-income', `${formatCurrency(result.extraIncome)}/year in today's dollars`);
            safeSetText('whatif-retirement-new-gap', `${formatCurrency(result.newGap)}/year in today's dollars`);
        }
    }

    showAdvancedAnalysis() {
        // Switch to the charts tab to show advanced Monte Carlo analysis
        showTab('charts');
        showNotification('Switched to advanced analysis view', 'info');
    }

    saveOutcomePlan() {
        const selectedActions = [];
        document.querySelectorAll('.action-card input[type="checkbox"]:checked').forEach(checkbox => {
            const card = checkbox.closest('.action-card');
            const actionId = card.getAttribute('data-action-id');
            const action = this.actionGenerator.actions.find(a => a.id === actionId);
            if (action) {
                selectedActions.push(action);
            }
        });

        const planData = {
            outcome: this.currentOutcome,
            selectedActions: selectedActions,
            timestamp: new Date().toISOString()
        };

        saveToLocalStorage('outcome_plan', planData);
        showNotification('Your outcome plan has been saved!', 'success');
    }

    exportOutcomePDF() {
        this.exportResults('pdf');
    }

    // ========================================
    // RESILIENCE SCENARIO METHODS
    // ========================================

    displayResilienceAnalysis(resilience) {
        const container = $('outcome-resilience-section');
        if (!container) return;

        const { overallResilience, topRisks, recommendations } = resilience;

        // Update resilience score
        safeSetText('resilience-score', overallResilience.score);
        safeSetText('resilience-rating', overallResilience.rating);

        const scoreEl = $('resilience-score-display');
        if (scoreEl) {
            scoreEl.className = 'resilience-score-display';
            if (overallResilience.score >= 80) scoreEl.classList.add('excellent');
            else if (overallResilience.score >= 60) scoreEl.classList.add('good');
            else if (overallResilience.score >= 40) scoreEl.classList.add('moderate');
            else scoreEl.classList.add('poor');
        }

        // Display top 3 risks
        const risksContainer = $('resilience-top-risks');
        if (risksContainer && topRisks.length > 0) {
            risksContainer.innerHTML = '';

            topRisks.slice(0, 3).forEach((scenario, index) => {
                const riskCard = document.createElement('div');
                riskCard.className = 'resilience-risk-card';

                let probabilityClass = 'prob-low';
                if (scenario.probability === 'HIGH') probabilityClass = 'prob-high';
                else if (scenario.probability === 'MEDIUM') probabilityClass = 'prob-medium';

                riskCard.innerHTML = `
                    <div class="risk-card-header">
                        <span class="risk-card-number">#${index + 1}</span>
                        <span class="risk-card-probability ${probabilityClass}">${scenario.probability} probability</span>
                    </div>
                    <h4 class="risk-card-title">${scenario.name}</h4>
                    <p class="risk-card-description">${scenario.description}</p>
                    <div class="risk-card-impact">
                        <div class="risk-impact-label">Potential Impact:</div>
                        <div class="risk-impact-severity">
                            <div class="severity-bar" style="width: ${scenario.impactSeverity * 10}%"></div>
                        </div>
                        <div class="risk-impact-text">${scenario.impactSeverity.toFixed(1)}/10 severity</div>
                    </div>
                    <button class="risk-view-details-btn" onclick="app.showResilienceScenarioDetail('${scenario.id}')">
                        View Recovery Plan
                    </button>
                `;

                risksContainer.appendChild(riskCard);
            });
        }

        // Display top recommendations
        const recsContainer = $('resilience-recommendations');
        if (recsContainer && recommendations.length > 0) {
            recsContainer.innerHTML = '';

            recommendations.forEach((rec, index) => {
                const recItem = document.createElement('div');
                recItem.className = `resilience-recommendation-item priority-${rec.priority.toLowerCase()}`;

                recItem.innerHTML = `
                    <div class="rec-number">${index + 1}</div>
                    <div class="rec-content">
                        <div class="rec-title">${rec.action}</div>
                        <div class="rec-details">
                            <div class="rec-current">Current: ${rec.current}</div>
                            <div class="rec-target">Target: ${rec.target}</div>
                        </div>
                        <div class="rec-protects">Protects against: ${rec.protectsAgainst}</div>
                    </div>
                    <div class="rec-priority-badge">${rec.priority}</div>
                `;

                recsContainer.appendChild(recItem);
            });
        }

        // Show the resilience section
        container.classList.remove('hidden');
    }

    showResilienceScenarioDetail(scenarioId) {
        if (!this.currentResilience) return;

        const scenario = this.currentResilience.scenarios.find(s => s.id === scenarioId);
        if (!scenario || !scenario.applicable) return;

        const modal = $('resilience-detail-modal');
        const title = $('resilience-detail-title');
        const content = $('resilience-detail-content');

        if (!modal || !title || !content) return;

        title.textContent = scenario.name;

        let detailHTML = `
            <div class="scenario-detail-section">
                <h4>📊 Impact Analysis</h4>
                <div class="impact-metrics">
        `;

        // Display impact metrics based on scenario
        for (const [key, value] of Object.entries(scenario.impact)) {
            const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            detailHTML += `
                <div class="impact-metric">
                    <span class="metric-label">${label}:</span>
                    <span class="metric-value">${typeof value === 'number' ? formatCurrency(value) : value}</span>
                </div>
            `;
        }

        detailHTML += `
                </div>
            </div>

            <div class="scenario-detail-section">
                <h4>🎯 Recovery Actions</h4>
                <div class="recovery-actions">
        `;

        scenario.recoveryActions.forEach((action, index) => {
            detailHTML += `
                <div class="recovery-action-item">
                    <div class="recovery-action-number">${index + 1}</div>
                    <div class="recovery-action-content">
                        <div class="recovery-action-title">${action.action}</div>
                        <div class="recovery-action-detail">${action.detail}</div>
                        <div class="recovery-action-meta">
                            <span class="timeline">Timeline: ${action.timeline}</span>
                            ${action.impactReduction > 0 ? `<span class="impact-reduction">Reduces impact by ${formatCurrency(action.impactReduction)}/year</span>` : ''}
                        </div>
                    </div>
                </div>
            `;
        });

        detailHTML += `
                </div>
            </div>

            <div class="scenario-detail-section">
                <h4>🛡️ Preventive Measures</h4>
                <div class="preventive-measures">
        `;

        scenario.preventiveMeasures.forEach((measure, index) => {
            detailHTML += `
                <div class="preventive-measure-item priority-${measure.priority.toLowerCase()}">
                    <div class="measure-priority-badge">${measure.priority}</div>
                    <div class="measure-content">
                        <div class="measure-title">${measure.measure}</div>
                        <div class="measure-status">
                            <div>Current: <span class="current-status">${measure.current}</span></div>
                            <div>Target: <span class="target-status">${measure.target}</span></div>
                        </div>
                    </div>
                </div>
            `;
        });

        detailHTML += `
                </div>
            </div>

            <div class="scenario-detail-footer">
                <strong>Recovery Timeline:</strong> ${scenario.recoveryTimeline}
            </div>
        `;

        content.innerHTML = detailHTML;
        modal.style.display = 'flex';
    }

    closeResilienceScenarioDetail() {
        const modal = $('resilience-detail-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Prevent double initialization
    if (window.appInitialized) {
        return;
    }
    window.appInitialized = true;

    // Check browser compatibility first
    const isCompatible = checkBrowserCompatibility();

    if (!isCompatible.supported) {
        showCompatibilityError(isCompatible);
        return;
    }

    try {
        window.app = new RetirementCalculatorApp();
        // Make class available for any legacy code that might need it
        window.RetirementCalculatorApp = RetirementCalculatorApp;
        debugLog('Enhanced Australian Retirement Calculator initialized successfully');
    } catch (error) {
        console.error('Failed to initialize calculator:', error);
        showDetailedError(error);
    }
});

// buildStressedInputs is imported from ./policy/stress-helpers.js

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

// ══════════════════════════════════════════════════════════════════════
// UX ENHANCEMENTS — audit_of_retirement_planning.md implementation
// ══════════════════════════════════════════════════════════════════════

/**
 * Today's Dollars / Nominal display toggle.
 * Switches a data attribute on the results container so CSS and JS can
 * conditionally show/hide real vs nominal values.
 */
window._displayMode = 'real'; // default: today's dollars

window.setDisplayMode = function setDisplayMode(mode) {
    window._displayMode = mode;
    const resultsEl = document.querySelector('.mt-8.bg-white.rounded-lg.shadow-md');
    if (resultsEl) resultsEl.setAttribute('data-display-mode', mode);

    const btnReal = document.getElementById('toggle-todays-dollars');
    const btnNom = document.getElementById('toggle-nominal');
    if (btnReal) {
        btnReal.classList.toggle('active', mode === 'real');
        btnReal.setAttribute('aria-pressed', mode === 'real');
    }
    if (btnNom) {
        btnNom.classList.toggle('active', mode === 'nominal');
        btnNom.setAttribute('aria-pressed', mode === 'nominal');
    }
};

/**
 * Toggle the Policy Assumptions Drawer.
 */
window.togglePolicyDrawer = function togglePolicyDrawer() {
    const trigger = document.getElementById('policy-drawer-trigger');
    const body = document.getElementById('policy-drawer-body');
    if (!trigger || !body) return;
    const isOpen = trigger.getAttribute('aria-expanded') === 'true';
    trigger.setAttribute('aria-expanded', !isOpen);
    body.classList.toggle('open', !isOpen);
};

/**
 * Toggle "Why this matters" micro-copy panels.
 * @param {string} id — the id of the .why-matters-body element
 */
window.toggleWhyMatters = function toggleWhyMatters(id) {
    const body = document.getElementById(id);
    if (!body) return;
    const isOpen = body.classList.contains('open');
    body.classList.toggle('open', !isOpen);
    // Update trigger aria state
    const trigger = body.previousElementSibling;
    if (trigger && trigger.classList.contains('why-matters-trigger')) {
        trigger.setAttribute('aria-expanded', !isOpen);
        trigger.textContent = (isOpen ? '▸' : '▾') + ' Why this matters';
    }
};

/**
 * Populate the Policy Assumptions Drawer and the policy date badge
 * with values from ENHANCED_CONFIG.
 * Called once after app initialisation and after any calculation.
 */
window.populatePolicyDrawer = function populatePolicyDrawer() {
    try {
        // Lazy import to avoid circular deps
        import('./config.js').then(({ ENHANCED_CONFIG: C }) => {
            const fmt = (n) => n ? '$' + Math.round(n).toLocaleString('en-AU') : '—';
            const fmtPct = (r) => r ? (r * 100).toFixed(2) + '%' : '—';

            const dateEl = document.getElementById('display-policy-date');
            if (dateEl) dateEl.textContent = C.POLICY_EFFECTIVE_DATE || '—';

            const set = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.innerHTML = val;
            };

            set('pd-effective-date', C.POLICY_EFFECTIVE_DATE || '—');
            set('pd-single-max',
                `${fmt(C.SINGLE_PENSION_MAX)}/yr <span class="policy-row-date">(${fmt(C.SINGLE_PENSION_MAX / 26)}/fn)</span>`);
            set('pd-couple-max',
                `${fmt(C.COUPLE_PENSION_MAX)}/yr <span class="policy-row-date">(${fmt(C.COUPLE_PENSION_MAX / 26)}/fn combined)</span>`);
            set('pd-deeming',
                `${fmtPct(C.DEMING_RATE_LOWER)} below $${(C.DEMING_THRESHOLD_SINGLE / 1000).toFixed(0)}k (single) · ${fmtPct(C.DEMING_RATE_UPPER)} above`);
            set('pd-asset-single-ho',
                `${fmt(C.SINGLE_ASSET_THRESHOLD)} / ${fmt(C.SINGLE_ASSET_LIMIT)}`);
            set('pd-asset-couple-ho',
                `${fmt(C.COUPLE_ASSET_THRESHOLD)} / ${fmt(C.COUPLE_ASSET_LIMIT)}`);
            set('pd-next-review', C.POLICY_NEXT_REVIEW_DATE || '—');

            // Tax brackets in use
            const now = new Date();
            const fy = now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear();
            const bracketLabel = fy >= 2028 ? '2027-28 (14% lowest bracket)' :
                                 fy >= 2027 ? '2026-27 (15% lowest bracket)' :
                                              '2025-26 (16% lowest bracket)';
            set('pd-tax-brackets', bracketLabel);
        }).catch(() => {});
    } catch (e) {
        debugLog('populatePolicyDrawer error:', e);
    }
};

/**
 * Update the SVG confidence gauge in the Charts tab.
 * Arc path total length ≈ 116.2px (half-circle, r=37).
 * @param {number} pct — 0 to 100
 */
window.updateConfidenceGauge = function updateConfidenceGauge(pct) {
    const fill = document.getElementById('confidence-gauge-fill');
    const text = document.getElementById('confidence-gauge-text');
    const mcConfidence = document.getElementById('mcConfidence');
    if (!fill || !text) return;

    const ARC_LENGTH = 116.2;
    const clamped = Math.max(0, Math.min(100, pct));
    const filled = (clamped / 100) * ARC_LENGTH;

    fill.setAttribute('stroke-dasharray', `${filled.toFixed(1)} ${(ARC_LENGTH - filled).toFixed(1)}`);

    // Colour: green ≥80, amber 60-79, red <60
    const colour = clamped >= 80 ? '#22C55E' : clamped >= 60 ? '#F59E0B' : '#EF4444';
    fill.setAttribute('stroke', colour);

    text.textContent = `${Math.round(clamped)}%`;

    // Update screen-reader element
    if (mcConfidence) mcConfidence.textContent = `${Math.round(clamped)}%`;
};

/**
 * Populate the Retirement Paycheck Card (today's dollars).
 * @param {Object} outcome — from OutcomeEngine
 * @param {Object} [sim] — from simulator (optional)
 */
window.updatePaycheckCard = function updatePaycheckCard(outcome, sim) {
    const card = document.getElementById('paycheck-card');
    if (!card) return;

    // Hide and reset card if no outcome data — prevents stale values from prior calculation
    if (!outcome) {
        card.style.display = 'none';
        return;
    }

    // Use ?? (nullish coalescing) so a valid 0 is not treated as "missing"
    // superIncome = total sustainable income minus the Age Pension component
    const superIncome = outcome.superIncome ?? Math.max(0, (outcome.sustainableIncome ?? 0) - (outcome.agePension ?? 0));
    const pensionIncome = outcome.agePension ?? 0;
    const otherIncome = outcome.otherIncome ?? outcome.propertyIncome ?? outcome.rentalIncome ?? 0;
    const total = Math.max(0, superIncome + pensionIncome + otherIncome);

    if (total <= 0) {
        card.style.display = 'none'; // hide + clear on zero/empty case
        return;
    }

    const fmtM = (n) => '$' + Math.round(Math.abs(n) / 12).toLocaleString('en-AU');
    const pct = (n) => total > 0 ? Math.round((n / total) * 100) + '%' : '0%';

    const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

    set('paycheck-total', fmtM(total));
    set('paycheck-period', `per month · at age ${outcome.retirementAge || '—'} (today's dollars)`);
    set('paycheck-super', fmtM(superIncome));
    set('paycheck-super-pct', pct(superIncome) + ' of income');
    set('paycheck-pension', fmtM(pensionIncome));
    set('paycheck-pension-pct', pct(pensionIncome) + ' of income');
    set('paycheck-other', fmtM(otherIncome));
    set('paycheck-other-pct', pct(otherIncome) + ' of income');

    // Proportion bar widths
    const superBar = document.getElementById('paycheck-bar-super');
    const penBar = document.getElementById('paycheck-bar-pension');
    const otherBar = document.getElementById('paycheck-bar-other');
    if (superBar) superBar.style.width = pct(superIncome);
    if (penBar) penBar.style.width = pct(pensionIncome);
    if (otherBar) otherBar.style.width = pct(otherIncome);

    const modeNote = window._displayMode === 'nominal'
        ? 'Amounts shown in nominal (future) dollars — actual purchasing power will differ.'
        : 'Amounts shown in today\'s dollars (adjusted for inflation). Age Pension subject to means testing.';
    set('paycheck-note', modeNote);

    card.style.display = '';
};

/**
 * Draw the Funding Source Glide Chart (stacked area/bar by age).
 * Shows the shift from self-funded → mixed → pension-heavy.
 * Requires a year-by-year projection array from the simulator.
 * @param {Array} yearlyData — [{age, superIncome, pensionIncome, otherIncome}]
 */
window.updateFundingGlideChart = function updateFundingGlideChart(yearlyData) {
    const wrap = document.getElementById('funding-glide-wrap');
    const canvas = document.getElementById('fundingGlideChart');

    // Guard: hide wrapper and return early when data or Chart.js is missing
    if (!wrap || !canvas || !yearlyData || yearlyData.length === 0 || typeof Chart === 'undefined') {
        if (wrap) wrap.style.display = 'none';
        return;
    }

    wrap.style.display = '';

    // Destroy previous instance if exists
    if (window._fundingGlideChartInstance) {
        try { window._fundingGlideChartInstance.destroy(); } catch (e) {}
        window._fundingGlideChartInstance = null;
    }

    const labels = yearlyData.map(d => `Age ${d.age}`);
    const superData = yearlyData.map(d => Math.max(0, d.superIncome || 0));
    const pensionData = yearlyData.map(d => Math.max(0, d.pensionIncome || 0));
    const otherData = yearlyData.map(d => Math.max(0, d.otherIncome || 0));

    if (typeof Chart === 'undefined') return;

    window._fundingGlideChartInstance = new Chart(canvas, {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Super Drawdown',
                    data: superData,
                    backgroundColor: '#C9A227',
                    stack: 'income'
                },
                {
                    label: 'Age Pension',
                    data: pensionData,
                    backgroundColor: '#3B82F6',
                    stack: 'income'
                },
                {
                    label: 'Other Income',
                    data: otherData,
                    backgroundColor: '#10B981',
                    stack: 'income'
                }
            ]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => `${ctx.dataset.label}: $${Math.round(ctx.raw).toLocaleString('en-AU')}/yr`
                    }
                }
            },
            scales: {
                x: { stacked: true, ticks: { font: { size: 10 }, maxRotation: 45 } },
                y: {
                    stacked: true,
                    ticks: {
                        callback: v => '$' + (v / 1000).toFixed(0) + 'k',
                        font: { size: 10 }
                    }
                }
            }
        }
    });
};

/**
 * Generate the four-scenario overseas comparison panel.
 * Uses policy-engine.js generateOverseasScenarioTree().
 * Called from the "Calculate Scenarios" button in the Overseas tab.
 */
window.generateOverseasScenariosTree = async function generateOverseasScenariosTree() {
    const loadingEl = document.getElementById('overseasScenariosLoading');
    const resultsEl = document.getElementById('overseasScenariosResults');
    const placeholderEl = document.getElementById('overseasScenariosPlaceholder');
    const treeEl = document.getElementById('overseas-scenario-tree');
    const disclaimerEl = document.getElementById('overseas-disclaimer');

    if (!treeEl) return;

    if (loadingEl) loadingEl.classList.remove('hidden');
    if (placeholderEl) placeholderEl.style.display = 'none';
    if (resultsEl) resultsEl.style.display = 'none';

    try {
        const { generateOverseasScenarioTree } = await import('./policy-engine.js');
        const { ENHANCED_CONFIG } = await import('./config.js');

        // Get inputs from the overseas tab
        const awlrEl = document.getElementById('australianResidenceYears');
        const awlrYears = awlrEl && awlrEl.value
            ? parseInt(awlrEl.value, 10)
            : Math.min(51, Math.max(0, (parseInt(document.getElementById('yourCurrentAge')?.value || '50', 10) - 16)));

        const isCouple = !!(document.getElementById('partnerCurrentAge')?.value);
        const agreementCountry = document.getElementById('overseasAgreementCountry')?.checked || false;

        // Read the move type input — used to visually highlight the selected scenario
        const moveTypeEl = document.getElementById('overseasMoveType');
        const selectedMoveType = moveTypeEl?.value || 'permanent'; // default to permanent if not set

        // Estimate base pension from main calculator result if available
        const appInstance = window._appInstance;
        let basePension = 0;
        if (appInstance && appInstance.lastOutcome) {
            basePension = appInstance.lastOutcome.agePension ?? 0;
        }
        // Fallback: use config max if no calculation run yet
        if (!basePension) {
            basePension = isCouple ? ENHANCED_CONFIG.COUPLE_PENSION_MAX : ENHANCED_CONFIG.SINGLE_PENSION_MAX;
        }

        const proposedBudgetEnabled = document.getElementById('enableProposedBudget2026')?.checked || false;
        const shortAbsenceWeeks = proposedBudgetEnabled
            ? (ENHANCED_CONFIG.OVERSEAS_RETIREMENT.SHORT_ABSENCE_WEEKS_PROPOSED || 12)
            : (ENHANCED_CONFIG.OVERSEAS_RETIREMENT.SHORT_ABSENCE_WEEKS || 6);
        const tree = generateOverseasScenarioTree({
            basePension,
            awlrYears,
            isCouple,
            agreementCountry,
            shortAbsenceWeeks
        });

        // Map moveType selector value to which scenario card to visually highlight
        const moveTypeToKey = {
            'permanent': 'permanentMove',
            'extended_temporary': 'longAbsence',
            'long_absence': 'longAbsence',
            'short_absence': 'shortAbsence'
        };
        const highlightedKey = moveTypeToKey[selectedMoveType] || 'permanentMove';

        // Build all five scenario cards — all five are always shown per research mandate:
        // "never show a simple better/worse verdict without presenting all scenarios"
        const scenarios = [
            {
                key: 'stayInAustralia',
                label: 'Stay in Australia',
                emoji: '🇦🇺',
                data: tree.stayInAustralia,
                cssClass: 'best',
                warnings: []
            },
            {
                key: 'shortAbsence',
                label: `Short Trip ≤${shortAbsenceWeeks} weeks`,
                emoji: '✈️',
                data: tree.shortAbsence,
                cssClass: 'neutral',
                warnings: tree.shortAbsence.warnings || []
            },
            {
                key: 'longAbsence',
                label: `Visit/Stay ${shortAbsenceWeeks + 1}–26 weeks`,
                emoji: '🗓️',
                data: tree.longAbsence,
                cssClass: tree.longAbsence.pensionReduced ? 'warning' : 'neutral',
                warnings: tree.longAbsence.warnings || []
            },
            {
                key: 'permanentMove',
                label: 'Permanent Move',
                emoji: '🏠',
                data: tree.permanentMove,
                cssClass: 'critical',
                warnings: tree.permanentMove.warnings || []
            },
            {
                // 5th scenario: return-to-Australia — highlights the 2-year waiting period risk
                key: 'returnToAustralia',
                label: 'Return to Australia',
                emoji: '↩️',
                data: tree.returnToAustralia,
                cssClass: agreementCountry ? 'neutral' : 'warning',
                warnings: tree.returnToAustralia.warnings || []
            }
        ];

        const fmtAnn = (n) => '$' + Math.round(n).toLocaleString('en-AU');

        treeEl.innerHTML = scenarios.map(s => {
            const delta = s.data.annualPension - basePension;
            const deltaPct = basePension > 0 ? ((delta / basePension) * 100).toFixed(1) : '0';
            const deltaClass = delta < 0 ? 'neg' : 'pos';
            const deltaStr = delta === 0 ? 'No change' : `${delta < 0 ? '−' : '+'}${fmtAnn(Math.abs(delta))}/yr`;
            // Highlight the scenario that matches the user's selected move type
            const isSelected = s.key === highlightedKey;
            const selectedBadge = isSelected ? `<span style="font-size:0.65rem;background:#1B4F72;color:#fff;border-radius:4px;padding:1px 6px;margin-left:6px;vertical-align:middle">Your selection</span>` : '';

            return `<div class="overseas-scenario-card ${s.cssClass}" style="${isSelected ? 'outline:2px solid #1B4F72;outline-offset:1px;' : ''}">
                <div class="overseas-scenario-label">${s.emoji} ${s.label}${selectedBadge}</div>
                <div class="overseas-scenario-pension">${fmtAnn(s.data.annualPension)}<span style="font-size:0.75rem;font-weight:400;color:#64748B">/yr</span></div>
                <div class="overseas-scenario-delta ${deltaClass}">${deltaStr}${delta !== 0 ? ` (${Math.abs(deltaPct)}%)` : ''}</div>
                ${s.warnings.length > 0 ? `
                    <ul class="overseas-scenario-warnings">
                        ${s.warnings.slice(0, 3).map(w => `<li>• ${w}</li>`).join('')}
                    </ul>` : ''}
            </div>`;
        }).join('');

        if (disclaimerEl) {
            disclaimerEl.textContent = tree.summary.disclaimer;
        }

        if (loadingEl) loadingEl.classList.add('hidden');
        if (resultsEl) resultsEl.style.display = '';

        // ── Fallback scenario panel ─────────────────────────────────────────
        const fallbackPanel   = document.getElementById('overseasFallbackPanel');
        const fallbackContent = document.getElementById('overseasFallbackContent');
        const fallbackAge     = parseInt(document.getElementById('overseasFallbackAge')?.value || '0') || 0;
        const fallbackTrigger = document.getElementById('overseasFallbackTrigger')?.value || 'none';
        const countryCode     = document.getElementById('overseasCountry')?.value || '';

        if (fallbackPanel && fallbackContent && fallbackAge > 0 && countryCode) {
            const { OverseasRetirementAnalyzer } = await import('./overseas-retirement.js');
            const departureAge = parseInt(document.getElementById('overseasAge')?.value || '65') || 65;
            const personalDetails = {
                partnered:               isCouple,
                retirementAge:           departureAge,
                departureAge:            departureAge,
                australianWorkingLifeYears: awlrYears,
                enableProposedBudget2026: proposedBudgetEnabled
            };
            const analyzer = new OverseasRetirementAnalyzer(personalDetails, { totalAssets: 0 });
            const fb = analyzer.generateFallbackScenario(countryCode, fallbackAge, fallbackTrigger, agreementCountry);
            if (fb) {
                fallbackContent.innerHTML = `
                    <div class="grid md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <p class="text-gray-600">Return trigger: <strong>${fb.triggerLabel}</strong></p>
                            <p class="text-gray-600 mt-1">Years overseas: <strong>${fb.yearsOverseas} yrs</strong> (age ${departureAge}–${fb.fallbackAge})</p>
                            <p class="text-gray-600 mt-1">Pension waiting period: <strong>${fb.waitingPeriod === 0 ? 'None (agreement country)' : fb.waitingPeriod + ' year(s)'}</strong></p>
                            ${fb.estimatedLostPension > 0 ? `<p class="text-red-700 font-medium mt-1">Estimated pension foregone during wait: <strong>$${fb.estimatedLostPension.toLocaleString('en-AU')}</strong></p>` : ''}
                        </div>
                        <ul class="space-y-1 text-gray-700">
                            ${fb.notes.map(n => `<li>${n}</li>`).join('')}
                        </ul>
                    </div>`;
                fallbackPanel.classList.remove('hidden');
            } else {
                fallbackPanel.classList.add('hidden');
            }
        } else if (fallbackPanel) {
            fallbackPanel.classList.add('hidden');
        }

    } catch (err) {
        console.error('generateOverseasScenariosTree error:', err);
        if (loadingEl) loadingEl.classList.add('hidden');
        if (placeholderEl) {
            placeholderEl.style.display = '';
            placeholderEl.innerHTML = '<p class="text-sm text-red-500 mt-4">Error generating scenarios. Please run the main calculation first.</p>';
        }
    }
};

// Initialise the policy date badge and drawer on page load.
// Guard: only run if the app initialised successfully (window.appInitialized is set
// by the main DOMContentLoaded handler in the HTML). This prevents running UI updates
// into a broken state when the compatibility check fails early.
document.addEventListener('DOMContentLoaded', () => {
    // Small defer so the main init handler runs first and sets appInitialized
    setTimeout(() => {
        // Only update UI if the element exists — safe to call even on pages without the results section
        if (document.getElementById('display-policy-date') || document.getElementById('policy-drawer-body')) {
            window.populatePolicyDrawer();
        }
        window.setDisplayMode('real');
    }, 0);

    // Real-time lifespan validation: must be 0 (open-ended) OR > the linked age field.
    // Mirrors the rule enforced in validateInputs() but gives immediate feedback.
    function bindLifespanValidation(lifespanId, ageId, label) {
        const lifespanEl = document.getElementById(lifespanId);
        const ageEl = document.getElementById(ageId);
        if (!lifespanEl || !ageEl) return;
        function validate() {
            const lifespan = parseInt(lifespanEl.value, 10);
            const age = parseInt(ageEl.value, 10);
            if (isNaN(lifespan) || lifespan === 0) {
                lifespanEl.setCustomValidity('');
            } else if (!isNaN(age) && lifespan <= age) {
                lifespanEl.setCustomValidity(
                    `${label} must be greater than current age (${age}), or enter 0 to simulate until money runs out.`
                );
            } else {
                lifespanEl.setCustomValidity('');
            }
        }
        lifespanEl.addEventListener('input', validate);
        lifespanEl.addEventListener('change', validate);
        ageEl.addEventListener('input', validate);
        ageEl.addEventListener('change', validate);
    }
    bindLifespanValidation('yourLifespan', 'yourCurrentAge', 'Your expected lifespan');
    bindLifespanValidation('partnerLifespan', 'partnerCurrentAge', "Partner's expected lifespan");

    // Investment property type auto-fill: strata levy default and growth rate help text.
    // Mirrors the same logic in advanced-v2.js so both pages behave consistently.
    (function () {
        const ipTypeSel     = document.getElementById('investmentPropertyType');
        const strataInput   = document.getElementById('investmentPropertyStrataLevy');
        const growthHelpEl  = document.getElementById('propertyGrowthRateHelp');
        if (!ipTypeSel || !strataInput) return;

        const strataDefaults = { house: 0, townhouse: 2500, unit: 6000 };
        const growthAdj      = { house: 0, townhouse: -0.5, unit: -1.5 };

        function onTypeChange() {
            const type = ipTypeSel.value;
            // Auto-fill strata only when the current value matches a known default
            const currentLevy = parseFloat(strataInput.value.replace(/,/g, '')) || 0;
            const isDefault   = Object.values(strataDefaults).includes(currentLevy);
            if (isDefault) strataInput.value = strataDefaults[type] ?? 0;

            // Update growth rate help text
            if (growthHelpEl) {
                const adj = growthAdj[type] ?? 0;
                growthHelpEl.textContent = adj === 0
                    ? 'Your expected long-run median growth rate. No structural adjustment for houses — full rate used in simulation.'
                    : `Your expected long-run median growth rate. A structural adjustment of ${adj.toFixed(1)} pp is applied for ${type}s to reflect lower land content vs houses (ABS RPPI 25-year data).`;
            }
        }

        ipTypeSel.addEventListener('change', onTypeChange);
        onTypeChange(); // apply on page load
    }());

    // Age-related optional cost section toggles (Home Modifications, Annuity, Tiered Spending)
    [
        { checkboxId: 'enableHomeModifications', fieldsId: 'homeModsFields' },
        { checkboxId: 'enableAnnuity', fieldsId: 'annuityFields' },
        { checkboxId: 'enableTieredSpending', fieldsId: 'tieredSpendingFields' },
    ].forEach(({ checkboxId, fieldsId }) => {
        const cb = document.getElementById(checkboxId);
        const fields = document.getElementById(fieldsId);
        if (!cb || !fields) return;
        function toggle() { fields.style.display = cb.checked ? '' : 'none'; }
        cb.addEventListener('change', toggle);
        toggle();
    });
});

export default RetirementCalculatorApp;
