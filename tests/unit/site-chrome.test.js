/** @jest-environment jsdom */

const fs = require('fs');
const path = require('path');

describe('shared calculator site chrome', () => {
  test.each(['advanced.html', 'advanced-v2.html', 'reverse.html'])('%s includes shared header and footer mounts', (filename) => {
    const html = fs.readFileSync(path.join(__dirname, '../../src', filename), 'utf8');
    expect(html).toContain('data-site-header');
    expect(html).toMatch(/data-(?:site-footer|replace-with-site-footer)/);
  });

  test('shared styles are scoped to site-chrome classes', () => {
    const css = fs.readFileSync(path.join(__dirname, '../../src/css/site-chrome.css'), 'utf8');
    expect(css).toContain('.site-chrome--header');
    expect(css).toContain('.site-chrome--footer');
    expect(css).toContain('@media (max-width: 760px)');
  });
});
