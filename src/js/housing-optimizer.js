/**
 * Housing Strategy Optimizer
 * Analyzes downsizing, reverse mortgages, aged care accommodation, and granny flat arrangements
 * For Australian retirees aged 40-65 making critical housing decisions
 */

import ENHANCED_CONFIG from './config.js';

export class HousingOptimizer {
    constructor(personalDetails, financialData) {
        this.person = personalDetails;
        this.finances = financialData;

        // Current MPIR rate (Maximum Permissible Interest Rate) for aged care
        this.MPIR = 0.0761; // October 2025 rate from config

        // Configuration from ENHANCED_CONFIG
        this.config = ENHANCED_CONFIG.financials || {};
    }

    /**
     * Generate all housing strategies
     * @returns {Object} All strategy analyses
     */
    generateHousingStrategies() {
        return {
            downsizing: this.analyzeDownsizing(),
            reverseMortgage: this.analyzeReverseMortgage(),
            agedCareAccommodation: this.analyzeRADvsDAP(),
            grannyFlat: this.analyzeGrannyFlat()
        };
    }

    /**
     * Analyze downsizing scenarios
     * Compare selling current home and buying smaller, with 3 allocation options
     * @returns {Object} Downsizing analysis
     */
    analyzeDownsizing() {
        const currentHome = this.finances.homeValue || 0;

        if (currentHome === 0) {
            return {
                applicable: false,
                reason: 'No home ownership to downsize from'
            };
        }

        // Typical downsizing assumptions
        const smallerHomePercent = 0.65; // Buy home worth 65% of current value
        const rawTransactionCostRate = Number.isFinite(this.finances.downsizeTransactionCost)
            ? Math.max(0, this.finances.downsizeTransactionCost)
            : 0.05;
        const transactionCosts = rawTransactionCostRate > 1
            ? rawTransactionCostRate / 100
            : rawTransactionCostRate;

        const smallerHome = currentHome * smallerHomePercent;
        const totalCosts = currentHome * transactionCosts;
        const netProceeds = currentHome - smallerHome - totalCosts;

        // Downsizer contribution limits
        const downsizerLimit = this.person.partnered ? 600000 : 300000;

        // Three allocation options
        const options = [];

        // Option 1: Max to Super (Downsizer Contribution)
        const toSuper = Math.min(netProceeds * 0.95, downsizerLimit); // Use 95% of proceeds, up to limit
        const remainingOption1 = netProceeds - toSuper;

        options.push({
            name: 'Max to Super',
            allocation: {
                super: toSuper,
                investments: remainingOption1,
                cash: 0
            },
            outcome: this.projectDownsizingOutcome(toSuper, remainingOption1, 0),
            description: 'Maximize downsizer contribution to super'
        });

        // Option 2: Balanced (60% super, 40% investments)
        const toSuperBalanced = Math.min(netProceeds * 0.60, downsizerLimit);
        const toInvestmentsBalanced = netProceeds - toSuperBalanced;

        options.push({
            name: 'Balanced',
            allocation: {
                super: toSuperBalanced,
                investments: toInvestmentsBalanced,
                cash: 0
            },
            outcome: this.projectDownsizingOutcome(toSuperBalanced, toInvestmentsBalanced, 0),
            description: '60% super, 40% investments for diversification'
        });

        // Option 3: All Investments (outside super)
        options.push({
            name: 'All Investments',
            allocation: {
                super: 0,
                investments: netProceeds,
                cash: 0
            },
            outcome: this.projectDownsizingOutcome(0, netProceeds, 0),
            description: 'Keep all outside super for flexibility'
        });

        // Determine best option (highest 20-year outcome)
        const bestOption = options.reduce((best, current) =>
            current.outcome.wealth20Years > best.outcome.wealth20Years ? current : best
        );

        // Calculate Age Pension impact
        const pensionImpact = this.calculatePensionImpact(netProceeds);

        return {
            applicable: true,
            currentHome,
            smallerHome,
            transactionCosts: totalCosts,
            netProceeds: Math.round(netProceeds),
            downsizerLimit,
            options,
            recommendation: {
                best: bestOption.name,
                reasoning: this.getDownsizingReasoning(bestOption, options, pensionImpact)
            },
            pensionImpact
        };
    }

    /**
     * Project 20-year outcome for downsizing allocation
     */
    projectDownsizingOutcome(toSuper, toInvestments, toCash) {
        const years = 20;
        const superGrowth = 0.07; // 7% p.a. in super
        const investmentGrowth = 0.065; // 6.5% p.a. in investments
        const cashGrowth = 0.025; // 2.5% p.a. in cash

        const superFuture = toSuper * Math.pow(1 + superGrowth, years);
        const investmentsFuture = toInvestments * Math.pow(1 + investmentGrowth, years);
        const cashFuture = toCash * Math.pow(1 + cashGrowth, years);

        const wealth20Years = superFuture + investmentsFuture + cashFuture;

        return {
            wealth20Years,
            superFuture,
            investmentsFuture,
            cashFuture,
            totalGrowth: wealth20Years - (toSuper + toInvestments + toCash)
        };
    }

