/**
 * reverse-baseline-adapter.js - Canonical adapter from forward calculator
 * scenario to reverse planner baseline.
 *
 * Normalises field name differences between:
 *  - advanced.html (app.js collectInputs) – primary source
 *  - advanced-v2.html (buildEngineInputs) – secondary source
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
        warnings.push('Mortgage balance present but no monthly payment entered.');
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
    const isV2 = source === 'advanced-v2';

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
            annualSalary: num(isV2 ? raw.salary : raw.yourSalary, 0),
            partnerSalary: isCouple ? num(raw.partnerSalary, 0) : 0,

            // Super
            currentSuperBalance: num(isV2 ? raw.superBal : raw.yourCurrentSuper, 0),
            partnerCurrentSuper: isCouple ? num(isV2 ? raw.partnerSuperBal : raw.partnerCurrentSuper, 0) : 0,
            salarySacrifice: num(isV2 ? 0 : raw.yourAdditionalSuperContribution, 0),

            // Home
            homeowner: raw.homeowner !== undefined ? !!raw.homeowner : true,
            homeValue: num(isV2 ? raw.homeValue : raw.homeValue, 0),
            mortgageBalance: num(isV2 ? raw.mortgage : raw.mortgageBalance, 0),
            monthlyMortgagePayment: num(isV2 ? raw.monthlyMortgagePayment : raw.monthlyMortgagePayment, 0),

            // Investments
            cashSavings: num(isV2 ? raw.cash : raw.currentSavings, 0),
            stocksPortfolio: num(isV2 ? raw.stocks : raw.currentStocks, 0),
            monthlyInvestment: num(isV2 ? raw.monthlyStockContrib : raw.monthlyStockContribution, 0),

            // Investment property
            hasInvestmentProperty: isV2 ? !!raw.investmentProperty : !!raw.hasInvestmentProperty,
            investmentPropertyValue: num(isV2 ? raw.ipValue : raw.investmentPropertyValue, 0),
            weeklyRentalIncome: num(isV2 ? raw.ipWeeklyRent : raw.weeklyRentalIncome, 0),
            annualPropertyExpenses: num(isV2 ? raw.ipAnnualExpenses : raw.annualPropertyExpenses, 0),
            propertyGrowthRate: num(isV2 ? raw.ipGrowthRate : raw.propertyGrowthRate, 0.04),

            // Economic assumptions
            inflation: num(isV2 ? raw.inflation : raw.inflation, 0.026),
            investmentReturn: num(isV2 ? raw.invReturn : raw.investmentReturn, 0.07),
            superReturn: num(isV2 ? raw.superGrowth : raw.superReturn, 0.075),
            salaryGrowthRate: num(isV2 ? 0 : raw.salaryGrowthRate, 0.02),
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
        const raw = JSON.parse(stored);
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
        localStorage.setItem('rc_forward_scenario', JSON.stringify(inputs));
        return true;
    } catch {
        return false;
    }
}
