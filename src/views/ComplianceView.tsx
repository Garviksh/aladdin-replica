import { KpiTile } from '../components/KpiTile'
import { Panel } from '../components/Panel'
import { usePortfolio } from '../state/PortfolioContext'
import type { ComplianceStatus } from '../types/domain'

export function ComplianceView() {
  const { analytics } = usePortfolio()
  const { compliance } = analytics
  const count = (s: ComplianceStatus) => compliance.filter((c) => c.status === s).length

  return (
    <div className="view">
      <div className="kpi-grid">
        <KpiTile label="Rules Monitored" value={compliance.length} />
        <KpiTile label="Passing" value={count('pass')} />
        <KpiTile label="Warnings" value={count('warn')} />
        <KpiTile label="Breaches" value={count('breach')} />
      </div>

      <Panel title="Mandate Compliance" hint="limits expressed as % of NAV" flush>
        <table className="data">
          <thead>
            <tr>
              <th>Rule</th>
              <th>Policy</th>
              <th className="num">Limit</th>
              <th className="num">Observed</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {compliance.map((r) => (
              <tr key={r.id} className={r.status === 'breach' ? 'breach-row' : undefined}>
                <td className="mono">{r.id}</td>
                <td>
                  <strong>{r.label}</strong>
                  <div className="muted">{r.description}</div>
                </td>
                <td className="num">{r.limit}</td>
                <td className="num">{r.observed}</td>
                <td>
                  <span className={`badge ${r.status}`}>{r.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <p className="disclaimer">
        Educational replica. Rules and thresholds are illustrative and do not constitute investment
        advice.
      </p>
    </div>
  )
}
