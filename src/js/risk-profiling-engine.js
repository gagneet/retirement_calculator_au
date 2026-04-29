// risk-profiling-engine.js - Advanced Three-Dimensional Risk Assessment Engine
// Comprehensive risk assessment covering capacity, tolerance, and requirement

import { ENHANCED_FINANCIAL_CONFIG } from './enhanced-config.js';
import { formatCurrency, formatPercent } from './utils.js';

export class RiskProfilingEngine {
    constructor(config) {
        this.config = config;
        this.financialConfig = ENHANCED_FINANCIAL_CONFIG;

        // Three-dimensional risk framework
        this.riskDimensions = {
            capacity: {
                name: "Risk Capacity",
                description: "Your objective ability to take investment risk based on financial situation",
                weight: 0.4,
                factors: ["income", "assets", "timeHorizon", "emergencyFund", "debt", "dependents"]
            },
            tolerance: {
                name: "Risk Tolerance",
                description: "Your emotional comfort level with investment volatility and losses",
                weight: 0.3,
                factors: ["personality", "experience", "reactionToLoss", "sleepTest", "marketHistory"]
            },
            requirement: {
                name: "Risk Requirement",
                description: "The level of risk needed to achieve your retirement goals",
                weight: 0.3,
                factors: ["retirementGap", "inflationImpact", "timePressure", "goalAmbition"]
            }
        };

        // Risk scoring rubrics
        this.scoringRubrics = this.initializeRiskScoringRubrics();
    }

    // Initialize comprehensive risk scoring rubrics
    initializeRiskScoringRubrics() {
        // Rubrics are now sourced from the centralized enhanced config file
        return this.financialConfig.riskAssessment.RISK_SCORING_RUBRICS;
    }

    // Comprehensive three-dimensional risk assessment
    assessComprehensiveRisk(inputs, monteCarloResults = null) {
        const assessment = {
            overallScore: 0,
            riskProfile: "moderate",
            dimensions: {},
            recommendations: [],
            riskMisalignment: null,
            optimalAllocation: null,
            confidenceLevel: 0
        };

        // Assess each risk dimension
        assessment.dimensions.capacity = this.assessRiskCapacity(inputs);
        assessment.dimensions.tolerance = this.assessRiskTolerance(inputs);
        assessment.dimensions.requirement = this.assessRiskRequirement(inputs, monteCarloResults);

        // Calculate weighted overall score
        assessment.overallScore = this.calculateWeightedRiskScore(assessment.dimensions);
        assessment.riskProfile = this.determineRiskProfile(assessment.overallScore);

        // Analyze risk misalignment between dimensions
        assessment.riskMisalignment = this.analyzeRiskMisalignment(assessment.dimensions);

        // Generate optimal asset allocation based on risk assessment
        assessment.optimalAllocation = this.generateOptimalAllocation(assessment);

        // Generate specific recommendations
        assessment.recommendations = this.generateRiskRecommendations(assessment, inputs);

        // Calculate confidence level in assessment
        assessment.confidenceLevel = this.calculateAssessmentConfidence(assessment, inputs);

        return assessment;
    }

