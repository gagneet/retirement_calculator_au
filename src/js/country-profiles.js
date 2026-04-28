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
    },

    // ============================================================
    // NEW ZEALAND - Social Security Agreement country
    // ============================================================
    NEW_ZEALAND: {
        name: 'New Zealand',
        region: 'Australasia',
        currency: 'NZD',
        distanceFromAustralia: 2200,
        flightTime: '3-4 hours direct',
        overview: 'Closest English-speaking destination with reciprocal rights for Australian citizens',

        socialSecurityAgreement: true,
        agreementDetails: {
            since: '1994',
            coverage: 'Age, disability, survivors and carer payments',
            note: 'Special Category Visa allows Australians to live and work indefinitely'
        },

        agePension: {
            portability: 'FULL_WITH_AGREEMENT',
            formerResidentRule: false,
            note: 'Agreement allows indefinite portability. NZ Superannuation may also be available.'
        },

        visa: {
            type: 'Special Category Visa (subclass 444) or NZ Permanent Residency',
            duration: 'Indefinite for Australian citizens',
            requirements: ['Australian citizen or eligible passport holder', 'Clean criminal record'],
            easeOfAccess: 'EASY',
            cost: 'Free for Australian citizens',
            pathToCitizenship: 'After 5 years of permanent residency'
        },

        costOfLiving: {
            index: 0.88,
            breakdown: {
                accommodation: 'AUD $1,500-3,500/month',
                food: 'AUD $600-1,000/month',
                transport: 'AUD $200-350/month',
                utilities: 'AUD $200-350/month'
            },
            note: 'Similar to Australia - Auckland expensive, South Island more affordable',
            healthcareNote: 'Public healthcare access available (residency required)'
        },

        healthcare: {
            system: 'Universal public (district health boards) + private',
            quality: 'Excellent - comparable to Australia',
            rating: 8.5,
            costs: 'Public healthcare available to residents. Private insurance AUD $100-250/month.',
            insurance: 'Optional. Public system available.',
            considerations: [
                'Must enrol with a GP (General Practice) for primary care',
                'ACC covers accident injuries (no-fault)',
                'Some wait times in public system'
            ]
        },

        tax: {
            doubleTaxAgreement: true,
            superTaxation: 'Australian super not taxed in NZ if compliant fund',
            agreementSummary: 'Comprehensive DTA prevents double taxation on pensions and investments',
            residencyThreshold: '183+ days determines tax residency'
        },

        climate: 'Temperate - four distinct seasons, milder than southern Australia',

        popularLocations: [
            {
                name: 'Queenstown',
                description: 'Adventure capital, lakes, mountains',
                cost: 'HIGH',
                pros: ['Stunning scenery', 'Active lifestyle', 'Safe'],
                cons: ['Very expensive', 'Cold winters', 'Remote']
            },
            {
                name: 'Nelson/Marlborough',
                description: 'Sunniest city, wine country, relaxed',
                cost: 'MEDIUM',
                pros: ['Sunshine', 'Wine', 'Beaches', 'Art scene'],
                cons: ['Smaller city', 'Limited services']
            },
            {
                name: 'Bay of Islands',
                description: 'Subtropical, sailing, beaches',
                cost: 'MEDIUM',
                pros: ['Warm climate', 'Beaches', 'Boating'],
                cons: ['Remote', 'Limited amenities']
            }
        ],

        languageBarrier: 'NONE',
        languageNote: 'English is the primary language',

        risks: {
            overall: 'VERY LOW',
            currency: 'LOW',
            healthcare: 'VERY LOW',
            political: 'VERY LOW'
        },

        bestFor: [
            'Wanting to stay close to family in Australia',
            'Similar lifestyle and culture to Australia',
            'English-speaking retirement',
            'Outdoor and adventure lifestyle'
        ],

        challenges: [
            'Cost of living nearly as high as Australia',
            'Limited cost-of-living savings',
            'Earthquakes (Wellington, Canterbury)',
            'Housing affordability in major cities',
            'Less tax advantage compared to other destinations'
        ]
    },

    // ============================================================
    // SPAIN - Social Security Agreement country
    // ============================================================
    SPAIN: {
        name: 'Spain',
        region: 'Southern Europe',
        currency: 'EUR',
        distanceFromAustralia: 17500,
        flightTime: '23-25 hours',
        overview: 'Excellent climate, food, culture and healthcare at moderate cost',

        socialSecurityAgreement: true,
        agreementDetails: {
            since: '2002',
            coverage: 'Age, disability and survivors benefits'
        },

        agePension: {
            portability: 'FULL_WITH_AGREEMENT',
            formerResidentRule: false,
            note: 'Agreement allows indefinite portability with easier qualification'
        },

        visa: {
            type: 'Non-Lucrative Visa (Visa de Residencia no Lucrativa)',
            duration: '1 year renewable, permanent residency after 5 years',
            requirements: [
                'Passive income: €28,800+/year single (€2,400/month)',
                'Private health insurance',
                'Clean criminal record',
                'Accommodation proof'
            ],
            easeOfAccess: 'MODERATE',
            cost: '€80-100 + fees',
            pathToCitizenship: 'After 10 years legal residency (or 2 for SSA countries)'
        },

        costOfLiving: {
            index: 0.60,
            breakdown: {
                accommodation: 'AUD $700-1,800/month',
                food: 'AUD $350-600/month',
                transport: 'AUD $80-200/month',
                utilities: 'AUD $120-200/month'
            },
            note: 'Madrid/Barcelona expensive, interior and coastal towns very affordable',
            healthcareNote: 'Public: free for residents. Private insurance AUD $80-150/month.'
        },

        healthcare: {
            system: 'Universal public (SNS) + excellent private',
            quality: 'Excellent - ranked among top 10 globally',
            rating: 8.8,
            costs: 'Public healthcare free for legal residents. Private very affordable.',
            insurance: 'Required for visa. AUD $80-150/month for comprehensive private.',
            considerations: [
                'One of the best public healthcare systems in Europe',
                'Private clinics and hospitals widely available',
                'Many English-speaking doctors, especially in expat areas'
            ]
        },

        tax: {
            doubleTaxAgreement: true,
            superTaxation: 'Australian super withdrawals generally not taxed in Spain if already taxed',
            agreementSummary: 'Comprehensive DTA covers pensions, dividends, interest and royalties',
            residencyThreshold: '183 days per year determines Spanish tax residency'
        },

        climate: 'Mediterranean - hot dry summers, mild winters (varies by region)',

        popularLocations: [
            {
                name: 'Costa del Sol (Málaga)',
                description: 'Sunshine coast, large expat community, golf',
                cost: 'MEDIUM',
                pros: ['Excellent weather', 'Large Aussie/British community', 'Great beaches'],
                cons: ['Can be touristy', 'Traffic in summer']
            },
            {
                name: 'Valencia',
                description: 'Vibrant city, beach, affordable',
                cost: 'MEDIUM-LOW',
                pros: ['City lifestyle', 'Beach', 'Affordable', 'Great food'],
                cons: ['Hot summers', 'Occasional flooding risk']
            },
            {
                name: 'Mallorca/Balearic Islands',
                description: 'Mediterranean islands, popular with Europeans',
                cost: 'MEDIUM-HIGH',
                pros: ['Beautiful', 'Mediterranean', 'Modern facilities'],
                cons: ['Crowded in summer', 'Expensive in tourist season']
            }
        ],

        languageBarrier: 'MEDIUM',
        languageNote: 'Spanish essential outside tourist areas. Many expat communities provide English support.',

        risks: {
            overall: 'LOW',
            currency: 'MEDIUM',
            healthcare: 'LOW',
            political: 'LOW',
            politicalNote: 'Stable democracy, EU member'
        },

        bestFor: [
            'Mediterranean lifestyle seekers',
            'Food and wine enthusiasts',
            'Golf and beach retirement',
            'Those wanting European culture at lower cost than France/Italy'
        ],

        challenges: [
            'Spanish language required for daily life',
            'Bureaucracy and slower pace of administration',
            'Very hot summers in inland areas',
            'Far from Australia (23+ hours)',
            'Non-Lucrative Visa income requirements'
        ]
    },

    // ============================================================
    // ITALY - Social Security Agreement country
    // ============================================================
    ITALY: {
        name: 'Italy',
        region: 'Southern Europe',
        currency: 'EUR',
        distanceFromAustralia: 16000,
        flightTime: '22-24 hours',
        overview: 'World-class culture, cuisine and history with special flat-tax for foreign retirees',

        socialSecurityAgreement: true,
        agreementDetails: {
            since: '1991',
            coverage: 'Age, disability and survivors benefits'
        },

        agePension: {
            portability: 'FULL_WITH_AGREEMENT',
            formerResidentRule: false,
            note: 'Agreement allows indefinite portability'
        },

        visa: {
            type: 'Elective Residency Visa (Visto per Residenza Elettiva)',
            duration: '1 year renewable, permanent residency after 5 years',
            requirements: [
                'Passive income: €31,000/year minimum',
                'Comprehensive health insurance',
                'Clean criminal record',
                'Accommodation proof (lease or purchase)'
            ],
            easeOfAccess: 'MODERATE',
            cost: '€116 + fees',
            note: '7% flat tax regime available in regions with population under 20,000'
        },

        costOfLiving: {
            index: 0.62,
            breakdown: {
                accommodation: 'AUD $700-2,000/month (varies enormously by region)',
                food: 'AUD $400-700/month',
                transport: 'AUD $100-200/month',
                utilities: 'AUD $150-250/month'
            },
            note: 'Northern cities (Milan, Rome) expensive. Southern Italy (Puglia, Calabria, Sicily) remarkably affordable.',
            healthcareNote: 'Public: available for residents. Private insurance AUD $100-200/month.'
        },

        healthcare: {
            system: 'Universal public (Servizio Sanitario Nazionale) + private',
            quality: 'Very good - regional variation. Top quality in northern cities.',
            rating: 8.3,
            costs: 'Public healthcare available to legal residents. Affordable co-payments.',
            insurance: 'Supplemental private insurance recommended AUD $80-150/month.',
            considerations: [
                'Quality varies significantly by region (north vs south)',
                'Excellent private hospitals in major cities',
                'Some English-speaking doctors in tourist areas and major cities'
            ]
        },

        tax: {
            doubleTaxAgreement: true,
            nhrScheme: {
                name: '7% Flat Tax Regime for Foreign Retirees',
                duration: '10 years (renewable once)',
                benefits: [
                    'Only 7% tax on all foreign-source income (pension, super, investments)',
                    'Available in qualifying southern Italian municipalities',
                    'Population < 20,000 in qualifying regions (Sicily, Sardinia, Calabria, Campania, etc.)',
                    'Completely exempts from wealth reporting requirements'
                ],
                note: 'Excellent tax incentive for first 10 years. Requires spending 90+ days per year in Italy.'
            },
            superTaxation: 'Under 7% regime: Australian super taxed at only 7%',
            agreementSummary: 'DTA prevents double taxation on most income types'
        },

        climate: 'Mediterranean - warm dry summers, mild winters. Significant regional variation.',

        popularLocations: [
            {
                name: 'Puglia (Apulia)',
                description: 'Southern heel - stunning coastline, trulli houses, affordable',
                cost: 'LOW-MEDIUM',
                pros: ['Very affordable', '7% tax regime', 'Beautiful', 'Excellent food'],
                cons: ['Limited English', 'Heat in summer', 'Slower pace of services']
            },
            {
                name: 'Sicily',
                description: 'Mediterranean island - culture, food, affordability',
                cost: 'LOW',
                pros: ['Cheapest option in Italy', '7% tax regime', 'Rich culture', 'Amazing food'],
                cons: ['Language barrier', 'Infrastructure gaps', 'Very hot summers']
            },
            {
                name: 'Tuscany',
                description: 'Rolling hills, wine, Renaissance art - quintessential Italy',
                cost: 'MEDIUM-HIGH',
                pros: ['Iconic Italian lifestyle', 'Wine', 'Art and culture'],
                cons: ['Expensive', 'No 7% tax regime', 'Crowded with tourists']
            }
        ],

        languageBarrier: 'HIGH',
        languageNote: 'Italian essential. Very limited English outside tourist areas and major cities.',

        risks: {
            overall: 'LOW-MEDIUM',
            currency: 'MEDIUM',
            healthcare: 'LOW',
            political: 'LOW-MEDIUM',
            politicalNote: 'EU member but politically volatile at times'
        },

        bestFor: [
            'Food and culture enthusiasts',
            'Seeking the 7% flat tax regime',
            'Slow living in beautiful surroundings',
            'Those with Italian heritage (citizenship by descent possible)',
            'Art, history and architecture lovers'
        ],

        challenges: [
            'Language barrier is significant',
            'Italian bureaucracy',
            'Far from Australia (22+ hours)',
            'Regional infrastructure disparity (north vs south)',
            '7% tax regime requires living in smaller towns'
        ],

        additionalNotes: [
            '🌟 7% flat tax: Only 7% on all foreign income for 10 years in qualifying southern towns',
            '🏛️ Italian citizenship by descent available (no generational limit)',
            '🍷 World-class food, wine and culture at lower cost than northern Europe'
        ]
    },

    // ============================================================
    // CANADA - Social Security Agreement country
    // ============================================================
    CANADA: {
        name: 'Canada',
        region: 'North America',
        currency: 'CAD',
        distanceFromAustralia: 15000,
        flightTime: '18-22 hours',
        overview: 'English-speaking, stable, excellent healthcare - higher cost of living',

        socialSecurityAgreement: true,
        agreementDetails: {
            since: '1990',
            coverage: 'Age, disability and survivors benefits'
        },

        agePension: {
            portability: 'FULL_WITH_AGREEMENT',
            formerResidentRule: false,
            note: 'Agreement allows indefinite portability. Canadian OAS may supplement.'
        },

        visa: {
            type: 'Super Visa (parents/grandparents) or Permanent Residency',
            duration: 'Super Visa: up to 5 years per visit. PR: indefinite.',
            requirements: [
                'Super Visa: Canadian citizen/PR child/grandchild, medical insurance CAD $100k+',
                'PR: Express Entry points system (age, language, skills)',
                'Retirees: Quebec Investor/Entrepreneur program or sponsorship'
            ],
            easeOfAccess: 'HARD',
            cost: 'CAD $150-1,500 depending on visa type',
            note: 'No dedicated retirement visa - requires family sponsorship or provincial programs'
        },

        costOfLiving: {
            index: 0.85,
            breakdown: {
                accommodation: 'AUD $1,800-4,000/month (city); AUD $900-2,000 (rural)',
                food: 'AUD $700-1,200/month',
                transport: 'AUD $300-600/month',
                utilities: 'AUD $250-400/month (heating significant in winter)'
            },
            note: 'Vancouver and Toronto very expensive. Maritime provinces and Quebec more affordable.',
            healthcareNote: 'Provincial healthcare free for residents (3-month waiting period). Dental/vision extra.'
        },

        healthcare: {
            system: 'Universal provincial (Medicare) + supplemental private',
            quality: 'Excellent - among world\'s best',
            rating: 8.8,
            costs: 'Provincial healthcare free once registered. Dental/vision/prescription extra.',
            insurance: 'Supplemental for dental/vision: AUD $100-200/month.',
            considerations: [
                '3-month waiting period for provincial coverage in most provinces',
                'Dental and vision not covered by provincial plans',
                'Some wait times for specialists and elective procedures',
                'Prescription drug coverage varies by province'
            ]
        },

        tax: {
            doubleTaxAgreement: true,
            superTaxation: 'Australian super withdrawals taxed as pension income in Canada',
            agreementSummary: 'Comprehensive DTA covers pensions, dividends, interest. No double taxation on Australian pension.',
            residencyThreshold: '183 days per year typically determines Canadian tax residency'
        },

        climate: 'Continental - cold winters, warm summers. West Coast (BC) milder.',

        popularLocations: [
            {
                name: 'Victoria, British Columbia',
                description: 'Mild climate, English, gardens, retiree-friendly',
                cost: 'MEDIUM-HIGH',
                pros: ['Mildest Canadian climate', 'English speaking', 'Beautiful'],
                cons: ['Expensive', 'Very far from Australia']
            },
            {
                name: 'Kelowna, British Columbia',
                description: 'Wine country, lakes, outdoor lifestyle',
                cost: 'MEDIUM',
                pros: ['Lakes', 'Wine', 'Active', 'Good weather for Canada'],
                cons: ['Cold winters', 'Wildfire smoke risk in summer']
            },
            {
                name: 'Nova Scotia / Maritime Provinces',
                description: 'Atlantic coast, affordable, English, safe',
                cost: 'LOW-MEDIUM',
                pros: ['Affordable', 'Safe', 'Beautiful coastline', 'English'],
                cons: ['Cold', 'Limited services', 'Far from major centres']
            }
        ],

        languageBarrier: 'NONE (English) / MEDIUM (French Quebec)',
        languageNote: 'English widely spoken across most of Canada. French required in Quebec.',

        risks: {
            overall: 'VERY LOW',
            currency: 'LOW',
            healthcare: 'VERY LOW',
            political: 'VERY LOW'
        },

        bestFor: [
            'Those with family in Canada',
            'English-speaking environment seekers',
            'Winter sports enthusiasts',
            'Nature and outdoor lifestyle lovers',
            'Those wanting a stable, safe Western country'
        ],

        challenges: [
            'Harsh winters in most regions',
            'High cost of living compared to Southeast Asia/Europe',
            'No dedicated retirement visa pathway',
            'Very far from Australia (18-22 hours)',
            'High taxes in some provinces'
        ]
    },

    // ============================================================
    // JAPAN - Social Security Agreement country
    // ============================================================
    JAPAN: {
        name: 'Japan',
        region: 'East Asia',
        currency: 'JPY',
        distanceFromAustralia: 8000,
        flightTime: '9-11 hours direct',
        overview: 'Safe, clean, excellent healthcare, unique culture and cuisine',

        socialSecurityAgreement: true,
        agreementDetails: {
            since: '2009',
            coverage: 'Age, disability, survivors and unemployment benefits',
            note: 'Allows exemption from Japanese pension contributions for temporary residents'
        },

        agePension: {
            portability: 'FULL_WITH_AGREEMENT',
            formerResidentRule: false,
            note: 'Agreement allows indefinite portability'
        },

        visa: {
            type: 'Long-Term Resident Visa or Specified Skilled Worker / Dependent Visa',
            duration: '1-5 years renewable',
            requirements: [
                'Age 60+ long-term resident visa available',
                'Sufficient financial means (typically ¥3M+/year or savings ¥30M+)',
                'Health insurance coverage',
                'Clean criminal record'
            ],
            easeOfAccess: 'MODERATE',
            cost: '¥6,000-8,000 application fee',
            note: 'Japan has become more open to foreign retirees. "Digital nomad" and investment visas also available.'
        },

        costOfLiving: {
            index: 0.70,
            breakdown: {
                accommodation: 'AUD $600-2,000/month (varies by region)',
                food: 'AUD $400-700/month',
                transport: 'AUD $150-300/month',
                utilities: 'AUD $150-300/month'
            },
            note: 'Tokyo/Osaka expensive but rural Japan and smaller cities very affordable. Excellent public transport.',
            healthcareNote: 'National health insurance required. AUD $100-200/month. Excellent quality.'
        },

        healthcare: {
            system: 'Universal national health insurance (NHI)',
            quality: 'World-class - top-ranked globally for longevity',
            rating: 9.5,
            costs: 'NHI covers 70% of costs. Monthly premium AUD $100-200. Out-of-pocket very low.',
            insurance: 'National Health Insurance mandatory: AUD $100-200/month',
            considerations: [
                'Must join National Health Insurance system',
                'World\'s highest life expectancy - reflects healthcare quality',
                'Very advanced and technologically sophisticated medical system',
                'Language barrier can be challenge in rural hospitals'
            ]
        },

        tax: {
            doubleTaxAgreement: true,
            superTaxation: 'Australian super typically classified as pension income in Japan',
            agreementSummary: 'DTA prevents double taxation. Pension income taxed only in Australia if Australian resident for tax.',
            residencyThreshold: '183 days or resident registration creates Japanese tax obligations'
        },

        climate: 'Temperate with distinct seasons. Hot humid summers, cold winters (varies by region).',

        popularLocations: [
            {
                name: 'Kyoto',
                description: 'Historical capital, temples, traditional culture',
                cost: 'MEDIUM',
                pros: ['Incredible culture', 'Walkable', 'Excellent food', 'English services growing'],
                cons: ['Very hot summers', 'Language barrier', 'Cultural adjustment']
            },
            {
                name: 'Fukuoka (Kyushu)',
                description: 'Affordable, warm climate, growing expat community',
                cost: 'MEDIUM-LOW',
                pros: ['Warm', 'Affordable', 'Food city', 'Good English services'],
                cons: ['Less international than Tokyo']
            },
            {
                name: 'Okinawa',
                description: 'Subtropical islands, beaches, famous for longevity',
                cost: 'LOW-MEDIUM',
                pros: ['Tropical', 'Beaches', 'Relaxed', 'Longevity culture'],
                cons: ['Typhoon risk', 'Remote', 'Limited English']
            }
        ],

        languageBarrier: 'HIGH',
        languageNote: 'Japanese language very helpful. Growing English signage but daily life requires Japanese.',

        risks: {
            overall: 'LOW',
            currency: 'MEDIUM',
            healthcare: 'VERY LOW',
            political: 'VERY LOW',
            environmental: 'Earthquakes and typhoons'
        },

        bestFor: [
            'Safety-conscious retirees (one of world\'s safest countries)',
            'Those fascinated by Japanese culture and cuisine',
            'Healthcare-focused retirement',
            'Technology and innovation enthusiasts',
            'Nature and seasons lovers'
        ],

        challenges: [
            'Language barrier is significant',
            'Cultural differences and adaptation',
            'Earthquakes and natural disasters',
            'Hot humid summers',
            'Bureaucracy and paperwork in Japanese'
        ],

        additionalNotes: [
            '🏥 World\'s best life expectancy and healthcare system',
            '🛡️ One of the world\'s safest countries',
            '🍱 World-class cuisine and food culture'
        ]
    },

    // ============================================================
    // MALAYSIA - No formal Social Security Agreement but highly popular
    // ============================================================
    MALAYSIA: {
        name: 'Malaysia',
        region: 'Southeast Asia',
        currency: 'MYR',
        distanceFromAustralia: 5500,
        flightTime: '7-8 hours direct',
        overview: 'English-friendly, affordable, excellent food and excellent MM2H retirement visa program',

        socialSecurityAgreement: false,

        agePension: {
            portability: 'PROPORTIONAL_AFTER_26_WEEKS',
            formerResidentRule: true,
            note: 'No agreement - general portability rules apply. Age Pension is portable.'
        },

        visa: {
            type: 'Malaysia My Second Home (MM2H)',
            duration: '5 years renewable long-term',
            requirements: [
                'Age 35+',
                'Minimum offshore funds deposit: RM 1,000,000 (AUD ~$330k) for Silver Tier',
                'Monthly income: RM 40,000 (AUD ~$13k/month) for Platinum Tier',
                'Health insurance with medical coverage in Malaysia',
                'Clean criminal record'
            ],
            easeOfAccess: 'MODERATE',
            cost: 'RM 5,000 (AUD ~$1,600) + annual renewal',
            note: 'Three tiers: Silver, Gold, Platinum with different requirements. Requirements increased significantly in 2021.'
        },

        costOfLiving: {
            index: 0.42,
            breakdown: {
                accommodation: 'AUD $500-1,800/month',
                food: 'AUD $250-500/month',
                transport: 'AUD $100-200/month',
                utilities: 'AUD $80-150/month'
            },
            note: 'Kuala Lumpur more expensive, Penang and East Malaysia very affordable. English widely spoken.',
            healthcareNote: 'Excellent private healthcare. AUD $150-300/month for expat insurance.'
        },

        healthcare: {
            system: 'Public + excellent private',
            quality: 'Excellent private hospitals - medical tourism destination',
            rating: 8.5,
            costs: 'Private healthcare very affordable. International insurance AUD $150-300/month.',
            insurance: 'International health insurance recommended: AUD $150-300/month',
            considerations: [
                'World-class private hospitals (Pantai, Gleneagles, Prince Court)',
                'Medical tourism hub - very affordable procedures',
                'JCI-accredited hospitals available',
                'Limited public healthcare access for foreigners'
            ]
        },

        tax: {
            doubleTaxAgreement: true,
            superTaxation: 'Australian super withdrawals generally not taxed in Malaysia under DTA',
            agreementSummary: 'DTA covers pension income, dividends and interest. Malaysia does not tax foreign-source income.',
            residencyThreshold: '182 days per year for Malaysian tax residency. Foreign income not taxed.',
            note: 'Malaysia does NOT tax foreign-sourced income for individuals - major advantage'
        },

        climate: 'Tropical - hot and humid year-round. Two monsoon seasons.',

        popularLocations: [
            {
                name: 'Penang (George Town)',
                description: 'UNESCO heritage island, food capital of Asia, affordable',
                cost: 'LOW-MEDIUM',
                pros: ['World-class food', 'Heritage culture', 'English spoken', 'Affordable', 'Medical facilities'],
                cons: ['Traffic', 'Humidity', 'Limited public transport']
            },
            {
                name: 'Kuala Lumpur',
                description: 'Cosmopolitan capital, world-class facilities, international',
                cost: 'MEDIUM',
                pros: ['International lifestyle', 'Shopping', 'Healthcare', 'Connectivity'],
                cons: ['Traffic', 'Air quality', 'More expensive for Malaysia']
            },
            {
                name: 'Ipoh',
                description: 'Colonial charm, food culture, affordable, close to Penang',
                cost: 'LOW',
                pros: ['Very affordable', 'Charm', 'Food', 'Growing expat community'],
                cons: ['Smaller city', 'Limited international flights']
            }
        ],

        languageBarrier: 'LOW',
        languageNote: 'English widely spoken in cities and business - legacy of British administration.',

        risks: {
            overall: 'LOW-MEDIUM',
            currency: 'MEDIUM',
            healthcare: 'LOW',
            political: 'LOW',
            environmental: 'Flooding risk in some areas'
        },

        bestFor: [
            'English-speaking retirement in Asia',
            'Food lovers (some of Asia\'s best cuisine)',
            'Affordable luxury lifestyle',
            'Close proximity to Australia',
            'Medical tourism and healthcare'
        ],

        challenges: [
            'MM2H visa requirements significantly increased since 2021',
            'Hot and humid climate year-round',
            'Political uncertainty (though stable)',
            'Traffic congestion in Kuala Lumpur',
            'Air quality issues from regional haze'
        ],

        additionalNotes: [
            '🍜 Asia\'s food capital - Penang consistently ranked best food city in the world',
            '🏥 World-class private healthcare at 20-30% of Australian costs',
            '💰 Foreign income not taxed - major advantage for retirees'
        ]
    },

    // ============================================================
    // PHILIPPINES - Popular destination, no formal SSA
    // ============================================================
    PHILIPPINES: {
        name: 'Philippines',
        region: 'Southeast Asia',
        currency: 'PHP',
        distanceFromAustralia: 5500,
        flightTime: '7-9 hours direct',
        overview: 'English-speaking, very affordable, beach paradise, large expat community',

        socialSecurityAgreement: false,

        agePension: {
            portability: 'PROPORTIONAL_AFTER_26_WEEKS',
            formerResidentRule: true,
            note: 'No agreement - general portability rules apply'
        },

        visa: {
            type: 'Special Resident Retiree Visa (SRRV)',
            duration: 'Permanent (lifetime)',
            requirements: [
                'Age 35+',
                'USD $10,000 deposit (bank account in Philippines) for age 50+',
                'USD $20,000 deposit for age 35-49',
                'Additional USD $10,000 if not receiving monthly pension',
                'Health insurance',
                'PRA membership fee: USD $1,400'
            ],
            easeOfAccess: 'EASY',
            cost: 'USD $1,400 + deposit (refundable on departure)',
            pathToCitizenship: 'Possible after 10 years, requires renouncing Australian citizenship'
        },

        costOfLiving: {
            index: 0.38,
            breakdown: {
                accommodation: 'AUD $300-1,200/month (varies enormously)',
                food: 'AUD $200-450/month',
                transport: 'AUD $80-200/month',
                utilities: 'AUD $100-200/month'
            },
            note: 'One of Asia\'s most affordable. Can live very comfortably on Age Pension.',
            healthcareNote: 'Private insurance: AUD $100-250/month. Excellent private hospitals in major cities.'
        },

        healthcare: {
            system: 'Mix of public (PhilHealth) + excellent private in major cities',
            quality: 'Variable. Excellent in Manila, Cebu. Limited in rural areas.',
            rating: 7.0,
            costs: 'Affordable private care. USD $50-150 for specialist consultation.',
            insurance: 'International health insurance essential: AUD $100-250/month',
            considerations: [
                'Manila has JCI-accredited world-class hospitals',
                'Limited quality care outside major cities',
                'Medical evacuation to Singapore/Australia for serious cases',
                'Dental care very affordable'
            ]
        },

        tax: {
            doubleTaxAgreement: true,
            superTaxation: 'Generally not taxed under DTA arrangements',
            agreementSummary: 'DTA exists - prevents double taxation on pension and passive income',
            residencyThreshold: '183 days per year creates Philippine tax residency'
        },

        climate: 'Tropical - hot year-round. Typhoon season June-November.',

        popularLocations: [
            {
                name: 'Cebu City / Mactan Island',
                description: 'Major hub, beaches, international airport, large expat community',
                cost: 'LOW-MEDIUM',
                pros: ['Good infrastructure', 'Beaches', 'International airport', 'Large expat community'],
                cons: ['Traffic', 'Typhoon risk', 'Heat and humidity']
            },
            {
                name: 'Davao (Mindanao)',
                description: 'Safer large city in Mindanao, affordable, Mount Apo nearby',
                cost: 'LOW',
                pros: ['Affordable', 'Lower crime than Manila', 'Fresh produce', 'Mt. Apo'],
                cons: ['Remote', 'Limited international connections', 'Far south location']
            },
            {
                name: 'Boracay / Palawan',
                description: 'World-class beaches, tropical paradise',
                cost: 'MEDIUM',
                pros: ['Stunning beaches', 'Natural beauty', 'Tourist infrastructure'],
                cons: ['Very touristy', 'Infrastructure limitations', 'Typhoon risk']
            }
        ],

        languageBarrier: 'LOW',
        languageNote: 'Filipino English fluency is very high - official government and business language.',

        risks: {
            overall: 'MEDIUM',
            currency: 'MEDIUM-HIGH',
            healthcare: 'MEDIUM',
            political: 'MEDIUM',
            environmental: 'Typhoons, volcanic activity, earthquakes'
        },

        bestFor: [
            'Budget-conscious retirees',
            'Beach and island lifestyle',
            'English-speaking Asian destination',
            'Those with Filipino connections or heritage',
            'Active social expat communities'
        ],

        challenges: [
            'Natural disasters (typhoons, earthquakes, volcanoes)',
            'Political instability',
            'Traffic in major cities',
            'Air pollution in Manila',
            'Healthcare quality outside major cities',
            'High crime risk in some areas - requires local knowledge'
        ]
    },

    VIETNAM: {
        name: 'Vietnam',
        region: 'South-East Asia',
        currency: 'VND',
        distanceFromAustralia: 7500,
        flightTime: '9-10 hours',
        overview: 'Ultra-low cost of living, vibrant culture, growing expat community, excellent food scene',

        socialSecurityAgreement: false,
        agePension: {
            portability: 'PROPORTIONAL_AFTER_26_WEEKS',
            formerResidentRule: true,
            note: 'No SSA — general portability rules apply. AWLR determines portable portion.'
        },

        visa: {
            type: 'E-visa (90 days) or long-term business/investor visa',
            duration: 'E-visa 90 days, renewable. No official retirement visa.',
            requirements: [
                '90-day e-visa renewable for most nationalities',
                'Long-term stays via investor or business presence',
                'Some retirees use back-to-back renewals — grey area in law',
                'Consider DT visa (temporary resident) via local sponsorship'
            ],
            easeOfAccess: 'MODERATE',
            cost: '~AUD $80-150 for e-visa',
            pathToCitizenship: 'Very difficult — not a realistic pathway'
        },

        costOfLiving: {
            index: 0.30,
            breakdown: {
                accommodation: 'AUD $300-700/month (nice 2-bed apartment)',
                food: 'AUD $150-350/month (excellent, cheap local food)',
                transport: 'AUD $30-80/month',
                utilities: 'AUD $40-80/month'
            },
            note: 'One of the cheapest retirement destinations in Asia. $30,000-40,000 AUD/year lives very comfortably.',
            healthcareNote: 'Private insurance AUD $60-180/month. International hospitals in HCMC/Hanoi are excellent.'
        },

        healthcare: {
            system: 'Mix of public and private; international hospitals in major cities',
            quality: 'Good in Hanoi and Ho Chi Minh City, limited in rural areas',
            rating: 6.5,
            costs: 'Very affordable — specialist visit ~AUD $30-50',
            insurance: 'International health insurance strongly recommended AUD $100-250/month',
            considerations: [
                'FV Hospital (HCMC) and Vinmec (Hanoi) are world-class',
                'Medical evacuation insurance recommended for rural areas',
                'Pharmaceutical quality high in cities',
                'Air quality in Hanoi/HCMC can be poor in winter months'
            ]
        },

        tax: {
            doubleTaxAgreement: true,
            superTaxation: 'Australian super taxed in Australia; not taxed in Vietnam under DTA',
            agreementSummary: 'Australia-Vietnam DTA (1996) prevents double taxation on pensions and super income',
            residencyThreshold: '183 days per year for Vietnamese tax residency'
        },

        climate: 'Tropical — Hanoi has distinct seasons; HCMC/Da Nang are warm year-round',

        popularLocations: [
            {
                name: 'Da Nang',
                description: 'Fastest-growing expat hub — beaches, mountains, modern infrastructure',
                cost: '~AUD $1,800-2,500/month all-inclusive',
                pros: ['Best beaches', 'Modern city', 'Near Hoi An', 'Lower pollution'],
                cons: ['Typhoon risk Jul-Nov', 'Limited direct flights']
            },
            {
                name: 'Hanoi',
                description: 'Capital city — rich culture, French colonial architecture',
                cost: '~AUD $1,500-2,500/month',
                pros: ['Cultural hub', 'Cooler climate', 'Good expat community'],
                cons: ['Air pollution', 'Busy traffic']
            },
            {
                name: 'Ho Chi Minh City',
                description: 'Modern commercial hub with best international healthcare',
                cost: '~AUD $1,800-3,000/month',
                pros: ['Best hospitals', 'Cosmopolitan', 'Great food scene'],
                cons: ['Hot and humid year-round', 'Heavy traffic']
            }
        ],

        languageBarrier: 'HIGH',
        languageNote: 'Vietnamese is tonal and difficult for English speakers. Tourist areas have English widely spoken.',

        risks: {
            overall: 'MEDIUM',
            currency: 'MEDIUM',
            healthcare: 'MEDIUM',
            political: 'LOW-MEDIUM',
            environmental: 'MEDIUM'
        },

        bestFor: ['Budget retirees', 'Food lovers', 'Cultural immersion', 'Beach lifestyle (Da Nang)', 'Adventure travellers'],
        challenges: [
            'No official retirement visa — long-term legal status can be uncertain',
            'Language barrier for daily life outside expat areas',
            'Air pollution in major cities',
            'Typhoon risk in central Vietnam',
            'Bureaucratic complexity for long-term stays'
        ],

        additionalNotes: [
            'Growing expat community — particularly in Da Nang and HCMC',
            'High-speed internet and modern infrastructure in cities',
            'Australian Embassy in Hanoi; Consulate in HCMC'
        ]
    },

    USA: {
        name: 'United States of America',
        region: 'North America',
        currency: 'USD',
        distanceFromAustralia: 13500,
        flightTime: '16-22 hours',
        overview: 'Family connections, familiar culture and language, but very high cost of living and expensive healthcare',

        socialSecurityAgreement: true,
        agreementDetails: {
            since: '2002',
            coverage: 'US Social Security and Australian Age Pension — periods of coverage can be combined for eligibility'
        },
        agePension: {
            portability: 'PROPORTIONAL_AFTER_26_WEEKS',
            formerResidentRule: true,
            note: 'SSA allows combination of Australian and US work periods. Australian Age Pension portable under SSA.'
        },

        visa: {
            type: 'B-2 Tourist Visa or Green Card (Permanent Resident)',
            duration: 'B-2: up to 6 months. Green Card: permanent.',
            requirements: [
                'No US retirement visa — B-2 tourist allows up to 6 months per year',
                'Green Card via family sponsorship (US citizen child/spouse)',
                'E-3 visa for Australians with specialised skills and US employer',
                'EB-5 Investor Visa: USD $800,000-1,050,000 investment required',
                'Australian citizens eligible for ESTA (Visa Waiver, 90 days)'
            ],
            easeOfAccess: 'HARD',
            cost: 'B-2 visa: ~AUD $200. Green Card: significant legal fees.',
            pathToCitizenship: 'Possible via Green Card after 5 years of permanent residence'
        },

        costOfLiving: {
            index: 0.95,
            breakdown: {
                accommodation: 'AUD $2,000-4,500/month (varies enormously by state/city)',
                food: 'AUD $600-1,200/month',
                transport: 'AUD $300-600/month (car typically essential)',
                utilities: 'AUD $200-350/month'
            },
            note: 'Similar overall cost to Australia but huge regional variation. Florida/Arizona/Midwest cheaper than NY/CA.',
            healthcareNote: 'Critical issue: Medicare (US) only at 65+ if eligible. Private insurance can be AUD $800-2,500/month pre-65.'
        },

        healthcare: {
            system: 'Primarily private — Medicare (US government) from age 65 if US-work-history eligible',
            quality: 'World-class quality at major hospitals; highly specialised care',
            rating: 8.5,
            costs: 'Extremely expensive — a major retirement financial risk. Average retiree spends AUD $500k+ on healthcare in retirement.',
            insurance: 'Medicare Part B premium ~AUD $380/month (2025). Supplement (Medigap) adds another ~AUD $300-600/month.',
            considerations: [
                'Australian Medicare does NOT cover you in the USA',
                'US Medicare requires 10 years US work history or SSA period combination',
                'Travel insurance inadequate for long-term stays — need full US health plan',
                'Healthcare costs are the #1 financial risk for retirees in the USA',
                'Prescription drug costs much higher than Australia'
            ]
        },

        tax: {
            doubleTaxAgreement: true,
            superTaxation: 'Complex — super treated as foreign pension; taxed in Australia. US may also seek to tax. Specialist advice essential.',
            agreementSummary: 'Australia-US DTA (1982) prevents double taxation, but interaction with US super tax rules is complex. Seek specialist tax advice before relocating.',
            residencyThreshold: '183 days or Green Card holder = US tax resident on worldwide income'
        },

        climate: 'Highly variable by state. Florida/Arizona = year-round warm. Northeast = cold winters. California = Mediterranean.',

        popularLocations: [
            {
                name: 'Florida',
                description: 'Most popular retirement state — warm, no state income tax, large Australian/expat community',
                cost: '~AUD $4,500-7,000/month all-inclusive',
                pros: ['No state income tax', 'Warm year-round', 'Large retiree community'],
                cons: ['Hurricane risk', 'Extreme summer heat/humidity', 'Traffic']
            },
            {
                name: 'Arizona',
                description: 'Dry heat, affordable (by US standards), large active retirement communities',
                cost: '~AUD $3,500-5,500/month',
                pros: ['Dry climate (arthritis-friendly)', 'Golf and outdoor activities', 'Lower cost than coastal states'],
                cons: ['Extreme summer heat (45°C+)', 'Car-dependent', 'Far from oceans']
            },
            {
                name: 'California (San Diego)',
                description: 'Near Australia in culture, excellent weather, but very expensive',
                cost: '~AUD $6,000-10,000+/month',
                pros: ['Perfect climate', 'Pacific Ocean', 'Cultural diversity'],
                cons: ['Among most expensive locations', 'High state income tax', 'Traffic']
            }
        ],

        languageBarrier: 'NONE',
        languageNote: 'English-speaking. Australian English fully understood.',

        risks: {
            overall: 'LOW',
            currency: 'MEDIUM',
            healthcare: 'HIGH',
            political: 'LOW-MEDIUM'
        },

        bestFor: ['Family connections (US citizen children/grandchildren)', 'English-speaking preference', 'Medical specialists and top-tier healthcare quality', 'Cultural familiarity'],
        challenges: [
            'No retirement visa — visa pathway is the hardest of all popular destinations',
            'Healthcare costs are extremely high and a major financial risk',
            'Cost of living similar to or higher than Australia',
            'Complex tax interaction between US and Australian systems',
            'Car is essential in most locations',
            'Huge distance from Australia (18-24 hour flight)'
        ],

        additionalNotes: [
            'The US-Australia Social Security Agreement (2002) allows combination of work periods for US Social Security eligibility',
            'US Social Security benefits are taxable in Australia under the DTA',
            'Green Card holders taxed on worldwide income in the USA from day one',
            'FBAR and FATCA reporting obligations apply to financial accounts — specialist advice essential'
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
