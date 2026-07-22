// Real, live financial news via the GDELT DOC 2.0 API.
// GDELT is free, requires NO API key, and sends CORS headers, so it can be
// called directly from the browser. Nothing but a public news query is sent —
// no personal or portfolio data leaves the page.

export interface Article {
  title: string
  url: string
  source: string
  /** ISO timestamp, or '' if unknown. */
  date: string
  image?: string
}

interface GdeltRaw {
  articles?: Array<Record<string, unknown>>
}

const BASE = 'https://api.gdeltproject.org/api/v2/doc/doc'

/** Broad market-news query. */
export const MARKET_QUERY =
  '("stock market" OR "wall street" OR earnings OR "interest rates" OR economy) sourcelang:english'

/** News query for a specific company/holding. */
export function tickerQuery(name: string): string {
  return `"${name}" sourcelang:english`
}

function gdeltDate(s: string): string {
  const m = s.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/)
  return m ? `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z` : ''
}

/** Parse a GDELT ArtList response into clean Article records. Pure + testable. */
export function parseGdelt(json: unknown): Article[] {
  const arts = (json as GdeltRaw)?.articles
  if (!Array.isArray(arts)) return []
  const seen = new Set<string>()
  const out: Article[] = []
  for (const a of arts) {
    const title = String(a.title ?? '').trim()
    const url = String(a.url ?? '')
    if (!title || !url || seen.has(url)) continue
    seen.add(url)
    out.push({
      title,
      url,
      source: String(a.domain ?? ''),
      date: gdeltDate(String(a.seendate ?? '')),
      image: typeof a.socialimage === 'string' && a.socialimage ? a.socialimage : undefined,
    })
  }
  return out
}

/** Fetch live news for a query, aborting after `timeoutMs` so it never hangs. */
export async function fetchNews(query: string, max = 15, timeoutMs = 12000): Promise<Article[]> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const url = `${BASE}?query=${encodeURIComponent(query)}&mode=ArtList&maxrecords=${max}&format=json&sort=DateDesc&timespan=7d`
    const res = await fetch(url, { signal: ctrl.signal })
    if (!res.ok) throw new Error(`news service returned HTTP ${res.status}`)
    return parseGdelt(await res.json())
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new Error('the news service timed out')
    }
    throw e
  } finally {
    clearTimeout(timer)
  }
}

/** Human-friendly relative time, e.g. "3h ago". */
export function timeAgo(iso: string): string {
  if (!iso) return ''
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000))
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  return `${days}d ago`
}
