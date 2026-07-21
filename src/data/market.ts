import { generateMarket, type Market } from './generatePortfolio'
import { hasRealData, loadRealMarket, REAL_META } from './realData'

export type DataMode = 'sim' | 'real'
export type { Market }
export { REAL_META }

/** Whether a real Stooq dataset has been generated (npm run refresh-data). */
export function realDataAvailable(): boolean {
  return hasRealData()
}

/** Return the market for the requested mode, falling back to simulation. */
export function getMarket(seed: number, mode: DataMode): Market {
  if (mode === 'real' && hasRealData()) return loadRealMarket(seed)
  return generateMarket(seed)
}
