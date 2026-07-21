import { BarChart } from '../components/charts/BarChart'
import { DataTable, type Column } from '../components/DataTable'
import { Delta } from '../components/Delta'
import { KpiTile } from '../components/KpiTile'
import { Panel } from '../components/Panel'
import { fmtCurrency, fmtNumber, fmtPct } from '../lib/format'
import { usePortfolio } from '../state/PortfolioContext'
import type { ComponentRisk, ScenarioResult } from '../types/domain'

export function RiskView() {
  const { analytics } = usePortfolio()
  const { risk, portfolio, scenarios } = analytics
  const nav = portfolio.totalValue

  const factorItems = risk.factorExposures.map((f) => ({
    label: f.label,
    value: f.exposure,
    caption: fmtNumber(f.exposure, 2),
  }))

  const compCols: Column<ComponentRisk>[] = [
    {
      key: 't',
      header: 'Ticker',
      render: (c) => (
        <span className="mono">
          <strong>{c.ticker}</strong>
        </span>
      ),
    },
    { key: 'w', header: 'Weight', num: true, render: (c) => fmtPct(c.weight) },
    { key: 'sv', header: 'Standalone Vol', num: true, render: (c) => fmtPct(c.standaloneVol) },
    { key: 'mc', header: 'Marginal', num: true, render: (c) => fmtPct(c.marginal) },
    { key: 'cc', header: 'Contribution', num: true, render: (c) => fmtPct(c.contribution) },
    { key: 'pc', header: '% of Risk', num: true, render: (c) => fmtPct(c.pctOfRisk) },
  ]
  const compFooter = (
    <tfoot>
      <tr>
        <td colSpan={4}>PORTFOLIO</td>
        <td className="num">{fmtPct(risk.annualVol)}</td>
        <td className="num">100.00%</td>
      </tr>
    </tfoot>
  )

  const scenCols: Column<ScenarioResult>[] = [
    { key: 's', header: 'Scenario', render: (s) => <strong>{s.label}</strong> },
    { key: 'd', header: 'Description', render: (s) => <span className="muted">{s.description}</span> },
    {
      key: 'pnl',
      header: 'P&L',
      num: true,
      render: (s) => <Delta value={s.pnl}>{fmtCurrency(Math.abs(s.pnl), { compact: true })}</Delta>,
    },
    {
      key: 'pct',
      header: '% NAV',
      num: true,
      render: (s) => <Delta value={s.pnlPct}>{fmtPct(Math.abs(s.pnlPct))}</Delta>,
    },
  ]

  return (
    <div className="view">
      <div className="kpi-grid">
        <KpiTile label="Ex-ante Vol" value={fmtPct(risk.annualVol)} sub="annualized" />
        <KpiTile
          label="VaR 95% (1d)"
          value={fmtCurrency(risk.var95_1d, { compact: true })}
          sub={`${fmtPct(risk.var95_1d / nav)} of NAV`}
        />
        <KpiTile
          label="VaR 99% (1d)"
          value={fmtCurrency(risk.var99_1d, { compact: true })}
          sub={`${fmtPct(risk.var99_1d / nav)} of NAV`}
        />
        <KpiTile
          label="Hist VaR 95%"
          value={fmtCurrency(risk.histVar95_1d, { compact: true })}
          sub="empirical 1d"
        />
        <KpiTile label="Beta" value={risk.beta.toFixed(2)} sub="vs benchmark" />
        <KpiTile label="Diversification" value={fmtPct(risk.diversification)} sub="vol reduction" />
      </div>

      <div className="row two">
        <Panel title="Factor Exposures" hint="weighted net beta">
          <BarChart items={factorItems} signed />
        </Panel>
        <Panel title="Stress Scenarios" flush>
          <DataTable columns={scenCols} rows={scenarios} rowKey={(s) => s.key} />
        </Panel>
      </div>

      <Panel title="Contribution to Risk" hint="components sum to portfolio volatility" flush>
        <DataTable columns={compCols} rows={risk.components} rowKey={(c) => c.ticker} footer={compFooter} />
      </Panel>
    </div>
  )
}
