// persona-intelligence.js - AI-Powered Persona-Based Recommendation Engine
// Provides contextual, personalized financial advice based on user profiles and situations

import { ENHANCED_CONFIG } from './config.js';
import { ENHANCED_FINANCIAL_CONFIG } from './enhanced-config.js';
import { formatCurrency, formatPercent } from './utils.js';

export class PersonaIntelligenceEngine {
    constructor(simulator) {
        this.simulator = simulator;
        this.config = ENHANCED_CONFIG;
        this.financialConfig = ENHANCED_FINANCIAL_CONFIG;

        // Define persona archetypes
        this.personas = this.initializePersonas();

        // Recommendation templates by category
        this.recommendationTemplates = this.initializeRecommendationTemplates();
    }

    // Initialize persona archetypes with characteristics and patterns
    initializePersonas() {
        return {
            high_earner_young: {
                name: "Young High Earner",
                description: "High income, early career, growth focused",
                criteria: {
                    age: { min: 20, max: 35 },
                    income: { min: 120000 },
                    super: { min: 50000 }
                },
                characteristics: {
                    riskTolerance: "high",
                    investmentHorizon: "long",
                    taxSensitivity: "high",
                    priorities: ["growth", "tax_efficiency", "super_optimization"]
                },
                commonChallenges: [
                    "High tax rates limiting take-home pay",
                    "Lifestyle inflation pressure",
                    "Investment property FOMO",
                    "Insufficient emergency funds despite high income"
                ],
                keyOpportunities: [
                    "Salary sacrifice optimization",
                    "High growth equity allocations",
                    "Negative gearing strategies",
                    "Long-term compound growth"
                ]
            },

            high_earner_established: {
                name: "Established High Earner",
                description: "Peak earning years, wealth accumulation focus",
                criteria: {
                    age: { min: 35, max: 50 },
                    income: { min: 150000 },
                    netWorth: { min: 200000 }
                },
                characteristics: {
                    riskTolerance: "moderate-high",
                    investmentHorizon: "medium-long",
                    taxSensitivity: "very_high",
                    priorities: ["wealth_preservation", "tax_minimization", "diversification"]
                },
                commonChallenges: [
                    "Complex tax optimization needs",
                    "Managing multiple investment properties",
                    "Balancing growth with preservation",
                    "Estate planning considerations"
                ],
                keyOpportunities: [
                    "Advanced super strategies",
                    "Investment property portfolio optimization",
                    "Tax-effective investment structures",
                    "Wealth protection strategies"
                ]
            },

            family_focused: {
                name: "Family Focused",
                description: "Supporting dependents, balanced priorities",
                criteria: {
                    dependents: { min: 1 },
                    age: { min: 30, max: 55 }
                },
                characteristics: {
                    riskTolerance: "moderate",
                    investmentHorizon: "medium",
                    priorities: ["security", "education_planning", "family_protection"]
                },
                commonChallenges: [
                    "Balancing current needs vs future savings",
                    "Education cost planning",
                    "Life insurance adequacy",
                    "Emergency fund prioritization"
                ],
                keyOpportunities: [
                    "Family tax benefits optimization",
                    "Education savings plans",
                    "Life insurance integration",
                    "Government benefits maximization"
                ]
            },

            property_investor: {
                name: "Property Investor",
                description: "Investment property focus, leverage strategies",
                criteria: {
                    hasInvestmentProperty: true,
                    propertyValue: { min: 300000 }
                },
                characteristics: {
                    riskTolerance: "high",
                    leverageComfort: "high",
                    priorities: ["property_growth", "cash_flow", "tax_benefits"]
                },
                commonChallenges: [
                    "Cash flow management",
                    "Interest rate sensitivity",
                    "Property market timing",
                    "Portfolio concentration risk"
                ],
                keyOpportunities: [
                    "Negative gearing optimization",
                    "Property portfolio diversification",
                    "Refinancing strategies",
                    "Capital gains tax planning"
                ]
            },

            pre_retiree_conservative: {
                name: "Pre-Retiree Conservative",
                description: "Approaching retirement, preservation focused",
                criteria: {
                    age: { min: 55, max: 67 },
                    yearsToRetirement: { max: 10 }
                },
                characteristics: {
                    riskTolerance: "low-moderate",
                    investmentHorizon: "short-medium",
                    priorities: ["capital_preservation", "income_generation", "retirement_readiness"]
                },
                commonChallenges: [
                    "Sequence of returns risk",
                    "Healthcare cost planning",
                    "Pension phase transition",
                    "Aged care preparation"
                ],
                keyOpportunities: [
                    "Pension phase super strategies",
                    "Age pension optimization",
                    "Healthcare cost modeling",
                    "Estate planning preparation"
                ]
            },

            business_owner: {
                name: "Business Owner",
                description: "Self-employed, irregular income patterns",
                criteria: {
                    businessIncome: { min: 1 },
                    irregularIncome: true
                },
                characteristics: {
                    riskTolerance: "high",
                    incomePredictability: "low",
                    priorities: ["business_growth", "tax_planning", "flexibility"]
                },
                commonChallenges: [
                    "Irregular income management",
                    "Business vs personal asset allocation",
                    "Complex tax structures",
                    "Succession planning needs"
                ],
                keyOpportunities: [
                    "Small business super contributions",
                    "Business asset protection",
                    "Tax planning strategies",
                    "Exit planning optimization"
                ]
            },

            balanced_accumulator: {
                name: "Balanced Accumulator",
                description: "Steady income, moderate approach, gradual wealth building",
                criteria: {
                    age: { min: 30, max: 55 },
                    income: { min: 60000, max: 120000 }
                },
                characteristics: {
                    riskTolerance: "moderate",
                    investmentHorizon: "medium-long",
                    priorities: ["steady_growth", "balance", "simplicity"]
                },
                commonChallenges: [
                    "Limited investment capital",
                    "Competing financial priorities",
                    "Investment complexity avoidance",
                    "Inflation protection needs"
                ],
                keyOpportunities: [
                    "Dollar-cost averaging strategies",
                    "Simple diversified portfolios",
                    "Regular contribution habits",
                    "Tax-effective growth options"
                ]
            }
        };
    }

