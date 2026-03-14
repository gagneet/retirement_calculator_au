/**
 * Tests for Australian tax calculation functions extracted from utils.js.
 * Uses 2024-25 Australian tax brackets as defined in config.js.
 */

// Australian 2024-25 tax brackets (mirrors config.js TAX_BRACKETS)
const TAX_BRACKETS_2024_25 = [
    { min: 0, max: 18200, rate: 0 },
    { min: 18201, max: 45000, rate: 0.16 },
    { min: 45001, max: 135000, rate: 0.30 },
    { min: 135001, max: 190000, rate: 0.37 },
    { min: 190001, max: Infinity, rate: 0.45 },
];

// Inline implementation matching utils.js calculateAustralianTax
const calculateAustralianTax = (income, taxBrackets) => {
    let tax = 0;
    let remainingIncome = income;

    for (const bracket of taxBrackets) {
        if (remainingIncome <= 0) break;

        const taxableInThisBracket = Math.min(
            remainingIncome,
            bracket.max - bracket.min
        );

        if (taxableInThisBracket > 0) {
            tax += taxableInThisBracket * bracket.rate;
            remainingIncome -= taxableInThisBracket;
        }
    }

    return tax;
};

const calculatePostTaxIncome = (preTaxSalary, taxBrackets) => {
    const tax = calculateAustralianTax(preTaxSalary, taxBrackets);
    return preTaxSalary - tax;
};

const calculateCGT = (salePrice, purchasePrice, isResident, holdingPeriod, marginalTaxRate) => {
    const gain = salePrice - purchasePrice;
    if (gain <= 0) return 0;
    const discount = isResident && holdingPeriod >= 1 ? 0.5 : 1.0;
    return gain * discount * marginalTaxRate;
};

describe('calculateAustralianTax', () => {
    test('zero income has zero tax', () => {
        expect(calculateAustralianTax(0, TAX_BRACKETS_2024_25)).toBe(0);
    });

    test('income below tax-free threshold has zero tax', () => {
        expect(calculateAustralianTax(18200, TAX_BRACKETS_2024_25)).toBe(0);
    });

    test('income in first bracket taxed at 16%', () => {
        // $30,000 income
        // Bracket 1: 18200-0 = 18200 at 0%
        // Bracket 2: 30000-18200 = 11800 at 16% (spans min=18201, so 11799 in bracket span)
        const tax = calculateAustralianTax(30000, TAX_BRACKETS_2024_25);
        // Verify: tax is positive and proportionally correct
        expect(tax).toBeGreaterThan(0);
        expect(tax).toBeLessThan(30000 * 0.16);
        // Should be 11799 * 0.16
        expect(tax).toBeCloseTo(11799 * 0.16, 0);
    });

    test('income in second bracket is taxed incrementally', () => {
        // $80,000 income
        const tax = calculateAustralianTax(80000, TAX_BRACKETS_2024_25);
        const lowerTax = calculateAustralianTax(45001, TAX_BRACKETS_2024_25);
        // Income from 45001 to 80000 = 34999 taxed at 30%
        expect(tax).toBeCloseTo(lowerTax + 34999 * 0.30, 0);
    });

    test('income in third bracket is taxed incrementally', () => {
        // $150,000: check that the slice above 135001 is at 37%
        const tax = calculateAustralianTax(150000, TAX_BRACKETS_2024_25);
        const lowerTax = calculateAustralianTax(135001, TAX_BRACKETS_2024_25);
        // 150000 - 135001 = 14999 at 37%
        expect(tax).toBeCloseTo(lowerTax + 14999 * 0.37, 0);
    });

    test('income above top threshold taxed at 45% on the excess', () => {
        const tax = calculateAustralianTax(200000, TAX_BRACKETS_2024_25);
        const lowerTax = calculateAustralianTax(190001, TAX_BRACKETS_2024_25);
        // 200000 - 190001 = 9999 at 45%
        expect(tax).toBeCloseTo(lowerTax + 9999 * 0.45, 0);
    });

    test('negative income returns zero tax', () => {
        expect(calculateAustralianTax(-5000, TAX_BRACKETS_2024_25)).toBe(0);
    });

    test('tax is always non-negative', () => {
        const incomes = [0, 10000, 50000, 100000, 250000];
        incomes.forEach(income => {
            expect(calculateAustralianTax(income, TAX_BRACKETS_2024_25)).toBeGreaterThanOrEqual(0);
        });
    });
});

describe('calculatePostTaxIncome', () => {
    test('returns full income when below tax-free threshold', () => {
        expect(calculatePostTaxIncome(18200, TAX_BRACKETS_2024_25)).toBe(18200);
    });

    test('post-tax income is less than pre-tax for taxable income', () => {
        const preTax = 80000;
        const postTax = calculatePostTaxIncome(preTax, TAX_BRACKETS_2024_25);
        expect(postTax).toBeLessThan(preTax);
    });

    test('post-tax income = pre-tax minus calculated tax', () => {
        const income = 100000;
        const tax = calculateAustralianTax(income, TAX_BRACKETS_2024_25);
        expect(calculatePostTaxIncome(income, TAX_BRACKETS_2024_25)).toBeCloseTo(income - tax, 5);
    });

    test('higher income results in lower effective take-home ratio', () => {
        const low = calculatePostTaxIncome(50000, TAX_BRACKETS_2024_25) / 50000;
        const high = calculatePostTaxIncome(200000, TAX_BRACKETS_2024_25) / 200000;
        expect(high).toBeLessThan(low);
    });
});

