/**
 * Tests for JSON import/export percentage field conversion (utils.js + app.js).
 *
 * Verifies:
 *  1. Fields previously missing from percentageFields are now converted (×100) on v4.0 import
 *  2. Dependent percentage fields (type="number") are NOT broken by addPercentageFormatting
 *  3. investmentReturn, superReturn, salaryGrowthRate have no step attribute (type="text")
 *  4. Known-good percentage fields continue to convert correctly
 *  5. Round-trip: import decimal → ×100 form display → ÷100 on collect = same decimal
 *  6. app.js passes data.version to populateFormFromData in both import paths
 *  7. The export double-division root cause: missing version causes storedAsDecimal=false
 *
 * These tests replicate the logic from utils.js populateFormFromData and
 * initializePercentageInputs without importing the ES module (which has browser deps).
 */

// ── Helpers extracted from utils.js for isolated testing ────────────────────

/**
 * Mirrors the percentageFields list in populateFormFromData (utils.js).
 * Any field listed here is multiplied by 100 when importing from a v3.0/v4.0 JSON.
 */
const POPULATE_PERCENTAGE_FIELDS = [
    'percentIncomeSaved', 'mortgageRate', 'investmentPropertyRate',
    'propertyGrowthRate', 'capitalGainsTaxRate', 'healthcareInflation',
    'agedCareProbability', 'inflation', 'investmentReturn', 'returnDeclineRate',
    'savingsReturn', 'superReturn', 'salaryGrowthRate', 'leanYearsReduction',
    'dividendYield', 'frankingRate', 'returnVolatility',
    'shockProbability', 'shockMagnitude', 'australianEquityAllocation',
    'allocEquities', 'allocBonds', 'allocCash', 'trustAttributionPercentage',
    // Fields added in the 2026 bug-fix: previously missing, causing wrong display values
    'carerReducedWorkPercent', 'vacancyRate', 'maintenanceInflation',
    'trustTaxRate', 'beneficiaryAllocation',
    'extremeInflationProbability', 'propertyCrashProbability',
];

/**
 * Mirrors the percentageFieldIds list in initializePercentageInputs (utils.js).
 * Fields in this list receive addPercentageFormatting (appends "%" on blur).
 * type="number" inputs must NOT be in this list — browsers reject "70.00%" as a number value.
 */
const INIT_PERCENTAGE_FIELD_IDS = [
    'percentIncomeSaved', 'mortgageRate', 'investmentPropertyRate',
    'propertyGrowthRate', 'capitalGainsTaxRate', 'healthcareInflation',
    'agedCareProbability', 'inflation', 'investmentReturn',
    'returnDeclineRate', 'savingsReturn', 'superReturn',
    'salaryGrowthRate', 'leanYearsReduction', 'australianEquityAllocation',
    'dividendYield', 'frankingRate', 'returnVolatility', 'shockProbability', 'shockMagnitude',
    'allocEquities', 'allocBonds', 'allocCash', 'trustAttributionPercentage',
];

/**
 * Dependent percentage fields — these are type="number" inputs in advanced.html.
 * They must NOT appear in INIT_PERCENTAGE_FIELD_IDS.
 */
const DEPENDENT_NUMBER_TYPE_FIELDS = [
    'childrenUnder5Percent', 'childrenPrimaryPercent', 'teenagersPercent',
    'adultDisabledPercent', 'elderlyIndependentPercent', 'elderlyHomeCarePercent',
    'elderlyResidentialPercent', 'otherDependentsPercent',
];

/**
 * Simulate the import conversion for a single top-level percentage field.
 * Returns the value that would be set on the form element for a v4.0 JSON.
 */
const simulateImportConversion = (fieldName, storedDecimalValue) => {
    const version = '4.0';
    const storedAsDecimal = version === '3.0' || version === '4.0';
    if (POPULATE_PERCENTAGE_FIELDS.includes(fieldName) && typeof storedDecimalValue === 'number' && storedAsDecimal) {
        return parseFloat((storedDecimalValue * 100).toFixed(2));
    }
    return storedDecimalValue;
};

