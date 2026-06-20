/**
 * tests/unit/reverse-baseline-adapter.test.js
 *
 * Unit tests for the forward-to-reverse baseline adapter.
 * Tests mapping of forward calculator inputs (both advanced-classic and advanced-v2)
 * to the canonical reverse baseline format.
 */

import {
    buildReverseBaselineFromForwardScenario,
    importForwardScenario,
} from '../../src/js/reverse-baseline-adapter.js';

// ---------------------------------------------------------------------------
// 1. Maps forward calculator inputs to reverse baseline
// ---------------------------------------------------------------------------

describe('buildReverseBaselineFromForwardScenario', () => {
    test('detects advanced-classic source from app.js format', () => {
        const raw = {
            yourCurrentAge: 45,
            retirementAge: 67,
            yourSalary: 120000,
            yourCurrentSuper: 300000,
            householdStatus: 'couple',
        };
        const baseline = buildReverseBaselineFromForwardScenario(raw);
        expect(baseline.source).toBe('advanced-classic');
        expect(baseline.exists).toBe(true);
    });

    test('detects advanced-v2 source from buildEngineInputs format', () => {
        const raw = {
            age: 45,
            retireAge: 67,
            salary: 120000,
            superBal: 300000,
            household: 'couple',
        };
        const baseline = buildReverseBaselineFromForwardScenario(raw);
        expect(baseline.source).toBe('advanced-v2');
        expect(baseline.exists).toBe(true);
    });

    test('returns exists:false for null input', () => {
        const baseline = buildReverseBaselineFromForwardScenario(null);
        expect(baseline.exists).toBe(false);
        expect(baseline.source).toBe('none');
    });

    test('returns exists:false for undefined input', () => {
        const baseline = buildReverseBaselineFromForwardScenario(undefined);
        expect(baseline.exists).toBe(false);
    });

    test('handles single-person advanced-classic format', () => {
        const raw = {
            yourCurrentAge: 50,
            retirementAge: 65,
            yourLifespan: 90,
            yourSalary: 100000,
            yourCurrentSuper: 250000,
            homeowner: true,
            homeValue: 800000,
            mortgageBalance: 200000,
            monthlyMortgagePayment: 2500,
            currentSavings: 50000,
            currentStocks: 100000,
            monthlyStockContribution: 1000,
            hasInvestmentProperty: false,
            inflation: 0.026,
            investmentReturn: 0.07,
            superReturn: 0.075,
            salaryGrowthRate: 0.02,
        };
        const baseline = buildReverseBaselineFromForwardScenario(raw);
        expect(baseline.inputs.currentAge).toBe(50);
        expect(baseline.inputs.retirementAge).toBe(65);
        expect(baseline.inputs.annualSalary).toBe(100000);
        expect(baseline.inputs.currentSuperBalance).toBe(250000);
        expect(baseline.inputs.homeValue).toBe(800000);
        expect(baseline.inputs.mortgageBalance).toBe(200000);
        expect(baseline.inputs.cashSavings).toBe(50000);
        expect(baseline.inputs.monthlyInvestment).toBe(1000);
        expect(baseline.inputs.isCouple).toBe(false);
    });

    test('handles couple advanced-v2 format', () => {
        const raw = {
            age: 49,
            retireAge: 65,
            lifespan: 92,
            household: 'couple',
            salary: 120000,
            partnerSalary: 80000,
            superBal: 350000,
            partnerSuperBal: 200000,
            homeValue: 900000,
            mortgage: 300000,
            monthlyMortgagePayment: 2800,
            cash: 40000,
            stocks: 150000,
            monthlyStockContrib: 1200,
            investmentProperty: true,
            ipValue: 600000,
            ipWeeklyRent: 600,
            ipAnnualExpenses: 8000,
            inflation: 2.6,
            invReturn: 7,
            superGrowth: 7.5,
        };
        const baseline = buildReverseBaselineFromForwardScenario(raw);
        expect(baseline.source).toBe('advanced-v2');
        expect(baseline.inputs.currentAge).toBe(49);
        expect(baseline.inputs.retirementAge).toBe(65);
        expect(baseline.inputs.isCouple).toBe(true);
        expect(baseline.inputs.annualSalary).toBe(120000);
        expect(baseline.inputs.partnerSalary).toBe(80000);
        expect(baseline.inputs.currentSuperBalance).toBe(350000);
        expect(baseline.inputs.partnerCurrentSuper).toBe(200000);
        expect(baseline.inputs.hasInvestmentProperty).toBe(true);
        expect(baseline.inputs.investmentPropertyValue).toBe(600000);
        expect(baseline.inputs.weeklyRentalIncome).toBe(600);
    });

    test('displaySummary is a non-empty string', () => {
        const raw = { yourCurrentAge: 45, yourSalary: 100000, yourCurrentSuper: 200000, retirementAge: 67, yourLifespan: 90 };
        const baseline = buildReverseBaselineFromForwardScenario(raw);
        expect(typeof baseline.displaySummary).toBe('string');
        expect(baseline.displaySummary.length).toBeGreaterThan(10);
    });
});

// ---------------------------------------------------------------------------
// 2. Handles missing partner fields
// ---------------------------------------------------------------------------

