import { describe, expect, it } from 'vitest'
import { buildAnalytics, generateMarket } from '../src/engine'
import { covMatrix, mean, percentile, variance } from '../src/engine/stats'
import { BENCHMARK_ID, INSTRUMENTS } from '../src/data/universe'
import { Rng } from '../src/lib/random'

const SEED = 20260721

describe('Rng', () => {
  it('is deterministic for a given seed', () => {
    const a = new Rng(42)
    const b = new Rng(42)
    const sa = Array.from({ length: 5 }, () => a.uniform())
    const sb = Array.from({ length: 5 }, () => b.uniform())
    expect(sa).toEqual(sb)
  })

  it('produces different streams for different seeds', () => {
    expect(new Rng(1).uniform()).not.toEqual(new Rng(2).uniform())
  })

  it('draws a standard normal with ~0 mean over many samples', () => {
    const r = new Rng(7)
    const N = 20000
    let s = 0
    for (let i = 0; i < N; i++) s += r.gaussian()
    expect(Math.abs(s / N)).toBeLessThan(0.05)
  })
})

describe('stats', () => {
  it('computes mean and variance', () => {
    expect(mean([1, 2, 3])).toBe(2)
    expect(variance([2, 2, 2])).toBe(0)
  })

  it('produces a symmetric covariance matrix', () => {
    const m = covMatrix([
      [1, 2, 3, 4],
      [2, 1, 0, -1],
      [0, 1, 0, 1],
    ])
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        expect(m[i][j]).toBeCloseTo(m[j][i], 12)
      }
    }
  })

  it('interpolates percentiles', () => {
    expect(percentile([1, 2, 3, 4], 0.5)).toBeCloseTo(2.5, 12)
    expect(percentile([1, 2, 3, 4], 0)).toBe(1)
    expect(percentile([1, 2, 3, 4], 1)).toBe(4)
  })
})

describe('generateMarket', () => {
  it('is deterministic across runs with the same seed', () => {
    const a = generateMarket(SEED)
    const b = generateMarket(SEED)
    expect(a.portfolio.totalValue).toBe(b.portfolio.totalValue)
    expect(a.portfolio.positions.map((p) => p.instrument.id)).toEqual(
      b.portfolio.positions.map((p) => p.instrument.id),
    )
  })

  it('holds every instrument except the benchmark', () => {
    const m = generateMarket(SEED)
    expect(m.portfolio.positions.length).toBe(INSTRUMENTS.length - 1)
    expect(m.portfolio.positions.find((p) => p.instrument.id === BENCHMARK_ID)).toBeUndefined()
  })

  it('has position weights plus cash summing to one', () => {
    const m = generateMarket(SEED)
    const sum =
      m.portfolio.positions.reduce((a, p) => a + p.weight, 0) +
      m.portfolio.cash / m.portfolio.totalValue
    expect(sum).toBeCloseTo(1, 6)
  })

  it('returns a return series matching the lookback window', () => {
    const m = generateMarket(SEED)
    expect(m.returns[0].length).toBe(m.lookbackDays)
    expect(m.benchmarkReturns.length).toBe(m.lookbackDays)
  })
})

describe('buildAnalytics', () => {
  const a = buildAnalytics(SEED)

  it('produces positive volatility and correctly ordered VaR', () => {
    expect(a.risk.annualVol).toBeGreaterThan(0)
    expect(a.risk.var95_1d).toBeGreaterThan(0)
    expect(a.risk.var99_1d).toBeGreaterThan(a.risk.var95_1d)
  })

  it('has component risk contributions summing to portfolio volatility', () => {
    const sum = a.risk.components.reduce((s, c) => s + c.contribution, 0)
    expect(sum).toBeCloseTo(a.risk.annualVol, 6)
  })

  it('has component risk shares summing to one', () => {
    const sum = a.risk.components.reduce((s, c) => s + c.pctOfRisk, 0)
    expect(sum).toBeCloseTo(1, 6)
  })

  it('computes a finite beta', () => {
    expect(Number.isFinite(a.risk.beta)).toBe(true)
  })

  it('evaluates the full mandate rule set with valid statuses', () => {
    expect(a.compliance.length).toBe(6)
    for (const r of a.compliance) {
      expect(['pass', 'warn', 'breach']).toContain(r.status)
    }
  })

  it('has allocation weights summing to one', () => {
    const sum = a.allocation.byAssetClass.reduce((s, r) => s + r.weight, 0)
    expect(sum).toBeCloseTo(1, 6)
  })

  it('produces a performance series spanning the lookback window', () => {
    expect(a.performance.series.length).toBe(a.lookbackDays)
  })
})
