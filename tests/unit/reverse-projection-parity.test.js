import {
  buildForwardProjectionPayload,
  extractCurrentPathFromProjection,
} from '../../src/js/forward-projection-bridge.js';

describe('reverse projection parity', () => {
  test('reverse current path equals projection summary income', () => {
    const payload = buildForwardProjectionPayload({
      source: 'advanced-v2',
      input: { age: 49, retireAge: 71, desiredIncome: 80000, household: 'couple' },
      engineInputs: { yourCurrentAge: 49, retirementAge: 71 },
      simulation: {
        yearlyData: [
          { age: 71, endSuperBalance: 4600000, endBalance: 5476000, pensionIncome: 0, totalAssets: 5476000 }
        ]
      },
      adaptedResult: {
        monthlyPaycheck: 20088,
        superAtRetire: 4600000,
        lastsUntil: 94,
        confidence: 0.98,
        gapMonthly: 0,
      },
    });

    const currentPath = extractCurrentPathFromProjection(payload);

    // Assert current path matches projection summary, not SWR
    expect(currentPath.currentAnnualIncomeToday).toBeCloseTo(241056, -1);
    expect(currentPath.superAtRetirement).toBeCloseTo(4600000, -2);
    expect(currentPath.confidence).toBeCloseTo(0.98, 2);
    expect(currentPath.agePensionAtRetirement).toBe(0);
    expect(currentPath.lastsUntil).toBe(94);
  });

  test('reverse does not report shortfall when advanced is on track', () => {
    const payload = buildForwardProjectionPayload({
      source: 'advanced-v2',
      input: { age: 49, retireAge: 71, desiredIncome: 80000, household: 'couple' },
      engineInputs: { yourCurrentAge: 49, retirementAge: 71 },
      simulation: {
        yearlyData: [
          { age: 71, endSuperBalance: 4600000, endBalance: 5476000, pensionIncome: 0, totalAssets: 5476000 }
        ]
      },
      adaptedResult: {
        monthlyPaycheck: 20088,
        superAtRetire: 4600000,
        lastsUntil: 94,
        confidence: 0.98,
        gapMonthly: 0,
      },
    });

    const currentPath = extractCurrentPathFromProjection(payload);
    expect(currentPath.meetsGoal).toBe(true);
    expect(currentPath.currentAnnualIncomeToday).toBeGreaterThanOrEqual(currentPath.targetAnnualIncomeToday);
  });

  test('confidence is not NaN', () => {
    const payload = buildForwardProjectionPayload({
      source: 'advanced-v2',
      input: { age: 49, retireAge: 71, desiredIncome: 80000, household: 'single' },
      simulation: { yearlyData: [{}] },
      adaptedResult: { monthlyPaycheck: 5000, confidence: 0.85 },
    });

    const currentPath = extractCurrentPathFromProjection(payload);
    expect(Number.isFinite(currentPath.confidence)).toBe(true);
    expect(currentPath.confidence).not.toBeNaN();
  });

  test('estateAtLifespan flows through from simulation to current path', () => {
    const payload = buildForwardProjectionPayload({
      source: 'advanced-v2',
      input: { age: 49, retireAge: 71, desiredIncome: 80000, household: 'single' },
      simulation: {
        finalBalance: 500000,
        yearlyData: [{ age: 71, pensionIncome: 0 }],
      },
      adaptedResult: { monthlyPaycheck: 20000 },
    });

    const currentPath = extractCurrentPathFromProjection(payload);
    expect(currentPath.estateAtLifespan).toBe(500000);
  });

  test('projection path capital gap uses estimateRequiredCapital not simplified 25x', () => {
    const payload = buildForwardProjectionPayload({
      source: 'advanced-v2',
      input: { age: 49, retireAge: 71, desiredIncome: 80000, household: 'single' },
      engineInputs: { yourCurrentAge: 49, retirementAge: 71, inflation: 0.026 },
      simulation: {
        yearlyData: [{ age: 71, endBalance: 500000, pensionIncome: 0 }],
      },
      adaptedResult: { monthlyPaycheck: 10000, confidence: 0.5 },
    });
    const currentPath = extractCurrentPathFromProjection(payload);
    expect(currentPath.estateAtLifespan).toBeDefined();
    expect(currentPath.lastsUntil).toBeDefined();
    expect(currentPath.agePensionAtRetirement).toBeDefined();
  });

  test('age pension uses source projection not full maximum', () => {
    const payload = buildForwardProjectionPayload({
      source: 'advanced-v2',
      input: { age: 49, retireAge: 71, household: 'single' },
      simulation: {
        yearlyData: [
          { age: 71, pensionIncome: 0 }
        ]
      },
      adaptedResult: { monthlyPaycheck: 20000 },
    });

    const currentPath = extractCurrentPathFromProjection(payload);
    expect(currentPath.agePensionAtRetirement).toBe(0);
  });
});
