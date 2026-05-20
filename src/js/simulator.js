// js/simulator.js - Financial Simulation Engine with Investment Property Support

const debugLog = process.env.NODE_ENV !== 'production' ? console.log.bind(console) : () => {};

import { ENHANCED_FINANCIAL_CONFIG } from './enhanced-config.js';
import { ENHANCED_CONFIG } from './config.js';
import { EnhancedMonteCarloEngine } from './enhanced-monte-carlo.js';
import { calculateSpending, SPENDING_STRATEGIES } from './simulation_engine/spending_engine.js';
import { getSGRate }                               from './simulation_engine/super_engine.js';
// TASK-002: import the canonical super tax function so Pipeline A and Pipeline B
// use identical contributions tax logic (15% base + Division 293 surcharge).
import { calcSuperTax }                            from './simulation_engine/tax_engine.js';
import {
    calculatePostTaxIncome,
    calculateAustralianTax,
    calculateMedicareLevy,
    calculateMLS,
    calculateLoanBalance,
    calculatePropertyCashFlow,
    calculateCGT,
    calculateCGTPost2027,
    calculateAgePension,
    calculateAgePensionForCouple,
    calculateDeemedIncome,
    randomNormal,
    median,
    regimeAwareReturn,
    getPropertyCyclePhase,
    getCurrentRateRegime,
    clamp,
    hasHighInterestDebt,
    normaliseRatio
} from './utils.js';

const RUN_UNTIL_DEPLETION_AGE = 120;
const resolveScenarioMonteCarloRuns = (inputs = {}) =>
    Math.max(100, Math.min(20000, Math.round(Number(inputs.numRuns) || 1000)));

/**
 * Generate a stochastic annual rate by applying a bounded symmetric variation
 * to the user-supplied central estimate.  The user's input is treated as the
 * central value (mean = median for a symmetric distribution); each MC draw
 * applies a uniform perturbation from [-0.04, +0.04] (±4 pp), so the
 * expected perturbation is exactly 0 and the distribution is centred on the
 * user's input.
 *
 * Why ±4 pp?  AU macro data (RBA/ABS 2002-2024):
 *   CPI std dev ≈ 1.8 pp  →  ±4 pp covers roughly ±2.2 σ  (≈97% of history)
 *   Super returns std dev ≈ 8 pp  →  ±4 pp is a conservative ±0.5 σ
 * The same range is used for all rates for simplicity; the floor parameter
 * prevents rates from going below a caller-specified minimum.
 *
 * Note: an asymmetric range such as [-0.045, +0.035] shifts the median of
 * the distribution by -0.5 pp relative to the user input, biasing all MC
 * runs downward — which is why this implementation uses a symmetric range.
 *
 * @param {number}  centralRate  - Central (mean/median) rate as decimal (e.g. 0.026 for 2.6%)
 * @param {boolean} useRandom    - When false returns centralRate unchanged (deterministic mode)
 * @param {number}  [floor=0]    - Hard floor for result (e.g. 0.001 = 0.1% minimum)
 * @returns {number} Perturbed rate in decimal form, ≥ floor
 */
function stochasticRate(centralRate, useRandom, floor = 0) {
    if (!useRandom) return centralRate;
    // Symmetric uniform draw: perturbation ∈ [-0.04, +0.04], E[perturbation] = 0
    const perturbation = (Math.random() - 0.5) * 0.08; // 0.08 = 2 × 0.04
    return Math.max(floor, centralRate + perturbation);
}

export class RetirementSimulator {
    constructor(config) {
        // Merge original config with enhanced financial config
        this.config = config;
        this.financialConfig = ENHANCED_FINANCIAL_CONFIG;
        this.enhancedMonteCarloEngine = new EnhancedMonteCarloEngine(this.config);
        this.previousReturns = {
            portfolio: null,
            property: null
        };
    }

    // Returns the ATO minimum annual pension drawdown rate for a given age (Schedule 7, 2025)
    getMinDrawdownRate(age) {
        const rates = this.config.MIN_PENSION_DRAWDOWN_RATES || [];
        for (const band of rates) {
            if (age >= band.minAge && age <= band.maxAge) return band.rate;
        }
        return 0.04; // fallback — should not be reached with a complete rate table
    }

    getEffectiveLifespan(lifespan) {
        return lifespan > 0 ? lifespan : RUN_UNTIL_DEPLETION_AGE;
    }

    isOpenEndedLifespan(lifespan) {
        return !(lifespan > 0);
    }

    getRetirementLifecycleStage(age, retirementAge, pensionAge, agedCareActive) {
        if (agedCareActive) {
            return {
                key: 'late_life_care',
                label: 'Late-life care',
                essentialMultiplier: 1.00,
                lifestyleMultiplier: 0.20
            };
        }

        if (age < pensionAge) {
            return {
                key: 'pre_pension_bridge',
                label: 'Pre-Age-Pension bridge',
                essentialMultiplier: 1.00,
                lifestyleMultiplier: 1.00
            };
        }

        const yearsRetired = Math.max(0, age - retirementAge);
        if (yearsRetired < 10) {
            return {
                key: 'active_retirement',
                label: 'Active retirement',
                essentialMultiplier: 1.00,
                lifestyleMultiplier: 1.00
            };
        }

        if (yearsRetired < 20) {
            return {
                key: 'stable_retirement',
                label: 'Stable retirement',
                essentialMultiplier: 0.97,
                lifestyleMultiplier: 0.80
            };
        }

        return {
            key: 'slowdown_retirement',
            label: 'Slowdown retirement',
            essentialMultiplier: 0.94,
            lifestyleMultiplier: 0.55
        };
    }

    getFundingStage(totalCost, pensionIncome, annualWithdrawal, otherIncome) {
        const fundingBase = Math.max(totalCost, pensionIncome + annualWithdrawal + otherIncome);
        const pensionShare = fundingBase > 0 ? pensionIncome / fundingBase : 0;

        if (pensionIncome <= 0) {
            return { key: 'self_funded', label: 'Self-funded' };
        }

        if (pensionShare >= 0.6) {
            return { key: 'pension_heavy', label: 'Pension-heavy' };
        }

        return { key: 'mixed_funding', label: 'Mixed funding' };
    }

    buildAgedCareProfile(inputs, useRandomReturns, effectiveYourLifespan) {
        const probability = clamp(parseFloat(inputs.agedCareProbability || 0), 0, 1);
        const baseStartAge = parseFloat(inputs.agedCareStartAge || 0);
        const baseDuration = Math.max(0, parseFloat(inputs.agedCareDuration || 0));
        const annualCost = Math.max(0, parseFloat(inputs.agedCareAnnualCost || 0));
        const minStartAge = Math.max(inputs.retirementAge || inputs.yourCurrentAge, inputs.yourCurrentAge);
        const maxStartAge = Math.max(
            minStartAge,
            effectiveYourLifespan - Math.max(1, Math.ceil(baseDuration)) + 1
        );

        if (probability <= 0 || baseDuration <= 0 || annualCost <= 0 || baseStartAge <= 0) {
            return {
                occurs: false,
                probability,
                startAge: baseStartAge,
                duration: 0,
                costWeight: 0,
                sampled: false
            };
        }

        if (!useRandomReturns) {
            return {
                occurs: true,
                probability,
                startAge: clamp(baseStartAge, minStartAge, maxStartAge),
                duration: baseDuration,
                costWeight: probability,
                sampled: false
            };
        }

        const occurs = Math.random() < probability;
        if (!occurs) {
            return {
                occurs: false,
                probability,
                startAge: clamp(baseStartAge, minStartAge, maxStartAge),
                duration: 0,
                costWeight: 0,
                sampled: true
            };
        }

        // Aged care start age is sampled from a normal distribution centred on the user's
        // estimate (σ = 2 years). The user's entry is a planning *assumption*, not a
        // certainty — care can begin earlier or later depending on health trajectory.
        // Each MC run draws a different onset age, producing realistic scenario spread
        // (some runs: care starts at 83; others: 87+). Clamped to [minStartAge, maxStartAge].
        const sampledStartAge = clamp(
            Math.round(randomNormal(baseStartAge, 2)),
            minStartAge,
            maxStartAge
        );
        const maxDuration = Math.max(0.5, effectiveYourLifespan - sampledStartAge + 1);
        const sampledDuration = clamp(
            randomNormal(baseDuration, 0.75),
            0.5,
            Math.max(0.5, Math.min(baseDuration + 2, maxDuration))
        );

        return {
            occurs: true,
            probability,
            startAge: sampledStartAge,
            duration: sampledDuration,
            costWeight: 1,
            sampled: true
        };
    }

    getAnnualAgedCareCost(age, inputs, agedCareProfile, effectiveYourLifespan, overrideHealthcareInflation = null) {
        if (!agedCareProfile?.occurs || age < agedCareProfile.startAge) {
            return 0;
        }

        const yearsInCare = age - agedCareProfile.startAge;
        if (yearsInCare >= agedCareProfile.duration) {
            return 0;
        }

        const yearsFromNow = age - inputs.yourCurrentAge;
        // Use overrideHealthcareInflation when provided (stochastic MC rate) so aged care
        // costs compound at the per-run drawn rate, not the fixed median every time.
        const hcRate = overrideHealthcareInflation ?? inputs.healthcareInflation;
        let annualCost = inputs.agedCareAnnualCost * Math.pow(1 + hcRate, yearsFromNow);
        const remainingCare = agedCareProfile.duration - yearsInCare;

        if (remainingCare < 1 && remainingCare > 0) {
            annualCost *= remainingCare;
        }

        if (age >= effectiveYourLifespan) {
            annualCost = 0;
        } else if (age + 1 > effectiveYourLifespan) {
            annualCost *= (effectiveYourLifespan - age);
        }

        return annualCost * (agedCareProfile.costWeight || 0);
    }

    static getAnnualTravelCost(frequency, isCouple) {
        const perPerson = { annually: 5000, biannually: 10000, quarterly: 20000, seasonal: 30000, never: 0 }[frequency] ?? 0;
        return perPerson * (isCouple ? 2 : 1);
    }

    buildRetirementSpendingPlan({
        inputs,
        retirementYear,
        currentAge,
        currentBalance,
        initialRetirementBalance,
        previousSpendingTarget,
        agedCareActive,
        useRandomReturns,
        overrideInflationFactor,
        yearInflationRate,
    }) {
        const inflationFactor = overrideInflationFactor ?? Math.pow(1 + inputs.inflation, retirementYear);
        // Per-year inflation rate for use by spending strategies that need it (e.g. Guyton-Klinger).
        // In stochastic mode this is the drawn rate for the current year; deterministic uses median.
        const effectiveYearInflation = (useRandomReturns && yearInflationRate != null)
            ? yearInflationRate
            : inputs.inflation;

        // Overseas phase: substitute overseas living budget + return travel cost
        if (inputs.goingOverseas && inputs.overseasStartAge > 0 && currentAge >= inputs.overseasStartAge) {
            const travelCost = RetirementSimulator.getAnnualTravelCost(inputs.overseasReturnFrequency, inputs.isCouple);
            const totalOverseasCost = (inputs.overseasAnnualBudget + travelCost) * inflationFactor;
            const essentialSpending = totalOverseasCost * 0.85;
            return {
                lifecycleStage: 'overseas',
                lifecycleLabel: 'Overseas retirement',
                decumulationStrategy: 'overseas_fixed',
                essentialSpending,
                discretionarySpending: totalOverseasCost - essentialSpending,
                targetSpending: totalOverseasCost,
                overseasTravelCost: travelCost * inflationFactor,
            };
        }

        const travelHobbyBase = (inputs.annualTravelBudget || 0) + (inputs.annualHobbyBudget || 0);
        const pensionAge = this.config.OVERSEAS_RETIREMENT?.PENSION_AGE || 67;
        const lifecycle = this.getRetirementLifecycleStage(
            currentAge,
            inputs.retirementAge,
            pensionAge,
            agedCareActive
        );

        let essentialBase = inputs.asfaComfortable * 0.7 * inflationFactor;
        let lifestyleBase = (inputs.asfaComfortable * 0.3 * inflationFactor) + (travelHobbyBase * inflationFactor);

        try {
            const { housingExpense, livingExpense, mortgagePayment } = this.extractBaseExpensesFromCashFlow(inputs);
            const retirementHousing = Math.max(housingExpense * 0.7, housingExpense - mortgagePayment);
            const retirementLiving = livingExpense * 0.9;
            const baseAnnualHousing = retirementHousing * ENHANCED_CONFIG.MONTHS_IN_YEAR * inflationFactor;
            const baseAnnualLiving = retirementLiving * ENHANCED_CONFIG.MONTHS_IN_YEAR * inflationFactor;

            essentialBase = Math.max(
                baseAnnualHousing + (baseAnnualLiving * 0.7),
                inputs.asfaComfortable * 0.6 * inflationFactor
            );
            lifestyleBase = Math.max(
                0,
                (baseAnnualLiving * 0.3) + (travelHobbyBase * inflationFactor)
            );
        } catch (error) {
            console.warn('Retirement spending plan fallback to ASFA baseline:', error);
        }

        const essentialSpending = essentialBase * lifecycle.essentialMultiplier;
        const lifestyleSpending = lifestyleBase * lifecycle.lifestyleMultiplier;
        const startingTarget = essentialSpending + lifestyleSpending;
        let targetSpending = calculateSpending({
            strategy: SPENDING_STRATEGIES.FLOOR_UPSIDE,
            currentSpending: previousSpendingTarget ?? startingTarget,
            portfolioValue: currentBalance,
            initialPortfolio: initialRetirementBalance,
            initialSpending: startingTarget,
            yearsRetired: Math.max(0, currentAge - inputs.retirementAge),
            inflation: effectiveYearInflation,
            inputs: {
                essentialSpending,
                lifestyleSpending
            }
        });

        // NOTE: A raw ±10% uniform noise on lifestyle spending was previously applied here
        // in Monte Carlo runs. It has been removed because:
        //   1. Spending is a user-configured input — silently randomising it violates
        //      the principle that only *financial rates* (returns, inflation) vary per run.
        //   2. The stochasticRate() variation on inflation at the retirement-year level
        //      already propagates realistic spending uncertainty through the cumulative
        //      inflation factor — adding a second layer of noise is redundant.
        //   3. Uniform distribution is inconsistent with all other stochastic modelling
        //      which uses Gaussian draws or bounded uniform rate perturbations.

        if (previousSpendingTarget && !agedCareActive) {
            targetSpending = clamp(
                targetSpending,
                previousSpendingTarget * 0.9,
                previousSpendingTarget * 1.07
            );
        }

        targetSpending = Math.max(essentialSpending, targetSpending);

        return {
            lifecycleStage: lifecycle.key,
            lifecycleLabel: lifecycle.label,
            decumulationStrategy: SPENDING_STRATEGIES.FLOOR_UPSIDE,
            essentialSpending,
            discretionarySpending: Math.max(0, targetSpending - essentialSpending),
            targetSpending
        };
    }

    // Enhanced Risk profiling calculations with dynamic factors
    calculateRiskCapacity(inputs) {
        let score = 50; // Base score

        // Age factor with exponential time horizon weighting
        const age = inputs.yourCurrentAge;
        const yearsToRetirement = Math.max(1, inputs.retirementAge - age);
        const timeHorizonFactor = Math.min(30, Math.pow(yearsToRetirement / 10, 1.2) * 10);
        score += timeHorizonFactor;

        // Portfolio-to-income ratio analysis
        const totalIncome = inputs.yourSalary + inputs.partnerSalary;
        const currentAssets = inputs.yourCurrentSuper + inputs.partnerCurrentSuper +
            inputs.currentSavings + inputs.currentStocks;
        const portfolioToIncomeRatio = totalIncome > 0 ? currentAssets / totalIncome : 0;

        if (portfolioToIncomeRatio > 10) score += 25; // Very high capacity
        else if (portfolioToIncomeRatio > 5) score += 20;
        else if (portfolioToIncomeRatio > 3) score += 15;
        else if (portfolioToIncomeRatio > 1) score += 10;
        else if (portfolioToIncomeRatio > 0.5) score += 5;
        else score -= 10; // Low asset base relative to income

        // Enhanced income stability scoring — thresholds in config.SIMULATION.RISK_CAPACITY_INCOME_BANDS
        const incomeBands = this.config.SIMULATION?.RISK_CAPACITY_INCOME_BANDS || [
            { threshold: 300000, points: 25 },
            { threshold: 200000, points: 20 },
            { threshold: 150000, points: 15 },
            { threshold: 100000, points: 10 },
            { threshold:  75000, points:  8 },
            { threshold:  50000, points:  5 },
        ];
        const matchedBand = incomeBands.find(b => totalIncome > b.threshold);
        if (matchedBand) score += matchedBand.points;
        else score -= 5;

        // Emergency fund with graduated scoring
        const emergencyFund = inputs.hasEmergencyFund;
        if (emergencyFund === 'full') score += 20; // 6+ months
        else if (emergencyFund === 'partial') score += 12; // 3-6 months
        else if (emergencyFund === 'minimal') score += 5; // 1-3 months
        else score -= 20; // No emergency fund

        // Enhanced debt burden analysis
        // BUG FIX: hasDebt is a string ("none"/"minimal"/"moderate"/"high").
        // Checking numeric balances as the primary signal; fall back to the string flag.
        const hasActualHighDebt = hasHighInterestDebt(inputs);
        const debtLevel = (inputs.hasDebt || '').toString().toLowerCase();
        if (!hasActualHighDebt && debtLevel === 'none') score += 20;
        else if (!hasActualHighDebt && debtLevel === 'minimal') score += 8; // <10% of income
        else if (debtLevel === 'moderate') score -= 12; // 10-30% of income
        else score -= 25; // >30% of income

        // Dependents with scaled impact
        const dependentPenalty = Math.min(inputs.dependents * 7, 25); // Cap penalty
        score -= dependentPenalty;

        // Healthcare cost buffer (age-based)
        if (age > 55) {
            const healthcareFactor = inputs.hasEmergencyFund === 'full' ? 5 : -10;
            score += healthcareFactor;
        }

        return clamp(score, 0, 100);
    }

    calculateRiskRequirement(inputs, monteCarloResults = null) {
        const yearsToRetirement = Math.max(1, inputs.retirementAge - inputs.yourCurrentAge);
        const targetAssets = inputs.asfaComfortable * 25; // 4% rule estimate
        const currentAssets = inputs.yourCurrentSuper + inputs.partnerCurrentSuper +
            inputs.currentSavings + inputs.currentStocks;

        // Base calculation using required return approach
        const growthNeeded = targetAssets / Math.max(1, currentAssets);
        const requiredAnnualReturn = Math.pow(growthNeeded, 1 / yearsToRetirement) - 1;
        const riskFreeRate = this.financialConfig.riskAssessment.RISK_FREE_RATE.value;
        const excessReturnNeeded = Math.max(0, requiredAnnualReturn - riskFreeRate);

        let baseRiskScore = Math.min(100, excessReturnNeeded * 1000); // Scale to 0-100

        // Enhanced risk requirement from Monte Carlo results if available
        if (monteCarloResults && monteCarloResults.successRate !== undefined) {
            const successRate = monteCarloResults.successRate;

            // Adjust risk requirement based on success probability
            const thresholds = this.financialConfig.riskAssessment.SUCCESS_RATE_THRESHOLDS;
            if (successRate < thresholds.CRITICAL.value) {
                baseRiskScore += 30; // Need much higher risk for low success rate
            } else if (successRate < thresholds.LOW.value) {
                baseRiskScore += 20; // Moderate increase needed
            } else if (successRate < thresholds.ACCEPTABLE.value) {
                baseRiskScore += 10; // Slight increase needed
            } else if (successRate > thresholds.EXCELLENT.value) {
                baseRiskScore = Math.max(0, baseRiskScore - 15); // Can afford less risk
            }

            // Factor in shortfall analysis
            if (monteCarloResults.medianBalance && monteCarloResults.medianBalance < 0) {
                const shortfallMagnitude = Math.abs(monteCarloResults.medianBalance);
                const shortfallPenalty = Math.min(25, shortfallMagnitude / targetAssets * 50);
                baseRiskScore += shortfallPenalty;
            }

            // Consider portfolio depletion probability
            if (monteCarloResults.depletionProbability && monteCarloResults.depletionProbability > 0.3) {
                baseRiskScore += monteCarloResults.depletionProbability * 30;
            }
        }

        // Adjust for age - older individuals may need lower risk despite requirements
        const age = inputs.yourCurrentAge;
        if (age > 55) {
            const ageAdjustment = Math.min(15, (age - 55) * 0.8);
            baseRiskScore = Math.max(0, baseRiskScore - ageAdjustment);
        }

        return clamp(baseRiskScore, 0, 100);
    }

