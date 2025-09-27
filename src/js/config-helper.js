// config-helper.js - Utility functions for easy config access
// Provides simple methods to get financial constants without complex object paths

import { ENHANCED_FINANCIAL_CONFIG } from './enhanced-config.js';

export class ConfigHelper {
    /**
     * Get a financial constant by category and key
     * @param {string} category - Config category (e.g., 'riskAssessment', 'assetAllocation')
     * @param {string} key - Constant key
     * @param {string} subkey - Optional subkey for nested values
     * @returns {any} The constant value
     */
    static get(category, key, subkey = null) {
        return ENHANCED_FINANCIAL_CONFIG.getConstant(category, key, subkey);
    }

    /**
     * Update a constant value (for admin interface)
     * @param {string} category - Config category
     * @param {string} key - Constant key
     * @param {any} newValue - New value
     * @param {object} metadata - Optional metadata
     * @returns {boolean} Success status
     */
    static update(category, key, newValue, metadata = {}) {
        return ENHANCED_FINANCIAL_CONFIG.updateConstant(category, key, newValue, metadata);
    }

    /**
     * Get metadata for a constant (for admin interface)
     * @param {string} category - Config category
     * @param {string} key - Constant key
     * @returns {object|null} Metadata object
     */
    static getMetadata(category, key) {
        return ENHANCED_FINANCIAL_CONFIG.getMetadata(category, key);
    }

    // ===== COMMONLY USED CONSTANTS (Convenience Methods) =====

    // Risk Assessment
    static get riskFreeRate() {
        return this.get('riskAssessment', 'RISK_FREE_RATE');
    }

    static get successRateThresholds() {
        return ENHANCED_FINANCIAL_CONFIG.riskAssessment.SUCCESS_RATE_THRESHOLDS;
    }

    // Asset Allocation
    static get bondMultiplier() {
        return this.get('assetAllocation', 'RETURN_EXPECTATIONS', 'BOND_MULTIPLIER');
    }

    static get cashMultiplier() {
        return this.get('assetAllocation', 'RETURN_EXPECTATIONS', 'CASH_MULTIPLIER');
    }

    static get equityMultiplier() {
        return this.get('assetAllocation', 'RETURN_EXPECTATIONS', 'EQUITY_MULTIPLIER');
    }

    // Australian System
    static get corporateTaxRate() {
        return this.get('australianSystem', 'CORPORATE_TAX_RATE');
    }

    static get cgtDiscount() {
        return this.get('australianSystem', 'CGT_DISCOUNT');
    }

    // Property Investment
    static get buildingValueRatio() {
        return this.get('propertyInvestment', 'VALUATION_ASSUMPTIONS', 'BUILDING_VALUE_RATIO');
    }

    static get propertySellingCosts() {
        return this.get('propertyInvestment', 'TRANSACTION_COSTS', 'SELLING_COSTS_PERCENT');
    }

    // Healthcare & Cash Flow
    static get healthcareInflation() {
        return this.get('healthcareAgedCare', 'INFLATION_RATES', 'HEALTHCARE_INFLATION');
    }

    static get housingStressThreshold() {
        return this.get('cashFlowAnalysis', 'FINANCIAL_STRESS_INDICATORS', 'HOUSING_STRESS_THRESHOLD');
    }

    static get childcareDailyRate() {
        return this.get('cashFlowAnalysis', 'CHILDCARE_COSTS', 'DAILY_RATE');
    }

    // ===== BATCH OPERATIONS FOR ADMIN INTERFACE =====

    /**
     * Get all constants in a category for admin interface
     * @param {string} category - Config category
     * @returns {object} All constants in the category
     */
    static getCategoryConstants(category) {
        return ENHANCED_FINANCIAL_CONFIG[category] || {};
    }

    /**
     * Get all updatable constants across all categories
     * @returns {Array} Array of updatable constants with metadata
     */
    static getUpdatableConstants() {
        const updatable = [];

        Object.keys(ENHANCED_FINANCIAL_CONFIG).forEach(category => {
            if (category.startsWith('_') || typeof ENHANCED_FINANCIAL_CONFIG[category] !== 'object') return;

            Object.keys(ENHANCED_FINANCIAL_CONFIG[category]).forEach(key => {
                if (key.startsWith('_')) return;

                const constant = ENHANCED_FINANCIAL_CONFIG[category][key];
                if (typeof constant === 'object' && constant.value !== undefined) {
                    const metadata = this.getMetadata(category, key);
                    if (metadata && metadata.canBeUpdated !== false) {
                        updatable.push({
                            category,
                            key,
                            ...metadata
                        });
                    }
                }
            });
        });

        return updatable;
    }

    /**
     * Export current config for backup
     * @returns {object} Current configuration
     */
    static exportConfig() {
        return {
            version: ENHANCED_FINANCIAL_CONFIG._metadata.version,
            exported: new Date().toISOString(),
            constants: ENHANCED_FINANCIAL_CONFIG
        };
    }

    /**
     * Get constants that need research updates
     * @returns {Array} Constants that are due for review
     */
    static getConstantsNeedingUpdate() {
        const needsUpdate = [];
        const today = new Date();

        Object.keys(ENHANCED_FINANCIAL_CONFIG).forEach(category => {
            if (category.startsWith('_')) return;

            Object.keys(ENHANCED_FINANCIAL_CONFIG[category]).forEach(key => {
                const constant = ENHANCED_FINANCIAL_CONFIG[category][key];
                if (typeof constant === 'object' && constant.nextReview) {
                    const reviewDate = new Date(constant.nextReview);
                    if (reviewDate <= today) {
                        needsUpdate.push({
                            category,
                            key,
                            value: constant.value,
                            description: constant.description,
                            nextReview: constant.nextReview,
                            daysOverdue: Math.floor((today - reviewDate) / (1000 * 60 * 60 * 24))
                        });
                    }
                }
            });
        });

        return needsUpdate.sort((a, b) => b.daysOverdue - a.daysOverdue);
    }
}

// Export commonly used constants for backwards compatibility
export const RISK_FREE_RATE = ConfigHelper.riskFreeRate;
export const CORPORATE_TAX_RATE = ConfigHelper.corporateTaxRate;
export const CGT_DISCOUNT = ConfigHelper.cgtDiscount;
export const BOND_MULTIPLIER = ConfigHelper.bondMultiplier;
export const CASH_MULTIPLIER = ConfigHelper.cashMultiplier;
export const EQUITY_MULTIPLIER = ConfigHelper.equityMultiplier;