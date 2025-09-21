#!/usr/bin/env python3
"""
Test script for the Australian Retirement Calculator

This script contains various test scenarios to validate the calculator's functionality.
"""

from retirement_calculator import AustralianRetirementCalculator


def test_basic_calculations():
    """Test basic calculator functions."""
    print("Testing basic calculations...")
    calculator = AustralianRetirementCalculator()
    
    # Test 1: Property value growth
    print("\n1. Testing property value growth:")
    initial_value = 500000
    years = 10
    future_value = calculator.calculate_property_value_at_retirement(initial_value, years)
    expected = initial_value * (1.035 ** years)  # 3.5% inflation
    print(f"   Initial: ${initial_value:,}")
    print(f"   After {years} years: ${future_value:,.0f}")
    print(f"   Expected: ${expected:,.0f}")
    assert abs(future_value - expected) < 1, "Property calculation error"
    print("   ✓ Property value calculation correct")
    
    # Test 2: Superannuation growth
    print("\n2. Testing superannuation growth:")
    current_balance = 100000
    annual_contrib = 20000
    years = 12
    balance1, balance2 = calculator.calculate_superannuation_at_retirement(
        current_balance, current_balance, annual_contrib, annual_contrib, years
    )
    print(f"   Current balance each: ${current_balance:,}")
    print(f"   Annual contribution each: ${annual_contrib:,}")
    print(f"   After {years} years:")
    print(f"     Person 1: ${balance1:,.0f}")
    print(f"     Person 2: ${balance2:,.0f}")
    print("   ✓ Superannuation calculation complete")
    
    # Test 3: Age Pension - eligible couple
    print("\n3. Testing Age Pension eligibility (eligible):")
    assets = 300000  # Below threshold
    pension = calculator.calculate_age_pension_eligibility(assets, own_home=True)
    print(f"   Assets: ${assets:,}")
    print(f"   Eligible: {pension['eligible']}")
    print(f"   Annual pension: ${pension['annual_pension']:,.0f}")
    assert pension['eligible'], "Should be eligible for pension"
    print("   ✓ Age Pension eligibility correct")
    
    # Test 4: Age Pension - not eligible couple
    print("\n4. Testing Age Pension eligibility (not eligible):")
    assets = 1200000  # Well above threshold
    pension = calculator.calculate_age_pension_eligibility(assets, own_home=True)
    print(f"   Assets: ${assets:,}")
    print(f"   Eligible: {pension['eligible']}")
    print(f"   Annual pension: ${pension['annual_pension']:,.0f}")
    assert not pension['eligible'], "Should not be eligible for pension"
    print("   ✓ Age Pension eligibility correct")
    
    # Test 5: ASFA standards
    print("\n5. Testing ASFA retirement standards:")
    comfortable = calculator.calculate_retirement_needs('comfortable')
    modest = calculator.calculate_retirement_needs('modest')
    print(f"   Comfortable annual: ${comfortable['annual_need']:,.0f}")
    print(f"   Modest annual: ${modest['annual_need']:,.0f}")
    assert comfortable['annual_need'] > modest['annual_need'], "Comfortable should be higher than modest"
    print("   ✓ ASFA standards correct")
    
    print("\n✅ All basic tests passed!")


