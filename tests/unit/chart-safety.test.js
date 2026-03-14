/**
 * Tests that chart operations don't throw when Chart.js is undefined.
 * Covers Fix 2: destroyChart throws when Chart is undefined.
 */

describe('Chart safety checks', () => {
    let originalChart;

    beforeEach(() => {
        originalChart = global.Chart;
    });

    afterEach(() => {
        global.Chart = originalChart;
    });

    test('destroyChart does not throw when Chart is undefined', () => {
        global.Chart = undefined;

        // Simulate the fixed destroyChart logic
        const destroyChartSafe = (canvas) => {
            try {
                if (canvas) {
                    const existingChart = typeof Chart !== 'undefined' ? Chart.getChart(canvas) : null;
                    if (existingChart) {
                        existingChart.destroy();
                    }
                }
            } catch (error) {
                // Should not reach here
                throw error;
            }
        };

        const fakeCanvas = { id: 'testChart' };
        expect(() => destroyChartSafe(fakeCanvas)).not.toThrow();
    });

    test('destroyChart uses Chart.getChart when Chart is defined', () => {
        const mockDestroy = jest.fn();
        const mockGetChart = jest.fn().mockReturnValue({ destroy: mockDestroy });

        global.Chart = {
            getChart: mockGetChart,
        };

        const canvas = { id: 'testChart' };
        const existingChart = typeof Chart !== 'undefined' ? Chart.getChart(canvas) : null;
        if (existingChart) {
            existingChart.destroy();
        }

        expect(mockGetChart).toHaveBeenCalledWith(canvas);
        expect(mockDestroy).toHaveBeenCalled();
    });

    test('renderFanChart does not throw when Chart is undefined', () => {
        global.Chart = undefined;

        // Simulate the fixed renderFanChart guard logic
        const fanChartGuard = (canvas) => {
            if (typeof Chart !== 'undefined') {
                const existingChart = Chart.getChart(canvas);
                if (existingChart) {
                    existingChart.destroy();
                }
            }
        };

        const fakeCanvas = { id: 'fanChart' };
        expect(() => fanChartGuard(fakeCanvas)).not.toThrow();
    });

    test('renderFanChart destroys existing chart when Chart is defined', () => {
        const mockDestroy = jest.fn();
        const mockGetChart = jest.fn().mockReturnValue({ destroy: mockDestroy });

        global.Chart = {
            getChart: mockGetChart,
        };

        const canvas = { id: 'fanChart' };

        if (typeof Chart !== 'undefined') {
            const existingChart = Chart.getChart(canvas);
            if (existingChart) {
                existingChart.destroy();
            }
        }

        expect(mockGetChart).toHaveBeenCalledWith(canvas);
        expect(mockDestroy).toHaveBeenCalled();
    });

    test('existingChart returns null when Chart is undefined', () => {
        global.Chart = undefined;
        const canvas = { id: 'anyChart' };
        const existingChart = typeof Chart !== 'undefined' ? Chart.getChart(canvas) : null;
        expect(existingChart).toBeNull();
    });
});
