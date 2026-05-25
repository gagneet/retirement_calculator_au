import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

export const options = {
  scenarios: {
    smoke_load: {
      executor: 'ramping-vus',
      stages: [
        { duration: '30s', target: 5 },
        { duration: '1m', target: 10 },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1000'],
    static_asset_ok: ['rate>0.99'],
    html_ttfb: ['p(95)<500'],
  },
};

const BASE_URL = __ENV.BASE_URL;
if (!BASE_URL) {
  throw new Error('BASE_URL is required. Example: BASE_URL=https://retirement.gagneet.com npm run test:load');
}
const htmlTtfb = new Trend('html_ttfb');
const staticAssetOk = new Rate('static_asset_ok');

export default function () {
  let advancedHtml = '';

  group('advanced v2 page shell', () => {
    const res = http.get(`${BASE_URL}/advanced-v2.html`, { tags: { page: 'advanced-v2', type: 'html' } });
    advancedHtml = res.body || '';
    htmlTtfb.add(res.timings.waiting);
    check(res, {
      'advanced-v2 status is 200': (r) => r.status === 200,
      'advanced-v2 contains app root': (r) => /advancedV2|advanced-v2|btn-calculate/.test(r.body),
      'advanced-v2 contains calculator controls': (r) => r.body.includes('Run simulation') && r.body.includes('Age Pension'),
    });
  });

  group('critical static assets', () => {
    const discovered = new Set();
    const assetPattern = /(?:src|href)=["']([^"']+\.(?:js|css|svg|png|ico))(?:\?[^"']*)?["']/g;
    let match;
    while ((match = assetPattern.exec(advancedHtml)) !== null) {
      const url = match[1];
      if (/^(https?:)?\/\//.test(url)) discovered.add(url);
      else discovered.add(url.startsWith('/') ? url : `/${url}`);
    }

    // These are stable public assets that should remain available even if the JS/CSS bundle is hashed.
    discovered.add('/assets/logo.svg');
    discovered.add('/assets/favicon.svg');

    for (const asset of discovered) {
      const url = /^(https?:)?\/\//.test(asset) ? asset : `${BASE_URL}${asset}`;
      const res = http.get(url, { tags: { page: 'advanced-v2', type: 'asset', asset } });
      const ok = res.status >= 200 && res.status < 400 && res.body.length > 0;
      staticAssetOk.add(ok);
      check(res, { [`${asset} loads`]: () => ok });
    }
  });

  group('supporting public pages', () => {
    for (const pagePath of ['/', '/how-to-use.html', '/methodology.html']) {
      const res = http.get(`${BASE_URL}${pagePath}`, { tags: { page: pagePath, type: 'html' } });
      check(res, {
        [`${pagePath} status is 200`]: (r) => r.status === 200,
        [`${pagePath} returns html`]: (r) => /text\/html/.test(r.headers['Content-Type'] || ''),
      });
    }
  });

  sleep(1);
}
