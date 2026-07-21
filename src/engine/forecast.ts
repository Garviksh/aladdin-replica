import { getMarket, type DataMode } from '../data/market'
import { Rng } from '../lib/random'
import { portfolioReturns } from './risk'
import { mean, std } from './stats'

const TRADING_DAYS = 252

export interface ForecastBand {
  t: number
  p5: number
  p25: number
  p50: number
  p75: number
  p95: number
}

export interface AssetForecast {
  ticker: string
  name: string
  price: number
  /** Expected return over the horizon (fraction). */
  expReturn: number
  expPrice: number
  low: number
  high: number
  /** Annualized volatility (fraction). */
  vol: number
  /** Probability the asset ends the horizon above today's price. */
  probUp: number
}

export interface Forecast {
  horizonDays: number
  startValue: number
  bands: ForecastBand[]
  expReturn: number
  expValue: number
  p5Value: number
  p95Value: number
  probLoss: number
  /** Potential loss to the 5th percentile (currency, positive). */
  horizonVaR: number
  assets: AssetForecast[]
  sims: number
}

/** Standard normal CDF (Abramowitz & Stegun 26.2.17). */
export function normCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x))
  const d = 0.3989422804014327 * Math.exp((-x * x) / 2)
  let p =
    d *
    t *
    (0.319381530 +
      t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))))
  p = 1 - p
  return x >= 0 ? p : 1 - p
}

function percentile(arr: number[], p: number): number {
  const a = [...arr].sort((x, y) => x - y)
  const i = (a.length - 1) * p
  const lo = Math.floor(i)
  const hi = Math.ceil(i)
  return lo === hi ? a[lo] : a[lo] + (a[hi] - a[lo]) * (i - lo)
}

/**
 * Forward-looking Monte Carlo projection of the invested book plus per-asset
 * expected-return targets. Deterministic given the market seed and horizon, so
 * the same inputs always yield the same forecast (and it is unit-testable).
 */
export function buildForecast(
  seed: number,
  horizonDays = TRADING_DAYS,
  sims = 500,
  mode: DataMode = 'sim',
): Forecast {
  const { portfolio, returns } = getMarket(seed, mode)
  const invested = portfolio.investedValue
  const weights = portfolio.positions.map((p) => p.marketValue / invested)
  const pRet = portfolioReturns(weights, returns)
  const muD = mean(pRet)
  const sigD = std(pRet)
  const start = invested

  const rng = new Rng((seed ^ 0x9e3779b9) >>> 0)
  const H = horizonDays

  // Record roughly 60 evenly-spaced steps for the fan chart.
  const stepEvery = Math.max(1, Math.floor(H / 60))
  const recIdx: number[] = []
  for (let t = stepEvery; t <= H; t += stepEvery) recIdx.push(t)
  if (recIdx[recIdx.length - 1] !== H) recIdx.push(H)

  const atRec: number[][] = recIdx.map(() => new Array<number>(sims).fill(0))
  const finals = new Array<number>(sims)
  for (let s = 0; s < sims; s++) {
    let v = start
    let ri = 0
    for (let t = 1; t <= H; t++) {
      v *= 1 + (muD + sigD * rng.gaussian())
      if (ri < recIdx.length && t === recIdx[ri]) {
        atRec[ri][s] = v
        ri++
      }
    }
    finals[s] = v
  }

  const bands: ForecastBand[] = recIdx.map((t, i) => ({
    t,
    p5: percentile(atRec[i], 0.05),
    p25: percentile(atRec[i], 0.25),
    p50: percentile(atRec[i], 0.5),
    p75: percentile(atRec[i], 0.75),
    p95: percentile(atRec[i], 0.95),
  }))

  const expValue = percentile(finals, 0.5)
  const p5Value = percentile(finals, 0.05)
  const p95Value = percentile(finals, 0.95)
  const probLoss = finals.filter((v) => v < start).length / sims
  const expReturn = expValue / start - 1
  const horizonVaR = Math.max(0, start - p5Value)

  const assets: AssetForecast[] = portfolio.positions
    .map((p, i) => {
      const dm = mean(returns[i])
      const dv = std(returns[i])
      const muH = dm * H
      const volH = dv * Math.sqrt(H)
      return {
        ticker: p.instrument.ticker,
        name: p.instrument.name,
        price: p.price,
        expReturn: muH,
        expPrice: p.price * (1 + muH),
        low: p.price * (1 + muH - volH),
        high: p.price * (1 + muH + volH),
        vol: dv * Math.sqrt(TRADING_DAYS),
        probUp: normCdf(volH > 0 ? muH / volH : 0),
      }
    })
    .sort((a, b) => b.expReturn - a.expReturn)

  return {
    horizonDays: H,
    startValue: start,
    bands,
    expReturn,
    expValue,
    p5Value,
    p95Value,
    probLoss,
    horizonVaR,
    assets,
    sims,
  }
}
