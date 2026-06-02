/**
 * Tests for src/advanced.html structural correctness and UX fixes.
 *
 * Verifies:
 *  1. Action buttons container is visible by default (no hidden class)
 *  2. Calculator form uses 4-column grid with md breakpoint
 *  3. Dark-mode problem blocks do NOT have dark background overrides
 *  4. All result tabs include a "Back to Action Buttons" link
 *  5. Sections are ordered correctly as siblings in the grid
 */

const fs = require('fs');
const path = require('path');

describe('Advanced page structure (advanced.html)', () => {
    let html;

    beforeAll(() => {
        const filePath = path.join(__dirname, '../../src/advanced.html');
        html = fs.readFileSync(filePath, 'utf-8');
    });

    // -------------------------------------------------------------------------
    // File sanity
    // -------------------------------------------------------------------------

    test('file exists and is non-empty', () => {
        expect(html).toBeTruthy();
        expect(html.length).toBeGreaterThan(10000);
    });

    // -------------------------------------------------------------------------
    // Fix 1: Column layout
    // -------------------------------------------------------------------------

    test('advancedCalculatorForm uses lg:grid-cols-4 for desktop', () => {
        expect(html).toContain('lg:grid-cols-4');
    });

    test('advancedCalculatorForm uses md:grid-cols-2 for tablet breakpoint', () => {
        const formIdx = html.indexOf('id="advancedCalculatorForm"');
        expect(formIdx).toBeGreaterThan(-1);
        // The grid class declaration is near the id attribute
        const nearby = html.substring(Math.max(0, formIdx - 200), formIdx + 200);
        expect(nearby).toContain('md:grid-cols-2');
    });

    test('advancedCalculatorForm has items-start for top alignment', () => {
        const formIdx = html.indexOf('id="advancedCalculatorForm"');
        expect(formIdx).toBeGreaterThan(-1);
        const nearby = html.substring(Math.max(0, formIdx - 200), formIdx + 200);
        expect(nearby).toContain('items-start');
    });

    // -------------------------------------------------------------------------
    // Fix 3: Action buttons visible on page load
    // -------------------------------------------------------------------------

    test('action-buttons-container does NOT have class="hidden" on load', () => {
        // The container div should not start with class="hidden mb-8"
        expect(html).not.toContain('class="hidden mb-8" id="action-buttons-container"');
        expect(html).not.toContain('class="hidden" id="action-buttons-container"');
    });

    test('action-buttons-container is present', () => {
        expect(html).toContain('id="action-buttons-container"');
    });

    test('Advanced Analysis Tools heading is present', () => {
        expect(html).toContain('Advanced Analysis Tools');
    });

    // -------------------------------------------------------------------------
    // Fix 2: Dark text on dark backgrounds removed
    // -------------------------------------------------------------------------

    test('Australian Residency block does not have dark:bg-indigo-900', () => {
        // The block containing Australian Residency should NOT have the dark bg
        const blockStart = html.indexOf('Australian Residency');
        expect(blockStart).toBeGreaterThan(-1);
        // Look for the wrapping div ~200 chars before the heading
        const context = html.substring(Math.max(0, blockStart - 300), blockStart + 100);
        expect(context).not.toContain('dark:bg-indigo-900');
    });

    test('Aged Parents block does not have dark:bg-purple-900', () => {
        const blockStart = html.indexOf('Aged Parents');
        expect(blockStart).toBeGreaterThan(-1);
        const context = html.substring(Math.max(0, blockStart - 300), blockStart + 100);
        expect(context).not.toContain('dark:bg-purple-900');
    });

    test('Reduced Income Scenario block does not have dark:bg-amber-900', () => {
        const blockStart = html.indexOf('Reduced Income Scenario');
        expect(blockStart).toBeGreaterThan(-1);
        const context = html.substring(Math.max(0, blockStart - 300), blockStart + 100);
        expect(context).not.toContain('dark:bg-amber-900');
    });

    // -------------------------------------------------------------------------
    // Fix 4: Back to Action Buttons in all result tabs
    // -------------------------------------------------------------------------

    const tabsRequiringBackButton = [
        'summary-tab',
        'recommendations-tab',
        'suggestions-tab',
        'projection-tab',
        'property-tab',
        'riskAnalysis-tab',
        'charts-tab',
        'optimization-tab',
        'overseas-tab',
        'scenarios-tab',
        'lifeSimulator-tab',
    ];

    tabsRequiringBackButton.forEach((tabId) => {
        test(`${tabId} contains a "Back to Action Buttons" link`, () => {
            const tabStart = html.indexOf(`id="${tabId}"`);
            expect(tabStart).toBeGreaterThan(-1);

            // Find the next tab or end of tabs container
            const nextTabMatch = html.indexOf('class="tab-content', tabStart + 1);
            const tabEnd = nextTabMatch > -1 ? nextTabMatch : html.length;

            const tabContent = html.substring(tabStart, tabEnd);
            expect(tabContent).toContain('Back to Action Buttons');
        });
    });

    // -------------------------------------------------------------------------
    // Section ordering in grid
    // -------------------------------------------------------------------------

    test('four section columns appear in correct order in the grid', () => {
        const pos1 = html.indexOf('section-personal-risk"');
        const pos2 = html.indexOf('section-property"');
        const pos3 = html.indexOf('section-economic"');
        const pos4 = html.indexOf('section-pension"');

        expect(pos1).toBeGreaterThan(-1);
        expect(pos2).toBeGreaterThan(pos1);
        expect(pos3).toBeGreaterThan(pos2);
        expect(pos4).toBeGreaterThan(pos3);
    });

    // -------------------------------------------------------------------------
    // Key button IDs
    // -------------------------------------------------------------------------

    test('btnCalculate exists', () => {
        expect(html).toContain('id="btnCalculate"');
    });

    test('btnMonteCarlo exists', () => {
        expect(html).toContain('id="btnMonteCarlo"');
    });

    test('btnGenerateRecommendations exists', () => {
        expect(html).toContain('id="btnGenerateRecommendations"');
    });

    test('btnRiskProfiling exists', () => {
        expect(html).toContain('id="btnRiskProfiling"');
    });

    test('btnDynamicAllocation exists', () => {
        expect(html).toContain('id="btnDynamicAllocation"');
    });

    test('btnStressTest exists', () => {
        expect(html).toContain('id="btnStressTest"');
    });

    test('life simulator question answer container exists', () => {
        expect(html).toContain('id="simQuestionsSection"');
        expect(html).toContain('id="simQuestionsList"');
    });

    // -------------------------------------------------------------------------
    // Tab structure
    // -------------------------------------------------------------------------

    test('all 12 tab buttons are present', () => {
        expect(html).toContain("showTab('outcome')");
        expect(html).toContain("showTab('summary')");
        expect(html).toContain("showTab('suggestions')");
        expect(html).toContain("showTab('recommendations')");
        expect(html).toContain("showTab('projection')");
        expect(html).toContain("showTab('property')");
        expect(html).toContain("showTab('riskAnalysis')");
        expect(html).toContain("showTab('charts')");
        expect(html).toContain("showTab('optimization')");
        expect(html).toContain("showTab('overseas')");
        expect(html).toContain("showTab('scenarios')");
        expect(html).toContain("showTab('lifeSimulator')");
    });

    test('scrollToActionButtons function is defined', () => {
        expect(html).toContain('function scrollToActionButtons');
    });

    test('salary tooltip example uses corrected take-home wording', () => {
        expect(html).toContain('Example: $100k base salary → employer adds $12k super on top → ~$77k take-home after income tax &amp; Medicare levy.');
    });

    test('sell property timing field includes explanatory tooltip', () => {
        const fieldStart = html.indexOf('for="sellPropertyYears"');
        expect(fieldStart).toBeGreaterThan(-1);
        const context = html.substring(Math.max(0, fieldStart - 350), fieldStart + 1200);
        expect(context).toContain('Sell Property in (Years from now)');
        expect(context).toContain('suggested sale timing');
    });

    test('aged care duration field includes tooltip and helper text', () => {
        const fieldStart = html.indexOf('for="agedCareDuration"');
        expect(fieldStart).toBeGreaterThan(-1);
        const context = html.substring(Math.max(0, fieldStart - 350), fieldStart + 1300);
        expect(context).toContain('Auto-calculated as your expected lifespan minus the aged care start age');
        expect(context).toContain('id="agedCareDurationHint"');
    });

    test('desired retirement income default matches the current configured ASFA couple default', () => {
        expect(html).toContain('id="asfaComfortable"');
        expect(html).toContain('value="73031"');
    });

    test('annual aged care cost default matches the current configured default', () => {
        expect(html).toContain('id="agedCareAnnualCost"');
        expect(html).toContain('value="75000"');
    });

    test('auto-managed contribution and CGT fields use the layout-safe wrapper class', () => {
        expect(html).toContain('<div class="super-strategy-field auto-indicator-field">');
        const cgtFieldStart = html.indexOf('for="capitalGainsTaxRate"');
        expect(cgtFieldStart).toBeGreaterThan(-1);
        const cgtContext = html.substring(Math.max(0, cgtFieldStart - 200), cgtFieldStart + 200);
        expect(cgtContext).toContain('auto-indicator-field');
    });

    test('advanced classic has explicit household status and couple-gated partner sections', () => {
        expect(html).toContain('id="householdStatus"');
        expect(html).toContain('value="single"');
        expect(html).toContain('value="couple" selected');
        expect(html).toContain('class="partner-subsection" data-household="couple"');
        expect(html).toContain('for="partnerAdditionalSuperContribution"');
        expect(html).toContain('data-household="couple"');
    });

    test('home modification section appears once and is the homeowner-gated optional section', () => {
        expect(html).not.toContain('Home Modifications (Aging-in-place)');
        expect(html).toContain('id="homeModificationsSection"');
        expect((html.match(/Home Modifications &amp; Accessibility/g) || [])).toHaveLength(1);
        expect(html).not.toContain('id="homeModificationsCost"');
    });

    test('age-related optional cost grids wrap labels on smaller screens', () => {
        expect(html).toContain('id="annuityFields" style="display:none" class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2"');
        expect(html).toContain('id="tieredSpendingFields" style="display:none" class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2"');
        expect(html).toContain('id="homeModsFields" style="display:none" class="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2"');
    });

    test('future property and inheritance scenario scaffolds are opt-in for base inclusion', () => {
        expect(html).toContain('id="futurePropertyEventsSection"');
        expect(html).toContain('id="futurePropertyIncludeInBase"');
        expect(html).toContain('id="inheritanceScenarioSection"');
        expect(html).toContain('id="inheritanceIncludeInBase"');
        expect(html).toContain('do not improve the base projection unless you explicitly include them in the base plan');
        expect(html).toContain('Australia does not currently have a general inheritance tax');
        expect(html).not.toContain('id="futurePropertyIncludeInBase" checked');
        expect(html).not.toContain('id="inheritanceIncludeInBase" checked');
    });
});


describe('Advanced v2 future scenario scaffolds', () => {
    const fs = require('fs');
    const path = require('path');
    const files = [
        '../../src/advanced-v2.html',
        '../../src/v2/src/advanced-v2.html',
    ];

    test.each(files)('%s includes scenario-only future property and inheritance sections', (relativePath) => {
        const v2Html = fs.readFileSync(path.join(__dirname, relativePath), 'utf-8');
        expect(v2Html).toContain('Future Property Events');
        expect(v2Html).toContain('id="futurePropertyIncludeInBase"');
        expect(v2Html).toContain('Expected Inheritance / Windfall');
        expect(v2Html).toContain('id="inheritanceIncludeInBase"');
        expect(v2Html).toContain('data-scenario-only="true"');
        expect(v2Html).toContain('Australia does not currently have a general inheritance tax');
        expect(v2Html).not.toContain('id="futurePropertyIncludeInBase" type="checkbox" checked');
        expect(v2Html).not.toContain('id="inheritanceIncludeInBase" type="checkbox" checked');
    });
});
