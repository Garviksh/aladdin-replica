import { FACTORS } from '../data/universe'
import type { FactorKey, Position } from '../types/domain'
import { covariance, variance } from './stats'

// Each factor is proxied by a real, tradable series so betas are data-driven:
//   equity   -> benchmark (SPY) returns (passed in)
//   rates    -> IEF (7-10y Treasuries)
//   credit   -> HYG (high yield)
//   commodity-> GLD (gold)
//   fx       -> no proxy in the default book -> falls back to the model prior
const PROXY_ID: Partial<Record<FactorKey, string>> = {
  rates: 'IEF',
  credit: 'HYG',
  commodity: 'GLD',
}

export type BetaMap = Map<string, Partial<Record<FactorKey, number>>>

/**
 * Estimate each holding's factor betas by univariate regression of its real
 * returns on each factor-proxy series: betaᵢₖ = cov(rᵢ, fₖ) / var(fₖ).
 * Where a proxy is unavailable (e.g. FX), the instrument's model prior is used.
 */
export function estimateBetas(
  positions: Position[],
  returns: number[][],
  benchmarkReturns: number[],
): BetaMap {
  const proxy: Partial<Record<FactorKey, number[]>> = { equity: benchmarkReturns }
  for (const [key, id] of Object.entries(PROXY_ID) as [FactorKey, string][]) {
    const idx = positions.findIndex((p) => p.instrument.id === id)
    if (idx >= 0) proxy[key] = returns[idx]
  }

  const proxyVar: Partial<Record<FactorKey, number>> = {}
  for (const f of FACTORS) {
    const s = proxy[f.key]
    if (s) proxyVar[f.key] = variance(s)
  }

  const map: BetaMap = new Map()
  positions.forEach((p, i) => {
    const betas: Partial<Record<FactorKey, number>> = {}
    for (const f of FACTORS) {
      const s = proxy[f.key]
      const v = proxyVar[f.key]
      betas[f.key] = s && v && v > 0 ? covariance(returns[i], s) / v : (p.instrument.betas[f.key] ?? 0)
    }
    map.set(p.instrument.id, betas)
  })
  return map
}

/** Resolve a beta: estimated if available, else the instrument's model prior. */
export function betaOf(map: BetaMap | undefined, p: Position, key: FactorKey): number {
  const est = map?.get(p.instrument.id)?.[key]
  return est !== undefined ? est : (p.instrument.betas[key] ?? 0)
}
