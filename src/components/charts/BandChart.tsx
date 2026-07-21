export interface Band {
  p5: number
  p25: number
  p50: number
  p75: number
  p95: number
}

/** Monochrome percentile fan chart (P5–P95 outer, P25–P75 inner, median line). */
export function BandChart({
  bands,
  startValue,
  yFormat,
  height = 260,
}: {
  bands: Band[]
  startValue: number
  yFormat?: (n: number) => string
  height?: number
}) {
  const W = 720
  const H = height
  const padL = 66
  const padR = 12
  const padT = 12
  const padB = 22
  const n = bands.length

  const all = bands.flatMap((b) => [b.p5, b.p95])
  all.push(startValue)
  let min = all.length ? Math.min(...all) : 0
  let max = all.length ? Math.max(...all) : 1
  const rng = max - min || 1
  min -= rng * 0.06
  max += rng * 0.06

  const xAt = (i: number) => padL + (n <= 1 ? 0 : (i / (n - 1)) * (W - padL - padR))
  const yAt = (v: number) => padT + (1 - (v - min) / (max - min)) * (H - padT - padB)
  const fmt = yFormat ?? ((v: number) => v.toFixed(0))

  const areaPath = (lo: (b: Band) => number, hi: (b: Band) => number) => {
    const top = bands.map((b, i) => `${xAt(i).toFixed(1)},${yAt(hi(b)).toFixed(1)}`)
    const bot = bands.map((b, i) => `${xAt(i).toFixed(1)},${yAt(lo(b)).toFixed(1)}`).reverse()
    return `M${top.join(' L')} L${bot.join(' L')} Z`
  }
  const median = bands.map((b, i) => `${xAt(i).toFixed(1)},${yAt(b.p50).toFixed(1)}`).join(' ')
  const gridY = Array.from({ length: 5 }, (_, i) => min + (i / 4) * (max - min))

  return (
    <div>
      <svg
        className="chart"
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        preserveAspectRatio="xMidYMid meet"
      >
        {gridY.map((g, i) => {
          const y = yAt(g)
          return (
            <g key={i}>
              <line className="grid" x1={padL} y1={y} x2={W - padR} y2={y} />
              <text x={padL - 6} y={y + 3} textAnchor="end">
                {fmt(g)}
              </text>
            </g>
          )
        })}
        <path d={areaPath((b) => b.p5, (b) => b.p95)} className="band-outer" />
        <path d={areaPath((b) => b.p25, (b) => b.p75)} className="band-inner" />
        <polyline className="line-primary" points={median} />
        <line className="zero" x1={padL} y1={yAt(startValue)} x2={W - padR} y2={yAt(startValue)} />
        <line className="axis" x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} />
      </svg>
      <div className="legend">
        <span>
          <span className="swatch box outer" />
          5–95%
        </span>
        <span>
          <span className="swatch box inner" />
          25–75%
        </span>
        <span>
          <span className="swatch" />
          Median
        </span>
        <span>
          <span className="swatch dashed" />
          Today
        </span>
      </div>
    </div>
  )
}
