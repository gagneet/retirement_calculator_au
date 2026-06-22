/**
 * reconciliation.test.js
 * 
 * Regression oracle test to ensure engine projections (super-at-retirement and 
 * total-assets-at-retirement) stay within a tolerance band of a closed-form 
 * independent accumulation.
 */

import RetirementSimulator from '../../src/js/simulator.js';
import { ENHANCED_CONFIG } from '../../src/js/config.js';

const simulator = new RetirementSimulator(ENHANCED_CONFIG);

/**
 * Independent Oracle - Closed-form accumulation logic.
 * Accounts for:
 * - Compounded growth (nominal)
 * - Employer SG (12%)
 * - Salary sacrifice (voluntary)
 * - 15% contributions tax
 * - Concessional cap ($30,000)
 * - Reduced income age steps
 * - One-off annuity purchase (lump sum deduction from super)
 */
function runOracle({
    startSuper,
    salary,
    growthRate,
    years,
    startAge,
    reducedIncomeAge,
    reducedSalary,
    voluntaryContrib = 0,
    annuityPurchaseAge = null,
    annuityLumpSum = 0,
    inflation = 0.026
}) {
    let balance = startSuper;
    const sgRate = 0.12;
    const taxRate = 0.15;
    const concessionalCap = 30000;

    for (let y = 1; y <= years; y++) {
        const currentAge = startAge + y - 1;
        
        // 1. Apply growth (start of year)
        balance *= (1 + growthRate);

        // 2. Handle annuity purchase (one-off lump sum deduction)
        if (annuityPurchaseAge !== null && currentAge === annuityPurchaseAge) {
            // annuityLumpSum is in today's dollars in the JSON, but when buying 
            // at age 67 it is inflated.
            const inflatedAnnuity = annuityLumpSum * Math.pow(1 + inflation, y - 1);
            balance -= inflatedAnnuity;
        }

        // 3. Determine salary for the year
        let currentSalary = (reducedIncomeAge && currentAge >= reducedIncomeAge)
            ? reducedSalary
            : salary;
        
        // Oracle uses simple inflation for salary growth (nominal)
        currentSalary *= Math.pow(1 + inflation, y - 1);

        // 4. Calculate contributions
        const employerSG = Math.min(currentSalary * sgRate, 30000); // simplified cap
        const sacrifice = Math.min(voluntaryContrib, Math.max(0, concessionalCap - employerSG));
        const totalConcessional = employerSG + sacrifice;
        
        // 5. Apply contributions tax and add to balance
        const netContrib = totalConcessional * (1 - taxRate);
        balance += netContrib;
    }
    
    return balance;
}

describe('Engine Reconciliation vs Oracle', () => {
    
    // Case 1: The Audit JSON Scenario (Complex)
    // - Reduced income at 58
    // - Annuity purchase at 67
    // - Couple
    // - High returns
    test('Audit JSON Scenario: Engine stays within 10% of Oracle', () => {
        const inputs = {
            household: 'couple',
            age: 49,
            retireAge: 71,
            lifespan: 102,
            salary: 235158,
            partnerSalary: 41220,
            superBal: 336330,
            partnerSuperBal: 15120,
            inflation: 2.58,
            superGrowth: 8.32,
            invReturn: 4.45,
            reducedIncomeEnabled: true,
            reducedIncomeAge: 58,
            reducedIncomeSalary: 168000,
            partnerReducedIncomeAge: 62,
            partnerReducedIncomeSalary: 38000,
            partnerSalarySacrifice: 2000,
            enableAnnuity: true,
            annuityPurchaseAge: 67,
            annuityLumpSum: 200000,
            scenarioMode: 'base', // PINNED to base for stability
            mcRuns: 0 // deterministic
        };

        const result = simulator.simulateRetirement(inputs, false);
        
        // Oracle for Person 1
        const oracle1 = runOracle({
            startSuper: 336330,
            salary: 235158,
            growthRate: 0.0832,
            years: 22,
            startAge: 49,
            reducedIncomeAge: 58,
            reducedSalary: 168000,
            annuityPurchaseAge: 67,
            annuityLumpSum: 200000,
            inflation: 0.0258
        });

        // Oracle for Person 2
        const oracle2 = runOracle({
            startSuper: 15120,
            salary: 41220,
            growthRate: 0.0832,
            years: 22,
            startAge: 47, // his-49 is her-47
            reducedIncomeAge: 62,
            reducedSalary: 38000,
            voluntaryContrib: 2000,
            inflation: 0.0258
        });

        const combinedOracleSuper = oracle1 + oracle2;
        const engineSuper = result.accumulatedSuperBalance;

        const diffPct = Math.abs(engineSuper - combinedOracleSuper) / combinedOracleSuper;
        
        console.log(`[Audit Scenario] Oracle: $${combinedOracleSuper.toLocaleString()}, Engine: $${engineSuper.toLocaleString()}, Diff: ${(diffPct * 100).toFixed(2)}%`);
        
        // Current engine is known to be ~50% high, so this will FAIL until fixed.
        expect(diffPct).toBeLessThan(0.10);
    });

    // Case 2: Clean Baseline Persona (Simple)
    // - No reduced income
    // - No annuity
    // - Single
    // - Standard returns
    test('Baseline Persona: Engine stays within 5% of Oracle', () => {
        const inputs = {
            household: 'single',
            age: 45,
            retireAge: 65,
            lifespan: 90,
            salary: 100000,
            superBal: 150000,
            inflation: 2.5,
            superGrowth: 7.5,
            invReturn: 7.5,
            scenarioMode: 'base',
            mcRuns: 0
        };

        const result = simulator.simulateRetirement(inputs, false);
        
        const oracle = runOracle({
            startSuper: 150000,
            salary: 100000,
            growthRate: 0.075,
            years: 20,
            startAge: 45,
            inflation: 0.025
        });

        const engineSuper = result.accumulatedSuperBalance;
        const diffPct = Math.abs(engineSuper - oracle) / oracle;

        console.log(`[Baseline Scenario] Oracle: $${oracle.toLocaleString()}, Engine: $${engineSuper.toLocaleString()}, Diff: ${(diffPct * 100).toFixed(2)}%`);
        
        expect(diffPct).toBeLessThan(0.05);
    });
});
