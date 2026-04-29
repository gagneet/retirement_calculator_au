/**
 * Retirement Cost Reality Analyzer
 * Projects inflation-adjusted living costs across three retirement scenarios:
 *   1. Own home — mortgage paid off
 *   2. Own home — mortgage still running
 *   3. Aged care facility (RAD/DAP model, LDV Amberfield style)
 */

export class RetirementCostAnalyzer {

    // ─── Expense category baselines (2024-25 AUD, singles) ────────────────────

    static BASELINES = {
        groceries:     { today: 12000, label: 'Groceries & Food',     inflationRate: 0.034 },
        utilities:     { today: 3600,  label: 'Utilities & Bills',    inflationRate: 0.05  },
        transport:     { today: 5200,  label: 'Transport',            inflationRate: 0.03  },
        healthcare:    { today: 3200,  label: 'Healthcare',           inflationRate: 0.065 },
        entertainment: { today: 4800,  label: 'Entertainment',        inflationRate: 0.029 },
        insurance:     { today: 3600,  label: 'Insurance',            inflationRate: 0.06  },
        clothing:      { today: 2400,  label: 'Clothing & Personal',  inflationRate: 0.025 },
        // Scenario-specific categories (set dynamically)
        homeCosts:     { today: 0,     label: 'Home Maintenance',     inflationRate: 0.04  },
        mortgage:      { today: 0,     label: 'Mortgage Repayments',  inflationRate: 0.00  }, // fixed nominal
        travel:        { today: 0,     label: 'Travel & Holidays',    inflationRate: 0.035 },
        hobbies:       { today: 0,     label: 'Hobbies & Recreation', inflationRate: 0.03  },
        agedCareFees:  { today: 0,     label: 'Aged Care Fees',       inflationRate: 0.05  },
    };

    // Annual aged care costs (2024-25 AUD)
    static AGED_CARE = {
        basicDailyFee:      22265,  // ~$61/day × 365 — basic daily fee (set by govt)
        meansTested:        15000,  // average means-tested care fee
        extraServices:      12000,  // extras / lifestyle package
        radTypical:         500000, // typical RAD lump sum
        dacPercentage:      0.0721, // MPIR used for DAP conversion (July 2024)
        inflationRate:      0.05,
    };

