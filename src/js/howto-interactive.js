// HOW-TO Interactive Features and Animations
// This file provides interactive functionality for the how-to-use.html page

class HowToInteractive {
    constructor() {
        this.currentDemo = null;
        this.animationTimeout = null;
        this.initializeInteractiveFeatures();
    }

    initializeInteractiveFeatures() {
        this.setupDemoInputs();
        this.setupWorkflowDiagram();
        this.setupAnimations();
        this.setupProgressTracking();
    }

    // Setup interactive demo inputs
    setupDemoInputs() {
        const demoInputs = document.querySelectorAll('.demo-input');
        demoInputs.forEach(input => {
            input.addEventListener('input', (e) => {
                this.handleDemoInput(e.target);
            });

            input.addEventListener('focus', (e) => {
                this.highlightDemoSection(e.target);
            });
        });
    }

    handleDemoInput(input) {
        const value = input.value;
        const placeholder = input.placeholder;

        // Real-time validation and feedback
        if (input.type === 'number') {
            if (value < 0) {
                this.showInputFeedback(input, 'Value must be positive', 'error');
            } else if (value > 1000000 && input.placeholder.includes('000')) {
                this.showInputFeedback(input, 'Large value - ensure this is correct', 'warning');
            } else if (value > 0) {
                this.showInputFeedback(input, 'Valid input', 'success');
            }
        }

        // Update related calculations
        this.updateDemoCalculations();
    }

    showInputFeedback(input, message, type) {
        // Remove existing feedback
        const existingFeedback = input.nextElementSibling;
        if (existingFeedback && existingFeedback.classList.contains('input-feedback')) {
            existingFeedback.remove();
        }

        // Create feedback element
        const feedback = document.createElement('div');
        feedback.className = `input-feedback mt-1 text-xs ${this.getFeedbackClass(type)}`;
        feedback.innerHTML = `<i class="${this.getFeedbackIcon(type)} mr-1"></i>${message}`;

        input.parentNode.insertBefore(feedback, input.nextSibling);

        // Auto-remove feedback after 3 seconds
        setTimeout(() => {
            if (feedback && feedback.parentNode) {
                feedback.remove();
            }
        }, 3000);
    }

    getFeedbackClass(type) {
        switch (type) {
            case 'success': return 'text-green-600';
            case 'warning': return 'text-yellow-600';
            case 'error': return 'text-red-600';
            default: return 'text-gray-600';
        }
    }

    getFeedbackIcon(type) {
        switch (type) {
            case 'success': return 'fas fa-check-circle';
            case 'warning': return 'fas fa-exclamation-triangle';
            case 'error': return 'fas fa-times-circle';
            default: return 'fas fa-info-circle';
        }
    }

    highlightDemoSection(input) {
        const demoSection = input.closest('.interactive-demo');
        if (demoSection) {
            demoSection.style.borderColor = '#4f46e5';
            demoSection.style.boxShadow = '0 0 0 3px rgba(79, 70, 229, 0.1)';

            setTimeout(() => {
                demoSection.style.borderColor = '#e2e8f0';
                demoSection.style.boxShadow = 'none';
            }, 2000);
        }
    }

    updateDemoCalculations() {
        // Property demo calculation
        this.updatePropertyDemo();

        // Savings rate demo
        this.updateSavingsDemo();

        // Risk profile demo
        this.updateRiskProfileDemo();
    }

    updatePropertyDemo() {
        const propertyValueInput = document.querySelector('input[placeholder="600,000"]');
        const weeklyRentInput = document.querySelector('input[placeholder="500"]');
        const expensesInput = document.querySelector('input[placeholder="8,000"]');

        if (propertyValueInput && weeklyRentInput && expensesInput) {
            const propertyValue = parseFloat(propertyValueInput.value) || 600000;
            const weeklyRent = parseFloat(weeklyRentInput.value) || 500;
            const expenses = parseFloat(expensesInput.value) || 8000;

            const annualRent = weeklyRent * 52;
            const netCashFlow = annualRent - expenses;
            const yieldPercent = (netCashFlow / propertyValue * 100).toFixed(2);

            const resultElement = document.getElementById('property-result');
            if (resultElement) {
                const isPositive = netCashFlow > 0;
                resultElement.className = `mt-3 p-3 rounded-lg text-sm ${isPositive ? 'bg-green-50' : 'bg-red-50'}`;
                resultElement.innerHTML = `
                    <i class="fas fa-calculator ${isPositive ? 'text-green-600' : 'text-red-600'} mr-2"></i>
                    <span class="${isPositive ? 'text-green-800' : 'text-red-800'}">
                        Annual net cash flow: $${netCashFlow.toLocaleString()} (${yieldPercent}% yield)
                    </span>
                `;
            }
        }
    }

