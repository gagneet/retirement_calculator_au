// js/suggestion-engine.js - The New Dynamic and Comprehensive Suggestion Engine

import { ENHANCED_CONFIG } from './config.js';
import { formatCurrency, formatPercent, calculateUnusedConcessionalCap, calculateDownsizerContribution } from './utils.js';
import MarketDataEngine from './market-data.js';

export default class SuggestionEngine {
    constructor(simulator, inputs, results) {
        if (!simulator) {
            throw new Error('SuggestionEngine requires a simulator instance');
        }
        if (!inputs) {
            throw new Error('SuggestionEngine requires inputs object');
        }

        this.simulator = simulator;
        this.inputs = inputs;
        this.results = results || null;
        this.marketData = new MarketDataEngine();
        this.suggestions = [];
    }

    // Main method to generate all recommendations
    async generateSuggestions() {
        try {
            console.log("Starting comprehensive suggestion engine...");

            // Clear any existing suggestions
            this.suggestions = [];

        // 1. Generate Quick Wins first (highest priority)
        const quickWins = this.generateQuickWins();
        this.suggestions.push(...quickWins);

        // 2. Generate specific, persona-based suggestions
        this.generateSuggestionsForSarah();
        this.generateSuggestionsForMarkAndLisa();
        this.generateSuggestionsForRobert();
        this.generateSuggestionsForJenny();

        // 3. Run baseline simulation for deeper, scenario-based analysis
        const baseline = await this.runBaselineAnalysis();
        if (baseline) {
            const recommendationPromises = [
                this.analyzeHomeOwnership(baseline),
                this.analyzeInvestmentProperty(baseline),
                this.analyzeStocksAndShares(baseline),
                this.analyzeTrustStructures(baseline),
                this.analyzeEarlyRetirement(baseline),
                this.analyzeInvestmentOptimization(baseline),
                this.analyzeSuperannuationStrategy(baseline),
                this.analyzeAdditionalStrategies(baseline)
            ];

            const allCategoryRecs = await Promise.all(recommendationPromises);
            allCategoryRecs.forEach(catRecs => {
                if (Array.isArray(catRecs)) {
                    this.suggestions.push(...catRecs);
                }
            });
        }

            // 4. Prioritize and return all collected suggestions (Quick Wins will float to top)
            return this.prioritizeSuggestions();
        } catch (error) {
            console.error('Error generating suggestions:', error);
            return [{
                category: 'Error',
                priority: 'High',
                title: 'Unable to generate suggestions',
                description: 'There was an error generating personalized suggestions. Please check your inputs and try again.',
                actions: ['Verify all required fields are filled', 'Contact support if the problem persists'],
                confidence: 0
            }];
        }
    }

    // --- Persona-based suggestions ---
    generateSuggestionsForSarah() {
        const { yourSalary, yourCurrentAge, retirementAge } = this.inputs;

        // Safety checks
        if (!yourSalary || !yourCurrentAge || !retirementAge) {
            console.warn('Missing required fields for Sarah persona suggestions');
            return;
        }

        const preservationAge = this.getPreservationAge(yourCurrentAge);
        const div293Threshold = ENHANCED_CONFIG.HEALTH_CHECK.TAX_EFFICIENCY.DIV293_THRESHOLD;

        // Suggestion for Division 293 Tax
        if (yourSalary > div293Threshold) {
            const employerContributionRate = this.inputs.employerSuperContribution || 0;
            if (employerContributionRate === 0) {
                console.warn('Employer super contribution rate is zero, skipping Division 293 calculation');
                return;
            }
            const concessionalContribution = yourSalary * (employerContributionRate / 100);
            const taxableContribution = Math.min(concessionalContribution, ENHANCED_CONFIG.HEALTH_CHECK.CONTRIBUTION_CAPS.CONCESSIONAL_CAP);
            const div293Impact = taxableContribution * 0.15;
            const netContribution = taxableContribution - div293Impact;

            this.suggestions.push({
                category: "Tax & Super",
                priority: "High",
                title: "Optimize for Division 293 Tax",
                description: `Your salary of ${formatCurrency(yourSalary)} triggers Division 293 tax, adding an extra 15% tax on your super contributions, costing you an estimated ${formatCurrency(div293Impact)} this year.`,
                actions: [
                    `Your effective concessional contribution is closer to ${formatCurrency(netContribution)} instead of ${formatCurrency(taxableContribution)}.`,
                    "Consider strategies like salary sacrificing to a car or using non-concessional contributions to build wealth outside this tax.",
                    "Maximizing non-concessional contributions up to the $110,000 cap can be more tax-effective."
                ],
                confidence: 0.95
            });
        }

        // Suggestion for bridging the preservation age gap
        if (retirementAge < preservationAge) {
            const gapYears = preservationAge - retirementAge;
            const annualExpenses = this.inputs.asfaComfortable;
            const bridgeAmount = gapYears * annualExpenses;

            this.suggestions.push({
                category: "Retirement Planning",
                priority: "High",
                title: "Bridge the Preservation Age Gap",
                description: `You plan to retire at ${retirementAge}, but can't access your super until preservation age (${preservationAge}). You have a ${gapYears}-year gap to fund.`,
                actions: [
                    `You will need a 'bridging account' with approximately ${formatCurrency(bridgeAmount)} in non-super assets (savings, stocks) to cover your expenses during this period.`,
                    "Review your non-super investment strategy to ensure these funds will be available when needed."
                ],
                confidence: 0.9
            });
        }
    }

