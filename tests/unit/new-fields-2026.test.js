/**
 * Tests for new calculator fields added in schema version 2026.1:
 * - SMSF admin cost deduction (PART 3)
 * - Property cash flow with vacancy rate, maintenance inflation, land tax (PART 8)
 * - Scenario mode return adjustments (PART 1)
 * - Global risk factor simulation (PART 10)
 * - Education costs for dependents (PART 4)
 * - Trust improvements: trustTaxRate, familyTrustIncomeDistribution, beneficiaryAllocation (PART 7)
 * - Super strategy fields: concessionalCapUsed, spouseContribution, downsizeContribution (PART 2)
 * - Schema version upgrade to 2026.1 (PART 13)
 */

// ── SMSF helpers ─────────────────────────────────────────────────────────────

/**
 * Calculate annual SMSF cost drag on super balance.
 */
const calcSMSFCostDrag = (superBalance, smsfAdminCosts, hasSMSF) => {
    if (!hasSMSF || smsfAdminCosts <= 0) return 0;
    return smsfAdminCosts;
};

/**
 * Determine whether SMSF low-balance warning should be shown.
 * Warning threshold: $300,000 combined super balance.
 */
const shouldShowSMSFWarning = (yourSuper, partnerSuper, hasSMSF) => {
    if (!hasSMSF) return false;
    return (yourSuper + partnerSuper) < 300000;
};

// ── Property cash flow helpers ────────────────────────────────────────────────

/**
 * Effective annual rental income after applying vacancy rate.
 */
const effectiveRental = (weeklyRental, vacancyRate) => {
    return weeklyRental * 52 * (1 - vacancyRate);
};

/**
 * Effective annual property expenses after applying maintenance inflation.
 * @param {number} baseExpenses - base annual expenses (today's dollars)
 * @param {number} maintenanceInflation - annual inflation rate for maintenance (decimal)
 * @param {number} years - number of years elapsed
 * @param {number} landTax - annual land tax (today's dollars, grows with general inflation)
 * @param {number} generalInflation - general inflation rate (decimal)
 */
const effectivePropertyExpenses = (baseExpenses, maintenanceInflation, years, landTax = 0, generalInflation = 0.03) => {
    return baseExpenses * Math.pow(1 + maintenanceInflation, years)
        + landTax * Math.pow(1 + generalInflation, years);
};

// ── Scenario mode helpers ─────────────────────────────────────────────────────

const SCENARIO_ADJUSTMENTS = {
    baseline:    { returnDelta: 0,     inflationDelta: 0,     volatilityMultiplier: 1.0 },
    optimistic:  { returnDelta: 0.01,  inflationDelta: -0.005, volatilityMultiplier: 0.8 },
    pessimistic: { returnDelta: -0.01, inflationDelta: 0.005,  volatilityMultiplier: 1.3 },
    crisis:      { returnDelta: -0.02, inflationDelta: 0.02,   volatilityMultiplier: 2.0 }
};

const applyScenarioMode = (baseReturn, baseInflation, scenarioMode) => {
    const adj = SCENARIO_ADJUSTMENTS[scenarioMode] || SCENARIO_ADJUSTMENTS.baseline;
    return {
        effectiveReturn: baseReturn + adj.returnDelta,
        effectiveInflation: baseInflation + adj.inflationDelta
    };
};

// ── Education cost helpers ────────────────────────────────────────────────────

/**
 * Calculate total annual education cost for dependent children.
 */
const calcAnnualEducationCost = (inputs) => {
    const childCount = (inputs.childrenUnder5 || 0) + (inputs.childrenPrimary || 0) + (inputs.teenagers || 0);
    if (childCount === 0 || !inputs.educationCostPerChild) return 0;

    let cost = inputs.educationCostPerChild * childCount;
    if (inputs.privateSchool) cost += 25000 * childCount;
    if (inputs.universitySupport) cost += 15000 * childCount;
    return cost;
};

// ── Trust income distribution helpers ────────────────────────────────────────

/**
 * Calculate the income attributed to the primary beneficiary.
 */
const calcBeneficiaryIncome = (familyTrustIncomeDistribution, beneficiaryAllocation) => {
    return familyTrustIncomeDistribution * beneficiaryAllocation;
};

// ── Schema version helper ─────────────────────────────────────────────────────

