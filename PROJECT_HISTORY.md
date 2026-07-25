# PROJECT HISTORY & HANDOFF

> **Purpose of this file:** a complete, self-contained brief of this project — what it is,
> everything built so far, how it's built and verified, and what comes next — written so
> that anyone (or any AI assistant, on any account) can read this one file and **resume
> development exactly where it left off**. Keep it updated when major features ship.

Repo: `https://github.com/Garviksh/aladdin-replica` · Owner: Garviksh
Last updated: **2026-07-22**

---

## 1. What this project is

**ALADDIN·Replica** — a small-scale, educational clone of BlackRock's Aladdin
portfolio & risk-management terminal. Late-2000s **strict black-and-white** enterprise
UI (no color anywhere; gains/losses use ▲/▼ and accounting parentheses). Built for
**learning**, not production or investment advice. Not affiliated with BlackRock.

**Core principles (do not violate when resuming):**

1. **Real data only** — no fabricated numbers. Features gate themselves behind a
   "load data" prompt until real data is fetched. Sample/sim data exists only as an
   explicitly labeled preview.
2. **Privacy** — the AI Copilot runs on a **local Ollama** LLM; portfolio data never
   leaves the user's machine. News/weather fetches are keyless or bring-your-own-key.
3. **Professional quality bar** — strict TypeScript, ESLint clean, every feature unit
   tested AND live-verified in Chrome before being called done.
4. **Transparent math** — every metric implemented from first principles in
   `src/engine/` (no black-box libraries), documented in `docs/ARCHITECTURE.md`.

**Stack:** React 18 + TypeScript + Vite · hand-rolled SVG charts · Vitest ·
ESLint (flat config) · no runtime dependencies beyond React.

---

## 2. Current status snapshot (as of 2026-07-22)

- **13 tabs**, all functional: Dashboard, Holdings, Risk, Performance, Forecast,
  Backtest, News, Impact, Scenario, Macro, Allocation, Compliance, Guide.
- **19 test files / 96 tests** — all passing. Typecheck, lint, production build green.
- **CI on GitHub Actions** (lint + typecheck + tests + build) — passing.
- **GitHub Pages deploy** — workflow exists (`.github/workflows/deploy.yml`, with
  `actions/configure-pages@v5 enablement:true`). Historically failed because the repo
  was **private on a free plan** (Pages requires public). Fix in flight: make repo
  public (`gh repo edit ... --visibility public --accept-visibility-change-consequences`),
  enable Pages (`gh api --method POST /repos/Garviksh/aladdin-replica/pages -f build_type=workflow`),
  re-run `deploy.yml`. Target URL: `https://garviksh.github.io/aladdin-replica/`.
- Real market data loaded via Twelve Data (user has a key); DATA: LIVE badge shows in header.

---

## 3. Build history (chronological)

Granular log lives in `CHANGELOG.md` (auto-appended by `npm run ship -- "msg"`).
Summary of the arc:

**Day 1 (2026-07-21) — Foundation**
- Product brief + architecture ADRs (`docs/PRODUCT_BRIEF.md`, `docs/ARCHITECTURE.md`).
- Monochrome terminal UI; seeded factor-model market simulation (mulberry32 RNG).
- Core tabs: Dashboard, Holdings, Risk, Performance, Allocation, Compliance.
- Risk engine v1: covariance, ex-ante vol √(wᵀΣw), parametric+historical VaR, beta,
  component contribution-to-risk, diversification ratio.
- Forecast tab (Monte Carlo fan chart + per-asset targets), Guide tab, on-device Copilot v1.
- GitHub repo, CI workflow, MIT license, single-file build (`npm run build:single`).
- **Real data pipeline**: `npm run refresh-data` → `src/data/marketData.json`
  (Twelve Data w/ key → Yahoo → Stooq keyless fallback); sim↔real toggle in header.
- Live **News** via GDELT (keyless, CORS-friendly, in-browser).
- **Ollama Copilot**: local LLM grounded in a live dashboard snapshot; real-data-only
  gate replaced dummy data everywhere.
- **Data-driven factor betas** (regression on real proxy ETFs: SPY/IEF/HYG/GLD) and
  **News → Impact** tab (Ollama classifies headlines → factor shocks → P&L via betas).
- `docs/ALADDIN.md` (real product reference), `ROADMAP.md`, `docs/BENCHMARKS.md`
  (vs OpenBB, Riskfolio-Lib, pyfolio/quantstats, Portfolio Visualizer, Ghostfolio, QuantLib).

**Day 2 (2026-07-22) — Accuracy & depth**
- **Multivariate OLS betas** (Gauss–Jordan solve + ridge; removes double counting).
- **CVaR/Expected Shortfall** (parametric + historical), **Cornish–Fisher fat-tail VaR**,
  skew/kurtosis; **EWMA (λ=0.94)** and **Ledoit–Wolf shrinkage** covariance selector.
- **VaR backtest**: Kupiec POF + Christoffersen coverage tests with p-values, PASS/FAIL.
- Performance upgrades: Sortino, Calmar, Information Ratio, Tracking Error, downside
  deviation, rolling 63d vol/Sharpe/beta charts, top-drawdowns table.
