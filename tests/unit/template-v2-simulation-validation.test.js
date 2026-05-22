/**
 * Validates src/retirement_template.json through the Advanced v2 calculation path.
 *
 * This template is form-shaped Advanced v2 data, not the legacy engine-shaped
 * schema used by template-json-smoke.test.js. These tests intentionally validate
 * the adapter, deterministic simulation, and a bounded Monte Carlo run together.
 */

import templateData from '../../src/retirement_template.json';
import { buildEngineInputs, runEngine } from '../../src/js/advanced-v2.js';
import { runMonteCarlo } from '../../src/js/simulation_engine/monte_carlo_engine.js';

const userData = templateData.userData;
const engineInputs = buildEngineInputs(userData);
const deterministic = runEngine(userData);

function expectFiniteNumber(value) {
  expect(typeof value).toBe('number');
  expect(Number.isFinite(value)).toBe(true);
}

function expectFiniteObjectNumbers(value) {
  if (typeof value === 'number') {
    expect(Number.isFinite(value)).toBe(true);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item) => expectFiniteObjectNumbers(item));
    return;
  }
  if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => expectFiniteObjectNumbers(item));
  }
}

describe('retirement_template.json Advanced v2 simulation validation', () => {
  test('template is Advanced v2 form-shaped data', () => {
    expect(templateData.version).toBe('4.0');
    expect(templateData.metadata.page).toBe('advanced-v2');
    expect(userData.household).toBe('couple');
    expect(userData.age).toBe(49);
    expect(userData.retireAge).toBe(71);
    expect(userData.partnerRetireAge).toBe(62);
  });

  test('adapter maps template fields to engine inputs using correct units', () => {
    expect(engineInputs.isCouple).toBe(true);
    expect(engineInputs.yourCurrentAge).toBe(49);
    expect(engineInputs.retirementAge).toBe(71);
    expect(engineInputs.partnerRetirementAge).toBe(62);
    expect(engineInputs.yourLifespan).toBe(96);
    expect(engineInputs.partnerLifespan).toBe(97);

    expect(engineInputs.yourSalary).toBe(202509);
    expect(engineInputs.partnerSalary).toBe(39800);
    expect(engineInputs.yourCurrentSuper).toBe(336800);
    expect(engineInputs.partnerCurrentSuper).toBe(14817);

    expect(engineInputs.inflation).toBeCloseTo(0.0258, 6);
    expect(engineInputs.investmentReturn).toBeCloseTo(0.0778, 6);
    expect(engineInputs.superReturn).toBeCloseTo(0.0875, 6);
    expect(engineInputs.savingsReturn).toBeCloseTo(0.0281, 6);
    expect(engineInputs.returnVolatility).toBeCloseTo(0.16, 6);
    expect(engineInputs.shockProbability).toBeCloseTo(0.032, 6);
    expect(engineInputs.shockMagnitude).toBeCloseTo(-0.125, 6);
    expect(engineInputs.agedCareProbability).toBeCloseTo(0.10, 6);
    expect(engineInputs.trustTaxRate).toBeCloseTo(0.30, 6);
    expect(engineInputs.beneficiaryAllocation).toBeCloseTo(1.0, 6);

    // The form contains employerRate: 0, and the adapter currently treats that as
    // "use the default SG rate" rather than a literal zero contribution rate.
    expect(engineInputs.superContributionRate).toBeGreaterThan(0);
    expect(engineInputs.superContributionRate).toBeCloseTo(0.12, 6);
  });

  test('deterministic Advanced v2 simulation returns plausible finite outputs', () => {
    expectFiniteNumber(deterministic.monthlyPaycheck);
    expectFiniteNumber(deterministic.superAtRetire);
    expectFiniteNumber(deterministic.confidence);
    expectFiniteNumber(deterministic.gapMonthly);
    expectFiniteNumber(deterministic.lastsUntil);
    expectFiniteObjectNumbers(deterministic.breakdown);

    const currentFinancialAssets = userData.superBal + userData.partnerSuperBal + userData.cash + userData.stocks;
    expect(deterministic.superAtRetire).toBeGreaterThan(currentFinancialAssets);
    expect(deterministic.monthlyPaycheck).toBeGreaterThan(0);
    expect(deterministic.monthlyPaycheck).toBeLessThan(50000);
    expect(deterministic.confidence).toBeGreaterThanOrEqual(0);
    expect(deterministic.confidence).toBeLessThanOrEqual(0.98);
    expect(deterministic.lastsUntil).toBeGreaterThanOrEqual(userData.retireAge);
    expect(deterministic.lastsUntil).toBeLessThanOrEqual(userData.lifespan);
  });

  test('deterministic projection covers accumulation and drawdown years', () => {
    expect(Array.isArray(deterministic.years)).toBe(true);
    expect(deterministic.years.length).toBeGreaterThan(10);

    const first = deterministic.years[0];
    const retirementYear = deterministic.years.find((year) => year.age === userData.retireAge);
    const final = deterministic.years[deterministic.years.length - 1];

    expect(first.age).toBe(userData.age);
    expect(retirementYear).toBeDefined();
    expect(final.age).toBeGreaterThanOrEqual(deterministic.lastsUntil);
    expect(final.age).toBeGreaterThanOrEqual(userData.lifespan);
    expect(deterministic.years.some((year) => year.age === deterministic.lastsUntil)).toBe(true);
    expect(retirementYear.totalAssets).toBeGreaterThan(first.totalAssets);
    expect(retirementYear.withdraw).toBeGreaterThan(0);
  });

  test('higher target income weakens the same template plan', () => {
    const baseline = deterministic;
    const higherSpend = runEngine({ ...userData, desiredIncome: (baseline.monthlyPaycheck * 12) + 60000 });

    expect(higherSpend.monthlyPaycheck).toBeCloseTo(baseline.monthlyPaycheck, 6);
    expect(higherSpend.gapMonthly).toBeGreaterThan(baseline.gapMonthly);
    expect(higherSpend.confidence).toBeLessThanOrEqual(baseline.confidence);
  });

  test('bounded Monte Carlo run on template inputs produces ordered finite percentiles', async () => {
    const mc = await runMonteCarlo({
      ...engineInputs,
      numRuns: 100,
      enableShocks: false,
      useLongevityDistribution: false,
    });

    expect(mc.runs).toBe(100);
    expect(mc.probabilityOfSuccess).toBeGreaterThanOrEqual(0);
    expect(mc.probabilityOfSuccess).toBeLessThanOrEqual(100);
    expectFiniteNumber(mc.medianRetirementWealth);
    expectFiniteNumber(mc.medianFinalNetWorth);
    expectFiniteObjectNumbers(mc.percentiles);

    expect(mc.percentiles.p10NetWorth).toBeLessThanOrEqual(mc.percentiles.p25NetWorth);
    expect(mc.percentiles.p25NetWorth).toBeLessThanOrEqual(mc.percentiles.p50NetWorth);
    expect(mc.percentiles.p50NetWorth).toBeLessThanOrEqual(mc.percentiles.p75NetWorth);
    expect(mc.percentiles.p75NetWorth).toBeLessThanOrEqual(mc.percentiles.p90NetWorth);
  }, 30000);
});
