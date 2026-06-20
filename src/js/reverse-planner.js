/**
 * reverse-planner.js - Orchestration layer for the Reverse Retirement Planner
 *
 * Coordinates:
 *  1. Building the current projected path (using RetirementSimulator)
 *  2. Running all lever solvers via ReverseRetirementSolver
 *  3. Formatting the final structured result object
 */

import { ENHANCED_CONFIG } from './config.js';
import { RetirementSimulator } from './simulator.js';
import {
    ReverseRetirementSolver,
    scoreScenario,
    estimateRequiredCapital,
} from './reverse-solver.js';
import {
    buildHouseholdLevers,
    buildOverseasComparison,
    buildAgePensionPortabilitySensitivity,
    detectHouseholdPattern,
} from './reverse-scenarios.js';
import {
    buildReverseBaselineFromForwardScenario,
    importForwardScenario,
} from './reverse-baseline-adapter.js';
import { compareCurrentToTarget } from './reverse-gap-analysis.js';

const DEFAULT_SWR = 0.04;
const DEFAULT_INFLATION = ENHANCED_CONFIG.INFLATION_RATE || 0.026;

// ---------------------------------------------------------------------------
// Input normalisation for the reverse planner
// ---------------------------------------------------------------------------

/**
 * Build normalised simulator inputs from a reverse planner target + inputs object.
 * Maps simple mode UI field names to the simulator's canonical field names.
 *
 * @param {object} rawInputs    Raw UI or API inputs
 * @returns {object}            Normalised inputs ready for RetirementSimulator
 */
export function normaliseReversePlannerInputs(rawInputs) {
    const num = (v, fallback = 0) => {
        const n = Number(v ?? fallback);
        return Number.isFinite(n) ? n : fallback;
    };
    const pct = (v, fallback = 0) => {
        const n = Number(v ?? fallback);
        if (!Number.isFinite(n)) return fallback;
        return Math.abs(n) > 1 ? n / 100 : n;
    };

    const isCouple = rawInputs.householdType === 'couple' || rawInputs.isCouple || false;

    return {
        // Identity
        yourCurrentAge: num(rawInputs.currentAge ?? rawInputs.yourCurrentAge, 50),
        retirementAge: num(rawInputs.retirementAge, 67),
        yourLifespan: num(rawInputs.lifespan ?? rawInputs.yourLifespan, 90),
        isCouple,
        isSingleCalculation: !isCouple,

        // Income
        yourSalary: num(rawInputs.annualSalary ?? rawInputs.yourSalary),
        partnerSalary: isCouple ? num(rawInputs.partnerSalary) : 0,

        // Super
        yourCurrentSuper: num(rawInputs.currentSuperBalance ?? rawInputs.superBalance ?? rawInputs.yourCurrentSuper),
        partnerCurrentSuper: isCouple ? num(rawInputs.partnerSuperBalance ?? rawInputs.partnerCurrentSuper) : 0,
        yourAdditionalSuperContribution: num(rawInputs.salarySacrifice ?? rawInputs.yourAdditionalSuperContribution),
        partnerAdditionalSuperContribution: isCouple ? num(rawInputs.partnerSalarySacrifice) : 0,
        employerSuperContributionRate: pct(rawInputs.employerSuperRate, ENHANCED_CONFIG.SUPER_GUARANTEE_RATE),

        // Assets
        currentSavings: num(rawInputs.cashSavings ?? rawInputs.currentSavings),
        currentStocks: num(rawInputs.stocksPortfolio ?? rawInputs.currentStocks),
        monthlyStockContribution: num(rawInputs.monthlyInvestment ?? rawInputs.monthlyStockContribution),

        // Home
        homeowner: rawInputs.homeowner !== undefined ? !!rawInputs.homeowner : true,
        homeValue: num(rawInputs.homeValue),
        mortgageBalance: num(rawInputs.mortgageBalance),
        mortgageRate: pct(rawInputs.mortgageRate, 0.06),
        monthlyMortgagePayment: num(rawInputs.monthlyMortgagePayment),

        // Investment property
        hasInvestmentProperty: !!rawInputs.hasInvestmentProperty,
        investmentPropertyValue: num(rawInputs.investmentPropertyValue),
        weeklyRentalIncome: num(rawInputs.weeklyRentalIncome),
        annualPropertyExpenses: num(rawInputs.annualPropertyExpenses),
        propertyGrowthRate: pct(rawInputs.propertyGrowthRate, 0.04),

        // Target / desired income
        asfaComfortable: num(rawInputs.targetAnnualIncomeToday ?? rawInputs.desiredIncome, 73000),

        // Economic parameters
        inflation: pct(rawInputs.inflation, DEFAULT_INFLATION),
        investmentReturn: pct(rawInputs.investmentReturn, 0.07),
        superReturn: pct(rawInputs.superReturn, 0.075),
        savingsReturn: pct(rawInputs.savingsReturn, 0.035),
        salaryGrowthRate: pct(rawInputs.salaryGrowthRate, 0.02),
        returnVolatility: pct(rawInputs.returnVolatility, 0.12),
    };
}

