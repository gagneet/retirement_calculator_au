/**
 * tests/unit/canonical-schema.test.js
 *
 * Verifies that both Classic and V2 input structures are correctly
 * mapped to the same canonical retirement save format.
 */

import { buildCanonicalSaveData } from '../../src/js/calculation/save-data-schema.js';

describe('Canonical Save Data Schema', () => {

    test('should map Classic inputs to canonical format', () => {
        const classicInputs = {
            yourCurrentAge: 50,
            retirementAge: 65,
            yourSalary: 120000,
            yourCurrentSuper: 500000,
            inflation: 0.025,
            mortgageBalance: 300000,
            isCouple: false
        };

        const canonical = buildCanonicalSaveData(classicInputs);

        expect(canonical.yourCurrentAge).toBe(50);
        expect(canonical.retirementAge).toBe(65);
        expect(canonical.yourSalary).toBe(120000);
        expect(canonical.yourCurrentSuper).toBe(500000);
        expect(canonical.inflation).toBe(0.025);
        expect(canonical.mortgageBalance).toBe(300000);
        expect(canonical.isCouple).toBe(false);
        expect(canonical.isSingleCalculation).toBe(true);
    });

    test('should map old V2 short-name inputs to canonical format', () => {
        const oldV2Inputs = {
            age: 45,
            retireAge: 60,
            salary: 150000,
            superBal: 400000,
            inflation: 2.6, // display value
            mortgage: 250000,
            household: 'couple'
        };

        const canonical = buildCanonicalSaveData(oldV2Inputs);

        expect(canonical.yourCurrentAge).toBe(45);
        expect(canonical.retirementAge).toBe(60);
        expect(canonical.yourSalary).toBe(150000);
        expect(canonical.yourCurrentSuper).toBe(400000);
        expect(canonical.inflation).toBe(0.026); // converted to decimal
        expect(canonical.mortgageBalance).toBe(250000);
        expect(canonical.isCouple).toBe(true);
    });

    test('should handle percentage conversion safely', () => {
        // Test already decimal (default source is 'advanced' if no V2 fields)
        expect(buildCanonicalSaveData({ inflation: 0.03 }).inflation).toBe(0.03);

        // Test display value (explicitly marked as V2)
        expect(buildCanonicalSaveData({ inflation: 3.5 }, { source: 'advanced-v2' }).inflation).toBe(0.035);

        // Test zero
        expect(buildCanonicalSaveData({ inflation: 0 }, { source: 'advanced-v2' }).inflation).toBe(0);

        // Test edge case (1.0) -> 1%
        expect(buildCanonicalSaveData({ inflation: 1.0 }, { source: 'advanced-v2' }).inflation).toBe(0.01);

        // Test mixed (detected as V2 because of 'age')
        expect(buildCanonicalSaveData({ age: 50, inflation: 2.5 }).inflation).toBe(0.025);
    });

    test('should populate default objects if missing', () => {
        const minimal = { age: 50 };
        const canonical = buildCanonicalSaveData(minimal);

        expect(canonical.futurePropertyScenario).toBeDefined();
        expect(canonical.futurePropertyScenario.enabled).toBe(false);
        expect(canonical.inheritanceScenario).toBeDefined();
        expect(canonical.dependentDetails).toBeDefined();
    });

    test('should reconcile household flags', () => {
        expect(buildCanonicalSaveData({ household: 'couple' }).isCouple).toBe(true);
        expect(buildCanonicalSaveData({ household: 'single' }).isCouple).toBe(false);
        expect(buildCanonicalSaveData({ isCouple: true }).isSingleCalculation).toBe(false);
        expect(buildCanonicalSaveData({ hasPartner: 'true' }).isCouple).toBe(true);
    });
});
