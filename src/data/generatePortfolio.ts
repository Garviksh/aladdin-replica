import { Rng } from '../lib/random'
import { BENCHMARK_ID, FACTORS, INSTRUMENTS } from './universe'
import type { FactorKey, Instrument, Portfolio, Position } from '../types/domain'

const TRADING_DAYS = 252

export interface Market {
  portfolio: Portfolio
  /** Daily returns per held position, aligned with portfolio.positions. */
  returns: number[][]
  /** Daily returns of the benchmark. */
  benchmarkReturns: number[]
  /** Epoch-ms timestamps aligned with the return series. */
  dates: number[]
  benchmarkName: string
  lookbackDays: number
}

/** Annualized expected return, derived from factor exposures (a simple risk premium). */
function annualDrift(inst: Instrument): number {
  const b = inst.betas
  return (
    0.02 +
    (b.equity ?? 0) * 0.05 +
    (b.credit ?? 0) * 0.02 +
    (b.commodity ?? 0) * 0.015 -
    (b.rates ?? 0) * 0.005
  )
}

/** Relative target weight before normalization; equities are tilted heavier. */
function targetWeight(inst: Instrument, rng: Rng): number {
  const base =
    inst.assetClass === 'Equity' ? 1.4 : inst.assetClass === 'Fixed Income' ? 1.1 : 0.7
  return base * rng.range(0.4, 1.6)
}

/**
 * Build a deterministic, plausible multi-asset portfolio and its market history
 * from a single integer seed, using a linear factor model:
 *   r_i = drift_i + Σ_k β_ik · f_k + ε_i
 */
export function generateMarket(seed: number, lookbackDays = 260): Market {
  const rng = new Rng(seed)
  const L = lookbackDays

  // 1. Simulate factor daily-return paths.
  const factorPaths: Record<FactorKey, number[]> = {
    equity: [],
    rates: [],
    credit: [],
    commodity: [],
    fx: [],
  }
  for (const f of FACTORS) {
    const dv = f.annualVol / Math.sqrt(TRADING_DAYS)
    factorPaths[f.key] = Array.from({ length: L }, () => rng.gaussian() * dv)
  }

  // 2. Simulate each instrument's daily returns and price path.
  const retById: Record<string, number[]> = {}
  const priceById: Record<string, number[]> = {}
  for (const inst of INSTRUMENTS) {
    const idv = inst.idioVol / Math.sqrt(TRADING_DAYS)
    const drift = annualDrift(inst) / TRADING_DAYS
    const rets: number[] = []
    const prices: number[] = []
    let price = inst.basePrice
    for (let t = 0; t < L; t++) {
      let r = drift
      for (const f of FACTORS) r += (inst.betas[f.key] ?? 0) * factorPaths[f.key][t]
      r += idv * rng.gaussian()
      rets.push(r)
      price = price * (1 + r)
      prices.push(price)
    }
    retById[inst.id] = rets
    priceById[inst.id] = prices
  }

  const dates = Array.from({ length: L }, (_, i) => Date.now() - (L - 1 - i) * 86_400_000)

  // 3. Construct holdings (everything except the benchmark).
  const held = INSTRUMENTS.filter((i) => i.id !== BENCHMARK_ID)
  const nav = 100_000_000 + rng.int(0, 60) * 1_000_000
  const cashW = rng.range(0.02, 0.06)
  const investedTarget = nav * (1 - cashW)

  const rawW = held.map((inst) => targetWeight(inst, rng))
  const sumRaw = rawW.reduce((a, b) => a + b, 0)
  const normW = rawW.map((w) => w / sumRaw)

  const positions: Position[] = held.map((inst, idx) => {
    const prices = priceById[inst.id]
    const price = prices[L - 1]
    const prevPrice = prices[L - 2]
    const targetVal = investedTarget * normW[idx]
    const quantity = Math.max(1, Math.round(targetVal / price))
    const marketValue = quantity * price
    const dayChangePct = prevPrice > 0 ? price / prevPrice - 1 : 0
    const dayPnl = quantity * (price - prevPrice)
    const entryIdx = Math.floor(rng.range(0, L * 0.5))
    const costBasis = prices[entryIdx]
    const unrealizedPnl = quantity * (price - costBasis)
    return {
      instrument: inst,
      quantity,
      price,
      prevPrice,
      marketValue,
      weight: 0,
      dayChangePct,
      dayPnl,
      costBasis,
      unrealizedPnl,
    }
  })

  const investedValue = positions.reduce((a, p) => a + p.marketValue, 0)
  const cash = Math.round((investedValue * cashW) / (1 - cashW))
  const totalValue = investedValue + cash
  for (const p of positions) p.weight = p.marketValue / totalValue
  positions.sort((a, b) => b.marketValue - a.marketValue)

  const portfolio: Portfolio = {
    name: 'Global Multi-Asset Composite',
    baseCurrency: 'USD',
    asOf: new Date(dates[L - 1]).toISOString().slice(0, 10),
    cash,
    positions,
    totalValue,
    investedValue,
  }

  const returns = positions.map((p) => retById[p.instrument.id])
  const benchmarkReturns = retById[BENCHMARK_ID]
  const benchmarkName = INSTRUMENTS.find((i) => i.id === BENCHMARK_ID)!.name

  return { portfolio, returns, benchmarkReturns, dates, benchmarkName, lookbackDays: L }
}
