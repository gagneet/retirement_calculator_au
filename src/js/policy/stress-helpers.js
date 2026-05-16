/**
 * stress-helpers.js — Stress Test Input Modifiers
 *
 * Extracted from app.js so buildStressedInputs() can be imported directly
 * in tests (PR review comment #3247765311).
 *
 * buildStressedInputs() applies field-level scenario modifiers to baseInputs
 * before the simulation runs.  Year-by-year return overrides (equityReturn,
 * bondReturn etc.) are normalised here into the yearlyEquityReturns /
 * yearlyBondReturns arrays that simulateRetirement() expects.
 *
 * Scenario shapes supported:
 *   1. { year1, year2, … yearN }  — multi-year objects (COVID, GFC)
 *      Each yearN is { equityReturn, bondReturn, propertyReturn, cashRate }.
 *      These are normalised into yearlyEquityReturns / yearlyBondReturns arrays
 *      so simulateRetirement() can apply them via its stressScenario path.
 *   2. { equityReturn, bondReturn }  — single uniform-return scenario (Property
 *      Market Correction, Mining Boom End, Interest Rate Shock).
 *   3. { healthcareCostMultiplier }  — cost multiplier only (Healthcare Crisis).
 */

/**
 * Normalise a config.js STRESS_SCENARIOS entry into the shape expected by
 * simulateRetirement(inputs, false, stressScenario).
 *
 * simulateRetirement checks:
 *   • stressScenario.yearlyEquityReturns   — array of per-year equity returns
 *   • stressScenario.yearlyBondReturns     — array of per-year bond returns
 *   • stressScenario.equityReturn          — flat equity return (fallback)
 *   • stressScenario.bondReturn            — flat bond return (fallback)
 *   • stressScenario.duration              — number of stress years
 *   • stressScenario.isRetirementTimed     — set to true so retirement-phase loop uses it
 *
 * @param {Object} scenario – raw STRESS_SCENARIOS entry from config.js
 * @returns {Object}        – normalised stress scenario for simulateRetirement
 */
function normaliseStressScenario(scenario) {
    // Collect yearN keys (year1, year2, year3, …) in order
    const yearKeys = Object.keys(scenario)
        .filter((k) => /^year\d+$/.test(k))
        .sort((a, b) => Number(a.replace('year', '')) - Number(b.replace('year', '')));

    if (yearKeys.length > 0) {
        // Multi-year scenario (COVID-19, GFC, etc.)
        const yearlyEquityReturns = yearKeys.map((k) => scenario[k].equityReturn ?? 0);
        const yearlyBondReturns   = yearKeys.map((k) => scenario[k].bondReturn   ?? 0.02);

        return {
            ...scenario,
            yearlyEquityReturns,
            yearlyBondReturns,
            duration: scenario.duration ?? yearKeys.length,
            isRetirementTimed: true,
        };
    }

    // Single uniform-return scenario (equityReturn already present, or no returns at all)
    return {
        ...scenario,
        isRetirementTimed: !!(scenario.equityReturn !== undefined || scenario.healthcareCostMultiplier),
    };
}

/**
 * Build a stressed version of the user's inputs by applying any field-level
 * modifiers defined on the scenario object.
 *
 * Currently supported scenario modifiers:
 *   healthcareCostMultiplier {number} — multiplies currentHealthcareCosts
 *     and caps the resulting healthcare inflation at 20%.
 *   year1 / year2 / … yearN objects  — per-year equity/bond return overrides
 *     (normalised into yearlyEquityReturns/yearlyBondReturns on the returned scenario).
 *   equityReturn / bondReturn         — flat return overrides.
 *
 * @param {Object} baseInputs – canonical user inputs (normalised decimal form)
 * @param {Object} scenario   – a STRESS_SCENARIOS entry from config.js
 * @returns {{ stressed: Object, normalisedScenario: Object }}
 *           stressed inputs and the normalised scenario for simulateRetirement
 */
export const buildStressedInputs = (baseInputs, scenario) => {
    const stressed = { ...baseInputs };

    // Healthcare cost multiplier (e.g. 2.5× for the Healthcare Crisis scenario)
    if (scenario.healthcareCostMultiplier) {
        stressed.currentHealthcareCosts =
            (baseInputs.currentHealthcareCosts ?? 0) * scenario.healthcareCostMultiplier;
        // Also inflate the healthcare inflation rate to sustain the elevated cost.
        // Use ?? so an explicit 0 healthcareInflation (flat-cost model) is preserved.
        stressed.healthcareInflation = Math.min(
            0.20,
            (baseInputs.healthcareInflation ?? 0.055) * 1.5
        );
    }

    // Additional scenario modifiers can be added here as new scenario types are defined.

    return stressed;
};

/**
 * Return the normalised stress scenario ready for simulateRetirement.
 * This is the companion to buildStressedInputs — call both together.
 */
export const normaliseStressScenarioForTest = normaliseStressScenario;

export default { buildStressedInputs, normaliseStressScenarioForTest };
