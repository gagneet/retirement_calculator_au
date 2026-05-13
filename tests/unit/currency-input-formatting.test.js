import { addCurrencyFormatting } from '../../src/js/utils.js';

describe('currency input formatting', () => {
    test('keeps whole-dollar typing unformatted until blur', () => {
        document.body.innerHTML = '<input id="salary" type="text" value="555">';

        const input = document.getElementById('salary');
        addCurrencyFormatting(input);

        expect(input.value).toBe('$555.00');

        input.dispatchEvent(new Event('focus'));
        expect(input.value).toBe('555');

        input.value += '666';
        input.dispatchEvent(new Event('input', { bubbles: true }));

        expect(input.value).toBe('555666');

        input.dispatchEvent(new Event('blur'));
        expect(input.value).toBe('$555,666.00');
    });

    test('removes trailing zero decimals when entering edit mode', () => {
        document.body.innerHTML = '<input id="savings" type="text" value="1200">';

        const input = document.getElementById('savings');
        addCurrencyFormatting(input);

        expect(input.value).toBe('$1,200.00');

        input.dispatchEvent(new Event('focus'));

        expect(input.value).toBe('1200');
    });
});
