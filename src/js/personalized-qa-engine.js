import { ENHANCED_CONFIG } from './config.js';
import {
    formatCurrency,
    calculateAgePension,
    calculateAgePensionForCouple,
    calculateLoanBalance,
} from './utils.js';
import { HousingOptimizer } from './housing-optimizer.js';

const PENSION_AGE = 67;
const FUNERAL_RESERVE_PER_PERSON = 20000;
const SURVIVOR_SPENDING_FACTOR = 0.75;
const MAX_WITHDRAWAL_SEARCH_CAP = 500000;
const LONGEVITY_STRESS_AGE = 120;

const getLastItem = (items = []) => items[items.length - 1] || null;

const clampCurrency = (value) => Math.max(0, Math.round(value || 0));

const formatRange = (values) => {
    if (!values.length) return 'n/a';
    if (values.length === 1) return formatCurrency(values[0]);

    const low = Math.min(...values);
    const high = Math.max(...values);
    return low === high
        ? formatCurrency(low)
        : `${formatCurrency(low)} to ${formatCurrency(high)}`;
};

export class PersonalizedQuestionEngine {
    constructor(simulator, healthcareModeling, config = ENHANCED_CONFIG) {
        this.simulator = simulator;
        this.healthcareModeling = healthcareModeling;
        this.config = config;
    }

    generateAnswers(inputs, detailedProjection = null) {
        const projection = detailedProjection || this.simulator.simulateRetirement(inputs, false);
        const projectionTo100 = this.simulator.simulateRetirement(this.buildAge100Inputs(inputs), false);

        return [
            this.answerMaximumWithdrawal(inputs),
            this.answerAgePension(inputs, projectionTo100),
            this.answerSurvivorScenario(inputs, projectionTo100),
            this.answerFuneralReserve(inputs),
            this.answerHousingAndCare(inputs),
        ];
    }

    buildAge100Inputs(inputs) {
        const yearsUntil100 = Math.max(0, 100 - inputs.yourCurrentAge);
        const age100Inputs = {
            ...inputs,
            yourLifespan: Math.max(inputs.yourLifespan || 0, 100),
        };

        if (!inputs.isSingleCalculation && inputs.partnerCurrentAge > 0) {
            age100Inputs.partnerLifespan = Math.max(
                inputs.partnerLifespan || 0,
                inputs.partnerCurrentAge + yearsUntil100
            );
        }

        return age100Inputs;
    }

    buildWithdrawalSearchInputs(inputs) {
        return {
            ...this.buildAge100Inputs(inputs),
            // The direct withdrawal question should search against the draw target
            // itself rather than the simulator's separate cash-flow expense floor.
            useDetailedExpenseInputs: true,
            currentMonthlyHousingCosts: 0,
            currentMonthlyLivingCosts: 0,
            monthlyMortgagePayment: 0,
            annualTravelBudget: 0,
            annualHobbyBudget: 0,
        };
    }

    findMaxRealWithdrawal(inputs) {
        const scenarioInputs = this.buildWithdrawalSearchInputs(inputs);
        let low = 0;
        let high = Math.max((inputs.asfaComfortable || 0) * 2, 40000);

        const canSustain = (annualSpend) => {
            const result = this.simulator.simulateRetirement({
                ...scenarioInputs,
                asfaComfortable: annualSpend,
            }, false);

            const age100Year = result.yearlyData.find(year => year.age >= 100);
            return !!age100Year && !age100Year.depleted && age100Year.endBalance > 0;
        };

        while (high < MAX_WITHDRAWAL_SEARCH_CAP && canSustain(high)) {
            low = high;
            high = Math.min(MAX_WITHDRAWAL_SEARCH_CAP, Math.round(high * 1.35));
        }

        for (let i = 0; i < 22; i++) {
            const mid = (low + high) / 2;
            if (canSustain(mid)) {
                low = mid;
            } else {
                high = mid;
            }
        }

        return clampCurrency(low);
    }

