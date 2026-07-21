# Changelog

All notable changes to ALADDIN·Replica. Newest entries on top.
New entries are added automatically by `npm run ship -- "message"`.

<!-- SHIP -->

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
