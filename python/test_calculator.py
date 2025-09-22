#!/usr/bin/env python3
"""
Test script for the Enhanced Australian Retirement Calculator

This script contains various test scenarios to validate the calculator's new structure.
"""

from retirement_calculator import EnhancedRetirementSimulator, get_default_inputs
import unittest

class TestEnhancedRetirementSimulator(unittest.TestCase):

    def setUp(self):
        """Set up a default simulator for each test."""
        self.default_inputs = get_default_inputs()
        self.simulator = EnhancedRetirementSimulator(self.default_inputs)

    def test_initialization(self):
        """Test that the simulator initializes correctly."""
        self.assertIsNotNone(self.simulator)
        self.assertEqual(self.simulator.inputs, self.default_inputs)
        print("✓ Simulator initializes correctly.")

    def test_basic_simulation_run(self):
        """Test a basic run of the simulation."""
        results = self.simulator.run_simulation()
        self.assertIn('finalBalance', results)
        self.assertIn('totalFinancialAssets', results)
        self.assertIn('yearlyData', results)
        self.assertTrue(isinstance(results['yearlyData'], list))
        print("✓ Basic simulation runs and returns expected keys.")

    def test_simulation_with_no_income(self):
        """Test simulation with zero income."""
        inputs = self.default_inputs.copy()
        inputs['yourSalary'] = 0
        inputs['partnerSalary'] = 0
        inputs['monthlyStockContribution'] = 0
        inputs['percentIncomeSaved'] = 0
        
        simulator = EnhancedRetirementSimulator(inputs)
        results = simulator.run_simulation()
        
        # With no income, super should not grow from contributions, only returns
        # and final balance should be lower
        base_case_results = self.simulator.run_simulation()
        self.assertLess(results['totalFinancialAssets'], base_case_results['totalFinancialAssets'])
        print("✓ Simulation with no income runs correctly.")

    def test_downsizing_impact(self):
        """Test the effect of downsizing."""
        inputs_no_downsize = self.default_inputs.copy()
        inputs_no_downsize['planToDownsize'] = False
        inputs_no_downsize['currentSuper'] = 1000000  # Use a higher balance to avoid depletion
        sim_no_downsize = EnhancedRetirementSimulator(inputs_no_downsize)
        res_no_downsize = sim_no_downsize.run_simulation()

        inputs_yes_downsize = self.default_inputs.copy()
        inputs_yes_downsize['planToDownsize'] = True
        inputs_yes_downsize['currentSuper'] = 1000000  # Use a higher balance to avoid depletion
        sim_yes_downsize = EnhancedRetirementSimulator(inputs_yes_downsize)
        res_yes_downsize = sim_yes_downsize.run_simulation()

        # Downsizing should result in higher accessible home equity and thus higher final balance
        self.assertGreater(res_yes_downsize['accessibleHomeEquity'], 0)
        self.assertEqual(res_no_downsize['accessibleHomeEquity'], 0)
        self.assertGreater(res_yes_downsize['finalBalance'], res_no_downsize['finalBalance'])
        print("✓ Downsizing correctly impacts accessible home equity and final balance.")


def main():
    """Run all tests."""
    print("ENHANCED RETIREMENT CALCULATOR - TEST SUITE")
    print("=" * 60)
    
    suite = unittest.TestSuite()
    suite.addTest(unittest.makeSuite(TestEnhancedRetirementSimulator))
    runner = unittest.TextTestRunner()
    result = runner.run(suite)

    if result.wasSuccessful():
        print("\n🎉 ALL BASE TESTS PASSED SUCCESSFULLY! 🎉")
    else:
        print("\n❌ SOME BASE TESTS FAILED ❌")


if __name__ == "__main__":
    main()
