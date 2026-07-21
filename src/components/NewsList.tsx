import { timeAgo, type Article } from '../data/news'

export function NewsList({
  loading,
  error,
  articles,
  emptyLabel = 'No headlines found.',
}: {
  loading: boolean
  error: string | null
  articles: Article[]
  emptyLabel?: string
}) {
  if (loading) return <div className="news-msg">Loading live headlines…</div>
  if (error)
    return (
      <div className="news-msg">
        Couldn’t load news: {error}. Check your connection, then use Reload.
      </div>
    )
  if (!articles.length) return <div className="news-msg">{emptyLabel}</div>

  return (
    <ul className="newslist">
      {articles.map((a) => (
        <li key={a.url}>
          <a href={a.url} target="_blank" rel="noopener noreferrer" className="news-title">
            {a.title}
          </a>
          <div className="news-meta">
            {a.source}
            {a.date ? ` · ${timeAgo(a.date)}` : ''}
          </div>
        </li>
      ))}
    </ul>
  )
}
