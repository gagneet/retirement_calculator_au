# Changelog - Enhanced Australian Retirement Calculator

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.1.0] - 2026-06-03 - Policy, Export and QA Hardening

### Added
- Salary input modes are explicit across simple, advanced, and advanced-v2 calculators: Salary excluding super and Total package including super. Package-inclusive salary keeps the package fixed and recalculates calculated cash salary and employer SG.
- Employer SG override supports modelling actual employer contributions above or below the calculated SG amount, including maximum contribution base edge cases.
- Future Home or Property Plan and Expected Future Windfall / Inheritance assumptions can remain scenario-only or be explicitly included in the base projection.
- PDF and XLSX exports now include package mode, calculated cash salary, employer SG, Employer SG override status, concessional cap remaining, concessional cap warning, Division 293 warning, future property assumptions, windfall assumptions, and scenario-only versus included-in-base status.

### Changed
- Core Projection remains focused on deterministic projection plus Monte Carlo/risk work; Suggestions & Action Plan, stress, overseas, and retirement-age tools remain on-demand and are stale-marked after input changes.
- Windfall and inheritance wording now makes clear that the input is a simplified planning assumption, not tax, legal, CGT, estate, trust, or super death-benefit modelling.

### Fixed
- Fixed the advanced-v2 windfall confidence bridge so the rendered Confidence selector is exported and simulated correctly instead of defaulting to speculative.
- Hardened export assumption rows and tests for SG override, concessional cap, Division 293, future property, and windfall scenarios.

## [2.0.0] - 2025-09-23 - Major Transformation: Decision Support Engine

### 🎯 **MAJOR NEW FEATURE: Comprehensive Decision Support Engine**

#### Added - Revolutionary Features

**Core Engine Architecture:**
- **🆕 DecisionSupportEngine** (`js/decision-support-engine.js`) - Complete rewrite from descriptive to prescriptive analysis
- **🆕 MarketDataEngine** (`js/market-data.js`) - Australian property market intelligence with historical data (2020-2024)
- **🆕 Enhanced App Integration** - Comprehensive recommendation display system

**8 Strategic Areas Analysis:**
1. **🏠 Home Ownership Strategy**
   - Downsizing analysis with optimal timing recommendations
   - Equity release calculations and Age Pension impact analysis
   - Market-based timing for home sales

2. **🏢 Investment Property Strategy**
   - City-specific market cycle analysis (Sydney, Melbourne, Brisbane, Perth, Adelaide)
   - Property cycle phase detection (trough, recovery, growth, peak, decline)
   - Optimal buy/sell timing based on historical market data
   - Complete cash flow vs capital growth analysis

3. **📈 Stocks & Shares Optimization**
   - Strategic liquidation timing and amount recommendations
   - Dividend vs growth strategy analysis
   - Tax-efficient selling strategies with CGT optimization
   - Portfolio risk-return optimization

4. **🏛️ Trust Structures Analysis**
   - Family trust tax benefit calculations with income splitting
   - Asset protection analysis and implementation guidance
   - Self-Managed Super Fund (SMSF) cost-benefit analysis
   - Property trust structure evaluation

5. **🏖️ Early Retirement Feasibility**
   - Comprehensive analysis for retiring 2, 5, or 10 years early
   - Financial requirement calculations and feasibility assessment
   - Risk analysis and mitigation strategies
   - Alternative income strategies for early retirement

6. **💰 Investment Optimization**
   - Monthly contribution increase analysis ($500-$1000 scenarios)
   - Savings rate optimization with cost-benefit analysis
   - Asset allocation optimization based on risk profile
   - Return on investment calculations for increased contributions

7. **🛡️ Superannuation Strategy (2025 Compliant)**
   - **NEW: $30,000 concessional contribution cap** optimization
   - **NEW: $120,000 non-concessional cap** strategic usage
   - **NEW: $3 million threshold tax management** strategies
   - **NEW: $2 million transfer balance cap** (July 2025)
   - Carry-forward contribution optimization
   - Tax benefit maximization strategies

8. **🏥 Additional Strategic Areas**
   - Healthcare cost planning (6.5% inflation vs 2.9% general)
   - Insurance strategy optimization
   - Estate planning recommendations
   - Age Pension maximization strategies
   - Geographic arbitrage analysis

#### Market Intelligence Integration

**Australian Property Market Data:**
- Historical performance data (2020-2024) for all major cities
- Current market cycle identification algorithm
- City-specific volatility and growth rate analysis
- Economic indicator integration (interest rates, inflation)

**Real-Time Analysis:**
- Brisbane: Growth phase (8.4% recent growth)
- Perth: Strong growth phase (9.9% recent growth)
- Adelaide: Strong growth phase (11% recent growth)
- Sydney: Recovery phase (3.5% recent growth)
- Melbourne: Recovery phase (2.8% recent growth)

#### Enhanced User Experience

**Comprehensive Recommendation Display:**
- Priority-based ranking (High/Medium/Low)
- Confidence scoring (60-95%) based on historical data reliability
- Category grouping with intuitive icons
- Implementation timeline guidance
- Expected benefit quantification

**Advanced Progress Tracking:**
- Stage-by-stage analysis feedback
- Detailed progress indicators for long-running analyses
- Graceful fallback to basic recommendations if needed

#### Technical Enhancements

**Performance & Reliability:**
- Asynchronous processing prevents UI blocking
- Chunked Monte Carlo simulation processing
- Comprehensive error handling with fallback strategies
- Memory management optimization

**Architecture Improvements:**
- Modular ES6 class-based design
- Clean separation of concerns
- Extensible recommendation framework
- Professional code documentation

### Updated - Existing Features Enhanced

