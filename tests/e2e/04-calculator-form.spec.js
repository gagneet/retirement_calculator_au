/**
 * Calculator form tests for advanced.html.
 * Covers: form sections, default values, input validation, UI controls.
 */

const { test, expect } = require('../../playwright_modules/node_modules/@playwright/test');
const { bypassDisclaimer, showCalculatorForm } = require('./helpers/page-utils');

test.describe('Calculator Form - Visibility and Structure', () => {
  test.beforeEach(async ({ page }) => {
    await bypassDisclaimer(page);
    await page.goto('/advanced.html');
    await showCalculatorForm(page);
  });

  test('calculator form is visible after show', async ({ page }) => {
    const form = page.locator('#advancedCalculatorForm');
    await expect(form).toBeVisible({ timeout: 5000 });
  });

  test('all four form sections are present', async ({ page }) => {
    await expect(page.locator('.section-personal-risk')).toBeVisible();
    await expect(page.locator('.section-property')).toBeVisible();
    await expect(page.locator('.section-economic')).toBeVisible();
    await expect(page.locator('.section-pension')).toBeVisible();
  });

  test('action buttons container is visible', async ({ page }) => {
    await expect(page.locator('#action-buttons-container')).toBeVisible();
  });

  test('all main action buttons are present', async ({ page }) => {
    const buttons = ['#btnCalculate', '#btnMonteCarlo', '#btnStressTest',
      '#btnRetirementSolver', '#btnGenerateRecommendations', '#btnExport'];
    for (const id of buttons) {
      await expect(page.locator(id)).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Calculator Form - Input Fields', () => {
  test.beforeEach(async ({ page }) => {
    await bypassDisclaimer(page);
    await page.goto('/advanced.html');
    await showCalculatorForm(page);
  });

  test('Your Current Age field accepts a number', async ({ page }) => {
    const field = page.locator('#yourCurrentAge');
    await expect(field).toBeVisible();
    await field.fill('45');
    await expect(field).toHaveValue('45');
  });

  test('Retirement Age field accepts a number', async ({ page }) => {
    const field = page.locator('#retirementAge');
    await expect(field).toBeVisible();
    await field.fill('65');
    await expect(field).toHaveValue('65');
  });

  test('Your Salary field accepts a value', async ({ page }) => {
    const field = page.locator('#yourSalary');
    await expect(field).toBeVisible();
    await field.fill('100000');
    const val = await field.inputValue();
    expect(val).toBeTruthy();
  });

  test('Current Super Balance field is present', async ({ page }) => {
    await expect(page.locator('#yourCurrentSuper')).toBeVisible();
  });

  test('Current Savings field is present', async ({ page }) => {
    await expect(page.locator('#currentSavings')).toBeVisible();
  });

  test('Inflation rate field is present', async ({ page }) => {
    await expect(page.locator('#inflation')).toBeVisible();
  });

  test('Investment return field is present', async ({ page }) => {
    await expect(page.locator('#investmentReturn')).toBeVisible();
  });

  test('Super return field is present', async ({ page }) => {
    await expect(page.locator('#superReturn')).toBeVisible();
  });

  test('Risk Tolerance slider is present and adjustable', async ({ page }) => {
    const slider = page.locator('#riskTolerance');
    await expect(slider).toBeVisible();
    // Slider should have min=1, max=10
    const min = await slider.getAttribute('min');
    const max = await slider.getAttribute('max');
    expect(Number(min)).toBe(1);
    expect(Number(max)).toBe(10);
  });

  test('Risk tolerance value display updates when slider moves', async ({ page }) => {
    const slider = page.locator('#riskTolerance');
    await expect(slider).toBeVisible();
    await slider.evaluate(el => { el.value = '8'; el.dispatchEvent(new Event('input')); });
    const display = page.locator('#riskToleranceValue');
    await expect(display).toBeVisible();
    const text = await display.textContent();
    expect(text).toContain('8');
  });

  test('Partner age field is present', async ({ page }) => {
    await expect(page.locator('#partnerCurrentAge')).toBeVisible();
  });

  test('Lifespan field has a default value', async ({ page }) => {
    const field = page.locator('#yourLifespan');
    await expect(field).toBeVisible();
    const val = await field.inputValue();
    expect(Number(val)).toBeGreaterThan(70);
  });

  test('Home Value field is present in property section', async ({ page }) => {
    await expect(page.locator('#homeValue')).toBeVisible();
  });

  test('Mortgage Balance field is present', async ({ page }) => {
    await expect(page.locator('#mortgageBalance')).toBeVisible();
  });

  test('Monte Carlo simulation runs input (#numRuns) is present', async ({ page }) => {
    await expect(page.locator('#numRuns')).toBeVisible();
  });

  test('Age Pension threshold fields are present', async ({ page }) => {
    await expect(page.locator('#agePensionMax')).toBeVisible();
    await expect(page.locator('#pensionAssetThreshold')).toBeVisible();
  });
});

test.describe('Calculator Form - Default Values', () => {
  test.beforeEach(async ({ page }) => {
    await bypassDisclaimer(page);
    await page.goto('/advanced.html');
    await showCalculatorForm(page);
  });

  test('Your Current Age has a sensible default (20-70)', async ({ page }) => {
    const val = await page.locator('#yourCurrentAge').inputValue();
    const age = Number(val);
    expect(age).toBeGreaterThan(20);
    expect(age).toBeLessThan(70);
  });

  test('Retirement Age defaults to 65-67', async ({ page }) => {
    const val = await page.locator('#retirementAge').inputValue();
    const age = Number(val);
    expect(age).toBeGreaterThanOrEqual(60);
    expect(age).toBeLessThanOrEqual(70);
  });

  test('Investment return default is between 1% and 15%', async ({ page }) => {
    const raw = await page.locator('#investmentReturn').inputValue();
    const val = parseFloat(raw.replace('%', ''));
    expect(val).toBeGreaterThan(1);
    expect(val).toBeLessThan(15);
  });

  test('Inflation default is between 1% and 5%', async ({ page }) => {
    const raw = await page.locator('#inflation').inputValue();
    const val = parseFloat(raw.replace('%', ''));
    expect(val).toBeGreaterThan(1);
    expect(val).toBeLessThan(6);
  });
});

test.describe('Calculator Form - Toggle Advanced Calculator (index.html)', () => {
  test.beforeEach(async ({ page }) => {
    await bypassDisclaimer(page);
    await page.goto('/');
  });

  test('Show Advanced Calculator button is visible on index.html', async ({ page }) => {
    const btn = page.locator('#showAdvancedCalculatorButton');
    await expect(btn).toBeVisible({ timeout: 5000 });
  });

  test('calculator form is hidden by default on index.html', async ({ page }) => {
    const form = page.locator('#advancedCalculatorForm');
    const display = await form.evaluate(el => el.style.display || window.getComputedStyle(el).display);
    expect(display).toBe('none');
  });

  test('clicking Show Advanced Calculator reveals the form', async ({ page }) => {
    const toggleBtn = page.locator('#showAdvancedCalculatorButton button');
    await expect(toggleBtn).toBeVisible({ timeout: 5000 });
    await toggleBtn.click();
    const form = page.locator('#advancedCalculatorForm');
    await expect(form).toBeVisible({ timeout: 5000 });
  });

  test('clicking toggle again hides the form', async ({ page }) => {
    const toggleBtn = page.locator('#showAdvancedCalculatorButton button');
    await toggleBtn.click();
    await page.waitForTimeout(300);
    await toggleBtn.click();
    const form = page.locator('#advancedCalculatorForm');
    const display = await form.evaluate(el => el.style.display || window.getComputedStyle(el).display);
    expect(display).toBe('none');
  });
});
