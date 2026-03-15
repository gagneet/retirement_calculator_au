# Deep research report for your Australian retirement calculator

## Repository review and current capability baseline

Your repository already has the foundations of a comprehensive, scenario‑driven retirement planner: it combines year‑by‑year projection with Monte Carlo runs (for “probability of success”), plus optional sub‑models for Age Pension, property and “advanced” levers (volatility, shock settings, glide paths). The public methodology page for the deployed calculator confirms that the core engine is intended to be an annual step model (income → expenses → returns → balances), with the Age Pension estimated as the lower of an assets test and an income test outcome, and Monte Carlo achieved by repeating the plan with randomised return sequences. citeturn11search2turn16search1

Your saved JSON example (“version 3.0”) supports that current (or recently current) schema includes many advanced knobs such as shocks, aged‑care probability and duration, trust details, and property parameters. However, your attached JSON does **not** include the newer “life events” fields you requested (arrival age, start-earning age, income step-down age/salary), which means either (a) the calculator UI/schema evolved after this file was exported, or (b) those fields exist in the repo/UI but are not yet fully wired to export/import and the simulation. In practical product terms, this creates a versioning requirement: **inputs must be backward compatible**, and the simulator should be robust to missing fields, defaulting them explicitly.

A key design goal for the next iteration should be to ensure the “Advanced Calculator” fields are not just *collected* but are:

- normalised into consistent units (percent vs decimal, annual vs fortnightly),
- deterministically translated into a **timeline of events** (career break, reduced income, migration/residency accumulation, caring responsibilities, property sale/downsizing),
- and then **consumed by the deterministic yearly simulator and by the Monte Carlo wrapper** (so stochastic results match deterministic logic except for the random factors).

This “single source of truth” design becomes critical once you add Australia‑specific rules that depend on *dates and statuses* (e.g., Age Pension residency years; deeming thresholds; couple vs single tapers; caring constraints).

## Monte Carlo revalidation and field‑completeness audit

### What “correct” looks like for Monte Carlo in this domain

A retirement Monte Carlo engine is “valid” when:

1. **The deterministic model is correct and auditable**, because Monte Carlo is just repeated deterministic simulation under alternate return paths. citeturn11search2turn16search1  
2. **Stochastic draws only change what is explicitly stochastic** (investment returns, inflation regimes, shock events, lifespan uncertainty if you choose to model it), and never silently bypass policy logic (Age Pension rules, deeming, assets classification, residency).
3. **All Advanced Calculator fields are either (a) used, or (b) explicitly marked “UI-only / informational.”** Anything else is a bug.

A consistent issue in retirement calculators is that Monte Carlo models often randomise portfolio returns but keep *withdrawals and entitlements* fixed, which can understate risk during early retirement drawdown (“sequence of withdrawals risk”). High‑quality retirement modelling must treat **order of returns plus withdrawals** as a first‑class risk driver, not just average return. citeturn22search2

### Immediate revalidation tasks in your repo

To “reverify and validate” Monte Carlo properly, treat it as a test suite and instrumentation problem, not a one‑off manual review.

**Deterministic baseline tests (must pass before Monte Carlo matters)**  
Create test vectors where you can compute outcomes by hand:

- “No returns, no inflation, no pension, no property, no trust” → balances should equal contributions minus withdrawals.
- “Fixed return, fixed inflation” → balances should match the closed‑form compounding used in your methodology:  
  `Ending = (Starting + Contributions) * (1 + Return)`. citeturn11search2
- “Age Pension only” (assets/income set so you get full vs part vs zero pension) → should match Services Australia thresholds and tapers below.

**Monte Carlo invariants (quick correctness checks)**  
Even without knowing the “right” answer, you can validate the structure:

- With **volatility = 0** and shocks disabled, every run should produce identical results (success probability must be either 0% or 100% depending on deterministic outcome).
- With volatility > 0, success probability should change smoothly with higher volatility (all else equal, higher volatility should generally *reduce* success probability under fixed withdrawals due to sequence risk). citeturn22search2
- With the same seed, results should be reproducible.

