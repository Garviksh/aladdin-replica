// Downloads REAL end-of-day price history from Stooq (no API key required) and
// writes src/data/marketData.json, so the terminal runs on real market data.
//
//   npm run refresh-data        # then: npm run dev  (or build:single)
//
// Stooq serves free EOD CSV for personal/educational use. Requires Node 18+
// (global fetch). Runs on YOUR machine — server-side, so there are no CORS or
// API-key concerns.
import { writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../src/data/marketData.json')
const LOOKBACK = 504 // ~2 trading years

// instrument id -> Stooq symbol (US listings / ADRs / ETFs)
const SYMBOLS = {
  AAPL: 'aapl.us',
  MSFT: 'msft.us',
  NVDA: 'nvda.us',
  JPM: 'jpm.us',
  XOM: 'xom.us',
  NESN: 'nsrgy.us', // Nestlé ADR
  SAP: 'sap.us', // SAP SE ADR
  TSM: 'tsm.us', // TSMC ADR
  BABA: 'baba.us',
  VEA: 'vea.us',
  IEF: 'ief.us',
  TLT: 'tlt.us',
  LQD: 'lqd.us',
  HYG: 'hyg.us',
  EMB: 'emb.us',
  GLD: 'gld.us',
  USO: 'uso.us',
  SPY: 'spy.us', // benchmark
}

async function fetchOne(id, sym) {
  const res = await fetch(`https://stooq.com/q/d/l/?s=${sym}&i=d`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const text = await res.text()
  const lines = text.trim().split('\n')
  if (!/^Date,Open,High,Low,Close/.test(lines[0] ?? '')) {
    throw new Error(`unexpected response (${(lines[0] ?? '').slice(0, 40)})`)
  }
  return lines
    .slice(1)
    .map((l) => {
      const c = l.split(',')
      return { date: c[0], close: parseFloat(c[4]) }
    })
    .filter((r) => r.date && Number.isFinite(r.close))
}

console.log('Fetching real EOD history from Stooq…')
const raw = {}
for (const [id, sym] of Object.entries(SYMBOLS)) {
  try {
    raw[id] = await fetchOne(id, sym)
    console.log(`  ${id.padEnd(5)} ${String(raw[id].length).padStart(5)} rows`)
  } catch (e) {
    console.warn(`  ! ${id} (${sym}): ${e.message}`)
  }
  await new Promise((r) => setTimeout(r, 250))
}

if (!raw.SPY?.length) {
  console.error('Benchmark SPY missing — aborting without changes.')
  process.exit(1)
}

// Align every symbol on the common set of trading dates.
const ids = Object.keys(raw).filter((id) => raw[id]?.length)
let common = null
for (const id of ids) {
  const s = new Set(raw[id].map((r) => r.date))
  common = common ? new Set([...common].filter((d) => s.has(d))) : s
}
const dates = [...common].sort().slice(-LOOKBACK)

const series = {}
for (const id of ids) {
  const m = new Map(raw[id].map((r) => [r.date, r.close]))
  const closes = dates.map((d) => m.get(d))
  if (closes.every((v) => Number.isFinite(v))) series[id] = closes
  else console.warn(`  ~ ${id}: dropped (gaps after alignment)`)
}

const out = { asOf: dates[dates.length - 1], source: 'Stooq EOD', dates, series }
writeFileSync(OUT, JSON.stringify(out))
console.log(
  `\nWrote ${OUT}\n  ${Object.keys(series).length} symbols x ${dates.length} days, as of ${out.asOf}` +
    `\nNow run: npm run dev   (or npm run build:single)`,
)
