import RetirementCalculatorApp from '../../src/js/app.js';
import { ENHANCED_CONFIG } from '../../src/js/config.js';

describe('lifespan validation', () => {
    const buildInputs = (overrides = {}) => ({
        yourCurrentAge: 45,
        retirementAge: 67,
        yourLifespan: 90,
        isSingleCalculation: true,
        partnerCurrentAge: 0,
        partnerRetirementAge: 0,
        partnerLifespan: 0,
        yourSalary: 90000,
        yourCurrentSuper: 250000,
        currentSavings: 10000,
        currentStocks: 5000,
        currentMonthlyHousingCosts: 0,
        currentMonthlyLivingCosts: 0,
        homeValue: 0,
        mortgageBalance: 0,
        monthlyMortgagePayment: 0,
        investmentPropertyValue: 0,
        investmentPropertyLoan: 0,
        investmentPropertyPurchasePrice: 0,
        weeklyRentalIncome: 0,
        ...overrides,
    });

    test('allows 0 lifespan for the primary user as run-until-depletion mode', () => {
        const app = Object.create(RetirementCalculatorApp.prototype);
        const errors = app.validateInputs(buildInputs({ yourLifespan: 0 }));

        expect(errors).not.toContain('Expected lifespan must be greater than or equal to retirement age.');
        expect(errors).not.toContain('Expected lifespan must be greater than your current age, unless you enter 0 to model until money runs out.');
    });

    test('rejects a lifespan lower than current age for the primary user', () => {
        const app = Object.create(RetirementCalculatorApp.prototype);
        const errors = app.validateInputs(buildInputs({ yourLifespan: 44 }));

        expect(errors).toContain('Expected lifespan must be greater than your current age, unless you enter 0 to model until money runs out.');
    });

    test('allows 0 lifespan for the partner when partner details are present', () => {
        const app = Object.create(RetirementCalculatorApp.prototype);
        const errors = app.validateInputs(buildInputs({
            isSingleCalculation: false,
            partnerCurrentAge: 43,
            partnerRetirementAge: 65,
            partnerLifespan: 0,
        }));

        expect(errors).not.toContain("Partner's expected lifespan must be greater than their current age, unless you enter 0 to model until money runs out.");
    });

    test("rejects a partner lifespan lower than the partner's current age", () => {
        const app = Object.create(RetirementCalculatorApp.prototype);
        const errors = app.validateInputs(buildInputs({
            isSingleCalculation: false,
            partnerCurrentAge: 43,
            partnerRetirementAge: 65,
            partnerLifespan: 42,
        }));

        expect(errors).toContain("Partner's expected lifespan must be greater than their current age, unless you enter 0 to model until money runs out.");
    });

    test('does not require custom allocation totals when dynamic allocation is enabled', () => {
        const app = Object.create(RetirementCalculatorApp.prototype);
        const errors = app.validateInputs(buildInputs({
            useGlidePath: true,
            allocEquities: 0,
            allocBonds: 0,
            allocCash: 0,
        }));

        expect(errors).not.toContain('Asset allocation sums to 0% — must equal 100%.');
    });
});

describe('dynamic allocation collection', () => {
    test('uses the current glide-path allocation when custom allocation fields are blank', () => {
        document.body.innerHTML = `
            <input id="yourCurrentAge" value="45">
            <input id="useGlidePath" type="checkbox" checked>
            <select id="glidePathRule">
                <option value="110minus" selected>110 - Age</option>
            </select>
            <input id="allocEquities" value="">
            <input id="allocBonds" value="">
            <input id="allocCash" value="">
        `;

        const app = Object.create(RetirementCalculatorApp.prototype);
        app.config = ENHANCED_CONFIG;
        app.simulator = {
            calculateDynamicAllocation: jest.fn(() => ({
                equity: 65,
                bonds: 25,
                cash: 10,
            })),
        };

        const inputs = app.collectInputs();

        expect(app.simulator.calculateDynamicAllocation).toHaveBeenCalledWith(45, '110minus');
        expect(inputs.allocEquities).toBeCloseTo(0.65);
        expect(inputs.allocBonds).toBeCloseTo(0.25);
        expect(inputs.allocCash).toBeCloseTo(0.10);
    });

});

