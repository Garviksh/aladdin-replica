import { describe, expect, it } from 'vitest'
import { getMarket } from '../src/engine'
import { estimateBetas } from '../src/engine/factors'
import { computeStressImpact } from '../src/engine/stress'

const m = getMarket(20260721, 'sim')
const betas = estimateBetas(m.portfolio.positions, m.returns, m.benchmarkReturns)

describe('scenario stress test', () => {
  it('an equity crash produces a negative book P&L', () => {
    const res = computeStressImpact(m.portfolio, betas, { equity: -0.2 })
    expect(res.totalPnl).toBeLessThan(0)
    expect(res.rows.length).toBeGreaterThan(0)
  })

  it('no shocks produce no impact', () => {
    const res = computeStressImpact(m.portfolio, betas, {})
    expect(res.rows.length).toBe(0)
    expect(res.totalPnl).toBe(0)
  })

  it('equities are hit harder than treasuries under an equity shock', () => {
    const res = computeStressImpact(m.portfolio, betas, { equity: -0.2 })
    const nvda = res.rows.find((r) => r.ticker === 'NVDA')
    const ief = res.rows.find((r) => r.ticker === 'IEF')
    expect(nvda).toBeTruthy()
    if (ief) expect(nvda!.pnlPct).toBeLessThan(ief.pnlPct)
  })
})
