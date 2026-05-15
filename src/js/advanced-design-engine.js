/**
 * AdvancedDesignEngine — Australian Retirement Projection Engine (Pipeline C)
 *
 * IMPORTANT: This file is deployed as a raw ES6 module via CopyPlugin —
 * it is NOT bundled by webpack. It must remain fully self-contained with
 * NO external import statements, as config.js and utils.js are not copied
 * to dist/js/ alongside it.
 *
 * PR review fix (comment #3247147334): The previous version added import
 * statements for config.js and utils.js which would fail at runtime on the
 * production advanced-design page.  All required constants and helpers are
 * now inlined directly in this file, sourced from config.js as at March 2026.
 *
 * When policy constants change (indexation every March / September), update
 * the POLICY block below and the companion config.js simultaneously.
 *
 * TASK-005 fixes retained:
 *  1. Age Pension means test uses current March 2026 thresholds (not 2024-25).
 *  2. Proper two-test means test (asset test + income test with deeming).
 *  3. Couple mode uses couple thresholds when isCouple=true.
 *  4. One-partner-eligible case returns half the couple pension.
 *  5. _normalise() converts percentage inputs to decimals consistently.
 */

// ── Inlined policy constants (source: config.js, March 2026 indexation) ──────
// Services Australia — verified 14 May 2026
// Next review: 20 September 2026

const POLICY = {
    // Age Pension eligibility age
    PENSION_AGE: 67,

    // Maximum annual Age Pension (March 2026)
    SINGLE_PENSION_MAX:  31223,   // $1,200.90/fn × 26
    COUPLE_PENSION_MAX:  47070,   // $1,810.40/fn × 26 (combined)

    // Asset test thresholds — full pension below, nil above cutoff
    SINGLE_ASSET_THRESHOLD:               321500,
    SINGLE_ASSET_LIMIT:                   722000,
    SINGLE_ASSET_THRESHOLD_NON_HOMEOWNER: 579500,
    SINGLE_ASSET_LIMIT_NON_HOMEOWNER:     980000,
    COUPLE_ASSET_THRESHOLD:               481500,
    COUPLE_ASSET_LIMIT:                  1085000,
    COUPLE_ASSET_THRESHOLD_NON_HOMEOWNER: 739500,
    COUPLE_ASSET_LIMIT_NON_HOMEOWNER:    1343000,

    // Fortnightly income free areas
    SINGLE_INCOME_THRESHOLD: 218,
    COUPLE_INCOME_THRESHOLD:  380,

    // Deeming rates (March 2026)
    DEEMING_THRESHOLD_SINGLE:  64200,
    DEEMING_THRESHOLD_COUPLE: 106200,
    DEEMING_RATE_LOWER: 0.0125,   // 1.25% on assets up to threshold
    DEEMING_RATE_UPPER: 0.0325,   // 3.25% on assets above threshold
};

// ── Inlined deeming helper ────────────────────────────────────────────────────

/**
 * Calculate deemed annual income on financial assets.
 * Mirrors calculateDeemedIncome() from utils.js.
 */
const calcDeemedIncome = (financialAssets, isCouple) => {
    const assets = Math.max(0, financialAssets || 0);
    const threshold = isCouple
        ? POLICY.DEEMING_THRESHOLD_COUPLE
        : POLICY.DEEMING_THRESHOLD_SINGLE;
    const lower  = Math.min(assets, threshold);
    const upper  = Math.max(0, assets - threshold);
    return lower * POLICY.DEEMING_RATE_LOWER + upper * POLICY.DEEMING_RATE_UPPER;
};

// ── Shared means-test helper ──────────────────────────────────────────────────

/**
 * Apply asset test and income test; return the more restrictive result.
 */
