// js/comparison.js - Scenario Comparison Application

import { ENHANCED_CONFIG } from './config.js';
import RetirementSimulator from './simulator.js';
import ChartManager from './charts.js';
import {
    $,
    formatCurrency,
    formatPercent,
    showNotification,
    importUserData,
    saveToLocalStorage,
    loadFromLocalStorage
} from './utils.js';

class ComparisonApp {
    constructor() {
        this.scenarios = [];
        this.simulator = new RetirementSimulator();
        this.chartManager = new ChartManager();
        this.comparisonCharts = {};

        this.initializeApp();
    }

    initializeApp() {
        this.setupEventListeners();
        this.loadSavedScenarios();
    }

    setupEventListeners() {
        // Scenario management
        const btnCreateScenario = $('btnCreateScenario');
        const btnImportScenario = $('btnImportScenario');
        const btnCreate10YearsAgo = $('btnCreate10YearsAgo');
        const btnCreateFuture = $('btnCreateFuture');

        if (btnCreateScenario) {
            btnCreateScenario.addEventListener('click', () => this.createScenarioFromInput());
        }

        if (btnImportScenario) {
            btnImportScenario.addEventListener('click', () => this.importScenario());
        }

        if (btnCreate10YearsAgo) {
            btnCreate10YearsAgo.addEventListener('click', () => this.createQuickScenario('10yearsago'));
        }

        if (btnCreateFuture) {
            btnCreateFuture.addEventListener('click', () => this.createQuickScenario('future'));
        }

        // Help modal
        const btnHelp = $('btnHelp');
        const helpModal = $('helpModal');
        const closeHelp = $('closeHelp');

        if (btnHelp && helpModal) {
            btnHelp.addEventListener('click', () => helpModal.classList.remove('hidden'));
        }

        if (closeHelp && helpModal) {
            closeHelp.addEventListener('click', () => helpModal.classList.add('hidden'));
        }
    }

    async createScenarioFromInput() {
        const scenarioName = $('newScenarioName')?.value.trim();
        if (!scenarioName) {
            showNotification('Please enter a scenario name', 'warning');
            return;
        }

        // Check if we have current data from localStorage or need to get from main calculator
        const currentData = loadFromLocalStorage('retirement-calculator-inputs', null);
        if (!currentData) {
            showNotification('No data found. Please return to the main calculator and enter your details first.', 'warning');
            return;
        }

        const scenario = {
            id: Date.now(),
            name: scenarioName,
            createdAt: new Date().toISOString(),
            data: currentData,
            type: 'custom'
        };

        await this.addScenario(scenario);
        $('newScenarioName').value = '';
    }

    async importScenario() {
        try {
            const importedData = await importUserData();

            const scenario = {
                id: Date.now(),
                name: importedData.scenarioName || 'Imported Scenario',
                createdAt: new Date().toISOString(),
                data: importedData.userData,
                type: 'imported',
                originalExportDate: importedData.exportDate
            };

            await this.addScenario(scenario);
        } catch (error) {
            showNotification(error, 'error');
        }
    }

