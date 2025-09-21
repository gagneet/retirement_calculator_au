# Enhanced Australian Retirement Calculator

A comprehensive, modular retirement planning calculator specifically designed for the Australian financial system, featuring advanced modeling capabilities including investment property analysis, healthcare cost projections, aged care planning, and Monte Carlo simulation.

## Features

### Core Functionality
- **Investment Property Modeling**: Complete buy-and-hold vs sell analysis with cash flow projections
- **Healthcare Cost Inflation**: 6.5% healthcare-specific inflation modeling vs general 2.9%
- **Aged Care Planning**: Probability-based aged care cost projections ($350K-550K lifetime)
- **Dynamic Asset Allocation**: Age-based glide paths (Rule of 110/120 minus age)
- **Advanced Risk Profiling**: Three-dimensional risk assessment (capacity/tolerance/requirement)
- **Franking Credit Benefits**: Australian dividend advantage modeling (+1.2% typical benefit)
- **Monte Carlo Simulation**: 5,000+ runs with confidence scoring and percentile analysis
- **Stress Testing**: Multiple economic scenarios including GFC-style crashes

### Australian-Specific Features
- **Super Guarantee**: 12% contribution rate modeling
- **Age Pension Integration**: Complete asset/income test calculations
- **Tax System**: Full Australian tax bracket integration (2024-25)
- **Property Market**: Australian property growth and CGT modeling
- **ASFA Standards**: Comfortable retirement income benchmarks

### Advanced Analysis
- **Year-by-Year Projections**: Detailed annual breakdown including healthcare and aged care costs
- **Property vs Portfolio**: Comparative analysis of property investment vs diversified portfolio
- **Risk Analysis**: Sequence of returns risk and longevity risk assessment
- **Optimization Strategies**: Pension maximization, tax optimization, contribution strategies

## File Structure

```
retirement-calculator/
├── index.html              # Main HTML structure
├── css/
│   └── styles.css          # Comprehensive stylesheet with responsive design
├── js/
│   ├── config.js           # Australian system constants and configuration
│   ├── utils.js            # Utility functions and helpers
│   ├── simulator.js        # Core financial simulation engine
│   ├── charts.js           # Chart rendering with Chart.js
│   └── app.js              # Main application controller
└── README.md              # This documentation
```

## Module Responsibilities

### `config.js`
- Australian pension system constants
- Tax brackets and rates
- Healthcare and aged care cost parameters
- Stress test scenarios
- Default values and validation rules

### `utils.js`
- DOM manipulation utilities
- Financial calculation functions
- Tax calculation utilities
- Investment property utilities
- Pension calculation utilities
- Export/import functionality

### `simulator.js`
- Risk profiling calculations
- Dynamic asset allocation
- Healthcare and aged care cost projections
- Investment property modeling
- Main retirement simulation engine
- Monte Carlo simulation
- Stress testing scenarios

### `charts.js`
- Portfolio balance projections (fan charts)
- Monte Carlo result visualization
- Asset allocation over time
- Property vs portfolio comparison
- Healthcare cost growth charts
- Risk analysis visualizations

### `app.js`
- Input collection and validation
- UI updates and event handling
- Results display and formatting
- Analysis and recommendations
- Export functionality
- Application initialization

## Setup Instructions

1. **Basic Setup**:
   ```bash
   # Clone or download the files
   # Ensure all files are in the correct directory structure
   # Open index.html in a modern web browser
   ```

2. **Development Setup**:
   ```bash
   # For development, serve files from a local server
   # Python 3:
   python -m http.server 8000
   
   # Node.js:
   npx serve .
   
   # Then open http://localhost:8000
   ```

3. **Dependencies**:
   - External CDN dependencies are loaded automatically:
     - Tailwind CSS (styling)
     - Chart.js (visualization)
     - Inter font (typography)

## Usage Guide

### Basic Usage
1. **Personal Details**: Enter ages, retirement dates, and life expectancy
2. **Risk Profile**: Set risk tolerance and financial situation
3. **Financial Information**: Current assets, salaries, and savings rates
4. **Property Portfolio**: Primary residence and investment property details
5. **Healthcare Planning**: Current costs and aged care expectations
6. **Economic Assumptions**: Inflation, returns, and allocation preferences

### Advanced Features
1. **Monte Carlo Simulation**: Run 5,000+ scenarios for probability analysis
2. **Stress Testing**: Test portfolio resilience against economic shocks
3. **Property Analysis**: Compare keeping vs selling investment properties
4. **Optimization**: Review pension maximization and tax strategies

### Key Inputs

#### Investment Property Modeling
- Current property value and loan balance
- Weekly rental income and annual expenses
- Property growth rate assumptions
- Sell vs hold timeline decisions
- Capital gains tax implications

