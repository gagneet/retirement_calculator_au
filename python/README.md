# Australian Retirement Calculator for Couples

A comprehensive Python calculator to help Australian couples determine how much money they need for retirement, considering Australian-specific factors like Age Pension eligibility, Superannuation, property ownership, and ASFA retirement standards.

## Features

This calculator addresses the key question: **"Living in Australia as a couple, how can I work out the amount of money that I will need to retire on, considering that I live to the age of 95?"**

### Key Calculations Include

- **Age Pension Eligibility**: Determines if you qualify for the Australian Age Pension based on current asset and income tests
- **Superannuation Growth**: Projects your super balance growth until retirement
- **Property Value Growth**: Calculates home value at retirement with inflation-only growth
- **ASFA Retirement Standards**: Uses Association of Superannuation Funds of Australia standards for comfortable and modest retirement
- **Life Expectancy Planning**: Plans for retirement from retirement age to 95 years old
- **Comprehensive Assessment**: Combines all factors to determine total capital requirements

### Australian-Specific Considerations

- Current Age Pension rates and thresholds (2024)
- Asset test vs income test calculations
- Principal residence exemption for asset test
- ASFA comfortable and modest retirement standards
- Australian inflation and superannuation growth assumptions

## Quick Start

### Basic Usage

```python
from retirement_calculator import AustralianRetirementCalculator

# Create calculator instance
calculator = AustralianRetirementCalculator()

# Example: Couple aged 55, retiring at 67
years_to_retirement = 67 - 55

# Calculate property value at retirement
home_value_at_retirement = calculator.calculate_property_value_at_retirement(
    current_value=800000, 
    years_to_retirement=years_to_retirement
)

# Calculate superannuation at retirement
super_person1, super_person2 = calculator.calculate_superannuation_at_retirement(
    current_balance_person1=200000,
    current_balance_person2=150000,
    annual_contribution_person1=25000,
    annual_contribution_person2=20000,
    years_to_retirement=years_to_retirement
)

# Check Age Pension eligibility
pension_details = calculator.calculate_age_pension_eligibility(
    combined_assets=super_person1 + super_person2,
    own_home=True
)

# Calculate total retirement capital needed
capital_needs = calculator.calculate_total_retirement_capital_needed(
    retirement_age=67,
    lifestyle='comfortable',
    annual_pension=pension_details['annual_pension']
)

print(f"Total capital needed: ${capital_needs['total_capital_needed']:,.0f}")
```

### Run the Example

```bash
python retirement_calculator.py
```

This will run a comprehensive example scenario showing all calculations.

## Example Output

```text
=== Australian Retirement Calculator for Couples ===

Example Scenario:
- Couple, both aged 55, planning to retire at 67
- Current super balances: $200,000 and $150,000
- Annual super contributions: $25,000 and $20,000
- Own home worth $800,000
- Target: Comfortable retirement to age 95

Home value at retirement (inflation growth): $1,684,649
Total superannuation at retirement: $1,349,588
  - Person 1: $809,753
  - Person 2: $539,835

Age Pension Assessment:
  - Eligible: Yes
  - Annual pension: $28,742
  - Limiting test: Asset

Retirement Capital Requirements:
  - Years in retirement: 28
  - Total capital needed: $1,023,189
  - Annual shortfall: $42,174

Retirement Readiness:
  - Available capital: $1,349,588
  - Capital needed: $1,023,189
  - Surplus: $326,399 ✓

ASFA Comfortable Retirement Standard:
  - Annual income needed: $70,916
  - Monthly income needed: $5,910
```

## Key Rates and Thresholds (2024)

### Age Pension

- **Pension Age**: 67 years
- **Maximum Rate (Couple Combined)**: $1,725.70 per fortnight
- **Asset Test Threshold (Homeowners)**: $451,000
- **Asset Test Threshold (Non-homeowners)**: $667,000

