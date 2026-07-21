// Plain-English explanations of the concepts the Copilot can teach.
// Pure data — no network, no personal information.

export const CONCEPTS = {
  var: 'Value-at-Risk (VaR) is a loss threshold for a confidence level and horizon. A "1-day 99% VaR of $2.6M" means on about 99 of 100 days the loss should be smaller than $2.6M. It is a threshold, not the worst possible case — tail losses can exceed it.',
  volatility:
    'Volatility is the standard deviation of returns, usually annualized. Higher volatility means wider swings. Portfolio volatility is √(wᵀΣw), which is lower than the weighted-average of each holding’s volatility thanks to diversification.',
  beta: 'Beta measures sensitivity to the benchmark. Beta 0.7 means the book tends to move about 0.7% when the market moves 1%. Below 1 is defensive; above 1 is aggressive.',
  sharpe:
    'The Sharpe ratio is excess return (above the risk-free rate) divided by volatility — return per unit of risk. Higher is better; above ~1 is generally considered good.',
  drawdown:
    'Max drawdown is the largest peak-to-trough decline over a period. It captures the worst losing streak an investor would have lived through, which volatility alone can hide.',
  diversification:
    'Diversification spreads capital across assets that don’t move together, so their ups and downs partly cancel. The diversification ratio here is 1 − portfolioVol / weighted-average-standalone-vol: higher means more benefit.',
  factor:
    'A factor is a systematic driver of returns (equity, rates, credit, commodity, FX). Factor exposure is your net weighted bet on each. Two different-looking portfolios can carry the same underlying factor risk.',
  attribution:
    'Performance attribution decomposes total return into contributions — here by sector and asset class — so you can see what actually drove the result, not just the headline number.',
  montecarlo:
    'A Monte Carlo simulation projects many possible futures by repeatedly drawing random return paths from the portfolio’s estimated mean and volatility. The spread of outcomes becomes the forecast fan (percentile bands).',
  correlation:
    'Correlation measures how two assets move together, from −1 (opposite) to +1 (identical). Low or negative correlations are what make diversification work.',
} as const

const MATCHERS: { keys: string[]; text: string }[] = [
  { keys: ['value at risk', 'value-at-risk', 'var'], text: CONCEPTS.var },
  { keys: ['volatility', 'std dev', 'standard deviation'], text: CONCEPTS.volatility },
  { keys: ['beta'], text: CONCEPTS.beta },
  { keys: ['sharpe'], text: CONCEPTS.sharpe },
  { keys: ['drawdown'], text: CONCEPTS.drawdown },
  { keys: ['diversif'], text: CONCEPTS.diversification },
  { keys: ['factor'], text: CONCEPTS.factor },
  { keys: ['attribution'], text: CONCEPTS.attribution },
  { keys: ['monte carlo', 'monte-carlo', 'simulation'], text: CONCEPTS.montecarlo },
  { keys: ['correlation', 'correlated'], text: CONCEPTS.correlation },
]

/** Return a concept explanation if the query mentions one, else null. */
export function findConcept(q: string): string | null {
  for (const m of MATCHERS) {
    if (m.keys.some((k) => q.includes(k))) return m.text
  }
  return null
}
