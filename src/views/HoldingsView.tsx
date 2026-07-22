import { DataTable, type Column } from '../components/DataTable'
import { Delta } from '../components/Delta'
import { Panel } from '../components/Panel'
import { downloadText, toHoldingsCsv } from '../lib/exportCsv'
import { fmtCurrency, fmtNumber, fmtPct, fmtSignedPct } from '../lib/format'
import { usePortfolio } from '../state/PortfolioContext'
import type { Position } from '../types/domain'

export function HoldingsView() {
  const { analytics } = usePortfolio()
  const { portfolio } = analytics
  const exportCsv = () =>
    downloadText(`holdings-${portfolio.asOf || 'book'}.csv`, toHoldingsCsv(portfolio))

  const cols: Column<Position>[] = [
    {
      key: 'ticker',
      header: 'Ticker',
      sortable: true,
      value: (p) => p.instrument.ticker,
      render: (p) => (
        <span className="mono">
          <strong>{p.instrument.ticker}</strong>
        </span>
      ),
    },
    { key: 'name', header: 'Name', sortable: true, value: (p) => p.instrument.name, render: (p) => p.instrument.name },
    { key: 'class', header: 'Class', sortable: true, value: (p) => p.instrument.assetClass, render: (p) => p.instrument.assetClass },
    { key: 'sector', header: 'Sector', sortable: true, value: (p) => p.instrument.sector, render: (p) => p.instrument.sector },
    { key: 'qty', header: 'Quantity', num: true, sortable: true, value: (p) => p.quantity, render: (p) => fmtNumber(p.quantity, 0) },
    { key: 'price', header: 'Price', num: true, sortable: true, value: (p) => p.price, render: (p) => fmtCurrency(p.price, { decimals: 2 }) },
    { key: 'mv', header: 'Mkt Value', num: true, sortable: true, value: (p) => p.marketValue, render: (p) => fmtCurrency(p.marketValue) },
    { key: 'wt', header: 'Weight', num: true, sortable: true, value: (p) => p.weight, render: (p) => fmtPct(p.weight) },
    {
      key: 'day',
      header: 'Day %',
      num: true,
      sortable: true,
      value: (p) => p.dayChangePct,
      render: (p) => <Delta value={p.dayChangePct}>{fmtSignedPct(p.dayChangePct)}</Delta>,
    },
    {
      key: 'unreal',
      header: 'Unreal P&L',
      num: true,
      sortable: true,
      value: (p) => p.unrealizedPnl,
      render: (p) => <Delta value={p.unrealizedPnl}>{fmtCurrency(Math.abs(p.unrealizedPnl))}</Delta>,
    },
  ]

  const totUnreal = portfolio.positions.reduce((a, p) => a + p.unrealizedPnl, 0)
  const footer = (
    <tfoot>
      <tr>
        <td colSpan={6}>TOTAL INVESTED</td>
        <td className="num">{fmtCurrency(portfolio.investedValue)}</td>
        <td className="num">{fmtPct(portfolio.investedValue / portfolio.totalValue)}</td>
        <td className="num" />
        <td className="num">{fmtCurrency(totUnreal)}</td>
      </tr>
    </tfoot>
  )

  return (
    <div className="view">
      <Panel
        title="Holdings"
        hint={
          <>
            {`${portfolio.positions.length} positions · NAV ${fmtCurrency(portfolio.totalValue, { compact: true })} `}
            <button className="btn" onClick={exportCsv}>
              Export CSV
            </button>
          </>
        }
        flush
      >
        <DataTable
          columns={cols}
          rows={portfolio.positions}
          rowKey={(p) => p.instrument.id}
          initialSort={{ key: 'mv', dir: 'desc' }}
          footer={footer}
        />
      </Panel>
    </div>
  )
}
