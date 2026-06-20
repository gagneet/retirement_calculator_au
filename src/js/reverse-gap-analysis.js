/**
 * reverse-gap-analysis.js - Gap analysis for the Reverse Retirement Planner.
 *
 * Compares the current projected path against the user's target retirement
 * goal and identifies problems, gaps, and severity.
 */

import { ENHANCED_CONFIG } from './config.js';

const SINGLE_PENSION_MAX = ENHANCED_CONFIG.SINGLE_PENSION_MAX || 31223;
const COUPLE_PENSION_MAX = ENHANCED_CONFIG.COUPLE_PENSION_MAX || 47070;

/**
 * Compare the current projected path against the user's target.
 *
 * @param {object} currentPath       Result from ReversePlanner.buildCurrentPath()
 * @param {object} target            Target object { targetAnnualIncomeToday, retirementAge, confidenceTarget, includeAgePension, minimumEstateToday, householdType }
 * @param {object} [assumptions]     Optional assumptions overrides
 * @param {number} [assumptions.swr] Safe withdrawal rate (default 0.04)
 * @param {number} [assumptions.inflationRate] Inflation rate
 * @returns {object} Gap analysis result
 */
export function compareCurrentToTarget(currentPath, target, assumptions = {}) {
    const swr = assumptions.swr || 0.04;
    const inflationRate = assumptions.inflationRate || currentPath.inflationRate || 0.026;
    const ytr = currentPath.yearsToRetirement || Math.max(1, (target.retirementAge || 67) - (target.currentAge || 50));

    const targetIncome = target.targetAnnualIncomeToday || 0;
    const sustainableIncome = currentPath.sustainableIncomeToday || 0;
    const incomeGapToday = Math.max(0, targetIncome - sustainableIncome);

    const agePensionAnnual = target.includeAgePension
        ? (target.householdType === 'couple' ? COUPLE_PENSION_MAX : SINGLE_PENSION_MAX)
        : 0;

    // Capital gap
    const nominalTargetIncome = targetIncome * Math.pow(1 + inflationRate, ytr);
    const privateIncomeNeeded = Math.max(0, nominalTargetIncome - agePensionAnnual);
    const requiredCapital = swr > 0 ? privateIncomeNeeded / swr : 0;
    const capitalAtRetirement = currentPath.totalAssetsNominal || 0;
    const capitalGap = Math.max(0, requiredCapital - capitalAtRetirement);

    // Super gap at retirement
    const superAtRetirement = currentPath.superAtRetirement || currentPath.score?.superAtRetirement || 0;
    const targetSuper = currentPath.targetSuper || requiredCapital * 0.6;
    const superGap = Math.max(0, targetSuper - superAtRetirement);

    // Mortgage problem
    const mortgageAtRetirement = currentPath.mortgageBalance || 0;
    const mortgageProblem = mortgageAtRetirement > 0;

    // Estate gap
    const minEstate = target.minimumEstateToday || 0;
    const estateAtEnd = currentPath.estateAtLifespan || 0;
    const estateGap = Math.max(0, minEstate - estateAtEnd);

    // Confidence gap
    const currentConfidence = currentPath.score?.successProbability ?? 0;
    const confidenceTarget = target.confidenceTarget || 0.8;
    const confidenceGap = Math.max(0, confidenceTarget - currentConfidence);

    // Age pension reliance
    const agePensionReliance = target.includeAgePension
        ? Math.min(1, agePensionAnnual / Math.max(1, sustainableIncome + agePensionAnnual))
        : 0;

    // Problem detection flags
    const problemFlags = detectProblems(currentPath, target, {
        incomeGapToday,
        capitalGap,
        superGap,
        mortgageProblem,
        estateGap,
        confidenceGap,
        agePensionReliance,
        agePensionAnnual,
        ytr,
        inflationRate,
    });

    // Overall severity
    const severity = calculateSeverity(problemFlags, incomeGapToday, targetIncome);

    return {
        incomeGapToday,
        capitalGapAtRetirement: capitalGap,
        superGapAtRetirement: superGap,
        mortgageAtRetirement: mortgageAtRetirement,
        mortgageProblem,
        estateGapToday: estateGap,
        confidenceGap,
        agePensionReliance,
        agePensionAnnual,
        requiredCapital,
        problemFlags,
        severity,
    };
}

