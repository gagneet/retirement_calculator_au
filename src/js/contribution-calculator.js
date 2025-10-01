// contribution-calculator.js - Detailed Contribution Strategy Calculator
// Provides year-by-year contribution recommendations with specific dollar amounts

import { formatCurrency, formatPercent } from './utils.js';

export class ContributionCalculator {
    constructor(config) {
        this.config = config;

        // 2024-25 contribution caps
        this.CONCESSIONAL_CAP = 30000;
        this.NON_CONCESSIONAL_CAP = 120000;
        this.NON_CONCESSIONAL_CAP_3YEAR = 360000;
        this.DIVISION_293_THRESHOLD = 250000;
        this.TOTAL_SUPER_BALANCE_THRESHOLD = 500000;
        this.TRANSFER_BALANCE_CAP = 1900000;
        this.SPOUSE_CONTRIBUTION_INCOME_LIMIT = 40000;
        this.SPOUSE_CONTRIBUTION_MAX_OFFSET = 540;
        this.GOVERNMENT_COCONTRIBUTION_INCOME_THRESHOLD = 42016;
        this.GOVERNMENT_COCONTRIBUTION_MAX = 500;
    }

    /**
     * Generate comprehensive contribution plan
     * @param {Object} inputs - User inputs
     * @returns {Object} Detailed contribution strategy
     */
    generateContributionPlan(inputs) {
        const personalDetails = this.extractPersonalDetails(inputs);
        const financialData = this.extractFinancialData(inputs);

        return {
            summary: this.generateSummary(personalDetails, financialData),
            concessionalStrategy: this.optimizeConcessionalContributions(personalDetails, financialData),
            nonConcessionalStrategy: this.optimizeNonConcessionalContributions(personalDetails, financialData),
            spouseContributions: this.calculateSpouseContributions(personalDetails, financialData),
            governmentCoContribution: this.calculateGovernmentCoContribution(personalDetails, financialData),
            yearByYearPlan: this.generateYearByYearPlan(personalDetails, financialData),
            warnings: this.generateWarnings(personalDetails, financialData)
        };
    }

    extractPersonalDetails(inputs) {
        return {
            age: inputs.yourCurrentAge || 40,
            partnerAge: inputs.partnerCurrentAge || 40,
            retirementAge: inputs.retirementAge || 67,
            partnerRetirementAge: inputs.partnerRetirementAge || 67,
            partnered: (inputs.partnerSalary > 0 || inputs.partnerCurrentSuper > 0),
            yearsToRetirement: (inputs.retirementAge || 67) - (inputs.yourCurrentAge || 40)
        };
    }

    extractFinancialData(inputs) {
        return {
            salary: inputs.yourSalary || 0,
            partnerSalary: inputs.partnerSalary || 0,
            superBalance: inputs.yourCurrentSuper || 0,
            partnerSuperBalance: inputs.partnerCurrentSuper || 0,
            currentSavings: inputs.currentSavings || 0,
            currentStocks: inputs.currentStocks || 0,
            investmentIncome: (inputs.currentStocks * (inputs.dividendYield || 0) / 100) || 0
        };
    }

    generateSummary(personalDetails, financialData) {
        const sgContributions = financialData.salary * 0.12;
        const availableConcessional = this.CONCESSIONAL_CAP - sgContributions;
        const availableNonConcessional = this.calculateAvailableNonConcessional(financialData.superBalance);

        return {
            currentSituation: {
                employerSG: Math.round(sgContributions),
                concessionalCapSpace: Math.round(availableConcessional),
                nonConcessionalCapSpace: Math.round(availableNonConcessional),
                carryForwardEligible: financialData.superBalance < this.TOTAL_SUPER_BALANCE_THRESHOLD
            },
            projectedRetirement: {
                yearsToRetirement: personalDetails.yearsToRetirement,
                currentSuper: Math.round(financialData.superBalance),
                projectedSuperWithSG: Math.round(this.projectSuperBalance(
                    financialData.superBalance,
                    sgContributions,
                    personalDetails.yearsToRetirement
                ))
            }
        };
    }

