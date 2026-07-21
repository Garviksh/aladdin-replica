// Ollama integration — runs a local LLM (http://localhost:11434) as the Copilot
// brain. Everything stays on your machine: the dashboard data is sent only to
// your local Ollama server, never to the cloud.
//
// Setup:
//   1. Install Ollama:  https://ollama.com
//   2. Pull a model:    ollama pull llama3.2
//   3. Allow the web app to call it (CORS), then start Ollama:
//        OLLAMA_ORIGINS=* ollama serve
import { fmtCurrency, fmtPct, fmtSignedPct } from '../lib/format'
import type { Analytics } from '../types/domain'
import type { Forecast } from '../engine/forecast'

export const OLLAMA_URL = 'http://localhost:11434'

const MODEL_PREFERENCE = ['llama3.2', 'llama3.1', 'llama3', 'qwen2.5', 'mistral', 'phi3', 'gemma2']

/** Choose a sensible default from installed models. */
export function pickModel(models: string[]): string {
  for (const pref of MODEL_PREFERENCE) {
    const hit = models.find((m) => m.startsWith(pref))
    if (hit) return hit
  }
  return models[0] ?? 'llama3.2'
}

/** List installed models, or null if Ollama isn't reachable. */
export async function ollamaModels(): Promise<string[] | null> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`)
    if (!res.ok) return null
    const j = (await res.json()) as { models?: Array<{ name?: string }> }
    return (j.models ?? []).map((m) => m.name ?? '').filter(Boolean)
  } catch {
    return null
  }
}

function holdingsBlock(a: Analytics): string {
  return a.portfolio.positions
    .map(
      (p) =>
        `  ${p.instrument.ticker.padEnd(5)} ${p.instrument.assetClass} | ${fmtPct(p.weight)} of NAV` +
        ` | day ${fmtSignedPct(p.dayChangePct)} | uPnL ${fmtCurrency(p.unrealizedPnl, { compact: true })}` +
        ` | ${p.instrument.sector}`,
    )
    .join('\n')
}

/** Compact, factual snapshot of the live dashboard for grounding the model. */
export function snapshotText(a: Analytics, forecast?: Forecast): string {
  const nav = a.portfolio.totalValue
  const r = a.risk
  const p = a.performance
  const breaches = a.compliance.filter((c) => c.status === 'breach')
  const warns = a.compliance.filter((c) => c.status === 'warn')
  const lines: string[] = []
  lines.push(`As of ${a.portfolio.asOf || 'n/a'}; benchmark ${a.benchmarkName}; ${a.lookbackDays} trading days.`)
  lines.push(
    `NAV ${fmtCurrency(nav)} = invested ${fmtCurrency(a.portfolio.investedValue)} + cash ${fmtCurrency(a.portfolio.cash)}.`,
  )
  lines.push(
    `Risk: ex-ante vol ${fmtPct(r.annualVol)}, 1d VaR95 ${fmtCurrency(r.var95_1d)}, VaR99 ${fmtCurrency(r.var99_1d)} (${fmtPct(r.var99_1d / nav)} of NAV), CVaR95 ${fmtCurrency(r.cvar95_1d)}, CVaR99 ${fmtCurrency(r.cvar99_1d)}, beta ${r.beta.toFixed(2)}, diversification ${fmtPct(r.diversification)}.`,
  )
  const bt99 = r.backtest.levels.find((l) => l.level === 0.99)
  lines.push(
    `Tail: Cornish-Fisher VaR99 ${fmtCurrency(r.cfVar99_1d)}, historical VaR99 ${fmtCurrency(r.histVar99_1d)}, skew ${r.skew.toFixed(2)}, excess kurtosis ${r.exKurt.toFixed(2)}. VaR backtest 99%: ${bt99 ? `${bt99.exceptions} exceptions vs ${bt99.expected.toFixed(1)} expected (${bt99.pass ? 'PASS' : 'FAIL'})` : 'n/a'}.`,
  )
  lines.push(
    `Performance: total ${fmtSignedPct(p.totalReturn)} vs benchmark ${fmtSignedPct(p.benchmarkReturn)} (active ${fmtSignedPct(p.activeReturn)}), Sharpe ${p.sharpe.toFixed(2)}, Sortino ${p.sortino.toFixed(2)}, Calmar ${p.calmar.toFixed(2)}, InfoRatio ${p.informationRatio.toFixed(2)}, TE ${fmtPct(p.trackingError)}, max drawdown ${fmtSignedPct(p.maxDrawdown)}.`,
  )
  lines.push(
    `Factor exposures: ${r.factorExposures.map((f) => `${f.label} ${f.exposure.toFixed(2)}`).join(', ')}.`,
  )
  lines.push(
    `Top risk contributors: ${r.components.slice(0, 5).map((c) => `${c.ticker} ${fmtPct(c.pctOfRisk)}`).join(', ')}.`,
  )
  lines.push(
    `Allocation by class: ${a.allocation.byAssetClass.map((x) => `${x.label} ${fmtPct(x.weight)}`).join(', ')}.`,
  )
  lines.push(
    `Compliance: ${breaches.length} breach, ${warns.length} warning of ${a.compliance.length} rules.` +
      (breaches.length ? ` Breaches: ${breaches.map((b) => `${b.label} (${b.observed} vs ${b.limit})`).join('; ')}.` : ''),
  )
  if (forecast) {
    lines.push(
      `1y Monte Carlo (${forecast.sims} paths): expected ${fmtCurrency(forecast.expValue, { compact: true })} (${fmtSignedPct(forecast.expReturn)}), 5-95% ${fmtCurrency(forecast.p5Value, { compact: true })}–${fmtCurrency(forecast.p95Value, { compact: true })}, P(loss) ${fmtPct(forecast.probLoss)}.`,
    )
  }
  lines.push('Holdings:')
  lines.push(holdingsBlock(a))
  return lines.join('\n')
}

/** System prompt: teaches the model the terminal and grounds it in live data. */
export function buildSystemPrompt(a: Analytics, forecast?: Forecast): string {
  return `You are ALADDIN Copilot, a portfolio & risk analyst embedded in a black-and-white investment terminal. You run locally via Ollama.

