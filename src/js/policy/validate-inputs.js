/**
 * validate-inputs.js — Canonical Input Validation Module
 *
 * TASK-011: A single validation pass before simulation that catches invalid inputs
 * early and surfaces meaningful errors to the user rather than silently producing
 * wrong outputs.
 *
 * Expects inputs to already be normalised (decimal rates, 0–1).
 * Call normaliseInputs() first, then validateInputs().
 *
 * Returns { valid: boolean, errors: string[], warnings: string[] }.
 *  - errors:   must be fixed before the simulation can run
 *  - warnings: non-fatal issues the user should be aware of
 */

import { ENHANCED_CONFIG } from '../config.js';

// ── Constants ─────────────────────────────────────────────────────────────────

const CONCESSIONAL_CAP     = ENHANCED_CONFIG.CONCESSIONAL_CAP     ?? 30000;
const NON_CONCESSIONAL_CAP = ENHANCED_CONFIG.NON_CONCESSIONAL_CAP ?? 120000;  // used in §5b NCC check
const TSB_NCC_BLOCK        = ENHANCED_CONFIG.TSB_NCC_BLOCK_THRESHOLD ?? 2_000_000;
const PENSION_AGE          = ENHANCED_CONFIG.OVERSEAS_RETIREMENT?.PENSION_AGE ?? 67;
const MIN_RUNS           = 100;
const MAX_RUNS           = 20000;
const ALLOC_TOLERANCE    = 0.005;   // ±0.5 pp rounding tolerance on allocation sum
const MAX_RATE           = 1.0;     // 100% — rates above this are almost certainly wrong
const MIN_RATE           = -1.0;    // -100% — floor for negative rates (shock magnitude)

// ── Helpers ───────────────────────────────────────────────────────────────────

const pct  = (v) => `${(Number(v) * 100).toFixed(1)}%`;
const cur  = (v) => `$${Number(v).toLocaleString('en-AU', { maximumFractionDigits: 0 })}`;
const isNum = (v) => typeof v === 'number' && isFinite(v);

// ── Main validation function ──────────────────────────────────────────────────