    generateSuggestionsForMarkAndLisa() {
        const { businessStructure, businessYearsHeld, businessActiveAssetValue, propertyCashFlowStatus, numberOfProperties } = this.inputs;

        // Safety checks for business data
        if (!businessStructure || businessStructure === 'none') {
            return; // No business suggestions needed
        }

        // 15-year CGT exemption suggestion
        if (businessStructure !== 'none' && businessYearsHeld >= 15 && this.inputs.retirementAge > this.inputs.yourCurrentAge) {
             const cgtCap = ENHANCED_CONFIG.BUSINESS_CGT_EXEMPTION_CAP;
             const potentialContribution = Math.min(businessActiveAssetValue, cgtCap);

            this.suggestions.push({
                category: "Business Strategy",
                priority: "High",
                title: "Unlock 15-Year CGT Exemption for Your Business",
                description: `As you've held your business for ${businessYearsHeld} years and are planning to retire, you may qualify for the 15-year CGT exemption on the sale of your business assets.`,
                actions: [
                    `This could allow you to contribute up to ${formatCurrency(potentialContribution)} from the sale proceeds into your super, completely tax-free.`,
                    "This is one of the most powerful small business concessions. Consult a financial advisor to confirm your eligibility and plan the sale."
                ],
                confidence: 0.8
            });
        }

        // Negative gearing suggestion
        if (propertyCashFlowStatus === 'negative' && numberOfProperties > 0) {
            const annualLoss = this.inputs.annualPropertyExpenses + (this.inputs.investmentPropertyLoan * this.inputs.investmentPropertyRate) - (this.inputs.weeklyRentalIncome * 52);
            const afterTaxLoss = annualLoss * (1 - 0.37); // Assuming 37% marginal tax rate for simplicity

            this.suggestions.push({
                category: "Property Strategy",
                priority: "Medium",
                title: "Assess Impact of Negative Gearing",
                description: `Your investment property is negatively geared, creating an estimated annual cash loss of ${formatCurrency(annualLoss)}.`,
                actions: [
                    `While this provides a tax deduction, it reduces your pre-retirement cash flow by an estimated ${formatCurrency(afterTaxLoss)} per year.`,
                    "Review if the potential capital growth outweighs this annual cash drain on your ability to save for retirement."
                ],
                confidence: 0.75
            });
        }
    }

    generateSuggestionsForRobert() {
        const { homeOwnershipStatus, yourCurrentAge, totalSuperBalanceLastJune } = this.inputs;

        // Safety checks
        if (!yourCurrentAge || !totalSuperBalanceLastJune) {
            console.warn('Missing required fields for Robert persona suggestions');
            return;
        }

        // Unused concessional cap suggestion
        const unusedCap = calculateUnusedConcessionalCap(this.inputs);
        if (unusedCap > ENHANCED_CONFIG.UNUSED_CAP_THRESHOLD) {
            const concessionalCap = ENHANCED_CONFIG.HEALTH_CHECK.CONTRIBUTION_CAPS.CONCESSIONAL_CAP;
            const maxContributionThisYear = concessionalCap + unusedCap;

            this.suggestions.push({
                category: "Superannuation Strategy",
                priority: "High",
                title: "Utilize Carry-Forward Concessional Contributions",
                description: `Your Total Super Balance of ${formatCurrency(totalSuperBalanceLastJune)} allows you to use the 'carry-forward' rule. You have an estimated ${formatCurrency(unusedCap)} in unused concessional (pre-tax) contributions from prior years.`,
                actions: [
                    `You can contribute up to ${formatCurrency(maxContributionThisYear)} to your super this financial year as a tax-deductible contribution.`,
                    `This is a powerful way to significantly boost your super and reduce your tax. Action is needed before June 30.`
                ],
                confidence: 0.9
            });
        }

        // Downsizer suggestion
        if (homeOwnershipStatus === 'owner' && yourCurrentAge >= 55) {
             this.suggestions.push({
                category: "Home Ownership",
                priority: "High",
                title: "Plan for a Downsizer Super Contribution",
                description: `If you sell your main residence after turning 55, you may be eligible to make a one-off downsizer contribution of up to ${formatCurrency(ENHANCED_CONFIG.DOWNSIZER_CONTRIBUTION_SINGLE)} (or ${formatCurrency(ENHANCED_CONFIG.DOWNSIZER_CONTRIBUTION_COUPLE)} for a couple) to your super.`,
                actions: [
                    "This contribution is separate from the normal caps and can be made even if your Total Super Balance is high.",
                    "If you plan to sell your home, this is a fantastic way to transfer a large amount of capital into the tax-effective super environment."
                ],
                confidence: 0.85
            });
        }
    }

