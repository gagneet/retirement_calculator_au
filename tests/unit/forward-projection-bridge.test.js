import {
  buildForwardProjectionPayload,
  extractCurrentPathFromProjection,
  findRetirementYearRow,
  storeForwardProjection,
  loadForwardProjection,
  FORWARD_PROJECTION_STORAGE_KEY,
} from '../../src/js/forward-projection-bridge.js';

describe('buildForwardProjectionPayload', () => {
  test('builds payload with summary from advanced-v2 result', () => {
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

    expect(payload.version).toBe(1);
    expect(payload.source).toBe('advanced-v2');
    expect(payload.summary.monthlyRetirementIncomeToday).toBe(20088);
    expect(payload.summary.annualRetirementIncomeToday).toBe(20088 * 12);
    expect(payload.summary.superAtRetirementToday).toBe(4600000);
    expect(payload.summary.lastsUntil).toBe(94);
    expect(payload.summary.confidence).toBe(0.98);
    expect(payload.summary.retirementAge).toBe(71);
    expect(payload.summary.currentAge).toBe(49);
    expect(payload.summary.householdType).toBe('couple');
  });

  test('handles minimal input gracefully', () => {
    const payload = buildForwardProjectionPayload({
      source: 'advanced-v2',
      input: {},
      simulation: { yearlyData: [] },
      adaptedResult: {},
    });

    expect(payload.version).toBe(1);
    expect(payload.summary.monthlyRetirementIncomeToday).toBe(0);
    expect(payload.summary.confidence).toBeNull();
  });
});

describe('extractCurrentPathFromProjection', () => {
  test('extracts correct current path from projection payload', () => {
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
    expect(currentPath.currentAnnualIncomeToday).toBe(20088 * 12);
    expect(currentPath.currentMonthlyIncomeToday).toBe(20088);
    expect(currentPath.superAtRetirement).toBe(4600000);
    expect(currentPath.confidence).toBe(0.98);
    expect(currentPath.lastsUntil).toBe(94);
    expect(currentPath.meetsGoal).toBe(true);
  });

  test('meetsGoal is false when income below target', () => {
    const payload = buildForwardProjectionPayload({
      source: 'advanced-v2',
      input: { age: 49, retireAge: 71, desiredIncome: 300000, household: 'single' },
      simulation: { yearlyData: [{}] },
      adaptedResult: { monthlyPaycheck: 10000 },
    });

    const currentPath = extractCurrentPathFromProjection(payload);
    expect(currentPath.meetsGoal).toBe(false);
  });

  test('uses goalOverrides when provided', () => {
    const payload = buildForwardProjectionPayload({
      source: 'advanced-v2',
      input: { age: 49, retireAge: 71, desiredIncome: 80000, household: 'single' },
      simulation: { yearlyData: [{}] },
      adaptedResult: { monthlyPaycheck: 5000 },
    });

    const overrides = { targetAnnualIncomeToday: 30000 };
    const currentPath = extractCurrentPathFromProjection(payload, overrides);
    expect(currentPath.targetAnnualIncomeToday).toBe(30000);
    expect(currentPath.meetsGoal).toBe(true);
  });
});

describe('findRetirementYearRow', () => {
  test('finds row matching retirement age', () => {
    const payload = {
      simulation: {
        yearlyData: [
          { age: 65, totalAssets: 1000000 },
          { age: 66, totalAssets: 950000 },
          { age: 67, totalAssets: 900000 },
        ]
      }
    };

    const row = findRetirementYearRow(payload, 66);
    expect(row.age).toBe(66);
    expect(row.totalAssets).toBe(950000);
  });

  test('returns first row when age not found', () => {
    const payload = {
      simulation: {
        yearlyData: [
          { age: 65, totalAssets: 1000000 },
        ]
      }
    };

    const row = findRetirementYearRow(payload, 70);
    expect(row.age).toBe(65);
  });

  test('returns null for empty data', () => {
    const row = findRetirementYearRow({}, 65);
    expect(row).toBeNull();
  });
});

describe('storeForwardProjection / loadForwardProjection', () => {
  beforeEach(() => {
    const store = {};
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation((key, val) => { store[key] = String(val); });
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => store[key] || null);
    jest.spyOn(Storage.prototype, 'removeItem').mockImplementation((key) => { delete store[key]; });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('stores and loads forward projection', () => {
    const payload = { version: 1, source: 'advanced-v2', summary: { confidence: 0.98 } };
    const result = storeForwardProjection(payload);
    expect(result).toBe(true);

    const loaded = loadForwardProjection();
    expect(loaded).not.toBeNull();
    expect(loaded.version).toBe(1);
    expect(loaded.summary.confidence).toBe(0.98);
  });

  test('loadForwardProjection returns null when nothing stored', () => {
    const loaded = loadForwardProjection();
    expect(loaded).toBeNull();
  });

  test('uses correct storage key', () => {
    storeForwardProjection({ test: true });
    expect(localStorage.setItem).toHaveBeenCalledWith(
      FORWARD_PROJECTION_STORAGE_KEY,
      expect.any(String)
    );
  });
});
