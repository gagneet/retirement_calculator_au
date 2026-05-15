// js/charts.js - Chart Rendering Module for Enhanced Retirement Calculator

import { formatCurrency, formatPercent, percentile } from './utils.js';

const debugLog = process.env.NODE_ENV !== 'production' ? console.log.bind(console) : () => {};

export class ChartManager {
    constructor() {
        this.charts = {};
        // Optional callback invoked when a chart data point is clicked.
        // Signature: (chartId, datasetLabel, label, value, extraContext) => void
        this.onDataPointClick = null;
    }

    /**
     * Build a Chart.js onClick handler that calls this.onDataPointClick if set.
     * @param {string} chartId - Identifier for the chart
     * @param {Function} [extraContextFn] - Optional fn(index, datasetIndex) → object with extra context
     */
    _buildClickHandler(chartId, extraContextFn) {
        return (event, elements) => {
            if (!this.onDataPointClick || elements.length === 0) return;
            const el = elements[0];
            const chart = el.element.$context.chart;
            const datasetIndex = el.datasetIndex;
            const index = el.index;
            const dataset = chart.data.datasets[datasetIndex];
            const label = chart.data.labels?.[index] ?? index;
            const value = dataset.data[index];
            const extra = extraContextFn ? extraContextFn(index, datasetIndex, chart) : {};
            this.onDataPointClick(chartId, dataset.label ?? '', label, value, extra);
        };
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
                const existingChart = typeof Chart !== 'undefined' ? Chart.getChart(canvas) : null;
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
        if (typeof Chart !== 'undefined') {
            const existingChart = Chart.getChart(canvas);
            if (existingChart) {
                console.warn('Found existing chart on fanChart canvas, destroying it');
                existingChart.destroy();
            }
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
                        pointRadius: 3,
                        pointHoverRadius: 6,
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
                onClick: this._buildClickHandler('fanChart', (index, _di, chart) => ({
                    age: chart.data.labels[index],
                    description: 'Portfolio balance at this age in your projected retirement timeline.'
                })),
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

    // Enhanced fan chart for Monte Carlo results with named scenario lines
    renderMonteCarloFanChart(inputs, paths, scenarios) {
        this.destroyChart('fanChart');

        const canvas = document.getElementById('fanChart');
        if (!canvas || !paths || paths.length === 0) return;

        // Double-check for any existing chart on this canvas
        if (typeof Chart !== 'undefined') {
            const existingChart = Chart.getChart(canvas);
            if (existingChart) {
                console.warn('Found existing chart on fanChart canvas, destroying it');
                existingChart.destroy();
            }
        }

        // Ensure canvas is properly reset
        try {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        } catch (error) {
            console.warn('Error clearing canvas:', error);
        }

        // Set reasonable canvas size to prevent overflow
        canvas.style.maxHeight = '450px';
        canvas.style.maxWidth = '100%';

        const ctx = canvas.getContext('2d');
        const maxYears = Math.max(...paths.map(p => p.length));
        const years = Array.from({length: maxYears}, (_, i) => inputs.retirementAge + i);

        // Calculate percentile bands from all paths (for confidence shading)
        const medianData = [], p10 = [], p90 = [], p25 = [], p75 = [];
        for (let year = 0; year < maxYears; year++) {
            const balancesAtYear = paths.map(p => p[year] ?? 0);
            medianData.push(percentile(balancesAtYear, 0.5));
            p10.push(percentile(balancesAtYear, 0.1));
            p90.push(percentile(balancesAtYear, 0.9));
            p25.push(percentile(balancesAtYear, 0.25));
            p75.push(percentile(balancesAtYear, 0.75));
        }

        if (typeof Chart === 'undefined') {
            console.error('Chart.js is not loaded');
            return;
        }

        // Named scenario lines config - ordered bottom to top visually
        const scenarioLineConfigs = [
            { key: 'worstCase',   label: 'Worst Case (1 in 100)',     color: '#dc2626', width: 2, dash: [6, 3] },
            { key: 'pessimistic', label: 'Pessimistic (1 in 10)',      color: '#f97316', width: 1.5, dash: [4, 2] },
            { key: 'median',      label: 'Median — Most Likely',       color: '#2563eb', width: 3, dash: [] },
            { key: 'optimistic',  label: 'Optimistic (Top 10%)',       color: '#16a34a', width: 1.5, dash: [4, 2] },
            { key: 'bestCase',    label: 'Best Case (Top 1%)',         color: '#059669', width: 2, dash: [6, 3] },
        ];

        // Tooltip descriptions for each scenario
        const scenarioDescriptions = {
            'Worst Case (1 in 100)':    'Only 1% of scenarios end this badly. Assumes multiple crises: market crashes, high inflation, and large unexpected costs occurring together.',
            'Pessimistic (1 in 10)':    '10% of scenarios are at or below this level. Similar to retiring just before a major market downturn like the 2008 GFC.',
            'Median — Most Likely':     'The midpoint — half of all simulated outcomes are above this, half below. This is your most realistic expected retirement balance.',
            'Optimistic (Top 10%)':     '90% of scenarios finish below this level. Markets performed well and expenses stayed manageable.',
            'Best Case (Top 1%)':       'Only 1% of scenarios reach this level. Everything went right: strong markets, low inflation, and no major unexpected costs.',
        };

        // Build datasets: confidence bands first (drawn behind scenario lines)
        const datasets = [
            {
                label: '80% Confidence Band (Upper)',
                data: p90,
                borderColor: 'rgba(59, 130, 246, 0.15)',
                backgroundColor: 'rgba(59, 130, 246, 0.08)',
                fill: '+1',
                pointRadius: 0,
                borderWidth: 0.5,
                order: 20,
                tension: 0.1
            },
            {
                label: '80% Confidence Band (Lower)',
                data: p10,
                borderColor: 'rgba(59, 130, 246, 0.15)',
                backgroundColor: 'rgba(59, 130, 246, 0.08)',
                fill: false,
                pointRadius: 0,
                borderWidth: 0.5,
                order: 20,
                tension: 0.1
            },
            {
                label: '50% Confidence Band (Upper)',
                data: p75,
                borderColor: 'rgba(34, 197, 94, 0.2)',
                backgroundColor: 'rgba(34, 197, 94, 0.12)',
                fill: '+1',
                pointRadius: 0,
                borderWidth: 0.5,
                order: 19,
                tension: 0.1
            },
            {
                label: '50% Confidence Band (Lower)',
                data: p25,
                borderColor: 'rgba(34, 197, 94, 0.2)',
                backgroundColor: 'rgba(34, 197, 94, 0.12)',
                fill: false,
                pointRadius: 0,
                borderWidth: 0.5,
                order: 19,
                tension: 0.1
            }
        ];

        // Add named scenario lines if available
        if (scenarios) {
            for (const sc of scenarioLineConfigs) {
                const scData = scenarios[sc.key];
                if (!scData?.path) continue;
                // Clamp to 0 — portfolio cannot go negative in reality
                const data = Array.from({length: maxYears}, (_, i) => Math.max(0, scData.path[i] ?? 0));
                datasets.push({
                    label: sc.label,
                    data,
                    borderColor: sc.color,
                    backgroundColor: 'transparent',
                    fill: false,
                    tension: 0.1,
                    pointRadius: 0,
                    borderWidth: sc.width,
                    borderDash: sc.dash,
                    order: 1
                });
            }
        } else {
            // Fallback: just show median line if no named scenarios available
            datasets.push({
                label: 'Median (50th percentile)',
                data: medianData,
                borderColor: '#2563eb',
                backgroundColor: 'transparent',
                fill: false,
                tension: 0.1,
                pointRadius: 0,
                borderWidth: 3,
                order: 1
            });
        }

        const maxP90 = Math.max(...p90.filter(v => !isNaN(v) && isFinite(v)));

        this.charts.fanChart = new Chart(ctx, {
            type: 'line',
            data: { labels: years, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 2,
                interaction: { mode: 'index', intersect: false },
                plugins: {
                    title: {
                        display: true,
                        text: 'Monte Carlo Portfolio Balance — 5 Key Scenarios',
                        font: { size: 14, weight: 'bold' }
                    },
                    legend: {
                        display: true,
                        labels: {
                            filter: (item) => !item.text.includes('Confidence Band'),
                            usePointStyle: true,
                            pointStyle: 'line',
                            font: { size: 11 }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            title: (items) => `Age ${items[0].label}`,
                            label: (ctx) => {
                                if (ctx.dataset.label.includes('Confidence Band')) return null;
                                const val = ctx.raw;
                                const valStr = val <= 0 ? 'Funds Depleted ($0)' : formatCurrency(val);
                                return `${ctx.dataset.label}: ${valStr}`;
                            },
                            afterBody: (items) => {
                                const named = items.find(i => !i.dataset.label.includes('Confidence Band'));
                                if (!named) return [];
                                const desc = scenarioDescriptions[named.dataset.label];
                                return desc ? ['', desc] : [];
                            }
                        }
                    }
                },
                onClick: this._buildClickHandler('fanChart', (index, datasetIndex, chart) => ({
                    age: chart.data.labels[index],
                    percentileLabel: chart.data.datasets[datasetIndex]?.label,
                    description: 'Monte Carlo projection: range of possible portfolio balances at this age based on thousands of simulated market scenarios.'
                })),
                scales: {
                    x: { title: { display: true, text: 'Your Age' } },
                    y: {
                        title: { display: true, text: 'Portfolio Balance (AUD)' },
                        beginAtZero: true,
                        suggestedMax: maxP90 * 1.1 || 100000,
                        ticks: { callback: (value) => formatCurrency(value) }
                    }
                }
            },
            plugins: [{
                id: 'zeroReferenceLine',
                afterDraw: (chart) => {
                    const ctx = chart.ctx;
                    const yScale = chart.scales.y;
                    const xLeft = chart.chartArea.left;
                    const xRight = chart.chartArea.right;
                    const yZero = yScale.getPixelForValue(0);

                    if (yZero >= chart.chartArea.top && yZero <= chart.chartArea.bottom) {
                        ctx.save();
                        ctx.beginPath();
                        ctx.moveTo(xLeft, yZero);
                        ctx.lineTo(xRight, yZero);
                        ctx.strokeStyle = 'rgba(220, 38, 38, 0.6)';
                        ctx.setLineDash([8, 4]);
                        ctx.lineWidth = 1.5;
                        ctx.stroke();
                        ctx.restore();

                        ctx.save();
                        ctx.fillStyle = 'rgba(220, 38, 38, 0.8)';
                        ctx.font = 'bold 11px Arial';
                        ctx.fillText('$0 — Funds Depleted', xLeft + 4, yZero - 4);
                        ctx.restore();
                    }
                }
            }]
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
                onClick: this._buildClickHandler('allocationChart', (index, datasetIndex, chart) => ({
                    age: chart.data.labels[index],
                    assetClass: chart.data.datasets[datasetIndex]?.label,
                    description: 'Your asset allocation shifts automatically over time — higher equity when young for growth, more bonds/cash near and in retirement for stability.'
                })),
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

        // Build a unified full-lifespan timeline combining pre-retirement and retirement data.
        // Pre-retirement: reconstruct from simulation start year using allocationHistory length.
        // Retirement: use yearlyData for both year labels and portfolio (balance) values.
        //
        // inputs.propertyGrowthRate is already a decimal fraction (e.g. 0.022).
        // inputs.investmentPropertyValue is the purchase/current value in AUD.

        const currentYear = new Date().getFullYear();
        const startAge = inputs.yourCurrentAge || 49;
        const retirementAge = inputs.retirementAge || 67;
        const yearsToRetirement = Math.max(0, retirementAge - startAge);
        const lifespan = inputs.yourLifespan > 0 ? inputs.yourLifespan : 90;
        const totalYears = lifespan - startAge;

        // Determine if/when property was sold (from propertyHistory saleResult)
        let saleYear = null;
        if (results.propertyHistory) {
            const saleIdx = results.propertyHistory.findIndex(p => p.saleResult);
            if (saleIdx !== -1) saleYear = saleIdx + 1; // 1-indexed simulation year
        }

        // Build arrays spanning the full simulation (year 1 = age startAge+1 through totalYears)
        const labels = [];
        const propertyValues = [];
        const portfolioValues = [];

        // Retirement portfolio indexed by simulation year offset
        const retirementBalanceByYear = {};
        if (results.yearlyData) {
            results.yearlyData.forEach(d => {
                const simYear = d.year - currentYear;
                retirementBalanceByYear[simYear] = d.endBalance;
            });
        }
        // Accumulation portfolio balances indexed to pre-retirement years
        // simulateRetirement doesn't return yearly accumulation balances, so we
        // interpolate from the opening (year 0) to the retirement balance.
        const retirementOpeningBalance = results.yearlyData && results.yearlyData.length > 0
            ? results.yearlyData[0].startBalance
            : (results.totalFinancialAssets || 0);
        const openingBalance = (inputs.yourCurrentSuper || 0) + (inputs.partnerCurrentSuper || 0)
            + (inputs.currentSavings || 0) + (inputs.currentStocks || 0);

        for (let yr = 1; yr <= totalYears; yr++) {
            const calYear = currentYear + yr;
            labels.push(calYear);

            // Property value: grows at propertyGrowthRate until sold
            let propVal;
            if (saleYear !== null && yr >= saleYear) {
                propVal = 0;
            } else {
                propVal = (inputs.investmentPropertyValue || 0) * Math.pow(1 + inputs.propertyGrowthRate, yr);
            }
            propertyValues.push(propVal);

            // Portfolio value: linear interpolation pre-retirement, then actual yearlyData post-retirement
            if (yr <= yearsToRetirement) {
                // Interpolate accumulation phase linearly from current to retirement opening balance
                const frac = yearsToRetirement > 0 ? yr / yearsToRetirement : 1;
                portfolioValues.push(openingBalance + (retirementOpeningBalance - openingBalance) * frac);
            } else {
                const retireOffset = yr - yearsToRetirement;
                const retBalance = retirementBalanceByYear[yr] ??
                    (results.balances && results.balances[retireOffset - 1]) ?? 0;
                portfolioValues.push(Math.max(0, retBalance));
            }
        }

        const allValues = [...portfolioValues, ...propertyValues].filter(v => isFinite(v) && !isNaN(v) && v > 0);

        this.charts.propertyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Portfolio Value',
                        data: portfolioValues,
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
                            label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y)}`
                        }
                    }
                },
                onClick: this._buildClickHandler('propertyChart', (index, datasetIndex, chart) => ({
                    year: chart.data.labels[index],
                    assetType: chart.data.datasets[datasetIndex]?.label,
                    description: 'Click a year to see the projected value of your portfolio vs your investment property at that point in time.'
                })),
                scales: {
                    x: { title: { display: true, text: 'Year' } },
                    y: {
                        title: { display: true, text: 'Value (AUD)' },
                        beginAtZero: true,
                        suggestedMax: (allValues.length > 0 ? Math.max(...allValues) : 100000) * 1.1,
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
                onClick: this._buildClickHandler('healthcareChart', (index, _di, chart) => ({
                    year: chart.data.labels[index],
                    description: 'Healthcare costs typically grow faster than general inflation as you age. This projection accounts for increasing medical needs over time.'
                })),
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
                onClick: (event, elements) => {
                    if (!this.onDataPointClick || elements.length === 0) return;
                    const el = elements[0];
                    const scenario = scenarios[el.index];
                    this.onDataPointClick('sequenceRiskChart', 'Risk Scenarios', scenario.name, scenario.impact, {
                        probability: scenario.probability,
                        description: `This scenario has a ${scenario.probability}% probability of occurring and could reduce your portfolio by ${Math.abs(scenario.impact)}%. ${scenario.impact < 0 ? 'Diversification, an emergency fund, and a cash buffer in early retirement can help mitigate this risk.' : 'Positive scenario with no major market shocks.'}`
                    });
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
                onClick: this._buildClickHandler('propertyCashFlowChart', (index, datasetIndex, chart) => ({
                    year: chart.data.labels[index],
                    cashFlowType: chart.data.datasets[datasetIndex]?.label,
                    description: 'Click a year to see the breakdown of rental income, expenses, interest costs, and net cash flow for your investment property.'
                })),
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

    /**
     * Render a bar chart comparing annual living costs across selected countries.
     * @param {Array<{name: string, annualCostAUD: number, pensionAUD: number, hasSocialSecurityAgreement: boolean}>} countryData
     */
    renderOverseasCostComparison(countryData) {
        this.destroyChart('overseasCostChart');
        const canvas = document.getElementById('overseasCostChart');
        if (!canvas || !countryData || countryData.length === 0) return;

        const ctx = canvas.getContext('2d');
        const labels = countryData.map(c => c.name);
        const costData = countryData.map(c => c.annualCostAUD);
        const pensionData = countryData.map(c => c.pensionAUD);

        this.charts['overseasCostChart'] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Est. Annual Cost (AUD)',
                        data: costData,
                        backgroundColor: 'rgba(99, 102, 241, 0.7)',
                        borderColor: 'rgba(99, 102, 241, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Est. Age Pension Overseas (AUD)',
                        data: pensionData,
                        backgroundColor: 'rgba(52, 211, 153, 0.7)',
                        borderColor: 'rgba(52, 211, 153, 1)',
                        borderWidth: 1
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
                        text: 'Annual Cost of Living vs Age Pension Overseas by Country'
                    },
                    legend: { position: 'top' },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(ctx.raw)}/year`
                        }
                    }
                },
                onClick: this._buildClickHandler('overseasCostChart', (index, datasetIndex, chart) => {
                    const country = countryData[index];
                    return {
                        country: chart.data.labels[index],
                        hasSocialSecurityAgreement: country?.hasSocialSecurityAgreement,
                        description: [
                            `${chart.data.labels[index]}: Annual living cost ${formatCurrency(country?.annualCostAUD ?? 0)} vs portable Age Pension ${formatCurrency(country?.pensionAUD ?? 0)}/year.`,
                            country?.hasSocialSecurityAgreement ? '✅ Australia has a Social Security Agreement with this country.' : ''
                        ].filter(Boolean).join(' ')
                    };
                }),
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => formatCurrency(value)
                        },
                        title: { display: true, text: 'Annual Amount (AUD)' }
                    },
                    x: {
                        title: { display: true, text: 'Country' }
                    }
                }
            }
        });
    }

    /**
     * Render a bar chart comparing pension portability across countries.
     * @param {Array<{name: string, inAustralia: number, overseas: number, hasSocialSecurityAgreement: boolean, awlrPct: number}>} portabilityData
     */
    renderOverseasPensionPortability(portabilityData) {
        this.destroyChart('overseasPensionChart');
        const canvas = document.getElementById('overseasPensionChart');
        if (!canvas || !portabilityData || portabilityData.length === 0) return;

        const ctx = canvas.getContext('2d');
        const labels = portabilityData.map(c => c.name);
        const inAustralia = portabilityData.map(c => c.inAustralia);
        const overseas = portabilityData.map(c => c.overseas);

        const backgroundColors = portabilityData.map(c =>
            c.hasSocialSecurityAgreement ? 'rgba(52, 211, 153, 0.7)' : 'rgba(251, 191, 36, 0.7)'
        );
        const borderColors = portabilityData.map(c =>
            c.hasSocialSecurityAgreement ? 'rgba(52, 211, 153, 1)' : 'rgba(251, 191, 36, 1)'
        );

        this.charts['overseasPensionChart'] = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Full Rate (in Australia)',
                        data: inAustralia,
                        backgroundColor: 'rgba(99, 102, 241, 0.4)',
                        borderColor: 'rgba(99, 102, 241, 1)',
                        borderWidth: 1
                    },
                    {
                        label: 'Portable Rate (overseas after 26 wks)',
                        data: overseas,
                        backgroundColor: backgroundColors,
                        borderColor: borderColors,
                        borderWidth: 1
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
                        text: 'Age Pension: In-Australia vs Overseas Portable Rate',
                        font: { size: 13 }
                    },
                    legend: { position: 'top' },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(ctx.raw)}/year`,
                            afterBody: (items) => {
                                const idx = items[0].dataIndex;
                                const d = portabilityData[idx];
                                return d.hasSocialSecurityAgreement
                                    ? ['✅ Social Security Agreement country']
                                    : [`AWLR Portability: ${d.awlrPct}%`];
                            }
                        }
                    }
                },
                onClick: this._buildClickHandler('overseasPensionChart', (index, _di, chart) => {
                    const d = portabilityData[index];
                    return {
                        country: chart.data.labels[index],
                        hasSocialSecurityAgreement: d?.hasSocialSecurityAgreement,
                        awlrPct: d?.awlrPct,
                        description: `${chart.data.labels[index]} — Pension in Australia: ${formatCurrency(d?.inAustralia ?? 0)}/yr. Portable overseas rate: ${formatCurrency(d?.overseas ?? 0)}/yr.${d?.hasSocialSecurityAgreement ? ' ✅ Social Security Agreement applies — pension portable indefinitely.' : ` AWLR portability: ${d?.awlrPct}%.`}`
                    };
                }),
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { callback: (v) => formatCurrency(v) },
                        title: { display: true, text: 'Annual Pension (AUD)' }
                    }
                }
            }
        });
    }

    /**
     * Render a radar chart comparing countries across multiple suitability dimensions.
     * @param {Array<{name: string, costScore: number, healthcareScore: number, visaScore: number, distanceScore: number, taxScore: number, safetyScore: number}>} radarData
     */
    renderOverseasSuitabilityRadar(radarData) {
        this.destroyChart('overseasRadarChart');
        const canvas = document.getElementById('overseasRadarChart');
        if (!canvas || !radarData || radarData.length === 0) return;

        const ctx = canvas.getContext('2d');
        const colors = [
            'rgba(99, 102, 241, 0.3)', 'rgba(52, 211, 153, 0.3)',
            'rgba(251, 191, 36, 0.3)', 'rgba(239, 68, 68, 0.3)',
            'rgba(168, 85, 247, 0.3)'
        ];
        const borderColors = [
            'rgba(99, 102, 241, 1)', 'rgba(52, 211, 153, 1)',
            'rgba(251, 191, 36, 1)', 'rgba(239, 68, 68, 1)',
            'rgba(168, 85, 247, 1)'
        ];

        this.charts['overseasRadarChart'] = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['Affordability', 'Healthcare', 'Visa Ease', 'Proximity', 'Tax Benefits', 'Safety'],
                datasets: radarData.map((country, i) => ({
                    label: country.name,
                    data: [
                        country.costScore,
                        country.healthcareScore,
                        country.visaScore,
                        country.distanceScore,
                        country.taxScore,
                        country.safetyScore
                    ],
                    backgroundColor: colors[i % colors.length],
                    borderColor: borderColors[i % borderColors.length],
                    borderWidth: 2,
                    pointBackgroundColor: borderColors[i % borderColors.length]
                }))
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 1.4,
                plugins: {
                    title: {
                        display: true,
                        text: 'Country Suitability Comparison (Score out of 10)'
                    },
                    legend: { position: 'top' }
                },
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 10,
                        ticks: { stepSize: 2 },
                        pointLabels: { font: { size: 12 } }
                    }
                }
            }
        });
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

    // NOTE: destroyAllCharts() is already defined at line 11
    // This duplicate has been removed to avoid confusion and potential conflicts
}

export default ChartManager;