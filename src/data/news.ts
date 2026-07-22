// Live financial news with a small provider layer:
//  - Default: GDELT DOC 2.0 (free, no key, CORS) — global press.
//  - Optional: Finnhub (free API key, CORS) — more reliable market & company
//    news. Enter a key in the News tab; it's stored only in your browser.
// Every fetch has a timeout so the UI never hangs; nothing but a public query
// (and, if set, your Finnhub key) leaves the page.

export interface Article {
  title: string
  url: string
  source: string
  /** ISO timestamp, or '' if unknown. */
  date: string
  image?: string
}

export type NewsScope = { kind: 'market' } | { kind: 'ticker'; ticker: string; name: string }

const GDELT = 'https://api.gdeltproject.org/api/v2/doc/doc'
const FINNHUB = 'https://finnhub.io/api/v1'
const KEY_STORE = 'aladdin_finnhub_key'

export const MARKET_QUERY =
  '("stock market" OR "wall street" OR earnings OR "interest rates" OR economy) sourcelang:english'

export function tickerQuery(name: string): string {
  return `"${name}" sourcelang:english`
}

/** Persisted (browser-only) Finnhub key helpers. */
export function savedNewsKey(): string | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(KEY_STORE) : null
  } catch {
    return null
  }
}
export function saveNewsKey(key: string | null): void {
  try {
    if (typeof localStorage === 'undefined') return
    if (key) localStorage.setItem(KEY_STORE, key)
    else localStorage.removeItem(KEY_STORE)
  } catch {
    /* ignore */
  }
}

async function fetchJson(url: string, timeoutMs = 12000): Promise<unknown> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    if (!res.ok) throw new Error(`news service returned HTTP ${res.status}`)
    return await res.json()
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new Error('the news service timed out')
    }
    throw e
  } finally {
    clearTimeout(timer)
  }
}

// ---- GDELT ----
interface GdeltRaw {
  articles?: Array<Record<string, unknown>>
}

function gdeltDate(s: string): string {
  const m = s.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/)
  return m ? `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z` : ''
}

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

async function fetchGdelt(query: string, max: number): Promise<Article[]> {
  const url = `${GDELT}?query=${encodeURIComponent(query)}&mode=ArtList&maxrecords=${max}&format=json&sort=DateDesc&timespan=7d`
  return parseGdelt(await fetchJson(url))
}

// ---- Finnhub ----
interface FinnhubRaw {
  headline?: string
  url?: string
  source?: string
  datetime?: number
  image?: string
}

export function parseFinnhub(json: unknown): Article[] {
  if (!Array.isArray(json)) return []
  const seen = new Set<string>()
  const out: Article[] = []
  for (const a of json as FinnhubRaw[]) {
    const title = String(a.headline ?? '').trim()
    const url = String(a.url ?? '')
    if (!title || !url || seen.has(url)) continue
    seen.add(url)
    out.push({
      title,
      url,
      source: String(a.source ?? ''),
      date: a.datetime ? new Date(a.datetime * 1000).toISOString() : '',
      image: typeof a.image === 'string' && a.image ? a.image : undefined,
    })
  }
  return out
}

const ymd = (d: Date) => d.toISOString().slice(0, 10)

/** Load news for a scope, using Finnhub if a key is provided, else GDELT. */
export async function loadNews(
  scope: NewsScope,
  key: string | null,
  max = 24,
): Promise<Article[]> {
  if (key) {
    if (scope.kind === 'market') {
      const j = await fetchJson(`${FINNHUB}/news?category=general&token=${encodeURIComponent(key)}`)
      return parseFinnhub(j).slice(0, max)
    }
    const from = ymd(new Date(Date.now() - 14 * 86_400_000))
    const to = ymd(new Date())
    const j = await fetchJson(
      `${FINNHUB}/company-news?symbol=${encodeURIComponent(scope.ticker)}&from=${from}&to=${to}&token=${encodeURIComponent(key)}`,
    )
    return parseFinnhub(j).slice(0, max)
  }
  return fetchGdelt(scope.kind === 'market' ? MARKET_QUERY : tickerQuery(scope.name), max)
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
  return `${Math.round(hrs / 24)}d ago`
}
