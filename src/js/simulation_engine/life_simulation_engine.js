/**
 * life_simulation_engine.js – Year-by-Year Financial Life Simulation
 *
 * Orchestrates all sub-engines to simulate a person's financial life
 * from their current age to their expected lifespan.
 *
 * Each year produces a FinancialState snapshot.  The simulation supports
 * both deterministic (single-run) and stochastic (Monte Carlo) modes.
 *
 * ── Bug fixes applied (enhancements.md) ──────────────────────────────────────
 * 1B. Per-year return sampling: when useStochasticReturns=true each year draws
 *     its own independent return, restoring full sequence-of-return risk.
 * 1C. Partner super contributions tax: previously 0%, now uses calcSuperTax()
 *     (15% base + Division 293 surcharge if applicable).
 * 1D. Correct super withdrawal: pension is subtracted BEFORE computing the
 *     portfolio withdrawal need, not added back afterwards.
 * 1E. Retirement investment income: non-super assets still earn returns in
 *     retirement (dividends, distributions) — was previously omitted.
 * 1G. Aged-care probability: user-supplied value is honoured; derived default
 *     only applied when no explicit value is present.
 * 2.  Division 293 super tax: applied to partner contributions when applicable.
 */

import { FinancialState }                                                       from './financial_state.js';
import { projectSalary, projectPartnerSalary, calcInvestmentIncome }            from './income_engine.js';
import { projectLivingExpenses, projectHealthcareCosts, getAgedCareCost }        from './expense_engine.js';
import { calcIncomeTax, calcSuperTax }                                           from './tax_engine.js';
import { calcSuperContributions, growSuperBalance, calcSuperWithdrawal, getSGRate } from './super_engine.js';
import { growInvestmentAssets }                                                  from './investment_engine.js';
import { growPropertyValue, calcPropertyCashFlow, shouldSellProperty, calcPropertyCGT } from './property_engine.js';
import { calcPensionForYear }                                                    from './pension_engine.js';
import { applyMarketShock, applyPropertyShock, applyInflationShock, simulateAnnualReturn } from './shock_engine.js';
import { buildLifeEvents, applyLifeEvents }                                      from './life_event_engine.js';
import { SPENDING_STRATEGIES, calculateSpending }                                from './spending_engine.js';
import { ENHANCED_CONFIG }                                                       from '../config.js';
import { calculateDeemedIncome }                                                 from '../utils.js';

// ── Default simulation parameters ────────────────────────────────────────────

const SIMULATION_DEFAULTS = {
    yourCurrentAge:     49,
    retirementAge:      65,
    yourLifespan:       90,
    partnerCurrentAge:  0,
    partnerRetirementAge: 65,
    isCouple:           false,
    homeowner:          true,

    yourSalary:              0,
    partnerSalary:           0,
    yourCurrentSuper:        0,
    partnerCurrentSuper:     0,
    currentSavings:          0,
    currentStocks:           0,
    monthlyStockContribution: 0,

    homeValue:              0,
    mortgageBalance:        0,
    monthlyMortgagePayment: 0,
    hasInvestmentProperty:  false,
    investmentPropertyValue: 0,
    investmentPropertyLoan:  0,

    asfaComfortable:     73031,
    inflation:           0.026,
    investmentReturn:    0.056,
    returnVolatility:    0.12,
    superReturn:         0.075,
    savingsReturn:       0.014,
    salaryGrowthRate:    0.015,
    propertyGrowthRate:  0.058,
    superContributionRate: null,   // null = use SG schedule

    enableShocks:         false,
    shockProbability:     0.05,
    shockMagnitude:       -0.25,

    // BUG FIX 1B: when true, each year samples its own return (Monte Carlo mode)
    useStochasticReturns: false,

    spendingStrategy:     SPENDING_STRATEGIES.FIXED,
};

// ── Main simulation function ──────────────────────────────────────────────────

