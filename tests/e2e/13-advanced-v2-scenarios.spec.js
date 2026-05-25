/**
 * Scenario-based deterministic QA for advanced-v2.html.
 *
 * These tests consume persona JSON and repository templates, then assert the
 * financial UI invariants called out in docs/testing-the-system.md.
 */

const fs = require('fs');
const path = require('path');
const { test, expect } = require('../../playwright_modules/node_modules/@playwright/test');
const personas = require('./scenarios/retirement-personas.json');

const INVALID_OUTPUT = /\b(?:NaN|Infinity|undefined|null)\b/i;

function loadScenarioFields(scenario) {
  if (!scenario.template) return scenario.fields || {};
  const templatePath = path.resolve(__dirname, scenario.template);
  const parsed = JSON.parse(fs.readFileSync(templatePath, 'utf8'));
  return parsed.userData || parsed;
}

function normalizeTemplateFields(fields) {
  const aliases = {
    yourCurrentAge: 'age',
    retirementAge: 'retireAge',
    yourLifespan: 'lifespan',
    partnerCurrentAge: 'partnerAge',
    partnerRetirementAge: 'partnerRetireAge',
    yourSalary: 'salary',
    yourCurrentSuper: 'superBal',
    currentSavings: 'cash',
    currentStocks: 'stocks',
    mortgageBalance: 'mortgage',
    hasInvestmentProperty: 'investmentProperty',
    investmentPropertyValue: 'ipValue',
    investmentPropertyLoan: 'ipLoan',
    investmentPropertyRate: 'ipRate',
    weeklyRentalIncome: 'ipWeeklyRent',
    annualPropertyExpenses: 'ipAnnualExpenses',
    hasSMSF: 'hasSmsf',
    hasTrustAssets: 'hasTrust',
    asfaComfortable: 'desiredIncome',
    investmentReturn: 'invReturn',
    superReturn: 'superGrowth',
    agePensionMax: 'pensionAnnualCouple',
    pensionAssetLimit: 'pensionAssetCutoff',
    numRuns: 'mcRuns',
    useLongevityDistribution: 'sampleLifespan',
    enableProposedBudget2026: 'budget2627',
    overseasCountry: 'destination',
    overseasAge: 'ageMovingOverseas',
    overseasAnnualBudget: 'annualLivingCostOverseas',
  };

  const normalized = { ...fields };
  for (const [from, to] of Object.entries(aliases)) {
    if (normalized[to] == null && fields[from] != null) normalized[to] = fields[from];
  }
  if (fields.planToDownsize != null && normalized.downsizePlan == null) {
    normalized.downsizePlan = fields.planToDownsize ? 'yes' : 'no';
  }
  if (fields.hasPrivateHealthCover != null && normalized.hasPrivateHospital == null) {
    normalized.hasPrivateHospital = fields.hasPrivateHealthCover;
  }
  if (fields.universitySupport != null && normalized.uniSupport == null) {
    normalized.uniSupport = fields.universitySupport;
  }

  // Legacy templates store percentages as decimals. Advanced v2 form fields use percent values.
  ['inflation', 'invReturn', 'superGrowth', 'savingsReturn', 'returnVolatility', 'shockProbability',
    'shockMagnitude', 'mortgageRate', 'ipRate', 'ipGrowthRate', 'trustTaxRate',
    'beneficiaryAllocation', 'carerReducedWorkPercent'].forEach((id) => {
    if (Math.abs(Number(normalized[id])) > 0 && Math.abs(Number(normalized[id])) <= 1) {
      normalized[id] = Number(normalized[id]) * 100;
    }
  });

  // Keep browser e2e scenarios fast and deterministic enough for CI.
  normalized.mcRuns = Math.min(Number(normalized.mcRuns) || 200, 200);

  return normalized;
}

async function openAdvancedV2(page) {
  page.setDefaultTimeout(60000);
  await page.goto('/advanced-v2.html');
  await page.waitForLoadState('domcontentloaded');
  await expect(page.locator('#btn-calculate')).toBeVisible({ timeout: 10000 });
}

async function showAdvancedFields(page) {
  const advancedButton = page.locator('#btn-advanced');
  if (await advancedButton.isVisible()) {
    const label = await advancedButton.textContent();
    if (/show advanced/i.test(label || '')) {
      await page.evaluate(() => document.getElementById('btn-advanced')?.click());
    }
  }
}

async function applyPersona(page, rawFields) {
  await showAdvancedFields(page);
  const fields = normalizeTemplateFields(rawFields);
  await page.evaluate((values) => {
    const fire = (el) => {
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    };

    Object.entries(values).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (value == null || typeof value === 'object') return;
      if (el) {
        if (el.type === 'checkbox') el.checked = Boolean(value);
        else el.value = String(value);
        fire(el);
        return;
      }

      const seg = document.querySelector(`.segmented[data-bind="${id}"]`);
      if (!seg) return;
      const button = seg.querySelector(`button[data-value="${String(value)}"]`);
      if (button) button.click();
    });
  }, fields);
  return fields;
}

