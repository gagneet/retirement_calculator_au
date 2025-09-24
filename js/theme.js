/**
 * Theme Management System
 * Handles light/dark mode toggle with smooth transitions and persistence
 */
class ThemeManager {
    constructor() {
        this.currentTheme = this.getStoredTheme() || this.getPreferredTheme();
        this.init();
    }

    /**
     * Initialize theme system
     */
    init() {
        // Apply theme immediately to prevent flash
        this.applyTheme(this.currentTheme);

        // Set up event listeners
        this.setupEventListeners();

        // Update button state
        this.updateToggleButton();

        // Listen for system theme changes
        this.watchSystemTheme();
    }

    /**
     * Get stored theme from localStorage
     */
    getStoredTheme() {
        return localStorage.getItem('retirement-calc-theme');
    }

    /**
     * Get user's system preference - Default to light mode
     */
    getPreferredTheme() {
        // Always default to light mode unless user explicitly stored a preference
        return 'light';
    }

    /**
     * Store theme preference
     */
    storeTheme(theme) {
        localStorage.setItem('retirement-calc-theme', theme);
    }

    /**
     * Apply theme to document
     */
    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);

        // Update Tailwind classes on body for compatibility
        if (theme === 'dark') {
            document.body.classList.remove('bg-gray-100', 'text-gray-800');
            document.body.classList.add('bg-gray-900', 'text-gray-100');
        } else {
            document.body.classList.remove('bg-gray-900', 'text-gray-100');
            document.body.classList.add('bg-gray-100', 'text-gray-800');
        }

        // Trigger custom event for other components
        document.dispatchEvent(new CustomEvent('themechange', {
            detail: { theme }
        }));
    }

    /**
     * Toggle between light and dark themes
     */
    toggleTheme() {
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.currentTheme = newTheme;
        this.applyTheme(newTheme);
        this.storeTheme(newTheme);
        this.updateToggleButton();

        // Add visual feedback
        this.addToggleFeedback();

        // Track theme toggle for analytics
        if (typeof gtag !== 'undefined') {
            gtag('event', 'theme_toggle', {
                'theme': newTheme,
                'event_category': 'UI'
            });
        }
    }

    /**
     * Update toggle button appearance
     */
    updateToggleButton() {
        const toggleButton = document.getElementById('themeToggle');
        const sunIcon = toggleButton?.querySelector('.sun-icon');
        const moonIcon = toggleButton?.querySelector('.moon-icon');

        if (!toggleButton) return;

        if (this.currentTheme === 'dark') {
            sunIcon.style.display = 'none';
            moonIcon.style.display = 'block';
            toggleButton.querySelector('.tooltiptext').textContent = 'Switch to Light Mode';
        } else {
            sunIcon.style.display = 'block';
            moonIcon.style.display = 'none';
            toggleButton.querySelector('.tooltiptext').textContent = 'Switch to Dark Mode';
        }
    }

    /**
     * Add visual feedback for theme toggle
     */
    addToggleFeedback() {
        const toggleButton = document.getElementById('themeToggle');
        if (!toggleButton) return;

        toggleButton.style.transform = 'scale(0.9)';
        toggleButton.style.transition = 'transform 0.1s ease';

        setTimeout(() => {
            toggleButton.style.transform = '';
            toggleButton.style.transition = '';
        }, 150);
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Theme toggle button
        const toggleButton = document.getElementById('themeToggle');
        if (toggleButton) {
            toggleButton.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleTheme();
            });

            // Keyboard support
            toggleButton.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.toggleTheme();
                }
            });
        }

        // Keyboard shortcut (Ctrl/Cmd + Shift + D)
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
                e.preventDefault();
                this.toggleTheme();
            }
        });
    }

    /**
     * Watch for system theme changes
     */
    watchSystemTheme() {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        mediaQuery.addEventListener('change', (e) => {
            // Only update if user hasn't manually set a preference
            if (!this.getStoredTheme()) {
                const newTheme = e.matches ? 'dark' : 'light';
                this.currentTheme = newTheme;
                this.applyTheme(newTheme);
                this.updateToggleButton();
            }
        });
    }

    /**
     * Get current theme
     */
    getCurrentTheme() {
        return this.currentTheme;
    }

    /**
     * Set theme programmatically
     */
    setTheme(theme) {
        if (theme !== 'light' && theme !== 'dark') {
            console.warn('Invalid theme:', theme);
            return;
        }

        this.currentTheme = theme;
        this.applyTheme(theme);
        this.storeTheme(theme);
        this.updateToggleButton();
    }
}

// Initialize theme manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.themeManager = new ThemeManager();
});

// Export for module usage
// if (typeof module !== 'undefined' && module.exports) {
//     module.exports = ThemeManager;
// }
export default ThemeManager;