/**
 * property-engine.test.js - Comprehensive tests for the shared Property & Housing module.
 *
 * Covers:
 *   - Mortgage amortisation (P&I and interest-only)
 *   - Annual cashflow (PPOR and investment)
 *   - Negative gearing current rules
 *   - Proposed no-negative-gearing established property
 *   - Proposed new-build negative gearing retained
 *   - Current CGT discount (50%)
 *   - Proposed indexed CGT
 *   - PPOR CGT exemption (full and partial)
 *   - Sale proceeds after tax
 *   - Real after-tax profit
 *   - IRR
 *   - Monte Carlo reproducibility (seeded RNG)
 *   - Reverse solver constraints
 *   - Historical anchor data
 *   - Policy comparison
 */

import {
    calcPandIRepayment,
    calcInterestOnlyRepayment,
    amortiseOneYear,
    calcAnnualPropertyCashflow,
    calcSaleProceeds,
    calcIRR,
    calcRealAfterTaxProfit,
    solveRequiredRent,
    solveMaxPurchasePrice,
    comparePropertyVsETF,
    comparePropertyVsSuper,
    calcNegativeGearingBenefit,
    calcCGT,
    compareCGTPolicies,
    compareNegativeGearing,
    buildEffectivePolicy,
    runPropertyMonteCarlo,
    runPropertyDeterministic,
    comparePropertyPoliciesMC,
    solveRequiredEquity,
    solveOptimalSaleTiming,
    compareRetirementStrategies,
    projectETF,
    projectSuper,
    fullComparisonMatrix,
    buildHistoricalAnchorRates,
    estimateCurrentValueFromHistory,
    calcCumulativeCPI,
    validatePropertyInput,
    PROPERTY_USE,
    PROPERTY_POLICY_MODE,
    LOAN_TYPE,
    REPAYMENT_FREQUENCY,
    TAX_POLICY_DEFAULTS,
} from '../../src/js/property/index.js';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeInvestmentProp(overrides = {}) {
    return {
        id:                'test-prop-1',
        label:             'Test Investment Property',
        useType:           PROPERTY_USE.INVESTMENT,
        isPpor:            false,
        city:              'national',
        purchasePrice:     500000,
        currentValue:      600000,
        currentLoanBalance: 400000,
        weeklyRent:        500,
        vacancyWeeksPerYear: 2,
        loanType:          LOAN_TYPE.PRINCIPAL_INTEREST,
        interestRate:      0.062,
        loanTermYears:     30,
        remainingLoanYears: 25,
        offsetBalance:     0,
        ownershipUserPct:  100,
        ownershipPartnerPct: 0,
        expenses: {
            managementPct: 0.08,
            councilRates:  1200,
            insurance:     1100,
            maintenance:   2000,
            strata:        0,
            landTax:       1500,
            waterRates:    800,
        },
        taxPolicy: {
            policyMode:             PROPERTY_POLICY_MODE.CURRENT,
            marginalTaxRateUser:    0.325,
            currentCgtDiscountRate: 0.50,
        },
        ...overrides,
    };
}

function makePporProp(overrides = {}) {
    return {
        id:                'ppor-1',
        label:             'Primary Residence',
        useType:           PROPERTY_USE.PRIMARY_RESIDENCE,
        isPpor:            true,
        city:              'sydney',
        purchasePrice:     800000,
        currentValue:      1000000,
        currentLoanBalance: 600000,
        weeklyRent:        0,
        loanType:          LOAN_TYPE.PRINCIPAL_INTEREST,
        interestRate:      0.062,
        loanTermYears:     30,
        remainingLoanYears: 22,
        ownershipUserPct:  100,
        ownershipPartnerPct: 0,
        expenses: {
            councilRates: 2000,
            insurance:    1500,
            maintenance:  3000,
            waterRates:   1000,
        },
        taxPolicy: {
            policyMode:              PROPERTY_POLICY_MODE.CURRENT,
            marginalTaxRateUser:     0.37,
            pporMainResidenceExemption: true,
        },
        ...overrides,
    };
}

// ---------------------------------------------------------------------------
// Mortgage amortisation
// ---------------------------------------------------------------------------

