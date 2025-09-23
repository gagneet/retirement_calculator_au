#!/usr/bin/env python3
"""
Advanced Australian Retirement Calculator

This module provides advanced retirement planning capabilities including:
- Risk profiling and assessment
- Portfolio optimization suggestions
- Comprehensive property analysis
- AI-generated recommendations
- Advanced export capabilities
- Interactive visualization-ready data
"""

import argparse
import sys
from pathlib import Path
from typing import Dict, Any, List
import json
try:
    import pandas as pd
    HAS_PANDAS = True
except ImportError:
    HAS_PANDAS = False
    pd = None

# Add current directory to path for imports
sys.path.append(str(Path(__file__).parent))

from retirement_calculator import EnhancedRetirementSimulator, get_default_inputs
from config import ENHANCED_CONFIG

class AdvancedRetirementCalculator:
    """
    Advanced retirement calculator with enhanced analysis and reporting capabilities
    """

    def __init__(self, inputs: Dict[str, Any] = None):
        self.inputs = inputs or get_default_inputs()
        self.simulator = EnhancedRetirementSimulator(self.inputs)
        self.results = None

    def run_comprehensive_analysis(self, monte_carlo_runs: int = 5000) -> Dict[str, Any]:
        """Run a comprehensive retirement analysis"""
        print("🔍 Running comprehensive retirement analysis...")

        # Run deterministic simulation
        deterministic_results = self.simulator.run_simulation()

        # Run Monte Carlo simulation
        print(f"📊 Running Monte Carlo simulation with {monte_carlo_runs:,} scenarios...")
        mc_results = self.simulator.run_monte_carlo_simulation(runs=monte_carlo_runs)

        # Run stress tests
        print("🌪️ Running stress test scenarios...")
        stress_results = self.simulator.run_stress_tests()

        # Scenario comparisons
        print("🔀 Analyzing scenario comparisons...")
        scenarios = self.simulator.get_common_scenarios()
        scenario_results = self.simulator.run_scenario_comparison(scenarios)

        # Compile comprehensive results
        self.results = {
            'deterministic': deterministic_results,
            'monte_carlo': mc_results,
            'stress_tests': stress_results,
            'scenarios': scenario_results,
            'risk_profile': self.simulator.risk_profile,
            'recommendations': self.simulator.generate_recommendations(),
            'property_analysis': self.simulator.property_analysis
        }

        return self.results

    def generate_detailed_report(self) -> str:
        """Generate a detailed text report"""
        if not self.results:
            raise ValueError("Must run analysis first")

        report = []
        report.append("=" * 80)
        report.append("🇦🇺 ADVANCED AUSTRALIAN RETIREMENT CALCULATOR - COMPREHENSIVE REPORT")
        report.append("=" * 80)

        # Executive Summary
        report.append("\n📋 EXECUTIVE SUMMARY")
        report.append("-" * 40)
        final_balance = self.results['deterministic']['finalBalance']
        success_rate = self.results['monte_carlo']['success_rate']
        median_outcome = self.results['monte_carlo']['median']

        report.append(f"Final Projected Balance: ${final_balance:,.0f}")
        report.append(f"Monte Carlo Success Rate: {success_rate:.1%}")
        report.append(f"Median Monte Carlo Outcome: ${median_outcome:,.0f}")

        # Risk Profile Analysis
        if self.results['risk_profile']:
            rp = self.results['risk_profile']
            report.append("\n🎯 RISK PROFILE ANALYSIS")
            report.append("-" * 40)
            report.append(f"Risk Capacity (Ability): {rp.capacity:.1f}/100")
            report.append(f"Risk Tolerance (Willingness): {rp.tolerance:.1f}/100")
            report.append(f"Risk Requirement (Need): {rp.requirement:.1f}/100")
            report.append(f"Overall Risk Score: {rp.overall_score:.1f}/100")
            report.append(f"Recommendation: {rp.recommendation}")

        # AI Recommendations
        report.append("\n🤖 AI-GENERATED RECOMMENDATIONS")
        report.append("-" * 40)
        for i, rec in enumerate(self.results['recommendations'][:5], 1):
            report.append(f"{i}. {rec['title']} [{rec['priority']} Priority]")
            report.append(f"   Category: {rec['category']}")
            report.append(f"   Description: {rec['description']}")
            report.append(f"   Expected Impact: {rec['impact']}")
            report.append("")

        # Property Analysis
        if self.results['property_analysis']:
            prop = self.results['property_analysis']
            report.append("\n🏠 INVESTMENT PROPERTY ANALYSIS")
            report.append("-" * 40)
            report.append(f"Current Value: ${prop['currentValue']:,.0f}")
            report.append(f"Current Equity: ${prop['currentEquity']:,.0f}")

            if prop['sellVsKeepAnalysis']:
                sell_data = prop['sellVsKeepAnalysis']
                report.append(f"Sale Analysis (Year {sell_data['sellYear']}):")
                report.append(f"  - Projected Sale Value: ${sell_data['saleValue']:,.0f}")
                report.append(f"  - Net Proceeds: ${sell_data['netProceeds']:,.0f}")

        # Stress Test Results
        report.append("\n🌪️ STRESS TEST RESULTS")
        report.append("-" * 40)
        for test in self.results['stress_tests']:
            status = "✅ PASS" if test['success'] else "❌ FAIL"
            report.append(f"{test['scenario']:<30} {status}")

        # Scenario Comparison
        report.append("\n🔀 SCENARIO COMPARISON")
        report.append("-" * 40)
        for scenario in self.results['scenarios']:
            report.append(f"{scenario['name']:<25} Success: {scenario['successRate']:.1%}")
            report.append(f"{'':25} Median: ${scenario['medianBalance']:,.0f}")

        return "\n".join(report)

    def export_to_excel(self, filename: str = None) -> str:
        """Export comprehensive analysis to Excel with multiple sheets"""
        if not HAS_PANDAS:
            raise ImportError("pandas and openpyxl are required for Excel export. Install with: pip install pandas openpyxl")

        if not filename:
            filename = f"retirement_analysis_advanced_{pd.Timestamp.now().strftime('%Y%m%d_%H%M')}.xlsx"

        if not self.results:
            raise ValueError("Must run analysis first")

        with pd.ExcelWriter(filename, engine='openpyxl') as writer:
            # Summary sheet
            summary_data = {
                'Metric': [
                    'Final Balance',
                    'Monte Carlo Success Rate (%)',
                    'Monte Carlo Median Outcome',
                    'Risk Capacity Score',
                    'Risk Tolerance Score',
                    'Risk Requirement Score',
                    'Overall Risk Score'
                ],
                'Value': [
                    self.results['deterministic']['finalBalance'],
                    self.results['monte_carlo']['success_rate'] * 100,
                    self.results['monte_carlo']['median'],
                    self.results['risk_profile'].capacity if self.results['risk_profile'] else 0,
                    self.results['risk_profile'].tolerance if self.results['risk_profile'] else 0,
                    self.results['risk_profile'].requirement if self.results['risk_profile'] else 0,
                    self.results['risk_profile'].overall_score if self.results['risk_profile'] else 0
                ]
            }
            pd.DataFrame(summary_data).to_excel(writer, sheet_name='Summary', index=False)

            # Projections sheet
            if self.simulator.projection_data:
                proj_data = []
                for proj in self.simulator.projection_data:
                    proj_data.append({
                        'Year': proj.year,
                        'Age': proj.age,
                        'Liquid Assets': proj.liquid_assets,
                        'Non-Liquid Assets': proj.non_liquid_assets,
                        'Growth': proj.growth,
                        'Withdrawal': proj.withdrawal,
                        'Healthcare Cost': proj.healthcare_cost,
                        'Aged Care Cost': proj.aged_care_cost,
                        'End Balance': proj.end_balance,
                        'Total Net Worth': proj.total_net_worth,
                        'Pension Received': proj.pension_received,
                        'Depleted': proj.depleted
                    })
                pd.DataFrame(proj_data).to_excel(writer, sheet_name='Year_by_Year', index=False)

            # Recommendations sheet
            rec_data = []
            for rec in self.results['recommendations']:
                rec_data.append({
                    'Category': rec['category'],
                    'Priority': rec['priority'],
                    'Title': rec['title'],
                    'Description': rec['description'],
                    'Impact': rec['impact']
                })
            pd.DataFrame(rec_data).to_excel(writer, sheet_name='Recommendations', index=False)

            # Stress tests sheet
            stress_data = []
            for test in self.results['stress_tests']:
                stress_data.append({
                    'Scenario': test['scenario'],
                    'Final Balance': test['finalBalance'],
                    'Success': test['success']
                })
            pd.DataFrame(stress_data).to_excel(writer, sheet_name='Stress_Tests', index=False)

            # Property analysis sheet (if applicable)
            if self.results['property_analysis'] and self.results['property_analysis']['cashFlowProjection']:
                prop_data = self.results['property_analysis']['cashFlowProjection']
                pd.DataFrame(prop_data).to_excel(writer, sheet_name='Property_Projection', index=False)

        return filename

    def get_visualization_data(self) -> Dict[str, Any]:
        """Get data formatted for visualization tools"""
        if not self.results:
            raise ValueError("Must run analysis first")

        viz_data = {
            'projection_timeline': [],
            'risk_profile': {},
            'scenario_comparison': [],
            'stress_test_results': [],
            'monte_carlo_summary': {}
        }

        # Timeline data for charts
        if self.simulator.projection_data:
            for proj in self.simulator.projection_data:
                viz_data['projection_timeline'].append({
                    'year': proj.year,
                    'age': proj.age,
                    'balance': proj.end_balance,
                    'net_worth': proj.total_net_worth,
                    'withdrawal': proj.withdrawal,
                    'allocation_equity': proj.allocation.get('equity', 0),
                    'allocation_bonds': proj.allocation.get('bonds', 0),
                    'allocation_cash': proj.allocation.get('cash', 0)
                })

        # Risk profile for radar chart
        if self.results['risk_profile']:
            viz_data['risk_profile'] = {
                'capacity': self.results['risk_profile'].capacity,
                'tolerance': self.results['risk_profile'].tolerance,
                'requirement': self.results['risk_profile'].requirement,
                'overall': self.results['risk_profile'].overall_score
            }

        # Scenario comparison
        viz_data['scenario_comparison'] = self.results['scenarios']

        # Stress test results
        viz_data['stress_test_results'] = self.results['stress_tests']

        # Monte Carlo summary
        viz_data['monte_carlo_summary'] = {
            'success_rate': self.results['monte_carlo']['success_rate'],
            'median': self.results['monte_carlo']['median'],
            'percentile_10': self.results['monte_carlo']['percentile_10'],
            'percentile_90': self.results['monte_carlo']['percentile_90']
        }

        return viz_data

