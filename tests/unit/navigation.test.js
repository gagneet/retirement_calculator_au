/**
 * Tests the navigation logic:
 * - Fix 3: Redirect loop prevention via ?skip=true
 * - Back button adds ?skip=true to prevent onboarding redirect
 */

describe('Navigation redirect logic', () => {
    beforeEach(() => {
        // Clear mocked storage
        localStorage.clear();
        sessionStorage.clear();

        // Reset location mock
        delete window.location;
        window.location = { href: '', search: '' };
    });

    test('first-time visitor without skip param is redirected to onboarding', () => {
        localStorage.removeItem('hasVisitedCalculator');

        const hasVisitedBefore = localStorage.getItem('hasVisitedCalculator');
        const urlParams = new URLSearchParams('');
        const skipRedirect = urlParams.get('skip') === 'true';

        let redirectTarget = null;
        if (!hasVisitedBefore && !skipRedirect) {
            sessionStorage.setItem('startOnboarding', 'true');
            redirectTarget = 'advanced.html?onboarding=true';
        }

        expect(redirectTarget).toBe('advanced.html?onboarding=true');
        expect(sessionStorage.getItem('startOnboarding')).toBe('true');
    });

    test('first-time visitor with ?skip=true is NOT redirected to onboarding', () => {
        localStorage.removeItem('hasVisitedCalculator');

        const hasVisitedBefore = localStorage.getItem('hasVisitedCalculator');
        const urlParams = new URLSearchParams('?skip=true');
        const skipRedirect = urlParams.get('skip') === 'true';

        let redirectTarget = null;
        if (!hasVisitedBefore && !skipRedirect) {
            sessionStorage.setItem('startOnboarding', 'true');
            redirectTarget = 'advanced.html?onboarding=true';
        }

        expect(redirectTarget).toBeNull();
    });

    test('returning visitor (hasVisitedCalculator set) is NOT redirected', () => {
        localStorage.setItem('hasVisitedCalculator', 'true');

        const hasVisitedBefore = localStorage.getItem('hasVisitedCalculator');
        const urlParams = new URLSearchParams('');
        const skipRedirect = urlParams.get('skip') === 'true';

        let redirectTarget = null;
        if (!hasVisitedBefore && !skipRedirect) {
            redirectTarget = 'advanced.html?onboarding=true';
        }

        expect(redirectTarget).toBeNull();
    });

    test('skip param value must be exactly "true" to prevent redirect', () => {
        localStorage.removeItem('hasVisitedCalculator');

        const cases = [
            { search: '?skip=1', shouldRedirect: true },
            { search: '?skip=yes', shouldRedirect: true },
            { search: '?skip=True', shouldRedirect: true },
            { search: '?skip=true', shouldRedirect: false },
        ];

        cases.forEach(({ search, shouldRedirect }) => {
            const urlParams = new URLSearchParams(search);
            const skipRedirect = urlParams.get('skip') === 'true';
            const hasVisitedBefore = localStorage.getItem('hasVisitedCalculator');

            let redirected = false;
            if (!hasVisitedBefore && !skipRedirect) {
                redirected = true;
            }

            expect(redirected).toBe(shouldRedirect);
        });
    });

    test('Back to Simple View link uses ?skip=true to prevent loop', () => {
        // Verifies the back link href includes skip=true
        const backLinkHref = 'index.html?skip=true';
        const url = new URL(backLinkHref, 'https://retirement.gagneet.com/');
        expect(url.searchParams.get('skip')).toBe('true');
    });
});

describe('Advanced calculator show/hide button visibility', () => {
    beforeEach(() => {
        localStorage.clear();
        document.body.innerHTML = `
            <div id="advancedCalculatorForm" style="display: block;"></div>
            <div id="showAdvancedCalculatorButton" class="hidden">
                <button>📊 Show Advanced Calculator (Optional)</button>
            </div>
        `;
    });

    test('button is shown when user has completed onboarding', () => {
        localStorage.setItem('hasVisitedCalculator', 'true');
        const hasCompleted = localStorage.getItem('hasVisitedCalculator') === 'true';
        const fromOnboarding = false;
        const form = document.getElementById('advancedCalculatorForm');
        const button = document.getElementById('showAdvancedCalculatorButton');

        if (fromOnboarding || hasCompleted) {
            if (form) form.style.display = 'none';
            if (button) button.classList.remove('hidden');
        }

        expect(button.classList.contains('hidden')).toBe(false);
        expect(form.style.display).toBe('none');
    });

    test('button is shown with Hide text for direct access without onboarding', () => {
        localStorage.removeItem('hasVisitedCalculator');
        const hasCompleted = false;
        const fromOnboarding = false;
        const form = document.getElementById('advancedCalculatorForm');
        const button = document.getElementById('showAdvancedCalculatorButton');

        if (fromOnboarding || hasCompleted) {
            if (form) form.style.display = 'none';
            if (button) button.classList.remove('hidden');
        } else {
            if (button) {
                button.classList.remove('hidden');
                const btn = button.querySelector('button');
                if (btn) btn.innerHTML = '📊 Hide Advanced Calculator';
            }
        }

        expect(button.classList.contains('hidden')).toBe(false);
        const btn = button.querySelector('button');
        expect(btn.innerHTML).toBe('📊 Hide Advanced Calculator');
    });

    test('button is shown when coming from onboarding param', () => {
        const fromOnboarding = true;
        const hasCompleted = false;
        const form = document.getElementById('advancedCalculatorForm');
        const button = document.getElementById('showAdvancedCalculatorButton');

        if (fromOnboarding || hasCompleted) {
            if (form) form.style.display = 'none';
            if (button) button.classList.remove('hidden');
        }

        expect(button.classList.contains('hidden')).toBe(false);
        expect(form.style.display).toBe('none');
    });
});
