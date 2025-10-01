// src/js/version-manager.js

import { ENHANCED_CONFIG as config_v1_0_0 } from './config.js';
import { ENHANCED_CONFIG_V0_9_0 } from './config-v0.9.0.js';

const versions = {
    '1.0.0': {
        date: '2025-09-30',
        config: config_v1_0_0,
        changelog: 'Initial Release with enhanced modeling.'
    },
    '0.9.0': {
        date: '2023-01-01',
        config: ENHANCED_CONFIG_V0_9_0,
        changelog: 'Historical assumptions from early 2023.'
    }
};

const LATEST_VERSION = '1.0.0';

/**
 * Retrieves the configuration for a specific version, merging with the latest for completeness.
 * @param {string} version - The version string (e.g., '1.0.0').
 * @returns {object|null} The configuration object for the specified version, or null if not found.
 */
export function getConfigByVersion(version) {
    const versionData = versions[version];
    if (!versionData) {
        return null;
    }

    // Deep merge the version-specific config with the latest config to ensure all properties are present
    const latestConfig = versions[LATEST_VERSION].config;
    const versionConfig = versionData.config;

    // A simple deep merge function
    const mergeDeep = (target, source) => {
        const output = { ...target };
        if (isObject(target) && isObject(source)) {
            Object.keys(source).forEach(key => {
                if (isObject(source[key])) {
                    if (!(key in target)) {
                        Object.assign(output, { [key]: source[key] });
                    } else {
                        output[key] = mergeDeep(target[key], source[key]);
                    }
                } else {
                    Object.assign(output, { [key]: source[key] });
                }
            });
        }
        return output;
    };

    const isObject = (item) => {
        return (item && typeof item === 'object' && !Array.isArray(item));
    };

    return mergeDeep(latestConfig, versionConfig);
}

/**
 * Retrieves the configuration for the latest version.
 * @returns {object} The latest configuration object.
 */
export function getLatestConfig() {
    return versions[LATEST_VERSION].config;
}

/**
 * Retrieves the list of all available version numbers.
 * @returns {string[]} An array of version strings.
 */
export function getAvailableVersions() {
    return Object.keys(versions).sort().reverse();
}

/**
 * Retrieves the details for a specific version.
 * @param {string} version - The version string.
 * @returns {object|null} An object containing the date and changelog for the version, or null if not found.
 */
export function getVersionDetails(version) {
    if (!versions[version]) {
        return null;
    }
    const { date, changelog } = versions[version];
    return { date, changelog };
}

export default {
    getConfigByVersion,
    getLatestConfig,
    getAvailableVersions,
    getVersionDetails,
    LATEST_VERSION
};