#!/usr/bin/env python3
"""
Australian Retirement Calculator for Couples

This calculator helps Australian couples determine the amount of money needed for retirement,
considering various factors including:
- Age Pension eligibility
- Superannuation balances
- Property ownership and value growth
- ASFA retirement standards
- Living to age 95
"""

import math
from datetime import datetime, date
from typing import Dict, Tuple, Optional


class AustralianRetirementCalculator:
    """
    Main calculator class for Australian retirement planning for couples.
    """
    
    def __init__(self):
        # Current rates as of 2024 (these should be updated regularly)
        self.PENSION_AGE = 67  # Current pension age in Australia
        self.MAX_AGE = 95  # Life expectancy target
        
        # Age Pension rates (per fortnight) as of March 2024
        self.AGE_PENSION_COUPLE_COMBINED = 1725.70  # Combined for couple
        self.AGE_PENSION_COUPLE_EACH = 1158.40  # Each person in couple
        
        # Age Pension asset test thresholds (as of 2024)
        self.ASSET_TEST_HOMEOWNER_COUPLE = 451000  # Threshold for couple with home
        self.ASSET_TEST_NON_HOMEOWNER_COUPLE = 667000  # Threshold for couple without home
        
        # Age Pension income test thresholds (per fortnight)
        self.INCOME_TEST_COUPLE_COMBINED = 372  # Combined free area
        self.INCOME_TEST_REDUCTION_RATE = 0.25  # 25% reduction rate
        
        # ASFA retirement standards (per quarter) as of December 2023
        self.ASFA_COMFORTABLE_COUPLE = 17729  # Quarterly
        self.ASFA_MODEST_COUPLE = 12715  # Quarterly
        
        # Inflation and growth rates
        self.INFLATION_RATE = 0.035  # 3.5% annual inflation
        self.SUPER_GROWTH_RATE = 0.07  # 7% annual super growth
        
    def calculate_property_value_at_retirement(self, 
                                             current_value: float, 
                                             years_to_retirement: int) -> float:
        """
        Calculate property value at retirement assuming inflation-only growth.
        
        Args:
            current_value: Current property value
            years_to_retirement: Number of years until retirement
            
        Returns:
            Property value at retirement
        """
        return current_value * (1 + self.INFLATION_RATE) ** years_to_retirement
    
    def calculate_superannuation_at_retirement(self, 
                                             current_balance_person1: float,
                                             current_balance_person2: float,
                                             annual_contribution_person1: float,
                                             annual_contribution_person2: float,
                                             years_to_retirement: int) -> Tuple[float, float]:
        """
        Calculate superannuation balances at retirement.
        
        Args:
            current_balance_person1: Current super balance for person 1
            current_balance_person2: Current super balance for person 2
            annual_contribution_person1: Annual super contributions for person 1
            annual_contribution_person2: Annual super contributions for person 2
            years_to_retirement: Number of years until retirement
            
        Returns:
            Tuple of (person1_balance, person2_balance) at retirement
        """
        def future_value_with_contributions(current_balance, annual_contribution, years):
            # Future value of current balance
            fv_current = current_balance * (1 + self.SUPER_GROWTH_RATE) ** years
            
            # Future value of annual contributions (annuity)
            if self.SUPER_GROWTH_RATE > 0:
                fv_contributions = annual_contribution * (
                    ((1 + self.SUPER_GROWTH_RATE) ** years - 1) / self.SUPER_GROWTH_RATE
                )
            else:
                fv_contributions = annual_contribution * years
                
            return fv_current + fv_contributions
        
        balance1 = future_value_with_contributions(current_balance_person1, 
                                                 annual_contribution_person1, 
                                                 years_to_retirement)
        balance2 = future_value_with_contributions(current_balance_person2, 
                                                 annual_contribution_person2, 
                                                 years_to_retirement)
        
        return balance1, balance2
    
    def calculate_age_pension_eligibility(self, 
                                        combined_assets: float,
                                        own_home: bool,
                                        annual_income: float = 0) -> Dict[str, float]:
        """
        Calculate Age Pension eligibility and payment amount.
        
        Args:
            combined_assets: Total assessable assets for the couple
            own_home: Whether the couple owns their home
            annual_income: Annual assessable income
            
        Returns:
            Dictionary with pension details
        """
        # Determine asset test threshold
        asset_threshold = (self.ASSET_TEST_HOMEOWNER_COUPLE if own_home 
                          else self.ASSET_TEST_NON_HOMEOWNER_COUPLE)
        
        # Asset test calculation
        if combined_assets <= asset_threshold:
            asset_test_reduction = 0
        else:
            # Reduction is $3 per fortnight for every $1000 over threshold
            excess_assets = combined_assets - asset_threshold
            asset_test_reduction = (excess_assets / 1000) * 3
        
        # Income test calculation
        fortnightly_income = annual_income / 26
        if fortnightly_income <= self.INCOME_TEST_COUPLE_COMBINED:
            income_test_reduction = 0
        else:
            excess_income = fortnightly_income - self.INCOME_TEST_COUPLE_COMBINED
            income_test_reduction = excess_income * self.INCOME_TEST_REDUCTION_RATE
        
        # Take the higher reduction (more restrictive test)
        total_reduction = max(asset_test_reduction, income_test_reduction)
        
        # Calculate final pension amount
        max_pension = self.AGE_PENSION_COUPLE_COMBINED
        pension_fortnightly = max(0, max_pension - total_reduction)
        pension_annual = pension_fortnightly * 26
        
        return {
            'eligible': pension_annual > 0,
            'annual_pension': pension_annual,
            'fortnightly_pension': pension_fortnightly,
            'asset_test_reduction': asset_test_reduction,
            'income_test_reduction': income_test_reduction,
            'limiting_test': 'asset' if asset_test_reduction >= income_test_reduction else 'income'
        }
    
    def calculate_retirement_needs(self, lifestyle: str = 'comfortable') -> Dict[str, float]:
        """
        Calculate retirement income needs based on ASFA standards.
        
        Args:
            lifestyle: 'comfortable' or 'modest' retirement lifestyle
            
        Returns:
            Dictionary with annual and quarterly income needs
        """
        if lifestyle.lower() == 'comfortable':
            quarterly_need = self.ASFA_COMFORTABLE_COUPLE
        else:
            quarterly_need = self.ASFA_MODEST_COUPLE
            
        annual_need = quarterly_need * 4
        
        return {
            'annual_need': annual_need,
            'quarterly_need': quarterly_need,
            'monthly_need': quarterly_need / 3,
            'lifestyle': lifestyle
        }
    
    def calculate_total_retirement_capital_needed(self,
                                                retirement_age: int,
                                                lifestyle: str = 'comfortable',
                                                annual_pension: float = 0) -> Dict[str, float]:
        """
        Calculate total capital needed for retirement from retirement age to 95.
        
        Args:
            retirement_age: Age when retiring
            lifestyle: 'comfortable' or 'modest' retirement lifestyle
            annual_pension: Expected annual Age Pension amount
            
        Returns:
            Dictionary with capital requirements
        """
        years_in_retirement = self.MAX_AGE - retirement_age
        retirement_needs = self.calculate_retirement_needs(lifestyle)
        annual_expenses = retirement_needs['annual_need']
        
        # Calculate net capital needed (after pension)
        net_annual_need = max(0, annual_expenses - annual_pension)
        
        # Calculate present value of retirement needs
        # Using inflation rate as discount rate to maintain purchasing power
        if self.INFLATION_RATE > 0:
            total_capital_needed = net_annual_need * (
                (1 - (1 + self.INFLATION_RATE) ** (-years_in_retirement)) / self.INFLATION_RATE
            )
        else:
            total_capital_needed = net_annual_need * years_in_retirement
        
        return {
            'total_capital_needed': total_capital_needed,
            'annual_shortfall': net_annual_need,
            'years_in_retirement': years_in_retirement,
            'total_expenses': annual_expenses * years_in_retirement,
            'total_pension_received': annual_pension * years_in_retirement
        }