### Field‑usage coverage: the practical way to ensure “all fields are used”

Implement a simple runtime “field coverage map”:

- Maintain a canonical schema list for Advanced Calculator inputs (including nested objects like dependentDetails).
- When you normalise inputs, wrap the object in a proxy that logs every field access.
- At the end of each simulation run, report:
  - fields accessed,
  - fields never accessed,
  - fields accessed but never affecting outputs (detected by sensitivity checks).

This gives you an objective “what is missing” inventory without relying on manual inspection.

### Economic realism: where your Monte Carlo is likely too optimistic or too simplistic

Most Monte Carlo engines in retail calculators over‑rely on normal distributions and constant volatility. Real markets exhibit fat tails and regime shifts (crashes, inflation spikes, prolonged low returns). Given your own requirement to model “war, inflation, natural/man‑made disasters,” you should formalise this as **regime modelling**, not just a single shock probability.

Recommended upgrade path:

- **Regime‑switching returns and inflation**  
  Use 2–3 regimes (Normal, Crisis, Stagflation) with different means/volatilities/correlations and transition probabilities. Tie “war/disaster” scenarios to increased likelihood of the Crisis/Stagflation regimes rather than a one‑year shock only.  
  This aligns with how central banks describe inflation targeting as *flexible*: inflation can deviate temporarily from the target band. citeturn23search0turn23search6
- **Retirement spending adaptivity**  
  Offer spending rules (fixed real spending, floors/ceilings, guardrails, “cut discretionary first”). This directly addresses sequence‑of‑withdrawals risk. citeturn22search2

## Migration timeline fields and their impact on super and Age Pension

### Why “Age you came to Australia” matters more for Age Pension than for super going forward

Your proposed fields:

- Age you came to Australia
- Age you started earning in Australia  
(and equivalents for partner)

These fields are valuable, but they affect different parts of the model:

**Superannuation projection (forward-looking)**  
If the user inputs their current super balance, then future super accumulation depends on earnings from now onward plus contributions (SG + voluntary). In that simple forward model, “age started earning” is not strictly required.

Where it becomes important is when you want to model:

- **career gaps** (including pre‑arrival work history being irrelevant to Australian SG),
- **late arrival** plus **low current super balance** requiring accelerated contributions strategies,
- future entitlements/strategies like concessional cap usage (where an advanced model might eventually incorporate contribution history and carry‑forward).

**Age Pension eligibility and rate (policy-driven)**  
Age Pension is explicitly conditional on **residency status and residency duration**. Services Australia states that on the day you claim you must be living in and physically in Australia and be an “Australian resident” (citizen, permanent visa holder, or protected SCV holder), and you generally need **at least 10 years** Australian residence in total (with at least 5 continuous). citeturn1search6turn4search3  
So “age you came” is directly relevant to whether the person can access Age Pension at all (ignoring social security agreements).

### What fields you should actually add for correctness

To make these inputs operational (and avoid misleading results), you need more than just ages:

- **Residency status at claim**: citizen / permanent visa / protected SCV / other  
  (because “Australian resident” is defined in terms of these statuses). citeturn1search6
- **Years of Australian residence accumulated** (derived), including continuity breaks:
  - age came to Australia,
  - any substantial periods living overseas (start/end years),
  - claim location (in Australia vs overseas).
- **Social Security Agreement flag + agreement country (optional)**  
  Services Australia notes exceptions if claiming under a social security agreement. citeturn1search6

### Implementation approach

Convert “age came to Australia” into a **residence ledger**:

- Residence years from arrival to present: assumed continuous unless user specifies breaks.
- Project residence years from present to Age Pension age (67) and to retirement age.
- If projected residence < 10 years by claim age and no agreement is indicated, flag:
  - “Age Pension not modelled / likely ineligible under general rules” and set pension to 0, or
  - show two outputs: “Assuming eligible” vs “Assuming ineligible,” to avoid false certainty.

