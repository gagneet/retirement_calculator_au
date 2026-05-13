// action-generator.js - Action Generator for Outcome-Based Suggestions
//
// Generates 3-5 specific, prioritized actions to close retirement gap.
// Each action includes:
// - Specific dollar amounts
// - Impact on gap
// - How to implement
// - Net cost (after tax benefits)
// - Priority level (HIGH/MEDIUM/LOW)
//
// Philosophy: Specific and actionable, not vague advice.

import CONSERVATIVE_ASSUMPTIONS from './config-conservative.js';
import OutcomeEngine from './outcome-engine.js';

/**
 * Action Generator - Outcome-Based Suggestions
 * Generates specific, prioritized actions to close retirement gaps
 */
export class ActionGenerator {
    /**
     * Initialize action generator
     * @param {Object} userInputs - Original user inputs
     * @param {Object} outcomeResults - Results from OutcomeEngine
     */
    constructor(userInputs, outcomeResults) {
        // Normalise field names — the main calculator uses yourSalary/yourCurrentAge;
        // legacy action methods reference annualSalary/currentAge/ownsHome/hasPartner.
        this.inputs = {
            ...userInputs,
            annualSalary: userInputs.annualSalary ?? userInputs.yourSalary ?? 0,
            currentAge:   userInputs.currentAge   ?? userInputs.yourCurrentAge ?? 0,
            ownsHome:     userInputs.ownsHome      ?? (userInputs.homeValue || 0) > 0,
            hasPartner:   userInputs.hasPartner    ?? !(userInputs.isSingleCalculation ?? true),
        };
        this.outcome = outcomeResults;
        this.actions = [];
    }

    toTodayDollars(futureValue) {
        const factor = this.outcome.inflationFactor || 1;
        return futureValue / factor;
    }

    /**
     * Generate all applicable actions
     * Returns: Array of action objects, prioritized
     *
     * @returns {Array} Array of prioritized actions
     */
    generateActions() {
        this.actions = [];

        // If no gap or surplus, generate optimization actions
        if (this.outcome.gap <= 0 || this.outcome.status !== 'SHORTFALL') {
            return this.generateOnTrackActions();
        }

        // Generate possible actions to close the gap
        this.considerSuperIncreaseAction();
        this.considerMortgageAccelerationAction();
        this.considerDelayRetirementAction();
        this.considerPartTimeTransitionAction();
        this.considerExpenseReductionAction();
        this.considerDownsizingAction();
        this.considerExtraSavingsAction();

        // Sort by priority (HIGH > MEDIUM > LOW) and impact
        this.actions.sort((a, b) => {
            const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
            if (a.priority !== b.priority) {
                return priorityOrder[b.priority] - priorityOrder[a.priority];
            }
            return b.impactOnGap - a.impactOnGap;
        });

        // Return top 5 actions
        return this.actions.slice(0, 5);
    }

