# AUSTRALIAN RETIREMENT CALCULATOR
## Enhancement Specification Document v1.0

**Project:** retirement.gagneet.com Enhancement  
**Date:** September 29, 2025  
**Purpose:** Enhance existing calculator with persona-specific optimizations and actionable insights
**Version:** v2.0

---

## EXECUTIVE SUMMARY

### Current State Assessment
Your calculator already includes:
- ✅ Monte Carlo simulation (1,000+ runs)
- ✅ Age Pension calculations
- ✅ Healthcare and aged care modeling
- ✅ Investment property tracking
- ✅ Trust asset attribution
- ✅ Dynamic allocation
- ✅ AI recommendations engine
- ✅ Scenario comparison

### Enhancement Goals
1. **Persona-Specific UX**: Tailor experience for 4 user types
2. **Actionable Suggestions**: Convert recommendations to specific dollar amounts and steps
3. **Progressive Disclosure**: Reduce cognitive overload
4. **Confidence Building**: Clear success metrics with plain language
5. **Gap Coverage**: Add missing Australian regulations (Division 293, catch-up contributions, CGT concessions)

---

## PART 1: TARGET PERSONAS

### Persona 1: Sarah (High Earner / Early Retirement)
**Profile:**
- Age: 35-50
- Income: $200k+
- Super balance: $300k-$800k
- Goal: Retire before 60

**Key Needs:**
- Division 293 tax optimization
- Bridge account strategy (pre-preservation age)
- Transfer balance cap planning
- CGT discount timing
- Non-concessional contribution strategies

**Calculator Enhancements Needed:**
- Income threshold warning at $250k
- Bridge account calculator showing years until preservation age access
- Transfer balance cap progress tracker
- Marginal tax rate display with super contribution tax benefit

---

### Persona 2: Mark & Lisa (Business/Property Owners)
**Profile:**
- Age: 45-60
- Complex assets: Business, trusts, multiple properties
- Net worth: $2M+
- Goal: Tax-efficient exit strategy

**Key Needs:**
- Small business CGT concessions (15-year exemption)
- CGT retirement exemption ($500k to super)
- Trust attribution clarity
- Multi-property cashflow modeling
- Business sale → super contribution path

**Calculator Enhancements Needed:**
- Business CGT exemption checker (15 years held = unlimited exemption)
- CGT retirement exemption calculator (under 55 deadline)
- Multiple property support with individual sale timing
- Trust control warning with optimization strategies
- Business structure impact on contributions

---

### Persona 3: Robert (Late Starter / Divorce Recovery)
**Profile:**
- Age: 50-60
- Super balance: $50k-$200k
- Goal: Catch up aggressively

**Key Needs:**
- Catch-up contribution strategies (5-year unused caps)
- Downsizer contribution eligibility ($300k from home sale)
- Work Test exemption (67-74, first year after work)
- Commonwealth Seniors Health Card thresholds
- Rent assistance if non-homeowner

**Calculator Enhancements Needed:**
- TSB history input (determines catch-up eligibility)
- Unused cap tracker showing available carry-forward
- Downsizer contribution prompt at age 55+
- "Recovery plan" wizard with milestone actions
- Rent assistance calculator

---

### Persona 4: Jenny (Pension Maximization)
**Profile:**
- Age: 60-70
- Super balance: $200k-$500k
- Goal: Maximize Age Pension + super drawdown

**Key Needs:**
- Asset test vs income test optimization
- Gifting strategies ($10k/year, $30k over 5 years)
- Work Bonus utilization ($11,800 exempt income)
- Deeming rate impacts
- Home equity access scheme
- Granny flat interest deduction

**Calculator Enhancements Needed:**
- Asset test threshold indicator (red/green zones)
- Gifting strategy calculator with deprivation period tracking
- Work Bonus calculator showing part-time work benefits
- Deeming vs actual return comparison
- "Pension maximization checklist"

---

## PART 2: AUSTRALIAN REGULATORY ENHANCEMENTS

### 2.1 Missing Calculations

#### Division 293 Tax
**What:** Extra 15% tax on concessional contributions for income >$250k

**Implementation:**
```
IF primaryIncome > $250,000 THEN
  excessIncome = primaryIncome - 250000
  taxableContrib = MIN(excessIncome, concessionalContributions)
  division293Tax = taxableContrib * 0.15
  netContribution = concessionalContributions - division293Tax
  
  DISPLAY WARNING:
  "Your income triggers Division 293 tax"
  "Extra tax: $[division293Tax]"
  "Net contribution: $[netContribution] (not $[concessionalContributions])"
END IF
```

**UI Location:** Financial input section, below income field

---

#### Catch-Up Contributions
**What:** Use unused concessional caps from last 5 years if TSB <$500k

**Implementation:**
```
IF totalSuperBalance < 500000 THEN
  // Calculate unused caps from previous years
  unusedCaps = []
  FOR year IN last5Years:
    unusedCap = 30000 - contributionsInYear[year]
    IF unusedCap > 0:
      unusedCaps.append(unusedCap)
  
  totalUnused = SUM(unusedCaps)
  maxThisYear = 30000 + totalUnused
  
  DISPLAY OPPORTUNITY:
  "💰 Catch-Up Available!"
  "You have $[totalUnused] unused cap"
  "Can contribute up to $[maxThisYear] this year"
END IF
```

**UI Location:** Super contributions section with prominent badge

---

#### Small Business CGT Concessions
**What:** 15-year exemption = unlimited CGT-free business sale to super

**Implementation:**
```
IF hasBusinessInterest AND yearsOwned >= 15 THEN
  estimatedCGT = (businessValue - costBase) * 0.5 * marginalRate
  
  DISPLAY CRITICAL OPPORTUNITY:
  "⭐ 15-YEAR CGT EXEMPTION ELIGIBLE"
  "Business held: [yearsOwned] years"
  "Estimated CGT saving: $[estimatedCGT]"
  "Can contribute sale proceeds TAX-FREE to super"
  
  ACTION: "Book tax advisor consultation (urgent!)"
END IF

IF hasBusinessInterest AND age < 55 AND yearsOwned >= 5 THEN
  retirementExemption = MIN(500000, businessValue)
  
  DISPLAY URGENT:
  "⏰ RETIREMENT EXEMPTION DEADLINE"
  "You're [age] - must act before 55!"
  "Up to $500k to super tax-free"
  "Time remaining: [55 - age] years"
END IF
```

**UI Location:** Business assets section with high-priority alert

---

#### Downsizer Contributions
**What:** Age 55+ can contribute $300k from home sale (each partner)

**Implementation:**
```
IF age >= 55 AND hasOwnedHome AND homeOwned >= 10years THEN
  downsizeAmount = 300000
  IF isCouple:
    downsizeAmount = 600000
  
  DISPLAY OPPORTUNITY:
  "🏠 Downsizer Contribution Eligible"
  "Age 55+ and owned home 10+ years"
  "Can add $[downsizeAmount] to super from home sale"
  "Not counted in contribution caps!"
  
  SCENARIO: Show projection with/without downsizing
END IF
```

**UI Location:** Property section with toggle for "Considering downsizing?"

---

#### Age Pension Work Bonus
**What:** $11,800 work income exempt from pension income test (2025-26)

**Implementation:**
```
IF age >= 67 AND agePensionEligible THEN
  workBonusLimit = 11800
  
  IF workIncome > 0 AND workIncome <= workBonusLimit THEN
    exemptAmount = workIncome
    assessableIncome = 0
  ELSE IF workIncome > workBonusLimit THEN
    exemptAmount = workBonusLimit
    assessableIncome = workIncome - workBonusLimit
  
  DISPLAY INFO:
  "Work Bonus: First $[workBonusLimit] exempt"
  "Your work income: $[workIncome]"
  "Assessable for pension: $[assessableIncome]"
  
  // Show scenario: part-time work impact
  partTimeScenario = calculatePension(workIncome: 20000)
  
  "💡 Work 8hrs/week at $35/hr = $14,560/year"
  "After Work Bonus: Only $2,760 affects pension"
  "Net gain: $11,804/year"
END IF
```

**UI Location:** Retirement income section with "Part-time work?" calculator

---

### 2.2 Enhanced Calculations

#### Deeming Rates (More Accurate)
**Current:** Appears to be simplified  
**Enhanced:** Apply actual Centrelink deeming to financial assets

