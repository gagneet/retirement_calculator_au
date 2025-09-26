// Trust UI Handler - Manages trust-related UI interactions
// This module handles showing/hiding trust sections and updating UI based on trust inputs

export function initializeTrustUI() {
    const hasTrustAssetsCheckbox = document.getElementById('hasTrustAssets');
    const trustAssetsSection = document.getElementById('trustAssetsSection');
    const trustControlLevel = document.getElementById('trustControlLevel');
    const trustAttributionPercentage = document.getElementById('trustAttributionPercentage');

    // Show/hide trust section based on checkbox
    if (hasTrustAssetsCheckbox && trustAssetsSection) {
        hasTrustAssetsCheckbox.addEventListener('change', function() {
            if (this.checked) {
                trustAssetsSection.classList.remove('hidden');
            } else {
                trustAssetsSection.classList.add('hidden');
            }
        });
    }

    // Update attribution percentage based on control level
    if (trustControlLevel && trustAttributionPercentage) {
        trustControlLevel.addEventListener('change', function() {
            const controlLevel = this.value;
            const suggestedPercentages = {
                'high': 100,
                'medium': 75,
                'low': 50,
                'none': 0
            };

            if (suggestedPercentages[controlLevel] !== undefined) {
                trustAttributionPercentage.value = suggestedPercentages[controlLevel];

                // Show tooltip explaining the change
                showTrustTooltip(trustAttributionPercentage,
                    `Attribution updated to ${suggestedPercentages[controlLevel]}% based on ${controlLevel} control level`);
            }
        });
    }

    // Add event listeners for trust warnings
    const homeInTrustCheckbox = document.getElementById('homeInTrust');
    if (homeInTrustCheckbox) {
        homeInTrustCheckbox.addEventListener('change', function() {
            if (this.checked) {
                showTrustWarning('homeWarning',
                    '⚠️ Principal residence in trust may lose Age Pension asset test exemption');
            } else {
                hideTrustWarning('homeWarning');
            }
        });
    }
}

function showTrustTooltip(element, message) {
    // Create or update tooltip
    let tooltip = element.nextElementSibling;
    if (!tooltip || !tooltip.classList.contains('trust-tooltip')) {
        tooltip = document.createElement('div');
        tooltip.className = 'trust-tooltip mt-1 p-2 bg-blue-100 text-blue-800 text-xs rounded';
        element.parentNode.insertBefore(tooltip, element.nextSibling);
    }

    tooltip.textContent = message;
    tooltip.style.display = 'block';

    // Hide after 3 seconds
    setTimeout(() => {
        tooltip.style.display = 'none';
    }, 3000);
}

function showTrustWarning(id, message) {
    let warning = document.getElementById(id);
    if (!warning) {
        warning = document.createElement('div');
        warning.id = id;
        warning.className = 'mt-2 p-2 bg-yellow-50 border border-yellow-200 text-yellow-800 text-xs rounded';

        // Insert after the home in trust checkbox
        const homeCheckbox = document.getElementById('homeInTrust');
        if (homeCheckbox && homeCheckbox.parentNode) {
            homeCheckbox.parentNode.insertBefore(warning, homeCheckbox.nextSibling);
        }
    }
    warning.textContent = message;
    warning.style.display = 'block';
}

function hideTrustWarning(id) {
    const warning = document.getElementById(id);
    if (warning) {
        warning.style.display = 'none';
    }
}

// Export utility functions for use in main app
export function getTrustInputsFromDOM() {
    return {
        hasTrustAssets: document.getElementById('hasTrustAssets')?.checked || false,
        trustType: document.getElementById('trustType')?.value || 'discretionary',
        trustControlLevel: document.getElementById('trustControlLevel')?.value || 'high',
        trustNetAssets: parseFloat(document.getElementById('trustNetAssets')?.value || 0),
        trustAttributionPercentage: parseFloat(document.getElementById('trustAttributionPercentage')?.value || 100),
        trustAnnualDistributions: parseFloat(document.getElementById('trustAnnualDistributions')?.value || 0),
        homeInTrust: document.getElementById('homeInTrust')?.checked || false,
        investmentPropertyInTrust: document.getElementById('investmentPropertyInTrust')?.checked || false,
        stocksInTrust: document.getElementById('stocksInTrust')?.checked || false
    };
}

export function setTrustInputsInDOM(trustInputs) {
    const fields = {
        'hasTrustAssets': 'checked',
        'trustType': 'value',
        'trustControlLevel': 'value',
        'trustNetAssets': 'value',
        'trustAttributionPercentage': 'value',
        'trustAnnualDistributions': 'value',
        'homeInTrust': 'checked',
        'investmentPropertyInTrust': 'checked',
        'stocksInTrust': 'checked'
    };

    for (const [fieldId, property] of Object.entries(fields)) {
        const element = document.getElementById(fieldId);
        if (element && trustInputs[fieldId] !== undefined) {
            if (property === 'checked') {
                element.checked = trustInputs[fieldId];
            } else {
                element.value = trustInputs[fieldId];
            }
        }
    }

    // Trigger change event for hasTrustAssets to show/hide section
    const hasTrustAssetsCheckbox = document.getElementById('hasTrustAssets');
    if (hasTrustAssetsCheckbox) {
        hasTrustAssetsCheckbox.dispatchEvent(new Event('change'));
    }
}

export default {
    initializeTrustUI,
    getTrustInputsFromDOM,
    setTrustInputsInDOM
};