### ASFA Retirement Standards (Quarterly)

- **Comfortable Retirement (Couple)**: $17,729
- **Modest Retirement (Couple)**: $12,715

### Growth Assumptions

- **Inflation Rate**: 3.5% per annum
- **Superannuation Growth**: 7.0% per annum

## Calculator Components

### Core Classes

#### `AustralianRetirementCalculator`

Main calculator class with methods for:

- Property value calculations
- Superannuation projections
- Age Pension eligibility assessment
- ASFA standard calculations
- Total capital requirement calculations

### Key Methods

#### `calculate_property_value_at_retirement(current_value, years_to_retirement)`

Calculates property value at retirement assuming inflation-only growth.

#### `calculate_superannuation_at_retirement(balances, contributions, years)`

Projects superannuation balances at retirement including ongoing contributions.

#### `calculate_age_pension_eligibility(assets, own_home, income)`

Determines Age Pension eligibility and payment amount using asset and income tests.

#### `calculate_retirement_needs(lifestyle)`

Returns income requirements based on ASFA comfortable or modest standards.

#### `calculate_total_retirement_capital_needed(retirement_age, lifestyle, pension)`

Calculates total capital needed from retirement to age 95.

## Important Notes

### Assumptions and Limitations

1. **Rate Currency**: All calculations use 2024 rates and thresholds
2. **Inflation**: Property growth assumes inflation-only (no real growth)
3. **Super Growth**: Assumes 7% annual growth (historical average)
4. **Age Pension**: Uses current rules (subject to government changes)
5. **Life Expectancy**: Plans to age 95 for both partners
6. **Home Ownership**: Principal residence exempt from asset test

### Regular Updates Required

This calculator should be updated regularly to reflect:

- New Age Pension rates and thresholds
- Updated ASFA retirement standards
- Changes to superannuation rules
- Current inflation and growth rates

## Customization

You can customize the calculator by modifying the constants in the `__init__` method:

```python
calculator = AustralianRetirementCalculator()
calculator.INFLATION_RATE = 0.04  # 4% inflation
calculator.SUPER_GROWTH_RATE = 0.08  # 8% super growth
```

## Contributing

To contribute to this project:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## Disclaimer

This calculator is for educational and planning purposes only. It should not be considered as financial advice. Always consult with a qualified financial advisor for personalized retirement planning advice. The calculator uses current rates and rules which may change over time.

---

feat: Overhaul Python retirement calculator to match frontend features

This commit completely revamps the Python backend of the Australian retirement calculator to align with the sophisticated features present in the JavaScript-based frontend.

The key changes include:

- **New Simulator Engine:** Replaced the basic calculator with a new `EnhancedRetirementSimulator` class in `retirement_calculator.py`. This class is capable of running detailed, year-by-year financial projections.
- **Advanced Financial Modeling:** The new simulator now models:
  - Detailed investment properties (cash flow, sale, CGT).
  - Healthcare and aged care costs with separate inflation rates.
  - Dynamic "glide path" asset allocation.
  - Franking credits and salary progression with "lean years."
- **Monte Carlo & Stress Testing:** Added capabilities to run Monte Carlo simulations to assess probabilistic outcomes and a suite of stress tests for risk analysis.
- **Configuration as Code:** Moved all constants, tax brackets, and default parameters to a new `config.py` file for easy maintenance.
- **Utility Functions:** Created a `utils.py` file for common financial calculations (tax, loans, pensions).
- **Enhanced CLI:** Updated `retirement_cli.py` to expose the full power of the new simulator, with arguments for all input parameters and a command to view detailed projections.
- **Updated Interactive Mode:** Overhauled `interactive_calculator.py` to provide a comprehensive, user-friendly way to interact with the new engine.
- **Comprehensive Tests:** Updated the existing test suite and added a new suite (`test_enhancements.py`) to validate all the new, complex features, ensuring correctness and reliability.

---
