/**
 * AdvancedDesignEngine — Australian Retirement Projection Engine (Pipeline C)
 *
 * TASK-005 (enhancements.md §Phase 1): Fix stale constants, input normalisation,
 * and add deeming-based income test.
 *
 * Changes from the original version:
 *  1. Age Pension thresholds now imported from ENHANCED_CONFIG (config.js) —
 *     the single source of truth — instead of being hardcoded as 2024-25 values.
 *  2. Age Pension calculation now uses a proper two-test means test (asset test
 *     AND income test with deeming) via calcSinglePensionFromConfig() using the
 *     same applyMeansTest helper as pension_engine.js.
 *  3. Inputs are normalised via _normalise() which detects whether a value is
 *     already a decimal or is a percentage and converts consistently.
 *  4. Couple-mode pension uses the couple thresholds when isCouple=true.
 *  5. A clear "Pipeline C — simplified model" note is added.  The accumulation
 *     phase does not model salary sacrifice, employer SG, or Division 293 —
 *     use the main calculator (Pipeline A) for those details.
 */

import { ENHANCED_CONFIG }       from './config.js';
import { calculateDeemedIncome } from './utils.js';

// ── Shared means-test helper (mirrors pension_engine.js logic) ────────────────

/**
 * Apply asset test and income test; return the more restrictive result.
 *
 * @param {number} totalAssets    – assessable assets ($)
 * @param {number} annualIncome   – assessable income p.a. ($ — already includes deeming)
 * @param {number} maxPension     – maximum annual pension ($)
 * @param {number} assetThreshold – full-pension asset limit ($)
 * @param {number} assetLimit     – nil-pension asset cut-off ($)
 * @param {number} fnThreshold    – fortnightly income free area ($)
 * @returns {number} annual pension
 */
const applyMeansTest = (totalAssets, annualIncome, maxPension, assetThreshold, assetLimit, fnThreshold) => {
    // Asset test: $3 per fortnight per $1,000 over threshold ($78/yr per $1,000)
    let fromAssets = 0;
    if (totalAssets <= assetThreshold) {
        fromAssets = maxPension;
    } else if (totalAssets < assetLimit) {
        fromAssets = Math.max(0, maxPension - ((totalAssets - assetThreshold) / 1000) * 3 * 26);
    }

    // Income test: 50c per dollar above the fortnightly free area
    let fromIncome = maxPension;
    const fnIncome = annualIncome / 26;
    if (fnIncome > fnThreshold) {
        fromIncome = Math.max(0, maxPension - (fnIncome - fnThreshold) * 0.5 * 26);
    }

    return Math.min(fromAssets, fromIncome);
};

// ── Pipeline C engine ─────────────────────────────────────────────────────────

/**
 * AdvancedDesignEngine — Pipeline C simplified retirement projection.
 *
 * NOTE: This engine models a high-level accumulation/decumulation arc.
 * It does NOT model salary sacrifice caps, employer SG, Division 293/296,
 * NCC bring-forward, or couple tax splitting.  Use the main RetirementSimulator
 * (Pipeline A, via simulator.js) for full accuracy.
 */
export class AdvancedDesignEngine {

    /* ------------------------------------------------------------------ */
    /* Scenario presets — rates are stored as percentages to match the     */
    /* UI inputs for the advanced design page.                             */
    /* ------------------------------------------------------------------ */
    static PRESETS = {
        conservative: { superReturn: 5.5, savingsReturn: 4.5, inflation: 3.5 },
        balanced:     { superReturn: 7.5, savingsReturn: 6.0, inflation: 2.6 },
        aggressive:   { superReturn: 9.5, savingsReturn: 8.0, inflation: 2.0 },
    };

    /* ------------------------------------------------------------------ */
    /* Public API                                                           */
    /* ------------------------------------------------------------------ */

