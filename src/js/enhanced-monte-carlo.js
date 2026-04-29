// enhanced-monte-carlo.js - Advanced Monte Carlo Simulation Engine
// Enhanced with regime awareness, correlation modeling, and volatility clustering

import { ENHANCED_FINANCIAL_CONFIG } from './enhanced-config.js';
import { randomNormal, median, getCurrentRateRegime, getPropertyCyclePhase } from './utils.js';

export class EnhancedMonteCarloEngine {
    constructor(config) {
        this.config = config;
        this.financialConfig = ENHANCED_FINANCIAL_CONFIG;
        this.regimeState = {
            currentEquityRegime: null,
            currentInterestRegime: null,
            currentPropertyCycle: null,
            regimeDuration: 0,
            volatilityCluster: 'normal'
        };
    }

    // Advanced correlation matrix for Australian assets
    getCorrelationMatrix() {
        const corr = this.financialConfig.monteCarloSimulation.ASSET_CORRELATIONS;
        return {
            equity: {
                bonds: corr.EQUITY_BONDS.value,
                property: corr.EQUITY_PROPERTY.value,
                international: corr.EQUITY_INTERNATIONAL.value,
                cash: corr.EQUITY_CASH.value
            },
            bonds: {
                property: corr.BONDS_PROPERTY.value,
                international: corr.BONDS_INTERNATIONAL.value,
                cash: corr.BONDS_CASH.value
            },
            property: {
                international: corr.PROPERTY_INTERNATIONAL.value,
                cash: corr.PROPERTY_CASH.value
            }
        };
    }

    // Enhanced volatility clustering model
    calculateVolatilityCluster(historicalVolatility, year) {
        // Implement GARCH-like volatility clustering
        const baseVolatility = historicalVolatility || this.financialConfig.monteCarloSimulation.VOLATILITY_CLUSTERING.BASE_VOLATILITY.value;

        // High volatility tends to cluster together
        const volConfig = this.financialConfig.monteCarloSimulation.VOLATILITY_CLUSTERING;
        if (this.regimeState.volatilityCluster === 'high') {
            if (Math.random() < volConfig.HIGH_VOLATILITY_PERSISTENCE.value) {
                return {
                    cluster: 'high',
                    multiplier: volConfig.HIGH_VOLATILITY_MULTIPLIER.value + randomNormal(0, volConfig.VOLATILITY_NOISE.value)
                };
            } else {
                this.regimeState.volatilityCluster = 'normal';
            }
        } else if (this.regimeState.volatilityCluster === 'low') {
            if (Math.random() < volConfig.LOW_VOLATILITY_PERSISTENCE.value) {
                return {
                    cluster: 'low',
                    multiplier: volConfig.LOW_VOLATILITY_MULTIPLIER.value + randomNormal(0, volConfig.VOLATILITY_NOISE.value * 0.5)
                };
            } else {
                this.regimeState.volatilityCluster = 'normal';
            }
        }

        // Normal volatility transitions
        const rand = Math.random();
        if (rand < volConfig.HIGH_VOLATILITY_PROBABILITY.value) {
            this.regimeState.volatilityCluster = 'high';
            return { cluster: 'high', multiplier: volConfig.HIGH_VOLATILITY_MULTIPLIER.value + randomNormal(0, volConfig.VOLATILITY_NOISE.value) };
        } else if (rand < (volConfig.HIGH_VOLATILITY_PROBABILITY.value + volConfig.LOW_VOLATILITY_PROBABILITY.value)) {
            this.regimeState.volatilityCluster = 'low';
            return { cluster: 'low', multiplier: volConfig.LOW_VOLATILITY_MULTIPLIER.value + randomNormal(0, volConfig.VOLATILITY_NOISE.value * 0.5) };
        } else {
            return { cluster: 'normal', multiplier: 1.0 + randomNormal(0, volConfig.VOLATILITY_NOISE.value * 0.5) };
        }
    }