RULES:
- Answer using ONLY the live data below. Never invent tickers, prices, or numbers.
- Be concise and specific; prefer exact figures from the snapshot.
- You may explain concepts, interpret the data, and give a reasoned outlook, but you are NOT a financial advisor — add a one-line caution when giving opinions or predictions.
- If asked for something not in the data, say so briefly.

THE TERMINAL'S SECTIONS (what each does / how it works):
- Dashboard: headline KPIs (NAV, day P&L, ex-ante volatility, 1-day 99% VaR, beta, compliance), a portfolio-vs-benchmark growth chart, top movers, largest risk contributors, asset allocation, and a live market-news panel.
- Holdings: the full position blotter — ticker, asset class, sector, quantity, price, market value, weight (% of NAV), day change, unrealized P&L; sortable.
- Risk: ex-ante volatility √(wᵀΣw); Value-at-Risk (parametric z·σ·V and historical percentile) at 95%/99%; beta = cov(rp,rb)/var(rb); factor exposures (weighted betas to Equity/Rates/Credit/Commodity/FX); component contribution-to-risk (wᵢ·(Σw)ᵢ/σ, sums to total vol); historical stress scenarios.
- Performance: cumulative return vs benchmark, Sharpe, max drawdown, and return attribution by sector and asset class.
- Forecast: Monte Carlo projection of the book (percentile fan), expected value, probability of loss, horizon VaR, and per-asset expected-return targets.
- News: live headlines (via GDELT) for the market and each holding.
- Impact: a "News → Impact" model (you, via Ollama) that turns live headlines into estimated per-holding and book P&L using the factor betas.
- Allocation: exposure by asset class, sector, and region.
- Compliance: mandate rules (max position, sector concentration, equity ceiling, VaR limit, cash band, min diversification) flagged pass / warning / breach.
- Copilot (you): answer questions, explain any section, predict, and guide the user.

LIVE DATA SNAPSHOT:
${snapshotText(a, forecast)}`
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/** Non-streaming chat completion; returns the full message text. */
export async function askOllama(model: string, messages: ChatMessage[]): Promise<string> {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: false }),
  })
  if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`)
  const j = (await res.json()) as { message?: { content?: string } }
  return j.message?.content ?? ''
}

/** Stream a chat completion from Ollama, calling onToken for each text chunk. */
export async function askOllamaStream(
  model: string,
  messages: ChatMessage[],
  onToken: (t: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: true }),
    signal,
  })
  if (!res.ok || !res.body) throw new Error(`Ollama HTTP ${res.status}`)
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let nl: number
    while ((nl = buffer.indexOf('\n')) >= 0) {
      const line = buffer.slice(0, nl).trim()
      buffer = buffer.slice(nl + 1)
      if (!line) continue
      try {
        const j = JSON.parse(line) as { message?: { content?: string }; done?: boolean }
        if (j.message?.content) onToken(j.message.content)
        if (j.done) return
      } catch {
        /* ignore partial/non-JSON lines */
      }
    }
  }
}