    async createQuickScenario(type) {
        const currentData = loadFromLocalStorage('retirement-calculator-inputs', null);
        if (!currentData) {
            showNotification('No data found. Please return to the main calculator and enter your details first.', 'warning');
            return;
        }

        let scenarioData = { ...currentData };
        let scenarioName = '';

        if (type === '10yearsago') {
            scenarioName = `10 Years Ago (${currentData.yourCurrentAge - 10} years old)`;

            // Adjust data for 10 years ago scenario
            scenarioData.yourCurrentAge = Math.max(18, currentData.yourCurrentAge - 10);
            scenarioData.partnerCurrentAge = currentData.partnerCurrentAge > 0 ?
                Math.max(18, currentData.partnerCurrentAge - 10) : 0;

            // Reduce salary assuming career progression
            scenarioData.yourSalary = Math.round(currentData.yourSalary * 0.7);
            scenarioData.partnerSalary = Math.round(currentData.partnerSalary * 0.7);

            // Significantly reduce super and savings
            scenarioData.yourCurrentSuper = Math.round(currentData.yourCurrentSuper * 0.3);
            scenarioData.partnerCurrentSuper = Math.round(currentData.partnerCurrentSuper * 0.3);
            scenarioData.currentSavings = Math.round(currentData.currentSavings * 0.2);
            scenarioData.currentStocks = Math.round(currentData.currentStocks * 0.1);

            // No home ownership or much smaller home
            scenarioData.homeValue = Math.round(currentData.homeValue * 0.4);
            scenarioData.mortgageBalance = Math.round(currentData.homeValue * 0.8);

            // No investment property
            scenarioData.hasInvestmentProperty = false;
            scenarioData.investmentPropertyValue = 0;
            scenarioData.investmentPropertyLoan = 0;

        } else if (type === 'future') {
            scenarioName = `Future Scenario (Peak Career)`;

            // Enhance data for future scenario
            scenarioData.yourSalary = Math.round(currentData.yourSalary * 1.5);
            scenarioData.partnerSalary = Math.round(currentData.partnerSalary * 1.5);

            // Higher super and savings
            scenarioData.yourCurrentSuper = Math.round(currentData.yourCurrentSuper * 1.8);
            scenarioData.partnerCurrentSuper = Math.round(currentData.partnerCurrentSuper * 1.8);
            scenarioData.currentSavings = Math.round(currentData.currentSavings * 2);
            scenarioData.currentStocks = Math.round(currentData.currentStocks * 3);

            // Paid off home, higher value
            scenarioData.homeValue = Math.round(currentData.homeValue * 1.4);
            scenarioData.mortgageBalance = Math.round(currentData.mortgageBalance * 0.3);

            // Possible investment property
            if (!currentData.hasInvestmentProperty) {
                scenarioData.hasInvestmentProperty = true;
                scenarioData.investmentPropertyValue = 600000;
                scenarioData.investmentPropertyLoan = 400000;
                scenarioData.weeklyRentalIncome = 500;
                scenarioData.annualPropertyExpenses = 8000;
            }
        }

        const scenario = {
            id: Date.now(),
            name: scenarioName,
            createdAt: new Date().toISOString(),
            data: scenarioData,
            type: 'quick',
            quickType: type
        };

        await this.addScenario(scenario);
    }

    async addScenario(scenario) {
        // Run simulation for this scenario
        this.showProgress('Calculating scenario results...');

        try {
            const result = this.simulator.simulateRetirement(scenario.data, false);
            scenario.results = result;

            this.scenarios.push(scenario);
            this.saveScenarios();
            this.renderScenariosList();
            this.updateComparison();

            showNotification(`Scenario "${scenario.name}" added successfully!`, 'success');
        } catch (error) {
            console.error('Error calculating scenario:', error);
            showNotification('Error calculating scenario results', 'error');
        } finally {
            this.hideProgress();
        }
    }

    removeScenario(scenarioId) {
        this.scenarios = this.scenarios.filter(s => s.id !== scenarioId);
        this.saveScenarios();
        this.renderScenariosList();
        this.updateComparison();
        showNotification('Scenario removed', 'info');
    }

