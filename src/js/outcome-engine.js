// outcome-engine.js - Outcome-Based Retirement Engine
//
// Simplified, conservative projection focused on:
// 1. Clear gap analysis (shortfall vs. target)
// 2. Actionable suggestions (specific dollar amounts)
// 3. Reality-based assumptions (median historical data)
// 4. Legacy planning (leave $100k or home)
//
// This complements (doesn't replace) the full simulator.js

import CONSERVATIVE_ASSUMPTIONS from './config-conservative.js';

/**
 * Outcome-Based Retirement Engine
 * Provides simplified, conservative retirement projections with clear action steps
 */
export class OutcomeEngine {
    /**
     * Initialize the outcome engine
     * @param {Object} userInputs - Simplified user inputs
     */
    constructor(userInputs) {
        this.inputs = this.normalizeInputs(userInputs);
        this.results = null;
    }

    /**
     * Normalize and validate user inputs
     * @private
     */
    normalizeInputs(inputs) {
        return {
            // Personal details
            currentAge: inputs.currentAge || inputs.age || 34,
            partnerAge: inputs.partnerAge || null,
            retirementAge: inputs.retirementAge || 67,
            partnerRetirementAge: inputs.partnerRetirementAge || 67,
            hasPartner: !!(inputs.hasPartner || inputs.partnerAge || inputs.partnerSalary),

            // Financial situation
            annualSalary: inputs.annualSalary || inputs.salary || 0,
            partnerAnnualSalary: inputs.partnerAnnualSalary || inputs.partnerSalary || 0,
            superBalance: inputs.superBalance || inputs.yourCurrentSuper || 0,
            partnerSuperBalance: inputs.partnerSuperBalance || inputs.partnerCurrentSuper || 0,
            savings: inputs.savings || inputs.currentSavings || 0,
            investments: inputs.investments || inputs.currentStocks || 0,

            // Property
            ownsHome: inputs.ownsHome !== undefined ? inputs.ownsHome : true,
            homeValue: inputs.homeValue || 810000,
            mortgageBalance: inputs.mortgageBalance || 0,
            monthlyMortgagePayment: inputs.monthlyMortgagePayment || 0,
            mortgageRate: inputs.mortgageRate || CONSERVATIVE_ASSUMPTIONS.MORTGAGE_RATE,
            mortgageYearsRemaining: inputs.mortgageYearsRemaining || null,

            // Goals
            targetRetirementIncome: inputs.targetRetirementIncome || null,
            retirementStandard: inputs.retirementStandard || 'comfortable', // comfortable or modest

            // Location (for rental yields if needed)
            location: inputs.location || 'national'
        };
    }

    /**
     * Main calculation: Conservative retirement projection
     * Returns comprehensive outcome analysis
     *
     * @returns {Object} Outcome results with gap analysis
     */
    calculateConservativeOutcome() {
        const yearsToRetirement = this.inputs.retirementAge - this.inputs.currentAge;

        // Validate inputs
        if (yearsToRetirement <= 0) {
            throw new Error('Retirement age must be greater than current age');
        }

        // 1. Project superannuation at retirement (conservative)
        const superAtRetirement = this.projectSuperannuation(yearsToRetirement);

        // 2. Estimate Age Pension (simplified)
        const agePension = this.estimateAgePension(superAtRetirement);

        // 3. Calculate sustainable retirement income (4% rule)
        const sustainableIncome = this.calculateSustainableIncome(
            superAtRetirement,
            agePension
        );

        // 4. Determine target income (ASFA standard or user specified)
        const targetIncome = this.determineTargetIncome();

        // 5. Calculate gap (shortfall) or surplus
        const gap = targetIncome - sustainableIncome;
        const hasGap = gap > 0;
        const hasSurplus = gap < 0;

        // 6. Project legacy at end of life
        const legacy = this.projectLegacy(superAtRetirement, sustainableIncome, targetIncome);

        // 7. Calculate mortgage payoff status
        const mortgageStatus = this.calculateMortgageStatus(yearsToRetirement);

        // 8. Compile comprehensive results
        this.results = {
            // Summary
            status: hasGap ? 'SHORTFALL' : (hasSurplus ? 'SURPLUS' : 'ON_TRACK'),
            yearsToRetirement,

            // Retirement income projection
            superAtRetirement: Math.round(superAtRetirement),
            agePension: Math.round(agePension),
            sustainableIncome: Math.round(sustainableIncome),
            targetIncome: Math.round(targetIncome),

            // Gap analysis
            gap: Math.round(Math.abs(gap)),
            gapPerWeek: Math.round(Math.abs(gap) / 52),
            gapPerMonth: Math.round(Math.abs(gap) / 12),
            hasGap,
            hasSurplus,

            // Legacy projection
            legacy,

            // Mortgage status
            mortgageStatus,

            // Assumptions used
            assumptions: this.getAssumptionsUsed(),

            // Additional context
            retirementAge: this.inputs.retirementAge,
            currentAge: this.inputs.currentAge,
            hasPartner: this.inputs.hasPartner
        };

        return this.results;
    }

