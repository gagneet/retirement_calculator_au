import { normaliseCanonicalInput } from '../../src/js/calculation/canonical-input-schema.js';
import { deriveHouseholdCashflow } from '../../src/js/calculation/household-cashflow-engine.js';
import { ProjectionService } from '../../src/js/calculation/projection-service.js';
import { adaptAdvancedV2Input } from '../../src/js/calculation/input-adapters/advanced-v2-adapter.js';
import { applyCanonicalCashflowToEngineInputs } from '../../src/js/calculation/canonical-engine-adapter.js';

describe('calculator consolidation foundations', () => {
    test('allocates the full $20k income / $7k spend surplus instead of discarding it', () => {
        const canonicalInput = normaliseCanonicalInput({
            cashflow: {
                currentMonthlyIncome: 20000,
                currentMonthlyTotalSpend: 7000,
                surplusAllocationMode: 'cash',
            },
        });

        const result = deriveHouseholdCashflow(canonicalInput);

        expect(result.monthlySurplus).toBe(13000);
        expect(result.allocations.cash).toBe(156000);
        expect(result.allocatedSurplus).toBe(156000);
        expect(result.unallocatedSurplus).toBe(0);
        expect(result.warnings).toEqual([]);
    });

    test('caches one deterministic run per input hash and invalidates changed input', () => {
        const simulator = { simulateRetirement: jest.fn(() => ({ yearlyData: [] })) };
        const service = new ProjectionService({
            simulator,
            adapter: normaliseCanonicalInput,
            engineInputBuilder: (_raw, { derivedCashflow }) => ({ derivedCashflow }),
        });
        const input = {
            household: { currentAge: 49, retirementAge: 67 },
            cashflow: { currentMonthlyIncome: 20000, currentMonthlyTotalSpend: 7000 },
        };

        const first = service.computeProjection(input);
        const second = service.computeProjection({ ...input });
        const changed = service.computeProjection({
            ...input,
            cashflow: { ...input.cashflow, currentMonthlyTotalSpend: 7100 },
        });

        expect(second).toBe(first);
        expect(changed.inputHash).not.toBe(first.inputHash);
        expect(simulator.simulateRetirement).toHaveBeenCalledTimes(2);
    });

    test('does not invent surplus when detailed spending is missing', () => {
        const canonicalInput = normaliseCanonicalInput({
            income: { annualSalary: 120000 },
            cashflow: { explicitMonthlyInvestmentContribution: 500 },
        });

        const result = deriveHouseholdCashflow(canonicalInput);

        expect(result.annualSurplus).toBeNull();
        expect(result.monthlySurplus).toBeNull();
        expect(result.allocatedSurplus).toBe(0);
        expect(result.warnings).toContain(
            'Current household spending is missing, so no implicit surplus was allocated.'
        );
    });

    test('does not invent surplus when detailed mode has zero spending', () => {
        const canonicalInput = normaliseCanonicalInput({
            income: { annualSalary: 120000 },
            cashflow: {
                hasDetailedExpenses: true,
                currentMonthlyTotalSpend: 0,
            },
        });

        const result = deriveHouseholdCashflow(canonicalInput);

        expect(result.canAllocateSurplus).toBe(false);
        expect(result.annualSurplus).toBeNull();
        expect(result.warnings).toContain(
            'Current household spending must be greater than zero before surplus can be allocated.'
        );
    });

    test('caps a custom split instead of creating money', () => {
        const canonicalInput = normaliseCanonicalInput({
            cashflow: {
                currentMonthlyIncome: 10000,
                currentMonthlyTotalSpend: 9000,
                surplusAllocationMode: 'custom_split',
                surplusToCashMonthly: 1000,
                surplusToStocksMonthly: 1000,
            },
        });

        const result = deriveHouseholdCashflow(canonicalInput);

        expect(result.allocatedSurplus).toBe(12000);
        expect(result.allocations.cash).toBe(6000);
        expect(result.allocations.stocks).toBe(6000);
        expect(result.unallocatedSurplus).toBe(0);
        expect(result.warnings).toContain(
            'Custom surplus allocations were capped at the available household surplus.'
        );
    });

    test('advanced-v2 adapter converts package-inclusive salary before cashflow tax', () => {
        const canonicalInput = adaptAdvancedV2Input({
            household: 'single',
            salary: 112000,
            salaryIncomeMode: 'package_including_super',
            employerRate: 12,
            applyMaxContributionBase: true,
        });

        expect(canonicalInput.income.annualSalary).toBeCloseTo(100000, 2);
        expect(canonicalInput.income.employerSuperAnnual).toBeCloseTo(12000, 2);
        expect(canonicalInput.income.salaryIncomeMode).toBe('gross');
    });

    test('super-first does not invent a partner concessional cap for a single household', () => {
        const canonicalInput = normaliseCanonicalInput({
            household: { householdType: 'single' },
            income: { employerSuperAnnual: 12000 },
            cashflow: {
                currentMonthlyIncome: 15000,
                currentMonthlyTotalSpend: 5000,
                surplusAllocationMode: 'super_first',
            },
        });

        const result = deriveHouseholdCashflow(canonicalInput);

        expect(result.allocations.super).toBe(18000);
        expect(result.superByMember).toEqual({ primary: 18000, partner: 0 });
        expect(result.allocations.stocks).toBe(102000);
    });

    test('engine bridge preserves legacy inputs unless usable detailed cashflow exists', () => {
        const canonicalInput = normaliseCanonicalInput({
            cashflow: { explicitMonthlyInvestmentContribution: 500 },
        });
        const derivedCashflow = deriveHouseholdCashflow(canonicalInput);
        const base = {
            monthlyStockContribution: 500,
            useDetailedExpenseInputs: false,
        };

        expect(applyCanonicalCashflowToEngineInputs(base, canonicalInput, derivedCashflow)).toEqual({
            ...base,
            canonicalInputSchemaVersion: 'calculator-input-v1',
        });
    });

    test('engine bridge carries the full derived cash surplus into an asset bucket', () => {
        const canonicalInput = normaliseCanonicalInput({
            cashflow: {
                currentMonthlyIncome: 20000,
                currentMonthlyTotalSpend: 7000,
                surplusAllocationMode: 'cash',
            },
        });
        const derivedCashflow = deriveHouseholdCashflow(canonicalInput);
        const engineInputs = applyCanonicalCashflowToEngineInputs(
            { monthlyStockContribution: 0 },
            canonicalInput,
            derivedCashflow
        );

        expect(engineInputs.annualCashSavingsContribution).toBe(156000);
        expect(engineInputs.derivedAnnualSurplus).toBe(156000);
        expect(engineInputs.monthlyStockContribution).toBe(0);
    });
});
