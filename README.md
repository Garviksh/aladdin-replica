# ALADDIN · Replica

A **portfolio & risk-management terminal** built to understand, from first
principles, the analyst workflow that institutional risk platforms serve — and to
find out how much of that mathematics one person can implement correctly and
prove.

Every number is computed and unit-tested. There is no quant library underneath:
factor betas by multivariate OLS with ridge, covariance by sample / EWMA /
Ledoit–Wolf shrinkage, VaR parametric and historical and Cornish–Fisher,
Expected Shortfall, component risk that sums exactly to portfolio volatility,
and a Kupiec + Christoffersen backtest that tests whether the VaR numbers are
actually right. Thirteen tabs, ~7,700 lines of TypeScript, two runtime
dependencies (`react`, `react-dom`), 96 tests.

> **Disclaimer.** An **independent personal project**, **not affiliated with,
> endorsed by, or connected to BlackRock, Inc.** "Aladdin" is a trademark of
> BlackRock; it is referenced only to name the category of workflow being
> studied. No BlackRock code, data, design or intellectual property was used or
> reproduced — the interface is an original monochrome design and every
> calculation was written from published methodology. Nothing here is investment
> advice.

---

## For a reviewer with five minutes

If you only open three things, open these:

1. **Risk tab → VaR Backtest.** Kupiec POF and Christoffersen coverage tests
   with p-values and a PASS/FAIL. Most portfolio projects report VaR; this one
   tests whether its VaR was any good.