    generateSuggestionsForJenny() {
        const { partTimeWorkIncome, yourCurrentAge } = this.inputs;

        // Safety checks
        if (!yourCurrentAge) {
            console.warn('Missing required fields for Jenny persona suggestions');
            return;
        }

        // Work Bonus suggestion
        if (partTimeWorkIncome > 0 && yourCurrentAge >= 67) {
            const workBonusMax = ENHANCED_CONFIG.WORK_BONUS_MAX;
            const incomeToAssess = Math.max(0, partTimeWorkIncome - workBonusMax);
            const pensionReduction = incomeToAssess * 0.5;
            const netGain = partTimeWorkIncome - pensionReduction;

            this.suggestions.push({
                category: "Age Pension Strategy",
                priority: "Medium",
                title: "Maximize Your Work Bonus",
                description: `Your planned work income of ${formatCurrency(partTimeWorkIncome)}/year can be optimized with the Centrelink Work Bonus.`,
                actions: [
                    `The first ${formatCurrency(workBonusMax)} of income is exempt. Only ${formatCurrency(incomeToAssess)} will be assessed, reducing your pension by just ${formatCurrency(pensionReduction)}.`,
                    `Your net financial gain from working is an estimated ${formatCurrency(netGain)} per year.`,
                ],
                confidence: 0.9
            });
        }

        // Asset Test suggestion
        if (this.results && this.results.totalFinancialAssets) {
            const assetLimit = this.inputs.pensionAssetLimit;
            const assessableAssets = this.results.totalFinancialAssets;

            if (assessableAssets > assetLimit && assessableAssets < assetLimit + 50000) {
                const excessAssets = assessableAssets - assetLimit;
                const annualPensionLoss = (excessAssets / 1000) * 3 * 26;

                 this.suggestions.push({
                    category: "Age Pension Strategy",
                    priority: "High",
                    title: "Optimize Your Assets for the Age Pension",
                    description: `Your assets are ${formatCurrency(excessAssets)} over the Age Pension limit, costing you ${formatCurrency(annualPensionLoss)} in pension payments per year.`,
                    actions: [
                        `Gifting up to $10,000 to your children could reduce your assessable assets and increase your pension.`,
                        `Pre-paying funeral expenses via a funeral bond (up to ~$15k) can also be an exempt asset.`,
                        `Making home improvements is another way to reduce assessable assets, as your home is exempt.`
                    ],
                    confidence: 0.8
                });
            }
        }
    }

    getPreservationAge(currentAge) {
        const birthYear = new Date().getFullYear() - currentAge;
        if (birthYear < 1960) return 55;
        if (birthYear === 1960) return 56;
        if (birthYear === 1961) return 57;
        if (birthYear === 1962) return 58;
        if (birthYear === 1963) return 59;
        return 60; // For birth years 1964 and later
    }


    // --- Deeper Analysis Methods (from decision-support-engine) ---
    async runBaselineAnalysis() {
        try {
            if (!this.simulator) {
                throw new Error('Simulator instance not available');
            }

            const monteCarlo = await this.simulator.runMonteCarloSimulation(this.inputs, 1000);
            const deterministic = this.simulator.simulateRetirement(this.inputs);
            const riskProfile = this.calculateRiskProfile();

            return {
                monteCarlo,
                deterministic,
                successRate: monteCarlo.successRate,
                medianBalance: monteCarlo.median,
                riskProfile,
                currentAge: this.inputs.yourCurrentAge,
                retirementAge: this.inputs.retirementAge,
                yearsToRetirement: this.inputs.retirementAge - this.inputs.yourCurrentAge
            };
        } catch (error) {
            console.error("Baseline analysis failed:", error);
            return null;
        }
    }

    async analyzeHomeOwnership(baseline) {
        const { homeValue, yourCurrentAge } = this.inputs;
        const recommendations = [];

        if (!homeValue || homeValue < 500000) return [];

        const downsizingScenarios = [
            { timing: "At retirement", years: baseline.yearsToRetirement },
            { timing: "5 years before retirement", years: baseline.yearsToRetirement - 5 },
            { timing: "At age 75", years: 75 - yourCurrentAge }
        ];

        for (const scenario of downsizingScenarios) {
            if (scenario.years <= 0) continue;
            const downsizeInputs = { ...this.inputs, planToDownsize: true, downsizeAge: yourCurrentAge + scenario.years };
            const downsizeResult = await this.simulator.runMonteCarloSimulation(downsizeInputs, 500);
            const improvement = downsizeResult.successRate - baseline.successRate;

            if (improvement > 0.05) {
                const equityReleased = homeValue * 0.4; // Simplified
                recommendations.push({
                    category: "Home Ownership",
                    priority: improvement > 0.15 ? "high" : "medium",
                    action: `Downsize home ${scenario.timing.toLowerCase()}`,
                    recommendation: `Consider downsizing your home ${scenario.timing.toLowerCase()}. This could release ~${formatCurrency(equityReleased)} and improve your success rate by ${formatPercent(improvement)}.`,
                    confidence: 0.8
                });
            }
        }
        return recommendations;
    }

    async analyzeInvestmentProperty(baseline) {
        if (!this.inputs.hasInvestmentProperty) return [];
        // Logic for existing property...
        return [];
    }

    async analyzeStocksAndShares(baseline) { return []; }
    async analyzeTrustStructures(baseline) { return []; }
    async analyzeEarlyRetirement(baseline) { return []; }
    async analyzeInvestmentOptimization(baseline) { return []; }
    async analyzeSuperannuationStrategy(baseline) { return []; }
    async analyzeAdditionalStrategies(baseline) { return []; }

    calculateRiskProfile() {
        return {
            capacity: this.simulator.calculateRiskCapacity(this.inputs),
            tolerance: this.inputs.riskTolerance || 50,
            requirement: this.simulator.calculateRiskRequirement(this.inputs)
        };
    }

