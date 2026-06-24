/**
 * historicalData.js - Historical anchor data for property projections.
 *
 * For properties purchased in 2018, 2022, or 2024, use known historical
 * rates up to the current year, then stochastic modelling thereafter.
 *
 * Data sources: RBA, ABS, CoreLogic, Domain (through mid-2026).
 * Values are approximate long-run averages per year, not point-in-time prices.
 */

// ---------------------------------------------------------------------------
// Historical RBA cash rate (annual average, %)
// ---------------------------------------------------------------------------
export const HISTORICAL_CASH_RATES = {
    2015: 2.15,
    2016: 1.75,
    2017: 1.50,
    2018: 1.50,
    2019: 1.22,
    2020: 0.25,
    2021: 0.10,
    2022: 2.85,
    2023: 4.10,
    2024: 4.35,
    2025: 4.10,
    2026: 3.85,
};

// Approximate owner-occupier variable mortgage rate (cash rate + ~2.5-3% spread)
export const HISTORICAL_MORTGAGE_RATES = {
    2015: 5.25,
    2016: 4.90,
    2017: 4.80,
    2018: 5.20,
    2019: 4.75,
    2020: 3.15,
    2021: 2.65,
    2022: 5.40,
    2023: 6.45,
    2024: 6.50,
    2025: 6.20,
    2026: 5.95,
};

// ---------------------------------------------------------------------------
// Historical CPI (annual, %) — ABS Weighted Median CPI
// ---------------------------------------------------------------------------
export const HISTORICAL_CPI = {
    2015: 1.5,
    2016: 1.3,
    2017: 1.9,
    2018: 1.9,
    2019: 1.6,
    2020: 0.9,
    2021: 3.5,
    2022: 7.8,
    2023: 4.1,
    2024: 3.6,
    2025: 3.2,
    2026: 2.8,
};

// ---------------------------------------------------------------------------
// Historical property growth by city (annual, %) — CoreLogic Hedonic
// ---------------------------------------------------------------------------
export const HISTORICAL_PROPERTY_GROWTH = {
    sydney: {
        2015: 13.0, 2016: 9.5,  2017: 5.0,  2018: -5.0,
        2019: -4.5, 2020: 3.0,  2021: 27.0, 2022: -12.0,
        2023: 11.0, 2024: 5.5,  2025: 3.0,  2026: 2.5,
    },
    melbourne: {
        2015: 10.0, 2016: 11.0, 2017: 13.0, 2018: -5.0,
        2019: -5.5, 2020: 1.0,  2021: 20.0, 2022: -9.0,
        2023: 4.0,  2024: 1.0,  2025: 0.5,  2026: 1.5,
    },
    brisbane: {
        2015: 4.5, 2016: 5.0, 2017: 4.5, 2018: 1.5,
        2019: 0.5, 2020: 4.5, 2021: 28.0, 2022: 7.0,
        2023: 15.0, 2024: 14.0, 2025: 8.0, 2026: 5.0,
    },
    perth: {
        2015: -1.5, 2016: -5.0, 2017: -3.0, 2018: -3.5,
        2019: -6.5, 2020: 3.0,  2021: 12.5, 2022: 5.0,
        2023: 15.0, 2024: 24.0, 2025: 12.0, 2026: 6.0,
    },
    adelaide: {
        2015: 3.0, 2016: 5.0, 2017: 5.0, 2018: 2.0,
        2019: 1.0, 2020: 5.0, 2021: 22.0, 2022: 9.0,
        2023: 9.0, 2024: 14.0, 2025: 8.0, 2026: 5.0,
    },
    hobart: {
        2015: 5.0, 2016: 8.0, 2017: 12.0, 2018: 8.0,
        2019: 4.0, 2020: 6.0, 2021: 26.0, 2022: -4.0,
        2023: -1.5, 2024: 1.0, 2025: 2.0, 2026: 2.5,
    },
    darwin: {
        2015: -5.0, 2016: -7.0, 2017: -6.0, 2018: -5.0,
        2019: -5.0, 2020: 4.5,  2021: 12.0, 2022: 3.0,
        2023: 4.0,  2024: 5.0,  2025: 3.5,  2026: 3.0,
    },
    canberra: {
        2015: 7.0, 2016: 8.5, 2017: 9.0, 2018: 3.0,
        2019: 3.5, 2020: 7.0, 2021: 25.0, 2022: -2.0,
        2023: 2.0, 2024: 3.5, 2025: 3.0, 2026: 3.5,
    },
    national: {
        2015: 8.0, 2016: 8.0, 2017: 6.0, 2018: -3.0,
        2019: -4.0, 2020: 3.0, 2021: 22.0, 2022: -5.0,
        2023: 8.0, 2024: 8.0, 2025: 5.0, 2026: 3.5,
    },
};

