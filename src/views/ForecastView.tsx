import { useMemo, useState } from 'react'
import { BandChart } from '../components/charts/BandChart'
import { DataTable, type Column } from '../components/DataTable'
import { Delta } from '../components/Delta'
import { KpiTile } from '../components/KpiTile'
import { Panel } from '../components/Panel'
import { buildForecast, type AssetForecast } from '../engine/forecast'
import { fmtCurrency, fmtPct, fmtSignedPct } from '../lib/format'
import { usePortfolio } from '../state/PortfolioContext'

const HORIZONS = [
  { label: '1M', days: 21 },
  { label: '3M', days: 63 },
  { label: '6M', days: 126 },
  { label: '1Y', days: 252 },
]

export function ForecastView() {
  const { seed, mode } = usePortfolio()
  const [horizon, setHorizon] = useState(252)
  const forecast = useMemo(() => buildForecast(seed, horizon, 500, mode), [seed, horizon, mode])

  const cols: Column<AssetForecast>[] = [
    {
      key: 't',
      header: 'Ticker',
      sortable: true,
      value: (a) => a.ticker,
      render: (a) => (
        <span className="mono">
          <strong>{a.ticker}</strong>
        </span>
      ),
    },
    { key: 'p', header: 'Price', num: true, sortable: true, value: (a) => a.price, render: (a) => fmtCurrency(a.price, { decimals: 2 }) },
    {
      key: 'tgt',
      header: 'Exp. Target',
      num: true,
      sortable: true,
      value: (a) => a.expPrice,
      render: (a) => fmtCurrency(a.expPrice, { decimals: 2 }),
    },
    {
      key: 'ret',
      header: 'Exp. Return',
      num: true,
      sortable: true,
      value: (a) => a.expReturn,
      render: (a) => <Delta value={a.expReturn}>{fmtSignedPct(a.expReturn)}</Delta>,
    },
    {
      key: 'range',
      header: '±1σ Range',
      num: true,
      render: (a) => (
        <span className="muted">
          {fmtCurrency(a.low, { decimals: 0 })} – {fmtCurrency(a.high, { decimals: 0 })}
        </span>
      ),
    },
    { key: 'vol', header: 'Ann. Vol', num: true, sortable: true, value: (a) => a.vol, render: (a) => fmtPct(a.vol) },
    { key: 'up', header: 'Prob. Up', num: true, sortable: true, value: (a) => a.probUp, render: (a) => fmtPct(a.probUp) },
  ]

  const label = HORIZONS.find((h) => h.days === horizon)?.label ?? `${horizon}d`

  return (
    <div className="view">
      <Panel
        title="Forecast Horizon"
        hint={`Monte Carlo · ${forecast.sims.toLocaleString()} simulated paths`}
      >
        <div className="seg-controls">
          {HORIZONS.map((h) => (
            <button
              key={h.days}
              className={h.days === horizon ? 'btn dark active' : 'btn dark'}
              onClick={() => setHorizon(h.days)}
            >
              {h.label}
            </button>
          ))}
          <span className="muted" style={{ marginLeft: 8 }}>
            Projections are model estimates from simulated data — not advice.
          </span>
        </div>
      </Panel>

      <div className="kpi-grid">
        <KpiTile
          label={`Expected Value (${label})`}
          value={fmtCurrency(forecast.expValue, { compact: true })}
          sub={<Delta value={forecast.expReturn}>{fmtSignedPct(forecast.expReturn)}</Delta>}
        />
        <KpiTile
          label="Upside (P95)"
          value={fmtCurrency(forecast.p95Value, { compact: true })}
          sub={`+${fmtPct(forecast.p95Value / forecast.startValue - 1)}`}
        />
        <KpiTile
          label="Downside (P5)"
          value={fmtCurrency(forecast.p5Value, { compact: true })}
          sub={fmtSignedPct(forecast.p5Value / forecast.startValue - 1)}
        />
        <KpiTile
          label={`Horizon VaR (${label})`}
          value={fmtCurrency(forecast.horizonVaR, { compact: true })}
          sub="to 5th percentile"
        />
        <KpiTile label="Prob. of Loss" value={fmtPct(forecast.probLoss)} sub="ending below today" />
        <KpiTile label="Start Value" value={fmtCurrency(forecast.startValue, { compact: true })} sub="invested book" />
      </div>

      <Panel title="Projected Portfolio Value" hint={`${label} · fan = simulation percentiles`}>
        <BandChart
          bands={forecast.bands}
          startValue={forecast.startValue}
          yFormat={(v) => `$${(v / 1e6).toFixed(0)}M`}
        />
      </Panel>

      <Panel title="Per-Asset Expected Return" hint={`${label} horizon · model estimate`} flush>
        <DataTable columns={cols} rows={forecast.assets} rowKey={(a) => a.ticker} />
      </Panel>
    </div>
  )
}
