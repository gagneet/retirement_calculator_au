// js/charts.js - Chart Rendering Module for Enhanced Retirement Calculator

import { formatCurrency, formatPercent, percentile } from './utils.js';

export class ChartManager {
    constructor() {
        this.charts = {};
    }

    // Destroy all charts
    destroyAllCharts() {
        Object.keys(this.charts).forEach(chartId => {
            this.destroyChart(chartId);
        });
        this.charts = {};
    }

    // Destroy the existing chart if it exists
    destroyChart(chartId) {
        try {
            // First, try to get chart from Chart.js global registry
            const canvas = document.getElementById(chartId);
            if (canvas) {
                const existingChart = Chart.getChart(canvas);
                if (existingChart) {
                    existingChart.destroy();
                }
            }

            // Also destroy from our local registry
            if (this.charts[chartId]) {
                try {
                    this.charts[chartId].destroy();
                } catch (error) {
                    console.warn(`Error destroying local chart ${chartId}:`, error);
                }
                delete this.charts[chartId];
            }

            // Additional cleanup to ensure canvas is properly released
            if (canvas) {
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            }
        } catch (error) {
            console.warn(`Error in destroyChart for ${chartId}:`, error);
        }
    }

    // Portfolio balance fan chart with percentiles
    renderFanChart(results, inputs) {
        this.destroyChart('fanChart');

        const canvas = document.getElementById('fanChart');
        if (!canvas) return;

        // Double-check for any existing chart on this canvas
        const existingChart = Chart.getChart(canvas);
        if (existingChart) {
            console.warn('Found existing chart on fanChart canvas, destroying it');
            existingChart.destroy();
        }

        const ctx = canvas.getContext('2d');
        const years = results.yearlyData.map(d => d.age);

        if (typeof Chart === 'undefined') {
            console.error('Chart.js is not loaded');
            return;
        }

        this.charts.fanChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: years,
                datasets: [
                    {
                        label: 'Portfolio Balance',
                        data: results.balances,
                        borderColor: '#4f46e5',
                        backgroundColor: 'rgba(79, 70, 229, 0.1)',
                        fill: false,
                        tension: 0.1,
                        pointRadius: 0,
                        borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 2,
                plugins: {
                    title: {
                        display: true,
                        text: 'Portfolio Balance Projection Over Time'
                    },
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => `Age ${context.label}: ${formatCurrency(context.raw)}`
                        }
                    }
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Age (years)' },
                        grid: { display: false }
                    },
                    y: {
                        title: { display: true, text: 'Portfolio Balance (AUD)' },
                        beginAtZero: true,
                        max: results.balances.reduce((m, v) => v > m ? v : m, -Infinity) * 1.1,
                        ticks: {
                            callback: (value) => formatCurrency(value)
                        }
                    }
                }
            }
        });
    }

    // Enhanced fan chart for Monte Carlo results
    renderMonteCarloFanChart(inputs, paths) {
        this.destroyChart('fanChart');

        const canvas = document.getElementById('fanChart');
        if (!canvas || !paths || paths.length === 0) return;

        // Double-check for any existing chart on this canvas
        const existingChart = Chart.getChart(canvas);
        if (existingChart) {
            console.warn('Found existing chart on fanChart canvas, destroying it');
            existingChart.destroy();
        }

        // Ensure canvas is properly reset
        try {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        } catch (error) {
            console.warn('Error clearing canvas:', error);
        }

        // Set reasonable canvas size to prevent overflow
        canvas.style.maxHeight = '400px';
        canvas.style.maxWidth = '100%';

        const ctx = canvas.getContext('2d');
        const maxYears = Math.max(...paths.map(p => p.length));
        const years = Array.from({length: maxYears}, (_, i) => inputs.retirementAge + i);

        const median = [], p10 = [], p90 = [], p25 = [], p75 = [];

        for (let year = 0; year < maxYears; year++) {
            const balancesAtYear = paths.map(p => p[year] ?? 0);
            median.push(percentile(balancesAtYear, 0.5));
            p10.push(percentile(balancesAtYear, 0.1));
            p90.push(percentile(balancesAtYear, 0.9));
            p25.push(percentile(balancesAtYear, 0.25));
            p75.push(percentile(balancesAtYear, 0.75));
        }

        if (typeof Chart === 'undefined') {
            console.error('Chart.js is not loaded');
            return;
        }

        this.charts.fanChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: years,
                datasets: [
                    {
                        label: 'Median (50th percentile)',
                        data: median,
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        fill: false,
                        tension: 0.1,
                        pointRadius: 0,
                        borderWidth: 3
                    },
                    {
                        label: '90th Percentile',
                        data: p90,
                        borderColor: 'rgba(59, 130, 246, 0.3)',
                        backgroundColor: 'rgba(59, 130, 246, 0.2)',
                        fill: '+1',
                        pointRadius: 0,
                        borderWidth: 1
                    },
                    {
                        label: '10th Percentile',
                        data: p10,
                        borderColor: 'rgba(59, 130, 246, 0.3)',
                        backgroundColor: 'rgba(59, 130, 246, 0.2)',
                        fill: false,
                        pointRadius: 0,
                        borderWidth: 1
                    },
                    {
                        label: '75th Percentile',
                        data: p75,
                        borderColor: 'rgba(34, 197, 94, 0.4)',
                        backgroundColor: 'rgba(34, 197, 94, 0.3)',
                        fill: '+1',
                        pointRadius: 0,
                        borderWidth: 1
                    },
                    {
                        label: '25th Percentile',
                        data: p25,
                        borderColor: 'rgba(34, 197, 94, 0.4)',
                        backgroundColor: 'rgba(34, 197, 94, 0.3)',
                        fill: false,
                        pointRadius: 0,
                        borderWidth: 1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 2,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    title: {
                        display: true,
                        text: 'Monte Carlo Portfolio Balance Projections'
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(ctx.raw)}`
                        }
                    }
                },
                scales: {
                    x: { title: { display: true, text: 'Age (years)' } },
                    y: {
                        title: { display: true, text: 'Portfolio Balance (AUD)' },
                        beginAtZero: true,
                        suggestedMax: Math.max(...p90.filter(v => !isNaN(v) && isFinite(v))) * 1.1 || 100000,
                        ticks: {
                            callback: (value) => formatCurrency(value)
                        }
                    }
                }
            }
        });
    }

    // Final balance histogram with enhanced negative axis display
    renderHistogram(outcomes) {
        this.destroyChart('histChart');

        const canvas = document.getElementById('histChart');
        if (!canvas || !outcomes || outcomes.length === 0) return;

        // Set reasonable canvas size to prevent overflow
        canvas.style.maxHeight = '400px';
        canvas.style.maxWidth = '100%';

        const ctx = canvas.getContext('2d');
        const bins = 25;

        // Filter out invalid values and handle edge cases
        const validOutcomes = outcomes.filter(v => !isNaN(v) && isFinite(v));
        if (validOutcomes.length === 0) return;

        const actualMaxVal = Math.max(...validOutcomes);
        const actualMinVal = Math.min(...validOutcomes);

        // Always include zero in the range to show negative axis context
        // This gives users better understanding of where the distribution lies relative to zero
        const maxVal = Math.max(actualMaxVal, 0);
        const minVal = Math.min(actualMinVal, -100000); // Always show at least -$100k for context

        const range = Math.max(1, maxVal - minVal);
        const binSize = range / bins;
        const histogram = new Array(bins).fill(0);

        // Populate histogram bins with actual data
        validOutcomes.forEach(val => {
            const idx = Math.min(Math.floor((val - minVal) / binSize), bins - 1);
            if (idx >= 0) {  // Only count values that fall within our extended range
                histogram[idx]++;
            }
        });

        // Create labels for all bins including negative ones
        const labels = histogram.map((_, i) => formatCurrency(minVal + i * binSize));

        // Color code bars: red for negative balances, blue for positive balances, yellow for near-zero
        const backgroundColors = histogram.map((_, i) => {
            const binValue = minVal + i * binSize;
            if (binValue < -50000) return 'rgba(239, 68, 68, 0.7)';      // Red for significant losses
            if (binValue < 0) return 'rgba(251, 146, 60, 0.7)';         // Orange for minor losses
            if (binValue < 100000) return 'rgba(34, 197, 94, 0.6)';     // Green for modest gains
            return 'rgba(99, 102, 241, 0.6)';                           // Blue for strong gains
        });

        const borderColors = histogram.map((_, i) => {
            const binValue = minVal + i * binSize;
            if (binValue < -50000) return 'rgba(239, 68, 68, 1)';
            if (binValue < 0) return 'rgba(251, 146, 60, 1)';
            if (binValue < 100000) return 'rgba(34, 197, 94, 1)';
            return 'rgba(99, 102, 241, 1)';
        });

        this.charts.histChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [{
                    label: 'Number of Simulations',
                    data: histogram,
                    backgroundColor: backgroundColors,
                    borderColor: borderColors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 2,
                plugins: {
                    title: {
                        display: true,
                        text: 'Final Portfolio Balance Distribution (Including Negative Scenarios)'
                    },
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            afterLabel: function(context) {
                                const binValue = minVal + context.dataIndex * binSize;
                                if (binValue < 0) {
                                    return 'Portfolio depleted - may need adjustments';
                                } else if (binValue < 100000) {
                                    return 'Low balance - monitor closely';
                                } else {
                                    return 'Healthy retirement balance';
                                }
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Final Balance (AUD)' },
                        ticks: {
                            maxRotation: 45,
                            callback: function(value, index) {
                                // Show fewer labels for better readability
                                if (index % 3 === 0) return this.getLabelForValue(value);
                                return '';
                            }
                        }
                    },
                    y: {
                        title: { display: true, text: 'Number of Simulations' },
                        beginAtZero: true
                    }
                },
                // Add a vertical line at zero for reference
                plugins: [{
                    id: 'zeroLine',
                    afterDraw: (chart) => {
                        const ctx = chart.ctx;
                        const chartArea = chart.chartArea;

                        // Calculate x position for zero value
                        const zeroPosition = minVal + (0 - minVal);
                        const xPosition = chartArea.left + (zeroPosition / range) * (chartArea.right - chartArea.left);

                        // Only draw the line if zero is visible in our range
                        if (xPosition >= chartArea.left && xPosition <= chartArea.right) {
                            ctx.save();
                            ctx.beginPath();
                            ctx.moveTo(xPosition, chartArea.top);
                            ctx.lineTo(xPosition, chartArea.bottom);
                            ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
                            ctx.setLineDash([5, 5]);
                            ctx.lineWidth = 2;
                            ctx.stroke();
                            ctx.restore();

                            // Add zero label
                            ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                            ctx.font = '12px Arial';
                            ctx.fillText('$0', xPosition - 10, chartArea.top - 5);
                        }
                    }
                }]
            }
        });
    }

    // Asset allocation over time
    renderAllocationChart(allocationHistory, startAge) {
        this.destroyChart('allocationChart');

        const canvas = document.getElementById('allocationChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const ages = allocationHistory.map((_, i) => startAge + i);

        this.charts.allocationChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ages,
                datasets: [
                    {
                        label: 'Equity %',
                        data: allocationHistory.map(a => a.equity),
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        fill: false,
                        tension: 0.1,
                        pointRadius: 0
                    },
                    {
                        label: 'Bonds %',
                        data: allocationHistory.map(a => a.bonds),
                        borderColor: '#22c55e',
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                        fill: false,
                        tension: 0.1,
                        pointRadius: 0
                    },
                    {
                        label: 'Cash %',
                        data: allocationHistory.map(a => a.cash),
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        fill: false,
                        tension: 0.1,
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 2,
                plugins: {
                    title: {
                        display: true,
                        text: 'Dynamic Asset Allocation Over Time'
                    }
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Age (years)' }
                    },
                    y: {
                        title: { display: true, text: 'Allocation Percentage (%)' },
                        min: 0,
                        max: 100
                    }
                }
            }
        });
    }

    // Property vs Portfolio comparison
    renderPropertyChart(results, inputs) {
        this.destroyChart('propertyChart');

        const canvas = document.getElementById('propertyChart');
        if (!canvas || !inputs.hasInvestmentProperty) return;

        const ctx = canvas.getContext('2d');
        const years = results.yearlyData.map(d => d.year);
        const portfolioValues = results.balances;

        // Calculate property values over time
        const propertyValues = results.propertyHistory.map((prop, i) => {
            if (prop.saleResult) return 0; // Property sold
            return inputs.investmentPropertyValue * Math.pow(1 + inputs.propertyGrowthRate / 100, i + 1);
        });

        this.charts.propertyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: years.slice(0, Math.min(years.length, propertyValues.length)),
                datasets: [
                    {
                        label: 'Portfolio Value',
                        data: portfolioValues.slice(0, propertyValues.length),
                        borderColor: '#8b5cf6',
                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                        fill: false,
                        tension: 0.1,
                        pointRadius: 0
                    },
                    {
                        label: 'Property Value',
                        data: propertyValues,
                        borderColor: '#f59e0b',
                        backgroundColor: 'rgba(245, 158, 11, 0.1)',
                        fill: false,
                        tension: 0.1,
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 2,
                plugins: {
                    title: {
                        display: true,
                        text: 'Portfolio vs Property Value Growth'
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(ctx.raw)}`
                        }
                    }
                },
                scales: {
                    x: { title: { display: true, text: 'Year' } },
                    y: {
                        title: { display: true, text: 'Value (AUD)' },
                        beginAtZero: true,
                        suggestedMax: Math.max(
                            ...portfolioValues.filter(v => !isNaN(v) && isFinite(v)),
                            ...propertyValues.filter(v => !isNaN(v) && isFinite(v))
                        ) * 1.1 || 100000,
                        ticks: {
                            callback: (value) => formatCurrency(value)
                        }
                    }
                }
            }
        });
    }

    // Healthcare cost growth chart
    renderHealthcareChart(healthcareCostHistory, startYear) {
        this.destroyChart('healthcareChart');

        const canvas = document.getElementById('healthcareChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const years = healthcareCostHistory.map((_, i) => startYear + i);

        this.charts.healthcareChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: years,
                datasets: [
                    {
                        label: 'Healthcare Costs',
                        data: healthcareCostHistory,
                        borderColor: '#dc2626',
                        backgroundColor: 'rgba(220, 38, 38, 0.1)',
                        fill: true,
                        tension: 0.1,
                        pointRadius: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 2,
                plugins: {
                    title: {
                        display: true,
                        text: 'Healthcare Cost Growth Over Time'
                    },
                    legend: { display: false }
                },
                scales: {
                    x: { title: { display: true, text: 'Year' } },
                    y: {
                        title: { display: true, text: 'Annual Cost (AUD)' },
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => formatCurrency(value)
                        }
                    }
                }
            }
        });
    }

    // Risk analysis chart
    renderRiskAnalysisChart(riskData) {
        this.destroyChart('sequenceRiskChart');

        const canvas = document.getElementById('sequenceRiskChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        // Generate sequence of returns risk data
        const scenarios = [
            { name: 'Early Bear Market', impact: -25, probability: 15 },
            { name: 'Mid-Career Crash', impact: -15, probability: 20 },
            { name: 'Early Retirement Crash', impact: -35, probability: 10 },
            { name: 'Healthcare Shock', impact: -20, probability: 25 },
            { name: 'No Major Shocks', impact: 5, probability: 30 }
        ];

        this.charts.sequenceRiskChart = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Risk Scenarios',
                    data: scenarios.map(s => ({ x: s.probability, y: s.impact })),
                    backgroundColor: scenarios.map(s => s.impact < 0 ? 'rgba(239, 68, 68, 0.6)' : 'rgba(34, 197, 94, 0.6)'),
                    borderColor: scenarios.map(s => s.impact < 0 ? '#ef4444' : '#22c55e'),
                    pointRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 2,
                plugins: {
                    title: {
                        display: true,
                        text: 'Sequence of Returns Risk Analysis'
                    },
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const scenario = scenarios[context.dataIndex];
                                return `${scenario.name}: ${scenario.impact}% impact, ${scenario.probability}% probability`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Probability (%)' },
                        min: 0,
                        max: 35
                    },
                    y: {
                        title: { display: true, text: 'Portfolio Impact (%)' },
                        min: -40,
                        max: 10
                    }
                }
            }
        });
    }

    // Property cash flow chart
    renderPropertyCashFlowChart(propertyHistory) {
        this.destroyChart('propertyCashFlowChart');

        const canvas = document.getElementById('propertyCashFlowChart');
        if (!canvas || !propertyHistory.length) return;

        const ctx = canvas.getContext('2d');
        const years = propertyHistory.map((_, i) => new Date().getFullYear() + i);

        this.charts.propertyCashFlowChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: years,
                datasets: [
                    {
                        label: 'Rental Income',
                        data: propertyHistory.map(p => p.grossRental),
                        backgroundColor: 'rgba(34, 197, 94, 0.6)',
                        borderColor: '#22c55e',
                        borderWidth: 1
                    },
                    {
                        label: 'Expenses',
                        data: propertyHistory.map(p => -p.expenses),
                        backgroundColor: 'rgba(239, 68, 68, 0.6)',
                        borderColor: '#ef4444',
                        borderWidth: 1
                    },
                    {
                        label: 'Interest Cost',
                        data: propertyHistory.map(p => -p.interestCost),
                        backgroundColor: 'rgba(249, 115, 22, 0.6)',
                        borderColor: '#f97316',
                        borderWidth: 1
                    },
                    {
                        label: 'Net Cash Flow',
                        data: propertyHistory.map(p => p.netCashFlow),
                        type: 'line',
                        borderColor: '#8b5cf6',
                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                        fill: false,
                        tension: 0.1,
                        pointRadius: 3
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 2,
                plugins: {
                    title: {
                        display: true,
                        text: 'Investment Property Cash Flow Analysis'
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(Math.abs(ctx.raw))}`
                        }
                    }
                },
                scales: {
                    x: { title: { display: true, text: 'Year' } },
                    y: {
                        title: { display: true, text: 'Cash Flow (AUD)' },
                        ticks: {
                            callback: (value) => formatCurrency(value)
                        }
                    }
                }
            }
        });
    }

    // Render all charts for a complete analysis
    renderCompleteAnalysis(results, inputs, monteCarloResults = null) {
        // Main portfolio chart
        if (monteCarloResults) {
            this.renderMonteCarloFanChart(inputs, monteCarloResults.paths);
            this.renderHistogram(monteCarloResults.outcomes);
        } else {
            this.renderFanChart(results, inputs);
        }

        // Asset allocation chart
        if (results.allocationHistory && results.allocationHistory.length > 0) {
            this.renderAllocationChart(results.allocationHistory, inputs.yourCurrentAge);
        }

        // Healthcare chart
        if (results.healthcareCostHistory && results.healthcareCostHistory.length > 0) {
            this.renderHealthcareChart(results.healthcareCostHistory, new Date().getFullYear());
        }

        // Property charts
        if (inputs.hasInvestmentProperty) {
            this.renderPropertyChart(results, inputs);

            if (results.propertyHistory && results.propertyHistory.length > 0) {
                this.renderPropertyCashFlowChart(results.propertyHistory);
            }
        }

        // Risk analysis chart
        this.renderRiskAnalysisChart({});
    }

    // Utility method to get chart data for export
    getChartData(chartId) {
        if (this.charts[chartId]) {
            return this.charts[chartId].data;
        }
        return null;
    }

    // Export chart as an image
    exportChart(chartId, filename) {
        if (this.charts[chartId]) {
            const url = this.charts[chartId].toBase64Image();
            const a = document.createElement('a');
            a.href = url;
            a.download = filename || `${chartId}.png`;
            a.click();
        }
    }

    // Destroy all charts
    destroyAllCharts() {
        Object.keys(this.charts).forEach(chartId => {
            this.destroyChart(chartId);
        });
    }
}

export default ChartManager;