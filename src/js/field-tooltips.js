// Tooltip copy keyed by input id so both pages can share the same help text,
// even when one page uses `for="id"` labels and the other nests the control
// inside the label itself.
const FIELD_TOOLTIP_DEFINITIONS = {
    age: {
        title: 'Your age',
        body: 'Your current age drives super access timing, pension eligibility milestones, and how many years the model has to build or spend your assets.',
    },
    retireAge: {
        title: 'Retirement age',
        body: 'This is the age when earned income is assumed to stop or step down materially. Retiring earlier means fewer contribution years and a longer drawdown period.',
    },
    lifespan: {
        title: 'Plan to age',
        body: 'Use a conservative planning age so the projection allows for longevity risk, late-life healthcare, and aged-care costs.',
    },
    ageStartedEarningAU: {
        title: 'Age you first earned in AU',
        body: 'Used to estimate when Australian wages and super contributions started. Leave 0 only if your Australian work history effectively covers your full working life.',
    },
    partnerAge: {
        title: 'Partner age',
        body: 'Your partner\'s age affects household timing, pension eligibility as a couple, and how long joint assets may need to last.',
    },
    partnerRetireAge: {
        title: 'Partner retirement age',
        body: 'Sets when your partner\'s employment income is assumed to stop. Different retirement ages can materially change cash flow in the transition years.',
    },
    partnerLifespan: {
        title: 'Partner plan to age',
        body: 'Use a planning age that gives enough buffer for joint spending needs and the risk that one partner lives significantly longer.',
    },
    partnerGender: {
        title: 'Partner gender',
        body: 'Used only when longevity sampling is enabled so the model can apply the relevant Australian mortality distribution.',
    },
    partnerAgeCameToAU: {
        title: 'Partner age came to AU',
        body: 'Used for your partner\'s Australian Working Life Residence calculation, which can reduce Age Pension portability or pro-rata entitlements.',
    },
    partnerAgeStartedEarningAU: {
        title: 'Partner age first earned in AU',
        body: 'Helps estimate when your partner began Australian income and super accumulation. Leave blank or 0 only if it matches their full local working life.',
    },
    riskTolerance: {
        title: 'Risk tolerance',
        body: 'A higher score assumes you are more comfortable with short-term volatility in exchange for higher long-run return potential.',
    },
    riskReactionDrop: {
        title: 'Reaction to a 20% portfolio fall',
        body: 'This behavioural input helps the risk engine separate stated risk appetite from likely real-world behaviour during downturns.',
    },
    lossReaction: {
        title: 'Reaction to a 20% portfolio fall',
        body: 'This behavioural input helps the risk engine separate stated risk appetite from likely real-world behaviour during downturns.',
    },
    investmentExperience: {
        title: 'Investment experience',
        body: 'Longer experience usually supports a higher practical tolerance for volatility because you have seen more market cycles.',
    },
    marketKnowledge: {
        title: 'Market knowledge',
        body: 'This helps calibrate whether a growth-oriented allocation is likely to remain comfortable when markets are noisy or falling.',
    },
    marketUnderstanding: {
        title: 'Market understanding',
        body: 'This helps calibrate whether a growth-oriented allocation is likely to remain comfortable when markets are noisy or falling.',
    },
    volatilityComfort: {
        title: 'Volatility comfort',
        body: 'Choose the annual swing you could tolerate without abandoning the plan. Higher comfort generally supports a higher-growth portfolio.',
    },
    emergencyFund: {
        title: 'Emergency fund',
        body: 'A stronger cash buffer improves risk capacity because unexpected expenses are less likely to force asset sales at bad times.',
    },
    highInterestDebt: {
        title: 'High-interest debt',
        body: 'Expensive debt reduces resilience and can be a higher-priority use of cash than extra investing or super contributions.',
    },
    salary: {
        title: 'Your base salary',
        body: 'Used for income tax, super guarantee, salary-sacrifice capacity, and pre-retirement savings projections.',
    },
    partnerSalary: {
        title: 'Partner base salary',
        body: 'Used to model partner tax, contributions, and household cash flow before retirement.',
    },
    superBal: {
        title: 'Your super today',
        body: 'Your starting super balance compounds over time and is one of the biggest drivers of retirement income adequacy.',
    },
    partnerSuperBal: {
        title: 'Partner super today',
        body: 'Your partner\'s current super balance materially affects combined retirement assets and couple projections.',
    },
    cash: {
        title: 'Cash / offset',
        body: 'Include readily available cash and offset balances. This improves liquidity but usually earns less than long-term growth assets.',
    },
    stocks: {
        title: 'Shares / ETFs',
        body: 'Use the current market value of listed investments held outside super so the model can include their growth and income.',
    },
    monthlyStockContrib: {
        title: 'Monthly investing',
        body: 'Extra monthly investing outside super builds non-super assets that can bridge the years before super or pension access.',
    },
    currentStocks: {
        title: 'Shares / ETFs',
        body: 'Use the current market value of listed investments held outside super so the model can include their growth and income.',
    },
    monthlyStockContribution: {
        title: 'Monthly investing',
        body: 'Extra monthly investing outside super builds non-super assets that can bridge the years before super or pension access.',
    },
    salarySacrifice: {
        title: 'Your salary sacrifice',
        body: 'Extra pre-tax super contributions can improve retirement savings and tax efficiency, but they count toward the concessional cap.',
    },
    partnerSalarySacrifice: {
        title: 'Partner salary sacrifice',
        body: 'Extra pre-tax super contributions for your partner count toward their concessional cap and affect household cash flow.',
    },
    employerRate: {
        title: 'Employer SG rate',
        body: 'This is the super guarantee rate applied to salary. It affects how much compulsory super is added each year.',
    },
    ncc: {
        title: 'Your after-tax contribution',
        body: 'Non-concessional contributions are made from after-tax money and count toward the annual non-concessional cap.',
    },
    partnerNCC: {
        title: 'Partner after-tax contribution',
        body: 'Non-concessional contributions for your partner use after-tax money and count toward their annual cap.',
    },
    concessionalUsedThisYear: {
        title: 'Concessional used this year',
        body: 'Enter contributions already made this financial year so the planner can estimate how much concessional cap remains.',
    },
    partnerCurrentSuper: {
        title: 'Partner super today',
        body: 'Your partner\'s current super balance materially affects combined retirement assets and couple projections.',
    },
    enableReducedIncome: {
        title: 'Enable reduced-income scenario',
        body: 'Turn this on to model a step-down in income before retirement rather than assuming your current salary continues unchanged.',
    },
    reducedIncomeEnabled: {
        title: 'Enable reduced-income scenario',
        body: 'Turn this on to model a step-down in income before retirement rather than assuming your current salary continues unchanged.',
    },
    reducedIncomeAge: {
        title: 'Your reduced-income age',
        body: 'Use this to model part-time work, burnout, caring responsibilities, or any income drop before retirement.',
    },
    reducedIncomeSalary: {
        title: 'Your reduced salary',
        body: 'Enter the lower annual income expected after the reduced-income age so cash flow and contributions adjust realistically.',
    },
    partnerReducedIncomeAge: {
        title: 'Partner reduced-income age',
        body: 'Models the age when your partner\'s earnings step down before full retirement.',
    },
    partnerReducedIncomeSalary: {
        title: 'Partner reduced salary',
        body: 'Enter your partner\'s reduced annual income after their reduced-income age.',
    },
    businessIncome: {
        title: 'Net business / self-employment income',
        body: 'Use annual net income after business expenses so projections reflect the real contribution to household cash flow.',
    },
    useDetailedExpenseInputs: {
        title: 'Detailed expense inputs',
        body: 'Switch this on when you want to break current living costs into detailed categories instead of using a simpler top-level estimate.',
    },
    currentMonthlyHousingCosts: {
        title: 'Current monthly housing costs',
        body: 'Include rent, mortgage, strata, rates, insurance, and other recurring housing costs that affect savings capacity today.',
    },
    currentMonthlyLivingCosts: {
        title: 'Current monthly living costs',
        body: 'Use your recurring non-housing household spending so the planner can estimate how much income is currently available to save.',
    },
    investmentIncomeOutsideSuper: {
        title: 'Investment income outside super',
        body: 'Include recurring dividends, distributions, and interest from non-super investments that support current savings capacity.',
    },
    hasFHSS: {
        title: 'Use FHSS',
        body: 'Enable this if you plan to use the First Home Super Saver scheme so eligible contributions and withdrawal assumptions are reflected.',
    },
    useFHSS: {
        title: 'Use FHSS',
        body: 'Enable this if you plan to use the First Home Super Saver scheme so eligible contributions and withdrawal assumptions are reflected.',
    },
    dependents: {
        title: 'Number of dependents',
        body: 'Dependents increase living costs and may change how much of your income is available to save or invest.',
    },
    educationCostPerChild: {
        title: 'Education cost per child',
        body: 'Use an annual average that reflects school fees, tutoring, uniforms, and other recurring education costs.',
    },
    privateSchool: {
        title: 'Private school costs',
        body: 'Enable this if the education budget should reflect private-school style costs rather than a lower public-school baseline.',
    },
    universitySupport: {
        title: 'University support',
        body: 'Enable this when you expect to contribute to adult children\'s university or early-career living costs.',
    },
    uniSupport: {
        title: 'University support',
        body: 'Enable this when you expect to contribute to adult children\'s university or early-career living costs.',
    },
    isCarerForParents: {
        title: 'Carer responsibilities',
        body: 'Use this when caring duties are likely to reduce work capacity, raise expenses, or change retirement timing.',
    },
    isCarer: {
        title: 'Carer responsibilities',
        body: 'Use this when caring duties are likely to reduce work capacity, raise expenses, or change retirement timing.',
    },
    annualParentSupport: {
        title: 'Annual support to family',
        body: 'Regular support for parents or other family reduces the amount of household cash flow available for your own retirement plan.',
    },
    carerYearsExpected: {
        title: 'Expected years of caring',
        body: 'This estimates how long caring duties could affect work patterns, savings, and personal spending flexibility.',
    },
    homeValue: {
        title: 'Home value',
        body: 'Used for downsize planning, net-worth summaries, and scenarios where the family home may be monetised later.',
    },
    mortgageBalance: {
        title: 'Mortgage balance',
        body: 'Enter the remaining home loan so the planner can estimate debt-servicing needs and retirement readiness.',
    },
    mortgage: {
        title: 'Mortgage left',
        body: 'Enter the remaining home loan so the planner can estimate debt-servicing needs and retirement readiness.',
    },
    mortgageRate: {
        title: 'Mortgage rate',
        body: 'The interest rate on your home loan affects how quickly the debt is repaid and how much cash flow it consumes.',
    },
    monthlyMortgagePayment: {
        title: 'Monthly mortgage payment',
        body: 'Use the actual repayment if it differs from a standard amortising estimate so cash flow stays realistic.',
    },
    creditCardBalance: {
        title: 'Credit card balance',
        body: 'High-cost revolving debt can materially weaken retirement readiness, so include the current outstanding balance.',
    },
    ccBalance: {
        title: 'Credit card balance',
        body: 'High-cost revolving debt can materially weaken retirement readiness, so include the current outstanding balance.',
    },
    creditCardRate: {
        title: 'Credit card rate',
        body: 'Credit card interest is usually expensive, so this rate helps highlight the drag from carrying balances.',
    },
    ccRate: {
        title: 'Credit card rate',
        body: 'Credit card interest is usually expensive, so this rate helps highlight the drag from carrying balances.',
    },
    personalLoanBalance: {
        title: 'Personal loan balance',
        body: 'Include the remaining personal loan so the model reflects debt repayments before retirement.',
    },
    personalLoan: {
        title: 'Personal loan',
        body: 'Include the remaining personal loan so the model reflects debt repayments before retirement.',
    },
    personalLoanRate: {
        title: 'Personal loan rate',
        body: 'Used to estimate how costly the personal loan is and how quickly it can be reduced under your current plan.',
    },
    carLoanBalance: {
        title: 'Car loan balance',
        body: 'Include the remaining car finance balance so short-term debt commitments are reflected in the plan.',
    },
    carLoan: {
        title: 'Car loan',
        body: 'Include the remaining car finance balance so short-term debt commitments are reflected in the plan.',
    },
    carLoanRate: {
        title: 'Car loan rate',
        body: 'The interest rate affects how expensive the loan is and how much cash it absorbs before retirement.',
    },
    hecsBalance: {
        title: 'HECS / HELP balance',
        body: 'Student debt affects take-home pay through compulsory repayments while you remain above the repayment thresholds.',
    },
    useGlidePath: {
        title: 'Enable dynamic allocation',
        body: 'A glide path gradually reduces growth exposure as you age, trading some upside for lower late-stage volatility.',
    },
    glidePathRule: {
        title: 'Glide path strategy',
        body: 'This rule determines how your growth allocation steps down over time, such as using a 110-minus-age or 120-minus-age approach.',
    },
    allocEquities: {
        title: 'Equities allocation',
        body: 'The percentage in equities is your main growth engine, but it also drives most of the portfolio\'s volatility.',
    },
    allocBonds: {
        title: 'Bonds allocation',
        body: 'Bonds usually lower overall portfolio volatility and provide more stable income than equities.',
    },
    allocCash: {
        title: 'Cash allocation',
        body: 'Cash improves liquidity and short-term stability but typically lowers long-run expected returns.',
    },
    australianEquityAllocation: {
        title: 'Australian equity allocation',
        body: 'This estimates how much of the equity portfolio is in Australian shares, which affects franking-credit assumptions and diversification.',
    },
    ipValue: {
        title: 'Current property value',
        body: 'Use a realistic current market value so equity, gearing, rental yield, and sale scenarios are meaningful.',
    },
    investmentPropertyValue: {
        title: 'Current property value',
        body: 'Use a realistic current market value so equity, gearing, rental yield, and sale scenarios are meaningful.',
    },
    ipLoan: {
        title: 'Outstanding loan',
        body: 'The remaining investment property loan affects gearing costs, net equity, and future cash flow.',
    },
    investmentPropertyLoan: {
        title: 'Outstanding loan',
        body: 'The remaining investment property loan affects gearing costs, net equity, and future cash flow.',
    },
    investmentPropertyPurchasePrice: {
        title: 'Purchase price',
        body: 'Used for equity history and capital-gains modelling when the property may be sold later in the projection.',
    },
    investmentPropertyPurchaseYear: {
        title: 'Purchase year',
        body: 'This helps frame how long the property has been held and can support more realistic sale and CGT assumptions.',
    },
    ipRate: {
        title: 'Property loan rate',
        body: 'This drives interest costs on the investment property and can materially change whether it is cash-flow positive.',
    },
    investmentPropertyRate: {
        title: 'Property loan rate',
        body: 'This drives interest costs on the investment property and can materially change whether it is cash-flow positive.',
    },
    ipWeeklyRent: {
        title: 'Weekly rent',
        body: 'Use current gross weekly rent before expenses so the planner can estimate rental yield and net property cash flow.',
    },
    weeklyRentalIncome: {
        title: 'Weekly rent',
        body: 'Use current gross weekly rent before expenses so the planner can estimate rental yield and net property cash flow.',
    },
    ipAnnualExpenses: {
        title: 'Annual property expenses',
        body: 'Include rates, insurance, maintenance, agent fees, and other recurring ownership costs.',
    },
    annualPropertyExpenses: {
        title: 'Annual property expenses',
        body: 'Include rates, insurance, maintenance, agent fees, and other recurring ownership costs.',
    },
    ipGrowthRate: {
        title: 'Property growth rate',
        body: 'This is the assumed annual capital-growth rate used for future equity and potential sale-value projections.',
    },
    propertyGrowthRate: {
        title: 'Property growth rate',
        body: 'This is the assumed annual capital-growth rate used for future equity and potential sale-value projections.',
    },
    ipState: {
        title: 'Property state',
        body: 'Used for state-based assumptions such as land tax and other property-specific settings.',
    },
    hasInvestmentProperty: {
        title: 'Investment property',
        body: 'Enable this if you own an investment property so rent, debt, expenses, and potential sale decisions are included.',
    },
    investmentProperty: {
        title: 'Investment property',
        body: 'Enable this if you own an investment property so rent, debt, expenses, and potential sale decisions are included.',
    },
    capitalGainsTaxRate: {
        title: 'Capital gains tax rate',
        body: 'Used when the property may be sold so the planner can estimate how much of the sale proceeds are lost to CGT.',
    },
    landTax: {
        title: 'Annual land tax',
        body: 'Use the assessed annual land tax if applicable. State thresholds and ownership structure can change the amount materially.',
    },
    trustType: {
        title: 'Primary trust type',
        body: 'Trust structure affects tax treatment, control assumptions, and how assets or distributions may be assessed.',
    },
    trustControlLevel: {
        title: 'Control level',
        body: 'Higher control can increase the chance that trust assets or income are effectively attributed to you for planning purposes.',
    },
    trustBeneficiaries: {
        title: 'Trust beneficiaries',
        body: 'Estimate how many beneficiaries share trust distributions so income-sharing assumptions stay realistic.',
    },
    hasTrust: {
        title: 'Trust assets or control',
        body: 'Enable this if trust-controlled assets or distributions should be included in household planning, pension means testing, or tax-sensitive strategy work.',
    },
    investmentPropertyInTrust: {
        title: 'Investment property in trust',
        body: 'Use this if the investment property is held through a trust, as ownership structure can affect tax and pension treatment.',
    },
    stocksInTrust: {
        title: 'Shares in trust',
        body: 'Use this if listed investments are held through a trust so attribution and distribution assumptions can be handled separately.',
    },
    homeInTrust: {
        title: 'Principal residence in trust',
        body: 'Use this when your home is held through a trust structure, as that can affect whether the usual Age Pension home exemption still applies.',
    },
    hasSmsf: {
        title: 'Self-Managed Super Fund',
        body: 'Enable this if super is managed through an SMSF so admin costs, balance suitability, and strategy settings are included.',
    },
    healthCondition: {
        title: 'Current health',
        body: 'Health status helps frame healthcare spending assumptions and can influence later-life cost projections.',
    },
    hasPrivateHospital: {
        title: 'Private hospital cover',
        body: 'Enable this when you carry private hospital insurance so health-cost projections and Lifetime Health Cover assumptions stay consistent.',
    },
    healthcareCost: {
        title: 'Annual healthcare cost',
        body: 'Include recurring out-of-pocket health spending such as premiums, specialists, medicines, and therapy.',
    },
    ageFirstHadCover: {
        title: 'Age first had cover',
        body: 'Used to estimate Lifetime Health Cover loading. Starting hospital cover after age 31 can increase premiums.',
    },
    agedCareProbability: {
        title: 'Aged care probability',
        body: 'This is the probability that aged-care costs are included later in life, reflecting that not everyone will need formal care.',
    },
    agedCareStartAge: {
        title: 'Aged care start age',
        body: 'The model begins applying aged-care costs from this age onward if the scenario includes them.',
    },
    agedCareAnnualCost: {
        title: 'Annual aged care cost',
        body: 'Use an annual average that reflects likely accommodation, care, and service costs if formal aged care is needed.',
    },
    salaryGrowthRate: {
        title: 'Real salary growth',
        body: 'Real salary growth is income growth above inflation. It affects future savings capacity and concessional contributions.',
    },
    leanYearsStart: {
        title: 'Lean years start',
        body: 'Use this to model a period shortly before retirement when income or saving capacity is expected to weaken.',
    },
    leanYearsReduction: {
        title: 'Lean years salary reduction',
        body: 'Enter the percentage cut to salary during the lean-years period so pre-retirement cash flow is reduced realistically.',
    },
    invReturn: {
        title: 'Investment return',
        body: 'This is the assumed long-run annual return on investments held outside super after fees but before personal tax effects.',
    },
    savingsReturn: {
        title: 'Savings / cash return',
        body: 'Use the expected annual return on cash and savings balances, which is usually lower than diversified growth assets.',
    },
    agePensionAge: {
        title: 'Age Pension age',
        body: 'This is the eligibility age used in projections. Adjust it only if you want to model a policy-change scenario.',
    },
    pensionAnnualSingle: {
        title: 'Maximum Age Pension — single',
        body: 'The annual single pension rate used by the model. Change it only to test a different policy setting.',
    },
    pensionAnnualCouple: {
        title: 'Maximum Age Pension — couple',
        body: 'The annual combined pension rate used for couple scenarios. Change it only to test a different policy setting.',
    },
    pensionAssetThreshold: {
        title: 'Age Pension asset threshold',
        body: 'Assets above this level start to reduce the pension under the asset test used in the projection.',
    },
    pensionAssetCutoff: {
        title: 'Age Pension asset cutoff',
        body: 'Above this level the asset test reduces Age Pension to zero under the current model assumptions.',
    },
    shockProbability: {
        title: 'Shock probability',
        body: 'The probability that a modelled market shock occurs in a given year when stress scenarios are enabled.',
    },
    shockMagnitude: {
        title: 'Shock magnitude',
        body: 'The size of the temporary drawdown applied when a stress-event shock occurs in the scenario.',
    },
    mcRuns: {
        title: 'Monte Carlo runs',
        body: 'More runs produce smoother percentile estimates and more stable success rates, but they take longer to calculate.',
    },
    returnVolatility: {
        title: 'Return volatility',
        body: 'This is the annual standard deviation used in stochastic modelling. Higher volatility widens the range of possible outcomes.',
    },
    enableShocks: {
        title: 'Enable market shocks',
        body: 'Turn this on to include discrete shock events in stress testing instead of using smooth return paths only.',
    },
    scenarioMode: {
        title: 'Scenario mode',
        body: 'Sets the broad environment for the projection before optional market shocks or sensitivity analysis are layered on top.',
    },
    legacyGoalType: {
        title: 'Legacy goal type',
        body: 'Choose the way you want a legacy target expressed so estate goals are measured in the right form.',
    },
    simNumRuns: {
        title: 'Life simulation runs',
        body: 'More life-simulation runs produce a more stable distribution of possible outcomes, but they take longer to compute.',
    },
    'whatif-super-slider': {
        title: 'Extra monthly super contribution',
        body: 'Use this slider to test how adding more to super each month changes retirement adequacy and drawdown resilience.',
    },
    'whatif-mortgage-slider': {
        title: 'Extra monthly mortgage payment',
        body: 'Use this slider to see how faster mortgage repayment changes cash flow now and debt levels at retirement.',
    },
    'whatif-retirement-slider': {
        title: 'Delayed retirement',
        body: 'Use this slider to test the impact of working longer, contributing for more years, and shortening the drawdown period.',
    },
    destination: {
        title: 'Retirement destination',
        body: 'The destination drives overseas cost assumptions, FX framing, and pension-portability considerations.',
    },
    overseasCountry: {
        title: 'Retirement destination',
        body: 'The destination drives overseas cost assumptions, FX framing, and pension-portability considerations.',
    },
    ageMovingOverseas: {
        title: 'Age moving overseas',
        body: 'This is the age when Australian living-cost assumptions begin switching to your overseas retirement scenario.',
    },
    overseasAge: {
        title: 'Age moving overseas',
        body: 'This is the age when Australian living-cost assumptions begin switching to your overseas retirement scenario.',
    },
    annualLivingCostOverseas: {
        title: 'Annual living cost overseas',
        body: 'Use an annual total in Australian dollars so the model can compare overseas living costs against your assets and income.',
    },
    returnFrequency: {
        title: 'Return to Australia frequency',
        body: 'Expected trips back to Australia affect annual travel spending and contingency planning in the overseas scenario.',
    },
    propertyStrategy: {
        title: 'Property strategy',
        body: 'Choose how property is handled in retirement planning, such as keeping it, selling it, or using it to fund later goals.',
    },
    useDownsizer: {
        title: 'Downsizer contribution',
        body: 'Enable this if you expect to sell the family home and contribute eligible proceeds into super under downsizer rules.',
    },
    sampleLifespan: {
        title: 'Sample lifespan from survival curve',
        body: 'Turn this on to let Monte Carlo runs draw lifespan from mortality data instead of using one fixed planning age in every run.',
    },
    useLongevityDistribution: {
        title: 'Sample lifespan from survival curve',
        body: 'Turn this on to let Monte Carlo runs draw lifespan from mortality data instead of using one fixed planning age in every run.',
    },
    budget2627: {
        title: 'Include proposed Budget 2026-27 changes',
        body: 'Use this only for what-if analysis of announced proposals that are not yet legislated, so you can compare current law against possible policy change.',
    },
    enableProposedBudget2026: {
        title: 'Include proposed Budget 2026-27 changes',
        body: 'Use this only for what-if analysis of announced proposals that are not yet legislated, so you can compare current law against possible policy change.',
    },
    goingOverseas: {
        title: 'Retire overseas',
        body: 'Enable this when some or all of retirement is expected to be overseas so FX, portability, and local-living-cost assumptions are included.',
    },
    overseasAgreementCountry: {
        title: 'Social Security Agreement',
        body: 'Use this when your destination has a Social Security Agreement with Australia so portability and waiting-period assumptions can be adjusted.',
    },
    maintainResidency: {
        title: 'Maintain Australian tax residency',
        body: 'Use this only if you plan around remaining an Australian tax resident, which is complex and usually needs specialist tax advice.',
    },
    superAccess: {
        title: 'Superannuation access strategy',
        body: 'This sets the broad approach for drawing on super in retirement, which affects timing, tax, and portfolio longevity.',
    },
    overseasSpendingCurrency: {
        title: 'Spending currency',
        body: 'The main local spending currency is used to frame FX sensitivity and purchasing-power risk in overseas retirement.',
    },
    overseasHousingType: {
        title: 'Local housing arrangement',
        body: 'Housing type materially changes the baseline overseas budget because rent, ownership, and family arrangements have very different costs.',
    },
    overseasFallbackTrigger: {
        title: 'Likely return trigger',
        body: 'This captures the event most likely to bring you back to Australia so fallback recommendations reflect a realistic contingency.',
    },
    salaryGrowthType: {
        title: 'Salary growth pattern',
        body: 'Sets how your salary increases each year before retirement. Standard tracks inflation; Career adds 2% real growth; Stagnant represents infrequent raises.',
    },
    downsizeAge: {
        title: 'Age to downsize',
        body: 'The age when you plan to sell your current home and buy a smaller or cheaper one, releasing equity for retirement.',
    },
    downsizeTargetHomeValue: {
        title: 'New home value',
        body: 'The estimated cost of the new, smaller home in today\'s dollars. The model adjusts this for inflation until your downsize age.',
    },
    downsizeTransactionCost: {
        title: 'Downsizing costs',
        body: 'The percentage of the home sale price lost to agent fees, marketing, legal costs, and moving expenses. Standard is 6.6% (incl. GST).',
    },
    downsizeOngoingFees: {
        title: 'Ongoing village/strata fees',
        body: 'Annual service or strata fees associated with the new property (e.g., retirement village levies).',
    },
    builderCurrentIncome: {
        title: 'Current monthly net income',
        body: 'Your total household take-home pay each month after tax.',
    },
    builderMortgage: {
        title: 'Current monthly mortgage/rent',
        body: 'Your regular monthly housing repayment which is assumed to stop once the home is owned outright in retirement.',
    },
    builderChildren: {
        title: 'Monthly children/work costs',
        body: 'Ongoing costs like school fees or commuting expenses that will likely disappear when you retire.',
    },
    builderBuffer: {
        title: 'Holidays & hobbies buffer',
        body: 'An extra percentage added to your derived base expenses to allow for a more comfortable retirement lifestyle.',
    },
    homeModAge: {
        title: 'Expected age for home modification',
        body: 'The age when you anticipate needing to spend a lump sum on home improvements like ramps or bathroom rails.',
    },
    homeModificationsAge: {
        title: 'Expected age for home modification',
        body: 'The age when you anticipate needing to spend a lump sum on home improvements like ramps or bathroom rails.',
    },
    homeModBudget: {
        title: 'Modification budget',
        body: 'A one-off amount in today\'s dollars for age-related home modifications.',
    },
    annuityPurchaseAmount: {
        title: 'Annuity purchase amount',
        body: 'The total capital you plan to use to purchase a lifetime annuity (longevity insurance).',
    },
    annuityAnnualIncome: {
        title: 'Annuity annual income',
        body: 'The guaranteed annual income payment you receive from your lifetime annuity.',
    },
    annuityPurchaseAge: {
        title: 'Annuity purchase age',
        body: 'The age when you plan to start your lifetime annuity payments.',
    },
    annualSpousalMaintenance: {
        title: 'Annual spousal maintenance',
        body: 'Annual amount paid for spousal or partner maintenance following a separation.',
    },
    annualChildSupport: {
        title: 'Annual child support',
        body: 'Annual child support payments, typically ending when the youngest child turns 18.',
    },
    // ── Age-Related Optional Costs ───────────────────────────────────────────
    enableHomeModifications: {
        title: 'Home modifications',
        body: 'Enable to model a one-off accessibility spend (ramps, grab rails, bathroom refit) and optional recurring maintenance at a chosen age.',
    },
    homeModificationCost: {
        title: 'One-off modification cost',
        body: 'Lump-sum amount spent adapting your home for mobility or safety at the target age. This is drawn from accumulated assets in that year.',
    },
    homeModificationAge: {
        title: 'Age to apply modification cost',
        body: 'The year-of-age when the one-off home modification expense is deducted from your balance. Typically 75–80 when mobility needs often emerge.',
    },
    homeModificationRecurring: {
        title: 'Annual recurring cost after modifications',
        body: 'Ongoing maintenance or strata fees following the modification. Applied every year from the modification age to end of plan.',
    },
    enableAnnuity: {
        title: 'Lifetime annuity / longevity insurance',
        body: 'Model the purchase of a guaranteed income stream at a specific age to protect against outliving your super. The lump sum is deducted once; the annual income flows in thereafter.',
    },
    annuityPurchaseAge: {
        title: 'Annuity purchase age',
        body: 'The age at which you exchange a lump sum for a guaranteed income stream. Typically age 75–80 when longevity uncertainty becomes more pressing.',
    },
    annuityLumpSum: {
        title: 'Annuity purchase price',
        body: 'The single premium paid to the insurer in the purchase year. This is deducted from your balance in that year.',
    },
    annuityAnnualIncome: {
        title: 'Annual annuity income',
        body: 'The guaranteed income received each year from the annuity. This is added to pension and other income to reduce super drawdown.',
    },
    enableTieredSpending: {
        title: 'Tiered retirement spending',
        body: 'Research shows spending follows an Active → Stable → Frail curve. Enable to apply custom multipliers for each stage so the model reflects real spending behaviour.',
    },
    tieredSpendingActiveMultiplier: {
        title: 'Active stage spending multiplier',
        body: 'Spending in the early active years as a proportion of your target income. Values above 1.0 mean higher spending; below 1.0 means lower.',
        example: '1.10 = 10% more than target income',
    },
    tieredSpendingActiveAge: {
        title: 'Active stage end age',
        body: 'The age at which the active high-spending phase transitions to the stable middle phase. Research typically places this around age 72–78.',
    },
    tieredSpendingStableMultiplier: {
        title: 'Stable stage spending multiplier',
        body: 'Spending in the quieter middle years as a proportion of target income. Often 0.85–0.95 as travel and social costs decline.',
    },
    tieredSpendingFrailAge: {
        title: 'Frail stage start age',
        body: 'The age at which late-life care needs drive spending back up. Research typically places this around age 82–88.',
    },
    tieredSpendingFrailMultiplier: {
        title: 'Frail stage spending multiplier',
        body: 'Spending in the high-care final years as a proportion of target income. Often 1.10–1.30 when healthcare and aged-care costs escalate.',
    },
    // ── Legal / Financial Obligations ────────────────────────────────────────
    hasSpousalMaintenance: {
        title: 'Spousal/partner maintenance',
        body: 'Enable if you are legally required to pay ongoing maintenance to a former partner. The annual amount will be deducted from your available income.',
    },
    annualSpousalMaintenance: {
        title: 'Annual spousal maintenance',
        body: 'Court-ordered or agreed maintenance paid to a former spouse each year. This reduces your net disposable income during the payment period.',
    },
    hasChildSupport: {
        title: 'Child support obligations',
        body: 'Enable if you pay child support. The annual amount reduces your disposable income each year until obligations end.',
    },
    annualChildSupport: {
        title: 'Annual child support paid',
        body: 'Child support obligations reduce available cash flow each year. Enter the annual total; the model deducts this from income before calculating retirement savings.',
    },
};

