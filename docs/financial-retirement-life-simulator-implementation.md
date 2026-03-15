Instead of a calculator, users should also now run a **life simulator** — almost like a financial version of a game engine that advances year-by-year through a person’s life.

Since we already have:

* ✅ **Simple Calculator**
* ✅ **Advanced Calculator**
* ✅ **Monte Carlo engine**
* ✅ **JSON save/load**
* ✅ **Australian retirement modelling**

the correct approach is **not replacing anything**, but **adding a third engine**:

```
Simple Calculator
Advanced Calculator
Financial Life Simulation Engine  ← NEW
```

All three engines share the **same user data model**.

---

# 1. The Core Idea: Event-Driven Life Simulation

Instead of calculating retirement in one formula, we simulate **a person's entire financial life timeline**.

The engine runs:

```
Age 18 → Death
```

Each year:

```
income
expenses
super contributions
tax
investment returns
property changes
family events
government benefits
economic shocks
```

This is exactly how **Voyant, eMoney, and WealthTrace** operate.

---

# 2. Visual Model of the Architecture

```
                ┌───────────────────────┐
                │    User JSON Data     │
                │ (same as calculators) │
                └──────────┬────────────┘
                           │
              ┌────────────▼────────────┐
              │ Financial State Engine  │
              │ (current wealth state)  │
              └────────────┬────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
  Income Engine     Expense Engine    Asset Engine
         │                 │                 │
         └──────────────┬──┴──┬──────────────┘
                        │     │
                Life Event Engine
                        │
                Risk / Shock Engine
                        │
                Pension Engine
                        │
                Tax Engine
                        │
                Monte Carlo Runner
                        │
                Strategy Optimiser
                        │
                Retirement Guidance
```

---

# 3. How It Integrates With Your Current App

Your existing calculators remain.

Add a **new tab or mode**:

```
Choose Calculator Mode:

[ Simple Retirement Estimate ]
[ Advanced Retirement Planner ]
[ Financial Life Simulator ]   ← NEW
```

The simulator will:

1. Load **existing JSON input**
2. Ask for **missing simulation fields**
3. Run **life timeline simulations**

---

# 4. Reusing the Existing JSON

Your current JSON already contains many required fields:

Examples from your file:

* ages
* salary
* super
* investments
* property
* dependents
* healthcare
* Monte Carlo parameters

Example structure:

```
userData:
    yourCurrentAge
    retirementAge
    yourSalary
    superContributionRate
    propertyGrowthRate
    investmentReturn
    shockProbability
```

These become the **initial financial state**.

---

# 5. Additional Fields the Simulator May Ask

When loading an Advanced Calculator JSON, the simulator may prompt for extra data.

Example additions:

```
ageCameToAustralia
ageStartedWorkingInAustralia
childrenBirthYears
expectedInheritance
plannedPropertyPurchaseAge
incomeDropAge
semiRetirementAge
downsizingAge
```

These become **life events**.

---

# 6. Financial State Object

Every simulation year produces a snapshot.

Example:

```python
class FinancialState:

    age
    salary
    expenses

    super_balance
    investment_assets
    property_assets
    trust_assets

    liabilities
    net_worth

    taxable_income
    pension_income
```

This state evolves annually.

---

# 7. Life Event Engine

Events trigger changes in the timeline.

Examples:

```
SalaryChangeEvent
ChildBirthEvent
EducationExpenseEvent
PropertyPurchaseEvent
PropertySaleEvent
RetirementEvent
AgedCareEvent
InheritanceEvent
HealthShockEvent
```

Example structure:

```
event:
    trigger_age
    duration
    financial_impact
```

---

# 8. Example Timeline Simulation

Example for a user age **49 → 93**.

```
Age 49  salary 276k
Age 50  salary 280k
Age 52  child university cost
Age 56  income reduction event
Age 60  super access
Age 67  pension eligibility
Age 72  retirement
Age 86  aged care probability
```

Each year updates wealth.

---

# 9. Example Year Simulation

Pseudo code:

```
for age in range(current_age, lifespan):

    apply_life_events()

    salary = income_engine()
    expenses = expense_engine()

    super_balance += super_contributions

    investment_assets *= market_return()

    property_assets *= property_growth()

    tax = tax_engine()

    pension = pension_engine()

    net_worth = assets - liabilities
```

---

# 10. Monte Carlo Integration

Monte Carlo runs the entire life simulation many times.

```
for run in range(numRuns):

    simulate_life()

    record:
        retirement_success
        wealth_trajectory
```

Outputs:

```
probability_of_success
median_retirement_wealth
worst_case_age_of_ruin
```

---

# 11. Strategy Engine

The simulator can automatically test strategies.

Examples:

```
delay retirement 2 years
increase super contributions
sell investment property
downsize home
reduce spending
```

Each strategy runs a full simulation.

---

# 12. Recommendation Engine

After simulations:

```
Your retirement success probability: 61%

Recommended improvements:

1 Increase super contributions to 15%
2 Delay retirement by 3 years
3 Downsize property at age 70
4 Reduce spending by 8%
```

---