    /**
     * ACTION 1: Increase superannuation contributions
     * High priority if: Have income, gap exists, years to retirement > 5
     */
    considerSuperIncreaseAction() {
        const salary = this.inputs.annualSalary || 0;
        const yearsToGo = this.outcome.yearsToRetirement;
        const gap = this.outcome.gap;

        if (salary < 30000 || yearsToGo < 5) {
            return; // Not applicable
        }

        // Calculate how much extra per month needed to close 50-60% of gap
        const superNeeded = (gap * 0.55) / 0.04; // 55% of gap / 4% drawdown
        const monthlyExtra = (superNeeded / yearsToGo) / 12;

        // Round to nice number ($50 increments)
        const suggestedMonthly = Math.ceil(monthlyExtra / 50) * 50;

        // Limit to reasonable amount (10% of monthly salary)
        const maxMonthly = (salary / 12) * 0.10;
        const finalSuggested = Math.min(suggestedMonthly, maxMonthly);

        if (finalSuggested < 50) return; // Too small to bother

        // Tax savings (salary sacrifice taxed at 15% vs. marginal rate)
        const marginalRate = this.estimateMarginalTaxRate(salary);
        const taxSaving = finalSuggested * ((marginalRate - 15) / 100);
        const netCost = finalSuggested - taxSaving;

        // Calculate impact
        const totalExtra = finalSuggested * 12 * yearsToGo;
        const grown = totalExtra * Math.pow(
            1 + CONSERVATIVE_ASSUMPTIONS.SUPER_RETURN_BALANCED,
            yearsToGo / 2 // Average growth period
        );
        const annualIncomeBoost = this.toTodayDollars(grown * 0.04);

        this.actions.push({
            id: 'SUPER_INCREASE',
            priority: 'HIGH',
            title: `Increase Super by $${finalSuggested}/month`,
            shortTitle: `+$${finalSuggested}/mo Super`,
            description: `Salary sacrifice extra $${finalSuggested}/month into superannuation`,
            impactOnGap: Math.round(annualIncomeBoost),
            netCost: Math.round(netCost),
            grossCost: finalSuggested,
            taxSavings: Math.round(taxSaving * 12),
            howToImplement: [
                {
                    step: 1,
                    action: `Contact your payroll/HR department`,
                    detail: `Request salary sacrifice arrangement`
                },
                {
                    step: 2,
                    action: `Set up salary sacrifice for $${finalSuggested}/month`,
                    detail: `You'll be taxed at 15% instead of ${marginalRate}%`
                },
                {
                    step: 3,
                    action: `Net cost to you: Only $${Math.round(netCost)}/month after tax savings`,
                    detail: `That's a ${Math.round((taxSaving / finalSuggested) * 100)}% tax saving!`
                },
                {
                    step: 4,
                    action: `Benefit: Adds $${Math.round(grown).toLocaleString()} to super by retirement`,
                    detail: `Generates $${Math.round(annualIncomeBoost).toLocaleString()}/year in retirement`
                }
            ],
            calculations: {
                monthlyContribution: finalSuggested,
                yearsContributing: yearsToGo,
                totalContributed: Math.round(finalSuggested * 12 * yearsToGo),
                grownTo: Math.round(grown),
                annualIncomeBoost: Math.round(annualIncomeBoost),
                taxSavingPercent: Math.round((taxSaving / finalSuggested) * 100)
            },
            effort: 'easy',
            timeToImplement: '1-2 weeks'
        });
    }

