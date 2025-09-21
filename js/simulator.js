/**
 * Enhanced Australian Retirement Calculator - Core Simulation Engine
 * Contains financial modeling, tax calculations, pension modeling, and Monte Carlo simulation
 */

import { CONFIG } from './config.js';
import { Utils } from './utils.js';

// Tax Calculation Engine
export const TaxCalculator = {
    /**
     * Calculate Australian income tax for given salary
     */
    calculateIncomeTax: (grossIncome) => {
        let tax = 0;
        let remainingIncome = grossIncome;
        
        for (const bracket of CONFIG.TAX.TAX_BRACKETS) {
            if (remainingIncome <= 0) break;
            
            const taxableInThisBracket = Math.min(
                remainingIncome, 
                bracket.max - bracket.min
            );
            
            tax += taxableInThisBracket * bracket.rate;
            remainingIncome -= taxableInThisBracket;
            
            if (grossIncome <= bracket.max) break;
        }
        
        // Add Medicare Levy (2% on income above threshold)
        if (grossIncome > 23226) { // 2024-25 threshold
            tax += grossIncome * CONFIG.TAX.MEDICARE_LEVY;
        }
        
        return Math.max(0, tax);
    },

    /**
     * Calculate post-tax income
     */
    getPostTaxIncome: (grossIncome) => {
        const tax = TaxCalculator.calculateIncomeTax(grossIncome);
        return grossIncome - tax;
    },

    /**
     * Calculate marginal tax rate
     */
    getMarginalTaxRate: (grossIncome) => {
        for (const bracket of CONFIG.TAX.TAX_BRACKETS) {
            if (grossIncome <= bracket.max) {
                return bracket.rate + (grossIncome > 23226 ? CONFIG.TAX.MEDICARE_LEVY : 0);
            }
        }
        return CONFIG.TAX.TAX_BRACKETS[CONFIG.TAX.TAX_BRACKETS.length - 1].rate + CONFIG.TAX.MEDICARE_LEVY;
    },

    /**
     * Calculate capital gains tax
     */
    calculateCGT: (capitalGain, holdingPeriodMonths, marginalRate) => {
        if (capitalGain <= 0) return 0;
        
        // Apply 50% CGT discount for assets held > 12 months
        const discountedGain = holdingPeriodMonths >= CONFIG.TAX.CGT_DISCOUNT_HOLDING_PERIOD 
            ? capitalGain * CONFIG.TAX.CGT_DISCOUNT 
            : capitalGain;
            
        return discountedGain * marginalRate;
    }
};

