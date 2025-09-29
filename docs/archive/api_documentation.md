# API Documentation - Retirement Calculator Decision Support Engine

## Overview

This document provides comprehensive API documentation for the Enhanced Australian Retirement Calculator's Decision Support Engine. The system is built with ES6 modules and provides both basic simulation capabilities and advanced AI-powered recommendation generation.

## Architecture

The system follows a modular architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────┐
│                   User Interface                │
│                   (index.html)                  │
└─────────────────┬───────────────────────────────┘
                  │
┌─────────────────▼───────────────────────────────┐
│              Application Controller              │
│                   (app.js)                      │
└─┬───────────────────────────────────────────────┘
  │
  ├─► Market Data Engine (market-data.js)
  ├─► Decision Support Engine (decision-support-engine.js)
  ├─► Simulation Engine (simulator.js)
  ├─► Chart Manager (charts.js)
  ├─► Configuration (config.js)
  └─► Utilities (utils.js)
```

## Core Classes and APIs

### 1. DecisionSupportEngine (`js/decision-support-engine.js`)

#### Constructor
```javascript
new DecisionSupportEngine(simulator, inputs)
```

**Parameters:**
- `simulator` (RetirementSimulator): Instance of the core simulation engine
- `inputs` (Object): User input data containing financial information

**Example:**

```javascript
import { DecisionSupportEngine } from './js/decision-support-engine.js';
import { RetirementSimulator } from './simulator.js';