    /**
     * calculate(inputs) → full results object
     *
     * inputs fields (all rates are plain percentages, e.g. 7.5 for 7.5%):
     *   currentAge          : number  (18–85)
     *   retirementAge       : number  (50–75)
     *   planningHorizon     : number  (75–100)  — life-expectancy year
     *   currentSuper        : number  (AUD)
     *   annualContribution  : number  (AUD/yr)
     *   currentSalary       : number  (AUD/yr)
     *   additionalSavings   : number  (AUD)
     *   annualSavingsContrib: number  (AUD/yr)
     *   superReturn         : number  (%, e.g. 7.5)
     *   savingsReturn       : number  (%, e.g. 6.0)
     *   inflation           : number  (%, e.g. 2.6)
     *   realTerms           : boolean (true = deflate results to today's dollars)
     *   annualWithdrawal    : number  (AUD/yr — nominal at retirement)
     *   inflationAdjusted   : boolean (true = increase withdrawal with CPI each year)
     *   isCouple            : boolean (true = use couple pension thresholds)
     *   homeowner           : boolean (true = homeowner asset thresholds; default true)
     */
    calculate(inputs) {
        const p = this._normalise(inputs);
        return this._runSimulation(p);
    }

    /**
     * runStressTest(inputs, stressType, stressYear) → stressed results object
     *
     * stressType: 'sequence-of-returns' | 'market-crash'
     * stressYear: 1–5 (year of retirement at which crash is applied; used for market-crash only)
     */
    runStressTest(inputs, stressType, stressYear = 1) {
        const p = this._normalise(inputs);
        return this._runSimulation(p, { stressType, stressYear: parseInt(stressYear, 10) });
    }

    /**
     * calculateScenarioRanges(inputs) → { conservative, balanced, aggressive }
     * Each value is a full results object using that preset's return/inflation assumptions.
     */
    calculateScenarioRanges(inputs) {
        const result = {};
        for (const [name, preset] of Object.entries(AdvancedDesignEngine.PRESETS)) {
            const merged = Object.assign({}, inputs, {
                superReturn:   preset.superReturn,
                savingsReturn: preset.savingsReturn,
                inflation:     preset.inflation,
            });
            result[name] = this.calculate(merged);
        }
        return result;
    }

    /**
     * calculateSensitivity(inputs) → array of top-3 sensitivity drivers
     *
     * Each item: { driver, label, impact, direction, description }
     * impact is the absolute change in annualRetirementIncome when the driver increases by 10%.
     */
    calculateSensitivity(inputs) {
        const base = this.calculate(inputs);
        const baseIncome = base.annualRetirementIncome;

        const drivers = [
            {
                key: 'superReturn',
                label: 'Investment return (super)',
                delta: inputs.superReturn * 0.10,
                unit: '%',
            },
            {
                key: 'annualContribution',
                label: 'Annual super contribution',
                delta: Math.max(inputs.annualContribution * 0.10, 1_000),
                unit: '$',
            },
            {
                key: 'currentSuper',
                label: 'Current super balance',
                delta: Math.max(inputs.currentSuper * 0.10, 10_000),
                unit: '$',
            },
            {
                key: 'retirementAge',
                label: 'Retirement age',
                delta: 1,
                unit: 'yr',
            },
            {
                key: 'inflation',
                label: 'Inflation rate',
                delta: inputs.inflation * 0.10,
                unit: '%',
                negative: true,
            },
            {
                key: 'annualWithdrawal',
                label: 'Annual withdrawal',
                delta: Math.max(inputs.annualWithdrawal * 0.10, 1_000),
                unit: '$',
                negative: true,
            },
        ];

        const results = drivers.map(d => {
            const modified = Object.assign({}, inputs, { [d.key]: inputs[d.key] + d.delta });
            let modIncome;
            try {
                modIncome = this.calculate(modified).annualRetirementIncome;
            } catch {
                modIncome = baseIncome;
            }
            const impact = modIncome - baseIncome;
            return {
                driver: d.key,
                label: d.label,
                delta: d.delta,
                unit: d.unit,
                impact,
                direction: impact >= 0 ? 'positive' : 'negative',
                description: this._sensitivityDescription(d, impact, inputs),
            };
        });

        return results
            .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
            .slice(0, 3);
    }

    /* ------------------------------------------------------------------ */
    /* Internal helpers                                                     */
    /* ------------------------------------------------------------------ */

