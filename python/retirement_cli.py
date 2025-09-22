#!/usr/bin/env python3
"""
Australian Retirement Calculator - Main CLI

Command-line interface for the Enhanced Australian Retirement Calculator.
"""

import sys
import argparse
from retirement_calculator import EnhancedRetirementSimulator, get_default_inputs

def run_example():
    """Run the built-in example calculation."""
    print("Running example calculation...")
    from retirement_calculator import main
    main()

def run_projection(args):
    """Run a simulation and display the year-by-year projection."""
    inputs = get_default_inputs()
    # Update inputs with any provided arguments
    for key, value in vars(args).items():
        if value is not None and key in inputs:
            inputs[key] = value

    simulator = EnhancedRetirementSimulator(inputs)
    results = simulator.run_simulation()

    print("\n--- Year-by-Year Projection ---")
    print("=" * 40)
    print(f"{'Year':<5} {'Age':<4} {'End Balance':<15}")
    print("-" * 40)
    
    for i, data in enumerate(results['yearlyData']):
        year = data['year']
        end_balance = data['endBalance']
        age = inputs['retirementAge'] + i
        print(f"{year:<5} {age:<4} ${end_balance:,.0f}")
        if data['depleted']:
            print("-" * 40)
            print(f"Funds depleted in year {year}.")
            break

def quick_calculation(args):
    """Run a quick calculation with command-line arguments."""
    inputs = get_default_inputs()
    # Update inputs with any provided arguments
    for key, value in vars(args).items():
        if value is not None and key in inputs:
            inputs[key] = value

    simulator = EnhancedRetirementSimulator(inputs)
    results = simulator.run_simulation()
    
    print("\n--- Quick Simulation Results ---")
    print(f"Final Balance: ${results['finalBalance']:,.0f}")
    
    mc_results = simulator.run_monte_carlo_simulation(runs=args.runs)
    print("\n--- Monte Carlo Simulation ---")
    print(f"Success Rate: {mc_results['success_rate']:.1%}")
    print(f"Median Outcome: ${mc_results['median']:,.0f}")

def add_arguments_to_parser(parser):
    """Adds all the simulation input arguments to the given parser."""
    defaults = get_default_inputs()
    
    # Group arguments for better help text
    personal_group = parser.add_argument_group('Personal Inputs')
    financial_group = parser.add_argument_group('Financial Inputs')
    property_group = parser.add_argument_group('Property Inputs')
    economic_group = parser.add_argument_group('Economic Inputs')
    sim_group = parser.add_argument_group('Simulation Inputs')

    arg_map = {
        'yourCurrentAge': personal_group, 'partnerCurrentAge': personal_group,
        'retirementAge': personal_group, 'partnerRetirementAge': personal_group,
        'yourLifespan': personal_group, 'partnerLifespan': personal_group,
        'yourSalary': financial_group, 'partnerSalary': financial_group,
        'yourCurrentSuper': financial_group, 
        'partnerCurrentSuper': financial_group, 'currentSavings': financial_group,
        'currentStocks': financial_group, 'monthlyStockContribution': financial_group,
        'percentIncomeSaved': financial_group,
        'homeValue': property_group, 'mortgageBalance': property_group,
        'mortgageRate': property_group, 'monthlyMortgagePayment': property_group,
        'planToDownsize': property_group, 'hasInvestmentProperty': property_group,
        'investmentPropertyValue': property_group, 'investmentPropertyLoan': property_group,
        'investmentPropertyRate': property_group, 'weeklyRentalIncome': property_group,
        'annualPropertyExpenses': property_group, 'propertyGrowthRate': property_group,
        'sellPropertyYears': property_group, 'capitalGainsTaxRate': property_group,
        'inflation': economic_group, 'investmentReturn': economic_group,
        'returnDeclineRate': economic_group, 'savingsReturn': economic_group,
        'superReturn': economic_group, 'salaryGrowthRate': economic_group,
        'leanYearsStart': economic_group, 'leanYearsReduction': economic_group,
        'useGlidePath': sim_group, 'glidePathRule': sim_group,
        'returnVolatility': sim_group, 'enableShocks': sim_group,
        'shockProbability': sim_group, 'shockMagnitude': sim_group,
    }

    for key, value in defaults.items():
        arg_name = '--' + key
        _type = type(value) if value is not None else str
        group = arg_map.get(key, parser)
        
        if _type == bool:
            group.add_argument(arg_name, action=argparse.BooleanOptionalAction, default=value)
        else:
            group.add_argument(arg_name, type=_type, default=value, help=f"Default: {value}")


def main():
    """Main CLI function."""
    parser = argparse.ArgumentParser(
        description='Enhanced Australian Retirement Calculator',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Example command
    subparsers.add_parser('example', help='Run built-in example calculation from retirement_calculator.py')

    # Quick command
    quick_parser = subparsers.add_parser('quick', help='Run a quick simulation with Monte Carlo.')
    quick_parser.add_argument('--runs', type=int, default=1000, help='Number of Monte Carlo runs.')
    add_arguments_to_parser(quick_parser)

    # Projection command
    proj_parser = subparsers.add_parser('projection', help='Get a year-by-year projection.')
    add_arguments_to_parser(proj_parser)

    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    try:
        if args.command == 'example':
            run_example()
        elif args.command == 'quick':
            quick_calculation(args)
        elif args.command == 'projection':
            run_projection(args)
    except KeyboardInterrupt:
        print("\n\nCalculation interrupted by user.")
    except Exception as e:
        print(f"\nError: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