    optimizeConcessionalContributions(personalDetails, financialData) {
        const salary = financialData.salary;
        const sgContributions = salary * 0.12;
        const availableCap = this.CONCESSIONAL_CAP - sgContributions;

        // Calculate marginal tax rate
        const marginalRate = this.calculateMarginalTaxRate(salary);
        const superTaxRate = 0.15;
        const taxBenefit = marginalRate - superTaxRate;

        // Check Division 293 proximity
        const incomeForDiv293 = salary + financialData.investmentIncome;
        const bufferToDiv293 = this.DIVISION_293_THRESHOLD - incomeForDiv293 - sgContributions;

        let recommendedAmount = 0;
        let strategy = '';

        if (taxBenefit > 0.15) { // 30%+ marginal rate
            // Maximize but respect Division 293 if close
            if (bufferToDiv293 > 0 && bufferToDiv293 < availableCap) {
                recommendedAmount = Math.floor(bufferToDiv293 / 1000) * 1000; // Round down to nearest $1000
                strategy = 'MAXIMIZE_UNDER_DIV293';
            } else {
                recommendedAmount = Math.min(availableCap, salary * 0.15);
                strategy = 'MAXIMIZE';
            }
        } else if (taxBenefit > 0.05) { // 19-30% marginal rate
            recommendedAmount = Math.min(availableCap, salary * 0.10);
            strategy = 'MODERATE';
        } else {
            recommendedAmount = 0;
            strategy = 'MINIMAL_BENEFIT';
        }

        const annualTaxSaving = recommendedAmount * taxBenefit;
        const lifetimeValue = this.calculateFutureValue(
            recommendedAmount,
            personalDetails.yearsToRetirement,
            0.07
        );

        return {
            strategy: strategy,
            current: {
                employerSG: Math.round(sgContributions),
                voluntaryContributions: 0, // Could be enhanced to pull from inputs
                totalConcessional: Math.round(sgContributions),
                capRemaining: Math.round(availableCap)
            },
            recommended: {
                salarySacrificeAmount: Math.round(recommendedAmount),
                perPayPeriod: {
                    weekly: Math.round(recommendedAmount / 52),
                    fortnightly: Math.round(recommendedAmount / 26),
                    monthly: Math.round(recommendedAmount / 12)
                },
                totalConcessionalAfter: Math.round(sgContributions + recommendedAmount),
                capUsage: Math.round(((sgContributions + recommendedAmount) / this.CONCESSIONAL_CAP) * 100)
            },
            benefits: {
                annualTaxSaving: Math.round(annualTaxSaving),
                takeHomeReduction: Math.round(recommendedAmount * (1 - marginalRate)),
                netAnnualBenefit: Math.round(annualTaxSaving),
                lifetimeRetirementValue: Math.round(lifetimeValue)
            },
            implementation: {
                step1: 'Contact your payroll/HR department',
                step2: `Request salary sacrifice of $${Math.round(recommendedAmount / 12).toLocaleString()}/month`,
                step3: 'Ensure it\'s processed as "concessional contributions"',
                step4: 'Monitor via myGov to confirm contributions received',
                step5: 'Review annually and adjust for salary changes'
            }
        };
    }

