import { DECLINE_MAX, RETURN_CEILING } from '../policy/normalise-inputs.js';

const issue = (field, message, code) => ({ field, message, code });
const finite = (value) => typeof value === 'number' && Number.isFinite(value);

export function validateReconciledInputs(inputs = {}, canonicalInput = {}, context = {}) {
    const blockingIssues = [];
    const warnings = [];
    const information = [];
    const age = inputs.yourCurrentAge;
    const retirementAge = inputs.retirementAge;
    if (!finite(age) || age < 18 || age > 120) {
        blockingIssues.push(issue('yourCurrentAge', 'Current age must be a finite value between 18 and 120.', 'invalid_age'));
    }
    if (!finite(retirementAge) || retirementAge <= age) {
        blockingIssues.push(issue('retirementAge', 'Retirement age must be later than current age.', 'invalid_retirement_age'));
    }
    for (const field of ['yourSalary', 'yourCurrentSuper', 'currentSavings', 'currentStocks', 'homeValue', 'mortgageBalance']) {
        if (inputs[field] != null && !finite(inputs[field])) {
            blockingIssues.push(issue(field, `${field} must be a finite number.`, 'non_finite_value'));
        }
    }
    for (const field of ['investmentReturn', 'superReturn']) {
        if (finite(inputs[field]) && (inputs[field] < 0 || inputs[field] > RETURN_CEILING)) {
            blockingIssues.push(issue(field, `${field} is outside the safe long-run range.`, 'unsafe_return'));
        }
    }
    if (finite(inputs.returnDeclineRate) && (inputs.returnDeclineRate < 0 || inputs.returnDeclineRate > DECLINE_MAX)) {
        blockingIssues.push(issue('returnDeclineRate', 'Annual return decline is outside the supported range.', 'unsafe_decline_rate'));
    }
    for (const entry of context.sanitiseWarnings || []) {
        if (entry.severity === 'error') {
            blockingIssues.push(issue(entry.field, entry.message, 'unsafe_sanitised_input'));
        } else if (entry.severity === 'information') {
            information.push(issue(entry.field, entry.message, 'input_defaulted'));
        }
    }
    if (!['base', 'baseline'].includes(inputs.scenarioMode || 'baseline')) {
        warnings.push(issue('scenarioMode', 'The selected non-base mode is excluded from the headline projection.', 'non_base_headline'));
    }
    if (inputs.hasInvestmentProperty && finite(inputs.investmentPropertyValue)
        && finite(inputs.investmentPropertyLoan)
        && inputs.investmentPropertyValue < inputs.investmentPropertyLoan) {
        warnings.push(issue('investmentPropertyValue', 'Investment property is in negative equity.', 'negative_equity'));
    }
    if (inputs.hasInvestmentProperty && finite(inputs.investmentPropertyPurchasePrice)
        && inputs.investmentPropertyPurchasePrice > 0
        && inputs.investmentPropertyValue < inputs.investmentPropertyPurchasePrice) {
        warnings.push(issue('investmentPropertyValue', 'Investment property value is below its purchase price.', 'below_purchase_price'));
    }
    if (finite(inputs.superReturn) && finite(inputs.investmentReturn)
        && inputs.superReturn - inputs.investmentReturn > 0.02) {
        warnings.push(issue('superReturn', 'Super return exceeds non-super return by more than 2 percentage points.', 'return_basis_mismatch'));
    }
    if (inputs.useDetailedExpenseInputs
        && (!finite(inputs.currentMonthlyIncome) || inputs.currentMonthlyIncome <= 0
            || !finite(inputs.currentMonthlyLivingCosts) || inputs.currentMonthlyLivingCosts <= 0)) {
        warnings.push(issue('currentMonthlyIncome', 'Detailed cashflow is enabled but monthly income or spending is missing.', 'incomplete_detailed_cashflow'));
    }
    if (finite(inputs.creditCardBalance) && inputs.creditCardBalance > 0 && inputs.hasDebt === false) {
        warnings.push(issue('creditCardBalance', 'Credit-card debt is present while the high-interest-debt flag says none.', 'debt_flag_mismatch'));
    }
    if (inputs.hasInvestmentProperty) {
        for (const [field, value] of [
            ['investmentPropertyValue', inputs.investmentPropertyValue],
            ['investmentPropertyLoan', inputs.investmentPropertyLoan],
            ['investmentPropertyPurchasePrice', inputs.investmentPropertyPurchasePrice],
        ]) {
            if (!finite(value) || value < 0) {
                blockingIssues.push(issue(field, `${field} is required and must be a non-negative finite number.`, 'missing_property_field'));
            }
        }
    }
    if (!canonicalInput?.schemaVersion) {
        blockingIssues.push(issue('schemaVersion', 'Canonical input schema version is missing.', 'missing_canonical_schema'));
    }
    return { valid: blockingIssues.length === 0, blockingIssues, warnings, information };
}
