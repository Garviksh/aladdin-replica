import { describe, expect, it } from 'vitest'
import { getMarket } from '../src/engine'
import { estimateBetas } from '../src/engine/factors'
import {
  deriveMacroSignals,
  macroFactorShocks,
  macroNowcast,
  MACRO_SCALE,
} from '../src/engine/macro'
import { bakedMacro, hasMacroData } from '../src/data/macro'
import type { MacroIndicator } from '../src/data/macro'

const riskOffInflationary: MacroIndicator[] = [
  { id: 'VIXCLS', label: 'VIX', value: 28, unit: '' },
  { id: 'T10Y2Y', label: '10Y-2Y', value: -0.4, unit: '%' },
  { id: 'CPIYoY', label: 'CPI', value: 4.0, unit: '%' },
  { id: 'UNRATE', label: 'Unemployment', value: 4.5, unit: '%', prev: 4.1 },
  { id: 'FEDFUNDS', label: 'Fed Funds', value: 5.0, unit: '%', prev: 4.75 },
  { id: 'DTWEXBGS', label: 'USD', value: 125, unit: '', prev: 122 },
]

describe('macro signal engine', () => {
  it('returns no signals when there are no indicators', () => {
    expect(deriveMacroSignals([])).toEqual([])
  })

  it('reads a risk-off, inflationary regime correctly', () => {
    const signals = deriveMacroSignals(riskOffInflationary)
    const eq = signals.find((s) => s.factor === 'equity')
    const cmdty = signals.find((s) => s.factor === 'commodity')
    const fx = signals.find((s) => s.factor === 'fx')
    expect(eq).toBeDefined()
    expect(eq!.tilt).toBeLessThan(0)
    expect(eq!.bias).toBe('risk-off')
    expect(cmdty!.tilt).toBeGreaterThan(0) // hot CPI supports commodities
    expect(fx!.tilt).toBeLessThan(0) // stronger USD = foreign headwind
  })

  it('clamps tilts to [-1, 1] and scales shocks', () => {
    const signals = deriveMacroSignals(riskOffInflationary)
    for (const s of signals) {
      expect(s.tilt).toBeGreaterThanOrEqual(-1)
      expect(s.tilt).toBeLessThanOrEqual(1)
    }
    const shocks = macroFactorShocks(signals)
    for (const s of signals) {
      expect(shocks[s.factor]).toBeCloseTo(s.tilt * MACRO_SCALE, 10)
    }
  })

  it('produces a finite nowcast P&L on the live book', () => {
    const m = getMarket(20260721, 'sim')
    const betas = estimateBetas(m.portfolio.positions, m.returns, m.benchmarkReturns)
    const nc = macroNowcast(m.portfolio, betas, riskOffInflationary)
    expect(Number.isFinite(nc.impact.totalPnl)).toBe(true)
    expect(Number.isFinite(nc.impact.totalPct)).toBe(true)
    expect(nc.signals.length).toBeGreaterThan(0)
  })

  it('never reports macro data as loaded without indicators behind it', () => {
    // The real invariant: no fabricated macro numbers. The gate must track the
    // baked data, whether the seed is still empty or refresh-macro has run.
    const m = bakedMacro()
    expect(hasMacroData()).toBe(m.indicators.length > 0)
    if (!hasMacroData()) expect(m.indicators).toEqual([])
  })
})
