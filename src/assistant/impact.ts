// News → Impact prediction. The local Ollama model classifies live headlines
// into market-impact events; those are mapped to portfolio P&L via the
// data-driven factor betas (engine/factors) and each holding's market value.
// Everything is a model estimate, not investment advice.
import type { Article } from '../data/news'
import { FACTORS } from '../data/universe'
import { betaOf, type BetaMap } from '../engine/factors'
import type { FactorKey, Portfolio } from '../types/domain'

const FACTOR_KEYS = FACTORS.map((f) => f.key)

export interface ImpactEvent {
  /** 'MARKET' for systemic, or a holding ticker for single-name. */
  scope: string
  /** A factor key, or 'price' for a direct single-stock move. */
  factor: FactorKey | 'price'
  /** +1 up, -1 down. */
  direction: number
  /** Expected fractional move (0..0.2). */
  magnitude: number
  /** Model confidence 0..1. */
  confidence: number
  headline?: string
}

export interface ImpactRow {
  ticker: string
  name: string
  pnl: number
  pnlPct: number
}

export interface ImpactResult {
  rows: ImpactRow[]
  totalPnl: number
  totalPct: number
  events: ImpactEvent[]
}

export function buildImpactPrompt(articles: Article[], tickers: string[]): string {
  const heads = articles
    .slice(0, 20)
    .map((a, i) => `${i + 1}. ${a.title} (${a.source})`)
    .join('\n')
  return `You are a markets analyst. From the headlines below, extract likely market-impact events for a portfolio.
Return ONLY a JSON array (no prose, no code fences). Each element:
{"scope":"MARKET" or one of [${tickers.join(', ')}],"factor":one of [${FACTOR_KEYS.join(', ')},"price"],"direction":-1 or 1,"magnitude":decimal 0..0.1,"confidence":decimal 0..1,"headline":"short"}
Rules:
- Single-company news: scope = that ticker, factor = "price".
- Systemic/macro news: scope = "MARKET", factor = the relevant factor.
- Ignore irrelevant headlines. Max 12 events.

HEADLINES:
${heads}`
}

/** Robustly parse the model's JSON array of events. */
export function parseImpactEvents(text: string): ImpactEvent[] {
  const start = text.indexOf('[')
  const end = text.lastIndexOf(']')
  if (start < 0 || end <= start) return []
  let arr: unknown
  try {
    arr = JSON.parse(text.slice(start, end + 1))
  } catch {
    return []
  }
  if (!Array.isArray(arr)) return []
  const out: ImpactEvent[] = []
  for (const raw of arr as Record<string, unknown>[]) {
    const scopeStr = String(raw.scope ?? '').trim()
    const scope = scopeStr.toUpperCase() === 'MARKET' ? 'MARKET' : scopeStr.toUpperCase()
    const factor = String(raw.factor ?? '').toLowerCase() as ImpactEvent['factor']
    if (!scope) continue
    if (factor !== 'price' && !FACTOR_KEYS.includes(factor as FactorKey)) continue
    const magnitude = Math.min(0.2, Math.max(0, Number(raw.magnitude) || 0))
    if (magnitude <= 0) continue
    out.push({
      scope,
      factor,
      direction: Number(raw.direction) >= 0 ? 1 : -1,
      magnitude,
      confidence: Math.min(
        1,
        Math.max(0, Number.isFinite(Number(raw.confidence)) ? Number(raw.confidence) : 0.5),
      ),
      headline: raw.headline ? String(raw.headline) : undefined,
    })
  }
  return out
}

/** Map events to per-holding and total P&L using data-driven betas. */
export function computeImpact(
  events: ImpactEvent[],
  portfolio: Portfolio,
  betas: BetaMap,
): ImpactResult {
  const pnlByTicker = new Map<string, number>()

  for (const ev of events) {
    const shock = ev.direction * ev.magnitude * ev.confidence
    if (shock === 0) continue

    if (ev.scope !== 'MARKET') {
      const p = portfolio.positions.find((x) => x.instrument.ticker === ev.scope)
      if (!p) continue
      const move = ev.factor === 'price' ? shock : betaOf(betas, p, ev.factor) * shock
      pnlByTicker.set(p.instrument.ticker, (pnlByTicker.get(p.instrument.ticker) ?? 0) + p.marketValue * move)
    } else {
      if (ev.factor === 'price') continue
      for (const p of portfolio.positions) {
        const move = betaOf(betas, p, ev.factor) * shock
        pnlByTicker.set(p.instrument.ticker, (pnlByTicker.get(p.instrument.ticker) ?? 0) + p.marketValue * move)
      }
    }
  }

  const rows: ImpactRow[] = portfolio.positions
    .map((p) => {
      const pnl = pnlByTicker.get(p.instrument.ticker) ?? 0
      return {
        ticker: p.instrument.ticker,
        name: p.instrument.name,
        pnl,
        pnlPct: p.marketValue ? pnl / p.marketValue : 0,
      }
    })
    .filter((r) => Math.abs(r.pnl) >= 1)
    .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))

  const totalPnl = rows.reduce((s, r) => s + r.pnl, 0)
  return {
    rows,
    totalPnl,
    totalPct: portfolio.investedValue ? totalPnl / portfolio.investedValue : 0,
    events,
  }
}
