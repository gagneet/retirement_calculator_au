/**
 * Overseas Retirement Analyzer
 * Analyzes Age Pension portability, tax implications, and financial viability
 * for retiring in popular overseas destinations
 *
 * Sources:
 * - Services Australia: servicesaustralia.gov.au
 * - Department of Social Services: dss.gov.au/international-social-security-agreements
 * - ATO: ato.gov.au
 * - SuperGuide: superguide.com.au
 */

import { COUNTRY_PROFILES } from './country-profiles.js';
import { ENHANCED_CONFIG } from './config.js';

export class OverseasRetirementAnalyzer {
    constructor(personalDetails, financialData) {
        this.person = personalDetails;
        this.finances = financialData;
    }

    /**
     * Analyze specific country for retirement
     * @param {string} countryCode - Country code (e.g., 'PORTUGAL', 'THAILAND')
     * @returns {Object} Comprehensive country analysis
     */
    analyzeCountry(countryCode) {
        const country = COUNTRY_PROFILES[countryCode];

        if (!country) {
            return { error: 'Country not found' };
        }

        return {
            country: country.name,
            overview: country.overview,
            agePensionPortability: this.calculatePensionPortability(country),
            taxImplications: this.analyzeTaxImplications(country),
            costOfLiving: this.compareCostOfLiving(country),
            healthcare: country.healthcare,
            visaRequirements: country.visa,
            riskAssessment: this.assessRisks(country),
            recommendations: this.generateRecommendations(country)
        };
    }

    /**
     * Calculate Age Pension portability for country
     * Uses AWLR (Australian Working Life Residence) calculation
     * Source: Services Australia - servicesaustralia.gov.au/travel-outside-australia-rules-for-age-pension
     */
    calculatePensionPortability(country) {
        const age = this.person.age || 65;
        const retirementAge = this.person.retirementAge || age;

        // Use ageCameToAustralia to calculate effective residency if provided
        const residencyYears = this.person.australianResidenceYears > 0
            ? this.person.australianResidenceYears
            : this.person.ageCameToAustralia > 0
                ? Math.max(0, retirementAge - this.person.ageCameToAustralia)
                : (age - 18);
        const yearsInAustralia = residencyYears;

        // AWLR: Australian Working Life Residence (age 16 to pension age 67)
        const cfg = ENHANCED_CONFIG.OVERSEAS_RETIREMENT;
        const AWLR = Math.min(yearsInAustralia, cfg.AWLR_TOTAL_YEARS);
        const hasFullPortability = AWLR >= cfg.AWLR_REQUIRED_FOR_FULL;
        const proportionalRate = Math.min(AWLR / cfg.AWLR_REQUIRED_FOR_FULL, 1.0);

        const hasAgreement = country.socialSecurityAgreement;

        // Estimate current Age Pension using Sept 2025 thresholds from config
        const currentPension = this.estimateCurrentAgePension();

        // After 26 weeks overseas: apply AWLR proportion AND lose pension supplement top-up
        // The basic pension supplement rate is retained but the top-up and Energy Supplement are lost
        const overseasPension = currentPension * proportionalRate;
        const supplementReduction = this.person.partnered
            ? cfg.PENSION_SUPPLEMENT_REDUCTION_COUPLE
            : cfg.PENSION_SUPPLEMENT_REDUCTION_SINGLE;
        const finalOverseasPension = Math.max(0, overseasPension - supplementReduction);

        // Weeks before portability rules kick in
        const portabilityKickIn = cfg.PORTABILITY_THRESHOLD_WEEKS;

        return {
            AWLR,
            AWLRPercentage: ((AWLR / cfg.AWLR_REQUIRED_FOR_FULL) * 100).toFixed(1),
            fullPortability: hasFullPortability,
            hasAgreement,
            portabilityKickIn,
            rules: hasAgreement ? {
                status: 'SOCIAL_SECURITY_AGREEMENT',
                initialPeriod: `Full rate for first ${portabilityKickIn} weeks`,
                afterSixMonths: hasFullPortability
                    ? 'Continue full rate indefinitely (agreement country)'
                    : `Proportional rate: ${(proportionalRate * 100).toFixed(1)}% of eligible amount`,
                advantages: [
                    'No 2-year former resident waiting period',
                    'Pension portable indefinitely while in agreement country',
                    'Can apply while overseas',
                    'Periods in agreement country may count toward AWLR',
                    'Easier eligibility rules'
                ]
            } : {
                status: 'NO_AGREEMENT',
                initialPeriod: `Full rate for first ${portabilityKickIn} weeks`,
                afterSixMonths: hasFullPortability
                    ? 'Continue full rate (35+ years AWLR)'
                    : `Reduced to ${(proportionalRate * 100).toFixed(1)}% (AWLR: ${AWLR} of ${cfg.AWLR_REQUIRED_FOR_FULL} years)`,
                disadvantages: [
                    '⚠️ 2-year former resident waiting period applies on return to Australia',
                    'Must be in Australia to initially apply for Age Pension',
                    'Pension Supplement top-up and Energy Supplement stop after 26 weeks',
                    'Pensioner Concession Card cancelled after 6 weeks overseas'
                ]
            },
            pensionCalculation: {
                inAustralia: Math.round(currentPension),
                overseas: Math.round(finalOverseasPension),
                reduction: Math.round(currentPension - finalOverseasPension),
                supplementLost: Math.round(supplementReduction),
                reductionPercent: currentPension > 0
                    ? (((currentPension - finalOverseasPension) / currentPension) * 100).toFixed(1)
                    : '0'
            }
        };
    }

