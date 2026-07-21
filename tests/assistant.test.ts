import { describe, expect, it } from 'vitest'
import { respond } from '../src/assistant/respond'
import { buildAnalytics } from '../src/engine'

const SEED = 20260721
const ctx = { analytics: buildAnalytics(SEED), seed: SEED, mode: 'sim' as const }

describe('Copilot respond (local, deterministic)', () => {
  it('greets and offers help', () => {
    expect(respond('hi', ctx).toLowerCase()).toContain('local')
    expect(respond('help', ctx)).toContain('•')
  })

  it('answers value and risk questions from the analytics', () => {
    expect(respond("what's my nav?", ctx)).toMatch(/Net Asset Value/i)
    expect(respond('how much could I lose?', ctx)).toMatch(/VaR/i)
    expect(respond('which position is riskiest?', ctx)).toMatch(/risk contributor/i)
  })

  it('answers performance, allocation, and compliance questions', () => {
    expect(respond('how am I doing vs the benchmark?', ctx)).toMatch(/return/i)
    expect(respond('am I too concentrated?', ctx)).toMatch(/sector|allocation/i)
    expect(respond('any breaches?', ctx)).toMatch(/breach|pass|warning/i)
  })

  it('computes a what-if price shock for a held ticker', () => {
    const r = respond('what if NVDA drops 20%?', ctx)
    expect(r).toMatch(/NVDA/)
    expect(r).toMatch(/NAV/)
  })

  it('explains concepts and gives a forecast', () => {
    expect(respond('explain beta', ctx)).toMatch(/benchmark/i)
    expect(respond('what is a drawdown?', ctx)).toMatch(/peak/i)
    expect(respond("what's the 1-year outlook?", ctx)).toMatch(/Monte Carlo|expected value/i)
  })

  it('never throws and always returns a non-empty string', () => {
    for (const q of ['', 'asdkjfh', 'tell me about AAPL', 'best movers', 'recommend something']) {
      const r = respond(q, ctx)
      expect(typeof r).toBe('string')
      expect(r.length).toBeGreaterThan(0)
    }
  })
})