    buildLongevityStressInputs(inputs, horizonAge = LONGEVITY_STRESS_AGE) {
        const yearsUntilHorizon = Math.max(0, horizonAge - inputs.yourCurrentAge);
        const stressInputs = {
            ...inputs,
            yourLifespan: Math.max(inputs.yourLifespan || 0, horizonAge),
        };

        if (!inputs.isSingleCalculation && inputs.partnerCurrentAge > 0) {
            stressInputs.partnerLifespan = Math.max(
                inputs.partnerLifespan || 0,
                inputs.partnerCurrentAge + yearsUntilHorizon
            );
        }

        return stressInputs;
    }

    findRunOutYear(projection) {
        return projection.yearlyData.find(year => year.depleted || (year.endBalance || 0) <= 0) || null;
    }

    answerMaximumWithdrawal(inputs) {
        const maxWithdrawal = this.findMaxRealWithdrawal(inputs);
        const yearsToRetirement = Math.max(0, inputs.retirementAge - inputs.yourCurrentAge);
        const firstYearNominal = maxWithdrawal * Math.pow(1 + (inputs.inflation || 0), yearsToRetirement);
        const difference = maxWithdrawal - (inputs.asfaComfortable || 0);
        const tone = difference >= 0 ? 'positive' : 'warning';
        const longevityProjection = this.simulator.simulateRetirement({
            ...this.buildLongevityStressInputs(inputs),
            asfaComfortable: maxWithdrawal,
        }, false);
        const runOutYear = this.findRunOutYear(longevityProjection);
        const longevityBullet = runOutYear
            ? inputs.isSingleCalculation || inputs.partnerCurrentAge <= 0
                ? `If you live beyond the lifespan age you entered, this draw rate is projected to run out around age ${runOutYear.age}.`
                : `If either of you lives beyond the lifespan ages entered, this draw rate is projected to run out around your age ${runOutYear.age}${runOutYear.partnerAge > 0 ? ` (partner age ${runOutYear.partnerAge})` : ''}.`
            : inputs.isSingleCalculation || inputs.partnerCurrentAge <= 0
                ? `Even if you live beyond the lifespan age you entered, the model still has money left through age ${LONGEVITY_STRESS_AGE}.`
                : `Even if either of you lives beyond the lifespan ages entered, the model still has money left through your age ${LONGEVITY_STRESS_AGE}.`;

        if (maxWithdrawal <= 0) {
            return {
                id: 'max-withdrawal',
                question: 'What will be the maximum withdrawal (after inflation) I can take each year until age 100?',
                tone: 'warning',
                headline: 'No sustainable real withdrawal identified',
                bullets: [
                    'Under your current settings, the plan does not support a constant real withdrawal through age 100.',
                    'That usually means the current asset base and retirement horizon are too tight under the model, so lowering spending, retiring later, or adding capital would help first.',
                    longevityBullet,
                ],
            };
        }

        return {
            id: 'max-withdrawal',
            question: 'What will be the maximum withdrawal (after inflation) I can take each year until age 100?',
            tone,
            headline: `${formatCurrency(maxWithdrawal)} per year in today’s dollars`,
            bullets: [
                `That is about ${formatCurrency(firstYearNominal)} in your first retirement year after inflation is applied.`,
                difference >= 0
                    ? `That is roughly ${formatCurrency(difference)} above your current spending target.`
                    : `That is roughly ${formatCurrency(Math.abs(difference))} below your current spending target, so your plan would need either lower spending or more capital.`,
                longevityBullet,
                'This figure is the highest constant real draw the model could support while still carrying your plan through to age 100.',
            ],
        };
    }