/**
 * Detect specific problems from the gap analysis.
 */
function detectProblems(currentPath, target, gaps) {
    const problems = [];

    // Income gap
    if (gaps.incomeGapToday > 0) {
        problems.push({
            id: 'income_shortfall',
            severity: gaps.incomeGapToday > target.targetAnnualIncomeToday * 0.3 ? 'high' : 'medium',
            label: 'Income shortfall',
            detail: `Current path provides ${formatCurrency(currentPath.sustainableIncomeToday)}/year vs target of ${formatCurrency(target.targetAnnualIncomeToday)}/year`,
        });
    }

    // Retirement age too early
    if (gaps.ytr < 10 && gaps.incomeGapToday > 0) {
        problems.push({
            id: 'retirement_too_early',
            severity: 'medium',
            label: 'Retirement age too early for desired income',
            detail: `Only ${gaps.ytr} years until retirement — insufficient accumulation time`,
        });
    }

    // Mortgage at retirement
    if (gaps.mortgageProblem) {
        problems.push({
            id: 'mortgage_at_retirement',
            severity: 'high',
            label: 'Mortgage remains at retirement',
            detail: `${formatCurrency(currentPath.mortgageBalance)} debt at retirement — increases required drawdown`,
        });
    }

    // Super balance too low
    if (gaps.superGap > 0) {
        problems.push({
            id: 'low_super',
            severity: gaps.superGap > 100000 ? 'high' : 'medium',
            label: 'Super balance too low for target income',
            detail: `Super at retirement ${formatCurrency(currentPath.score?.superAtRetirement || 0)} vs target ${formatCurrency(gaps.requiredCapital * 0.6)}`,
        });
    }

    // Partner super imbalance
    const diff = Math.abs(
        (currentPath.score?.partnerSuperAtRetirement || 0) -
        (currentPath.score?.superAtRetirement || currentPath.score?.yourSuperAtRetirement || 0)
    );
    if (target.householdType === 'couple' && diff > 50000) {
        problems.push({
            id: 'partner_super_imbalance',
            severity: 'medium',
            label: 'Partner super imbalance',
            detail: `Difference of ${formatCurrency(diff)} between partner super balances`,
        });
    }

    // Over-reliance on Age Pension
    if (gaps.agePensionReliance > 0.4) {
        problems.push({
            id: 'age_pension_reliance',
            severity: gaps.agePensionReliance > 0.6 ? 'high' : 'medium',
            label: 'Over-reliance on Age Pension',
            detail: `${(gaps.agePensionReliance * 100).toFixed(0)}% of expected income comes from Age Pension`,
        });
    }

    // Estate shortfall
    if (gaps.estateGap > 0) {
        problems.push({
            id: 'estate_shortfall',
            severity: 'low',
            label: 'Estate/inheritance target may not be met',
            detail: `Estate target ${formatCurrency(target.minimumEstateToday)} may exceed projected ${formatCurrency(currentPath.estateAtLifespan || 0)}`,
        });
    }

    // Confidence gap
    if (gaps.confidenceGap > 0.1) {
        problems.push({
            id: 'low_confidence',
            severity: gaps.confidenceGap > 0.25 ? 'high' : 'medium',
            label: 'Confidence below target',
            detail: `Current confidence ${((1 - gaps.confidenceGap) * 100).toFixed(0)}% vs target ${(target.confidenceTarget * 100).toFixed(0)}%`,
        });
    }

    // Target income vs estate conflict
    if (gaps.incomeGapToday > 0 && target.minimumEstateToday > 0) {
        problems.push({
            id: 'income_estate_conflict',
            severity: 'medium',
            label: 'High inheritance target conflicts with spending goal',
            detail: 'Preserving a large estate reduces available retirement income',
        });
    }

    return problems;
}

