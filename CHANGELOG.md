# Changelog

All notable changes to ALADDIN·Replica. Newest entries on top.
New entries are added automatically by `npm run ship -- "message"`.

<!-- SHIP -->

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