// Australian Pension System Calculator
export const PensionCalculator = {
    /**
     * Calculate age pension entitlement based on assets and income tests
     */
    calculatePension: (assessableAssets, assessableIncome, isCouple = true, isHomeowner = true) => {
        const maxPension = isCouple ? 
            CONFIG.PENSION.MAX_PENSION_COUPLE * 26 : // Convert fortnightly to annual
            CONFIG.PENSION.MAX_PENSION_SINGLE * 26;
        
        // Asset test thresholds
        const assetThreshold = PensionCalculator.getAssetThreshold(isCouple, isHomeowner);
        const assetLimit = PensionCalculator.getAssetLimit(isCouple, isHomeowner);
        
        // Income test threshold
        const incomeThreshold = (isCouple ? 
            CONFIG.PENSION.INCOME_THRESHOLD_COUPLE : 
            CONFIG.PENSION.INCOME_THRESHOLD_SINGLE) * 26; // Convert to annual
        
        // Calculate pension from assets test
        let pensionFromAssets = maxPension;
        if (assessableAssets > assetThreshold) {
            if (assessableAssets >= assetLimit) {
                pensionFromAssets = 0;
            } else {
                const excessAssets = assessableAssets - assetThreshold;
                const reduction = (excessAssets / 1000) * CONFIG.PENSION.ASSET_REDUCTION_RATE * 26;
                pensionFromAssets = Math.max(0, maxPension - reduction);
            }
        }
        
        // Calculate pension from income test
        let pensionFromIncome = maxPension;
        if (assessableIncome > incomeThreshold) {
            const excessIncome = assessableIncome - incomeThreshold;
            const reduction = excessIncome * CONFIG.PENSION.INCOME_REDUCTION_RATE;
            pensionFromIncome = Math.max(0, maxPension - reduction);
        }
        
        // Return the lower of the two calculations
        return Math.min(pensionFromAssets, pensionFromIncome);
    },

    /**
     * Calculate deeming income for financial assets
     */
    calculateDeeming: (financialAssets, isCouple = true) => {
        const threshold = isCouple ? 
            CONFIG.PENSION.DEEMING_THRESHOLD_COUPLE : 
            CONFIG.PENSION.DEEMING_THRESHOLD_SINGLE;
        
        let deemedIncome = 0;
        
        if (financialAssets <= threshold) {
            deemedIncome = financialAssets * CONFIG.PENSION.DEEMING_RATE_LOWER;
        } else {
            deemedIncome = threshold * CONFIG.PENSION.DEEMING_RATE_LOWER + 
                          (financialAssets - threshold) * CONFIG.PENSION.DEEMING_RATE_UPPER;
        }
        
        return deemedIncome;
    },

    /**
     * Get asset threshold for pension
     */
    getAssetThreshold: (isCouple, isHomeowner) => {
        if (isCouple) {
            return isHomeowner ? 
                CONFIG.PENSION.ASSET_THRESHOLD_COUPLE_HOMEOWNER :
                CONFIG.PENSION.ASSET_THRESHOLD_COUPLE_NON_HOMEOWNER;
        } else {
            return isHomeowner ?
                CONFIG.PENSION.ASSET_THRESHOLD_SINGLE_HOMEOWNER :
                CONFIG.PENSION.ASSET_THRESHOLD_SINGLE_NON_HOMEOWNER;
        }
    },

    /**
     * Get asset limit for pension
     */
    getAssetLimit: (isCouple, isHomeowner) => {
        if (isCouple) {
            return isHomeowner ?
                CONFIG.PENSION.ASSET_LIMIT_COUPLE_HOMEOWNER :
                CONFIG.PENSION.ASSET_LIMIT_COUPLE_NON_HOMEOWNER;
        } else {
            return isHomeowner ?
                CONFIG.PENSION.ASSET_LIMIT_SINGLE_HOMEOWNER :
                CONFIG.PENSION.ASSET_LIMIT_SINGLE_NON_HOMEOWNER;
        }
    }
};

// Healthcare Cost Calculator (Enhanced)
export const HealthcareCalculator = {
    /**
     * Calculate projected healthcare costs with age-based escalation
     */
    calculateHealthcareCosts: (currentAge, currentExpenses, healthInflation, targetAge) => {
        const years = targetAge - currentAge;
        
        // Base healthcare inflation
        let projectedCost = currentExpenses * Math.pow(1 + healthInflation, years);
        
        // Age-based cost escalation
        const ageMultiplier = HealthcareCalculator.getAgeMultiplier(targetAge);
        projectedCost *= ageMultiplier;
        
        return projectedCost;
    },

    /**
     * Get age-based healthcare cost multiplier
     */
    getAgeMultiplier: (age) => {
        // Healthcare costs increase exponentially with age
        if (age < 65) return 1.0;
        if (age < 70) return 1.3;
        if (age < 75) return 1.7;
        if (age < 80) return 2.2;
        if (age < 85) return 2.9;
        return 3.8; // 85+
    },

    /**
     * Calculate aged care probability and expected cost
     */
    calculateAgedCareCost: (age, gender = 'average') => {
        // Gender-adjusted probabilities (women live longer, higher probability)
        const genderMultiplier = gender === 'female' ? 1.1 : gender === 'male' ? 0.9 : 1.0;
        
        let probability = 0;
        
        // Calculate cumulative probability based on age
        if (age >= 85) probability = 0.85;
        else if (age >= 80) probability = 0.55;
        else if (age >= 75) probability = 0.40;
        else if (age >= 70) probability = 0.25;
        else if (age >= 65) probability = 0.15;
        
        probability *= genderMultiplier;
        
        // Expected cost based on level of care needed
        const expectedCost = (
            0.3 * CONFIG.HEALTHCARE.AGED_CARE_COSTS.LOW_CARE +
            0.5 * CONFIG.HEALTHCARE.AGED_CARE_COSTS.MEDIUM_CARE +
            0.2 * CONFIG.HEALTHCARE.AGED_CARE_COSTS.HIGH_CARE
        );
        
        return {
            probability: Math.min(probability, 1.0),
            expectedCost: expectedCost,
            weightedCost: probability * expectedCost
        };
    },

    /**
     * Calculate total lifetime healthcare costs
     */
    calculateLifetimeHealthcareCosts: (currentAge, lifespan, currentExpenses, healthInflation, includeAgedCare = true) => {
        let totalCosts = 0;
        let agedCareCosts = 0;
        
        for (let age = Math.ceil(currentAge); age <= lifespan; age++) {
            // Annual healthcare costs
            const annualCost = HealthcareCalculator.calculateHealthcareCosts(
                currentAge, currentExpenses, healthInflation, age
            );
            totalCosts += annualCost;
            
            // Aged care costs (one-time probability-weighted cost)
            if (includeAgedCare && age === Math.floor((lifespan + 75) / 2)) {
                const agedCare = HealthcareCalculator.calculateAgedCareCost(age);
                agedCareCosts = agedCare.weightedCost;
            }
        }
        
        return {
            totalHealthcareCosts: totalCosts,
            agedCareCosts: agedCareCosts,
            combinedCosts: totalCosts + agedCareCosts
        };
    }
};

