/**
 * reverse-report.js - Plain-English report generation for the Reverse Retirement Planner
 *
 * Converts solver results into human-readable text blocks and action strings.
 * No financial calculations here — only formatting.
 */

const CURRENCY_FORMAT = new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
});

function fmt(amount) {
    return CURRENCY_FORMAT.format(Math.round(amount));
}

// ---------------------------------------------------------------------------
// Plain-English summary
// ---------------------------------------------------------------------------

/**
 * Generate a plain-English summary of the reverse planner result.
 *
 * @param {object} result  Result object from ReversePlanner.solve()
 * @returns {object}  { headline, currentPathText, gapText, actionText, cautionText }
 */
export function generatePlainEnglishSummary(result) {
    const { target, currentPath, top3Actions, summary, householdPattern } = result;

    // Headline
    const headline = currentPath.meetsGoal
        ? `Your current plan is on track to support ${fmt(target.targetAnnualIncomeToday)}/year in retirement.`
        : `Your current plan falls short of your ${fmt(target.targetAnnualIncomeToday)}/year retirement goal by ${fmt(currentPath.incomeGap)}/year.`;

    // Current path text
    const sustainableFmt = fmt(currentPath.sustainableIncomeToday);
    const currentPathText = [
        `Based on your current settings, your retirement savings are on track to sustainably support approximately ${sustainableFmt}/year in today's dollars.`,
        `This is based on your projected retirement assets of ${fmt(currentPath.totalAssetsNominal)} at age ${target.retirementAge}, using a ${(currentPath.swr * 100).toFixed(1)}% safe withdrawal rate.`,
    ].join(' ');

    // Gap analysis text
    let gapText = '';
    if (!currentPath.meetsGoal) {
        gapText = [
            `There is a shortfall of ${fmt(currentPath.incomeGap)}/year (${fmt(currentPath.capitalGap)} in capital terms).`,
            `To bridge this gap, consider the targeted actions below.`,
        ].join(' ');
    } else {
        gapText = 'Your plan currently meets your retirement income goal. Consider the optimisations below to strengthen your position further.';
    }

    // Action text
    let actionText = '';
    if (top3Actions.length === 0) {
        actionText = 'No single lever can bridge the gap — a combination of changes is recommended. Speak to a financial adviser.';
    } else {
        const actionLines = top3Actions.map((a, i) => `${i + 1}. ${a.description}`);
        actionText = 'Top recommended actions:\n' + actionLines.join('\n');
    }

    // Pattern-specific caution
    const cautionMap = {
        high_income_low_super: 'Your income suggests you may be able to significantly boost super contributions while reducing income tax. Salary sacrifice is often the highest-impact lever for high earners.',
        low_income: 'For lower incomes, the Age Pension will play a larger role in retirement. Building super and savings incrementally will strengthen your position over time.',
        equal_earners: 'As a dual-income couple, super equalisation can reduce tax and maximise pension entitlements. Consider reviewing which partner holds the higher super balance.',
        one_earner: 'With one primary earner, spouse contributions and super splitting can help build the lower-balance partner\'s super while providing tax benefits.',
        dual_high_income: 'As a high-income couple, Division 293 tax applies to super contributions above $250k income. Non-concessional contributions and investment properties may offer complementary strategies.',
    };

    const cautionText = cautionMap[householdPattern] || null;

    return {
        headline,
        currentPathText,
        gapText,
        actionText,
        cautionText,
    };
}

// ---------------------------------------------------------------------------
// Format individual lever as an action string
// ---------------------------------------------------------------------------

/**
 * Convert a solver lever result into a concise action string.
 *
 * @param {object} lever  Lever result object from solver
 * @returns {string}      Action string
 */
export function formatLeverAsAction(lever) {
    if (!lever.feasible) {
        return `${lever.label}: Not achievable with this lever alone — ${lever.description}`;
    }

    const unitFmt = {
        'AUD/year': (v) => `${fmt(v)}/year`,
        'AUD/month': (v) => `${fmt(v)}/month`,
        'AUD lump sum': (v) => `${fmt(v)} lump sum`,
        'AUD': (v) => fmt(v),
        'years': (v) => `${v} year${v !== 1 ? 's' : ''}`,
    };

    const valueStr = lever.value !== null && lever.value !== undefined
        ? (unitFmt[lever.unit] ? unitFmt[lever.unit](lever.value) : `${lever.value} ${lever.unit}`)
        : '';

    if (!valueStr || lever.value === 0) {
        return `${lever.label}: No change needed — goal already achievable`;
    }

    return `${lever.label}: ${lever.description}`;
}

// ---------------------------------------------------------------------------
// Assumptions text
// ---------------------------------------------------------------------------

