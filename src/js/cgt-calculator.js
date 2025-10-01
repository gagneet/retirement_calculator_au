// cgt-calculator.js - Capital Gains Tax Calculator with Australian-specific optimization
// Handles investment property CGT, timing optimization, and main residence exemptions

import { formatCurrency, formatPercent } from './utils.js';

export class CGTCalculator {
    constructor(config) {
        this.config = config;

        // CGT constants
        this.CGT_DISCOUNT = 0.50; // 50% discount for assets held > 12 months
        this.CORPORATE_TAX_RATE = 0.30;
        this.MEDICARE_LEVY = 0.02;
        this.MAIN_RESIDENCE_ABSENCE_PERIOD = 6; // 6 year rule
    }

    /**
     * Calculate comprehensive CGT analysis for property
     * @param {Object} inputs - User inputs
     * @returns {Object} CGT analysis and optimization strategies
     */
    analyzeCGT(inputs) {
        if (!inputs.hasInvestmentProperty) {
            return {
                applicable: false,
                message: 'No investment property to analyze'
            };
        }

        const propertyDetails = this.extractPropertyDetails(inputs);
        const personalDetails = this.extractPersonalDetails(inputs);

        return {
            propertyDetails: propertyDetails,
            cgtCalculations: this.calculateCGTScenarios(propertyDetails, personalDetails, inputs),
            timingOptimization: this.optimizeTiming(propertyDetails, personalDetails, inputs),
            mainResidenceStrategies: this.analyzeMainResidenceStrategies(propertyDetails, personalDetails, inputs),
            recommendations: this.generateRecommendations(propertyDetails, personalDetails, inputs)
        };
    }

    extractPropertyDetails(inputs) {
        const currentValue = inputs.investmentPropertyValue || 0;
        const purchasePrice = currentValue * 0.6; // Estimate if not provided
        const purchaseYear = new Date().getFullYear() - 10; // Assume 10 years ago

        return {
            currentValue: currentValue,
            purchasePrice: purchasePrice,
            capitalGain: currentValue - purchasePrice,
            purchaseDate: `${purchaseYear}-01-01`,
            yearsHeld: 10,
            eligibleForDiscount: true,
            loanBalance: inputs.investmentPropertyLoan || 0,
            weeklyRent: inputs.weeklyRentalIncome || 0,
            annualRent: (inputs.weeklyRentalIncome || 0) * 52,
            annualExpenses: inputs.annualPropertyExpenses || 0,
            propertyGrowthRate: inputs.propertyGrowthRate || 4.5
        };
    }

    extractPersonalDetails(inputs) {
        return {
            age: inputs.yourCurrentAge || 40,
            retirementAge: inputs.retirementAge || 67,
            currentSalary: inputs.yourSalary || 0,
            yearsToRetirement: (inputs.retirementAge || 67) - (inputs.yourCurrentAge || 40),
            superBalance: inputs.yourCurrentSuper || 0,
            partnerSalary: inputs.partnerSalary || 0
        };
    }

