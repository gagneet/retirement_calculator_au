// what-if-engine.js - What-If Interactive Engine
//
// Allows users to adjust key variables and see real-time impact on gap
//
// Features:
// - Real-time recalculation (< 50ms target)
// - Slider controls for key inputs
// - Visual feedback (progress bars, color coding)
// - Save/compare scenarios
// - "Best combination" suggestions

import CONSERVATIVE_ASSUMPTIONS from './config-conservative.js';
import OutcomeEngine from './outcome-engine.js';
import ActionGenerator from './action-generator.js';

/**
 * What-If Interactive Engine
 * Real-time scenario testing for retirement planning
 */
export class WhatIfEngine {
    /**
     * Initialize What-If engine
     * @param {Object} baseInputs - Original user inputs
     * @param {Object} baseOutcome - Original outcome results
     */
    constructor(baseInputs, baseOutcome) {
        this.baseInputs = baseInputs;
        this.baseOutcome = baseOutcome;
        this.scenarios = new Map();
        this.scenarioCounter = 0;
    }

    /**
     * Test: What if extra super contributions?
     * @param {number} monthlyExtra - Extra monthly super contribution
     * @returns {Object} Impact analysis
     */
    testExtraSuperContribution(monthlyExtra) {
        const yearsToGo = this.baseOutcome.yearsToRetirement;

        // Manual calculation for extra super (performance optimization)
        const rate = CONSERVATIVE_ASSUMPTIONS.SUPER_RETURN_BALANCED;
        const annualExtra = monthlyExtra * 12;

        // Future value of annuity
        const extraSuper = annualExtra * ((Math.pow(1 + rate, yearsToGo) - 1) / rate);

        // Apply conservative buffer
        const bufferedExtra = extraSuper * CONSERVATIVE_ASSUMPTIONS.RISK_BUFFERS.RETURN_BUFFER;

        // Extra income from 4% drawdown
        const extraIncome = bufferedExtra * 0.04;

        // Tax savings (salary sacrifice)
        const salary = this.baseInputs.annualSalary || 0;
        const marginalRate = this.estimateMarginalTaxRate(salary);
        const monthlyTaxSaving = monthlyExtra * ((marginalRate - 15) / 100);
        const netMonthlyCost = monthlyExtra - monthlyTaxSaving;

        const newGap = Math.max(0, this.baseOutcome.gap - extraIncome);

        return {
            type: 'SUPER_CONTRIBUTION',
            monthlyExtra,
            extraSuper: Math.round(bufferedExtra),
            extraIncome: Math.round(extraIncome),
            newGap: Math.round(newGap),
            gapReduction: Math.round(extraIncome),
            gapClosed: newGap === 0,
            percentClosed: this.baseOutcome.gap > 0 ?
                Math.round((extraIncome / this.baseOutcome.gap) * 100) : 0,
            netMonthlyCost: Math.round(netMonthlyCost),
            grossMonthlyCost: monthlyExtra,
            taxSavings: Math.round(monthlyTaxSaving * 12),
            performanceMs: 0 // Calculated instantly
        };
    }

