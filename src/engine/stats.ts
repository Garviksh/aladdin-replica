// Basic statistics used by the risk and performance engines.

export function mean(xs: number[]): number {
  if (xs.length === 0) return 0
  let s = 0
  for (const x of xs) s += x
  return s / xs.length
}

export function variance(xs: number[], sample = true): number {
  const n = xs.length
  if (n < 2) return 0
  const m = mean(xs)
  let ss = 0
  for (const x of xs) ss += (x - m) * (x - m)
  return ss / (sample ? n - 1 : n)
}

export function std(xs: number[], sample = true): number {
  return Math.sqrt(variance(xs, sample))
}

export function covariance(xs: number[], ys: number[], sample = true): number {
  const n = Math.min(xs.length, ys.length)
  if (n < 2) return 0
  const mx = mean(xs)
  const my = mean(ys)
  let s = 0
  for (let i = 0; i < n; i++) s += (xs[i] - mx) * (ys[i] - my)
  return s / (sample ? n - 1 : n)
}

/** Symmetric covariance matrix of the given return series. */
export function covMatrix(series: number[][], sample = true): number[][] {
  const k = series.length
  const m: number[][] = Array.from({ length: k }, () => new Array<number>(k).fill(0))
  for (let i = 0; i < k; i++) {
    for (let j = i; j < k; j++) {
      const c = covariance(series[i], series[j], sample)
      m[i][j] = c
      m[j][i] = c
    }
  }
  return m
}

export function correlation(xs: number[], ys: number[]): number {
  const denom = std(xs) * std(ys)
  return denom > 0 ? covariance(xs, ys) / denom : 0
}

/** Linear-interpolated percentile. p in [0, 1]. */
export function percentile(xs: number[], p: number): number {
  if (xs.length === 0) return NaN
  const s = [...xs].sort((a, b) => a - b)
  const idx = (s.length - 1) * p
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  if (lo === hi) return s[lo]
  return s[lo] + (s[hi] - s[lo]) * (idx - lo)
}
