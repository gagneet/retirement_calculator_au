#!/usr/bin/env python3
"""
Test script for the Enhanced Australian Retirement Calculator.

This script contains a comprehensive suite of tests for the EnhancedRetirementSimulator,
validating its structure, calculations, and advanced features.
"""

import unittest
from retirement_calculator import EnhancedRetirementSimulator, get_default_inputs

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
        """Test a basic run of the deterministic simulation."""
        results = self.simulator.run_simulation()
        self.assertIn('finalBalance', results)
        self.assertIsInstance(results['finalBalance'], (int, float))
        print("✓ Basic deterministic simulation runs and returns expected keys.")

    def test_monte_carlo_simulation(self):
        """Test the Monte Carlo simulation runs and returns correct format."""
        # Reduced runs for speed in testing; 100 is sufficient to validate functionality
        # without compromising test suite performance.
        mc_results = self.simulator.run_monte_carlo_simulation(runs=100)

        self.assertIn('success_rate', mc_results)
        self.assertIn('median', mc_results)
        self.assertLessEqual(mc_results['success_rate'], 1.0)
        self.assertGreaterEqual(mc_results['success_rate'], 0.0)
        print("✓ Monte Carlo simulation runs and returns correct format.")

    def test_downsizing_impact(self):
        """Test the effect of downsizing on the simulation results."""
        inputs_no_downsize = self.default_inputs.copy()
        inputs_no_downsize['planToDownsize'] = False
        sim_no_downsize = EnhancedRetirementSimulator(inputs_no_downsize)
        res_no_downsize = sim_no_downsize.run_simulation()

        inputs_yes_downsize = self.default_inputs.copy()
        inputs_yes_downsize['planToDownsize'] = True
        sim_yes_downsize = EnhancedRetirementSimulator(inputs_yes_downsize)
        res_yes_downsize = sim_yes_downsize.run_simulation()

        # Final balance should be higher with downsizing, as more equity is accessed
        self.assertGreater(res_yes_downsize['finalBalance'], res_no_downsize['finalBalance'])
        print("✓ Downsizing correctly impacts final balance.")

    def test_investment_property_impact(self):
        """Test the effect of having an investment property."""
        inputs_no_property = self.default_inputs.copy()
        inputs_no_property['hasInvestmentProperty'] = False
        sim_no_property = EnhancedRetirementSimulator(inputs_no_property)
        res_no_property = sim_no_property.run_simulation()

        inputs_with_property = self.default_inputs.copy()
        inputs_with_property['hasInvestmentProperty'] = True
        sim_with_property = EnhancedRetirementSimulator(inputs_with_property)
        res_with_property = sim_with_property.run_simulation()

        # The impact of an investment property can be positive or negative,
        # so we just check that the final balance is different.
        self.assertNotEqual(res_no_property['finalBalance'], res_with_property['finalBalance'])
        print("✓ Investment property correctly impacts final balance.")

    def test_retirement_age_solver(self):
        """Test the retirement age solver."""
        # Use a high income to ensure a solution is found
        inputs = self.default_inputs.copy()
        inputs['yourSalary'] = 300000
        simulator = EnhancedRetirementSimulator(inputs)

        earliest_age = simulator.solve_retirement_age()

        self.assertIsNotNone(earliest_age)
        self.assertIsInstance(earliest_age, int)
        self.assertGreater(earliest_age, inputs['yourCurrentAge'])
        print("✓ Retirement age solver finds a valid age.")

    def test_stress_tests(self):
        """Test that stress tests run and return a list of results."""
        stress_results = self.simulator.run_stress_tests()

        self.assertIsInstance(stress_results, list)
        self.assertGreater(len(stress_results), 0)
        self.assertIn('scenario', stress_results[0])
        self.assertIn('finalBalance', stress_results[0])
        self.assertIn('success', stress_results[0])
        print("✓ Stress tests run and return correct format.")

    def test_scenario_comparison(self):
        """Test the scenario comparison feature."""
        scenarios = self.simulator.get_common_scenarios()
        results = self.simulator.run_scenario_comparison(scenarios)

        self.assertIsInstance(results, list)
        self.assertEqual(len(results), len(scenarios))
        self.assertIn('name', results[0])
        self.assertIn('successRate', results[0])
        self.assertIn('medianBalance', results[0])
        print("✓ Scenario comparison runs and returns correct format.")


def main():
    """Run all tests."""
    print("ENHANCED RETIREMENT CALCULATOR - TEST SUITE")
    print("=" * 60)

    suite = unittest.TestSuite()
    suite.addTest(unittest.makeSuite(TestEnhancedRetirementSimulator))
    runner = unittest.TextTestRunner()
    result = runner.run(suite)

    if result.wasSuccessful():
        print("\n🎉 ALL TESTS PASSED SUCCESSFULLY! 🎉")
    else:
        print("\n❌ SOME TESTS FAILED ❌")


if __name__ == "__main__":
    main()
