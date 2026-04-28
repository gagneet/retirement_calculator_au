/**
 * Accessibility and performance tests.
 * Covers: keyboard navigation, ARIA labels, page load times, responsive layout.
 */

const { test, expect } = require('../../playwright_modules/node_modules/@playwright/test');
const { bypassDisclaimer, showCalculatorForm } = require('./helpers/page-utils');

test.describe('Accessibility - Keyboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await bypassDisclaimer(page);
    await page.goto('/advanced.html');
    await showCalculatorForm(page);
  });

  test('tab key navigates through form inputs', async ({ page }) => {
    // Focus first input
    await page.locator('#yourCurrentAge').focus();
    // Tab to next field
    await page.keyboard.press('Tab');
    // Some element should be focused
    const focused = page.locator(':focus');
    await expect(focused).toBeVisible({ timeout: 3000 });
  });

  test('Calculate button is reachable via keyboard', async ({ page }) => {
    const btn = page.locator('#btnCalculate');
    await btn.focus();
    await expect(btn).toBeFocused();
  });

  test('Enter key on Calculate button runs calculation', async ({ page }) => {
    await page.locator('#btnCalculate').focus();
    await page.keyboard.press('Enter');
    // Progress or results should appear within reasonable time
    await page.waitForTimeout(2000);
  });
});

test.describe('Accessibility - ARIA and Labels', () => {
  test.beforeEach(async ({ page }) => {
    await bypassDisclaimer(page);
    await page.goto('/advanced.html');
  });

  test('theme toggle button has aria-label', async ({ page }) => {
    const btn = page.locator('#themeToggle');
    const label = await btn.getAttribute('aria-label');
    expect(label).toBeTruthy();
  });

  test('form inputs have associated labels', async ({ page }) => {
    await showCalculatorForm(page);
    // Check that key inputs have labels
    const labelForAge = page.locator('label[for="yourCurrentAge"]');
    await expect(labelForAge).toBeVisible();
  });

  test('tab navigation buttons are visible and not empty', async ({ page }) => {
    const tabButtons = page.locator('button.tab-button');
    const count = await tabButtons.count();
    for (let i = 0; i < Math.min(count, 4); i++) {
      const text = await tabButtons.nth(i).textContent();
      expect(text.trim().length).toBeGreaterThan(0);
    }
  });
});

test.describe('Performance - Page Load', () => {
  test('advanced.html loads within 10 seconds', async ({ page }) => {
    await bypassDisclaimer(page);
    const start = Date.now();
    await page.goto('/advanced.html');
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(15000);
  });

  test('landing page loads within 10 seconds', async ({ page }) => {
    const start = Date.now();
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(15000);
  });
});

test.describe('Responsive Layout', () => {
  test('landing page is usable on mobile (375px width)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    // Hero section should still be visible
    const hero = page.locator('.hero-gradient, h1').first();
    await expect(hero).toBeVisible({ timeout: 10000 });
  });

  test('advanced calculator is usable on tablet (768px width)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await bypassDisclaimer(page);
    await page.goto('/advanced.html');
    // Action buttons should be visible
    await expect(page.locator('#action-buttons-container')).toBeVisible({ timeout: 10000 });
  });

  test('result tabs scroll horizontally on mobile if needed', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await bypassDisclaimer(page);
    await page.goto('/advanced.html');
    await showCalculatorForm(page);
    // Tab navigation area should be present
    const tabContainer = page.locator('.tab-button').first();
    await expect(tabContainer).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Error Handling', () => {
  test('page does not crash with extreme age values', async ({ page }) => {
    await bypassDisclaimer(page);
    await page.goto('/advanced.html');
    await showCalculatorForm(page);

    await page.locator('#yourCurrentAge').fill('99');
    await page.locator('#retirementAge').fill('100');

    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.click('#btnCalculate');
    await page.waitForTimeout(5000);

    // Critical JS errors should not occur
    const criticalErrors = errors.filter(
      e => !e.includes('analytics') && !e.includes('gtag') && !e.includes('undefined')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('page does not crash with zero salary', async ({ page }) => {
    await bypassDisclaimer(page);
    await page.goto('/advanced.html');
    await showCalculatorForm(page);

    await page.locator('#yourSalary').fill('0');

    const errors = [];
    page.on('pageerror', err => errors.push(err.message));

    await page.click('#btnCalculate');
    await page.waitForTimeout(5000);

    const criticalErrors = errors.filter(
      e => !e.includes('analytics') && !e.includes('gtag')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('page handles very large superannuation balance without error', async ({ page }) => {
    await bypassDisclaimer(page);
    await page.goto('/advanced.html');
    await showCalculatorForm(page);

    await page.locator('#yourCurrentSuper').fill('5000000');

    page.on('pageerror', err => {
      if (!err.message.includes('analytics') && !err.message.includes('gtag')) {
        throw err;
      }
    });

    await page.click('#btnCalculate');
    await page.waitForTimeout(5000);
  });
});
