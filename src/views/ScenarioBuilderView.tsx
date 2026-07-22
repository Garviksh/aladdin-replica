import { useMemo, useState } from 'react'
import { DataTable, type Column } from '../components/DataTable'
import { Delta } from '../components/Delta'
import { KpiTile } from '../components/KpiTile'
import { Panel } from '../components/Panel'
import { FACTORS } from '../data/universe'
import { getMarket } from '../engine'
import { estimateBetas } from '../engine/factors'
import { SCENARIOS } from '../engine/scenarios'
import { computeStressImpact, type StressRow } from '../engine/stress'
import { fmtCurrency, fmtSignedPct } from '../lib/format'
import { usePortfolio } from '../state/PortfolioContext'
import type { FactorKey } from '../types/domain'

const EMPTY: Record<FactorKey, number> = { equity: 0, rates: 0, credit: 0, commodity: 0, fx: 0 }

export function ScenarioBuilderView() {
  const { seed, mode } = usePortfolio()
  const market = useMemo(() => getMarket(seed, mode), [seed, mode])
  const betas = useMemo(
    () => estimateBetas(market.portfolio.positions, market.returns, market.benchmarkReturns),
    [market],
  )
  const [shocks, setShocks] = useState<Record<FactorKey, number>>(EMPTY)
  const result = useMemo(
    () => computeStressImpact(market.portfolio, betas, shocks),
    [market, betas, shocks],
  )

  const setFactor = (k: FactorKey, v: number) => setShocks((s) => ({ ...s, [k]: v }))
  const applyPreset = (sh: Partial<Record<FactorKey, number>>) => setShocks({ ...EMPTY, ...sh })

  const cols: Column<StressRow>[] = [
    {
      key: 't',
      header: 'Ticker',
      render: (r) => (
        <span className="mono">
          <strong>{r.ticker}</strong>
        </span>
      ),
    },
    { key: 'n', header: 'Name', render: (r) => r.name },
    {
      key: 'pnl',
      header: 'P&L',
      num: true,
      render: (r) => <Delta value={r.pnl}>{fmtCurrency(Math.abs(r.pnl), { compact: true })}</Delta>,
    },
    {
      key: 'pct',
      header: '% of Position',
      num: true,
      render: (r) => <Delta value={r.pnlPct}>{fmtSignedPct(r.pnlPct)}</Delta>,
    },
  ]

  return (
    <div className="view">
      <Panel title="Scenario Builder" hint="apply factor shocks → P&L via your data-driven betas">
        <div className="scenario-grid">
          {FACTORS.map((f) => (
            <div key={f.key} className="scenario-row">
              <span className="scenario-label">{f.label}</span>
              <input
                type="range"
                min={-40}
                max={40}
                step={1}
                value={Math.round(shocks[f.key] * 100)}
                onChange={(e) => setFactor(f.key, Number(e.target.value) / 100)}
              />
              <span className="scenario-val mono">{fmtSignedPct(shocks[f.key], 0)}</span>
            </div>
          ))}
        </div>
        <div className="seg-controls" style={{ marginTop: 10 }}>
          <span className="muted">Presets:</span>
          {SCENARIOS.map((s) => (
            <button key={s.key} className="btn" onClick={() => applyPreset(s.shocks)}>
              {s.label}
            </button>
          ))}
          <button className="btn dark" onClick={() => setShocks(EMPTY)}>
            Reset
          </button>
        </div>
      </Panel>

      <div className="kpi-grid">
        <KpiTile
          label="Estimated Book P&L"
          value={
            <Delta value={result.totalPnl}>
              {fmtCurrency(Math.abs(result.totalPnl), { compact: true })}
            </Delta>
          }
          sub={<Delta value={result.totalPct}>{fmtSignedPct(result.totalPct)}</Delta>}
        />
        <KpiTile
          label="Positions Affected"
          value={result.rows.length}
          sub={`of ${market.portfolio.positions.length}`}
        />
        <KpiTile
          label="NAV"
          value={fmtCurrency(market.portfolio.totalValue, { compact: true })}
          sub="invested book"
        />
      </div>

      <Panel title="Impact by Holding" flush>
        <DataTable columns={cols} rows={result.rows} rowKey={(r) => r.ticker} />
      </Panel>

      <p className="disclaimer">
        Hypothetical factor-shock stress test using your data-driven betas. Model estimate, not
        investment advice.
      </p>
    </div>
  )
}