    // Assess risk capacity - objective ability to take risk
    assessRiskCapacity(inputs) {
        const capacity = {
            score: 0,
            level: "moderate",
            factors: {},
            strengths: [],
            weaknesses: []
        };

        const totalIncome = (inputs.yourSalary || 0) + (inputs.partnerSalary || 0);
        const totalAssets = (inputs.yourCurrentSuper || 0) + (inputs.partnerCurrentSuper || 0) +
            (inputs.currentSavings || 0) + (inputs.currentStocks || 0);
        const yearsToRetirement = Math.max(0, (inputs.retirementAge || 67) - (inputs.yourCurrentAge || 30));
        const dependents = (inputs.children || 0) + (inputs.dependentParents || 0);

        // Income assessment
        capacity.factors.income = this.scoreRiskFactor('capacity', 'income', totalIncome);

        // Asset level assessment (relative to expenses)
        const estimatedAnnualExpenses = totalIncome * 0.7; // Assume 70% of income as expenses
        const assetRatio = estimatedAnnualExpenses > 0 ? totalAssets / estimatedAnnualExpenses : 0;
        capacity.factors.assets = this.scoreRiskFactorByRatio('capacity', 'assets', assetRatio);

        // Time horizon assessment
        capacity.factors.timeHorizon = this.scoreRiskFactorByYears('capacity', 'timeHorizon', yearsToRetirement);

        // Emergency fund assessment
        const emergencyFundMonths = inputs.emergencyFundMonths ||
            (inputs.hasEmergencyFund === 'full' ? 6 : inputs.hasEmergencyFund === 'partial' ? 3 : 0);
        capacity.factors.emergencyFund = this.scoreRiskFactorByMonths('capacity', 'emergencyFund', emergencyFundMonths);

        // Debt assessment
        const totalDebt = (inputs.mortgageBalance || 0) + (inputs.propertyLoan || 0) + (inputs.otherDebt || 0);
        const debtToIncomeRatio = totalIncome > 0 ? totalDebt / totalIncome : 0;
        capacity.factors.debt = this.scoreRiskFactorByRatio('capacity', 'debt', debtToIncomeRatio);

        // Dependents assessment
        capacity.factors.dependents = this.scoreRiskFactorByCount('capacity', 'dependents', dependents);

        // Calculate weighted capacity score
        const factorWeights = { income: 0.25, assets: 0.25, timeHorizon: 0.20, emergencyFund: 0.15, debt: 0.10, dependents: 0.05 };
        capacity.score = Object.keys(capacity.factors).reduce((total, factor) => {
            return total + (capacity.factors[factor].score * (factorWeights[factor] || 0));
        }, 0);

        capacity.level = this.determineRiskLevel(capacity.score);

        // Identify strengths and weaknesses
        capacity.strengths = Object.keys(capacity.factors).filter(f => capacity.factors[f].score >= 80);
        capacity.weaknesses = Object.keys(capacity.factors).filter(f => capacity.factors[f].score <= 40);

        return capacity;
    }

    // Assess risk tolerance - emotional comfort with risk
    assessRiskTolerance(inputs) {
        const tolerance = {
            score: 0,
            level: "moderate",
            factors: {},
            indicators: []
        };

        // Risk tolerance questionnaire responses
        const riskToleranceScore = inputs.riskTolerance || 50; // 0-100 scale

        // Reaction to loss assessment
        tolerance.factors.reactionToLoss = this.assessReactionToLoss(inputs.lossReaction || 'concerned');

        // Volatility comfort assessment
        const volatilityComfort = inputs.volatilityComfort || 0.15; // 15% default comfort level
        tolerance.factors.volatilityComfort = this.scoreVolatilityComfort(volatilityComfort);

        // Experience level assessment
        const investmentYears = inputs.investmentExperience || 2;
        tolerance.factors.experienceLevel = this.scoreRiskFactorByYears('tolerance', 'experienceLevel', investmentYears);

        // Market history understanding
        const marketUnderstanding = inputs.marketUnderstanding || 'moderate';
        tolerance.factors.marketHistoryUnderstanding = this.assessMarketUnderstanding(marketUnderstanding);

        // Calculate weighted tolerance score
        const factorWeights = { reactionToLoss: 0.3, volatilityComfort: 0.3, experienceLevel: 0.25, marketHistoryUnderstanding: 0.15 };
        tolerance.score = Object.keys(tolerance.factors).reduce((total, factor) => {
            return total + (tolerance.factors[factor].score * (factorWeights[factor] || 0));
        }, 0);

        // Adjust based on direct risk tolerance score
        tolerance.score = (tolerance.score * 0.7) + (riskToleranceScore * 0.3);

        tolerance.level = this.determineRiskLevel(tolerance.score);

        return tolerance;
    }

