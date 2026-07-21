// Monochrome-friendly formatting helpers.
// Negatives use accounting parentheses; direction uses ▲/▼ markers rather than
// colour so the UI stays true black-and-white and colour-blind safe.

export function fmtCurrency(
  v: number,
  opts?: { decimals?: number; compact?: boolean },
): string {
  const decimals = opts?.decimals ?? 0
  if (opts?.compact) {
    const abs = Math.abs(v)
    const sign = v < 0 ? '-' : ''
    if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`
    if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`
    if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}K`
  }
  const s = Math.abs(v).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  return v < 0 ? `($${s})` : `$${s}`
}

export function fmtNumber(v: number, decimals = 2): string {
  return v.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/** v is a fraction: 0.05 -> "5.00%". */
export function fmtPct(v: number, decimals = 2): string {
  return `${(v * 100).toFixed(decimals)}%`
}

/** Signed percent with accounting parentheses for negatives. */
export function fmtSignedPct(v: number, decimals = 2): string {
  const s = `${(Math.abs(v) * 100).toFixed(decimals)}%`
  return v < 0 ? `(${s})` : `${s}`
}

export function marker(v: number): string {
  if (v > 0) return '▲'
  if (v < 0) return '▼'
  return '—'
}

export function signClass(v: number): 'pos' | 'neg' | 'flat' {
  if (v > 0) return 'pos'
  if (v < 0) return 'neg'
  return 'flat'
}
