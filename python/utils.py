# python/utils.py - Utility functions for the Enhanced Australian Retirement Calculator

import math
import random
from typing import Dict, Any, List

from config import ENHANCED_CONFIG

def clamp(value, min_value, max_value):
    """Clamps a value between a minimum and maximum."""
    return max(min_value, min(value, max_value))

def random_normal(mean, std_dev, seed=None):
    """Generates a random number from a normal distribution."""
    if seed is not None:
        random.seed(seed)
    return random.normalvariate(mean, std_dev)

def calculate_post_tax_income(pre_tax_income: float, tax_brackets: List[Dict[str, Any]]) -> float:
    """Calculates post-tax income based on Australian tax brackets."""
    taxable_income = pre_tax_income
    tax = 0
    
    for bracket in tax_brackets:
        if taxable_income > bracket['min']:
            taxable_at_rate = min(taxable_income, bracket['max']) - bracket['min']
            tax += taxable_at_rate * bracket['rate']
            
    return pre_tax_income - tax

def calculate_loan_balance(rate: float, years: int, annual_payment: float, principal: float) -> float:
    """Calculates the remaining balance of a loan."""
    if rate <= 0:
        return max(0, principal - (annual_payment * years))
        
    balance = principal * ((1 + rate) ** years) - \
              annual_payment * ((((1 + rate) ** years) - 1) / rate)
    return max(0, balance)

def calculate_cgt(sale_value: float, cost_base: float, is_resident: bool, years_held: int, marginal_tax_rate: float) -> float:
    """Calculates Capital Gains Tax (CGT)."""
    capital_gain = sale_value - cost_base
    if capital_gain <= 0:
        return 0
        
    # 50% discount for assets held over 12 months by an individual
    if is_resident and years_held >= 1:
        taxable_gain = capital_gain * 0.5
    else:
        taxable_gain = capital_gain
        
    return taxable_gain * marginal_tax_rate

def calculate_age_pension(assets: float, income: float, is_couple: bool, max_pension: float, asset_threshold: float, asset_limit: float, income_threshold: float) -> float:
    """Calculates the Age Pension based on assets and income tests."""
    # Asset test
    if assets >= asset_limit:
        asset_test_pension = 0
    else:
        excess_assets = max(0, assets - asset_threshold)
        reduction = (excess_assets / 1000) * 3 * 26 # $3 per fortnight per $1000
        asset_test_pension = max(0, max_pension - reduction)

    # Income test
    fortnightly_income = income / 26
    excess_income = max(0, fortnightly_income - income_threshold)
    reduction = excess_income * 0.5 * 26 # 50c per dollar per fortnight
    income_test_pension = max(0, max_pension - reduction)
    
    # The pension paid is the lower of the two tests
    return min(asset_test_pension, income_test_pension)

# --- Glide Path Functions ---
def glide_path_120_minus_age(age: int) -> int:
    """Glide path rule: 120 - age."""
    return clamp(120 - age, 20, 90)

def glide_path_110_minus_age(age: int) -> int:
    """Glide path rule: 110 - age."""
    return clamp(110 - age, 20, 80)

def glide_path_100_minus_age(age: int) -> int:
    """Glide path rule: 100 - age."""
    return clamp(100 - age, 20, 70)