const simulator = new RetirementSimulator();
const inputs = collectUserInputs(); // Your input collection function
const engine = new DecisionSupportEngine(simulator, inputs);
```

#### Main Methods

##### `generateComprehensiveRecommendations()`
Generates comprehensive recommendations across all 8 strategic areas.

**Returns:** `Promise<Array<RecommendationObject>>`

**Example:**
```javascript
const recommendations = await engine.generateComprehensiveRecommendations();
console.log(`Generated ${recommendations.length} recommendations`);
```

**RecommendationObject Structure:**
```javascript
{
  category: string,           // e.g., "Home Ownership", "Investment Property"
  priority: string,           // "high", "medium", "low"
  action: string,             // Recommended action
  timing: string,             // When to implement
  expectedBenefit: string,    // Expected financial benefit
  recommendation: string,     // Detailed explanation
  confidence: number,         // 0.0 - 1.0 confidence score
  successRate?: number,       // Optional success rate if calculated
  medianBalance?: number,     // Optional projected balance
  additionalBenefits?: string // Optional additional considerations
}
```

#### Individual Analysis Methods

##### `analyzeHomeOwnership(baseline)`
Analyzes downsizing strategies and home ownership optimization.

**Parameters:**
- `baseline` (Object): Baseline simulation results

**Returns:** `Promise<Array<RecommendationObject>>`

##### `analyzeInvestmentProperty(baseline)`
Analyzes investment property buy/hold/sell strategies with market timing.

##### `analyzeStocksAndShares(baseline)`
Analyzes stock portfolio optimization and liquidation strategies.

##### `analyzeTrustStructures(baseline)`
Evaluates family trust, SMSF, and other trust structure benefits.

##### `analyzeEarlyRetirement(baseline)`
Assesses feasibility of early retirement scenarios.

##### `analyzeInvestmentOptimization(baseline)`
Optimizes monthly contributions and savings rates.

##### `analyzeSuperannuationStrategy(baseline)`
Optimizes superannuation contributions and tax strategies (2025 compliant).

##### `analyzeAdditionalStrategies(baseline)`
Covers healthcare, insurance, estate planning, and other strategies.

### 2. MarketDataEngine (`js/market-data.js`)

#### Constructor
```javascript
new MarketDataEngine()
```

Initializes with historical Australian property market data and economic indicators.

#### Key Methods

##### `getCityRecommendation(city, currentAge, retirementAge, riskTolerance)`
Gets property market recommendations for a specific Australian city.

**Parameters:**
- `city` (string): "sydney", "melbourne", "brisbane", "perth", "adelaide", "canberra"
- `currentAge` (number): Current age
- `retirementAge` (number): Planned retirement age
- `riskTolerance` (number): Risk tolerance score (0-100)

**Returns:** `Object`
```javascript
{
  city: string,
  currentCycle: string,        // "trough", "recovery", "growth", "peak", "decline"
  expectedGrowth: number,      // Expected annual growth rate
  volatility: number,          // Market volatility
  buyTiming: string,           // Buy timing recommendation
  sellTiming: string,          // Sell timing recommendation
  strategy: string             // Overall strategy recommendation
}
```

**Example:**
```javascript
const marketEngine = new MarketDataEngine();
const advice = marketEngine.getCityRecommendation("brisbane", 45, 65, 75);
console.log(advice.buyTiming); // "Prices rising - act quickly if buying"
```

##### `getOptimalSellingTimeline(city, currentAge, propertyValue, annualRental)`
Provides multiple selling scenarios with timing and value projections.

**Returns:** `Array<ScenarioObject>`
```javascript
{
  timeline: number,           // Years from now
  rationale: string,          // Why this timing
  expectedValue: number,      // Projected property value
  confidence: number          // Confidence in projection
}
```

##### `getMarketAdjustedReturns(assetType, location, timeHorizon)`
Calculates market-adjusted returns for different asset types.

**Parameters:**
- `assetType` (string): "property", "equities", "bonds"
- `location` (string): City or market identifier
- `timeHorizon` (number): Investment time horizon in years

### 3. RetirementSimulator (`js/simulator.js`)

#### Key Methods

##### `runMonteCarloSimulation(inputs, runs, progressCallback)`
Runs Monte Carlo simulation with specified number of iterations.

**Parameters:**
- `inputs` (Object): User financial inputs
- `runs` (number): Number of simulation runs (typically 1000-10000)
- `progressCallback` (Function): Optional callback for progress updates

**Returns:** `Promise<MonteCarloResult>`
```javascript
{
  successRate: number,        // Probability of success (0-1)
  median: number,             // Median final balance
  percentiles: Object,        // 5th, 25th, 75th, 95th percentiles
  allRuns: Array<number>,     // All simulation results
  yearByYearMedians: Array    // Year-by-year median projections
}
```

##### `calculateRiskCapacity(inputs)` & `calculateRiskRequirement(inputs)`
Calculates 3-dimensional risk profile (capacity/tolerance/requirement).

**Returns:** `number` (0-100 risk score)

##### `simulateRetirement(inputs, useMonteCarloVar)`
Runs deterministic retirement simulation.

**Returns:** `Object` (Detailed year-by-year projections)

### 4. Application Controller (`js/app.js`)

#### Main Class: RetirementCalculatorApp

##### `runRecommendationEngine()`
Main method to generate comprehensive AI recommendations.

**Usage:**
```javascript
const app = new RetirementCalculatorApp();
await app.runRecommendationEngine();
```

This method:
1. Collects user inputs
2. Initializes decision support engine
3. Generates comprehensive recommendations
4. Updates UI with results
5. Provides fallback to basic recommendations if needed

##### `collectInputs()`
Collects and validates all user inputs from the form.

**Returns:** `Object` (Complete user input data structure)

#### Input Data Structure

The system expects a comprehensive input object with the following structure:

```javascript
{
  // Personal Information
  yourCurrentAge: number,
  partnerCurrentAge: number,
  retirementAge: number,
  partnerRetirementAge: number,
  yourLifespan: number,
  partnerLifespan: number,

  // Financial Assets
  yourCurrentSuper: number,
  partnerCurrentSuper: number,
  currentSavings: number,
  currentStocks: number,
  homeValue: number,

  // Income
  yourSalary: number,
  partnerSalary: number,
  percentIncomeSaved: number,
  monthlyStockContribution: number,

  // Investment Property
  hasInvestmentProperty: boolean,
  investmentPropertyValue: number,
  propertyLoanBalance: number,
  weeklyRental: number,
  annualPropertyExpenses: number,
  propertyLocation: string,        // For market analysis

  // Risk Profile
  riskTolerance: number,          // 0-100
  hasEmergencyFund: string,       // "full", "partial", "minimal", "none"
  hasDebt: string,                // "none", "minimal", "moderate", "high"
  dependents: number,

  // Asset Allocation
  allocEquities: number,
  allocBonds: number,
  allocCash: number,
  useGlidePath: boolean,
  glidePathRule: string,          // "rule110", "rule120", "conservative"

  // Australian-Specific
  australianEquityAllocation: number,
  dividendYield: number,
  frankingRate: number,

  // Healthcare & Aged Care
  currentHealthcareCosts: number,
  healthcareInflation: number,
  agedCareProbability: number,
  agedCareAnnualCost: number,
  agedCareDuration: number,

  // Economic Assumptions
  inflationRate: number,
  superReturn: number,
  propertyGrowthRate: number,
  equityReturn: number,
  bondReturn: number,
  cashReturn: number,

  // Planning Options
  planToDownsize: boolean,
  downsizeAge: number,
  sellPropertyYears: number
}
```

## Usage Examples

### Basic Recommendation Generation

```javascript
// Initialize application
const app = new RetirementCalculatorApp();

// Generate comprehensive recommendations
try {
  await app.runRecommendationEngine();
  console.log('Recommendations generated successfully');
} catch (error) {
  console.error('Failed to generate recommendations:', error);
}
```

### Custom Market Analysis

```javascript
import { MarketDataEngine } from './js/market-data.js';

const marketEngine = new MarketDataEngine();

// Get property recommendations for Brisbane
const brisbaneAdvice = marketEngine.getCityRecommendation(
  "brisbane",
  40,     // current age
  65,     // retirement age
  80      // risk tolerance
);

console.log(`Brisbane market: ${brisbaneAdvice.currentCycle} phase`);
console.log(`Buy timing: ${brisbaneAdvice.buyTiming}`);
console.log(`Sell timing: ${brisbaneAdvice.sellTiming}`);

