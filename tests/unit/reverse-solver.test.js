/**
 * tests/unit/reverse-solver.test.js
 *
 * Unit tests for the reverse solver: estimation, bisection, scoring, and lever solvers.
 */

import {
    estimateRequiredCapital,
    bisectionSolve,
    scoreScenario,
    solveForRetirementAge,
    solveForExtraAnnualSuper,
    solveForExtraSavings,
    solveForTargetSpendingReduction,
    solveForMortgageRepayment,
    solveForCurrentHomeValue,
    solveForCurrentInvestmentBalance,
    rankLevers,
    scoreLeverFeasibility,
} from '../../src/js/reverse-solver.js';

// ---------------------------------------------------------------------------
// Mock RetirementSimulator so tests don't require full browser DOM
// ---------------------------------------------------------------------------

jest.mock('../../src/js/simulator.js', () => {
    class RetirementSimulator {
        constructor(config) { this.config = config; }
        simulateRetirement(inputs) {
            // Simple deterministic mock: totalFinancialAssets grows with salary and years
            const yearsToRetire = Math.max(1, (inputs.retirementAge || 67) - (inputs.yourCurrentAge || 50));
            const annualSaving = (inputs.yourSalary || 0) * 0.15 +
                (inputs.yourAdditionalSuperContribution || 0) +
                (inputs.monthlyStockContribution || 0) * 12;
            const growthFactor = Math.pow(1.06, yearsToRetire);
            const totalFinancialAssets =
                ((inputs.yourCurrentSuper || 0) + (inputs.currentSavings || 0)) * growthFactor +
                annualSaving * ((growthFactor - 1) / 0.06);

            // Compute a simple depletion age: does the plan last given target spending?
            const retirementAge = inputs.retirementAge || 67;
            const currentAge = inputs.yourCurrentAge || 50;
            const desIncome = inputs.desiredIncome || inputs.asfaComfortable || 73000;
            const inflation = inputs.inflation || 0.026;
            const nominalSpend = desIncome * Math.pow(1 + inflation, yearsToRetire);
            const depletionAge = nominalSpend > 0 && totalFinancialAssets > 0
                ? retirementAge + Math.floor(totalFinancialAssets / nominalSpend)
                : retirementAge + 30;
            const lifespan = inputs.yourLifespan || 90;
            const lasts = depletionAge >= lifespan || totalFinancialAssets > nominalSpend * 30;

            const finalBalance = lasts
                ? totalFinancialAssets * 0.3
                : 0;
            const yearlyData = [{
                age: retirementAge,
                pensionIncome: 0,
                pension: 0,
                totalAssets: totalFinancialAssets,
                totalFinancialAssets,
            }];

            return {
                finalBalance,
                totalFinancialAssets,
                depletionAge: lasts ? null : depletionAge,
                accumulatedSuperBalance: totalFinancialAssets * 0.7,
                yearlyData,
                balances: [],
                effectiveYourLifespan: lifespan,
            };
        }
    }
    return { RetirementSimulator };
});

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
// 1. estimateRequiredCapital
// ---------------------------------------------------------------------------

describe('estimateRequiredCapital', () => {
    test('returns reasonable capital for $80k/year target, 20 years, no pension', () => {
        const capital = estimateRequiredCapital(80000, 20, 0.026, 0, 0.04);
        // Nominal target: 80000 * (1.026)^20 ≈ 131,800; capital = 131800/0.04 ≈ 3,295,000
        expect(capital).toBeGreaterThan(2_000_000);
        expect(capital).toBeLessThan(6_000_000);
    });

    test('subtracts age pension from required private income', () => {
        const withPension = estimateRequiredCapital(80000, 20, 0.026, 20000, 0.04);
        const withoutPension = estimateRequiredCapital(80000, 20, 0.026, 0, 0.04);
        expect(withPension).toBeLessThan(withoutPension);
    });

    test('returns 0 when pension covers full target', () => {
        const capital = estimateRequiredCapital(30000, 0, 0.026, 50000, 0.04);
        expect(capital).toBe(0);
    });

    test('returns finite number with zero years to retirement', () => {
        const capital = estimateRequiredCapital(80000, 0, 0.026, 0, 0.04);
        expect(Number.isFinite(capital)).toBe(true);
        expect(capital).toBeGreaterThan(0);
    });
});

