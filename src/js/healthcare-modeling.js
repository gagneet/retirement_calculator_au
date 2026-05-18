// healthcare-modeling.js - Australian Healthcare Cost Modeling and Aged Care Projections
// Based on 2024-2025 Australian healthcare reforms, aged care changes, and inflation data

import { ENHANCED_FINANCIAL_CONFIG } from './enhanced-config.js';
import { randomNormal, formatCurrency } from './utils.js';

export class HealthcareModelingEngine {
    constructor(config) {
        this.config = config;
        this.financialConfig = ENHANCED_FINANCIAL_CONFIG;

        // 2024-2025 Australian Healthcare Cost Data from config
        const premiums = this.financialConfig.healthcareDetailed.PRIVATE_HEALTH_INSURANCE_PREMIUMS;
        this.healthcareCosts = {
            // Private Health Insurance Premiums (2024 data)
            privateHealthInsurance: {
                single: {
                    basic: premiums.SINGLE_BASIC.value,
                    standard: premiums.SINGLE_STANDARD.value,
                    premium: premiums.SINGLE_PREMIUM.value
                },
                couple: {
                    basic: premiums.COUPLE_BASIC.value,
                    standard: premiums.COUPLE_STANDARD.value,
                    premium: premiums.COUPLE_PREMIUM.value
                },
                family: {
                    basic: premiums.FAMILY_BASIC.value,
                    standard: premiums.FAMILY_STANDARD.value,
                    premium: premiums.FAMILY_PREMIUM.value
                }
            },

            // Healthcare inflation rates (2024 data)
            inflationRates: {
                generalHealthcare: this.financialConfig.healthcareDetailed.HEALTHCARE_INFLATION_RATES_DETAILED.GENERAL_HEALTHCARE.value,
                privateInsurance: this.financialConfig.healthcareDetailed.HEALTHCARE_INFLATION_RATES_DETAILED.PRIVATE_INSURANCE.value,
                medicalServices: this.financialConfig.healthcareDetailed.HEALTHCARE_INFLATION_RATES_DETAILED.MEDICAL_SERVICES.value,
                agedCare: this.financialConfig.healthcareDetailed.HEALTHCARE_INFLATION_RATES_DETAILED.AGED_CARE.value,
                pharmaceuticals: this.financialConfig.healthcareDetailed.HEALTHCARE_INFLATION_RATES_DETAILED.PHARMACEUTICALS.value,
                dental: this.financialConfig.healthcareDetailed.HEALTHCARE_INFLATION_RATES_DETAILED.DENTAL.value,
                allied: this.financialConfig.healthcareDetailed.HEALTHCARE_INFLATION_RATES_DETAILED.ALLIED_HEALTH.value
            },

            // Out-of-pocket medical expenses by age group
            outOfPocketCosts: {
                age55to64: {
                    annual: this.financialConfig.healthcareDetailed.OUT_OF_POCKET_COSTS_BY_AGE.AGE_55_64.ANNUAL.value,
                    gp: this.financialConfig.healthcareDetailed.OUT_OF_POCKET_COSTS_BY_AGE.AGE_55_64.GP.value,
                    specialist: this.financialConfig.healthcareDetailed.OUT_OF_POCKET_COSTS_BY_AGE.AGE_55_64.SPECIALIST.value,
                    dental: this.financialConfig.healthcareDetailed.OUT_OF_POCKET_COSTS_BY_AGE.AGE_55_64.DENTAL.value,
                    allied: this.financialConfig.healthcareDetailed.OUT_OF_POCKET_COSTS_BY_AGE.AGE_55_64.ALLIED.value,
                    pharmaceuticals: this.financialConfig.healthcareDetailed.OUT_OF_POCKET_COSTS_BY_AGE.AGE_55_64.PHARMACEUTICALS.value
                },
                age65to74: {
                    annual: this.financialConfig.healthcareDetailed.OUT_OF_POCKET_COSTS_BY_AGE.AGE_65_74.ANNUAL.value,
                    gp: this.financialConfig.healthcareDetailed.OUT_OF_POCKET_COSTS_BY_AGE.AGE_65_74.GP.value,
                    specialist: this.financialConfig.healthcareDetailed.OUT_OF_POCKET_COSTS_BY_AGE.AGE_65_74.SPECIALIST.value,
                    dental: this.financialConfig.healthcareDetailed.OUT_OF_POCKET_COSTS_BY_AGE.AGE_65_74.DENTAL.value,
                    allied: this.financialConfig.healthcareDetailed.OUT_OF_POCKET_COSTS_BY_AGE.AGE_65_74.ALLIED.value,
                    pharmaceuticals: this.financialConfig.healthcareDetailed.OUT_OF_POCKET_COSTS_BY_AGE.AGE_65_74.PHARMACEUTICALS.value
                },
                age75to84: {
                    annual: this.financialConfig.healthcareDetailed.OUT_OF_POCKET_COSTS_BY_AGE.AGE_75_84.ANNUAL.value,
                    gp: this.financialConfig.healthcareDetailed.OUT_OF_POCKET_COSTS_BY_AGE.AGE_75_84.GP.value,
                    specialist: this.financialConfig.healthcareDetailed.OUT_OF_POCKET_COSTS_BY_AGE.AGE_75_84.SPECIALIST.value,
                    dental: this.financialConfig.healthcareDetailed.OUT_OF_POCKET_COSTS_BY_AGE.AGE_75_84.DENTAL.value,
                    allied: this.financialConfig.healthcareDetailed.OUT_OF_POCKET_COSTS_BY_AGE.AGE_75_84.ALLIED.value,
                    pharmaceuticals: this.financialConfig.healthcareDetailed.OUT_OF_POCKET_COSTS_BY_AGE.AGE_75_84.PHARMACEUTICALS.value
                },
                age85plus: {
                    annual: this.financialConfig.healthcareDetailed.OUT_OF_POCKET_COSTS_BY_AGE.AGE_85_PLUS.ANNUAL.value,
                    gp: this.financialConfig.healthcareDetailed.OUT_OF_POCKET_COSTS_BY_AGE.AGE_85_PLUS.GP.value,
                    specialist: this.financialConfig.healthcareDetailed.OUT_OF_POCKET_COSTS_BY_AGE.AGE_85_PLUS.SPECIALIST.value,
                    dental: this.financialConfig.healthcareDetailed.OUT_OF_POCKET_COSTS_BY_AGE.AGE_85_PLUS.DENTAL.value,
                    allied: this.financialConfig.healthcareDetailed.OUT_OF_POCKET_COSTS_BY_AGE.AGE_85_PLUS.ALLIED.value,
                    pharmaceuticals: this.financialConfig.healthcareDetailed.OUT_OF_POCKET_COSTS_BY_AGE.AGE_85_PLUS.PHARMACEUTICALS.value
                }
            }
        };

        // 2025 Aged Care Reforms and Cost Structure from config
        const agedCareCosts = this.financialConfig.healthcareDetailed.AGED_CARE_2025_COSTS;
        const homeCareCosts = this.financialConfig.healthcareDetailed.HOME_CARE_PACKAGE_COSTS;
        this.agedCareCosts = {
            // Accommodation costs (2025 data)
            accommodation: {
                averageRAD: agedCareCosts.AVERAGE_RAD.value,
                maximumRAD: agedCareCosts.MAXIMUM_RAD.value,
                mpirRate: agedCareCosts.MPIR_RATE.value,
                mpirRateOct: agedCareCosts.MPIR_RATE_OCT.value
            },

            // Home care packages (2024 cost structure)
            homeCare: {
                level1: homeCareCosts.LEVEL_1.value,
                level2: homeCareCosts.LEVEL_2.value,
                level3: homeCareCosts.LEVEL_3.value,
                level4: homeCareCosts.LEVEL_4.value
            },

            // Residential aged care fees (2025 reforms)
            residentialCare: {
                basicDailyFee: agedCareCosts.BASIC_DAILY_FEE.value,
                maximumMeansTestedFee: agedCareCosts.MAXIMUM_MEANS_TESTED_FEE.value,
                accommodationSupplement: agedCareCosts.ACCOMMODATION_SUPPLEMENT.value,
                lifetimeCap: agedCareCosts.LIFETIME_CAP.value
            },

            // Probability of requiring aged care by demographics
            careProbabilities: {
                single: {
                    male: {
                        probabilityByAge: {
                            65: this.financialConfig.healthcareDetailed.AGED_CARE_PROBABILITIES.MALE_SINGLE_PROBABILITY_65.value,
                            70: 0.08, 75: 0.15, 80: 0.28,
                            85: this.financialConfig.healthcareDetailed.AGED_CARE_PROBABILITIES.MALE_SINGLE_PROBABILITY_85.value,
                            90: 0.65, 95: 0.80
                        },
                        averageAge: this.financialConfig.healthcareDetailed.AGED_CARE_PROBABILITIES.MALE_AVERAGE_AGE.value,
                        averageDuration: this.financialConfig.healthcareDetailed.AGED_CARE_PROBABILITIES.MALE_AVERAGE_DURATION.value
                    },
                    female: {
                        probabilityByAge: {
                            65: this.financialConfig.healthcareDetailed.AGED_CARE_PROBABILITIES.FEMALE_SINGLE_PROBABILITY_65.value,
                            70: 0.10, 75: 0.18, 80: 0.32,
                            85: this.financialConfig.healthcareDetailed.AGED_CARE_PROBABILITIES.FEMALE_SINGLE_PROBABILITY_85.value,
                            90: 0.72, 95: 0.85
                        },
                        averageAge: this.financialConfig.healthcareDetailed.AGED_CARE_PROBABILITIES.FEMALE_AVERAGE_AGE.value,
                        averageDuration: this.financialConfig.healthcareDetailed.AGED_CARE_PROBABILITIES.FEMALE_AVERAGE_DURATION.value
                    }
                },
                couple: {
                    probabilityOnePartner: {
                        65: 0.08, 70: 0.14, 75: 0.25, 80: 0.42, 85: 0.65, 90: 0.82, 95: 0.92
                    },
                    probabilityBothPartners: {
                        65: 0.02, 70: 0.04, 75: 0.08, 80: 0.15, 85: 0.28, 90: 0.45, 95: 0.62
                    }
                }
            }
        };

        // Healthcare spending patterns by life stage
        this.spendingPatterns = {
            healthyRetirement: {
                description: "Minimal health issues, preventive care focus",
                ageRange: [65, 75],
                costMultiplier: 1.0,
                privateInsuranceRecommended: true
            },
            managedConditions: {
                description: "Common chronic conditions well-managed",
                ageRange: [75, 85],
                costMultiplier: 1.4,
                privateInsuranceRecommended: true
            },
            complexCare: {
                description: "Multiple conditions requiring intensive management",
                ageRange: [85, 95],
                costMultiplier: 2.1,
                privateInsuranceRecommended: false  // Medicare primarily
            }
        };
    }

