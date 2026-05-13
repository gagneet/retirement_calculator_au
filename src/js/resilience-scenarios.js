// resilience-scenarios.js - Resilience Testing and Adverse Scenario Modeling
// Tests retirement plans against adverse life events with recovery strategies

import { CONSERVATIVE_ASSUMPTIONS } from './config-conservative.js';

/**
 * ResilienceScenarioEngine
 *
 * Models 5 adverse scenarios that could derail retirement plans:
 * 1. Job Loss - Prolonged unemployment or forced early retirement
 * 2. Market Crash - 30-50% portfolio decline (GFC-style)
 * 3. Health Crisis - Major medical expenses and care costs
 * 4. Forced Property Sale - Must sell investment property at loss
 * 5. Interest Rate Spike - Mortgage costs double
 *
 * For each scenario, provides:
 * - Impact quantification on retirement outcome
 * - Recovery timeline and actions
 * - Preventive measures to build resilience
 */
export class ResilienceScenarioEngine {
    constructor(userInputs, baseOutcome) {
        this.inputs = userInputs;
        this.baseOutcome = baseOutcome;
        this.scenarios = [];
    }

    toTodayDollars(futureValue) {
        const factor = this.baseOutcome.inflationFactor || 1;
        return futureValue / factor;
    }

    /**
     * Run all resilience scenarios
     * @returns {Object} - All scenario results with rankings
     */
    runAllScenarios() {
        this.scenarios = [
            this.scenarioJobLoss(),
            this.scenarioMarketCrash(),
            this.scenarioHealthCrisis(),
            this.scenarioForcedPropertySale(),
            this.scenarioInterestRateSpike()
        ];

        // Rank scenarios by severity
        this.scenarios.sort((a, b) => b.impactSeverity - a.impactSeverity);

        return {
            scenarios: this.scenarios,
            overallResilience: this.calculateOverallResilience(),
            topRisks: this.scenarios.slice(0, 3),
            recommendations: this.generateResilienceRecommendations()
        };
    }

