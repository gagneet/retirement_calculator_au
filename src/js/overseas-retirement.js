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
    analyzeCountry(countryCode, fxOptions = {}) {
        const country = COUNTRY_PROFILES[countryCode];

        if (!country) {
            return { error: 'Country not found' };
        }

        return {
            country: country.name,
            countryCode,
            overview: country.overview,
            currency: country.currency,
            distanceFromAustralia: country.distanceFromAustralia,
            flightTime: country.flightTime,
            climate: country.climate || null,
            agePensionPortability: this.calculatePensionPortability(country),
            taxImplications: this.analyzeTaxImplications(country),
            costOfLiving: this.compareCostOfLiving(country, fxOptions),
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
        const shortAbsenceWeeks = this.useProposedBudget
            ? (cfg.SHORT_ABSENCE_WEEKS_PROPOSED || 12)
            : (cfg.SHORT_ABSENCE_WEEKS || 6);

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
            agreementCountry: hasAgreement,
            shortAbsenceWeeks
        });

        const portabilityKickIn = cfg.PORTABILITY_THRESHOLD_WEEKS;
        // Overseas supplement full-rate period: current law by default, proposed rule only when toggled on.
        const supplementFullWeeks = shortAbsenceWeeks;

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
        // Use the tax residency preference set by the user, falling back to 'australian'
        const taxResidency = this.person?.overseasTaxResidency || 'australian';
        const hasDTA = !!(country.tax?.doubleTaxAgreement);
        const dtaSummary = country.tax?.agreementSummary || 'No formal agreement — consult a cross-border tax adviser';

        const base = {
            selectedResidency: taxResidency,
            superannuation: {
                access: 'Can access at age 60 regardless of overseas residence',
                taxation: 'Tax-free from age 60 (Australian tax)',
                considerations: [
                    'Some funds may close accounts for permanent overseas residents',
                    'Currency conversion fees apply',
                    country.tax?.superTaxation || 'Check local tax rules for super withdrawals'
                ]
            },
            doubleTaxAgreement: {
                exists: hasDTA,
                nhrScheme: country.tax?.nhrScheme || null,
                summary: dtaSummary
            }
        };

        if (taxResidency === 'foreign') {
            return {
                ...base,
                australianTaxResidency: {
                    status: 'Foreign tax resident of Australia',
                    implications: [
                        'Only Australian-sourced income is taxed in Australia',
                        'No tax-free threshold — 30% flat rate applies to Australian income',
                        'Withholding tax (typically 10–15%) applies to Australian bank interest',
                        'Super withdrawals remain tax-free at age 60+',
                        'Capital gains on Australian property taxed at 32.5% (no 50% CGT discount)'
                    ],
                    note: hasDTA
                        ? `Australia has a Double Tax Agreement with ${country.name} — may reduce Australian withholding tax on dividends, interest and royalties.`
                        : `No Double Tax Agreement with ${country.name} — potential for double taxation on investment income. Consider restructuring before departure.`
                }
            };
        }

        if (taxResidency === 'dta') {
            return {
                ...base,
                australianTaxResidency: {
                    status: 'Relying on Double Tax Agreement provisions',
                    implications: hasDTA ? [
                        `Australia–${country.name} DTA limits withholding tax on dividends, interest, and royalties`,
                        'Age Pension is generally only taxable in Australia under most DTAs',
                        'Super lump-sum payments may be exempt or reduced under DTA',
                        'Tiebreaker residency rules in the DTA determine primary taxing rights',
                        'Mutual agreement procedure available if both countries attempt to tax the same income'
                    ] : [
                        `No DTA exists between Australia and ${country.name}`,
                        'Cannot rely on DTA tiebreaker rules — manual tax advice required',
                        'Consider whether the additional tax cost changes the viability of this destination',
                        'Unilateral foreign tax offset (FTO) may provide partial relief for foreign taxes paid'
                    ],
                    note: hasDTA ? dtaSummary : 'No DTA available — seek specialist cross-border tax advice before finalising plans.'
                }
            };
        }

        // Default: 'australian' — user intends to maintain Australian tax residency
        return {
            ...base,
            australianTaxResidency: {
                status: 'Maintain Australian tax residency',
                implications: [
                    'Taxed on worldwide income at Australian rates',
                    'Retains tax-free threshold and full Medicare entitlements for Australian-sourced income',
                    'Can access super tax-free from age 60',
                    'Investment income from overseas assets taxed at Australian marginal rates',
                    'Requires strong ongoing ties to Australia (property, bank accounts, family, intention to return)'
                ],
                transitionRisk: {
                    trigger: 'ATO may deem you a foreign resident if you permanently sever ties',
                    implication: 'Deemed disposal of assets at CGT event on departure — advance planning critical'
                }
            }
        };
    }

    /**
     * Compare cost of living against ASFA comfortable retirement standard
     */
    compareCostOfLiving(country, fxOptions = {}) {
        // ASFA comfortable standard (2025) from config
        const cfgOverseas = ENHANCED_CONFIG.OVERSEAS_RETIREMENT;
        const australiaCost = this.person.partnered
            ? cfgOverseas.ASFA_COUPLE_ANNUAL
            : cfgOverseas.ASFA_SINGLE_ANNUAL;
        const countryCost = australiaCost * country.costOfLiving.index;

        // FX drift: apply cumulative AUD depreciation over projection years
        // audFxChangePerYear < 0 means AUD weakens → locally-denominated costs rise in AUD terms
        const { audFxChangePerYear = 0, projectionYears = 20, housingType = 'rent', annualRentAUD = 0 } = fxOptions;
        const fxMultiplier = Math.pow(1 - audFxChangePerYear, projectionYears); // after N years
        const fxAdjustedCost = Math.round(countryCost * fxMultiplier);

        // Housing cost override: if renting, substitute explicit rent figure for embedded housing cost
        const housingCostFraction = country.costOfLiving.breakdown?.housing ?? 0.30;
        const baseHousingCost = Math.round(countryCost * housingCostFraction);
        let effectiveHousingCost = baseHousingCost;
        if (housingType === 'rent' && annualRentAUD > 0) {
            effectiveHousingCost = annualRentAUD;
        } else if (housingType === 'own' || housingType === 'family') {
            effectiveHousingCost = 0; // no rent; maintenance/rates ignored for simplicity
        }
        const housingAdjustedCost = Math.round(countryCost - baseHousingCost + effectiveHousingCost);

        return {
            australiaAnnual: australiaCost,
            countryAnnual: Math.round(countryCost),
            savings: Math.round(australiaCost - countryCost),
            savingsPercent: ((1 - country.costOfLiving.index) * 100).toFixed(1),
            // FX-adjusted (after projectionYears of AUD drift)
            fxAdjustedAnnual: fxAdjustedCost,
            fxAdjustedSavings: Math.round(australiaCost - fxAdjustedCost),
            audFxChangePerYear,
            projectionYears,
            // Housing-adjusted
            housingType,
            effectiveHousingCost,
            housingAdjustedAnnual: housingAdjustedCost,
            breakdown: country.costOfLiving.breakdown,
            note: country.costOfLiving.note
        };
    }

    /**
     * Generate a return-to-Australia fallback scenario.
     * Returns a plain object describing what happens if the person returns at fallbackAge.
     */
    generateFallbackScenario(countryCode, fallbackAge, fallbackTrigger, agreementCountry = false) {
        const country = COUNTRY_PROFILES[countryCode];
        const departureAge = this.person.departureAge || this.person.retirementAge || 67;

        if (!fallbackAge || fallbackAge <= 0 || fallbackAge <= departureAge) {
            return null;
        }

        const yearsOverseas = fallbackAge - departureAge;

        // 2-year waiting period on return (waived for agreement countries)
        const waitingPeriod = agreementCountry ? 0 : 2;

        // AWLR: years of Australian Working Life Residence
        const awlrYears = this.person.australianWorkingLifeYears || 35;
        const awlrQualified = awlrYears >= 35; // full rate after return

        // Pension suspended during 2-yr wait for non-agreement countries
        const pensionLostDuringWait = !agreementCountry && waitingPeriod > 0;
        const annualPensionFromConfig = this.person.partnered
            ? ENHANCED_CONFIG.COUPLE_PENSION_MAX
            : ENHANCED_CONFIG.SINGLE_PENSION_MAX;

        const estimatedLostPension = pensionLostDuringWait
            ? Math.round(annualPensionFromConfig * waitingPeriod)
            : 0;

        const triggerLabels = {
            health:        'Health / aged care needs',
            financial:     'Financial difficulty',
            social:        'Social / family reasons',
            partner_death: 'After partner death',
            elective:      'Elective lifestyle choice',
            none:          'Not specified'
        };

        return {
            fallbackAge,
            yearsOverseas,
            fallbackTrigger,
            triggerLabel:        triggerLabels[fallbackTrigger] || triggerLabels.none,
            agreementCountry,
            waitingPeriod,
            pensionLostDuringWait,
            estimatedLostPension,
            awlrYears,
            awlrQualified,
            countryName:         country ? country.name : countryCode,
            pensionReinstated:   true, // always reinstated after wait, subject to assets/income test
            notes: [
                pensionLostDuringWait
                    ? `⚠️ Pension payments suspend for up to ${waitingPeriod} year(s) after return (former resident rule). Estimated cost: $${estimatedLostPension.toLocaleString('en-AU')}.`
                    : '✅ Agreement country — no additional waiting period on return.',
                awlrQualified
                    ? `✅ With ${awlrYears} years AWLR (≥35), full Age Pension reinstated immediately after wait.`
                    : `⚠️ With ${awlrYears} years AWLR (<35), pension reinstated at a proportional rate (${awlrYears}/35 of maximum).`,
                fallbackTrigger === 'health'
                    ? '🏥 Returning for health/aged care: Medicare reinstates immediately on return. Aged care assessment (ACAT) required.'
                    : '',
                `📅 ${yearsOverseas} years overseas (age ${departureAge}–${fallbackAge}).`
            ].filter(Boolean)
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
