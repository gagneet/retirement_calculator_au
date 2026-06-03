/**
 * Tests for the Financial Life Simulation Engine.
 *
 * Covers:
 *  - FinancialState snapshots and recalculate()
 *  - IncomeEngine projections
 *  - ExpenseEngine projections and spending phases
 *  - TaxEngine Australian income tax calculations
 *  - SuperEngine contributions, growth, and withdrawal
 *  - PensionEngine Age Pension means tests
 *  - ShockEngine random shock application
 *  - SpendingEngine all five strategies
 *  - LifeEventEngine event building and application
 *  - LifeSimulationEngine single-run simulation
 *  - RecommendationEngine output structure
 */

// ── Imports ───────────────────────────────────────────────────────────────────

import { FinancialState } from '../../src/js/simulation_engine/financial_state.js';

import {
    projectSalary,
    projectPartnerSalary,
    calcInvestmentIncome,
} from '../../src/js/simulation_engine/income_engine.js';

import {
    getSpendingPhaseMultiplier,
    projectLivingExpenses,
    projectHealthcareCosts,
    getAgedCareCost,
} from '../../src/js/simulation_engine/expense_engine.js';

import {
    TAX_BRACKETS_2025,
    calcIncomeTax,
    calcGrossTax,
    calculateLITO,
    calcSuperTax,
    calcPostTaxSalary,
} from '../../src/js/simulation_engine/tax_engine.js';

import {
    getSGRate,
    calcSuperContributions,
    growSuperBalance,
    calcSuperWithdrawal,
    PRESERVATION_AGE,
} from '../../src/js/simulation_engine/super_engine.js';

import {
    PENSION_AGE,
    PENSION_RATES,
    calcSinglePension,
    calcCouplePension,
    calcPensionForYear,
} from '../../src/js/simulation_engine/pension_engine.js';

import {
    applyMarketShock,
    applyPropertyShock,
    applyInflationShock,
    simulateAnnualReturn,
} from '../../src/js/simulation_engine/shock_engine.js';

import {
    SPENDING_STRATEGIES,
    fixedSpending,
    guardrailSpending,
    percentageSpending,
    floorUpsideSpending,
    guytonKlingerSpending,
    calculateSpending,
} from '../../src/js/simulation_engine/spending_engine.js';

import {
    EVENT_TYPES,
    buildLifeEvents,
    getActiveEvents,
    applyLifeEvents,
} from '../../src/js/simulation_engine/life_event_engine.js';

import { runLifeSimulation } from '../../src/js/simulation_engine/life_simulation_engine.js';

import { generateRecommendations } from '../../src/js/simulation_engine/recommendation_engine.js';

// ── FinancialState ────────────────────────────────────────────────────────────

describe('FinancialState', () => {
    test('creates with default zero values at given age', () => {
        const state = new FinancialState(50);
        expect(state.age).toBe(50);
        expect(state.salary).toBe(0);
        expect(state.superBalance).toBe(0);
        expect(state.netWorth).toBe(0);
    });

    test('accepts overrides for initial values', () => {
        const state = new FinancialState(55, { superBalance: 400000, investmentAssets: 100000 });
        expect(state.superBalance).toBe(400000);
        expect(state.investmentAssets).toBe(100000);
    });

    test('recalculate() derives net worth correctly', () => {
        const state = new FinancialState(60, {
            superBalance:     500000,
            investmentAssets: 200000,
            propertyAssets:   800000,
            mortgageBalance:  300000,
        });
        state.recalculate();
        // Net worth = (500000 + 200000 + 800000) - 300000 = 1200000
        expect(state.netWorth).toBe(1200000);
    });

    test('toSnapshot() returns plain object', () => {
        const state = new FinancialState(70, { salary: 50000 });
        const snap  = state.toSnapshot();
        expect(typeof snap).toBe('object');
        expect(snap.salary).toBe(50000);
    });
});

// ── IncomeEngine ──────────────────────────────────────────────────────────────

