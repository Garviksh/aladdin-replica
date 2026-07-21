import { describe, expect, it } from 'vitest'
import { generateMarket } from '../src/engine'
import { buildForecast, normCdf } from '../src/engine/forecast'

const SEED = 20260721

describe('normCdf', () => {
  it('is 0.5 at zero and monotonic in the tails', () => {
    expect(normCdf(0)).toBeCloseTo(0.5, 3)
    expect(normCdf(-10)).toBeLessThan(0.001)
    expect(normCdf(10)).toBeGreaterThan(0.999)
    expect(normCdf(1)).toBeGreaterThan(normCdf(0))
  })
})

describe('buildForecast', () => {
  it('is deterministic for the same seed and horizon', () => {
    const a = buildForecast(SEED, 63)
    const b = buildForecast(SEED, 63)
    expect(a.expValue).toBe(b.expValue)
    expect(a.p5Value).toBe(b.p5Value)
  })

  it('produces monotonically ordered percentile bands', () => {
    const f = buildForecast(SEED, 252)
    for (const band of f.bands) {
      expect(band.p5).toBeLessThanOrEqual(band.p25)
      expect(band.p25).toBeLessThanOrEqual(band.p50)
      expect(band.p50).toBeLessThanOrEqual(band.p75)
      expect(band.p75).toBeLessThanOrEqual(band.p95)
    }
  })

  it('produces sensible summary statistics', () => {
    const f = buildForecast(SEED, 252)
    expect(f.startValue).toBeGreaterThan(0)
    expect(f.expValue).toBeGreaterThan(0)
    expect(f.p5Value).toBeLessThanOrEqual(f.p95Value)
    expect(f.probLoss).toBeGreaterThanOrEqual(0)
    expect(f.probLoss).toBeLessThanOrEqual(1)
    expect(f.horizonVaR).toBeGreaterThanOrEqual(0)
  })

  it('covers every held position with a projection', () => {
    const f = buildForecast(SEED, 252)
    const m = generateMarket(SEED)
    expect(f.assets.length).toBe(m.portfolio.positions.length)
    for (const a of f.assets) {
      expect(a.probUp).toBeGreaterThanOrEqual(0)
      expect(a.probUp).toBeLessThanOrEqual(1)
    }
  })
})
