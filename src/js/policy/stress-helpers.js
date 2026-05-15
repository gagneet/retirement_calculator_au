/**
 * stress-helpers.js — Stress Test Input Modifiers
 *
 * Extracted from app.js so buildStressedInputs() can be imported directly
 * in tests (PR review comment #3247765311).
 *
 * buildStressedInputs() applies field-level scenario modifiers to baseInputs
 * before the simulation runs.  Year-by-year return overrides (equityReturn,
 * bondReturn etc.) are handled inside simulateRetirement() via the stressScenario
 * parameter — they are NOT applied here.
 */

/**
 * Build a stressed version of the user's inputs by applying any field-level
 * modifiers defined on the scenario object.
 *
 * Currently supported scenario modifiers:
 *   healthcareCostMultiplier {number} — multiplies currentHealthcareCosts
 *     and caps the resulting healthcare inflation at 20%.  Uses ?? instead of
 *     || so an explicit 0 healthcareInflation (flat-cost model) is preserved.
 *
 * @param {Object} baseInputs – canonical user inputs (normalised decimal form)
 * @param {Object} scenario   – a STRESS_SCENARIOS entry from config.js
 * @returns {Object}          – new inputs object with scenario modifiers applied
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

export default { buildStressedInputs };
