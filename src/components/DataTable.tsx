import { useMemo, useState, type ReactNode } from 'react'

export interface Column<T> {
  key: string
  header: string
  num?: boolean
  sortable?: boolean
  /** Sort key extractor; required for a column to be sortable. */
  value?: (row: T) => number | string
  render: (row: T) => ReactNode
}

interface SortState {
  key: string
  dir: 'asc' | 'desc'
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  initialSort,
  footer,
}: {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T, i: number) => string
  initialSort?: SortState
  footer?: ReactNode
}) {
  const [sort, setSort] = useState<SortState | null>(initialSort ?? null)

  const sorted = useMemo(() => {
    if (!sort) return rows
    const col = columns.find((c) => c.key === sort.key)
    if (!col?.value) return rows
    const val = col.value
    const arr = [...rows].sort((a, b) => {
      const av = val(a)
      const bv = val(b)
      if (typeof av === 'number' && typeof bv === 'number') return av - bv
      return String(av).localeCompare(String(bv))
    })
    if (sort.dir === 'desc') arr.reverse()
    return arr
  }, [rows, sort, columns])

  const toggle = (c: Column<T>) => {
    if (!c.sortable || !c.value) return
    setSort((prev) =>
      prev && prev.key === c.key
        ? { key: c.key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key: c.key, dir: 'desc' },
    )
  }

  return (
    <table className="data">
      <thead>
        <tr>
          {columns.map((c) => {
            const cls = [c.num ? 'num' : '', c.sortable && c.value ? 'sortable' : '']
              .filter(Boolean)
              .join(' ')
            const arrow = sort && sort.key === c.key ? (sort.dir === 'asc' ? ' ▲' : ' ▼') : ''
            return (
              <th key={c.key} className={cls} onClick={() => toggle(c)}>
                {c.header}
                {arrow}
              </th>
            )
          })}
        </tr>
      </thead>
      <tbody>
        {sorted.map((row, i) => (
          <tr key={rowKey(row, i)}>
            {columns.map((c) => (
              <td key={c.key} className={c.num ? 'num' : ''}>
                {c.render(row)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
      {footer}
    </table>
  )
}
