import fs from 'fs';
import path from 'path';
import RetirementCalculatorApp from '../../src/js/app.js';
import { ENHANCED_CONFIG } from '../../src/js/config.js';
import { populateFormFromData } from '../../src/js/utils.js';
import templateData from '../../src/retirement_template.json';
import { buildEngineInputs } from '../../src/js/advanced-v2.js';
import RetirementSimulator from '../../src/js/simulator.js';

const advancedHtml = fs.readFileSync(
    path.join(__dirname, '../../src/advanced.html'),
    'utf8'
);

const COMPARISON_FIELDS = [
    'isCouple',
    'isSingleCalculation',
    'yourCurrentAge',
    'retirementAge',
    'yourLifespan',
    'partnerCurrentAge',
    'partnerRetirementAge',
    'partnerLifespan',
    'yourSalary',
    'partnerSalary',
    'yourCurrentSuper',
    'partnerCurrentSuper',
    'employerSuperContributionRate',
    'yourAdditionalSuperContribution',
    'partnerAdditionalSuperContribution',
    'yourAnnualNCC',
    'partnerAnnualNCC',
    'spouseContribution',
    'asfaComfortable',
    'currentHealthcareCosts',
    'agedCareStartAge',
    'agedCareDuration',
    'agedCareAnnualCost',
    'homeowner',
    'ownsHome',
    'primaryResidenceType',
    'homeValue',
    'mortgageBalance',
    'mortgageRate',
    'monthlyMortgagePayment',
    'primaryRentAnnual',
    'hasInvestmentProperty',
    'investmentPropertyValue',
    'investmentPropertyLoan',
    'investmentPropertyRate',
    'weeklyRentalIncome',
    'annualPropertyExpenses',
    'propertyGrowthRate',
    'landTax',
    'pensionAssetThreshold',
    'pensionAssetLimit',
    'agePensionMax',
    'inflation',
    'investmentReturn',
    'superReturn',
    'savingsReturn',
    'returnVolatility',
    'scenarioMode',
    'enableShocks',
    'shockProbability',
    'shockMagnitude',
    'useLongevityDistribution',
    'goingOverseas',
    'overseasDestination',
    'overseasAnnualRent',
    'overseasHousingType',
    'overseasAudFxChange',
];

const FIELD_TOLERANCES = {
    monthlyMortgagePayment: 0.51,
};

const INTENTIONAL_DIFFS = {
    ownsHome: 'Classic exposes homeowner only; advanced-v2 also exposes ownsHome for newer engines.',
    primaryRentAnnual: 'Classic currently stores primary rent monthly; v2 exposes annualized comparison value.',
};

function buildClassicInputsFromTemplate() {
    document.body.innerHTML = advancedHtml;
    populateFormFromData(templateData.userData, templateData.version);

    const app = Object.create(RetirementCalculatorApp.prototype);
    app.config = ENHANCED_CONFIG;
    app.simulator = {
        calculateDynamicAllocation: jest.fn(() => ({
            equity: 65,
            bonds: 25,
            cash: 10,
        })),
    };
    app.refreshAllDerivedDefaults({ force: false });

    return app.collectInputs();
}

function canonicalizeClassic(inputs) {
    return {
        ...inputs,
        ownsHome: inputs.ownsHome ?? inputs.homeowner,
        primaryRentAnnual: Number(inputs.primaryRentMonthly || 0) * 12,
        overseasDestination: inputs.overseasCountry || '',
    };
}

function canonicalizeV2(inputs) {
    return {
        ...inputs,
        primaryRentAnnual: Number(inputs.primaryRentMonthly || 0) * 12,
    };
}

function valuesEqual(a, b, field) {
    if (typeof a === 'number' || typeof b === 'number') {
        const an = Number(a);
        const bn = Number(b);
        if (!Number.isFinite(an) || !Number.isFinite(bn)) return a === b;
        return Math.abs(an - bn) <= (FIELD_TOLERANCES[field] ?? 1e-9);
    }
    return a === b;
}

function diffFields(classic, v2) {
    return COMPARISON_FIELDS
        .filter((field) => !valuesEqual(classic[field], v2[field], field))
        .map((field) => ({
            field,
            classic: classic[field],
            advancedV2: v2[field],
            reason: INTENTIONAL_DIFFS[field] || null,
        }));
}

describe('advanced classic vs advanced-v2 normalized input parity', () => {
    beforeEach(() => {
        jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('retirement_template.json produces equivalent engine inputs or named intentional diffs', () => {
        const classic = canonicalizeClassic(buildClassicInputsFromTemplate());
        const advancedV2 = canonicalizeV2(buildEngineInputs(templateData.userData));
        const diffs = diffFields(classic, advancedV2);
        const unexpected = diffs.filter((diff) => !diff.reason);

        expect(unexpected).toEqual([]);
    });

    test('shared projection service preserves the classic deterministic result for legacy inputs', () => {
        const inputs = buildClassicInputsFromTemplate();
        const simulator = new RetirementSimulator(ENHANCED_CONFIG);
        const legacy = simulator.simulateRetirement(inputs, false);
        const app = Object.create(RetirementCalculatorApp.prototype);
        app.config = ENHANCED_CONFIG;
        app.simulator = new RetirementSimulator(ENHANCED_CONFIG);
        app.projectionService = app.createProjectionService();

        const projection = app.projectionService.computeProjection(inputs, {
            sourceCalculator: 'advanced',
        });

        expect(projection.simulation.finalBalance).toBeCloseTo(legacy.finalBalance, 8);
        expect(projection.simulation.accumulatedSuperBalance).toBeCloseTo(
            legacy.accumulatedSuperBalance,
            8
        );
    });

    test('classic detailed housing spending does not subtract mortgage twice', () => {
        const inputs = {
            ...buildClassicInputsFromTemplate(),
            useDetailedExpenseInputs: true,
            currentMonthlyHousingCosts: 5000,
            currentMonthlyLivingCosts: 3000,
            currentHealthcareCosts: 0,
            monthlyMortgagePayment: 3200,
            monthlyStockContribution: 0,
        };
        const app = Object.create(RetirementCalculatorApp.prototype);
        app.config = ENHANCED_CONFIG;
        app.simulator = new RetirementSimulator(ENHANCED_CONFIG);
        app.projectionService = app.createProjectionService();

        const projection = app.projectionService.computeProjection(inputs, {
            sourceCalculator: 'advanced',
        });

        expect(projection.derivedCashflow.annualMortgageRepayments).toBe(0);
        expect(projection.derivedCashflow.currentAnnualSpending).toBe(96000);
    });
});
