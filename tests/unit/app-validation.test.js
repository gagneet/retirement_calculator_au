import RetirementCalculatorApp from '../../src/js/app.js';

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
