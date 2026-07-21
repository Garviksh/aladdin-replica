# Product Brief — ALADDIN·Replica

> Output of the product-brainstorming pass. This is the "what and why" that the
> architecture (see `ARCHITECTURE.md`) and the code implement.

**Status:** Accepted · **Date:** 2026-07-21 · **Owner:** KAIZEN

---

## 1. One-line summary

A small-scale, self-contained **portfolio & risk-management terminal** that
replicates the core analyst workflow of BlackRock's *Aladdin* platform, rendered
in a deliberately late-2000s black-and-white enterprise interface.

## 2. Problem & motivation

Aladdin (Asset, Liability, Debt and Derivative Investment Network) is the
institutional system portfolio managers use to hold a single, unified view of a
book of assets: what they own, what it is worth, how much risk it carries, how it
has performed, and whether it breaches mandate rules. The real platform is a
closed, enterprise product. There is no lightweight, open, inspectable version an
individual can run, read, and learn from.

This project rebuilds the *essential mental model* of that workflow — positions →
valuation → risk decomposition → performance attribution → compliance — as an
educational replica that runs entirely in the browser, with a transparent risk
engine you can read line by line.

**This is an independent educational project. It is not affiliated with,
endorsed by, or connected to BlackRock. "Aladdin" is a trademark of BlackRock,
Inc.; it is referenced here only to describe the workflow being emulated.**

## 3. Target users

The primary user is a **learner or builder** — a student of quantitative finance,
a developer wanting a realistic risk-analytics reference implementation, or an
analyst who wants a sandbox to reason about portfolio risk without a Bloomberg or
Aladdin seat. The secondary user is anyone evaluating this repo as a portfolio
piece: the code, tests, and docs are meant to read as production-grade.

## 4. Product principles

The interface is **dense, functional, and monochrome** on purpose. Real
institutional terminals prize information density and legibility over decoration;
the late-2000s black-and-white treatment (thin borders, beveled panels, monospace
numerals, zebra-striped tables, a status bar) is both an aesthetic choice and an
honest fit for the domain. Gains and losses are shown with ▲/▼ markers and
parenthesized negatives rather than color, so the screen stays true black-and-white
and remains readable to color-blind users.

The analytics are **real, not faked.** Every number on screen is computed from a
generated-but-plausible market dataset by a risk engine that implements a proper
factor model, covariance-based portfolio volatility, value-at-risk, risk
decomposition, and scenario stress tests. The data is deterministic (seeded) so
the app is reproducible and the engine is unit-testable.

## 5. Scope

### Core modules (in scope)

1. **Dashboard** — headline KPIs (market value, day P&L, ex-ante volatility,
   1-day VaR, active positions, worst compliance status) plus a portfolio value
   sparkline and top movers.
2. **Holdings** — the full position blotter: instrument, asset class, sector,
   quantity, price, market value, portfolio weight, day change, unrealized P&L.
   Sortable, dense, monospace.
3. **Risk** — ex-ante volatility, parametric and historical VaR (95% / 99%),
   portfolio beta, factor exposures, and a component-contribution-to-risk table
   that decomposes total risk down to each position.
4. **Performance** — cumulative return of the book vs. its benchmark, a P&L time
   series, and return attribution by sector and asset class.
5. **Allocation** — exposure breakdowns by asset class, sector, and region.
6. **Compliance** — a rule set (position limits, concentration limits, VaR limit,
   leverage/cash floor) evaluated live with pass / warning / breach flags.
7. **Forecast** — a seeded Monte Carlo projection of the book (percentile fan,
   expected value, probability of loss, horizon VaR) plus per-asset expected
   return / price targets across 1M–1Y horizons.
8. **Guide** — an in-app walkthrough covering how to manage a book and the
   meaning of every metric.

Across all tabs, a **Copilot** answers plain-English questions about the book. It
is deliberately **local and deterministic**: it reads the in-memory analytics and
makes zero network calls, so no personal or portfolio data ever leaves the
browser (see ADR-005 in `ARCHITECTURE.md`).

### Non-goals (explicitly out of scope)

Live or real market data feeds; order entry, trading, or execution; multi-user
accounts, authentication, or persistence to a server; fixed-income cash-flow
modelling beyond a simple rates factor; options greeks and full derivative
pricing. These are what make the real Aladdin an enterprise platform; a
"small-scale" replica deliberately stops at the analyst's read-only cockpit.

## 6. Key workflow the user follows

Open the terminal → scan the Dashboard for headline risk and P&L → drill into
Holdings to see what is driving value → open Risk to see where volatility is
concentrated and how bad a bad day looks (VaR) → check Performance to see whether
the book is being paid for its risk → confirm on Compliance that nothing has
breached mandate. Reseeding the market (header control) generates a new plausible
world so the same workflow can be re-run against different conditions.

## 7. Success criteria

The project succeeds if: the six modules render a coherent, internally-consistent
portfolio; the risk numbers are mathematically correct (component risks sum to
total risk, 99% VaR ≥ 95% VaR, weights sum to 100%, etc.) and covered by passing
unit tests; the UI reads unmistakably as a dense monochrome finance terminal; and
the repository is clean enough — README, license, CI, typed, tested — to stand as
a professional GitHub project.

## 8. Risks & mitigations

The main product risk is **misrepresentation** — implying affiliation with or the
capabilities of the real Aladdin. Mitigation: prominent disclaimers in the app
footer, README, and this brief, and a clearly-synthetic dataset. The main
technical risk is **wrong math looking plausible**; mitigation is a unit-tested
engine with invariant checks rather than hand-checked outputs.

## 9. Future extensions

Import a real portfolio via CSV; persist scenarios to local storage; add a
correlation heatmap and an efficient-frontier optimizer; add a fixed-income
sub-module with duration/convexity; export a PDF risk report.
