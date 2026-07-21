# Changelog

All notable changes to ALADDIN·Replica. Newest entries on top.
New entries are added automatically by `npm run ship -- "message"`.

<!-- SHIP -->

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
