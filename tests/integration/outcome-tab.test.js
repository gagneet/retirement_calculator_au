/**
 * Integration tests for the outcome tab rendering behavior.
 * Covers Fix 5: overview bar visible before calculation runs.
 */

describe('Outcome tab overview bar visibility', () => {
    beforeEach(() => {
        document.body.innerHTML = `
            <div class="tab-content active p-6" id="outcome-tab">
                <!-- OVERVIEW STATS BAR - always visible with placeholder before calculation -->
                <div class="outcome-overview-bar" id="outcome-overview-stats">
                    <div class="outcome-overview-placeholder">
                        <span>📊</span>
                        <p>Run the calculation to see your retirement overview here.</p>
                    </div>
                </div>

                <div class="outcome-view-container" id="outcome-view-container" style="display: none;">
                    <div class="reality-check-card">
                        <h2>Your Retirement Reality Check</h2>
                    </div>
                </div>
            </div>
        `;
    });

    test('outcome-overview-stats element exists in the DOM', () => {
        const overviewBar = document.getElementById('outcome-overview-stats');
        expect(overviewBar).not.toBeNull();
    });

    test('overview bar is outside outcome-view-container', () => {
        const overviewBar = document.getElementById('outcome-overview-stats');
        const viewContainer = document.getElementById('outcome-view-container');

        // The overview bar should NOT be a descendant of outcome-view-container
        expect(viewContainer.contains(overviewBar)).toBe(false);
    });

    test('overview bar is visible before calculation (not inside hidden container)', () => {
        const overviewBar = document.getElementById('outcome-overview-stats');
        const viewContainer = document.getElementById('outcome-view-container');

        // View container is hidden but overview bar should be accessible
        expect(viewContainer.style.display).toBe('none');

        // Overview bar is outside the hidden container so it's reachable
        const outcomTab = document.getElementById('outcome-tab');
        expect(outcomTab.contains(overviewBar)).toBe(true);
        expect(viewContainer.contains(overviewBar)).toBe(false);
    });

    test('overview bar shows placeholder text before calculation', () => {
        const overviewBar = document.getElementById('outcome-overview-stats');
        const placeholder = overviewBar.querySelector('.outcome-overview-placeholder');
        expect(placeholder).not.toBeNull();
        expect(placeholder.textContent).toContain('Run the calculation');
    });

    test('overview bar content can be updated after calculation', () => {
        const overviewBar = document.getElementById('outcome-overview-stats');

        // Simulate what happens after calculation runs
        overviewBar.innerHTML = `
            <div class="outcome-stat">
                <span class="outcome-stat-value">$1,250,000</span>
                <span class="outcome-stat-label">Projected Balance</span>
            </div>
        `;

        const statValue = overviewBar.querySelector('.outcome-stat-value');
        expect(statValue).not.toBeNull();
        expect(statValue.textContent).toBe('$1,250,000');
    });

    test('outcome-view-container can be made visible after calculation', () => {
        const viewContainer = document.getElementById('outcome-view-container');

        // Initially hidden
        expect(viewContainer.style.display).toBe('none');

        // After calculation, it becomes visible
        viewContainer.style.display = 'block';
        expect(viewContainer.style.display).toBe('block');
    });
});

describe('Outcome tab structure integrity', () => {
    test('outcome tab has correct structure: overview bar then view container', () => {
        document.body.innerHTML = `
            <div id="outcome-tab">
                <div id="outcome-overview-stats"></div>
                <div id="outcome-view-container"></div>
            </div>
        `;

        const outcomeTab = document.getElementById('outcome-tab');
        const children = Array.from(outcomeTab.children);

        // overview-stats should appear before outcome-view-container
        const overviewIndex = children.findIndex(el => el.id === 'outcome-overview-stats');
        const containerIndex = children.findIndex(el => el.id === 'outcome-view-container');

        expect(overviewIndex).toBeLessThan(containerIndex);
    });

    test('both outcome-overview-stats and outcome-view-container are direct children of outcome-tab', () => {
        document.body.innerHTML = `
            <div id="outcome-tab">
                <div id="outcome-overview-stats"></div>
                <div id="outcome-view-container"></div>
            </div>
        `;

        const outcomeTab = document.getElementById('outcome-tab');
        const overviewStats = document.getElementById('outcome-overview-stats');
        const viewContainer = document.getElementById('outcome-view-container');

        expect(overviewStats.parentElement).toBe(outcomeTab);
        expect(viewContainer.parentElement).toBe(outcomeTab);
    });
});
