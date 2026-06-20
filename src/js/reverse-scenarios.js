/**
 * reverse-scenarios.js - Household pattern detection and scenario adjustments
 * for the Reverse Retirement Planner.
 *
 * Handles:
 *  - Detecting household earning patterns (single / couple variants)
 *  - Adjusting targets for overseas retirement
 *  - Age pension portability sensitivity scenarios
 */

import { ENHANCED_CONFIG } from './config.js';
import COUNTRY_PROFILES from './country-profiles.js';

// ---------------------------------------------------------------------------
// Household pattern detection
// ---------------------------------------------------------------------------

/**
 * Detect household earning pattern from inputs.
 *
 * @param {object} inputs  Normalized simulator inputs
 * @returns {string}  Pattern key
 */
export function detectHouseholdPattern(inputs) {
    const salary = inputs.yourSalary || 0;
    const partnerSalary = inputs.partnerSalary || 0;
    const super_ = inputs.yourCurrentSuper || 0;
    const partnerSuper = inputs.partnerCurrentSuper || 0;
    const isCouple = inputs.isCouple || inputs.isSingleCalculation === false || partnerSalary > 0;

    if (!isCouple) {
        if (salary > 150000 && super_ < salary * 5) return 'high_income_low_super';
        if (salary < 60000) return 'low_income';
        return 'single_earner';
    }

    // Couple patterns
    const totalSalary = salary + partnerSalary;
    const salaryRatio = totalSalary > 0 ? Math.min(salary, partnerSalary) / totalSalary : 0;

    if (salaryRatio > 0.4) return 'equal_earners';
    if (salaryRatio < 0.15) return 'one_earner';
    if (totalSalary > 200000) return 'dual_high_income';
    return 'dual_income';
}

// ---------------------------------------------------------------------------
// Household lever builder
// ---------------------------------------------------------------------------

/**
 * Build the set of levers appropriate for a household type.
 * Couple households get additional equalisation/splitting levers.
 *
 * @param {object} baseInputs   Normalized simulator inputs
 * @param {object} target       Target object
 * @param {string} householdType  'single' | 'couple'
 * @returns {object}  { leverKeys: string[], coupleSplitConfig }
 */
export function buildHouseholdLevers(baseInputs, target, householdType) {
    const pattern = detectHouseholdPattern(baseInputs);

    // Standard levers for all household types
    const standardLevers = [
        'extraAnnualSuper',
        'extraSavings',
        'mortgageRepayment',
        'retirementAge',
        'spendingReduction',
    ];

    if (householdType !== 'couple') {
        return {
            leverKeys: standardLevers,
            coupleSplitConfig: null,
            pattern,
        };
    }

    // Couple-specific additions
    const coupleLevers = [
        ...standardLevers,
        'spouseContributionSplitting',   // Split super between partners
        'spouseContribution',            // Non-concessional contribution to low-balance spouse
        'incomeEqualization',            // Equalise assessable income for tax efficiency
        'netRent',
    ];

    // Spouse contribution splitting is most valuable when super balances differ
    const superDiff = Math.abs(
        (baseInputs.yourCurrentSuper || 0) - (baseInputs.partnerCurrentSuper || 0)
    );

    const coupleSplitConfig = {
        superImbalance: superDiff,
        hasSignificantImbalance: superDiff > 50000,
        pattern,
        recommendedSplitAmount: superDiff > 50000 ? Math.min(superDiff * 0.3, 30000) : 0,
    };

    return {
        leverKeys: coupleLevers,
        coupleSplitConfig,
        pattern,
    };
}

// ---------------------------------------------------------------------------
// Overseas target adjustment
// ---------------------------------------------------------------------------

/**
 * Adjust a retirement income target for living overseas.
 *
 * @param {number} targetToday              Target annual income (today's AUD)
 * @param {string|object} countryOrProfile  Country code string or profile object
 * @param {number} fxBufferPct              Additional FX risk buffer (default 10%)
 * @returns {object}  { adjustedTarget, costIndex, healthInsuranceAnnual, fxBuffer, breakdown }
 */
