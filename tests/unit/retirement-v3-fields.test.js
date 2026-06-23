import { applyHouseholdVisibility, buildEngineInputs, normalizeImportedUserData } from '../../src/js/retirement-v3.js';

const classicFixture = require('../../docs/v1.json');
const advancedV2Fixture = require('../../docs/v2.json');

describe('retirement-v3 parity field wiring', () => {
    test('passes V3-only modelling fields to the existing simulator input shape', () => {
        const engineInputs = buildEngineInputs({
            household: 'single',
            age: 45,
            retireAge: 65,
            lifespan: 90,
            gender: 'prefer_not_say',
            salary: 120000,
            salaryIncomeMode: 'excluding_super',
            partnerSalary: 0,
            superBal: 250000,
            partnerSuperBal: 0,
            cash: 50000,
            stocks: 40000,
            monthlyStockContrib: 500,
            employerRate: 12,
            desiredIncome: 73000,
            primaryResidenceType: 'own_mortgage',
            homeValue: 850000,
            mortgage: 200000,
            mortgageRate: 6,
            downsizePlan: 'yes',
            downsizeAge: 75,
            downsizeTargetHomeValue: 700000,
            downsizeTransactionCost: 5,
            investmentProperty: true,
            ipType: 'unit',
            ipValue: 700000,
            ipLoan: 400000,
            ipRate: 6.35,
            ipPurchasePrice: 600000,
            ipPurchaseYear: 2020,
            ipLoanType: 'pi',
            ipWeeklyRent: 600,
            ipAnnualExpenses: 10000,
            ipGrowthRate: 4,
            ipVacancyRate: 4,
            capitalGainsTaxRate: 23.5,
            sellPropertyYears: 12,
            maintenanceInflation: 3.5,
            inflation: 2.6,
            invReturn: 6.5,
            superGrowth: 7.5,
            savingsReturn: 4.5,
            salaryGrowthRate: 2,
            returnDeclineRate: 0.03,
            useGlidePath: true,
            glidePathRule: '110minus',
            allocEquities: 60,
            allocBonds: 30,
            allocCash: 10,
            dividendYield: 4,
            frankingRate: 75,
            australianEquityAllocation: 60,
            leanYearsStart: 5,
            leanYearsReduction: 20,
            spendingStrategy: 'go_go_slow_go_no_go',
            extremeInflationProbability: 2,
            propertyCrashProbability: 3,
            globalRiskFactor: 0.4,
        });

        expect(engineInputs.sellPropertyYears).toBe(12);
        expect(engineInputs.maintenanceInflation).toBe(0.035);
        expect(engineInputs.downsizeTransactionCost).toBe(5);
        expect(engineInputs.useGlidePath).toBe(true);
        expect(engineInputs.glidePathRule).toBe('110minus');
        expect(engineInputs.allocEquities).toBe(0.6);
        expect(engineInputs.allocBonds).toBe(0.3);
        expect(engineInputs.allocCash).toBe(0.1);
        expect(engineInputs.dividendYield).toBe(0.04);
        expect(engineInputs.frankingRate).toBe(0.75);
        expect(engineInputs.australianEquityAllocation).toBe(0.6);
        expect(engineInputs.leanYearsStart).toBe(5);
        expect(engineInputs.leanYearsReduction).toBe(0.2);
        expect(engineInputs.enableTieredSpending).toBe(true);
        expect(engineInputs.extremeInflationProbability).toBe(0.02);
        expect(engineInputs.propertyCrashProbability).toBe(0.03);
        expect(engineInputs.globalRiskFactor).toBe(0.4);
    });

    test('normalizes classic and advanced-v2 sample JSON into the v3 input contract', () => {
        const classic = normalizeImportedUserData(classicFixture.userData);
        const advancedV2 = normalizeImportedUserData(advancedV2Fixture.userData);

        expect(classic.household).toBe('couple');
        expect(advancedV2.household).toBe('couple');
        expect(classic.age).toBe(advancedV2.age);
        expect(classic.retireAge).toBe(advancedV2.retireAge);
        expect(classic.lifespan).toBe(advancedV2.lifespan);
        expect(classic.partnerAge).toBe(advancedV2.partnerAge);
        expect(classic.partnerLifespan).toBe(advancedV2.partnerLifespan);

        expect(classic.currentMonthlyLivingCosts).toBe(6618);
        expect(classic.healthcareCost).toBe(5640);
        expect(advancedV2.currentMonthlyLivingCosts).toBe(6618);
        expect(advancedV2.healthcareCost).toBe(5640);

        expect(classic.desiredIncome).toBe(93337);
        expect(advancedV2.desiredIncome).toBe(100838);
        expect(classic.applyMaxContributionBase).toBe(true);
        expect(classic.maxContributionBasePerQuarter).toBe(62500);

        const classicEngineInputs = buildEngineInputs(classic);
        const advancedV2EngineInputs = buildEngineInputs(advancedV2);

        expect(classicEngineInputs.currentMonthlyLivingCosts).toBe(6618);
        expect(classicEngineInputs.currentHealthcareCosts).toBe(5640);
        expect(classicEngineInputs.hasInvestmentProperty).toBe(true);
        expect(classicEngineInputs.investmentPropertyValue).toBe(530000);

        expect(advancedV2EngineInputs.currentMonthlyLivingCosts).toBe(6618);
        expect(advancedV2EngineInputs.currentHealthcareCosts).toBe(5640);
        expect(advancedV2EngineInputs.hasInvestmentProperty).toBe(true);
        expect(advancedV2EngineInputs.investmentPropertyValue).toBe(530000);
    });

    test('single household mode hides and disables partner-only fields until couple is restored', () => {
        document.body.innerHTML = '<div class="segmented" data-bind="household" data-value="single"></div>'
            + '<div id="partnerProfile" data-household="couple"><input id="partnerAge" value="43" /><select id="partnerGender"><option>Female</option></select></div>'
            + '<div id="partnerSalaryRow" data-household="couple"><input id="partnerSalary" value="39000" /></div>'
            + '<div id="partnerAssumptionRow" data-visible-when="couple"><button id="partnerButton" type="button">Partner</button></div>'
            + '<input id="healthcareCost" value="4800" data-auto-default="true" />';

        applyHouseholdVisibility();

        ['partnerProfile', 'partnerSalaryRow', 'partnerAssumptionRow'].forEach((id) => {
            const row = document.getElementById(id);
            expect(row.hidden).toBe(true);
            expect(row.getAttribute('aria-hidden')).toBe('true');
            expect(row.hasAttribute('inert')).toBe(true);
        });
        ['partnerAge', 'partnerGender', 'partnerSalary', 'partnerButton'].forEach((id) => {
            expect(document.getElementById(id).disabled).toBe(true);
        });

        document.querySelector('[data-bind="household"]').dataset.value = 'couple';
        applyHouseholdVisibility();

        ['partnerProfile', 'partnerSalaryRow', 'partnerAssumptionRow'].forEach((id) => {
            const row = document.getElementById(id);
            expect(row.hidden).toBe(false);
            expect(row.getAttribute('aria-hidden')).toBe('false');
            expect(row.hasAttribute('inert')).toBe(false);
        });
        ['partnerAge', 'partnerGender', 'partnerSalary', 'partnerButton'].forEach((id) => {
            expect(document.getElementById(id).disabled).toBe(false);
        });
    });
});
