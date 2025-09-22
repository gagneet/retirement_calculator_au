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

---

Enhanced Australian Retirement Calculator for Couples

This calculator provides a comprehensive retirement projection based on a wide
range of financial and lifestyle factors, including advanced modeling for
investment properties, healthcare, aged care, and market dynamics.

"""

import math
import random
import statistics
from typing import Dict, Any, List

from config import ENHANCED_CONFIG
import utils

class EnhancedRetirementSimulator:
    """
    Main simulation engine for the enhanced Australian retirement calculator.
    This class takes a dictionary of inputs and runs a detailed year-by-year
    simulation of a couple's financial future.
    """

    def __init__(self, inputs: Dict[str, Any]):
        """
        Initializes the simulator with all required inputs.
        """
        self.inputs = inputs
        self.config = ENHANCED_CONFIG
        self.previous_returns = {"portfolio": None, "property": None}

    def run_simulation(self, use_random_returns=False, stress_scenario=None) -> Dict[str, Any]:
        """
        Public method to run a single simulation.
        """
        return self._simulate_retirement(use_random_returns, stress_scenario)

    def run_monte_carlo_simulation(self, runs: int = 1000, progress_callback=None) -> Dict[str, Any]:
        """
        Runs the Monte Carlo simulation by performing many randomized runs.
        """
        outcomes = []
        for i in range(runs):
            result = self._simulate_retirement(use_random_returns=True)
            outcomes.append(result['finalBalance'])
            if progress_callback and i % 100 == 0:
                progress_callback(i, runs)

        outcomes.sort()

        return {
            "runs": runs,
            "success_rate": len([o for o in outcomes if o > 0]) / runs,
            "median": utils.median(outcomes),
            "percentile_10": outcomes[int(runs * 0.1)],
            "percentile_90": outcomes[int(runs * 0.9)],
        }

    def run_stress_tests(self) -> List[Dict[str, Any]]:
        """
        Runs a series of stress tests based on predefined scenarios.
        """
        results = []
        for scenario in self.config['STRESS_SCENARIOS']:
            result = self.run_simulation(stress_scenario=scenario)
            results.append({
                "scenario": scenario['name'],
                "finalBalance": result['finalBalance'],
                "success": result['finalBalance'] > 0
            })
        return results

    def solve_retirement_age(self, target_success_rate=0.7, min_age=None, max_age=None):
        """Calculates risk capacity based on age, income, and financial stability."""
        original_retirement_age = self.inputs['retirementAge']
        min_search_age = min_age or max(self.inputs['yourCurrentAge'] + 5, 55)
        max_search_age = max_age or min(self.inputs['yourLifespan'] - 10, 75)

        best_age = None
        low_age, high_age = min_search_age, max_search_age

        while low_age <= high_age:
            test_age = (low_age + high_age) // 2
            self.inputs['retirementAge'] = test_age

            mc_result = self.run_monte_carlo_simulation(runs=500)

            if mc_result['success_rate'] >= target_success_rate:
                best_age = test_age
                high_age = test_age - 1
            else:
                low_age = test_age + 1

        self.inputs['retirementAge'] = original_retirement_age
        return best_age

    def run_scenario_comparison(self, scenarios, progress_callback=None):
        results = []
        for i, scenario in enumerate(scenarios):
            scenario_inputs = {**self.inputs, **scenario['modifications']}
            simulator = EnhancedRetirementSimulator(scenario_inputs)

            if progress_callback:
                progress_callback(i, len(scenarios), f"Running scenario: {scenario['name']}")

            mc_result = simulator.run_monte_carlo_simulation(runs=1000)

            results.append({
                "name": scenario['name'],
                "description": scenario['description'],
                "successRate": mc_result['success_rate'],
                "medianBalance": mc_result['median'],
            })
        return results

    def get_common_scenarios(self):
        base_inputs = self.inputs
        return [
            {
                "name": "Current Plan",
                "description": "Your current retirement strategy",
                "modifications": {}
            },
            {
                "name": "Sell Property at Retirement",
                "description": "Sell investment property when you retire and invest proceeds",
                "modifications": {
                    "sellPropertyYears": base_inputs['retirementAge'] - base_inputs['yourCurrentAge'],
                }
            },
            {
                "name": "Retire 2 Years Later",
                "description": "Work 2 additional years before retiring",
                "modifications": {
                    "retirementAge": base_inputs['retirementAge'] + 2,
                }
            }
        ]

    def _simulate_retirement(self, use_random_returns=False, stress_scenario=None) -> Dict[str, Any]:
        self.previous_returns = {"portfolio": None, "property": None}
        # --- Accumulation Phase ---
        years_to_retirement = max(0, self.inputs['retirementAge'] - self.inputs['yourCurrentAge'])

        future_super = self.inputs['yourCurrentSuper'] + self.inputs['partnerCurrentSuper']
        future_savings = self.inputs['currentSavings']
        future_stocks = self.inputs['currentStocks']
        property_was_sold = False
        property_equity = 0

        for year in range(1, years_to_retirement + 1):
            your_current_age = self.inputs['yourCurrentAge'] + year

            if self.inputs['useGlidePath']:
                allocation = self._calculate_dynamic_allocation(your_current_age)
            else:
                allocation = {"equity": self.inputs.get('allocEquities', 60), "bonds": self.inputs.get('allocBonds', 30), "cash": self.inputs.get('allocCash', 10)}

            base_return = self._calculate_enhanced_return(allocation, self.inputs['investmentReturn'])

            if use_random_returns:
                return_rate = self._calculate_portfolio_return(allocation, base_return, year, self.inputs.get('returnDeclineRate', 0.03), True, self.previous_returns['portfolio'])
                self.previous_returns['portfolio'] = return_rate
            else:
                return_rate = self._calculate_portfolio_return(allocation, base_return, year, self.inputs.get('returnDeclineRate', 0.03), False)

            future_super *= (1 + self.inputs['superReturn'])
            future_savings *= (1 + self.inputs['savingsReturn'])
            future_stocks *= (1 + return_rate)

            your_years_to_work = max(0, min(self.inputs['retirementAge'], self.inputs['yourLifespan']) - self.inputs['yourCurrentAge'])
            partner_years_to_work = max(0, min(self.inputs['partnerRetirementAge'], self.inputs['partnerLifespan']) - self.inputs['partnerCurrentAge'])

            yearly_post_tax_income = 0
            yearly_super_contribution = 0

            if year <= your_years_to_work:
                your_salary = self._get_salary_for_year(self.inputs['yourSalary'], year)
                yearly_post_tax_income += utils.calculate_post_tax_income(your_salary, self.config['TAX_BRACKETS'])
                yearly_super_contribution += your_salary * self.config['SUPER_GUARANTEE_RATE']

            if year <= partner_years_to_work:
                partner_salary = self._get_salary_for_year(self.inputs['partnerSalary'], year)
                yearly_post_tax_income += utils.calculate_post_tax_income(partner_salary, self.config['TAX_BRACKETS'])
                yearly_super_contribution += partner_salary * self.config['SUPER_GUARANTEE_RATE']

            future_super += yearly_super_contribution
            future_savings += yearly_post_tax_income * self.inputs['percentIncomeSaved']
            future_stocks += self.inputs['monthlyStockContribution'] * 12

            if self.inputs.get('hasInvestmentProperty') and not property_was_sold:
                cash_flow = self._calculate_property_cash_flow(year)
                if cash_flow:
                    future_savings += cash_flow['netCashFlow']
                    if self.inputs['sellPropertyYears'] > 0 and year == self.inputs['sellPropertyYears']:
                        sale_result = self._calculate_property_sale(year)
                        if sale_result:
                            future_stocks += sale_result['netProceeds']
                            property_was_sold = True
                            property_equity = 0
                    else:
                        prop_val = self._calculate_property_value(year)
                        prop_loan = self._calculate_property_loan_balance(year)
                        property_equity = prop_val - prop_loan

        # --- Retirement Phase ---
        home_value_at_retirement = self.inputs['homeValue'] * (1 + self.inputs['inflation'])**years_to_retirement
        mortgage_balance_at_retirement = max(0, utils.calculate_loan_balance(self.inputs['mortgageRate'], years_to_retirement, self.inputs['monthlyMortgagePayment'] * 12, self.inputs['mortgageBalance']))
        home_equity_at_retirement = home_value_at_retirement - mortgage_balance_at_retirement
        accessible_home_equity = home_equity_at_retirement * self.config['HOME_EQUITY_ACCESS_RATE'] if self.inputs['planToDownsize'] else 0

        current_balance = future_super + future_savings + future_stocks + accessible_home_equity

        max_years_from_now = max(
            self.inputs['yourLifespan'] - self.inputs['yourCurrentAge'],
            self.inputs['partnerLifespan'] - self.inputs['partnerCurrentAge']
        )
        years_in_retirement = max(0, max_years_from_now - years_to_retirement)

        for i in range(int(years_in_retirement)):
            current_age = self.inputs['retirementAge'] + i
            retirement_year = years_to_retirement + i

            healthcare_cost = self._project_healthcare_costs(retirement_year)

            aged_care_costs_info = self._calculate_aged_care_costs()
            aged_care_cost = 0
            if current_age >= self.inputs['agedCareStartAge'] and current_age < self.inputs['agedCareStartAge'] + self.inputs['agedCareDuration']:
                aged_care_cost = aged_care_costs_info['annual_cost']

            income_needed = self.inputs['asfaComfortable'] * (1 + self.inputs['inflation'])**retirement_year
            total_withdrawal = income_needed + healthcare_cost + aged_care_cost

            pension = utils.calculate_age_pension(current_balance + property_equity, 0, True, self.inputs['agePensionMax'], self.inputs['pensionAssetThreshold'], self.inputs['pensionAssetLimit'], self.inputs['pensionIncomeThreshold'])

            net_withdrawal = max(0, total_withdrawal - pension)

            allocation = self._calculate_dynamic_allocation(current_age)
            base_return = self._calculate_enhanced_return(allocation, self.inputs['investmentReturn'])

            if use_random_returns:
                return_rate = self._calculate_portfolio_return(allocation, base_return, retirement_year, self.inputs.get('returnDeclineRate', 0.03), True, self.previous_returns['portfolio'])
                self.previous_returns['portfolio'] = return_rate
            else:
                return_rate = self._calculate_portfolio_return(allocation, base_return, retirement_year, self.inputs.get('returnDeclineRate', 0.03), False)

            growth = current_balance * return_rate
            current_balance += growth - net_withdrawal

            if current_balance <= 0:
                current_balance = 0
                break

        return { "finalBalance": current_balance }

    def _calculate_property_value(self, year: int) -> float:
        return self.inputs['investmentPropertyValue'] * (1 + self.inputs['propertyGrowthRate'] / 100)**year

    def _calculate_property_loan_balance(self, year: int) -> float:
        payment_heuristic = self.inputs['investmentPropertyLoan'] * self.inputs['investmentPropertyRate'] * 1.5
        return utils.calculate_loan_balance(self.inputs['investmentPropertyRate'], year, payment_heuristic, self.inputs['investmentPropertyLoan'])

    def _calculate_property_cash_flow(self, year: int) -> Dict[str, float]:
        if not self.inputs.get('hasInvestmentProperty'):
            return None

        inflation = self.inputs['inflation']
        current_rental = (self.inputs['weeklyRentalIncome'] * 52) * (1 + inflation)**year
        current_expenses = self.inputs['annualPropertyExpenses'] * (1 + inflation)**year

        current_loan_balance = self._calculate_property_loan_balance(year)
        annual_interest = current_loan_balance * self.inputs['investmentPropertyRate']

        building_value = self.inputs['investmentPropertyValue'] * 0.8
        depreciation = building_value * self.config['PROPERTY_COSTS']['DEPRECIATION_RATE']

        return {
            "grossRental": current_rental,
            "expenses": current_expenses,
            "interestCost": annual_interest,
            "depreciation": depreciation,
            "netCashFlow": current_rental - current_expenses - annual_interest + depreciation,
            "loanBalance": current_loan_balance
        }

    def _calculate_property_sale(self, sale_year: int) -> Dict[str, float]:
        if not self.inputs.get('hasInvestmentProperty'):
            return None

        sale_value = self._calculate_property_value(sale_year)
        remaining_loan = self._calculate_property_loan_balance(sale_year)
        selling_costs = sale_value * self.config['PROPERTY_COSTS']['SELLING_COSTS_PERCENT']

        cgt = utils.calculate_cgt(sale_value, self.inputs['investmentPropertyValue'], True, sale_year, self.inputs['capitalGainsTaxRate'] / 100)

        net_proceeds = sale_value - remaining_loan - selling_costs - cgt

        return { "saleValue": sale_value, "netProceeds": net_proceeds }

    def _calculate_enhanced_market_return(self, year: int, base_return: float, use_volatility: bool = False, prev_return: float = None) -> float:
        if not use_volatility:
            return base_return

        rate_regime = utils.get_current_rate_regime(year + 2024)
        equity_regimes = self.config['MARKET_REGIMES']['equityMarketRegimes']

        rand = random.random()
        cum_weight = 0
        selected_regime = equity_regimes[1]

        for regime in equity_regimes:
            cum_weight += regime['probability']
            if rand <= cum_weight:
                selected_regime = regime
                break

        actual_return = utils.regime_aware_return(selected_regime['baseReturn'], selected_regime['volatility'], prev_return, 0.05)

        rate_adjustment = (0.045 - rate_regime['cashRate']) * 0.5
        actual_return += rate_adjustment

        return actual_return

    def _calculate_portfolio_return(self, allocations, base_return, year, decline_rate, use_volatility=False, prev_return=None):
        if use_volatility:
            market_return = self._calculate_enhanced_market_return(year, base_return, use_volatility, prev_return)
            rate_regime = utils.get_current_rate_regime(year + 2024)

            equity_return = market_return
            bond_return = max(-0.15, rate_regime['cashRate'] + utils.random_normal(0, 0.04))
            cash_return = max(0.001, rate_regime['cashRate'] - 0.01)

            return (allocations['equity'] / 100) * equity_return + (allocations['bonds'] / 100) * bond_return + (allocations['cash'] / 100) * cash_return
        else:
            equity_return = self._get_return_for_year(base_return * 1.2, year, decline_rate)
            bond_return = self._get_return_for_year(base_return * 0.6, year, decline_rate * 0.5)
            cash_return = self._get_return_for_year(base_return * 0.3, year, 0)

            return (allocations['equity'] / 100) * equity_return + (allocations['bonds'] / 100) * bond_return + (allocations['cash'] / 100) * cash_return

    def _get_return_for_year(self, base_return, year, decline_rate):
        return max(0.01, base_return - (decline_rate / 100) * year)

    def _get_salary_for_year(self, base_salary, year):
        years_to_retirement = self.inputs['retirementAge'] - self.inputs['yourCurrentAge']
        real_growth_rate = self.inputs.get('salaryGrowthRate', 1.5) / 100
        inflation_rate = self.inputs['inflation']

        salary = base_salary * (1 + real_growth_rate + inflation_rate)**year

        lean_years_start = self.inputs.get('leanYearsStart', 5)
        lean_years_reduction = self.inputs.get('leanYearsReduction', 25)
        lean_years_start_year = years_to_retirement - lean_years_start
        if year >= lean_years_start_year:
            salary *= (1 - lean_years_reduction / 100)

        return salary

    def _calculate_dynamic_allocation(self, age: int) -> Dict[str, float]:
        rule_name = self.inputs['glidePathRule']
        rule_func_name = self.config['GLIDE_PATH_RULES'][rule_name]
        rule_func = getattr(utils, rule_func_name)

        equity_percent = rule_func(age)
        return {"equity": equity_percent, "bonds": max(10, (100 - equity_percent) * 0.7), "cash": max(5, (100 - equity_percent) * 0.3)}

    def _calculate_enhanced_return(self, allocation: Dict[str, float], base_return: float) -> float:
        franking_bonus = (allocation['equity'] / 100) * (self.inputs.get('australianEquityAllocation', 40) / 100) * (self.inputs.get('frankingCreditBenefit', 1.2) / 100)
        return base_return + franking_bonus

    def _project_healthcare_costs(self, years: int) -> float:
        return self.inputs['currentHealthcareCosts'] * (1 + self.inputs['healthcareInflation'] / 100)**years

    def _calculate_aged_care_costs(self) -> Dict[str, float]:
        years_to_aged_care = self.inputs['agedCareStartAge'] - self.inputs['yourCurrentAge']
        inflated_cost = self.inputs['agedCareAnnualCost'] * (1 + self.inputs['healthcareInflation'] / 100)**years_to_aged_care
        total_cost = inflated_cost * self.inputs['agedCareDuration']
        probability = self.inputs['agedCareProbability'] / 100
        return {"annual_cost": inflated_cost, "total_cost": total_cost, "expected_cost": total_cost * probability}


def get_default_inputs() -> Dict[str, Any]:
    """
    Returns a dictionary of default inputs, mimicking the frontend's initial state.
    This is useful for testing and for the CLI.
    """
    defaults = ENHANCED_CONFIG['DEFAULTS'].copy()

    flat_defaults = {}
    for category in defaults.values():
        flat_defaults.update(category)

    # Convert percentage inputs to decimals where needed
    percentage_fields = [
        'percentIncomeSaved', 'mortgageRate', 'investmentPropertyRate', 'inflation',
        'investmentReturn', 'savingsReturn', 'superReturn', 'returnVolatility',
        'shockProbability', 'shockMagnitude', 'capitalGainsTaxRate',
        'propertyGrowthRate', 'healthcareInflation', 'frankingCreditBenefit'
    ]

    # Flatten the dictionary
    for field in percentage_fields:
        if field in flat_defaults and isinstance(flat_defaults[field], (int, float)) and flat_defaults[field] > 1:
            flat_defaults[field] /= 100

    return flat_defaults


def main():
    """
    Example usage of the new EnhancedRetirementSimulator.
    This demonstrates how to initialize the class and run a simulation.
    """
    print("=" * 60)
    print("   ENHANCED AUSTRALIAN RETIREMENT CALCULATOR (PYTHON)")
    print("=" * 60)

    user_inputs = get_default_inputs()

    simulator = EnhancedRetirementSimulator(user_inputs)

    # Run deterministic simulation
    deterministic_results = simulator.run_simulation()
    print("\n--- Deterministic Simulation Results ---")
    print(f"Final Balance at Lifespan End: ${deterministic_results['finalBalance']:,.0f}")

    # Run Monte Carlo simulation
    print("\n--- Monte Carlo Simulation ---")
    mc_results = simulator.run_monte_carlo_simulation(runs=1000)
    print(f"Success Rate: {mc_results['success_rate']:.1%}")
    print(f"Median Outcome: ${mc_results['median']:,.0f}")
    print(f"10th Percentile: ${mc_results['percentile_10']:,.0f}")

    # Run solver
    print("\n--- Retirement Age Solver ---")
    earliest_age = simulator.solve_retirement_age()
    if earliest_age:
        print(f"Earliest retirement age with 70% success: {earliest_age}")
    else:
        print("Could not find a suitable retirement age.")

if __name__ == "__main__":
    main()