    buildPensionSnapshot(inputs, projection, yearData) {
        const yearsFromNow = Math.max(0, yearData.age - inputs.yourCurrentAge);
        const yearsFromRetirement = Math.max(0, yearData.age - inputs.retirementAge);
        const homeValueAtAge = (inputs.homeValue || 0) * Math.pow(1 + (inputs.inflation || 0), yearsFromNow);
        const mortgageAtAge = Math.max(
            0,
            calculateLoanBalance(
                inputs.mortgageRate || 0,
                yearsFromNow,
                inputs.monthlyMortgagePayment || 0,
                inputs.mortgageBalance || 0
            )
        );
        const homeEquityAtAge = inputs.planToDownsize ? 0 : Math.max(0, homeValueAtAge - mortgageAtAge);
        const propertyEquity = Math.max(0, (yearData.nonLiquidAssets || 0) - homeEquityAtAge);
        const trustAttributedAssets = inputs.hasTrustAssets
            ? (inputs.trustNetAssets || 0) * (inputs.trustAttributionPercentage || 0)
            : 0;
        const assessableAssets = Math.max(
            0,
            (yearData.startBalance || 0) +
            propertyEquity +
            trustAttributedAssets +
            (inputs.homeInTrust ? homeEquityAtAge : 0)
        );

        const homeowner = (inputs.homeValue || 0) > 0 && !inputs.planToDownsize && !inputs.homeInTrust;
        const isCoupleAtAssessment = !inputs.isSingleCalculation &&
            yearData.partnerAge > 0 &&
            yearData.partnerAge <= (inputs.partnerLifespan || 0);

        if (isCoupleAtAssessment) {
            const person1 = {
                age: yearData.age,
                super: assessableAssets / 2,
                investments: 0,
                salary: 0,
                otherIncome: (yearData.propertyIncome || 0) / 2,
                financialAssets: assessableAssets / 2,
            };
            const person2 = {
                age: yearData.partnerAge,
                super: assessableAssets / 2,
                investments: 0,
                salary: 0,
                otherIncome: (yearData.propertyIncome || 0) / 2,
                financialAssets: assessableAssets / 2,
            };
            const pensionResult = calculateAgePensionForCouple(person1, person2, homeowner, {});
            const threshold = homeowner
                ? ENHANCED_CONFIG.COUPLE_ASSET_THRESHOLD
                : ENHANCED_CONFIG.COUPLE_ASSET_THRESHOLD_NON_HOMEOWNER;
            const limit = homeowner
                ? ENHANCED_CONFIG.COUPLE_ASSET_LIMIT
                : ENHANCED_CONFIG.COUPLE_ASSET_LIMIT_NON_HOMEOWNER;
            const maxAnnual = pensionResult.scenario === 'ONE_ELIGIBLE'
                ? ENHANCED_CONFIG.COUPLE_PENSION_MAX / 2
                : ENHANCED_CONFIG.COUPLE_PENSION_MAX;

            return {
                annualPension: pensionResult.currentPension?.annual || 0,
                fortnightlyPension: pensionResult.currentPension?.fortnight || 0,
                limitingTest: pensionResult.limitingTest || 'Assets Test',
                assessableAssets,
                fullThreshold: threshold,
                partThreshold: limit,
                maxAnnual,
                note: pensionResult.scenario === 'ONE_ELIGIBLE'
                    ? `Only one partner is pension-age at this point, so the model applies couple means tests but pays one half-rate pension.`
                    : `Both partners are pension-age at this point, so the model uses the full couple Age Pension settings.`,
                yearsFromRetirement,
            };
        }

        const effectivePensionMax = (inputs.agePensionMax > 0)
            ? inputs.agePensionMax
            : ENHANCED_CONFIG.SINGLE_PENSION_MAX;
        const effectiveAssetThreshold = (inputs.pensionAssetThreshold > 0)
            ? inputs.pensionAssetThreshold
            : ENHANCED_CONFIG.SINGLE_ASSET_THRESHOLD;
        const effectiveAssetLimit = (inputs.pensionAssetLimit > 0)
            ? inputs.pensionAssetLimit
            : ENHANCED_CONFIG.SINGLE_ASSET_LIMIT;
        const effectiveIncomeThreshold = (inputs.pensionIncomeThreshold > 0)
            ? inputs.pensionIncomeThreshold
            : ENHANCED_CONFIG.SINGLE_INCOME_THRESHOLD;
        const annualPension = calculateAgePension(
            assessableAssets,
            yearData.propertyIncome || 0,
            false,
            effectivePensionMax,
            effectiveAssetThreshold,
            effectiveAssetLimit,
            effectiveIncomeThreshold
        );

        return {
            annualPension,
            fortnightlyPension: annualPension / ENHANCED_CONFIG.FORTNIGHTS_IN_YEAR,
            limitingTest: assessableAssets > effectiveAssetThreshold ? 'Assets Test' : 'Income Test',
            assessableAssets,
            fullThreshold: effectiveAssetThreshold,
            partThreshold: effectiveAssetLimit,
            maxAnnual: effectivePensionMax,
            note: 'This is based on the single-rate means tests at your Age Pension age.',
            yearsFromRetirement,
        };
    }

