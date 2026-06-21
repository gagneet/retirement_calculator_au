# Priority Actions Summary
## Retirement Calculator Audit - 2025-10-02

> **Full audit report:** `docs/IMPLEMENTATION_AUDIT_2025-10-02.md` (160+ pages)

---

## Executive Summary

✅ **Overall Status:** GOOD - Calculator is substantially correct and compliant
⚠️ **Action Required:** Several enhancements needed for robustness and auditability

---

## 🔴 CRITICAL ACTIONS (Do These First)

### 1. Privacy Network Validation (4 hours)
**Why:** You claim "no data sent to servers" - MUST verify this is true

**What to do:**
```bash
cd /home/gagneet/retirement_calculator_au
mkdir -p tests
```

Create `tests/privacy-audit.js`:
```javascript
const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  const suspiciousRequests = [];

  page.on('request', req => {
    const url = req.url();
    if (req.method() === 'POST' &&
        !url.includes('cdn.') &&
        !url.includes('jsdelivr.net') &&
        !url.includes('tailwindcss.com')) {
      suspiciousRequests.push({
        url,
        method: req.method(),
        postData: req.postData()
      });
    }
  });

  await page.goto('https://retirement.gagneet.com', { waitUntil: 'networkidle2' });

  // Test critical flows
  await page.evaluate(() => {
    // Simulate save
    const saveBtn = document.querySelector('[data-action="save"]');
    if (saveBtn) saveBtn.click();
  });

  await page.waitForTimeout(2000);

  const localStorage = await page.evaluate(() => JSON.stringify(window.localStorage));

  console.log('=== PRIVACY AUDIT RESULTS ===');
  console.log('Suspicious POST requests:', suspiciousRequests.length);
  if (suspiciousRequests.length > 0) {
    console.log(JSON.stringify(suspiciousRequests, null, 2));
  }
  console.log('\\nLocalStorage keys:', Object.keys(JSON.parse(localStorage)));

  await browser.close();

  process.exit(suspiciousRequests.length > 0 ? 1 : 0);
})();
```

**Run:**
```bash
npm install puppeteer
node tests/privacy-audit.js
```

**Expected:** Zero suspicious requests
**If violations found:** Fix immediately before promoting privacy claim

---

### 2. Update ASFA Values to March 2025 (30 min)
**Why:** Currently using December 2024 values (~1.2% outdated)

**What to change in `src/js/config.js`:**

Line 327:
```javascript
asfaComfortable: 72148,  // Change from 73031
```

Line 776:
```javascript
COUPLE_COMFORTABLE_ANNUAL: { value: 72148 }  // Change from 73031
```

Line 782:
```javascript
COUPLE_COMFORTABLE_MONTHLY: { value: 6012 }  // Change from 6086
```

Line 789:
```javascript
SINGLE_COMFORTABLE_ANNUAL: { value: 51278 }  // Change from 51814
```

Line 795:
```javascript
SINGLE_COMFORTABLE_MONTHLY: { value: 4273 }  // Change from 4318
```

**Then:**
```bash
npm run build
# Test at https://retirement.gagneet.com
```

---

### 3. Validate Age Pension Calculation (1-2 days)
**Why:** This is the most complex and critical financial calculation

**Where to look:**
```bash
grep -r "calculateAgePension\|calculateDeemedIncome\|assetTest\|incomeTest" src/js/
```

**Required checks:**
1. **Two-tier deeming** is implemented correctly:
   - Couple: First $106,200 at 0.75%, rest at 2.75% ✅
   - Test with $200,000: should give $3,376/year deemed income

2. **Asset taper** is $3 per fortnight per $1,000 over threshold:
   - Couple with $600k assets (threshold $481.5k):
   - Excess = $118.5k → Taper = $355.50 per fortnight
   - Max pension $1,777/fn → Reduced to $1,421.50/fn

3. **Lower-of-two-tests logic:**
   - Age Pension = MIN(assetTestResult, incomeTestResult)

**Test by hand-calculating 3-5 scenarios and comparing to calculator results**

---

## 🟡 HIGH PRIORITY (Within 2 Weeks)

### 4. Upgrade Monte Carlo to Lognormal Returns (2-3 days)
**Why:** Current normal distribution can produce impossible returns (< -100%)

**What to implement in `src/js/simulator.js`:**