    /**
     * Project superannuation balance at retirement
     * Conservative: 6.5% return, current SG contributions only
     *
     * @private
     * @param {number} years - Years until retirement
     * @returns {number} Projected super balance
     */
    projectSuperannuation(years) {
        const currentSuper = this.inputs.superBalance || 0;
        const partnerSuper = this.inputs.partnerSuperBalance || 0;
        const salary = this.inputs.annualSalary || 0;
        const partnerSalary = this.inputs.partnerAnnualSalary || 0;

        // Calculate annual SG contributions (employer only, conservative)
        const annualContribution =
            (salary * CONSERVATIVE_ASSUMPTIONS.SUPER_GUARANTEE_RATE) +
            (partnerSalary * CONSERVATIVE_ASSUMPTIONS.SUPER_GUARANTEE_RATE);

        // Future value calculation with contributions
        // FV = PV(1+r)^n + PMT * [((1+r)^n - 1) / r]
        const rate = CONSERVATIVE_ASSUMPTIONS.SUPER_RETURN_BALANCED;

        const growthFactor = Math.pow(1 + rate, years);
        const currentSuperGrown = (currentSuper + partnerSuper) * growthFactor;

        // Calculate contribution growth (annuity)
        const contributionsGrown = annualContribution > 0
            ? annualContribution * ((growthFactor - 1) / rate)
            : 0;

        // Apply conservative buffer (90% of projection)
        const projected = (currentSuperGrown + contributionsGrown) *
            CONSERVATIVE_ASSUMPTIONS.RISK_BUFFERS.RETURN_BUFFER;

        return Math.max(0, projected);
    }

    /**
     * Estimate Age Pension (simplified asset test)
     * Uses basic thresholds to give ballpark estimate
     *
     * @private
     * @param {number} superBalance - Projected super at retirement
     * @returns {number} Estimated annual Age Pension
     */
    estimateAgePension(superBalance) {
        const hasPartner = this.inputs.hasPartner;
        const homeowner = this.inputs.ownsHome;

        // Get appropriate thresholds
        const pension = CONSERVATIVE_ASSUMPTIONS.AGE_PENSION;

        const maxPension = hasPartner ?
            pension.COUPLE_COMBINED_ANNUAL :
            pension.SINGLE_MAX_ANNUAL;

        // Select asset test thresholds based on homeownership
        const assetThreshold = homeowner ?
            (hasPartner ? pension.ASSET_THRESHOLD_COUPLE_HOMEOWNER : pension.ASSET_THRESHOLD_SINGLE_HOMEOWNER) :
            (hasPartner ? pension.ASSET_THRESHOLD_COUPLE_NON_HOMEOWNER : pension.ASSET_THRESHOLD_SINGLE_NON_HOMEOWNER);

        const assetLimit = homeowner ?
            (hasPartner ? pension.ASSET_LIMIT_COUPLE_HOMEOWNER : pension.ASSET_LIMIT_SINGLE_HOMEOWNER) :
            (hasPartner ? pension.ASSET_LIMIT_COUPLE_NON_HOMEOWNER : pension.ASSET_LIMIT_SINGLE_NON_HOMEOWNER);

        // Total assessable assets (super + savings, home excluded if homeowner)
        const totalAssets = superBalance + (this.inputs.savings || 0) + (this.inputs.investments || 0);

        // Simplified asset test calculation
        if (totalAssets <= assetThreshold) {
            return maxPension; // Full pension
        } else if (totalAssets >= assetLimit) {
            return 0; // No pension
        } else {
            // Partial pension - linear taper between threshold and limit
            const excessAssets = totalAssets - assetThreshold;
            const taperRange = assetLimit - assetThreshold;
            const reductionPercent = excessAssets / taperRange;
            return Math.round(maxPension * (1 - reductionPercent));
        }
    }

