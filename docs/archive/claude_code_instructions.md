# AUSTRALIAN RETIREMENT CALCULATOR - TECHNICAL SPECIFICATION
**Version:** 1.0  
**Target:** Claude Code Implementation  
**Last Updated:** 2025-09-29

---

## PROJECT OVERVIEW

### Purpose
Build a comprehensive Australian retirement confidence calculator that:
- Collects detailed financial data through progressive onboarding
- Runs Monte Carlo simulations (10,000+ iterations) to calculate retirement success probability
- Generates actionable, prioritized recommendations
- Handles complex Australian tax/pension rules
- Supports singles, couples, and complex asset structures

### Target Users (4 Personas)
1. **High earners** - Early retirement planning, Division 293 tax optimization
2. **Business/property owners** - CGT concessions, trust attribution, multiple properties
3. **Late starters** - Catch-up contributions, downsizer strategies
4. **Pension maximizers** - Age Pension optimization, gifting strategies

### Key Differentiators
- Australian-specific calculations (super, Age Pension, CGT, trusts)
- Actionable suggestions with dollar impacts
- Scenario comparison matrix
- Year-by-year cashflow projections
- PDF export with implementation roadmap

---

## TECHNICAL STACK RECOMMENDATIONS

### Frontend
```
Framework: Next.js 14+ (App Router)
Language: TypeScript
Styling: Tailwind CSS
Forms: React Hook Form + Zod validation
State: React Context + useReducer (or Zustand if complexity grows)
Charts: Recharts or Chart.js
PDF Export: jsPDF or react-pdf
```

### Calculation Engine
```
Monte Carlo: Web Workers for non-blocking simulation
Math Library: Consider mathjs for financial calculations
Storage: localStorage for auto-save, optional backend for sharing
```

### Key Libraries
```json
{
  "react-hook-form": "^7.x",
  "zod": "^3.x",
  "recharts": "^2.x",
  "date-fns": "^3.x",
  "jspdf": "^2.x",
  "tailwindcss": "^3.x"
}
```

---

## DATA MODEL

### Core Data Structure

```typescript
interface RetirementProfile {
  // Household
  household: {
    type: 'single' | 'couple';
    primaryAge: number;
    partnerAge?: number;
    dependents: {
      childrenUnder18: number;
      childrenAdult: number;
      elderlyParents: boolean;
      otherDependents: boolean;
    };
  };

  // Retirement goals
  retirement: {
    primaryRetirementAge: number;
    partnerRetirementAge?: number;
    targetSpending: number; // Annual spending goal
    spendingSource: 'current' | 'afsa_comfortable' | 'afsa_modest' | 'custom';
    lifeExpectancy: number;
    agedCareAge?: number;
  };

  // Superannuation
  super: {
    primaryBalance: number;
    partnerBalance?: number;
    primaryTSB: number; // Total Super Balance for catch-up calcs
    partnerTSB?: number;
    employerContributions: number; // Annual
    voluntaryContributions: number; // Annual
    partnerEmployerContrib?: number;
    partnerVoluntaryContrib?: number;
  };

  // Income
  income: {
    primaryIncome: number; // Annual pre-tax
    partnerIncome?: number;
    otherIncome?: number;
  };

  // Non-super assets
  assets: {
    savings: number;
    shares: number;
    termDeposits: number;
    otherInvestments: number;
  };

  // Property
  property: {
    primaryResidence?: {
      owned: boolean;
      value: number;
      mortgageOwing: number;
      age55Plus: boolean; // For downsizer contribution
    };
    rental?: {
      weeklyRent: number;
    };
    investmentProperties: InvestmentProperty[];
  };

  // Business/Trust (optional)
  business?: {
    hasBusinessInterest: boolean;
    structure: 'sole_trader' | 'partnership' | 'company' | 'trust';
    value: number;
    ownershipPercent: number;
    yearsOwned: number;
    isActiveAsset: boolean;
  };

  trust?: {
    hasTrust: boolean;
    netAssets: number;
    hasControl: boolean; // Appointor/controller role
    annualDistributions: number;
  };

  // Investment strategy
  investment: {
    preRetirement: {
      ausShares: number; // Percentage
      intlShares: number;
      property: number;
      fixedIncome: number;
      cash: number;
    };
    postRetirement: {
      ausShares: number;
      intlShares: number;
      property: number;
      fixedIncome: number;
      cash: number;
    };
    dividendYield: number;
    frankingLevel: number;
  };

  // Advanced options
  advanced?: {
    inflationRate: number;
    preRetirementReturn: number;
    postRetirementReturn: number;
    riskTolerance: 'conservative' | 'balanced' | 'growth';
    futureEvents: FutureEvent[];
  };
}

interface InvestmentProperty {
  id: string;
  value: number;
  loanOwing: number;
  rentalIncome: number; // Weekly
  annualExpenses: number;
  purchaseDate: Date;
  planToSellAge?: number; // null = never sell
}

interface FutureEvent {
  id: string;
  type: 'inheritance' | 'property_sale' | 'lump_sum_expense' | 'income_change';
  age: number;
  amount: number;
  description: string;
}
```

---

## AUSTRALIAN CONSTANTS & RULES (2025-26)

### Government Rates

```typescript
const AUSTRALIAN_RATES_2025_26 = {
  // Superannuation
  CONCESSIONAL_CAP: 30000, // Annual limit
  NON_CONCESSIONAL_CAP: 120000, // Annual limit
  NON_CONCESSIONAL_BRING_FORWARD: 360000, // 3-year total
  TRANSFER_BALANCE_CAP: 1900000, // Pension phase limit
  DIVISION_293_THRESHOLD: 250000, // Income threshold for extra 15% tax
  SGC_RATE: 0.115, // Super Guarantee 11.5%
  
  // Preservation age (born after 1964)
  PRESERVATION_AGE: 60,
  
  // Age Pension (full rates, annual)
  AGE_PENSION: {
    AGE_ELIGIBILITY: 67,
    MAX_SINGLE: 27600, // Per year
    MAX_COUPLE_COMBINED: 41600,
    MAX_COUPLE_SEPARATED: 27600,
    
    // Asset test thresholds (homeowner)
    ASSET_TEST_SINGLE_HOMEOWNER: 314000,
    ASSET_TEST_COUPLE_HOMEOWNER: 470000,
    
    // Asset test thresholds (non-homeowner)
    ASSET_TEST_SINGLE_NON_HOMEOWNER: 566000,
    ASSET_TEST_COUPLE_NON_HOMEOWNER: 722000,
    
    // Income test thresholds (fortnightly, convert to annual)
    INCOME_TEST_SINGLE: 212 * 26, // $5,512/year
    INCOME_TEST_COUPLE: 336 * 26, // $8,736/year combined
    
    // Taper rates
    ASSET_TAPER_RATE: 0.075, // $7.50 per fortnight per $1,000 over threshold
    INCOME_TAPER_RATE: 0.50, // 50c reduction per $1 over threshold
    
    // Deeming rates
    DEEMING_RATE_LOWER: 0.0025, // 0.25% on first threshold
    DEEMING_RATE_UPPER: 0.0225, // 2.25% above threshold
    DEEMING_THRESHOLD_SINGLE: 60400,
    DEEMING_THRESHOLD_COUPLE: 100200,
    
    // Work Bonus
    WORK_BONUS_ANNUAL: 11800, // Exempt work income
    
    // Gifting limits
    GIFTING_ANNUAL: 10000,
    GIFTING_5_YEAR: 30000,
  },
  
  // AFSA Retirement Standards (annual, couple)
  AFSA: {
    COMFORTABLE_COUPLE: 73875,
    COMFORTABLE_SINGLE: 51278,
    MODEST_COUPLE: 48184,
    MODEST_SINGLE: 31323,
  },
  
  // CGT & Tax
  CGT_DISCOUNT: 0.50, // 50% discount if held >12 months
  CGT_SMALL_BUSINESS_15_YEAR_EXEMPTION: true, // Unlimited exemption
  CGT_RETIREMENT_EXEMPTION_LIMIT: 500000, // Per person under 55
  
  // Commonwealth Seniors Health Card
  CSHC_INCOME_SINGLE: 95400,
  CSHC_INCOME_COUPLE: 152640,
  
  // Rent Assistance (maximum fortnightly)
  RENT_ASSIST_SINGLE: 188,
  RENT_ASSIST_COUPLE: 176.8,
};
```

### Tax Brackets (2025-26)

```typescript
const TAX_BRACKETS_2025_26 = [
  { min: 0, max: 18200, rate: 0, offset: 0 },
  { min: 18201, max: 45000, rate: 0.19, offset: 0 },
  { min: 45001, max: 135000, rate: 0.325, offset: 5092 },
  { min: 135001, max: 190000, rate: 0.37, offset: 34317 },
  { min: 190001, max: Infinity, rate: 0.45, offset: 54567 },
];

const MEDICARE_LEVY = 0.02; // 2% of taxable income
```

---

## CALCULATION LOGIC

### 1. Contribution Calculations

```typescript
function calculateMaxConcessionalContribution(
  tsb: number,
  age: number,
  unusedCaps: number[]
): number {
  const currentYearCap = AUSTRALIAN_RATES_2025_26.CONCESSIONAL_CAP;
  
  // Catch-up contributions: Can use unused caps from last 5 years if TSB < $500k
  if (tsb < 500000) {
    const totalUnused = unusedCaps.slice(-5).reduce((sum, cap) => sum + cap, 0);
    return currentYearCap + totalUnused;
  }
  
  return currentYearCap;
}

function calculateDivision293Tax(income: number, concessionalContrib: number): number {
  if (income < AUSTRALIAN_RATES_2025_26.DIVISION_293_THRESHOLD) {
    return 0;
  }
  
  // Extra 15% on concessional contributions over threshold
  const excessIncome = income - AUSTRALIAN_RATES_2025_26.DIVISION_293_THRESHOLD;
  const taxableContrib = Math.min(excessIncome, concessionalContrib);
  
  return taxableContrib * 0.15;
}
```

### 2. Age Pension Calculation

