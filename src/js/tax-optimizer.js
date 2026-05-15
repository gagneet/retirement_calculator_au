// tax-optimizer.js - Comprehensive Tax Optimization Engine for Australian Retirement Planning
// Covers contribution optimization, Division 293, splitting, franking credits, CGT, and downsizer strategies

import { formatCurrency, formatPercent } from './utils.js';

export class TaxOptimizer {
    constructor(config) {
        this.config = config;
        this.currentYear = new Date().getFullYear();

        // Australian tax constants — use indexed config values where available
        this.CONCESSIONAL_CAP = 30000;
        this.NON_CONCESSIONAL_CAP = 120000;
        this.NON_CONCESSIONAL_CAP_3YEAR = 360000;
        this.DIVISION_293_THRESHOLD = 250000;
        this.TOTAL_SUPER_BALANCE_THRESHOLD = 500000; // For carry-forward
        // Transfer Balance Cap: $2.0M (FY2025-26); $2.1M from 1 Jul 2026 (FY2026-27)
        this.TRANSFER_BALANCE_CAP = (config && config.TRANSFER_BALANCE_CAP_FY2027) || 2100000;
        this.DOWNSIZER_CONTRIBUTION = 300000;
        this.DOWNSIZER_MIN_AGE = 55;
        this.SUPER_TAX_RATE = 0.15;
        this.DIVISION_293_RATE = 0.15; // Additional tax
        this.CORPORATE_TAX_RATE = 0.30;
        this.CGT_DISCOUNT = 0.50;
        this.MEDICARE_LEVY = 0.02;
    }

    /**
     * Generate comprehensive tax optimization recommendations
     * @param {Object} inputs - User input data
     * @param {Object} currentResults - Current calculation results
     * @returns {Object} Tax optimization strategies
     */
    generateRecommendations(inputs, currentResults = null) {
        const personalDetails = this.extractPersonalDetails(inputs);
        const financialData = this.extractFinancialData(inputs);

        return {
            contributionStrategy: this.optimizeContributions(personalDetails, financialData),
            division293Alert: this.checkDivision293(personalDetails, financialData),
            splittingStrategy: this.calculateSplitting(personalDetails, financialData),
            recontributionPlan: this.planRecontribution(personalDetails, financialData),
            frankingBenefit: this.estimateFrankingCredits(personalDetails, financialData),
            cgtOptimization: this.optimizeCGT(personalDetails, financialData, inputs),
            downsizerOpportunity: this.assessDownsizer(personalDetails, financialData),
            carryForward: this.calculateCarryForward(personalDetails, financialData),
            multiYearPlan: this.generateMultiYearPlan(personalDetails, financialData)
        };
    }

    /**
     * Extract personal details from inputs
     */
    extractPersonalDetails(inputs) {
        return {
            age: inputs.yourCurrentAge || 40,
            partnerAge: inputs.partnerCurrentAge || 40,
            retirementAge: inputs.retirementAge || 67,
            partnerRetirementAge: inputs.partnerRetirementAge || 67,
            partnered: inputs.partnerSalary > 0 || inputs.partnerCurrentSuper > 0,
            lifespan: inputs.yourLifespan || 90
        };
    }

    /**
     * Extract financial data from inputs
     */
    extractFinancialData(inputs) {
        return {
            salary: inputs.yourSalary || 0,
            partnerSalary: inputs.partnerSalary || 0,
            superBalance: inputs.yourCurrentSuper || 0,
            partnerSuperBalance: inputs.partnerCurrentSuper || 0,
            currentSavings: inputs.currentSavings || 0,
            currentStocks: inputs.currentStocks || 0,
            voluntaryContributions: inputs.monthlyStockContribution * 12 || 0,
            investmentIncome: (inputs.currentStocks * inputs.dividendYield / 100) || 0,
            investmentProperty: inputs.hasInvestmentProperty ? {
                value: inputs.investmentPropertyValue || 0,
                purchasePrice: inputs.investmentPropertyValue * 0.6, // Estimate
                loan: inputs.investmentPropertyLoan || 0,
                rentalIncome: (inputs.weeklyRentalIncome || 0) * 52,
                expenses: inputs.annualPropertyExpenses || 0
            } : null,
            homeValue: inputs.homeValue || 0,
            mortgage: inputs.mortgageBalance || 0,
            // BUG FIX 1H: australianEquityAllocation is already a decimal from collectInputs().
            // Dividing by 100 again produced a value 100× too small.  Normalise defensively.
            australianEquities: (inputs.australianEquityAllocation > 1
                ? inputs.australianEquityAllocation / 100
                : inputs.australianEquityAllocation) || 0.40
        };
    }

