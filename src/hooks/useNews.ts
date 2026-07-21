import { useEffect, useState } from 'react'
import { fetchNews, type Article } from '../data/news'

export interface NewsState {
  loading: boolean
  error: string | null
  articles: Article[]
}

/** Fetch live news for a query in the browser. Re-fetches when the query changes. */
export function useNews(query: string, max = 15): NewsState {
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
  }, [query, max])
  return state
}