2. **Backtest tab → the cost selector.** Toggle 0bps → 10bps → 50bps and watch
   the leaderboard. Frictionless, the monthly optimizers win. Charge turnover
   and the comparison changes. Written up in
   [Transaction costs](#transaction-costs-why-the-backtest-shows-two-numbers).
3. **[SCOPE.md](SCOPE.md) §5 — Explicitly out of scope.** Eight capabilities
   considered and declined, each with a reason. What was left out is the part I
   would most want to be asked about.

A written walkthrough — what was hard, what I got wrong, what I would build next
— is in **[CASE_STUDY.md](CASE_STUDY.md)**.

The fastest way to see it: `npm run build:single` produces one ~340 KB HTML file
that opens offline by double-click, no install and no server.

---

## Screenshots

<!-- Drop PNGs into docs/images/ with these names and the links below resolve. -->

| Dashboard | Risk |
|---|---|
| ![Dashboard](docs/images/dashboard.png) | ![Risk](docs/images/risk.png) |

| Backtest — gross vs net of costs | Copilot |
|---|---|
| ![Backtest](docs/images/backtest.png) | ![Copilot](docs/images/copilot.png) |

The interface is strictly monochrome: gains and losses use ▲ / ▼ and accounting
parentheses rather than colour, so it stays colour-blind safe and reads like the
enterprise terminals the workflow comes from.

---

## Features

The terminal is organised into thirteen tabs, mirroring how a portfolio analyst
moves through a book:

- **Dashboard** — headline KPIs (NAV, day P&L, ex-ante volatility, 1-day 99%
  VaR, beta, compliance status), a portfolio-vs-benchmark chart, top movers,
  risk contributors, and asset allocation.
- **Holdings** — the full, sortable position blotter: instrument, class, sector,
  quantity, price, market value, weight, day change, and unrealized P&L.
- **Risk** — ex-ante volatility, parametric and historical VaR (95% / 99%),
  portfolio beta, EWMA / Ledoit–Wolf covariance options, fat-tail (Cornish–Fisher)
  VaR, a Kupiec/Christoffersen VaR backtest, a component-contribution-to-risk
  table (which sums exactly to total risk), and a library of historical stress
  scenarios (several **realized from market history**).
- **Performance** — cumulative return vs. benchmark, Sharpe/Sortino/Calmar,
  rolling metrics, top drawdowns, and return attribution by sector and class.
- **Backtest** — walk-forward, monthly-rebalanced comparison of Current /
  Equal-weight / Min-Variance / Risk-Parity strategies (no look-ahead), reported
  **gross and net of transaction costs** with per-strategy turnover and a
  0–50bps cost selector.
- **Compliance** — a live mandate rule set (position, concentration, allocation,
  VaR, cash, and diversification limits) flagged pass / warning / breach.
- **Forecast** — a seeded Monte Carlo projection of the book (percentile fan
  chart, expected value, probability of loss, horizon VaR) plus per-asset
  expected-return and price targets over 1M / 3M / 6M / 1Y horizons.
- **News** — live market & per-holding headlines, **keyless via GDELT** by
  default with an optional free **Finnhub** key for more reliable feeds; fetched
  in-browser with a timeout + retry, and surfaced on the Dashboard.
- **Impact** — an Ollama-driven *News → Impact* model that turns live headlines
  into estimated per-holding and book P&L via the data-driven factor betas.
- **Scenario** — an interactive factor-shock stress tester: drag Equity / Rates /
  Credit / Commodity / FX sliders or pick a historical preset to see book and
  per-holding P&L.
- **Macro** — real macro indicators from **FRED** (yields, 10Y–2Y curve, CPI,
  unemployment, VIX, Fed Funds, USD index) via `npm run refresh-macro`, mapped to
  factor tilts and an illustrative nowcast, plus a **live Open-Meteo** weather
  alt-data panel.
- **Allocation** — exposure breakdowns and an optimizer (min-variance, risk-parity,
  max-Sharpe) with an efficient-frontier scatter.
- **Guide** — a plain-English walkthrough of how to manage a book and what every
  metric means.

## Transaction costs — why the backtest shows two numbers

The first version of the Backtest tab was wrong, and wrong in the direction that
flatters the author.

Min-Variance and Risk-Parity re-solve their weights every 21 days and trade to
reach them. "Current (buy & hold)" trades once and then holds. With rebalancing
free, the strategies that trade constantly were being compared against
buy-and-hold on terms buy-and-hold never gets — so they won partly by
construction, and the chart looked like a result when it was an artifact.

Now every strategy starts equal-weighted, pays to reach its first target, and
pays `½·Σ|Δw| · costBps` of traded notional at each rebalance. The table shows
gross and net side by side, plus annual turnover per strategy, and the cost
assumption is a control on the page rather than a constant buried in a file —
because the honest thing to do with an assumption is let the reader move it.

Default is 10bps one-way, deliberately conservative for liquid US equity and ETF
exposure. Set it to 0 to see what a frictionless backtest would have claimed.

Implementation: [`src/engine/strategyBacktest.ts`](src/engine/strategyBacktest.ts).
Invariants asserted in [`tests/backtest-strategies.test.ts`](tests/backtest-strategies.test.ts):
net never exceeds gross, cost drag is monotonic in bps, buy-and-hold turns over
strictly less than the monthly optimizers, and the cost assumption never feeds
back into the weight decisions.

## Copilot — local AI (Ollama), dashboard-aware

A **Copilot** launcher sits in the corner on every tab. Ask it to analyze,
predict, or explain any section — *“what’s my risk?”*, *“predict the year
ahead”*, *“explain the Risk tab”*, *“what if NVDA drops 20%?”*.

Its brain is a **local LLM via [Ollama](https://ollama.com)**, grounded in a live
snapshot of your dashboard (holdings, risk, performance, forecast, compliance)
plus a description of what every section does and how it works. Everything stays
on your machine — the data is sent only to your local Ollama server, never to the
cloud. Enable it:

```bash
# 1. Install Ollama from https://ollama.com, then pull a model:
ollama pull llama3.2
# 2. Start it so the web app is allowed to call it (CORS):
OLLAMA_ORIGINS=* ollama serve
```

The Copilot auto-detects Ollama and shows the active model. If Ollama isn’t
running, it falls back to a built-in, deterministic assistant that answers from
the same data with zero network calls.

## Quick start

```bash
npm install
npm run dev        # start the dev server (http://localhost:5173)
```

Other scripts:

```bash
npm run build         # type-check + production build to dist/
npm run build:single  # one self-contained dist/aladdin-replica-standalone.html
npm run refresh-data       # REAL EOD prices (Twelve Data key, keyless fallback)
npm run refresh-scenarios  # realized stress-scenario shocks from live history (keyless)
npm run refresh-macro      # real macro indicators from FRED + live weather (keyless)
npm run preview       # preview the production build
npm run typecheck     # tsc --noEmit
npm run lint          # eslint
npm test              # vitest (engine, forecast, assistant, render smoke)
```

`build:single` produces a single HTML file with all CSS/JS inlined that opens
directly from disk (no server) — every tab, the forecast, and the Copilot work
offline.

Use the **Market Seed** control in the header to load a specific reproducible
market, or **Reseed ⟳** to generate a fresh plausible world and watch every
metric recompute.

## Real market data

The terminal runs on **real market data**. On first load, if no dataset is
present it shows a **load-data screen** — no dummy numbers are ever shown as if
they were real. Load real end-of-day prices with one command:

```bash
# Reliable: free Twelve Data key (30s signup, no card) — https://twelvedata.com/register
TWELVE_DATA_KEY=your_key npm run refresh-data
npm run dev            # header shows DATA: LIVE
```

`refresh-data` pulls ~2 years of daily closes for the book’s instruments (primary:
Twelve Data with your key; keyless fallback: Yahoo Finance, then Stooq — those are
frequently rate-limited, which is why the key is recommended), aligns them on
common trading dates, and writes `src/data/marketData.json`. From then on
volatility, VaR, beta, correlations, drawdown, Sharpe, and the **Monte Carlo
forecast** are all computed from **real returns**, and the status bar shows the
source and as-of date. Re-run anytime to refresh.

Notes: the book’s target weights are seeded (Reseed makes a new book on the same
real prices). Factor-exposure betas remain model priors (ADR-005 in
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)); everything else is real. With no
data and no key you can click **Preview with sample data** on the load screen —
it is clearly marked “SAMPLE — not real”.

## Tech stack

React 18 + TypeScript, built with Vite. Zero runtime dependencies beyond React —
the charts are hand-rolled SVG for full monochrome control, and the risk engine
is plain, testable TypeScript. Tests run on Vitest; CI (lint, type-check, test,
build) and a GitHub Pages deploy run on GitHub Actions.

## Project structure

```
src/
  types/domain.ts        Domain model
  lib/                   Seeded PRNG + formatting helpers
  data/                  Instrument universe + deterministic market generator
  engine/                Pure functions: risk, performance, compliance, forecast
  assistant/             Local Copilot — knowledge base + intent engine
  state/                 PortfolioContext (seed in, analytics out)
  components/            Layout chrome, tables, KPI tiles, SVG charts, Copilot
  views/                 The thirteen terminal tabs
tests/                   Vitest tests: engine, forecast, assistant, render smoke
scripts/                 inline-singlefile.mjs (single-file build helper)
docs/                    PRODUCT_BRIEF.md and ARCHITECTURE.md (ADRs)
```

## How the numbers are computed

A seeded PRNG drives a linear factor model — `r_i = Σ_k β_ik · f_k + ε_i` — over
five factors (equity, rates, credit, commodity, FX). From the resulting daily
returns the engine builds a covariance matrix and derives:

- **Ex-ante volatility** `√(wᵀ Σ w)`, annualized.
- **VaR** — parametric (`z · σ · V`) and historical (empirical percentile of
  portfolio P&L), at 95% and 99% over a 1-day horizon.
- **Component risk** — marginal and component contributions that sum exactly to
  portfolio volatility (asserted in tests).
- **Factor exposures**, **beta**, **attribution**, and **stress P&L** under named
  historical scenarios.

Full detail — including the ADRs behind the design — is in
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md); the product rationale is in
[`docs/PRODUCT_BRIEF.md`](docs/PRODUCT_BRIEF.md).