// Portfolio Allocation and Returns Calculator
export const PortfolioCalculator = {
    /**
     * Calculate dynamic asset allocation based on age (glide path)
     */
    getDynamicAllocation: (age, riskTolerance = 'growth') => {
        const baseAllocations = CONFIG.SUPER.DEFAULT_ALLOCATIONS;
        
        // Find the closest age bracket
        const ages = Object.keys(baseAllocations).map(Number).sort((a, b) => a - b);
        let closestAge = ages[0];
        
        for (const ageKey of ages) {
            if (age >= ageKey) {
                closestAge = ageKey;
            } else {
                break;
            }
        }
        
        let allocation = { ...baseAllocations[closestAge] };
        
        // Adjust based on risk tolerance
        const riskAdjustments = {
            conservative: { equity: -15, bonds: +10, cash: +5 },
            moderate: { equity: -5, bonds: +3, cash: +2 },
            growth: { equity: 0, bonds: 0, cash: 0 },
            aggressive: { equity: +10, bonds: -5, cash: -5 }
        };
        
        const adjustment = riskAdjustments[riskTolerance] || riskAdjustments.growth;
        
        allocation.equity = Utils.Math.clamp(allocation.equity + adjustment.equity, 0, 95);
        allocation.bonds = Utils.Math.clamp(allocation.bonds + adjustment.bonds, 0, 70);
        allocation.cash = Utils.Math.clamp(allocation.cash + adjustment.cash, 2, 50);
        
        // Normalize to 100%
        const total = allocation.equity + allocation.bonds + allocation.cash;
        if (total !== 100) {
            allocation.equity = Math.round((allocation.equity / total) * 100);
            allocation.bonds = Math.round((allocation.bonds / total) * 100);
            allocation.cash = 100 - allocation.equity - allocation.bonds;
        }
        
        return allocation;
    },

    /**
     * Calculate portfolio return based on asset allocation
     */
    calculatePortfolioReturn: (allocation, marketConditions = {}) => {
        const baseReturns = CONFIG.ECONOMIC.HISTORICAL_RETURNS;
        
        // Apply market conditions (for Monte Carlo simulation)
        const equityReturn = (marketConditions.equityReturn || baseReturns.ASX_EQUITY_REAL);
        const bondReturn = (marketConditions.bondReturn || baseReturns.BONDS_REAL);
        const cashReturn = (marketConditions.cashReturn || baseReturns.CASH_REAL);
        
        // Add franking credit benefit for Australian equities
        const frankingBenefit = allocation.frankingCredits ? 
            CONFIG.ECONOMIC.FRANKING_CREDIT_BENEFIT : 0;
        
        const portfolioReturn = 
            (allocation.equity / 100) * (equityReturn + frankingBenefit) +
            (allocation.bonds / 100) * bondReturn +
            (allocation.cash / 100) * cashReturn;
        
        return portfolioReturn;
    },

    /**
     * Calculate portfolio volatility based on asset allocation
     */
    calculatePortfolioVolatility: (allocation) => {
        const volatilities = CONFIG.ECONOMIC.VOLATILITY;
        const correlations = CONFIG.SIMULATION.CORRELATIONS;
        
        // Simplified portfolio volatility calculation
        // For more accurate calculation, would need full covariance matrix
        const weightedVolatility = 
            (allocation.equity / 100) * volatilities.ASX_EQUITY +
            (allocation.bonds / 100) * volatilities.BONDS +
            (allocation.cash / 100) * volatilities.CASH;
        
        // Apply correlation effects (reduces overall volatility)
        const correlationReduction = 0.85; // Simplified correlation effect
        
        return weightedVolatility * correlationReduction;
    }
};

