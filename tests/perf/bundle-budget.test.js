/**
 * Bundle-size budgets for the built assets.
 *
 * Every entry point used to inline its own copy of the shared engine layer, so each
 * calculator shipped ~650KB-1.1MB and nothing was shared between pages. optimization
 * .splitChunks now extracts the common modules; these budgets stop that regressing.
 *
 * Requires `npm run build` first. Skips (rather than fails) when dist/ is absent so a
 * clean checkout running `npm run test:perf` is not blocked by a missing build.
 */
const fs = require('fs');
const path = require('path');

const dist = path.resolve(__dirname, '../../dist');
const hasBuild = fs.existsSync(dist) && fs.readdirSync(dist).some((f) => /^runtime\..*\.js$/.test(f));
const d = hasBuild ? describe : describe.skip;

const sizeKb = (pattern) => {
    const file = fs.readdirSync(dist).find((f) => pattern.test(f));
    if (!file) throw new Error(`No built asset matching ${pattern}`);
    return fs.statSync(path.join(dist, file)).size / 1024;
};

d('built bundle budgets', () => {
    // Per-page entry chunks. These are the bytes unique to each calculator; the shared
    // chunk is downloaded once and then served from cache on every other page.
    test.each([
        ['retirementV3', /^retirementV3\..*\.js$/, 260],
        ['advancedV2', /^advancedV2\..*\.js$/, 260],
        ['reverseV1', /^reverseV1\..*\.js$/, 200],
        ['comparison', /^comparison\..*\.js$/, 120],
    ])('%s entry chunk stays under %dKB', (name, pattern, budget) => {
        const kb = sizeKb(pattern);
        console.log(`  ${name}: ${kb.toFixed(0)}KB (budget ${budget}KB)`);
        expect(kb).toBeLessThan(budget);
    });

    test('shared chunk exists and is shared, not duplicated', () => {
        const kb = sizeKb(/^shared\..*\.js$/);
        console.log(`  shared: ${kb.toFixed(0)}KB`);
        expect(kb).toBeGreaterThan(100);   // it really is carrying the common engine layer
        expect(kb).toBeLessThan(700);
    });

    test('runtime chunk is tiny so hashes stay stable', () => {
        expect(sizeKb(/^runtime\..*\.js$/)).toBeLessThan(20);
    });

    test('main (index + advanced classic) is budgeted while app.js is still monolithic', () => {
        // app.js is a single ~633KB module; splitting it needs a source refactor, so this
        // budget is deliberately loose and should be tightened once that lands.
        const kb = sizeKb(/^main\..*\.js$/);
        console.log(`  main: ${kb.toFixed(0)}KB`);
        expect(kb).toBeLessThan(800);
    });
});