    updateSavingsDemo() {
        const savingsSlider = document.getElementById('savings-slider');
        if (savingsSlider) {
            const savingsRate = parseFloat(savingsSlider.value);
            const currentSavingsDisplay = document.getElementById('current-savings');
            if (currentSavingsDisplay) {
                currentSavingsDisplay.textContent = savingsRate + '%';
            }

            // Update demo chart if it exists
            if (window.demoChart) {
                this.updateDemoChart(savingsRate);
            }
        }
    }

    updateRiskProfileDemo() {
        const ageInput = document.querySelector('input[placeholder="35"]');
        if (ageInput && ageInput.value) {
            const age = parseInt(ageInput.value);
            const riskCapacity = this.calculateRiskCapacity(age);
            this.displayRiskProfile(riskCapacity, age);
        }
    }

    calculateRiskCapacity(age) {
        // Simplified risk capacity calculation based on age
        if (age < 30) return 'High';
        if (age < 45) return 'Moderate-High';
        if (age < 55) return 'Moderate';
        if (age < 65) return 'Moderate-Low';
        return 'Conservative';
    }

    displayRiskProfile(capacity, age) {
        const yearsToRetirement = Math.max(0, 65 - age);
        const riskElement = document.getElementById('risk-profile-demo');

        if (riskElement) {
            riskElement.innerHTML = `
                <div class="p-3 bg-blue-50 rounded-lg text-sm">
                    <i class="fas fa-user-clock text-blue-600 mr-2"></i>
                    <span class="text-blue-800">
                        Age ${age}: ${capacity} risk capacity, ${yearsToRetirement} years to retirement
                    </span>
                </div>
            `;
        }
    }

    // Setup workflow diagram interactions
    setupWorkflowDiagram() {
        const workflowSteps = document.querySelectorAll('.process-step');
        workflowSteps.forEach((step, index) => {
            step.addEventListener('click', () => {
                this.showStepDetails(index + 1);
            });

            step.addEventListener('mouseenter', () => {
                this.highlightStep(step);
            });

            step.addEventListener('mouseleave', () => {
                this.unhighlightStep(step);
            });
        });
    }

    showStepDetails(stepNumber) {
        const stepData = this.getStepData(stepNumber);
        const detailsContainer = document.getElementById('step-details');
        const contentContainer = document.getElementById('step-content');

        if (detailsContainer && contentContainer) {
            contentContainer.innerHTML = `
                <div class="grid md:grid-cols-2 gap-6">
                    <div>
                        <h4 class="text-xl font-semibold mb-3 text-indigo-800">${stepData.title}</h4>
                        <p class="text-gray-700 mb-4">${stepData.description}</p>
                        <ul class="space-y-2">
                            ${stepData.keyPoints.map(point => `
                                <li class="flex items-start">
                                    <i class="fas fa-check-circle text-green-500 mr-2 mt-1"></i>
                                    <span class="text-gray-600">${point}</span>
                                </li>
                            `).join('')}
                        </ul>
                    </div>
                    <div class="bg-gray-50 p-4 rounded-lg">
                        <h5 class="font-semibold text-gray-800 mb-2">What You'll Need:</h5>
                        <ul class="space-y-1">
                            ${stepData.requirements.map(req => `
                                <li class="text-sm text-gray-600">• ${req}</li>
                            `).join('')}
                        </ul>
                        <div class="mt-4">
                            <h5 class="font-semibold text-gray-800 mb-2">Expected Time:</h5>
                            <div class="text-sm text-indigo-600 font-medium">${stepData.timeEstimate}</div>
                        </div>
                    </div>
                </div>
            `;

            detailsContainer.style.display = 'block';
            detailsContainer.scrollIntoView({ behavior: 'smooth' });
        }
    }