    answerAgePension(inputs, projectionTo100) {
        const assessmentYear = projectionTo100.yearlyData.find(year => year.age >= PENSION_AGE);

        if (!assessmentYear) {
            return {
                id: 'age-pension',
                question: 'Will I be able to draw Age Pension, and how much could it be?',
                tone: 'neutral',
                headline: 'The model never reaches your Age Pension age',
                bullets: [
                    'Your current lifespan and retirement settings do not produce a projection at age 67, so there is no Age Pension estimate to show.',
                    'Increase the projected lifespan or pension-age horizon if you want this question answered numerically.',
                ],
            };
        }

        const snapshot = this.buildPensionSnapshot(inputs, projectionTo100, assessmentYear);
        const pensionRatio = snapshot.maxAnnual > 0 ? snapshot.annualPension / snapshot.maxAnnual : 0;
        const tone = snapshot.annualPension > 0 ? 'positive' : 'warning';
        const headline = snapshot.annualPension <= 0
            ? `Not currently projected to qualify at age ${assessmentYear.age}`
            : pensionRatio >= 0.9
                ? `Likely full Age Pension from age ${assessmentYear.age}`
                : `Likely part Age Pension from age ${assessmentYear.age}`;

        const bullets = [
            `Projected pension at that point is about ${formatCurrency(snapshot.annualPension)} per year (${formatCurrency(snapshot.fortnightlyPension)} per fortnight).`,
            `${snapshot.note} The main binding test looks to be the ${snapshot.limitingTest.toLowerCase()}.`,
        ];

        if (snapshot.annualPension <= 0) {
            const reductionToPartPension = Math.max(0, snapshot.assessableAssets - snapshot.partThreshold);
            const reductionToFullPension = Math.max(0, snapshot.assessableAssets - snapshot.fullThreshold);
            bullets.push(
                `To get any pension under the current settings, assessable assets would likely need to fall by about ${formatCurrency(reductionToPartPension)}.`
            );
            bullets.push(
                `To get the full pension, assessable assets would likely need to fall by about ${formatCurrency(reductionToFullPension)}.`
            );
            bullets.push(
                'That usually means carrying less in assessable assets and more in exempt home value, debt reduction, or other Centrelink-compliant restructuring rather than simply withdrawing faster.'
            );
        } else if (pensionRatio < 0.9) {
            const reductionToFullPension = Math.max(0, snapshot.assessableAssets - snapshot.fullThreshold);
            bullets.push(
                `To move closer to the full pension, assessable assets would need to fall by roughly ${formatCurrency(reductionToFullPension)}.`
            );
        } else {
            bullets.push('On the current assumptions, your projected assets already sit inside the full-pension means-test range.');
        }

        return {
            id: 'age-pension',
            question: 'Will I be able to draw Age Pension, and how much could it be?',
            tone,
            headline,
            bullets,
        };
    }

    buildHouseholdSnapshotAtAge(inputs, projectionTo100, triggerAge) {
        const yearData = projectionTo100.yearlyData.find(year => year.age >= triggerAge);
        if (!yearData) return null;

        const yearsFromNow = Math.max(0, triggerAge - inputs.yourCurrentAge);
        const homeValue = (inputs.homeValue || 0) * Math.pow(1 + (inputs.inflation || 0), yearsFromNow);
        const mortgageBalance = Math.max(
            0,
            calculateLoanBalance(
                inputs.mortgageRate || 0,
                yearsFromNow,
                inputs.monthlyMortgagePayment || 0,
                inputs.mortgageBalance || 0
            )
        );
        const propertyValue = inputs.hasInvestmentProperty
            ? this.simulator.calculatePropertyValue(
                inputs.investmentPropertyValue || 0,
                inputs.propertyGrowthRate || 0,
                yearsFromNow
            )
            : 0;
        const propertyLoan = inputs.hasInvestmentProperty
            ? this.simulator.calculatePropertyLoanBalance(
                inputs.investmentPropertyLoan || 0,
                inputs.investmentPropertyRate || 0,
                yearsFromNow,
                inputs.investmentPropertyLoanType === 'io'
            )
            : 0;

        return {
            yearData,
            homeValue,
            mortgageBalance,
            propertyValue,
            propertyLoan,
        };
    }

