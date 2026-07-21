import { generateMarket } from '../data/generatePortfolio'
import { getMarket, realDataAvailable, REAL_META, type DataMode } from '../data/market'
import type { Analytics } from '../types/domain'
import { computeAllocation } from './allocation'
import { COV_METHODS, type CovMethod } from './covariance'
import { evaluateCompliance } from './compliance'
import { estimateBetas } from './factors'
import { computePerformance } from './performance'
import { computeRisk } from './risk'
import { runScenarios } from './scenarios'

/** Compose a full analytics snapshot for a given market seed and data mode. */
export function buildAnalytics(
  seed: number,
  mode: DataMode = 'sim',
  covMethod: CovMethod = 'sample',
): Analytics {
  const { portfolio, returns, benchmarkReturns, dates, benchmarkName, lookbackDays } = getMarket(
    seed,
    mode,
  )
  const betas = estimateBetas(portfolio.positions, returns, benchmarkReturns)
  const risk = computeRisk(portfolio, returns, benchmarkReturns, betas, covMethod)
  const performance = computePerformance(portfolio, returns, benchmarkReturns, dates)
  const compliance = evaluateCompliance(portfolio, risk)
  const scenarios = runScenarios(portfolio, betas)
  const allocation = computeAllocation(portfolio)
  return {
    portfolio,
    risk,
    performance,
    compliance,
    scenarios,
    allocation,
    benchmarkName,
    lookbackDays,
  }
}

export { generateMarket, getMarket, realDataAvailable, REAL_META, COV_METHODS }
export type { DataMode, CovMethod }