    /**
     * Test: What if extra mortgage payments?
     * @param {number} monthlyExtra - Extra monthly mortgage payment
     * @returns {Object} Impact analysis
     */
    testExtraMortgagePayment(monthlyExtra) {
        const mortgage = this.baseOutcome.mortgageStatus;

        if (!mortgage.hasMortgage) {
            return {
                type: 'MORTGAGE_PAYMENT',
                notApplicable: true,
                message: 'No mortgage to accelerate'
            };
        }

        const rate = this.baseInputs.mortgageRate || CONSERVATIVE_ASSUMPTIONS.MORTGAGE_RATE;
        const monthlyRate = rate / 12;
        const currentPayment = mortgage.monthlyPayment;
        const newPayment = currentPayment + monthlyExtra;
        const balance = mortgage.currentBalance;

        // Calculate new payoff time
        const monthsToPayoff = monthlyExtra > 0 ?
            -Math.log(1 - (balance * monthlyRate) / newPayment) / Math.log(1 + monthlyRate) : 999;

        const yearsToPayoff = monthsToPayoff / 12;
        const yearsEarlier = mortgage.yearsRemaining - yearsToPayoff;

        // Interest saved
        const originalTotalPaid = currentPayment * mortgage.yearsRemaining * 12;
        const originalInterest = originalTotalPaid - balance;
        const newTotalPaid = newPayment * monthsToPayoff;
        const newInterest = Math.max(0, newTotalPaid - balance);
        const interestSaved = originalInterest - newInterest;

        // Will it be paid off by retirement?
        const yearsToRetirement = this.baseOutcome.yearsToRetirement;
        const paidOffByRetirement = yearsToPayoff <= yearsToRetirement;

        // Impact on gap (if paid off before retirement, mortgage payment freed up)
        const impactOnGap = paidOffByRetirement ? (currentPayment * 12) : 0;
        const newGap = Math.max(0, this.baseOutcome.gap - impactOnGap);

        return {
            type: 'MORTGAGE_PAYMENT',
            monthlyExtra,
            newMonthlyPayment: Math.round(newPayment),
            yearsToPayoff: Math.round(yearsToPayoff * 10) / 10,
            yearsEarlier: Math.round(yearsEarlier * 10) / 10,
            interestSaved: Math.round(interestSaved),
            paidOffByRetirement,
            impactOnGap: Math.round(impactOnGap),
            newGap: Math.round(newGap),
            gapClosed: paidOffByRetirement && newGap === 0,
            percentClosed: paidOffByRetirement && this.baseOutcome.gap > 0 ?
                Math.round((impactOnGap / this.baseOutcome.gap) * 100) : 0,
            performanceMs: 0
        };
    }

    /**
     * Test: What if retire later?
     * @param {number} extraYears - Extra years to work
     * @returns {Object} Impact analysis
     */
    testDelayRetirement(extraYears) {
        const currentAge = this.baseInputs.currentAge;
        const newRetirementAge = this.baseInputs.retirementAge + extraYears;
        const salary = this.baseInputs.annualSalary || 0;

        // Extra super from working longer
        const annualSuperContribution = salary * CONSERVATIVE_ASSUMPTIONS.SUPER_GUARANTEE_RATE;

        // Growth calculation
        const rate = CONSERVATIVE_ASSUMPTIONS.SUPER_RETURN_BALANCED;
        const extraSuper = annualSuperContribution * extraYears *
            Math.pow(1 + rate, extraYears / 2);

        // Apply conservative buffer
        const bufferedExtra = extraSuper * CONSERVATIVE_ASSUMPTIONS.RISK_BUFFERS.RETURN_BUFFER;

        const extraIncome = bufferedExtra * 0.04;
        const newGap = Math.max(0, this.baseOutcome.gap - extraIncome);

        return {
            type: 'DELAY_RETIREMENT',
            extraYears,
            newRetirementAge,
            extraSuper: Math.round(bufferedExtra),
            extraIncome: Math.round(extraIncome),
            newGap: Math.round(newGap),
            gapClosed: newGap === 0,
            percentClosed: this.baseOutcome.gap > 0 ?
                Math.round((extraIncome / this.baseOutcome.gap) * 100) : 0,
            annualContribution: Math.round(annualSuperContribution),
            performanceMs: 0
        };
    }

