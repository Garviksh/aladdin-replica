import { describe, expect, it } from 'vitest'
import { getMarket } from '../src/engine'
import { runStrategyBacktest } from '../src/engine/strategyBacktest'

const m = getMarket(20260721, 'sim')
const current = m.portfolio.positions.map((p) => p.marketValue / m.portfolio.investedValue)
const bt = runStrategyBacktest(m.returns, m.dates, current)

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
    const mv = bt.strategies.find((s) => s.name.includes('Min-Variance'))!
    const eq = bt.strategies.find((s) => s.name.includes('Equal'))!
    expect(mv.vol).toBeLessThanOrEqual(eq.vol + 1e-6)
  })
})
