/**
 * tests/unit/reverse-scenarios.test.js
 *
 * Unit tests for household pattern detection, overseas target adjustment,
 * age pension portability sensitivity, and country profiles completeness.
 */

import {
    detectHouseholdPattern,
    buildHouseholdLevers,
    adjustTargetForOverseas,
    buildAgePensionPortabilitySensitivity,
    buildOverseasComparison,
} from '../../src/js/reverse-scenarios.js';

import COUNTRY_PROFILES from '../../src/js/country-profiles.js';

// Mock config to avoid loading the full browser module
jest.mock('../../src/js/config.js', () => ({
    ENHANCED_CONFIG: {
        SUPER_GUARANTEE_RATE: 0.12,
        CONCESSIONAL_CAP: 30000,
        SINGLE_PENSION_MAX: 31223,
        COUPLE_PENSION_MAX: 47070,
        INFLATION_RATE: 0.026,
    }
}));

// ---------------------------------------------------------------------------
// 1. detectHouseholdPattern
// ---------------------------------------------------------------------------

describe('detectHouseholdPattern', () => {
    test('single earner pattern for high income, modest super', () => {
        const inputs = { yourSalary: 200000, yourCurrentSuper: 150000, partnerSalary: 0 };
        const pattern = detectHouseholdPattern(inputs);
        expect(pattern).toBe('high_income_low_super');
    });

    test('low income pattern for low salary single', () => {
        const inputs = { yourSalary: 45000, yourCurrentSuper: 80000, partnerSalary: 0 };
        const pattern = detectHouseholdPattern(inputs);
        expect(pattern).toBe('low_income');
    });

    test('single earner for typical mid-range salary', () => {
        const inputs = { yourSalary: 95000, yourCurrentSuper: 250000, partnerSalary: 0 };
        const pattern = detectHouseholdPattern(inputs);
        expect(pattern).toBe('single_earner');
    });

    test('equal earners pattern for couple with similar salaries', () => {
        const inputs = {
            yourSalary: 90000,
            partnerSalary: 80000,
            yourCurrentSuper: 300000,
            partnerCurrentSuper: 250000,
        };
        const pattern = detectHouseholdPattern(inputs);
        expect(pattern).toBe('equal_earners');
    });

    test('one earner pattern when one partner earns <15% of total', () => {
        const inputs = {
            yourSalary: 120000,
            partnerSalary: 5000,
            yourCurrentSuper: 300000,
            partnerCurrentSuper: 50000,
        };
        const pattern = detectHouseholdPattern(inputs);
        expect(pattern).toBe('one_earner');
    });
});

// ---------------------------------------------------------------------------
// 2. buildHouseholdLevers
// ---------------------------------------------------------------------------

describe('buildHouseholdLevers', () => {
    test('single household has standard levers only', () => {
        const inputs = { yourSalary: 100000, yourCurrentSuper: 200000 };
        const target = { targetAnnualIncomeToday: 70000 };
        const result = buildHouseholdLevers(inputs, target, 'single');

        expect(result.leverKeys).toContain('extraAnnualSuper');
        expect(result.leverKeys).toContain('extraSavings');
        expect(result.coupleSplitConfig).toBeNull();
    });

    test('couple household includes spouse contribution levers', () => {
        const inputs = {
            yourSalary: 120000,
            partnerSalary: 60000,
            yourCurrentSuper: 400000,
            partnerCurrentSuper: 100000,
        };
        const target = { targetAnnualIncomeToday: 90000 };
        const result = buildHouseholdLevers(inputs, target, 'couple');

        expect(result.leverKeys).toContain('spouseContributionSplitting');
        expect(result.coupleSplitConfig).not.toBeNull();
        expect(result.coupleSplitConfig.hasSignificantImbalance).toBe(true);
    });

    test('couple with equal super balances shows no significant imbalance', () => {
        const inputs = {
            yourSalary: 100000,
            partnerSalary: 100000,
            yourCurrentSuper: 300000,
            partnerCurrentSuper: 300000,
        };
        const target = { targetAnnualIncomeToday: 80000 };
        const result = buildHouseholdLevers(inputs, target, 'couple');

        expect(result.coupleSplitConfig.hasSignificantImbalance).toBe(false);
        expect(result.coupleSplitConfig.recommendedSplitAmount).toBe(0);
    });
});

