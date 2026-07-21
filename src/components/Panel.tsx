import type { ReactNode } from 'react'

export function Panel({
  title,
  hint,
  flush,
  children,
}: {
  title: string
  hint?: ReactNode
  flush?: boolean
  children: ReactNode
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <span>{title}</span>
        {hint != null ? <span className="hint">{hint}</span> : null}
      </div>
      <div className={flush ? 'panel-body flush' : 'panel-body'}>{children}</div>
    </section>
  )
}
