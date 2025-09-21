#!/usr/bin/env python3
"""
Australian Retirement Calculator - Main CLI

Command-line interface for the Australian Retirement Calculator.
Provides options for basic calculations, interactive mode, and utilities.
"""

import sys
import argparse
from retirement_calculator import AustralianRetirementCalculator
from retirement_utils import RetirementPlanningUtils
import interactive_calculator


def run_example():
    """Run the built-in example calculation."""
    print("Running example calculation...")
    print()
    from retirement_calculator import main
    main()


def run_tests():
    """Run the test suite."""
    print("Running test suite...")
    print()
    import test_calculator
    test_calculator.main()


def run_interactive():
    """Run the interactive calculator."""
    interactive_calculator.run_interactive_calculator()


def run_utilities():
    """Run the utilities demonstration."""
    print("Running utilities demonstration...")
    print()
    from retirement_utils import demo_utilities
    demo_utilities()


def quick_calculation(args):
    """Run a quick calculation with command-line arguments."""
    calculator = AustralianRetirementCalculator()
    
    years_to_retirement = args.retirement_age - args.current_age
    
    print(f"Quick Retirement Calculation")
    print("=" * 40)
    print(f"Current age: {args.current_age}")
    print(f"Retirement age: {args.retirement_age}")
    print(f"Years to retirement: {years_to_retirement}")
    print(f"Current super: ${args.super_balance:,.0f}")
    print(f"Annual contributions: ${args.annual_contributions:,.0f}")
    print(f"Lifestyle: {args.lifestyle}")
    print()
    
    # Calculate super at retirement (assuming equal split if only one value provided)
    super1, super2 = calculator.calculate_superannuation_at_retirement(
        args.super_balance / 2, args.super_balance / 2,
        args.annual_contributions / 2, args.annual_contributions / 2,
        years_to_retirement
    )
    total_super = super1 + super2
    
    print(f"Super at retirement: ${total_super:,.0f}")
    
    # Calculate pension
    pension = calculator.calculate_age_pension_eligibility(total_super, True)
    print(f"Annual Age Pension: ${pension['annual_pension']:,.0f}")
    
    # Calculate capital needs
    capital_needs = calculator.calculate_total_retirement_capital_needed(
        args.retirement_age, args.lifestyle, pension['annual_pension']
    )
    
    surplus_deficit = total_super - capital_needs['total_capital_needed']
    
    print(f"Capital needed: ${capital_needs['total_capital_needed']:,.0f}")
    print(f"Available capital: ${total_super:,.0f}")
    
    if surplus_deficit >= 0:
        print(f"Status: SURPLUS ${surplus_deficit:,.0f} ✓")
    else:
        print(f"Status: DEFICIT ${abs(surplus_deficit):,.0f} ✗")


def main():
    """Main CLI function."""
    parser = argparse.ArgumentParser(
        description='Australian Retirement Calculator for Couples',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s example              # Run built-in example
  %(prog)s interactive          # Run interactive calculator
  %(prog)s test                 # Run test suite
  %(prog)s utilities            # Run utilities demo
  
  # Quick calculation
  %(prog)s quick --current-age 50 --retirement-age 67 \\
                 --super-balance 400000 --annual-contributions 40000
        """
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Example command
    subparsers.add_parser('example', help='Run built-in example calculation')
    
    # Interactive command
    subparsers.add_parser('interactive', help='Run interactive calculator')
    
    # Test command
    subparsers.add_parser('test', help='Run test suite')
    
    # Utilities command
    subparsers.add_parser('utilities', help='Run utilities demonstration')
    
    # Quick calculation command
    quick_parser = subparsers.add_parser('quick', help='Quick calculation with command-line args')
    quick_parser.add_argument('--current-age', type=int, required=True,
                            help='Current age of older partner')
    quick_parser.add_argument('--retirement-age', type=int, default=67,
                            help='Planned retirement age (default: 67)')
    quick_parser.add_argument('--super-balance', type=float, required=True,
                            help='Combined current superannuation balance')
    quick_parser.add_argument('--annual-contributions', type=float, default=0,
                            help='Combined annual super contributions (default: 0)')
    quick_parser.add_argument('--lifestyle', choices=['comfortable', 'modest'], 
                            default='comfortable',
                            help='Retirement lifestyle (default: comfortable)')
    
    # Parse arguments
    args = parser.parse_args()
    
    # If no command specified, show help
    if not args.command:
        parser.print_help()
        return
    
    # Execute the appropriate command
    try:
        if args.command == 'example':
            run_example()
        elif args.command == 'interactive':
            run_interactive()
        elif args.command == 'test':
            run_tests()
        elif args.command == 'utilities':
            run_utilities()
        elif args.command == 'quick':
            quick_calculation(args)
    except KeyboardInterrupt:
        print("\n\nCalculation interrupted by user.")
    except Exception as e:
        print(f"\nError: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()