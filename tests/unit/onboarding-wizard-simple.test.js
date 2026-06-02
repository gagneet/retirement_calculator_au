import { ENHANCED_CONFIG } from '../../src/js/config.js';
import {
    OnboardingWizard,
    formatPercentInput,
    getSimpleRetirementTargetBreakdown,
    normalizePercentForEngine,
    normalizeSimpleAnnualRate,
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


describe('simple onboarding remaining regression fixes', () => {
    test('annual employer contributions uses affix-safe read-only markup', () => {
        const wizard = buildWizard();
        document.body.innerHTML = wizard.generateFinancesStep();
        const input = document.getElementById('finances-employer-contrib');

        expect(input).not.toBeNull();
        expect(input.readOnly).toBe(true);
        expect(input.closest('.input-with-affix')).not.toBeNull();
        expect(input.previousElementSibling.textContent).toBe('$');
        expect(input.className).not.toMatch(/pl-7/);
    });

    test('economic assumptions render decimal rates as human percentages', () => {
        const wizard = buildWizard();
        document.body.innerHTML = '<div id="enhanced-summary-content"></div>';
        wizard.populateEnhancedSummary();
        const html = document.getElementById('enhanced-summary-content').innerHTML;

        expect(html).toContain('2.50% p.a.');
        expect(html).toContain('8.00% p.a.');
        expect(html).toContain('7.50% p.a.');
        expect(html).toContain('4.50% p.a.');
        expect(html).not.toContain('250.00% p.a.');
        expect(html).not.toContain('800.00% p.a.');
    });

    test.each([
        [0.025, 0.025],
        [0.08, 0.08],
        [0.075, 0.075],
        [0.045, 0.045],
        [2.5, 0.025],
        [8, 0.08],
    ])('normalizes simple annual rate %p to %p', (input, expected) => {
        expect(normalizeSimpleAnnualRate(input, { fallback: 0 })).toBeCloseTo(expected);
    });

    test('renting shows rent field, hides owner fields, and rent flows into expenses', () => {
        const wizard = buildWizard();
        wizard.data.property.homeStatus = 'rent';
        wizard.data.property.monthlyRent = 2400;
        wizard.data.household.livingArrangements.monthlyExpenses = 0;
        document.body.innerHTML = wizard.generatePropertyStep();

        expect(document.getElementById('rent-details').classList.contains('hidden')).toBe(false);
        expect(document.getElementById('monthly-rent-field').classList.contains('hidden')).toBe(false);
        expect(document.getElementById('home-details').classList.contains('hidden')).toBe(true);
        expect(wizard.calculateLivingExpenses(wizard.data)).toBeGreaterThan(2400);

        wizard.setupPropertyListeners();
        document.querySelector('input[name="home-status"][value="family"]').checked = true;
        document.querySelector('input[name="home-status"][value="family"]').dispatchEvent(new Event('change', { bubbles: true }));
        expect(document.getElementById('home-details').classList.contains('hidden')).toBe(true);
        expect(document.getElementById('monthly-board-field').classList.contains('hidden')).toBe(false);
    });

    test('monthly investment contribution feeds investments without also becoming cash savings', () => {
        const wizard = buildWizard();
        wizard.data.household.age = 40;
        wizard.data.goals.retirementAge = 41;
        wizard.data.property.homeStatus = 'rent';
        wizard.data.property.investmentProperty.hasInvestment = false;
        wizard.data.finances.superannuation.currentBalance = 0;
        wizard.data.finances.superannuation.employerContributions = 0;
        wizard.data.finances.superannuation.voluntaryContributions = 0;
        wizard.data.finances.emergencyFund = 0;
        wizard.data.finances.otherInvestments.shares = 0;
        wizard.data.finances.income.salary = 120000;
        wizard.data.finances.savingsRate = 10;
        wizard.data.finances.otherInvestments.monthlyContribution = 1000;

        const both = wizard.calculateBasicRetirementProjection();
        expect(both.futureInvestments).toBeGreaterThanOrEqual(12000);
        expect(both.futureSavings).toBe(0);

        wizard.data.finances.otherInvestments.monthlyContribution = 0;
        const savingsOnly = wizard.calculateBasicRetirementProjection();
        expect(savingsOnly.futureInvestments).toBe(0);
        expect(savingsOnly.futureSavings).toBeGreaterThanOrEqual(12000);
    });

    test('human percentage config values do not produce astronomical longevity output', () => {
        const config = JSON.parse(JSON.stringify(ENHANCED_CONFIG));
        config.DEFAULTS.economic.inflation = 2.5;
        config.DEFAULTS.economic.superReturn = 8;
        config.DEFAULTS.economic.investmentReturn = 7.5;
        config.DEFAULTS.economic.savingsReturn = 4.5;
        const wizard = new OnboardingWizard(config);
        wizard.data.property.homeStatus = 'rent';
        wizard.data.property.investmentProperty.hasInvestment = false;

        const results = wizard.calculateBasicRetirementProjection();
        expect(Number.isFinite(results.totalAssets)).toBe(true);
        expect(results.totalAssets).toBeLessThan(50_000_000);
        expect(results.moneyLongevity.message).not.toContain('117,649,545');
    });

    test('age-120 surplus message is bounded and flags unusually high projections compactly', () => {
        const wizard = buildWizard();
        const normal = wizard.calculateMoneyLongevity(3_000_000, 50_000, 40, null, 67, 'single');
        expect(normal.message).toContain('Projected to last beyond age 120');
        expect(normal.message).not.toContain('Money left over at age 120 will be');

        const unusual = wizard.calculateMoneyLongevity(10_000_000_000_000, 50_000, 40, null, 67, 'single');
        expect(unusual.unusuallyHigh).toBe(true);
        expect(unusual.message).toContain('Projection appears unusually high; check assumptions.');
    });
});
