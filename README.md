# Enhanced Australian Retirement Calculator with Comprehensive Decision Support Engine

A comprehensive, AI-powered retirement planning calculator specifically designed for the Australian financial system. Features advanced modeling capabilities including investment property analysis, trust structures, superannuation optimization, and a sophisticated **decision support engine** that provides actionable recommendations across 8 strategic areas.

## Recent Updates (2026)

### Advanced Calculator UX Fixes (March 2026)
- **4-column grid responsive layout**: Added `md:grid-cols-2` breakpoint so all four calculator sections (Personal & Risk Profile, Property Portfolio, Economic & Asset Allocation, Australian Pension System) display as 2 columns on tablets and 4 columns on desktop with `items-start` alignment.
- **Action buttons always visible**: The "🚀 Advanced Analysis Tools" section is now visible by default when browsing to the Advanced Calculator page, without requiring JSON import or onboarding completion.
- **Dark mode text visibility**: Removed dark-mode background overrides (`dark:bg-indigo-900`, `dark:bg-purple-900`, `dark:bg-amber-900`) from the Australian Residency & Earnings History, Aged Parents & Family Carers, and Reduced Income Scenario blocks. These blocks now maintain a light background in both light and dark mode, ensuring all label text remains readable.
- **Back to Action Buttons**: Added a "Back to Action Buttons" navigation link at the bottom of every result tab — AI Recommendations, Suggestions, Year-by-Year, Property Analysis, Risk Analysis, Advanced Charts, Optimization, Overseas, Scenario Compare, and Life Simulator — so users can easily return to the action controls after viewing analysis results.

### Tests for Advanced Page Structure
Added `tests/unit/advanced-page-structure.test.js` with 30 tests covering: action-button visibility, 4-column grid with `md:grid-cols-2` and `items-start`, absence of dark-mode background overrides on the three problem blocks, presence of "Back to Action Buttons" in all result tabs, correct section ordering, all key button IDs, and tab structure.

### PDF Export Fix and Enhancements
Fixed an undefined variable bug that caused PDF export to fail silently. The PDF report now includes a Table of Contents, all projection years (not capped at 25), a Personalized Suggestions section, a Persona-Based Recommendations section, and visual section dividers for improved readability.

### XLSX Export Enhancements
The multi-sheet XLSX workbook now includes two additional sheets: **Suggestions** (user-specific quick-win actions ranked by impact) and **Persona Recommendations** (personalized recommendations based on the detected user persona such as High Earner, Business Owner, or Property Investor).

### Home Page Structure Fix
Fixed a broken 4-column grid layout in `index.html` where the Property, Economic, and Pension columns were incorrectly nested inside the Personal & Risk Profile column. Added the missing `action-buttons-container` div that houses Calculate, Monte Carlo, Stress Test, and other action buttons. Fixed the How It Works section to correctly display Quick Start content outside the calculator form.

### SEO Improvements
Added `sitemap.xml` to the `src/` directory with an entry for `advanced.html` and updated `lastmod` dates to 2026-03-15. Updated the root `sitemap.xml` with all current pages and the advanced calculator entry. Robots.txt references the production sitemap URL.

### Advanced Calculator
Column structure verified and working correctly with the 4-column grid (`lg:grid-cols-4`) displaying Personal & Risk Profile, Property Portfolio, Economic & Asset Allocation, and Age Pension as equal siblings.

## 🎯 **NEW: Comprehensive Decision Support Engine**

**Evolution from Descriptive to Prescriptive**: This calculator now provides actionable, prioritized recommendations rather than just analysis. The AI engine evaluates your entire financial situation and suggests specific actions with timing, confidence levels, and expected benefits.

### **8 Strategic Areas Covered:**
1. **🏠 Home Ownership Strategy** - Downsizing analysis and timing recommendations
2. **🏢 Investment Property Strategy** - Market cycle-based buy/sell timing for all major cities
3. **📈 Stocks & Shares Optimization** - Liquidation strategies and portfolio optimization
4. **🏛️ Trust Structures** - Family trusts, SMSFs, and tax-efficient structures
5. **🏖️ Early Retirement Analysis** - Feasibility assessment for retiring 2-10 years early
6. **💰 Investment Optimization** - Contribution increases and savings rate optimization
7. **🛡️ Superannuation Strategy** - 2025 compliant caps, $3M tax management
8. **🏥 Additional Strategies** - Healthcare planning, insurance, estate planning, Age Pension optimization

