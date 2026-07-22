// Downloads REAL macro indicators from FRED (keyless CSV) + live weather from
// Open-Meteo and writes src/data/macroData.json.
//
//   npm run refresh-macro
//
// FRED's CSV endpoint needs no API key but is not CORS-enabled, so it must be
// fetched server-side (here) and baked into JSON, like market prices. Node 18+.
import { writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '../src/data/macroData.json')

async function fred(id) {
  const url = `https://fred.stlouisfed.org/graph/fredgraph.csv?id=${id}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`FRED ${id} HTTP ${res.status}`)
  const text = await res.text()
  const rows = text
    .trim()
    .split('\n')
    .slice(1)
    .map((l) => {
      const [date, v] = l.split(',')
      return { date, value: parseFloat(v) }
    })
    .filter((r) => r.date && Number.isFinite(r.value))
  if (rows.length < 2) throw new Error(`FRED ${id}: too few rows`)
  return rows
}

const last = (rows) => rows[rows.length - 1]
const prev = (rows) => rows[rows.length - 2]

const indicators = []
async function add(id, label, unit, transform) {
  try {
    const rows = await fred(id)
    const ind = transform ? transform(rows) : { value: last(rows).value, prev: prev(rows).value, asOf: last(rows).date }
    indicators.push({ id: transform?.outId ?? id, label, unit, ...ind })
    console.log(`  ${(transform?.outId ?? id).padEnd(10)} ${ind.value}${unit} (as of ${ind.asOf})`)
  } catch (e) {
    console.warn(`  ! ${id}: ${e.message}`)
  }
}

console.log('Fetching macro indicators from FRED…')
await add('DGS10', 'US 10Y Treasury Yield', '%')
await add('DGS2', 'US 2Y Treasury Yield', '%')
await add('CPIAUCSL', 'CPI Inflation (YoY)', '%', (rows) => {
  const l = last(rows)
  const yearAgo = rows[rows.length - 13] ?? rows[0]
  const yoy = (l.value / yearAgo.value - 1) * 100
  const p = prev(rows)
  const yearAgoP = rows[rows.length - 14] ?? rows[0]
  const yoyPrev = (p.value / yearAgoP.value - 1) * 100
  return { outId: 'CPIYoY', value: Math.round(yoy * 10) / 10, prev: Math.round(yoyPrev * 10) / 10, asOf: l.date }
})
await add('UNRATE', 'Unemployment Rate', '%')
await add('VIXCLS', 'VIX (volatility)', '')
await add('FEDFUNDS', 'Fed Funds Rate', '%')
await add('DTWEXBGS', 'USD Broad Index', '')

// Derived: 10Y–2Y curve spread.
const dgs10 = indicators.find((i) => i.id === 'DGS10')
const dgs2 = indicators.find((i) => i.id === 'DGS2')
if (dgs10 && dgs2) {
  indicators.push({
    id: 'T10Y2Y',
    label: '10Y–2Y Curve Spread',
    unit: '%',
    value: Math.round((dgs10.value - dgs2.value) * 100) / 100,
    prev:
      dgs10.prev != null && dgs2.prev != null
        ? Math.round((dgs10.prev - dgs2.prev) * 100) / 100
        : undefined,
    asOf: dgs10.asOf,
  })
}

const CITIES = [
  { city: 'New York', lat: 40.71, lon: -74.01 },
  { city: 'London', lat: 51.51, lon: -0.13 },
  { city: 'Singapore', lat: 1.35, lon: 103.82 },
  { city: 'Houston', lat: 29.76, lon: -95.37 },
]
const WCODE = { 0: 'Clear', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast', 45: 'Fog', 48: 'Rime fog', 51: 'Light drizzle', 61: 'Light rain', 63: 'Rain', 65: 'Heavy rain', 71: 'Light snow', 80: 'Rain showers', 95: 'Thunderstorm' }

console.log('Fetching live weather from Open-Meteo…')
const weather = []
for (const c of CITIES) {
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&current=temperature_2m,weather_code`,
    )
    const j = await res.json()
    const code = j.current?.weather_code ?? 0
    weather.push({ city: c.city, tempC: Math.round(j.current.temperature_2m), code, label: WCODE[code] ?? '—' })
    console.log(`  ${c.city.padEnd(10)} ${Math.round(j.current.temperature_2m)}°C ${WCODE[code] ?? ''}`)
  } catch (e) {
    console.warn(`  ! ${c.city}: ${e.message}`)
  }
}

if (indicators.length === 0) {
  console.error('\nCould not fetch any FRED indicators. Leaving macroData.json unchanged.')
  process.exit(1)
}

const asOf = new Date().toISOString().slice(0, 10)
writeFileSync(
  OUT,
  JSON.stringify({ asOf, source: 'FRED (fredgraph CSV) + Open-Meteo', indicators, weather }, null, 2) + '\n',
)
console.log(`\nWrote ${OUT}\n  ${indicators.length} indicators, ${weather.length} weather points, as of ${asOf}\nNow run: npm run dev`)