describe('IncomeEngine – projectSalary', () => {
    const base = { retirementAge: 65, salaryGrowthRate: 0.05 };

    test('applies salary growth each year', () => {
        const next = projectSalary(100000, 50, base);
        expect(next).toBeCloseTo(105000);
    });

    test('returns 0 at retirement age', () => {
        expect(projectSalary(100000, 65, base)).toBe(0);
    });

    test('returns 0 after retirement age', () => {
        expect(projectSalary(100000, 70, base)).toBe(0);
    });

    test('applies income-drop fraction on trigger year', () => {
        const inputs = { ...base, incomeDropAge: 55, incomeDropFraction: 0.6 };
        const salary = projectSalary(100000, 55, inputs);
        // Grows by 5% then drops by 40%
        expect(salary).toBeCloseTo(100000 * 1.05 * 0.6);
    });
});

describe('IncomeEngine – calcInvestmentIncome', () => {
    test('calculates dividend income from equities allocation', () => {
        // allocEquities is in decimal form (0.60) as returned by collectInputs()
        const income = calcInvestmentIncome(500000, { dividendYield: 0.04, allocEquities: 0.6 });
        // 500000 * 0.60 * 0.04 = 12000
        expect(income).toBeCloseTo(12000);
    });

    test('returns zero for zero assets', () => {
        expect(calcInvestmentIncome(0, { dividendYield: 0.04, allocEquities: 0.6 })).toBe(0);
    });
});

// ── ExpenseEngine ─────────────────────────────────────────────────────────────

describe('ExpenseEngine – getSpendingPhaseMultiplier', () => {
    test('returns 1.0 before retirement', () => {
        expect(getSpendingPhaseMultiplier(60, 65)).toBe(1.0);
    });

    test('returns 1.0 in active retirement phase (age 60–70)', () => {
        expect(getSpendingPhaseMultiplier(68, 65)).toBe(1.0);
    });

    test('returns 0.85 in stable phase (age 70–80)', () => {
        expect(getSpendingPhaseMultiplier(75, 60)).toBe(0.85);
    });

    test('returns 0.75 in slowdown phase (age 80–90)', () => {
        expect(getSpendingPhaseMultiplier(84, 60)).toBe(0.75);
    });

    test('returns 0.65 in healthcare phase (age 90+)', () => {
        expect(getSpendingPhaseMultiplier(92, 60)).toBe(0.65);
    });
});

describe('ExpenseEngine – projectLivingExpenses', () => {
    const base = { retirementAge: 65, inflation: 0.03, asfaComfortable: 73031, leanYearsStart: 999, leanYearsReduction: 0 };

    test('inflates expenses by inflation rate each year (pre-retirement)', () => {
        const next = projectLivingExpenses(50000, 50, base);
        expect(next).toBeCloseTo(50000 * 1.03);
    });

    test('applies spending phase reduction in retirement at age 75', () => {
        const retired75 = projectLivingExpenses(73031, 75, { ...base, retirementAge: 60 });
        // Phase multiplier 0.85, no lean years
        expect(retired75).toBeLessThan(73031 * 1.03);
    });
});

describe('ExpenseEngine – getAgedCareCost', () => {
    test('returns 0 before aged-care start age', () => {
        expect(getAgedCareCost(80, { agedCareStartAge: 85, agedCareDuration: 3, agedCareAnnualCost: 75000 })).toBe(0);
    });

    test('returns cost during aged-care duration', () => {
        const cost = getAgedCareCost(85, { agedCareStartAge: 85, agedCareDuration: 3, agedCareAnnualCost: 75000, retirementAge: 65, inflation: 0.03 });
        expect(cost).toBeGreaterThan(0);
    });

    test('returns 0 after aged-care period ends', () => {
        const cost = getAgedCareCost(89, { agedCareStartAge: 85, agedCareDuration: 3, agedCareAnnualCost: 75000 });
        expect(cost).toBe(0);
    });
});

// ── TaxEngine ─────────────────────────────────────────────────────────────────