# 13. Risk Event Engine

Random shocks:

```
market crash
inflation spike
health event
property downturn
```

Example:

```
if random() < shockProbability:
    portfolio *= shockMagnitude
```

---

# 14. Why This Architecture Is Powerful

It allows modelling of:

✔ migrants
✔ blended families
✔ trusts
✔ SMSF
✔ property investors
✔ early retirement
✔ health shocks
✔ economic collapse scenarios

---

# 15. Comprehensive GitHub Copilot Prompt

You can give the following prompt to Copilot.

---

# GitHub Copilot Prompt

## Build Financial Life Simulation Engine Module

You are working on an Australian retirement planning application that currently contains:

* Simple Retirement Calculator
* Advanced Retirement Calculator
* Monte Carlo projection engine
* JSON save/load system

Example input schema is shown here:



Your task is to build a **new module** called:

```
Financial Life Simulation Engine
```

This module must exist **alongside the existing calculators**, not replace them.

---

# Design Requirements

The engine must:

* load existing JSON data
* reuse all existing fields
* request additional fields when required
* simulate a year-by-year financial life timeline
* run Monte Carlo simulations
* generate retirement recommendations

---

# Module Architecture

Create a new folder:

```
/simulation_engine
```

Modules inside:

```
financial_state.py
life_event_engine.py
income_engine.py
expense_engine.py
super_engine.py
investment_engine.py
property_engine.py
trust_engine.py
tax_engine.py
pension_engine.py
shock_engine.py
monte_carlo_engine.py
strategy_engine.py
recommendation_engine.py
```

---

# Integration Requirements

The simulation engine must:

1. Load existing calculator JSON
2. Map fields into simulation state
3. Ask for missing inputs
4. Run life simulation
5. Return results compatible with UI charts

---

# Example API

```
runLifeSimulation(userData)

runMonteCarlo(userData)

generateStrategyRecommendations(simulationResults)
```

---

# UI Integration

Add new option:

```
Financial Life Simulator
```

Allow users to:

```
Load Advanced Calculator data
Run life simulation
Compare scenarios
```

---

# Save / Load Compatibility

The simulator must:

* read existing JSON files
* support schema version upgrades
* preserve backward compatibility

---

# Legal Disclaimer

Display mandatory disclaimer:

```
This simulator provides general financial projections only.
It does not constitute financial advice.
Users should consult a licensed financial advisor.
```

---

# Expected Outcome

The system becomes a **professional-grade financial life simulation platform** capable of modelling:

* Australian superannuation
* Age pension eligibility
* property investment
* trusts
* economic shocks
* retirement strategies

while remaining compatible with the existing calculators.

---

# 16. One Last Feature That Would Make This Incredible

Because you already enjoy building **complex simulation systems** (similar to your **strata financial intelligence work**), the next capability you could add is something almost **no retirement calculator has**:

### “Future Regret Minimisation Engine”

It runs simulations and answers:

```
"What decisions today reduce the probability of regret at age 85?"
```

It’s extremely powerful.

---

The **Dynamic Spending Strategy Engine** is one of the most powerful features in professional retirement planning tools.
It dramatically improves retirement outcomes because **retirees do not spend a fixed amount every year** — they adjust spending based on portfolio performance.

This engine fits **perfectly into the Financial Life Simulation Engine we just designed**, and it can reuse your existing fields like:

* `asfaComfortable`
* `investmentReturn`
* `returnVolatility`
* `allocEquities`
* `inflation`
* `numRuns`
* `leanYearsStart`
* `leanYearsReduction`

from the JSON structure you already store. 

---

# 1. The Problem With Traditional Retirement Calculators

Most calculators assume **fixed spending**:

```text
Annual retirement spending = $84,000
```

But in reality retirees:

* spend **more early**
* spend **less during market crashes**
* spend **less at older ages**
* increase spending if portfolio grows

A fixed model causes **false projections**.

Professional planning tools use **dynamic spending rules**.

---

# 2. The Four Spending Phases of Retirement

Research shows retirement spending follows a **U-shaped curve**.

| Age   | Phase      | Spending Behaviour    |
| ----- | ---------- | --------------------- |
| 60-70 | Active     | Travel, hobbies       |
| 70-80 | Stable     | Normal living         |
| 80-90 | Slowdown   | Reduced discretionary |
| 85+   | Healthcare | Rising medical costs  |

Example spending curve:

```text
Age 60-70  100%
Age 70-80  85%
Age 80-90  75%
Age 90+    65% (+ healthcare spike)
```

Your engine should support this.

---

# 3. Dynamic Spending Rule Types

The simulator should support multiple strategies.

---

# Strategy 1 — Guardrails (Most Common)

Used by many planners.

Spending increases or decreases depending on portfolio performance.

Example:

```text
Initial spending: $84,000
Upper guardrail: +20%
Lower guardrail: -20%
```

If portfolio grows:

```text
Spending increase 10%
```

If portfolio falls:

```text
Spending reduce 10%
```

Pseudo logic:

```python
if portfolio_value > upper_guardrail:
    spending *= 1.10

if portfolio_value < lower_guardrail:
    spending *= 0.90
```

