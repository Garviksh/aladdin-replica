# ALADDIN · Replica — project case study

**Kaizen** · [garviksh@gmail.com](mailto:garviksh@gmail.com)

A portfolio and risk-management terminal built to find out how much institutional
risk mathematics one person can implement correctly — and, more importantly,
prove correct.

Not affiliated with BlackRock. "Aladdin" names the category of workflow being
studied; no BlackRock code, data, design or intellectual property was used or
reproduced.

**Artifact:** `dist/aladdin-replica-standalone.html` — one ~340 KB file, opens
offline by double-click, no install, no server.

---

## The premise

Most portfolio dashboards are a charting library pointed at an API. They display
numbers. They do not compute them, and they cannot tell you whether the numbers
are right.

I wanted the opposite: implement the mathematics from published methodology, with
no quant library underneath, and then build the tests that would catch me if I
got it wrong. The interface is a strictly monochrome enterprise terminal —
gains and losses use ▲ / ▼ and accounting parentheses rather than colour — because
the constraint forced every design decision to be about information density
rather than decoration.

**Scale:** 13 tabs · ~7,700 lines of TypeScript · 2 runtime dependencies
(`react`, `react-dom`) · 20 test suites · 100+ tests · CI on every push.

---

## What was hard, and what I did about it

**Factor exposures were double-counting.** The first implementation regressed each
holding against each factor proxy one at a time. Because the proxies are
correlated — SPY and HYG move together in a risk-off — every univariate beta
absorbed part of the same systematic move, and the exposures summed to more risk
than existed. Replaced with a multivariate OLS solve (Gauss–Jordan with ridge
regularisation) against SPY / IEF / HYG / GLD / UUP simultaneously. Exposures,
stress P&L and the news-impact model all became coherent at once.

**Normal-assumption VaR understates the tail.** Added Cornish–Fisher VaR, which
adjusts the quantile for realised skewness and excess kurtosis, alongside
historical VaR and Expected Shortfall. The Risk tab shows all of them together,
so the gap between the normal assumption and the empirical tail is visible rather
than hidden.

**A VaR number nobody tests is a decoration.** This is the part I would most want
to be asked about. The Risk tab runs a **Kupiec proportion-of-failures test** and
a **Christoffersen conditional-coverage test** against realised exceedances, and
reports p-values with a PASS/FAIL. The first tells you whether the breach *rate*
matches the confidence level; the second tells you whether breaches are
*independent* or clustering — which is what actually hurts, because clustered
breaches are how a book dies in a week rather than a year.

**Covariance from a plain sample matrix is unstable.** Added an EWMA (λ = 0.94,
RiskMetrics) estimator and Ledoit–Wolf shrinkage toward a structured target, as a
selector on the Risk tab. Every downstream metric recomputes, so the sensitivity
of the risk numbers to the estimator choice is something you can see rather than
something you have to take on faith.

**Stress scenarios are usually invented.** Eight of the sixteen — GFC 2008, COVID
2020, 2022 inflation, SVB 2023, Q4 2018, China/oil 2015–16, taper 2013, euro
crisis 2011 — use the **realised returns of the factor proxies over the actual
historical window**, not hand-picked shocks. The UI tags each scenario REALIZED
or MODEL and shows the window, so the reader knows which is which.

---

## The mistake I want to be judged on

The backtest was wrong, and wrong in the direction that flattered me.

Min-Variance and Risk-Parity re-solve their weights every 21 days and trade to
reach them. "Current (buy & hold)" trades once and then holds. My first version
charged nothing for rebalancing — so the strategies that traded constantly were
being compared against buy-and-hold on terms buy-and-hold never gets. They won
partly by construction. The chart looked like a finding; it was an artifact of my
own accounting.

The fix: every strategy now starts from cash, pays `½·Σ|Δw| · costBps` of traded
notional to establish its first book, and pays the same at every rebalance. The
table reports gross and net side by side with per-strategy annual turnover, and
the cost assumption is a control on the page — 0, 5, 10, 20, 50bps — rather than
a constant buried in a source file. Default is 10bps one-way, deliberately
conservative for liquid US equity and ETF exposure.

The first version of the fix was also wrong, which is the part I find more
instructive. I initialised every strategy at equal weight — so Equal-weight was
already at its target on day one and paid nothing, ever. I had removed one
structural bias and introduced another in the same change. Starting every
strategy from cash is the version that holds: you cannot have a book without
buying it, and no strategy should get a free entry into the allocation it happens
to prefer. There is now a test asserting exactly that.

Set it to 0 and you see what a frictionless backtest would have claimed. That
comparison is now the most useful thing on the tab.

The invariants are asserted in tests: net never exceeds gross, cost drag is
monotonic in the bps assumption, buy-and-hold turns over strictly less than the
monthly optimizers, and — the one that matters — the cost assumption never feeds
back into the weight decisions, so I cannot accidentally optimise against my own
friction model.

I am including this because a backtest that has never been wrong has usually
never been checked.

---

## What I deliberately did not build

Eight capabilities were considered and declined, each recorded with a reason in
[`SCOPE.md`](SCOPE.md) §5. The three that most need explaining:

- **Order management, execution, settlement.** A different product. This is the
  analyst's read-only view, and pretending otherwise would have made the scope
  meaningless.
- **A hosted-LLM fallback for the Copilot.** It would work, and it would break
  the guarantee that portfolio data never leaves the machine. The guarantee was
  worth more than the convenience.
- **Fixed-income duration and convexity.** The book holds bond ETFs, and treating
  them through equity-style factor betas is a real limitation a rates person
  would flag immediately. Doing it properly needs instrument-level terms the free
  data sources do not provide, and I would rather carry a stated limitation than
  ship a fabricated one.

The governing rule is written into the scope document: adding a capability means
moving it out of the exclusion list and justifying it against the project's four
principles. Transaction costs is the one item that made that journey, and only
because a frictionless backtest is a wrong number rather than a missing feature.

---

## How it is verified

- **Real data only.** No fabricated number is ever shown as if it were real. Each
  data-dependent surface gates behind a load prompt until its refresh script has
  run. Sample data exists only behind an explicit, labelled preview.
- **Component risk sums exactly to portfolio volatility** — asserted, not assumed.
- **No look-ahead** in the walk-forward backtest — estimators see trailing data
  only, asserted in tests.
- **Anti-hallucination verifier** on the Copilot: any currency figure in a model
  answer that does not appear in the grounding snapshot is flagged in the UI.
- **Tests are data-agnostic** — they pass whether the datasets are empty
  placeholders or fully refreshed. Two tests once asserted that macro data was
  *absent*, which broke the first time the refresh script ran; they now assert the
  invariant (the gate agrees with the data) instead of the state.
- Typecheck, lint, unit tests and production build run in CI on every push.

---

## What I would build next

1. **Transaction costs in the optimizer, not just the backtest** — turnover-aware
   rebalancing that solves for target weights net of the cost of reaching them.
2. **Fixed-income analytics** — duration and convexity for the bond sleeve, so
   rate shocks come from term structure rather than a factor beta.
3. **Fama–French factors with rolling exposures** — Mkt-RF, SMB, HML, momentum,
   to separate genuine alpha from unpriced factor drift.
4. **Liquidity-adjusted risk** — days-to-liquidate under stress, which is the
   dimension the current model is most silent about.

---

## Stack

React 18 · TypeScript (strict) · Vite · Vitest · hand-rolled SVG charts · local
Ollama for the Copilot · GitHub Actions CI. Data: Twelve Data (prices), FRED
(macro), GDELT (news), Open-Meteo (weather).

Nothing here is investment advice.