    optimizeNonConcessionalContributions(personalDetails, financialData) {
        const superBalance = financialData.superBalance;
        const savings = financialData.currentSavings;

        // Check eligibility
        if (superBalance >= this.TRANSFER_BALANCE_CAP) {
            return {
                eligible: false,
                reason: 'Total Super Balance at or above Transfer Balance Cap',
                details: {
                    superBalance: superBalance,
                    transferBalanceCap: this.TRANSFER_BALANCE_CAP
                }
            };
        }

        const availableCap = this.calculateAvailableNonConcessional(superBalance);
        const excessSavings = Math.max(0, savings - 20000); // Keep $20k emergency buffer

        let recommendedAmount = 0;
        let strategy = '';

        if (excessSavings > availableCap) {
            recommendedAmount = availableCap;
            strategy = 'MAXIMIZE_CAP';
        } else if (excessSavings > 10000) {
            recommendedAmount = Math.floor(excessSavings / 5000) * 5000; // Round to $5k
            strategy = 'UTILIZE_EXCESS';
        } else {
            recommendedAmount = 0;
            strategy = 'INSUFFICIENT_EXCESS';
        }

        const futureValue = this.calculateFutureValue(
            recommendedAmount,
            personalDetails.yearsToRetirement,
            0.07
        );

        return {
            eligible: true,
            strategy: strategy,
            current: {
                totalSuperBalance: Math.round(superBalance),
                savingsAvailable: Math.round(savings),
                excessSavings: Math.round(excessSavings),
                annualCap: this.NON_CONCESSIONAL_CAP,
                threeYearCap: this.NON_CONCESSIONAL_CAP_3YEAR
            },
            recommended: {
                contributionAmount: Math.round(recommendedAmount),
                timing: recommendedAmount > 0 ? 'THIS_FINANCIAL_YEAR' : 'NOT_RECOMMENDED',
                bringForwardEligible: superBalance < this.TRANSFER_BALANCE_CAP && personalDetails.age < 65
            },
            benefits: {
                taxFreeGrowth: 'All earnings taxed at 15% in accumulation phase',
                taxFreeWithdrawals: personalDetails.age >= 60 ? 'Available now' : `Available from age 60 (${60 - personalDetails.age} years)`,
                estatePlanning: 'Tax-free to dependents, protected from creditors',
                futureValue: Math.round(futureValue)
            },
            considerations: [
                'No tax deduction for non-concessional contributions',
                'Funds preserved until retirement age',
                'Consider cash flow and liquidity needs',
                'Cannot reverse once contributed'
            ]
        };
    }

    calculateSpouseContributions(personalDetails, financialData) {
        if (!personalDetails.partnered) {
            return {
                applicable: false,
                message: 'Spouse contributions only available for couples'
            };
        }

        const partnerIncome = financialData.partnerSalary;
        const yourIncome = financialData.salary;

        // Tax offset available if spouse income under $40,000
        if (partnerIncome > this.SPOUSE_CONTRIBUTION_INCOME_LIMIT) {
            return {
                applicable: true,
                eligible: false,
                message: `Spouse contribution tax offset not available (partner income $${Math.round(partnerIncome).toLocaleString()} exceeds $${this.SPOUSE_CONTRIBUTION_INCOME_LIMIT.toLocaleString()})`,
                alternative: 'Consider contribution splitting instead'
            };
        }

        // Maximum offset is $540 for contributions up to $3000
        // Reduces by $1 for every $1 of spouse income over $37,000
        const maxContribution = 3000;
        let maxOffset = this.SPOUSE_CONTRIBUTION_MAX_OFFSET;

        if (partnerIncome > 37000) {
            maxOffset = Math.max(0, maxOffset - (partnerIncome - 37000));
        }

        const recommendedContribution = partnerIncome <= 37000 ? maxContribution :
            Math.max(0, maxContribution - (partnerIncome - 37000));

        return {
            applicable: true,
            eligible: true,
            details: {
                partnerIncome: Math.round(partnerIncome),
                incomeThreshold: this.SPOUSE_CONTRIBUTION_INCOME_LIMIT,
                maxContribution: maxContribution,
                maxTaxOffset: Math.round(maxOffset)
            },
            recommended: {
                contributionAmount: Math.round(recommendedContribution),
                taxOffsetReceived: Math.round(maxOffset),
                netCost: Math.round(recommendedContribution - maxOffset),
                effectiveRate: maxOffset > 0 ? (maxOffset / recommendedContribution * 100).toFixed(1) + '%' : '0%'
            },
            action: recommendedContribution > 0
                ? `Contribute $${Math.round(recommendedContribution).toLocaleString()} to spouse's super to receive $${Math.round(maxOffset).toLocaleString()} tax offset`
                : 'Spouse income too high for tax offset',
            implementation: [
                'Contribute to spouse\'s super fund',
                'Ensure contribution is in your name',
                'Complete "Contribution for my spouse" section in tax return',
                'Keep receipts and documentation'
            ]
        };
    }