#### Healthcare & Aged Care
- Current annual healthcare costs
- Healthcare inflation rate (typically 6-7%)
- Aged care probability (65% Australian average)
- Expected care duration and costs
- Care type preferences (home vs residential)

#### Dynamic Asset Allocation
- Age-based glide path rules
- Current allocation preferences
- Franking credit benefits for Australian equities
- Rebalancing frequency and thresholds

## Australian Financial System Integration

### Superannuation
- 12% Super Guarantee modeling
- Contribution caps and carry-forward rules
- Tax treatment in accumulation vs pension phase
- Preservation age and access rules

### Age Pension
- Asset test thresholds and tapers
- Income test calculations
- Deeming rate applications
- Pension maximization strategies

### Taxation
- Progressive tax brackets (2024-25)
- Capital gains tax with 50% discount
- Franking credit refunds
- Investment property tax benefits

### Property Investment
- Negative gearing benefits
- Depreciation allowances
- CGT implications of sale timing
- Rent vs own analysis

## Key Calculations

### Property Cash Flow
```javascript
Net Cash Flow = (Weekly Rent × 52) - Annual Expenses - Interest Cost + Depreciation
```

### Age Pension Asset Test
```javascript
Pension = Max Pension - ((Assets - Threshold) / 1000) × $3 × 26 fortnights
```

### Healthcare Cost Projection
```javascript
Future Cost = Current Cost × (1 + Healthcare Inflation Rate)^Years
```

### Dynamic Allocation
```javascript
Equity % = Rule Number - Current Age
// e.g., Rule of 110: 110 - 55 years old = 55% equities
```

## Validation and Assumptions

### Key Assumptions
- Healthcare inflation: 6.5% annually (vs 2.9% general inflation)
- Property growth: 4.5% annually (long-term average)
- Super return: 8.75% annually (long-term balanced fund average)
- Aged care probability: 65% (Australian Institute of Health and Welfare)
- Investment return decline: 0.03% annually (sequencing risk)

### Data Sources
- ASFA Retirement Standard (comfortable living costs)
- Australian Bureau of Statistics (life expectancy, healthcare costs)
- Department of Social Services (pension rates and thresholds)
- Reserve Bank of Australia (economic assumptions)
- Australian Institute of Health and Welfare (aged care statistics)

## Customization Options

### Economic Scenarios
- Adjust inflation assumptions
- Modify return expectations
- Enable market shock testing
- Customize stress test scenarios

### Personal Circumstances
- Multiple retirement ages for couples
- Flexible aged care planning
- Variable healthcare needs
- Different property strategies

### Risk Management
- Conservative to aggressive profiles
- Sequence of returns protection
- Longevity risk management
- Healthcare cost escalation planning

## Export and Reporting

### Available Exports
- **CSV Export**: Year-by-year projections with all key metrics
- **Chart Export**: Save visualizations as PNG images
- **Summary Reports**: Comprehensive analysis with recommendations

### Report Contents
- Executive summary with key findings
- Detailed year-by-year projections
- Property analysis and recommendations
- Risk assessment and mitigation strategies
- Optimization opportunities

## Browser Compatibility

**Supported Browsers**:
- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

**Required Features**:
- ES6 modules support
- Canvas API (for charts)
- CSS Grid and Flexbox
- Local storage (for data persistence)

## Performance Considerations

- **Monte Carlo Simulations**: Chunked processing prevents browser freezing
- **Chart Rendering**: Optimized datasets for smooth visualization
- **Memory Management**: Automatic cleanup of chart instances
- **Progressive Loading**: Core functionality loads first, enhancements follow

## Future Enhancements

### Planned Features
- **Investment Diversification**: Multi-property portfolio modeling
- **Expense Modeling**: Detailed retirement expense categories
- **Social Security**: International pension portability
- **Estate Planning**: Inheritance and beneficiary modeling
- **Insurance Integration**: Life and disability insurance modeling

### Technical Improvements
- **Web Workers**: Background Monte Carlo processing
- **PWA Support**: Offline functionality
- **Data Persistence**: Cloud backup and sync
- **Mobile Optimization**: Touch-friendly interface

## Contributing

To contribute to this project:

1. **Code Style**: Follow the established modular pattern
2. **Testing**: Verify calculations against known benchmarks
3. **Documentation**: Update README for any new features
4. **Validation**: Test with various Australian financial scenarios

## License

This project is designed for educational and personal use. Financial calculations should be verified with qualified professionals before making investment decisions.

## Disclaimer

This calculator provides estimates based on assumptions and should not be considered financial advice. Actual results may vary significantly due to market volatility, regulatory changes, and personal circumstances. Consult qualified financial advisors for personalized retirement planning.

---

*Last updated: September 2024*
*Compatible with Australian financial regulations as of 2024-25 financial year*

---