    // Intelligent risk alignment assessment with specific recommendations
    analyzeRiskAlignment(capacity, tolerance, requirement, inputs, monteCarloResults = null) {
        const capacityTolerance = Math.abs(capacity - tolerance);
        const capacityRequirement = Math.abs(capacity - requirement);
        const toleranceRequirement = Math.abs(tolerance - requirement);
        const maxDifference = Math.max(capacityTolerance, capacityRequirement, toleranceRequirement);

        let assessment = {
            alignment: 'well-aligned',
            severity: 'low',
            recommendations: [],
            riskWarnings: [],
            opportunities: []
        };

        // Determine alignment severity
        if (maxDifference > 40) {
            assessment.alignment = 'severely-misaligned';
            assessment.severity = 'high';
        } else if (maxDifference > 25) {
            assessment.alignment = 'moderately-misaligned';
            assessment.severity = 'medium';
        } else if (maxDifference > 15) {
            assessment.alignment = 'slightly-misaligned';
            assessment.severity = 'low';
        }

        // Capacity vs Tolerance analysis
        if (capacity > tolerance + 20) {
            assessment.recommendations.push({
                type: 'tolerance-education',
                priority: 'medium',
                title: 'Consider Increasing Risk Tolerance',
                description: `Your financial capacity (${capacity}%) is significantly higher than your comfort level (${tolerance}%). You may be missing growth opportunities due to conservative preferences.`,
                action: 'Review investment education materials and consider gradually increasing equity allocation.'
            });
        } else if (tolerance > capacity + 20) {
            assessment.riskWarnings.push({
                type: 'capacity-constraint',
                priority: 'high',
                title: 'Risk Tolerance Exceeds Capacity',
                description: `Your desired risk level (${tolerance}%) may be too aggressive given your financial capacity (${capacity}%).`,
                action: 'Build emergency fund, reduce debt, or lower risk expectations to match financial reality.'
            });
        }

        // Requirement vs Capacity/Tolerance analysis
        if (requirement > Math.max(capacity, tolerance) + 15) {
            assessment.riskWarnings.push({
                type: 'goal-mismatch',
                priority: 'high',
                title: 'Goals Require Higher Risk Than Comfortable',
                description: `Achieving your retirement goals requires ${requirement}% risk level, but your capacity (${capacity}%) or tolerance (${tolerance}%) may limit this.`,
                action: 'Consider extending retirement age, increasing contributions, or moderating lifestyle goals.'
            });
        } else if (requirement < Math.min(capacity, tolerance) - 20) {
            assessment.opportunities.push({
                type: 'conservative-opportunity',
                priority: 'low',
                title: 'Conservative Strategy May Be Sufficient',
                description: `Your goals only require ${requirement}% risk level, well below your capacity (${capacity}%) and tolerance (${tolerance}%).`,
                action: 'Consider more conservative allocation or explore additional financial goals.'
            });
        }

        // Monte Carlo specific insights
        if (monteCarloResults) {
            if (monteCarloResults.successRate < 0.6) {
                assessment.riskWarnings.push({
                    type: 'low-success-rate',
                    priority: 'high',
                    title: 'Low Retirement Success Probability',
                    description: `Monte Carlo analysis shows only ${(monteCarloResults.successRate * 100).toFixed(0)}% chance of meeting goals.`,
                    action: 'Increase contributions, extend retirement age, or consider more aggressive allocation if capacity allows.'
                });
            }

            if (monteCarloResults.sequenceRisk && monteCarloResults.sequenceRisk > 0.3) {
                assessment.riskWarnings.push({
                    type: 'sequence-risk',
                    priority: 'medium',
                    title: 'High Sequence of Returns Risk',
                    description: 'Early retirement years show vulnerability to market downturns.',
                    action: 'Consider bond tent strategy or delayed retirement to reduce sequence risk.'
                });
            }
        }

        // Age-specific recommendations
        const age = inputs.yourCurrentAge;
        const yearsToRetirement = inputs.retirementAge - age;

        if (yearsToRetirement < 10 && tolerance > 70) {
            assessment.recommendations.push({
                type: 'pre-retirement-derisking',
                priority: 'medium',
                title: 'Consider Pre-Retirement De-Risking',
                description: `With ${yearsToRetirement} years to retirement, high risk tolerance may need adjustment.`,
                action: 'Gradually reduce equity allocation as retirement approaches (bond tent strategy).'
            });
        }

        if (age < 40 && capacity > 70 && tolerance < 50) {
            assessment.opportunities.push({
                type: 'young-conservative',
                priority: 'medium',
                title: 'Time Horizon Advantage Underutilized',
                description: 'Your young age and high capacity suggest you can afford more growth-oriented investments.',
                action: 'Consider education on long-term investing benefits and dollar-cost averaging.'
            });
        }

        return assessment;
    }

    // Risk scenario analysis for stress testing
    calculateRiskScenarios(inputs, monteCarloResults) {
        const scenarios = [];

        // Market crash scenario (2008 GFC style)
        scenarios.push({
            name: 'Market Crash',
            description: '40% portfolio decline in first retirement year',
            impact: 'High negative impact on early retirement cash flows',
            probability: '~10-15% chance in any given decade',
            mitigation: 'Maintain 2-3 years of expenses in cash/bonds'
        });

        // High inflation scenario
        scenarios.push({
            name: 'High Inflation',
            description: '6%+ annual inflation for extended period',
            impact: 'Erodes purchasing power, especially healthcare costs',
            probability: '~20% based on historical patterns',
            mitigation: 'Include inflation-protected securities (TIPS) and real assets'
        });

        // Longevity risk
        const lifeExpectancy = Math.max(
            this.getEffectiveLifespan(inputs.yourLifespan),
            this.getEffectiveLifespan(inputs.partnerLifespan)
        );
        if (lifeExpectancy > 90) {
            scenarios.push({
                name: 'Longevity Risk',
                description: `Living to ${lifeExpectancy}+ requires 30+ year portfolio`,
                impact: 'Portfolio must last longer than typical assumptions',
                probability: '25-30% chance of one spouse living to 90+',
                mitigation: 'Annuities for longevity insurance, maintain equity exposure'
            });
        }

        // Healthcare cost explosion
        scenarios.push({
            name: 'Healthcare Costs',
            description: 'Healthcare inflation exceeds 7% annually',
            impact: 'Significant drain on retirement resources',
            probability: '~40% based on recent trends',
            mitigation: 'Health savings accounts, aged care insurance, healthy lifestyle'
        });

        return scenarios;
    }

    // Dynamic allocation calculations
    calculateDynamicAllocation(age, glidePathRule) {
        const glidePathRules = this.config.GLIDE_PATH_RULES || {};
        const selectedRule = glidePathRules[glidePathRule] || glidePathRules['110minus'];
        const equityPercent = selectedRule(age);
        const allocConfig = this.financialConfig.assetAllocation;
        return {
            equity: equityPercent,
            bonds: Math.max(allocConfig.MINIMUM_ALLOCATIONS.BOND_MIN.value,
                (100 - equityPercent) * allocConfig.DYNAMIC_ALLOCATION_RATIOS.BOND_WEIGHT.value),
            cash: Math.max(allocConfig.MINIMUM_ALLOCATIONS.CASH_MIN.value,
                (100 - equityPercent) * allocConfig.DYNAMIC_ALLOCATION_RATIOS.CASH_WEIGHT.value)
        };
    }

    // Enhanced return calculation with detailed franking credit modeling
    calculateEnhancedReturn(allocation, baseReturn, inputs) {
        // Get detailed franking credit calculation
        const frankingDetails = this.calculateFrankingCredits(allocation, inputs);
        return baseReturn + frankingDetails.totalBenefit;
    }

    // Detailed franking credit calculation with proper dividend modeling
    calculateFrankingCredits(allocation, inputs) {
        // allocation.equity is in percentage units (e.g. 71 for 71%).
        // inputs.australianEquityAllocation is already a decimal fraction from collectInputs() (e.g. 0.40).
        // inputs.dividendYield and inputs.frankingRate are already decimal fractions (e.g. 0.04, 0.75).
        // Do NOT divide by 100 again — collectInputs() already normalises all three.
        const australianEquityAllocation = (allocation.equity / 100) * inputs.australianEquityAllocation;

        // Use user-provided dividend yield and franking rate (already decimals)
        const dividendYield = inputs.dividendYield;
        const frankingRate = inputs.frankingRate;
        const corporateTaxRate = this.financialConfig.australianSystem.CORPORATE_TAX_RATE.value;

        // Calculate gross dividend income from Australian equities
        const grossDividendIncome = australianEquityAllocation * dividendYield;

        // Calculate franked portion
        const frankedDividends = grossDividendIncome * frankingRate;

        // Calculate franking credits (attached tax credits)
        const frankingCredits = frankedDividends * (corporateTaxRate / (1 - corporateTaxRate));

        // Total franking credit benefit depends on investor's marginal tax rate
        // Scale by user input (benefit factor)
        const frankingCreditBenefit = frankingCredits * (inputs.frankingCreditBenefit /
            this.financialConfig.australianSystem.FRANKING_CREDIT_ADJUSTMENT.value);

        return {
            australianEquityAllocation,
            grossDividendIncome,
            frankedDividends,
            frankingCredits,
            frankingCreditBenefit,
            totalBenefit: frankingCreditBenefit, // This is the additional return from franking
            effectiveAdditionalYield: frankingCreditBenefit // For display purposes
        };
    }

    // Calculate franking credit benefit based on tax position (for retirement phase)
    calculateTaxAdjustedFrankingBenefit(frankingCredits, marginalTaxRate = 0) {
        const corporateTaxRate = this.financialConfig?.australianSystem?.CORPORATE_TAX_RATE?.value ?? 0.30;

        if (marginalTaxRate < corporateTaxRate) {
            // Full refund of excess franking credits
            return frankingCredits * (1 - marginalTaxRate / corporateTaxRate);
        } else {
            // Franking credits offset tax liability
            return frankingCredits * (corporateTaxRate / marginalTaxRate);
        }
    }

