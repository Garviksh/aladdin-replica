// Portfolio construction: unconstrained min-variance (long-only clamp) and an
// iterative risk-parity solver. Inputs are a daily covariance matrix.

function solve(A: number[][], b: number[]): number[] | null {
  const n = b.length
  const M = A.map((row, i) => [...row, b[i]])
  for (let col = 0; col < n; col++) {
    let piv = col
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r
    if (Math.abs(M[piv][col]) < 1e-15) return null
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

function normalize(w: number[]): number[] {
  const s = w.reduce((a, b) => a + b, 0)
  return s !== 0 ? w.map((v) => v / s) : w.map(() => 1 / w.length)
}

/** Long-only minimum-variance weights (Σ⁻¹1, negatives clamped, renormalized). */
export function minVarianceWeights(cov: number[][]): number[] {
  const k = cov.length
  const x = solve(
    cov.map((r) => [...r]),
    new Array<number>(k).fill(1),
  )
  if (!x) return new Array<number>(k).fill(1 / k)
  const clamped = x.map((v) => Math.max(0, v))
  return clamped.some((v) => v > 0) ? normalize(clamped) : new Array<number>(k).fill(1 / k)
}

/** Equal-risk-contribution (risk parity) weights via multiplicative iteration. */
export function riskParityWeights(cov: number[][], iters = 300): number[] {
  const k = cov.length
  let w = new Array<number>(k).fill(1 / k)
  for (let it = 0; it < iters; it++) {
    const sw = cov.map((row) => row.reduce((a, c, j) => a + c * w[j], 0))
    const rc = w.map((wi, i) => wi * sw[i])
    const total = rc.reduce((a, b) => a + b, 0)
    const target = total / k
    const next = w.map((wi, i) => (rc[i] > 0 ? wi * Math.sqrt(target / rc[i]) : wi))
    w = normalize(next)
  }
  return w
}

/** Annualized portfolio volatility for a weight vector and daily covariance. */
export function portfolioVol(cov: number[][], w: number[]): number {
  let v = 0
  for (let i = 0; i < w.length; i++) {
    let s = 0
    for (let j = 0; j < w.length; j++) s += cov[i][j] * w[j]
    v += w[i] * s
  }
  return Math.sqrt(Math.max(0, v)) * Math.sqrt(252)
}