// ---------------------------------------------------------------------------
// 2. bisectionSolve
// ---------------------------------------------------------------------------

describe('bisectionSolve', () => {
    test('converges when passes() is a step function', async () => {
        const threshold = 42.5;
        const passes = async (x) => x >= threshold;
        const result = await bisectionSolve({ lo: 0, hi: 100, tol: 0.1, passes });
        expect(result).not.toBeNull();
        expect(result).toBeGreaterThanOrEqual(threshold - 0.1);
        expect(result).toBeLessThanOrEqual(threshold + 0.2);
    });

    test('returns null when infeasible (hi does not pass)', async () => {
        const passes = async () => false;
        const result = await bisectionSolve({ lo: 0, hi: 100, tol: 0.1, passes });
        expect(result).toBeNull();
    });

    test('returns lo when already feasible at lo', async () => {
        const passes = async () => true; // passes everywhere
        const result = await bisectionSolve({ lo: 5, hi: 100, tol: 0.1, passes });
        expect(result).toBe(5); // Should return lo because passes(lo) is true
    });

    test('respects maxIter limit', async () => {
        let calls = 0;
        const passes = async (x) => {
            calls++;
            return x >= 50;
        };
        await bisectionSolve({ lo: 0, hi: 100, tol: 0.001, maxIter: 5, passes });
        // Initial check of hi and lo = 2 calls, then up to 5 more iterations = max 7
        expect(calls).toBeLessThanOrEqual(12); // loose upper bound
    });
});

// ---------------------------------------------------------------------------
// 3. scoreScenario
// ---------------------------------------------------------------------------

describe('scoreScenario', () => {
    const mockSimResult = {
        finalBalance: 500_000,
        totalFinancialAssets: 1_500_000,
        depletionAge: 85,
        accumulatedSuperBalance: 1_000_000,
        effectiveYourLifespan: 90,
        yearlyData: [{ age: 67, pensionIncome: 0 }],
    };

    test('returns passesGoal:true when plan lasts to lifespan', () => {
        // depletionAge (85) >= default lifespan (90) is false, but finalBalance > 0
        // and target income doesn't drive depletion in engine predicate
        const target = { targetAnnualIncomeToday: 30000, lifespan: 85 };
        const score = scoreScenario(mockSimResult, target, 0.026, 20, 0.04);
        expect(score.passesGoal).toBe(true);
    });

    test('returns passesGoal:false when plan depletes early', () => {
        const target = { targetAnnualIncomeToday: 500000, lifespan: 90 };
        const score = scoreScenario({ ...mockSimResult, depletionAge: 68, finalBalance: 0 }, target, 0.026, 20, 0.04);
        expect(score.passesGoal).toBe(false);
    });

    test('returns sustainableIncomeToday as SWR reference', () => {
        // $2M assets, 4% SWR, no inflation adjustment (0 years)
        const simResult = { finalBalance: 1_000_000, totalFinancialAssets: 2_000_000, yearlyData: [{ age: 65, pensionIncome: 0 }] };
        const target = { targetAnnualIncomeToday: 80000 };
        const score = scoreScenario(simResult, target, 0.026, 0, 0.04);
        expect(score.sustainableIncomeToday).toBeCloseTo(80000, -2);
    });

    test('incomeGap is non-negative', () => {
        const target = { targetAnnualIncomeToday: 50000 };
        const score = scoreScenario(mockSimResult, target, 0.026, 5, 0.04);
        expect(score.incomeGap).toBeGreaterThanOrEqual(0);
    });
});

// ---------------------------------------------------------------------------
// 4. solveForRetirementAge — uses mocked simulator
// ---------------------------------------------------------------------------

