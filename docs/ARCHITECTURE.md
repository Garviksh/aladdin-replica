# Architecture — ALADDIN·Replica

This document records the significant architectural decisions for the project as
a set of ADRs, followed by a system-design overview and the risk methodology.

---

## System overview

The application is a **single-page app with no backend**. It is a pure
client-side pipeline:

```
 seed ─► synthetic market generator ─► instruments + daily returns
                                            │
                                            ▼
              portfolio (holdings, quantities) ─► valuation
                                            │
                                            ▼
        ┌───────────────── risk engine (pure functions) ─────────────────┐
        │ stats ─► covariance ─► portfolio vol / VaR / beta / factor      │
        │ exposures ─► component risk │ performance & attribution │       │
        │ compliance rule evaluation                                      │
        └────────────────────────────────────────────────────────────────┘
                                            │
                                            ▼
        React context (analytics snapshot) ─► views (6) ─► B&W UI
```

Data flows one way. The engine is a set of **pure functions** over plain data,
which keeps it framework-independent and unit-testable. React is only the
presentation layer; it holds the seed in state and derives everything else with
`useMemo`.

### Module layout

```
src/
  types/domain.ts        Domain model (Instrument, Position, Analytics, ...)
  lib/random.ts          Seeded PRNG (mulberry32) + gaussian
  lib/format.ts          Monochrome number/%/currency formatting helpers
  data/universe.ts       Static instrument universe + factor definitions
  data/generatePortfolio.ts  Deterministic market + holdings generator
  engine/stats.ts        mean, variance, covariance, correlation
  engine/risk.ts         vol, VaR, beta, factor exposure, component risk, stress
  engine/performance.ts  returns, cumulative series, attribution
  engine/compliance.ts   mandate rule evaluation
  engine/forecast.ts     Monte Carlo projection + per-asset targets
  engine/index.ts        buildAnalytics(): composes a full snapshot
  assistant/             local Copilot: knowledge base + intent engine (respond)
  state/PortfolioContext.tsx  provider exposing { seed, portfolio, analytics }
  components/            Header, TabNav, StatusBar, Panel, KpiTile, DataTable,
                         Delta, Copilot, charts/{Line,Bar,Sparkline,Band}
  views/                 Dashboard, Holdings, Risk, Performance, Forecast,
                         Allocation, Compliance, Guide
  styles/theme.css       Late-2000s monochrome enterprise theme
tests/                   engine, forecast, assistant, and render-smoke tests
scripts/inline-singlefile.mjs  single-file build helper
```

---

## ADR-001: Client-side SPA with an in-browser analytics engine (no backend)

**Status:** Accepted · **Date:** 2026-07-21

### Context
A "small-scale" educational replica must be trivial to run, host, and inspect. A
server would add deployment surface, latency, and hosting cost for no functional
gain, since all analytics operate on a self-contained synthetic dataset.

### Decision
Ship a fully static SPA. All computation happens in the browser. Host on GitHub
Pages / any static host.

### Options considered

| Option | Complexity | Cost | Hosting | Fit |
|--------|-----------|------|---------|-----|
| A. Static SPA (chosen) | Low | Free | Any static host | Ideal for a demo |
| B. SPA + Node/Python API | Med | Server | Needs runtime | Overkill; no live data |
| C. Notebook / script | Low | Free | None | No terminal UX |

**Pros:** zero infra, instant load, inspectable, deployable from CI.
**Cons:** no server-side secrets or live feeds — acceptable given non-goals.

### Consequences
Easier: deploy, share, test (pure functions). Harder: any future live-data
feature would require introducing a data layer we deliberately deferred.

---

## ADR-002: Deterministic synthetic market via a factor model (not live data)

**Status:** Accepted · **Date:** 2026-07-21

### Context
The replica needs a realistic covariance structure across ~18 instruments so that
diversification, factor exposures, and risk decomposition are meaningful. Real
feeds are out of scope (ADR-001) and non-deterministic data would make the engine
untestable.

### Decision
Generate daily returns from a **linear factor model** —
`r_i = Σ_k β_ik · f_k + ε_i` — driven by a seeded PRNG. Shared factors
(Equity, Rates, Credit, Commodity, FX) produce genuine correlations; the seed
makes every run reproducible and every test deterministic.

### Options considered
**A. Seeded factor model (chosen)** — realistic correlations, reproducible,
testable. **B. Independent random walks** — no correlation structure, so risk
decomposition would be meaningless. **C. Bundled historical CSV** — realistic but
static, larger repo, licensing questions.

### Consequences
Easier: reproducibility, testable invariants, tunable regimes via factor vols.
Harder: numbers are illustrative, not real — mitigated by clear disclaimers.

---

## ADR-003: Hand-rolled SVG charts instead of a charting library

**Status:** Accepted · **Date:** 2026-07-21

### Context
The design language is strict black-and-white with thin rules and monospace
labels. Charting libraries (Recharts, Chart.js) ship opinionated colour, spacing,
and tooltip styling that must be fought to reach a period-correct monochrome look,
and they add bundle weight.

