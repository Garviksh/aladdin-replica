// Tool layer for the Ollama Copilot. These let the model QUERY the live engine
// (holdings, risk, scenarios, custom stress, macro) instead of relying only on a
// static snapshot — grounding answers in exact, freshly-computed numbers.
import { bakedMacro, hasMacroData } from '../data/macro'
import { deriveMacroSignals, macroNowcast } from '../engine/macro'
import { estimateBetas, type BetaMap } from '../engine/factors'
import { computeStressImpact } from '../engine/stress'
import type { Market } from '../data/generatePortfolio'
import type { Analytics, FactorKey } from '../types/domain'

export interface ToolContext {
  analytics: Analytics
  market: Market
  betas: BetaMap
}

/** Build a tool context (estimates betas once) from the current market. */
export function makeToolContext(analytics: Analytics, market: Market): ToolContext {
  const betas = estimateBetas(market.portfolio.positions, market.returns, market.benchmarkReturns)
  return { analytics, market, betas }
}

// --- Ollama function specifications (JSON-schema parameters) ----------------
export const TOOL_SPECS = [
  {
    type: 'function',
    function: {
      name: 'list_holdings',
      description: 'List every holding with ticker, weight (% of NAV), market value, asset class and sector.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_holding',
      description: 'Get detailed data for one holding by ticker (weight, market value, day change, unrealized P&L, sector, factor betas).',
      parameters: {
        type: 'object',
        properties: { ticker: { type: 'string', description: 'Ticker, e.g. AAPL' } },
        required: ['ticker'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_risk',
      description: 'Get the portfolio risk metrics: ex-ante vol, VaR/CVaR at 95/99, fat-tail VaR, beta, diversification, skew, kurtosis, VaR-backtest result.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_performance',
      description: 'Get performance stats: total & benchmark return, active return, Sharpe, Sortino, Calmar, information ratio, tracking error, max drawdown.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'top_risk_contributors',
      description: 'Get the holdings contributing the most to portfolio risk.',
      parameters: {
        type: 'object',
        properties: { n: { type: 'integer', description: 'How many (default 5)' } },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_scenario',
      description: 'Get stress-scenario P&L. With a key, returns that scenario; without, lists all scenarios with their P&L and whether they are realized from market history.',
      parameters: {
        type: 'object',
        properties: { key: { type: 'string', description: 'e.g. gfc2008, covid2020, inflation2022' } },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'stress_test',
      description: 'Apply custom factor shocks (as decimals, e.g. -0.2 = −20%) and return book P&L via the data-driven betas.',
      parameters: {
        type: 'object',
        properties: {
          equity: { type: 'number' },
          rates: { type: 'number' },
          credit: { type: 'number' },
          commodity: { type: 'number' },
          fx: { type: 'number' },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'price_move',
      description: 'Estimate the direct P&L on one holding if its price moves by pct (decimal, e.g. -0.2 = −20%), and that P&L as a share of NAV.',
      parameters: {
        type: 'object',
        properties: {
          ticker: { type: 'string' },
          pct: { type: 'number', description: 'Price change as a decimal, e.g. -0.2' },
        },
        required: ['ticker', 'pct'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_macro',
      description: 'Get current macro indicators (yields, 10Y-2Y curve, CPI, unemployment, VIX, Fed Funds), the macro-implied factor tilts, and the illustrative macro nowcast P&L. Returns loaded:false if macro data has not been refreshed.',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
]

const FACTOR_KEYS: FactorKey[] = ['equity', 'rates', 'credit', 'commodity', 'fx']

function round(x: number, d = 4): number {
  const f = 10 ** d
  return Math.round(x * f) / f
}

/** Execute a tool call against the live engine. Returns a JSON-serializable value. */
export function runTool(name: string, args: Record<string, unknown>, ctx: ToolContext): unknown {
  const { analytics: a, market, betas } = ctx
  const nav = a.portfolio.totalValue

  switch (name) {
    case 'list_holdings':
      return a.portfolio.positions.map((p) => ({
        ticker: p.instrument.ticker,
        weightPct: round(p.weight * 100, 2),
        marketValue: Math.round(p.marketValue),
        assetClass: p.instrument.assetClass,
        sector: p.instrument.sector,
      }))

    case 'get_holding': {
      const t = String(args.ticker ?? '').toUpperCase()
      const p = a.portfolio.positions.find((x) => x.instrument.ticker.toUpperCase() === t)
      if (!p) return { error: `No holding with ticker ${t}` }
      return {
        ticker: p.instrument.ticker,
        name: p.instrument.name,
        assetClass: p.instrument.assetClass,
        sector: p.instrument.sector,
        region: p.instrument.region,
        weightPct: round(p.weight * 100, 2),
        marketValue: Math.round(p.marketValue),
        price: round(p.price, 2),
        dayChangePct: round(p.dayChangePct * 100, 2),
        unrealizedPnl: Math.round(p.unrealizedPnl),
        betas: p.instrument.betas,
      }
    }

    case 'get_risk': {
      const r = a.risk
      const bt = r.backtest.levels.find((l) => l.level === 0.99)
      return {
        annualVolPct: round(r.annualVol * 100, 2),
        var95_1d: Math.round(r.var95_1d),
        var99_1d: Math.round(r.var99_1d),
        cvar95_1d: Math.round(r.cvar95_1d),
        cvar99_1d: Math.round(r.cvar99_1d),
        cfVar99_1d: Math.round(r.cfVar99_1d),
        histVar99_1d: Math.round(r.histVar99_1d),
        beta: round(r.beta, 2),
        diversificationPct: round(r.diversification * 100, 1),
        skew: round(r.skew, 2),
        excessKurtosis: round(r.exKurt, 2),
        var99Backtest: bt ? { exceptions: bt.exceptions, expected: round(bt.expected, 1), pass: bt.pass } : null,
      }
    }

    case 'get_performance': {
      const p = a.performance
      return {
        totalReturnPct: round(p.totalReturn * 100, 2),
        benchmarkReturnPct: round(p.benchmarkReturn * 100, 2),
        activeReturnPct: round(p.activeReturn * 100, 2),
        sharpe: round(p.sharpe, 2),
        sortino: round(p.sortino, 2),
        calmar: round(p.calmar, 2),
        informationRatio: round(p.informationRatio, 2),
        trackingErrorPct: round(p.trackingError * 100, 2),
        maxDrawdownPct: round(p.maxDrawdown * 100, 2),
      }
    }

    case 'top_risk_contributors': {
      const n = Math.max(1, Math.min(20, Number(args.n ?? 5)))
      return a.risk.components.slice(0, n).map((c) => ({
        ticker: c.ticker,
        pctOfRisk: round(c.pctOfRisk * 100, 1),
        weightPct: round(c.weight * 100, 2),
        standaloneVolPct: round(c.standaloneVol * 100, 1),
      }))
    }

    case 'get_scenario': {
      const key = args.key ? String(args.key) : ''
      if (key) {
        const s = a.scenarios.find((x) => x.key === key)
        if (!s) return { error: `No scenario ${key}`, available: a.scenarios.map((x) => x.key) }
        return { key: s.key, label: s.label, pnl: Math.round(s.pnl), pnlPct: round(s.pnlPct * 100, 2), realized: s.realized, window: s.window, shocks: s.shocks }
      }
      return a.scenarios.map((s) => ({
        key: s.key,
        label: s.label,
        pnl: Math.round(s.pnl),
        pnlPct: round(s.pnlPct * 100, 2),
        realized: s.realized,
      }))
    }

    case 'stress_test': {
      const shocks: Partial<Record<FactorKey, number>> = {}
      for (const k of FACTOR_KEYS) {
        const v = Number(args[k])
        if (Number.isFinite(v) && v !== 0) shocks[k] = v
      }
      const res = computeStressImpact(market.portfolio, betas, shocks)
      return {
        shocks,
        totalPnl: Math.round(res.totalPnl),
        totalPctOfInvested: round(res.totalPct * 100, 2),
        worst: res.rows.slice(0, 3).map((r) => ({ ticker: r.ticker, pnl: Math.round(r.pnl), pctOfPosition: round(r.pnlPct * 100, 1) })),
        best: res.rows.slice(-3).reverse().map((r) => ({ ticker: r.ticker, pnl: Math.round(r.pnl), pctOfPosition: round(r.pnlPct * 100, 1) })),
      }
    }

    case 'price_move': {
      const t = String(args.ticker ?? '').toUpperCase()
      const pct = Number(args.pct)
      if (!Number.isFinite(pct)) return { error: 'pct must be a number (decimal, e.g. -0.2)' }
      const p = a.portfolio.positions.find((x) => x.instrument.ticker.toUpperCase() === t)
      if (!p) return { error: `No holding with ticker ${t}` }
      const pnl = p.marketValue * pct
      return {
        ticker: p.instrument.ticker,
        movePct: round(pct * 100, 2),
        pnl: Math.round(pnl),
        pctOfNav: round((pnl / nav) * 100, 2),
      }
    }

    case 'get_macro': {
      if (!hasMacroData()) return { loaded: false, note: 'Macro data not refreshed. Run: npm run refresh-macro' }
      const m = bakedMacro()
      const nc = macroNowcast(market.portfolio, betas, m.indicators)
      return {
        loaded: true,
        asOf: m.asOf,
        indicators: m.indicators.map((i) => ({ id: i.id, label: i.label, value: i.value, unit: i.unit })),
        signals: deriveMacroSignals(m.indicators).map((s) => ({ factor: s.factor, bias: s.bias, tilt: round(s.tilt, 2), drivers: s.rationale })),
        nowcastPnl: Math.round(nc.impact.totalPnl),
        nowcastPctOfInvested: round(nc.impact.totalPct * 100, 2),
      }
    }

    default:
      return { error: `Unknown tool ${name}` }
  }
}