    runSurvivorScenario(inputs, projectionTo100, deceasedPerson, triggerAge) {
        const snapshot = this.buildHouseholdSnapshotAtAge(inputs, projectionTo100, triggerAge);
        if (!snapshot || inputs.isSingleCalculation || inputs.partnerCurrentAge <= 0) {
            return null;
        }

        const survivorAge = deceasedPerson === 'partner'
            ? snapshot.yearData.age
            : snapshot.yearData.partnerAge;

        if (!survivorAge || survivorAge <= 0) {
            return null;
        }

        const horizonAge = deceasedPerson === 'partner'
            ? 100
            : survivorAge + Math.max(0, 100 - snapshot.yearData.age);

        const survivorInputs = {
            ...inputs,
            yourCurrentAge: survivorAge,
            partnerCurrentAge: 0,
            retirementAge: survivorAge,
            partnerRetirementAge: 0,
            yourLifespan: horizonAge,
            partnerLifespan: 0,
            yourSalary: 0,
            partnerSalary: 0,
            yourCurrentSuper: snapshot.yearData.startBalance || 0,
            partnerCurrentSuper: 0,
            currentSavings: 0,
            currentStocks: 0,
            homeValue: snapshot.homeValue,
            mortgageBalance: snapshot.mortgageBalance,
            investmentPropertyValue: snapshot.propertyValue,
            investmentPropertyLoan: snapshot.propertyLoan,
            asfaComfortable: (inputs.asfaComfortable || 0) * SURVIVOR_SPENDING_FACTOR,
            isSingleCalculation: true,
            pensionAssetThreshold: ENHANCED_CONFIG.SINGLE_ASSET_THRESHOLD,
            pensionAssetLimit: ENHANCED_CONFIG.SINGLE_ASSET_LIMIT,
            pensionIncomeThreshold: ENHANCED_CONFIG.SINGLE_INCOME_THRESHOLD,
            agePensionMax: ENHANCED_CONFIG.SINGLE_PENSION_MAX,
        };

        const result = this.simulator.simulateRetirement(survivorInputs, false);
        const endYear = getLastItem(result.yearlyData);
        const endNetWorth = endYear
            ? (endYear.endBalance || 0) + (endYear.nonLiquidAssets || 0)
            : result.finalBalance || 0;

        return {
            triggerAge,
            endNetWorth,
        };
    }

    answerSurvivorScenario(inputs, projectionTo100) {
        if (inputs.isSingleCalculation || inputs.partnerCurrentAge <= 0) {
            return {
                id: 'survivor-scenario',
                question: 'What happens if I or my partner passes away between age 70 and 75?',
                tone: 'neutral',
                headline: 'This question only applies to a couple scenario',
                bullets: [
                    'Add partner details and rerun the life simulation to estimate the survivor outcome.',
                ],
            };
        }

        const baselineAge100 = projectionTo100.yearlyData.find(year => year.age >= 100) || getLastItem(projectionTo100.yearlyData);
        const baselineNetWorth = baselineAge100
            ? (baselineAge100.endBalance || 0) + (baselineAge100.nonLiquidAssets || 0)
            : projectionTo100.finalBalance || 0;

        const partnerDeathScenarios = [70, 75]
            .map(age => this.runSurvivorScenario(inputs, projectionTo100, 'partner', age))
            .filter(Boolean);
        const yourDeathScenarios = [70, 75]
            .map(age => this.runSurvivorScenario(inputs, projectionTo100, 'you', age))
            .filter(Boolean);

        const partnerDeathNetWorths = partnerDeathScenarios.map(s => clampCurrency(s.endNetWorth));
        const yourDeathNetWorths = yourDeathScenarios.map(s => clampCurrency(s.endNetWorth));
        const partnerDeathDelta = partnerDeathScenarios.map(s => clampCurrency(s.endNetWorth - baselineNetWorth));
        const yourDeathDelta = yourDeathScenarios.map(s => clampCurrency(s.endNetWorth - baselineNetWorth));

        return {
            id: 'survivor-scenario',
            question: 'What happens if I or my partner passes away between age 70 and 75?',
            tone: 'warning',
            headline: 'The survivor usually ends with more capital, but less household income and flexibility',
            bullets: [
                `If your partner passed away between 70 and 75, the survivor is projected to finish with about ${formatRange(partnerDeathNetWorths)} by your age 100 — roughly ${formatRange(partnerDeathDelta)} more than the baseline plan because household spending falls to a single-person budget.`,
                `If you passed away between 70 and 75, your partner is projected to finish with about ${formatRange(yourDeathNetWorths)} by the time you would have turned 100 — roughly ${formatRange(yourDeathDelta)} more than the baseline plan.`,
                'These are simplified survivor estimates using single-person spending and pension settings from the trigger age, so they are best treated as a planning guide rather than an estate calculation.',
            ],
        };
    }

