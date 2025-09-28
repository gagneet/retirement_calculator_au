// js/contextual-intelligence.js - Smart Contextual Guidance System

import { formatCurrency, formatPercent } from './utils.js';
import { ENHANCED_CONFIG } from './enhanced-config.js';

export default class ContextualIntelligenceSystem {
    constructor() {
        this.config = ENHANCED_CONFIG.contextualIntelligence;
        this.currentPersona = null;
        this.contextualAlerts = [];
        this.activeGuidance = [];
    }

    // Analyze user profile and determine primary persona
    analyzeUserPersona(inputs) {
        const personas = this.detectPersonas(inputs);

        // Primary persona is the one with the highest confidence score
        this.currentPersona = personas.reduce((highest, current) =>
            current.confidence > highest.confidence ? current : highest
        );

        return {
            primary: this.currentPersona,
            secondary: personas.filter(p => p !== this.currentPersona && p.confidence > 0.3),
            all: personas
        };
    }

    // Detect applicable personas based on user inputs
    detectPersonas(inputs) {
        const personas = [];
        const triggers = this.config.PERSONA_TRIGGERS;

        // High Earner Persona
        const totalIncome = (inputs.yourSalary || 0) + (inputs.partnerSalary || 0);
        if (totalIncome >= triggers.HIGH_EARNER_THRESHOLD.value) {
            const confidence = Math.min(1.0, totalIncome / (triggers.HIGH_EARNER_THRESHOLD.value * 2));
            personas.push({
                type: 'high_earner',
                name: 'High Earner Professional',
                confidence,
                description: 'Focus on tax optimization and wealth accumulation strategies',
                keyStrategies: [
                    'Maximize super contributions within caps',
                    'Consider investment property negative gearing',
                    'Optimize asset allocation between super and personal name',
                    'Explore family trust structures'
                ],
                riskProfile: 'moderate-aggressive',
                priorityAreas: ['tax_optimization', 'wealth_accumulation', 'estate_planning']
            });
        }

        // Business Owner Persona
        const businessAssets = inputs.businessActiveAssetValue || 0;
        if (businessAssets >= triggers.BUSINESS_OWNER_THRESHOLD.value || inputs.businessStructure !== 'none') {
            const confidence = businessAssets > 0 ?
                Math.min(1.0, businessAssets / triggers.BUSINESS_OWNER_THRESHOLD.value) : 0.7;
            personas.push({
                type: 'business_owner',
                name: 'Business Owner',
                confidence,
                description: 'Leverage business assets and structures for retirement planning',
                keyStrategies: [
                    'Utilize small business CGT concessions',
                    'Consider business succession planning',
                    'Optimize super contributions through business',
                    'Explore trust structures'
                ],
                riskProfile: 'moderate-aggressive',
                priorityAreas: ['business_succession', 'tax_structures', 'asset_protection']
            });
        }

        // Property Investor Persona
        const propertyCount = inputs.numberOfProperties || (inputs.hasInvestmentProperty ? 1 : 0);
        if (propertyCount >= triggers.PROPERTY_INVESTOR_THRESHOLD.value) {
            const confidence = Math.min(1.0, propertyCount / 3); // Max confidence at 3+ properties
            personas.push({
                type: 'property_investor',
                name: 'Property Investor',
                confidence,
                description: 'Property-focused wealth building and retirement strategy',
                keyStrategies: [
                    'Optimize property vs. super allocations',
                    'Consider property timing for retirement',
                    'Leverage negative gearing benefits',
                    'Plan for CGT on property sales'
                ],
                riskProfile: 'moderate',
                priorityAreas: ['property_optimization', 'debt_management', 'timing_strategies']
            });
        }

        // Late Starter Persona
        const currentAge = inputs.yourCurrentAge || 40;
        const totalSuper = (inputs.yourCurrentSuper || 0) + (inputs.partnerCurrentSuper || 0);
        if (currentAge >= triggers.LATE_STARTER_AGE_THRESHOLD.value &&
            totalSuper < triggers.LOW_SUPER_THRESHOLD.value) {
            const confidence = Math.min(1.0,
                (currentAge - triggers.LATE_STARTER_AGE_THRESHOLD.value) / 15 +
                (1 - totalSuper / triggers.LOW_SUPER_THRESHOLD.value)
            );
            personas.push({
                type: 'late_starter',
                name: 'Late Starter',
                confidence,
                description: 'Accelerated retirement planning with catch-up strategies',
                keyStrategies: [
                    'Maximize catch-up contributions',
                    'Consider working longer for additional security',
                    'Focus on debt elimination',
                    'Optimize Age Pension eligibility'
                ],
                riskProfile: 'conservative-moderate',
                priorityAreas: ['catch_up_contributions', 'debt_elimination', 'pension_optimization']
            });
        }

        // Age Pension Maximizer Persona (lower income/assets)
        const totalAssets = totalSuper + (inputs.currentSavings || 0) + (inputs.currentStocks || 0);
        const homeValue = inputs.homeValue || 0;
        const isLikelyPensionEligible = totalIncome < 80000 && totalAssets < 400000;

        if (isLikelyPensionEligible) {
            const confidence = 1.0 - (totalAssets / 600000); // Higher confidence with lower assets
            personas.push({
                type: 'pension_maximizer',
                name: 'Age Pension Maximizer',
                confidence: Math.max(0.3, confidence),
                description: 'Optimize retirement around Age Pension eligibility and benefits',
                keyStrategies: [
                    'Optimize assets to maximize Age Pension',
                    'Consider timing of asset sales',
                    'Utilize home exemption strategically',
                    'Plan healthcare cost coverage'
                ],
                riskProfile: 'conservative',
                priorityAreas: ['pension_optimization', 'asset_positioning', 'healthcare_planning']
            });
        }

        return personas.sort((a, b) => b.confidence - a.confidence);
    }

