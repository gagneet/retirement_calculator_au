# Developer Guide - Enhanced Australian Retirement Calculator

This guide provides all the information you need to set up, develop, and contribute to the Enhanced Australian Retirement Calculator.

## Table of Contents
1. [Project Overview](#1-project-overview)
    - [Architecture](#architecture)
2. [Setup and Installation](#2-setup-and-installation)
    - [Prerequisites](#prerequisites)
    - [Quick Setup](#quick-setup)
    - [Detailed Instructions](#detailed-instructions)
3. [Core Components (API)](#3-core-components-api)
    - [`RetirementCalculatorApp`](#retirementcalculatorapp-jsappjs)
    - [`RetirementSimulator`](#retirementsimulator-jssimulatorjs)
    - [`SuggestionEngine`](#suggestionengine-jssuggestion-enginejs)
    - [`ContextualIntelligenceSystem`](#contextualintelligencesystem-jscontextual-intelligencejs)
    - [`OnboardingSystem`](#onboardingsystem-jsonboardingjs)
    - [`Configuration`](#configuration-jsconfigjs)
4. [Development Workflow](#4-development-workflow)
    - [Running Tests](#running-tests)
    - [Coding Conventions](#coding-conventions)
5. [Troubleshooting](#5-troubleshooting)

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

## 3. Core Components (API)

### `RetirementCalculatorApp` (`js/app.js`)
This is the main class that controls the application's lifecycle and user interactions.

-   **`constructor()`**: Initializes all core components, including the simulator, theme manager, and onboarding system.
-   **`initializeApp()`**: Sets up event listeners, loads saved data, and performs the initial calculation.
-   **`collectInputs()`**: Gathers all values from the form fields and returns a comprehensive `inputs` object. This object is the primary data source for all calculations.
-   **`calculateRetirement()`**: The main calculation function. It runs the simulation, generates results, and updates all the UI components and dashboards.
-   **`runSuggestionEngine()`**: Generates and displays the actionable recommendations and quick wins.
-   **`runMonteCarloSimulation()`**: Runs the detailed Monte Carlo analysis.

### `RetirementSimulator` (`js/simulator.js`)
The core calculation engine.

-   **`simulateRetirement(inputs, useMonteCarloVar)`**: Runs a deterministic (non-random) simulation to produce a year-by-year projection of your finances.
-   **`runMonteCarloSimulation(inputs, runs, progressCallback)`**: Runs the Monte Carlo simulation for a specified number of iterations, returning statistical results (success rate, median balance, percentiles).
-   **`runStressTest(inputs, scenario)`**: Applies a predefined stress scenario (e.g., a market crash) to the simulation.
-   **`calculateRiskCapacity(inputs)`**: Calculates the user's financial ability to take on risk.

### `SuggestionEngine` (`js/suggestion-engine.js`)
Generates financial advice.

-   **`generateSuggestions()`**: The main method that produces an array of suggestion objects. Each object contains a title, description, priority, and the specific modifications required to implement the suggestion.
-   **`getHealthCheckMetrics()`**: Returns the data for the Health Check Dashboard.
-   **`generateActionableRiskAnalysis(monteCarloResults)`**: Generates the top 3 improvements for the risk analysis section.

### `ContextualIntelligenceSystem` (`js/contextual-intelligence.js`)
Provides personalized, real-time feedback to the user.

-   **`analyzeUserPersona(inputs)`**: Analyzes the user's inputs to determine their primary and secondary retirement personas (e.g., "High Earner," "Late Starter").
-   **`calculateConfidenceScore(inputs)`**: Calculates the readiness score based on the completeness and quality of the user's data.
-   **`generateContextualAlerts(inputs, persona)`**: Generates alerts for potential risks or issues in the user's plan.
-   **`generateContextualGuidance(inputs, confidenceScore)`**: Provides smart tips on what the user should do next.

### `OnboardingSystem` (`js/onboarding.js`)
Manages the initial data collection for new users.

-   **`constructor()`**: Checks if the user is in onboarding mode and initializes the UI accordingly.
-   **`nextOnboardingStep(currentStep)`**: Collects data from the current step and moves to the next.
-   **`completeOnboarding()`**: Transfers all collected data to the main calculator and triggers the first calculation.

### `Configuration` (`js/config.js`)
This file is central to the calculator's accuracy and contains all the key financial parameters.

-   **`ENHANCED_CONFIG`**: The main export, an object containing all configuration data.
-   **`SUPER_GUARANTEE_RATE`**: Currently set to `0.12` (12%).
-   **`TAX_BRACKETS`**: An array of objects defining the 2025-26 Australian tax brackets.
-   **`MARKET_REGIMES`**: Contains historical data and probabilities for different market conditions (interest rates, property cycles, equity markets).
-   **`STRESS_SCENARIOS`**: Defines the parameters for historical stress tests.
-   **`DEFAULTS`**: A nested object containing all the default values for the calculator's input fields.

## 4. Development Workflow

### Running Tests
The project includes a suite of verification functions in the `Verification Steps` section of this guide. To run them:
1.  Open the application in your browser.
2.  Open the developer console.
3.  You can paste the verification snippets into the console to test specific functionalities like module loading, DOM element presence, and calculations.

### Coding Conventions
-   Follow the existing code style (ES6 modules, classes, JSDoc comments).
-   When adding new financial parameters, add them to `js/config.js` to ensure they are centralized.
-   Ensure any new UI elements are accessible and have appropriate ARIA attributes.

## 5. Troubleshooting

-   **ES6 Module Errors:** Ensure you are serving the project over HTTP, not opening the `index.html` file directly.
-   **CORS Errors:** If you are fetching data from an external API (not currently implemented), you will need to configure CORS on the server or use a proxy.
-   **Calculation Errors:** Check the browser's developer console for any JavaScript errors. The most common cause is invalid or missing data in the `inputs` object. Use `console.log(inputs)` in `app.js` to inspect the data being used for calculations.
-   **Outdated Financial Data:** All financial constants are in `js/config.js`. If tax laws or other regulations change, this is the first place to update.