    /**
     * Optimize contribution strategy
     * @returns {Object} Recommended contributions with tax savings
     */
    optimizeContributions(personalDetails, financialData) {
        const salary = financialData.salary || 0;
        const currentSuper = financialData.superBalance || 0;
        const age = personalDetails.age;

        // Calculate marginal tax rate
        const marginalRate = this.calculateMarginalTaxRate(salary);

        // Current employer SG (12%)
        const sgContribution = salary * (this.config.SUPER_GUARANTEE_RATE || 0.12);

        // Available concessional cap space
        const availableCap = this.CONCESSIONAL_CAP - sgContribution;

        // Calculate optimal salary sacrifice
        const taxBenefit = marginalRate - this.SUPER_TAX_RATE;

        let recommendedSalarySacrifice = 0;
        let reasoning = '';

        if (taxBenefit > 0.15) { // At least 15% tax saving (30%+ marginal rate)
            recommendedSalarySacrifice = Math.min(
                availableCap,
                salary * 0.15, // Cap at 15% of salary (reasonable limit)
                50000 // Absolute maximum for recommendation
            );
            reasoning = `Your marginal tax rate (${(marginalRate * 100).toFixed(0)}%) is significantly higher than the super tax rate (15%). Maximizing contributions provides substantial tax savings.`;
        } else if (taxBenefit > 0) {
            recommendedSalarySacrifice = Math.min(
                availableCap,
                salary * 0.10
            );
            reasoning = `Moderate tax benefit at your marginal rate (${(marginalRate * 100).toFixed(0)}%). Recommended contribution balances tax savings with cash flow.`;
        } else {
            reasoning = `Your marginal tax rate (${(marginalRate * 100).toFixed(0)}%) provides minimal benefit over super tax rate (15%). Consider non-concessional contributions instead.`;
        }

        // Calculate annual tax saving
        const annualTaxSaving = recommendedSalarySacrifice * taxBenefit;

        // Calculate super balance impact at retirement
        const yearsToRetirement = personalDetails.retirementAge - age;
        const futureValue = this.calculateFutureValue(
            recommendedSalarySacrifice,
            yearsToRetirement,
            0.07
        );

        // Calculate take-home pay impact
        const takeHomeReduction = recommendedSalarySacrifice * (1 - marginalRate);

        return {
            currentSalary: salary,
            marginalTaxRate: marginalRate,
            employerSG: sgContribution,
            concessionalCap: this.CONCESSIONAL_CAP,
            availableCapSpace: availableCap,
            recommended: {
                salarySacrifice: Math.round(recommendedSalarySacrifice),
                monthlySacrifice: Math.round(recommendedSalarySacrifice / 12),
                frequency: 'annually',
                annualTaxSaving: Math.round(annualTaxSaving),
                takeHomeReduction: Math.round(takeHomeReduction),
                netBenefit: Math.round(annualTaxSaving),
                retirementBenefit: Math.round(futureValue),
                reasoning: reasoning
            },
            action: recommendedSalarySacrifice > 0
                ? `Salary sacrifice $${Math.round(recommendedSalarySacrifice).toLocaleString()} this year to save $${Math.round(annualTaxSaving).toLocaleString()} in tax`
                : 'No salary sacrifice recommended at current income level',
            warnings: this.getContributionWarnings(personalDetails, financialData, recommendedSalarySacrifice),
            confidence: 'HIGH'
        };
    }

