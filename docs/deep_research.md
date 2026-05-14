# Deep Research Audit of retirement.gagneet.com

## Executive assessment

The calculator suite is already much more ambitious than a typical public super tool. The live site claims Monte Carlo simulations, Age Pension estimates, property analysis, AI recommendations, and overseas retirement modelling, and the codebase imports dedicated engines for healthcare, property, overseas retirement, scenario comparison, resilience testing, dynamic allocation, and full simulations. citeturn1view1 fileciteturn7file0

The main opportunity is not “add more maths everywhere.” It is to make the maths more *trustworthy, current, and explainable*. The biggest risks I found are:

- **policy staleness and drift**: the code hard-codes key pension/deeming settings with `lastUpdated: '2025-10-01'`, while Services Australia’s pension settings changed again on **20 March 2026**, and the Age Pension page itself says rates are adjusted every **20 March and 20 September**. fileciteturn17file0 citeturn19view0turn16view0  
- **overseas retirement logic divergence**: the overseas module contains its own local Age Pension estimation logic instead of using one shared policy engine, and it simplifies assets and deeming too aggressively for a high-confidence portability estimate. fileciteturn16file0  
- **simple-flow overload**: the “simple” experience on the main page is still visually and cognitively heavy, with core inputs, property, economic assumptions, dynamic allocation, franking, salary progression, pension settings, and simulation controls appearing in one long flow. citeturn1view1  
- **privacy and trust mismatch**: the homepage says “Your data stays private,” but `advanced.html` loads Google Analytics and Google AdSense scripts, and the app imports an analytics helper for event tracking. The helper appears to send event names and labels rather than raw dollar fields, which is better, but the current wording still over-promises unless explicit consent and disclosures are added. citeturn1view1 fileciteturn14file0 fileciteturn15file0  
- **maintainability risk**: `app.js` contains duplicated class methods such as `handleReturningUserFileSelect`, which means the later definition shadows the earlier one. That may not break the app today, but it is an avoidable source of regression and confusion. fileciteturn7file0

The headline conclusion is that your calculator has the right ambition and many of the right building blocks, but it now needs a **single source of truth policy engine**, a **cleaner flow split between Simple and Advanced**, and a **scenario model that behaves like a retirement planner rather than a one-path projection tool**. citeturn1view1turn24view9turn34view2

## What the current product already does well

There is a lot here that should be preserved.

The public site already presents a richer proposition than most retail retirement calculators: conservative projections, Age Pension estimates, Monte Carlo simulation, property analysis, AI recommendations, and overseas retirement modelling. The main landing page also makes a deliberate effort to explain fields with helper text, which is good for confidence and educational value. citeturn1view1

The repository structure also shows that this is not a toy calculator. The app imports modules for a core simulator, healthcare modelling, property analysis, housing optimisation, overseas retirement, outcome generation, what-if analysis, resilience scenarios, risk profiling, dynamic allocation, and a full simulation engine. That breadth is stronger than many public tools, which often split these into separate calculators or omit them entirely. fileciteturn7file0

Your current field set is already broader than average. The live UI and collection logic cover household ages, partner, salary, super, cash, stocks, savings rate, mortgage and property, healthcare and aged care assumptions, risk tolerance, and simulation controls such as run count, volatility, and market shocks. citeturn1view1 fileciteturn7file0

That matters when benchmarking. Aware Super’s public tooling highlights retirement planning, an Age Pension hub, transition-to-retirement products, events, and calculators rather than trying to do everything in one screen. AustralianSuper similarly breaks the space into a risk profiler, super projection calculator, super contribution calculator, retirement income calculator, and income-stream comparison tool. AMP also frames retirement tooling as a broader “digital tools + guidance” experience, not just a single projection page. citeturn29view3turn32view0turn34view2turn34view3turn34view4turn37view2

That comparison leads to an important positive observation: **your codebase is already functionally competitive**. The problem is less “lack of raw capability” and more “too much capability exposed at once, with some policy logic needing tightening.” citeturn1view1turn34view2

## What is missing, misleading, or risky in the current build

The first major issue is **policy freshness**. `config.js` still presents itself as updated to October 2025 and hard-codes pension/deeming constants around that date. But Services Australia’s current Age Pension page says rates are adjusted every 20 March and 20 September, and the current normal Age Pension rates changed on **20 March 2026** to **$1,200.90 per fortnight for singles** and **$1,810.40 combined per fortnight for couples**. The deeming page shows current deeming rates of **1.25% below threshold** and **3.25% above threshold**. By contrast, the config in the repo still uses **0.75%** and **2.75%** deeming rates. That is a material issue because even small deeming errors can change part-pension entitlement and reduce trust in the result. fileciteturn17file0 citeturn19view0turn20view0turn20view2turn20view3