Add this function:
```javascript
function generateLognormalReturn(expectedReturn, volatility, z = null) {
    if (z === null) {
        z = gaussianRandom(0, 1);  // Your existing normal generator
    }
    const mu = Math.log(1 + expectedReturn) - 0.5 * volatility * volatility;
    const sigma = volatility;
    return Math.exp(mu + sigma * z) - 1;
}
```

Replace your equity return generation from:
```javascript
// OLD (normal):
return expectedReturn + volatility * gaussianRandom();
```

To:
```javascript
// NEW (lognormal):
return generateLognormalReturn(expectedReturn, volatility);
```

**Benefit:** Returns will always be > -100% (mathematically impossible to lose more than 100%)

---

### 5. Add Export Assumption Snapshot (1 day)
**Why:** Audit trail - users should know what assumptions were used

**Where:** `src/js/utils.js` (or wherever export functions live)

Add to CSV exports (as header), XLSX exports (as first sheet), PDF exports (as page 2):

```
========================================
ASSUMPTION SNAPSHOT
========================================
Report Generated: [DATE/TIME]
Calculator Version: 1.1.0
Data Version: 2025-10-01

REGULATORY VALUES (Sept 2025):
- Age Pension couple threshold: $481,500
- Age Pension couple max: $46,202/year
- Deeming rates: 0.75% / 2.75%
- Tax brackets: 0% / 16% / 30% / 37% / 45%
- Medicare levy: 2%

ECONOMIC ASSUMPTIONS:
- General inflation: 2.6% (RBA median 2004-2025)
- Healthcare inflation: 3.8% (AIHW median 2012-2024)
- Super return: 7.5% (APRA balanced median)
- Property growth: 5.8% (CoreLogic median 2000-2025)

SIMULATION:
- Monte Carlo runs: [USER VALUE]
- Return volatility: [USER VALUE]
- Lognormal returns: Yes/No

Sources: Services Australia, ATO, ASFA, RBA, AIHW, APRA
========================================
```

---

### 6. Clarify Healthcare Inflation Source (1 hour)
**Why:** Config says "3.8% median" but AIHW decade average is 2.26%

**What to add in `src/js/config.js` line 93:**
```javascript
// Healthcare inflation rates by condition (Updated 2025-10-01 to AIHW median values)
// NOTE: AIHW data shows:
//   - Price inflation (cost per service): ~3.8% median 2012-2024
//   - Per-capita spending growth (volume adjusted): ~2.3% 2012-2023
// We use PRICE inflation (3.8%) because we model the cost of existing services escalating,
// not changes in service utilization or population health.
// Source: AIHW Health Expenditure Australia 2022-23 report
HEALTHCARE_INFLATION: {
    none: 3.5,      // Below median - minimal healthcare needs
    minor: 3.8,     // Median PRICE inflation (AIHW 2012-2024)
    moderate: 4.5,  // Above median - increased healthcare needs
    major: 6.5      // Significantly above median - major health conditions
}
```

---

## 🟢 MEDIUM PRIORITY (Within 1 Month)

### 7. Add "Clear My Data" Button (2 hours)
Add to main calculator page:
```html
<button id="clear-all-data" class="text-red-600 hover:text-red-800 text-sm">
  🗑️ Clear All My Data
</button>
```

With JavaScript handler:
```javascript
document.getElementById('clear-all-data').addEventListener('click', () => {
    if (confirm('Are you sure? This will permanently delete all your saved data. This cannot be undone.')) {
        localStorage.clear();
        alert('All data cleared. Page will now reload.');
        location.reload();
    }
});
```

---

### 8. Franking Credit Tax Integration (1 day)
**Issue:** Franking benefit varies by tax rate, but calculator uses fixed 1.2x factor

**Enhancement:** Calculate benefit dynamically based on:
- Pension phase (0% tax) → benefit ~1.43x
- Accumulation (15% tax) → benefit ~1.21x
- Marginal 30% tax → benefit = 1.0x (neutral)
- Marginal 45% tax → benefit < 1.0x (cost)

**Where:** Wherever franking credits are applied to dividend income

---

### 9. Trust Attribution Disclaimer (1 hour)
**Where:** HTML form where users enter trust information