This is critical because Age Pension is widely (and incorrectly) assumed to be automatic at 67; Services Australia explicitly requires meeting residence rules as well as tests. citeturn4search3turn1search6

## Dependent children, foster care, and how they affect retirement modelling

### Policy interactions you should model explicitly

For most households, children affect retirement primarily through **cash flow** (reduced savings capacity, childcare/education costs, career breaks) and secondarily through certain Centrelink interactions.

From a strict Age Pension perspective:

- The Age Pension income test page includes a specific rule for **transitional rate pensioners with dependent children**, allowing additional income per fortnight per dependent child before reducing pension. citeturn9view0  
- For general Age Pension means testing, the major determinants remain **income, assets, relationship status, homeownership, and deeming**, not children’s ages.

Separately, payments linked to dependent children (e.g., Family Tax Benefit Part A) clearly vary by child age and study status; Services Australia’s FTB Part A rates specify different maximum rates for ages 0–12, 13–15, and 16–19 (with study requirements). citeturn17search7  
This matters to retirement modelling because FTB is often a significant cash-flow offset during parenting years.

### What’s likely missing in your calculator today

Even if you already collect “dependentDetails,” a calculator is incomplete if it does not convert those details into:

- household expense trajectories (early childhood vs school vs post‑school support),
- career breaks / reduced hours (especially for one partner),
- child‑linked payments/offsets where applicable,
- and a clear “dependency end age” assumption.

### High‑value fields to add

To support both biological and foster children without overcomplicating:

- Number of dependent children (and whether shared care)
- For each child:
  - birth year (or current age),
  - expected dependency end age (default 18; allow 19 if studying; allow custom)
  - optional “special needs / disability” flag (because caring obligations and costs can be structurally different, and can link to carer-related payments)
- Child‑related costs:
  - childcare costs (age‑bounded),
  - education costs (public/private; optional annual estimates),
  - expected tertiary support (optional).

If you want to incorporate government payment offsets in a non‑advice way, implement them as **optional toggles** with clear disclaimers, because eligibility is complex and depends on taxable income, care percentages, residency, and other conditions. citeturn17search7turn20view0

## Aged parents, siblings, and caring responsibilities

### The retirement-relevant mechanism is usually “caring constraints” and “income support,” not the relatives themselves

Aged parents/siblings matter financially mainly through:

- reduced workforce participation,
- direct cash support (including potential overseas support),
- and possible Centrelink payments if the person is a recognised carer.

Services Australia states that Carer Payment requires both the carer and the care recipient to be Australian residents and meet income/assets testing, and “constant care” is roughly equal to a normal working day and stops you from working full time; however it also states you may still do paid work/self-employment up to **100 hours in a 4 week period**. citeturn18search3  
Carer Allowance requires daily care and attention; it has **no assets test** but does have an income test (combined adjusted taxable income under $250,000) and is a set rate payment. citeturn18search2turn18search0  

This suggests your calculator should treat caring as a **life event** that:

- reduces earnings potential,
- may add costs (travel, medical co‑payments, aged care contributions),
- and may add income (Carer Payment/Allowance) for eligible cases.

### What to add to the Advanced Calculator

Add a “Caring responsibilities” block with:

- Are you caring for someone long-term? (Y/N)
- Who is the care recipient? (parent / sibling / other)
- Is the care recipient an Australian resident? (Y/N/Unknown)  
  (because eligibility for Carer Payment/Allowance depends on this). citeturn18search3turn18search2
- Caring start age (or start year)
- Caring intensity:
  - expected reduction in working hours (or target annual income during caring years)
  - whether paid work continues (cap awareness; the app can display the 100 hrs/4 weeks rule as informational). citeturn18search3
- Estimated annual caring costs (and whether they are domestic vs overseas)