/**
 * Calculate overall severity from problem flags.
 */
function calculateSeverity(problemFlags, incomeGap, targetIncome) {
    if (problemFlags.some(p => p.severity === 'high')) return 'high';
    if (problemFlags.length >= 3) return 'high';
    if (problemFlags.some(p => p.severity === 'medium')) return 'medium';
    if (incomeGap > targetIncome * 0.1) return 'medium';
    if (problemFlags.length === 0) return 'none';
    return 'low';
}

function formatCurrency(v) {
    if (v === undefined || v === null || !Number.isFinite(v)) return '$0';
    return '$' + Math.round(v).toLocaleString('en-AU');
}

/**
 * Generate a gap comparison row for the current vs required table.
 */
export function buildGapComparisonRow(label, current, required, gap, recommendedAction, unit) {
    return {
        label,
        current: unit === '$' ? formatCurrency(current) : String(current),
        required: unit === '$' ? formatCurrency(required) : String(required),
        gap: gap > 0
            ? (unit === '$' ? `-${formatCurrency(gap)}` : `-${gap}`)
            : '—',
        recommendedAction,
        hasGap: gap > 0,
    };
}

/**
 * Build the full comparison table data from gap analysis.
 */
export function buildComparisonTable(gap, currentPath, target) {
    const rows = [];

    rows.push(buildGapComparisonRow(
        'Retirement income',
        currentPath.sustainableIncomeToday,
        target.targetAnnualIncomeToday,
        gap.incomeGapToday,
        gap.incomeGapToday > 0 ? 'Increase contributions or delay retirement' : 'On track',
        '$'
    ));

    rows.push(buildGapComparisonRow(
        'Capital at retirement',
        currentPath.totalAssetsNominal,
        gap.requiredCapital,
        gap.capitalGapAtRetirement,
        gap.capitalGapAtRetirement > 0 ? 'Boost savings rate' : 'On track',
        '$'
    ));

    const superAtRet = currentPath.score?.superAtRetirement || currentPath.superAtRetirement || 0;
    rows.push(buildGapComparisonRow(
        'Super at retirement',
        superAtRet,
        gap.requiredCapital * 0.6,
        gap.superGapAtRetirement,
        gap.superGapAtRetirement > 0 ? 'Salary sacrifice more' : 'On track',
        '$'
    ));

    rows.push(buildGapComparisonRow(
        'Mortgage at retirement',
        currentPath.mortgageBalance || 0,
        0,
        currentPath.mortgageBalance || 0,
        currentPath.mortgageBalance > 0 ? 'Pay extra monthly or refinance' : 'No mortgage concern',
        '$'
    ));

    rows.push(buildGapComparisonRow(
        'Age Pension',
        gap.agePensionAnnual,
        gap.agePensionAnnual,
        0,
        gap.agePensionReliance > 0.4 ? 'Reduce reliance — increase private savings' : 'Supplementary only',
        '$'
    ));

    const estateVal = currentPath.estateAtLifespan || 0;
    rows.push(buildGapComparisonRow(
        'Estate/inheritance',
        estateVal,
        target.minimumEstateToday || 0,
        gap.estateGapToday,
        gap.estateGapToday > 0 ? 'Reduce estate target or save more' : 'On track',
        '$'
    ));

    const currentConf = currentPath.score?.successProbability ?? 0;
    rows.push(buildGapComparisonRow(
        'Confidence',
        (currentConf * 100).toFixed(0) + '%',
        ((target.confidenceTarget || 0.8) * 100).toFixed(0) + '%',
        gap.confidenceGap * 100,
        gap.confidenceGap > 0.1 ? 'Stress-test and diversify' : 'Adequate',
        '%'
    ));

    return rows;
}
