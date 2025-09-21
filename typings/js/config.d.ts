
declare interface ENHANCED_CONFIGType {
	static SUPER_GUARANTEE_RATE: number;

	static DEMING_THRESHOLD: number;

	static SINGLE_PENSION_MAX: number;

	static SINGLE_ASSET_THRESHOLD: number;

	static SINGLE_ASSET_LIMIT: number;

	static SINGLE_INCOME_THRESHOLD: number;

	static HOME_EQUITY_ACCESS_RATE: number;

	static CGT_DISCOUNT: number;

	static FRANKING_CREDIT_RATE: number;

	static HEALTHCARE_COSTS: {
	static home_package4: number;

	static residential: number;

	static premium: number;

	static current_average: number;
	};

	static PROPERTY_COSTS: {
	static SELLING_COSTS_PERCENT: number;

	static STAMP_DUTY_THRESHOLD: number;

	static DEPRECIATION_RATE: number;

	static MAINTENANCE_PERCENT: number;

	static VACANCY_RATE: number;
	};

	static RISK_THRESHOLDS: {
	static capacity: {
		static low: number;

		static moderate: number;

		static high: number;
	};

	static tolerance: {
		static conservative: number;

		static balanced: number;

		static aggressive: number;
	};
	};

	static GLIDE_PATH_RULES: {	};

	static TAX_BRACKETS: ({	} | any)[];

	static HEALTHCARE_INFLATION: {
	static none: number;

	static minor: number;

	static moderate: number;

	static major: number;
	};

	static STRESS_SCENARIOS: ({	} | any)[];

	static DEFAULTS: {
	static personal: {
		static yourCurrentAge: number;

		static partnerCurrentAge: number;

		static retirementAge: number;

		static partnerRetirementAge: number;

		static yourLifespan: number;

		static partnerLifespan: number;
	};

	static financial: {
		static yourSalary: number;

		static partnerSalary: number;

		static currentSuper: number;

		static currentSavings: number;

		static currentStocks: number;

		static monthlyStockContribution: number;

		static percentIncomeSaved: number;
	};

	static property: {
		static homeValue: number;

		static mortgageBalance: number;

		static mortgageRate: number;

		static monthlyMortgagePayment: number;

		static planToDownsize: boolean;

		static hasInvestmentProperty: boolean;

		static investmentPropertyValue: number;

		static investmentPropertyLoan: number;

		static investmentPropertyRate: number;

		static weeklyRentalIncome: number;

		static annualPropertyExpenses: number;

		static propertyGrowthRate: number;

		static sellPropertyYears: number;

		static capitalGainsTaxRate: number;
	};

	static healthcare: {
		static currentHealthcareCosts: number;

		static healthcareInflation: number;

		static hasPrivateHealth: string;

		static chronicConditions: string;

		static agedCareProbability: number;

		static agedCareStartAge: number;

		static agedCareDuration: number;

		static agedCareAnnualCost: number;
	};

	static economic: {
		static inflation: number;

		static investmentReturn: number;

		static returnDeclineRate: number;

		static savingsReturn: number;

		static superReturn: number;

		static salaryGrowthRate: number;
	};

	static allocation: {
		static useGlidePath: boolean;

		static glidePathRule: string;

		static frankingCreditBenefit: number;

		static australianEquityAllocation: number;
	};

	static risk: {
		static riskTolerance: number;

		static hasEmergencyFund: string;

		static hasDebt: string;

		static dependents: number;
	};

	static simulation: {
		static numRuns: number;

		static returnVolatility: number;

		static enableShocks: boolean;

		static shockProbability: number;

		static shockMagnitude: number;
	};

	static pension: {
		static asfaComfortable: number;

		static agePensionMax: number;

		static pensionAssetThreshold: number;

		static pensionAssetLimit: number;

		static pensionIncomeThreshold: number;
	};
	};

	static VALIDATION: {
	static age: {	};

	static salary: {	};

	static percentage: {	};

	static currency: {	};

	static years: {	};

	static runs: {	};
	};

	static ALLOCATION_PRESETS: {
	static conservative: {	};

	static balanced: {	};

	static growth: {	};

	static aggressive: {	};
	};

	static BEHAVIORAL_NUDGES: {
	static autoRebalanceThreshold: number;

	static contributionEscalationCap: number;

	static defaultParticipation: boolean;

	static lossFramingThreshold: number;
	};
}
