# The real Aladdin — reference & how we optimize around it

Context for this project: what BlackRock's **Aladdin** actually is, how it works,
which parts we replicate, and how a small, open, local-first tool like ours can
add value by targeting real user pain points and global factors.

> Figures below (assets on platform, launch dates) are approximate and change
> over time — treat them as directional and verify current numbers from
> BlackRock before quoting.

---

## What Aladdin is

**Aladdin** — *Asset, Liability, and Debt and Derivative Investment Network* — is
BlackRock's end-to-end **operating system for investment management**. BlackRock
runs its own book on it and licenses it to external institutions (asset managers,
insurers, pension funds, banks, corporates). It is widely reported to support the
management/administration of **tens of trillions of dollars** of assets across
its client base.

Its defining idea is a **single, unified data model — one source of truth** — so
that portfolio managers (front office), risk and compliance (middle office), and
operations/settlement (back office) all work from the same positions, prices, and
analytics rather than reconciling separate systems.

## Core capabilities (what it has)

- **Portfolio management & modelling** — unified positions across asset classes;
  what-if modelling; cash and exposure management.
- **Risk analytics** — factor-based risk models, Monte Carlo simulation, VaR,
  scenario analysis and historical **stress testing** across the whole book. This
  is Aladdin's heritage and core strength.
- **Trading (OMS/EMS)** — order and execution management, connectivity to venues,
  pre-/post-trade workflows.
- **Operations & post-trade** — settlement, reconciliation, accounting,
  collateral — the unglamorous plumbing that makes the single data model work.
- **Compliance** — automated mandate and regulatory rule checks with alerts.
- **Performance & attribution** — returns, benchmark-relative analysis, attribution.
- **Aladdin Studio** — developer tooling and **APIs** so clients customize the
  platform, build bespoke dashboards, and automate workflows (plus data
  partnerships, e.g. Snowflake; cloud on Microsoft Azure).
- **Aladdin Wealth** — risk/portfolio tooling adapted for wealth managers and advisors.
- **eFront** — private markets / alternatives (acquired by BlackRock in 2019).
- **Aladdin Climate** — climate and transition risk analytics.
- **Aladdin Copilot** — a generative-AI assistant layered across the platform
  (introduced more recently) to surface answers and speed workflows.

## How it works (mental model)

1. Ingest everything into **one data model** (holdings, prices, terms, reference data).
2. Run a **common risk language** over it — the same factor model and analytics
   apply from a single bond to a whole multi-asset book.
3. Give every desk a **whole-portfolio view** so decisions, risk, trading, and
   compliance stay consistent.
4. Expose it through **APIs (Studio)** so institutions extend it to their needs.

---

## What this project replicates

| Aladdin capability | This replica |
| --- | --- |
| Unified positions / whole-book view | **Dashboard**, **Holdings** |
| Factor risk, VaR, component risk, stress | **Risk** (real, data-driven betas) |
| Performance & attribution | **Performance** |
| Scenario / forward analytics | **Forecast** (Monte Carlo) |
| Compliance rules | **Compliance** |
| Exposure breakdowns | **Allocation** |
| GenAI assistant (Copilot) | **Copilot** (local Ollama, dashboard-aware) |
| — (news/alt-data) | **News** + **Impact** (news → P&L, our addition) |

What we deliberately **don't** do: trading/execution, settlement/accounting,
multi-user enterprise infrastructure, and regulated data feeds — the parts that
make Aladdin an institutional platform rather than an educational cockpit.

---

## Optimizing on a larger scale — user pain points & global factors

Where a small, open, **local-first** tool can genuinely differentiate, mapped to
real pain points we hear across the globe:

- **Cost & access.** Institutional platforms are expensive and gated. *Our angle:*
  free, open-source, runs on a laptop; real data via a free key; a **local LLM
  (Ollama)** so there's no per-seat AI cost.
- **Data privacy & sovereignty.** Many teams can't send holdings to third-party
  clouds/LLMs (regulation, IP). *Our angle:* the Copilot and impact model run
  **entirely on-device**; portfolio data never leaves the machine.
- **Fragmented & poor-quality data.** The hardest real problem. *Our angle:* a
  single typed data model + a one-command real-data loader; roadmap: broker/CSV
  import and scheduled refresh.
- **Explainability / AI trust.** Black-box predictions don't get used. *Our angle:*
  every number is computed transparently and unit-tested; the Copilot is grounded
  in the live snapshot and cites the figures; impact estimates show the events
  and betas behind them.
- **Real-world / alternative data.** Markets move on news, weather, energy, and
  macro — not just prices. *Our angle (roadmap):* News→Impact (built), plus
  weather (Open-Meteo), macro (FRED), and geopolitical event risk feeding the
  factor model.
- **Global / local relevance.** Regions differ in instruments, currencies, and
  regulation. *Our angle (roadmap):* configurable universes, multi-currency, and
  locale-aware compliance rule packs.
- **Latency & freshness.** *Our angle (roadmap):* scheduled auto-refresh and
  in-browser live prices so every session is current.
- **Retail ↔ institutional gap.** Institutional-grade risk thinking is largely
  inaccessible to smaller investors. *Our angle:* package VaR, factor exposure,
  stress testing, and forecasting in an approachable, explainable UI with a Guide
  and an AI that teaches while it answers.

The through-line: **transparent, private, explainable, and cheap** — do a focused
slice of Aladdin's analytics well, on real data, with modern local AI, and keep
it honest about what it is.

---

*Independent educational project. Not affiliated with or endorsed by BlackRock.
"Aladdin" is a trademark of BlackRock, Inc.*