    /**
     * SCENARIO 1: Job Loss
     * Models unemployment or forced early retirement 2-5 years before planned
     */
    scenarioJobLoss() {
        const salary = this.inputs.annualSalary || 0;
        const yearsToRetirement = this.baseOutcome.yearsToRetirement;

        // Assume job loss 3 years before planned retirement
        const jobLossYearsEarly = Math.min(3, Math.floor(yearsToRetirement / 2));

        if (salary === 0 || yearsToRetirement < 3) {
            return {
                id: 'JOB_LOSS',
                name: 'Job Loss / Forced Early Retirement',
                applicable: false,
                reason: 'Not applicable - no salary or too close to retirement'
            };
        }

        // Calculate impact
        const unemploymentPeriod = 12; // months
        const unemploymentRate = 0.70; // Centrelink provides ~70% of previous income (capped)
        const maxCentrelink = 800 * 52; // ~$800/fortnight max

        const lostIncome = Math.min(salary * (1 - unemploymentRate), salary - maxCentrelink);
        const lostSuperContributions = jobLossYearsEarly * salary * CONSERVATIVE_ASSUMPTIONS.SUPER_GUARANTEE_RATE;
        const superGrowthLost = lostSuperContributions * 0.5; // Approximate growth lost

        // Emergency fund burn
        const emergencyFundNeeded = (salary / 12) * 6; // 6 months expenses
        const hasEmergencyFund = this.inputs.hasEmergencyFund === 'full' || this.inputs.hasEmergencyFund === 'partial';
        const emergencyFundShortfall = hasEmergencyFund ? 0 : emergencyFundNeeded;

        // Total impact on retirement
        const totalImpact = lostSuperContributions + superGrowthLost + emergencyFundShortfall;
        const impactOnIncome = this.toTodayDollars(totalImpact * 0.04); // 4% drawdown
        const newGap = this.baseOutcome.gap + impactOnIncome;

        // Calculate severity (0-10 scale)
        const impactSeverity = Math.min(10, (impactOnIncome / this.baseOutcome.targetIncome) * 10);

        return {
            id: 'JOB_LOSS',
            name: 'Job Loss / Forced Early Retirement',
            applicable: true,
            description: `Losing your job ${jobLossYearsEarly} years before planned retirement`,
            probability: 'MEDIUM', // ~15-20% chance of unemployment spell pre-retirement

            impact: {
                lostSuperContributions: Math.round(lostSuperContributions),
                superGrowthLost: Math.round(superGrowthLost),
                emergencyFundShortfall: Math.round(emergencyFundShortfall),
                totalImpact: Math.round(totalImpact),
                impactOnAnnualIncome: Math.round(impactOnIncome),
                newGap: Math.round(newGap),
                newGapWeekly: Math.round(newGap / 52)
            },

            impactSeverity: impactSeverity,

            recoveryActions: [
                {
                    action: 'Immediate: Apply for Centrelink JobSeeker',
                    detail: 'Up to $800/fortnight while searching. Asset tests apply.',
                    timeline: 'Week 1',
                    impactReduction: 0
                },
                {
                    action: 'Access emergency fund if available',
                    detail: `Cover ${Math.round(emergencyFundNeeded / 1000)}k in expenses while job hunting`,
                    timeline: 'Month 1-6',
                    impactReduction: hasEmergencyFund ? emergencyFundShortfall * 0.04 : 0
                },
                {
                    action: 'Reduce non-essential expenses by 30%',
                    detail: 'Cut subscriptions, dining out, discretionary spending',
                    timeline: 'Month 1 onwards',
                    impactReduction: 0
                },
                {
                    action: 'Consider contract or part-time work',
                    detail: 'Even 50% of previous salary helps maintain super contributions',
                    timeline: 'Month 3-12',
                    impactReduction: impactOnIncome * 0.30
                },
                {
                    action: 'Delay retirement by 1-2 years if needed',
                    detail: 'Allows super to rebuild and reduces drawdown period',
                    timeline: 'Long-term',
                    impactReduction: impactOnIncome * 0.50
                }
            ],

            preventiveMeasures: [
                {
                    measure: 'Build 6-12 month emergency fund',
                    current: hasEmergencyFund ? 'Partial' : 'None',
                    target: `$${Math.round(emergencyFundNeeded / 1000)}k in accessible savings`,
                    priority: 'HIGH'
                },
                {
                    measure: 'Income protection insurance',
                    current: 'Unknown',
                    target: '75% salary replacement for 2 years',
                    priority: 'HIGH'
                },
                {
                    measure: 'Develop transferable skills',
                    current: 'Unknown',
                    target: 'Multiple income streams or consulting options',
                    priority: 'MEDIUM'
                },
                {
                    measure: 'Network and professional development',
                    current: 'Unknown',
                    target: 'Active industry connections for rapid re-employment',
                    priority: 'MEDIUM'
                }
            ],

            recoveryTimeline: '12-24 months with mitigation actions'
        };
    }

