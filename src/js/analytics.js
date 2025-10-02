/**
 * @file Google Analytics event tracking utility.
 * @description This module provides a centralized way to send custom events to Google Analytics.
 * It checks for the existence of the 'gtag' function before sending events,
 * ensuring that the application does not break if Google Analytics is blocked.
 */

/**
 * Sends a custom event to Google Analytics (GA4).
 *
 * @param {string} action - The event name (e.g., 'click').
 * @param {string} category - The category of the event (e.g., 'Button').
 * @param {string} label - The label for the event (e.g., 'Calculate Projection').
 * @param {number} [value] - An optional numeric value for the event.
 */
export function trackEvent(action, category, label, value) {
    // Validate and sanitize inputs
    if (typeof action !== 'string' || typeof category !== 'string' || typeof label !== 'string') {
        console.warn('Invalid analytics parameters: action, category, and label must be strings');
        return;
    }

    // Sanitize strings to prevent injection
    const sanitizedAction = action.replace(/[<>\"'&]/g, '').substring(0, 100);
    const sanitizedCategory = category.replace(/[<>\"'&]/g, '').substring(0, 100);
    const sanitizedLabel = label.replace(/[<>\"'&]/g, '').substring(0, 500);

    if (typeof window.gtag === 'function') {
        window.gtag('event', sanitizedAction, {
            'category': sanitizedCategory,
            'label': sanitizedLabel,
            'value': typeof value === 'number' ? value : undefined
        });
    }
}

/**
 * Tracks a button click event.
 *
 * @param {string} buttonName - The name or ID of the button that was clicked.
 */
export function trackButtonClick(buttonName) {
    trackEvent('click', 'Button', buttonName);
}

/**
 * Tracks the user's choice during onboarding.
 *
 * @param {string} choice - The choice made by the user (e.g., 'New User', 'Returning User').
 */
export function trackOnboardingChoice(choice) {
    trackEvent('onboarding_choice', 'User Flow', choice);
}

/**
 * Tracks data import/export actions.
 *
 * @param {string} action - The data action performed (e.g., 'Save Data', 'Load Data').
 */
export function trackDataAction(action) {
    trackEvent('data_management', 'Data', action);
}

/**
 * Tracks the usage of a specific feature.
 *
 * @param {string} featureName - The name of the feature being used.
 */
export function trackFeatureUsage(featureName) {
    trackEvent('feature_usage', 'Features', featureName);
}

/**
 * Tracks the result of a calculation.
 *
 * @param {string} type - The type of calculation (e.g., 'Projection', 'Monte Carlo').
 * @param {boolean} success - Whether the calculation was successful.
 */
export function trackCalculation(type, success) {
    trackEvent('calculation', 'Core', type, success ? 1 : 0);
}