```
// Financial assets subject to deeming
financialAssets = savings + shares + termDeposits + managedFunds

IF isCouple THEN
  threshold = 100200
  deemedIncome = (MIN(financialAssets, threshold) * 0.0025) +
                 (MAX(0, financialAssets - threshold) * 0.0225)
ELSE
  threshold = 60400
  deemedIncome = (MIN(financialAssets, threshold) * 0.0025) +
                 (MAX(0, financialAssets - threshold) * 0.0225)

actualIncome = (savings * savingsRate) + (shares * dividendYield) + ...

IF actualIncome < deemedIncome THEN
  DISPLAY WARNING:
  "⚠️ Deeming hurts you!"
  "Actual income: $[actualIncome]"
  "Deemed income: $[deemedIncome]"
  "Pension loss: $[difference]"
  
  SUGGESTION: "Move to higher-yield investments"
END IF
```

---

#### Gifting Strategy with Deprivation Rules
**Current:** Not visible  
**Enhanced:** Model gifting impact on Age Pension

```
giftingAnnualLimit = 10000
gifting5YearLimit = 30000

FUNCTION calculateGiftingStrategy(assetsOverThreshold):
  IF assetsOverThreshold <= 30000 THEN
    // Can fix in 3 years
    year1Gift = 10000
    year2Gift = 10000
    year3Gift = assetsOverThreshold - 20000
    
    pensionGainYear1 = 0 // Deprivation period
    pensionGainYear2 = calculatePensionIncrease(year1Gift)
    pensionGainYear3 = calculatePensionIncrease(year1Gift + year2Gift)
    
    DISPLAY PLAN:
    "3-Year Gifting Strategy"
    "Year 1: Gift $10k to children (deprivation period begins)"
    "Year 2: Gift $10k (Year 1 gift now counts, pension increases)"
    "Year 3: Gift $[year3Gift] (full optimization)"
    
    "Lifetime pension gain: $[totalGain]"
  END IF
```

---

## PART 3: UX ENHANCEMENTS

### 3.1 Progressive Disclosure System

**Problem:** Current UI shows all fields at once = cognitive overload

**Solution:** Accordion sections with smart defaults

```
HOUSEHOLD SECTION: [Expanded by default]
├─ Type: Single/Couple ✓
├─ Ages ✓
├─ Target retirement age ✓
└─ [▼ Show dependents] (collapsed unless selected)

SUPER SECTION: [Expanded]
├─ Current balance ✓
├─ Employer contributions (auto-calc SGC) ✓
├─ [▼ Voluntary contributions] (collapsed)
├─ [▼ Catch-up contributions] (auto-expand if eligible)
└─ [▼ Advanced: TSB history] (collapsed)

PROPERTY SECTION: [Collapsed]
├─ [▼ Primary residence]
├─ [▼ Investment property 1] (only if added)
└─ [+ Add another property]

BUSINESS/TRUST: [Collapsed]
└─ "Do you have business or trust assets?" [Yes/No]
    IF Yes → Expand full section
    IF No → Keep collapsed
```

**Implementation:**
- Use `<details>` HTML elements or Tailwind `disclosure` components
- Save expansion state to localStorage
- Auto-expand sections with errors or opportunities

---

### 3.2 Smart Prompts & Contextual Help

**Pattern:** Show help when relevant, hide when not

**Examples:**

```html
<!-- Division 293 Warning -->
<div class="alert alert-warning" *ngIf="income > 250000">
  <strong>⚠️ High Income Tax Impact</strong>
  <p>Your income triggers Division 293 tax (extra 15% on super contributions).</p>
  <p>Net contribution: ${{ netContribution }} (not ${{ grossContribution }})</p>
  <button>Optimize Strategy →</button>
</div>

<!-- Preservation Age Info -->
<div class="info-box" *ngIf="retirementAge < preservationAge">
  <strong>ℹ️ Early Retirement Detected</strong>
  <p>Your preservation age is {{ preservationAge }}. You'll need a bridge account for {{ preservationAge - retirementAge }} years.</p>
  <button>Model Bridge Strategy →</button>
</div>

<!-- Catch-Up Opportunity -->
<div class="alert alert-success" *ngIf="hasCatchUpEligibility">
  <strong>💰 Catch-Up Contributions Available!</strong>
  <p>You have ${{ unusedCaps }} unused cap from previous years.</p>
  <p>Maximum this year: ${{ maxContribution }} (vs standard $30k)</p>
  <button>Use Catch-Up →</button>
</div>
```

---

### 3.3 Results Dashboard Redesign

**Current:** Table-heavy, academic language  
**Enhanced:** Visual, conversational, actionable

#### Confidence Score (New Component)
```
┌─────────────────────────────────────┐
│   RETIREMENT CONFIDENCE SCORE       │
│                                     │
│           ┌───────┐                 │
│           │  73   │  🟡             │
│           │ /100  │                 │
│           └───────┘                 │
│                                     │
│   Success Rate: 73%                 │
│   ████████████████░░░░              │
│                                     │
│   ✓ Money lasts in 73% of scenarios│
│   ⚠ Runs out by age 82 in 27%      │
└─────────────────────────────────────┘
```

**Implementation:**
```javascript
confidenceScore = (successRate * 0.7) + (balanceAdequacy * 0.3)

if (confidenceScore >= 90) {
  status = { color: 'green', label: 'Excellent', emoji: '🟢' }
} else if (confidenceScore >= 75) {
  status = { color: 'lime', label: 'Good', emoji: '🟡' }
} else if (confidenceScore >= 60) {
  status = { color: 'yellow', label: 'Moderate', emoji: '🟡' }
} else {
  status = { color: 'red', label: 'Action Required', emoji: '🔴' }
}
```

---

#### Quick Wins (Enhanced AI Recommendations)

**Current:** Generic scenarios with percentage changes  
**Enhanced:** Specific dollar amounts with implementation steps

```
┌─────────────────────────────────────────────────────┐
│ 🎯 YOUR TOP 3 QUICK WINS                            │
└─────────────────────────────────────────────────────┘

╔═══════════════════════════════════════════════════╗
║ #1 MAXIMIZE CONCESSIONAL CONTRIBUTIONS            ║
║                                                    ║
║ CURRENT: $15,500/year (48% of cap unused)        ║
║ CHANGE TO: $30,000/year (+$14,500)               ║
║                                                    ║
║ 📈 IMPACT:                                         ║
║  • Success rate: 73% → 89% (+16%)                 ║
║  • Extra at retirement: +$127,300                 ║
║  • Tax saving: $3,900/year                        ║
║  • Net cost: $9,030/year (after tax)              ║
║                                                    ║
║ HOW TO DO IT:                                      ║
║  1. Increase salary sacrifice by $558/fortnight   ║
║  2. Email payroll with request                    ║
║  3. Verify on next payslip                        ║
║                                                    ║
║ ⏱ Time: 10 mins  💪 Effort: Low                    ║
║                                                    ║
║ [Apply This Strategy →]                           ║
╚═══════════════════════════════════════════════════╝

╔═══════════════════════════════════════════════════╗
║ #2 OPTIMIZE AGE PENSION (ASSET TEST)              ║
║                                                    ║
║ PROBLEM: $18,200 over threshold                   ║
║ COSTING: $2,366/year in pension                   ║
║                                                    ║
║ 📈 IMPACT:                                         ║
║  • Age Pension: $15,600 → $18,460/year            ║
║  • Lifetime benefit: $84,280 (age 67-95)          ║
║  • Success rate: 73% → 78% (+5%)                  ║
║                                                    ║
║ 3 OPTIONS:                                         ║
║  A) Gift $10k/year to kids (3 year plan)          ║
║  B) Funeral bond $15k (immediate, no depriv)      ║
║  C) Home improvements $20k (adds home value)      ║
║                                                    ║
║ ⏱ Time: 1 hour  💪 Effort: Medium             ║
║                                                    ║
║ [Compare Options →]                               ║
╚═══════════════════════════════════════════════════╝
```

---

#### Scenario Comparison Table (Enhanced)

**Current:** Academic numbers  
**Enhanced:** Plain English outcomes

| Scenario | Success | Income | Age Runs Out | What This Means |
|----------|---------|--------|--------------|-----------------|
| **Current** | 73% | $66,800/yr | Age 82 (27% risk) | Moderate risk of running out |
| **Max Contributions** | 89% ⬆️ | $74,200/yr | Age 87+ (11% risk) | ⭐ Recommended - strong outcome |
| **Delay Retirement 2yr** | 91% ⬆️ | $71,800/yr | Age 90+ (9% risk) | Very secure, requires working longer |
| **Sell Property Now** | 68% ⬇️ | $62,100/yr | Age 80 (32% risk) | ⚠️ Don't do this - higher risk |

