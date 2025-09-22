// js/simulator.js - Financial Simulation Engine with Investment Property Support

import { ENHANCED_CONFIG } from './config.js';
import { 
    calculatePostTaxIncome, 
    calculateLoanBalance, 
    calculatePropertyCashFlow,
    calculateCGT,
    calculateAgePension,
    randomNormal,
    clamp
} from './utils.js';

export class RetirementSimulator {
    constructor() {
        this.config = ENHANCED_CONFIG;
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

    // Enhanced return calculation with franking credits
    calculateEnhancedReturn(allocation, baseReturn, frankingBenefit, australianEquityPercent) {
        const frankingBonus = (allocation.equity / 100) * (australianEquityPercent / 100) * frankingBenefit / 100;
        return baseReturn + frankingBonus;
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

    // Investment property calculations
    calculatePropertyValue(currentValue, growthRate, years) {
        return currentValue * Math.pow(1 + growthRate, years);
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
        
        const saleValue = this.calculatePropertyValue(
            inputs.investmentPropertyValue,
            inputs.propertyGrowthRate / 100,
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

    // Portfolio return calculation with declining rates
    getReturnForYear(baseReturn, year, declineRate) {
        return Math.max(0.01, baseReturn - (declineRate / 100) * year);
    }

    calculatePortfolioReturn(allocations, baseReturn, year, declineRate) {
        const equityReturn = this.getReturnForYear(baseReturn * 1.2, year, declineRate);
        const bondReturn = this.getReturnForYear(baseReturn * 0.6, year, declineRate * 0.5);
        const cashReturn = this.getReturnForYear(baseReturn * 0.3, year, 0);
        
        return (allocations.equity / 100) * equityReturn + 
               (allocations.bonds / 100) * bondReturn + 
               (allocations.cash / 100) * cashReturn;
    }

    // Main simulation engine
    simulateRetirement(inputs, useRandomReturns = false, stressScenario = null) {
        const maxLifespan = Math.max(inputs.yourLifespan, inputs.partnerLifespan);
        const yearsToRetirement = Math.max(0, inputs.retirementAge - inputs.yourCurrentAge);
        const yearsInRetirement = Math.max(0, maxLifespan - inputs.retirementAge);

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
            

            // Enhanced returns with franking credits
            const baseReturn = this.calculateEnhancedReturn(
                allocation, 
                inputs.investmentReturn, 
                inputs.frankingCreditBenefit,
                inputs.australianEquityAllocation
            );

            let returnRate = baseReturn;
            if (useRandomReturns) {
                returnRate = randomNormal(baseReturn, inputs.returnVolatility);
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
                        // Calculate current property equity
                        const currentValue = this.calculatePropertyValue(
                            inputs.investmentPropertyValue,
                            inputs.propertyGrowthRate / 100,
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

            // Property income (if still owned)
            let propertyIncome = 0;
            if (inputs.hasInvestmentProperty && !propertyWasSold) {
                const propertyCashFlow = this.calculatePropertyCashFlow(inputs, retirementYear);
                if (propertyCashFlow) {
                    propertyIncome = Math.max(0, propertyCashFlow.netCashFlow);
                }
            }

            const baseIncomeNeeded = inputs.asfaComfortable * Math.pow(1 + inputs.inflation, retirementYear);
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

            // Enhanced return calculation
            const baseReturn = this.calculateEnhancedReturn(
                allocation, 
                inputs.investmentReturn, 
                inputs.frankingCreditBenefit,
                inputs.australianEquityAllocation
            );

            let actualReturn = baseReturn;
            if (useRandomReturns) {
                actualReturn = randomNormal(baseReturn, inputs.returnVolatility);
                
                // Apply market shocks if enabled
                if (inputs.enableShocks && Math.random() < inputs.shockProbability) {
                    const shockEffect = inputs.shockMagnitude * (allocation.equity / 100);
                    actualReturn += shockEffect;
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

            balances.push(currentBalance);
            yearlyData.push({
                year: new Date().getFullYear() + retirementYear,
                age: yourCurrentAge,
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

    // Monte Carlo simulation
    async runMonteCarloSimulation(inputs, runs, progressCallback) {
        const outcomes = [];
        const paths = [];
        const propertyOutcomes = [];
        
        for (let i = 0; i < runs; i++) {
            const result = this.simulateRetirement(inputs, true);
            outcomes.push(result.finalBalance);
            paths.push(result.balances);
            
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
        
        return {
            outcomes,
            paths,
            propertyOutcomes,
            successRate: outcomes.filter(o => o > 0).length / runs,
            median: outcomes[Math.floor(runs / 2)],
            percentile10: outcomes[Math.floor(runs * 0.1)],
            percentile90: outcomes[Math.floor(runs * 0.9)]
        };
    }

    // Stress testing
    runStressTest(inputs, scenario) {
        return this.simulateRetirement(inputs, false, scenario);
    }
}

export default RetirementSimulator;