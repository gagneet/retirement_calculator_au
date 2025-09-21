
/**
 * Enhanced Australian Retirement Calculator - Core Simulation Engine
 * Contains financial modeling, tax calculations, pension modeling, and Monte Carlo simulation
 */

import { CONFIG } from './config.js';
import { Utils } from './utils.js';

// Tax Calculation Engine
declare interface TaxCalculatorType {
	/**
     * Calculate Australian income tax for given salary
     */
	static calculateIncomeTax: Function;

	/**
     * Calculate post-tax income
     */
	static getPostTaxIncome: Function;

	/**
     * Calculate marginal tax rate
     */
	static getMarginalTaxRate: {	};

	/**
     * Calculate capital gains tax
     */
	static calculateCGT: {	};
}

declare interface PensionCalculatorType {
	/**
     * Calculate age pension entitlement based on assets and income tests
     */
	static calculatePension: {	};

	/**
     * Calculate deeming income for financial assets
     */
	static calculateDeeming: {	};

	/**
     * Get asset threshold for pension
     */
	static getAssetThreshold: {	};

	/**
     * Get asset limit for pension
     */
	static getAssetLimit: {	};
}

declare interface HealthcareCalculatorType {
	/**
     * Calculate projected healthcare costs with age-based escalation
     */
	static calculateHealthcareCosts: Function;

	/**
     * Get age-based healthcare cost multiplier
     */
	static getAgeMultiplier: Function;

	/**
     * Calculate aged care probability and expected cost
     */
	static calculateAgedCareCost: {	};

	/**
     * Calculate total lifetime healthcare costs
     */
	static calculateLifetimeHealthcareCosts: {	};
}

declare interface PortfolioCalculatorType {
	/**
     * Calculate dynamic asset allocation based on age (glide path)
     */
	static getDynamicAllocation: {	};

	/**
     * Calculate portfolio return based on asset allocation
     */
	static calculatePortfolioReturn: {	};

	/**
     * Calculate portfolio volatility based on asset allocation
     */
	static calculatePortfolioVolatility: Function;
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
        declare interface statisticsType {
	/**
     * Generate randomized scenario for Monte Carlo simulation
     */
	generateRandomScenario(): any;

	/**
     * Calculate salary for given year with growth and lean years
     */
	getSalaryForYear(baseSalary: any, year: any): any;

	/**
     * Calculate mortgage balance after payments
     */
	calculateMortgageBalance(years: any): number | null;
}