// ---------------------------------------------------------------------------
// Historical rent growth by city (annual, %)
// ---------------------------------------------------------------------------
export const HISTORICAL_RENT_GROWTH = {
    sydney:    { 2018: 3.0, 2019: 1.5, 2020: -5.0, 2021: 2.5, 2022: 16.0, 2023: 9.5, 2024: 5.5, 2025: 4.0, 2026: 3.5 },
    melbourne: { 2018: 2.0, 2019: 2.0, 2020: -7.5, 2021: 1.0, 2022: 12.0, 2023: 10.0, 2024: 6.0, 2025: 3.5, 2026: 3.0 },
    brisbane:  { 2018: 1.5, 2019: 1.0, 2020: 5.0,  2021: 10.0, 2022: 20.0, 2023: 12.0, 2024: 8.0, 2025: 5.0, 2026: 4.0 },
    perth:     { 2018: -5.0, 2019: -4.0, 2020: 4.5, 2021: 15.0, 2022: 22.0, 2023: 15.0, 2024: 12.0, 2025: 7.0, 2026: 5.0 },
    adelaide:  { 2018: 2.0, 2019: 2.5, 2020: 4.0, 2021: 10.0, 2022: 18.0, 2023: 12.0, 2024: 8.0, 2025: 5.0, 2026: 4.0 },
    national:  { 2018: 1.5, 2019: 1.0, 2020: -1.0, 2021: 5.0, 2022: 15.0, 2023: 10.0, 2024: 7.0, 2025: 4.5, 2026: 3.5 },
};

// ---------------------------------------------------------------------------
// Historical anchor resolver
// ---------------------------------------------------------------------------

const CURRENT_YEAR = 2026;

/**
 * Build a year-by-year rate array for a property, using historical data up to
 * the current year and returning `null` for future years (to be filled by MC).
 *
 * @param {string} city         - City key (e.g. 'sydney', 'national')
 * @param {number} purchaseYear - Year of purchase (e.g. 2022)
 * @param {number} holdYears    - Total projection length
 * @returns {{ growth: (number|null)[], rent: (number|null)[], cpi: (number|null)[], interest: (number|null)[] }}
 */
export function buildHistoricalAnchorRates(city, purchaseYear, holdYears) {
    const growth   = [];
    const rent     = [];
    const cpi      = [];
    const interest = [];

    const cityGrowth = HISTORICAL_PROPERTY_GROWTH[city] ?? HISTORICAL_PROPERTY_GROWTH.national;
    const cityRent   = HISTORICAL_RENT_GROWTH[city]     ?? HISTORICAL_RENT_GROWTH.national;

    for (let y = 0; y < holdYears; y++) {
        const yr = purchaseYear + y;
        if (yr <= CURRENT_YEAR) {
            growth.push((cityGrowth[yr] ?? null) !== null ? (cityGrowth[yr] / 100) : null);
            rent.push(cityRent[yr] != null ? cityRent[yr] / 100 : null);
            cpi.push(HISTORICAL_CPI[yr] != null ? HISTORICAL_CPI[yr] / 100 : null);
            interest.push(HISTORICAL_MORTGAGE_RATES[yr] != null ? HISTORICAL_MORTGAGE_RATES[yr] / 100 : null);
        } else {
            growth.push(null);
            rent.push(null);
            cpi.push(null);
            interest.push(null);
        }
    }

    return { growth, rent, cpi, interest };
}

/**
 * Calculate historical property value from purchase year to current year.
 * Returns the implied current value if not known.
 */
export function estimateCurrentValueFromHistory(purchasePrice, city, purchaseYear) {
    const cityGrowth = HISTORICAL_PROPERTY_GROWTH[city] ?? HISTORICAL_PROPERTY_GROWTH.national;
    let value = purchasePrice;

    for (let yr = purchaseYear + 1; yr <= CURRENT_YEAR; yr++) {
        const rate = cityGrowth[yr];
        if (rate != null) value = value * (1 + rate / 100);
    }

    return Math.round(value);
}

/**
 * Calculate cumulative CPI multiplier from purchaseYear to currentYear.
 * Used for CGT inflation indexation under proposed 2027 rules.
 */
export function calcCumulativeCPI(fromYear, toYear = CURRENT_YEAR) {
    let mult = 1;
    for (let yr = fromYear + 1; yr <= toYear; yr++) {
        const rate = HISTORICAL_CPI[yr];
        if (rate != null) mult *= (1 + rate / 100);
    }
    return mult;
}

export default {
    HISTORICAL_CASH_RATES,
    HISTORICAL_MORTGAGE_RATES,
    HISTORICAL_CPI,
    HISTORICAL_PROPERTY_GROWTH,
    HISTORICAL_RENT_GROWTH,
    buildHistoricalAnchorRates,
    estimateCurrentValueFromHistory,
    calcCumulativeCPI,
};
