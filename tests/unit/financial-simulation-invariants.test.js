/**
 * Backend-style financial invariants for the life simulation and pension engines.
 * These range/monotonicity tests catch logic regressions browser tests can miss.
 */

import { runLifeSimulation } from '../../src/js/simulation_engine/life_simulation_engine.js';
import { calcSinglePension, calcCouplePension } from '../../src/js/simulation_engine/pension_engine.js';

const baseScenario = {
  yourCurrentAge: 50,
  retirementAge: 67,
  yourLifespan: 92,
  isCouple: false,
  homeowner: true,
  yourSalary: 120000,
  partnerSalary: 0,
  yourCurrentSuper: 250000,
  partnerCurrentSuper: 0,
  currentSavings: 40000,
  currentStocks: 60000,
  monthlyStockContribution: 750,
  homeValue: 900000,
  mortgageBalance: 350000,
  asfaComfortable: 65000,
  inflation: 0.026,
  investmentReturn: 0.06,
  superReturn: 0.075,
  savingsReturn: 0.035,
  salaryGrowthRate: 0.03,
  useStochasticReturns: false,
  enableShocks: false,
};

function simulate(overrides = {}) {
  return runLifeSimulation({ ...baseScenario, ...overrides });
}

function finiteNumbersOnly(value) {
  if (typeof value === 'number') {
    expect(Number.isFinite(value)).toBe(true);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => finiteNumbersOnly(item));
    return;
  }
  if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => finiteNumbersOnly(item));
  }
}

describe('financial simulation invariants', () => {
  test('simulation returns finite values for a normal retirement scenario', () => {
    const result = simulate();
    expect(result.timeline.length).toBeGreaterThan(20);
    expect(result.retirementWealth).toBeGreaterThan(0);
    expect(result.finalNetWorth).toBeGreaterThanOrEqual(0);
    finiteNumbersOnly(result);
  });

  test('more super today does not reduce retirement wealth', () => {
    const lower = simulate({ yourCurrentSuper: 100000 });
    const higher = simulate({ yourCurrentSuper: 500000 });
    expect(higher.retirementWealth).toBeGreaterThanOrEqual(lower.retirementWealth);
    expect(higher.finalNetWorth).toBeGreaterThanOrEqual(lower.finalNetWorth);
  });

  test('higher retirement spending target reduces ending net worth', () => {
    const modest = simulate({ asfaComfortable: 50000 });
    const highSpend = simulate({ asfaComfortable: 100000 });
    expect(highSpend.finalNetWorth).toBeLessThan(modest.finalNetWorth);
  });

  test('higher healthcare and aged-care costs reduce ending net worth', () => {
    const normal = simulate({ currentHealthcareCosts: 3500, agedCareStartAge: 999, agedCareAnnualCost: 0 });
    const expensiveCare = simulate({
      currentHealthcareCosts: 15000,
      healthcareInflation: 0.06,
      agedCareStartAge: 85,
      agedCareDuration: 4,
      agedCareAnnualCost: 65000,
    });
    expect(expensiveCare.finalNetWorth).toBeLessThan(normal.finalNetWorth);
  });

  test('market shock scenario does not produce invalid numeric output', () => {
    const result = simulate({ enableShocks: true, shockProbability: 1, shockMagnitude: -0.45, returnVolatility: 0.2 });
    finiteNumbersOnly(result);
    expect(result.timeline.length).toBeGreaterThan(0);
  });
});

describe('Age Pension means-test invariants', () => {
  test('increasing assessable assets does not increase single Age Pension', () => {
    const lowAssets = calcSinglePension(250000, 0, true);
    const mediumAssets = calcSinglePension(600000, 0, true);
    const highAssets = calcSinglePension(900000, 0, true);
    expect(mediumAssets).toBeLessThanOrEqual(lowAssets);
    expect(highAssets).toBeLessThanOrEqual(mediumAssets);
  });

  test('increasing assessable income does not increase single Age Pension', () => {
    const noIncome = calcSinglePension(250000, 0, true);
    const moderateIncome = calcSinglePension(250000, 30000, true);
    const highIncome = calcSinglePension(250000, 90000, true);
    expect(moderateIncome).toBeLessThanOrEqual(noIncome);
    expect(highIncome).toBeLessThanOrEqual(moderateIncome);
  });

  test('couple pension uses a higher maximum than single pension', () => {
    const single = calcSinglePension(200000, 0, true);
    const couple = calcCouplePension(300000, 0, true);
    expect(couple).toBeGreaterThan(single);
  });

  test('non-homeowner thresholds do not penalise otherwise identical low-asset pensioners', () => {
    const homeowner = calcSinglePension(300000, 0, true);
    const nonHomeowner = calcSinglePension(300000, 0, false);
    expect(nonHomeowner).toBeGreaterThanOrEqual(homeowner);
  });
});