---

### 3.4 Actionable Roadmap

**Current:** Not visible  
**Enhanced:** Timeline with specific milestones

```
┌─────────────────────────────────────────────────┐
│ 🗺️ YOUR RETIREMENT ACTION ROADMAP               │
└─────────────────────────────────────────────────┘

📅 THIS WEEK
☐ 1. Increase salary sacrifice by $558/fortnight
    Impact: +16% success rate
    Time: 30 minutes
    
☐ 2. Review super fund fees
    Check: Current 1.2% vs industry 0.85%
    Saving: $98k over retirement
    Time: 1 hour

📅 THIS MONTH
☐ 3. Optimize Age Pension position
    Reduce assets by $20k (funeral bond or gift)
    Gain: $2,860/year pension
    
☐ 4. Set up contribution splitting
    Split 85% of contributions to partner
    Equalizes super, both hit transfer cap

📅 NEXT 6 MONTHS
☐ 5. Property sale timing analysis
    Determine optimal year to sell
    Impact: $178k difference
    
☐ 6. Business exit strategy (AGE 52 → ACT BY 55!)
    15-year CGT exemption = $500k+ saving
    URGENT: Retirement exemption expires age 55

📅 ANNUAL TASKS (Every June)
☐ Review & maximize contributions
☐ Check unused cap carry-forward
☐ Complete contribution splitting
☐ Rebalance investments
☐ Update calculator figures

📅 MILESTONE TIMELINE
2025 (Now)     ✓ Max contributions + pension fix
2026-2031      ⚠ Children at uni (reduced contrib)
2027 (Age 54)  ⭐ BUSINESS SALE (before 55 deadline)
2032-2037      ↗ Catch-up phase (post-uni)
2040 (Age 67)  🎉 RETIREMENT
2043 (Age 70)  💰 Sell property (optimal timing)
2052 (Age 82)  🏥 Aged care entry
```

---

## PART 4: TECHNICAL IMPLEMENTATION

### 4.1 Data Model Extensions

**Add to existing profile:**

```typescript
interface RetirementProfile {
  // EXISTING FIELDS...
  
  // NEW: Catch-up tracking
  super: {
    // ... existing fields
    tsbHistory: {
      fy2020: number;
      fy2021: number;
      fy2022: number;
      fy2023: number;
      fy2024: number;
    };
    contributionHistory: {
      fy2020: number;
      fy2021: number;
      fy2022: number;
      fy2023: number;
      fy2024: number;
    };
  };
  
  // NEW: Business details
  business?: {
    hasBusinessInterest: boolean;
    structure: 'sole_trader' | 'partnership' | 'company' | 'trust';
    value: number;
    costBase: number;
    ownershipPercent: number;
    yearsOwned: number;
    isActiveAsset: boolean;
    yearEstablished: number;
  };
  
  // NEW: Downsizer tracking
  property: {
    // ... existing fields
    primaryResidence?: {
      owned: boolean;
      value: number;
      mortgageOwing: number;
      purchaseDate: Date;
      yearsOwned: number;
      consideringDownsize: boolean;
    };
  };
  
  // NEW: Work in retirement
  retirement: {
    // ... existing fields
    partTimeWork?: {
      planned: boolean;
      startAge: number;
      endAge: number;
      annualIncome: number;
    };
  };
}
```

---

### 4.2 New Calculation Functions

**Add these functions to your calculation engine:**

```typescript
// Division 293 Tax
function calculateDivision293Tax(
  income: number,
  concessionalContrib: number
): number {
  if (income < 250000) return 0;
  
  const excessIncome = income - 250000;
  const taxableContrib = Math.min(excessIncome, concessionalContrib);
  
  return taxableContrib * 0.15;
}

// Catch-up Contributions
function calculateCatchUpCap(
  tsb: number,
  contributionHistory: Record<string, number>
): number {
  if (tsb >= 500000) return 30000; // Standard cap only
  
  const unusedCaps = Object.values(contributionHistory)
    .slice(-5) // Last 5 years
    .map(contrib => Math.max(0, 30000 - contrib));
  
  const totalUnused = unusedCaps.reduce((sum, cap) => sum + cap, 0);
  
  return 30000 + totalUnused;
}

// Business CGT Exemption Check
function checkBusinessCGTExemptions(business: BusinessDetails, age: number) {
  const exemptions = [];
  
  // 15-year exemption
  if (business.yearsOwned >= 15) {
    exemptions.push({
      type: '15_year_exemption',
      eligible: true,
      benefit: 'UNLIMITED',
      description: 'Can contribute full sale proceeds to super TAX-FREE',
      urgency: 'high',
      action: 'Engage tax advisor immediately',
    });
  }
  
  // Retirement exemption (under 55)
  if (age < 55 && business.yearsOwned >= 5) {
    const yearsRemaining = 55 - age;
    exemptions.push({
      type: 'retirement_exemption',
      eligible: true,
      benefit: Math.min(500000, business.value * (business.ownershipPercent / 100)),
      description: `Up to $500k to super tax-free (${yearsRemaining} years remaining)`,
      urgency: yearsRemaining < 3 ? 'critical' : 'high',
      action: `Must complete before age 55 (${yearsRemaining} years left)`,
    });
  }
  
  // 50% active asset reduction
  if (business.isActiveAsset) {
    exemptions.push({
      type: 'active_asset_50pct',
      eligible: true,
      benefit: 'estimated',
      description: '50% CGT reduction (stacks with CGT discount for 75% total)',
      urgency: 'medium',
    });
  }
  
  return exemptions;
}

// Downsizer Contribution Eligibility
function checkDownsizerEligibility(
  age: number,
  property: PropertyDetails
): boolean {
  return (
    age >= 55 &&
    property.owned &&
    property.yearsOwned >= 10
  );
}

// Work Bonus Calculation
function calculateWorkBonusImpact(
  workIncome: number,
  currentPension: number,
  age: number
): { netGain: number; assessableIncome: number } {
  if (age < 67) return { netGain: 0, assessableIncome: workIncome };
  
  const workBonusLimit = 11800;
  const exemptIncome = Math.min(workIncome, workBonusLimit);
  const assessableIncome = Math.max(0, workIncome - workBonusLimit);
  
  // Calculate pension reduction
  const pensionReduction = assessableIncome * 0.5; // 50c per $1
  const netPension = Math.max(0, currentPension - pensionReduction);
  
  const netGain = workIncome - (currentPension - netPension);
  
  return { netGain, assessableIncome };
}

// Gifting Strategy
function calculateGiftingStrategy(
  assetsOverThreshold: number,
  currentAge: number,
  pensionRate: number
): GiftingPlan {
  const annualLimit = 10000;
  const fiveYearLimit = 30000;
  
  if (assetsOverThreshold <= fiveYearLimit) {
    const years = Math.ceil(assetsOverThreshold / annualLimit);
    const yearlyGift = Math.min(annualLimit, assetsOverThreshold);
    
    const plan: GiftingPlan = {
      totalYears: years,
      yearlyGifts: [],
      totalPensionGain: 0,
    };
    
    let remainingToGift = assetsOverThreshold;
    let cumulativeGifts = 0;
    
    for (let year = 1; year <= years; year++) {
      const giftThisYear = Math.min(yearlyGift, remainingToGift);
      cumulativeGifts += giftThisYear;
      remainingToGift -= giftThisYear;
      
      // Deprivation applies for 5 years
      const effectiveReduction = year >= 2 ? cumulativeGifts : 0;
      const pensionIncrease = (effectiveReduction / 1000) * 7.5 * 26;
      
      plan.yearlyGifts.push({
        year,
        age: currentAge + year - 1,
        giftAmount: giftThisYear,
        pensionIncrease,
        note: year === 1 ? 'Deprivation period begins' : '',
      });
      
      plan.totalPensionGain += pensionIncrease;
    }
    
    return plan;
  }
  
  return null; // Too much over threshold for simple gifting
}
```

---

### 4.3 AI Recommendations Engine Enhancement

**Enhance existing "Generate AI Recommendations" to be more specific:**

