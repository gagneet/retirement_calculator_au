/**
 * property-cgt.test.js — Capital loss carry-forward and investment property position tests
 * (Task 2 of engine fixes)
 *
 * Tests the investment property forensic model, capital loss pool, and sell-now position.
 * See: src/js/calculation/investment-property-position.js
 */

import {
    applyCapitalLossPool,
    buildInvestmentPropertyLedgerEntry,
    buildInvestmentPropertyPosition,
} from '../../src/js/calculation/investment-property-position.js';

// Matches the 2026-06-22 audit scenario: value 530k, loan 574k, purchase price 644.9k
const UNDERWATER_INPUTS = {
    yourCurrentAge: 49,
    investmentPropertyValue: 530000,
    investmentPropertyLoan: 574000,
    investmentPropertyPurchasePrice: 644900,
    investmentPropertyRate: 0.0682,
    weeklyRentalIncome: 554,
    vacancyRate: 0.02,
    annualPropertyExpenses: 4412,
    investmentPropertyStrataLevy: 3500,
    landTax: 2207,
    capitalGainsTaxRate: 0.235,
};

describe('applyCapitalLossPool', () => {
    test('a capital gain with empty pool is fully taxable', () => {
        const { taxableGain, capitalLossPool, capitalLossRealised } = applyCapitalLossPool(100000, 0);
        expect(taxableGain).toBe(100000);
        expect(capitalLossPool).toBe(0);
        expect(capitalLossRealised).toBe(0);
    });

    test('capital loss yields zero CGT and banks the loss', () => {
        // value 530k, cost base 644.9k → loss 114.9k
        const { taxableGain, capitalLossPool, capitalLossRealised } = applyCapitalLossPool(-114900, 0);
        expect(taxableGain).toBe(0);
        expect(capitalLossRealised).toBeCloseTo(114900);
        expect(capitalLossPool).toBeCloseTo(114900);
    });

    test('banked loss offsets a later gain before tax', () => {
        const loss = applyCapitalLossPool(-114900, 0);
        const laterGain = applyCapitalLossPool(100000, loss.capitalLossPool);
        // Gain of 100k against pool of 114.9k → 0 taxable, 14.9k remaining pool
        expect(laterGain.taxableGain).toBe(0);
        expect(laterGain.capitalLossPool).toBeCloseTo(14900);
        expect(laterGain.capitalLossApplied).toBeCloseTo(100000);
    });

    test('partial pool offset leaves remaining pool', () => {
        const result = applyCapitalLossPool(50000, 200000);
        expect(result.taxableGain).toBe(0);
        expect(result.capitalLossApplied).toBe(50000);
        expect(result.capitalLossPool).toBeCloseTo(150000);
    });

    test('pool smaller than gain: pool exhausted, remaining gain taxable', () => {
        const result = applyCapitalLossPool(300000, 100000);
        expect(result.taxableGain).toBeCloseTo(200000);
        expect(result.capitalLossPool).toBe(0);
        expect(result.capitalLossApplied).toBeCloseTo(100000);
    });
});

describe('buildInvestmentPropertyPosition — underwater property', () => {
    let position;
    beforeEach(() => {
        position = buildInvestmentPropertyPosition(UNDERWATER_INPUTS);
    });

    test('current equity is negative', () => {
        expect(position.currentEquity).toBe(-44000);
    });

    test('net sale proceeds today are negative (requires cash to discharge loan)', () => {
        expect(position.netSaleProceedsToday).toBeLessThan(0);
    });

    test('cash required to sell today is positive and > 44k', () => {
        expect(position.cashRequiredToSellToday).toBeGreaterThan(44000);
    });

    test('CGT payable is zero on a capital loss position', () => {
        expect(position.cgtPayable).toBe(0);
    });

    test('capital loss is carried forward', () => {
        // Capital loss = 530000 - 644900 = -114900 (absolute)
        expect(position.capitalLossCarriedForward).toBeCloseTo(114900);
    });

    test('property is flagged negative_equity', () => {
        expect(position.currentRiskLabel).toBe('negative_equity');
    });

    test('annual net cashflow before tax is negative (negatively geared)', () => {
        expect(position.annualNetCashflowBeforeTax).toBeLessThan(0);
        expect(position.isNegativelyGeared).toBe(true);
    });

    test('current value is below purchase price', () => {
        expect(position.belowPurchasePrice).toBe(true);
    });

    test('gross rent equals weekly rent * 52', () => {
        expect(position.annualRentGross).toBeCloseTo(554 * 52);
    });

    test('annual interest cost approximates loan * rate', () => {
        expect(position.annualInterestCost).toBeCloseTo(574000 * 0.0682, -2);
    });
});

describe('buildInvestmentPropertyPosition — positive equity property', () => {
    const POSITIVE_INPUTS = {
        investmentPropertyValue: 800000,
        investmentPropertyLoan: 300000,
        investmentPropertyPurchasePrice: 650000,
        investmentPropertyRate: 0.06,
        weeklyRentalIncome: 700,
        vacancyRate: 0.04,
        annualPropertyExpenses: 5000,
        capitalGainsTaxRate: 0.235,
    };

    test('current equity is positive', () => {
        const pos = buildInvestmentPropertyPosition(POSITIVE_INPUTS);
        expect(pos.currentEquity).toBe(500000);
    });

    test('no cash required to sell (positive net proceeds)', () => {
        const pos = buildInvestmentPropertyPosition(POSITIVE_INPUTS);
        expect(pos.cashRequiredToSellToday).toBe(0);
    });

    test('CGT is non-zero on a capital gain', () => {
        const pos = buildInvestmentPropertyPosition(POSITIVE_INPUTS);
        // Gain = 800000 - 650000 = 150000; CGT = 150000 * 0.235 = 35250
        expect(pos.cgtPayable).toBeCloseTo(35250, -1);
    });

    test('capital loss carried forward is zero on a gain', () => {
        const pos = buildInvestmentPropertyPosition(POSITIVE_INPUTS);
        expect(pos.capitalLossCarriedForward).toBe(0);
    });
});

describe('buildInvestmentPropertyLedgerEntry', () => {
    test('ledger produces matching gross rent from weekly income', () => {
        const entry = buildInvestmentPropertyLedgerEntry(
            { weeklyRentalIncome: 500, investmentPropertyRate: 0.07, vacancyRate: 0.04 },
            { year: 1, openingLoan: 400000, closingLoan: 390000, openingValue: 600000, closingValue: 615000 }
        );
        expect(entry.grossRent).toBeCloseTo(500 * 52);
        expect(entry.vacancyLoss).toBeGreaterThan(0);
        expect(entry.netRent).toBeLessThan(entry.grossRent);
        expect(entry.principal).toBeCloseTo(10000);
        expect(entry.expectedCapitalGrowth).toBeCloseTo(15000);
    });

    test('negative netCashflowBeforeTax when interest exceeds rent', () => {
        const entry = buildInvestmentPropertyLedgerEntry(
            { weeklyRentalIncome: 400, investmentPropertyRate: 0.10, vacancyRate: 0 },
            { year: 0, openingLoan: 600000, closingLoan: 600000, openingValue: 600000, closingValue: 600000 }
        );
        // Rent: 400*52=20800; Interest: 60000 → net < 0
        expect(entry.netCashflowBeforeTax).toBeLessThan(0);
    });
});
