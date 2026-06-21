import { ReverseRetirementSolver } from '../reverse-solver.js';
import { applyTargetToEngineInputs } from '../reverse-success-predicate.js';

const findLever = (levers, key) => levers.find((lever) => lever.lever === key);

export class ReverseScenarioEngine {
    constructor(config, { solver = null } = {}) {
        this.config = config;
        this.solver = solver || new ReverseRetirementSolver(config);
    }

    buildScenarioDefinitions(selected = {}) {
        const base = {
            includeSuper: selected.includeSuper !== false,
            includeAgePension: selected.includeAgePension !== false,
            includeNonSuperInvestments: selected.includeNonSuperInvestments !== false,
            homeStatus: selected.homeStatus || 'own_home',
            includeInvestmentProperty: Boolean(selected.includeInvestmentProperty),
            sellInvestmentPropertyAtRetirement: Boolean(selected.sellInvestmentPropertyAtRetirement),
            includeDownsizing: Boolean(selected.includeDownsizing),
            includeAgedCare: Boolean(selected.includeAgedCare),
            includeOverseasRetirement: Boolean(selected.includeOverseasRetirement),
            stress: false,
            noCurrentAssets: false,
        };
        return [
            { key: 'selected', name: 'Selected plan', ...base },
            { key: 'home_super_pension', name: 'Own home + super + Age Pension', ...base, homeStatus: 'own_home', includeSuper: true, includeAgePension: true, includeInvestmentProperty: false },
            { key: 'home_super_private', name: 'Own home + super + no Age Pension', ...base, homeStatus: 'own_home', includeSuper: true, includeAgePension: false },
            { key: 'renter_super_pension', name: 'Renting + super + Age Pension', ...base, homeStatus: 'renting', includeSuper: true, includeAgePension: true },
            { key: 'non_super_only', name: 'Own home + non-super investments only', ...base, homeStatus: 'own_home', includeSuper: false, includeNonSuperInvestments: true },
            { key: 'property_retained', name: 'Investment property retained', ...base, includeInvestmentProperty: true, sellInvestmentPropertyAtRetirement: false },
            { key: 'property_sold', name: 'Investment property sold at retirement', ...base, includeInvestmentProperty: true, sellInvestmentPropertyAtRetirement: true },
            { key: 'salary_only', name: 'No current assets — salary and savings path', ...base, noCurrentAssets: true },
            { key: 'aged_care', name: 'Aged-care-adjusted plan', ...base, includeAgedCare: true },
            { key: 'stress', name: 'Conservative return / high inflation stress', ...base, stress: true },
        ];
    }