// Core Retirement Simulation Engine
export class RetirementSimulator {
    constructor(inputs) {
        this.inputs = inputs;
        this.results = {};
    }

    /**
     * Run deterministic retirement simulation
     */
    simulate() {
        Utils.Debug.time('Deterministic Simulation');
        
        const preRetirementResults = this.simulatePreRetirement();
        const retirementResults = this.simulateRetirement(preRetirementResults);
        
        this.results = {
            ...preRetirementResults,
            ...retirementResults,
            finalBalance: retirementResults.balances[retirementResults.balances.length - 1] || 0,
            success: retirementResults.balances[retirementResults.balances.length - 1] > 0
        };
        
        Utils.Debug.timeEnd('Deterministic Simulation');
        return this.results;
    }

    /**
     * Simulate pre-retirement accumulation phase
     */
    simulatePreRetirement() {
        const yearsToRetirement = this.inputs.retirementAge - this.inputs.yourCurrentAge;
        const partnerYearsToWork = Math.max(0, this.inputs.partnerRetirementAge - this.inputs.partnerCurrentAge);
        
        let futureSuper = this.inputs.currentSuper;
        let futureSavings = this.inputs.currentSavings;
        let futureStocks = this.inputs.currentStocks;
        
        for (let year = 1; year <= yearsToRetirement; year++) {
            // Calculate returns with dynamic allocation if enabled
            const currentAge = this.inputs.yourCurrentAge + year;
            const allocation = this.inputs.dynamicAllocation ?
                PortfolioCalculator.getDynamicAllocation(currentAge, this.inputs.riskTolerance) :
                {
                    equity: this.inputs.allocEquities,
                    bonds: this.inputs.allocBonds,
                    cash: this.inputs.allocCash,
                    frankingCredits: this.inputs.frankingCredits
                };
            
            // Apply returns
            const superReturn = this.inputs.superReturn / 100;
            const savingsReturn = this.inputs.savingsReturn || CONFIG.ECONOMIC.HISTORICAL_RETURNS.CASH_REAL;
            const stockReturn = PortfolioCalculator.calculatePortfolioReturn(allocation);
            
            futureSuper *= (1 + superReturn);
            futureSavings *= (1 + savingsReturn);
            futureStocks *= (1 + stockReturn);
            
            // Add contributions
            let totalPostTaxIncome = 0;
            let totalSuperContribution = 0;
            
            // Your contributions
            if (year <= yearsToRetirement) {
                const yourSalary = this.getSalaryForYear(this.inputs.yourSalary, year);
                totalPostTaxIncome += TaxCalculator.getPostTaxIncome(yourSalary);
                totalSuperContribution += yourSalary * CONFIG.SUPER.GUARANTEE_RATE;
            }
            
            // Partner contributions
            if (year <= partnerYearsToWork) {
                const partnerSalary = this.getSalaryForYear(this.inputs.partnerSalary, year);
                totalPostTaxIncome += TaxCalculator.getPostTaxIncome(partnerSalary);
                totalSuperContribution += partnerSalary * CONFIG.SUPER.GUARANTEE_RATE;
            }
            
            futureSuper += totalSuperContribution;
            futureSavings += totalPostTaxIncome * (this.inputs.percentIncomeSaved / 100);
            futureStocks += (this.inputs.monthlyStockContribution || 0) * 12;
        }
        
        // Calculate home equity at retirement
        const homeValueAtRetirement = this.inputs.homeValue * 
            Math.pow(1 + this.inputs.inflation / 100, yearsToRetirement);
        const mortgageAtRetirement = this.calculateMortgageBalance(yearsToRetirement);
        const homeEquity = homeValueAtRetirement - mortgageAtRetirement;
        const accessibleHomeEquity = this.inputs.planToDownsize ? 
            homeEquity * 0.7 : 0; // Assume can access 70% through downsizing
        
        return {
            futureSuper,
            futureSavings,
            futureStocks,
            homeEquity,
            accessibleHomeEquity,
            totalAccessibleAssets: futureSuper + futureSavings + futureStocks + accessibleHomeEquity
        };
    }

