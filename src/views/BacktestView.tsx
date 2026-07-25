import { useMemo, useState } from 'react'
import { LineChart } from '../components/charts/LineChart'
import { DataTable, type Column } from '../components/DataTable'
import { Delta } from '../components/Delta'
import { Panel } from '../components/Panel'
import { getMarket } from '../engine'
import {
  DEFAULT_COST_BPS,
  runStrategyBacktest,
  type StrategyResult,
} from '../engine/strategyBacktest'
import { fmtNumber, fmtPct, fmtSignedPct } from '../lib/format'
import { usePortfolio } from '../state/PortfolioContext'

const COST_OPTIONS = [0, 5, DEFAULT_COST_BPS, 20, 50]

export function BacktestView() {
  const { seed, mode } = usePortfolio()
  const [costBps, setCostBps] = useState(DEFAULT_COST_BPS)
  const market = useMemo(() => getMarket(seed, mode), [seed, mode])
  const current = market.portfolio.positions.map(
    (p) => p.marketValue / market.portfolio.investedValue,
  )
  const bt = useMemo(
    () => runStrategyBacktest(market.returns, market.dates, current, costBps),
    [market, current, costBps],
  )

  const series = bt.strategies.map((s, i) => ({
    name: s.name,
    values: s.curve.map((c) => c.v * 100),
    dashed: i % 2 === 1,
  }))

  // Did charging turnover reorder the leaderboard?
  const bestNet = [...bt.strategies].sort((a, b) => b.totalReturn - a.totalReturn)[0]
  const bestGross = [...bt.strategies].sort(
    (a, b) => b.grossTotalReturn - a.grossTotalReturn,
  )[0]
  const reordered = bestNet.name !== bestGross.name

  const cols: Column<StrategyResult>[] = [
    { key: 'n', header: 'Strategy', render: (s) => <strong>{s.name}</strong> },
    {
      key: 'gross',
      header: 'Gross Return',
      num: true,
      render: (s) => <span className="muted">{fmtSignedPct(s.grossTotalReturn)}</span>,
    },
    {
      key: 'ret',
      header: 'Net Return',
      num: true,
      render: (s) => <Delta value={s.totalReturn}>{fmtSignedPct(s.totalReturn)}</Delta>,
    },
    {
      key: 'cost',
      header: 'Cost Drag',
      num: true,
      render: (s) => (s.costDrag > 0 ? `(${fmtPct(s.costDrag)})` : '—'),
    },
    {
      key: 'to',
      header: 'Turnover /yr',
      num: true,
      render: (s) => `${fmtNumber(s.annualTurnover, 2)}x`,
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
        hint={`walk-forward · ${bt.window}d window · rebalanced every ${bt.rebalance}d · net of ${bt.costBps}bps`}
      >
        <LineChart series={series} baseline={100} yFormat={(v) => v.toFixed(0)} height={280} />
        <div className="seg-controls">
          <span className="muted">Transaction cost</span>
          {COST_OPTIONS.map((bps) => (
            <button
              key={bps}
              className={costBps === bps ? 'btn dark active' : 'btn'}
              onClick={() => setCostBps(bps)}
            >
              {bps}bps
            </button>
          ))}
          <span className="muted">
            {costBps === 0
              ? 'Frictionless — the number a naive backtest prints.'
              : 'Charged as ½·Σ|Δw| of traded notional at each rebalance.'}
          </span>
        </div>
      </Panel>

      <Panel title="Backtest Statistics" hint="gross vs net of transaction costs" flush>
        <DataTable columns={cols} rows={bt.strategies} rowKey={(s) => s.name} />
      </Panel>

      <p className="disclaimer">
        Walk-forward backtest on historical data — estimators use only trailing data (no lookahead).
        Every strategy starts from cash, pays to establish its first book, then pays turnover at each
        rebalance, so monthly-rebalanced strategies are not compared against buy-and-hold on terms
        buy-and-hold never gets — and no strategy gets a free entry into its own starting
        allocation.{' '}
        {reordered
          ? `At ${bt.costBps}bps costs change the ranking — ${bestGross.name} leads gross, ${bestNet.name} leads net.`
          : `At ${bt.costBps}bps, ${bestNet.name} leads on both gross and net return.`}{' '}
        Past performance is not indicative of future results. Not investment advice.
      </p>
    </div>
  )
}