    /**
     * SCENARIO 2: Market Crash
     * Models 30-50% portfolio decline (similar to 2008 GFC or 2020 COVID crash)
     */
    scenarioMarketCrash() {
        const superBalance = (this.inputs.superBalance || 0) + (this.inputs.partnerSuperBalance || 0);
        const yearsToRetirement = this.baseOutcome.yearsToRetirement;

        if (superBalance === 0) {
            return {
                id: 'MARKET_CRASH',
                name: 'Major Market Crash (GFC-style)',
                applicable: false,
                reason: 'No investment exposure'
            };
        }

        // Model crash scenarios based on years to retirement
        let crashSeverity;
        let recoveryYears;

        if (yearsToRetirement > 15) {
            // Far from retirement - can recover
            crashSeverity = 0.40; // 40% decline
            recoveryYears = 5;
        } else if (yearsToRetirement > 7) {
            // Mid-range - moderate impact
            crashSeverity = 0.35; // 35% decline
            recoveryYears = 4;
        } else {
            // Close to retirement - sequence risk
            crashSeverity = 0.30; // 30% decline but can't wait for recovery
            recoveryYears = 3;
        }

        // Calculate immediate impact
        const futureSuperNoGrowth = this.baseOutcome.superAtRetirementNominal / Math.pow(1 + CONSERVATIVE_ASSUMPTIONS.SUPER_RETURN_BALANCED, yearsToRetirement);
        const crashImpact = futureSuperNoGrowth * crashSeverity;

        // Recovery calculation
        const recoveryPossible = yearsToRetirement > recoveryYears;
        const recoveredAmount = recoveryPossible ?
            crashImpact * 0.70 : // Recover 70% if time allows
            crashImpact * Math.min(0.70, (yearsToRetirement / recoveryYears) * 0.70);

        const netImpact = crashImpact - recoveredAmount;
        const netImpactAtRetirement = netImpact * Math.pow(1 + CONSERVATIVE_ASSUMPTIONS.SUPER_RETURN_BALANCED, Math.max(0, yearsToRetirement - 1));

        const impactOnIncome = this.toTodayDollars(netImpactAtRetirement * 0.04);
        const newGap = this.baseOutcome.gap + impactOnIncome;

        // Severity (worse if close to retirement - sequence risk)
        const sequenceRiskMultiplier = yearsToRetirement < 7 ? 1.5 : 1.0;
        const impactSeverity = Math.min(10, ((impactOnIncome / this.baseOutcome.targetIncome) * 10) * sequenceRiskMultiplier);

        return {
            id: 'MARKET_CRASH',
            name: 'Major Market Crash (GFC-style)',
            applicable: true,
            description: `${Math.round(crashSeverity * 100)}% portfolio decline ${yearsToRetirement} years before retirement`,
            probability: yearsToRetirement > 10 ? 'MEDIUM' : 'LOW', // ~20% chance of major crash in any 10-year period

            impact: {
                immediatePortfolioDrop: Math.round(crashImpact),
                recoveryTimeAvailable: recoveryYears + ' years',
                recoveredAmount: Math.round(recoveredAmount),
                netLossAtRetirement: Math.round(netImpactAtRetirement),
                impactOnAnnualIncome: Math.round(impactOnIncome),
                newGap: Math.round(newGap),
                newGapWeekly: Math.round(newGap / 52),
                sequenceRisk: yearsToRetirement < 7 ? 'HIGH' : 'MODERATE'
            },

            impactSeverity: impactSeverity,

            recoveryActions: [
                {
                    action: 'DO NOT panic sell',
                    detail: 'Selling locks in losses. Markets historically recover within 5-7 years.',
                    timeline: 'Immediate',
                    impactReduction: netImpactAtRetirement * 0.30
                },
                {
                    action: 'Continue regular contributions',
                    detail: 'Buy assets at discounted prices - dollar cost averaging benefit',
                    timeline: 'Ongoing',
                    impactReduction: impactOnIncome * 0.15
                },
                {
                    action: 'Rebalance portfolio to target allocation',
                    detail: 'Sell bonds/cash, buy equities while cheap',
                    timeline: 'Month 1-3',
                    impactReduction: impactOnIncome * 0.10
                },
                {
                    action: 'If close to retirement: Delay drawdown 1-2 years',
                    detail: 'Work longer to allow recovery, avoid selling at bottom',
                    timeline: 'If <5 years to retirement',
                    impactReduction: impactOnIncome * 0.40
                },
                {
                    action: 'Reduce retirement expenses temporarily',
                    detail: 'Lower drawdown rate from 4% to 3% until recovery',
                    timeline: 'First 3-5 years of retirement',
                    impactReduction: impactOnIncome * 0.25
                }
            ],

            preventiveMeasures: [
                {
                    measure: 'Age-appropriate asset allocation',
                    current: 'Unknown',
                    target: `${Math.max(30, 110 - this.inputs.currentAge)}% equities (Rule of 110)`,
                    priority: 'HIGH'
                },
                {
                    measure: 'Diversification across asset classes',
                    current: 'Unknown',
                    target: 'Aus/Int equities, bonds, property, cash (5-10%)',
                    priority: 'HIGH'
                },
                {
                    measure: 'Build 2-3 year cash buffer before retirement',
                    current: 'Unknown',
                    target: `$${Math.round((this.baseOutcome.targetIncome * 2.5) / 1000)}k in cash/bonds`,
                    priority: yearsToRetirement < 5 ? 'HIGH' : 'MEDIUM'
                },
                {
                    measure: 'Flexible retirement date',
                    current: `Fixed at age ${this.inputs.retirementAge}`,
                    target: 'Willing to work 1-2 years longer if needed',
                    priority: 'MEDIUM'
                }
            ],

            recoveryTimeline: recoveryPossible ?
                `${recoveryYears} years (70% recovery expected)` :
                `Partial recovery only (${Math.round((recoveredAmount / crashImpact) * 100)}%)`
        };
    }