```typescript
interface AgePensionResult {
  eligible: boolean;
  annualAmount: number;
  limitingTest: 'asset' | 'income' | 'none';
  assetsOverThreshold: number;
  incomeOverThreshold: number;
}

function calculateAgePension(
  age: number,
  isCouple: boolean,
  assets: number, // Excludes primary residence
  income: number, // Assessable income
  isHomeowner: boolean
): AgePensionResult {
  const rates = AUSTRALIAN_RATES_2025_26.AGE_PENSION;
  
  // Check age eligibility
  if (age < rates.AGE_ELIGIBILITY) {
    return { eligible: false, annualAmount: 0, limitingTest: 'none', assetsOverThreshold: 0, incomeOverThreshold: 0 };
  }
  
  // Get thresholds
  const assetThreshold = isCouple 
    ? (isHomeowner ? rates.ASSET_TEST_COUPLE_HOMEOWNER : rates.ASSET_TEST_COUPLE_NON_HOMEOWNER)
    : (isHomeowner ? rates.ASSET_TEST_SINGLE_HOMEOWNER : rates.ASSET_TEST_SINGLE_NON_HOMEOWNER);
  
  const incomeThreshold = isCouple ? rates.INCOME_TEST_COUPLE : rates.INCOME_TEST_SINGLE;
  
  const maxPension = isCouple ? rates.MAX_COUPLE_COMBINED : rates.MAX_SINGLE;
  
  // Asset test
  let pensionAssetTest = maxPension;
  if (assets > assetThreshold) {
    const excessAssets = assets - assetThreshold;
    const reduction = (excessAssets / 1000) * rates.ASSET_TAPER_RATE * 26; // Annual reduction
    pensionAssetTest = Math.max(0, maxPension - reduction);
  }
  
  // Income test (with deeming for financial assets)
  let pensionIncomeTest = maxPension;
  if (income > incomeThreshold) {
    const excessIncome = income - incomeThreshold;
    const reduction = excessIncome * rates.INCOME_TAPER_RATE;
    pensionIncomeTest = Math.max(0, maxPension - reduction);
  }
  
  // Take the lower of the two tests
  const finalPension = Math.min(pensionAssetTest, pensionIncomeTest);
  const limitingTest = pensionAssetTest < pensionIncomeTest ? 'asset' : 'income';
  
  return {
    eligible: finalPension > 0,
    annualAmount: finalPension,
    limitingTest,
    assetsOverThreshold: Math.max(0, assets - assetThreshold),
    incomeOverThreshold: Math.max(0, income - incomeThreshold),
  };
}
```

### 3. Investment Returns

```typescript
function calculatePortfolioReturn(allocation: {
  ausShares: number;
  intlShares: number;
  property: number;
  fixedIncome: number;
  cash: number;
}): number {
  // Expected returns (conservative estimates)
  const returns = {
    ausShares: 0.085, // 8.5% incl dividends
    intlShares: 0.082, // 8.2%
    property: 0.065, // 6.5%
    fixedIncome: 0.045, // 4.5%
    cash: 0.025, // 2.5%
  };
  
  return (
    (allocation.ausShares / 100) * returns.ausShares +
    (allocation.intlShares / 100) * returns.intlShares +
    (allocation.property / 100) * returns.property +
    (allocation.fixedIncome / 100) * returns.fixedIncome +
    (allocation.cash / 100) * returns.cash
  );
}

function applyInflation(amount: number, years: number, inflationRate: number = 0.025): number {
  return amount * Math.pow(1 + inflationRate, years);
}
```

### 4. Monte Carlo Simulation

```typescript
interface MonteCarloResult {
  successRate: number; // Percentage of runs where money lasted
  medianBalance: number; // Median balance at life expectancy
  percentile25Balance: number; // 25th percentile (worst quarter)
  percentile75Balance: number; // 75th percentile (best quarter)
  depletionAge: number | null; // Age money runs out (in failure scenarios)
  yearByYearMedian: YearProjection[]; // Median values each year
}

interface YearProjection {
  year: number;
  age: number;
  superBalance: number;
  totalNetWorth: number;
  withdrawal: number;
  agePension: number;
  propertyIncome: number;
  healthcareCosts: number;
  agedCareCosts: number;
}

async function runMonteCarloSimulation(
  profile: RetirementProfile,
  numSimulations: number = 10000
): Promise<MonteCarloResult> {
  // Run simulations in Web Worker to avoid blocking UI
  const worker = new Worker('/workers/monte-carlo.worker.js');
  
  return new Promise((resolve) => {
    worker.postMessage({ profile, numSimulations });
    
    worker.onmessage = (e) => {
      resolve(e.data);
      worker.terminate();
    };
  });
}

// In monte-carlo.worker.js:
function runSingleSimulation(profile: RetirementProfile, volatility: number): boolean {
  let superBalance = profile.super.primaryBalance + (profile.super.partnerBalance || 0);
  let assets = profile.assets.savings + profile.assets.shares + profile.assets.termDeposits;
  
  const currentAge = profile.household.primaryAge;
  const retirementAge = profile.retirement.primaryRetirementAge;
  const lifeExpectancy = profile.retirement.lifeExpectancy;
  const targetSpending = profile.retirement.targetSpending;
  
  // Accumulation phase (current age → retirement)
  for (let age = currentAge; age < retirementAge; age++) {
    const yearlyContrib = profile.super.employerContributions + profile.super.voluntaryContributions;
    const returnRate = calculatePortfolioReturn(profile.investment.preRetirement);
    
    // Add random volatility
    const actualReturn = returnRate + (Math.random() - 0.5) * volatility;
    
    superBalance = superBalance * (1 + actualReturn) + yearlyContrib;
  }
  
  // Drawdown phase (retirement → life expectancy)
  for (let age = retirementAge; age <= lifeExpectancy; age++) {
    const returnRate = calculatePortfolioReturn(profile.investment.postRetirement);
    const actualReturn = returnRate + (Math.random() - 0.5) * volatility;
    
    // Calculate Age Pension
    const agePension = calculateAgePension(
      age,
      profile.household.type === 'couple',
      superBalance + assets,
      0, // Simplified: actual would calculate deemed income
      profile.property.primaryResidence?.owned || false
    ).annualAmount;
    
    // Calculate required withdrawal
    const inflatedSpending = applyInflation(targetSpending, age - retirementAge);
    const healthcareCosts = calculateHealthcareCosts(age);
    const agedCareCosts = age >= (profile.retirement.agedCareAge || 82) 
      ? calculateAgedCareCosts(age, superBalance + assets) 
      : 0;
    
    const totalNeeded = inflatedSpending + healthcareCosts + agedCareCosts;
    const withdrawal = Math.max(0, totalNeeded - agePension);
    
    // Withdraw and apply returns
    superBalance = Math.max(0, (superBalance - withdrawal) * (1 + actualReturn));
    
    // Check if depleted
    if (superBalance <= 0 && age < lifeExpectancy) {
      return false; // Failure: ran out before life expectancy
    }
  }
  
  return true; // Success: money lasted
}

function calculateHealthcareCosts(age: number): number {
  // Healthcare costs increase with age
  if (age < 70) return 3000;
  if (age < 80) return 5000;
  if (age < 85) return 8000;
  return 12000;
}

function calculateAgedCareCosts(age: number, assets: number): number {
  // Simplified aged care means testing
  // Reality: complex DAC/DAP calculations based on assets/income
  const baseHomeCare = 25000; // Annual home care package
  
  if (assets > 200000) {
    // Higher assets = higher contribution
    return baseHomeCare + (assets - 200000) * 0.015;
  }
  
  return baseHomeCare;
}
```

---

## SUGGESTION ENGINE

### Strategy Identification

```typescript
interface Suggestion {
  id: string;
  priority: number; // 1 = highest
  title: string;
  category: 'contribution' | 'pension' | 'property' | 'tax' | 'timing';
  impact: {
    successRateChange: number; // Percentage points
    balanceChange: number; // Dollar amount
    pensionChange?: number; // Annual pension change
  };
  cost: {
    upfrontCost: number;
    ongoingCost: number; // Annual
    netCost: number; // After tax benefits
  };
  implementation: {
    timeToImplement: string; // e.g., "1 week"
    complexity: 'low' | 'medium' | 'high';
    steps: string[];
  };
  description: string;
  reasoning: string;
}

function generateSuggestions(
  profile: RetirementProfile,
  baselineResult: MonteCarloResult
): Suggestion[] {
  const suggestions: Suggestion[] = [];
  
  // 1. Check contribution optimization
  const maxConcessional = calculateMaxConcessionalContribution(
    profile.super.primaryTSB,
    profile.household.primaryAge,
    [] // Would need historical unused caps
  );
  
  const currentContrib = profile.super.employerContributions + profile.super.voluntaryContributions;
  
  if (currentContrib < maxConcessional) {
    const increase = maxConcessional - currentContrib;
    const marginalRate = calculateMarginalRate(profile.income.primaryIncome);
    const taxSaving = increase * marginalRate;
    
    // Run scenario with increased contributions
    const optimizedProfile = { ...profile };
    optimizedProfile.super.voluntaryContributions += increase;
    const optimizedResult = await runMonteCarloSimulation(optimizedProfile);
    
    suggestions.push({
      id: 'max-concessional',
      priority: 1,
      title: 'Maximize Concessional Contributions',
      category: 'contribution',
      impact: {
        successRateChange: optimizedResult.successRate - baselineResult.successRate,
        balanceChange: optimizedResult.medianBalance - baselineResult.medianBalance,
      },
      cost: {
        upfrontCost: 0,
        ongoingCost: increase,
        netCost: increase - taxSaving,
      },
      implementation: {
        timeToImplement: '1 week',
        complexity: 'low',
        steps: [
          `Contact payroll to increase salary sacrifice by $${(increase / 26).toFixed(0)}/fortnight`,
          'Verify change appears on next payslip',
          'Confirm annual contribution stays under cap ($30,000)',
        ],
      },
      description: `Increase contributions by $${increase.toLocaleString()}/year to maximize your concessional cap`,
      reasoning: `You're currently using ${((currentContrib / maxConcessional) * 100).toFixed(0)}% of your $${maxConcessional.toLocaleString()} cap. Maxing out saves $${taxSaving.toLocaleString()}/year in tax.`,
    });
  }
  
  // 2. Check Age Pension optimization
  const agePensionResult = calculateAgePension(
    profile.retirement.primaryRetirementAge,
    profile.household.type === 'couple',
    profile.super.primaryBalance + profile.assets.savings + profile.assets.shares,
    0,
    profile.property.primaryResidence?.owned || false
  );
  
  if (agePensionResult.assetsOverThreshold > 0 && agePensionResult.assetsOverThreshold < 50000) {
    // Close to threshold - optimization possible
    const excessAssets = agePensionResult.assetsOverThreshold;
    const potentialPensionGain = (excessAssets / 1000) * AUSTRALIAN_RATES_2025_26.AGE_PENSION.ASSET_TAPER_RATE * 26;
    
    suggestions.push({
      id: 'optimize-age-pension',
      priority: 2,
      title: 'Optimize Age Pension (Asset Test)',
      category: 'pension',
      impact: {
        successRateChange: 5, // Estimate
        balanceChange: potentialPensionGain * (profile.retirement.lifeExpectancy - profile.retirement.primaryRetirementAge),
        pensionChange: potentialPensionGain,
      },
      cost: {
        upfrontCost: 0,
        ongoingCost: 0,
        netCost: 0,
      },
      implementation: {
        timeToImplement: '1-3 months',
        complexity: 'medium',
        steps: [
          `Reduce assessable assets by $${excessAssets.toLocaleString()}`,
          'Options: Funeral bond ($15k exempt), gifts to adult children ($10k/year), home improvements',
          'Reassess Age Pension eligibility',
        ],
      },
      description: `You're $${excessAssets.toLocaleString()} over the asset test threshold, costing you $${potentialPensionGain.toLocaleString()}/year in Age Pension`,
      reasoning: `Small asset adjustments can unlock significant pension increases. Lifetime benefit: $${(potentialPensionGain * 25).toLocaleString()}`,
    });
  }
  
  // 3. Check property sale timing
  if (profile.property.investmentProperties.length > 0) {
    const property = profile.property.investmentProperties[0];
    
    if (property.planToSellAge) {
      // Test scenarios: sell earlier, sell later
      const scenarios = [
        { age: property.planToSellAge - 5, label: '5 years earlier' },
        { age: property.planToSellAge + 5, label: '5 years later' },
      ];
      
      for (const scenario of scenarios) {
        const modifiedProfile = { ...profile };
        modifiedProfile.property.investmentProperties[0].planToSellAge = scenario.age;
        const result = await runMonteCarloSimulation(modifiedProfile);
        
        if (result.successRate > baselineResult.successRate + 5) {
          suggestions.push({
            id: `property-timing-${scenario.age}`,
            priority: 3,
            title: `Delay Property Sale to Age ${scenario.age}`,
            category: 'property',
            impact: {
              successRateChange: result.successRate - baselineResult.successRate,
              balanceChange: result.medianBalance - baselineResult.medianBalance,
            },
            cost: {
              upfrontCost: 0,
              ongoingCost: 0,
              netCost: 0,
            },
            implementation: {
              timeToImplement: 'Planning only',
              complexity: 'low',
              steps: [
                'Defer property sale decision',
                'Continue collecting rental income',
                'Benefit from capital growth',
              ],
            },
            description: `Sell investment property at age ${scenario.age} instead of ${property.planToSellAge}`,
            reasoning: `Rental income + capital growth outweighs super drawdown during this period`,
          });
        }
      }
    }
  }
  
  // 4. Division 293 optimization for high earners
  if (profile.income.primaryIncome > AUSTRALIAN_RATES_2025_26.DIVISION_293_THRESHOLD) {
    const div293Tax = calculateDivision293Tax(
      profile.income.primaryIncome,
      profile.super.voluntaryContributions
    );
    
    if (div293Tax > 0) {
      suggestions.push({
        id: 'manage-division-293',
        priority: 4,
        title: 'Manage Division 293 Tax',
        category: 'tax',
        impact: {
          successRateChange: 0,
          balanceChange: div293Tax * (profile.retirement.primaryRetirementAge - profile.household.primaryAge),
        },
        cost: {
          upfrontCost: 0,
          ongoingCost: -div293Tax, // It's a saving
          netCost: -div293Tax,
        },
        implementation: {
          timeToImplement: '1-2 weeks',
          complexity: 'medium',
          steps: [
            'Consider non-concessional contributions instead',
            'Time contributions to manage income threshold',
            'Use spouse contributions if applicable',
          ],
        },
        description: `Your income triggers Division 293 tax ($${div293Tax.toLocaleString()}/year extra on super contributions)`,
        reasoning: `Consider alternative strategies to reduce tax on super contributions`,
      });
    }
  }
  
  // 5. Business CGT concessions
  if (profile.business?.hasBusinessInterest && profile.business.yearsOwned >= 15) {
    suggestions.push({
      id: 'business-cgt-15-year',
      priority: 1, // Very high priority due to massive savings
      title: '15-Year CGT Exemption Available',
      category: 'tax',
      impact: {
        successRateChange: 15, // Estimate
        balanceChange: profile.business.value * profile.business.ownershipPercent / 100,
      },
      cost: {
        upfrontCost: 0,
        ongoingCost: 0,
        netCost: 0,
      },
      implementation: {
        timeToImplement: '3-6 months',
        complexity: 'high',
        steps: [
          'Engage qualified tax advisor/CPA immediately',
          'Structure sale to maximize CGT exemptions',
          'Contribute proceeds to super under CGT cap rules',
          'Complete before age 55 if using retirement exemption',
        ],
      },
      description: 'Your business qualifies for 15-year CGT exemption - potential $500k+ tax saving',
      reasoning: `Held ${profile.business.yearsOwned} years. Can contribute business sale proceeds to super TAX-FREE. This is your single biggest opportunity.`,
    });
  }
  
  // Sort by priority and impact
  return suggestions.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return b.impact.successRateChange - a.impact.successRateChange;
  });
}

