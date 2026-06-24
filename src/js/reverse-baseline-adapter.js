/**
 * reverse-baseline-adapter.js - Canonical adapter from forward calculator
 * scenario to reverse planner baseline.
 *
 * Normalises field name differences between:
 *  - advanced.html (app.js collectInputs) – primary source
 *  - advanced-v2.html / retirement.html V3 (V2-shaped inputs) – secondary source
 *
 * Storage key: localStorage.rc_forward_scenario
 */

const CURRENCY_FORMAT = new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
});

function fmt(v) {
    if (v === undefined || v === null) return '—';
    return CURRENCY_FORMAT.format(Math.round(v));
}

function num(v, fallback) {
    const n = Number(v ?? fallback);
    return Number.isFinite(n) ? n : fallback;
}

/**
 * Detect which source calculator produced the data.
 */
function detectSource(raw) {
    if (!raw) return 'unknown';
    if (raw.sourcePage === 'retirement-v3' || raw.source === 'retirement-v3') return 'retirement-v3';
    if (raw.household || raw.retireAge !== undefined) return 'advanced-v2';
    if (raw.yourCurrentAge !== undefined || raw.householdStatus !== undefined) return 'advanced-classic';
    return 'unknown';
}

/**
 * Build the display summary from the canonical baseline.
 */
function buildDisplaySummary(canonical) {
    const i = canonical.inputs;
    const parts = [];

    parts.push(`Age ${i.currentAge}`);
    parts.push(`Salary ${fmt(i.annualSalary)}`);

    if (i.isCouple) {
        parts.push(`Partner ${i.partnerAge ? `age ${i.partnerAge}` : ''}`);
        parts.push(`Partner salary ${fmt(i.partnerSalary)}`);
    }

    parts.push(`Super ${fmt(i.currentSuperBalance)}`);
    if (i.isCouple) parts.push(`Partner super ${fmt(i.partnerCurrentSuper)}`);

    if (i.homeValue > 0) parts.push(`Home ${fmt(i.homeValue)}`);
    if (i.mortgageBalance > 0) parts.push(`Mortgage ${fmt(i.mortgageBalance)}`);
    if (i.hasInvestmentProperty) {
        parts.push(`Investment property ${fmt(i.investmentPropertyValue)}`);
        parts.push(`Rental ${fmt(i.weeklyRentalIncome * 52)}/yr`);
    }

    if (i.cashSavings > 0 || i.stocksPortfolio > 0) {
        const total = (i.cashSavings || 0) + (i.stocksPortfolio || 0);
        parts.push(`Investments ${fmt(total)}`);
    }

    parts.push(`Retire at ${i.retirementAge}`);
    parts.push(`Plan to ${i.lifespan}`);

    return parts.join(' · ');
}

/**
 * Identify fields missing from the scenario that the reverse planner needs.
 */
function detectMissingFields(canonical) {
    const i = canonical.inputs;
    const missing = [];

    if (!i.annualSalary || i.annualSalary <= 0) missing.push('annualSalary');
    if (!i.currentSuperBalance || i.currentSuperBalance <= 0) missing.push('currentSuperBalance');

    if (i.isCouple) {
        if (!i.partnerSalary || i.partnerSalary <= 0) missing.push('partnerSalary');
        if (!i.partnerCurrentSuper || i.partnerCurrentSuper <= 0) missing.push('partnerCurrentSuper');
    }

    return missing;
}

/**
 * Generate warnings about the imported data.
 */
function detectWarnings(canonical) {
    const i = canonical.inputs;
    const warnings = [];

    if (i.retirementAge <= i.currentAge) {
        warnings.push('Retirement age should be later than current age.');
    }

    if (i.lifespan <= i.retirementAge) {
        warnings.push('Lifespan should be greater than retirement age.');
    }

    if (i.mortgageBalance > 0 && !i.monthlyMortgagePayment) {
        warnings.push('Mortgage balance present but unable to derive monthly payment.');
    }

    if (i.hasInvestmentProperty && (!i.investmentPropertyValue || i.investmentPropertyValue <= 0)) {
        warnings.push('Investment property checked but value is missing.');
    }

    return warnings;
}

/**
 * Normalise a forward calculator scenario into the canonical reverse baseline format.
 *
 * Handles both advanced.html (app.js collectInputs) and advanced-v2.html field names.
 *
 * @param {object} raw - Raw object from localStorage (rc_forward_scenario)
 * @returns {object} Canonical baseline { source, importedAt, inputs, displaySummary, missingFields, warnings }
 */
