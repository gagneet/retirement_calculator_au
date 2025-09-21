// Presets & defaults used by simulator

const ASSET_CLASS = {
  equity: { mean: 0.07, sd: 0.15 },
  bond:   { mean: 0.03, sd: 0.05 },
  cash:   { mean: 0.015, sd: 0.01 }
};

// default correlations (symmetric)
const CORRELATIONS = {
  equity_bond: 0.2,
  equity_cash: 0.1,
  bond_cash: 0.05
};

// Helper presets for allocation dropdown
const ALLOCATION_PRESETS = {
  balanced: { e: 60, b: 30, c: 10 },
  conservative: { e: 30, b: 50, c: 20 },
  growth: { e: 80, b: 15, c: 5 }
};

// small numeric tolerance for sanity check
const SANITY_TOL = 1e-6;
