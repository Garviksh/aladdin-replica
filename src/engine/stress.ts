import { FACTORS } from '../data/universe'
import type { FactorKey, Portfolio } from '../types/domain'
import { betaOf, type BetaMap } from './factors'

export interface StressRow {
  ticker: string
  name: string
  pnl: number
  pnlPct: number
}

export interface StressResult {
  rows: StressRow[]
  totalPnl: number
  totalPct: number
}

/**
 * Apply a set of factor shocks to the book and return per-holding and total P&L,
 * using the data-driven factor betas: instrument return = Σ_k β_ik · shock_k.
 */
export function computeStressImpact(
  portfolio: Portfolio,
  betas: BetaMap,
  shocks: Partial<Record<FactorKey, number>>,
): StressResult {
  const keys = FACTORS.map((f) => f.key)
  const rows: StressRow[] = portfolio.positions
    .map((p) => {
      let r = 0
      for (const k of keys) {
        const s = shocks[k]
        if (s) r += betaOf(betas, p, k) * s
      }
      const pnl = p.marketValue * r
      return {
        ticker: p.instrument.ticker,
        name: p.instrument.name,
        pnl,
        pnlPct: p.marketValue ? pnl / p.marketValue : 0,
      }
    })
    .filter((x) => Math.abs(x.pnl) >= 1)
    .sort((a, b) => a.pnl - b.pnl)

  const totalPnl = rows.reduce((a, r) => a + r.pnl, 0)
  return { rows, totalPnl, totalPct: portfolio.investedValue ? totalPnl / portfolio.investedValue : 0 }
}