### Decision
Implement small, purpose-built SVG chart components (line, bar, sparkline). They
are a few dozen lines each, fully themeable via CSS `currentColor`, and add no
dependencies.

### Consequences
Easier: exact visual control, tiny bundle, no dep upgrades. Harder: no free
interactivity (zoom/animation) — not needed for this scope.

---

## ADR-004: Local state + React Context, no external state manager

**Status:** Accepted · **Date:** 2026-07-21

### Context
The only mutable input is the market **seed**; everything else is derived. The
app does not need cross-cutting mutable stores, async caches, or middleware.

### Decision
Hold the seed in a top-level `useState`, derive the portfolio and full analytics
snapshot with `useMemo`, and pass them through a single `PortfolioContext`. No
Redux / Zustand.

### Options considered
**A. Context + useMemo (chosen)** — zero deps, matches the one-way data flow.
**B. Zustand** — nice ergonomics but unjustified for one input. **C. Redux
Toolkit** — heavy boilerplate for a read-only derived UI.

### Consequences
Easier: minimal code, obvious data flow, cheap recompute on reseed. Harder: if
the app later gained many independent mutable inputs, a store might be revisited.

---

## ADR-005: Local, deterministic Copilot (privacy by construction)

**Status:** Accepted · **Date:** 2026-07-21

### Context
The product calls for an on-screen AI assistant that can answer questions about
the portfolio, with an explicit requirement that **no personal or dashboard data
leaks**. Portfolio holdings are sensitive; sending them to a hosted LLM would
violate that requirement.

### Decision
Ship a **local, deterministic intent engine** (`src/assistant/`) that reads the
in-memory analytics snapshot and answers on-device. It makes **zero network
calls** — there is no fetch/XHR/websocket anywhere in the assistant path — so
data cannot leave the browser. The engine parses intent (value, risk, VaR,
performance, allocation, compliance, forecast, holdings, what-if shocks, concept
explanations) and computes answers from the same functions the UI uses.

### Options considered
**A. Local intent engine (chosen)** — instant, offline, zero-leak, testable,
no key or cost. **B. Hosted LLM (OpenAI/Anthropic/etc.)** — most flexible
language, but would transmit holdings off-device (rejected on privacy). **C.
In-browser LLM (WebLLM/WebGPU)** — real model, still zero-leak, but multi-GB
download and WebGPU dependency — disproportionate for this scope.

### Consequences
Easier: a hard privacy guarantee, unit-tested responses, no runtime dependency.
Harder: phrasing is pattern-based rather than free-form generation. The
`respond()` interface is intentionally small so option B or C could be attached
later behind an explicit, clearly-labelled opt-in.

---

## Forecast methodology (Monte Carlo)

The Forecast tab estimates the invested book’s daily mean `μ` and volatility `σ`
from the simulated return history, then runs `N` seeded random paths
`Vₜ₊₁ = Vₜ · (1 + μ + σ·Z)` over the chosen horizon. The percentile envelope of
the paths becomes the fan chart (P5/P25/P50/P75/P95); summary stats are expected
value, probability of ending below today, and the loss to the 5th percentile
(horizon VaR). Per-asset targets annualize each instrument’s own mean/vol and
report an expected price, a ±1σ range, and P(up) via the normal CDF. It is
seeded, so the forecast is reproducible and unit-tested.

---

## Risk methodology (what the engine computes)

**Valuation.** Position market value = quantity × latest price; portfolio value =
Σ positions (+ cash). Weight `wᵢ` = position value / portfolio value.

**Covariance.** From the simulated daily-return matrix we compute the sample
covariance `Σ` and annualise (×252).

**Ex-ante volatility.** Portfolio variance = `wᵀ Σ w`; volatility = √variance.

**Value-at-Risk.** Parametric 1-day VaR = `z_α · σ_daily · V`, where
`σ_daily = σ_annual / √252` and `z_{95%}=1.645`, `z_{99%}=2.326`. Historical VaR =
the α-percentile of the simulated portfolio daily P&L distribution. Both are
reported as a positive potential loss.

**Beta.** Portfolio beta to the benchmark = `cov(r_p, r_b) / var(r_b)`.

**Factor exposure.** Portfolio loading to factor `k` = `Σᵢ wᵢ · β_ik`.

**Component risk.** Marginal contribution to risk `MCRᵢ = (Σ w)ᵢ / σ_p`;
component contribution `CCRᵢ = wᵢ · MCRᵢ`. By construction `Σᵢ CCRᵢ = σ_p`, which
is asserted in the tests.

**Stress tests.** Each scenario is a vector of factor shocks; instrument return
under the scenario = `Σ_k β_ik · shock_k`; portfolio scenario P&L =
`Σᵢ wᵢ · returnᵢ · V`.

**Attribution.** Period contribution of a group (sector / asset class) =
Σ of member `wᵢ · rᵢ` over the window.

**Compliance.** Declarative rules (max position weight, max sector concentration,
max asset-class weight, VaR limit, cash floor / no-leverage, min diversification)
each return `pass` / `warn` / `breach` with the observed vs. limit value.
