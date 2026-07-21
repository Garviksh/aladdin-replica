import { describe, expect, it } from 'vitest'
import { buildSystemPrompt, pickModel, snapshotText } from '../src/assistant/ollama'
import { buildAnalytics } from '../src/engine'

const a = buildAnalytics(20260721, 'sim')

describe('ollama prompt builder', () => {
  it('snapshot includes live figures and holdings', () => {
    const s = snapshotText(a)
    expect(s).toMatch(/NAV/)
    expect(s).toMatch(/Holdings:/)
    expect(s).toMatch(/VaR99/)
    expect(s).toMatch(/beta/i)
  })

  it('system prompt teaches every section and grounds in data', () => {
    const p = buildSystemPrompt(a)
    for (const sec of [
      'Dashboard',
      'Holdings',
      'Risk',
      'Performance',
      'Forecast',
      'News',
      'Allocation',
      'Compliance',
    ]) {
      expect(p).toContain(sec)
    }
    expect(p).toContain('ONLY the live data')
    expect(p.toLowerCase()).toContain('not a financial advisor')
  })

  it('pickModel prefers known families, else first', () => {
    expect(pickModel(['mistral:latest', 'llama3.2:latest'])).toBe('llama3.2:latest')
    expect(pickModel(['custom:1'])).toBe('custom:1')
  })
})
