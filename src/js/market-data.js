// js/market-data.js - Australian Market Data and Historical Trends

export class MarketDataEngine {
    constructor() {
        this.historicalData = this.initializeHistoricalData();
        this.propertyMarketCycles = this.initializePropertyCycles();
        this.economicIndicators = this.initializeEconomicIndicators();
    }

    initializeHistoricalData() {
        return {
            property: {
                // Historical annual growth rates by city (2020-2025 average)
                sydney: { avgGrowth: 0.035, volatility: 0.15, currentCycle: 'recovery' },
                melbourne: { avgGrowth: 0.028, volatility: 0.12, currentCycle: 'recovery' },
                brisbane: { avgGrowth: 0.084, volatility: 0.18, currentCycle: 'growth' },
                perth: { avgGrowth: 0.099, volatility: 0.22, currentCycle: 'strong-growth' },
                adelaide: { avgGrowth: 0.11, volatility: 0.16, currentCycle: 'strong-growth' },
                canberra: { avgGrowth: 0.045, volatility: 0.14, currentCycle: 'stable' },
                darwin: { avgGrowth: 0.02, volatility: 0.20, currentCycle: 'trough' },
                hobart: { avgGrowth: 0.038, volatility: 0.19, currentCycle: 'recovery' }
            },
            equities: {
                asx200: { avgGrowth: 0.082, volatility: 0.16, dividendYield: 0.042 },
                international: { avgGrowth: 0.095, volatility: 0.18, dividendYield: 0.022 }
            },
            bonds: {
                government: { avgGrowth: 0.032, volatility: 0.06 },
                corporate: { avgGrowth: 0.045, volatility: 0.08 }
            }
        };
    }

    initializePropertyCycles() {
        return {
            // Property cycles typically run 7-10 years in Australia
            cycleLengths: { min: 7, max: 10, average: 8.5 },
            phases: {
                trough: { duration: 1, characteristics: 'Low prices, high yields, buying opportunity' },
                recovery: { duration: 2, characteristics: 'Gradual price increases, improving sentiment' },
                growth: { duration: 3, characteristics: 'Strong price growth, high demand' },
                peak: { duration: 1, characteristics: 'Peak prices, speculation, selling opportunity' },
                decline: { duration: 2, characteristics: 'Price corrections, reduced demand' }
            },
            citySpecificFactors: {
                sydney: { premium: 1.2, volatility: 1.1, migration: 'high' },
                melbourne: { premium: 1.15, volatility: 1.0, migration: 'high' },
                brisbane: { premium: 0.95, volatility: 1.2, migration: 'very-high' },
                perth: { premium: 0.85, volatility: 1.4, migration: 'moderate' },
                adelaide: { premium: 0.75, volatility: 1.1, migration: 'moderate' }
            }
        };
    }

    initializeEconomicIndicators() {
        return {
            interestRates: {
                current: 0.036, // 3.6% as of 2025
                forecast: [0.032, 0.028, 0.030, 0.032], // Next 4 years
                historicalAverage: 0.045
            },
            inflation: {
                general: 0.029, // 2.9% general inflation
                healthcare: 0.065, // 6.5% healthcare inflation
                property: 0.035 // Property-specific inflation
            },
            taxation: {
                cgtDiscount: 0.5, // 50% CGT discount for 12+ months
                corporateRate: 0.30, // 30% corporate tax rate
                frankingBenefit: 0.30 // Franking credit value
            }
        };
    }

    // Get city-specific property recommendations
    getCityRecommendation(city, currentAge, retirementAge, riskTolerance) {
        const cityData = this.historicalData.property[city.toLowerCase()];
        if (!cityData) return null;

        const yearsToRetirement = retirementAge - currentAge;
        const recommendation = {
            city,
            currentCycle: cityData.currentCycle,
            expectedGrowth: cityData.avgGrowth,
            volatility: cityData.volatility
        };

        // Cycle-based timing recommendations
        switch (cityData.currentCycle) {
            case 'trough':
                recommendation.buyTiming = 'Excellent time to buy - prices at cyclical lows';
                recommendation.sellTiming = 'Hold if you can - selling at cycle bottom';
                break;
            case 'recovery':
                recommendation.buyTiming = 'Good time to buy - early in recovery phase';
                recommendation.sellTiming = 'Hold for growth phase - still early cycle';
                break;
            case 'growth':
                recommendation.buyTiming = 'Prices rising - act quickly if buying';
                recommendation.sellTiming = 'Consider holding through peak';
                break;
            case 'peak':
                recommendation.buyTiming = 'Expensive - consider waiting for correction';
                recommendation.sellTiming = 'Excellent time to sell - near peak prices';
                break;
            case 'decline':
                recommendation.buyTiming = 'Wait for trough - prices falling';
                recommendation.sellTiming = 'Sell quickly to avoid further losses';
                break;
        }

        // Time horizon considerations
        if (yearsToRetirement < 5) {
            recommendation.strategy = 'Conservative - focus on capital preservation';
        } else if (yearsToRetirement < 15) {
            recommendation.strategy = 'Balanced - moderate growth with some protection';
        } else {
            recommendation.strategy = 'Growth oriented - long term capital appreciation';
        }

        return recommendation;
    }