def main():
    """
    Example usage of the Australian Retirement Calculator
    """
    calculator = AustralianRetirementCalculator()
    
    print("=== Australian Retirement Calculator for Couples ===\n")
    
    # Example couple scenario
    print("Example Scenario:")
    print("- Couple, both aged 55, planning to retire at 67")
    print("- Current super balances: $200,000 and $150,000")
    print("- Annual super contributions: $25,000 and $20,000")
    print("- Own home worth $800,000")
    print("- Target: Comfortable retirement to age 95\n")
    
    # Calculate property value at retirement
    years_to_retirement = 67 - 55
    current_home_value = 800000
    home_value_at_retirement = calculator.calculate_property_value_at_retirement(
        current_home_value, years_to_retirement
    )
    
    print(f"Home value at retirement (inflation growth): ${home_value_at_retirement:,.0f}")
    
    # Calculate super balances at retirement
    super1, super2 = calculator.calculate_superannuation_at_retirement(
        200000, 150000, 25000, 20000, years_to_retirement
    )
    total_super = super1 + super2
    
    print(f"Total superannuation at retirement: ${total_super:,.0f}")
    print(f"  - Person 1: ${super1:,.0f}")
    print(f"  - Person 2: ${super2:,.0f}")
    
    # Calculate Age Pension eligibility
    # Note: Home is not counted in asset test if it's the principal residence
    assessable_assets = total_super  # Assuming no other significant assets
    pension_details = calculator.calculate_age_pension_eligibility(
        assessable_assets, own_home=True
    )
    
    print(f"\nAge Pension Assessment:")
    print(f"  - Eligible: {'Yes' if pension_details['eligible'] else 'No'}")
    print(f"  - Annual pension: ${pension_details['annual_pension']:,.0f}")
    print(f"  - Limiting test: {pension_details['limiting_test'].title()}")
    
    # Calculate retirement capital needs
    capital_needs = calculator.calculate_total_retirement_capital_needed(
        retirement_age=67,
        lifestyle='comfortable',
        annual_pension=pension_details['annual_pension']
    )
    
    print(f"\nRetirement Capital Requirements:")
    print(f"  - Years in retirement: {capital_needs['years_in_retirement']}")
    print(f"  - Total capital needed: ${capital_needs['total_capital_needed']:,.0f}")
    print(f"  - Annual shortfall: ${capital_needs['annual_shortfall']:,.0f}")
    
    # Calculate surplus/deficit
    available_capital = total_super
    surplus_deficit = available_capital - capital_needs['total_capital_needed']
    
    print(f"\nRetirement Readiness:")
    print(f"  - Available capital: ${available_capital:,.0f}")
    print(f"  - Capital needed: ${capital_needs['total_capital_needed']:,.0f}")
    if surplus_deficit >= 0:
        print(f"  - Surplus: ${surplus_deficit:,.0f} ✓")
    else:
        print(f"  - Deficit: ${abs(surplus_deficit):,.0f} ✗")
        
    # ASFA standards
    retirement_needs = calculator.calculate_retirement_needs('comfortable')
    print(f"\nASFA Comfortable Retirement Standard:")
    print(f"  - Annual income needed: ${retirement_needs['annual_need']:,.0f}")
    print(f"  - Monthly income needed: ${retirement_needs['monthly_need']:,.0f}")


if __name__ == "__main__":
    main()