    calculateGovernmentCoContribution(personalDetails, financialData) {
        const totalIncome = financialData.salary + financialData.investmentIncome;
        const superBalance = financialData.superBalance;

        // Eligibility: Income under $42,016, make non-concessional contribution, meet 10% income test
        if (totalIncome >= this.GOVERNMENT_COCONTRIBUTION_INCOME_THRESHOLD) {
            return {
                eligible: false,
                message: `Income ($${Math.round(totalIncome).toLocaleString()}) exceeds threshold ($${this.GOVERNMENT_COCONTRIBUTION_INCOME_THRESHOLD.toLocaleString()})`,
                incomeThreshold: this.GOVERNMENT_COCONTRIBUTION_INCOME_THRESHOLD
            };
        }

        // Maximum co-contribution is $500 (matching $1000 contribution)
        // Reduces by 3.333 cents for every dollar over $27,016
        const lowerThreshold = 27016;
        let maxCoContribution = this.GOVERNMENT_COCONTRIBUTION_MAX;

        if (totalIncome > lowerThreshold) {
            const reduction = (totalIncome - lowerThreshold) * 0.03333;
            maxCoContribution = Math.max(0, maxCoContribution - reduction);
        }

        const contributionFor MaxCoContribution = maxCoContribution * 2; // Government matches 50c per dollar

        return {
            eligible: true,
            details: {
                totalIncome: Math.round(totalIncome),
                lowerThreshold: lowerThreshold,
                upperThreshold: this.GOVERNMENT_COCONTRIBUTION_INCOME_THRESHOLD,
                maxCoContribution: Math.round(maxCoContribution)
            },
            recommended: {
                yourContribution: Math.round(contributionForMaxCoContribution),
                governmentMatches: Math.round(maxCoContribution),
                totalToSuper: Math.round(contributionForMaxCoContribution + maxCoContribution),
                effectiveBonus: '50%'
            },
            action: maxCoContribution > 0
                ? `Contribute $${Math.round(contributionForMaxCoContribution).toLocaleString()} (non-concessional) to receive $${Math.round(maxCoContribution).toLocaleString()} government co-contribution`
                : 'No co-contribution available at current income level',
            requirements: [
                'Must be under age 71',
                'At least 10% of income from employment or business',
                'Make non-concessional (after-tax) contribution',
                'Lodge tax return to claim',
                'ATO automatically calculates if eligible'
            ]
        };
    }

    generateYearByYearPlan(personalDetails, financialData) {
        const plan = [];
        const yearsToRetirement = Math.min(personalDetails.yearsToRetirement, 10); // Plan 10 years max

        let projectedSuper = financialData.superBalance;
        let projectedSalary = financialData.salary;
        const salaryGrowth = 0.03; // 3% annual growth

        for (let year = 0; year < yearsToRetirement; year++) {
            const age = personalDetails.age + year;
            const sgContribution = projectedSalary * 0.12;
            const recommendedSalarySacrifice = this.calculateYearlyRecommendation(
                age,
                projectedSalary,
                projectedSuper
            );

            const totalContributions = sgContribution + recommendedSalarySacrifice;
            const taxSaving = recommendedSalarySacrifice * (this.calculateMarginalTaxRate(projectedSalary) - 0.15);

            projectedSuper = projectedSuper * 1.07 + totalContributions; // 7% growth
            projectedSalary = projectedSalary * (1 + salaryGrowth);

            plan.push({
                year: new Date().getFullYear() + year,
                age: age,
                salary: Math.round(projectedSalary),
                employerSG: Math.round(sgContribution),
                recommendedSalarySacrifice: Math.round(recommendedSalarySacrifice),
                totalContributions: Math.round(totalContributions),
                taxSaving: Math.round(taxSaving),
                projectedSuper: Math.round(projectedSuper),
                milestones: this.getMilestones(age, projectedSuper)
            });
        }

        return {
            planHorizon: yearsToRetirement,
            yearlyDetails: plan,
            totalProjection: {
                totalContributions: Math.round(plan.reduce((sum, y) => sum + y.totalContributions, 0)),
                totalTaxSavings: Math.round(plan.reduce((sum, y) => sum + y.taxSaving, 0)),
                finalSuperBalance: Math.round(projectedSuper)
            }
        };
    }

