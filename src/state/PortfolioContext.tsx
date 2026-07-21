import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { REAL_META, realDataAvailable, type DataMode } from '../data/market'
import { buildAnalytics } from '../engine'
import type { Analytics } from '../types/domain'

interface PortfolioCtx {
  seed: number
  setSeed: (n: number) => void
  reseed: () => void
  mode: DataMode
  setMode: (m: DataMode) => void
  realAvailable: boolean
  dataAsOf: string | null
  dataSource: string | null
  analytics: Analytics
}

const Ctx = createContext<PortfolioCtx | null>(null)

/** Default seed encodes the build date for a stable, reproducible first load. */
const DEFAULT_SEED = 20260721

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [seed, setSeed] = useState(DEFAULT_SEED)
  const [mode, setMode] = useState<DataMode>(() => (realDataAvailable() ? 'real' : 'sim'))
  const analytics = useMemo(() => buildAnalytics(seed, mode), [seed, mode])
  const value = useMemo<PortfolioCtx>(
    () => ({
      seed,
      setSeed,
      reseed: () => setSeed(Math.floor(Math.random() * 1_000_000) + 1),
      mode,
      setMode,
      realAvailable: realDataAvailable(),
      dataAsOf: REAL_META.asOf,
      dataSource: REAL_META.source,
      analytics,
    }),
    [seed, mode, analytics],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePortfolio(): PortfolioCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('usePortfolio must be used within a PortfolioProvider')
  return ctx
}
