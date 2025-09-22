// js/utils.js - Utility Functions for Enhanced Retirement Calculator

// DOM manipulation utilities
export const $ = (id) => document.getElementById(id);

export const safeGetValue = (id, defaultVal = 0) => {
    const elem = $(id);
    if (!elem) return defaultVal;
    const val = parseFloat(elem.value);
    return isNaN(val) ? defaultVal : val;
};

export const safeGetChecked = (id, defaultVal = false) => {
    const elem = $(id);
    return elem ? elem.checked : defaultVal;
};

export const safeGetSelectValue = (id, defaultVal = '') => {
    const elem = $(id);
    return elem ? elem.value : defaultVal;
};

export const safeSetValue = (id, value) => {
    const elem = $(id);
    if (elem) elem.value = value;
};

export const safeSetText = (id, text) => {
    const elem = $(id);
    if (elem) elem.textContent = text;
};

export const safeSetHTML = (id, html) => {
    const elem = $(id);
    if (elem) elem.innerHTML = html;
};

// Formatting utilities
export const formatCurrency = (num) => {
    if (typeof num !== 'number' || isNaN(num)) return '$0.00';
    return num.toLocaleString('en-AU', {
        style: 'currency',
        currency: 'AUD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

export const formatPercent = (num, decimals = 2) => {
    if (typeof num !== 'number' || isNaN(num)) return '0.00%';
    return (num * 100).toFixed(decimals) + '%';
};

export const formatNumber = (num, decimals = 0) => {
    if (typeof num !== 'number' || isNaN(num)) return '0';
    return num.toLocaleString('en-AU', { 
        maximumFractionDigits: decimals 
    });
};

export const formatCompact = (num) => {
    if (typeof num !== 'number' || isNaN(num)) return '0';
    
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(0) + 'K';
    }
    return num.toFixed(0);
};

// Mathematical utilities
export const randomNormal = (mean, stdDev) => {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return mean + z * stdDev;
};

export const percentile = (arr, p) => {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = Math.floor(p * sorted.length);
    return sorted[idx] || 0;
};

export const clamp = (value, min, max) => {
    return Math.min(Math.max(value, min), max);
};

export const interpolate = (x, x1, y1, x2, y2) => {
    return y1 + (x - x1) * (y2 - y1) / (x2 - x1);
};

// Financial calculation utilities
export const calculateCompoundGrowth = (principal, rate, years) => {
    return principal * Math.pow(1 + rate, years);
};

export const calculatePMT = (rate, nper, pv) => {
    if (rate === 0) return -pv / nper;
    return -pv * (rate * Math.pow(1 + rate, nper)) / (Math.pow(1 + rate, nper) - 1);
};

export const calculateLoanBalance = (rate, nperYears, monthlyPayment, principal) => {
    if (rate === 0) return Math.max(0, principal - (monthlyPayment * nperYears * 12));
    const monthlyRate = rate / 12;
    const totalPayments = nperYears * 12;
    return Math.max(0, 
        principal * Math.pow(1 + monthlyRate, totalPayments) - 
        monthlyPayment * (Math.pow(1 + monthlyRate, totalPayments) - 1) / monthlyRate
    );
};

export const calculateNPV = (cashFlows, discountRate) => {
    return cashFlows.reduce((npv, cashFlow, year) => {
        return npv + cashFlow / Math.pow(1 + discountRate, year);
    }, 0);
};

// Tax calculation utilities
export const calculateAustralianTax = (income, taxBrackets) => {
    let tax = 0;
    let remainingIncome = income;
    
    for (const bracket of taxBrackets) {
        if (remainingIncome <= 0) break;
        
        const taxableInThisBracket = Math.min(
            remainingIncome, 
            bracket.max - bracket.min
        );
        
        if (taxableInThisBracket > 0) {
            tax += taxableInThisBracket * bracket.rate;
            remainingIncome -= taxableInThisBracket;
        }
    }
    
    return tax;
};

export const calculatePostTaxIncome = (preTaxSalary, taxBrackets) => {
    const tax = calculateAustralianTax(preTaxSalary, taxBrackets);
    return preTaxSalary - tax;
};

// Investment property utilities
export const calculatePropertyCashFlow = (rental, expenses, interestCost, depreciation) => {
    return (rental * 52) - expenses - interestCost + (depreciation || 0);
};

export const calculatePropertyTotalReturn = (currentValue, purchaseValue, rental, expenses, years) => {
    const capitalGrowth = currentValue - purchaseValue;
    const totalRental = (rental * 52 - expenses) * years;
    return (capitalGrowth + totalRental) / purchaseValue;
};

export const calculateCGT = (salePrice, purchasePrice, isResident, holdingPeriod, marginalTaxRate) => {
    const capitalGain = salePrice - purchasePrice;
    if (capitalGain <= 0) return 0;
    
    const discountApplies = isResident && holdingPeriod >= 1;
    const taxableGain = discountApplies ? capitalGain * 0.5 : capitalGain;
    
    return taxableGain * marginalTaxRate;
};

// Pension calculation utilities
export const calculateAgePension = (assets, income, isCouple, maxPension, assetThreshold, assetLimit, incomeThreshold) => {
    // Asset test
    let pensionFromAssets = 0;
    if (assets <= assetThreshold) {
        pensionFromAssets = maxPension;
    } else if (assets < assetLimit) {
        const excessAssets = assets - assetThreshold;
        const reduction = (excessAssets / 1000) * 3 * 26; // $3 per fortnight per $1000
        pensionFromAssets = Math.max(0, maxPension - reduction);
    }
    
    // Income test
    let pensionFromIncome = maxPension;
    const fortnightlyIncome = income / 26;
    if (fortnightlyIncome > incomeThreshold) {
        const excessIncome = fortnightlyIncome - incomeThreshold;
        const reduction = excessIncome * 0.5 * 26; // 50 cents per dollar
        pensionFromIncome = Math.max(0, maxPension - reduction);
    }
    
    return Math.min(pensionFromAssets, pensionFromIncome);
};

// Date and time utilities
export const addYears = (date, years) => {
    const result = new Date(date);
    result.setFullYear(result.getFullYear() + years);
    return result;
};

export const yearsBetween = (date1, date2) => {
    return Math.abs(date2.getFullYear() - date1.getFullYear());
};

export const getCurrentYear = () => new Date().getFullYear();

// Array utilities
export const groupBy = (array, key) => {
    return array.reduce((groups, item) => {
        const group = item[key];
        groups[group] = groups[group] || [];
        groups[group].push(item);
        return groups;
    }, {});
};

export const sortBy = (array, key, ascending = true) => {
    return [...array].sort((a, b) => {
        const aVal = typeof key === 'function' ? key(a) : a[key];
        const bVal = typeof key === 'function' ? key(b) : b[key];
        return ascending ? aVal - bVal : bVal - aVal;
    });
};

export const sum = (array, key) => {
    return array.reduce((total, item) => {
        const value = typeof key === 'function' ? key(item) : 
                     key ? item[key] : item;
        return total + (value || 0);
    }, 0);
};

export const average = (array, key) => {
    if (array.length === 0) return 0;
    return sum(array, key) / array.length;
};

// Validation utilities
export const validateInput = (value, rules) => {
    const errors = [];
    
    if (rules.required && (!value || value === '')) {
        errors.push('This field is required');
    }
    
    if (rules.min !== undefined && value < rules.min) {
        errors.push(`Value must be at least ${rules.min}`);
    }
    
    if (rules.max !== undefined && value > rules.max) {
        errors.push(`Value must be no more than ${rules.max}`);
    }
    
    if (rules.integer && !Number.isInteger(value)) {
        errors.push('Value must be a whole number');
    }
    
    return errors;
};

export const validateForm = (inputs, validationRules) => {
    const errors = {};
    
    for (const [field, rules] of Object.entries(validationRules)) {
        const fieldErrors = validateInput(inputs[field], rules);
        if (fieldErrors.length > 0) {
            errors[field] = fieldErrors;
        }
    }
    
    return errors;
};

// Export/Import utilities
export const exportToCSV = (data, filename = 'retirement-projection.csv') => {
    if (!data || data.length === 0) {
        console.warn('No data to export');
        return;
    }
    
    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => 
            headers.map(header => {
                const value = row[header];
                // Escape commas and quotes in CSV
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            }).join(',')
        )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
};

export const exportToXLSX = (inputs, results, chartManager) => {
    if (!results) {
        showNotification('No results to export. Please run a calculation first.', 'warning');
        return;
    }

    if (typeof XLSX === 'undefined') {
        showNotification('XLSX library not loaded. Please refresh the page and try again.', 'error');
        return;
    }

    const wb = XLSX.utils.book_new();

    // --- Summary Sheet ---
    const summaryData = [
        ['Category', 'Parameter', 'Value'],
        ['Personal', 'Your Current Age', inputs.yourCurrentAge],
        ['Personal', 'Partners Current Age', inputs.partnerCurrentAge],
        ['Personal', 'Your Retirement Age', inputs.retirementAge],
        ['Personal', 'Partners Retirement Age', inputs.partnerRetirementAge],
        ['Personal', 'Your Lifespan', inputs.yourLifespan],
        ['Personal', 'Partners Lifespan', inputs.partnerLifespan],
        
        ['Risk Profile', 'Risk Tolerance (1-10)', inputs.riskTolerance],
        ['Risk Profile', 'Emergency Fund', inputs.hasEmergencyFund],
        ['Risk Profile', 'High-Interest Debt', inputs.hasDebt],
        ['Risk Profile', 'Financial Dependents', inputs.dependents],

        ['Financials', 'Your Annual Salary', inputs.yourSalary],
        ['Financials', 'Partners Annual Salary', inputs.partnerSalary],
        ['Financials', 'Current Superannuation', (inputs.yourCurrentSuper + inputs.partnerCurrentSuper)],
        ['Financials', 'Current Savings', inputs.currentSavings],
        ['Financials', 'Current Stocks', inputs.currentStocks],
        ['Financials', 'Monthly Stock Contributions', inputs.monthlyStockContribution],
        ['Financials', '% of Post-Tax Income Saved', inputs.percentIncomeSaved * 100],

        ['Primary Residence', 'Current Home Value', inputs.homeValue],
        ['Primary Residence', 'Outstanding Mortgage', inputs.mortgageBalance],
        ['Primary Residence', 'Mortgage Rate (%)', inputs.mortgageRate * 100],
        ['Primary Residence', 'Plan to Downsize', inputs.planToDownsize],

        ['Investment Property', 'Has Investment Property', inputs.hasInvestmentProperty],
    ];

    if (inputs.hasInvestmentProperty) {
        summaryData.push(
            ['Investment Property', 'Current Value', inputs.investmentPropertyValue],
            ['Investment Property', 'Outstanding Loan', inputs.investmentPropertyLoan],
            ['Investment Property', 'Loan Interest Rate (%)', inputs.investmentPropertyRate * 100],
            ['Investment Property', 'Weekly Rental Income', inputs.weeklyRentalIncome],
            ['Investment Property', 'Annual Expenses', inputs.annualPropertyExpenses],
            ['Investment Property', 'Annual Growth Rate (%)', inputs.propertyGrowthRate],
            ['Investment Property', 'Sell in (Years)', inputs.sellPropertyYears]
        );
    }

    summaryData.push(
        ['Healthcare', 'Current Annual Costs', inputs.currentHealthcareCosts],
        ['Healthcare', 'Healthcare Inflation (%)', inputs.healthcareInflation],
        ['Aged Care', 'Aged Care Probability (%)', inputs.agedCareProbability],
        ['Aged Care', 'Aged Care Start Age', inputs.agedCareStartAge],
        ['Aged Care', 'Aged Care Duration (years)', inputs.agedCareDuration],
        ['Aged Care', 'Annual Aged Care Cost', inputs.agedCareAnnualCost],
        
        ['Economic', 'Annual Inflation Rate (%)', inputs.inflation * 100],
        ['Economic', 'Initial Investment Return (%)', inputs.investmentReturn * 100],
        ['Economic', 'Savings Return (%)', inputs.savingsReturn * 100],
        ['Economic', 'Super Annual Growth (%)', inputs.superReturn * 100],

        ['--- RESULTS ---', '---', '---'],
        ['Results', 'Future Super', results.futureSuper],
        ['Results', 'Future Savings', results.futureSavings],
        ['Results', 'Future Investments', results.futureStocks],
        ['Results', 'Accessible Home Equity', results.accessibleHomeEquity],
        ['Results', 'Property Equity', results.propertyEquity],
        ['Results', 'Total Assets at Retirement', results.totalFinancialAssets + results.accessibleHomeEquity],
        ['Results', 'Final Balance at end of Lifespan', results.finalBalance]
    );

    const ws_summary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws_summary, 'Summary');

    // --- Projection Sheet ---
    const projectionDataForSheet = results.yearlyData.map(d => ({
        'Year': d.year,
        'Age': d.age,
        'Start Balance': d.startBalance,
        'Growth': d.growth,
        'Withdrawal': d.withdrawal,
        'Healthcare Cost': d.healthcareCost,
        'Aged Care Cost': d.agedCareCost,
        'Property Income': d.propertyIncome || 0,
        'Pension Income': d.pensionIncome || 0,
        'End Balance': d.endBalance, // Placeholder, will be replaced by formula
    }));
    const ws_projection = XLSX.utils.json_to_sheet(projectionDataForSheet);

    // Define column letter constants for maintainability
    const COL_START_BALANCE = 'C';
    const COL_GROWTH = 'D';
    const COL_WITHDRAWAL = 'E';
    const COL_HEALTHCARE_COST = 'F';
    const COL_AGED_CARE_COST = 'G';
    const COL_PROPERTY_INCOME = 'H';
    const COL_PENSION_INCOME = 'I';

    // Add formulas for the 'End Balance' column (column J)
    for (let i = 0; i < results.yearlyData.length; i++) {
        const rowIndex = i + 2; // 1-based index, plus header row
        const formula = `${COL_START_BALANCE}${rowIndex}+${COL_GROWTH}${rowIndex}-${COL_WITHDRAWAL}${rowIndex}-${COL_HEALTHCARE_COST}${rowIndex}-${COL_AGED_CARE_COST}${rowIndex}+${COL_PROPERTY_INCOME}${rowIndex}+${COL_PENSION_INCOME}${rowIndex}`;
        const cellRef = XLSX.utils.encode_cell({c: 9, r: i + 1}); // Column J
        ws_projection[cellRef] = { f: formula };
    }
    XLSX.utils.book_append_sheet(wb, ws_projection, 'Projection');

    // --- Charts Data Sheet ---
    const chartData = [];
    
    const fanChartData = chartManager.getChartData('fanChart');
    if (fanChartData && fanChartData.labels) {
        chartData.push(['Portfolio Balance Over Time (fanChart)']);
        chartData.push(['Year', 'Balance']);
        fanChartData.labels.forEach((label, i) => {
            chartData.push([label, fanChartData.datasets[0].data[i]]);
        });
        chartData.push([]); // Spacer
    }

    const histChartData = chartManager.getChartData('histChart');
    if (histChartData && histChartData.labels) {
        chartData.push(['Final Balance Distribution (histChart)']);
        chartData.push(['Balance Bin', 'Frequency']);
        histChartData.labels.forEach((label, i) => {
            chartData.push([label, histChartData.datasets[0].data[i]]);
        });
        chartData.push([]);
    }

    const allocationChartData = chartManager.getChartData('allocationChart');
    if (allocationChartData && allocationChartData.labels) {
        chartData.push(['Asset Allocation Over Time (allocationChart)']);
        chartData.push(['Age', 'Equity %', 'Bonds %', 'Cash %']);
        allocationChartData.labels.forEach((label, i) => {
            chartData.push([
                label, 
                allocationChartData.datasets[0].data[i],
                allocationChartData.datasets[1].data[i],
                allocationChartData.datasets[2].data[i]
            ]);
        });
        chartData.push([]);
    }
    
    const propertyChartData = chartManager.getChartData('propertyChart');
    if (propertyChartData && propertyChartData.labels) {
        chartData.push(['Property vs Portfolio Growth (propertyChart)']);
        chartData.push(['Year', 'Portfolio Value', 'Property Value']);
        propertyChartData.labels.forEach((label, i) => {
            chartData.push([
                label,
                propertyChartData.datasets[0] ? propertyChartData.datasets[0].data[i] : 0,
                propertyChartData.datasets[1] ? propertyChartData.datasets[1].data[i] : 0
            ]);
        });
    }

    const ws_charts = XLSX.utils.aoa_to_sheet(chartData);
    XLSX.utils.book_append_sheet(wb, ws_charts, 'Charts Data');

    // --- Write file ---
    try {
        XLSX.writeFile(wb, 'Australian-Couple-Retirement-Report.xlsx');
        showNotification('XLSX report generated successfully', 'success');
    } catch (error) {
        console.error('Error generating XLSX file:', error);
        showNotification('Failed to generate XLSX report. Please try again.', 'error');
    }
};

