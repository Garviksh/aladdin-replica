import type { Portfolio } from '../types/domain'

function csvCell(s: string): string {
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Serialize the position blotter to CSV text (pure, testable). */
export function toHoldingsCsv(portfolio: Portfolio): string {
  const head = [
    'Ticker',
    'Name',
    'AssetClass',
    'Sector',
    'Region',
    'Quantity',
    'Price',
    'MarketValue',
    'WeightPct',
    'DayChangePct',
    'UnrealizedPnL',
  ]
  const rows = portfolio.positions.map((p) =>
    [
      p.instrument.ticker,
      csvCell(p.instrument.name),
      csvCell(p.instrument.assetClass),
      csvCell(p.instrument.sector),
      csvCell(p.instrument.region),
      String(p.quantity),
      p.price.toFixed(2),
      p.marketValue.toFixed(2),
      (p.weight * 100).toFixed(2),
      (p.dayChangePct * 100).toFixed(2),
      p.unrealizedPnl.toFixed(2),
    ].join(','),
  )
  return [head.join(','), ...rows].join('\n')
}

/** Trigger a client-side text/CSV download (browser only). */
export function downloadText(filename: string, text: string, type = 'text/csv'): void {
  const blob = new Blob([text], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