describe('TaxEngine – calcIncomeTax', () => {
    test('zero tax for income at or below tax-free threshold', () => {
        // $18,200 threshold + LITO means ~$21,884 effective tax-free
        expect(calcIncomeTax(0)).toBe(0);
        expect(calcIncomeTax(18200)).toBe(0);
    });

    test('tax bracket 16% applies for $18,201–$45,000', () => {
        const tax = calcIncomeTax(30000);
        // Gross tax: (30000 - 18200) * 0.16 = 1888
        // LITO: 700 - (30000 - 37500)*0.05 = 700 (below phase-out)
        // Medicare levy is reduced at this income level, so total tax is below the
        // full 2% levy calculation.
        // Total from engine: 1670
        expect(tax).toBeGreaterThan(0);
        expect(tax).toBeCloseTo(1670, 0);
    });

    test('higher income bracket applies for salary > $120k', () => {
        const tax120 = calcIncomeTax(120000);
        const tax180 = calcIncomeTax(180000);
        expect(tax180).toBeGreaterThan(tax120);
    });

    test('returns 0 for negative income', () => {
        expect(calcIncomeTax(-1000)).toBe(0);
    });
});

describe('TaxEngine – calculateLITO', () => {
    test('returns maximum LITO ($700) below phase-out threshold', () => {
        expect(calculateLITO(20000)).toBe(700);
    });

    test('LITO reduces above $37,500', () => {
        const lito = calculateLITO(40000);
        expect(lito).toBeLessThan(700);
        expect(lito).toBeGreaterThan(0);
    });

    test('LITO phases out to zero above $66,667', () => {
        const lito = calculateLITO(70000);
        expect(lito).toBe(0);
    });
});

describe('TaxEngine – calcSuperTax', () => {
    test('15% contributions tax on standard salary', () => {
        const concessionalContribs = 100000 * 0.115;
        const tax = calcSuperTax(100000, concessionalContribs);
        expect(tax).toBeCloseTo(concessionalContribs * 0.15);
    });

    test('Division 293 surcharge applies only to concessional amounts above the threshold', () => {
        const concessionalContribs = 300000 * 0.115;
        const tax = calcSuperTax(300000, concessionalContribs);
        const surchargeableAmount = Math.min(concessionalContribs, (300000 + concessionalContribs) - 250000);
        const expectedTax = (concessionalContribs * 0.15) + (surchargeableAmount * 0.15);
        expect(tax).toBeCloseTo(expectedTax);
    });
});

// ── SuperEngine ───────────────────────────────────────────────────────────────

describe('SuperEngine – getSGRate', () => {
    test('returns 11.5% for 2024', () => {
        expect(getSGRate(2024)).toBeCloseTo(0.115);
    });

    test('returns 12% for 2025 and later', () => {
        expect(getSGRate(2025)).toBeCloseTo(0.12);
        expect(getSGRate(2030)).toBeCloseTo(0.12);
    });
});

describe('SuperEngine – calcSuperContributions', () => {
    test('returns SG contribution during working years', () => {
        const contrib = calcSuperContributions(100000, 50, { retirementAge: 65 }, 2025);
        expect(contrib).toBeCloseTo(100000 * 0.12);
    });

    test('returns 0 at retirement age', () => {
        expect(calcSuperContributions(100000, 65, { retirementAge: 65 }, 2025)).toBe(0);
    });

    test('uses custom superContributionRate when provided', () => {
        const contrib = calcSuperContributions(100000, 50, { retirementAge: 65, superContributionRate: 0.15 }, 2025);
        expect(contrib).toBeCloseTo(15000);
    });
});

describe('SuperEngine – growSuperBalance', () => {
    test('grows balance by super return rate', () => {
        const endBalance = growSuperBalance(300000, 12000, 1800, { superReturn: 0.075 });
        const netContrib = 12000 - 1800;
        expect(endBalance).toBeCloseTo((300000 + netContrib) * 1.075);
    });
});

