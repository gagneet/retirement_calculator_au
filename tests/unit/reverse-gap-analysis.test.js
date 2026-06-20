/**
 * tests/unit/reverse-gap-analysis.test.js
 *
 * Unit tests for the gap analysis module.
 * Tests comparison, problem detection, and severity calculation.
 */

import {
    compareCurrentToTarget,
    buildGapComparisonRow,
    buildComparisonTable,
} from '../../src/js/reverse-gap-analysis.js';

import { ENHANCED_CONFIG } from '../../src/js/config.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCurrentPath(overrides = {}) {
    return {
        sustainableIncomeToday: 60000,
        totalAssetsNominal: 1200000,
        yearsToRetirement: 20,
        inflationRate: 0.026,
        swr: 0.04,
        currentAge: 45,
        retirementAge: 65,
        lifespan: 90,
        requiredCapital: 0,
        capitalGap: 0,
        incomeGap: 0,
        meetsGoal: false,
        agePensionNominal: 31223,
        mortgageBalance: 0,
        superAtRetirement: 500000,
        estateAtLifespan: 200000,
        score: {
            superAtRetirement: 500000,
            partnerSuperAtRetirement: 100000,
            successProbability: 0.65,
            sustainableIncomeToday: 60000,
            totalAssetsNominal: 1200000,
        },
        ...overrides,
    };
}

function makeTarget(overrides = {}) {
    return {
        targetAnnualIncomeToday: 80000,
        retirementAge: 65,
        currentAge: 45,
        confidenceTarget: 0.80,
        minimumEstateToday: 100000,
        includeAgePension: true,
        householdType: 'single',
        lifespan: 90,
        ...overrides,
    };
}

// ---------------------------------------------------------------------------
// 1. Detects income shortfall
// ---------------------------------------------------------------------------

