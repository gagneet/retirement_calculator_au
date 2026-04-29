/**
 * AdvancedDesignEngine
 * Standalone Australian retirement modelling engine.
 * No external imports — fully self-contained.
 *
 * All monetary values are plain numbers (AUD). Percentages are stored
 * as decimals internally (e.g. 7.5% → 0.075) but accepted from inputs
 * as plain percentages (7.5) and converted on entry.
 */

export class AdvancedDesignEngine {

    /* ------------------------------------------------------------------ */
    /* Age Pension constants (2024-25 Australian rules)                     */
    /* ------------------------------------------------------------------ */
    static AGE_PENSION = {
        FULL_SINGLE_PA: 30_646,          // Full single Age Pension annual (2024-25)
        ASSETS_LOWER: 321_500,           // Assets threshold below which full pension payable (single, homeowner)
        ASSETS_UPPER: 714_500,           // Assets threshold above which nil pension payable (single, homeowner)
        PENSION_AGE: 67,                 // Eligibility age
    };

    /* ------------------------------------------------------------------ */
    /* Scenario preset definitions                                          */
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
     * inputs = {
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
     * }
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
                superReturn:    preset.superReturn,
                savingsReturn:  preset.savingsReturn,
                inflation:      preset.inflation,
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
                negative: true,   // higher inflation is bad
            },
            {
                key: 'annualWithdrawal',
                label: 'Annual withdrawal',
                delta: Math.max(inputs.annualWithdrawal * 0.10, 1_000),
                unit: '$',
                negative: true,   // higher withdrawal is bad
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
            const rawImpact = modIncome - baseIncome;
            const impact = d.negative ? -rawImpact : rawImpact;
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

        // Return top 3 by absolute impact
        return results
            .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
            .slice(0, 3);
    }

    /* ------------------------------------------------------------------ */
    /* Internal helpers                                                     */
    /* ------------------------------------------------------------------ */

    /** Convert percent inputs to decimals and supply defaults. */
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
            superReturn:          (Number(inputs.superReturn)         || 7.5) / 100,
            savingsReturn:        (Number(inputs.savingsReturn)       || 6.0) / 100,
            inflation:            (Number(inputs.inflation)           || 2.6) / 100,
            realTerms:            Boolean(inputs.realTerms),
            annualWithdrawal:     Number(inputs.annualWithdrawal)     || 60_000,
            inflationAdjusted:    inputs.inflationAdjusted !== false,
        };
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
        let cpiFactor   = 1;   // cumulative for real-terms deflation

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

        const retirementBalance      = superBal + savingsBal;
        const retirementSuperBalance = superBal;
        const retirementSavingsBalance = savingsBal;

        // ---- Age Pension estimate (at pension eligibility age, not necessarily retirement) ----
        // If retiring before pension age (67), use pension-age estimate so the UI shows
        // the supplement the person is expected to receive once eligible.
        const agePensionAge = Math.max(p.retirementAge, AdvancedDesignEngine.AGE_PENSION.PENSION_AGE);
        const agePensionEstimate = this._calcAgePension(retirementBalance, agePensionAge);

        // ---- Decumulation phase ----------------------------------------
        let decumSuper   = retirementSuperBalance;
        let decumSavings = retirementSavingsBalance;
        let withdrawal   = p.annualWithdrawal;
        let depletionYear = null;

        for (let yr = 0; yr < yearsInRetirement; yr++) {
            const age         = p.retirementAge + yr;
            const retirYr     = yr + 1;   // 1-indexed year of retirement
            cpiFactor        *= (1 + p.inflation);

            // Inflation-adjusted withdrawal
            if (p.inflationAdjusted && yr > 0) {
                withdrawal *= (1 + p.inflation);
            }

            // Stress-test return modifiers
            let superRet   = p.superReturn;
            let savingsRet = p.savingsReturn;

            if (stress) {
                if (stress.stressType === 'sequence-of-returns' && retirYr <= 3) {
                    superRet   = -0.10;
                    savingsRet = -0.10;
                }
                if (stress.stressType === 'market-crash' && retirYr === stress.stressYear) {
                    decumSuper   *= 0.75;   // -25% shock
                    decumSavings *= 0.75;
                }
            }

            // Age Pension at this age
            const totalNow  = decumSuper + decumSavings;
            const pension   = this._calcAgePension(totalNow, age);

            // Net withdrawal after pension supplement
            const netWithdrawal = Math.max(0, withdrawal - pension);

            // Draw proportionally from each bucket
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

            // Apply returns
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

        // ---- Sustainable income calculation ----------------------------
        // Simple approach: annualWithdrawal at retirement nominal, capped so funds last to horizon
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
            incomeReplacementRatio:  incomeReplacementRatio !== null ? Math.round(incomeReplacementRatio * 10) / 10 : null,
            depletionYear,
            planningHorizon:         p.planningHorizon,
            retirementAge:           p.retirementAge,
            agePensionEstimate:      Math.round(agePensionEstimate),
            yearByYear,
        };
    }

    /**
     * Rough Age Pension model — single person, homeowner.
     * Linear taper between lower and upper asset thresholds.
     * Returns nil if age < pension eligibility age.
     */
    _calcAgePension(totalAssets, age) {
        const AP = AdvancedDesignEngine.AGE_PENSION;
        if (age < AP.PENSION_AGE) return 0;
        if (totalAssets <= AP.ASSETS_LOWER) return AP.FULL_SINGLE_PA;
        if (totalAssets >= AP.ASSETS_UPPER) return 0;
        const taper = 1 - (totalAssets - AP.ASSETS_LOWER) / (AP.ASSETS_UPPER - AP.ASSETS_LOWER);
        return AP.FULL_SINGLE_PA * taper;
    }

    /**
     * Calculate sustainable annual income given a retirement portfolio.
     * Uses a simple annuity-style approach: if requested withdrawal is
     * feasible for the full horizon, return it; otherwise scale back.
     */
    _calcSustainableIncome(balance, superRet, savingsRet, inflation, requestedWithdrawal,
                           pension, years, inflationAdjusted) {
        if (years <= 0 || balance <= 0) return 0;

        const blendedReturn = (superRet + savingsRet) / 2;
        const r = blendedReturn;
        const g = inflationAdjusted ? inflation : 0;

        // Present-value annuity factor (growing annuity)
        let pvFactor;
        if (Math.abs(r - g) < 1e-8) {
            pvFactor = years / (1 + r);
        } else {
            pvFactor = (1 - Math.pow((1 + g) / (1 + r), years)) / (r - g);
        }

        if (pvFactor <= 0) return requestedWithdrawal;

        // Maximum sustainable gross withdrawal
        const maxWithdrawal = balance / pvFactor;

        // Total income = own funds + age pension
        const sustainableTotal = Math.max(0, maxWithdrawal) + pension;

        // Cap at requested withdrawal + pension if lower
        return Math.min(sustainableTotal, requestedWithdrawal + pension);
    }

    /** Build a human-readable description for a sensitivity driver. */
    _sensitivityDescription(driver, impact, inputs) {
        const fmt = v => '$' + Math.abs(Math.round(v)).toLocaleString('en-AU');
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
                return `A 10% rise in the inflation rate ${impact >= 0 ? 'improves' : 'reduces'} modelled income by approximately ${fmt(impact)} per year.`;
            case 'annualWithdrawal':
                return `Reducing the annual withdrawal by ${fmt(driver.delta)} extends the fund's longevity by approximately ${fmt(impact)} per year in equivalent value.`;
            default:
                return `Changing ${driver.label} by ${driver.delta}${driver.unit} ${sign} ${fmt(impact)} per year.`;
        }
    }
}