---

# Strategy 2 — Percentage Withdrawal

Spend a percentage of the portfolio each year.

Example:

```text
Spend 4.5% of portfolio
```

Example:

```text
Portfolio: $1.5M
Spending: $67,500
```

Pros:

* never runs out of money

Cons:

* income fluctuates

---

# Strategy 3 — Floor and Upside

This is very realistic.

Split spending into:

```text
Essential spending
Lifestyle spending
```

Example:

| Category  | Amount  |
| --------- | ------- |
| Essential | $50,000 |
| Lifestyle | $30,000 |

Rules:

```text
Essential spending never reduced
Lifestyle spending flexible
```

If markets crash:

```text
Cut lifestyle spending
```

---

# Strategy 4 — Guyton-Klinger Rules

One of the best known retirement spending systems.

Rules include:

1️⃣ **Inflation adjustment rule**

```text
Skip inflation increase if portfolio declines
```

2️⃣ **Capital preservation rule**

```text
If withdrawal rate > threshold → reduce spending
```

3️⃣ **prosperity rule**

```text
If portfolio strong → increase spending
```

---

# 4. How It Fits Into Your Simulation Engine

Add a new module:

```
/simulation_engine/spending_engine.py
```

This module determines **annual retirement spending**.

---

# 5. Spending Engine Inputs

Reuse existing JSON inputs:

```json
"asfaComfortable": 84000,
"inflation": 0.0287,
"returnVolatility": 0.12,
"investmentReturn": 0.038
```

Add new optional fields:

```json
"spendingStrategy": "guardrails",
"initialSpending": 84000,
"essentialSpending": 50000,
"lifestyleSpending": 34000,
"upperGuardrail": 1.2,
"lowerGuardrail": 0.8,
"withdrawalRate": 0.045
```

---

# 6. Spending Engine Logic

Pseudo code:

```python
def calculate_spending(state, strategy):

    if strategy == "fixed":
        spending = initial_spending * inflation_adjustment

    elif strategy == "guardrails":

        if portfolio > upper_guardrail:
            spending *= 1.10

        elif portfolio < lower_guardrail:
            spending *= 0.90

    elif strategy == "percentage":

        spending = portfolio_value * withdrawal_rate

    elif strategy == "floor_upside":

        spending = essential_spending + lifestyle_adjustment()

    return spending
```

---

# 7. Example Life Simulation With Dynamic Spending

Example:

| Age | Portfolio | Spending |
| --- | --------- | -------- |
| 60  | $1.6M     | $84k     |
| 63  | $1.2M     | $76k     |
| 66  | $1.9M     | $92k     |
| 70  | $1.8M     | $89k     |
| 75  | $1.5M     | $81k     |

Notice spending **adjusts dynamically**.

---

# 8. Why This Dramatically Improves Accuracy

Static spending models often say:

```
Retirement fails at age 84
```

Dynamic spending might show:

```
Retirement success probability: 92%
```

because spending **adapts to market conditions**.

---

# 9. Integration With Monte Carlo

Monte Carlo runs the full simulation:

```python
for run in range(numRuns):

    simulate_life()

    spending = spending_engine()

    update_portfolio()
```

This produces more realistic outcomes.

---

# 10. Visual Outputs for Users

The UI should show:

### Spending Flexibility Chart

```
Age → Spending range
```

### Retirement Stress Periods

```
Years where spending must reduce
```

### Lifestyle Risk

```
Probability lifestyle spending must be cut
```

---

# 11. Recommendation Engine Example

After simulations:

```
Retirement Success Probability: 78%

If using Dynamic Guardrail Spending:
Success Probability: 91%

Recommendation:
Adopt flexible retirement spending strategy.
```

---

# 12. GitHub Copilot Prompt to Build It

You can give Copilot this prompt.

---

## Copilot Prompt — Dynamic Spending Engine

Create a new module:

```
/simulation_engine/spending_engine.py
```

The module should implement **dynamic retirement spending strategies**.

Supported strategies:

```
fixed
guardrails
percentage
floor_upside
guyton_klinger
```

Inputs must reuse the existing retirement JSON schema.

Example user inputs include:

* asfaComfortable
* inflation
* investmentReturn
* returnVolatility

from the existing calculator input model.

Add new optional fields:

```
spendingStrategy
initialSpending
essentialSpending
lifestyleSpending
upperGuardrail
lowerGuardrail
withdrawalRate
```

The spending engine should determine annual retirement spending during the simulation.

It must integrate with:

```
life_simulation_engine
monte_carlo_engine
recommendation_engine
```

Outputs should include:

```
annual_spending
spending_adjustments
lifestyle_cut_probability
```

Ensure compatibility with existing JSON save/load.

---

# 13. The Next Feature That Would Make This Extraordinary

Once the Dynamic Spending Engine exists, you can add the **most advanced capability used in financial planning systems**:

### Retirement Strategy Optimizer

It automatically answers:

```
What is the best combination of:
- retirement age
- spending
- asset allocation
- super contributions
```

to maximise retirement success.

---

