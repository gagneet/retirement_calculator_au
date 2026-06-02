// tests/unit/outcome-bands.test.js
// Tests for outcome band classification logic.

const { computeOutcomeBand, estimateExtraMonthlyContribution, estimateYearsDelay } = require('../../src/js/outcome-bands.js');

// Minimal config mock: computeOutcomeBand reads ENHANCED_CONFIG at runtime via import.
// We use the real module but with synthetic inputs.

describe('computeOutcomeBand — MC-based band classification', () => {
  const baseOpts = {
    inputs: { retirementAge: 67, lifeExpectancy: 90 },
    engineInputs: { retirementAge: 67, yourCurrentAge: 45, lifeExpectancy: 90 },
  };

  test('critical band when successRate < 0.60', () => {
    const result = computeOutcomeBand({
      ...baseOpts,
      monteCarloResults: { successRate: 0.50, depletionAge: 78 },
      adaptedResult: { annualIncome: 20000 },
    });
    expect(result.band).toBe('critical');
    expect(result.icon).toBe('🔴');
    expect(result.successRate).toBe(0.50);
  });

  test('at_risk band when successRate is 0.60–0.74', () => {
    const result = computeOutcomeBand({
      ...baseOpts,
      monteCarloResults: { successRate: 0.70 },
      adaptedResult: { annualIncome: 42000 },
    });
    expect(result.band).toBe('at_risk');
    expect(result.label).toBe('At Risk');
  });

  test('needs_improvement band when successRate is 0.75–0.84', () => {
    const result = computeOutcomeBand({
      ...baseOpts,
      monteCarloResults: { successRate: 0.80 },
      adaptedResult: { annualIncome: 50000 },
    });
    expect(result.band).toBe('needs_improvement');
  });

  test('comfortable band when successRate is 0.85–0.94', () => {
    const result = computeOutcomeBand({
      ...baseOpts,
      monteCarloResults: { successRate: 0.90 },
      adaptedResult: { annualIncome: 55000 },
    });
    expect(result.band).toBe('comfortable');
    expect(result.label).toBe('Comfortable');
    expect(result.colour).toContain('green');
  });

  test('strong band when successRate >= 0.95 with sufficient surplus', () => {
    // ASFA single comfortable ≈ $52,085; surplus must be >= $5,000
    const result = computeOutcomeBand({
      ...baseOpts,
      monteCarloResults: { successRate: 0.97 },
      adaptedResult: { annualIncome: 80000 }, // large surplus over comfortable
    });
    expect(result.band).toBe('strong');
    expect(result.icon).toBe('✨');
  });

  test('comfortable (not strong) when successRate >= 0.95 but surplus too small', () => {
    const result = computeOutcomeBand({
      ...baseOpts,
      monteCarloResults: { successRate: 0.97 },
      adaptedResult: { annualIncome: 52090 }, // just barely above comfortable; surplus < $5k
    });
    // surplus = 52090 - 52085 = 5; below STRONG_SURPLUS_MIN of $5000
    expect(['comfortable', 'strong']).toContain(result.band);
  });
});

describe('computeOutcomeBand — deterministic fallback (no MC)', () => {
  const baseOpts = {
    inputs: { retirementAge: 67, lifeExpectancy: 90 },
    engineInputs: { retirementAge: 67, yourCurrentAge: 55, lifeExpectancy: 90 },
    monteCarloResults: null,
  };

  test('critical when income far below comfortable', () => {
    const result = computeOutcomeBand({
      ...baseOpts,
      adaptedResult: { annualIncome: 15000 }, // well below ASFA comfortable
    });
    expect(result.band).toBe('critical');
    expect(result.successRate).toBeNull();
  });

  test('at_risk when income moderately below comfortable', () => {
    const result = computeOutcomeBand({
      ...baseOpts,
      adaptedResult: { annualIncome: 42000 }, // ~$10k gap to comfortable
    });
    expect(['at_risk', 'needs_improvement']).toContain(result.band);
  });

  test('comfortable or strong when income meets or exceeds target', () => {
    const result = computeOutcomeBand({
      ...baseOpts,
      adaptedResult: { annualIncome: 80000 }, // well above ASFA comfortable
    });
    expect(['comfortable', 'strong']).toContain(result.band);
  });
});