    /**
     * Get warnings for contribution strategies
     */
    getContributionWarnings(personalDetails, financialData, contribution) {
        const warnings = [];
        const totalIncome = financialData.salary + financialData.investmentIncome;
        const totalContributions = financialData.salary * 0.12 + contribution;

        // Check Division 293
        if (totalIncome + totalContributions > this.DIVISION_293_THRESHOLD - 20000) {
            warnings.push('⚠️ Contribution may trigger or approach Division 293 threshold ($250,000)');
        }

        // Check Total Super Balance for carry-forward
        if (financialData.superBalance > this.TOTAL_SUPER_BALANCE_THRESHOLD) {
            warnings.push('ℹ️ Total Super Balance over $500,000 - carry-forward contributions not available');
        }

        // Check age-based access
        if (personalDetails.age < 60) {
            warnings.push('ℹ️ Contributions preserved until preservation age (minimum 60)');
        }

        return warnings;
    }

    /**
     * Check Division 293 tax threshold
     * @returns {Object} Division 293 alert if approaching/exceeding threshold
     */
    checkDivision293(personalDetails, financialData) {
        const salary = financialData.salary || 0;
        const employerContributions = salary * 0.12;
        const voluntaryContributions = financialData.voluntaryContributions || 0;
        const investmentIncome = financialData.investmentIncome || 0;

        // Calculate reportable super contributions
        const reportableSuperContributions = voluntaryContributions;

        const totalIncome = salary + investmentIncome;
        const combinedIncome = totalIncome + employerContributions + reportableSuperContributions;

        const threshold = this.DIVISION_293_THRESHOLD;
        const distanceFromThreshold = threshold - combinedIncome;

        if (combinedIncome > threshold) {
            const excess = combinedIncome - threshold;
            const totalContributions = employerContributions + voluntaryContributions;
            const additionalTax = Math.min(excess, totalContributions) * this.DIVISION_293_RATE;

            return {
                alert: 'TRIGGERED',
                severity: 'HIGH',
                message: `⚠️ Division 293 tax applies: Your income + contributions ($${Math.round(combinedIncome).toLocaleString()}) exceeds $250,000 threshold`,
                details: {
                    totalIncome: totalIncome,
                    employerContributions: employerContributions,
                    voluntaryContributions: voluntaryContributions,
                    combinedIncome: combinedIncome,
                    excess: excess,
                    additionalTax: Math.round(additionalTax),
                    effectiveSuperTaxRate: 0.30 // 15% standard + 15% Div 293
                },
                recommendations: [
                    excess < 30000 ? 'Consider reducing salary sacrifice to stay under threshold' : null,
                    'Excess contributions taxed at 30% total (15% standard + 15% Division 293)',
                    'ATO may offer to release funds to pay the tax',
                    'Consider spouse contributions or non-concessional contributions',
                    'Timing matters - spread large bonuses across financial years'
                ].filter(Boolean)
            };
        } else if (distanceFromThreshold < 50000) {
            return {
                alert: 'WARNING',
                severity: 'MEDIUM',
                message: `⚠️ Approaching Division 293 threshold: Only $${Math.round(distanceFromThreshold).toLocaleString()} buffer remaining`,
                details: {
                    combinedIncome: combinedIncome,
                    threshold: threshold,
                    buffer: distanceFromThreshold
                },
                recommendations: [
                    'Monitor income carefully',
                    'Large bonus or capital gain could trigger Division 293',
                    'Plan contribution timing strategically',
                    'Consider non-concessional contributions if threshold exceeded'
                ]
            };
        } else {
            return {
                alert: 'OK',
                severity: 'LOW',
                message: `✓ Well below Division 293 threshold ($${Math.round(distanceFromThreshold).toLocaleString()} buffer)`,
                details: {
                    combinedIncome: combinedIncome,
                    threshold: threshold,
                    buffer: distanceFromThreshold
                }
            };
        }
    }