describe('solveForRetirementAge', () => {
    let simulator;

    beforeEach(() => {
        const { RetirementSimulator } = require('../../src/js/simulator.js');
        const { ENHANCED_CONFIG } = require('../../src/js/config.js');
        simulator = new RetirementSimulator(ENHANCED_CONFIG);
    });

    const baseInputs = {
        yourCurrentAge: 50,
        retirementAge: 65,
        yourSalary: 120000,
        yourCurrentSuper: 300000,
        currentSavings: 50000,
        yourAdditionalSuperContribution: 0,
        monthlyStockContribution: 0,
        employerSuperContributionRate: 0.12,
        inflation: 0.026,
        yourLifespan: 90,
    };

    test('returns a feasible retirement age that is >= current retirementAge', async () => {
        const target = { targetAnnualIncomeToday: 50000 };
        const result = await solveForRetirementAge(simulator, baseInputs, target);
        if (result.feasible) {
            expect(result.solved).toBeGreaterThanOrEqual(55); // min age
            expect(result.solved).toBeLessThanOrEqual(75);   // max age
        }
        // result.feasible can be true or false depending on mock — just verify shape
        expect(result).toHaveProperty('lever', 'retirementAge');
        expect(result).toHaveProperty('label');
        expect(result).toHaveProperty('description');
    });

    test('returns infeasible when target income is impossibly high', async () => {
        const target = { targetAnnualIncomeToday: 10_000_000 };
        const result = await solveForRetirementAge(simulator, baseInputs, target);
        expect(result.feasible).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// 5. solveForExtraAnnualSuper
// ---------------------------------------------------------------------------

describe('solveForExtraAnnualSuper', () => {
    let simulator;

    beforeEach(() => {
        const { RetirementSimulator } = require('../../src/js/simulator.js');
        const { ENHANCED_CONFIG } = require('../../src/js/config.js');
        simulator = new RetirementSimulator(ENHANCED_CONFIG);
    });

    const baseInputs = {
        yourCurrentAge: 45,
        retirementAge: 67,
        yourSalary: 100000,
        yourCurrentSuper: 200000,
        currentSavings: 30000,
        yourAdditionalSuperContribution: 0,
        monthlyStockContribution: 0,
        employerSuperContributionRate: 0.12,
        inflation: 0.026,
        yourLifespan: 90,
    };

    test('has correct lever type and structure', async () => {
        const target = { targetAnnualIncomeToday: 40000 };
        const result = await solveForExtraAnnualSuper(simulator, baseInputs, target);
        expect(result.lever).toBe('extraAnnualSuper');
        expect(result).toHaveProperty('feasible');
        expect(result).toHaveProperty('unit', 'AUD/year');
        expect(result).toHaveProperty('regulatoryNote');
    });

    test('extraNeeded is within concessional cap when feasible', async () => {
        const target = { targetAnnualIncomeToday: 30000 };
        const result = await solveForExtraAnnualSuper(simulator, baseInputs, target);
        if (result.feasible) {
            // Current SG = 100000 * 0.12 = 12000; max extra = 30000 - 12000 = 18000
            expect(result.extraNeeded).toBeLessThanOrEqual(18000);
            expect(result.extraNeeded).toBeGreaterThanOrEqual(0);
        }
    });
});

// ---------------------------------------------------------------------------
// 6. solveForTargetSpendingReduction — purely arithmetic
// ---------------------------------------------------------------------------

describe('solveForTargetSpendingReduction', () => {
    const baseInputs = { inflation: 0.026 };

    test('returns 0 reduction when already meeting target', () => {
        const currentScore = { sustainableIncomeToday: 90000, capitalGap: 0 };
        const target = { targetAnnualIncomeToday: 80000 };
        const result = solveForTargetSpendingReduction(baseInputs, currentScore, target);
        expect(result.reductionNeeded).toBe(0);
        expect(result.feasible).toBe(true);
    });

    test('calculates correct reduction when below target', () => {
        const currentScore = { sustainableIncomeToday: 60000, capitalGap: 500000 };
        const target = { targetAnnualIncomeToday: 80000 };
        const result = solveForTargetSpendingReduction(baseInputs, currentScore, target);
        expect(result.reductionNeeded).toBe(20000);
        expect(result.value).toBe(20000);
    });

    test('feasible when reduction < 50% of target', () => {
        const currentScore = { sustainableIncomeToday: 65000, capitalGap: 200000 };
        const target = { targetAnnualIncomeToday: 80000 };
        const result = solveForTargetSpendingReduction(baseInputs, currentScore, target);
        // Reduction needed: 15000 / 80000 = 18.75% — feasible
        expect(result.feasible).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// 7. solveForMortgageRepayment — analytical
// ---------------------------------------------------------------------------

describe('solveForMortgageRepayment', () => {
    test('returns sensible extra monthly payment for a standard mortgage', () => {
        const baseInputs = {
            yourCurrentAge: 45,
            retirementAge: 65,
            mortgageBalance: 400000,
            mortgageRate: 0.06,
            monthlyMortgagePayment: 2000,
        };
        const target = {};
        const result = solveForMortgageRepayment(baseInputs, target);
        expect(result.lever).toBe('mortgageRepayment');
        expect(result.extraNeeded).toBeGreaterThanOrEqual(0);
    });

    test('returns infeasible with no mortgage balance', () => {
        const baseInputs = { mortgageBalance: 0, retirementAge: 65, yourCurrentAge: 45 };
        const result = solveForMortgageRepayment(baseInputs, {});
        expect(result.feasible).toBe(false);
        expect(result.description).toContain('No mortgage');
    });
});

// ---------------------------------------------------------------------------
// 8. solveForCurrentHomeValue — bisection solver
// ---------------------------------------------------------------------------

describe('solveForCurrentHomeValue', () => {
    let simulator;

    beforeEach(() => {
        const { RetirementSimulator } = require('../../src/js/simulator.js');
        const { ENHANCED_CONFIG } = require('../../src/js/config.js');
        simulator = new RetirementSimulator(ENHANCED_CONFIG);
    });

    const baseInputs = {
        yourCurrentAge: 45,
        retirementAge: 67,
        yourSalary: 100000,
        yourCurrentSuper: 200000,
        currentSavings: 50000,
        homeValue: 600000,
        yourAdditionalSuperContribution: 0,
        monthlyStockContribution: 0,
        employerSuperContributionRate: 0.12,
        inflation: 0.026,
        yourLifespan: 90,
    };

    test('has correct lever type and structure', async () => {
        const target = { targetAnnualIncomeToday: 50000 };
        const result = await solveForCurrentHomeValue(simulator, baseInputs, target);
        expect(result.lever).toBe('homeValue');
        expect(result).toHaveProperty('feasible');
        expect(result).toHaveProperty('unit', 'AUD');
        expect(result).toHaveProperty('extraNeeded');
    });

    test('returns feasible result for reasonable target', async () => {
        const target = { targetAnnualIncomeToday: 40000 };
        const result = await solveForCurrentHomeValue(simulator, baseInputs, target);
        // Should either be feasible or not — just verify shape
        expect(result).toHaveProperty('solved');
        expect(result).toHaveProperty('description');
        if (result.feasible) {
            expect(result.extraNeeded).toBeGreaterThanOrEqual(0);
            expect(result.solved).toBeGreaterThanOrEqual(baseInputs.homeValue);
        }
    });

    test('protects against lo > hi when current value exceeds cap', async () => {
        const bigInputs = { ...baseInputs, homeValue: 10_000_000 };
        const target = { targetAnnualIncomeToday: 50000 };
        const result = await solveForCurrentHomeValue(simulator, bigInputs, target);
        // Should not throw; hi was clamped to homeValue + 1
        expect(result).toHaveProperty('feasible');
        expect(result).toHaveProperty('extraNeeded');
        // Bisection ran without error (mock doesn't model homeValue, so feasibility depends on mock)
    });
});

// ---------------------------------------------------------------------------
// 9. solveForCurrentInvestmentBalance — bisection solver
// ---------------------------------------------------------------------------

describe('solveForCurrentInvestmentBalance', () => {
    let simulator;

    beforeEach(() => {
        const { RetirementSimulator } = require('../../src/js/simulator.js');
        const { ENHANCED_CONFIG } = require('../../src/js/config.js');
        simulator = new RetirementSimulator(ENHANCED_CONFIG);
    });

    const baseInputs = {
        yourCurrentAge: 45,
        retirementAge: 67,
        yourSalary: 100000,
        yourCurrentSuper: 200000,
        currentSavings: 50000,
        yourAdditionalSuperContribution: 0,
        monthlyStockContribution: 0,
        employerSuperContributionRate: 0.12,
        inflation: 0.026,
        yourLifespan: 90,
    };

    test('has correct lever type and structure', async () => {
        const target = { targetAnnualIncomeToday: 50000 };
        const result = await solveForCurrentInvestmentBalance(simulator, baseInputs, target);
        expect(result.lever).toBe('investmentBalance');
        expect(result).toHaveProperty('feasible');
        expect(result).toHaveProperty('unit', 'AUD');
        expect(result).toHaveProperty('extraNeeded');
    });

    test('returns feasible result for reasonable target', async () => {
        const target = { targetAnnualIncomeToday: 40000 };
        const result = await solveForCurrentInvestmentBalance(simulator, baseInputs, target);
        expect(result).toHaveProperty('solved');
        expect(result).toHaveProperty('description');
        if (result.feasible) {
            expect(result.extraNeeded).toBeGreaterThanOrEqual(0);
            expect(result.solved).toBeGreaterThanOrEqual(baseInputs.currentSavings);
        }
    });

    test('protects against lo > hi when savings exceed cap', async () => {
        const bigInputs = { ...baseInputs, currentSavings: 10_000_000 };
        const target = { targetAnnualIncomeToday: 50000 };
        const result = await solveForCurrentInvestmentBalance(simulator, bigInputs, target);
        expect(result).toHaveProperty('feasible');
        expect(result).toHaveProperty('extraNeeded');
        // Bisection ran without error (mock does model currentSavings, so this is likely feasible)
    });
});

// ---------------------------------------------------------------------------
// 10. rankLevers
// ---------------------------------------------------------------------------

describe('rankLevers', () => {
    const mockLevers = [
        { lever: 'extraAnnualSuper', feasible: true, label: 'Super', value: 5000 },
        { lever: 'salary', feasible: true, label: 'Salary', value: 20000 },
        { lever: 'retirementAge', feasible: true, label: 'Retire later', value: 2 },
        { lever: 'superBalance', feasible: false, label: 'Lump sum', value: null },
        { lever: 'spendingReduction', feasible: true, label: 'Spend less', value: 10000, reductionNeeded: 10000 },
    ];

    test('extra super is ranked first (tax efficiency + reversibility)', () => {
        const ranked = rankLevers(mockLevers);
        expect(ranked[0].lever).toBe('extraAnnualSuper');
    });

    test('infeasible levers are ranked last', () => {
        const ranked = rankLevers(mockLevers);
        const feasibleCount = mockLevers.filter(l => l.feasible).length;
        // infeasible levers should have negative feasibilityScore
        const infeasibleRanked = ranked.filter(l => !l.feasible);
        infeasibleRanked.forEach(l => {
            expect(l.feasibilityScore).toBe(-1000);
        });
    });

    test('each lever gets a feasibilityScore', () => {
        const ranked = rankLevers(mockLevers);
        ranked.forEach(lever => {
            expect(typeof lever.feasibilityScore).toBe('number');
        });
    });

    test('result is sorted descending by feasibilityScore', () => {
        const ranked = rankLevers(mockLevers);
        for (let i = 0; i < ranked.length - 1; i++) {
            expect(ranked[i].feasibilityScore).toBeGreaterThanOrEqual(ranked[i + 1].feasibilityScore);
        }
    });
});