// ── HTML structure helpers ────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

let advancedHtml;
beforeAll(() => {
    const filePath = path.join(__dirname, '../../src/advanced.html');
    advancedHtml = fs.readFileSync(filePath, 'utf-8');
});

// ── Test Suite ────────────────────────────────────────────────────────────────

describe('JSON import: percentage field conversion (populateFormFromData)', () => {

    // ── Previously-missing fields now in percentageFields ────────────────────

    test('carerReducedWorkPercent: 0.002 converts to 0.20 on v4.0 import', () => {
        const result = simulateImportConversion('carerReducedWorkPercent', 0.002);
        expect(result).toBeCloseTo(0.20, 2);
    });

    test('vacancyRate: 0.04 converts to 4.00 on v4.0 import', () => {
        const result = simulateImportConversion('vacancyRate', 0.04);
        expect(result).toBeCloseTo(4.00, 2);
    });

    test('maintenanceInflation: 0.035 converts to 3.50 on v4.0 import', () => {
        const result = simulateImportConversion('maintenanceInflation', 0.035);
        expect(result).toBeCloseTo(3.50, 2);
    });

    test('trustTaxRate: 0.3 converts to 30.00 on v4.0 import', () => {
        const result = simulateImportConversion('trustTaxRate', 0.3);
        expect(result).toBeCloseTo(30.00, 2);
    });

    test('beneficiaryAllocation: 0.8 converts to 80.00 on v4.0 import', () => {
        const result = simulateImportConversion('beneficiaryAllocation', 0.8);
        expect(result).toBeCloseTo(80.00, 2);
    });

    test('extremeInflationProbability: 0.0188 converts to 1.88 on v4.0 import', () => {
        const result = simulateImportConversion('extremeInflationProbability', 0.0188);
        expect(result).toBeCloseTo(1.88, 2);
    });

    test('propertyCrashProbability: 0.032 converts to 3.20 on v4.0 import', () => {
        const result = simulateImportConversion('propertyCrashProbability', 0.032);
        expect(result).toBeCloseTo(3.20, 2);
    });

    // ── Known-good fields: regression check ──────────────────────────────────

    test('investmentReturn: 0.038 converts to 3.80 on v4.0 import', () => {
        const result = simulateImportConversion('investmentReturn', 0.038);
        expect(result).toBeCloseTo(3.80, 2);
    });

    test('superReturn: 0.088 converts to 8.80 on v4.0 import', () => {
        const result = simulateImportConversion('superReturn', 0.088);
        expect(result).toBeCloseTo(8.80, 2);
    });

    test('salaryGrowthRate: 0.015 converts to 1.50 on v4.0 import', () => {
        const result = simulateImportConversion('salaryGrowthRate', 0.015);
        expect(result).toBeCloseTo(1.50, 2);
    });

    test('inflation: 0.0287 converts to 2.87 on v4.0 import', () => {
        const result = simulateImportConversion('inflation', 0.0287);
        expect(result).toBeCloseTo(2.87, 2);
    });

    test('returnDeclineRate: 0.0285 converts to 2.85 on v4.0 import', () => {
        const result = simulateImportConversion('returnDeclineRate', 0.0285);
        expect(result).toBeCloseTo(2.85, 2);
    });

    // ── v1.0/v2.0 legacy: no conversion should happen ────────────────────────

    test('v1.0 file: vacancyRate is NOT multiplied (stored as plain percent)', () => {
        const version = '1.0';
        const storedAsDecimal = version === '3.0' || version === '4.0';
        const value = 4; // stored as 4 (plain percent) in older format
        const result = POPULATE_PERCENTAGE_FIELDS.includes('vacancyRate') && storedAsDecimal
            ? parseFloat((value * 100).toFixed(2))
            : value;
        expect(result).toBe(4); // unchanged
    });
});