    // Assess risk requirement - need for risk to achieve goals
    assessRiskRequirement(inputs, monteCarloResults) {
        const requirement = {
            score: 0,
            level: "moderate",
            factors: {},
            justification: ""
        };

        // Retirement gap assessment
        const retirementGap = this.calculateRetirementGap(inputs, monteCarloResults);
        requirement.factors.retirementGap = this.scoreRetirementGap(retirementGap);

        // Inflation protection need
        const yearsInRetirement = Math.max(0, (inputs.yourLifespan || 85) - (inputs.retirementAge || 67));
        requirement.factors.inflationProtection = this.scoreRiskFactorByYears('requirement', 'inflationProtection', yearsInRetirement);

        // Time urgency assessment
        const yearsToRetirement = Math.max(0, (inputs.retirementAge || 67) - (inputs.yourCurrentAge || 30));
        requirement.factors.timeUrgency = this.scoreRiskFactorByYears('requirement', 'timeUrgency', yearsToRetirement);

        // Goal ambition assessment — prefer explicit desired income, then ASFA target, then 80% of salary
        const targetIncome = inputs.desiredRetirementIncome
            || inputs.asfaComfortable
            || ((inputs.yourSalary || 0) + (inputs.partnerSalary || 0)) * 0.8;
        const currentIncome = (inputs.yourSalary || 0) + (inputs.partnerSalary || 0);
        const replacementRatio = currentIncome > 0 ? targetIncome / currentIncome : 0.8;
        requirement.factors.goalAmbition = this.scoreGoalAmbition(replacementRatio);

        // Calculate weighted requirement score
        const factorWeights = { retirementGap: 0.4, inflationProtection: 0.2, timeUrgency: 0.3, goalAmbition: 0.1 };
        requirement.score = Object.keys(requirement.factors).reduce((total, factor) => {
            return total + (requirement.factors[factor].score * (factorWeights[factor] || 0));
        }, 0);

        requirement.level = this.determineRiskLevel(requirement.score);
        requirement.justification = this.generateRiskRequirementJustification(requirement.factors);

        return requirement;
    }

    // Calculate weighted overall risk score
    calculateWeightedRiskScore(dimensions) {
        const weights = this.riskDimensions;
        return (dimensions.capacity.score * weights.capacity.weight) +
            (dimensions.tolerance.score * weights.tolerance.weight) +
            (dimensions.requirement.score * weights.requirement.weight);
    }

    // Analyze misalignment between risk dimensions
    analyzeRiskMisalignment(dimensions) {
        const scores = {
            capacity: dimensions.capacity.score,
            tolerance: dimensions.tolerance.score,
            requirement: dimensions.requirement.score
        };

        const maxScore = Math.max(...Object.values(scores));
        const minScore = Math.min(...Object.values(scores));
        const scoreRange = maxScore - minScore;

        const misalignment = {
            severity: scoreRange > 30 ? 'high' : scoreRange > 15 ? 'moderate' : 'low',
            range: scoreRange,
            conflicts: [],
            recommendations: []
        };

        // Identify specific conflicts
        if (scores.capacity < scores.requirement - 20) {
            misalignment.conflicts.push({
                type: 'capacity_vs_requirement',
                description: 'Risk requirement exceeds risk capacity - goals may be unrealistic',
                priority: 'high'
            });
        }

        if (scores.tolerance < Math.max(scores.capacity, scores.requirement) - 25) {
            misalignment.conflicts.push({
                type: 'tolerance_constraint',
                description: 'Risk tolerance is limiting optimal strategy',
                priority: 'medium'
            });
        }

        if (scores.requirement < scores.capacity - 20 && scores.requirement < 60) {
            misalignment.conflicts.push({
                type: 'conservative_bias',
                description: 'May be too conservative given capacity and time horizon',
                priority: 'low'
            });
        }

        return misalignment;
    }

    // Generate optimal asset allocation based on risk assessment
    generateOptimalAllocation(assessment) {
        const overallScore = assessment.overallScore;
        const capacityScore = assessment.dimensions.capacity.score;
        const toleranceScore = assessment.dimensions.tolerance.score;
        const requirementScore = assessment.dimensions.requirement.score;

        // Use the most constraining dimension as the limiting factor
        const constrainingScore = Math.min(capacityScore, toleranceScore);

        // But consider requirement for minimum risk needed
        const effectiveScore = Math.max(constrainingScore, requirementScore * 0.7);

        // Generate allocation based on effective risk score
        let equityAllocation, bondAllocation, cashAllocation;

        if (effectiveScore >= 80) {
            equityAllocation = 85;
            bondAllocation = 12;
            cashAllocation = 3;
        } else if (effectiveScore >= 70) {
            equityAllocation = 75;
            bondAllocation = 20;
            cashAllocation = 5;
        } else if (effectiveScore >= 60) {
            equityAllocation = 65;
            bondAllocation = 25;
            cashAllocation = 10;
        } else if (effectiveScore >= 50) {
            equityAllocation = 55;
            bondAllocation = 30;
            cashAllocation = 15;
        } else if (effectiveScore >= 40) {
            equityAllocation = 45;
            bondAllocation = 35;
            cashAllocation = 20;
        } else {
            equityAllocation = 30;
            bondAllocation = 45;
            cashAllocation = 25;
        }

        return {
            equity: equityAllocation,
            bonds: bondAllocation,
            cash: cashAllocation,
            rationale: this.generateAllocationRationale(assessment, effectiveScore),
            expectedReturn: this.calculateExpectedReturn(equityAllocation, bondAllocation, cashAllocation),
            expectedVolatility: this.calculateExpectedVolatility(equityAllocation, bondAllocation, cashAllocation)
        };
    }