    /**
     * Get reasoning for best downsizing option
     */
    getDownsizingReasoning(bestOption, allOptions, pensionImpact) {
        const reasons = [];

        reasons.push(`Highest 20-year outcome: $${(bestOption.outcome.wealth20Years / 1000).toFixed(0)}k`);

        if (bestOption.name === 'Max to Super') {
            reasons.push('Tax advantages of super (15% vs marginal rate)');
            reasons.push('Age 60+ super withdrawals tax-free');
            if (pensionImpact.annualReduction > 0) {
                reasons.push(`Note: Age Pension reduced by $${pensionImpact.annualReduction.toLocaleString()}/year`);
            }
        } else if (bestOption.name === 'All Investments') {
            reasons.push('Maximum flexibility - accessible any time');
            reasons.push('May suit if planning large expenses');
        } else {
            reasons.push('Balanced approach - tax benefits + flexibility');
        }

        return reasons.join('. ');
    }

    /**
     * Calculate Age Pension impact of downsizing
     */
    calculatePensionImpact(netProceeds) {
        // Before: Home exempt from assets test
        // After: Proceeds become assessable assets

        // Simplified calculation: $3 per fortnight per $1,000 excess assets
        const taperRate = 3; // $ per fortnight per $1,000
        const fortnightsPerYear = 26;

        const annualReduction = (netProceeds / 1000) * taperRate * fortnightsPerYear;

        return {
            before: 'Home value exempt from assets test',
            after: `$${(netProceeds / 1000).toFixed(0)}k now assessable`,
            annualReduction: Math.round(annualReduction),
            note: 'Based on assets test taper rate'
        };
    }

    /**
     * Analyze Reverse Mortgage and HEAS options
     * @returns {Object} Reverse mortgage analysis
     */
    analyzeReverseMortgage() {
        const homeValue = this.finances.homeValue || 0;
        const age = this.person.age || 65;

        if (homeValue === 0) {
            return {
                applicable: false,
                reason: 'No home ownership for reverse mortgage'
            };
        }

        if (age < 60) {
            return {
                applicable: false,
                reason: 'Reverse mortgages typically available from age 60+'
            };
        }

        // Conservative starting loan amount (20% of home value)
        const typicalLoan = homeValue * 0.20;

        // Scenarios: Commercial vs Government HEAS
        const scenarios = [
            {
                name: 'Commercial Reverse Mortgage',
                rate: 0.065, // 6.5% typical commercial rate
                loan: typicalLoan
            },
            {
                name: 'Government HEAS (Home Equity Access Scheme)',
                rate: 0.0485, // 4.85% current government rate
                loan: typicalLoan
            }
        ];

        // Project debt and equity over time
        const projections = scenarios.map(s => {
            const timeline = [5, 10, 15, 20].map(years => {
                const debt = s.loan * Math.pow(1 + s.rate, years);
                const assumedHomeValue = homeValue * Math.pow(1.03, years); // 3% property growth
                const equity = assumedHomeValue - debt;
                const equityPercent = (equity / assumedHomeValue * 100);

                return {
                    years,
                    age: age + years,
                    debt: Math.round(debt),
                    homeValue: Math.round(assumedHomeValue),
                    equity: Math.round(equity),
                    equityPercent: equityPercent.toFixed(1)
                };
            });

            return {
                name: s.name,
                rate: (s.rate * 100).toFixed(2) + '%',
                initialLoan: s.loan,
                timeline
            };
        });

        // Calculate downsizing alternative
        const downsizeAnalysis = this.analyzeDownsizing();
        const downsizeOption = downsizeAnalysis.applicable ? {
            netProceeds: downsizeAnalysis.netProceeds,
            note: 'Immediate funds, no debt'
        } : null;

        return {
            applicable: true,
            homeValue,
            age,
            loanAmount: typicalLoan,
            scenarios: projections,
            warnings: [
                'Debt compounds rapidly - equity erodes quickly',
                `At 6.5%, debt doubles every ${(Math.log(2) / Math.log(1.065)).toFixed(1)} years`,
                'Must maintain property and pay rates/insurance',
                'Estate receives remaining equity only'
            ],
            alternative: downsizeOption,
            recommendation: this.getReverseMortgageRecommendation(projections, downsizeOption)
        };
    }

    /**
     * Get recommendation for reverse mortgage
     */
    getReverseMortgageRecommendation(projections, downsizeOption) {
        const commercialDebt15Years = projections[0].timeline.find(t => t.years === 15).debt;
        const HEASDebt15Years = projections[1].timeline.find(t => t.years === 15).debt;

        const savings = commercialDebt15Years - HEASDebt15Years;

        const recommendations = [];

        recommendations.push(`Government HEAS saves $${(savings / 1000).toFixed(0)}k in debt over 15 years vs commercial`);

        if (downsizeOption) {
            recommendations.push(`Alternative: Downsizing frees up $${(downsizeOption.netProceeds / 1000).toFixed(0)}k immediately with no debt`);
        }

        recommendations.push('Consider: Equity release should be last resort after downsizing and super drawdown');

        return recommendations.join('. ');
    }

