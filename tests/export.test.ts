import { describe, expect, it } from 'vitest'
import { getMarket } from '../src/engine'
import { toHoldingsCsv } from '../src/lib/exportCsv'

const m = getMarket(20260721, 'sim')

describe('holdings CSV export', () => {
  it('has a header row and one row per position', () => {
    const lines = toHoldingsCsv(m.portfolio).split('\n')
    expect(lines[0]).toContain('Ticker')
    expect(lines[0]).toContain('MarketValue')
    expect(lines.length).toBe(m.portfolio.positions.length + 1)
  })

  it('emits a consistent 11 columns on every row', () => {
    const lines = toHoldingsCsv(m.portfolio).split('\n')
    const cols = lines[0].split(',').length
    expect(cols).toBe(11)
    for (const line of lines.slice(1)) expect(line.split(',').length).toBe(cols)
  })
})