- **Correlation heatmap**; news timeout+retry; optional **Finnhub** news key (localStorage).
- Copilot: structured JSON output for Impact, **anti-hallucination verifier**
  (flags $-figures not present in the snapshot).
- **Optimizer**: min-variance, risk-parity, max-Sharpe tangency + **efficient frontier**
  scatter (random long-only portfolios).
- **Backtest tab**: walk-forward, monthly-rebalanced (21d) strategy comparison
  (Current / Equal / Min-Var / Risk-Parity), trailing 126d estimation, no look-ahead.
- **Scenario tab**: interactive factor-shock sliders + presets → per-holding & book P&L.
- **Holdings CSV export**.
- **Stress scenario library**: 16 named scenarios listed worst-first on Risk tab.
- **Realized historical scenarios**: 8 crises (GFC'08, COVID'20, Inflation'22, SVB'23,
  Q4'18, China'15-16, Taper'13, Euro'11) use **realized factor-proxy returns** over the
  actual window (`src/data/scenarioHistory.json`, recompute: `npm run refresh-scenarios`);
  tagged REALIZED vs MODEL in the UI.
- **Macro tab**: FRED indicators (10Y/2Y yields, 10Y–2Y curve, CPI YoY, unemployment,
  VIX, Fed Funds, USD index) via keyless `npm run refresh-macro`; heuristic
  **factor tilts** + illustrative **nowcast P&L**; live **Open-Meteo weather** panel
  (in-browser, keyless).
- **Copilot tool-calling**: Ollama function-calling loop (`askOllamaTools`) with 9 tools
  querying the live engine (list_holdings, get_holding, get_risk, get_performance,
  top_risk_contributors, get_scenario, stress_test, price_move, get_macro); answers cite
  which tools were used; falls back to streaming → built-in local assistant.
- GitHub Pages deploy debugging (private-repo root cause identified; workflow hardened).

---

## 4. Repository map

```
src/
  engine/        All math (pure, tested): risk.ts, covariance.ts, factors.ts,
                 backtest.ts (VaR tests), strategyBacktest.ts (walk-forward),
                 optimize.ts, forecast.ts, scenarios.ts, stress.ts, macro.ts,
                 performance.ts, compliance.ts, allocation.ts, stats.ts, index.ts
  data/          universe.ts (18 instruments, BENCHMARK_ID='SPY', FACTORS),
                 generatePortfolio.ts (sim), realData.ts + marketData.json (real prices),
                 scenarioHistory.json (realized crisis shocks), macro.ts + macroData.json,
                 news.ts (GDELT/Finnhub), market.ts (mode switch)
  assistant/     ollama.ts (client: models/stream/JSON/tool-loop, system prompt+snapshot),
                 tools.ts (tool specs + executor), impact.ts (news→impact),
                 respond.ts (deterministic fallback), verify.ts (figure verifier),
                 knowledge.ts
  views/         13 tab views (one file per tab)
  components/    charts/ (LineChart, BarChart, Sparkline, BandChart, Heatmap,
                 ScatterChart — all hand-rolled SVG), Copilot.tsx, DataTable, KpiTile,
                 Panel, Header, TabNav, StatusBar, DataGate, Delta
  state/         PortfolioContext.tsx (seed, mode sim|real, covMethod, analytics)
  lib/           format.ts (monochrome ▲/▼ formatting), random.ts, exportCsv.ts
scripts/         fetch-data.mjs, fetch-scenarios.mjs, fetch-macro.mjs,
                 inline-singlefile.mjs, ship.mjs
tests/           19 suites / 96 tests (engine, covariance, factors, scenarios, stress,
                 macro, tools, optimize, backtests, forecast, news, impact, ollama,
                 verify, export, data, assistant, smoke SSR render of every view)
docs/            PRODUCT_BRIEF.md, ARCHITECTURE.md (ADRs+methodology), ALADDIN.md,
                 BENCHMARKS.md
.github/workflows/  ci.yml (lint/type/test/build), deploy.yml (Pages)
```

**Key conventions:**
- Factor sign conventions: `rates` positive = bond-friendly (yields DOWN); `credit`
  positive = spreads tighten; `fx` positive = USD weaker. Documented in
  `src/engine/scenarios.ts` and instrument betas in `universe.ts`.
- `DataMode = 'sim' | 'real'`; analytics built via `buildAnalytics(seed, mode, covMethod)`.
- All formatting through `src/lib/format.ts` (never raw colors; monochrome only).
- Tests must stay data-agnostic (pass whether marketData.json is placeholder or real).

---

## 5. Commands & data pipelines

```bash
npm run dev                # dev server (localhost:5173)
npm test                   # 96 tests
npm run typecheck && npm run lint
npm run build              # production build (typecheck + vite)
npm run build:single       # + self-contained dist/aladdin-replica-standalone.html

# Data refresh (all server-side Node, run on the user's machine):
TWELVE_DATA_KEY=xxx npm run refresh-data   # real EOD prices (keyless fallback: Yahoo/Stooq)
npm run refresh-scenarios                  # realized crisis factor shocks (keyless)
npm run refresh-macro                      # FRED macro + weather snapshot (keyless)

# Publish (appends CHANGELOG entry, commits all, pushes):
npm run ship -- "what changed"
```