    // Generate contextual alerts based on user profile
    generateContextualAlerts(inputs, persona) {
        const alerts = [];
        const triggers = this.config.ALERT_TRIGGERS;

        // Low savings rate alert
        const savingsRate = inputs.percentIncomeSaved || 0;
        if (savingsRate < triggers.LOW_SAVINGS_RATE.value) {
            alerts.push({
                type: 'savings_rate',
                severity: 'high',
                title: 'Low Savings Rate Alert',
                message: `Your current savings rate of ${savingsRate}% is below recommended levels. Consider increasing to at least ${triggers.LOW_SAVINGS_RATE.value * 2}% for retirement security.`,
                actionRequired: true,
                quickFix: 'Set up automatic transfers to increase savings',
                personalizedFor: persona?.type || 'general'
            });
        }

        // High debt ratio alert
        const totalIncome = (inputs.yourSalary || 0) + (inputs.partnerSalary || 0);
        if (inputs.hasDebt === 'high' && totalIncome > 0) {
            alerts.push({
                type: 'debt_ratio',
                severity: 'high',
                title: 'High Debt Impact Alert',
                message: 'High debt levels significantly impact retirement planning. Prioritize debt elimination before increasing investments.',
                actionRequired: true,
                quickFix: 'List all debts and create elimination strategy',
                personalizedFor: persona?.type || 'general'
            });
        }

        // Emergency fund alert
        if (inputs.hasEmergencyFund === 'none' || inputs.hasEmergencyFund === 'minimal') {
            alerts.push({
                type: 'emergency_fund',
                severity: 'medium',
                title: 'Emergency Fund Gap',
                message: `Insufficient emergency fund increases retirement risk. Aim for ${triggers.INSUFFICIENT_EMERGENCY_FUND.value}-6 months of expenses.`,
                actionRequired: false,
                quickFix: 'Open high-interest savings account for emergencies',
                personalizedFor: persona?.type || 'general'
            });
        }

        // Late retirement planning alert
        const currentAge = inputs.yourCurrentAge || 40;
        if (currentAge >= triggers.LATE_RETIREMENT_START.value &&
            (inputs.yourCurrentSuper || 0) + (inputs.partnerCurrentSuper || 0) < 200000) {
            alerts.push({
                type: 'late_start',
                severity: 'high',
                title: 'Retirement Planning Urgency',
                message: `Starting retirement planning at ${currentAge} requires accelerated strategies. Time is your most limited resource.`,
                actionRequired: true,
                quickFix: 'Maximize super contributions immediately',
                personalizedFor: 'late_starter'
            });
        }

        // Persona-specific alerts
        if (persona) {
            alerts.push(...this.generatePersonaSpecificAlerts(inputs, persona));
        }

        this.contextualAlerts = alerts;
        return alerts;
    }