    /**
     * Test: What if reduce expenses?
     * @param {number} annualReduction - Annual expense reduction
     * @returns {Object} Impact analysis
     */
    testExpenseReduction(annualReduction) {
        // Directly reduces target income (or increases surplus)
        const newTarget = this.baseOutcome.targetIncome - annualReduction;
        const newGap = Math.max(0, newTarget - this.baseOutcome.sustainableIncome);

        return {
            type: 'EXPENSE_REDUCTION',
            annualReduction,
            monthlyReduction: Math.round(annualReduction / 12),
            weeklyReduction: Math.round(annualReduction / 52),
            newTarget: Math.round(newTarget),
            newGap: Math.round(newGap),
            gapClosed: newGap === 0,
            percentClosed: this.baseOutcome.gap > 0 ?
                Math.round((annualReduction / this.baseOutcome.gap) * 100) : 0,
            performanceMs: 0
        };
    }

    /**
     * Test: What if increase savings?
     * @param {number} monthlyExtra - Extra monthly savings
     * @returns {Object} Impact analysis
     */
    testExtraSavings(monthlyExtra) {
        const yearsToGo = this.baseOutcome.yearsToRetirement;

        // Calculate growth (taxable, so lower returns)
        const rate = CONSERVATIVE_ASSUMPTIONS.INVESTMENT_RETURN;
        const annualExtra = monthlyExtra * 12;

        const extraSavings = annualExtra * ((Math.pow(1 + rate, yearsToGo) - 1) / rate);

        // After-tax income (assume 30% tax on earnings)
        const afterTaxIncome = extraSavings * 0.04 * 0.70;

        const newGap = Math.max(0, this.baseOutcome.gap - afterTaxIncome);

        return {
            type: 'EXTRA_SAVINGS',
            monthlyExtra,
            extraSavings: Math.round(extraSavings),
            afterTaxIncome: Math.round(afterTaxIncome),
            newGap: Math.round(newGap),
            gapReduction: Math.round(afterTaxIncome),
            gapClosed: newGap === 0,
            percentClosed: this.baseOutcome.gap > 0 ?
                Math.round((afterTaxIncome / this.baseOutcome.gap) * 100) : 0,
            performanceMs: 0
        };
    }

    /**
     * Test combination of multiple strategies
     * @param {Object} strategies - Object with strategy types and values
     * @returns {Object} Combined impact analysis
     */
    testCombination(strategies) {
        const startTime = performance.now();

        let cumulativeImpact = 0;
        let cumulativeMonthlyCost = 0;
        const results = {};

        // Test each strategy
        if (strategies.extraSuper) {
            const result = this.testExtraSuperContribution(strategies.extraSuper);
            cumulativeImpact += result.gapReduction;
            cumulativeMonthlyCost += result.netMonthlyCost;
            results.extraSuper = result;
        }

        if (strategies.extraMortgage) {
            const result = this.testExtraMortgagePayment(strategies.extraMortgage);
            if (!result.notApplicable) {
                cumulativeImpact += result.impactOnGap;
                cumulativeMonthlyCost += strategies.extraMortgage;
                results.extraMortgage = result;
            }
        }

        if (strategies.delayYears) {
            const result = this.testDelayRetirement(strategies.delayYears);
            cumulativeImpact += result.extraIncome;
            results.delayRetirement = result;
        }

        if (strategies.reduceExpenses) {
            const result = this.testExpenseReduction(strategies.reduceExpenses);
            cumulativeImpact += strategies.reduceExpenses;
            results.expenseReduction = result;
        }

        if (strategies.extraSavings) {
            const result = this.testExtraSavings(strategies.extraSavings);
            cumulativeImpact += result.gapReduction;
            cumulativeMonthlyCost += strategies.extraSavings;
            results.extraSavings = result;
        }

        const newGap = Math.max(0, this.baseOutcome.gap - cumulativeImpact);
        const newIncome = this.baseOutcome.sustainableIncome + cumulativeImpact;

        const endTime = performance.now();

        return {
            type: 'COMBINATION',
            strategies: results,
            combinedImpact: Math.round(cumulativeImpact),
            monthlyCost: Math.round(cumulativeMonthlyCost),
            newGap: Math.round(newGap),
            newProjectedIncome: Math.round(newIncome),
            gapClosed: newGap === 0,
            surplus: newGap === 0 ? Math.round(cumulativeImpact - this.baseOutcome.gap) : 0,
            percentClosed: this.baseOutcome.gap > 0 ?
                Math.round((cumulativeImpact / this.baseOutcome.gap) * 100) : 0,
            performanceMs: Math.round(endTime - startTime)
        };
    }

