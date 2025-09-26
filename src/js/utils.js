// js/utils.js - Utility Functions for Enhanced Retirement Calculator

// DOM manipulation utilities
export const $ = (id) => document.getElementById(id);

// Utility to parse formatted numeric input values (currency, percentages)
export const parseFormattedNumber = (formattedValue) => {
    // Remove all non-numeric characters except decimal point and minus
    const numericString = String(formattedValue).replace(/[^\d.-]/g, '');
    const num = parseFloat(numericString);
    return isNaN(num) ? 0 : num;
};

export const safeGetValue = (id, defaultVal = 0) => {
    const elem = $(id);
    if (!elem) return defaultVal;

    // Handle formatted inputs by parsing them first
    const parsedVal = parseFormattedNumber(elem.value);
    return isNaN(parsedVal) ? defaultVal : parsedVal;
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

// Input formatting utilities for live currency formatting
export const formatCurrencyInput = (value) => {
    // Remove all non-numeric characters except decimal point
    const numericValue = String(value).replace(/[^\d.-]/g, '');
    const num = parseFloat(numericValue);

    if (isNaN(num)) return '';

    // Format with thousands separators but no currency symbol for input fields
    return num.toLocaleString('en-AU', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
};

export const addCurrencyFormatting = (inputElement) => {
    if (!inputElement) return;

    let isFormatting = false;

    const formatInput = () => {
        if (isFormatting) return;
        isFormatting = true;

        const cursorPosition = inputElement.selectionStart;
        const originalValue = inputElement.value;
        const numericValue = parseFormattedNumber(originalValue);

        if (originalValue !== '' && !isNaN(numericValue)) {
            const formattedValue = formatCurrencyInput(numericValue);
            inputElement.value = formattedValue;

            // Restore cursor position accounting for added commas
            const originalLength = originalValue.length;
            const newLength = formattedValue.length;
            const lengthDiff = newLength - originalLength;
            const newCursorPosition = Math.max(0, Math.min(cursorPosition + lengthDiff, newLength));

            inputElement.setSelectionRange(newCursorPosition, newCursorPosition);
        }

        isFormatting = false;
    };

    // Format on blur (when user leaves the field)
    inputElement.addEventListener('blur', formatInput);

    // Format on input but debounced to prevent cursor jumping
    let formatTimer;
    inputElement.addEventListener('input', () => {
        clearTimeout(formatTimer);
        formatTimer = setTimeout(formatInput, 500); // Delay formatting during typing
    });

    // Format on paste
    inputElement.addEventListener('paste', () => {
        setTimeout(formatInput, 10);
    });

    // Format existing value on initialization
    if (inputElement.value) {
        formatInput();
    }
};

export const initializeCurrencyInputs = () => {
    // Currency input field IDs that should be formatted
    const currencyFieldIds = [
        'yourSalary', 'partnerSalary', 'yourCurrentSuper', 'partnerCurrentSuper',
        'currentSavings', 'currentStocks', 'monthlyStockContribution',
        'homeValue', 'mortgageBalance', 'monthlyMortgagePayment',
        'investmentPropertyValue', 'investmentPropertyLoan',
        'weeklyRentalIncome', 'annualPropertyExpenses',
        'trustNetAssets', 'trustAnnualDistributions',
        'currentHealthcareCosts', 'agedCareAnnualCost',
        'asfaComfortable', 'agePensionMax', 'pensionAssetThreshold',
        'pensionAssetLimit', 'pensionIncomeThreshold'
    ];

    currencyFieldIds.forEach(id => {
        const element = $(id);
        if (element) {
            addCurrencyFormatting(element);
        }
    });
};

// Add live formatting for percentage inputs
export const addPercentageFormatting = (inputElement) => {
    if (!inputElement) return;

    const formatInput = () => {
        const originalValue = inputElement.value;
        const numericValue = parseFormattedNumber(originalValue);

        if (originalValue.endsWith('%')) return;

        if (originalValue !== '' && !isNaN(numericValue)) {
            inputElement.value = `${numericValue}%`;
        }
    };

    inputElement.addEventListener('blur', formatInput);

    // Format on paste
    inputElement.addEventListener('paste', () => {
        setTimeout(formatInput, 10);
    });

    // Format existing value on initialization
    if (inputElement.value) {
        formatInput();
    }
};

export const initializePercentageInputs = () => {
    // Percentage input field IDs that should be formatted
    const percentageFieldIds = [
        'percentIncomeSaved', 'mortgageRate', 'investmentPropertyRate',
        'propertyGrowthRate', 'capitalGainsTaxRate', 'healthcareInflation',
        'agedCareProbability', 'inflation', 'investmentReturn',
        'returnDeclineRate', 'savingsReturn', 'superReturn',
        'salaryGrowthRate', 'leanYearsReduction', 'australianEquityAllocation',
        'dividendYield', 'frankingRate', 'returnVolatility', 'shockProbability', 'shockMagnitude'
    ];

    percentageFieldIds.forEach(id => {
        const element = $(id);
        if (element) {
            addPercentageFormatting(element);
        }
    });
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

export const median = (arr) => {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
};

// Enhanced statistical utilities for volatility modeling
export const historicalVolatility = (returns, lookbackPeriod = 12) => {
    if (returns.length < 2) return 0.15; // Default volatility
    const recentReturns = returns.slice(-lookbackPeriod);
    const mean = recentReturns.reduce((sum, r) => sum + r, 0) / recentReturns.length;
    const variance = recentReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (recentReturns.length - 1);
    return Math.sqrt(variance);
};

// Regime-aware random generation with sequential correlation
export const regimeAwareReturn = (baseReturn, volatility, prevReturn = null, correlation = 0.1) => {
    let randomComponent = randomNormal(0, volatility);

    // Apply sequential correlation (momentum/mean reversion)
    if (prevReturn !== null) {
        randomComponent += correlation * prevReturn;
    }

    return baseReturn + randomComponent;
};

// Property cycle modeling based on 7-year Australian cycles
export const getPropertyCyclePhase = (year, cycleStartYear = 0) => {
    const cyclePosition = ((year - cycleStartYear) % 7) + 1;

    // Map cycle position to phases based on Australian historical patterns
    if (cyclePosition <= 2) return "Boom";
    if (cyclePosition === 3) return "Peak";
    if (cyclePosition <= 5) return "Decline";
    if (cyclePosition === 6) return "Trough";
    return "Recovery";
};

// Interest rate regime modeling
export const getCurrentRateRegime = (year, baseYear = 2024) => {
    const yearsSince = year - baseYear;

    // Model different interest rate environments with probabilities
    const regimes = [
        { name: "Ultra-Low", rate: 0.005, weight: 0.1, years: [0, 1, 2] },
        { name: "Low", rate: 0.025, weight: 0.3, years: [3, 4, 5, 6] },
        { name: "Normal", rate: 0.045, weight: 0.4, years: [7, 8, 9, 10, 11] },
        { name: "High", rate: 0.065, weight: 0.15, years: [12, 13, 14] },
        { name: "Crisis", rate: 0.085, weight: 0.05, years: [15, 16] }
    ];

    // Find regime based on year or use weighted random selection
    for (const regime of regimes) {
        if (regime.years.includes(yearsSince)) return regime;
    }

    // Fallback to weighted random selection
    const rand = Math.random();
    let cumWeight = 0;
    for (const regime of regimes) {
        cumWeight += regime.weight;
        if (rand <= cumWeight) return regime;
    }

    return regimes[2]; // Default to normal
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

// Trust calculation utilities
export const calculateTrustAttribution = (trustInputs, trustRules) => {
    if (!trustInputs.hasTrustAssets) {
        return {
            attributedAssets: 0,
            attributedIncome: 0,
            homeExemptionLost: false,
            pensionImpact: null
        };
    }

    const controlRate = trustRules.ATTRIBUTION_RATES[trustInputs.trustControlLevel] || 1.0;
    const typeRate = trustRules.TYPE_FACTORS[trustInputs.trustType]?.baseAttribution || 1.0;
    const userPercentage = trustInputs.trustAttributionPercentage / 100;

    // Calculate final attribution rate
    const finalAttributionRate = Math.min(1.0, controlRate * typeRate * userPercentage);

    const attributedAssets = trustInputs.trustNetAssets * finalAttributionRate;
    const attributedIncome = trustInputs.trustAnnualDistributions * finalAttributionRate;

    // Check if home exemption is lost
    const homeExemptionLost = trustInputs.homeInTrust &&
        trustRules.HOME_EXEMPTION.dependsOnControl &&
        (trustInputs.trustControlLevel === 'high' || trustInputs.trustControlLevel === 'medium');

    return {
        attributedAssets,
        attributedIncome,
        homeExemptionLost,
        finalAttributionRate,
        pensionImpact: {
            assetsTest: attributedAssets,
            incomeTest: attributedIncome,
            homeExemption: !homeExemptionLost
        }
    };
};

export const adjustAssetsForTrust = (originalAssets, trustAttribution, trustInputs) => {
    let adjustedAssets = originalAssets;

    // Add attributed trust assets
    adjustedAssets += trustAttribution.attributedAssets;

    // If home is in trust and loses exemption, add home value to assessable assets
    if (trustAttribution.homeExemptionLost && trustInputs.homeValue) {
        adjustedAssets += trustInputs.homeValue;
    }

    return adjustedAssets;
};

export const adjustIncomeForTrust = (originalIncome, trustAttribution, demingRates) => {
    let adjustedIncome = originalIncome;

    // Add trust distributions (subject to deeming rules)
    if (trustAttribution.attributedIncome > 0) {
        // For simplicity, treat trust income as deemed at the higher rate
        const deemedIncome = trustAttribution.attributedAssets * (demingRates?.high || 0.0275);
        adjustedIncome += Math.max(trustAttribution.attributedIncome, deemedIncome);
    }

    return adjustedIncome;
};

export const getTrustRecommendations = (trustInputs, trustRules, pensionEligible) => {
    const recommendations = [];

    if (!trustInputs.hasTrustAssets) return recommendations;

    const controlLevel = trustInputs.trustControlLevel;
    const trustType = trustInputs.trustType;

    // High control recommendations
    if (controlLevel === 'high' && pensionEligible) {
        recommendations.push({
            priority: 'high',
            category: 'trust-structure',
            title: 'Consider Reducing Trust Control',
            description: 'High control over trust results in full attribution of assets for Age Pension. Consider transferring trustee/appointer roles.',
            impact: 'May improve Age Pension eligibility',
            caution: 'Seek professional advice before making structural changes to avoid CGT or stamp duty implications.'
        });
    }

    // Home in trust recommendations
    if (trustInputs.homeInTrust) {
        recommendations.push({
            priority: 'high',
            category: 'property-structure',
            title: 'Principal Residence in Trust',
            description: 'Your home may lose Age Pension asset test exemption when held in trust.',
            impact: 'Home value may be assessable for Age Pension',
            caution: 'Consider professional advice on transferring home back to personal names before pension age.'
        });
    }

    // Attribution percentage recommendations
    if (trustInputs.trustAttributionPercentage === 100 && trustInputs.trustControlLevel !== 'high') {
        recommendations.push({
            priority: 'medium',
            category: 'attribution-review',
            title: 'Review Attribution Percentage',
            description: 'Your control level suggests attribution may be less than 100%.',
            impact: 'May reduce assessable trust assets',
            caution: 'Centrelink determines attribution based on actual control - obtain professional assessment.'
        });
    }

    return recommendations;
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
export const exportToCSV = (data, filename = 'retirement-projection.csv', inputs = null) => {
    if (!data || data.length === 0) {
        console.warn('No data to export');
        return;
    }

    // Transform data to include formatted ages if inputs are provided
    let transformedData = data;
    if (inputs && data.length > 0 && data[0].yourAge !== undefined && data[0].partnerAge !== undefined) {
        transformedData = data.map(d => {
            const yourAgeStr = d.yourAge > inputs.yourLifespan ? '-' : d.yourAge;
            const partnerAgeStr = d.partnerAge > inputs.partnerLifespan ? '-' : d.partnerAge;
            const ageDisplay = `${yourAgeStr}/${partnerAgeStr}`;

            return {
                ...d,
                age: ageDisplay // Replace the age field with formatted display
            };
        });
    }

    const headers = Object.keys(transformedData[0]);
    const csvContent = [
        headers.join(','),
        ...transformedData.map(row =>
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
        ['Financials', '% of Post-Tax Income Saved', formatPercent(inputs.percentIncomeSaved, 2)],

        ['Primary Residence', 'Current Home Value', formatCurrency(inputs.homeValue)],
        ['Primary Residence', 'Outstanding Mortgage', formatCurrency(inputs.mortgageBalance)],
        ['Primary Residence', 'Mortgage Rate (%)', formatPercent(inputs.mortgageRate, 2)],
        ['Primary Residence', 'Plan to Downsize', inputs.planToDownsize],

        ['Investment Property', 'Has Investment Property', inputs.hasInvestmentProperty],
    ];

    if (inputs.hasInvestmentProperty) {
        summaryData.push(
            ['Investment Property', 'Current Value', formatCurrency(inputs.investmentPropertyValue)],
            ['Investment Property', 'Outstanding Loan', formatCurrency(inputs.investmentPropertyLoan)],
            ['Investment Property', 'Loan Interest Rate (%)', formatPercent(inputs.investmentPropertyRate, 2)],
            ['Investment Property', 'Weekly Rental Income', formatCurrency(inputs.weeklyRentalIncome)],
            ['Investment Property', 'Annual Expenses', formatCurrency(inputs.annualPropertyExpenses)],
            ['Investment Property', 'Annual Growth Rate (%)', formatPercent(inputs.propertyGrowthRate, 2)],
            ['Investment Property', 'Sell in (Years)', inputs.sellPropertyYears]
        );
    }

    summaryData.push(
        ['Healthcare', 'Current Annual Costs', formatCurrency(inputs.currentHealthcareCosts)],
        ['Healthcare', 'Healthcare Inflation (%)', formatPercent(inputs.healthcareInflation, 2)],
        ['Aged Care', 'Aged Care Probability (%)', formatPercent(inputs.agedCareProbability, 0)],
        ['Aged Care', 'Aged Care Start Age', inputs.agedCareStartAge],
        ['Aged Care', 'Aged Care Duration (years)', inputs.agedCareDuration],
        ['Aged Care', 'Annual Aged Care Cost', formatCurrency(inputs.agedCareAnnualCost)],

        ['Economic', 'Annual Inflation Rate (%)', formatPercent(inputs.inflation, 2)],
        ['Economic', 'Initial Investment Return (%)', formatPercent(inputs.investmentReturn, 2)],
        ['Economic', 'Savings Return (%)', formatPercent(inputs.savingsReturn, 2)],
        ['Economic', 'Super Annual Growth (%)', formatPercent(inputs.superReturn, 2)],

        ['--- RESULTS ---', '---', '---'],
        ['Results', 'Future Super', formatCurrency(results.futureSuper)],
        ['Results', 'Future Savings', formatCurrency(results.futureSavings)],
        ['Results', 'Future Investments', formatCurrency(results.futureStocks)],
        ['Results', 'Accessible Home Equity', formatCurrency(results.accessibleHomeEquity)],
        ['Results', 'Property Equity', formatCurrency(results.propertyEquity)],
        ['Results', 'Total Assets at Retirement', formatCurrency(results.totalFinancialAssets + results.accessibleHomeEquity)],
        ['Results', 'Final Balance at end of Lifespan', formatCurrency(results.finalBalance)]
    );

    const ws_summary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws_summary, 'Summary');

    // --- Projection Sheet ---
    const projectionDataForSheet = results.yearlyData.map(d => {
        // Format age display as "YourAge/PartnerAge" with '-' for deceased
        let ageDisplay = d.yourAge;
        if (d.partnerAge !== undefined) {
            const yourAgeStr = d.yourAge > inputs.yourLifespan ? '-' : d.yourAge;
            const partnerAgeStr = d.partnerAge > inputs.partnerLifespan ? '-' : d.partnerAge;
            ageDisplay = `${yourAgeStr}/${partnerAgeStr}`;
        }

        return {
            'Year': d.year,
            'Age': ageDisplay,
            'Start Balance': d.startBalance,
            'Growth': d.growth,
            'Withdrawal': d.withdrawal,
            'Healthcare Cost': d.healthcareCost,
            'Aged Care Cost': d.agedCareCost,
            'Property Income': d.propertyIncome || 0,
            'Pension Income': d.pensionIncome || 0,
            'End Balance': d.endBalance, // Placeholder it shall be replaced by formula
        };
    });
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
        ws_projection[cellRef] = { f: formula, t: 'n', z: '$#,##0.00' };
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
        ['Success Rate (Monte Carlo)', results.mcSuccessRate ? formatPercent(results.mcSuccessRate) : 'N/A'],
        ['Mortgage Rate', formatPercent(inputs.mortgageRate, 2)],
        ['Investment Property Rate', formatPercent(inputs.investmentPropertyRate, 2)],
        ['Property Growth Rate', formatPercent(inputs.propertyGrowthRate, 2)],
        ['Capital Gains Tax Rate', formatPercent(inputs.capitalGainsTaxRate, 2)],
        ['Healthcare Inflation', formatPercent(inputs.healthcareInflation, 2)],
        ['Aged Care Probability', formatPercent(inputs.agedCareProbability, 0)],
        ['Inflation', formatPercent(inputs.inflation, 2)],
        ['Investment Return', formatPercent(inputs.investmentReturn, 2)],
        ['Return Decline Rate', formatPercent(inputs.returnDeclineRate, 2)],
        ['Savings Return', formatPercent(inputs.savingsReturn, 2)],
        ['Super Return', formatPercent(inputs.superReturn, 2)],
        ['Salary Growth Rate', formatPercent(inputs.salaryGrowthRate, 2)],
        ['Lean Years Reduction', formatPercent(inputs.leanYearsReduction, 2)],
        ['Australian Equity Allocation', formatPercent(inputs.australianEquityAllocation, 2)],
        ['Dividend Yield', formatPercent(inputs.dividendYield, 2)],
        ['Franking Rate', formatPercent(inputs.frankingRate, 2)],
        ['Return Volatility', formatPercent(inputs.returnVolatility, 2)],
        ['Shock Probability', formatPercent(inputs.shockProbability, 2)],
        ['Shock Magnitude', formatPercent(inputs.shockMagnitude, 2)]
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
    // Verify that this property exists in the 'inputs' object or handle the case where it might be undefined.
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
    const body = results.yearlyData.slice(0, 30).map(d => {
        // Format age display as "YourAge/PartnerAge" with '-' for deceased
        let ageDisplay = d.yourAge;
        if (d.partnerAge !== undefined) {
            const yourAgeStr = d.yourAge > inputs.yourLifespan ? '-' : d.yourAge;
            const partnerAgeStr = d.partnerAge > inputs.partnerLifespan ? '-' : d.partnerAge;
            ageDisplay = `${yourAgeStr}/${partnerAgeStr}`;
        }

        return [
            d.year,
            ageDisplay,
            formatCurrency(d.startBalance),
            formatCurrency(d.growth),
            formatCurrency(d.withdrawal),
            formatCurrency(d.endBalance)
        ];
    });

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
export const showTab = (tabName, scrollToTab = false) => {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Remove the active class from all tab buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tab content
    const targetTab = document.getElementById(tabName + '-tab');
    if (targetTab) {
        targetTab.classList.add('active');
    }

    // Find and activate the corresponding tab button
    const tabButton = document.querySelector(`.tab-button[onclick="showTab('${tabName}')"]`);
    if (tabButton) {
        tabButton.classList.add('active');
    }

    // Add active class to clicked button (if event is available)
    if (window.event && window.event.target) {
        window.event.target.classList.add('active');
    }

    // Smooth scroll to results section if requested
    if (scrollToTab) {
        // Find the results section (parent container of all tabs)
        const resultsSection = document.querySelector('.mt-8.bg-white.rounded-lg.shadow-md');
        if (resultsSection) {
            setTimeout(() => {
                resultsSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start',
                    inline: 'nearest'
                });
            }, 100); // Small delay to allow tab switching animation to start
        }
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
        if (!item) return defaultValue;

        // Try to parse as JSON first
        try {
            return JSON.parse(item);
        } catch (parseError) {
            // If JSON parsing fails, return the raw string value
            // This handles legacy values that were stored as plain strings
            console.warn(`localStorage value for '${key}' is not valid JSON, using raw value:`, item);
            return item;
        }
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

// Tooltip utilities
export const initializeTooltips = () => {
    const tooltips = document.querySelectorAll('.tooltip');

    tooltips.forEach(tooltip => {
        const tooltipIcon = tooltip.querySelector('.tooltip-icon');
        const tooltipText = tooltip.querySelector('.tooltiptext');

        if (!tooltipIcon || !tooltipText) return;

        // Add keyboard accessibility
        tooltipIcon.setAttribute('tabindex', '0');
        tooltipIcon.setAttribute('role', 'button');

        // Handle keyboard events
        tooltipIcon.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleTooltip(tooltip);
            }
            if (e.key === 'Escape') {
                hideTooltip(tooltip);
            }
        });

        // Handle touch events for mobile
        tooltipIcon.addEventListener('touchstart', (e) => {
            e.preventDefault();
            toggleTooltip(tooltip);
        });

        // Handle focus events
        tooltipIcon.addEventListener('focus', () => {
            showTooltip(tooltip);
        });

        tooltipIcon.addEventListener('blur', (e) => {
            // Only hide if focus is not moving to the tooltip content
            setTimeout(() => {
                if (!tooltip.contains(document.activeElement)) {
                    hideTooltip(tooltip);
                }
            }, 100);
        });

        // Position tooltip based on viewport
        tooltipIcon.addEventListener('mouseenter', () => {
            adjustTooltipPosition(tooltip);
        });
    });

    // Close tooltips when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.tooltip')) {
            hideAllTooltips();
        }
    });
};

