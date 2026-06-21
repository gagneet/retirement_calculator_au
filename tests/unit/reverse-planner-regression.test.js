import { ReversePlanner, normaliseReversePlannerInputs } from '../../src/js/reverse-planner.js';

describe('ReversePlanner regressions', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    test('manual current path does not reference undefined gap variables', () => {
        const planner = new ReversePlanner();
        const inputs = normaliseReversePlannerInputs({
            householdType: 'single',
            currentAge: 50,
            retirementAge: 67,
            lifespan: 90,
            annualSalary: 90000,
            currentSuperBalance: 150000,
            cashSavings: 20000,
            targetAnnualIncomeToday: 50000,
        });
        const target = {
            retirementAge: 67,
            lifespan: 90,
            targetAnnualIncomeToday: 50000,
            confidenceTarget: 0,
            includeAgePension: true,
        };

        expect(() => planner.buildCurrentPath(inputs, target)).not.toThrow();
    });

    test('manual mode uses one projection hash for current path and solver inputs', async () => {
        const planner = new ReversePlanner();
        planner.solver.solveAllLevers = jest.fn().mockResolvedValue({ rankedLevers: [] });
        const rawInputs = {
            householdType: 'single',
            currentAge: 50,
            retirementAge: 67,
            lifespan: 90,
            annualSalary: 90000,
            currentSuperBalance: 150000,
            cashSavings: 20000,
        };
        const target = {
            retirementAge: 67,
            lifespan: 90,
            targetAnnualIncomeToday: 50000,
            successProbabilityTarget: 0.8,
            includeAgePension: true,
        };

        const result = await planner.solve(rawInputs, target, { includeOverseas: false });
        const solverInputs = planner.solver.solveAllLevers.mock.calls[0][0];

        expect(result.inputHash).toBe(result.projection.inputHash);
        expect(result.projection.sourceCalculator).toBe('reverse-manual');
        expect(result.currentPath.simResult).toBe(result.projection.simulation);
        expect(solverInputs.yourCurrentAge).toBe(result.projection.engineInputs.yourCurrentAge);
        expect(solverInputs.yourCurrentSuper).toBe(result.projection.engineInputs.yourCurrentSuper);
    });
});