export function adjustTargetForOverseas(targetToday, countryOrProfile, fxBufferPct = 0.10) {
    let profile;
    if (typeof countryOrProfile === 'string') {
        profile = COUNTRY_PROFILES[countryOrProfile];
    } else {
        profile = countryOrProfile;
    }

    if (!profile) {
        return {
            adjustedTarget: targetToday,
            costIndex: 1.0,
            healthInsuranceAnnual: 0,
            fxBuffer: 0,
            breakdown: { reason: 'Unknown country profile' }
        };
    }

    const costIndex = profile.costOfLiving?.index ?? 1.0;

    // Estimate private health insurance (rough annual amount for retirees)
    let healthInsuranceAnnual = 0;
    const healthcareSystem = (profile.healthcare?.system || '').toLowerCase();
    if (!profile.socialSecurityAgreement ||
        healthcareSystem.includes('private') ||
        healthcareSystem.includes('must purchase')) {
        // No reciprocal agreement — budget for private health insurance
        healthInsuranceAnnual = profile.healthcare?.insurance
            ? parseFloat((profile.healthcare.insurance.match(/\d[\d,]*/)?.[0] || '0').replace(/,/g, '')) * 12
            : 4000; // Default: ~$4,000 AUD/year
    }

    const adjustedBase = targetToday * costIndex;
    const fxBuffer = adjustedBase * fxBufferPct;
    const adjustedTarget = adjustedBase + healthInsuranceAnnual + fxBuffer;

    return {
        adjustedTarget: Math.round(adjustedTarget),
        costIndex,
        healthInsuranceAnnual,
        fxBuffer: Math.round(fxBuffer),
        breakdown: {
            baseAustraliaTarget: targetToday,
            costAdjusted: Math.round(adjustedBase),
            healthInsurance: healthInsuranceAnnual,
            fxBuffer: Math.round(fxBuffer),
            total: Math.round(adjustedTarget),
            agePensionNote: profile.agePension?.note || null,
        }
    };
}

// ---------------------------------------------------------------------------
// Age pension portability sensitivity
// ---------------------------------------------------------------------------

/**
 * Build four scenarios based on different age pension portability assumptions.
 * Useful for showing overseas retirement risk to income.
 *
 * @param {number} agePensionAmount  Annual age pension (today's AUD)
 * @returns {object}  { p100, p75, p50, p0 } — four scenarios
 */
export function buildAgePensionPortabilitySensitivity(agePensionAmount) {
    return {
        p100: {
            label: 'Full Age Pension (Social Security Agreement country)',
            annualPension: agePensionAmount,
            description: 'Countries with bilateral Social Security Agreement (e.g. NZ, Canada, Japan)',
            portabilityRate: 1.0,
        },
        p75: {
            label: '75% Age Pension (partial portability)',
            annualPension: agePensionAmount * 0.75,
            description: 'Partial portability depending on residency rules and AWLR',
            portabilityRate: 0.75,
        },
        p50: {
            label: '50% Age Pension (former resident rule applies)',
            annualPension: agePensionAmount * 0.50,
            description: 'Former resident rule may apply; reduced rate possible',
            portabilityRate: 0.50,
        },
        p0: {
            label: 'No Age Pension (no agreement)',
            annualPension: 0,
            description: 'No agreement country or disqualified under former resident rules',
            portabilityRate: 0.0,
        },
    };
}

// ---------------------------------------------------------------------------
// Overseas comparison builder
// ---------------------------------------------------------------------------

/**
 * Build an overseas comparison for all known country profiles.
 *
 * @param {number} targetAnnualIncomeAUD  Target income in today's AUD
 * @param {number} agePensionAnnual       Expected age pension (AUD/year)
 * @returns {Array}  Array of country comparison objects sorted by adjusted target
 */
export function buildOverseasComparison(targetAnnualIncomeAUD, agePensionAnnual = 0) {
    return Object.entries(COUNTRY_PROFILES)
        .map(([code, profile]) => {
            const adjusted = adjustTargetForOverseas(targetAnnualIncomeAUD, profile);
            // Subtract age pension for net private income needed
            const privateFundingNeeded = Math.max(0, adjusted.adjustedTarget - agePensionAnnual);

            return {
                code,
                name: profile.name,
                region: profile.region,
                currency: profile.currency,
                costIndex: profile.costOfLiving?.index ?? 1.0,
                adjustedTargetAUD: adjusted.adjustedTarget,
                privateFundingNeeded,
                healthInsuranceAnnual: adjusted.healthInsuranceAnnual,
                fxBuffer: adjusted.fxBuffer,
                socialSecurityAgreement: profile.socialSecurityAgreement,
                agePensionPortability: profile.agePension?.portability,
                visaEase: profile.visa?.easeOfAccess,
                savingVsAustralia: targetAnnualIncomeAUD - adjusted.adjustedTarget,
                breakdown: adjusted.breakdown,
            };
        })
        .sort((a, b) => a.adjustedTargetAUD - b.adjustedTargetAUD);
}
