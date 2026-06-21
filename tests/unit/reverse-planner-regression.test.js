import { ReversePlanner, normaliseReversePlannerInputs } from '../../src/js/reverse-planner.js';

describe('ReversePlanner regressions', () => {
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
});
