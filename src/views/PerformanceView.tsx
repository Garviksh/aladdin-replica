import { BarChart } from '../components/charts/BarChart'
import { LineChart } from '../components/charts/LineChart'
import { Delta } from '../components/Delta'
import { KpiTile } from '../components/KpiTile'
import { Panel } from '../components/Panel'
import { fmtPct, fmtSignedPct } from '../lib/format'
import { usePortfolio } from '../state/PortfolioContext'

export function PerformanceView() {
  const { analytics } = usePortfolio()
  const { performance, risk, benchmarkName, lookbackDays } = analytics
  const g = performance.series
  const p = { name: 'Portfolio', values: g.map((x) => x.portfolio * 100) }
  const b = { name: benchmarkName, values: g.map((x) => x.benchmark * 100), dashed: true }

  const sectorItems = performance.bySector.map((r) => ({
    label: r.label,
    value: r.contribution,
    caption: fmtSignedPct(r.contribution),
  }))
  const classItems = performance.byAssetClass.map((r) => ({
    label: r.label,
    value: r.contribution,
    caption: fmtSignedPct(r.contribution),
  }))

  return (
    <div className="view">
      <div className="kpi-grid">
        <KpiTile
          label="Total Return"
          value={<Delta value={performance.totalReturn}>{fmtSignedPct(performance.totalReturn)}</Delta>}
          sub={`${lookbackDays}d`}
        />
        <KpiTile label="Benchmark" value={fmtSignedPct(performance.benchmarkReturn)} sub={benchmarkName} />
        <KpiTile
          label="Active Return"
          value={<Delta value={performance.activeReturn}>{fmtSignedPct(performance.activeReturn)}</Delta>}
          sub="vs benchmark"
        />
        <KpiTile label="Sharpe" value={performance.sharpe.toFixed(2)} sub="rf 2%" />
        <KpiTile label="Max Drawdown" value={fmtSignedPct(performance.maxDrawdown)} sub="peak-to-trough" />
        <KpiTile label="Ann. Vol" value={fmtPct(risk.annualVol)} sub="ex-ante" />
        <KpiTile label="Sortino" value={performance.sortino.toFixed(2)} sub="downside-adjusted" />
        <KpiTile label="Calmar" value={performance.calmar.toFixed(2)} sub="return / max DD" />
        <KpiTile label="Info Ratio" value={performance.informationRatio.toFixed(2)} sub="active / TE" />
        <KpiTile label="Tracking Error" value={fmtPct(performance.trackingError)} sub="vs benchmark" />
      </div>

      <Panel title="Cumulative Performance" hint={`Growth of 100 · ${lookbackDays}d`}>
        <LineChart series={[p, b]} baseline={100} yFormat={(v) => v.toFixed(0)} height={260} />
      </Panel>

      <div className="row two">
        <Panel title="Attribution by Sector" hint="contribution to return">
          <BarChart items={sectorItems} signed />
        </Panel>
        <Panel title="Attribution by Asset Class" hint="contribution to return">
          <BarChart items={classItems} signed />
        </Panel>
      </div>
    </div>
  )
}