// ---------------------------------------------------------------------------
// ReversePlanner class
// ---------------------------------------------------------------------------

export class ReversePlanner {
    constructor(config = ENHANCED_CONFIG) {
        this.config = config;
        this.simulator = new RetirementSimulator(config);
        this.solver = new ReverseRetirementSolver(config);
    }

    /**
     * Build the current projected path (what happens if nothing changes).
     *
     * @param {object} baseInputs  Normalised simulator inputs
     * @param {object} target      Target object
     * @returns {object}           currentPath with scores and gaps
     */
    buildCurrentPath(baseInputs, target) {
        const inflationRate = baseInputs.inflation ?? DEFAULT_INFLATION;
        const swr = target.swr ?? DEFAULT_SWR;
        const ytr = Math.max(1, (baseInputs.retirementAge || 67) - (baseInputs.yourCurrentAge || 50));

        let simResult;
        try {
            simResult = this.simulator.simulateRetirement(baseInputs, false);
        } catch (err) {
            throw new Error(`Current path simulation failed: ${err.message}`);
        }

        const score = scoreScenario(simResult, target, inflationRate, ytr, swr);

        // Estimate age pension using ENHANCED_CONFIG rates
        const agePensionNominal = target.includeAgePension
            ? (baseInputs.isCouple
                ? (ENHANCED_CONFIG.COUPLE_PENSION_MAX || 47070)
                : (ENHANCED_CONFIG.SINGLE_PENSION_MAX || 31223))
            : 0;

        const requiredCapital = estimateRequiredCapital(
            target.targetAnnualIncomeToday || 0,
            ytr,
            inflationRate,
            agePensionNominal,
            swr
        );

        // Mortgage balance at retirement: 0 if paid off by then, else current balance
        const mortgagePaidOff = simResult.mortgagePayoffAge !== null &&
            simResult.mortgagePayoffAge <= baseInputs.retirementAge;
        const mortgageBalance = mortgagePaidOff ? 0 : (baseInputs.mortgageBalance || 0);

        // Estimate individual super balances from combined total
        const totalInitialSuper = (baseInputs.yourCurrentSuper || 0) + (baseInputs.partnerCurrentSuper || 0);
        const yourSuperRatio = totalInitialSuper > 0
            ? (baseInputs.yourCurrentSuper || 0) / totalInitialSuper
            : (baseInputs.isCouple ? 0.5 : 1);
        const combinedSuper = simResult.accumulatedSuperBalance || 0;
        const yourSuperAtRetirement = combinedSuper * yourSuperRatio;
        const partnerSuperAtRetirement = combinedSuper * (1 - yourSuperRatio);

        return {
            simResult,
            score,
            yearsToRetirement: ytr,
            inflationRate,
            swr,
            currentAge: baseInputs.yourCurrentAge,
            retirementAge: baseInputs.retirementAge,
            lifespan: baseInputs.yourLifespan,
            sustainableIncomeToday: score.sustainableIncomeToday,
            totalAssetsNominal: score.totalAssetsNominal,
            requiredCapital,
            capitalGap: Math.max(0, requiredCapital - score.totalAssetsNominal),
            incomeGap: score.incomeGap,
            meetsGoal: score.passesGoal,
            agePensionNominal,
            mortgageBalance,
            estateAtLifespan: simResult.finalBalance || 0,
            superAtRetirement: combinedSuper,
            score: {
                ...score,
                superAtRetirement: combinedSuper,
                partnerSuperAtRetirement,
                yourSuperAtRetirement,
            },
        };
    }