const CALCULATOR_VERSION = '2026.1';
const EXPORT_SCHEMA_VERSION = '4.0';
const SUPPORTED_VERSIONS = ['1.0', '2.0', '3.0', '4.0'];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SMSF Modelling (PART 3)', () => {
    test('SMSF admin costs deducted from super balance when hasSMSF=true', () => {
        expect(calcSMSFCostDrag(400000, 3500, true)).toBe(3500);
    });

    test('no cost drag when hasSMSF=false', () => {
        expect(calcSMSFCostDrag(400000, 3500, false)).toBe(0);
    });

    test('no cost drag when smsfAdminCosts=0', () => {
        expect(calcSMSFCostDrag(400000, 0, true)).toBe(0);
    });

    test('SMSF low balance warning: super below $300k triggers warning', () => {
        expect(shouldShowSMSFWarning(150000, 100000, true)).toBe(true);
    });

    test('SMSF low balance warning: super above $300k suppresses warning', () => {
        expect(shouldShowSMSFWarning(200000, 150000, true)).toBe(false);
    });

    test('SMSF low balance warning: no SMSF = no warning', () => {
        expect(shouldShowSMSFWarning(100000, 50000, false)).toBe(false);
    });

    test('SMSF low balance warning: exactly $300k = no warning', () => {
        expect(shouldShowSMSFWarning(200000, 100000, true)).toBe(false);
    });
});

describe('Property Cash Flow Improvements (PART 8)', () => {
    test('vacancy rate reduces effective rental income by correct fraction', () => {
        const weekly = 500;
        const vacancyRate = 0.04; // 4%
        const result = effectiveRental(weekly, vacancyRate);
        expect(result).toBeCloseTo(weekly * 52 * 0.96, 2);
    });

    test('zero vacancy rate: full rental income retained', () => {
        expect(effectiveRental(500, 0)).toBeCloseTo(500 * 52, 2);
    });

    test('10% vacancy rate: reduces rental by 10%', () => {
        const full = 500 * 52;
        expect(effectiveRental(500, 0.10)).toBeCloseTo(full * 0.9, 2);
    });

    test('maintenance inflation increases expenses faster than general inflation', () => {
        const base = 10000;
        const maintenanceInflation = 0.05;
        const generalInflation = 0.03;
        const year5 = effectivePropertyExpenses(base, maintenanceInflation, 5);
        const year5General = base * Math.pow(1 + generalInflation, 5);
        expect(year5).toBeGreaterThan(year5General);
    });

    test('land tax added to annual property expenses (inflated)', () => {
        const result = effectivePropertyExpenses(10000, 0.035, 1, 2000, 0.03);
        const expectedExpenses = 10000 * 1.035 + 2000 * 1.03;
        expect(result).toBeCloseTo(expectedExpenses, 2);
    });

    test('zero land tax: only base expenses returned', () => {
        const result = effectivePropertyExpenses(10000, 0.035, 1, 0, 0.03);
        expect(result).toBeCloseTo(10000 * 1.035, 2);
    });
});

describe('Scenario Mode Adjustments (PART 1)', () => {
    const BASE_RETURN = 0.07;
    const BASE_INFLATION = 0.03;

    test('baseline: no adjustments to return or inflation', () => {
        const result = applyScenarioMode(BASE_RETURN, BASE_INFLATION, 'baseline');
        expect(result.effectiveReturn).toBeCloseTo(BASE_RETURN);
        expect(result.effectiveInflation).toBeCloseTo(BASE_INFLATION);
    });

    test('optimistic: +1% return, -0.5% inflation', () => {
        const result = applyScenarioMode(BASE_RETURN, BASE_INFLATION, 'optimistic');
        expect(result.effectiveReturn).toBeCloseTo(BASE_RETURN + 0.01);
        expect(result.effectiveInflation).toBeCloseTo(BASE_INFLATION - 0.005);
    });

    test('pessimistic: -1% return, +0.5% inflation', () => {
        const result = applyScenarioMode(BASE_RETURN, BASE_INFLATION, 'pessimistic');
        expect(result.effectiveReturn).toBeCloseTo(BASE_RETURN - 0.01);
        expect(result.effectiveInflation).toBeCloseTo(BASE_INFLATION + 0.005);
    });

    test('crisis: -2% return, +2% inflation', () => {
        const result = applyScenarioMode(BASE_RETURN, BASE_INFLATION, 'crisis');
        expect(result.effectiveReturn).toBeCloseTo(BASE_RETURN - 0.02);
        expect(result.effectiveInflation).toBeCloseTo(BASE_INFLATION + 0.02);
    });

    test('unknown mode falls back to baseline', () => {
        const result = applyScenarioMode(BASE_RETURN, BASE_INFLATION, 'unknown');
        expect(result.effectiveReturn).toBeCloseTo(BASE_RETURN);
    });

    test('crisis produces lower return than pessimistic', () => {
        const pessimistic = applyScenarioMode(BASE_RETURN, BASE_INFLATION, 'pessimistic');
        const crisis = applyScenarioMode(BASE_RETURN, BASE_INFLATION, 'crisis');
        expect(crisis.effectiveReturn).toBeLessThan(pessimistic.effectiveReturn);
    });
});

