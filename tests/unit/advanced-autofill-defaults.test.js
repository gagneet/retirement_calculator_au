import RetirementCalculatorApp from '../../src/js/app.js';
import { ENHANCED_CONFIG } from '../../src/js/config.js';
import { initializeCurrencyInputs, initializePercentageInputs } from '../../src/js/utils.js';

const buildField = (id, label, value = '') => `
    <div>
        <label for="${id}">${label}</label>
        <input id="${id}" value="${value}">
    </div>
`;

describe('advanced calculator derived defaults', () => {
    const createApp = () => {
        const app = Object.create(RetirementCalculatorApp.prototype);
        app.config = ENHANCED_CONFIG;
        return app;
    };

    test('does not create a partner scenario when partner age is blank', () => {
        document.body.innerHTML = `
            ${buildField('yourCurrentAge', 'Your Current Age', '50')}
            ${buildField('retirementAge', 'Your Retirement Age', '67')}
            ${buildField('yourLifespan', 'Your Lifespan', '92')}
            ${buildField('partnerCurrentAge', 'Partner Current Age', '')}
            ${buildField('partnerRetirementAge', 'Partner Retirement Age', '')}
            ${buildField('partnerLifespan', 'Partner Lifespan', '')}
            ${buildField('partnerSalary', 'Partner Salary', '85000')}
            ${buildField('partnerCurrentSuper', 'Partner Current Super', '')}
        `;

        const app = createApp();
        app.refreshPartnerFieldDefaults();

        expect(document.getElementById('partnerCurrentAge').value).toBe('');
        expect(document.getElementById('partnerRetirementAge').value).toBe('');
        expect(document.getElementById('partnerLifespan').value).toBe('');
    });

    test('defaults partner retirement and lifespan only after a partner age is explicitly entered', () => {
        document.body.innerHTML = `
            ${buildField('yourCurrentAge', 'Your Current Age', '50')}
            ${buildField('retirementAge', 'Your Retirement Age', '67')}
            ${buildField('yourLifespan', 'Your Lifespan', '92')}
            ${buildField('partnerCurrentAge', 'Partner Current Age', '48')}
            ${buildField('partnerRetirementAge', 'Partner Retirement Age', '')}
            ${buildField('partnerLifespan', 'Partner Lifespan', '')}
        `;

        const app = createApp();
        app.refreshPartnerFieldDefaults();

        expect(document.getElementById('partnerRetirementAge').value).toBe('67');
        expect(document.getElementById('partnerLifespan').value).toBe('92');
        expect(document.querySelector('[data-field-default-badge="partnerRetirementAge"]').textContent).toContain('Defaulted');
    });

    test('lets a user override an auto-filled partner retirement age', () => {
        document.body.innerHTML = `
            ${buildField('yourCurrentAge', 'Your Current Age', '50')}
            ${buildField('retirementAge', 'Your Retirement Age', '67')}
            ${buildField('yourLifespan', 'Your Lifespan', '92')}
            ${buildField('partnerCurrentAge', 'Partner Current Age', '48')}
            ${buildField('partnerRetirementAge', 'Partner Retirement Age', '')}
            ${buildField('partnerLifespan', 'Partner Lifespan', '')}
        `;

        const app = createApp();
        app.setupProjectionDrivenFields();

        const partnerRetirementAge = document.getElementById('partnerRetirementAge');
        expect(partnerRetirementAge.value).toBe('67');

        partnerRetirementAge.value = '68';
        partnerRetirementAge.dispatchEvent(new Event('input', { bubbles: true }));
        partnerRetirementAge.dispatchEvent(new Event('blur', { bubbles: true }));

        expect(partnerRetirementAge.value).toBe('68');
        expect(partnerRetirementAge.dataset.userModified).toBe('true');
    });

    test('defaults Australian residency earning ages from the arrival ages', () => {
        document.body.innerHTML = `
            ${buildField('ageCameToAustralia', 'Your Arrival Age', '27')}
            ${buildField('ageStartedEarningAustralia', 'Your Earning Start Age', '')}
            ${buildField('partnerAgeCameToAustralia', 'Partner Arrival Age', '31')}
            ${buildField('partnerAgeStartedEarningAustralia', 'Partner Earning Start Age', '')}
        `;

        const app = createApp();
        app.refreshResidencyFieldDefaults();

        expect(document.getElementById('ageStartedEarningAustralia').value).toBe('27');
        expect(document.getElementById('partnerAgeStartedEarningAustralia').value).toBe('31');
        expect(document.querySelector('[data-field-default-badge="ageStartedEarningAustralia"]').textContent).toContain('Defaulted');
    });

    test('defaults retirement income and pension settings for a single non-homeowner profile', () => {
        // Initial values use verified March 2026 couple homeowner defaults.
        // refreshPensionFieldDefaults should recognise these as "recognized defaults"
        // (they are in getAutoManagedPensionDefaults()) and update to single non-homeowner values.
        // Verified values from servicesaustralia.gov.au:
        //   Couple homeowner full: $481,500  cutoff: $1,085,000  income threshold: $380/fn
        //   Single non-homeowner full: $579,500  cutoff: $980,000
        document.body.innerHTML = `
            ${buildField('partnerCurrentAge', 'Partner Current Age', '')}
            ${buildField('partnerSalary', 'Partner Salary', '')}
            ${buildField('partnerCurrentSuper', 'Partner Current Super', '')}
            ${buildField('partnerRetirementAge', 'Partner Retirement Age', '')}
            ${buildField('partnerLifespan', 'Partner Lifespan', '')}
            ${buildField('homeValue', 'Home Value', '0')}
            ${buildField('asfaComfortable', 'Desired Retirement Income', '73031')}
            ${buildField('agePensionMax', 'Age Pension Max', '47070')}
            ${buildField('pensionAssetThreshold', 'Pension Asset Threshold', '499000')}
            ${buildField('pensionAssetLimit', 'Pension Asset Limit', '1102500')}
            ${buildField('pensionIncomeThreshold', 'Pension Income Threshold', '396')}
        `;

        const app = createApp();
        app.refreshRetirementIncomeDefault();
        app.refreshPensionFieldDefaults();

        // Expected: single non-homeowner defaults using the verified March 2026 pension rules
        // and the Dec 2025 ASFA comfortable standard for singles.
        // SINGLE_PENSION_MAX=$31,223; SINGLE_ASSET_THRESHOLD_NH=$579,500; limit=$980,000; income=$218
        expect(document.getElementById('asfaComfortable').value).toBe('52085');
        expect(document.getElementById('agePensionMax').value).toBe('31223');
        expect(document.getElementById('pensionAssetThreshold').value).toBe('600000');
        expect(document.getElementById('pensionAssetLimit').value).toBe('1000500');
        expect(document.getElementById('pensionIncomeThreshold').value).toBe('226');
        expect(document.querySelector('[data-field-default-badge="asfaComfortable"]').textContent).toContain('Official default');
    });

    test('keeps symbols on auto-filled official defaults and estimated percentages', () => {
        // Initial values use verified March 2026 couple homeowner defaults.
        document.body.innerHTML = `
            ${buildField('partnerCurrentAge', 'Partner Current Age', '')}
            ${buildField('partnerSalary', 'Partner Salary', '0')}
            ${buildField('partnerCurrentSuper', 'Partner Current Super', '')}
            ${buildField('partnerRetirementAge', 'Partner Retirement Age', '')}
            ${buildField('partnerLifespan', 'Partner Lifespan', '')}
            ${buildField('homeValue', 'Home Value', '0')}
            ${buildField('yourSalary', 'Your Salary', '100000')}
            ${buildField('asfaComfortable', 'Desired Retirement Income', '73031')}
            ${buildField('agePensionMax', 'Age Pension Max', '47070')}
            ${buildField('pensionAssetThreshold', 'Pension Asset Threshold', '499000')}
            ${buildField('pensionAssetLimit', 'Pension Asset Limit', '1102500')}
            ${buildField('pensionIncomeThreshold', 'Pension Income Threshold', '396')}
            ${buildField('capitalGainsTaxRate', 'Capital Gains Tax Rate', '0')}
        `;

        initializeCurrencyInputs();
        initializePercentageInputs();

        const app = createApp();
        app.refreshRetirementIncomeDefault();
        app.refreshPensionFieldDefaults();
        app.refreshCapitalGainsTaxDefault();

        // Values verified March 2026 from Services Australia for Age Pension defaults,
        // plus the Dec 2025 ASFA comfortable standard for a single household.
        expect(document.getElementById('asfaComfortable').value).toBe('$52,085.00');
        expect(document.getElementById('agePensionMax').value).toBe('$31,223.00');
        expect(document.getElementById('pensionAssetThreshold').value).toBe('$600,000.00');
        expect(document.getElementById('pensionAssetLimit').value).toBe('$1,000,500.00');
        expect(document.getElementById('pensionIncomeThreshold').value).toBe('$226.00');
        expect(document.getElementById('capitalGainsTaxRate').value).toBe('15.00%');
    });

    test('keeps a manual CGT override after the field is edited by the user', () => {
        document.body.innerHTML = `
            ${buildField('yourSalary', 'Your Salary', '100000')}
            ${buildField('partnerSalary', 'Partner Salary', '0')}
            ${buildField('capitalGainsTaxRate', 'Capital Gains Tax Rate', '0')}
        `;

        const app = createApp();
        app.refreshCapitalGainsTaxDefault();

        const cgtField = document.getElementById('capitalGainsTaxRate');
        expect(cgtField.value).toBe('15');

        cgtField.value = '18';
        cgtField.dispatchEvent(new Event('input', { bubbles: true }));
        document.getElementById('yourSalary').value = '150000';

        app.refreshCapitalGainsTaxDefault();

        expect(document.getElementById('capitalGainsTaxRate').value).toBe('18');
    });
});


