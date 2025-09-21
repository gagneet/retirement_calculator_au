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
from typing import Dict, Any, List
import numpy as np

from config import ENHANCED_CONFIG
from utils import (
    calculate_post_tax_income, 
    calculate_loan_balance,
    calculate_cgt,
    calculate_age_pension,
    random_normal,
    clamp
)


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
        self.calc_consts = self.config['CALCULATION_CONSTANTS']

    def run_simulation(self, use_random_returns=False, stress_scenario=None) -> Dict[str, Any]:
        """
        Public method to run a single simulation.
        """
        return self._simulate_retirement(use_random_returns, stress_scenario)

    def run_monte_carlo_simulation(self, runs: int = 1000) -> Dict[str, Any]:
        """
        Runs the Monte Carlo simulation by performing many randomized runs.
        """
        outcomes = [self._simulate_retirement(use_random_returns=True)['finalBalance'] for _ in range(runs)]
        outcomes.sort()
        
        return {
            "runs": runs,
            "success_rate": len([o for o in outcomes if o > 0]) / runs,
            "median": np.median(outcomes),
            "percentile_10": np.percentile(outcomes, 10),
            "percentile_90": np.percentile(outcomes, 90),
        }

    def run_stress_tests(self) -> List[Dict[str, Any]]:
        """
        Runs a series of stress tests based on predefined scenarios.
        """
        results = []
        for scenario in self.config['STRESS_SCENARIOS']:
            result = self._simulate_retirement(stress_scenario=scenario)
            results.append({
                "scenario": scenario['name'],
                "finalBalance": result['finalBalance'],
                "success": result['finalBalance'] > 0
            })
        return results

    def _calculate_risk_capacity(self) -> int:
        """Calculates risk capacity based on age, income, and financial stability."""
        score = 50
        age = self.inputs['yourCurrentAge']
        if age < 35: score += 25
        elif age < 50: score += 15
        elif age < 65: score += 5
        else: score -= 10
        
        total_income = self.inputs['yourSalary'] + self.inputs['partnerSalary']
        if total_income > 200000: score += 20
        elif total_income > 100000: score += 10
        
        emergency_fund = self.inputs.get('hasEmergencyFund', 'none')
        if emergency_fund == 'full': score += 15
        elif emergency_fund == 'partial': score += 10
        
        debt_level = self.inputs.get('hasDebt', 'none')
        if debt_level == 'none': score += 15
        elif debt_level == 'minimal': score += 5
        
        score -= self.inputs.get('dependents', 0) * 5
        return clamp(score, 0, 100)

    def _calculate_risk_requirement(self) -> int:
        """Calculates the investment risk required to meet retirement goals."""
        years_to_retirement = self.inputs['retirementAge'] - self.inputs['yourCurrentAge']
        if years_to_retirement <= 0: return 100
        
        target_assets = self.inputs['asfaComfortable'] * self.calc_consts['RISK_REQUIREMENT_ASSET_TARGET_MULTIPLIER']
        current_assets = self.inputs['currentSuper'] + self.inputs['currentSavings'] + self.inputs['currentStocks']
        if current_assets == 0: return 100
        
        required_growth = (target_assets / current_assets)**(1/years_to_retirement) - 1
        risk_free_rate = self.calc_consts['RISK_REQUIREMENT_RISK_FREE_RATE']
        sensitivity = self.calc_consts['RISK_REQUIREMENT_SENSITIVITY_FACTOR']
        
        return clamp((required_growth - risk_free_rate) * 100 * sensitivity, 0, 100)

    def _calculate_dynamic_allocation(self, age: int) -> Dict[str, float]:
        """Calculates the recommended asset allocation based on a glide path rule."""
        rule = self.inputs['glidePathRule']
        equity_percent = self.config['GLIDE_PATH_RULES'][rule](age)
        return {
            "equity": equity_percent,
            "bonds": max(10, (100 - equity_percent) * 0.7),
            "cash": max(5, (100 - equity_percent) * 0.3)
        }

    def _calculate_enhanced_return(self, allocation: Dict[str, float], base_return: float) -> float:
        """Calculates the total return, including franking credit benefits."""
        franking_bonus = (allocation['equity'] / 100) * \
                         (self.inputs['australianEquityAllocation'] / 100) * \
                         (self.inputs['frankingCreditBenefit'] / 100)
        return base_return + franking_bonus

    def _project_healthcare_costs(self, years: int) -> float:
        """Projects future healthcare costs based on a specific inflation rate."""
        return self.inputs['currentHealthcareCosts'] * \
               ((1 + self.inputs['healthcareInflation'] / 100) ** years)

    def _calculate_aged_care_costs(self) -> Dict[str, float]:
        """Calculates the inflated costs of future aged care."""
        years_to_aged_care = self.inputs['agedCareStartAge'] - self.inputs['yourCurrentAge']
        inflated_cost = self.inputs['agedCareAnnualCost'] * \
                        ((1 + self.inputs['healthcareInflation'] / 100) ** years_to_aged_care)
        total_cost = inflated_cost * self.inputs['agedCareDuration']
        probability = self.inputs['agedCareProbability'] / 100
        return {
            "annual_cost": inflated_cost,
            "total_cost": total_cost,
            "expected_cost": total_cost * probability
        }

    def _calculate_property_value(self, year: int) -> float:
        """Calculates the future value of the investment property."""
        return self.inputs['investmentPropertyValue'] * \
               ((1 + self.inputs['propertyGrowthRate'] / 100) ** year)

    def _calculate_property_loan_balance(self, year: int) -> float:
        """Calculates the remaining loan balance on the investment property."""
        # This is a simplified calculation. A more accurate model would use the actual monthly payments.
        return calculate_loan_balance(
            self.inputs['investmentPropertyRate'],
            year,
            self.inputs['investmentPropertyLoan'] * self.inputs['investmentPropertyRate'] * 1.5, # Simplified payment
            self.inputs['investmentPropertyLoan']
        )
    
    def _calculate_property_cash_flow(self, year: int) -> Dict[str, float]:
        """Calculates the net cash flow from the investment property for a given year."""
        if not self.inputs.get('hasInvestmentProperty'):
            return None
        
        inflation = self.inputs['inflation']
        current_rental = (self.inputs['weeklyRentalIncome'] * 52) * ((1 + inflation) ** year)
        current_expenses = self.inputs['annualPropertyExpenses'] * ((1 + inflation) ** year)
        
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
        """Calculates the net proceeds from selling the investment property."""
        if not self.inputs.get('hasInvestmentProperty'):
            return None
            
        sale_value = self._calculate_property_value(sale_year)
        remaining_loan = self._calculate_property_loan_balance(sale_year)
        selling_costs = sale_value * self.config['PROPERTY_COSTS']['SELLING_COSTS_PERCENT']
        
        cgt = calculate_cgt(
            sale_value,
            self.inputs['investmentPropertyValue'],
            True,
            sale_year,
            self.inputs['capitalGainsTaxRate'] / 100
        )
        
        net_proceeds = sale_value - remaining_loan - selling_costs - cgt
        
        return {
            "saleValue": sale_value,
            "netProceeds": net_proceeds,
        }

    def _get_salary_for_year(self, base_salary: float, year: int) -> float:
        """Calculates the projected salary for a given year, including lean years."""
        years_to_retirement = self.inputs['retirementAge'] - self.inputs['yourCurrentAge']
        real_growth = self.inputs['salaryGrowthRate'] / 100
        inflation = self.inputs['inflation']
        
        salary = base_salary * ((1 + real_growth + inflation) ** year)
        
        lean_years_start_year = years_to_retirement - self.inputs['leanYearsStart']
        if year >= lean_years_start_year:
            salary *= (1 - self.inputs['leanYearsReduction'] / 100)
            
        return salary
        
    def _simulate_retirement(self, use_random_returns=False, stress_scenario=None) -> Dict[str, Any]:
        """The core simulation engine. Runs a single projection from start to finish."""
        # --- Accumulation Phase ---
        years_to_retirement = self.inputs['retirementAge'] - self.inputs['yourCurrentAge']
        
        future_super = self.inputs['currentSuper']
        future_savings = self.inputs['currentSavings']
        future_stocks = self.inputs['currentStocks']
        
        property_was_sold = False
        property_equity = 0
        
        for year in range(1, years_to_retirement + 1):
            current_age = self.inputs['yourCurrentAge'] + year
            
            allocation = self._calculate_dynamic_allocation(current_age) if self.inputs['useGlidePath'] else {"equity": 60, "bonds": 30, "cash": 10}
            
            base_return = self._calculate_enhanced_return(allocation, self.inputs['investmentReturn'])
            return_rate = random_normal(base_return, self.inputs['returnVolatility']) if use_random_returns else base_return

            if stress_scenario and year <= stress_scenario.get('duration', 0):
                return_rate = stress_scenario.get('equityReturn', return_rate)

            future_super *= (1 + self.inputs['superReturn'])
            future_savings *= (1 + self.inputs['savingsReturn'])
            future_stocks *= (1 + return_rate)
            
            your_salary = self._get_salary_for_year(self.inputs['yourSalary'], year)
            partner_salary = self._get_salary_for_year(self.inputs['partnerSalary'], year)
            
            post_tax_income = calculate_post_tax_income(your_salary, self.config['TAX_BRACKETS']) + \
                              calculate_post_tax_income(partner_salary, self.config['TAX_BRACKETS'])
            
            future_super += (your_salary + partner_salary) * self.config['SUPER_GUARANTEE_RATE']
            future_savings += post_tax_income * self.inputs['percentIncomeSaved']
            future_stocks += self.inputs['monthlyStockContribution'] * 12
            
            if self.inputs['hasInvestmentProperty'] and not property_was_sold:
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
        total_financial_assets = future_super + future_savings + future_stocks
        home_equity = self.inputs['homeValue'] * ((1 + self.inputs['inflation']) ** years_to_retirement) - \
                      calculate_loan_balance(self.inputs['mortgageRate'], years_to_retirement, self.inputs['monthlyMortgagePayment']*12, self.inputs['mortgageBalance'])
        accessible_home_equity = home_equity * self.config['HOME_EQUITY_ACCESS_RATE'] if self.inputs['planToDownsize'] else 0

        current_balance = total_financial_assets + accessible_home_equity
        yearly_data = []
        
        for i in range(self.inputs['partnerLifespan'] - self.inputs['retirementAge']):
            current_age = self.inputs['retirementAge'] + i
            retirement_year = years_to_retirement + i
            
            healthcare_cost = self._project_healthcare_costs(retirement_year)
            if stress_scenario and 'healthcareCostMultiplier' in stress_scenario:
                healthcare_cost *= stress_scenario['healthcareCostMultiplier']

            aged_care_costs_info = self._calculate_aged_care_costs()
            aged_care_cost = 0
            if current_age >= self.inputs['agedCareStartAge'] and current_age < self.inputs['agedCareStartAge'] + self.inputs['agedCareDuration']:
                aged_care_cost = aged_care_costs_info['annual_cost']

            income_needed = self.inputs['asfaComfortable'] * ((1 + self.inputs['inflation']) ** retirement_year)
            total_withdrawal = income_needed + healthcare_cost + aged_care_cost
            
            pension = calculate_age_pension(current_balance + property_equity, 0, True, self.inputs['agePensionMax'], self.inputs['pensionAssetThreshold'], self.inputs['pensionAssetLimit'], self.inputs['pensionIncomeThreshold'])
            
            net_withdrawal = max(0, total_withdrawal - pension)
            
            allocation = self._calculate_dynamic_allocation(current_age)
            base_return = self._calculate_enhanced_return(allocation, self.inputs['investmentReturn'])
            return_rate = random_normal(base_return, self.inputs['returnVolatility']) if use_random_returns else base_return
            
            if self.inputs['enableShocks'] and use_random_returns and random.random() < self.inputs['shockProbability']:
                return_rate += self.inputs['shockMagnitude']

            growth = current_balance * return_rate
            current_balance += growth - net_withdrawal
            
            if current_balance <= 0:
                current_balance = 0
                yearly_data.append({"year": retirement_year + 1, "endBalance": 0, "depleted": True})
                break
                
            yearly_data.append({"year": retirement_year + 1, "endBalance": current_balance, "depleted": False})

        return {
            "finalBalance": current_balance,
            "totalFinancialAssets": total_financial_assets,
            "accessibleHomeEquity": accessible_home_equity,
            "yearlyData": yearly_data,
            "riskCapacity": self._calculate_risk_capacity(),
            "riskRequirement": self._calculate_risk_requirement(),
        }


