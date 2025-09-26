#!/usr/bin/env python3
"""
Australian Retirement Calculator - Utility Functions

This module provides additional utility functions for retirement planning,
including scenario comparison and savings target calculations.
"""

from retirement_calculator import AustralianRetirementCalculator
from typing import List, Dict, Any


class RetirementPlanningUtils:
    """
    Utility class for advanced retirement planning calculations and comparisons.
    """
    
    def __init__(self):
        self.calculator = AustralianRetirementCalculator()
    
    def compare_retirement_ages(self, 
                              current_super: tuple,
                              annual_contributions: tuple,
                              current_age: int,
                              other_assets: float = 0,
                              lifestyle: str = 'comfortable') -> List[Dict[str, Any]]:
        """
        Compare retirement outcomes for different retirement ages.
        
        Args:
            current_super: Tuple of (person1_super, person2_super)
            annual_contributions: Tuple of (person1_contrib, person2_contrib)
            current_age: Current age of older partner
            other_assets: Other assessable assets
            lifestyle: 'comfortable' or 'modest'
            
        Returns:
            List of dictionaries with retirement age scenarios
        """
        results = []
        
        for retirement_age in range(65, 71):  # Ages 65-70
            years_to_retirement = retirement_age - current_age
            if years_to_retirement <= 0:
                continue
                
            # Calculate super at retirement
            super1, super2 = self.calculator.calculate_superannuation_at_retirement(
                current_super[0], current_super[1],
                annual_contributions[0], annual_contributions[1],
                years_to_retirement
            )
            total_super = super1 + super2
            total_assets = total_super + other_assets
            
            # Calculate pension
            pension = self.calculator.calculate_age_pension_eligibility(total_assets, True)
            
            # Calculate capital needs
            capital_needs = self.calculator.calculate_total_retirement_capital_needed(
                retirement_age, lifestyle, pension['annual_pension']
            )
            
            surplus_deficit = total_assets - capital_needs['total_capital_needed']
            
            results.append({
                'retirement_age': retirement_age,
                'years_to_retirement': years_to_retirement,
                'total_super': total_super,
                'total_assets': total_assets,
                'annual_pension': pension['annual_pension'],
                'capital_needed': capital_needs['total_capital_needed'],
                'surplus_deficit': surplus_deficit,
                'years_in_retirement': capital_needs['years_in_retirement']
            })
        
        return results
    
    def calculate_savings_target(self,
                               current_super: tuple,
                               current_age: int,
                               retirement_age: int,
                               target_lifestyle: str = 'comfortable',
                               other_assets: float = 0) -> Dict[str, float]:
        """
        Calculate how much additional savings are needed to meet retirement goals.
        
        Args:
            current_super: Tuple of (person1_super, person2_super)
            current_age: Current age
            retirement_age: Target retirement age
            target_lifestyle: 'comfortable' or 'modest'
            other_assets: Other assessable assets
            
        Returns:
            Dictionary with savings targets
        """
        years_to_retirement = retirement_age - current_age
        
        # Calculate what they'd have with no additional contributions
        super1, super2 = self.calculator.calculate_superannuation_at_retirement(
            current_super[0], current_super[1], 0, 0, years_to_retirement
        )
        baseline_super = super1 + super2
        baseline_assets = baseline_super + other_assets
        
        # Calculate pension with baseline assets
        pension = self.calculator.calculate_age_pension_eligibility(baseline_assets, True)
        
        # Calculate capital needed
        capital_needs = self.calculator.calculate_total_retirement_capital_needed(
            retirement_age, target_lifestyle, pension['annual_pension']
        )
        
        # Calculate shortfall
        shortfall = max(0, capital_needs['total_capital_needed'] - baseline_assets)
        
        # Calculate required annual savings to make up shortfall
        if shortfall > 0 and years_to_retirement > 0:
            # Using future value of annuity formula
            growth_rate = self.calculator.SUPER_GROWTH_RATE
            if growth_rate > 0:
                required_annual_savings = shortfall / (
                    ((1 + growth_rate) ** years_to_retirement - 1) / growth_rate
                )
            else:
                required_annual_savings = shortfall / years_to_retirement
        else:
            required_annual_savings = 0
        
        return {
            'baseline_super': baseline_super,
            'baseline_assets': baseline_assets,
            'capital_needed': capital_needs['total_capital_needed'],
            'shortfall': shortfall,
            'required_annual_savings': required_annual_savings,
            'required_monthly_savings': required_annual_savings / 12,
            'annual_pension': pension['annual_pension']
        }
    
    def compare_lifestyles(self,
                          current_super: tuple,
                          annual_contributions: tuple,
                          current_age: int,
                          retirement_age: int,
                          other_assets: float = 0) -> Dict[str, Dict[str, Any]]:
        """
        Compare comfortable vs modest retirement lifestyle requirements.
        
        Returns:
            Dictionary with 'comfortable' and 'modest' lifestyle comparisons
        """
        results = {}
        years_to_retirement = retirement_age - current_age
        
        # Calculate super at retirement
        super1, super2 = self.calculator.calculate_superannuation_at_retirement(
            current_super[0], current_super[1],
            annual_contributions[0], annual_contributions[1],
            years_to_retirement
        )
        total_super = super1 + super2
        total_assets = total_super + other_assets
        
        # Calculate pension (same for both lifestyles)
        pension = self.calculator.calculate_age_pension_eligibility(total_assets, True)
        
        for lifestyle in ['comfortable', 'modest']:
            capital_needs = self.calculator.calculate_total_retirement_capital_needed(
                retirement_age, lifestyle, pension['annual_pension']
            )
            
            retirement_needs = self.calculator.calculate_retirement_needs(lifestyle)
            surplus_deficit = total_assets - capital_needs['total_capital_needed']
            
            results[lifestyle] = {
                'annual_income_needed': retirement_needs['annual_need'],
                'capital_needed': capital_needs['total_capital_needed'],
                'surplus_deficit': surplus_deficit,
                'feasible': surplus_deficit >= 0
            }
        
        return results
    
    def print_retirement_age_comparison(self, scenarios: List[Dict[str, Any]]):
        """Print formatted comparison of retirement ages."""
        print("\nRetirement Age Comparison:")
        print("=" * 80)
        print(f"{'Age':<4} {'Years':<6} {'Super':<12} {'Pension':<10} {'Needed':<12} {'Surplus/Deficit':<15}")
        print("-" * 80)
        
        for scenario in scenarios:
            age = scenario['retirement_age']
            years = scenario['years_to_retirement']
            super_amt = scenario['total_super']
            pension = scenario['annual_pension']
            needed = scenario['capital_needed']
            surplus = scenario['surplus_deficit']
            
            status = "+" if surplus >= 0 else "-"
            print(f"{age:<4} {years:<6} ${super_amt/1000:>8.0f}k ${pension/1000:>6.0f}k ${needed/1000:>9.0f}k {status}${abs(surplus)/1000:>11.0f}k")
    
    def print_lifestyle_comparison(self, comparison: Dict[str, Dict[str, Any]]):
        """Print formatted lifestyle comparison."""
        print("\nLifestyle Comparison:")
        print("=" * 60)
        print(f"{'Lifestyle':<12} {'Income/Year':<12} {'Capital Needed':<15} {'Status':<10}")
        print("-" * 60)
        
        for lifestyle, data in comparison.items():
            income = data['annual_income_needed']
            capital = data['capital_needed']
            surplus = data['surplus_deficit']
            status = "✓ Feasible" if data['feasible'] else "✗ Shortfall"
            
            print(f"{lifestyle.title():<12} ${income:>9,.0f} ${capital:>12,.0f} {status}")
            if not data['feasible']:
                print(f"{'':>12} Shortfall: ${abs(surplus):,.0f}")