    /**
     * Estimate current Age Pension entitlement using Sept 2025 config rates.
     * Uses both the asset test and income test; returns the lower result.
     * Deeming rates applied per Services Australia (Sept 2025):
     *   - 0.75% on the first $64,200 (single) / $106,200 (couple)
     *   - 2.75% on amounts above the threshold
     */
    estimateCurrentAgePension() {
        const totalAssets = (this.finances.superBalance || 0) +
                           (this.finances.investmentBalance || 0);
        const investmentBalance = this.finances.investmentBalance || 0;
        const homeowner = (this.finances.homeValue || 0) > 0;
        const cfg = ENHANCED_CONFIG;

        // Use actual tiered deeming rates from config (Services Australia Sept 2025)
        const deemingThreshold = this.person.partnered
            ? cfg.DEMING_THRESHOLD_COUPLE
            : cfg.DEMING_THRESHOLD_SINGLE;
        const lowerDeemedIncome = Math.min(investmentBalance, deemingThreshold) * cfg.DEMING_RATE_LOWER;
        const upperDeemedIncome = Math.max(0, investmentBalance - deemingThreshold) * cfg.DEMING_RATE_UPPER;
        const annualDeemedIncome = lowerDeemedIncome + upperDeemedIncome;

        // Use current Sept 2025 config thresholds
        const assetThreshold = homeowner
            ? (this.person.partnered ? cfg.COUPLE_ASSET_THRESHOLD : cfg.SINGLE_ASSET_THRESHOLD)
            : (this.person.partnered ? cfg.COUPLE_ASSET_THRESHOLD_NON_HOMEOWNER : cfg.SINGLE_ASSET_THRESHOLD_NON_HOMEOWNER);
        const assetLimit = homeowner
            ? (this.person.partnered ? cfg.COUPLE_ASSET_LIMIT : cfg.SINGLE_ASSET_LIMIT)
            : (this.person.partnered ? cfg.COUPLE_ASSET_LIMIT_NON_HOMEOWNER : cfg.SINGLE_ASSET_LIMIT_NON_HOMEOWNER);
        const incomeThreshold = this.person.partnered ? cfg.COUPLE_INCOME_THRESHOLD : cfg.SINGLE_INCOME_THRESHOLD;
        const maxRate = this.person.partnered ? cfg.COUPLE_PENSION_MAX : cfg.SINGLE_PENSION_MAX;

        // Asset test: $3 per fortnight reduction for every $1,000 over threshold
        let pensionFromAssets;
        if (totalAssets <= assetThreshold) {
            pensionFromAssets = maxRate;
        } else if (totalAssets < assetLimit) {
            const excessAssets = totalAssets - assetThreshold;
            const reduction = (excessAssets / 1000) * 3 * cfg.FORTNIGHTS_IN_YEAR;
            pensionFromAssets = Math.max(0, maxRate - reduction);
        } else {
            pensionFromAssets = 0;
        }

        // Income test: 50 cents per dollar over fortnightly threshold
        const fortnightlyDeemedIncome = annualDeemedIncome / cfg.FORTNIGHTS_IN_YEAR;
        let pensionFromIncome = maxRate;
        if (fortnightlyDeemedIncome > incomeThreshold) {
            const reduction = (fortnightlyDeemedIncome - incomeThreshold) * 0.5 * cfg.FORTNIGHTS_IN_YEAR;
            pensionFromIncome = Math.max(0, maxRate - reduction);
        }

        return Math.min(pensionFromAssets, pensionFromIncome);
    }