    // Initialize recommendation templates
    initializeRecommendationTemplates() {
        return {
            super_optimization: {
                title: "Superannuation Optimization",
                categories: ["contributions", "allocation", "tax_planning"],
                templates: {
                    high_earner: "Consider maximizing concessional contributions to $30,000/year to reduce your marginal tax rate from {currentTaxRate} to 15%.",
                    family_focused: "Split super contributions with spouse if they earn less to utilize their lower tax brackets and build retirement security together.",
                    pre_retiree: "Transition to pension phase super to access tax-free earnings and potentially qualify for age pension benefits."
                }
            },

            investment_strategy: {
                title: "Investment Strategy Optimization",
                categories: ["allocation", "diversification", "growth"],
                templates: {
                    young_aggressive: "Your {yearsToRetirement}-year investment horizon allows for high-growth allocations. Consider {recommendedEquity}% equity allocation for maximum long-term growth.",
                    property_investor: "Balance your property-heavy portfolio with liquid assets. Consider REITs and international equities to reduce concentration risk.",
                    conservative_approach: "Focus on income-generating assets with {recommendedBonds}% in bonds and defensive assets to preserve capital."
                }
            },

            tax_planning: {
                title: "Tax Optimization Strategies",
                categories: ["tax_minimization", "structures", "timing"],
                templates: {
                    high_tax_bracket: "Your {currentTaxRate} marginal rate creates opportunities for salary sacrifice, negative gearing, and super contributions worth ${potentialSavings}/year.",
                    capital_gains: "Time asset sales carefully - hold investments >12 months for 50% CGT discount, potentially saving ${cgtSavings}.",
                    business_structure: "Consider family trust structures and business asset protection strategies for your irregular income profile."
                }
            },

            risk_management: {
                title: "Risk Management & Protection",
                categories: ["insurance", "emergency_funds", "diversification"],
                templates: {
                    family_protection: "With {dependents} dependents, ensure life insurance covers {recommendedCoverage} and income protection replaces 75% of salary.",
                    property_risk: "Your property investments represent {propertyPercentage}% of net worth. Consider reducing concentration risk through portfolio diversification.",
                    sequence_risk: "As you approach retirement, implement a 'bond ladder' strategy to protect against sequence of returns risk in early retirement years."
                }
            },

            retirement_planning: {
                title: "Retirement Strategy",
                categories: ["timing", "income", "lifestyle"],
                templates: {
                    early_retirement: "Based on your savings rate and projections, you could potentially retire at age {projectedRetirementAge} with {confidenceLevel}% confidence.",
                    lifestyle_planning: "Your desired retirement income of {desiredIncome} represents {replacementRatio}% of pre-retirement income - consider if this aligns with your lifestyle goals.",
                    age_pension_strategy: "Structure your assets to qualify for part age pension worth approximately ${agePensionValue}/year while preserving wealth."
                }
            }
        };
    }