    prioritizeSuggestions() {
        const priorityOrder = { High: 3, Medium: 2, Low: 1 };
        // Use a Set to remove duplicate suggestions based on title
        const uniqueSuggestions = Array.from(new Map(this.suggestions.map(s => [s.title, s])).values());

        // Enhanced prioritization with Quick Wins scoring
        const quickWinThreshold = ENHANCED_CONFIG.quickWins.QUICK_WIN_THRESHOLD.value;
        const enhancedSuggestions = uniqueSuggestions.map(suggestion => {
            const quickWinScore = this.calculateQuickWinScore(suggestion);
            return {
                ...suggestion,
                quickWinScore,
                isQuickWin: quickWinScore >= quickWinThreshold,
                priorityScore: (priorityOrder[suggestion.priority] || 0) + (quickWinScore / 10)
            };
        });

        enhancedSuggestions.sort((a, b) => {
            // First sort by Quick Wins (highest score first)
            if (a.isQuickWin && !b.isQuickWin) return -1;
            if (!a.isQuickWin && b.isQuickWin) return 1;

            // Then by priority score (highest first)
            return b.priorityScore - a.priorityScore;
        });

        return enhancedSuggestions;
    }

    // Calculate Quick Win Score (0-10) based on multiple factors
    calculateQuickWinScore(suggestion) {
        const config = ENHANCED_CONFIG.quickWins;
        let score = 5; // Base score

        // Time to implement (configurable weight)
        if (suggestion.timeToImplement) {
            const timeWeight = config.SCORING_WEIGHTS.TIME_TO_IMPLEMENT.value * 5; // Scale to 5 points max
            if (suggestion.timeToImplement <= config.TIME_THRESHOLDS.SAME_DAY.value) {
                score += timeWeight;
            } else if (suggestion.timeToImplement <= config.TIME_THRESHOLDS.WITHIN_WEEK.value) {
                score += timeWeight * 0.75;
            } else if (suggestion.timeToImplement <= config.TIME_THRESHOLDS.WITHIN_MONTH.value) {
                score += timeWeight * 0.5;
            } else {
                score += timeWeight * 0.25;
            }
        }

        // Financial impact (configurable weight and thresholds)
        if (suggestion.estimatedImpact) {
            const impact = parseFloat(suggestion.estimatedImpact.replace(/[$,]/g, ''));
            const impactWeight = config.SCORING_WEIGHTS.FINANCIAL_IMPACT.value * 5; // Scale to 5 points max

            if (impact >= config.IMPACT_THRESHOLDS.HIGH_IMPACT.value) {
                score += impactWeight;
            } else if (impact >= config.IMPACT_THRESHOLDS.MEDIUM_IMPACT.value) {
                score += impactWeight * 0.67;
            } else if (impact >= config.IMPACT_THRESHOLDS.LOW_IMPACT.value) {
                score += impactWeight * 0.33;
            }
        }

        // Implementation difficulty (configurable weight)
        if (suggestion.difficulty) {
            const difficultyWeight = config.SCORING_WEIGHTS.IMPLEMENTATION_DIFFICULTY.value * 5; // Scale to 5 points max
            switch (suggestion.difficulty.toLowerCase()) {
                case 'very easy': score += difficultyWeight; break;
                case 'easy': score += difficultyWeight * 0.7; break;
                case 'moderate': score += difficultyWeight * 0.4; break;
                case 'hard': score += difficultyWeight * 0.1; break;
                default: score += difficultyWeight * 0.3;
            }
        }

        // Confidence level (configurable weight)
        if (suggestion.confidence) {
            const confidenceWeight = config.SCORING_WEIGHTS.CONFIDENCE_LEVEL.value * 5; // Scale to 5 points max
            score += (suggestion.confidence / 100) * confidenceWeight;
        }

        // Category-specific bonuses (configurable)
        if (suggestion.category) {
            switch (suggestion.category.toLowerCase()) {
                case 'tax & super':
                case 'superannuation':
                    score += config.CATEGORY_BONUSES.TAX_SUPER.value;
                    break;
                case 'investment optimization':
                    score += config.CATEGORY_BONUSES.INVESTMENT_OPTIMIZATION.value;
                    break;
                case 'debt management':
                    score += config.CATEGORY_BONUSES.DEBT_MANAGEMENT.value;
                    break;
            }
        }

        return Math.min(10, Math.max(0, score));
    }