For overseas relatives specifically, the dominant effect is usually **your spending and work decisions**, not Age Pension rules. But your own overseas assets/income can affect Age Pension rates; Services Australia explicitly includes overseas income and assets when assessing your Age Pension and uses exchange rates. citeturn21view0  
So if caring overseas leads to holding or sending money overseas, your simulator should treat that as a cash flow and potentially as an asset transfer (future enhancement: gifting/deprivation rules).

## Income reduction before retirement age and career “step-down” modelling

### This is already a recognised core scenario in official calculators

The ASIC retirement planner explicitly calls out modelling “career break” or “reducing workload,” including caring responsibilities, as a factor that affects super balance. citeturn11search6  
So adding your scenario (e.g., $200k dropping to $110k at age 56) is consistent with Australian mainstream retirement planning tools.

### The correct technical design is an “income schedule,” not a single salary number

The minimal robust model is:

- Income segments:
  - (start_age, end_age, annual_salary_real_or_nominal, super eligibility)
- Optional unemployment/health shock segments:
  - (probability, duration distribution, partial recovery)

This avoids proliferating special-case fields (“reducedIncomeAge,” “reducedIncomeSalary,” “lean years start,” “salary reduction %”) and instead supports all such cases via the same schedule.

### Consequences you should model automatically when income drops

Income reduction affects:

- SG contributions (because SG is a percentage of ordinary time earnings; and as of 1 July 2025 the SG rate is 12%). citeturn1search0turn1search5
- voluntary contributions affordability, and therefore use of concessional caps. citeturn0search1
- tax (which affects post‑tax savings rate)
- capacity to meet mortgage/expenses
- the “work longer vs spend less” trade‑off.

So the app should, for each year:

1. compute salary for that year from the schedule,
2. compute SG at the applying rate (and ideally cap it at the “maximum super contribution base” where relevant, per ATO tables). citeturn1search5
3. apply voluntary contribution rules/caps (optional advanced functionality),
4. recompute post‑tax savings and investment contributions.

## Superannuation: completeness, SMSF gaps, and “misuse” controls

### Key Australian super rules you should embed (or keep as updateable parameters)

At minimum, your calculator should default to current statutory settings and allow overrides:

- SG rate: 12% from 1 July 2025 onward. citeturn1search0turn1search5
- Contribution caps:
  - concessional cap: $30,000 from 1 July 2024 (and listed as $30,000 for 2024–25 and 2025–26). citeturn0search1  
  - non‑concessional cap: $120,000 from 1 July 2024 (with bring-forward eligibility rules). citeturn0search2
- Access rules (to bridge pre‑Age Pension years correctly):
  - generally access upon reaching preservation age and retiring, or at age 65 even if still working. citeturn17search1turn17search3turn17search4

If your model currently assumes “retirement age = can draw super,” it will be wrong for users retiring before preservation age, and incomplete for transition‑to‑retirement strategies.

### SMSF: what is commonly missing in retail calculators

Most calculators model super as a single tax‑advantaged pot with a single return rate and fee rate. SMSFs introduce additional real‑world complexities you should reflect, at least approximately:

- higher fixed costs (admin, audit, tax return, actuarial if needed, corporate trustee costs)
- compliance risk (penalties and severe outcomes for serious contraventions)
- property inside SMSF (often financed via limited recourse borrowing arrangements; requires special handling)
- tighter liquidity constraints and cash-flow planning.

The ATO’s SMSF compliance guidance states trustees can be personally fined (often thousands of dollars), can be disqualified, and in very serious cases the fund can be made non‑complying, which can result in a tax outcome that effectively removes almost half of its assets. citeturn2search1  
The ATO also warns about illegal early access schemes; it is illegal to access super outside conditions of release. citeturn17search1turn17search4  
A known pattern in illegal early access schemes is encouraging rollovers into newly established SMSFs. citeturn17search6  

### What to add to your Advanced Calculator for SMSF

Add an “SMSF mode” (optional) with:

- Super structure: APRA‑regulated / SMSF
- If SMSF:
  - trustee structure (individual/corporate; affects admin burden)
  - annual fixed costs + percentage-based costs
  - compliance risk toggle (purely for scenario stress testing, not advice)
  - property-in-super toggle with LRBA parameters (loan amount, rate, term, rent, expenses).

