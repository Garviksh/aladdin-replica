import { useState } from 'react'
import { NewsList } from '../components/NewsList'
import { Panel } from '../components/Panel'
import { MARKET_QUERY, tickerQuery } from '../data/news'
import { useNews } from '../hooks/useNews'
import { usePortfolio } from '../state/PortfolioContext'

const MARKET = '__market__'

export function NewsView() {
  const { analytics } = usePortfolio()
  const holdings = analytics.portfolio.positions
  const [sel, setSel] = useState<string>(MARKET)

  const query = sel === MARKET ? MARKET_QUERY : tickerQuery(sel)
  const news = useNews(query, 24)
  const title = sel === MARKET ? 'Market News' : `News · ${sel}`

  return (
    <div className="view">
      <Panel title="Live News" hint="real headlines via GDELT · no API key · refresh with Reload">
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
              className={sel === p.instrument.name ? 'btn active' : 'btn'}
              onClick={() => setSel(p.instrument.name)}
              title={p.instrument.name}
            >
              {p.instrument.ticker}
            </button>
          ))}
        </div>
      </Panel>

      <Panel title={title} flush>
        <div className="news-wrap">
          <NewsList {...news} emptyLabel="No recent headlines for this query." />
        </div>
      </Panel>
    </div>
  )
}