    /**
     * ACTION 2: Accelerate mortgage payoff
     * High priority if: Have mortgage, would be paid off near/after retirement
     */
    considerMortgageAccelerationAction() {
        const mortgage = this.outcome.mortgageStatus;

        if (!mortgage.hasMortgage || mortgage.paidOffByRetirement) {
            return; // Not applicable
        }

        const yearsToRetirement = this.outcome.yearsToRetirement;
        const currentBalance = mortgage.currentBalance;
        const currentPayment = mortgage.monthlyPayment;
        const rate = this.inputs.mortgageRate || CONSERVATIVE_ASSUMPTIONS.MORTGAGE_RATE;

        // Calculate extra payment needed to pay off before retirement
        const monthsToRetirement = yearsToRetirement * 12;
        const monthlyRate = rate / 12;

        const targetPayment = (currentBalance * monthlyRate) /
            (1 - Math.pow(1 + monthlyRate, -monthsToRetirement));

        const extraMonthly = Math.ceil((targetPayment - currentPayment) / 50) * 50;

        if (extraMonthly < 50) return; // Already close to paying off

        // Calculate interest saved
        const originalMonths = mortgage.yearsRemaining * 12;
        const originalTotalPaid = currentPayment * originalMonths;
        const originalInterest = originalTotalPaid - currentBalance;

        const newTotalPaid = targetPayment * monthsToRetirement;
        const newInterest = newTotalPaid - currentBalance;
        const interestSaved = originalInterest - newInterest;

        // Impact: Monthly payment freed up at retirement
        const freedCashFlow = currentPayment * 12;

        this.actions.push({
            id: 'MORTGAGE_ACCELERATION',
            priority: 'HIGH',
            title: `Pay Extra $${extraMonthly}/month on Mortgage`,
            shortTitle: `+$${extraMonthly}/mo Mortgage`,
            description: `Increase mortgage payments to be debt-free by retirement`,
            impactOnGap: Math.round(freedCashFlow),
            netCost: extraMonthly,
            grossCost: extraMonthly,
            taxSavings: 0,
            howToImplement: [
                {
                    step: 1,
                    action: `Set up automatic extra payment of $${extraMonthly}/month`,
                    detail: `Contact your lender or adjust online banking`
                },
                {
                    step: 2,
                    action: `Mortgage paid off by age ${this.inputs.retirementAge}`,
                    detail: `${Math.round(yearsToRetirement - mortgage.yearsRemaining)} years earlier than current schedule`
                },
                {
                    step: 3,
                    action: `Save $${Math.round(interestSaved).toLocaleString()} in interest`,
                    detail: `That's money saved that can grow in your super or savings`
                },
                {
                    step: 4,
                    action: `At retirement: No mortgage = $${Math.round(freedCashFlow).toLocaleString()}/year freed up`,
                    detail: `Equivalent to having $${Math.round(freedCashFlow / 0.04).toLocaleString()} more in super!`
                }
            ],
            calculations: {
                extraMonthly,
                interestSaved: Math.round(interestSaved),
                yearsEarlier: Math.round((mortgage.yearsRemaining - yearsToRetirement) * 10) / 10,
                freedCashFlow: Math.round(freedCashFlow),
                equivalentSuper: Math.round(freedCashFlow / 0.04)
            },
            effort: 'easy',
            timeToImplement: '1 week'
        });
    }

    /**
     * ACTION 3: Delay retirement
     * Medium priority if: Gap is significant (>$10k/year)
     */
    considerDelayRetirementAction() {
        const gap = this.outcome.gap;
        const salary = this.inputs.annualSalary || 0;
        const currentRetirementAge = this.inputs.retirementAge;

        if (gap < 10000 || salary < 30000 || currentRetirementAge >= 70) {
            return; // Not applicable
        }

        // Calculate how many extra years needed
        const annualSuperContribution = salary * CONSERVATIVE_ASSUMPTIONS.SUPER_GUARANTEE_RATE;
        const extraYearsNeeded = Math.ceil(
            gap / (annualSuperContribution * 0.04 * 1.5) // Conservative estimate with growth
        );

        const cappedExtraYears = Math.min(extraYearsNeeded, 3); // Cap at 3 years
        const newRetirementAge = currentRetirementAge + cappedExtraYears;

        if (newRetirementAge > 75) return; // Too late

        // Calculate total impact
        const extraSuper = annualSuperContribution * cappedExtraYears *
            Math.pow(1 + CONSERVATIVE_ASSUMPTIONS.SUPER_RETURN_BALANCED, cappedExtraYears / 2);

        const incomeBoost = this.toTodayDollars(extraSuper * 0.04);

        this.actions.push({
            id: 'DELAY_RETIREMENT',
            priority: cappedExtraYears <= 1 ? 'MEDIUM' : 'LOW',
            title: `Work ${cappedExtraYears} Extra ${cappedExtraYears === 1 ? 'Year' : 'Years'}`,
            shortTitle: `Retire at ${newRetirementAge}`,
            description: `Retire at age ${newRetirementAge} instead of ${currentRetirementAge}`,
            impactOnGap: Math.round(incomeBoost),
            netCost: 0, // Actually earning, not costing
            grossCost: 0,
            taxSavings: 0,
            howToImplement: [
                {
                    step: 1,
                    action: `Plan to work until age ${newRetirementAge}`,
                    detail: `${cappedExtraYears} extra ${cappedExtraYears === 1 ? 'year' : 'years'} of contributions`
                },
                {
                    step: 2,
                    action: `Each extra year adds $${Math.round(annualSuperContribution).toLocaleString()} to super`,
                    detail: `Total ${cappedExtraYears} ${cappedExtraYears === 1 ? 'year' : 'years'} = $${Math.round(extraSuper).toLocaleString()} more at retirement`
                },
                {
                    step: 3,
                    action: `Higher Age Pension at ${newRetirementAge}`,
                    detail: `More time for assets to grow, better pension eligibility`
                },
                {
                    step: 4,
                    action: `Alternative: Consider part-time transition (see other suggestion)`,
                    detail: `Gradual transition may be more appealing than full-time work`
                }
            ],
            calculations: {
                extraYears: cappedExtraYears,
                newRetirementAge,
                extraSuper: Math.round(extraSuper),
                incomeBoost: Math.round(incomeBoost),
                annualContribution: Math.round(annualSuperContribution)
            },
            effort: 'moderate',
            timeToImplement: 'ongoing'
        });
    }

