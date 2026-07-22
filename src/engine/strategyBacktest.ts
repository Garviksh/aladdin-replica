import { minVarianceWeights, riskParityWeights } from './optimize'
import { covMatrix, mean, std } from './stats'

const TRADING_DAYS = 252
const RF_ANNUAL = 0.02

export interface StrategyResult {
  name: string
  /** Growth-of-1 curve. */
  curve: { t: number; v: number }[]
  totalReturn: number
  vol: number
  sharpe: number
  maxDrawdown: number
}

export interface StrategyBacktest {
  strategies: StrategyResult[]
  window: number
  rebalance: number
}

type WeightFn = (win: number[][], k: number, current: number[]) => number[]

const sliceWin = (returns: number[][], from: number, to: number): number[][] =>
  returns.map((r) => r.slice(from, to))

/**
 * Walk-forward backtest: at each monthly rebalance, weights are computed from a
 * trailing window ONLY (no lookahead), then applied to the following days.
 * Compares Current (buy & hold), Equal-weight, Min-Variance, and Risk-Parity.
 */
export function runStrategyBacktest(
  returns: number[][],
  dates: number[],
  current: number[],
): StrategyBacktest {
  const k = returns.length
  const L = returns[0]?.length ?? 0
  const WIN = 126
  const REBAL = 21

  const strategies: { name: string; fn: WeightFn }[] = [
    { name: 'Current (buy & hold)', fn: (_win, _k, cur) => cur },
    { name: 'Equal-weight', fn: (_win, kk) => new Array<number>(kk).fill(1 / kk) },
    { name: 'Min-Variance', fn: (win) => minVarianceWeights(covMatrix(win)) },
    { name: 'Risk-Parity', fn: (win) => riskParityWeights(covMatrix(win)) },
  ]

  const results: StrategyResult[] = strategies.map(({ name, fn }) => {
    let w = new Array<number>(k).fill(1 / k)
    const daily: number[] = []
    const curve: { t: number; v: number }[] = []
    let cum = 1
    for (let t = WIN; t < L; t++) {
      if ((t - WIN) % REBAL === 0) w = fn(sliceWin(returns, t - WIN, t), k, current)
      let r = 0
      for (let i = 0; i < k; i++) r += w[i] * returns[i][t]
      cum *= 1 + r
      daily.push(r)
      curve.push({ t: dates[t] ?? t, v: cum })
    }
    const vol = std(daily) * Math.sqrt(TRADING_DAYS)
    const mu = mean(daily) * TRADING_DAYS
    let peak = -Infinity
    let maxDrawdown = 0
    for (const p of curve) {
      peak = Math.max(peak, p.v)
      maxDrawdown = Math.min(maxDrawdown, p.v / peak - 1)
    }
    return { name, curve, totalReturn: cum - 1, vol, sharpe: vol > 0 ? (mu - RF_ANNUAL) / vol : 0, maxDrawdown }
  })

  return { strategies: results, window: WIN, rebalance: REBAL }
}