    /**
     * Calculate CGT under different scenarios
     */
    calculateCGTScenarios(propertyDetails, personalDetails, inputs) {
        const capitalGain = propertyDetails.capitalGain;
        const scenarios = {};

        // Scenario 1: Sell now
        scenarios.sellNow = {
            timing: 'Sell immediately',
            capitalGain: capitalGain,
            currentValue: propertyDetails.currentValue,
            ...this.calculateCGTForIncome(capitalGain, personalDetails.currentSalary, propertyDetails.eligibleForDiscount)
        };

        // Scenario 2: Sell in retirement (assume minimal income)
        const yearsToRetirement = personalDetails.yearsToRetirement;
        const futureValue = propertyDetails.currentValue * Math.pow(1 + propertyDetails.propertyGrowthRate / 100, yearsToRetirement);
        const futureGain = futureValue - propertyDetails.purchasePrice;

        scenarios.sellInRetirement = {
            timing: `Sell at retirement (${yearsToRetirement} years)`,
            capitalGain: futureGain,
            futureValue: futureValue,
            yearsToWait: yearsToRetirement,
            ...this.calculateCGTForIncome(futureGain, 0, propertyDetails.eligibleForDiscount)
        };

        // Scenario 3: Sell in first year of retirement (partial income)
        const partialYearIncome = personalDetails.currentSalary * 0.5; // Assume half year work
        scenarios.sellFirstYearRetirement = {
            timing: `Sell in first year of retirement (partial income)`,
            capitalGain: futureGain,
            futureValue: futureValue,
            yearsToWait: yearsToRetirement,
            ...this.calculateCGTForIncome(futureGain, partialYearIncome, propertyDetails.eligibleForDiscount)
        };

        // Scenario 4: Sell next financial year (if late in FY)
        const currentMonth = new Date().getMonth();
        if (currentMonth >= 3) { // April onwards (Q4 of FY)
            scenarios.sellNextFY = {
                timing: 'Sell next financial year',
                capitalGain: capitalGain * 1.045, // Assume 4.5% growth
                currentValue: propertyDetails.currentValue * 1.045,
                ...this.calculateCGTForIncome(capitalGain * 1.045, personalDetails.currentSalary, propertyDetails.eligibleForDiscount),
                note: 'Defer to next FY to spread income across tax years'
            };
        }

        return scenarios;
    }

    /**
     * Calculate CGT for a given income level
     */
    calculateCGTForIncome(capitalGain, otherIncome, eligibleForDiscount = true) {
        // Apply CGT discount if held > 12 months
        const discountedGain = eligibleForDiscount ? capitalGain * this.CGT_DISCOUNT : capitalGain;

        // Calculate taxable income
        const taxableIncome = otherIncome + discountedGain;

        // Calculate tax with and without CGT
        const totalTax = this.calculateIncomeTax(taxableIncome);
        const taxWithoutCGT = this.calculateIncomeTax(otherIncome);
        const cgtTax = totalTax - taxWithoutCGT;

        // Calculate marginal rate
        const marginalRate = this.calculateMarginalTaxRate(taxableIncome);

        return {
            capitalGain: Math.round(capitalGain),
            discountApplied: eligibleForDiscount,
            discountedGain: Math.round(discountedGain),
            otherIncome: Math.round(otherIncome),
            taxableIncome: Math.round(taxableIncome),
            cgtTax: Math.round(cgtTax),
            effectiveCGTRate: ((cgtTax / capitalGain) * 100).toFixed(2),
            marginalTaxRate: (marginalRate * 100).toFixed(1),
            netProceeds: Math.round(capitalGain - cgtTax)
        };
    }

    /**
     * Optimize timing of property sale
     */
    optimizeTiming(propertyDetails, personalDetails, inputs) {
        const scenarios = this.calculateCGTScenarios(propertyDetails, personalDetails, inputs);

        // Calculate holding costs
        const annualNetCost = propertyDetails.annualExpenses - propertyDetails.annualRent;
        const totalHoldingCosts = annualNetCost * personalDetails.yearsToRetirement;

        // Compare scenarios
        const sellNowTax = scenarios.sellNow.cgtTax;
        const sellRetirementTax = scenarios.sellInRetirement.cgtTax;
        const taxSaving = sellNowTax - sellRetirementTax;

        // Calculate net benefit considering holding costs and capital growth
        const capitalGrowth = scenarios.sellInRetirement.futureValue - propertyDetails.currentValue;
        const netBenefit = taxSaving + capitalGrowth - totalHoldingCosts - sellRetirementTax + sellNowTax;

        let recommendation = '';
        let confidence = '';

        if (netBenefit > 50000 && personalDetails.yearsToRetirement <= 10) {
            recommendation = 'STRONG_HOLD';
            confidence = 'HIGH';
        } else if (netBenefit > 20000 && personalDetails.yearsToRetirement <= 5) {
            recommendation = 'CONSIDER_HOLD';
            confidence = 'MEDIUM';
        } else if (netBenefit < -20000) {
            recommendation = 'CONSIDER_SELL';
            confidence = 'MEDIUM';
        } else {
            recommendation = 'NEUTRAL';
            confidence = 'LOW';
        }

        return {
            analysis: {
                sellNowCGT: Math.round(sellNowTax),
                sellRetirementCGT: Math.round(sellRetirementTax),
                cgtSaving: Math.round(taxSaving),
                holdingCostsPerYear: Math.round(annualNetCost),
                totalHoldingCosts: Math.round(totalHoldingCosts),
                capitalGrowth: Math.round(capitalGrowth),
                netBenefit: Math.round(netBenefit)
            },
            recommendation: recommendation,
            confidence: confidence,
            reasoning: this.generateTimingReasoning(recommendation, netBenefit, personalDetails.yearsToRetirement),
            alternativeStrategies: this.getAlternativeStrategies(propertyDetails, personalDetails)
        };
    }