The second major issue is **overseas retirement logic**. `overseas-retirement.js` estimates current pension entitlement using only `superBalance` and `investmentBalance`, then applies its own portability logic. That means the overseas model is not obviously using the same full asset/income assessment as the main calculator. It also calculates deemed income from `investmentBalance` only, even though Services Australia’s deeming rules apply to a broader set of financial assets including savings accounts, term deposits, managed investments, listed shares and securities, and some income streams. fileciteturn16file0 citeturn20view4

There is also a rule-timing issue in the overseas flow. Services Australia says that if you are outside Australia for **more than 6 weeks**, your Pension Supplement drops to the basic rate, your Energy Supplement stops, and your Pensioner Concession Card cancels. It also says that after **26 weeks**, your pension rate depends on your Australian Working Life Residence, with **35 years or more** usually preserving your rate and less than 35 years usually reducing it proportionally. And if you leave **to live in another country**, the supplement and Energy Supplement changes apply **from the date you leave**, not only after 26 weeks. The current overseas module commentary and flow do not fully distinguish between a short absence, a long absence, and a permanent overseas move. fileciteturn16file0 citeturn15view0turn16view0

A third issue is **copy accuracy**. On the homepage, the primary residence helper text says the home “affects age pension asset test but is partially exempt,” and gives an example where an `$800k` home “may add `~$200k` to age pension assets test.” That phrasing is too loose and likely to confuse users. Services Australia’s own rates pages distinguish **homeowner** and **non-homeowner** thresholds rather than treating the principal home as a simple partially assessable asset. The copy should be replaced with a cleaner explanation of homeowner classification, downsizing proceeds, deeming exceptions for principal-home sales, and when home-related choices affect Age Pension outcomes. citeturn1view1turn16view0turn20view0

A fourth issue is **trust and consent**. The landing page promises “Your data stays private,” but `advanced.html` loads Google Analytics and Google AdSense, and the JavaScript includes an analytics helper that sends usage events if `gtag` is available. I did not find evidence in the analytics helper that raw salary, super, or asset values are being transmitted, which is good. But for a retirement calculator where users enter sensitive financial details, even the *perception* of third-party tracking matters. The copy should either be narrowed to “your financial inputs are processed in your browser and are not required for signup,” or the app should move to consent-controlled, privacy-first analytics and remove AdSense from calculation pages entirely. citeturn1view1 fileciteturn14file0 fileciteturn15file0

Finally, there is an engineering hygiene problem. `advanced.html` still depends on third-party CDN scripts in production, including Tailwind via CDN, and `app.js` contains duplicate method definitions. That combination is not a calculation error on its own, but it raises regression, performance, CSP, and auditability risk on a financial planning product. fileciteturn14file0 fileciteturn7file0

## What additional data is required for better predictions and better Monte Carlo confidence

The current calculator already captures more data than most public tools, but it still relies heavily on **broad household assumptions** where actual retirement success is driven by **spending path, policy state, and decumulation behaviour**. citeturn1view1

The most important missing input is **real household spending**, both now and in retirement. MoneySmart’s retirement guidance explicitly tells users to **track their spending**, use a **budget planner**, and include costs such as **mortgage, rent, or debts** when planning retirement needs. It also points users to lifestyle benchmarks such as the ASFA Retirement Standard. In other words, official guidance starts from spending and lifestyle, not just from balances and returns. Your calculator should therefore make actual spending the centre of the model, not a secondary or implied step. citeturn24view0turn24view2turn24view9

For a materially better forecast, I would add five data layers.

First, add a **retirement spending engine** with category budgets and timing. Users should be able to enter essential spending, discretionary spending, travel, hobbies, gifts, family support, insurance, healthcare, home maintenance, car replacement, and legacy goals as separate items. Each item should support one of four behaviours: fixed in today’s dollars, inflation-linked, one-off lump sum, or “go-go / slow-go / no-go” lifecycle taper. That is how you turn “holidays matter to one user” and “legacy matters to another” into real modelling rather than a footnote. MoneySmart’s guidance on tracking spending and planning for debts supports this direction strongly. citeturn24view2turn24view9

