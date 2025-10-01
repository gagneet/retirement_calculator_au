// js/simulator.js - Financial Simulation Engine with Investment Property Support

import { ENHANCED_CONFIG } from './config.js';
import { ENHANCED_FINANCIAL_CONFIG } from './enhanced-config.js';
import { EnhancedMonteCarloEngine } from './enhanced-monte-carlo.js';
import {
    calculatePostTaxIncome,
    calculateLoanBalance,
    calculatePropertyCashFlow,
    calculateCGT,
    calculateAgePension,
    randomNormal,
    median,
    regimeAwareReturn,
    getPropertyCyclePhase,
    getCurrentRateRegime,
    clamp
} from './utils.js';

export class RetirementSimulator {
    constructor() {
        // Merge original config with enhanced financial config
        this.config = ENHANCED_CONFIG;
        this.financialConfig = ENHANCED_FINANCIAL_CONFIG;
        this.enhancedMonteCarloEngine = new EnhancedMonteCarloEngine();
        this.previousReturns = {
            portfolio: null,
            property: null
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

        // Enhanced income stability scoring
        if (totalIncome > 300000) score += 25;
        else if (totalIncome > 200000) score += 20;
        else if (totalIncome > 150000) score += 15;
        else if (totalIncome > 100000) score += 10;
        else if (totalIncome > 75000) score += 8;
        else if (totalIncome > 50000) score += 5;
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
        const lifeExpectancy = Math.max(inputs.yourLifespan, inputs.partnerLifespan);
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
        const equityPercent = this.config.GLIDE_PATH_RULES[glidePathRule](age);
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
        // In retirement with low taxable income, franking credits are often fully refundable
        const corporateTaxRate = 0.30;

        if (marginalTaxRate < corporateTaxRate) {
            // Full refund of excess franking credits
            return frankingCredits * (1 - marginalTaxRate / corporateTaxRate);
        } else {
            // Franking credits offset tax liability
            return frankingCredits * (corporateTaxRate / marginalTaxRate);
        }
    }

    // Healthcare cost projection
    projectHealthcareCosts(currentCosts, years, healthcareInflation) {
        return currentCosts * Math.pow(1 + healthcareInflation / 100, years);
    }

    // Aged care cost calculation
    calculateAgedCareCosts(inputs) {
        const annualCost = inputs.agedCareAnnualCost;
        const yearsToAgedCare = inputs.agedCareStartAge - inputs.yourCurrentAge;
        const inflatedCost = annualCost * Math.pow(1 + inputs.healthcareInflation / 100, yearsToAgedCare);
        const totalCost = inflatedCost * inputs.agedCareDuration;
        const probability = inputs.agedCareProbability / 100;

        return {
            annualCost: inflatedCost,
            totalCost,
            expectedCost: totalCost * probability,
            probability
        };
    }

    // Investment property calculations with cycle-based modeling
    calculatePropertyValue(currentValue, growthRate, years) {
        // Ensure growthRate is in decimal form (not percentage)
        const rate = growthRate > 1 ? growthRate / 100 : growthRate;

        // Cap years to prevent overflow and unrealistic projections
        const cappedYears = Math.min(years, 50); // Maximum 50 years of property growth

        // Cap growth rate to reasonable bounds (0% to 20% annually)
        const cappedRate = Math.max(0, Math.min(rate, 0.20));

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
        const currentRental = inputs.weeklyRentalIncome * 52 * Math.pow(1 + inflationRate, year);
        const currentExpenses = inputs.annualPropertyExpenses * Math.pow(1 + inflationRate, year);

        // Calculate interest cost
        const currentLoanBalance = this.calculatePropertyLoanBalance(
            inputs.investmentPropertyLoan,
            inputs.investmentPropertyRate,
            year
        );
        const annualInterest = currentLoanBalance * inputs.investmentPropertyRate;

        // Calculate depreciation benefit (2.5% of building value, assume 80% of property is building)
        const buildingValue = inputs.investmentPropertyValue *
            this.financialConfig.propertyInvestment.VALUATION_ASSUMPTIONS.BUILDING_VALUE_RATIO.value;
        const depreciation = buildingValue * this.config.PROPERTY_COSTS.DEPRECIATION_RATE;

        return {
            grossRental: currentRental,
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

        const remainingLoan = this.calculatePropertyLoanBalance(
            inputs.investmentPropertyLoan,
            inputs.investmentPropertyRate,
            saleYear
        );

        const sellingCosts = saleValue * this.config.PROPERTY_COSTS.SELLING_COSTS_PERCENT;

        const capitalGain = saleValue - inputs.investmentPropertyValue;
        const cgtPayable = calculateCGT(
            saleValue,
            inputs.investmentPropertyValue,
            true, // Assume Australian resident
            saleYear,
            inputs.capitalGainsTaxRate / 100
        );

        const netProceeds = saleValue - remainingLoan - sellingCosts - cgtPayable;

        return {
            saleValue,
            remainingLoan,
            sellingCosts,
            capitalGain,
            cgtPayable,
            netProceeds,
            totalReturn: (capitalGain + netProceeds) / inputs.investmentPropertyValue
        };
    }

    // Salary progression with lean years
    getSalaryForYear(baseSalary, year, inputs) {
        const yearsToRetirement = inputs.retirementAge - inputs.yourCurrentAge;
        const realGrowthRate = inputs.salaryGrowthRate / 100;
        const inflationRate = inputs.inflation;

        let salary = baseSalary * Math.pow(1 + realGrowthRate + inflationRate, year);

        const leanYearsStartYear = yearsToRetirement - inputs.leanYearsStart;
        if (year >= leanYearsStartYear) {
            salary *= (1 - inputs.leanYearsReduction / 100);
        }

        return salary;
    }

    // Enhanced portfolio return calculation with market regimes
    getReturnForYear(baseReturn, year, declineRate) {
        return Math.max(0.01, baseReturn - (declineRate / 100) * year);
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

    calculatePortfolioReturn(allocations, baseReturn, year, declineRate, useVolatility = false, prevReturn = null) {
        if (useVolatility) {
            // Use enhanced regime-aware calculation
            const marketReturn = this.calculateEnhancedMarketReturn(year, baseReturn, useVolatility, prevReturn);
            const rateRegime = getCurrentRateRegime(year + 2024);

            const equityReturn = marketReturn;
            // Use user's base return scaled for bonds/cash, then add interest rate environment adjustments
            const returnExpectations = this.financialConfig.assetAllocation.RETURN_EXPECTATIONS;
            const baseBondReturn = baseReturn * returnExpectations.BOND_MULTIPLIER.value;
            const baseCashReturn = baseReturn * returnExpectations.CASH_MULTIPLIER.value;

            // Add interest rate regime adjustments to user's base expectations
            const normalRate = this.financialConfig.assetAllocation.NORMAL_RATE_BASELINE.value;
            const adjustmentFactors = this.financialConfig.assetAllocation.RATE_ADJUSTMENT_FACTORS;
            const returnLimits = this.financialConfig.assetAllocation.RETURN_LIMITS;
            const volatility = this.financialConfig.monteCarlo.VOLATILITY_PARAMETERS.BOND_VOLATILITY.value;

            const rateAdjustment = (rateRegime.rate - normalRate);
            const bondReturn = Math.max(returnLimits.BOND_FLOOR.value,
                baseBondReturn + rateAdjustment * adjustmentFactors.BOND_SENSITIVITY.value + randomNormal(0, volatility));
            const cashReturn = Math.max(returnLimits.CASH_FLOOR.value,
                baseCashReturn + rateAdjustment * adjustmentFactors.CASH_SENSITIVITY.value);

            return (allocations.equity / 100) * equityReturn +
                (allocations.bonds / 100) * bondReturn +
                (allocations.cash / 100) * cashReturn;
        } else {
            // Original calculation for deterministic scenarios
            const returnExpectations = this.financialConfig.assetAllocation.RETURN_EXPECTATIONS;
            const equityReturn = this.getReturnForYear(baseReturn * returnExpectations.EQUITY_MULTIPLIER.value, year, declineRate);
            const bondReturn = this.getReturnForYear(baseReturn * returnExpectations.BOND_MULTIPLIER.value, year, declineRate * 0.5);
            const cashReturn = this.getReturnForYear(baseReturn * returnExpectations.CASH_MULTIPLIER.value, year, 0);

            return (allocations.equity / 100) * equityReturn +
                (allocations.bonds / 100) * bondReturn +
                (allocations.cash / 100) * cashReturn;
        }
    }

    // Main simulation engine
    simulateRetirement(inputs, useRandomReturns = false, stressScenario = null, scenarioReturns = null) {
        // Reset previous returns for each simulation
        this.previousReturns = {
            portfolio: null,
            property: null
        };

        const maxLifespan = Math.max(inputs.yourLifespan, inputs.partnerLifespan);
        const yearsToRetirement = Math.max(0, inputs.retirementAge - inputs.yourCurrentAge);

        // Calculate total simulation years based on the maximum lifespan from current age
        const maxYearsFromNow = Math.max(
            inputs.yourLifespan - inputs.yourCurrentAge,
            inputs.partnerLifespan - inputs.partnerCurrentAge
        );
        const yearsInRetirement = Math.max(0, maxYearsFromNow - yearsToRetirement);

        // Pre-retirement accumulation phase
        let futureSuper = inputs.yourCurrentSuper + inputs.partnerCurrentSuper;
        let futureSavings = inputs.currentSavings;
        let futureStocks = inputs.currentStocks;
        let propertyWasSold = false;
        let propertyEquity = 0;

        const allocationHistory = [];
        const healthcareCostHistory = [];
        const propertyHistory = [];
        const regimeHistory = []; // Track regime changes for enhanced MC

        // Pre-retirement simulation
        const simulationEndYear = inputs.isSingleCalculation ?
            Math.max(yearsToRetirement, inputs.yourLifespan - inputs.yourCurrentAge) :
            Math.max(yearsToRetirement, inputs.yourLifespan - inputs.yourCurrentAge, inputs.partnerLifespan - inputs.partnerCurrentAge);

        for (let year = 1; year <= simulationEndYear; year++) {
            const yourCurrentAge = inputs.yourCurrentAge + year;
            const partnerCurrentAge = inputs.isSingleCalculation ? 0 : inputs.partnerCurrentAge + year;

            // Stop simulation based on single vs couple status
            if (inputs.isSingleCalculation) {
                if (yourCurrentAge > inputs.yourLifespan) {
                    break;
                }
            } else {
                // Stop simulation if both have passed away
                if (yourCurrentAge > inputs.yourLifespan && partnerCurrentAge > inputs.partnerLifespan) {
                    break;
                }
            }

            // Dynamic allocation
            let allocation;
            if (inputs.useGlidePath) {
                allocation = this.calculateDynamicAllocation(yourCurrentAge, inputs.glidePathRule);
            } else {
                allocation = {
                    equity: inputs.allocEquities || 60,
                    bonds: inputs.allocBonds || 30,
                    cash: inputs.allocCash || 10
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
            futureSuper *= (1 + inputs.superReturn);
            futureSavings *= (1 + inputs.savingsReturn);
            futureStocks *= (1 + returnRate);

            // Add contributions
            const yourYearsToWork = Math.min(inputs.retirementAge, inputs.yourLifespan) - inputs.yourCurrentAge;
            const partnerYearsToWork = Math.min(inputs.partnerRetirementAge, inputs.partnerLifespan) - inputs.partnerCurrentAge;

            let yearlyPostTaxIncome = 0;
            let yearlySuperContribution = 0;

            if (year <= yourYearsToWork) {
                const yourSalary = this.getSalaryForYear(inputs.yourSalary, year, inputs);
                yearlyPostTaxIncome += calculatePostTaxIncome(yourSalary, this.config.TAX_BRACKETS);
                yearlySuperContribution += yourSalary * inputs.superContributionRate;
            }
            if (year <= partnerYearsToWork) {
                const partnerSalary = this.getSalaryForYear(inputs.partnerSalary, year, inputs);
                yearlyPostTaxIncome += calculatePostTaxIncome(partnerSalary, this.config.TAX_BRACKETS);
                yearlySuperContribution += partnerSalary * inputs.superContributionRate;
            }

            futureSuper += yearlySuperContribution;
            futureSavings += yearlyPostTaxIncome * inputs.percentIncomeSaved;
            futureStocks += inputs.monthlyStockContribution * 12;

            // Property calculations
            if (inputs.hasInvestmentProperty && yourCurrentAge <= inputs.retirementAge) {
                const propertyCashFlow = this.calculatePropertyCashFlow(inputs, year);
                if (propertyCashFlow) {
                    propertyHistory.push(propertyCashFlow);

                    // Add property cash flow to savings
                    futureSavings += propertyCashFlow.netCashFlow;

                    // Check if property should be sold
                    if (inputs.sellPropertyYears > 0 && year === inputs.sellPropertyYears) {
                        const saleResult = this.calculatePropertySale(inputs, year);
                        if (saleResult) {
                            futureStocks += saleResult.netProceeds;
                            propertyWasSold = true;
                            propertyHistory[propertyHistory.length - 1].saleResult = saleResult;
                        }
                    } else {
                        // Calculate current property equity with enhanced cycle-based returns
                        let propertyReturn;
                        if (useRandomReturns) {
                            propertyReturn = this.calculateEnhancedPropertyReturn(
                                year,
                                inputs.propertyGrowthRate / 100,
                                true,
                                this.previousReturns.property
                            );
                            this.previousReturns.property = propertyReturn;
                        } else {
                            propertyReturn = inputs.propertyGrowthRate / 100;
                        }

                        const currentValue = this.calculatePropertyValue(
                            inputs.investmentPropertyValue,
                            propertyReturn * 100,  // Convert back to percentage for the method
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
        const homeValueAtRetirement = inputs.homeValue * Math.pow(1 + inputs.inflation, yearsToRetirement);
        const mortgageBalanceAtRetirement = Math.max(0,
            calculateLoanBalance(inputs.mortgageRate, yearsToRetirement, inputs.monthlyMortgagePayment, inputs.mortgageBalance)
        );
        const homeEquityAtRetirement = homeValueAtRetirement - mortgageBalanceAtRetirement;
        const accessibleHomeEquity = inputs.planToDownsize ? homeEquityAtRetirement * this.config.HOME_EQUITY_ACCESS_RATE : 0;

        // Retirement phase simulation
        let currentBalance = futureSuper + futureSavings + futureStocks + accessibleHomeEquity;
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
                if (yourCurrentAge > inputs.yourLifespan) {
                    break;
                }
            } else {
                // Check if both partners have passed away
                if (yourCurrentAge > inputs.yourLifespan && partnerCurrentAge > inputs.partnerLifespan) {
                    break;
                }
            }

            // Determine couple status: must not be single calculation AND both partners must be alive
            const isCouple = !inputs.isSingleCalculation &&
                           yourCurrentAge <= inputs.yourLifespan &&
                           partnerCurrentAge <= inputs.partnerLifespan;

            // Dynamic allocation in retirement
            const allocation = inputs.useGlidePath ?
                this.calculateDynamicAllocation(yourCurrentAge, inputs.glidePathRule) :
                { equity: inputs.allocEquities, bonds: inputs.allocBonds, cash: inputs.allocCash };

            // Enhanced healthcare costs
            const healthcareCost = this.projectHealthcareCosts(
                inputs.currentHealthcareCosts,
                retirementYear,
                inputs.healthcareInflation
            );

            // Aged care costs if applicable - inflate year by year like healthcare costs
            let agedCareCost = 0;
            if (yourCurrentAge >= inputs.agedCareStartAge &&
                yourCurrentAge < inputs.agedCareStartAge + inputs.agedCareDuration) {
                // Calculate inflated aged care cost for this specific year
                agedCareCost = this.projectHealthcareCosts(
                    inputs.agedCareAnnualCost,
                    retirementYear,
                    inputs.healthcareInflation
                );
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
                    const cashFlowAnalysis = this.calculateCashFlowAnalysis(inputs);
                    const currentExpenses = cashFlowAnalysis.expenses || {};

                    // Safe expense extraction with fallbacks
                    const housingExpense = currentExpenses.housing?.monthlyTotal || inputs.monthlyMortgagePayment || 3000;
                    const livingExpense = currentExpenses.living?.monthlyTotal || 2500;
                    const mortgagePayment = currentExpenses.housing?.mortgagePayment || inputs.monthlyMortgagePayment || 0;

                    // Calculate retirement expenses (many costs reduce in retirement)
                    const retirementHousing = Math.max(
                        housingExpense * 0.6, // Assume 40% reduction (no mortgage in many cases)
                        housingExpense - mortgagePayment // Or just remove mortgage
                    );
                    const retirementLiving = livingExpense * 0.85; // 15% reduction in living costs
                    const retirementChildcare = 0; // No childcare in retirement

                    const baseMonthlyExpenses = retirementHousing + retirementLiving + retirementChildcare;
                    const baseAnnualExpenses = baseMonthlyExpenses * 12;

                    // Apply inflation to get expenses in retirement year
                    const expensesWithInflation = baseAnnualExpenses * Math.pow(1 + inputs.inflation, retirementYear);

                    // Add realistic randomization based on expense categories
                    const housingVariation = retirementHousing * 12 * (Math.random() - 0.5) * 0.3; // ±30% housing variation
                    const livingVariation = retirementLiving * 12 * (Math.random() - 0.5) * 0.4; // ±40% living variation
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
                    const cashFlowAnalysis = this.calculateCashFlowAnalysis(inputs);
                    const currentExpenses = cashFlowAnalysis.expenses || {};

                    // Safe expense extraction with fallbacks
                    const housingExpense = currentExpenses.housing?.monthlyTotal || inputs.monthlyMortgagePayment || 3000;
                    const livingExpense = currentExpenses.living?.monthlyTotal || 2500;
                    const mortgagePayment = currentExpenses.housing?.mortgagePayment || inputs.monthlyMortgagePayment || 0;

                    // Conservative retirement expense estimate
                    const retirementHousing = Math.max(
                        housingExpense * 0.7, // 30% reduction
                        housingExpense - mortgagePayment
                    );
                    const retirementLiving = livingExpense * 0.9; // 10% reduction
                    const baseMonthlyExpenses = retirementHousing + retirementLiving;
                    const baseAnnualExpenses = baseMonthlyExpenses * 12;

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

            const totalCostWithHealthcare = baseIncomeNeeded + healthcareCost + agedCareCost;

            // Pension calculation
            const assessableAssets = currentBalance + propertyEquity - (inputs.planToDownsize ? 0 : homeEquityAtRetirement);
            const pensionIncome = calculateAgePension(
                assessableAssets,
                propertyIncome,
                isCouple,
                isCouple ? inputs.agePensionMax : this.config.SINGLE_PENSION_MAX,
                isCouple ? inputs.pensionAssetThreshold : this.config.SINGLE_ASSET_THRESHOLD,
                isCouple ? inputs.pensionAssetLimit : this.config.SINGLE_ASSET_LIMIT,
                isCouple ? inputs.pensionIncomeThreshold : this.config.SINGLE_INCOME_THRESHOLD
            );

            const totalIncome = pensionIncome + propertyIncome;
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

            // Monthly withdrawal simulation
            const monthlyReturn = Math.pow(1 + actualReturn, 1/12) - 1;
            const monthlyWithdrawal = netWithdrawalNeeded / 12;

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

            // Update home equity with inflation growth over time
            const yearsFromRetirement = i;
            const currentHomeEquity = inputs.planToDownsize ? 0 :
                homeEquityAtRetirement * Math.pow(1 + inputs.inflation, yearsFromRetirement);

            const nonLiquidAssets = currentHomeEquity + propertyEquity;

            balances.push(currentBalance);
            yearlyData.push({
                year: new Date().getFullYear() + retirementYear,
                age: yourCurrentAge,
                partnerAge: partnerCurrentAge,
                yourAge: yourCurrentAge,
                allocation: allocation,
                startBalance,
                returnRate: actualReturn * 100,
                growth: yearlyGrowth,
                withdrawal: netWithdrawalNeeded,
                healthcareCost,
                agedCareCost,
                propertyIncome,
                pensionIncome,
                endBalance: currentBalance,
                liquidAssets,
                nonLiquidAssets,
                depleted: false
            });

            if (currentBalance <= 0) {
                yearlyData[yearlyData.length - 1].depleted = true;
                break;
            }
        }

        return {
            finalBalance: currentBalance,
            balances,
            yearlyData,
            allocationHistory,
            healthcareCostHistory,
            propertyHistory,
            regimeHistory, // Include regime history for enhanced analysis
            agedCareCosts,
            totalFinancialAssets: futureSuper + futureSavings + futureStocks,
            accessibleHomeEquity,
            homeEquity: homeEquityAtRetirement,
            propertyEquity,
            propertyWasSold,
            futureSuper,
            futureSavings,
            futureStocks
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
        const maxSearchAge = maxAge || Math.min(inputs.yourLifespan - 10, 75);

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
        const maxSearchAge = maxAge || Math.min(inputs.yourLifespan - 10, 75);

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
                    allocEquities: 30,
                    allocBonds: 50,
                    allocCash: 20,
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
        // Australian tax brackets 2025-26
        const taxBrackets = [
            { min: 0, max: 18200, rate: 0 },
            { min: 18201, max: 45000, rate: 0.16 },
            { min: 45001, max: 135000, rate: 0.30 },
            { min: 135001, max: 190000, rate: 0.37 },
            { min: 190001, max: Infinity, rate: 0.45 }
        ];

        let tax = 0;
        for (const bracket of taxBrackets) {
            if (grossIncome > bracket.min) {
                const taxableAtThisBracket = Math.min(grossIncome, bracket.max) - bracket.min + 1;
                tax += taxableAtThisBracket * bracket.rate;
            }
        }

        // Medicare levy (2%)
        const medicareLevy = grossIncome * 0.02;

        return grossIncome - tax - medicareLevy;
    }

    /**
     * Calculate comprehensive household expenses based on ABS data and user inputs
     * @param {Object} inputs - User financial inputs
     * @param {number} netIncome - Net annual income
     * @returns {Object} Detailed expense breakdown
     */
    calculateHouseholdExpenses(inputs, netIncome) {
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

                // Subtract rental income (weekly rent × 4.33 for monthly)
                const weeklyRent = inputs.weeklyRentalIncome || 0;
                const monthlyRentalIncome = weeklyRent * 4.33;
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
                    const monthlyRentalIncome = weeklyRent * 4.33;
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