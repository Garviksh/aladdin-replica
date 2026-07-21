import type {
  ComplianceRule,
  ComplianceStatus,
  Portfolio,
  Position,
  RiskMetrics,
} from '../types/domain'
import { fmtPct } from '../lib/format'

function groupWeights(
  positions: Position[],
  denom: number,
  keyFn: (p: Position) => string,
): Map<string, number> {
  const m = new Map<string, number>()
  for (const p of positions) {
    const key = keyFn(p)
    m.set(key, (m.get(key) ?? 0) + p.marketValue / denom)
  }
  return m
}

function topEntry(m: Map<string, number>): { k: string; v: number } {
  let best = { k: '—', v: 0 }
  for (const [k, v] of m) if (v > best.v) best = { k, v }
  return best
}

/** Ceiling rule: status by how the observed value compares to limit / warn band. */
function ceilingRule(
  id: string,
  label: string,
  description: string,
  limit: number,
  observed: number,
  observedLabel: string,
  warnAt: number,
): ComplianceRule {
  let status: ComplianceStatus = 'pass'
  if (observed > limit) status = 'breach'
  else if (observed > warnAt) status = 'warn'
  return { id, label, description, limit: `≤ ${fmtPct(limit)}`, observed: observedLabel, status }
}

/** Evaluate the mandate rule set. Limits are expressed as a % of NAV. */
export function evaluateCompliance(portfolio: Portfolio, risk: RiskMetrics): ComplianceRule[] {
  const total = portfolio.totalValue
  const positions = portfolio.positions
  const rules: ComplianceRule[] = []

  // POS-01 — max single position weight <= 10% of NAV.
  const maxPos = positions.reduce(
    (m, p) => (p.weight > m.v ? { k: p.instrument.ticker, v: p.weight } : m),
    { k: '—', v: 0 },
  )
  rules.push(
    ceilingRule(
      'POS-01',
      'Max single position',
      'No position may exceed 10% of NAV.',
      0.1,
      maxPos.v,
      `${maxPos.k} at ${fmtPct(maxPos.v)}`,
      0.08,
    ),
  )

  // CON-01 — max sector concentration <= 30% of NAV.
  const sectors = groupWeights(positions, total, (p) => p.instrument.sector)
  const topSector = topEntry(sectors)
  rules.push(
    ceilingRule(
      'CON-01',
      'Max sector concentration',
      'No single sector may exceed 30% of NAV.',
      0.3,
      topSector.v,
      `${topSector.k} at ${fmtPct(topSector.v)}`,
      0.25,
    ),
  )

  // ALLOC-01 — equity allocation ceiling <= 70% of NAV.
  const byClass = groupWeights(positions, total, (p) => p.instrument.assetClass)
  const eq = byClass.get('Equity') ?? 0
  rules.push(
    ceilingRule(
      'ALLOC-01',
      'Equity allocation ceiling',
      'Equity exposure may not exceed 70% of NAV.',
      0.7,
      eq,
      fmtPct(eq),
      0.6,
    ),
  )

  // RISK-01 — 1-day 99% VaR <= 4% of NAV.
  const varPct = total > 0 ? risk.var99_1d / total : 0
  rules.push(
    ceilingRule(
      'RISK-01',
      '1-day 99% VaR limit',
      '1-day 99% VaR must stay within 4% of NAV.',
      0.04,
      varPct,
      fmtPct(varPct),
      0.035,
    ),
  )

  // CASH-01 — cash within 0%–20% band (no leverage).
  const cashW = total > 0 ? portfolio.cash / total : 0
  rules.push(
    ceilingRule(
      'CASH-01',
      'Cash within band',
      'Cash must remain between 0% and 20% of NAV (no leverage).',
      0.2,
      cashW,
      fmtPct(cashW),
      0.18,
    ),
  )

  // DIV-01 — minimum diversification (>= 12 positions).
  const n = positions.length
  rules.push({
    id: 'DIV-01',
    label: 'Minimum diversification',
    description: 'The book must hold at least 12 distinct positions.',
    limit: '≥ 12 positions',
    observed: `${n} positions`,
    status: n >= 12 ? 'pass' : n >= 10 ? 'warn' : 'breach',
  })

  return rules
}