/**
 * Run a single deterministic life simulation.
 *
 * @param {Object} userInputs  – merged user inputs (fields from JSON)
 * @returns {{
 *   timeline: FinancialState[],
 *   retirementWealth: number,
 *   finalNetWorth: number,
 *   ruinAge: number|null,
 *   success: boolean,
 * }}
 */
export const runLifeSimulation = (userInputs) => {
    const inputs = { ...SIMULATION_DEFAULTS, ...userInputs };
    if (userInputs.asfaComfortable == null) {
        inputs.asfaComfortable = inputs.isCouple
            ? ENHANCED_CONFIG.OVERSEAS_RETIREMENT.ASFA_COUPLE_ANNUAL
            : ENHANCED_CONFIG.OVERSEAS_RETIREMENT.ASFA_SINGLE_ANNUAL;
    }

    const {
        yourCurrentAge,
        retirementAge,
        yourLifespan,
        isCouple,
        homeowner,
        asfaComfortable,
        inflation,
        spendingStrategy,
        useStochasticReturns,
        returnVolatility,
    } = inputs;

    // ── Build life events ─────────────────────────────────────────────────────
    const lifeEvents = buildLifeEvents(inputs);

    // ── Initialise financial state ────────────────────────────────────────────
    let salary          = inputs.yourSalary || 0;
    let partnerSalary   = inputs.partnerSalary || 0;
    let superBalance    = inputs.yourCurrentSuper || 0;
    let partnerSuper    = inputs.partnerCurrentSuper || 0;
    let investmentAssets = (inputs.currentSavings || 0) + (inputs.currentStocks || 0);
    let propertyValue   = inputs.hasInvestmentProperty ? (inputs.investmentPropertyValue || 0) : 0;
    let propertyLoan    = inputs.investmentPropertyLoan || 0;
    let mortgageBalance = inputs.mortgageBalance || 0;
    let currentInflation = inflation;

    // Retirement spending initialisation
    const baseRetirementSpending = asfaComfortable;
    let currentSpending   = baseRetirementSpending;
    let initialPortfolio  = 0;
    let retirementWealth  = 0;
    let previousPortfolio = 0;
    let propertyPurchasePrice = propertyValue; // track for CGT

    // Healthcare costs
    let healthcareCosts = inputs.currentHealthcareCosts || 3500;

    // Living expenses (pre-retirement: ~55% of post-tax income as proxy)
    let livingExpenses = inputs.yourSalary > 0
        ? (inputs.yourSalary + (inputs.partnerSalary || 0)) * 0.55
        : asfaComfortable;

    const timeline = [];
    let ruinAge = null;
    const startYear = new Date().getFullYear();

    // ── Year-by-year simulation ───────────────────────────────────────────────
    for (let age = yourCurrentAge; age <= yourLifespan; age++) {
        const yearsElapsed   = age - yourCurrentAge;
        const calendarYear   = startYear + yearsElapsed;
        const partnerAge     = inputs.partnerCurrentAge > 0
            ? inputs.partnerCurrentAge + yearsElapsed
            : 0;

        // Stochastic shocks
        currentInflation = applyInflationShock(inflation, inputs);
        const { newValue: investAfterShock, shockOccurred: investShock } =
            applyMarketShock(investmentAssets, inputs);
        if (investShock) investmentAssets = investAfterShock;
        const { newValue: propAfterShock, shockOccurred: propShock } =
            applyPropertyShock(propertyValue, inputs);
        if (propShock) propertyValue = propAfterShock;

        // Create state snapshot for this year
        const state = new FinancialState(age, {
            superBalance,
            partnerSuperBalance: partnerSuper,
            investmentAssets,
            propertyAssets:    propertyValue,
            mortgageBalance,
            investmentPropertyLoan: propertyLoan,
        });

        // ── Apply life events (inheritance, aged care, education) ─────────────
        applyLifeEvents(state, lifeEvents, age);

        // ── Income ────────────────────────────────────────────────────────────
        salary        = projectSalary(salary, age, inputs);
        partnerSalary = projectPartnerSalary(partnerSalary, partnerAge || age, {
            ...inputs,
            partnerRetirementAge: inputs.partnerRetirementAge || retirementAge,
        });

        state.salary        = salary;
        state.partnerSalary = partnerSalary;

        // Investment income (pre-retirement: dividends)
        const investIncome = calcInvestmentIncome(investmentAssets, inputs);
        state.investmentIncome = investIncome;

        // ── Property cash flow ────────────────────────────────────────────────
        let rentalNetCashFlow = 0;
        if (inputs.hasInvestmentProperty && propertyValue > 0) {
            const { netCashFlow } = calcPropertyCashFlow(
                { ...inputs, investmentPropertyLoan: propertyLoan },
                yearsElapsed,
            );
            rentalNetCashFlow = netCashFlow;
            state.rentalIncome = Math.max(0, netCashFlow);
        }

        // ── Property sale ─────────────────────────────────────────────────────
        if (inputs.hasInvestmentProperty && propertyValue > 0 &&
                shouldSellProperty(age, inputs, yourCurrentAge)) {
            const cgt = calcPropertyCGT(propertyValue, propertyPurchasePrice);
            investmentAssets += propertyValue - propertyLoan - cgt;
            propertyValue = 0;
            propertyLoan  = 0;
            state.propertyAssets = 0;
        }

        // ── Expenses ──────────────────────────────────────────────────────────
        healthcareCosts = projectHealthcareCosts(healthcareCosts, age, inputs);
        state.healthcareCosts = healthcareCosts;

        const agedCare = getAgedCareCost(age, inputs) + (state.agedCareCosts || 0);
        state.agedCareCosts = agedCare;

        const eduCosts = state.educationCosts || 0;

        if (age < retirementAge) {
            // Pre-retirement: project living expenses from income
            livingExpenses = projectLivingExpenses(livingExpenses, age, inputs);
            state.livingExpenses = livingExpenses;
        } else {
            // ── Retirement spending ───────────────────────────────────────────
            const yearsRetired     = age - retirementAge;
            const portfolioValue   = superBalance + partnerSuper + investmentAssets;
            const portfolioDeclined = portfolioValue < previousPortfolio;

            if (yearsRetired === 0) {
                initialPortfolio = portfolioValue;
                retirementWealth = portfolioValue;
                currentSpending  = baseRetirementSpending;
            }

            currentSpending = calculateSpending({
                strategy:          spendingStrategy,
                currentSpending,
                portfolioValue,
                initialPortfolio,
                initialSpending:   baseRetirementSpending,
                yearsRetired,
                inflation:         currentInflation,
                portfolioDeclined,
                inputs,
            });

            state.livingExpenses = currentSpending;
            previousPortfolio    = portfolioValue;
        }

        // ── Tax ───────────────────────────────────────────────────────────────
        // TASK-004: Investment income model fix.
        // growInvestmentAssets() uses investmentReturn as a TOTAL return assumption
        // (capital gains + dividends reinvested).  Including investIncome in taxableIncome
        // here would tax dividends again on top of the total-return model treating them as
        // already in the portfolio — a double-count confirmed by the audit.
        //
        // The correct model: salary + partner salary + rental net cash flow are genuine
        // cash income streams with distinct tax obligations.  investIncome from the total-
        // return portfolio is not a separate cash event; it is already embedded in the
        // return rate.  investIncome is still recorded on state.investmentIncome for display
        // and reporting but is not added to taxableIncome.
        const fyYear        = calendarYear + 1; // FY ending year
        const totalIncome   = salary + partnerSalary + Math.max(0, rentalNetCashFlow);
        const taxableIncome = Math.max(0, totalIncome);
        state.taxableIncome = taxableIncome;
        const incomeTax     = calcIncomeTax(taxableIncome, fyYear, inputs.enableProposedBudget2026 || false);
        state.incomeTax     = incomeTax;

        // ── Super contributions ───────────────────────────────────────────────
        const superContrib = calcSuperContributions(salary, age, inputs, calendarYear);
        // BUG FIX 1C + Phase 2: use calcSuperTax() for both primary and partner so that
        // Division 293 is applied when (salary + concessionalContribs) > $250,000.
        // Previously partner super tax was hardcoded to 0%, overstating partner super.
        const superTax        = calcSuperTax(salary, superContrib);
        const partnerSuperContrib = calcSuperContributions(
            partnerSalary,
            partnerAge || age,
            { ...inputs, retirementAge: inputs.partnerRetirementAge || retirementAge },
            calendarYear
        );
        const partnerSuperTax = calcSuperTax(partnerSalary, partnerSuperContrib);
        state.superContributions = superContrib;

        // ── Pension ───────────────────────────────────────────────────────────
        const assessableAssets = superBalance + partnerSuper + investmentAssets + propertyValue;
        // Use deemed income (deeming rates on financial assets) rather than actual
        // super withdrawals — this matches the Services Australia income test.
        const deemedIncome = calculateDeemedIncome(superBalance + partnerSuper + investmentAssets, isCouple);
        // Employment / business income is assessable; deemed income covers financial assets.
        const assessableIncome = salary + partnerSalary + Math.max(0, rentalNetCashFlow) + deemedIncome;
        const { annualPension } = calcPensionForYear(age, assessableAssets, assessableIncome, isCouple, homeowner);
        state.pensionIncome = annualPension;

        // ── Note on investment income in retirement (BUG FIX 1E — audit-corrected) ────────
        // investIncome (dividends/distributions) is already included in totalIncome above,
        // so it IS taxed in retirement — that is the correct treatment.
        //
        // However, growInvestmentAssets() uses investmentReturn as a TOTAL return assumption
        // (capital gains + dividends reinvested).  If we also credit investIncome as a cash
        // flow that reduces the super withdrawal need, we double-count: the dividend income
        // shrinks the super withdrawal (portfolio stays larger) AND the same dollars grow the
        // portfolio again through the total-return multiplier.
        //
        // Correct model: use total return in growInvestmentAssets (dividends reinvested);
        // investIncome appears in taxableIncome for tax purposes only; it does NOT separately
        // reduce the super withdrawal requirement — the portfolio growth already captures it.
        // Pension income IS deducted (fix 1D) because it is a genuine external cash inflow
        // that the simulator does not model via portfolio return.

        // ── Super withdrawal (retirement) ─────────────────────────────────────
        // BUG FIX 1D: Subtract pension BEFORE computing super withdrawal need.
        // Pension is a genuine external inflow (not captured by total-return growth),
        // so it correctly reduces the drawdown required from the portfolio.
        // investIncome is excluded here (total-return already handles it — see note above).
        let superWithdrawal = 0;
        if (age >= retirementAge) {
            const totalCost = state.livingExpenses + healthcareCosts + agedCare + eduCosts + incomeTax;
            // otherIncome: real cash flows that reduce how much super must be drawn.
            // Partner salary may continue if partner hasn't retired; rental income is real cash.
            // Age Pension is a genuine external payment — always deduct before drawing super.
            const otherIncome = partnerSalary + Math.max(0, rentalNetCashFlow) + annualPension;
            const neededFromSuper = Math.max(0, totalCost - otherIncome);
            superWithdrawal = calcSuperWithdrawal(
                superBalance + partnerSuper,
                age,
                neededFromSuper,
                inputs,
            );
        }
        state.superWithdrawal = superWithdrawal;

        // ── Recalculate mortgage ──────────────────────────────────────────────
        const monthlyMortgage = inputs.monthlyMortgagePayment || 0;
        const annualMortgage  = monthlyMortgage * 12;
        if (mortgageBalance > 0) {
            const interest     = mortgageBalance * (inputs.mortgageRate || 0.054);
            mortgageBalance    = Math.max(0, mortgageBalance + interest - annualMortgage);
        }
        state.mortgagePayment = mortgageBalance > 0 ? annualMortgage : 0;
        state.mortgageBalance = mortgageBalance;

        // ── Update balances ───────────────────────────────────────────────────

        // BUG FIX 1B: Per-year return sampling for Monte Carlo stochastic mode.
        // When useStochasticReturns is true (set by monte_carlo_engine), each year
        // draws its own independent return from the return distribution, restoring
        // full sequence-of-return risk.  In deterministic mode the base rates are used.
        let effectiveSuperReturn        = inputs.superReturn;
        let effectiveInvestmentReturn   = inputs.investmentReturn;
        if (useStochasticReturns && returnVolatility > 0) {
            effectiveSuperReturn      = Math.max(-0.5,
                simulateAnnualReturn(inputs.superReturn,      returnVolatility));
            effectiveInvestmentReturn = Math.max(-0.5,
                simulateAnnualReturn(inputs.investmentReturn, returnVolatility));
        }
        const yearInputs = {
            ...inputs,
            superReturn:      effectiveSuperReturn,
            investmentReturn: effectiveInvestmentReturn,
        };

        // Super growth
        superBalance  = growSuperBalance(superBalance, superContrib, superTax, yearInputs);
        partnerSuper  = growSuperBalance(partnerSuper, partnerSuperContrib, partnerSuperTax, yearInputs);

        // Deduct super withdrawal
        const totalSuperBalance = superBalance + partnerSuper;
        if (superWithdrawal > 0 && totalSuperBalance > 0) {
            const ratio   = superBalance / totalSuperBalance;
            superBalance  = Math.max(0, superBalance  - superWithdrawal * ratio);
            partnerSuper  = Math.max(0, partnerSuper  - superWithdrawal * (1 - ratio));
        }

        // Investment assets: after-tax savings added, spending deducted in retirement
        // BUG FIX 1E continued: in retirement the net contribution also includes
        // investment income (dividends/distributions) which keeps portfolio growth
        // realistic and correctly affects Age Pension means testing.
        const afterTaxIncome   = salary + partnerSalary - incomeTax;
        const monthlySavings   = inputs.monthlyStockContribution || 0;
        const annualNetContrib = age < retirementAge
            ? (afterTaxIncome - livingExpenses - annualMortgage - healthcareCosts - eduCosts
               + monthlySavings * 12 + Math.max(0, rentalNetCashFlow))
            // Retirement: pension + super withdrawal fund spending; investment income
            // stays in the portfolio (grows balance) and is NOT double-counted here
            // because it is already reflected via growInvestmentAssets() return.
            : (annualPension + superWithdrawal - currentSpending - healthcareCosts - agedCare
               - eduCosts + Math.max(0, rentalNetCashFlow));

        investmentAssets = growInvestmentAssets(investmentAssets, annualNetContrib, yearInputs);

        // Property value growth
        if (propertyValue > 0) {
            propertyValue = growPropertyValue(propertyValue, inputs);
        }

        // ── Finalise state snapshot ───────────────────────────────────────────
        state.superBalance          = superBalance;
        state.partnerSuperBalance   = partnerSuper;
        state.investmentAssets      = investmentAssets;
        state.propertyAssets        = propertyValue;
        state.mortgageBalance       = mortgageBalance;
        state.investmentPropertyLoan = propertyLoan;
        state.recalculate();
        timeline.push(state.toSnapshot());

        // Detect ruin (portfolio effectively exhausted)
        if (ruinAge === null && superBalance + partnerSuper + investmentAssets <= 0) {
            ruinAge = age;
        }
    }

    const finalState = timeline[timeline.length - 1];
    return {
        timeline,
        retirementWealth,
        finalNetWorth: finalState ? finalState.netWorth : 0,
        ruinAge,
        success: ruinAge === null,
    };
};

export default { runLifeSimulation };
