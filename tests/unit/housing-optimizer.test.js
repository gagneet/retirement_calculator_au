import { HousingOptimizer } from '../../src/js/housing-optimizer.js';

describe('HousingOptimizer downsizing transaction costs', () => {
    test('uses configured downsize transaction cost rate instead of the hard-coded default', () => {
        const optimizer = new HousingOptimizer(
            { age: 65, partnered: false },
            { homeValue: 1000000, downsizeTransactionCost: 0.10 }
        );

        const analysis = optimizer.analyzeDownsizing();

        expect(analysis.applicable).toBe(true);
        expect(analysis.transactionCosts).toBe(100000);
        expect(analysis.netProceeds).toBe(250000);
    });

    test('accepts display percentage values for compatibility with form inputs', () => {
        const optimizer = new HousingOptimizer(
            { age: 65, partnered: false },
            { homeValue: 1000000, downsizeTransactionCost: 10 }
        );

        expect(optimizer.analyzeDownsizing().transactionCosts).toBe(100000);
    });
});