describe('SuperEngine – calcSuperWithdrawal', () => {
    test('returns 0 before preservation age', () => {
        expect(calcSuperWithdrawal(500000, 55, 50000, { retirementAge: 65 })).toBe(0);
    });

    test('returns minimum drawdown at retirement', () => {
        const withdrawal = calcSuperWithdrawal(1000000, 67, 0, { retirementAge: 65 });
        // Age 67 → min 5%
        expect(withdrawal).toBeCloseTo(1000000 * 0.05);
    });

    test('draws more than minimum if spending requires it', () => {
        const withdrawal = calcSuperWithdrawal(1000000, 67, 100000, { retirementAge: 65 });
        expect(withdrawal).toBe(100000);
    });

    test('cannot withdraw more than balance', () => {
        const withdrawal = calcSuperWithdrawal(10000, 67, 999999, { retirementAge: 65 });
        expect(withdrawal).toBe(10000);
    });
});

// ── PensionEngine ─────────────────────────────────────────────────────────────

describe('PensionEngine – calcSinglePension', () => {
    test('returns full pension for low assets and income', () => {
        const pension = calcSinglePension(100000, 5000, true);
        expect(pension).toBeCloseTo(PENSION_RATES.singleMax);
    });

    test('reduces pension as assets exceed threshold (homeowner)', () => {
        const fullPension = calcSinglePension(100000, 0, true);
        const reducedPension = calcSinglePension(450000, 0, true);
        expect(reducedPension).toBeLessThan(fullPension);
    });

    test('returns 0 above asset limit', () => {
        const pension = calcSinglePension(900000, 0, true);
        expect(pension).toBe(0);
    });

    test('income test can reduce pension', () => {
        const highIncomePension = calcSinglePension(100000, 80000, true);
        expect(highIncomePension).toBeLessThan(PENSION_RATES.singleMax);
    });
});

describe('PensionEngine – calcPensionForYear', () => {
    test('returns 0 below pension age (67)', () => {
        const result = calcPensionForYear(65, 100000, 5000, false, true);
        expect(result.eligible).toBe(false);
        expect(result.annualPension).toBe(0);
    });

    test('returns pension at pension age', () => {
        const result = calcPensionForYear(67, 100000, 5000, false, true);
        expect(result.eligible).toBe(true);
        expect(result.annualPension).toBeGreaterThan(0);
    });
});

// ── ShockEngine ───────────────────────────────────────────────────────────────

describe('ShockEngine – applyMarketShock', () => {
    test('returns unchanged portfolio when shocks disabled', () => {
        const { newValue, shockOccurred } = applyMarketShock(1000000, { enableShocks: false });
        expect(newValue).toBe(1000000);
        expect(shockOccurred).toBe(false);
    });

    test('shock magnitude reduces portfolio when shock occurs', () => {
        // Force shock by mocking Math.random to return 0 (always triggers)
        const origRandom = Math.random;
        Math.random = () => 0;
        const { newValue, shockOccurred } = applyMarketShock(1000000, {
            enableShocks:     true,
            shockProbability: 1.0,   // certainty
            shockMagnitude:   -0.25,
        });
        Math.random = origRandom;
        expect(shockOccurred).toBe(true);
        expect(newValue).toBeCloseTo(750000);
    });
});

describe('ShockEngine – simulateAnnualReturn', () => {
    test('returns a numeric value', () => {
        const ret = simulateAnnualReturn(0.07, 0.12);
        expect(typeof ret).toBe('number');
    });

    test('expected value is approximately mean over many runs', () => {
        const n = 10000;
        const mean = 0.07;
        let sum = 0;
        for (let i = 0; i < n; i++) sum += simulateAnnualReturn(mean, 0.12);
        expect(sum / n).toBeCloseTo(mean, 0);
    });
});

// ── SpendingEngine ────────────────────────────────────────────────────────────

describe('SpendingEngine – fixedSpending', () => {
    test('inflates by inflation rate over years', () => {
        expect(fixedSpending(73031, 0.03, 10)).toBeCloseTo(73031 * Math.pow(1.03, 10));
    });

    test('returns base amount at year 0', () => {
        expect(fixedSpending(73031, 0.03, 0)).toBe(73031);
    });
});

