# ALADDIN · Replica

A small-scale, educational **portfolio & risk-management terminal** that
replicates the core analyst workflow of BlackRock's *Aladdin* platform, rendered
in a deliberately **late-2000s black-and-white enterprise interface**.

Every number on screen is computed — not faked — by a transparent, unit-tested
risk engine running entirely in the browser: a factor-model market simulation,
covariance-based volatility, value-at-risk, risk decomposition, factor
exposures, performance attribution, stress scenarios, mandate compliance, and a
Monte Carlo forecast. It also ships a dashboard-aware **Copilot** powered by a
local LLM (**Ollama**) that runs entirely on your machine.

> **Disclaimer.** This is an **independent educational project**. It is **not
> affiliated with, endorsed by, or connected to BlackRock, Inc.** "Aladdin" is a
> trademark of BlackRock; it is referenced solely to describe the workflow being
> emulated. The terminal runs on **real** end-of-day market data (see
> [Real market data](#real-market-data)); sample data is shown only if you
> explicitly opt in and is clearly marked. Nothing here is investment advice.

---

## Features

The terminal is organised into six tabs, mirroring how a portfolio analyst moves
through a book:

- **Dashboard** — headline KPIs (NAV, day P&L, ex-ante volatility, 1-day 99%
  VaR, beta, compliance status), a portfolio-vs-benchmark chart, top movers,
  risk contributors, and asset allocation.
- **Holdings** — the full, sortable position blotter: instrument, class, sector,
  quantity, price, market value, weight, day change, and unrealized P&L.
- **Risk** — ex-ante volatility, parametric and historical VaR (95% / 99%),
  portfolio beta, factor exposures, a component-contribution-to-risk table
  (which sums exactly to total risk), and five historical stress scenarios.
- **Performance** — cumulative return vs. benchmark, Sharpe, max drawdown, and
  return attribution by sector and asset class.
- **Allocation** — exposure breakdowns by asset class, sector, and region.
- **Compliance** — a live mandate rule set (position, concentration, allocation,
  VaR, cash, and diversification limits) flagged pass / warning / breach.
- **Forecast** — a seeded Monte Carlo projection of the book (percentile fan
  chart, expected value, probability of loss, horizon VaR) plus per-asset
  expected-return and price targets over 1M / 3M / 6M / 1Y horizons.
- **News** — live market headlines and per-holding news via **GDELT** (a real,
  keyless news API), fetched in the browser; also surfaced on the Dashboard.
- **Guide** — a plain-English walkthrough of how to manage a book and what every
  metric means.

The whole UI is strictly monochrome: gains and losses use ▲ / ▼ markers and
accounting parentheses instead of colour, so it stays true black-and-white and
colour-blind safe.

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
npm run refresh-data  # download REAL EOD prices (Twelve Data key, keyless fallback)
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
  views/                 The eight terminal tabs
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

## Deployment

Pushing to `main` triggers the GitHub Pages workflow
(`.github/workflows/deploy.yml`). Enable **Settings → Pages → Source: GitHub
Actions** on the repo. The build uses a relative base path, so it also works from
any static host or subdirectory.

## Roadmap

CSV portfolio import · correlation heatmap · efficient-frontier optimizer ·
fixed-income duration/convexity sub-module · PDF risk report export.

## License

[MIT](LICENSE) © 2026 KAIZEN
