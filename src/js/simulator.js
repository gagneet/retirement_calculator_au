// js/simulator.js - Financial Simulation Engine with Investment Property Support

const debugLog = process.env.NODE_ENV !== 'production' ? console.log.bind(console) : () => {};

import { ENHANCED_FINANCIAL_CONFIG } from './enhanced-config.js';
import { ENHANCED_CONFIG } from './config.js';
import { EnhancedMonteCarloEngine } from './enhanced-monte-carlo.js';
import { getSGRate } from './simulation_engine/super_engine.js';
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
    clamp
} from './utils.js';

const RUN_UNTIL_DEPLETION_AGE = 120;

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
        const debtLevel = inputs.hasDebt;
        if (debtLevel === 'none') score += 20;
        else if (debtLevel === 'minimal') score += 8; // <10% of income
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
        const australianEquityAllocation = (allocation.equity / 100) * (inputs.australianEquityAllocation / 100);

        // Use user-provided dividend yield and franking rate
        const dividendYield = inputs.dividendYield / 100; // Convert percentage to decimal
        const frankingRate = inputs.frankingRate / 100;   // Convert percentage to decimal
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
        const { PROPERTY_GROWTH_MAX_RATE, PROPERTY_GROWTH_MAX_YEARS } = this.config.SIMULATION;
        const rate = growthRate > 1 ? growthRate / 100 : growthRate;
        const cappedYears = Math.min(years, PROPERTY_GROWTH_MAX_YEARS);
        const cappedRate = Math.max(0, Math.min(rate, PROPERTY_GROWTH_MAX_RATE));
        return currentValue * Math.pow(1 + cappedRate, cappedYears);
    }

    // Enhanced property calculation with Australian cycle patterns
    calculateEnhancedPropertyReturn(year, baseGrowthRate, useVolatility = false, prevReturn = null) {
        if (!useVolatility) {
            return baseGrowthRate;
        }

        const cyclePhase = getPropertyCyclePhase(year);
        const cycleConfig = this.config.MARKET_REGIMES.propertyCycles.find(
            c => c.phase === cyclePhase
        ) || this.config.MARKET_REGIMES.propertyCycles[4]; // Default to recovery

        let actualReturn;
        if (useVolatility) {
            actualReturn = regimeAwareReturn(
                cycleConfig.baseReturn,
                cycleConfig.volatility,
                prevReturn,
                0.15 // Property has higher sequential correlation
            );
        } else {
            actualReturn = cycleConfig.baseReturn;
        }

        // Ensure property returns don't go below -30% (historical floor)
        return Math.max(-0.30, actualReturn);
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

    calculatePropertyCashFlow(inputs, year = 0) {
        if (!inputs.hasInvestmentProperty) return null;

        const inflationRate = inputs.inflation;
        const vacancyRate = inputs.vacancyRate || 0.04; // default 4% vacancy
        const maintenanceInflationRate = inputs.maintenanceInflation || inflationRate;
        const annualLandTax = (inputs.landTax || 0) * Math.pow(1 + inflationRate, year);

        // Gross rental adjusted for vacancy rate
        const grossRental = inputs.weeklyRentalIncome * 52 * Math.pow(1 + inflationRate, year);
        const currentRental = grossRental * (1 - vacancyRate);

        // Expenses grow at maintenance-specific inflation rate
        const currentExpenses = inputs.annualPropertyExpenses * Math.pow(1 + maintenanceInflationRate, year)
            + annualLandTax;

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
    getSalaryForYear(baseSalary, year, inputs, isPartner = false) {
        const yearsToRetirement = inputs.retirementAge - inputs.yourCurrentAge;
        // FIX Bug 2: inputs.salaryGrowthRate is already a decimal (e.g. 0.015 = 1.5%).
        // The previous code divided by 100 again, making growth 100× too small.
        const realGrowthRate = inputs.salaryGrowthRate;
        const inflationRate = inputs.inflation;

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
        // Reset previous returns for each simulation
        this.previousReturns = {
            portfolio: null,
            property: null
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

        // Calculate total simulation years based on the maximum lifespan from current age
        const maxYearsFromNow = Math.max(
            effectiveYourLifespan - inputs.yourCurrentAge,
            effectivePartnerLifespan - inputs.partnerCurrentAge
        );
        const yearsInRetirement = Math.max(0, maxYearsFromNow - yearsToRetirement);

        // Use scenario-adjusted inputs for all financial calculations
        inputs = effectiveInputs; // eslint-disable-line no-param-reassign

        // Pre-retirement accumulation phase
        let accumulatedSuperBalance = inputs.yourCurrentSuper + inputs.partnerCurrentSuper;
        // Reduce starting savings by non-mortgage debts (these are liabilities against net worth)
        const totalOtherDebts = (inputs.creditCardBalance || 0) + (inputs.personalLoanBalance || 0) + (inputs.carLoanBalance || 0);
        let accumulatedSavingsBalance = Math.max(0, inputs.currentSavings - totalOtherDebts);
        let accumulatedInvestmentPortfolio = inputs.currentStocks;
        let propertyWasSold = false;
        let propertyEquity = 0;

        const allocationHistory = [];
        const healthcareCostHistory = [];
        const propertyHistory = [];
        const regimeHistory = []; // Track regime changes for enhanced MC

        // Pre-retirement simulation
        const simulationEndYear = inputs.isSingleCalculation ?
            Math.max(yearsToRetirement, effectiveYourLifespan - inputs.yourCurrentAge) :
            Math.max(yearsToRetirement, effectiveYourLifespan - inputs.yourCurrentAge, effectivePartnerLifespan - inputs.partnerCurrentAge);

        for (let year = 1; year <= simulationEndYear; year++) {
            const yourCurrentAge = inputs.yourCurrentAge + year;
            const partnerCurrentAge = inputs.isSingleCalculation ? 0 : inputs.partnerCurrentAge + year;

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

            // Apply stress scenario if provided
            if (stressScenario && year <= stressScenario.duration) {
                if (stressScenario.equityReturn) {
                    returnRate = (allocation.equity / 100) * stressScenario.equityReturn +
                        (allocation.bonds / 100) * (stressScenario.bondReturn || 0.02) +
                        (allocation.cash / 100) * 0.01;
                }
            }

            // Apply returns
            accumulatedSuperBalance *= (1 + inputs.superReturn);
            accumulatedSavingsBalance *= (1 + inputs.savingsReturn);
            accumulatedInvestmentPortfolio *= (1 + returnRate);

            // Deduct SMSF admin costs from super balance
            if (inputs.hasSMSF && inputs.smsfAdminCosts > 0) {
                accumulatedSuperBalance = Math.max(0, accumulatedSuperBalance - inputs.smsfAdminCosts);
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
            const div293Threshold = this.config.DIVISION_293_THRESHOLD || 250000;

            let yearlyPostTaxIncome = 0;
            let yearlySuperContribution = 0;

            // TSB gate: when combined super approaches the Transfer Balance Cap, block voluntary
            // contributions (salary sacrifice). Employer SG is mandatory and continues.
            const tbcThreshold = this.config.TRANSFER_BALANCE_CAP || 2000000;
            const superIsCapped = accumulatedSuperBalance >= tbcThreshold;

            // Year 1 only: if user has already used some concessional cap this FY, reduce available room.
            // Declared here so both person and partner if-blocks can reference it.
            const concessionalAlreadyUsed = (year === 1) ? (inputs.concessionalCapUsed || 0) : 0;

            if (year <= yourYearsToWork) {
                const yourGrossSalary = this.getSalaryForYear(inputs.yourSalary, year, inputs);
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

                // Concessional contributions tax: 15% flat; LISTO offsets for low incomes
                const yourTotalConcessional = yourEmployerSG + yourSacrifice;
                const yourLISTO = yourTaxableSalary <= listoThreshold
                    ? Math.min(yourTotalConcessional * 0.15, listoMaxOffset)
                    : 0;
                // Division 293: extra 15% where income + concessional > $250,000
                const yourDiv293 = Math.max(0, Math.min(
                    yourTotalConcessional,
                    yourTaxableSalary + yourTotalConcessional - div293Threshold
                )) * 0.15;
                yearlySuperContribution += yourTotalConcessional * 0.85 + yourLISTO - yourDiv293;
            }
            if (year <= partnerYearsToWork) {
                const partnerGrossSalary = this.getSalaryForYear(inputs.partnerSalary, year, inputs, true);
                const effectiveEmployerRate = inputs.employerSuperContributionRate ?? inputs.superContributionRate ?? getSGRate(projectionYear);
                const partnerEmployerSG = partnerGrossSalary * effectiveEmployerRate;
                const partnerSacrifice = superIsCapped ? 0 : Math.min(
                    inputs.partnerAdditionalSuperContribution || 0,
                    Math.max(0, 30000 - partnerEmployerSG - concessionalAlreadyUsed)
                );
                const partnerTaxableSalary = partnerGrossSalary - partnerSacrifice;
                // Pass proposedEnabled so WATO and instant deduction only apply when user opts in.
                yearlyPostTaxIncome += calculatePostTaxIncome(partnerTaxableSalary, taxBrackets, hasPrivateCover, projectionYear, proposedEnabled);

                const partnerTotalConcessional = partnerEmployerSG + partnerSacrifice;
                const partnerLISTO = partnerTaxableSalary <= listoThreshold
                    ? Math.min(partnerTotalConcessional * 0.15, listoMaxOffset)
                    : 0;
                const partnerDiv293 = Math.max(0, Math.min(
                    partnerTotalConcessional,
                    partnerTaxableSalary + partnerTotalConcessional - div293Threshold
                )) * 0.15;
                yearlySuperContribution += partnerTotalConcessional * 0.85 + partnerLISTO - partnerDiv293;
            }

            accumulatedSuperBalance += yearlySuperContribution;
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
                const inflatedCarerExpense = inputs.carerAnnualExpense * Math.pow(1 + inputs.inflation, year);
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
                    const lhcAnnualCost = basePremium * loadingPct * Math.pow(1 + (inputs.inflation || 0.025), year - 1);
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
                annualEdCost *= Math.pow(1 + inputs.inflation, year); // inflate over time
                accumulatedSavingsBalance = Math.max(0, accumulatedSavingsBalance - annualEdCost);
            }

            // Property calculations
            if (inputs.hasInvestmentProperty && yourCurrentAge <= inputs.retirementAge) {
                const propertyCashFlow = this.calculatePropertyCashFlow(inputs, year);
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
                        // Calculate current property equity with enhanced cycle-based returns
                        // inputs.propertyGrowthRate is already in decimal form (e.g. 0.05 for 5%)
                        let propertyReturn;
                        if (useRandomReturns) {
                            propertyReturn = this.calculateEnhancedPropertyReturn(
                                year,
                                inputs.propertyGrowthRate,
                                true,
                                this.previousReturns.property
                            );
                            this.previousReturns.property = propertyReturn;
                        } else {
                            propertyReturn = inputs.propertyGrowthRate;
                        }

                        const currentValue = this.calculatePropertyValue(
                            inputs.investmentPropertyValue,
                            propertyReturn,
                            year
                        );
                        const remainingLoan = this.calculatePropertyLoanBalance(
                            inputs.investmentPropertyLoan,
                            inputs.investmentPropertyRate,
                            year
                        );
                        propertyEquity = currentValue - remainingLoan;
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
            if (yourCurrentAge > inputs.retirementAge) {
                break;
            }
        }

        // At retirement setup
        // FIX Bug 7: Primary home should grow at propertyGrowthRate (e.g. 5.8% CoreLogic median),
        // not at general CPI inflation (2.6%). Using inflation was understating home equity at
        // retirement by ~$1.4 M on a $1 M home over 20 years.
        const homeGrowthRate = inputs.propertyGrowthRate > 0 ? inputs.propertyGrowthRate : inputs.inflation;
        const homeValueAtRetirement = inputs.homeValue * Math.pow(1 + homeGrowthRate, yearsToRetirement);
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
        const agedCareCosts = this.calculateAgedCareCosts(inputs);

        // Calculate non-liquid assets
        const inaccessibleHomeEquity = inputs.planToDownsize ? 0 : homeEquityAtRetirement;

        const balances = [];
        const yearlyData = [];

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

            // Enhanced healthcare costs
            const healthcareCost = this.projectHealthcareCosts(
                inputs.currentHealthcareCosts,
                retirementYear,
                inputs.healthcareInflation
            );

            // Aged care costs if applicable - inflate from the current year, not from start age
            let agedCareCost = 0;
            if (yourCurrentAge >= inputs.agedCareStartAge &&
                yourCurrentAge < inputs.agedCareStartAge + inputs.agedCareDuration) {
                // Calculate years from current age to this aged care year
                const yearsFromNow = yourCurrentAge - inputs.yourCurrentAge;
                // Apply healthcare inflation from current year to this aged care year
                // FIX Bug 4: healthcareInflation is already decimal — no /100 needed.
                let annualCost = inputs.agedCareAnnualCost * Math.pow(1 + inputs.healthcareInflation, yearsFromNow);

                // Handle partial years - if this is the last year of care and duration has a decimal
                const yearsInCare = yourCurrentAge - inputs.agedCareStartAge;
                const remainingCare = inputs.agedCareDuration - yearsInCare;

                // If this is a partial final year (remaining care < 1 year), pro-rate the cost
                if (remainingCare < 1 && remainingCare > 0) {
                    annualCost = annualCost * remainingCare;
                }

                // Also check if person dies during aged care - don't charge beyond lifespan
                if (yourCurrentAge >= effectiveYourLifespan) {
                    annualCost = 0; // No cost if person has passed away
                } else if (yourCurrentAge + 1 > effectiveYourLifespan) {
                    // Partial year if person dies during this year
                    const partialYear = effectiveYourLifespan - yourCurrentAge;
                    annualCost = annualCost * partialYear;
                }

                agedCareCost = annualCost;
            }

            // Property income (if still owned) and update property equity
            let propertyIncome = 0;
            if (inputs.hasInvestmentProperty && !propertyWasSold) {
                const propertyCashFlow = this.calculatePropertyCashFlow(inputs, retirementYear);
                if (propertyCashFlow) {
                    propertyIncome = Math.max(0, propertyCashFlow.netCashFlow);
                }

                // Update property equity for current retirement year
                const currentValue = this.calculatePropertyValue(
                    inputs.investmentPropertyValue,
                    inputs.propertyGrowthRate,
                    retirementYear
                );
                const remainingLoan = this.calculatePropertyLoanBalance(
                    inputs.investmentPropertyLoan,
                    inputs.investmentPropertyRate,
                    retirementYear
                );
                propertyEquity = currentValue - remainingLoan;
            }

            // Enhanced realistic expense calculation using cash flow analysis
            let baseIncomeNeeded;

            if (useRandomReturns) {
                // Use realistic expense analysis with proper error handling
                try {
                    const { housingExpense, livingExpense, mortgagePayment } = this.extractBaseExpensesFromCashFlow(inputs);

                    // Calculate retirement expenses (many costs reduce in retirement)
                    const retirementHousing = Math.max(
                        housingExpense * 0.6, // Assume 40% reduction (no mortgage in many cases)
                        housingExpense - mortgagePayment // Or just remove mortgage
                    );
                    const retirementLiving = livingExpense * 0.85; // 15% reduction in living costs
                    const retirementChildcare = 0; // No childcare in retirement

                    const baseMonthlyExpenses = retirementHousing + retirementLiving + retirementChildcare;
                    const baseAnnualExpenses = baseMonthlyExpenses * ENHANCED_CONFIG.MONTHS_IN_YEAR;

                    // Apply inflation to get expenses in retirement year
                    const expensesWithInflation = baseAnnualExpenses * Math.pow(1 + inputs.inflation, retirementYear);

                    // Add realistic randomization based on expense categories
                    const housingVariation = retirementHousing * ENHANCED_CONFIG.MONTHS_IN_YEAR * (Math.random() - 0.5) * 0.3; // ±30% housing variation
                    const livingVariation = retirementLiving * ENHANCED_CONFIG.MONTHS_IN_YEAR * (Math.random() - 0.5) * 0.4; // ±40% living variation
                    const discretionaryVariation = (Math.random() - 0.5) * 20000; // ±$10,000 discretionary spending

                    baseIncomeNeeded = Math.max(
                        expensesWithInflation + housingVariation + livingVariation + discretionaryVariation,
                        inputs.asfaComfortable * 0.7 * Math.pow(1 + inputs.inflation, retirementYear) // Minimum safety floor at 70% ASFA
                    );
                } catch (error) {
                    console.warn('Cash flow analysis failed in Monte Carlo, using ASFA fallback:', error);
                    // Fallback to enhanced ASFA with variation
                    const asfaWithInflation = inputs.asfaComfortable * Math.pow(1 + inputs.inflation, retirementYear);
                    const randomVariation = (Math.random() - 0.5) * 2 * 25000; // ±$25,000 fallback
                    baseIncomeNeeded = Math.max(0, asfaWithInflation + randomVariation);
                }
            } else {
                // For deterministic runs, use more realistic baseline with error handling
                try {
                    const { housingExpense, livingExpense, mortgagePayment } = this.extractBaseExpensesFromCashFlow(inputs);

                    // Conservative retirement expense estimate
                    const retirementHousing = Math.max(
                        housingExpense * 0.7, // 30% reduction
                        housingExpense - mortgagePayment
                    );
                    const retirementLiving = livingExpense * 0.9; // 10% reduction
                    const baseMonthlyExpenses = retirementHousing + retirementLiving;
                    const baseAnnualExpenses = baseMonthlyExpenses * ENHANCED_CONFIG.MONTHS_IN_YEAR;

                    // Apply inflation
                    baseIncomeNeeded = Math.max(
                        baseAnnualExpenses * Math.pow(1 + inputs.inflation, retirementYear),
                        inputs.asfaComfortable * Math.pow(1 + inputs.inflation, retirementYear) // Keep ASFA as minimum
                    );
                } catch (error) {
                    console.warn('Cash flow analysis failed in deterministic calculation, using ASFA fallback:', error);
                    // Fallback to standard ASFA calculation
                    baseIncomeNeeded = inputs.asfaComfortable * Math.pow(1 + inputs.inflation, retirementYear);
                }
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
                    lhcRetirementCost = basePremium * loadingPct * Math.pow(1 + (inputs.inflation || 0.025), retirementYear);
                }
            }

            // Travel and hobby expenses in retirement (inflation-adjusted from today's dollars)
            const travelHobbyBase = (inputs.annualTravelBudget || 0) + (inputs.annualHobbyBudget || 0);
            const travelHobbyWithInflation = travelHobbyBase * Math.pow(1 + inputs.inflation, retirementYear);

            // Health condition multiplier for healthcare costs
            const healthMultiplier = { excellent: 0.8, good: 1.0, fair: 1.25, poor: 1.6 }[inputs.healthCondition] || 1.0;
            const adjustedHealthcareCost = healthcareCost * healthMultiplier;

            const totalCostWithHealthcare = baseIncomeNeeded + adjustedHealthcareCost + agedCareCost + lhcRetirementCost + travelHobbyWithInflation;

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
            const totalIncome = pensionIncome + propertyIncome + trustDistributionNetIncome;
            const netWithdrawalNeeded = Math.max(0, totalCostWithHealthcare - totalIncome);

            // Enhanced return calculation with regime modeling
            const baseReturn = this.calculateEnhancedReturn(
                allocation,
                inputs.investmentReturn,
                inputs
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
                if (stressScenario.equityReturn !== undefined) {
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

            // Monthly withdrawal simulation
            const monthlyReturn = Math.pow(1 + actualReturn, 1/12) - 1;
            const monthlyWithdrawal = annualWithdrawal / 12;

            const startBalance = currentBalance;
            let yearlyGrowth = 0;

            for (let month = 1; month <= 12; month++) {
                const monthlyGrowth = currentBalance * monthlyReturn;
                yearlyGrowth += monthlyGrowth;
                currentBalance = currentBalance + monthlyGrowth - monthlyWithdrawal;

                if (currentBalance <= 0) {
                    currentBalance = 0;
                    break;
                }
            }

            // Calculate liquid vs non-liquid assets for this year with growth
            const liquidAssets = startBalance; // Beginning of year liquid assets
            const endLiquidAssets = currentBalance; // End of year liquid assets after transactions

            // Update home equity with property growth over time
            // FIX Bug 7 (cont.): use propertyGrowthRate, not CPI inflation, for home equity growth.
            const yearsFromRetirement = i;
            const currentHomeEquity = inputs.planToDownsize ? 0 :
                homeEquityAtRetirement * Math.pow(1 + homeGrowthRate, yearsFromRetirement);

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
                returnRate: actualReturn * 100,
                growth: yearlyGrowth,
                withdrawal: annualWithdrawal,
                minDrawAmount: minAnnualDraw,
                minDrawRate: minDrawdownRate,
                healthcareCost,
                agedCareCost,
                propertyIncome,
                pensionIncome,
                endBalance: currentBalance,
                liquidAssets,
                nonLiquidAssets,
                depleted: false
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

        for (let i = 0; i < runs; i++) {
            const result = this.simulateRetirement(inputs, true);
            outcomes.push(result.finalBalance);
            paths.push(result.balances);

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

        return {
            outcomes,
            paths,
            propertyOutcomes,
            successRate: successfulOutcomes.length / runs,
            failureRate,
            median: medianOutcome,
            mean: outcomes.reduce((sum, val) => sum + val, 0) / outcomes.length,
            percentiles,
            medianReturnsByYear,
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
            const mcResult = await this.runMonteCarloSimulation(scenarioInputs, 1000, null);

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
                name: "Market Crash in First Retirement Year",
                description: `Simulate a ${Math.abs((baseInputs.shockMagnitude || -0.4) * 100).toFixed(0)}% portfolio decline in your first year of retirement (using your shock settings)`,
                modifications: {
                    // Use stress scenario instead of random shocks for guaranteed market crash
                    _stressScenario: {
                        name: 'market_crash_first_year',
                        equityReturn: baseInputs.shockMagnitude || -0.4, // User's shock magnitude or -40%
                        bondReturn: (baseInputs.shockMagnitude || -0.4) * 0.25, // Bonds decline proportionally less
                        duration: 1, // Only first year of retirement
                        startYear: 'retirement' // Start at retirement
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
                description: `Healthcare costs inflate at ${this.financialConfig.stressTesting.HEALTHCARE_STRESS.HIGH_INFLATION_RATE.value}% annually instead of ${(baseInputs.healthcareInflation || 6.1).toFixed(1)}% (stress test based on historical spikes)`,
                modifications: {
                    healthcareInflation: this.financialConfig.stressTesting.HEALTHCARE_STRESS.HIGH_INFLATION_RATE.value
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
