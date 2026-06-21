import { normaliseCanonicalInput } from './canonical-input-schema.js';
import { deriveHouseholdCashflow } from './household-cashflow-engine.js';
import { ProjectionCache } from './projection-cache.js';
import { normaliseInputs } from '../policy/normalise-inputs.js';

function stableStringify(value) {
    if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
    if (value && typeof value === 'object') {
        return '{' + Object.keys(value).sort()
            .map((key) => JSON.stringify(key) + ':' + stableStringify(value[key]))
            .join(',') + '}';
    }
    return JSON.stringify(value);
}

export function hashProjectionInput(value) {
    const text = stableStringify(value);
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return 'fnv1a-' + (hash >>> 0).toString(16).padStart(8, '0');
}

export class ProjectionService {
    constructor({
        simulator,
        adapter,
        engineInputBuilder,
        resultAdapter,
        summaryBuilder,
        cache = new ProjectionCache(),
        policyVersion = 'unversioned',
    }) {
        if (!simulator?.simulateRetirement) throw new TypeError('ProjectionService requires a simulator.');
        if (typeof engineInputBuilder !== 'function') throw new TypeError('ProjectionService requires an engineInputBuilder.');
        this.simulator = simulator;
        this.adapter = adapter;
        this.engineInputBuilder = engineInputBuilder;
        this.resultAdapter = resultAdapter;
        this.summaryBuilder = summaryBuilder;
        this.cache = cache;
        this.policyVersion = policyVersion;
    }

    computeProjection(rawInput, options = {}) {
        const canonicalInput = normaliseCanonicalInput(
            this.adapter ? this.adapter(rawInput) : rawInput
        );
        const sourceCalculator = options.sourceCalculator || 'advanced-v2';
        // rawInput remains part of the transitional hash until CanonicalInput covers
        // every projection-relevant field from all three calculators.
        const inputHash = hashProjectionInput({
            policyVersion: this.policyVersion,
            canonicalInput,
            rawInput,
        });
        const cached = this.cache.get(inputHash);
        if (cached) return cached;

        const derivedCashflow = deriveHouseholdCashflow(canonicalInput);
        const engineInputs = normaliseInputs(
            this.engineInputBuilder(rawInput, { canonicalInput, derivedCashflow })
        );
        const simulation = this.simulator.simulateRetirement(engineInputs, false);
        const adaptedResult = this.resultAdapter
            ? this.resultAdapter(rawInput, engineInputs, simulation)
            : simulation;
        const summary = this.summaryBuilder
            ? this.summaryBuilder({ canonicalInput, engineInputs, simulation, adaptedResult })
            : {
                finalBalance: simulation?.finalBalance ?? null,
                retirementAge: canonicalInput.household.retirementAge,
                targetAnnualIncomeToday: canonicalInput.retirementTarget.targetAnnualIncomeToday,
            };
        const projection = {
            inputHash,
            policyVersion: this.policyVersion,
            schemaVersion: canonicalInput.schemaVersion,
            sourceCalculator,
            canonicalInput,
            derivedCashflow,
            engineInputs,
            simulation,
            adaptedResult,
            yearlyData: simulation?.yearlyData || adaptedResult?.years || [],
            summary,
            diagnostics: {
                deterministicRuns: 1,
                rawInputIncludedInHash: true,
            },
            warnings: [...derivedCashflow.warnings],
        };
        return this.cache.set(inputHash, projection);
    }
}