Second, add a **retirement-state transition layer**. MoneySmart explicitly describes scenarios where people use more super first and then become eligible for a part Age Pension later, or re-balance their mix over time. That means the engine should model retirement as stages: pre-67 bridge years, early retirement drawdown years, Age Pension eligibility years, late-life care years, and return-to-Australia years for overseas retirees. The core output should show when the household transitions from “self-funded” to “mixed funding” to “pension-heavy,” rather than show one flat retirement income number. citeturn24view9

Third, add **portfolio structure and decumulation controls**. Right now the public UI exposes one inflation rate, one main return rate, one super return rate, one volatility input, and generic shock controls. That is useful for an advanced sandbox, but it is not the best default model for ordinary users. A more credible Monte Carlo should capture asset-class allocations, correlation, rebalancing rules, cash bucket size, account ordering, minimum pension drawdown constraints, and spending guardrails such as Guyton-style or floor-and-ceiling adjustments. The app already has dynamic allocation and drawdown settings in code; the missing step is to make decumulation rules explicit and auditable in output. citeturn1view1 fileciteturn12file0 fileciteturn17file0

Fourth, add **longevity and care distributions**, not just an expected lifespan. The current product allows user-entered lifespan assumptions and the simulator can run far into old age, which is good. But a higher-confidence retirement planner should model at least three longevity scenarios or a survival distribution, and tie late-life healthcare and aged care costs to those scenarios. Otherwise the Monte Carlo only randomises markets while leaving one of the biggest retirement risks—living longer than expected—too deterministic. citeturn1view1 fileciteturn12file0

Fifth, add **overseas-specific real-world inputs**. If the calculator is going to recommend or compare overseas retirement, it needs more than a country dropdown and cost index. It needs departure year, intended permanence of move, working life residence years, visa pathway, local housing status, expected healthcare cover, FX spending currency, tax residency assumption, whether the Age Pension will be paid into AUD or foreign currency, and a return-to-Australia fallback scenario. Services Australia’s travel rules make these details outcome-relevant. citeturn15view0turn16view1

## UX recommendations for the Simple and Advanced calculators

The core UX change I recommend is to stop treating the Simple and Advanced experiences as one long page with optional exposure differences. They should be **different products in the same ecosystem**.

The **Simple calculator** should truly stay under five mandatory inputs. A clean version would be: age, household status, current super, annual income, and planned retirement age. From there, infer defaults, run an initial projection, and immediately show: projected retirement income in today’s dollars, likely Age Pension age and rough eligibility status, confidence band, and one strongest improvement lever. The current homepage tries to be simple but still exposes large stretches of advanced fields and assumptions, which weakens completion and trust. citeturn1view1

The **Advanced calculator** should become a guided workspace with progressive disclosure. Aware, AustralianSuper, and AMP all implicitly teach the same lesson: users benefit when retirement planning is broken into distinct tasks such as “how much do I need,” “how do I increase contributions,” “what happens when I retire soon,” and “what income streams do I compare.” AustralianSuper’s calculator suite is especially instructive here because it separates a long-term projection tool, a contribution tool, a near-retirement income tool, and a risk profiler. citeturn32view0turn34view2turn34view3turn34view4turn37view2

That suggests an Advanced UX with these collapsible sections:

- **Household**  
  Ages, partner, dependants, retirement dates, health, residency, overseas plans.

- **Balance sheet**  
  Super, cash, shares, property, debts, inheritances, defined-benefit pensions, income streams.

- **Lifestyle and spending**  
  Essential spend, discretionary spend, travel, hobbies, large future expenses, care preferences, legacy target.

- **Investment settings**  
  Risk profile, glide path, asset mix, contribution strategy, drawdown style, cash bucket.

- **Government support**  
  Age Pension, Work Bonus, downsizer contribution, portability, deeming, homeowner status.

- **Scenario designer**  
  Delay retirement, market crash at retirement, high inflation decade, overseas move, widowhood, aged care event, inheritances, house sale.

The output flow should also change. MoneySmart’s educational pages repeatedly push users toward understanding *what income they will have*, *what spending they need*, and *how super and Age Pension can mix differently over time*. That means the first output screen should be a **retirement paycheck view**, not a technical dashboard. Show the user: “At 67, your household is projected to have $X in today’s dollars, made up of super drawdown, Age Pension, rent/other income, and part-time work.” Then let them drill into Monte Carlo, tables, and methodology. citeturn24view2turn24view9