    /**
     * Normalise inputs: convert percentage rates to decimals and supply defaults.
     *
     * TASK-005: Rates are accepted as plain percentages (7.5) from the UI but must
     * be stored as decimals (0.075) internally for all arithmetic.  The _normalise()
     * method is the single conversion boundary — no /100 should appear elsewhere.
     */
    _normalise(inputs) {
        return {
            currentAge:           Number(inputs.currentAge)           || 45,
            retirementAge:        Number(inputs.retirementAge)        || 65,
            planningHorizon:      Number(inputs.planningHorizon)      || 90,
            currentSuper:         Number(inputs.currentSuper)         || 0,
            annualContribution:   Number(inputs.annualContribution)   || 0,
            currentSalary:        Number(inputs.currentSalary)        || 0,
            additionalSavings:    Number(inputs.additionalSavings)    || 0,
            annualSavingsContrib: Number(inputs.annualSavingsContrib) || 0,
            // Percentage → decimal conversion with defensive detection:
            // if the value is already ≤ 1 treat it as a decimal; otherwise divide by 100.
            superReturn:    this._toDecimal(inputs.superReturn,    7.5),
            savingsReturn:  this._toDecimal(inputs.savingsReturn,  6.0),
            inflation:      this._toDecimal(inputs.inflation,      2.6),
            realTerms:      Boolean(inputs.realTerms),
            annualWithdrawal:  Number(inputs.annualWithdrawal)  || 60_000,
            inflationAdjusted: inputs.inflationAdjusted !== false,
            isCouple:  Boolean(inputs.isCouple),
            homeowner: inputs.homeowner !== false, // default true
        };
    }

    /**
     * Convert a rate value to decimal, guarding against already-decimal inputs.
     * Values > 1 are treated as percentages (e.g. 7.5 → 0.075).
     * Values ≤ 1 are treated as already-decimal (e.g. 0.075 unchanged).
     * Defaults to defaultPct / 100 when the input is absent or NaN.
     */
    _toDecimal(value, defaultPct) {
        const n = Number(value);
        if (!isFinite(n) || n === 0) return defaultPct / 100;
        return n > 1 ? n / 100 : n;
    }