    /**
     * Simulate retirement withdrawal phase
     */
    simulateRetirement(preRetirementResults) {
        const yearsInRetirement = Math.max(
            this.inputs.yourLifespan - this.inputs.retirementAge,
            this.inputs.partnerLifespan - this.inputs.retirementAge
        );
        
        let currentBalance = preRetirementResults.totalAccessibleAssets;
        const balances = [];
        const yearlyData = [];
        
        // Calculate healthcare costs
        const healthcareCosts = HealthcareCalculator.calculateLifetimeHealthcareCosts(
            this.inputs.retirementAge,
            Math.max(this.inputs.yourLifespan, this.inputs.partnerLifespan),
            this.inputs.currentHealthExpenses || 5000,
            this.inputs.healthInflationRate / 100 || 0.065,
            true
        );
        
        for (let year = 0; year < yearsInRetirement; year++) {
            const currentAge = this.inputs.retirementAge + year;
            const isCouple = currentAge < Math.min(this.inputs.yourLifespan, this.inputs.partnerLifespan);
            
            // Calculate required income (ASFA Comfortable standard)
            const baseIncomeNeeded = this.inputs.asfaComfortable * 
                Math.pow(1 + this.inputs.inflation / 100, year);
            
            // Add healthcare costs
            const healthcareCost = HealthcareCalculator.calculateHealthcareCosts(
                this.inputs.retirementAge,
                this.inputs.currentHealthExpenses || 5000,
                this.inputs.healthInflationRate / 100 || 0.065,
                currentAge
            );
            
            const totalIncomeNeeded = baseIncomeNeeded + healthcareCost;
            
            // Calculate pension entitlement
            const assessableAssets = currentBalance;
            const deemedIncome = PensionCalculator.calculateDeeming(currentBalance, isCouple);
            const annualPension = PensionCalculator.calculatePension(
                assessableAssets, 
                deemedIncome, 
                isCouple, 
                true // assume homeowner
            );
            
            // Calculate withdrawal needed
            const netWithdrawalNeeded = Math.max(0, totalIncomeNeeded - annualPension);
            
            // Check if we can afford the withdrawal
            if (currentBalance < netWithdrawalNeeded) {
                // Assets depleted
                balances.push(0);
                yearlyData.push({
                    year: Utils.DateTime.currentYear() + year,
                    age: currentAge,
                    incomeNeeded: totalIncomeNeeded,
                    pension: annualPension,
                    withdrawal: currentBalance,
                    healthcareCost: healthcareCost,
                    balance: 0,
                    depleted: true
                });
                break;
            }
            
            // Apply investment returns with dynamic allocation
            const allocation = this.inputs.dynamicAllocation ?
                PortfolioCalculator.getDynamicAllocation(currentAge, this.inputs.riskTolerance) :
                {
                    equity: this.inputs.allocEquities,
                    bonds: this.inputs.allocBonds,
                    cash: this.inputs.allocCash,
                    frankingCredits: this.inputs.frankingCredits
                };
            
            const portfolioReturn = PortfolioCalculator.calculatePortfolioReturn(allocation);
            
            // Monthly simulation for more accurate withdrawal modeling
            const monthlyReturn = Math.pow(1 + portfolioReturn, 1/12) - 1;
            const monthlyWithdrawal = netWithdrawalNeeded / 12;
            
            const startBalance = currentBalance;
            let yearlyGrowth = 0;
            
            for (let month = 0; month < 12; month++) {
                const monthlyGrowth = currentBalance * monthlyReturn;
                yearlyGrowth += monthlyGrowth;
                currentBalance = currentBalance + monthlyGrowth - monthlyWithdrawal;
                
                if (currentBalance < 0) {
                    currentBalance = 0;
                    break;
                }
            }
            
            balances.push(currentBalance);
            yearlyData.push({
                year: Utils.DateTime.currentYear() + year,
                age: currentAge,
                startBalance: startBalance,
                incomeNeeded: totalIncomeNeeded,
                pension: annualPension,
                withdrawal: netWithdrawalNeeded,
                healthcareCost: healthcareCost,
                growth: yearlyGrowth,
                balance: currentBalance,
                depleted: false
            });
            
            if (currentBalance <= 0) break;
        }
        
        return {
            balances,
            yearlyData,
            healthcareCosts,
            success: currentBalance > 0
        };
    }