const applyMeansTest = (totalAssets, annualIncome, maxPension, assetThreshold, assetLimit, fnThreshold) => {
    // Asset test: $3/fn reduction per $1,000 over threshold = $78/yr per $1,000
    let fromAssets = 0;
    if (totalAssets <= assetThreshold) {
        fromAssets = maxPension;
    } else if (totalAssets < assetLimit) {
        fromAssets = Math.max(0, maxPension - ((totalAssets - assetThreshold) / 1000) * 3 * 26);
    }

    // Income test: 50c per dollar above fortnightly free area
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
 * NOTE: This engine models a high-level accumulation/decumulation arc for the
 * Advanced Design page.  It does NOT model salary sacrifice caps, employer SG,
 * Division 293/296, NCC bring-forward, or couple tax splitting.  Use the main
 * RetirementSimulator (Pipeline A) for full accuracy.
 */
export class AdvancedDesignEngine {

    /* ------------------------------------------------------------------ */
    /* Scenario presets                                                     */
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
     * All rate inputs are plain percentages (e.g. 7.5 for 7.5%).
     * Boolean inputs: realTerms, inflationAdjusted, isCouple, homeowner.
     */
    calculate(inputs) {
        const p = this._normalise(inputs);
        return this._runSimulation(p);
    }

    /** runStressTest(inputs, stressType, stressYear) → stressed results object */
    runStressTest(inputs, stressType, stressYear = 1) {
        const p = this._normalise(inputs);
        return this._runSimulation(p, { stressType, stressYear: parseInt(stressYear, 10) });
    }

    /** calculateScenarioRanges(inputs) → { conservative, balanced, aggressive } */
    calculateScenarioRanges(inputs) {
        const result = {};
        for (const [name, preset] of Object.entries(AdvancedDesignEngine.PRESETS)) {
            result[name] = this.calculate(Object.assign({}, inputs, {
                superReturn:   preset.superReturn,
                savingsReturn: preset.savingsReturn,
                inflation:     preset.inflation,
            }));
        }
        return result;
    }

    /** calculateSensitivity(inputs) → array of top-3 sensitivity drivers */
    calculateSensitivity(inputs) {
        const base = this.calculate(inputs);
        const baseIncome = base.annualRetirementIncome;

        const drivers = [
            { key: 'superReturn',        label: 'Investment return (super)',     delta: inputs.superReturn * 0.10,                          unit: '%' },
            { key: 'annualContribution', label: 'Annual super contribution',     delta: Math.max(inputs.annualContribution * 0.10, 1000),   unit: '$' },
            { key: 'currentSuper',       label: 'Current super balance',         delta: Math.max(inputs.currentSuper * 0.10, 10000),        unit: '$' },
            { key: 'retirementAge',      label: 'Retirement age',                delta: 1,                                                  unit: 'yr' },
            { key: 'inflation',          label: 'Inflation rate',                delta: inputs.inflation * 0.10,                            unit: '%',  negative: true },
            { key: 'annualWithdrawal',   label: 'Annual withdrawal',             delta: Math.max(inputs.annualWithdrawal * 0.10, 1000),     unit: '$',  negative: true },
        ];

        return drivers
            .map(d => {
                let modIncome;
                try { modIncome = this.calculate(Object.assign({}, inputs, { [d.key]: inputs[d.key] + d.delta })).annualRetirementIncome; }
                catch { modIncome = baseIncome; }
                const impact = modIncome - baseIncome;
                return { driver: d.key, label: d.label, delta: d.delta, unit: d.unit, impact, direction: impact >= 0 ? 'positive' : 'negative', description: this._sensitivityDescription(d, impact, inputs) };
            })
            .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
            .slice(0, 3);
    }

    /* ------------------------------------------------------------------ */
    /* Internal helpers                                                     */
    /* ------------------------------------------------------------------ */

    /**
     * Normalise inputs: convert percentage rates to decimals and supply defaults.
     * _toDecimal() detects whether a value is already a decimal (≤1) or a
     * percentage (>1) so callers do not need to pre-convert.
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
            superReturn:    this._toDecimal(inputs.superReturn,    7.5),
            savingsReturn:  this._toDecimal(inputs.savingsReturn,  6.0),
            inflation:      this._toDecimal(inputs.inflation,      2.6),
            realTerms:      Boolean(inputs.realTerms),
            annualWithdrawal:  Number(inputs.annualWithdrawal)  || 60000,
            inflationAdjusted: inputs.inflationAdjusted !== false,
            isCouple:  Boolean(inputs.isCouple),
            homeowner: inputs.homeowner !== false, // default true
        };
    }

    /**
     * Convert a rate value to decimal.
     * Values > 1 treated as percentages (7.5 → 0.075).
     * Values 0 < v ≤ 1 treated as already-decimal (0.075 → 0.075).
     * Absent / NaN → defaultPct / 100.
     */
    _toDecimal(value, defaultPct) {
        const n = Number(value);
        if (!isFinite(n) || n === 0) return defaultPct / 100;
        return n > 1 ? n / 100 : n;
    }

    /** Core simulation loop. stress = null | { stressType, stressYear } */
    _runSimulation(p, stress = null) {
        const yearsToRetirement = Math.max(0, p.retirementAge - p.currentAge);
        const yearsInRetirement = Math.max(0, p.planningHorizon - p.retirementAge);

        // ── Accumulation ─────────────────────────────────────────────────
        let superBal   = p.currentSuper;
        let savingsBal = p.additionalSavings;
        const yearByYear = [];
        let cpiFactor = 1;

        for (let yr = 0; yr < yearsToRetirement; yr++) {
            superBal    = (superBal    + p.annualContribution)    * (1 + p.superReturn);
            savingsBal  = (savingsBal  + p.annualSavingsContrib)  * (1 + p.savingsReturn);
            cpiFactor  *= (1 + p.inflation);
            const display = p.realTerms ? 1 / cpiFactor : 1;
            yearByYear.push({
                age:            p.currentAge + yr,
                phase:          'accumulation',
                superBalance:   Math.round(superBal    * display),
                savingsBalance: Math.round(savingsBal  * display),
                totalBalance:   Math.round((superBal + savingsBal) * display),
                withdrawal:     0,
                agePension:     0,
            });
        }

        const retirementBalance        = superBal + savingsBal;
        const retirementSuperBalance   = superBal;
        const retirementSavingsBalance = savingsBal;

        // ── Age Pension at pension-eligibility age ────────────────────────
        const pensionEligAge     = POLICY.PENSION_AGE;
        const agePensionAge      = Math.max(p.retirementAge, pensionEligAge);
        const agePensionEstimate = this._calcAgePension(retirementBalance, agePensionAge, p);

        // ── Decumulation ─────────────────────────────────────────────────
        let decumSuper   = retirementSuperBalance;
        let decumSavings = retirementSavingsBalance;
        let withdrawal   = p.annualWithdrawal;
        let depletionYear = null;

        for (let yr = 0; yr < yearsInRetirement; yr++) {
            const age     = p.retirementAge + yr;
            const retirYr = yr + 1;
            cpiFactor    *= (1 + p.inflation);

            if (p.inflationAdjusted && yr > 0) withdrawal *= (1 + p.inflation);

            let superRet   = p.superReturn;
            let savingsRet = p.savingsReturn;

            if (stress) {
                if (stress.stressType === 'sequence-of-returns' && retirYr <= 3) {
                    superRet = savingsRet = -0.10;
                }
                if (stress.stressType === 'market-crash' && retirYr === stress.stressYear) {
                    decumSuper   *= 0.75;
                    decumSavings *= 0.75;
                }
            }

            const totalNow      = decumSuper + decumSavings;
            const pension       = this._calcAgePension(totalNow, age, p);
            const netWithdrawal = Math.max(0, withdrawal - pension);

            if (totalNow > 0) {
                const superShare   = decumSuper   / totalNow;
                const savingsShare = decumSavings / totalNow;
                decumSuper   = Math.max(0, decumSuper   - netWithdrawal * superShare);
                decumSavings = Math.max(0, decumSavings - netWithdrawal * savingsShare);
            } else {
                decumSuper = decumSavings = 0;
            }

            decumSuper   *= (1 + superRet);
            decumSavings *= (1 + savingsRet);

            const totalAfter = decumSuper + decumSavings;
            const display    = p.realTerms ? 1 / cpiFactor : 1;

            yearByYear.push({
                age,
                phase:          'decumulation',
                superBalance:   Math.round(Math.max(0, decumSuper)   * display),
                savingsBalance: Math.round(Math.max(0, decumSavings) * display),
                totalBalance:   Math.round(Math.max(0, totalAfter)   * display),
                withdrawal:     Math.round(withdrawal * display),
                agePension:     Math.round(pension    * display),
            });

            if (depletionYear === null && totalAfter <= 0) depletionYear = age + 1;
        }

        const annualRetirementIncome = this._calcSustainableIncome(
            retirementBalance, p.superReturn, p.savingsReturn, p.inflation,
            p.annualWithdrawal, agePensionEstimate, yearsInRetirement, p.inflationAdjusted
        );

        return {
            retirementBalance:       Math.round(retirementBalance),
            annualRetirementIncome:  Math.round(annualRetirementIncome),
            incomeReplacementRatio:  p.currentSalary > 0
                ? Math.round((annualRetirementIncome / p.currentSalary) * 1000) / 10
                : null,
            depletionYear,
            planningHorizon:     p.planningHorizon,
            retirementAge:       p.retirementAge,
            agePensionEstimate:  Math.round(agePensionEstimate),
            yearByYear,
        };
    }

    /**
     * Age Pension estimate using current policy constants and deeming.
     *
     * PR review fix: one-partner-eligible case now pays half the couple
     * combined pension (only the eligible partner receives it).
     *
     * @param {number} totalAssets – total portfolio value at this age
     * @param {number} age         – current age
     * @param {Object} p           – normalised inputs
     */
    _calcAgePension(totalAssets, age, p) {
        if (age < POLICY.PENSION_AGE) return 0;

        const deemedIncome = calcDeemedIncome(totalAssets, p.isCouple);

        if (p.isCouple) {
            const maxPension     = POLICY.COUPLE_PENSION_MAX;
            const assetThreshold = p.homeowner ? POLICY.COUPLE_ASSET_THRESHOLD       : POLICY.COUPLE_ASSET_THRESHOLD_NON_HOMEOWNER;
            const assetLimit     = p.homeowner ? POLICY.COUPLE_ASSET_LIMIT           : POLICY.COUPLE_ASSET_LIMIT_NON_HOMEOWNER;
            const fnThreshold    = POLICY.COUPLE_INCOME_THRESHOLD;
            // Return the combined couple pension (both partners' share)
            return applyMeansTest(totalAssets, deemedIncome, maxPension, assetThreshold, assetLimit, fnThreshold);
        }

        // Single person
        const maxPension     = POLICY.SINGLE_PENSION_MAX;
        const assetThreshold = p.homeowner ? POLICY.SINGLE_ASSET_THRESHOLD       : POLICY.SINGLE_ASSET_THRESHOLD_NON_HOMEOWNER;
        const assetLimit     = p.homeowner ? POLICY.SINGLE_ASSET_LIMIT           : POLICY.SINGLE_ASSET_LIMIT_NON_HOMEOWNER;
        const fnThreshold    = POLICY.SINGLE_INCOME_THRESHOLD;
        return applyMeansTest(totalAssets, deemedIncome, maxPension, assetThreshold, assetLimit, fnThreshold);
    }

    /** Sustainable annual income using a growing-annuity PV factor. */
    _calcSustainableIncome(balance, superRet, savingsRet, inflation, requestedWithdrawal, pension, years, inflationAdjusted) {
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
        const maxWithdrawal = balance / pvFactor;
        return Math.min(Math.max(0, maxWithdrawal) + pension, requestedWithdrawal + pension);
    }

    _sensitivityDescription(d, impact, inputs) {
        const fmt  = v => '$' + Math.abs(Math.round(v)).toLocaleString('en-AU');
        const sign = impact >= 0 ? 'adds approximately' : 'reduces income by approximately';
        switch (d.key) {
            case 'superReturn':        return `A 10% increase in the super return rate (to ${(inputs.superReturn * 1.1).toFixed(2)}%) ${sign} ${fmt(impact)} per year.`;
            case 'annualContribution': return `Contributing an extra ${fmt(d.delta)} per year to super ${sign} ${fmt(impact)} per year in retirement.`;
            case 'currentSuper':       return `An extra ${fmt(d.delta)} in starting super balance ${sign} ${fmt(impact)} per year in retirement.`;
            case 'retirementAge':      return `Retiring one year later ${sign} ${fmt(impact)} per year in retirement income.`;
            case 'inflation':          return `A 10% rise in the inflation rate ${impact >= 0 ? 'improves' : 'reduces'} modelled income by approximately ${fmt(Math.abs(impact))} per year.`;
            case 'annualWithdrawal':   return `${d.delta >= 0 ? 'Increasing' : 'Reducing'} the annual withdrawal by ${fmt(d.delta)} changes the fund's longevity by approximately ${fmt(Math.abs(impact))} per year in equivalent value.`;
            default:                   return `Changing ${d.label} by ${d.delta}${d.unit} ${sign} ${fmt(impact)} per year.`;
        }
    }
}