```typescript
function generateEnhancedSuggestions(
  profile: RetirementProfile,
  baselineResult: MonteCarloResult
): Suggestion[] {
  const suggestions: Suggestion[] = [];
  
  // PRIORITY 1: Contribution Optimization
  const maxCap = calculateCatchUpCap(
    profile.super.primaryTSB,
    profile.super.contributionHistory
  );
  const currentContrib = 
    profile.super.employerContributions + 
    profile.super.voluntaryContributions;
  
  if (currentContrib < maxCap) {
    const increase = maxCap - currentContrib;
    const fortnightlyIncrease = increase / 26;
    const marginalRate = calculateMarginalRate(profile.income.primaryIncome);
    const taxSaving = increase * marginalRate;
    const netCost = increase - taxSaving;
    
    // Run scenario
    const optimizedProfile = {
      ...profile,
      super: {
        ...profile.super,
        voluntaryContributions: profile.super.voluntaryContributions + increase,
      },
    };
    const optimizedResult = await runMonteCarloSimulation(optimizedProfile);
    
    suggestions.push({
      id: 'max-contributions',
      priority: 1,
      title: 'Maximize Concessional Contributions',
      description: `Increase super contributions by $${increase.toLocaleString()}/year to use your full cap`,
      impact: {
        successRateChange: optimizedResult.successRate - baselineResult.successRate,
        balanceChange: optimizedResult.medianBalance - baselineResult.medianBalance,
      },
      cost: {
        upfrontCost: 0,
        ongoingCost: increase,
        netCost: netCost,
        taxSaving: taxSaving,
      },
      implementation: {
        timeToImplement: '1 week',
        complexity: 'low',
        steps: [
          `Contact payroll: "Please increase salary sacrifice by ${fortnightlyIncrease.toFixed(0)}/fortnight to super"`,
          'Verify change appears on next payslip',
          `Confirm annual total stays under ${maxCap.toLocaleString()} cap`,
        ],
      },
      reasoning: `You're using ${((currentContrib / maxCap) * 100).toFixed(0)}% of available cap. Tax saving of ${taxSaving.toLocaleString()}/year makes net cost only ${netCost.toLocaleString()}.`,
    });
  }
  
  // PRIORITY 2: Age Pension Optimization
  const pensionResult = calculateAgePension(
    profile.retirement.primaryRetirementAge,
    profile.household.type === 'couple',
    calculateTotalAssets(profile),
    0,
    profile.property.primaryResidence?.owned || false
  );
  
  if (pensionResult.assetsOverThreshold > 0 && pensionResult.assetsOverThreshold < 50000) {
    const potentialGain = (pensionResult.assetsOverThreshold / 1000) * 7.5 * 26;
    const giftingPlan = calculateGiftingStrategy(
      pensionResult.assetsOverThreshold,
      profile.household.primaryAge,
      potentialGain
    );
    
    suggestions.push({
      id: 'optimize-pension-assets',
      priority: 2,
      title: 'Optimize Age Pension (Asset Test)',
      description: `You're ${pensionResult.assetsOverThreshold.toLocaleString()} over threshold, costing ${potentialGain.toLocaleString()}/year in pension`,
      impact: {
        successRateChange: 5,
        balanceChange: potentialGain * 25, // 25 years of pension
        pensionChange: potentialGain,
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
          `Option A: Gift $10k/year to children (${giftingPlan.totalYears} year plan)`,
          'Option B: Purchase funeral bond $15k (exempt asset, immediate effect)',
          'Option C: Home improvements $20k (adds to exempt home value)',
        ],
      },
      reasoning: `Small adjustments unlock significant lifetime pension gain: ${(potentialGain * 25).toLocaleString()} over 25 years.`,
      details: {
        giftingPlan: giftingPlan,
      },
    });
  }
  
  // PRIORITY 3: Business CGT (if applicable)
  if (profile.business?.hasBusinessInterest) {
    const exemptions = checkBusinessCGTExemptions(profile.business, profile.household.primaryAge);
    
    exemptions.forEach(exemption => {
      if (exemption.type === '15_year_exemption') {
        const estimatedCGT = (profile.business.value - profile.business.costBase) * 0.5 * 0.47; // Approx
        
        suggestions.push({
          id: 'business-cgt-15yr',
          priority: 1, // VERY HIGH
          title: '⭐ 15-Year CGT Exemption Available',
          description: `Your business qualifies for unlimited CGT exemption - potential ${(estimatedCGT / 1000).toFixed(0)}k+ tax saving`,
          impact: {
            successRateChange: 15,
            balanceChange: profile.business.value * (profile.business.ownershipPercent / 100),
          },
          cost: {
            upfrontCost: 0,
            ongoingCost: 0,
            netCost: -estimatedCGT, // Negative = saving
          },
          implementation: {
            timeToImplement: '3-6 months',
            complexity: 'high',
            steps: [
              '1. Book consultation with CPA/tax advisor (specializing in CGT concessions)',
              '2. Structure sale to maximize exemptions',
              '3. Contribute proceeds to super under CGT cap rules ($1.715M lifetime)',
              '4. CRITICAL: Complete before age 55 if using retirement exemption',
            ],
          },
          reasoning: `Held ${profile.business.yearsOwned} years (need 15). Can contribute business sale proceeds TAX-FREE to super. This is your single biggest opportunity.`,
          urgency: exemption.urgency,
        });
      }
    });
  }
  
  // PRIORITY 4: Downsizer Contribution
  if (checkDownsizerEligibility(profile.household.primaryAge, profile.property.primaryResidence)) {
    const downsizeAmount = profile.household.type === 'couple' ? 600000 : 300000;
    
    suggestions.push({
      id: 'downsizer-contribution',
      priority: 3,
      title: 'Downsizer Contribution Available',
      description: `Age 55+ and owned home 10+ years - can add ${(downsizeAmount / 1000).toFixed(0)}k to super from home sale`,
      impact: {
        successRateChange: 12,
        balanceChange: downsizeAmount,
      },
      cost: {
        upfrontCost: 0,
        ongoingCost: 0,
        netCost: 0,
      },
      implementation: {
        timeToImplement: '6-12 months',
        complexity: 'medium',
        steps: [
          'Evaluate downsizing to smaller/cheaper home',
          'Calculate sale proceeds available',
          'Contribute up to $300k per person within 90 days of settlement',
          'Not counted in contribution caps!',
        ],
      },
      reasoning: 'Major one-time super boost without affecting caps. Consider if lifestyle suits smaller home.',
    });
  }
  
  // Continue with other suggestions...
  return suggestions.sort((a, b) => a.priority - b.priority);
}
```

---

### 4.4 Frontend UI Component Enhancements

**These can be added to your existing interface:**

#### Confidence Score Widget (Add to results page)
```html
<div class="confidence-score-widget">
  <h3>Your Retirement Confidence Score</h3>
  <div class="score-circle">
    <svg viewBox="0 0 200 200">
      <!-- Background circle -->
      <circle cx="100" cy="100" r="80" fill="none" stroke="#e5e7eb" stroke-width="20"/>
      <!-- Score circle -->
      <circle cx="100" cy="100" r="80" fill="none" 
              [attr.stroke]="scoreColor" 
              stroke-width="20"
              [attr.stroke-dasharray]="scoreCircumference"
              stroke-linecap="round"
              transform="rotate(-90 100 100)"/>
    </svg>
    <div class="score-text">
      <span class="score-number">{{ confidenceScore }}</span>
      <span class="score-suffix">/100</span>
    </div>
  </div>
  <p class="score-label" [class]="scoreStatus.class">
    {{ scoreStatus.emoji }} {{ scoreStatus.label }}
  </p>
  <p class="score-description">
    Based on {{ numSimulations.toLocaleString() }} Monte Carlo simulations
  </p>