describe('missing fields detection', () => {
    test('detects missing salary', () => {
        const raw = { yourCurrentAge: 50, retirementAge: 65, yourSalary: 0, yourCurrentSuper: 100000 };
        const baseline = buildReverseBaselineFromForwardScenario(raw);
        expect(baseline.missingFields).toContain('annualSalary');
    });

    test('detects missing super balance', () => {
        const raw = { yourCurrentAge: 50, retirementAge: 65, yourSalary: 80000, yourCurrentSuper: 0 };
        const baseline = buildReverseBaselineFromForwardScenario(raw);
        expect(baseline.missingFields).toContain('currentSuperBalance');
    });

    test('detects missing partner fields for couples', () => {
        const raw = {
            yourCurrentAge: 45,
            retirementAge: 67,
            yourSalary: 100000,
            yourCurrentSuper: 200000,
            partnerCurrentAge: 43,
            partnerSalary: 0,
            partnerCurrentSuper: 0,
        };
        // Household detection: if partnerCurrentAge > 0 but partnerSalary is 0,
        // IsCouple detection depends on the isCouple field
        const rawWithCouple = { ...raw, isCouple: true };
        const baseline = buildReverseBaselineFromForwardScenario(rawWithCouple);
        expect(baseline.inputs.isCouple).toBe(true);
        expect(baseline.missingFields).toContain('partnerSalary');
    });
});

// ---------------------------------------------------------------------------
// 3. Handles advanced.html and advanced-v2.html naming differences
// ---------------------------------------------------------------------------

describe('field name normalisation', () => {
    test('normalises advanced-classic field names', () => {
        const raw = {
            yourCurrentAge: 45,
            retirementAge: 67,
            yourLifespan: 90,
            yourSalary: 100000,
            yourCurrentSuper: 250000,
            currentSavings: 50000,
            currentStocks: 100000,
            monthlyStockContribution: 1000,
            mortgageBalance: 200000,
            monthlyMortgagePayment: 2500,
            hasInvestmentProperty: true,
            investmentPropertyValue: 500000,
            weeklyRentalIncome: 500,
            annualPropertyExpenses: 5000,
            propertyGrowthRate: 0.04,
            inflation: 0.026,
            investmentReturn: 0.07,
            superReturn: 0.075,
            salaryGrowthRate: 0.02,
        };
        const baseline = buildReverseBaselineFromForwardScenario(raw);
        expect(baseline.inputs.cashSavings).toBe(50000);
        expect(baseline.inputs.stocksPortfolio).toBe(100000);
        expect(baseline.inputs.monthlyInvestment).toBe(1000);
        expect(baseline.inputs.inflation).toBe(0.026);
        expect(baseline.inputs.investmentReturn).toBe(0.07);
        expect(baseline.inputs.superReturn).toBe(0.075);
    });

    test('normalises advanced-v2 field names', () => {
        const raw = {
            age: 45,
            retireAge: 67,
            lifespan: 90,
            salary: 100000,
            superBal: 250000,
            cash: 50000,
            stocks: 100000,
            monthlyStockContrib: 1000,
            mortgage: 200000,
            monthlyMortgagePayment: 2500,
            investmentProperty: true,
            ipValue: 500000,
            ipWeeklyRent: 500,
            ipAnnualExpenses: 5000,
            inflation: 2.6,
            invReturn: 7,
            superGrowth: 7.5,
        };
        const baseline = buildReverseBaselineFromForwardScenario(raw);
        expect(baseline.inputs.cashSavings).toBe(50000);
        expect(baseline.inputs.stocksPortfolio).toBe(100000);
        expect(baseline.inputs.monthlyInvestment).toBe(1000);
        expect(baseline.inputs.inflation).toBe(2.6);
        expect(baseline.inputs.investmentReturn).toBe(7);
        expect(baseline.inputs.superReturn).toBe(7.5);
    });

    test('warns when mortgage exists without payment', () => {
        const raw = {
            yourCurrentAge: 45,
            retirementAge: 67,
            yourSalary: 100000,
            yourCurrentSuper: 200000,
            mortgageBalance: 300000,
            monthlyMortgagePayment: 0,
        };
        const baseline = buildReverseBaselineFromForwardScenario(raw);
        expect(baseline.warnings.length).toBeGreaterThan(0);
        expect(baseline.warnings.some(w => w.includes('Mortgage'))).toBe(true);
    });

    test('warns when retirement age <= current age', () => {
        const raw = {
            yourCurrentAge: 65,
            retirementAge: 60,
            yourSalary: 100000,
            yourCurrentSuper: 200000,
        };
        const baseline = buildReverseBaselineFromForwardScenario(raw);
        expect(baseline.warnings.length).toBeGreaterThan(0);
    });
});

// ---------------------------------------------------------------------------
// 4. importForwardScenario handles localStorage
// ---------------------------------------------------------------------------

describe('importForwardScenario', () => {
    beforeEach(() => {
        const store = {};
        jest.spyOn(Storage.prototype, 'setItem').mockImplementation((key, val) => { store[key] = String(val); });
        jest.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => store[key] || null);
    });

    test('returns exists:false when no data in localStorage', () => {
        const baseline = importForwardScenario();
        expect(baseline.exists).toBe(false);
    });

    test('returns parsed baseline when data exists', () => {
        const raw = { yourCurrentAge: 45, yourSalary: 100000, yourCurrentSuper: 200000, retirementAge: 67, yourLifespan: 90 };
        localStorage.setItem('rc_forward_scenario', JSON.stringify(raw));
        const baseline = importForwardScenario();
        expect(baseline.exists).toBe(true);
        expect(baseline.inputs.currentAge).toBe(45);
    });

    test('gracefully handles invalid JSON', () => {
        jest.spyOn(Storage.prototype, 'getItem').mockImplementationOnce(() => 'not-valid-json{{{');
        const baseline = importForwardScenario();
        expect(baseline.exists).toBe(false);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });
});