## 🚀 **Key Features**

### **Core Functionality**
- **Comprehensive Decision Support Engine**: AI-powered recommendations across 8 strategic areas
- **Market Intelligence Integration**: Real-time Australian property market cycle analysis
- **Investment Property Modeling**: Complete buy-and-hold vs. sell analysis with cash flow projections
- **Healthcare Cost Inflation**: 6.5% healthcare-specific inflation modeling vs. general 2.9%
- **Aged Care Planning**: Probability-based aged care cost projections ($350K-550K lifetime)
- **Dynamic Asset Allocation**: Age-based glide paths (Rule of 110/120 minus age)
- **Advanced Risk Profiling**: Three-dimensional risk assessment (capacity/tolerance/requirement)
- **Franking Credit Benefits**: Australian dividend advantage modeling (+1.2% typical benefit)
- **Monte Carlo Simulation**: 5,000+ runs with confidence scoring and percentile analysis
- **Stress Testing**: Multiple economic scenarios including GFC-style crashes

### **NEW: Market Intelligence Features**
- **Property Market Cycles**: Historical data (2020-2024) for Sydney, Melbourne, Brisbane, Perth, Adelaide
- **Cycle Phase Detection**: Identifies current market phase (trough, recovery, growth, peak, decline)
- **City-Specific Timing**: Optimal buy/sell recommendations based on local market conditions
- **Economic Indicators**: Interest rate cycles, inflation trends, regulatory changes

### **NEW: Trust Structure Analysis**
- **Family Trust Benefits**: Tax savings through income splitting and capital gains distribution
- **Asset Protection**: Shielding assets from creditors and legal action
- **SMSF Evaluation**: When Self-Managed Super Funds become cost-effective
- **Property Trust Strategies**: Holding investment assets in trust structures

### **NEW: Superannuation Optimization (2025 Compliant)**
- **Concessional Contributions**: Maximizing $30,000 annual cap with tax savings
- **Non-Concessional Strategy**: Efficient use of $120,000 cap while balance under $2M
- **$3M Tax Management**: Strategies to minimize new 15% tax on earnings above $3M threshold
- **Carry-Forward Contributions**: Using unused concessional caps for balances under $500K
- **Catch-Up Strategies**: Optimal timing for additional contributions

### **Australian-Specific Features**
- **Super Guarantee**: 12% contribution rate modeling
- **Age Pension Integration**: Complete asset/income test calculations with optimization strategies
- **Tax System**: Full Australian tax bracket integration (2024–25) with franking credit benefits
- **Property Market**: Australian property growth, CGT modeling, and negative gearing
- **ASFA Standards**: Comfortable retirement income benchmarks

### **Advanced Analysis**
- **Year-by-Year Projections**: Detailed annual breakdown including healthcare and aged care costs
- **Property vs. Portfolio**: Comparative analysis of property investment vs. diversified portfolio
- **Risk Analysis**: Sequence of returns risk and longevity risk assessment
- **Optimization Strategies**: Pension maximization, tax optimization, contribution strategies
- **Confidence Scoring**: Each recommendation includes reliability assessment (60-95%)

## 📁 **File Structure**

```
retirement-calculator/
├── src/
│   ├── js/                             # JavaScript source files
│   │   ├── app.js                      # Main application logic
│   │   ├── simulator.js                # Core financial simulation engine
│   │   ├── decision-support-engine.js  # AI decision support system
│   │   └── ...                         # Other feature modules
│   ├── css/
│   │   └── styles.css                  # Main stylesheet
│   ├── assets/                         # Images, fonts, and other static assets
│   ├── advanced.html                   # Main calculator HTML template
│   ├── index.html                      # Landing page HTML template
│   └── ...                             # Other HTML page templates
├── dist/                               # Build output directory (generated)
│   ├── advanced.html                   # Processed calculator page
│   ├── index.html                      # Processed landing page
│   ├── main.[contenthash].js           # Bundled JavaScript
│   └── ...                             # Other generated assets
├── package.json                        # Project dependencies and scripts
├── webpack.config.js                   # Webpack build configuration
└── README.md                           # This documentation
```

## 🔧 **Setup Instructions**

### **Prerequisites**