    // Identify user persona based on inputs and characteristics
    identifyPersona(inputs, monteCarloResults = null) {
        const userAge = inputs.yourCurrentAge;
        const totalIncome = (inputs.yourSalary || 0) + (inputs.partnerSalary || 0);
        const totalSuper = (inputs.yourCurrentSuper || 0) + (inputs.partnerCurrentSuper || 0);
        const netWorth = totalSuper + (inputs.currentSavings || 0) + (inputs.currentStocks || 0);
        const yearsToRetirement = Math.max(0, (inputs.retirementAge || 67) - userAge);
        const dependents = (inputs.children || 0) + (inputs.dependentParents || 0);

        const scores = {};

        // Score each persona based on matching criteria
        for (const [personaKey, persona] of Object.entries(this.personas)) {
            let score = 0;
            const criteria = persona.criteria;

            // Age criteria
            if (criteria.age) {
                if (userAge >= (criteria.age.min || 0) && userAge <= (criteria.age.max || 100)) {
                    score += 25;
                }
            }

            // Income criteria
            if (criteria.income) {
                if (totalIncome >= (criteria.income.min || 0) &&
                    totalIncome <= (criteria.income.max || Infinity)) {
                    score += 20;
                }
            }

            // Super criteria
            if (criteria.super && totalSuper >= (criteria.super.min || 0)) {
                score += 15;
            }

            // Net worth criteria
            if (criteria.netWorth && netWorth >= (criteria.netWorth.min || 0)) {
                score += 15;
            }

            // Years to retirement criteria
            if (criteria.yearsToRetirement) {
                if (yearsToRetirement <= (criteria.yearsToRetirement.max || Infinity) &&
                    yearsToRetirement >= (criteria.yearsToRetirement.min || 0)) {
                    score += 15;
                }
            }

            // Dependents criteria
            if (criteria.dependents && dependents >= (criteria.dependents.min || 0)) {
                score += 20;
            }

            // Investment property criteria
            if (criteria.hasInvestmentProperty && inputs.hasInvestmentProperty) {
                score += 20;
            }

            if (criteria.propertyValue && inputs.hasInvestmentProperty &&
                (inputs.propertyValue || 0) >= (criteria.propertyValue.min || 0)) {
                score += 10;
            }

            scores[personaKey] = score;
        }

        // Find the best matching persona
        const bestMatch = Object.entries(scores).reduce((best, [key, score]) =>
            score > best.score ? { key, score, persona: this.personas[key] } : best,
            { key: null, score: -1, persona: null }
        );

        return {
            primaryPersona: bestMatch.persona,
            personaKey: bestMatch.key,
            matchScore: bestMatch.score,
            alternativePersonas: this.getAlternativePersonas(scores, bestMatch.key),
            userProfile: this.generateUserProfile(inputs, bestMatch.persona)
        };
    }