    /**
     * Analyze RAD vs DAP for aged care accommodation
     * @returns {Object} RAD vs DAP analysis
     */
    analyzeRADvsDAP() {
        // Typical RAD amounts
        const typicalRAD = 500000; // Median Australia-wide
        const MPIR = this.MPIR; // Current Maximum Permissible Interest Rate

        // Calculate DAP
        const dailyDAP = (typicalRAD * MPIR) / 365;
        const annualDAP = dailyDAP * 365;

        // Investment return assumption
        const investmentReturn = 0.065; // 6.5% expected return
        const afterTaxReturn = investmentReturn * 0.85; // Assume 15% tax drag

        // Break-even analysis
        const breakEvenYears = typicalRAD / annualDAP;

        // Strategy recommendation
        const strategy = afterTaxReturn > MPIR ? {
            recommendation: 'Pay Full DAP',
            reasoning: `Investment return (${(afterTaxReturn * 100).toFixed(1)}%) exceeds MPIR (${(MPIR * 100).toFixed(2)}%)`,
            benefit: 'Preserve capital, earn higher return'
        } : {
            recommendation: 'Pay Full RAD',
            reasoning: `MPIR (${(MPIR * 100).toFixed(2)}%) exceeds investment return (${(afterTaxReturn * 100).toFixed(1)}%)`,
            benefit: 'Lower effective cost, RAD refunded to estate'
        };

        // Alternative: Combination payment
        const combinationOptions = [
            { radPercent: 75, dapPercent: 25 },
            { radPercent: 50, dapPercent: 50 },
            { radPercent: 25, dapPercent: 75 }
        ];

        return {
            applicable: true,
            analysis: {
                typicalRAD,
                dailyDAP: Math.round(dailyDAP),
                annualDAP: Math.round(annualDAP),
                currentMPIR: (MPIR * 100).toFixed(2) + '%',
                breakEvenYears: breakEvenYears.toFixed(1)
            },
            strategy,
            considerations: [
                'RAD refunded to estate on exit (or death)',
                'DAP preserves liquidity for other expenses',
                'Average aged care stay: 2.5 years',
                'Combination payment option available (part RAD, part DAP)',
                'Must have funds assessed for means test regardless'
            ],
            combinationOptions,
            note: 'MPIR updated quarterly - check current rate before deciding'
        };
    }

    /**
     * Analyze Granny Flat Arrangement
     * @returns {Object} Granny flat analysis
     */
    analyzeGrannyFlat() {
        const homeValue = this.finances.homeValue || 0;

        if (homeValue === 0) {
            return {
                applicable: false,
                reason: 'No home ownership for granny flat arrangement'
            };
        }

        // Typical arrangement: transfer 30% of home value for lifetime residence
        const typicalTransfer = homeValue * 0.30;

        return {
            applicable: true,
            concept: 'Transfer assets (or property interest) to family member for lifetime residence rights',
            typicalArrangement: {
                homeValue,
                assetTransfer: Math.round(typicalTransfer),
                transferPercent: '30%',
                note: 'Amounts vary significantly - must be arms-length transaction'
            },
            benefits: [
                'Transfers wealth during lifetime',
                'May reduce aged care fees (after 5 years)',
                'Housing security with family',
                'Can be CGT-exempt if structured properly',
                'Maintains family connection and support'
            ],
            risks: [
                '⚠️ CRITICAL: 5-year lookback for Age Pension (treated as gift)',
                '⚠️ Loss of control over asset',
                '⚠️ Relationship breakdown risk (divorce, disputes)',
                '⚠️ Bankruptcy risk of family member',
                '⚠️ Must be genuine arms-length transaction',
                '⚠️ Legal costs to structure properly ($3,000-$10,000)'
            ],
            agePensionTreatment: {
                within5Years: {
                    status: 'Treated as deprived asset',
                    impact: 'Gifting rules apply - reduces Age Pension entitlement',
                    calculation: 'Value assessed as if you still own it'
                },
                after5Years: {
                    status: 'Exempt from Age Pension asset test',
                    impact: 'No impact on Age Pension (if genuine arrangement)',
                    benefit: 'Can increase Age Pension entitlement'
                }
            },
            legalRequirements: [
                'Formal written agreement (granny flat agreement)',
                'Independent legal advice for both parties',
                'Valuation must be reasonable (arms-length)',
                'Registration on property title may be required',
                'Must have genuine intention of lifetime occupancy'
            ],
            recommendation: {
                priority: 'HIGH_CAUTION',
                action: '⚠️ COMPLEX - Requires specialist legal and financial advice',
                steps: [
                    '1. Consult elder law specialist lawyer',
                    '2. Obtain independent financial advice',
                    '3. Get formal valuation of arrangement',
                    '4. Consider family dynamics and relationship risks',
                    '5. Ensure all parties understand obligations'
                ],
                warning: 'DO NOT proceed without professional advice - significant financial and legal risks'
            }
        };
    }
}

export default HousingOptimizer;
