/**
 * Guards against legislated Age Pension parameters drifting out of sync.
 *
 * These figures are indexed by Services Australia 2-3 times a year (full-pension asset
 * thresholds on 1 July; part-pension cut-offs on 20 March and 20 September; income free
 * areas and deeming thresholds on 1 July). They were duplicated across five places and
 * had silently missed the 1 July 2026 indexation in four of them.
 *
 * config.js is the single source of truth. Every other copy must match it.
 */
const fs = require('fs');
const path = require('path');
const { ENHANCED_CONFIG: C } = require('../../src/js/config.js');

const root = path.resolve(__dirname, '../..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

/** Pull `KEY: 12345,` out of a source file. */
function literal(src, key) {
    const m = src.match(new RegExp(`\\b${key}:\\s*([0-9]+)`));
    return m ? Number(m[1]) : null;
}

describe('Age Pension constants are single-sourced from config.js', () => {
    // advanced-design-engine.js (Pipeline C) is copied verbatim by CopyPlugin and cannot
    // import config.js, so it carries a hand-maintained copy. It must still match.
    const designEngine = read('src/js/advanced-design-engine.js');

    test.each([
        ['SINGLE_ASSET_THRESHOLD', C.SINGLE_ASSET_THRESHOLD],
        ['SINGLE_ASSET_LIMIT', C.SINGLE_ASSET_LIMIT],
        ['SINGLE_ASSET_THRESHOLD_NON_HOMEOWNER', C.SINGLE_ASSET_THRESHOLD_NON_HOMEOWNER],
        ['SINGLE_ASSET_LIMIT_NON_HOMEOWNER', C.SINGLE_ASSET_LIMIT_NON_HOMEOWNER],
        ['COUPLE_ASSET_THRESHOLD', C.COUPLE_ASSET_THRESHOLD],
        ['COUPLE_ASSET_LIMIT', C.COUPLE_ASSET_LIMIT],
        ['COUPLE_ASSET_THRESHOLD_NON_HOMEOWNER', C.COUPLE_ASSET_THRESHOLD_NON_HOMEOWNER],
        ['COUPLE_ASSET_LIMIT_NON_HOMEOWNER', C.COUPLE_ASSET_LIMIT_NON_HOMEOWNER],
    ])('advanced-design-engine.js %s matches config', (key, expected) => {
        expect(literal(designEngine, key)).toBe(expected);
    });

    test('advanced-design-engine.js deeming thresholds match config', () => {
        expect(literal(designEngine, 'DEEMING_THRESHOLD_SINGLE')).toBe(C.DEMING_THRESHOLD_SINGLE);
        expect(literal(designEngine, 'DEEMING_THRESHOLD_COUPLE')).toBe(C.DEMING_THRESHOLD_COUPLE);
    });

    test('non-homeowner supplement is consistent across all four asset figures', () => {
        const supp = C.NON_HOMEOWNER_ASSET_SUPPLEMENT;
        expect(C.SINGLE_ASSET_THRESHOLD_NON_HOMEOWNER - C.SINGLE_ASSET_THRESHOLD).toBe(supp);
        expect(C.SINGLE_ASSET_LIMIT_NON_HOMEOWNER - C.SINGLE_ASSET_LIMIT).toBe(supp);
        expect(C.COUPLE_ASSET_THRESHOLD_NON_HOMEOWNER - C.COUPLE_ASSET_THRESHOLD).toBe(supp);
        expect(C.COUPLE_ASSET_LIMIT_NON_HOMEOWNER - C.COUPLE_ASSET_LIMIT).toBe(supp);
    });

    test('no controller hardcodes an income-test free area', () => {
        // These were `household === "couple" ? 380 : 212` — both stale, and 212 was never
        // a real Services Australia figure.
        ['src/js/advanced-v2.js', 'src/js/retirement-v3.js'].forEach((f) => {
            const src = read(f);
            expect(src).not.toMatch(/pensionIncomeThreshold:\s*num\([^)]*\?\s*\d+\s*:\s*\d+/);
            expect(src).toMatch(/pensionIncomeThreshold:[\s\S]{0,160}ENHANCED_CONFIG\.COUPLE_INCOME_THRESHOLD/);
        });
    });

    test('HTML pension defaults match config (they are the pre-JS paint)', () => {
        [['src/retirement.html', 'couple'], ['src/advanced-v2.html', 'couple']].forEach(([f]) => {
            const src = read(f);
            const thr = src.match(/id="pensionAssetThreshold"[^>]*value="(\d+)"/);
            const cut = src.match(/id="pensionAssetCutoff"[^>]*value="(\d+)"/);
            expect(Number(thr[1])).toBe(C.COUPLE_ASSET_THRESHOLD);
            expect(Number(cut[1])).toBe(C.COUPLE_ASSET_LIMIT);
        });
    });

    test('policy effective date is recorded and parseable', () => {
        expect(C.POLICY_EFFECTIVE_DATE).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(Number.isNaN(Date.parse(C.POLICY_EFFECTIVE_DATE))).toBe(false);
    });
});