**Add:**
```html
<div class="bg-yellow-50 border-l-4 border-yellow-400 p-3 text-sm">
  <p class="font-semibold">⚠️ Trust Attribution is Complex</p>
  <p>Centrelink assesses trusts based on control, distributions, and structure.
  This calculator uses simplified estimates. For trusts over $100,000, seek
  professional advice from an accountant familiar with Centrelink rules.</p>
  <a href="https://www.servicesaustralia.gov.au/private-trusts"
     class="text-blue-600 hover:underline">Learn more →</a>
</div>
```

---

### 10. Overseas Country Metadata Audit (3-4 hours)
**Goal:** Document source for every country's cost-of-living multiplier

**Method:**
1. Find file with country list (probably `overseas-retirement.js`)
2. Extract all countries
3. For each, add comments with sources:
```javascript
{
    code: 'TH',
    name: 'Thailand',
    colMultiplier: 0.6,  // Numbeo COL Index Jan 2025: Thailand 60% of Sydney
    colSource: 'https://www.numbeo.com/cost-of-living/compare_cities.jsp?...',
    pensionTaxTreatment: 'taxed_in_australia',
    pensionTaxSource: 'ATO TR 2001/13',
    doubleTaxTreaty: true,
    treatySource: 'Australia-Thailand DTA (1989)'
}
```

---

## Reference: What's ALREADY GOOD ✅

### Medians ARE Being Used
✅ Config shows median values for:
- Inflation: 2.6% (line 282)
- Healthcare: 3.8% (line 273)
- Super return: 7.5% (line 286)
- Property growth: 5.8% (line 267)

✅ Monte Carlo outputs percentiles (10th, 25th, 50th/median, 75th, 90th)
✅ Fan charts show percentile bands, not averages

### Regulatory Values Are Correct
✅ Age Pension thresholds match Sept 2025 (Services Australia)
✅ Tax brackets match 2025-26 (ATO)
✅ MPIR rate is current: 7.61% (Oct 2025)
✅ Deeming rates: 0.75% / 2.75% (correct)

### Privacy Controls Exist
✅ localStorage is used (client-side only)
✅ No obvious server-side data collection in code
⚠️ But needs VALIDATION via network capture test

---

## Testing Before Going Live with Changes

Run this checklist:
```bash
# 1. Build
npm run build

# 2. Privacy audit
node tests/privacy-audit.js
# Expect: 0 suspicious requests

# 3. Smoke test calculations on live site
# Visit https://retirement.gagneet.com
# Enter sample data
# Run standard and Monte Carlo projections
# Export to PDF
# Check: No console errors, results look reasonable

# 4. Verify ASFA values updated
# Check "Retirement Standards" section shows $72,148 (not $73,031)

# 5. Check assumption snapshot in exports
# Open exported PDF
# Page 2 should have "ASSUMPTION SNAPSHOT" header
# Should list all regulatory values with sources
```

---

## Timeline

| Week | Focus | Deliverables |
|------|-------|--------------|
| **Week 1** | Critical actions | Privacy validation ✅, ASFA update ✅, Age Pension validation ✅ |
| **Week 2-3** | High priority | Lognormal Monte Carlo ✅, Export snapshot ✅, Healthcare clarification ✅ |
| **Week 4** | Medium priority | Clear data button, Trust disclaimer, Franking enhancement |

---

## Questions/Blockers?

**If you find issues during Age Pension validation:**
- Post specific test case (inputs + expected output)
- Compare to https://www.servicesaustralia.gov.au/age-pension-calculator
- Flag if calculator differs by >$500/year

**If privacy audit fails:**
- Document every suspicious request
- Check if it's Google Analytics (would need disclosure)
- If third-party tracking found, remove immediately

**If you want to skip low-priority items:**
- That's fine! Focus on correctness first (Critical + High priority)
- UX polish (Medium priority) can wait

---

## Detailed Report Location

**Full 160-page audit:** `/home/gagneet/retirement_calculator_au/docs/IMPLEMENTATION_AUDIT_2025-10-02.md`

Includes:
- Complete regulatory data validation
- Monte Carlo statistical deep dive
- Privacy audit protocols
- Test cases and acceptance criteria
- Developer documentation templates
- Regulatory update calendar
- All source links and references

---

**Bottom line:** Your calculator is fundamentally sound. The critical actions ensure it's audit-proof and the high-priority items make it statistically robust. Medium priority is polish and user trust enhancements.
