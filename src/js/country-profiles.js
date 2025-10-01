/**
 * Country Profiles for Overseas Retirement Analysis
 * Comprehensive data for popular retirement destinations for Australians
 * Last updated: October 2025
 */

export const COUNTRY_PROFILES = {
    INDIA: {
        name: 'India',
        region: 'South Asia',
        currency: 'INR',
        distanceFromAustralia: 6500,
        flightTime: '11-13 hours',
        overview: 'Ultra-low cost, growing expat community, family connections',

        // Social Security Agreement
        socialSecurityAgreement: false,

        // Age Pension Portability
        agePension: {
            portability: 'PROPORTIONAL_AFTER_26_WEEKS',
            formerResidentRule: true,
            note: 'No agreement - general portability rules apply'
        },

        // Visa
        visa: {
            type: 'OCI (Overseas Citizen of India) or Long-term Visa',
            duration: 'OCI: Lifelong | Tourist: 1 year extendable',
            requirements: [
                'OCI if Indian origin or married to Indian citizen',
                'Otherwise tourist visa extendable',
                'No specific retirement visa'
            ],
            easeOfAccess: 'MODERATE',
            cost: 'OCI: ~AUD $400'
        },

        // Cost of Living
        costOfLiving: {
            index: 0.35, // 35% of Australia
            breakdown: {
                accommodation: 'AUD $200-800/month',
                food: 'AUD $150-300/month',
                transport: 'AUD $50-150/month',
                utilities: 'AUD $50-100/month'
            },
            note: 'Extremely affordable, quality living at low cost',
            healthcareNote: 'Private insurance AUD $50-150/month'
        },

        // Healthcare
        healthcare: {
            system: 'Mix of public and private',
            quality: 'Private hospitals in major cities excellent',
            rating: 7.5,
            costs: 'Very affordable (1/10th of Australia)',
            insurance: 'Local insurance AUD $50-150/month',
            considerations: [
                'Choose locations with good hospitals',
                'Major cities have world-class private care',
                'Medical tourism destination'
            ]
        },

        // Tax
        tax: {
            doubleTaxAgreement: true,
            superTaxation: 'Not taxed if already taxed in Australia',
            agreementSummary: 'Comprehensive DTA prevents double taxation',
            residencyThreshold: '182 days per year'
        },

        // Climate
        climate: 'Tropical to subtropical - varies by region',

        // Popular Locations
        popularLocations: [
            {
                name: 'Goa',
                description: 'Beach lifestyle, large expat community',
                cost: 'LOW',
                pros: ['Beach life', 'Expat community', 'English spoken'],
                cons: ['Monsoon season', 'Tourist crowds']
            },
            {
                name: 'Bangalore',
                description: 'Tech hub, pleasant climate, cosmopolitan',
                cost: 'MEDIUM',
                pros: ['Modern amenities', 'Great weather'],
                cons: ['Traffic', 'Higher costs']
            },
            {
                name: 'Kerala',
                description: 'Tropical paradise, backwaters, healthcare',
                cost: 'LOW',
                pros: ['Beautiful', 'Good healthcare'],
                cons: ['Humidity', 'Monsoons']
            }
        ],

        // Language
        languageBarrier: 'MEDIUM',
        languageNote: 'English widely spoken in cities',

        // Risks
        risks: {
            overall: 'MEDIUM',
            currency: 'MEDIUM',
            healthcare: 'LOW',
            political: 'LOW',
            politicalNote: 'Stable democracy'
        },

        // Suitability
        bestFor: [
            'Indian heritage or family connections',
            'Ultra-low cost living seekers',
            'Cultural enthusiasts',
            'Yoga/wellness seekers'
        ],

        challenges: [
            'Bureaucracy',
            'Air pollution in cities',
            'Monsoon season',
            'Infrastructure gaps outside major cities'
        ]
    },

    PORTUGAL: {
        name: 'Portugal',
        region: 'Southern Europe',
        currency: 'EUR',
        distanceFromAustralia: 17000,
        flightTime: '22-24 hours',
        overview: 'Extremely popular - excellent weather, healthcare, NHR tax scheme',

        socialSecurityAgreement: true,
        agreementDetails: {
            since: '2017',
            coverage: 'Age, disability, survivors benefits'
        },

        agePension: {
            portability: 'FULL_WITH_AGREEMENT',
            formerResidentRule: false,
            note: 'Agreement allows indefinite portability'
        },

        visa: {
            type: 'D7 Passive Income Visa (Retirement Visa)',
            duration: '1 year renewable, permanent residence after 5',
            requirements: [
                'Passive income: Min €9,120/year',
                'Health insurance',
                'Clean criminal record',
                'Accommodation proof'
            ],
            easeOfAccess: 'EASY',
            cost: '€90 + fees',
            pathToCitizenship: 'After 5 years (requires basic Portuguese)'
        },

        costOfLiving: {
            index: 0.65,
            breakdown: {
                accommodation: 'AUD $800-2,000/month',
                food: 'AUD $400-600/month',
                transport: 'AUD $50-100/month',
                utilities: 'AUD $100-200/month'
            },
            note: 'Lisbon/Porto expensive, Algarve popular, interior affordable'
        },

        healthcare: {
            system: 'Universal public (SNS) + excellent private',
            quality: 'Excellent - ranked among Europe\'s best',
            rating: 9,
            costs: 'Public: Free/nominal. Private: Affordable.',
            insurance: 'Required for visa. Private: AUD $100-200/month'
        },

        tax: {
            doubleTaxAgreement: true,
            nhrScheme: {
                name: 'Non-Habitual Resident (NHR)',
                duration: '10 years',
                benefits: [
                    'Foreign pension income: 0% tax',
                    'Foreign-sourced income: 0-10% flat rate',
                    'Portuguese income: 20% flat rate'
                ],
                note: 'Major tax advantage for first 10 years'
            },
            superTaxation: 'Under NHR: Australian super not taxed'
        },

        climate: 'Mediterranean - mild winters, hot summers',

        popularLocations: [
            {
                name: 'Algarve',
                description: 'Southern coast - beaches, golf, expats',
                cost: 'MEDIUM-HIGH',
                pros: ['Best weather', 'Beach', 'Large expat community'],
                cons: ['Touristy', 'Higher costs']
            },
            {
                name: 'Lisbon',
                description: 'Capital - culture, food, vibrant',
                cost: 'HIGH',
                pros: ['Urban amenities', 'Culture', 'International'],
                cons: ['Expensive', 'Hilly', 'Crowds']
            },
            {
                name: 'Porto',
                description: 'Second city - authentic, wine, cooler',
                cost: 'MEDIUM',
                pros: ['Authentic', 'Wine culture', 'Beautiful'],
                cons: ['Cooler', 'Hillier']
            }
        ],

        languageBarrier: 'MEDIUM-LOW',
        languageNote: 'English increasingly common, especially with young Portuguese',

        risks: {
            overall: 'LOW',
            currency: 'MEDIUM',
            healthcare: 'LOW',
            political: 'LOW'
        },

        bestFor: [
            'European lifestyle at moderate cost',
            'Beach and golf (Algarve)',
            'Excellent healthcare seekers',
            'Tax advantages (NHR scheme)',
            'Safety and stability'
        ],

        challenges: [
            'Language barrier',
            'Bureaucracy',
            'Very far from Australia (24+ hours)',
            'Summer heat (40°C+)',
            'Higher taxes after NHR expires (10 years)'
        ],

        additionalNotes: [
            '🌟 NHR: 10 years 0% tax on foreign pension',
            '🏥 Healthcare ranked #12 globally',
            '☀️ 300+ sunny days/year in Algarve'
        ]
    },

    THAILAND: {
        name: 'Thailand',
        region: 'Southeast Asia',
        currency: 'THB',
        distanceFromAustralia: 5500,
        flightTime: '7-9 hours direct',
        overview: 'Very popular - low cost, excellent healthcare, beach life',

        socialSecurityAgreement: false,

        agePension: {
            portability: 'PROPORTIONAL_AFTER_26_WEEKS',
            formerResidentRule: true
        },

        visa: {
            type: 'Non-Immigrant O-A (Long Stay) or Elite Visa',
            duration: 'O-A: 1 year renewable. Elite: 5-20 years',
            requirements: [
                'Age 50+',
                '800,000 THB funds or AUD $35k income/year',
                'Health insurance',
                'Criminal record check'
            ],
            easeOfAccess: 'EASY',
            cost: 'O-A: ~AUD $300/year. Elite: AUD $22k-90k'
        },

        costOfLiving: {
            index: 0.45,
            breakdown: {
                accommodation: 'AUD $500-1,500/month',
                food: 'AUD $300-600/month',
                transport: 'AUD $50-150/month',
                utilities: 'AUD $80-150/month'
            },
            note: 'Excellent value. Can live comfortably on Age Pension.'
        },

        healthcare: {
            system: 'Excellent private hospitals',
            quality: 'World-class in Bangkok, Phuket, Chiang Mai',
            rating: 8.5,
            costs: 'Very affordable. Medical tourism destination.',
            insurance: 'Required: AUD $100-300/month'
        },

        tax: {
            doubleTaxAgreement: true,
            superTaxation: 'Complex - consult adviser',
            agreementSummary: 'DTA exists but complex'
        },

        climate: 'Tropical - hot year-round. Dry Nov-Feb.',

        popularLocations: [
            {
                name: 'Chiang Mai',
                description: 'North - cooler, cultural, digital nomad hub',
                cost: 'LOW',
                pros: ['Affordable', 'Culture', 'Expat community'],
                cons: ['Burning season air quality', 'No beaches']
            },
            {
                name: 'Phuket',
                description: 'Island - beaches, infrastructure',
                cost: 'MEDIUM-HIGH',
                pros: ['Beaches', 'Modern', 'International'],
                cons: ['Touristy', 'Expensive', 'Traffic']
            },
            {
                name: 'Hua Hin',
                description: 'Beach town - popular with retirees',
                cost: 'MEDIUM',
                pros: ['Beach', 'Quiet', 'Golf', 'Expat-friendly'],
                cons: ['Less exciting']
            }
        ],

        languageBarrier: 'MEDIUM',
        languageNote: 'English limited outside tourist areas',

        risks: {
            overall: 'MEDIUM',
            currency: 'MEDIUM',
            healthcare: 'LOW',
            political: 'MEDIUM',
            politicalNote: 'Periodic political tensions'
        },

        bestFor: [
            'Budget-conscious retirees',
            'Beach lovers',
            'Warm climate seekers',
            'Food enthusiasts'
        ],

        challenges: [
            'Annual visa extensions',
            'Language barrier',
            'Hot humid climate',
            'Occasional political instability'
        ]
    },

    BALI: {
        name: 'Bali, Indonesia',
        region: 'Southeast Asia',
        currency: 'IDR',
        distanceFromAustralia: 2500,
        flightTime: '5-6 hours direct',
        overview: 'Very close to Australia, extremely affordable, wellness culture',

        socialSecurityAgreement: false,

        agePension: {
            portability: 'PROPORTIONAL_AFTER_26_WEEKS',
            formerResidentRule: true
        },

        visa: {
            type: 'Retirement Visa (KITAS 317) or Social/Cultural',
            duration: 'Retirement: 5 years. Social: 180 days max.',
            requirements: [
                'Age 55+',
                'USD $1,500/month income proof',
                'Indonesian sponsor',
                'Health insurance'
            ],
            easeOfAccess: 'MODERATE',
            cost: '~AUD $2-3k/year (use agent)',
            note: 'Visa agents highly recommended'
        },

        costOfLiving: {
            index: 0.40,
            breakdown: {
                accommodation: 'AUD $400-1,200/month',
                food: 'AUD $200-500/month',
                transport: 'AUD $100-200/month',
                utilities: 'AUD $50-100/month'
            },
            note: 'Extremely affordable. Many live luxuriously on Age Pension.'
        },

        healthcare: {
            system: 'Private hospitals and clinics',
            quality: 'Good for routine, serious issues evacuate to Singapore/Australia',
            rating: 6.5,
            costs: 'Affordable routine care',
            insurance: 'International with evacuation essential: AUD $100-250/month'
        },

        tax: {
            doubleTaxAgreement: true,
            superTaxation: 'Complex - generally not taxed if not remitted same year'
        },

        climate: 'Tropical - hot year-round. Dry Apr-Sep.',

        popularLocations: [
            {
                name: 'Ubud',
                description: 'Cultural heart, yoga, jungle',
                cost: 'MEDIUM',
                pros: ['Peaceful', 'Wellness', 'Culture', 'Cooler'],
                cons: ['No beach', 'Touristy']
            },
            {
                name: 'Seminyak/Canggu',
                description: 'Beach, trendy, surf',
                cost: 'MEDIUM-HIGH',
                pros: ['Beach', 'Trendy', 'Social'],
                cons: ['Crowded', 'Expensive', 'Traffic']
            },
            {
                name: 'Sanur',
                description: 'Quiet beach, older expats',
                cost: 'MEDIUM',
                pros: ['Quiet', 'Family-friendly', 'Good beach'],
                cons: ['Less exciting']
            }
        ],

        languageBarrier: 'MEDIUM-LOW',
        languageNote: 'English widely spoken in expat areas',

        risks: {
            overall: 'MEDIUM',
            currency: 'MEDIUM-HIGH',
            healthcare: 'MEDIUM',
            political: 'LOW-MEDIUM',
            environmental: 'Volcanic activity, earthquakes'
        },

        bestFor: [
            'Staying close to Australia',
            'Spiritual/wellness seekers',
            'Beach lovers',
            'Ultra-low cost',
            'Large Aussie expat community'
        ],

        challenges: [
            'Visa complexity',
            'Healthcare limitations for serious issues',
            'Traffic congestion',
            'Over-tourism',
            'Volcanic/earthquake risk'
        ]
    }
};

