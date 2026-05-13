import PersonalizedQuestionEngine from '../../src/js/personalized-qa-engine.js';

const buildInputs = (overrides = {}) => ({
    yourCurrentAge: 55,
    partnerCurrentAge: 53,
    retirementAge: 67,
    partnerRetirementAge: 65,
    yourLifespan: 92,
    partnerLifespan: 90,
    yourSalary: 120000,
    partnerSalary: 80000,
    yourCurrentSuper: 500000,
    partnerCurrentSuper: 350000,
    currentSavings: 15000,
    currentStocks: 120000,
    homeValue: 900000,
    mortgageBalance: 0,
    mortgageRate: 0.06,
    monthlyMortgagePayment: 0,
    hasInvestmentProperty: false,
    investmentPropertyValue: 0,
    investmentPropertyLoan: 0,
    investmentPropertyRate: 0.06,
    investmentPropertyLoanType: 'pi',
    propertyGrowthRate: 0.04,
    currentHealthcareCosts: 3000,
    healthcareInflation: 0.05,
    agedCareProbability: 0.65,
    agedCareStartAge: 85,
    agedCareDuration: 3,
    agedCareAnnualCost: 75000,
    inflation: 0.025,
    investmentReturn: 0.07,
    returnDeclineRate: 0.01,
    savingsReturn: 0.03,
    superReturn: 0.07,
    employerSuperContributionRate: 0.12,
    superContributionRate: 0.12,
    salaryGrowthRate: 0.03,
    useGlidePath: false,
    glidePathRule: '110',
    allocEquities: 0.6,
    allocBonds: 0.3,
    allocCash: 0.1,
    asfaComfortable: 65000,
    agePensionMax: 0,
    pensionAssetThreshold: 0,
    pensionAssetLimit: 0,
    pensionIncomeThreshold: 0,
    hasTrustAssets: false,
    trustType: 'family',
    trustControlLevel: 'high',
    trustNetAssets: 0,
    trustAttributionPercentage: 1,
    trustAnnualDistributions: 0,
    homeInTrust: false,
    investmentPropertyInTrust: false,
    stocksInTrust: false,
    useDetailedExpenseInputs: false,
    currentMonthlyHousingCosts: 0,
    currentMonthlyLivingCosts: 0,
    percentIncomeSaved: 0.1,
    planToDownsize: false,
    returnVolatility: 0.12,
    enableShocks: false,
    shockProbability: 0,
    shockMagnitude: 0,
    numRuns: 100,
    scenarioMode: 'baseline',
    isSingleCalculation: false,
    creditCardBalance: 0,
    personalLoanBalance: 0,
    carLoanBalance: 0,
    creditCardRate: 0.2,
    personalLoanRate: 0.09,
    carLoanRate: 0.08,
    healthCondition: 'good',
    annualTravelBudget: 5000,
    annualHobbyBudget: 2000,
    ...overrides,
});

const createSimulator = () => ({
    calculatePropertyValue: jest.fn((value, growthRate, years) => value * Math.pow(1 + growthRate, years)),
    calculatePropertyLoanBalance: jest.fn((principal, rate, years) => Math.max(0, principal * Math.pow(1 - rate / 2, years))),
    simulateRetirement: jest.fn((inputs) => {
        const startAge = Math.max(inputs.retirementAge || inputs.yourCurrentAge, inputs.yourCurrentAge);
        const endAge = inputs.yourLifespan || 100;
        const maxSpend = 75000;
        const yearlyData = [];

        for (let age = startAge; age <= endAge; age++) {
            const retiredYears = age - startAge;
            const depleted = (inputs.asfaComfortable || 0) > maxSpend && age >= 100;
            yearlyData.push({
                age,
                partnerAge: inputs.isSingleCalculation ? 0 : (inputs.partnerCurrentAge || 0) + (age - inputs.yourCurrentAge),
                startBalance: Math.max(200000, 900000 - (retiredYears * 12000)),
                endBalance: depleted ? 0 : Math.max(100000, 850000 - (retiredYears * 14000)),
                nonLiquidAssets: 500000,
                propertyIncome: 0,
                pensionIncome: age >= 67 ? (inputs.isSingleCalculation ? 24000 : 42000) : 0,
                depleted,
            });
        }

        return {
            finalBalance: getLast(yearlyData)?.endBalance || 0,
            yearlyData,
            totalFinancialAssets: 1100000,
        };
    }),
});

