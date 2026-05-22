Exploratory QA tools are often pitched as: **give it a URL, and a swarm of AI “users” explores the app like humans would — signing up, clicking links, entering edge-case data, trying strange paths, and reporting breakages.** Its site says: “Drop a URL. A swarm of AI users tries to break it, sign up, hit edge sizes, click every link.” ([example.com][1])

For your retirement calculator, the equivalent should not just be “AI clicks around”. Because it is a **financial projection calculator**, QA must combine:

1. **AI exploratory testing** — like exploratory QA tools.
2. **Deterministic Playwright tests** — repeatable browser tests.
3. **Financial calculation oracle tests** — known inputs must produce expected outputs.
4. **Edge-case scenario fuzzing** — weird ages, negative values, high inflation, overseas retirement, SMSF, trust, aged care, etc.
5. **Accessibility and UX checks** — labels, tab order, mobile layout, contrast.

Your page is a large single-page advanced calculator with sections for profile, risk, income, property, SMSF/trusts, retirement goal, healthcare, markets, Age Pension overrides, Monte Carlo/stress testing, overseas retirement, age-related costs, and output tabs like Summary, What-if, Year-by-Year, Risk, AI Recommendations, Overseas Plan, Export PDF and Save Plan. ([Australian Retirement Calculator][2]) ([Australian Retirement Calculator][2])

## How I would replicate exploratory QA for `advanced-v2.html`

Use **Playwright as the browser engine**, then add an AI layer that decides what kind of user it is pretending to be.

Playwright already supports generating tests by recording browser actions, and it prioritises stable locators such as roles, text, and test IDs. ([Playwright][3]) It also has a trace viewer that can show DOM snapshots, network requests, and action timelines, which is ideal for debugging failed QA runs. ([Playwright][4])

The setup should look like this:

```text
qa-scenarios/
  package.json
  playwright.config.ts
  tests/
    smoke.spec.ts
    calculator-golden.spec.ts
    edge-cases.spec.ts
    accessibility.spec.ts
    ai-persona-scenarios.spec.ts
  scenarios/
    single-55-low-super.json
    couple-45-high-income.json
    overseas-india-retirement.json
    smsf-trust-complex.json
    crisis-market-shock.json
  reports/
    screenshots/
    traces/
    qa-findings.json
```

## The agent personas you should run

For this page, I would create these “AI QA users”:

| Persona                         | What it tries                                                |
| ------------------------------- | ------------------------------------------------------------ |
| **Normal Australian Couple**    | Salary, super, home, retirement at 67, comfortable lifestyle |
| **Single Late Starter**         | Age 55, low super, high retirement income target             |
| **Aggressive Investor**         | High return assumptions, high volatility, market shocks      |
| **Conservative Retiree**        | Low return assumptions, high healthcare costs                |
| **Overseas Retirement Planner** | India, Portugal, Thailand, tax residency, FX drift           |
| **SMSF/Trust Edge User**        | SMSF under $300k, trust assets, Centrelink attribution       |
| **Broken Input User**           | Negative values, impossible ages, empty fields, huge numbers |
| **Mobile User**                 | Tests on iPhone/Android viewport                             |
| **Accessibility User**          | Keyboard-only navigation and labels                          |
| **Financial Auditor**           | Checks output consistency, not just visual rendering         |

## Minimum test suite I would build first

### 1. Smoke test

Does the page load, render the core sections, and allow simulation?

```ts
import { test, expect } from '@playwright/test';

test('advanced retirement calculator loads and can run simulation', async ({ page }) => {
  await page.goto('https://retirement.gagneet.com/advanced-v2.html');

  await expect(page.getByText('Plan your retirement')).toBeVisible();
  await expect(page.getByText('About you')).toBeVisible();
  await expect(page.getByText('Risk profile')).toBeVisible();
  await expect(page.getByText('Income & savings')).toBeVisible();

  await page.getByRole('button', { name: /Run simulation/i }).click();

  await expect(page.getByText(/Super at retirement|Confidence|Your money lasts/i)).toBeVisible();
});
```