    getStepData(stepNumber) {
        const steps = {
            1: {
                title: "Data Input Phase",
                description: "Gather and enter all your financial information accurately. This foundation determines the quality of your retirement analysis.",
                keyPoints: [
                    "Enter personal details (age, retirement plans)",
                    "Input all financial assets (super, savings, investments)",
                    "Include property information (home and investment)",
                    "Specify income and expense details"
                ],
                requirements: [
                    "Recent superannuation statements",
                    "Bank account balances",
                    "Property valuations",
                    "Income tax returns"
                ],
                timeEstimate: "10-15 minutes"
            },
            2: {
                title: "Analysis Phase",
                description: "The calculator runs comprehensive analyses including Monte Carlo simulation and AI-powered recommendations across multiple strategic areas.",
                keyPoints: [
                    "Monte Carlo simulation with 1000+ scenarios",
                    "AI recommendations across 8 strategic areas",
                    "Market cycle analysis for properties",
                    "Risk profiling and asset allocation guidance"
                ],
                requirements: [
                    "Completed data input",
                    "Risk tolerance assessment",
                    "Investment time horizon",
                    "Retirement lifestyle goals"
                ],
                timeEstimate: "2-5 minutes (automated)"
            },
            3: {
                title: "Results Phase",
                description: "Review comprehensive charts, projections, and detailed recommendations to understand your retirement outlook.",
                keyPoints: [
                    "Interactive charts and visualizations",
                    "Year-by-year projections",
                    "Success probability analysis",
                    "Detailed recommendation breakdown"
                ],
                requirements: [
                    "Understanding of chart interpretations",
                    "Knowledge of retirement planning basics",
                    "Time to review recommendations",
                    "Note-taking materials"
                ],
                timeEstimate: "15-30 minutes"
            },
            4: {
                title: "Optimization Phase",
                description: "Test different scenarios and refine your strategy based on the analysis results and recommendations.",
                keyPoints: [
                    "Adjust retirement age scenarios",
                    "Modify savings rates and contributions",
                    "Test property investment strategies",
                    "Optimize asset allocation over time"
                ],
                requirements: [
                    "Alternative scenario parameters",
                    "Understanding of trade-offs",
                    "Flexibility in retirement planning",
                    "Time for multiple analysis runs"
                ],
                timeEstimate: "20-45 minutes"
            },
            5: {
                title: "Implementation Phase",
                description: "Export professional reports, share with advisors, and begin implementing the recommended retirement strategy.",
                keyPoints: [
                    "Export comprehensive PDF reports",
                    "Generate Excel workbooks for detailed analysis",
                    "Share results with financial advisors",
                    "Create implementation timeline"
                ],
                requirements: [
                    "Decision on preferred strategies",
                    "Financial advisor contact (if applicable)",
                    "Implementation timeline",
                    "Regular review schedule"
                ],
                timeEstimate: "10-20 minutes"
            }
        };

        return steps[stepNumber] || {
            title: "Unknown Step",
            description: "Step information not available",
            keyPoints: [],
            requirements: [],
            timeEstimate: "Unknown"
        };
    }

    highlightStep(step) {
        step.style.transform = 'scale(1.05)';
        step.style.borderColor = '#4f46e5';
        step.style.boxShadow = '0 4px 20px rgba(79, 70, 229, 0.3)';
    }

    unhighlightStep(step) {
        step.style.transform = 'scale(1)';
        step.style.borderColor = '#e2e8f0';
        step.style.boxShadow = 'none';
    }

    // Setup animations
    setupAnimations() {
        this.setupScrollAnimations();
        this.setupMonteCarloDemoAnimation();
        this.setupProgressBarAnimations();
    }