    calculateYearlyRecommendation(age, salary, superBalance) {
        const sgContributions = salary * 0.12;
        const availableCap = this.CONCESSIONAL_CAP - sgContributions;
        const marginalRate = this.calculateMarginalTaxRate(salary);

        // More aggressive earlier, more conservative closer to retirement
        const aggressiveness = Math.max(0.05, Math.min(0.15, (67 - age) / 270)); // 5-15% of salary

        if (marginalRate > 0.34) { // 37%+ bracket
            return Math.min(availableCap, salary * aggressiveness);
        } else if (marginalRate > 0.19) { // 32.5% bracket
            return Math.min(availableCap, salary * (aggressiveness * 0.7));
        } else {
            return Math.min(availableCap, salary * 0.05);
        }
    }

    getMilestones(age, superBalance) {
        const milestones = [];

        if (age === 60) {
            milestones.push('Preservation age reached - can access super if retired');
        }
        if (age === 65) {
            milestones.push('Can access super regardless of work status');
        }
        if (age === 67) {
            milestones.push('Age Pension eligibility age');
        }
        if (superBalance >= this.TRANSFER_BALANCE_CAP * 0.9) {
            milestones.push('Approaching Transfer Balance Cap - review strategy');
        }

        return milestones;
    }

    generateWarnings(personalDetails, financialData) {
        const warnings = [];

        // Division 293 warning
        const totalIncome = financialData.salary + financialData.investmentIncome;
        if (totalIncome > 230000) {
            warnings.push({
                type: 'DIVISION_293',
                severity: 'HIGH',
                message: 'Approaching Division 293 threshold - additional 15% tax may apply on super contributions'
            });
        }

        // Transfer Balance Cap warning
        if (financialData.superBalance > this.TRANSFER_BALANCE_CAP * 0.8) {
            warnings.push({
                type: 'TRANSFER_BALANCE_CAP',
                severity: 'MEDIUM',
                message: 'Super balance approaching Transfer Balance Cap - may affect contribution eligibility'
            });
        }

        // Preservation age
        if (personalDetails.age < 60) {
            warnings.push({
                type: 'PRESERVATION',
                severity: 'LOW',
                message: `Contributions preserved until age 60 (${60 - personalDetails.age} years away)`
            });
        }

        return warnings;
    }

    // Helper methods

    calculateAvailableNonConcessional(superBalance) {
        if (superBalance >= this.TRANSFER_BALANCE_CAP) {
            return 0;
        }
        return this.NON_CONCESSIONAL_CAP;
    }

    projectSuperBalance(currentSuper, annualContributions, years) {
        const rate = 0.07;
        // Future value of current balance + future value of annuity
        const fvCurrent = currentSuper * Math.pow(1 + rate, years);
        const fvContributions = annualContributions * (Math.pow(1 + rate, years) - 1) / rate * (1 + rate);
        return fvCurrent + fvContributions;
    }

    calculateFutureValue(annualAmount, years, rate) {
        if (years <= 0) return 0;
        return annualAmount * (((1 + rate) ** years - 1) / rate) * (1 + rate);
    }

    calculateMarginalTaxRate(income) {
        if (income <= 18200) return 0.02;
        if (income <= 45000) return 0.21; // 19% + 2% Medicare
        if (income <= 135000) return 0.345; // 32.5% + 2% Medicare
        if (income <= 190000) return 0.39; // 37% + 2% Medicare
        return 0.47; // 45% + 2% Medicare
    }
}
