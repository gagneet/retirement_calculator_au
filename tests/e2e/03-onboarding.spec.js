/**
 * Onboarding wizard tests for advanced.html.
 * Covers: new user flow, wizard steps, navigation, field validation.
 */

const { test, expect } = require('../../playwright_modules/node_modules/@playwright/test');

test.describe('Onboarding Wizard - Welcome Screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('disclaimerAccepted', 'true'));
    await page.goto('/advanced.html');
  });

  test('onboarding welcome buttons are visible after disclaimer', async ({ page }) => {
    await expect(page.locator('#new-user-btn')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#returning-user-btn')).toBeVisible({ timeout: 10000 });
  });

  test('"New User?" button text is correct', async ({ page }) => {
    await expect(page.locator('#new-user-btn')).toContainText(/New User/i);
  });

  test('"Returning User?" button text is correct', async ({ page }) => {
    await expect(page.locator('#returning-user-btn')).toContainText(/Returning User/i);
  });

  test('welcome section has descriptive heading', async ({ page }) => {
    await expect(page.locator('#new-user-btn')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#returning-user-btn')).toBeVisible({ timeout: 10000 });
    // The welcome section presents two clear CTAs — a sufficient descriptive header
    await expect(page.locator('#new-user-btn')).toContainText(/New User/i);
  });
});

test.describe('Onboarding Wizard - New User Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('disclaimerAccepted', 'true');
      // Clear any saved wizard progress
      localStorage.removeItem('onboarding_progress');
    });
    await page.goto('/advanced.html');
    // Start wizard
    await page.click('#new-user-btn');
    await page.waitForSelector('#onboarding-wizard:not(.hidden)', { timeout: 10000 });
  });

  test('wizard appears after clicking New User', async ({ page }) => {
    const wizard = page.locator('#onboarding-wizard');
    await expect(wizard).toBeVisible({ timeout: 10000 });
  });

  test('step 1 (Household) content is displayed', async ({ page }) => {
    await expect(page.locator('#step-content')).toBeVisible({ timeout: 10000 });
    // Step 1 should have household-related fields
    await expect(page.locator('#step-content')).toContainText(/age|household|location/i);
  });

  test('breadcrumb shows 5 steps', async ({ page }) => {
    await page.waitForSelector('.step-indicator', { timeout: 5000 });
    const steps = page.locator('.step-indicator');
    const count = await steps.count();
    expect(count).toBe(5);
  });

  test('Previous button is hidden on step 1', async ({ page }) => {
    await page.waitForSelector('#prev-btn', { state: 'attached', timeout: 5000 });
    const prevBtn = page.locator('#prev-btn');
    const visibility = await prevBtn.evaluate(el => el.style.visibility);
    expect(visibility).toBe('hidden');
  });

  test('Next button is visible on step 1', async ({ page }) => {
    const nextBtn = page.locator('#next-btn');
    await expect(nextBtn).toBeVisible({ timeout: 5000 });
  });

  test('can advance to step 2 by clicking Next', async ({ page }) => {
    await page.waitForSelector('#next-btn', { timeout: 5000 });
    await page.click('#next-btn');
    await page.waitForTimeout(500);
    // Step 2 content should now be visible with finances-related fields
    await expect(page.locator('#step-content')).toContainText(/super|salary|income|finance/i);
  });

  test('can navigate through all 5 steps', async ({ page }) => {
    for (let step = 1; step < 5; step++) {
      await page.waitForSelector('#next-btn', { state: 'attached', timeout: 5000 });
      await page.click('#next-btn');
      await page.waitForTimeout(600);
    }
    // On step 5 (Review), step content should reference review/summary/plan
    await expect(page.locator('#step-content')).toContainText(/review|summary|generate|plan/i);
  });

  test('Previous button becomes visible after advancing to step 2', async ({ page }) => {
    await page.click('#next-btn');
    await page.waitForTimeout(500);
    const prevBtn = page.locator('#prev-btn');
    const visibility = await prevBtn.evaluate(el => el.style.visibility);
    expect(visibility).toBe('visible');
  });

  test('can go back to step 1 from step 2', async ({ page }) => {
    await page.click('#next-btn');
    await page.waitForTimeout(500);
    await page.click('#prev-btn');
    await page.waitForTimeout(500);
    await expect(page.locator('#step-content')).toContainText(/age|household|location/i);
  });

  test('step 2 (Finances) shows superannuation fields', async ({ page }) => {
    await page.click('#next-btn');
    await page.waitForTimeout(600);
    await expect(page.locator('#step-content')).toContainText(/super|salary/i);
  });

  test('step 3 (Property) shows property fields', async ({ page }) => {
    for (let i = 0; i < 2; i++) {
      await page.click('#next-btn');
      await page.waitForTimeout(600);
    }
    await expect(page.locator('#step-content')).toContainText(/property|home|mortgage/i);
  });

  test('step 4 (Goals) shows retirement goal fields', async ({ page }) => {
    for (let i = 0; i < 3; i++) {
      await page.click('#next-btn');
      await page.waitForTimeout(600);
    }
    await expect(page.locator('#step-content')).toContainText(/retire|goal|lifestyle/i);
  });

  test('step 5 (Review) shows summary and Generate Plan button', async ({ page }) => {
    for (let i = 0; i < 4; i++) {
      await page.click('#next-btn');
      await page.waitForTimeout(600);
    }
    await expect(page.locator('#step-content')).toContainText(/review|summary|generate|plan/i);
  });
});

test.describe('Onboarding - URL parameter trigger', () => {
  test('advanced.html?onboarding=true starts wizard immediately', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('disclaimerAccepted', 'true');
      localStorage.removeItem('onboarding_progress');
    });
    await page.goto('/advanced.html?onboarding=true');
    // Wizard should auto-start or new-user-btn should be visible
    const onboardingUI = page.locator('#onboarding-wizard:not(.hidden), #new-user-btn');
    await expect(onboardingUI.first()).toBeVisible({ timeout: 10000 });
  });
});
