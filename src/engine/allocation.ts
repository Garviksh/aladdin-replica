import type { Allocation, AllocationRow, Portfolio, Position } from '../types/domain'

function group(
  positions: Position[],
  total: number,
  keyFn: (p: Position) => string,
  extra?: { label: string; value: number },
): AllocationRow[] {
  const m = new Map<string, number>()
  for (const p of positions) m.set(keyFn(p), (m.get(keyFn(p)) ?? 0) + p.marketValue)
  if (extra) m.set(extra.label, (m.get(extra.label) ?? 0) + extra.value)
  return [...m.entries()]
    .map(([label, value]) => ({ label, value, weight: total > 0 ? value / total : 0 }))
    .sort((a, b) => b.value - a.value)
}

export function computeAllocation(portfolio: Portfolio): Allocation {
  const total = portfolio.totalValue
  const { positions, cash } = portfolio
  return {
    byAssetClass: group(positions, total, (p) => p.instrument.assetClass, {
      label: 'Cash',
      value: cash,
    }),
    bySector: group(positions, total, (p) => p.instrument.sector),
    byRegion: group(positions, total, (p) => p.instrument.region),
  }
}
