import type { DataMode } from '../data/market'
import { buildForecast } from '../engine/forecast'
import { fmtCurrency, fmtNumber, fmtPct, fmtSignedPct } from '../lib/format'
import type { Analytics, Portfolio } from '../types/domain'
import { findConcept } from './knowledge'

export interface CopilotContext {
  analytics: Analytics
  seed: number
  mode: DataMode
}

export const HELP = [
  'I answer from this dashboard — entirely on your device, with zero network calls. Try:',
  '• Value — “what’s my NAV?”, “how did we do today?”',
  '• Risk — “what’s my VaR?”, “which position is riskiest?”',
  '• Performance — “how am I doing vs the benchmark?”',
  '• Allocation — “am I too concentrated?”',
  '• Compliance — “any breaches?”',
  '• Forecast — “what’s the 1-year outlook?”',
  '• Holdings — “tell me about NVDA”',
  '• What-if — “what if NVDA drops 20%?”',
  '• Concepts — “explain VaR”, “what is beta?”',
].join('\n')

function findPosition(q: string, portfolio: Portfolio) {
  return portfolio.positions.find((p) =>
    new RegExp(`\\b${p.instrument.ticker.toLowerCase()}\\b`).test(q),
  )
}

function parseShock(q: string, portfolio: Portfolio): string | null {
  const pos = findPosition(q, portfolio)
  if (!pos) return null
  const num = q.match(/(\d+(?:\.\d+)?)\s*(?:%|percent)/)
  const down = /\b(drop|drops|fall|falls|down|lose|loses|crash|slump|declin|tank|sink)/.test(q)
  const up = /\b(rise|rises|gain|gains|jump|rally|surge|soar|up\b)/.test(q)
  if (!num || (!down && !up)) return null
  const pct = parseFloat(num[1]) / 100
  const shock = down ? -pct : pct
  const impact = pos.marketValue * shock
  const navPct = impact / portfolio.totalValue
  return (
    `If ${pos.instrument.ticker} ${down ? 'falls' : 'rises'} ${(pct * 100).toFixed(0)}%, ` +
    `its value changes by ${fmtCurrency(impact)} — about ${fmtSignedPct(navPct)} of NAV ` +
    `(position weight ${fmtPct(pos.weight)}). This is a direct price shock on the holding; ` +
    `correlated names would likely move too — see the Risk tab’s stress scenarios for a factor-based view.`
  )
}

function positionAnswer(q: string, portfolio: Portfolio): string | null {
  const pos = findPosition(q, portfolio)
  if (!pos) return null
  return (
    `${pos.instrument.ticker} (${pos.instrument.name}): ${fmtNumber(pos.quantity, 0)} shares at ` +
    `${fmtCurrency(pos.price, { decimals: 2 })} = ${fmtCurrency(pos.marketValue)} ` +
    `(${fmtPct(pos.weight)} of NAV). Day ${fmtSignedPct(pos.dayChangePct)}, unrealized P&L ` +
    `${fmtCurrency(pos.unrealizedPnl)}. ${pos.instrument.assetClass} · ${pos.instrument.sector}.`
  )
}

function recommendation(a: Analytics): string {
  const tips: string[] = []
  const breaches = a.compliance.filter((c) => c.status === 'breach')
  if (breaches.length)
    tips.push(`Cure ${breaches.length} compliance breach(es) first: ${breaches.map((b) => b.label).join(', ')}.`)
  const topSec = a.allocation.bySector[0]
  if (topSec && topSec.weight > 0.3)
    tips.push(`Sector concentration is high — ${topSec.label} is ${fmtPct(topSec.weight)} of NAV; consider trimming.`)
  const topRisk = a.risk.components[0]
  if (topRisk && topRisk.pctOfRisk > 0.2)
    tips.push(`${topRisk.ticker} drives ${fmtPct(topRisk.pctOfRisk)} of risk; reducing it would most lower volatility.`)
  if (a.risk.diversification < 0.2)
    tips.push(`Diversification is modest (${fmtPct(a.risk.diversification)}); lower-correlation assets would help.`)
  if (a.performance.sharpe < 0.5)
    tips.push(`Sharpe is ${a.performance.sharpe.toFixed(2)} — you may not be paid enough for the risk taken.`)
  if (!tips.length)
    tips.push('The book looks balanced: no breaches, concentration and risk contributions are reasonable, and risk-adjusted return is healthy.')
  return `${tips.join(' ')} (General observations from your data — not investment advice.)`
}