    /**
     * Find best combination automatically
     * Returns optimal mix to close gap with minimum effort
     * @returns {Object} Best combination recommendation
     */
    findBestCombination() {
        const gap = this.baseOutcome.gap;

        if (gap <= 0) {
            return {
                alreadyOnTrack: true,
                message: 'Already on track - no gap to close'
            };
        }

        const combinations = [];
        const salary = this.baseInputs.annualSalary || 0;
        const hasMortgage = this.baseOutcome.mortgageStatus.hasMortgage;
        const yearsToGo = this.baseOutcome.yearsToRetirement;

        // Combo 1: Super + Mortgage (if applicable)
        if (salary >= 40000 && hasMortgage && !this.baseOutcome.mortgageStatus.paidOffByRetirement) {
            const superNeeded = this.calculateSuperNeeded(gap * 0.4);
            const mortgageNeeded = this.calculateMortgageExtra(gap * 0.4);

            if (superNeeded && mortgageNeeded) {
                const result = this.testCombination({
                    extraSuper: superNeeded,
                    extraMortgage: mortgageNeeded
                });

                combinations.push({
                    name: 'Super + Mortgage Acceleration',
                    strategies: {
                        extraSuper: superNeeded,
                        extraMortgage: mortgageNeeded
                    },
                    result,
                    score: 100 - (result.monthlyCost / 100) // Lower monthly cost = higher score
                });
            }
        }

        // Combo 2: Super + Delay 1 year
        if (salary >= 40000 && yearsToGo > 5) {
            const superNeeded = this.calculateSuperNeeded(gap * 0.5);

            const result = this.testCombination({
                extraSuper: superNeeded,
                delayYears: 1
            });

            combinations.push({
                name: 'Super Increase + Work 1 Extra Year',
                strategies: {
                    extraSuper: superNeeded,
                    delayYears: 1
                },
                result,
                score: 90 - (result.monthlyCost / 100)
            });
        }

        // Combo 3: Expense reduction + Savings
        if (gap < 20000) {
            const expenseReduction = Math.min(gap * 0.6, 10000);
            const savingsNeeded = this.calculateSavingsNeeded(gap * 0.4);

            const result = this.testCombination({
                reduceExpenses: expenseReduction,
                extraSavings: savingsNeeded
            });

            combinations.push({
                name: 'Reduce Expenses + Increase Savings',
                strategies: {
                    reduceExpenses: expenseReduction,
                    extraSavings: savingsNeeded
                },
                result,
                score: 85 - (result.monthlyCost / 100)
            });
        }

        // Sort by score (higher is better)
        combinations.sort((a, b) => b.score - a.score);

        if (combinations.length === 0) {
            return {
                noCombinationsFound: true,
                message: 'Consider working with a financial planner for personalized strategies'
            };
        }

        return {
            recommended: combinations[0],
            alternatives: combinations.slice(1, 3)
        };
    }

    /**
     * Save scenario for comparison
     * @param {string} name - Scenario name
     * @param {Object} result - Test result
     * @returns {string} Scenario ID
     */
    saveScenario(name, result) {
        const scenarioId = `scenario-${++this.scenarioCounter}`;
        this.scenarios.set(scenarioId, {
            id: scenarioId,
            name,
            result,
            timestamp: new Date()
        });
        return scenarioId;
    }