    /**
     * Full solve: build current path, run all levers, return structured result.
     *
     * @param {object} rawInputs  Raw inputs (from UI or API)
     * @param {object} target     Target object
     * @param {object} options    { includeOverseas, swr }
     * @returns {Promise<object>} Structured result
     */
    async solve(rawInputs, target, options = {}) {
        // Normalise inputs
        const baseInputs = normaliseReversePlannerInputs({
            ...rawInputs,
            targetAnnualIncomeToday: target.targetAnnualIncomeToday,
        });

        // Merge target with defaults
        const resolvedTarget = {
            targetAnnualIncomeToday: 73000,
            retirementAge: baseInputs.retirementAge || 67,
            currentAge: baseInputs.yourCurrentAge || 50,
            successProbabilityTarget: 0.80,
            minimumEstateToday: 0,
            includeAgePension: true,
            householdType: baseInputs.isCouple ? 'couple' : 'single',
            lifespan: baseInputs.yourLifespan || 90,
            swr: DEFAULT_SWR,
            ...target,
        };

        // 1. Build current path
        const currentPath = this.buildCurrentPath(baseInputs, resolvedTarget);

        // 2. Run all lever solvers
        const solverOptions = { swr: resolvedTarget.swr || DEFAULT_SWR };
        const { rankedLevers } = await this.solver.solveAllLevers(
            baseInputs,
            resolvedTarget,
            solverOptions
        );

        // 3. Household lever metadata
        const householdMeta = buildHouseholdLevers(
            baseInputs,
            resolvedTarget,
            resolvedTarget.householdType
        );

        // 4. Overseas comparison (optional)
        let overseasComparison = null;
        if (options.includeOverseas !== false) {
            overseasComparison = buildOverseasComparison(
                resolvedTarget.targetAnnualIncomeToday,
                currentPath.agePensionNominal / Math.pow(
                    1 + currentPath.inflationRate,
                    currentPath.yearsToRetirement
                ) // deflate pension back to today's dollars
            );
        }

        // 5. Age pension portability sensitivity
        const agePensionSensitivity = buildAgePensionPortabilitySensitivity(
            currentPath.agePensionNominal / Math.pow(
                1 + currentPath.inflationRate,
                currentPath.yearsToRetirement
            )
        );

        return {
            target: resolvedTarget,
            inputs: baseInputs,
            currentPath,
            rankedLevers,
            feasibleLevers: rankedLevers.filter(l => l.feasible),
            infeasibleLevers: rankedLevers.filter(l => !l.feasible),
            top3Actions: rankedLevers.filter(l => l.feasible).slice(0, 3),
            householdMeta,
            overseasComparison,
            agePensionSensitivity,
            householdPattern: detectHouseholdPattern(baseInputs),
            summary: {
                meetsGoal: currentPath.meetsGoal,
                incomeGap: currentPath.incomeGap,
                capitalGap: currentPath.capitalGap,
                feasiblePathExists: rankedLevers.some(l => l.feasible),
            },
        };
    }

    /**
     * Format a result for display/report.
     *
     * @param {object} result  Result from solve()
     * @returns {object}       Display-ready object
     */
    formatResult(result) {
        const { target, currentPath, top3Actions } = result;
        const inflationRate = currentPath.inflationRate;
        const ytr = currentPath.yearsToRetirement;

        // Nominal income target at retirement year
        const nominalTarget = target.targetAnnualIncomeToday * Math.pow(1 + inflationRate, ytr);

        return {
            goalSummary: {
                todaysDollars: target.targetAnnualIncomeToday,
                nominalAtRetirement: Math.round(nominalTarget),
                retirementAge: target.retirementAge,
                currentAge: target.currentAge,
                lifespan: target.lifespan,
            },
            currentProjection: {
                sustainableIncomeToday: Math.round(currentPath.sustainableIncomeToday),
                meetsGoal: currentPath.meetsGoal,
                incomeGap: Math.round(currentPath.incomeGap),
                capitalGap: Math.round(currentPath.capitalGap),
                totalAssetsNominal: Math.round(currentPath.totalAssetsNominal),
            },
            topActions: top3Actions.map(lever => ({
                label: lever.label,
                description: lever.description,
                value: lever.value,
                unit: lever.unit,
                feasibilityScore: lever.feasibilityScore,
            })),
            allLevers: result.rankedLevers,
        };
    }
}

export {
    buildReverseBaselineFromForwardScenario,
    importForwardScenario,
    compareCurrentToTarget,
};