    /**
     * Run Monte Carlo simulation
     */
    async runMonteCarlo(numRuns = 5000, progressCallback = null) {
        Utils.Debug.time('Monte Carlo Simulation');
        
        const outcomes = [];
        const paths = [];
        
        for (let run = 0; run < numRuns; run++) {
            const randomizedInputs = this.generateRandomScenario();
            const simulator = new RetirementSimulator(randomizedInputs);
            const result = simulator.simulate();
            
            outcomes.push(result.finalBalance);
            paths.push(result.balances);
            
            // Update progress
            if (progressCallback && run % 100 === 0) {
                const progress = (run / numRuns) * 100;
                progressCallback(progress, `Completed ${run}/${numRuns} simulations`);
            }
        }
        
        // Calculate statistics
        outcomes.sort((a, b) => a - b);
        const statistics = {
            runs: numRuns,
            successRate: outcomes.filter(o => o > 0).length / numRuns,
            median: Utils.Math.percentile(outcomes, 0.5),
            p10: Utils.Math.percentile(outcomes, 0.1),
            p25: Utils.Math.percentile(outcomes, 0.25),
            p75: Utils.Math.percentile(outcomes, 0.75),
            p90: Utils.Math.percentile(outcomes, 0.9),
            worst: outcomes[0],
            best: outcomes[outcomes.length - 1]
        };
        
        Utils.Debug.timeEnd('Monte Carlo Simulation');
        
        return {
            outcomes,
            paths,
            statistics
        };
    }

    /**
     * Generate randomized scenario for Monte Carlo simulation
     */
    generateRandomScenario() {
        const randomInputs = { ...this.inputs };
        
        // Randomize investment returns
        const baseReturn = this.inputs.investmentReturn / 100;
        const volatility = this.inputs.returnVolatility / 100;
        randomInputs.investmentReturn = Utils.Math.randomNormal(baseReturn, volatility) * 100;
        
        // Randomize super returns
        const superVolatility = CONFIG.ECONOMIC.VOLATILITY.BALANCED;
        randomInputs.superReturn = Utils.Math.randomNormal(
            this.inputs.superReturn / 100, 
            superVolatility
        ) * 100;
        
        // Randomize inflation
        randomInputs.inflation = Utils.Math.randomNormal(
            this.inputs.inflation / 100,
            0.01 // 1% volatility
        ) * 100;
        
        // Apply market shocks if enabled
        if (this.inputs.enableMarketShocks) {
            const shockProbability = this.inputs.shockProbability / 100;
            if (Math.random() < shockProbability) {
                const shockMagnitude = this.inputs.shockMagnitude / 100;
                randomInputs.investmentReturn += shockMagnitude * 100;
                randomInputs.superReturn += shockMagnitude * 100 * 0.6; // Super has some protection
            }
        }
        
        // Randomize healthcare costs
        randomInputs.healthInflationRate = Utils.Math.randomNormal(
            this.inputs.healthInflationRate,
            1.0 // 1% volatility
        );
        
        // Randomize lifespan (within reasonable bounds)
        randomInputs.yourLifespan = Math.round(Utils.Math.randomNormal(
            this.inputs.yourLifespan,
            3 // 3 year standard deviation
        ));
        randomInputs.partnerLifespan = Math.round(Utils.Math.randomNormal(
            this.inputs.partnerLifespan,
            3
        ));
        
        return randomInputs;
    }

    /**
     * Calculate salary for given year with growth and lean years
     */
    getSalaryForYear(baseSalary, year) {
        const realGrowthRate = (this.inputs.salaryGrowthRate || 1.5) / 100;
        const inflationRate = this.inputs.inflation / 100;
        
        let salary = baseSalary * Math.pow(1 + realGrowthRate + inflationRate, year);
        
        // Apply lean years if specified
        const yearsToRetirement = this.inputs.retirementAge - this.inputs.yourCurrentAge;
        const leanYearsStart = yearsToRetirement - (this.inputs.leanYearsStart || 0);
        
        if (year >= leanYearsStart && this.inputs.leanYearsReduction) {
            salary *= (1 - this.inputs.leanYearsReduction / 100);
        }
        
        return salary;
    }

    /**
     * Calculate mortgage balance after payments
     */
    calculateMortgageBalance(years) {
        if (!this.inputs.mortgageBalance || !this.inputs.monthlyMortgagePayment) {
            return 0;
        }
        
        const monthlyRate = this.inputs.mortgageRate / 100 / 12;
        const totalPayments = years * 12;
        
        return Utils.Math.loanBalance(
            this.inputs.mortgageBalance,
            this.inputs.mortgageRate / 100,
            30 * 12, // Assume 30 year loan
            totalPayments,
            this.inputs.monthlyMortgagePayment
        );
    }
}

// Export the main simulation class and calculators
export { RetirementSimulator as default };