import { describe, expect, it } from 'vitest'
import { getMarket, realDataAvailable } from '../src/data/market'
import { buildAnalytics } from '../src/engine'

const SEED = 20260721

describe('data mode', () => {
  it('reports no real data with the committed placeholder dataset', () => {
    expect(realDataAvailable()).toBe(false)
  })

  it('falls back to simulation when real data is unavailable', () => {
    const real = getMarket(SEED, 'real')
    const sim = getMarket(SEED, 'sim')
    expect(real.portfolio.positions.length).toBe(sim.portfolio.positions.length)
    expect(real.portfolio.totalValue).toBe(sim.portfolio.totalValue)
  })

  it('builds analytics in real mode without throwing (uses fallback)', () => {
    const a = buildAnalytics(SEED, 'real')
    expect(a.risk.annualVol).toBeGreaterThan(0)
    expect(a.performance.series.length).toBe(a.lookbackDays)
  })
})
