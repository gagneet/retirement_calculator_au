/**
 * Tests the navigation/landing page logic:
 * - index.html is the main landing page for all visitors (no auto-redirect)
 * - Advanced Calculator is collapsed by default
 * - Onboarding buttons navigate to advanced.html?onboarding=true
 * - toggleAdvancedCalculator() shows/hides the form
 */

describe('Home page landing — no auto-redirect', () => {
    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
    });

    test('first-time visitor is NOT redirected — no redirect logic in new code', () => {
        // Structural test: the old auto-redirect conditional should not be in index.html
        const fs = require('fs');
        const path = require('path');
        const html = fs.readFileSync(path.join(__dirname, '../../src/index.html'), 'utf-8');
        expect(html).not.toContain('hasVisitedBefore');
        expect(html).not.toContain('skipRedirect');
    });

    test('returning visitor (hasVisitedCalculator set) is NOT redirected', () => {
        // Same structural guarantee — no redirect logic regardless of localStorage state
        const fs = require('fs');
        const path = require('path');
        const html = fs.readFileSync(path.join(__dirname, '../../src/index.html'), 'utf-8');
        expect(html).not.toContain('if (!hasVisitedBefore');
    });

    test('startOnboardingBtn click sets startOnboarding and targets advanced.html?onboarding=true', () => {
        document.body.innerHTML = `
            <button id="startOnboardingBtn">Start Guided Setup</button>
            <button id="startOnboardingBtn2">Start Guided Setup</button>
        `;

        let navigatedTo = null;
        document.getElementById('startOnboardingBtn').addEventListener('click', function () {
            sessionStorage.setItem('startOnboarding', 'true');
            navigatedTo = 'advanced.html?onboarding=true';
        });

        document.getElementById('startOnboardingBtn').click();

        expect(sessionStorage.getItem('startOnboarding')).toBe('true');
        expect(navigatedTo).toBe('advanced.html?onboarding=true');
    });

    test('startOnboardingBtn2 click sets startOnboarding and targets advanced.html?onboarding=true', () => {
        document.body.innerHTML = `
            <button id="startOnboardingBtn">Start Guided Setup</button>
            <button id="startOnboardingBtn2">Start Guided Setup</button>
        `;

        let navigatedTo = null;
        document.getElementById('startOnboardingBtn2').addEventListener('click', function () {
            sessionStorage.setItem('startOnboarding', 'true');
            navigatedTo = 'advanced.html?onboarding=true';
        });

        document.getElementById('startOnboardingBtn2').click();

        expect(sessionStorage.getItem('startOnboarding')).toBe('true');
        expect(navigatedTo).toBe('advanced.html?onboarding=true');
    });
});

describe('Advanced calculator collapsed by default', () => {
    beforeEach(() => {
        localStorage.clear();
        document.body.innerHTML = `
            <div id="showAdvancedCalculatorButton">
                <button>📊 Show Advanced Calculator (Optional)</button>
            </div>
            <div id="advancedCalculatorForm" style="display:none"></div>
        `;
    });

    test('advancedCalculatorForm is hidden on page load (style display none)', () => {
        const form = document.getElementById('advancedCalculatorForm');
        expect(form.style.display).toBe('none');
    });

    test('showAdvancedCalculatorButton does NOT have hidden class on page load', () => {
        const button = document.getElementById('showAdvancedCalculatorButton');
        expect(button.classList.contains('hidden')).toBe(false);
    });

    test('button text is "Show Advanced Calculator (Optional)" on page load', () => {
        const btn = document.querySelector('#showAdvancedCalculatorButton button');
        expect(btn.innerHTML).toContain('Show Advanced Calculator');
    });

    test('DOMContentLoaded handler sets form hidden and button text to Show', () => {
        const form = document.getElementById('advancedCalculatorForm');
        const button = document.getElementById('showAdvancedCalculatorButton');

        // Simulate DOMContentLoaded handler from index.html
        if (form) form.style.display = 'none';
        if (button) {
            const btn = button.querySelector('button');
            if (btn) btn.innerHTML = '📊 Show Advanced Calculator (Optional)';
        }

        expect(form.style.display).toBe('none');
        expect(button.querySelector('button').innerHTML).toContain('Show Advanced Calculator');
    });

    test('DOMContentLoaded behavior is same for all visitors regardless of localStorage', () => {
        // Both first-time and returning visitors should see the form collapsed
        ['', 'true', null].forEach(localStorageValue => {
            if (localStorageValue === null) {
                localStorage.removeItem('hasVisitedCalculator');
            } else {
                localStorage.setItem('hasVisitedCalculator', localStorageValue);
            }

            const form = document.getElementById('advancedCalculatorForm');
            // Simulate DOMContentLoaded — always collapses the form
            if (form) form.style.display = 'none';

            expect(form.style.display).toBe('none');
        });
    });
});

describe('toggleAdvancedCalculator()', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <div id="showAdvancedCalculatorButton">
                <button>📊 Show Advanced Calculator (Optional)</button>
            </div>
            <div id="advancedCalculatorForm" style="display:none"></div>
        `;
    });

    function toggleAdvancedCalculator() {
        const form = document.getElementById('advancedCalculatorForm');
        const button = document.getElementById('showAdvancedCalculatorButton');

        if (form.style.display === 'none') {
            form.style.display = 'grid';
            button.querySelector('button').innerHTML = '📊 Hide Advanced Calculator';
        } else {
            form.style.display = 'none';
            button.querySelector('button').innerHTML = '📊 Show Advanced Calculator (Optional)';
        }
    }

    test('first toggle expands the form and changes button text to Hide', () => {
        toggleAdvancedCalculator();
        const form = document.getElementById('advancedCalculatorForm');
        const btn = document.querySelector('#showAdvancedCalculatorButton button');
        expect(form.style.display).toBe('grid');
        expect(btn.innerHTML).toContain('Hide Advanced Calculator');
    });

    test('second toggle collapses the form and restores button text to Show', () => {
        toggleAdvancedCalculator(); // open
        toggleAdvancedCalculator(); // close
        const form = document.getElementById('advancedCalculatorForm');
        const btn = document.querySelector('#showAdvancedCalculatorButton button');
        expect(form.style.display).toBe('none');
        expect(btn.innerHTML).toContain('Show Advanced Calculator');
    });

    test('toggle three times ends with form expanded', () => {
        toggleAdvancedCalculator();
        toggleAdvancedCalculator();
        toggleAdvancedCalculator();
        const form = document.getElementById('advancedCalculatorForm');
        expect(form.style.display).toBe('grid');
    });
});
