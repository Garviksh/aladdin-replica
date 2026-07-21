import { BarChart } from '../components/charts/BarChart'
import { DataTable, type Column } from '../components/DataTable'
import { Delta } from '../components/Delta'
import { KpiTile } from '../components/KpiTile'
import { Panel } from '../components/Panel'
import { COV_METHODS } from '../engine'
import { fmtCurrency, fmtNumber, fmtPct } from '../lib/format'
import { usePortfolio } from '../state/PortfolioContext'
import type { ComponentRisk, ScenarioResult } from '../types/domain'

export function RiskView() {
  const { analytics, covMethod, setCovMethod } = usePortfolio()
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
        <KpiTile
          label="CVaR 95% (1d)"
          value={fmtCurrency(risk.cvar95_1d, { compact: true })}
          sub={`${fmtPct(risk.cvar95_1d / nav)} of NAV`}
        />
        <KpiTile
          label="CVaR 99% (1d)"
          value={fmtCurrency(risk.cvar99_1d, { compact: true })}
          sub="expected shortfall"
        />
        <KpiTile label="Beta" value={risk.beta.toFixed(2)} sub="vs benchmark" />
        <KpiTile label="Diversification" value={fmtPct(risk.diversification)} sub="vol reduction" />
      </div>

      <Panel title="Risk Model" hint="covariance estimator">
        <div className="seg-controls">
          <span className="muted">Covariance:</span>
          {COV_METHODS.map((m) => (
            <button
              key={m.id}
              className={covMethod === m.id ? 'btn dark active' : 'btn'}
              onClick={() => setCovMethod(m.id)}
            >
              {m.label}
            </button>
          ))}
          <span className="muted">
            Skew {fmtNumber(risk.skew, 2)} · Excess kurtosis {fmtNumber(risk.exKurt, 2)}
          </span>
        </div>
      </Panel>

      <div className="row two">
        <Panel title="1-day VaR by method" hint="normal vs fat-tail vs historical" flush>
          <table className="data">
            <thead>
              <tr>
                <th>Method</th>
                <th className="num">95%</th>
                <th className="num">99%</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Normal (parametric)</td>
                <td className="num">{fmtCurrency(risk.var95_1d, { compact: true })}</td>
                <td className="num">{fmtCurrency(risk.var99_1d, { compact: true })}</td>
              </tr>
              <tr>
                <td>Cornish–Fisher (fat-tail)</td>
                <td className="num">{fmtCurrency(risk.cfVar95_1d, { compact: true })}</td>
                <td className="num">{fmtCurrency(risk.cfVar99_1d, { compact: true })}</td>
              </tr>
              <tr>
                <td>Historical</td>
                <td className="num">{fmtCurrency(risk.histVar95_1d, { compact: true })}</td>
                <td className="num">{fmtCurrency(risk.histVar99_1d, { compact: true })}</td>
              </tr>
              <tr>
                <td>Expected Shortfall (CVaR)</td>
                <td className="num">{fmtCurrency(risk.cvar95_1d, { compact: true })}</td>
                <td className="num">{fmtCurrency(risk.cvar99_1d, { compact: true })}</td>
              </tr>
            </tbody>
          </table>
        </Panel>
        <Panel title="VaR Backtest" hint={`${risk.backtest.obs}d · Kupiec + Christoffersen`} flush>
          <table className="data">
            <thead>
              <tr>
                <th>Level</th>
                <th className="num">Exc.</th>
                <th className="num">Exp.</th>
                <th className="num">Kupiec p</th>
                <th className="num">CC p</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {risk.backtest.levels.map((b) => (
                <tr key={b.level}>
                  <td className="mono">{fmtPct(b.level, 0)}</td>
                  <td className="num">{b.exceptions}</td>
                  <td className="num">{b.expected.toFixed(1)}</td>
                  <td className="num">{b.kupiecP.toFixed(3)}</td>
                  <td className="num">{b.christoffersenP.toFixed(3)}</td>
                  <td>
                    <span className={b.pass ? 'badge pass' : 'badge breach'}>
                      {b.pass ? 'PASS' : 'FAIL'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
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
