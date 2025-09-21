/**
 * Enhanced Australian Retirement Calculator - Utility Functions Module
 * Contains reusable utility functions for formatting, math, DOM manipulation, and file operations
 */

// DOM Utilities
export const DOM = {
    /**
     * Get element by ID with error handling
     */
    get: (id) => {
        const element = document.getElementById(id);
        if (!element) {
            console.warn(`Element with ID '${id}' not found`);
        }
        return element;
    },

    /**
     * Get numeric value from input element
     */
    getNumericValue: (id, defaultValue = 0) => {
        const element = DOM.get(id);
        if (!element) return defaultValue;
        const value = parseFloat(element.value);
        return isNaN(value) ? defaultValue : value;
    },

    /**
     * Get boolean value from checkbox or select
     */
    getBooleanValue: (id, defaultValue = false) => {
        const element = DOM.get(id);
        if (!element) return defaultValue;
        if (element.type === 'checkbox') {
            return element.checked;
        }
        return element.value === 'true';
    },

    /**
     * Set value of an element
     */
    setValue: (id, value) => {
        const element = DOM.get(id);
        if (element) {
            if (element.type === 'checkbox') {
                element.checked = value;
            } else {
                element.value = value;
            }
        }
    },

    /**
     * Show/hide element
     */
    toggle: (id, show) => {
        const element = DOM.get(id);
        if (element) {
            element.classList.toggle('hidden', !show);
        }
    },

    /**
     * Add event listener with error handling
     */
    addListener: (id, event, callback) => {
        const element = DOM.get(id);
        if (element) {
            element.addEventListener(event, callback);
        }
    },

    /**
     * Update inner HTML safely
     */
    setHTML: (id, html) => {
        const element = DOM.get(id);
        if (element) {
            element.innerHTML = html;
        }
    },

    /**
     * Update text content safely
     */
    setText: (id, text) => {
        const element = DOM.get(id);
        if (element) {
            element.textContent = text;
        }
    }
};

// Formatting Utilities
export const Format = {
    /**
     * Format number as Australian currency
     */
    currency: (num, options = {}) => {
        if (typeof num !== 'number' || isNaN(num)) return '$0';
        
        const defaults = {
            style: 'currency',
            currency: 'AUD',
            maximumFractionDigits: 0,
            minimumFractionDigits: 0
        };
        
        const settings = { ...defaults, ...options };
        
        try {
            return num.toLocaleString('en-AU', settings);
        } catch (error) {
            // Fallback for older browsers
            return '$' + num.toFixed(settings.maximumFractionDigits).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        }
    },

    /**
     * Format percentage with specified decimal places
     */
    percentage: (num, decimals = 1) => {
        if (typeof num !== 'number' || isNaN(num)) return '0%';
        return (num * 100).toFixed(decimals) + '%';
    },

    /**
     * Format large numbers with appropriate suffixes
     */
    largeNumber: (num) => {
        if (typeof num !== 'number' || isNaN(num)) return '0';
        
        const absNum = Math.abs(num);
        const sign = num < 0 ? '-' : '';
        
        if (absNum >= 1e9) {
            return sign + (absNum / 1e9).toFixed(1) + 'B';
        } else if (absNum >= 1e6) {
            return sign + (absNum / 1e6).toFixed(1) + 'M';
        } else if (absNum >= 1e3) {
            return sign + (absNum / 1e3).toFixed(1) + 'K';
        }
        return num.toString();
    },

    /**
     * Format age display
     */
    age: (age) => {
        return Math.floor(age) + ' years';
    },

    /**
     * Format years remaining
     */
    yearsRemaining: (years) => {
        if (years <= 0) return 'Complete';
        return Math.ceil(years) + ' years remaining';
    }
};