describe('compareCurrentToTarget — income shortfall', () => {
    test('detects income gap when current path is below target', () => {
        const currentPath = makeCurrentPath({ sustainableIncomeToday: 50000 });
        const target = makeTarget({ targetAnnualIncomeToday: 80000 });
        const gap = compareCurrentToTarget(currentPath, target);

        expect(gap.incomeGapToday).toBe(30000);
        expect(gap.problemFlags.some(p => p.id === 'income_shortfall')).toBe(true);
    });

    test('no income gap when current path meets target', () => {
        const currentPath = makeCurrentPath({ sustainableIncomeToday: 90000 });
        const target = makeTarget({ targetAnnualIncomeToday: 80000 });
        const gap = compareCurrentToTarget(currentPath, target);

        expect(gap.incomeGapToday).toBe(0);
        expect(gap.problemFlags.some(p => p.id === 'income_shortfall')).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// 2. Detects mortgage-at-retirement problem
// ---------------------------------------------------------------------------

describe('compareCurrentToTarget — mortgage problem', () => {
    test('flags mortgage problem when mortgage remains at retirement', () => {
        const currentPath = makeCurrentPath({ mortgageBalance: 200000 });
        const target = makeTarget();
        const gap = compareCurrentToTarget(currentPath, target);

        expect(gap.mortgageProblem).toBe(true);
        expect(gap.mortgageAtRetirement).toBe(200000);
        expect(gap.problemFlags.some(p => p.id === 'mortgage_at_retirement')).toBe(true);
    });

    test('no mortgage problem when mortgage is paid off', () => {
        const currentPath = makeCurrentPath({ mortgageBalance: 0 });
        const target = makeTarget();
        const gap = compareCurrentToTarget(currentPath, target);

        expect(gap.mortgageProblem).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// 3. Detects low-super-for-target problem
// ---------------------------------------------------------------------------

describe('compareCurrentToTarget — super gap', () => {
    test('flags low super when super is insufficient for target', () => {
        const currentPath = makeCurrentPath({
            superAtRetirement: 200000,
            score: { superAtRetirement: 200000, partnerSuperAtRetirement: 0, successProbability: 0.5 },
        });
        const target = makeTarget({ targetAnnualIncomeToday: 100000 });
        const gap = compareCurrentToTarget(currentPath, target);

        // With $100k target, 20 years, 2.6% inflation: nominal = 100k * 1.026^20 ≈ 167k
        // With AP = 31223, private needed = 167k - 31k = 136k
        // Required capital = 136k / 0.04 = 3.4M
        // Super gap = 3.4M * 0.6 - 200k = 1.84M
        expect(gap.superGapAtRetirement).toBeGreaterThan(0);
        expect(gap.problemFlags.some(p => p.id === 'low_super')).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// 4. Detects estate shortfall
// ---------------------------------------------------------------------------

describe('compareCurrentToTarget — estate gap', () => {
    test('detects estate shortfall when projected estate is below target', () => {
        const currentPath = makeCurrentPath({ estateAtLifespan: 50000 });
        const target = makeTarget({ minimumEstateToday: 200000 });
        const gap = compareCurrentToTarget(currentPath, target);

        expect(gap.estateGapToday).toBeGreaterThan(0);
        expect(gap.problemFlags.some(p => p.id === 'estate_shortfall')).toBe(true);
    });

    test('no estate gap when minimum estate is 0', () => {
        const currentPath = makeCurrentPath({ estateAtLifespan: 0 });
        const target = makeTarget({ minimumEstateToday: 0 });
        const gap = compareCurrentToTarget(currentPath, target);

        expect(gap.estateGapToday).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// 5. Detects partner super imbalance
// ---------------------------------------------------------------------------

describe('compareCurrentToTarget — partner super imbalance', () => {
    test('flags imbalance for couple with large super difference', () => {
        const currentPath = makeCurrentPath({
            score: { superAtRetirement: 500000, partnerSuperAtRetirement: 50000, successProbability: 0.7 },
        });
        const target = makeTarget({ householdType: 'couple' });
        const gap = compareCurrentToTarget(currentPath, target);

        expect(gap.problemFlags.some(p => p.id === 'partner_super_imbalance')).toBe(true);
    });

    test('no imbalance flag for single household', () => {
        const currentPath = makeCurrentPath({
            score: { superAtRetirement: 500000, partnerSuperAtRetirement: 50000, successProbability: 0.7 },
        });
        const target = makeTarget({ householdType: 'single' });
        const gap = compareCurrentToTarget(currentPath, target);

        expect(gap.problemFlags.some(p => p.id === 'partner_super_imbalance')).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// 6. Confidence gap
// ---------------------------------------------------------------------------

describe('compareCurrentToTarget — confidence gap', () => {
    test('detects low confidence', () => {
        const currentPath = makeCurrentPath({
            score: { successProbability: 0.5, superAtRetirement: 500000, partnerSuperAtRetirement: 0 },
        });
        const target = makeTarget({ confidenceTarget: 0.80 });
        const gap = compareCurrentToTarget(currentPath, target);

        expect(gap.confidenceGap).toBeCloseTo(0.3, 1);
        expect(gap.problemFlags.some(p => p.id === 'low_confidence')).toBe(true);
    });

    test('no confidence gap when above target', () => {
        const currentPath = makeCurrentPath({
            score: { successProbability: 0.9, superAtRetirement: 500000, partnerSuperAtRetirement: 0 },
        });
        const target = makeTarget({ confidenceTarget: 0.80 });
        const gap = compareCurrentToTarget(currentPath, target);

        expect(gap.confidenceGap).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// 7. buildComparisonTable
// ---------------------------------------------------------------------------

describe('buildComparisonTable', () => {
    test('returns array of comparison rows', () => {
        const currentPath = makeCurrentPath({ sustainableIncomeToday: 50000, meetsGoal: false });
        const target = makeTarget({ targetAnnualIncomeToday: 80000 });
        const gap = compareCurrentToTarget(currentPath, target);
        const rows = buildComparisonTable(gap, currentPath, target);

        expect(Array.isArray(rows)).toBe(true);
        expect(rows.length).toBeGreaterThanOrEqual(5);

        const incomeRow = rows.find(r => r.label === 'Retirement income');
        expect(incomeRow).toBeDefined();
        expect(incomeRow.hasGap).toBe(true);
    });

    test('rows have correct structure', () => {
        const currentPath = makeCurrentPath({ sustainableIncomeToday: 90000, meetsGoal: true });
        const target = makeTarget({ targetAnnualIncomeToday: 80000 });
        const gap = compareCurrentToTarget(currentPath, target);
        const rows = buildComparisonTable(gap, currentPath, target);

        rows.forEach(row => {
            expect(row).toHaveProperty('label');
            expect(row).toHaveProperty('current');
            expect(row).toHaveProperty('required');
            expect(row).toHaveProperty('gap');
            expect(row).toHaveProperty('recommendedAction');
            expect(row).toHaveProperty('hasGap');
        });
    });
});

// ---------------------------------------------------------------------------
// 8. buildGapComparisonRow
// ---------------------------------------------------------------------------

describe('buildGapComparisonRow', () => {
    test('returns formatted row with gap', () => {
        const row = buildGapComparisonRow('Test', 50000, 80000, 30000, 'Do something', '$');
        expect(row.label).toBe('Test');
        expect(row.current).toBe('$50,000');
        expect(row.required).toBe('$80,000');
        expect(row.gap).toBe('-$30,000');
        expect(row.hasGap).toBe(true);
    });

    test('returns dash for gap when no gap exists', () => {
        const row = buildGapComparisonRow('Test', 80000, 80000, 0, 'On track', '$');
        expect(row.gap).toBe('—');
        expect(row.hasGap).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// 9. Severity calculation
// ---------------------------------------------------------------------------

describe('severity calculation', () => {
    test('returns high severity when income gap > 30% of target', () => {
        const currentPath = makeCurrentPath({ sustainableIncomeToday: 40000 });
        const target = makeTarget({ targetAnnualIncomeToday: 100000 });
        const gap = compareCurrentToTarget(currentPath, target);

        expect(gap.severity).toBe('high');
    });

    test('returns low severity when income gap is small', () => {
        const currentPath = makeCurrentPath({
            sustainableIncomeToday: 100000,
            totalAssetsNominal: 5000000,
            meetsGoal: true,
            mortgageBalance: 0,
            estateAtLifespan: 500000,
            superAtRetirement: 3000000,
            score: { successProbability: 0.95, superAtRetirement: 3000000, partnerSuperAtRetirement: 0 },
        });
        const target = makeTarget({ targetAnnualIncomeToday: 80000, minimumEstateToday: 0, confidenceTarget: 0.80 });
        const gap = compareCurrentToTarget(currentPath, target);

        expect(gap.problemFlags.length).toBe(0);
        expect(gap.severity).toBe('none');
    });
});