def main():
    """Main function for advanced calculator CLI"""
    parser = argparse.ArgumentParser(
        description='Advanced Australian Retirement Calculator with AI recommendations',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python advanced_calculator.py --analysis                    # Run comprehensive analysis
  python advanced_calculator.py --quick-report               # Quick analysis with report
  python advanced_calculator.py --export-excel               # Full analysis with Excel export
  python advanced_calculator.py --runs 10000 --export-all    # High-precision analysis with all exports
        """
    )

    parser.add_argument('--analysis', action='store_true',
                       help='Run comprehensive analysis')
    parser.add_argument('--quick-report', action='store_true',
                       help='Run analysis and display detailed report')
    parser.add_argument('--export-excel', action='store_true',
                       help='Export results to Excel')
    parser.add_argument('--export-all', action='store_true',
                       help='Export to all formats (CSV, JSON, Excel)')
    parser.add_argument('--runs', type=int, default=5000,
                       help='Number of Monte Carlo simulation runs (default: 5000)')
    parser.add_argument('--config', type=str,
                       help='Path to JSON config file with custom inputs')

    args = parser.parse_args()

    if not any([args.analysis, args.quick_report, args.export_excel, args.export_all]):
        parser.print_help()
        return

    try:
        # Load custom config if provided
        inputs = None
        if args.config:
            with open(args.config, 'r') as f:
                inputs = json.load(f)
                print(f"✅ Loaded custom configuration from {args.config}")

        # Initialize calculator
        calc = AdvancedRetirementCalculator(inputs)

        # Run analysis
        results = calc.run_comprehensive_analysis(monte_carlo_runs=args.runs)

        print("✅ Analysis complete!")

        if args.analysis or args.quick_report:
            print("\n" + calc.generate_detailed_report())

        if args.export_excel or args.export_all:
            excel_file = calc.export_to_excel()
            print(f"📊 Excel report exported to: {excel_file}")

        if args.export_all:
            csv_file = calc.simulator.export_to_csv()
            json_file = calc.simulator.export_to_json()
            from datetime import datetime
            viz_data_file = f"visualization_data_{datetime.now().strftime('%Y%m%d_%H%M')}.json"

            with open(viz_data_file, 'w') as f:
                json.dump(calc.get_visualization_data(), f, indent=2)

            print(f"📈 Additional exports created:")
            print(f"  - CSV: {csv_file}")
            print(f"  - JSON: {json_file}")
            print(f"  - Visualization data: {viz_data_file}")

    except FileNotFoundError as e:
        print(f"❌ File not found: {e}")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"❌ Invalid JSON in config file: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error during analysis: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()