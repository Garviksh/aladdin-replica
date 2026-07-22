import { useEffect, useMemo, useState } from 'react'
import { askOllama, ollamaModels, pickModel } from '../assistant/ollama'
import {
  buildImpactPrompt,
  computeImpact,
  parseImpactEvents,
  type ImpactEvent,
  type ImpactResult,
  type ImpactRow,
} from '../assistant/impact'
import { DataTable, type Column } from '../components/DataTable'
import { Delta } from '../components/Delta'
import { KpiTile } from '../components/KpiTile'
import { Panel } from '../components/Panel'
import { getMarket } from '../data/market'
import { MARKET_QUERY } from '../data/news'
import { estimateBetas } from '../engine/factors'
import { useNews } from '../hooks/useNews'
import { fmtCurrency, fmtPct, fmtSignedPct } from '../lib/format'
import { usePortfolio } from '../state/PortfolioContext'

export function ImpactView() {
  const { seed, mode } = usePortfolio()
  const market = useMemo(() => getMarket(seed, mode), [seed, mode])
  const betas = useMemo(
    () => estimateBetas(market.portfolio.positions, market.returns, market.benchmarkReturns),
    [market],
  )
  const news = useNews(MARKET_QUERY, 24)

  const [model, setModel] = useState<string | null>(null)
  const [ollamaOff, setOllamaOff] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ImpactResult | null>(null)

  useEffect(() => {
    let alive = true
    ollamaModels().then((list) => {
      if (!alive) return
      if (list && list.length) setModel(pickModel(list))
      else setOllamaOff(true)
    })
    return () => {
      alive = false
    }
  }, [])

  const analyze = async () => {
    if (!model || busy) return
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const tickers = market.portfolio.positions.map((p) => p.instrument.ticker)
      const prompt = buildImpactPrompt(news.articles, tickers)
      const text = await askOllama(
        model,
        [
          { role: 'system', content: 'You output only a valid JSON array. No prose, no code fences.' },
          { role: 'user', content: prompt },
        ],
        { format: 'json' },
      )
      const events = parseImpactEvents(text)
      if (!events.length) {
        setError('The model returned no usable events. Use Reload for fresh headlines, or try another model.')
        return
      }
      setResult(computeImpact(events, market.portfolio, betas))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed')
    } finally {
      setBusy(false)
    }
  }

  const rowCols: Column<ImpactRow>[] = [
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
      header: 'Est. Impact',
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

  const evCols: Column<ImpactEvent>[] = [
    { key: 's', header: 'Scope', render: (e) => <span className="mono">{e.scope}</span> },
    { key: 'f', header: 'Factor', render: (e) => e.factor },
    {
      key: 'd',
      header: 'Move',
      num: true,
      render: (e) => <Delta value={e.direction}>{fmtPct(e.magnitude)}</Delta>,
    },
    { key: 'c', header: 'Conf.', num: true, render: (e) => fmtPct(e.confidence) },
    { key: 'h', header: 'Headline', render: (e) => <span className="muted">{e.headline ?? ''}</span> },
  ]

  return (
    <div className="view">
      <Panel
        title="News → Impact Prediction"
        hint="local Ollama · maps live headlines to P&L via data-driven betas"
      >
        <div className="seg-controls">
          <button className="btn dark" onClick={analyze} disabled={busy || ollamaOff || news.loading}>
            {busy ? 'Analyzing…' : 'Analyze live news impact'}
          </button>
          <span className="muted">
            {ollamaOff
              ? 'Ollama not detected — run “OLLAMA_ORIGINS=* ollama serve” to enable.'
              : model
                ? `model: ${model}`
                : 'connecting to Ollama…'}
            {news.loading ? ' · loading headlines…' : ` · ${news.articles.length} headlines`}
          </span>
        </div>
        <p className="disclaimer">
          Model estimate derived from public headlines and your data-driven factor betas. Not
          investment advice.
        </p>
      </Panel>

      {error ? (
        <Panel title="Status">
          <div className="news-msg">{error}</div>
        </Panel>
      ) : null}

      {result ? (
        <>
          <div className="kpi-grid">
            <KpiTile
              label="Predicted Book Impact"
              value={
                <Delta value={result.totalPnl}>
                  {fmtCurrency(Math.abs(result.totalPnl), { compact: true })}
                </Delta>
              }
              sub={<Delta value={result.totalPct}>{fmtSignedPct(result.totalPct)}</Delta>}
            />
            <KpiTile label="Events Detected" value={result.events.length} sub="from live headlines" />
            <KpiTile
              label="Positions Affected"
              value={result.rows.length}
              sub={`of ${market.portfolio.positions.length}`}
            />
          </div>
          <Panel title="Estimated Impact by Holding" flush>
            <DataTable columns={rowCols} rows={result.rows} rowKey={(r) => r.ticker} />
          </Panel>
          <Panel title="Events Extracted from News" flush>
            <DataTable columns={evCols} rows={result.events} rowKey={(e, i) => `${e.scope}-${i}`} />
          </Panel>
        </>
      ) : null}
    </div>
  )
}