describe('overseas scenario generation', () => {
    test('uses analyzer-backed pension portability for runway data', () => {
        const app = Object.create(RetirementCalculatorApp.prototype);
        app._buildOverseasAnalyzer = jest.fn(() => ({
            analyzeCountry: jest.fn(() => ({
                costOfLiving: { countryAnnual: 45678 },
                agePensionPortability: {
                    pensionCalculation: { overseas: 12345 }
                }
            }))
        }));
        app.getCountryData = jest.fn(() => ({
            displayName: 'Thailand',
            costIndex: 0.55,
            healthcareNotes: 'Good access'
        }));
        app.calculateOverseasImpact = jest.fn(() => 'POSITIVE');
        app.calculateAgePensionImpact = jest.fn(() => 'Portable');
        app.calculateTaxImplications = jest.fn(() => 'Neutral');
        app.calculateSuperStrategyImpact = jest.fn(() => 'NEUTRAL');
        app.calculateSuperTaxImpact = jest.fn(() => 'Tax-free');
        app.calculateResidencyImpact = jest.fn(() => 'NEUTRAL');
        app.calculateResidencyTaxImpact = jest.fn(() => 'Neutral');
        app.calculateReturnFrequencyImpact = jest.fn(() => 'NEUTRAL');
        app.calculateReturnPensionImpact = jest.fn(() => 'Portable');
        app.calculateReturnTaxImpact = jest.fn(() => 'Neutral');
        app.getReturnTimeDescription = jest.fn(() => '3-4 weeks');

        const scenarios = app.generateOverseasScenariosData(
            {
                country: 'thailand',
                departureAge: 67,
                returnFrequency: 'annually',
                maintainResidency: false,
                propertyStrategy: 'keep-personal',
                trustBeneficiaries: 'you-only',
                superAccess: 'pension-mode',
                estimatedLivingCosts: 60000
            },
            {
                yourCurrentAge: 45,
                retirementAge: 67,
                asfaComfortable: 73337,
                partnerCurrentAge: 0,
                hasInvestmentProperty: false,
                yourCurrentSuper: 200000,
                partnerCurrentSuper: 0
            },
            {
                accumulatedSuperBalance: 500000,
                accumulatedSavingsBalance: 100000,
                accumulatedInvestmentPortfolio: 50000,
                totalFinancialAssets: 650000
            }
        );

        expect(app._buildOverseasAnalyzer).toHaveBeenCalled();
        expect(scenarios[0].runwayData).toMatchObject({
            annualCost: 45678,
            portablePension: 12345
        });
    });
});

describe('auto calculation gating', () => {
    test('skips automatic recalculation when validation fails', () => {
        const app = Object.create(RetirementCalculatorApp.prototype);
        app.collectInputs = jest.fn(() => ({ yourCurrentAge: 45 }));
        app.validateInputs = jest.fn(() => ['missing required inputs']);
        app.calculateRetirement = jest.fn();

        expect(app.attemptAutoCalculation()).toBe(false);
        expect(app.calculateRetirement).not.toHaveBeenCalled();
    });
});

describe('saved input loading', () => {
    test('normalizes stale multiplied percentage values from localStorage', () => {
        document.body.innerHTML = '<input id="percentIncomeSaved" value=""><input id="yourSalary" value="">';

        const app = Object.create(RetirementCalculatorApp.prototype);
        app.getAllFormInputs = jest.fn(() => ({
            financial: ['percentIncomeSaved', 'yourSalary']
        }));

        window.localStorage.setItem('retirement-calculator-inputs', JSON.stringify({
            percentIncomeSaved: '900',
            yourSalary: '100000'
        }));

        const loaded = app.loadSavedInputs();

        expect(loaded).toBe(true);
        expect(document.getElementById('percentIncomeSaved').value).toBe('9');
        expect(document.getElementById('yourSalary').value).toBe('100000');
    });
});