- **Node.js**: Version 14.x or higher
- **npm**: Version 6.x or higher (usually comes with Node.js)

### **Quick Start: Installation & Setup**

1. **Download/Clone the Repository**:
   ```bash
   git clone <repository-url>
   cd retirement_calculator_au
   ```

2.  **Install Dependencies**:
    This will install all the necessary development dependencies listed in `package.json`.
    ```bash
    npm install
    ```

3.  **Build the Application**:
    This command runs the webpack build process, which bundles the source files from `src/` and places the output in the `dist/` directory.
    ```bash
    npm run build
    ```

4. **Serve Files Locally** (Required for ES6 modules):
    To view the application, you need to serve the files from the `dist` directory. You can use any simple web server.
   **Option 1 - Python 3 (Recommended)**:
   ```bash
   python -m http.server 8000
   # Then, open `http://localhost:8000` in your browser. The main calculator is at `http://localhost:8000/advanced.html`.
   ```

   **Option 2 - Python 2**:
   ```bash
   python -m SimpleHTTPServer 8000
   # Then, open `http://localhost:8000` in your browser. The main calculator is at `http://localhost:8000/advanced.html`.
   ```

   **Option 3 - Node.js with npx**:
    **Using `npx` (no installation required)**:
    ```bash
    npx serve dist
    ```
    The command will output the local URL.

   # Typically serves on http://localhost:3000
   ```

   **Option 4 - Node.js with http-server**:
   ```bash
   npm install -g http-server
   http-server -p 8000
   # Then, open `http://localhost:8000` in your browser. The main calculator is at `http://localhost:8000/advanced.html`.
   ```

   **Option 5 - PHP**:
   ```bash
   php -S localhost:8000
   # Then, open `http://localhost:8000` in your browser. The main calculator is at `http://localhost:8000/advanced.html`.
   ```

   **Option 6 - Using VS Code Live Server Extension**:
   - Install "Live Server" extension in VS Code
   - Right-click on `index.html` → "Open with Live Server"

### **Development Setup**

1. **Prerequisites**:
   - Modern web browser (Chrome 80+, Firefox 75+, Safari 13+, Edge 80+)
   - Local web server (required for ES6 modules)
   - No build tools or package managers required

2. **File Serving Requirements**:
   ```bash
   # ⚠️ IMPORTANT: Files must be served via HTTP/HTTPS, not file:// protocol
   # This is required for ES6 module imports to work properly

   # ✅ Correct: http://localhost:8000/
   # ❌ Incorrect: file:///path/to/project/index.html
   ```

3. **Dependencies** (Loaded automatically via CDN):
   - **Tailwind CSS**: Styling framework
   - **Chart.js**: Advanced charting and visualization
   - **XLSX.js**: Excel export functionality
   - **jsPDF**: PDF export capability
   - **Inter Font**: Typography

### **Docker Setup** (Optional)

```dockerfile
# Dockerfile
FROM nginx:alpine
COPY . /usr/share/nginx/html
EXPOSE 80

