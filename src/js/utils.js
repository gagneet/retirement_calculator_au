// js/utils.js - Utility Functions for Enhanced Retirement Calculator

import { ENHANCED_CONFIG } from './config.js';

const debugLog = process.env.NODE_ENV !== 'production' ? console.log.bind(console) : () => {};

// DOM manipulation utilities
export const $ = (id) => document.getElementById(id);

// Get raw input value without extra processing
export const getRawValue = (id, defaultVal = 0) => {
    const elem = $(id);
    if (!elem) return defaultVal;
    const rawValue = elem.value.trim();
    if (rawValue === '') return defaultVal;
    // Directly return the string value for the caller to process
    return rawValue;
};

// Utility to parse formatted numeric input values (currency, percentages)
export const parseFormattedNumber = (formattedValue) => {
    // Remove all non-numeric characters except decimal point and minus
    // This handles $, %, commas, and other formatting characters
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

    // Format with thousands separators and $ symbol for input fields
    return '$' + num.toLocaleString('en-AU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

export const addCurrencyFormatting = (inputElement) => {
    if (!inputElement) return;

    // Check if formatting has already been added to prevent duplicate listeners
    if (inputElement.hasAttribute('data-currency-formatted')) {
        // Just format the current value if it exists
        if (inputElement.value && inputElement.value !== '') {
            const numericValue = parseFormattedNumber(inputElement.value);
            if (!isNaN(numericValue)) {
                inputElement.value = formatCurrencyInput(numericValue);
            }
        }
        return;
    }

    // Mark this element as formatted
    inputElement.setAttribute('data-currency-formatted', 'true');

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

            // Restore cursor position accounting for added commas and $ symbol
            const originalLength = originalValue.length;
            const newLength = formattedValue.length;
            const lengthDiff = newLength - originalLength;
            // Ensure cursor doesn't go before the $ symbol
            const newCursorPosition = Math.max(1, Math.min(cursorPosition + lengthDiff, newLength));

            inputElement.setSelectionRange(newCursorPosition, newCursorPosition);
        }

        isFormatting = false;
    };

    // Format on blur (when user leaves the field)
    inputElement.addEventListener('blur', formatInput);

    // Prevent cursor from going before $ symbol
    inputElement.addEventListener('keydown', (e) => {
        const cursorPosition = inputElement.selectionStart;
        if ((e.key === 'Backspace' || e.key === 'Delete' || e.key === 'ArrowLeft') && cursorPosition <= 1) {
            if (inputElement.value.startsWith('$')) {
                e.preventDefault();
                inputElement.setSelectionRange(1, 1);
            }
        }
    });

    // Handle click events to prevent cursor from going before $
    inputElement.addEventListener('click', () => {
        if (inputElement.selectionStart === 0 && inputElement.value.startsWith('$')) {
            inputElement.setSelectionRange(1, 1);
        }
    });

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
        'currentMonthlyHousingCosts', 'currentMonthlyLivingCosts',
        'homeValue', 'mortgageBalance', 'monthlyMortgagePayment',
        'investmentPropertyValue', 'investmentPropertyLoan',
        'investmentPropertyPurchasePrice', 'weeklyRentalIncome', 'annualPropertyExpenses',
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

    // Check if formatting has already been added to prevent duplicate listeners
    if (inputElement.hasAttribute('data-percentage-formatted')) {
        // Just format the current value if it exists
        if (inputElement.value && inputElement.value !== '') {
            const numericValue = parseFormattedNumber(inputElement.value);
            if (!isNaN(numericValue)) {
                const formattedNumber = numericValue.toLocaleString('en-AU', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                });
                inputElement.value = `${formattedNumber}%`;
            }
        }
        return;
    }

    // Mark this element as formatted
    inputElement.setAttribute('data-percentage-formatted', 'true');

    const formatInput = () => {
        const originalValue = inputElement.value;
        const numericValue = parseFormattedNumber(originalValue);

        if (originalValue.endsWith('%') && originalValue.includes(',')) return;

        if (originalValue !== '' && !isNaN(numericValue)) {
            // Format with commas and 2 decimal places for percentages
            const formattedNumber = numericValue.toLocaleString('en-AU', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            });
            inputElement.value = `${formattedNumber}%`;
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
        'dividendYield', 'frankingRate', 'returnVolatility', 'shockProbability', 'shockMagnitude',
        'allocEquities', 'allocBonds', 'allocCash', 'trustAttributionPercentage',
        'carLoanRate', 'employerSuperContributionRate'
    ];
    // Note: dependent percentage fields (childrenUnder5Percent, childrenPrimaryPercent, etc.)
    // are type="number" inputs and must NOT use addPercentageFormatting — setting a value
    // like "70.00%" on a number input causes the browser to reject it (value becomes "").

    percentageFieldIds.forEach(id => {
        const element = $(id);
        if (element) {
            addPercentageFormatting(element);
        }
    });
};