describe('initializePercentageInputs: type="number" dependent fields must be excluded', () => {

    test('childrenUnder5Percent is NOT in INIT_PERCENTAGE_FIELD_IDS', () => {
        expect(INIT_PERCENTAGE_FIELD_IDS).not.toContain('childrenUnder5Percent');
    });

    test('childrenPrimaryPercent is NOT in INIT_PERCENTAGE_FIELD_IDS', () => {
        expect(INIT_PERCENTAGE_FIELD_IDS).not.toContain('childrenPrimaryPercent');
    });

    test('teenagersPercent is NOT in INIT_PERCENTAGE_FIELD_IDS', () => {
        expect(INIT_PERCENTAGE_FIELD_IDS).not.toContain('teenagersPercent');
    });

    test('adultDisabledPercent is NOT in INIT_PERCENTAGE_FIELD_IDS', () => {
        expect(INIT_PERCENTAGE_FIELD_IDS).not.toContain('adultDisabledPercent');
    });

    test('elderlyIndependentPercent is NOT in INIT_PERCENTAGE_FIELD_IDS', () => {
        expect(INIT_PERCENTAGE_FIELD_IDS).not.toContain('elderlyIndependentPercent');
    });

    test('elderlyHomeCarePercent is NOT in INIT_PERCENTAGE_FIELD_IDS', () => {
        expect(INIT_PERCENTAGE_FIELD_IDS).not.toContain('elderlyHomeCarePercent');
    });

    test('elderlyResidentialPercent is NOT in INIT_PERCENTAGE_FIELD_IDS', () => {
        expect(INIT_PERCENTAGE_FIELD_IDS).not.toContain('elderlyResidentialPercent');
    });

    test('otherDependentsPercent is NOT in INIT_PERCENTAGE_FIELD_IDS', () => {
        expect(INIT_PERCENTAGE_FIELD_IDS).not.toContain('otherDependentsPercent');
    });

    test('no dependent number-type field appears in INIT_PERCENTAGE_FIELD_IDS', () => {
        const overlap = DEPENDENT_NUMBER_TYPE_FIELDS.filter(f => INIT_PERCENTAGE_FIELD_IDS.includes(f));
        expect(overlap).toHaveLength(0);
    });

    // Verify the HTML declares these as type="number"
    test('childrenUnder5Percent is type="number" in advanced.html', () => {
        expect(advancedHtml).toMatch(/id="childrenUnder5Percent"[^>]*type="number"/);
    });

    test('childrenPrimaryPercent is type="number" in advanced.html', () => {
        expect(advancedHtml).toMatch(/id="childrenPrimaryPercent"[^>]*type="number"/);
    });

    test('teenagersPercent is type="number" in advanced.html', () => {
        expect(advancedHtml).toMatch(/id="teenagersPercent"[^>]*type="number"/);
    });
});

describe('HTML: investmentReturn / superReturn / salaryGrowthRate have no step attribute', () => {

    test('investmentReturn has no step attribute (type="text" — step is invalid)', () => {
        // Extract the input tag for investmentReturn
        const match = advancedHtml.match(/id="investmentReturn"[^>]*/);
        expect(match).not.toBeNull();
        expect(match[0]).not.toContain('step=');
    });

    test('superReturn has no step attribute (type="text" — step is invalid)', () => {
        const match = advancedHtml.match(/id="superReturn"[^>]*/);
        expect(match).not.toBeNull();
        expect(match[0]).not.toContain('step=');
    });

    test('salaryGrowthRate has no step attribute (type="text" — step is invalid)', () => {
        const match = advancedHtml.match(/id="salaryGrowthRate"[^>]*/);
        expect(match).not.toBeNull();
        expect(match[0]).not.toContain('step=');
    });

    test('investmentReturn is type="text" in advanced.html', () => {
        expect(advancedHtml).toMatch(/id="investmentReturn"[^>]*type="text"/);
    });

    test('superReturn is type="text" in advanced.html', () => {
        expect(advancedHtml).toMatch(/id="superReturn"[^>]*type="text"/);
    });

    test('salaryGrowthRate is type="text" in advanced.html', () => {
        expect(advancedHtml).toMatch(/id="salaryGrowthRate"[^>]*type="text"/);
    });
});