async function runSimulation(page, expectedFields = {}) {
  // Advanced v2 performs a debounced live deterministic recalculation after input
  // changes. Wait for scenario-specific hero values so assertions cannot pass on
  // the page's previous/default live projection.
  await page.waitForFunction((expected) => {
    const runway = document.getElementById('r-runway')?.textContent?.trim();
    const superAtRetire = document.getElementById('r-super-at-retire')?.textContent?.trim();
    if (!runway || runway === '-' || runway === '—') return false;
    if (!superAtRetire || superAtRetire === '-' || superAtRetire === '—') return false;

    const age = document.getElementById('hs-age')?.textContent?.trim();
    if (expected.age != null && age !== String(expected.age)) return false;

    const salary = document.getElementById('hs-salary')?.textContent?.trim();
    if (expected.salary != null) {
      const expectedSalary = '$' + Math.round(Number(expected.salary) / 1000) + 'k';
      if (salary !== expectedSalary) return false;
    }

    const superSummary = document.getElementById('hs-super')?.textContent?.trim();
    if (expected.superBal != null) {
      const expectedSuper = '$' + Math.round(Number(expected.superBal) / 1000) + 'k';
      if (superSummary !== expectedSuper) return false;
    }

    return true;
  }, expectedFields, { timeout: 10000 });
}

async function expectNoInvalidNumbers(page) {
  await expect(page.locator('body')).not.toContainText(INVALID_OUTPUT);
}

test.describe('Advanced v2 retirement personas', () => {
  for (const scenario of personas) {
    test(`${scenario.persona} completes expected checks`, async ({ page }) => {
      const pageErrors = [];
      page.on('pageerror', (err) => pageErrors.push(err.message));

      await openAdvancedV2(page);
      const fields = await applyPersona(page, loadScenarioFields(scenario));
      await runSimulation(page, fields);

      if (scenario.checks.includes('summary')) {
        await expect(page.locator('#r-super-at-retire')).not.toContainText(/-|—/);
        await expect(page.locator('#r-confidence')).not.toContainText(/-|—/);
        await expect(page.locator('body')).toContainText(/confidence|super|retirement/i);
      }

      if (scenario.checks.includes('year')) {
        await page.locator('.analysis-tabs button[data-tab="year"]').click();
        await expect(page.locator('#year-tbody tr').first()).toBeVisible({ timeout: 10000 });
      }

      if (scenario.checks.includes('overseas')) {
        await page.evaluate(() => document.getElementById('tool-overseas')?.click());
        await page.waitForFunction(() => {
          const panel = document.querySelector('[data-tab-panel="overseas"]');
          return panel && /India|pension|portability|overseas/i.test(panel.textContent || '');
        }, { timeout: 60000 });
        await expect(page.locator('[data-tab-panel="overseas"]')).toContainText(/India|pension|portability/i);
      }

      if (scenario.checks.includes('riskSignal')) {
        await expect(page.locator('body')).toContainText(/gap|confidence|lasts|retirement/i);
      }

      if (scenario.checks.includes('warningSurface')) {
        await expect(page.locator('body')).toContainText(/SMSF|trust|property|super/i);
      }

      if (scenario.checks.includes('noInvalidNumbers')) await expectNoInvalidNumbers(page);

      if (scenario.checks.includes('noCriticalPageErrors')) {
        const critical = pageErrors.filter((message) => !/analytics|gtag|ResizeObserver/i.test(message));
        expect(critical).toEqual([]);
      }
    });
  }
});

test.describe('Advanced v2 financial UI invariants', () => {
  test('higher super balance does not reduce displayed super at retirement', async ({ page }) => {
    await openAdvancedV2(page);
    const lowFields = await applyPersona(page, { age: 50, retireAge: 67, superBal: 100000, partnerSuperBal: 0 });
    await runSimulation(page, lowFields);
    const lowSuper = await page.locator('#r-super-at-retire').textContent();

    const highFields = await applyPersona(page, { superBal: 500000, partnerSuperBal: 0 });
    await runSimulation(page, highFields);
    const highSuper = await page.locator('#r-super-at-retire').textContent();

    const parseMoney = (text) => Number(String(text).replace(/[^0-9.]/g, ''));
    expect(parseMoney(highSuper)).toBeGreaterThanOrEqual(parseMoney(lowSuper));
    await expectNoInvalidNumbers(page);
  });

  test('mobile viewport can run and inspect results without invalid output', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openAdvancedV2(page);
    const fields = await applyPersona(page, { age: 49, retireAge: 67, salary: 120000, superBal: 250000, desiredIncome: 72000 });
    await runSimulation(page, fields);

    await expect(page.locator('.fab .fab-btn')).toBeVisible();
    await expect(page.locator('#r-runway')).not.toContainText(/-|—/);
    await expectNoInvalidNumbers(page);
  });
});
