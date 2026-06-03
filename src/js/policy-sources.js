// policy-sources.js — Centralised registry of authoritative policy sources.
// All citations in suggestions, recommendations, and UI panels must reference
// an entry here by id rather than embedding raw URLs in display code.
//
// Effective date: 2026-06-02  Next review: 2026-09-20

export const POLICY_SOURCES = [
  {
    id: 'services-australia-age-pension',
    label: 'Services Australia – Age Pension',
    url: 'https://www.servicesaustralia.gov.au/age-pension',
    publisher: 'Services Australia',
    lastChecked: '2026-06-02',
    appliesTo: ['age-pension', 'means-test', 'deeming', 'asset-test', 'income-test'],
    notes: 'Primary source for eligibility, rates, thresholds, and claim rules.',
  },
  {
    id: 'services-australia-overseas',
    label: 'Services Australia – Payments while outside Australia',
    url: 'https://www.servicesaustralia.gov.au/payments-while-outside-australia',
    publisher: 'Services Australia',
    lastChecked: '2026-06-02',
    appliesTo: ['overseas', 'pension-portability', 'awlr'],
    notes: 'Covers short absence, long absence, permanent relocation, and agreement countries.',
  },
  {
    id: 'services-australia-agreements',
    label: 'Services Australia – International Social Security Agreements',
    url: 'https://www.servicesaustralia.gov.au/international-social-security-agreements',
    publisher: 'Services Australia',
    lastChecked: '2026-06-02',
    appliesTo: ['overseas', 'agreement-countries', 'pension-portability'],
    notes: 'Lists countries with agreements and how qualifying periods interact.',
  },
  {
    id: 'ato-super-contributions',
    label: 'ATO – Contributions to super',
    url: 'https://www.ato.gov.au/individuals-and-families/super-for-individuals-and-families/super/growing-and-keeping-track-of-your-super/caps-on-super-contributions',
    publisher: 'Australian Taxation Office',
    lastChecked: '2026-06-02',
    appliesTo: ['super', 'concessional-cap', 'non-concessional-cap', 'salary-sacrifice'],
    notes: 'Concessional cap $30,000; non-concessional cap $120,000 (2024-25 onwards).',
  },
  {
    id: 'ato-super-guarantee',
    label: 'ATO - Super guarantee',
    url: 'https://www.ato.gov.au/tax-rates-and-codes/key-superannuation-rates-and-thresholds/super-guarantee',
    publisher: 'Australian Taxation Office',
    lastChecked: '2026-06-03',
    appliesTo: ['super', 'super-guarantee', 'maximum-contribution-base', 'employer-sg'],
    notes: 'Primary source for Super Guarantee rates and the maximum super contribution base. 2025-26 SG rate is 12%; maximum contribution base is $62,500 per quarter.',
  },
  {
    id: 'ato-contribution-caps',
    label: 'ATO - Contributions caps',
    url: 'https://www.ato.gov.au/tax-rates-and-codes/key-superannuation-rates-and-thresholds/contributions-caps',
    publisher: 'Australian Taxation Office',
    lastChecked: '2026-06-03',
    appliesTo: ['super', 'concessional-cap', 'non-concessional-cap', 'salary-sacrifice', 'personal-deductible-contributions'],
    notes: 'Primary source for concessional and non-concessional contribution caps. 2025-26 concessional cap is $30,000.',
  },
  {
    id: 'ato-division-293',
    label: 'ATO - Division 293 tax',
    url: 'https://www.ato.gov.au/individuals-and-families/super-for-individuals-and-families/super/growing-and-keeping-track-of-your-super/caps-limits-and-tax-on-super-contributions/division-293-tax-on-concessional-contributions-by-high-income-earners',
    publisher: 'Australian Taxation Office',
    lastChecked: '2026-06-03',
    appliesTo: ['super', 'division-293', 'concessional-cap', 'high-income-warning'],
    notes: 'Division 293 tax may apply where Division 293 income plus concessional contributions exceeds $250,000.',
  },
  {
    id: 'ato-downsizer',
    label: 'ATO – Downsizer contributions',
    url: 'https://www.ato.gov.au/individuals-and-families/super-for-individuals-and-families/super/growing-and-keeping-track-of-your-super/downsizer-contributions',
    publisher: 'Australian Taxation Office',
    lastChecked: '2026-06-02',
    appliesTo: ['downsizing', 'super', 'contributions'],
    notes: 'Up to $300,000 per person ($600,000 couple) from home sale proceeds into super from age 55+.',
  },
  {
    id: 'ato-account-based-pension',
    label: 'ATO – Account-based pensions',
    url: 'https://www.ato.gov.au/individuals-and-families/super-for-individuals-and-families/super/accessing-your-super/tax-free-part-of-your-super/account-based-pensions',
    publisher: 'Australian Taxation Office',
    lastChecked: '2026-06-02',
    appliesTo: ['account-based-pension', 'drawdown', 'retirement-income'],
    notes: 'Tax treatment of account-based pensions in retirement phase.',
  },
  {
    id: 'ato-transfer-balance-cap',
    label: 'ATO – Transfer balance cap',
    url: 'https://www.ato.gov.au/individuals-and-families/super-for-individuals-and-families/super/accessing-your-super/transfer-balance-cap',
    publisher: 'Australian Taxation Office',
    lastChecked: '2026-06-02',
    appliesTo: ['super', 'transfer-balance-cap', 'retirement-income'],
    notes: 'General transfer balance cap: $1.9M (2024-25). Individual caps may differ.',
  },
  {
    id: 'moneysmart-account-based-pension',
    label: 'MoneySmart – Account-based pensions',
    url: 'https://moneysmart.gov.au/retirement-income/account-based-pensions',
    publisher: 'ASIC MoneySmart',
    lastChecked: '2026-06-02',
    appliesTo: ['account-based-pension', 'retirement-income', 'drawdown'],
    notes: 'Explains flexibility, investment risk, longevity risk. Not guaranteed for life.',
  },
  {
    id: 'moneysmart-annuities',
    label: 'MoneySmart – Annuities',
    url: 'https://moneysmart.gov.au/retirement-income/annuities',
    publisher: 'ASIC MoneySmart',
    lastChecked: '2026-06-02',
    appliesTo: ['annuity', 'lifetime-income', 'guaranteed-income'],
    notes: 'Explains trade-off: guaranteed income vs flexibility loss. Terms generally fixed at purchase.',
  },
  {
    id: 'asfa-retirement-standard',
    label: 'ASFA Retirement Standard',
    url: 'https://www.superannuation.asn.au/resources/retirement-standard',
    publisher: 'Association of Superannuation Funds of Australia',
    lastChecked: '2026-06-02',
    appliesTo: ['retirement-income', 'comfortable', 'modest'],
    notes: 'Quarterly updated benchmarks. Dec 2025 quarter: single $52,085, couple $73,337.',
  },
  {
    id: 'ato-tax-rates',
    label: 'ATO – Individual income tax rates',
    url: 'https://www.ato.gov.au/rates/individual-income-tax-rates',
    publisher: 'Australian Taxation Office',
    lastChecked: '2026-06-02',
    appliesTo: ['tax', 'income-tax', 'medicare-levy'],
    notes: 'Current tax brackets (2025-26). New 15% rate on $18,201–$45,000 from 1 July 2026.',
  },
  {
    id: 'ato-cgt',
    label: 'ATO – Capital gains tax',
    url: 'https://www.ato.gov.au/individuals-and-families/investments-and-assets/capital-gains-tax',
    publisher: 'Australian Taxation Office',
    lastChecked: '2026-06-02',
    appliesTo: ['cgt', 'property', 'investment'],
    notes: '50% CGT discount for assets held 12+ months (individuals). Budget 2026-27 proposes changes.',
  },
  {
    id: 'ato-salary-sacrifice',
    label: 'ATO – Salary sacrificing super',
    url: 'https://www.ato.gov.au/individuals-and-families/super-for-individuals-and-families/super/growing-and-keeping-track-of-your-super/how-to-save-more-in-your-super/salary-sacrificing-super',
    publisher: 'Australian Taxation Office',
    lastChecked: '2026-06-02',
    appliesTo: ['salary-sacrifice', 'super', 'contributions'],
    notes: 'Salary sacrifice taxed at 15% (instead of marginal rate) subject to concessional cap.',
  },
];

/** Lookup a source by id. Returns the source object or null if not found. */
export function getSource(id) {
  return POLICY_SOURCES.find(s => s.id === id) || null;
}

/** Format a source citation as a short label with URL for display. */
export function formatSourceCitation(id) {
  const src = getSource(id);
  if (!src) return '';
  return `${src.label} (${src.publisher}, checked ${src.lastChecked})`;
}

/** Return all sources applicable to a given topic tag. */
export function getSourcesFor(topic) {
  return POLICY_SOURCES.filter(s => s.appliesTo.includes(topic));
}

export default POLICY_SOURCES;