### 2. Golden scenario test

This is the most important one. You need a set of known input scenarios and expected output ranges.

Example:

```ts
test('known couple scenario produces sane retirement result', async ({ page }) => {
  await page.goto('https://retirement.gagneet.com/advanced-v2.html');

  await page.getByLabel(/I am planning as/i).getByText('Couple').click();

  await page.getByLabel(/Your age/i).fill('45');
  await page.getByLabel(/Retirement age/i).fill('67');
  await page.getByLabel(/Plan to age/i).fill('95');

  await page.getByLabel(/Your base salary/i).fill('150000');
  await page.getByLabel(/Partner base salary/i).fill('90000');
  await page.getByLabel(/Your super today/i).fill('350000');
  await page.getByLabel(/Partner super today/i).fill('180000');

  await page.getByLabel(/Desired annual income/i).fill('90000');

  await page.getByRole('button', { name: /Run simulation/i }).click();

  const confidenceText = await page.getByText(/Confidence/i).locator('..').textContent();

  expect(confidenceText).not.toContain('NaN');
  expect(confidenceText).not.toContain('undefined');
  expect(confidenceText).not.toContain('Infinity');
});
```

For financial QA, do **range assertions**, not exact assertions, unless the calculation engine is deterministic. For Monte Carlo, either fix the random seed or assert that the result is within an acceptable tolerance.

### 3. Edge-case tests

Your page has many inputs where bugs usually hide:

```ts
const badInputs = [
  { label: /Your age/i, value: '-1' },
  { label: /Retirement age/i, value: '40' },
  { label: /Plan to age/i, value: '150' },
  { label: /Inflation/i, value: '99' },
  { label: /Super growth/i, value: '-50' },
  { label: /Home value/i, value: '999999999999' },
];

for (const input of badInputs) {
  test(`rejects or handles bad input: ${input.value}`, async ({ page }) => {
    await page.goto('https://retirement.gagneet.com/advanced-v2.html');

    await page.getByLabel(input.label).fill(input.value);
    await page.getByRole('button', { name: /Run simulation/i }).click();

    await expect(page.locator('body')).not.toContainText('NaN');
    await expect(page.locator('body')).not.toContainText('Infinity');
    await expect(page.locator('body')).not.toContainText('undefined');
  });
}
```

### 4. Accessibility test

Playwright can be used with accessibility tooling to catch issues such as poor contrast, missing labels, and duplicate IDs. ([Playwright][5])

```bash
npm install -D @axe-core/playwright
```

```ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('advanced calculator has no critical accessibility issues', async ({ page }) => {
  await page.goto('https://retirement.gagneet.com/advanced-v2.html');

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();

  const serious = results.violations.filter(v =>
    ['critical', 'serious'].includes(v.impact || '')
  );

  expect(serious).toEqual([]);
});
```

## How to add the “AI swarm” part

The AI layer should not replace Playwright. It should **generate scenarios**, then Playwright executes them.

Example agent instruction:

```text
You are a QA agent testing an Australian retirement calculator.

Goal:
Find bugs in input validation, financial logic, UX flow, mobile layout, and output consistency.

Rules:
- Do not assume financial advice is correct.
- Try realistic Australian retirement scenarios.
- Try edge cases.
- Record every issue with:
  - steps to reproduce
  - input values
  - expected behaviour
  - actual behaviour
  - severity
  - screenshot path
```

Your AI agent should output JSON like:

```json
{
  "persona": "Overseas retirement planner",
  "steps": [
    { "field": "Your age", "value": "52" },
    { "field": "Retirement age", "value": "60" },
    { "field": "I plan to retire overseas", "value": true },
    { "field": "Retirement destination", "value": "India" },
    { "field": "Annual living costs overseas", "value": "30000" }
  ],
  "checks": [
    "No NaN/Infinity values",
    "Overseas Plan tab shows portability explanation",
    "Age Pension does not increase when assets increase",
    "FX drift affects overseas cost projection"
  ]
}
```