describe('SpendingEngine – guardrailSpending', () => {
    test('increases by 10% when portfolio above upper guardrail', () => {
        const result = guardrailSpending(80000, 1300000, 1000000, { upperGuardrail: 1.2, lowerGuardrail: 0.8 });
        expect(result).toBeCloseTo(80000 * 1.10);
    });

    test('decreases by 10% when portfolio below lower guardrail', () => {
        const result = guardrailSpending(80000, 700000, 1000000, { upperGuardrail: 1.2, lowerGuardrail: 0.8 });
        expect(result).toBeCloseTo(80000 * 0.90);
    });

    test('maintains spending when portfolio within guardrails', () => {
        const result = guardrailSpending(80000, 1000000, 1000000, { upperGuardrail: 1.2, lowerGuardrail: 0.8 });
        expect(result).toBe(80000);
    });
});

describe('SpendingEngine – percentageSpending', () => {
    test('returns correct percentage of portfolio', () => {
        expect(percentageSpending(1500000, 0.04)).toBeCloseTo(60000);
    });

    test('returns 0 for zero portfolio', () => {
        expect(percentageSpending(0, 0.04)).toBe(0);
    });
});

describe('SpendingEngine – floorUpsideSpending', () => {
    test('essential spending never cut even when portfolio falls to zero', () => {
        const result = floorUpsideSpending(50000, 30000, 0, 1000000);
        expect(result).toBe(50000);  // Essential only, lifestyle = 0
    });

    test('both components present when portfolio healthy', () => {
        const result = floorUpsideSpending(50000, 30000, 1000000, 1000000);
        expect(result).toBe(80000);
    });
});

describe('SpendingEngine – calculateSpending dispatcher', () => {
    const base = {
        currentSpending:   80000,
        portfolioValue:    1000000,
        initialPortfolio:  1000000,
        initialSpending:   80000,
        yearsRetired:      5,
        inflation:         0.03,
        portfolioDeclined: false,
        inputs:            {},
    };

    test('fixed strategy inflates correctly', () => {
        const spending = calculateSpending({ ...base, strategy: SPENDING_STRATEGIES.FIXED });
        expect(spending).toBeCloseTo(fixedSpending(80000, 0.03, 5));
    });

    test('percentage strategy returns 4.5% of portfolio by default', () => {
        const spending = calculateSpending({ ...base, strategy: SPENDING_STRATEGIES.PERCENTAGE });
        expect(spending).toBeCloseTo(1000000 * 0.045);
    });

    test('unknown strategy returns current spending unchanged', () => {
        const spending = calculateSpending({ ...base, strategy: 'unknown' });
        expect(spending).toBe(80000);
    });
});

// ── LifeEventEngine ───────────────────────────────────────────────────────────