    // Regime-aware return generation with enhanced Australian market modeling
    generateRegimeAwareReturns(baseReturns, year, correlatedShocks = null) {
        const currentYear = 2024 + year;

        // Update regime states
        this.updateMarketRegimes(year);

        const rateRegime = getCurrentRateRegime(currentYear);
        const propertyPhase = getPropertyCyclePhase(year);
        const equityRegime = this.regimeState.currentEquityRegime;

        // Calculate volatility adjustments
        const volCluster = this.calculateVolatilityCluster(this.financialConfig.monteCarloSimulation.VOLATILITY_CLUSTERING.BASE_VOLATILITY.value, year);

        // Generate correlated random shocks if not provided
        const shocks = correlatedShocks || this.generateCorrelatedShocks();

        // Enhanced equity returns with regime awareness
        const equityBaseReturn = equityRegime ?
            equityRegime.baseReturn : baseReturns.equity;
        const equityVolatility = (equityRegime ?
            equityRegime.volatility : this.financialConfig.monteCarloSimulation.VOLATILITY_CLUSTERING.BASE_VOLATILITY.value) * volCluster.multiplier;

        const equityReturn = equityBaseReturn +
            shocks.equity * equityVolatility +
            this.getInterestRateImpact(rateRegime, 'equity');

        // Enhanced bond returns with duration risk modeling
        const bondDurationRisk = this.calculateBondDurationRisk(rateRegime, year);
        const returnCalc = this.financialConfig.monteCarloSimulation.RETURN_CALCULATIONS;
        const bondReturn = baseReturns.bonds +
            shocks.bonds * returnCalc.BOND_VOLATILITY.value * volCluster.multiplier * returnCalc.BOND_VOLATILITY_ADJUSTMENT.value +
            bondDurationRisk;

        // Enhanced property returns with cycle awareness
        const propertyBaseReturn = propertyPhase ?
            propertyPhase.baseReturn : baseReturns.property;
        const propertyVolatility = propertyPhase ?
            propertyPhase.volatility : this.financialConfig.monteCarloSimulation.RETURN_CALCULATIONS.PROPERTY_BASE_VOLATILITY.value;

        const propertyReturn = propertyBaseReturn +
            shocks.property * propertyVolatility +
            this.getInterestRateImpact(rateRegime, 'property') +
            this.getEquitySpilloverEffect(equityReturn);

        // Cash returns directly tied to rate regime
        const cashReturn = Math.max(0,
            rateRegime.rate + shocks.cash * this.financialConfig.monteCarloSimulation.RETURN_CALCULATIONS.CASH_VOLATILITY.value);

        const caps = this.financialConfig.monteCarloSimulation.RETURN_CAPS;
        return {
            equity: Math.max(caps.EQUITY_MIN.value, Math.min(caps.EQUITY_MAX.value, equityReturn)),
            bonds: Math.max(caps.BONDS_MIN.value, Math.min(caps.BONDS_MAX.value, bondReturn)),
            property: Math.max(caps.PROPERTY_MIN.value, Math.min(caps.PROPERTY_MAX.value, propertyReturn)),
            cash: cashReturn,
            regimeInfo: {
                equityRegime: equityRegime?.name,
                interestRegime: rateRegime.name,
                propertyPhase: propertyPhase?.phase,
                volatilityCluster: volCluster.cluster
            }
        };
    }

    // Generate correlated random shocks using Cholesky decomposition
    generateCorrelatedShocks() {
        // Independent random variables
        const z1 = randomNormal(0, 1);
        const z2 = randomNormal(0, 1);
        const z3 = randomNormal(0, 1);
        const z4 = randomNormal(0, 1);

        // Simplified correlation matrix (Cholesky factorization)
        // This creates realistic correlations between Australian asset classes
        const corr = this.financialConfig.monteCarloSimulation.ASSET_CORRELATIONS;
        return {
            equity: z1,
            bonds: corr.EQUITY_BONDS.value * z1 + 0.99 * z2,
            property: corr.EQUITY_PROPERTY.value * z1 + corr.BONDS_PROPERTY.value * z2 + 0.91 * z3,
            cash: corr.EQUITY_CASH.value * z1 + corr.BONDS_CASH.value * z2 + z4,
            international: corr.EQUITY_INTERNATIONAL.value * z1 + 0.66 * z2
        };
    }

    // Update market regime states with transition probabilities
    updateMarketRegimes(year) {
        // Interest rate regime transitions
        if (!this.regimeState.currentInterestRegime ||
            this.regimeState.regimeDuration <= 0) {
            this.transitionInterestRateRegime();
        } else {
            this.regimeState.regimeDuration--;
        }

        // Equity market regime transitions
        if (!this.regimeState.currentEquityRegime || Math.random() < this.financialConfig.monteCarloSimulation.REGIME_TRANSITIONS.EQUITY_REGIME_CHANGE_PROBABILITY.value) {
            this.transitionEquityRegime();
        }

        // Property cycle is handled by existing getPropertyCyclePhase
    }