export const showTooltip = (tooltip) => {
    const tooltipText = tooltip.querySelector('.tooltiptext');
    if (tooltipText) {
        tooltipText.style.visibility = 'visible';
        tooltipText.style.opacity = '1';
        adjustTooltipPosition(tooltip);
    }
};

export const hideTooltip = (tooltip) => {
    const tooltipText = tooltip.querySelector('.tooltiptext');
    if (tooltipText) {
        tooltipText.style.visibility = 'hidden';
        tooltipText.style.opacity = '0';
    }
};

export const toggleTooltip = (tooltip) => {
    const tooltipText = tooltip.querySelector('.tooltiptext');
    if (tooltipText) {
        const isVisible = tooltipText.style.visibility === 'visible';
        if (isVisible) {
            hideTooltip(tooltip);
        } else {
            hideAllTooltips(); // Hide other tooltips first
            showTooltip(tooltip);
        }
    }
};

export const hideAllTooltips = () => {
    document.querySelectorAll('.tooltiptext').forEach(tooltipText => {
        tooltipText.style.visibility = 'hidden';
        tooltipText.style.opacity = '0';
    });
};

export const adjustTooltipPosition = (tooltip) => {
    const tooltipText = tooltip.querySelector('.tooltiptext');
    if (!tooltipText) return;

    const rect = tooltip.getBoundingClientRect();
    const tooltipRect = tooltipText.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Reset positioning classes
    tooltip.classList.remove('tooltip-left', 'tooltip-right', 'tooltip-top');

    // Check if tooltip goes off the right edge
    if (rect.left + tooltipRect.width / 2 > viewportWidth - 20) {
        tooltip.classList.add('tooltip-left');
    }
    // Check if tooltip goes off the left edge
    else if (rect.left - tooltipRect.width / 2 < 20) {
        tooltip.classList.add('tooltip-right');
    }

    // Check if tooltip goes off the top edge
    if (rect.top - tooltipRect.height < 20) {
        tooltip.classList.add('tooltip-bottom');
        tooltip.classList.remove('tooltip-top');
    } else {
        tooltip.classList.add('tooltip-top');
        tooltip.classList.remove('tooltip-bottom');
    }

    // For mobile, ensure tooltip doesn't go off screen
    if (viewportWidth < 768) {
        const tooltipLeft = parseInt(tooltipText.style.left) || 0;
        const tooltipWidth = tooltipRect.width;

        if (tooltipLeft + tooltipWidth > viewportWidth - 20) {
            tooltipText.style.left = (viewportWidth - tooltipWidth - 20) + 'px';
        }
        if (tooltipLeft < 20) {
            tooltipText.style.left = '20px';
        }
    }
};

