import { describe, expect, it } from 'vitest'
import { getMarket } from '../src/engine'
import { DEFAULT_COST_BPS, runStrategyBacktest } from '../src/engine/strategyBacktest'

const m = getMarket(20260721, 'sim')
const current = m.portfolio.positions.map((p) => p.marketValue / m.portfolio.investedValue)
const bt = runStrategyBacktest(m.returns, m.dates, current)

const find = (b: typeof bt, name: string) => b.strategies.find((s) => s.name.includes(name))!

describe('walk-forward strategy backtest', () => {
  it('runs four strategies with non-empty curves and finite stats', () => {
    expect(bt.strategies.length).toBe(4)
    for (const s of bt.strategies) {
      expect(s.curve.length).toBeGreaterThan(0)
      expect(Number.isFinite(s.totalReturn)).toBe(true)
      expect(Number.isFinite(s.sharpe)).toBe(true)
      expect(s.vol).toBeGreaterThanOrEqual(0)
    }
  })

  it('min-variance realizes lower vol than equal-weight', () => {
    const mv = find(bt, 'Min-Variance')
    const eq = find(bt, 'Equal')
    expect(mv.vol).toBeLessThanOrEqual(eq.vol + 1e-6)
  })
})

describe('transaction costs', () => {
  const free = runStrategyBacktest(m.returns, m.dates, current, 0)
  const dear = runStrategyBacktest(m.returns, m.dates, current, 50)

  it('defaults to a stated, non-zero cost assumption', () => {
    expect(bt.costBps).toBe(DEFAULT_COST_BPS)
    expect(DEFAULT_COST_BPS).toBeGreaterThan(0)
  })

  it('charges nothing and leaves net equal to gross at 0bps', () => {
    for (const s of free.strategies) {
      expect(s.costDrag).toBe(0)
      expect(s.totalReturn).toBeCloseTo(s.grossTotalReturn, 12)
    }
  })

  it('never lets net return exceed gross return', () => {
    for (const b of [bt, dear]) {
      for (const s of b.strategies) {
        expect(s.totalReturn).toBeLessThanOrEqual(s.grossTotalReturn + 1e-12)
        expect(s.costDrag).toBeGreaterThanOrEqual(0)
        expect(s.annualTurnover).toBeGreaterThanOrEqual(0)
      }
    }
  })

  it('drags net return down monotonically as costs rise', () => {
    for (const s of dear.strategies) {
      const mid = find(bt, s.name)
      const zero = find(free, s.name)
      expect(s.totalReturn).toBeLessThanOrEqual(mid.totalReturn + 1e-12)
      expect(mid.totalReturn).toBeLessThanOrEqual(zero.totalReturn + 1e-12)
    }
  })

  it('charges buy-and-hold far less turnover than the monthly optimizers', () => {
    // Buy & hold trades once to establish the book, then holds. Min-variance
    // re-solves every rebalance, so it must turn over more.
    const hold = find(bt, 'buy & hold')
    const mv = find(bt, 'Min-Variance')
    expect(hold.annualTurnover).toBeLessThan(mv.annualTurnover)
    expect(hold.costDrag).toBeLessThan(mv.costDrag)
  })

  it('gives no strategy a free entry into its starting book', () => {
    // Every strategy starts from cash. Initialising at any particular
    // allocation would hand a free entry to whichever strategy targets it —
    // equal-weight, most obviously.
    for (const s of bt.strategies) {
      expect(s.annualTurnover).toBeGreaterThan(0)
      expect(s.costDrag).toBeGreaterThan(0)
    }
  })

  it('leaves the gross result unchanged by the cost assumption', () => {
    // Costs must not feed back into the strategy's own weight decisions.
    for (const s of dear.strategies) {
      expect(s.grossTotalReturn).toBeCloseTo(find(free, s.name).grossTotalReturn, 12)
    }
  })
})
