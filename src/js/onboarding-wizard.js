// js/onboarding-wizard.js - User Onboarding Wizard Component
// 5-step wizard for collecting initial retirement planning data

import { ENHANCED_CONFIG } from './config.js';
import { $, safeSetValue, safeGetValue, formatCurrency, formatNumber, formatPercent, saveToLocalStorage, loadFromLocalStorage } from './utils.js';

export class OnboardingWizard {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 5;
        this.data = this.initializeData();
        this.isCompleted = false;

        this.stepNames = [
            'household',
            'finances',
            'property',
            'goals',
            'review'
        ];

        this.init();
    }

    initializeData() {
        // Initialize with enhanced defaults from config
        const defaults = ENHANCED_CONFIG.DEFAULTS;

        return {
            household: {
                age: 34, // Default as specified
                location: 'sydney',
                maritalStatus: 'single',
                partnerAge: '', // Partner age when applicable
                retirementAge: 67, // Australian Age Pension age
                dependents: {
                    children: 0,
                    elderlyParents: 0
                },
                livingArrangements: {
                    homeOwnership: 'own',
                    monthlyExpenses: 0
                },
                health: {
                    currentHealth: 'good',
                    expectedCareNeeds: 'minimal'
                }
            },
            finances: {
                superannuation: {
                    currentBalance: defaults.financial.yourCurrentSuper,
                    partnerCurrentBalance: 0,
                    employerContributions: Math.round(defaults.financial.yourSalary * ENHANCED_CONFIG.SUPER_GUARANTEE_RATE),
                    voluntaryContributions: 0,
                    fundPerformance: defaults.economic.superReturn * 100
                },
                otherInvestments: {
                    shares: defaults.financial.currentStocks,
                    managedFunds: 0,
                    termDeposits: 0
                },
                income: {
                    salary: defaults.financial.yourSalary,
                    partnerSalary: 0,
                    businessIncome: 0,
                    investmentIncome: 0
                },
                debt: {
                    homeLoan: defaults.property.mortgageBalance,
                    personalLoans: 0,
                    creditCards: 0
                },
                emergencyFund: defaults.financial.currentSavings
            },
            property: {
                homeStatus: 'own', // 'own', 'rent', 'none'
                homeDetails: {
                    purchasePrice: defaults.property.homeValue - 200000, // Estimated purchase price
                    currentValue: defaults.property.homeValue,
                    loanRemaining: defaults.property.mortgageBalance,
                    loanRate: 6.5 // Current average home loan rate
                },
                investmentProperty: {
                    hasInvestment: defaults.property.hasInvestmentProperty,
                    details: {
                        purchasePrice: defaults.property.investmentPropertyValue - 100000,
                        currentValue: defaults.property.investmentPropertyValue,
                        loanRemaining: defaults.property.investmentPropertyLoan,
                        loanRate: 7.5, // Investment property loan rate (typically higher)
                        weeklyRent: defaults.property.weeklyRentalIncome,
                        expenses: defaults.property.annualPropertyExpenses
                    }
                }
            },
            goals: {
                retirementAge: 67,
                riskTolerance: 6, // 1-10 scale, 6 = moderate
                lifestyleGoals: {
                    incomeNeeded: defaults.pension.asfaComfortable,
                    travelPlans: 'moderate',
                    hobbies: 'some'
                },
                legacyPlanning: {
                    leaveInheritance: 'yes',
                    inheritanceAmount: 100000
                }
            }
        };
    }

    init() {
        this.createWizardHTML();
        this.setupEventListeners();
        this.loadSavedData();
        this.showStep(1);
    }

    startOnboarding() {
        // Method to start the onboarding process - called by the main app
        this.init();
    }

    createWizardHTML() {
        // Check if main container exists, if not create it
        let container = $('onboarding-container');
        if (!container) {
            // Create container and insert at the beginning of the main container
            const mainContainer = $('.container');
            if (mainContainer) {
                container = document.createElement('div');
                container.id = 'onboarding-container';
                container.className = 'onboarding-wizard';
                mainContainer.insertBefore(container, mainContainer.firstChild);
            }
        }

        if (container) {
            container.innerHTML = this.generateWizardHTML();
        }
    }

    generateWizardHTML() {
        return `
            <div id="onboarding-wizard" class="bg-white rounded-lg shadow-lg p-6 mb-8">
                <!-- Initial Buttons -->
                <div id="onboarding-initial" class="text-center py-8">
                    <h1 class="text-3xl font-bold text-gray-900 mb-6">Welcome to Your Retirement Calculator</h1>
                    <p class="text-lg text-gray-600 mb-8">Get started with a personalized retirement plan in just 5 minutes</p>

                    <div class="flex justify-center gap-6">
                        <button id="new-user-btn" class="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-colors">
                            🚀 New User? Start Your Plan
                        </button>
                        <button id="returning-user-btn" class="bg-gray-600 hover:bg-gray-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-colors">
                            📂 Returning User? Load Your Data
                        </button>
                    </div>
                </div>

                <!-- Wizard Content -->
                <div id="onboarding-wizard-content" class="hidden">
                    <!-- Progress Breadcrumb -->
                    <div class="mb-8">
                        <div class="flex justify-between items-center">
                            ${this.generateBreadcrumb()}
                        </div>
                    </div>

                    <!-- Step Content -->
                    <div id="step-content" class="min-h-96">
                        <!-- Content will be dynamically generated -->
                    </div>

                    <!-- Navigation Buttons -->
                    <div class="flex justify-between mt-8 pt-6 border-t">
                        <button id="prev-btn" class="px-6 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors" onclick="onboardingWizard.previousStep()">
                            ← Previous
                        </button>
                        <button id="next-btn" class="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors" onclick="onboardingWizard.nextStep()">
                            Next →
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    generateBreadcrumb() {
        const steps = [
            { id: 1, name: 'Household', icon: '🏠' },
            { id: 2, name: 'Finances', icon: '💰' },
            { id: 3, name: 'Property', icon: '🏡' },
            { id: 4, name: 'Goals', icon: '🎯' },
            { id: 5, name: 'Review', icon: '📋' }
        ];

        return steps.map(step => `
            <div class="flex items-center ${step.id < steps.length ? 'flex-1' : ''}">
                <div class="step-indicator ${this.currentStep >= step.id ? 'active' : 'inactive'}" data-step="${step.id}">
                    <span class="step-icon">${step.icon}</span>
                    <span class="step-number">${step.id}</span>
                </div>
                <div class="step-label ${this.currentStep >= step.id ? 'text-blue-600 font-medium' : 'text-gray-400'}">
                    ${step.name}
                </div>
                ${step.id < steps.length ? '<div class="step-connector"></div>' : ''}
            </div>
        `).join('');
    }

    setupEventListeners() {
        // Initial button listeners
        const newUserBtn = $('new-user-btn');
        const returningUserBtn = $('returning-user-btn');

        if (newUserBtn) {
            newUserBtn.addEventListener('click', () => this.startNewUser());
        }

        if (returningUserBtn) {
            returningUserBtn.addEventListener('click', () => this.loadExistingUser());
        }

        // Step navigation listeners will be added when wizard content is shown
    }

    startNewUser() {
        $('onboarding-initial').classList.add('hidden');
        $('onboarding-wizard-content').classList.remove('hidden');
        this.showStep(1);
    }

    async loadExistingUser() {
        // Trigger the existing load data functionality
        const utils = await import('./utils.js');
        if (utils.importUserData) {
            // Create a file input for loading data
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        try {
                            const data = JSON.parse(e.target.result);
                            // Populate the advanced calculator with loaded data
                            utils.populateFormFromData(data);
                            // Show the advanced calculator directly
                            this.showAdvancedCalculator();
                        } catch (error) {
                            alert('Error loading file. Please check the file format.');
                        }
                    };
                    reader.readAsText(file);
                }
            };
            input.click();
        }
    }

    showStep(stepNumber) {
        this.currentStep = stepNumber;
        this.updateBreadcrumb();
        this.updateStepContent();
        this.updateNavigationButtons();
        this.setupEnhancedInputListeners(); // Add enhanced input formatting
        this.saveProgress();
    }

    updateBreadcrumb() {
        const indicators = document.querySelectorAll('.step-indicator');
        const labels = document.querySelectorAll('.step-label');

        indicators.forEach((indicator, index) => {
            const stepNum = index + 1;
            if (stepNum < this.currentStep) {
                indicator.classList.add('completed');
                indicator.classList.remove('active', 'inactive');
            } else if (stepNum === this.currentStep) {
                indicator.classList.add('active');
                indicator.classList.remove('completed', 'inactive');
            } else {
                indicator.classList.add('inactive');
                indicator.classList.remove('completed', 'active');
            }
        });

        labels.forEach((label, index) => {
            const stepNum = index + 1;
            if (stepNum <= this.currentStep) {
                label.classList.add('text-blue-600', 'font-medium');
                label.classList.remove('text-gray-400');
            } else {
                label.classList.add('text-gray-400');
                label.classList.remove('text-blue-600', 'font-medium');
            }
        });
    }

    updateStepContent() {
        const stepContent = $('step-content');
        if (stepContent) {
            stepContent.innerHTML = this.generateStepContent(this.currentStep);
            this.setupStepListeners(this.currentStep);
        }
    }

    togglePartnerFields() {
        const maritalStatus = document.querySelector('#household-marital')?.value;
        const partnerSection = document.getElementById('partner-details-section');

        if (partnerSection) {
            if (maritalStatus === 'single') {
                partnerSection.classList.add('hidden');
            } else {
                partnerSection.classList.remove('hidden');
            }
        }
    }

    updateEmployerContributions() {
        const salary = document.querySelector('#finances-salary')?.value || 0;
        const employerContrib = Math.round(salary * 0.12); // 12% Super Guarantee
        const employerField = document.querySelector('#finances-employer-contrib');

        if (employerField) {
            employerField.value = employerContrib;
            this.data.finances.superannuation.employerContributions = employerContrib;
        }
    }

    // Helper method to format risk tolerance with color coding
    formatRiskTolerance(value, includeNumber = true) {
        const numValue = parseInt(value) || 6; // Default to 6 if undefined
        let riskLevel, color;

        if (numValue <= 3) {
            riskLevel = "Conservative";
            color = "text-green-600";
        } else if (numValue <= 7) {
            riskLevel = "Moderate";
            color = "text-blue-600";
        } else {
            riskLevel = "Aggressive";
            color = "text-red-600";
        }

        if (includeNumber) {
            return `<span class="${color} font-semibold">${riskLevel} (${numValue}/10)</span>`;
        } else {
            return `<span class="${color} font-semibold">${riskLevel}</span>`;
        }
    }

    updateRiskToleranceDisplay() {
        const slider = document.querySelector('#goals-risk-tolerance');
        const valueDisplay = document.getElementById('goals-risk-tolerance-value');
        const description = document.getElementById('goals-risk-tolerance-description');

        if (slider && valueDisplay && description) {
            const value = parseInt(slider.value);
            this.data.goals.riskTolerance = value;

            let riskLevel, desc;
            if (value <= 3) {
                riskLevel = "Conservative";
                desc = "Conservative (1-3): You prefer stability over growth. Comfortable with term deposits, bonds, and defensive investments that protect your capital.";
            } else if (value <= 7) {
                riskLevel = "Moderate";
                desc = "Moderate (4-7): You're comfortable with a balanced approach. Happy to accept some volatility for potentially better returns through a mix of defensive and growth assets.";
            } else {
                riskLevel = "Aggressive";
                desc = "Aggressive (8-10): You can handle high volatility for potential higher returns. Comfortable with growth assets like shares and property even during market downturns.";
            }

            valueDisplay.innerHTML = this.formatRiskTolerance(value, false).replace(/<[^>]*>/g, ''); // Remove HTML tags for plain text
            valueDisplay.textContent = `${riskLevel} (${value})`;
            description.textContent = desc;
        }
    }

    generateStepContent(stepNumber) {
        switch (stepNumber) {
            case 1:
                return this.generateHouseholdStep();
            case 2:
                return this.generateFinancesStep();
            case 3:
                return this.generatePropertyStep();
            case 4:
                return this.generateGoalsStep();
            case 5:
                return this.generateReviewStep();
            default:
                return '<div>Invalid step</div>';
        }
    }

    generateHouseholdStep() {
        const household = this.data.household;

        return `
            <div class="step-content">
                <h2 class="text-2xl font-bold mb-6">🏠 Household Information</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <!-- Basic Information -->
                    <div class="space-y-4">
                        <h3 class="text-lg font-semibold text-gray-800">Basic Information</h3>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">🎂 Your Current Age</label>
                            ${this.createEnhancedInput('household-age', household.age, 'number', {
                                min: 18,
                                max: 100,
                                tooltip: 'Your age affects super preservation rules, Age Pension eligibility, and investment time horizon',
                                placeholder: '34',
                                gamingLevel: 2
                            })}
                            <p class="text-xs text-gray-500 mt-1">🗓️ This affects superannuation preservation rules and Age Pension eligibility</p>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Location</label>
                            <select id="household-location" class="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                                <option value="sydney" ${household.location === 'sydney' ? 'selected' : ''}>Sydney</option>
                                <option value="melbourne" ${household.location === 'melbourne' ? 'selected' : ''}>Melbourne</option>
                                <option value="brisbane" ${household.location === 'brisbane' ? 'selected' : ''}>Brisbane</option>
                                <option value="perth" ${household.location === 'perth' ? 'selected' : ''}>Perth</option>
                                <option value="adelaide" ${household.location === 'adelaide' ? 'selected' : ''}>Adelaide</option>
                                <option value="regional" ${household.location === 'regional' ? 'selected' : ''}>Regional</option>
                            </select>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Marital Status</label>
                            <select id="household-marital" onchange="onboardingWizard.togglePartnerFields()" class="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                                <option value="single" ${household.maritalStatus === 'single' ? 'selected' : ''}>Single</option>
                                <option value="married" ${household.maritalStatus === 'married' ? 'selected' : ''}>Married</option>
                                <option value="defacto" ${household.maritalStatus === 'defacto' ? 'selected' : ''}>De Facto</option>
                            </select>
                        </div>

                        <!-- Partner Details (conditionally shown) -->
                        <div id="partner-details-section" class="${household.maritalStatus === 'single' ? 'hidden' : ''} mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <h4 class="text-sm font-semibold text-blue-800 mb-3">Partner Information</h4>

                            <div class="space-y-3">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">Partner's Current Age</label>
                                    <input type="number" id="household-partner-age" value="${household.partnerAge || ''}" min="18" max="100"
                                        class="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                                    <p class="text-xs text-gray-500 mt-1">Your partner's age affects Age Pension calculations as couple rates apply</p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">Age Pension Age</label>
                            <input type="number" id="household-retirement-age" value="${household.retirementAge}" min="55" max="80"
                                class="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                            <p class="text-xs text-gray-500 mt-1">Age when you plan to access Age Pension (currently 67 for most people). You can access super earlier from preservation age (60-65)</p>
                        </div>
                    </div>

                    <!-- Additional Information (Expandable) -->
                    <div class="space-y-4">
                        <h3 class="text-lg font-semibold text-gray-800">Additional Details</h3>

                        <!-- Dependents (Hidden by default, expandable) -->
                        <div class="bg-gray-50 p-4 rounded-lg">
                            <button type="button" id="dependents-toggle" class="flex items-center justify-between w-full text-left">
                                <span class="text-sm font-medium text-gray-700">Dependents</span>
                                <span class="text-gray-400">▼</span>
                            </button>
                            <div id="dependents-content" class="hidden mt-4 space-y-3">
                                <div>
                                    <label class="block text-xs text-gray-600 mb-1">Number of Children</label>
                                    <input type="number" id="household-children" value="${household.dependents.children}" min="0" max="10"
                                        class="w-full text-sm rounded-md border-gray-300">
                                </div>
                                <div>
                                    <label class="block text-xs text-gray-600 mb-1">Elderly Parents to Support</label>
                                    <input type="number" id="household-elderly" value="${household.dependents.elderlyParents}" min="0" max="4"
                                        class="w-full text-sm rounded-md border-gray-300">
                                </div>
                            </div>
                        </div>

                        <!-- Living Arrangements (Hidden by default, expandable) -->
                        <div class="bg-gray-50 p-4 rounded-lg">
                            <button type="button" id="living-toggle" class="flex items-center justify-between w-full text-left">
                                <span class="text-sm font-medium text-gray-700">Living Arrangements</span>
                                <span class="text-gray-400">▼</span>
                            </button>
                            <div id="living-content" class="hidden mt-4 space-y-3">
                                <div>
                                    <label class="block text-xs text-gray-600 mb-1">Home Ownership</label>
                                    <select id="household-home-ownership" class="w-full text-sm rounded-md border-gray-300">
                                        <option value="own" ${household.livingArrangements.homeOwnership === 'own' ? 'selected' : ''}>Own Home</option>
                                        <option value="mortgage" ${household.livingArrangements.homeOwnership === 'mortgage' ? 'selected' : ''}>Paying Mortgage</option>
                                        <option value="rent" ${household.livingArrangements.homeOwnership === 'rent' ? 'selected' : ''}>Renting</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-xs text-gray-600 mb-1">Monthly Living Expenses</label>
                                    <input type="number" id="household-expenses" value="${household.livingArrangements.monthlyExpenses}" min="0"
                                        class="w-full text-sm rounded-md border-gray-300" placeholder="e.g. 5000">
                                </div>
                            </div>
                        </div>

                        <!-- Health Considerations (Hidden by default, expandable) -->
                        <div class="bg-gray-50 p-4 rounded-lg">
                            <button type="button" id="health-toggle" class="flex items-center justify-between w-full text-left">
                                <span class="text-sm font-medium text-gray-700">Health Considerations</span>
                                <span class="text-gray-400">▼</span>
                            </button>
                            <div id="health-content" class="hidden mt-4 space-y-3">
                                <div>
                                    <label class="block text-xs text-gray-600 mb-1">Current Health</label>
                                    <select id="household-health" class="w-full text-sm rounded-md border-gray-300">
                                        <option value="excellent" ${household.health.currentHealth === 'excellent' ? 'selected' : ''}>Excellent</option>
                                        <option value="good" ${household.health.currentHealth === 'good' ? 'selected' : ''}>Good</option>
                                        <option value="fair" ${household.health.currentHealth === 'fair' ? 'selected' : ''}>Fair</option>
                                        <option value="poor" ${household.health.currentHealth === 'poor' ? 'selected' : ''}>Poor</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block text-xs text-gray-600 mb-1">Expected Healthcare Needs</label>
                                    <select id="household-care-needs" class="w-full text-sm rounded-md border-gray-300">
                                        <option value="minimal" ${household.health.expectedCareNeeds === 'minimal' ? 'selected' : ''}>Minimal</option>
                                        <option value="moderate" ${household.health.expectedCareNeeds === 'moderate' ? 'selected' : ''}>Moderate</option>
                                        <option value="significant" ${household.health.expectedCareNeeds === 'significant' ? 'selected' : ''}>Significant</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    generateFinancesStep() {
        const finances = this.data.finances;
        const household = this.data.household;

        return `
            <div class="step-content">
                <h2 class="text-2xl font-bold mb-6">💰 Financial Information</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <!-- Salary & Income (First) -->
                    <div class="space-y-6">
                        <h3 class="text-lg font-semibold text-gray-800">Income</h3>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">💼 Your Annual Salary</label>
                            ${this.createEnhancedInput('finances-salary', finances.income.salary, 'currency', {
                                min: 0,
                                tooltip: 'Your gross annual salary before tax',
                                placeholder: '75,000',
                                gamingLevel: 2
                            })}
                            <p class="text-xs text-gray-500 mt-1">💡 Used to calculate superannuation contributions automatically</p>
                        </div>

                        ${household.maritalStatus !== 'single' ? `
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">👫 Partner's Annual Salary</label>
                            ${this.createEnhancedInput('finances-partner-salary', finances.income.partnerSalary || 0, 'currency', {
                                min: 0,
                                tooltip: 'Partner\'s gross annual salary before tax',
                                placeholder: '65,000',
                                gamingLevel: 2
                            })}
                            <p class="text-xs text-gray-500 mt-1">💡 Partner's gross annual salary before tax</p>
                        </div>
                        ` : ''}

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">💰 Monthly Savings Rate</label>
                            ${this.createEnhancedInput('finances-savings-rate', finances.savingsRate || 15, 'percentage', {
                                min: 0,
                                max: 100,
                                tooltip: 'Percentage of after-tax income saved monthly',
                                placeholder: '15.0',
                                gamingLevel: 2
                            })}
                            <p class="text-xs text-gray-500 mt-1">📊 Typical range: 10-20% for retirement planning</p>
                        </div>
                    </div>

                    <!-- Superannuation (Second) -->
                    <div class="space-y-6">
                        <h3 class="text-lg font-semibold text-gray-800">Superannuation</h3>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">🏦 Current Super Balance</label>
                            ${this.createEnhancedInput('finances-super-balance', finances.superannuation.currentBalance, 'currency', {
                                min: 0,
                                tooltip: 'Total superannuation balance across all funds',
                                placeholder: '150,000',
                                gamingLevel: 3
                            })}
                            <p class="text-xs text-gray-500 mt-1">💼 Your total superannuation balance across all funds</p>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">🏢 Annual Employer Contributions</label>
                            <div class="relative group">
                                <input
                                    type="text"
                                    id="finances-employer-contrib"
                                    value="${formatNumber(finances.superannuation.employerContributions)}"
                                    maxlength="14"
                                    class="w-full max-w-[140px] px-3 py-2 text-sm font-mono text-right bg-gray-100 border-2 border-gray-300 rounded-lg cursor-not-allowed"
                                    readonly
                                    title="Automatically calculated as 12% of your salary (Super Guarantee)"
                                />
                                <div class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm font-bold pointer-events-none">$</div>
                            </div>
                            <p class="text-xs text-gray-500 mt-1">⚡ Automatically calculated as 12% of salary</p>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">💪 Additional Contributions (Annual)</label>
                            ${this.createEnhancedInput('finances-voluntary-contrib', finances.superannuation.voluntaryContributions, 'currency', {
                                min: 0,
                                tooltip: 'Salary sacrifice or after-tax contributions you make to boost your super',
                                placeholder: '5,000',
                                gamingLevel: 2
                            })}
                            <p class="text-xs text-gray-500 mt-1">💡 Salary sacrifice or after-tax contributions you make</p>
                        </div>

                        ${household.maritalStatus !== 'single' ? `
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">👫 Partner's Super Balance</label>
                            ${this.createEnhancedInput('finances-partner-super', finances.superannuation.partnerCurrentBalance || 0, 'currency', {
                                min: 0,
                                tooltip: 'Partner\'s total superannuation balance across all funds',
                                placeholder: '120,000',
                                gamingLevel: 2
                            })}
                            <p class="text-xs text-gray-500 mt-1">💼 Partner's total superannuation balance</p>
                        </div>
                        ` : ''}
                    </div>
                </div>

                <!-- Savings & Investments -->
                <div class="mt-10">
                    <h3 class="text-lg font-semibold text-gray-800 mb-6">Savings & Other Investments</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">🛡️ Emergency Fund (Cash Savings)</label>
                            ${this.createEnhancedInput('finances-emergency-fund', finances.emergencyFund, 'currency', {
                                min: 0,
                                tooltip: 'Cash savings in bank accounts, term deposits - aim for 3-6 months expenses',
                                placeholder: '25,000',
                                gamingLevel: 2
                            })}
                            <p class="text-xs text-gray-500 mt-1">💡 Cash savings in bank accounts, term deposits, etc.</p>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">📈 Share Portfolio Value</label>
                            ${this.createEnhancedInput('finances-shares', finances.otherInvestments.shares, 'currency', {
                                min: 0,
                                tooltip: 'Current value of shares, ETFs, managed funds outside superannuation',
                                placeholder: '50,000',
                                gamingLevel: 2
                            })}
                            <p class="text-xs text-gray-500 mt-1">📊 Current value of shares, ETFs, managed funds outside super</p>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">📅 Monthly Investment Contribution</label>
                            ${this.createEnhancedInput('finances-monthly-investment', finances.otherInvestments.monthlyContribution, 'currency', {
                                min: 0,
                                tooltip: 'How much you invest monthly outside of superannuation in shares, ETFs, etc.',
                                placeholder: '1,000',
                                gamingLevel: 2
                            })}
                            <p class="text-xs text-gray-500 mt-1">📊 Regular monthly investments outside superannuation</p>
                        </div>
                    </div>
                </div>

                <!-- High-Interest Debt -->
                <div class="mt-10">
                    <h3 class="text-lg font-semibold text-gray-800 mb-4">High-Interest Debt</h3>
                    <p class="text-sm text-gray-600 mb-6">Include credit cards, personal loans, but NOT home loans (we'll cover property on the next page)</p>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">💳 Total Credit Card Limits</label>
                            ${this.createEnhancedInput('finances-credit-cards', finances.debt.creditCards, 'currency', {
                                min: 0,
                                tooltip: 'Total credit card limits available to you - helps assess your debt capacity',
                                placeholder: '15,000',
                                gamingLevel: 2
                            })}
                            <p class="text-xs text-gray-500 mt-1">💡 Total credit card limits available to you</p>
                        </div>

                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-2">🏦 Any other debts like a Personal Loan, etc.</label>
                            ${this.createEnhancedInput('finances-personal-loans', finances.debt.personalLoans, 'currency', {
                                min: 0,
                                tooltip: 'Personal loans, car loans, or any other debts (excluding home loan)',
                                placeholder: '8,000',
                                gamingLevel: 2
                            })}
                            <p class="text-xs text-gray-500 mt-1">Car loans, unsecured personal loans</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    generatePropertyStep() {
        const property = this.data.property;

        return `
            <div class="step-content">
                <h2 class="text-2xl font-bold mb-6">🏡 Property Information</h2>
                <div class="bg-blue-50 p-4 rounded-lg mb-6">
                    <p class="text-sm text-blue-800">📋 <strong>Optional:</strong> Skip this section if you don't own property or prefer to add details later in the Advanced Calculator.</p>
                </div>

                <div class="space-y-6">
                    <!-- Home Status -->
                    <div>
                        <h3 class="text-lg font-semibold text-gray-800 mb-4">Primary Residence</h3>
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <label class="radio-card">
                                <input type="radio" name="home-status" value="own" ${property.homeStatus === 'own' ? 'checked' : ''}>
                                <div class="radio-content">
                                    <div class="text-2xl">🏠</div>
                                    <div class="text-sm font-medium">Own Home</div>
                                    <div class="text-xs text-gray-500">Mortgage paid off</div>
                                </div>
                            </label>
                            <label class="radio-card">
                                <input type="radio" name="home-status" value="mortgage" ${property.homeStatus === 'mortgage' ? 'checked' : ''}>
                                <div class="radio-content">
                                    <div class="text-2xl">🏘️</div>
                                    <div class="text-sm font-medium">Paying Mortgage</div>
                                    <div class="text-xs text-gray-500">Still have loan</div>
                                </div>
                            </label>
                            <label class="radio-card">
                                <input type="radio" name="home-status" value="rent" ${property.homeStatus === 'rent' ? 'checked' : ''}>
                                <div class="radio-content">
                                    <div class="text-2xl">🏢</div>
                                    <div class="text-sm font-medium">Renting</div>
                                    <div class="text-xs text-gray-500">Don't own property</div>
                                </div>
                            </label>
                        </div>
                    </div>

                    <!-- Home Details (shown if own/mortgage) -->
                    <div id="home-details" class="${property.homeStatus === 'rent' ? 'hidden' : ''}">
                        <h4 class="text-md font-semibold text-gray-700 mb-4">Home Details</h4>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">🏠 Purchase Price</label>
                                ${this.createEnhancedInput('property-purchase-price', property.homeDetails.purchasePrice, 'currency', {
                                    min: 0,
                                    tooltip: 'What you originally paid for the property - used for capital gains calculations',
                                    placeholder: '650,000',
                                    gamingLevel: 2
                                })}
                                <p class="text-xs text-gray-500 mt-1">💰 What you originally paid for the property</p>
                            </div>
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">📊 Current Value</label>
                                ${this.createEnhancedInput('property-current-value', property.homeDetails.currentValue, 'currency', {
                                    min: 0,
                                    tooltip: 'Current estimated market value of your property - check recent sales or get an appraisal',
                                    placeholder: '850,000',
                                    gamingLevel: 2
                                })}
                                <p class="text-xs text-gray-500 mt-1">🏡 Current estimated market value</p>
                            </div>
                            <div id="loan-remaining-field" class="${property.homeStatus === 'own' ? 'hidden' : ''}">
                                <label class="block text-sm font-medium text-gray-700 mb-2">🏦 Loan Remaining</label>
                                ${this.createEnhancedInput('property-loan-remaining', property.homeDetails.loanRemaining, 'currency', {
                                    min: 0,
                                    tooltip: 'Outstanding mortgage balance remaining on your home loan',
                                    placeholder: '420,000',
                                    gamingLevel: 2
                                })}
                                <p class="text-xs text-gray-500 mt-1">💳 Outstanding mortgage balance</p>
                            </div>
                            <div id="home-loan-rate-field" class="${property.homeStatus === 'own' ? 'hidden' : ''}">
                                <label class="block text-sm font-medium text-gray-700 mb-2">📈 Home Loan Interest Rate</label>
                                ${this.createEnhancedInput('property-loan-rate', property.homeDetails.loanRate || 6.5, 'percentage', {
                                    min: 0,
                                    max: 15,
                                    tooltip: 'Current interest rate on your home loan - affects repayments and equity growth',
                                    placeholder: '6.5',
                                    gamingLevel: 2
                                })}
                                <p class="text-xs text-gray-500 mt-1">📊 Current interest rate on your home loan</p>
                            </div>
                        </div>
                    </div>

                    <!-- Investment Property -->
                    <div class="border-t pt-6">
                        <h3 class="text-lg font-semibold text-gray-800 mb-4">Investment Property</h3>
                        <div class="mb-4">
                            <label class="flex items-center">
                                <input type="checkbox" id="has-investment-property" ${property.investmentProperty.hasInvestment ? 'checked' : ''}
                                    class="rounded border-gray-300 text-blue-600 focus:ring-blue-500">
                                <span class="ml-2 text-sm font-medium text-gray-700">I own an investment property</span>
                            </label>
                        </div>

                        <div id="investment-property-details" class="${!property.investmentProperty.hasInvestment ? 'hidden' : ''}">
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">🏗️ Purchase Price</label>
                                    ${this.createEnhancedInput('investment-purchase-price', property.investmentProperty.details.purchasePrice, 'currency', {
                                        min: 0,
                                        tooltip: 'What you paid for the investment property - used for capital gains tax calculations',
                                        placeholder: '580,000',
                                        gamingLevel: 2
                                    })}
                                    <p class="text-xs text-gray-500 mt-1">💰 What you paid for the investment property</p>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">📊 Current Value</label>
                                    ${this.createEnhancedInput('investment-current-value', property.investmentProperty.details.currentValue, 'currency', {
                                        min: 0,
                                        tooltip: 'Current estimated market value of your investment property',
                                        placeholder: '750,000',
                                        gamingLevel: 2
                                    })}
                                    <p class="text-xs text-gray-500 mt-1">🏡 Current estimated market value</p>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">🏦 Loan Remaining</label>
                                    ${this.createEnhancedInput('investment-loan-remaining', property.investmentProperty.details.loanRemaining, 'currency', {
                                        min: 0,
                                        tooltip: 'Outstanding investment property loan balance',
                                        placeholder: '480,000',
                                        gamingLevel: 2
                                    })}
                                    <p class="text-xs text-gray-500 mt-1">💳 Outstanding investment loan balance</p>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">📈 Investment Loan Interest Rate</label>
                                    ${this.createEnhancedInput('investment-loan-rate', property.investmentProperty.details.loanRate || 7.5, 'percentage', {
                                        min: 0,
                                        max: 15,
                                        tooltip: 'Interest rate on investment property loan - usually higher than home loans',
                                        placeholder: '7.5',
                                        gamingLevel: 2
                                    })}
                                    <p class="text-xs text-gray-500 mt-1">📊 Interest rate on investment property loan</p>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">💰 Weekly Rent</label>
                                    ${this.createEnhancedInput('investment-weekly-rent', property.investmentProperty.details.weeklyRent, 'currency', {
                                        min: 0,
                                        tooltip: 'Weekly rental income received from tenants',
                                        placeholder: '650',
                                        gamingLevel: 2
                                    })}
                                    <p class="text-xs text-gray-500 mt-1">🏠 Weekly rental income from tenants</p>
                                </div>
                                <div>
                                    <label class="block text-sm font-medium text-gray-700 mb-2">💸 Annual Expenses</label>
                                    ${this.createEnhancedInput('investment-expenses', property.investmentProperty.details.expenses, 'currency', {
                                        min: 0,
                                        tooltip: 'Annual property expenses: rates, insurance, maintenance, management fees, repairs',
                                        placeholder: '8,000',
                                        gamingLevel: 2
                                    })}
                                    <p class="text-xs text-gray-500 mt-1">🧾 Rates, insurance, maintenance, management fees</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    generateGoalsStep() {
        const goals = this.data.goals;

        return `
            <div class="step-content">
                <h2 class="text-2xl font-bold mb-6">🎯 Retirement Goals</h2>
                <div class="space-y-6">
                    <!-- Retirement Timeline -->
                    <div>
                        <h3 class="text-lg font-semibold text-gray-800 mb-4">Retirement Timeline</h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">🎂 Preferred Retirement Age</label>
                                ${this.createEnhancedInput('goals-retirement-age', goals.retirementAge, 'number', {
                                    min: 55,
                                    max: 80,
                                    tooltip: 'When would you like to stop working? Consider super preservation age and pension age',
                                    placeholder: '67',
                                    gamingLevel: 2
                                })}
                                <p class="text-xs text-gray-500 mt-1">🗓️ When would you like to stop working?</p>
                            </div>
                        </div>
                    </div>

                    <!-- Lifestyle Goals -->
                    <div>
                        <h3 class="text-lg font-semibold text-gray-800 mb-4">Desired Retirement Lifestyle</h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">💰 Desired Annual Income</label>
                                ${this.createEnhancedInput('goals-income-needed', goals.lifestyleGoals.incomeNeeded, 'currency', {
                                    min: 0,
                                    tooltip: 'How much income do you want per year in retirement? Consider ASFA standards: Modest ~$48k, Comfortable ~$74k',
                                    placeholder: '74000',
                                    gamingLevel: 2
                                })}
                                <div class="mt-2 text-xs text-gray-600">
                                    <div class="flex justify-between">
                                        <span>ASFA Modest:</span>
                                        <span>~$48,000</span>
                                    </div>
                                    <div class="flex justify-between">
                                        <span>ASFA Comfortable:</span>
                                        <span>~$74,000</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Travel Plans</label>
                                <select id="goals-travel-plans" class="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                                    <option value="minimal" ${goals.lifestyleGoals.travelPlans === 'minimal' ? 'selected' : ''}>Minimal travel</option>
                                    <option value="moderate" ${goals.lifestyleGoals.travelPlans === 'moderate' ? 'selected' : ''}>Moderate travel</option>
                                    <option value="extensive" ${goals.lifestyleGoals.travelPlans === 'extensive' ? 'selected' : ''}>Extensive travel</option>
                                </select>
                            </div>

                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Hobbies & Activities</label>
                                <select id="goals-hobbies" class="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                                    <option value="minimal" ${goals.lifestyleGoals.hobbies === 'minimal' ? 'selected' : ''}>Minimal activities</option>
                                    <option value="some" ${goals.lifestyleGoals.hobbies === 'some' ? 'selected' : ''}>Some hobbies</option>
                                    <option value="active" ${goals.lifestyleGoals.hobbies === 'active' ? 'selected' : ''}>Very active lifestyle</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <!-- Legacy Planning -->
                    <div>
                        <h3 class="text-lg font-semibold text-gray-800 mb-4">Legacy Planning</h3>
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-2">Do you want to leave an inheritance?</label>
                                <select id="goals-leave-inheritance" class="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500">
                                    <option value="yes" ${goals.legacyPlanning.leaveInheritance === 'yes' ? 'selected' : ''}>Yes, important to me</option>
                                    <option value="maybe" ${goals.legacyPlanning.leaveInheritance === 'maybe' ? 'selected' : ''}>If there's money left</option>
                                    <option value="no" ${goals.legacyPlanning.leaveInheritance === 'no' ? 'selected' : ''}>No, spend it all</option>
                                </select>
                            </div>

                            <div id="inheritance-amount-field" class="${goals.legacyPlanning.leaveInheritance === 'no' ? 'hidden' : ''}">
                                <label class="block text-sm font-medium text-gray-700 mb-2">🏛️ Target Inheritance Amount</label>
                                ${this.createEnhancedInput('goals-inheritance-amount', goals.legacyPlanning.inheritanceAmount, 'currency', {
                                    min: 0,
                                    tooltip: 'The amount you aim to leave as inheritance. This affects how much you can spend in retirement',
                                    placeholder: '100000',
                                    gamingLevel: 2
                                })}
                                <p class="text-xs text-gray-500 mt-1">💡 Approximate amount you'd like to leave</p>
                            </div>
                        </div>
                    </div>

                    <!-- Risk Tolerance -->
                    <div>
                        <h3 class="text-lg font-semibold text-gray-800 mb-4">Investment Risk Tolerance</h3>
                        <div class="space-y-4">
                            <div>
                                <label class="block text-sm font-medium text-gray-700 mb-3">How comfortable are you with investment risk?</label>
                                <div class="mt-1 relative">
                                    <input type="range" id="goals-risk-tolerance" min="1" max="10" value="${goals.riskTolerance}"
                                        class="risk-tolerance-slider w-full h-2 rounded-lg appearance-none cursor-pointer"
                                        onchange="onboardingWizard.updateRiskToleranceDisplay()">
                                    <div class="flex justify-between text-xs text-gray-500 mt-2">
                                        <span>Conservative</span>
                                        <span class="font-semibold text-blue-700" id="goals-risk-tolerance-value">Moderate (${goals.riskTolerance})</span>
                                        <span>Aggressive</span>
                                    </div>
                                </div>
                                <div id="goals-risk-tolerance-tooltip" class="mt-2 p-3 bg-gray-100 rounded text-sm text-gray-600">
                                    <span id="goals-risk-tolerance-description">Conservative (1-3): Prefer stability over growth with term deposits and bonds. Moderate (4-7): Balanced approach with mix of defensive and growth assets. Aggressive (8-10): Accept high volatility for potential higher returns through growth assets.</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    generateReviewStep() {
        // Update data from form before showing review
        this.updateDataFromForms();

        const data = this.data;

        return `
            <div class="step-content">
                <h2 class="text-2xl font-bold mb-6">📋 Review Your Information</h2>
                <div class="space-y-6">
                    <!-- Summary Cards -->
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <!-- Household Summary -->
                        <div class="bg-blue-50 p-6 rounded-lg">
                            <h3 class="text-lg font-semibold text-blue-800 mb-4">🏠 Household</h3>
                            <div class="space-y-2 text-sm">
                                <div class="flex justify-between">
                                    <span>Age:</span>
                                    <span class="font-medium">${data.household.age} years</span>
                                </div>
                                <div class="flex justify-between">
                                    <span>Marital Status:</span>
                                    <span class="font-medium capitalize">${data.household.maritalStatus}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span>Planned Retirement:</span>
                                    <span class="font-medium">Age ${data.household.retirementAge}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span>Location:</span>
                                    <span class="font-medium capitalize">${data.household.location}</span>
                                </div>
                            </div>
                            <button class="mt-4 text-blue-600 text-sm hover:underline" onclick="onboardingWizard.goToStep(1)">
                                ✏️ Edit Household Details
                            </button>
                        </div>

                        <!-- Finances Summary -->
                        <div class="bg-green-50 p-6 rounded-lg">
                            <h3 class="text-lg font-semibold text-green-800 mb-4">💰 Finances</h3>
                            <div class="space-y-2 text-sm">
                                <div class="flex justify-between">
                                    <span>Annual Salary:</span>
                                    <span class="font-medium">${formatCurrency(data.finances.income.salary)}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span>Current Super:</span>
                                    <span class="font-medium">${formatCurrency(data.finances.superannuation.currentBalance)}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span>Emergency Fund:</span>
                                    <span class="font-medium">${formatCurrency(data.finances.emergencyFund)}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span>Employer Contributions:</span>
                                    <span class="font-medium">${formatCurrency(data.finances.superannuation.employerContributions)}</span>
                                </div>
                            </div>
                            <button class="mt-4 text-green-600 text-sm hover:underline" onclick="onboardingWizard.goToStep(2)">
                                ✏️ Edit Financial Details
                            </button>
                        </div>

                        <!-- Property Summary -->
                        <div class="bg-purple-50 p-6 rounded-lg">
                            <h3 class="text-lg font-semibold text-purple-800 mb-4">🏡 Property</h3>
                            <div class="space-y-2 text-sm">
                                <div class="flex justify-between">
                                    <span>Home Status:</span>
                                    <span class="font-medium capitalize">${data.property.homeStatus === 'own' ? 'Own Home' : data.property.homeStatus === 'mortgage' ? 'Paying Mortgage' : 'Renting'}</span>
                                </div>
                                ${data.property.homeStatus !== 'rent' ? `
                                    <div class="flex justify-between">
                                        <span>Home Value:</span>
                                        <span class="font-medium">${formatCurrency(data.property.homeDetails.currentValue)}</span>
                                    </div>
                                ` : ''}
                                <div class="flex justify-between">
                                    <span>Investment Property:</span>
                                    <span class="font-medium">${data.property.investmentProperty.hasInvestment ? 'Yes' : 'No'}</span>
                                </div>
                                ${data.property.investmentProperty.hasInvestment ? `
                                    <div class="flex justify-between">
                                        <span>Investment Value:</span>
                                        <span class="font-medium">${formatCurrency(data.property.investmentProperty.details.currentValue)}</span>
                                    </div>
                                ` : ''}
                            </div>
                            <button class="mt-4 text-purple-600 text-sm hover:underline" onclick="onboardingWizard.goToStep(3)">
                                ✏️ Edit Property Details
                            </button>
                        </div>

                        <!-- Goals Summary -->
                        <div class="bg-orange-50 p-6 rounded-lg">
                            <h3 class="text-lg font-semibold text-orange-800 mb-4">🎯 Goals</h3>
                            <div class="space-y-2 text-sm">
                                <div class="flex justify-between">
                                    <span>Retirement Age:</span>
                                    <span class="font-medium">${data.goals.retirementAge} years</span>
                                </div>
                                <div class="flex justify-between">
                                    <span>Desired Income:</span>
                                    <span class="font-medium">${formatCurrency(data.goals.lifestyleGoals.incomeNeeded)}</span>
                                </div>
                                <div class="flex justify-between">
                                    <span>Risk Tolerance:</span>
                                    ${this.formatRiskTolerance(data.goals.riskTolerance, true)}
                                </div>
                                <div class="flex justify-between">
                                    <span>Inheritance Goal:</span>
                                    <span class="font-medium">${data.goals.legacyPlanning.leaveInheritance === 'yes' ? 'Yes' : data.goals.legacyPlanning.leaveInheritance === 'maybe' ? 'Maybe' : 'No'}</span>
                                </div>
                            </div>
                            <button class="mt-4 text-orange-600 text-sm hover:underline" onclick="onboardingWizard.goToStep(4)">
                                ✏️ Edit Goals
                            </button>
                        </div>
                    </div>

                    <!-- Data Validation -->
                    <div id="data-validation" class="bg-gray-50 p-4 rounded-lg">
                        <h4 class="font-semibold text-gray-800 mb-2">📊 Data Validation</h4>
                        <div id="validation-messages" class="space-y-1 text-sm">
                            <!-- Validation messages will be inserted here -->
                        </div>
                    </div>

                    <!-- Generate Button -->
                    <div class="text-center pt-6">
                        <button id="generate-plan-btn" class="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-colors">
                            🚀 Generate My Retirement Plan
                        </button>
                        <p class="text-sm text-gray-500 mt-2">This will show your Enhanced Summary and action buttons</p>
                    </div>
                </div>
            </div>
        `;
    }

    setupStepListeners(stepNumber) {
        switch (stepNumber) {
            case 1:
                this.setupHouseholdListeners();
                break;
            case 2:
                this.setupFinancesListeners();
                break;
            case 3:
                this.setupPropertyListeners();
                break;
            case 4:
                this.setupGoalsListeners();
                break;
            case 5:
                this.setupReviewListeners();
                break;
        }
    }

    setupHouseholdListeners() {
        // Toggle expandable sections
        this.setupToggleListener('dependents-toggle', 'dependents-content');
        this.setupToggleListener('living-toggle', 'living-content');
        this.setupToggleListener('health-toggle', 'health-content');
    }

    setupFinancesListeners() {
        // Toggle expandable sections
        this.setupToggleListener('investments-toggle', 'investments-content');
        this.setupToggleListener('income-toggle', 'income-content');
        this.setupToggleListener('debt-toggle', 'debt-content');

        // Update employer contributions when salary changes
        const salaryInput = $('finances-salary');
        if (salaryInput) {
            salaryInput.addEventListener('input', (e) => {
                const salary = parseFloat(e.target.value) || 0;
                const employerContrib = Math.round(salary * ENHANCED_CONFIG.SUPER_GUARANTEE_RATE);
                safeSetValue('finances-employer-contrib', employerContrib);
            });
        }
    }

    setupPropertyListeners() {
        // Home status radio buttons
        const homeStatusRadios = document.querySelectorAll('input[name="home-status"]');
        homeStatusRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                const homeDetails = $('home-details');
                const loanField = $('loan-remaining-field');

                if (e.target.value === 'rent') {
                    homeDetails.classList.add('hidden');
                } else {
                    homeDetails.classList.remove('hidden');
                    if (e.target.value === 'own') {
                        loanField.classList.add('hidden');
                        safeSetValue('property-loan-remaining', 0);
                    } else {
                        loanField.classList.remove('hidden');
                    }
                }
            });
        });

        // Investment property checkbox
        const investmentCheckbox = $('has-investment-property');
        if (investmentCheckbox) {
            investmentCheckbox.addEventListener('change', (e) => {
                const details = $('investment-property-details');
                if (e.target.checked) {
                    details.classList.remove('hidden');
                } else {
                    details.classList.add('hidden');
                }
            });
        }
    }

    setupGoalsListeners() {
        // Risk tolerance radio buttons
        const riskRadios = document.querySelectorAll('input[name="risk-tolerance"]');
        riskRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.data.goals.riskTolerance = e.target.value;
            });
        });

        // Inheritance selection
        const inheritanceSelect = $('goals-leave-inheritance');
        if (inheritanceSelect) {
            inheritanceSelect.addEventListener('change', (e) => {
                const amountField = $('inheritance-amount-field');
                if (e.target.value === 'no') {
                    amountField.classList.add('hidden');
                } else {
                    amountField.classList.remove('hidden');
                }
            });
        }
    }

    setupReviewListeners() {
        const generateBtn = $('generate-plan-btn');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => this.generateRetirementSummary());
        }

        this.runDataValidation();
    }

    setupToggleListener(toggleId, contentId) {
        const toggle = $(toggleId);
        const content = $(contentId);

        if (toggle && content) {
            toggle.addEventListener('click', () => {
                const isHidden = content.classList.contains('hidden');
                if (isHidden) {
                    content.classList.remove('hidden');
                    toggle.querySelector('span:last-child').textContent = '▲';
                } else {
                    content.classList.add('hidden');
                    toggle.querySelector('span:last-child').textContent = '▼';
                }
            });
        }
    }

    updateNavigationButtons() {
        const prevBtn = $('prev-btn');
        const nextBtn = $('next-btn');

        if (prevBtn) {
            prevBtn.style.visibility = this.currentStep === 1 ? 'hidden' : 'visible';
        }

        if (nextBtn) {
            if (this.currentStep === this.totalSteps) {
                // Hide the next button on review step since we have the main Generate button
                nextBtn.style.display = 'none';
            } else {
                nextBtn.style.display = 'inline-block';
                nextBtn.textContent = 'Next →';
                nextBtn.onclick = () => this.nextStep();
            }
        }
    }

    nextStep() {
        if (this.validateCurrentStep()) {
            this.updateDataFromForms();
            if (this.currentStep < this.totalSteps) {
                this.showStep(this.currentStep + 1);
            }
        }
    }

    previousStep() {
        if (this.currentStep > 1) {
            this.updateDataFromForms();
            this.showStep(this.currentStep - 1);
        }
    }

    goToStep(stepNumber) {
        if (stepNumber >= 1 && stepNumber <= this.totalSteps) {
            this.updateDataFromForms();
            this.showStep(stepNumber);
        }
    }

    validateCurrentStep() {
        // Basic validation - can be enhanced based on requirements
        switch (this.currentStep) {
            case 1:
                const age = safeGetValue('household-age');
                if (age < 18 || age > 100) {
                    alert('Please enter a valid age between 18 and 100');
                    return false;
                }
                break;
            case 2:
                const salary = safeGetValue('finances-salary');
                if (salary < 0) {
                    alert('Please enter a valid salary');
                    return false;
                }
                break;
        }
        return true;
    }

    updateDataFromForms() {
        // Update household data
        this.data.household.age = safeGetValue('household-age') || this.data.household.age;
        this.data.household.location = document.querySelector('#household-location')?.value || this.data.household.location;
        this.data.household.maritalStatus = document.querySelector('#household-marital')?.value || this.data.household.maritalStatus;
        this.data.household.partnerAge = safeGetValue('household-partner-age') || this.data.household.partnerAge;
        this.data.household.retirementAge = safeGetValue('household-retirement-age') || this.data.household.retirementAge;

        // Update finances data
        this.data.finances.income.salary = safeGetValue('finances-salary') || this.data.finances.income.salary;
        this.data.finances.income.partnerSalary = safeGetValue('finances-partner-salary') || this.data.finances.income.partnerSalary;
        this.data.finances.superannuation.currentBalance = safeGetValue('finances-super-balance') || this.data.finances.superannuation.currentBalance;
        this.data.finances.superannuation.partnerCurrentBalance = safeGetValue('finances-partner-super') || this.data.finances.superannuation.partnerCurrentBalance;
        this.data.finances.superannuation.employerContributions = safeGetValue('finances-employer-contrib') || this.data.finances.superannuation.employerContributions;
        this.data.finances.superannuation.voluntaryContributions = safeGetValue('finances-voluntary-contrib') || this.data.finances.superannuation.voluntaryContributions;
        this.data.finances.emergencyFund = safeGetValue('finances-emergency-fund') || this.data.finances.emergencyFund;
        this.data.finances.savingsRate = safeGetValue('finances-savings-rate') || this.data.finances.savingsRate;
        this.data.finances.otherInvestments.shares = safeGetValue('finances-shares') || this.data.finances.otherInvestments.shares;
        this.data.finances.otherInvestments.monthlyContribution = safeGetValue('finances-monthly-investment') || this.data.finances.otherInvestments.monthlyContribution;
        this.data.finances.debt.creditCards = safeGetValue('finances-credit-cards') || this.data.finances.debt.creditCards;
        this.data.finances.debt.personalLoans = safeGetValue('finances-personal-loans') || this.data.finances.debt.personalLoans;

        // Update property data
        const homeStatus = document.querySelector('input[name="home-status"]:checked')?.value;
        if (homeStatus) {
            this.data.property.homeStatus = homeStatus;
        }
        this.data.property.homeDetails.purchasePrice = safeGetValue('property-purchase-price') || this.data.property.homeDetails.purchasePrice;
        this.data.property.homeDetails.currentValue = safeGetValue('property-current-value') || this.data.property.homeDetails.currentValue;
        this.data.property.homeDetails.loanRemaining = safeGetValue('property-loan-remaining') || this.data.property.homeDetails.loanRemaining;
        this.data.property.homeDetails.loanRate = safeGetValue('property-loan-rate') || this.data.property.homeDetails.loanRate;

        // Investment property fields
        this.data.property.investmentProperty.details.purchasePrice = safeGetValue('investment-purchase-price') || this.data.property.investmentProperty.details.purchasePrice;
        this.data.property.investmentProperty.details.currentValue = safeGetValue('investment-current-value') || this.data.property.investmentProperty.details.currentValue;
        this.data.property.investmentProperty.details.loanRemaining = safeGetValue('investment-loan-remaining') || this.data.property.investmentProperty.details.loanRemaining;
        this.data.property.investmentProperty.details.loanRate = safeGetValue('investment-loan-rate') || this.data.property.investmentProperty.details.loanRate;
        this.data.property.investmentProperty.details.weeklyRent = safeGetValue('investment-weekly-rent') || this.data.property.investmentProperty.details.weeklyRent;
        this.data.property.investmentProperty.details.expenses = safeGetValue('investment-expenses') || this.data.property.investmentProperty.details.expenses;

        // Update goals data
        this.data.goals.retirementAge = safeGetValue('goals-retirement-age') || this.data.goals.retirementAge;
        this.data.goals.riskTolerance = safeGetValue('goals-risk-tolerance') || this.data.goals.riskTolerance;
        this.data.goals.lifestyleGoals.incomeNeeded = safeGetValue('goals-income-needed') || this.data.goals.lifestyleGoals.incomeNeeded;
        this.data.goals.lifestyleGoals.travelPlans = document.querySelector('#goals-travel-plans')?.value || this.data.goals.lifestyleGoals.travelPlans;
        this.data.goals.lifestyleGoals.hobbies = document.querySelector('#goals-hobbies')?.value || this.data.goals.lifestyleGoals.hobbies;
        this.data.goals.legacyPlanning.leaveInheritance = document.querySelector('#goals-leave-inheritance')?.value || this.data.goals.legacyPlanning.leaveInheritance;
        this.data.goals.legacyPlanning.inheritanceAmount = safeGetValue('goals-inheritance-amount') || this.data.goals.legacyPlanning.inheritanceAmount;
    }

    runDataValidation() {
        const validationMessages = $('validation-messages');
        if (!validationMessages) return;

        const messages = [];

        // Check for basic completeness
        if (this.data.household.age < 18) {
            messages.push('⚠️ Age seems too low');
        }

        if (this.data.finances.income.salary <= 0) {
            messages.push('⚠️ Please check your salary amount');
        }

        if (this.data.goals.retirementAge <= this.data.household.age) {
            messages.push('⚠️ Retirement age should be later than current age');
        }

        if (messages.length === 0) {
            messages.push('✅ All data looks good!');
        }

        validationMessages.innerHTML = messages.map(msg => `<div>${msg}</div>`).join('');
    }

    async generateRetirementSummary() {
        // Update data and mark as completed
        this.updateDataFromForms();
        this.isCompleted = true;

        // Save the onboarding data
        this.saveProgress();

        // Hide the wizard and show results + advanced calculator
        this.showResultsAndAdvancedCalculator();
    }

    showResultsAndAdvancedCalculator() {
        // Hide the onboarding wizard
        const wizard = $('onboarding-wizard');
        if (wizard) {
            wizard.style.display = 'none';
        }

        // Show the Enhanced Summary container
        const enhancedSummaryContainer = $('enhanced-summary-container');
        if (enhancedSummaryContainer) {
            enhancedSummaryContainer.classList.remove('hidden');
            this.populateEnhancedSummary();
        }

        // Show the Action Buttons container (which now includes all the buttons)
        const actionButtonsContainer = $('action-buttons-container');
        if (actionButtonsContainer) {
            actionButtonsContainer.classList.remove('hidden');
        }

        // Populate the Advanced Calculator with onboarding data
        this.populateAdvancedCalculator();
    }

    populateEnhancedSummary() {
        const enhancedSummaryContent = $('enhanced-summary-content');
        if (!enhancedSummaryContent) return;

        // Calculate basic retirement projections using the existing data
        const basicResults = this.calculateBasicRetirementProjection();

        enhancedSummaryContent.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                <div class="bg-white p-4 rounded-lg border border-gray-200">
                    <h3 class="text-lg font-semibold text-gray-800 mb-2">💰 Current Financial Position</h3>
                    <div class="space-y-1 text-sm">
                        <div class="flex justify-between">
                            <span>Total Super:</span>
                            <span class="font-medium">$${basicResults.currentSuper.toLocaleString()}</span>
                        </div>
                        <div class="flex justify-between">
                            <span>Total Savings:</span>
                            <span class="font-medium">$${basicResults.currentSavings.toLocaleString()}</span>
                        </div>
                        <div class="flex justify-between">
                            <span>Annual Income:</span>
                            <span class="font-medium">$${basicResults.annualIncome.toLocaleString()}</span>
                        </div>
                        <div class="flex justify-between">
                            <span>Living Expenses:</span>
                            <span class="font-medium">$${basicResults.monthlyLivingExpenses.toLocaleString()}/month</span>
                        </div>
                    </div>
                </div>

                <div class="bg-white p-4 rounded-lg border border-gray-200">
                    <h3 class="text-lg font-semibold text-gray-800 mb-2">🎯 Retirement Goals</h3>
                    <div class="space-y-1 text-sm">
                        <div class="flex justify-between">
                            <span>Your Current Age:</span>
                            <span class="font-medium">${basicResults.userAge} years</span>
                        </div>
                        ${basicResults.partnerAge && basicResults.maritalStatus !== 'single' ?
                            `<div class="flex justify-between">
                                <span>Partner Age:</span>
                                <span class="font-medium">${basicResults.partnerAge} years</span>
                            </div>` : ''
                        }
                        <div class="flex justify-between">
                            <span>Target Retirement Age:</span>
                            <span class="font-medium">${basicResults.retirementAge}</span>
                        </div>
                        <div class="flex justify-between">
                            <span>Desired Income:</span>
                            <span class="font-medium">$${basicResults.desiredIncome.toLocaleString()}/year</span>
                        </div>
                        <div class="flex justify-between">
                            <span>Years to Go:</span>
                            <span class="font-medium">${basicResults.yearsToRetirement} years</span>
                        </div>
                    </div>
                </div>

                <div class="bg-white p-4 rounded-lg border border-gray-200">
                    <h3 class="text-lg font-semibold text-gray-800 mb-2">📊 Quick Assessment</h3>
                    <div class="space-y-1 text-sm">
                        <div class="flex justify-between">
                            <span>Confidence Level:</span>
                            <span class="font-medium ${basicResults.confidence >= 70 ? 'text-green-600' : basicResults.confidence >= 50 ? 'text-yellow-600' : 'text-red-600'}">${basicResults.confidence}%</span>
                        </div>
                        <div class="flex justify-between">
                            <span>Risk Tolerance:</span>
                            <span class="font-medium">${basicResults.riskTolerance}/10</span>
                        </div>
                        <div class="flex justify-between">
                            <span>Status:</span>
                            <span class="font-medium ${basicResults.onTrack ? 'text-green-600' : 'text-red-600'}">${basicResults.onTrack ? 'On Track' : 'Needs Work'}</span>
                        </div>
                        <div class="pt-2 border-t border-gray-200">
                            <div class="text-xs text-gray-600 mb-1">Money Longevity:</div>
                            <div class="font-medium text-xs ${basicResults.moneyLongevity.type === 'surplus' ? 'text-green-600' : 'text-red-600'}">
                                ${basicResults.moneyLongevity.message}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4">
                <h3 class="text-lg font-semibold text-blue-800 mb-2">🚀 Next Steps</h3>
                <p class="text-blue-700 mb-3">Your onboarding data has been transferred to the Advanced Calculator below. Use the action buttons to:</p>
                <ul class="text-sm text-blue-600 space-y-1">
                    <li>• Run detailed simulations and stress tests</li>
                    <li>• Compare different retirement scenarios</li>
                    <li>• Optimize your investment allocation</li>
                    <li>• Export your complete retirement plan</li>
                </ul>
            </div>
        `;
    }

    createResultsTabs() {
        // Create the tab structure for Results and Advanced Calculator
        const container = $('.container');
        if (!container) return;

        const tabsHTML = `
            <div id="results-tabs" class="bg-white rounded-lg shadow-lg mb-8">
                <!-- Tab Navigation -->
                <div class="border-b border-gray-200">
                    <nav class="-mb-px flex space-x-8 px-6" aria-label="Tabs">
                        <button id="review-tab" class="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm tab-button" onclick="onboardingWizard.showResultsTab('review')">
                            📋 Review Details
                        </button>
                        <button id="results-tab" class="border-blue-500 text-blue-600 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm tab-button active" onclick="onboardingWizard.showResultsTab('results')">
                            📊 My Basic Result
                        </button>
                        <button id="advanced-tab" class="border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm tab-button" onclick="onboardingWizard.showResultsTab('advanced')">
                            🔧 Advanced Calculator
                        </button>
                    </nav>
                </div>

                <!-- Tab Content -->
                <div id="results-tab-content" class="p-6">
                    <!-- Content will be dynamically loaded -->
                </div>
            </div>
        `;

        // Insert after the onboarding wizard
        const wizard = $('onboarding-wizard');
        if (wizard) {
            wizard.insertAdjacentHTML('afterend', tabsHTML);
        }

        // Show the results tab by default
        this.showResultsTab('results');
    }

    showResultsTab(tabName) {
        // Update tab appearance
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active', 'border-blue-500', 'text-blue-600');
            btn.classList.add('border-transparent', 'text-gray-500');
        });

        const activeTab = $(`${tabName}-tab`);
        if (activeTab) {
            activeTab.classList.add('active', 'border-blue-500', 'text-blue-600');
            activeTab.classList.remove('border-transparent', 'text-gray-500');
        }

        // Update content
        const content = $('results-tab-content');
        if (content) {
            switch (tabName) {
                case 'review':
                    content.innerHTML = this.generateReviewTabContent();
                    break;
                case 'results':
                    content.innerHTML = this.generateBasicResultsContent();
                    break;
                case 'advanced':
                    content.innerHTML = this.generateAdvancedCalculatorContent();
                    break;
            }
        }
    }

    generateReviewTabContent() {
        return this.generateReviewStep(); // Reuse the review step content
    }

    generateBasicResultsContent() {
        // Calculate basic retirement projections using the existing simulator
        const basicResults = this.calculateBasicRetirementProjection();

        return `
            <div class="basic-results-content">
                <div class="text-center mb-8">
                    <h2 class="text-3xl font-bold text-gray-900 mb-4">Your Basic Retirement Summary</h2>
                    <p class="text-lg text-gray-600">Based on your onboarding information</p>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    <!-- Years to Retirement -->
                    <div class="bg-blue-50 p-6 rounded-lg text-center">
                        <div class="text-2xl font-bold text-blue-600">${basicResults.yearsToRetirement}</div>
                        <div class="text-sm text-blue-800">Years to Retirement</div>
                        <div class="text-xs text-gray-600 mt-1">From age ${this.data.household.age} to ${this.data.goals.retirementAge}</div>
                    </div>

                    <!-- Future Super -->
                    <div class="bg-green-50 p-6 rounded-lg text-center">
                        <div class="text-2xl font-bold text-green-600">${formatCurrency(basicResults.futureSuper)}</div>
                        <div class="text-sm text-green-800">Future Super Balance</div>
                        <div class="text-xs text-gray-600 mt-1">At retirement age</div>
                    </div>

                    <!-- Future Savings -->
                    <div class="bg-purple-50 p-6 rounded-lg text-center">
                        <div class="text-2xl font-bold text-purple-600">${formatCurrency(basicResults.futureSavings)}</div>
                        <div class="text-sm text-purple-800">Future Savings</div>
                        <div class="text-xs text-gray-600 mt-1">Emergency fund growth</div>
                    </div>

                    <!-- Future Investments -->
                    <div class="bg-orange-50 p-6 rounded-lg text-center">
                        <div class="text-2xl font-bold text-orange-600">${formatCurrency(basicResults.futureInvestments)}</div>
                        <div class="text-sm text-orange-800">Future Investments</div>
                        <div class="text-xs text-gray-600 mt-1">Shares and other assets</div>
                    </div>

                    <!-- Accessible Home Equity -->
                    <div class="bg-indigo-50 p-6 rounded-lg text-center">
                        <div class="text-2xl font-bold text-indigo-600">${formatCurrency(basicResults.accessibleHomeEquity)}</div>
                        <div class="text-sm text-indigo-800">Accessible Home Equity</div>
                        <div class="text-xs text-gray-600 mt-1">${ENHANCED_CONFIG.HOME_EQUITY_ACCESS_RATE * 100}% of home value</div>
                    </div>

                    <!-- Property Equity -->
                    <div class="bg-teal-50 p-6 rounded-lg text-center">
                        <div class="text-2xl font-bold text-teal-600">${formatCurrency(basicResults.propertyEquity)}</div>
                        <div class="text-sm text-teal-800">Property Equity</div>
                        <div class="text-xs text-gray-600 mt-1">Investment property net value</div>
                    </div>
                </div>

                <!-- Total Assets -->
                <div class="bg-gray-100 p-8 rounded-lg mb-8 text-center">
                    <h3 class="text-xl font-semibold text-gray-800 mb-4">Total Assets at Retirement</h3>
                    <div class="text-4xl font-bold text-gray-900 mb-2">${formatCurrency(basicResults.totalAssets)}</div>
                    <div class="text-sm text-gray-600">Combined value of all your assets</div>
                </div>

                <!-- Income Analysis -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div class="bg-yellow-50 p-6 rounded-lg">
                        <h4 class="text-lg font-semibold text-yellow-800 mb-4">Income Needed (ASFA based)</h4>
                        <div class="text-2xl font-bold text-yellow-600 mb-2">${formatCurrency(basicResults.incomeNeeded)}</div>
                        <div class="text-sm text-yellow-700">Adjusted for inflation over ${basicResults.yearsToRetirement} years</div>
                        <div class="text-xs text-gray-600 mt-2">Today: ${formatCurrency(this.data.goals.lifestyleGoals.incomeNeeded)}</div>
                    </div>

                    <div class="bg-red-50 p-6 rounded-lg">
                        <h4 class="text-lg font-semibold text-red-800 mb-4">Expected Aged Care Costs</h4>
                        <div class="text-2xl font-bold text-red-600 mb-2">${formatCurrency(basicResults.agedCareCosts)}</div>
                        <div class="text-sm text-red-700">Per year (future value)</div>
                        <div class="text-xs text-gray-600 mt-2">Average 3.5 years from age 85</div>
                    </div>
                </div>

                <!-- Retirement Goal Assessment -->
                <div class="text-center p-8 rounded-lg ${basicResults.goalMet ? 'bg-green-100' : 'bg-red-100'} mb-8">
                    <div class="text-2xl mb-4">
                        ${basicResults.goalMet ? '✅' : '❌'}
                    </div>
                    <h3 class="text-xl font-semibold ${basicResults.goalMet ? 'text-green-800' : 'text-red-800'} mb-2">
                        Retirement Goal ${basicResults.goalMet ? 'Met' : 'Not Met'}
                    </h3>
                    <p class="text-sm ${basicResults.goalMet ? 'text-green-700' : 'text-red-700'}">
                        ${basicResults.goalMet
                            ? 'Your current plan should provide the income you need in retirement'
                            : 'You may need to adjust your savings or retirement plans'
                        }
                    </p>
                </div>

                <!-- Projected Remaining Assets -->
                <div class="bg-gray-50 p-6 rounded-lg text-center">
                    <h4 class="text-lg font-semibold text-gray-800 mb-4">
                        Projected remaining assets at age ${basicResults.lifeExpectancy}
                    </h4>
                    <div class="text-3xl font-bold ${basicResults.remainingAssets > 0 ? 'text-green-600' : 'text-red-600'} mb-2">
                        ${formatCurrency(Math.max(0, basicResults.remainingAssets))}
                    </div>
                    <div class="text-sm text-gray-600">
                        ${basicResults.remainingAssets > 0
                            ? 'Assets remaining for inheritance or additional security'
                            : 'Assets may be depleted - consider adjusting your plan'
                        }
                    </div>
                </div>

                <!-- Call to Action -->
                <div class="mt-8 p-6 bg-blue-50 rounded-lg text-center">
                    <h4 class="text-lg font-semibold text-blue-800 mb-4">Want More Detailed Analysis?</h4>
                    <p class="text-sm text-blue-700 mb-4">
                        Use the Advanced Calculator to refine your projections with additional options like investment properties,
                        detailed risk analysis, and Monte Carlo simulations.
                    </p>
                    <button class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
                            onclick="onboardingWizard.showResultsTab('advanced')">
                        🔧 Open Advanced Calculator
                    </button>
                </div>
            </div>
        `;
    }

    calculateBasicRetirementProjection() {
        const data = this.data;
        const yearsToRetirement = data.goals.retirementAge - data.household.age;
        const lifeExpectancy = 90; // Default assumption
        const yearsInRetirement = lifeExpectancy - data.goals.retirementAge;

        // Use config defaults for growth rates
        const defaults = ENHANCED_CONFIG.DEFAULTS;
        const superReturn = defaults.economic.superReturn;
        const investmentReturn = defaults.economic.investmentReturn;
        const inflation = defaults.economic.inflation;
        const propertyGrowth = defaults.property.propertyGrowthRate / 100;

        // Calculate future super balance
        const totalAnnualContributions = data.finances.superannuation.employerContributions + data.finances.superannuation.voluntaryContributions;
        const futureSuper = this.calculateCompoundGrowth(
            data.finances.superannuation.currentBalance,
            totalAnnualContributions,
            superReturn,
            yearsToRetirement
        );

        // Calculate future savings
        const futureSavings = this.calculateCompoundGrowth(
            data.finances.emergencyFund,
            0, // Assuming no additional savings contributions for basic calc
            defaults.economic.savingsReturn,
            yearsToRetirement
        );

        // Calculate future investments
        const futureInvestments = this.calculateCompoundGrowth(
            data.finances.otherInvestments.shares,
            0,
            investmentReturn,
            yearsToRetirement
        );

        // Calculate home equity (accessible portion)
        let accessibleHomeEquity = 0;
        if (data.property.homeStatus !== 'rent') {
            const futureHomeValue = data.property.homeDetails.currentValue * Math.pow(1 + propertyGrowth, yearsToRetirement);
            const futureLoanBalance = Math.max(0, data.property.homeDetails.loanRemaining - (yearsToRetirement * 10000)); // Simplified loan reduction
            accessibleHomeEquity = (futureHomeValue - futureLoanBalance) * ENHANCED_CONFIG.HOME_EQUITY_ACCESS_RATE;
        }

        // Calculate property equity
        let propertyEquity = 0;
        if (data.property.investmentProperty.hasInvestment) {
            const futurePropertyValue = data.property.investmentProperty.details.currentValue * Math.pow(1 + propertyGrowth, yearsToRetirement);
            const futureLoan = Math.max(0, data.property.investmentProperty.details.loanRemaining - (yearsToRetirement * 15000)); // Simplified
            propertyEquity = futurePropertyValue - futureLoan;
        }

        // Calculate total assets
        const totalAssets = futureSuper + futureSavings + futureInvestments + accessibleHomeEquity + propertyEquity;

        // Calculate monthly living expenses using the same logic as the existing calculator
        const annualIncome = data.finances.income.salary + (data.finances.income.partnerSalary || 0);
        const monthlySalary = annualIncome / 12;
        const savingsRate = 0.15; // Default 15% savings rate from existing calculator
        const monthlyLivingExpenses = monthlySalary * (1 - savingsRate);
        const annualLivingExpenses = monthlyLivingExpenses * 12;

        // Calculate income needed (adjusted for inflation)
        const incomeNeeded = data.goals.lifestyleGoals.incomeNeeded * Math.pow(1 + inflation, yearsToRetirement);

        // Calculate aged care costs (future value)
        const agedCareCosts = defaults.healthcare.agedCareAnnualCost * Math.pow(1 + inflation, yearsToRetirement + 15); // Assume care starts 15 years into retirement

        // Simple retirement goal assessment (4% rule)
        const sustainableIncome = totalAssets * 0.04;
        const goalMet = sustainableIncome >= incomeNeeded;

        // Calculate remaining assets at life expectancy
        const totalDrawdown = incomeNeeded * yearsInRetirement + (agedCareCosts * defaults.healthcare.agedCareDuration);
        const remainingAssets = totalAssets - totalDrawdown;

        // Calculate money duration - when will money run out or what's left at age 120
        const moneyLongevityAnalysis = this.calculateMoneyLongevity(totalAssets, incomeNeeded, data.household.age, data.household.partnerAge, data.goals.retirementAge, data.household.maritalStatus);

        return {
            yearsToRetirement,
            futureSuper: Math.round(futureSuper),
            futureSavings: Math.round(futureSavings),
            futureInvestments: Math.round(futureInvestments),
            accessibleHomeEquity: Math.round(accessibleHomeEquity),
            propertyEquity: Math.round(propertyEquity),
            totalAssets: Math.round(totalAssets),
            incomeNeeded: Math.round(incomeNeeded),
            agedCareCosts: Math.round(agedCareCosts),
            goalMet,
            lifeExpectancy,
            remainingAssets: Math.round(remainingAssets),
            // Additional data for Enhanced Summary
            currentSuper: data.finances.superannuation.currentBalance,
            currentSavings: data.finances.emergencyFund + data.finances.otherInvestments.shares,
            annualIncome: annualIncome,
            retirementAge: data.goals.retirementAge,
            desiredIncome: data.goals.lifestyleGoals.incomeNeeded,
            confidence: this.calculateConfidenceScore(),
            riskTolerance: data.finances.riskTolerance,
            onTrack: goalMet,
            monthlyLivingExpenses: Math.round(monthlyLivingExpenses),
            annualLivingExpenses: Math.round(annualLivingExpenses),
            userAge: data.household.age,
            partnerAge: data.household.partnerAge || null,
            maritalStatus: data.household.maritalStatus,
            moneyLongevity: moneyLongevityAnalysis
        };
    }

    calculateCompoundGrowth(principal, annualContribution, rate, years) {
        // Compound growth formula with regular contributions
        const futureValue = principal * Math.pow(1 + rate, years);
        const contributionValue = annualContribution * ((Math.pow(1 + rate, years) - 1) / rate);
        return futureValue + contributionValue;
    }

    calculateConfidenceScore() {
        const data = this.data;
        let score = 50; // Base score

        // Age factor - younger people have more time
        if (data.household.age < 35) score += 15;
        else if (data.household.age < 45) score += 10;
        else if (data.household.age < 55) score += 5;

        // Income factor
        if (data.finances.income.salary > 100000) score += 10;
        else if (data.finances.income.salary > 70000) score += 5;

        // Super balance factor
        if (data.finances.superannuation.currentBalance > 200000) score += 15;
        else if (data.finances.superannuation.currentBalance > 100000) score += 10;
        else if (data.finances.superannuation.currentBalance > 50000) score += 5;

        // Emergency fund factor
        if (data.finances.emergencyFund > 20000) score += 10;
        else if (data.finances.emergencyFund > 10000) score += 5;

        // Property factor
        if (data.property.homeStatus === 'own') score += 10;
        else if (data.property.homeStatus === 'mortgage') score += 5;

        // Investment property factor
        if (data.property.investmentProperty.hasInvestment) score += 10;

        // Risk tolerance factor (balanced is good)
        if (data.finances.riskTolerance >= 5 && data.finances.riskTolerance <= 7) score += 5;

        return Math.min(Math.max(score, 10), 95); // Cap between 10-95%
    }

    createEnhancedInput(id, value, type = 'currency', options = {}) {
        const {
            min = 0,
            max = null,
            step = null,
            placeholder = '',
            tooltip = '',
            required = false,
            gamingLevel = 1 // 1-3, higher = more playful
        } = options;

        // Gaming-style classes and effects
        const gamingClasses = gamingLevel >= 2 ?
            'transform transition-all duration-200 hover:scale-105 hover:shadow-lg focus:scale-105 focus:shadow-xl focus:ring-4 focus:ring-blue-300' :
            'transition-all duration-150 hover:shadow-md focus:shadow-lg';

        // Input styling with gaming elements
        const baseClasses = `
            w-full max-w-[140px] px-3 py-2 text-sm font-mono text-right
            bg-gradient-to-r from-gray-50 to-white
            border-2 border-gray-300 rounded-lg
            focus:border-blue-500 focus:bg-white focus:outline-none
            ${gamingClasses}
            ${gamingLevel >= 3 ? 'border-gradient hover:border-gradient-intense' : ''}
        `.trim();

        // Format display value based on type
        let displayValue = value || '';
        if (value && type === 'currency') {
            displayValue = formatNumber(parseFloat(value));
        } else if (value && type === 'percentage') {
            displayValue = parseFloat(value).toFixed(1);
        } else if (value && type === 'number') {
            displayValue = parseFloat(value).toString();
        }

        // Create input with gaming enhancements
        const inputHtml = `
            <div class="relative group">
                <input
                    type="text"
                    id="${id}"
                    value="${displayValue}"
                    maxlength="14"
                    placeholder="${placeholder}"
                    class="${baseClasses}"
                    data-format-type="${type}"
                    data-raw-value="${value || 0}"
                    ${min !== null ? `data-min="${min}"` : ''}
                    ${max !== null ? `data-max="${max}"` : ''}
                    ${step !== null ? `data-step="${step}"` : ''}
                    ${required ? 'required' : ''}
                />
                ${type === 'currency' ?
                    `<div class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm font-bold pointer-events-none">$</div>` : ''
                }
                ${type === 'percentage' ?
                    `<div class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm font-bold pointer-events-none">%</div>` : ''
                }
                ${gamingLevel >= 2 ?
                    `<div class="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity duration-300 animate-pulse"></div>` : ''
                }
                ${tooltip ?
                    `<div class="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10 whitespace-nowrap">
                        ${tooltip}
                    </div>` : ''
                }
            </div>
        `;

        return inputHtml;
    }

    setupEnhancedInputListeners() {
        // Add listeners for all enhanced inputs
        document.querySelectorAll('input[data-format-type]').forEach(input => {
            const formatType = input.getAttribute('data-format-type');

            // Format on blur
            input.addEventListener('blur', (e) => {
                const value = e.target.value.replace(/[^\d.-]/g, '');
                const numValue = parseFloat(value);

                if (!isNaN(numValue)) {
                    e.target.setAttribute('data-raw-value', numValue);

                    if (formatType === 'currency') {
                        e.target.value = formatNumber(numValue);
                    } else if (formatType === 'percentage') {
                        e.target.value = numValue.toFixed(1);
                    } else if (formatType === 'number') {
                        e.target.value = numValue.toString();
                    }
                }
            });

            // Clear formatting on focus for easier editing
            input.addEventListener('focus', (e) => {
                const rawValue = e.target.getAttribute('data-raw-value');
                if (rawValue && rawValue !== '0') {
                    e.target.value = rawValue;
                }
                e.target.select(); // Select all text for easy replacement
            });

            // Real-time validation and gaming effects
            input.addEventListener('input', (e) => {
                const value = e.target.value.replace(/[^\d.-]/g, '');
                const numValue = parseFloat(value) || 0;

                // Update raw value
                e.target.setAttribute('data-raw-value', numValue);

                // Add gaming effect for valid inputs
                if (numValue > 0) {
                    e.target.classList.add('border-green-400', 'bg-green-50');
                    e.target.classList.remove('border-red-400', 'bg-red-50');
                } else {
                    e.target.classList.remove('border-green-400', 'bg-green-50');
                }

                // Trigger data update
                this.updateDataFromForms();
            });
        });
    }

    // Static method to enhance any existing input field
    static enhanceExistingInput(inputId, formatType = 'currency', options = {}) {
        const input = document.getElementById(inputId);
        if (!input) return;

        const {
            gamingLevel = 1,
            tooltip = ''
        } = options;

        // Add enhanced styling
        const existingClasses = input.className;
        const enhancedClasses = gamingLevel >= 2 ?
            'transform transition-all duration-200 hover:scale-105 hover:shadow-lg focus:scale-105 focus:shadow-xl focus:ring-4 focus:ring-indigo-300 font-mono text-right' :
            'transition-all duration-150 hover:shadow-md focus:shadow-lg font-mono text-right';

        input.className = existingClasses + ' ' + enhancedClasses;
        input.maxLength = 14;
        input.setAttribute('data-format-type', formatType);

        // Format current value
        const currentValue = parseFloat(input.value) || 0;
        input.setAttribute('data-raw-value', currentValue);

        if (formatType === 'currency' && currentValue > 0) {
            input.value = formatNumber(currentValue);
        } else if (formatType === 'percentage' && currentValue > 0) {
            input.value = currentValue.toFixed(1);
        }

        // Add formatting listeners
        input.addEventListener('blur', (e) => {
            const value = e.target.value.replace(/[^\d.-]/g, '');
            const numValue = parseFloat(value);

            if (!isNaN(numValue)) {
                e.target.setAttribute('data-raw-value', numValue);

                if (formatType === 'currency') {
                    e.target.value = formatNumber(numValue);
                } else if (formatType === 'percentage') {
                    e.target.value = numValue.toFixed(1);
                }
            }
        });

        input.addEventListener('focus', (e) => {
            const rawValue = e.target.getAttribute('data-raw-value');
            if (rawValue && rawValue !== '0') {
                e.target.value = rawValue;
            }
            e.target.select();
        });

        // Add gaming effects
        input.addEventListener('input', (e) => {
            const value = e.target.value.replace(/[^\d.-]/g, '');
            const numValue = parseFloat(value) || 0;

            e.target.setAttribute('data-raw-value', numValue);

            if (numValue > 0) {
                e.target.classList.add('border-green-400', 'bg-green-50');
                e.target.classList.remove('border-red-400', 'bg-red-50');
            } else {
                e.target.classList.remove('border-green-400', 'bg-green-50');
            }
        });

        // Add tooltip if provided
        if (tooltip) {
            input.title = tooltip;
        }
    }

    calculateMoneyLongevity(totalAssets, annualIncomeNeeded, userAge, partnerAge, retirementAge, maritalStatus) {
        // Constants
        const MAX_AGE = 120;
        const currentYear = new Date().getFullYear();

        // Determine the younger person's age (for couples)
        let youngerAge = userAge;
        if (partnerAge && maritalStatus !== 'single') {
            youngerAge = Math.min(userAge, partnerAge);
        }

        // Calculate years from retirement to age 120 for the younger person
        const yearsFromRetirementToMax = MAX_AGE - retirementAge;
        const totalYearsOfRetirement = Math.max(0, yearsFromRetirementToMax);

        // Simple calculation: Total assets / Annual income needed = Years money will last
        const yearsMoneyWillLast = totalAssets / annualIncomeNeeded;

        // Calculate when money runs out
        const moneyRunsOutAge = retirementAge + yearsMoneyWillLast;

        if (moneyRunsOutAge >= MAX_AGE) {
            // Money lasts beyond age 120
            const yearsToAge120 = MAX_AGE - retirementAge;
            const totalSpentByAge120 = annualIncomeNeeded * yearsToAge120;
            const moneyLeftAtAge120 = totalAssets - totalSpentByAge120;

            return {
                type: 'surplus',
                moneyLeftAtAge120: Math.round(moneyLeftAtAge120),
                message: `Money left over at age 120 will be: $${Math.round(moneyLeftAtAge120).toLocaleString()}`
            };
        } else {
            // Money runs out before age 120
            const runOutAge = Math.round(moneyRunsOutAge);

            return {
                type: 'deficit',
                moneyRunsOutAge: runOutAge,
                message: `Money will be zero at age: ${runOutAge}`
            };
        }
    }

    generateAdvancedCalculatorContent() {
        return `
            <div class="advanced-calculator-content">
                <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                    <div class="flex">
                        <div class="flex-shrink-0">
                            <div class="h-5 w-5 text-yellow-400">⚠️</div>
                        </div>
                        <div class="ml-3">
                            <p class="text-sm text-yellow-700">
                                <strong>Review Required:</strong> Some fields use default values not provided in your onboarding.
                                Please review and update these fields for more accurate projections.
                            </p>
                        </div>
                    </div>
                </div>

                <!-- The existing calculator will be loaded here -->
                <div id="advanced-calculator-form">
                    <p class="text-center text-gray-500 py-8">Loading Advanced Calculator...</p>
                </div>
            </div>
        `;
    }

    populateAdvancedCalculator() {
        // This method will be called to populate the existing calculator form with onboarding data
        // We'll implement this after the Advanced Calculator tab is shown
        setTimeout(() => {
            this.mapOnboardingDataToAdvancedForm();
        }, 500);
    }

    mapOnboardingDataToAdvancedForm() {
        // Import utility functions - use global reference if available
        if (!window.utils || !window.utils.safeSetValue) {
            console.error('safeSetValue utility function not available');
            return;
        }

        const safeSetValue = window.utils.safeSetValue;

        // Map onboarding data to the existing form fields
        const mapping = {
            // Personal details
            'yourCurrentAge': this.data.household.age,
            'retirementAge': this.data.goals.retirementAge,
            'yourLifespan': this.data.goals.lifeExpectancy,
            'riskTolerance': this.data.goals.riskTolerance,

            // Partner details (if applicable)
            'partnerCurrentAge': this.data.household.maritalStatus === 'married' ? this.data.household.partnerAge : 0,
            'partnerRetirementAge': this.data.household.maritalStatus === 'married' ? this.data.goals.partnerRetirementAge : 0,
            'partnerLifespan': this.data.household.maritalStatus === 'married' ? this.data.goals.partnerLifeExpectancy : 0,
            'partnerSalary': this.data.household.maritalStatus === 'married' ? this.data.finances.income.partnerSalary : 0,
            'partnerCurrentSuper': this.data.household.maritalStatus === 'married' ? this.data.finances.superannuation.partnerCurrentBalance : 0,

            // Financial details
            'yourSalary': this.data.finances.income.salary,
            'yourCurrentSuper': this.data.finances.superannuation.currentBalance,
            'currentSavings': this.data.finances.emergencyFund,
            'currentStocks': this.data.finances.otherInvestments.shares,
            'monthlyStockContribution': this.data.finances.otherInvestments.monthlyContribution,
            'percentIncomeSaved': this.data.finances.savingsRate,

            // Property details
            'homeValue': this.data.property.homeStatus !== 'rent' ? this.data.property.homeDetails.currentValue : 0,
            'mortgageBalance': this.data.property.homeStatus === 'mortgage' ? this.data.property.homeDetails.loanRemaining : 0,
            'monthlyMortgagePayment': this.data.property.homeStatus === 'mortgage' ? this.data.property.homeDetails.monthlyPayment : 0,

            // Investment property details
            'investmentPropertyValue': this.data.property.investmentProperty.hasInvestment ? this.data.property.investmentProperty.details.currentValue : 0,
            'investmentPropertyLoan': this.data.property.investmentProperty.hasInvestment ? this.data.property.investmentProperty.details.loanRemaining : 0,
            'weeklyRentalIncome': this.data.property.investmentProperty.hasInvestment ? this.data.property.investmentProperty.details.weeklyRent : 0,
            'annualPropertyExpenses': this.data.property.investmentProperty.hasInvestment ? this.data.property.investmentProperty.details.expenses : 0,

            // Goals and lifestyle
            'asfaComfortable': this.data.goals.lifestyleGoals.incomeNeeded
        };

        // Populate the form fields
        let fieldsPopulated = 0;
        const fieldsSetByOnboarding = [];

        Object.keys(mapping).forEach(fieldId => {
            const value = mapping[fieldId];
            if (value !== undefined && value !== null && value !== '' && value !== 0) {
                try {
                    safeSetValue(fieldId, value);
                    fieldsPopulated++;
                    fieldsSetByOnboarding.push(fieldId);
                    console.log(`Populated field ${fieldId} with value:`, value);
                } catch (error) {
                    console.warn(`Failed to set field ${fieldId}:`, error);
                }
            }
        });

        console.log(`Successfully populated ${fieldsPopulated} fields from onboarding data`);

        // Add visual indicators for fields that weren't populated from onboarding
        this.highlightUnsetFields(fieldsSetByOnboarding);
    }

    highlightUnsetFields(fieldsSetByOnboarding = []) {
        // Create a set of fields that were populated by onboarding
        const populatedFields = new Set(fieldsSetByOnboarding);

        // Add a visual indicator for onboarding completion status
        const notificationArea = document.querySelector('.onboarding-integration-status') || this.createStatusNotification();

        // Find all input fields in the advanced calculator
        const allFields = document.querySelectorAll('input[type="number"], input[type="text"], select');
        let fieldsHighlighted = 0;

        allFields.forEach(field => {
            if (field.id && !populatedFields.has(field.id)) {
                // Add a subtle warning indicator for fields not set by onboarding
                field.style.borderColor = '#f59e0b'; // Amber border
                field.style.borderWidth = '1px';
                field.style.borderStyle = 'solid';
                field.title = '⚠️ This field uses a default value from the calculator. Review and update if needed.';

                // Add a small warning icon if one doesn't exist
                if (!field.parentElement.querySelector('.field-warning-icon')) {
                    const icon = document.createElement('span');
                    icon.className = 'field-warning-icon';
                    icon.innerHTML = '⚠️';
                    icon.style.cssText = 'position: absolute; right: 8px; top: 50%; transform: translateY(-50%); font-size: 12px; pointer-events: none;';
                    icon.title = 'Default value - please review';

                    // Make parent relatively positioned if needed
                    if (getComputedStyle(field.parentElement).position === 'static') {
                        field.parentElement.style.position = 'relative';
                    }
                    field.parentElement.appendChild(icon);
                }

                // Add event listeners to remove warning when user interacts with field
                this.addFieldInteractionListeners(field);

                fieldsHighlighted++;
            } else if (field.id && populatedFields.has(field.id)) {
                // Remove any existing warning indicators from populated fields
                field.style.borderColor = '#10b981'; // Green border for populated fields
                field.title = '✅ This field was populated from your onboarding data';

                const existingIcon = field.parentElement.querySelector('.field-warning-icon');
                if (existingIcon) {
                    existingIcon.remove();
                }
            }
        });

        // Update the status notification
        if (notificationArea) {
            notificationArea.innerHTML = `
                <div class="flex items-center space-x-3">
                    <div class="flex-shrink-0">
                        <span class="text-2xl">✅</span>
                    </div>
                    <div>
                        <h3 class="text-sm font-medium text-green-800">
                            Onboarding Data Integrated
                        </h3>
                        <div class="mt-1 text-sm text-green-700">
                            <p>${fieldsSetByOnboarding.length} fields populated from onboarding • ${fieldsHighlighted} fields using defaults</p>
                        </div>
                    </div>
                </div>
            `;
        }

        console.log(`Highlighted ${fieldsHighlighted} fields using default values`);
    }

    addFieldInteractionListeners(field) {
        // Store original value to detect changes
        const originalValue = field.value;

        // Function to remove warning styling
        const removeWarning = () => {
            // Only remove warning if value has actually changed from original
            if (field.value !== originalValue) {
                field.style.borderColor = '';
                field.style.borderWidth = '';
                field.style.borderStyle = '';
                field.title = '';

                // Remove warning icon
                const warningIcon = field.parentElement.querySelector('.field-warning-icon');
                if (warningIcon) {
                    warningIcon.remove();
                }

                console.log(`Removed warning from field: ${field.id}`);
            }
        };

        // Add event listeners for various interactions
        field.addEventListener('input', removeWarning);
        field.addEventListener('change', removeWarning);
        field.addEventListener('blur', removeWarning);

        // For select elements, also listen for focus to catch keyboard navigation
        if (field.tagName.toLowerCase() === 'select') {
            field.addEventListener('focus', removeWarning);
        }
    }

    createStatusNotification() {
        const notification = document.createElement('div');
        notification.className = 'onboarding-integration-status bg-green-50 border border-green-200 rounded-lg p-4 mb-6';

        // Find a good place to insert the notification (at the top of the calculator form)
        const calculatorContainer = document.querySelector('.calculator-container') || document.body;
        calculatorContainer.insertBefore(notification, calculatorContainer.firstChild);

        return notification;
    }

    saveProgress() {
        const progressData = {
            currentStep: this.currentStep,
            data: this.data,
            isCompleted: this.isCompleted,
            timestamp: Date.now()
        };

        saveToLocalStorage('onboarding-progress', progressData);
    }

    loadSavedData() {
        const saved = loadFromLocalStorage('onboarding-progress');
        if (saved) {
            this.currentStep = saved.currentStep || 1;
            this.data = { ...this.data, ...saved.data };
            this.isCompleted = saved.isCompleted || false;
        }
    }

    // Public methods for external access
    showAdvancedCalculator() {
        // Hide onboarding and show only advanced calculator
        const wizard = $('onboarding-wizard');
        if (wizard) {
            wizard.style.display = 'none';
        }

        // If results tabs exist, show advanced tab
        if ($('results-tabs')) {
            this.showResultsTab('advanced');
        }
    }
}

// Global instance
let onboardingWizard = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    onboardingWizard = new OnboardingWizard();
});

// Export for module usage
export default OnboardingWizard;