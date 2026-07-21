import { useEffect, useState } from 'react'
import { usePortfolio } from '../state/PortfolioContext'

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function formatClock(d: Date): string {
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `  ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  )
}

export function Header() {
  const { seed, setSeed, reseed, realAvailable, preview, dataSource, dataAsOf } = usePortfolio()
  const [draft, setDraft] = useState(String(seed))
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    setDraft(String(seed))
  }, [seed])

  const applySeed = () => {
    const n = parseInt(draft, 10)
    if (!Number.isNaN(n)) setSeed(n)
  }

  return (
    <header className="titlebar">
      <div className="brand">
        <span className="brand-mark">ALADDIN</span>
        <span className="brand-sub">· REPLICA — Portfolio &amp; Risk Terminal</span>
      </div>
      <div className="toolbar">
        <label htmlFor="seed-input">MARKET SEED</label>
        <input
          id="seed-input"
          className="field"
          value={draft}
          inputMode="numeric"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') applySeed()
          }}
        />
        <button className="btn" onClick={applySeed}>
          Load
        </button>
        <button className="btn" onClick={reseed}>
          Reseed ⟳
        </button>
        {realAvailable ? (
          <span className="tag" title={`Live data · ${dataSource ?? ''} ${dataAsOf ?? ''}`}>
            DATA: LIVE
          </span>
        ) : preview ? (
          <span className="tag" title="Sample data — not real market data">
            DATA: SAMPLE
          </span>
        ) : null}
        <span className="clock">{formatClock(now)}</span>
      </div>
    </header>
  )
}
