import { describe, expect, it } from 'vitest'
import { buildAnalytics } from '../src/engine'
import { SCENARIOS } from '../src/engine/scenarios'

const a = buildAnalytics(20260721, 'sim')

describe('stress scenario library', () => {
  it('provides a broad, historically-calibrated set', () => {
    expect(SCENARIOS.length).toBeGreaterThanOrEqual(14)
    // keys are unique
    const keys = new Set(SCENARIOS.map((s) => s.key))
    expect(keys.size).toBe(SCENARIOS.length)
  })

  it('every scenario has a label, description and at least one factor shock', () => {
    for (const s of SCENARIOS) {
      expect(s.label.length).toBeGreaterThan(0)
      expect(s.description.length).toBeGreaterThan(0)
      expect(Object.keys(s.shocks).length).toBeGreaterThan(0)
    }
  })

  it('computes a finite P&L impact for every scenario', () => {
    expect(a.scenarios.length).toBe(SCENARIOS.length)
    for (const r of a.scenarios) {
      expect(Number.isFinite(r.pnl)).toBe(true)
      expect(Number.isFinite(r.pnlPct)).toBe(true)
      expect(typeof r.realized).toBe('boolean')
    }
  })

  it('marks several scenarios as realized from market history with a window', () => {
    const realized = a.scenarios.filter((s) => s.realized)
    expect(realized.length).toBeGreaterThanOrEqual(6)
    for (const s of realized) {
      expect(s.window && s.window.length > 0).toBe(true)
      expect(Object.keys(s.shocks).length).toBeGreaterThan(0)
    }
    // GFC is realized and still a large loss
    const gfc = a.scenarios.find((s) => s.key === 'gfc2008')!
    expect(gfc.realized).toBe(true)
    expect(gfc.pnl).toBeLessThan(0)
  })

  it('severe crises lose money and a benign scenario gains', () => {
    const gfc = a.scenarios.find((s) => s.key === 'gfc2008')
    const soft = a.scenarios.find((s) => s.key === 'softlanding')
    expect(gfc).toBeDefined()
    expect(soft).toBeDefined()
    expect(gfc!.pnl).toBeLessThan(0)
    expect(soft!.pnl).toBeGreaterThan(0)
  })

  it('covers the well-known historical episodes', () => {
    const keys = SCENARIOS.map((s) => s.key)
    for (const k of ['gfc2008', 'covid2020', 'inflation2022', 'dotcom2000', 'blackmonday1987']) {
      expect(keys).toContain(k)
    }
  })
})
