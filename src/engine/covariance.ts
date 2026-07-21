import { covMatrix, mean } from './stats'

export type CovMethod = 'sample' | 'ewma' | 'shrinkage'

export const COV_METHODS: { id: CovMethod; label: string }[] = [
  { id: 'sample', label: 'Sample' },
  { id: 'ewma', label: 'EWMA' },
  { id: 'shrinkage', label: 'Shrinkage' },
]

/** RiskMetrics-style exponentially-weighted covariance (recent data weighted more). */
export function ewmaCovMatrix(series: number[][], lambda = 0.94): number[][] {
  const k = series.length
  const T = series[0]?.length ?? 0
  const means = series.map((s) => mean(s))
  const dev = series.map((s, i) => s.map((v) => v - means[i]))

  const weights = new Array<number>(T)
  let wsum = 0
  for (let t = 0; t < T; t++) {
    weights[t] = Math.pow(lambda, T - 1 - t)
    wsum += weights[t]
  }

  const m = Array.from({ length: k }, () => new Array<number>(k).fill(0))
  for (let i = 0; i < k; i++) {
    for (let j = i; j < k; j++) {
      let c = 0
      for (let t = 0; t < T; t++) c += weights[t] * dev[i][t] * dev[j][t]
      c = wsum > 0 ? c / wsum : 0
      m[i][j] = c
      m[j][i] = c
    }
  }
  return m
}

/** Ledoit–Wolf (2004) shrinkage toward a scaled identity — better conditioned. */
export function shrinkageCovMatrix(series: number[][]): number[][] {
  const S = covMatrix(series, false)
  const k = S.length
  const T = series[0]?.length ?? 0
  if (k === 0 || T === 0) return S

  const mu = S.reduce((a, row, i) => a + row[i], 0) / k // trace/k = avg variance

  let d2 = 0
  for (let i = 0; i < k; i++) {
    for (let j = 0; j < k; j++) {
      const t = i === j ? S[i][j] - mu : S[i][j]
      d2 += t * t
    }
  }
  d2 /= k

  const means = series.map((s) => mean(s))
  const dev = series.map((s, idx) => s.map((v) => v - means[idx]))
  let bbar2 = 0
  for (let t = 0; t < T; t++) {
    let f = 0
    for (let i = 0; i < k; i++) {
      for (let j = 0; j < k; j++) {
        const diff = dev[i][t] * dev[j][t] - S[i][j]
        f += diff * diff
      }
    }
    bbar2 += f
  }
  bbar2 = bbar2 / (k * T * T)

  const b2 = Math.min(bbar2, d2)
  const delta = d2 > 0 ? b2 / d2 : 0

  return S.map((row, i) => row.map((v, j) => (1 - delta) * v + (i === j ? delta * mu : 0)))
}

export function covByMethod(series: number[][], method: CovMethod): number[][] {
  if (method === 'ewma') return ewmaCovMatrix(series)
  if (method === 'shrinkage') return shrinkageCovMatrix(series)
  return covMatrix(series)
}
