/**
 * Overseas Retirement Analyzer
 * Analyzes Age Pension portability, tax implications, and financial viability
 * for retiring in popular overseas destinations.
 *
 * IMPORTANT: All pension/deeming calculations delegate to policy-engine.js.
 * There is NO local copy of pension rate logic in this file — that was the
 * prior bug identified in the deep research audit (overseas module maintained
 * its own divergent pension estimation instead of using the shared engine).
 *
 * Sources:
 * - Services Australia: servicesaustralia.gov.au
 * - Department of Social Services: dss.gov.au/international-social-security-agreements
 * - ATO: ato.gov.au
 * - SuperGuide: superguide.com.au
 */

import { COUNTRY_PROFILES } from './country-profiles.js';
import { ENHANCED_CONFIG } from './config.js';
import {
    buildDeemedAssets,
    calculateSinglePension,
    generateOverseasScenarioTree
} from './policy-engine.js';

export class OverseasRetirementAnalyzer {
    constructor(personalDetails, financialData) {
        this.person = personalDetails;
        this.finances = financialData;
        // Proposed Budget 2026-27 toggle: overseas supplement weeks 6→12 (not yet law).
        this.useProposedBudget = !!(personalDetails.enableProposedBudget2026 || financialData.enableProposedBudget2026);
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
     * Calculate Age Pension portability for a given country, across all scenarios.
     *
     * This method now delegates entirely to policy-engine.js so that overseas
     * pension estimates always use the same rates and thresholds as the main
     * calculator. The prior bug was that this class maintained its own divergent
     * pension estimation using only investmentBalance for deeming, and only
     * Sept 2025 rates hardcoded locally.
     *
     * Source: Services Australia - servicesaustralia.gov.au/travel-outside-australia-rules-for-age-pension
     */
    calculatePensionPortability(country) {
        const age = this.person.age || 65;
        const retirementAge = this.person.retirementAge || age;

        // Derive AWLR (Australian Working Life Residence, age 16 to pension age 67)
        const residencyYears = this.person.australianResidenceYears > 0
            ? this.person.australianResidenceYears
            : this.person.ageCameToAustralia > 0
                ? Math.max(0, retirementAge - this.person.ageCameToAustralia)
                : (age - 16); // default: in Australia since age 16

        const cfg = ENHANCED_CONFIG.OVERSEAS_RETIREMENT;
        const awlrYears = Math.min(Math.max(0, residencyYears), cfg.AWLR_TOTAL_YEARS);
        const proportionalRate = Math.min(awlrYears / cfg.AWLR_REQUIRED_FOR_FULL, 1.0);
        const hasFullPortability = awlrYears >= cfg.AWLR_REQUIRED_FOR_FULL;
        const hasAgreement = !!country.socialSecurityAgreement;

        // === BUG FIX: use shared policy engine for pension estimate ===
        // Previously: only investmentBalance was used for deeming (too narrow).
        // Now: buildDeemedAssets() includes super, investments, savings, managed funds etc.
        // Previously: locally duplicated threshold/rate logic.
        // Now: calculateSinglePension() uses canonical thresholds from config.
        const currentPensionResult = this.estimateCurrentAgePension();

        // Generate the full four-scenario tree using the policy engine
        const scenarioTree = generateOverseasScenarioTree({
            basePension: currentPensionResult,
            awlrYears,
            isCouple: !!this.person.partnered,
            agreementCountry: hasAgreement
        });

        const portabilityKickIn = cfg.PORTABILITY_THRESHOLD_WEEKS;
        // Overseas supplement full-rate period: 6 weeks (current law) or 12 weeks (proposed, not yet law)
        const supplementFullWeeks = this.useProposedBudget
            ? (cfg.SHORT_ABSENCE_WEEKS_PROPOSED || 12)
            : (cfg.SHORT_ABSENCE_WEEKS || 6);

        // Backward-compatible result structure enhanced with scenario tree
        return {
            AWLR: awlrYears,
            AWLRPercentage: ((awlrYears / cfg.AWLR_REQUIRED_FOR_FULL) * 100).toFixed(1),
            fullPortability: hasFullPortability,
            hasAgreement,
            portabilityKickIn,
            // The four mandatory overseas scenarios from the research
            scenarioTree,
            rules: hasAgreement ? {
                status: 'SOCIAL_SECURITY_AGREEMENT',
                initialPeriod: `Full rate for first ${supplementFullWeeks} weeks`,
                afterSixWeeks: `Pension Supplement top-up and Energy Supplement stop after ${supplementFullWeeks} weeks; Pensioner Concession Card cancelled`,
                afterSixMonths: hasFullPortability
                    ? 'Continue full rate indefinitely (agreement country + 35+ years AWLR)'
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
                initialPeriod: `Full rate for first ${supplementFullWeeks} weeks`,
                afterSixWeeks: `Pension Supplement top-up and Energy Supplement stop after ${supplementFullWeeks} weeks; Pensioner Concession Card cancelled`,
                afterSixMonths: hasFullPortability
                    ? 'Continue full rate (35+ years AWLR)'
                    : `Reduced to ${(proportionalRate * 100).toFixed(1)}% (AWLR: ${awlrYears} of ${cfg.AWLR_REQUIRED_FOR_FULL} years)`,
                disadvantages: [
                    `⚠️ ${cfg.RETURN_WAITING_PERIOD_YEARS}-year former resident waiting period applies on return to Australia`,
                    'Must be in Australia to initially apply for Age Pension',
                    this.useProposedBudget
                        ? 'Pension Supplement top-up and Energy Supplement stop after 12 weeks overseas (proposed Budget 2026-27, not yet law)'
                        : 'Pension Supplement top-up and Energy Supplement stop after 6 weeks overseas',
                    'AWLR-proportional rate applies after 26 weeks overseas'
                ]
            },
            // Keep pensionCalculation for backward-compat with country comparison UI
            pensionCalculation: {
                inAustralia: Math.round(currentPensionResult),
                overseas: Math.round(scenarioTree.permanentMove.annualPension),
                reduction: Math.round(currentPensionResult - scenarioTree.permanentMove.annualPension),
                supplementLost: Math.round(scenarioTree.permanentMove.supplementLost),
                reductionPercent: currentPensionResult > 0
                    ? (((currentPensionResult - scenarioTree.permanentMove.annualPension) / currentPensionResult) * 100).toFixed(1)
                    : '0',
                // New: scenario breakdown
                afterSixWeeks: Math.round(scenarioTree.longAbsence.annualPension),
                permanentMove: Math.round(scenarioTree.permanentMove.annualPension),
                policyDate: ENHANCED_CONFIG.POLICY_EFFECTIVE_DATE
            }
        };
    }

    /**
     * Estimate current Age Pension entitlement using the shared policy engine.
     *
     * BUG FIX: Previously, this method only deemed `investmentBalance`. Services
     * Australia applies deeming to a broader set of financial assets including super,
     * savings accounts, term deposits, managed funds, and listed shares.
     * This method now uses buildDeemedAssets() to capture all deem-able assets,
     * and calculateSinglePension() from policy-engine.js for canonical rates.
     *
     * @returns {number} Annual pension estimate (AUD)
     */
    estimateCurrentAgePension() {
        const homeowner = (this.finances.homeValue || 0) > 0;
        const isCouple = !!this.person.partnered;

        // FIXED: include all financial assets in deeming scope (not just investmentBalance)
        const totalFinancialAssets = buildDeemedAssets(this.finances);

        // FIXED: include all assessable assets (super + investments + savings, etc.)
        const totalAssessableAssets = (this.finances.superBalance || 0) +
            (this.finances.investmentBalance || 0) +
            (this.finances.savingsBalance || 0) +
            (this.finances.termDeposits || 0) +
            (this.finances.managedFunds || 0) +
            (this.finances.listedShares || 0) +
            (this.finances.otherFinancialAssets || 0);

        const otherIncome = this.finances.otherIncome || 0;

        const result = calculateSinglePension({
            totalAssets: totalAssessableAssets,
            financialAssets: totalFinancialAssets,
            otherIncome,
            isCouple,
            homeowner
        });

        return result.annualPension;
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
