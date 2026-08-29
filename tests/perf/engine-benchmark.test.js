/**
 * Calculation performance budgets for the shared engines.
 *
 * k6 measures how fast the site is *delivered*; it has no DOM and never runs the page
 * bundle, so it cannot see calculation cost. This suite measures the work that actually
 * blocks the user's main thread after they press "Calculate", and fails when a change
 * makes it materially slower.
 *
 * Budgets are deliberately generous (roughly 4-8x a healthy local run) so this is a
 * regression tripwire on CI hardware, not a flaky microbenchmark. Print the real
 * numbers with:  npm run test:perf -- --verbose
 */
import fs from 'fs';
import path from 'path';

const html = fs.readFileSync(path.resolve(__dirname, '../../src/retirement.html'), 'utf8');
document.body.innerHTML = (html.match(/<body[^>]*>([\s\S]*)<\/body>/i) || [, html])[1];

const v3 = require('../../src/js/retirement-v3.js');
const RetirementSimulator = require('../../src/js/simulator.js').default;
const { ENHANCED_CONFIG } = require('../../src/js/config.js');

const simulator = new RetirementSimulator(ENHANCED_CONFIG);
const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = String(v); };
const setHousehold = (h) => { const s = document.querySelector('[data-bind="household"]'); if (s) s.dataset.value = h; };

/** Median of N timed runs — resistant to a single GC pause. */
function timeMedian(fn, runs = 5) {
    const samples = [];
    for (let i = 0; i < runs; i += 1) {
        const t0 = performance.now();
        fn();
        samples.push(performance.now() - t0);
    }
    samples.sort((a, b) => a - b);
    return samples[Math.floor(samples.length / 2)];
}

/** Async variant — Monte Carlo yields to the event loop between chunks. */
async function timeMedianAsync(fn, runs = 3) {
    const samples = [];
    for (let i = 0; i < runs; i += 1) {
        const t0 = performance.now();
        await fn();
        samples.push(performance.now() - t0);
    }
    samples.sort((a, b) => a - b);
    return samples[Math.floor(samples.length / 2)];
}

function seedRealisticCouple() {
    setHousehold('couple');
    setVal('age', 45); setVal('retireAge', 65); setVal('lifespan', 92);
    setVal('partnerAge', 43); setVal('partnerRetireAge', 65); setVal('partnerLifespan', 94);
    setVal('salary', 165000); setVal('partnerSalary', 110000);
    setVal('superBal', 420000); setVal('partnerSuperBal', 260000);
    setVal('cash', 85000); setVal('stocks', 150000); setVal('monthlyStockContrib', 1500);
    setVal('homeValue', 1250000); setVal('mortgage', 380000); setVal('mortgageRate', 6.1);
    setVal('desiredIncome', 95000); setVal('healthcareCost', 4800);
}

describe('engine performance budgets', () => {
    beforeAll(seedRealisticCouple);

    // Engine inputs taken from the real DOM read, not a hand-built stub — a stub with
    // missing fields short-circuits the year loop and would benchmark nothing.
    let engineInputs;
    beforeAll(() => { engineInputs = v3.computeBaseState().engineInputs; });

    test('the benchmark fixture actually produces a full projection', () => {
        const res = simulator.simulateRetirement(engineInputs, false);
        const rows = res.yearlyData || [];
        console.log(`  fixture projects ${rows.length} years`);
        expect(rows.length).toBeGreaterThan(30);
    });

    test('single deterministic projection stays under budget', () => {
        const ms = timeMedian(() => simulator.simulateRetirement(engineInputs, false));
        console.log(`  deterministic projection: ${ms.toFixed(1)}ms`);
        expect(ms).toBeLessThan(150);
    });

    test('full V3 read -> canonical -> projection round trip stays under budget', () => {
        // computeBaseState() is what the Calculate button actually runs.
        const ms = timeMedian(() => v3.computeBaseState(), 3);
        console.log(`  computeBaseState (read+adapt+project+persist): ${ms.toFixed(1)}ms`);
        // Was ~35ms before readInputs() memoisation + the element cache; budget tightened
        // so the optimisation cannot silently regress.
        expect(ms).toBeLessThan(120);
    });

    test('ProjectionService cache makes a repeat projection effectively free', () => {
        v3.computeBaseState();                                   // warm
        const cached = timeMedian(() => v3.computeBaseState(), 5);
        console.log(`  cached computeBaseState: ${cached.toFixed(1)}ms`);
        // With the form untouched this is a memo hit plus a projection-cache hit.
        expect(cached).toBeLessThan(60);
    });

    test('Monte Carlo meets its per-run budget', async () => {
        const RUNS = 200;
        const ms = await timeMedianAsync(
            () => simulator.runMonteCarloSimulation(engineInputs, RUNS, null), 3
        );
        const perRun = ms / RUNS;
        console.log(`  Monte Carlo ${RUNS} runs: ${ms.toFixed(0)}ms (${perRun.toFixed(2)}ms/run)`);
        expect(ms).toBeGreaterThan(0);      // guard against silently measuring nothing
        // The UI offers up to 20,000 runs. At this budget 2,000 runs stays ~16s, which is
        // why the page chunks the work and shows a progress bar rather than blocking.
        expect(perRun).toBeLessThan(8);
    }, 60000);
});