// Get selling timeline scenarios
const sellingOptions = marketEngine.getOptimalSellingTimeline(
  "brisbane",
  40,       // current age
  800000,   // property value
  41600     // annual rental ($800/week)
);

sellingOptions.forEach(option => {
  console.log(`${option.timeline} years: ${option.rationale}`);
  console.log(`Expected value: $${option.expectedValue.toLocaleString()}`);
  console.log(`Confidence: ${(option.confidence * 100).toFixed(0)}%\n`);
});
```

### Direct Engine Usage

```javascript
import { DecisionSupportEngine } from './js/decision-support-engine.js';
import { RetirementSimulator } from './js/simulator.js';

// Setup
const simulator = new RetirementSimulator();
const inputs = {
  // ... your input data
};

const engine = new DecisionSupportEngine(simulator, inputs);

// Generate specific category recommendations
const homeRecommendations = await engine.analyzeHomeOwnership(baseline);
const propertyRecommendations = await engine.analyzeInvestmentProperty(baseline);
const trustRecommendations = await engine.analyzeTrustStructures(baseline);

// Or generate all recommendations
const allRecommendations = await engine.generateComprehensiveRecommendations();

// Process recommendations
allRecommendations.forEach(rec => {
  console.log(`${rec.priority.toUpperCase()}: ${rec.action}`);
  console.log(`Category: ${rec.category}`);
  console.log(`Timing: ${rec.timing}`);
  console.log(`Benefit: ${rec.expectedBenefit}`);
  console.log(`Confidence: ${(rec.confidence * 100).toFixed(0)}%`);
  console.log(`Details: ${rec.recommendation}\n`);
});
```

## Error Handling

The system includes comprehensive error handling:

### Graceful Degradation
```javascript
// The main recommendation engine includes fallback
async runRecommendationEngine() {
  try {
    // Try comprehensive engine
    const comprehensiveEngine = new DecisionSupportEngine(this.simulator, inputs);
    const recommendations = await comprehensiveEngine.generateComprehensiveRecommendations();
    this.displayComprehensiveRecommendations(recommendations);
  } catch (error) {
    // Fallback to basic engine
    const basicEngine = new RecommendationEngine(this.simulator, inputs);
    const basicRecommendations = await basicEngine.generateRecommendations();
    this.displayRecommendations(basicRecommendations);
  }
}
```

### Input Validation
The system validates inputs and provides sensible defaults for missing values:

```javascript
// Example from input collection
yourCurrentAge: safeGetValue('yourCurrentAge', 49),  // Default to 49 if missing
retirementAge: Math.max(55, safeGetValue('retirementAge', 67)), // Min 55
```

## Performance Considerations

### Asynchronous Processing
All heavy computations are asynchronous to prevent UI blocking:

```javascript
// Monte Carlo simulations use chunked processing
for (let run = 0; run < totalRuns; run += chunkSize) {
  const chunkRuns = Math.min(chunkSize, totalRuns - run);
  // Process chunk
  await new Promise(resolve => setTimeout(resolve, 0)); // Yield to UI
}
```

### Memory Management
Charts and large datasets are properly cleaned up:

```javascript
// Chart cleanup
if (this.charts.portfolioBalance) {
  this.charts.portfolioBalance.destroy();
  this.charts.portfolioBalance = null;
}
```

## Browser Support

### ES6 Module Requirements
```javascript
// All modules use ES6 import/export
import { DecisionSupportEngine } from './decision-support-engine.js';
export class MarketDataEngine { ... }
export default DecisionSupportEngine;
```

### File Serving Requirements
```bash
# Must be served via HTTP, not file://
python -m http.server 8000
# Then access via http://localhost:8000
```

## Testing and Validation

### Manual Testing Checklist
1. Test with various input combinations
2. Verify Australian tax calculations
3. Validate property market recommendations
4. Check Monte Carlo simulation accuracy
5. Test error handling and fallbacks

### Calculation Verification
```javascript
// Example validation against known benchmarks
const testInputs = {
  yourCurrentAge: 45,
  retirementAge: 65,
  yourCurrentSuper: 200000,
  // ... other test data
};

const result = await simulator.runMonteCarloSimulation(testInputs, 1000);
console.assert(result.successRate >= 0 && result.successRate <= 1);
console.assert(result.median > 0);
```

## Configuration

Key configuration constants are defined in `config.js`:

```javascript
export const ENHANCED_CONFIG = {
  SUPER_GUARANTEE_RATE: 0.12,
  CURRENT_FINANCIAL_YEAR: '2024-25',

  // 2025 Contribution Caps
  SUPER_CAPS: {
    CONCESSIONAL: 30000,
    NON_CONCESSIONAL: 120000,
    TRANSFER_BALANCE: 2000000,
    THREE_MILLION_TAX_THRESHOLD: 3000000
  },

  // Tax brackets, pension thresholds, etc.
};
```

This API documentation provides developers with comprehensive information needed to integrate with, extend, or contribute to the Enhanced Australian Retirement Calculator's Decision Support Engine.