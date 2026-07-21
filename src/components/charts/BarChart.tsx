import type { CSSProperties } from 'react'

export interface BarItem {
  label: string
  value: number
  caption?: string
}

/** Horizontal bar chart. Set `signed` for data that can be negative (a centered
 *  zero line is drawn and bars grow left/right from the middle). */
export function BarChart({
  items,
  valueFormat,
  signed,
}: {
  items: BarItem[]
  valueFormat?: (n: number) => string
  signed?: boolean
}) {
  const maxAbs = Math.max(1e-9, ...items.map((i) => Math.abs(i.value)))
  const fmt = valueFormat ?? ((v: number) => v.toFixed(2))

  return (
    <div className="barchart">
      {items.map((it, idx) => {
        const pct = (Math.abs(it.value) / maxAbs) * 100
        const fillStyle: CSSProperties = signed
          ? it.value >= 0
            ? { left: '50%', width: `${pct / 2}%` }
            : { right: '50%', width: `${pct / 2}%` }
          : { left: 0, width: `${pct}%` }
        return (
          <div key={idx} className="barrow">
            <span className="barrow-label mono">{it.label}</span>
            <div className="bar-track">
              {signed ? <span className="bar-zero" /> : null}
              <div className="bar-fill" style={fillStyle} />
            </div>
            <span className="barrow-value mono right">{it.caption ?? fmt(it.value)}</span>
          </div>
        )
      })}
    </div>
  )
}