Then your Playwright runner consumes that JSON and performs the actions.

## What I would test specifically on your page

Because `advanced-v2.html` includes complex Australian super, Age Pension, property, SMSF, trust, healthcare, market, Monte Carlo, and overseas retirement logic, I would test these invariants:

### Core calculation invariants

```text
More super today should not reduce retirement assets.
Higher desired income should reduce money-lasts-until age.
Higher inflation should reduce real purchasing power.
Higher market return should generally improve projected assets.
Higher healthcare/aged-care costs should reduce retirement confidence.
Higher mortgage/debt should reduce available assets.
```

### Age Pension invariants

```text
Increasing assessable assets should not increase Age Pension.
Single vs couple pension settings should use different thresholds.
Overseas permanent move should reduce supplements immediately or according to the selected rule.
AWLR below full threshold should reduce overseas pension after the relevant period.
```

Your page explicitly includes Age Pension overrides, March 2026 rates, overseas portability, AWLR, 6-week/26-week rules, and permanent-move distinctions, so these should be regression-tested heavily. ([Australian Retirement Calculator][2])

### UI/UX invariants

```text
Every visible input has a label.
No field accepts impossible values without warning.
No output displays NaN, undefined, null, or Infinity.
Tabs do not lose previously entered values.
Save/load roundtrip preserves the scenario.
Export PDF works after a completed simulation.
Mobile layout remains usable.
Keyboard navigation works.
```

## Install and run

```bash
mkdir retirement-qa-scenarios
cd retirement-qa-scenarios
npm init -y
npm init playwright@latest
npm install -D @axe-core/playwright
```

Run the recorder first:

```bash
npx playwright codegen https://retirement.gagneet.com/advanced-v2.html
```

That will let you click through the page and generate a starter test. Playwright’s docs recommend codegen as a quick way to start browser tests, and it generates locators from your interactions. ([Playwright][6])

Then run tests:

```bash
npx playwright test
```

Debug with traces:

```bash
npx playwright test --trace on
npx playwright show-report
```

## My recommended implementation path

Start with this order:

```text
Phase 1: Smoke tests
- Page loads
- Main sections render
- Run simulation works
- No NaN / undefined / Infinity

Phase 2: Golden financial scenarios
- 10 known retirement profiles
- Expected output ranges
- Save/load roundtrip

Phase 3: Edge-case fuzzing
- Impossible ages
- Zero/negative values
- Huge values
- High inflation
- Market crash
- SMSF below viable balance
- Overseas retirement cases

Phase 4: AI swarm
- Generate 20–50 personas
- Run them nightly
- Store screenshots, traces, and JSON bug reports

Phase 5: CI/CD
- Run smoke tests on every commit
- Run golden tests on every PR
- Run AI swarm nightly
```

## The key difference from generic exploratory QA

exploratory QA is excellent for **exploratory UX breakage**. But for your retirement calculator, that is only half the job.

You need:

```text
exploratory AI testing
+ Playwright deterministic browser tests
+ golden financial test cases
+ mathematical invariants
+ accessibility checks
+ mobile rendering checks
+ PDF/export/save-load regression tests
```

That gives you something much stronger than a generic AI website tester: a **financial-calculator QA harness** that can catch both “button is broken” bugs and “the Age Pension calculation is logically wrong” bugs.

[1]: https://example.com/?utm_source=chatgpt.com "Exploratory QA example"
[2]: https://retirement.gagneet.com/advanced-v2.html "Australian Retirement Calculator | Advanced v2"
[3]: https://playwright.dev/docs/codegen?utm_source=chatgpt.com "Test generator"
[4]: https://playwright.dev/docs/best-practices?utm_source=chatgpt.com "Best Practices"
[5]: https://playwright.dev/docs/accessibility-testing?utm_source=chatgpt.com "Accessibility testing"
[6]: https://playwright.dev/docs/codegen-intro?utm_source=chatgpt.com "Generating tests"