**External services:** Twelve Data (BYO key, prices) · GDELT (keyless news) ·
Finnhub (optional BYO key, stored in localStorage) · FRED fredgraph CSV (keyless macro,
server-side only — not CORS) · Open-Meteo (keyless weather, CORS-friendly, live in
browser) · **Ollama** at `http://localhost:11434` — start with
`OLLAMA_ORIGINS=* ollama serve` (or the specific origin, e.g. the GitHub Pages URL).
Preferred model order: llama3.2 → llama3.1 → llama3 → qwen2.5 → mistral… (`pickModel`).

---

## 6. Verification workflow (the quality bar used throughout)

Every feature was shipped through this loop — keep doing it:

1. Implement in `src/` + add/extend a test suite in `tests/`.
2. `npm run typecheck && npm run lint && npm test` — all green.
3. `npm run build:single` — build must succeed.
4. **Live-verify in Chrome** on `localhost:5173` (click through the actual tab,
   confirm real numbers render, no NaN, interactions work).
5. Update `CHANGELOG.md` (or let `npm run ship` do it) + README if tabs/scripts changed.
6. `npm run ship -- "message"` to push.

---

## 7. Scope status

**v1.0 is feature complete.** The authoritative statement of what is in, what is
out, and why lives in **[SCOPE.md](SCOPE.md)** — read it before adding anything.

**The repository is private and stays private.** Public deployment was
considered and dropped — it is not a goal. The deliverable is
`npm run build:single` → a ~340 KB self-contained HTML file that opens offline by
double-click. See `SCOPE.md` §6. `deploy.yml` is retained and correct but
inactive; `ci.yml` is the workflow that runs.

**Transaction costs shipped** — reclassified from excluded to required, because a
frictionless backtest is a wrong number rather than a missing feature. See
`SCOPE.md` §5.

Everything else once tracked here — News-adjusted forecast, weather→commodity
tilt, Copilot RAG, tearsheet export, portfolio import, Fama–French, HRP/CDaR,
fixed-income duration, bootstrap Monte Carlo, hosted-LLM fallback — is
**deliberately excluded from v1.0**, with the reasoning recorded in `SCOPE.md`
§5. They are not unfinished work. Reopening one means editing SCOPE.md first and
justifying it against the four principles in §2.

---

## 8. Known constraints & gotchas (read before resuming)

- **GitHub Pages needs the repo public** on the free plan — root cause of all
  historical deploy failures. CI itself passes.
- **FRED & Twelve Data are not CORS-enabled** → must be fetched by Node scripts and
  baked to JSON (never fetch them from the browser). GDELT & Open-Meteo ARE
  CORS-friendly → fetched live in-browser.
- **Ollama CORS**: browser calls require `OLLAMA_ORIGINS` to include the page origin.
- **Yahoo rate-limits (429) and Stooq bot-blocks** intermittently — Twelve Data key is
  the reliable path; keyless is best-effort.
- `vite.config.ts` uses `base: './'` so the build works from any sub-path (Pages).
- Vite writes `vite.config.ts.timestamp-*.mjs` files — already gitignored; don't commit.
- Tests must not assume real data is loaded — **and must not assume it isn't.**
  `marketData.json`, `macroData.json` and `scenarioHistory.json` ship empty and get
  filled by the refresh scripts before a deploy, so a test asserting
  `hasMacroData() === false` breaks the moment the data lands. Assert the
  *invariant* instead (the gate agrees with the data), not the current state.
  See `hasRealData()` / `hasMacroData()` and the tests around them.
- The Copilot verifier (`verify.ts`) flags $-figures not in the snapshot — keep the
  snapshot (`snapshotText`) updated when adding metrics, or answers get flagged.
- If developing inside a sandboxed/mounted environment where git/npm fail on the mount:
  rsync the repo to a native folder (e.g. `/tmp`), build/test there, copy artifacts back.

---

## 9. How to resume on a fresh account (checklist)

1. `git clone https://github.com/Garviksh/aladdin-replica && cd aladdin-replica && npm install`
2. Read `SCOPE.md` (what v1.0 is and is not), then this file, then skim
   `CHANGELOG.md` (what shipped last).
3. `npm test` — expect 96 passing. `npm run dev` — expect the data gate or DATA: LIVE.
4. Refresh data if stale: `TWELVE_DATA_KEY=… npm run refresh-data`, then
   `npm run refresh-scenarios` and `npm run refresh-macro`.
5. For the Copilot: install Ollama, `ollama pull llama3.2`, `OLLAMA_ORIGINS=* ollama serve`.
6. Check `SCOPE.md` before building anything, follow the verification workflow in §6, and ship with
   `npm run ship -- "message"` — it updates the changelog automatically.
7. **Update this file** (§2 snapshot, §3 history, §7 backlog) whenever a major feature
   lands, so the next session can resume just as cleanly.
