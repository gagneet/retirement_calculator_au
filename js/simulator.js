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

    // Risk profiling calculations
    calculateRiskCapacity(inputs) {
        let score = 50; // Base score

        // Age factor (younger = higher capacity)
        const age = inputs.yourCurrentAge;
        if (age < 35) score += 25;
        else if (age < 50) score += 15;
        else if (age < 65) score += 5;
        else score -= 10;

        // Income stability
        const totalIncome = inputs.yourSalary + inputs.partnerSalary;
        if (totalIncome > 200000) score += 20;
        else if (totalIncome > 100000) score += 10;
        else if (totalIncome > 50000) score += 5;

        // Emergency fund
        const emergencyFund = inputs.hasEmergencyFund;
        if (emergencyFund === 'full') score += 15;
        else if (emergencyFund === 'partial') score += 10;
        else if (emergencyFund === 'minimal') score += 5;
        else score -= 15;

        // Debt burden
        const debtLevel = inputs.hasDebt;
        if (debtLevel === 'none') score += 15;
        else if (debtLevel === 'minimal') score += 5;
        else if (debtLevel === 'moderate') score -= 10;
        else score -= 20;

        // Dependents
        score -= inputs.dependents * 5;

        return clamp(score, 0, 100);
    }

    calculateRiskRequirement(inputs) {
        const yearsToRetirement = inputs.retirementAge - inputs.yourCurrentAge;
        const targetAssets = inputs.asfaComfortable * 25; // 4% rule estimate
        const currentAssets = inputs.yourCurrentSuper + inputs.partnerCurrentSuper + inputs.currentSavings + inputs.currentStocks;

        const required = (targetAssets / currentAssets - 1) / yearsToRetirement * 100;
        const riskRequired = clamp((required - 3) * 10, 0, 100); // 3% risk-free rate

        return riskRequired;
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

            // Calculate base income with randomization (+/- $25,000)
            const asfaWithInflation = inputs.asfaComfortable * Math.pow(1 + inputs.inflation, retirementYear);
            let baseIncomeNeeded = asfaWithInflation;

            // Add randomization if using Monte Carlo simulation
            if (useRandomReturns) {
                const randomVariation = (Math.random() - 0.5) * 2 * 25000; // +/- $25,000
                baseIncomeNeeded = Math.max(0, asfaWithInflation + randomVariation);
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
}

export default RetirementSimulator;