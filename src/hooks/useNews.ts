import { useEffect, useState } from 'react'
import { loadNews, type Article, type NewsScope } from '../data/news'

export interface NewsState {
  loading: boolean
  error: string | null
  articles: Article[]
}

export interface UseNews extends NewsState {
  retry: () => void
}

/** Fetch live news for a scope (Finnhub if a key is given, else GDELT). */
export function useNews(scope: NewsScope, key: string | null, max = 24): UseNews {
  const scopeKey = scope.kind === 'market' ? 'market' : `${scope.ticker}|${scope.name}`
  const [nonce, setNonce] = useState(0)
  const [state, setState] = useState<NewsState>({ loading: true, error: null, articles: [] })

  useEffect(() => {
    let alive = true
    setState({ loading: true, error: null, articles: [] })
    loadNews(scope, key, max)
      .then((articles) => {
        if (alive) setState({ loading: false, error: null, articles })
      })
      .catch((e: unknown) => {
        if (alive) {
          setState({
            loading: false,
            error: e instanceof Error ? e.message : 'Failed to load news',
            articles: [],
          })
        }
      })
    return () => {
      alive = false
    }
    // scope is captured via the primitive scopeKey to avoid identity-based refetch loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeKey, key, max, nonce])

  return { ...state, retry: () => setNonce((n) => n + 1) }
}
