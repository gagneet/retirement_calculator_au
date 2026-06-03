/**
 * life_event_engine.js – Life Event Processing
 *
 * Defines and applies discrete life events that modify the financial state at
 * specific trigger ages.  Events are built from user input and resolved each
 * simulation year.
 */

// ── Event type constants ──────────────────────────────────────────────────────

export const EVENT_TYPES = {
    SALARY_CHANGE:       'SalaryChangeEvent',
    CHILD_BIRTH:         'ChildBirthEvent',
    EDUCATION_EXPENSE:   'EducationExpenseEvent',
    PROPERTY_PURCHASE:   'PropertyPurchaseEvent',
    PROPERTY_SALE:       'PropertySaleEvent',
    RETIREMENT:          'RetirementEvent',
    SEMI_RETIREMENT:     'SemiRetirementEvent',
    AGED_CARE:           'AgedCareEvent',
    INHERITANCE:         'InheritanceEvent',
    HEALTH_SHOCK:        'HealthShockEvent',
    INCOME_DROP:         'IncomeDropEvent',
    DOWNSIZING:          'DownsizingEvent',
};

const normaliseWindfallScenario = (inputs) => {
    const scenario = inputs.windfallScenario || inputs.inheritanceScenario;
    if (scenario && scenario.enabled && scenario.includeInBasePlan) {
        return {
            amount: Math.max(0, Number(scenario.amount ?? scenario.grossValue ?? 0)),
            age: Number(scenario.age ?? scenario.expectedAge ?? inputs.inheritanceAge),
            confidence: scenario.confidence || scenario.certainty || "speculative",
            treatment: scenario.treatment || scenario.use || "invest_outside_super",
        };
    }

    if (Number(inputs.expectedInheritance) > 0 && inputs.inheritanceAge !== null && inputs.inheritanceAge !== undefined) {
        return {
            amount: Math.max(0, Number(inputs.expectedInheritance)),
            age: Number(inputs.inheritanceAge),
            confidence: "likely",
            treatment: "invest_outside_super",
        };
    }

    return null;
};

const normaliseFuturePropertyScenario = (inputs) => {
    const scenario = inputs.futurePropertyScenario;
    if (!scenario || !scenario.enabled || !scenario.includeInBasePlan) return null;
    return {
        planType: scenario.planType || scenario.eventType || "none",
        age: Number(scenario.age ?? scenario.expectedAge ?? 0),
        propertyValue: Math.max(0, Number(scenario.propertyValue ?? scenario.value ?? 0)),
        mortgage: Math.max(0, Number(scenario.mortgage ?? scenario.mortgageAmount ?? 0)),
        rentIncome: Math.max(0, Number(scenario.rentIncome ?? scenario.weeklyRentalIncome ?? 0)),
        annualExpenses: Math.max(0, Number(scenario.annualExpenses ?? scenario.annualPropertyExpenses ?? 0)),
        transactionCostPct: Math.max(0, Number(scenario.transactionCostPct ?? 0)),
        newHomeCost: Math.max(0, Number(scenario.newHomeCost ?? 0)),
    };
};

// ── Event builder ─────────────────────────────────────────────────────────────

/**
 * Build the list of life events from user inputs.
 *
 * @param {Object} inputs  – full user inputs object
 * @returns {Array<Object>} sorted list of events with { type, triggerAge, duration, data }
 */
export const buildLifeEvents = (inputs) => {
    const events = [];
    const {
        yourCurrentAge     = 49,
        retirementAge      = 65,
        semiRetirementAge  = null,
        incomeDropAge      = null,
        incomeDropFraction = 0.7,
        childrenBirthYears = [],
        expectedInheritance      = 0,
        inheritanceAge           = null,
        plannedPropertyPurchaseAge = null,
        downsizingAge            = null,
        agedCareStartAge         = 85,
        agedCareDuration         = 3,
        agedCareAnnualCost       = 75000,
    } = inputs;

    // Retirement event
    events.push({
        type:       EVENT_TYPES.RETIREMENT,
        triggerAge: retirementAge,
        duration:   1,
        data:       {},
    });

    // Semi-retirement transition
    if (semiRetirementAge !== null && semiRetirementAge < retirementAge) {
        events.push({
            type:       EVENT_TYPES.SEMI_RETIREMENT,
            triggerAge: semiRetirementAge,
            duration:   retirementAge - semiRetirementAge,
            data:       { incomeFraction: inputs.semiRetirementIncomeFraction || 0.5 },
        });
    }

    // Income-drop event
    if (incomeDropAge !== null) {
        events.push({
            type:       EVENT_TYPES.INCOME_DROP,
            triggerAge: incomeDropAge,
            duration:   1,
            data:       { fraction: incomeDropFraction },
        });
    }

    // Child university costs (approximated from birth years)
    if (Array.isArray(childrenBirthYears)) {
        childrenBirthYears.forEach((birthYear) => {
            const childCurrentAge  = new Date().getFullYear() - birthYear;
            const uniTriggerAge    = yourCurrentAge + Math.max(0, 18 - childCurrentAge);
            if (uniTriggerAge > yourCurrentAge) {
                events.push({
                    type:       EVENT_TYPES.EDUCATION_EXPENSE,
                    triggerAge: uniTriggerAge,
                    duration:   4,  // 4-year degree
                    data:       { annualCost: inputs.educationCostPerChild || 30000 },
                });
            }
        });
    }

    // Simple future windfall / inheritance. Scenario-only entries remain metadata.
    const windfall = normaliseWindfallScenario(inputs);
    if (windfall && windfall.amount > 0 && windfall.age > 0) {
        events.push({
            type:       EVENT_TYPES.INHERITANCE,
            triggerAge: windfall.age,
            duration:   1,
            data:       windfall,
        });
    }

    const futureProperty = normaliseFuturePropertyScenario(inputs);
    if (futureProperty && futureProperty.age > 0) {
        const isSale = futureProperty.planType === "sell_downsize" || futureProperty.planType === "sell_property";
        events.push({
            type:       isSale ? EVENT_TYPES.PROPERTY_SALE : EVENT_TYPES.PROPERTY_PURCHASE,
            triggerAge: futureProperty.age,
            duration:   1,
            data:       futureProperty,
        });
    }

    // Planned property purchase
    if (plannedPropertyPurchaseAge !== null) {
        events.push({
            type:       EVENT_TYPES.PROPERTY_PURCHASE,
            triggerAge: plannedPropertyPurchaseAge,
            duration:   1,
            data:       { value: inputs.investmentPropertyValue || 0 },
        });
    }

    // Downsizing
    if (downsizingAge !== null) {
        events.push({
            type:       EVENT_TYPES.DOWNSIZING,
            triggerAge: downsizingAge,
            duration:   1,
            data:       { proceedsReinvested: true },
        });
    }

    // Aged care
    events.push({
        type:       EVENT_TYPES.AGED_CARE,
        triggerAge: agedCareStartAge,
        duration:   agedCareDuration,
        data:       { annualCost: agedCareAnnualCost },
    });

    // Sort by trigger age
    events.sort((a, b) => a.triggerAge - b.triggerAge);
    return events;
};

