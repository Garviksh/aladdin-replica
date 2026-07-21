import { fmtCurrency } from '../lib/format'
import { usePortfolio } from '../state/PortfolioContext'

export function StatusBar() {
  const { analytics, seed, mode, dataSource, dataAsOf } = usePortfolio()
  const { portfolio, compliance, benchmarkName } = analytics
  const breaches = compliance.filter((c) => c.status === 'breach').length
  const warns = compliance.filter((c) => c.status === 'warn').length
  const compText = breaches ? `${breaches} BREACH` : warns ? `${warns} WARNING` : 'ALL CLEAR'

  return (
    <footer className="statusbar">
      <div className="seg">
        <span>
          <span className="dot" />
          {mode === 'real' ? 'LIVE DATA · CONNECTED' : 'SIMULATION'}
        </span>
        <span>NAV {fmtCurrency(portfolio.totalValue, { compact: true })}</span>
        <span>POSITIONS {portfolio.positions.length}</span>
        <span>COMPLIANCE {compText}</span>
      </div>
      <div className="seg">
        <span>SRC {mode === 'real' ? (dataSource ?? 'REAL') : 'SIMULATED'}</span>
        <span>BMK {benchmarkName}</span>
        <span>SEED {seed}</span>
        <span>AS OF {mode === 'real' ? (dataAsOf ?? portfolio.asOf) : portfolio.asOf}</span>
      </div>
    </footer>
  )
}
