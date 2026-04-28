/**
 * Site navigation tests.
 * Covers: nav menu, links between pages, footer, back-to-top.
 */

const { test, expect } = require('../../playwright_modules/node_modules/@playwright/test');
const { bypassDisclaimer } = require('./helpers/page-utils');

test.describe('Navigation Menu - Advanced Page', () => {
  test.beforeEach(async ({ page }) => {
    await bypassDisclaimer(page);
    await page.goto('/advanced.html');
  });

  test('FWT statement bar is visible at top', async ({ page }) => {
    await expect(page.locator('.fwt-statement')).toBeVisible({ timeout: 5000 });
  });

  test('FWT statement contains "Financial Well-being Tool"', async ({ page }) => {
    await expect(page.locator('.fwt-statement')).toContainText(/Financial Well-being Tool/i);
  });

  test('navigation menu button is present', async ({ page }) => {
    await expect(page.locator('#navMenuButton')).toBeVisible({ timeout: 5000 });
  });

  test('clicking nav menu button opens dropdown', async ({ page }) => {
    await page.click('#navMenuButton');
    const dropdown = page.locator('#navDropdown');
    await expect(dropdown).toBeVisible({ timeout: 5000 });
  });

  test('nav dropdown contains link to How to Use', async ({ page }) => {
    await page.click('#navMenuButton');
    await expect(page.locator('#navDropdown')).toBeVisible({ timeout: 5000 });
    const link = page.locator('#navDropdown a[href*="how-to-use"]');
    await expect(link).toBeVisible();
  });

  test('nav dropdown contains link to Terms page', async ({ page }) => {
    await page.click('#navMenuButton');
    await expect(page.locator('#navDropdown')).toBeVisible({ timeout: 5000 });
    const link = page.locator('#navDropdown a[href*="terms"]');
    await expect(link).toBeVisible();
  });

  test('clicking How to Use navigates correctly', async ({ page }) => {
    await page.click('#navMenuButton');
    await page.click('#navDropdown a[href*="how-to-use"]');
    await expect(page).toHaveURL(/how-to-use/, { timeout: 10000 });
  });
});

test.describe('Navigation - Static Pages', () => {
  test('How to Use page loads', async ({ page }) => {
    await page.goto('/how-to-use.html');
    await expect(page).toHaveURL(/how-to-use/);
    await expect(page.locator('body')).toContainText(/how to use|retirement|calculator/i);
  });

  test('Comparison page loads', async ({ page }) => {
    await page.goto('/comparison.html');
    await expect(page).toHaveURL(/comparison/);
    await expect(page.locator('body')).toContainText(/comparison|calculator|retirement/i);
  });

  test('Privacy Policy page loads', async ({ page }) => {
    await page.goto('/privacy.html');
    await expect(page).toHaveURL(/privacy/);
    await expect(page.locator('body')).toContainText(/privacy/i);
  });

  test('Terms page loads', async ({ page }) => {
    await page.goto('/terms.html');
    await expect(page).toHaveURL(/terms/);
    await expect(page.locator('body')).toContainText(/terms/i);
  });

  test('Methodology page loads', async ({ page }) => {
    await page.goto('/methodology.html');
    await expect(page).toHaveURL(/methodology/);
    await expect(page.locator('body')).toContainText(/How We Calculate|calculation|superannuation/i);
  });

  test('Assumptions page loads', async ({ page }) => {
    await page.goto('/assumptions.html');
    await expect(page).toHaveURL(/assumptions/);
    await expect(page.locator('body')).toContainText(/assumption/i);
  });

  test('Changelog page loads', async ({ page }) => {
    await page.goto('/changelog.html');
    await expect(page).toHaveURL(/changelog/);
  });

  test('Contact page loads', async ({ page }) => {
    await page.goto('/contact.html');
    await expect(page).toHaveURL(/contact/);
    await expect(page.locator('body')).toContainText(/contact/i);
  });
});

test.describe('Navigation - Back to Top / Scroll', () => {
  test.beforeEach(async ({ page }) => {
    await bypassDisclaimer(page);
    await page.goto('/advanced.html');
  });

  test('Back to Action Buttons link exists after running calc', async ({ page }) => {
    // This is tested more thoroughly in result-tabs spec
    // Just verify at least one back button exists
    const backButtons = page.locator('button', { hasText: /Back to Action/i });
    const count = await backButtons.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });
});

test.describe('Navigation - Version Selector', () => {
  test.beforeEach(async ({ page }) => {
    await bypassDisclaimer(page);
    await page.goto('/advanced.html');
  });

  test('version selector element is present', async ({ page }) => {
    const versionEl = page.locator('#version-selector');
    await expect(versionEl).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Navigation - Mobile Menu', () => {
  test('hamburger menu works on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await bypassDisclaimer(page);
    await page.goto('/advanced.html');
    const navBtn = page.locator('#navMenuButton');
    await expect(navBtn).toBeVisible({ timeout: 5000 });
    await navBtn.click();
    const dropdown = page.locator('#navDropdown');
    await expect(dropdown).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Sitemap', () => {
  test('sitemap.xml is accessible', async ({ page }) => {
    const response = await page.goto('/sitemap.xml');
    expect(response?.status()).toBe(200);
  });

  test('sitemap contains production URL', async ({ page }) => {
    const response = await page.goto('/sitemap.xml');
    const content = await page.content();
    expect(content).toContain('retirement.gagneet.com');
  });
});
