import fs from 'fs';
import path from 'path';
import {
    sanitiseInputs,
    sanitiseReturnDeclineRate,
} from '../../src/js/policy/normalise-inputs.js';
import { validateReconciledInputs } from '../../src/js/calculation/input-reconciliation-validator.js';
import { adaptAdvancedV2Input } from '../../src/js/calculation/input-adapters/advanced-v2-adapter.js';
import { adaptAdvancedClassicInput } from '../../src/js/calculation/input-adapters/advanced-classic-adapter.js';
import {
    applyCapitalLossPool,
    buildInvestmentPropertyPosition,
} from '../../src/js/calculation/investment-property-position.js';
import {
    amountAtRisk,
    classifyRecommendation,
    firstDepletionAge,
    riskRank,
} from '../../src/js/recommendation.js';
import {
    extractProjectionSnapshot,
    validateProjectionSnapshot,
} from '../../src/js/forward-projection-bridge.js';

describe('trustworthiness input guardrails', () => {
    test('migrates legacy return decline percentage units explicitly', () => {
        expect(sanitiseReturnDeclineRate(0.2)).toMatchObject({
            value: 0.002,
            migrated: true,
            reason: 'legacy_percent_to_decimal',
        });
        const result = sanitiseInputs({ returnDeclineRate: 0.2, scenarioMode: 'optimistic' });
        expect(result.inputs.returnDeclineRate).toBeCloseTo(0.002);
        expect(result.inputs.headlineScenarioMode).toBe('base');
        expect(result.warnings.map((entry) => entry.field)).toEqual(
            expect.arrayContaining(['returnDeclineRate', 'scenarioMode'])
        );
    });

    test('blocks unsafe rates that cannot be safely migrated', () => {
        const sanitised = sanitiseInputs({ returnDeclineRate: 5 });
        const quality = validateReconciledInputs(
            { yourCurrentAge: 49, retirementAge: 67, returnDeclineRate: 5 },
            { schemaVersion: 'retirement-canonical-input-v2' },
            { sanitiseWarnings: sanitised.warnings }
        );
        expect(quality.valid).toBe(false);
        expect(quality.blockingIssues.some((entry) => entry.field === 'returnDeclineRate')).toBe(true);
    });

    test('advanced and advanced-v2 preserve the formerly missing canonical fields', () => {
        const shared = {
            monthlyMortgagePayment: 4401,
            investmentPropertyPurchasePrice: 644900,
            investmentPropertyPurchaseYear: 2024,
            investmentPropertyLoanType: 'pi',
            capitalGainsTaxRate: 0.235,
            healthcareInflation: 0.055,
            salaryGrowthRate: 0.02,
            pensionIncomeThreshold: 380,
        };
        const classic = adaptAdvancedClassicInput({
            ...shared,
            yourCurrentAge: 49,
            retirementAge: 71,
            yourSalary: 235158,
            yourCurrentSuper: 336330,
            mortgageBalance: 594000,
            hasInvestmentProperty: true,
            investmentPropertyValue: 530000,
            investmentPropertyLoan: 574000,
        });
        const v2 = adaptAdvancedV2Input({
            age: 49,
            retireAge: 71,
            salary: 235158,
            superBal: 336330,
            mortgage: 594000,
            monthlyMortgagePayment: shared.monthlyMortgagePayment,
            investmentProperty: true,
            ipValue: 530000,
            ipLoan: 574000,
            ipPurchasePrice: shared.investmentPropertyPurchasePrice,
            ipPurchaseYear: shared.investmentPropertyPurchaseYear,
            ipLoanType: shared.investmentPropertyLoanType,
            capitalGainsTaxRate: 23.5,
            healthcareInflation: 5.5,
            salaryGrowthRate: 2,
            pensionIncomeThreshold: 380,
        });
        expect(v2.cashflow.currentMonthlyMortgagePayment).toBe(classic.cashflow.currentMonthlyMortgagePayment);
        expect(v2.investmentProperty.purchasePrice).toBe(classic.investmentProperty.purchasePrice);
        expect(v2.investmentProperty.purchaseYear).toBe(classic.investmentProperty.purchaseYear);
        expect(v2.investmentProperty.loanType).toBe(classic.investmentProperty.loanType);
        expect(v2.investmentProperty.capitalGainsTaxRate).toBeCloseTo(classic.investmentProperty.capitalGainsTaxRate);
        expect(v2.healthAndAgedCare.healthcareInflationRate).toBeCloseTo(classic.healthAndAgedCare.healthcareInflationRate);
        expect(v2.assumptions.wageGrowthRate).toBeCloseTo(classic.assumptions.wageGrowthRate);
        expect(v2.housingAndPension.pensionIncomeThreshold).toBe(classic.housingAndPension.pensionIncomeThreshold);
    });

    test('advanced-v2 exposes all reconciliation fields in the UI', () => {
        const html = fs.readFileSync(path.join(process.cwd(), 'src/advanced-v2.html'), 'utf8');
        for (const id of [
            'monthlyMortgagePayment', 'ipPurchasePrice', 'ipPurchaseYear', 'ipLoanType',
            'capitalGainsTaxRate', 'healthcareInflation', 'salaryGrowthRate',
            'pensionIncomeThreshold', 'returnDeclineRate',
        ]) expect(html).toContain(`id="${id}"`);
    });
});