export const exportToPDF = (inputs, results, chartManager) => {
    if (!results) {
        showNotification('No results to export. Please run a calculation first.', 'warning');
        return;
    }

    if (typeof window.jspdf === 'undefined') {
        showNotification('jsPDF library not loaded. Please refresh the page and try again.', 'error');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // --- Title ---
    doc.setFontSize(22);
    doc.text("Enhanced Retirement Report", 14, 22);

    // --- Summary Table ---
    doc.setFontSize(16);
    doc.text("Summary", 14, 35);
    
    const summaryBody = [
        ['Your Current Age', inputs.yourCurrentAge],
        ['Partners Current Age', inputs.partnerCurrentAge],
        ['Your Retirement Age', inputs.retirementAge],
        ['Total Assets at Retirement', formatCurrency(results.totalFinancialAssets + results.accessibleHomeEquity)],
        ['Projected Final Balance', formatCurrency(results.finalBalance)],
        ['Success Rate (Monte Carlo)', results.mcSuccessRate ? formatPercent(results.mcSuccessRate) : 'N/A']
    ];

    doc.autoTable({
        startY: 40,
        head: [['Parameter', 'Value']],
        body: summaryBody,
        theme: 'grid',
        headStyles: { fillColor: [41, 128, 185] }
    });

    let yPos = doc.autoTable.previous.finalY + 15;

    // --- Charts ---
    const addChartToPDF = (chartId, title) => {
        const chart = chartManager.charts[chartId];
        if (chart) {
            if (yPos > 180) { // Check if there's enough space for the chart
                doc.addPage();
                yPos = 20;
            }
            doc.setFontSize(14);
            doc.text(title, 14, yPos);
            yPos += 8;
            const imgData = chart.toBase64Image('image/jpeg', 0.9);
            doc.addImage(imgData, 'JPEG', 14, yPos, 180, 100);
            yPos += 105;
        }
    };

    addChartToPDF('fanChart', 'Portfolio Balance Projection');
    addChartToPDF('histChart', 'Final Balance Distribution');
    
    // The code references inputs.useGlidePath but this property is not visible in the summary data structure.
    // Verify that this property exists in the inputs object or handle the case where it might be undefined.
    // If inputs.useGlidePath is undefined or null, this will safely default to false. This ensures the chart is only added if useGlidePath is truthy.
    if (inputs.useGlidePath ?? false) {
        addChartToPDF('allocationChart', 'Asset Allocation Over Time');
    }
    if (inputs.hasInvestmentProperty) {
        addChartToPDF('propertyChart', 'Property vs. Portfolio Growth');
    }

    // --- Projection Table ---
    doc.addPage();
    doc.setFontSize(16);
    doc.text("Year-by-Year Projection (First 30 Years)", 14, 22);

    const head = [['Year', 'Age', 'Start Balance', 'Growth', 'Withdrawal', 'End Balance']];
    const body = results.yearlyData.slice(0, 30).map(d => [
        d.year,
        d.age,
        formatCurrency(d.startBalance),
        formatCurrency(d.growth),
        formatCurrency(d.withdrawal),
        formatCurrency(d.endBalance)
    ]);

    doc.autoTable({
        head: head,
        body: body,
        startY: 30,
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185] }
    });

    // --- Save PDF ---
    try {
        doc.save('Australian-Couple-Retirement-Report.pdf');
        showNotification('PDF report generated successfully', 'success');
    } catch (error) {
        console.error('Error generating PDF file:', error);
        showNotification('Failed to generate PDF report. Please try again.', 'error');
    }
};