    /**
     * Calculate sustainable retirement income
     * Uses 4% rule for super drawdown + Age Pension
     *
     * @private
     * @param {number} superBalance - Super at retirement
     * @param {number} agePension - Estimated Age Pension
     * @returns {number} Annual sustainable income
     */
    calculateSustainableIncome(superBalance, agePension) {
        // 4% drawdown from super (Trinity Study - sustainable rate)
        const superDrawdown = superBalance *
            CONSERVATIVE_ASSUMPTIONS.SUSTAINABLE_DRAWDOWN_RATE;

        // Total sustainable income
        const totalIncome = superDrawdown + agePension;

        // If mortgage not paid off, reduce income by ongoing payments
        if (this.inputs.mortgageBalance > 0 && this.inputs.monthlyMortgagePayment > 0) {
            const annualMortgagePayment = this.inputs.monthlyMortgagePayment * 12;
            const yearsToRetirement = this.inputs.retirementAge - this.inputs.currentAge;

            // Check if mortgage will be paid off before retirement
            const mortgageStatus = this.calculateMortgageStatus(yearsToRetirement);

            if (!mortgageStatus.paidOffByRetirement) {
                // Reduce income by ongoing mortgage payment
                return Math.round(Math.max(0, totalIncome - annualMortgagePayment));
            }
        }

        return Math.round(totalIncome);
    }

    /**
     * Determine target retirement income
     * Based on ASFA comfortable/modest standard or user preference
     *
     * @private
     * @returns {number} Target annual retirement income
     */
    determineTargetIncome() {
        const hasPartner = this.inputs.hasPartner;
        const standard = this.inputs.retirementStandard || 'comfortable';

        // Option 1: User specified target
        if (this.inputs.targetRetirementIncome && this.inputs.targetRetirementIncome > 0) {
            return this.inputs.targetRetirementIncome;
        }

        // Option 2: ASFA standard (default: comfortable)
        const asfa = CONSERVATIVE_ASSUMPTIONS.ASFA_STANDARDS;

        if (standard === 'modest') {
            return hasPartner ? asfa.MODEST_COUPLE_ANNUAL : asfa.MODEST_SINGLE_ANNUAL;
        } else {
            return hasPartner ? asfa.COMFORTABLE_COUPLE_ANNUAL : asfa.COMFORTABLE_SINGLE_ANNUAL;
        }
    }

    /**
     * Project legacy (what's left at end of life)
     * Goal: At least $100k or home
     *
     * @private
     * @param {number} superAtRetirement - Super balance at retirement
     * @param {number} sustainableIncome - Annual sustainable income
     * @param {number} targetIncome - Target income (might exceed sustainable)
     * @returns {Object} Legacy projection
     */
    projectLegacy(superAtRetirement, sustainableIncome, targetIncome) {
        const planningAge = CONSERVATIVE_ASSUMPTIONS.LIFE_EXPECTANCY.CONSERVATIVE_PLANNING_AGE;
        const retirementAge = this.inputs.retirementAge;
        const yearsInRetirement = planningAge - retirementAge;

        // Conservative: Assume drawing down at target rate (even if above sustainable)
        const actualDrawdown = Math.max(sustainableIncome, targetIncome);
        const annualDrawdown = actualDrawdown -
            (this.estimateAgePension(superAtRetirement)); // Age Pension doesn't deplete super

        // Super continues to grow during retirement (but at lower rate due to conservative allocation)
        const retirementReturnRate = CONSERVATIVE_ASSUMPTIONS.SUPER_RETURN_BALANCED * 0.75; // 75% of accumulation rate

        // Simulate year-by-year depletion
        let remainingSuper = superAtRetirement;

        for (let year = 0; year < yearsInRetirement; year++) {
            // Grow super
            remainingSuper *= (1 + retirementReturnRate);

            // Withdraw
            remainingSuper -= annualDrawdown;

            // Stop if depleted
            if (remainingSuper <= 0) {
                remainingSuper = 0;
                break;
            }
        }

        // Add home value if owned
        const homeValue = this.inputs.ownsHome ?
            (this.inputs.homeValue || 500000) : 0;

        const totalLegacy = Math.max(0, remainingSuper) + homeValue;
        const meetsGoal = totalLegacy >= CONSERVATIVE_ASSUMPTIONS.LEGACY_TARGET;

        return {
            super: Math.round(Math.max(0, remainingSuper)),
            home: homeValue,
            total: Math.round(totalLegacy),
            meetsGoal,
            targetAmount: CONSERVATIVE_ASSUMPTIONS.LEGACY_TARGET,
            runOutAge: remainingSuper > 0 ? null : (retirementAge + year)
        };
    }