</div>
```

#### Quick Wins Cards (Replace or enhance AI recommendations)
```html
<div class="quick-wins-section">
  <h2>🎯 Your Top 3 Quick Wins</h2>
  <p>Small changes with big impacts - prioritized by return on effort</p>
  
  <div class="suggestion-cards">
    <div class="suggestion-card" *ngFor="let suggestion of topSuggestions; let i = index">
      <!-- Header -->
      <div class="card-header">
        <div class="priority-badge">#{{ i + 1 }}</div>
        <h3>{{ suggestion.title }}</h3>
        <span class="complexity-badge" [class]="'complexity-' + suggestion.implementation.complexity">
          {{ suggestion.implementation.complexity }} effort
        </span>
      </div>
      
      <!-- Description -->
      <p class="description">{{ suggestion.description }}</p>
      
      <!-- Impact -->
      <div class="impact-section">
        <h4>📈 IMPACT</h4>
        <div class="impact-grid">
          <div class="impact-card">
            <div class="impact-value success">+{{ suggestion.impact.successRateChange }}%</div>
            <div class="impact-label">Success Rate</div>
          </div>
          <div class="impact-card">
            <div class="impact-value balance">${{ (suggestion.impact.balanceChange / 1000).toFixed(0) }}k</div>
            <div class="impact-label">Extra at Retirement</div>
          </div>
          <div class="impact-card" *ngIf="suggestion.impact.pensionChange">
            <div class="impact-value pension">${{ suggestion.impact.pensionChange.toLocaleString() }}/yr</div>
            <div class="impact-label">Age Pension Gain</div>
          </div>
        </div>
      </div>
      
      <!-- Cost -->
      <div class="cost-section" *ngIf="suggestion.cost.netCost !== 0">
        <h4>💰 COST</h4>
        <div class="cost-breakdown">
          <div class="cost-row" *ngIf="suggestion.cost.upfrontCost > 0">
            <span>Upfront:</span>
            <span>${{ suggestion.cost.upfrontCost.toLocaleString() }}</span>
          </div>
          <div class="cost-row" *ngIf="suggestion.cost.ongoingCost !== 0">
            <span>Ongoing:</span>
            <span>${{ Math.abs(suggestion.cost.ongoingCost).toLocaleString() }}/year</span>
          </div>
          <div class="cost-row total">
            <span>Net Cost:</span>
            <strong>${{ suggestion.cost.netCost.toLocaleString() }}/year</strong>
          </div>
        </div>
      </div>
      
      <!-- Implementation -->
      <div class="implementation-section">
        <h4>HOW TO DO IT</h4>
        <ol>
          <li *ngFor="let step of suggestion.implementation.steps">{{ step }}</li>
        </ol>
        <div class="implementation-meta">
          <span>⏱ Time: {{ suggestion.implementation.timeToImplement }}</span>
        </div>
      </div>
      
      <!-- Reasoning -->
      <div class="reasoning-section">
        <p><strong>💡 Why this works:</strong> {{ suggestion.reasoning }}</p>
      </div>
      
      <!-- CTA -->
      <button class="apply-button" (click)="applySuggestion(suggestion.id)">
        Apply This Strategy →
      </button>
    </div>
  </div>
</div>
```

#### Smart Alerts/Warnings (Add throughout form)
```html
<!-- Division 293 Warning -->
<div class="alert alert-warning" *ngIf="profile.income.primaryIncome > 250000">
  <strong>⚠️ High Income Tax Impact</strong>
  <p>Your income of ${{ profile.income.primaryIncome.toLocaleString() }} triggers Division 293 tax.</p>
  <p>Extra 15% tax on super contributions = ${{ division293Tax.toLocaleString() }}/year</p>
  <p>Net contribution: ${{ netContribution.toLocaleString() }} (not ${{ grossContribution.toLocaleString() }})</p>
  <button class="btn-link" (click)="showDivision293Help()">Learn more →</button>
</div>

<!-- Catch-Up Opportunity -->
<div class="alert alert-success" *ngIf="catchUpAvailable">
  <strong>💰 Catch-Up Contributions Available!</strong>
  <p>Your TSB under $500k unlocks unused caps from previous years.</p>
  <p>You have ${{ unusedCaps.toLocaleString() }} unused cap</p>
  <p>Maximum this year: ${{ maxContribution.toLocaleString() }} (vs standard $30k)</p>
  <button class="btn-primary" (click)="enableCatchUp()">Use Catch-Up →</button>
</div>

<!-- Preservation Age Check -->
<div class="alert alert-info" *ngIf="retirementAge < preservationAge">
  <strong>ℹ️ Early Retirement Detected</strong>
  <p>Your preservation age is {{ preservationAge }} (born {{ birthYear }}).</p>
  <p>Gap: {{ preservationAge - retirementAge }} years without super access</p>
  <p>You'll need bridge accounts with ${{ bridgeAmount.toLocaleString() }} to cover this period.</p>
  <button class="btn-link" (click)="showBridgeStrategy()">Model Bridge Strategy →</button>
</div>

<!-- Business CGT Exemption (CRITICAL) -->
<div class="alert alert-critical" *ngIf="business15YearEligible">
  <strong>⭐ $500,000+ TAX SAVING OPPORTUNITY!</strong>
  <p>Your business qualifies for 15-year CGT exemption</p>
  <p>Held: {{ businessYearsOwned }} years | Estimated saving: ${{ estimatedCGTSaving.toLocaleString() }}</p>
  <p>Can contribute sale proceeds TAX-FREE to super</p>
  <button class="btn-urgent" (click)="showBusinessCGTDetails()">Learn More (URGENT) →</button>
</div>

<!-- Retirement Exemption Deadline -->
<div class="alert alert-urgent" *ngIf="age >= 53 && age < 55 && hasBusinessInterest">
  <strong>⏰ RETIREMENT EXEMPTION DEADLINE APPROACHING</strong>
  <p>You're {{ age }} years old - only {{ 55 - age }} year(s) left!</p>
  <p>Up to $500k to super tax-free expires at age 55</p>
  <p>Action required NOW</p>
  <button class="btn-urgent" (click)="showRetirementExemption()">See Details →</button>
</div>
```

---

## PART 5: IMPLEMENTATION PRIORITIES

### Phase 1: Critical Calculations (Low effort)
**Must-Have Regulatory Additions**

```
Priority A (Immediate):
☐ Division 293 tax calculation
☐ Catch-up contributions (TSB <$500k)
☐ Preservation age validation
☐ Business 15-year CGT exemption checker

Priority B (High):
☐ Downsizer contribution eligibility
☐ Work Bonus calculator
☐ Enhanced deeming calculations
☐ Gifting strategy with deprivation

Priority C (Medium):
☐ Business retirement exemption (age <55)
☐ Contribution splitting for couples
☐ Rent assistance calculator
☐ CSHC threshold checker
```

**Implementation Approach:**
1. Add new fields to profile interface
2. Create calculation functions (see Section 4.2)
3. Add validation rules
4. Test with persona scenarios

---

### Phase 2: Smart UI Enhancements (Low effort)
**Progressive Disclosure & Contextual Help**

```
Priority A:
☐ Alert system for opportunities/warnings
☐ Auto-calculate SGC from income
☐ Show preservation age based on birth year
☐ Cap utilization indicator

Priority B:
☐ Accordion sections for form complexity
☐ Contextual tooltips
☐ Auto-expand sections with errors
☐ Field-level help text

Priority C:
☐ Save expansion state
☐ Field dependencies (show/hide logic)
☐ Inline calculators (e.g., "How much is X%?")
```

**Implementation:**
- Use existing UI framework
- Add conditional rendering based on profile data
- localStorage for UI state persistence

---

### Phase 3: Enhanced Results (Low Effort)
**Confidence Score & Quick Wins**

```
Priority A:
☐ Confidence score widget (visual gauge)
☐ Success rate explanation (plain English)
☐ Top 3 suggestions with dollar amounts
☐ Implementation steps for each suggestion

Priority B:
☐ Scenario comparison with outcomes
☐ "Age money runs out" in failure scenarios
☐ Sensitivity analysis visualization
☐ Action plan timeline

Priority C:
☐ PDF export with recommendations
☐ Share/save custom URL
☐ Email results
```

---

### Phase 4: Persona Optimization (Medium Effort)
**Persona-Specific Flows**

```
☐ Sarah (High Earner):
  - Bridge account calculator
  - Division 293 optimizer
  - Transfer balance cap tracker

☐ Mark & Lisa (Business):
  - CGT concession decision tree
  - Multi-property manager
  - Trust optimization guide

☐ Robert (Late Starter):
  - Catch-up contribution wizard
  - Downsizer decision tool
  - Recovery roadmap generator

☐ Jenny (Pension Max):
  - Asset test optimizer
  - Gifting strategy planner
  - Work Bonus calculator
