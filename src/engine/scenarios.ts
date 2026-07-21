import type { FactorKey, Portfolio, ScenarioResult } from '../types/domain'
import { betaOf, type BetaMap } from './factors'

interface ScenarioDef {
  key: string
  label: string
  description: string
  /** Factor returns applied under the scenario. */
  shocks: Partial<Record<FactorKey, number>>
}

// A positive "rates" shock is bond-friendly (yields down / prices up),
// consistent with the positive rates betas on bond instruments.
export const SCENARIOS: ScenarioDef[] = [
  {
    key: 'gfc2008',
    label: '2008 Global Financial Crisis',
    description: 'Equity crash, credit blowout, flight to quality in government bonds.',
    shocks: { equity: -0.4, credit: -0.25, rates: 0.12, commodity: -0.3, fx: -0.08 },
  },
  {
    key: 'covid2020',
    label: '2020 COVID Shock',
    description: 'Sudden equity and commodity sell-off with a government-bond rally.',
    shocks: { equity: -0.34, commodity: -0.45, credit: -0.15, rates: 0.08 },
  },
  {
    key: 'rateshock',
    label: 'Rate Shock (+200 bps)',
    description: 'Aggressive tightening; bond prices fall and equities wobble.',
    shocks: { rates: -0.15, equity: -0.06, credit: -0.05 },
  },
  {
    key: 'inflation',
    label: 'Inflation Surge',
    description: 'Commodities spike while bonds sell off and equities de-rate mildly.',
    shocks: { commodity: 0.35, rates: -0.1, equity: -0.04 },
  },
  {
    key: 'techderate',
    label: 'Tech De-rating',
    description: 'Growth-multiple compression concentrated in the equity factor.',
    shocks: { equity: -0.18 },
  },
]

/** Apply each scenario's factor shocks to the book and return the P&L impact. */
export function runScenarios(portfolio: Portfolio, betas?: BetaMap): ScenarioResult[] {
  const invested = portfolio.investedValue
  return SCENARIOS.map((s) => {
    let pnl = 0
    for (const p of portfolio.positions) {
      let r = 0
      for (const key of Object.keys(s.shocks) as FactorKey[]) {
        r += betaOf(betas, p, key) * (s.shocks[key] ?? 0)
      }
      pnl += p.marketValue * r
    }
    return {
      key: s.key,
      label: s.label,
      description: s.description,
      shocks: s.shocks,
      pnl,
      pnlPct: invested > 0 ? pnl / invested : 0,
    }
  })
}