const ADVANCED_TOOLTIP_PAGE_SELECTOR = '#advancedCalculatorForm, .redesign-v2';

function normaliseTooltipText(text) {
    return String(text || '')
        .replace(/\s+/g, ' ')
        .replace(/\*/g, '')
        .trim();
}

function getFieldId(label) {
    if (label.hasAttribute('for')) {
        return label.getAttribute('for');
    }

    return label.querySelector('input[id], select[id], textarea[id]')?.id || null;
}

// Strip presentation-only fragments before turning label text into a tooltip
// title. Nested toggle labels often include helper paragraphs that should live
// in the tooltip body, not the title.
function getLabelTitle(label) {
    const clone = label.cloneNode(true);
    clone.querySelectorAll('input, select, textarea, .track, .tooltip, .tooltiptext, .req, .hint, .legend-dot-required, .legend-dot-optional, .text-xs, p').forEach((node) => node.remove());

    const explicitLabel = clone.querySelector('.label, .text-sm, .font-medium, .font-semibold');
    if (explicitLabel) {
        return normaliseTooltipText(explicitLabel.textContent);
    }

    return normaliseTooltipText(clone.textContent);
}

function buildTooltipDefinition(label) {
    const field = label.closest('.field');
    const container = field || label.parentElement;
    const derivedBody = [
        container?.querySelector('.field-help'),
        container?.querySelector('p.mt-1.text-xs'),
        container?.querySelector('p.text-xs'),
        container?.querySelector('p.text-gray-500'),
    ]
        .map((node) => normaliseTooltipText(node?.textContent))
        .find(Boolean);

    const fieldId = getFieldId(label);
    const explicit = fieldId ? FIELD_TOOLTIP_DEFINITIONS[fieldId] : null;

    if (!derivedBody && !explicit) {
        return null;
    }

    return {
        title: explicit?.title || getLabelTitle(label),
        body: derivedBody || explicit.body,
        example: explicit?.example || '',
    };
}

