# Usage Examples - Enhanced Australian Retirement Calculator

## Overview

This document provides practical usage examples for the Enhanced Australian Retirement Calculator with Comprehensive Decision Support Engine. Examples range from basic setup to advanced customization and integration scenarios.

## Table of Contents

1. [Basic Setup Examples](#basic-setup-examples)
2. [Input Configuration Examples](#input-configuration-examples)
3. [Recommendation Generation Examples](#recommendation-generation-examples)
4. [Market Analysis Examples](#market-analysis-examples)
5. [Custom Integration Examples](#custom-integration-examples)
6. [Testing Scenarios](#testing-scenarios)
7. [Troubleshooting Examples](#troubleshooting-examples)

## Basic Setup Examples

### 1. Quick Start - Python HTTP Server

```bash
# Navigate to project directory
cd retirement_calculator_au

# Start Python 3 HTTP server
python -m http.server 8000

# Open browser to http://localhost:8000
# Calculator loads automatically with default values
```

### 2. Node.js Development Server

```bash
# Option 1: Using npx serve
npx serve . --port 8000

# Option 2: Using http-server globally
npm install -g http-server
http-server -p 8000 -c-1

# Option 3: Using Express server
node -e "
const express = require('express');
const path = require('path');
const app = express();
app.use(express.static('.'));
app.listen(8000, () => console.log('Server running on http://localhost:8000'));
"
```

### 3. VS Code Live Server

```json
// .vscode/settings.json
{
  "liveServer.settings.port": 8000,
  "liveServer.settings.CustomBrowser": "chrome",
  "liveServer.settings.root": "/",
  "liveServer.settings.file": "index.html"
}
```

### 4. Docker Container Setup

```dockerfile
# Dockerfile
FROM nginx:alpine
COPY . /usr/share/nginx/html
EXPOSE 80

# Build and run
# docker build -t retirement-calc .
# docker run -p 8080:80 retirement-calc
```

```bash
# Build and run commands
docker build -t retirement-calc .
docker run -d -p 8080:80 --name retirement-calculator retirement-calc

# Access at http://localhost:8080
```

## Input Configuration Examples

### 1. Young Professional (Age 28)

```javascript
const youngProfessionalInputs = {
  // Personal Information
  yourCurrentAge: 28,
  partnerCurrentAge: 26,
  retirementAge: 65,
  partnerRetirementAge: 65,
  yourLifespan: 90,
  partnerLifespan: 92,

  // Financial Assets (Starting out)
  yourCurrentSuper: 45000,
  partnerCurrentSuper: 32000,
  currentSavings: 25000,
  currentStocks: 15000,
  homeValue: 0, // Renting

  // Income
  yourSalary: 85000,
  partnerSalary: 65000,
  percentIncomeSaved: 0.15, // 15% savings rate
  monthlyStockContribution: 800,

  // No investment property yet
  hasInvestmentProperty: false,

  // Risk Profile (High - young with time)
  riskTolerance: 85,
  hasEmergencyFund: "partial",
  hasDebt: "minimal",
  dependents: 0,

  // Aggressive allocation
  allocEquities: 80,
  allocBonds: 15,
  allocCash: 5,
  useGlidePath: true,
  glidePathRule: "rule120"
};
```

### 2. Mid-Career Couple with Property (Age 45)

```javascript
const midCareerInputs = {
  // Personal Information
  yourCurrentAge: 45,
  partnerCurrentAge: 43,
  retirementAge: 67,
  partnerRetirementAge: 65,
  yourLifespan: 90,
  partnerLifespan: 92,

  // Financial Assets
  yourCurrentSuper: 280000,
  partnerCurrentSuper: 195000,
  currentSavings: 85000,
  currentStocks: 125000,
  homeValue: 950000,

  // Income
  yourSalary: 125000,
  partnerSalary: 95000,
  percentIncomeSaved: 0.18,
  monthlyStockContribution: 1200,

  // Investment Property
  hasInvestmentProperty: true,
  investmentPropertyValue: 780000,
  propertyLoanBalance: 420000,
  weeklyRental: 580,
  annualPropertyExpenses: 8500,
  propertyLocation: "brisbane",

  // Risk Profile (Moderate)
  riskTolerance: 65,
  hasEmergencyFund: "full",
  hasDebt: "moderate", // Property loans
  dependents: 2,

  // Balanced allocation
  allocEquities: 65,
  allocBonds: 25,
  allocCash: 10,
  useGlidePath: true,
  glidePathRule: "rule110",

  // Australian-specific
  australianEquityAllocation: 70,
  dividendYield: 4.2,
  frankingRate: 70,

  // Healthcare planning
  currentHealthcareCosts: 2800,
  agedCareProbability: 0.65
};
```

### 3. Pre-Retirement Couple (Age 58)

```javascript
const preRetirementInputs = {
  // Personal Information
  yourCurrentAge: 58,
  partnerCurrentAge: 56,
  retirementAge: 65,
  partnerRetirementAge: 62,
  yourLifespan: 88,
  partnerLifespan: 91,

  // Substantial Assets
  yourCurrentSuper: 850000,
  partnerCurrentSuper: 420000,
  currentSavings: 180000,
  currentStocks: 320000,
  homeValue: 1400000,

  // Peak earning years
  yourSalary: 165000,
  partnerSalary: 85000,
  percentIncomeSaved: 0.25, // High savings rate
  monthlyStockContribution: 2000,

  // Multiple properties
  hasInvestmentProperty: true,
  investmentPropertyValue: 1200000,
  propertyLoanBalance: 280000,
  weeklyRental: 750,
  annualPropertyExpenses: 12000,
  propertyLocation: "sydney",

  // Conservative risk approach
  riskTolerance: 45,
  hasEmergencyFund: "full",
  hasDebt: "minimal",
  dependents: 0, // Children independent

  // Conservative allocation
  allocEquities: 45,
  allocBonds: 40,
  allocCash: 15,
  useGlidePath: true,
  glidePathRule: "conservative",

  // Focus on income
  dividendYield: 5.1,
  frankingRate: 85,

  // Healthcare planning critical
  currentHealthcareCosts: 4200,
  healthcareInflation: 0.065,
  agedCareProbability: 0.70,
  agedCareAnnualCost: 75000
};
```

## Recommendation Generation Examples

### 1. Basic Comprehensive Analysis

```javascript
// Basic usage through UI
document.addEventListener('DOMContentLoaded', function() {
  const app = new RetirementCalculatorApp();

  // Generate recommendations when button clicked
  document.getElementById('btnGenerateRecommendations')
    .addEventListener('click', async () => {
      try {
        await app.runRecommendationEngine();
        console.log('Comprehensive recommendations generated');
      } catch (error) {
        console.error('Recommendation generation failed:', error);
      }
    });
});
```

### 2. Programmatic Recommendation Generation

```javascript
import { DecisionSupportEngine } from './js/decision-support-engine.js';
import { RetirementSimulator } from './js/simulator.js';

async function generateCustomRecommendations(userInputs) {
  const simulator = new RetirementSimulator();
  const engine = new DecisionSupportEngine(simulator, userInputs);

  try {
    // Generate all recommendations
    const recommendations = await engine.generateComprehensiveRecommendations();

    // Filter by priority
    const highPriority = recommendations.filter(r => r.priority === 'high');
    const mediumPriority = recommendations.filter(r => r.priority === 'medium');

    console.log(`Generated ${recommendations.length} total recommendations:`);
    console.log(`- ${highPriority.length} high priority`);
    console.log(`- ${mediumPriority.length} medium priority`);

    // Focus on actionable items
    highPriority.forEach(rec => {
      console.log(`\n🔴 HIGH PRIORITY: ${rec.category}`);
      console.log(`Action: ${rec.action}`);
      console.log(`Timing: ${rec.timing}`);
      console.log(`Benefit: ${rec.expectedBenefit}`);
      console.log(`Confidence: ${(rec.confidence * 100).toFixed(0)}%`);
    });

    return recommendations;

  } catch (error) {
    console.error('Failed to generate recommendations:', error);
    return [];
  }
}

// Usage
const inputs = midCareerInputs; // From above examples
const recommendations = await generateCustomRecommendations(inputs);
```

### 3. Category-Specific Analysis

```javascript
async function analyzeSpecificAreas(userInputs, categories = []) {
  const simulator = new RetirementSimulator();
  const engine = new DecisionSupportEngine(simulator, userInputs);

  // Run baseline analysis first
  const baseline = await engine.runBaselineAnalysis();

  const results = {};

  // Analyze specific categories
  if (categories.includes('property') || categories.length === 0) {
    results.property = await engine.analyzeInvestmentProperty(baseline);
  }

  if (categories.includes('trust') || categories.length === 0) {
    results.trust = await engine.analyzeTrustStructures(baseline);
  }

  if (categories.includes('super') || categories.length === 0) {
    results.superannuation = await engine.analyzeSuperannuationStrategy(baseline);
  }

  if (categories.includes('early-retirement') || categories.length === 0) {
    results.earlyRetirement = await engine.analyzeEarlyRetirement(baseline);
  }

  return results;
}

// Example: Focus on property and superannuation
const propertyAndSuperAnalysis = await analyzeSpecificAreas(
  midCareerInputs,
  ['property', 'super']
);

console.log('Property Recommendations:', propertyAndSuperAnalysis.property);
console.log('Super Recommendations:', propertyAndSuperAnalysis.superannuation);
```

## Market Analysis Examples

### 1. Multi-City Property Analysis

```javascript
import { MarketDataEngine } from './js/market-data.js';

const marketEngine = new MarketDataEngine();
const cities = ['sydney', 'melbourne', 'brisbane', 'perth', 'adelaide'];
const currentAge = 40;
const retirementAge = 65;
const riskTolerance = 70;

function analyzeAllCities() {
  console.log('=== AUSTRALIAN PROPERTY MARKET ANALYSIS ===\n');

  cities.forEach(city => {
    const recommendation = marketEngine.getCityRecommendation(
      city,
      currentAge,
      retirementAge,
      riskTolerance
    );

    console.log(`🏙️  ${city.toUpperCase()}`);
    console.log(`Current Phase: ${recommendation.currentCycle}`);
    console.log(`Expected Growth: ${(recommendation.expectedGrowth * 100).toFixed(1)}%`);
    console.log(`Volatility: ${(recommendation.volatility * 100).toFixed(1)}%`);
    console.log(`Buy Timing: ${recommendation.buyTiming}`);
    console.log(`Sell Timing: ${recommendation.sellTiming}`);
    console.log(`Strategy: ${recommendation.strategy}\n`);
  });
}

analyzeAllCities();
```

### 2. Property Selling Timeline Analysis

```javascript
function analyzePropertySelling(city, currentAge, propertyValue, weeklyRent) {
  const marketEngine = new MarketDataEngine();
  const annualRental = weeklyRent * 52;

  const scenarios = marketEngine.getOptimalSellingTimeline(
    city,
    currentAge,
    propertyValue,
    annualRental
  );

  console.log(`=== SELLING TIMELINE ANALYSIS - ${city.toUpperCase()} ===`);
  console.log(`Property Value: $${propertyValue.toLocaleString()}`);
  console.log(`Annual Rental: $${annualRental.toLocaleString()}\n`);

  scenarios.forEach((scenario, index) => {
    console.log(`Option ${index + 1}: ${scenario.timeline} years`);
    console.log(`Rationale: ${scenario.rationale}`);
    console.log(`Expected Value: $${scenario.expectedValue.toLocaleString()}`);
    console.log(`Confidence: ${(scenario.confidence * 100).toFixed(0)}%`);
    console.log(`Capital Growth: $${(scenario.expectedValue - propertyValue).toLocaleString()}\n`);
  });
}

// Example: Brisbane property analysis
analyzePropertySelling('brisbane', 45, 800000, 650);
```

### 3. Economic Indicators Analysis

```javascript
function analyzeEconomicEnvironment() {
  const marketEngine = new MarketDataEngine();
  const currentAge = 50;
  const retirementAge = 67;
  const riskProfile = { tolerance: 60, capacity: 75, requirement: 45 };

  const economicRecs = marketEngine.getEconomicCycleRecommendations(
    currentAge,
    retirementAge,
    riskProfile
  );

  console.log('=== ECONOMIC ENVIRONMENT ANALYSIS ===\n');

  economicRecs.forEach(rec => {
    console.log(`📊 ${rec.category}`);
    console.log(`Recommendation: ${rec.recommendation}`);
    console.log(`Time Frame: ${rec.timeFrame}`);
    console.log(`Confidence: ${(rec.confidence * 100).toFixed(0)}%\n`);
  });

  // Current indicators
  const indicators = marketEngine.economicIndicators;
  console.log('Current Economic Indicators:');
  console.log(`Cash Rate: ${(indicators.interestRates.current * 100).toFixed(1)}%`);
  console.log(`General Inflation: ${(indicators.inflation.general * 100).toFixed(1)}%`);
  console.log(`Healthcare Inflation: ${(indicators.inflation.healthcare * 100).toFixed(1)}%`);
}

analyzeEconomicEnvironment();
```

## Custom Integration Examples

### 1. Custom UI Integration

```html
<!-- Custom recommendation display -->
<div id="customRecommendations" class="recommendation-container">
  <h2>Smart Retirement Recommendations</h2>
  <div id="recommendationTabs">
    <button class="tab-btn active" data-category="all">All</button>
    <button class="tab-btn" data-category="property">Property</button>
    <button class="tab-btn" data-category="super">Superannuation</button>
    <button class="tab-btn" data-category="trust">Trusts</button>
  </div>
  <div id="recommendationContent"></div>
</div>
```

```javascript
class CustomRecommendationDisplay {
  constructor() {
    this.recommendations = [];
    this.currentFilter = 'all';
    this.setupEventListeners();
  }

  setupEventListeners() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.filterRecommendations(e.target.dataset.category);
      });
    });
  }

  async loadRecommendations() {
    const app = new RetirementCalculatorApp();
    const inputs = app.collectInputs();

    const simulator = new RetirementSimulator();
    const engine = new DecisionSupportEngine(simulator, inputs);

    this.recommendations = await engine.generateComprehensiveRecommendations();
    this.displayRecommendations();
  }

  filterRecommendations(category) {
    this.currentFilter = category;
    this.displayRecommendations();

    // Update tab appearance
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.category === category);
    });
  }

  displayRecommendations() {
    let filtered = this.recommendations;

    if (this.currentFilter !== 'all') {
      filtered = this.recommendations.filter(rec =>
        rec.category.toLowerCase().includes(this.currentFilter)
      );
    }

    const content = document.getElementById('recommendationContent');
    content.innerHTML = filtered.map(rec => `
      <div class="recommendation-card priority-${rec.priority}">
        <div class="rec-header">
          <h3>${rec.action}</h3>
          <span class="priority-badge">${rec.priority}</span>
        </div>
        <p class="rec-description">${rec.recommendation}</p>
        <div class="rec-details">
          <span class="timing">⏰ ${rec.timing}</span>
          <span class="confidence">📊 ${(rec.confidence * 100).toFixed(0)}%</span>
        </div>
      </div>
    `).join('');
  }
}

// Initialize custom display
const customDisplay = new CustomRecommendationDisplay();
customDisplay.loadRecommendations();
```

### 2. API-style Integration

```javascript
class RetirementPlannerAPI {
  constructor() {
    this.simulator = new RetirementSimulator();
  }

  async analyzeFinancialSituation(inputs) {
    // Basic analysis
    const baseline = await this.simulator.runMonteCarloSimulation(inputs, 1000);

    return {
      successProbability: baseline.successRate,
      medianFinalBalance: baseline.median,
      confidenceInterval: {
        low: baseline.percentiles['5th'],
        high: baseline.percentiles['95th']
      },
      yearsToDepletion: this.calculateDepletionYear(baseline),
      riskAssessment: this.assessRisk(inputs, baseline)
    };
  }

  async generateStrategicRecommendations(inputs, options = {}) {
    const engine = new DecisionSupportEngine(this.simulator, inputs);
    const recommendations = await engine.generateComprehensiveRecommendations();

    // Format for API consumption
    return {
      summary: {
        totalRecommendations: recommendations.length,
        highPriority: recommendations.filter(r => r.priority === 'high').length,
        averageConfidence: this.calculateAverageConfidence(recommendations)
      },
      recommendations: recommendations.map(this.formatRecommendation),
      categories: this.groupByCategory(recommendations)
    };
  }

  async compareScenarios(baseInputs, scenarios) {
    const results = [];

    // Run baseline
    const baseline = await this.simulator.runMonteCarloSimulation(baseInputs, 1000);
    results.push({ name: 'Current Plan', ...baseline });

    // Run each scenario
    for (const scenario of scenarios) {
      const modifiedInputs = { ...baseInputs, ...scenario.changes };
      const result = await this.simulator.runMonteCarloSimulation(modifiedInputs, 1000);
      results.push({ name: scenario.name, ...result });
    }

    return {
      comparison: results,
      bestScenario: this.findBestScenario(results),
      improvements: this.calculateImprovements(results)
    };
  }

  // Helper methods
  calculateDepletionYear(results) {
    // Implementation to find when funds are depleted
    return results.yearByYearMedians.findIndex(balance => balance <= 0) || null;
  }

  assessRisk(inputs, results) {
    const riskScore = this.simulator.calculateRiskCapacity(inputs);
    return {
      capacity: riskScore,
      tolerance: inputs.riskTolerance,
      recommendation: this.getRiskRecommendation(riskScore, inputs.riskTolerance)
    };
  }

  formatRecommendation(rec) {
    return {
      id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      category: rec.category,
      priority: rec.priority,
      action: rec.action,
      description: rec.recommendation,
      timing: rec.timing,
      expectedBenefit: rec.expectedBenefit,
      confidence: rec.confidence,
      implementation: {
        complexity: this.assessComplexity(rec),
        timeToImplement: this.estimateImplementationTime(rec),
        prerequisites: this.identifyPrerequisites(rec)
      }
    };
  }
}

// Usage example
const api = new RetirementPlannerAPI();

// Analyze current situation
const analysis = await api.analyzeFinancialSituation(userInputs);
console.log('Success Probability:', analysis.successProbability);

// Get recommendations
const recommendations = await api.generateStrategicRecommendations(userInputs);
console.log('Total Recommendations:', recommendations.summary.totalRecommendations);

// Compare scenarios
const scenarios = [
  { name: 'Retire 2 Years Early', changes: { retirementAge: 63 } },
  { name: 'Increase Savings 20%', changes: { percentIncomeSaved: 0.24 } },
  { name: 'Sell Property at 60', changes: { sellPropertyYears: 15 } }
];

const comparison = await api.compareScenarios(userInputs, scenarios);
console.log('Best Scenario:', comparison.bestScenario);
```

### 3. Export and Reporting Integration

```javascript
class AdvancedReportGenerator {
  constructor(app) {
    this.app = app;
  }

  async generateComprehensiveReport(inputs, recommendations) {
    const report = {
      metadata: {
        generatedDate: new Date().toISOString(),
        version: '2.0.0',
        inputHash: this.hashInputs(inputs)
      },
      executiveSummary: await this.generateExecutiveSummary(inputs, recommendations),
      detailedAnalysis: await this.generateDetailedAnalysis(inputs),
      recommendations: this.formatRecommendationsForReport(recommendations),
      projections: await this.generateProjections(inputs),
      appendices: await this.generateAppendices(inputs)
    };

    return report;
  }

  async exportToPDF(report, filename) {
    // Advanced PDF generation with charts and formatting
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');

    // Title page
    this.addTitlePage(doc, report);

    // Executive summary
    this.addExecutiveSummary(doc, report.executiveSummary);

    // Recommendations with priority indicators
    this.addRecommendationsSection(doc, report.recommendations);

    // Charts and projections
    await this.addChartsSection(doc, report.projections);

    // Save
    doc.save(filename || 'retirement-strategy-report.pdf');
  }

  async exportToExcel(report, filename) {
    const XLSX = window.XLSX;
    const workbook = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = this.prepareSummarySheet(report);
    const summarySheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Executive Summary');

    // Recommendations sheet
    const recData = this.prepareRecommendationsSheet(report.recommendations);
    const recSheet = XLSX.utils.json_to_sheet(recData);
    XLSX.utils.book_append_sheet(workbook, recSheet, 'Recommendations');

    // Projections sheet
    const projData = this.prepareProjectionsSheet(report.projections);
    const projSheet = XLSX.utils.json_to_sheet(projData);
    XLSX.utils.book_append_sheet(workbook, projSheet, 'Year-by-Year Projections');

    // Save
    XLSX.writeFile(workbook, filename || 'retirement-analysis.xlsx');
  }

  // Implementation methods would go here...
}

// Usage
const reportGen = new AdvancedReportGenerator(app);
const report = await reportGen.generateComprehensiveReport(inputs, recommendations);
await reportGen.exportToPDF(report, 'my-retirement-strategy.pdf');
```

## Testing Scenarios

### 1. Edge Case Testing

```javascript
const testScenarios = [
  {
    name: "Very Young Starter",
    inputs: {
      yourCurrentAge: 22,
      retirementAge: 65,
      yourCurrentSuper: 5000,
      yourSalary: 55000,
      // ... minimal assets
    }
  },
  {
    name: "High Net Worth",
    inputs: {
      yourCurrentAge: 50,
      retirementAge: 60,
      yourCurrentSuper: 2800000, // Near $3M threshold
      yourSalary: 350000,
      homeValue: 3500000,
      // ... substantial assets
    }
  },
  {
    name: "Late Starter",
    inputs: {
      yourCurrentAge: 55,
      retirementAge: 67,
      yourCurrentSuper: 120000, // Below average
      yourSalary: 75000,
      // ... catching up scenario
    }
  }
];

async function runTestScenarios() {
  const results = [];

  for (const scenario of testScenarios) {
    console.log(`\n=== Testing: ${scenario.name} ===`);

    try {
      const simulator = new RetirementSimulator();
      const engine = new DecisionSupportEngine(simulator, scenario.inputs);

      const recommendations = await engine.generateComprehensiveRecommendations();

      results.push({
        scenario: scenario.name,
        success: true,
        recommendationCount: recommendations.length,
        highPriorityCount: recommendations.filter(r => r.priority === 'high').length,
        categories: [...new Set(recommendations.map(r => r.category))]
      });

      console.log(`✅ Generated ${recommendations.length} recommendations`);

    } catch (error) {
      results.push({
        scenario: scenario.name,
        success: false,
        error: error.message
      });

      console.log(`❌ Failed: ${error.message}`);
    }
  }

  return results;
}

// Run tests
runTestScenarios().then(results => {
  console.log('\n=== TEST RESULTS ===');
  results.forEach(result => {
    console.log(`${result.scenario}: ${result.success ? '✅ PASS' : '❌ FAIL'}`);
  });
});
```

### 2. Performance Testing

```javascript
async function performanceTest() {
  const testInputs = midCareerInputs; // Use standard inputs

  console.log('=== PERFORMANCE TESTING ===\n');

  // Test Monte Carlo performance
  const mcTests = [100, 500, 1000, 5000];

  for (const runs of mcTests) {
    const startTime = performance.now();

    const simulator = new RetirementSimulator();
    await simulator.runMonteCarloSimulation(testInputs, runs);

    const endTime = performance.now();
    const duration = endTime - startTime;

    console.log(`Monte Carlo ${runs} runs: ${duration.toFixed(0)}ms`);
  }

  // Test recommendation engine performance
  const recStartTime = performance.now();

  const engine = new DecisionSupportEngine(new RetirementSimulator(), testInputs);
  const recommendations = await engine.generateComprehensiveRecommendations();

  const recEndTime = performance.now();
  const recDuration = recEndTime - recStartTime;

  console.log(`\nRecommendation Engine: ${recDuration.toFixed(0)}ms`);
  console.log(`Generated ${recommendations.length} recommendations`);
  console.log(`Average time per recommendation: ${(recDuration / recommendations.length).toFixed(1)}ms`);
}

performanceTest();
```

## Troubleshooting Examples

### 1. Common Setup Issues

```javascript
// Debug ES6 module loading
function debugModuleLoading() {
  console.log('=== MODULE LOADING DEBUG ===');

  // Check if served via HTTP
  if (window.location.protocol === 'file:') {
    console.error('❌ Files served via file:// protocol');
    console.log('✅ Solution: Use HTTP server (python -m http.server 8000)');
    return false;
  }

  // Check browser support
  const hasModuleSupport = 'noModule' in HTMLScriptElement.prototype;
  console.log(`Module Support: ${hasModuleSupport ? '✅' : '❌'}`);

  // Test module import
  try {
    import('./js/config.js').then(config => {
      console.log('✅ Module import successful');
      console.log('Config loaded:', Object.keys(config));
    });
  } catch (error) {
    console.error('❌ Module import failed:', error);
  }

  return true;
}

// Debug input validation
function debugInputValidation(inputs) {
  console.log('=== INPUT VALIDATION DEBUG ===');

  const required = [
    'yourCurrentAge', 'retirementAge', 'yourCurrentSuper',
    'yourSalary', 'riskTolerance'
  ];

  const missing = required.filter(field =>
    inputs[field] === undefined || inputs[field] === null || inputs[field] === ''
  );

  if (missing.length > 0) {
    console.error('❌ Missing required fields:', missing);
    return false;
  }

  // Validate ranges
  const validations = [
    { field: 'yourCurrentAge', min: 18, max: 100 },
    { field: 'retirementAge', min: 55, max: 100 },
    { field: 'riskTolerance', min: 0, max: 100 }
  ];

  const invalid = validations.filter(v =>
    inputs[v.field] < v.min || inputs[v.field] > v.max
  );

  if (invalid.length > 0) {
    console.error('❌ Invalid field values:', invalid);
    return false;
  }

  console.log('✅ All inputs valid');
  return true;
}

// Debug recommendation generation
async function debugRecommendationGeneration(inputs) {
  console.log('=== RECOMMENDATION GENERATION DEBUG ===');

  try {
    const simulator = new RetirementSimulator();
    console.log('✅ Simulator created');

    const baseline = await simulator.runMonteCarloSimulation(inputs, 100);
    console.log('✅ Baseline simulation completed');
    console.log(`   Success rate: ${(baseline.successRate * 100).toFixed(1)}%`);

    const engine = new DecisionSupportEngine(simulator, inputs);
    console.log('✅ Decision engine created');

    const recommendations = await engine.generateComprehensiveRecommendations();
    console.log('✅ Recommendations generated');
    console.log(`   Total: ${recommendations.length}`);
    console.log(`   High priority: ${recommendations.filter(r => r.priority === 'high').length}`);

    return recommendations;

  } catch (error) {
    console.error('❌ Generation failed:', error);
    console.error('Stack trace:', error.stack);
    return null;
  }
}
```

### 2. Error Recovery Examples

```javascript
class RobustRecommendationEngine {
  constructor() {
    this.fallbackStrategies = ['comprehensive', 'basic', 'minimal'];
  }

  async generateWithFallback(inputs) {
    for (const strategy of this.fallbackStrategies) {
      try {
        return await this.tryStrategy(strategy, inputs);
      } catch (error) {
        console.warn(`Strategy ${strategy} failed:`, error.message);
        continue;
      }
    }

    // All strategies failed
    return this.getEmergencyRecommendations(inputs);
  }

  async tryStrategy(strategy, inputs) {
    switch (strategy) {
      case 'comprehensive':
        return await this.runComprehensiveEngine(inputs);

      case 'basic':
        return await this.runBasicEngine(inputs);

      case 'minimal':
        return await this.runMinimalAnalysis(inputs);

      default:
        throw new Error(`Unknown strategy: ${strategy}`);
    }
  }

  async runComprehensiveEngine(inputs) {
    const simulator = new RetirementSimulator();
    const engine = new DecisionSupportEngine(simulator, inputs);
    return await engine.generateComprehensiveRecommendations();
  }

  async runBasicEngine(inputs) {
    const simulator = new RetirementSimulator();
    const engine = new RecommendationEngine(simulator, inputs);
    return await engine.generateRecommendations();
  }

  async runMinimalAnalysis(inputs) {
    // Minimal fallback analysis
    const recommendations = [];

    // Basic retirement readiness
    const yearsToRetirement = inputs.retirementAge - inputs.yourCurrentAge;
    const totalSuper = inputs.yourCurrentSuper + inputs.partnerCurrentSuper;

    if (totalSuper < 500000 && yearsToRetirement > 15) {
      recommendations.push({
        category: 'Superannuation',
        priority: 'high',
        action: 'Increase superannuation contributions',
        recommendation: 'Your super balance appears low for your age. Consider increasing contributions.',
        confidence: 0.8
      });
    }

    return recommendations;
  }

  getEmergencyRecommendations(inputs) {
    return [{
      category: 'System',
      priority: 'high',
      action: 'Consult financial advisor',
      recommendation: 'The recommendation system encountered errors. Please consult a qualified financial advisor for personalized advice.',
      confidence: 1.0
    }];
  }
}

// Usage
const robustEngine = new RobustRecommendationEngine();
const recommendations = await robustEngine.generateWithFallback(userInputs);
```

This comprehensive usage documentation provides practical examples for every aspect of the Enhanced Australian Retirement Calculator, from basic setup to advanced integration and troubleshooting scenarios.