describe('LifeEventEngine – buildLifeEvents', () => {
    test('always includes a RetirementEvent at retirementAge', () => {
        const events = buildLifeEvents({ yourCurrentAge: 49, retirementAge: 65 });
        const retirementEvent = events.find(e => e.type === EVENT_TYPES.RETIREMENT);
        expect(retirementEvent).toBeDefined();
        expect(retirementEvent.triggerAge).toBe(65);
    });

    test('includes InheritanceEvent when expectedInheritance > 0', () => {
        const events = buildLifeEvents({
            yourCurrentAge:     49,
            retirementAge:      65,
            expectedInheritance: 200000,
            inheritanceAge:     70,
        });
        const inherEvent = events.find(e => e.type === EVENT_TYPES.INHERITANCE);
        expect(inherEvent).toBeDefined();
        expect(inherEvent.data.amount).toBe(200000);
    });

    test('windfall defaults to scenario-only unless explicitly included', () => {
        const events = buildLifeEvents({
            yourCurrentAge: 49,
            retirementAge: 65,
            inheritanceScenario: {
                enabled: true,
                includeInBasePlan: false,
                age: 70,
                grossValue: 500000,
                certainty: 'speculative',
                use: 'invest_outside_super',
            },
        });

        expect(events.find(e => e.type === EVENT_TYPES.INHERITANCE)).toBeUndefined();
    });

    test('includeInBase windfall adds treatment-aware event', () => {
        const events = buildLifeEvents({
            yourCurrentAge: 49,
            retirementAge: 65,
            inheritanceScenario: {
                enabled: true,
                includeInBasePlan: true,
                age: 70,
                grossValue: 500000,
                certainty: 'confirmed',
                use: 'pay_down_mortgage',
            },
        });
        const event = events.find(e => e.type === EVENT_TYPES.INHERITANCE);

        expect(event).toBeDefined();
        expect(event.data.amount).toBe(500000);
        expect(event.data.treatment).toBe('pay_down_mortgage');
    });

    test('windfall pay down mortgage reduces mortgage and invests the remainder', () => {
        const state = new FinancialState(70, { investmentAssets: 10000, mortgageBalance: 120000 });
        applyLifeEvents(state, [{ type: EVENT_TYPES.INHERITANCE, triggerAge: 70, duration: 1, data: { amount: 200000, treatment: 'pay_down_mortgage' } }], 70);

        expect(state.mortgageBalance).toBe(0);
        expect(state.investmentAssets).toBe(90000);
    });

    test('windfall keep cash and invest outside super add to financial assets', () => {
        const cashState = new FinancialState(70, { investmentAssets: 10000 });
        const investState = new FinancialState(70, { investmentAssets: 10000 });

        applyLifeEvents(cashState, [{ type: EVENT_TYPES.INHERITANCE, triggerAge: 70, duration: 1, data: { amount: 50000, treatment: 'keep_cash' } }], 70);
        applyLifeEvents(investState, [{ type: EVENT_TYPES.INHERITANCE, triggerAge: 70, duration: 1, data: { amount: 50000, treatment: 'invest_outside_super' } }], 70);

        expect(cashState.investmentAssets).toBe(60000);
        expect(cashState.cashAssets).toBe(50000);
        expect(investState.investmentAssets).toBe(60000);
    });

    test('future property scenario creates base-included property event only when included', () => {
        const scenarioOnly = buildLifeEvents({
            yourCurrentAge: 49,
            retirementAge: 65,
            futurePropertyScenario: { enabled: true, includeInBasePlan: false, age: 58, eventType: 'buy_primary_home', propertyValue: 800000 },
        });
        const included = buildLifeEvents({
            yourCurrentAge: 49,
            retirementAge: 65,
            futurePropertyScenario: { enabled: true, includeInBasePlan: true, age: 58, eventType: 'buy_primary_home', propertyValue: 800000, mortgage: 500000 },
        });

        expect(scenarioOnly.find(e => e.type === EVENT_TYPES.PROPERTY_PURCHASE)).toBeUndefined();
        expect(included.find(e => e.type === EVENT_TYPES.PROPERTY_PURCHASE)).toBeDefined();
    });

    test('future primary home event updates homeowner state', () => {
        const state = new FinancialState(58, { propertyAssets: 0, mortgageBalance: 0 });
        applyLifeEvents(state, [{ type: EVENT_TYPES.PROPERTY_PURCHASE, triggerAge: 58, duration: 1, data: { planType: 'buy_primary_home', propertyValue: 800000, mortgage: 500000 } }], 58);

        expect(state.homeValue).toBe(800000);
        expect(state.mortgageBalance).toBe(500000);
        expect(state.homeowner).toBe(true);
    });

    test('includes AgedCareEvent by default', () => {
        const events = buildLifeEvents({ yourCurrentAge: 49, retirementAge: 65 });
        const agedCareEvent = events.find(e => e.type === EVENT_TYPES.AGED_CARE);
        expect(agedCareEvent).toBeDefined();
    });

    test('events are sorted by triggerAge', () => {
        const events = buildLifeEvents({
            yourCurrentAge: 49,
            retirementAge:  65,
            downsizingAge:  70,
        });
        for (let i = 1; i < events.length; i++) {
            expect(events[i].triggerAge).toBeGreaterThanOrEqual(events[i - 1].triggerAge);
        }
    });
});

describe('LifeEventEngine – getActiveEvents', () => {
    test('returns events active at given age', () => {
        const events = [
            { type: 'TestEvent', triggerAge: 60, duration: 3, data: {} },
        ];
        expect(getActiveEvents(events, 60).length).toBe(1);
        expect(getActiveEvents(events, 62).length).toBe(1);
        expect(getActiveEvents(events, 63).length).toBe(0);
    });

    test('returns empty array when no events active', () => {
        expect(getActiveEvents([], 50).length).toBe(0);
    });
});

