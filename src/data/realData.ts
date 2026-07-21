import { Rng } from '../lib/random'
import type { Position } from '../types/domain'
import type { Market } from './generatePortfolio'
import marketDataJson from './marketData.json'
import { BENCHMARK_ID, INSTRUMENTS } from './universe'

interface RawMarketData {
  asOf: string | null
  source: string | null
  dates: string[]
  series: Record<string, number[]>
}

const data = marketDataJson as unknown as RawMarketData

export const REAL_META = { asOf: data.asOf, source: data.source }

/** True once `npm run refresh-data` has populated a real dataset. */
export function hasRealData(): boolean {
  return Boolean(
    data.dates && data.dates.length > 30 && data.series && data.series[BENCHMARK_ID]?.length,
  )
}

function toReturns(closes: number[]): number[] {
  const out: number[] = []
  for (let i = 1; i < closes.length; i++) out.push(closes[i] / closes[i - 1] - 1)
  return out
}

/**
 * Build a model book priced on REAL end-of-day history. The engine (risk,
 * performance, forecast) is unchanged — it simply receives real returns, so
 * volatility, VaR, beta, correlation, drawdown and the Monte Carlo forecast are
 * all computed from real prices. Target weights are seeded so "Reseed" still
 * generates a different book on the same real market.
 */
export function loadRealMarket(seed: number): Market {
  const rng = new Rng(seed)
  const dates = data.dates.map((d) => new Date(d).getTime())

  const held = INSTRUMENTS.filter(
    (i) => i.id !== BENCHMARK_ID && data.series[i.id]?.length === data.dates.length,
  )

  const nav = 100_000_000 + rng.int(0, 60) * 1_000_000
  const cashW = rng.range(0.02, 0.06)
  const investedTarget = nav * (1 - cashW)
  const rawW = held.map((inst) => {
    const base =
      inst.assetClass === 'Equity' ? 1.4 : inst.assetClass === 'Fixed Income' ? 1.1 : 0.7
    return base * rng.range(0.4, 1.6)
  })
  const sumRaw = rawW.reduce((a, b) => a + b, 0)
  const normW = rawW.map((w) => w / sumRaw)

  const positions: Position[] = held.map((inst, idx) => {
    const closes = data.series[inst.id]
    const price = closes[closes.length - 1]
    const prevPrice = closes[closes.length - 2]
    const targetVal = investedTarget * normW[idx]
    const quantity = Math.max(1, Math.round(targetVal / price))
    const marketValue = quantity * price
    const entryIdx = Math.floor(rng.range(0, closes.length * 0.5))
    const costBasis = closes[entryIdx]
    return {
      instrument: inst,
      quantity,
      price,
      prevPrice,
      marketValue,
      weight: 0,
      dayChangePct: prevPrice > 0 ? price / prevPrice - 1 : 0,
      dayPnl: quantity * (price - prevPrice),
      costBasis,
      unrealizedPnl: quantity * (price - costBasis),
    }
  })

  const investedValue = positions.reduce((a, p) => a + p.marketValue, 0)
  const cash = Math.round((investedValue * cashW) / (1 - cashW))
  const totalValue = investedValue + cash
  for (const p of positions) p.weight = p.marketValue / totalValue
  positions.sort((a, b) => b.marketValue - a.marketValue)

  const portfolio = {
    name: 'Global Multi-Asset Composite (Live prices)',
    baseCurrency: 'USD',
    asOf: data.asOf ?? '',
    cash,
    positions,
    totalValue,
    investedValue,
  }

  const returns = positions.map((p) => toReturns(data.series[p.instrument.id]))
  const benchmarkReturns = toReturns(data.series[BENCHMARK_ID])
  const benchmarkName = INSTRUMENTS.find((i) => i.id === BENCHMARK_ID)!.name

  return {
    portfolio,
    returns,
    benchmarkReturns,
    dates: dates.slice(1),
    benchmarkName,
    lookbackDays: returns[0]?.length ?? 0,
  }
}
