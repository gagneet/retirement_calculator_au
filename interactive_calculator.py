#!/usr/bin/env python3
"""
Interactive Australian Retirement Calculator

This script provides an interactive command-line interface for the Australian 
Retirement Calculator, allowing users to input their own scenarios.
"""

from retirement_calculator import AustralianRetirementCalculator


def get_float_input(prompt: str, min_value: float = 0) -> float:
    """Get validated float input from user."""
    while True:
        try:
            value = float(input(prompt))
            if value >= min_value:
                return value
            else:
                print(f"Please enter a value >= {min_value}")
        except ValueError:
            print("Please enter a valid number.")


def get_int_input(prompt: str, min_value: int = 0, max_value: int = None) -> int:
    """Get validated integer input from user."""
    while True:
        try:
            value = int(input(prompt))
            if value >= min_value and (max_value is None or value <= max_value):
                return value
            else:
                range_str = f">= {min_value}"
                if max_value:
                    range_str += f" and <= {max_value}"
                print(f"Please enter a value {range_str}")
        except ValueError:
            print("Please enter a valid whole number.")


def get_yes_no_input(prompt: str) -> bool:
    """Get yes/no input from user."""
    while True:
        response = input(prompt + " (y/n): ").lower().strip()
        if response in ['y', 'yes', '1', 'true']:
            return True
        elif response in ['n', 'no', '0', 'false']:
            return False
        else:
            print("Please enter 'y' for yes or 'n' for no.")


def get_lifestyle_input() -> str:
    """Get lifestyle choice from user."""
    while True:
        print("\nRetirement lifestyle options:")
        print("1. Comfortable retirement (ASFA standard)")
        print("2. Modest retirement (ASFA standard)")
        
        choice = input("Choose lifestyle (1 or 2): ").strip()
        if choice == '1':
            return 'comfortable'
        elif choice == '2':
            return 'modest'
        else:
            print("Please enter '1' for comfortable or '2' for modest.")