const createLongevitySimulator = () => ({
    calculatePropertyValue: jest.fn((value, growthRate, years) => value * Math.pow(1 + growthRate, years)),
    calculatePropertyLoanBalance: jest.fn((principal, rate, years) => Math.max(0, principal * Math.pow(1 - rate / 2, years))),
    simulateRetirement: jest.fn((inputs) => {
        const startAge = Math.max(inputs.retirementAge || inputs.yourCurrentAge, inputs.yourCurrentAge);
        const endAge = inputs.yourLifespan || 100;
        const depletionAge = (inputs.asfaComfortable || 0) > 60000 ? 100 : 104;
        const yearlyData = [];

        for (let age = startAge; age <= endAge; age++) {
            const depleted = age >= depletionAge;
            yearlyData.push({
                age,
                partnerAge: inputs.isSingleCalculation ? 0 : (inputs.partnerCurrentAge || 0) + (age - inputs.yourCurrentAge),
                startBalance: depleted ? 25000 : 700000,
                endBalance: depleted ? 0 : 250000,
                nonLiquidAssets: 400000,
                propertyIncome: 0,
                pensionIncome: age >= 67 ? (inputs.isSingleCalculation ? 24000 : 42000) : 0,
                depleted,
            });
        }

        return {
            finalBalance: getLast(yearlyData)?.endBalance || 0,
            yearlyData,
            totalFinancialAssets: 900000,
        };
    }),
});

const createExpenseFloorSimulator = () => ({
    calculatePropertyValue: jest.fn((value, growthRate, years) => value * Math.pow(1 + growthRate, years)),
    calculatePropertyLoanBalance: jest.fn((principal, rate, years) => Math.max(0, principal * Math.pow(1 - rate / 2, years))),
    simulateRetirement: jest.fn((inputs) => {
        const sustained = inputs.useDetailedExpenseInputs === true &&
            (inputs.currentMonthlyHousingCosts || 0) === 0 &&
            (inputs.currentMonthlyLivingCosts || 0) === 0 &&
            (inputs.asfaComfortable || 0) <= 50000;

        return {
            finalBalance: sustained ? 250000 : 0,
            yearlyData: [
                {
                    age: 100,
                    partnerAge: inputs.isSingleCalculation ? 0 : (inputs.partnerCurrentAge || 0) + (100 - inputs.yourCurrentAge),
                    startBalance: sustained ? 350000 : 0,
                    endBalance: sustained ? 250000 : 0,
                    nonLiquidAssets: 0,
                    propertyIncome: 0,
                    pensionIncome: 0,
                    depleted: !sustained,
                },
            ],
            totalFinancialAssets: sustained ? 250000 : 0,
        };
    }),
});

const createAlwaysDepletedSimulator = () => ({
    calculatePropertyValue: jest.fn((value, growthRate, years) => value),
    calculatePropertyLoanBalance: jest.fn((principal) => principal),
    simulateRetirement: jest.fn((inputs) => ({
        finalBalance: 0,
        yearlyData: [
            {
                age: 100,
                partnerAge: inputs.isSingleCalculation ? 0 : (inputs.partnerCurrentAge || 0) + (100 - inputs.yourCurrentAge),
                startBalance: 0,
                endBalance: 0,
                nonLiquidAssets: 0,
                propertyIncome: 0,
                pensionIncome: 0,
                depleted: true,
            },
        ],
        totalFinancialAssets: 0,
    })),
});

const getLast = (items) => items[items.length - 1];