    /**
     * Calculate optimal contribution splitting for couples
     * @returns {Object} Splitting strategy
     */
    calculateSplitting(personalDetails, financialData) {
        if (!personalDetails.partnered) {
            return {
                applicable: false,
                message: 'Contribution splitting only available for couples'
            };
        }

        const yourSuper = financialData.superBalance || 0;
        const partnerSuper = financialData.partnerSuperBalance || 0;
        const yourContributions = (financialData.salary || 0) * 0.12;

        // Can split up to 85% of concessional contributions
        const maxSplitAmount = yourContributions * 0.85;

        const difference = Math.abs(yourSuper - partnerSuper);
        const yearsToRetirement = personalDetails.retirementAge - personalDetails.age;

        if (difference < 50000) {
            return {
                applicable: true,
                recommended: false,
                message: 'Super balances are already relatively equal. Splitting not strongly recommended.',
                details: {
                    yourBalance: yourSuper,
                    partnerBalance: partnerSuper,
                    difference: difference
                }
            };
        }

        const recommendedSplit = Math.min(
            maxSplitAmount,
            difference / Math.max(yearsToRetirement, 5),
            yourContributions * 0.50
        );

        return {
            applicable: true,
            recommended: true,
            message: `Contribution splitting recommended to equalize super balances`,
            details: {
                yourBalance: yourSuper,
                partnerBalance: partnerSuper,
                difference: difference,
                maxSplittable: maxSplitAmount,
                recommendation: {
                    splitAmount: Math.round(recommendedSplit),
                    frequency: 'annually',
                    yearsToEqualize: Math.ceil(difference / recommendedSplit)
                },
                benefits: [
                    `Increases combined Transfer Balance Cap utilization`,
                    `Improves Age Pension eligibility through better balance spread`,
                    `Provides more flexibility if one spouse retires early`,
                    `Death benefit tax optimization for non-dependent beneficiaries`
                ]
            },
            action: `Split $${Math.round(recommendedSplit).toLocaleString()} of contributions to spouse annually`,
            confidence: 'HIGH'
        };
    }

    /**
     * Plan re-contribution strategy (convert taxable to tax-free)
     */
    planRecontribution(personalDetails, financialData) {
        const age = personalDetails.age;
        const superBalance = financialData.superBalance || 0;

        if (age < 60) {
            return {
                applicable: false,
                message: 'Re-contribution strategies available from age 60 when withdrawals are tax-free',
                yearsUntilEligible: 60 - age
            };
        }

        // Check Total Super Balance against $1.9M
        if (superBalance >= this.TRANSFER_BALANCE_CAP) {
            return {
                applicable: false,
                message: 'Total Super Balance at or above Transfer Balance Cap - non-concessional contributions not permitted',
                details: {
                    superBalance: superBalance,
                    transferBalanceCap: this.TRANSFER_BALANCE_CAP
                }
            };
        }

        // Estimate taxable component (typically 80-90% for most retirees)
        const estimatedTaxableComponent = superBalance * 0.85;
        const annualNCCap = this.NON_CONCESSIONAL_CAP;

        const yearsToConvert = Math.ceil(estimatedTaxableComponent / annualNCCap);
        const annualAmount = Math.min(annualNCCap, estimatedTaxableComponent / Math.min(yearsToConvert, 10));

        // Death benefit tax on taxable component to adult children: 17% (15% + 2% Medicare)
        const potentialTaxSaving = estimatedTaxableComponent * 0.17;

        return {
            applicable: true,
            recommended: estimatedTaxableComponent > 100000,
            strategy: {
                currentSuperBalance: Math.round(superBalance),
                estimatedTaxableComponent: Math.round(estimatedTaxableComponent),
                estimatedTaxFreeComponent: Math.round(superBalance - estimatedTaxableComponent),
                recommendedAnnualWithdrawal: Math.round(annualAmount),
                recommendedAnnualRecontribution: Math.round(annualAmount),
                yearsToComplete: Math.min(yearsToConvert, 10),
                totalTaxSaving: Math.round(potentialTaxSaving),
                nonConcessionalCap: annualNCCap
            },
            benefits: [
                `Saves $${Math.round(potentialTaxSaving).toLocaleString()} in death benefit tax for adult children`,
                `Converts taxable component to tax-free`,
                `No tax on withdrawals (age 60+ in pension phase)`,
                `No tax on re-contributions (within non-concessional cap)`
            ],
            process: [
                '1. Withdraw tax-free lump sum from super',
                '2. Immediately re-contribute as non-concessional contribution',
                `3. Repeat annually up to non-concessional cap ($${annualNCCap.toLocaleString()})`,
                `4. Track Total Super Balance (must be under $${(this.TRANSFER_BALANCE_CAP / 1000000).toFixed(1)}M for eligibility)`
            ],
            action: `Withdraw and re-contribute $${Math.round(annualAmount).toLocaleString()} annually starting now`,
            confidence: 'MEDIUM',
            warnings: [
                'Requires Total Super Balance under $1.9M',
                'Must be in pension phase or condition of release met',
                'Consult tax adviser for optimal timing'
            ]
        };
    }