def demo_utilities():
    """Demonstrate the utility functions."""
    print("AUSTRALIAN RETIREMENT CALCULATOR - UTILITY DEMO")
    print("=" * 60)
    
    utils = RetirementPlanningUtils()
    
    # Example scenario
    current_super = (250000, 200000)
    annual_contributions = (20000, 18000)
    current_age = 50
    other_assets = 50000
    
    print(f"\nExample Scenario:")
    print(f"- Current super balances: ${current_super[0]:,} and ${current_super[1]:,}")
    print(f"- Annual contributions: ${annual_contributions[0]:,} and ${annual_contributions[1]:,}")
    print(f"- Current age: {current_age}")
    print(f"- Other assets: ${other_assets:,}")
    
    # Compare retirement ages
    print("\n1. RETIREMENT AGE COMPARISON")
    retirement_scenarios = utils.compare_retirement_ages(
        current_super, annual_contributions, current_age, other_assets
    )
    utils.print_retirement_age_comparison(retirement_scenarios)
    
    # Calculate savings target
    print("\n2. SAVINGS TARGET ANALYSIS (Retirement at 67)")
    savings_target = utils.calculate_savings_target(
        current_super, current_age, 67, 'comfortable', other_assets
    )
    
    print(f"Current trajectory (no additional savings):")
    print(f"  - Super at retirement: ${savings_target['baseline_super']:,.0f}")
    print(f"  - Annual pension: ${savings_target['annual_pension']:,.0f}")
    print(f"  - Capital needed: ${savings_target['capital_needed']:,.0f}")
    
    if savings_target['shortfall'] > 0:
        print(f"  - Shortfall: ${savings_target['shortfall']:,.0f}")
        print(f"  - Additional annual savings needed: ${savings_target['required_annual_savings']:,.0f}")
        print(f"  - Additional monthly savings needed: ${savings_target['required_monthly_savings']:,.0f}")
    else:
        print(f"  - Surplus: ${abs(savings_target['shortfall']):,.0f}")
        print("  - No additional savings required!")
    
    # Compare lifestyles
    print("\n3. LIFESTYLE COMPARISON (Retirement at 67)")
    lifestyle_comparison = utils.compare_lifestyles(
        current_super, annual_contributions, current_age, 67, other_assets
    )
    utils.print_lifestyle_comparison(lifestyle_comparison)
    
    print("\n" + "=" * 60)
    print("Utility demonstration complete!")


if __name__ == "__main__":
    demo_utilities()