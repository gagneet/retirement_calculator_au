# EVIDENCE-BASED IMPLEMENTATION PLAN
**Prioritized by Real User Demand**

**Project:** retirement.gagneet.com v2.0 Enhancement
**Date:** September 29, 2025
**Approach:** User research-driven development prioritizing actual feedback over assumed needs

---

## Phase Overview

**Phase 1 (4-6 weeks):** Trust & Transparency - Address fundamental user concerns
**Phase 2 (3-4 weeks):** Decision Support - Enable scenario planning and comparison
**Phase 3 (4-5 weeks):** Advanced Features - Regulatory compliance and sophisticated modeling
**Phase 4 (2-3 weeks):** Polish & Testing - Production readiness

Each phase delivers complete, shippable features that solve real user problems.

---

## PHASE 1: TRUST & TRANSPARENCY
**Duration:** 4-6 weeks
**Priority:** P0 - Critical
**Goal:** Fix fundamental trust issues that cause users to abandon retirement calculators

### Core Features

#### 1.1 Transparent Assumptions Panel
**User Evidence:** *"The problem with most of the calculators online is they don't allow you to reduce your expenditure over time!"* ([Whirlpool Forums](https://forums.whirlpool.net.au/archive/9yqmlwn7))

**Implementation Tasks:**
- [ ] Create expandable "Show Assumptions" UI panel
- [ ] Make all financial assumptions user-editable (returns, inflation, fees, life expectancy)
- [ ] Add "MoneySmart Defaults" and "Custom" presets
- [ ] Real-time recalculation when assumptions change
- [ ] Save assumption preferences to localStorage

**Code Modules:** `config.js`, `utils.js`, new `assumptions-panel.js`
**Acceptance Test:** User can edit investment return from 7% to 5% and see retirement projection update immediately

---

#### 1.2 MoneySmart-Aligned Age Pension Integration
**User Evidence:** *"the calculators seem to only apply to fully funded retirees"* ([Whirlpool Forums](https://forums.whirlpool.net.au/archive/30x1zlrk))

**Implementation Tasks:**
- [ ] Implement accurate deeming rate calculations (0.25%/2.25% thresholds)
- [ ] Add asset test vs income test logic (use more restrictive)
- [ ] Include current Age Pension rates and thresholds
- [ ] Show which test is limiting pension amount
- [ ] Add pension optimization suggestions near thresholds

**Code Modules:** New `age-pension.js`, enhance `utils.js`, `simulator.js`
**Acceptance Test:** Calculator matches MoneySmart pension estimates within $500/year for test scenarios

---

#### 1.3 Variable Spending Profiles
**User Evidence:** *"I will want to spend more when I am first retired (travelling, dining out etc) and less when I am very old"* ([Whirlpool Forums](https://forums.whirlpool.net.au/archive/9yqmlwn7))

**Implementation Tasks:**
- [ ] Create spending profile templates: Flat, Front-loaded, Declining
- [ ] Build interactive spending timeline with year-by-year sliders
- [ ] Add preset scenarios (travel years, aged care phases)
- [ ] Integrate variable spending into Monte Carlo simulation
- [ ] Visual spending curve display

**Code Modules:** New `spending-profiles.js`, enhance `simulator.js`, `charts.js`
**Acceptance Test:** User can set higher spending for years 65-75, lower afterwards, and see money last longer

---

### Phase 1 Dependencies
- No external dependencies
- Can be built on existing calculator infrastructure
- Requires UI/UX design for assumptions panel and spending profiles

### Phase 1 Test Scenarios
1. **High earner** (income $150k, super $400k) - should see accurate pension integration
2. **Early spender** - front-loaded spending should extend money longevity vs flat spending
3. **Conservative planner** - should be able to reduce return assumptions and see impact

---

## PHASE 2: DECISION SUPPORT
**Duration:** 3-4 weeks
**Priority:** P1 - High Impact
**Dependencies:** Phase 1 complete
**Goal:** Enable users to make informed retirement decisions through comparison tools

### Core Features

#### 2.1 Scenario Comparison Tool
**User Evidence:** Users want to test "what if" scenarios but can't compare options side-by-side (inferred from forum requests for flexible tools)

**Implementation Tasks:**
- [ ] Add "Clone Scenario" functionality
- [ ] Build side-by-side comparison view (2-4 scenarios)
- [ ] Plain English difference summaries
- [ ] Highlight key differences (success rate, years of money, required savings)
- [ ] Export comparison report

**Code Modules:** New `scenario-manager.js`, enhance `app.js`, `charts.js`
**Acceptance Test:** User can compare "retire at 65 vs 67" scenarios and see clear difference summary

---

#### 2.2 Data Export/Import System
**User Evidence:** Professional advocates call for data portability, users want control over their data ([Professional Planner](https://www.professionalplanner.com.au/2024/09/retirement-calculators-not-so-money-smart/))

**Implementation Tasks:**
- [ ] Enhance existing export to include scenarios and assumptions
- [ ] Add scenario import from JSON files
- [ ] Improve localStorage auto-save with scenario naming
- [ ] "Your data stays private" messaging
- [ ] Shareable scenario URLs (optional)

**Code Modules:** Enhance existing `utils.js` export functions, `app.js`
**Acceptance Test:** User can export scenario, share file with advisor, advisor imports and sees identical calculation

---

#### 2.3 External Investment Integration
**User Evidence:** *"I haven't found a calculator that takes into account [...] investment portfolio outside super"* ([Whirlpool Forums](https://forums.whirlpool.net.au/archive/30x1zlrk))

**Implementation Tasks:**
- [ ] Add "Other Investments" input section
- [ ] Separate return assumptions by asset class
- [ ] Integrate external assets into Age Pension asset test
- [ ] Model external portfolio drawdown during retirement
- [ ] Show total wealth vs super-only projections

**Code Modules:** Enhance `simulator.js`, new `external-assets.js`
**Acceptance Test:** User with $200k in shares sees how it affects Age Pension eligibility and total retirement income

---

### Phase 2 Dependencies
- Requires Phase 1 Age Pension integration
- Uses Phase 1 assumptions panel for asset return settings

### Phase 2 Test Scenarios
1. **Scenario comparison** - "Retire at 65 vs 67" shows clear trade-offs
2. **Data portability** - Export/import roundtrip maintains identical results
3. **Mixed portfolio** - Super + external assets shows combined projection and pension impact

---

## PHASE 3: ADVANCED FEATURES
**Duration:** 4-5 weeks
**Priority:** P1/P2 - Nice to Have
**Dependencies:** Phase 1-2 complete
**Goal:** Serve sophisticated users and ensure regulatory compliance

### Core Features

#### 3.1 Early Retirement Planning
**User Evidence:** Users planning retirement before preservation age find calculators inadequate for bridge planning

**Implementation Tasks:**
- [ ] Add preservation age calculation (birth year-based)
- [ ] Bridge account requirements calculator
- [ ] Non-super drawdown modeling for gap years
- [ ] Early retirement feasibility warnings
- [ ] Integration with external investment modeling

**Code Modules:** New `early-retirement.js`, enhance `simulator.js`
**Acceptance Test:** User retiring at 55 sees exactly how much needed in external accounts to bridge to age 60

---

#### 3.2 Housing Cost Scenarios
**User Evidence:** Super Consumers Australia found 73% of calculators ignore housing costs ([Super Consumers Australia](https://superconsumers.com.au/media-releases/serious-failures-in-super-fund-retirement-calculators/))

**Implementation Tasks:**
- [ ] Add housing status inputs (own/mortgage/rent)
- [ ] Adjust spending based on housing situation
- [ ] Include rent assistance for eligible pensioners
- [ ] Downsizing scenario modeling
- [ ] Regional cost-of-living adjustments

**Code Modules:** New `housing-costs.js`, enhance pension calculations
**Acceptance Test:** Renter sees higher spending needs and rent assistance included in pension calculation

---

#### 3.3 Regulatory Compliance Features
**Priority:** P0 for accuracy, regardless of user demand

**Implementation Tasks:**
- [ ] Division 293 tax calculations (income >$250k)
- [ ] Contribution cap tracking and warnings
- [ ] Catch-up contribution eligibility (TSB <$500k)
- [ ] Transfer balance cap considerations
- [ ] Automatic updates for changing rates/thresholds

**Code Modules:** New `tax-compliance.js`, enhance `config.js`
**Acceptance Test:** High earner sees Division 293 impact, eligible user sees catch-up opportunities

---

### Phase 3 Dependencies
- External investment modeling (Phase 2) required for early retirement planning
- Age Pension integration (Phase 1) required for housing cost scenarios

### Phase 3 Test Scenarios
1. **Early retirement** - 55-year-old sees bridge requirements and feasibility
2. **Renter** - Different spending needs and rent assistance properly calculated
3. **High earner** - Division 293 tax shown, catch-up contributions suggested

---

## PHASE 4: POLISH & PRODUCTION
**Duration:** 2-3 weeks
**Priority:** P1 - Production Readiness
**Dependencies:** Core features complete
**Goal:** Ensure reliability, performance, and user experience quality

### Implementation Tasks
- [ ] Comprehensive testing with all user scenarios from research
- [ ] Performance optimization for complex calculations
- [ ] Mobile responsive design improvements
- [ ] Error handling and input validation
- [ ] Browser compatibility testing
- [ ] Accessibility improvements (WCAG compliance)
- [ ] Documentation updates

### Test Coverage
- [ ] All Whirlpool forum user scenarios pass correctly
- [ ] Results match MoneySmart calculator for standard cases
- [ ] Performance benchmarks (calculations <3 seconds)
- [ ] Mobile usability testing
- [ ] Cross-browser compatibility

---

## Feature Implementation Mapping

### Current Codebase Integration
```
src/js/
├── app.js              # Main controller - enhance for scenarios
├── simulator.js        # Core engine - add pension & variable spending
├── utils.js            # Utilities - enhance export/import
├── config.js           # Constants - make user-editable
├── charts.js           # Visualizations - add comparison charts
└── new modules:
    ├── assumptions-panel.js    # Phase 1
    ├── age-pension.js          # Phase 1
    ├── spending-profiles.js    # Phase 1
    ├── scenario-manager.js     # Phase 2
    ├── external-assets.js      # Phase 2
    ├── early-retirement.js     # Phase 3
    ├── housing-costs.js        # Phase 3
    └── tax-compliance.js       # Phase 3
```

### Data Model Extensions
```typescript
// Enhance existing profile structure
interface RetirementProfile {
  // existing fields...

  // Phase 1 additions
  assumptions: {
    investmentReturn: number;
    inflation: number;
    lifeExpectancy: number;
    fees: number;
    userEdited: boolean;
  };

  spendingProfile: {
    type: 'flat' | 'front-loaded' | 'declining' | 'custom';
    customAmounts: Array<{age: number, amount: number}>;
  };

  // Phase 2 additions
  externalAssets: {
    shares: number;
    property: number;
    savings: number;
    other: number;
  };

  // Phase 3 additions
  housing: {
    status: 'own' | 'mortgage' | 'rent';
    monthlyPayment: number;
    considerDownsizing: boolean;
  };
}
```

---

## Evidence vs Specification Document Analysis

### Supported by User Evidence (Implement First):
✅ **Transparent assumptions** - Direct user complaints about opacity
✅ **Age Pension modeling** - Most frequent missing feature
✅ **Variable spending profiles** - Explicitly requested by multiple users
✅ **Scenario comparison** - Inferred need from "what if" questions
✅ **Data portability** - Privacy and control concerns

### Not Supported by Evidence (Deprioritize/Research):
❌ **Predefined personas** - No evidence users think this way
❌ **Business CGT exemptions** - Not mentioned in user discussions
❌ **Confidence scoring widgets** - Expert recommendation, not user request
❌ **Progressive disclosure UI** - Design assumption, not validated need

### Mixed Evidence (Include but Lower Priority):
⚠️ **Early retirement features** - Some user requests but niche
⚠️ **Housing cost modeling** - Expert recommendation, some user mentions
⚠️ **Regulatory compliance** - Required for accuracy but not requested

---

## Success Metrics (Evidence-Based)

### User Trust Metrics
- [ ] User can identify all assumptions used in their calculation
- [ ] Age Pension estimates match MoneySmart within 5%
- [ ] Users complete calculations without abandoning due to confusion

### Decision Support Metrics
- [ ] Users can answer "What if I retire 2 years later?" in <2 minutes
- [ ] Scenario comparison shows clear trade-offs between options
- [ ] Export/import maintains 100% calculation fidelity

### Accuracy Metrics
- [ ] Complex scenarios (early retirement, external assets, pension integration) produce realistic projections
- [ ] Regulatory calculations (Division 293, contribution caps) follow current ATO rules
- [ ] Variable spending profiles reflect realistic retirement patterns

---

**This implementation plan prioritizes features with strong evidence of user demand while treating persona-specific features from the original specification as hypotheses requiring validation through usage analytics after core features are deployed.**