def get_default_inputs() -> Dict[str, Any]:
    """
    Returns a dictionary of default inputs, mimicking the frontend's initial state.
    This is useful for testing and for the CLI.
    """
    defaults = {}
    for category in ENHANCED_CONFIG['DEFAULTS'].values():
        defaults.update(category)
    # JS values are in %, python expects decimals for rates
    defaults['percentIncomeSaved'] /= 100 if defaults.get('percentIncomeSaved', 0) > 1 else 1
    defaults['mortgageRate'] /= 100 if defaults.get('mortgageRate', 0) > 1 else 1
    defaults['investmentPropertyRate'] /= 100 if defaults.get('investmentPropertyRate', 0) > 1 else 1
    defaults['inflation'] /= 100 if defaults.get('inflation', 0) > 1 else 1
    defaults['investmentReturn'] /= 100 if defaults.get('investmentReturn', 0) > 1 else 1
    defaults['savingsReturn'] /= 100 if defaults.get('savingsReturn', 0) > 1 else 1
    defaults['superReturn'] /= 100 if defaults.get('superReturn', 0) > 1 else 1
    defaults['returnVolatility'] /= 100 if defaults.get('returnVolatility', 0) > 1 else 1
    defaults['shockProbability'] /= 100 if defaults.get('shockProbability', 0) > 1 else 1
    defaults['shockMagnitude'] /= 100 if defaults.get('shockMagnitude', 0) > 1 else 1
    return defaults


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
    if deterministic_results['yearlyData'] and deterministic_results['yearlyData'][-1]['depleted']:
        print(f"!!! FUNDS DEPLETED IN YEAR {deterministic_results['yearlyData'][-1]['year']} !!!")

    # Run Monte Carlo simulation
    print("\n--- Monte Carlo Simulation ---")
    mc_results = simulator.run_monte_carlo_simulation(runs=1000)
    print(f"Success Rate: {mc_results['success_rate']:.1%}")
    print(f"Median Outcome: ${mc_results['median']:,.0f}")
    print(f"10th Percentile: ${mc_results['percentile_10']:,.0f}")
    print(f"90th Percentile: ${mc_results['percentile_90']:,.0f}")

    # Run Stress Tests
    print("\n--- Stress Test Results ---")
    stress_results = simulator.run_stress_tests()
    for res in stress_results:
        status = "✓ Survives" if res['success'] else "✗ Fails"
        print(f"{res['scenario']:<25} | Final Balance: ${res['finalBalance']:<15,.0f} | {status}")

    print("\n" + "=" * 60)


if __name__ == "__main__":
    main()