    /**
     * Estimate franking credit benefit
     */
    estimateFrankingCredits(personalDetails, financialData) {
        const superBalance = financialData.superBalance || 0;
        const age = personalDetails.age;
        const inPensionPhase = age >= personalDetails.retirementAge;

        const australianEquityAllocation = financialData.australianEquities || 0.30;
        const australianEquityValue = superBalance * australianEquityAllocation;

        const dividendYield = 0.04;
        const frankingLevel = 0.70;

        const annualDividends = australianEquityValue * dividendYield;
        const frankedDividends = annualDividends * frankingLevel;

        // Franking credit = Dividend × (tax rate / (1 - tax rate))
        const frankingCredits = frankedDividends * (this.CORPORATE_TAX_RATE / (1 - this.CORPORATE_TAX_RATE));

        const refundable = inPensionPhase;
        const benefit = refundable ? frankingCredits : frankingCredits * 0.5;

        const returnBoost = superBalance > 0 ? (benefit / superBalance) * 100 : 0;

        return {
            applicable: australianEquityValue > 0,
            details: {
                superBalance: superBalance,
                australianEquityAllocation: Math.round(australianEquityAllocation * 100),
                australianEquityValue: Math.round(australianEquityValue),
                annualDividends: Math.round(annualDividends),
                frankedPortion: Math.round(frankedDividends),
                frankingCredits: Math.round(frankingCredits),
                refundable: refundable,
                annualBenefit: Math.round(benefit),
                returnBoost: returnBoost.toFixed(2)
            },
            recommendations: [
                australianEquityAllocation < 0.25
                    ? `Consider increasing Australian equity allocation to capture franking benefits (currently ${Math.round(australianEquityAllocation * 100)}%)`
                    : `Current allocation (${Math.round(australianEquityAllocation * 100)}%) provides good franking benefit`,
                !refundable
                    ? `Franking benefits significantly higher in pension phase (from age ${personalDetails.retirementAge})`
                    : 'Maximizing franking credit refunds in pension phase',
                'Franking credits provide ~1.2% annual return boost on Australian equities',
                'This advantage is unique to Australian investors'
            ].filter(Boolean),
            action: refundable
                ? `You're receiving ~$${Math.round(benefit).toLocaleString()}/year in refunded franking credits`
                : `Franking benefits will increase by ~$${Math.round((frankingCredits - benefit)).toLocaleString()}/year in pension phase`,
            confidence: 'HIGH'
        };
    }