    answerFuneralReserve(inputs) {
        const people = inputs.isSingleCalculation ? 1 : 2;
        const targetReserve = FUNERAL_RESERVE_PER_PERSON * people;
        const currentLiquidCash = clampCurrency(inputs.currentSavings || 0);
        const shortfall = Math.max(0, targetReserve - currentLiquidCash);
        const tone = shortfall === 0 ? 'positive' : 'neutral';

        return {
            id: 'funeral-reserve',
            question: 'Should I save separately for funeral and related end-of-life costs?',
            tone,
            headline: `${formatCurrency(targetReserve)} is a sensible reserve for ${people === 1 ? 'one person' : 'both of you'}`,
            bullets: [
                `A practical planning buffer is about ${formatCurrency(FUNERAL_RESERVE_PER_PERSON)} per person for funeral, estate-admin, legal, and immediate family costs.`,
                shortfall === 0
                    ? `You already have enough cash on hand to ring-fence that amount if you want to keep it separate from general savings.`
                    : `Based on your current cash savings, you are about ${formatCurrency(shortfall)} short of that reserve if you want it set aside separately.`,
                'Keep this reserve separate from aged-care funding, because residential care deposits and ongoing care costs are already a different problem with much larger numbers.',
            ],
        };
    }

    answerHousingAndCare(inputs) {
        const agedCareProjection = this.healthcareModeling.calculateAgedCareProjections(inputs);
        const housingOptimizer = new HousingOptimizer(
            {
                age: inputs.yourCurrentAge,
                partnered: !inputs.isSingleCalculation,
            },
            {
                homeValue: inputs.homeValue || 0,
            }
        );
        const radAnalysis = housingOptimizer.analyzeRADvsDAP();

        const homeCareCost = clampCurrency(agedCareProjection.homeCare?.expectedCost || 0);
        const residentialCost = clampCurrency(agedCareProjection.residentialCare?.expectedCost || 0);
        const radEstimate = clampCurrency(agedCareProjection.residentialCare?.estimatedRAD || 0);
        const probability = Math.round((agedCareProjection.probabilityOfNeed || 0) * 100);

        let headline = 'Financially, staying in the paid-off home and using home care first looks better';
        let tone = 'positive';

        if ((inputs.homeValue || 0) <= 0) {
            headline = 'This comparison only works properly once a home value is included';
            tone = 'neutral';
        } else if (homeCareCost > residentialCost * 0.95) {
            headline = 'Residential aged care could be financially competitive once care needs are high';
            tone = 'warning';
        } else if (probability >= 60) {
            headline = 'Stay in the home first, but build a clear residential aged-care fallback plan';
            tone = 'neutral';
        }

        return {
            id: 'housing-care',
            question: 'Would it be better to stay in my paid-off home or move to residential aged care?',
            tone,
            headline,
            bullets: [
                `The care model estimates about ${formatCurrency(homeCareCost)} of expected home-care costs versus about ${formatCurrency(residentialCost)} of expected residential aged-care costs.`,
                `Residential care also points to a RAD of roughly ${formatCurrency(radEstimate)}. If you ever need that path, the current funding preference from the housing model is “${radAnalysis.strategy.recommendation}”.`,
                `Because the family home is usually Age Pension exempt while you keep living in it, staying put generally preserves pension flexibility better until health needs make residential care worthwhile. Current estimated care-need probability: ${probability}%.`,
            ],
        };
    }
}

export default PersonalizedQuestionEngine;
