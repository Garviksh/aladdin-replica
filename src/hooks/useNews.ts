import { useEffect, useState } from 'react'
import { fetchNews, type Article } from '../data/news'

export interface NewsState {
  loading: boolean
  error: string | null
  articles: Article[]
}

export interface UseNews extends NewsState {
  retry: () => void
}

/** Fetch live news for a query in the browser (with timeout + retry). */
export function useNews(query: string, max = 15): UseNews {
  const [nonce, setNonce] = useState(0)
  const [state, setState] = useState<NewsState>({ loading: true, error: null, articles: [] })

  useEffect(() => {
    let alive = true
    setState({ loading: true, error: null, articles: [] })
    fetchNews(query, max)
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
  }, [query, max, nonce])

  return { ...state, retry: () => setNonce((n) => n + 1) }
}
