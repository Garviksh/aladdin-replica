export function Heatmap({ labels, matrix }: { labels: string[]; matrix: number[][] }) {
  const k = labels.length
  const cell = 20
  const pad = 46
  const W = pad + cell * k
  const H = pad + cell * k

  // Correlation -1..1 → grayscale: +1 black, 0 mid, -1 white.
  const shade = (c: number) => {
    const g = Math.round(255 * (1 - (c + 1) / 2))
    return `rgb(${g},${g},${g})`
  }

  return (
    <svg
      className="chart"
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={Math.min(H, 460)}
      preserveAspectRatio="xMidYMid meet"
    >
      {labels.map((l, i) => (
        <text key={`c${i}`} x={pad + i * cell + cell / 2} y={pad - 6} textAnchor="middle" fontSize={8}>
          {l}
        </text>
      ))}
      {labels.map((l, i) => (
        <text key={`r${i}`} x={pad - 6} y={pad + i * cell + cell / 2 + 3} textAnchor="end" fontSize={8}>
          {l}
        </text>
      ))}
      {matrix.map((row, i) =>
        row.map((c, j) => (
          <rect
            key={`${i}-${j}`}
            x={pad + j * cell}
            y={pad + i * cell}
            width={cell - 1}
            height={cell - 1}
            fill={shade(c)}
            stroke="#e0e0e0"
            strokeWidth={0.5}
          >
            <title>{`${labels[i]} / ${labels[j]}: ${c.toFixed(2)}`}</title>
          </rect>
        )),
      )}
    </svg>
  )
}
