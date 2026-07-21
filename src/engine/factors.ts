import { FACTORS } from '../data/universe'
import type { FactorKey, Position } from '../types/domain'

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
const RIDGE = 1e-6

export type BetaMap = Map<string, Partial<Record<FactorKey, number>>>

/** Solve A·x = b via Gauss–Jordan with partial pivoting. Returns null if singular. */
function solve(A: number[][], b: number[]): number[] | null {
  const n = b.length
  const M = A.map((row, i) => [...row, b[i]])
  for (let col = 0; col < n; col++) {
    let piv = col
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r
    if (Math.abs(M[piv][col]) < 1e-12) return null
    ;[M[col], M[piv]] = [M[piv], M[col]]
    const d = M[col][col]
    for (let j = col; j <= n; j++) M[col][j] /= d
    for (let r = 0; r < n; r++) {
      if (r === col) continue
      const f = M[r][col]
      for (let j = col; j <= n; j++) M[r][j] -= f * M[col][j]
    }
  }
  return M.map((row) => row[n])
}

/**
 * Estimate each holding's factor betas by **multivariate OLS** of its real
 * returns on the factor-proxy series (with an intercept and light ridge for
 * stability). This avoids the double-counting of univariate betas when proxies
 * are correlated. Factors without a proxy (e.g. FX) fall back to the model prior.
 */
export function estimateBetas(
  positions: Position[],
  returns: number[][],
  benchmarkReturns: number[],
): BetaMap {
  const proxyByKey: Partial<Record<FactorKey, number[]>> = { equity: benchmarkReturns }
  for (const [key, id] of Object.entries(PROXY_ID) as [FactorKey, string][]) {
    const idx = positions.findIndex((p) => p.instrument.id === id)
    if (idx >= 0) proxyByKey[key] = returns[idx]
  }

  const factorKeys = FACTORS.map((f) => f.key).filter((k) => proxyByKey[k]) as FactorKey[]
  const cols = factorKeys.map((k) => proxyByKey[k] as number[])
  const T = benchmarkReturns.length
  const p = cols.length + 1 // + intercept

  // XᵀX is constant across instruments; compute once (with ridge on the diagonal).
  const XtX: number[][] = Array.from({ length: p }, () => new Array<number>(p).fill(0))
  for (let t = 0; t < T; t++) {
    const xrow = [1, ...cols.map((c) => c[t])]
    for (let a = 0; a < p; a++) for (let b = 0; b < p; b++) XtX[a][b] += xrow[a] * xrow[b]
  }
  for (let a = 1; a < p; a++) XtX[a][a] += RIDGE

  const map: BetaMap = new Map()
  positions.forEach((pos, i) => {
    const y = returns[i]
    const Xty = new Array<number>(p).fill(0)
    for (let t = 0; t < T; t++) {
      Xty[0] += y[t]
      for (let a = 0; a < cols.length; a++) Xty[a + 1] += cols[a][t] * y[t]
    }
    const coef = solve(
      XtX.map((r) => [...r]),
      Xty,
    )
    const betas: Partial<Record<FactorKey, number>> = {}
    if (coef) factorKeys.forEach((k, j) => (betas[k] = coef[j + 1]))
    for (const f of FACTORS) {
      if (betas[f.key] === undefined) betas[f.key] = pos.instrument.betas[f.key] ?? 0
    }
    map.set(pos.instrument.id, betas)
  })
  return map
}

/** Resolve a beta: estimated if available, else the instrument's model prior. */
export function betaOf(map: BetaMap | undefined, p: Position, key: FactorKey): number {
  const est = map?.get(p.instrument.id)?.[key]
  return est !== undefined ? est : (p.instrument.betas[key] ?? 0)
}
