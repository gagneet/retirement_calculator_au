import { calculateAgePensionForCouple, calculateDeemedIncome } from '../../src/js/utils.js';

describe('calculateAgePensionForCouple deeming integration', () => {
    test('does not double count deemed income when financial assets are provided', () => {
        const financialAssetsPerPerson = 200000;
        const combinedFinancialAssets = financialAssetsPerPerson * 2;
        const deemedIncome = calculateDeemedIncome(combinedFinancialAssets, true);

        const result = calculateAgePensionForCouple(
            {
                age: 67,
                super: financialAssetsPerPerson,
                investments: 0,
                salary: 0,
                otherIncome: 5000,
                financialAssets: financialAssetsPerPerson
            },
            {
                age: 67,
                super: financialAssetsPerPerson,
                investments: 0,
                salary: 0,
                otherIncome: 5000,
                financialAssets: financialAssetsPerPerson
            },
            true,
            {}
        );

        expect(result.eligible).toBe(true);
        expect(result.combinedAssessment.income).toBeCloseTo(10000 + deemedIncome, 2);
    });
});