    generateTimingReasoning(recommendation, netBenefit, yearsToRetirement) {
        switch (recommendation) {
            case 'STRONG_HOLD':
                return `Strong case for holding until retirement. Net benefit of $${Math.abs(Math.round(netBenefit)).toLocaleString()} from lower CGT, capital growth, and rental income outweighs holding costs over ${yearsToRetirement} years.`;

            case 'CONSIDER_HOLD':
                return `Moderate benefit ($${Math.abs(Math.round(netBenefit)).toLocaleString()}) from holding. Consider cash flow needs, property market outlook, and diversification goals.`;

            case 'CONSIDER_SELL':
                return `Holding costs and lower expected growth suggest selling may be favorable. Net cost of $${Math.abs(Math.round(netBenefit)).toLocaleString()} to hold. Consider diversifying into other assets.`;

            case 'NEUTRAL':
                return `Timing is relatively neutral from a tax perspective. Decision should be based on other factors: cash flow needs, property market outlook, diversification, and Age Pension implications.`;

            default:
                return 'Timing analysis inconclusive.';
        }
    }

    /**
     * Analyze main residence exemption strategies
     */
    analyzeMainResidenceStrategies(propertyDetails, personalDetails, inputs) {
        const homeValue = inputs.homeValue || 0;
        const wasMainResidence = false; // Would need additional input

        if (!wasMainResidence) {
            return {
                applicable: false,
                message: 'Property was not a main residence - full CGT applies',
                strategies: [
                    {
                        strategy: '6-Year Rule',
                        description: 'If you previously lived in the property, you may be able to treat it as your main residence for up to 6 years while renting it out',
                        eligible: 'Requires prior main residence occupation',
                        benefit: 'Potential CGT exemption for up to 6 years of ownership',
                        action: 'Consult tax adviser if property was ever your main residence'
                    },
                    {
                        strategy: 'Partial Exemption',
                        description: 'If property was main residence for part of ownership period, partial CGT exemption may apply',
                        eligible: 'Must have lived in property as main residence',
                        calculation: 'Exemption = (Days as main residence / Total days owned) × Capital gain',
                        action: 'Calculate exemption period with tax adviser'
                    }
                ]
            };
        }

        // If was main residence, provide detailed 6-year rule analysis
        return {
            applicable: true,
            sixYearRule: {
                description: 'Property can be treated as main residence for up to 6 years while rented out',
                requirements: [
                    'Property was your main residence at some point',
                    'You moved out and started renting it',
                    'You don\'t treat another property as main residence for the same period',
                    'Maximum 6 year absence period'
                ],
                benefit: 'Full CGT exemption for up to 6 years',
                example: {
                    scenario: 'Lived in property 2 years, rented 6 years, then sold',
                    result: 'Full CGT exemption (within 6-year rule)',
                    saving: 'Save entire CGT bill'
                }
            },
            partialExemption: {
                description: 'Pro-rata exemption based on period as main residence',
                formula: '(Days as main residence / Total ownership days) × Capital gain = Exempt amount',
                nonExemptPortion: 'Remaining portion subject to CGT with 50% discount if held > 12 months'
            },
            recommendation: 'Consult tax adviser to maximize main residence exemption'
        };
    }