export function buildReverseBaselineFromForwardScenario(raw) {
    if (!raw) {
        return {
            source: 'none',
            importedAt: new Date().toISOString(),
            exists: false,
            inputs: null,
            displaySummary: 'No saved forward calculator data found.',
            missingFields: [],
            warnings: [],
        };
    }

    const source = detectSource(raw);
    const isV2 = source === 'advanced-v2' || source === 'retirement-v3';

    const isCouple = raw.isCouple || raw.household === 'couple' || raw.householdStatus === 'couple' || false;

    const canonical = {
        source,
        importedAt: new Date().toISOString(),
        exists: true,
        inputs: {
            // Personal
            currentAge: num(isV2 ? raw.age : raw.yourCurrentAge, 50),
            partnerAge: isCouple ? num(isV2 ? raw.partnerAge : raw.partnerCurrentAge, 0) : 0,
            retirementAge: num(isV2 ? raw.retireAge : raw.retirementAge, 67),
            lifespan: num(isV2 ? raw.lifespan : raw.yourLifespan, 90),
            isCouple,

            // Income
            annualSalary: num(isV2 ? raw.salary : (raw.yourSalary ?? raw.salary), 0),
            partnerSalary: isCouple ? num(raw.partnerSalary ?? raw.salary, 0) : 0,

            // Super
            currentSuperBalance: num(isV2 ? raw.superBal : (raw.yourCurrentSuper ?? raw.superBal ?? raw.currentSuperBalance), 0),
            partnerCurrentSuper: num(isV2 ? raw.partnerSuperBal : (raw.partnerCurrentSuper ?? raw.partnerSuperBal ?? raw.partnerCurrentSuperBalance), 0),
            partnerSuperBalance: num(isV2 ? raw.partnerSuperBal : (raw.partnerSuperBalance ?? raw.partnerCurrentSuper ?? raw.partnerSuperBal ?? raw.partnerCurrentSuperBalance), 0),
            salarySacrifice: num(isV2 ? raw.salarySacrifice : (raw.yourAdditionalSuperContribution ?? raw.salarySacrifice), 0),
            partnerSalarySacrifice: num(isV2 ? raw.partnerSalarySacrifice : raw.partnerAdditionalSuperContribution, 0),

            // Home
            homeowner: raw.homeowner !== undefined ? !!raw.homeowner : true,
            homeValue: num(isV2 ? raw.homeValue : (raw.homeValue ?? 0), 0),
            mortgageBalance: num(isV2 ? raw.mortgage : (raw.mortgageBalance ?? raw.mortgage ?? 0), 0),
            monthlyMortgagePayment: (() => {
              const rawPayment = num(isV2 ? raw.monthlyMortgagePayment : (raw.monthlyMortgagePayment ?? 0), 0);
              if (rawPayment > 0) return rawPayment;
              const balance = num(isV2 ? raw.mortgage : raw.mortgageBalance, 0);
              if (balance > 0) {
                const rate = num(isV2 ? raw.mortgageRate : raw.mortgageRate, 0.06);
                const annualRate = rate > 1 ? rate / 100 : rate;
                const monthlyRate = annualRate / 12;
                const months = 360;
                if (monthlyRate > 0) {
                  return (balance * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -months));
                }
                return balance / months;
              }
              return 0;
            })(),

            // Investments
            cashSavings: num(isV2 ? raw.cash : (raw.currentSavings ?? raw.cash), 0),
            stocksPortfolio: num(isV2 ? raw.stocks : (raw.currentStocks ?? raw.stocks), 0),
            monthlyInvestment: num(isV2 ? raw.monthlyStockContrib : (raw.monthlyStockContribution ?? raw.monthlyStockContrib), 0),

            // Investment property
            hasInvestmentProperty: isV2 ? !!raw.investmentProperty : !!(raw.hasInvestmentProperty ?? raw.investmentProperty),
            investmentPropertyValue: num(isV2 ? raw.ipValue : (raw.investmentPropertyValue ?? raw.ipValue), 0),
            weeklyRentalIncome: num(isV2 ? raw.ipWeeklyRent : (raw.weeklyRentalIncome ?? raw.ipWeeklyRent), 0),
            annualPropertyExpenses: num(isV2 ? raw.ipAnnualExpenses : (raw.annualPropertyExpenses ?? raw.ipAnnualExpenses), 0),
            propertyGrowthRate: num(isV2 ? raw.ipGrowthRate : (raw.propertyGrowthRate ?? raw.ipGrowthRate), 0.04),

            // Healthcare
            healthcareCost: num(isV2 ? raw.healthcareCost : (raw.healthcareCost ?? raw.currentHealthcareCosts), 4800),

            // Economic assumptions
            inflation: num(isV2 ? raw.inflation : (raw.inflation ?? 0), 0.026),
            investmentReturn: num(isV2 ? raw.invReturn : (raw.investmentReturn ?? raw.invReturn ?? 0), 0.07),
            superReturn: num(isV2 ? raw.superGrowth : (raw.superReturn ?? raw.superGrowth ?? 0), 0.075),
            salaryGrowthRate: num(isV2 ? raw.salaryGrowthRate : (raw.salaryGrowthRate ?? 0), 0.02),
        },
    };

    canonical.displaySummary = buildDisplaySummary(canonical);
    canonical.missingFields = detectMissingFields(canonical);
    canonical.warnings = detectWarnings(canonical);

    return canonical;
}

/**
 * Import the forward scenario from localStorage.
 *
 * @returns {object} Parsed and normalised baseline
 */
export function importForwardScenario() {
    try {
        const stored = localStorage.getItem('rc_forward_scenario');
        if (!stored) {
            return buildReverseBaselineFromForwardScenario(null);
        }
        let raw;
        try {
            raw = JSON.parse(stored);
        } catch (e) {
            console.warn('Failed to parse rc_forward_scenario:', e);
            return buildReverseBaselineFromForwardScenario(null);
        }
        return buildReverseBaselineFromForwardScenario(raw);
    } catch {
        return buildReverseBaselineFromForwardScenario(null);
    }
}

/**
 * Store the current forward scenario to localStorage from any calculator.
 *
 * @param {object} inputs - Calculator inputs object
 */
export function storeForwardScenario(inputs) {
    try {
        try {
            const serialized = JSON.stringify(inputs);
            localStorage.setItem('rc_forward_scenario', serialized);
        } catch (e) {
            console.error('Failed to store forward scenario:', e);
            return false;
        }
        return true;
    } catch {
        return false;
    }
}
