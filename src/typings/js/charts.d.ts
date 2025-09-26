
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
        
        declare interface percentileDataType {}