The highest-value visual improvements would be:

- a **glide-path chart** from self-funded retirement to partial/full pension reliance;
- a **success-confidence gauge** with probability bands and depletion-age distribution;
- a **retirement paycheck card** in today’s dollars;
- a **drivers of outcome** panel showing the top 5 levers;
- a **policy assumptions drawer** showing effective dates for deeming rates, pension rates, tax brackets, and overseas rules;
- a **comparison strip** for Base / GFC-at-retirement / High Inflation / Overseas / Legacy scenarios.

Right now your product already contains many of the underlying engines. The UX win is to make them feel like a planner, not like a spreadsheet surfaced all at once. citeturn1view1 fileciteturn7file0

## Overseas retirement, historic shocks, and whether going overseas is actually better

A lower-cost overseas retirement can absolutely improve cashflow on paper. But if the user is relying meaningfully on the Australian Age Pension, the move can also introduce **rule risk, FX risk, healthcare risk, and re-entry risk** that many calculators underplay. Services Australia states that after more than **6 weeks** overseas, the Pension Supplement drops to the basic rate and the Energy Supplement stops; after **26 weeks**, the pension rate can reduce if Australian Working Life Residence is below **35 years**; and if the person leaves to live in another country, the supplement and Energy Supplement change from departure. Services Australia also notes that if someone leaves again within **2 years** of returning to Australia to live and starting Age Pension, their payment may stop, subject to agreement-country exceptions. citeturn15view0turn14view1

So the practical answer is:

- **Going overseas can improve affordability** if living costs are genuinely lower and the household is mostly self-funded.  
- **Going overseas can increase retirement fragility** if the plan depends on a high Australian pension payment, has low working life residence, faces FX volatility, or requires expensive foreign healthcare or visa renewals.  
- **The calculator should never present overseas retirement as a single “better/worse” answer**. It should present a scenario tree: stay in Australia, short-term trial, permanent move, and return-to-Australia fallback. citeturn15view0turn16view1turn24view9

For shocks and “bumps,” your config already includes stress scenarios for COVID-style crash/recovery, GFC, property correction, and sector-cycle shocks. That is a good start. The next step is to model **sequence risk at or just before retirement** as a named scenario, not just a random event. A dedicated “retire into a bad decade” view is especially important because the same long-run average return can produce very different outcomes depending on early-retirement drawdowns. I would also add explicit scenarios for **sticky inflation / stagflation**, **AUD depreciation**, and **overseas healthcare inflation shock**, because those are highly relevant to Australian retirees, especially abroad. fileciteturn17file0

A well-designed overseas module should therefore answer three separate user questions:

- **Can I afford to move?**
- **How sensitive is this plan to pension-rule changes, FX, and healthcare?**
- **What is my recovery path if the move does not work out?**

That third question is almost always missing from calculators and is exactly where you can differentiate the product.

## Benchmarks and a developer implementation prompt

The clearest external design lesson is that strong calculators are usually **modular**. MoneySmart scaffolds retirement planning with spending, budgeting, super and pension transitions, and a retirement planner rather than leaving everything to one page. AustralianSuper separates long-run super projection, contribution optimisation, near-retirement income estimation, income-stream comparison, and risk profiling. Aware wraps tools around an Age Pension hub, retirement planning content, calculators, and events. AMP combines retirement calculation with digital guidance and an ongoing income-maximisation feature. citeturn24view2turn24view9turn34view2turn34view3turn34view4turn32view0turn37view2


## Open questions and limitations

I was able to inspect the selected GitHub repository and several official public pages, but I did **not** fully reverse-engineer every hidden field and calculation inside JavaScript-heavy third-party calculators such as the live MoneySmart retirement planner UI itself. The MoneySmart planner page is available, but much of its interactive detail is rendered client-side and is not fully exposed in the browser extraction output I used. citeturn12view1turn13view2

I also did not complete a fresh, source-backed survey of *non-Australian official retirement calculators* at the same level of detail as the Australian comparison above. For that reason, my international recommendations are directional and centred on scenario design rather than on a detailed country-by-country feature map.

Even with those limits, the highest-confidence findings are clear: **tighten the policy engine, simplify the simple flow, unify overseas and domestic pension logic, move spending and retirement-state transitions to the centre of the model, and present results as staged retirement income rather than a single projected total.** citeturn19view0turn20view0turn24view9turn34view2
