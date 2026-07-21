import { describe, expect, it } from 'vitest'
import { getMarket } from '../src/data/market'
import { betaOf, estimateBetas } from '../src/engine/factors'

const m = getMarket(20260721, 'sim')
const betas = estimateBetas(m.portfolio.positions, m.returns, m.benchmarkReturns)
const pos = (id: string) => m.portfolio.positions.find((p) => p.instrument.id === id)!

describe('data-driven factor betas', () => {
  it('produces a beta entry for every holding', () => {
    expect(betas.size).toBe(m.portfolio.positions.length)
  })

  it('gives equities a higher equity beta than bond ETFs', () => {
    expect(betaOf(betas, pos('NVDA'), 'equity')).toBeGreaterThan(betaOf(betas, pos('IEF'), 'equity'))
  })

  it('recovers a high self-beta for the rates proxy (IEF ~ rates)', () => {
    expect(betaOf(betas, pos('IEF'), 'rates')).toBeGreaterThan(0.5)
  })

  it('falls back to the model prior when no map is supplied', () => {
    expect(betaOf(undefined, pos('NVDA'), 'equity')).toBe(pos('NVDA').instrument.betas.equity)
  })
})