    setupScrollAnimations() {
        // Intersection Observer for scroll-triggered animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-fade-in');
                }
            });
        }, observerOptions);

        // Observe feature cards
        document.querySelectorAll('.feature-card').forEach(card => {
            observer.observe(card);
        });

        // Observe process steps
        document.querySelectorAll('.process-step').forEach(step => {
            observer.observe(step);
        });
    }

    setupMonteCarloDemoAnimation() {
        window.startMCAnimation = () => {
            const steps = [
                { id: 'mc-step-1', delay: 0 },
                { id: 'mc-step-2', delay: 800 },
                { id: 'mc-step-3', delay: 1600 },
                { id: 'mc-step-4', delay: 2400 },
                { id: 'mc-step-5', delay: 3200 }
            ];

            // Reset all steps
            steps.forEach(step => {
                const element = document.getElementById(step.id);
                if (element) {
                    element.classList.remove('active');
                }
            });

            // Animate each step
            steps.forEach(step => {
                setTimeout(() => {
                    const element = document.getElementById(step.id);
                    if (element) {
                        element.classList.add('active');
                    }
                }, step.delay);
            });

            // Show completion message
            setTimeout(() => {
                this.showNotification('Monte Carlo simulation complete! This process runs automatically in the calculator.', 'success');
            }, 4000);
        };
    }

    setupProgressBarAnimations() {
        const progressBars = document.querySelectorAll('.progress-bar');
        progressBars.forEach(bar => {
            const fill = bar.querySelector('.progress-fill');
            if (fill) {
                const targetWidth = fill.getAttribute('data-width') || '75%';

                // Animate when visible
                const observer = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            setTimeout(() => {
                                fill.style.width = targetWidth;
                            }, 200);
                        }
                    });
                });

                observer.observe(bar);
            }
        });
    }

    // Setup progress tracking
    setupProgressTracking() {
        this.trackUserProgress();
        this.setupCompletionIndicators();
    }

    trackUserProgress() {
        const sections = ['quick-start', 'features', 'step-by-step', 'workflow', 'advanced', 'troubleshooting'];
        let visitedSections = JSON.parse(localStorage.getItem('howto-progress') || '[]');

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const sectionId = entry.target.id;
                    if (sections.includes(sectionId) && !visitedSections.includes(sectionId)) {
                        visitedSections.push(sectionId);
                        localStorage.setItem('howto-progress', JSON.stringify(visitedSections));
                        this.updateProgressIndicator(visitedSections.length, sections.length);
                    }
                }
            });
        });

        sections.forEach(sectionId => {
            const element = document.getElementById(sectionId);
            if (element) {
                observer.observe(element);
            }
        });

        // Initialize progress indicator
        this.updateProgressIndicator(visitedSections.length, sections.length);
    }

    updateProgressIndicator(current, total) {
        const progressPercent = Math.round((current / total) * 100);

        // Update progress indicator if it exists
        const indicator = document.getElementById('progress-indicator');
        if (indicator) {
            indicator.innerHTML = `
                <div class="flex items-center justify-between mb-2">
                    <span class="text-sm font-medium text-gray-700">Guide Progress</span>
                    <span class="text-sm text-gray-500">${current}/${total} sections</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progressPercent}%"></div>
                </div>
            `;
        }

        // Show completion message
        if (current === total) {
            setTimeout(() => {
                this.showNotification('Congratulations! You\'ve completed the how-to guide. Ready to use the calculator?', 'success');
            }, 1000);
        }
    }

    setupCompletionIndicators() {
        const checkboxes = document.querySelectorAll('.completion-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updateCompletionProgress();
            });
        });
    }

    updateCompletionProgress() {
        const checkboxes = document.querySelectorAll('.completion-checkbox');
        const completed = document.querySelectorAll('.completion-checkbox:checked');
        const progressPercent = Math.round((completed.length / checkboxes.length) * 100);

        const completionProgress = document.getElementById('completion-progress');
        if (completionProgress) {
            completionProgress.querySelector('.progress-fill').style.width = progressPercent + '%';
        }
    }

    // Utility functions
    showNotification(message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 max-w-sm ${this.getNotificationClass(type)}`;
        notification.innerHTML = `
            <div class="flex items-start">
                <i class="${this.getNotificationIcon(type)} mr-3 mt-0.5"></i>
                <div class="flex-1">
                    <p class="text-sm font-medium">${message}</p>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" class="ml-2 text-gray-400 hover:text-gray-600">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        document.body.appendChild(notification);

        // Auto-remove after duration
        setTimeout(() => {
            if (notification && notification.parentNode) {
                notification.remove();
            }
        }, duration);
    }

    getNotificationClass(type) {
        switch (type) {
            case 'success': return 'bg-green-100 text-green-800 border border-green-200';
            case 'warning': return 'bg-yellow-100 text-yellow-800 border border-yellow-200';
            case 'error': return 'bg-red-100 text-red-800 border border-red-200';
            default: return 'bg-blue-100 text-blue-800 border border-blue-200';
        }
    }

    getNotificationIcon(type) {
        switch (type) {
            case 'success': return 'fas fa-check-circle text-green-500';
            case 'warning': return 'fas fa-exclamation-triangle text-yellow-500';
            case 'error': return 'fas fa-times-circle text-red-500';
            default: return 'fas fa-info-circle text-blue-500';
        }
    }

    updateDemoChart(savingsRate) {
        if (window.demoChart) {
            const multiplier = savingsRate / 15; // Base rate is 15%
            const baseData = [150000, 450000, 850000, 1500000];
            const newData = baseData.map(value => Math.round(value * multiplier));

            window.demoChart.data.datasets[0].data = newData;
            window.demoChart.update('active');

            // Update chart title
            window.demoChart.options.plugins.title = {
                display: true,
                text: `Retirement Balance Projection (${savingsRate}% Savings Rate)`,
                font: { size: 16 }
            };
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new HowToInteractive();
});

// Additional CSS for animations
const additionalStyles = `
    .animate-fade-in {
        animation: fadeInUp 0.6s ease forwards;
    }

    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .input-feedback {
        animation: slideIn 0.3s ease forwards;
    }

    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateY(-10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    .process-step {
        transition: all 0.3s ease;
    }

    .feature-card {
        opacity: 0;
        transform: translateY(20px);
    }

    .feature-card.animate-fade-in {
        opacity: 1;
        transform: translateY(0);
    }

    .demo-input:focus {
        transform: scale(1.02);
        box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
    }
`;

// Add styles to head
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);