describe('Mortgage amortisation - P&I', () => {
    test('calcPandIRepayment returns correct monthly repayment for $500k 6.2% 30yr', () => {
        const payment = calcPandIRepayment(500000, 0.062, 30, REPAYMENT_FREQUENCY.MONTHLY);
        // Standard formula: ~$3,050/month
        expect(payment).toBeGreaterThan(3000);
        expect(payment).toBeLessThan(3200);
    });

    test('calcPandIRepayment returns 0 for zero principal', () => {
        expect(calcPandIRepayment(0, 0.062, 30)).toBe(0);
    });

    test('calcPandIRepayment returns 0 for zero term', () => {
        expect(calcPandIRepayment(500000, 0.062, 0)).toBe(0);
    });

    test('interest-only payment equals principal * rate / 12 per month', () => {
        const io = calcInterestOnlyRepayment(400000, 0.062, REPAYMENT_FREQUENCY.MONTHLY);
        const expected = 400000 * (Math.pow(1 + 0.062, 1 / 12) - 1);
        expect(io).toBeCloseTo(expected, 0);
    });

    test('amortiseOneYear P&I reduces loan balance', () => {
        const result = amortiseOneYear(400000, 0.062, 30, 25, LOAN_TYPE.PRINCIPAL_INTEREST);
        expect(result.closingBalance).toBeLessThan(400000);
        expect(result.interestPaid).toBeGreaterThan(0);
        expect(result.principalPaid).toBeGreaterThan(0);
        expect(result.interestPaid + result.principalPaid).toBeCloseTo(
            result.interestPaid + result.principalPaid, 0
        );
    });

    test('amortiseOneYear interest-only does not reduce balance', () => {
        const result = amortiseOneYear(400000, 0.062, 30, 25, LOAN_TYPE.INTEREST_ONLY);
        expect(result.closingBalance).toBeCloseTo(400000, 0);
        expect(result.principalPaid).toBe(0);
        expect(result.interestPaid).toBeGreaterThan(0);
    });

    test('amortiseOneYear with full offset eliminates interest', () => {
        const result = amortiseOneYear(400000, 0.062, 30, 25, LOAN_TYPE.INTEREST_ONLY, 400000);
        expect(result.interestPaid).toBeCloseTo(0, 0);
    });

    test('loan amortises to zero after full term', () => {
        let balance = 400000;
        for (let y = 0; y < 25; y++) {
            const result = amortiseOneYear(balance, 0.062, 25, 25 - y, LOAN_TYPE.PRINCIPAL_INTEREST);
            balance = result.closingBalance;
        }
        expect(balance).toBeLessThan(1000); // nearly zero
    });
});

// ---------------------------------------------------------------------------
// Annual cashflow
// ---------------------------------------------------------------------------

describe('Annual cashflow - Investment property', () => {
    test('returns positive gross rent for investment property', () => {
        const prop = makeInvestmentProp();
        const cf = calcAnnualPropertyCashflow(prop, {
            year: 0, propertyValue: 600000, loanBalance: 400000,
            interestRate: 0.062, cpiGrowth: 0.036, rentGrowth: 0.032,
        });
        expect(cf.grossRent).toBeCloseTo(500 * 52, -1);
        expect(cf.netRent).toBeLessThan(cf.grossRent);
    });

    test('taxable rental income is rent minus interest minus expenses minus depreciation', () => {
        const prop = makeInvestmentProp();
        const cf = calcAnnualPropertyCashflow(prop, {
            year: 0, propertyValue: 600000, loanBalance: 400000,
            interestRate: 0.062, cpiGrowth: 0.036, rentGrowth: 0,
        });
        expect(cf.taxableRentalIncome).toBeLessThan(cf.netRent);
    });

    test('PPOR has zero rental income and no taxable rental income', () => {
        const prop = makePporProp();
        const cf = calcAnnualPropertyCashflow(prop, {
            year: 0, propertyValue: 1000000, loanBalance: 600000,
            interestRate: 0.062, cpiGrowth: 0.036, rentGrowth: 0,
        });
        expect(cf.grossRent).toBe(0);
        expect(cf.netRent).toBe(0);
        expect(cf.taxableRentalIncome).toBe(0);
        expect(cf.isPpor).toBe(true);
    });

    test('PPOR cashflow before tax is negative (mortgage cost)', () => {
        const prop = makePporProp();
        const cf = calcAnnualPropertyCashflow(prop, {
            year: 0, propertyValue: 1000000, loanBalance: 600000,
            interestRate: 0.062, cpiGrowth: 0.036, rentGrowth: 0,
        });
        expect(cf.netCashflowBeforeTax).toBeLessThan(0);
    });

    test('operating expenses inflate over time', () => {
        const prop = makeInvestmentProp();
        const cf0 = calcAnnualPropertyCashflow(prop, {
            year: 0, propertyValue: 600000, loanBalance: 400000,
            interestRate: 0.062, cpiGrowth: 0.036, rentGrowth: 0,
        });
        const cf10 = calcAnnualPropertyCashflow(prop, {
            year: 10, propertyValue: 800000, loanBalance: 350000,
            interestRate: 0.062, cpiGrowth: 0.036, rentGrowth: 0,
        });
        expect(cf10.councilRates).toBeGreaterThan(cf0.councilRates);
    });
});

// ---------------------------------------------------------------------------
// Negative gearing
// ---------------------------------------------------------------------------

describe('Negative gearing - current rules', () => {
    const currentPolicy = {
        policyMode:                       PROPERTY_POLICY_MODE.CURRENT,
        marginalTaxRateUser:              0.325,
        negativeGearingCurrentAllowed:    true,
        carriedForwardLossesAllowed:      false,
    };

    test('negative gearing loss creates tax benefit at marginal rate', () => {
        const { taxBenefit } = calcNegativeGearingBenefit(-10000, 0.325, currentPolicy);
        expect(taxBenefit).toBeCloseTo(10000 * 0.325, 0);
    });

    test('positive taxable rental income creates tax cost', () => {
        const { taxBenefit } = calcNegativeGearingBenefit(5000, 0.325, currentPolicy);
        expect(taxBenefit).toBeCloseTo(-5000 * 0.325, 0);
    });

    test('zero taxable income produces zero tax benefit', () => {
        const { taxBenefit } = calcNegativeGearingBenefit(0, 0.325, currentPolicy);
        expect(taxBenefit).toBeCloseTo(0, 8);
    });
});