    /**
     * Calculate mortgage payoff status at retirement
     *
     * @private
     * @param {number} yearsToRetirement - Years until retirement
     * @returns {Object} Mortgage status details
     */
    calculateMortgageStatus(yearsToRetirement) {
        if (!this.inputs.mortgageBalance || this.inputs.mortgageBalance <= 0) {
            return {
                hasMortgage: false,
                paidOffByRetirement: true,
                balanceAtRetirement: 0,
                monthlyPaymentInRetirement: 0
            };
        }

        const balance = this.inputs.mortgageBalance;
        const rate = this.inputs.mortgageRate || CONSERVATIVE_ASSUMPTIONS.MORTGAGE_RATE;
        const monthlyPayment = this.inputs.monthlyMortgagePayment || 0;

        // If no payment specified, estimate based on 25-year term
        const estimatedMonthlyPayment = monthlyPayment > 0 ? monthlyPayment :
            this.calculateMonthlyMortgagePayment(balance, rate, 25);

        // Calculate years remaining on mortgage
        let yearsRemaining = this.inputs.mortgageYearsRemaining;

        if (!yearsRemaining && estimatedMonthlyPayment > 0) {
            // Calculate remaining term from balance and payment
            const monthlyRate = rate / 12;
            const monthsRemaining = -Math.log(1 - (balance * monthlyRate) / estimatedMonthlyPayment) /
                Math.log(1 + monthlyRate);
            yearsRemaining = monthsRemaining / 12;
        } else if (!yearsRemaining) {
            yearsRemaining = 25; // Default assumption
        }

        // Will mortgage be paid off by retirement?
        const paidOffByRetirement = yearsRemaining <= yearsToRetirement;

        // Calculate balance at retirement if not paid off
        let balanceAtRetirement = 0;
        if (!paidOffByRetirement && estimatedMonthlyPayment > 0) {
            const monthlyRate = rate / 12;
            const monthsToRetirement = yearsToRetirement * 12;

            // Remaining balance after monthsToRetirement payments
            balanceAtRetirement = balance * Math.pow(1 + monthlyRate, monthsToRetirement) -
                estimatedMonthlyPayment * ((Math.pow(1 + monthlyRate, monthsToRetirement) - 1) / monthlyRate);

            balanceAtRetirement = Math.max(0, balanceAtRetirement);
        }

        return {
            hasMortgage: true,
            currentBalance: balance,
            monthlyPayment: Math.round(estimatedMonthlyPayment),
            yearsRemaining: Math.round(yearsRemaining * 10) / 10,
            paidOffByRetirement,
            balanceAtRetirement: Math.round(balanceAtRetirement),
            monthlyPaymentInRetirement: paidOffByRetirement ? 0 : Math.round(estimatedMonthlyPayment)
        };
    }