def run_interactive_calculator():
    """Run the interactive retirement calculator."""
    print("=" * 60)
    print("   AUSTRALIAN RETIREMENT CALCULATOR FOR COUPLES")
    print("=" * 60)
    print()
    print("This calculator will help you determine how much money you need")
    print("for retirement, considering Australian Age Pension and ASFA standards.")
    print()
    
    calculator = AustralianRetirementCalculator()
    
    # Get user inputs
    print("Please provide the following information:")
    print()
    
    # Ages and retirement
    current_age_1 = get_int_input("Current age of person 1: ", 18, 100)
    current_age_2 = get_int_input("Current age of person 2: ", 18, 100)
    retirement_age = get_int_input(f"Planned retirement age: ", max(current_age_1, current_age_2), 70)
    
    years_to_retirement = retirement_age - max(current_age_1, current_age_2)
    
    # Superannuation
    print("\nSuperannuation details:")
    current_super_1 = get_float_input("Current super balance for person 1: $")
    current_super_2 = get_float_input("Current super balance for person 2: $")
    annual_contrib_1 = get_float_input("Annual super contributions for person 1: $")
    annual_contrib_2 = get_float_input("Annual super contributions for person 2: $")
    
    # Property
    print("\nProperty details:")
    own_home = get_yes_no_input("Do you own your own home?")
    current_home_value = 0
    if own_home:
        current_home_value = get_float_input("Current home value: $")
    
    # Other assets and income
    print("\nOther financial details:")
    other_assets = get_float_input("Other assessable assets (investments, etc.): $")
    annual_income = get_float_input("Expected annual income in retirement (excluding super/pension): $")
    
    # Lifestyle choice
    lifestyle = get_lifestyle_input()
    
    print("\n" + "=" * 60)
    print("   RETIREMENT CALCULATION RESULTS")
    print("=" * 60)
    
    # Perform calculations
    if own_home and current_home_value > 0:
        home_value_at_retirement = calculator.calculate_property_value_at_retirement(
            current_home_value, years_to_retirement
        )
        print(f"\nProperty at retirement:")
        print(f"  Current value: ${current_home_value:,.0f}")
        print(f"  Value at retirement: ${home_value_at_retirement:,.0f}")
        print(f"  Growth over {years_to_retirement} years: ${home_value_at_retirement - current_home_value:,.0f}")
    
    # Calculate super at retirement
    super_1, super_2 = calculator.calculate_superannuation_at_retirement(
        current_super_1, current_super_2, annual_contrib_1, annual_contrib_2, years_to_retirement
    )
    total_super = super_1 + super_2
    
    print(f"\nSuperannuation at retirement:")
    print(f"  Person 1: ${super_1:,.0f}")
    print(f"  Person 2: ${super_2:,.0f}")
    print(f"  Combined total: ${total_super:,.0f}")
    
    # Calculate Age Pension
    total_assessable_assets = total_super + other_assets
    pension_details = calculator.calculate_age_pension_eligibility(
        total_assessable_assets, own_home, annual_income
    )
    
    print(f"\nAge Pension assessment:")
    print(f"  Total assessable assets: ${total_assessable_assets:,.0f}")
    print(f"  Eligible for Age Pension: {'Yes' if pension_details['eligible'] else 'No'}")
    print(f"  Annual pension amount: ${pension_details['annual_pension']:,.0f}")
    print(f"  Fortnightly pension: ${pension_details['fortnightly_pension']:,.0f}")
    if pension_details['eligible']:
        print(f"  Limiting factor: {pension_details['limiting_test'].title()} test")
    
    # Calculate retirement needs
    retirement_needs = calculator.calculate_retirement_needs(lifestyle)
    capital_needs = calculator.calculate_total_retirement_capital_needed(
        retirement_age, lifestyle, pension_details['annual_pension']
    )
    
    print(f"\nRetirement income requirements ({lifestyle} lifestyle):")
    print(f"  Annual income needed: ${retirement_needs['annual_need']:,.0f}")
    print(f"  Monthly income needed: ${retirement_needs['monthly_need']:,.0f}")
    print(f"  Age Pension covers: ${pension_details['annual_pension']:,.0f}")
    print(f"  Annual shortfall: ${capital_needs['annual_shortfall']:,.0f}")
    
    print(f"\nCapital requirements:")
    print(f"  Years in retirement: {capital_needs['years_in_retirement']}")
    print(f"  Total capital needed: ${capital_needs['total_capital_needed']:,.0f}")
    
    # Final assessment
    available_capital = total_super + other_assets
    surplus_deficit = available_capital - capital_needs['total_capital_needed']
    
    print(f"\nRetirement readiness assessment:")
    print(f"  Available capital: ${available_capital:,.0f}")
    print(f"  Required capital: ${capital_needs['total_capital_needed']:,.0f}")
    
    if surplus_deficit >= 0:
        print(f"  Status: SURPLUS of ${surplus_deficit:,.0f} ✓")
        print("  You appear to be on track for your retirement goals!")
    else:
        print(f"  Status: DEFICIT of ${abs(surplus_deficit):,.0f} ✗")
        print("  You may need to save more or adjust your retirement plans.")
        
        # Provide suggestions
        print(f"\nSuggestions to address the deficit:")
        monthly_shortfall = abs(surplus_deficit) / (years_to_retirement * 12)
        print(f"  - Increase monthly savings by: ${monthly_shortfall:,.0f}")
        
        if retirement_age < 70:
            new_capital_needs = calculator.calculate_total_retirement_capital_needed(
                retirement_age + 2, lifestyle, pension_details['annual_pension']
            )
            savings_from_delay = capital_needs['total_capital_needed'] - new_capital_needs['total_capital_needed']
            print(f"  - OR delay retirement by 2 years to save: ${savings_from_delay:,.0f}")
        
        if lifestyle == 'comfortable':
            modest_needs = calculator.calculate_total_retirement_capital_needed(
                retirement_age, 'modest', pension_details['annual_pension']
            )
            savings_from_lifestyle = capital_needs['total_capital_needed'] - modest_needs['total_capital_needed']
            print(f"  - OR choose modest lifestyle to save: ${savings_from_lifestyle:,.0f}")
    
    print("\n" + "=" * 60)
    print("Calculation complete. Thank you for using the retirement calculator!")
    print("Disclaimer: This is for planning purposes only. Consult a financial advisor for professional advice.")
    print("=" * 60)


if __name__ == "__main__":
    run_interactive_calculator()