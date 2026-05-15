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
            ${buildField('pensionAssetThreshold', 'Pension Asset Threshold', '481500')}
            ${buildField('pensionAssetLimit', 'Pension Asset Limit', '1085000')}
            ${buildField('pensionIncomeThreshold', 'Pension Income Threshold', '380')}
        `;

        const app = createApp();
        app.refreshRetirementIncomeDefault();
        app.refreshPensionFieldDefaults();

        // Expected: single non-homeowner defaults using the verified March 2026 pension rules
        // and the Dec 2025 ASFA comfortable standard for singles.
        // SINGLE_PENSION_MAX=$31,223; SINGLE_ASSET_THRESHOLD_NH=$579,500; limit=$980,000; income=$218
        expect(document.getElementById('asfaComfortable').value).toBe('52085');
        expect(document.getElementById('agePensionMax').value).toBe('31223');
        expect(document.getElementById('pensionAssetThreshold').value).toBe('579500');
        expect(document.getElementById('pensionAssetLimit').value).toBe('980000');
        expect(document.getElementById('pensionIncomeThreshold').value).toBe('218');
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
            ${buildField('pensionAssetThreshold', 'Pension Asset Threshold', '481500')}
            ${buildField('pensionAssetLimit', 'Pension Asset Limit', '1085000')}
            ${buildField('pensionIncomeThreshold', 'Pension Income Threshold', '380')}
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
        expect(document.getElementById('pensionAssetThreshold').value).toBe('$579,500.00');
        expect(document.getElementById('pensionAssetLimit').value).toBe('$980,000.00');
        expect(document.getElementById('pensionIncomeThreshold').value).toBe('$218.00');
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