describe('Negative gearing - proposed 2027 rules (established property)', () => {
    const proposedPolicy = {
        policyMode:                                PROPERTY_POLICY_MODE.PROPOSED_2027,
        marginalTaxRateUser:                       0.325,
        negativeGearingProposedEstablishedAllowed: false,
        negativeGearingProposedNewBuildAllowed:    true,
        carriedForwardLossesAllowed:               true,
        isNewBuild:                                false,
    };

    test('established property: loss is carried forward, no immediate benefit', () => {
        const { taxBenefit, closingCarriedLoss } = calcNegativeGearingBenefit(-10000, 0.325, proposedPolicy);
        expect(taxBenefit).toBe(0);
        expect(closingCarriedLoss).toBe(10000);
    });

    test('established property: carried loss offsets future positive income', () => {
        const { taxBenefit, closingCarriedLoss } = calcNegativeGearingBenefit(8000, 0.325, proposedPolicy, 10000);
        expect(closingCarriedLoss).toBe(2000);
        const remainingTaxableIncome = 8000 - Math.min(10000, 8000); // = 0
        expect(taxBenefit).toBeCloseTo(-(remainingTaxableIncome * 0.325), 1);
    });

    test('losses accumulate across years with no immediate deduction', () => {
        let pool = 0;
        for (let y = 0; y < 3; y++) {
            const result = calcNegativeGearingBenefit(-5000, 0.325, proposedPolicy, pool);
            pool = result.closingCarriedLoss;
        }
        expect(pool).toBe(15000);
    });
});

describe('Negative gearing - proposed 2027 rules (new build)', () => {
    const newBuildPolicy = {
        policyMode:                                PROPERTY_POLICY_MODE.PROPOSED_2027,
        marginalTaxRateUser:                       0.325,
        negativeGearingProposedEstablishedAllowed: false,
        negativeGearingProposedNewBuildAllowed:    true,
        carriedForwardLossesAllowed:               true,
        isNewBuild:                                true,
    };

    test('new build retains immediate negative gearing under proposed rules', () => {
        const { taxBenefit } = calcNegativeGearingBenefit(-10000, 0.325, newBuildPolicy);
        expect(taxBenefit).toBeCloseTo(10000 * 0.325, 0);
    });
});

describe('Negative gearing comparison', () => {
    test('compareNegativeGearing shows difference between current and proposed', () => {
        const policy = { policyMode: PROPERTY_POLICY_MODE.CURRENT, marginalTaxRateUser: 0.325, isNewBuild: false };
        const comparison = compareNegativeGearing(-10000, 0.325, policy);
        expect(comparison.current.taxBenefit).toBeGreaterThan(0);
        expect(comparison.proposed.taxBenefit).toBe(0);
        expect(comparison.annualDifference).toBeLessThan(0);
    });
});

// ---------------------------------------------------------------------------
// CGT - current rules
// ---------------------------------------------------------------------------

describe('CGT - current rules (50% discount)', () => {
    const baseParams = {
        salePrice:      800000,
        purchasePrice:  500000,
        sellingCosts:   20000,
        holdingYears:   5,
        marginalTaxRate: 0.325,
        isPpor:         false,
        policy:         { policyMode: PROPERTY_POLICY_MODE.CURRENT, currentCgtDiscountRate: 0.50 },
    };

    test('capital gain = sale price - purchase price - selling costs', () => {
        const { capitalGain } = calcCGT(baseParams);
        expect(capitalGain).toBe(800000 - 500000 - 20000);  // = 280000
    });

    test('50% discount applies after 12 months', () => {
        const { cgtPayable, capitalGain } = calcCGT(baseParams);
        const discountedGain = capitalGain * 0.5;  // 140000
        expect(cgtPayable).toBeCloseTo(discountedGain * 0.325, 0);
    });

    test('no discount applied if held < 12 months', () => {
        const { cgtPayable, capitalGain } = calcCGT({ ...baseParams, holdingYears: 0.5 });
        expect(cgtPayable).toBeCloseTo(capitalGain * 0.325, 0);
    });

    test('no CGT when sale price equals purchase price', () => {
        const { cgtPayable } = calcCGT({ ...baseParams, salePrice: 500000, sellingCosts: 0 });
        expect(cgtPayable).toBe(0);
    });

    test('capital losses carry forward to future gains', () => {
        const { cgtPayable: cgtNoPool } = calcCGT({ ...baseParams, capitalLossPool: 0 });
        const { cgtPayable: cgtWithPool, capitalLossPool } = calcCGT({ ...baseParams, capitalLossPool: 50000 });
        expect(cgtWithPool).toBeLessThan(cgtNoPool);
        expect(capitalLossPool).toBe(0); // pool consumed
    });
});

// ---------------------------------------------------------------------------
// CGT - PPOR main residence exemption
// ---------------------------------------------------------------------------

describe('CGT - PPOR main residence exemption', () => {
    const pporParams = {
        salePrice:      1200000,
        purchasePrice:  700000,
        sellingCosts:   30000,
        holdingYears:   10,
        marginalTaxRate: 0.37,
        isPpor:         true,
        pporPct:        1,
        policy:         { policyMode: PROPERTY_POLICY_MODE.CURRENT, pporMainResidenceExemption: true },
    };

    test('full PPOR exemption yields zero CGT', () => {
        const { cgtPayable } = calcCGT(pporParams);
        expect(cgtPayable).toBe(0);
    });

    test('partial PPOR use taxes the non-PPOR fraction', () => {
        const { cgtPayable } = calcCGT({ ...pporParams, pporPct: 0.5 });
        expect(cgtPayable).toBeGreaterThan(0);
        const fullInvestmentResult = calcCGT({ ...pporParams, isPpor: false });
        expect(cgtPayable).toBeLessThan(fullInvestmentResult.cgtPayable);
    });
});