    // Generate Quick Wins specifically
    generateQuickWins() {
        const quickWins = [];
        const config = ENHANCED_CONFIG.quickWins;
        const superConfig = ENHANCED_CONFIG.australianSystem;
        const { yourSalary, partnerSalary, yourCurrentSuper, partnerCurrentSuper,
               currentSavings, employerSuperContribution, nonConcessionalContribution } = this.inputs;

        // Quick Win 1: Maximize employer super matching
        if (employerSuperContribution < (superConfig.SUPER_GUARANTEE_RATE.value * 100)) {
            const gapPercent = (superConfig.SUPER_GUARANTEE_RATE.value * 100) - employerSuperContribution;
            const gapAmount = (yourSalary + partnerSalary) * (gapPercent / 100);

            quickWins.push({
                category: 'Superannuation',
                priority: 'High',
                title: 'Maximize Employer Super Contributions',
                description: `Your employer is only contributing ${employerSuperContribution}% super. The Super Guarantee is ${superConfig.SUPER_GUARANTEE_RATE.value * 100}% - you may be missing free money.`,
                actions: ['Contact HR about super contributions', 'Verify your employment contract', 'Consider salary sacrifice'],
                estimatedImpact: formatCurrency(gapAmount * config.ESTIMATES.EMPLOYER_SUPER_GAP_MULTIPLIER.value),
                timeToImplement: config.TIME_THRESHOLDS.SAME_DAY.value / 4, // Quarter of same-day threshold
                difficulty: 'Very Easy',
                confidence: 95
            });
        }

        // Quick Win 2: Use unused concessional cap
        const unusedCap = calculateUnusedConcessionalCap(this.inputs);
        const unusedThreshold = config.IMPACT_THRESHOLDS.LOW_IMPACT.value;
        if (unusedCap > unusedThreshold) {
            quickWins.push({
                category: 'Tax & Super',
                priority: 'High',
                title: 'Utilize Unused Concessional Super Cap',
                description: `You have ${formatCurrency(unusedCap)} unused concessional super cap. This is a 15% tax advantage vs your marginal rate.`,
                actions: ['Set up salary sacrifice', 'Make personal deductible contribution', 'Consult financial advisor'],
                estimatedImpact: formatCurrency(unusedCap * config.ESTIMATES.TAX_SAVINGS_MULTIPLIER.value),
                timeToImplement: config.TIME_THRESHOLDS.WITHIN_WEEK.value / 13, // ~14 days
                difficulty: 'Easy',
                confidence: 90
            });
        }

        // Quick Win 3: High-interest debt elimination
        if (this.inputs.hasDebt === 'high' || this.inputs.hasDebt === 'moderate') {
            quickWins.push({
                category: 'Debt Management',
                priority: 'High',
                title: 'Prioritize High-Interest Debt Elimination',
                description: 'High-interest debt (credit cards, personal loans) typically costs 15-25% annually - higher than investment returns.',
                actions: ['List all debts by interest rate', 'Pay minimums + focus extra on highest rate', 'Consider debt consolidation'],
                estimatedImpact: formatCurrency(config.ESTIMATES.DEBT_ELIMINATION_ESTIMATE.value),
                timeToImplement: config.TIME_THRESHOLDS.SAME_DAY.value,
                difficulty: 'Easy',
                confidence: 85
            });
        }

        // Quick Win 4: Emergency fund establishment
        if (this.inputs.hasEmergencyFund === 'none' || this.inputs.hasEmergencyFund === 'minimal') {
            quickWins.push({
                category: 'Financial Security',
                priority: 'Medium',
                title: 'Build Emergency Fund',
                description: 'Emergency fund prevents early super access and provides financial security. Aim for 3-6 months expenses.',
                actions: ['Calculate monthly expenses', 'Set up automatic savings', 'Use high-interest savings account'],
                estimatedImpact: formatCurrency(config.ESTIMATES.EMERGENCY_FUND_VALUE.value),
                timeToImplement: config.TIME_THRESHOLDS.SAME_DAY.value,
                difficulty: 'Easy',
                confidence: 80
            });
        }

        // Quick Win 5: Investment fee audit
        quickWins.push({
            category: 'Investment Optimization',
            priority: 'Medium',
            title: 'Audit Investment Fees',
            description: 'High fees compound over time. Even 0.5% difference in fees can cost tens of thousands over decades.',
            actions: ['Review super fund fees', 'Compare investment platform costs', 'Consider low-cost index funds'],
            estimatedImpact: formatCurrency(config.ESTIMATES.FEE_AUDIT_SAVINGS.value),
            timeToImplement: config.TIME_THRESHOLDS.WITHIN_WEEK.value / 13, // ~14 days
            difficulty: 'Easy',
            confidence: 75
        });

        // Quick Win 6: Tax-efficient investment allocation
        const savingsThreshold = config.IMPACT_THRESHOLDS.HIGH_IMPACT.value;
        if (currentSavings > savingsThreshold) {
            quickWins.push({
                category: 'Tax Optimization',
                priority: 'Medium',
                title: 'Optimize Asset Location for Tax',
                description: 'Hold growth assets outside super for CGT discount, income-producing assets in super for tax efficiency.',
                actions: ['Review current allocation', 'Move growth stocks outside super', 'Hold bonds/REITs in super'],
                estimatedImpact: formatCurrency(config.ESTIMATES.TAX_LOCATION_SAVINGS.value),
                timeToImplement: config.TIME_THRESHOLDS.SAME_DAY.value / 4, // ~7 days
                difficulty: 'Moderate',
                confidence: 70
            });
        }

        // Calculate actual Quick Win scores for each suggestion
        return quickWins.map(qw => ({
            ...qw,
            quickWinScore: this.calculateQuickWinScore(qw)
        })).filter(qw => qw.quickWinScore >= config.QUICK_WIN_THRESHOLD.value);
    }