describe('depletion summary rendering', () => {
    test('uses open-ended wording and shows depletion age when run-until-depletion mode is used', () => {
        document.body.innerHTML = `
            <div id="summaryResults"></div>
            <div id="finalResult"></div>
            <div id="shortfall-action-panel" class="hidden"></div>
            <ul id="enhancedRecommendationsList"></ul>
        `;

        const app = Object.create(RetirementCalculatorApp.prototype);
        app.generateEnhancedRecommendations = jest.fn(() => []);

        app.displaySummaryResults({
            accumulatedSuperBalance: 300000,
            accumulatedSavingsBalance: 20000,
            accumulatedInvestmentPortfolio: 10000,
            accessibleHomeEquity: 0,
            totalFinancialAssets: 330000,
            finalBalance: 0,
            agedCareCosts: { expectedCost: 0 },
            depletionAge: 87,
            depletionPartnerAge: null,
            depletionPensionIncome: 29000,
            depletionIsCouple: false,
            runUntilDepletionMode: true,
            effectiveYourLifespan: 120,
            effectivePartnerLifespan: 0,
        }, {
            yourCurrentAge: 45,
            retirementAge: 67,
            yourLifespan: 0,
            partnerLifespan: 0,
            yourSalary: 90000,
            yourCurrentSuper: 250000,
            currentSavings: 10000,
            currentStocks: 5000,
            currentMonthlyHousingCosts: 0,
            currentMonthlyLivingCosts: 0,
            homeValue: 0,
            mortgageBalance: 0,
            monthlyMortgagePayment: 0,
            investmentPropertyValue: 0,
            investmentPropertyLoan: 0,
            investmentPropertyPurchasePrice: 0,
            weeklyRentalIncome: 0,
            asfaComfortable: 55000,
            inflation: 0.025,
            superContributionRate: 0.115,
            yourAdditionalSuperContribution: 0,
        });

        expect(document.getElementById('finalResult').textContent).toContain('Open-Ended Projection Exhausts Assets');
        expect(document.getElementById('finalResult').textContent).toContain('around age 87');
        expect(document.getElementById('finalResult').textContent).toContain('With no fixed lifespan entered');
        expect(document.getElementById('finalResult').textContent).toContain('Projected Age Pension at that point: $29,000.00/year');
    });

    test('keeps shortfall wording when a fixed lifespan is provided', () => {
        document.body.innerHTML = `
            <div id="summaryResults"></div>
            <div id="finalResult"></div>
            <div id="shortfall-action-panel" class="hidden"></div>
            <ul id="enhancedRecommendationsList"></ul>
        `;

        const app = Object.create(RetirementCalculatorApp.prototype);
        app.generateEnhancedRecommendations = jest.fn(() => []);

        app.displaySummaryResults({
            accumulatedSuperBalance: 250000,
            accumulatedSavingsBalance: 10000,
            accumulatedInvestmentPortfolio: 5000,
            accessibleHomeEquity: 0,
            totalFinancialAssets: 265000,
            finalBalance: 0,
            agedCareCosts: { expectedCost: 0 },
            depletionAge: 92,
            depletionPartnerAge: null,
            depletionPensionIncome: 25000,
            depletionIsCouple: false,
            runUntilDepletionMode: false,
            effectiveYourLifespan: 95,
            effectivePartnerLifespan: 0,
        }, {
            yourCurrentAge: 45,
            retirementAge: 67,
            yourLifespan: 95,
            partnerLifespan: 0,
            yourSalary: 90000,
            yourCurrentSuper: 250000,
            currentSavings: 10000,
            currentStocks: 5000,
            currentMonthlyHousingCosts: 0,
            currentMonthlyLivingCosts: 0,
            homeValue: 0,
            mortgageBalance: 0,
            monthlyMortgagePayment: 0,
            investmentPropertyValue: 0,
            investmentPropertyLoan: 0,
            investmentPropertyPurchasePrice: 0,
            weeklyRentalIncome: 0,
            asfaComfortable: 55000,
            inflation: 0.025,
            superContributionRate: 0.115,
            yourAdditionalSuperContribution: 0,
        });

        expect(document.getElementById('finalResult').textContent).toContain('Retirement Shortfall Projected');
        expect(document.getElementById('finalResult').textContent).toContain('Modelled assets may be exhausted around age 92 under current assumptions');
    });
});