export const exportToJSON = (data, filename = 'retirement-data.json') => {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
};

// Tab management utilities
export const showTab = (tabName) => {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab content
    const targetTab = document.getElementById(tabName + '-tab');
    if (targetTab) {
        targetTab.classList.add('active');
    }
    
    // Add active class to clicked button (if event is available)
    if (window.event && window.event.target) {
        window.event.target.classList.add('active');
    }
};

// Progress bar utilities
export const updateProgress = (percentage, text = '') => {
    const progressBar = $('progressBar');
    const progressText = $('progressText');
    const progressContainer = $('progressContainer');
    
    if (progressContainer) {
        if (percentage > 0) {
            progressContainer.classList.remove('hidden');
        } else {
            progressContainer.classList.add('hidden');
        }
    }
    
    if (progressBar) {
        progressBar.style.width = `${Math.min(100, Math.max(0, percentage))}%`;
    }
    
    if (progressText) {
        progressText.textContent = text;
    }
};

// Local storage utilities
export const saveToLocalStorage = (key, data) => {
    try {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
    } catch (error) {
        console.warn('Failed to save to localStorage:', error);
        return false;
    }
};

export const loadFromLocalStorage = (key, defaultValue = null) => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.warn('Failed to load from localStorage:', error);
        return defaultValue;
    }
};