    /**
     * Analyze tax implications
     */
    analyzeTaxImplications(country) {
        return {
            australianTaxResidency: {
                status: 'Initially remain Australian tax resident',
                implications: [
                    'Taxed on worldwide income',
                    'Can access super tax-free from age 60',
                    'Investment income taxed at Australian rates'
                ],
                transitionToForeign: {
                    when: 'After establishing permanent residence',
                    implications: [
                        'Only Australian-sourced income taxed in Australia',
                        'Super withdrawals still tax-free (age 60+)',
                        'No tax-free threshold (30% flat rate on Australian income)'
                    ]
                }
            },
            superannuation: {
                access: 'Can access at age 60 regardless of overseas residence',
                taxation: 'Tax-free from age 60 (Australian tax)',
                considerations: [
                    'Some funds may close accounts for permanent overseas residents',
                    'Currency conversion fees apply',
                    country.tax?.superTaxation || 'Check local tax rules'
                ]
            },
            doubleTaxAgreement: {
                exists: country.tax?.doubleTaxAgreement || false,
                nhrScheme: country.tax?.nhrScheme || null,
                summary: country.tax?.agreementSummary || 'Consult tax adviser'
            }
        };
    }

    /**
     * Compare cost of living against ASFA comfortable retirement standard
     */
    compareCostOfLiving(country) {
        // ASFA comfortable standard (2025) from config
        const cfgOverseas = ENHANCED_CONFIG.OVERSEAS_RETIREMENT;
        const australiaCost = this.person.partnered
            ? cfgOverseas.ASFA_COUPLE_ANNUAL
            : cfgOverseas.ASFA_SINGLE_ANNUAL;
        const countryCost = australiaCost * country.costOfLiving.index;

        return {
            australiaAnnual: australiaCost,
            countryAnnual: Math.round(countryCost),
            savings: Math.round(australiaCost - countryCost),
            savingsPercent: ((1 - country.costOfLiving.index) * 100).toFixed(1),
            breakdown: country.costOfLiving.breakdown,
            note: country.costOfLiving.note
        };
    }

    /**
     * Assess risks
     */
    assessRisks(country) {
        return {
            overall: country.risks?.overall || 'MEDIUM',
            factors: {
                currency: {
                    level: country.risks?.currency || 'MEDIUM',
                    note: `AUD/${country.currency} volatility`,
                    consideration: 'Age Pension paid in AUD helps hedge currency risk'
                },
                healthcare: {
                    level: country.risks?.healthcare || 'MEDIUM',
                    rating: country.healthcare.rating,
                    note: country.healthcare.quality
                },
                political: {
                    level: country.risks?.political || 'LOW',
                    note: country.risks?.politicalNote || 'Generally stable'
                },
                distance: {
                    level: country.distanceFromAustralia > 10000 ? 'HIGH' : 'LOW',
                    distance: country.distanceFromAustralia,
                    flightTime: country.flightTime,
                    consideration: 'Important for family visits and emergencies'
                }
            }
        };
    }

