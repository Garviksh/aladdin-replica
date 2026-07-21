export function Sparkline({
  values,
  width = 160,
  height = 34,
}: {
  values: number[]
  width?: number
  height?: number
}) {
  if (values.length < 2) {
    return <svg className="chart" width={width} height={height} aria-hidden />
  }
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const pad = 2
  const points = values
    .map((v, i) => {
      const x = pad + (i / (values.length - 1)) * (width - 2 * pad)
      const y = height - pad - ((v - min) / span) * (height - 2 * pad)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
  return (
    <svg
      className="chart"
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      preserveAspectRatio="none"
      aria-hidden
    >
      <polyline className="line-primary" points={points} />
    </svg>
  )
}
