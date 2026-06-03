import {
    calculateConcessionalCapStatus,
    calculateEmployerSuper,
    EMPLOYER_SUPER_MODES,
    resolveEmployerSuper,
    SALARY_INCOME_MODES,
    shouldWarnDivision293,
} from '../../src/js/super-policy.js';

describe('super policy calculations', () => {
    test('salary excluding super below cap', () => {
        const result = calculateEmployerSuper({
            employmentIncome: 200000,
            incomeMode: SALARY_INCOME_MODES.EXCLUDING_SUPER,
            sgRate: 0.12,
        });

        expect(result.cashSalary).toBe(200000);
        expect(result.employerSG).toBe(24000);
        expect(result.totalPackage).toBe(224000);
    });

    test('salary excluding super above cap', () => {
        const result = calculateEmployerSuper({
            employmentIncome: 300000,
            incomeMode: SALARY_INCOME_MODES.EXCLUDING_SUPER,
            sgRate: 0.12,
            maxContributionBasePerQuarter: 62500,
        });

        expect(result.employerSG).toBeCloseTo(30000, 2);
        expect(result.totalPackage).toBe(330000);
        expect(result.sgCapApplied).toBe(true);
    });

    test('total package including super below cap', () => {
        const result = calculateEmployerSuper({
            employmentIncome: 250000,
            incomeMode: SALARY_INCOME_MODES.PACKAGE_INCLUDING_SUPER,
            sgRate: 0.12,
        });

        expect(result.cashSalary).toBeCloseTo(223214.29, 2);
        expect(result.employerSG).toBeCloseTo(26785.71, 2);
        expect(result.totalPackage).toBe(250000);
    });

    test('total package including super above capped threshold', () => {
        const result = calculateEmployerSuper({
            employmentIncome: 300000,
            incomeMode: SALARY_INCOME_MODES.PACKAGE_INCLUDING_SUPER,
            sgRate: 0.12,
            maxContributionBasePerQuarter: 62500,
        });

        expect(result.cashSalary).toBe(270000);
        expect(result.employerSG).toBeCloseTo(30000, 2);
        expect(result.sgCapApplied).toBe(true);
    });


    test('salary excluding super exactly at annualised maximum contribution base', () => {
        const result = calculateEmployerSuper({
            employmentIncome: 250000,
            incomeMode: SALARY_INCOME_MODES.EXCLUDING_SUPER,
            sgRate: 0.12,
            maxContributionBasePerQuarter: 62500,
        });

        expect(result.cashSalary).toBeCloseTo(250000, 2);
        expect(result.employerSG).toBeCloseTo(30000, 2);
        expect(result.totalPackage).toBe(280000);
        expect(result.sgCapApplied).toBe(false);
    });

    test('package including super exactly at cap boundary', () => {
        const result = calculateEmployerSuper({
            employmentIncome: 280000,
            incomeMode: SALARY_INCOME_MODES.PACKAGE_INCLUDING_SUPER,
            sgRate: 0.12,
            maxContributionBasePerQuarter: 62500,
        });

        expect(result.cashSalary).toBeCloseTo(250000, 2);
        expect(result.employerSG).toBeCloseTo(30000, 2);
        expect(result.totalPackage).toBe(280000);
        expect(result.sgCapApplied).toBe(false);
    });

    test('salary sacrifice with carry-forward cap disabled exceeds standard cap', () => {
        const status = calculateConcessionalCapStatus({
            employerSG: 30000,
            salarySacrifice: 5000,
            concessionalCap: 30000,
        });

        expect(status.hasExcessConcessionalContribution).toBe(true);
        expect(status.excessConcessionalContributions).toBe(5000);
    });

    test('salary sacrifice with carry-forward cap enabled via higher cap', () => {
        const status = calculateConcessionalCapStatus({
            employerSG: 30000,
            salarySacrifice: 5000,
            concessionalCap: 35000,
        });

        expect(status.hasExcessConcessionalContribution).toBe(false);
        expect(status.remainingConcessionalCap).toBe(0);
    });

    test('applyMaxContributionBase false allows employer override modelling', () => {
        const result = calculateEmployerSuper({
            employmentIncome: 300000,
            incomeMode: SALARY_INCOME_MODES.EXCLUDING_SUPER,
            sgRate: 0.12,
            maxContributionBasePerQuarter: 62500,
            applyMaxContributionBase: false,
        });

        expect(result.employerSG).toBe(36000);
        expect(result.sgCapApplied).toBe(false);
    });

    test('employer SG fills concessional cap', () => {
        const status = calculateConcessionalCapStatus({
            employerSG: 30000,
            concessionalCap: 30000,
        });

        expect(status.remainingConcessionalCap).toBe(0);
        expect(status.employerSGFillsCap).toBe(true);
    });

    test('salary sacrifice exceeds remaining cap', () => {
        const status = calculateConcessionalCapStatus({
            employerSG: 30000,
            salarySacrifice: 5000,
            concessionalCap: 30000,
        });

        expect(status.hasExcessConcessionalContribution).toBe(true);
        expect(status.excessConcessionalContributions).toBe(5000);
    });

    test('Division 293 warning triggers for high income plus concessional contributions', () => {
        expect(shouldWarnDivision293({
            cashSalary: 250000,
            lowTaxContributions: 30000,
            threshold: 250000,
        })).toBe(true);
    });

    test('zero salary has no employer SG', () => {
        const result = calculateEmployerSuper({
            employmentIncome: 0,
            sgRate: 0.12,
        });

        expect(result.cashSalary).toBe(0);
        expect(result.employerSG).toBe(0);
        expect(result.totalPackage).toBe(0);
    });

    test('manual override can set employer SG below the capped calculated amount', () => {
        const result = resolveEmployerSuper({
            employmentIncome: 300000,
            incomeMode: SALARY_INCOME_MODES.EXCLUDING_SUPER,
            sgRate: 0.12,
            maxContributionBasePerQuarter: 62500,
            employerSuperMode: EMPLOYER_SUPER_MODES.MANUAL_OVERRIDE,
            employerSuperOverrideAmount: 25000,
        });

        expect(result.calculatedEmployerSG).toBeCloseTo(30000, 2);
        expect(result.employerSG).toBe(25000);
        expect(result.totalPackage).toBe(325000);
        expect(result.employerSuperOverridden).toBe(true);
    });

    test('package including super override keeps package fixed and recalculates cash salary', () => {
        const result = resolveEmployerSuper({
            employmentIncome: 280000,
            incomeMode: SALARY_INCOME_MODES.PACKAGE_INCLUDING_SUPER,
            sgRate: 0.12,
            maxContributionBasePerQuarter: 62500,
            employerSuperMode: EMPLOYER_SUPER_MODES.MANUAL_OVERRIDE,
            employerSuperOverrideAmount: 35000,
        });

        expect(result.calculatedEmployerSG).toBeCloseTo(30000, 2);
        expect(result.employerSG).toBe(35000);
        expect(result.cashSalary).toBe(245000);
        expect(result.totalPackage).toBe(280000);
    });

    test('negative override is clamped to zero', () => {
        const result = resolveEmployerSuper({
            employmentIncome: 100000,
            employerSuperMode: EMPLOYER_SUPER_MODES.MANUAL_OVERRIDE,
            employerSuperOverrideAmount: -1000,
        });

        expect(result.employerSG).toBe(0);
    });
});
