# Roadmap

Where ALADDIN·Replica is going. Organised as **Highlights → Now → Next → Later**.
Checkboxes are actionable; contributions welcome.

---

## ⭐ Highlights (the big bets)

### 1. News → Impact Prediction (powered by Ollama)
Turn the live news we already fetch into a quantified market impact.

- [ ] For each holding and the market, feed live GDELT headlines to the local
      Ollama model and classify each event → `{ factor, direction, magnitude, confidence }`.
- [ ] Map events to **factor shocks**, then to portfolio P&L via the existing
      stress-scenario engine (using real betas — see #3).
- [ ] Show an **Impact** tab: expected P&L range per position and for the book,
      with the model's rationale. Clearly flagged as a model estimate, not advice.
- [ ] Blend the impact estimate into a **news-adjusted forecast** on the Forecast tab.

### 2. Real-world / alternative-data factors
Extend the factor model beyond Equity / Rates / Credit / Commodity / FX to drivers
that actually move markets:

- [ ] **Weather & climate** — energy demand, agriculture, insurance, commodity
      supply shocks (free source: Open-Meteo, no key).
- [ ] **Energy & commodity spot prices** — oil, gas, metals.
- [ ] **Macro releases** — CPI, jobs, central-bank decisions (free source: FRED).
- [ ] **Geopolitical / event risk** flags derived from news via Ollama.
- [ ] Let the Copilot reason over these factors when predicting and guiding.

### 3. Real, data-driven factor betas
- [ ] Regress each holding's real returns on real factor-proxy ETFs
      (SPY, IEF, HYG, GLD, UUP) so factor exposures **and** stress/impact numbers
      are fully data-driven (today they are model priors — see ADR-005).

---

## 🧭 Competitive improvements (borrowed from comparable tools)

Techniques worth adopting, grouped by the project we'd learn them from. Full
comparison in [`docs/BENCHMARKS.md`](docs/BENCHMARKS.md).

### From Riskfolio-Lib / PyPortfolioOpt — risk math & optimization
- [ ] **Ledoit–Wolf shrinkage** covariance + **EWMA (RiskMetrics)** option → more stable risk numbers than plain sample covariance
- [ ] **CVaR / Expected Shortfall** (and CDaR) alongside VaR → coherent tail risk
- [ ] **Efficient-frontier / mean-variance optimizer** and **Hierarchical Risk Parity (HRP)** → suggested weights
- [ ] **Risk-parity / risk-budgeting** target weights

### From Portfolio Visualizer — factor models & validation
- [ ] **Multivariate factor regression** (replace our univariate betas) + **Fama–French factors** (Mkt-RF, SMB, HML, RMW, CMA, momentum) → real multi-factor exposures + alpha
- [ ] **Rolling factor exposures / rolling beta**
- [ ] **Backtesting** with rebalancing, and a **VaR backtest** (Kupiec / Christoffersen coverage) to *prove* accuracy

### From pyfolio / empyrical / quantstats — performance analytics
- [ ] Add **Sortino, Calmar, Omega, tail ratio, downside deviation, information ratio, tracking error, up/down capture**
- [ ] **Rolling Sharpe / vol / beta** charts and a **top-N drawdowns** table with durations
- [ ] One-page **tearsheet** export (PDF)

### From QuantLib — rigor
- [ ] **Cornish–Fisher / Student-t VaR** and **historical-bootstrap** Monte Carlo (fat tails) → more accurate tails than the normal assumption
- [ ] Fixed-income **duration / convexity**; later option **greeks**

### From Ghostfolio — product / UX (same TS stack)
- [ ] **CSV / broker portfolio import**, transactions, **cost basis & realized P&L**, dividends
- [ ] Multiple books / accounts, persistence, watchlists

### From OpenBB — data breadth
- [ ] **Pluggable data-provider layer** with fallback (formalize our Twelve Data → Yahoo → Stooq into one provider interface)
- [ ] **Macro / economy data** (FRED) and multi-provider news

## 🤖 Ollama Copilot upgrades
- [ ] **Tool / function calling** — let the model invoke engine functions (run a what-if, pull a metric, run a scenario) instead of only reading a static snapshot
- [ ] **RAG over holdings & news** via Ollama embeddings (`nomic-embed-text`) so it scales past the context window
- [ ] **Structured JSON output** (`format: "json"`) for the Impact model → guaranteed-parseable events (no brittle text parsing)
- [ ] **Configurable context length** (`options.num_ctx`) + **model picker** with recommended models, remembered in `localStorage`
- [ ] **Multi-turn memory** within a session; **AbortController** cancel + timeout; **fallback model chain**
- [ ] **Anti-hallucination verifier** — flag any figure not present in the live snapshot; cite the headline/metric behind each claim
- [ ] Per-section **"Explain this number"** deep-links that feed the exact metric to the model
- [ ] Task-specific prompt templates (analyze / predict / explain / teach)

## Now (in progress / next up)
- [ ] News-impact scoring with Ollama (per-ticker sentiment + magnitude).
- [ ] Regression-based real factor betas.
- [ ] Copilot "explain this number" deep-links from any KPI/table cell.

## Next
- [ ] **Live in-browser prices** (bring-your-own key) so the hosted site refreshes
      without the Node step.
- [ ] Weather + macro factor ingestion (Open-Meteo, FRED).
- [ ] Correlation heatmap; efficient-frontier optimizer.
- [ ] Alerts: VaR-limit and compliance-breach notifications.
- [ ] Auto-refresh data on a schedule (`predev` / cron) so every run is fresh.

## Later
- [ ] Backtesting engine (walk-forward, drawdown attribution).
- [ ] Fixed-income sub-module (duration, convexity, curve).
- [ ] CSV / broker portfolio import; multiple books.
- [ ] PDF risk-report export.
- [ ] Options greeks / derivatives pricing.

---

## Impact-prediction model — design sketch

```
live headlines (GDELT) ─┐
factor moves (real) ────┼─► Ollama: classify → {factor, direction, magnitude, confidence}
weather / macro ────────┘            │
                                     ▼
                     event → factor shocks → P&L via real betas
                                     │
                                     ▼
                 Impact tab: per-holding & book expected impact (+ rationale)
                 Forecast tab: news-adjusted Monte Carlo
```

Everything stays local: news is a public query; the LLM is Ollama on your machine;
no personal or portfolio data leaves the device. All outputs are **model estimates,
not investment advice**.