function calculateMarginalRate(income: number): number {
  for (const bracket of TAX_BRACKETS_2025_26) {
    if (income >= bracket.min && income <= bracket.max) {
      return bracket.rate + MEDICARE_LEVY;
    }
  }
  return 0.45 + MEDICARE_LEVY; // Top bracket
}
```

---

## UI COMPONENT STRUCTURE

### File Organization

```
src/
├── app/
│   ├── layout.tsx
│   ├── page.tsx (landing/start)
│   └── calculator/
│       ├── page.tsx (main calculator layout)
│       ├── onboarding/
│       │   ├── step1-household.tsx
│       │   ├── step2-financial.tsx
│       │   ├── step3-property.tsx
│       │   ├── step4-spending.tsx
│       │   └── step5-advanced.tsx
│       ├── results/
│       │   ├── dashboard.tsx
│       │   ├── confidence-score.tsx
│       │   ├── quick-wins.tsx
│       │   ├── scenario-comparison.tsx
│       │   ├── year-by-year.tsx
│       │   ├── sensitivity-analysis.tsx
│       │   └── action-plan.tsx
│       └── export/
│           └── pdf-generator.tsx
├── components/
│   ├── forms/
│   │   ├── FormField.tsx
│   │   ├── CurrencyInput.tsx
│   │   ├── PercentageInput.tsx
│   │   ├── AgeInput.tsx
│   │   └── ValidationMessage.tsx
│   ├── charts/
│   │   ├── SuccessRateGauge.tsx
│   │   ├── ProjectionChart.tsx
│   │   ├── AllocationPieChart.tsx
│   │   └── SensitivityBarChart.tsx
│   ├── ui/
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Tooltip.tsx
│   │   ├── ProgressBar.tsx
│   │   ├── Alert.tsx
│   │   └── Modal.tsx
│   └── calculator/
│       ├── ProgressStepper.tsx
│       ├── SuggestionCard.tsx
│       ├── ScenarioTable.tsx
│       └── ConfidenceIndicator.tsx
├── lib/
│   ├── calculations/
│   │   ├── super-contributions.ts
│   │   ├── age-pension.ts
│   │   ├── investment-returns.ts
│   │   ├── property-cashflow.ts
│   │   ├── tax-calculations.ts
│   │   └── monte-carlo.ts
│   ├── suggestions/
│   │   ├── suggestion-engine.ts
│   │   ├── contribution-optimizer.ts
│   │   ├── pension-optimizer.ts
│   │   └── scenario-generator.ts
│   ├── constants/
│   │   ├── australian-rates.ts
│   │   ├── tax-brackets.ts
│   │   └── afsa-standards.ts
│   ├── utils/
│   │   ├── currency-formatter.ts
│   │   ├── date-helpers.ts
│   │   ├── validation-schemas.ts
│   │   └── storage.ts
│   └── types/
│       ├── retirement-profile.ts
│       ├── calculation-results.ts
│       └── suggestions.ts
├── context/
│   └── RetirementProfileContext.tsx
├── hooks/
│   ├── useRetirementProfile.ts
│   ├── useCalculations.ts
│   ├── useMonteCarloSimulation.ts
│   └── useAutoSave.ts
└── workers/
    └── monte-carlo.worker.ts
```

---

## PHASE 1: ONBOARDING FLOW (Priority Implementation)

### Step 1: Household Profile

```typescript
// src/app/calculator/onboarding/step1-household.tsx

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRetirementProfile } from '@/hooks/useRetirementProfile';

const householdSchema = z.object({
  type: z.enum(['single', 'couple']),
  primaryAge: z.number().min(18).max(100),
  partnerAge: z.number().min(18).max(100).optional(),
  childrenUnder18: z.number().min(0).max(10),
  childrenAdult: z.number().min(0).max(10),
  elderlyParents: z.boolean(),
  otherDependents: z.boolean(),
  primaryRetirementAge: z.number().min(55).max(75),
  partnerRetirementAge: z.number().min(55).max(75).optional(),
}).refine(
  (data) => {
    if (data.type === 'couple' && !data.partnerAge) {
      return false;
    }
    return true;
  },
  {
    message: "Partner's age is required for couples",
    path: ['partnerAge'],
  }
).refine(
  (data) => {
    // Preservation age check (60 if born after 1964)
    const birthYear = new Date().getFullYear() - data.primaryAge;
    const preservationAge = birthYear >= 1964 ? 60 : 55;
    
    if (data.primaryRetirementAge < preservationAge) {
      return false;
    }
    return true;
  },
  {
    message: "Retirement age cannot be before preservation age (60 for those born after 1964)",
    path: ['primaryRetirementAge'],
  }
);

type HouseholdFormData = z.infer<typeof householdSchema>;