    /**
     * Core simulation loop.
     * stress = null | { stressType: string, stressYear: number }
     */
    _runSimulation(p, stress = null) {
        const yearsToRetirement = Math.max(0, p.retirementAge - p.currentAge);
        const yearsInRetirement = Math.max(0, p.planningHorizon - p.retirementAge);

        // ---- Accumulation phase ----------------------------------------
        let superBal    = p.currentSuper;
        let savingsBal  = p.additionalSavings;
        const yearByYear = [];
        let cpiFactor   = 1;

        for (let yr = 0; yr < yearsToRetirement; yr++) {
            const age = p.currentAge + yr;
            superBal    = (superBal    + p.annualContribution)    * (1 + p.superReturn);
            savingsBal  = (savingsBal  + p.annualSavingsContrib)  * (1 + p.savingsReturn);
            cpiFactor  *= (1 + p.inflation);

            const display = p.realTerms ? 1 / cpiFactor : 1;
            yearByYear.push({
                age,
                phase: 'accumulation',
                superBalance:    Math.round(superBal    * display),
                savingsBalance:  Math.round(savingsBal  * display),
                totalBalance:    Math.round((superBal + savingsBal) * display),
                withdrawal:      0,
                agePension:      0,
            });
        }

        const retirementBalance        = superBal + savingsBal;
        const retirementSuperBalance   = superBal;
        const retirementSavingsBalance = savingsBal;

        // ---- Age Pension estimate (at pension eligibility age) ----------
        // TASK-005: Use thresholds from config.js and apply proper income test
        // with deeming on financial assets (Services Australia deeming rates).
        const pensionEligAge   = ENHANCED_CONFIG.OVERSEAS_RETIREMENT?.PENSION_AGE || 67;
        const agePensionAge    = Math.max(p.retirementAge, pensionEligAge);
        const agePensionEstimate = this._calcAgePension(retirementBalance, agePensionAge, p);

        // ---- Decumulation phase ----------------------------------------
        let decumSuper   = retirementSuperBalance;
        let decumSavings = retirementSavingsBalance;
        let withdrawal   = p.annualWithdrawal;
        let depletionYear = null;

        for (let yr = 0; yr < yearsInRetirement; yr++) {
            const age     = p.retirementAge + yr;
            const retirYr = yr + 1;
            cpiFactor    *= (1 + p.inflation);

            if (p.inflationAdjusted && yr > 0) {
                withdrawal *= (1 + p.inflation);
            }

            let superRet   = p.superReturn;
            let savingsRet = p.savingsReturn;

            if (stress) {
                if (stress.stressType === 'sequence-of-returns' && retirYr <= 3) {
                    superRet   = -0.10;
                    savingsRet = -0.10;
                }
                if (stress.stressType === 'market-crash' && retirYr === stress.stressYear) {
                    decumSuper   *= 0.75;
                    decumSavings *= 0.75;
                }
            }

            const totalNow = decumSuper + decumSavings;
            const pension  = this._calcAgePension(totalNow, age, p);

            const netWithdrawal = Math.max(0, withdrawal - pension);

            const totalDecum = decumSuper + decumSavings;
            if (totalDecum > 0) {
                const superShare   = decumSuper   / totalDecum;
                const savingsShare = decumSavings / totalDecum;
                decumSuper   = Math.max(0, decumSuper   - netWithdrawal * superShare);
                decumSavings = Math.max(0, decumSavings - netWithdrawal * savingsShare);
            } else {
                decumSuper   = 0;
                decumSavings = 0;
            }

            decumSuper   *= (1 + superRet);
            decumSavings *= (1 + savingsRet);

            const totalAfter = decumSuper + decumSavings;
            const display    = p.realTerms ? 1 / cpiFactor : 1;

            yearByYear.push({
                age,
                phase: 'decumulation',
                superBalance:    Math.round(Math.max(0, decumSuper)   * display),
                savingsBalance:  Math.round(Math.max(0, decumSavings) * display),
                totalBalance:    Math.round(Math.max(0, totalAfter)   * display),
                withdrawal:      Math.round(withdrawal * display),
                agePension:      Math.round(pension    * display),
            });

            if (depletionYear === null && totalAfter <= 0) {
                depletionYear = age + 1;
            }
        }

        const annualRetirementIncome = this._calcSustainableIncome(
            retirementBalance, p.superReturn, p.savingsReturn, p.inflation,
            p.annualWithdrawal, agePensionEstimate, yearsInRetirement, p.inflationAdjusted
        );

        const incomeReplacementRatio = p.currentSalary > 0
            ? (annualRetirementIncome / p.currentSalary) * 100
            : null;

        return {
            retirementBalance:       Math.round(retirementBalance),
            annualRetirementIncome:  Math.round(annualRetirementIncome),
            incomeReplacementRatio:  incomeReplacementRatio !== null
                ? Math.round(incomeReplacementRatio * 10) / 10
                : null,
            depletionYear,
            planningHorizon:         p.planningHorizon,
            retirementAge:           p.retirementAge,
            agePensionEstimate:      Math.round(agePensionEstimate),
            yearByYear,
        };
    }