    /**
     * Optimize CGT timing for property sales
     */
    optimizeCGT(personalDetails, financialData, inputs) {
        const investmentProperty = financialData.investmentProperty;

        if (!investmentProperty || !investmentProperty.value) {
            return {
                applicable: false,
                message: 'No investment property to optimize'
            };
        }

        const purchasePrice = investmentProperty.purchasePrice;
        const currentValue = investmentProperty.value;
        const capitalGain = currentValue - purchasePrice;
        const age = personalDetails.age;
        const retirementAge = personalDetails.retirementAge;

        // CGT calculation scenarios
        const scenarios = {
            sellNow: this.calculateCGT(capitalGain, financialData.salary),
            sellInRetirement: this.calculateCGT(capitalGain, 0)
        };

        const taxSaving = scenarios.sellNow.totalTax - scenarios.sellInRetirement.totalTax;
        const yearsToRetirement = retirementAge - age;

        // Calculate holding costs
        const annualHoldingCost = investmentProperty.expenses - investmentProperty.rentalIncome;
        const totalHoldingCosts = annualHoldingCost * yearsToRetirement;

        return {
            applicable: true,
            propertyDetails: {
                currentValue: currentValue,
                purchasePrice: purchasePrice,
                capitalGain: capitalGain,
                estimatedGrowth: currentValue * Math.pow(1.045, yearsToRetirement) // 4.5% growth
            },
            scenarios: {
                sellNow: {
                    cgtTax: Math.round(scenarios.sellNow.totalTax),
                    effectiveRate: (scenarios.sellNow.effectiveRate * 100).toFixed(1),
                    netProceeds: Math.round(currentValue - scenarios.sellNow.totalTax)
                },
                sellInRetirement: {
                    cgtTax: Math.round(scenarios.sellInRetirement.totalTax),
                    effectiveRate: (scenarios.sellInRetirement.effectiveRate * 100).toFixed(1),
                    netProceeds: Math.round(currentValue - scenarios.sellInRetirement.totalTax)
                }
            },
            analysis: {
                cgtTaxSaving: Math.round(taxSaving),
                holdingCosts: Math.round(totalHoldingCosts),
                netBenefit: Math.round(taxSaving - totalHoldingCosts),
                recommendation: taxSaving > 50000
                    ? 'WAIT - Significant tax saving by selling in retirement'
                    : taxSaving > 0
                        ? 'Consider waiting - Moderate tax benefit'
                        : 'Timing less critical from CGT perspective'
            },
            otherConsiderations: [
                'Holding costs vs tax savings',
                'Property market conditions and timing',
                'Cash flow needs in retirement',
                'Age Pension implications (investment property assessed)',
                'Rental income during holding period',
                'Main residence exemption strategies (6-year rule)'
            ],
            action: yearsToRetirement <= 5 && taxSaving > 20000
                ? `Consider deferring property sale to retirement (saves ~$${Math.round(taxSaving).toLocaleString()} in CGT)`
                : 'CGT timing less critical - decide based on other factors',
            confidence: 'MEDIUM'
        };
    }

    /**
     * Assess downsizer contribution eligibility
     */
    assessDownsizer(personalDetails, financialData) {
        const age = personalDetails.age;
        const homeValue = financialData.homeValue || 0;
        const ownHome = homeValue > 0;

        const eligible = age >= this.DOWNSIZER_MIN_AGE && ownHome;

        if (!eligible) {
            return {
                eligible: false,
                message: age < this.DOWNSIZER_MIN_AGE
                    ? `Downsizer contributions available from age ${this.DOWNSIZER_MIN_AGE} (${this.DOWNSIZER_MIN_AGE - age} years away)`
                    : 'Downsizer contributions require home ownership for 10+ years',
                yearsUntilEligible: age < this.DOWNSIZER_MIN_AGE ? this.DOWNSIZER_MIN_AGE - age : null
            };
        }

        const limit = personalDetails.partnered ? this.DOWNSIZER_CONTRIBUTION * 2 : this.DOWNSIZER_CONTRIBUTION;
        const proceedsEstimate = homeValue * 0.35 - 50000;

        return {
            eligible: true,
            opportunity: {
                currentHomeValue: homeValue,
                maxContribution: limit,
                perPerson: this.DOWNSIZER_CONTRIBUTION,
                eligibilityAge: this.DOWNSIZER_MIN_AGE
            },
            benefits: [
                'Not subject to contribution caps',
                'Not subject to Total Super Balance test (even if over $1.9M)',
                'Can be made from ages 55+',
                'Must be from sale proceeds of main residence owned 10+ years',
                'Contribution made within 90 days of settlement',
                'Not counted against non-concessional contributions'
            ],
            scenario: {
                description: 'If you downsize and free up capital',
                example: `Sell current home ($${(homeValue / 1000).toFixed(0)}k) → Buy smaller home ($${(homeValue * 0.65 / 1000).toFixed(0)}k)`,
                estimatedProceedsAvailable: Math.round(proceedsEstimate),
                contributionRecommended: Math.min(proceedsEstimate, limit),
                retirementBenefit: Math.round(Math.min(proceedsEstimate, limit) * Math.pow(1.07, Math.max(personalDetails.retirementAge - age, 1)))
            },
            action: 'Consider downsizer contributions if planning to sell home',
            confidence: 'MEDIUM',
            warnings: [
                'Must meet ownership and residency requirements (10+ years)',
                'Cannot reverse - funds locked in super',
                'Form must be lodged with contribution'
            ]
        };
    }