    /**
     * @param {object} inputs  - collected from collectInputs() in app.js
     */
    constructor(inputs) {
        this.inputs = inputs;
        this.currentAge    = inputs.yourCurrentAge || 45;
        this.retirementAge = inputs.retirementAge  || 67;
        this.lifeExpectancy = inputs.lifeExpectancy || 90;
        this.inflation     = inputs.inflation       || 0.029;
        this.yearsToRetirement = Math.max(0, this.retirementAge - this.currentAge);
        this.yearsInRetirement = Math.max(1, this.lifeExpectancy - this.retirementAge);

        // User-specific overrides
        this.annualTravelBudget = inputs.annualTravelBudget || 8000;
        this.annualHobbyBudget  = inputs.annualHobbyBudget  || 4000;
        this.healthCondition    = inputs.healthCondition    || 'good';
        this.mortgageBalance    = inputs.mortgageBalance    || 0;
        this.mortgageRate       = inputs.mortgageRate       || 0.065;
        this.mortgageTermLeft   = inputs.mortgageTermLeft   || 20;

        // Health multiplier applied to healthcare category
        this.healthMultiplier = { excellent: 0.8, good: 1.0, fair: 1.25, poor: 1.6 }[this.healthCondition] || 1.0;
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    /** Project a value forward `years` at a given annual rate */
    project(value, years, rate) {
        return value * Math.pow(1 + rate, years);
    }

    /** Annual mortgage repayment (P&I) */
    annualMortgageRepayment() {
        if (!this.mortgageBalance || this.mortgageBalance <= 0) return 0;
        const r = this.mortgageRate / 12;
        const n = this.mortgageTermLeft * 12;
        if (r === 0) return this.mortgageBalance / this.mortgageTermLeft;
        const monthly = this.mortgageBalance * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
        return monthly * 12;
    }

    /** Returns the categories basket for a given scenario */
    buildBasket(scenario) {
        const b = JSON.parse(JSON.stringify(RetirementCostAnalyzer.BASELINES));

        // Travel & Hobbies — from user inputs
        b.travel.today  = this.annualTravelBudget;
        b.hobbies.today = this.annualHobbyBudget;

        // Healthcare — health-condition adjusted
        b.healthcare.today = b.healthcare.today * this.healthMultiplier;

        if (scenario === 'homePaidOff') {
            b.homeCosts.today = 8000;   // rates, maintenance, insurance
            b.mortgage.today  = 0;
            b.agedCareFees.today = 0;

        } else if (scenario === 'homeMortgage') {
            b.homeCosts.today = 8000;
            b.mortgage.today  = this.annualMortgageRepayment();
            b.agedCareFees.today = 0;

        } else if (scenario === 'agedCare') {
            // No home costs, no mortgage — in a facility
            b.homeCosts.today = 0;
            b.mortgage.today  = 0;
            b.groceries.today = 4000;   // reduced — meals included in facility fee
            b.utilities.today = 600;    // pocket-money utilities only
            b.transport.today = 1800;   // outings / taxis
            const ac = RetirementCostAnalyzer.AGED_CARE;
            b.agedCareFees.today = ac.basicDailyFee + ac.meansTested + ac.extraServices;
        }

        return b;
    }

    /** Sum all categories in a basket (projected `years` into the future) */
    sumBasket(basket, years) {
        return Object.values(basket).reduce((total, cat) => {
            return total + this.project(cat.today, years, cat.inflationRate ?? this.inflation);
        }, 0);
    }

    // ─── Main calculation API ─────────────────────────────────────────────────

    /**
     * Produces the full data payload consumed by the UI.
     */
    analyze() {
        const scenarios = ['homePaidOff', 'homeMortgage', 'agedCare'];
        const snapshots = [0, this.yearsToRetirement, this.yearsToRetirement + 10, this.yearsToRetirement + 20];
        const snapshotLabels = ['Today', 'At Retirement', '10yr In', '20yr In'];

        // Build baskets
        const baskets = {};
        scenarios.forEach(s => { baskets[s] = this.buildBasket(s); });

        // Summary cards: today / at retirement / at retirement + 10 / at retirement + 20
        const summaryCards = {};
        scenarios.forEach(s => {
            summaryCards[s] = snapshots.map(years => this.sumBasket(baskets[s], years));
        });

        // Expense breakdown table (per category, per snapshot)
        const tableRows = {};
        scenarios.forEach(s => {
            tableRows[s] = {};
            Object.entries(baskets[s]).forEach(([key, cat]) => {
                tableRows[s][key] = {
                    label: cat.label,
                    values: snapshots.map(years => this.project(cat.today, years, cat.inflationRate ?? this.inflation)),
                };
            });
        });

        // Year-by-year timeline: from today to end of life
        const timelineYears = [];
        const timeline = { homePaidOff: [], homeMortgage: [], agedCare: [] };
        const totalYears = this.yearsToRetirement + this.yearsInRetirement;

        for (let yr = 0; yr <= totalYears; yr++) {
            timelineYears.push(this.currentAge + yr);
            scenarios.forEach(s => {
                timeline[s].push(Math.round(this.sumBasket(baskets[s], yr)));
            });
        }

        // Stacked bar chart data (at retirement year)
        const stackedBar = {};
        scenarios.forEach(s => {
            stackedBar[s] = {};
            Object.entries(baskets[s]).forEach(([key, cat]) => {
                const val = this.project(cat.today, this.yearsToRetirement, cat.inflationRate ?? this.inflation);
                if (val > 0) stackedBar[s][key] = { label: cat.label, value: Math.round(val) };
            });
        });

        // RAD / DAP calculator
        const ac = RetirementCostAnalyzer.AGED_CARE;
        const radAnalysis = this.radDapAnalysis(ac.radTypical);

        return {
            meta: {
                currentAge:        this.currentAge,
                retirementAge:     this.retirementAge,
                lifeExpectancy:    this.lifeExpectancy,
                yearsToRetirement: this.yearsToRetirement,
                inflation:         this.inflation,
                healthCondition:   this.healthCondition,
                mortgageRepayment: this.annualMortgageRepayment(),
            },
            snapshotLabels,
            summaryCards,
            tableRows,
            timelineYears,
            timeline,
            stackedBar,
            radAnalysis,
        };
    }

    /**
     * RAD vs DAP comparison for a given lump sum.
     * @param {number} rad - Refundable Accommodation Deposit amount
     */
    radDapAnalysis(rad) {
        const mpir    = RetirementCostAnalyzer.AGED_CARE.dacPercentage; // Maximum Permissible Interest Rate
        const dapPerDay = (rad * mpir) / 365;
        const dapPerYear = dapPerDay * 365;

        // Opportunity cost: what if you invested the RAD instead?
        const conservativeReturn = 0.05; // 5% pa conservative portfolio
        const opportunityCostPerYear = rad * conservativeReturn;

        // After 5 years — RAD refunded on exit, so net DAP cost vs invested RAD
        const years = 5;
        const totalDap  = dapPerYear * years;
        const totalOppCost = opportunityCostPerYear * years; // forgone earnings if RAD paid

        // RAD is fully refundable — so paying RAD = forgoing investment returns only
        // DAP = cash flow out, but keep RAD money invested
        const netRad = totalOppCost; // paying RAD costs you forgone returns
        const netDap = totalDap;     // DAP costs you the actual payments

        return {
            rad,
            mpir,
            dapPerDay:   Math.round(dapPerDay),
            dapPerYear:  Math.round(dapPerYear),
            opportunityCostPerYear: Math.round(opportunityCostPerYear),
            totalDap:    Math.round(totalDap),
            totalOppCost: Math.round(totalOppCost),
            preferRad:   netRad < netDap, // paying RAD is cheaper if investment return < DAP
            saving5yr:   Math.round(Math.abs(netDap - netRad)),
        };
    }
}