    // Helper methods for risk scoring
    scoreRiskFactor(dimension, factor, value) {
        const rubric = this.scoringRubrics[dimension][factor];

        for (const [level, criteria] of Object.entries(rubric.scoring)) {
            if (value >= criteria.threshold) {
                return {
                    score: criteria.score,
                    level,
                    description: criteria.description,
                    value
                };
            }
        }

        return { score: 20, level: 'veryLow', description: 'Below minimum threshold', value };
    }

    scoreRiskFactorByRatio(dimension, factor, ratio) {
        const rubric = this.scoringRubrics[dimension][factor];

        for (const [level, criteria] of Object.entries(rubric.scoring)) {
            if (ratio >= criteria.ratio) {
                return {
                    score: criteria.score,
                    level,
                    description: criteria.description,
                    value: ratio
                };
            }
        }

        return { score: 20, level: 'veryLow', description: 'Below minimum threshold', value: ratio };
    }

    scoreRiskFactorByYears(dimension, factor, years) {
        const rubric = this.scoringRubrics[dimension][factor];

        for (const [level, criteria] of Object.entries(rubric.scoring)) {
            if (years >= criteria.years) {
                return {
                    score: criteria.score,
                    level,
                    description: criteria.description,
                    value: years
                };
            }
        }

        return { score: 20, level: 'veryShort', description: 'Very limited time horizon', value: years };
    }

    determineRiskLevel(score) {
        if (score >= 80) return 'very high';
        if (score >= 70) return 'high';
        if (score >= 50) return 'moderate';
        if (score >= 30) return 'low';
        return 'very low';
    }

    determineRiskProfile(score) {
        if (score >= 80) return 'aggressive';
        if (score >= 70) return 'growth';
        if (score >= 50) return 'balanced';
        if (score >= 30) return 'conservative';
        return 'very conservative';
    }

    // Calculate retirement gap (simplified)
    calculateRetirementGap(inputs, monteCarloResults) {
        if (monteCarloResults && monteCarloResults.successRate !== undefined) {
            // If success rate is low, there's a significant gap
            return Math.max(0, (0.85 - monteCarloResults.successRate) * 2); // Convert to 0-1 scale
        }

        // Fallback calculation based on savings rate and goals
        const currentIncome = (inputs.yourSalary || 0) + (inputs.partnerSalary || 0);
        const targetRetirementIncome = inputs.desiredRetirementIncome || inputs.asfaComfortable || currentIncome * 0.8;
        const yearsToRetirement = Math.max(1, (inputs.retirementAge || 67) - (inputs.yourCurrentAge || 30));
        const currentSavings = (inputs.yourCurrentSuper || 0) + (inputs.partnerCurrentSuper || 0) +
            (inputs.currentSavings || 0) + (inputs.currentStocks || 0);

        // Rough calculation of retirement need (25x annual expenses rule)
        const retirementNeed = targetRetirementIncome * 25;
        const projectedSavings = currentSavings * Math.pow(1.07, yearsToRetirement); // 7% growth assumption

        const gap = Math.max(0, (retirementNeed - projectedSavings) / retirementNeed);
        return Math.min(1, gap); // Cap at 100% gap
    }