    /**
     * Age Pension estimate using current ENHANCED_CONFIG thresholds and deeming.
     *
     * TASK-005: Replaces the original linear taper that used stale 2024-25 constants
     * and had no income test.  Now applies:
     *  - Asset test (config.js thresholds, updated each indexation)
     *  - Income test using calculateDeemedIncome() from utils.js
     *  - Couple thresholds when p.isCouple is true
     *
     * @param {number} totalAssets – total financial assets at that age
     * @param {number} age         – person's current age
     * @param {Object} p           – normalised parameters from _normalise()
     * @returns {number} estimated annual Age Pension ($)
     */
    _calcAgePension(totalAssets, age, p) {
        const pensionEligAge = ENHANCED_CONFIG.OVERSEAS_RETIREMENT?.PENSION_AGE || 67;
        if (age < pensionEligAge) return 0;

        // Deeming on financial assets (the entire portfolio is treated as financial assets
        // for this simplified model).
        const deemedIncome = calculateDeemedIncome(totalAssets, p.isCouple);

        if (p.isCouple) {
            const maxPension     = ENHANCED_CONFIG.COUPLE_PENSION_MAX;
            const assetThreshold = p.homeowner
                ? ENHANCED_CONFIG.COUPLE_ASSET_THRESHOLD
                : ENHANCED_CONFIG.COUPLE_ASSET_THRESHOLD_NON_HOMEOWNER;
            const assetLimit = p.homeowner
                ? ENHANCED_CONFIG.COUPLE_ASSET_LIMIT
                : ENHANCED_CONFIG.COUPLE_ASSET_LIMIT_NON_HOMEOWNER;
            const fnThreshold = ENHANCED_CONFIG.COUPLE_INCOME_THRESHOLD;

            return applyMeansTest(totalAssets, deemedIncome, maxPension, assetThreshold, assetLimit, fnThreshold);
        }

        // Single person
        const maxPension     = ENHANCED_CONFIG.SINGLE_PENSION_MAX;
        const assetThreshold = p.homeowner
            ? ENHANCED_CONFIG.SINGLE_ASSET_THRESHOLD
            : ENHANCED_CONFIG.SINGLE_ASSET_THRESHOLD_NON_HOMEOWNER;
        const assetLimit = p.homeowner
            ? ENHANCED_CONFIG.SINGLE_ASSET_LIMIT
            : ENHANCED_CONFIG.SINGLE_ASSET_LIMIT_NON_HOMEOWNER;
        const fnThreshold = ENHANCED_CONFIG.SINGLE_INCOME_THRESHOLD;

        return applyMeansTest(totalAssets, deemedIncome, maxPension, assetThreshold, assetLimit, fnThreshold);
    }

    /**
     * Calculate sustainable annual income given a retirement portfolio.
     * Uses a growing-annuity present-value factor.  If the requested withdrawal
     * is feasible for the full horizon, it is returned; otherwise scaled back.
     */
    _calcSustainableIncome(balance, superRet, savingsRet, inflation, requestedWithdrawal,
                           pension, years, inflationAdjusted) {
        if (years <= 0 || balance <= 0) return 0;

        const r = (superRet + savingsRet) / 2;
        const g = inflationAdjusted ? inflation : 0;

        let pvFactor;
        if (Math.abs(r - g) < 1e-8) {
            pvFactor = years / (1 + r);
        } else {
            pvFactor = (1 - Math.pow((1 + g) / (1 + r), years)) / (r - g);
        }

        if (pvFactor <= 0) return requestedWithdrawal;

        const maxWithdrawal    = balance / pvFactor;
        const sustainableTotal = Math.max(0, maxWithdrawal) + pension;
        return Math.min(sustainableTotal, requestedWithdrawal + pension);
    }

    /** Build a human-readable description for a sensitivity driver. */
    _sensitivityDescription(driver, impact, inputs) {
        const fmt  = v => '$' + Math.abs(Math.round(v)).toLocaleString('en-AU');
        const sign = impact >= 0 ? 'adds approximately' : 'reduces income by approximately';
        switch (driver.key) {
            case 'superReturn':
                return `A 10% increase in the super return rate (to ${(inputs.superReturn * 1.1).toFixed(2)}%) ${sign} ${fmt(impact)} per year.`;
            case 'annualContribution':
                return `Contributing an extra ${fmt(driver.delta)} per year to super ${sign} ${fmt(impact)} per year in retirement.`;
            case 'currentSuper':
                return `An extra ${fmt(driver.delta)} in starting super balance ${sign} ${fmt(impact)} per year in retirement.`;
            case 'retirementAge':
                return `Retiring one year later ${sign} ${fmt(impact)} per year in retirement income.`;
            case 'inflation':
                return `A 10% rise in the inflation rate ${impact >= 0 ? 'improves' : 'reduces'} modelled income by approximately ${fmt(Math.abs(impact))} per year.`;
            case 'annualWithdrawal': {
                const dir = driver.delta >= 0 ? 'Increasing' : 'Reducing';
                return `${dir} the annual withdrawal by ${fmt(driver.delta)} changes the fund's longevity by approximately ${fmt(Math.abs(impact))} per year in equivalent value.`;
            }
            default:
                return `Changing ${driver.label} by ${driver.delta}${driver.unit} ${sign} ${fmt(impact)} per year.`;
        }
    }
}