    /**
     * SCENARIO 3: Health Crisis
     * Models major health event with medical expenses and care costs
     */
    scenarioHealthCrisis() {
        const age = this.inputs.currentAge || 50;
        const hasPrivateHealth = this.inputs.hasPrivateHealthInsurance || false;
        const yearsToRetirement = this.baseOutcome.yearsToRetirement;

        // Health crisis probability increases with age
        const baseProbability = age > 60 ? 'HIGH' : age > 50 ? 'MEDIUM' : 'LOW';

        // Model severe health crisis costs (cancer, heart surgery, stroke)
        const immediateOutOfPocketCosts = hasPrivateHealth ? 15000 : 35000; // Deductibles, non-covered items
        const ongoingMedicationCosts = 3000; // Per year ongoing
        const reducedEarningCapacity = 0.30; // Can only work 70% capacity for 2 years
        const salary = this.inputs.annualSalary || 0;

        const yearsAffected = Math.min(3, yearsToRetirement);
        const lostEarnings = salary * reducedEarningCapacity * yearsAffected;
        const lostSuperContributions = lostEarnings * CONSERVATIVE_ASSUMPTIONS.SUPER_GUARANTEE_RATE;
        const ongoingCostsTotal = ongoingMedicationCosts * yearsAffected;

        // Total impact
        const totalImpact = immediateOutOfPocketCosts + ongoingCostsTotal + lostSuperContributions;
        const impactOnIncome = this.toTodayDollars((totalImpact / (95 - this.inputs.retirementAge)) * 0.04); // Spread over retirement
        const newGap = this.baseOutcome.gap + impactOnIncome;

        const impactSeverity = Math.min(10, (totalImpact / (salary * 2)) * 10);

        return {
            id: 'HEALTH_CRISIS',
            name: 'Major Health Crisis',
            applicable: true,
            description: `Serious health event requiring treatment and reducing work capacity`,
            probability: baseProbability,

            impact: {
                immediateOutOfPocket: Math.round(immediateOutOfPocketCosts),
                ongoingMedications: Math.round(ongoingCostsTotal),
                lostEarnings: Math.round(lostEarnings),
                lostSuperContributions: Math.round(lostSuperContributions),
                totalImpact: Math.round(totalImpact),
                impactOnAnnualIncome: Math.round(impactOnIncome),
                newGap: Math.round(newGap),
                newGapWeekly: Math.round(newGap / 52)
            },

            impactSeverity: impactSeverity,

            recoveryActions: [
                {
                    action: 'Apply for Medicare/PBS benefits',
                    detail: 'PBS Safety Net caps medication costs at ~$1,500/year',
                    timeline: 'Immediate',
                    impactReduction: ongoingCostsTotal * 0.50
                },
                {
                    action: 'Claim private health insurance extras',
                    detail: 'Hospital cover, allied health, ambulance',
                    timeline: 'Week 1-2',
                    impactReduction: hasPrivateHealth ? 15000 : 0
                },
                {
                    action: 'Access income protection insurance',
                    detail: 'Replaces 75% of income during recovery',
                    timeline: 'Month 1 onwards',
                    impactReduction: lostEarnings * 0.75
                },
                {
                    action: 'Negotiate flexible work arrangements',
                    detail: 'Work from home, reduced hours, gradual return',
                    timeline: 'Month 3-12',
                    impactReduction: lostEarnings * 0.40
                },
                {
                    action: 'Use emergency fund for immediate costs',
                    detail: `Cover $${Math.round(immediateOutOfPocketCosts / 1000)}k upfront expenses`,
                    timeline: 'Immediate',
                    impactReduction: 0
                }
            ],

            preventiveMeasures: [
                {
                    measure: 'Maintain private health insurance',
                    current: hasPrivateHealth ? 'Yes' : 'No',
                    target: 'Hospital cover with good cancer/cardiac coverage',
                    priority: 'HIGH'
                },
                {
                    measure: 'Income protection insurance',
                    current: 'Unknown',
                    target: '75% salary, 5 year benefit period, 30-day wait',
                    priority: 'HIGH'
                },
                {
                    measure: 'Trauma insurance',
                    current: 'Unknown',
                    target: `$${Math.round(salary * 2 / 1000)}k lump sum for major events`,
                    priority: 'MEDIUM'
                },
                {
                    measure: 'Emergency medical fund',
                    current: 'Unknown',
                    target: '$20-30k accessible for out-of-pocket costs',
                    priority: 'HIGH'
                },
                {
                    measure: 'Regular health check-ups',
                    current: 'Unknown',
                    target: 'Annual GP visits, biannual screenings after 50',
                    priority: 'MEDIUM'
                }
            ],

            recoveryTimeline: '2-3 years to full work capacity, ongoing medication management'
        };
    }