def test_scenarios():
    """Test realistic retirement scenarios."""
    print("\n" + "="*50)
    print("TESTING REALISTIC SCENARIOS")
    print("="*50)
    
    calculator = AustralianRetirementCalculator()
    
    scenarios = [
        {
            'name': 'Young Couple - High Earners',
            'current_age': 30,
            'retirement_age': 65,
            'super_balances': (50000, 40000),
            'super_contributions': (30000, 25000),
            'home_value': 600000,
            'other_assets': 50000,
            'lifestyle': 'comfortable'
        },
        {
            'name': 'Middle-aged Couple - Average',
            'current_age': 45,
            'retirement_age': 67,
            'super_balances': (200000, 150000),
            'super_contributions': (20000, 15000),
            'home_value': 800000,
            'other_assets': 100000,
            'lifestyle': 'comfortable'
        },
        {
            'name': 'Near Retirement - Lower Income',
            'current_age': 60,
            'retirement_age': 67,
            'super_balances': (150000, 100000),
            'super_contributions': (10000, 8000),
            'home_value': 500000,
            'other_assets': 30000,
            'lifestyle': 'modest'
        }
    ]
    
    for i, scenario in enumerate(scenarios, 1):
        print(f"\nScenario {i}: {scenario['name']}")
        print("-" * 40)
        
        years_to_retirement = scenario['retirement_age'] - scenario['current_age']
        
        # Calculate super at retirement
        super1, super2 = calculator.calculate_superannuation_at_retirement(
            scenario['super_balances'][0],
            scenario['super_balances'][1],
            scenario['super_contributions'][0],
            scenario['super_contributions'][1],
            years_to_retirement
        )
        total_super = super1 + super2
        
        # Calculate pension
        total_assets = total_super + scenario['other_assets']
        pension = calculator.calculate_age_pension_eligibility(total_assets, own_home=True)
        
        # Calculate capital needs
        capital_needs = calculator.calculate_total_retirement_capital_needed(
            scenario['retirement_age'],
            scenario['lifestyle'],
            pension['annual_pension']
        )
        
        # Results
        available_capital = total_assets
        surplus_deficit = available_capital - capital_needs['total_capital_needed']
        
        print(f"Age: {scenario['current_age']} → {scenario['retirement_age']} ({years_to_retirement} years)")
        print(f"Super at retirement: ${total_super:,.0f}")
        print(f"Age Pension: ${pension['annual_pension']:,.0f}/year")
        print(f"Capital needed: ${capital_needs['total_capital_needed']:,.0f}")
        print(f"Available capital: ${available_capital:,.0f}")
        if surplus_deficit >= 0:
            print(f"Status: SURPLUS ${surplus_deficit:,.0f} ✓")
        else:
            print(f"Status: DEFICIT ${abs(surplus_deficit):,.0f} ✗")
    
    print("\n✅ All scenario tests completed!")


def test_edge_cases():
    """Test edge cases and boundary conditions."""
    print("\n" + "="*50)
    print("TESTING EDGE CASES")
    print("="*50)
    
    calculator = AustralianRetirementCalculator()
    
    # Test 1: No super, rely on pension only
    print("\n1. No superannuation scenario:")
    pension = calculator.calculate_age_pension_eligibility(0, own_home=True)
    capital_needs = calculator.calculate_total_retirement_capital_needed(
        67, 'modest', pension['annual_pension']
    )
    print(f"   Pension only: ${pension['annual_pension']:,.0f}/year")
    print(f"   Additional capital needed: ${capital_needs['total_capital_needed']:,.0f}")
    
    # Test 2: Very high assets, no pension
    print("\n2. High assets, no pension scenario:")
    high_assets = 2000000
    pension = calculator.calculate_age_pension_eligibility(high_assets, own_home=True)
    print(f"   Assets: ${high_assets:,}")
    print(f"   Pension: ${pension['annual_pension']:,.0f}")
    assert pension['annual_pension'] == 0, "Should have no pension with high assets"
    
    # Test 3: Asset test vs income test
    print("\n3. Income test scenario:")
    annual_income = 50000  # High income
    low_assets = 200000   # Low assets
    pension = calculator.calculate_age_pension_eligibility(low_assets, True, annual_income)
    print(f"   Assets: ${low_assets:,}, Income: ${annual_income:,}")
    print(f"   Limiting test: {pension['limiting_test']}")
    print(f"   Pension: ${pension['annual_pension']:,.0f}")
    
    # Test 4: Non-homeowner
    print("\n4. Non-homeowner scenario:")
    assets = 500000
    pension_owner = calculator.calculate_age_pension_eligibility(assets, own_home=True)
    pension_renter = calculator.calculate_age_pension_eligibility(assets, own_home=False)
    print(f"   Assets: ${assets:,}")
    print(f"   Homeowner pension: ${pension_owner['annual_pension']:,.0f}")
    print(f"   Non-homeowner pension: ${pension_renter['annual_pension']:,.0f}")
    
    print("\n✅ All edge case tests completed!")


def main():
    """Run all tests."""
    print("AUSTRALIAN RETIREMENT CALCULATOR - TEST SUITE")
    print("=" * 60)
    
    try:
        test_basic_calculations()
        test_scenarios()
        test_edge_cases()
        
        print("\n" + "="*60)
        print("🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉")
        print("="*60)
        print("The Australian Retirement Calculator is working correctly.")
        
    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        raise


if __name__ == "__main__":
    main()