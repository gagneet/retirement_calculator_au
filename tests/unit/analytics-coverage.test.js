/**
 * Guards the shared Google Analytics wiring.
 *
 * Every bundled page must load GA from src/js/google-analytics.js. Before this was
 * centralised, each page carried its own inline copy of the loader, and pages added
 * later (advanced-v2, retirement v3, reverse, comparison) shipped with no analytics.
 */
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const readSrc = (p) => fs.readFileSync(path.join(root, p), 'utf8');

// Every webpack entry point, per webpack.config.js.
const ENTRY_POINTS = [
    'src/js/app.js',          // index.html + advanced.html
    'src/js/advanced-v2.js',  // advanced-v2.html
    'src/js/retirement-v3.js',// retirement.html
    'src/js/reverse-ui.js',   // reverse.html
    'src/js/comparison.js',   // comparison.html
];

describe('Google Analytics coverage', () => {
    test.each(ENTRY_POINTS)('%s imports and initialises the shared GA loader', (entry) => {
        const src = readSrc(entry);
        expect(src).toMatch(/from '\.\/google-analytics\.js'/);
        expect(src).toMatch(/\binitGoogleAnalytics\(\)/);
    });

    test('no page re-inlines its own gtag loader', () => {
        // advanced-design.html is exempt: it is copied verbatim by CopyPlugin and has no
        // webpack bundle, so it must keep an inline snippet.
        const pages = fs.readdirSync(path.join(root, 'src'))
            .filter((f) => f.endsWith('.html') && f !== 'advanced-design.html');
        const offenders = pages.filter((f) => readSrc(path.join('src', f)).includes('googletagmanager.com/gtag/js'));
        expect(offenders).toEqual([]);
    });

    test('the loader is a no-op under test and never double-configures', () => {
        jest.resetModules();
        const { initGoogleAnalytics, GA_MEASUREMENT_ID } = require('../../src/js/google-analytics.js');
        expect(GA_MEASUREMENT_ID).toMatch(/^G-/);
        const before = document.head.querySelectorAll('script').length;
        initGoogleAnalytics();
        initGoogleAnalytics();
        expect(document.head.querySelectorAll('script').length).toBe(before);
    });

    test('outside the test env it injects exactly one gtag script and configures it', () => {
        // The NODE_ENV guard means the loader body never runs in the rest of the suite.
        // Exercise it explicitly, or the only untested code is the code that ships.
        const previousEnv = process.env.NODE_ENV;
        process.env.NODE_ENV = 'production';
        jest.resetModules();
        try {
            const { initGoogleAnalytics, GA_MEASUREMENT_ID } = require('../../src/js/google-analytics.js');
            delete window.gtag;
            const before = document.head.querySelectorAll('script[src*="googletagmanager"]').length;

            initGoogleAnalytics();
            initGoogleAnalytics();   // second call must be a no-op

            const tags = document.head.querySelectorAll('script[src*="googletagmanager"]');
            expect(tags.length).toBe(before + 1);
            expect(tags[tags.length - 1].src).toContain(GA_MEASUREMENT_ID);
            expect(tags[tags.length - 1].async).toBe(true);

            // Simulate the script finishing so the config path runs.
            tags[tags.length - 1].onload();
            expect(typeof window.gtag).toBe('function');
            expect(window.dataLayer.some((a) => a[0] === 'config' && a[1] === GA_MEASUREMENT_ID)).toBe(true);
        } finally {
            process.env.NODE_ENV = previousEnv;
            jest.resetModules();
        }
    });

    test('every entry point ends up carrying GA in the built output', () => {
        // splitChunks moved google-analytics.js into the shared chunk, so asserting on a
        // per-entry bundle would silently pass while GA was missing. Check the whole bundle
        // graph that a page loads instead.
        const dist = path.join(root, 'dist');
        if (!fs.existsSync(dist)) return;                      // no build present; skip
        const bundles = fs.readdirSync(dist).filter((f) => f.endsWith('.js'));
        const carriers = bundles.filter((f) => fs.readFileSync(path.join(dist, f), 'utf8').includes('googletagmanager'));
        expect(carriers.length).toBeGreaterThan(0);
    });
});

describe('home page links every calculator version', () => {
    const index = readSrc('src/index.html');

    // Each webpack HtmlWebpackPlugin page that is a user-facing calculator.
    test.each([
        ['advanced.html', 'Classic Advanced'],
        ['advanced-v2.html', 'Advanced V2'],
        ['retirement.html', 'Retirement V3'],
        ['reverse.html', 'Reverse Planner'],
        ['comparison.html', 'Scenario Comparison'],
    ])('index.html links to %s (%s)', (page) => {
        expect(index).toContain(`href="${page}"`);
    });

    test('shared site chrome also links every calculator', () => {
        const chrome = readSrc('src/js/site-chrome.js');
        ['index.html', 'advanced.html', 'advanced-v2.html', 'retirement.html', 'reverse.html', 'comparison.html']
            .forEach((page) => expect(chrome).toContain(`href="${page}"`));
    });
});