    /**
     * SCENARIO 4: Forced Property Sale
     * Models having to sell investment property at a loss or unfavorable time
     */
    scenarioForcedPropertySale() {
        const hasProperty = this.inputs.hasInvestmentProperty;
        const propertyValue = this.inputs.investmentPropertyValue || 0;
        const propertyLoan = this.inputs.investmentPropertyLoan || 0;

        if (!hasProperty || propertyValue === 0) {
            return {
                id: 'FORCED_PROPERTY_SALE',
                name: 'Forced Investment Property Sale',
                applicable: false,
                reason: 'No investment property owned'
            };
        }

        const equity = propertyValue - propertyLoan;

        // Forced sale scenario: Market downturn + tenant issues
        const marketDecline = 0.20; // 20% below purchase price
        const distressDiscount = 0.05; // 5% additional for rushed sale
        const totalValueLoss = propertyValue * (marketDecline + distressDiscount);

        const actualSalePrice = propertyValue * (1 - marketDecline - distressDiscount);
        const saleNetProceeds = actualSalePrice - propertyLoan;

        // Selling costs
        const agentFees = actualSalePrice * 0.025; // 2.5%
        const legalCosts = 3000;
        const mortgageBreakCosts = propertyLoan * 0.02; // 2% break fee
        const totalSellingCosts = agentFees + legalCosts + mortgageBreakCosts;

        const netProceedsAfterCosts = saleNetProceeds - totalSellingCosts;

        // CGT on sale (if gain despite decline)
        const purchasePrice = propertyValue / 1.20; // Assume 20% gain originally
        const capitalGain = Math.max(0, actualSalePrice - purchasePrice);
        const cgtPayable = capitalGain * 0.50 * 0.325; // 50% discount, 32.5% marginal rate

        const finalNetProceeds = netProceedsAfterCosts - cgtPayable;

        // Lost rental income stream (opportunity cost)
        const rentalYield = 0.04;
        const annualRentalIncome = propertyValue * rentalYield;
        const yearsToRetirement = this.baseOutcome.yearsToRetirement;
        const lostRentalIncome = annualRentalIncome * Math.min(10, yearsToRetirement); // 10 year horizon

        // Impact on retirement
        const totalImpact = totalValueLoss + totalSellingCosts + cgtPayable + (lostRentalIncome * 0.30); // 30% weight on lost income
        const impactOnIncome = this.toTodayDollars((finalNetProceeds - equity) * 0.04); // Lost income vs keeping property
        const newGap = this.baseOutcome.gap - impactOnIncome; // Negative = worse outcome

        const impactSeverity = Math.min(10, (Math.abs(totalImpact) / equity) * 5);

        return {
            id: 'FORCED_PROPERTY_SALE',
            name: 'Forced Investment Property Sale',
            applicable: true,
            description: `Forced to sell investment property during market downturn`,
            probability: 'LOW', // ~5-10% chance of forced sale

            impact: {
                currentEquity: Math.round(equity),
                marketDecline: Math.round(totalValueLoss),
                sellingCosts: Math.round(totalSellingCosts),
                cgtPayable: Math.round(cgtPayable),
                netProceedsReceived: Math.round(finalNetProceeds),
                equityLost: Math.round(equity - finalNetProceeds),
                lostRentalIncomeStream: Math.round(annualRentalIncome),
                impactOnAnnualIncome: Math.round(impactOnIncome),
                newGap: Math.round(newGap),
                newGapWeekly: Math.round(newGap / 52)
            },

            impactSeverity: impactSeverity,

            recoveryActions: [
                {
                    action: 'Delay sale if possible',
                    detail: 'Wait for market recovery - every 6 months adds 2-3% value',
                    timeline: '6-12 months',
                    impactReduction: totalValueLoss * 0.40
                },
                {
                    action: 'Get multiple agent valuations',
                    detail: 'Avoid underpricing - agent fees are negotiable',
                    timeline: 'Week 1-2',
                    impactReduction: totalSellingCosts * 0.20
                },
                {
                    action: 'Negotiate mortgage break costs',
                    detail: 'Banks may waive fees for hardship cases',
                    timeline: 'Week 2-4',
                    impactReduction: mortgageBreakCosts * 0.50
                },
                {
                    action: 'Reinvest proceeds into diversified portfolio',
                    detail: 'Don\'t leave cash idle - invest for retirement growth',
                    timeline: 'Month 1-2',
                    impactReduction: impactOnIncome * 0.60
                },
                {
                    action: 'Offset CGT with other losses',
                    detail: 'Harvest capital losses to reduce tax bill',
                    timeline: 'End of financial year',
                    impactReduction: cgtPayable * 0.30
                }
            ],

            preventiveMeasures: [
                {
                    measure: 'Maintain adequate property buffer',
                    current: `${Math.round((propertyLoan / propertyValue) * 100)}% LVR`,
                    target: 'Keep LVR below 70%, build equity buffer',
                    priority: 'HIGH'
                },
                {
                    measure: 'Landlord insurance',
                    current: 'Unknown',
                    target: 'Covers lost rent, malicious damage, legal costs',
                    priority: 'HIGH'
                },
                {
                    measure: 'Diversified tenant screening',
                    current: 'Unknown',
                    target: 'Professional property management, reference checks',
                    priority: 'MEDIUM'
                },
                {
                    measure: 'Property maintenance reserve',
                    current: 'Unknown',
                    target: '1-2% of property value annually for repairs',
                    priority: 'MEDIUM'
                },
                {
                    measure: 'Market timing flexibility',
                    current: 'Unknown',
                    target: 'No forced sale date - can wait for favorable market',
                    priority: 'HIGH'
                }
            ],

            recoveryTimeline: 'Immediate if sale occurs, but lost opportunity cost of 10+ years rental income'
        };
    }

