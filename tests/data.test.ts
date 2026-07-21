import { describe, expect, it } from 'vitest'
import { BENCHMARK_ID, INSTRUMENTS } from '../src/data/universe'
import { getMarket } from '../src/data/market'
import { buildAnalytics } from '../src/engine'

const SEED = 20260721

// These tests are agnostic to whether a real dataset has been loaded
// (npm run refresh-data) — they must hold in both sim and real modes.
describe('data mode', () => {
  it('simulation mode builds the full book (benchmark excluded)', () => {
    const m = getMarket(SEED, 'sim')
    expect(m.portfolio.positions.length).toBe(INSTRUMENTS.length - 1)
    expect(m.portfolio.totalValue).toBeGreaterThan(0)
    expect(m.portfolio.positions.find((p) => p.instrument.id === BENCHMARK_ID)).toBeUndefined()
  })

  it('builds valid analytics in both sim and real modes', () => {
    for (const mode of ['sim', 'real'] as const) {
      const a = buildAnalytics(SEED, mode)
      expect(a.risk.annualVol).toBeGreaterThan(0)
      expect(a.risk.var99_1d).toBeGreaterThan(a.risk.var95_1d)
      expect(a.performance.series.length).toBe(a.lookbackDays)
      expect(a.portfolio.positions.length).toBeGreaterThan(0)
    }
  })
})
