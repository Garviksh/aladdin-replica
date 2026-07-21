import { describe, expect, it } from 'vitest'
import { buildImpactPrompt, computeImpact, parseImpactEvents } from '../src/assistant/impact'
import { getMarket } from '../src/data/market'
import { estimateBetas } from '../src/engine/factors'

const m = getMarket(20260721, 'sim')
const betas = estimateBetas(m.portfolio.positions, m.returns, m.benchmarkReturns)

describe('impact parsing', () => {
  it('extracts a JSON array from noisy model output', () => {
    const text =
      'Sure:\n[{"scope":"NVDA","factor":"price","direction":-1,"magnitude":0.05,"confidence":0.8,"headline":"export ban"}]\nhope that helps'
    const ev = parseImpactEvents(text)
    expect(ev.length).toBe(1)
    expect(ev[0].scope).toBe('NVDA')
    expect(ev[0].direction).toBe(-1)
    expect(ev[0].factor).toBe('price')
  })

  it('drops invalid events (bad scope/factor/zero magnitude)', () => {
    const text =
      '[{"scope":"","factor":"price","magnitude":0.05},{"scope":"MARKET","factor":"nonsense","magnitude":0.1},{"scope":"MARKET","factor":"equity","direction":1,"magnitude":0,"confidence":1}]'
    expect(parseImpactEvents(text).length).toBe(0)
  })

  it('returns [] on non-JSON', () => {
    expect(parseImpactEvents('no json here')).toEqual([])
  })
})

describe('impact computation', () => {
  it('a single-name price drop hits only that holding, negative', () => {
    const res = computeImpact(
      [{ scope: 'NVDA', factor: 'price', direction: -1, magnitude: 0.1, confidence: 1 }],
      m.portfolio,
      betas,
    )
    expect(res.rows.length).toBe(1)
    expect(res.rows[0].ticker).toBe('NVDA')
    expect(res.rows[0].pnlPct).toBeCloseTo(-0.1, 2)
  })

  it('a market equity shock moves the whole book', () => {
    const res = computeImpact(
      [{ scope: 'MARKET', factor: 'equity', direction: -1, magnitude: 0.05, confidence: 1 }],
      m.portfolio,
      betas,
    )
    expect(res.rows.length).toBeGreaterThan(5)
    expect(res.totalPnl).toBeLessThan(0)
  })

  it('builds a prompt listing tickers and MARKET scope', () => {
    const p = buildImpactPrompt([{ title: 'x', url: 'u', source: 's', date: '' }], ['AAPL', 'NVDA'])
    expect(p).toContain('NVDA')
    expect(p).toContain('MARKET')
  })
})