export function Step1Household() {
  const { profile, updateProfile, nextStep } = useRetirementProfile();
  
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm<HouseholdFormData>({
    resolver: zodResolver(householdSchema),
    defaultValues: {
      type: profile.household.type || 'single',
      primaryAge: profile.household.primaryAge || 40,
      partnerAge: profile.household.partnerAge,
      childrenUnder18: profile.household.dependents.childrenUnder18 || 0,
      childrenAdult: profile.household.dependents.childrenAdult || 0,
      elderlyParents: profile.household.dependents.elderlyParents || false,
      otherDependents: profile.household.dependents.otherDependents || false,
      primaryRetirementAge: profile.retirement.primaryRetirementAge || 67,
      partnerRetirementAge: profile.retirement.partnerRetirementAge,
    },
  });
  
  const householdType = watch('type');
  const primaryAge = watch('primaryAge');
  
  // Calculate preservation age dynamically
  const birthYear = new Date().getFullYear() - primaryAge;
  const preservationAge = birthYear >= 1964 ? 60 : 55;
  
  const onSubmit = (data: HouseholdFormData) => {
    updateProfile({
      household: {
        type: data.type,
        primaryAge: data.primaryAge,
        partnerAge: data.partnerAge,
        dependents: {
          childrenUnder18: data.childrenUnder18,
          childrenAdult: data.childrenAdult,
          elderlyParents: data.elderlyParents,
          otherDependents: data.otherDependents,
        },
      },
      retirement: {
        ...profile.retirement,
        primaryRetirementAge: data.primaryRetirementAge,
        partnerRetirementAge: data.partnerRetirementAge,
      },
    });
    nextStep();
  };
  
  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Let's understand your situation
        </h1>
        <p className="text-gray-600">
          This helps us tailor calculations to your household
        </p>
      </div>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Household Type */}
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            ① Your Household
          </label>
          
          <div className="grid grid-cols-2 gap-4">
            <label className={`
              relative flex items-center justify-center p-4 border-2 rounded-lg cursor-pointer
              ${householdType === 'single' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
            `}>
              <input
                type="radio"
                value="single"
                {...register('type')}
                className="sr-only"
              />
              <span className="text-lg font-medium">Single person</span>
            </label>
            
            <label className={`
              relative flex items-center justify-center p-4 border-2 rounded-lg cursor-pointer
              ${householdType === 'couple' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
            `}>
              <input
                type="radio"
                value="couple"
                {...register('type')}
                className="sr-only"
              />
              <span className="text-lg font-medium">Couple</span>
            </label>
          </div>
        </div>
        
        {/* Dependents */}
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
          <label className="block text-sm font-medium text-gray-700 mb-4">
            ② Dependents (Select all that apply)
          </label>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-2">
                Children under 18 at home
              </label>
              <input
                type="number"
                {...register('childrenUnder18', { valueAsNumber: true })}
                min="0"
                max="10"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm text-gray-600 mb-2">
                Adult children (18+) at home
              </label>
              <input
                type="number"
                {...register('childrenAdult', { valueAsNumber: true })}
                min="0"
                max="10"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                {...register('elderlyParents')}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                Elderly parents/relatives dependent on you
              </span>
            </label>
            
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                {...register('otherDependents')}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                Other dependents (disability support, etc.)
              </span>
            </label>
          </div>
        </div>
        
        {/* Ages */}
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
          <label className="block text-sm font-medium text-gray-700 mb-4">
            ③ Your Age(s)
          </label>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-2">
                Your age
              </label>
              <input
                type="number"
                {...register('primaryAge', { valueAsNumber: true })}
                min="18"
                max="100"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              {errors.primaryAge && (
                <p className="mt-1 text-sm text-red-600">{errors.primaryAge.message}</p>
              )}
            </div>
            
            {householdType === 'couple' && (
              <div>
                <label className="block text-sm text-gray-600 mb-2">
                  Partner's age
                </label>
                <input
                  type="number"
                  {...register('partnerAge', { valueAsNumber: true })}
                  min="18"
                  max="100"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                {errors.partnerAge && (
                  <p className="mt-1 text-sm text-red-600">{errors.partnerAge.message}</p>
                )}
              </div>
            )}
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>ℹ️ This determines:</strong> Contribution caps, preservation age ({preservationAge}),
              Age Pension eligibility (67), and timeline projections
            </p>
          </div>
        </div>
        
        {/* Retirement Age */}
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
          <label className="block text-sm font-medium text-gray-700 mb-4">
            ④ Target Retirement Age
          </label>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-2">
                You
              </label>
              <input
                type="number"
                {...register('primaryRetirementAge', { valueAsNumber: true })}
                min="55"
                max="75"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              {errors.primaryRetirementAge && (
                <p className="mt-1 text-sm text-red-600">{errors.primaryRetirementAge.message}</p>
              )}
            </div>
            
            {householdType === 'couple' && (
              <div>
                <label className="block text-sm text-gray-600 mb-2">
                  Partner
                </label>
                <input
                  type="number"
                  {...register('partnerRetirementAge', { valueAsNumber: true })}
                  min="55"
                  max="75"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
          </div>
          
          <div className="mt-4 space-y-2">
            <div className="p-4 bg-amber-50 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>⚠️ Preservation age: {preservationAge}</strong> (born {birthYear >= 1964 ? 'after' : 'before'} 1964)
              </p>
            </div>
            {watch('primaryRetirementAge') < preservationAge && (
              <div className="p-4 bg-amber-100 rounded-lg">
                <p className="text-sm text-amber-900">
                  <strong>💡 Retiring before preservation age?</strong> We'll model bridge accounts
                  and transition strategies for you.
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* Submit */}
        <div className="flex justify-between items-center pt-6">
          <button
            type="button"
            className="px-6 py-2 text-gray-600 hover:text-gray-800"
            onClick={() => window.history.back()}
          >
            ← Back
          </button>
          
          <button
            type="submit"
            disabled={!isValid}
            className={`
              px-8 py-3 rounded-lg font-medium text-white transition-colors
              ${isValid 
                ? 'bg-blue-600 hover:bg-blue-700' 
                : 'bg-gray-300 cursor-not-allowed'
              }
            `}
          >
            Continue to Financial Snapshot →
          </button>
        </div>
      </form>
    </div>
  );
}
```

### Step 2: Financial Snapshot

```typescript
// src/app/calculator/onboarding/step2-financial.tsx

'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRetirementProfile } from '@/hooks/useRetirementProfile';
import { CurrencyInput } from '@/components/forms/CurrencyInput';
import { AUSTRALIAN_RATES_2025_26 } from '@/lib/constants/australian-rates';

const financialSchema = z.object({
  // Superannuation
  primarySuperBalance: z.number().min(0),
  partnerSuperBalance: z.number().min(0).optional(),
  primaryTSB: z.number().min(0),
  partnerTSB: z.number().min(0).optional(),
  employerContributions: z.number().min(0),
  voluntaryContributions: z.number().min(0),
  partnerEmployerContrib: z.number().min(0).optional(),
  partnerVoluntaryContrib: z.number().min(0).optional(),
  tsbUnder500k: z.boolean(),
  
  // Income
  primaryIncome: z.number().min(0),
  partnerIncome: z.number().min(0).optional(),
  otherIncome: z.number().min(0).optional(),
  
  // Non-super assets
  savings: z.number().min(0),
  shares: z.number().min(0),
  termDeposits: z.number().min(0),
  otherInvestments: z.number().min(0),
}).refine(
  (data) => {
    // Check concessional cap
    const totalConcessional = data.employerContributions + data.voluntaryContributions;
    if (totalConcessional > AUSTRALIAN_RATES_2025_26.CONCESSIONAL_CAP) {
      return false;
    }
    return true;
  },
  {
    message: `Total concessional contributions cannot exceed $${AUSTRALIAN_RATES_2025_26.CONCESSIONAL_CAP.toLocaleString()}/year`,
    path: ['voluntaryContributions'],
  }
);

type FinancialFormData = z.infer<typeof financialSchema>;

export function Step2Financial() {
  const { profile, updateProfile, nextStep, previousStep } = useRetirementProfile();
  
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<FinancialFormData>({
    resolver: zodResolver(financialSchema),
    defaultValues: {
      primarySuperBalance: profile.super.primaryBalance || 0,
      partnerSuperBalance: profile.super.partnerBalance,
      primaryTSB: profile.super.primaryTSB || 0,
      partnerTSB: profile.super.partnerTSB,
      employerContributions: profile.super.employerContributions || 0,
      voluntaryContributions: profile.super.voluntaryContributions || 0,
      partnerEmployerContrib: profile.super.partnerEmployerContrib,
      partnerVoluntaryContrib: profile.super.partnerVoluntaryContrib,
      tsbUnder500k: false,
      primaryIncome: profile.income.primaryIncome || 0,
      partnerIncome: profile.income.partnerIncome,
      otherIncome: profile.income.otherIncome,
      savings: profile.assets.savings || 0,
      shares: profile.assets.shares || 0,
      termDeposits: profile.assets.termDeposits || 0,
      otherInvestments: profile.assets.otherInvestments || 0,
    },
  });
  
  const primaryIncome = watch('primaryIncome');
  const employerContributions = watch('employerContributions');
  const voluntaryContributions = watch('voluntaryContributions');
  const isCouple = profile.household.type === 'couple';
  
  // Auto-calculate SGC
  const calculatedSGC = primaryIncome * AUSTRALIAN_RATES_2025_26.SGC_RATE;
  
  // Check Division 293
  const isDivision293 = primaryIncome > AUSTRALIAN_RATES_2025_26.DIVISION_293_THRESHOLD;
  
  // Calculate unused cap
  const totalConcessional = employerContributions + voluntaryContributions;
  const unusedCap = AUSTRALIAN_RATES_2025_26.CONCESSIONAL_CAP - totalConcessional;
  const capUtilization = (totalConcessional / AUSTRALIAN_RATES_2025_26.CONCESSIONAL_CAP) * 100;
  
  const onSubmit = (data: FinancialFormData) => {
    updateProfile({
      super: {
        primaryBalance: data.primarySuperBalance,
        partnerBalance: data.partnerSuperBalance,
        primaryTSB: data.primaryTSB,
        partnerTSB: data.partnerTSB,
        employerContributions: data.employerContributions,
        voluntaryContributions: data.voluntaryContributions,
        partnerEmployerContrib: data.partnerEmployerContrib,
        partnerVoluntaryContrib: data.partnerVoluntaryContrib,
      },
      income: {
        primaryIncome: data.primaryIncome,
        partnerIncome: data.partnerIncome,
        otherIncome: data.otherIncome,
      },
      assets: {
        savings: data.savings,
        shares: data.shares,
        termDeposits: data.termDeposits,
        otherInvestments: data.otherInvestments,
      },
    });
    nextStep();
  };
  
  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Current Financial Position
        </h1>
        <p className="text-gray-600">
          Your starting point determines your destination
        </p>
      </div>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Superannuation */}
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900">① Superannuation</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CurrencyInput
              label="Your current balance"
              {...register('primarySuperBalance', { valueAsNumber: true })}
              error={errors.primarySuperBalance?.message}
            />
            
            {isCouple && (
              <CurrencyInput
                label="Partner's balance"
                {...register('partnerSuperBalance', { valueAsNumber: true })}
                error={errors.partnerSuperBalance?.message}
              />
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CurrencyInput
              label="Employer contributions (annual)"
              {...register('employerContributions', { valueAsNumber: true })}
              error={errors.employerContributions?.message}
              tooltip={`Auto-calculated SGC: $${calculatedSGC.toLocaleString()}/year (${AUSTRALIAN_RATES_2025_26.SGC_RATE * 100}%)`}
            />
            
            <CurrencyInput
              label="Your voluntary contributions (annual)"
              {...register('voluntaryContributions', { valueAsNumber: true })}
              error={errors.voluntaryContributions?.message}
            />
          </div>
          
          {/* Contribution Cap Warning */}
          <div className={`p-4 rounded-lg ${
            capUtilization > 100 ? 'bg-red-50' :
            capUtilization > 80 ? 'bg-amber-50' :
            capUtilization < 50 ? 'bg-blue-50' :
            'bg-green-50'
          }`}>
            <p className={`text-sm ${
              capUtilization > 100 ? 'text-red-800' :
              capUtilization > 80 ? 'text-amber-800' :
              capUtilization < 50 ? 'text-blue-800' :
              'text-green-800'
            }`}>
              <strong>
                {capUtilization > 100 && '⚠️ Over contribution cap!'}
                {capUtilization <= 100 && capUtilization > 80 && '✓ Near cap'}
                {capUtilization <= 80 && capUtilization >= 50 && '✓ Good utilization'}
                {capUtilization < 50 && '💡 Opportunity to increase'}
              </strong>
              <br />
              Using ${totalConcessional.toLocaleString()} of ${AUSTRALIAN_RATES_2025_26.CONCESSIONAL_CAP.toLocaleString()} cap ({capUtilization.toFixed(0)}%)
              {unusedCap > 0 && (
                <> • ${unusedCap.toLocaleString()} unused</>
              )}
            </p>
          </div>
        </div>
        
        {/* TSB History for Catch-up */}
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            ② Super Balance History (for catch-up calculations)
          </h2>
          
          <CurrencyInput
            label="Total Super Balance 30 June 2024"
            {...register('primaryTSB', { valueAsNumber: true })}
            error={errors.primaryTSB?.message}
          />
          
          <div className="space-y-2">
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                {...register('tsbUnder500k')}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                Was your TSB under $500k anytime 2020-2024?
              </span>
            </label>
          </div>
          
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Why we ask this?</strong> Unlocks $30k+ catch-up contributions if you have unused caps from previous years
            </p>
          </div>
        </div>
        
        {/* Income */}
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">③ Income</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CurrencyInput
              label="Your pre-tax income (annual)"
              {...register('primaryIncome', { valueAsNumber: true })}
              error={errors.primaryIncome?.message}
            />
            
            {isCouple && (
              <CurrencyInput
                label="Partner's income (annual)"
                {...register('partnerIncome', { valueAsNumber: true })}
                error={errors.partnerIncome?.message}
              />
            )}
          </div>
          
          {isDivision293 && (
            <div className="p-4 bg-amber-50 rounded-lg">
              <p className="text-sm text-amber-800">
                <strong>⚠️ Income &gt;$250k?</strong> Division 293 tax applies (15% extra on super contributions)
              </p>
            </div>
          )}
        </div>
        
        {/* Non-Super Assets */}
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">④ Non-Super Savings & Investments</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CurrencyInput
              label="Savings accounts"
              {...register('savings', { valueAsNumber: true })}
              error={errors.savings?.message}
            />
            
            <CurrencyInput
              label="Shares/ETFs/Managed funds"
              {...register('shares', { valueAsNumber: true })}
              error={errors.shares?.message}
            />
            
            <CurrencyInput
              label="Term deposits"
              {...register('termDeposits', { valueAsNumber: true })}
              error={errors.termDeposits?.message}
            />
            
            <CurrencyInput
              label="Other investments"
              {...register('otherInvestments', { valueAsNumber: true })}
              error={errors.otherInvestments?.message}
            />
          </div>
        </div>
        
        {/* Navigation */}
        <div className="flex justify-between items-center pt-6">
          <button
            type="button"
            onClick={previousStep}
            className="px-6 py-2 text-gray-600 hover:text-gray-800"
          >
            ← Back
          </button>
          
          <button
            type="submit"
            disabled={!isValid}
            className={`
              px-8 py-3 rounded-lg font-medium text-white transition-colors
              ${isValid 
                ? 'bg-blue-600 hover:bg-blue-700' 
                : 'bg-gray-300 cursor-not-allowed'
              }
            `}
          >
            Continue to Assets & Property →
          </button>
        </div>
      </form>
    </div>
  );
}
```

---

## PHASE 2: CALCULATION ENGINE

### Monte Carlo Worker

```typescript
// src/workers/monte-carlo.worker.ts

interface WorkerMessage {
  profile: RetirementProfile;
  numSimulations: number;
}

interface SimulationResult {
  success: boolean;
  finalBalance: number;
  depletionAge: number | null;
  yearByYear: YearProjection[];
}

self.addEventListener('message', (e: MessageEvent<WorkerMessage>) => {
  const { profile, numSimulations } = e.data;
  
  const results: SimulationResult[] = [];
  
  for (let i = 0; i < numSimulations; i++) {
    results.push(runSingleSimulation(profile));
  }
  
  // Calculate statistics
  const successCount = results.filter(r => r.success).length;
  const successRate = (successCount / numSimulations) * 100;
  
  const finalBalances = results.map(r => r.finalBalance).sort((a, b) => a - b);
  const medianBalance = finalBalances[Math.floor(finalBalances.length / 2)];
  const percentile25Balance = finalBalances[Math.floor(finalBalances.length * 0.25)];
  const percentile75Balance = finalBalances[Math.floor(finalBalances.length * 0.75)];
  
  // Calculate median depletion age from failed scenarios
  const failedScenarios = results.filter(r => !r.success);
  let depletionAge = null;
  if (failedScenarios.length > 0) {
    const depletionAges = failedScenarios
      .map(r => r.depletionAge)
      .filter((age): age is number => age !== null)
      .sort((a, b) => a - b);
    depletionAge = depletionAges[Math.floor(depletionAges.length / 2)];
  }
  
  // Calculate median year-by-year projections
  const yearByYearMedian = calculateMedianProjections(results, profile);
  
  const result: MonteCarloResult = {
    successRate,
    medianBalance,
    percentile25Balance,
    percentile75Balance,
    depletionAge,
    yearByYearMedian,
  };
  
  self.postMessage(result);
});

function runSingleSimulation(profile: RetirementProfile): SimulationResult {
  const VOLATILITY = 0.15; // 15% standard deviation
  const INFLATION_RATE = 0.025; // 2.5% inflation
  
  let superBalance = profile.super.primaryBalance + (profile.super.partnerBalance || 0);
  let nonSuperAssets = 
    profile.assets.savings + 
    profile.assets.shares + 
    profile.assets.termDeposits + 
    profile.assets.otherInvestments;
  
  const currentAge = profile.household.primaryAge;
  const retirementAge = profile.retirement.primaryRetirementAge;
  const lifeExpectancy = profile.retirement.lifeExpectancy || 95;
  const targetSpending = profile.retirement.targetSpending;
  
  const yearByYear: YearProjection[] = [];
  let depletionAge: number | null = null;
  
  // ACCUMULATION PHASE (current age → retirement)
  for (let age = currentAge; age < retirementAge; age++) {
    const yearlyContrib = 
      profile.super.employerContributions + 
      profile.super.voluntaryContributions +
      (profile.super.partnerEmployerContrib || 0) +
      (profile.super.partnerVoluntaryContrib || 0);
    
    const returnRate = calculatePortfolioReturn(profile.investment.preRetirement);
    const actualReturn = returnRate + randomNormal(0, VOLATILITY);
    
    superBalance = superBalance * (1 + actualReturn) + yearlyContrib;
    nonSuperAssets = nonSuperAssets * (1 + actualReturn * 0.8); // Non-super less aggressive
    
    yearByYear.push({
      year: new Date().getFullYear() + (age - currentAge),
      age,
      superBalance,
      totalNetWorth: superBalance + nonSuperAssets + calculatePropertyValue(profile, age),
      withdrawal: 0,
      agePension: 0,
      propertyIncome: 0,
      healthcareCosts: 0,
      agedCareCosts: 0,
    });
  }
  
  // DRAWDOWN PHASE (retirement → life expectancy)
  for (let age = retirementAge; age <= lifeExpectancy; age++) {
    const returnRate = calculatePortfolioReturn(profile.investment.postRetirement);
    const actualReturn = returnRate + randomNormal(0, VOLATILITY);
    
    // Calculate Age Pension
    const totalAssets = superBalance + nonSuperAssets;
    const agePension = calculateAgePension(
      age,
      profile.household.type === 'couple',
      totalAssets,
      0, // Simplified: would need deemed income calculation
      profile.property.primaryResidence?.owned || false
    ).annualAmount;
    
    // Calculate property income
    const propertyIncome = calculatePropertyIncome(profile, age);
    
    // Calculate expenses
    const yearsInRetirement = age - retirementAge;
    const inflatedSpending = targetSpending * Math.pow(1 + INFLATION_RATE, yearsInRetirement);
    const healthcareCosts = calculateHealthcareCosts(age);
    const agedCareAge = profile.retirement.agedCareAge || 82;
    const agedCareCosts = age >= agedCareAge 
      ? calculateAgedCareCosts(age, totalAssets) 
      : 0;
    
    const totalNeeded = inflatedSpending + healthcareCosts + agedCareCosts;
    const totalIncome = agePension + propertyIncome;
    const withdrawal = Math.max(0, totalNeeded - totalIncome);
    
    // Withdraw from super first, then non-super
    let remainingWithdrawal = withdrawal;
    if (superBalance > 0) {
      const superWithdrawal = Math.min(superBalance, remainingWithdrawal);
      superBalance -= superWithdrawal;
      remainingWithdrawal -= superWithdrawal;
    }
    if (remainingWithdrawal > 0 && nonSuperAssets > 0) {
      const nonSuperWithdrawal = Math.min(nonSuperAssets, remainingWithdrawal);
      nonSuperAssets -= nonSuperWithdrawal;
    }
    
    // Apply returns to remaining balances
    superBalance = Math.max(0, superBalance * (1 + actualReturn));
    nonSuperAssets = Math.max(0, nonSuperAssets * (1 + actualReturn * 0.8));
    
    yearByYear.push({
      year: new Date().getFullYear() + (age - currentAge),
      age,
      superBalance,
      totalNetWorth: superBalance + nonSuperAssets + calculatePropertyValue(profile, age),
      withdrawal,
      agePension,
      propertyIncome,
      healthcareCosts,
      agedCareCosts,
    });
    
    // Check if depleted
    if (superBalance <= 0 && nonSuperAssets <= 0 && age < lifeExpectancy) {
      depletionAge = age;
      break;
    }
  }
  
  const finalBalance = superBalance + nonSuperAssets;
  const success = finalBalance > 0 || depletionAge === null;
  
  return {
    success,
    finalBalance,
    depletionAge,
    yearByYear,
  };
}

function calculatePortfolioReturn(allocation: {
  ausShares: number;
  intlShares: number;
  property: number;
  fixedIncome: number;
  cash: number;
}): number {
  const returns = {
    ausShares: 0.085,
    intlShares: 0.082,
    property: 0.065,
    fixedIncome: 0.045,
    cash: 0.025,
  };
  
  return (
    (allocation.ausShares / 100) * returns.ausShares +
    (allocation.intlShares / 100) * returns.intlShares +
    (allocation.property / 100) * returns.property +
    (allocation.fixedIncome / 100) * returns.fixedIncome +
    (allocation.cash / 100) * returns.cash
  );
}

function randomNormal(mean: number, stdDev: number): number {
  // Box-Muller transform for normal distribution
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stdDev;
}

function calculateHealthcareCosts(age: number): number {
  if (age < 70) return 3000;
  if (age < 75) return 4500;
  if (age < 80) return 6000;
  if (age < 85) return 8500;
  return 12000;
}

function calculateAgedCareCosts(age: number, assets: number): number {
  const baseHomeCare = 25000;
  
  if (assets > 200000) {
    return baseHomeCare + (assets - 200000) * 0.015;
  }
  
  return baseHomeCare;
}

function calculatePropertyIncome(profile: RetirementProfile, age: number): number {
  let totalIncome = 0;
  
  for (const property of profile.property.investmentProperties || []) {
    // Check if still held
    if (property.planToSellAge && age >= property.planToSellAge) {
      continue; // Property sold
    }
    
    const annualRent = property.rentalIncome * 52;
    const netIncome = annualRent - property.annualExpenses;
    totalIncome += netIncome;
  }
  
  return totalIncome;
}

function calculatePropertyValue(profile: RetirementProfile, age: number): number {
  let totalValue = 0;
  
  // Primary residence (if owned)
  if (profile.property.primaryResidence?.owned) {
    const equity = profile.property.primaryResidence.value - profile.property.primaryResidence.mortgageOwing;
    totalValue += equity;
  }
  
  // Investment properties
  for (const property of profile.property.investmentProperties || []) {
    if (!property.planToSellAge || age < property.planToSellAge) {
      const equity = property.value - property.loanOwing;
      totalValue += equity;
    }
  }
  
  return totalValue;
}

function calculateAgePension(
  age: number,
  isCouple: boolean,
  assets: number,
  income: number,
  isHomeowner: boolean
): { annualAmount: number } {
  const rates = {
    AGE_ELIGIBILITY: 67,
    MAX_SINGLE: 27600,
    MAX_COUPLE_COMBINED: 41600,
    ASSET_TEST_SINGLE_HOMEOWNER: 314000,
    ASSET_TEST_COUPLE_HOMEOWNER: 470000,
    ASSET_TEST_SINGLE_NON_HOMEOWNER: 566000,
    ASSET_TEST_COUPLE_NON_HOMEOWNER: 722000,
    INCOME_TEST_SINGLE: 5512,
    INCOME_TEST_COUPLE: 8736,
    ASSET_TAPER_RATE: 0.075,
    INCOME_TAPER_RATE: 0.50,
  };
  
  if (age < rates.AGE_ELIGIBILITY) {
    return { annualAmount: 0 };
  }
  
  const assetThreshold = isCouple 
    ? (isHomeowner ? rates.ASSET_TEST_COUPLE_HOMEOWNER : rates.ASSET_TEST_COUPLE_NON_HOMEOWNER)
    : (isHomeowner ? rates.ASSET_TEST_SINGLE_HOMEOWNER : rates.ASSET_TEST_SINGLE_NON_HOMEOWNER);
  
  const incomeThreshold = isCouple ? rates.INCOME_TEST_COUPLE : rates.INCOME_TEST_SINGLE;
  const maxPension = isCouple ? rates.MAX_COUPLE_COMBINED : rates.MAX_SINGLE;
  
  let pensionAssetTest = maxPension;
  if (assets > assetThreshold) {
    const excessAssets = assets - assetThreshold;
    const reduction = (excessAssets / 1000) * rates.ASSET_TAPER_RATE * 26;
    pensionAssetTest = Math.max(0, maxPension - reduction);
  }
  
  let pensionIncomeTest = maxPension;
  if (income > incomeThreshold) {
    const excessIncome = income - incomeThreshold;
    const reduction = excessIncome * rates.INCOME_TAPER_RATE;
    pensionIncomeTest = Math.max(0, maxPension - reduction);
  }
  
  const finalPension = Math.min(pensionAssetTest, pensionIncomeTest);
  
  return { annualAmount: finalPension };
}

function calculateMedianProjections(
  results: SimulationResult[],
  profile: RetirementProfile
): YearProjection[] {
  const allYears = results[0].yearByYear.length;
  const medianProjections: YearProjection[] = [];
  
  for (let i = 0; i < allYears; i++) {
    const yearData = results.map(r => r.yearByYear[i]).filter(Boolean);
    
    if (yearData.length === 0) continue;
    
    const sorted = {
      superBalance: yearData.map(y => y.superBalance).sort((a, b) => a - b),
      totalNetWorth: yearData.map(y => y.totalNetWorth).sort((a, b) => a - b),
      withdrawal: yearData.map(y => y.withdrawal).sort((a, b) => a - b),
      agePension: yearData.map(y => y.agePension).sort((a, b) => a - b),
      propertyIncome: yearData.map(y => y.propertyIncome).sort((a, b) => a - b),
      healthcareCosts: yearData.map(y => y.healthcareCosts).sort((a, b) => a - b),
      agedCareCosts: yearData.map(y => y.agedCareCosts).sort((a, b) => a - b),
    };
    
    const medianIndex = Math.floor(sorted.superBalance.length / 2);
    
    medianProjections.push({
      year: yearData[0].year,
      age: yearData[0].age,
      superBalance: sorted.superBalance[medianIndex],
      totalNetWorth: sorted.totalNetWorth[medianIndex],
      withdrawal: sorted.withdrawal[medianIndex],
      agePension: sorted.agePension[medianIndex],
      propertyIncome: sorted.propertyIncome[medianIndex],
      healthcareCosts: sorted.healthcareCosts[medianIndex],
      agedCareCosts: sorted.agedCareCosts[medianIndex],
    });
  }
  
  return medianProjections;
}
```

---

## PHASE 3: RESULTS DASHBOARD

### Confidence Score Component

```typescript
// src/app/calculator/results/confidence-score.tsx

'use client';

import { MonteCarloResult } from '@/lib/types/calculation-results';

interface ConfidenceScoreProps {
  result: MonteCarloResult;
  targetSpending: number;
}

export function ConfidenceScore({ result, targetSpending }: ConfidenceScoreProps) {
  const { successRate, medianBalance, depletionAge } = result;
  
  // Calculate confidence score (0-100)
  const confidenceScore = Math.round(
    successRate * 0.7 + // 70% weight on success rate
    (medianBalance > targetSpending * 5 ? 30 : (medianBalance / (targetSpending * 5)) * 30) // 30% on balance adequacy
  );
  
  // Determine color and status
  const getScoreColor = (score: number) => {
    if (score >= 90) return { bg: 'bg-green-500', text: 'text-green-700', status: '🟢', label: 'Excellent' };
    if (score >= 75) return { bg: 'bg-lime-500', text: 'text-lime-700', status: '🟡', label: 'Good' };
    if (score >= 60) return { bg: 'bg-yellow-500', text: 'text-yellow-700', status: '🟡', label: 'Moderate' };
    if (score >= 40) return { bg: 'bg-orange-500', text: 'text-orange-700', status: '🟠', label: 'Needs Attention' };
    return { bg: 'bg-red-500', text: 'text-red-700', status: '🔴', label: 'Action Required' };
  };
  
  const scoreColor = getScoreColor(confidenceScore);
  
  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-8 shadow-lg">
      <div className="text-center mb-6">
        <h2 className="text-sm font-medium text-gray-600 mb-2">
          YOUR RETIREMENT CONFIDENCE SCORE
        </h2>
        <div className="relative inline-block">
          <svg className="w-48 h-48" viewBox="0 0 200 200">
            {/* Background circle */}
            <circle
              cx="100"
              cy="100"
              r="80"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="20"
            />
            {/* Foreground circle (score) */}
            <circle
              cx="100"
              cy="100"
              r="80"
              fill="none"
              stroke={scoreColor.bg.replace('bg-', '#')}
              strokeWidth="20"
              strokeDasharray={`${(confidenceScore / 100) * 502.4} 502.4`}
              strokeLinecap="round"
              transform="rotate(-90 100 100)"
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-5xl font-bold text-gray-900">{confidenceScore}</span>
            <span className="text-sm text-gray-600">/100</span>
          </div>
        </div>
        <p className={`mt-4 text-lg font-semibold ${scoreColor.text}`}>
          {scoreColor.status} {scoreColor.label}
        </p>
        <p className="mt-2 text-sm text-gray-600">
          Based on 10,000 Monte Carlo simulations
        </p>
      </div>
      
      <div className="border-t border-gray-300 pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Success Rate</span>
          <span className="text-lg font-semibold text-gray-900">{successRate.toFixed(0)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`${scoreColor.bg} h-3 rounded-full transition-all duration-1000`}
            style={{ width: `${successRate}%` }}
          />
        </div>
        <p className="text-sm text-gray-600">
          ✓ In {successRate.toFixed(0)}% of scenarios, your money lasts to life expectancy
          {depletionAge && (
            <>
              <br />⚠ In {(100 - successRate).toFixed(0)}% of scenarios, funds depleted by age {depletionAge}
            </>
          )}
        </p>
      </div>
    </div>
  );
}
```

### Quick Wins Component

```typescript
// src/app/calculator/results/quick-wins.tsx