Also add a visible “risk and compliance” panel that pulls from ATO warnings (illegal access, penalties) as educational content. citeturn17search1turn2search1  

## Trusts, investment property and Age Pension: strengthening the Centrelink logic

### The core Age Pension framework you must match

Services Australia is unambiguous that Age Pension requires passing **residence rules**, and eligibility/rate are assessed under **both an income test and an assets test**. citeturn4search3turn1search6turn7view0

Key parameters (as of the current indexed set shown on Services Australia pages):

- **Assets test limits** for full pension and part-pension cut-offs depend on single/couple and homeowner/non-homeowner. citeturn8view0  
- **Income test free areas and taper rates** differ for singles vs couples (single: 50c per $1 over free area; couple: 25c each per $1 over combined free area). citeturn9view0  
- Financial assets are assessed via **deeming**: thresholds and rates are specified, and Services Australia states deeming rates will change from 20 March 2026 (1.25% and 3.25%). citeturn20view0turn2search0  

Your methodology page currently shows an income-test reduction using 0.5 (50c) without distinguishing couple logic, which is a likely correctness gap if implemented as shown. citeturn16search1turn9view0

### Trusts: why “hasTrustAssets” must feed the pension means tests

Under Australian social security policy, private trusts and private companies are assessed under “attribution” rules (control tests, source tests, associate rules) to determine who is an attributable stakeholder and what percentage of assets/income are attributed. citeturn10search0turn10search4turn10search6turn10search7turn10search2turn10search9  
If your calculator collects trust data but does not attribute those assets/income for Age Pension, the model will systematically overestimate Age Pension eligibility for users who control a trust.

Given the complexity, the simplest defensible approach is:

- If the user indicates they control/are an attributable stakeholder, apply an “attribution %” (already an input concept) to trust net assets and trust income/distributions when computing:
  - assessable assets for the Age Pension assets test
  - assessable income (or deemed income) for the income test.

At minimum, the “control” question must drive whether attribution applies at all, consistent with the DSS guide’s emphasis on control and stakeholder attribution. citeturn10search6turn10search7

### Property: what to improve beyond “property value and loan”

You need to distinguish:

- Principal home (generally exempt from the assets test; but sale proceeds can be deemed income in certain circumstances) citeturn20view0turn8view0
- Investment property (assessable asset; rental income is assessable income)
- Property held in a trust (then attribution logic applies).

Downsizing and home sale modelling should incorporate the deeming treatment of sale proceeds described by Services Australia (e.g., proceeds intended for a new principal home being deemed at the lower rate under specified conditions). citeturn20view0  
A simple “70% accessible equity” heuristic is useful as a UX shortcut, but you should also support a more explicit “sale/purchase timeline” mode for users doing a precise plan.

### Deeming thresholds and the March 2026 change

Because deeming rates rise on **20 March 2026**, any projections that bridge that date should apply different deeming rates before vs after the change. citeturn2search0turn20view0  
This is a concrete example of why your simulator must be date-aware rather than purely age-aware.

## Building the “what actions should I take now?” engine

A strong calculator does not stop at outcomes; it produces a ranked action plan with quantified impact. Your site already frames this idea (“action plan” and “recommendations”), but your requested goal is to make it robust enough to guide people across life stages.

### Recommended action plan structure

For each scenario, compute:

- Probability of success (Monte Carlo)
- Median / 10th percentile retirement income (real dollars)
- “Shortfall to target” vs ASFA-style target (where the user opts in)
- Age Pension dependency (share of income from pension over time)
- Sequence risk exposure (first 10 years of retirement vulnerability). citeturn22search2

Then generate actions by running **counterfactual mini-scenarios** (not generic text):