    /**
     * ACTION 4: Part-time transition to retirement
     * Medium priority if: Gap exists, close to retirement (5-15 years)
     */
    considerPartTimeTransitionAction() {
        const yearsToGo = this.outcome.yearsToRetirement;
        const salary = this.inputs.annualSalary || 0;
        const currentAge = this.inputs.currentAge;

        if (yearsToGo > 15 || yearsToGo < 3 || salary < 40000 || currentAge < 55) {
            return; // Not applicable
        }

        // Suggest 3-day/week work for extended period
        const partTimeSalary = salary * 0.6; // 3 days = 60%
        const partTimeYears = Math.min(5, Math.max(3, yearsToGo - 2));
        const partTimeSuper = partTimeSalary * CONSERVATIVE_ASSUMPTIONS.SUPER_GUARANTEE_RATE * partTimeYears;

        const grown = partTimeSuper * Math.pow(
            1 + CONSERVATIVE_ASSUMPTIONS.SUPER_RETURN_BALANCED,
            partTimeYears / 2
        );

        const incomeBoost = this.toTodayDollars(grown * 0.04);

        const transitionStartAge = this.inputs.retirementAge - partTimeYears;

        this.actions.push({
            id: 'PART_TIME_TRANSITION',
            priority: 'MEDIUM',
            title: `Transition to Part-Time Work`,
            shortTitle: `Part-time (3 days/wk)`,
            description: `Work 3 days/week for ${partTimeYears} years before full retirement`,
            impactOnGap: Math.round(incomeBoost),
            netCost: 0,
            grossCost: 0,
            taxSavings: 0,
            howToImplement: [
                {
                    step: 1,
                    action: `Negotiate with employer to reduce to 3 days/week`,
                    detail: `Start transition at age ${transitionStartAge}`
                },
                {
                    step: 2,
                    action: `Maintain super contributions for ${partTimeYears} more years`,
                    detail: `Part-time salary: ~$${Math.round(partTimeSalary).toLocaleString()}/year`
                },
                {
                    step: 3,
                    action: `Access Transition to Retirement pension if over 60`,
                    detail: `Draw from super while still working (if eligible)`
                },
                {
                    step: 4,
                    action: `Gradual adjustment to retirement lifestyle`,
                    detail: `Test retirement activities while still earning income`
                }
            ],
            calculations: {
                partTimeSalary: Math.round(partTimeSalary),
                partTimeYears,
                extraSuper: Math.round(grown),
                incomeBoost: Math.round(incomeBoost),
                startAge: transitionStartAge
            },
            effort: 'moderate',
            timeToImplement: 'requires negotiation'
        });
    }

