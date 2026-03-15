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

    // Inheritance
    if (expectedInheritance > 0 && inheritanceAge !== null) {
        events.push({
            type:       EVENT_TYPES.INHERITANCE,
            triggerAge: inheritanceAge,
            duration:   1,
            data:       { amount: expectedInheritance },
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
            case EVENT_TYPES.INHERITANCE:
                // Lump-sum windfall: add to investment assets
                state.investmentAssets += event.data.amount || 0;
                applied.push(event.type);
                break;

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
            case EVENT_TYPES.PROPERTY_PURCHASE:
            case EVENT_TYPES.DOWNSIZING:
                // These are handled by the respective engines; just flag them
                applied.push(event.type);
                break;

            default:
                break;
        }
    });

    state.activeEvents = applied;
    return applied;
};

export default { EVENT_TYPES, buildLifeEvents, getActiveEvents, applyLifeEvents };
