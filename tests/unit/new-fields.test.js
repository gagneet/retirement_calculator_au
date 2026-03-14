/**
 * Tests for new calculator fields:
 * - Australian residency / earnings history (Item 7)
 * - Reduced income scenario (Item 10)
 * - Carer / aged parents fields (Item 9)
 */

// ── Australian residency helpers ────────────────────────────────────────────

/**
 * Calculate Australian residency years for Age Pension AWLR.
 * If ageCameToAustralia > 0, residency starts from that age.
 * Otherwise uses the provided australianResidenceYears or defaults.
 */
const calcResidencyYears = (inputs) => {
    if (inputs.australianResidenceYears > 0) return inputs.australianResidenceYears;
    if (inputs.ageCameToAustralia > 0) {
        return Math.max(0, inputs.retirementAge - inputs.ageCameToAustralia);
    }
    // Born in Australia – full working life (16 → retirementAge)
    return Math.max(0, inputs.retirementAge - 16);
};

/**
 * Calculate effective superannuation contribution years.
 * Starts from ageStartedEarningAustralia if provided, else ageCameToAustralia, else 18.
 */
const calcSuperYears = (inputs) => {
    const startAge = inputs.ageStartedEarningAustralia > 0
        ? inputs.ageStartedEarningAustralia
        : inputs.ageCameToAustralia > 0
            ? inputs.ageCameToAustralia
            : 18;
    return Math.max(0, inputs.retirementAge - startAge);
};

// ── Reduced income helpers ────────────────────────────────────────────────

/**
 * Determine effective salary for a given age given reduced income scenario.
 */
const effectiveSalary = (inputs, age) => {
    if (
        inputs.enableReducedIncome &&
        inputs.reducedIncomeAge > 0 &&
        inputs.reducedIncomeSalary > 0 &&
        age >= inputs.reducedIncomeAge
    ) {
        return inputs.reducedIncomeSalary;
    }
    return inputs.yourSalary;
};

// ── Carer impact helpers ─────────────────────────────────────────────────

/**
 * Calculate effective work income accounting for carer responsibilities.
 */
const effectiveCarerSalary = (inputs, salary) => {
    if (inputs.isCarerForParents && inputs.carerReducedWorkPercent > 0) {
        return salary * (1 - inputs.carerReducedWorkPercent);
    }
    return salary;
};

// ── Tests ─────────────────────────────────────────────────────────────────

describe('Australian Residency History (Item 7)', () => {
    test('born in Australia: full residency years from 16', () => {
        const inputs = { ageCameToAustralia: 0, australianResidenceYears: 0, retirementAge: 67 };
        expect(calcResidencyYears(inputs)).toBe(51); // 67 - 16
    });

    test('came to Australia at age 30, retiring at 67: 37 years residency', () => {
        const inputs = { ageCameToAustralia: 30, australianResidenceYears: 0, retirementAge: 67 };
        expect(calcResidencyYears(inputs)).toBe(37);
    });

    test('explicit australianResidenceYears overrides ageCameToAustralia', () => {
        const inputs = { ageCameToAustralia: 30, australianResidenceYears: 20, retirementAge: 67 };
        expect(calcResidencyYears(inputs)).toBe(20);
    });

    test('came to Australia at 50, retiring at 67: only 17 years residency', () => {
        const inputs = { ageCameToAustralia: 50, australianResidenceYears: 0, retirementAge: 67 };
        expect(calcResidencyYears(inputs)).toBe(17);
    });

    test('super years: started earning at 26, retiring at 67: 41 super years', () => {
        const inputs = { ageStartedEarningAustralia: 26, ageCameToAustralia: 25, retirementAge: 67 };
        expect(calcSuperYears(inputs)).toBe(41);
    });

    test('super years: born in Australia, started earning at 18, retiring at 67', () => {
        const inputs = { ageStartedEarningAustralia: 0, ageCameToAustralia: 0, retirementAge: 67 };
        expect(calcSuperYears(inputs)).toBe(49); // 67 - 18
    });

    test('super years: came at 30, started earning at 30 (same), retiring at 67', () => {
        const inputs = { ageStartedEarningAustralia: 0, ageCameToAustralia: 30, retirementAge: 67 };
        expect(calcSuperYears(inputs)).toBe(37); // 67 - 30
    });

    test('cannot have negative residency years', () => {
        const inputs = { ageCameToAustralia: 70, australianResidenceYears: 0, retirementAge: 67 };
        expect(calcResidencyYears(inputs)).toBe(0);
    });
});

describe('Reduced Income Scenario (Item 10)', () => {
    const baseInputs = {
        yourSalary: 200000,
        enableReducedIncome: true,
        reducedIncomeAge: 56,
        reducedIncomeSalary: 110000,
    };

    test('salary before reduced income age: uses full salary', () => {
        expect(effectiveSalary(baseInputs, 49)).toBe(200000);
        expect(effectiveSalary(baseInputs, 55)).toBe(200000);
    });

    test('salary at exact reduced income age: uses reduced salary', () => {
        expect(effectiveSalary(baseInputs, 56)).toBe(110000);
    });

    test('salary after reduced income age: uses reduced salary', () => {
        expect(effectiveSalary(baseInputs, 60)).toBe(110000);
        expect(effectiveSalary(baseInputs, 66)).toBe(110000);
    });

    test('disabled reduced income: always uses full salary', () => {
        const disabled = { ...baseInputs, enableReducedIncome: false };
        expect(effectiveSalary(disabled, 60)).toBe(200000);
    });

    test('zero reducedIncomeSalary: falls back to full salary', () => {
        const noAmount = { ...baseInputs, reducedIncomeSalary: 0 };
        expect(effectiveSalary(noAmount, 60)).toBe(200000);
    });

    test('zero reducedIncomeAge: falls back to full salary', () => {
        const noAge = { ...baseInputs, reducedIncomeAge: 0 };
        expect(effectiveSalary(noAge, 60)).toBe(200000);
    });
});

describe('Carer / Aged Parents Impact (Item 9)', () => {
    test('carer with 20% work reduction: salary reduced by 20%', () => {
        const inputs = { isCarerForParents: true, carerReducedWorkPercent: 0.2 };
        expect(effectiveCarerSalary(inputs, 100000)).toBe(80000);
    });

    test('non-carer: salary unchanged', () => {
        const inputs = { isCarerForParents: false, carerReducedWorkPercent: 0.2 };
        expect(effectiveCarerSalary(inputs, 100000)).toBe(100000);
    });

    test('carer with 0% reduction: salary unchanged', () => {
        const inputs = { isCarerForParents: true, carerReducedWorkPercent: 0 };
        expect(effectiveCarerSalary(inputs, 100000)).toBe(100000);
    });

    test('carer with 50% reduction: halves income', () => {
        const inputs = { isCarerForParents: true, carerReducedWorkPercent: 0.5 };
        expect(effectiveCarerSalary(inputs, 150000)).toBe(75000);
    });
});