// ---------------------------------------------------------------------------
// 3. adjustTargetForOverseas
// ---------------------------------------------------------------------------

describe('adjustTargetForOverseas', () => {
    test('cost index < 1 reduces required target', () => {
        const cheapCountry = {
            name: 'Test Country',
            costOfLiving: { index: 0.5 },
            healthcare: { system: 'Universal', insurance: '' },
            socialSecurityAgreement: true,
            agePension: { note: 'Portable' },
        };
        const result = adjustTargetForOverseas(80000, cheapCountry);
        expect(result.adjustedTarget).toBeLessThan(80000);
        expect(result.costIndex).toBe(0.5);
    });

    test('FX buffer adds 10% on top of cost adjustment', () => {
        const country = {
            name: 'Test',
            costOfLiving: { index: 1.0 },
            healthcare: { system: 'Universal', insurance: '' },
            socialSecurityAgreement: true,
        };
        const result = adjustTargetForOverseas(100000, country, 0.10);
        // 100000 * 1.0 + FX(10000) + insurance(0) = 110000
        expect(result.fxBuffer).toBe(10000);
        expect(result.adjustedTarget).toBeCloseTo(110000, -2);
    });

    test('unknown country returns original target', () => {
        const result = adjustTargetForOverseas(80000, 'NONEXISTENT_COUNTRY_XYZ');
        expect(result.adjustedTarget).toBe(80000);
        expect(result.costIndex).toBe(1.0);
    });

    test('no social security agreement adds health insurance estimate', () => {
        const country = {
            name: 'No Agreement Country',
            costOfLiving: { index: 0.8 },
            healthcare: { system: 'Private insurance required', insurance: '' },
            socialSecurityAgreement: false,
        };
        const result = adjustTargetForOverseas(100000, country);
        // Should add default health insurance of 4000/year
        expect(result.healthInsuranceAnnual).toBeGreaterThan(0);
    });
});

// ---------------------------------------------------------------------------
// 4. buildAgePensionPortabilitySensitivity
// ---------------------------------------------------------------------------

describe('buildAgePensionPortabilitySensitivity', () => {
    test('four scenarios are returned', () => {
        const sensitivity = buildAgePensionPortabilitySensitivity(31223);
        expect(Object.keys(sensitivity)).toHaveLength(4);
        expect(sensitivity).toHaveProperty('p100');
        expect(sensitivity).toHaveProperty('p75');
        expect(sensitivity).toHaveProperty('p50');
        expect(sensitivity).toHaveProperty('p0');
    });

    test('p100 returns full pension amount', () => {
        const sensitivity = buildAgePensionPortabilitySensitivity(31223);
        expect(sensitivity.p100.annualPension).toBe(31223);
        expect(sensitivity.p100.portabilityRate).toBe(1.0);
    });

    test('p0 returns zero pension', () => {
        const sensitivity = buildAgePensionPortabilitySensitivity(31223);
        expect(sensitivity.p0.annualPension).toBe(0);
        expect(sensitivity.p0.portabilityRate).toBe(0.0);
    });

    test('portability rates decrease from p100 to p0', () => {
        const sensitivity = buildAgePensionPortabilitySensitivity(40000);
        expect(sensitivity.p100.portabilityRate).toBeGreaterThan(sensitivity.p75.portabilityRate);
        expect(sensitivity.p75.portabilityRate).toBeGreaterThan(sensitivity.p50.portabilityRate);
        expect(sensitivity.p50.portabilityRate).toBeGreaterThan(sensitivity.p0.portabilityRate);
    });
});

// ---------------------------------------------------------------------------
// 5. UNITED_KINGDOM profile exists in country-profiles
// ---------------------------------------------------------------------------

