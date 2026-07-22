// Recomputes REALIZED stress-scenario shocks from real factor-proxy history and
// writes src/data/scenarioHistory.json.
//
// For each crisis window we take the actual cumulative return of the factor
// proxies and map them to the model's factors:
//   equity = SPY, rates = IEF (bond price; + = yields down),
//   credit = HYG, commodity = GLD, fx = -UUP (+ = USD weaker).
//
//   npm run refresh-scenarios          (keyless: Yahoo range API, Stooq fallback)
//
// Runs on YOUR machine (server-side), so no CORS concerns. Needs Node 18+.
import { writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../src/data/scenarioHistory.json')
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Factor proxies. UUP (USD bull) inception 2007-02; before that FX is left out.
const PROXY = { equity: 'SPY', rates: 'IEF', credit: 'HYG', commodity: 'GLD', usd: 'UUP' }

// Crisis windows: [peak-ish start, trough-ish end].
const WINDOWS = {
  gfc2008: { window: 'Sep 2008 – Nov 2008', range: ['2008-09-02', '2008-11-20'] },
  covid2020: { window: 'Feb 2020 – Mar 2020', range: ['2020-02-19', '2020-03-23'] },
  inflation2022: { window: 'Jan 2022 – Oct 2022', range: ['2022-01-03', '2022-10-12'] },
  svb2023: { window: 'Mar 2023 (SVB week)', range: ['2023-03-06', '2023-03-13'] },
  selloff2018: { window: 'Sep 2018 – Dec 2018', range: ['2018-09-20', '2018-12-24'] },
  china2015: { window: 'Aug 2015 – Feb 2016', range: ['2015-08-17', '2016-02-11'] },
  taper2013: { window: 'May 2013 – Jun 2013', range: ['2013-05-22', '2013-06-24'] },
  euro2011: { window: 'Jul 2011 – Oct 2011', range: ['2011-07-22', '2011-10-03'] },
}

const toUnix = (d) => Math.floor(new Date(d + 'T00:00:00Z').getTime() / 1000)

// Yahoo chart with explicit period1/period2 (handles old ranges well).
async function yahooRange(sym, startISO, endISO) {
  const p1 = toUnix(startISO) - 5 * 86400
  const p2 = toUnix(endISO) + 5 * 86400
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?period1=${p1}&period2=${p2}&interval=1d`
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } })
    if (res.status === 429) {
      await sleep(1500 * (attempt + 1))
      continue
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const j = await res.json()
    const r = j?.chart?.result?.[0]
    if (!r?.timestamp) throw new Error('empty')
    const closes = r.indicators?.adjclose?.[0]?.adjclose ?? r.indicators?.quote?.[0]?.close ?? []
    const rows = []
    for (let i = 0; i < r.timestamp.length; i++) {
      const c = closes[i]
      if (c == null || !Number.isFinite(c)) continue
      rows.push({ date: new Date(r.timestamp[i] * 1000).toISOString().slice(0, 10), close: Number(c) })
    }
    if (!rows.length) throw new Error('no rows')
    return rows
  }
  throw new Error('rate-limited')
}

async function stooqRange(sym, startISO, endISO) {
  const d1 = startISO.replaceAll('-', '')
  const d2 = endISO.replaceAll('-', '')
  const res = await fetch(`https://stooq.com/q/d/l/?s=${sym}.us&d1=${d1}&d2=${d2}&i=d`, {
    headers: { 'User-Agent': UA },
  })
  const text = await res.text()
  const lines = text.trim().split('\n')
  if (!/^Date,Open,High,Low,Close/.test(lines[0] ?? '')) throw new Error('non-CSV')
  return lines
    .slice(1)
    .map((l) => {
      const c = l.split(',')
      return { date: c[0], close: parseFloat(c[4]) }
    })
    .filter((r) => r.date && Number.isFinite(r.close))
}

// Return (last/first - 1) for the closes bracketing the window.
function windowReturn(rows, startISO, endISO) {
  const inRange = rows.filter((r) => r.date >= startISO && r.date <= endISO)
  const pts = inRange.length >= 2 ? inRange : rows
  if (pts.length < 2) return null
  return pts[pts.length - 1].close / pts[0].close - 1
}

async function seriesReturn(sym, startISO, endISO) {
  let rows
  try {
    rows = await yahooRange(sym, startISO, endISO)
  } catch {
    rows = await stooqRange(sym, startISO, endISO)
  }
  return windowReturn(rows, startISO, endISO)
}

const round = (x) => (x == null ? null : Math.round(x * 1000) / 1000)

const scenarios = {}
for (const [key, def] of Object.entries(WINDOWS)) {
  const [start, end] = def.range
  const shocks = {}
  try {
    const [eq, rt, cr, cm, usd] = await Promise.all([
      seriesReturn(PROXY.equity, start, end),
      seriesReturn(PROXY.rates, start, end),
      seriesReturn(PROXY.credit, start, end),
      seriesReturn(PROXY.commodity, start, end),
      seriesReturn(PROXY.usd, start, end).catch(() => null),
    ])
    if (eq != null) shocks.equity = round(eq)
    if (rt != null) shocks.rates = round(rt)
    if (cr != null) shocks.credit = round(cr)
    if (cm != null) shocks.commodity = round(cm)
    if (usd != null) shocks.fx = round(-usd) // fx factor: + = USD weaker
    const ok = Object.keys(shocks).length >= 3
    scenarios[key] = { window: def.window, range: def.range, realized: ok, shocks }
    console.log(`  ${key.padEnd(14)} ${ok ? 'OK ' : '?? '} ${JSON.stringify(shocks)}`)
  } catch (e) {
    console.warn(`  ! ${key}: ${e.message}`)
  }
  await sleep(800)
}

const asOf = new Date().toISOString().slice(0, 10)
const out = {
  asOf,
  source:
    'Realized cumulative returns of factor-proxy ETFs over each crisis window. Mapping: equity=SPY, rates=IEF (bond price; + = yields down), credit=HYG, commodity=GLD, fx=-UUP (+ = USD weaker). Recompute with `npm run refresh-scenarios`.',
  scenarios,
}
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n')
console.log(`\nWrote ${OUT}\n  ${Object.keys(scenarios).length} realized windows, as of ${asOf}`)
