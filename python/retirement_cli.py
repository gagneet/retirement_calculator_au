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
        if value is not None:
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

def main():
    """Main CLI function."""
    parser = argparse.ArgumentParser(
        description='Enhanced Australian Retirement Calculator',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Example command
    subparsers.add_parser('example', help='Run built-in example calculation from retirement_calculator.py')

    # Default inputs for help text
    defaults = get_default_inputs()

    # Quick command
    quick_parser = subparsers.add_parser('quick', help='Run a quick simulation with Monte Carlo.')
    quick_parser.add_argument('--runs', type=int, default=1000, help='Number of Monte Carlo runs.')
    for key, value in defaults.items():
        arg_name = '--' + key
        _type = type(value) if value is not None else str
        if _type == bool:
            quick_parser.add_argument(arg_name, action=argparse.BooleanOptionalAction, default=value)
        else:
            quick_parser.add_argument(arg_name, type=_type, default=value, help=f"Default: {value}")

    # Projection command
    proj_parser = subparsers.add_parser('projection', help='Get a year-by-year projection.')
    for key, value in defaults.items():
        arg_name = '--' + key
        _type = type(value) if value is not None else str
        if _type == bool:
            proj_parser.add_argument(arg_name, action=argparse.BooleanOptionalAction, default=value)
        else:
            proj_parser.add_argument(arg_name, type=_type, default=value, help=f"Default: {value}")


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