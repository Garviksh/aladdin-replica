# Changelog

All notable changes to ALADDIN·Replica. Newest entries on top.
New entries are added automatically by `npm run ship -- "message"`.

<!-- SHIP -->

## 2026-07-25
- SCOPE: browser deploy steps, gh CLI now optional

## 2026-07-25
- Remove orphaned chart scale module

## 2026-07-25
- v1.0 scope: add SCOPE.md, retire stale ROADMAP, shared chart axis helper

## 2026-07-25
- Trim stale roadmap, shared chart scale helper

## 2026-07-22
- Add PROJECT_HISTORY.md: complete build history + resume-ready handoff brief

## 2026-07-22
- Fix GitHub Pages deploy (auto-enable Pages) + historical scenarios, Macro tab, tool-calling Copilot

## 2026-07-22 — Real historical scenarios + Macro/alt-data tab + tool-calling Copilot
- **Real historical scenarios**: 8 crises (GFC 2008, COVID 2020, 2022 inflation, SVB 2023, 2018 Q4, 2015–16 China/oil, 2013 taper, 2011 euro) now use **realized factor-proxy returns** over the actual window instead of hand-calibrated shocks. The Risk tab tags each scenario **REALIZED** (from market history) vs **MODEL** and shows its window. New `npm run refresh-scenarios` recomputes them from live history (SPY/IEF/HYG/GLD/UUP).
- **New Macro tab**: real macro indicators from **FRED** (10Y & 2Y yields, 10Y–2Y curve, CPI YoY, unemployment, VIX, Fed Funds, USD index) via `npm run refresh-macro` (keyless), mapped to heuristic **factor tilts** and an illustrative **macro nowcast** P&L through your betas — plus a **live Open-Meteo weather** alt-data panel fetched in-browser (no key). No fabricated numbers: macro shows a load gate until refreshed.
- **Copilot tool-calling**: the local Ollama Copilot can now **query the live engine** via function-calling — `list_holdings`, `get_holding`, `get_risk`, `get_performance`, `top_risk_contributors`, `get_scenario`, `stress_test`, `price_move`, `get_macro` — grounding answers in exact, freshly-computed numbers and showing which tools it used. Falls back to streaming, then the built-in local assistant.
- Tests: **96** (added scenarios, macro and tools suites).

## 2026-07-22
- Stress scenario library: 16 historical, calibrated scenarios (all listed, worst-first, live P&L via betas)

## 2026-07-22 — Stress scenario library (16 historical scenarios)
- **Risk → Stress Scenarios** now ships a broad, historically-calibrated library of **16** named scenarios: 2008 GFC, 2020 COVID crash, 2022 inflation & Fed hikes, 2023 regional-banking crisis, 2018 Q4 sell-off, 2015–16 China deval & oil crash, 2013 taper tantrum, 2011 euro debt & US downgrade, 2000 dot-com bust, 1987 Black Monday, stagflation, oil supply shock, rate shock (+200bps), credit crunch, broad risk-off, and soft landing.
- Each scenario computes **live P&L through your portfolio's data-driven factor betas**; the panel lists **all** of them sorted worst-first with $ P&L and % NAV, and updates whenever the book or covariance model changes.
- Documented factor sign conventions (equity/rates/credit/commodity/FX) and magnitudes representative of each episode.
- Copilot snapshot now surfaces the worst-case stress scenario.

## 2026-07-22
- Interactive Scenario Builder (factor-shock stress test) + Holdings CSV export

## 2026-07-22 — Scenario Builder + CSV export
- New **Scenario** tab: interactive factor-shock stress test (equity / rates / credit / commodity / FX sliders + historical presets) → per-holding and book P&L via data-driven betas.
- **Holdings**: one-click **Export CSV** of the position blotter.

## 2026-07-22 — Efficient frontier + walk-forward backtesting
- **Allocation**: an **Efficient Frontier** scatter (random long-only portfolios) marking Current / Min-Var / Max-Sharpe / Risk-Parity / Equal; added max-Sharpe (tangency) weights.
- New **Backtest** tab: walk-forward, monthly-rebalanced comparison of Current / Equal-weight / Min-Variance / Risk-Parity with cumulative curves and stats (return, vol, Sharpe, max DD) — estimators use trailing data only (no lookahead).

## 2026-07-22
- Reliable news: optional Finnhub provider + keyless GDELT fallback

## 2026-07-22 — Reliable news provider (GDELT + optional Finnhub)
- News now supports an optional free **Finnhub** API key (stored only in your browser) for reliable market & per-company feeds; **GDELT** stays the keyless default.
- Scope-based news fetching (market / per-holding) with timeout + retry across Dashboard, News, and Impact.

## 2026-07-22
- News timeout+retry, Copilot JSON+verifier, rolling metrics, correlation heatmap, optimizer

