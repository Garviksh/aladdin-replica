import type { ReactNode } from 'react'

export function KpiTile({
  label,
  value,
  sub,
}: {
  label: string
  value: ReactNode
  sub?: ReactNode
}) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {sub != null ? <div className="kpi-sub">{sub}</div> : null}
    </div>
  )
}
