// tests/unit/suggestions-engine.test.js
// Tests for the suggestions engine integration:
//   - RecommendationEngine produces enriched objects
//   - Annuity educational recommendation is injected
//   - suggestions-ui helpers behave correctly
//   - policy-sources registry is complete

const { getSource, getSourcesFor, formatSourceCitation, POLICY_SOURCES } = require('../../src/js/policy-sources.js');

// ── policy-sources ──────────────────────────────────────────────────────────

describe('POLICY_SOURCES registry', () => {
  test('all entries have required fields', () => {
    POLICY_SOURCES.forEach(s => {
      expect(s.id).toBeTruthy();
      expect(s.label).toBeTruthy();
      expect(s.url).toMatch(/^https?:\/\//);
      expect(s.publisher).toBeTruthy();
      expect(s.lastChecked).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Array.isArray(s.appliesTo)).toBe(true);
    });
  });

  test('no duplicate ids', () => {
    const ids = POLICY_SOURCES.map(s => s.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  test('getSource returns correct entry', () => {
    const src = getSource('services-australia-age-pension');
    expect(src).not.toBeNull();
    expect(src.publisher).toBe('Services Australia');
  });

  test('getSource returns null for unknown id', () => {
    expect(getSource('nonexistent-source-123')).toBeNull();
  });

  test('getSourcesFor returns relevant sources', () => {
    const sources = getSourcesFor('overseas');
    expect(sources.length).toBeGreaterThan(0);
    sources.forEach(s => expect(s.appliesTo).toContain('overseas'));
  });

  test('formatSourceCitation returns non-empty string for valid id', () => {
    const citation = formatSourceCitation('ato-super-contributions');
    expect(citation).toContain('ATO');
    expect(citation.length).toBeGreaterThan(10);
  });

  test('formatSourceCitation returns empty string for invalid id', () => {
    expect(formatSourceCitation('bad-id')).toBe('');
  });

  test('contains Services Australia overseas sources', () => {
    const src = getSource('services-australia-overseas');
    expect(src).not.toBeNull();
    expect(src.appliesTo).toContain('pension-portability');
  });

  test('contains ASFA retirement standard source', () => {
    const src = getSource('asfa-retirement-standard');
    expect(src).not.toBeNull();
    expect(src.appliesTo).toContain('comfortable');
  });

  test('contains MoneySmart annuities source', () => {
    const src = getSource('moneysmart-annuities');
    expect(src).not.toBeNull();
    expect(src.appliesTo).toContain('annuity');
  });
});

// ── suggestions-ui escaping ──────────────────────────────────────────────────

const { escHtml, getFilterTags, SUGGESTION_FILTERS } = require('../../src/js/suggestions-ui.js');

describe('escHtml', () => {
  test('escapes <, >, &, ", \'', () => {
    expect(escHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    expect(escHtml("it's")).toBe("it&#x27;s");
    expect(escHtml('a & b')).toBe('a &amp; b');
  });

  test('handles null and undefined gracefully', () => {
    expect(escHtml(null)).toBe('');
    expect(escHtml(undefined)).toBe('');
  });

  test('handles numbers', () => {
    expect(escHtml(42)).toBe('42');
  });
});

describe('getFilterTags', () => {
  test('all recs get "all" tag', () => {
    const tags = getFilterTags({ title: 'Something', category: 'General' });
    expect(tags).toContain('all');
  });

  test('high impact rec gets high-impact tag', () => {
    const tags = getFilterTags({ title: 'Big super boost', impact: 'high-positive', priority: 'HIGH', feasibility: 'easy' });
    expect(tags).toContain('high-impact');
  });

  test('easy positive rec gets quick-wins tag', () => {
    const tags = getFilterTags({ title: 'Easy win', impact: 'positive', feasibility: 'easy' });
    expect(tags).toContain('quick-wins');
  });

  test('contribution rec gets contributions tag', () => {
    const tags = getFilterTags({ title: 'Salary sacrifice super', category: 'Contributions' });
    expect(tags).toContain('contributions');
  });

  test('overseas rec gets overseas tag', () => {
    const tags = getFilterTags({ title: 'Retire overseas', category: 'Overseas' });
    expect(tags).toContain('overseas');
  });

  test('annuity rec gets risk tag via aged-care not auto — annuity handled as misc', () => {
    // Annuity doesn't map to any specific filter currently except 'all'
    const tags = getFilterTags({ title: 'Annuity guidance', category: 'Annuity' });
    expect(tags).toContain('all');
  });

  test('no duplicate tags', () => {
    const tags = getFilterTags({ title: 'super salary', category: 'Contributions', impact: 'high-positive', feasibility: 'easy', priority: 'HIGH' });
    const unique = new Set(tags);
    expect(unique.size).toBe(tags.length);
  });
});

describe('SUGGESTION_FILTERS', () => {
  test('contains expected filter ids', () => {
    const ids = SUGGESTION_FILTERS.map(f => f.id);
    expect(ids).toContain('all');
    expect(ids).toContain('high-impact');
    expect(ids).toContain('quick-wins');
    expect(ids).toContain('overseas');
    expect(ids).toContain('pension');
    expect(ids).toContain('aged-care');
  });

  test('all filters have id and label', () => {
    SUGGESTION_FILTERS.forEach(f => {
      expect(f.id).toBeTruthy();
      expect(f.label).toBeTruthy();
    });
  });
});

// ── RecommendationEngine — enriched fields ───────────────────────────────────

const RecommendationEngine = require('../../src/js/recommendation.js').default;
const { capRecommendationDelta } = require('../../src/js/recommendation.js');

describe('capRecommendationDelta', () => {
  test('caps positive delta at 200% of base', () => {
    const result = capRecommendationDelta(1_000_000, 300_000);
    expect(result).toBe(600_000);
  });

  test('caps at $5M absolute when base is 0', () => {
    expect(capRecommendationDelta(10_000_000, 0)).toBe(5_000_000);
    expect(capRecommendationDelta(-10_000_000, 0)).toBe(-5_000_000);
  });

  test('does not cap delta within bounds', () => {
    expect(capRecommendationDelta(50_000, 500_000)).toBe(50_000);
  });
});

// Mock simulator for RecommendationEngine tests
function makeMockSimulator(overrides = {}) {
  return {
    simulateRetirement: jest.fn().mockReturnValue({ finalBalance: 500000, annualIncome: 50000 }),
    runMonteCarloSimulation: jest.fn().mockResolvedValue({ successRate: 0.80, median: 600000 }),
    runScenarioComparison: jest.fn().mockResolvedValue({
      scenarios: [
        { name: 'Current Plan', successRate: 0.80, medianBalance: 600000, description: 'baseline' },
        { name: 'Increase Super by $500/month', successRate: 0.88, medianBalance: 750000, description: 'extra super', factorsChanged: ['Extra $500/month to super'], feasibility: 'easy' },
      ],
    }),
    calculateCashFlowAnalysis: jest.fn().mockReturnValue({
      expenses: { housing: { monthlyTotal: 2000, mortgagePayment: 1800 } },
      cashFlow: { monthlyNetIncome: 6000 },
      // savingsAnalysis is accessed by _analyzeContributions as cashFlowAnalysis.savingsAnalysis
      savingsAnalysis: { canIncreaseSavings: false, maxMonthlyIncrease: 0, hasStrongCapacity: false },
    }),
    solveRetirementAge: jest.fn().mockResolvedValue({ retirementAge: 65 }),
    ...overrides,
  };
}

const MOCK_CONFIG = {
  DEFAULTS: { simulation: { numRuns: 100 } },
  OUTCOME_BANDS: { CRITICAL_MAX: 0.6, AT_RISK_MAX: 0.74, NEEDS_IMPROVEMENT_MAX: 0.84, COMFORTABLE_MAX: 0.94, STRONG_MIN: 0.95, STRONG_SURPLUS_MIN: 5000 },
  RICH_TARGETS: { DEFAULT_MULTIPLIER: 1.5, OPTIONS: [] },
  AGE_PENSION_CONFIG: { ASFA_SINGLE_ANNUAL: 52085, ASFA_COUPLE_ANNUAL: 73337 },
};

const MOCK_INPUTS = {
  yourCurrentAge: 45,
  retirementAge: 65,
  yourSalary: 100000,
  yourCurrentSuper: 300000,
  homeValue: 900000,
  numRuns: 100,
};

describe('RecommendationEngine — enriched recommendation structure', () => {
  test('generateRecommendations returns array', async () => {
    const engine = new RecommendationEngine(makeMockSimulator(), MOCK_INPUTS, MOCK_CONFIG);
    const recs = await engine.generateRecommendations();
    expect(Array.isArray(recs)).toBe(true);
  });

  test('each recommendation has required new fields', async () => {
    const engine = new RecommendationEngine(makeMockSimulator(), MOCK_INPUTS, MOCK_CONFIG);
    const recs = await engine.generateRecommendations();
    if (recs.length === 0) return; // nothing to assert
    const rec = recs[0];
    expect(rec).toHaveProperty('id');
    expect(rec).toHaveProperty('priority');
    expect(rec).toHaveProperty('impactLevel');
    expect(rec).toHaveProperty('timeframe');
    expect(rec).toHaveProperty('whenToSeekAdvice');
    expect(rec).toHaveProperty('risksAndTradeoffs');
    expect(rec).toHaveProperty('sourceRefs');
    expect(Array.isArray(rec.sourceRefs)).toBe(true);
    expect(Array.isArray(rec.actions)).toBe(true);
  });

  test('legacy fields are preserved for backward compatibility', async () => {
    const engine = new RecommendationEngine(makeMockSimulator(), MOCK_INPUTS, MOCK_CONFIG);
    const recs = await engine.generateRecommendations();
    if (recs.length === 0) return;
    const rec = recs[0];
    expect(rec).toHaveProperty('title');
    expect(rec).toHaveProperty('category');
    expect(rec).toHaveProperty('description');
    expect(rec).toHaveProperty('impact');
    expect(rec).toHaveProperty('feasibility');
    expect(rec).toHaveProperty('successRateDiff');
    expect(rec).toHaveProperty('medianBalanceDiff');
  });

  test('no duplicate recommendation ids', async () => {
    const engine = new RecommendationEngine(makeMockSimulator(), MOCK_INPUTS, MOCK_CONFIG);
    const recs = await engine.generateRecommendations();
    const ids = recs.map(r => r.id).filter(Boolean);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  test('annuity educational recommendation is present when success rate < 0.90', async () => {
    const mockSim = makeMockSimulator({
      runMonteCarloSimulation: jest.fn().mockResolvedValue({ successRate: 0.75, median: 400000 }),
    });
    const engine = new RecommendationEngine(mockSim, MOCK_INPUTS, MOCK_CONFIG);
    const recs = await engine.generateRecommendations();
    const annuityRec = recs.find(r => r.category === 'Annuity' || (r.title || '').toLowerCase().includes('annuity'));
    expect(annuityRec).toBeDefined();
  });

  test('annuity recommendation has isTryThisDisabled=true', async () => {
    const engine = new RecommendationEngine(makeMockSimulator(), MOCK_INPUTS, MOCK_CONFIG);
    const recs = await engine.generateRecommendations();
    const annuity = recs.find(r => r.category === 'Annuity');
    if (annuity) {
      expect(annuity.isTryThisDisabled).toBe(true);
    }
  });

  test('priority is HIGH for high-positive impact recommendations', async () => {
    const mockSim = makeMockSimulator({
      runScenarioComparison: jest.fn().mockResolvedValue({
        scenarios: [
          { name: 'Current Plan', successRate: 0.70, medianBalance: 400000, description: 'baseline' },
          { name: 'High Impact Super', successRate: 0.90, medianBalance: 700000, description: 'big boost', factorsChanged: [], feasibility: 'easy' },
        ],
      }),
    });
    const engine = new RecommendationEngine(mockSim, MOCK_INPUTS, MOCK_CONFIG);
    const recs = await engine.generateRecommendations();
    const highImpact = recs.find(r => r.priority === 'HIGH');
    expect(highImpact).toBeDefined();
  });

  test('recommendations do not run before baseline exists (empty inputs guard)', async () => {
    const mockSim = makeMockSimulator({
      runMonteCarloSimulation: jest.fn().mockResolvedValue(null),
    });
    const engine = new RecommendationEngine(mockSim, { yourCurrentAge: 45, retirementAge: 65 }, MOCK_CONFIG);
    const recs = await engine.generateRecommendations();
    expect(Array.isArray(recs)).toBe(true);
  });
});

// ── Homeowner vs non-homeowner handling ──────────────────────────────────────

describe('RecommendationEngine — homeowner vs non-homeowner', () => {
  test('downsize scenario not generated for non-homeowners', async () => {
    const inputs = { ...MOCK_INPUTS, homeValue: 0, planToDownsize: false };
    const engine = new RecommendationEngine(makeMockSimulator(), inputs, MOCK_CONFIG);
    const scenarios = engine.generateScenarios({ successRate: 0.75, medianBalance: 400000, monteCarlo: {}, deterministic: {} });
    const downsize = scenarios.filter(s => s.name && s.name.toLowerCase().includes('downsize'));
    expect(downsize.length).toBe(0);
  });
});