    /**
     * ACTION 5: Reduce retirement expenses
     * Medium priority if: Gap is modest (<$15k/year)
     */
    considerExpenseReductionAction() {
        const gap = this.outcome.gap;
        const targetIncome = this.outcome.targetIncome;

        if (gap > 20000 || gap < 3000) {
            return; // Either too big or too small
        }

        // Suggest specific expense reductions
        const monthlyReduction = Math.ceil((gap / 12) / 50) * 50;

        // Build specific suggestions based on user profile
        const suggestions = [];

        // Transportation
        suggestions.push({
            category: 'Transport',
            suggestion: 'Consider one car instead of two',
            saving: 400
        });

        // Utilities (if owns home)
        if (this.inputs.ownsHome) {
            suggestions.push({
                category: 'Utilities',
                suggestion: 'Solar panels reduce electricity costs',
                saving: 150
            });
        }

        // Entertainment/Lifestyle
        suggestions.push({
            category: 'Entertainment',
            suggestion: 'Seniors discounts on dining, travel, cinema',
            saving: 100
        });

        // Groceries
        suggestions.push({
            category: 'Groceries',
            suggestion: 'Strategic shopping, bulk buying, meal planning',
            saving: 150
        });

        // Insurance
        suggestions.push({
            category: 'Insurance',
            suggestion: 'Review and compare policies annually',
            saving: 80
        });

        this.actions.push({
            id: 'EXPENSE_REDUCTION',
            priority: 'MEDIUM',
            title: `Reduce Expenses by $${monthlyReduction}/month`,
            shortTitle: `-$${monthlyReduction}/mo expenses`,
            description: `Adjust retirement lifestyle to eliminate shortfall`,
            impactOnGap: gap,
            netCost: 0,
            grossCost: 0,
            taxSavings: 0,
            howToImplement: suggestions.map((s, idx) => ({
                step: idx + 1,
                action: `${s.category}: ${s.suggestion}`,
                detail: `~$${s.saving}/month saved`
            })).concat([{
                step: suggestions.length + 1,
                action: `Total target reduction: $${monthlyReduction}/month`,
                detail: `Review: Are you planning ASFA "comfortable" or "modest" retirement?`
            }]),
            calculations: {
                monthlyReduction,
                currentTarget: targetIncome,
                newTarget: targetIncome - gap,
                suggestions
            },
            effort: 'moderate',
            timeToImplement: 'gradual adjustment'
        });
    }

    /**
     * ACTION 6: Downsize home at retirement
     * Low priority (optional, but high impact if applicable)
     */
    considerDownsizingAction() {
        const homeValue = this.inputs.homeValue || 0;

        if (!this.inputs.ownsHome || homeValue < 700000) {
            return; // Not applicable or not enough equity
        }

        // Assume downsize to $600k home (or 70% of current value, whichever is less)
        const newHomeValue = Math.min(600000, homeValue * 0.70);
        const sellingCosts = homeValue * CONSERVATIVE_ASSUMPTIONS.PROPERTY_COSTS.SELLING_COSTS_PERCENT;
        const buyingCosts = newHomeValue * CONSERVATIVE_ASSUMPTIONS.PROPERTY_COSTS.BUYING_COSTS_PERCENT;
        const netProceeds = homeValue - newHomeValue - sellingCosts - buyingCosts;

        if (netProceeds < 100000) {
            return; // Not worth transaction costs
        }

        // Downsizer contribution to super (first $300k per person, $600k couple)
        const downsizingLimit = this.inputs.hasPartner ? 600000 : 300000;
        const toSuper = Math.min(netProceeds, downsizingLimit);
        const toInvestments = netProceeds - toSuper;

        // Income boost from super (tax-free at 60+)
        const superBoost = this.toTodayDollars(toSuper * 0.04);

        // Income boost from investments (taxable, assume 30% tax)
        const investmentBoost = this.toTodayDollars(toInvestments * 0.04 * 0.70);

        const totalBoost = superBoost + investmentBoost;

        this.actions.push({
            id: 'DOWNSIZE_HOME',
            priority: 'LOW',
            title: `Downsize Home at Retirement`,
            shortTitle: `Downsize home`,
            description: `Sell for $${Math.round(homeValue / 1000)}k, buy $${Math.round(newHomeValue / 1000)}k property`,
            impactOnGap: Math.round(totalBoost),
            netCost: 0,
            grossCost: Math.round(sellingCosts + buyingCosts),
            taxSavings: 0,
            howToImplement: [
                {
                    step: 1,
                    action: `Current home value: $${Math.round(homeValue).toLocaleString()}`,
                    detail: `Target property: $${Math.round(newHomeValue).toLocaleString()}`
                },
                {
                    step: 2,
                    action: `Net proceeds after costs: $${Math.round(netProceeds).toLocaleString()}`,
                    detail: `Transaction costs: ~$${Math.round(sellingCosts + buyingCosts).toLocaleString()}`
                },
                {
                    step: 3,
                    action: `First $${Math.round(downsizingLimit).toLocaleString()} to super (downsizer contribution)`,
                    detail: `Remaining $${Math.round(toInvestments).toLocaleString()} to investments`
                },
                {
                    step: 4,
                    action: `Adds $${Math.round(totalBoost).toLocaleString()}/year to retirement income`,
                    detail: `Plus reduced: maintenance, rates, utilities, insurance`
                }
            ],
            calculations: {
                currentValue: homeValue,
                newValue: newHomeValue,
                netProceeds: Math.round(netProceeds),
                toSuper: Math.round(toSuper),
                toInvestments: Math.round(toInvestments),
                totalBoost: Math.round(totalBoost),
                ongoingSavings: Math.round(homeValue * 0.015) // Estimate 1.5% of value/year in ongoing costs
            },
            effort: 'complex',
            timeToImplement: '6-12 months'
        });
    }

