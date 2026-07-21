import { describe, expect, it } from 'vitest'
import { computeVarBacktest } from '../src/engine/backtest'

// Deterministic pseudo-random return series (~2% daily vol).
function series(n: number): number[] {
  let s = 1
  const next = () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
  return Array.from({ length: n }, () => (next() - 0.5) * 0.02)
}

describe('VaR backtest (Kupiec + Christoffersen)', () => {
  const ret = series(500)
  const vol = Math.sqrt(ret.reduce((a, b) => a + b * b, 0) / ret.length)
  const bt = computeVarBacktest(ret, vol, [0.95, 0.99])

  it('reports observations and both levels', () => {
    expect(bt.obs).toBe(500)
    expect(bt.levels.length).toBe(2)
  })

  it('produces valid exception counts and p-values', () => {
    for (const l of bt.levels) {
      expect(l.exceptions).toBeGreaterThanOrEqual(0)
      expect(l.exceptions).toBeLessThanOrEqual(500)
      expect(l.kupiecP).toBeGreaterThanOrEqual(0)
      expect(l.kupiecP).toBeLessThanOrEqual(1)
      expect(l.christoffersenP).toBeGreaterThanOrEqual(0)
      expect(l.christoffersenP).toBeLessThanOrEqual(1)
      expect(typeof l.pass).toBe('boolean')
    }
  })
})
