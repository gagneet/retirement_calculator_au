# USER DEMAND FEATURES
**Evidence-Based Feature Prioritization from Real Australian Users**

**Project:** retirement.gagneet.com v2.0 Enhancement
**Date:** September 29, 2025
**Source:** User research from Whirlpool Forums, Super Consumers Australia, Professional Planner, ASIC feedback

---

## Feature Priority Framework

**P0 (Must Have)** - Addresses critical user trust issues or regulatory compliance
**P1 (High Impact)** - Solves frequently mentioned user pain points
**P2 (Nice to Have)** - Requested by some users but lower frequency/impact

---

## P0 FEATURES (Critical User Demand)

### 1. Transparent Assumptions Panel
**Why users want it:** *"The problem with most of the calculators online is they don't allow you to reduce your expenditure over time!"* Users repeatedly cite opaque assumptions as the primary trust issue ([Whirlpool Forums](https://forums.whirlpool.net.au/archive/9yqmlwn7))

**Proposed UI Treatment:**
- Collapsible "Show Assumptions" panel with editable fields
- Investment returns, inflation, life expectancy, fees all user-controllable
- "Restore MoneySmart Defaults" button for regulatory baseline

**Acceptance Test:** User can edit any assumption value and see the calculation update in real-time. All assumption values are visible without needing to dig through multiple screens.

**Impact:** High - Fixes fundamental trust issues
**Effort:** Low - Modify existing config system to be user-facing

---

### 2. Accurate Age Pension Integration (MoneySmart-Aligned)
**Why users want it:** *"the calculators seem to only apply to fully funded retirees"* and users can't find calculators that properly handle pension integration ([Whirlpool Forums](https://forums.whirlpool.net.au/archive/30x1zlrk))

**Proposed UI Treatment:**
- "Age Pension Eligible?" toggle with automatic threshold checks
- Real-time asset test vs income test comparison
- Deeming rate calculations shown transparently
- "Pension Optimization" suggestions when near thresholds

**Acceptance Test:** Calculator produces Age Pension estimates within 5% of MoneySmart calculator for identical inputs. Shows which test (asset/income) is limiting pension amount.

**Impact:** High - Addresses most frequent user complaint
**Effort:** Medium - Requires implementing full Australian pension rules

---

### 3. Variable Spending Profiles
**Why users want it:** *"I will want to spend more when I am first retired (travelling, dining out etc) and less when I am very old"* - constant spending assumption is widely criticized as unrealistic ([Whirlpool Forums](https://forums.whirlpool.net.au/archive/9yqmlwn7))

**Proposed UI Treatment:**
- Preset templates: "Flat", "Front-loaded", "Declining with age"
- Interactive spending curve with year-by-year adjustment sliders
- Pre-defined scenarios: "Travel years 65-75, then reduce by 20%"

**Acceptance Test:** User can set different spending amounts for different retirement phases and see how it affects money longevity. Spending profile visually displayed on timeline.

**Impact:** High - Makes projections realistic for most users
**Effort:** Medium - Requires timeline UI and spending curve calculations

---

## P1 FEATURES (High User Demand)

### 4. Scenario Comparison Tool
**Why users want it:** Users want to test "what if" scenarios but current tools don't allow side-by-side comparisons. Multiple forum users ask for this capability.

**Proposed UI Treatment:**
- "Clone Scenario" button to duplicate current calculation
- Side-by-side comparison view showing key differences
- Plain English summary: "Retiring 2 years later increases success rate by 15%"

**Acceptance Test:** User can create and compare up to 4 scenarios simultaneously with clear visual differences highlighted.

**Impact:** High - Enables better decision-making
**Effort:** Medium - Requires scenario management and comparison UI

---

### 5. Data Export/Import and Local Storage
**Why users want it:** Users dislike forced logins and want control over their financial planning data. Professional advocates call for data portability ([Professional Planner](https://www.professionalplanner.com.au/2024/09/retirement-calculators-not-so-money-smart/))

**Proposed UI Treatment:**
- "Download Scenario" button (JSON format)
- "Upload Scenario" file picker
- Auto-save to localStorage with "Your data stays on your device" messaging
- Optional "Share Scenario URL" for consultations

**Acceptance Test:** User can download their scenario, clear browser data, then upload and restore exact same calculation. No login required for basic functionality.

**Impact:** Medium - Addresses user control and privacy concerns
**Effort:** Low - Leverage existing export functionality

---

### 6. External Investment Portfolio Integration
**Why users want it:** *"I haven't found a calculator that takes into account all of the following in one: age pension, retirement before age 60, investment portfolio outside super"* ([Whirlpool Forums](https://forums.whirlpool.net.au/archive/30x1zlrk))

**Proposed UI Treatment:**
- "Other Investments" section with asset type breakdown
- Separate return assumptions for different asset classes
- Integration with Age Pension asset test calculations

**Acceptance Test:** User can input shares, property, savings outside super and see total wealth projection including how external assets affect Age Pension eligibility.

**Impact:** Medium - Serves users with complex portfolios
**Effort:** Medium - Requires expanding asset modeling beyond super

---

### 7. Early Retirement Planning Tools
**Why users want it:** Users planning to retire before preservation age find current calculators inadequate for modeling bridge strategies and portfolio drawdown.

**Proposed UI Treatment:**
- "Early Retirement" mode when retirement age < preservation age
- Bridge account requirements calculator
- Years without super access clearly highlighted
- Required non-super portfolio size for gap years

**Acceptance Test:** User retiring at 55 can see exactly how much they need in non-super investments to bridge to preservation age 60, with yearly drawdown projections.

**Impact:** Medium - Serves FIRE community and early retirees
**Effort:** Medium - Requires preservation age logic and bridge calculations

---

## P2 FEATURES (Lower Priority User Requests)

### 8. Housing Cost Scenarios
**Why users want it:** Super Consumers Australia found 73% of calculators fail to ask about mortgage status, and renters have different spending needs ([Super Consumers Australia](https://superconsumers.com.au/media-releases/serious-failures-in-super-fund-retirement-calculators/))

**Proposed UI Treatment:**
- Housing status: "Own outright", "Paying mortgage", "Renting"
- Rent assistance calculations for eligible pensioners
- Downsizing scenarios with equity release modeling

**Acceptance Test:** Calculator adjusts spending needs based on housing situation and includes relevant government assistance.

**Impact:** Medium - More accurate for renters and mortgaged retirees
**Effort:** Medium - Requires housing cost modeling and assistance rules

---

### 9. Sensitivity Analysis and Confidence Indicators
**Why users want it:** Experts recommend showing uncertainty rather than single point estimates due to widely varying results across calculators.

**Proposed UI Treatment:**
- "Show Confidence Ranges" toggle
- Success probability at ages 85, 90, 95
- "Your plan works in X% of scenarios" with plain English explanation

**Acceptance Test:** User can see probability ranges and understands likelihood of different outcomes, not just one projection.

**Impact:** Medium - Better communicates uncertainty
**Effort:** High - Requires Monte Carlo analysis implementation

---

### 10. Actionable Recommendations Engine
**Why users want it:** Users want specific next steps, not just projections. They want to know "increase super by X" or "delay retirement by Y years" with dollar impact.

**Proposed UI Treatment:**
- "Quick Wins" panel with top 3 specific actions
- Dollar impact estimates: "Increase contributions by $2,000 → Retire 6 months earlier"
- Implementation steps: "Email payroll to increase salary sacrifice by $X per month"

**Acceptance Test:** Calculator provides specific, actionable advice with clear implementation steps and expected outcomes.

**Impact:** High - Makes calculator actionable rather than just informational
**Effort:** High - Requires sophisticated optimization algorithms

---

## Regulatory/Compliance Features (Required Regardless of User Demand)

### Division 293 Tax Calculations
**Priority:** P0 (Regulatory compliance)
**Why needed:** Tax law requires additional 15% tax on super contributions for high earners
**User Evidence:** Not explicitly requested but affects accuracy for high-income users
**Implementation:** Must be included for calculation accuracy

### Contribution Cap Tracking
**Priority:** P1 (Regulatory compliance)
**Why needed:** Users making additional contributions need cap compliance
**User Evidence:** Advanced users on forums mention contribution limits
**Implementation:** Automatic warnings when approaching caps

### Catch-Up Contribution Eligibility
**Priority:** P2 (Regulatory opportunity)
**Why needed:** Available to users with TSB <$500k but rarely explained
**User Evidence:** Not widely known but valuable for eligible users
**Implementation:** Automatic eligibility check and opportunity alert

---

## Comparison with Enhancement Specification Document

### Features Supported by User Evidence:
✅ **Transparent assumptions** - Directly requested by users
✅ **Age Pension modeling** - Most frequent user complaint
✅ **Variable spending** - Explicitly requested feature
✅ **Scenario comparison** - Implied user need from forum discussions
✅ **Data portability** - Advocated by experts and implied by user behavior

### Features NOT Supported by User Evidence:
❌ **Specific personas (Sarah, Mark, Robert, Jenny)** - No evidence users think in these terms
❌ **Business CGT exemptions** - Not mentioned in user discussions
❌ **Catch-up contributions** - Mentioned by experts but not user requests
❌ **Confidence scoring** - Expert recommendation, not user request
❌ **Progressive disclosure** - UI assumption, not evidence-based user need

### Recommendation:
Focus Phase 1 on evidence-backed features (transparent assumptions, Age Pension, variable spending, scenario comparison). Phase 2 can include regulatory compliance items. Treat persona-specific features as hypotheses requiring validation.