    applyScenario(baseEngineInputs, target, scenario) {
        const inputs = { ...baseEngineInputs };
        const yearsToRetirement = Math.max(
            0,
            (target.retirementAge || inputs.retirementAge || 67) - (inputs.yourCurrentAge || 50)
        );

        if (!scenario.includeSuper) {
            inputs.yourCurrentSuper = 0;
            inputs.partnerCurrentSuper = 0;
            inputs.yourAdditionalSuperContribution = 0;
            inputs.partnerAdditionalSuperContribution = 0;
            inputs.employerSuperContributionRate = 0;
            inputs.superContributionRate = 0;
        }
        if (!scenario.includeNonSuperInvestments) {
            inputs.currentSavings = 0;
            inputs.currentStocks = 0;
            inputs.monthlyStockContribution = 0;
            inputs.annualCashSavingsContribution = 0;
        }
        inputs.suppressAgePension = scenario.includeAgePension === false;

        const isRenter = scenario.homeStatus === 'renting';
        const hasHome = scenario.homeStatus === 'own_home'
            || scenario.homeStatus === 'own_home_with_mortgage';
        inputs.homeowner = hasHome;
        inputs.ownsHome = hasHome;
        inputs.primaryResidenceType = scenario.homeStatus;
        inputs.homeValue = hasHome ? (inputs.homeValue || 0) : 0;
        inputs.mortgageBalance = scenario.homeStatus === 'own_home_with_mortgage'
            ? (inputs.mortgageBalance || 0)
            : 0;
        inputs.monthlyMortgagePayment = inputs.mortgageBalance > 0
            ? (inputs.monthlyMortgagePayment || 0)
            : 0;
        if (!isRenter) {
            inputs.primaryRentMonthly = 0;
            inputs.primaryRentAnnual = 0;
        }
        const isCouple = inputs.isCouple || inputs.isSingleCalculation === false;
        if (hasHome) {
            inputs.pensionAssetThreshold = isCouple
                ? this.config.COUPLE_ASSET_THRESHOLD
                : this.config.SINGLE_ASSET_THRESHOLD;
            inputs.pensionAssetLimit = isCouple
                ? this.config.COUPLE_ASSET_LIMIT
                : this.config.SINGLE_ASSET_LIMIT;
        } else {
            inputs.pensionAssetThreshold = isCouple
                ? this.config.COUPLE_ASSET_THRESHOLD_NON_HOMEOWNER
                : this.config.SINGLE_ASSET_THRESHOLD_NON_HOMEOWNER;
            inputs.pensionAssetLimit = isCouple
                ? this.config.COUPLE_ASSET_LIMIT_NON_HOMEOWNER
                : this.config.SINGLE_ASSET_LIMIT_NON_HOMEOWNER;
        }

        inputs.hasInvestmentProperty = scenario.includeInvestmentProperty;
        if (!scenario.includeInvestmentProperty) {
            inputs.investmentPropertyValue = 0;
            inputs.investmentPropertyLoan = 0;
            inputs.weeklyRentalIncome = 0;
            inputs.annualPropertyExpenses = 0;
        } else if (scenario.sellInvestmentPropertyAtRetirement) {
            inputs.sellPropertyYears = yearsToRetirement;
        }

        inputs.planToDownsize = scenario.includeDownsizing;
        if (!scenario.includeAgedCare) {
            inputs.agedCareProbability = 0;
            inputs.agedCareAnnualCost = 0;
        } else {
            inputs.agedCareProbability = inputs.agedCareProbability || 1;
            inputs.agedCareAnnualCost = inputs.agedCareAnnualCost || 60000;
            inputs.agedCareStartAge = inputs.agedCareStartAge || 85;
            inputs.agedCareDuration = inputs.agedCareDuration || 3;
        }
        inputs.goingOverseas = scenario.includeOverseasRetirement;
        if (scenario.stress) {
            inputs.investmentReturn = Math.max(0, (inputs.investmentReturn || 0.07) - 0.02);
            inputs.superReturn = Math.max(0, (inputs.superReturn || 0.075) - 0.02);
            inputs.inflation = (inputs.inflation || 0.026) + 0.02;
        }
        if (scenario.noCurrentAssets) {
            inputs.yourCurrentSuper = 0;
            inputs.partnerCurrentSuper = 0;
            inputs.currentSavings = 0;
            inputs.currentStocks = 0;
            inputs.investmentPropertyValue = 0;
            inputs.investmentPropertyLoan = 0;
        }

        const scenarioTarget = {
            ...target,
            includeAgePension: scenario.includeAgePension,
        };
        return {
            inputs: applyTargetToEngineInputs(inputs, scenarioTarget, {
                suppressAgePension: scenario.includeAgePension === false,
            }),
            target: scenarioTarget,
        };
    }

    async solveScenario(baseEngineInputs, target, scenario, options = {}) {
        const adjusted = this.applyScenario(baseEngineInputs, target, scenario);
        const solved = await this.solver.solveAllLevers(
            adjusted.inputs,
            adjusted.target,
            options
        );
        const levers = solved.rankedLevers || [];
        const retirementRow = (solved.currentResult?.yearlyData || []).find(
            (row) => row.age >= adjusted.target.retirementAge
        );
        const warnings = [
            'Confidence target requires Monte Carlo validation and is not used by deterministic lever solves.',
        ];
        ['superBalance', 'investmentBalance', 'salary', 'extraSavings', 'extraAnnualSuper']
            .forEach((key) => {
                const lever = findLever(levers, key);
                if (lever && !lever.feasible) warnings.push(lever.label + ' is not feasible as a single lever.');
            });

        return {
            scenarioKey: scenario.key,
            scenarioName: scenario.name,
            requiredCurrentSuper: findLever(levers, 'superBalance')?.solved ?? null,
            requiredCurrentNonSuperInvestments: findLever(levers, 'investmentBalance')?.solved ?? null,
            requiredCurrentGrossSalary: findLever(levers, 'salary')?.solved ?? null,
            requiredMonthlySurplus: findLever(levers, 'extraSavings')?.solved ?? null,
            requiredAnnualSalarySacrifice: findLever(levers, 'extraAnnualSuper')?.solved ?? null,
            requiredPropertyEquityOrRentalIncome: findLever(levers, 'netRent')?.solved ?? null,
            expectedAgePensionContribution: retirementRow?.pensionIncome || 0,
            expectedAssetsAtRetirement: solved.currentScore?.totalAssetsNominal || 0,
            expectedEstateAtLifespan: solved.currentScore?.estateToday || 0,
            meetsGoal: Boolean(solved.currentScore?.passesGoal),
            warnings,
            inputs: adjusted.inputs,
            target: adjusted.target,
        };
    }

    async compareScenarios(baseEngineInputs, target, selected = {}, options = {}) {
        const definitions = this.buildScenarioDefinitions(selected);
        const results = [];
        for (const definition of definitions) {
            results.push(await this.solveScenario(baseEngineInputs, target, definition, options));
        }
        return results;
    }
}

export default ReverseScenarioEngine;
