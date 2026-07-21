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
