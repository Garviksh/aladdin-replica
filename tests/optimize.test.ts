import { describe, expect, it } from 'vitest'
import { getMarket } from '../src/engine'
import { covByMethod } from '../src/engine/covariance'
import {
  expectedAnnualReturns,
  maxSharpeWeights,
  minVarianceWeights,
  portfolioVol,
  randomPortfolios,
  riskParityWeights,
} from '../src/engine/optimize'

const m = getMarket(20260721, 'sim')
const cov = covByMethod(m.returns, 'sample')
const k = m.returns.length
const equal = new Array<number>(k).fill(1 / k)

describe('optimizer', () => {
  it('min-variance weights are long-only and sum to 1', () => {
    const w = minVarianceWeights(cov)
    expect(w.length).toBe(k)
    expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6)
    for (const x of w) expect(x).toBeGreaterThanOrEqual(0)
  })

  it('min-variance volatility is no higher than equal-weight', () => {
    expect(portfolioVol(cov, minVarianceWeights(cov))).toBeLessThanOrEqual(
      portfolioVol(cov, equal) + 1e-9,
    )
  })

  it('risk-parity weights are positive and sum to 1', () => {
    const w = riskParityWeights(cov)
    expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6)
    for (const x of w) expect(x).toBeGreaterThan(0)
  })

  it('max-Sharpe weights are long-only and sum to 1', () => {
    const mu = expectedAnnualReturns(m.returns)
    const w = maxSharpeWeights(cov, mu)
    expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6)
    for (const x of w) expect(x).toBeGreaterThanOrEqual(0)
  })

  it('random portfolios return finite risk/return points', () => {
    const mu = expectedAnnualReturns(m.returns)
    const pts = randomPortfolios(cov, mu, 50)
    expect(pts.length).toBe(50)
    for (const p of pts) {
      expect(Number.isFinite(p.vol)).toBe(true)
      expect(Number.isFinite(p.ret)).toBe(true)
      expect(p.vol).toBeGreaterThanOrEqual(0)
    }
  })
})