// Add live formatting for numeric inputs (no decimals)
export const addNumericFormatting = (inputElement) => {
    if (!inputElement) return;

    // Check if formatting has already been added to prevent duplicate listeners
    if (inputElement.hasAttribute('data-numeric-formatted')) {
        // Just format the current value if it exists
        if (inputElement.value && inputElement.value !== '' && !inputElement.value.includes(',')) {
            const numericValue = parseFormattedNumber(inputElement.value);
            if (!isNaN(numericValue)) {
                const formattedNumber = numericValue.toLocaleString('en-AU', {
                    maximumFractionDigits: 0,
                });
                inputElement.value = formattedNumber;
            }
        }
        return;
    }

    // Mark this element as formatted
    inputElement.setAttribute('data-numeric-formatted', 'true');

    const formatInput = () => {
        const originalValue = inputElement.value;
        const numericValue = parseFormattedNumber(originalValue);

        if (originalValue !== '' && !isNaN(numericValue) && !originalValue.includes(',')) {
            // Format with commas and 0 decimal places
            const formattedNumber = numericValue.toLocaleString('en-AU', {
                maximumFractionDigits: 0,
            });
            inputElement.value = formattedNumber;
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

export const initializeNumericInputs = () => {
    // Numeric input field IDs that should be formatted
    const numericFieldIds = [
        'yourCurrentAge', 'partnerCurrentAge', 'retirementAge', 'partnerRetirementAge',
        'yourLifespan', 'partnerLifespan', 'dependents', 'totalDependentsCount',
        'childrenUnder5', 'childrenPrimary', 'teenagers', 'adultDisabled', 'elderlyIndependent',
        'elderlyHomeCare', 'elderlyResidential', 'otherDependents',
        'sellPropertyYears', 'agedCareStartAge', 'numRuns', 'leanYearsStart'
    ];

    numericFieldIds.forEach(id => {
        const element = $(id);
        if (element) {
            addNumericFormatting(element);
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
// Low Income Tax Offset (LITO) 2025-26 — reduces tax payable for incomes below $66,667
// $700 full offset up to $37,500; phases out 5c/$ to $45k; then 1.5c/$ to $66,667
export const calculateLITO = (income) => {
    if (income <= 37500) return 700;
    if (income <= 45000) return Math.max(0, 700 - (income - 37500) * 0.05);
    if (income <= 66667) return Math.max(0, 325 - (income - 45000) * 0.015);
    return 0;
};

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

    return Math.max(0, tax - calculateLITO(income));
};

// Medicare levy (2025-26 single thresholds — ATO)
// No levy below $27,222; phases in at 10c/$ up to $34,028; full 2% above.
// Private hospital cover does NOT reduce the standard levy (only affects the MLS surcharge).
export const calculateMedicareLevy = (income) => {
    const LOWER = 27222;
    const UPPER = 34028;
    if (income <= LOWER) return 0;
    if (income < UPPER) return (income - LOWER) * 0.1;
    return income * 0.02;
};

// Medicare Levy Surcharge (2025-26 single thresholds — ATO)
// Only applies to individuals WITHOUT private hospital cover earning above $93,000.
// 1% at $93k+, 1.25% at $108k+, 1.5% at $144k+
export const calculateMLS = (income, hasPrivateHealthCover) => {
    if (hasPrivateHealthCover) return 0;
    if (income <= 93000) return 0;
    if (income <= 108000) return income * 0.01;
    if (income <= 144000) return income * 0.0125;
    return income * 0.015;
};

// Third parameter hasPrivateHealthCover defaults to true so existing callers are unaffected.
// Pass the user's actual value in the accumulation loop for correct MLS calculation.
export const calculatePostTaxIncome = (preTaxSalary, taxBrackets, hasPrivateHealthCover = true) => {
    const tax = calculateAustralianTax(preTaxSalary, taxBrackets);
    const medicare = calculateMedicareLevy(preTaxSalary);
    const mls = calculateMLS(preTaxSalary, hasPrivateHealthCover);
    return preTaxSalary - tax - medicare - mls;
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

export const calculateDeemedIncome = (financialAssets, isCouple = false) => {
    const assets = Math.max(0, financialAssets || 0);
    const threshold = isCouple
        ? ENHANCED_CONFIG.DEMING_THRESHOLD_COUPLE
        : ENHANCED_CONFIG.DEMING_THRESHOLD_SINGLE;

    const lowerPortion = Math.min(assets, threshold);
    const upperPortion = Math.max(0, assets - threshold);

    return (lowerPortion * ENHANCED_CONFIG.DEMING_RATE_LOWER) +
        (upperPortion * ENHANCED_CONFIG.DEMING_RATE_UPPER);
};

/**
 * Shared helper: Apply age pension asset and income means tests.
 * Returns the annual pension amount and the name of the limiting test.
 * @param {number} assets - Total assessable assets
 * @param {number} income - Total annual income
 * @param {number} maxPension - Maximum annual pension amount
 * @param {number} assetThreshold - Asset threshold for full pension
 * @param {number} assetLimit - Asset cutoff (pension reduces to zero above this)
 * @param {number} incomeThreshold - Income threshold per fortnight
 * @returns {{ annualPension: number, limitingTest: string }}
 */
const applyAgePensionMeansTest = (assets, income, maxPension, assetThreshold, assetLimit, incomeThreshold) => {
    // Asset test: $3 per fortnight reduction for every $1,000 over the threshold
    let pensionFromAssets = 0;
    if (assets <= assetThreshold) {
        pensionFromAssets = maxPension;
    } else if (assets < assetLimit) {
        const excessAssets = assets - assetThreshold;
        const reduction = (excessAssets / 1000) * 3 * ENHANCED_CONFIG.FORTNIGHTS_IN_YEAR;
        pensionFromAssets = Math.max(0, maxPension - reduction);
    }

    // Income test: 50 cents per dollar above the fortnightly threshold
    let pensionFromIncome = maxPension;
    const fortnightlyIncome = income / ENHANCED_CONFIG.FORTNIGHTS_IN_YEAR;
    if (fortnightlyIncome > incomeThreshold) {
        const excessIncome = fortnightlyIncome - incomeThreshold;
        const reduction = excessIncome * 0.5 * ENHANCED_CONFIG.FORTNIGHTS_IN_YEAR;
        pensionFromIncome = Math.max(0, maxPension - reduction);
    }

    const annualPension = Math.min(pensionFromAssets, pensionFromIncome);
    const limitingTest = pensionFromAssets < pensionFromIncome ? 'Assets Test' : 'Income Test';
    return { annualPension, limitingTest };
};

/**
 * Enhanced Age Pension calculation for couples with non-pensioner partner
 * Handles critical case where one partner is under Age Pension age (67)
 * @param {Object} person1 - First partner details {age, super, investments, salary}
 * @param {Object} person2 - Second partner details {age, super, investments, salary}
 * @param {boolean} homeowner - Whether they own their home
 * @param {Object} config - Configuration with couple thresholds and rates
 * @returns {Object} Detailed pension calculation with strategies
 */
export const calculateAgePensionForCouple = (person1, person2, homeowner, config) => {
    const PENSION_AGE = 67;

    // Check eligibility
    const p1Eligible = person1.age >= PENSION_AGE;
    const p2Eligible = person2.age >= PENSION_AGE;

    // Route to appropriate calculation
    if (!p1Eligible && !p2Eligible) {
        return {
            eligible: false,
            reason: 'Neither partner at Age Pension age (67)',
            yearsUntilEligible: Math.min(PENSION_AGE - person1.age, PENSION_AGE - person2.age)
        };
    }

    if (p1Eligible && p2Eligible) {
        return calculateStandardCouplePension(person1, person2, homeowner, config);
    }

    // One eligible, one not - CRITICAL CASE
    return calculateNonPensionerCouplePension(person1, person2, homeowner, config);
};

/**
 * Calculate Age Pension when both partners are eligible (standard case)
 */
const calculateStandardCouplePension = (person1, person2, homeowner, config) => {
    // Combined income and assets
    const combinedAssets = (person1.super || 0) + (person2.super || 0) +
        (person1.investments || 0) + (person2.investments || 0);
    const combinedFinancialAssets = (person1.financialAssets ?? ((person1.super || 0) + (person1.investments || 0))) +
        (person2.financialAssets ?? ((person2.super || 0) + (person2.investments || 0)));
    const combinedIncome = (person1.salary || 0) + (person2.salary || 0) +
        (person1.otherIncome || 0) + (person2.otherIncome || 0) +
        calculateDeemedIncome(combinedFinancialAssets, true);

    // Use current couple thresholds from config (Sept 2025 rates)
    const assetThreshold = homeowner
        ? ENHANCED_CONFIG.COUPLE_ASSET_THRESHOLD
        : ENHANCED_CONFIG.COUPLE_ASSET_THRESHOLD_NON_HOMEOWNER;
    const assetLimit = homeowner
        ? ENHANCED_CONFIG.COUPLE_ASSET_LIMIT
        : ENHANCED_CONFIG.COUPLE_ASSET_LIMIT_NON_HOMEOWNER;
    const incomeThreshold = ENHANCED_CONFIG.COUPLE_INCOME_THRESHOLD;
    const maxRate = ENHANCED_CONFIG.COUPLE_PENSION_MAX;

    const { annualPension, limitingTest } = applyAgePensionMeansTest(combinedAssets, combinedIncome, maxRate, assetThreshold, assetLimit, incomeThreshold);

    return {
        eligible: true,
        scenario: 'BOTH_ELIGIBLE',
        recipientCount: 2,
        combinedAssessment: {
            income: combinedIncome,
            assets: combinedAssets
        },
        currentPension: {
            annual: Math.round(annualPension),
            fortnight: Math.round(annualPension / ENHANCED_CONFIG.FORTNIGHTS_IN_YEAR)
        },
        limitingTest
    };
};

/**
 * Calculate Age Pension when one partner is under pension age (CRITICAL CASE)
 * Non-pensioner's income and assets MUST be included in combined assessment
 */
const calculateNonPensionerCouplePension = (person1, person2, homeowner, config) => {
    const PENSION_AGE = 67;

    // Identify who is eligible
    const eligible = person1.age >= PENSION_AGE ? person1 : person2;
    const nonEligible = person1.age >= PENSION_AGE ? person2 : person1;

    // CRITICAL: Combine income and assets from BOTH partners
    const combinedAssets = (person1.super || 0) + (person2.super || 0) +
        (person1.investments || 0) + (person2.investments || 0);
    const combinedFinancialAssets = (person1.financialAssets ?? ((person1.super || 0) + (person1.investments || 0))) +
        (person2.financialAssets ?? ((person2.super || 0) + (person2.investments || 0)));
    const combinedIncome = (person1.salary || 0) + (person2.salary || 0) +
        (person1.otherIncome || 0) + (person2.otherIncome || 0) +
        calculateDeemedIncome(combinedFinancialAssets, true);

    // Apply COUPLE thresholds (not single) even though only one receives payment
    // Use current Sept 2025 rates from config
    const assetThreshold = homeowner
        ? ENHANCED_CONFIG.COUPLE_ASSET_THRESHOLD
        : ENHANCED_CONFIG.COUPLE_ASSET_THRESHOLD_NON_HOMEOWNER;
    const assetLimit = homeowner
        ? ENHANCED_CONFIG.COUPLE_ASSET_LIMIT
        : ENHANCED_CONFIG.COUPLE_ASSET_LIMIT_NON_HOMEOWNER;
    const incomeThreshold = ENHANCED_CONFIG.COUPLE_INCOME_THRESHOLD;
    const maxRate = ENHANCED_CONFIG.COUPLE_PENSION_MAX;

    const meansTest = applyAgePensionMeansTest(combinedAssets, combinedIncome, maxRate, assetThreshold, assetLimit, incomeThreshold);

    // Take lower result, but only ONE person receives it (divide by 2)
    const actualPension = meansTest.annualPension / 2; // Only one recipient

    // Project future when both eligible
    const yearsUntil = PENSION_AGE - nonEligible.age;
    const futureProjection = calculateStandardCouplePension(person1, person2, homeowner, config);

    // Generate optimization strategies
    const strategies = generatePartnerStrategies(person1, person2, eligible, nonEligible, combinedAssets);

    return {
        eligible: true,
        scenario: 'ONE_ELIGIBLE',
        recipientCount: 1,
        eligiblePartner: {
            age: eligible.age,
            name: eligible === person1 ? 'Partner 1' : 'Partner 2'
        },
        nonEligiblePartner: {
            age: nonEligible.age,
            name: nonEligible === person1 ? 'Partner 1' : 'Partner 2',
            yearsUntilEligible: yearsUntil,
            salary: nonEligible.salary || 0
        },
        combinedAssessment: {
            income: combinedIncome,
            assets: combinedAssets,
            warning: '⚠️ Non-pensioner partner\'s income and assets included in assessment'
        },
        currentPension: {
            annual: Math.round(actualPension),
            fortnight: Math.round(actualPension / ENHANCED_CONFIG.FORTNIGHTS_IN_YEAR)
        },
        limitingTest: meansTest.limitingTest,
        whenBothEligible: {
            yearsUntil,
            expectedPension: futureProjection.currentPension.annual,
            increase: futureProjection.currentPension.annual - actualPension,
            increasePercent: ((futureProjection.currentPension.annual - actualPension) / actualPension * 100).toFixed(1)
        },
        strategies
    };
};

/**
 * Generate optimization strategies for couple with non-pensioner partner
 */
const generatePartnerStrategies = (person1, person2, eligible, nonEligible, combinedAssets) => {
    const strategies = [];

    // Strategy 1: Super contribution splitting
    const superBalance1 = person1.super || 0;
    const superBalance2 = person2.super || 0;
    const superDifference = Math.abs(superBalance1 - superBalance2);

    if (superDifference > 50000) {
        strategies.push({
            type: 'Super Contribution Splitting',
            priority: 'HIGH',
            description: `Significant super imbalance: $${(superDifference / 1000).toFixed(0)}k difference`,
            action: 'Split contributions to equalize balances before both reach pension age',
            benefit: 'Better Age Pension outcome when both eligible',
            timeframe: 'Immediate'
        });
    }

    // Strategy 2: Younger partner income optimization
    const nonEligibleSalary = nonEligible.salary || 0;
    if (nonEligibleSalary > 50000) {
        const salaryReduction = 10000; // Example
        const pensionIncrease = salaryReduction * 0.5 * 0.923; // 50% taper, 92.3% of year

        strategies.push({
            type: 'Younger Partner Income Optimization',
            priority: 'MEDIUM',
            description: `Partner earning $${(nonEligibleSalary / 1000).toFixed(0)}k impacts Age Pension`,
            action: 'Consider salary sacrificing to super or reducing work hours',
            benefit: `Each $1,000 salary reduction could increase pension by ~$500/year`,
            timeframe: 'Next review'
        });
    }

    // Strategy 3: Retirement timing coordination
    const ageGap = Math.abs(person1.age - person2.age);
    if (ageGap >= 3) {
        strategies.push({
            type: 'Retirement Timing Coordination',
            priority: 'MEDIUM',
            description: `${ageGap}-year age gap affects optimal retirement timing`,
            action: 'Model different retirement scenarios to find optimal timing for both partners',
            benefit: 'Maximize Age Pension while maintaining income',
            timeframe: 'Planning phase'
        });
    }

    // Strategy 4: Asset reallocation
    if (combinedAssets > ENHANCED_CONFIG.COUPLE_ASSET_THRESHOLD && combinedAssets < ENHANCED_CONFIG.COUPLE_ASSET_THRESHOLD + 120000) {
        strategies.push({
            type: 'Asset Reallocation',
            priority: 'LOW',
            description: 'Combined assets near couple threshold',
            action: 'Consider strategies to reduce assessable assets (e.g., home improvements, gifting within limits)',
            benefit: 'Potential to increase Age Pension entitlement',
            timeframe: 'Medium-term',
            warning: 'Must comply with gifting rules (5-year lookback)'
        });
    }

    return strategies;
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

export const exportToXLSX = (inputs, results, chartManager, app = null) => {
    if (!results) {
        showNotification('No results to export. Please run a calculation first.', 'warning');
        return;
    }

    if (typeof XLSX === 'undefined') {
        showNotification('XLSX library not loaded. Please refresh the page and try again.', 'error');
        return;
    }

    const wb = XLSX.utils.book_new();

    // Get additional analysis data from app if available
    const monteCarloResults = app?.currentMonteCarloResults || results.monteCarloResults || null;
    const enhancedAnalysis = extractAnalysisData(inputs, results, app);

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
        ['Results', 'Future Super', formatCurrency(results.accumulatedSuperBalance)],
        ['Results', 'Future Savings', formatCurrency(results.accumulatedSavingsBalance)],
        ['Results', 'Future Investments', formatCurrency(results.accumulatedInvestmentPortfolio)],
        ['Results', 'Accessible Home Equity', formatCurrency(results.accessibleHomeEquity)],
        ['Results', 'Property Equity', formatCurrency(results.propertyEquity)],
        ['Results', 'Total Assets at Retirement', formatCurrency(results.totalFinancialAssets + results.accessibleHomeEquity)],
        ['Results', 'Final Balance at end of Lifespan', formatCurrency(results.finalBalance)],

        ['--- MONTE CARLO RESULTS ---', '---', '---']
    );

    if (monteCarloResults) {
        summaryData.push(
            ['Monte Carlo', 'Number of Simulations', monteCarloResults.runs || '1,000'],
            ['Monte Carlo', 'Success Rate', formatPercent(monteCarloResults.successRate)],
            ['Monte Carlo', 'Median Final Balance', formatCurrency(monteCarloResults.median)],
            ['Monte Carlo', '10th Percentile (Worst Case)', formatCurrency(monteCarloResults.percentile10 || 0)],
            ['Monte Carlo', '90th Percentile (Best Case)', formatCurrency(monteCarloResults.percentile90 || 0)],
            ['Monte Carlo', 'Probability of Running Out', formatPercent(1 - monteCarloResults.successRate)]
        );
    } else {
        summaryData.push(['Monte Carlo', 'Status', 'Analysis not run - use Monte Carlo button in app']);
    }

    summaryData.push(
        ['--- RISK ANALYSIS ---', '---', '---'],
        ['Risk', 'Emergency Fund Available', inputs.hasEmergencyFund ? 'Yes' : 'No'],
        ['Risk', 'High-Interest Debt', inputs.hasDebt ? 'Yes - Higher Risk' : 'No'],
        ['Risk', 'Financial Dependents', inputs.dependents || 0],
        ['Risk', 'Property Concentration', inputs.hasInvestmentProperty ? 'High - Significant Property Exposure' : 'Low - Diversified Portfolio'],
        ['Risk', 'Sequence of Returns Risk', results.finalBalance > 0 ? 'Moderate' : 'High - Early losses could deplete portfolio']
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
            'Non-Liquid Assets 🏘️': d.nonLiquidAssets || 0,
            'Growth': d.growth,
            'Yearly Withdrawal': d.withdrawal,
            'Property Income': d.propertyIncome || 0,
            'Healthcare': d.healthcareCost,
            'Aged Care': d.agedCareCost,
            'Pension Income': d.pensionIncome || 0,
            'End Balance': d.endBalance || 0,
            'Total Net Worth': (d.endBalance || 0) + (d.nonLiquidAssets || 0),
        };
    });
    const ws_projection = XLSX.utils.json_to_sheet(projectionDataForSheet);

    // Format currency columns
    const currencyColumns = ['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
    currencyColumns.forEach(col => {
        for (let i = 1; i <= results.yearlyData.length; i++) {
            const cellRef = `${col}${i + 1}`;
            if (ws_projection[cellRef]) {
                ws_projection[cellRef].z = '$#,##0.00';
            }
        }
    });
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

    // --- Enhanced Analysis Sheets ---
    addEnhancedAnalysisToXLSX(wb, enhancedAnalysis);

    // --- Write file ---
    try {
        const filename = `Australian-Retirement-Analysis-${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, filename);
        showNotification('Comprehensive XLSX analysis generated successfully', 'success');
    } catch (error) {
        console.error('Error generating XLSX file:', error);
        showNotification('Failed to generate XLSX report. Please try again.', 'error');
    }
};

export const exportToPDF = (inputs, results, chartManager, app = null) => {
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

    // Get additional analysis data from app if available
    const monteCarloResults = app?.currentMonteCarloResults || results.monteCarloResults || null;
    const enhancedAnalysis = extractAnalysisData(inputs, results, app);

    // --- Title Page ---
    doc.setFontSize(24);
    doc.setTextColor(0, 71, 171);
    doc.text("Australian Retirement Strategy", 14, 30);
    doc.text("Comprehensive Analysis Report", 14, 42);

    // Date and disclaimer
    doc.setFontSize(12);
    doc.setTextColor(100);
    doc.text(`Generated: ${new Date().toLocaleDateString('en-AU')}`, 14, 58);
    doc.text("This report is for informational purposes only and does not constitute financial advice.", 14, 65);
    doc.text("Please consult with a licensed financial adviser before making investment decisions.", 14, 72);

    // --- Table of Contents ---
    doc.addPage();
    doc.setFontSize(18);
    doc.setTextColor(0, 71, 171);
    doc.text("Table of Contents", 14, 20);

    const tocItems = [
        ['1', 'Executive Summary', '3'],
    ];
    if (monteCarloResults) tocItems.push(['2', 'Monte Carlo Simulation Results', '4']);
    tocItems.push(['', 'AI-Generated Recommendations', '']);
    tocItems.push(['', 'Risk Analysis', '']);
    tocItems.push(['', 'Key Assumptions', '']);
    tocItems.push(['', 'Enhanced Financial Summary', '']);
    tocItems.push(['', 'Comprehensive Risk Analysis', '']);
    if (enhancedAnalysis.propertyAnalysis) tocItems.push(['', 'Investment Property Analysis', '']);
    tocItems.push(['', 'Optimization Strategies', '']);
    if (enhancedAnalysis.aiRecommendations?.length > 0) tocItems.push(['', 'AI-Generated Recommendations (Enhanced)', '']);
    if (enhancedAnalysis.scenarioComparisons?.length > 0) tocItems.push(['', 'Scenario Comparisons', '']);
    if (enhancedAnalysis.suggestions?.length > 0) tocItems.push(['', 'Personalized Suggestions', '']);
    if (enhancedAnalysis.scenarioMatrix) tocItems.push(['', 'Scenario Comparison Matrix', '']);
    if (enhancedAnalysis.personaRecommendations) tocItems.push(['', 'AI Persona-Based Recommendations', '']);
    tocItems.push(['', 'Visual Analysis (Charts)', '']);
    tocItems.push(['', 'Detailed Financial Projections', '']);

    doc.autoTable({
        startY: 28,
        head: [['#', 'Section', 'Page']],
        body: tocItems,
        theme: 'plain',
        headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: {
            0: { cellWidth: 10 },
            2: { cellWidth: 15, halign: 'right' }
        }
    });

    // --- Executive Summary ---
    doc.setFontSize(18);
    doc.setTextColor(0);
    doc.text("Executive Summary", 14, 90);

    const summaryBody = [
        ['Your Current Age', `${inputs.yourCurrentAge} years`],
        ['Partner\'s Current Age', `${inputs.partnerCurrentAge} years`],
        ['Retirement Age', `${inputs.retirementAge} years`],
        ['Total Financial Assets at Retirement', formatCurrency(results.totalFinancialAssets)],
        ['Accessible Home Equity', formatCurrency(results.accessibleHomeEquity || 0)],
        ['Projected Final Balance (Deterministic)', formatCurrency(results.finalBalance)],
        ['Monte Carlo Success Rate', monteCarloResults?.successRate ? formatPercent(monteCarloResults.successRate) : 'Analysis not run'],
        ['Monte Carlo Median Balance', monteCarloResults?.median ? formatCurrency(monteCarloResults.median) : 'N/A']
    ];

    doc.autoTable({
        startY: 95,
        head: [['Key Metric', 'Value']],
        body: summaryBody,
        theme: 'striped',
        headStyles: { fillColor: [0, 71, 171], textColor: [255, 255, 255] },
        styles: { fontSize: 10 }
    });

    // Get the final Y position after the first table
    let yPos = doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : 180;

    // --- Monte Carlo Analysis Section ---
    if (monteCarloResults) {
        if (yPos > 200) {
            doc.addPage();
            yPos = 20;
        }

        doc.setFontSize(16);
        doc.setTextColor(0, 71, 171);
        doc.text("Monte Carlo Simulation Results", 14, yPos);
        yPos += 10;

        doc.setFontSize(10);
        doc.setTextColor(0);
        doc.text(`Based on ${monteCarloResults.runs || '1,000'} simulations accounting for market volatility`, 14, yPos);
        yPos += 10;

        const mcBody = [
            ['Success Rate', `${(monteCarloResults.successRate * 100).toFixed(1)}%`],
            ['Median Final Balance', formatCurrency(monteCarloResults.median)],
            ['10th Percentile (Worst Case)', formatCurrency(monteCarloResults.percentile10 || 0)],
            ['90th Percentile (Best Case)', formatCurrency(monteCarloResults.percentile90 || 0)],
            ['Probability of Running Out', `${((1 - monteCarloResults.successRate) * 100).toFixed(1)}%`]
        ];

        doc.autoTable({
            startY: yPos,
            head: [['Monte Carlo Metric', 'Result']],
            body: mcBody,
            theme: 'grid',
            headStyles: { fillColor: [0, 71, 171] },
            styles: { fontSize: 9 }
        });

        yPos = doc.lastAutoTable.finalY + 15;
    }

    // AI Recommendations Section
    if (enhancedAnalysis.aiRecommendations && enhancedAnalysis.aiRecommendations.length > 0) {
        if (yPos > 160) {
            doc.addPage();
            yPos = 20;
        }

        doc.setFontSize(16);
        doc.setTextColor(0, 71, 171);
        doc.text("AI-Generated Recommendations", 14, yPos);
        yPos += 10;

        const aiBody = enhancedAnalysis.aiRecommendations.slice(0, 10).map(rec => [
            rec.category || 'General',
            rec.action || rec.recommendation || rec.title,
            rec.priority || 'Medium',
            rec.timing || 'As needed'
        ]);

        doc.autoTable({
            startY: yPos,
            head: [['Category', 'Recommendation', 'Priority', 'Timing']],
            body: aiBody,
            theme: 'striped',
            headStyles: { fillColor: [111, 66, 193] },
            styles: { fontSize: 8 }
        });

        yPos = doc.lastAutoTable.finalY + 15;
    }

    // --- Risk Analysis Section ---
    if (yPos > 180) {
        doc.addPage();
        yPos = 20;
    }

    doc.setFontSize(16);
    doc.setTextColor(0, 71, 171);
    doc.text("Risk Analysis", 14, yPos);
    yPos += 10;

    const riskBody = [
        ['Risk Tolerance (1-10)', inputs.riskTolerance || 'Not specified'],
        ['Emergency Fund Available', inputs.hasEmergencyFund ? 'Yes' : 'No'],
        ['High-Interest Debt', inputs.hasDebt ? 'Yes - Higher risk' : 'No'],
        ['Financial Dependents', inputs.dependents || 0],
        ['Property Concentration Risk', inputs.hasInvestmentProperty ? 'High - Significant property exposure' : 'Low - Diversified portfolio'],
        ['Sequence of Returns Risk', results.finalBalance > 0 ? 'Moderate' : 'High - Early losses could deplete portfolio']
    ];

    doc.autoTable({
        startY: yPos,
        head: [['Risk Factor', 'Assessment']],
        body: riskBody,
        theme: 'striped',
        headStyles: { fillColor: [220, 53, 69], textColor: [255, 255, 255] },
        styles: { fontSize: 9 }
    });

    yPos = doc.lastAutoTable.finalY + 15;

    // --- Key Assumptions ---
    if (yPos > 200) {
        doc.addPage();
        yPos = 20;
    }

    doc.setFontSize(16);
    doc.setTextColor(0, 71, 171);
    doc.text("Key Assumptions", 14, yPos);
    yPos += 10;

    const assumptionsBody = [
        ['Inflation Rate', formatPercent(inputs.inflation, 2)],
        ['Investment Return', formatPercent(inputs.investmentReturn, 2)],
        ['Super Return', formatPercent(inputs.superReturn, 2)],
        ['Property Growth Rate', formatPercent(inputs.propertyGrowthRate, 2)],
        ['Healthcare Inflation', formatPercent(inputs.healthcareInflation, 2)],
        ['Salary Growth Rate', formatPercent(inputs.salaryGrowthRate, 2)],
        ['Australian Equity Allocation', formatPercent(inputs.australianEquityAllocation, 2)],
        ['Return Volatility', formatPercent(inputs.returnVolatility, 2)]
    ];

    doc.autoTable({
        startY: yPos,
        head: [['Assumption', 'Rate']],
        body: assumptionsBody,
        theme: 'grid',
        headStyles: { fillColor: [108, 117, 125] },
        styles: { fontSize: 9 }
    });

    yPos = doc.lastAutoTable.finalY + 15;

    // --- Enhanced Analysis Sections ---
    addEnhancedAnalysisToPDF(doc, enhancedAnalysis, yPos);

    // --- Charts Section ---
    doc.addPage();
    yPos = 20;

    doc.setFontSize(18);
    doc.setTextColor(0, 71, 171);
    doc.text("Visual Analysis", 14, yPos);
    yPos += 15;

    const addChartToPDF = (chartId, title) => {
        const chart = chartManager.charts[chartId];
        if (chart) {
            if (yPos > 170) {
                doc.addPage();
                yPos = 20;
            }
            doc.setFontSize(14);
            doc.setTextColor(0);
            doc.text(title, 14, yPos);
            yPos += 8;
            try {
                const imgData = chart.toBase64Image('image/jpeg', 0.8);
                doc.addImage(imgData, 'JPEG', 14, yPos, 180, 90);
                yPos += 100;
            } catch (error) {
                console.warn(`Could not export chart ${chartId}:`, error);
                doc.setFontSize(10);
                doc.setTextColor(150);
                doc.text(`Chart not available for export: ${title}`, 14, yPos + 20);
                yPos += 40;
            }
        }
    };

    // Add available charts
    addChartToPDF('fanChart', 'Portfolio Balance Projection (Fan Chart)');
    addChartToPDF('histChart', 'Final Balance Distribution (Histogram)');

    // The code references inputs.useGlidePath but this property is not visible in the summary data structure.
    // Verify that this property exists in the 'inputs' object or handle the case where it might be undefined.
    // If inputs.useGlidePath is undefined or null, this will safely default to false. This ensures the chart is only added if useGlidePath is truthy.
    if (inputs.useGlidePath ?? false) {
        addChartToPDF('allocationChart', 'Asset Allocation Over Time');
    }
    if (inputs.hasInvestmentProperty) {
        addChartToPDF('propertyChart', 'Property vs. Portfolio Comparison');
    }

    // Add Monte Carlo fan chart if available
    if (monteCarloResults) {
        addChartToPDF('mcFanChart', 'Monte Carlo Projection Paths');
    }

    // --- Detailed Projections ---
    doc.addPage();
    doc.setFontSize(18);
    doc.setTextColor(0, 71, 171);
    doc.text("Detailed Financial Projections", 14, 20);

    doc.setFontSize(12);
    doc.setTextColor(0);
    const projYears = results.yearlyData.length;
    doc.text(`Year-by-Year Analysis (All ${projYears} Years)`, 14, 32);

    const head = [['Year', 'Age', 'Start Balance', 'Non-Liquid Assets', 'Growth', 'Yearly Withdrawal', 'Property Income', 'Healthcare', 'Aged Care', 'Pension Income', 'End Balance', 'Total Net Worth']];
    const body = results.yearlyData.map(d => {
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
            formatCurrency(d.nonLiquidAssets || 0),
            formatCurrency(d.growth),
            formatCurrency(d.withdrawal),
            formatCurrency(d.propertyIncome || 0),
            formatCurrency(d.healthcareCost),
            formatCurrency(d.agedCareCost),
            formatCurrency(d.pensionIncome || 0),
            formatCurrency(d.endBalance),
            formatCurrency((d.endBalance || 0) + (d.nonLiquidAssets || 0))
        ];
    });

    doc.autoTable({
        head: head,
        body: body,
        startY: 40,
        theme: 'grid',
        headStyles: {
            fillColor: [0, 71, 171],
            textColor: [255, 255, 255],
            fontSize: 6,
            fontStyle: 'bold'
        },
        styles: {
            fontSize: 6,
            cellPadding: 1,
            halign: 'center'
        },
        columnStyles: {
            0: { halign: 'center', fillColor: [245, 245, 245] }, // Year - neutral
            1: { halign: 'center', fillColor: [245, 245, 245] }, // Age - neutral
            2: { halign: 'right', fillColor: [224, 242, 254] }, // Start Balance - light blue
            3: { halign: 'right', fillColor: [191, 219, 254] }, // Non-Liquid Assets - blue
            4: { halign: 'right', fillColor: [220, 252, 231] }, // Growth - light green
            5: { halign: 'right', fillColor: [254, 226, 226] }, // Yearly Withdrawal - light red
            6: { halign: 'right', fillColor: [187, 247, 208] }, // Property Income - green
            7: { halign: 'right', fillColor: [252, 165, 165] }, // Healthcare - red
            8: { halign: 'right', fillColor: [248, 113, 113] }, // Aged Care - darker red
            9: { halign: 'right', fillColor: [134, 239, 172] }, // Pension Income - darker green
            10: { halign: 'right', fillColor: [147, 197, 253] }, // End Balance - darker blue
            11: { halign: 'right', fillColor: [96, 165, 250], fontStyle: 'bold' } // Total Net Worth - bold blue
        }
    });

    // --- Footer Section ---
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text(`Page ${i} of ${pageCount}`, 14, 285);
        doc.text('Australian Retirement Calculator - Comprehensive Analysis', 105, 285, { align: 'center' });
        doc.text(new Date().toLocaleDateString('en-AU'), 180, 285);
    }

    // --- Save PDF ---
    try {
        const filename = `Australian-Retirement-Analysis-${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(filename);
        showNotification('Comprehensive PDF report generated successfully', 'success');
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

// User Data Export/Import Functionality
export const exportUserData = (inputs, scenarioName = 'My Retirement Plan') => {
    // Create a deep copy to avoid modifying the original inputs object
    const formattedInputs = JSON.parse(JSON.stringify(inputs));

    const currencyFields = [
        'yourSalary', 'partnerSalary', 'yourCurrentSuper', 'partnerCurrentSuper',
        'currentSavings', 'currentStocks', 'monthlyStockContribution', 'currentMonthlyHousingCosts',
        'currentMonthlyLivingCosts', 'homeValue',
        'mortgageBalance', 'monthlyMortgagePayment', 'investmentPropertyValue',
        'investmentPropertyLoan', 'investmentPropertyPurchasePrice', 'weeklyRentalIncome', 'annualPropertyExpenses',
        'trustNetAssets', 'trustAnnualDistributions', 'currentHealthcareCosts',
        'agedCareAnnualCost', 'asfaComfortable', 'agePensionMax',
        'pensionAssetThreshold', 'pensionAssetLimit', 'pensionIncomeThreshold',
        'smsfAdminCosts', 'landTax', 'familyTrustIncomeDistribution',
        'educationCostPerChild', 'concessionalCapUsed', 'spouseContribution',
        'carerAnnualExpense', 'creditCardBalance', 'personalLoanBalance',
        'carLoanBalance', 'hecsBalance', 'annualTravelBudget', 'annualHobbyBudget',
        'legacyGoal', 'reducedIncomeSalary', 'partnerReducedIncomeSalary'
    ];

    const percentageFields = [
        'percentIncomeSaved', 'mortgageRate', 'investmentPropertyRate',
        'propertyGrowthRate', 'capitalGainsTaxRate', 'healthcareInflation',
        'agedCareProbability', 'inflation', 'investmentReturn', 'returnDeclineRate',
        'savingsReturn', 'superReturn', 'salaryGrowthRate', 'leanYearsReduction',
        'dividendYield', 'frankingRate', 'returnVolatility',
        'shockProbability', 'shockMagnitude', 'australianEquityAllocation', 'allocEquities', 'allocBonds', 'allocCash', 'trustAttributionPercentage',
        'vacancyRate', 'maintenanceInflation', 'trustTaxRate', 'beneficiaryAllocation',
        'extremeInflationProbability', 'propertyCrashProbability',
        'creditCardRate', 'personalLoanRate', 'carerReducedWorkPercent', 'carLoanRate',
        'employerSuperContributionRate'
    ];

    // Format currency and percentage fields
    for (const key in formattedInputs) {
        if (formattedInputs.hasOwnProperty(key)) {
            const value = parseFloat(formattedInputs[key]);
            if (!isNaN(value)) {
                if (currencyFields.includes(key)) {
                    formattedInputs[key] = parseFloat(value.toFixed(2));
                } else if (percentageFields.includes(key)) {
                    // Percentage values are already in decimal form (e.g., 0.09 for 9%)
                    // Just format to appropriate precision
                    formattedInputs[key] = parseFloat(value.toFixed(6));
                }
            }
        }
    }

    const exportData = {
        version: '4.0',
        exportDate: new Date().toISOString(),
        scenarioName: scenarioName,
        userData: formattedInputs,
        metadata: {
            calculatorVersion: '2026.1',
            description: 'Australian Retirement Calculator - User Input Data',
            fields: Object.keys(inputs).length,
            note: 'This file contains only your input data, no calculation results. Your privacy is protected.'
        }
    };

    const timestamp = new Date().toISOString().slice(0, 16).replace(/[:.]/g, '-');
    const filename = `retirement-inputs-${timestamp}.json`;

    const jsonContent = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    showNotification('Your retirement data has been exported successfully!', 'success');
    return filename;
};

export const importUserData = () => {
    return new Promise((resolve, reject) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) {
                // User cancelled the file dialog
                resolve(null);
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);

                    // Validate file structure
                    if (!data.userData || !data.version) {
                        reject('Invalid retirement calculator data file format');
                        return;
                    }

                    // Show confirmation dialog to the user
                    const scenarioName = data.scenarioName || 'your saved data';
                    const confirmationMessage = `You are about to load the scenario: "${scenarioName}".\n\nThis will overwrite any unsaved changes in the calculator.\n\nDo you want to proceed?`;

                    if (window.confirm(confirmationMessage)) {
                        // User confirmed, proceed with loading
                        const supportedVersions = ['1.0', '2.0', '3.0', '4.0'];
                        if (!supportedVersions.includes(data.version)) {
                            showNotification('File version may not be fully compatible. Import will be attempted.', 'warning');
                        } else if (data.version !== '4.0') {
                            showNotification('Imported older file format - some features may need adjustment.', 'info');
                        }

                        resolve({
                            userData: data.userData,
                            scenarioName: data.scenarioName,
                            exportDate: data.exportDate,
                            metadata: data.metadata,
                            version: data.version
                        });
                    } else {
                        // User cancelled
                        showNotification('Data import cancelled.', 'info');
                        resolve(null); // Resolve with null to indicate cancellation
                    }

                } catch (err) {
                    reject('Invalid JSON file format. Please check your file.');
                }
            };

            reader.onerror = () => {
                reject('Error reading file. Please try again.');
            };

            reader.readAsText(file);
        };

        input.click();
    });
};

export const populateFormFromData = (userData, version = '2.0') => {
    let fieldsPopulated = 0;
    let fieldsSkipped = 0;
    const skippedFields = [];

    const percentageFields = [
        'percentIncomeSaved', 'mortgageRate', 'investmentPropertyRate',
        'propertyGrowthRate', 'capitalGainsTaxRate', 'healthcareInflation',
        'agedCareProbability', 'inflation', 'investmentReturn', 'returnDeclineRate',
        'savingsReturn', 'superReturn', 'salaryGrowthRate', 'leanYearsReduction',
        'dividendYield', 'frankingRate', 'returnVolatility',
        'shockProbability', 'shockMagnitude', 'australianEquityAllocation', 'allocEquities', 'allocBonds', 'allocCash', 'trustAttributionPercentage',
        'carerReducedWorkPercent', 'vacancyRate', 'maintenanceInflation',
        'trustTaxRate', 'beneficiaryAllocation', 'extremeInflationProbability', 'propertyCrashProbability',
        'creditCardRate', 'personalLoanRate', 'carLoanRate', 'employerSuperContributionRate'
    ];

    const dependentPercentageFields = [
        'childrenUnder5Percent', 'childrenPrimaryPercent', 'teenagersPercent', 'adultDisabledPercent',
        'elderlyIndependentPercent', 'elderlyHomeCarePercent', 'elderlyResidentialPercent', 'otherDependentsPercent'
    ];

    debugLog('Populating form with userData:', userData);

    // Manually trigger dependent section visibility BEFORE populating other fields
    if (userData.dependents && userData.dependents > 0) {
        const totalDependentsEl = $('totalDependentsCount');
        if (totalDependentsEl) {
            totalDependentsEl.value = userData.dependents;
            // Trigger the input event to make the details section visible
            totalDependentsEl.dispatchEvent(new Event('input', { bubbles: true }));
            debugLog('✓ Triggered visibility for dependent details section.');
        }
    }

    Object.entries(userData).forEach(([key, value]) => {
        try {
            // Handle different input types appropriately
            if (key === 'dependentDetails' && typeof value === 'object') {
                // Handle nested dependent details object
                Object.entries(value).forEach(([detailKey, detailValue]) => {
                    const element = $(detailKey);
                    if (element) {
                        if (dependentPercentageFields.includes(detailKey) && typeof detailValue === 'number') {
                            // Versions 3.0+ store as decimals (e.g., 0.70 for 70%); older versions as whole numbers
                            const storedAsDecimal = (version === '3.0' || version === '4.0') && Math.abs(detailValue) < 2.0;
                            if (storedAsDecimal) {
                                element.value = (detailValue * 100).toFixed(2);
                            } else {
                                element.value = detailValue;
                            }
                        } else {
                            element.value = detailValue;
                        }
                        fieldsPopulated++;
                        debugLog(`✓ Populated dependent detail: ${detailKey} = ${element.value}`);
                    } else {
                        skippedFields.push(detailKey);
                        debugLog(`✗ Element not found: ${detailKey}`);
                    }
                });
            } else {
                // Handle field mapping for legacy/alternative field names
                let targetKey = key;

                // Map returnRate to specific investment return fields
                if (key === 'returnRate') {
                    // Set all investment-related return fields to the same value for consistency
                    const returnFields = ['investmentReturn', 'superReturn'];
                    returnFields.forEach(fieldName => {
                        const fieldElement = $(fieldName);
                        if (fieldElement) {
                            fieldElement.value = value;
                            fieldsPopulated++;
                            debugLog(`✓ Mapped returnRate to ${fieldName}: ${value}%`);
                        }
                    });
                    // Don't process the original returnRate key further
                    return;
                }

                const element = $(targetKey);
                if (element) {
                    debugLog(`✅ Found element for: ${targetKey}`);  // Debug: found element
                    if (element.type === 'checkbox' || element.type === 'radio') {
                        element.checked = value === true || value === 'true' || value === 'yes';
                    } else if (element.type === 'select-one') {
                        element.value = value;
                        // Fallback: numeric float comparison for selects with decimal option values
                        // (e.g. stored 0.2 won't match option value "0.20")
                        if (typeof value === 'number' && value !== 0 &&
                                !Array.from(element.options).some(o => o.selected && o.value !== '')) {
                            const numVal = parseFloat(value);
                            if (!isNaN(numVal)) {
                                const match = Array.from(element.options).find(o =>
                                    Math.abs(parseFloat(o.value) - numVal) < 1e-9
                                );
                                if (match) element.value = match.value;
                            }
                        }
                    } else {
                        if (percentageFields.includes(key) && typeof value === 'number') {
                            // Versions 3.0+ store percentages as decimals (e.g., 0.09 for 9%)
                            // Versions 1.0/2.0 stored as whole numbers (e.g., 9 for 9%)
                            const storedAsDecimal = version === '3.0' || version === '4.0';
                            if (storedAsDecimal) {
                                // Use toPrecision-safe multiplication to avoid floating-point artifacts
                                element.value = parseFloat((value * 100).toFixed(10)).toFixed(2);
                            } else {
                                element.value = value;
                            }
                        } else if (key === 'investmentPropertyPurchaseYear') {
                            // Treat null/0 as "not entered" so the placeholder shows
                            // rather than a literal "0" — older files may store 0 for empty.
                            element.value = (value == null || value === 0) ? '' : value;
                        } else {
                            // For numeric currency values, keep full precision — the input formatter applies 2dp
                            element.value = value == null ? '' : value;
                        }
                    }
                    fieldsPopulated++;
                    debugLog(`✓ Populated field: ${key} = ${value}`);
                } else {
                    fieldsSkipped++;
                    skippedFields.push(key);
                    debugLog(`❌ Element NOT found for: ${key} (looking for DOM element with id='${targetKey}')`);
                }
            }
        } catch (error) {
            fieldsSkipped++;
            skippedFields.push(key);
            console.warn(`Could not populate field ${key}:`, error);
        }
    });

    if (skippedFields.length > 0) {
        debugLog('Skipped fields:', skippedFields);
    }

    // Debug logging to see what's happening
    debugLog('📊 Import Summary:', {
        fieldsPopulated,
        fieldsSkipped,
        skippedFields: skippedFields.slice(0, 10), // Show first 10 skipped fields
        totalFields: Object.keys(userData).length
    });

    showNotification(
        `Import complete: ${fieldsPopulated} fields updated${fieldsSkipped > 0 ? `, ${fieldsSkipped} fields skipped` : ''}`,
        fieldsSkipped > 0 ? 'warning' : 'success'
    );

    return { fieldsPopulated, fieldsSkipped, skippedFields };
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

export const showActionableNotification = (message, actions) => {
    // Remove any existing actionable notification to prevent overlap
    const existingNotification = document.querySelector('.actionable-notification');
    if (existingNotification) {
        existingNotification.remove();
    }

    const notification = document.createElement('div');
    notification.className = 'actionable-notification';
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        padding: 1rem 1.5rem;
        border-radius: 0.5rem;
        background-color: #2d3748;
        color: white;
        z-index: 2000;
        display: flex;
        align-items: center;
        gap: 1.5rem;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.2);
        font-family: 'Inter', sans-serif;
        font-size: 0.9rem;
    `;

    const messageSpan = document.createElement('span');
    messageSpan.textContent = message;
    notification.appendChild(messageSpan);

    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.gap = '0.75rem';

    actions.forEach(action => {
        const button = document.createElement('button');
        button.textContent = action.text;
        button.className = `notification-button ${action.class || ''}`;
        button.style.cssText = `
            padding: 0.5rem 1rem;
            border: none;
            border-radius: 0.375rem;
            cursor: pointer;
            font-weight: 500;
            transition: background-color 0.2s;
        `;

        if (action.class === 'primary') {
            button.style.backgroundColor = '#3b82f6';
            button.style.color = 'white';
        } else {
            button.style.backgroundColor = '#4a5568';
            button.style.color = 'white';
        }

        button.onmouseover = () => {
            button.style.backgroundColor = action.class === 'primary' ? '#2563eb' : '#2d3748';
        };
        button.onmouseout = () => {
            button.style.backgroundColor = action.class === 'primary' ? '#3b82f6' : '#4a5568';
        };

        button.onclick = () => {
            if (typeof action.callback === 'function') {
                action.callback();
            }
            notification.remove();
        };
        buttonContainer.appendChild(button);
    });

    notification.appendChild(buttonContainer);
    document.body.appendChild(notification);
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

export const calculateStateLandTax = (propertyValue, stateCode, config) => {
    if (!stateCode || !config || !config.LAND_TAX_RATES) return 0;
    const brackets = config.LAND_TAX_RATES[stateCode.toUpperCase()];
    if (!brackets) return 0;
    for (let i = brackets.length - 1; i >= 0; i--) {
        if (propertyValue > brackets[i].min) {
            return brackets[i].flat + (propertyValue - brackets[i].min) * brackets[i].marginal;
        }
    }
    return 0;
};

export default {
    $,
    getRawValue,
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
    addNumericFormatting,
    initializeNumericInputs,
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
    calculateLITO,
    calculateAustralianTax,
    calculateMedicareLevy,
    calculateMLS,
    calculateStateLandTax,
    calculatePostTaxIncome,
    calculatePropertyCashFlow,
    calculatePropertyTotalReturn,
    calculateCGT,
    calculateAgePension,
    calculateDeemedIncome,
    exportToCSV,
    exportToXLSX,
    exportToPDF,
    exportUserData,
    importUserData,
    populateFormFromData,
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
    addTooltipBottomStyles,
    extractAnalysisData
};

// Helper function to extract all analysis data for exports
function extractAnalysisData(inputs, results, app) {
    const analysis = {
        enhancedSummary: null,
        riskAnalysis: null,
        propertyAnalysis: null,
        optimizationStrategies: null,
        aiRecommendations: null,
        comprehensiveRecommendations: null,
        scenarioComparisons: null,
        suggestions: null,
        scenarioMatrix: null,
        personaRecommendations: null,
        actionPlan: null,
        outcomeActions: null
    };

    try {
        // Enhanced Summary
        analysis.enhancedSummary = {
            financialReadiness: getFinancialReadiness(inputs, results),
            keyMetrics: getKeyMetrics(inputs, results),
            projectedOutcome: getProjectedOutcome(results)
        };

        // Risk Analysis
        analysis.riskAnalysis = getRiskAnalysisData(inputs, results);

        // Property Analysis (if applicable)
        if (inputs.hasInvestmentProperty) {
            analysis.propertyAnalysis = getPropertyAnalysisData(inputs, results);
        }

        // Optimization Strategies
        analysis.optimizationStrategies = getOptimizationData(inputs, results, app);

        // AI Recommendations (if available)
        if (app?.currentRecommendations) {
            analysis.aiRecommendations = app.currentRecommendations;
        }

        // Scenario Comparisons (if available)
        if (app?.currentScenarioComparisons) {
            analysis.scenarioComparisons = app.currentScenarioComparisons;
        }

        // User-generated Suggestions (if available)
        if (app?.currentSuggestions && app.currentSuggestions.length > 0) {
            analysis.suggestions = app.currentSuggestions;
        }

        // Scenario Matrix Analysis (if available)
        if (app?.currentScenarioMatrix) {
            analysis.scenarioMatrix = app.currentScenarioMatrix;
        }

        // Persona-based AI Recommendations (if available)
        if (app?.currentPersonaRecommendations) {
            analysis.personaRecommendations = app.currentPersonaRecommendations;
        }

        // Full comprehensive recommendations list (all categories, not just top 5)
        if (app?.currentComprehensiveRecommendations?.length > 0) {
            analysis.comprehensiveRecommendations = app.currentComprehensiveRecommendations;
        }

        // Action plan from persona recommendations
        if (app?.currentActionPlan) {
            const plan = app.currentActionPlan;
            if ((plan.immediate?.length > 0) || (plan.next30Days?.length > 0)) {
                analysis.actionPlan = plan;
            }
        }

        // Outcome tab action items
        if (app?.currentOutcomeActions?.length > 0) {
            analysis.outcomeActions = app.currentOutcomeActions;
        }

    } catch (error) {
        console.warn('Error extracting analysis data for export:', error);
    }

    return analysis;
}

// Helper functions for analysis data extraction
function getFinancialReadiness(inputs, results) {
    const totalAssets = results.totalFinancialAssets + (results.accessibleHomeEquity || 0);
    const targetAmount = (inputs.yourSalary + inputs.partnerSalary) * 25; // 25x rule of thumb

    return {
        readinessScore: Math.min(100, (totalAssets / targetAmount) * 100),
        totalAssets,
        targetAmount,
        gap: Math.max(0, targetAmount - totalAssets)
    };
}

function getKeyMetrics(inputs, results) {
    return {
        savingsRate: inputs.percentIncomeSaved,
        yearsToRetirement: inputs.retirementAge - inputs.yourCurrentAge,
        projectedBalance: results.finalBalance,
        successProbability: results.monteCarloResults?.successRate ? results.monteCarloResults.successRate * 100 : null
    };
}

function getProjectedOutcome(results) {
    const finalBalance = results.finalBalance;
    let outcome = 'Unknown';

    if (finalBalance > 500000) outcome = 'Excellent';
    else if (finalBalance > 200000) outcome = 'Good';
    else if (finalBalance > 0) outcome = 'Adequate';
    else outcome = 'Needs Improvement';

    return {
        outcome,
        finalBalance,
        yearsOfFunding: finalBalance > 0 ? Math.floor(finalBalance / 50000) : 0
    };
}

function getRiskAnalysisData(inputs, results) {
    return {
        riskTolerance: inputs.riskTolerance || 5,
        emergencyFund: inputs.hasEmergencyFund,
        highInterestDebt: inputs.hasDebt,
        dependents: inputs.dependents || 0,
        propertyConcentration: inputs.hasInvestmentProperty,
        sequenceRisk: results.finalBalance <= 0 ? 'High' : 'Moderate'
    };
}

function getPropertyAnalysisData(inputs, results) {
    if (!inputs.hasInvestmentProperty) return null;

    return {
        currentValue: inputs.investmentPropertyValue,
        outstandingLoan: inputs.investmentPropertyLoan,
        equity: inputs.investmentPropertyValue - inputs.investmentPropertyLoan,
        weeklyRent: inputs.weeklyRentalIncome,
        annualReturn: (inputs.weeklyRentalIncome * 52) / inputs.investmentPropertyValue * 100,
        sellStrategy: inputs.sellPropertyYears ? `Sell in ${inputs.sellPropertyYears} years` : 'Hold indefinitely'
    };
}

function getOptimizationData(inputs, results, app) {
    const strategies = [];

    // Cash flow optimization
    const monthlyIncome = (inputs.yourSalary + inputs.partnerSalary) / 12;
    const monthlyExpenses = monthlyIncome * (1 - inputs.percentIncomeSaved);

    if (inputs.percentIncomeSaved < 0.15) {
        strategies.push({
            category: 'Savings Rate',
            recommendation: 'Increase savings rate to at least 15%',
            impact: 'High',
            priority: 1
        });
    }

    if (inputs.riskTolerance && inputs.riskTolerance < 5 && inputs.yourCurrentAge < 50) {
        strategies.push({
            category: 'Risk Management',
            recommendation: 'Consider increasing risk tolerance for higher long-term returns',
            impact: 'Medium',
            priority: 2
        });
    }

    if (!inputs.hasEmergencyFund) {
        strategies.push({
            category: 'Emergency Fund',
            recommendation: 'Establish 3-6 months emergency fund before increasing investments',
            impact: 'High',
            priority: 1
        });
    }

    return strategies;
}

// Enhanced Analysis PDF Helper
function addEnhancedAnalysisToPDF(doc, analysis, startY) {
    let yPos = startY;

    // Enhanced Summary Section
    if (analysis.enhancedSummary) {
        doc.addPage();
        yPos = 20;

        doc.setFontSize(18);
        doc.setTextColor(0, 123, 191);
        doc.text("Enhanced Financial Summary", 14, yPos);
        yPos += 6;
        doc.setDrawColor(200, 200, 200);
        doc.line(14, yPos, 196, yPos);
        yPos += 9;

        const readiness = analysis.enhancedSummary.financialReadiness;
        const enhancedSummaryBody = [
            ['Financial Readiness Score', `${readiness.readinessScore.toFixed(1)}%`],
            ['Total Assets at Retirement', formatCurrency(readiness.totalAssets)],
            ['Target Amount (25x Rule)', formatCurrency(readiness.targetAmount)],
            ['Funding Gap', readiness.gap > 0 ? formatCurrency(readiness.gap) : 'None'],
            ['Projected Outcome', analysis.enhancedSummary.projectedOutcome.outcome],
            ['Years of Funding', `${analysis.enhancedSummary.projectedOutcome.yearsOfFunding} years`]
        ];

        doc.autoTable({
            startY: yPos,
            head: [['Metric', 'Value']],
            body: enhancedSummaryBody,
            theme: 'striped',
            headStyles: { fillColor: [0, 123, 191] },
            styles: { fontSize: 10 }
        });

        yPos = doc.lastAutoTable.finalY + 15;
    }

    // Risk Analysis Section
    if (analysis.riskAnalysis) {
        if (yPos > 200) {
            doc.addPage();
            yPos = 20;
        }

        doc.setFontSize(16);
        doc.setTextColor(220, 53, 69);
        doc.text("Comprehensive Risk Analysis", 14, yPos);
        yPos += 5;
        doc.setDrawColor(200, 200, 200);
        doc.line(14, yPos, 196, yPos);
        yPos += 7;

        const riskData = analysis.riskAnalysis;
        const riskBody = [
            ['Risk Tolerance (1-10)', riskData.riskTolerance],
            ['Emergency Fund Available', riskData.emergencyFund ? 'Yes' : 'No'],
            ['High-Interest Debt', riskData.highInterestDebt ? 'Yes - Higher Risk' : 'No'],
            ['Financial Dependents', riskData.dependents],
            ['Property Concentration Risk', riskData.propertyConcentration ? 'High' : 'Low'],
            ['Sequence of Returns Risk', riskData.sequenceRisk]
        ];

        doc.autoTable({
            startY: yPos,
            head: [['Risk Factor', 'Assessment']],
            body: riskBody,
            theme: 'grid',
            headStyles: { fillColor: [220, 53, 69] },
            styles: { fontSize: 9 }
        });

        yPos = doc.lastAutoTable.finalY + 15;
    }

    // Property Analysis Section
    if (analysis.propertyAnalysis) {
        if (yPos > 180) {
            doc.addPage();
            yPos = 20;
        }

        doc.setFontSize(16);
        doc.setTextColor(40, 167, 69);
        doc.text("Investment Property Analysis", 14, yPos);
        yPos += 5;
        doc.setDrawColor(200, 200, 200);
        doc.line(14, yPos, 196, yPos);
        yPos += 7;

        const propData = analysis.propertyAnalysis;
        const propertyBody = [
            ['Current Property Value', formatCurrency(propData.currentValue)],
            ['Outstanding Loan', formatCurrency(propData.outstandingLoan)],
            ['Current Equity', formatCurrency(propData.equity)],
            ['Weekly Rental Income', formatCurrency(propData.weeklyRent)],
            ['Annual Rental Yield', `${propData.annualReturn.toFixed(2)}%`],
            ['Strategy', propData.sellStrategy]
        ];

        doc.autoTable({
            startY: yPos,
            head: [['Property Metric', 'Value']],
            body: propertyBody,
            theme: 'striped',
            headStyles: { fillColor: [40, 167, 69] },
            styles: { fontSize: 9 }
        });

        yPos = doc.lastAutoTable.finalY + 15;
    }

    // Optimization Strategies Section
    if (analysis.optimizationStrategies && analysis.optimizationStrategies.length > 0) {
        if (yPos > 160) {
            doc.addPage();
            yPos = 20;
        }

        doc.setFontSize(16);
        doc.setTextColor(0);
        doc.text("Optimization Strategies", 14, yPos);
        yPos += 5;
        doc.setDrawColor(200, 200, 200);
        doc.line(14, yPos, 196, yPos);
        yPos += 7;

        const optimizationBody = analysis.optimizationStrategies.map(strategy => [
            strategy.category,
            strategy.recommendation,
            strategy.impact,
            `Priority ${strategy.priority}`
        ]);

        doc.autoTable({
            startY: yPos,
            head: [['Category', 'Recommendation', 'Impact', 'Priority']],
            body: optimizationBody,
            theme: 'grid',
            headStyles: { fillColor: [255, 193, 7] },
            styles: { fontSize: 8 }
        });

        yPos = doc.lastAutoTable.finalY + 15;
    }

    // AI Recommendations Section
    if (analysis.aiRecommendations && analysis.aiRecommendations.length > 0) {
        if (yPos > 160) {
            doc.addPage();
            yPos = 20;
        }

        doc.setFontSize(16);
        doc.setTextColor(111, 66, 193);
        doc.text("AI-Generated Recommendations", 14, yPos);
        yPos += 5;
        doc.setDrawColor(200, 200, 200);
        doc.line(14, yPos, 196, yPos);
        yPos += 7;

        const aiBody = analysis.aiRecommendations.slice(0, 10).map(rec => [
            rec.category || 'General',
            rec.action || rec.recommendation || rec.title,
            rec.priority || 'Medium',
            rec.timing || 'As needed'
        ]);

        doc.autoTable({
            startY: yPos,
            head: [['Category', 'Recommendation', 'Priority', 'Timing']],
            body: aiBody,
            theme: 'striped',
            headStyles: { fillColor: [111, 66, 193] },
            styles: { fontSize: 8 }
        });

        yPos = doc.lastAutoTable.finalY + 15;
    }

    // Scenario Comparisons Section
    if (analysis.scenarioComparisons && analysis.scenarioComparisons.length > 0) {
        if (yPos > 160) {
            doc.addPage();
            yPos = 20;
        }

        doc.setFontSize(16);
        doc.setTextColor(245, 158, 11);
        doc.text("Scenario Comparisons", 14, yPos);
        yPos += 5;
        doc.setDrawColor(200, 200, 200);
        doc.line(14, yPos, 196, yPos);
        yPos += 7;

        const scenarioBody = analysis.scenarioComparisons.slice(0, 8).map(scenario => [
            scenario.name || 'Scenario',
            formatCurrency(scenario.finalBalance || 0),
            scenario.improvement ? `+${(scenario.improvement * 100).toFixed(1)}%` : 'N/A',
            scenario.recommendation || 'Review scenario'
        ]);

        doc.autoTable({
            startY: yPos,
            head: [['Scenario', 'Final Balance', 'Improvement', 'Notes']],
            body: scenarioBody,
            theme: 'grid',
            headStyles: { fillColor: [23, 162, 184] },
            styles: { fontSize: 8 }
        });

        yPos = doc.lastAutoTable.finalY + 15;
    }

    // User-Generated Suggestions Section
    if (analysis.suggestions && analysis.suggestions.length > 0) {
        if (yPos > 160) {
            doc.addPage();
            yPos = 20;
        }

        doc.setFontSize(16);
        doc.setTextColor(79, 70, 229);
        doc.text("Personalized Suggestions", 14, yPos);
        yPos += 5;
        doc.setDrawColor(200, 200, 200);
        doc.line(14, yPos, 196, yPos);
        yPos += 7;

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`${analysis.suggestions.length} personalized strategies to improve your retirement outcome`, 14, yPos);
        yPos += 8;

        const suggestionsBody = analysis.suggestions.slice(0, 20).map(suggestion => {
            const category = suggestion.exportCategory || suggestion.category || 'general';
            const categoryLabel = { property: 'Property', income: 'Income', investment: 'Investment', timing: 'Timing', mortgage: 'Mortgage', insurance: 'Insurance' }[category] || category.charAt(0).toUpperCase() + category.slice(1);
            const name = suggestion.name || suggestion.title || 'Suggestion';
            const description = (suggestion.description || suggestion.summary || 'No description available').substring(0, 90);
            const impact = suggestion.medianBalanceDiff
                ? formatCurrency(suggestion.medianBalanceDiff)
                : (suggestion.successRate ? `${(suggestion.successRate * 100).toFixed(1)}%` : 'N/A');
            const feasibility = suggestion.feasibility || suggestion.difficulty || 'Review';

            return [categoryLabel, name, description, impact, feasibility];
        });

        doc.autoTable({
            startY: yPos,
            head: [['Category', 'Suggestion', 'Description', 'Impact', 'Feasibility']],
            body: suggestionsBody,
            theme: 'striped',
            headStyles: { fillColor: [99, 102, 241] },
            styles: { fontSize: 8, cellPadding: 3 },
            columnStyles: {
                0: { cellWidth: 22 },
                1: { cellWidth: 35 },
                2: { cellWidth: 75 },
                3: { cellWidth: 25 },
                4: { cellWidth: 18 }
            }
        });

        yPos = doc.lastAutoTable.finalY + 15;
    }

    // Scenario Matrix Section
    if (analysis.scenarioMatrix) {
        doc.addPage();
        yPos = 20;

        doc.setFontSize(18);
        doc.setTextColor(79, 70, 229);
        doc.text("Scenario Comparison Matrix", 14, yPos);
        yPos += 6;
        doc.setDrawColor(200, 200, 200);
        doc.line(14, yPos, 196, yPos);
        yPos += 8;

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text("Comprehensive comparison of different retirement strategies", 14, yPos);
        yPos += 8;

        // Summary statistics
        if (analysis.scenarioMatrix.summary) {
            const summary = analysis.scenarioMatrix.summary;
            const summaryBody = [
                ['Total Scenarios Analyzed', summary.totalScenariosAnalyzed || 0],
                ['Best Success Rate', summary.bestSuccessRate ? `${(summary.bestSuccessRate * 100).toFixed(1)}%` : 'N/A'],
                ['Average Success Rate', summary.averageSuccessRate ? `${(summary.averageSuccessRate * 100).toFixed(1)}%` : 'N/A'],
                ['Best Median Outcome', summary.bestMedianOutcome ? formatCurrency(summary.bestMedianOutcome) : 'N/A']
            ];

            doc.autoTable({
                startY: yPos,
                head: [['Summary Metric', 'Value']],
                body: summaryBody,
                theme: 'grid',
                headStyles: { fillColor: [79, 70, 229] },
                styles: { fontSize: 9 }
            });

            yPos = doc.lastAutoTable.finalY + 12;
        }

        // Top scenarios comparison
        if (analysis.scenarioMatrix.scenarios && analysis.scenarioMatrix.scenarios.length > 0) {
            const scenariosBody = analysis.scenarioMatrix.scenarios.slice(0, 10).map(scenario => [
                scenario.name || 'Scenario',
                scenario.description || '',
                scenario.comparisonMetrics?.successRate
                    ? `${(scenario.comparisonMetrics.successRate * 100).toFixed(1)}%`
                    : 'N/A',
                scenario.comparisonMetrics?.median
                    ? formatCurrency(scenario.comparisonMetrics.median)
                    : 'N/A'
            ]);

            doc.autoTable({
                startY: yPos,
                head: [['Strategy', 'Description', 'Success Rate', 'Median Balance']],
                body: scenariosBody,
                theme: 'striped',
                headStyles: { fillColor: [79, 70, 229] },
                styles: { fontSize: 8, cellPadding: 2 },
                columnStyles: {
                    0: { cellWidth: 45 },
                    1: { cellWidth: 60 },
                    2: { cellWidth: 35 },
                    3: { cellWidth: 35 }
                }
            });

            yPos = doc.lastAutoTable.finalY + 12;
        }

        // Key insights
        if (analysis.scenarioMatrix.insights && analysis.scenarioMatrix.insights.length > 0) {
            if (yPos > 200) {
                doc.addPage();
                yPos = 20;
            }

            doc.setFontSize(14);
            doc.setTextColor(0, 71, 171);
            doc.text("Key Insights", 14, yPos);
            yPos += 8;

            const insightsBody = analysis.scenarioMatrix.insights.slice(0, 5).map(insight => [
                insight.title || 'Insight',
                insight.message || '',
                insight.impact ? `+${insight.impact.toFixed(1)}%` : 'N/A'
            ]);

            doc.autoTable({
                startY: yPos,
                head: [['Insight', 'Details', 'Impact']],
                body: insightsBody,
                theme: 'grid',
                headStyles: { fillColor: [16, 185, 129] },
                styles: { fontSize: 8, cellPadding: 3 },
                columnStyles: {
                    0: { cellWidth: 40 },
                    1: { cellWidth: 100 },
                    2: { cellWidth: 25 }
                }
            });
        }
    }

    // Persona-Based AI Recommendations Section
    if (analysis.personaRecommendations) {
        doc.addPage();
        yPos = 20;

        doc.setFontSize(18);
        doc.setTextColor(16, 185, 129);
        doc.text("AI Persona-Based Recommendations", 14, yPos);
        yPos += 6;
        doc.setDrawColor(200, 200, 200);
        doc.line(14, yPos, 196, yPos);
        yPos += 8;

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text("Personalized recommendations based on your financial profile", 14, yPos);
        yPos += 10;

        // Persona analysis
        if (analysis.personaRecommendations.personaAnalysis) {
            const persona = analysis.personaRecommendations.personaAnalysis.primaryPersona;
            if (persona) {
                doc.setFontSize(12);
                doc.setTextColor(0);
                doc.text(`Your Financial Persona: ${persona.name}`, 14, yPos);
                yPos += 6;

                doc.setFontSize(9);
                doc.setTextColor(80);
                const descriptionLines = doc.splitTextToSize(persona.description || '', 175);
                doc.text(descriptionLines, 14, yPos);
                yPos += (descriptionLines.length * 5) + 8;
            }
        }

        // Recommendations
        if (analysis.personaRecommendations.recommendations && analysis.personaRecommendations.recommendations.length > 0) {
            const recommendationsBody = analysis.personaRecommendations.recommendations.slice(0, 10).map(rec => [
                rec.category || 'General',
                rec.title || rec.action || 'Recommendation',
                rec.priority || 'Medium',
                rec.difficulty || rec.timeframe || 'Review'
            ]);

            doc.autoTable({
                startY: yPos,
                head: [['Category', 'Recommendation', 'Priority', 'Difficulty']],
                body: recommendationsBody,
                theme: 'striped',
                headStyles: { fillColor: [16, 185, 129] },
                styles: { fontSize: 8, cellPadding: 3 },
                columnStyles: {
                    0: { cellWidth: 35 },
                    1: { cellWidth: 80 },
                    2: { cellWidth: 30 },
                    3: { cellWidth: 30 }
                }
            });

            yPos = doc.lastAutoTable.finalY + 12;
        }

        // Key insights
        if (analysis.personaRecommendations.insights && analysis.personaRecommendations.insights.length > 0) {
            if (yPos > 200) {
                doc.addPage();
                yPos = 20;
            }

            doc.setFontSize(14);
            doc.setTextColor(16, 185, 129);
            doc.text("Persona Insights", 14, yPos);
            yPos += 5;
            doc.setDrawColor(200, 200, 200);
            doc.line(14, yPos, 196, yPos);
            yPos += 7;

            const insightsBody = analysis.personaRecommendations.insights.slice(0, 5).map(insight => [
                insight.type || 'General',
                insight.title || 'Insight',
                insight.description || ''
            ]);

            doc.autoTable({
                startY: yPos,
                head: [['Type', 'Title', 'Description']],
                body: insightsBody,
                theme: 'grid',
                headStyles: { fillColor: [16, 185, 129] },
                styles: { fontSize: 8, cellPadding: 3 },
                columnStyles: {
                    0: { cellWidth: 30 },
                    1: { cellWidth: 45 },
                    2: { cellWidth: 100 }
                }
            });
        }
    }

    // Comprehensive AI Recommendations (full list grouped by category)
    if (analysis.comprehensiveRecommendations && analysis.comprehensiveRecommendations.length > 0) {
        doc.addPage();
        yPos = 20;

        doc.setFontSize(18);
        doc.setTextColor(111, 66, 193);
        doc.text("Comprehensive AI Recommendations", 14, yPos);
        yPos += 6;
        doc.setDrawColor(200, 200, 200);
        doc.line(14, yPos, 196, yPos);
        yPos += 8;

        const grouped = analysis.comprehensiveRecommendations.reduce((acc, rec) => {
            const cat = rec.category || 'General';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(rec);
            return acc;
        }, {});

        Object.entries(grouped).forEach(([category, recs]) => {
            if (yPos > 240) { doc.addPage(); yPos = 20; }

            doc.setFontSize(11);
            doc.setTextColor(60, 60, 60);
            doc.text(category, 14, yPos);
            yPos += 4;

            doc.autoTable({
                startY: yPos,
                head: [['Recommendation', 'Priority', 'Confidence']],
                body: recs.slice(0, 8).map(rec => [
                    rec.action || rec.title || '',
                    rec.priority || 'Medium',
                    rec.confidence ? `${Math.round(rec.confidence * 100)}%` : 'N/A'
                ]),
                theme: 'grid',
                headStyles: { fillColor: [111, 66, 193], fontSize: 8 },
                styles: { fontSize: 8, cellPadding: 2 },
                columnStyles: { 0: { cellWidth: 135 }, 1: { cellWidth: 25 }, 2: { cellWidth: 15 } }
            });

            yPos = doc.lastAutoTable.finalY + 8;
        });
    }

    // Priority Action Plan
    if (analysis.actionPlan) {
        const immediateActions = analysis.actionPlan.immediate || [];
        const next30Days = analysis.actionPlan.next30Days || [];
        if (immediateActions.length > 0 || next30Days.length > 0) {
            if (yPos > 200) { doc.addPage(); yPos = 20; }

            doc.setFontSize(16);
            doc.setTextColor(234, 88, 12);
            doc.text("Priority Action Plan", 14, yPos);
            yPos += 5;
            doc.setDrawColor(200, 200, 200);
            doc.line(14, yPos, 196, yPos);
            yPos += 7;

            if (immediateActions.length > 0) {
                doc.autoTable({
                    startY: yPos,
                    head: [['Immediate Actions (Do Now)']],
                    body: immediateActions.slice(0, 10).map(a => [a.title || a.action || String(a)]),
                    theme: 'striped',
                    headStyles: { fillColor: [234, 88, 12] },
                    styles: { fontSize: 9, cellPadding: 3 }
                });
                yPos = doc.lastAutoTable.finalY + 8;
            }

            if (next30Days.length > 0) {
                if (yPos > 220) { doc.addPage(); yPos = 20; }
                doc.autoTable({
                    startY: yPos,
                    head: [['Next 30 Days']],
                    body: next30Days.slice(0, 10).map(a => [a.title || a.action || String(a)]),
                    theme: 'striped',
                    headStyles: { fillColor: [245, 158, 11] },
                    styles: { fontSize: 9, cellPadding: 3 }
                });
                yPos = doc.lastAutoTable.finalY + 8;
            }
        }
    }

    // Your Outcome — Recommended Actions
    if (analysis.outcomeActions && analysis.outcomeActions.length > 0) {
        if (yPos > 200) { doc.addPage(); yPos = 20; }

        doc.setFontSize(16);
        doc.setTextColor(5, 150, 105);
        doc.text("Your Outcome — Recommended Actions", 14, yPos);
        yPos += 5;
        doc.setDrawColor(200, 200, 200);
        doc.line(14, yPos, 196, yPos);
        yPos += 7;

        doc.autoTable({
            startY: yPos,
            head: [['Action', 'Impact / Description', 'Priority', 'Timeframe']],
            body: analysis.outcomeActions.slice(0, 15).map(action => [
                action.title || action.name || String(action),
                action.impact || action.description || '',
                action.priority || 'Review',
                action.timeframe || action.timing || ''
            ]),
            theme: 'striped',
            headStyles: { fillColor: [5, 150, 105] },
            styles: { fontSize: 8, cellPadding: 3 },
            columnStyles: { 0: { cellWidth: 55 }, 1: { cellWidth: 80 }, 2: { cellWidth: 25 }, 3: { cellWidth: 15 } }
        });
    }
}

// Enhanced Analysis XLSX Helper
function addEnhancedAnalysisToXLSX(wb, analysis) {
    // Enhanced Summary Sheet
    if (analysis.enhancedSummary) {
        const readiness = analysis.enhancedSummary.financialReadiness;
        const outcome = analysis.enhancedSummary.projectedOutcome;

        const enhancedSummaryData = [
            ['Enhanced Financial Summary', '', ''],
            ['Metric', 'Value', 'Description'],
            ['Financial Readiness Score', `${readiness.readinessScore.toFixed(1)}%`, '25x annual income rule'],
            ['Total Assets at Retirement', readiness.totalAssets, 'All accessible financial assets'],
            ['Target Amount (25x Rule)', readiness.targetAmount, 'Recommended retirement nest egg'],
            ['Funding Gap', readiness.gap > 0 ? readiness.gap : 0, 'Amount still needed'],
            ['Projected Outcome', outcome.outcome, 'Overall retirement readiness'],
            ['Years of Funding', `${outcome.yearsOfFunding} years`, 'Based on $50K annual withdrawals'],
            ['', '', ''],
            ['Key Metrics', '', ''],
            ['Current Savings Rate', `${(analysis.enhancedSummary.keyMetrics.savingsRate * 100).toFixed(1)}%`, 'Percentage of income saved'],
            ['Years to Retirement', analysis.enhancedSummary.keyMetrics.yearsToRetirement, 'Time remaining to build wealth'],
            ['Projected Final Balance', analysis.enhancedSummary.keyMetrics.projectedBalance, 'Deterministic calculation'],
            ['Monte Carlo Success Rate',
                analysis.enhancedSummary.keyMetrics.successProbability
                    ? `${analysis.enhancedSummary.keyMetrics.successProbability.toFixed(1)}%`
                    : 'Not calculated',
                'Probability of success with market volatility']
        ];

        const ws_enhanced = XLSX.utils.aoa_to_sheet(enhancedSummaryData);
        XLSX.utils.book_append_sheet(wb, ws_enhanced, 'Enhanced Summary');
    }

    // Risk Analysis Sheet
    if (analysis.riskAnalysis) {
        const risk = analysis.riskAnalysis;
        const riskData = [
            ['Comprehensive Risk Analysis', '', ''],
            ['Risk Factor', 'Assessment', 'Impact'],
            ['Risk Tolerance (1-10)', risk.riskTolerance, 'Higher tolerance allows more growth potential'],
            ['Emergency Fund Available', risk.emergencyFund ? 'Yes' : 'No', 'Reduces need to sell investments in emergencies'],
            ['High-Interest Debt', risk.highInterestDebt ? 'Yes - Higher Risk' : 'No', 'Debt payments reduce investment capacity'],
            ['Financial Dependents', risk.dependents, 'More dependents increase financial responsibility'],
            ['Property Concentration Risk', risk.propertyConcentration ? 'High' : 'Low', 'Diversification reduces overall portfolio risk'],
            ['Sequence of Returns Risk', risk.sequenceRisk, 'Risk of poor early returns in retirement'],
            ['', '', ''],
            ['Risk Mitigation Strategies', '', ''],
            ['Strategy', 'Description', 'Priority'],
            ['Diversification', 'Spread investments across asset classes', 'High'],
            ['Emergency Fund', 'Maintain 3-6 months expenses in cash', 'High'],
            ['Debt Reduction', 'Pay down high-interest debt first', 'High'],
            ['Regular Rebalancing', 'Maintain target asset allocation', 'Medium'],
            ['Dollar Cost Averaging', 'Invest consistently regardless of market conditions', 'Medium']
        ];

        const ws_risk = XLSX.utils.aoa_to_sheet(riskData);
        XLSX.utils.book_append_sheet(wb, ws_risk, 'Risk Analysis');
    }

    // Property Analysis Sheet
    if (analysis.propertyAnalysis) {
        const prop = analysis.propertyAnalysis;
        const propertyData = [
            ['Investment Property Analysis', '', ''],
            ['Metric', 'Value', 'Notes'],
            ['Current Property Value', prop.currentValue, 'Current market value'],
            ['Outstanding Loan', prop.outstandingLoan, 'Remaining mortgage balance'],
            ['Current Equity', prop.equity, 'Property value minus loan'],
            ['Weekly Rental Income', prop.weeklyRent, 'Gross rental income'],
            ['Annual Rental Yield', `${prop.annualReturn.toFixed(2)}%`, 'Gross rental yield'],
            ['Strategy', prop.sellStrategy, 'Current exit strategy'],
            ['', '', ''],
            ['Property Investment Considerations', '', ''],
            ['Factor', 'Description', 'Impact'],
            ['Negative Gearing', 'Tax deductions on rental losses', 'Reduces taxable income'],
            ['Capital Gains Tax', '50% discount after 12 months ownership', 'Reduces tax on sale'],
            ['Depreciation Benefits', 'Building and fixture depreciation', 'Additional tax deductions'],
            ['Maintenance Costs', 'Ongoing property maintenance', 'Reduces net returns'],
            ['Vacancy Risk', 'Periods without tenants', 'Reduces rental income'],
            ['Interest Rate Risk', 'Changes in mortgage rates', 'Affects cash flow']
        ];

        const ws_property = XLSX.utils.aoa_to_sheet(propertyData);
        XLSX.utils.book_append_sheet(wb, ws_property, 'Property Analysis');
    }

    // Optimization Strategies Sheet
    if (analysis.optimizationStrategies && analysis.optimizationStrategies.length > 0) {
        const optimizationData = [
            ['Optimization Strategies', '', '', ''],
            ['Category', 'Recommendation', 'Impact', 'Priority'],
            ...analysis.optimizationStrategies.map(strategy => [
                strategy.category,
                strategy.recommendation,
                strategy.impact,
                `Priority ${strategy.priority}`
            ]),
            ['', '', '', ''],
            ['Additional Optimization Tips', '', '', ''],
            ['Strategy', 'Description', 'Benefit', 'Difficulty'],
            ['Salary Sacrifice', 'Contribute pre-tax salary to super', 'Tax savings + compounding', 'Easy'],
            ['Spouse Contributions', 'Government co-contribution for low-income spouses', 'Free government money', 'Easy'],
            ['Asset Allocation Review', 'Adjust risk/return profile annually', 'Optimized returns', 'Medium'],
            ['Fee Minimization', 'Choose low-cost investment options', 'More money invested', 'Easy'],
            ['Tax Loss Harvesting', 'Realize losses to offset gains', 'Reduced tax liability', 'Medium'],
            ['Debt Recycling', 'Convert non-deductible to deductible debt', 'Tax deductions', 'Complex']
        ];

        const ws_optimization = XLSX.utils.aoa_to_sheet(optimizationData);
        XLSX.utils.book_append_sheet(wb, ws_optimization, 'Optimization');
    }

    // AI Recommendations Sheet
    if (analysis.aiRecommendations && analysis.aiRecommendations.length > 0) {
        const aiData = [
            ['AI-Generated Recommendations', '', '', ''],
            ['Category', 'Recommendation', 'Priority', 'Timing'],
            ...analysis.aiRecommendations.slice(0, 20).map(rec => [
                rec.category || 'General',
                rec.action || rec.recommendation || rec.title,
                rec.priority || 'Medium',
                rec.timing || 'As needed'
            ])
        ];

        const ws_ai = XLSX.utils.aoa_to_sheet(aiData);
        XLSX.utils.book_append_sheet(wb, ws_ai, 'AI Recommendations');
    }

    // Scenario Comparisons Sheet
    if (analysis.scenarioComparisons && analysis.scenarioComparisons.length > 0) {
        const scenarioData = [
            ['Scenario Comparisons', '', '', ''],
            ['Scenario', 'Final Balance', 'Improvement', 'Notes'],
            ...analysis.scenarioComparisons.slice(0, 15).map(scenario => [
                scenario.name || 'Scenario',
                scenario.finalBalance || 0,
                scenario.improvement ? `+${(scenario.improvement * 100).toFixed(1)}%` : 'N/A',
                scenario.recommendation || 'Review scenario details'
            ])
        ];

        const ws_scenarios = XLSX.utils.aoa_to_sheet(scenarioData);
        XLSX.utils.book_append_sheet(wb, ws_scenarios, 'Scenario Compare');
    }

    // Suggestions Sheet
    if (analysis.suggestions && analysis.suggestions.length > 0) {
        const catLabels = { property: 'Property', income: 'Income', investment: 'Investment', timing: 'Timing', mortgage: 'Mortgage', insurance: 'Insurance' };
        const suggestionsData = [
            ['Personalized Suggestions', '', '', '', '', ''],
            ['#', 'Category', 'Strategy', 'Description', 'Impact/Benefit', 'Feasibility'],
            ...analysis.suggestions.slice(0, 30).map((s, i) => {
                const rawCat = s.exportCategory || s.category || 'general';
                const category = catLabels[rawCat] || rawCat.charAt(0).toUpperCase() + rawCat.slice(1);
                const impact = s.medianBalanceDiff
                    ? `$${Math.round(s.medianBalanceDiff).toLocaleString()}`
                    : (s.impact || s.estimatedImprovement || 'Review details');
                return [i + 1, category, s.title || s.name || 'Improvement Strategy', s.description || s.summary || s.recommendation || '', impact, s.feasibility || s.difficulty || ''];
            })
        ];

        const ws_suggestions = XLSX.utils.aoa_to_sheet(suggestionsData);
        XLSX.utils.book_append_sheet(wb, ws_suggestions, 'Suggestions');
    }

    // Persona Recommendations Sheet
    if (analysis.personaRecommendations) {
        const personaRecs = Array.isArray(analysis.personaRecommendations)
            ? analysis.personaRecommendations
            : (analysis.personaRecommendations.recommendations || []);

        if (personaRecs.length > 0) {
            const personaSheetData = [
                ['Persona-Based Recommendations', '', '', ''],
                ['Category', 'Recommendation', 'Priority', 'Difficulty/Timeframe'],
                ...personaRecs.slice(0, 20).map(rec => [
                    rec.category || rec.persona || rec.type || 'Your Profile',
                    rec.title || rec.recommendation || rec.action || '',
                    rec.priority || 'Medium',
                    rec.difficulty || rec.timeframe || 'Review'
                ])
            ];

            const ws_persona = XLSX.utils.aoa_to_sheet(personaSheetData);
            XLSX.utils.book_append_sheet(wb, ws_persona, 'Persona Recommendations');
        }
    }

    // Comprehensive AI Recommendations Sheet (all categories, full list)
    if (analysis.comprehensiveRecommendations && analysis.comprehensiveRecommendations.length > 0) {
        const grouped = analysis.comprehensiveRecommendations.reduce((acc, rec) => {
            const cat = rec.category || 'General';
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(rec);
            return acc;
        }, {});

        const compRecsData = [
            ['Comprehensive AI Recommendations', '', '', ''],
            ['Category', 'Recommendation', 'Priority', 'Confidence']
        ];

        Object.entries(grouped).forEach(([cat, recs]) => {
            recs.forEach(rec => compRecsData.push([
                cat,
                rec.action || rec.title || '',
                rec.priority || 'Medium',
                rec.confidence ? `${Math.round(rec.confidence * 100)}%` : 'N/A'
            ]));
        });

        const ws_comp = XLSX.utils.aoa_to_sheet(compRecsData);
        XLSX.utils.book_append_sheet(wb, ws_comp, 'Comprehensive AI Recs');
    }

    // Action Plan Sheet
    if (analysis.actionPlan) {
        const immediateActions = analysis.actionPlan.immediate || [];
        const next30Days = analysis.actionPlan.next30Days || [];
        if (immediateActions.length > 0 || next30Days.length > 0) {
            const actionPlanData = [['Priority Action Plan', '', ''], ['Section', 'Action', 'Description']];

            immediateActions.forEach(a => actionPlanData.push([
                'Immediate (Do Now)',
                a.title || a.action || String(a),
                a.description || ''
            ]));

            next30Days.forEach(a => actionPlanData.push([
                'Next 30 Days',
                a.title || a.action || String(a),
                a.description || ''
            ]));

            const ws_plan = XLSX.utils.aoa_to_sheet(actionPlanData);
            XLSX.utils.book_append_sheet(wb, ws_plan, 'Action Plan');
        }
    }

    // Outcome Actions Sheet
    if (analysis.outcomeActions && analysis.outcomeActions.length > 0) {
        const outcomeData = [
            ['Your Outcome — Recommended Actions', '', '', ''],
            ['Action', 'Impact / Description', 'Priority', 'Timeframe'],
            ...analysis.outcomeActions.slice(0, 25).map(action => [
                action.title || action.name || String(action),
                action.impact || action.description || '',
                action.priority || 'Review',
                action.timeframe || action.timing || ''
            ])
        ];

        const ws_outcome = XLSX.utils.aoa_to_sheet(outcomeData);
        XLSX.utils.book_append_sheet(wb, ws_outcome, 'Outcome Actions');
    }
}
