/**
 * Result tabs navigation tests.
 * Covers all 12 result tabs: outcome, summary, suggestions, recommendations,
 * projection, property, riskAnalysis, charts, optimization, overseas, scenarios, lifeSimulator.
 */

const { test, expect } = require('../../playwright_modules/node_modules/@playwright/test');
const {
  bypassDisclaimer,
  showCalculatorForm,
  waitForCalculationResults,
  goToOutcomeTab,
} = require('./helpers/page-utils');

const ALL_TABS = [
  { button: '🎯 Your Outcome', id: 'outcome-tab' },
  { button: 'Enhanced Summary', id: 'summary-tab' },
  { button: '💡 Suggestions', id: 'suggestions-tab' },
  { button: 'AI Recommendations', id: 'recommendations-tab' },
  { button: 'Year-by-Year', id: 'projection-tab' },
  { button: 'Property Analysis', id: 'property-tab' },
  { button: 'Risk Analysis', id: 'riskAnalysis-tab' },
  { button: 'Advanced Charts', id: 'charts-tab' },
  { button: 'Optimization', id: 'optimization-tab' },
  { button: '🌍 Overseas', id: 'overseas-tab' },
  { button: 'Scenario Compare', id: 'scenarios-tab' },
  { button: '🔮 Life Simulator', id: 'lifeSimulator-tab' },
];

test.describe('Result Tabs - Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await bypassDisclaimer(page);
    await page.goto('/advanced.html');
    await showCalculatorForm(page);
    // Run a calculation first so all tabs have data
    await page.click('#btnCalculate');
    await waitForCalculationResults(page);
  });

  for (const { button, id } of ALL_TABS) {
    test(`clicking "${button}" tab shows ${id}`, async ({ page }) => {
      await page.click(`button.tab-button:has-text("${button.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}")`);
      await page.waitForTimeout(400);
      const tabContent = page.locator(`#${id}`);
      await expect(tabContent).toBeVisible({ timeout: 5000 });
    });
  }

  test('only one tab is active at a time', async ({ page }) => {
    await page.click('button.tab-button:has-text("Enhanced Summary")');
    await page.waitForTimeout(300);
    const activeTabs = await page.locator('.tab-content.active').count();
    expect(activeTabs).toBe(1);
  });

  test('tab navigation renders 12 tab buttons', async ({ page }) => {
    const tabs = page.locator('button.tab-button');
    const count = await tabs.count();
    expect(count).toBe(12);
  });
});

test.describe('Result Tabs - Content Verification', () => {
  test.beforeEach(async ({ page }) => {
    await bypassDisclaimer(page);
    await page.goto('/advanced.html');
    await showCalculatorForm(page);
    await page.click('#btnCalculate');
    await waitForCalculationResults(page);
  });

  test('Outcome tab shows retirement goal information', async ({ page }) => {
    await goToOutcomeTab(page);
    await expect(page.locator('#outcome-retirement-age')).toBeVisible();
    await expect(page.locator('#outcome-target-income')).toBeVisible();
  });

  test('Enhanced Summary tab shows summary data grid', async ({ page }) => {
    await page.click('button.tab-button:has-text("Enhanced Summary")');
    await page.waitForTimeout(300);
    await expect(page.locator('#summaryResults')).toBeVisible();
  });

  test('AI Recommendations tab is visible', async ({ page }) => {
    await page.click('button.tab-button:has-text("AI Recommendations")');
    await page.waitForTimeout(300);
    await expect(page.locator('#recommendations-tab')).toBeVisible();
  });

  test('Year-by-Year tab shows projection table or content', async ({ page }) => {
    await page.click('button.tab-button:has-text("Year-by-Year")');
    await page.waitForTimeout(300);
    await expect(page.locator('#projection-tab')).toBeVisible();
  });

  test('Property Analysis tab is visible', async ({ page }) => {
    await page.click('button.tab-button:has-text("Property Analysis")');
    await page.waitForTimeout(300);
    await expect(page.locator('#property-tab')).toBeVisible();
  });

  test('Risk Analysis tab is visible', async ({ page }) => {
    await page.click('button.tab-button:has-text("Risk Analysis")');
    await page.waitForTimeout(300);
    await expect(page.locator('#riskAnalysis-tab')).toBeVisible();
  });

  test('Advanced Charts tab is visible', async ({ page }) => {
    await page.click('button.tab-button:has-text("Advanced Charts")');
    await page.waitForTimeout(300);
    await expect(page.locator('#charts-tab')).toBeVisible();
  });

  test('Overseas tab has country selection or content', async ({ page }) => {
    await page.click('button.tab-button:has-text("Overseas")');
    await page.waitForTimeout(300);
    await expect(page.locator('#overseas-tab')).toBeVisible();
    // Overseas tab should have some content
    const content = page.locator('#overseas-tab');
    const text = await content.textContent();
    expect(text.length).toBeGreaterThan(10);
  });

  test('Scenario Compare tab is visible', async ({ page }) => {
    await page.click('button.tab-button:has-text("Scenario Compare")');
    await page.waitForTimeout(300);
    await expect(page.locator('#scenarios-tab')).toBeVisible();
  });

  test('Life Simulator tab is visible with run button', async ({ page }) => {
    await page.click('button.tab-button:has-text("Life Simulator")');
    await page.waitForTimeout(300);
    await expect(page.locator('#lifeSimulator-tab')).toBeVisible();
    await expect(page.locator('#btnRunLifeSimulator')).toBeVisible();
  });

  test('"Back to Action Buttons" links exist in result tabs', async ({ page }) => {
    // Check summary tab has back button
    await page.click('button.tab-button:has-text("Enhanced Summary")');
    await page.waitForTimeout(300);
    const backBtn = page.locator('#summary-tab').locator('button', { hasText: /Back to Action/i });
    await expect(backBtn).toBeVisible();
  });
});

test.describe('Result Tabs - Outcome Tab Details', () => {
  test.beforeEach(async ({ page }) => {
    await bypassDisclaimer(page);
    await page.goto('/advanced.html');
    await showCalculatorForm(page);
    await page.click('#btnCalculate');
    await waitForCalculationResults(page);
    // App switches to summary tab after calc; navigate back to outcome tab
    await goToOutcomeTab(page);
  });

  test('Outcome overview bar is visible after navigating to outcome tab', async ({ page }) => {
    const overviewStats = page.locator('#outcome-overview-stats');
    await expect(overviewStats).toBeVisible();
  });

  test('outcome what-if sliders are present', async ({ page }) => {
    await expect(page.locator('#whatif-super-slider')).toBeVisible();
    await expect(page.locator('#whatif-retirement-slider')).toBeVisible();
  });

  test('what-if super contribution slider updates displayed value', async ({ page }) => {
    const slider = page.locator('#whatif-super-slider');
    await slider.evaluate(el => {
      el.value = '500';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(400);
    const display = page.locator('#whatif-super-value');
    await expect(display).toContainText('500');
  });

  test('what-if retirement delay slider shows impact', async ({ page }) => {
    const slider = page.locator('#whatif-retirement-slider');
    await slider.evaluate(el => {
      el.value = '5';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(400);
    const display = page.locator('#whatif-retirement-value');
    const text = await display.textContent();
    expect(text).toContain('5');
  });
});
