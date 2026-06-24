/**
 * property/index.js - Public API for the shared Property & Housing module.
 *
 * Import from this file to access all property engine functionality.
 * Internal helpers are not re-exported to keep the surface area minimal.
 */

// Types and constants
export {
    PROPERTY_USE,
    ACQUISITION_STATUS,
    LOAN_TYPE,
    REPAYMENT_FREQUENCY,
    PROPERTY_POLICY_MODE,
    RETIREMENT_STRATEGY,
    CITY_GROWTH_RATES,
    CITY_RENTAL_YIELDS,
    CITY_RENT_GROWTH,
    TAX_POLICY_DEFAULTS,
    STOCHASTIC_DEFAULTS,
    SELLING_COSTS,
    BUYING_COSTS,
    validatePropertyInput,
} from './propertyTypes.js';

// Cashflow engine
export {
    calcPandIRepayment,
    calcInterestOnlyRepayment,
    amortiseOneYear,
    calcAnnualPropertyCashflow,
    calcSaleProceeds,
    calcIRR,
    calcRealAfterTaxProfit,
} from './propertyCashflow.js';

// Tax policy engine
export {
    calcIncomeTax,
    calcMarginalTaxRate,
    calcNegativeGearingBenefit,
    calcCGT,
    compareCGTPolicies,
    compareNegativeGearing,
    buildEffectivePolicy,
} from './propertyTax.js';

// Monte Carlo engine
export {
    runPropertyMonteCarlo,
    runPropertyDeterministic,
    comparePropertyPoliciesMC,
} from './propertyMonteCarlo.js';

// Reverse solver
export {
    solveRequiredRent,
    solveMaxPurchasePrice,
    calcRequiredDeposit,
    solveRequiredEquity,
    solveOptimalSaleTiming,
    compareRetirementStrategies,
} from './propertyReverseSolver.js';

// Comparison engine
export {
    projectETF,
    projectSuper,
    comparePropertyVsETF,
    comparePropertyVsSuper,
    fullComparisonMatrix,
} from './propertyComparison.js';

// Historical data
export {
    HISTORICAL_CASH_RATES,
    HISTORICAL_MORTGAGE_RATES,
    HISTORICAL_CPI,
    HISTORICAL_PROPERTY_GROWTH,
    HISTORICAL_RENT_GROWTH,
    buildHistoricalAnchorRates,
    estimateCurrentValueFromHistory,
    calcCumulativeCPI,
} from './historicalData.js';
