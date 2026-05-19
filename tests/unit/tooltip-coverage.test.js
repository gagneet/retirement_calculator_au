const fs = require('fs');
const path = require('path');
const { TextEncoder, TextDecoder } = require('util');

global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

const { JSDOM } = require('jsdom');
const { ensureAdvancedFieldTooltips } = require('../../src/js/field-tooltips.js');

const loadPage = (relativePath) => {
    const html = fs.readFileSync(path.join(__dirname, '..', '..', relativePath), 'utf8');
    const dom = new JSDOM(html, { url: 'https://retirement.gagneet.com/' });

    global.window = dom.window;
    global.document = dom.window.document;
    Object.defineProperty(global, 'navigator', {
        configurable: true,
        value: dom.window.navigator,
    });

    return dom;
};

const tooltipTargets = (documentRef) =>
    Array.from(documentRef.querySelectorAll('label')).filter((label) =>
        label.hasAttribute('for') || label.querySelector('input[id], select[id], textarea[id]')
    );

const labelsMissingTooltip = (documentRef) =>
    tooltipTargets(documentRef).filter((label) => {
        const wrapper = label.closest('.label-with-tooltip') || label.parentElement;
        return !wrapper?.querySelector('.tooltip');
    });

describe('advanced page tooltip coverage', () => {
    let originalWindow;
    let originalDocument;
    let originalNavigator;

    beforeAll(() => {
        originalWindow = global.window;
        originalDocument = global.document;
        originalNavigator = global.navigator;
    });

    afterEach(() => {
        global.window?.close?.();
    });

    afterAll(() => {
        global.window = originalWindow;
        global.document = originalDocument;
        Object.defineProperty(global, 'navigator', {
            configurable: true,
            value: originalNavigator,
        });
    });

    test('advanced.html labels all expose a tooltip after initialization', () => {
        const dom = loadPage('src/advanced.html');

        ensureAdvancedFieldTooltips(dom.window.document);

        const missing = labelsMissingTooltip(dom.window.document)
            .map((label) => label.getAttribute('for'));

        expect(missing).toEqual([]);
    });

    test('advanced-v2.html labels all expose a tooltip after initialization', () => {
        const dom = loadPage('src/advanced-v2.html');

        ensureAdvancedFieldTooltips(dom.window.document);

        const missing = labelsMissingTooltip(dom.window.document)
            .map((label) => label.getAttribute('for'));

        expect(missing).toEqual([]);
    });
});