    renderScenariosList() {
        const scenariosList = $('scenariosList');
        if (!scenariosList) return;

        if (this.scenarios.length === 0) {
            scenariosList.innerHTML = `
                <div class="text-gray-500 text-center py-8">
                    <svg class="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    <p>No scenarios loaded yet. Create or import scenarios to start comparing.</p>
                </div>
            `;
            return;
        }

        const scenariosHTML = this.scenarios.map(scenario => {
            const finalBalance = scenario.results?.yearlyData?.[scenario.results.yearlyData.length - 1]?.endBalance || 0;
            const successRate = scenario.results?.successRate || 0;
            const pensionEligible = scenario.results?.pensionEligible || false;

            const typeIcon = {
                'custom': '👤',
                'imported': '📂',
                'quick': scenario.quickType === '10yearsago' ? '⏮️' : '⚡'
            }[scenario.type] || '📊';

            return `
                <div class="scenario-card bg-gradient-to-r from-white to-gray-50 p-4 rounded-lg border border-gray-200">
                    <div class="flex justify-between items-start mb-3">
                        <div class="flex items-center space-x-2">
                            <span class="text-xl">${typeIcon}</span>
                            <div>
                                <h3 class="font-semibold text-gray-900">${scenario.name}</h3>
                                <p class="text-xs text-gray-500">Created ${new Date(scenario.createdAt).toLocaleDateString()}</p>
                            </div>
                        </div>
                        <button onclick="comparisonApp.removeScenario(${scenario.id})" class="text-red-500 hover:text-red-700">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                        </button>
                    </div>

                    <div class="grid grid-cols-3 gap-4 text-sm">
                        <div>
                            <p class="text-gray-600">Age</p>
                            <p class="font-medium">${scenario.data.yourCurrentAge}</p>
                        </div>
                        <div>
                            <p class="text-gray-600">Salary</p>
                            <p class="font-medium">${formatCurrency(scenario.data.yourSalary)}</p>
                        </div>
                        <div>
                            <p class="text-gray-600">Super</p>
                            <p class="font-medium">${formatCurrency(scenario.data.yourCurrentSuper)}</p>
                        </div>
                    </div>

                    <div class="mt-3 pt-3 border-t border-gray-200">
                        <div class="grid grid-cols-3 gap-4 text-sm">
                            <div>
                                <p class="text-gray-600">Final Balance</p>
                                <p class="font-medium text-green-600">${formatCurrency(finalBalance)}</p>
                            </div>
                            <div>
                                <p class="text-gray-600">Success Rate</p>
                                <p class="font-medium ${successRate >= 80 ? 'text-green-600' : successRate >= 60 ? 'text-yellow-600' : 'text-red-600'}">${formatPercent(successRate)}</p>
                            </div>
                            <div>
                                <p class="text-gray-600">Age Pension</p>
                                <p class="font-medium ${pensionEligible ? 'text-green-600' : 'text-orange-600'}">${pensionEligible ? 'Eligible' : 'Not Eligible'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        scenariosList.innerHTML = scenariosHTML;
    }

    updateComparison() {
        const comparisonResults = $('comparisonResults');
        if (this.scenarios.length < 2) {
            comparisonResults?.classList.add('hidden');
            return;
        }

        comparisonResults?.classList.remove('hidden');
        this.renderMetricsComparison();
        this.renderComparisonCharts();
    }

    renderMetricsComparison() {
        const metricsComparison = $('metricsComparison');
        if (!metricsComparison) return;

        const metrics = [
            { key: 'finalBalance', label: 'Final Balance', format: formatCurrency },
            { key: 'successRate', label: 'Success Rate', format: formatPercent },
            { key: 'retirementIncome', label: 'Retirement Income', format: formatCurrency },
            { key: 'pensionAmount', label: 'Age Pension (Annual)', format: formatCurrency }
        ];

        const metricsHTML = metrics.map(metric => {
            const values = this.scenarios.map(scenario => {
                const result = scenario.results;
                let value = 0;

                switch (metric.key) {
                    case 'finalBalance':
                        value = result?.yearlyData?.[result.yearlyData.length - 1]?.endBalance || 0;
                        break;
                    case 'successRate':
                        value = result?.successRate || 0;
                        break;
                    case 'retirementIncome':
                        const retirementYear = result?.yearlyData?.find(d => d.age === scenario.data.retirementAge);
                        value = retirementYear?.totalIncome || 0;
                        break;
                    case 'pensionAmount':
                        const pensionData = result?.yearlyData?.find(d => d.age >= 67);
                        value = (pensionData?.pensionIncome || 0) * 12;
                        break;
                }

                return { scenario: scenario.name, value, scenarioObj: scenario };
            });

            const maxValue = Math.max(...values.map(v => v.value));
            const minValue = Math.min(...values.map(v => v.value));

            const scenarioCards = values.map(item => {
                let comparison = '';
                if (values.length > 1) {
                    if (item.value === maxValue && item.value !== minValue) {
                        comparison = 'better';
                    } else if (item.value === minValue && item.value !== maxValue) {
                        comparison = 'worse';
                    }
                }

                return `
                    <div class="metric-comparison ${comparison} p-3 rounded">
                        <div class="text-sm font-medium text-gray-900">${item.scenario}</div>
                        <div class="text-lg font-bold ${comparison === 'better' ? 'text-green-700' : comparison === 'worse' ? 'text-red-700' : 'text-gray-900'}">${metric.format(item.value)}</div>
                    </div>
                `;
            }).join('');

            return `
                <div class="bg-white p-4 rounded-lg border border-gray-200">
                    <h3 class="text-lg font-semibold text-gray-900 mb-4">${metric.label}</h3>
                    <div class="space-y-2">
                        ${scenarioCards}
                    </div>
                </div>
            `;
        }).join('');

        metricsComparison.innerHTML = metricsHTML;
    }

    renderComparisonCharts() {
        this.renderBalanceComparisonChart();
        this.renderSuccessRateChart();
        this.renderPensionComparisonChart();
    }

    renderBalanceComparisonChart() {
        const ctx = $('balanceComparisonChart');
        if (!ctx) return;

        // Destroy existing chart
        if (this.comparisonCharts.balance) {
            this.comparisonCharts.balance.destroy();
        }

        const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

        const datasets = this.scenarios.map((scenario, index) => {
            const data = scenario.results.yearlyData.map(d => ({
                x: d.age,
                y: d.endBalance
            }));

            return {
                label: scenario.name,
                data: data,
                borderColor: colors[index % colors.length],
                backgroundColor: colors[index % colors.length] + '20',
                fill: false,
                tension: 0.1
            };
        });

        this.comparisonCharts.balance = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: datasets
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Balance Projection Comparison'
                    },
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom',
                        title: {
                            display: true,
                            text: 'Age'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Balance ($)'
                        },
                        ticks: {
                            callback: function(value) {
                                return '$' + (value / 1000000).toFixed(1) + 'M';
                            }
                        }
                    }
                }
            }
        });
    }

    renderSuccessRateChart() {
        const ctx = $('successRateChart');
        if (!ctx) return;

        // Destroy existing chart
        if (this.comparisonCharts.successRate) {
            this.comparisonCharts.successRate.destroy();
        }

        const data = {
            labels: this.scenarios.map(s => s.name),
            datasets: [{
                label: 'Success Rate',
                data: this.scenarios.map(s => s.results.successRate || 0),
                backgroundColor: this.scenarios.map((s, i) => {
                    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];
                    return colors[i % colors.length] + '80';
                }),
                borderColor: this.scenarios.map((s, i) => {
                    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];
                    return colors[i % colors.length];
                }),
                borderWidth: 2
            }]
        };

        this.comparisonCharts.successRate = new Chart(ctx, {
            type: 'bar',
            data: data,
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Retirement Success Rate Comparison'
                    },
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Success Rate (%)'
                        }
                    }
                }
            }
        });
    }

    renderPensionComparisonChart() {
        const ctx = $('pensionComparisonChart');
        if (!ctx) return;

        // Destroy existing chart
        if (this.comparisonCharts.pension) {
            this.comparisonCharts.pension.destroy();
        }

        // Create age pension data for each scenario
        const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];
        const datasets = this.scenarios.map((scenario, index) => {
            const pensionData = scenario.results.yearlyData.map(d => ({
                x: d.age,
                y: (d.pensionIncome || 0) * 12 // Convert to annual
            }));

            return {
                label: scenario.name,
                data: pensionData,
                borderColor: colors[index % colors.length],
                backgroundColor: colors[index % colors.length] + '20',
                fill: false,
                tension: 0.1
            };
        });

        this.comparisonCharts.pension = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: datasets
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Age Pension Income Comparison'
                    },
                    legend: {
                        display: true,
                        position: 'top'
                    }
                },
                scales: {
                    x: {
                        type: 'linear',
                        position: 'bottom',
                        title: {
                            display: true,
                            text: 'Age'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Annual Age Pension ($)'
                        },
                        ticks: {
                            callback: function(value) {
                                return formatCurrency(value);
                            }
                        }
                    }
                }
            }
        });
    }

    saveScenarios() {
        saveToLocalStorage('retirement-comparison-scenarios', this.scenarios);
    }

    loadSavedScenarios() {
        const saved = loadFromLocalStorage('retirement-comparison-scenarios', []);
        this.scenarios = saved;
        this.renderScenariosList();
        this.updateComparison();
    }

    showProgress(message) {
        const progressContainer = $('progressContainer');
        const progressText = $('progressText');

        if (progressContainer) {
            progressContainer.classList.remove('hidden');
        }
        if (progressText) {
            progressText.textContent = message;
        }
    }

    hideProgress() {
        const progressContainer = $('progressContainer');
        if (progressContainer) {
            progressContainer.classList.add('hidden');
        }
    }
}

// Make the app available globally for event handlers
window.comparisonApp = null;

export default ComparisonApp;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.comparisonApp = new ComparisonApp();
});