// Add tooltip positioning bottom class styles dynamically
export const addTooltipBottomStyles = () => {
    const style = document.createElement('style');
    style.textContent = `
        .tooltip-bottom .tooltiptext {
            top: 135% !important;
            bottom: auto !important;
        }
        .tooltip-bottom .tooltiptext::after {
            top: -6px !important;
            bottom: auto !important;
            border-color: transparent transparent var(--bg-secondary) transparent !important;
        }
        [data-theme="dark"] .tooltip-bottom .tooltiptext::after {
            border-color: transparent transparent var(--bg-tertiary) transparent !important;
        }
    `;
    document.head.appendChild(style);
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
    formatCurrencyInput,
    parseFormattedNumber,
    addCurrencyFormatting,
    initializeCurrencyInputs,
    addPercentageFormatting,
    initializePercentageInputs,
    randomNormal,
    percentile,
    median,
    historicalVolatility,
    regimeAwareReturn,
    getPropertyCyclePhase,
    getCurrentRateRegime,
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
    exportToXLSX,
    exportToPDF,
    showTab,
    updateProgress,
    saveToLocalStorage,
    loadFromLocalStorage,
    handleError,
    showNotification,
    debounce,
    animateValue,
    initializeTooltips,
    showTooltip,
    hideTooltip,
    toggleTooltip,
    hideAllTooltips,
    adjustTooltipPosition,
    addTooltipBottomStyles
};