function createTooltipNode(documentRef, definition) {
    const tooltip = documentRef.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.dataset.generatedTooltip = 'true';

    const tooltipIcon = documentRef.createElement('span');
    tooltipIcon.className = 'tooltip-icon';
    tooltipIcon.setAttribute('aria-label', `${definition.title} information`);
    tooltipIcon.textContent = 'i';

    const tooltipText = documentRef.createElement('span');
    tooltipText.className = 'tooltiptext';

    const title = documentRef.createElement('strong');
    title.textContent = definition.title;
    tooltipText.appendChild(title);

    const body = documentRef.createElement('span');
    body.textContent = definition.body;
    tooltipText.appendChild(body);

    if (definition.example) {
        const example = documentRef.createElement('div');
        example.className = 'tooltip-example';
        example.textContent = definition.example;
        tooltipText.appendChild(example);
    }

    tooltip.appendChild(tooltipIcon);
    tooltip.appendChild(tooltipText);
    return tooltip;
}

function attachTooltipToLabel(label, tooltipNode) {
    const existingWrapper = label.closest('.label-with-tooltip');

    if (existingWrapper && existingWrapper.contains(label)) {
        existingWrapper.appendChild(tooltipNode);
        return;
    }

    const wrapper = label.ownerDocument.createElement('div');
    wrapper.className = label.hasAttribute('for')
        ? 'label-with-tooltip'
        : 'label-with-tooltip nested-label-with-tooltip';
    label.parentNode.insertBefore(wrapper, label);
    wrapper.appendChild(label);
    wrapper.appendChild(tooltipNode);
}

export function ensureAdvancedFieldTooltips(documentRef = document) {
    if (!documentRef.querySelector(ADVANCED_TOOLTIP_PAGE_SELECTOR)) {
        return;
    }

    const tooltipLabels = Array.from(documentRef.querySelectorAll('label')).filter((label) =>
        label.hasAttribute('for') || label.querySelector('input[id], select[id], textarea[id]')
    );

    tooltipLabels.forEach((label) => {
        if (label.closest('.label-with-tooltip')?.querySelector('.tooltip')) {
            return;
        }

        const definition = buildTooltipDefinition(label);
        if (!definition) {
            return;
        }

        attachTooltipToLabel(label, createTooltipNode(documentRef, definition));
    });
}
