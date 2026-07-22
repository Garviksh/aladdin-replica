import { BarChart } from '../components/charts/BarChart'
import { LineChart } from '../components/charts/LineChart'
import { DataTable, type Column } from '../components/DataTable'
import { Delta } from '../components/Delta'
import { KpiTile } from '../components/KpiTile'
import { Panel } from '../components/Panel'
import { NewsList } from '../components/NewsList'
import { MARKET_QUERY } from '../data/news'
import { useNews } from '../hooks/useNews'
import { fmtCurrency, fmtPct, fmtSignedPct } from '../lib/format'
import { usePortfolio } from '../state/PortfolioContext'
import type { Position } from '../types/domain'

export function DashboardView() {
  const { analytics } = usePortfolio()
  const { portfolio, risk, performance, compliance, allocation, benchmarkName, lookbackDays } =
    analytics
  const news = useNews(MARKET_QUERY, 6)

  const dayPnl = portfolio.positions.reduce((a, p) => a + p.dayPnl, 0)
  const dayPct = portfolio.totalValue > 0 ? dayPnl / portfolio.totalValue : 0
  const breaches = compliance.filter((c) => c.status === 'breach').length
  const warns = compliance.filter((c) => c.status === 'warn').length
  const compText = breaches ? `${breaches} BREACH` : warns ? `${warns} WARN` : 'ALL CLEAR'

  const growth = performance.series
  const pSeries = { name: 'Portfolio', values: growth.map((g) => g.portfolio * 100) }
  const bSeries = { name: benchmarkName, values: growth.map((g) => g.benchmark * 100), dashed: true }

  const movers = [...portfolio.positions]
    .sort((a, b) => Math.abs(b.dayChangePct) - Math.abs(a.dayChangePct))
    .slice(0, 6)

  const moverCols: Column<Position>[] = [
    { key: 't', header: 'Ticker', render: (p) => <span className="mono">{p.instrument.ticker}</span> },
    { key: 'mv', header: 'Mkt Val', num: true, render: (p) => fmtCurrency(p.marketValue, { compact: true }) },
    {
      key: 'day',
      header: 'Day',
      num: true,
      render: (p) => <Delta value={p.dayChangePct}>{fmtSignedPct(p.dayChangePct)}</Delta>,
    },
    {
      key: 'pnl',
      header: 'Day P&L',
      num: true,
      render: (p) => <Delta value={p.dayPnl}>{fmtCurrency(Math.abs(p.dayPnl), { compact: true })}</Delta>,
    },
  ]

  const topRisk = risk.components
    .slice(0, 6)
    .map((c) => ({ label: c.ticker, value: c.pctOfRisk, caption: fmtPct(c.pctOfRisk) }))
  const allocItems = allocation.byAssetClass.map((a) => ({
    label: a.label,
    value: a.weight,
    caption: fmtPct(a.weight),
  }))

  return (
    <div className="view">
      <div className="kpi-grid">
        <KpiTile
          label="Net Asset Value"
          value={fmtCurrency(portfolio.totalValue, { compact: true })}
          sub={`Inv ${fmtCurrency(portfolio.investedValue, { compact: true })} · Cash ${fmtCurrency(portfolio.cash, { compact: true })}`}
        />
        <KpiTile
          label="Day P&L"
          value={<Delta value={dayPnl}>{fmtCurrency(Math.abs(dayPnl), { compact: true })}</Delta>}
          sub={<Delta value={dayPct}>{fmtSignedPct(dayPct)}</Delta>}
        />
        <KpiTile label="Ex-ante Vol" value={fmtPct(risk.annualVol)} sub="annualized" />
        <KpiTile
          label="1-day VaR 99%"
          value={fmtCurrency(risk.var99_1d, { compact: true })}
          sub={`${fmtPct(risk.var99_1d / portfolio.totalValue)} of NAV`}
        />
        <KpiTile
          label="1-day CVaR 99%"
          value={fmtCurrency(risk.cvar99_1d, { compact: true })}
          sub="expected shortfall"
        />
        <KpiTile label="Beta" value={risk.beta.toFixed(2)} sub={`vs ${benchmarkName}`} />
        <KpiTile label="Compliance" value={compText} sub={`${compliance.length} rules`} />
      </div>

      <div className="row two">
        <Panel title="Portfolio vs Benchmark" hint={`Growth of 100 · ${lookbackDays}d`}>
          <LineChart series={[pSeries, bSeries]} baseline={100} yFormat={(v) => v.toFixed(0)} />
        </Panel>
        <Panel title="Asset Allocation" hint="% of NAV">
          <BarChart items={allocItems} />
        </Panel>
      </div>

      <div className="row two">
        <Panel title="Top Movers (Day)" flush>
          <DataTable columns={moverCols} rows={movers} rowKey={(p) => p.instrument.id} />
        </Panel>
        <Panel title="Largest Risk Contributors" hint="% of total risk">
          <BarChart items={topRisk} />
        </Panel>
      </div>

      <Panel title="Market News" hint="live headlines · GDELT" flush>
        <div className="news-wrap">
          <NewsList
            loading={news.loading}
            error={news.error}
            articles={news.articles}
            onRetry={news.retry}
          />
        </div>
      </Panel>
    </div>
  )
}
