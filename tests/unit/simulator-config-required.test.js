/**
 * RetirementSimulator requires a config object.
 *
 * simulateRetirement() reads this.config.SIMULATION (among others), so constructing
 * without one throws a TypeError on the first projection. comparison.js did exactly
 * that - `new RetirementSimulator()` with no argument - so every scenario comparison
 * on comparison.html failed at runtime.
 */
const fs = require('fs');
const path = require('path');
const RetirementSimulator = require('../../src/js/simulator.js').default;
const { ENHANCED_CONFIG } = require('../../src/js/config.js');

const root = path.resolve(__dirname, '../..');

const inputs = {
    currentAge: 50, yourCurrentAge: 50, retirementAge: 65, yourLifespan: 90, lifeExpectancy: 90,
    isCouple: false, isSingleCalculation: true, homeowner: true, homeValue: 800000,
    annualSalary: 120000, yourSalary: 120000, superBalance: 400000, yourCurrentSuper: 400000,
    currentSavings: 50000, currentStocks: 50000, asfaComfortable: 60000, targetRetirementIncome: 60000,
    inflation: 0.026, investmentReturn: 0.065, superReturn: 0.075, savingsReturn: 0.014,
    salaryGrowthRate: 0.02, employerSuperContributionRate: 0.12, numRuns: 50,
};

test('a configured simulator projects successfully', () => {
    const result = new RetirementSimulator(ENHANCED_CONFIG).simulateRetirement(inputs, false);
    expect((result.yearlyData || []).length).toBeGreaterThan(20);
});

test('an unconfigured simulator throws — documents why the config is mandatory', () => {
    expect(() => new RetirementSimulator().simulateRetirement(inputs, false)).toThrow(TypeError);
});

test('no source file constructs RetirementSimulator without a config', () => {
    const jsDir = path.join(root, 'src/js');
    const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (
        e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]
    ));
    const offenders = walk(jsDir)
        .filter((f) => f.endsWith('.js'))
        .filter((f) => /new RetirementSimulator\(\s*\)/.test(fs.readFileSync(f, 'utf8')))
        .map((f) => path.relative(root, f));
    expect(offenders).toEqual([]);
});