    // Generate comprehensive risk recommendations
    generateRiskRecommendations(assessment, inputs) {
        const recommendations = [];
        const misalignment = assessment.riskMisalignment;
        const dimensions = assessment.dimensions;

        // Address risk misalignment
        misalignment.conflicts.forEach(conflict => {
            if (conflict.type === 'capacity_vs_requirement') {
                recommendations.push({
                    category: 'risk_alignment',
                    priority: 'high',
                    title: 'Address Risk Capacity vs Requirement Gap',
                    description: 'Your retirement goals require more risk than your financial situation can handle.',
                    actions: [
                        'Consider extending your working years to improve capacity',
                        'Reduce retirement lifestyle expectations to lower risk requirement',
                        'Increase savings rate to improve financial capacity',
                        'Pay down high-interest debt to improve risk capacity'
                    ]
                });
            }
        });

        // Low capacity recommendations
        if (dimensions.capacity.score < 40) {
            const weaknesses = dimensions.capacity.weaknesses;
            if (weaknesses.includes('emergencyFund')) {
                recommendations.push({
                    category: 'risk_capacity',
                    priority: 'high',
                    title: 'Build Emergency Fund',
                    description: 'Inadequate emergency fund limits your ability to take investment risk.',
                    actions: [
                        'Build emergency fund to 3-6 months of expenses',
                        'Keep emergency funds in high-yield savings account',
                        'Prioritize emergency fund before aggressive investing'
                    ]
                });
            }
        }

        // Risk tolerance education
        if (dimensions.tolerance.score < 50 && dimensions.requirement.score > 60) {
            recommendations.push({
                category: 'risk_education',
                priority: 'medium',
                title: 'Improve Risk Tolerance Through Education',
                description: 'Your goals require more risk than you\'re comfortable with. Education can help.',
                actions: [
                    'Learn about historical market performance and long-term returns',
                    'Consider working with a financial advisor for guidance',
                    'Start with smaller risk exposures and gradually increase',
                    'Focus on diversification to reduce specific investment risks'
                ]
            });
        }

        // Optimal allocation recommendation
        recommendations.push({
            category: 'asset_allocation',
            priority: 'high',
            title: 'Optimal Asset Allocation Based on Risk Profile',
            description: `Based on your three-dimensional risk assessment, consider this allocation:`,
            allocation: assessment.optimalAllocation,
            actions: [
                `${assessment.optimalAllocation.equity}% in growth assets (stocks/property)`,
                `${assessment.optimalAllocation.bonds}% in defensive assets (bonds)`,
                `${assessment.optimalAllocation.cash}% in cash/term deposits`,
                'Review and rebalance annually to maintain target allocation'
            ]
        });

        return recommendations;
    }

    // Calculate expected return for allocation
    calculateExpectedReturn(equity, bonds, cash) {
        // Use base assumptions from config
        const equityReturn = 0.08; // 8% long-term equity return
        const bondReturn = 0.04;   // 4% long-term bond return
        const cashReturn = 0.025;  // 2.5% cash return

        return (equity/100 * equityReturn) + (bonds/100 * bondReturn) + (cash/100 * cashReturn);
    }

    // Calculate expected volatility for allocation
    calculateExpectedVolatility(equity, bonds, cash) {
        const equityVol = 0.16;   // 16% equity volatility
        const bondVol = 0.04;     // 4% bond volatility
        const cashVol = 0.01;     // 1% cash volatility

        // Simplified portfolio volatility (not accounting for correlations)
        return Math.sqrt(
            Math.pow(equity/100 * equityVol, 2) +
            Math.pow(bonds/100 * bondVol, 2) +
            Math.pow(cash/100 * cashVol, 2)
        );
    }

    // Generate summary for display
    generateRiskProfileSummary(inputs, monteCarloResults = null) {
        const assessment = this.assessComprehensiveRisk(inputs, monteCarloResults);

        return {
            overallRiskProfile: assessment.riskProfile,
            riskScore: Math.round(assessment.overallScore),
            dimensions: {
                capacity: {
                    score: Math.round(assessment.dimensions.capacity.score),
                    level: assessment.dimensions.capacity.level,
                    strengths: assessment.dimensions.capacity.strengths,
                    weaknesses: assessment.dimensions.capacity.weaknesses
                },
                tolerance: {
                    score: Math.round(assessment.dimensions.tolerance.score),
                    level: assessment.dimensions.tolerance.level
                },
                requirement: {
                    score: Math.round(assessment.dimensions.requirement.score),
                    level: assessment.dimensions.requirement.level
                }
            },
            misalignment: assessment.riskMisalignment,
            optimalAllocation: assessment.optimalAllocation,
            topRecommendations: assessment.recommendations.slice(0, 3),
            confidenceLevel: Math.round(assessment.confidenceLevel)
        };
    }

