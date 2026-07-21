export interface TabDef {
  id: string
  label: string
}

export function TabNav({
  tabs,
  active,
  onSelect,
}: {
  tabs: TabDef[]
  active: string
  onSelect: (id: string) => void
}) {
  return (
    <nav className="tabbar" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={t.id === active}
          className={t.id === active ? 'tab active' : 'tab'}
          onClick={() => onSelect(t.id)}
        >
          {t.label}
        </button>
      ))}
    </nav>
  )
}