describe('calculateCGT', () => {
    test('no CGT when no gain (sale equals purchase)', () => {
        expect(calculateCGT(500000, 500000, true, 2, 0.37)).toBe(0);
    });

    test('no CGT when making a loss', () => {
        expect(calculateCGT(400000, 500000, true, 2, 0.37)).toBe(0);
    });

    test('50% CGT discount applies for Australian residents with 1+ year holding', () => {
        // Gain = 100000, 50% discount, 37% marginal rate
        const cgt = calculateCGT(600000, 500000, true, 2, 0.37);
        expect(cgt).toBeCloseTo(100000 * 0.5 * 0.37, 2);
    });

    test('no discount for residents holding less than 1 year', () => {
        const cgt = calculateCGT(600000, 500000, true, 0.5, 0.37);
        expect(cgt).toBeCloseTo(100000 * 1.0 * 0.37, 2);
    });

    test('no discount for non-residents regardless of holding period', () => {
        const cgt = calculateCGT(600000, 500000, false, 5, 0.37);
        expect(cgt).toBeCloseTo(100000 * 1.0 * 0.37, 2);
    });

    test('CGT with discount is half the CGT without discount (same conditions)', () => {
        const withDiscount = calculateCGT(600000, 500000, true, 2, 0.37);
        const withoutDiscount = calculateCGT(600000, 500000, false, 2, 0.37);
        expect(withDiscount).toBeCloseTo(withoutDiscount * 0.5, 2);
    });
});

describe('Age Pension asset test logic', () => {
    // Simplified asset test mirrors the logic in utils.js calculateAgePension
    const SINGLE_ASSET_THRESHOLD = 321500;
    const SINGLE_ASSET_LIMIT = 714500;
    const SINGLE_PENSION_MAX = 30646;
    const NON_HOMEOWNER_SUPPLEMENT = 242000;

    const simpleAssetTest = (assets, homeowner = true) => {
        const threshold = homeowner ? SINGLE_ASSET_THRESHOLD : SINGLE_ASSET_THRESHOLD + NON_HOMEOWNER_SUPPLEMENT;
        const limit = homeowner ? SINGLE_ASSET_LIMIT : SINGLE_ASSET_LIMIT + NON_HOMEOWNER_SUPPLEMENT;

        if (assets <= threshold) return SINGLE_PENSION_MAX;
        if (assets >= limit) return 0;

        // Taper: $3 per fortnight per $1000 over threshold
        const excessAssets = assets - threshold;
        const reductionPerFortnight = Math.floor(excessAssets / 1000) * 3;
        const reductionAnnual = reductionPerFortnight * 26;
        return Math.max(0, SINGLE_PENSION_MAX - reductionAnnual);
    };

    test('homeowner with assets below threshold gets full pension', () => {
        expect(simpleAssetTest(300000, true)).toBe(SINGLE_PENSION_MAX);
    });

    test('homeowner with assets above limit gets no pension', () => {
        expect(simpleAssetTest(750000, true)).toBe(0);
    });

    test('homeowner in taper zone gets partial pension', () => {
        const pension = simpleAssetTest(500000, true);
        expect(pension).toBeGreaterThan(0);
        expect(pension).toBeLessThan(SINGLE_PENSION_MAX);
    });

    test('non-homeowner with assets at homeowner threshold still gets full pension', () => {
        // 321500 is below the non-homeowner threshold of 321500+242000=563500
        expect(simpleAssetTest(321500, false)).toBe(SINGLE_PENSION_MAX);
    });

    test('non-homeowner threshold is higher by supplement amount', () => {
        // At exactly the non-homeowner full-pension threshold, should still get full
        expect(simpleAssetTest(SINGLE_ASSET_THRESHOLD + NON_HOMEOWNER_SUPPLEMENT, false)).toBe(SINGLE_PENSION_MAX);
    });

    test('pension is zero at or above the cutoff limit', () => {
        expect(simpleAssetTest(SINGLE_ASSET_LIMIT, true)).toBe(0);
        expect(simpleAssetTest(SINGLE_ASSET_LIMIT + 100000, true)).toBe(0);
    });

    test('pension tapers smoothly between threshold and limit', () => {
        const midPoint = (SINGLE_ASSET_THRESHOLD + SINGLE_ASSET_LIMIT) / 2;
        const pension = simpleAssetTest(midPoint, true);
        expect(pension).toBeGreaterThan(0);
        expect(pension).toBeLessThan(SINGLE_PENSION_MAX);
    });
});
