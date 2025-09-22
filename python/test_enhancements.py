#!/usr/bin/env python3
"""
Test script for the enhancements in the Enhanced Australian Retirement Calculator.
"""

from retirement_calculator import EnhancedRetirementSimulator, get_default_inputs
import unittest

class TestSimulatorEnhancements(unittest.TestCase):

    def setUp(self):
        """Set up default inputs for each test."""
        self.inputs = get_default_inputs()

    def test_investment_property(self):
        """Test the investment property calculations."""
        self.inputs['hasInvestmentProperty'] = True
        self.inputs['investmentPropertyValue'] = 500000
        self.inputs['investmentPropertyLoan'] = 400000
        self.inputs['weeklyRentalIncome'] = 500
        
        simulator = EnhancedRetirementSimulator(self.inputs)
        
        # Test property cash flow
        cash_flow = simulator._calculate_property_cash_flow(year=1)
        self.assertIsNotNone(cash_flow)
        self.assertGreater(cash_flow['grossRental'], 25000)
        
        # Test property sale
        sale = simulator._calculate_property_sale(sale_year=10)
        self.assertIsNotNone(sale)
        self.assertGreater(sale['saleValue'], self.inputs['investmentPropertyValue'])
        self.assertGreater(sale['netProceeds'], 0)
        print("✓ Investment property calculations are working.")

    def test_aged_care_costs(self):
        """Test the aged care cost calculations."""
        simulator = EnhancedRetirementSimulator(self.inputs)
        aged_care = simulator._calculate_aged_care_costs()
        
        self.assertIn('annual_cost', aged_care)
        self.assertIn('total_cost', aged_care)
        self.assertIn('expected_cost', aged_care)
        self.assertGreater(aged_care['annual_cost'], self.inputs['agedCareAnnualCost'])
        print("✓ Aged care cost calculations are working.")

    def test_monte_carlo_simulation(self):
        """Test the Monte Carlo simulation runs and returns correct format."""
        simulator = EnhancedRetirementSimulator(self.inputs)
        # Using 200 runs as a compromise between test speed and statistical reliability.
        mc_results = simulator.run_monte_carlo_simulation(runs=200)
        
        self.assertIn('success_rate', mc_results)
        self.assertIn('median', mc_results)
        self.assertIn('percentile_10', mc_results)
        self.assertIn('percentile_90', mc_results)
        self.assertLessEqual(mc_results['success_rate'], 1.0)
        self.assertGreaterEqual(mc_results['success_rate'], 0.0)
        print("✓ Monte Carlo simulation runs and returns correct format.")

    def test_risk_profile_calculations(self):
        """Test the risk profile calculations."""
        simulator = EnhancedRetirementSimulator(self.inputs)
        
        capacity = simulator._calculate_risk_capacity()
        requirement = simulator._calculate_risk_requirement()
        
        self.assertGreaterEqual(capacity, 0)
        self.assertLessEqual(capacity, 100)
        self.assertGreaterEqual(requirement, 0)
        self.assertLessEqual(requirement, 100)
        print("✓ Risk profile calculations are working.")

    def test_stress_tests(self):
        """Test that stress tests run and return a list of results."""
        simulator = EnhancedRetirementSimulator(self.inputs)
        stress_results = simulator.run_stress_tests()

        self.assertIsInstance(stress_results, list)
        self.assertGreater(len(stress_results), 0)
        self.assertIn('scenario', stress_results[0])
        self.assertIn('finalBalance', stress_results[0])
        self.assertIn('success', stress_results[0])
        print("✓ Stress tests run and return correct format.")


def main():
    """Run all enhancement tests."""
    print("ENHANCED RETIREMENT CALCULATOR - ENHANCEMENT TEST SUITE")
    print("=" * 60)
    
    suite = unittest.TestSuite()
    suite.addTest(unittest.makeSuite(TestSimulatorEnhancements))
    runner = unittest.TextTestRunner()
    result = runner.run(suite)

    if result.wasSuccessful():
        print("\n🎉 ALL ENHANCEMENT TESTS PASSED SUCCESSFULLY! 🎉")
    else:
        print("\n❌ SOME ENHANCEMENT TESTS FAILED ❌")


if __name__ == "__main__":
    main()