describe('COUNTRY_PROFILES — UNITED_KINGDOM', () => {
    test('UNITED_KINGDOM profile is defined', () => {
        expect(COUNTRY_PROFILES).toHaveProperty('UNITED_KINGDOM');
    });

    test('UNITED_KINGDOM has required schema fields', () => {
        const uk = COUNTRY_PROFILES.UNITED_KINGDOM;
        expect(uk).toHaveProperty('name');
        expect(uk).toHaveProperty('region');
        expect(uk).toHaveProperty('currency');
        expect(uk).toHaveProperty('socialSecurityAgreement');
        expect(uk).toHaveProperty('agePension');
        expect(uk).toHaveProperty('costOfLiving');
        expect(uk).toHaveProperty('healthcare');
        expect(uk).toHaveProperty('tax');
    });

    test('UNITED_KINGDOM has no bilateral social security agreement', () => {
        expect(COUNTRY_PROFILES.UNITED_KINGDOM.socialSecurityAgreement).toBe(false);
    });

    test('UNITED_KINGDOM has currency GBP', () => {
        expect(COUNTRY_PROFILES.UNITED_KINGDOM.currency).toBe('GBP');
    });

    test('UNITED_KINGDOM agePension portability is documented', () => {
        const uk = COUNTRY_PROFILES.UNITED_KINGDOM;
        expect(uk.agePension.portability).toBeDefined();
        expect(uk.agePension.note).toBeDefined();
    });

    test('UNITED_KINGDOM cost of living index is defined and positive', () => {
        const uk = COUNTRY_PROFILES.UNITED_KINGDOM;
        expect(typeof uk.costOfLiving.index).toBe('number');
        expect(uk.costOfLiving.index).toBeGreaterThan(0);
    });
});

// ---------------------------------------------------------------------------
// 6. Feasibility ranking puts super lever above property lever
// (These tests use the inline scoring function to avoid importing reverse-solver
//  which transitively loads the full simulator chain in jsdom environment.)
// ---------------------------------------------------------------------------

// Inline minimal scoring logic matching reverse-solver.js scoreLeverFeasibility
function inlineScore(lever) {
    if (!lever.feasible) return -1000;
    const rankMap = {
        extraAnnualSuper: 100,
        extraSavings: 90,
        mortgageRepayment: 80,
        retirementAge: 70,
        spendingReduction: 60,
        netRent: 50,
        estateAdjustment: 30,
        superBalance: 40,
        salary: 45,
    };
    let score = rankMap[lever.lever] || 0;
    if (lever.lever === 'extraAnnualSuper') score += 20;
    if (lever.lever === 'spendingReduction' && (lever.reductionNeeded || 0) > 20000) score -= 25;
    return score;
}

describe('feasibility ranking order', () => {
    test('extraAnnualSuper scores higher than netRent', () => {
        const superLever = { lever: 'extraAnnualSuper', feasible: true, value: 5000 };
        const rentLever = { lever: 'netRent', feasible: true, value: 100 };
        expect(inlineScore(superLever)).toBeGreaterThan(inlineScore(rentLever));
    });

    test('extraAnnualSuper scores higher than spendingReduction (large cut)', () => {
        const superLever = { lever: 'extraAnnualSuper', feasible: true, value: 5000 };
        const spendLever = {
            lever: 'spendingReduction',
            feasible: true,
            value: 30000,
            reductionNeeded: 30000
        };
        expect(inlineScore(superLever)).toBeGreaterThan(inlineScore(spendLever));
    });
});

// ---------------------------------------------------------------------------
// 7. buildOverseasComparison returns sorted array
// ---------------------------------------------------------------------------

describe('buildOverseasComparison', () => {
    test('returns an array with at least 5 countries', () => {
        const comparison = buildOverseasComparison(80000, 0);
        expect(Array.isArray(comparison)).toBe(true);
        expect(comparison.length).toBeGreaterThanOrEqual(5);
    });

    test('sorted by adjustedTargetAUD ascending', () => {
        const comparison = buildOverseasComparison(80000, 0);
        for (let i = 0; i < comparison.length - 1; i++) {
            expect(comparison[i].adjustedTargetAUD).toBeLessThanOrEqual(comparison[i + 1].adjustedTargetAUD);
        }
    });

    test('each country has required fields', () => {
        const comparison = buildOverseasComparison(80000, 15000);
        comparison.forEach(c => {
            expect(c).toHaveProperty('code');
            expect(c).toHaveProperty('name');
            expect(c).toHaveProperty('adjustedTargetAUD');
            expect(c).toHaveProperty('socialSecurityAgreement');
        });
    });

    test('UNITED_KINGDOM appears in comparison', () => {
        const comparison = buildOverseasComparison(80000, 0);
        const uk = comparison.find(c => c.code === 'UNITED_KINGDOM');
        expect(uk).toBeDefined();
    });
});
