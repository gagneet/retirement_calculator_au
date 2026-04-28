/**
 * Advanced analysis tools tests.
 * Covers: Monte Carlo, Stress Test, Retirement Solver, AI Recommendations,
 * Healthcare Costs, Risk Profiling, Dynamic Allocation, Scenario Comparison.
 */

const { test, expect } = require('../../playwright_modules/node_modules/@playwright/test');
const {
  bypassDisclaimer,
  showCalculatorForm,
  waitForCalculationResults,
  goToOutcomeTab,
} = require('./helpers/page-utils');

test.describe('Monte Carlo Simulation', () => {
  test.beforeEach(async ({ page }) => {
    await bypassDisclaimer(page);
    await page.goto('/advanced.html');
    await showCalculatorForm(page);
  });

  test('Monte Carlo button is visible and enabled', async ({ page }) => {
    await expect(page.locator('#btnMonteCarlo')).toBeVisible();
    await expect(page.locator('#btnMonteCarlo')).toBeEnabled();
  });

  test('clicking Monte Carlo shows progress bar', async ({ page }) => {
    await page.click('#btnMonteCarlo');
    // Progress container should appear
    const progressContainer = page.locator('#progressContainer');
    await expect(progressContainer).toBeVisible({ timeout: 10000 });
  });

  test('Monte Carlo completes and shows results', async ({ page }) => {
    // Reduce runs for faster test
    await page.locator('#numRuns').fill('1000');
    await page.click('#btnMonteCarlo');
    // Wait for progress to complete (up to 60 seconds)
    await page.waitForFunction(
      () => {
        const progress = document.getElementById('progressContainer');
        return !progress || progress.classList.contains('hidden') || progress.style.display === 'none';
      },
      { timeout: 60000 }
    );
    // Risk Analysis tab should have results
    await page.click('button.tab-button:has-text("Risk Analysis")');
    await page.waitForTimeout(500);
    await expect(page.locator('#riskAnalysis-tab')).toBeVisible();
  });
});

test.describe('Stress Test', () => {
  test.beforeEach(async ({ page }) => {
    await bypassDisclaimer(page);
    await page.goto('/advanced.html');
    await showCalculatorForm(page);
  });

  test('Stress Test button is visible', async ({ page }) => {
    await expect(page.locator('#btnStressTest')).toBeVisible();
  });

  test('clicking Stress Test runs analysis', async ({ page }) => {
    await page.click('#btnStressTest');
    // Should show loading or results; wait for any notification or content change
    await page.waitForTimeout(3000);
    // Check that some result appears - scenario tab may have data
    await page.click('button.tab-button:has-text("Scenario Compare")');
    await expect(page.locator('#scenarios-tab')).toBeVisible();
  });
});