# Build and run:
# docker build -t retirement-calculator .
# docker run -p 8080:80 retirement-calculator
```

### **Production Deployment**

1. **Static Site Hosting**:
   - Deploy to GitHub Pages, Netlify, Vercel, or similar
   - Ensure proper MIME types for `.js` files as ES modules

2. **CDN Configuration**:
   ```nginx
   # nginx configuration for proper ES6 module serving
   location ~* \.js$ {
       add_header Content-Type application/javascript;
   }
   ```

## 🎮 **Usage Guide**

### **Basic Usage**
1. **Personal Details**: Enter ages, retirement dates, and life expectancy
2. **Risk Profile**: Set risk tolerance and financial situation
3. **Financial Information**: Current assets, salaries, and savings rates
4. **Property Portfolio**: Primary residence and investment property details
5. **Healthcare Planning**: Current costs and aged-care expectations
6. **Economic Assumptions**: Inflation, returns, and allocation preferences
7. **🆕 Generate AI Recommendations**: Click the enhanced recommendation button

### **Onboarding Experience**

For new users, the calculator offers a guided onboarding wizard to simplify the initial data entry process. This 5-step journey includes gamification elements like avatars and progress badges to make retirement planning more engaging. The wizard covers:
1.  **Household Information**: Your age, location, and family structure.
2.  **Financials**: Income, superannuation, and other investments.
3.  **Property**: Details about your primary residence and any investment properties.
4.  **Goals**: Your desired retirement age, lifestyle, and risk tolerance.
5.  **Review**: A summary of your inputs before generating the initial plan.

Once completed, your data is automatically transferred to the advanced calculator, giving you a comprehensive starting point for deeper analysis.

### **Advanced Calculator Usage**

For returning users or those who skip the onboarding, the advanced calculator provides a comprehensive interface for detailed financial planning. Key sections include:

1.  **Personal & Financial Details**: Enter your age, income, superannuation, savings, and other investments.
2.  **Property & Assets**: Model your home and investment properties.
3.  **Goals & Assumptions**: Define your retirement goals and customize economic assumptions.
4.  **Run Simulations**: Use the action buttons to run detailed Monte Carlo simulations, stress tests, and scenario comparisons.
5.  **Review Recommendations**: The **Persona Intelligence Engine** analyzes your profile and provides tailored recommendations based on your financial situation and goals.

### **NEW: Comprehensive Decision Support**
1. **Generate Analysis**: Click "Generate AI Recommendations" for comprehensive analysis
2. **Review Priorities**: Focus on high-priority recommendations first
3. **Understand Confidence**: Each recommendation includes confidence scoring
4. **Implementation Timeline**: Follow suggested timing for each strategy
5. **Monitor Progress**: Re-run analysis as circumstances change

### **Advanced Features**
1. **Monte Carlo Simulation**: Run 5,000+ scenarios for probability analysis
2. **Stress Testing**: Test portfolio resilience against economic shocks
3. **Property Analysis**: Compare keeping vs. selling investment properties
4. **Scenario Comparison**: Test multiple strategies side-by-side
5. **🆕 Market Timing Analysis**: Get city-specific property cycle recommendations

### **Key Inputs**

#### **Investment Property Modeling**
- Current property value and loan balance
- Weekly rental income and annual expenses
- Property location (affects market cycle analysis)
- Property growth rate assumptions
- Sell vs. hold timeline decisions
- Capital gains tax implications

#### **NEW: Trust Structure Inputs**
- Total asset value for trust evaluation
- Income levels for tax benefit analysis
- Number of beneficiaries
- Asset protection requirements
- Estate planning objectives

#### **Healthcare & Aged Care**
- Current annual healthcare costs
- Healthcare inflation rate (typically 6–7%)
- Aged care probability (65% Australian average)
- Expected care duration and costs
- Care type preferences (home vs. residential)

#### **Dynamic Asset Allocation**
- Age-based glide path rules
- Current allocation preferences
- Franking credit benefits for Australian equities
- Rebalancing frequency and thresholds

## 🏛️ **Australian Financial System Integration**

### **Superannuation (2025 Updated)**
- **12% Super Guarantee**: Accurate modeling of employer contributions
- **Contribution Caps**:
  - Concessional: $30,000 annually
  - Non-concessional: $120,000 annually (if balance < $2M)
- **$3M Tax**: New 15% tax on earnings above $3M threshold
- **Carry-Forward Rules**: Use unused caps from previous 5 years
- **Transfer Balance Cap**: $2M from July 2025
- **Tax Treatment**: Accumulation vs. pension phase calculations
- **Preservation Age**: Access rules and early release conditions

### **Age Pension**
- **Asset Test**: Updated thresholds and taper rates
- **Income Test**: Comprehensive calculations including deeming rates
- **Pension Maximization**: Strategic asset allocation for maximum entitlement
- **Work Bonus**: Additional income allowances for working pensioners

### **Taxation (2024-25)**
- **Progressive Tax Brackets**: Current Australian tax rates
- **Capital Gains Tax**: 50% discount for assets held 12+ months
- **Franking Credits**: Full imputation system modeling
- **Investment Property**: Negative gearing and depreciation benefits
- **Trust Tax**: Company tax rates and distribution strategies

### **Property Investment**
- **Negative Gearing**: Tax benefits and cash flow impact
- **Depreciation**: Building and fixtures allowances
- **CGT Timing**: Optimal sale timing for tax efficiency
- **Market Cycles**: City-specific buying and selling recommendations

## 🧮 **Key Calculations**

### **NEW: Trust Structure Tax Savings**
```text
Annual Tax Saving = (Marginal Tax Rate - Trust Tax Rate) × Investment Income
Family Trust Benefit = Income Splitting + Asset Protection + Estate Planning
```

### **Property Cash Flow**
```text
Net Cash Flow = (Weekly Rent × 52) - Annual Expenses - Interest Cost + Depreciation
CGT on Sale = (Sale Price - Purchase Price - Costs) × Tax Rate × (1 - 50% Discount)
```

### **Age Pension Asset Test**
```text
Pension = Max Pension - ((Assets - Threshold) / 1000) × $3 × 26 fortnights
Assets = Home (excluded) + Financial Assets + Investment Property + Super (if pension phase)
```

### **Healthcare Cost Projection**
```text
Future Cost = Current Cost × (1 + Healthcare Inflation Rate)^Years
Aged Care Impact = Probability × Average Duration × Average Annual Cost
```

### **Dynamic Allocation**
```text
Equity % = Rule Number - Current Age
// e.g., Rule of 110: 110 - 55 years old = 55% equities
Bonds % = (100 - Equity %) × 0.7
Cash % = (100 - Equity %) × 0.3
```

### **NEW: Superannuation Optimization**
```text
Concessional Benefit = Contribution × (Marginal Tax Rate - 15%)
Non-Concessional Capacity = min(120000, 2000000 - Current Balance)
$3M Tax Impact = max(0, (Balance - 3000000) × 15%)
```

## 📊 **NEW: Market Data Integration**

### **Property Market Intelligence**
- **Historical Data**: 2020-2024 performance across major cities
- **Current Cycle Phase**: Algorithm determines market phase
- **Growth Forecasts**: City-specific projections based on cycles
- **Volatility Analysis**: Risk assessment by location

### **City-Specific Data**
| City | Current Phase | Avg Growth (2020-24) | Volatility | Current Recommendation |
|------|---------------|---------------------|------------|----------------------|
| Sydney | Recovery | 3.5% | 15% | Good time to buy |
| Melbourne | Recovery | 2.8% | 12% | Early recovery phase |
| Brisbane | Growth | 8.4% | 18% | Act quickly if buying |
| Perth | Strong Growth | 9.9% | 22% | Peak approaching |
| Adelaide | Strong Growth | 11% | 16% | Peak approaching |

### **Economic Indicators (2025)**
- **Cash Rate**: 3.6% (down from peak)
- **Inflation**: 2.9% general, 6.5% healthcare
- **Property Inflation**: 3.5% average
- **Interest Rate Forecast**: Declining trend

## ✅ **Validation and Assumptions**

### **Key Assumptions**
- **Healthcare Inflation**: 6.5% annually (vs. 2.9% general inflation)
- **Property Growth**: Varies by city and cycle phase (2.8-11%)
- **Super Return**: 8.75% annually (long-term balanced fund average)
- **Aged Care Probability**: 65% (Australian Institute of Health and Welfare)
- **Investment Return Decline**: 0.03% annually (sequencing risk)
- **Franking Credit Value**: 30% of dividend (Australian corporate tax rate)

### **Data Sources**
- **ASFA Retirement Standard**: Comfortable living cost benchmarks
- **Australian Bureau of Statistics**: Life expectancy, healthcare costs, inflation
- **Department of Social Services**: Pension rates and thresholds
- **Reserve Bank of Australia**: Economic assumptions and cash rate
- **Australian Institute of Health and Welfare**: Aged care statistics
- **CoreLogic/Domain**: Property market data and trends
- **Australian Taxation Office**: Tax brackets, super caps, regulatory updates

### **NEW: Market Data Sources**
- **PropTrack**: Property price and rental data
- **Real Estate Institute**: Market cycle analysis
- **Major Bank Reports**: Economic forecasting
- **Government Treasury**: Regulatory and tax updates

## 🎛️ **Customization Options**

### **Economic Scenarios**
- Adjust inflation assumptions by category
- Modify return expectations by asset class
- Enable market shock testing scenarios
- Customize stress test parameters
- **NEW**: Select property location for market-specific analysis

### **Personal Circumstances**
- Multiple retirement ages for couples
- Flexible aged-care planning options
- Variable healthcare needs assessment
- Different property strategies
- **NEW**: Trust structure evaluation
- **NEW**: Early retirement feasibility analysis

### **Risk Management**
- Conservative to aggressive risk profiles
- Sequence of returns protection strategies
- Longevity risk management options
- Healthcare cost escalation planning
- **NEW**: Market cycle timing considerations

## 📤 **Export and Reporting**

### **Available Exports**
- **CSV Export**: Year-by-year projections with all key metrics
- **XLSX Export**: Multi-sheet workbook with comprehensive analysis
- **PDF Export**: Professional reports with charts and recommendations
- **Chart Export**: Save visualizations as PNG images
- **🆕 Comprehensive Recommendation Report**: Detailed strategy document

### **Report Contents**
- **Executive Summary**: Key findings and recommendations
- **Strategic Recommendations**: Prioritized action items across 8 areas
- **Detailed Projections**: Year-by-year financial forecasts
- **Property Analysis**: Market timing and strategy recommendations
- **Risk Assessment**: Comprehensive risk analysis and mitigation
- **Implementation Timeline**: When to execute each recommendation
- **Confidence Analysis**: Reliability scoring for each strategy

## 🌐 **Browser Compatibility**

**Supported Browsers**:
- **Chrome**: 80+ (Recommended)
- **Firefox**: 75+
- **Safari**: 13+
- **Edge**: 80+

**Required Features**:
- **ES6 Modules**: Import/export syntax support
- **Canvas API**: For Chart.js visualizations
- **CSS Grid & Flexbox**: Responsive layout
- **Local Storage**: Data persistence
- **Fetch API**: For potential future API integration

**Mobile Compatibility**:
- Responsive design works on tablets and large phones
- Touch-friendly interface elements
- Optimized for landscape orientation

## ⚡ **Performance Considerations**

- **Monte Carlo Simulations**: Chunked processing prevents browser freezing
- **Chart Rendering**: Optimized datasets for smooth visualization
- **Memory Management**: Automatic cleanup of chart instances
- **Progressive Loading**: Core functionality loads first, enhancements follow
- **🆕 Background Processing**: Decision engine uses Web Workers where possible
- **🆕 Caching**: Market data cached locally for performance

## 🔮 **Future Enhancements**

### **Planned Features**
- **Multi-Property Portfolio**: Manage multiple investment properties
- **International Assets**: Global diversification modeling
- **Cryptocurrency Integration**: Digital asset allocation
- **Social Security**: International pension portability
- **Estate Planning**: Advanced inheritance and beneficiary modeling
- **Insurance Integration**: Life and disability insurance optimization
- **Real-Time Data**: Live market data integration

### **Technical Improvements**
- **Progressive Web App**: Offline functionality and mobile app experience
- **Cloud Synchronization**: Save and sync data across devices
- **API Integration**: Real-time market data feeds
- **Advanced AI**: Machine learning for personalized recommendations
- **Multi-Currency**: Support for international investments

## 🤝 **Contributing**

To contribute to this project:

1. **Code Style**: Follow the established modular ES6 pattern
2. **Testing**: Verify calculations against known financial benchmarks
3. **Documentation**: Update README for any new features
4. **Validation**: Test with various Australian financial scenarios
5. **Pull Requests**: Include comprehensive testing and documentation

### **Development Guidelines**
- Use ES6+ features consistently
- Maintain separation of concerns between modules
- Include JSDoc comments for public functions
- Test across multiple browsers
- Validate against Australian financial regulations

## 📋 **Module Responsibilities (Updated)**

### **Core Modules**
- **`app.js`**: The main application controller. Initializes all modules, handles UI event listeners, and coordinates the overall application flow.
- **`simulator.js`**: The core financial simulation engine that runs retirement projections based on user inputs.
- **`utils.js`**: A collection of utility functions for DOM manipulation, number/currency formatting, and common financial calculations.
- **`charts.js`**: Responsible for rendering all charts and visualizations using Chart.js.
- **`config.js`**: Contains all static configuration, including tax brackets, superannuation rules, default values, and constants.

### **Onboarding & User Experience**
- **`onboarding-wizard.js`**: Manages the 5-step guided onboarding experience for new users, including UI, data collection, and gamification elements.
- **`persona-intelligence.js`**: An AI-powered engine that identifies the user's financial persona (e.g., "Young High Earner," "Family Focused") to provide tailored, contextual recommendations.

### **Financial Engines & Analysis**
- **`decision-support-engine.js`**: The primary engine for generating high-level strategic recommendations across 8 key financial areas.
- **`enhanced-monte-carlo.js`**: Runs the complex Monte Carlo simulations to determine the probability of success for the user's retirement plan.
- **`market-data.js`**: Contains data and logic related to Australian property market cycles for city-specific analysis.
- **`tax-optimizer.js`**: Includes functions and logic specifically for tax optimization strategies.
- **`property-analysis.js`**: Handles detailed analysis of investment properties, including cash flow and capital gains.

### **`config.js`**
- Australian pension system constants and thresholds
- Tax brackets and rates (2024-25)
- Healthcare and aged-care cost parameters
- Stress test scenarios and economic assumptions
- Default values and validation rules

### **`utils.js`**
- DOM manipulation utilities with error handling
- Financial calculation functions
- Tax calculation utilities with franking credits
- Investment property cash flow calculations
- Age pension calculation utilities
- Export/import functionality (CSV, XLSX, PDF)

### **`simulator.js`**
- Risk profiling calculations (capacity/tolerance/requirement)
- Dynamic asset allocation with glide paths
- Healthcare and aged-care cost projections
- Investment property modeling with CGT
- Main retirement simulation engine
- Monte Carlo simulation with 1000-10000 runs
- Stress testing scenarios (GFC, inflation, market crashes)

### **`charts.js`**
- Portfolio balance projections (fan charts)
- Monte Carlo result visualization with percentiles
- Asset allocation over time with rebalancing
- Property vs. portfolio comparison charts
- Healthcare cost growth projections
- Risk analysis visualizations

### **`app.js` (Enhanced)**
- Input collection and comprehensive validation
- UI updates and event handling
- Results display and formatting
- **🆕 Comprehensive recommendation display**
- Analysis coordination and progress tracking
- Export functionality coordination
- Application initialization and error handling

### **🆕 `market-data.js`**
- Australian property market historical data (2020-2024)
- Property cycle phase detection and analysis
- City-specific growth rates and volatility
- Economic indicator tracking
- Market timing recommendation engine
- Interest rate and inflation projections

### **🆕 `decision-support-engine.js`**
- Comprehensive recommendation generation across 8 strategic areas
- Monte Carlo scenario testing for each recommendation
- Trust structure analysis and tax benefit calculations
- Superannuation optimization with 2025 compliance
- Early retirement feasibility assessment
- Investment optimization strategies
- Priority ranking and confidence scoring

### **`recommendation.js` (Legacy)**
- Basic recommendation engine (fallback)
- Simple scenario comparison
- Property timing analysis
- Asset allocation suggestions

## 📜 **License**

This project is designed for educational and personal use. All financial calculations should be verified with qualified professionals before making investment decisions.

## ⚠️ **Important Disclaimers**

- **Not Financial Advice**: This calculator provides estimates based on assumptions and should not be considered professional financial advice
- **Regulatory Changes**: Australian financial regulations change frequently; verify current rules
- **Market Volatility**: Actual results may vary significantly due to market conditions
- **Professional Consultation**: Consult qualified financial advisors for personalized retirement planning
- **Data Accuracy**: While based on reputable sources, all data should be independently verified
- **Tax Implications**: Tax strategies should be reviewed with qualified tax professionals

## 📞 **Support and Updates**

- **Last Updated**: October 2025
- **Compatible With**: Australian financial regulations as of 2025-26 financial year
- **Superannuation Caps**: Updated for 2025 contribution limits and $3M tax
- **Property Data**: Includes 2001-2026 market analysis
- **Tax Brackets**: 2025-26 Australian tax year

---

## 🎯 **Quick Start Checklist**

1. ✅ **Setup**: Serve files via HTTP (not file://)
2. ✅ **Input**: Enter your financial details comprehensively
3. ✅ **Analyze**: Click "Generate AI Recommendations" for full analysis
4. ✅ **Review**: Focus on high-priority recommendations first
5. ✅ **Implement**: Follow timing suggestions for each strategy
6. ✅ **Monitor**: Re-run analysis as circumstances change
7. ✅ **Validate**: Consult professionals for implementation

**🚀 Ready to transform your retirement planning from guesswork to data-driven decisions!**

---

*For detailed implementation information, see `COMPREHENSIVE_RECOMMENDATIONS_IMPLEMENTATION.md`*