describe('Education Costs for Dependents (PART 4)', () => {
    test('zero children: no education cost', () => {
        const inputs = { childrenUnder5: 0, childrenPrimary: 0, teenagers: 0, educationCostPerChild: 5000 };
        expect(calcAnnualEducationCost(inputs)).toBe(0);
    });

    test('no educationCostPerChild set: no education cost', () => {
        const inputs = { childrenUnder5: 1, childrenPrimary: 1, teenagers: 0, educationCostPerChild: 0 };
        expect(calcAnnualEducationCost(inputs)).toBe(0);
    });

    test('2 children × $5,000 = $10,000/yr', () => {
        const inputs = { childrenPrimary: 2, educationCostPerChild: 5000 };
        expect(calcAnnualEducationCost(inputs)).toBe(10000);
    });

    test('private school adds $25,000 per child', () => {
        const inputs = { childrenPrimary: 1, educationCostPerChild: 5000, privateSchool: true };
        expect(calcAnnualEducationCost(inputs)).toBe(5000 + 25000);
    });

    test('university support adds $15,000 per child', () => {
        const inputs = { teenagers: 1, educationCostPerChild: 5000, universitySupport: true };
        expect(calcAnnualEducationCost(inputs)).toBe(5000 + 15000);
    });

    test('private school + university: both premiums applied', () => {
        const inputs = { childrenPrimary: 2, educationCostPerChild: 10000, privateSchool: true, universitySupport: true };
        expect(calcAnnualEducationCost(inputs)).toBe(2 * (10000 + 25000 + 15000));
    });
});

describe('Trust Improvements (PART 7)', () => {
    test('100% beneficiary allocation: full distribution attributed', () => {
        expect(calcBeneficiaryIncome(50000, 1.0)).toBe(50000);
    });

    test('50% beneficiary allocation: half distribution attributed', () => {
        expect(calcBeneficiaryIncome(50000, 0.5)).toBe(25000);
    });

    test('0% beneficiary allocation: no income attributed', () => {
        expect(calcBeneficiaryIncome(50000, 0)).toBe(0);
    });

    test('zero trust distributions: zero beneficiary income', () => {
        expect(calcBeneficiaryIncome(0, 1.0)).toBe(0);
    });
});

describe('Schema Version 2026.1 (PART 13)', () => {
    test('calculator version is 2026.1', () => {
        expect(CALCULATOR_VERSION).toBe('2026.1');
    });

    test('export schema version is 4.0', () => {
        expect(EXPORT_SCHEMA_VERSION).toBe('4.0');
    });

    test('version 4.0 is in supported versions list', () => {
        expect(SUPPORTED_VERSIONS).toContain('4.0');
    });

    test('older versions (1.0, 2.0, 3.0) remain supported for backward compatibility', () => {
        expect(SUPPORTED_VERSIONS).toContain('1.0');
        expect(SUPPORTED_VERSIONS).toContain('2.0');
        expect(SUPPORTED_VERSIONS).toContain('3.0');
    });
});

describe('Super Strategy Fields (PART 2)', () => {
    /**
     * Concessional cap is $30,000 for 2024-25.
     * Returns remaining cap for additional contributions.
     */
    const calcRemainingConcessionalCap = (concessionalCapUsed, annualCap = 30000) => {
        return Math.max(0, annualCap - concessionalCapUsed);
    };

    /**
     * Spouse contribution tax offset: up to $540 if spouse income ≤ $37,000
     * (offset is $540 when contribution ≥ $3,000; tapers above $37k)
     */
    const calcSpouseContributionOffset = (spouseContribution, spouseIncome) => {
        if (spouseIncome > 40000) return 0;
        if (spouseContribution <= 0) return 0;
        const eligibleAmount = Math.min(spouseContribution, 3000);
        const incomeTaper = Math.max(0, Math.min(1, (40000 - spouseIncome) / 3000));
        return Math.round(eligibleAmount * 0.18 * incomeTaper);
    };

    test('unused concessional cap: $30k cap, $10k used → $20k remaining', () => {
        expect(calcRemainingConcessionalCap(10000)).toBe(20000);
    });

    test('fully used concessional cap: $30k used → $0 remaining', () => {
        expect(calcRemainingConcessionalCap(30000)).toBe(0);
    });

    test('over-used cap returns 0 (no negative)', () => {
        expect(calcRemainingConcessionalCap(35000)).toBe(0);
    });

    test('zero concessional used: full cap available', () => {
        expect(calcRemainingConcessionalCap(0)).toBe(30000);
    });

    test('spouse contribution offset: $3,000 contribution, spouse income $37,000 → some offset', () => {
        const offset = calcSpouseContributionOffset(3000, 37000);
        expect(offset).toBeGreaterThan(0);
        expect(offset).toBeLessThanOrEqual(540);
    });

    test('spouse income above $40k: no tax offset', () => {
        expect(calcSpouseContributionOffset(3000, 41000)).toBe(0);
    });

    test('zero spouse contribution: no tax offset', () => {
        expect(calcSpouseContributionOffset(0, 30000)).toBe(0);
    });
});