    // Additional helper methods
    calculateAssessmentConfidence(assessment, inputs) {
        // Calculate confidence based on completeness of data and consistency of dimensions
        let confidence = 50; // Base confidence

        // Data completeness factors
        const completenessFactors = [
            inputs.yourSalary, inputs.yourCurrentSuper, inputs.currentSavings,
            inputs.retirementAge, inputs.yourCurrentAge, inputs.riskTolerance
        ];
        const completeness = completenessFactors.filter(f => f !== undefined && f !== null).length / completenessFactors.length;
        confidence += completeness * 30;

        // Consistency between dimensions
        const dimensionScores = [
            assessment.dimensions.capacity.score,
            assessment.dimensions.tolerance.score,
            assessment.dimensions.requirement.score
        ];
        const maxDiff = Math.max(...dimensionScores) - Math.min(...dimensionScores);
        confidence += Math.max(0, 20 - (maxDiff / 5)); // Reduce confidence for large differences

        return Math.min(100, confidence);
    }

    // Additional scoring methods (abbreviated for brevity - would include full implementations)
    scoreRiskFactorByMonths(dimension, factor, months) {
        const rubric = this.scoringRubrics[dimension][factor];
        for (const [level, criteria] of Object.entries(rubric.scoring)) {
            if (months >= criteria.months) {
                return { score: criteria.score, level, description: criteria.description, value: months };
            }
        }
        return { score: 20, level: 'none', description: 'No emergency fund', value: months };
    }

    scoreRiskFactorByCount(dimension, factor, count) {
        const rubric = this.scoringRubrics[dimension][factor];
        for (const [level, criteria] of Object.entries(rubric.scoring)) {
            if (count <= criteria.count) {
                return { score: criteria.score, level, description: criteria.description, value: count };
            }
        }
        return { score: 20, level: 'significant', description: 'Significant obligations', value: count };
    }

    assessReactionToLoss(reaction) {
        const scores = {
            opportunistic: 100, calm: 80, concerned: 60, anxious: 40, panic: 20
        };
        return { score: scores[reaction] || 60, level: reaction, description: `${reaction} reaction to losses` };
    }

    scoreVolatilityComfort(comfort) {
        const rubric = this.scoringRubrics.tolerance.volatilityComfort;
        for (const [level, criteria] of Object.entries(rubric.scoring)) {
            if (comfort >= criteria.range) {
                return { score: criteria.score, level, description: criteria.description, value: comfort };
            }
        }
        return { score: 20, level: 'veryLow', description: 'Very low volatility tolerance', value: comfort };
    }

    assessMarketUnderstanding(understanding) {
        const scores = {
            excellent: 100, good: 80, moderate: 60, limited: 40, minimal: 20
        };
        return { score: scores[understanding] || 60, level: understanding, description: `${understanding} market understanding` };
    }

    scoreRetirementGap(gap) {
        const rubric = this.scoringRubrics.requirement.retirementGap;
        for (const [level, criteria] of Object.entries(rubric.scoring)) {
            if (gap >= criteria.gap) {
                return { score: criteria.score, level, description: criteria.description, value: gap };
            }
        }
        return { score: 20, level: 'surplus', description: 'On track with surplus', value: gap };
    }

    scoreGoalAmbition(replacementRatio) {
        const rubric = this.scoringRubrics.requirement.goalAmbition;
        for (const [level, criteria] of Object.entries(rubric.scoring)) {
            if (replacementRatio >= criteria.replacement) {
                return { score: criteria.score, level, description: criteria.description, value: replacementRatio };
            }
        }
        return { score: 20, level: 'basic', description: 'Basic retirement goals', value: replacementRatio };
    }

    generateRiskRequirementJustification(factors) {
        const gap = factors.retirementGap?.level || 'moderate';
        const time = factors.timeUrgency?.level || 'moderate';

        if (gap === 'critical' || gap === 'significant') {
            return `High risk requirement due to significant retirement funding gap requiring growth-oriented investments.`;
        } else if (time === 'urgent' || time === 'critical') {
            return `Elevated risk requirement due to limited time remaining to achieve retirement goals.`;
        } else {
            return `Moderate risk requirement with adequate time and reasonable funding trajectory.`;
        }
    }

    generateAllocationRationale(assessment, effectiveScore) {
        const capacity = assessment.dimensions.capacity.level;
        const tolerance = assessment.dimensions.tolerance.level;
        const requirement = assessment.dimensions.requirement.level;

        return `Allocation balances ${capacity} risk capacity, ${tolerance} risk tolerance, and ${requirement} risk requirement. ` +
            `Effective risk score of ${effectiveScore.toFixed(0)} suggests this balanced approach.`;
    }
}