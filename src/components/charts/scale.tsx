/* eslint-disable react-refresh/only-export-components */
// Shared geometry and axis chrome for the hand-rolled monochrome SVG charts.
// Every chart uses the same viewBox width so panels line up across the terminal.

import type { ReactNode } from 'react'

export const CHART_W = 720

/** Plot-area insets in viewBox units. */
export interface Pads {
  l: number
  r: number
  t: number
  b: number
}

/**
 * Min/max of `values`, padded by `pct` of the span on each side.
 * Degenerate input (empty, or all values equal) still yields a usable span.
 */
export function paddedExtent(values: number[], pct = 0.06): [number, number] {
  let min = values.length ? Math.min(...values) : 0
  let max = values.length ? Math.max(...values) : 1
  if (min === max) {
    min -= 1
    max += 1
  }
  const span = max - min
  return [min - span * pct, max + span * pct]
}

/** `count` evenly spaced values from min to max, both ends inclusive. */
export function ticks(min: number, max: number, count = 5): number[] {
  return Array.from({ length: count }, (_, i) => min + (i / (count - 1)) * (max - min))
}

/** Value → y pixel, inverted because SVG y grows downward. */
export function yScale(min: number, max: number, height: number, pad: Pads) {
  return (v: number) => pad.t + (1 - (v - min) / (max - min)) * (height - pad.t - pad.b)
}

/** Index i of n evenly spaced points → x pixel. */
export function xIndexScale(n: number, pad: Pads) {
  return (i: number) => pad.l + (n <= 1 ? 0 : (i / (n - 1)) * (CHART_W - pad.l - pad.r))
}

/** Value → x pixel. */
export function xScale(min: number, max: number, pad: Pads) {
  return (x: number) => pad.l + ((x - min) / (max - min)) * (CHART_W - pad.l - pad.r)
}

export function ChartSvg({ height, children }: { height: number; children: ReactNode }) {
  return (
    <svg
      className="chart"
      viewBox={`0 0 ${CHART_W} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="xMidYMid meet"
    >
      {children}
    </svg>
  )
}

/** Horizontal grid lines with right-aligned value labels down the left edge. */
export function YGrid({
  values,
  yAt,
  pad,
  format,
}: {
  values: number[]
  yAt: (v: number) => number
  pad: Pads
  format: (n: number) => string
}) {
  return (
    <>
      {values.map((v, i) => {
        const y = yAt(v)
        return (
          <g key={i}>
            <line className="grid" x1={pad.l} y1={y} x2={CHART_W - pad.r} y2={y} />
            <text x={pad.l - 6} y={y + 3} textAnchor="end">
              {format(v)}
            </text>
          </g>
        )
      })}
    </>
  )
}