    async generateActionableRiskAnalysis(baselineResults) {
        if (!baselineResults || !baselineResults.paths) {
            return {
                riskAnalysis: {
                    successRate: this.results.successRate || 0,
                    depletionAge: 'N/A',
                    depletionPercent: 100 - ((this.results.successRate || 0) * 100),
                    keyRisk: 'Run a full Monte Carlo simulation for detailed risk analysis.'
                },
                topImprovements: []
            };
        }

        const { successRate, paths, median } = baselineResults;

        // 1. Analyze Failure Scenarios
        const failurePaths = paths.filter(path => path[path.length - 1].endBalance < 0);
        const depletionPercent = (failurePaths.length / paths.length) * 100;
        let medianDepletionAge = 'N/A';
        if (failurePaths.length > 0) {
            const depletionAges = failurePaths.map(path => {
                const depletionPoint = path.find(year => year.endBalance < 0);
                return depletionPoint ? depletionPoint.age : this.inputs.yourLifespan;
            });
            depletionAges.sort((a, b) => a - b);
            medianDepletionAge = depletionAges[Math.floor(depletionAges.length / 2)];
        }

        const riskAnalysis = {
            successRate: successRate,
            depletionAge: medianDepletionAge,
            depletionPercent: depletionPercent,
            keyRisk: this.inputs.returnVolatility > 15 ? 'High market volatility' : 'Healthcare cost inflation'
        };

        // 2. Run "What-If" Scenarios for Top Improvements
        const improvements = [];
        const baseSuccessRate = successRate;

        // Scenario 1: Increase Contributions
        const fortnightlyIncrease = 200;
        const monthlyIncrease = fortnightlyIncrease * 26 / 12;
        const contributionInputs = { ...this.inputs, monthlyStockContribution: this.inputs.monthlyStockContribution + monthlyIncrease };
        const contributionResult = await this.simulator.runMonteCarloSimulation(contributionInputs, 500);
        if (contributionResult.successRate > baseSuccessRate) {
            improvements.push({
                title: `Increase contributions by ${formatCurrency(fortnightlyIncrease)}/fortnight`,
                newSuccessRate: contributionResult.successRate,
                cost: `Cost: ${formatCurrency(fortnightlyIncrease * 26)}/year now`,
                benefit: `Benefit: ${formatCurrency(contributionResult.median - median)} extra by retirement`
            });
        }

        // Scenario 2: Delay Retirement
        const retirementInputs = { ...this.inputs, retirementAge: this.inputs.retirementAge + 2 };
        const retirementResult = await this.simulator.runMonteCarloSimulation(retirementInputs, 500);
         if (retirementResult.successRate > baseSuccessRate) {
            improvements.push({
                title: `Delay retirement by 2 years`,
                newSuccessRate: retirementResult.successRate,
                cost: `Cost: 2 more years of work`,
                benefit: `Benefit: ${formatCurrency(retirementResult.median - median)} extra by retirement`
            });
        }

        // Scenario 3: Part-time work in retirement
        const workIncome = 20000;
        const workInputs = { ...this.inputs, partTimeWorkIncome: workIncome };
        const workResult = await this.simulator.runMonteCarloSimulation(workInputs, 500);
         if (workResult.successRate > baseSuccessRate) {
            improvements.push({
                title: `Part-time work age ${this.inputs.retirementAge}-${this.inputs.retirementAge + 2} (${formatCurrency(workIncome)}/year)`,
                newSuccessRate: workResult.successRate,
                cost: `Cost: Part-time work for 3 years`,
                benefit: `Adds ${formatCurrency(workIncome * 3)} cash + delays drawdown`
            });
        }

        // Rank improvements and get top 3
        const topImprovements = improvements
            .sort((a, b) => b.newSuccessRate - a.newSuccessRate)
            .slice(0, 3)
            .map(imp => ({
                ...imp,
                successRateChange: imp.newSuccessRate - baseSuccessRate
            }));

        return { riskAnalysis, topImprovements };
    }

    async generateSensitivityAnalysis() {
        const baselineResult = this.simulator.simulateRetirement(this.inputs);
        const baselineBalance = baselineResult.totalFinancialAssets;

        const scenarios = [
            { name: 'Return Rate Assumption', key: 'investmentReturn', change: 0.01, type: 'absolute', unit: '%' },
            { name: 'Healthcare Costs Inflation', key: 'healthcareInflation', change: 0.02, type: 'absolute', unit: '%' },
            { name: 'Property Sale Timing', key: 'sellPropertyYears', change: 5, type: 'absolute', unit: ' years' },
            { name: 'Aged Care Timing', key: 'agedCareStartAge', change: 2, type: 'absolute', unit: ' years' },
            { name: 'Contribution Increase', key: 'monthlyStockContribution', change: 217, type: 'up-only', unit: '/month' } // ~$100/fn
        ];

        let results = [];

        for (const scenario of scenarios) {
            let upResult, downResult;
            let impact;
            let description;

            if (scenario.type === 'absolute') {
                const upInputs = { ...this.inputs, [scenario.key]: this.inputs[scenario.key] + scenario.change };
                const downInputs = { ...this.inputs, [scenario.key]: this.inputs[scenario.key] - scenario.change };
                upResult = this.simulator.simulateRetirement(upInputs);
                downResult = this.simulator.simulateRetirement(downInputs);
                impact = Math.abs(upResult.totalFinancialAssets - downResult.totalFinancialAssets) / 2;
                 description = `A ±${scenario.change > 1 ? scenario.change : formatPercent(scenario.change, 0)}${scenario.unit} change results in a ~${formatCurrency(impact)} difference in your final balance.`;
            } else if (scenario.type === 'up-only') {
                const upInputs = { ...this.inputs, [scenario.key]: this.inputs[scenario.key] + scenario.change };
                upResult = this.simulator.simulateRetirement(upInputs);
                impact = Math.abs(upResult.totalFinancialAssets - baselineBalance);
                description = `A +${formatCurrency(scenario.change)}${scenario.unit} change results in a ~${formatCurrency(impact)} difference in your final balance.`;
            }

            if (impact > 0) {
                 results.push({
                    name: scenario.name,
                    impact: impact,
                    description: description
                });
            }
        }

        return results.sort((a, b) => b.impact - a.impact);
    }