describe('PersonalizedQuestionEngine', () => {
    test('generateAnswers returns the five direct-question cards', () => {
        const simulator = createSimulator();
        const healthcareModeling = {
            calculateAgedCareProjections: jest.fn(() => ({
                homeCare: { expectedCost: 90000 },
                residentialCare: { expectedCost: 240000, estimatedRAD: 520000 },
                probabilityOfNeed: 0.58,
            })),
        };

        const engine = new PersonalizedQuestionEngine(simulator, healthcareModeling);
        const answers = engine.generateAnswers(buildInputs());

        expect(answers).toHaveLength(5);
        expect(answers.map(answer => answer.id)).toEqual([
            'max-withdrawal',
            'age-pension',
            'survivor-scenario',
            'funeral-reserve',
            'housing-care',
        ]);
    });

    test('funeral reserve answer scales for couples', () => {
        const engine = new PersonalizedQuestionEngine(createSimulator(), {
            calculateAgedCareProjections: jest.fn(() => ({
                homeCare: { expectedCost: 90000 },
                residentialCare: { expectedCost: 240000, estimatedRAD: 520000 },
                probabilityOfNeed: 0.58,
            })),
        });

        const answer = engine.answerFuneralReserve(buildInputs({ currentSavings: 10000 }));

        expect(answer.headline).toContain('$40,000.00');
        expect(answer.bullets.join(' ')).toContain('$30,000.00');
    });

    test('housing answer prefers staying home when home care is clearly cheaper', () => {
        const engine = new PersonalizedQuestionEngine(createSimulator(), {
            calculateAgedCareProjections: jest.fn(() => ({
                homeCare: { expectedCost: 85000 },
                residentialCare: { expectedCost: 260000, estimatedRAD: 540000 },
                probabilityOfNeed: 0.42,
            })),
        });

        const answer = engine.answerHousingAndCare(buildInputs());

        expect(answer.headline).toMatch(/staying in the paid-off home/i);
        expect(answer.bullets.join(' ')).toContain('$540,000.00');
    });

    test('maximum withdrawal answer includes the projected run-out age beyond entered lifespan settings', () => {
        const engine = new PersonalizedQuestionEngine(createLongevitySimulator(), {
            calculateAgedCareProjections: jest.fn(() => ({
                homeCare: { expectedCost: 85000 },
                residentialCare: { expectedCost: 260000, estimatedRAD: 540000 },
                probabilityOfNeed: 0.42,
            })),
        });

        const answer = engine.answerMaximumWithdrawal(buildInputs({ yourLifespan: 88, partnerLifespan: 86 }));

        expect(answer.question).toContain('maximum withdrawal');
        expect(answer.bullets.join(' ')).toContain('run out around your age 104 (partner age 102)');
    });

    test('maximum withdrawal search ignores the simulator cash-flow floor', () => {
        const engine = new PersonalizedQuestionEngine(createExpenseFloorSimulator(), {
            calculateAgedCareProjections: jest.fn(() => ({
                homeCare: { expectedCost: 85000 },
                residentialCare: { expectedCost: 260000, estimatedRAD: 540000 },
                probabilityOfNeed: 0.42,
            })),
        });

        const answer = engine.answerMaximumWithdrawal(buildInputs({
            useDetailedExpenseInputs: false,
            currentMonthlyHousingCosts: 3200,
            currentMonthlyLivingCosts: 4800,
        }));

        expect(answer.headline).toContain('$50,000.00');
    });

    test('maximum withdrawal answer uses a warning message instead of $0.00 output', () => {
        const engine = new PersonalizedQuestionEngine(createAlwaysDepletedSimulator(), {
            calculateAgedCareProjections: jest.fn(() => ({
                homeCare: { expectedCost: 85000 },
                residentialCare: { expectedCost: 260000, estimatedRAD: 540000 },
                probabilityOfNeed: 0.42,
            })),
        });

        const answer = engine.answerMaximumWithdrawal(buildInputs());

        expect(answer.headline).toBe('No sustainable real withdrawal identified');
        expect(answer.bullets.join(' ')).toContain('does not support a constant real withdrawal');
    });
});
