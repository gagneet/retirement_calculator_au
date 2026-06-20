/**
 * tests/integration/reverse-forward-bridge.test.js
 *
 * Integration tests for the forward-to-reverse calculator bridge.
 * Tests that:
 *  1. rc_forward_scenario is stored correctly by app.js
 *  2. Reverse page imports it correctly
 *  3. Baseline summary is generated
 *  4. Comparison table uses imported values
 *  5. rc_forward_projection_v1 stores and loads complete result
 *
 * Uses actual modules (not mocked) where possible.
 */

import {
    buildReverseBaselineFromForwardScenario,
    importForwardScenario,
    storeForwardScenario,
} from '../../src/js/reverse-baseline-adapter.js';
import {
    buildForwardProjectionPayload,
    loadForwardProjection,
    storeForwardProjection,
    extractCurrentPathFromProjection,
    FORWARD_PROJECTION_STORAGE_KEY,
} from '../../src/js/forward-projection-bridge.js';

// ---------------------------------------------------------------------------
// 1. Stores rc_forward_scenario
// ---------------------------------------------------------------------------

describe('storeForwardScenario', () => {
    beforeEach(() => {
        const store = {};
        jest.spyOn(Storage.prototype, 'setItem').mockImplementation((key, val) => { store[key] = String(val); });
        jest.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => store[key] || null);
        jest.spyOn(Storage.prototype, 'removeItem').mockImplementation((key) => { delete store[key]; });
    });

    test('stores forward scenario to localStorage', () => {
        const inputs = { yourCurrentAge: 45, yourSalary: 100000, yourCurrentSuper: 300000 };
        const result = storeForwardScenario(inputs);
        expect(result).toBe(true);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });
});

// ---------------------------------------------------------------------------
// 5. rc_forward_projection_v1 bridge
// ---------------------------------------------------------------------------

