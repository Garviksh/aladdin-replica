import { describe, expect, it } from 'vitest'
import { getMarket } from '../src/data/market'
import { covByMethod, ewmaCovMatrix, shrinkageCovMatrix } from '../src/engine/covariance'
import { covMatrix } from '../src/engine/stats'

const m = getMarket(20260721, 'sim')
const S = covMatrix(m.returns)

describe('covariance estimators', () => {
  it('EWMA is symmetric with a positive diagonal', () => {
    const E = ewmaCovMatrix(m.returns)
    for (let i = 0; i < E.length; i++) {
      expect(E[i][i]).toBeGreaterThan(0)
      for (let j = 0; j < E.length; j++) expect(E[i][j]).toBeCloseTo(E[j][i], 12)
    }
  })

  it('shrinkage keeps a positive diagonal and same shape', () => {
    const Sh = shrinkageCovMatrix(m.returns)
    expect(Sh.length).toBe(S.length)
    for (let i = 0; i < Sh.length; i++) expect(Sh[i][i]).toBeGreaterThan(0)
  })

  it('covByMethod dispatches to the right estimator', () => {
    expect(covByMethod(m.returns, 'sample')[0][0]).toBeCloseTo(S[0][0], 12)
    expect(covByMethod(m.returns, 'ewma').length).toBe(S.length)
    expect(covByMethod(m.returns, 'shrinkage').length).toBe(S.length)
  })
})
