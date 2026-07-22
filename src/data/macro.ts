// Macro & alt-data provider.
//
// Macro indicators (US yields, 10Y–2Y curve, CPI, unemployment, VIX, Fed Funds)
// come from FRED via the server-side `npm run refresh-macro` script (FRED's CSV
// endpoint is keyless but not CORS-enabled, so it must be fetched server-side and
// baked into macroData.json — the same pattern as market prices).
//
// Weather is genuinely live in the browser: Open-Meteo is CORS-enabled and needs
// no key, so it is fetched on demand as an alt-data demonstration feed.
import macroJson from './macroData.json'

export interface MacroIndicator {
  id: string
  label: string
  /** Latest value. */
  value: number
  unit: string
  /** Prior observation, for a change reading. */
  prev?: number
  asOf?: string
  note?: string
}

export interface WeatherPoint {
  city: string
  tempC: number
  code: number
  label: string
}

export interface MacroSnapshot {
  asOf: string | null
  source: string | null
  indicators: MacroIndicator[]
  weather: WeatherPoint[]
}

const baked = macroJson as unknown as MacroSnapshot

export function bakedMacro(): MacroSnapshot {
  return baked
}

/** True once `npm run refresh-macro` has populated real macro indicators. */
export function hasMacroData(): boolean {
  return Boolean(baked.indicators && baked.indicators.length > 0)
}

export const MACRO_META = { asOf: baked.asOf, source: baked.source }

// Economically-relevant hubs (financial centres + an energy hub) for the live
// weather alt-data panel.
export const MACRO_CITIES = [
  { city: 'New York', lat: 40.71, lon: -74.01 },
  { city: 'London', lat: 51.51, lon: -0.13 },
  { city: 'Singapore', lat: 1.35, lon: 103.82 },
  { city: 'Houston', lat: 29.76, lon: -95.37 },
]

const WEATHER_CODES: Record<number, string> = {
  0: 'Clear',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Rime fog',
  51: 'Light drizzle',
  53: 'Drizzle',
  55: 'Dense drizzle',
  61: 'Light rain',
  63: 'Rain',
  65: 'Heavy rain',
  71: 'Light snow',
  73: 'Snow',
  75: 'Heavy snow',
  80: 'Rain showers',
  81: 'Rain showers',
  82: 'Violent showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm + hail',
  99: 'Thunderstorm + hail',
}

export function weatherLabel(code: number): string {
  return WEATHER_CODES[code] ?? '—'
}

/** Fetch current conditions for the hub cities from Open-Meteo (CORS-enabled). */
export async function fetchLiveWeather(timeoutMs = 10_000): Promise<WeatherPoint[]> {
  const results = await Promise.all(
    MACRO_CITIES.map(async (c) => {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), timeoutMs)
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&current=temperature_2m,weather_code`,
          { signal: ctrl.signal },
        )
        if (!res.ok) return null
        const j = (await res.json()) as { current?: { temperature_2m?: number; weather_code?: number } }
        const cur = j.current
        if (!cur || cur.temperature_2m == null) return null
        const code = cur.weather_code ?? 0
        return {
          city: c.city,
          tempC: Math.round(cur.temperature_2m),
          code,
          label: weatherLabel(code),
        } as WeatherPoint
      } catch {
        return null
      } finally {
        clearTimeout(timer)
      }
    }),
  )
  return results.filter((r): r is WeatherPoint => r !== null)
}
