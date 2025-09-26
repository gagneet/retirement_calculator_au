// js/simulator.js - Financial Simulation Engine with Investment Property Support

import { ENHANCED_CONFIG } from './config.js';
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
        this.config = ENHANCED_CONFIG;
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
        const riskFreeRate = 0.03; // 3% assumed risk-free rate
        const excessReturnNeeded = Math.max(0, requiredAnnualReturn - riskFreeRate);

        let baseRiskScore = Math.min(100, excessReturnNeeded * 1000); // Scale to 0-100

        // Enhanced risk requirement from Monte Carlo results if available
        if (monteCarloResults && monteCarloResults.successRate !== undefined) {
            const successRate = monteCarloResults.successRate;

            // Adjust risk requirement based on success probability
            if (successRate < 0.5) {
                baseRiskScore += 30; // Need much higher risk for low success rate
            } else if (successRate < 0.7) {
                baseRiskScore += 20; // Moderate increase needed
            } else if (successRate < 0.85) {
                baseRiskScore += 10; // Slight increase needed
            } else if (successRate > 0.95) {
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
        return {
            equity: equityPercent,
            bonds: Math.max(10, (100 - equityPercent) * 0.7),
            cash: Math.max(5, (100 - equityPercent) * 0.3)
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
        const corporateTaxRate = 0.30;  // 30% Australian corporate tax rate

        // Calculate gross dividend income from Australian equities
        const grossDividendIncome = australianEquityAllocation * dividendYield;

        // Calculate franked portion
        const frankedDividends = grossDividendIncome * frankingRate;

        // Calculate franking credits (attached tax credits)
        const frankingCredits = frankedDividends * (corporateTaxRate / (1 - corporateTaxRate));

        // Total franking credit benefit depends on investor's marginal tax rate
        // Scale by user input (benefit factor)
        const frankingCreditBenefit = frankingCredits * (inputs.frankingCreditBenefit / 1.2);

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
        const buildingValue = inputs.investmentPropertyValue * 0.8;
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
            const bondReturn = Math.max(-0.15, rateRegime.rate + randomNormal(0, 0.04));
            const cashReturn = Math.max(0.001, rateRegime.rate - 0.01);

            return (allocations.equity / 100) * equityReturn +
                (allocations.bonds / 100) * bondReturn +
                (allocations.cash / 100) * cashReturn;
        } else {
            // Original calculation for deterministic scenarios
            const equityReturn = this.getReturnForYear(baseReturn * 1.2, year, declineRate);
            const bondReturn = this.getReturnForYear(baseReturn * 0.6, year, declineRate * 0.5);
            const cashReturn = this.getReturnForYear(baseReturn * 0.3, year, 0);

            return (allocations.equity / 100) * equityReturn +
                (allocations.bonds / 100) * bondReturn +
                (allocations.cash / 100) * cashReturn;
        }
    }

    // Main simulation engine
    simulateRetirement(inputs, useRandomReturns = false, stressScenario = null) {
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

        // Pre-retirement simulation
        const simulationEndYear = Math.max(yearsToRetirement, inputs.yourLifespan - inputs.yourCurrentAge, inputs.partnerLifespan - inputs.partnerCurrentAge);

        for (let year = 1; year <= simulationEndYear; year++) {
            const yourCurrentAge = inputs.yourCurrentAge + year;
            const partnerCurrentAge = inputs.partnerCurrentAge + year;

            // Stop simulation if both have passed away
            if (yourCurrentAge > inputs.yourLifespan && partnerCurrentAge > inputs.partnerLifespan) {
                break;
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

            if (useRandomReturns) {
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
            const partnerCurrentAge = inputs.partnerCurrentAge + retirementYear;

            // Check if both partners have passed away
            if (yourCurrentAge > inputs.yourLifespan && partnerCurrentAge > inputs.partnerLifespan) {
                break;
            }

            const isCouple = yourCurrentAge <= inputs.yourLifespan && partnerCurrentAge <= inputs.partnerLifespan;

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

            // Aged care costs if applicable
            let agedCareCost = 0;
            if (yourCurrentAge >= inputs.agedCareStartAge &&
                yourCurrentAge < inputs.agedCareStartAge + inputs.agedCareDuration) {
                agedCareCost = agedCareCosts.annualCost;
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
                // Use realistic expense analysis instead of simple ASFA standard
                const cashFlowAnalysis = this.calculateCashFlowAnalysis(inputs);
                const currentExpenses = cashFlowAnalysis.expenses;

                // Calculate retirement expenses (many costs reduce in retirement)
                const retirementHousing = Math.max(
                    currentExpenses.housing.monthlyTotal * 0.6, // Assume 40% reduction (no mortgage in many cases)
                    currentExpenses.housing.monthlyTotal - (currentExpenses.housing.mortgagePayment || 0) // Or just remove mortgage
                );
                const retirementLiving = currentExpenses.living.monthlyTotal * 0.85; // 15% reduction in living costs
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
            } else {
                // For deterministic runs, use more realistic baseline
                const cashFlowAnalysis = this.calculateCashFlowAnalysis(inputs);
                const currentExpenses = cashFlowAnalysis.expenses;

                // Conservative retirement expense estimate
                const retirementHousing = Math.max(
                    currentExpenses.housing.monthlyTotal * 0.7, // 30% reduction
                    currentExpenses.housing.monthlyTotal - (currentExpenses.housing.mortgagePayment || 0)
                );
                const retirementLiving = currentExpenses.living.monthlyTotal * 0.9; // 10% reduction
                const baseMonthlyExpenses = retirementHousing + retirementLiving;
                const baseAnnualExpenses = baseMonthlyExpenses * 12;

                // Apply inflation
                baseIncomeNeeded = Math.max(
                    baseAnnualExpenses * Math.pow(1 + inputs.inflation, retirementYear),
                    inputs.asfaComfortable * Math.pow(1 + inputs.inflation, retirementYear) // Keep ASFA as minimum
                );
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

            if (progressCallback) {
                await progressCallback(i, scenarios.length, `Running scenario: ${scenario.name}`);
            }

            // Run Monte Carlo simulation for this scenario
            const mcResult = await this.runMonteCarloSimulation(scenarioInputs, 1000, null);

            // Run deterministic simulation for comparison
            const deterministicResult = this.simulateRetirement(scenarioInputs, false);

            results.push({
                name: scenario.name,
                description: scenario.description,
                modifications: scenario.modifications,
                monteCarloResult: mcResult,
                deterministicResult: deterministicResult,
                successRate: mcResult.successRate,
                medianBalance: mcResult.median,
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

    // Calculate risk-adjusted score for scenario ranking
    calculateRiskAdjustedScore(scenario) {
        // Weight success rate more heavily than final balance
        const successWeight = 0.6;
        const balanceWeight = 0.4;

        const normalizedSuccess = scenario.successRate * 100;
        const normalizedBalance = Math.min(100, (scenario.medianBalance / 1000000) * 20);

        return (successWeight * normalizedSuccess) + (balanceWeight * normalizedBalance);
    }

    // Generate recommendation text for scenario comparison
    generateScenarioRecommendation(scenario, baseScenario) {
        const successDiff = scenario.successRate - baseScenario.successRate;
        const balanceDiff = scenario.medianBalance - baseScenario.medianBalance;

        if (successDiff > 0.05 && balanceDiff > 50000) {
            return "Strongly recommended - significantly better outcomes";
        } else if (successDiff > 0.02 && balanceDiff > 0) {
            return "Recommended - improved success rate and balance";
        } else if (successDiff > 0 && balanceDiff > -100000) {
            return "Consider - slightly better success rate";
        } else if (successDiff < -0.05 || balanceDiff < -200000) {
            return "Not recommended - significantly worse outcomes";
        } else {
            return "Neutral - minimal difference in outcomes";
        }
    }

    // Pre-built scenario templates
    getCommonScenarios(baseInputs) {
        return [
            {
                name: "Current Plan",
                description: "Your current retirement strategy",
                modifications: {}
            },
            {
                name: "Sell Property at Retirement",
                description: "Sell investment property when you retire and invest proceeds",
                modifications: {
                    sellPropertyYears: baseInputs.retirementAge - baseInputs.yourCurrentAge,
                    hasInvestmentProperty: baseInputs.hasInvestmentProperty
                }
            },
            {
                name: "Sell Property in 5 Years",
                description: "Sell investment property in 5 years and invest proceeds",
                modifications: {
                    sellPropertyYears: 5,
                    hasInvestmentProperty: baseInputs.hasInvestmentProperty
                }
            },
            {
                name: "Keep Property Forever",
                description: "Hold investment property throughout retirement",
                modifications: {
                    sellPropertyYears: 0, // Never sell
                    hasInvestmentProperty: baseInputs.hasInvestmentProperty
                }
            },
            {
                name: "Downsize Family Home",
                description: "Downsize family home at retirement for extra funds",
                modifications: {
                    planToDownsize: true
                }
            },
            {
                name: "Conservative Allocation",
                description: "Use more conservative investment allocation",
                modifications: {
                    allocEquities: Math.max(30, baseInputs.allocEquities - 20),
                    allocBonds: Math.min(60, baseInputs.allocBonds + 15),
                    allocCash: Math.min(20, baseInputs.allocCash + 5)
                }
            },
            {
                name: "Aggressive Allocation",
                description: "Use more aggressive investment allocation",
                modifications: {
                    allocEquities: Math.min(90, baseInputs.allocEquities + 20),
                    allocBonds: Math.max(5, baseInputs.allocBonds - 15),
                    allocCash: Math.max(5, baseInputs.allocCash - 5)
                }
            },
            {
                name: "Retire 2 Years Later",
                description: "Work 2 additional years before retiring",
                modifications: {
                    retirementAge: baseInputs.retirementAge + 2,
                    partnerRetirementAge: baseInputs.partnerRetirementAge + 2
                }
            }
        ];
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
                monthlyDisposable: monthlyDisposableIncome,
                annualDisposable: annualDisposableIncome,
                disposablePercent: (annualDisposableIncome / netIncome) * 100,
                status: this.getCashFlowStatus(monthlyDisposableIncome),
                housingStressRatio: (expenses.housing / (netIncome / 12)) * 100
            },
            constraints: {
                maxMonthlySavings: Math.max(0, monthlyDisposableIncome),
                maxAnnualSavings: Math.max(0, annualDisposableIncome),
                minExpenseReduction: monthlyDisposableIncome < 0 ? Math.abs(monthlyDisposableIncome) : 0,
                isHousingStressed: (expenses.housing / (netIncome / 12)) > 0.30
            },
            opportunities: savingsAnalysis
        };
    }

    /**
     * Calculate net income after tax and Medicare levy
     * @param {number} grossIncome - Gross annual income
     * @param {Object} inputs - User inputs for tax calculations
     * @returns {number} Net annual income
     */
    calculateNetIncome(grossIncome, inputs) {
        // Australian tax brackets 2024-25
        const taxBrackets = [
            { min: 0, max: 18200, rate: 0 },
            { min: 18201, max: 45000, rate: 0.19 },
            { min: 45001, max: 120000, rate: 0.325 },
            { min: 120001, max: 180000, rate: 0.37 },
            { min: 180001, max: Infinity, rate: 0.45 }
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

        // Childcare costs
        const childcareCosts = this.calculateChildcareCosts(dependents);

        // Other family-related expenses
        const familyExpenses = this.calculateFamilyExpenses(dependents);

        const totalMonthly = baseLivingExpenses + housingCosts + childcareCosts + familyExpenses;

        return {
            baseLiving: baseLivingExpenses,
            housing: housingCosts,
            childcare: childcareCosts,
            familyExpenses: familyExpenses,
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
        // ABS 2025 data: Single person $2,835/month, couple $4,118/month, +$630 per child
        const baseCouple = 4118; // Base for couple
        const perChild = 630; // Additional cost per child

        return baseCouple + (dependents * perChild);
    }

    /**
     * Calculate housing costs including mortgage or rent
     */
    calculateHousingCosts(inputs, homeValue, netIncome) {
        const monthlyNetIncome = netIncome / 12;

        if (homeValue > 0) {
            // Current reality: Australians pay 46.2% of income on mortgage (2025 data)
            return monthlyNetIncome * 0.462;
        } else {
            // Assume renting - typically 25-35% of income
            return monthlyNetIncome * 0.30;
        }
    }

    /**
     * Calculate childcare costs based on current Australian rates
     */
    calculateChildcareCosts(dependents) {
        if (dependents === 0) return 0;

        // 2025 data: $135/day average, assuming 5 days/week for working parents
        const dailyCost = 135;
        const daysPerWeek = 5;
        const weeksPerYear = 48; // Account for holidays
        const annualPerChild = dailyCost * daysPerWeek * weeksPerYear;

        // Assume government subsidy reduces cost by 30-50% on average
        const subsidyRate = 0.40;
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

        return opportunities;
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
        if (homeValue > 0) {
            return `Mortgage payments (46.2% of income - current Australian average)`;
        }
        return 'Rental payments (30% of income)';
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