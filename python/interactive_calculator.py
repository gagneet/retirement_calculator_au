#!/usr/bin/env python3
"""
Interactive Enhanced Australian Retirement Calculator

This script provides an interactive command-line interface for the 
Enhanced Australian Retirement Calculator.
"""

from retirement_calculator import EnhancedRetirementSimulator, get_default_inputs

def get_input(prompt: str, default: any, type_converter) -> any:
    """Generic input function with default value and type conversion."""
    while True:
        try:
            value = input(f"{prompt} (default: {default}): ")
            if value == "":
                return default
            return type_converter(value)
        except ValueError:
            print(f"Invalid input. Please enter a valid {type_converter.__name__}.")

def get_bool_input(prompt: str, default: bool) -> bool:
    """Get yes/no input with a default."""
    default_str = 'y' if default else 'n'
    while True:
        response = input(f"{prompt} (y/n, default: {default_str}): ").lower().strip()
        if response == "":
            return default
        if response in ['y', 'yes', '1', 'true']:
            return True
        elif response in ['n', 'no', '0', 'false']:
            return False
        else:
            print("Please enter 'y' for yes or 'n' for no.")

def run_interactive_calculator():
    """Run the interactive enhanced retirement calculator."""
    print("=" * 60)
    print("   ENHANCED AUSTRALIAN RETIREMENT CALCULATOR")
    print("=" * 60)
    print("\nEnter your details below. Press Enter to accept the default value.")
    
    inputs = get_default_inputs()
    
    # --- Personal Details ---
    print("\n--- 1. Personal Details ---")
    inputs['yourCurrentAge'] = get_input("Your Current Age", inputs['yourCurrentAge'], int)
    inputs['partnerCurrentAge'] = get_input("Partner's Current Age", inputs['partnerCurrentAge'], int)
    inputs['retirementAge'] = get_input("Your Retirement Age", inputs['retirementAge'], int)
    inputs['partnerRetirementAge'] = get_input("Partner's Retirement Age", inputs['partnerRetirementAge'], int)
    inputs['yourLifespan'] = get_input("Your Expected Lifespan", inputs['yourLifespan'], int)
    inputs['partnerLifespan'] = get_input("Partner's Expected Lifespan", inputs['partnerLifespan'], int)

    # --- Financial Details ---
    print("\n--- 2. Financial Details ---")
    inputs['yourSalary'] = get_input("Your Annual Salary", inputs['yourSalary'], float)
    inputs['partnerSalary'] = get_input("Partner's Annual Salary", inputs['partnerSalary'], float)
    inputs['yourCurrentSuper'] = get_input("Current Combined Super", inputs['yourCurrentSuper'], float)
    inputs['currentSavings'] = get_input("Current Cash/Savings", inputs['currentSavings'], float)
    inputs['currentStocks'] = get_input("Current Stock Portfolio", inputs['currentStocks'], float)
    inputs['monthlyStockContribution'] = get_input("Monthly Stock Contributions", inputs['monthlyStockContribution'], float)
    
    # --- Investment Property ---
    print("\n--- 3. Investment Property ---")
    inputs['hasInvestmentProperty'] = get_bool_input("Do you have an investment property?", inputs['hasInvestmentProperty'])
    if inputs['hasInvestmentProperty']:
        inputs['investmentPropertyValue'] = get_input("Property Value", inputs['investmentPropertyValue'], float)
        inputs['investmentPropertyLoan'] = get_input("Outstanding Loan", inputs['investmentPropertyLoan'], float)
        inputs['weeklyRentalIncome'] = get_input("Weekly Rental Income", inputs['weeklyRentalIncome'], float)
        inputs['sellPropertyYears'] = get_input("Sell property in (years)", inputs['sellPropertyYears'], int)

    # --- Run Simulation ---
    print("\n" + "=" * 60)
    print("   CALCULATING... PLEASE WAIT")
    print("=" * 60)

    simulator = EnhancedRetirementSimulator(inputs)
    results = simulator.run_simulation()
    
    # --- Display Results ---
    print("\n--- 📈 DETERMINISTIC RESULTS ---")
    print(f"Total Financial Assets at Retirement: ${results['totalFinancialAssets']:,.0f}")
    print(f"Accessible Home Equity:             ${results['accessibleHomeEquity']:,.0f}")
    print(f"Final Balance at Lifespan End:      ${results['finalBalance']:,.0f}")
    if results['yearlyData'] and results['yearlyData'][-1]['depleted']:
        print(f"⚠️ Funds depleted in year {results['yearlyData'][-1]['year']}")

    # --- Monte Carlo ---
    print("\n--- 🎲 MONTE CARLO SIMULATION (1000 runs) ---")
    mc_results = simulator.run_monte_carlo_simulation(runs=1000)
    print(f"Success Rate:   {mc_results['success_rate']:.1%}")
    print(f"Median Outcome: ${mc_results['median']:,.0f}")
    print(f"Worst 10% Outcome (10th Percentile): ${mc_results['percentile_10']:,.0f}")
    print(f"Best 10% Outcome (90th Percentile):  ${mc_results['percentile_90']:,.0f}")
    
    # --- Stress Tests ---
    print("\n--- 🌪️ STRESS TESTS ---")
    stress_results = simulator.run_stress_tests()
    for res in stress_results:
        status = "✓ Survives" if res['success'] else "✗ Fails"
        print(f"{res['scenario']:<25} | {status}")

    # --- Projection ---
    show_projection = get_bool_input("\nShow detailed year-by-year projection?", False)
    if show_projection:
        print("\n--- 🗓️ YEAR-BY-YEAR PROJECTION ---")
        print(f"{'Year':<5} {'Age':<4} {'End Balance':<15}")
        print("-" * 30)
        for i, data in enumerate(results['yearlyData']):
            year = data['year']
            end_balance = data['endBalance']
            age = inputs['retirementAge'] + i
            print(f"{year:<5} {age:<4} ${end_balance:,.0f}")
            if data['depleted']:
                break

    print("\n" + "=" * 60)
    print("Calculation complete.")
    print("Disclaimer: This is for planning purposes only.")
    print("=" * 60)

if __name__ == "__main__":
    run_interactive_calculator()