    async generateVisceralScenarios(baselineResults) {
        const scenarios = [];

        // 1. Current Plan (Baseline)
        scenarios.push({
            name: 'Current Plan',
            successRate: baselineResults.successRate,
            retirementIncome: this.getMedianRetirementIncome(baselineResults.paths),
            depletionAge: this.getMedianDepletionAge(baselineResults.paths, baselineResults.successRate),
            summary: `You risk running out at ${this.getMedianDepletionAge(baselineResults.paths, baselineResults.successRate, true)}`
        });

        // 2. +$200/fn contributions
        const fortnightlyIncrease = 200;
        const monthlyIncrease = (fortnightlyIncrease * 26) / 12;
        const contributionInputs = { ...this.inputs, monthlyStockContribution: this.inputs.monthlyStockContribution + monthlyIncrease };
        const contributionResult = await this.simulator.runMonteCarloSimulation(contributionInputs, 500);
        scenarios.push({
            name: `+$200/fn contributions`,
            successRate: contributionResult.successRate,
            retirementIncome: this.getMedianRetirementIncome(contributionResult.paths),
            depletionAge: this.getMedianDepletionAge(contributionResult.paths, contributionResult.successRate),
            summary: "Comfortable through life"
        });

        // 3. Delay retirement 2yrs
        const delayInputs = { ...this.inputs, retirementAge: this.inputs.retirementAge + 2 };
        const delayResult = await this.simulator.runMonteCarloSimulation(delayInputs, 500);
        scenarios.push({
            name: 'Delay retirement 2yrs',
            successRate: delayResult.successRate,
            retirementIncome: this.getMedianRetirementIncome(delayResult.paths),
            depletionAge: this.getMedianDepletionAge(delayResult.paths, delayResult.successRate),
            summary: "Very secure outcome"
        });

        // 4. Sell property now
        if (this.inputs.hasInvestmentProperty) {
            const sellNowInputs = { ...this.inputs, sellPropertyYears: 0 };
            const sellNowResult = await this.simulator.runMonteCarloSimulation(sellNowInputs, 500);
            scenarios.push({
                name: 'Sell property now',
                successRate: sellNowResult.successRate,
                retirementIncome: this.getMedianRetirementIncome(sellNowResult.paths),
                depletionAge: this.getMedianDepletionAge(sellNowResult.paths, sellNowResult.successRate),
                summary: "⚠️ Higher risk - don't do this"
            });
        }

        return scenarios;
    }

    getMedianRetirementIncome(paths) {
        if (!paths || paths.length === 0) return 0;
        const sortedPaths = [...paths].sort((a, b) => {
            const lastA = a[a.length - 1].endBalance;
            const lastB = b[b.length - 1].endBalance;
            return lastB - lastA;
        });
        const medianPath = sortedPaths[Math.floor(sortedPaths.length / 2)];

        // Find the first year of retirement in the median path
        const retirementYearData = medianPath.find(y => y.age >= this.inputs.retirementAge);
        return retirementYearData ? retirementYearData.withdrawal : 0;
    }

    getMedianDepletionAge(paths, successRate, getAgeOnly = false) {
        const failureRate = 1 - successRate;
        if (failureRate < 0.01) { // Essentially 100% success
            return "90+";
        }

        const failurePaths = paths.filter(path => path[path.length - 1].endBalance <= 0);
        if (failurePaths.length === 0) {
            return "90+";
        }

        const depletionAges = failurePaths.map(path => {
            const depletionPoint = path.find(year => year.endBalance < 0);
            return depletionPoint ? depletionPoint.age : this.inputs.yourLifespan;
        });
        depletionAges.sort((a, b) => a - b);
        const medianAge = depletionAges[Math.floor(depletionAges.length / 2)];

        if (getAgeOnly) {
            return `age ${medianAge}`;
        }

        return `Age ${medianAge} (${(failureRate * 100).toFixed(0)}% risk)`;
    }