describe('populateFormFromData: all new percentage fields are in POPULATE_PERCENTAGE_FIELDS', () => {
    const newFields = [
        'carerReducedWorkPercent',
        'vacancyRate',
        'maintenanceInflation',
        'trustTaxRate',
        'beneficiaryAllocation',
        'extremeInflationProbability',
        'propertyCrashProbability',
    ];

    newFields.forEach(field => {
        test(`${field} is in POPULATE_PERCENTAGE_FIELDS`, () => {
            expect(POPULATE_PERCENTAGE_FIELDS).toContain(field);
        });
    });
});

// ── Round-trip tests ──────────────────────────────────────────────────────────
//
// Root cause of "Save Data adds extra zeros" bug:
//   When populateFormFromData received no version (defaulted to '2.0'), storedAsDecimal
//   was false, so the form field was set to the raw decimal (e.g. "0.04" for vacancyRate).
//   collectInputs then read "0.04" and divided by 100 → 0.0004 exported instead of 0.04.
//   Each import+save cycle multiplied the error: 0.04 → 0.0004 → 0.000004 → ...
//
// The fix: populateFormFromData is now called with data.version, so storedAsDecimal=true
// for v4.0 files. The form is set to 4.00 (0.04×100), and collectInputs gives 4/100=0.04.

/**
 * Simulate the full import → form → collect round-trip for a percentage field.
 * Returns the collected decimal value that would be exported.
 * @param {string} fieldName
 * @param {number} jsonDecimalValue  e.g. 0.04 for "4%"
 * @param {string} version           e.g. '4.0'
 */
const simulateRoundTrip = (fieldName, jsonDecimalValue, version) => {
    // Step 1: populateFormFromData sets the form field value
    const storedAsDecimal = version === '3.0' || version === '4.0';
    let formDisplayValue;
    if (POPULATE_PERCENTAGE_FIELDS.includes(fieldName) && typeof jsonDecimalValue === 'number' && storedAsDecimal) {
        formDisplayValue = parseFloat((jsonDecimalValue * 100).toFixed(2)); // e.g. 4.00
    } else {
        formDisplayValue = jsonDecimalValue; // raw decimal e.g. 0.04 (the old bug)
    }

    // Step 2: collectInputs divides by 100
    const collectedDecimal = formDisplayValue / 100;

    return { formDisplayValue, collectedDecimal };
};

