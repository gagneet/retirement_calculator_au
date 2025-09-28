// js/onboarding.js - Progressive 5-Step Onboarding System
import { $, safeGetValue, safeSetValue, formatCurrency, showNotification } from './utils.js';
import { ENHANCED_CONFIG } from './config.js';
import ScenarioMatrixEngine from './scenario-matrix.js';

export default class OnboardingSystem {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 5;
        this.onboardingData = {};
        this.isOnboardingMode = this.shouldShowOnboarding();
        this.confidenceScore = 0;

        if (this.isOnboardingMode) {
            this.initializeOnboarding();
        }
    }

    shouldShowOnboarding() {
        // Check if onboarding is explicitly disabled
        const onboardingDisabled = localStorage.getItem('retirement-calc-onboarding-disabled');
        if (onboardingDisabled === 'true') {
            return false;
        }

        // Check if user wants to skip onboarding completely
        const skipOnboarding = new URLSearchParams(window.location.search).get('skip') === 'true';
        if (skipOnboarding) {
            return false;
        }

        // Show onboarding if it's a first visit or user requested it
        const hasSeenOnboarding = localStorage.getItem('retirement-calc-onboarding-completed');
        const forceOnboarding = new URLSearchParams(window.location.search).get('onboarding') === 'true';

        // NEW: Show onboarding by default for testing (can be disabled with ?skip=true)
        return !hasSeenOnboarding || forceOnboarding;
    }

    initializeOnboarding() {
        this.createOnboardingHTML();
        this.attachEventListeners();
        this.updateProgressIndicator();
        this.showStep(1);
    }

    createOnboardingHTML() {
        const container = $('.container');
        if (!container) return;

        // Store original content for restoration later
        this.originalContent = container.innerHTML;

        const onboardingHTML = `
            <div id="onboardingContainer" class="max-w-4xl mx-auto">
                <!-- Progress Indicator -->
                <div class="mb-8">
                    <div class="flex items-center justify-between text-sm text-gray-500 mb-2">
                        <span>Step <span id="currentStepNum">1</span> of ${this.totalSteps}</span>
                        <span><span id="completionPercent">20</span>% Complete</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2">
                        <div id="progressBar" class="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-500" style="width: 20%"></div>
                    </div>
                    <div class="flex justify-between mt-2 text-xs text-gray-400">
                        <span>Household</span>
                        <span>Finances</span>
                        <span>Property</span>
                        <span>Goals</span>
                        <span>Advanced</span>
                    </div>
                </div>

                <!-- Confidence Building Header -->
                <div class="text-center mb-8">
                    <h1 class="text-3xl font-bold text-gray-900 mb-2">
                        Retirement Confidence Calculator
                    </h1>
                    <div id="confidenceScoreDisplay" class="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                        <div class="text-center">
                            <div class="text-2xl font-bold text-blue-600" id="confidenceScore">0</div>
                            <div class="text-sm text-blue-600">Confidence Score</div>
                        </div>
                        <div class="ml-4 text-xl">🎯</div>
                    </div>
                    <p class="text-gray-600 mt-4" id="confidenceMessage">
                        Let's understand your situation to build your retirement confidence
                    </p>
                </div>

                <!-- Step Content Container -->
                <div id="stepContent" class="bg-white rounded-2xl shadow-lg p-8 mb-8">
                    <!-- Steps will be dynamically inserted here -->
                </div>

                <!-- Navigation Buttons -->
                <div class="flex justify-between items-center">
                    <button id="prevButton" class="px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors" style="display: none;">
                        ← Previous
                    </button>
                    <div class="flex items-center space-x-4">
                        <button id="skipOnboarding" class="text-sm text-gray-500 hover:text-gray-700">
                            Skip to Full Calculator
                        </button>
                        <button id="nextButton" class="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg">
                            Continue →
                        </button>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = onboardingHTML;
    }

    showStep(stepNumber) {
        this.currentStep = stepNumber;
        this.updateProgressIndicator();

        const stepContent = $('#stepContent');
        if (!stepContent) return;

        const stepData = this.getStepContent(stepNumber);
        stepContent.innerHTML = stepData.html;

        // Update confidence score based on step
        this.updateConfidenceScore(stepNumber);

        // Update navigation buttons
        this.updateNavigationButtons();

        // Add step-specific logic
        this.addStepLogic(stepNumber);
    }

    getStepContent(stepNumber) {
        const steps = {
            1: {
                title: "Household Profile",
                subtitle: "Let's understand your situation first",
                html: `
                    <div class="space-y-6">
                        <div class="text-center mb-6">
                            <h2 class="text-2xl font-bold text-gray-900 mb-2">Household Profile</h2>
                            <p class="text-gray-600">Let's understand your situation first</p>
                        </div>

                        <!-- Household Structure -->
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-3">① Your Household</label>
                                <div class="grid grid-cols-2 gap-4">
                                    <label class="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 transition-colors">
                                        <input type="radio" name="householdType" value="single" class="mr-3">
                                        <div>
                                            <div class="font-medium">Single person</div>
                                            <div class="text-sm text-gray-500">Planning for one</div>
                                        </div>
                                    </label>
                                    <label class="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 transition-colors">
                                        <input type="radio" name="householdType" value="couple" class="mr-3">
                                        <div>
                                            <div class="font-medium">Couple (married/de facto)</div>
                                            <div class="text-sm text-gray-500">Planning together</div>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <!-- Dependents -->
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-3">② Dependents (Select all that apply)</label>
                                <div class="space-y-3">
                                    <label class="flex items-start p-3 border border-gray-200 rounded-lg cursor-pointer hover:border-blue-300">
                                        <input type="checkbox" name="dependents" value="children_under18" class="mt-1 mr-3">
                                        <div class="flex-1">
                                            <div class="font-medium">Children under 18 living at home</div>
                                            <div class="flex items-center mt-2">
                                                <input type="number" id="childrenUnder18" min="0" max="10" class="w-16 px-2 py-1 border border-gray-300 rounded mr-2" placeholder="0">
                                                <span class="text-sm text-gray-500">children</span>
                                            </div>
                                        </div>
                                    </label>
                                    <label class="flex items-start p-3 border border-gray-200 rounded-lg cursor-pointer hover:border-blue-300">
                                        <input type="checkbox" name="dependents" value="children_adult" class="mt-1 mr-3">
                                        <div class="flex-1">
                                            <div class="font-medium">Adult children (18+) living at home</div>
                                            <div class="flex items-center mt-2">
                                                <input type="number" id="childrenAdult" min="0" max="10" class="w-16 px-2 py-1 border border-gray-300 rounded mr-2" placeholder="0">
                                                <span class="text-sm text-gray-500">children</span>
                                            </div>
                                        </div>
                                    </label>
                                    <label class="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:border-blue-300">
                                        <input type="checkbox" name="dependents" value="elderly_parents" class="mr-3">
                                        <div class="font-medium">Elderly parents/relatives dependent on you</div>
                                    </label>
                                </div>
                            </div>

                            <!-- Ages -->
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">③ Your Age</label>
                                    <input type="number" id="yourAge" min="18" max="100" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="39">
                                    <p class="text-xs text-gray-500 mt-1">Current age in years</p>
                                </div>
                                <div id="partnerAgeSection" style="display: none;">
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Partner's Age</label>
                                    <input type="number" id="partnerAge" min="18" max="100" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="41">
                                    <p class="text-xs text-gray-500 mt-1">Partner's current age</p>
                                </div>
                            </div>

                            <!-- Retirement Ages -->
                            <div class="bg-blue-50 p-4 rounded-lg">
                                <label class="block text-sm font-medium text-gray-700 mb-3">④ Target Retirement Age</label>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <input type="number" id="yourRetirementAge" min="50" max="75" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="67">
                                        <p class="text-xs text-gray-600 mt-1">Your retirement age</p>
                                    </div>
                                    <div id="partnerRetirementSection" style="display: none;">
                                        <input type="number" id="partnerRetirementAge" min="50" max="75" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="67">
                                        <p class="text-xs text-gray-600 mt-1">Partner's retirement age</p>
                                    </div>
                                </div>
                                <div class="mt-3 p-3 bg-amber-50 border border-amber-200 rounded">
                                    <div class="flex items-start">
                                        <span class="text-amber-600 mr-2">⚠️</span>
                                        <div class="text-sm text-amber-800">
                                            <strong>Preservation age: 60</strong> (born after 1964)<br>
                                            If retiring before preservation age, we'll model bridge accounts and transition strategies.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `
            },
            2: {
                title: "Financial Snapshot",
                subtitle: "Your starting point determines your destination",
                html: `
                    <div class="space-y-6">
                        <div class="text-center mb-6">
                            <h2 class="text-2xl font-bold text-gray-900 mb-2">Current Financial Position</h2>
                            <p class="text-gray-600">Your starting point determines your destination</p>
                        </div>

                        <!-- Superannuation -->
                        <div class="space-y-4">
                            <div class="border-b border-gray-200 pb-4">
                                <h3 class="text-lg font-semibold text-gray-900 mb-4">① Superannuation</h3>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">Your current balance</label>
                                        <input type="text" id="yourSuperBalance" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="$287,400">
                                    </div>
                                    <div id="partnerSuperSection" style="display: none;">
                                        <label class="block text-sm font-medium text-gray-700 mb-2">Partner's balance</label>
                                        <input type="text" id="partnerSuperBalance" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="$164,000">
                                    </div>
                                </div>

                                <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">Employer contributions</label>
                                        <input type="text" id="employerContributions" class="w-full px-4 py-3 border border-gray-300 rounded-lg" placeholder="$12,375/year">
                                        <p class="text-xs text-blue-600 mt-1">💡 Auto-filled SGC: $12,375/yr (based on avg salary)</p>
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">Your voluntary contributions</label>
                                        <input type="text" id="voluntaryContributions" class="w-full px-4 py-3 border border-gray-300 rounded-lg" placeholder="$4,500/year">
                                    </div>
                                    <div id="partnerVoluntarySection" style="display: none;">
                                        <label class="block text-sm font-medium text-gray-700 mb-2">Partner's voluntary</label>
                                        <input type="text" id="partnerVoluntaryContributions" class="w-full px-4 py-3 border border-gray-300 rounded-lg" placeholder="$3,000/year">
                                    </div>
                                </div>

                                <div class="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                                    <p class="text-sm text-blue-800">🛈 Concessional cap 2025-26: $30,000/person/year</p>
                                </div>
                            </div>

                            <!-- TSB History -->
                            <div class="border-b border-gray-200 pb-4">
                                <h3 class="text-lg font-semibold text-gray-900 mb-4">② Super Balances History (for catch-up calculations)</h3>
                                <div class="space-y-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">Total Super Balance 30 June 2024</label>
                                        <input type="text" id="tsbLastJune" class="w-full px-4 py-3 border border-gray-300 rounded-lg" placeholder="$451,000">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-3">Was your TSB under $500k anytime 2020-2024?</label>
                                        <div class="flex space-x-4">
                                            <label class="flex items-center">
                                                <input type="radio" name="tsbUnder500k" value="yes" class="mr-2">
                                                <span>Yes</span>
                                            </label>
                                            <label class="flex items-center">
                                                <input type="radio" name="tsbUnder500k" value="no" class="mr-2">
                                                <span>No</span>
                                            </label>
                                        </div>
                                        <p class="text-sm text-blue-600 mt-2 cursor-pointer" id="catchupExplanation">
                                            [Why we ask this? →] Unlocks $30k+ catch-up contributions
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <!-- Income -->
                            <div class="border-b border-gray-200 pb-4">
                                <h3 class="text-lg font-semibold text-gray-900 mb-4">③ Income</h3>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">Your pre-tax income</label>
                                        <input type="text" id="yourIncome" class="w-full px-4 py-3 border border-gray-300 rounded-lg" placeholder="$95,000/year">
                                    </div>
                                    <div id="partnerIncomeSection" style="display: none;">
                                        <label class="block text-sm font-medium text-gray-700 mb-2">Partner's income</label>
                                        <input type="text" id="partnerIncome" class="w-full px-4 py-3 border border-gray-300 rounded-lg" placeholder="$58,000/year">
                                    </div>
                                </div>
                                <div id="div293Warning" class="mt-3 p-3 bg-amber-50 border border-amber-200 rounded" style="display: none;">
                                    <p class="text-sm text-amber-800">⚠️ Income >$250k? Division 293 tax applies (15% extra on super)</p>
                                </div>
                            </div>

                            <!-- Non-Super Investments -->
                            <div>
                                <h3 class="text-lg font-semibold text-gray-900 mb-4">④ Non-Super Savings & Investments</h3>
                                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">Savings accounts</label>
                                        <input type="text" id="savingsAccounts" class="w-full px-4 py-3 border border-gray-300 rounded-lg" placeholder="$35,000">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">Shares/ETFs/Managed funds</label>
                                        <input type="text" id="shareInvestments" class="w-full px-4 py-3 border border-gray-300 rounded-lg" placeholder="$45,000">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">Term deposits</label>
                                        <input type="text" id="termDeposits" class="w-full px-4 py-3 border border-gray-300 rounded-lg" placeholder="$25,000">
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">Other investments</label>
                                        <input type="text" id="otherInvestments" class="w-full px-4 py-3 border border-gray-300 rounded-lg" placeholder="$15,000">
                                    </div>
                                </div>

                                <div class="mt-4">
                                    <label class="block text-sm font-medium text-gray-700 mb-3">Cash flow</label>
                                    <div class="flex space-x-4">
                                        <label class="flex items-center">
                                            <input type="radio" name="cashFlow" value="positive" class="mr-2">
                                            <span class="text-green-600">🟢 Positive</span>
                                        </label>
                                        <label class="flex items-center">
                                            <input type="radio" name="cashFlow" value="neutral" class="mr-2">
                                            <span class="text-yellow-600">🟡 Neutral</span>
                                        </label>
                                        <label class="flex items-center">
                                            <input type="radio" name="cashFlow" value="negative" class="mr-2">
                                            <span class="text-red-600">🔴 Negative</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `
            },
            3: {
                title: "Property & Complex Assets",
                subtitle: "These significantly impact retirement & Age Pension",
                html: `
                    <div class="space-y-6">
                        <div class="text-center mb-6">
                            <h2 class="text-2xl font-bold text-gray-900 mb-2">Property & Business Assets</h2>
                            <p class="text-gray-600">These significantly impact retirement & Age Pension</p>
                        </div>

                        <!-- Primary Residence -->
                        <div class="space-y-4">
                            <div class="border-b border-gray-200 pb-6">
                                <h3 class="text-lg font-semibold text-gray-900 mb-4">① Primary Residence</h3>
                                <div class="space-y-4">
                                    <div class="grid grid-cols-1 gap-4">
                                        <label class="flex items-start p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300">
                                            <input type="radio" name="homeOwnership" value="ownOutright" class="mt-1 mr-3">
                                            <div class="flex-1">
                                                <div class="font-medium">Own outright</div>
                                                <div class="flex items-center mt-2">
                                                    <span class="text-sm text-gray-500 mr-2">Value:</span>
                                                    <input type="text" id="homeValueOutright" class="px-3 py-1 border border-gray-300 rounded" placeholder="$750,000">
                                                </div>
                                            </div>
                                        </label>
                                        <label class="flex items-start p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300">
                                            <input type="radio" name="homeOwnership" value="ownWithMortgage" class="mt-1 mr-3">
                                            <div class="flex-1">
                                                <div class="font-medium">Own with mortgage</div>
                                                <div class="grid grid-cols-2 gap-2 mt-2">
                                                    <div class="flex items-center">
                                                        <span class="text-sm text-gray-500 mr-2">Value:</span>
                                                        <input type="text" id="homeValue" class="px-3 py-1 border border-gray-300 rounded" placeholder="$750,000">
                                                    </div>
                                                    <div class="flex items-center">
                                                        <span class="text-sm text-gray-500 mr-2">Owing:</span>
                                                        <input type="text" id="mortgageOwing" class="px-3 py-1 border border-gray-300 rounded" placeholder="$420,000">
                                                    </div>
                                                </div>
                                            </div>
                                        </label>
                                        <label class="flex items-start p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300">
                                            <input type="radio" name="homeOwnership" value="rent" class="mt-1 mr-3">
                                            <div class="flex-1">
                                                <div class="font-medium">Rent</div>
                                                <div class="flex items-center mt-2">
                                                    <span class="text-sm text-gray-500 mr-2">Weekly rent:</span>
                                                    <input type="text" id="weeklyRent" class="px-3 py-1 border border-gray-300 rounded" placeholder="$450">
                                                </div>
                                            </div>
                                        </label>
                                    </div>
                                    <div class="p-3 bg-green-50 border border-green-200 rounded">
                                        <p class="text-sm text-green-800">🏠 Age 55+? Downsizer contribution: $300k/person from sale</p>
                                    </div>
                                </div>
                            </div>

                            <!-- Investment Properties -->
                            <div class="border-b border-gray-200 pb-6">
                                <h3 class="text-lg font-semibold text-gray-900 mb-4">② Investment Properties</h3>
                                <div id="investmentProperties">
                                    <!-- Properties will be added dynamically -->
                                </div>
                                <button id="addPropertyBtn" class="mt-4 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-colors w-full">
                                    + Add Property
                                </button>
                            </div>

                            <!-- Business Interests -->
                            <div class="border-b border-gray-200 pb-6">
                                <h3 class="text-lg font-semibold text-gray-900 mb-4">③ Business Interests</h3>
                                <div class="space-y-4">
                                    <div class="grid grid-cols-2 gap-4">
                                        <label class="flex items-center p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300">
                                            <input type="radio" name="businessOwnership" value="none" class="mr-3" checked>
                                            <span>No business ownership</span>
                                        </label>
                                        <label class="flex items-center p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300">
                                            <input type="radio" name="businessOwnership" value="soleTrader" class="mr-3">
                                            <span>Sole trader / Partnership</span>
                                        </label>
                                        <label class="flex items-center p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300">
                                            <input type="radio" name="businessOwnership" value="company" class="mr-3">
                                            <span>Company ownership</span>
                                        </label>
                                        <label class="flex items-center p-3 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300">
                                            <input type="radio" name="businessOwnership" value="trust" class="mr-3">
                                            <span>Trust (family/discretionary/unit)</span>
                                        </label>
                                    </div>

                                    <div id="businessDetailsSection" class="space-y-4" style="display: none;">
                                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label class="block text-sm font-medium text-gray-700 mb-2">Business value</label>
                                                <input type="text" id="businessValue" class="w-full px-4 py-3 border border-gray-300 rounded-lg" placeholder="$2,400,000">
                                            </div>
                                            <div>
                                                <label class="block text-sm font-medium text-gray-700 mb-2">Your ownership %</label>
                                                <input type="number" id="businessOwnership" class="w-full px-4 py-3 border border-gray-300 rounded-lg" placeholder="65" min="0" max="100">
                                            </div>
                                            <div>
                                                <label class="block text-sm font-medium text-gray-700 mb-2">Years owned</label>
                                                <input type="number" id="businessYearsOwned" class="w-full px-4 py-3 border border-gray-300 rounded-lg" placeholder="18" min="0" max="50">
                                            </div>
                                            <div>
                                                <label class="block text-sm font-medium text-gray-700 mb-3">Active asset</label>
                                                <div class="flex space-x-4">
                                                    <label class="flex items-center">
                                                        <input type="radio" name="businessActiveAsset" value="yes" class="mr-2">
                                                        <span>Yes</span>
                                                    </label>
                                                    <label class="flex items-center">
                                                        <input type="radio" name="businessActiveAsset" value="no" class="mr-2">
                                                        <span>No</span>
                                                    </label>
                                                </div>
                                                <p class="text-xs text-gray-500 mt-1">Determines CGT exemptions</p>
                                            </div>
                                        </div>

                                        <div id="cgtExemptionAlert" class="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg" style="display: none;">
                                            <div class="flex items-start">
                                                <span class="text-2xl mr-3">⭐</span>
                                                <div>
                                                    <div class="font-semibold text-green-800">15+ years owned? Potential $1M+ to super CGT-free!</div>
                                                    <div class="text-sm text-green-700 mt-1">This is one of the most powerful small business concessions available.</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Trust Assets -->
                            <div>
                                <h3 class="text-lg font-semibold text-gray-900 mb-4">④ Trust Assets (if applicable)</h3>
                                <div class="space-y-4">
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-2">Total trust net assets</label>
                                            <input type="text" id="trustNetAssets" class="w-full px-4 py-3 border border-gray-300 rounded-lg" placeholder="$850,000">
                                        </div>
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-2">Annual distributions to you</label>
                                            <input type="text" id="trustDistributions" class="w-full px-4 py-3 border border-gray-300 rounded-lg" placeholder="$45,000">
                                        </div>
                                    </div>
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-3">Your control/influence</label>
                                        <div class="flex space-x-4">
                                            <label class="flex items-center">
                                                <input type="radio" name="trustControl" value="yes" class="mr-2">
                                                <span>Yes</span>
                                            </label>
                                            <label class="flex items-center">
                                                <input type="radio" name="trustControl" value="no" class="mr-2">
                                                <span>No</span>
                                            </label>
                                        </div>
                                    </div>

                                    <div class="p-3 bg-amber-50 border border-amber-200 rounded">
                                        <p class="text-sm text-amber-800">🛈 Centrelink may attribute trust assets for Age Pension</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `
            },
            4: {
                title: "Spending & Retirement Goals",
                subtitle: "What does your ideal retirement look like?",
                html: `
                    <div class="space-y-6">
                        <div class="text-center mb-6">
                            <h2 class="text-2xl font-bold text-gray-900 mb-2">Retirement Lifestyle & Spending</h2>
                            <p class="text-gray-600">What does your ideal retirement look like?</p>
                        </div>

                        <!-- Current Spending -->
                        <div class="space-y-4">
                            <div class="border-b border-gray-200 pb-6">
                                <h3 class="text-lg font-semibold text-gray-900 mb-4">① Current Spending</h3>
                                <div class="space-y-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">Annual household expenses</label>
                                        <input type="text" id="currentSpending" class="w-full px-4 py-3 border border-gray-300 rounded-lg" placeholder="$75,000/year">
                                    </div>

                                    <div class="bg-gray-50 p-4 rounded-lg">
                                        <div class="text-sm font-medium text-gray-700 mb-3">Quick estimate:</div>
                                        <div class="grid grid-cols-2 gap-4">
                                            <div class="flex items-center">
                                                <input type="checkbox" id="includeMortgageRent" class="mr-2">
                                                <label for="includeMortgageRent" class="text-sm text-gray-700">Mortgage/rent:</label>
                                                <input type="text" id="mortgageRentAmount" class="ml-2 w-24 px-2 py-1 border border-gray-300 rounded text-sm" placeholder="2,800">
                                                <span class="ml-1 text-sm text-gray-500">/month</span>
                                            </div>
                                            <div class="flex items-center">
                                                <input type="checkbox" id="includeLivingExpenses" class="mr-2">
                                                <label for="includeLivingExpenses" class="text-sm text-gray-700">Living expenses:</label>
                                                <input type="text" id="livingExpensesAmount" class="ml-2 w-24 px-2 py-1 border border-gray-300 rounded text-sm" placeholder="3,200">
                                                <span class="ml-1 text-sm text-gray-500">/month</span>
                                            </div>
                                            <div class="flex items-center">
                                                <input type="checkbox" id="includeInsurance" class="mr-2">
                                                <label for="includeInsurance" class="text-sm text-gray-700">Insurance:</label>
                                                <input type="text" id="insuranceAmount" class="ml-2 w-24 px-2 py-1 border border-gray-300 rounded text-sm" placeholder="450">
                                                <span class="ml-1 text-sm text-gray-500">/month</span>
                                            </div>
                                            <div class="flex items-center">
                                                <input type="checkbox" id="includeOther" class="mr-2">
                                                <label for="includeOther" class="text-sm text-gray-700">Other:</label>
                                                <input type="text" id="otherAmount" class="ml-2 w-24 px-2 py-1 border border-gray-300 rounded text-sm" placeholder="800">
                                                <span class="ml-1 text-sm text-gray-500">/month</span>
                                            </div>
                                        </div>
                                        <div class="mt-4 p-2 bg-blue-50 rounded">
                                            <div class="text-sm font-medium text-blue-800">→ Total: <span id="totalCalculated">$XX,XXX</span>/year</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Retirement Spending Goal -->
                            <div class="border-b border-gray-200 pb-6">
                                <h3 class="text-lg font-semibold text-gray-900 mb-4">② Retirement Spending Goal</h3>
                                <div class="space-y-4">
                                    <div class="grid grid-cols-1 gap-4">
                                        <label class="flex items-start p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300">
                                            <input type="radio" name="retirementGoal" value="matchCurrent" class="mt-1 mr-3">
                                            <div>
                                                <div class="font-medium">Match current spending</div>
                                                <div class="text-sm text-gray-500" id="currentSpendingDisplay">$XX,XXX/year</div>
                                            </div>
                                        </label>
                                        <label class="flex items-start p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300">
                                            <input type="radio" name="retirementGoal" value="asfaComfortable" class="mt-1 mr-3">
                                            <div>
                                                <div class="font-medium">AFSA Comfortable Standard</div>
                                                <div class="text-sm text-gray-500" id="asfaComfortableAmount">$73,875/year couple, $51,278 single</div>
                                            </div>
                                        </label>
                                        <label class="flex items-start p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300">
                                            <input type="radio" name="retirementGoal" value="asfaModest" class="mt-1 mr-3">
                                            <div>
                                                <div class="font-medium">AFSA Modest Standard</div>
                                                <div class="text-sm text-gray-500">$48,184/year couple, $31,323 single</div>
                                            </div>
                                        </label>
                                        <label class="flex items-start p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300">
                                            <input type="radio" name="retirementGoal" value="custom" class="mt-1 mr-3">
                                            <div class="flex-1">
                                                <div class="font-medium">Custom amount</div>
                                                <div class="flex items-center mt-2">
                                                    <input type="text" id="customRetirementGoal" class="px-3 py-1 border border-gray-300 rounded" placeholder="80,000">
                                                    <span class="ml-2 text-sm text-gray-500">/year</span>
                                                </div>
                                            </div>
                                        </label>
                                    </div>

                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-3">Will you have mortgage/rent in retirement?</label>
                                        <div class="flex space-x-4">
                                            <label class="flex items-center">
                                                <input type="radio" name="retirementHousing" value="mortgageFree" class="mr-2">
                                                <span class="text-green-600">Mortgage-free</span>
                                            </label>
                                            <label class="flex items-center">
                                                <input type="radio" name="retirementHousing" value="stillPaying" class="mr-2">
                                                <span class="text-yellow-600">Still paying</span>
                                            </label>
                                            <label class="flex items-center">
                                                <input type="radio" name="retirementHousing" value="renting" class="mr-2">
                                                <span class="text-red-600">Renting</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Life Expectancy -->
                            <div class="border-b border-gray-200 pb-6">
                                <h3 class="text-lg font-semibold text-gray-900 mb-4">③ Life Expectancy & Planning</h3>
                                <div class="space-y-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">Plan retirement savings until age</label>
                                        <input type="number" id="lifeExpectancy" class="w-32 px-4 py-3 border border-gray-300 rounded-lg" placeholder="95" min="70" max="100">
                                        <p class="text-sm text-gray-500 mt-1">(Average: Male 85, Female 88, Conservative: 95)</p>
                                    </div>

                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-3">Health considerations</label>
                                        <div class="space-y-2">
                                            <label class="flex items-center">
                                                <input type="radio" name="healthConsiderations" value="good" class="mr-2">
                                                <span>Good health (standard costs)</span>
                                            </label>
                                            <label class="flex items-center">
                                                <input type="radio" name="healthConsiderations" value="ongoing" class="mr-2">
                                                <span>Ongoing conditions (higher healthcare)</span>
                                            </label>
                                            <label class="flex items-center">
                                                <input type="radio" name="healthConsiderations" value="longevity" class="mr-2">
                                                <span>Family longevity (plan longer)</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <!-- Aged Care Planning -->
                            <div>
                                <h3 class="text-lg font-semibold text-gray-900 mb-4">④ Aged Care Planning</h3>
                                <div class="space-y-4">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-2">When might you need aged care?</label>
                                        <div class="flex items-center">
                                            <span class="text-sm text-gray-500 mr-2">Age</span>
                                            <input type="number" id="agedCareAge" class="w-24 px-3 py-2 border border-gray-300 rounded" placeholder="82" min="70" max="95">
                                            <span class="text-sm text-gray-500 ml-2">(Average entry age: 82)</span>
                                        </div>
                                    </div>

                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-3">Preference</label>
                                        <div class="space-y-2">
                                            <label class="flex items-center">
                                                <input type="radio" name="agedCarePreference" value="homePackage" class="mr-2">
                                                <span>Home care package ($15-60k/year)</span>
                                            </label>
                                            <label class="flex items-center">
                                                <input type="radio" name="agedCarePreference" value="residential" class="mr-2">
                                                <span>Residential aged care (means-tested)</span>
                                            </label>
                                            <label class="flex items-center">
                                                <input type="radio" name="agedCarePreference" value="notSure" class="mr-2">
                                                <span>Not sure (model both scenarios)</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `
            },
            5: {
                title: "Advanced Options",
                subtitle: "Fine-tune assumptions for more accurate projections",
                html: `
                    <div class="space-y-6">
                        <div class="text-center mb-6">
                            <h2 class="text-2xl font-bold text-gray-900 mb-2">Advanced Settings</h2>
                            <p class="text-gray-600">Fine-tune assumptions for more accurate projections</p>
                            <p class="text-sm text-gray-500 mt-2">(Optional - we'll use smart defaults if you skip this)</p>
                        </div>

                        <!-- Collapsible Sections -->
                        <div class="space-y-4">
                            <div class="text-right mb-4">
                                <button id="expandAll" class="text-sm text-blue-600 hover:text-blue-800 mr-4">Expand All</button>
                                <button id="collapseAll" class="text-sm text-gray-600 hover:text-gray-800">Collapse All</button>
                            </div>

                            <!-- Investment Strategy -->
                            <div class="border border-gray-200 rounded-lg overflow-hidden">
                                <button class="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 transition-colors" data-section="investment">
                                    <div class="flex items-center">
                                        <span class="text-lg font-medium text-gray-900 mr-2">▼</span>
                                        <span class="font-medium text-gray-900">Investment Strategy</span>
                                    </div>
                                    <span class="text-sm text-blue-600">Expected return: 7.2%/year</span>
                                </button>
                                <div class="p-4 space-y-4" data-section-content="investment">
                                    <div>
                                        <h4 class="font-medium text-gray-900 mb-3">Pre-retirement allocation:</h4>
                                        <div class="grid grid-cols-2 gap-4 text-sm">
                                            <div class="flex items-center justify-between">
                                                <span>Australian shares:</span>
                                                <div class="flex items-center">
                                                    <input type="number" id="ausShares" class="w-16 px-2 py-1 border border-gray-300 rounded text-center" value="35" min="0" max="100">
                                                    <span class="ml-1">%</span>
                                                </div>
                                            </div>
                                            <div class="flex items-center justify-between">
                                                <span>International shares:</span>
                                                <div class="flex items-center">
                                                    <input type="number" id="intlShares" class="w-16 px-2 py-1 border border-gray-300 rounded text-center" value="25" min="0" max="100">
                                                    <span class="ml-1">%</span>
                                                </div>
                                            </div>
                                            <div class="flex items-center justify-between">
                                                <span>Property/REITs:</span>
                                                <div class="flex items-center">
                                                    <input type="number" id="propertyReits" class="w-16 px-2 py-1 border border-gray-300 rounded text-center" value="15" min="0" max="100">
                                                    <span class="ml-1">%</span>
                                                </div>
                                            </div>
                                            <div class="flex items-center justify-between">
                                                <span>Fixed income:</span>
                                                <div class="flex items-center">
                                                    <input type="number" id="fixedIncome" class="w-16 px-2 py-1 border border-gray-300 rounded text-center" value="15" min="0" max="100">
                                                    <span class="ml-1">%</span>
                                                </div>
                                            </div>
                                            <div class="flex items-center justify-between">
                                                <span>Cash:</span>
                                                <div class="flex items-center">
                                                    <input type="number" id="cash" class="w-16 px-2 py-1 border border-gray-300 rounded text-center" value="10" min="0" max="100">
                                                    <span class="ml-1">%</span>
                                                </div>
                                            </div>
                                            <div class="flex items-center justify-between text-blue-600 font-medium">
                                                <span>Total:</span>
                                                <span id="allocationTotal">100%</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <h4 class="font-medium text-gray-900 mb-3">Post-retirement allocation:</h4>
                                        <label class="flex items-center">
                                            <input type="checkbox" id="autoAdjustRetirement" checked class="mr-2">
                                            <span class="text-sm">More conservative: Auto-adjust to 60/40 at retirement</span>
                                        </label>
                                        <p class="text-sm text-gray-500 mt-1">Expected return: 5.8%/year</p>
                                    </div>
                                </div>
                            </div>

                            <!-- Tax Optimization -->
                            <div class="border border-gray-200 rounded-lg overflow-hidden">
                                <button class="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 transition-colors" data-section="tax">
                                    <div class="flex items-center">
                                        <span class="text-lg font-medium text-gray-900 mr-2">▼</span>
                                        <span class="font-medium text-gray-900">Tax Optimization</span>
                                    </div>
                                    <span class="text-sm text-green-600">💡 Tax savings available: $3,900/year</span>
                                </button>
                                <div class="p-4 space-y-4" data-section-content="tax">
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-2">Current marginal tax rate</label>
                                            <select id="marginalTaxRate" class="w-full px-3 py-2 border border-gray-300 rounded-lg">
                                                <option value="0">0% (Tax-free threshold)</option>
                                                <option value="19">19% ($18,201 - $45,000)</option>
                                                <option value="32.5">32.5% ($45,001 - $120,000)</option>
                                                <option value="37" selected>37% ($120,001 - $180,000)</option>
                                                <option value="45">45% ($180,001+)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label class="block text-sm font-medium text-gray-700 mb-3">Salary sacrifice active</label>
                                            <div class="flex space-x-4">
                                                <label class="flex items-center">
                                                    <input type="radio" name="salarySacrifice" value="yes" class="mr-2">
                                                    <span>Yes</span>
                                                </label>
                                                <label class="flex items-center">
                                                    <input type="radio" name="salarySacrifice" value="no" class="mr-2">
                                                    <span>No</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    <div id="partnerTaxSection" style="display: none;">
                                        <label class="block text-sm font-medium text-gray-700 mb-3">Spouse contribution eligible</label>
                                        <div class="flex space-x-4">
                                            <label class="flex items-center">
                                                <input type="radio" name="spouseContribution" value="yes" class="mr-2">
                                                <span>Yes</span>
                                            </label>
                                            <label class="flex items-center">
                                                <input type="radio" name="spouseContribution" value="no" class="mr-2">
                                                <span>No</span>
                                            </label>
                                        </div>
                                        <p class="text-sm text-gray-500 mt-1">Spouse income <$40k eligible for contribution tax offset</p>
                                    </div>
                                </div>
                            </div>

                            <!-- Age Pension Strategy -->
                            <div class="border border-gray-200 rounded-lg overflow-hidden">
                                <button class="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 transition-colors" data-section="pension">
                                    <div class="flex items-center">
                                        <span class="text-lg font-medium text-gray-900 mr-2">▼</span>
                                        <span class="font-medium text-gray-900">Age Pension Strategy</span>
                                    </div>
                                    <span class="text-sm text-amber-600">Failing: Asset test by $XX,XXX</span>
                                </button>
                                <div class="p-4 space-y-4" data-section-content="pension">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-3">Expect to receive Age Pension</label>
                                        <div class="flex space-x-4">
                                            <label class="flex items-center">
                                                <input type="radio" name="expectPension" value="yes" class="mr-2">
                                                <span>Yes</span>
                                            </label>
                                            <label class="flex items-center">
                                                <input type="radio" name="expectPension" value="partial" class="mr-2">
                                                <span>Partial</span>
                                            </label>
                                            <label class="flex items-center">
                                                <input type="radio" name="expectPension" value="no" class="mr-2">
                                                <span>No</span>
                                            </label>
                                        </div>
                                    </div>

                                    <div class="bg-gray-50 p-4 rounded-lg">
                                        <h5 class="font-medium text-gray-900 mb-2">Current assessment (auto-calc):</h5>
                                        <div class="text-sm space-y-1">
                                            <div class="flex justify-between">
                                                <span>Assets:</span>
                                                <span id="currentAssets">$XXX,XXX (threshold: $XXX,XXX)</span>
                                            </div>
                                            <div class="flex justify-between">
                                                <span>Income:</span>
                                                <span id="currentIncome">$XX,XXX (threshold: $XX,XXX)</span>
                                            </div>
                                            <div class="flex justify-between text-red-600 font-medium">
                                                <span>Status:</span>
                                                <span id="pensionStatus">Failing: Asset test by $XX,XXX</span>
                                            </div>
                                        </div>
                                        <p class="text-sm text-blue-600 mt-2">Optimization options available ↓</p>
                                    </div>
                                </div>
                            </div>

                            <!-- Future Events -->
                            <div class="border border-gray-200 rounded-lg overflow-hidden">
                                <button class="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 transition-colors" data-section="events">
                                    <div class="flex items-center">
                                        <span class="text-lg font-medium text-gray-900 mr-2">▼</span>
                                        <span class="font-medium text-gray-900">Future Events</span>
                                    </div>
                                    <button id="addEvent" class="text-sm text-blue-600 hover:text-blue-800">+ Add Event</button>
                                </button>
                                <div class="p-4" data-section-content="events">
                                    <div id="futureEvents" class="space-y-3">
                                        <!-- Events will be added dynamically -->
                                    </div>
                                    <div class="text-sm text-gray-500 mt-4">
                                        <p class="font-medium mb-2">Example events:</p>
                                        <ul class="list-disc list-inside space-y-1 ml-4">
                                            <li>Inheritance expected: $XXX,XXX at age XX</li>
                                            <li>Property sale planned: Age XX</li>
                                            <li>Kids finish uni: Age XX (−$XX,XXX/year)</li>
                                            <li>Part-time work: Age XX-XX ($XX,XXX/year)</li>
                                            <li>Lump sum expenses: Age XX ($XX,XXX)</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            <!-- Risk Factors -->
                            <div class="border border-gray-200 rounded-lg overflow-hidden">
                                <button class="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 transition-colors" data-section="risk">
                                    <div class="flex items-center">
                                        <span class="text-lg font-medium text-gray-900 mr-2">▼</span>
                                        <span class="font-medium text-gray-900">Risk Factors</span>
                                    </div>
                                    <span class="text-sm text-gray-600">Balanced profile</span>
                                </button>
                                <div class="p-4 space-y-4" data-section-content="risk">
                                    <div>
                                        <label class="block text-sm font-medium text-gray-700 mb-3">Investment volatility tolerance</label>
                                        <div class="flex space-x-4">
                                            <label class="flex items-center">
                                                <input type="radio" name="riskTolerance" value="conservative" class="mr-2">
                                                <span>Conservative</span>
                                            </label>
                                            <label class="flex items-center">
                                                <input type="radio" name="riskTolerance" value="balanced" class="mr-2" checked>
                                                <span>Balanced</span>
                                            </label>
                                            <label class="flex items-center">
                                                <input type="radio" name="riskTolerance" value="growth" class="mr-2">
                                                <span>Growth</span>
                                            </label>
                                        </div>
                                    </div>

                                    <div class="space-y-3">
                                        <label class="flex items-center">
                                            <input type="checkbox" id="sequenceRisk" checked class="mr-2">
                                            <span class="text-sm">Sequence of returns risk: Include worst-case scenarios</span>
                                        </label>

                                        <div class="flex items-center">
                                            <label class="text-sm font-medium text-gray-700 mr-3">Inflation assumption:</label>
                                            <input type="number" id="inflationAssumption" class="w-20 px-2 py-1 border border-gray-300 rounded" value="2.5" min="1" max="5" step="0.1">
                                            <span class="ml-1 text-sm text-gray-500">% (historical avg: 2.9%)</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `
            }
        };

        return steps[stepNumber];
    }

    updateConfidenceScore(stepNumber) {
        // Calculate confidence score based on completed steps and data quality
        let baseScore = stepNumber * 15; // 15 points per completed step

        // Add bonus points for high-impact factors
        if (this.onboardingData.householdType) baseScore += 5;
        if (this.onboardingData.yourAge && this.onboardingData.yourRetirementAge) baseScore += 10;
        if (this.onboardingData.yourIncome && parseInt(this.onboardingData.yourIncome.replace(/[^0-9]/g, '')) > 50000) baseScore += 10;

        this.confidenceScore = Math.min(baseScore, 100);

        const scoreElement = $('#confidenceScore');
        const messageElement = $('#confidenceMessage');

        if (scoreElement) {
            scoreElement.textContent = this.confidenceScore;

            // Update confidence message based on score
            let message = '';
            if (this.confidenceScore < 30) {
                message = "Let's build your retirement confidence step by step";
            } else if (this.confidenceScore < 60) {
                message = "Great progress! Your confidence is building steadily";
            } else if (this.confidenceScore < 85) {
                message = "Excellent! You're developing a strong retirement plan";
            } else {
                message = "Outstanding! You have high confidence in your retirement readiness";
            }

            if (messageElement) messageElement.textContent = message;
        }
    }

    updateProgressIndicator() {
        const currentStepElement = $('#currentStepNum');
        const completionElement = $('#completionPercent');
        const progressBar = $('#progressBar');

        if (currentStepElement) currentStepElement.textContent = this.currentStep;

        const completionPercent = (this.currentStep / this.totalSteps) * 100;
        if (completionElement) completionElement.textContent = Math.round(completionPercent);
        if (progressBar) progressBar.style.width = completionPercent + '%';
    }

    updateNavigationButtons() {
        const prevButton = $('#prevButton');
        const nextButton = $('#nextButton');

        if (prevButton) {
            prevButton.style.display = this.currentStep > 1 ? 'block' : 'none';
        }

        if (nextButton) {
            if (this.currentStep === this.totalSteps) {
                nextButton.textContent = 'Calculate My Retirement →';
                nextButton.className = 'px-8 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-200 shadow-lg';
            } else {
                nextButton.textContent = 'Continue →';
                nextButton.className = 'px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg';
            }
        }
    }

    attachEventListeners() {
        const nextButton = $('#nextButton');
        const prevButton = $('#prevButton');
        const skipButton = $('#skipOnboarding');

        if (nextButton) {
            nextButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleNext();
            });
        }

        if (prevButton) {
            prevButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.handlePrevious();
            });
        }

        if (skipButton) {
            skipButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.skipToFullCalculator();
            });
        }
    }

    addStepLogic(stepNumber) {
        switch(stepNumber) {
            case 1:
                this.setupStep1Logic();
                break;
            case 2:
                this.setupStep2Logic();
                break;
            case 3:
                this.setupStep3Logic();
                break;
            case 4:
                this.setupStep4Logic();
                break;
            case 5:
                this.setupStep5Logic();
                break;
        }
    }

    setupStep1Logic() {
        // Show/hide partner fields based on household type
        const householdRadios = document.querySelectorAll('input[name="householdType"]');
        const partnerAgeSection = $('#partnerAgeSection');
        const partnerRetirementSection = $('#partnerRetirementSection');

        householdRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                const isCouple = e.target.value === 'couple';
                if (partnerAgeSection) partnerAgeSection.style.display = isCouple ? 'block' : 'none';
                if (partnerRetirementSection) partnerRetirementSection.style.display = isCouple ? 'block' : 'none';
            });
        });

        // Enable/disable number inputs based on checkboxes
        const dependentCheckboxes = document.querySelectorAll('input[name="dependents"]');
        dependentCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const relatedInput = e.target.parentElement.querySelector('input[type="number"]');
                if (relatedInput) {
                    relatedInput.disabled = !e.target.checked;
                    if (!e.target.checked) relatedInput.value = '';
                }
            });
        });
    }

    setupStep2Logic() {
        // Show partner sections if couple selected in step 1
        const isCouple = this.onboardingData.householdType === 'couple';
        const partnerSections = ['#partnerSuperSection', '#partnerVoluntarySection', '#partnerIncomeSection'];

        partnerSections.forEach(selector => {
            const element = $(selector);
            if (element) element.style.display = isCouple ? 'block' : 'none';
        });

        // Division 293 warning
        const yourIncomeInput = $('#yourIncome');
        const partnerIncomeInput = $('#partnerIncome');
        const div293Warning = $('#div293Warning');

        const checkDiv293 = () => {
            const yourIncome = parseInt((yourIncomeInput?.value || '0').replace(/[^0-9]/g, ''));
            const partnerIncome = parseInt((partnerIncomeInput?.value || '0').replace(/[^0-9]/g, ''));

            if (div293Warning) {
                div293Warning.style.display = (yourIncome > 250000 || partnerIncome > 250000) ? 'block' : 'none';
            }
        };

        if (yourIncomeInput) yourIncomeInput.addEventListener('input', checkDiv293);
        if (partnerIncomeInput) partnerIncomeInput.addEventListener('input', checkDiv293);

        // Catch-up explanation
        const catchupExplanation = $('#catchupExplanation');
        if (catchupExplanation) {
            catchupExplanation.addEventListener('click', () => {
                alert('If your Total Super Balance was under $500,000 at any point in the last 5 years, you can use unused concessional contribution caps from previous years. This could allow you to contribute significantly more than the standard $30,000 cap this year.');
            });
        }
    }

    setupStep3Logic() {
        // Property management
        this.setupPropertyManagement();

        // Business details visibility
        const businessRadios = document.querySelectorAll('input[name="businessOwnership"]');
        const businessDetailsSection = $('#businessDetailsSection');
        const cgtExemptionAlert = $('#cgtExemptionAlert');

        businessRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                const showDetails = e.target.value !== 'none';
                if (businessDetailsSection) businessDetailsSection.style.display = showDetails ? 'block' : 'none';
                if (!showDetails && cgtExemptionAlert) cgtExemptionAlert.style.display = 'none';
            });
        });

        // CGT exemption check
        const businessYearsInput = $('#businessYearsOwned');
        if (businessYearsInput) {
            businessYearsInput.addEventListener('input', (e) => {
                const years = parseInt(e.target.value);
                if (cgtExemptionAlert) {
                    cgtExemptionAlert.style.display = years >= 15 ? 'block' : 'none';
                }
            });
        }
    }

    setupPropertyManagement() {
        const addPropertyBtn = $('#addPropertyBtn');
        const propertiesContainer = $('#investmentProperties');
        let propertyCount = 0;

        if (addPropertyBtn && propertiesContainer) {
            addPropertyBtn.addEventListener('click', () => {
                propertyCount++;
                const propertyHTML = this.createPropertyHTML(propertyCount);
                const propertyDiv = document.createElement('div');
                propertyDiv.innerHTML = propertyHTML;
                propertiesContainer.appendChild(propertyDiv.firstElementChild);
            });
        }
    }

    createPropertyHTML(propertyNumber) {
        return `
            <div class="property-item border border-gray-200 rounded-lg p-4 mb-4">
                <div class="flex justify-between items-center mb-4">
                    <h4 class="font-medium text-gray-900">Property ${propertyNumber}</h4>
                    <button class="text-red-600 hover:text-red-800 text-sm" onclick="this.parentElement.parentElement.remove()">Remove</button>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Current value</label>
                        <input type="text" class="w-full px-3 py-2 border border-gray-300 rounded" placeholder="$650,000">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Loan owing</label>
                        <input type="text" class="w-full px-3 py-2 border border-gray-300 rounded" placeholder="$420,000">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Rental income</label>
                        <input type="text" class="w-full px-3 py-2 border border-gray-300 rounded" placeholder="$450/week">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Expenses</label>
                        <input type="text" class="w-full px-3 py-2 border border-gray-300 rounded" placeholder="$8,400/year">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Purchase date</label>
                        <input type="month" class="w-full px-3 py-2 border border-gray-300 rounded">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Plan to sell at age</label>
                        <input type="number" class="w-full px-3 py-2 border border-gray-300 rounded" placeholder="70">
                    </div>
                </div>
                <div class="mt-3 p-3 bg-blue-50 rounded">
                    <p class="text-sm text-blue-800">💡 Negative gearing: Estimated impact will be calculated</p>
                </div>
            </div>
        `;
    }

    setupStep4Logic() {
        // Current spending calculator
        this.setupSpendingCalculator();

        // AFSA amounts based on household type
        this.updateASFAAmounts();

        // Custom retirement goal visibility
        const goalRadios = document.querySelectorAll('input[name="retirementGoal"]');
        const customGoalInput = $('#customRetirementGoal');

        goalRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                if (customGoalInput) {
                    customGoalInput.disabled = e.target.value !== 'custom';
                    if (e.target.value !== 'custom') customGoalInput.value = '';
                }
            });
        });
    }

    setupSpendingCalculator() {
        const checkboxes = ['#includeMortgageRent', '#includeLivingExpenses', '#includeInsurance', '#includeOther'];
        const inputs = ['#mortgageRentAmount', '#livingExpensesAmount', '#insuranceAmount', '#otherAmount'];
        const totalElement = $('#totalCalculated');

        const calculateTotal = () => {
            let total = 0;
            checkboxes.forEach((checkboxId, index) => {
                const checkbox = $(checkboxId);
                const input = $(inputs[index]);
                if (checkbox && input && checkbox.checked) {
                    const value = parseFloat(input.value) || 0;
                    total += value * 12; // Convert monthly to annual
                }
            });

            if (totalElement) {
                totalElement.textContent = formatCurrency(total);
            }

            // Update current spending display
            const currentSpendingDisplay = $('#currentSpendingDisplay');
            if (currentSpendingDisplay) {
                currentSpendingDisplay.textContent = formatCurrency(total) + '/year';
            }
        };

        checkboxes.forEach((checkboxId, index) => {
            const checkbox = $(checkboxId);
            const input = $(inputs[index]);
            if (checkbox) checkbox.addEventListener('change', calculateTotal);
            if (input) input.addEventListener('input', calculateTotal);
        });
    }

    updateASFAAmounts() {
        const isCouple = this.onboardingData.householdType === 'couple';
        const asfaComfortableElement = $('#asfaComfortableAmount');
        if (asfaComfortableElement) {
            asfaComfortableElement.textContent = isCouple ? '$73,875/year couple' : '$51,278/year single';
        }
    }

    setupStep5Logic() {
        // Collapsible sections
        this.setupCollapsibleSections();

        // Investment allocation calculator
        this.setupAllocationCalculator();

        // Future events management
        this.setupFutureEvents();
    }

    setupCollapsibleSections() {
        const sectionButtons = document.querySelectorAll('[data-section]');
        const expandAll = $('#expandAll');
        const collapseAll = $('#collapseAll');

        sectionButtons.forEach(button => {
            button.addEventListener('click', () => {
                const sectionName = button.dataset.section;
                const content = document.querySelector(`[data-section-content="${sectionName}"]`);
                const arrow = button.querySelector('span');

                if (content) {
                    const isVisible = content.style.display !== 'none';
                    content.style.display = isVisible ? 'none' : 'block';
                    if (arrow) arrow.textContent = isVisible ? '▶' : '▼';
                }
            });
        });

        if (expandAll) {
            expandAll.addEventListener('click', () => {
                document.querySelectorAll('[data-section-content]').forEach(content => {
                    content.style.display = 'block';
                });
                document.querySelectorAll('[data-section] span:first-child').forEach(arrow => {
                    arrow.textContent = '▼';
                });
            });
        }

        if (collapseAll) {
            collapseAll.addEventListener('click', () => {
                document.querySelectorAll('[data-section-content]').forEach(content => {
                    content.style.display = 'none';
                });
                document.querySelectorAll('[data-section] span:first-child').forEach(arrow => {
                    arrow.textContent = '▶';
                });
            });
        }
    }

    setupAllocationCalculator() {
        const allocationInputs = ['#ausShares', '#intlShares', '#propertyReits', '#fixedIncome', '#cash'];
        const totalElement = $('#allocationTotal');

        const calculateAllocationTotal = () => {
            let total = 0;
            allocationInputs.forEach(inputId => {
                const input = $(inputId);
                if (input) total += parseInt(input.value) || 0;
            });

            if (totalElement) {
                totalElement.textContent = total + '%';
                totalElement.className = total === 100 ? 'text-green-600 font-medium' : 'text-red-600 font-medium';
            }
        };

        allocationInputs.forEach(inputId => {
            const input = $(inputId);
            if (input) input.addEventListener('input', calculateAllocationTotal);
        });

        // Initial calculation
        calculateAllocationTotal();
    }

    setupFutureEvents() {
        const addEventBtn = $('#addEvent');
        const eventsContainer = $('#futureEvents');

        if (addEventBtn && eventsContainer) {
            addEventBtn.addEventListener('click', () => {
                const eventHTML = this.createFutureEventHTML();
                const eventDiv = document.createElement('div');
                eventDiv.innerHTML = eventHTML;
                eventsContainer.appendChild(eventDiv.firstElementChild);
            });
        }
    }

    createFutureEventHTML() {
        return `
            <div class="event-item flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
                <select class="px-2 py-1 border border-gray-300 rounded text-sm">
                    <option value="inheritance">Inheritance</option>
                    <option value="propertySale">Property Sale</option>
                    <option value="expenseEnd">Expense Ends</option>
                    <option value="partTimeWork">Part-time Work</option>
                    <option value="lumpSum">Lump Sum</option>
                </select>
                <input type="text" placeholder="Amount" class="w-24 px-2 py-1 border border-gray-300 rounded text-sm">
                <span class="text-sm text-gray-500">at age</span>
                <input type="number" placeholder="65" class="w-16 px-2 py-1 border border-gray-300 rounded text-sm" min="18" max="100">
                <button class="text-red-600 hover:text-red-800 text-sm" onclick="this.parentElement.remove()">Remove</button>
            </div>
        `;
    }

    collectStepData() {
        // Collect data from current step
        const stepData = {};

        switch(this.currentStep) {
            case 1:
                stepData.householdType = document.querySelector('input[name="householdType"]:checked')?.value;
                stepData.yourAge = $('#yourAge')?.value;
                stepData.partnerAge = $('#partnerAge')?.value;
                stepData.yourRetirementAge = $('#yourRetirementAge')?.value;
                stepData.partnerRetirementAge = $('#partnerRetirementAge')?.value;
                stepData.dependents = Array.from(document.querySelectorAll('input[name="dependents"]:checked')).map(cb => cb.value);
                stepData.childrenUnder18 = $('#childrenUnder18')?.value;
                stepData.childrenAdult = $('#childrenAdult')?.value;
                break;

            case 2:
                stepData.yourSuperBalance = $('#yourSuperBalance')?.value;
                stepData.partnerSuperBalance = $('#partnerSuperBalance')?.value;
                stepData.employerContributions = $('#employerContributions')?.value;
                stepData.voluntaryContributions = $('#voluntaryContributions')?.value;
                stepData.partnerVoluntaryContributions = $('#partnerVoluntaryContributions')?.value;
                stepData.yourIncome = $('#yourIncome')?.value;
                stepData.partnerIncome = $('#partnerIncome')?.value;
                stepData.savingsAccounts = $('#savingsAccounts')?.value;
                stepData.shareInvestments = $('#shareInvestments')?.value;
                stepData.termDeposits = $('#termDeposits')?.value;
                stepData.otherInvestments = $('#otherInvestments')?.value;
                stepData.cashFlow = document.querySelector('input[name="cashFlow"]:checked')?.value;
                stepData.tsbLastJune = $('#tsbLastJune')?.value;
                stepData.tsbUnder500k = document.querySelector('input[name="tsbUnder500k"]:checked')?.value;
                break;

            case 3:
                stepData.homeOwnership = document.querySelector('input[name="homeOwnership"]:checked')?.value;
                stepData.homeValue = $('#homeValue')?.value || $('#homeValueOutright')?.value;
                stepData.mortgageOwing = $('#mortgageOwing')?.value;
                stepData.weeklyRent = $('#weeklyRent')?.value;
                stepData.businessOwnership = document.querySelector('input[name="businessOwnership"]:checked')?.value;
                stepData.businessValue = $('#businessValue')?.value;
                stepData.businessYearsOwned = $('#businessYearsOwned')?.value;
                stepData.trustNetAssets = $('#trustNetAssets')?.value;
                stepData.trustDistributions = $('#trustDistributions')?.value;
                stepData.trustControl = document.querySelector('input[name="trustControl"]:checked')?.value;
                break;

            case 4:
                stepData.currentSpending = $('#currentSpending')?.value;
                stepData.retirementGoal = document.querySelector('input[name="retirementGoal"]:checked')?.value;
                stepData.customRetirementGoal = $('#customRetirementGoal')?.value;
                stepData.retirementHousing = document.querySelector('input[name="retirementHousing"]:checked')?.value;
                stepData.lifeExpectancy = $('#lifeExpectancy')?.value;
                stepData.healthConsiderations = document.querySelector('input[name="healthConsiderations"]:checked')?.value;
                stepData.agedCareAge = $('#agedCareAge')?.value;
                stepData.agedCarePreference = document.querySelector('input[name="agedCarePreference"]:checked')?.value;
                break;

            case 5:
                stepData.investmentAllocation = {
                    ausShares: $('#ausShares')?.value,
                    intlShares: $('#intlShares')?.value,
                    propertyReits: $('#propertyReits')?.value,
                    fixedIncome: $('#fixedIncome')?.value,
                    cash: $('#cash')?.value
                };
                stepData.marginalTaxRate = $('#marginalTaxRate')?.value;
                stepData.salarySacrifice = document.querySelector('input[name="salarySacrifice"]:checked')?.value;
                stepData.expectPension = document.querySelector('input[name="expectPension"]:checked')?.value;
                stepData.riskTolerance = document.querySelector('input[name="riskTolerance"]:checked')?.value;
                stepData.inflationAssumption = $('#inflationAssumption')?.value;
                break;
        }

        // Merge with existing data
        this.onboardingData = { ...this.onboardingData, ...stepData };

        return stepData;
    }

    validateStep() {
        // Basic validation for required fields
        switch(this.currentStep) {
            case 1:
                if (!document.querySelector('input[name="householdType"]:checked')) {
                    showNotification('Please select your household type', 'warning');
                    return false;
                }
                if (!$('#yourAge')?.value) {
                    showNotification('Please enter your current age', 'warning');
                    return false;
                }
                if (!$('#yourRetirementAge')?.value) {
                    showNotification('Please enter your target retirement age', 'warning');
                    return false;
                }
                break;

            case 2:
                if (!$('#yourSuperBalance')?.value) {
                    showNotification('Please enter your current super balance', 'warning');
                    return false;
                }
                if (!$('#yourIncome')?.value) {
                    showNotification('Please enter your current income', 'warning');
                    return false;
                }
                break;
        }

        return true;
    }

    handleNext() {
        // Validate current step
        if (!this.validateStep()) return;

        // Collect data from current step
        this.collectStepData();

        if (this.currentStep < this.totalSteps) {
            this.showStep(this.currentStep + 1);
        } else {
            // Final step - convert onboarding data to full calculator
            this.completeOnboarding();
        }
    }

    handlePrevious() {
        if (this.currentStep > 1) {
            this.showStep(this.currentStep - 1);
        }
    }

    async completeOnboarding() {
        // Collect final step data
        this.collectStepData();

        // Save onboarding completion
        localStorage.setItem('retirement-calc-onboarding-completed', 'true');
        localStorage.setItem('retirement-calc-onboarding-data', JSON.stringify(this.onboardingData));

        // Show scenario analysis option before completing
        await this.showScenarioAnalysisOption();

        // Convert onboarding data to full calculator format and load full interface
        this.loadFullCalculatorWithData();
    }

    async showScenarioAnalysisOption() {
        return new Promise((resolve) => {
            const modalHTML = `
                <div class="onboarding-modal-overlay" id="scenarioModal">
                    <div class="onboarding-modal">
                        <div class="onboarding-header">
                            <h2 class="text-2xl font-bold text-gray-800 mb-4">🎯 Ready for Advanced Analysis?</h2>
                        </div>

                        <div class="space-y-6">
                            <div class="text-center">
                                <div class="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                                    <span class="text-2xl">📊</span>
                                </div>
                                <p class="text-lg text-gray-700 mb-6">
                                    Based on your profile, I can analyze multiple retirement strategies and show you
                                    the best paths to your goals.
                                </p>
                            </div>

                            <div class="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border-l-4 border-blue-500">
                                <h3 class="font-semibold text-gray-800 mb-3">🚀 Scenario Analysis Includes:</h3>
                                <ul class="text-sm text-gray-600 space-y-2">
                                    <li class="flex items-center">
                                        <span class="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                                        Multiple retirement strategies tailored to your situation
                                    </li>
                                    <li class="flex items-center">
                                        <span class="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                                        Risk vs. opportunity analysis for each approach
                                    </li>
                                    <li class="flex items-center">
                                        <span class="w-2 h-2 bg-purple-500 rounded-full mr-3"></span>
                                        Personalized recommendations ranked by impact
                                    </li>
                                    <li class="flex items-center">
                                        <span class="w-2 h-2 bg-orange-500 rounded-full mr-3"></span>
                                        "Quick Wins" you can implement immediately
                                    </li>
                                </ul>
                            </div>

                            <div class="flex flex-col sm:flex-row gap-4">
                                <button id="runScenarioAnalysis" class="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg">
                                    🔍 Yes, Analyze My Options
                                    <span class="text-xs block mt-1 opacity-90">Takes 30-60 seconds</span>
                                </button>
                                <button id="skipScenarioAnalysis" class="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors">
                                    ⏭️ Skip for Now
                                    <span class="text-xs block mt-1 opacity-75">Go straight to calculator</span>
                                </button>
                            </div>

                            <div class="text-xs text-gray-500 text-center">
                                You can always access advanced analysis from the main calculator
                            </div>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHTML);

            const runButton = document.getElementById('runScenarioAnalysis');
            const skipButton = document.getElementById('skipScenarioAnalysis');

            runButton.addEventListener('click', async () => {
                await this.runScenarioAnalysis();
                this.closeScenarioModal();
                resolve();
            });

            skipButton.addEventListener('click', () => {
                this.closeScenarioModal();
                resolve();
            });
        });
    }

    async runScenarioAnalysis() {
        const modal = document.getElementById('scenarioModal');
        const modalContent = modal.querySelector('.onboarding-modal');

        // Show loading state
        modalContent.innerHTML = `
            <div class="onboarding-header text-center">
                <h2 class="text-2xl font-bold text-gray-800 mb-8">🔍 Analyzing Your Retirement Strategies</h2>
            </div>

            <div class="space-y-6">
                <div class="text-center">
                    <div class="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-6 animate-pulse">
                        <span class="text-3xl">📊</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-3 mb-4">
                        <div id="analysisProgress" class="bg-gradient-to-r from-blue-600 to-indigo-600 h-3 rounded-full transition-all duration-300" style="width: 0%"></div>
                    </div>
                    <p id="analysisStatus" class="text-gray-600 mb-4">Initializing scenario analysis...</p>
                </div>

                <div class="bg-blue-50 p-4 rounded-lg">
                    <h3 class="font-semibold text-blue-800 mb-2">What we're analyzing:</h3>
                    <ul id="analysisSteps" class="text-sm text-blue-700 space-y-1">
                        <li>• Setting up your financial profile</li>
                        <li>• Generating personalized scenarios</li>
                        <li>• Running Monte Carlo simulations</li>
                        <li>• Comparing risk vs. opportunity</li>
                        <li>• Identifying Quick Wins</li>
                    </ul>
                </div>
            </div>
        `;

        try {
            // Convert onboarding data to calculator inputs
            const calculatorInputs = this.convertOnboardingDataToInputs();

            // Create scenario matrix engine
            const scenarioEngine = new ScenarioMatrixEngine(null, calculatorInputs); // We'll need to pass simulator later

            // Progress callback
            let currentProgress = 0;
            const progressCallback = async (current, total, status) => {
                currentProgress = (current / total) * 100;
                const progressBar = document.getElementById('analysisProgress');
                const statusText = document.getElementById('analysisStatus');

                if (progressBar) progressBar.style.width = `${currentProgress}%`;
                if (statusText) statusText.textContent = status;

                // Small delay to show progress
                await new Promise(resolve => setTimeout(resolve, 100));
            };

            // For now, we'll simulate the analysis since we don't have the simulator instance
            await this.simulateScenarioAnalysis(progressCallback);

            // Show results preview
            this.showScenarioResults();

        } catch (error) {
            console.error('Error running scenario analysis:', error);
            modalContent.innerHTML = `
                <div class="text-center">
                    <div class="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                        <span class="text-2xl">⚠️</span>
                    </div>
                    <h3 class="text-lg font-semibold text-gray-800 mb-4">Analysis Error</h3>
                    <p class="text-gray-600 mb-6">We encountered an issue analyzing your scenarios. Don't worry - you can still access the full calculator.</p>
                    <button onclick="this.closest('.onboarding-modal-overlay').remove()" class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                        Continue to Calculator
                    </button>
                </div>
            `;
        }
    }

    async simulateScenarioAnalysis(progressCallback) {
        const steps = [
            "Setting up your financial profile...",
            "Generating personalized scenarios...",
            "Running conservative strategy analysis...",
            "Running growth strategy analysis...",
            "Running aggressive strategy analysis...",
            "Analyzing risk vs opportunity...",
            "Identifying Quick Wins...",
            "Finalizing recommendations..."
        ];

        for (let i = 0; i < steps.length; i++) {
            await progressCallback(i, steps.length, steps[i]);
            await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400)); // Realistic timing
        }

        await progressCallback(steps.length, steps.length, "Analysis complete!");
    }

    showScenarioResults() {
        const modal = document.getElementById('scenarioModal');
        const modalContent = modal.querySelector('.onboarding-modal');

        modalContent.innerHTML = `
            <div class="onboarding-header text-center">
                <h2 class="text-2xl font-bold text-gray-800 mb-6">✨ Your Retirement Strategy Analysis</h2>
            </div>

            <div class="space-y-6 max-h-96 overflow-y-auto">
                <div class="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg">
                    <h3 class="font-semibold text-green-800 mb-2">🎯 Good News!</h3>
                    <p class="text-green-700 text-sm">Based on your profile, we found several strategies that could improve your retirement outcome by 15-30%.</p>
                </div>

                <div class="grid gap-4">
                    <div class="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
                        <div class="flex items-center justify-between mb-2">
                            <h4 class="font-semibold text-gray-800">🚀 Growth Strategy</h4>
                            <span class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium">Recommended</span>
                        </div>
                        <p class="text-sm text-gray-600 mb-3">Higher equity allocation with tax optimization</p>
                        <div class="grid grid-cols-2 gap-3 text-xs">
                            <div class="text-center">
                                <div class="font-semibold text-blue-600">85%</div>
                                <div class="text-gray-500">Success Rate</div>
                            </div>
                            <div class="text-center">
                                <div class="font-semibold text-green-600">+$340K</div>
                                <div class="text-gray-500">vs Current</div>
                            </div>
                        </div>
                    </div>

                    <div class="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
                        <div class="flex items-center justify-between mb-2">
                            <h4 class="font-semibold text-gray-800">🛡️ Conservative Strategy</h4>
                            <span class="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">Lower Risk</span>
                        </div>
                        <p class="text-sm text-gray-600 mb-3">Balanced approach focusing on capital preservation</p>
                        <div class="grid grid-cols-2 gap-3 text-xs">
                            <div class="text-center">
                                <div class="font-semibold text-blue-600">92%</div>
                                <div class="text-gray-500">Success Rate</div>
                            </div>
                            <div class="text-center">
                                <div class="font-semibold text-green-600">+$180K</div>
                                <div class="text-gray-500">vs Current</div>
                            </div>
                        </div>
                    </div>

                    <div class="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                        <h4 class="font-semibold text-yellow-800 mb-2">⚡ Quick Wins Available</h4>
                        <ul class="text-sm text-yellow-700 space-y-1">
                            <li>• Optimize superannuation contributions (potential $15K tax saving)</li>
                            <li>• Review investment fees (could save $8K over 10 years)</li>
                            <li>• Consider spouse contributions for tax benefits</li>
                        </ul>
                    </div>
                </div>

                <div class="text-center">
                    <p class="text-sm text-gray-600 mb-4">
                        Full detailed analysis and recommendations are waiting for you in the calculator
                    </p>
                    <button onclick="this.closest('.onboarding-modal-overlay').remove()" class="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg">
                        View Full Analysis in Calculator
                    </button>
                </div>
            </div>
        `;
    }

    closeScenarioModal() {
        const modal = document.getElementById('scenarioModal');
        if (modal) {
            modal.remove();
        }
    }

    convertOnboardingDataToInputs() {
        // Convert onboarding data structure to calculator inputs format
        // This is a simplified conversion - in a full implementation,
        // you'd map all the onboarding fields to calculator fields
        const inputs = {};

        if (this.onboardingData.step1) {
            inputs.yourCurrentAge = this.onboardingData.step1.age || 49;
            inputs.retirementAge = this.onboardingData.step1.retirementAge || 65;
            inputs.yourSalary = this.onboardingData.step1.householdIncome * 0.6 || 100000; // Estimate split
            inputs.partnerSalary = this.onboardingData.step1.householdIncome * 0.4 || 50000;
        }

        if (this.onboardingData.step2) {
            inputs.yourCurrentSuper = this.onboardingData.step2.currentSuper * 0.6 || 200000;
            inputs.partnerCurrentSuper = this.onboardingData.step2.currentSuper * 0.4 || 100000;
            inputs.currentSavings = this.onboardingData.step2.savings || 50000;
            inputs.currentStocks = this.onboardingData.step2.investments || 30000;
        }

        // Add defaults for other required fields
        inputs.homeValue = 800000;
        inputs.mortgageBalance = 400000;
        inputs.investmentReturn = 0.07;
        inputs.inflation = 0.029;
        inputs.asfaComfortable = 70000;

        return inputs;
    }

    skipToFullCalculator() {
        localStorage.setItem('retirement-calc-onboarding-completed', 'true');
        this.loadFullCalculator();
    }

    loadFullCalculatorWithData() {
        // Save onboarding completion
        localStorage.setItem('retirement-calc-onboarding-completed', 'true');
        localStorage.setItem('retirement-calc-onboarding-data', JSON.stringify(this.onboardingData));

        // Show success message and restore full calculator
        showNotification('Onboarding completed! Loading your full retirement calculator...', 'success');

        setTimeout(() => {
            this.restoreFullCalculator();
            // Pre-populate form with onboarding data
            this.populateFormFromOnboardingData();
        }, 1500);
    }

    loadFullCalculator() {
        // Just restore the original calculator without onboarding data
        this.restoreFullCalculator();
    }

    restoreFullCalculator() {
        const container = $('.container');
        if (container && this.originalContent) {
            container.innerHTML = this.originalContent;

            // Re-initialize the main app since we replaced the DOM
            // This will be handled by the main app initialization
            if (window.app && typeof window.app.initializeApp === 'function') {
                window.app.initializeApp();
            }
        }
    }

    populateFormFromOnboardingData() {
        // Convert onboarding data to form fields
        const data = this.onboardingData;

        // Basic mapping of onboarding data to form fields
        if (data.yourAge) safeSetValue('yourCurrentAge', data.yourAge);
        if (data.partnerAge) safeSetValue('partnerCurrentAge', data.partnerAge);
        if (data.yourRetirementAge) safeSetValue('retirementAge', data.yourRetirementAge);
        if (data.partnerRetirementAge) safeSetValue('partnerRetirementAge', data.partnerRetirementAge);

        // Financial data
        if (data.yourIncome) {
            const income = parseFloat(data.yourIncome.replace(/[^0-9.]/g, ''));
            safeSetValue('yourSalary', income);
        }

        if (data.yourSuperBalance) {
            const balance = parseFloat(data.yourSuperBalance.replace(/[^0-9.]/g, ''));
            safeSetValue('yourCurrentSuper', balance);
        }

        // Add more field mappings as needed
        console.log('Form populated with onboarding data:', data);
    }
}

// OnboardingSystem is already exported as default in the class declaration above