export interface LineSeries {
  name: string
  values: number[]
  dashed?: boolean
}

export function LineChart({
  series,
  yFormat,
  height = 240,
  baseline,
}: {
  series: LineSeries[]
  yFormat?: (n: number) => string
  height?: number
  baseline?: number
}) {
  const W = 720
  const H = height
  const padL = 54
  const padR = 12
  const padT = 12
  const padB = 22

  const all = series.flatMap((s) => s.values)
  if (baseline !== undefined) all.push(baseline)
  let min = all.length ? Math.min(...all) : 0
  let max = all.length ? Math.max(...all) : 1
  if (min === max) {
    min -= 1
    max += 1
  }
  const rng = max - min
  min -= rng * 0.06
  max += rng * 0.06

  const n = Math.max(1, ...series.map((s) => s.values.length))
  const xAt = (i: number) => padL + (n <= 1 ? 0 : (i / (n - 1)) * (W - padL - padR))
  const yAt = (v: number) => padT + (1 - (v - min) / (max - min)) * (H - padT - padB)

  const ticks = 4
  const gridY = Array.from({ length: ticks + 1 }, (_, i) => min + (i / ticks) * (max - min))
  const fmt = yFormat ?? ((v: number) => v.toFixed(2))

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
        <line className="axis" x1={padL} y1={padT} x2={padL} y2={H - padB} />
        <line className="axis" x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} />
        {baseline !== undefined ? (
          <line className="zero" x1={padL} y1={yAt(baseline)} x2={W - padR} y2={yAt(baseline)} />
        ) : null}
        {series.map((s, si) => (
          <polyline
            key={si}
            className={s.dashed ? 'line-secondary' : 'line-primary'}
            points={s.values.map((v, i) => `${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`).join(' ')}
          />
        ))}
      </svg>
      <div className="legend">
        {series.map((s, si) => (
          <span key={si}>
            <span className={s.dashed ? 'swatch dashed' : 'swatch'} />
            {s.name}
          </span>
        ))}
      </div>
    </div>
  )
}
