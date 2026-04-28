/**
 * Disclaimer modal tests for advanced.html.
 * Covers: modal appears on first visit, content is correct, acceptance persists.
 */

const { test, expect } = require('../../playwright_modules/node_modules/@playwright/test');

test.describe('Disclaimer Modal', () => {
  test('modal appears on first visit (no localStorage)', async ({ page }) => {
    // Clear storage to simulate first visit
    await page.addInitScript(() => {
      localStorage.removeItem('disclaimerAccepted');
    });
    await page.goto('/advanced.html');
    const modal = page.locator('#disclaimer-modal');
    await expect(modal).toBeVisible({ timeout: 10000 });
  });

  test('modal contains required legal content', async ({ page }) => {
    await page.addInitScript(() => localStorage.removeItem('disclaimerAccepted'));
    await page.goto('/advanced.html');
    const modal = page.locator('#disclaimer-modal');
    await expect(modal).toBeVisible({ timeout: 10000 });
    await expect(modal).toContainText(/Financial Well-being Tool/i);
    await expect(modal).toContainText(/general in nature/i);
    await expect(modal).toContainText(/licensed financial advisor/i);
  });

  test('accept button is visible and has correct label', async ({ page }) => {
    await page.addInitScript(() => localStorage.removeItem('disclaimerAccepted'));
    await page.goto('/advanced.html');
    const acceptBtn = page.locator('#accept-disclaimer');
    await expect(acceptBtn).toBeVisible({ timeout: 10000 });
    await expect(acceptBtn).toContainText(/Acknowledge|Accept/i);
  });

  test('clicking accept hides the modal', async ({ page }) => {
    await page.addInitScript(() => localStorage.removeItem('disclaimerAccepted'));
    await page.goto('/advanced.html');
    await page.click('#accept-disclaimer');
    const modal = page.locator('#disclaimer-modal');
    await expect(modal).toBeHidden({ timeout: 5000 });
  });

  test('accepting disclaimer sets localStorage flag', async ({ page }) => {
    await page.addInitScript(() => localStorage.removeItem('disclaimerAccepted'));
    await page.goto('/advanced.html');
    await page.click('#accept-disclaimer');
    const flag = await page.evaluate(() => localStorage.getItem('disclaimerAccepted'));
    expect(flag).toBe('true');
  });

  test('modal does not appear when disclaimerAccepted is already set', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('disclaimerAccepted', 'true'));
    await page.goto('/advanced.html');
    const modal = page.locator('#disclaimer-modal');
    // Modal should not be visible
    await expect(modal).toBeHidden({ timeout: 5000 });
  });

  test('modal contains MoneySmart external link', async ({ page }) => {
    await page.addInitScript(() => localStorage.removeItem('disclaimerAccepted'));
    await page.goto('/advanced.html');
    const modal = page.locator('#disclaimer-modal');
    await expect(modal).toBeVisible({ timeout: 10000 });
    const link = modal.locator('a[href*="moneysmart"]');
    await expect(link).toBeVisible();
  });

  test('after accepting, onboarding container is visible', async ({ page }) => {
    await page.addInitScript(() => localStorage.removeItem('disclaimerAccepted'));
    await page.goto('/advanced.html');
    await page.click('#accept-disclaimer');
    const onboardingContainer = page.locator('#onboarding-container');
    await expect(onboardingContainer).toBeVisible({ timeout: 5000 });
  });
});