    /**
     * Calculate carry-forward contributions
     */
    calculateCarryForward(personalDetails, financialData) {
        const currentSuper = financialData.superBalance || 0;
        const salary = financialData.salary || 0;

        const eligible = currentSuper < this.TOTAL_SUPER_BALANCE_THRESHOLD;

        if (!eligible) {
            return {
                eligible: false,
                message: `Carry-forward provisions only available if Total Super Balance under $${(this.TOTAL_SUPER_BALANCE_THRESHOLD / 1000).toFixed(0)}k`,
                currentBalance: currentSuper,
                threshold: this.TOTAL_SUPER_BALANCE_THRESHOLD
            };
        }

        const sgContributions = salary * 0.12;
        const currentYearUnused = Math.max(0, this.CONCESSIONAL_CAP - sgContributions);

        // Estimate unused from previous years (conservative estimate)
        const yearsFactor = Math.min(5, Math.max(1, age => 40 - 5));
        const estimatedPriorYearsUnused = currentYearUnused * yearsFactor * 0.8;

        const totalCarryForward = currentYearUnused + estimatedPriorYearsUnused;

        return {
            eligible: true,
            details: {
                currentYearCap: this.CONCESSIONAL_CAP,
                currentYearUsed: Math.round(sgContributions),
                currentYearUnused: Math.round(currentYearUnused),
                estimatedCarryForward: Math.round(totalCarryForward),
                totalSuperBalance: currentSuper,
                eligibilityThreshold: this.TOTAL_SUPER_BALANCE_THRESHOLD
            },
            opportunity: totalCarryForward > 20000,
            recommendations: [
                totalCarryForward > 50000
                    ? 'Significant carry-forward available - consider catch-up contributions'
                    : 'Limited carry-forward available',
                'Carry-forward resets if Total Super Balance exceeds $500k',
                'Unused caps from up to 5 previous years can be used',
                'Check MyGov/ATO online services for exact unused cap amounts'
            ],
            action: totalCarryForward > 30000
                ? `Up to ~$${Math.round(totalCarryForward).toLocaleString()} carry-forward may be available (verify with ATO)`
                : 'Limited carry-forward available',
            confidence: 'LOW',
            note: 'This is an estimate. Log into myGov to see exact unused cap amounts from previous years.'
        };
    }

