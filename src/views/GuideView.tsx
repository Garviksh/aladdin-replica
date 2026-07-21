import { Panel } from '../components/Panel'

interface Step {
  n: number
  title: string
  body: string
}

const WALKTHROUGH: Step[] = [
  {
    n: 1,
    title: 'Read the headline risk',
    body: 'Start on the Dashboard. Net Asset Value is what the book is worth. Day P&L is today’s move. Ex-ante Vol and 1-day 99% VaR tell you how bumpy the ride is and how bad a bad day could look. Beta shows how much you move with the market.',
  },
  {
    n: 2,
    title: 'See what you own',
    body: 'Open Holdings. Every position shows its weight (share of NAV), day change, and unrealized P&L. Sort by weight to see concentration, or by unrealized P&L to see winners and losers. A well-managed book rarely lets one name dominate.',
  },
  {
    n: 3,
    title: 'Find where the risk lives',
    body: 'On Risk, the Contribution-to-Risk table decomposes total volatility down to each position — a name can be a small weight but a large risk contributor. Factor Exposures show whether you are really making an equity, rates, credit, commodity, or FX bet. Stress scenarios show P&L in historical crises.',
  },
  {
    n: 4,
    title: 'Check you are paid for the risk',
    body: 'On Performance, compare the portfolio line to its benchmark. Sharpe measures return per unit of risk; max drawdown is the worst peak-to-trough fall. Attribution shows which sectors and asset classes drove the return.',
  },
  {
    n: 5,
    title: 'Look ahead',
    body: 'On Forecast, a Monte Carlo simulation projects a range of future outcomes. The fan shows the 5th–95th percentile band; the median line is the central case. Use the probability of loss and horizon VaR to size how much risk you can live with.',
  },
  {
    n: 6,
    title: 'Stay inside the mandate',
    body: 'On Compliance, position, concentration, allocation, VaR, cash, and diversification limits are checked live. A breach means you must trim or hedge; a warning means you are close. Fix breaches before adding new risk.',
  },
]

const CONCEPTS: { term: string; def: string }[] = [
  { term: 'Diversification', def: 'Spreading capital across assets that don’t all move together. Because their ups and downs partly cancel, portfolio volatility is lower than the average of the parts — the “diversification ratio” on the Risk tab quantifies this.' },
  { term: 'Rebalancing', def: 'Periodically trimming what has grown too large and topping up what has shrunk, to return to target weights. It enforces “sell high, buy low” and keeps concentration in check.' },
  { term: 'Risk budgeting', def: 'Deciding how much of your total risk each position or factor is allowed to consume — then managing to that, using the contribution-to-risk view, rather than only managing dollar weights.' },
  { term: 'Value-at-Risk (VaR)', def: 'A loss threshold for a given confidence and horizon. “1-day 99% VaR of $2.6M” means: on ~99 of 100 days the loss should be smaller than $2.6M. It does not cap the worst case.' },
  { term: 'Beta', def: 'Sensitivity to the benchmark. Beta 0.7 means the book tends to move ~0.7% when the market moves 1%. Lower beta = more defensive.' },
  { term: 'Factor exposure', def: 'Your net bet on a systematic driver (equity, rates, credit, commodity, FX). Two very different-looking portfolios can carry the same underlying factor bet.' },
]

export function GuideView() {
  return (
    <div className="view">
      <Panel title="What this terminal is" hint="60-second orientation">
        <p className="guide-p">
          This is a portfolio &amp; risk cockpit modelled on the workflow of an institutional
          platform: hold one unified view of what you own, how much risk it carries, how it has
          performed, what it might do next, and whether it obeys its mandate. Everything is computed
          live from a self-contained, seeded market — change the <strong>Market Seed</strong> in the
          header to generate a fresh world and watch every number recompute.
        </p>
      </Panel>

      <Panel title="Managing a book — a 6-step walkthrough" hint="how the tabs fit together">
        <ol className="steps">
          {WALKTHROUGH.map((s) => (
            <li key={s.n}>
              <span className="step-n">{s.n}</span>
              <div>
                <div className="step-title">{s.title}</div>
                <div className="step-body">{s.body}</div>
              </div>
            </li>
          ))}
        </ol>
      </Panel>

      <div className="row two">
        <Panel title="Asset-management concepts" hint="the vocabulary">
          <dl className="glossary">
            {CONCEPTS.map((c) => (
              <div key={c.term}>
                <dt>{c.term}</dt>
                <dd>{c.def}</dd>
              </div>
            ))}
          </dl>
        </Panel>

        <Panel title="How the numbers are computed" hint="no black box">
          <p className="guide-p">
            A seeded random generator drives a linear factor model, so ~18 instruments share
            realistic correlations. From the simulated daily returns the engine builds a covariance
            matrix and derives volatility <span className="mono">√(wᵀΣw)</span>, parametric and
            historical VaR, beta, factor exposures, and a risk decomposition whose parts sum exactly
            to total risk. The Forecast tab runs a Monte Carlo of hundreds of forward paths.
          </p>
          <p className="guide-p">
            Because the market is seeded, results are reproducible and the whole engine is covered by
            unit tests. See <span className="mono">docs/ARCHITECTURE.md</span> for the full method.
          </p>
        </Panel>
      </div>

      <Panel title="Copilot &amp; your privacy" hint="ask questions in plain English">
        <p className="guide-p">
          The <strong>Copilot</strong> button (bottom-right) opens a dashboard-aware assistant. Ask
          things like <em>“what’s my VaR?”</em>, <em>“which position is riskiest?”</em>,
          <em>“how am I doing vs the benchmark?”</em>, <em>“what breached compliance?”</em>, or
          <em>“what if NVDA drops 20%?”</em>.
        </p>
        <p className="guide-p">
          <strong>It runs entirely on your device.</strong> The Copilot reads the in-memory
          analytics and answers locally — it makes <strong>zero network calls</strong>, so no
          personal information and no portfolio data ever leaves your browser. Nothing is uploaded to
          any server or third-party LLM.
        </p>
        <p className="disclaimer">
          Educational software with synthetic data. Nothing here is investment advice.
        </p>
      </Panel>
    </div>
  )
}