    // Get optimal selling timeline based on market cycles
    getOptimalSellingTimeline(city, currentAge, propertyValue, annualRental) {
        const cityData = this.historicalData.property[city.toLowerCase()];
        if (!cityData) return null;

        const scenarios = [];
        const currentYield = annualRental / propertyValue;

        // Current cycle phase timing
        const cyclePhase = cityData.currentCycle;
        let yearsToNextPeak = 0;

        switch (cyclePhase) {
            case 'trough':
                yearsToNextPeak = 6; // Trough + recovery + growth
                break;
            case 'recovery':
                yearsToNextPeak = 4; // Recovery + growth
                break;
            case 'growth':
                yearsToNextPeak = 2; // End of growth phase
                break;
            case 'peak':
                yearsToNextPeak = 8; // Full cycle to next peak
                break;
            case 'decline':
                yearsToNextPeak = 7; // Decline + trough + recovery + growth
                break;
        }

        // Scenario 1: Sell at next peak
        if (yearsToNextPeak > 0) {
            scenarios.push({
                timeline: yearsToNextPeak,
                rationale: 'Sell at next market peak',
                expectedValue: propertyValue * Math.pow(1 + cityData.avgGrowth, yearsToNextPeak),
                confidence: 0.75
            });
        }

        // Scenario 2: Sell when yield exceeds growth expectations
        const breakEvenYears = Math.log(1 + currentYield) / Math.log(1 + cityData.avgGrowth);
        if (breakEvenYears > 5 && breakEvenYears < 20) {
            scenarios.push({
                timeline: Math.round(breakEvenYears),
                rationale: 'Sell when rental yield opportunity cost exceeds growth',
                expectedValue: propertyValue * Math.pow(1 + cityData.avgGrowth, breakEvenYears),
                confidence: 0.65
            });
        }

        // Scenario 3: Age-based recommendations
        const ageBasedSelling = [
            { age: 65, reason: 'Retirement - reduce complexity' },
            { age: 70, reason: 'Simplify estate - reduce management burden' },
            { age: 75, reason: 'Aged care planning - liquidity needs' }
        ];

        ageBasedSelling.forEach(({ age, reason }) => {
            if (age > currentAge) {
                const years = age - currentAge;
                scenarios.push({
                    timeline: years,
                    rationale: reason,
                    expectedValue: propertyValue * Math.pow(1 + cityData.avgGrowth, years),
                    confidence: 0.8
                });
            }
        });

        return scenarios.sort((a, b) => b.confidence - a.confidence);
    }

    // Calculate market-adjusted returns
    getMarketAdjustedReturns(assetType, location, timeHorizon) {
        let baseData;

        switch (assetType) {
            case 'property':
                baseData = this.historicalData.property[location?.toLowerCase()];
                break;
            case 'equities':
                baseData = this.historicalData.equities[location || 'asx200'];
                break;
            case 'bonds':
                baseData = this.historicalData.bonds[location || 'government'];
                break;
            default:
                return null;
        }

        if (!baseData) return null;

        // Adjust for time horizon - longer periods have more mean reversion
        const timeAdjustment = timeHorizon > 10 ? 0.9 : timeHorizon > 5 ? 0.95 : 1.0;

        return {
            expectedReturn: baseData.avgGrowth * timeAdjustment,
            volatility: baseData.volatility * (timeHorizon < 5 ? 1.2 : 1.0),
            confidence: Math.min(0.9, 0.5 + (timeHorizon / 20))
        };
    }

    // Get economic cycle recommendations
    getEconomicCycleRecommendations(currentAge, retirementAge, riskProfile) {
        const recommendations = [];
        const yearsToRetirement = retirementAge - currentAge;
        const indicators = this.economicIndicators;

        // Interest rate cycle recommendations
        if (indicators.interestRates.current < indicators.interestRates.historicalAverage) {
            recommendations.push({
                category: 'Interest Rate Environment',
                recommendation: 'Consider borrowing for investment while rates are low',
                timeFrame: 'Next 2-3 years',
                confidence: 0.8
            });
        }

        // Inflation hedge recommendations
        if (indicators.inflation.general > 0.03) {
            recommendations.push({
                category: 'Inflation Protection',
                recommendation: 'Increase allocation to growth assets and property',
                timeFrame: 'Current high inflation period',
                confidence: 0.75
            });
        }

        // Healthcare cost planning
        if (yearsToRetirement < 20) {
            const healthcareInflation = indicators.inflation.healthcare;
            recommendations.push({
                category: 'Healthcare Costs',
                recommendation: `Plan for ${(healthcareInflation * 100).toFixed(1)}% annual healthcare cost increases`,
                timeFrame: 'Retirement planning',
                confidence: 0.9
            });
        }

        return recommendations;
    }
}

export default MarketDataEngine;