    // Interest rate regime transition logic
    transitionInterestRateRegime() {
        const regimes = this.config.MARKET_REGIMES.interestRateRegimes;
        const current = this.regimeState.currentInterestRegime;

        // Weighted random selection with transition bias
        let probabilities = regimes.map(r => r.probability);

        // Add transition bias (rates tend to normalize over time)
        if (current) {
            const normalIndex = regimes.findIndex(r => r.name === 'Normal');
            if (normalIndex >= 0 && current.name !== 'Normal') {
                probabilities[normalIndex] *= this.financialConfig.monteCarloSimulation.REGIME_TRANSITIONS.NORMAL_REGIME_BIAS.value;
            }
        }

        // Normalize probabilities
        const total = probabilities.reduce((sum, p) => sum + p, 0);
        probabilities = probabilities.map(p => p / total);

        const rand = Math.random();
        let cumulative = 0;
        for (let i = 0; i < regimes.length; i++) {
            cumulative += probabilities[i];
            if (rand <= cumulative) {
                this.regimeState.currentInterestRegime = regimes[i];
                this.regimeState.regimeDuration = regimes[i].duration +
                    Math.floor(randomNormal(0, this.financialConfig.monteCarloSimulation.REGIME_TRANSITIONS.REGIME_DURATION_NOISE.value));
                break;
            }
        }
    }

    // Equity market regime transition
    transitionEquityRegime() {
        const regimes = this.config.MARKET_REGIMES.equityMarketRegimes;
        const rand = Math.random();
        let cumulative = 0;

        for (const regime of regimes) {
            cumulative += regime.probability;
            if (rand <= cumulative) {
                this.regimeState.currentEquityRegime = regime;
                break;
            }
        }
    }

    // Calculate interest rate impact on different asset classes
    getInterestRateImpact(rateRegime, assetClass) {
        const returnCalc = this.financialConfig.monteCarloSimulation.RETURN_CALCULATIONS;
        const rateChange = rateRegime.rate - returnCalc.NORMAL_RATE_BASELINE.value;

        switch (assetClass) {
            case 'equity':
                // Higher rates generally negative for equities (PV of earnings)
                return rateChange * returnCalc.EQUITY_RATE_SENSITIVITY.value;
            case 'property':
                // Higher rates very negative for property (mortgage costs)
                return rateChange * returnCalc.PROPERTY_RATE_SENSITIVITY.value;
            case 'bonds':
                // Duration risk already handled in bond calculation
                return 0;
            default:
                return 0;
        }
    }

    // Calculate bond duration risk based on rate changes
    calculateBondDurationRisk(rateRegime, year) {
        const returnCalc = this.financialConfig.monteCarloSimulation.RETURN_CALCULATIONS;
        const duration = returnCalc.BOND_DURATION.value;
        const expectedRateChange = rateRegime.rate - returnCalc.NORMAL_RATE_BASELINE.value;

        // Duration risk formula: -Duration × ΔYield
        return -duration * expectedRateChange * 0.01; // Convert to decimal
    }

    // Equity spillover effect to property markets
    getEquitySpilloverEffect(equityReturn) {
        const returnCalc = this.financialConfig.monteCarloSimulation.RETURN_CALCULATIONS;
        // Strong equity performance can spill over to property with lag
        if (equityReturn > returnCalc.EQUITY_SPILLOVER_THRESHOLD_POSITIVE.value) {
            return returnCalc.EQUITY_SPILLOVER_BOOST.value;
        } else if (equityReturn < returnCalc.EQUITY_SPILLOVER_THRESHOLD_NEGATIVE.value) {
            return returnCalc.EQUITY_SPILLOVER_DRAG.value;
        }
        return 0;
    }