    /**
     * SCENARIO 5: Interest Rate Spike
     * Models mortgage costs doubling due to rapid rate increases
     */
    scenarioInterestRateSpike() {
        const hasMortgage = (this.inputs.homeLoan || 0) > 0 || (this.inputs.investmentPropertyLoan || 0) > 0;
        const homeLoan = this.inputs.homeLoan || 0;
        const investmentLoan = this.inputs.investmentPropertyLoan || 0;
        const totalDebt = homeLoan + investmentLoan;

        if (!hasMortgage || totalDebt === 0) {
            return {
                id: 'INTEREST_RATE_SPIKE',
                name: 'Interest Rate Spike',
                applicable: false,
                reason: 'No mortgage debt'
            };
        }

        const currentRate = 0.055; // Assume 5.5% current
        const spikedRate = 0.075; // Spike to 7.5% (2% increase)
        const rateIncrease = spikedRate - currentRate;

        // Calculate monthly payment impact
        const yearsToRetirement = this.baseOutcome.yearsToRetirement;
        const remainingTerm = Math.max(5, Math.min(25, yearsToRetirement + 5));

        // Current monthly payment
        const currentMonthlyRate = currentRate / 12;
        const currentPayments = remainingTerm * 12;
        const currentMonthlyPayment = totalDebt * (currentMonthlyRate * Math.pow(1 + currentMonthlyRate, currentPayments)) /
                                      (Math.pow(1 + currentMonthlyRate, currentPayments) - 1);

        // New monthly payment after spike
        const newMonthlyRate = spikedRate / 12;
        const newMonthlyPayment = totalDebt * (newMonthlyRate * Math.pow(1 + newMonthlyRate, currentPayments)) /
                                  (Math.pow(1 + newMonthlyRate, currentPayments) - 1);

        const monthlyIncrease = newMonthlyPayment - currentMonthlyPayment;
        const annualIncrease = monthlyIncrease * 12;

        // Impact over years until retirement
        const totalExtraInterest = annualIncrease * yearsToRetirement;

        // Lost super contributions due to cashflow pressure
        const sacrificedSuperContributions = annualIncrease * 0.30 * yearsToRetirement; // 30% could have gone to super
        const superGrowthLost = sacrificedSuperContributions * 0.30; // Approximate growth

        const totalImpact = totalExtraInterest + sacrificedSuperContributions + superGrowthLost;
        const impactOnIncome = this.toTodayDollars((sacrificedSuperContributions + superGrowthLost) * 0.04);
        const newGap = this.baseOutcome.gap + impactOnIncome;

        const impactSeverity = Math.min(10, (monthlyIncrease / (this.inputs.annualSalary / 12)) * 10);

        return {
            id: 'INTEREST_RATE_SPIKE',
            name: 'Interest Rate Spike',
            applicable: true,
            description: `Mortgage rates increase from ${(currentRate * 100).toFixed(1)}% to ${(spikedRate * 100).toFixed(1)}%`,
            probability: 'MEDIUM', // ~20% chance of 2%+ rate spike

            impact: {
                totalDebtAffected: Math.round(totalDebt),
                currentMonthlyPayment: Math.round(currentMonthlyPayment),
                newMonthlyPayment: Math.round(newMonthlyPayment),
                monthlyIncrease: Math.round(monthlyIncrease),
                annualIncrease: Math.round(annualIncrease),
                totalExtraInterest: Math.round(totalExtraInterest),
                sacrificedSuperContributions: Math.round(sacrificedSuperContributions),
                totalImpact: Math.round(totalImpact),
                impactOnAnnualIncome: Math.round(impactOnIncome),
                newGap: Math.round(newGap),
                newGapWeekly: Math.round(newGap / 52)
            },

            impactSeverity: impactSeverity,

            recoveryActions: [
                {
                    action: 'Refinance to fixed rate immediately',
                    detail: 'Lock in lower rate before further increases',
                    timeline: 'Month 1',
                    impactReduction: totalExtraInterest * 0.60
                },
                {
                    action: 'Negotiate with current lender for better rate',
                    detail: 'Loyalty customers often get 0.3-0.5% discount',
                    timeline: 'Week 1-2',
                    impactReduction: annualIncrease * 0.20
                },
                {
                    action: 'Extend loan term to reduce monthly payment',
                    detail: 'Costs more long-term but eases immediate cashflow',
                    timeline: 'Month 1',
                    impactReduction: monthlyIncrease * 0.30
                },
                {
                    action: 'Offset account strategy',
                    detail: 'Park savings in offset to reduce interest charged',
                    timeline: 'Immediate',
                    impactReduction: annualIncrease * 0.15
                },
                {
                    action: 'Temporary pause on extra super contributions',
                    detail: 'Prioritize mortgage over voluntary super for 1-2 years',
                    timeline: 'Year 1-2',
                    impactReduction: monthlyIncrease * 12
                }
            ],

            preventiveMeasures: [
                {
                    measure: 'Build mortgage buffer',
                    current: `$${Math.round(totalDebt / 1000)}k debt`,
                    target: '1 year of repayments in offset/redraw',
                    priority: 'HIGH'
                },
                {
                    measure: 'Fix portion of loan',
                    current: 'Unknown',
                    target: '50-70% fixed for 3-5 years, rest variable',
                    priority: 'HIGH'
                },
                {
                    measure: 'Accelerated debt reduction',
                    current: `${remainingTerm} years remaining`,
                    target: 'Extra $500-1000/month to principal',
                    priority: 'MEDIUM'
                },
                {
                    measure: 'Stress test budget at 8-9% rates',
                    current: `${(currentRate * 100).toFixed(1)}% rate`,
                    target: 'Can afford payments at 8-9% for 6-12 months',
                    priority: 'HIGH'
                },
                {
                    measure: 'Debt-free before retirement',
                    current: `${remainingTerm} years to payoff`,
                    target: 'Fully paid off by retirement age',
                    priority: 'HIGH'
                }
            ],

            recoveryTimeline: 'Immediate action needed - refinancing takes 4-8 weeks'
        };
    }