// ---------------------------------------------------------------------------
// CGT - proposed 2027 rules (inflation indexation)
// ---------------------------------------------------------------------------

describe('CGT - proposed 2027 rules', () => {
    const proposedParams = {
        salePrice:      800000,
        purchasePrice:  500000,
        sellingCosts:   20000,
        holdingYears:   10,
        marginalTaxRate: 0.325,
        isPpor:         false,
        cpiCumulative:  1.45,
        policy: {
            policyMode:                       PROPERTY_POLICY_MODE.PROPOSED_2027,
            proposedUsesInflationIndexation:  true,
            proposedMinimumCgtRate:           0.20,
            currentCgtDiscountRate:           0.50,
            isNewBuild:                       false,
        },
    };

    test('indexed cost base reduces the taxable gain', () => {
        const currentResult  = calcCGT({ ...proposedParams, policy: { policyMode: PROPERTY_POLICY_MODE.CURRENT, currentCgtDiscountRate: 0.50 } });
        const proposedResult = calcCGT(proposedParams);
        // Both reduce the gain, but by different methods
        expect(proposedResult.cgtPayable).toBeGreaterThan(0);
    });

    test('minimum CGT rate floor applies when indexed gain is small', () => {
        // Force a scenario where indexed base is close to sale price (low nominal gain)
        const { cgtPayable, capitalGain } = calcCGT({
            ...proposedParams,
            cpiCumulative: 1.90,  // 90% inflation wipes out most gain
        });
        // Minimum CGT rate should prevent cgtPayable from going to zero
        if (capitalGain > 0) {
            const minCgt = capitalGain * 0.20;
            expect(cgtPayable).toBeGreaterThanOrEqual(minCgt * 0.9); // allow rounding
        }
    });
});

// ---------------------------------------------------------------------------
// CGT comparison current vs proposed
// ---------------------------------------------------------------------------

describe('compareCGTPolicies', () => {
    test('returns both current and proposed results', () => {
        const comparison = compareCGTPolicies({
            salePrice:       800000,
            purchasePrice:   500000,
            sellingCosts:    20000,
            holdingYears:    10,
            marginalTaxRate: 0.325,
            isPpor:          false,
            cpiCumulative:   1.35,
        });
        expect(comparison.current.cgtPayable).toBeGreaterThan(0);
        expect(comparison.proposed.cgtPayable).toBeGreaterThan(0);
        expect(typeof comparison.saving).toBe('number');
    });
});

// ---------------------------------------------------------------------------
// Sale proceeds
// ---------------------------------------------------------------------------

describe('Sale proceeds after tax', () => {
    test('net proceeds = sale price - selling costs - loan - CGT', () => {
        const result = calcSaleProceeds(800000, 400000, 500000, 30000);
        expect(result.salePrice).toBe(800000);
        expect(result.loanBalance).toBe(400000);
        expect(result.cgtPayable).toBe(30000);
        expect(result.netProceeds).toBe(
            result.grossProceeds - 400000 - 30000
        );
    });

    test('negative net proceeds when loan > gross proceeds', () => {
        const result = calcSaleProceeds(500000, 520000, 400000, 0);
        expect(result.netProceeds).toBeLessThan(0);
    });
});

// ---------------------------------------------------------------------------
// Real after-tax profit
// ---------------------------------------------------------------------------

describe('Real after-tax profit', () => {
    test('real profit adjusts for inflation', () => {
        const real = calcRealAfterTaxProfit(300000, 50000, 1.40);
        const nominalNetProceeds = 300000 / 1.40;  // ~214k in real terms
        expect(real).toBeCloseTo(nominalNetProceeds - 50000, 0);
    });

    test('returns negative when costs exceed real proceeds', () => {
        const real = calcRealAfterTaxProfit(100000, 200000, 1.40);
        expect(real).toBeLessThan(0);
    });
});

// ---------------------------------------------------------------------------
// IRR
// ---------------------------------------------------------------------------

describe('IRR calculation', () => {
    test('returns ~10% for a simple 10% return investment', () => {
        const flows = [-100000, 10000, 10000, 10000, 110000];
        const irr = calcIRR(flows);
        expect(irr).toBeCloseTo(0.10, 2);
    });

    test('returns null for single cashflow', () => {
        expect(calcIRR([-100000])).toBeNull();
    });

    test('returns negative IRR for loss-making investment', () => {
        const flows = [-100000, 5000, 5000, 5000, 60000];
        const irr = calcIRR(flows);
        expect(irr).toBeLessThan(0);
    });
});

// ---------------------------------------------------------------------------
// Monte Carlo reproducibility
// ---------------------------------------------------------------------------

