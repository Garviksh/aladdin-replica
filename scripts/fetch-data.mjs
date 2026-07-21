// Downloads REAL end-of-day price history and writes src/data/marketData.json.
//
//   RELIABLE (recommended): free Twelve Data key (30-sec signup, no card):
//     https://twelvedata.com/register
//     TWELVE_DATA_KEY=your_key npm run refresh-data
//
//   KEYLESS (best effort — may be rate-limited on some networks):
//     npm run refresh-data
//
// Runs on YOUR machine (server-side): no CORS concerns. Needs Node 18+.
import { writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../src/data/marketData.json')
const LOOKBACK = 504
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36'

const KEY =
  process.env.TWELVE_DATA_KEY ||
  process.env.TD_KEY ||
  (process.argv.find((a) => a.startsWith('--key=')) || '').split('=')[1] ||
  ''

// id -> provider symbols
const INSTRUMENTS = [
  { id: 'AAPL', y: 'AAPL', s: 'aapl.us', t: 'AAPL' },
  { id: 'MSFT', y: 'MSFT', s: 'msft.us', t: 'MSFT' },
  { id: 'NVDA', y: 'NVDA', s: 'nvda.us', t: 'NVDA' },
  { id: 'JPM', y: 'JPM', s: 'jpm.us', t: 'JPM' },
  { id: 'XOM', y: 'XOM', s: 'xom.us', t: 'XOM' },
  { id: 'NESN', y: 'NSRGY', s: 'nsrgy.us', t: 'NSRGY' },
  { id: 'SAP', y: 'SAP', s: 'sap.us', t: 'SAP' },
  { id: 'TSM', y: 'TSM', s: 'tsm.us', t: 'TSM' },
  { id: 'BABA', y: 'BABA', s: 'baba.us', t: 'BABA' },
  { id: 'VEA', y: 'VEA', s: 'vea.us', t: 'VEA' },
  { id: 'IEF', y: 'IEF', s: 'ief.us', t: 'IEF' },
  { id: 'TLT', y: 'TLT', s: 'tlt.us', t: 'TLT' },
  { id: 'LQD', y: 'LQD', s: 'lqd.us', t: 'LQD' },
  { id: 'HYG', y: 'HYG', s: 'hyg.us', t: 'HYG' },
  { id: 'EMB', y: 'EMB', s: 'emb.us', t: 'EMB' },
  { id: 'GLD', y: 'GLD', s: 'gld.us', t: 'GLD' },
  { id: 'USO', y: 'USO', s: 'uso.us', t: 'USO' },
  { id: 'SPY', y: 'SPY', s: 'spy.us', t: 'SPY' },
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// --- Twelve Data (keyed, reliable) --------------------------------------
async function fetchTD(sym) {
  const url = `https://api.twelvedata.com/time_series?symbol=${sym}&interval=1day&outputsize=${LOOKBACK + 20}&apikey=${KEY}&format=JSON`
  const res = await fetch(url)
  const j = await res.json()
  if (j.status === 'error') throw new Error(j.message || 'Twelve Data error')
  const rows = (j.values || [])
    .map((v) => ({ date: v.datetime, close: parseFloat(v.close) }))
    .filter((r) => r.date && Number.isFinite(r.close))
  if (rows.length < 30) throw new Error('too few rows')
  return rows
}

// --- Yahoo (keyless, best effort) ---------------------------------------
async function fetchYahoo(sym, cookie) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?range=2y&interval=1d`
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/json', ...(cookie ? { Cookie: cookie } : {}) },
    })
    if (res.status === 429) {
      await sleep(1500 * (attempt + 1))
      continue
    }
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const j = await res.json()
    const r = j?.chart?.result?.[0]
    if (!r?.timestamp) throw new Error('empty result')
    const closes = r.indicators?.adjclose?.[0]?.adjclose ?? r.indicators?.quote?.[0]?.close ?? []
    const rows = []
    for (let i = 0; i < r.timestamp.length; i++) {
      const c = closes[i]
      if (c == null || !Number.isFinite(c)) continue
      rows.push({ date: new Date(r.timestamp[i] * 1000).toISOString().slice(0, 10), close: Number(c) })
    }
    if (rows.length < 30) throw new Error('too few rows')
    return rows
  }
  throw new Error('HTTP 429 (rate-limited)')
}

async function fetchStooq(sym) {
  const res = await fetch(`https://stooq.com/q/d/l/?s=${sym}&i=d`, { headers: { 'User-Agent': UA } })
  const text = await res.text()
  const lines = text.trim().split('\n')
  if (!/^Date,Open,High,Low,Close/.test(lines[0] ?? '')) throw new Error('non-CSV response')
  return lines
    .slice(1)
    .map((l) => {
      const c = l.split(',')
      return { date: c[0], close: parseFloat(c[4]) }
    })
    .filter((r) => r.date && Number.isFinite(r.close))
}

async function yahooCookie() {
  try {
    const r = await fetch('https://fc.yahoo.com/', { headers: { 'User-Agent': UA } })
    const set = r.headers.getSetCookie?.() ?? []
    return set.map((c) => c.split(';')[0]).join('; ')
  } catch {
    return ''
  }
}

// --- Orchestration ------------------------------------------------------
const raw = {}
let source = ''

if (KEY) {
  console.log('Fetching real EOD history from Twelve Data…')
  source = 'Twelve Data'
  for (const inst of INSTRUMENTS) {
    try {
      raw[inst.id] = await fetchTD(inst.t)
      console.log(`  ${inst.id.padEnd(5)} ${String(raw[inst.id].length).padStart(5)} rows`)
    } catch (e) {
      console.warn(`  ! ${inst.id}: ${e.message}`)
    }
    await sleep(8100) // free tier: 8 requests/minute
  }
} else {
  console.log('No API key set — trying keyless sources (Yahoo, Stooq)…')
  console.log('Tip: for reliable results, get a free key at https://twelvedata.com/register')
  console.log('     then run:  TWELVE_DATA_KEY=your_key npm run refresh-data\n')
  const cookie = await yahooCookie()
  let usedY = 0
  let usedS = 0
  for (const inst of INSTRUMENTS) {
    try {
      raw[inst.id] = await fetchYahoo(inst.y, cookie)
      usedY++
      console.log(`  ${inst.id.padEnd(5)} ${String(raw[inst.id].length).padStart(5)} rows (yahoo)`)
    } catch (e1) {
      try {
        raw[inst.id] = await fetchStooq(inst.s)
        usedS++
        console.log(`  ${inst.id.padEnd(5)} ${String(raw[inst.id].length).padStart(5)} rows (stooq)`)
      } catch (e2) {
        console.warn(`  ! ${inst.id}: yahoo(${e1.message}) / stooq(${e2.message})`)
      }
    }
    await sleep(1200)
  }
  source = usedS === 0 ? 'Yahoo Finance' : usedY === 0 ? 'Stooq EOD' : 'Yahoo Finance / Stooq'
}

if (!raw.SPY?.length) {
  console.error(
    '\nCould not fetch data (benchmark SPY missing).' +
      '\nGet a free key at https://twelvedata.com/register and run:' +
      '\n  TWELVE_DATA_KEY=your_key npm run refresh-data',
  )
  process.exit(1)
}

const ids = Object.keys(raw).filter((id) => raw[id]?.length)
let common = null
for (const id of ids) {
  const set = new Set(raw[id].map((r) => r.date))
  common = common ? new Set([...common].filter((d) => set.has(d))) : set
}
const dates = [...common].sort().slice(-LOOKBACK)

const series = {}
for (const id of ids) {
  const m = new Map(raw[id].map((r) => [r.date, r.close]))
  const closes = dates.map((d) => m.get(d))
  if (closes.every((v) => Number.isFinite(v))) series[id] = closes
  else console.warn(`  ~ ${id}: dropped (gaps after alignment)`)
}

writeFileSync(OUT, JSON.stringify({ asOf: dates[dates.length - 1], source, dates, series }))
console.log(
  `\nWrote ${OUT}\n  ${Object.keys(series).length} symbols x ${dates.length} days, as of ${dates[dates.length - 1]} (${source})` +
    `\nNow run: npm run dev`,
)