    /**
     * ACTION 7: Increase general savings/investments
     * Medium priority if: Have capacity to save more
     */
    considerExtraSavingsAction() {
        const salary = this.inputs.annualSalary || 0;
        const gap = this.outcome.gap;
        const yearsToGo = this.outcome.yearsToRetirement;

        if (salary < 40000 || gap < 5000 || yearsToGo < 5) {
            return; // Not applicable
        }

        // Calculate extra savings needed to close 40% of gap
        const savingsNeeded = (gap * 0.40) / 0.04; // 40% of gap / 4% drawdown
        const extraMonthly = Math.ceil((savingsNeeded / yearsToGo / 12) / 50) * 50;

        // Limit to reasonable amount (5% of monthly salary)
        const maxMonthly = (salary / 12) * 0.05;
        const finalSuggested = Math.min(extraMonthly, maxMonthly);

        if (finalSuggested < 100) return; // Too small

        // Growth calculation
        const grown = finalSuggested * 12 * yearsToGo * Math.pow(
            1 + CONSERVATIVE_ASSUMPTIONS.INVESTMENT_RETURN,
            yearsToGo / 2
        );

        const incomeBoost = this.toTodayDollars(grown * 0.04 * 0.70); // After tax

        this.actions.push({
            id: 'EXTRA_SAVINGS',
            priority: 'MEDIUM',
            title: `Save Extra $${finalSuggested}/month`,
            shortTitle: `+$${finalSuggested}/mo savings`,
            description: `Increase savings/investments by $${finalSuggested}/month`,
            impactOnGap: Math.round(incomeBoost),
            netCost: finalSuggested,
            grossCost: finalSuggested,
            taxSavings: 0,
            howToImplement: [
                {
                    step: 1,
                    action: `Set up automatic transfer of $${finalSuggested}/month`,
                    detail: `To high-interest savings or investment account`
                },
                {
                    step: 2,
                    action: `Use high-interest savings (current: ${(CONSERVATIVE_ASSUMPTIONS.SAVINGS_INTEREST * 100).toFixed(1)}%)`,
                    detail: `Or invest in diversified portfolio for higher returns`
                },
                {
                    step: 3,
                    action: `Total saved: $${Math.round(finalSuggested * 12 * yearsToGo).toLocaleString()}`,
                    detail: `Grown to: $${Math.round(grown).toLocaleString()} by retirement`
                },
                {
                    step: 4,
                    action: `Provides: $${Math.round(incomeBoost).toLocaleString()}/year extra income`,
                    detail: `After tax (assumes 30% tax rate on earnings)`
                }
            ],
            calculations: {
                extraMonthly: finalSuggested,
                totalSaved: Math.round(finalSuggested * 12 * yearsToGo),
                grown: Math.round(grown),
                incomeBoost: Math.round(incomeBoost)
            },
            effort: 'easy',
            timeToImplement: '1 day'
        });
    }