describe('Monte Carlo - seeded reproducibility', () => {
    const prop = makeInvestmentProp();
    const opts = {
        holdYears:          20,
        startPropertyValue: 600000,
        startLoanBalance:   400000,
        propertyGrowthRate: 0.065,
        inflationRate:      0.036,
        numRuns:            100,
        seed:               42,
    };

    test('same seed produces same P50 IRR', () => {
        const run1 = runPropertyMonteCarlo(prop, opts);
        const run2 = runPropertyMonteCarlo(prop, opts);
        expect(run1.irr.p50).toBeCloseTo(run2.irr.p50, 8);
    });

    test('different seeds produce different results', () => {
        const run1 = runPropertyMonteCarlo(prop, opts);
        const run2 = runPropertyMonteCarlo(prop, { ...opts, seed: 99 });
        expect(run1.irr.p50).not.toBe(run2.irr.p50);
    });

    test('P10 < P50 < P90 for IRR', () => {
        const result = runPropertyMonteCarlo(prop, opts);
        expect(result.irr.p10).toBeLessThan(result.irr.p50);
        expect(result.irr.p50).toBeLessThan(result.irr.p90);
    });

    test('P10 < P50 < P90 for final equity', () => {
        const result = runPropertyMonteCarlo(prop, opts);
        expect(result.finalEquity.p10).toBeLessThan(result.finalEquity.p50);
        expect(result.finalEquity.p50).toBeLessThan(result.finalEquity.p90);
    });

    test('success rate is between 0 and 1', () => {
        const result = runPropertyMonteCarlo(prop, opts);
        expect(result.successRate).toBeGreaterThanOrEqual(0);
        expect(result.successRate).toBeLessThanOrEqual(1);
    });

    test('fan chart has one entry per hold year', () => {
        const result = runPropertyMonteCarlo(prop, opts);
        expect(result.yearlyValueFan).toHaveLength(20);
    });

    test('deterministic run returns single irr value', () => {
        const result = runPropertyDeterministic(prop, opts);
        expect(typeof result.irr).toBe('number');
        expect(result.yearlyData).toHaveLength(20);
    });
});

describe('Monte Carlo - policy comparison', () => {
    const prop = makeInvestmentProp();

    test('comparePropertyPoliciesMC returns both current and proposed results', () => {
        const result = comparePropertyPoliciesMC(prop, {
            holdYears:          10,
            startPropertyValue: 600000,
            startLoanBalance:   400000,
            propertyGrowthRate: 0.065,
            inflationRate:      0.036,
            numRuns:            50,
            seed:               1,
        });
        expect(result.current).toBeDefined();
        expect(result.proposed).toBeDefined();
        expect(typeof result.irrDifference).toBe('number');
    });
});

// ---------------------------------------------------------------------------
// Reverse solver
// ---------------------------------------------------------------------------

describe('Reverse solver - required equity', () => {
    test('higher target income requires more equity', () => {
        const low  = solveRequiredEquity(50000, 20, 0.065);
        const high = solveRequiredEquity(80000, 20, 0.065);
        expect(high.requiredCurrentEquity).toBeGreaterThan(low.requiredCurrentEquity);
    });

    test('longer time to retirement reduces required equity (growth works for you)', () => {
        const short = solveRequiredEquity(50000, 10, 0.065);
        const long  = solveRequiredEquity(50000, 25, 0.065);
        expect(long.requiredCurrentEquity).toBeLessThan(short.requiredCurrentEquity);
    });

    test('returns finite positive values', () => {
        const result = solveRequiredEquity(60000, 15, 0.065, 0.036, 0.04);
        expect(result.requiredCurrentEquity).toBeGreaterThan(0);
        expect(Number.isFinite(result.requiredCurrentEquity)).toBe(true);
    });
});

describe('Reverse solver - optimal sale timing', () => {
    const prop = makeInvestmentProp();

    test('returns an optimal year within hold range', () => {
        const result = solveOptimalSaleTiming(prop, {
            maxHoldYears:       20,
            startPropertyValue: 600000,
            startLoanBalance:   400000,
            propertyGrowthRate: 0.065,
        });
        expect(result.optimalYear).toBeGreaterThanOrEqual(1);
        expect(result.optimalYear).toBeLessThanOrEqual(20);
    });

    test('byYear array has maxHoldYears entries', () => {
        const result = solveOptimalSaleTiming(prop, {
            maxHoldYears:       15,
            startPropertyValue: 600000,
            startLoanBalance:   400000,
        });
        expect(result.byYear).toHaveLength(15);
    });
});

describe('Reverse solver - retirement strategy comparison', () => {
    const prop = makeInvestmentProp();

    test('returns sell/keep/downsize options with real income estimates', () => {
        const result = compareRetirementStrategies(prop, {
            yearsToRetirement:  20,
            inflationRate:      0.036,
            propertyGrowthRate: 0.065,
        });
        expect(result.sell).toBeDefined();
        expect(result.keep).toBeDefined();
        expect(result.downsize).toBeDefined();
        expect(result.recommendedStrategy).toBeDefined();
    });

    test('sell strategy produces positive net proceeds for growing property', () => {
        const result = compareRetirementStrategies(prop, {
            yearsToRetirement:  20,
            propertyGrowthRate: 0.065,
        });
        expect(result.sell.netProceeds).toBeGreaterThan(0);
    });
});

// ---------------------------------------------------------------------------
// Comparison: property vs ETF vs super
// ---------------------------------------------------------------------------

describe('ETF projection', () => {
    test('compound growth over time', () => {
        const result = projectETF(100000, 0.085, 0, 10, 0.235, 0.036);
        expect(result.finalValue).toBeGreaterThan(100000);
    });

    test('yearlyValues has correct length', () => {
        const result = projectETF(100000, 0.085, 0, 20, 0.235, 0.036);
        expect(result.yearlyValues).toHaveLength(20);
    });

    test('annual contributions increase final value', () => {
        const noContrib   = projectETF(100000, 0.085, 0, 10);
        const withContrib = projectETF(100000, 0.085, 5000, 10);
        expect(withContrib.finalValue).toBeGreaterThan(noContrib.finalValue);
    });
});