describe('forward-projection-bridge integration', () => {
    beforeEach(() => {
        const store = {};
        jest.spyOn(Storage.prototype, 'setItem').mockImplementation((key, val) => { store[key] = String(val); });
        jest.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => store[key] || null);
        jest.spyOn(Storage.prototype, 'removeItem').mockImplementation((key) => { delete store[key]; });
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('stores and loads complete projection payload', () => {
        const payload = buildForwardProjectionPayload({
            source: 'advanced-v2',
            input: { age: 49, retireAge: 71, desiredIncome: 80000, household: 'couple' },
            engineInputs: { yourCurrentAge: 49, retirementAge: 71 },
            simulation: {
                yearlyData: [
                    { age: 71, endSuperBalance: 4600000, endBalance: 5476000, pensionIncome: 0 }
                ]
            },
            adaptedResult: {
                monthlyPaycheck: 20088,
                superAtRetire: 4600000,
                lastsUntil: 94,
                confidence: 0.98,
                gapMonthly: 0,
            },
        });

        storeForwardProjection(payload);
        const loaded = loadForwardProjection();
        expect(loaded).not.toBeNull();
        expect(loaded.source).toBe('advanced-v2');
        expect(loaded.summary.monthlyRetirementIncomeToday).toBe(20088);
    });

    test('reverse display model shows same values as source', () => {
        const payload = buildForwardProjectionPayload({
            source: 'advanced-v2',
            input: { age: 49, retireAge: 71, desiredIncome: 80000, household: 'couple' },
            engineInputs: { yourCurrentAge: 49, retirementAge: 71 },
            simulation: {
                yearlyData: [
                    { age: 71, endSuperBalance: 4600000, endBalance: 5476000, pensionIncome: 0 }
                ]
            },
            adaptedResult: {
                monthlyPaycheck: 20088,
                superAtRetire: 4600000,
                lastsUntil: 94,
                confidence: 0.98,
                gapMonthly: 0,
            },
        });

        const currentPath = extractCurrentPathFromProjection(payload);

        // Reverse current path must match projection summary values, not SWR
        expect(currentPath.currentMonthlyIncomeToday).toBe(payload.summary.monthlyRetirementIncomeToday);
        expect(currentPath.currentAnnualIncomeToday).toBe(payload.summary.annualRetirementIncomeToday);
        expect(currentPath.superAtRetirement).toBe(payload.summary.superAtRetirementToday);
        expect(currentPath.confidence).toBe(payload.summary.confidence);
    });

    test('legacy storage still works alongside new bridge', () => {
        const legacyInput = { yourCurrentAge: 50, yourSalary: 100000 };
        storeForwardScenario(legacyInput);

        const payload = buildForwardProjectionPayload({
            source: 'advanced-v2',
            input: { age: 49, retireAge: 71 },
            simulation: { yearlyData: [] },
            adaptedResult: { monthlyPaycheck: 15000 },
        });
        storeForwardProjection(payload);

        // New payload should be stored under separate key
        expect(localStorage.setItem).toHaveBeenCalledWith(
            FORWARD_PROJECTION_STORAGE_KEY,
            expect.any(String)
        );
        // New payload should be loadable
        const loaded = loadForwardProjection();
        expect(loaded.source).toBe('advanced-v2');
        // Legacy still works
        const legacy = importForwardScenario();
        expect(legacy.exists).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// 2. Reverse page imports it
// ---------------------------------------------------------------------------

describe('importForwardScenario', () => {
    beforeEach(() => {
        const store = {};
        jest.spyOn(Storage.prototype, 'setItem').mockImplementation((key, val) => { store[key] = String(val); });
        jest.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => store[key] || null);
    });

    test('imports previously stored forward scenario', () => {
        const stored = { yourCurrentAge: 50, yourSalary: 120000, yourCurrentSuper: 400000, retirementAge: 67, yourLifespan: 90 };
        storeForwardScenario(stored);

        const baseline = importForwardScenario();
        expect(baseline.exists).toBe(true);
        expect(baseline.inputs.currentAge).toBe(50);
        expect(baseline.inputs.annualSalary).toBe(120000);
        expect(baseline.inputs.currentSuperBalance).toBe(400000);
    });

    test('returns exists:false when no scenario stored', () => {
        const baseline = importForwardScenario();
        expect(baseline.exists).toBe(false);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });
});

// ---------------------------------------------------------------------------
// 3. Imported baseline summary appears
// ---------------------------------------------------------------------------

describe('baseline display summary', () => {
    test('display summary includes key financial data', () => {
        const stored = {
            yourCurrentAge: 45,
            retirementAge: 67,
            yourLifespan: 90,
            yourSalary: 100000,
            yourCurrentSuper: 250000,
            homeValue: 800000,
            mortgageBalance: 200000,
            currentSavings: 50000,
            currentStocks: 100000,
        };
        const baseline = buildReverseBaselineFromForwardScenario(stored);

        expect(baseline.displaySummary).toContain('45');
        expect(baseline.displaySummary).toContain('100,000');
        expect(baseline.displaySummary).toContain('250,000');
        expect(baseline.displaySummary).toContain('800,000');
        expect(baseline.displaySummary).toContain('200,000');
    });

    test('display summary for couple includes partner info', () => {
        const stored = {
            yourCurrentAge: 45,
            partnerCurrentAge: 43,
            retirementAge: 67,
            yourLifespan: 90,
            yourSalary: 100000,
            partnerSalary: 80000,
            yourCurrentSuper: 250000,
            partnerCurrentSuper: 150000,
            isCouple: true,
        };
        const baseline = buildReverseBaselineFromForwardScenario(stored);

        expect(baseline.displaySummary).toContain('Partner');
        expect(baseline.displaySummary).toContain('80,000');
        expect(baseline.displaySummary).toContain('150,000');
    });
});

// ---------------------------------------------------------------------------
// 4. Comparison table uses imported values
// ---------------------------------------------------------------------------

describe('comparison table integration', () => {
    test('buildReverseBaselineFromForwardScenario produces inputs usable by normaliseReversePlannerInputs', () => {
        const stored = {
            yourCurrentAge: 45,
            retirementAge: 67,
            yourLifespan: 90,
            yourSalary: 120000,
            yourCurrentSuper: 300000,
            currentSavings: 50000,
            currentStocks: 100000,
            monthlyStockContribution: 1000,
            homeowner: true,
            homeValue: 800000,
            mortgageBalance: 0,
            mortgageRate: 0.06,
            monthlyMortgagePayment: 0,
            hasInvestmentProperty: false,
            inflation: 0.026,
            investmentReturn: 0.07,
            superReturn: 0.075,
            salaryGrowthRate: 0.02,
            employerSuperContributionRate: 0.12,
        };

        const baseline = buildReverseBaselineFromForwardScenario(stored);
        expect(baseline.exists).toBe(true);

        // Verify all key fields exist and have sensible values
        expect(baseline.inputs.currentAge).toBeGreaterThan(0);
        expect(baseline.inputs.retirementAge).toBeGreaterThan(baseline.inputs.currentAge);
        expect(baseline.inputs.annualSalary).toBeGreaterThan(0);
        expect(baseline.inputs.currentSuperBalance).toBeGreaterThan(0);
        expect(typeof baseline.inputs.homeowner).toBe('boolean');
        expect(baseline.inputs.inflation).toBeGreaterThan(0);
        expect(baseline.inputs.investmentReturn).toBeGreaterThan(0);

        // These values should match the stored input
        expect(baseline.inputs.currentAge).toBe(45);
        expect(baseline.inputs.annualSalary).toBe(120000);
        expect(baseline.inputs.currentSuperBalance).toBe(300000);
    });

    test('baseline adapter preserves investment property details', () => {
        const stored = {
            yourCurrentAge: 45,
            retirementAge: 67,
            yourSalary: 100000,
            yourCurrentSuper: 200000,
            hasInvestmentProperty: true,
            investmentPropertyValue: 500000,
            weeklyRentalIncome: 600,
            annualPropertyExpenses: 8000,
            propertyGrowthRate: 0.04,
        };

        const baseline = buildReverseBaselineFromForwardScenario(stored);
        expect(baseline.inputs.hasInvestmentProperty).toBe(true);
        expect(baseline.inputs.investmentPropertyValue).toBe(500000);
        expect(baseline.inputs.weeklyRentalIncome).toBe(600);
    });

    test('baseline adapter handles both naming conventions for mortgage', () => {
        // advanced-classic naming
        const classic = buildReverseBaselineFromForwardScenario({
            mortgageBalance: 250000,
            monthlyMortgagePayment: 3000,
        });
        expect(classic.inputs.mortgageBalance).toBe(250000);

        // advanced-v2 naming
        const v2 = buildReverseBaselineFromForwardScenario({
            retireAge: 67,
            mortgage: 300000,
            monthlyMortgagePayment: 3500,
        });
        expect(v2.inputs.mortgageBalance).toBe(300000);
    });
});

// ---------------------------------------------------------------------------
// 5. Source detection
// ---------------------------------------------------------------------------

describe('source detection', () => {
    test('detects advanced-classic format', () => {
        const raw = { yourCurrentAge: 45, householdStatus: 'single' };
        const baseline = buildReverseBaselineFromForwardScenario(raw);
        expect(baseline.source).toBe('advanced-classic');
    });

    test('detects advanced-v2 format', () => {
        const raw = { age: 45, household: 'single' };
        const baseline = buildReverseBaselineFromForwardScenario(raw);
        expect(baseline.source).toBe('advanced-v2');
    });

    test('detects unknown format', () => {
        const raw = { foo: 'bar' };
        const baseline = buildReverseBaselineFromForwardScenario(raw);
        expect(baseline.source).toBe('unknown');
    });
});