    // Advanced Monte Carlo with enhanced modeling
    async runEnhancedMonteCarloSimulation(simulator, inputs, runs = 5000, progressCallback = null) {
        const outcomes = [];
        const paths = [];
        const regimeStats = {
            equityRegimes: new Map(),
            interestRegimes: new Map(),
            propertyPhases: new Map(),
            volatilityClusters: new Map()
        };

        const correlationStats = [];
        const stressTestResults = [];

        // Reset regime state for each simulation run
        for (let i = 0; i < runs; i++) {
            this.resetRegimeState();

            // Generate correlated market scenarios
            const scenarioReturns = this.generateScenarioSequence(inputs);

            // Run simulation with enhanced returns
            const result = simulator.simulateRetirement(inputs, true, null, scenarioReturns);

            outcomes.push(result.finalBalance);
            paths.push(result.balances);

            // Collect regime statistics
            if (result.regimeHistory) {
                this.updateRegimeStats(regimeStats, result.regimeHistory);
            }

            // Run stress tests on a subset of simulations
            if (i % 100 === 0 && i > 0) {
                const stressResult = this.runStressTestVariant(simulator, inputs);
                stressTestResults.push(stressResult);
            }

            if (progressCallback && i % 100 === 0) {
                await progressCallback(i, runs);
            }
        }

        // Sort outcomes and paths together so path↔outcome pairing is preserved
        const _paired = outcomes.map((v, i) => [v, paths[i]]).sort((a, b) => a[0] - b[0]);
        _paired.forEach(([v, p], i) => { outcomes[i] = v; paths[i] = p; });

        const analysis = this.calculateEnhancedStatistics(outcomes, paths, regimeStats);

        return {
            ...analysis,
            regimeAnalysis: this.analyzeRegimeImpacts(regimeStats),
            stressTestResults: this.aggregateStressTests(stressTestResults),
            confidenceIntervals: this.calculateConfidenceIntervals(outcomes),
            tailRiskMetrics: this.calculateTailRiskMetrics(outcomes),
            scenarios: this.generateKeyScenarios(outcomes, paths)
        };
    }

    // Reset regime state for clean simulation runs
    resetRegimeState() {
        this.regimeState = {
            currentEquityRegime: null,
            currentInterestRegime: null,
            currentPropertyCycle: null,
            regimeDuration: 0,
            volatilityCluster: 'normal'
        };
    }

    // Generate complete scenario sequence for a simulation run
    generateScenarioSequence(inputs) {
        const years = Math.max(
            inputs.yourLifespan - inputs.yourCurrentAge,
            inputs.partnerLifespan - inputs.partnerCurrentAge
        );

        const scenarioSequence = [];

        for (let year = 0; year < years; year++) {
            const baseReturnAssumptions = this.financialConfig.monteCarloSimulation.BASE_RETURN_ASSUMPTIONS;

            // De-leverage the blended investment return to find the base equity return,
            // taking into account the user's specific asset allocation.
            const portfolioReturn = inputs.investmentReturn;
            const allocEquities = inputs.allocEquities;
            const allocBonds = inputs.allocBonds;
            const allocCash = inputs.allocCash;

            const bondMultiplier = baseReturnAssumptions.BOND_MULTIPLIER.value;
            const cashBaseReturn = baseReturnAssumptions.CASH_BASE_RETURN.value;

            // R_portfolio = w_eq * R_eq + w_b * R_b + w_c * R_c
            // R_portfolio = w_eq * R_base_eq + w_b * (R_base_eq * bond_multiplier) + w_c * R_cash
            // R_base_eq = (R_portfolio - w_c * R_cash) / (w_eq + w_b * bond_multiplier)
            const denominator = allocEquities + (allocBonds * bondMultiplier);
            let equityEquivalentBase = 0;

            if (denominator > 0) {
                equityEquivalentBase = (portfolioReturn - (allocCash * cashBaseReturn)) / denominator;
            }

            const baseReturns = {
                equity: equityEquivalentBase,
                bonds: equityEquivalentBase * bondMultiplier,
                property: equityEquivalentBase * baseReturnAssumptions.PROPERTY_MULTIPLIER.value, // Assume property scales with equity
                cash: cashBaseReturn
            };

            const returns = this.generateRegimeAwareReturns(baseReturns, year);
            scenarioSequence.push(returns);
        }

        console.log("Base returns for MC simulation:", scenarioSequence[0]);
        return scenarioSequence;
    }

