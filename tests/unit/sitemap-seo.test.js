/**
 * Tests that src/sitemap.xml is valid and complete.
 * Verifies required URL entries, HTTPS enforcement, priority ranges,
 * and lastmod date format.
 */

const fs = require('fs');
const path = require('path');

describe('Sitemap SEO', () => {
    let sitemapContent;

    beforeAll(() => {
        const sitemapPath = path.join(__dirname, '../../src/sitemap.xml');
        sitemapContent = fs.readFileSync(sitemapPath, 'utf-8');
    });

    test('sitemap.xml exists and is non-empty', () => {
        expect(sitemapContent).toBeTruthy();
        expect(sitemapContent.length).toBeGreaterThan(100);
    });

    test('starts with XML declaration', () => {
        expect(sitemapContent.trimStart()).toMatch(/^<\?xml/);
    });

    test('contains urlset element with sitemap namespace', () => {
        expect(sitemapContent).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
    });

    test('includes required URLs', () => {
        expect(sitemapContent).toContain('retirement.gagneet.com/');
        expect(sitemapContent).toContain('advanced.html');
        expect(sitemapContent).toContain('how-to-use.html');
        expect(sitemapContent).toContain('comparison.html');
    });

    test('root URL entry uses base domain', () => {
        expect(sitemapContent).toContain('https://retirement.gagneet.com/');
    });

    test('uses HTTPS for all loc URLs', () => {
        // Only check URLs inside <loc> elements, not namespace declarations
        const locMatches = sitemapContent.match(/<loc>([^<]+)<\/loc>/g) || [];
        expect(locMatches.length).toBeGreaterThan(0);
        locMatches.forEach(match => {
            const url = match.replace(/<\/?loc>/g, '').trim();
            expect(url).toMatch(/^https:/);
        });
    });

    test('priority values are between 0 and 1 (inclusive)', () => {
        const priorityMatches = sitemapContent.match(/<priority>([^<]+)<\/priority>/g) || [];
        expect(priorityMatches.length).toBeGreaterThan(0);
        priorityMatches.forEach(match => {
            const valueStr = match.replace(/<\/?priority>/g, '').trim();
            const value = parseFloat(valueStr);
            expect(value).toBeGreaterThanOrEqual(0);
            expect(value).toBeLessThanOrEqual(1);
        });
    });

    test('lastmod dates are in YYYY-MM-DD format', () => {
        const lastmodMatches = sitemapContent.match(/<lastmod>([^<]+)<\/lastmod>/g) || [];
        expect(lastmodMatches.length).toBeGreaterThan(0);
        lastmodMatches.forEach(match => {
            const dateStr = match.replace(/<\/?lastmod>/g, '').trim();
            expect(dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });
    });

    test('root URL has priority 1.0 (highest)', () => {
        // Extract the first URL block which should be the root
        const rootBlock = sitemapContent.match(/<url>[\s\S]*?https:\/\/retirement\.gagneet\.com\/<[\s\S]*?<\/url>/);
        expect(rootBlock).not.toBeNull();
        expect(rootBlock[0]).toContain('<priority>1.0</priority>');
    });

    test('advanced.html has a high priority entry', () => {
        const advancedBlock = sitemapContent.match(/<url>[\s\S]*?advanced\.html[\s\S]*?<\/url>/);
        expect(advancedBlock).not.toBeNull();
        const priorityMatch = advancedBlock[0].match(/<priority>([^<]+)<\/priority>/);
        expect(priorityMatch).not.toBeNull();
        const priority = parseFloat(priorityMatch[1]);
        expect(priority).toBeGreaterThanOrEqual(0.8);
    });

    test('all loc entries use the production domain', () => {
        const locMatches = sitemapContent.match(/<loc>([^<]+)<\/loc>/g) || [];
        expect(locMatches.length).toBeGreaterThan(0);
        locMatches.forEach(match => {
            const url = match.replace(/<\/?loc>/g, '').trim();
            expect(url).toContain('retirement.gagneet.com');
        });
    });

    test('contains at least 4 URL entries', () => {
        const urlEntries = sitemapContent.match(/<url>/g) || [];
        expect(urlEntries.length).toBeGreaterThanOrEqual(4);
    });
});
