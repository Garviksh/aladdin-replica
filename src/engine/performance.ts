import type {
  AttributionRow,
  PerfPoint,
  Performance,
  Portfolio,
  PricePoint,
} from '../types/domain'
import { portfolioReturns } from './risk'
import { mean, std } from './stats'

const TRADING_DAYS = 252
const RF_ANNUAL = 0.02

export function computePerformance(
  portfolio: Portfolio,
  returns: number[][],
  benchmarkReturns: number[],
  dates: number[],
): Performance {
  const invested = portfolio.investedValue
  const weights = portfolio.positions.map((p) => p.marketValue / invested)
  const pRet = portfolioReturns(weights, returns)
  const L = pRet.length

  const series: PerfPoint[] = []
  let pc = 1
  let bc = 1
  for (let t = 0; t < L; t++) {
    pc *= 1 + pRet[t]
    bc *= 1 + benchmarkReturns[t]
    series.push({ t: dates[t], portfolio: pc, benchmark: bc })
  }
  const pnlSeries: PricePoint[] = pRet.map((r, t) => ({ t: dates[t], v: r * invested }))

  const totalReturn = pc - 1
  const benchmarkReturn = bc - 1
  const activeReturn = totalReturn - benchmarkReturn

  const mu = mean(pRet) * TRADING_DAYS
  const vol = std(pRet) * Math.sqrt(TRADING_DAYS)
  const sharpe = vol > 0 ? (mu - RF_ANNUAL) / vol : 0

  let peak = -Infinity
  let maxDrawdown = 0
  for (const pt of series) {
    peak = Math.max(peak, pt.portfolio)
    maxDrawdown = Math.min(maxDrawdown, pt.portfolio / peak - 1)
  }

  // Return attribution: per-instrument compounded return over the window,
  // grouped and weighted. Group contributions approximately sum to total return.
  const instTotalReturn = returns.map((r) => {
    let c = 1
    for (const x of r) c *= 1 + x
    return c - 1
  })

  const byGroup = (keyFn: (i: number) => string): AttributionRow[] => {
    const map = new Map<string, { weight: number; contribution: number }>()
    portfolio.positions.forEach((_p, i) => {
      const key = keyFn(i)
      const cur = map.get(key) ?? { weight: 0, contribution: 0 }
      cur.weight += weights[i]
      cur.contribution += weights[i] * instTotalReturn[i]
      map.set(key, cur)
    })
    return [...map.entries()]
      .map(([label, v]) => ({
        label,
        weight: v.weight,
        return: v.weight > 0 ? v.contribution / v.weight : 0,
        contribution: v.contribution,
      }))
      .sort((a, b) => b.contribution - a.contribution)
  }

  const bySector = byGroup((i) => portfolio.positions[i].instrument.sector)
  const byAssetClass = byGroup((i) => portfolio.positions[i].instrument.assetClass)

  return {
    series,
    pnlSeries,
    totalReturn,
    benchmarkReturn,
    activeReturn,
    sharpe,
    maxDrawdown,
    bySector,
    byAssetClass,
  }
}