    // Enhanced statistical analysis
    calculateEnhancedStatistics(outcomes, paths, regimeStats) {
        const n = outcomes.length;
        const mean = outcomes.reduce((sum, val) => sum + val, 0) / n;
        const medianOutcome = median(outcomes);

        // Calculate percentiles
        const percentiles = {};
        [1, 5, 10, 25, 50, 75, 90, 95, 99].forEach(p => {
            const index = Math.floor((p / 100) * n);
            percentiles[`p${p}`] = outcomes[Math.min(index, n - 1)];
        });

        // Risk metrics
        const successfulOutcomes = outcomes.filter(o => o > 0);
        const successRate = successfulOutcomes.length / n;

        // Value at Risk (VaR) and Conditional VaR
        const var95 = percentiles.p5;
        const cvar95 = outcomes.filter(o => o <= var95).reduce((sum, val) => sum + val, 0) /
            outcomes.filter(o => o <= var95).length;

        return {
            outcomes,
            paths,
            mean,
            median: medianOutcome,
            percentiles,
            successRate,
            failureRate: 1 - successRate,
            var95,
            cvar95,
            standardDeviation: Math.sqrt(
                outcomes.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n
            ),
            skewness: this.calculateSkewness(outcomes, mean),
            kurtosis: this.calculateKurtosis(outcomes, mean),
            // Legacy support for compatibility with app.js
            percentile10: percentiles.p10,
            percentile90: percentiles.p90,
            // Risk metrics
            shortfallRisk: 1 - successRate,
            tailRisk: percentiles.p5, // 5% worst case
            downside: outcomes.filter(o => o < medianOutcome).length / n
        };
    }

    // Calculate skewness of distribution
    calculateSkewness(outcomes, mean) {
        const n = outcomes.length;
        const variance = outcomes.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
        const stdDev = Math.sqrt(variance);

        const skewness = outcomes.reduce((sum, val) => {
            return sum + Math.pow((val - mean) / stdDev, 3);
        }, 0) / n;

        return skewness;
    }

    // Calculate kurtosis of distribution
    calculateKurtosis(outcomes, mean) {
        const n = outcomes.length;
        const variance = outcomes.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
        const stdDev = Math.sqrt(variance);

        const kurtosis = outcomes.reduce((sum, val) => {
            return sum + Math.pow((val - mean) / stdDev, 4);
        }, 0) / n - 3; // Subtract 3 for excess kurtosis

        return kurtosis;
    }

    // Update regime statistics
    updateRegimeStats(stats, regimeHistory) {
        regimeHistory.forEach(regime => {
            ['equityRegimes', 'interestRegimes', 'propertyPhases', 'volatilityClusters'].forEach(key => {
                if (regime[key]) {
                    const map = stats[key];
                    map.set(regime[key], (map.get(regime[key]) || 0) + 1);
                }
            });
        });
    }

    // Analyze regime impacts on outcomes
    analyzeRegimeImpacts(regimeStats) {
        return {
            mostCommonEquityRegime: this.getMostFrequent(regimeStats.equityRegimes),
            mostCommonInterestRegime: this.getMostFrequent(regimeStats.interestRegimes),
            mostCommonPropertyPhase: this.getMostFrequent(regimeStats.propertyPhases),
            regimeDistributions: {
                equity: Object.fromEntries(regimeStats.equityRegimes),
                interest: Object.fromEntries(regimeStats.interestRegimes),
                property: Object.fromEntries(regimeStats.propertyPhases),
                volatility: Object.fromEntries(regimeStats.volatilityClusters)
            }
        };
    }

    // Helper function to get most frequent regime
    getMostFrequent(map) {
        let maxCount = 0;
        let mostFrequent = null;

        for (const [key, count] of map) {
            if (count > maxCount) {
                maxCount = count;
                mostFrequent = key;
            }
        }

        return { regime: mostFrequent, count: maxCount };
    }

    // Run stress test variants
    runStressTestVariant(simulator, inputs) {
        const stressScenarios = this.config.STRESS_SCENARIOS;
        const scenario = stressScenarios[Math.floor(Math.random() * stressScenarios.length)];

        return simulator.runStressTest(inputs, scenario);
    }

    // Aggregate stress test results
    aggregateStressTests(results) {
        if (results.length === 0) return null;

        return {
            averageStressOutcome: results.reduce((sum, r) => sum + r.finalBalance, 0) / results.length,
            worstStressOutcome: Math.min(...results.map(r => r.finalBalance)),
            stressSuccessRate: results.filter(r => r.finalBalance > 0).length / results.length,
            scenariosTeated: results.length
        };
    }

