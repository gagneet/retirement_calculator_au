/**
 * reverse-success-predicate.js — Engine-based goal evaluation for the Reverse Planner.
 *
 * Replaces SWR-based proxy success tests with real simulator drawdown results.
 * Every reverse solver must use evaluateEngineGoal() as its pass/fail predicate.
 */

/**
 * Apply target parameters to a clone of engine inputs.
 *
 * @param {object} baseInputs   Raw engine inputs (will be cloned)
 * @param {object} target       Target object { targetAnnualIncomeToday, retirementAge, ... }
 * @param {object} [context={}]
 * @param {boolean} [context.suppressAgePension=false]  If true, disable Age Pension
 * @returns {object} Cloned inputs with desiredIncome set
 */
export function applyTargetToEngineInputs(baseInputs, target, context = {}) {
    const inputs = { ...baseInputs };
    const targetIncome = target?.targetAnnualIncomeToday || 0;
    // Set both desiredIncome AND asfaComfortable because normaliseInputsForSimulation
    // short-circuits when yourCurrentAge is already present (pre-normalised inputs),
    // so it never maps desiredIncome → asfaComfortable.
    inputs.desiredIncome = targetIncome;
    inputs.asfaComfortable = targetIncome;

    if (target?.retirementAge > 0) {
        inputs.retirementAge = target.retirementAge;
    }
    if (target?.lifespan > 0) {
        inputs.yourLifespan = target.lifespan;
    }
    if (target?.partnerLifespan > 0) {
        inputs.partnerLifespan = target.partnerLifespan;
    }

    if (context.suppressAgePension) {
        inputs.suppressAgePension = true;
    }

    return inputs;
}

/**
 * Determine the effective planning age from simResult + inputs + target.
 *
 * @param {object} simResult   simulateRetirement() result
 * @param {object} inputs      Engine inputs
 * @param {object} target      Target object
 * @returns {number} Effective planning age (lifespan)
 */
export function getEffectivePlanningAge(simResult, inputs, target) {
    const lifespan = target?.lifespan || inputs?.yourLifespan || 90;
    if (lifespan > 0) return lifespan;
    return simResult?.effectiveYourLifespan || 90;
}

/**
 * Evaluate a deterministic simulation result against the retirement goal using
 * engine outputs (depletionAge, finalBalance) rather than SWR proxies.
 *
 * @param {object} simResult     Return value of simulateRetirement(inputs, false)
 * @param {object} target        Target object { targetAnnualIncomeToday, ... }
 * @param {object} inputs        Original engine inputs (before target injection)
 * @param {object} [options={}]
 * @param {number} [options.yearsToRetirement]  Pre-computed years to retirement
 * @returns {object} {
 *   passesGoal, passesIncome, passesEstate, passesConfidence,
 *   lastsToTargetAge, depletionAge, finalBalance, effectiveLifespan,
 *   annualIncomeToday, pensionAnnualToday, pensionAnnualAtRetirement,
 *   estateToday, warnings, evidence
 * }
 */
export function evaluateEngineGoal(simResult, target, inputs, options = {}) {
    const warnings = [];
    const evidence = {
        inputFieldsChanged: ['desiredIncome', 'retirementAge', 'yourLifespan'],
        simulatorFieldsRead: ['depletionAge', 'finalBalance', 'yearlyData', 'totalFinancialAssets', 'accumulatedSuperBalance'],
        resultFieldsUsed: [],
    };

    const effectiveLifespan = getEffectivePlanningAge(simResult, inputs, target);

    const depletionAge = simResult?.depletionAge;
    const finalBalance = simResult?.finalBalance || 0;
    const yearlyData = simResult?.yearlyData || [];
    const totalFinancialAssets = simResult?.totalFinancialAssets || 0;
    const accumulatedSuperBalance = simResult?.accumulatedSuperBalance || 0;

    evidence.resultFieldsUsed.push('depletionAge', 'finalBalance');

    const targetIncome = target?.targetAnnualIncomeToday || 0;

    let lastsToTargetAge;
    if (Number.isFinite(depletionAge)) {
        lastsToTargetAge = depletionAge >= effectiveLifespan;
    } else {
        lastsToTargetAge = finalBalance > 0;
    }
    const passesIncome = lastsToTargetAge;

    const minEstate = target?.minimumEstateToday || 0;
    const estateDeflator = options.yearsToRetirement > 0
        ? Math.pow(1 + (inputs?.inflation || 0.026), options.yearsToRetirement)
        : 1;
    const estateToday = finalBalance / estateDeflator;
    const passesEstate = estateToday >= minEstate;

    const confidence = target?.successProbabilityTarget || 0;
    const passesConfidence = confidence <= 1 || (target?.importedConfidence !== undefined
        ? target.importedConfidence >= confidence
        : true);

    const passesGoal = passesIncome && passesEstate && passesConfidence;

    const retirementAge = target?.retirementAge || inputs?.retirementAge || 65;
    const retirementRowIndex = yearlyData.findIndex(row => row.age >= retirementAge);
    const retirementRow = retirementRowIndex >= 0 ? yearlyData[retirementRowIndex] : null;
    const pensionAtRetirement = retirementRow?.pensionIncome || 0;
    const yearsToRetire = options.yearsToRetirement || Math.max(1, retirementAge - (inputs?.yourCurrentAge || 50));
    const deflator = Math.pow(1 + (inputs?.inflation || 0.026), yearsToRetire);
    const pensionAnnualToday = pensionAtRetirement / deflator;

    return {
        passesGoal,
        passesIncome,
        passesEstate,
        passesConfidence,
        lastsToTargetAge,
        depletionAge,
        finalBalance,
        effectiveLifespan,
        annualIncomeToday: 0,
        pensionAnnualToday,
        pensionAnnualAtRetirement: pensionAtRetirement,
        estateToday,
        totalFinancialAssets,
        accumulatedSuperBalance,
        warnings,
        evidence,
        retirementYearData: retirementRow,
    };
}

/**
 * Check whether the solver should compute with or without Age Pension.
 * Runs the engine twice when comparing WITH vs WITHOUT.
 *
 * @param {RetirementSimulator} simulator
 * @param {object} inputs   Engine inputs (already target-injected)
 * @param {object} target   Target object
 * @param {object} [options={}]
 * @returns {{ withPension, withoutPension, pensionValue }}
 */
export function evaluateWithAndWithoutPension(simulator, inputs, target, options = {}) {
    const withPension = evaluateEngineGoal(
        simulator.simulateRetirement(inputs, false),
        target,
        inputs,
        options
    );

    const suppressedInputs = { ...inputs, suppressAgePension: true };
    const withoutPension = evaluateEngineGoal(
        simulator.simulateRetirement(suppressedInputs, false),
        target,
        suppressedInputs,
        options
    );

    const pensionValue = Math.max(0, withPension.pensionAnnualAtRetirement - withoutPension.pensionAnnualAtRetirement);

    return {
        withPension,
        withoutPension,
        pensionValue,
        pensionValueCapital: pensionValue / (options.swr || 0.04),
    };
}
