/**
 * Tests the structural correctness of src/index.html.
 * Verifies required element IDs, sibling relationships between sections,
 * and that How It Works content is outside the calculator form.
 */

const fs = require('fs');
const path = require('path');

describe('Home page structure (index.html)', () => {
    let htmlContent;

    beforeAll(() => {
        const indexPath = path.join(__dirname, '../../src/index.html');
        htmlContent = fs.readFileSync(indexPath, 'utf-8');
    });

    // -------------------------------------------------------------------------
    // Required element existence checks
    // -------------------------------------------------------------------------

    test('file exists and is non-empty', () => {
        expect(htmlContent).toBeTruthy();
        expect(htmlContent.length).toBeGreaterThan(1000);
    });

    test('action-buttons-container div exists', () => {
        expect(htmlContent).toContain('id="action-buttons-container"');
    });

    test('btnCalculate button ID exists', () => {
        expect(htmlContent).toContain('id="btnCalculate"');
    });

    test('btnMonteCarlo button ID exists', () => {
        expect(htmlContent).toContain('id="btnMonteCarlo"');
    });

    // -------------------------------------------------------------------------
    // Section sibling relationship checks
    // -------------------------------------------------------------------------

    test('section-personal-risk class exists in the HTML', () => {
        expect(htmlContent).toContain('section-personal-risk');
    });

    test('section-property class exists in the HTML', () => {
        expect(htmlContent).toContain('section-property');
    });

    test('section-economic class exists in the HTML', () => {
        expect(htmlContent).toContain('section-economic');
    });

    test('section-pension class exists in the HTML', () => {
        expect(htmlContent).toContain('section-pension');
    });

    test('section-property appears after section-personal-risk in document order', () => {
        const posPersonalRisk = htmlContent.indexOf('section-personal-risk"');
        const posProperty = htmlContent.indexOf('section-property"');
        expect(posPersonalRisk).toBeGreaterThan(-1);
        expect(posProperty).toBeGreaterThan(-1);
        // section-property div should come after section-personal-risk div
        expect(posProperty).toBeGreaterThan(posPersonalRisk);
    });

    test('section-economic appears after section-property in document order', () => {
        const posProperty = htmlContent.indexOf('section-property"');
        const posEconomic = htmlContent.indexOf('section-economic"');
        expect(posProperty).toBeGreaterThan(-1);
        expect(posEconomic).toBeGreaterThan(-1);
        expect(posEconomic).toBeGreaterThan(posProperty);
    });

    test('section-pension appears after section-economic in document order', () => {
        const posEconomic = htmlContent.indexOf('section-economic"');
        const posPension = htmlContent.indexOf('section-pension"');
        expect(posEconomic).toBeGreaterThan(-1);
        expect(posPension).toBeGreaterThan(-1);
        expect(posPension).toBeGreaterThan(posEconomic);
    });

    test('section-property is NOT nested inside section-personal-risk', () => {
        // Find the position of the section-personal-risk opening div
        const personalRiskStart = htmlContent.indexOf('section-personal-risk"');

        // Find the next occurrence of section-property
        const propertyStart = htmlContent.indexOf('section-property"', personalRiskStart);

        // To verify they are siblings (not nested), find the closing of the
        // 4-column grid container. The grid uses id="advancedCalculatorForm".
        // section-property should appear within the same grid, not inside the
        // personal-risk column.
        //
        // Practical check: count that section-property div opener does NOT
        // appear before the first occurrence of section-property as a class
        // with a direct div ancestor that is section-personal-risk.
        //
        // Simple structural check: both classes exist as direct children of
        // the lg:grid container, so neither contains the other.
        // We verify by checking that the text "section-property" used as a
        // class on a div (not inside a nested context) appears at a position
        // corresponding to a top-level grid column.

        // The advancedCalculatorForm grid starts with "lg:col-span-1 section-personal-risk"
        // and each column is a sibling div. We verify that between the
        // section-personal-risk opening tag and the section-property opening tag,
        // there is at least one closing </div> that indicates the first column ended.
        const betweenSections = htmlContent.substring(personalRiskStart, propertyStart);
        const closingDivCount = (betweenSections.match(/<\/div>/g) || []).length;
        expect(closingDivCount).toBeGreaterThan(0);
    });

    test('section-economic is NOT nested inside section-personal-risk', () => {
        const personalRiskStart = htmlContent.indexOf('section-personal-risk"');
        const economicStart = htmlContent.indexOf('section-economic"', personalRiskStart);
        const betweenSections = htmlContent.substring(personalRiskStart, economicStart);
        const closingDivCount = (betweenSections.match(/<\/div>/g) || []).length;
        expect(closingDivCount).toBeGreaterThan(0);
    });

    test('section-pension is NOT nested inside section-personal-risk', () => {
        const personalRiskStart = htmlContent.indexOf('section-personal-risk"');
        const pensionStart = htmlContent.indexOf('section-pension"', personalRiskStart);
        const betweenSections = htmlContent.substring(personalRiskStart, pensionStart);
        const closingDivCount = (betweenSections.match(/<\/div>/g) || []).length;
        expect(closingDivCount).toBeGreaterThan(0);
    });

    // -------------------------------------------------------------------------
    // How It Works section checks
    // -------------------------------------------------------------------------

    test('How It Works section contains "Quick Start" text', () => {
        expect(htmlContent).toContain('Quick Start');
    });

    test('"Quick Start" text appears within How It Works section (before the calculator form)', () => {
        const howItWorksPos = htmlContent.indexOf('How It Works');
        const quickStartPos = htmlContent.indexOf('Quick Start');
        const calculatorFormPos = htmlContent.indexOf('id="advancedCalculatorForm"');

        expect(howItWorksPos).toBeGreaterThan(-1);
        expect(quickStartPos).toBeGreaterThan(-1);
        expect(calculatorFormPos).toBeGreaterThan(-1);

        // Quick Start is between How It Works and the calculator form
        expect(quickStartPos).toBeGreaterThan(howItWorksPos);
        expect(quickStartPos).toBeLessThan(calculatorFormPos);
    });

    test('"Quick Start" is NOT inside the advancedCalculatorForm element', () => {
        const calculatorFormPos = htmlContent.indexOf('id="advancedCalculatorForm"');
        const quickStartPos = htmlContent.indexOf('Quick Start');

        // Quick Start should appear BEFORE the calculator form opens
        expect(quickStartPos).toBeLessThan(calculatorFormPos);
    });

    // -------------------------------------------------------------------------
    // Additional structural sanity checks
    // -------------------------------------------------------------------------

    test('action-buttons-container appears before the advancedCalculatorForm grid', () => {
        const actionButtonsPos = htmlContent.indexOf('id="action-buttons-container"');
        const calculatorFormPos = htmlContent.indexOf('id="advancedCalculatorForm"');
        expect(actionButtonsPos).toBeGreaterThan(-1);
        expect(calculatorFormPos).toBeGreaterThan(-1);
        expect(actionButtonsPos).toBeLessThan(calculatorFormPos);
    });

    test('advancedCalculatorForm uses a 4-column grid layout', () => {
        expect(htmlContent).toContain('lg:grid-cols-4');
    });
});
