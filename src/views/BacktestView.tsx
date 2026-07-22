import { useMemo } from 'react'
import { LineChart } from '../components/charts/LineChart'
import { DataTable, type Column } from '../components/DataTable'
import { Delta } from '../components/Delta'
import { Panel } from '../components/Panel'
import { getMarket } from '../engine'
import { runStrategyBacktest, type StrategyResult } from '../engine/strategyBacktest'
import { fmtPct, fmtSignedPct } from '../lib/format'
import { usePortfolio } from '../state/PortfolioContext'

export function BacktestView() {
  const { seed, mode } = usePortfolio()
  const market = useMemo(() => getMarket(seed, mode), [seed, mode])
  const current = market.portfolio.positions.map(
    (p) => p.marketValue / market.portfolio.investedValue,
  )
  const bt = useMemo(
    () => runStrategyBacktest(market.returns, market.dates, current),
    [market, current],
  )

  const series = bt.strategies.map((s, i) => ({
    name: s.name,
    values: s.curve.map((c) => c.v * 100),
    dashed: i % 2 === 1,
  }))

  const cols: Column<StrategyResult>[] = [
    { key: 'n', header: 'Strategy', render: (s) => <strong>{s.name}</strong> },
    {
      key: 'ret',
      header: 'Total Return',
      num: true,
      render: (s) => <Delta value={s.totalReturn}>{fmtSignedPct(s.totalReturn)}</Delta>,
    },
    { key: 'vol', header: 'Ann. Vol', num: true, render: (s) => fmtPct(s.vol) },
    { key: 'sh', header: 'Sharpe', num: true, render: (s) => s.sharpe.toFixed(2) },
    {
      key: 'dd',
      header: 'Max DD',
      num: true,
      render: (s) => <Delta value={s.maxDrawdown}>{fmtSignedPct(s.maxDrawdown)}</Delta>,
    },
  ]

  return (
    <div className="view">
      <Panel
        title="Strategy Backtest"
        hint={`walk-forward · ${bt.window}d trailing window · rebalanced every ${bt.rebalance}d`}
      >
        <LineChart series={series} baseline={100} yFormat={(v) => v.toFixed(0)} height={280} />
      </Panel>

      <Panel title="Backtest Statistics" flush>
        <DataTable columns={cols} rows={bt.strategies} rowKey={(s) => s.name} />
      </Panel>

      <p className="disclaimer">
        Walk-forward backtest on historical data — estimators use only trailing data (no lookahead).
        Past performance is not indicative of future results. Not investment advice.
      </p>
    </div>
  )
}