// Error handling utilities
export const handleError = (error, context = '') => {
    console.error(`Error in ${context}:`, error);
    
    // Show user-friendly error message
    const errorMsg = error.message || 'An unexpected error occurred';
    showNotification(`Error: ${errorMsg}`, 'error');
};

export const showNotification = (message, type = 'info', duration = 5000) => {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Style the notification
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem;
        border-radius: 0.5rem;
        color: white;
        z-index: 1000;
        max-width: 300px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    
    // Set background color based on type
    const colors = {
        info: '#3b82f6',
        success: '#10b981',
        warning: '#f59e0b',
        error: '#ef4444'
    };
    notification.style.backgroundColor = colors[type] || colors.info;
    
    // Add to page
    document.body.appendChild(notification);
    
    // Remove after duration
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, duration);
};

// Debounce utility for performance
export const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

// Animation utilities
export const animateValue = (element, start, end, duration = 1000) => {
    const startTime = performance.now();
    
    const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function (ease-out)
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        
        const current = start + (end - start) * easedProgress;
        
        if (typeof element === 'string') {
            const elem = $(element);
            if (elem) elem.textContent = formatCurrency(current);
        } else if (element) {
            element.textContent = formatCurrency(current);
        }
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    };
    
    requestAnimationFrame(animate);
};

export default {
    $,
    safeGetValue,
    safeGetChecked,
    safeGetSelectValue,
    safeSetValue,
    safeSetText,
    safeSetHTML,
    formatCurrency,
    formatPercent,
    formatNumber,
    formatCompact,
    randomNormal,
    percentile,
    clamp,
    interpolate,
    calculateCompoundGrowth,
    calculatePMT,
    calculateLoanBalance,
    calculateNPV,
    calculateAustralianTax,
    calculatePostTaxIncome,
    calculatePropertyCashFlow,
    calculatePropertyTotalReturn,
    calculateCGT,
    calculateAgePension,
    exportToCSV,
    exportToJSON,
    showTab,
    updateProgress,
    saveToLocalStorage,
    loadFromLocalStorage,
    handleError,
    showNotification,
    debounce,
    animateValue
};