```

---

### Phase 5: Polish & Testing (Medium Effort)

```
☐ Test all 4 persona scenarios
☐ Validate calculations against hand-calcs
☐ Mobile responsive testing
☐ Error handling for edge cases
☐ Loading states for Monte Carlo
☐ Accessibility audit (WCAG AA)
☐ Browser compatibility
☐ Performance optimization
```

---

## PART 6: TESTING SCENARIOS

### Test Data for Each Persona

#### Sarah (High Earner / Early Retirement)
```javascript
const SARAH_SCENARIO = {
  household: {
    type: 'single',
    primaryAge: 42,
  },
  income: {
    primaryIncome: 280000,
  },
  super: {
    primaryBalance: 420000,
    primaryTSB: 420000,
    employerContributions: 32200, // 11.5% SGC
    voluntaryContributions: 10000,
  },
  retirement: {
    primaryRetirementAge: 55, // Early retirement
    targetSpending: 80000,
    lifeExpectancy: 95,
  },
  assets: {
    savings: 85000,
    shares: 120000,
  },
};

// Expected Calculations:
// - Division 293 tax = $4,500 (on $30k excess income)
// - Preservation age = 60
// - Bridge account needed for 5 years (55-60)
// - Should warn: Retiring 5 years before super access
```

#### Mark & Lisa (Business/Property)
```javascript
const MARK_LISA_SCENARIO = {
  household: {
    type: 'couple',
    primaryAge: 52,
    partnerAge: 50,
  },
  business: {
    hasBusinessInterest: true,
    structure: 'company',
    value: 2400000,
    costBase: 800000,
    ownershipPercent: 65,
    yearsOwned: 18,
    isActiveAsset: true,
    yearEstablished: 2007,
  },
  trust: {
    hasTrust: true,
    netAssets: 850000,
    hasControl: true,
    annualDistributions: 45000,
  },
  property: {
    primaryResidence: {
      owned: true,
      value: 1200000,
      mortgageOwing: 0,
    },
    investmentProperties: [
      {
        value: 780000,
        loanOwing: 320000,
        rentalIncome: 650, // weekly
        annualExpenses: 18000,
        purchaseDate: new Date('2015-03-15'),
        planToSellAge: 70,
      },
      {
        value: 620000,
        loanOwing: 180000,
        rentalIncome: 520,
        annualExpenses: 14000,
        purchaseDate: new Date('2018-08-22'),
        planToSellAge: 72,
      },
    ],
  },
};

// Expected Calculations:
// - 15-year CGT exemption: ELIGIBLE ✓
// - Estimated CGT saving: ~$520k
// - Trust attribution: $850k added to assets (Age Pension impact)
// - Property 1 net income: $15,800/yr
// - Property 2 net income: $12,040/yr
// - Retirement exemption: 2 years left to use (expires age 55 for Lisa)
```

#### Robert (Late Starter)
```javascript
const ROBERT_SCENARIO = {
  household: {
    type: 'single',
    primaryAge: 55,
  },
  income: {
    primaryIncome: 95000,
  },
  super: {
    primaryBalance: 145000,
    primaryTSB: 145000,
    employerContributions: 10925,
    voluntaryContributions: 5000,
    tsbHistory: {
      fy2020: 98000,
      fy2021: 112000,
      fy2022: 128000,
      fy2023: 135000,
      fy2024: 145000,
    },
    contributionHistory: {
      fy2020: 12000,
      fy2021: 13500,
      fy2022: 14800,
      fy2023: 15200,
      fy2024: 15925,
    },
  },
  property: {
    primaryResidence: {
      owned: true,
      value: 650000,
      mortgageOwing: 0,
      purchaseDate: new Date('2003-06-10'),
      yearsOwned: 22,
    },
  },
  assets: {
    savings: 28000,
  },
};

// Expected Calculations:
// - Catch-up eligible: TSB <$500k ✓
// - Unused caps: FY20: $18k, FY21: $16.5k, FY22: $15.2k, FY23: $14.8k, FY24: $14.1k
// - Total unused: $78.6k
// - Max contribution this year: $30k + $78.6k (last 5 years) = NEED CALC
// - Downsizer eligible: Age 55+ and owned home 10+ years ✓
// - Downsizer amount: $300k available
// - Should suggest aggressive catch-up strategy
```

#### Jenny (Pension Maximization)
```javascript
const JENNY_SCENARIO = {
  household: {
    type: 'single',
    primaryAge: 66,
  },
  super: {
    primaryBalance: 385000,
  },
  assets: {
    savings: 45000,
    shares: 32000,
    termDeposits: 58000,
  },
  property: {
    primaryResidence: {
      owned: true,
      value: 480000,
      mortgageOwing: 0,
    },
  },
  retirement: {
    primaryRetirementAge: 67,
    targetSpending: 31323, // AFSA modest
    lifeExpectancy: 95,
  },
};

// Expected Calculations:
// - Total assessable assets: $385k + $45k + $32k + $58k = $520k
// - Asset threshold (homeowner single): $314k
// - Assets over threshold: $206k
// - Pension reduction: ($206k / $1k) × $7.50 × 26 = $40,170/year
// - Max pension: $27,600/year
// - Actual pension: $27,600 - $40,170 = $0 (asset test fails)
// - Should suggest: Gift $30k over 3 years to reduce assets
// - Alternative: Funeral bond $15k + home improvements $15k
```

---

## PART 7: VALIDATION CHECKLIST

### Calculation Accuracy

```
☐ Division 293:
  - Test at exactly $250k (no tax)
  - Test at $280k with $30k contrib (tax on $30k)
  - Test at $270k with $30k contrib (tax on $20k)

☐ Catch-up contributions:
  - TSB at $499k (eligible)
  - TSB at $501k (not eligible)
  - Calculate correct unused cap from history

☐ Age Pension:
  - Asset test vs income test (use lower)
  - Deeming rates correctly applied
  - Taper rates accurate
  - Homeowner vs non-homeowner thresholds

☐ CGT concessions:
  - 15-year held business (unlimited exemption)
  - Active asset test
  - Retirement exemption age <55 check
  - 50% active asset reduction

☐ Preservation age:
  - Born before 1960: 55
  - Born 1960-1964: 56-59 (sliding scale)
  - Born after 1964: 60

☐ Work Bonus:
  - Correctly exempt first $11,800
  - Apply to work income only
  - Age 67+ only
```

---

### UI/UX Testing

```
☐ Progressive disclosure:
  - Sections collapse/expand
  - State persists on reload
  - Auto-expand on errors

☐ Alerts show correctly:
  - Division 293 at >$250k income
  - Catch-up when TSB <$500k
  - Business CGT at 15+ years
  - Preservation age warning

☐ Mobile responsive:
  - Forms usable on phone
  - Charts render correctly
  - Tables scroll horizontally
  - Touch targets adequate (44x44px)

☐ Loading states:
  - Monte Carlo shows progress
  - Disable buttons during calc
  - Show skeleton screens

☐ Error handling:
  - Invalid inputs show clear errors
  - Network failures handled gracefully
  - Calculation errors don't crash app
```

---

### Persona Testing

```
☐ Sarah scenario:
  - Detects Division 293
  - Shows bridge account warning
  - Suggests optimal contribution strategy

☐ Mark & Lisa scenario:
  - Flags 15-year CGT exemption
  - Warns about trust attribution
  - Models multiple property sale timings

☐ Robert scenario:
  - Calculates catch-up correctly
  - Suggests downsizer contribution
  - Shows aggressive catch-up plan

☐ Jenny scenario:
  - Identifies asset test excess
  - Suggests gifting strategy
  - Shows Work Bonus benefit
```

---

## PART 8: QUICK REFERENCE

### Australian Rates 2025-26

```
Concessional Cap: $30,000/year
Non-Concessional Cap: $120,000/year (or $360k bring-forward)
Transfer Balance Cap: $1,900,000
Division 293 Threshold: $250,000 income
Age Pension Age: 67
Preservation Age: 60 (born after 1964)

Age Pension (Single):
- Maximum: $27,600/year
- Asset threshold (homeowner): $314,000
- Asset threshold (non-homeowner): $566,000
- Income threshold: $5,512/year
- Taper rate: $7.50/fortnight per $1,000 over threshold

Age Pension (Couple):
- Maximum: $41,600/year combined
- Asset threshold (homeowner): $470,000
- Asset threshold (non-homeowner): $722,000
- Income threshold: $8,736/year combined

Deeming Rates:
- Lower rate: 0.25% (first $60.4k single, $100.2k couple)
- Upper rate: 2.25% (above thresholds)