    getHealthCheckMetrics() {
        const { inputs, results } = this;

        // Validate inputs
        if (!inputs) {
            console.error('Missing inputs for health check metrics');
            return this.getDefaultHealthCheckMetrics();
        }
        if (!results || !results.yearlyData) {
            // Return default/error state if results are not available
            return {
                savingsRate: { status: '⚪', text: 'Awaiting calculation...', value: 'N/A' },
                pensionOptimization: { status: '⚪', text: 'Awaiting calculation...', value: 'N/A' },
                assetAllocation: { status: '⚪', text: 'Awaiting calculation...', value: 'N/A' },
                contributionCaps: { status: '⚪', text: 'Awaiting calculation...', value: 'N/A' },
                taxEfficiency: { status: '⚪', text: 'Awaiting calculation...', value: 'N/A' },
                riskCoverage: { status: '⚪', text: 'Awaiting calculation...', value: 'N/A' },
            };
        }

        const healthCheckConfig = ENHANCED_CONFIG.HEALTH_CHECK;
        const metrics = {};

        // 1. Savings Rate
        const savingsRate = inputs.percentIncomeSaved * 100;
        let savingsStatus = '🔴';
        let savingsText = `At ${savingsRate.toFixed(1)}%, this is below the recommended 10-15% for a strong retirement outlook.`;
        if (savingsRate >= healthCheckConfig.SAVINGS_RATE.GOOD) {
            savingsStatus = '🟢';
            savingsText = `Your ${savingsRate.toFixed(1)}% savings rate is excellent and on target.`;
        } else if (savingsRate >= healthCheckConfig.SAVINGS_RATE.OK) {
            savingsStatus = '🟡';
            savingsText = `Your ${savingsRate.toFixed(1)}% savings rate is a good start, but aiming for 10-15% will improve your outcome.`;
        }
        metrics.savingsRate = {
            status: savingsStatus,
            text: savingsText,
            value: `${savingsRate.toFixed(1)}%`
        };

        // 2. Age Pension Optimization
        const lastYearProjection = results.yearlyData[results.yearlyData.length - 2] || { pensionIncome: 0, endBalance: 0 };
        const pensionIncome = lastYearProjection.pensionIncome;
        let pensionStatus = '🟡';
        let pensionText = 'Your assets are within the pension taper rate zone.';
        if (pensionIncome === 0 && lastYearProjection.endBalance > inputs.pensionAssetLimit) {
            pensionStatus = '🟢';
            pensionText = 'You are not relying on the Age Pension, which is a strong position.';
        } else if (pensionIncome > 0 && lastYearProjection.endBalance < inputs.pensionAssetThreshold) {
            pensionStatus = '🟢';
            pensionText = 'You are positioned to receive the full Age Pension.';
        } else if (lastYearProjection.endBalance > inputs.pensionAssetLimit * 0.9 && lastYearProjection.endBalance < inputs.pensionAssetLimit * 1.1) {
            pensionStatus = '🔴';
            pensionText = `Your assets are just over the limit, costing you pension payments. A small reduction could yield significant benefits.`;
        }
        metrics.pensionOptimization = {
            status: pensionStatus,
            text: pensionText,
            value: 'Efficiency'
        };

        // 3. Asset Allocation
        const recommendedEquity = Math.max(30, 110 - inputs.yourCurrentAge);
        const actualEquity = inputs.riskTolerance * 10; // Simple proxy
        const allocationDiff = Math.abs(recommendedEquity - actualEquity);
        let allocationStatus = '🔴';
        let allocationText = `Your allocation seems misaligned with an age-appropriate strategy.`;
        if (allocationDiff <= healthCheckConfig.ASSET_ALLOCATION.GOOD) {
            allocationStatus = '🟢';
            allocationText = 'Your asset allocation is appropriate for your age.';
        } else if (allocationDiff <= healthCheckConfig.ASSET_ALLOCATION.OK) {
            allocationStatus = '🟡';
            allocationText = 'Your allocation could be moderately adjusted for your age.';
        }
        metrics.assetAllocation = {
            status: allocationStatus,
            text: allocationText,
            value: 'Appropriate'
        };

        // 4. Contribution Caps
        const concessionalCap = healthCheckConfig.CONTRIBUTION_CAPS.CONCESSIONAL_CAP;
        const currentConcessional = (inputs.yourSalary * inputs.employerSuperContribution) + (inputs.partnerSalary * inputs.employerSuperContribution);
        const unusedCap = concessionalCap * (inputs.isSingleCalculation ? 1 : 2) - currentConcessional;
        let capStatus = '🔴';
        let capText = `You are significantly underutilizing your concessional contribution cap by ~${formatCurrency(unusedCap)}.`;
        if (unusedCap <= healthCheckConfig.CONTRIBUTION_CAPS.GOOD) {
            capStatus = '🟢';
            capText = 'You are effectively using your concessional contribution cap.';
        } else if (unusedCap <= healthCheckConfig.CONTRIBUTION_CAPS.OK) {
            capStatus = '🟡';
            capText = `You have ~${formatCurrency(unusedCap)} of unused concessional cap space.`;
        }
        metrics.contributionCaps = {
            status: capStatus,
            text: capText,
            value: 'Utilized'
        };

        // 5. Tax Efficiency
        let taxStatus = '🟢';
        let taxText = 'Your tax situation appears efficient.';
        if (inputs.yourSalary > healthCheckConfig.TAX_EFFICIENCY.DIV293_THRESHOLD || inputs.partnerSalary > healthCheckConfig.TAX_EFFICIENCY.DIV293_THRESHOLD) {
            taxStatus = '🔴';
            taxText = `Division 293 tax is impacting your super contributions. Consider strategies to reduce taxable income.`;
        } else if (inputs.nonConcessionalContribution > 0 && unusedCap > ENHANCED_CONFIG.UNUSED_CAP_THRESHOLD) {
            taxStatus = '🟡';
            taxText = 'Consider maximizing concessional contributions before making non-concessional ones for better tax outcomes.';
        }
        metrics.taxEfficiency = {
            status: taxStatus,
            text: taxText,
            value: 'Efficient'
        };

        // 6. Risk Coverage
        let riskStatus = '🔴';
        let riskText = 'Your plan does not seem to account for healthcare or aged care costs.';
        if (inputs.agedCareProbability > 0 && inputs.currentHealthcareCosts > 0) {
            riskStatus = '🟢';
            riskText = 'Your plan includes provisions for healthcare and aged care.';
        } else if (inputs.agedCareProbability > 0 || inputs.currentHealthcareCosts > 0) {
            riskStatus = '🟡';
            riskText = 'Your plan partially covers future health risks, but could be more comprehensive.';
        }
        metrics.riskCoverage = {
            status: riskStatus,
            text: riskText,
            value: 'Included'
        };

        return metrics;
    }

    // Default health check metrics for error cases
    getDefaultHealthCheckMetrics() {
        return {
            savingsRate: { status: '⚪', text: 'Unable to calculate - please check your inputs', value: 'N/A' },
            pensionOptimization: { status: '⚪', text: 'Unable to calculate - please check your inputs', value: 'N/A' },
            assetAllocation: { status: '⚪', text: 'Unable to calculate - please check your inputs', value: 'N/A' },
            contributionCaps: { status: '⚪', text: 'Unable to calculate - please check your inputs', value: 'N/A' },
            taxEfficiency: { status: '⚪', text: 'Unable to calculate - please check your inputs', value: 'N/A' },
            riskCoverage: { status: '⚪', text: 'Unable to calculate - please check your inputs', value: 'N/A' },
        };
    }
}
