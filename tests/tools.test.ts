import { describe, expect, it } from 'vitest'
import { buildAnalytics, getMarket } from '../src/engine'
import { makeToolContext, runTool, TOOL_SPECS } from '../src/assistant/tools'
import { hasMacroData } from '../src/data/macro'

const analytics = buildAnalytics(20260721, 'sim')
const market = getMarket(20260721, 'sim')
const ctx = makeToolContext(analytics, market)
const firstTicker = analytics.portfolio.positions[0].instrument.ticker

describe('copilot tool layer', () => {
  it('exposes well-formed function specs', () => {
    expect(TOOL_SPECS.length).toBeGreaterThanOrEqual(8)
    for (const t of TOOL_SPECS) {
      expect(t.type).toBe('function')
      expect(typeof t.function.name).toBe('string')
      expect(typeof t.function.description).toBe('string')
      expect(t.function.parameters.type).toBe('object')
    }
  })

  it('list_holdings returns one row per position', () => {
    const rows = runTool('list_holdings', {}, ctx) as unknown[]
    expect(rows.length).toBe(analytics.portfolio.positions.length)
  })

  it('get_holding resolves a real ticker and rejects unknown ones', () => {
    const ok = runTool('get_holding', { ticker: firstTicker.toLowerCase() }, ctx) as Record<string, unknown>
    expect(ok.ticker).toBe(firstTicker)
    expect(ok.betas).toBeDefined()
    const bad = runTool('get_holding', { ticker: 'ZZZZ' }, ctx) as Record<string, unknown>
    expect(bad.error).toBeDefined()
  })

  it('get_risk returns numeric metrics', () => {
    const r = runTool('get_risk', {}, ctx) as Record<string, number>
    expect(Number.isFinite(r.annualVolPct)).toBe(true)
    expect(Number.isFinite(r.var99_1d)).toBe(true)
    expect(Number.isFinite(r.beta)).toBe(true)
  })

  it('stress_test applies factor shocks to the book', () => {
    const res = runTool('stress_test', { equity: -0.2 }, ctx) as Record<string, unknown>
    expect(Number.isFinite(res.totalPnl as number)).toBe(true)
    expect((res.totalPnl as number)).toBeLessThan(0) // equity drop → loss
  })

  it('price_move computes a direct holding P&L', () => {
    const res = runTool('price_move', { ticker: firstTicker, pct: -0.1 }, ctx) as Record<string, number>
    expect(res.pnl).toBeLessThan(0)
    expect(Number.isFinite(res.pctOfNav)).toBe(true)
  })

  it('get_scenario lists all and fetches one by key', () => {
    const all = runTool('get_scenario', {}, ctx) as unknown[]
    expect(all.length).toBe(analytics.scenarios.length)
    const one = runTool('get_scenario', { key: 'gfc2008' }, ctx) as Record<string, unknown>
    expect(one.key).toBe('gfc2008')
    expect(one.realized).toBe(true)
  })

  it('get_macro reports a loaded state consistent with the baked data', () => {
    const m = runTool('get_macro', {}, ctx) as Record<string, unknown>
    expect(m.loaded).toBe(hasMacroData())
    if (!hasMacroData()) expect(m.note).toContain('refresh-macro')
  })

  it('returns an error object for an unknown tool', () => {
    const r = runTool('does_not_exist', {}, ctx) as Record<string, unknown>
    expect(r.error).toBeDefined()
  })
})