Work Bonus: $11,800/year exempt work income

Gifting Limits:
- Annual: $10,000
- 5-year total: $30,000
- Deprivation period: 5 years

CGT Concessions:
- 15-year exemption: Unlimited (if eligible)
- Retirement exemption: $500,000 per person (age <55)
- Active asset 50% reduction: Yes
- CGT discount: 50% (held >12 months)

Downsizer: $300,000 per person (age 55+, owned 10+ years)
```

---

### Priority Matrix

| Feature | Impact | Effort | Priority |
|---------|--------|--------|----------|
| Division 293 calc | High | Low | **P0** |
| Catch-up contributions | High | Medium | **P0** |
| Business 15-yr exemption | High | Medium | **P0** |
| Confidence score | High | Low | **P1** |
| Quick wins cards | High | Medium | **P1** |
| Age Pension optimizer | High | Medium | **P1** |
| Downsizer calc | Medium | Low | **P2** |
| Work Bonus calc | Medium | Low | **P2** |
| Gifting strategy | Medium | Medium | **P2** |
| Progressive disclosure | Medium | High | **P3** |
| PDF export | Low | Medium | **P3** |

---

## PART 9: GLOSSARY

**Division 293 Tax:** Additional 15% tax on concessional super contributions for high-income earners (income >$250k)

**Concessional Contributions:** Pre-tax super contributions (employer + salary sacrifice). Capped at $30k/year.

**Non-Concessional Contributions:** After-tax super contributions. Capped at $120k/year (or $360k over 3 years).

**Total Super Balance (TSB):** Your total super balance as of 30 June. Used to determine catch-up contribution eligibility.

**Preservation Age:** Age at which you can access super (with conditions). Age 60 if born after 1964.

**Transfer Balance Cap:** Maximum amount that can be moved to tax-free pension phase. Currently $1.9M.

**Asset Test:** Age Pension eligibility based on total assets (excluding home).

**Income Test:** Age Pension eligibility based on assessable income.

**Deeming:** Centrelink assumes financial assets earn set rates regardless of actual returns.

**Work Bonus:** First $11,800 of work income exempt from Age Pension income test (age 67+).

**Gifting:** Amounts given away assessed under deprivation rules for Age Pension (5-year lookback).

**CGT (Capital Gains Tax):** Tax on profit from selling assets.

**15-Year Exemption:** Small business CGT concession for businesses held 15+ years (unlimited exemption).

**Retirement Exemption:** Up to $500k CGT-free contribution to super from business sale (age <55).

**Active Asset:** Asset used in running a business (qualifies for 50% CGT reduction).

**Downsizer Contribution:** Up to $300k from home sale to super (age 55+, owned 10+ years).

---

## PART 10: NEXT STEPS FOR CLAUDE CODE

### Getting Started

1. **Review existing codebase at retirement.gagneet.com**
   - Identify current calculation engine
   - Understand Monte Carlo implementation
   - Note existing UI framework

2. **Start with Priority 0 (P0) features:**
   - Division 293 tax calculation
   - Catch-up contributions logic
   - Business CGT exemption checker

3. **Add new profile fields:**
   ```typescript
   // In your existing profile interface, add:
   super: {
     // ... existing fields
     tsbHistory: { fy2020: 0, fy2021: 0, fy2022: 0, fy2023: 0, fy2024: 0 },
     contributionHistory: { fy2020: 0, fy2021: 0, fy2022: 0, fy2023: 0, fy2024: 0 },
   },
   business: {
     hasBusinessInterest: false,
     structure: null,
     value: 0,
     costBase: 0,
     ownershipPercent: 0,
     yearsOwned: 0,
     isActiveAsset: false,
   }
   ```

4. **Implement calculation functions from Section 4.2:**
   - Copy the function signatures provided
   - Test with persona scenarios
   - Integrate into existing Monte Carlo

5. **Enhance UI incrementally:**
   - Start with alert components (warnings/opportunities)
   - Add confidence score widget
   - Build quick wins cards
   - Implement progressive disclosure

6. **Test thoroughly:**
   - Use the 4 persona test scenarios
   - Validate calculations manually
   - Check mobile responsiveness

### Questions to Ask

Before starting implementation, clarify:

1. **What framework/tech stack are you using?**
   - React, Angular, Vue?
   - State management library?
   - UI component library?

2. **Where is the Monte Carlo calculation happening?**
   - Frontend JavaScript?
   - Web Worker?
   - Backend API?

3. **What's your data storage approach?**
   - localStorage only?
   - Database backend?
   - User accounts?

4. **Are there any existing UI patterns I should follow?**
   - Component naming conventions?
   - Styling approach (CSS, Tailwind, styled-components)?
   - File structure preferences?

---

## APPENDIX A: CODE SNIPPETS

### Division 293 Tax Calculator (Standalone)

```javascript
/**
 * Calculate Division 293 tax
 * @param {number} income - Annual taxable income
 * @param {number} concessionalContrib - Concessional super contributions
 * @returns {object} - Tax details
 */
function calculateDivision293(income, concessionalContrib) {
  const THRESHOLD = 250000;
  
  if (income <= THRESHOLD) {
    return {
      taxPayable: 0,
      taxableContrib: 0,
      netContribution: concessionalContrib,
      message: 'No Division 293 tax applies',
    };
  }
  
  const excessIncome = income - THRESHOLD;
  const taxableContrib = Math.min(excessIncome, concessionalContrib);
  const taxPayable = taxableContrib * 0.15;
  const netContribution = concessionalContrib - taxPayable;
  
  return {
    taxPayable,
    taxableContrib,
    netContribution,
    message: `Division 293 tax applies: ${taxPayable.toLocaleString()}`,
    warning: true,
  };
}

// Example usage:
const result = calculateDivision293(280000, 30000);
console.log(result);
// {
//   taxPayable: 4500,
//   taxableContrib: 30000,
//   netContribution: 25500,
//   message: "Division 293 tax applies: $4,500",
//   warning: true
// }
```

### Catch-Up Contributions Calculator

```javascript
/**
 * Calculate maximum contributions including catch-up
 * @param {number} tsb - Total Super Balance
 * @param {object} contributionHistory - Last 5 years of contributions
 * @returns {object} - Contribution limits
 */
function calculateCatchUpCap(tsb, contributionHistory) {
  const STANDARD_CAP = 30000;
  const TSB_THRESHOLD = 500000;
  
  if (tsb >= TSB_THRESHOLD) {
    return {
      maxContribution: STANDARD_CAP,
      unusedCaps: 0,
      catchUpAvailable: false,
      message: 'TSB too high for catch-up contributions',
    };
  }
  
  // Calculate unused caps from last 5 years
  const years = Object.keys(contributionHistory).sort().slice(-5);
  const unusedCaps = years.map(year => {
    const contributed = contributionHistory[year] || 0;
    return Math.max(0, STANDARD_CAP - contributed);
  });
  
  const totalUnused = unusedCaps.reduce((sum, cap) => sum + cap, 0);
  const maxContribution = STANDARD_CAP + totalUnused;
  
  return {
    maxContribution,
    unusedCaps: totalUnused,
    unusedByYear: years.reduce((obj, year, i) => {
      obj[year] = unusedCaps[i];
      return obj;
    }, {}),
    catchUpAvailable: totalUnused > 0,
    message: `Catch-up available: ${totalUnused.toLocaleString()}`,
  };
}

// Example usage:
const catchUp = calculateCatchUpCap(450000, {
  fy2020: 12000,
  fy2021: 15000,
  fy2022: 18000,
  fy2023: 20000,
  fy2024: 25000,
});
console.log(catchUp);
// {
//   maxContribution: 120000,
//   unusedCaps: 90000,
//   unusedByYear: { fy2020: 18000, fy2021: 15000, fy2022: 12000, fy2023: 10000, fy2024: 5000 },
//   catchUpAvailable: true,
//   message: "Catch-up available: $90,000"
// }
```

### Business CGT Exemption Checker

```javascript
/**
 * Check business CGT concession eligibility
 * @param {object} business - Business details
 * @param {number} ownerAge - Owner's current age
 * @returns {array} - Eligible exemptions
 */
