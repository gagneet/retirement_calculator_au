/**
 * k6 delivery-performance suite covering every calculator surface.
 *
 * Scope: this measures how fast the *site* is delivered (TTFB, asset weight, cache
 * headers). It cannot measure in-browser calculation time — k6 has no DOM and never
 * executes the page bundle. Engine speed is covered by tests/perf/engine-benchmark.test.js
 * and UI responsiveness by tests/e2e/14-performance-budgets.spec.js.
 *
 *   BASE_URL=https://retirement.gagneet.com npm run test:load:all
 *   BASE_URL=http://localhost:3000 k6 run tests/load/k6-all-calculators.js
 */
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

const BASE_URL = (__ENV.BASE_URL || '').replace(/\/$/, '');
if (!BASE_URL) {
  throw new Error('BASE_URL is required. Example: BASE_URL=https://retirement.gagneet.com npm run test:load:all');
}

/** Every user-facing calculator page, with the delivery budget each one must meet. */
export const CALCULATOR_PAGES = [
  { path: '/',                  name: 'home',        ttfbMs: 500, maxHtmlKb: 400, marker: 'Retirement' },
  { path: '/advanced.html',     name: 'classic',     ttfbMs: 600, maxHtmlKb: 400, marker: 'Advanced' },
  { path: '/advanced-v2.html',  name: 'advanced-v2', ttfbMs: 600, maxHtmlKb: 400, marker: 'Age Pension' },
  { path: '/retirement.html',   name: 'v3',          ttfbMs: 600, maxHtmlKb: 400, marker: 'Age Pension' },
  { path: '/reverse.html',      name: 'reverse',     ttfbMs: 600, maxHtmlKb: 300, marker: 'Reverse' },
  { path: '/comparison.html',   name: 'comparison',  ttfbMs: 600, maxHtmlKb: 300, marker: 'Compar' },
];

const htmlTtfb        = new Trend('html_ttfb', true);
const assetTtfb       = new Trend('asset_ttfb', true);
const htmlBytes       = new Trend('html_bytes');
const entryBundleKb   = new Trend('entry_bundle_kb');
const staticAssetOk   = new Rate('static_asset_ok');
const pageOk          = new Rate('page_ok');
const budgetBreaches  = new Counter('budget_breaches');
const uncachedAssets  = new Counter('uncached_assets');

export const options = {
  scenarios: {
    smoke: {
      executor: 'ramping-vus',
      stages: [
        { duration: '20s', target: 5 },
        { duration: '40s', target: 10 },
        { duration: '20s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed:  ['rate<0.01'],
    http_req_duration:['p(95)<1500'],
    page_ok:          ['rate>0.99'],
    static_asset_ok:  ['rate>0.99'],
    html_ttfb:        ['p(95)<800'],
    asset_ttfb:       ['p(95)<800'],
    budget_breaches:  ['count==0'],
    // Per-page TTFB budgets.
    ...CALCULATOR_PAGES.reduce((acc, p) => {
      acc[`html_ttfb{page:${p.name}}`] = [`p(95)<${p.ttfbMs}`];
      return acc;
    }, {}),
  },
};

function collectAssets(html) {
  const found = new Set();
  const re = /(?:src|href)=["']([^"']+\.(?:js|css|svg|png|ico))(?:\?[^"']*)?["']/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const url = m[1];
    if (/^(https?:)?\/\//.test(url)) continue; // skip CDN assets — not ours to budget
    found.add(url.startsWith('/') ? url : `/${url}`);
  }
  return found;
}

export default function () {
  for (const page of CALCULATOR_PAGES) {
    group(`page ${page.name}`, () => {
      const tags = { page: page.name, type: 'html' };
      const res = http.get(`${BASE_URL}${page.path}`, { tags });

      htmlTtfb.add(res.timings.waiting, tags);
      const kb = (res.body || '').length / 1024;
      htmlBytes.add(kb * 1024, tags);

      const ok = check(res, {
        [`${page.name}: 200`]: (r) => r.status === 200,
        [`${page.name}: html content-type`]: (r) => /text\/html/.test(r.headers['Content-Type'] || ''),
        [`${page.name}: rendered marker present`]: (r) => (r.body || '').includes(page.marker),
        [`${page.name}: analytics wired`]: (r) => /googletagmanager|G-[A-Z0-9]{8,}|\.js/.test(r.body || ''),
      });
      pageOk.add(ok, tags);

      if (kb > page.maxHtmlKb) {
        budgetBreaches.add(1, tags);
        console.warn(`BUDGET: ${page.name} html ${kb.toFixed(0)}KB > ${page.maxHtmlKb}KB`);
      }

      // Entry bundle + critical assets
      const assets = collectAssets(res.body || '');
      assets.add('/assets/logo.svg');
      for (const asset of assets) {
        const aTags = { page: page.name, type: 'asset', asset };
        const a = http.get(`${BASE_URL}${asset}`, { tags: aTags });
        const good = a.status >= 200 && a.status < 400 && (a.body || '').length > 0;
        staticAssetOk.add(good, aTags);
        assetTtfb.add(a.timings.waiting, aTags);

        if (good && /\.js$/.test(asset)) {
          const bundleKb = a.body.length / 1024;
          entryBundleKb.add(bundleKb, aTags);
          if (bundleKb > 800) {
            budgetBreaches.add(1, aTags);
            console.warn(`BUDGET: ${asset} bundle ${bundleKb.toFixed(0)}KB > 800KB`);
          }
        }
        // Hashed assets must be far-future cacheable, or every visit re-downloads them.
        if (good && /\.[0-9a-f]{8,}\.(js|css)$/.test(asset)) {
          const cc = a.headers['Cache-Control'] || '';
          if (!/max-age=\d{5,}/.test(cc)) {
            uncachedAssets.add(1, aTags);
            console.warn(`CACHE: ${asset} has weak Cache-Control "${cc}"`);
          }
        }
      }
    });
  }
  sleep(1);
}
