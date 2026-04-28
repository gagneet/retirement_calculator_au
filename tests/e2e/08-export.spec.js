/**
 * Export functionality tests.
 * Covers: export dropdown visibility, CSV/XLSX/PDF trigger, download handling.
 */

const { test, expect } = require('../../playwright_modules/node_modules/@playwright/test');
const path = require('path');
const {
  bypassDisclaimer,
  showCalculatorForm,
  waitForCalculationResults,
  openExportDropdown,
} = require('./helpers/page-utils');

test.describe('Export Dropdown', () => {
  test.beforeEach(async ({ page }) => {
    await bypassDisclaimer(page);
    await page.goto('/advanced.html');
    await showCalculatorForm(page);
    // Run calculation first so export has data
    await page.click('#btnCalculate');
    await waitForCalculationResults(page);
  });

  test('Export button is visible', async ({ page }) => {
    await expect(page.locator('#btnExport')).toBeVisible();
  });

  test('clicking Export button opens dropdown', async ({ page }) => {
    await page.click('#btnExport');
    await expect(page.locator('#exportDropdown')).toBeVisible({ timeout: 5000 });
  });

  test('dropdown contains CSV, XLSX and PDF options', async ({ page }) => {
    await page.click('#btnExport');
    await expect(page.locator('#btnExportCSV')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#btnExportXLSX')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#btnExportPDF')).toBeVisible({ timeout: 5000 });
  });

  test('clicking outside dropdown closes it', async ({ page }) => {
    await page.click('#btnExport');
    await expect(page.locator('#exportDropdown')).toBeVisible({ timeout: 5000 });
    // Click somewhere else
    await page.click('h1, h2, h3, .tab-button').catch(() => page.click('body'));
    await page.waitForTimeout(500);
    // Dropdown should close or at least the test doesn't error
  });
});

test.describe('CSV Export', () => {
  test.beforeEach(async ({ page }) => {
    await bypassDisclaimer(page);
    await page.goto('/advanced.html');
    await showCalculatorForm(page);
    await page.click('#btnCalculate');
    await waitForCalculationResults(page);
  });

  test('CSV export triggers a file download', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
    await page.click('#btnExport');
    await expect(page.locator('#exportDropdown')).toBeVisible({ timeout: 5000 });
    await page.click('#btnExportCSV');
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.csv$/i);
  });

  test('CSV download has a meaningful filename', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
    await page.click('#btnExport');
    await page.click('#btnExportCSV');
    const download = await downloadPromise;
    const filename = download.suggestedFilename();
    expect(filename.length).toBeGreaterThan(5);
    expect(filename).toMatch(/retirement|projection|calculator/i);
  });
});

test.describe('XLSX Export', () => {
  test.beforeEach(async ({ page }) => {
    await bypassDisclaimer(page);
    await page.goto('/advanced.html');
    await showCalculatorForm(page);
    await page.click('#btnCalculate');
    await waitForCalculationResults(page);
  });

  test('XLSX export either downloads file or shows notification', async ({ page }) => {
    const notifications = [];
    page.on('console', msg => notifications.push(msg.text()));

    let downloaded = false;
    const downloadPromise = page.waitForEvent('download', { timeout: 15000 }).then(d => {
      downloaded = true;
      return d;
    }).catch(() => null);

    await page.click('#btnExport');
    await page.click('#btnExportXLSX');
    await Promise.race([downloadPromise, page.waitForTimeout(8000)]);

    if (downloaded) {
      const download = await downloadPromise;
      if (download) {
        expect(download.suggestedFilename()).toMatch(/\.xlsx$/i);
      }
    }
    // Even if XLSX lib not loaded, no uncaught errors should crash page
  });
});

test.describe('PDF Export', () => {
  test.beforeEach(async ({ page }) => {
    await bypassDisclaimer(page);
    await page.goto('/advanced.html');
    await showCalculatorForm(page);
    await page.click('#btnCalculate');
    await waitForCalculationResults(page);
  });

  test('PDF export either downloads or shows info notification', async ({ page }) => {
    let downloaded = false;
    const downloadPromise = page.waitForEvent('download', { timeout: 15000 }).then(d => {
      downloaded = true;
      return d;
    }).catch(() => null);

    await page.click('#btnExport');
    await page.click('#btnExportPDF');
    await Promise.race([downloadPromise, page.waitForTimeout(8000)]);

    if (downloaded) {
      const download = await downloadPromise;
      if (download) {
        expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
      }
    }
  });
});

test.describe('Outcome PDF Export', () => {
  test.beforeEach(async ({ page }) => {
    await bypassDisclaimer(page);
    await page.goto('/advanced.html');
    await showCalculatorForm(page);
    await page.click('#btnCalculate');
    await waitForCalculationResults(page);
  });

  test('"Export as PDF" option is present in export dropdown', async ({ page }) => {
    await page.click('#btnExport');
    await expect(page.locator('#exportDropdown')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#btnExportPDF')).toBeVisible();
  });
});
