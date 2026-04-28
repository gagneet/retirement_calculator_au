/**
 * Basic calculation workflow tests.
 * Covers: running a calculation, verifying results appear, outcome tab content.
 *
 * Key behavior: after btnCalculate, the app calls showTab('summary') — so results
 * appear on the Summary tab by default. To check Outcome tab elements, we explicitly
 * navigate there after calculation.
 */

const { test, expect } = require('../../playwright_modules/node_modules/@playwright/test');
const {
  bypassDisclaimer,
  showCalculatorForm,
  waitForCalculationResults,
  goToOutcomeTab,
} = require('./helpers/page-utils');

test.describe('Basic Calculation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await bypassDisclaimer(page);
    await page.goto('/advanced.html');
    await showCalculatorForm(page);
  });

  test('Calculate button is visible and enabled', async ({ page }) => {
    const btn = page.locator('#btnCalculate');
    await expect(btn).toBeVisible();
    await expect(btn).toBeEnabled();
  });

  test('clicking Calculate shows Summary tab with results', async ({ page }) => {
    await page.click('#btnCalculate');
    await waitForCalculationResults(page);
    // App switches to summary tab on completion
    const summaryTab = page.locator('#summary-tab');
    await expect(summaryTab).toHaveClass(/active/, { timeout: 10000 });
  });

  test('summary tab is populated after calculation', async ({ page }) => {
    await page.click('#btnCalculate');
    await waitForCalculationResults(page);
    const summaryResults = page.locator('#summaryResults');
    await expect(summaryResults).toBeVisible({ timeout: 10000 });
    const childCount = await summaryResults.locator('> *').count();
    expect(childCount).toBeGreaterThan(2);
  });

  test('outcome overview stats bar has data after navigating to outcome tab', async ({ page }) => {
    await page.click('#btnCalculate');
    await waitForCalculationResults(page);
    // Navigate explicitly to outcome tab (app lands on summary after calc)
    await goToOutcomeTab(page);
    const statsBar = page.locator('#outcome-overview-stats');
    await expect(statsBar).toBeVisible({ timeout: 10000 });
    // Placeholder should be gone; real stat elements should be present
    await expect(statsBar).not.toContainText('Run the calculation');
  });

  test('outcome overview shows stat items after calculation', async ({ page }) => {
    await page.click('#btnCalculate');
    await waitForCalculationResults(page);
    await goToOutcomeTab(page);
    // At least one .outcome-overview-stat element should exist
    const stats = page.locator('#outcome-overview-stats .outcome-overview-stat');
    await expect(stats.first()).toBeVisible({ timeout: 10000 });
  });

  test('retirement age is shown in outcome after calculation', async ({ page }) => {
    await page.click('#btnCalculate');
    await waitForCalculationResults(page);
    await goToOutcomeTab(page);
    const retirementAgeEl = page.locator('#outcome-retirement-age');
    await expect(retirementAgeEl).toBeVisible({ timeout: 10000 });
    const text = await retirementAgeEl.textContent();
    expect(Number(text)).toBeGreaterThanOrEqual(55);
    expect(Number(text)).toBeLessThanOrEqual(75);
  });

  test('outcome shows super balance projection', async ({ page }) => {
    await page.click('#btnCalculate');
    await waitForCalculationResults(page);
    await goToOutcomeTab(page);
    const superBalance = page.locator('#outcome-super-balance');
    await expect(superBalance).toBeVisible({ timeout: 10000 });
    const text = await superBalance.textContent();
    expect(text).toMatch(/\$[\d,]+/);
  });

  test('outcome shows projected annual income', async ({ page }) => {
    await page.click('#btnCalculate');
    await waitForCalculationResults(page);
    await goToOutcomeTab(page);
    const income = page.locator('#outcome-annual-income');
    await expect(income).toBeVisible({ timeout: 10000 });
    await expect(income).toContainText('$');
  });

  test('outcome shows gap or surplus indicator', async ({ page }) => {
    await page.click('#btnCalculate');
    await waitForCalculationResults(page);
    await goToOutcomeTab(page);
    const indicator = page.locator('#outcome-gap-indicator');
    await expect(indicator).toBeVisible({ timeout: 10000 });
  });

  test('Age Pension amount is shown in outcome', async ({ page }) => {
    await page.click('#btnCalculate');
    await waitForCalculationResults(page);
    await goToOutcomeTab(page);
    const pension = page.locator('#outcome-age-pension');
    await expect(pension).toBeVisible({ timeout: 10000 });
    await expect(pension).toContainText('$');
  });

  test('action plan cards are generated after calculation', async ({ page }) => {
    await page.click('#btnCalculate');
    await waitForCalculationResults(page);
    await goToOutcomeTab(page);
    const actionCards = page.locator('#outcome-action-cards');
    await actionCards.scrollIntoViewIfNeeded();
    await expect(actionCards).toBeVisible({ timeout: 10000 });
    const cardCount = await actionCards.locator('> *').count();
    expect(cardCount).toBeGreaterThan(0);
  });

  test('calculation reflects changed retirement age', async ({ page }) => {
    await page.locator('#retirementAge').fill('70');
    await page.click('#btnCalculate');
    await waitForCalculationResults(page);
    await goToOutcomeTab(page);
    const retirementAgeEl = page.locator('#outcome-retirement-age');
    await expect(retirementAgeEl).toBeVisible({ timeout: 10000 });
    const text = await retirementAgeEl.textContent();
    expect(Number(text)).toBe(70);
  });

  test('summary tab shows results without navigating away', async ({ page }) => {
    await page.click('#btnCalculate');
    await waitForCalculationResults(page);
    // summaryResults should have content (app lands here after calc)
    const summaryResults = page.locator('#summaryResults');
    await expect(summaryResults).toBeVisible({ timeout: 10000 });
    const childCount = await summaryResults.locator('> *').count();
    expect(childCount).toBeGreaterThan(0);
  });
});

test.describe('Calculation - Reset to Defaults', () => {
  test.beforeEach(async ({ page }) => {
    await bypassDisclaimer(page);
    await page.goto('/advanced.html');
    await showCalculatorForm(page);
  });

  test('Reset to Defaults button restores form values', async ({ page }) => {
    await page.locator('#yourCurrentAge').fill('50');
    // Accept any confirm dialog that may appear
    page.on('dialog', dialog => dialog.accept());
    await page.click('#btnResetDefaults');
    await page.waitForTimeout(800);
    const val = await page.locator('#yourCurrentAge').inputValue();
    expect(Number(val)).not.toBe(50);
  });
});