/**
 * Generate the assumptions disclosure text for display in the UI.
 *
 * @param {object} target   Resolved target object
 * @param {object} inputs   Normalised simulator inputs
 * @returns {string[]}      Array of assumption strings
 */
export function generateAssumptionsText(target, inputs) {
    const inflationRate = inputs.inflation ?? 0.026;
    const swr = target.swr ?? 0.04;
    const superReturn = inputs.superReturn ?? 0.075;
    const investmentReturn = inputs.investmentReturn ?? 0.07;

    return [
        `Inflation: ${(inflationRate * 100).toFixed(1)}% per year (general CPI)`,
        `Super return: ${(superReturn * 100).toFixed(1)}% per year (pre-fees, gross)`,
        `Investment return: ${(investmentReturn * 100).toFixed(1)}% per year (pre-tax, gross)`,
        `Safe withdrawal rate (SWR): ${(swr * 100).toFixed(1)}% — income expressed as a percentage of capital at retirement`,
        `Target income: ${fmt(target.targetAnnualIncomeToday)}/year in today's dollars (${new Date().getFullYear()})`,
        `Retirement age: ${target.retirementAge}`,
        `Lifespan: ${target.lifespan} (funds must last to this age)`,
        `Age Pension: ${target.includeAgePension ? 'Included (March 2026 rates, Services Australia)' : 'Excluded from projections'}`,
        `Super Guarantee rate: ${(inputs.employerSuperContributionRate * 100).toFixed(0)}% (current legislated rate)`,
        `Concessional contributions cap: $30,000/year (2024-25, indexed)`,
        `All values in Australian dollars (AUD)`,
        `Tax calculations use 2024-25 ATO brackets including Medicare Levy`,
        `This is a deterministic projection — actual outcomes will vary due to market volatility`,
    ];
}

// ---------------------------------------------------------------------------
// Disclaimer text (must appear in UI)
// ---------------------------------------------------------------------------

export const DISCLAIMER_TEXT = `This calculator provides general scenario modelling only. It is not personal financial, tax, legal, migration or estate-planning advice. The projections shown are illustrative estimates based on the assumptions you enter, and actual outcomes will differ due to changes in markets, legislation, personal circumstances, and other factors. Always consult a licensed financial adviser, accountant, lawyer or migration agent before making decisions about your retirement, investments, superannuation or estate planning. Past performance is not a reliable indicator of future performance. Superannuation rules, Age Pension rates, and tax legislation change regularly — verify current rules with the ATO and Services Australia.`;

// ---------------------------------------------------------------------------
// Optional: Format result for export
// ---------------------------------------------------------------------------

/**
 * Format the reverse planner result as a plain-text report for export.
 *
 * @param {object} result   Result from ReversePlanner.solve()
 * @param {object} summary  Result from generatePlainEnglishSummary()
 * @returns {string}        Formatted text report
 */
export function formatTextReport(result, summary) {
    const { target, currentPath, rankedLevers } = result;
    const lines = [
        '='.repeat(60),
        'REVERSE RETIREMENT PLANNER — REPORT',
        `Generated: ${new Date().toLocaleDateString('en-AU')}`,
        '='.repeat(60),
        '',
        'GOAL',
        '-'.repeat(40),
        `Target income (today's dollars): ${fmt(target.targetAnnualIncomeToday)}/year`,
        `Retirement age: ${target.retirementAge}`,
        `Current age: ${target.currentAge}`,
        `Planning to age: ${target.lifespan}`,
        `Household type: ${target.householdType}`,
        '',
        'CURRENT PROJECTION',
        '-'.repeat(40),
        summary.currentPathText,
        summary.gapText,
        '',
        'TOP RECOMMENDED ACTIONS',
        '-'.repeat(40),
        summary.actionText,
        '',
        'ALL LEVERS (ranked)',
        '-'.repeat(40),
    ];

    for (const lever of rankedLevers) {
        const status = lever.feasible ? '✓' : '✗';
        lines.push(`${status} [${lever.lever}] ${formatLeverAsAction(lever)}`);
    }

    lines.push('');
    lines.push('ASSUMPTIONS');
    lines.push('-'.repeat(40));
    for (const assumption of generateAssumptionsText(target, result.inputs)) {
        lines.push(`• ${assumption}`);
    }

    lines.push('');
    lines.push('DISCLAIMER');
    lines.push('-'.repeat(40));
    lines.push(DISCLAIMER_TEXT);

    if (summary.cautionText) {
        lines.push('');
        lines.push('NOTE');
        lines.push('-'.repeat(40));
        lines.push(summary.cautionText);
    }

    return lines.join('\n');
}