describe('advanced classic single household and late-life defaults', () => {
    const createApp = () => {
        const app = Object.create(RetirementCalculatorApp.prototype);
        app.config = ENHANCED_CONFIG;
        app.simulator = {
            calculateDynamicAllocation: () => ({
                equities: 0.6,
                bonds: 0.3,
                cash: 0.1,
                australianEquities: 0.3,
                internationalEquities: 0.3,
            }),
        };
        return app;
    };

    test('single household hides couple-only fields and restores them when couple is selected', () => {
        document.body.innerHTML = `
            <select id="householdStatus"><option value="single" selected>Single</option><option value="couple">Couple</option></select>
            <div id="partnerSection" data-household="couple"><input id="partnerCurrentAge" value="42"></div>
            <div id="singlePartnerNotice" data-household="single">Partner fields excluded</div>
            <div id="spouseRow" data-visible-when="couple"><input id="spouseContribution" value="3000"></div>
            ${buildField('partnerSalary', 'Partner Salary', '85000')}
            ${buildField('partnerCurrentSuper', 'Partner Super', '120000')}
        `;

        const app = createApp();
        app.updateClassicHouseholdVisibility();
        expect(document.getElementById('singlePartnerNotice').hidden).toBe(false);
        expect(document.getElementById('partnerSection').hidden).toBe(true);
        expect(document.getElementById('spouseRow').hidden).toBe(true);
        expect(document.getElementById('partnerCurrentAge').disabled).toBe(true);
        expect(document.getElementById('partnerSalary').disabled).toBe(true);
        expect(document.getElementById('partnerCurrentSuper').disabled).toBe(true);

        document.getElementById('householdStatus').value = 'couple';
        app.updateClassicHouseholdVisibility();
        expect(document.getElementById('singlePartnerNotice').hidden).toBe(true);
        expect(document.getElementById('partnerSection').hidden).toBe(false);
        expect(document.getElementById('spouseRow').hidden).toBe(false);
        expect(document.getElementById('partnerCurrentAge').disabled).toBe(false);
        expect(document.getElementById('partnerSalary').disabled).toBe(false);
        expect(document.getElementById('partnerCurrentSuper').disabled).toBe(false);
    });

    test('single household excludes loaded partner and spouse values from collected inputs', () => {
        document.body.innerHTML = `
            <select id="householdStatus"><option value="single" selected>Single</option><option value="couple">Couple</option></select>
            ${buildField('yourCurrentAge', 'Age', '50')}
            ${buildField('retirementAge', 'Retirement Age', '67')}
            ${buildField('yourLifespan', 'Lifespan', '92')}
            ${buildField('partnerCurrentAge', 'Partner Age', '45')}
            ${buildField('partnerRetirementAge', 'Partner Retirement', '65')}
            ${buildField('partnerLifespan', 'Partner Lifespan', '95')}
            ${buildField('partnerAgeCameToAustralia', 'Partner Arrival', '30')}
            ${buildField('partnerAgeStartedEarningAustralia', 'Partner Earning', '31')}
            ${buildField('yourSalary', 'Salary', '100000')}
            ${buildField('partnerSalary', 'Partner Salary', '85000')}
            ${buildField('yourCurrentSuper', 'Super', '150000')}
            ${buildField('partnerCurrentSuper', 'Partner Super', '120000')}
            ${buildField('partnerAdditionalSuperContribution', 'Partner Sacrifice', '12000')}
            ${buildField('partnerAnnualNCC', 'Partner NCC', '15000')}
            ${buildField('spouseContribution', 'Spouse', '3000')}
            ${buildField('partnerReducedIncomeAge', 'Partner Reduced Age', '58')}
            ${buildField('partnerReducedIncomeSalary', 'Partner Reduced Salary', '45000')}
            <select id="primaryResidenceType"><option value="renting" selected>Renting</option></select>
        `;

        const app = createApp();
        const inputs = app.collectInputs();
        expect(inputs.partnerCurrentAge).toBe(0);
        expect(inputs.partnerRetirementAge).toBe(0);
        expect(inputs.partnerLifespan).toBe(0);
        expect(inputs.partnerSalary).toBe(0);
        expect(inputs.partnerCurrentSuper).toBe(0);
        expect(inputs.partnerAdditionalSuperContribution).toBe(0);
        expect(inputs.partnerAnnualNCC).toBe(0);
        expect(inputs.spouseContribution).toBe(0);
        expect(inputs.partnerAgeCameToAustralia).toBe(0);
        expect(inputs.partnerAgeStartedEarningAustralia).toBe(0);
        expect(inputs.partnerReducedIncomeAge).toBe(0);
        expect(inputs.partnerReducedIncomeSalary).toBe(0);
    });

    test('aged care duration derives from lifespan minus start age and preserves manual override', () => {
        document.body.innerHTML = `
            ${buildField('yourCurrentAge', 'Age', '50')}
            ${buildField('yourLifespan', 'Lifespan', '92')}
            ${buildField('agedCareStartAge', 'Start', '85')}
            ${buildField('agedCareDuration', 'Duration', '')}
            <p id="agedCareDurationHint"></p>
            <p id="agedCareStartAgeHint"></p>
        `;
        const app = createApp();
        app.syncAgedCareProjectionFields({ force: true });
        expect(document.getElementById('agedCareDuration').value).toBe('7');

        document.getElementById('agedCareDuration').value = '4';
        document.getElementById('agedCareDuration').dataset.userModified = 'true';
        document.getElementById('agedCareDuration').dataset.autoCalculated = 'false';
        document.getElementById('yourLifespan').value = '96';
        app.syncAgedCareProjectionFields();
        expect(document.getElementById('agedCareDuration').value).toBe('4');

        document.getElementById('agedCareDuration').value = '';
        app.syncAgedCareProjectionFields();
        expect(document.getElementById('agedCareDuration').value).toBe('11');
    });

    test('home modifications are excluded for non-homeowners', () => {
        document.body.innerHTML = `
            <select id="primaryResidenceType"><option value="renting" selected>Renting</option></select>
            <input id="enableHomeModifications" type="checkbox" checked>
            ${buildField('homeModificationCost', 'Home Mod Cost', '25000')}
            ${buildField('homeModificationAge', 'Home Mod Age', '75')}
            ${buildField('homeModificationRecurring', 'Home Mod Recurring', '2000')}
        `;
        const app = createApp();
        const inputs = app.collectInputs();
        expect(inputs.homeowner).toBe(false);
        expect(inputs.enableHomeModifications).toBe(false);
        expect(inputs.homeModificationCost).toBe(0);
        expect(inputs.homeModificationAge).toBe(0);
        expect(inputs.homeModificationRecurring).toBe(0);
    });
});
