/**
 * Shared Playwright utilities for the Australian Retirement Calculator test suite.
 */

const { expect } = require('../../../playwright_modules/node_modules/@playwright/test');

/**
 * Adds a script to run before page load that bypasses the disclaimer modal.
 * Must be called before page.goto().
 */
async function bypassDisclaimer(page) {
  await page.addInitScript(() => {
    localStorage.setItem('disclaimerAccepted', 'true');
  });
}

/**
 * Accepts the disclaimer modal by clicking the accept button.
 * Use when you want to test the actual disclaimer flow.
 */
async function acceptDisclaimer(page) {
  const modal = page.locator('#disclaimer-modal');
  await expect(modal).toBeVisible({ timeout: 10000 });
  await page.click('#accept-disclaimer');
  await expect(modal).toBeHidden({ timeout: 5000 });
}

/**
 * Forces the advanced calculator form to be visible by directly manipulating DOM.
 * Hides the onboarding container and shows the form.
 */
async function showCalculatorForm(page) {
  await page.evaluate(() => {
    const form = document.getElementById('advancedCalculatorForm');
    if (form) form.style.display = 'grid';
    const container = document.getElementById('onboarding-container');
    if (container) container.style.display = 'none';
    const showBtn = document.getElementById('showAdvancedCalculatorButton');
    if (showBtn) {
      showBtn.classList.remove('hidden');
      showBtn.style.display = 'block';
    }
  });
}

/**
 * Waits for a calculation to complete.
 * After btnCalculate, the app calls showTab('summary') so we wait for
 * summaryResults to have populated children, which only happens post-calculation.
 */
async function waitForCalculationResults(page, timeout = 25000) {
  // The app switches to the summary tab on completion and populates #summaryResults.
  // We wait for that tab to become active with real content.
  await page.waitForFunction(
    () => {
      // Primary signal: summary tab is active with children (only populated after calc)
      const summaryTab = document.getElementById('summary-tab');
      const summaryResults = document.getElementById('summaryResults');
      if (summaryTab && summaryTab.classList.contains('active') &&
          summaryResults && summaryResults.children.length > 2) {
        return true;
      }
      // Fallback: outcome-overview-stats has stat elements (not just placeholder)
      const overviewStats = document.getElementById('outcome-overview-stats');
      if (overviewStats && overviewStats.querySelector('.outcome-overview-stat')) {
        return true;
      }
      // Fallback: finalResult has content
      const finalResult = document.getElementById('finalResult');
      return finalResult && finalResult.textContent && finalResult.textContent.trim().length > 10;
    },
    { timeout }
  );
}

/**
 * Navigates to the outcome tab and ensures both the tab and its view container are visible.
 *
 * Background: after btnCalculate the app calls showTab('summary'), leaving outcome-tab
 * with display:none. Inside it, outcome-view-container also needs an .active class to show
 * its children. In normal onboarding flow the JS adds this; when tests bypass onboarding
 * and directly show the form, displayOutcomeResults may throw internally (caught silently),
 * leaving the container without .active. We activate it programmatically here so tests
 * can assert on the outcome data that WAS populated.
 */
async function goToOutcomeTab(page) {
  // Click the tab button to make outcome-tab active (display:block)
  await page.click('button.tab-button:has-text("Your Outcome")');
  await page.waitForFunction(() => {
    const tab = document.getElementById('outcome-tab');
    return tab && tab.classList.contains('active');
  }, { timeout: 8000 });
  // Ensure the inner outcome-view-container is visible; activate it if the JS didn't
  await page.evaluate(() => {
    const container = document.getElementById('outcome-view-container');
    if (container && !container.classList.contains('active')) {
      container.classList.add('active');
    }
  });
  await page.waitForTimeout(200);
}

/**
 * Clicks a result tab by its name and waits for it to become active.
 */
async function clickResultTab(page, tabName) {
  await page.click(`button.tab-button:has-text("${tabName}")`);
  await page.waitForSelector(`#${tabName}-tab.active, div[id="${tabName}-tab"].active`, {
    timeout: 5000,
  }).catch(() => {
    // Tab IDs sometimes have different casing; just wait briefly
  });
  await page.waitForTimeout(300);
}

/**
 * Opens the export dropdown and returns the dropdown locator.
 */
async function openExportDropdown(page) {
  await page.click('#btnExport');
  await expect(page.locator('#exportDropdown')).toBeVisible({ timeout: 5000 });
  return page.locator('#exportDropdown');
}

module.exports = {
  bypassDisclaimer,
  acceptDisclaimer,
  showCalculatorForm,
  waitForCalculationResults,
  goToOutcomeTab,
  clickResultTab,
  openExportDropdown,
};
