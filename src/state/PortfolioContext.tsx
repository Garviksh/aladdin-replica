import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { REAL_META, realDataAvailable, type DataMode } from '../data/market'
import { buildAnalytics } from '../engine'
import type { Analytics } from '../types/domain'

interface PortfolioCtx {
  seed: number
  setSeed: (n: number) => void
  reseed: () => void
  mode: DataMode
  realAvailable: boolean
  preview: boolean
  setPreview: (b: boolean) => void
  /** True when there is no real data and the user hasn't opted into sample preview. */
  showGate: boolean
  dataAsOf: string | null
  dataSource: string | null
  analytics: Analytics
}

const Ctx = createContext<PortfolioCtx | null>(null)

const DEFAULT_SEED = 20260721

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const [seed, setSeed] = useState(DEFAULT_SEED)
  const realAvailable = realDataAvailable()
  const [preview, setPreview] = useState(false)

  // Real data is the only "real" mode. Sample data is shown ONLY if the user
  // explicitly opts into preview from the gate.
  const mode: DataMode = realAvailable ? 'real' : 'sim'
  const analytics = useMemo(() => buildAnalytics(seed, mode), [seed, mode])
  const showGate = !realAvailable && !preview

  const value = useMemo<PortfolioCtx>(
    () => ({
      seed,
      setSeed,
      reseed: () => setSeed(Math.floor(Math.random() * 1_000_000) + 1),
      mode,
      realAvailable,
      preview,
      setPreview,
      showGate,
      dataAsOf: REAL_META.asOf,
      dataSource: REAL_META.source,
      analytics,
    }),
    [seed, mode, realAvailable, preview, showGate, analytics],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePortfolio(): PortfolioCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('usePortfolio must be used within a PortfolioProvider')
  return ctx
}
