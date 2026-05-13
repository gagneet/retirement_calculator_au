import RetirementCalculatorApp from '../../src/js/app.js';
import { ENHANCED_CONFIG } from '../../src/js/config.js';

describe('allocation UI wiring', () => {
    test('initializes and refreshes recommended allocation without custom allocation UI', () => {
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

        try {
            document.body.innerHTML = `
                <input id="useGlidePath" type="checkbox" checked>
                <input id="yourCurrentAge" value="45">
                <select id="glidePathRule">
                    <option value="110minus" selected>110 - Age</option>
                    <option value="120minus">120 - Age</option>
                </select>
                <div id="recommendedAllocation">Calculating...</div>
            `;

            const app = Object.create(RetirementCalculatorApp.prototype);
            app.config = ENHANCED_CONFIG;
            app.simulator = {
                calculateDynamicAllocation: jest.fn((age, rule) => {
                    if (rule === '120minus') {
                        return { equity: 75, bonds: 15, cash: 10 };
                    }
                    return { equity: 65, bonds: 25, cash: 10 };
                }),
            };

            app.setupExportDropdowns();

            expect(document.getElementById('recommendedAllocation').innerHTML)
                .toContain('Equity: 65% | Bonds: 25% | Cash: 10%');

            document.getElementById('glidePathRule').value = '120minus';
            document.getElementById('glidePathRule').dispatchEvent(new Event('change'));

            expect(document.getElementById('recommendedAllocation').innerHTML)
                .toContain('Equity: 75% | Bonds: 15% | Cash: 10%');
        } finally {
            logSpy.mockRestore();
            warnSpy.mockRestore();
        }
    });
});