- Increase concessional contributions up to cap (and optionally carry-forward if you later implement history logic). citeturn0search1turn19search1  
- Work longer by N years
- Reduce retirement spending by X% (or apply guardrails)
- Change asset allocation/glide path
- Downsize/sell property
- Sell/retain investment property
- Add emergency fund / reduce debt faster
- If caring responsibilities exist: model shift to part-time + potential Carer Payment/Allowance eligibility paths (as optional informational scenarios). citeturn18search3turn18search2turn18search1  

Each action should report:

- Δ probability of success
- Δ median income
- Δ Age Pension entitlement (if any)
- Key trade-offs and risks.

### War, disasters, and inflation stress testing

To incorporate these without pretending to predict geopolitics:

- Offer predefined **stress scenarios**:
  - “High inflation decade” (inflation above the RBA target band for a period; then reverts) citeturn23search0
  - “Deep market drawdown early retirement” (sequence risk scenario) citeturn22search2
  - “Property downturn” (if property exposure is high)
- Treat them as *sensitivity tests* that show how fragile or resilient the plan is.

This is materially better than a single “shockProbability” scalar because it ties adverse events to multiple coupled effects: returns, inflation, salary growth, and even caring needs.

## Concrete incorporation roadmap

To translate all of the above into buildable work, structure the implementation in four layers.

### Input schema and versioning

- Add explicit JSON schema versioning and migration:
  - v3.0 → v3.1: add arrival/earning ages, income schedule, caring block
  - Populate defaults during import to avoid undefined behaviour.
- Replace single “salary” fields with an optional salary schedule model (still allow “simple mode” for UX).

### Policy module extraction

Create dedicated modules for:

- Age Pension eligibility and rate:
  - residence eligibility (10-year rule, agreement flag) citeturn1search6
  - assets test (tables for full/part cut-offs) citeturn8view0
  - income test (single vs couple taper; cut-offs) citeturn9view0
  - deeming rates/thresholds with date-effective changes citeturn20view0turn2search0
- Trust attribution:
  - implement a simplified “attributable %” model tied to control level, backed by DSS attribution concepts. citeturn10search0turn10search6turn10search7

This reduces the risk that Monte Carlo and deterministic outputs diverge due to duplicated policy logic.

### Simulation engine upgrades

- Make the simulation **timeline-aware** (years and key policy dates like 20 March 2026 deeming changes).
- Implement regime-based Monte Carlo rather than single‑distribution draws.
- Implement spending rules to address sequence‑of‑withdrawals risk in outputs. citeturn22search2

### Safety, compliance, and user trust

- Add “super misuse / scam risk” warnings and SMSF compliance education:
  - illegal early access constraints, and consequences citeturn17search1turn17search4
  - SMSF penalties and non‑compliance outcomes citeturn2search1
- Keep “advice boundaries” clear: show users the assumptions and sensitivity under alternate scenarios; do not assert certainty.

## Summary of what is missing and the highest impact additions

What is missing is less about “new fields” and more about **operationalising Australia-specific rules and life events in a single coherent timeline** that is shared by deterministic and Monte Carlo engines.

The highest impact upgrades, in order:

1. **Correct and date-aware Age Pension engine** (couple vs single tapers; assets thresholds; deeming thresholds; deeming change on 20 March 2026). citeturn8view0turn9view0turn20view0turn2search0  
2. **Residency timeline modelling** using “age came to Australia” + status to avoid incorrect pension projections for migrants. citeturn1search6turn4search3  
3. **Life-event schedules** (income, caring, child costs) rather than one-off toggles, consistent with how mainstream tools treat career breaks and reduced work. citeturn11search6turn18search3  
4. **Trust attribution incorporation** into pension tests so trust structures do not produce systematically biased outcomes. citeturn10search0turn10search6turn10search7  
5. **SMSF mode** with realistic costs and compliance risk education grounded in ATO guidance. citeturn2search1turn17search6  
6. **Regime-based stress testing + spending adaptivity** to model war/disasters/inflation as correlated regimes and to address sequence-of-withdrawals risk explicitly. citeturn23search0turn22search2