## 2026-07-22 — News reliability, Copilot verifier, rolling/heatmap/optimizer
- **News**: fetch now times out (12s) with a **Retry** button instead of hanging forever.
- **Copilot**: structured **JSON output** for the Impact model, an **anti-hallucination** verifier that flags $-figures not in the live snapshot, and a live status line (no stale "connecting").
- **Performance**: rolling 63-day **volatility & beta** charts + **top drawdowns** table.
- **Risk**: **correlation heatmap** (monochrome).
- **Allocation**: **optimizer** — min-variance & risk-parity suggested weights vs current, with a portfolio-vol comparison.

## 2026-07-21
- Risk realism: EWMA/shrinkage covariance, fat-tail VaR, Kupiec/Christoffersen backtest

## 2026-07-22 — Risk realism: EWMA/shrinkage covariance, fat-tail VaR, VaR backtest
- Covariance estimator selector on the Risk tab: **Sample / EWMA / Ledoit–Wolf shrinkage**.
- **Fat-tailed VaR** — Cornish–Fisher (skew/kurtosis-adjusted) plus historical 95/99, shown beside normal VaR and CVaR.
- **VaR backtest** panel — Kupiec POF + Christoffersen coverage tests with p-values and PASS/FAIL.
- Copilot snapshot now includes tail metrics and the backtest result.

## 2026-07-21 — Accuracy upgrade: multivariate betas, CVaR, richer metrics
- Factor betas now estimated by **multivariate OLS** (intercept + ridge) instead of univariate — removes double-counting; improves exposures, stress, and News→Impact.
- Added **CVaR / Expected Shortfall** (parametric 95/99 + historical) to the Risk tab and a CVaR KPI on the Dashboard.
- Added **Sortino, Calmar, Information Ratio, Tracking Error, downside deviation** to Performance.
- Responsive KPI grid; the Ollama Copilot snapshot now includes the new metrics.

## 2026-07-21
- Add BENCHMARKS.md + competitive/Ollama improvement backlog in roadmap

## 2026-07-21 — Competitive analysis + improvement backlog
- Added `docs/BENCHMARKS.md`: comparison vs OpenBB, QuantLib, Riskfolio-Lib, pyfolio/quantstats, Ghostfolio, Portfolio Visualizer, plus an accuracy scorecard.
- Roadmap: new "Competitive improvements (borrowed)" section (shrinkage/EWMA covariance, CVaR, multivariate Fama-French betas, backtesting, richer perf stats, optimizer, data-provider layer) and "Ollama Copilot upgrades" (tool-calling, RAG embeddings, structured JSON, larger context, anti-hallucination verifier).

## 2026-07-21
- Data-driven betas + News→Impact (Ollama) + ALADDIN & roadmap docs

## 2026-07-21 — Data-driven betas + News→Impact model
- **Real factor betas**: exposures and stress/impact now regress each holding's real returns on real factor proxies (SPY/IEF/HYG/GLD); FX falls back to prior.
- **News → Impact** tab: local Ollama classifies live headlines into factor/price events, mapped to per-holding and book P&L via those betas.
- Added `docs/ALADDIN.md` (real-product reference + optimization vs. global pain points) and `ROADMAP.md`.

## 2026-07-21
- Ollama Copilot, real-data-only, live news, and roadmap

## 2026-07-21
- Local Ollama Copilot + real-data-only + live news

## 2026-07-21 — Local AI Copilot (Ollama) + real-data-only
- Copilot now uses a local **Ollama** LLM, grounded in a live snapshot of the whole dashboard (holdings, risk, performance, forecast, compliance) plus how each section works; falls back to the built-in assistant if Ollama isn't running.
- App is **real-data-only**: a load-data gate replaces dummy data; sample data only via explicit, clearly-marked preview.
- Data fetch uses Twelve Data (API key) with Yahoo Finance / Stooq keyless fallback.

## 2026-07-21
- Real prices via Twelve Data key

## 2026-07-21 — Live news + real-data default
- Added a **News** tab and a Dashboard news panel with real headlines via GDELT (keyless, in-browser).
- App now defaults to real data; sample data is clearly labelled **DEMO** with a banner prompting `npm run refresh-data`.

## 2026-07-21 — Real market data
- Real end-of-day data mode via `npm run refresh-data` (Stooq, no API key).
- Risk, VaR, beta, drawdown and the Monte Carlo forecast run on real returns.
- Header DATA: SIM <-> REAL toggle; status bar shows source and as-of date.

## 2026-07-21 — Forecast, Guide & Copilot
- Forecast tab (Monte Carlo + per-asset targets), Guide tab.
- On-device, privacy-first Copilot (zero network calls).
- Single-file build (`npm run build:single`).

## 2026-07-21 — Initial release
- Dashboard, Holdings, Risk, Performance, Allocation, Compliance.
- Black-and-white UI, seeded engine, unit tests, CI.
