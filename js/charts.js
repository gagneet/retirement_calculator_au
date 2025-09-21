/**
 * Enhanced Australian Retirement Calculator - Charts Module
 * Handles all chart rendering using Chart.js with professional visualizations
 */

import { Utils } from './utils.js';
import { CONFIG } from './config.js';

// Chart Manager Class
export class ChartManager {
    constructor() {
        this.charts = {};
        this.chartDefaults = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: 'white',
                    bodyColor: 'white',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1
                }
            },
            interaction: {
                mode: 'nearest',
                intersect: false
            }
        };
    }

    /**
     * Destroy existing chart if it exists
     */
    destroyChart(chartId) {
        if (this.charts[chartId]) {
            this.charts[chartId].destroy();
            delete this.charts[chartId];
        }
    }

    /**
     * Create histogram of Monte Carlo final balances
     */
    renderHistogram(canvasId, outcomes, title = 'Final Balance Distribution') {
        this.destroyChart(canvasId);
        
        const canvas = Utils.DOM.get(canvasId);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        // Calculate histogram bins
        const bins = Math.min(30, Math.max(10, Math.floor(outcomes.length / 100)));
        const minVal = Math.min(...outcomes);
        const maxVal = Math.max(...outcomes);
        const binSize = (maxVal - minVal) / bins;
        
        const histogram = new Array(bins).fill(0);
        const binLabels = [];
        
        // Count values in each bin
        outcomes.forEach(value => {
            const binIndex = Math.min(Math.floor((value - minVal) / binSize), bins - 1);
            histogram[binIndex]++;
        });
        
        // Create bin labels
        for (let i = 0; i < bins; i++) {
            const binStart = minVal + i * binSize;
            binLabels.push(Utils.Format.currency(binStart));
        }
        
        // Calculate percentile markers
        const p10 = Utils.Math.percentile(outcomes, 0.1);
        const p50 = Utils.Math.percentile(outcomes, 0.5);
        const p90 = Utils.Math.percentile(outcomes, 0.9);
        
        this.charts[canvasId] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: binLabels,
                datasets: [{
                    label: 'Frequency',
                    data: histogram,
                    backgroundColor: 'rgba(79, 70, 229, 0.6)',
                    borderColor: 'rgba(79, 70, 229, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                ...this.chartDefaults,
                plugins: {
                    ...this.chartDefaults.plugins,
                    title: {
                        display: true,
                        text: title,
                        font: { size: 16, weight: 'bold' }
                    },
                    tooltip: {
                        ...this.chartDefaults.plugins.tooltip,
                        callbacks: {
                            title: (context) => `Balance Range: ${context[0].label}`,
                            label: (context) => `Simulations: ${context.raw} (${((context.raw / outcomes.length) * 100).toFixed(1)}%)`
                        }
                    },
                    annotation: {
                        annotations: {
                            p10: {
                                type: 'line',
                                xMin: this.getPercentileBin(p10, minVal, binSize),
                                xMax: this.getPercentileBin(p10, minVal, binSize),
                                borderColor: 'red',
                                borderWidth: 2,
                                label: {
                                    content: '10th %ile',
                                    enabled: true,
                                    position: 'top'
                                }
                            },
                            p50: {
                                type: 'line',
                                xMin: this.getPercentileBin(p50, minVal, binSize),
                                xMax: this.getPercentileBin(p50, minVal, binSize),
                                borderColor: 'blue',
                                borderWidth: 2,
                                label: {
                                    content: 'Median',
                                    enabled: true,
                                    position: 'top'
                                }
                            },
                            p90: {
                                type: 'line',
                                xMin: this.getPercentileBin(p90, minVal, binSize),
                                xMax: this.getPercentileBin(p90, minVal, binSize),
                                borderColor: 'green',
                                borderWidth: 2,
                                label: {
                                    content: '90th %ile',
                                    enabled: true,
                                    position: 'top'
                                }
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Final Portfolio Balance (AUD)'
                        },
                        ticks: {
                            maxRotation: 45,
                            callback: function(value, index) {
                                // Show every nth label to avoid crowding
                                return index % Math.ceil(bins / 8) === 0 ? this.getLabelForValue(value) : '';
                            }
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Number of Simulations'
                        },
                        beginAtZero: true
                    }
                }
            }
        });
    }

    /**
     * Create fan chart showing portfolio balance trajectories over time
     */
    renderFanChart(canvasId, paths, deterministicPath = null, inputs = null) {
        this.destroyChart(canvasId);
        
        const canvas = Utils.DOM.get(canvasId);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        // Calculate percentiles for each year
        const maxYears = Math.max(...paths.map(p => p.length));
        const years = Array.from({length: maxYears}, (_, i) => (inputs?.retirementAge || 67) + i);
        
        const percentileData = {
            p5: [], p10: [], p25: [], p50: [], p75: [], p90: [], p95: []
        };
        
        for (let year = 0; year < maxYears; year++) {
            const balancesAtYear = paths
                .map(path => path[year])
                .filter(balance => balance !== undefined)
                .sort((a, b) => a - b);
            
            if (balancesAtYear.length > 0) {
                percentileData.p5.push(Utils.Math.percentile(balancesAtYear, 0.05));
                percentileData.p10.push(Utils.Math.percentile(balancesAtYear, 0.10));
                percentileData.p25.push(Utils.Math.percentile(balancesAtYear, 0.25));
                percentileData.p50.push(Utils.Math.percentile(balancesAtYear, 0.50));
                percentileData.p75.push(Utils.Math.percentile(balancesAtYear, 0.75));
                percentileData.p90.push(Utils.Math.percentile(balancesAtYear, 0.90));
                percentileData.p95.push(Utils.Math.percentile(balancesAtYear, 0.95));
            } else {
                // Fill with zeros if no data
                Object.keys(percentileData).forEach(key => {
                    percentileData[key].push(0);
                });
            }
        }
        
        const datasets = [
            // 5th-95th percentile band (lightest)
            {
                label: '5th-95th Percentile',
                data: percentileData.p95,
                borderColor: 'rgba(79, 70, 229, 0)',
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                fill: '+1',
                pointRadius: 0,
                tension: 0.1
            },
            {
                data: percentileData.p5,
                borderColor: 'rgba(79, 70, 229, 0)',
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                fill: false,
                pointRadius: 0,
                tension: 0.1
            },
            // 10th-90th percentile band
            {
                label: '10th-90th Percentile',
                data: percentileData.p90,
                borderColor: 'rgba(79, 70, 229, 0.3)',
                backgroundColor: 'rgba(79, 70, 229, 0.2)',
                fill: '+1',
                pointRadius: 0,
                tension: 0.1
            },
            {
                data: percentileData.p10,
                borderColor: 'rgba(79, 70, 229, 0.3)',
                backgroundColor: 'rgba(79, 70, 229, 0.2)',
                fill: false,
                pointRadius: 0,
                tension: 0.1
            },
            // 25th-75th percentile band (darkest)
            {
                label: '25th-75th Percentile',
                data: percentileData.p75,
                borderColor: 'rgba(245, 158, 11, 0.5)',
                backgroundColor: 'rgba(245, 158, 11, 0.3)',
                fill: '+1',
                pointRadius: 0,
                tension: 0.1
            },
            {
                data: percentileData.p25,
                borderColor: 'rgba(245, 158, 11, 0.5)',
                backgroundColor: 'rgba(245, 158, 11, 0.3)',
                fill: false,
                pointRadius: 0,
                tension: 0.1
            },
            // Median line
            {
                label: 'Median (Monte Carlo)',
                data: percentileData.p50,
                borderColor: 'rgb(59, 130, 246)',
                backgroundColor: 'rgb(59, 130, 246)',
                borderWidth: 2,
                fill: false,
                pointRadius: 0,
                tension: 0.1
            }
        ];
        
        // Add deterministic path if provided
        if (deterministicPath) {
            datasets.push({
                label: 'Deterministic Projection',
                data: deterministicPath,
                borderColor: 'rgb(0, 0, 0)',
                backgroundColor: 'rgb(0, 0, 0)',
                borderWidth: 3,
                borderDash: [5, 5],
                fill: false,
                pointRadius: 0,
                tension: 0.1
            });
        }
        
        this.charts[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: years,
                datasets: datasets
            },
            options: {
                ...this.chartDefaults,
                plugins: {
                    ...this.chartDefaults.plugins,
                    title: {
                        display: true,
                        text: 'Portfolio Balance Projections Over Time',
                        font: { size: 16, weight: 'bold' }
                    },
                    tooltip: {
                        ...this.chartDefaults.plugins.tooltip,
                        filter: function(tooltipItem) {
                            // Only show tooltip for visible datasets with labels
                            return tooltipItem.dataset.label && !tooltipItem.dataset.label.includes('data');
                        },
                        callbacks: {
                            label: (context) => {
                                if (context.dataset.label) {
                                    return `${context.dataset.label}: ${Utils.Format.currency(context.raw)}`;
                                }
                                return '';
                            }
                        }
                    },
                    legend: {
                        ...this.chartDefaults.plugins.legend,
                        filter: function(legendItem) {
                            // Only show legend items that have labels
                            return legendItem.text && !legendItem.text.includes('data');
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Age (years)'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Portfolio Balance (AUD)'
                        },
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return Utils.Format.currency(value);
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Create healthcare cost projection chart
     */
    renderHealthcareChart(canvasId, healthcareData, inputs) {
        this.destroyChart(canvasId);
        
        const canvas = Utils.DOM.get(canvasId);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        // Generate healthcare cost projections
        const startAge = inputs.retirementAge;
        const endAge = Math.max(inputs.yourLifespan, inputs.partnerLifespan);
        const ages = Utils.Array.range(startAge, endAge);
        
        const currentExpenses = inputs.currentHealthExpenses || 5000;
        const healthInflation = inputs.healthInflationRate / 100 || 0.065;
        
        const basicHealthCosts = [];
        const totalHealthCosts = [];
        const agedCareCosts = [];
        
        ages.forEach(age => {
            const yearsFromNow = age - inputs.yourCurrentAge;
            
            // Basic healthcare with inflation
            const basicCost = currentExpenses * Math.pow(1 + healthInflation, yearsFromNow);
            
            // Age-based multiplier
            let ageMultiplier = 1.0;
            if (age >= 85) ageMultiplier = 3.8;
            else if (age >= 80) ageMultiplier = 2.9;
            else if (age >= 75) ageMultiplier = 2.2;
            else if (age >= 70) ageMultiplier = 1.7;
            else if (age >= 65) ageMultiplier = 1.3;
            
            const adjustedCost = basicCost * ageMultiplier;
            
            basicHealthCosts.push(basicCost);
            totalHealthCosts.push(adjustedCost);
            
            // Aged care probability (simplified - show as annual cost)
            const agedCareProbability = Math.min(0.85, Math.max(0, (age - 65) * 0.035));
            const annualAgedCareCost = agedCareProbability * 50000; // Simplified annual cost
            agedCareCosts.push(annualAgedCareCost);
        });
        
        this.charts[canvasId] = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ages,
                datasets: [
                    {
                        label: 'Basic Healthcare (with inflation)',
                        data: basicHealthCosts,
                        borderColor: 'rgb(59, 130, 246)',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.1
                    },
                    {
                        label: 'Total Healthcare (age-adjusted)',
                        data: totalHealthCosts,
                        borderColor: 'rgb(245, 158, 11)',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.1
                    },
                    {
                        label: 'Expected Aged Care Costs',
                        data: agedCareCosts,
                        borderColor: 'rgb(239, 68, 68)',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.1
                    }
                ]
            },
            options: {
                ...this.chartDefaults,
                plugins: {
                    ...this.chartDefaults.plugins,
                    title: {
                        display: true,
                        text: 'Projected Healthcare Costs by Age',
                        font: { size: 16, weight: 'bold' }
                    },
                    tooltip: {
                        ...this.chartDefaults.plugins.tooltip,
                        callbacks: {
                            label: (context) => `${context.dataset.label}: ${Utils.Format.currency(context.raw)} annually`
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Age (years)'
                        }
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Annual Cost (AUD)'
                        },
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return Utils.Format.currency(value);
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Create asset allocation pie chart
     */
    renderAllocationChart(canvasId, allocation, title = 'Asset Allocation') {
        this.destroyChart(canvasId);
        
        const canvas = Utils.DOM.get(canvasId);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        const data = {
            labels: ['Australian Equities', 'Bonds/Fixed Income', 'Cash/Term Deposits'],
            datasets: [{
                data: [allocation.equity, allocation.bonds, allocation.cash],
                backgroundColor: [
                    'rgba(79, 70, 229, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(34, 197, 94, 0.8)'
                ],
                borderColor: [
                    'rgb(79, 70, 229)',
                    'rgb(245, 158, 11)',
                    'rgb(34, 197, 94)'
                ],
                borderWidth: 2
            }]
        };
        
        this.charts[canvasId] = new Chart(ctx, {
            type: 'doughnut',
            data: data,
            options: {
                ...this.chartDefaults,
                plugins: {
                    ...this.chartDefaults.plugins,
                    title: {
                        display: true,
                        text: title,
                        font: { size: 16, weight: 'bold' }
                    },
                    tooltip: {
                        ...this.chartDefaults.plugins.tooltip,
                        callbacks: {
                            label: (context) => {
                                const label = context.label || '';
                                const value = context.raw || 0;
                                return `${label}: ${value}%`;
                            }
                        }
                    }
                }
            }
        });
    }

    /**
     * Create risk/return scatter plot
     */
    renderRiskReturnChart(canvasId, scenarios) {
        this.destroyChart(canvasId);
        
        const canvas = Utils.DOM.get(canvasId);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        this.charts[canvasId] = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Portfolio Scenarios',
                    data: scenarios,
                    backgroundColor: 'rgba(79, 70, 229, 0.6)',
                    borderColor: 'rgb(79, 70, 229)',
                    borderWidth: 1
                }]
            },
            options: {
                ...this.chartDefaults,
                plugins: {
                    ...this.chartDefaults.plugins,
                    title: {
                        display: true,
                        text: 'Risk vs Return Analysis',
                        font: { size: 16, weight: 'bold' }
                    },
                    tooltip: {
                        ...this.chartDefaults.plugins.tooltip,
                        callbacks: {
                            label: (context) => {
                                return `Risk: ${context.raw.x.toFixed(1)}%, Return: ${context.raw.y.toFixed(1)}%`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: {
                            display: true,
                            text: 'Risk (Volatility %)'
                        },
                        beginAtZero: true
                    },
                    y: {
                        title: {
                            display: true,
                            text: 'Expected Return (%)'
                        }
                    }
                }
            }
        });
    }

    /**
     * Helper function to find percentile bin for histogram annotations
     */
    getPercentileBin(value, minVal, binSize) {
        return Math.floor((value - minVal) / binSize);
    }

    /**
     * Destroy all charts
     */
    destroyAllCharts() {
        Object.keys(this.charts).forEach(chartId => {
            this.destroyChart(chartId);
        });
    }

    /**
     * Resize all charts (useful for responsive design)
     */
    resizeAllCharts() {
        Object.values(this.charts).forEach(chart => {
            chart.resize();
        });
    }
}

// Export chart manager instance
export const chartManager = new ChartManager();

// Convenience functions for backwards compatibility
export const renderHistogram = (canvasId, outcomes, title) => {
    chartManager.renderHistogram(canvasId, outcomes, title);
};

export const renderFanChart = (canvasId, paths, deterministicPath, inputs) => {
    chartManager.renderFanChart(canvasId, paths, deterministicPath, inputs);
};

export const renderHealthcareChart = (canvasId, healthcareData, inputs) => {
    chartManager.renderHealthcareChart(canvasId, healthcareData, inputs);
};

export const renderAllocationChart = (canvasId, allocation, title) => {
    chartManager.renderAllocationChart(canvasId, allocation, title);
};

// Make chartManager available globally for debugging
window.chartManager = chartManager;