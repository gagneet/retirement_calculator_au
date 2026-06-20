/**
 * tests/unit/reverse-solver-roundtrip.test.js
 *
 * Round-trip inversion tests: solve for a lever, apply the solved value,
 * run simulateRetirement, and assert the outcome meets the target within tolerance.
 *
 * Uses the actual RetirementSimulator (not mocked) with deterministic mode.
 */

import { RetirementSimulator } from '../../src/js/simulator.js';
import { ENHANCED_CONFIG } from '../../src/js/config.js';
import {
    solveForExtraAnnualSuper,
    solveForRetirementAge,
    solveForExtraSavings,
    scoreScenario,
    bisectionSolve,
} from '../../src/js/reverse-solver.js';

// ---------------------------------------------------------------------------
// Shared test fixtures
// ---------------------------------------------------------------------------

const simulator = new RetirementSimulator(ENHANCED_CONFIG);

const BASE_INPUTS = {
    yourCurrentAge: 45,
    retirementAge: 67,
    yourLifespan: 90,
    isCouple: false,
    isSingleCalculation: true,
    yourSalary: 100000,
    partnerSalary: 0,
    yourCurrentSuper: 200000,
    partnerCurrentSuper: 0,
    currentSavings: 30000,
    currentStocks: 0,
    monthlyStockContribution: 0,
    homeowner: true,
    homeValue: 800000,
    mortgageBalance: 0,
    monthlyMortgagePayment: 0,
    mortgageRate: 0.06,
    asfaComfortable: 70000,
    inflation: 0.026,
    investmentReturn: 0.07,
    superReturn: 0.075,
    savingsReturn: 0.035,
    salaryGrowthRate: 0.02,
    returnVolatility: 0.12,
    returnDeclineRate: 0.0003,
    employerSuperContributionRate: 0.12,
    yourAdditionalSuperContribution: 0,
    partnerAdditionalSuperContribution: 0,
    yourAnnualNCC: 0,
    partnerAnnualNCC: 0,
    hasInvestmentProperty: false,
    investmentPropertyValue: 0,
    weeklyRentalIncome: 0,
    annualPropertyExpenses: 0,
    propertyGrowthRate: 0.04,
    allocEquities: 0.65,
    allocBonds: 0.25,
    allocCash: 0.10,
};

// Helper: check if a set of inputs meets the target via simulateRetirement
function checkPassesTarget(inputs, target) {
    const SWR = 0.04;
    const inflationRate = inputs.inflation || 0.026;
    const ytr = Math.max(1, (inputs.retirementAge || 67) - (inputs.yourCurrentAge || 45));
    const result = simulator.simulateRetirement(inputs, false);
    const score = scoreScenario(result, target, inflationRate, ytr, SWR);
    return { passes: score.passesGoal, score, result };
}

// ---------------------------------------------------------------------------
// Test 1: Round-trip — solveForExtraAnnualSuper
// ---------------------------------------------------------------------------

describe('Round-trip: solveForExtraAnnualSuper', () => {
    const TARGET = {
        targetAnnualIncomeToday: 60000,
    };

    test('base inputs may or may not meet target (test precondition check)', () => {
        const { passes } = checkPassesTarget(BASE_INPUTS, TARGET);
        expect(typeof passes).toBe('boolean');
    });

    test('applying solved extra super makes the simulation pass target within 10%', async () => {
        const result = await solveForExtraAnnualSuper(simulator, BASE_INPUTS, TARGET);

        expect(result.feasible).toBe(true);

        const solvedInputs = {
            ...BASE_INPUTS,
            yourAdditionalSuperContribution: result.solved,
        };

        const SWR = 0.04;
        const inflationRate = BASE_INPUTS.inflation;
        const ytr = Math.max(1, BASE_INPUTS.retirementAge - BASE_INPUTS.yourCurrentAge);
        const simResult = simulator.simulateRetirement(solvedInputs, false);
        const score = scoreScenario(simResult, TARGET, inflationRate, ytr, SWR);

        const tolerance = TARGET.targetAnnualIncomeToday * 0.10;
        expect(score.sustainableIncomeToday).toBeGreaterThanOrEqual(
            TARGET.targetAnnualIncomeToday - tolerance
        );
    });
});

// ---------------------------------------------------------------------------
// Test 2: Round-trip — solveForRetirementAge
// ---------------------------------------------------------------------------