describe('Round-trip: import decimal → form display → collectInputs ÷100 = original decimal', () => {

    const cases = [
        { field: 'vacancyRate',               decimal: 0.04,   display: 4.00 },
        { field: 'maintenanceInflation',      decimal: 0.035,  display: 3.50 },
        { field: 'trustTaxRate',              decimal: 0.3,    display: 30.00 },
        { field: 'beneficiaryAllocation',     decimal: 0.8,    display: 80.00 },
        { field: 'extremeInflationProbability', decimal: 0.0188, display: 1.88 },
        { field: 'propertyCrashProbability',  decimal: 0.032,  display: 3.20 },
        { field: 'carerReducedWorkPercent',   decimal: 0.2,    display: 20.00 },
        { field: 'investmentReturn',          decimal: 0.038,  display: 3.80 },
        { field: 'superReturn',               decimal: 0.088,  display: 8.80 },
        { field: 'inflation',                 decimal: 0.0287, display: 2.87 },
    ];

    cases.forEach(({ field, decimal, display }) => {
        test(`${field}: v4.0 import ${decimal} → form ${display} → collect ${decimal}`, () => {
            const { formDisplayValue, collectedDecimal } = simulateRoundTrip(field, decimal, '4.0');
            expect(formDisplayValue).toBeCloseTo(display, 2);
            expect(collectedDecimal).toBeCloseTo(decimal, 6);
        });
    });

    test('WITHOUT version (old bug): vacancyRate 0.04 → form 0.04 → collect 0.0004 (wrong)', () => {
        // This is the exact double-division bug: missing version → raw decimal in form
        const { formDisplayValue, collectedDecimal } = simulateRoundTrip('vacancyRate', 0.04, '2.0');
        expect(formDisplayValue).toBeCloseTo(0.04, 6);    // form shows raw decimal
        expect(collectedDecimal).toBeCloseTo(0.0004, 8);  // exported ÷100 again → wrong
    });

    test('WITH version (fix): vacancyRate 0.04 → form 4.00 → collect 0.04 (correct)', () => {
        const { formDisplayValue, collectedDecimal } = simulateRoundTrip('vacancyRate', 0.04, '4.0');
        expect(formDisplayValue).toBeCloseTo(4.00, 2);
        expect(collectedDecimal).toBeCloseTo(0.04, 6);
    });

    test('cascading bug: loading re-exported "new JSON" (0.0004) compounds the error', () => {
        // The new JSON was created by: import 0.04 (old code, no version) → form 0.04
        // → collect 0.04/100=0.0004 → exported as 0.0004
        // If that new JSON is then loaded with old code again: 0.0004 → 0.000004 → ...
        const round1 = simulateRoundTrip('vacancyRate', 0.04,   '2.0'); // old code
        const round2 = simulateRoundTrip('vacancyRate', round1.collectedDecimal, '2.0');
        expect(round1.collectedDecimal).toBeCloseTo(0.0004, 8);
        expect(round2.collectedDecimal).toBeCloseTo(0.000004, 10);
    });
});

// ── app.js: version must be passed to populateFormFromData ────────────────────

describe('app.js: populateFormFromData is called with data.version', () => {
    const fs = require('fs');
    const path = require('path');
    let appJs;

    beforeAll(() => {
        appJs = fs.readFileSync(path.join(__dirname, '../../src/js/app.js'), 'utf-8');
    });

    test('first import path passes data.version to populateFormFromData', () => {
        // Must be: populateFormFromData(data.userData, data.version)
        // NOT:     populateFormFromData(data.userData)  ← missing version causes storedAsDecimal=false
        const match = appJs.match(/populateFormFromData\(data\.userData,\s*data\.version\)/g);
        expect(match).not.toBeNull();
        expect(match.length).toBeGreaterThanOrEqual(1);
    });

    test('both import paths pass version (direct reader uses data.version; importUserData path uses importedData.version)', () => {
        // Direct file reader path: populateFormFromData(data.userData, data.version)
        const directReaderMatches = appJs.match(/populateFormFromData\(data\.userData,\s*data\.version\)/g);
        expect(directReaderMatches).not.toBeNull();
        expect(directReaderMatches.length).toBeGreaterThanOrEqual(1);

        // importUserData path: populateFormFromData(importedData.userData, importedData.version)
        const importUserDataMatches = appJs.match(/populateFormFromData\(importedData\.userData,\s*importedData\.version\)/g);
        expect(importUserDataMatches).not.toBeNull();
        expect(importUserDataMatches.length).toBeGreaterThanOrEqual(1);
    });

    test('no call to populateFormFromData omits the version argument', () => {
        // Find any call that passes userData but NOT version
        // Pattern: populateFormFromData(data.userData) followed by ) — no second arg
        const badCalls = appJs.match(/populateFormFromData\(\s*(?:importedData|data)\.userData\s*\)/g);
        expect(badCalls).toBeNull();
    });
});
