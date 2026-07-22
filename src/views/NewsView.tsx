import { useMemo, useState } from 'react'
import { NewsList } from '../components/NewsList'
import { Panel } from '../components/Panel'
import { savedNewsKey, saveNewsKey, type NewsScope } from '../data/news'
import { useNews } from '../hooks/useNews'
import { usePortfolio } from '../state/PortfolioContext'

const MARKET = '__market__'

export function NewsView() {
  const { analytics } = usePortfolio()
  const holdings = analytics.portfolio.positions
  const [sel, setSel] = useState<string>(MARKET)
  const [key, setKey] = useState<string | null>(() => savedNewsKey())
  const [keyInput, setKeyInput] = useState(key ?? '')

  const scope: NewsScope = useMemo(() => {
    if (sel === MARKET) return { kind: 'market' }
    const p = holdings.find((h) => h.instrument.ticker === sel)
    return p
      ? { kind: 'ticker', ticker: p.instrument.ticker, name: p.instrument.name }
      : { kind: 'market' }
  }, [sel, holdings])

  const news = useNews(scope, key, 24)
  const title = sel === MARKET ? 'Market News' : `News · ${sel}`
  const applyKey = () => {
    const k = keyInput.trim() || null
    saveNewsKey(k)
    setKey(k)
  }

  return (
    <div className="view">
      <Panel title="Live News" hint={key ? 'source: Finnhub' : 'source: GDELT (keyless)'}>
        <div className="seg-controls">
          <button
            className={sel === MARKET ? 'btn dark active' : 'btn dark'}
            onClick={() => setSel(MARKET)}
          >
            Market
          </button>
          {holdings.map((p) => (
            <button
              key={p.instrument.id}
              className={sel === p.instrument.ticker ? 'btn active' : 'btn'}
              onClick={() => setSel(p.instrument.ticker)}
              title={p.instrument.name}
            >
              {p.instrument.ticker}
            </button>
          ))}
        </div>
        <div className="seg-controls" style={{ marginTop: 8 }}>
          <span className="muted">Finnhub key (optional, more reliable):</span>
          <input
            className="field"
            style={{ width: 210 }}
            value={keyInput}
            placeholder="paste free finnhub.io key"
            onChange={(e) => setKeyInput(e.target.value)}
          />
          <button className="btn" onClick={applyKey}>
            Save
          </button>
          {key ? <span className="tag">key set</span> : null}
        </div>
      </Panel>

      <Panel title={title} flush>
        <div className="news-wrap">
          <NewsList
            loading={news.loading}
            error={news.error}
            articles={news.articles}
            onRetry={news.retry}
            emptyLabel="No recent headlines for this query."
          />
        </div>
      </Panel>
    </div>
  )
}