    /**
     * Calculate overall resilience score (0-100)
     * Based on ability to withstand adverse scenarios
     */
    calculateOverallResilience() {
        const applicableScenarios = this.scenarios.filter(s => s.applicable);

        if (applicableScenarios.length === 0) {
            return {
                score: 100,
                rating: 'EXCELLENT',
                summary: 'No major risk exposures identified'
            };
        }

        // Average severity across scenarios
        const avgSeverity = applicableScenarios.reduce((sum, s) => sum + s.impactSeverity, 0) / applicableScenarios.length;

        // Resilience score (inverse of severity)
        const score = Math.round(Math.max(0, 100 - (avgSeverity * 10)));

        let rating;
        if (score >= 80) rating = 'EXCELLENT';
        else if (score >= 60) rating = 'GOOD';
        else if (score >= 40) rating = 'MODERATE';
        else if (score >= 20) rating = 'POOR';
        else rating = 'CRITICAL';

        return {
            score,
            rating,
            avgSeverity: avgSeverity.toFixed(1),
            scenariosAnalyzed: applicableScenarios.length,
            summary: `Your retirement plan has ${rating.toLowerCase()} resilience against adverse events`
        };
    }

    /**
     * Generate top resilience recommendations
     */
    generateResilienceRecommendations() {
        const recommendations = [];

        // Collect all preventive measures from scenarios
        const allMeasures = [];
        this.scenarios.forEach(scenario => {
            if (scenario.applicable && scenario.preventiveMeasures) {
                scenario.preventiveMeasures.forEach(measure => {
                    allMeasures.push({
                        ...measure,
                        scenarioId: scenario.id,
                        scenarioName: scenario.name
                    });
                });
            }
        });

        // Group by priority
        const highPriority = allMeasures.filter(m => m.priority === 'HIGH');
        const mediumPriority = allMeasures.filter(m => m.priority === 'MEDIUM');

        // Top 5 recommendations
        const top5 = [...highPriority, ...mediumPriority].slice(0, 5);

        return top5.map((measure, index) => ({
            rank: index + 1,
            priority: measure.priority,
            action: measure.measure,
            current: measure.current,
            target: measure.target,
            protectsAgainst: measure.scenarioName
        }));
    }
}

export default ResilienceScenarioEngine;