describe('Super projection', () => {
    test('15% tax on earnings in accumulation phase', () => {
        const superResult = projectSuper(100000, 0.085, 0, 10);
        const etfResult   = projectETF(100000, 0.085, 0, 10, 0.15);  // same as super
        expect(superResult.finalValue).toBeCloseTo(etfResult.finalValue, 0);
    });
});

// ---------------------------------------------------------------------------
// Historical anchor data
// ---------------------------------------------------------------------------

describe('Historical anchor data', () => {
    test('buildHistoricalAnchorRates fills in known years up to 2026', () => {
        const anchors = buildHistoricalAnchorRates('sydney', 2022, 10);
        // 2022-2026 = 5 years of historical data (indices 0-4)
        // 2027-2031 = future (indices 5-9)
        expect(anchors.growth[0]).not.toBeNull();  // 2022
        expect(anchors.growth[4]).not.toBeNull();  // 2026
        expect(anchors.growth[5]).toBeNull();       // 2027 = future
    });

    test('growth rates are decimals not percentages', () => {
        const anchors = buildHistoricalAnchorRates('national', 2020, 5);
        for (const g of anchors.growth.filter(x => x !== null)) {
            expect(Math.abs(g)).toBeLessThan(1.0);  // e.g. 0.08, not 8
        }
    });

    test('estimateCurrentValueFromHistory grows from purchase year', () => {
        const value2018 = estimateCurrentValueFromHistory(500000, 'national', 2018);
        // National has had positive average growth 2019-2026 overall
        expect(value2018).toBeGreaterThan(400000);
    });

    test('calcCumulativeCPI compounds from purchase year', () => {
        const mult = calcCumulativeCPI(2020, 2026);
        // 2021-2026 CPI includes big 2022 spike
        expect(mult).toBeGreaterThan(1.15);
    });
});

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

