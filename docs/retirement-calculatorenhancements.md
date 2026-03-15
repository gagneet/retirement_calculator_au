I have built a retirement calculator, which takes in the inputs from the user or a saved JSON file (attached) and provides various outcomes based on these figures and details. I feel there are still gaps in this and how the superannuation is used and misused in Australia for various aspects and items like SMSF and details for it are missing. Also, investment properties and trust funds guidance, along with a few of the items I have mentioned below. 

1. Reverify and validate the Monte Carlo calculations and ensure that they use all the fields of the 'Advanced Calculator' to provide the outcome. 

2. Research the logic and add a new field of "Age you came to Australia", and "Age you started earning in Australia" (same fields for the Spouse/Partner also) to work out the Superannuation and other related fields calculations.   

3. Research if having dependent children or not having dependent children (OR having foster children to take care of). Or when the children were born and if there ages matter to the overall calculations and retirement age and age pension for Australia. And if required add any fields or required information from the user to the Advanced Calculator. 

4. How does having aged parents, who may not be citizens, or aged siblings matter to the overall retirement, both when they are in Australia or Overseas. If any affect then add the appropriate fields to the advanced calculator. 

5. Also, want to research and add another field and aspect, when the person may have a reduction in salary due to health or other reasons and may decide that after an age (say 55 years old as an example, which is before the retirement age and age pension age), they decide to have a reduced income due to not working the hours or not being able to sustain the current level of income. Example, current annual earnings are $200,000.00 and then at age 56, they join a different job and their earnings become $110,000.00 per annum - how will this affect the overall calculations. And then what age they retire and any allied calculations that may affect this. 

Can you work through the repository code and also research for these items on the web and through websites like superguide.com.au and provide a comprehensive detailed report on what is missing and how to incorporate the above suggestions to the application. Also, whether the application is comprehensive enough to provide an outcome based on the fields it has for the advanced calculator or how do we factor in effects of war, inflation, other natural and man-made disasters and what will be the overall effect on the retirement for the different age groups from children (may have trust funds or getting into the working and have been working odd jobs previously, so have a small stash collected) and other adults who may have arrived recently or born in Australia. 

I want a proper and detailed analysis, which I can incorporate into this application and build it so that I may get a good approximation of how things will look when a person is near retirement and what all actions they need to take to ensure that they can retire successfully. I think that final action of what all needs to eb done in the current circumstances is something which is very important.


Below is a structured narrative to analyse the codebase and implement the retirement calculator enhancements. I structured it so we can:

* Understand the **context**
* Review the **existing JSON schema**
* Identify **missing modelling components**
* Implement **Australian-specific retirement logic**
* Update **Simple + Advanced calculators**
* Update **Monte Carlo engine**
* Update **Save/Load JSON schema**
* Add **legal disclaimers**
* Add **UX prompts and action guidance**

I also attached and embedded references to the uploaded JSON structure so that we can understand the schema.

---

## Project Enhancement: Australian Retirement Planning Calculator

You are working on an **Australian retirement calculator application** that models long-term financial outcomes for individuals and couples.

The application currently:

* Accepts **user inputs through a Simple Calculator and Advanced Calculator**
* Saves and loads user inputs through JSON files
* Runs **Monte Carlo simulations** to estimate retirement outcomes
* Models **superannuation, investments, property, aged care and pension outcomes**

A sample input JSON schema is shown here:



The application currently contains **77 input fields** and supports modelling:

* Superannuation balances
* Salary and salary growth
* Property ownership
* Investment portfolios
* Aged care probability
* Asset allocations
* Monte Carlo market shocks
* Age Pension thresholds
* Dependents

However, the calculator is **not yet comprehensive for Australian retirement modelling**.

Your task is to **analyse the entire repository and implement major enhancements** described below.

---

# PART 1 — Validate and Improve the Monte Carlo Simulation Engine

## Goal

Ensure the Monte Carlo simulation uses **all fields in the Advanced Calculator** and models realistic retirement dynamics.

## Current fields include

Examples:

```
returnVolatility
shockProbability
shockMagnitude
investmentReturn
superReturn
inflation
salaryGrowthRate
leanYearsStart
leanYearsReduction
numRuns
```

### Tasks

1. Audit the Monte Carlo engine and verify that it incorporates:

* volatility
* return decline with age
* sequence-of-returns risk
* inflation uncertainty
* healthcare inflation
* aged care costs
* market shocks
* salary changes
* super contributions

2. Ensure Monte Carlo simulations include:

```
portfolio_return = normal(mean_return, returnVolatility)
```

3. Add simulation for:

| Risk Event       | Variable                |
| ---------------- | ----------------------- |
| market crash     | shockMagnitude          |
| global recession | salary decline          |
| health shock     | forced early retirement |
| inflation spike  | inflation multiplier    |
| property crash   | propertyGrowthRate      |

4. Ensure **shockProbability applies across simulation years**.

5. Ensure the simulation uses **numRuns** correctly.

6. Add **Sequence of Returns risk modelling**.

7. Add optional scenario modes:

```
baseline
optimistic
pessimistic
crisis
```

---

# PART 2 — Australian Superannuation Logic Improvements

The current model assumes **continuous Australian employment**.

This is incorrect for many migrants.

### Add the following fields

For both partners:

```
ageCameToAustralia
ageStartedWorkingInAustralia
```

These should influence:

* superannuation accumulation
* eligibility for Age Pension
* contribution years

### Logic

```
years_of_super_contributions =
retirement_age - ageStartedWorkingInAustralia
```

Super contributions should be calculated from:

```
superContributionRate
salary
salaryGrowthRate
```

Include:

| Feature                        | Description           |
| ------------------------------ | --------------------- |
| concessional contribution caps | annual limits         |
| carry-forward rules            | unused caps           |
| spouse contributions           | tax offsets           |
| downsizer contributions        | post-60 property sale |

---

# PART 3 — SMSF and Super Strategy

Add modelling for:

```
hasSMSF
smsfAdminCosts
smsfInvestmentStrategy
```

Add logic to simulate:

| Strategy                 | Impact                  |
| ------------------------ | ----------------------- |
| direct property in SMSF  | liquidity risk          |
| higher equity allocation | volatility              |
| lower fees               | compounding improvement |

Include **regulatory warnings** if SMSF balance < $300k.

---

# PART 4 — Dependent Children Impact

Current fields include:

```
dependents
childrenPrimary
teenagers
adultDisabled
```

But the model does not fully incorporate **financial dependency timelines**.

Add fields:

```
childrenBirthYears
educationCostPerChild
privateSchool
universitySupport
```

Add modelling for:

| Age               | Cost |
| ----------------- | ---- |
| 0-5 childcare     |      |
| 6-12 school       |      |
| 13-18 high school |      |
| 18-24 tertiary    |      |

Add probability of **adult children remaining dependent longer**.

---

# PART 5 — Elderly Parent or Family Support

Add fields:

```
supportingParents
parentSupportAnnualCost
parentsInAustralia
parentsOverseas
```

Include:

| Scenario             | Effect             |
| -------------------- | ------------------ |
| aged parent care     | cashflow reduction |
| sponsored migration  | healthcare costs   |
| overseas remittances | annual expenses    |

---

# PART 6 — Income Reduction Before Retirement

Many Australians **reduce work hours before retirement**.

Add fields:

```
incomeDropAge
newSalaryAfterDrop
partialRetirementAge
```

Example:

```
age 49 salary = 200k
age 56 salary = 110k
```

This affects:

* super contributions
* savings rate
* retirement readiness

Update simulation logic:

```
if age >= incomeDropAge:
   salary = newSalaryAfterDrop
```

---

# PART 7 — Trust Structures

Current fields include:

```
hasTrustAssets
trustNetAssets
trustAnnualDistributions
trustControlLevel
```

Enhance modelling:

Add:

```
familyTrustIncomeDistribution
trustTaxRate
beneficiaryAllocation
```

Add modelling for:

| Scenario                           | Impact         |
| ---------------------------------- | -------------- |
| trust assets excluded from pension | asset test     |
| distributed income                 | taxable income |

---

# PART 8 — Investment Property Modelling

Improve modelling for:

```
rental yield
loan amortisation
negative gearing
capital gains tax
```

Add:

```
vacancyRate
maintenanceInflation
landTax
```

Add property shock scenarios.

---

# PART 9 — Age Pension Modelling

Improve Age Pension modelling with:

```
pensionAssetThreshold
pensionAssetLimit
pensionIncomeThreshold
```

Add taper logic:

```
pensionReduction = (assets - threshold) * taper_rate
```

Add:

| Feature                    |
| -------------------------- |
| couple vs single rates     |
| homeowner vs non-homeowner |
| deeming rates              |

---

# PART 10 — Global Risk Events

Add modelling for:

| Event             | Impact            |
| ----------------- | ----------------- |
| war               | market collapse   |
| global recession  | salary stagnation |
| climate disasters | property value    |
| hyperinflation    | savings erosion   |

Add new fields:

```
globalRiskFactor
extremeInflationProbability
propertyCrashProbability
```

---

# PART 11 — Actionable Retirement Guidance

The calculator should not only output a number.

It should produce **action guidance**.

Examples:

### If retirement shortfall detected

Show recommendations:

```
Increase super contributions
Delay retirement
Downsize property
Reduce spending
Sell investment property
```

Generate **priority ranked actions**.

---

# PART 12 — Simple vs Advanced Calculator Synchronisation

Ensure both calculators support:

| Feature                     | Simple | Advanced |
| --------------------------- | ------ | -------- |
| basic retirement projection | ✔      | ✔        |
| super modelling             | ✔      | ✔        |
| SMSF                        | ✖      | ✔        |
| dependents                  | basic  | full     |
| trusts                      | ✖      | ✔        |
| property modelling          | ✔      | ✔        |

---

# PART 13 — Save / Load JSON Schema Update

The save/load system must support **all new fields**.

Update JSON schema version:

```
calculatorVersion: "2026.1"
```

Add backward compatibility for older saves.

---

# PART 14 — Legal Disclaimer Requirements

Add clear disclaimer:

```
This calculator provides general financial projections only.
It does not constitute financial advice.
Users should consult a licensed financial advisor before making decisions.
```

Add links to:

* ASIC MoneySmart
* SuperGuide
* ATO Superannuation

Require user acknowledgment checkbox.

---

# PART 15 — UX Improvements

Add visual outputs:

| Feature                      |
| ---------------------------- |
| retirement probability gauge |
| portfolio depletion timeline |
| income waterfall chart       |
| risk exposure chart          |

---

# PART 16 — Code Requirements

The Copilot agent should:

1. Analyse the entire repository
2. Identify simulation engine
3. Identify schema models
4. Update calculators
5. Update save/load logic
6. Update Monte Carlo engine
7. Add new modelling layers
8. Write unit tests

---

# PART 17 — Expected Outputs

The agent should produce:

1. Updated schema
2. Updated calculation engine
3. Updated UI fields
4. Updated JSON save/load
5. Documentation for new features
6. Unit tests
7. Migration logic for existing saved files

---

# Final Goal

The application should become a **realistic Australian retirement planning simulator** capable of modelling:

* migrants
* families
* property investors
* SMSF holders
* early retirees
* economic shocks

while providing **clear retirement readiness guidance**.

---