## Distribution

This repository is private. The deliverable is the single-file build:

```bash
npm run build:single    # → dist/aladdin-replica-standalone.html (~340 KB)
```

One file with all CSS and JS inlined. It opens by double-click from disk — no
install, no server, no network — with every tab, chart and computation working.
Risk, performance, backtest, scenarios, allocation, compliance and forecast all
run from the baked dataset. The Copilot needs a local Ollama server, and live
News / weather need a connection; opened offline those show their load gates
rather than invented numbers, which is the data-integrity principle working as
intended.

A GitHub Pages workflow exists and is correct, but is inactive while the
repository stays private. See [SCOPE.md](SCOPE.md) §6.

## Scope & status

**v1.0 — feature complete.** All thirteen tabs ship real, computed numbers;
typecheck, lint, tests and build are green in CI.

What is in v1.0, what is deliberately excluded and why, and the definition of
done are settled in **[SCOPE.md](SCOPE.md)** — that document is authoritative
where anything else disagrees.

Supporting reading: build history and engineering handoff in
**[PROJECT_HISTORY.md](PROJECT_HISTORY.md)** · release log in
**[CHANGELOG.md](CHANGELOG.md)** · real-product context in
**[docs/ALADDIN.md](docs/ALADDIN.md)** · competitive analysis and accuracy
scorecard in **[docs/BENCHMARKS.md](docs/BENCHMARKS.md)** · design decisions and
methodology in **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

## License

[MIT](LICENSE) © 2026 KAIZEN
