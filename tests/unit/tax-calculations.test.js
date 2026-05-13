/**
 * Tests for Australian tax calculation functions extracted from utils.js.
 * Uses 2025-26 Australian tax brackets as defined in config.js.
 *
 * NOTE: This file tests INLINE reimplementations that match the FIXED versions of
 * the functions in utils.js (post Bug 1 and Bug 5 fixes).  For exhaustive
 * reference-data tests covering all 8 bugs and Budget 2026-27 measures, see
 * tests/unit/calculation-audit.test.js.
 */

// Australian 2025-26 tax brackets (mirrors config.js TAX_BRACKETS)
const TAX_BRACKETS_2024_25 = [
    { min: 0, max: 18200, rate: 0 },
    { min: 18201, max: 45000, rate: 0.16 },
    { min: 45001, max: 135000, rate: 0.30 },
    { min: 135001, max: 190000, rate: 0.37 },
    { min: 190001, max: Infinity, rate: 0.45 },
];

// Inline implementation matching the FIXED utils.js calculateAustralianTax
// (Bug 1 fix: uses bracket.max - bracket.min + 1 for non-zero-min brackets)
const calculateAustralianTax = (income, taxBrackets) => {
    let tax = 0;
    let remainingIncome = income;

    for (const bracket of taxBrackets) {
        if (remainingIncome <= 0) break;

        // Bug 1 fix: correct bracket width for non-contiguous ATO boundaries
        const bracketWidth = bracket.min === 0
            ? bracket.max
            : bracket.max - bracket.min + 1;

        const taxableInThisBracket = Math.min(remainingIncome, bracketWidth);

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

/**
 * Bug 5 fix: calculateCGT now takes the EFFECTIVE CGT rate (which already
 * incorporates the 50% CGT discount) and applies it directly to the full
 * capital gain.  For short holds (<1 year) the effective rate is doubled back
 * to the marginal rate since no discount applies.
 *
 * Parameter rename: marginalTaxRate → effectiveCGTRate to reflect this.
 */
const calculateCGT = (salePrice, purchasePrice, isResident, holdingPeriod, effectiveCGTRate) => {
    const gain = salePrice - purchasePrice;
    if (gain <= 0) return 0;
    const discountApplies = isResident && holdingPeriod >= 1;
    // discountApplies = true  → use effectiveCGTRate directly (discount already baked in)
    // discountApplies = false → double back to marginal rate (no discount for short hold)
    const rateToUse = discountApplies ? effectiveCGTRate : effectiveCGTRate * 2;
    return gain * rateToUse;
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
    // effectiveCGTRate = marginal rate × 50% discount = the rate stored in capitalGainsTaxRate.
    // The 50% discount is already baked into the rate; calculateCGT does NOT apply it again.

    test('no CGT when no gain (sale equals purchase)', () => {
        expect(calculateCGT(500000, 500000, true, 2, 0.185)).toBe(0);
    });

    test('no CGT when making a loss', () => {
        expect(calculateCGT(400000, 500000, true, 2, 0.185)).toBe(0);
    });

    test('long hold (≥1yr): CGT = gain × effectiveCGTRate (discount already in rate)', () => {
        // Gain $100k, 37% marginal rate, 50% discount → effectiveCGTRate = 18.5%
        // CGT = $100,000 × 18.5% = $18,500
        const cgt = calculateCGT(600000, 500000, true, 2, 0.185);
        expect(cgt).toBeCloseTo(18500, 2);
    });

    test('long hold (≥1yr) at 45% marginal / 22.5% effective: CGT = $22,500 on $100k gain', () => {
        const cgt = calculateCGT(600000, 500000, true, 5, 0.225);
        expect(cgt).toBeCloseTo(22500, 2);
    });

    test('short hold (<1yr): effectiveCGTRate doubled back to marginal, no discount', () => {
        // effectiveCGTRate = 22.5% (= 45% × 50%), doubled back → 45% marginal
        // CGT = $100,000 × 45% = $45,000
        const cgt = calculateCGT(600000, 500000, true, 0.5, 0.225);
        expect(cgt).toBeCloseTo(45000, 2);
    });

    test('non-resident: no discount regardless of holding — effectiveCGTRate doubled to marginal', () => {
        // Non-residents never get the CGT discount; doubling 22.5% → 45% marginal
        const cgt = calculateCGT(600000, 500000, false, 5, 0.225);
        expect(cgt).toBeCloseTo(45000, 2);
    });

    test('short hold and non-resident produce the same CGT (both no-discount)', () => {
        const shortHold   = calculateCGT(600000, 500000, true, 0.5, 0.225);
        const nonResident = calculateCGT(600000, 500000, false, 5, 0.225);
        expect(shortHold).toBeCloseTo(nonResident, 2);
    });

    test('long-hold CGT is half of short-hold CGT (one is discounted, one is not)', () => {
        const withDiscount    = calculateCGT(600000, 500000, true, 2, 0.225);   // long hold
        const withoutDiscount = calculateCGT(600000, 500000, true, 0.5, 0.225); // short hold
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