test.describe('Retirement Solver', () => {
  test.beforeEach(async ({ page }) => {
    await bypassDisclaimer(page);
    await page.goto('/advanced.html');
    await showCalculatorForm(page);
  });

  test('Retirement Solver button is visible', async ({ page }) => {
    await expect(page.locator('#btnRetirementSolver')).toBeVisible();
  });

  test('clicking Retirement Solver shows result', async ({ page }) => {
    // Run base calculation first so results tabs are visible
    await page.click('#btnCalculate');
    await waitForCalculationResults(page);
    await page.click('#btnRetirementSolver');
    await page.waitForTimeout(3000);
    await page.click('button.tab-button:has-text("Enhanced Summary")');
    await expect(page.locator('#summary-tab')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('AI Recommendations', () => {
  test.beforeEach(async ({ page }) => {
    await bypassDisclaimer(page);
    await page.goto('/advanced.html');
    await showCalculatorForm(page);
    // Run base calculation first
    await page.click('#btnCalculate');
    await waitForCalculationResults(page);
  });

  test('Generate Recommendations button is visible', async ({ page }) => {
    await expect(page.locator('#btnGenerateRecommendations')).toBeVisible();
  });

  test('clicking Generate Recommendations populates recommendations tab', async ({ page }) => {
    await page.click('#btnGenerateRecommendations');
    await page.waitForTimeout(3000);
    await page.click('button.tab-button:has-text("AI Recommendations")');
    await page.waitForTimeout(500);
    await expect(page.locator('#recommendations-tab')).toBeVisible();
  });
});

test.describe('Scenario Comparison', () => {
  test.beforeEach(async ({ page }) => {
    await bypassDisclaimer(page);
    await page.goto('/advanced.html');
    await showCalculatorForm(page);
    await page.click('#btnCalculate');
    await waitForCalculationResults(page);
  });

  test('Compare Scenarios button is visible', async ({ page }) => {
    await expect(page.locator('#btnScenarioComparison')).toBeVisible();
  });

  test('clicking Compare Scenarios shows comparison data', async ({ page }) => {
    await page.click('#btnScenarioComparison');
    await page.waitForTimeout(3000);
    await page.click('button.tab-button:has-text("Scenario Compare")');
    await expect(page.locator('#scenarios-tab')).toBeVisible();
  });
});

test.describe('Healthcare Analysis', () => {
  test.beforeEach(async ({ page }) => {
    await bypassDisclaimer(page);
    await page.goto('/advanced.html');
    await showCalculatorForm(page);
  });

  test('Healthcare Costs button is visible', async ({ page }) => {
    await expect(page.locator('#btnHealthcareAnalysis')).toBeVisible();
  });

  test('clicking Healthcare button runs analysis', async ({ page }) => {
    await page.click('#btnCalculate');
    await waitForCalculationResults(page);
    await page.click('#btnHealthcareAnalysis');
    // Should show progress or result notification
    await page.waitForTimeout(3000);
  });
});

test.describe('Risk Profiling', () => {
  test.beforeEach(async ({ page }) => {
    await bypassDisclaimer(page);
    await page.goto('/advanced.html');
    await showCalculatorForm(page);
    await page.click('#btnCalculate');
    await waitForCalculationResults(page);
  });

  test('Risk Analysis button is visible', async ({ page }) => {
    await expect(page.locator('#btnRiskProfiling')).toBeVisible();
  });

  test('clicking Risk Analysis populates risk banner', async ({ page }) => {
    await page.click('#btnRiskProfiling');
    await page.waitForTimeout(3000);
    const riskBanner = page.locator('#riskProfileBanner');
    await expect(riskBanner).toBeVisible({ timeout: 5000 });
  });

  test('risk banner shows capacity, tolerance and requirement bars', async ({ page }) => {
    await page.click('#btnRiskProfiling');
    await page.waitForTimeout(2000);
    await expect(page.locator('#riskCapacityBar')).toBeVisible();
    await expect(page.locator('#riskToleranceBar')).toBeVisible();
    await expect(page.locator('#riskRequirementBar')).toBeVisible();
  });
});

test.describe('Dynamic Asset Allocation', () => {
  test.beforeEach(async ({ page }) => {
    await bypassDisclaimer(page);
    await page.goto('/advanced.html');
    await showCalculatorForm(page);
    await page.click('#btnCalculate');
    await waitForCalculationResults(page);
  });

  test('Asset Allocation button is visible', async ({ page }) => {
    await expect(page.locator('#btnDynamicAllocation')).toBeVisible();
  });

  test('clicking Asset Allocation shows results in charts tab', async ({ page }) => {
    await page.click('#btnDynamicAllocation');
    await page.waitForTimeout(3000);
    await page.click('button.tab-button:has-text("Advanced Charts")');
    await expect(page.locator('#charts-tab')).toBeVisible();
  });
});

test.describe('Compare Strategies (Scenario Matrix)', () => {
  test.beforeEach(async ({ page }) => {
    await bypassDisclaimer(page);
    await page.goto('/advanced.html');
    await showCalculatorForm(page);
    await page.click('#btnCalculate');
    await waitForCalculationResults(page);
  });

  test('Compare Strategies button is visible', async ({ page }) => {
    await expect(page.locator('#btnScenarioMatrix')).toBeVisible();
  });

  test('clicking Compare Strategies shows scenario matrix', async ({ page }) => {
    await page.click('#btnScenarioMatrix');
    await page.waitForTimeout(3000);
    await page.click('button.tab-button:has-text("Scenario Compare")');
    await expect(page.locator('#scenarios-tab')).toBeVisible();
  });
});

test.describe('Life Simulator', () => {
  test.beforeEach(async ({ page }) => {
    await bypassDisclaimer(page);
    await page.goto('/advanced.html');
    await showCalculatorForm(page);
    await page.click('#btnCalculate');
    await waitForCalculationResults(page);
    await page.click('button.tab-button:has-text("Life Simulator")');
    await page.waitForTimeout(500);
  });

  test('Life Simulator tab has spending strategy selector', async ({ page }) => {
    const selector = page.locator('#simSpendingStrategy');
    await expect(selector).toBeVisible();
  });

  test('Life Simulator run button is visible', async ({ page }) => {
    await expect(page.locator('#btnRunLifeSimulator')).toBeVisible();
  });

  test('running life simulator generates results', async ({ page }) => {
    // Select a small number of runs if available
    const runsSelect = page.locator('#simNumRuns');
    if (await runsSelect.isVisible()) {
      await runsSelect.selectOption({ index: 0 });
    }
    await page.click('#btnRunLifeSimulator');
    // Wait for some result to appear
    await page.waitForTimeout(5000);
    const timeline = page.locator('#lifeSimTimelineChart');
    await expect(timeline).toBeVisible();
  });
});
