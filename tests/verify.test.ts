import { describe, expect, it } from 'vitest'
import { flagUnknownFigures } from '../src/assistant/verify'

const snap = 'NAV $106.00M, invested $101.23M, VaR99 $2.27M'

describe('figure verifier', () => {
  it('flags scaled $ amounts not in the snapshot', () => {
    expect(flagUnknownFigures('It could be worth $9.99M', snap)).toContain('$9.99M')
  })

  it('does not flag amounts present in the snapshot', () => {
    expect(flagUnknownFigures('Your NAV is $106.00M', snap)).toEqual([])
  })

  it('ignores bare (unscaled) dollar amounts', () => {
    expect(flagUnknownFigures('about $500 here', 'nothing relevant')).toEqual([])
  })
})
