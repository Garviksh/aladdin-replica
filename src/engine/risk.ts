import { FACTORS } from '../data/universe'
import type { ComponentRisk, Portfolio, RiskMetrics } from '../types/domain'
import { betaOf, type BetaMap } from './factors'
import { covMatrix, covariance, percentile, std } from './stats'

const TRADING_DAYS = 252
const Z95 = 1.645
const Z99 = 2.326

function annualizeVol(dailyVol: number): number {
  return dailyVol * Math.sqrt(TRADING_DAYS)
}

/** Portfolio daily return series from weights and per-instrument daily returns. */
export function portfolioReturns(weights: number[], returns: number[][]): number[] {
  const L = returns[0]?.length ?? 0
  const out = new Array<number>(L).fill(0)
  for (let i = 0; i < weights.length; i++) {
    const w = weights[i]
    const r = returns[i]
    for (let t = 0; t < L; t++) out[t] += w * r[t]
  }
  return out
}

/**
 * Full ex-ante risk snapshot. Risk is measured on the invested book, so weights
 * sum to 1 across positions; VaR is expressed in currency on the invested value.
 */
export function computeRisk(
  portfolio: Portfolio,
  returns: number[][],
  benchmarkReturns: number[],
  betas?: BetaMap,
): RiskMetrics {
  const positions = portfolio.positions
  const invested = portfolio.investedValue
  const weights = positions.map((p) => p.marketValue / invested)
  const k = weights.length

  const cov = covMatrix(returns) // daily covariance

  // Portfolio daily variance = wᵀ Σ w, and (Σ w) for marginal contributions.
  const sigmaW = new Array<number>(k).fill(0)
  let dailyVar = 0
  for (let i = 0; i < k; i++) {
    let s = 0
    for (let j = 0; j < k; j++) s += cov[i][j] * weights[j]
    sigmaW[i] = s
    dailyVar += weights[i] * s
  }
  const dailyVol = Math.sqrt(Math.max(dailyVar, 0))
  const annualVol = annualizeVol(dailyVol)

  // Component contribution to risk (annualized); Σ contributions = annualVol.
  const components: ComponentRisk[] = positions.map((p, i) => {
    const marginalDaily = dailyVol > 0 ? sigmaW[i] / dailyVol : 0
    const contribDaily = weights[i] * marginalDaily
    return {
      ticker: p.instrument.ticker,
      name: p.instrument.name,
      weight: weights[i],
      standaloneVol: annualizeVol(std(returns[i])),
      marginal: annualizeVol(marginalDaily),
      contribution: annualizeVol(contribDaily),
      pctOfRisk: dailyVol > 0 ? contribDaily / dailyVol : 0,
    }
  })
  components.sort((a, b) => b.contribution - a.contribution)

  // Value-at-Risk on the invested book.
  const dailyVolCurrency = dailyVol * invested
  const var95_1d = Z95 * dailyVolCurrency
  const var99_1d = Z99 * dailyVolCurrency

  const pRet = portfolioReturns(weights, returns)
  const pnl = pRet.map((r) => r * invested)
  const histVar95_1d = -percentile(pnl, 0.05)

  // Beta to benchmark.
  const bVar = std(benchmarkReturns) ** 2
  const beta = bVar > 0 ? covariance(pRet, benchmarkReturns) / bVar : 0

  // Factor exposures (weight-averaged betas).
  const factorExposures = FACTORS.map((f) => {
    let e = 0
    for (let i = 0; i < k; i++) e += weights[i] * betaOf(betas, positions[i], f.key)
    return { key: f.key, label: f.label, exposure: e }
  })

  // Diversification ratio.
  const wAvgVol = positions.reduce(
    (a, _p, i) => a + weights[i] * annualizeVol(std(returns[i])),
    0,
  )
  const diversification = wAvgVol > 0 ? 1 - annualVol / wAvgVol : 0

  return {
    annualVol,
    var95_1d,
    var99_1d,
    histVar95_1d,
    beta,
    factorExposures,
    components,
    diversification,
  }
}
