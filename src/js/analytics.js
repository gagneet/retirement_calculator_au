/**
 * @file Google Analytics event tracking utility.
 * @description This module provides a centralized way to send custom events to Google Analytics.
 * It checks for the existence of the 'gtag' function before sending events,
 * ensuring that the application does not break if Google Analytics is blocked.
 */

/**
 * Sends a custom event to Google Analytics.
 *
 * @param {string} action - The action for the event (e.g., 'click').
 * @param {string} category - The category of the event (e.g., 'Button').
 * @param {string} label - The label for the event (e.g., 'Calculate Projection').
 * @param {number} [value] - An optional numeric value for the event.
 */
export function trackEvent(action, category, label, value) {
    if (typeof window.gtag === 'function') {
        window.gtag('event', action, {
            'event_category': category,
            'event_label': label,
            'value': value
        });
    } else {
        console.log(`GA Event (blocked): Action=${action}, Category=${category}, Label=${label}`);
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
    trackEvent('onboarding', 'User Flow', choice);
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