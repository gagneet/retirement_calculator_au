import { ENHANCED_CONFIG } from '../../src/js/config.js';
import {
    OnboardingWizard,
    formatPercentInput,
    getSimpleRetirementTargetBreakdown,
    normalizePercentForEngine,
    parsePercentInput,
} from '../../src/js/onboarding-wizard.js';

function buildWizard() {
    document.body.innerHTML = '<div class="container"></div>';
    return new OnboardingWizard(ENHANCED_CONFIG);
}

describe('simple onboarding percentage helpers', () => {
    test.each([
        [0, '0', 0],
        [1, '1', 0.01],
        [2.57, '2.57', 0.0257],
        [12, '12', 0.12],
        [0.0257, '2.57', 0.0257],
        ['2.57%', '2.57', 0.0257],
    ])('formats and normalizes %p as %s%%', (input, display, engine) => {
        expect(parsePercentInput(input)).not.toBeNull();
        expect(formatPercentInput(input)).toBe(display);
        expect(normalizePercentForEngine(input)).toBeCloseTo(engine);
    });
});

describe('simple onboarding enhanced financial inputs', () => {
    test('renders currency and percentage affixes outside the editable input', () => {
        const wizard = buildWizard();
        const currencyHtml = wizard.createEnhancedInput('finances-super-balance', 0, 'currency');
        const percentHtml = wizard.createEnhancedInput('finances-savings-rate', 0.0257, 'percentage');

        document.body.innerHTML = currencyHtml + percentHtml;

        expect(document.querySelectorAll('.input-with-affix')).toHaveLength(2);
        expect(document.querySelector('#finances-super-balance').value).toBe('0');
        expect(document.querySelector('#finances-super-balance').previousElementSibling.textContent).toBe('$');
        expect(document.querySelector('#finances-savings-rate').value).toBe('2.57');
        expect(document.querySelector('#finances-savings-rate').nextElementSibling.textContent).toBe('%');
    });

    test('preserves zero current super in data, summary inputs, and simple result input', () => {
        const wizard = buildWizard();
        document.body.innerHTML = `
            <input id="finances-super-balance" value="0" />
            <input id="finances-salary" value="100000" />
            <input id="finances-employer-contrib" value="12000" />
            <input id="finances-voluntary-contrib" value="0" />
            <input id="finances-emergency-fund" value="0" />
            <input id="finances-savings-rate" value="0" />
            <input id="finances-shares" value="0" />
            <input id="finances-monthly-investment" value="0" />
            <input id="finances-credit-cards" value="0" />
            <input id="finances-personal-loans" value="0" />
            <input id="goals-income-needed" value="52085" />
            <input id="goals-retirement-age" value="67" />
            <input id="goals-risk-tolerance" value="6" />
        `;

        wizard.updateDataFromForms();
        const results = wizard.calculateBasicRetirementProjection();

        expect(wizard.data.finances.superannuation.currentBalance).toBe(0);
        expect(results.currentSuper).toBe(0);
        expect(wizard.generateReviewStep()).toContain('$0.00');
    });
});

describe('simple onboarding desired income target', () => {
    test('calculates single/couple and premium targets from config', () => {
        const single = getSimpleRetirementTargetBreakdown({
            config: ENHANCED_CONFIG,
            maritalStatus: 'single',
            lifestyleTier: 'comfortable',
        });
        const couplePremium = getSimpleRetirementTargetBreakdown({
            config: ENHANCED_CONFIG,
            maritalStatus: 'married',
            lifestyleTier: 'premium',
        });

        expect(single.finalIncome).toBe(52085);
        expect(couplePremium.premium).toBe(Math.round(73337 * 1.5));
        expect(couplePremium.finalIncome).toBe(couplePremium.premium);
    });

    test('travel and hobbies update desired income in auto mode', () => {
        const wizard = buildWizard();
        document.body.innerHTML = wizard.generateGoalsStep();
        wizard.setupGoalsListeners();

        const income = document.getElementById('goals-income-needed');
        document.getElementById('goals-travel-plans').value = 'extensive';
        document.getElementById('goals-travel-plans').dispatchEvent(new Event('change', { bubbles: true }));
        expect(Number(income.dataset.rawValue)).toBe(62085);

        document.getElementById('goals-hobbies').value = 'active';
        document.getElementById('goals-hobbies').dispatchEvent(new Event('change', { bubbles: true }));
        expect(Number(income.dataset.rawValue)).toBe(67085);
    });

    test('manual desired income override is preserved until user resets suggested target', () => {
        const wizard = buildWizard();
        document.body.innerHTML = wizard.generateGoalsStep();
        wizard.setupGoalsListeners();

        const income = document.getElementById('goals-income-needed');
        income.value = '99000';
        income.dispatchEvent(new Event('input', { bubbles: true }));

        document.getElementById('goals-travel-plans').value = 'extensive';
        document.getElementById('goals-travel-plans').dispatchEvent(new Event('change', { bubbles: true }));
        expect(income.value).toBe('99000');
        expect(income.dataset.incomeMode).toBe('manual');

        document.getElementById('goals-use-suggested-income').click();
        expect(income.dataset.incomeMode).toBe('auto');
        expect(Number(income.dataset.rawValue)).toBe(62085);
    });

    test('relationship status changes desired income while target is automatic', () => {
        const wizard = buildWizard();
        document.body.innerHTML = '<select id="household-marital"><option value="single">single</option><option value="married">married</option></select>'
            + wizard.generateGoalsStep();
        wizard.setupGoalsListeners();

        const income = document.getElementById('goals-income-needed');
        expect(Number(income.dataset.rawValue)).toBe(52085);

        const marital = document.getElementById('household-marital');
        marital.value = 'married';
        marital.dispatchEvent(new Event('change', { bubbles: true }));
        expect(Number(income.dataset.rawValue)).toBe(73337);
    });
});