    // Generate alerts specific to detected persona
    generatePersonaSpecificAlerts(inputs, persona) {
        const alerts = [];

        switch (persona.type) {
            case 'high_earner':
                const totalIncome = (inputs.yourSalary || 0) + (inputs.partnerSalary || 0);
                if (totalIncome > 250000 && (inputs.nonConcessionalContribution || 0) === 0) {
                    alerts.push({
                        type: 'division_293',
                        severity: 'medium',
                        title: 'Division 293 Tax Impact',
                        message: 'Your high income triggers additional super tax. Consider non-concessional contributions or salary sacrifice alternatives.',
                        actionRequired: false,
                        quickFix: 'Review salary sacrifice options beyond super',
                        personalizedFor: 'high_earner'
                    });
                }
                break;

            case 'business_owner':
                if (!inputs.businessYearsHeld || inputs.businessYearsHeld < 15) {
                    alerts.push({
                        type: 'cgt_concessions',
                        severity: 'medium',
                        title: 'Small Business CGT Planning',
                        message: 'Holding business assets for 15+ years unlocks significant CGT concessions. Plan your exit strategy accordingly.',
                        actionRequired: false,
                        quickFix: 'Consult advisor about small business CGT rules',
                        personalizedFor: 'business_owner'
                    });
                }
                break;

            case 'property_investor':
                const propertyDebt = inputs.investmentPropertyLoan || 0;
                const propertyValue = inputs.investmentPropertyValue || 0;
                const lvr = propertyValue > 0 ? propertyDebt / propertyValue : 0;

                if (lvr > 0.8) {
                    alerts.push({
                        type: 'property_risk',
                        severity: 'medium',
                        title: 'High Property Leverage Risk',
                        message: 'High loan-to-value ratio increases investment risk. Consider strategies to reduce leverage before retirement.',
                        actionRequired: false,
                        quickFix: 'Review property sale timing for retirement',
                        personalizedFor: 'property_investor'
                    });
                }
                break;

            case 'late_starter':
                const retirementAge = inputs.retirementAge || 67;
                if (retirementAge < 67) {
                    alerts.push({
                        type: 'early_retirement_risk',
                        severity: 'high',
                        title: 'Early Retirement Risk',
                        message: 'Planning to retire before Age Pension eligibility requires careful planning. Consider working until 67 for security.',
                        actionRequired: false,
                        quickFix: 'Model scenarios with different retirement ages',
                        personalizedFor: 'late_starter'
                    });
                }
                break;
        }

        return alerts;
    }

    // Generate contextual guidance based on current context
    generateContextualGuidance(inputs, confidenceScore, currentPage = 'calculator') {
        const guidance = [];
        const thresholds = this.config.GUIDANCE_THRESHOLDS;

        // Only show guidance if confidence meets minimum threshold
        if (confidenceScore < thresholds.BASIC_GUIDANCE_THRESHOLD.value) {
            guidance.push({
                type: 'onboarding_suggestion',
                priority: 'high',
                title: 'Complete Your Profile',
                message: 'Complete more of your financial profile to receive personalized guidance.',
                action: 'Continue with onboarding or fill in more details',
                context: 'low_confidence'
            });
            return guidance;
        }

        // Advanced guidance for higher confidence scores
        if (confidenceScore >= thresholds.SUGGESTION_CONFIDENCE_THRESHOLD.value) {
            guidance.push({
                type: 'advanced_analysis',
                priority: 'medium',
                title: 'Advanced Analysis Available',
                message: 'Your profile is comprehensive enough for advanced scenario analysis.',
                action: 'Run Monte Carlo simulation or scenario comparison',
                context: 'high_confidence'
            });
        }

        // Scenario analysis recommendation
        if (confidenceScore >= thresholds.SCENARIO_ANALYSIS_THRESHOLD.value) {
            guidance.push({
                type: 'scenario_analysis',
                priority: 'medium',
                title: 'Ready for Scenario Analysis',
                message: 'Compare different retirement strategies to optimize your approach.',
                action: 'Generate scenario comparison matrix',
                context: 'very_high_confidence'
            });
        }

        // Page-specific guidance
        guidance.push(...this.generatePageSpecificGuidance(currentPage, inputs));

        // Persona-specific guidance
        if (this.currentPersona) {
            guidance.push(...this.generatePersonaGuidance(this.currentPersona, inputs));
        }

        this.activeGuidance = guidance;
        return guidance;
    }

    // Generate guidance specific to current page/context
    generatePageSpecificGuidance(page, inputs) {
        const guidance = [];

        switch (page) {
            case 'calculator':
                if (!inputs.retirementAge || inputs.retirementAge < 60) {
                    guidance.push({
                        type: 'input_guidance',
                        priority: 'low',
                        title: 'Retirement Age Consideration',
                        message: 'Remember: Age Pension starts at 67, but you can access super from preservation age (60-65).',
                        context: 'calculator_input'
                    });
                }
                break;

            case 'results':
                guidance.push({
                    type: 'results_interpretation',
                    priority: 'medium',
                    title: 'Understanding Your Results',
                    message: 'Focus on success rate and median outcomes rather than best-case scenarios.',
                    context: 'results_display'
                });
                break;

            case 'suggestions':
                guidance.push({
                    type: 'suggestion_prioritization',
                    priority: 'medium',
                    title: 'Implementation Priority',
                    message: 'Start with Quick Wins - they provide the best return on effort invested.',
                    context: 'suggestions_display'
                });
                break;
        }

        return guidance;
    }