    /**
     * Get alternative CGT strategies
     */
    getAlternativeStrategies(propertyDetails, personalDetails) {
        const strategies = [];

        // Strategy 1: Sell in low-income year
        strategies.push({
            strategy: 'Sell in Low-Income Year',
            description: 'Time sale for year with lowest income (sabbatical, between jobs, redundancy)',
            potentialSaving: 'Up to 20-30% in CGT',
            complexity: 'LOW',
            suitability: personalDetails.yearsToRetirement > 1 ? 'MODERATE' : 'LOW'
        });

        // Strategy 2: Staged sale
        strategies.push({
            strategy: 'Staged Sale (if multiple properties)',
            description: 'Sell properties across multiple tax years to avoid stacking capital gains',
            potentialSaving: 'Prevent pushing into higher tax brackets',
            complexity: 'MEDIUM',
            suitability: 'Only if own multiple investment properties'
        });

        // Strategy 3: Granny flat arrangement
        strategies.push({
            strategy: 'Granny Flat Arrangement',
            description: 'Gift property to relative with granny flat arrangement may provide CGT rollover relief',
            potentialSaving: 'CGT rollover + Age Pension benefits',
            complexity: 'HIGH',
            suitability: personalDetails.age >= 60 ? 'MODERATE' : 'LOW',
            warning: 'Complex tax and legal implications - requires professional advice'
        });

        // Strategy 4: Property in SMSF
        if (personalDetails.superBalance > 200000) {
            strategies.push({
                strategy: 'Transfer to SMSF (if eligible)',
                description: 'Transfer property to Self-Managed Super Fund',
                potentialSaving: 'Tax at 15% (or 10% if in pension phase) vs personal marginal rate',
                complexity: 'VERY HIGH',
                suitability: propertyDetails.currentValue < 500000 ? 'MODERATE' : 'LOW',
                requirements: [
                    'Property must be business real property or acquired at market value',
                    'Strict compliance requirements',
                    'Requires SMSF setup and management'
                ],
                warning: 'Very complex - requires specialist SMSF and tax advice'
            });
        }

        return strategies;
    }

    /**
     * Generate actionable recommendations
     */
    generateRecommendations(propertyDetails, personalDetails, inputs) {
        const timing = this.optimizeTiming(propertyDetails, personalDetails, inputs);
        const recommendations = [];

        // Primary recommendation based on timing analysis
        if (timing.recommendation === 'STRONG_HOLD') {
            recommendations.push({
                priority: 'HIGH',
                category: 'TIMING',
                action: `Hold property until retirement (${personalDetails.yearsToRetirement} years)`,
                benefit: `Save $${Math.round(timing.analysis.cgtSaving).toLocaleString()} in CGT + benefit from capital growth`,
                timeframe: `${personalDetails.yearsToRetirement} years`,
                steps: [
                    'Continue holding property',
                    'Monitor rental income and expenses',
                    'Review strategy annually',
                    `Plan sale for early in retirement year (${personalDetails.retirementAge})`
                ]
            });
        } else if (timing.recommendation === 'CONSIDER_SELL') {
            recommendations.push({
                priority: 'MEDIUM',
                category: 'TIMING',
                action: 'Consider selling now or within 1-2 years',
                benefit: 'Avoid holding costs and free up capital for diversification',
                timeframe: '0-2 years',
                steps: [
                    'Get updated property valuation',
                    'Calculate exact CGT with accountant',
                    'Consider market conditions',
                    'Plan reinvestment strategy'
                ]
            });
        }

        // Tax planning recommendations
        recommendations.push({
            priority: 'MEDIUM',
            category: 'TAX_PLANNING',
            action: 'Optimize sale timing within chosen year',
            benefit: 'Minimize CGT through income timing',
            timeframe: 'When selling',
            steps: [
                'If possible, sell early in financial year',
                'Defer other income to next FY if possible',
                'Maximize super contributions in sale year',
                'Consider timing of other capital gains/losses'
            ]
        });

        // Record keeping
        recommendations.push({
            priority: 'HIGH',
            category: 'RECORD_KEEPING',
            action: 'Maintain comprehensive records',
            benefit: 'Maximize deductions and prove cost base',
            timeframe: 'Ongoing',
            steps: [
                'Keep all purchase documents (contract, stamp duty, legal fees)',
                'Keep records of capital improvements (not repairs)',
                'Keep depreciation schedules',
                'Document all selling costs (agent fees, legal, marketing)',
                'Calculate cost base with accountant before sale'
            ]
        });

        // Professional advice
        recommendations.push({
            priority: 'HIGH',
            category: 'PROFESSIONAL_ADVICE',
            action: 'Consult tax specialist before selling',
            benefit: 'Ensure optimal structure and compliance',
            timeframe: '6-12 months before planned sale',
            steps: [
                'Engage tax accountant or adviser',
                'Review all CGT implications',
                'Explore alternative strategies',
                'Model different sale timing scenarios',
                'Prepare tax return documentation'
            ]
        });

        return {
            summary: this.generateRecommendationSummary(timing, propertyDetails, personalDetails),
            recommendations: recommendations,
            keyDecisions: this.getKeyDecisions(timing, propertyDetails, personalDetails)
        };
    }