// Mathematical Utilities
export const Math = {
    /**
     * Generate random number with normal distribution (Box-Muller transform)
     */
    randomNormal: (mean = 0, stdDev = 1) => {
        let u = 0, v = 0;
        while (u === 0) u = window.Math.random(); // Converting [0,1) to (0,1)
        while (v === 0) v = window.Math.random();
        
        const z = window.Math.sqrt(-2.0 * window.Math.log(u)) * window.Math.cos(2.0 * window.Math.PI * v);
        return mean + z * stdDev;
    },

    /**
     * Calculate percentile of array
     */
    percentile: (arr, p) => {
        if (arr.length === 0) return 0;
        const sorted = [...arr].sort((a, b) => a - b);
        const index = p * (sorted.length - 1);
        const lower = window.Math.floor(index);
        const upper = window.Math.ceil(index);
        const weight = index % 1;
        
        if (upper >= sorted.length) return sorted[sorted.length - 1];
        return sorted[lower] * (1 - weight) + sorted[upper] * weight;
    },

    /**
     * Calculate compound interest
     */
    compound: (principal, rate, periods) => {
        return principal * window.Math.pow(1 + rate, periods);
    },

    /**
     * Calculate present value
     */
    presentValue: (futureValue, rate, periods) => {
        return futureValue / window.Math.pow(1 + rate, periods);
    },

    /**
     * Calculate annuity payment (PMT)
     */
    pmt: (rate, nper, pv, fv = 0, type = 0) => {
        if (rate === 0) {
            return -(pv + fv) / nper;
        }
        
        const pvif = window.Math.pow(1 + rate, nper);
        const pmt = -(rate * (pv * pvif + fv)) / ((pvif - 1) * (1 + rate * type));
        return pmt;
    },

    /**
     * Calculate future value of annuity
     */
    fv: (rate, nper, pmt, pv = 0, type = 0) => {
        if (rate === 0) {
            return -(pv + pmt * nper);
        }
        
        const pvif = window.Math.pow(1 + rate, nper);
        const fvifa = (pvif - 1) / rate;
        return -(pv * pvif + pmt * (1 + rate * type) * fvifa);
    },

    /**
     * Calculate loan balance after payments
     */
    loanBalance: (principal, rate, totalPayments, paymentsMade, monthlyPayment) => {
        if (rate === 0) {
            return principal - (monthlyPayment * paymentsMade);
        }
        
        const monthlyRate = rate / 12;
        const balance = principal * window.Math.pow(1 + monthlyRate, paymentsMade) - 
                       monthlyPayment * ((window.Math.pow(1 + monthlyRate, paymentsMade) - 1) / monthlyRate);
        
        return window.Math.max(0, balance);
    },

    /**
     * Calculate correlation coefficient between two arrays
     */
    correlation: (x, y) => {
        if (x.length !== y.length || x.length === 0) return 0;
        
        const n = x.length;
        const sumX = x.reduce((a, b) => a + b);
        const sumY = y.reduce((a, b) => a + b);
        const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
        const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
        const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);
        
        const numerator = n * sumXY - sumX * sumY;
        const denominator = window.Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
        
        return denominator === 0 ? 0 : numerator / denominator;
    },

    /**
     * Clamp value between min and max
     */
    clamp: (value, min, max) => {
        return window.Math.min(window.Math.max(value, min), max);
    },

    /**
     * Linear interpolation
     */
    lerp: (start, end, factor) => {
        return start + (end - start) * factor;
    }
};