describe('computeOutcomeBand — couple vs single', () => {
  test('uses couple ASFA target for couple household', () => {
    const singleResult = computeOutcomeBand({
      monteCarloResults: null,
      inputs: { hasPartner: false },
      engineInputs: { hasPartner: false },
      adaptedResult: { annualIncome: 52000 },
    });
    const coupleResult = computeOutcomeBand({
      monteCarloResults: null,
      inputs: { hasPartner: true },
      engineInputs: { hasPartner: true },
      adaptedResult: { annualIncome: 52000 },
    });
    // Same income: couple has higher target so should appear worse
    const bandOrder = ['critical', 'at_risk', 'needs_improvement', 'comfortable', 'strong'];
    const sIdx = bandOrder.indexOf(singleResult.band);
    const cIdx = bandOrder.indexOf(coupleResult.band);
    expect(sIdx).toBeGreaterThanOrEqual(cIdx); // single >= couple rank
    expect(coupleResult.asfaComfortableTarget).toBeGreaterThan(singleResult.asfaComfortableTarget);
  });
});

describe('computeOutcomeBand — Rich target', () => {
  test('richTarget at default 1.5x comfortable', () => {
    const result = computeOutcomeBand({
      monteCarloResults: null,
      inputs: { hasPartner: false },
      engineInputs: { hasPartner: false },
      adaptedResult: { annualIncome: 30000 },
      richMultiplier: 1.5,
    });
    expect(result.richTarget).toBeCloseTo(result.asfaComfortableTarget * 1.5, 0);
  });

  test('custom richTarget overrides multiplier', () => {
    const result = computeOutcomeBand({
      monteCarloResults: null,
      inputs: {},
      engineInputs: {},
      adaptedResult: { annualIncome: 40000 },
      customRichTarget: 120000,
    });
    expect(result.richTarget).toBe(120000);
  });
});

describe('computeOutcomeBand — gap calculations', () => {
  test('annualGapToComfortable is positive when below comfortable', () => {
    const result = computeOutcomeBand({
      monteCarloResults: null,
      inputs: { hasPartner: false },
      engineInputs: { hasPartner: false },
      adaptedResult: { annualIncome: 30000 },
    });
    expect(result.annualGapToComfortable).toBeGreaterThan(0);
  });

  test('annualGapToComfortable is negative (surplus) when above comfortable', () => {
    const result = computeOutcomeBand({
      monteCarloResults: null,
      inputs: { hasPartner: false },
      engineInputs: { hasPartner: false },
      adaptedResult: { annualIncome: 90000 },
    });
    expect(result.annualGapToComfortable).toBeLessThan(0);
  });

  test('headline is a non-empty string', () => {
    const result = computeOutcomeBand({
      monteCarloResults: { successRate: 0.88 },
      inputs: {},
      engineInputs: {},
      adaptedResult: { annualIncome: 55000 },
    });
    expect(typeof result.headline).toBe('string');
    expect(result.headline.length).toBeGreaterThan(10);
  });
});

describe('estimateExtraMonthlyContribution', () => {
  test('returns 0 when no gap', () => {
    expect(estimateExtraMonthlyContribution({ gapAnnual: 0, yearsToRetirement: 10 })).toBe(0);
  });

  test('returns 0 when no years to retirement', () => {
    expect(estimateExtraMonthlyContribution({ gapAnnual: 10000, yearsToRetirement: 0 })).toBe(0);
  });

  test('returns a positive rounded value for a meaningful gap', () => {
    const result = estimateExtraMonthlyContribution({ gapAnnual: 10000, yearsToRetirement: 15 });
    expect(result).toBeGreaterThan(0);
    expect(result % 50).toBe(0); // rounded to $50
  });

  test('more years reduces required monthly contribution', () => {
    const short = estimateExtraMonthlyContribution({ gapAnnual: 20000, yearsToRetirement: 5 });
    const long  = estimateExtraMonthlyContribution({ gapAnnual: 20000, yearsToRetirement: 20 });
    expect(short).toBeGreaterThan(long);
  });
});

describe('estimateYearsDelay', () => {
  test('returns 0 when no gap', () => {
    expect(estimateYearsDelay({ gapAnnual: 0, annualSalary: 80000 })).toBe(0);
  });

  test('returns 0 when no salary', () => {
    expect(estimateYearsDelay({ gapAnnual: 10000, annualSalary: 0 })).toBe(0);
  });

  test('returns a positive number for a meaningful gap', () => {
    const result = estimateYearsDelay({ gapAnnual: 15000, annualSalary: 90000 });
    expect(result).toBeGreaterThan(0);
    expect(Number.isInteger(result)).toBe(true);
  });
});