/**
 * Validate normalised inputs.
 *
 * @param {Object} inputs – normalised inputs (rates as decimals)
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
export const validateInputs = (inputs = {}) => {
    const errors   = [];
    const warnings = [];

    const add = (list, msg) => list.push(msg);
    const err = (msg) => add(errors, msg);
    const warn = (msg) => add(warnings, msg);

    // ── 1. Age ordering ──────────────────────────────────────────────────────

    const currentAge    = Number(inputs.yourCurrentAge   ?? 0);
    const retirementAge = Number(inputs.retirementAge    ?? 0);
    const lifespan      = Number(inputs.yourLifespan     ?? 0);
    const partnerAge    = Number(inputs.partnerCurrentAge ?? 0);
    const partnerRetAge = Number(inputs.partnerRetirementAge ?? 0);
    const partnerLife   = Number(inputs.partnerLifespan  ?? 0);

    if (currentAge < 18 || currentAge > 120) {
        err(`Your current age (${currentAge}) must be between 18 and 120.`);
    }
    if (retirementAge > 0 && retirementAge <= currentAge) {
        err(`Retirement age (${retirementAge}) must be greater than your current age (${currentAge}).`);
    }
    if (lifespan > 0 && retirementAge > 0 && lifespan <= retirementAge) {
        err(`Planning horizon (${lifespan}) must be greater than retirement age (${retirementAge}).`);
    }
    if (partnerAge > 0) {
        if (partnerAge < 18 || partnerAge > 120) {
            err(`Partner's current age (${partnerAge}) must be between 18 and 120.`);
        }
        if (partnerRetAge > 0 && partnerRetAge <= partnerAge) {
            err(`Partner's retirement age (${partnerRetAge}) must be greater than partner's current age (${partnerAge}).`);
        }
        if (partnerLife > 0 && partnerRetAge > 0 && partnerLife <= partnerRetAge) {
            err(`Partner's planning horizon (${partnerLife}) must be greater than partner's retirement age (${partnerRetAge}).`);
        }
    }

    // ── 2. Rate bounds — all rate fields must be 0–1 (or -1 to 1 for shocks) ─

    const rateChecks = [
        ['inflation',         inputs.inflation,          0,   MAX_RATE],
        ['investmentReturn',  inputs.investmentReturn,   0,   MAX_RATE],
        ['superReturn',       inputs.superReturn,        0,   MAX_RATE],
        ['savingsReturn',     inputs.savingsReturn,      0,   MAX_RATE],
        ['salaryGrowthRate',  inputs.salaryGrowthRate,  -0.5, MAX_RATE],
        ['healthcareInflation', inputs.healthcareInflation, 0, MAX_RATE],
        ['returnVolatility',  inputs.returnVolatility,   0,   MAX_RATE],
        ['shockMagnitude',    inputs.shockMagnitude,    MIN_RATE, 0],
        ['shockProbability',  inputs.shockProbability,   0,   1],
        ['agedCareProbability', inputs.agedCareProbability, 0, 1],
    ];

    for (const [field, val, min, max] of rateChecks) {
        if (val !== undefined && val !== null && isNum(val)) {
            if (val < min || val > max) {
                err(`${field} (${pct(val)}) is out of the valid range [${pct(min)}, ${pct(max)}]. Check that the value is a decimal (e.g. 0.07 for 7%), not a percentage (e.g. 7).`);
            }
        }
    }

    // ── 3. Allocation sum ────────────────────────────────────────────────────

    const allocEq   = Number(inputs.allocEquities ?? 0);
    const allocBd   = Number(inputs.allocBonds    ?? 0);
    const allocCash = Number(inputs.allocCash     ?? 0);

    if (allocEq > 0 || allocBd > 0 || allocCash > 0) {
        const allocSum = allocEq + allocBd + allocCash;
        if (Math.abs(allocSum - 1.0) > ALLOC_TOLERANCE) {
            err(`Asset allocation must sum to 100% but sums to ${pct(allocSum)} (equities ${pct(allocEq)} + bonds ${pct(allocBd)} + cash ${pct(allocCash)}). Adjust so the total is 100%.`);
        }
    }

    // ── 4. numRuns ───────────────────────────────────────────────────────────
    // PR review fix #3247765283: the message previously said "will be clamped
    // automatically" but not all MC paths clamp (enhanced-monte-carlo.js iterates
    // for the raw value).  Softened to say "may be adjusted" and recommend the range.

    const numRuns = Number(inputs.numRuns ?? 1000);
    if (!Number.isInteger(numRuns) || numRuns < MIN_RUNS || numRuns > MAX_RUNS) {
        warn(`numRuns (${numRuns}) is outside the recommended range [${MIN_RUNS.toLocaleString('en-AU')}, ${MAX_RUNS.toLocaleString('en-AU')}]. Some simulation paths may adjust this value; consider setting it within the recommended range for consistent results.`);
    }

    // ── 5. Super contribution caps ───────────────────────────────────────────

    const sgRate     = Number(inputs.superContributionRate ?? ENHANCED_CONFIG.SUPER_GUARANTEE_RATE ?? 0.12);
    const yourSalary = Number(inputs.yourSalary ?? 0);
    const yourSG     = yourSalary * sgRate;
    const yourAdditional = Number(inputs.yourAdditionalSuperContribution ?? 0);
    const yourTotalCC    = yourSG + yourAdditional;

    if (yourSalary > 0 && yourTotalCC > CONCESSIONAL_CAP) {
        warn(`Your total concessional contributions (${cur(yourTotalCC)}) may exceed the annual cap of ${cur(CONCESSIONAL_CAP)}. Excess contributions attract additional tax.`);
    }

    const partnerSalary  = Number(inputs.partnerSalary ?? 0);
    const partnerSG      = partnerSalary * sgRate;
    const partnerAdditional = Number(inputs.partnerAdditionalSuperContribution ?? 0);
    const partnerTotalCC    = partnerSG + partnerAdditional;

    if (partnerSalary > 0 && partnerTotalCC > CONCESSIONAL_CAP) {
        warn(`Partner's total concessional contributions (${cur(partnerTotalCC)}) may exceed the annual cap of ${cur(CONCESSIONAL_CAP)}. Excess contributions attract additional tax.`);
    }

    // ── 5b. Non-concessional contribution (NCC) cap ─────────────────────────
    // PR review fix #3247765254: NON_CONCESSIONAL_CAP was defined but unused.
    // NCC cap is $120,000/year; drops to $0 when TSB >= $2M.

    const yourSuper   = Number(inputs.yourCurrentSuper   ?? 0);
    const partnerSuper = Number(inputs.partnerCurrentSuper ?? 0);
    const yourNCC     = Number(inputs.yourAnnualNCC       ?? 0);
    const partnerNCC  = Number(inputs.partnerAnnualNCC    ?? 0);

    if (yourNCC > 0 && yourSuper >= TSB_NCC_BLOCK) {
        warn(`Your super balance (${cur(yourSuper)}) is at or above $${TSB_NCC_BLOCK.toLocaleString('en-AU')}. You are not eligible to make non-concessional contributions ($${yourNCC.toLocaleString('en-AU')} entered). Contributions above the NCC cap attract 45% excess tax.`);
    } else if (yourNCC > NON_CONCESSIONAL_CAP) {
        warn(`Your non-concessional contribution (${cur(yourNCC)}) exceeds the annual NCC cap of ${cur(NON_CONCESSIONAL_CAP)}. Contributions above the cap attract 45% excess tax (unless using bring-forward rules).`);
    }

    if (partnerNCC > 0 && partnerSuper >= TSB_NCC_BLOCK) {
        warn(`Partner's super balance (${cur(partnerSuper)}) is at or above $${TSB_NCC_BLOCK.toLocaleString('en-AU')}. Partner is not eligible for non-concessional contributions ($${partnerNCC.toLocaleString('en-AU')} entered).`);
    } else if (partnerNCC > NON_CONCESSIONAL_CAP) {
        warn(`Partner's non-concessional contribution (${cur(partnerNCC)}) exceeds the annual NCC cap of ${cur(NON_CONCESSIONAL_CAP)}.`);
    }

    // ── 6. Retirement before pension age ────────────────────────────────────

    if (retirementAge > 0 && retirementAge < PENSION_AGE) {
        warn(`You plan to retire at ${retirementAge}, which is before the Age Pension eligibility age of ${PENSION_AGE}. You will need to fund the ${PENSION_AGE - retirementAge}-year gap from savings and super alone.`);
    }
    if (partnerAge > 0 && partnerRetAge > 0 && partnerRetAge < PENSION_AGE) {
        warn(`Your partner plans to retire at ${partnerRetAge}, before Age Pension age (${PENSION_AGE}).`);
    }

    // ── 7. Investment property with negative equity ──────────────────────────

    if (inputs.hasInvestmentProperty) {
        const propValue = Number(inputs.investmentPropertyValue ?? 0);
        const propLoan  = Number(inputs.investmentPropertyLoan  ?? 0);
        if (propLoan > propValue) {
            warn(`Investment property loan (${cur(propLoan)}) exceeds property value (${cur(propValue)}) — negative equity of ${cur(propLoan - propValue)}. This will affect your net worth calculation.`);
        }
    }

    // ── 8. Implausibly high returns ──────────────────────────────────────────

    if (isNum(inputs.investmentReturn) && inputs.investmentReturn > 0.15) {
        warn(`Investment return of ${pct(inputs.investmentReturn)} is very high. The long-run Australian equity market average is approximately 8–10% nominal. Consider whether this assumption is realistic.`);
    }
    if (isNum(inputs.superReturn) && inputs.superReturn > 0.15) {
        warn(`Super return of ${pct(inputs.superReturn)} is very high. The APRA 10-year median for balanced funds is approximately 7.5–8.5% net of fees.`);
    }

    // ── 9. Healthcare inflation ──────────────────────────────────────────────

    if (isNum(inputs.healthcareInflation) && inputs.healthcareInflation > 0.10) {
        warn(`Healthcare inflation of ${pct(inputs.healthcareInflation)} is above the historical AIHW median of ~3.8%. This will significantly increase projected healthcare costs in retirement.`);
    }

    // ── 10. Trust with home in trust ─────────────────────────────────────────

    if (inputs.hasTrustAssets && inputs.homeInTrust) {
        warn(`Primary residence held in a trust may lose the main residence CGT exemption. Seek specialist tax advice.`);
    }

    return {
        valid:    errors.length === 0,
        errors,
        warnings,
    };
};

export default { validateInputs };