/** Deterministic, fully-local answer to a natural-language question. */
export function respond(raw: string, ctx: CopilotContext): string {
  const q = raw.toLowerCase().trim()
  const { analytics, seed, mode } = ctx
  const { portfolio, risk, performance, compliance, allocation, benchmarkName } = analytics
  const nav = portfolio.totalValue

  if (!q) return 'Ask me about NAV, risk, VaR, performance, allocation, compliance, or a forecast.'
  if (/\b(help|what can you|commands|examples)\b/.test(q)) return HELP
  if (/^(hi|hello|hey|yo|good (morning|afternoon|evening))\b/.test(q))
    return 'Hello — I’m your local Copilot. I read this dashboard on your device only; nothing leaves your browser. Ask about risk, performance, holdings, forecast, or compliance.'

  const shock = parseShock(q, portfolio)
  if (shock) return shock

  const askedConcept = /\b(what is|what's|whats|explain|define|meaning of|how does|tell me about)\b/.test(q)
  const concept = findConcept(q)
  if (askedConcept && concept && !findPosition(q, portfolio)) return concept

  if (/\b(how much|position|holding|shares|do i (own|hold)|about)\b/.test(q)) {
    const pa = positionAnswer(q, portfolio)
    if (pa) return pa
  }

  if (/\b(nav|net asset|portfolio value|worth|total value|aum)\b/.test(q))
    return `Net Asset Value is ${fmtCurrency(nav)} — ${fmtCurrency(portfolio.investedValue)} invested across ${portfolio.positions.length} positions plus ${fmtCurrency(portfolio.cash)} cash.`

  if (/\b(today|day p&?l|daily|move today)\b/.test(q)) {
    const dp = portfolio.positions.reduce((s, p) => s + p.dayPnl, 0)
    return `Today the book is ${dp >= 0 ? 'up' : 'down'} ${fmtCurrency(Math.abs(dp))} (${fmtSignedPct(dp / nav)}).`
  }

  if (/\b(riskiest|biggest risk|most risk|top risk|risk contributor)\b/.test(q) || /where.*risk/.test(q)) {
    const c = risk.components[0]
    return `${c.ticker} is the largest risk contributor at ${fmtPct(c.pctOfRisk)} of total risk (weight ${fmtPct(c.weight)}, standalone vol ${fmtPct(c.standaloneVol)}). Top three: ${risk.components
      .slice(0, 3)
      .map((x) => `${x.ticker} ${fmtPct(x.pctOfRisk)}`)
      .join(', ')}.`
  }

  if (/\bvar\b|value at risk|how much.*lose|worst.*day|downside/.test(q))
    return `1-day VaR: ${fmtCurrency(risk.var95_1d)} at 95% and ${fmtCurrency(risk.var99_1d)} at 99% (${fmtPct(risk.var99_1d / nav)} of NAV). Historical 95% VaR is ${fmtCurrency(risk.histVar95_1d)}. VaR is a threshold, not the worst case.`

  if (/\b(volatility|vol|risk|how risky|beta)\b/.test(q))
    return `Ex-ante volatility ${fmtPct(risk.annualVol)} annualized; beta ${risk.beta.toFixed(2)} vs ${benchmarkName}; diversification ${fmtPct(risk.diversification)}. Largest risk contributor: ${risk.components[0].ticker} (${fmtPct(risk.components[0].pctOfRisk)}).`

  if (/\b(performance|return|benchmark|sharpe|drawdown|beating|alpha)/.test(q) || /how.*doing/.test(q))
    return `Total return ${fmtSignedPct(performance.totalReturn)} vs benchmark ${fmtSignedPct(performance.benchmarkReturn)} → active ${fmtSignedPct(performance.activeReturn)}. Sharpe ${performance.sharpe.toFixed(2)}, max drawdown ${fmtSignedPct(performance.maxDrawdown)}.`

  if (/\b(allocation|exposure|concentrat|sector|asset class|diversif)/.test(q)) {
    const ac = allocation.byAssetClass.map((a) => `${a.label} ${fmtPct(a.weight)}`).join(', ')
    const topSec = allocation.bySector[0]
    return `Allocation: ${ac}. Largest sector is ${topSec.label} at ${fmtPct(topSec.weight)} of NAV. Diversification ratio ${fmtPct(risk.diversification)}.`
  }

  if (/\b(complian|breach|limit|mandate|rule|violat)/.test(q)) {
    const breaches = compliance.filter((c) => c.status === 'breach')
    const warns = compliance.filter((c) => c.status === 'warn')
    if (breaches.length)
      return `${breaches.length} breach(es): ${breaches.map((b) => `${b.label} (${b.observed} vs limit ${b.limit})`).join('; ')}.${warns.length ? ` Plus ${warns.length} warning(s).` : ''} Trim or hedge to cure a breach before adding risk.`
    if (warns.length)
      return `No breaches. ${warns.length} warning(s): ${warns.map((w) => `${w.label} (${w.observed} vs ${w.limit})`).join('; ')}.`
    return 'All mandate rules pass — no breaches or warnings.'
  }

  if (/\b(forecast|predict|prediction|outlook|future|expect|projec)/.test(q) || /next (month|year|quarter)/.test(q)) {
    const f = buildForecast(seed, 252, 500, mode)
    return `1-year Monte Carlo (${f.sims} paths): expected value ${fmtCurrency(f.expValue, { compact: true })} (${fmtSignedPct(f.expReturn)}); 5–95% range ${fmtCurrency(f.p5Value, { compact: true })}–${fmtCurrency(f.p95Value, { compact: true })}; probability of ending below today ${fmtPct(f.probLoss)}. Model estimates, not advice.`
  }

  if (/\b(recommend|advice|advise|what should i|suggest|improve|de-?risk|reduce risk)/.test(q))
    return recommendation(analytics)

  if (/\b(mover|movers|gainer|loser|best|worst|winning|losing)\b/.test(q)) {
    const byPnl = [...portfolio.positions].sort((a, b) => b.dayPnl - a.dayPnl)
    const g = byPnl[0]
    const l = byPnl[byPnl.length - 1]
    return `Today’s best: ${g.instrument.ticker} ${fmtSignedPct(g.dayChangePct)} (${fmtCurrency(g.dayPnl)}). Worst: ${l.instrument.ticker} ${fmtSignedPct(l.dayChangePct)} (${fmtCurrency(l.dayPnl)}).`
  }

  if (askedConcept && concept) return concept

  return 'I didn’t catch that. I can cover NAV, day P&L, risk/VaR, volatility, beta, performance, allocation, concentration, compliance, forecasts, movers, and “what if” shocks. Type “help” for examples. (Answered locally — nothing leaves your browser.)'
}
