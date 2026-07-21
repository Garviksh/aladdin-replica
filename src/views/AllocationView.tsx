import { BarChart } from '../components/charts/BarChart'
import { Panel } from '../components/Panel'
import { fmtPct } from '../lib/format'
import { usePortfolio } from '../state/PortfolioContext'
import type { AllocationRow } from '../types/domain'

export function AllocationView() {
  const { analytics } = usePortfolio()
  const { allocation } = analytics

  const toItems = (rows: AllocationRow[]) =>
    rows.map((r) => ({ label: r.label, value: r.weight, caption: fmtPct(r.weight) }))

  return (
    <div className="view">
      <div className="row three">
        <Panel title="By Asset Class" hint="% of NAV">
          <BarChart items={toItems(allocation.byAssetClass)} />
        </Panel>
        <Panel title="By Sector" hint="% of NAV">
          <BarChart items={toItems(allocation.bySector)} />
        </Panel>
        <Panel title="By Region" hint="% of NAV">
          <BarChart items={toItems(allocation.byRegion)} />
        </Panel>
      </div>
    </div>
  )
}