describe('investment property forensic model', () => {
    const underwater = {
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

    test('reports negative equity, cash call, net rent and capital loss', () => {
        const position = buildInvestmentPropertyPosition(underwater);
        expect(position.currentEquity).toBe(-44000);
        expect(position.cashRequiredToSellToday).toBeGreaterThan(44000);
        expect(position.annualNetCashflowBeforeTax).toBeLessThan(0);
        expect(position.capitalLossCarriedForward).toBeCloseTo(114900);
        expect(position.cgtPayable).toBe(0);
        expect(position.currentRiskLabel).toBe('negative_equity');
    });

    test('banked capital loss offsets a later gain before CGT', () => {
        const loss = applyCapitalLossPool(-114900, 0);
        const laterGain = applyCapitalLossPool(100000, loss.capitalLossPool);
        expect(laterGain.taxableGain).toBe(0);
        expect(laterGain.capitalLossPool).toBeCloseTo(14900);
    });
});

describe('suggestion risk metrics', () => {
    test('depletion and amount at risk use the projected path', () => {
        const yearly = [
            { age: 80, endBalance: 1000, shortfall: 0, yearsAhead: 0 },
            { age: 81, endBalance: 0, shortfall: 10000, yearsAhead: 1 },
        ];
        expect(firstDepletionAge(yearly, 80)).toBe(81);
        expect(amountAtRisk(yearly, 0.025)).toBeCloseTo(9756.1, 1);
    });

    test('negative wealth with improved downside is a trade-off', () => {
        expect(classifyRecommendation({
            finalBalanceDelta: -100000,
            successRateDelta: 0.03,
            baselineDepletionAge: 85,
            scenarioDepletionAge: 90,
        })).toBe('trade_off');
        expect(classifyRecommendation({
            finalBalanceDelta: -100000,
            successRateDelta: 0,
            baselineDepletionAge: null,
            scenarioDepletionAge: null,
        })).toBe('not_recommended');
    });

    test('risk ranking prefers success, then survival, then downside', () => {
        const recs = [
            { band: { successRate: 0.9, depletionAge: 88, p10FinalBalance: 1000 } },
            { band: { successRate: 0.97, depletionAge: null, p10FinalBalance: 500 } },
        ];
        expect(recs.sort(riskRank)[0].band.successRate).toBe(0.97);
    });
});

describe('reverse projection integrity', () => {
    const projection = {
        source: 'advanced-v2',
        inputHash: 'fnv1a-input',
        projectionHash: 'fnv1a-output',
        canonicalInput: {
            household: { householdType: 'couple', currentAge: 49, partnerAge: 47, retirementAge: 71, lifespan: 102 },
            income: { annualSalary: 235158, partnerAnnualSalary: 41220 },
            currentAssets: { currentSuperBalance: 336330, partnerCurrentSuperBalance: 15120, cashSavings: 50000, stocksPortfolio: 20000 },
            cashflow: { currentMonthlyMortgagePayment: 4401 },
            assumptions: {},
            scenarioToggles: {},
            investmentProperty: {},
        },
        engineInputs: { isCouple: true, yourSalary: 235158, yourCurrentSuper: 336330, currentSavings: 50000 },
    };

    test('snapshot is sourced from canonical/engine data and retains hashes', () => {
        const snapshot = extractProjectionSnapshot(projection);
        expect(snapshot.isCouple).toBe(true);
        expect(snapshot.annualSalary).toBeGreaterThan(0);
        expect(snapshot.currentSuperBalance).toBeGreaterThan(0);
        expect(snapshot.cashSavings).toBeGreaterThan(0);
        expect(snapshot.inputHash).toBe(projection.inputHash);
        expect(validateProjectionSnapshot(projection, snapshot).valid).toBe(true);
    });

    test('blocks export when imported couple/positive data becomes single and zero', () => {
        const invalid = validateProjectionSnapshot(projection, {
            ...extractProjectionSnapshot(projection),
            isCouple: false,
            annualSalary: 0,
            currentSuperBalance: 0,
            cashSavings: 0,
        });
        expect(invalid.valid).toBe(false);
        expect(invalid.issues.length).toBeGreaterThanOrEqual(4);
    });
});
