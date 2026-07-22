import type { FactorKey, Portfolio, ScenarioResult } from '../types/domain'
import { betaOf, type BetaMap } from './factors'

interface ScenarioDef {
  key: string
  label: string
  description: string
  /** Factor returns applied under the scenario. */
  shocks: Partial<Record<FactorKey, number>>
}

// Sign conventions (consistent with the instrument betas):
//   equity    +up / −down (broad equity market)
//   rates     +bond-friendly (yields DOWN, bond prices up) / −yields up
//   credit    +spreads tighten (risk-on) / −spreads blow out
//   commodity +commodities up / −down
//   fx        +USD weaker / risk-on for foreign assets / −USD stronger, risk-off
// Magnitudes are representative of the historical episode, not exact replays.
export const SCENARIOS: ScenarioDef[] = [
  {
    key: 'gfc2008',
    label: '2008 Global Financial Crisis',
    description: 'Sep–Nov 2008 · Lehman collapse: equity crash, credit blowout, flight to Treasuries.',
    shocks: { equity: -0.42, credit: -0.28, rates: 0.14, commodity: -0.3, fx: -0.1 },
  },
  {
    key: 'covid2020',
    label: '2020 COVID Crash',
    description: 'Feb–Mar 2020 · pandemic shock: fastest bear market, oil collapse, bond rally.',
    shocks: { equity: -0.34, commodity: -0.45, credit: -0.16, rates: 0.09, fx: -0.06 },
  },
  {
    key: 'inflation2022',
    label: '2022 Inflation & Fed Hikes',
    description: '2022 · CPI spike + rapid hikes: stocks AND bonds fall together, USD surges.',
    shocks: { equity: -0.24, rates: -0.17, credit: -0.1, commodity: 0.2, fx: -0.12 },
  },
  {
    key: 'svb2023',
    label: '2023 Regional Banking Crisis',
    description: 'Mar 2023 · SVB failure: financials hit, sharp flight-to-quality bond rally.',
    shocks: { equity: -0.08, credit: -0.09, rates: 0.11, fx: -0.03 },
  },
  {
    key: 'selloff2018',
    label: '2018 Q4 Sell-off',
    description: 'Oct–Dec 2018 · tightening + growth scare: broad equity drawdown.',
    shocks: { equity: -0.16, rates: 0.05, credit: -0.07, commodity: -0.1 },
  },
  {
    key: 'china2015',
    label: '2015–16 China Deval & Oil Crash',
    description: 'Aug 2015 / Jan 2016 · yuan devaluation and oil collapse; EM stress.',
    shocks: { equity: -0.12, commodity: -0.35, credit: -0.1, rates: 0.05, fx: -0.1 },
  },
  {
    key: 'taper2013',
    label: '2013 Taper Tantrum',
    description: 'May–Jun 2013 · Fed taper signal: yields spike, EM and duration sell off.',
    shocks: { rates: -0.11, equity: -0.06, credit: -0.05, fx: -0.08 },
  },
  {
    key: 'euro2011',
    label: '2011 Euro Debt & US Downgrade',
    description: 'Aug 2011 · sovereign crisis + S&P US downgrade: risk-off, bond rally.',
    shocks: { equity: -0.17, credit: -0.14, rates: 0.1, commodity: -0.08, fx: -0.06 },
  },
  {
    key: 'dotcom2000',
    label: '2000 Dot-com Bust',
    description: '2000–02 · tech-multiple collapse concentrated in growth equities.',
    shocks: { equity: -0.3, rates: 0.06, credit: -0.06 },
  },
  {
    key: 'blackmonday1987',
    label: '1987 Black Monday',
    description: 'Oct 1987 · one-day ~22% equity crash; sharp risk-off.',
    shocks: { equity: -0.25, rates: 0.05, credit: -0.05 },
  },
  {
    key: 'stagflation',
    label: 'Stagflation (1970s-style)',
    description: 'High inflation + weak growth: commodities spike, bonds fall, equities de-rate.',
    shocks: { equity: -0.18, rates: -0.15, commodity: 0.35, credit: -0.08, fx: -0.05 },
  },
  {
    key: 'oilshock',
    label: 'Oil Supply Shock',
    description: 'Geopolitical supply disruption: energy spikes, inflation lifts yields.',
    shocks: { commodity: 0.45, equity: -0.06, rates: -0.06 },
  },
  {
    key: 'rateshock',
    label: 'Rate Shock (+200 bps)',
    description: 'Abrupt +200bp parallel move: bond prices fall, equities wobble.',
    shocks: { rates: -0.16, equity: -0.07, credit: -0.05 },
  },
  {
    key: 'creditcrunch',
    label: 'Credit Crunch',
    description: 'Funding freeze: credit spreads blow out with a moderate equity drop.',
    shocks: { credit: -0.3, equity: -0.12, rates: 0.06 },
  },
  {
    key: 'riskoff',
    label: 'Broad Risk-Off',
    description: 'Generic flight to quality: equities and credit down, Treasuries up, USD up.',
    shocks: { equity: -0.15, credit: -0.1, rates: 0.1, commodity: -0.08, fx: -0.06 },
  },
  {
    key: 'softlanding',
    label: 'Soft Landing / Goldilocks',
    description: 'Benign disinflation: equities and credit rally, rates ease modestly.',
    shocks: { equity: 0.1, credit: 0.05, rates: 0.04, commodity: 0.03, fx: 0.03 },
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
