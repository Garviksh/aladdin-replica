# Benchmarks — how we compare, and how accurate we are

An honest assessment of ALADDIN·Replica against comparable open-source and
commercial tools, with an accuracy scorecard and a prioritized plan to close the
gaps. What is in and out of v1.0 is settled in [`SCOPE.md`](../SCOPE.md).

> Method note: this analysis is from domain knowledge (through mid-2025); live
> web lookups were unavailable in the build environment. Verify current
> features / versions of the projects below before quoting.

---

## Comparable projects

| Project | Lang | What it is | Relative to us |
| --- | --- | --- | --- |
| **OpenBB** | Python | Open-source investment research terminal / platform | Far bigger data breadth; not a risk *cockpit*; no local-LLM copilot |
| **QuantLib** | C++ | Industrial pricing/risk library, literature-validated | Vastly deeper & more accurate math; a library, not an app |
| **Riskfolio-Lib / PyPortfolioOpt** | Python | Portfolio optimization + risk (shrinkage, CVaR, HRP) | More rigorous risk math & optimization |
| **pyfolio / empyrical / quantstats** | Python | Performance/risk tearsheets | Similar analytics depth; no UI/LLM |
| **Ghostfolio** | TypeScript | Open-source portfolio tracker + web UI | Closest in stack; lighter on factor risk/VaR/stress; no local LLM |
| **Portfolio Visualizer** | Closed web | Factor regressions, Monte Carlo, backtests | More statistically complete; proprietary |

---

## Accuracy scorecard (our engine)

| Area | What we do | Rigor | Fix to reach best-practice |
| --- | --- | --- | --- |
| Volatility | sample covariance, ×√252 | OK (n≫k) | Ledoit–Wolf shrinkage / EWMA |
| VaR | parametric (normal) + historical | Fair | Student-t / Cornish–Fisher / bootstrap; **backtest** it |
| Tail risk | none beyond VaR | Missing | Add **CVaR / Expected Shortfall** |
| Component risk | Euler decomposition, sums to total | **Strong** | — (correct) |
| Factor betas | **univariate** regressions | Weak (double-counts) | **Multivariate OLS** + Fama–French factors |
| Beta vs benchmark | OLS cov/var | Strong | rolling beta |
| Forecast | Monte Carlo, normal i.i.d. daily | Fair | fat tails, vol-clustering (GARCH/bootstrap) |
| Attribution | weight × compounded return | Fair | Brinson attribution (allocation vs selection) |
| Perf stats | return, Sharpe, maxDD | Partial | Sortino, Calmar, IR, tracking error, up/down capture |
| News→Impact | LLM tag × beta | Heuristic | calibrate & backtest; structured LLM output |
| Optimization | none | Missing | efficient frontier / HRP / risk parity |
| Backtesting | none | Missing | walk-forward backtest + VaR coverage tests |

**Grade: A– as an educational / explainable tool and portfolio piece; ~C+ as an
institutional-accuracy risk system.** The gap is well-understood and closable.

---

## Where we already win

- **Local, private AI** — Ollama copilot grounded in the live dashboard + a
  **News→Impact** model. Not something the comparable open-source apps ship.
- **Explainable & tested** — transparent formulas, **50 unit tests**, a correct
  component-risk decomposition that sums to total risk.
- **Self-contained** — real data + real news, single-file build, runs offline;
  no Python toolchain, no cloud.

## Where we're behind

- Simpler covariance (no shrinkage/EWMA), normal-tail VaR/Monte Carlo, univariate
  factor betas, no optimizer, no backtesting, small EOD-only universe. These are
  exactly what QuantLib / Riskfolio / Portfolio Visualizer do better.

---

## Prioritized plan (accuracy first)

1. **Multivariate factor betas + Fama–French** — removes the biggest correctness
   gap (double-counting); makes exposures, stress, and News→Impact more real.
2. **Ledoit–Wolf / EWMA covariance** — steadier volatility, VaR, and risk
   contributions.
3. **Student-t / historical-bootstrap VaR + CVaR** — honest tails.
4. **VaR backtest (Kupiec/Christoffersen)** — *proves* the risk numbers.
5. **Richer performance stats + rolling charts** (empyrical-style).
6. **Optimizer (efficient frontier / HRP)** and **backtesting**.
7. **Ollama upgrades** — tool-calling, structured JSON output, larger context,
   anti-hallucination verifier.

Items 1–7 shipped in v1.0. Anything still listed as a gap above is excluded on
purpose — see `SCOPE.md` §5 for which, and why.

Each step is independently shippable and unit-testable, keeping the "every number
is verified" property intact.
