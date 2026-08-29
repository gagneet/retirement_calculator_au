/**
 * @file Shared Google Analytics loader.
 * @description Loads the GA4 gtag script for every bundled page from a single place.
 *
 * Previously each page carried its own ~60-line inline <script> copy of this loader,
 * which meant new calculator pages (advanced-v2, retirement v3, reverse, comparison)
 * silently shipped with no analytics at all. Importing this module from a webpack
 * entry point is now the only thing a page needs to do.
 *
 * The loader is deliberately failure-tolerant: privacy tools and ad blockers routinely
 * block googletagmanager.com, and that must never break the calculator.
 */

export const GA_MEASUREMENT_ID = 'G-F3BXKGK3QZ';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 30000;
const LOAD_TIMEOUT_MS = 8000;

let retryCount = 0;
let started = false;

/**
 * Load Google Analytics once per page.
 * Safe to call multiple times — subsequent calls are no-ops.
 *
 * @param {string} [measurementId] - GA4 measurement ID.
 * @returns {void}
 */
export function initGoogleAnalytics(measurementId = GA_MEASUREMENT_ID) {
    if (started) return;
    // A page that still carries the legacy inline snippet will already have a
    // dataLayer/gtag in flight; do not double-configure the same property.
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    // Never load analytics under Jest — the script never resolves in jsdom, which would
    // leave the 8s timeout and 30s retry timers dangling as open handles.
    if (typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'test') return;
    if (typeof window.gtag === 'function') {
        started = true;
        return;
    }
    started = true;
    load(measurementId);
}

function scheduleRetry(measurementId) {
    if (retryCount >= MAX_RETRIES) return;
    retryCount += 1;
    setTimeout(() => load(measurementId), RETRY_DELAY_MS);
}

function load(measurementId) {
    try {
        const script = document.createElement('script');
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;

        const loadTimeout = setTimeout(() => {
            if (!window.gtag || !window.dataLayer) scheduleRetry(measurementId);
        }, LOAD_TIMEOUT_MS);

        script.onload = () => {
            clearTimeout(loadTimeout);
            window.dataLayer = window.dataLayer || [];
            function gtag() { window.dataLayer.push(arguments); }
            window.gtag = gtag;
            gtag('js', new Date());
            gtag('config', measurementId);
        };

        script.onerror = () => {
            clearTimeout(loadTimeout);
            scheduleRetry(measurementId);
        };

        document.head.appendChild(script);
    } catch {
        scheduleRetry(measurementId);
    }
}

export default { initGoogleAnalytics, GA_MEASUREMENT_ID };
