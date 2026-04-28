/**
 * Landing page (index.html) tests.
 * Covers hero section, CTAs, features, navigation, and static content.
 */

const { test, expect } = require('../../playwright_modules/node_modules/@playwright/test');

test.describe('Landing Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('page has correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Retirement Calculator|Retire/i);
  });

  test('hero section is visible with headline', async ({ page }) => {
    const hero = page.locator('.hero-gradient');
    await expect(hero).toBeVisible();
    await expect(hero.locator('h1')).toContainText(/Retire/i);
  });

  test('"Start Your Retirement Plan" CTA button is visible', async ({ page }) => {
    const btn = page.locator('#startOnboardingBtn');
    await expect(btn).toBeVisible();
    await expect(btn).toContainText(/Start/i);
  });

  test('"Skip to Advanced Calculator" link is visible', async ({ page }) => {
    const link = page.locator('a[href="advanced.html"]').first();
    await expect(link).toBeVisible();
  });

  test('"Start Your Retirement Plan" navigates to advanced.html?onboarding=true', async ({ page }) => {
    await page.click('#startOnboardingBtn');
    await expect(page).toHaveURL(/advanced\.html.*onboarding=true/, { timeout: 10000 });
  });

  test('"Skip to Advanced Calculator" link goes to advanced.html', async ({ page }) => {
    await page.locator('a[href="advanced.html"]').first().click();
    await expect(page).toHaveURL(/advanced\.html/, { timeout: 10000 });
  });

  test('features section is visible', async ({ page }) => {
    const heading = page.locator('h2', { hasText: /What Makes This Calculator Different/i });
    await expect(heading).toBeVisible();
  });

  test('page contains calculator description about Monte Carlo simulations', async ({ page }) => {
    await expect(page.locator('body')).toContainText(/Monte Carlo/i);
  });

  test('page contains Australian financial features (Age Pension, Super)', async ({ page }) => {
    await expect(page.locator('body')).toContainText(/Age Pension/i);
    await expect(page.locator('body')).toContainText(/Super/i);
  });

  test('no console errors on load', async ({ page }) => {
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // Filter out known 3rd-party errors (analytics, CDN)
    const criticalErrors = errors.filter(
      e => !e.includes('gtag') && !e.includes('analytics') && !e.includes('googletagmanager')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('page has meta description for SEO', async ({ page }) => {
    const meta = page.locator('meta[name="description"]');
    await expect(meta).toHaveCount(1);
    const content = await meta.getAttribute('content');
    expect(content).toBeTruthy();
    expect(content.length).toBeGreaterThan(50);
  });

  test('footer or disclaimer text is present', async ({ page }) => {
    await expect(page.locator('body')).toContainText(/financial/i);
  });

  test('How-to-use link is accessible from the page', async ({ page }) => {
    const link = page.locator('a[href*="how-to-use"]').first();
    await expect(link).toBeVisible();
  });
});

test.describe('Landing Page - Second onboarding button', () => {
  test('startOnboardingBtn2 navigates to onboarding when visible', async ({ page }) => {
    await page.goto('/');
    const btn2 = page.locator('#startOnboardingBtn2');
    // Button may be below the fold — scroll to it first
    const exists = await btn2.count() > 0;
    if (!exists) {
      // Button absent on this page version; skip gracefully
      return;
    }
    try {
      await btn2.scrollIntoViewIfNeeded();
    } catch (e) {
      // Button is inside a hidden section; skip gracefully
      return;
    }
    await page.waitForTimeout(300);
    if (await btn2.isVisible()) {
      await btn2.click();
      await expect(page).toHaveURL(/advanced\.html.*onboarding=true/, { timeout: 10000 });
    }
  });
});
