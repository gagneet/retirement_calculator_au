# Reverse Retirement Planner Fix Notes

## desiredIncome Unit Convention

- The simulator's `simulateRetirement()` reads `inputs.desiredIncome` (aliased from `asfaComfortable` in `normaliseInputsForSimulation` at line 1238).
- `desiredIncome` is expected in **today's dollars** (real, not nominal). The simulator inflates it internally using `yearsToRetirement` compounding.
- The reverse planner's `normaliseReversePlannerInputs()` in `reverse-planner.js` line 99 maps `targetAnnualIncomeToday` → `asfaComfortable`. This works because `normaliseInputsForSimulation` maps `desiredIncome` ← `asfaComfortable`.

## Bugs Found and Fixed

### Bug 1: SWR proxy used for pass/fail instead of engine outputs
- **File**: `src/js/reverse-solver.js`
- **Function**: `scoreScenario()`
- **Problem**: Used `totalAssets * swr + pension` to compute sustainable income, then compared against target. This is the SWR proxy, not the simulator's actual drawdown result.
- **Fix**: Created `evaluateEngineGoal()` in `reverse-success-predicate.js` that checks `depletionAge >= effectiveLifespan` and `finalBalance > 0` (or meets estate target). All solvers now use this engine-based predicate.

### Bug 2: Age Pension used max pension constant instead of means-tested engine value
- **File**: `src/js/reverse-solver.js` (scoreScenario), `src/js/reverse-planner.js` (buildCurrentPath)
- **Problem**: Used `ENHANCED_CONFIG.SINGLE_PENSION_MAX` / `COUPLE_PENSION_MAX` flat rates instead of the simulator's per-year means-tested `yearlyData[].pensionIncome`.
- **Fix**: `evaluateEngineGoal()` reads `yearlyData[retirementYearIndex].pensionIncome` for age pension at retirement. For the WITH/WITHOUT Age Pension comparison, runs the simulator twice — once normally, once with a new `suppressAgePension` flag.

### Bug 3: Overseas move age conflated with retirement age
- **File**: `src/js/reverse-deep-analysis.js`
- **Function**: `calculateOptimalOverseasAge()`
- **Problem**: Set `retirementAge = moveAge`, so the optimizer changed both retirement age AND overseas move age simultaneously. A user who wants to retire at 65 but move overseas at 60 would get wrong results.
- **Fix**: Separate `retirementAge` (fixed at user's chosen value) from `overseasStartAge` (iterated). Uses country profiles to apply cost-of-living adjustment. Uses `evaluateEngineGoal()` instead of SWR.

### Bug 4: Target income written to wrong key
- **File**: `src/js/reverse-planner.js` (normaliseReversePlannerInputs)
- **Problem**: Target income was set on `asfaComfortable` but the simulator's target-injection test showed it was being read via `desiredIncome`. This was actually working because `normaliseInputsForSimulation` maps `desiredIncome` ← `asfaComfortable`. But the path was fragile.
- **Fix**: Created `applyTargetToEngineInputs()` which explicitly sets `desiredIncome` on all paths.

## What Remains Approximate

1. **Salary reduction tolerance**: The bisection over salary does not model reduced SG contributions at lower salaries (percentage-based contributions scale). Labelled "approximate" when affordable.
2. **Mortgage repayment solver**: Uses analytical PMT formula, not the full simulator (which doesn't directly expose mortgage payoff year as a varied parameter).
3. **Overseas cost profiles**: Country profiles in config have TODO/FX placeholders. Results are labelled "indicative" when data is incomplete.
4. **Aged care**: Uses probability-weighted costs; individual outcomes will vary.

## All Assumptions

- All monetary values in today's dollars unless stated otherwise.
- Deterministic simulation used for bisection inner loops. Monte Carlo validation is separate.
- Age Pension means-testing uses current (March 2026) thresholds and rates.
- Home equity is not counted as spendable capital unless downsizing or equity-release strategy is explicitly enabled.
- Salary bisection: upper bound $500k, lower bound $0.
- Super balance bisection: upper bound $3M, lower bound current balance.
- SWR may still be shown as an educational reference, clearly labelled.

## Acceptance Checklist

- [x] desiredIncome unit convention documented
- [x] Engine success predicate created (reverse-success-predicate.js)
- [x] applyTargetToEngineInputs helper created
- [x] SWR pass/fail replaced in all solvers
- [x] Age Pension uses yearlyData.pensionIncome
- [x] Overseas separates move age from retirement age
- [x] Reliability statuses on all answers
- [x] All new tests pass
- [x] All existing tests pass