    // Generate persona-specific guidance
    generatePersonaGuidance(persona, inputs) {
        const guidance = [];

        switch (persona.type) {
            case 'high_earner':
                guidance.push({
                    type: 'persona_guidance',
                    priority: 'medium',
                    title: 'High Earner Strategy',
                    message: 'Focus on tax-effective strategies: maximize super, consider negative gearing, and explore family trusts.',
                    context: 'high_earner_persona'
                });
                break;

            case 'business_owner':
                guidance.push({
                    type: 'persona_guidance',
                    priority: 'medium',
                    title: 'Business Owner Advantage',
                    message: 'Leverage your business: Use small business CGT concessions and optimize super contributions through business structures.',
                    context: 'business_owner_persona'
                });
                break;

            case 'late_starter':
                guidance.push({
                    type: 'persona_guidance',
                    priority: 'high',
                    title: 'Catch-Up Strategy',
                    message: 'Time is limited: Maximize catch-up contributions, eliminate debt aggressively, and consider working longer.',
                    context: 'late_starter_persona'
                });
                break;

            case 'property_investor':
                guidance.push({
                    type: 'persona_guidance',
                    priority: 'medium',
                    title: 'Property Strategy',
                    message: 'Plan your property exit: Consider timing of sales for tax efficiency and retirement cash flow.',
                    context: 'property_investor_persona'
                });
                break;

            case 'pension_maximizer':
                guidance.push({
                    type: 'persona_guidance',
                    priority: 'medium',
                    title: 'Age Pension Optimization',
                    message: 'Strategic asset positioning: Keep assets just under thresholds to maximize Age Pension benefits.',
                    context: 'pension_maximizer_persona'
                });
                break;
        }

        return guidance;
    }

    // Calculate overall guidance confidence score
    calculateConfidenceScore(inputs, stepNumber = null) {
        const scoring = this.config.CONFIDENCE_SCORING;
        let score = 0;

        // Base score from completed steps (if from onboarding)
        if (stepNumber) {
            score += stepNumber * scoring.BASE_SCORE_PER_STEP.value;
        }

        // Bonus for complete profile
        const requiredFields = ['yourCurrentAge', 'retirementAge', 'yourSalary', 'yourCurrentSuper'];
        const completedFields = requiredFields.filter(field => inputs[field] && inputs[field] > 0).length;
        if (completedFields === requiredFields.length) {
            score += scoring.COMPLETE_PROFILE_BONUS.value;
        }

        // Bonus for realistic goals
        const retirementAge = inputs.retirementAge || 67;
        const currentAge = inputs.yourCurrentAge || 40;
        if (retirementAge >= 60 && retirementAge <= 75 && retirementAge > currentAge) {
            score += scoring.REALISTIC_GOALS_BONUS.value;
        }

        // Bonus for comprehensive planning
        const comprehensiveFields = ['hasEmergencyFund', 'hasDebt', 'hasInvestmentProperty', 'planToDownsize'];
        const completedComprehensive = comprehensiveFields.filter(field =>
            inputs[field] !== undefined && inputs[field] !== null
        ).length;

        if (completedComprehensive >= 3) {
            score += scoring.COMPREHENSIVE_PLANNING_BONUS.value;
        }

        return Math.min(100, Math.max(0, score));
    }

    // Get contextual help text for specific inputs
    getInputHelp(inputName, inputs, persona = null) {
        const baseHelp = this.getBaseInputHelp(inputName);
        const personaHelp = persona ? this.getPersonaInputHelp(inputName, persona) : null;

        return {
            base: baseHelp,
            personalized: personaHelp,
            combined: personaHelp || baseHelp
        };
    }

    getBaseInputHelp(inputName) {
        const helpText = {
            retirementAge: "Consider: Age Pension starts at 67, but you can access super from 60-65 depending on birth year.",
            yourSalary: "Include all employment income before tax. This affects super guarantee and tax calculations.",
            yourCurrentSuper: "Check your myGov account for accurate figures across all super funds.",
            hasEmergencyFund: "Emergency funds prevent early super access penalties and provide financial security.",
            allocEquities: "Higher equity allocation offers growth potential but increases volatility. Consider your risk tolerance."
        };

        return helpText[inputName] || null;
    }

    getPersonaInputHelp(inputName, persona) {
        const personaHelp = {
            high_earner: {
                yourSalary: "High income triggers Division 293 tax above $250k. Consider salary sacrifice strategies.",
                allocEquities: "High earners can typically afford more aggressive allocations due to continued earning capacity."
            },
            late_starter: {
                retirementAge: "Consider working until 67+ for additional security and full Age Pension access.",
                yourCurrentSuper: "Use catch-up contributions and salary sacrifice to accelerate super growth."
            },
            business_owner: {
                yourSalary: "Consider optimal salary vs dividend split for tax efficiency and super contributions.",
                retirementAge: "Plan business exit strategy - small business CGT concessions available after 15 years."
            }
        };

        return personaHelp[persona.type]?.[inputName] || null;
    }
}