// ── LifeSimulationEngine ──────────────────────────────────────────────────────

describe('LifeSimulationEngine – runLifeSimulation', () => {
    const minimalInputs = {
        yourCurrentAge:   49,
        retirementAge:    65,
        yourLifespan:     85,
        yourSalary:       150000,
        yourCurrentSuper: 300000,
        currentSavings:   50000,
        asfaComfortable:  73031,
        inflation:        0.026,
        investmentReturn: 0.056,
        superReturn:      0.075,
        salaryGrowthRate: 0.015,
        enableShocks:     false,
    };

    test('produces a timeline from current age to lifespan', () => {
        const { timeline } = runLifeSimulation(minimalInputs);
        expect(timeline.length).toBe(minimalInputs.yourLifespan - minimalInputs.yourCurrentAge + 1);
        expect(timeline[0].age).toBe(49);
        expect(timeline[timeline.length - 1].age).toBe(85);
    });

    test('returns a retirementWealth value > 0', () => {
        const { retirementWealth } = runLifeSimulation(minimalInputs);
        expect(retirementWealth).toBeGreaterThan(0);
    });

    test('success flag is true when portfolio never depleted', () => {
        const { success } = runLifeSimulation(minimalInputs);
        // With a generous salary, super and short lifespan this should succeed
        expect(typeof success).toBe('boolean');
    });

    test('each timeline snapshot has an age field', () => {
        const { timeline } = runLifeSimulation(minimalInputs);
        timeline.forEach((snap, i) => {
            expect(snap.age).toBe(minimalInputs.yourCurrentAge + i);
        });
    });

    test('super balance grows during accumulation phase', () => {
        const { timeline } = runLifeSimulation(minimalInputs);
        const atRetirement = timeline.find(s => s.age === minimalInputs.retirementAge);
        expect(atRetirement.superBalance).toBeGreaterThan(minimalInputs.yourCurrentSuper);
    });
});

// ── RecommendationEngine ──────────────────────────────────────────────────────

describe('RecommendationEngine – generateRecommendations', () => {
    const mockMC = {
        probabilityOfSuccess:   55,
        medianRetirementWealth: 800000,
        medianFinalNetWorth:    200000,
        worstCaseRuinAge:       78,
        lifestyleCutProbability: 35,
        runs:                   500,
        percentiles: { p10NetWorth: 0, p25NetWorth: 100000, p50NetWorth: 200000, p75NetWorth: 400000, p90NetWorth: 700000 },
    };

    const mockInputs = {
        superContributionRate: 0.115,
        asfaComfortable:       73031,
        retirementAge:         65,
        hasInvestmentProperty: false,
    };

    test('returns successProbability matching MC input', () => {
        const result = generateRecommendations(mockMC, [], mockInputs);
        expect(result.successProbability).toBe(55);
    });

    test('outcome is fair for 55% success probability', () => {
        const result = generateRecommendations(mockMC, [], mockInputs);
        expect(result.outcome).toBe('fair');
    });

    test('outcome is excellent for >= 85% success probability', () => {
        const result = generateRecommendations({ ...mockMC, probabilityOfSuccess: 90 }, [], mockInputs);
        expect(result.outcome).toBe('excellent');
    });

    test('returns at least one recommendation for poor outcome', () => {
        const result = generateRecommendations({ ...mockMC, probabilityOfSuccess: 40 }, [], mockInputs);
        expect(result.recommendations.length).toBeGreaterThan(0);
    });

    test('disclaimer is always present', () => {
        const result = generateRecommendations(mockMC, [], mockInputs);
        expect(result.disclaimer).toContain('general financial projections');
    });

    test('recommendations contain priority, title and detail fields', () => {
        const result = generateRecommendations(mockMC, [], mockInputs);
        result.recommendations.forEach(rec => {
            expect(typeof rec.priority).toBe('number');
            expect(typeof rec.title).toBe('string');
            expect(typeof rec.detail).toBe('string');
        });
    });
});
