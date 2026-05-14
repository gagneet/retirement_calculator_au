You are working on the public web app retirement.gagneet.com and retirement.gagneet.com/advanced.html.
Your job is to upgrade the calculator from a broad multi-feature prototype into a higher-confidence, policy-current, modular Australian retirement planner.

Objectives
- Keep the calculator browser-based and user-friendly.
- Preserve existing strengths: Monte Carlo, Age Pension modelling, property, healthcare, overseas scenarios, what-if testing.
- Improve trust, policy accuracy, UX clarity, and code maintainability.
- Do not remove current advanced capabilities; reorganise and harden them.

Mandatory architecture changes
- Create a single shared “policy engine” module as the source of truth for:
  - Age Pension rates
  - assets test thresholds
  - income test thresholds
  - deeming rates/thresholds
  - pension portability rules
  - tax brackets
  - super caps
  - minimum pension drawdowns
- Refactor overseas-retirement logic so it does NOT maintain a separate pension calculator.
- Add effective-date metadata and “last reviewed” metadata to all legislative constants.
- Make all result screens show “Rules used as at [date]”.
- Keep proposed or budget-only changes behind clearly labelled scenario toggles:
  - status = proposed / legislated / effective
  - commencement date
  - source URL stored in config metadata

Mandatory code fixes
- Remove duplicate class method definitions in app.js.
- Split the current monolithic app controller into smaller controllers/services:
  - input normalisation
  - policy engine
  - accumulation engine
  - decumulation engine
  - overseas engine
  - UI state / rendering
- Replace production CDN dependencies where practical with bundled/self-hosted assets.
- Remove AdSense from pages where users enter retirement data, or isolate ads behind strict consent.
- Add consent-aware analytics; no financial input values may be sent to third parties.

Mandatory calculator logic changes
- Add a spending engine with categories:
  - essentials
  - discretionary
  - travel
  - hobbies
  - gifts/family support
  - home maintenance
  - healthcare
  - aged care
  - insurance
  - transport / car replacement
  - one-off lump sums
  - legacy / trust target
- Each category must support:
  - today’s dollars
  - inflation-linked
  - start/end ages
  - one-off or recurring
  - go-go / slow-go / no-go taper
- Add retirement-state transitions:
  - pre-retirement
  - bridge-to-age-pension
  - early retirement
  - mixed super + pension phase
  - late-life care phase
  - optional return-to-Australia phase for overseas retirees
- Add portfolio-level Monte Carlo using:
  - separate asset classes
  - correlation matrix
  - inflation process
  - return regime switching
  - fat-tail shock presets
  - sequence-of-returns scenario at retirement
  - FX shock for overseas-mode users
- Do not ask ordinary users to set raw volatility or shock probability by default.
  Provide presets:
  - Base case
  - Conservative
  - Growth
  - GFC-at-retirement
  - High inflation decade
  - Overseas FX shock
  - Long-life + aged-care
- Add spending guardrail options for drawdowns:
  - fixed real spending
  - percentage-of-balance
  - floor-and-ceiling guardrails
  - minimum pension drawdown floor
- Add probability metrics:
  - probability of not running out of money
  - probability of meeting minimum lifestyle
  - probability of meeting comfortable lifestyle
  - probability of achieving legacy goal
  - depletion age distribution

Mandatory Age Pension / overseas rules
- Model 6-week overseas changes separately from 26-week AWLR changes.
- Distinguish:
  - holiday/travel absence
  - long-term absence
  - permanent move overseas
- Add explicit inputs:
  - years of Australian Working Life Residence
  - age arrived in Australia
  - departure age
  - temporary or permanent move
  - agreement country yes/no
  - intended country
  - local rent/homeowner status
  - tax residency assumption
  - foreign health cover assumption
  - return-to-Australia fallback scenario
- When showing overseas results, compare:
  - Australia stay scenario
  - overseas base scenario
  - overseas adverse scenario
  - return-to-Australia scenario
- Never show a simple “better overseas” verdict without risk explanation.

Mandatory UX changes
- Simple calculator:
  - max 5 required inputs
  - show only headline result, confidence range, pension timing, and best next action
  - hide advanced assumptions completely
- Advanced calculator:
  - use collapsible sections:
    - Household
    - Assets and debts
    - Lifestyle and spending
    - Investments
    - Government support
    - Overseas plans
    - Advanced scenarios
  - show inline “why this matters” microcopy
  - show “recommended default” for assumptions
- Redesign outputs:
  - retirement paycheck card in today’s dollars
  - glide-path chart from super to Age Pension reliance
  - Monte Carlo confidence gauge
  - fan chart with scenario labels
  - depletion-age histogram
  - top drivers panel
  - assumptions/provenance drawer
  - scenario compare table
- Add a strong “today’s dollars vs nominal” toggle and default to today’s dollars.

Mandatory testing
- Add deterministic snapshot tests for:
  - accumulation only
  - super first / pension later
  - couple rates
  - homeowner vs non-homeowner
  - overseas >6 weeks
  - overseas >26 weeks with <35 AWLR
  - permanent move overseas
  - return-to-Australia scenario
  - legacy goal
  - large lump-sum expense
  - high inflation decade
  - market crash in year 1 of retirement
- Add policy regression tests that fail when official rates are changed and config metadata is stale.

Deliverables
- Refactored code
- migration notes
- updated assumptions page
- updated privacy wording
- updated methodology page
- a changelog entry explaining all logic changes
- a short QA checklist for future policy updates

Success criteria
- Simple flow completion time under 2 minutes
- Advanced flow remains powerful but understandable
- All pension/tax outputs tie back to a dated policy source
- Overseas scenarios correctly handle 6-week and 26-week rule changes
- Users can clearly see if a plan succeeds, fails, or only works under optimistic assumptions