// Date and Time Utilities
export const DateTime = {
    /**
     * Get current year
     */
    currentYear: () => new Date().getFullYear(),

    /**
     * Calculate age from birth year
     */
    calculateAge: (birthYear) => {
        return DateTime.currentYear() - birthYear;
    },

    /**
     * Add years to current date
     */
    addYears: (years) => {
        const date = new Date();
        date.setFullYear(date.getFullYear() + years);
        return date;
    },

    /**
     * Format date for display
     */
    formatDate: (date) => {
        return date.toLocaleDateString('en-AU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
};

// Validation Utilities
export const Validate = {
    /**
     * Validate age input
     */
    age: (age, min = 18, max = 100) => {
        const numAge = parseFloat(age);
        if (isNaN(numAge)) return { valid: false, message: 'Age must be a number' };
        if (numAge < min) return { valid: false, message: `Age must be at least ${min}` };
        if (numAge > max) return { valid: false, message: `Age must be less than ${max}` };
        return { valid: true };
    },

    /**
     * Validate salary input
     */
    salary: (salary, max = 5000000) => {
        const numSalary = parseFloat(salary);
        if (isNaN(numSalary)) return { valid: false, message: 'Salary must be a number' };
        if (numSalary < 0) return { valid: false, message: 'Salary cannot be negative' };
        if (numSalary > max) return { valid: false, message: `Salary seems unreasonably high (>${Format.currency(max)})` };
        return { valid: true };
    },

    /**
     * Validate percentage input
     */
    percentage: (percent, min = 0, max = 100) => {
        const numPercent = parseFloat(percent);
        if (isNaN(numPercent)) return { valid: false, message: 'Percentage must be a number' };
        if (numPercent < min) return { valid: false, message: `Percentage must be at least ${min}%` };
        if (numPercent > max) return { valid: false, message: `Percentage must be at most ${max}%` };
        return { valid: true };
    },

    /**
     * Validate asset allocation totals to 100%
     */
    allocation: (equity, bonds, cash, tolerance = 1) => {
        const total = equity + bonds + cash;
        const diff = window.Math.abs(total - 100);
        
        if (diff > tolerance) {
            return { 
                valid: false, 
                message: `Asset allocation must total 100% (currently ${total.toFixed(1)}%)` 
            };
        }
        return { valid: true };
    },

    /**
     * Validate retirement age is greater than current age
     */
    retirementAge: (currentAge, retirementAge) => {
        if (retirementAge <= currentAge) {
            return { valid: false, message: 'Retirement age must be greater than current age' };
        }
        if (retirementAge < 55) {
            return { valid: false, message: 'Retirement age should be at least 55 for super access' };
        }
        if (retirementAge > 75) {
            return { valid: false, message: 'Retirement age seems unreasonably high' };
        }
        return { valid: true };
    }
};

// Array Utilities
export const Array = {
    /**
     * Create array of specified length with initial value
     */
    create: (length, initialValue = 0) => {
        return new window.Array(length).fill(initialValue);
    },

    /**
     * Create range array (e.g., [1, 2, 3, 4, 5])
     */
    range: (start, end, step = 1) => {
        const result = [];
        for (let i = start; i <= end; i += step) {
            result.push(i);
        }
        return result;
    },

    /**
     * Calculate sum of array
     */
    sum: (arr) => {
        return arr.reduce((sum, val) => sum + val, 0);
    },

    /**
     * Calculate average of array
     */
    average: (arr) => {
        return arr.length === 0 ? 0 : Array.sum(arr) / arr.length;
    },

    /**
     * Get last element of array
     */
    last: (arr) => {
        return arr.length === 0 ? undefined : arr[arr.length - 1];
    },

    /**
     * Chunk array into smaller arrays
     */
    chunk: (arr, size) => {
        const chunks = [];
        for (let i = 0; i < arr.length; i += size) {
            chunks.push(arr.slice(i, i + size));
        }
        return chunks;
    }
};

// File Utilities
export const File = {
    /**
     * Export data to CSV file
     */
    exportCSV: (data, filename = 'retirement_projection.csv') => {
        if (!data || data.length === 0) {
            alert('No data to export');
            return;
        }

        // Get headers from first object keys
        const headers = Object.keys(data[0]);
        
        // Create CSV content
        const csvContent = [
            headers.join(','),
            ...data.map(row => 
                headers.map(header => {
                    const value = row[header];
                    // Handle values that might contain commas
                    if (typeof value === 'string' && value.includes(',')) {
                        return `"${value}"`;
                    }
                    return value;
                }).join(',')
            )
        ].join('\n');

        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
    },

    /**
     * Save data to localStorage
     */
    saveToLocal: (key, data) => {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.warn('Failed to save to localStorage:', error);
            return false;
        }
    },

    /**
     * Load data from localStorage
     */
    loadFromLocal: (key, defaultValue = null) => {
        try {
            const stored = localStorage.getItem(key);
            return stored ? JSON.parse(stored) : defaultValue;
        } catch (error) {
            console.warn('Failed to load from localStorage:', error);
            return defaultValue;
        }
    }
};

// Progress Tracking
export const Progress = {
    /**
     * Show progress bar
     */
    show: (containerId = 'progressContainer') => {
        DOM.toggle(containerId, true);
    },

    /**
     * Hide progress bar
     */
    hide: (containerId = 'progressContainer') => {
        DOM.toggle(containerId, false);
    },

    /**
     * Update progress bar
     */
    update: (percent, text = '', barId = 'progressBar', textId = 'progressText') => {
        const clampedPercent = Math.clamp(percent, 0, 100);
        
        const progressBar = DOM.get(barId);
        if (progressBar) {
            progressBar.style.width = `${clampedPercent}%`;
        }
        
        if (text) {
            DOM.setText(textId, text);
        }
    }
};

// Tab Management
export const Tabs = {
    /**
     * Show specific tab and hide others
     */
    show: (tabName) => {
        // Hide all tab contents
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        
        // Remove active class from all tab buttons
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Show selected tab content
        const tabContent = DOM.get(`${tabName}-tab`);
        if (tabContent) {
            tabContent.classList.add('active');
        }
        
        // Activate corresponding button (find by onclick attribute or data)
        const activeButton = document.querySelector(`[onclick="showTab('${tabName}')"]`);
        if (activeButton) {
            activeButton.classList.add('active');
        }
    }
};

// Debug Utilities
export const Debug = {
    /**
     * Log object with formatting
     */
    log: (label, data) => {
        console.group(label);
        console.log(data);
        console.groupEnd();
    },

    /**
     * Performance timing
     */
    time: (label) => {
        console.time(label);
    },

    /**
     * End performance timing
     */
    timeEnd: (label) => {
        console.timeEnd(label);
    },

    /**
     * Log calculation results for debugging
     */
    logCalculation: (inputs, results) => {
        console.group('Calculation Debug');
        console.log('Inputs:', inputs);
        console.log('Results:', results);
        console.groupEnd();
    }
};

// Make showTab available globally for HTML onclick handlers
window.showTab = Tabs.show;

// Export utility collections
export const Utils = {
    DOM,
    Format,
    Math,
    DateTime,
    Validate,
    Array,
    File,
    Progress,
    Tabs,
    Debug
};