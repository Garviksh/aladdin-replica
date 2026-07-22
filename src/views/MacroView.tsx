import { useEffect, useMemo, useState } from 'react'
import { DataTable, type Column } from '../components/DataTable'
import { Delta } from '../components/Delta'
import { KpiTile } from '../components/KpiTile'
import { Panel } from '../components/Panel'
import { getMarket } from '../engine'
import { estimateBetas } from '../engine/factors'
import { deriveMacroSignals, macroNowcast, type MacroSignal } from '../engine/macro'
import {
  bakedMacro,
  fetchLiveWeather,
  hasMacroData,
  MACRO_META,
  type MacroIndicator,
  type WeatherPoint,
} from '../data/macro'
import { fmtCurrency, fmtNumber, fmtSignedPct } from '../lib/format'
import { usePortfolio } from '../state/PortfolioContext'

function biasBadge(bias: MacroSignal['bias']) {
  const cls = bias === 'risk-off' ? 'badge breach' : bias === 'risk-on' ? 'badge pass' : 'badge'
  return <span className={cls}>{bias.toUpperCase()}</span>
}

export function MacroView() {
  const { seed, mode } = usePortfolio()
  const macro = bakedMacro()
  const loaded = hasMacroData()

  const market = useMemo(() => getMarket(seed, mode), [seed, mode])
  const betas = useMemo(
    () => estimateBetas(market.portfolio.positions, market.returns, market.benchmarkReturns),
    [market],
  )
  const nowcast = useMemo(
    () => macroNowcast(market.portfolio, betas, macro.indicators),
    [market, betas, macro.indicators],
  )
  const signals = useMemo(() => deriveMacroSignals(macro.indicators), [macro.indicators])
  const curve = macro.indicators.find((i) => i.id === 'T10Y2Y')

  const [weather, setWeather] = useState<WeatherPoint[]>(macro.weather ?? [])
  const [wxStatus, setWxStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')

  useEffect(() => {
    let alive = true
    setWxStatus('loading')
    fetchLiveWeather()
      .then((w) => {
        if (!alive) return
        if (w.length) setWeather(w)
        setWxStatus(w.length ? 'done' : 'error')
      })
      .catch(() => alive && setWxStatus('error'))
    return () => {
      alive = false
    }
  }, [])

  const indCols: Column<MacroIndicator>[] = [
    { key: 'l', header: 'Indicator', render: (i) => <strong>{i.label}</strong> },
    {
      key: 'v',
      header: 'Latest',
      num: true,
      render: (i) => (
        <span className="mono">
          {fmtNumber(i.value, 2)}
          {i.unit}
        </span>
      ),
    },
    {
      key: 'c',
      header: 'Change',
      num: true,
      render: (i) =>
        i.prev == null ? (
          <span className="muted">—</span>
        ) : (
          <Delta value={i.value - i.prev}>
            {(i.value - i.prev >= 0 ? '+' : '') + fmtNumber(i.value - i.prev, 2)}
          </Delta>
        ),
    },
    { key: 'a', header: 'As of', render: (i) => <span className="muted mono">{i.asOf ?? '—'}</span> },
  ]

  const sigCols: Column<MacroSignal>[] = [
    { key: 'f', header: 'Factor', render: (s) => <strong>{s.label}</strong> },
    { key: 'b', header: 'Bias', render: (s) => biasBadge(s.bias) },
    {
      key: 't',
      header: 'Tilt',
      num: true,
      render: (s) => <Delta value={s.tilt}>{fmtSignedPct(s.tilt, 0)}</Delta>,
    },
    { key: 'r', header: 'Drivers', render: (s) => <span className="muted">{s.rationale}</span> },
  ]

  return (
    <div className="view">
      {loaded ? (
        <div className="kpi-grid">
          <KpiTile
            label="Macro Nowcast P&L"
            value={
              <Delta value={nowcast.impact.totalPnl}>
                {fmtCurrency(Math.abs(nowcast.impact.totalPnl), { compact: true })}
              </Delta>
            }
            sub={<Delta value={nowcast.impact.totalPct}>{fmtSignedPct(nowcast.impact.totalPct)}</Delta>}
          />
          <KpiTile label="Signals" value={signals.length} sub="factor tilts" />
          <KpiTile label="Indicators" value={macro.indicators.length} sub={`as of ${MACRO_META.asOf ?? '—'}`} />
          {curve ? (
            <KpiTile
              label="10Y–2Y Curve"
              value={`${curve.value > 0 ? '+' : ''}${fmtNumber(curve.value, 2)}%`}
              sub={curve.value < 0 ? 'inverted' : 'positive'}
            />
          ) : null}
        </div>
      ) : null}

      {loaded ? (
        <Panel title="Macro Indicators" hint={MACRO_META.source ?? undefined} flush>
          <DataTable columns={indCols} rows={macro.indicators} rowKey={(i) => i.id} />
        </Panel>
      ) : (
        <Panel title="Macro Indicators">
          <p className="muted">
            Macro indicators aren&apos;t loaded yet. Run <code>npm run refresh-macro</code> to fetch
            live US yields, the 10Y–2Y curve, CPI, unemployment, VIX, Fed Funds and the USD index
            from <strong>FRED</strong> (free, no API key), then reload. Live weather below is fetched
            in your browser and works right now.
          </p>
        </Panel>
      )}

      {loaded ? (
        <>
          <Panel
            title="Macro-Implied Factor Signals"
            hint="heuristic tilts — how current macro maps onto the factor model"
            flush
          >
            <DataTable columns={sigCols} rows={signals} rowKey={(s) => s.factor} />
          </Panel>
          <p className="disclaimer">
            Nowcast applies these illustrative macro tilts to your data-driven betas. Directional
            heuristic, not a forecast or investment advice.
          </p>
        </>
      ) : null}

      <Panel
        title="Alt-Data · Live Weather"
        hint={
          wxStatus === 'loading'
            ? 'fetching Open-Meteo…'
            : wxStatus === 'error'
              ? 'unavailable'
              : 'live · Open-Meteo · financial & energy hubs'
        }
      >
        {weather.length ? (
          <div className="kpi-grid">
            {weather.map((w) => (
              <KpiTile key={w.city} label={w.city} value={`${w.tempC}°C`} sub={w.label} />
            ))}
          </div>
        ) : (
          <p className="muted">
            {wxStatus === 'loading' ? 'Loading live conditions…' : 'Weather unavailable right now.'}
          </p>
        )}
        <p className="disclaimer">
          Weather is an alt-data demonstration feed (energy-demand proxy). Shown live; not currently
          wired into P&L.
        </p>
      </Panel>
    </div>
  )
}