    /**
     * Sample a lifespan from Australian survival curves (ABS 2020-22 Life Tables).
     * Uses a truncated normal distribution via Box-Muller. Conditional mean is
     * shifted upward when currentAge already exceeds the base modal age (survivorship).
     *
     * @param {number} currentAge
     * @param {'male'|'female'|'unspecified'} gender
     * @returns {number} sampled age of death (integer, clamped to [minAge, maxAge])
     */
    sampleLifespan(currentAge, gender = 'unspecified') {
        const params = (this.config.MORTALITY_PARAMS || {})[gender]
            || { mean: 86, sd: 9.5, minAge: 60, maxAge: 110 };
        // Survivorship: person must survive at least 5 more years from current age
        const conditionalMean = Math.max(params.mean, currentAge + 5);
        // Box-Muller transform for standard normal
        const u1 = Math.max(1e-10, Math.random());
        const z  = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * Math.random());
        const sampled = conditionalMean + z * params.sd;
        return Math.round(Math.max(params.minAge, Math.min(params.maxAge, sampled)));
    }

    // Healthcare cost projection
    // FIX Bug 4: healthcareInflation is already a decimal (e.g. 0.0382 for 3.82%);
    // removed the extra /100 that was making it 100× too small.
    projectHealthcareCosts(currentCosts, years, healthcareInflation) {
        return currentCosts * Math.pow(1 + healthcareInflation, years);
    }

    // Aged care cost calculation
    calculateAgedCareCosts(inputs) {
        const annualCost = inputs.agedCareAnnualCost;
        const yearsToAgedCare = inputs.agedCareStartAge - inputs.yourCurrentAge;
        // FIX Bug 4: healthcareInflation already decimal — no /100 needed.
        const inflatedCost = annualCost * Math.pow(1 + inputs.healthcareInflation, yearsToAgedCare);
        const totalCost = inflatedCost * inputs.agedCareDuration;
        // FIX Bug 8: agedCareProbability is already decimal (e.g. 0.22 = 22%); remove /100.
        const probability = inputs.agedCareProbability;

        return {
            annualCost: inflatedCost,
            totalCost,
            expectedCost: totalCost * probability,
            probability
        };
    }

    // Investment property calculations with cycle-based modeling
    calculatePropertyValue(currentValue, growthRate, years) {
        const { PROPERTY_GROWTH_MAX_RATE, PROPERTY_GROWTH_MIN_RATE, PROPERTY_GROWTH_MAX_YEARS } = this.config.SIMULATION;
        const rate = growthRate > 1 ? growthRate / 100 : growthRate;
        const cappedYears = Math.min(years, PROPERTY_GROWTH_MAX_YEARS);
        // Allow negative rates — property CAN and DOES fall in value.
        // ABS RPPI data: national composite −5.1% (2018), inner-city apartments −12% in single years.
        // Floor at PROPERTY_GROWTH_MIN_RATE (-15%) to prevent extreme tail compounding over many years.
        // Removed the previous Math.max(0, ...) which blocked all negative growth.
        const minRate = PROPERTY_GROWTH_MIN_RATE ?? -0.15;
        const cappedRate = Math.max(minRate, Math.min(rate, PROPERTY_GROWTH_MAX_RATE));
        return currentValue * Math.pow(1 + cappedRate, cappedYears);
    }

    // Enhanced property calculation with Australian cycle patterns.
    // In stochastic mode the per-year return is drawn from a regime-aware distribution
    // centred on the user's baseGrowthRate rather than the hard-coded config cycle mean.
    //
    // Why re-centring is necessary:
    //   The config propertyCycles encode a probability-weighted long-run mean of ~3.6%
    //   (Boom 0.12×0.20 + Peak 0.05×0.10 + Decline -0.05×0.25 + Trough -0.01×0.15
    //    + Recovery 0.07×0.30 = 0.036).  Without adjustment, a user entering 6% property
    //   growth would receive the same MC paths as a user entering 3% — the user input
    //   was only honoured in deterministic mode.
    //
    // Fix: compute the shift = userRate − configMean, then add it to the cycle draw.
    //   This preserves all cycle dynamics (boom/bust shape, serial correlation, volatility)
    //   while anchoring the long-run mean at the user's input.
    //
    // CONFIG_CYCLE_MEAN is the probability-weighted average of propertyCycles baseReturns.
    // It is computed from the config at call time so it updates if the config changes.
    calculateEnhancedPropertyReturn(year, baseGrowthRate, useVolatility = false, prevReturn = null, propertyType = 'house') {
        if (!useVolatility) {
            // In deterministic mode, still apply the structural type adjustment.
            const typeConfig = this.config.INVESTMENT_PROPERTY_TYPES?.[propertyType]
                || this.config.INVESTMENT_PROPERTY_TYPES?.house;
            return baseGrowthRate + (typeConfig?.growthRateAdjustment ?? 0);
        }

        const cyclePhase = getPropertyCyclePhase(year);
        const cycles = this.config.MARKET_REGIMES.propertyCycles;
        const cycleConfig = cycles.find(c => c.phase === cyclePhase)
            || cycles[4]; // Default to recovery

        // Probability-weighted mean of all cycle baseReturns from config.
        const configCycleMean = cycles.reduce((sum, c) => sum + c.baseReturn * c.probability, 0);

        // Regime-aware draw centred on the config cycle's baseReturn.
        const cycleRawReturn = regimeAwareReturn(
            cycleConfig.baseReturn,
            cycleConfig.volatility,
            prevReturn,
            0.15 // Property has higher serial correlation than equities
        );

        // Apply property-type structural adjustment BEFORE shifting to the user's rate.
        // Units/apartments have a long-run structural growth discount of −1.5 pp vs houses
        // (lower land-to-asset ratio; building depreciates while land appreciates).
        // Townhouses: −0.5 pp.  Houses: no adjustment.
        // Source: ABS RPPI 8-city composite 2002–2024 (25-year horizon analysis).
        const typeConfig = this.config.INVESTMENT_PROPERTY_TYPES?.[propertyType]
            || this.config.INVESTMENT_PROPERTY_TYPES?.house;
        const typeAdjustment = typeConfig?.growthRateAdjustment ?? 0;

        // Effective user target = user's entered rate + type adjustment.
        // The cycle is then shifted so its long-run mean lands on this adjusted rate.
        const effectiveUserRate = baseGrowthRate + typeAdjustment;
        const shift = effectiveUserRate - configCycleMean;
        const actualReturn = cycleRawReturn + shift;

        // Floor: use type-specific floor (units can fall harder than houses).
        const typeFloor = typeConfig?.negativeGrowthFloor ?? (this.config.SIMULATION?.PROPERTY_GROWTH_MIN_RATE ?? -0.15);
        return Math.max(typeFloor, actualReturn);
    }

    calculatePropertyLoanBalance(principal, rate, years, isInterestOnly = false) {
        if (isInterestOnly) {
            return principal; // Interest-only loan doesn't reduce principal
        }

        // Calculate as if it's a 30-year loan for monthly payment calculation
        const monthlyRate = rate / 12;
        const totalPayments = 30 * 12; // a 30-year loan
        const monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) /
            (Math.pow(1 + monthlyRate, totalPayments) - 1);

        return calculateLoanBalance(rate, years, monthlyPayment * 12, principal);
    }

    calculatePropertyCashFlow(inputs, year = 0, overrideInflationRate = null) {
        if (!inputs.hasInvestmentProperty) return null;

        // Use overrideInflationRate when provided (stochastic MC run rate) so that
        // rental income and expenses compound at the per-run drawn rate, not the
        // fixed median every time.
        const inflationRate = overrideInflationRate ?? inputs.inflation;
        const vacancyRate = inputs.vacancyRate || 0.04; // default 4% vacancy
        const maintenanceInflationRate = inputs.maintenanceInflation || inflationRate;
        const annualLandTax = (inputs.landTax || 0) * Math.pow(1 + inflationRate, year);

        // Gross rental adjusted for vacancy rate
        const grossRental = inputs.weeklyRentalIncome * 52 * Math.pow(1 + inflationRate, year);
        const currentRental = grossRental * (1 - vacancyRate);

        // Strata levy (units/townhouses only) — separate from annualPropertyExpenses.
        // Strata levies inflate at the general inflation rate (body corp decisions are
        // typically CPI-linked or set at AGM; we use inflationRate as the proxy).
        // For houses, investmentPropertyStrataLevy is 0.
        const annualStrataLevy = (inputs.investmentPropertyStrataLevy || 0)
            * Math.pow(1 + inflationRate, year);

        // Expenses grow at maintenance-specific inflation rate
        const currentExpenses = inputs.annualPropertyExpenses * Math.pow(1 + maintenanceInflationRate, year)
            + annualLandTax
            + annualStrataLevy;

        // Calculate interest cost
        const isIO = inputs.investmentPropertyLoanType === 'io';
        const currentLoanBalance = this.calculatePropertyLoanBalance(
            inputs.investmentPropertyLoan,
            inputs.investmentPropertyRate,
            year,
            isIO
        );
        const annualInterest = currentLoanBalance * inputs.investmentPropertyRate;

        // Calculate depreciation benefit (2.5% of building value, assume 80% of property is building)
        const buildingValue = inputs.investmentPropertyValue *
            this.financialConfig.propertyInvestment.VALUATION_ASSUMPTIONS.BUILDING_VALUE_RATIO.value;
        const depreciation = buildingValue * this.config.PROPERTY_COSTS.DEPRECIATION_RATE;

        return {
            grossRental: grossRental,
            vacancyLoss: grossRental * vacancyRate,
            effectiveRental: currentRental,
            expenses: currentExpenses,
            interestCost: annualInterest,
            depreciation: depreciation,
            netCashFlow: currentRental - currentExpenses - annualInterest + depreciation,
            loanBalance: currentLoanBalance
        };
    }

    calculatePropertySale(inputs, saleYear) {
        if (!inputs.hasInvestmentProperty) return null;

        //   The /100 was removed to standardize the interface - now all callers pass percentage values, and the method
        //   handles the conversion consistently in one place, which is better software engineering practice.
        const saleValue = this.calculatePropertyValue(
            inputs.investmentPropertyValue,
            inputs.propertyGrowthRate,
            saleYear
        );

        const isIO = inputs.investmentPropertyLoanType === 'io';
        const remainingLoan = this.calculatePropertyLoanBalance(
            inputs.investmentPropertyLoan,
            inputs.investmentPropertyRate,
            saleYear,
            isIO
        );

        const sellingCosts = saleValue * this.config.PROPERTY_COSTS.SELLING_COSTS_PERCENT;

        const propertyCostBase = inputs.investmentPropertyPurchasePrice || inputs.investmentPropertyValue;
        const purchaseCalendarYear = inputs.investmentPropertyPurchaseYear
            ? inputs.investmentPropertyPurchaseYear
            : new Date().getFullYear();
        const saleCalendarYear = new Date().getFullYear() + saleYear;
        const holdingPeriodYears = Math.max(1, saleCalendarYear - purchaseCalendarYear);
        const capitalGain = saleValue - propertyCostBase;

        // effectiveCGTRate: capitalGainsTaxRate is stored as the EFFECTIVE rate (marginal × 50% discount)
        const effectiveCGTRate = inputs.capitalGainsTaxRate > 1
            ? inputs.capitalGainsTaxRate / 100
            : inputs.capitalGainsTaxRate;

        // CGT calculation — use current law (50% flat discount) by default.
        // When user has enabled proposed Budget 2026-27 measures AND the sale is post-2027,
        // switch to the inflation-indexed discount with 30% minimum (proposed, not yet law).
        const proposedBudgetEnabled = !!inputs.enableProposedBudget2026;

        let cgtPayable;
        let cgtMethod = 'current-law-50pct-discount';

        if (proposedBudgetEnabled && saleCalendarYear > 2027) {
            // PROPOSED: Budget 2026-27 CGT reform — only when user has opted in.
            // Derives marginal rate from effectiveCGTRate (reverse the 50% discount).
            const marginalRate = Math.min(0.45, effectiveCGTRate * 2);
            const isNewBuild = !!inputs.investmentPropertyIsNewBuild; // false if field absent
            const inflation = inputs.inflation || 0.026;
            const result = calculateCGTPost2027(
                saleValue,
                propertyCostBase,
                purchaseCalendarYear,
                saleCalendarYear,
                marginalRate,
                inflation,
                isNewBuild
            );
            cgtPayable = result.cgt;
            cgtMethod = result.method + ' (proposed)';
        } else {
            // Current law: effectiveCGTRate already incorporates the 50% discount
            cgtPayable = calculateCGT(
                saleValue,
                propertyCostBase,
                true,
                holdingPeriodYears,
                effectiveCGTRate
            );
        }

        const netProceeds = saleValue - remainingLoan - sellingCosts - cgtPayable;

        // Negative gearing restriction (proposed Budget 2026-27 — NOT YET LAW):
        // Established housing purchased after Budget night (13 May 2026) will have losses
        // restricted to offsetting property income only, not wages, from 1 July 2027.
        // We cannot model this as a cash-flow benefit/loss without knowing the investor's
        // marginal rate and total income.  Surface a disclosure note when the user opts in
        // to proposed measures so they can account for it manually.
        const negGearingRestrictionNote = (proposedBudgetEnabled && purchaseCalendarYear >= 2026)
            ? 'Proposed Budget 2026-27: Negative gearing on this established property may be restricted from offsetting wage income from 1 July 2027. New builds remain fully deductible. This restriction is not yet law.'
            : null;

        return {
            saleValue,
            remainingLoan,
            sellingCosts,
            capitalGain,
            cgtPayable,
            cgtMethod,
            negGearingRestrictionNote,
            netProceeds,
            totalReturn: (capitalGain + netProceeds) / inputs.investmentPropertyValue
        };
    }

    // Salary progression with lean years
    getSalaryForYear(baseSalary, year, inputs, isPartner = false, overrideInflationRate = null, overrideSalaryGrowthRate = null) {
        const yearsToRetirement = inputs.retirementAge - inputs.yourCurrentAge;
        // Use override rates when provided (stochastic MC draws) so salary compounds at
        // a different rate per MC run, not the same fixed median every time.
        const realGrowthRate = overrideSalaryGrowthRate ?? inputs.salaryGrowthRate;
        const inflationRate = overrideInflationRate ?? inputs.inflation;

        let salary = baseSalary * Math.pow(1 + realGrowthRate + inflationRate, year);

        const leanYearsStartYear = yearsToRetirement - inputs.leanYearsStart;
        if (year >= leanYearsStartYear) {
            // FIX Bug 3: inputs.leanYearsReduction is already a decimal (e.g. 0.38 = 38%).
            // The previous code divided by 100 again, making the reduction only 0.38%.
            salary *= (1 - inputs.leanYearsReduction);
        }

        // Apply reduced income scenario if enabled.
        // reducedIncomeSalary is in today's dollars, so inflate only from the year
        // of reduction (not from year 0 of the simulation).
        if (inputs.enableReducedIncome) {
            if (isPartner) {
                if (inputs.partnerReducedIncomeAge > 0 && inputs.partnerReducedIncomeSalary > 0 &&
                    inputs.partnerCurrentAge > 0) {
                    const partnerCurrentAge = inputs.partnerCurrentAge + year;
                    if (partnerCurrentAge >= inputs.partnerReducedIncomeAge) {
                        const reductionYear = inputs.partnerReducedIncomeAge - inputs.partnerCurrentAge;
                        const yearsAfterReduction = Math.max(0, year - reductionYear);
                        salary = inputs.partnerReducedIncomeSalary * Math.pow(1 + inflationRate, yearsAfterReduction);
                    }
                }
            } else {
                const currentAge = inputs.yourCurrentAge + year;
                if (inputs.reducedIncomeAge > 0 && inputs.reducedIncomeSalary > 0 &&
                    currentAge >= inputs.reducedIncomeAge) {
                    const reductionYear = inputs.reducedIncomeAge - inputs.yourCurrentAge;
                    const yearsAfterReduction = Math.max(0, year - reductionYear);
                    salary = inputs.reducedIncomeSalary * Math.pow(1 + inflationRate, yearsAfterReduction);
                }
            }
        }

        // Carer income reduction: if caring for parents/family, reduce work capacity
        // for the first carerYearsExpected years of the simulation
        if (!isPartner && inputs.isCarerForParents && inputs.carerYearsExpected > 0
            && year <= inputs.carerYearsExpected) {
            salary *= (1 - (inputs.carerReducedWorkPercent || 0));
        }

        return salary;
    }

    // Return scenario mode adjustments for scenario planning (PART 1)
    _getScenarioAdjustments(scenarioMode) {
        const configured = this.config.SIMULATION?.SCENARIO_ADJUSTMENTS || {};
        const modes = {
            baseline:   { returnDelta: 0, inflationDelta: 0, volatilityMultiplier: 1.0 },
            ...configured,
        };
        return modes[scenarioMode] || modes.baseline;
    }

    // Enhanced portfolio return calculation with market regimes
    getReturnForYear(baseReturn, year, declineRate) {
        const minReturn = this.config.SIMULATION?.MIN_ANNUAL_RETURN ?? 0.01;
        // FIX Bug 6: declineRate (inputs.returnDeclineRate) is already a decimal
        // (e.g. 0.0003 for 0.03% annual decline). The previous /100 made it 100× too small.
        return Math.max(minReturn, baseReturn - declineRate * year);
    }

    // Regime-aware market return calculation
    calculateEnhancedMarketReturn(year, baseReturn, useVolatility = false, prevReturn = null) {
        if (!useVolatility) {
            return baseReturn;
        }

        const rateRegime = getCurrentRateRegime(year + 2024);

        // Select equity market regime based on historical patterns
        const equityRegimes = this.config.MARKET_REGIMES.equityMarketRegimes;
        const rand = Math.random();
        let cumWeight = 0;
        let selectedRegime = equityRegimes[1]; // Default to normal

        for (const regime of equityRegimes) {
            cumWeight += regime.probability;
            if (rand <= cumWeight) {
                selectedRegime = regime;
                break;
            }
        }

        // Calculate regime-aware return
        let actualReturn = regimeAwareReturn(
            selectedRegime.baseReturn,
            selectedRegime.volatility,
            prevReturn,
            0.05 // Lower correlation for diversified portfolios
        );

        // Adjust for interest rate environment (inverse relationship)
        const rateAdjustment = (0.045 - rateRegime.rate) * 0.5;
        actualReturn += rateAdjustment;

        return actualReturn;
    }

    // Calculate the base equity return by de-leveraging the portfolio return
    // NOTE: allocations parameter should contain decimal values (0.60, 0.30, 0.10), not percentages (60, 30, 10)
    getEquityBaseReturn(portfolioReturn, allocations, bondMultiplier, cashBaseReturn) {
        const allocEquities = allocations.equity || 0;
        const allocBonds = allocations.bonds || 0;
        const allocCash = allocations.cash || 0;

        const numerator = portfolioReturn - (allocCash * cashBaseReturn);
        const denominator = allocEquities + (allocBonds * bondMultiplier);

        // Return 0 if the portfolio is all cash or the denominator is non-positive
        return (denominator > 0) ? (numerator / denominator) : 0;
    }

    calculatePortfolioReturn(allocations, baseReturn, year, declineRate, useVolatility = false) {
        // Fetch fixed configuration values
        const returnExpectations = this.financialConfig.assetAllocation.RETURN_EXPECTATIONS;
        const baseReturnAssumptions = this.financialConfig.monteCarloSimulation.BASE_RETURN_ASSUMPTIONS;

        const bondMultiplier = returnExpectations.BOND_MULTIPLIER.value;
        const cashBaseReturn = baseReturnAssumptions.CASH_BASE_RETURN.value;

        // Convert allocations from percentages to decimals once at the start
        const allocEquities = (allocations.equity || 0) / 100;
        const allocBonds = (allocations.bonds || 0) / 100;
        const allocCash = (allocations.cash || 0) / 100;

        // Create decimal allocations object for getEquityBaseReturn
        const decimalAllocations = {
            equity: allocEquities,
            bonds: allocBonds,
            cash: allocCash
        };

        // Calculate the underlying base equity return (de-leverage)
        const equityBase = this.getEquityBaseReturn(baseReturn, decimalAllocations, bondMultiplier, cashBaseReturn);

        if (useVolatility) {
            // STOCHASTIC: Generate returns using the dedicated engine
            const baseReturnsForScenario = {
                equity: equityBase,
                bonds: equityBase * bondMultiplier,
                // Include other assets as needed, e.g., property
                property: equityBase * baseReturnAssumptions.PROPERTY_MULTIPLIER.value,
                cash: cashBaseReturn
            };

            const randomReturns = this.enhancedMonteCarloEngine.generateRegimeAwareReturns(
                baseReturnsForScenario,
                year // pass year for time-series modeling/regime changes
            );

            return allocEquities * randomReturns.equity +
                allocBonds * randomReturns.bonds +
                allocCash * randomReturns.cash;
        } else {
            // DETERMINISTIC: Use the de-leveraged base returns with time-based decline
            // Note: declineRate is now an equity-specific input. Bond decline rate is scaled.
            const deterministicEquityReturn = this.getReturnForYear(equityBase, year, declineRate);
            // Use a configuration value for bond decline rate if possible, or stick to the existing assumption
            const deterministicBondReturn = this.getReturnForYear(
                equityBase * bondMultiplier,
                year,
                declineRate * returnExpectations.BOND_DECLINE_MULTIPLIER.value // Preferred: use config value
            );

            return allocEquities * deterministicEquityReturn +
                allocBonds * deterministicBondReturn +
                allocCash * cashBaseReturn; // Cash return is fixed for deterministic scenarios
        }
    }

    // Main simulation engine
    simulateRetirement(inputs, useRandomReturns = false, stressScenario = null, scenarioReturns = null) {
        // Reset previous returns for each simulation.
        // investmentProperty and primaryHome are tracked separately so their respective
        // serial-correlation paths do not contaminate each other.
        this.previousReturns = {
            portfolio: null,
            property: null,          // used by accumulation-phase investment property
            investmentProperty: null, // retirement-phase investment property
            primaryHome: null         // retirement-phase primary home (separate state)
        };

        // Apply scenario mode adjustments (PART 1)
        const scenarioAdjustments = this._getScenarioAdjustments(inputs.scenarioMode || 'baseline');
        const effectiveInputs = scenarioAdjustments
            ? {
                ...inputs,
                investmentReturn: inputs.investmentReturn + scenarioAdjustments.returnDelta,
                superReturn: inputs.superReturn + scenarioAdjustments.returnDelta,
                savingsReturn: inputs.savingsReturn + scenarioAdjustments.returnDelta,
                inflation: inputs.inflation + scenarioAdjustments.inflationDelta,
                returnVolatility: inputs.returnVolatility * scenarioAdjustments.volatilityMultiplier
            }
            : inputs;

        const effectiveYourLifespan = this.getEffectiveLifespan(inputs.yourLifespan);
        const effectivePartnerLifespan = inputs.isSingleCalculation
            ? 0
            : this.getEffectiveLifespan(inputs.partnerLifespan);
        const maxLifespan = Math.max(effectiveYourLifespan, effectivePartnerLifespan);
        const yearsToRetirement = Math.max(0, inputs.retirementAge - inputs.yourCurrentAge);

        // ── Per-run stochastic rates ──────────────────────────────────────────────
        // All compound formulas of the form Math.pow(1 + rate, n) use one of these
        // drawn rates so that every MC run compounds at a different rate while still
        // using the correct compounding formula.  In deterministic mode they equal
        // the user-entered median values unchanged.
        //
        // Drawing once per run (rather than per year) is correct for quantities that
        // require a single snapshot value (home at retirement, salary path baseline,
        // etc.).  Quantities that are re-calculated each year inside the loop (savings
        // return, super return, retirement inflation) already use per-year draws via
        // stochasticRate() and are unaffected by these run-level draws.
        const runInflationRate      = stochasticRate(inputs.inflation,            useRandomReturns, 0.001);
        const runHealthcareInflRate = stochasticRate(inputs.healthcareInflation || 0.065, useRandomReturns, 0.01);
        const runSalaryGrowthRate   = stochasticRate(inputs.salaryGrowthRate || 0.02,     useRandomReturns, 0);
        // NOTE: property growth is NOT drawn as a single per-run rate here.
        // Instead, calculateEnhancedPropertyReturn() is called each year inside the
        // accumulation and retirement loops so each year can experience a different
        // regime-aware return (including negative years).  The user's propertyGrowthRate
        // is used to re-centre those per-year draws — see COP-4 fix in
        // calculateEnhancedPropertyReturn().

        // Calculate total simulation years based on the maximum lifespan from current age
        const maxYearsFromNow = Math.max(
            effectiveYourLifespan - inputs.yourCurrentAge,
            effectivePartnerLifespan - inputs.partnerCurrentAge
        );
        const yearsInRetirement = Math.max(0, maxYearsFromNow - yearsToRetirement + 1);

        // Use scenario-adjusted inputs for all financial calculations
        inputs = effectiveInputs; // eslint-disable-line no-param-reassign

        // Pre-retirement accumulation phase
        let yourSuperBalance = inputs.yourCurrentSuper || 0;
        let partnerSuperBalance = inputs.partnerCurrentSuper || 0;
        let accumulatedSuperBalance = yourSuperBalance + partnerSuperBalance;
        // Reduce starting savings by non-mortgage debts (these are liabilities against net worth)
        const totalOtherDebts = (inputs.creditCardBalance || 0) + (inputs.personalLoanBalance || 0) + (inputs.carLoanBalance || 0);
        let accumulatedSavingsBalance = Math.max(0, inputs.currentSavings - totalOtherDebts);
        let accumulatedInvestmentPortfolio = inputs.currentStocks;
        let propertyWasSold = false;
        let propertyEquity = 0;
        const nccCaps = {
            annual: this.config.NON_CONCESSIONAL_CAP || 120000,
            blockThreshold: this.config.TSB_NCC_BLOCK_THRESHOLD || 2000000,
            threshold3Year: this.config.NCC_BRING_FORWARD_3YR_THRESHOLD || 1660000,
            threshold2Year: this.config.NCC_BRING_FORWARD_2YR_THRESHOLD || 1780000,
            threshold1Year: this.config.NCC_BRING_FORWARD_1YR_THRESHOLD || 1900000,
            cap3Year: this.config.NCC_BRING_FORWARD_3YR_CAP || 360000,
            cap2Year: this.config.NCC_BRING_FORWARD_2YR_CAP || 240000
        };
        const nccState = {
            your: { remainingCap: null, windowEndYear: 0 },
            partner: { remainingCap: null, windowEndYear: 0 }
        };
        const applyProportionalSuperReduction = (amount) => {
            if (amount <= 0) return;
            const totalBalance = yourSuperBalance + partnerSuperBalance;
            if (totalBalance <= 0) return;

            const yourShare = yourSuperBalance / totalBalance;
            const partnerShare = 1 - yourShare;
            yourSuperBalance = Math.max(0, yourSuperBalance - (amount * yourShare));
            partnerSuperBalance = Math.max(0, partnerSuperBalance - (amount * partnerShare));
        };
        const getBringForwardWindow = (openingBalance) => {
            if (openingBalance >= nccCaps.blockThreshold) {
                return { totalCap: 0, years: 0 };
            }
            if (openingBalance < nccCaps.threshold3Year) {
                return { totalCap: nccCaps.cap3Year, years: 3 };
            }
            if (openingBalance < nccCaps.threshold2Year) {
                return { totalCap: nccCaps.cap2Year, years: 2 };
            }
            if (openingBalance < nccCaps.threshold1Year) {
                return { totalCap: nccCaps.annual, years: 1 };
            }
            return { totalCap: 0, years: 0 };
        };
        const calculateAllowedNcc = (requestedAmount, openingBalance, memberState, year) => {
            if (requestedAmount <= 0) {
                return 0;
            }

            // Once a bring-forward window is triggered, the remaining cap stays attached to
            // that person for the rest of the statutory window instead of collapsing into a
            // household-wide lockout.
            if (memberState.windowEndYear >= year && memberState.remainingCap !== null) {
                const allowedDuringWindow = Math.min(requestedAmount, memberState.remainingCap);
                memberState.remainingCap -= allowedDuringWindow;
                if (memberState.remainingCap <= 0) {
                    memberState.remainingCap = 0;
                }
                return allowedDuringWindow;
            }

            const eligibility = getBringForwardWindow(openingBalance);
            if (eligibility.totalCap <= 0) {
                memberState.remainingCap = null;
                memberState.windowEndYear = 0;
                return 0;
            }

            const allowedAmount = Math.min(requestedAmount, eligibility.totalCap);
            const triggeredBringForward = eligibility.years > 1 && allowedAmount > nccCaps.annual;

            if (triggeredBringForward) {
                memberState.windowEndYear = year + eligibility.years - 1;
                memberState.remainingCap = Math.max(0, eligibility.totalCap - allowedAmount);
            } else {
                memberState.remainingCap = null;
                memberState.windowEndYear = 0;
            }

            return allowedAmount;
        };

        const allocationHistory = [];
        const healthcareCostHistory = [];
        const propertyHistory = [];
        const regimeHistory = []; // Track regime changes for enhanced MC
        const accumulationHistory = [];
        const currentCalendarYear = new Date().getFullYear();
        const homeGrowthRateAssumption = inputs.propertyGrowthRate > 0 ? inputs.propertyGrowthRate : inputs.inflation;

        // Running primary home value tracked year-by-year through the accumulation loop.
        // In MC mode: updated each year with calculateEnhancedPropertyReturn() so the home
        // can have negative growth years (rate-hike corrections, oversupply). This produces a
        // realistic path-dependent value at retirement rather than a single smooth compound.
        // In deterministic mode: advances at the fixed rate each year (same net result as Math.pow).
        // previousPrimaryHomeReturn: seed for serial correlation in the property cycle model.
        let accumulationPrimaryHomeValue = inputs.homeValue > 0 ? inputs.homeValue : 0;
        let previousPrimaryHomeReturn = null;

        // Running investment property value tracked year-by-year through the accumulation loop.
        // Exactly mirrors the primary home pattern. The per-year return is drawn from
        // calculateEnhancedPropertyReturn() with the investment property's type applied.
        // This value at end-of-accumulation becomes the retirement-phase seed (ipValueAtRetirement),
        // ensuring the retirement loop starts from the correct path-dependent value, not a
        // fresh Math.pow compound from the original purchase price.
        let accumulationIPValue = inputs.hasInvestmentProperty
            ? (inputs.investmentPropertyValue || 0)
            : 0;
        let previousAccumulationIPReturn = null;

        const getHomeEquityAtYear = (yearsElapsed) => {
            if (!(inputs.homeValue > 0)) return 0;
            // In MC mode accumulationPrimaryHomeValue is already the path-tracked value —
            // we just need to subtract the outstanding mortgage balance.
            // In deterministic mode it also advances year-by-year identically, so the same
            // formula applies in both modes.
            const projectedMortgageBalance = Math.max(0,
                calculateLoanBalance(inputs.mortgageRate, yearsElapsed, inputs.monthlyMortgagePayment, inputs.mortgageBalance)
            );
            return Math.max(0, accumulationPrimaryHomeValue - projectedMortgageBalance);
        };
        const pushAccumulationSnapshot = (yearsElapsed, age, projectedPropertyEquity = null) => {
            const nonSuperLiquidAssets = accumulatedSavingsBalance + accumulatedInvestmentPortfolio;
            const propertyEquityForYear = propertyWasSold
                ? 0
                : (projectedPropertyEquity ?? ((inputs.investmentPropertyValue || 0) - (inputs.investmentPropertyLoan || 0)));
            const nonLiquidAssets = getHomeEquityAtYear(yearsElapsed) + propertyEquityForYear;
            accumulationHistory.push({
                year: currentCalendarYear + yearsElapsed,
                age,
                superBalance: accumulatedSuperBalance,
                nonSuperLiquidAssets,
                liquidAssets: accumulatedSuperBalance + nonSuperLiquidAssets,
                nonLiquidAssets,
                totalAssets: accumulatedSuperBalance + nonSuperLiquidAssets + nonLiquidAssets,
                retired: false,
                withdrawal: 0,
                pensionIncome: 0,
                otherIncome: 0
            });
        };

        pushAccumulationSnapshot(0, inputs.yourCurrentAge);

        // Pre-retirement simulation
        const simulationEndYear = inputs.isSingleCalculation ?
            Math.max(yearsToRetirement, effectiveYourLifespan - inputs.yourCurrentAge) :
            Math.max(yearsToRetirement, effectiveYourLifespan - inputs.yourCurrentAge, effectivePartnerLifespan - inputs.partnerCurrentAge);

        for (let year = 1; year <= simulationEndYear; year++) {
            const yourCurrentAge = inputs.yourCurrentAge + year;
            const partnerCurrentAge = inputs.isSingleCalculation ? 0 : inputs.partnerCurrentAge + year;
            const yourOpeningSuperBalance = yourSuperBalance;
            const partnerOpeningSuperBalance = partnerSuperBalance;

            // Stop simulation based on single vs couple status
            if (inputs.isSingleCalculation) {
                if (yourCurrentAge > effectiveYourLifespan) {
                    break;
                }
            } else {
                // Stop simulation if both have passed away
                if (yourCurrentAge > effectiveYourLifespan && partnerCurrentAge > effectivePartnerLifespan) {
                    break;
                }
            }

            // Dynamic allocation
            let allocation;
            if (inputs.useGlidePath) {
                allocation = this.calculateDynamicAllocation(yourCurrentAge, inputs.glidePathRule);
            } else {
                // Convert decimal from input to percentage for consistent use
                allocation = {
                    equity: inputs.allocEquities * 100,
                    bonds: inputs.allocBonds * 100,
                    cash: inputs.allocCash * 100
                };
            }
            if (yourCurrentAge <= inputs.retirementAge) {
                allocationHistory.push(allocation);
            }


            // Enhanced returns with franking credits and regime modeling
            const baseReturn = this.calculateEnhancedReturn(
                allocation,
                inputs.investmentReturn,
                inputs
            );

            let returnRate = baseReturn;

            // Use scenario returns if provided (for enhanced Monte Carlo)
            if (scenarioReturns && scenarioReturns[year - 1]) {
                const scenarioReturn = scenarioReturns[year - 1];
                returnRate = (allocation.equity / 100) * scenarioReturn.equity +
                    (allocation.bonds / 100) * scenarioReturn.bonds +
                    (allocation.cash / 100) * scenarioReturn.cash;

                // Track regime information for analysis
                if (scenarioReturn.regimeInfo) {
                    regimeHistory.push({
                        year,
                        ...scenarioReturn.regimeInfo
                    });
                }
            } else if (useRandomReturns) {
                // Use enhanced portfolio return with regime modeling
                returnRate = this.calculatePortfolioReturn(
                    allocation,
                    baseReturn,
                    year,
                    inputs.returnDeclineRate || 0.03,
                    true,
                    this.previousReturns.portfolio
                );
                this.previousReturns.portfolio = returnRate;
            } else {
                // Use traditional calculation for deterministic scenarios
                returnRate = this.calculatePortfolioReturn(
                    allocation,
                    baseReturn,
                    year,
                    inputs.returnDeclineRate || 0.03,
                    false
                );
            }

            // Apply stress scenario if provided.
            // isRetirementTimed scenarios (COVID, GFC) are only meant to shock the
            // retirement-phase drawdown loop, not the accumulation phase — applying them
            // in both loops would double-count the shock.  Skip yearlyEquityReturns here
            // when isRetirementTimed is set; flat equityReturn scenarios without that flag
            // are still applied during accumulation (e.g. Property Market Correction).
            if (stressScenario && year <= stressScenario.duration) {
                if (stressScenario.yearlyEquityReturns && !stressScenario.isRetirementTimed) {
                    const idx = year - 1;
                    const eqRet = stressScenario.yearlyEquityReturns[idx] ?? 0;
                    const bdRet = stressScenario.yearlyBondReturns
                        ? (stressScenario.yearlyBondReturns[idx] ?? 0.02)
                        : 0.02;
                    returnRate = (allocation.equity / 100) * eqRet +
                        (allocation.bonds / 100) * bdRet +
                        (allocation.cash / 100) * 0.01;
                } else if (stressScenario.equityReturn && !stressScenario.isRetirementTimed) {
                    returnRate = (allocation.equity / 100) * stressScenario.equityReturn +
                        (allocation.bonds / 100) * (stressScenario.bondReturn || 0.02) +
                        (allocation.cash / 100) * 0.01;
                }
            }

            // Update primary home value year-by-year.
            // MC mode: uses calculateEnhancedPropertyReturn() with serial correlation so the
            // home follows realistic boom/bust cycles and CAN be negative in individual years.
            // Deterministic mode: advances at the fixed median rate each year.
            if (accumulationPrimaryHomeValue > 0) {
                if (useRandomReturns) {
                    const yearlyHomeReturn = this.calculateEnhancedPropertyReturn(
                        year,
                        homeGrowthRateAssumption,
                        true,
                        previousPrimaryHomeReturn
                    );
                    previousPrimaryHomeReturn = yearlyHomeReturn;
                    accumulationPrimaryHomeValue = Math.max(0, accumulationPrimaryHomeValue * (1 + yearlyHomeReturn));
                } else {
                    accumulationPrimaryHomeValue *= (1 + homeGrowthRateAssumption);
                }
            }

            // Apply returns — super and savings use stochastic rates in Monte Carlo mode
            // (user-entered rate treated as median; each year perturbed ±[−4.5pp, +3.5pp])
            const yearSuperReturn = stochasticRate(inputs.superReturn, useRandomReturns, 0);
            const yearSavingsReturn = stochasticRate(inputs.savingsReturn, useRandomReturns, 0);
            const yourSuperEarningsThisYear = yourSuperBalance * yearSuperReturn;
            const partnerSuperEarningsThisYear = partnerSuperBalance * yearSuperReturn;
            const superEarningsThisYear = yourSuperEarningsThisYear + partnerSuperEarningsThisYear;
            yourSuperBalance += yourSuperEarningsThisYear;
            partnerSuperBalance += partnerSuperEarningsThisYear;
            accumulatedSuperBalance = yourSuperBalance + partnerSuperBalance;
            accumulatedSavingsBalance *= (1 + yearSavingsReturn);
            accumulatedInvestmentPortfolio *= (1 + returnRate);

            // Division 296 Tax — effective 1 July 2026 (already law).
            // Additional 15% on super earnings proportional to balance above $3M.
            const div296Threshold = this.config.DIVISION_296_THRESHOLD || 3000000;
            const div296Year = new Date().getFullYear() + year;
            if (div296Year >= 2027 && accumulatedSuperBalance > div296Threshold && superEarningsThisYear > 0) {
                const excessProportion = (accumulatedSuperBalance - div296Threshold) / accumulatedSuperBalance;
                const div296Tax = superEarningsThisYear * excessProportion * (this.config.DIVISION_296_RATE || 0.15);
                applyProportionalSuperReduction(div296Tax);
                accumulatedSuperBalance = yourSuperBalance + partnerSuperBalance;
            }

            // Deduct SMSF admin costs from super balance
            if (inputs.hasSMSF && inputs.smsfAdminCosts > 0) {
                applyProportionalSuperReduction(inputs.smsfAdminCosts);
                accumulatedSuperBalance = yourSuperBalance + partnerSuperBalance;
            }

            // Add contributions
            const yourYearsToWork = Math.min(inputs.retirementAge, effectiveYourLifespan) - inputs.yourCurrentAge;
            const partnerYearsToWork = Math.min(inputs.partnerRetirementAge, effectivePartnerLifespan) - inputs.partnerCurrentAge;

            // Year-specific tax rules:
            // projectionYear maps simulation year to a calendar year for bracket selection.
            const projectionYear = new Date().getFullYear() + year;

            // enableProposedBudget2026: user-controlled toggle (default false).
            // When false, only legislated law is applied. When true, proposed Budget
            // 2026-27 measures are also modelled (14% bracket, WATO, instant deduction,
            // CGT reform). These measures are NOT yet passed by Parliament.
            const proposedEnabled = !!inputs.enableProposedBudget2026;

            // Tax brackets:
            // • 15% rate from 1 July 2026 (FY 2026-27) — LEGISLATED (Stage 3 redesign)
            // • 14% rate from 1 July 2027 (FY 2027-28) — PROPOSED Budget 2026-27 only
            let taxBrackets;
            if (proposedEnabled && projectionYear >= 2028 && this.config.TAX_BRACKETS_2027_28) {
                taxBrackets = this.config.TAX_BRACKETS_2027_28;   // 14% — proposed only
            } else if (projectionYear >= 2027 && this.config.TAX_BRACKETS_2026_27) {
                taxBrackets = this.config.TAX_BRACKETS_2026_27;   // 15% — legislated
            } else {
                taxBrackets = this.config.TAX_BRACKETS;            // 16% — current FY
            }

            // LISTO threshold change from FY 2027-28 ($37k→$45k) is tied to the same
            // Budget 2026-27 package, so guard it behind the same flag.
            const listoThreshold = (proposedEnabled && projectionYear >= 2028) ? 45000 : 37000;
            const listoMaxOffset  = (proposedEnabled && projectionYear >= 2028) ? 810   : 500;
            const hasPrivateCover = inputs.hasPrivateHealthCover !== false;
            // div293Threshold removed — Division 293 is now computed inside calcSuperTax()
            // from tax_engine.js using DIVISION_293_THRESHOLD from that module (TASK-002).

            let yearlyPostTaxIncome = 0;
            let yearlySuperContribution = 0;
            let yourNetSuperContribution = 0;
            let partnerNetSuperContribution = 0;

            // TSB gate: when combined super approaches the Transfer Balance Cap, block voluntary
            // contributions (salary sacrifice). Employer SG is mandatory and continues.
            const tbcThreshold = this.config.TRANSFER_BALANCE_CAP || 2000000;
            const superIsCapped = accumulatedSuperBalance >= tbcThreshold;

            // Year 1 only: if user has already used some concessional cap this FY, reduce available room.
            // Declared here so both person and partner if-blocks can reference it.
            const concessionalAlreadyUsed = (year === 1) ? (inputs.concessionalCapUsed || 0) : 0;

            if (year <= yourYearsToWork) {
                const yourGrossSalary = this.getSalaryForYear(inputs.yourSalary, year, inputs, false,
                    useRandomReturns ? runInflationRate : null,
                    useRandomReturns ? runSalaryGrowthRate : null);
                // Salary sacrifice: voluntary pre-tax super, capped so total concessional ≤ $30,000.
                // Blocked entirely when TSB ≥ Transfer Balance Cap.
                const effectiveEmployerRate = inputs.employerSuperContributionRate ?? inputs.superContributionRate ?? getSGRate(projectionYear);
                const yourEmployerSG = yourGrossSalary * effectiveEmployerRate;
                const yourSacrifice = superIsCapped ? 0 : Math.min(
                    inputs.yourAdditionalSuperContribution || 0,
                    Math.max(0, 30000 - yourEmployerSG - concessionalAlreadyUsed)
                );
                const yourTaxableSalary = yourGrossSalary - yourSacrifice;
                // Pass proposedEnabled so WATO and instant deduction only apply when user opts in.
                yearlyPostTaxIncome += calculatePostTaxIncome(yourTaxableSalary, taxBrackets, hasPrivateCover, projectionYear, proposedEnabled);

                // TASK-002: Use calcSuperTax() (canonical function from tax_engine.js)
                // instead of inline arithmetic. calcSuperTax returns (baseTax + Div293).
                // LISTO (Low Income Super Tax Offset) is a genuine additional offset that
                // is not included in calcSuperTax, so it is applied separately.
                const yourTotalConcessional = yourEmployerSG + yourSacrifice;
                const yourSuperTax = calcSuperTax(yourTaxableSalary, yourTotalConcessional);
                const yourLISTO = yourTaxableSalary <= listoThreshold
                    ? Math.min(yourTotalConcessional * 0.15, listoMaxOffset)
                    : 0;
                yourNetSuperContribution = yourTotalConcessional - yourSuperTax + yourLISTO;
                yearlySuperContribution += yourNetSuperContribution;
            }
            if (year <= partnerYearsToWork) {
                const partnerGrossSalary = this.getSalaryForYear(inputs.partnerSalary, year, inputs, true,
                    useRandomReturns ? runInflationRate : null,
                    useRandomReturns ? runSalaryGrowthRate : null);
                const effectiveEmployerRate = inputs.employerSuperContributionRate ?? inputs.superContributionRate ?? getSGRate(projectionYear);
                const partnerEmployerSG = partnerGrossSalary * effectiveEmployerRate;
                const partnerSacrifice = superIsCapped ? 0 : Math.min(
                    inputs.partnerAdditionalSuperContribution || 0,
                    Math.max(0, 30000 - partnerEmployerSG - concessionalAlreadyUsed)
                );
                const partnerTaxableSalary = partnerGrossSalary - partnerSacrifice;
                // Pass proposedEnabled so WATO and instant deduction only apply when user opts in.
                yearlyPostTaxIncome += calculatePostTaxIncome(partnerTaxableSalary, taxBrackets, hasPrivateCover, projectionYear, proposedEnabled);

                // TASK-002: Same canonical calcSuperTax() call for partner.
                const partnerTotalConcessional = partnerEmployerSG + partnerSacrifice;
                const partnerSuperTax = calcSuperTax(partnerTaxableSalary, partnerTotalConcessional);
                const partnerLISTO = partnerTaxableSalary <= listoThreshold
                    ? Math.min(partnerTotalConcessional * 0.15, listoMaxOffset)
                    : 0;
                partnerNetSuperContribution = partnerTotalConcessional - partnerSuperTax + partnerLISTO;
                yearlySuperContribution += partnerNetSuperContribution;
            }

            yourSuperBalance += yourNetSuperContribution;
            partnerSuperBalance += partnerNetSuperContribution;
            accumulatedSuperBalance = yourSuperBalance + partnerSuperBalance;

            // NCC (Non-Concessional Contributions) — after-tax, no contributions tax on entry.
            // Each member has their own bring-forward window and remaining cap. Eligibility
            // is assessed against that person's opening super balance for the year, and any
            // unused bring-forward amount carries through the rest of the statutory window.
            if (year <= yourYearsToWork || year <= partnerYearsToWork) {
                const yourAllowedNcc = year <= yourYearsToWork
                    ? calculateAllowedNcc(inputs.yourAnnualNCC || 0, yourOpeningSuperBalance, nccState.your, year)
                    : 0;
                const partnerAllowedNcc = year <= partnerYearsToWork
                    ? calculateAllowedNcc(inputs.partnerAnnualNCC || 0, partnerOpeningSuperBalance, nccState.partner, year)
                    : 0;

                yourSuperBalance += yourAllowedNcc;
                partnerSuperBalance += partnerAllowedNcc;
                accumulatedSuperBalance = yourSuperBalance + partnerSuperBalance;
            }

            const annualDetailedExpenses = inputs.useDetailedExpenseInputs
                ? (((inputs.currentMonthlyHousingCosts || 0) + (inputs.currentMonthlyLivingCosts || 0)) * 12) + (inputs.currentHealthcareCosts || 0)
                : null;
            const annualCashSavings = inputs.useDetailedExpenseInputs
                ? Math.max(0, yearlyPostTaxIncome - annualDetailedExpenses)
                : Math.max(0, yearlyPostTaxIncome * (inputs.percentIncomeSaved || 0));
            accumulatedSavingsBalance += annualCashSavings;

            // High-interest debt drag: annual interest on credit card/personal loan/car loan
            // Model assumes debts are paid off within ~5 years (repayments reduce balance over time)
            if (year <= 5 && totalOtherDebts > 0) {
                const debtYearFraction = Math.max(0, 1 - (year - 1) / 5); // Linear paydown over 5 years
                const annualDebtInterest = (inputs.creditCardBalance || 0) * (inputs.creditCardRate || 0.2) * debtYearFraction
                    + (inputs.personalLoanBalance || 0) * (inputs.personalLoanRate || 0.09) * debtYearFraction
                    + (inputs.carLoanBalance || 0) * (inputs.carLoanRate || 0.08) * debtYearFraction;
                accumulatedSavingsBalance = Math.max(0, accumulatedSavingsBalance - annualDebtInterest);
            }

            // Additional income sources: business profit + investment distributions (outside super)
            // These grow in savings at the savings return rate (not the investment return rate)
            if ((inputs.businessIncome || 0) > 0 || (inputs.investmentIncome || 0) > 0) {
                const extraIncome = (inputs.businessIncome || 0) + (inputs.investmentIncome || 0);
                // Apply a simplified 30% average tax rate on business/investment income
                const afterTaxExtra = extraIncome * 0.70;
                // Save a portion (same as percentIncomeSaved) and add the rest to savings
                const extraIncomeSavingsRate = inputs.useDetailedExpenseInputs ? 1.0 : Math.max(0.5, inputs.percentIncomeSaved || 0.1);
                accumulatedSavingsBalance += afterTaxExtra * extraIncomeSavingsRate;
            }

            // Carer expense: direct annual financial support to aged parents/family (inflated)
            if (inputs.isCarerForParents && inputs.carerAnnualExpense > 0
                && year <= inputs.carerYearsExpected) {
                const inflatedCarerExpense = inputs.carerAnnualExpense * Math.pow(1 + runInflationRate, year);
                accumulatedSavingsBalance = Math.max(0, accumulatedSavingsBalance - inflatedCarerExpense);
            }

            // LHC loading: annual additional premium cost when cover was taken out after age 30
            if (inputs.ageFirstPrivateCover && inputs.hasPrivateHealthCover) {
                const ageFirstCoverVal = inputs.ageFirstPrivateCover;
                const yearsWithoutCover = Math.max(0, ageFirstCoverVal - 30);
                const simCurrentAge = inputs.yourCurrentAge + year - 1;
                const yearsCovered = simCurrentAge - ageFirstCoverVal;
                const loadingCleared = yearsCovered >= (this.config.LHC_CLEAR_AFTER_YEARS || 10);
                const loadingPct = loadingCleared ? 0 : Math.min(
                    this.config.LHC_LOADING_MAX || 0.70,
                    yearsWithoutCover * (this.config.LHC_LOADING_RATE || 0.02)
                );
                if (loadingPct > 0) {
                    const basePremium = inputs.isSingleCalculation
                        ? (this.config.LHC_BASE_PREMIUMS?.single || 2800)
                        : (this.config.LHC_BASE_PREMIUMS?.couple || 5200);
                    const lhcAnnualCost = basePremium * loadingPct * Math.pow(1 + runInflationRate, year - 1);
                    accumulatedSavingsBalance = Math.max(0, accumulatedSavingsBalance - lhcAnnualCost);
                }
            }

            accumulatedInvestmentPortfolio += inputs.monthlyStockContribution * 12;

            // Deduct education costs for dependent children (PART 4)
            if (inputs.educationCostPerChild > 0) {
                const childCount = (inputs.childrenUnder5 || 0) + (inputs.childrenPrimary || 0) + (inputs.teenagers || 0);
                let annualEdCost = inputs.educationCostPerChild * childCount;
                if (inputs.privateSchool) {
                    annualEdCost += 25000 * childCount; // private school premium ~$25k/child
                }
                if (inputs.universitySupport) {
                    annualEdCost += 15000 * childCount; // university support ~$15k/child
                }
                annualEdCost *= Math.pow(1 + runInflationRate, year); // inflate over time
                accumulatedSavingsBalance = Math.max(0, accumulatedSavingsBalance - annualEdCost);
            }

            // Property calculations
            if (inputs.hasInvestmentProperty && yourCurrentAge <= inputs.retirementAge) {
                const propertyCashFlow = this.calculatePropertyCashFlow(inputs, year, useRandomReturns ? runInflationRate : null);
                if (propertyCashFlow) {
                    propertyHistory.push(propertyCashFlow);

                    // Add property cash flow to savings
                    accumulatedSavingsBalance += propertyCashFlow.netCashFlow;

                    // Check if property should be sold
                    if (inputs.sellPropertyYears > 0 && year === inputs.sellPropertyYears) {
                        const saleResult = this.calculatePropertySale(inputs, year);
                        if (saleResult) {
                            accumulatedInvestmentPortfolio += saleResult.netProceeds;
                            propertyWasSold = true;
                            propertyHistory[propertyHistory.length - 1].saleResult = saleResult;
                        }
                    } else {
                        // Update investment property value incrementally each year — same pattern
                        // as accumulationPrimaryHomeValue — using calculateEnhancedPropertyReturn()
                        // with the property type applied.
                        //
                        // IMPORTANT: do NOT call calculatePropertyValue(initialValue, perYearReturn, year)
                        // here.  That formula computes initialValue × (1+perYearReturn)^year, compounding
                        // a single-year draw across the entire elapsed period — producing nonsense.
                        // Instead, multiply the running value by (1 + thisYearReturn) each year.
                        if (useRandomReturns) {
                            const ipReturn = this.calculateEnhancedPropertyReturn(
                                year,
                                inputs.propertyGrowthRate,
                                true,
                                previousAccumulationIPReturn,
                                inputs.investmentPropertyType || 'unit'
                            );
                            previousAccumulationIPReturn = ipReturn;
                            this.previousReturns.property = ipReturn; // keep legacy field in sync
                            accumulationIPValue = Math.max(0, accumulationIPValue * (1 + ipReturn));
                        } else {
                            const ipReturn = this.calculateEnhancedPropertyReturn(
                                year,
                                inputs.propertyGrowthRate,
                                false,
                                null,
                                inputs.investmentPropertyType || 'unit'
                            );
                            accumulationIPValue = Math.max(0, accumulationIPValue * (1 + ipReturn));
                        }

                        const remainingLoan = this.calculatePropertyLoanBalance(
                            inputs.investmentPropertyLoan,
                            inputs.investmentPropertyRate,
                            year
                        );
                        propertyEquity = accumulationIPValue - remainingLoan;
                    }
                }
            }

            // Track healthcare costs
            const healthcareCost = this.projectHealthcareCosts(
                inputs.currentHealthcareCosts,
                year,
                inputs.healthcareInflation
            );
            healthcareCostHistory.push(healthcareCost);
            if (yourCurrentAge <= inputs.retirementAge) {
                pushAccumulationSnapshot(year, yourCurrentAge, propertyEquity);
            }
            if (yourCurrentAge > inputs.retirementAge) {
                break;
            }
        }

        // At retirement setup
        // Home value is now the path-tracked value built year-by-year in the accumulation loop
        // above (accumulationPrimaryHomeValue). In MC mode this reflects actual boom/bust cycles
        // including negative years; in deterministic mode it equals Math.pow(1+rate, years).
        // homeGrowthRate is still needed for the post-retirement loop (same per-run rate).
        const homeGrowthRate = homeGrowthRateAssumption; // used as base for calculateEnhancedPropertyReturn in retirement
        const homeValueAtRetirement = accumulationPrimaryHomeValue > 0
            ? accumulationPrimaryHomeValue
            : (inputs.homeValue * Math.pow(1 + homeGrowthRate, yearsToRetirement)); // fallback if home=0
        const mortgageBalanceAtRetirement = Math.max(0,
            calculateLoanBalance(inputs.mortgageRate, yearsToRetirement, inputs.monthlyMortgagePayment, inputs.mortgageBalance)
        );
        const homeEquityAtRetirement = homeValueAtRetirement - mortgageBalanceAtRetirement;
        let accessibleHomeEquity = inputs.planToDownsize ? homeEquityAtRetirement * this.config.HOME_EQUITY_ACCESS_RATE : 0;

        // Downsizer contribution (ATO: age 55+, up to $300k/person from primary home sale proceeds)
        // Reclassifies part of home equity from general pool into super — total currentBalance unchanged.
        if (inputs.planToDownsize && inputs.downsizeContribution) {
            const ageAtRetirement = inputs.yourCurrentAge + yearsToRetirement;
            if (ageAtRetirement >= 55) {
                const downsizeMax = inputs.isSingleCalculation ? 300000 : 600000;
                const downsizeAmount = Math.min(accessibleHomeEquity, downsizeMax);
                accumulatedSuperBalance += downsizeAmount;
                accessibleHomeEquity -= downsizeAmount; // prevent double-count in currentBalance
            }
        }

        // Retirement phase simulation
        let currentBalance = accumulatedSuperBalance + accumulatedSavingsBalance + accumulatedInvestmentPortfolio + accessibleHomeEquity;
        // The simulator models a single liquid retirement pool. The UI still needs a
        // super/non-super split for the redesigned year table, so we track a parallel
        // display-only decomposition from the retirement starting mix. These shadow
        // balances must never drive the actual depletion logic.
        let displaySuperBalance = accumulatedSuperBalance;
        let displayNonSuperBalance = accumulatedSavingsBalance + accumulatedInvestmentPortfolio + accessibleHomeEquity;
        const agedCareCosts = this.calculateAgedCareCosts(inputs);

        // Calculate non-liquid assets
        const inaccessibleHomeEquity = inputs.planToDownsize ? 0 : homeEquityAtRetirement;

        // Running home value tracked year-by-year in retirement.
        // In MC mode: updated each year using calculateEnhancedPropertyReturn() so the
        // home can experience negative growth years (e.g. -5% in a rate-hike cycle), just
        // like the investment property accumulation path.
        // In deterministic mode: grows at the fixed homeGrowthRate each year (same as before).
        // This replaces the previous Math.pow(1 + homeGrowthRate, yearsFromRetirement) which
        // could not produce negative compounding in any individual year.
        let runningHomeValue = inputs.planToDownsize ? 0 : homeValueAtRetirement;

        // Running investment property value for the retirement phase.
        // Seeded from accumulationIPValue — the path-tracked value built year-by-year
        // in the accumulation loop above — so the retirement loop begins from the correct
        // end-of-accumulation value rather than re-computing from the original purchase price.
        // In deterministic mode accumulationIPValue equals Math.pow(adjustedRate, yearsToRetirement)
        // applied incrementally, which gives the same result as the old formula.
        // In MC mode it reflects the actual stochastic path including any negative years.
        let runningInvestmentPropertyValue = inputs.hasInvestmentProperty
            ? accumulationIPValue
            : 0;

        const balances = [];
        const yearlyData = [];
        const initialRetirementBalance = currentBalance;
        const agedCareProfile = this.buildAgedCareProfile(inputs, useRandomReturns, effectiveYourLifespan);
        let previousSpendingTarget = null;
        // Per-year inflation scatter: each Monte Carlo run experiences a different inflation path
        // centred on the user's input, giving realistic variability in spending targets.
        // Seed with the per-run inflation rate so each MC run begins retirement with a
        // differently inflated spending baseline (not the same fixed value every run).
        // Deterministic runs use inputs.inflation unchanged.
        let cumulativeInflationFactor = Math.pow(1 + runInflationRate, yearsToRetirement);

        // Separate cumulative factor for healthcare costs in MC mode.
        // Healthcare inflation = general inflation + a structural uplift (historically ~3-4 pp above CPI).
        // cumulativeInflationFactor tracks only the general inflation path; to correctly compound
        // the full healthcare rate we maintain a parallel factor that accumulates the uplift
        // component year-by-year.  Both factors start from the pre-retirement seed.
        // In deterministic mode this is unused (projectHealthcareCosts() handles it with Math.pow).
        const hcUplift = Math.max(0, (inputs.healthcareInflation || 0.065) - (inputs.inflation || 0.026));
        // Seed: compound the structural uplift over the pre-retirement years (deterministic,
        // since the uplift is a fixed structural differential, not a stochastic rate).
        let cumulativeHcUpliftFactor = Math.pow(1 + hcUplift, yearsToRetirement);

        for (let i = 0; i < yearsInRetirement; i++) {
            const retirementYear = yearsToRetirement + i;
            const yourCurrentAge = inputs.yourCurrentAge + retirementYear;
            const partnerCurrentAge = inputs.isSingleCalculation ? 0 : inputs.partnerCurrentAge + retirementYear;

            // Check if simulation should end based on single vs couple status
            if (inputs.isSingleCalculation) {
                if (yourCurrentAge > effectiveYourLifespan) {
                    break;
                }
            } else {
                // Check if both partners have passed away
                if (yourCurrentAge > effectiveYourLifespan && partnerCurrentAge > effectivePartnerLifespan) {
                    break;
                }
            }

            // Determine couple status: must not be single calculation AND both partners must be alive
            const isCouple = !inputs.isSingleCalculation &&
                yourCurrentAge <= effectiveYourLifespan &&
                partnerCurrentAge <= effectivePartnerLifespan;

            // Dynamic allocation in retirement
            const allocation = inputs.useGlidePath ?
                this.calculateDynamicAllocation(yourCurrentAge, inputs.glidePathRule) :
                {
                    equity: inputs.allocEquities * 100,
                    bonds: inputs.allocBonds * 100,
                    cash: inputs.allocCash * 100
                };

            // Track allocation through retirement so the "Asset Allocation Over Time" chart
            // covers the full simulation horizon, not just the pre-retirement phase.
            allocationHistory.push(allocation);

            // ── Step A: draw this year's stochastic rates ────────────────────────
            // yearInflationRate MUST be declared before any calculation that uses it.
            // It drives healthcare costs, spending targets, and the cumulative factor.
            // MC mode: uniform draw in [median − 4.5pp, median + 3.5pp], floored at 0.5%.
            // Deterministic mode: the user-entered median, unchanged.
            const yearInflationRate = useRandomReturns
                ? stochasticRate(inputs.inflation, true, 0.005)
                : inputs.inflation;

            // ── Step B: healthcare costs ─────────────────────────────────────────
            // MC mode: healthcare cost = baseCost × cumulativeInflationFactor
            //                                     × cumulativeHcUpliftFactor
            //
            // cumulativeInflationFactor accumulates per-year stochastic general inflation
            // draws.  cumulativeHcUpliftFactor accumulates the structural healthcare
            // premium (healthcareInflation − generalInflation) compounded year-by-year.
            // Both are advanced at the END of this block so this year's cost uses the
            // factor as it stood at the START of the year.
            //
            // This correctly compounds the uplift across all retirement years — fixing
            // the prior bug where (1 + hcUplift) was applied only as a flat one-year
            // scalar regardless of how many retirement years had elapsed.
            //
            // Deterministic mode: fixed compound formula via projectHealthcareCosts().
            let healthcareCost;
            if (useRandomReturns) {
                healthcareCost = inputs.currentHealthcareCosts
                    * cumulativeInflationFactor
                    * cumulativeHcUpliftFactor;
                // Advance the uplift factor for next year.
                cumulativeHcUpliftFactor *= (1 + hcUplift);
            } else {
                healthcareCost = this.projectHealthcareCosts(
                    inputs.currentHealthcareCosts,
                    retirementYear,
                    inputs.healthcareInflation
                );
            }

            // ── Step C: aged care ────────────────────────────────────────────────
            // Deterministic runs use an expected-value care cost; MC runs sample an
            // event path (occurrence + duration drawn in buildAgedCareProfile) so care
            // is not silently charged to every scenario.
            const agedCareCost = this.getAnnualAgedCareCost(
                yourCurrentAge,
                inputs,
                agedCareProfile,
                effectiveYourLifespan,
                useRandomReturns ? runHealthcareInflRate : null
            );

            // ── Step D: investment property income and equity ─────────────────────
            // Property income uses runInflationRate (per-run draw) for rental/expense
            // compounding.  Property equity uses calculateEnhancedPropertyReturn() with
            // its own serial-correlation state (previousInvestmentPropertyReturn) so each
            // retirement year experiences a cycle-realistic return that can be negative.
            // This is consistent with the accumulation phase treatment.
            let propertyIncome = 0;
            if (inputs.hasInvestmentProperty && !propertyWasSold) {
                const propertyCashFlow = this.calculatePropertyCashFlow(
                    inputs, retirementYear, useRandomReturns ? runInflationRate : null
                );
                if (propertyCashFlow) {
                    propertyIncome = propertyCashFlow.netCashFlow; // may be negative (neg. gearing)
                }

                // Update investment property value incrementally each year.
                // Uses a SEPARATE serial-correlation state (this.previousReturns.investmentProperty)
                // so it does not contaminate the primary home's cycle path.
                //
                // Per-year incremental compounding (runningInvestmentPropertyValue) fixes the
                // prior bug where calculatePropertyValue(initialValue, ipYearReturn, retirementYear)
                // compounded a single-year return across the full elapsed horizon — producing
                // nonsense for later retirement years.
                if (useRandomReturns) {
                    const ipYearReturn = this.calculateEnhancedPropertyReturn(
                        retirementYear,
                        inputs.propertyGrowthRate,
                        true,
                        this.previousReturns.investmentProperty,
                        inputs.investmentPropertyType || 'unit'
                    );
                    this.previousReturns.investmentProperty = ipYearReturn;
                    runningInvestmentPropertyValue = Math.max(
                        0,
                        runningInvestmentPropertyValue * (1 + ipYearReturn)
                    );
                } else {
                    // Deterministic: apply the type-adjusted rate each year.
                    const deterministicIpRate = this.calculateEnhancedPropertyReturn(
                        retirementYear,
                        inputs.propertyGrowthRate,
                        false, // deterministic
                        null,
                        inputs.investmentPropertyType || 'unit'
                    );
                    runningInvestmentPropertyValue *= (1 + deterministicIpRate);
                }
                const remainingLoan = this.calculatePropertyLoanBalance(
                    inputs.investmentPropertyLoan,
                    inputs.investmentPropertyRate,
                    retirementYear
                );
                propertyEquity = runningInvestmentPropertyValue - remainingLoan;
            }

            const spendingPlan = this.buildRetirementSpendingPlan({
                inputs,
                retirementYear,
                currentAge: yourCurrentAge,
                currentBalance,
                initialRetirementBalance,
                previousSpendingTarget,
                agedCareActive: agedCareCost > 0,
                useRandomReturns,
                overrideInflationFactor: useRandomReturns ? cumulativeInflationFactor : undefined,
                yearInflationRate,
            });
            const baseIncomeNeeded = spendingPlan.targetSpending;
            previousSpendingTarget = baseIncomeNeeded;

            // Advance the cumulative inflation factor using the rate already drawn above.
            if (useRandomReturns) {
                cumulativeInflationFactor *= (1 + yearInflationRate);
            }

            // LHC loading cost during retirement (mirrors accumulation loop logic)
            let lhcRetirementCost = 0;
            if (inputs.ageFirstPrivateCover && inputs.hasPrivateHealthCover) {
                const ageFirstCoverVal = parseFloat(inputs.ageFirstPrivateCover);
                const yearsWithoutCover = Math.max(0, ageFirstCoverVal - 30);
                const yearsCovered = yourCurrentAge - ageFirstCoverVal;
                const loadingCleared = yearsCovered >= (this.config.LHC_CLEAR_AFTER_YEARS || 10);
                const loadingPct = loadingCleared ? 0 : Math.min(
                    this.config.LHC_LOADING_MAX || 0.70,
                    yearsWithoutCover * (this.config.LHC_LOADING_RATE || 0.02)
                );
                if (loadingPct > 0) {
                    const basePremium = inputs.isSingleCalculation
                        ? (this.config.LHC_BASE_PREMIUMS?.single || 2800)
                        : (this.config.LHC_BASE_PREMIUMS?.couple || 5200);
                    // retirementYear = yearsToRetirement + i — always years from today,
                    // never a calendar year — so Math.pow is safe and correct here.
                    lhcRetirementCost = basePremium * loadingPct * Math.pow(1 + runInflationRate, retirementYear);
                }
            }

            // Health condition multiplier for healthcare costs
            const healthMultiplier = { excellent: 0.8, good: 1.0, fair: 1.25, poor: 1.6 }[inputs.healthCondition] || 1.0;
            const adjustedHealthcareCost = healthcareCost * healthMultiplier;

            const totalCostWithHealthcare = baseIncomeNeeded + adjustedHealthcareCost + agedCareCost + lhcRetirementCost;

            // AWLR eligibility check: Age Pension requires 10+ years Australian residence
            // If ageCameToAustralia is set, compute residence years at retirement
            const ageCameToAustralia = parseFloat(inputs.ageCameToAustralia || 0);
            const awlrYearsAtRetirement = ageCameToAustralia > 0
                ? Math.max(0, inputs.retirementAge - ageCameToAustralia)
                : null; // null = assume full residence (born/raised in AU)
            const pensionEligibleByResidency = awlrYearsAtRetirement === null || awlrYearsAtRetirement >= 10;

            // Enhanced Pension calculation - handles non-pensioner partner scenarios
            // Trust assets: attributed share counts as assessable assets (Centrelink rules)
            const trustAttributedAssets = inputs.hasTrustAssets
                ? (parseFloat(inputs.trustNetAssets || 0) * parseFloat(inputs.trustAttributionPercentage || 0))
                : 0;
            // If home is held in trust it loses the homeowner exemption
            const homeExemption = inputs.planToDownsize ? 0
                : (inputs.homeInTrust ? 0 : homeEquityAtRetirement);
            const assessableAssets = currentBalance + propertyEquity - homeExemption + trustAttributedAssets;
            // Trust distributions add to income test (annual distributions × attribution%).
            // The gross amount is used for the Centrelink income test; net-of-tax amount
            // is what actually offsets withdrawal needs (trust income is taxable).
            const trustDistributionGross = inputs.hasTrustAssets
                ? (parseFloat(inputs.trustAnnualDistributions || 0) * parseFloat(inputs.trustAttributionPercentage || 0))
                : 0;
            // Discretionary trust income taxed at individual marginal rate via trustTaxRate field;
            // unit trust distributions may carry a different rate. Default 0 = no pre-paid tax.
            const trustTaxRate = parseFloat(inputs.trustTaxRate || 0);
            const financialAssetsForDeeming = Math.max(0, currentBalance + trustAttributedAssets);
            const deemedIncome = calculateDeemedIncome(financialAssetsForDeeming, isCouple);
            const trustDistributionIncome = trustDistributionGross; // gross used for income test
            const trustDistributionNetIncome = trustDistributionGross * (1 - trustTaxRate);
            let pensionIncome = 0;
            let pensionDetails = null;

            if (!pensionEligibleByResidency) {
                // Not enough Australian residence years — no Age Pension
                pensionIncome = 0;
            } else if (isCouple) {
                // Use enhanced couple pension calculation
                const person1 = {
                    age: yourCurrentAge,
                    super: currentBalance / 2,
                    investments: trustAttributedAssets / 2,
                    salary: 0,
                    otherIncome: propertyIncome / 2,
                    financialAssets: financialAssetsForDeeming / 2
                };

                const person2 = {
                    age: partnerCurrentAge,
                    super: currentBalance / 2,
                    investments: trustAttributedAssets / 2,
                    salary: 0,
                    otherIncome: propertyIncome / 2,
                    financialAssets: financialAssetsForDeeming / 2
                };

                const homeowner = (inputs.homeValue || 0) > 0 && !inputs.planToDownsize;
                const pensionResult = calculateAgePensionForCouple(person1, person2, homeowner, {});

                if (pensionResult.eligible) {
                    pensionIncome = pensionResult.currentPension.annual;
                    // Store detailed results for first year only (for display)
                    if (i === 0) {
                        pensionDetails = pensionResult;
                    }
                }
            } else {
                // Single person - income test includes trust distributions.
                // Use user-entered pension parameters when provided; fall back to indexed config values.
                const effectivePensionMax = (inputs.agePensionMax > 0) ? inputs.agePensionMax : this.config.SINGLE_PENSION_MAX;
                const effectiveAssetThreshold = (inputs.pensionAssetThreshold > 0) ? inputs.pensionAssetThreshold : this.config.SINGLE_ASSET_THRESHOLD;
                const effectiveAssetLimit = (inputs.pensionAssetLimit > 0) ? inputs.pensionAssetLimit : this.config.SINGLE_ASSET_LIMIT;
                const effectiveIncomeThreshold = (inputs.pensionIncomeThreshold > 0) ? inputs.pensionIncomeThreshold : this.config.SINGLE_INCOME_THRESHOLD;
                pensionIncome = calculateAgePension(
                    assessableAssets,
                    propertyIncome + deemedIncome + trustDistributionIncome,
                    false,
                    effectivePensionMax,
                    effectiveAssetThreshold,
                    effectiveAssetLimit,
                    effectiveIncomeThreshold
                );
            }

            // Pension income test uses gross trust distributions; withdrawal offset uses net-of-tax
            const otherIncome = propertyIncome + trustDistributionNetIncome;
            const totalIncome = pensionIncome + otherIncome;
            const netWithdrawalNeeded = Math.max(0, totalCostWithHealthcare - totalIncome);

            // Enhanced return calculation with regime modeling.
            // In pension phase (account-based pension), the fund pays 0% tax on earnings so
            // ALL franking credits are refunded in cash in pension phase.
            // The formula is: frankingCredits × (FCB / FRANKING_CREDIT_ADJUSTMENT).
            // Setting FCB = FRANKING_CREDIT_ADJUSTMENT gives a multiplier of 1.0 (full refund).
            // Do NOT use 100 here — that would produce a 83.33× multiplier and massively
            // inflate returns (~21% extra per year), causing an astronomical final balance.
            const pensionPhaseInputs = {
                ...inputs,
                frankingCreditBenefit: this.financialConfig.australianSystem.FRANKING_CREDIT_ADJUSTMENT.value,
            };
            const baseReturn = this.calculateEnhancedReturn(
                allocation,
                inputs.investmentReturn,
                pensionPhaseInputs
            );

            let actualReturn = baseReturn;
            if (useRandomReturns) {
                // Use enhanced portfolio return with regime modeling
                actualReturn = this.calculatePortfolioReturn(
                    allocation,
                    baseReturn,
                    retirementYear,
                    inputs.returnDeclineRate || 0.03,
                    true,
                    this.previousReturns.portfolio
                );
                this.previousReturns.portfolio = actualReturn;

                // Apply market shocks if enabled (legacy support)
                if (inputs.enableShocks && Math.random() < inputs.shockProbability) {
                    const shockEffect = inputs.shockMagnitude * (allocation.equity / 100);
                    actualReturn += shockEffect;
                }

                // Apply global risk factor (PART 10): increases volatility of returns
                if (inputs.globalRiskFactor > 0) {
                    const globalRiskVolatility = inputs.globalRiskFactor * 0.05; // up to 5% extra volatility
                    actualReturn += (Math.random() * 2 - 1) * globalRiskVolatility;
                }

                // Apply extreme inflation shock probability (PART 10)
                if (inputs.extremeInflationProbability > 0 && Math.random() < inputs.extremeInflationProbability) {
                    // Extreme inflation year reduces real portfolio value
                    actualReturn -= 0.03; // additional ~3% real return drag
                }

                // Apply property crash probability to property-linked income (PART 10)
                if (inputs.hasInvestmentProperty && inputs.propertyCrashProbability > 0 &&
                    Math.random() < inputs.propertyCrashProbability) {
                    // A property crash year: reduce property income contribution for this year
                    // (already reflected via lower property growth; we also cut rental income)
                    actualReturn -= 0.01;
                }
            } else {
                // Use deterministic calculation
                actualReturn = this.calculatePortfolioReturn(
                    allocation,
                    baseReturn,
                    retirementYear,
                    inputs.returnDeclineRate || 0.03,
                    false
                );
            }

            // Apply stress scenario if provided (for retirement phase)
            if (stressScenario && stressScenario.isRetirementTimed && i < stressScenario.duration) {
                if (stressScenario.yearlyEquityReturns) {
                    // Multi-year sequence (e.g. GFC: two bad years then recovery)
                    const eqRet  = stressScenario.yearlyEquityReturns[i] ?? 0;
                    const bdRet  = stressScenario.yearlyBondReturns
                        ? (stressScenario.yearlyBondReturns[i] ?? 0.02)
                        : 0.02;
                    actualReturn = (allocation.equity / 100) * eqRet +
                        (allocation.bonds  / 100) * bdRet +
                        (allocation.cash   / 100) * 0.01;
                } else if (stressScenario.equityReturn !== undefined) {
                    actualReturn = (allocation.equity / 100) * stressScenario.equityReturn +
                        (allocation.bonds / 100) * (stressScenario.bondReturn || 0.02) +
                        (allocation.cash / 100) * 0.01;
                }
            }

            // ATO minimum pension drawdown (Schedule 7, 2025): account-based pensions must
            // draw at least this percentage of opening balance each year regardless of need.
            const minDrawdownRate = this.getMinDrawdownRate(yourCurrentAge);
            const minAnnualDraw = currentBalance * minDrawdownRate;
            // Actual withdrawal is the greater of income need and ATO minimum
            const annualWithdrawal = Math.max(netWithdrawalNeeded, minAnnualDraw);
            const fundingStage = this.getFundingStage(
                totalCostWithHealthcare,
                pensionIncome,
                annualWithdrawal,
                otherIncome
            );

            // Monthly withdrawal simulation
            const monthlyReturn = Math.pow(1 + actualReturn, 1/12) - 1;
            const monthlyWithdrawal = annualWithdrawal / 12;

            const startBalance = currentBalance;
            const startSuperBalance = displaySuperBalance;
            const startNonSuperBalance = displayNonSuperBalance;
            let yearlyGrowth = 0;

            for (let month = 1; month <= 12; month++) {
                const monthlyGrowth = currentBalance * monthlyReturn;
                yearlyGrowth += monthlyGrowth;
                currentBalance = currentBalance + monthlyGrowth - monthlyWithdrawal;

                const displayCombinedBalance = displaySuperBalance + displayNonSuperBalance;
                const superShare = displayCombinedBalance > 0 ? displaySuperBalance / displayCombinedBalance : 0;
                const superWithdrawal = monthlyWithdrawal * superShare;
                const nonSuperWithdrawal = monthlyWithdrawal - superWithdrawal;
                const superGrowth = displaySuperBalance * monthlyReturn;
                const nonSuperGrowth = displayNonSuperBalance * monthlyReturn;

                displaySuperBalance = Math.max(0, displaySuperBalance + superGrowth - superWithdrawal);
                displayNonSuperBalance = Math.max(0, displayNonSuperBalance + nonSuperGrowth - nonSuperWithdrawal);

                if (currentBalance <= 0) {
                    currentBalance = 0;
                    displaySuperBalance = 0;
                    displayNonSuperBalance = 0;
                    break;
                }
            }

            const displayTotal = displaySuperBalance + displayNonSuperBalance;
            if (currentBalance <= 0 || displayTotal <= 0) {
                displaySuperBalance = 0;
                displayNonSuperBalance = 0;
            } else if (Math.abs(displayTotal - currentBalance) > 0.01) {
                // Reconcile the UI-only split back to the authoritative combined balance.
                const scale = currentBalance / displayTotal;
                displaySuperBalance *= scale;
                displayNonSuperBalance *= scale;
            }

            // Calculate liquid vs non-liquid assets for this year with growth
            const liquidAssets = startBalance; // Beginning of year liquid assets
            const endLiquidAssets = currentBalance; // End of year liquid assets after transactions

            // Update home value year-by-year.
            // MC mode: draw a fresh per-year property return so the home can have negative
            // growth years (apartments −5% to −12% historically) rather than smooth compounding.
            // Deterministic mode: grow at the fixed homeGrowthRate (same behaviour as before).
            if (!inputs.planToDownsize) {
                if (useRandomReturns) {
                    // Uses primaryHome serial-correlation state — separate from the investment
                    // property's state so the two cycles are independent.
                    const yearlyHomeReturn = this.calculateEnhancedPropertyReturn(
                        retirementYear,
                        homeGrowthRate,
                        true,
                        this.previousReturns.primaryHome
                    );
                    this.previousReturns.primaryHome = yearlyHomeReturn;
                    runningHomeValue = Math.max(0, runningHomeValue * (1 + yearlyHomeReturn));
                } else {
                    runningHomeValue = runningHomeValue * (1 + homeGrowthRate);
                }
            }
            // currentHomeEquity = gross home value − outstanding mortgage balance.
            // runningHomeValue is the gross value (price); we must subtract the remaining
            // loan so that nonLiquidAssets reflects true equity, not gross property value.
            // mortgageBalanceAtRetirement is the balance at retirement; we continue
            // amortising it over years-in-retirement using the same contractual rate.
            // If the mortgage is fully paid off (balance ≤ 0) the result clamps to 0.
            const yearsIntoRetirement = i; // i is the retirement loop counter (0-based)
            const outstandingMortgageInRetirement = inputs.planToDownsize ? 0 : Math.max(0,
                calculateLoanBalance(
                    inputs.mortgageRate,
                    yearsIntoRetirement,
                    inputs.monthlyMortgagePayment,
                    mortgageBalanceAtRetirement
                )
            );
            const currentHomeEquity = Math.max(0, runningHomeValue - outstandingMortgageInRetirement);

            const nonLiquidAssets = currentHomeEquity + propertyEquity;

            balances.push(currentBalance);
            const yearData = {
                year: new Date().getFullYear() + retirementYear,
                age: yourCurrentAge,
                partnerAge: partnerCurrentAge,
                yourAge: yourCurrentAge,
                yourAlive: yourCurrentAge <= effectiveYourLifespan,
                partnerAlive: !inputs.isSingleCalculation && partnerCurrentAge <= effectivePartnerLifespan,
                allocation: allocation,
                startBalance,
                startSuperBalance,
                startNonSuperBalance,
                returnRate: actualReturn * 100,
                growth: yearlyGrowth,
                withdrawal: annualWithdrawal,
                superIncome: annualWithdrawal,
                minDrawAmount: minAnnualDraw,
                minDrawRate: minDrawdownRate,
                totalPlannedSpending: totalCostWithHealthcare,
                coreSpending: baseIncomeNeeded,
                essentialSpending: spendingPlan.essentialSpending,
                discretionarySpending: spendingPlan.discretionarySpending,
                decumulationStrategy: spendingPlan.decumulationStrategy,
                lifecycleStage: spendingPlan.lifecycleStage,
                lifecycleLabel: spendingPlan.lifecycleLabel,
                fundingStage: fundingStage.key,
                fundingLabel: fundingStage.label,
                healthcareCost,
                agedCareCost,
                propertyIncome,
                otherIncome,
                pensionIncome,
                endBalance: currentBalance,
                endSuperBalance: displaySuperBalance,
                endNonSuperBalance: displayNonSuperBalance,
                liquidAssets,
                nonLiquidAssets,
                depleted: false,
                overseasYear: !!(inputs.goingOverseas && inputs.overseasStartAge > 0 && yourCurrentAge >= inputs.overseasStartAge),
                // Use the inflated travel cost already computed inside buildRetirementSpendingPlan
                // so the tooltip breakdown (living cost = withdraw - travelCost) is consistent.
                travelCost: spendingPlan.overseasTravelCost ?? 0,
            };

            // Add pension details for first year if available
            if (i === 0 && pensionDetails) {
                yearData.pensionDetails = pensionDetails;
            }

            yearlyData.push(yearData);

            if (currentBalance <= 0) {
                yearlyData[yearlyData.length - 1].depleted = true;
                break;
            }
        }

        const depletionYear = yearlyData.find(year => year.depleted) || null;

        return {
            finalBalance: currentBalance,
            balances,
            yearlyData,
            accumulationHistory,
            allocationHistory,
            healthcareCostHistory,
            propertyHistory,
            regimeHistory, // Include regime history for enhanced analysis
            agedCareCosts,
            totalFinancialAssets: accumulatedSuperBalance + accumulatedSavingsBalance + accumulatedInvestmentPortfolio,
            accessibleHomeEquity,
            homeEquity: homeEquityAtRetirement,
            propertyEquity,
            propertyWasSold,
            agedCareProfile,
            accumulatedSuperBalance,
            accumulatedSavingsBalance,
            accumulatedInvestmentPortfolio,
            runUntilDepletionMode: this.isOpenEndedLifespan(inputs.yourLifespan) || (!inputs.isSingleCalculation && this.isOpenEndedLifespan(inputs.partnerLifespan)),
            effectiveYourLifespan,
            effectivePartnerLifespan,
            depletionYear: depletionYear?.year || null,
            depletionAge: depletionYear?.age || null,
            depletionPartnerAge: depletionYear?.partnerAlive ? depletionYear.partnerAge : null,
            depletionPensionIncome: depletionYear?.pensionIncome || 0,
            depletionIsCouple: !!depletionYear?.partnerAlive
        };
    }

    // Enhanced Monte Carlo simulation with median-based analysis
    async runMonteCarloSimulation(inputs, runs, progressCallback) {
        const outcomes = [];
        const paths = [];
        const propertyOutcomes = [];
        const yearlyReturns = []; // Track returns for volatility analysis
        const lifespanSamples = []; // Track sampled lifespans when longevity distribution is on
        const agedCareOccurrences = [];

        const useLongevityDist = !!inputs.useLongevityDistribution;
        const yourGender   = inputs.yourGender   || 'unspecified';
        const partnerGender = inputs.partnerGender || 'unspecified';

        for (let i = 0; i < runs; i++) {
            let runInputs = inputs;
            if (useLongevityDist) {
                const sampledYour = this.sampleLifespan(inputs.yourCurrentAge || 50, yourGender);
                const sampledPartner = (inputs.partnerCurrentAge || 0) > 0
                    ? this.sampleLifespan(inputs.partnerCurrentAge, partnerGender)
                    : inputs.partnerLifespan || 0;
                runInputs = { ...inputs, yourLifespan: sampledYour, partnerLifespan: sampledPartner };
                lifespanSamples.push(sampledYour);
            }
            const result = this.simulateRetirement(runInputs, true);
            outcomes.push(result.finalBalance);
            paths.push(result.balances);
            agedCareOccurrences.push(
                result.yearlyData?.some(year => (year.agedCareCost || 0) > 0) ? 1 : 0
            );

            // Track return patterns for analysis
            if (result.yearlyData && result.yearlyData.length > 0) {
                yearlyReturns.push(result.yearlyData.map(y => y.returnRate / 100));
            }

            if (inputs.hasInvestmentProperty) {
                propertyOutcomes.push({
                    finalPropertyValue: result.propertyEquity,
                    wasSold: result.propertyWasSold
                });
            }

            if (progressCallback && i % 100 === 0) {
                await progressCallback(i, runs);
            }
        }

        outcomes.sort((a, b) => a - b);

        // Enhanced statistical analysis using median-based calculations
        const medianOutcome = median(outcomes);
        const successfulOutcomes = outcomes.filter(o => o > 0);
        const failureRate = (runs - successfulOutcomes.length) / runs;


        // Calculate percentiles more robustly
        const percentiles = {};
        [5, 10, 25, 50, 75, 90, 95].forEach(p => {
            const index = Math.floor((p / 100) * outcomes.length);
            percentiles[`p${p}`] = outcomes[Math.min(index, outcomes.length - 1)];
        });

        // Calculate median returns by year if available
        const medianReturnsByYear = [];
        if (yearlyReturns.length > 0 && yearlyReturns[0]) {
            const maxYears = Math.max(...yearlyReturns.map(yr => yr.length));
            for (let year = 0; year < maxYears; year++) {
                const yearReturns = yearlyReturns
                    .map(yr => yr[year])
                    .filter(r => r !== undefined);
                if (yearReturns.length > 0) {
                    medianReturnsByYear.push(median(yearReturns));
                }
            }
        }

        const yearlyPercentiles = [];
        const maxPathLength = paths.length > 0 ? Math.max(...paths.map(path => path.length)) : 0;
        for (let yearIndex = 0; yearIndex < maxPathLength; yearIndex++) {
            const balancesAtYear = paths
                .map(path => (path[yearIndex] !== undefined ? path[yearIndex] : 0))
                .sort((a, b) => a - b);
            if (!balancesAtYear.length) continue;

            const percentileAt = (percentile) => {
                const index = Math.floor((percentile / 100) * balancesAtYear.length);
                return balancesAtYear[Math.min(index, balancesAtYear.length - 1)];
            };

            yearlyPercentiles.push({
                yearIndex,
                p10: percentileAt(10),
                p50: percentileAt(50),
                p90: percentileAt(90)
            });
        }

        // Longevity distribution stats (populated only when useLongevityDistribution is on)
        let longevityStats = null;
        if (lifespanSamples.length > 0) {
            lifespanSamples.sort((a, b) => a - b);
            const lp = (p) => lifespanSamples[Math.min(
                Math.floor((p / 100) * lifespanSamples.length),
                lifespanSamples.length - 1
            )];
            longevityStats = {
                p10: lp(10), p25: lp(25), p50: lp(50), p75: lp(75), p90: lp(90),
                min: lifespanSamples[0],
                max: lifespanSamples[lifespanSamples.length - 1],
                mean: Math.round(lifespanSamples.reduce((s, v) => s + v, 0) / lifespanSamples.length)
            };
        }

        const careEventRate = agedCareOccurrences.length > 0
            ? agedCareOccurrences.reduce((sum, value) => sum + value, 0) / agedCareOccurrences.length
            : 0;

        return {
            outcomes,
            paths,
            propertyOutcomes,
            totalRuns: runs,
            successRate: successfulOutcomes.length / runs,
            failureRate,
            median: medianOutcome,
            mean: outcomes.reduce((sum, val) => sum + val, 0) / outcomes.length,
            percentiles,
            medianReturnsByYear,
            yearlyPercentiles,
            longevityStats,
            careStats: {
                configuredProbability: clamp(parseFloat(inputs.agedCareProbability || 0), 0, 1),
                simulatedEventRate: careEventRate
            },
            // Legacy support
            percentile10: percentiles.p10,
            percentile90: percentiles.p90,
            // Risk metrics
            shortfallRisk: failureRate,
            tailRisk: percentiles.p5, // 5% worst case
            downside: outcomes.filter(o => o < medianOutcome).length / runs
        };
    }

    // Enhanced Monte Carlo with advanced regime modeling and correlations
    async runEnhancedMonteCarloSimulation(inputs, runs = 5000, progressCallback = null) {
        return await this.enhancedMonteCarloEngine.runEnhancedMonteCarloSimulation(
            this, inputs, runs, progressCallback
        );
    }


    // Stress testing
    runStressTest(inputs, scenario) {
        return this.simulateRetirement(inputs, false, scenario);
    }

    // Retirement age solver - finds minimum retirement age to meet success criteria
    async solveRetirementAge(inputs, targetSuccessRate = 0.7, minAge = null, maxAge = null) {
        const originalRetirementAge = inputs.retirementAge;

        // Set reasonable bounds
        const minSearchAge = minAge || Math.max(inputs.yourCurrentAge + 5, 55);
        const maxSearchAge = maxAge || Math.min(this.getEffectiveLifespan(inputs.yourLifespan) - 10, 75);

        let bestAge = null;
        let bestResult = null;

        // Binary search for optimal retirement age
        let lowAge = minSearchAge;
        let highAge = maxSearchAge;

        while (lowAge <= highAge) {
            const testAge = Math.floor((lowAge + highAge) / 2);

            // Create test inputs with new retirement age
            const testInputs = { ...inputs, retirementAge: testAge };

            // Run deterministic simulation first for quick check
            const deterministicResult = this.simulateRetirement(testInputs, false);

            // If deterministic fails completely, this age is too low
            if (deterministicResult.finalBalance <= 0) {
                lowAge = testAge + 1;
                continue;
            }

            // Run Monte Carlo to get success rate (smaller sample for speed)
            const mcResult = await this.runMonteCarloSimulation(testInputs, 500, null);

            if (mcResult.successRate >= targetSuccessRate) {
                bestAge = testAge;
                bestResult = {
                    retirementAge: testAge,
                    successRate: mcResult.successRate,
                    medianBalance: mcResult.median,
                    deterministicResult
                };
                highAge = testAge - 1; // Look for even earlier retirement
            } else {
                lowAge = testAge + 1; // Need to retire later
            }
        }

        // Restore original retirement age
        inputs.retirementAge = originalRetirementAge;

        if (!bestAge) {
            return {
                success: false,
                message: `Cannot achieve ${(targetSuccessRate * 100).toFixed(0)}% success rate between ages ${minSearchAge}-${maxSearchAge}`,
                earliestViableAge: null
            };
        }

        return {
            success: true,
            earliestRetirementAge: bestAge,
            successRate: bestResult.successRate,
            medianBalance: bestResult.medianBalance,
            yearsToWork: bestAge - inputs.yourCurrentAge,
            deterministicProjection: bestResult.deterministicResult
        };
    }

    // Target balance solver - finds retirement age to achieve specific balance target
    async solveForTargetBalance(inputs, targetBalance, minAge = null, maxAge = null) {
        const originalRetirementAge = inputs.retirementAge;

        const minSearchAge = minAge || Math.max(inputs.yourCurrentAge + 5, 55);
        const maxSearchAge = maxAge || Math.min(this.getEffectiveLifespan(inputs.yourLifespan) - 10, 75);

        let bestAge = null;
        let bestBalance = 0;

        // Test each age to find closest to target
        for (let age = minSearchAge; age <= maxSearchAge; age++) {
            const testInputs = { ...inputs, retirementAge: age };
            const result = this.simulateRetirement(testInputs, false);

            if (result.totalFinancialAssets >= targetBalance) {
                bestAge = age;
                bestBalance = result.totalFinancialAssets;
                break;
            }

            // Track best result even if target not met
            if (result.totalFinancialAssets > bestBalance) {
                bestBalance = result.totalFinancialAssets;
                bestAge = age;
            }
        }

        // Restore original retirement age
        inputs.retirementAge = originalRetirementAge;

        return {
            success: bestBalance >= targetBalance,
            retirementAge: bestAge,
            projectedBalance: bestBalance,
            targetBalance,
            yearsToWork: bestAge - inputs.yourCurrentAge,
            shortfall: Math.max(0, targetBalance - bestBalance)
        };
    }

    // Scenario comparison system
    async runScenarioComparison(baseInputs, scenarios, progressCallback) {
        const results = [];

        for (let i = 0; i < scenarios.length; i++) {
            const scenario = scenarios[i];

            // Create modified inputs for this scenario
            const scenarioInputs = { ...baseInputs, ...scenario.modifications };
            // Normalize alloc values: form/recommendations use 0-100 scale, simulator expects 0-1
            ['allocEquities', 'allocBonds', 'allocCash'].forEach(field => {
                if (typeof scenarioInputs[field] === 'number' && scenarioInputs[field] > 1) {
                    scenarioInputs[field] = scenarioInputs[field] / 100;
                }
            });

            // Extract stress scenario if present
            const stressScenario = scenarioInputs._stressScenario || null;
            if (stressScenario) {
                delete scenarioInputs._stressScenario; // Remove from inputs to avoid confusion

                // Adjust stress scenario for retirement timing if needed
                if (stressScenario.startYear === 'retirement') {
                    // This will be handled in the simulation based on retirement year detection
                    stressScenario.isRetirementTimed = true;
                }
            }

            if (progressCallback) {
                await progressCallback(i, scenarios.length, `Running scenario: ${scenario.name}`);
            }

            // Run Monte Carlo simulation for this scenario
            // Note: Monte Carlo currently doesn't support stress scenarios, so it ignores them
            const mcResult = await this.runMonteCarloSimulation(
                scenarioInputs,
                resolveScenarioMonteCarloRuns(scenarioInputs),
                null
            );

            // Run deterministic simulation for comparison with stress scenario
            const deterministicResult = this.simulateRetirement(scenarioInputs, false, stressScenario);

            // For scenarios with stress scenarios, use deterministic results for median balance
            // since Monte Carlo doesn't handle stress scenarios properly
            let effectiveMedianBalance = stressScenario ? deterministicResult.finalBalance : mcResult.median;


            // Ensure we never return undefined/null/NaN (but allow negative values)
            if (effectiveMedianBalance === undefined || effectiveMedianBalance === null || isNaN(effectiveMedianBalance)) {
                effectiveMedianBalance = deterministicResult.finalBalance || 0;
            }


            results.push({
                name: scenario.name,
                description: scenario.description,
                modifications: scenario.modifications,
                monteCarloResult: mcResult,
                deterministicResult: deterministicResult,
                successRate: mcResult.successRate,
                medianBalance: effectiveMedianBalance,
                finalBalance: deterministicResult.finalBalance,
                totalAssets: deterministicResult.totalFinancialAssets
            });
        }

        return {
            scenarios: results,
            comparison: this.generateScenarioComparison(results)
        };
    }

    // Generate comparison analysis between scenarios
    generateScenarioComparison(scenarioResults) {
        if (scenarioResults.length < 2) return null;

        const baseScenario = scenarioResults[0];
        const comparisons = [];

        for (let i = 1; i < scenarioResults.length; i++) {
            const scenario = scenarioResults[i];

            comparisons.push({
                scenarioName: scenario.name,
                successRateDiff: scenario.successRate - baseScenario.successRate,
                medianBalanceDiff: scenario.medianBalance - baseScenario.medianBalance,
                finalBalanceDiff: scenario.finalBalance - baseScenario.finalBalance,
                riskAdjustedScore: this.calculateRiskAdjustedScore(scenario),
                recommendation: this.generateScenarioRecommendation(scenario, baseScenario)
            });
        }

        return {
            baseScenario: baseScenario.name,
            comparisons
        };
    }

    // Calculate risk-adjusted score for scenario ranking (0-100 scale)
    calculateRiskAdjustedScore(scenario, baseScenario = null) {
        if (!baseScenario) {
            // Standalone scoring (0-100)
            const successWeight = 0.7;
            const balanceWeight = 0.3;

            const normalizedSuccess = Math.min(100, scenario.successRate * 100);
            const normalizedBalance = Math.min(100, (scenario.medianBalance / 500000) * 100);

            return Math.round((successWeight * normalizedSuccess) + (balanceWeight * normalizedBalance));
        } else {
            // Relative scoring compared to baseline
            const successDiff = (scenario.successRate - baseScenario.successRate) * 100;
            const balanceDiff = ((scenario.medianBalance - baseScenario.medianBalance) / baseScenario.medianBalance) * 100;

            // Base score of 50, adjusted by differences
            let score = 50;
            score += successDiff * 0.7; // Success rate changes weighted heavily
            score += balanceDiff * 0.3; // Balance changes weighted less

            return Math.round(Math.max(0, Math.min(100, score)));
        }
    }

    // Generate recommendation text for scenario comparison
    generateScenarioRecommendation(scenario, baseScenario) {
        const successDiff = scenario.successRate - baseScenario.successRate;
        const balanceDiff = scenario.medianBalance - baseScenario.medianBalance;

        // Debug the calculation

        // Protect against division by zero and extreme percentages
        const balancePercentDiff = baseScenario.medianBalance > 1000 ?
            Math.max(-95, Math.min(1000, (balanceDiff / baseScenario.medianBalance) * 100)) : 0;

        if (successDiff > 0.05 && balancePercentDiff > 10) {
            return `+${(successDiff * 100).toFixed(1)}% success, +${balancePercentDiff.toFixed(1)}% balance vs Current Plan`;
        } else if (successDiff > 0.02 && balancePercentDiff > 5) {
            return `+${(successDiff * 100).toFixed(1)}% success, +${balancePercentDiff.toFixed(1)}% balance vs Current Plan`;
        } else if (successDiff > 0.01) {
            return `+${(successDiff * 100).toFixed(1)}% success vs Current Plan`;
        } else if (successDiff < -0.05 || balancePercentDiff < -15) {
            return `${(successDiff * 100).toFixed(1)}% success, ${balancePercentDiff.toFixed(1)}% balance vs Current Plan`;
        } else if (Math.abs(successDiff) < 0.01 && Math.abs(balancePercentDiff) < 5) {
            return "Similar to Current Plan";
        } else {
            const successSign = successDiff >= 0 ? '+' : '';
            const balanceSign = balancePercentDiff >= 0 ? '+' : '';
            return `${successSign}${(successDiff * 100).toFixed(1)}% success, ${balanceSign}${balancePercentDiff.toFixed(1)}% balance vs Current Plan`;
        }
    }

    // Insurance scenario modeling for what-if analysis based on research-optimal timing
    generateInsuranceScenarios(baseInputs) {
        const scenarios = [];
        const currentAge = baseInputs.yourCurrentAge;
        const retirementAge = baseInputs.retirementAge;
        const yearsToRetirement = retirementAge - currentAge;

        // Australian insurance defaults based on research (super fund averages)
        const insuranceAmounts = {
            defaultTPD: 250000,      // Typical super fund TPD coverage
            defaultDeath: 280000,    // Typical super fund death coverage
            highTPD: 500000,         // Higher coverage scenario
            highDeath: 600000        // Higher coverage scenario
        };

        // Research-based critical timing scenarios
        const timings = [
            {
                years: 2,
                label: "2 years before retirement",
                inRetirement: false,
                riskLevel: "critical",
                description: "Critical sequence-of-returns risk period"
            },
            {
                years: 10,
                label: "10 years before retirement",
                inRetirement: false,
                riskLevel: "high",
                description: "Peak earning years with significant recovery time"
            },
            {
                years: 20,
                label: "20 years before retirement",
                inRetirement: false,
                riskLevel: "moderate",
                description: "Long-term impact assessment period"
            },
            {
                years: 3,
                label: "3 years after retirement",
                inRetirement: true,
                riskLevel: "critical",
                description: "Early retirement vulnerability period"
            },
            {
                years: 15,
                label: "15 years after retirement",
                inRetirement: true,
                riskLevel: "high",
                description: "Healthcare cost escalation period"
            }
        ];

        timings.forEach(timing => {
            // Skip scenarios that are not applicable (e.g., if retirement is less than timing years away)
            if (!timing.inRetirement && timing.years > yearsToRetirement) {
                return;
            }

            const triggerAge = timing.inRetirement ?
                retirementAge + timing.years :
                retirementAge - timing.years;

            // Only create scenarios for ages that are realistic
            if (triggerAge < currentAge || triggerAge > 95) {
                return;
            }

            // TPD Scenarios - Partner affected
            scenarios.push({
                name: `Partner TPD (${timing.label})`,
                description: `Partner becomes totally permanently disabled ${timing.label} - ${timing.description}`,
                type: 'insurance',
                category: 'tpd',
                timing: timing,
                riskImpact: timing.riskLevel,
                insuranceEvent: {
                    type: 'tpd',
                    affectedPerson: 'partner',
                    triggerAge: triggerAge,
                    benefit: insuranceAmounts.defaultTPD,
                    ongoingCare: true,
                    careAnnualCost: 35000, // Estimated ongoing care costs per research
                    incomeImpact: 1.0,     // Complete loss of partner income
                    expenseIncrease: 0.15  // 15% increase in household expenses for care
                }
            });

            // TPD Scenarios - Primary person affected
            scenarios.push({
                name: `Your TPD (${timing.label})`,
                description: `You become totally permanently disabled ${timing.label} - ${timing.description}`,
                type: 'insurance',
                category: 'tpd',
                timing: timing,
                riskImpact: timing.riskLevel,
                insuranceEvent: {
                    type: 'tpd',
                    affectedPerson: 'primary',
                    triggerAge: triggerAge,
                    benefit: insuranceAmounts.defaultTPD,
                    ongoingCare: true,
                    careAnnualCost: 35000,
                    incomeImpact: 1.0,     // Complete loss of primary income
                    expenseIncrease: 0.15
                }
            });

            // Death Scenarios - Partner affected
            scenarios.push({
                name: `Partner Death (${timing.label})`,
                description: `Partner passes away ${timing.label} - ${timing.description}`,
                type: 'insurance',
                category: 'death',
                timing: timing,
                riskImpact: timing.riskLevel,
                insuranceEvent: {
                    type: 'death',
                    affectedPerson: 'partner',
                    triggerAge: triggerAge,
                    benefit: insuranceAmounts.defaultDeath,
                    ongoingCare: false,
                    incomeImpact: 1.0,       // Complete loss of partner income
                    expenseReduction: 0.25,  // 25% reduction in living expenses (single vs couple)
                    emotionalImpact: true
                }
            });

            // Death Scenarios - Primary person affected
            scenarios.push({
                name: `Your Death (${timing.label})`,
                description: `You pass away ${timing.label} - ${timing.description}`,
                type: 'insurance',
                category: 'death',
                timing: timing,
                riskImpact: timing.riskLevel,
                insuranceEvent: {
                    type: 'death',
                    affectedPerson: 'primary',
                    triggerAge: triggerAge,
                    benefit: insuranceAmounts.defaultDeath,
                    ongoingCare: false,
                    incomeImpact: 1.0,       // Complete loss of primary income
                    expenseReduction: 0.25,  // 25% reduction in living expenses
                    emotionalImpact: true
                }
            });
        });

        return scenarios;
    }

    // Apply insurance event impacts to simulation inputs
    applyInsuranceEvent(inputs, insuranceEvent, currentYear, currentAge) {
        const modifications = { ...inputs };

        if (currentAge >= insuranceEvent.triggerAge) {
            // Insurance event has occurred - apply financial impacts

            if (insuranceEvent.type === 'tpd') {
                // Add insurance benefit to investment portfolio
                modifications.currentStocks = (modifications.currentStocks || 0) + insuranceEvent.benefit;

                // Income impact
                if (insuranceEvent.affectedPerson === 'primary') {
                    modifications.yourSalary = modifications.yourSalary * (1 - insuranceEvent.incomeImpact);
                    modifications.monthlyStockContribution = 0; // Can't contribute while disabled
                } else if (insuranceEvent.affectedPerson === 'partner') {
                    modifications.partnerSalary = modifications.partnerSalary * (1 - insuranceEvent.incomeImpact);
                }

                // Ongoing care costs
                if (insuranceEvent.ongoingCare) {
                    modifications.currentHealthcareCosts = (modifications.currentHealthcareCosts || 12000) + insuranceEvent.careAnnualCost;
                }

                // Expense increases for care and support
                if (insuranceEvent.expenseIncrease) {
                    modifications.asfaComfortable = (modifications.asfaComfortable || 70000) * (1 + insuranceEvent.expenseIncrease);
                }

            } else if (insuranceEvent.type === 'death') {
                // Add insurance benefit to portfolio
                modifications.currentStocks = (modifications.currentStocks || 0) + insuranceEvent.benefit;

                // Complete income loss
                if (insuranceEvent.affectedPerson === 'primary') {
                    modifications.yourSalary = 0;
                    modifications.monthlyStockContribution = 0;
                    modifications.isSingleCalculation = true;
                } else if (insuranceEvent.affectedPerson === 'partner') {
                    modifications.partnerSalary = 0;
                    modifications.isSingleCalculation = true;
                }

                // Expense reduction for single person household
                if (insuranceEvent.expenseReduction) {
                    const currentASFA = modifications.asfaComfortable || 70000;
                    modifications.asfaComfortable = currentASFA * (1 - insuranceEvent.expenseReduction);
                }

                // Adjust age pension calculations for single status
                modifications.pensionAssetThreshold = this.config.SINGLE_ASSET_THRESHOLD;
                modifications.pensionAssetLimit = this.config.SINGLE_ASSET_LIMIT;
                modifications.pensionIncomeThreshold = this.config.SINGLE_INCOME_THRESHOLD;
                modifications.agePensionMax = this.config.SINGLE_PENSION_MAX;
            }
        }

        return modifications;
    }

    // Enhanced Monte Carlo with insurance scenario integration
    async runMonteCarloWithInsurance(inputs, runs, insuranceEvent, progressCallback) {
        const outcomes = [];
        const paths = [];
        const insuranceOutcomes = [];

        for (let i = 0; i < runs; i++) {
            // Apply insurance event if provided
            let simulationInputs = inputs;
            if (insuranceEvent) {
                // Determine if insurance event occurs in this simulation
                const eventYear = insuranceEvent.triggerAge - inputs.yourCurrentAge;
                simulationInputs = this.applyInsuranceEvent(inputs, insuranceEvent, eventYear, insuranceEvent.triggerAge);
            }

            const result = this.simulateRetirement(simulationInputs, true);
            outcomes.push(result.finalBalance);
            paths.push(result.balances);

            if (insuranceEvent) {
                insuranceOutcomes.push({
                    finalBalance: result.finalBalance,
                    benefitReceived: insuranceEvent.benefit,
                    eventTriggered: true,
                    impactOnOutcome: result.finalBalance - (await this.simulateRetirement(inputs, true)).finalBalance
                });
            }

            if (progressCallback && i % 100 === 0) {
                await progressCallback(i, runs);
            }
        }

        outcomes.sort((a, b) => a - b);

        // Enhanced statistics including insurance impact analysis
        const medianOutcome = median(outcomes);
        const successfulOutcomes = outcomes.filter(o => o > 0);
        const failureRate = (runs - successfulOutcomes.length) / runs;

        const percentiles = {};
        [5, 10, 25, 50, 75, 90, 95].forEach(p => {
            const index = Math.floor((p / 100) * outcomes.length);
            percentiles[`p${p}`] = outcomes[Math.min(index, outcomes.length - 1)];
        });

        const result = {
            outcomes,
            paths,
            successRate: successfulOutcomes.length / runs,
            failureRate,
            median: medianOutcome,
            mean: outcomes.reduce((sum, val) => sum + val, 0) / outcomes.length,
            percentiles,
            shortfallRisk: failureRate,
            tailRisk: percentiles.p5,
            downside: outcomes.filter(o => o < medianOutcome).length / runs
        };

        // Add insurance-specific analysis if applicable
        if (insuranceEvent && insuranceOutcomes.length > 0) {
            result.insuranceAnalysis = {
                averageImpact: insuranceOutcomes.reduce((sum, o) => sum + o.impactOnOutcome, 0) / insuranceOutcomes.length,
                benefitAmount: insuranceEvent.benefit,
                eventType: insuranceEvent.type,
                affectedPerson: insuranceEvent.affectedPerson,
                triggerAge: insuranceEvent.triggerAge
            };
        }

        return result;
    }

    // Pre-built scenario templates with insurance scenarios
    getCommonScenarios(baseInputs) {
        // Get standard scenarios
        const standardScenarios = [
            {
                name: "Current Plan",
                description: "Your current retirement strategy",
                modifications: {}
            },
            {
                // GFC (2007-09): ASX All Ordinaries fell ~54% peak-to-trough over 16 months.
                // Modelled as two bad years at retirement: -35% equity in year 1, -25% in year 2,
                // then a strong recovery (+30%) in year 3 — matching the actual sequence.
                // Bonds also fell (correlation failure in 2008): -8% in year 1, -4% in year 2.
                name: "GFC-Style Crash at Retirement (2-Year Sequence)",
                description: "Simulate a GFC-like sequence: equities -35% then -25% over first 2 retirement years, bonds also decline (-8%/-4%), followed by a sharp recovery. Total drawdown ~54% — consistent with the 2007-09 Australian market experience.",
                modifications: {
                    _stressScenario: {
                        name: 'gfc_sequence',
                        // Multi-year sequence: [year1, year2, year3, ...remaining=baseline]
                        yearlyEquityReturns: [-0.35, -0.25, 0.30],
                        yearlyBondReturns:   [-0.08, -0.04, 0.12],
                        duration: 3,
                        startYear: 'retirement'
                    }
                }
            },
            {
                name: "Retire 2 Years Later than Planned",
                description: `Work until age ${baseInputs.retirementAge + 2} instead of ${baseInputs.retirementAge} (adds 2 years of contributions and growth)`,
                modifications: {
                    retirementAge: baseInputs.retirementAge + 2,
                    partnerRetirementAge: (baseInputs.partnerRetirementAge || baseInputs.retirementAge) + 2
                }
            },
            {
                name: "Early Retirement at 60",
                description: "Retire at 60 with reduced superannuation access and no Age Pension until 67",
                modifications: {
                    retirementAge: 60,
                    partnerRetirementAge: 60,
                    // Early retirees face higher expenses due to no Age Pension
                    asfaComfortable: (baseInputs.asfaComfortable || 70000) * 1.2
                }
            },
            {
                name: "High Healthcare Cost Scenario",
                description: `Healthcare costs inflate at ${this.financialConfig.stressTesting.HEALTHCARE_STRESS.HIGH_INFLATION_RATE.value}% annually instead of ${((baseInputs.healthcareInflation || 0.055) * 100).toFixed(1)}% (stress test based on historical spikes)`,
                modifications: {
                    // healthcareInflation is stored as a decimal (0.075 = 7.5%).
                    // The raw config value is in percentage points (7.5), so divide by 100.
                    healthcareInflation: this.financialConfig.stressTesting.HEALTHCARE_STRESS.HIGH_INFLATION_RATE.value / 100
                }
            },
            {
                name: "Live to 95 (Longevity Risk)",
                description: `Plan for both partners living to ${this.financialConfig.stressTesting.LONGEVITY_STRESS.EXTENDED_LIFESPAN.value} (25-30% chance based on Australian statistics)`,
                modifications: {
                    yourLifespan: this.financialConfig.stressTesting.LONGEVITY_STRESS.EXTENDED_LIFESPAN.value,
                    partnerLifespan: this.financialConfig.stressTesting.LONGEVITY_STRESS.EXTENDED_LIFESPAN.value
                }
            },
            {
                name: "Economic Stagflation Period",
                description: "10 years of high inflation (4%) with low investment returns (3% real returns)",
                modifications: {
                    inflation: 0.04, // 4% inflation
                    investmentReturn: 0.07, // 7% nominal = 3% real return
                    propertyGrowthRate: 0.02 // 2% property growth - underperforms in stagflation
                }
            },
            {
                name: "Conservative Portfolio (30/50/20)",
                description: "Use defensive allocation: 30% equities, 50% bonds, 20% cash for market uncertainty",
                modifications: {
                    allocEquities: 0.30,
                    allocBonds: 0.50,
                    allocCash: 0.20,
                    useGlidePath: false
                }
            },
            {
                name: "Downsize Home at Retirement",
                description: "Sell family home and downsize to release equity for retirement income",
                modifications: {
                    planToDownsize: true
                }
            }
        ];

        // Insurance scenarios are now handled as hidden recommendations, not visible scenarios
        return standardScenarios;
    }

    // ========== CASH FLOW ANALYSIS ENGINE ==========

    /**
     * Extract base retirement expense estimates from cash flow analysis with safe fallbacks.
     * Returns the raw monthly expense components before retirement-phase adjustments are applied.
     * @param {Object} inputs - User financial inputs
     * @returns {{ housingExpense: number, livingExpense: number, mortgagePayment: number }}
     */
    extractBaseExpensesFromCashFlow(inputs) {
        if (inputs.useDetailedExpenseInputs) {
            return {
                housingExpense: inputs.currentMonthlyHousingCosts || 0,
                livingExpense: inputs.currentMonthlyLivingCosts || 0,
                mortgagePayment: inputs.monthlyMortgagePayment || 0
            };
        }

        const cashFlowAnalysis = this.calculateCashFlowAnalysis(inputs);
        const currentExpenses = cashFlowAnalysis.expenses || {};

        const housingExpense = currentExpenses.housing?.monthlyTotal
            || inputs.monthlyMortgagePayment
            || this.config.EXPENSE_FALLBACKS.DEFAULT_MONTHLY_HOUSING_COST;
        const livingExpense = currentExpenses.living?.monthlyTotal
            || this.config.EXPENSE_FALLBACKS.DEFAULT_MONTHLY_LIVING_COST;
        const mortgagePayment = currentExpenses.housing?.mortgagePayment
            || inputs.monthlyMortgagePayment
            || 0;

        return { housingExpense, livingExpense, mortgagePayment };
    }

    /**
     * Comprehensive cash flow analysis based on Australian household expense data
     * @param {Object} inputs - User financial inputs
     * @returns {Object} Detailed cash flow breakdown and constraints
     */
    calculateCashFlowAnalysis(inputs) {
        const grossIncome = (inputs.yourSalary || 0) + (inputs.partnerSalary || 0);
        const netIncome = this.calculateNetIncome(grossIncome, inputs);

        // Calculate comprehensive expenses
        const expenses = this.calculateHouseholdExpenses(inputs, netIncome);

        // Calculate available cash flow
        const monthlyDisposableIncome = netIncome / 12 - expenses.totalMonthly;
        const annualDisposableIncome = monthlyDisposableIncome * 12;

        // Calculate savings constraints and opportunities
        const savingsAnalysis = this.analyzeSavingsCapacity(inputs, monthlyDisposableIncome, expenses);

        return {
            income: {
                grossAnnual: grossIncome,
                netAnnual: netIncome,
                netMonthly: netIncome / 12,
                taxRate: ((grossIncome - netIncome) / grossIncome) * 100
            },
            expenses: expenses,
            cashFlow: {
                monthlyDisposableIncome: monthlyDisposableIncome,
                monthlyDisposable: monthlyDisposableIncome, // Keep both for compatibility
                annualDisposable: annualDisposableIncome,
                disposablePercent: (annualDisposableIncome / netIncome) * 100,
                status: this.getCashFlowStatus(monthlyDisposableIncome),
                housingStressRatio: (expenses.housing.monthlyTotal / (netIncome / 12))
            },
            constraints: {
                maxMonthlySavings: Math.max(0, monthlyDisposableIncome),
                maxAnnualSavings: Math.max(0, annualDisposableIncome),
                minExpenseReduction: monthlyDisposableIncome < 0 ? Math.abs(monthlyDisposableIncome) : 0,
                isHousingStressed: (expenses.housing.monthlyTotal / (netIncome / 12)) >
                    this.financialConfig.cashFlowAnalysis.FINANCIAL_STRESS_INDICATORS.HOUSING_STRESS_THRESHOLD.value
            },
            savingsAnalysis: savingsAnalysis, // This is what app.js expects
            opportunities: savingsAnalysis // Keep this for backwards compatibility
        };
    }

    /**
     * Calculate net income after tax and Medicare levy
     * @param {number} grossIncome - Gross annual income
     * @param {Object} inputs - User inputs for tax calculations
     * @returns {number} Net annual income
     */
    calculateNetIncome(grossIncome, inputs) {
        const hasPrivateCover = inputs && inputs.hasPrivateHealthCover !== false;
        return calculatePostTaxIncome(grossIncome, this.config.TAX_BRACKETS, hasPrivateCover);
    }

    /**
     * Calculate comprehensive household expenses based on ABS data and user inputs
     * @param {Object} inputs - User financial inputs
     * @param {number} netIncome - Net annual income
     * @returns {Object} Detailed expense breakdown
     */
    calculateHouseholdExpenses(inputs, netIncome) {
        if (inputs.useDetailedExpenseInputs) {
            const housingCosts = inputs.currentMonthlyHousingCosts || 0;
            const livingCosts = inputs.currentMonthlyLivingCosts || 0;
            const dependentCosts = this.calculateEnhancedDependentCosts(inputs);
            const familyExpenses = this.calculateFamilyExpenses(inputs.dependents || 0);
            const totalMonthly = housingCosts + livingCosts + dependentCosts + familyExpenses;

            return {
                housing: {
                    monthlyTotal: housingCosts,
                    mortgagePayment: inputs.monthlyMortgagePayment || 0,
                    housingStressRatio: housingCosts / Math.max(1, (netIncome / 12))
                },
                living: {
                    monthlyTotal: livingCosts
                },
                dependents: {
                    monthlyTotal: dependentCosts,
                    breakdown: this.getDependentCostBreakdown(inputs)
                },
                familyExpenses: {
                    monthlyTotal: familyExpenses
                },
                totalMonthly,
                totalAnnual: totalMonthly * 12,
                breakdown: {
                    livingDescription: 'User-entered monthly living costs',
                    housingDescription: 'User-entered monthly housing costs',
                    childcareDescription: this.getChildcareDescription(inputs.dependents || 0),
                    familyDescription: this.getFamilyExpenseDescription(inputs.dependents || 0)
                }
            };
        }

        const dependents = inputs.dependents || 0;
        const homeValue = inputs.homeValue || 0;

        // Base living expenses (2025 ABS data)
        const baseLivingExpenses = this.calculateBaseLivingExpenses(dependents);

        // Housing costs
        const housingCosts = this.calculateHousingCosts(inputs, homeValue, netIncome);

        // Enhanced dependent costs using detailed breakdown
        const dependentCosts = this.calculateEnhancedDependentCosts(inputs);

        // Other family-related expenses
        const familyExpenses = this.calculateFamilyExpenses(dependents);

        const totalMonthly = baseLivingExpenses + housingCosts + dependentCosts + familyExpenses;

        return {
            housing: {
                monthlyTotal: housingCosts,
                mortgagePayment: inputs.monthlyMortgagePayment || 0,
                housingStressRatio: housingCosts / (netIncome / 12)
            },
            living: {
                monthlyTotal: baseLivingExpenses
            },
            dependents: {
                monthlyTotal: dependentCosts,
                breakdown: this.getDependentCostBreakdown(inputs)
            },
            familyExpenses: {
                monthlyTotal: familyExpenses
            },
            totalMonthly: totalMonthly,
            totalAnnual: totalMonthly * 12,
            breakdown: {
                livingDescription: this.getLivingExpenseDescription(dependents),
                housingDescription: this.getHousingDescription(inputs, homeValue),
                childcareDescription: this.getChildcareDescription(dependents),
                familyDescription: this.getFamilyExpenseDescription(dependents)
            }
        };
    }

    /**
     * Calculate base living expenses using ABS household expenditure data
     */
    calculateBaseLivingExpenses(dependents) {
        // ABS 2025 data from centralized config
        const expenses = this.financialConfig.cashFlowAnalysis.BASE_LIVING_EXPENSES;
        const baseCouple = expenses.COUPLE_BASE.value;
        const perChild = expenses.PER_CHILD.value;

        return baseCouple + (dependents * perChild);
    }

    /**
     * Calculate housing costs including mortgage or rent
     */
    calculateHousingCosts(inputs, homeValue, netIncome) {
        const monthlyNetIncome = netIncome / 12;
        let totalHousingCosts = 0;

        // 1. Primary residence mortgage payment (actual user input)
        if (inputs.monthlyMortgagePayment && inputs.monthlyMortgagePayment > 0) {
            totalHousingCosts += inputs.monthlyMortgagePayment;
        } else if (homeValue > 0) {
            // Fallback: estimate based on 46.2% of income if no mortgage payment provided
            totalHousingCosts += monthlyNetIncome * 0.462;
        } else {
            // Renting: typically 25-35% of income
            totalHousingCosts += monthlyNetIncome * 0.30;
        }

        // 2. Investment property costs (if applicable)
        if (inputs.hasInvestmentProperty && inputs.investmentPropertyLoan > 0) {
            // Calculate investment property mortgage payment
            const loanAmount = inputs.investmentPropertyLoan;
            const annualRate = inputs.investmentPropertyRate || 0.062; // Default 6.2%
            const monthlyRate = annualRate / 12;
            const loanTermYears = 30; // Standard Australian mortgage term
            const numPayments = loanTermYears * 12;

            if (monthlyRate > 0 && loanAmount > 0) {
                // Standard mortgage payment formula
                const investmentMortgagePayment = loanAmount *
                    (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
                    (Math.pow(1 + monthlyRate, numPayments) - 1);

                totalHousingCosts += investmentMortgagePayment;

                // Subtract rental income (weekly rent × average weeks per month)
                const weeklyRent = inputs.weeklyRentalIncome || 0;
                const monthlyRentalIncome = weeklyRent * ENHANCED_CONFIG.AVERAGE_WEEKS_PER_MONTH;
                totalHousingCosts -= monthlyRentalIncome;
            }
        }

        return Math.max(0, totalHousingCosts); // Ensure non-negative
    }

    /**
     * Calculate childcare costs based on current Australian rates
     */
    calculateChildcareCosts(dependents) {
        if (dependents === 0) return 0;

        // Use centralized childcare config values
        const childcare = this.financialConfig.cashFlowAnalysis.CHILDCARE_COSTS;
        const dailyCost = childcare.DAILY_RATE.value;
        const daysPerWeek = 5;
        const weeksPerYear = 48; // Account for holidays
        const annualPerChild = dailyCost * daysPerWeek * weeksPerYear;

        // Apply government subsidy
        const subsidyRate = childcare.SUBSIDY_FACTOR.value;
        const netAnnualPerChild = annualPerChild * (1 - subsidyRate);

        return (netAnnualPerChild * Math.min(dependents, 2)) / 12; // Assume max 2 in childcare simultaneously
    }

    /**
     * Calculate additional family expenses (education, activities, larger vehicle, etc.)
     */
    calculateFamilyExpenses(dependents) {
        if (dependents === 0) return 0;

        // Additional costs: larger vehicle, activities, education, medical, clothing
        const perChildMonthly = 200; // Conservative estimate for additional family costs
        return dependents * perChildMonthly;
    }

    /**
     * Calculate enhanced dependent costs using detailed breakdown
     */
    calculateEnhancedDependentCosts(inputs) {
        if (!inputs.dependentDetails) {
            // Fallback to old method if detailed data not available
            return this.calculateChildcareCosts(inputs.dependents || 0);
        }

        const details = inputs.dependentDetails;
        const monthlyCosts = {
            childrenUnder5: 2835, // $135/day × 21 days/month (after 40% government subsidy)
            childrenPrimary: 800,  // School, activities, after-school care
            teenagers: 600,        // Technology, activities, pre-independence
            adultDisabled: 500,    // Your portion after NDIS covers most
            elderlyIndependent: 200, // Occasional support
            elderlyHomeCare: 400,   // Your extras beyond government support
            elderlyResidential: 1500, // Your portion of residential care
            otherDependents: 300    // Variable support
        };

        let totalMonthlyCost = 0;

        Object.keys(monthlyCosts).forEach(category => {
            const count = details[category] || 0;
            const percent = details[category + 'Percent'] || 0;

            if (count > 0 && percent > 0) {
                const categoryCost = count * monthlyCosts[category] * (percent / 100);
                totalMonthlyCost += categoryCost;
            }
        });

        return totalMonthlyCost;
    }

    /**
     * Get detailed breakdown of dependent costs for display
     */
    getDependentCostBreakdown(inputs) {
        if (!inputs.dependentDetails) {
            return { summary: 'Childcare and basic support costs' };
        }

        const details = inputs.dependentDetails;
        const breakdown = {};
        const categories = {
            childrenUnder5: 'Childcare (under 5)',
            childrenPrimary: 'School age children (6-12)',
            teenagers: 'Teenagers (13-18)',
            adultDisabled: 'Adult children with disabilities',
            elderlyIndependent: 'Independent elderly parents',
            elderlyHomeCare: 'Elderly parents (home care)',
            elderlyResidential: 'Elderly parents (residential care)',
            otherDependents: 'Other dependents'
        };

        Object.keys(categories).forEach(category => {
            const count = details[category] || 0;
            const percent = details[category + 'Percent'] || 0;

            if (count > 0) {
                breakdown[categories[category]] = {
                    count: count,
                    yourContribution: `${percent}%`,
                    category: category
                };
            }
        });

        return breakdown;
    }

    /**
     * Analyze savings capacity and identify opportunities
     */
    analyzeSavingsCapacity(inputs, monthlyDisposableIncome, expenses) {
        const opportunities = [];
        const homeValue = inputs.homeValue || 0;
        const investmentProperty = inputs.hasInvestmentProperty;

        if (monthlyDisposableIncome < 0) {
            // Negative cash flow - need drastic action
            opportunities.push({
                type: 'critical',
                title: 'Immediate Action Required',
                description: `Monthly shortfall of $${Math.abs(monthlyDisposableIncome).toFixed(0)}`,
                suggestions: [
                    'Consider downsizing home to reduce mortgage payments',
                    'Reduce childcare costs (part-time work arrangement)',
                    'Sell non-essential assets',
                    'Debt consolidation or refinancing'
                ]
            });
        } else if (monthlyDisposableIncome < 500) {
            // Tight cash flow
            opportunities.push({
                type: 'tight',
                title: 'Limited Savings Capacity',
                description: `Only $${monthlyDisposableIncome.toFixed(0)} available monthly`,
                suggestions: [
                    'Focus on small, consistent contributions',
                    'Optimize current expenses before increasing savings',
                    'Consider government incentives (super co-contributions)',
                    'Build emergency fund first ($1,000-2,000)'
                ]
            });
        } else if (monthlyDisposableIncome < 1500) {
            // Moderate cash flow
            opportunities.push({
                type: 'moderate',
                title: 'Moderate Savings Potential',
                description: `$${monthlyDisposableIncome.toFixed(0)} available for savings/investments`,
                suggestions: [
                    'Balanced approach: emergency fund + retirement savings',
                    'Consider salary sacrificing to super',
                    'Start small with ETF investments ($200-500/month)',
                    'Optimize asset allocation'
                ]
            });
        } else {
            // Good cash flow
            opportunities.push({
                type: 'good',
                title: 'Strong Savings Capacity',
                description: `$${monthlyDisposableIncome.toFixed(0)} available for wealth building`,
                suggestions: [
                    'Maximize concessional super contributions',
                    'Diversify investments (stocks, bonds, property)',
                    'Consider investment property or REITs',
                    'Tax-effective investing strategies'
                ]
            });
        }

        // Asset liquidation opportunities
        if (homeValue > 500000) {
            const downsizingSavings = this.calculateDownsizingSavings(homeValue);
            opportunities.push({
                type: 'asset_strategy',
                title: 'Home Downsizing Opportunity',
                description: `Release $${downsizingSavings.equity.toFixed(0)} equity, save $${downsizingSavings.monthlyReduction.toFixed(0)}/month`,
                suggestions: [
                    'Downsize to smaller property',
                    'Move to lower-cost area',
                    'Consider apartment vs house',
                    'Release equity for investments'
                ]
            });
        }

        if (investmentProperty) {
            opportunities.push({
                type: 'asset_strategy',
                title: 'Investment Property Strategy',
                description: 'Consider selling vs holding based on cash flow needs',
                suggestions: [
                    'Sell if generating negative cash flow',
                    'Use equity to improve cash flow',
                    'Compare property vs share returns',
                    'Consider REIT alternative'
                ]
            });
        }

        // Analyze savings capacity based on disposable income
        const canIncreaseSavings = monthlyDisposableIncome > 200;
        const hasStrongCapacity = monthlyDisposableIncome > 1000;
        const hasTightCapacity = monthlyDisposableIncome < 500;

        return {
            canIncreaseSavings,
            hasStrongCapacity,
            hasTightCapacity,
            monthlyCapacity: monthlyDisposableIncome,
            opportunities,
            status: monthlyDisposableIncome < 0 ? 'deficit' :
                monthlyDisposableIncome < 200 ? 'critical' :
                    monthlyDisposableIncome < 500 ? 'tight' :
                        monthlyDisposableIncome < 1000 ? 'moderate' : 'strong'
        };
    }

    /**
     * Calculate potential savings from downsizing home
     */
    calculateDownsizingSavings(currentHomeValue) {
        const downsizeValue = currentHomeValue * 0.65; // Assume 35% reduction in home value
        const equityRelease = currentHomeValue * 0.35; // Assume some equity release
        const currentMortgagePayment = (currentHomeValue * 0.04) / 12; // Rough estimate
        const newMortgagePayment = (downsizeValue * 0.04) / 12;
        const monthlyReduction = currentMortgagePayment - newMortgagePayment;

        return {
            equity: equityRelease,
            monthlyReduction: monthlyReduction
        };
    }

    /**
     * Get cash flow status description
     */
    getCashFlowStatus(monthlyDisposable) {
        if (monthlyDisposable < 0) return 'Critical - Spending exceeds income';
        if (monthlyDisposable < 500) return 'Tight - Limited flexibility';
        if (monthlyDisposable < 1500) return 'Moderate - Some savings capacity';
        return 'Good - Strong savings potential';
    }

    // Description helper methods
    getLivingExpenseDescription(dependents) {
        if (dependents === 0) return 'Couple base living expenses (food, utilities, transport, etc.)';
        return `Family living expenses for ${dependents} dependents (food, utilities, transport, etc.)`;
    }

    getHousingDescription(inputs, homeValue) {
        const components = [];

        // Primary residence
        if (inputs.monthlyMortgagePayment && inputs.monthlyMortgagePayment > 0) {
            components.push(`Home mortgage: $${inputs.monthlyMortgagePayment.toFixed(0)}/month`);
        } else if (homeValue > 0) {
            components.push(`Home mortgage (estimated at 46.2% of income)`);
        } else {
            components.push(`Rental payments (30% of income)`);
        }

        // Investment property
        if (inputs.hasInvestmentProperty && inputs.investmentPropertyLoan > 0) {
            const loanAmount = inputs.investmentPropertyLoan;
            const annualRate = inputs.investmentPropertyRate || 0.062;
            const monthlyRate = annualRate / 12;
            const numPayments = 30 * 12; // 30 years

            if (monthlyRate > 0 && loanAmount > 0) {
                const investmentMortgagePayment = loanAmount *
                    (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
                    (Math.pow(1 + monthlyRate, numPayments) - 1);

                components.push(`Investment property mortgage: $${investmentMortgagePayment.toFixed(0)}/month`);

                // Rental income
                const weeklyRent = inputs.weeklyRentalIncome || 0;
                if (weeklyRent > 0) {
                    const monthlyRentalIncome = weeklyRent * ENHANCED_CONFIG.AVERAGE_WEEKS_PER_MONTH;
                    components.push(`Less rental income: -$${monthlyRentalIncome.toFixed(0)}/month`);
                }
            }
        }

        return components.join(', ');
    }

    getChildcareDescription(dependents) {
        if (dependents === 0) return 'No childcare costs';
        return `Childcare for ${Math.min(dependents, 2)} children ($135/day average, 5 days/week, after subsidies)`;
    }

    getFamilyExpenseDescription(dependents) {
        if (dependents === 0) return 'No additional family expenses';
        return `Additional family costs (activities, education, medical, larger vehicle, clothing)`;
    }
}

export default RetirementSimulator;
