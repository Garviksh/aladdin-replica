# Scope — v1.0

The single authoritative statement of what ALADDIN·Replica is, what "done" means,
and what is deliberately excluded. If another document disagrees with this one,
this one wins.

Status: **v1.0 — feature complete.** Build history in
[CHANGELOG.md](CHANGELOG.md) · engineering handoff in
[PROJECT_HISTORY.md](PROJECT_HISTORY.md).

---

## 1. What this is

An educational, single-page **portfolio & risk-management terminal** that
reproduces the core analyst workflow of BlackRock's Aladdin in a deliberately
monochrome late-2000s enterprise UI.

Not affiliated with BlackRock. Not investment advice. Built to demonstrate that
institutional risk analytics can be implemented transparently, from first
principles, in ~7,700 lines of dependency-light TypeScript.

## 2. The four principles

These constrain every decision. A feature that violates one is out of scope,
regardless of how useful it is.

1. **Real data only.** No fabricated number is ever displayed as if it were real.
   Features gate behind a load-data prompt until real data is fetched. Sample
   data appears only behind an explicit, clearly-labelled preview.
2. **Privacy by default.** The Copilot runs on a local Ollama model. Portfolio
   data never leaves the machine. External fetches are keyless or
   bring-your-own-key.
3. **Transparent math.** Every metric is implemented from first principles in
   `src/engine/`. No black-box quant library. Each is unit tested and documented
   in `docs/ARCHITECTURE.md`.
4. **Monochrome discipline.** No colour anywhere. Gains and losses use ▲ / ▼ and
   accounting parentheses, so the interface stays colour-blind safe.

## 3. In scope — the v1.0 surface

Thirteen tabs, all shipped and functional:

| Tab | Delivers |
|---|---|
| Dashboard | NAV, day P&L, ex-ante vol, 1d 99% VaR, CVaR, beta, compliance status, portfolio vs benchmark, top movers, risk contributors |
| Holdings | Sortable position blotter + CSV export |
| Risk | Parametric / historical / Cornish–Fisher VaR, CVaR, Sample / EWMA / Ledoit–Wolf covariance, Kupiec + Christoffersen VaR backtest, component contribution-to-risk, correlation heatmap, 16 stress scenarios (8 realized from market history) |
| Performance | Cumulative vs benchmark, Sharpe / Sortino / Calmar / IR / tracking error, rolling 63d vol & beta, top drawdowns, attribution by sector and class |
| Backtest | Walk-forward, monthly-rebalanced Current / Equal / Min-Var / Risk-Parity, trailing-window estimation, no look-ahead |
| Compliance | Live mandate rules — position, concentration, allocation, VaR, cash, diversification — pass / warning / breach |
| Forecast | Seeded Monte Carlo fan chart, expected value, probability of loss, horizon VaR, per-asset targets at 1M / 3M / 6M / 1Y |
| News | Live headlines, keyless via GDELT, optional Finnhub key, timeout + retry |
| Impact | Ollama classifies headlines into factor events → per-holding and book P&L via data-driven betas |
| Scenario | Interactive factor-shock sliders + historical presets |
| Macro | FRED indicators → factor tilts + illustrative nowcast, live Open-Meteo weather panel |
| Allocation | Exposure breakdowns, min-variance / risk-parity / max-Sharpe optimizer, efficient frontier |
| Guide | Plain-English walkthrough of every metric |

**Engine.** Pure, tested TypeScript: multivariate OLS factor betas (ridge),
covariance (sample / EWMA λ=0.94 / Ledoit–Wolf), VaR and CVaR, skew and
kurtosis, component risk that sums exactly to portfolio volatility, performance
statistics, compliance rules, Monte Carlo forecast, scenario and stress engines,
optimizer, walk-forward backtester.

**Copilot.** Local Ollama with a nine-function tool-calling loop against the live
engine, a structured-JSON path for the Impact model, an anti-hallucination
verifier that flags currency figures absent from the grounding snapshot, and a
deterministic zero-network fallback when Ollama is not running.

**Data pipelines.** `refresh-data` (Twelve Data → Yahoo → Stooq),
`refresh-scenarios` (realized crisis shocks), `refresh-macro` (FRED + weather).

## 4. Definition of done

v1.0 is complete when all of the following hold. Each is verifiable by command.

- [x] Thirteen tabs render real computed numbers with no NaN
- [x] `npm run typecheck` clean
- [x] `npm run lint` clean
- [x] `npm test` — all suites pass
- [x] `npm run build` succeeds
- [x] `npm run build:single` produces a working standalone HTML file
- [x] CI green on GitHub Actions
- [x] Component risk sums exactly to portfolio volatility (asserted in tests)
- [x] Backtest uses trailing data only — no look-ahead (asserted in tests)
- [x] Tests pass whether or not real market data is present
- [x] Documentation is non-contradictory and single-sourced
- [ ] Deployed and publicly reachable — **deferred, see §6**

## 5. Explicitly out of scope

Named here so they stop reading as unfinished work. Each was considered and
declined for v1.0.

| Excluded | Why |
|---|---|
| Order management, execution, settlement | Aladdin's OMS is a different product. This is the analyst's read-only view. |
| Multi-user accounts, auth, server-side state | Contradicts principle 2. The app is a static bundle with no backend. |
| Hosted-LLM Copilot fallback | Contradicts principle 2. Would send portfolio data off-device. |
| Fama–French factor set, HRP optimizer, CDaR | The five-factor model and three optimizers already demonstrate the method. Additional estimators add surface, not insight. |
| Fixed-income duration / convexity, option greeks | Requires instrument-level terms the free data sources do not provide. Would violate principle 1. |
| Portfolio import, cost basis, multiple books | Portfolio construction is not the workflow being demonstrated. |
| Intraday or streaming prices | End-of-day is sufficient for every metric shown, and keyless sources are daily. |
| PDF tearsheet export | Browser print produces an acceptable artifact. Not worth a rendering dependency. |

## 6. The one deferred item

**Public deployment.** The GitHub Pages workflow
(`.github/workflows/deploy.yml`) is correct and CI passes. Pages requires a
public repository on the free plan; the repository is currently private, which
is the sole cause of every historical deploy failure.

To close it — two steps in the browser, no CLI needed:

1. **Make the repository public.**
   `Settings → General → Danger Zone → Change repository visibility → Public`.
2. **Run the deploy.**
   `Actions → Deploy to GitHub Pages → Run workflow` on `main`. The workflow's
   `actions/configure-pages@v5` step has `enablement: true`, so it turns Pages on
   itself — no separate Pages setup required.

Target: `https://garviksh.github.io/aladdin-replica/`. First deploy takes a
couple of minutes; the URL then appears under `Settings → Pages`.

Equivalent via the GitHub CLI, if `gh` is installed
(`winget install --id GitHub.cli`, then `gh auth login`):

```bash
gh repo edit Garviksh/aladdin-replica --visibility public --accept-visibility-change-consequences
gh workflow run deploy.yml
```

No code change is required either way.

## 7. Verifying a change

Every change ships through this loop:

```bash
npm run typecheck && npm run lint && npm test   # must be green
npm run build:single                            # must succeed
npm run dev                                     # click the affected tab, confirm real numbers
npm run ship -- "what changed"                  # logs to CHANGELOG, commits, pushes
```

## 8. Changing this scope

Adding to §3 means moving a line out of §5 and saying why the principle in §2
still holds. Scope grows deliberately or not at all.