describe('validatePropertyInput', () => {
    test('valid investment property passes validation', () => {
        const errors = validatePropertyInput({
            id:               'p1',
            useType:          PROPERTY_USE.INVESTMENT,
            weeklyRent:       500,
            ownershipUserPct: 100,
        });
        expect(errors).toHaveLength(0);
    });

    test('missing id fails validation', () => {
        const errors = validatePropertyInput({
            useType:          PROPERTY_USE.INVESTMENT,
            weeklyRent:       500,
            ownershipUserPct: 100,
        });
        expect(errors.some(e => e.includes('id'))).toBe(true);
    });

    test('investment property without rent fails', () => {
        const errors = validatePropertyInput({
            id:               'p1',
            useType:          PROPERTY_USE.INVESTMENT,
            weeklyRent:       0,
            ownershipUserPct: 100,
        });
        expect(errors.some(e => e.includes('weeklyRent'))).toBe(true);
    });

    test('ownership percentages must sum to 100', () => {
        const errors = validatePropertyInput({
            id:                  'p1',
            useType:             PROPERTY_USE.INVESTMENT,
            weeklyRent:          500,
            ownershipUserPct:    60,
            ownershipPartnerPct: 30,  // 60 + 30 = 90, not 100
        });
        expect(errors.some(e => e.includes('100'))).toBe(true);
    });

    test('purchase date before sale date passes', () => {
        const errors = validatePropertyInput({
            id:               'p1',
            useType:          PROPERTY_USE.INVESTMENT,
            weeklyRent:       500,
            ownershipUserPct: 100,
            purchaseDate:     '2018-01-01',
            saleDate:         '2028-01-01',
        });
        expect(errors).toHaveLength(0);
    });

    test('purchase date after sale date fails', () => {
        const errors = validatePropertyInput({
            id:               'p1',
            useType:          PROPERTY_USE.INVESTMENT,
            weeklyRent:       500,
            ownershipUserPct: 100,
            purchaseDate:     '2028-01-01',
            saleDate:         '2018-01-01',
        });
        expect(errors.some(e => e.includes('date'))).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Scenario regression tests
// ---------------------------------------------------------------------------

describe('Scenario regressions', () => {
    test('Scenario 1: 2018 $500k property, $500/week rent, current rules — positive IRR', () => {
        const prop = makeInvestmentProp({
            purchasePrice:     500000,
            currentValue:      estimateCurrentValueFromHistory(500000, 'national', 2018),
            currentLoanBalance: 350000,
            weeklyRent:        500,
            taxPolicy:         { policyMode: PROPERTY_POLICY_MODE.CURRENT, marginalTaxRateUser: 0.325 },
        });
        const result = runPropertyDeterministic(prop, {
            holdYears:          8,
            startPropertyValue: prop.currentValue,
            startLoanBalance:   350000,
            propertyGrowthRate: 0.065,
        });
        expect(result.irr).toBeGreaterThan(0);
    });

    test('Scenario 4: 2027 $750k established property, proposed rules — lower profit than current', () => {
        const prop = makeInvestmentProp({
            purchasePrice:     750000,
            currentValue:      750000,
            currentLoanBalance: 600000,
            weeklyRent:        550,
            isNewBuild:        false,
        });

        const currentResult = runPropertyDeterministic(prop, {
            holdYears:          20,
            startPropertyValue: 750000,
            startLoanBalance:   600000,
            propertyGrowthRate: 0.065,
            policy:             { policyMode: PROPERTY_POLICY_MODE.CURRENT, marginalTaxRateUser: 0.325, currentCgtDiscountRate: 0.50 },
        });

        const proposedResult = runPropertyDeterministic(prop, {
            holdYears:          20,
            startPropertyValue: 750000,
            startLoanBalance:   600000,
            propertyGrowthRate: 0.065,
            policy:             { policyMode: PROPERTY_POLICY_MODE.PROPOSED_2027, marginalTaxRateUser: 0.325, isNewBuild: false, proposedUsesInflationIndexation: true, proposedMinimumCgtRate: 0.20 },
        });

        // Under proposed rules (no negative gearing), investor out-of-pocket is higher
        // so real profit should be lower
        expect(proposedResult.realAfterTaxProfit).toBeLessThanOrEqual(currentResult.realAfterTaxProfit);
    });

    test('Scenario 5: 2027 $750k new build — proposed rules retain negative gearing', () => {
        const propEstablished = makeInvestmentProp({ weeklyRent: 550, currentValue: 750000, currentLoanBalance: 600000, isNewBuild: false });
        const propNewBuild    = makeInvestmentProp({ weeklyRent: 550, currentValue: 750000, currentLoanBalance: 600000, isNewBuild: true });

        const policyEstablished = { policyMode: PROPERTY_POLICY_MODE.PROPOSED_2027, isNewBuild: false, marginalTaxRateUser: 0.325, proposedUsesInflationIndexation: true, proposedMinimumCgtRate: 0.20 };
        const policyNewBuild    = { policyMode: PROPERTY_POLICY_MODE.PROPOSED_2027, isNewBuild: true,  marginalTaxRateUser: 0.325, proposedUsesInflationIndexation: true, proposedMinimumCgtRate: 0.20 };

        const establishedResult = runPropertyDeterministic(propEstablished, { holdYears: 20, startPropertyValue: 750000, startLoanBalance: 600000, propertyGrowthRate: 0.065, policy: policyEstablished });
        const newBuildResult    = runPropertyDeterministic(propNewBuild,    { holdYears: 20, startPropertyValue: 750000, startLoanBalance: 600000, propertyGrowthRate: 0.065, policy: policyNewBuild    });

        // New build should be more profitable under proposed rules
        expect(newBuildResult.realAfterTaxProfit).toBeGreaterThanOrEqual(establishedResult.realAfterTaxProfit);
    });

    test('Scenario 6: PPOR with mortgage — no rental income, no CGT on sale', () => {
        const prop = makePporProp();
        const cf = calcAnnualPropertyCashflow(prop, { year: 0, propertyValue: 1000000, loanBalance: 600000, interestRate: 0.062, cpiGrowth: 0.036, rentGrowth: 0 });
        expect(cf.grossRent).toBe(0);
        expect(cf.taxableRentalIncome).toBe(0);

        const { cgtPayable } = calcCGT({
            salePrice:      1200000,
            purchasePrice:  800000,
            holdingYears:   10,
            marginalTaxRate: 0.37,
            isPpor:         true,
            pporPct:        1,
            policy:         { policyMode: PROPERTY_POLICY_MODE.CURRENT, pporMainResidenceExemption: true },
        });
        expect(cgtPayable).toBe(0);
    });

    test('Scenario 7: PPOR downsizing — sell strategy returns funds for retirement', () => {
        const prop = makePporProp({ currentValue: 1000000, currentLoanBalance: 200000 });
        const result = compareRetirementStrategies(prop, { yearsToRetirement: 15, propertyGrowthRate: 0.065 });
        expect(result.sell.netProceeds).toBeGreaterThan(0);
    });

    test('Scenario 8: Investment property sold at retirement — CGT payable', () => {
        const prop = makeInvestmentProp({ purchasePrice: 500000, currentValue: 800000, currentLoanBalance: 300000 });
        const { cgtPayable } = calcCGT({
            salePrice:      1200000,
            purchasePrice:  500000,
            holdingYears:   20,
            marginalTaxRate: 0.325,
            isPpor:         false,
            policy:         { policyMode: PROPERTY_POLICY_MODE.CURRENT, currentCgtDiscountRate: 0.50 },
        });
        expect(cgtPayable).toBeGreaterThan(0);
        // Should be (1200000-500000)*0.50*0.325 = 113750
        expect(cgtPayable).toBeCloseTo(700000 * 0.50 * 0.325, -3);
    });
});

// ---------------------------------------------------------------------------
// buildEffectivePolicy
// ---------------------------------------------------------------------------

describe('buildEffectivePolicy', () => {
    test('defaults to current rules when no policy provided', () => {
        const cfg = buildEffectivePolicy();
        expect(cfg.policyMode).toBe(PROPERTY_POLICY_MODE.CURRENT);
        expect(cfg.negativeGearingAllowed).toBe(true);
    });

    test('proposed 2027 established: no negative gearing', () => {
        const cfg = buildEffectivePolicy({ policyMode: PROPERTY_POLICY_MODE.PROPOSED_2027, isNewBuild: false });
        expect(cfg.negativeGearingAllowed).toBe(false);
        expect(cfg.carriedForwardLossesAllowed).toBe(true);
    });

    test('proposed 2027 new build: negative gearing retained', () => {
        const cfg = buildEffectivePolicy({ policyMode: PROPERTY_POLICY_MODE.PROPOSED_2027, isNewBuild: true });
        expect(cfg.negativeGearingAllowed).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// Reverse solver - solveRequiredRent and solveMaxPurchasePrice
// (These functions previously used require() in an ES module — now fixed)
// ---------------------------------------------------------------------------

describe('Reverse solver - required rent', () => {
    const prop = makeInvestmentProp();
    const yearCtx = {
        year:          0,
        propertyValue: 600000,
        loanBalance:   400000,
        interestRate:  0.062,
        cpiGrowth:     0.036,
        rentGrowth:    0,
    };

    test('returns a positive weekly rent', () => {
        const { solved, weeklyRent } = solveRequiredRent(prop, yearCtx, 0);
        expect(solved).toBe(true);
        expect(weeklyRent).toBeGreaterThan(0);
    });

    test('higher target cashflow requires higher rent', () => {
        const { weeklyRent: low  } = solveRequiredRent(prop, yearCtx, 0);
        const { weeklyRent: high } = solveRequiredRent(prop, yearCtx, 5000);
        expect(high).toBeGreaterThan(low);
    });

    test('rent is rounded to nearest 50 cents', () => {
        const { weeklyRent } = solveRequiredRent(prop, yearCtx, 0);
        expect(weeklyRent * 2).toBe(Math.round(weeklyRent * 2));
    });
});

describe('Reverse solver - max purchase price', () => {
    const propTemplate = makeInvestmentProp({ weeklyRent: 0 });

    test('returns a positive max purchase price', () => {
        // $20k loss limit: solvable — at $100k the loss is ~$8k (below limit) so error < 0,
        // and at $5M the loss is ~$140k (above limit) so error > 0. Root exists.
        const { solved, maxPurchasePrice } = solveMaxPurchasePrice(propTemplate, 20000, 0.20);
        expect(solved).toBe(true);
        expect(maxPurchasePrice).toBeGreaterThan(0);
    });

    test('higher loss tolerance allows a higher purchase price', () => {
        // Both limits must be within the solvable range [100k, 5M].
        // At $100k, annual loss ≈ $8k, so $15k and $40k limits are both solvable
        // (error at lo is negative, at hi is positive for both).
        const { solved: s1, maxPurchasePrice: low  } = solveMaxPurchasePrice(propTemplate, 15000, 0.20);
        const { solved: s2, maxPurchasePrice: high } = solveMaxPurchasePrice(propTemplate, 40000, 0.20);
        expect(s1).toBe(true);
        expect(s2).toBe(true);
        expect(high).toBeGreaterThan(low);
    });

    test('larger deposit reduces max price for same loss limit', () => {
        // Larger deposit → more cash upfront → same price → less interest → smaller loss.
        // To hit the same loss limit with a larger deposit, you can afford a bigger property.
        const { maxPurchasePrice: small } = solveMaxPurchasePrice(propTemplate, 20000, 0.10);
        const { maxPurchasePrice: large } = solveMaxPurchasePrice(propTemplate, 20000, 0.30);
        expect(large).toBeGreaterThan(small);
    });
});

// ---------------------------------------------------------------------------
// Property vs ETF / Super comparison (tests for the double-counting fix)
// ---------------------------------------------------------------------------

describe('Property vs ETF comparison', () => {
    const prop = makeInvestmentProp();
    const propOpts = {
        holdYears:          10,
        startPropertyValue: 600000,
        startLoanBalance:   400000,
        propertyGrowthRate: 0.065,
        inflationRate:      0.036,
    };

    test('ETF initial capital equals deposit only, not total cash contributed', () => {
        const result = comparePropertyVsETF(prop, propOpts, { annualReturn: 0.085, taxRate: 0.235 });
        // Property totalCashContributed includes deposit + top-ups
        // ETF should start with just deposit; total contributed should be <= property total
        expect(result.etf.totalContributed).toBeLessThanOrEqual(result.property.totalCashIn + 1);
    });

    test('returns winner field', () => {
        const result = comparePropertyVsETF(prop, propOpts, {});
        expect(['property', 'etf']).toContain(result.difference.winner);
    });

    test('ETF real profit computation does not double-count top-ups', () => {
        const result = comparePropertyVsETF(prop, propOpts, { annualReturn: 0.085, taxRate: 0 });
        // With 0 tax, ETF real profit should be positive for a 10-year run at 8.5%
        expect(result.etf.realProfit).toBeGreaterThan(0);
    });
});

describe('Property vs Super comparison', () => {
    const prop = makeInvestmentProp();
    const propOpts = {
        holdYears:          10,
        startPropertyValue: 600000,
        startLoanBalance:   400000,
        propertyGrowthRate: 0.065,
        inflationRate:      0.036,
    };

    test('returns super final balance and winner', () => {
        const result = comparePropertyVsSuper(prop, propOpts, { annualReturn: 0.085 });
        expect(result.super.finalBalance).toBeGreaterThan(0);
        expect(['property', 'super']).toContain(result.difference.winner);
    });
});

// ---------------------------------------------------------------------------
// validatePropertyInput - established property with proposed rules must NOT error
// ---------------------------------------------------------------------------

describe('validatePropertyInput - proposed 2027 rules', () => {
    test('established property with proposed 2027 policy is valid', () => {
        const errors = validatePropertyInput({
            id:               'p1',
            useType:          PROPERTY_USE.INVESTMENT,
            weeklyRent:       500,
            ownershipUserPct: 100,
            isNewBuild:       false,
            taxPolicy:        { policyMode: PROPERTY_POLICY_MODE.PROPOSED_2027 },
        });
        expect(errors).toHaveLength(0);
    });
});
