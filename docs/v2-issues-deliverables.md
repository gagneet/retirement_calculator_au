Yes — \*\*Advanced V2 is a better direction\*\*, mainly because it appears to be a \*\*thin controller over the existing core simulator\*\*, rather than yet another standalone calculator.



The V2 file explicitly describes itself as:



> “Thin vanilla controller for the redesigned advanced page. Wires the new DOM to existing calculation engines.” 



That is exactly the architectural direction I recommended: the UI should adapt inputs, then call one calculation engine.



\## What V2 does better



\### 1. It uses the main simulator directly



V2 creates a single simulator instance:



```js

const simulator = new RetirementSimulator(ENHANCED\_CONFIG);

```



Then `runEngine()` builds engine inputs and calls:



```js

simulator.simulateRetirement(engineInputs, false);

```



That is much cleaner than the old advanced calculator, where different tabs appeared to call different engines. 



\### 2. It has a proper adapter layer



The key function is:



```js

buildEngineInputs(inp)

```



This maps the redesigned page fields into the canonical simulator input format. It handles household type, ages, salary, super, property, healthcare, pension thresholds, simulation settings and assumptions. 



That is a big improvement because you now have a defined translation point between:



```text

Advanced V2 UI fields → canonical calculator inputs → simulator

```



This makes bugs easier to find.



\### 3. Percentages are handled more consistently



V2 has a helper:



```js

function pct(value, fallbackPercent = 0) {

&#x20; const numeric = Number(value);

&#x20; if (!Number.isFinite(numeric)) return fallbackPercent / 100;

&#x20; return numeric / 100;

}

```



The unit tests also check that `inflation: 2.6`, `investmentReturn: 6.5`, `superGrowth: 7.5`, and employer super `12` become `0.026`, `0.065`, `0.075`, and `0.12`. 



That directly addresses one of the old bugs where `0.4` was confused with `0.4%`.



\### 4. Pension defaults are now household-aware



V2 has `getHouseholdPensionDefaults()` and `syncPensionMeansTestFields()`, which switch pension asset thresholds depending on whether the user is single or a couple. 



The unit tests confirm the defaults:



```text

single: threshold 321,500 / cutoff 722,000

couple: threshold 481,500 / cutoff 1,085,000

```



That is much better than stale or duplicated thresholds scattered across multiple modules. 



\### 5. Imported old JSON is normalised into V2 fields



The `normalizeImportedUserData()` function maps the older JSON format into the V2 field names. It also converts ratios into display percentages using `toDisplayPercent()`. 



This is important because it means your earlier exported JSON can still feed the new V2 page without silently breaking fields.



\### 6. There are unit tests for the adapter



The test file checks:



\* V2 field mapping into simulator inputs

\* percentage conversion

\* household pension defaults

\* pension field sync

\* real-engine result shape

\* imported canonical data conversion

\* overseas destination mapping

\* risk profile normalisation 



That is a strong improvement compared with relying only on visual/manual testing.



\## Remaining issues in V2



V2 is better, but I would not say it fully solves everything yet.



\### 1. `pct()` assumes UI values are always percentages



This is fine for V2-native inputs like `6.5` meaning 6.5%. But if any imported value slips through as `0.065`, `pct()` would convert it to `0.00065`.



The import path tries to prevent this using `toDisplayPercent()`, which is good. But I would still make `pct()` safer:



```js

function pct(value, fallbackPercent = 0) {

&#x20; const numeric = Number(value);

&#x20; if (!Number.isFinite(numeric)) return fallbackPercent / 100;



&#x20; // If already a ratio, keep it.

&#x20; if (numeric > 0 \&\& numeric <= 1) return numeric;



&#x20; // If entered as percent, convert it.

&#x20; return numeric / 100;

}

```



That protects the app if future code passes canonical JSON directly into `buildEngineInputs()`.



\### 2. Some important fields are read but not fully mapped



V2 reads these fields:



```js

ccBalance

ccRate

personalLoan

carLoan

hecsBalance

```



But from the visible `buildEngineInputs()` section, those balances are not mapped into engine fields like:



```js

creditCardBalance

creditCardRate

personalLoanBalance

carLoanBalance

hecsBalance

```



So the UI may collect the debt detail, but the simulator may not use it correctly unless this happens later or elsewhere. 



This matters because high-interest debt should be calculated from balances, not just the selected `highInterestDebt` category.



\### 3. Investment-property rate is default-only



V2 reads investment-property fields like value, loan, rent, expenses, growth and state, but `buildEngineInputs()` uses:



```js

const investmentPropertyRate = pct(DEFAULTS.property.investmentPropertyRate, ...)

```



That means the user cannot override the investment-property loan rate from V2 unless the field is added and mapped. 



Given your own investment property has a material loan, this is worth fixing.



\### 4. Land tax is hard-coded to zero



V2 sets:



```js

landTax: 0

```



For ACT investment property modelling, this can materially affect cash flow. 



Add a V2 input or calculate it based on state/territory where possible.



\### 5. Reduced-income inputs are not fully mapped



V2 reads:



```js

reducedIncomeEnabled

```



But `buildEngineInputs()` sets:



```js

reducedIncomeAge: 0,

reducedIncomeSalary: 0,

partnerReducedIncomeAge: 0,

partnerReducedIncomeSalary: 0

```



So reduced-income mode may be enabled but not have enough data to work. 



If you want this to model career slowdown, carer duties, semi-retirement, or pre-retirement income drop, you need fields and mapping for age and reduced salary.



\### 6. Carer impact is incomplete



V2 maps:



```js

isCarerForParents: inp.isCarer,

carerAnnualExpense: inp.annualParentSupport

```



But sets:



```js

carerReducedWorkPercent: 0,

carerYearsExpected: 0

```



So it captures direct support costs but not reduced work capacity. 



Your earlier JSON had carer-related fields, so V2 should preserve those.



\### 7. Stress testing is only taking the first three scenarios



V2 builds stress scenario results using:



```js

(ENHANCED\_CONFIG.STRESS\_SCENARIOS || \[]).slice(0, 3)

```



That means V2 may be hiding or ignoring several stress cases. 



Given the old calculator had problems with GFC/COVID/healthcare stress testing, V2 should run all enabled stress scenarios or clearly label that it is only showing the top three.



\### 8. V2 still depends on the quality of `simulator.js`



This is not a criticism of V2, but an important boundary: V2 is an adapter/UI layer. It improves consistency by using the main simulator, but any unresolved issues inside `simulator.js`, `runStressTest()`, `recommendation.js`, or export/PDF logic can still appear in results.



\## My assessment



\### Is Advanced V2 better?



\*\*Yes.\*\* It is better designed than the old advanced page because it:



\* centralises the UI-to-engine mapping

\* calls the main simulator directly

\* has explicit household-aware pension defaults

\* has import normalisation

\* has unit tests

\* avoids some of the old multi-engine drift



\### Is it fully fixed?



\*\*Not yet.\*\* It still needs a few important completion fixes before I would call it reliable:



1\. Make `pct()` safe for both ratios and percentages.

2\. Map all debt balances into engine inputs.

3\. Add/match investment-property interest rate.

4\. Add land tax or calculate it.

5\. Fully map reduced-income fields.

6\. Preserve carer reduced-work assumptions.

7\. Run all stress scenarios, not only the first three.

8\. Confirm that PDF/Excel exports from V2 use `buildExportResults()` and not old advanced-page globals.



\## Bottom line



Advanced V2 is a \*\*proper architectural improvement\*\*, not just a visual redesign. It moves you toward a single-engine model, which is the right way to get consistent, explainable results.



I would treat V2 as the new baseline and progressively retire the old `advanced.html` pathways, but I would fix the remaining adapter gaps before promoting it as the primary calculator.