    // Get alternative personas for broader context
    getAlternativePersonas(scores, primaryKey) {
        return Object.entries(scores)
            .filter(([key]) => key !== primaryKey)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 2)
            .map(([key, score]) => ({
                key,
                persona: this.personas[key],
                score
            }));
    }

    // Generate detailed user profile
    generateUserProfile(inputs, persona) {
        const userAge = inputs.yourCurrentAge;
        const totalIncome = (inputs.yourSalary || 0) + (inputs.partnerSalings || 0);
        const totalSuper = (inputs.yourCurrentSuper || 0) + (inputs.partnerCurrentSuper || 0);
        const netWorth = totalSuper + (inputs.currentSavings || 0) + (inputs.currentStocks || 0);

        // Calculate key financial ratios
        const savingsRate = totalIncome > 0 ? ((inputs.monthlyInvestment || 0) * 12) / totalIncome : 0;
        const superPercentage = netWorth > 0 ? totalSuper / netWorth : 0;
        const yearsToRetirement = Math.max(0, (inputs.retirementAge || 67) - userAge);

        return {
            demographics: {
                age: userAge,
                yearsToRetirement,
                dependents: (inputs.children || 0) + (inputs.dependentParents || 0),
                relationshipStatus: inputs.isSingleCalculation ? "single" : "couple"
            },
            financial: {
                totalIncome,
                netWorth,
                savingsRate,
                superPercentage,
                hasInvestmentProperty: inputs.hasInvestmentProperty || false,
                monthlyInvestment: inputs.monthlyInvestment || 0
            },
            riskProfile: {
                capacity: this.simulator.calculateRiskCapacity(inputs),
                tolerance: inputs.riskTolerance || 50,
                timeHorizon: yearsToRetirement
            },
            goals: {
                retirementAge: inputs.retirementAge || 67,
                desiredIncome: inputs.desiredRetirementIncome || 0,
                currentPlan: inputs.retirementStrategy || "balanced"
            },
            personaAlignment: {
                primaryTraits: persona?.characteristics || {},
                challenges: persona?.commonChallenges || [],
                opportunities: persona?.keyOpportunities || []
            }
        };
    }

    // Generate persona-based recommendations
    generatePersonaRecommendations(inputs, monteCarloResults = null, scenarioResults = null) {
        const personaAnalysis = this.identifyPersona(inputs, monteCarloResults);
        const { primaryPersona, userProfile } = personaAnalysis;

        if (!primaryPersona) {
            return this.generateGenericRecommendations(inputs, monteCarloResults);
        }

        const recommendations = [];

        // Generate recommendations based on persona characteristics
        recommendations.push(...this.generateSuperOptimizationRecommendations(userProfile, primaryPersona));
        recommendations.push(...this.generateInvestmentStrategyRecommendations(userProfile, primaryPersona, monteCarloResults));
        recommendations.push(...this.generateTaxPlanningRecommendations(userProfile, primaryPersona));
        recommendations.push(...this.generateRiskManagementRecommendations(userProfile, primaryPersona));
        recommendations.push(...this.generateRetirementPlanningRecommendations(userProfile, primaryPersona, monteCarloResults));

        // Add persona-specific insights
        const insights = this.generatePersonaInsights(personaAnalysis, monteCarloResults);

        return {
            personaAnalysis,
            recommendations: this.prioritizeRecommendations(recommendations, userProfile),
            insights,
            actionPlan: this.generatePersonaActionPlan(recommendations, userProfile),
            nextSteps: this.generateNextSteps(recommendations, userProfile)
        };
    }

    // Generate superannuation optimization recommendations
    generateSuperOptimizationRecommendations(userProfile, persona) {
        const recommendations = [];
        const totalIncome = userProfile.financial.totalIncome;
        const superPercentage = userProfile.financial.superPercentage;

        if (totalIncome > 90000 && superPercentage < 0.6) {
            const potentialContribution = Math.min(27500, totalIncome * 0.1);
            const taxSaving = potentialContribution * (this.getMarginalTaxRate(totalIncome) - 0.15);

            recommendations.push({
                category: "super_optimization",
                priority: "high",
                title: "Maximize Concessional Super Contributions",
                description: `Increase super contributions to $${potentialContribution.toLocaleString()}/year to reduce tax from ${(this.getMarginalTaxRate(totalIncome) * 100).toFixed(0)}% to 15%.`,
                impact: `Save approximately $${taxSaving.toLocaleString()}/year in tax`,
                difficulty: "easy",
                timeframe: "immediate",
                personaRelevance: this.getPersonaRelevance(persona, "super_optimization")
            });
        }

        if (persona.characteristics.priorities?.includes("tax_efficiency") && !userProfile.demographics.relationshipStatus === "single") {
            recommendations.push({
                category: "super_optimization",
                priority: "medium",
                title: "Super Splitting Strategy",
                description: "Split super contributions with lower-earning spouse to optimize tax benefits and build balanced retirement savings.",
                impact: "Potentially reduce household tax burden and improve retirement balance",
                difficulty: "moderate",
                timeframe: "next_review"
            });
        }

        return recommendations;
    }

    // Generate investment strategy recommendations
    generateInvestmentStrategyRecommendations(userProfile, persona, monteCarloResults) {
        const recommendations = [];
        const riskCapacity = userProfile.riskProfile.capacity;
        const timeHorizon = userProfile.riskProfile.timeHorizon;

        // Asset allocation recommendations
        if (timeHorizon > 15 && riskCapacity > 60 && persona.characteristics.riskTolerance === "high") {
            recommendations.push({
                category: "investment_strategy",
                priority: "high",
                title: "Aggressive Growth Allocation",
                description: `With ${timeHorizon} years to retirement, consider 80-90% equity allocation for maximum long-term growth potential.`,
                impact: "Higher expected returns with increased volatility",
                difficulty: "easy",
                timeframe: "next_rebalance",
                personaRelevance: this.getPersonaRelevance(persona, "investment_strategy")
            });
        }

        // Property concentration risk
        if (userProfile.financial.hasInvestmentProperty && persona.name === "Property Investor") {
            recommendations.push({
                category: "investment_strategy",
                priority: "medium",
                title: "Diversify Beyond Property",
                description: "Balance property investments with liquid equities and international exposure to reduce concentration risk.",
                impact: "Lower portfolio volatility and improved diversification",
                difficulty: "moderate",
                timeframe: "6_months"
            });
        }

        return recommendations;
    }

    // Generate tax planning recommendations
    generateTaxPlanningRecommendations(userProfile, persona) {
        const recommendations = [];
        const totalIncome = userProfile.financial.totalIncome;
        const marginalRate = this.getMarginalTaxRate(totalIncome);

        if (marginalRate > 0.3 && persona.characteristics.taxSensitivity === "high") {
            recommendations.push({
                category: "tax_planning",
                priority: "high",
                title: "High-Income Tax Strategies",
                description: `At ${(marginalRate * 100).toFixed(0)}% marginal rate, explore salary sacrifice, negative gearing, and super contributions.`,
                impact: `Potential tax savings of $${(totalIncome * 0.05).toLocaleString()}/year`,
                difficulty: "moderate",
                timeframe: "tax_season"
            });
        }

        if (userProfile.financial.hasInvestmentProperty) {
            recommendations.push({
                category: "tax_planning",
                priority: "medium",
                title: "Property Tax Optimization",
                description: "Review negative gearing benefits and consider capital gains tax timing strategies.",
                impact: "Maximize tax-deductible expenses and optimize disposal timing",
                difficulty: "complex",
                timeframe: "annual_review"
            });
        }

        return recommendations;
    }

    // Generate risk management recommendations
    generateRiskManagementRecommendations(userProfile, persona) {
        const recommendations = [];
        const dependents = userProfile.demographics.dependents;
        const totalIncome = userProfile.financial.totalIncome;

        if (dependents > 0 && persona.characteristics.priorities?.includes("family_protection")) {
            const recommendedCoverage = totalIncome * 8; // 8x annual income
            recommendations.push({
                category: "risk_management",
                priority: "high",
                title: "Family Protection Insurance",
                description: `With ${dependents} dependents, ensure life insurance covers $${recommendedCoverage.toLocaleString()} and income protection replaces 75% of salary.`,
                impact: "Protect family financial security",
                difficulty: "moderate",
                timeframe: "immediate"
            });
        }

        // Emergency fund recommendations
        const emergencyFundNeeded = (userProfile.financial.monthlyInvestment + 5000) * 6; // 6 months expenses
        if (userProfile.financial.netWorth > 0) {
            recommendations.push({
                category: "risk_management",
                priority: "medium",
                title: "Emergency Fund Assessment",
                description: `Maintain $${emergencyFundNeeded.toLocaleString()} in accessible savings for unexpected expenses.`,
                impact: "Avoid investment liquidation during emergencies",
                difficulty: "easy",
                timeframe: "gradual"
            });
        }

        return recommendations;
    }

    // Generate retirement planning recommendations
    generateRetirementPlanningRecommendations(userProfile, persona, monteCarloResults) {
        const recommendations = [];
        const successRate = monteCarloResults?.successRate || 0.7;
        const yearsToRetirement = userProfile.demographics.yearsToRetirement;

        if (successRate < 0.8 && yearsToRetirement > 5) {
            recommendations.push({
                category: "retirement_planning",
                priority: "high",
                title: "Retirement Success Improvement",
                description: `Current plan has ${(successRate * 100).toFixed(0)}% success rate. Consider increasing contributions or delaying retirement by 2-3 years.`,
                impact: "Improve retirement security and success probability",
                difficulty: "moderate",
                timeframe: "ongoing"
            });
        }

        if (yearsToRetirement <= 10 && persona.characteristics.priorities?.includes("capital_preservation")) {
            recommendations.push({
                category: "retirement_planning",
                priority: "high",
                title: "Pre-Retirement Risk Reduction",
                description: "Gradually shift allocation toward income-generating assets to protect against sequence of returns risk.",
                impact: "Reduce portfolio volatility as retirement approaches",
                difficulty: "easy",
                timeframe: "gradual"
            });
        }

        return recommendations;
    }

    // Prioritize recommendations based on persona and user profile
    prioritizeRecommendations(recommendations, userProfile) {
        return recommendations
            .map(rec => ({
                ...rec,
                priorityScore: this.calculateRecommendationScore(rec, userProfile)
            }))
            .sort((a, b) => b.priorityScore - a.priorityScore);
    }

    // Calculate recommendation priority score
    calculateRecommendationScore(recommendation, userProfile) {
        let score = 0;

        // Base priority
        const priorityScores = { high: 100, medium: 60, low: 30 };
        score += priorityScores[recommendation.priority] || 30;

        // Timeframe urgency
        const timeframeScores = { immediate: 50, next_review: 30, "6_months": 20, gradual: 10 };
        score += timeframeScores[recommendation.timeframe] || 10;

        // Difficulty adjustment (easier = higher score)
        const difficultyScores = { easy: 20, moderate: 10, complex: 5 };
        score += difficultyScores[recommendation.difficulty] || 10;

        // Persona relevance boost
        if (recommendation.personaRelevance && recommendation.personaRelevance.relevant) {
            score += 25;
        }

        return score;
    }

    // Generate persona-specific insights
    generatePersonaInsights(personaAnalysis, monteCarloResults) {
        const { primaryPersona, userProfile } = personaAnalysis;
        const insights = [];

        // Persona strength insights
        insights.push({
            type: "strength",
            title: `${primaryPersona.name} Strengths`,
            description: `Your profile shows strong alignment with ${primaryPersona.description.toLowerCase()}. This suggests you're well-positioned for ${primaryPersona.characteristics.priorities.slice(0, 2).join(' and ')}.`,
            relevance: "high"
        });

        // Challenge insights
        if (primaryPersona.commonChallenges.length > 0) {
            insights.push({
                type: "challenge",
                title: "Typical Challenges for Your Profile",
                description: `People with similar profiles often face: ${primaryPersona.commonChallenges.slice(0, 2).join(', ')}. Our recommendations address these specific challenges.`,
                relevance: "high"
            });
        }

        // Opportunity insights
        if (primaryPersona.keyOpportunities.length > 0) {
            insights.push({
                type: "opportunity",
                title: "Key Opportunities",
                description: `Your situation presents opportunities for: ${primaryPersona.keyOpportunities.slice(0, 3).join(', ')}. These align with your risk profile and time horizon.`,
                relevance: "high"
            });
        }

        return insights;
    }

    // Generate persona-based action plan
    generatePersonaActionPlan(recommendations, userProfile) {
        const highPriority = recommendations.filter(r => r.priority === "high").slice(0, 3);
        const mediumPriority = recommendations.filter(r => r.priority === "medium").slice(0, 2);

        return {
            immediate: highPriority.filter(r => r.timeframe === "immediate"),
            next30Days: highPriority.filter(r => ["next_review", "tax_season"].includes(r.timeframe)),
            next90Days: mediumPriority.concat(highPriority.filter(r => r.timeframe === "6_months")),
            ongoing: recommendations.filter(r => r.timeframe === "gradual").slice(0, 2)
        };
    }

    // Generate next steps
    generateNextSteps(recommendations, userProfile) {
        const nextSteps = [];
        const highPriorityRecs = recommendations.filter(r => r.priority === "high").slice(0, 3);

        highPriorityRecs.forEach((rec, index) => {
            nextSteps.push({
                step: index + 1,
                action: rec.title,
                description: rec.description,
                timeframe: rec.timeframe,
                resources: this.getResourcesForRecommendation(rec)
            });
        });

        return nextSteps;
    }

    // Helper functions
    getMarginalTaxRate(income) {
        const brackets = this.config.TAX_BRACKETS;
        for (const bracket of brackets) {
            if (income >= bracket.min && income <= bracket.max) {
                return bracket.rate;
            }
        }
        return 0.45; // Top rate
    }

    getPersonaRelevance(persona, category) {
        return {
            relevant: persona.characteristics.priorities?.includes(category) || false,
            strength: persona.characteristics.priorities?.includes(category) ? "high" : "medium"
        };
    }

    getResourcesForRecommendation(recommendation) {
        const resourceMap = {
            super_optimization: ["ATO super contribution limits", "Salary sacrifice calculator", "Super fund comparison"],
            investment_strategy: ["Asset allocation guidelines", "Diversification tools", "Risk assessment"],
            tax_planning: ["Tax deduction checklist", "ATO guidance", "Professional tax advisor"],
            risk_management: ["Insurance calculator", "Emergency fund calculator", "Financial protection guide"],
            retirement_planning: ["Retirement calculator", "Age pension eligibility", "Retirement income streams"]
        };

        return resourceMap[recommendation.category] || ["Professional financial advisor", "Relevant ATO guidance"];
    }

    // Generate fallback generic recommendations if persona detection fails
    generateGenericRecommendations(inputs, monteCarloResults) {
        return {
            personaAnalysis: null,
            recommendations: [
                {
                    category: "general",
                    priority: "high",
                    title: "Review Investment Allocation",
                    description: "Ensure your investment mix aligns with your age and risk tolerance.",
                    impact: "Optimize risk-return balance",
                    difficulty: "easy",
                    timeframe: "next_review"
                }
            ],
            insights: [{
                type: "general",
                title: "Standard Financial Planning",
                description: "Consider consulting with a financial advisor for personalized advice based on your specific situation.",
                relevance: "medium"
            }],
            actionPlan: {
                immediate: [],
                next30Days: [],
                next90Days: [],
                ongoing: []
            },
            nextSteps: []
        };
    }
}