    /**
     * Generate actions when already on track
     */
    generateOnTrackActions() {
        const surplus = Math.abs(this.outcome.gap);

        return [{
            id: 'ON_TRACK',
            priority: 'SUCCESS',
            title: `You're on track! 🎉`,
            shortTitle: `On track`,
            description: `Your projected income of $${Math.round(this.outcome.sustainableIncome).toLocaleString()}/year ${surplus > 0 ? `exceeds your target by $${Math.round(surplus).toLocaleString()}/year` : 'meets your target'}`,
            impactOnGap: 0,
            netCost: 0,
            grossCost: 0,
            taxSavings: 0,
            howToImplement: [
                {
                    step: 1,
                    action: `Maintain current savings and contributions`,
                    detail: `You're doing great! Keep it up`
                },
                {
                    step: 2,
                    action: `Review annually to stay on track`,
                    detail: `Check progress and adjust as needed`
                },
                {
                    step: 3,
                    action: `Consider building emergency fund (6 months expenses)`,
                    detail: `Target: $${Math.round((this.outcome.targetIncome / 2)).toLocaleString()}`
                },
                {
                    step: 4,
                    action: `Review insurance coverage`,
                    detail: `Income protection, life insurance, TPD, trauma`
                },
                {
                    step: 5,
                    action: `Think about legacy planning`,
                    detail: `Will, estate planning, beneficiary nominations`
                }
            ],
            calculations: {
                surplus: surplus > 0 ? Math.round(surplus) : 0,
                projectedIncome: Math.round(this.outcome.sustainableIncome),
                targetIncome: Math.round(this.outcome.targetIncome)
            },
            effort: 'maintain',
            timeToImplement: 'ongoing'
        }];
    }

    /**
     * Calculate combined impact of multiple actions
     * @param {Array<string>} actionIds - Array of action IDs to combine
     * @returns {Object} Combined impact analysis
     */
    calculateCombinedImpact(actionIds) {
        const selectedActions = this.actions.filter(a =>
            actionIds.includes(a.id)
        );

        const totalImpact = selectedActions.reduce((sum, action) =>
            sum + action.impactOnGap, 0
        );

        const totalMonthlyCost = selectedActions.reduce((sum, action) =>
            sum + action.netCost, 0
        );

        const totalGrossCost = selectedActions.reduce((sum, action) =>
            sum + action.grossCost, 0
        );

        const totalTaxSavings = selectedActions.reduce((sum, action) =>
            sum + action.taxSavings, 0
        );

        const newGap = Math.max(0, this.outcome.gap - totalImpact);
        const gapClosed = totalImpact >= this.outcome.gap;

        return {
            actions: selectedActions,
            totalImpact: Math.round(totalImpact),
            totalMonthlyCost: Math.round(totalMonthlyCost),
            totalGrossCost: Math.round(totalGrossCost),
            totalTaxSavings: Math.round(totalTaxSavings),
            newGap: Math.round(newGap),
            gapClosed,
            newProjectedIncome: Math.round(this.outcome.sustainableIncome + totalImpact),
            surplus: gapClosed ? Math.round(totalImpact - this.outcome.gap) : 0,
            percentClosed: Math.round((totalImpact / this.outcome.gap) * 100)
        };
    }

    /**
     * Estimate marginal tax rate (simplified)
     * @private
     */
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
 * Quick helper to generate actions without creating instance
 * @param {Object} userInputs - User inputs
 * @param {Object} outcomeResults - Outcome results
 * @returns {Array} Array of actions
 */
export function generateRetirementActions(userInputs, outcomeResults) {
    const generator = new ActionGenerator(userInputs, outcomeResults);
    return generator.generateActions();
}

export default ActionGenerator;