    // Calculate confidence intervals
    calculateConfidenceIntervals(outcomes) {
        const n = outcomes.length;
        const sortedOutcomes = [...outcomes].sort((a, b) => a - b);

        return {
            ci80: {
                lower: sortedOutcomes[Math.floor(0.1 * n)],
                upper: sortedOutcomes[Math.floor(0.9 * n)]
            },
            ci90: {
                lower: sortedOutcomes[Math.floor(0.05 * n)],
                upper: sortedOutcomes[Math.floor(0.95 * n)]
            },
            ci95: {
                lower: sortedOutcomes[Math.floor(0.025 * n)],
                upper: sortedOutcomes[Math.floor(0.975 * n)]
            }
        };
    }

    // Calculate tail risk metrics
    calculateTailRiskMetrics(outcomes) {
        const n = outcomes.length;
        const sortedOutcomes = [...outcomes].sort((a, b) => a - b);

        // Expected Shortfall (Conditional VaR) at different levels
        const calculateES = (confidence) => {
            const cutoff = Math.floor((1 - confidence) * n);
            const tailOutcomes = sortedOutcomes.slice(0, cutoff);
            return tailOutcomes.reduce((sum, val) => sum + val, 0) / tailOutcomes.length;
        };

        return {
            expectedShortfall99: calculateES(0.99),
            expectedShortfall95: calculateES(0.95),
            expectedShortfall90: calculateES(0.90),
            maxLoss: sortedOutcomes[0],
            tailRatio: Math.abs(sortedOutcomes[0]) / median(outcomes) // Tail risk relative to median
        };
    }

    // Generate key scenarios for user communication
    generateKeyScenarios(outcomes, paths) {
        const n = outcomes.length;
        const sortedIndices = outcomes
            .map((value, index) => ({ value, index }))
            .sort((a, b) => a.value - b.value)
            .map(item => item.index);

        // Separate depleted (≤0) from surviving scenarios
        const depletedCount = outcomes.filter(o => o <= 0).length;
        const depletedRate = depletedCount / n;

        // Build apocalypse tier from depleted scenarios
        const apocalypse = depletedCount > 0 ? {
            depletedCount,
            depletedRate,
            depletedPct: Math.round(depletedRate * 100),
            // Average depletion balance (clamped at 0 for display, but keep raw for context)
            avgDepletedBalance: outcomes
                .filter(o => o <= 0)
                .reduce((sum, v) => sum + v, 0) / depletedCount,
        } : null;

        // worstCase = lowest POSITIVE outcome (first non-depleted from sorted list)
        // Falls back to the absolute worst if every scenario depletes
        const firstPositiveIdx = sortedIndices.findIndex(i => outcomes[i] > 0);
        const worstCaseIdx = firstPositiveIdx >= 0 ? sortedIndices[firstPositiveIdx] : sortedIndices[0];

        // pessimistic = 10th percentile, but ensure it's positive when possible
        const p10RankInSorted = Math.floor(0.1 * n);
        const p10RawIdx = sortedIndices[p10RankInSorted];
        let pessimisticRankInSorted, p10Positive;
        if (outcomes[p10RawIdx] > 0) {
            pessimisticRankInSorted = p10RankInSorted;
            p10Positive = p10RawIdx;
        } else if (firstPositiveIdx >= 0) {
            pessimisticRankInSorted = firstPositiveIdx;
            p10Positive = sortedIndices[firstPositiveIdx];
        } else {
            pessimisticRankInSorted = p10RankInSorted;
            p10Positive = p10RawIdx;
        }
        const pessimisticPercentile = Math.max(1, Math.round((pessimisticRankInSorted / n) * 100));

        return {
            apocalypse,
            worstCase: {
                outcome: outcomes[worstCaseIdx],
                path: paths[worstCaseIdx],
                percentile: 1
            },
            pessimistic: {
                outcome: outcomes[p10Positive],
                path: paths[p10Positive],
                percentile: pessimisticPercentile
            },
            median: {
                outcome: outcomes[sortedIndices[Math.floor(0.5 * n)]],
                path: paths[sortedIndices[Math.floor(0.5 * n)]],
                percentile: 50
            },
            optimistic: {
                outcome: outcomes[sortedIndices[Math.floor(0.9 * n)]],
                path: paths[sortedIndices[Math.floor(0.9 * n)]],
                percentile: 90
            },
            bestCase: {
                outcome: outcomes[sortedIndices[n - 1]],
                path: paths[sortedIndices[n - 1]],
                percentile: 99
            }
        };
    }
}