**Superannuation Compliance (2025):**
- Updated contribution caps for 2025-26 financial year
- New $3 million tax threshold implementation
- Enhanced transfer balance cap calculations
- Carry-forward rules optimization

**Risk Profiling:**
- Enhanced three-dimensional risk assessment
- Better risk capacity calculations
- Improved risk requirement analysis
- More sophisticated risk tolerance matching

**Monte Carlo Simulation:**
- Optimized performance for large run counts
- Better progress tracking and user feedback
- Enhanced scenario comparison capabilities
- Improved result visualization

**Property Analysis:**
- City-specific market cycle integration
- Enhanced cash flow modeling
- Better CGT timing analysis
- Improved rental yield calculations

### Fixed - Bug Fixes and Improvements

**Calculation Accuracy:**
- Fixed edge cases in age pension calculations
- Improved franking credit modeling
- Better healthcare inflation modeling
- Enhanced property depreciation calculations

**User Interface:**
- Fixed mobile responsiveness issues
- Improved form validation and error messaging
- Better chart rendering performance
- Enhanced export functionality reliability

**Browser Compatibility:**
- Improved ES6 module loading across browsers
- Better error handling for unsupported features
- Enhanced CDN resource loading reliability
- Fixed Safari-specific display issues

## [1.2.0] - 2024-08-15 - Pre-Enhancement Version

### Added
- Basic recommendation engine framework
- Investment property buy vs hold analysis
- Scenario comparison functionality
- Enhanced Monte Carlo simulation
- Risk profiling improvements

### Updated
- Australian tax brackets for 2024-25
- Age pension thresholds and rates
- Healthcare cost projections
- ASFA retirement standards

### Fixed
- Property cash flow calculation accuracy
- Chart rendering performance issues
- Export functionality improvements
- Mobile interface optimizations

## [1.1.0] - 2024-06-01

### Added
- Investment property modeling
- Advanced risk profiling
- Healthcare cost inflation modeling
- Aged care cost planning
- Dynamic asset allocation

### Updated
- Australian superannuation rates (12% SG)
- Tax calculation accuracy
- Age pension integration
- Chart visualization improvements

## [1.0.0] - 2024-03-01 - Initial Release

### Added
- Basic retirement calculation engine
- Monte Carlo simulation capabilities
- Australian tax system integration
- Age pension modeling
- Export functionality (CSV, PDF)
- Interactive charts and visualizations
- Healthcare cost projections
- Risk assessment tools

### Core Features
- Australian-specific retirement planning
- Superannuation and Age Pension integration
- Property investment analysis
- Tax optimization strategies
- Comprehensive reporting system

## Technical Migration Guide

### Breaking Changes in 2.0.0

**New Dependencies:**
- Enhanced ES6 module architecture
- New recommendation engine requires modern browser support
- Market data engine adds computational requirements

**API Changes:**
```javascript
// Old way (1.x)
const recommendations = basicEngine.generateRecommendations();

// New way (2.0)
const decisionEngine = new DecisionSupportEngine(simulator, inputs);
const recommendations = await decisionEngine.generateComprehensiveRecommendations();
```

**File Structure Changes:**
```
New files added:
├── js/decision-support-engine.js    # Main recommendation engine
├── js/market-data.js                # Property market intelligence
├── COMPREHENSIVE_RECOMMENDATIONS_IMPLEMENTATION.md
├── API_DOCUMENTATION.md
├── USAGE_EXAMPLES.md
├── SETUP_GUIDE.md
├── VISUAL_GUIDE.md
└── CHANGELOG.md (this file)
```

### Migration Steps

1. **Update Server Configuration:**
   - Ensure ES6 modules are properly served
   - Verify MIME types for .js files
   - Test module loading in target browsers

2. **Update Integration Code:**
   - Replace basic recommendation calls with comprehensive engine
   - Update UI to handle new recommendation format
   - Add error handling for fallback scenarios

3. **Test Thoroughly:**
   - Verify all 8 strategic areas generate recommendations
   - Test market data integration
   - Validate calculation accuracy

## Acknowledgments

### Data Sources
- **Australian Bureau of Statistics**: Life expectancy, healthcare costs, inflation data
- **Department of Social Services**: Age Pension rates and thresholds
- **Australian Taxation Office**: Tax brackets, super caps, regulatory updates
- **PropTrack/CoreLogic**: Property market data and trends
- **Reserve Bank of Australia**: Economic indicators and forecasting

### Contributors
- Enhanced by Claude AI with Australian financial system expertise
- Market data analysis and integration
- Comprehensive decision support engine development
- Documentation and user experience improvements

## Upcoming Features (Roadmap)

### Version 2.2.0 (Planned)
- Real-time market data integration
- Multi-property portfolio analysis
- International investment considerations
- Enhanced mobile experience

### Version 2.3.0 (Planned)
- Machine learning recommendation improvements
- Advanced tax optimization strategies
- Cryptocurrency and alternative investment integration
- Professional advisor collaboration tools

### Version 3.0.0 (Future)
- Full Progressive Web App (PWA) capabilities
- Cloud synchronization and data backup
- Advanced AI personalization
- Multi-currency support for expatriates

---

## Support and Updates

- **Current Version**: 2.1.0
- **Compatibility**: Australian financial regulations 2025-26
- **Browser Support**: Chrome 80+, Firefox 75+, Safari 13+, Edge 80+
- **Last Updated**: June 2026

For technical support, feature requests, or bug reports, please refer to the project documentation or consult with qualified financial professionals for implementation guidance.

---

*This changelog reflects the transformation of a basic retirement calculator into a comprehensive, AI-powered decision support system for Australian retirement planning.*