// Turns macro readings into directional factor tilts and an illustrative
// "nowcast" P&L on the book. These are heuristic, transparent signals — NOT
// forecasts — meant to show how macro conditions map onto the factor model.
import type { MacroIndicator } from '../data/macro'
import type { FactorKey, Portfolio } from '../types/domain'
import { computeStressImpact, type StressResult } from './stress'
import type { BetaMap } from './factors'

export interface MacroSignal {
  factor: FactorKey
  label: string
  /** Net tilt in [-1, 1]. Positive = supportive/risk-on for that factor. */
  tilt: number
  bias: 'risk-on' | 'risk-off' | 'neutral'
  rationale: string
}

const FACTOR_LABELS: Record<FactorKey, string> = {
  equity: 'Equity',
  rates: 'Rates (bonds)',
  credit: 'Credit',
  commodity: 'Commodity',
  fx: 'FX (USD)',
}

/** At full tilt (±1) a factor is shocked by this fraction in the nowcast. */
export const MACRO_SCALE = 0.03

function get(indicators: MacroIndicator[], id: string): MacroIndicator | undefined {
  return indicators.find((i) => i.id === id)
}

interface Contribution {
  factor: FactorKey
  delta: number
  reason: string
}

/** Transparent rule set: each triggered rule contributes a tilt to one factor. */
function contributions(indicators: MacroIndicator[]): Contribution[] {
  const out: Contribution[] = []
  const vix = get(indicators, 'VIXCLS')
  const curve = get(indicators, 'T10Y2Y')
  const cpi = get(indicators, 'CPIYoY')
  const unrate = get(indicators, 'UNRATE')
  const ff = get(indicators, 'FEDFUNDS')
  const usd = get(indicators, 'DTWEXBGS')

  if (vix) {
    if (vix.value >= 25) {
      out.push({ factor: 'equity', delta: -0.6, reason: `VIX ${vix.value} (high) → risk-off` })
      out.push({ factor: 'credit', delta: -0.5, reason: `VIX ${vix.value} → spreads at risk` })
    } else if (vix.value >= 18) {
      out.push({ factor: 'equity', delta: -0.25, reason: `VIX ${vix.value} (elevated)` })
      out.push({ factor: 'credit', delta: -0.2, reason: `VIX ${vix.value} (elevated)` })
    } else if (vix.value < 14) {
      out.push({ factor: 'equity', delta: 0.2, reason: `VIX ${vix.value} (calm) → risk-on` })
    }
  }

  if (curve) {
    if (curve.value < 0) {
      out.push({ factor: 'equity', delta: -0.4, reason: `10Y–2Y inverted (${curve.value}) → recession signal` })
      out.push({ factor: 'rates', delta: 0.4, reason: `Inverted curve favors duration` })
    } else if (curve.value < 0.3) {
      out.push({ factor: 'equity', delta: -0.15, reason: `Flat curve (${curve.value})` })
    }
  }

  if (cpi) {
    if (cpi.value >= 3.5) {
      out.push({ factor: 'commodity', delta: 0.4, reason: `CPI ${cpi.value}% (hot) → inflation` })
      out.push({ factor: 'rates', delta: -0.4, reason: `Hot CPI → yields up, bonds down` })
      out.push({ factor: 'equity', delta: -0.2, reason: `Hot CPI pressures multiples` })
    } else if (cpi.value >= 2.7) {
      out.push({ factor: 'commodity', delta: 0.2, reason: `CPI ${cpi.value}% (above target)` })
      out.push({ factor: 'rates', delta: -0.2, reason: `Above-target CPI` })
    } else if (cpi.value < 2) {
      out.push({ factor: 'rates', delta: 0.2, reason: `CPI ${cpi.value}% (soft) → bond-friendly` })
    }
  }

  if (unrate && unrate.prev != null) {
    const chg = unrate.value - unrate.prev
    if (chg >= 0.2) {
      out.push({ factor: 'equity', delta: -0.3, reason: `Unemployment rising (${unrate.prev}→${unrate.value})` })
      out.push({ factor: 'rates', delta: 0.2, reason: `Weakening labor → rate cuts` })
    } else if (chg <= -0.2) {
      out.push({ factor: 'equity', delta: 0.2, reason: `Unemployment falling (${unrate.prev}→${unrate.value})` })
    }
  }

  if (ff && ff.prev != null) {
    const chg = ff.value - ff.prev
    if (chg > 0.05) out.push({ factor: 'rates', delta: -0.3, reason: `Fed hiking (${ff.prev}→${ff.value}%)` })
    else if (chg < -0.05) out.push({ factor: 'rates', delta: 0.3, reason: `Fed easing (${ff.prev}→${ff.value}%)` })
  }

  if (usd && usd.prev != null) {
    const chg = usd.value / usd.prev - 1
    if (chg > 0.01) out.push({ factor: 'fx', delta: -0.3, reason: `USD strengthening → foreign-asset headwind` })
    else if (chg < -0.01) out.push({ factor: 'fx', delta: 0.3, reason: `USD weakening → foreign-asset tailwind` })
  }

  return out
}

const clamp = (x: number) => Math.max(-1, Math.min(1, x))

/** Aggregate the rule contributions into one signal per affected factor. */
export function deriveMacroSignals(indicators: MacroIndicator[]): MacroSignal[] {
  const byFactor = new Map<FactorKey, Contribution[]>()
  for (const c of contributions(indicators)) {
    const arr = byFactor.get(c.factor) ?? []
    arr.push(c)
    byFactor.set(c.factor, arr)
  }
  const signals: MacroSignal[] = []
  for (const [factor, cs] of byFactor) {
    const tilt = clamp(cs.reduce((a, c) => a + c.delta, 0))
    const bias = tilt > 0.05 ? 'risk-on' : tilt < -0.05 ? 'risk-off' : 'neutral'
    signals.push({
      factor,
      label: FACTOR_LABELS[factor],
      tilt,
      bias,
      rationale: cs.map((c) => c.reason).join('; '),
    })
  }
  // Stable, meaningful ordering: strongest headwinds first.
  return signals.sort((a, b) => a.tilt - b.tilt)
}

/** Convert macro signals into illustrative factor shocks. */
export function macroFactorShocks(signals: MacroSignal[]): Partial<Record<FactorKey, number>> {
  const shocks: Partial<Record<FactorKey, number>> = {}
  for (const s of signals) shocks[s.factor] = s.tilt * MACRO_SCALE
  return shocks
}

export interface MacroNowcast {
  signals: MacroSignal[]
  shocks: Partial<Record<FactorKey, number>>
  impact: StressResult
}

/** Illustrative macro nowcast: map current macro conditions to a book P&L. */
export function macroNowcast(
  portfolio: Portfolio,
  betas: BetaMap,
  indicators: MacroIndicator[],
): MacroNowcast {
  const signals = deriveMacroSignals(indicators)
  const shocks = macroFactorShocks(signals)
  const impact = computeStressImpact(portfolio, betas, shocks)
  return { signals, shocks, impact }
}