function checkBusinessCGTExemptions(business, ownerAge) {
  const exemptions = [];
  
  // 15-Year Exemption
  if (business.yearsOwned >= 15) {
    const estimatedCGT = (business.value - business.costBase) * 0.5 * 0.47;
    
    exemptions.push({
      type: '15_year_exemption',
      eligible: true,
      name: '15-Year CGT Exemption',
      benefit: 'UNLIMITED',
      estimatedSaving: estimatedCGT,
      description: 'Can contribute full business sale proceeds to super TAX-FREE',
      priority: 'critical',
      urgency: 'high',
      requirements: [
        `✓ Business held ${business.yearsOwned} years (need 15)`,
        '✓ No age limit',
        '✓ Must be active asset',
      ],
      actions: [
        'Engage CPA/tax advisor specializing in CGT concessions immediately',
        'Structure sale to maximize exemptions',
        'Contribute proceeds under CGT cap rules ($1.715M lifetime)',
      ],
    });
  }
  
  // Retirement Exemption (age <55)
  if (ownerAge < 55 && business.yearsOwned >= 5) {
    const maxExemption = 500000;
    const businessValue = business.value * (business.ownershipPercent / 100);
    const benefit = Math.min(maxExemption, businessValue);
    const yearsRemaining = 55 - ownerAge;
    
    exemptions.push({
      type: 'retirement_exemption',
      eligible: true,
      name: 'CGT Retirement Exemption',
      benefit: benefit,
      description: `Up to $500k to super tax-free (${yearsRemaining} year${yearsRemaining > 1 ? 's' : ''} remaining)`,
      priority: yearsRemaining <= 2 ? 'critical' : 'high',
      urgency: yearsRemaining <= 2 ? 'urgent' : 'high',
      deadline: `Age 55 (${yearsRemaining} year${yearsRemaining > 1 ? 's' : ''} left)`,
      requirements: [
        `✓ Business held ${business.yearsOwned} years (need 5)`,
        `${ownerAge < 55 ? '✓' : '✗'} Age ${ownerAge} (must be under 55)`,
        '✓ Can be either active or passive asset',
      ],
      actions: [
        `URGENT: Must act before age 55 (${yearsRemaining} year${yearsRemaining > 1 ? 's' : ''} remaining)`,
        'Book consultation with tax advisor NOW',
        'Plan business sale timing',
        'Prepare contribution strategy',
      ],
    });
  }
  
  // 50% Active Asset Reduction
  if (business.isActiveAsset) {
    exemptions.push({
      type: 'active_asset_50pct',
      eligible: true,
      name: '50% Active Asset Reduction',
      benefit: 'estimated',
      description: '50% CGT reduction (stacks with 50% CGT discount for 75% total)',
      priority: 'medium',
      requirements: [
        `${business.isActiveAsset ? '✓' : '✗'} Must be active asset (used in business)`,
      ],
    });
  }
  
  return exemptions;
}

// Example usage:
const exemptions = checkBusinessCGTExemptions({
  value: 2400000,
  costBase: 800000,
  ownershipPercent: 65,
  yearsOwned: 18,
  isActiveAsset: true,
}, 52);

console.log(exemptions);
// Returns array with 15-year exemption, retirement exemption, and active asset reduction details
```

### Confidence Score Calculator

```javascript
/**
 * Calculate retirement confidence score (0-100)
 * @param {object} monteCarloResult - Results from simulation
 * @param {number} targetSpending - Annual spending goal
 * @returns {object} - Score and status
 */
function calculateConfidenceScore(monteCarloResult, targetSpending) {
  const { successRate, medianBalance } = monteCarloResult;
  
  // Weight success rate (70%) and balance adequacy (30%)
  const successComponent = successRate * 0.7;
  
  // Balance adequacy: Do they have 5+ years of spending at end?
  const yearsOfSpendingRemaining = medianBalance / targetSpending;
  const balanceAdequacy = Math.min(100, (yearsOfSpendingRemaining / 5) * 100);
  const balanceComponent = balanceAdequacy * 0.3;
  
  const confidenceScore = Math.round(successComponent + balanceComponent);
  
  // Determine status
  let status;
  if (confidenceScore >= 90) {
    status = {
      label: 'Excellent',
      emoji: '🟢',
      color: 'green',
      description: 'Your retirement is highly secure',
    };
  } else if (confidenceScore >= 75) {
    status = {
      label: 'Good',
      emoji: '🟡',
      color: 'lime',
      description: 'Your retirement is on track with room for improvement',
    };
  } else if (confidenceScore >= 60) {
    status = {
      label: 'Moderate',
      emoji: '🟡',
      color: 'yellow',
      description: 'Your retirement needs attention',
    };
  } else if (confidenceScore >= 40) {
    status = {
      label: 'Needs Attention',
      emoji: '🟠',
      color: 'orange',
      description: 'Significant improvements needed for retirement security',
    };
  } else {
    status = {
      label: 'Action Required',
      emoji: '🔴',
      color: 'red',
      description: 'Urgent action needed to secure retirement',
    };
  }
  
  return {
    score: confidenceScore,
    status,
    breakdown: {
      successRate,
      successComponent: Math.round(successComponent),
      balanceAdequacy: Math.round(balanceAdequacy),
      balanceComponent: Math.round(balanceComponent),
    },
  };
}

// Example usage:
const confidence = calculateConfidenceScore({
  successRate: 73,
  medianBalance: 487000,
}, 51278);

console.log(confidence);
// {
//   score: 73,
//   status: { label: 'Good', emoji: '🟡', ... },
//   breakdown: { ... }
// }
```

---

## APPENDIX B: SUGGESTED FILE STRUCTURE

```
src/
├── lib/
│   ├── calculations/
│   │   ├── division-293.js          # NEW
│   │   ├── catch-up-contributions.js # NEW
│   │   ├── business-cgt.js          # NEW
│   │   ├── age-pension.js           # ENHANCE EXISTING
│   │   ├── confidence-score.js      # NEW
│   │   └── monte-carlo.js           # EXISTING
│   ├── constants/
│   │   └── australian-rates-2025-26.js # NEW
│   └── utils/
│       └── formatters.js            # EXISTING
├── components/
│   ├── alerts/
│   │   ├── Division293Alert.jsx    # NEW
│   │   ├── CatchUpAlert.jsx        # NEW
│   │   ├── BusinessCGTAlert.jsx    # NEW
│   │   └── PreservationAgeAlert.jsx # NEW
│   ├── results/
│   │   ├── ConfidenceScore.jsx     # NEW
│   │   ├── QuickWinsCard.jsx       # NEW
│   │   ├── ScenarioComparison.jsx  # ENHANCE EXISTING
│   │   └── ActionRoadmap.jsx       # NEW
│   └── forms/
│       └── [existing form components]
└── [existing structure]
```

---

## APPENDIX C: IMPLEMENTATION CHECKLIST

### 1: Foundation
- [ ] Add new profile fields (TSB history, business details)
- [ ] Implement Division 293 calculation
- [ ] Implement catch-up contributions logic
- [ ] Add Division 293 alert component
- [ ] Add catch-up alert component
- [ ] Test with Sarah scenario

### 2: Business & Property
- [ ] Implement business CGT exemption checker
- [ ] Add business details form section
- [ ] Add business CGT alert component
- [ ] Enhance property section for multiple properties
- [ ] Test with Mark & Lisa scenario

### 3: Age Pension & Late Starters
- [ ] Enhance Age Pension calculation with deeming
- [ ] Implement gifting strategy calculator
- [ ] Implement Work Bonus calculator
- [ ] Add downsizer contribution checker
- [ ] Test with Robert and Jenny scenarios

### 4: Results Enhancement
- [ ] Build confidence score component
- [ ] Redesign AI recommendations as Quick Wins
- [ ] Add specific dollar amounts to suggestions
- [ ] Add implementation steps
- [ ] Enhance scenario comparison table

### 5: Polish & Testing
- [ ] Add progressive disclosure to forms
- [ ] Implement mobile responsive design
- [ ] Add loading states
- [ ] Comprehensive testing all personas
- [ ] Performance optimization

### 6: Documentation & Launch
- [ ] Update user help documentation
- [ ] Add tooltips and contextual help
- [ ] Accessibility audit
- [ ] Browser compatibility testing
- [ ] Deploy to production

---

## DOCUMENT END

**Total Enhancement Scope:**
- 15+ new calculations
- 20+ UI components
- 4 persona optimizations
- Complete regulatory compliance for 2025-26

---

**Document Version:** 1.0  
**Created:** September 29, 2025  
**For:** retirement.gagneet.com enhancement project  
**Contact:** [Your details]