describe('Round-trip: solveForRetirementAge', () => {
    const TARGET_HIGH = {
        targetAnnualIncomeToday: 70000,
    };

    test('solved retirement age produces outcome >= target within 10%', async () => {
        const result = await solveForRetirementAge(simulator, BASE_INPUTS, TARGET_HIGH);

        expect(result.feasible).toBe(true);

        const solvedAge = Math.round(result.solved);
        const solvedInputs = {
            ...BASE_INPUTS,
            retirementAge: solvedAge,
        };

        const SWR = 0.04;
        const inflationRate = BASE_INPUTS.inflation;
        const ytr = Math.max(1, solvedAge - BASE_INPUTS.yourCurrentAge);
        const simResult = simulator.simulateRetirement(solvedInputs, false);
        const score = scoreScenario(simResult, TARGET_HIGH, inflationRate, ytr, SWR);

        const tolerance = TARGET_HIGH.targetAnnualIncomeToday * 0.10;
        expect(score.sustainableIncomeToday).toBeGreaterThanOrEqual(
            TARGET_HIGH.targetAnnualIncomeToday - tolerance
        );
    });

    test('solved retirement age is between 55 and 75 when feasible', async () => {
        const result = await solveForRetirementAge(simulator, BASE_INPUTS, TARGET_HIGH);
        if (result.feasible) {
            expect(result.solved).toBeGreaterThanOrEqual(55);
            expect(result.solved).toBeLessThanOrEqual(75);
        }
    });
});

// ---------------------------------------------------------------------------
// Test 3: Round-trip — solveForExtraSavings
// ---------------------------------------------------------------------------

describe('Round-trip: solveForExtraSavings', () => {
    const TARGET = {
        targetAnnualIncomeToday: 55000,
    };

    test('applying solved monthly savings makes outcome pass target', async () => {
        const result = await solveForExtraSavings(simulator, BASE_INPUTS, TARGET);

        expect(result.feasible).toBe(true);

        const solvedInputs = {
            ...BASE_INPUTS,
            monthlyStockContribution: result.solved,
        };

        const SWR = 0.04;
        const inflationRate = BASE_INPUTS.inflation;
        const ytr = Math.max(1, BASE_INPUTS.retirementAge - BASE_INPUTS.yourCurrentAge);
        const simResult = simulator.simulateRetirement(solvedInputs, false);
        const score = scoreScenario(simResult, TARGET, inflationRate, ytr, SWR);

        const tolerance = TARGET.targetAnnualIncomeToday * 0.10;
        expect(score.sustainableIncomeToday).toBeGreaterThanOrEqual(
            TARGET.targetAnnualIncomeToday - tolerance
        );
    });
});

// ---------------------------------------------------------------------------
// Test 4: Infeasible lever returns clear infeasible result
// ---------------------------------------------------------------------------

describe('Infeasible lever detection', () => {
    test('impossibly high income target returns infeasible for retirement age', async () => {
        const target = { targetAnnualIncomeToday: 10_000_000 };
        const result = await solveForRetirementAge(simulator, BASE_INPUTS, target);
        expect(result.feasible).toBe(false);
    });

    test('impossibly high income target returns infeasible for extra super', async () => {
        const target = { targetAnnualIncomeToday: 10_000_000 };
        const result = await solveForExtraAnnualSuper(simulator, BASE_INPUTS, target);
        expect(result.feasible).toBe(false);
    });
});

// ---------------------------------------------------------------------------
// Test 5: bisectionSolve with real simulator
// ---------------------------------------------------------------------------

describe('bisectionSolve with real simulator', () => {
    test('converges on extra super amount for a moderate target', async () => {
        const SWR = 0.04;
        const inflationRate = BASE_INPUTS.inflation;
        const TARGET_INCOME = 45000;
        const ytr = Math.max(1, BASE_INPUTS.retirementAge - BASE_INPUTS.yourCurrentAge);

        const passes = async (extraSuper) => {
            const inputs = { ...BASE_INPUTS, yourAdditionalSuperContribution: extraSuper };
            let result;
            try {
                result = simulator.simulateRetirement(inputs, false);
            } catch {
                return false;
            }
            const score = scoreScenario(
                result,
                { targetAnnualIncomeToday: TARGET_INCOME },
                inflationRate,
                ytr,
                SWR
            );
            return score.passesGoal;
        };

        const solved = await bisectionSolve({
            lo: 0,
            hi: 18000,
            tol: 100,
            passes,
        });

        if (solved !== null) {
            const actuallyPasses = await passes(solved);
            expect(actuallyPasses).toBe(true);
        } else {
            const hiPasses = await passes(18000);
            expect(hiPasses).toBe(false);
        }
    });
});
