# Developer Guide - Enhanced Australian Retirement Calculator

This guide provides all the information you need to set up, develop, and contribute to the Enhanced Australian Retirement Calculator.

## Table of Contents
1. [Project Overview](#1-project-overview)
    - [Architecture](#architecture)
2. [Setup and Installation](#2-setup-and-installation)
    - [Prerequisites](#prerequisites)
    - [Quick Setup](#quick-setup)
    - [Detailed Instructions](#detailed-instructions)
    - [Platform-Specific Instructions](#platform-specific-instructions)
    - [Docker Setup](#docker-setup)
3. [Production Deployment](#3-production-deployment)
    - [Static Site Hosting](#static-site-hosting)
    - [Server Configuration](#server-configuration)
4. [Core Components (API)](#4-core-components-api)
    - [`RetirementCalculatorApp`](#retirementcalculatorapp-jsappjs)
    - [`RetirementSimulator`](#retirementsimulator-jssimulatorjs)
    - [`SuggestionEngine`](#suggestionengine-jssuggestion-enginejs)
    - [`ContextualIntelligenceSystem`](#contextualintelligencesystem-jscontextual-intelligencejs)
    - [`OnboardingSystem`](#onboardingsystem-jsonboardingjs)
    - [`Configuration`](#configuration-jsconfigjs)
5. [Development Workflow](#5-development-workflow)
    - [Running Tests & Verification](#running-tests--verification)
    - [Coding Conventions](#coding-conventions)
6. [Troubleshooting](#6-troubleshooting)

---

## 1. Project Overview

The Enhanced Australian Retirement Calculator is a sophisticated, client-side web application designed to provide detailed retirement projections and actionable advice based on Australian financial regulations. It uses Monte Carlo simulations, a contextual intelligence engine, and a persona-based analysis system to deliver personalized insights.

### Architecture

The application is built with modern JavaScript (ES6 modules) and follows a modular architecture.

```
┌──────────────────────────────────┐
│          User Interface          │
│          (index.html)            │
└───────────┬──────────────────────┘
            │
┌───────────▼──────────────────────┐
│       Application Controller     │
│            (app.js)              │
└─┬─────────┬─────────┬────────────┘
  │         │         │
  ▼         ▼         ▼
┌─────────┐┌─────────┐┌─────────┐
│Simulator│Suggestion│ Charting  │
│ Engine  │  Engine  │ Manager   │
└─────────┘└─────────┘└─────────┘
  ▲         ▲         ▲
  │         │         │
┌─┴─────────┴─────────┴──────────┐
│      Supporting Modules        │
│(config, utils, market-data)    │
└────────────────────────────────┘
```

-   **`app.js`**: The main application controller that orchestrates all other modules.
-   **`simulator.js`**: The core engine for running retirement and Monte Carlo simulations.
-   **`suggestion-engine.js`**: Generates actionable recommendations and "quick wins".
-   **`contextual-intelligence.js`**: Provides persona analysis, alerts, and guidance.
-   **`onboarding.js`**: Manages the step-by-step onboarding process for new users.
-   **`config.js`**: Contains all financial constants, tax brackets, and default values. All figures are updated for the 2025-26 financial year.
-   **`utils.js`**: Helper functions for DOM manipulation, formatting, and data export.

## 2. Setup and Installation

### Prerequisites
-   A modern web browser (Chrome 80+, Firefox 75+, Safari 13+, Edge 80+).
-   Node.js and npm for dependency management.
-   Python 3 (for the simplest local server).

### Quick Setup

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd retirement-calculator
    ```
2.  **Install dependencies:**
    ```bash
    npm install
    ```
3.  **Start the local server:**
    ```bash
    npm start
    ```
    This will start a local server, typically at `http://localhost:8000`.

### Detailed Instructions
The project is a static web application but relies on ES6 modules, which require it to be served over HTTP (not the `file://` protocol).

#### Option 1: npm (Recommended)
The `package.json` includes a `serve` script that uses the `http-server` package.
```bash
# Install dependencies
npm install

# Run the development server
npm start
```

#### Option 2: Python HTTP Server
If you have Python 3 installed, this is a simple way to serve the files.
```bash
# From the project root directory
python -m http.server 8000
```
Then, open `http://localhost:8000` in your browser.

### Platform-Specific Instructions

#### Windows
-   Use Command Prompt or PowerShell to navigate to the project directory.
-   If `python` or `node` commands are not found, ensure they are installed and added to your system's PATH.

#### macOS
-   Use the built-in Terminal.
-   Python 3 is usually pre-installed (`python3`).
-   Consider using Homebrew (`brew install node`) for easy Node.js installation.

#### Linux (Ubuntu/Debian)
-   Use the Terminal.
-   Install Python and Node.js via `apt`:
    ```bash
    sudo apt update
    sudo apt install python3 nodejs npm
    ```

### Docker Setup
For a consistent development environment, you can use Docker.

#### Dockerfile
```dockerfile
FROM nginx:alpine

# Copy project files
COPY . /usr/share/nginx/html

# Expose port 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

#### Build and Run
```bash
# Build the Docker image
docker build -t retirement-calculator .

# Run the container
docker run -d -p 8080:80 --name retirement-calc retirement-calculator
```
Access the application at `http://localhost:8080`.

## 3. Production Deployment

### Static Site Hosting
The project can be easily deployed to any static site hosting provider.
-   **Netlify/Vercel:** Connect your Git repository for automatic deployments. No special build settings are required.
-   **GitHub Pages:** Push your code to a GitHub repository and enable GitHub Pages in the settings.
-   **AWS S3:** Sync the project files to an S3 bucket and configure it for static website hosting. Use CloudFront for SSL and caching.

### Server Configuration

#### Nginx
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/your/project;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~* \.js$ {
        add_header Content-Type application/javascript;
    }
}
```

#### Apache (.htaccess)
```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^ index.html [QSA,L]

AddType application/javascript .js
```

## 4. Core Components (API)

### `RetirementCalculatorApp` (`js/app.js`)
This is the main class that controls the application's lifecycle and user interactions.

-   **`constructor()`**: Initializes all core components.
-   **`initializeApp()`**: Sets up event listeners, loads saved data, and performs the initial calculation.
-   **`collectInputs()`**: Gathers all values from the form fields and returns a comprehensive `inputs` object.
-   **`calculateRetirement()`**: The main calculation function that runs the simulation and updates the UI.
-   **`runSuggestionEngine()`**: Generates and displays actionable recommendations.
-   **`runMonteCarloSimulation()`**: Runs the detailed Monte Carlo analysis.

### `RetirementSimulator` (`js/simulator.js`)
The core calculation engine.

-   **`simulateRetirement(inputs, useMonteCarloVar)`**: Runs a deterministic simulation.
-   **`runMonteCarloSimulation(inputs, runs, progressCallback)`**: Runs the Monte Carlo simulation. Returns a `Promise<MonteCarloResult>`.
-   **`runStressTest(inputs, scenario)`**: Applies a predefined stress scenario.
-   **`calculateRiskCapacity(inputs)`**: Calculates the user's financial ability to take on risk.

### `SuggestionEngine` (`js/suggestion-engine.js`)
Generates financial advice.

-   **`generateSuggestions()`**: The main method that produces an array of suggestion objects.
-   **`getHealthCheckMetrics()`**: Returns data for the Health Check Dashboard.
-   **`generateActionableRiskAnalysis(monteCarloResults)`**: Generates the top 3 improvements for the risk analysis section.

### `ContextualIntelligenceSystem` (`js/contextual-intelligence.js`)
Provides personalized, real-time feedback.

-   **`analyzeUserPersona(inputs)`**: Determines the user's retirement persona.
-   **`calculateConfidenceScore(inputs)`**: Calculates the readiness score.
-   **`generateContextualAlerts(inputs, persona)`**: Generates alerts for potential risks.
-   **`generateContextualGuidance(inputs, confidenceScore)`**: Provides smart tips.

### `OnboardingSystem` (`js/onboarding.js`)
Manages the initial data collection for new users.

-   **`constructor()`**: Initializes the onboarding UI.
-   **`completeOnboarding()`**: Transfers collected data to the main calculator.

### `Configuration` (`js/config.js`)
This file is central to the calculator's accuracy.

-   **`ENHANCED_CONFIG`**: The main export containing all configuration data.
-   **`SUPER_GUARANTEE_RATE`**: Set to `0.12` (12%).
-   **`TAX_BRACKETS`**: Defines the 2025-26 Australian tax brackets.
-   **`MARKET_REGIMES`**: Contains historical data and probabilities for market conditions.
-   **`STRESS_SCENARIOS`**: Defines parameters for historical stress tests.
-   **`DEFAULTS`**: Contains default values for all input fields.

## 5. Development Workflow

### Running Tests & Verification
The project uses a set of verification functions that can be run from the browser console.

**1. Basic Functionality Test:**
```javascript
// Test module loading
import('./js/config.js').then(() => console.log('✅ Modules loading correctly')).catch(err => console.error('❌ Module loading failed:', err));

// Test for presence of required DOM elements
const requiredElements = ['yourCurrentAge', 'retirementAge', 'btnCalculate'];
const missing = requiredElements.filter(id => !document.getElementById(id));
if (missing.length === 0) console.log('✅ All required DOM elements present');
else console.error('❌ Missing DOM elements:', missing);
```

**2. Calculation Test:**
```javascript
async function testCalculation() {
  if (!window.app) { console.error('App not initialized'); return; }
  try {
    const inputs = window.app.collectInputs();
    const result = window.app.simulator.simulateRetirement(inputs, false);
    if (result && result.finalBalance) {
      console.log('✅ Deterministic calculation successful. Final Balance:', result.finalBalance);
    } else {
      console.error('❌ Deterministic calculation failed.');
    }
  } catch (error) {
    console.error('❌ Calculation test failed:', error);
  }
}
testCalculation();
```

**3. Performance Benchmark:**
```javascript
async function performanceBenchmark() {
  if (!window.app) { console.error('App not initialized'); return; }
  console.log('=== Performance Benchmark ===');
  const inputs = window.app.collectInputs();
  const startTime = performance.now();
  await window.app.simulator.runMonteCarloSimulation(inputs, 1000);
  const duration = performance.now() - startTime;
  console.log(`1000 Monte Carlo runs: ${duration.toFixed(0)}ms`);
  if (duration > 5000) console.warn('⚠️ Performance concern: 1000 runs took > 5s');
}
performanceBenchmark();
```

### Coding Conventions
-   Follow the existing code style (ES6 modules, classes, JSDoc comments).
-   Centralize all financial parameters in `js/config.js`.
-   Ensure new UI elements are accessible and follow existing design patterns.

## 6. Troubleshooting

-   **ES6 Module Errors:** Ensure you are serving the project over HTTP, not opening the `index.html` file directly. This is the most common setup issue.
-   **CORS Errors:** If you are fetching data from an external API (not currently implemented), you will need to configure CORS on the server or use a proxy.
-   **Calculation Errors:** Check the browser's developer console for JavaScript errors. The most common cause is invalid or missing data in the `inputs` object. Use `console.log(window.app.collectInputs())` to inspect the data being used.
-   **Outdated Financial Data:** All financial constants are in `js/config.js`. If tax laws or other regulations change, this is the first place to update.
-   **Port Already in Use:** If your server fails to start, another application may be using the port. Try a different port, e.g., `npm start -- --port=8081` or `python -m http.server 8081`.