/**
 * Get countries with Social Security Agreements
 * @returns {Array} Countries with agreements
 */
export function getAgreementCountries() {
    return Object.entries(COUNTRY_PROFILES)
        .filter(([_, profile]) => profile.socialSecurityAgreement)
        .map(([code, profile]) => ({ code, name: profile.name }));
}

/**
 * Get countries by cost of living
 * @param {number} maxCostIndex - Maximum cost index (1.0 = Australia cost)
 * @returns {Array} Countries sorted by cost
 */
export function getCountriesByCost(maxCostIndex = 1.0) {
    return Object.entries(COUNTRY_PROFILES)
        .filter(([_, profile]) => profile.costOfLiving.index <= maxCostIndex)
        .sort((a, b) => a[1].costOfLiving.index - b[1].costOfLiving.index)
        .map(([code, profile]) => ({
            code,
            name: profile.name,
            costIndex: profile.costOfLiving.index
        }));
}

/**
 * Get countries by distance from Australia
 * @param {number} maxDistance - Maximum distance in km
 * @returns {Array} Countries sorted by distance
 */
export function getCountriesByDistance(maxDistance = 20000) {
    return Object.entries(COUNTRY_PROFILES)
        .filter(([_, profile]) => profile.distanceFromAustralia <= maxDistance)
        .sort((a, b) => a[1].distanceFromAustralia - b[1].distanceFromAustralia)
        .map(([code, profile]) => ({
            code,
            name: profile.name,
            distance: profile.distanceFromAustralia,
            flightTime: profile.flightTime
        }));
}

export default COUNTRY_PROFILES;