    /**
     * Generate recommendations
     */
    generateRecommendations(country) {
        const pension = this.calculatePensionPortability(country);
        const cost = this.compareCostOfLiving(country);

        const viable = pension.pensionCalculation.overseas >= cost.countryAnnual;

        const suitability = this.assessSuitability(country);

        return {
            suitability,
            financialViability: viable
                ? {
                    viable: true,
                    message: `✓ Financially viable on Age Pension`,
                    surplus: Math.round(pension.pensionCalculation.overseas - cost.countryAnnual),
                    note: 'Can live comfortably on Age Pension alone'
                }
                : {
                    viable: false,
                    message: `⚠️ Age Pension insufficient`,
                    shortfall: Math.round(cost.countryAnnual - pension.pensionCalculation.overseas),
                    note: 'Additional income needed from super/investments'
                },
            keySteps: [
                '1. Research visa requirements and eligibility',
                '2. Calculate exact Age Pension with Centrelink',
                '3. Consult international tax specialist',
                '4. Arrange comprehensive travel/health insurance',
                '5. Consider trial stay (3-6 months) before permanent move',
                '6. Set up Australian bank account with international access',
                '7. Notify Centrelink of overseas move (within 13 weeks)'
            ],
            bestFor: country.bestFor,
            challenges: country.challenges,
            additionalNotes: country.additionalNotes || []
        };
    }

    /**
     * Assess overall suitability
     */
    assessSuitability(country) {
        let score = 0;
        let maxScore = 0;

        // Cost of living (weight: 30)
        maxScore += 30;
        if (country.costOfLiving.index < 0.5) score += 30;
        else if (country.costOfLiving.index < 0.7) score += 20;
        else score += 10;

        // Healthcare (weight: 25)
        maxScore += 25;
        if (country.healthcare.rating >= 8) score += 25;
        else if (country.healthcare.rating >= 6) score += 15;
        else score += 5;

        // Visa ease (weight: 20)
        maxScore += 20;
        if (country.visa.easeOfAccess === 'EASY') score += 20;
        else if (country.visa.easeOfAccess === 'MODERATE') score += 12;
        else score += 5;

        // Distance (weight: 15)
        maxScore += 15;
        if (country.distanceFromAustralia < 5000) score += 15;
        else if (country.distanceFromAustralia < 10000) score += 10;
        else score += 3;

        // Social Security Agreement (weight: 10)
        maxScore += 10;
        if (country.socialSecurityAgreement) score += 10;

        const percentage = (score / maxScore * 100).toFixed(0);

        if (percentage >= 75) return 'HIGHLY SUITABLE';
        if (percentage >= 60) return 'SUITABLE';
        if (percentage >= 45) return 'MODERATELY SUITABLE';
        return 'LESS SUITABLE';
    }

    /**
     * Compare multiple countries
     * @param {Array} countryCodes - Array of country codes to compare
     * @returns {Object} Side-by-side comparison
     */
    compareCountries(countryCodes) {
        const comparisons = countryCodes.map(code => this.analyzeCountry(code));

        return {
            countries: comparisons,
            summary: {
                cheapest: this.findCheapest(comparisons),
                bestHealthcare: this.findBestHealthcare(comparisons),
                closestToAustralia: this.findClosest(comparisons),
                bestPensionPortability: this.findBestPension(comparisons)
            }
        };
    }

    findCheapest(comparisons) {
        return comparisons.reduce((cheapest, current) =>
            current.costOfLiving.countryAnnual < cheapest.costOfLiving.countryAnnual ? current : cheapest
        ).country;
    }

    findBestHealthcare(comparisons) {
        return comparisons.reduce((best, current) =>
            current.healthcare.rating > best.healthcare.rating ? current : best
        ).country;
    }

    findClosest(comparisons) {
        return comparisons.reduce((closest, current) =>
            current.riskAssessment.factors.distance.distance <
            closest.riskAssessment.factors.distance.distance ? current : closest
        ).country;
    }

    findBestPension(comparisons) {
        return comparisons.reduce((best, current) =>
            current.agePensionPortability.pensionCalculation.overseas >
            best.agePensionPortability.pensionCalculation.overseas ? current : best
        ).country;
    }
}

export default OverseasRetirementAnalyzer;