    generateRecommendationSummary(timing, propertyDetails, personalDetails) {
        const netBenefit = timing.analysis.netBenefit;

        if (netBenefit > 50000) {
            return `Strong financial case for holding property until retirement. Expected net benefit of $${Math.round(Math.abs(netBenefit)).toLocaleString()} from CGT savings and capital growth over ${personalDetails.yearsToRetirement} years.`;
        } else if (netBenefit > 0) {
            return `Moderate benefit from holding. Consider your overall financial situation, cash flow needs, and investment diversification goals.`;
        } else {
            return `Holding costs and market factors suggest reviewing sale options. Consider diversifying into other investments for better overall returns.`;
        }
    }

    getKeyDecisions(timing, propertyDetails, personalDetails) {
        return [
            {
                decision: 'Timing of Sale',
                options: ['Sell now', 'Hold to retirement', 'Sell in 1-2 years'],
                recommended: timing.recommendation === 'STRONG_HOLD' ? 'Hold to retirement' :
                    timing.recommendation === 'CONSIDER_SELL' ? 'Sell now' : 'Review annually',
                factors: ['CGT rate', 'Property market', 'Cash flow needs', 'Diversification']
            },
            {
                decision: 'Use of Proceeds',
                options: ['Super contribution', 'Debt reduction', 'Diversify investments', 'Lifestyle spending'],
                recommended: personalDetails.yearsToRetirement > 5 ? 'Super contribution' : 'Diversify investments',
                factors: ['Age', 'Super balance', 'Income needs', 'Tax position']
            },
            {
                decision: 'Reinvestment Strategy',
                options: ['Australian shares', 'International shares', 'Bonds', 'Super', 'Mix'],
                recommended: 'Diversified portfolio based on risk profile',
                factors: ['Time horizon', 'Risk tolerance', 'Income needs', 'Tax efficiency']
            }
        ];
    }

    // ===== HELPER METHODS =====

    calculateIncomeTax(income) {
        if (income <= 18200) {
            return income * this.MEDICARE_LEVY;
        }

        let tax = 0;

        if (income <= 45000) {
            tax = (income - 18200) * 0.19;
        } else if (income <= 135000) {
            tax = 5092 + (income - 45000) * 0.325;
        } else if (income <= 190000) {
            tax = 34342 + (income - 135000) * 0.37;
        } else {
            tax = 54692 + (income - 190000) * 0.45;
        }

        tax += income * this.MEDICARE_LEVY;

        return tax;
    }

    calculateMarginalTaxRate(income) {
        if (income <= 18200) return this.MEDICARE_LEVY;
        if (income <= 45000) return 0.19 + this.MEDICARE_LEVY;
        if (income <= 135000) return 0.325 + this.MEDICARE_LEVY;
        if (income <= 190000) return 0.37 + this.MEDICARE_LEVY;
        return 0.45 + this.MEDICARE_LEVY;
    }
}