/**
 * Return the events active at a given age.
 *
 * @param {Array<Object>} events  – events built by buildLifeEvents
 * @param {number} age
 * @returns {Array<Object>} events active this year
 */
export const getActiveEvents = (events, age) => {
    return events.filter(e => age >= e.triggerAge && age < e.triggerAge + e.duration);
};

/**
 * Apply active life events to the financial state object.
 *
 * Modifies state in place and returns list of event types applied.
 *
 * @param {Object} state        – FinancialState instance (mutated)
 * @param {Array<Object>} events – all events
 * @param {number} age
 * @returns {string[]} event types applied this year
 */
export const applyLifeEvents = (state, events, age) => {
    const active = getActiveEvents(events, age);
    const applied = [];

    active.forEach((event) => {
        switch (event.type) {
            case EVENT_TYPES.INHERITANCE: {
                const amount = Math.max(0, Number(event.data.amount || 0));
                const treatment = event.data.treatment || "invest_outside_super";
                if (treatment === "pay_down_mortgage") {
                    const reduction = Math.min(state.mortgageBalance || 0, amount);
                    state.mortgageBalance = Math.max(0, (state.mortgageBalance || 0) - reduction);
                    state.investmentAssets += amount - reduction;
                } else if (treatment === "buy_home") {
                    state.homeValue = (state.homeValue || 0) + amount;
                    state.homeowner = true;
                } else {
                    state.investmentAssets += amount;
                    if (treatment === "keep_cash") state.cashAssets = (state.cashAssets || 0) + amount;
                }
                applied.push(event.type);
                break;
            }

            case EVENT_TYPES.EDUCATION_EXPENSE:
                // Additional annual education cost
                state.educationCosts += event.data.annualCost || 0;
                applied.push(event.type);
                break;

            case EVENT_TYPES.AGED_CARE:
                // Aged care cost replaces normal healthcare
                state.agedCareCosts = event.data.annualCost || 0;
                applied.push(event.type);
                break;

            case EVENT_TYPES.RETIREMENT:
            case EVENT_TYPES.SEMI_RETIREMENT:
            case EVENT_TYPES.INCOME_DROP:
            case EVENT_TYPES.PROPERTY_PURCHASE: {
                const planType = event.data.planType || "buy_primary_home";
                const value = Math.max(0, Number(event.data.propertyValue || 0));
                const mortgage = Math.max(0, Number(event.data.mortgage || 0));
                if (planType.includes("investment_property")) {
                    state.propertyAssets = Math.max(state.propertyAssets || 0, value);
                    state.investmentPropertyLoan = mortgage;
                    state.futureRentalIncome = Math.max(0, Number(event.data.rentIncome || 0));
                    state.futurePropertyExpenses = Math.max(0, Number(event.data.annualExpenses || 0));
                } else {
                    state.homeValue = value;
                    state.mortgageBalance = mortgage;
                    state.homeowner = true;
                }
                applied.push(event.type);
                break;
            }

            case EVENT_TYPES.PROPERTY_SALE:
            case EVENT_TYPES.DOWNSIZING: {
                const saleValue = Math.max(0, Number(event.data.propertyValue || state.homeValue || state.propertyAssets || 0));
                const remainingMortgage = Math.max(0, Number(event.data.mortgage || state.mortgageBalance || 0));
                const transactionCost = saleValue * Math.max(0, Number(event.data.transactionCostPct || 0));
                const newHomeCost = Math.max(0, Number(event.data.newHomeCost || 0));
                const released = Math.max(0, saleValue - remainingMortgage - transactionCost - newHomeCost);
                state.investmentAssets += released;
                if (newHomeCost > 0) {
                    state.homeValue = newHomeCost;
                    state.mortgageBalance = 0;
                    state.homeowner = true;
                }
                applied.push(event.type);
                break;
            }

            default:
                break;
        }
    });

    state.activeEvents = applied;
    return applied;
};

export default { EVENT_TYPES, buildLifeEvents, getActiveEvents, applyLifeEvents };
