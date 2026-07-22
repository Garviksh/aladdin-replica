import type {
  AttributionRow,
  DrawdownRow,
  PerfPoint,
  Performance,
  Portfolio,
  PricePoint,
  RollingPoint,
} from '../types/domain'
import { portfolioReturns } from './risk'
import { covariance, mean, std, variance } from './stats'

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

  // Downside-only and benchmark-relative risk-adjusted metrics.
  const downsideDeviation = Math.sqrt(mean(pRet.map((r) => Math.min(0, r) ** 2))) * Math.sqrt(TRADING_DAYS)
  const sortino = downsideDeviation > 0 ? (mu - RF_ANNUAL) / downsideDeviation : 0
  const calmar = maxDrawdown < 0 ? mu / Math.abs(maxDrawdown) : 0
  const active = pRet.map((r, t) => r - benchmarkReturns[t])
  const trackingError = std(active) * Math.sqrt(TRADING_DAYS)
  const muB = mean(benchmarkReturns) * TRADING_DAYS
  const informationRatio = trackingError > 0 ? (mu - muB) / trackingError : 0

  // Rolling 63-day annualized vol, Sharpe, and beta.
  const W = 63
  const rolling: RollingPoint[] = []
  for (let i = W; i <= L; i++) {
    const win = pRet.slice(i - W, i)
    const bwin = benchmarkReturns.slice(i - W, i)
    const v = std(win) * Math.sqrt(TRADING_DAYS)
    const rmu = mean(win) * TRADING_DAYS
    const bvar = variance(bwin)
    rolling.push({
      t: dates[i - 1],
      vol: v,
      sharpe: v > 0 ? (rmu - RF_ANNUAL) / v : 0,
      beta: bvar > 0 ? covariance(win, bwin) / bvar : 0,
    })
  }

  // Drawdown episodes from the cumulative portfolio curve.
  const allDrawdowns: DrawdownRow[] = []
  let ddPeak = series[0]?.portfolio ?? 1
  let ddPeakT = series[0]?.t ?? 0
  let inDD = false
  let trough = ddPeak
  let troughT = ddPeakT
  let startT = ddPeakT
  const closeDD = () =>
    allDrawdowns.push({
      depth: trough / ddPeak - 1,
      length: Math.max(1, Math.round((troughT - startT) / 86_400_000)),
      start: new Date(startT).toISOString().slice(0, 10),
      trough: new Date(troughT).toISOString().slice(0, 10),
    })
  for (const pt of series) {
    if (pt.portfolio >= ddPeak) {
      if (inDD) {
        closeDD()
        inDD = false
      }
      ddPeak = pt.portfolio
      ddPeakT = pt.t
      trough = pt.portfolio
      troughT = pt.t
    } else if (!inDD) {
      inDD = true
      startT = ddPeakT
      trough = pt.portfolio
      troughT = pt.t
    } else if (pt.portfolio < trough) {
      trough = pt.portfolio
      troughT = pt.t
    }
  }
  if (inDD) closeDD()
  const drawdowns = allDrawdowns.sort((a, b) => a.depth - b.depth).slice(0, 5)

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
    sortino,
    calmar,
    informationRatio,
    trackingError,
    downsideDeviation,
    maxDrawdown,
    rolling,
    drawdowns,
    bySector,
    byAssetClass,
  }
}
