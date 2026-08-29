/**
 * Correctness guards for the readInputs() memoisation in retirement-v3.js.
 *
 * The memo makes computeBaseState() ~5x faster by serving all nine syncAppState() call
 * sites from one form read. That is only safe while invalidation is airtight, so these
 * tests exist to catch a regression that would silently project stale inputs — a much
 * worse failure than the slowness the memo removes.
 */
import fs from 'fs';
import path from 'path';

const html = fs.readFileSync(path.resolve(__dirname, '../../src/retirement.html'), 'utf8');
document.body.innerHTML = (html.match(/<body[^>]*>([\s\S]*)<\/body>/i) || [, html])[1];

const v3 = require('../../src/js/retirement-v3.js');

const setField = (id, value) => {
    const node = document.getElementById(id);
    node.value = String(value);
    return node;
};
const edit = (id, value) => {
    setField(id, value).dispatchEvent(new Event('input', { bubbles: true }));
};

describe('readInputs memoisation', () => {
    test('a user edit is always reflected in the next projection', () => {
        edit('desiredIncome', 80000);
        expect(v3.computeBaseState().input.desiredIncome).toBe(80000);

        edit('desiredIncome', 120000);
        expect(v3.computeBaseState().input.desiredIncome).toBe(120000);
    });

    test('change events on selects invalidate too', () => {
        const node = document.getElementById('spendingStrategy');
        node.value = 'go_go_slow_go_no_go';
        node.dispatchEvent(new Event('change', { bubbles: true }));
        expect(v3.computeBaseState().input.spendingStrategy).toBe('go_go_slow_go_no_go');
    });

    test('the delegated listener is installed at module scope, not during boot', () => {
        // boot() never runs in this suite. If tracking were installed inside boot(), the
        // edits above would have been served from a permanently stale memo.
        edit('age', 51);
        expect(v3.computeBaseState().input.age).toBe(51);
    });

    test('repeat reads with an untouched form return the identical object', () => {
        edit('age', 52);
        const first = v3.computeBaseState().input;
        const second = v3.computeBaseState().input;
        expect(second).toBe(first); // same reference => the memo served it
    });

    test('checkbox toggles invalidate the memo', () => {
        const box = document.getElementById('goingOverseas');
        const before = v3.computeBaseState().input.goingOverseas;
        box.checked = !before;
        box.dispatchEvent(new Event('change', { bubbles: true }));
        expect(v3.computeBaseState().input.goingOverseas).toBe(!before);
    });
});