    validateHealthcareInputs(inputs) {
        const errors = [];
        const warnings = [];
        const hasOpenEndedLifespan = inputs.yourLifespan === 0;

        if (!inputs.yourCurrentAge || inputs.yourCurrentAge <= 0) {
            errors.push("Current age must be a positive number.");
        }
        if (!hasOpenEndedLifespan && (!inputs.yourLifespan || inputs.yourLifespan <= inputs.yourCurrentAge)) {
            errors.push("Expected lifespan must be greater than current age.");
        }
        if (inputs.agedCareStartAge < inputs.retirementAge) {
            warnings.push("Aged care start age is earlier than retirement age, which is unusual.");
        }
        if (inputs.agedCareDuration <= 0) {
            warnings.push("Aged care duration should be a positive number.");
        }
        if (inputs.currentHealthcareCosts < 0) {
            errors.push("Current healthcare costs cannot be negative.");
        } else if (inputs.currentHealthcareCosts === 0) {
            warnings.push("Current healthcare costs are zero. Projections may be underestimated.");
        }
        if (inputs.healthcareInflation < 0 || inputs.healthcareInflation > 20) {
            warnings.push("Healthcare inflation is outside the typical range of 0-20%.");
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    getProjectionEndAge(inputs) {
        const primaryExplicitLifespan = inputs.yourLifespan > inputs.yourCurrentAge ? inputs.yourLifespan : 0;
        const partnerCurrentAge = inputs.partnerCurrentAge || 0;
        const partnerExplicitLifespan = inputs.partnerLifespan > partnerCurrentAge ? inputs.partnerLifespan : 0;
        const agedCareEndAge = (inputs.agedCareStartAge || 0) + Math.max(inputs.agedCareDuration || 0, 3);
        const retirementHorizon = Math.max(inputs.retirementAge || 0, inputs.yourCurrentAge || 0) + 20;
        const openEndedHorizon = Math.max(inputs.yourCurrentAge || 0, partnerCurrentAge) + 25;

        return Math.max(
            primaryExplicitLifespan,
            partnerExplicitLifespan,
            agedCareEndAge,
            retirementHorizon,
            openEndedHorizon
        );
    }

    getHealthcareInflationRate(baseRate, inputs) {
        const inputRate = Number.isFinite(inputs.healthcareInflation) ? inputs.healthcareInflation : null;
        if (inputRate === null) {
            return baseRate;
        }

        const configuredBase = this.healthcareCosts.inflationRates.generalHealthcare;
        return Math.max(0, baseRate + (inputRate - configuredBase));
    }

    getBaseOutOfPocketTotal(baseCosts) {
        const componentTotal = [
            baseCosts.gp,
            baseCosts.specialist,
            baseCosts.dental,
            baseCosts.allied,
            baseCosts.pharmaceuticals
        ].reduce((sum, cost) => sum + cost, 0);

        return baseCosts.annual || componentTotal;
    }

    // Calculate comprehensive healthcare cost projections for retirement
    calculateHealthcareCostProjection(inputs, monteCarloResults = null) {
        // --- Input Validation ---
        const validation = this.validateHealthcareInputs(inputs);
        if (!validation.isValid) {
            console.warn('Healthcare modeling validation failed:', validation.errors);
            // Return a projection with warnings instead of throwing an error
            return {
                yearlyProjections: [],
                totalLifetimeCost: 0,
                agedCareProjections: null,
                riskFactors: [{
                    type: 'data_validation',
                    severity: 'high',
                    description: 'Input data is invalid or incomplete.',
                    impact: `Calculation cannot proceed. ${validation.errors.join('; ')}`
                }],
                recommendations: [],
                validationErrors: validation.errors
            };
        }

        const projections = {
            yearlyProjections: [],
            totalLifetimeCost: 0,
            agedCareProjections: null,
            riskFactors: [],
            recommendations: [],
            validationWarnings: validation.warnings
        };

        const startAge = inputs.yourCurrentAge;
        const endAge = this.getProjectionEndAge(inputs);
        const retirementAge = inputs.retirementAge;

        // Calculate yearly healthcare costs
        for (let age = startAge; age <= endAge; age++) {
            const yearProjection = this.calculateYearlyHealthcareCost(age, inputs);
            projections.yearlyProjections.push(yearProjection);
            projections.totalLifetimeCost += yearProjection.totalCost;
        }

        // Calculate aged care projections
        projections.agedCareProjections = this.calculateAgedCareProjections(inputs);

        // Identify risk factors and recommendations
        projections.riskFactors = this.identifyHealthcareRiskFactors(inputs, projections);
        projections.recommendations = this.generateHealthcareRecommendations(inputs, projections);

        return projections;
    }

    // Calculate healthcare costs for a specific year/age
    calculateYearlyHealthcareCost(age, inputs) {
        const yearsFromNow = age - inputs.yourCurrentAge;
        const isRetired = age >= inputs.retirementAge;

        // Determine age-based cost bracket
        let baseCosts;
        if (age < 65) {
            baseCosts = this.healthcareCosts.outOfPocketCosts.age55to64;
        } else if (age < 75) {
            baseCosts = this.healthcareCosts.outOfPocketCosts.age65to74;
        } else if (age < 85) {
            baseCosts = this.healthcareCosts.outOfPocketCosts.age75to84;
        } else {
            baseCosts = this.healthcareCosts.outOfPocketCosts.age85plus;
        }

        // Apply inflation from current year
        const inflatedCosts = this.applyHealthcareInflation(baseCosts, yearsFromNow, inputs);
        const baselineOutOfPocket = this.getBaseOutOfPocketTotal(baseCosts);
        const outOfPocketScale = baselineOutOfPocket > 0 && inputs.currentHealthcareCosts > 0
            ? inputs.currentHealthcareCosts / baselineOutOfPocket
            : 1;

        // Calculate private health insurance costs if applicable
        let insuranceCost = 0;
        if (inputs.hasPrivateHealthInsurance !== false) {  // Default to true if not specified
            const insuranceLevel = inputs.privateHealthInsuranceLevel || 'standard';
            const coverType = inputs.isSingleCalculation ? 'single' : 'couple';

            insuranceCost = this.healthcareCosts.privateHealthInsurance[coverType][insuranceLevel];
            insuranceCost = this.applyInflation(
                insuranceCost,
                this.getHealthcareInflationRate(this.healthcareCosts.inflationRates.privateInsurance, inputs),
                yearsFromNow
            );
        }

        // Health condition adjustments
        let conditionMultiplier = 1.0;
        if (inputs.healthConditions) {
            conditionMultiplier = this.calculateConditionMultiplier(inputs.healthConditions, age);
        }

        const outOfPocketCosts = {
            gp: inflatedCosts.gp * outOfPocketScale * conditionMultiplier,
            specialist: inflatedCosts.specialist * outOfPocketScale * conditionMultiplier,
            dental: inflatedCosts.dental * outOfPocketScale,
            allied: inflatedCosts.allied * outOfPocketScale * conditionMultiplier,
            pharmaceuticals: inflatedCosts.pharmaceuticals * outOfPocketScale * conditionMultiplier
        };
        const totalOutOfPocket = Object.values(outOfPocketCosts).reduce((sum, cost) => sum + cost, 0);

        return {
            age,
            year: 2024 + yearsFromNow,
            isRetired,
            outOfPocketCosts,
            privateHealthInsurance: insuranceCost,
            totalCost: totalOutOfPocket + insuranceCost,
            inflationAdjustment: yearsFromNow
        };
    }

    // Apply healthcare-specific inflation rates
    applyHealthcareInflation(baseCosts, years, inputs) {
        const inflatedCosts = {};

        inflatedCosts.gp = this.applyInflation(
            baseCosts.gp,
            this.getHealthcareInflationRate(this.healthcareCosts.inflationRates.medicalServices, inputs),
            years
        );
        inflatedCosts.specialist = this.applyInflation(
            baseCosts.specialist,
            this.getHealthcareInflationRate(this.healthcareCosts.inflationRates.medicalServices, inputs),
            years
        );
        inflatedCosts.dental = this.applyInflation(
            baseCosts.dental,
            this.getHealthcareInflationRate(this.healthcareCosts.inflationRates.dental, inputs),
            years
        );
        inflatedCosts.allied = this.applyInflation(
            baseCosts.allied,
            this.getHealthcareInflationRate(this.healthcareCosts.inflationRates.allied, inputs),
            years
        );
        inflatedCosts.pharmaceuticals = this.applyInflation(
            baseCosts.pharmaceuticals,
            this.getHealthcareInflationRate(this.healthcareCosts.inflationRates.pharmaceuticals, inputs),
            years
        );

        return inflatedCosts;
    }

    // Apply standard inflation calculation
    applyInflation(baseAmount, rate, years) {
        return baseAmount * Math.pow(1 + rate, years);
    }

    getUserAgedCareProbability(inputs) {
        if (inputs.agedCareProbability === undefined || inputs.agedCareProbability === null || inputs.agedCareProbability === '') {
            return null;
        }

        const raw = Number(inputs.agedCareProbability);
        if (!Number.isFinite(raw)) return null;

        return Math.max(0, Math.min(1, raw > 1 ? raw / 100 : raw));
    }

    // Calculate condition-based cost multipliers
    calculateConditionMultiplier(conditions, age) {
        let multiplier = 1.0;
        const conditionMultipliers = this.financialConfig.healthcareDetailed.CONDITION_COST_MULTIPLIERS;

        // Age-based health complexity
        if (age >= 85) {
            multiplier *= conditionMultipliers.AGE_85_MULTIPLIER.value;
        } else if (age >= 75) {
            multiplier *= conditionMultipliers.AGE_75_MULTIPLIER.value;
        }

        // Specific conditions (if provided)
        if (conditions.diabetes) multiplier *= conditionMultipliers.DIABETES.value;
        if (conditions.cardiovascular) multiplier *= conditionMultipliers.CARDIOVASCULAR.value;
        if (conditions.arthritis) multiplier *= conditionMultipliers.ARTHRITIS.value;
        if (conditions.mentalHealth) multiplier *= conditionMultipliers.MENTAL_HEALTH.value;
        if (conditions.cancer) multiplier *= conditionMultipliers.CANCER.value;

        return Math.min(multiplier, conditionMultipliers.MAX_CONDITION_MULTIPLIER.value);
    }

    // Calculate comprehensive aged care projections
    calculateAgedCareProjections(inputs) {
        const projections = {
            homeCare: null,
            residentialCare: null,
            totalExpectedCost: 0,
            probabilityOfNeed: 0,
            recommendations: []
        };

        const gender = inputs.gender || 'male'; // Default if not specified
        const isCouple = !inputs.isSingleCalculation;

        // Calculate probabilities based on demographics
        const careProbs = isCouple ?
            this.agedCareCosts.careProbabilities.couple :
            this.agedCareCosts.careProbabilities.single[gender];

        // Home care projection
        projections.homeCare = this.calculateHomeCareProjection(inputs, careProbs);

        // Residential care projection
        projections.residentialCare = this.calculateResidentialCareProjection(inputs, careProbs);

        const userProbability = this.getUserAgedCareProbability(inputs);
        if (userProbability !== null) {
            const defaultOverall = Math.max(
                projections.homeCare.probability || 0,
                projections.residentialCare.probability || 0,
            );

            if (defaultOverall > 0) {
                const scale = userProbability / defaultOverall;
                projections.homeCare.probability = Math.max(0, Math.min(1, projections.homeCare.probability * scale));
                projections.residentialCare.probability = Math.max(0, Math.min(1, projections.residentialCare.probability * scale));
            } else {
                projections.homeCare.probability = userProbability;
                projections.residentialCare.probability = userProbability;
            }
        }

        // Calculate weighted expected costs
        const homeCareExpected = projections.homeCare.expectedCost * projections.homeCare.probability;
        const residentialExpected = projections.residentialCare.expectedCost * projections.residentialCare.probability;

        projections.totalExpectedCost = homeCareExpected + residentialExpected;
        projections.probabilityOfNeed = userProbability ?? Math.max(projections.homeCare.probability, projections.residentialCare.probability);

        projections.recommendations = this.generateAgedCareRecommendations(projections, inputs);

        return projections;
    }

    // Calculate home care cost projections
    calculateHomeCareProjection(inputs, careProbs) {
        const homeCareProgression = this.financialConfig.healthcareDetailed.HOME_CARE_PROGRESSION;
        const startAge = Math.max(homeCareProgression.START_AGE.value, inputs.retirementAge);
        const endAge = inputs.yourLifespan;
        const isCouple = !inputs.isSingleCalculation;

        // Estimate probability of needing home care (typically higher than residential)
        const probability = isCouple ?
            this.interpolateProbability(careProbs.probabilityOnePartner, startAge) * homeCareProgression.HOME_CARE_PERCENTAGE.value :
            this.interpolateProbability(careProbs.probabilityByAge, startAge) * homeCareProgression.HOME_CARE_PERCENTAGE.value;

        // Estimate care level progression over time
        let totalCost = 0;
        const progressionByAge = [
            { age: homeCareProgression.START_AGE.value, level: 1, duration: homeCareProgression.LEVEL_1_DURATION.value },
            { age: 72, level: 2, duration: homeCareProgression.LEVEL_2_DURATION.value },
            { age: 75, level: 3, duration: homeCareProgression.LEVEL_3_DURATION.value },
            { age: 78, level: 4, duration: homeCareProgression.LEVEL_4_DURATION.value }
        ];

        for (const stage of progressionByAge) {
            if (stage.age <= endAge) {
                const yearsFromNow = stage.age - inputs.yourCurrentAge;
                const levelCost = this.agedCareCosts.homeCare[`level${stage.level}`];
                const inflatedCost = this.applyInflation(
                    levelCost,
                    this.getHealthcareInflationRate(this.healthcareCosts.inflationRates.agedCare, inputs),
                    yearsFromNow
                );
                totalCost += inflatedCost * stage.duration;
            }
        }

        // Apply user contribution rates (2025 reforms)
        const userContribution = this.calculateUserContribution(totalCost, inputs);

        return {
            probability,
            expectedCost: userContribution,
            fullCost: totalCost,
            averageStartAge: startAge,
            averageDuration: 8, // Total years across all levels
            lifetimeCapApplies: userContribution >= this.agedCareCosts.residentialCare.lifetimeCap
        };
    }

    // Calculate residential care cost projections
    calculateResidentialCareProjection(inputs, careProbs) {
        const isCouple = !inputs.isSingleCalculation;
        const startAge = isCouple ?
            Math.max(inputs.yourCurrentAge, inputs.partnerCurrentAge) + 15 :  // Couples typically later
            inputs.yourCurrentAge + 12;  // Singles typically earlier

        const probability = isCouple ?
            this.interpolateProbability(careProbs.probabilityOnePartner, startAge) * this.financialConfig.healthcareDetailed.HOME_CARE_PROGRESSION.RESIDENTIAL_CARE_PERCENTAGE.value :
            this.interpolateProbability(careProbs.probabilityByAge, startAge) * this.financialConfig.healthcareDetailed.HOME_CARE_PROGRESSION.RESIDENTIAL_CARE_PERCENTAGE.value;

        const averageDuration = isCouple ? 2.5 : (inputs.gender === 'female' ? 3.2 : 2.8);

        // Calculate costs
        const yearsFromNow = startAge - inputs.yourCurrentAge;

        // Accommodation costs (RAD or DAP)
        const averageRAD = this.applyInflation(
            this.agedCareCosts.accommodation.averageRAD,
            this.getHealthcareInflationRate(this.healthcareCosts.inflationRates.agedCare, inputs),
            yearsFromNow
        );

        // Daily care fees
        const dailyFees = this.agedCareCosts.residentialCare.basicDailyFee +
            (this.agedCareCosts.residentialCare.maximumMeansTestedFee * 0.5); // Assume 50% means tested fee
        const inflatedDailyFees = this.applyInflation(
            dailyFees,
            this.getHealthcareInflationRate(this.healthcareCosts.inflationRates.agedCare, inputs),
            yearsFromNow
        );
        const totalDailyFeeCost = inflatedDailyFees * 365 * averageDuration;

        const totalCost = averageRAD + totalDailyFeeCost;

        return {
            probability,
            expectedCost: totalCost,
            accommodationCost: averageRAD,
            careCost: totalDailyFeeCost,
            averageStartAge: startAge,
            averageDuration,
            estimatedRAD: averageRAD
        };
    }

    // Calculate user contribution based on 2025 aged care reforms
    calculateUserContribution(totalCost, inputs) {
        // Simplified contribution calculation based on means testing
        const totalIncome = (inputs.yourSalary || 0) + (inputs.partnerSalary || 0);
        const totalAssets = (inputs.yourCurrentSuper || 0) + (inputs.partnerCurrentSuper || 0) +
            (inputs.currentSavings || 0) + (inputs.currentStocks || 0) +
            (inputs.homeValue || 0);

        let contributionRate = 0.5; // Base 50% contribution

        // Adjust based on means test (simplified)
        const meansTest = this.financialConfig.healthcareDetailed.AGED_CARE_MEANS_TEST;
        if (totalAssets > meansTest.HIGH_MEANS_THRESHOLD_ASSETS.value || totalIncome > meansTest.HIGH_MEANS_THRESHOLD_INCOME.value) {
            contributionRate = meansTest.HIGH_MEANS_CONTRIBUTION_RATE.value;
        } else if (totalAssets < meansTest.LOW_MEANS_THRESHOLD_ASSETS.value && totalIncome < meansTest.LOW_MEANS_THRESHOLD_INCOME.value) {
            contributionRate = meansTest.FULL_PENSIONER_CONTRIBUTION_RATE.value;
        }

        const userCost = totalCost * contributionRate;

        // Apply lifetime cap
        return Math.min(userCost, this.agedCareCosts.residentialCare.lifetimeCap);
    }

    // Interpolate probability for a given age
    interpolateProbability(probabilities, age) {
        const ages = Object.keys(probabilities).map(Number).sort((a, b) => a - b);

        if (age <= ages[0]) {
            return probabilities[ages[0]];
        }
        if (age >= ages[ages.length - 1]) {
            return probabilities[ages[ages.length - 1]];
        }

        // Find surrounding ages
        let lowerAge = ages[0];
        let upperAge = ages[ages.length - 1];

        for (let i = 0; i < ages.length - 1; i++) {
            if (age >= ages[i] && age <= ages[i + 1]) {
                lowerAge = ages[i];
                upperAge = ages[i + 1];
                break;
            }
        }

        // Linear interpolation
        if (lowerAge === upperAge) {
            return probabilities[lowerAge];
        }

        const ratio = (age - lowerAge) / (upperAge - lowerAge);
        return probabilities[lowerAge] + ratio * (probabilities[upperAge] - probabilities[lowerAge]);
    }

    // Identify healthcare risk factors
    identifyHealthcareRiskFactors(inputs, projections) {
        const risks = [];

        // High total healthcare costs
        if (projections.totalLifetimeCost > 200000) {
            risks.push({
                type: "high_costs",
                severity: "high",
                description: `Projected lifetime healthcare costs of ${formatCurrency(projections.totalLifetimeCost)} are above average`,
                impact: "May significantly impact retirement budget"
            });
        }

        // Aged care probability
        if (projections.agedCareProjections.probabilityOfNeed > 0.6) {
            risks.push({
                type: "aged_care_likely",
                severity: "medium",
                description: `${(projections.agedCareProjections.probabilityOfNeed * 100).toFixed(0)}% probability of requiring aged care`,
                impact: "Consider aged care insurance or additional savings"
            });
        }

        // No private health insurance after retirement
        if (inputs.hasPrivateHealthInsurance === false) {
            risks.push({
                type: "no_private_insurance",
                severity: "medium",
                description: "No private health insurance may limit treatment options and increase wait times",
                impact: "Consider maintaining basic hospital cover in retirement"
            });
        }

        // Age gap in couples
        if (!inputs.isSingleCalculation && Math.abs((inputs.yourCurrentAge || 0) - (inputs.partnerCurrentAge || 0)) > 8) {
            risks.push({
                type: "age_gap",
                severity: "medium",
                description: "Significant age gap increases likelihood of extended care period for one partner",
                impact: "Plan for potentially higher healthcare costs in later retirement"
            });
        }

        return risks;
    }

    // Generate healthcare recommendations
    generateHealthcareRecommendations(inputs, projections) {
        const recommendations = [];

        // Private health insurance recommendation
        if (inputs.hasPrivateHealthInsurance === false && projections.totalLifetimeCost > 150000) {
            recommendations.push({
                category: "insurance",
                priority: "high",
                title: "Consider Private Health Insurance",
                description: "Private health insurance can reduce out-of-pocket costs and provide faster access to treatment",
                estimatedSaving: projections.totalLifetimeCost * 0.3,
                implementationSteps: [
                    "Compare policies on privatehealth.gov.au",
                    "Consider hospital-only cover if budget is tight",
                    "Take advantage of government rebates"
                ]
            });
        }

        // Health Savings Account recommendation
        if (projections.totalLifetimeCost > 100000) {
            recommendations.push({
                category: "planning",
                priority: "high",
                title: "Establish Health Savings Strategy",
                description: `Budget ${formatCurrency(projections.totalLifetimeCost / 20)} annually for healthcare costs`,
                estimatedSaving: 0,
                implementationSteps: [
                    "Create separate healthcare savings account",
                    "Consider investment bonds for tax-effective healthcare savings",
                    "Review budget annually to adjust for inflation"
                ]
            });
        }

        // Preventive care recommendation
        recommendations.push({
            category: "prevention",
            priority: "medium",
            title: "Invest in Preventive Healthcare",
            description: "Regular health checkups and preventive care can reduce long-term costs",
            estimatedSaving: projections.totalLifetimeCost * 0.15,
            implementationSteps: [
                "Schedule annual comprehensive health assessments",
                "Maintain healthy lifestyle to reduce chronic disease risk",
                "Use government-funded screening programs"
            ]
        });

        return recommendations;
    }

    // Generate aged care specific recommendations
    generateAgedCareRecommendations(projections, inputs) {
        const recommendations = [];

        if (projections.totalExpectedCost > 100000) {
            recommendations.push({
                category: "aged_care_planning",
                priority: "high",
                title: "Plan for Aged Care Costs",
                description: `Expected aged care costs of ${formatCurrency(projections.totalExpectedCost)} require advance planning`,
                implementationSteps: [
                    "Research aged care options in your preferred area",
                    "Consider aged care insurance products",
                    "Plan asset structuring to optimize means testing"
                ]
            });
        }

        if (projections.homeCare.lifetimeCapApplies) {
            recommendations.push({
                category: "aged_care_planning",
                priority: "medium",
                title: "Lifetime Cap Protection",
                description: "Home care costs may reach the $130,000 lifetime cap, providing some protection",
                implementationSteps: [
                    "Understand how the lifetime cap applies to your situation",
                    "Plan additional funding for costs above the cap"
                ]
            });
        }

        return recommendations;
    }

    // Generate healthcare cost summary for display
    generateHealthcareSummary(inputs) {
        const projections = this.calculateHealthcareCostProjection(inputs);
        const agedCareProjections = projections.agedCareProjections || {
            probabilityOfNeed: 0,
            totalExpectedCost: 0
        };
        const projectionYears = Math.max(1, projections.yearlyProjections.length);

        return {
            totalLifetimeCost: projections.totalLifetimeCost,
            averageAnnualCost: projections.totalLifetimeCost / projectionYears,
            agedCareProbability: agedCareProjections.probabilityOfNeed,
            agedCareExpectedCost: agedCareProjections.totalExpectedCost,
            majorRisks: projections.riskFactors.filter(r => r.severity === 'high'),
            topRecommendations: projections.recommendations.slice(0, 3),
            yearlyBreakdown: projections.yearlyProjections
        };
    }

    // Monte Carlo simulation for healthcare costs
    simulateHealthcareCosts(inputs, iterations = 1000) {
        const outcomes = [];
        const projection = this.calculateHealthcareCostProjection(inputs);
        const agedCareProbability = projection.agedCareProjections?.probabilityOfNeed || 0;
        const agedCareExpectedCost = projection.agedCareProjections?.totalExpectedCost || 0;
        const agedCareConditionalCost = agedCareProbability > 0
            ? agedCareExpectedCost / agedCareProbability
            : 0;

        for (let i = 0; i < iterations; i++) {
            let totalCost = 0;

            // Apply random factors
            const costVariation = randomNormal(1.0, 0.2); // 20% standard deviation
            const agedCareOccurs = agedCareProbability > 0 && Math.random() < agedCareProbability;

            totalCost = projection.totalLifetimeCost * costVariation;

            if (agedCareOccurs) {
                const agedCareVariation = randomNormal(1.0, 0.3); // Higher variation for aged care
                totalCost += agedCareConditionalCost * agedCareVariation;
            }

            outcomes.push(Math.max(0, totalCost));
        }

        outcomes.sort((a, b) => a - b);

        return {
            outcomes,
            mean: outcomes.reduce((sum, val) => sum + val, 0) / outcomes.length,
            median: outcomes[Math.floor(outcomes.length / 2)],
            percentile10: outcomes[Math.floor(outcomes.length * 0.1)],
            percentile90: outcomes[Math.floor(outcomes.length * 0.9)],
            percentile95: outcomes[Math.floor(outcomes.length * 0.95)]
        };
    }
}