'use client';

import { Suggestion } from '@/lib/types/suggestions';
import { CheckCircle, TrendingUp, Clock, AlertCircle } from 'lucide-react';

interface QuickWinsProps {
  suggestions: Suggestion[];
  onApplySuggestion: (id: string) => void;
}

export function QuickWins({ suggestions, onApplySuggestion }: QuickWinsProps) {
  const topSuggestions = suggestions.slice(0, 3);
  
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'contribution': return <TrendingUp className="w-5 h-5" />;
      case 'pension': return <CheckCircle className="w-5 h-5" />;
      case 'property': return <Clock className="w-5 h-5" />;
      default: return <AlertCircle className="w-5 h-5" />;
    }
  };
  
  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'low': return 'text-green-600 bg-green-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'high': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          🎯 Your Top Quick Wins
        </h2>
        <p className="text-gray-600">
          Small changes with big impacts - prioritized by return on effort
        </p>
      </div>
      
      {topSuggestions.map((suggestion, index) => (
        <div
          key={suggestion.id}
          className="bg-white rounded-xl shadow-lg border-2 border-gray-200 overflow-hidden hover:border-blue-500 transition-colors"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl font-bold text-blue-600">#{index + 1}</span>
                  <h3 className="text-xl font-bold text-gray-900">{suggestion.title}</h3>
                </div>
                <p className="text-gray-700 mt-2">{suggestion.description}</p>
              </div>
              <div className="ml-4">
                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getComplexityColor(suggestion.implementation.complexity)}`}>
                  {getCategoryIcon(suggestion.category)}
                  {suggestion.implementation.complexity} effort
                </span>
              </div>
            </div>
          </div>
          
          {/* Impact Section */}
          <div className="p-6 bg-gray-50">
            <h4 className="text-sm font-semibold text-gray-700 mb-4">📈 IMPACT</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                <div className="text-2xl font-bold text-green-600">
                  +{suggestion.impact.successRateChange}%
                </div>
                <div className="text-xs text-gray-600 mt-1">Success Rate</div>
              </div>
              <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                <div className="text-2xl font-bold text-blue-600">
                  ${(suggestion.impact.balanceChange / 1000).toFixed(0)}k
                </div>
                <div className="text-xs text-gray-600 mt-1">Extra at Retirement</div>
              </div>
              {suggestion.impact.pensionChange && (
                <div className="text-center p-4 bg-white rounded-lg shadow-sm">
                  <div className="text-2xl font-bold text-purple-600">
                    ${suggestion.impact.pensionChange.toLocaleString()}/yr
                  </div>
                  <div className="text-xs text-gray-600 mt-1">Age Pension Gain</div>
                </div>
              )}
            </div>
          </div>
          
          {/* Cost Section */}
          {suggestion.cost.netCost !== 0 && (
            <div className="p-6 border-t">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">💰 COST</h4>
              <div className="space-y-2 text-sm">
                {suggestion.cost.upfrontCost > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Upfront:</span>
                    <span className="font-medium">${suggestion.cost.upfrontCost.toLocaleString()}</span>
                  </div>
                )}
                {suggestion.cost.ongoingCost !== 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ongoing:</span>
                    <span className="font-medium">${Math.abs(suggestion.cost.ongoingCost).toLocaleString()}/year</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-gray-700 font-medium">Net Cost:</span>
                  <span className="font-bold text-gray-900">
                    ${suggestion.cost.netCost.toLocaleString()}/year
                  </span>
                </div>
              </div>
            </div>
          )}
          
          {/* Implementation Steps */}
          <div className="p-6 border-t bg-blue-50">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">HOW TO DO IT</h4>
            <ol className="space-y-2">
              {suggestion.implementation.steps.map((step, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-medium">
                    {i + 1}
                  </span>
                  <span className="text-gray-700 pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
            
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-gray-600">
                ⏱ Time to implement: <strong>{suggestion.implementation.timeToImplement}</strong>
              </span>
              <button
                onClick={() => onApplySuggestion(suggestion.id)}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                Apply This Strategy →
              </button>
            </div>
          </div>
          
          {/* Reasoning */}
          <div className="p-6 border-t bg-gray-50">
            <p className="text-sm text-gray-700">
              <strong>💡 Why this works:</strong> {suggestion.reasoning}
            </p>
          </div>
        </div>
      ))}
      
      {suggestions.length > 3 && (
        <div className="text-center pt-4">
          <button className="px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors">
            Show {suggestions.length - 3} More Strategies →
          </button>
        </div>
      )}
    </div>
  );
}
```

---

## PHASE 4: PDF EXPORT

```typescript
// src/app/calculator/export/pdf-generator.tsx

'use client';

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { RetirementProfile } from '@/lib/types/retirement-profile';
import { MonteCarloResult } from '@/lib/types/calculation-results';
import { Suggestion } from '@/lib/types/suggestions';

export function generatePDF(
  profile: RetirementProfile,
  result: MonteCarloResult,
  suggestions: Suggestion[]
) {
  const doc = new jsPDF();
  let yPos = 20;
  
  // Title
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Retirement Confidence Report', 20, yPos);
  
  yPos += 10;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, yPos);
  
  // Confidence Score
  yPos += 15;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0);
  doc.text('Confidence Score', 20, yPos);
  
  yPos += 10;
  doc.setFontSize(48);
  const confidenceScore = Math.round(result.successRate * 0.7 + 30);
  doc.text(`${confidenceScore}/100`, 20, yPos);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  yPos += 10;
  doc.text(`Success Rate: ${result.successRate.toFixed(0)}%`, 20, yPos);
  
  // Executive Summary
  doc.addPage();
  yPos = 20;
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Executive Summary', 20, yPos);
  
  yPos += 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  
  const summaryText = [
    `Your retirement plan has a ${result.successRate.toFixed(0)}% success rate based on 10,000 simulations.`,
    result.successRate >= 90 
      ? 'Your retirement is well-funded and secure.'
      : result.successRate >= 75
      ? 'Your retirement is on track but has room for improvement.'
      : 'Your retirement plan needs attention. Implement the quick wins to improve outcomes.',
    '',
    `Median retirement balance: $${(result.medianBalance / 1000).toFixed(0)}k`,
    result.depletionAge 
      ? `In failure scenarios, funds typically deplete around age ${result.depletionAge}`
      : 'Funds last through life expectancy in most scenarios',
  ];
  
  summaryText.forEach(line => {
    doc.text(line, 20, yPos);
    yPos += 6;
  });
  
  // Top 3 Recommendations
  doc.addPage();
  yPos = 20;
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Top 3 Recommendations', 20, yPos);
  
  yPos += 15;
  suggestions.slice(0, 3).forEach((suggestion, index) => {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`#${index + 1}: ${suggestion.title}`, 20, yPos);
    
    yPos += 8;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    const descLines = doc.splitTextToSize(suggestion.description, 170);
    doc.text(descLines, 20, yPos);
    yPos += descLines.length * 6;
    
    yPos += 5;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Impact: +${suggestion.impact.successRateChange}% success rate, $${(suggestion.impact.balanceChange / 1000).toFixed(0)}k extra`, 20, yPos);
    
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    doc.text(`Implementation: ${suggestion.implementation.timeToImplement} • ${suggestion.implementation.complexity} complexity`, 20, yPos);
    
    yPos += 10;
    doc.setFontSize(9);
    doc.text('Steps:', 20, yPos);
    yPos += 5;
    
    suggestion.implementation.steps.forEach((step, i) => {
      const stepLines = doc.splitTextToSize(`${i + 1}. ${step}`, 165);
      doc.text(stepLines, 25, yPos);
      yPos += stepLines.length * 5;
    });
    
    yPos += 10;
    
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
  });
  
  // Year-by-Year Projection Table
  doc.addPage();
  yPos = 20;
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Year-by-Year Projection', 20, yPos);
  
  const tableData = result.yearByYearMedian
    .filter((_, i) => i % 5 === 0) // Every 5 years
    .map(year => [
      year.age.toString(),
      `$${(year.superBalance / 1000).toFixed(0)}k`,
      `$${(year.totalNetWorth / 1000).toFixed(0)}k`,
      `$${(year.withdrawal / 1000).toFixed(0)}k`,
      `$${(year.agePension / 1000).toFixed(0)}k`,
    ]);
  
  autoTable(doc, {
    startY: yPos + 10,
    head: [['Age', 'Super Balance', 'Net Worth', 'Withdrawal', 'Age Pension']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [59, 130, 246] },
  });
  
  // Action Plan
  doc.addPage();
  yPos = 20;
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Your Retirement Action Roadmap', 20, yPos);
  
  yPos += 15;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('IMMEDIATE ACTIONS (This Week)', 20, yPos);
  
  yPos += 10;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  
  const immediateActions = suggestions
    .filter(s => s.implementation.timeToImplement.includes('week'))
    .slice(0, 3);
  
  immediateActions.forEach((action, i) => {
    doc.text(`☐ ${i + 1}. ${action.title}`, 20, yPos);
    yPos += 6;
    const impactText = `   Impact: +${action.impact.successRateChange}% success rate`;
    doc.text(impactText, 20, yPos);
    yPos += 8;
  });
  
  // Assumptions
  doc.addPage();
  yPos = 20;
  
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Assumptions & Methodology', 20, yPos);
  
  yPos += 15;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  
  const assumptions = [
    'Calculations based on 10,000 Monte Carlo simulations',
    `Pre-retirement return: ${(calculatePortfolioReturn(profile.investment.preRetirement) * 100).toFixed(1)}%/year`,
    `Post-retirement return: ${(calculatePortfolioReturn(profile.investment.postRetirement) * 100).toFixed(1)}%/year`,
    'Inflation: 2.5%/year',
    'Volatility: ±15% standard deviation',
    'Age Pension rates: 2025-26 financial year',
    'Concessional cap: $30,000/year',
    'Tax calculations include Medicare levy',
  ];
  
  assumptions.forEach(assumption => {
    doc.text(`• ${assumption}`, 20, yPos);
    yPos += 6;
  });
  
  // Disclaimer
  yPos += 10;
  doc.setFontSize(9);
  doc.setTextColor(100);
  const disclaimer = doc.splitTextToSize(
    'IMPORTANT: This report is for educational purposes only and does not constitute financial advice. ' +
    'Calculations are based on assumptions and projections that may not reflect actual future performance. ' +
    'Consult a licensed financial advisor before making any investment decisions. ' +
    'Past performance is not indicative of future results.',
    170
  );
  doc.text(disclaimer, 20, yPos);
  
  // Save PDF
  doc.save(`retirement-plan-${new Date().toISOString().split('T')[0]}.pdf`);
}

function calculatePortfolioReturn(allocation: any): number {
  const returns = {
    ausShares: 0.085,
    intlShares: 0.082,
    property: 0.065,
    fixedIncome: 0.045,
    cash: 0.025,
  };
  
  return (
    (allocation.ausShares / 100) * returns.ausShares +
    (allocation.intlShares / 100) * returns.intlShares +
    (allocation.property / 100) * returns.property +
    (allocation.fixedIncome / 100) * returns.fixedIncome +
    (allocation.cash / 100) * returns.cash
  );
}
```

---

## VALIDATION & ERROR HANDLING

### Validation Schemas

```typescript
// src/lib/utils/validation-schemas.ts

import { z } from 'zod';
import { AUSTRALIAN_RATES_2025_26 } from '../constants/australian-rates';

// Custom validators
const positiveNumber = z.number().min(0, 'Must be a positive number');
const age = z.number().min(18, 'Must be at least 18').max(100, 'Must be under 100');
const percentage = z.number().min(0).max(100, 'Must be between 0 and 100');

export const householdValidation = z.object({
  type: z.enum(['single', 'couple']),
  primaryAge: age,
  partnerAge: age.optional(),
  primaryRetirementAge: age,
  partnerRetirementAge: age.optional(),
})
  .refine(data => {
    if (data.type === 'couple' && !data.partnerAge) {
      return false;
    }
    return true;
  }, 'Partner age required for couples')
  .refine(data => {
    const birthYear = new Date().getFullYear() - data.primaryAge;
    const preservationAge = birthYear >= 1964 ? 60 : 55;
    return data.primaryRetirementAge >= preservationAge;
  }, 'Cannot retire before preservation age');

export const superValidation = z.object({
  primaryBalance: positiveNumber,
  partnerBalance: positiveNumber.optional(),
  employerContributions: positiveNumber,
  voluntaryContributions: positiveNumber,
})
  .refine(data => {
    const total = data.employerContributions + data.voluntaryContributions;
    return total <= AUSTRALIAN_RATES_2025_26.CONCESSIONAL_CAP;
  }, `Total concessional contributions cannot exceed $${AUSTRALIAN_RATES_2025_26.CONCESSIONAL_CAP.toLocaleString()}`);

export const investmentPropertyValidation = z.object({
  value: positiveNumber.min(1000, 'Property value must be at least $1,000'),
  loanOwing: positiveNumber,
  rentalIncome: positiveNumber,
  annualExpenses: positiveNumber,
  purchaseDate: z.date(),
  planToSellAge: age.optional().nullable(),
})
  .refine(data => {
    return data.value > data.loanOwing;
  }, 'Property value must exceed loan amount');

export const allocationValidation = z.object({
  ausShares: percentage,
  intlShares: percentage,
  property: percentage,
  fixedIncome: percentage,
  cash: percentage,
})
  .refine(data => {
    const total = 
      data.ausShares + 
      data.intlShares + 
      data.property + 
      data.fixedIncome + 
      data.cash;
    return Math.abs(total - 100) < 0.01; // Allow for rounding
  }, 'Allocation must total 100%');
```

### Error Boundary

```typescript
// src/components/ErrorBoundary.tsx

'use client';

import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Calculator error:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
            <div className="text-center">
              <div className="text-6xl mb-4">⚠️</div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Something went wrong
              </h1>
              <p className="text-gray-600 mb-6">
                We encountered an error while calculating your retirement projection.
              </p>
              
              {this.state.error && (
                <div className="mb-6 p-4 bg-red-50 rounded-lg text-left">
                  <p className="text-sm text-red-800 font-mono">
                    {this.state.error.message}
                  </p>
                </div>
              )}
              
              <div className="space-y-3">
                <button
                  onClick={() => window.location.reload()}
                  className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
                >
                  Reload Calculator
                </button>
                
                <button
                  onClick={() => {
                    localStorage.clear();
                    window.location.reload();
                  }}
                  className="w-full px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition-colors"
                >
                  Clear Data & Start Over
                </button>
              </div>
              
              <p className="mt-6 text-sm text-gray-500">
                If this persists, please contact support with the error details above.
              </p>
            </div>
          </div>
        </div>
      );
    }
    
    return this.props.children;
  }
}
```

---

## STORAGE & STATE MANAGEMENT

### Auto-save Hook

```typescript
// src/hooks/useAutoSave.ts

'use client';

import { useEffect, useRef } from 'react';
import { RetirementProfile } from '@/lib/types/retirement-profile';

const STORAGE_KEY = 'retirement_calculator_profile';
const AUTOSAVE_DELAY = 2000; // 2 seconds after last change

export function useAutoSave(profile: RetirementProfile) {
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  useEffect(() => {
    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
        console.log('Profile auto-saved');
      } catch (error) {
        console.error('Failed to save profile:', error);
      }
    }, AUTOSAVE_DELAY);
    
    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [profile]);
}

export function loadSavedProfile(): RetirementProfile | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Failed to load saved profile:', error);
  }
  return null;
}

export function clearSavedProfile() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear saved profile:', error);
  }
}
```

### Context Provider

```typescript
// src/context/RetirementProfileContext.tsx

'use client';

import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { RetirementProfile } from '@/lib/types/retirement-profile';
import { useAutoSave, loadSavedProfile } from '@/hooks/useAutoSave';

interface RetirementProfileState {
  profile: RetirementProfile;
  currentStep: number;
  isCalculating: boolean;
}

type Action =
  | { type: 'UPDATE_PROFILE'; payload: Partial<RetirementProfile> }
  | { type: 'SET_STEP'; payload: number }
  | { type: 'NEXT_STEP' }
  | { type: 'PREVIOUS_STEP' }
  | { type: 'SET_CALCULATING'; payload: boolean }
  | { type: 'RESET_PROFILE' };

interface RetirementProfileContextType extends RetirementProfileState {
  updateProfile: (updates: Partial<RetirementProfile>) => void;
  setStep: (step: number) => void;
  nextStep: () => void;
  previousStep: () => void;
  setCalculating: (calculating: boolean) => void;
  resetProfile: () => void;
}

const RetirementProfileContext = createContext<RetirementProfileContextType | undefined>(undefined);

const initialProfile: RetirementProfile = {
  household: {
    type: 'single',
    primaryAge: 40,
    dependents: {
      childrenUnder18: 0,
      childrenAdult: 0,
      elderlyParents: false,
      otherDependents: false,
    },
  },
  retirement: {
    primaryRetirementAge: 67,
    targetSpending: 51278, // AFSA comfortable single
    spendingSource: 'afsa_comfortable',
    lifeExpectancy: 95,
  },
  super: {
    primaryBalance: 0,
    primaryTSB: 0,
    employerContributions: 0,
    voluntaryContributions: 0,
  },
  income: {
    primaryIncome: 0,
  },
  assets: {
    savings: 0,
    shares: 0,
    termDeposits: 0,
    otherInvestments: 0,
  },
  property: {
    investmentProperties: [],
  },
  investment: {
    preRetirement: {
      ausShares: 40,
      intlShares: 30,
      property: 10,
      fixedIncome: 15,
      cash: 5,
    },
    postRetirement: {
      ausShares: 30,
      intlShares: 20,
      property: 10,
      fixedIncome: 30,
      cash: 10,
    },
    dividendYield: 4.2,
    frankingLevel: 80,
  },
};

function profileReducer(state: RetirementProfileState, action: Action): RetirementProfileState {
  switch (action.type) {
    case 'UPDATE_PROFILE':
      return {
        ...state,
        profile: {
          ...state.profile,
          ...action.payload,
        },
      };
    case 'SET_STEP':
      return { ...state, currentStep: action.payload };
    case 'NEXT_STEP':
      return { ...state, currentStep: Math.min(state.currentStep + 1, 5) };
    case 'PREVIOUS_STEP':
      return { ...state, currentStep: Math.max(state.currentStep - 1, 1) };
    case 'SET_CALCULATING':
      return { ...state, isCalculating: action.payload };
    case 'RESET_PROFILE':
      return {
        profile: initialProfile,
        currentStep: 1,
        isCalculating: false,
      };
    default:
      return state;
  }
}

export function RetirementProfileProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(profileReducer, {
    profile: initialProfile,
    currentStep: 1,
    isCalculating: false,
  });
  
  // Load saved profile on mount
  useEffect(() => {
    const saved = loadSavedProfile();
    if (saved) {
      dispatch({ type: 'UPDATE_PROFILE', payload: saved });
    }
  }, []);
  
  // Auto-save on changes
  useAutoSave(state.profile);
  
  const value: RetirementProfileContextType = {
    ...state,
    updateProfile: (updates) => dispatch({ type: 'UPDATE_PROFILE', payload: updates }),
    setStep: (step) => dispatch({ type: 'SET_STEP', payload: step }),
    nextStep: () => dispatch({ type: 'NEXT_STEP' }),
    previousStep: () => dispatch({ type: 'PREVIOUS_STEP' }),
    setCalculating: (calculating) => dispatch({ type: 'SET_CALCULATING', payload: calculating }),
    resetProfile: () => dispatch({ type: 'RESET_PROFILE' }),
  };
  
  return (
    <RetirementProfileContext.Provider value={value}>
      {children}
    </RetirementProfileContext.Provider>
  );
}

export function useRetirementProfile() {
  const context = useContext(RetirementProfileContext);
  if (!context) {
    throw new Error('useRetirementProfile must be used within RetirementProfileProvider');
  }
  return context;
}
```

---

## IMPLEMENTATION ROADMAP

### Phase 1: Foundation (Week 1-2)
- ✅ Set up Next.js project with TypeScript & Tailwind
- ✅ Implement data models and types
- ✅ Create Australian constants file
- ✅ Build Step 1-2 of onboarding (Household & Financial)
- ✅ Set up context and auto-save

### Phase 2: Data Collection (Week 2-3)
- ✅ Build Step 3-5 of onboarding (Property, Spending, Advanced)
- ✅ Implement form validation with Zod
- ✅ Create reusable form components (CurrencyInput, etc.)
- ✅ Add progress indicator

### Phase 3: Calculation Engine (Week 3-4)
- ✅ Implement core calculation functions (super, tax, pension)
- ✅ Build Monte Carlo worker
- ✅ Create suggestion engine
- ✅ Test calculations against known scenarios

### Phase 4: Results UI (Week 4-5)
- ✅ Build confidence score component
- ✅ Create Quick Wins display
- ✅ Implement scenario comparison table
- ✅ Add year-by-year projection chart

### Phase 5: Advanced Features (Week 5-6)
- ✅ Implement sensitivity analysis
- ✅ Build action plan generator
- ✅ Create PDF export
- ✅ Add couple-specific optimizations

### Phase 6: Polish & Testing (Week 6-7)
- ✅ Responsive design for mobile
- ✅ Error handling and validation
- ✅ Performance optimization
- ✅ User testing with each persona

### Phase 7: Launch Preparation (Week 7-8)
- ✅ Documentation
- ✅ Analytics integration
- ✅ SEO optimization
- ✅ Production deployment

---

## TESTING SCENARIOS

Create test cases for each persona:

```typescript
// src/lib/__tests__/persona-scenarios.ts

export const SARAH_HIGH_EARNER = {
  household: { type: 'single', primaryAge: 42 },
  income: { primaryIncome: 280000 },
  super: { primaryBalance: 420000, primaryTSB: 420000 },
  retirement: { primaryRetirementAge: 55 },
  // Should trigger: Division 293, early retirement bridge, high contribution optimization
};

export const MARK_LISA_BUSINESS = {
  household: { type: 'couple', primaryAge: 52, partnerAge: 50 },
  business: { value: 2400000, yearsOwned: 18, isActiveAsset: true },
  property: { investmentProperties: [/* 2-3 properties */] },
  trust: { netAssets: 850000, hasControl: true },
  // Should trigger: 15-year CGT exemption, trust attribution, property timing
};

export const ROBERT_LATE_STARTER = {
  household: { type: 'single', primaryAge: 55 },
  super: { primaryBalance: 145000, primaryTSB: 145000 },
  property: { primaryResidence: { value: 650000, owned: true } },
  // Should trigger: Catch-up contributions, downsizer, aggressive savings
};

export const JENNY_PENSION_MAX = {
  household: { type: 'single', primaryAge: 66 },
  super: { primaryBalance: 385000 },
  assets: { savings: 45000, shares: 32000 },
  property: { primaryResidence: { value: 480000, owned: true } },
  // Should trigger: Asset test optimization, gifting strategies, work bonus
};
```

---

## DEPLOYMENT CHECKLIST

```markdown
## Pre-Launch Checklist

### Technical
- [ ] All TypeScript errors resolved
- [ ] Monte Carlo worker functioning correctly
- [ ] PDF export generating properly
- [ ] Auto-save working across sessions
- [ ] Error boundaries in place
- [ ] Loading states for all calculations
- [ ] Mobile responsive (tested on iOS/Android)

### Content
- [ ] All Australian rates updated for 2025-26
- [ ] AFSA standards verified
- [ ] Age Pension thresholds current
- [ ] Tax brackets confirmed
- [ ] Disclaimer text reviewed

### Performance
- [ ] Monte Carlo completes in <10 seconds
- [ ] Page load time <3 seconds
- [ ] Images optimized
- [ ] Bundle size <500kb (initial)

### SEO
- [ ] Meta tags configured
- [ ] Open Graph images
- [ ] Sitemap generated
- [ ] robots.txt configured
- [ ] Structured data for FAQ/HowTo

### Legal
- [ ] Disclaimer on every page
- [ ] Privacy policy
- [ ] Terms of service
- [ ] "Not financial advice" notices
- [ ] Data storage policy

### Analytics
- [ ] Google Analytics configured
- [ ] Event tracking for key actions
- [ ] Conversion funnel tracking
- [ ] Error tracking (Sentry/similar)
```

---

**This handoff document provides Claude Code with:**
1. Complete technical specifications
2. Working code examples for all major components
3. Australian-specific calculation logic
4. Phase-by-phase implementation plan
5. Testing scenarios for each persona
6. Deployment checklist