    /**
     * Generate multi-year tax optimization plan
     */
    generateMultiYearPlan(personalDetails, financialData) {
        const age = personalDetails.age;
        const retirementAge = personalDetails.retirementAge;
        const yearsToRetirement = retirementAge - age;

        const plan = [];

        // Year 1-2: Immediate actions
        plan.push({
            timeframe: '0-12 months',
            phase: 'IMMEDIATE',
            priority: 'HIGH',
            actions: [
                {
                    action: 'Optimize salary sacrifice',
                    benefit: 'Immediate tax savings',
                    complexity: 'LOW'
                },
                {
                    action: 'Review and adjust asset allocation for franking credits',
                    benefit: 'Enhanced returns in pension phase',
                    complexity: 'MEDIUM'
                },
                {
                    action: 'Check MyGov for unused contribution caps',
                    benefit: 'Identify catch-up opportunities',
                    complexity: 'LOW'
                }
            ]
        });

        // Years 3-5: Medium term
        if (yearsToRetirement > 3) {
            plan.push({
                timeframe: '1-3 years',
                phase: 'SHORT-TERM',
                priority: 'MEDIUM',
                actions: [
                    {
                        action: 'Implement contribution splitting strategy',
                        benefit: 'Equalize super balances',
                        complexity: 'MEDIUM'
                    },
                    {
                        action: 'Monitor Division 293 threshold',
                        benefit: 'Avoid unexpected tax',
                        complexity: 'LOW'
                    }
                ]
            });
        }

        // Pre-retirement (5 years out)
        if (yearsToRetirement <= 10 && yearsToRetirement > 3) {
            plan.push({
                timeframe: '3-5 years pre-retirement',
                phase: 'PRE-RETIREMENT',
                priority: 'HIGH',
                actions: [
                    {
                        action: 'Review CGT timing for investment property',
                        benefit: 'Optimize capital gains tax',
                        complexity: 'HIGH'
                    },
                    {
                        action: 'Consider downsizer contribution if selling home',
                        benefit: 'Boost super without cap restrictions',
                        complexity: 'HIGH'
                    },
                    {
                        action: 'Maximize catch-up contributions',
                        benefit: 'Final push before retirement',
                        complexity: 'MEDIUM'
                    }
                ]
            });
        }

        // Post-60
        if (age >= 60 || yearsToRetirement <= 5) {
            plan.push({
                timeframe: 'Age 60+',
                phase: 'RETIREMENT-TRANSITION',
                priority: 'HIGH',
                actions: [
                    {
                        action: 'Begin re-contribution strategy',
                        benefit: 'Convert taxable to tax-free component',
                        complexity: 'HIGH'
                    },
                    {
                        action: 'Transition to pension phase',
                        benefit: 'Tax-free income, refundable franking credits',
                        complexity: 'MEDIUM'
                    }
                ]
            });
        }

        return {
            yearsToRetirement: yearsToRetirement,
            currentAge: age,
            retirementAge: retirementAge,
            plan: plan,
            overallStrategy: yearsToRetirement > 10
                ? 'Focus on contribution optimization and wealth accumulation'
                : yearsToRetirement > 5
                    ? 'Transition planning and tax optimization'
                    : 'Final optimization and pension phase preparation'
        };
    }

    // ===== HELPER METHODS =====

    calculateMarginalTaxRate(income) {
        // 2024-25 Australian tax brackets including Medicare Levy (2%)
        if (income <= 18200) return this.MEDICARE_LEVY;
        if (income <= 45000) return 0.19 + this.MEDICARE_LEVY;
        if (income <= 135000) return 0.325 + this.MEDICARE_LEVY;
        if (income <= 190000) return 0.37 + this.MEDICARE_LEVY;
        return 0.45 + this.MEDICARE_LEVY;
    }

    calculateFutureValue(annualAmount, years, rate) {
        if (years <= 0) return 0;
        // Future value of annuity formula: PMT × (((1 + r)^n - 1) / r) × (1 + r)
        return annualAmount * (((1 + rate) ** years - 1) / rate) * (1 + rate);
    }

    calculateCGT(capitalGain, income) {
        // 50% CGT discount for assets held > 12 months
        const discountedGain = capitalGain * this.CGT_DISCOUNT;
        const taxableIncome = income + discountedGain;

        const totalTax = this.calculateIncomeTax(taxableIncome);
        const taxOnIncome = this.calculateIncomeTax(income);
        const cgtTax = totalTax - taxOnIncome;

        return {
            totalTax: cgtTax,
            effectiveRate: cgtTax / capitalGain,
            marginalRate: this.calculateMarginalTaxRate(taxableIncome)
        };
    }

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

        // Add Medicare Levy
        tax += income * this.MEDICARE_LEVY;

        return tax;
    }
}
