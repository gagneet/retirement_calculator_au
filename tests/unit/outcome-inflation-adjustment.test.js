import OutcomeEngine from '../../src/js/outcome-engine.js';
import WhatIfEngine from '../../src/js/what-if-engine.js';

describe('outcome inflation-adjusted values', () => {
    const inputs = {
        currentAge: 45,
        retirementAge: 65,
        annualSalary: 120000,
        superBalance: 350000,
        savings: 60000,
        investments: 40000,
        ownsHome: true,
        homeValue: 900000,
    };

    test('returns both retirement-year and today-dollar projections', () => {
        const result = new OutcomeEngine(inputs).calculateConservativeOutcome();

        expect(result.inflationFactor).toBeGreaterThan(1);
        expect(result.superAtRetirementNominal).toBeGreaterThan(result.superAtRetirement);
        expect(result.sustainableIncomeNominal).toBeGreaterThan(result.sustainableIncome);
        expect(result.targetIncomeNominal).toBeGreaterThan(result.targetIncome);
        expect(result.gap).toBe(Math.round(Math.abs(result.targetIncome - result.sustainableIncome)));
    });

    test('what-if income impacts are expressed in today dollars', () => {
        const baseOutcome = new OutcomeEngine(inputs).calculateConservativeOutcome();
        const scenario = new WhatIfEngine(inputs, baseOutcome).testExtraSuperContribution(500);

        expect(scenario.extraSuper).toBeGreaterThan(scenario.extraSuperToday);
        expect(scenario.extraIncome).toBeLessThan(Math.round(scenario.extraSuper * 0.04));
        expect(scenario.newGap).toBe(Math.round(Math.max(0, baseOutcome.gap - scenario.extraIncome)));
    });
});
