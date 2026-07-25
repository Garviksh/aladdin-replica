import { minVarianceWeights, riskParityWeights } from './optimize'
import { covMatrix, mean, std } from './stats'

const TRADING_DAYS = 252
const RF_ANNUAL = 0.02

/**
 * Default one-way transaction cost, in basis points of traded notional.
 * 10bps is a deliberately conservative assumption for liquid US equity and ETF
 * exposure; institutional execution would be cheaper. Exposed as a parameter so
 * the assumption can be stressed rather than hidden.
 */
export const DEFAULT_COST_BPS = 10

export interface StrategyResult {
  name: string
  /** Growth-of-1 curve, net of transaction costs. */
  curve: { t: number; v: number }[]
  /** Total return net of costs. */
  totalReturn: number
  /** Total return with costs ignored — the number a naive backtest would print. */
  grossTotalReturn: number
  vol: number
  sharpe: number
  maxDrawdown: number
  /** One-way turnover per year. 1.0 means the book is fully replaced once a year. */
  annualTurnover: number
  /** Cumulative transaction cost paid, as a fraction of NAV. */
  costDrag: number
}

export interface StrategyBacktest {
  strategies: StrategyResult[]
  window: number
  rebalance: number
  costBps: number
}

type WeightFn = (win: number[][], k: number, current: number[]) => number[]

const sliceWin = (returns: number[][], from: number, to: number): number[][] =>
  returns.map((r) => r.slice(from, to))

/** One-way turnover between two weight vectors: ½·Σ|Δw|. */
function turnoverBetween(from: number[], to: number[]): number {
  let sum = 0
  for (let i = 0; i < to.length; i++) sum += Math.abs(to[i] - (from[i] ?? 0))
  return sum / 2
}

/**
 * Walk-forward backtest: at each monthly rebalance, weights are computed from a
 * trailing window ONLY (no lookahead), then applied to the following days.
 * Compares Current (buy & hold), Equal-weight, Min-Variance, and Risk-Parity.
 *
 * Rebalancing is charged. Every strategy starts from **cash** — no free initial
 * book — pays ½·Σ|Δw| · costBps to establish its first allocation, and pays the
 * same on every subsequent rebalance. Without this, strategies that trade every
 * month are compared against buy-and-hold on terms buy-and-hold never gets,
 * which systematically flatters the optimizers.
 *
 * Starting from cash rather than from equal weight matters: initialising at any
 * particular allocation hands a free entry to whichever strategy happens to
 * target it. From zero, every strategy pays for the book it chooses.
 */
export function runStrategyBacktest(
  returns: number[][],
  dates: number[],
  current: number[],
  costBps = DEFAULT_COST_BPS,
): StrategyBacktest {
  const k = returns.length
  const L = returns[0]?.length ?? 0
  const WIN = 126
  const REBAL = 21
  const costRate = costBps / 10_000

  const strategies: { name: string; fn: WeightFn }[] = [
    { name: 'Current (buy & hold)', fn: (_win, _k, cur) => cur },
    { name: 'Equal-weight', fn: (_win, kk) => new Array<number>(kk).fill(1 / kk) },
    { name: 'Min-Variance', fn: (win) => minVarianceWeights(covMatrix(win)) },
    { name: 'Risk-Parity', fn: (win) => riskParityWeights(covMatrix(win)) },
  ]

  const results: StrategyResult[] = strategies.map(({ name, fn }) => {
    // Start flat: every strategy pays to establish the book it wants.
    let w = new Array<number>(k).fill(0)
    const daily: number[] = []
    const curve: { t: number; v: number }[] = []
    let cum = 1
    let gross = 1
    let totalTurnover = 0
    let costDrag = 0

    for (let t = WIN; t < L; t++) {
      let cost = 0
      if ((t - WIN) % REBAL === 0) {
        const target = fn(sliceWin(returns, t - WIN, t), k, current)
        const turnover = turnoverBetween(w, target)
        totalTurnover += turnover
        cost = turnover * costRate
        costDrag += cost
        w = target
      }
      let r = 0
      for (let i = 0; i < k; i++) r += w[i] * returns[i][t]
      gross *= 1 + r
      const net = r - cost
      cum *= 1 + net
      daily.push(net)
      curve.push({ t: dates[t] ?? t, v: cum })
    }

    const days = daily.length
    const vol = std(daily) * Math.sqrt(TRADING_DAYS)
    const mu = mean(daily) * TRADING_DAYS
    let peak = -Infinity
    let maxDrawdown = 0
    for (const p of curve) {
      peak = Math.max(peak, p.v)
      maxDrawdown = Math.min(maxDrawdown, p.v / peak - 1)
    }

    return {
      name,
      curve,
      totalReturn: cum - 1,
      grossTotalReturn: gross - 1,
      vol,
      sharpe: vol > 0 ? (mu - RF_ANNUAL) / vol : 0,
      maxDrawdown,
      annualTurnover: days > 0 ? (totalTurnover * TRADING_DAYS) / days : 0,
      costDrag,
    }
  })

  return { strategies: results, window: WIN, rebalance: REBAL, costBps }
}
