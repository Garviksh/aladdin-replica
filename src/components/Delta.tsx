import type { ReactNode } from 'react'
import { marker, signClass } from '../lib/format'

/** Renders a value with a monochrome ▲/▼ direction marker. */
export function Delta({ value, children }: { value: number; children: ReactNode }) {
  return (
    <span className={signClass(value)}>
      <span className="mark">{marker(value)}</span>
      {children}
    </span>
  )
}