    /**
     * Calculate monthly mortgage payment
     * @private
     */
    calculateMonthlyMortgagePayment(principal, annualRate, years) {
        const monthlyRate = annualRate / 12;
        const numPayments = years * 12;

        if (monthlyRate === 0) return principal / numPayments;

        return principal * (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
            (Math.pow(1 + monthlyRate, numPayments) - 1);
    }

    /**
     * Get assumptions used in calculation
     * @private
     */
    getAssumptionsUsed() {
        return {
            superReturn: CONSERVATIVE_ASSUMPTIONS.SUPER_RETURN_BALANCED,
            inflation: CONSERVATIVE_ASSUMPTIONS.GENERAL_INFLATION,
            wageGrowth: CONSERVATIVE_ASSUMPTIONS.WAGE_GROWTH,
            drawdownRate: CONSERVATIVE_ASSUMPTIONS.SUSTAINABLE_DRAWDOWN_RATE,
            lifeExpectancy: CONSERVATIVE_ASSUMPTIONS.LIFE_EXPECTANCY.CONSERVATIVE_PLANNING_AGE,
            superGuarantee: CONSERVATIVE_ASSUMPTIONS.SUPER_GUARANTEE_RATE,
            note: 'Conservative assumptions: things stay similar to today'
        };
    }

    /**
     * Generate quick summary for display
     * @returns {Object} Summary of outcome
     */
    getSummary() {
        if (!this.results) {
            this.calculateConservativeOutcome();
        }

        const r = this.results;
        const hasGap = r.gap > 0 && r.status === 'SHORTFALL';
        const hasSurplus = r.gap > 0 && r.status === 'SURPLUS';

        return {
            status: r.status,
            message: hasGap ?
                `You'll be short $${Math.round(r.gap).toLocaleString()}/year ($${Math.round(r.gapPerWeek)}/week)` :
                hasSurplus ?
                    `You're on track! Surplus of $${Math.round(r.gap).toLocaleString()}/year` :
                    `You're on track! Projected income of $${Math.round(r.sustainableIncome).toLocaleString()}/year`,
            yearsToRetirement: r.yearsToRetirement,
            projectedIncome: r.sustainableIncome,
            targetIncome: r.targetIncome,
            gap: r.gap,
            legacy: r.legacy,
            mortgageFreeAtRetirement: r.mortgageStatus.paidOffByRetirement
        };
    }

    /**
     * Get detailed breakdown for user display
     * @returns {Object} Detailed breakdown
     */
    getDetailedBreakdown() {
        if (!this.results) {
            this.calculateConservativeOutcome();
        }

        const r = this.results;

        return {
            yourGoal: {
                retireAtAge: r.retirementAge,
                yearsFromNow: r.yearsToRetirement,
                lifestyleStandard: this.inputs.retirementStandard || 'comfortable',
                targetIncome: r.targetIncome,
                targetIncomeMonthly: Math.round(r.targetIncome / 12)
            },
            yourProjection: {
                superAtRetirement: r.superAtRetirement,
                agePensionAnnual: r.agePension,
                agePensionMonthly: Math.round(r.agePension / 12),
                totalAnnualIncome: r.sustainableIncome,
                totalMonthlyIncome: Math.round(r.sustainableIncome / 12)
            },
            theGap: {
                hasGap: r.hasGap,
                hasSurplus: r.hasSurplus,
                annualAmount: r.gap,
                monthlyAmount: r.gapPerMonth,
                weeklyAmount: r.gapPerWeek,
                percentOfTarget: r.targetIncome > 0 ? Math.round((r.gap / r.targetIncome) * 100) : 0
            },
            legacyProjection: {
                projectedLegacy: r.legacy.total,
                superRemaining: r.legacy.super,
                homeValue: r.legacy.home,
                meetsLegacyGoal: r.legacy.meetsGoal,
                legacyTarget: r.legacy.targetAmount
            },
            mortgage: r.mortgageStatus,
            assumptions: r.assumptions
        };
    }
}

/**
 * Quick helper function to run calculation without creating instance
 * @param {Object} userInputs - User inputs
 * @returns {Object} Calculation results
 */
export function calculateRetirementOutcome(userInputs) {
    const engine = new OutcomeEngine(userInputs);
    return engine.calculateConservativeOutcome();
}

/**
 * Usage example:
 *
 * ```javascript
 * const engine = new OutcomeEngine({
 *     currentAge: 53,
 *     retirementAge: 65,
 *     superBalance: 280000,
 *     partnerSuperBalance: 150000,
 *     annualSalary: 95000,
 *     partnerAnnualSalary: 75000,
 *     savings: 50000,
 *     ownsHome: true,
 *     homeValue: 850000,
 *     mortgageBalance: 280000,
 *     monthlyMortgagePayment: 2400,
 *     mortgageYearsRemaining: 18,
 *     hasPartner: true
 * });
 *
 * const outcome = engine.calculateConservativeOutcome();
 * const summary = engine.getSummary();
 *
 * console.log(summary);
 * // {
 * //   status: 'SHORTFALL',
 * //   message: 'You'll be short $15,234/year ($293/week)',
 * //   projectedIncome: 56914,
 * //   targetIncome: 72148,
 * //   gap: 15234,
 * //   ...
 * // }
 * ```
 */

export default OutcomeEngine;
