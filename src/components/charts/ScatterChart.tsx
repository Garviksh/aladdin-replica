export interface ScatterPoint {
  x: number
  y: number
}
export interface ScatterMarker extends ScatterPoint {
  label: string
}

/** Monochrome scatter (used for the efficient frontier: x = vol, y = return). */
export function ScatterChart({
  points,
  markers,
  xFormat,
  yFormat,
  height = 300,
}: {
  points: ScatterPoint[]
  markers: ScatterMarker[]
  xFormat?: (n: number) => string
  yFormat?: (n: number) => string
  height?: number
}) {
  const W = 720
  const H = height
  const padL = 52
  const padR = 70
  const padT = 14
  const padB = 30

  const all = [...points, ...markers]
  const xs = all.map((p) => p.x)
  const ys = all.map((p) => p.y)
  let xmin = Math.min(...xs)
  let xmax = Math.max(...xs)
  let ymin = Math.min(...ys)
  let ymax = Math.max(...ys)
  const xr = xmax - xmin || 1
  const yr = ymax - ymin || 1
  xmin -= xr * 0.05
  xmax += xr * 0.05
  ymin -= yr * 0.1
  ymax += yr * 0.1

  const xAt = (x: number) => padL + ((x - xmin) / (xmax - xmin)) * (W - padL - padR)
  const yAt = (y: number) => padT + (1 - (y - ymin) / (ymax - ymin)) * (H - padT - padB)
  const xf = xFormat ?? ((v: number) => v.toFixed(1))
  const yf = yFormat ?? ((v: number) => v.toFixed(1))
  const gx = Array.from({ length: 5 }, (_, i) => xmin + (i / 4) * (xmax - xmin))
  const gy = Array.from({ length: 5 }, (_, i) => ymin + (i / 4) * (ymax - ymin))

  return (
    <svg
      className="chart"
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={H}
      preserveAspectRatio="xMidYMid meet"
    >
      {gy.map((g, i) => {
        const y = yAt(g)
        return (
          <g key={`y${i}`}>
            <line className="grid" x1={padL} y1={y} x2={W - padR} y2={y} />
            <text x={padL - 6} y={y + 3} textAnchor="end">
              {yf(g)}
            </text>
          </g>
        )
      })}
      {gx.map((g, i) => (
        <text key={`x${i}`} x={xAt(g)} y={H - padB + 14} textAnchor="middle">
          {xf(g)}
        </text>
      ))}
      <line className="axis" x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} />
      <line className="axis" x1={padL} y1={padT} x2={padL} y2={H - padB} />
      {points.map((p, i) => (
        <circle key={i} cx={xAt(p.x)} cy={yAt(p.y)} r={2} fill="#c2c2c2" />
      ))}
      {markers.map((m, i) => (
        <g key={`m${i}`}>
          <circle cx={xAt(m.x)} cy={yAt(m.y)} r={4} fill="#111" />
          <text x={xAt(m.x) + 7} y={yAt(m.y) + 3} fontSize={9} fill="#111">
            {m.label}
          </text>
        </g>
      ))}
    </svg>
  )
}