    /**
     * Compare multiple scenarios
     * @param {Array<string>} scenarioIds - Array of scenario IDs
     * @returns {Object} Comparison data
     */
    compareScenarios(scenarioIds) {
        const scenarios = scenarioIds.map(id => this.scenarios.get(id)).filter(s => s);

        if (scenarios.length === 0) {
            return {
                error: 'No scenarios to compare'
            };
        }

        // Find best scenario
        const best = scenarios.reduce((best, current) => {
            if (!best) return current;
            return current.result.gapClosed && (!best.result.gapClosed ||
                current.result.monthlyCost < best.result.monthlyCost) ? current : best;
        }, null);

        return {
            scenarios: scenarios.map(s => ({
                id: s.id,
                name: s.name,
                gapClosed: s.result.gapClosed,
                newGap: s.result.newGap,
                monthlyCost: s.result.monthlyCost || 0,
                percentClosed: s.result.percentClosed
            })),
            best: {
                id: best.id,
                name: best.name
            }
        };
    }

    // Helper methods

    calculateSuperNeeded(targetImpact) {
        const years = this.baseOutcome.yearsToRetirement;
        const superNeeded = targetImpact / 0.04;
        const monthlyContribution = (superNeeded / years) / 12;
        return Math.ceil(Math.max(50, monthlyContribution) / 50) * 50;
    }

    calculateMortgageExtra(targetImpact) {
        if (!this.baseOutcome.mortgageStatus.hasMortgage) {
            return null;
        }
        const years = this.baseOutcome.yearsToRetirement;
        const monthlyExtra = (targetImpact / years) / 12;
        return Math.ceil(Math.max(50, monthlyExtra) / 50) * 50;
    }

    calculateSavingsNeeded(targetImpact) {
        const years = this.baseOutcome.yearsToRetirement;
        const savingsNeeded = targetImpact / (0.04 * 0.70); // After tax
        const monthlyContribution = (savingsNeeded / years) / 12;
        return Math.ceil(Math.max(100, monthlyContribution) / 50) * 50;
    }

    estimateMarginalTaxRate(income) {
        const brackets = CONSERVATIVE_ASSUMPTIONS.TAX_BRACKETS;

        for (const bracket of brackets) {
            if (income >= bracket.min && income <= bracket.max) {
                return bracket.rate * 100;
            }
        }

        return 45; // Top rate
    }
}

/**
 * Quick helper function to test a single strategy
 * @param {Object} baseInputs - Base user inputs
 * @param {Object} baseOutcome - Base outcome results
 * @param {string} strategyType - Type of strategy to test
 * @param {number} value - Strategy value
 * @returns {Object} Test result
 */
export function testStrategy(baseInputs, baseOutcome, strategyType, value) {
    const engine = new WhatIfEngine(baseInputs, baseOutcome);

    switch (strategyType) {
        case 'extraSuper':
            return engine.testExtraSuperContribution(value);
        case 'extraMortgage':
            return engine.testExtraMortgagePayment(value);
        case 'delayRetirement':
            return engine.testDelayRetirement(value);
        case 'reduceExpenses':
            return engine.testExpenseReduction(value);
        case 'extraSavings':
            return engine.testExtraSavings(value);
        default:
            throw new Error(`Unknown strategy type: ${strategyType}`);
    }
}

/**
 * Usage in UI:
 *
 * ```javascript
 * const whatIf = new WhatIfEngine(userInputs, outcomeResults);
 *
 * // User adjusts slider: Extra super $200/month
 * const result = whatIf.testExtraSuperContribution(200);
 * updateUI(result); // Shows new gap in real-time
 *
 * // User selects multiple strategies
 * const combo = whatIf.testCombination({
 *     extraSuper: 300,
 *     extraMortgage: 400
 * });
 * updateUI(combo); // Shows combined impact
 *
 * // Get best recommendation
 * const best = whatIf.findBestCombination();
 * showRecommendation(best);
 *
 * // Save and compare scenarios
 * const id1 = whatIf.saveScenario('Conservative', result1);
 * const id2 = whatIf.saveScenario('Aggressive', result2);
 * const comparison = whatIf.compareScenarios([id1, id2]);
 * ```
 */

export default WhatIfEngine;
