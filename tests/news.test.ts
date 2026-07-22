import { describe, expect, it } from 'vitest'
import { parseFinnhub, parseGdelt, tickerQuery, timeAgo } from '../src/data/news'

const FIXTURE = {
  articles: [
    {
      url: 'https://example.com/a',
      title: 'Markets rally on rate-cut hopes',
      seendate: '20260721T133000Z',
      domain: 'example.com',
      socialimage: 'https://example.com/a.jpg',
    },
    {
      url: 'https://example.com/a', // duplicate URL — should be de-duped
      title: 'Markets rally on rate-cut hopes (dupe)',
      seendate: '20260721T133000Z',
      domain: 'example.com',
    },
    { url: '', title: 'no url', seendate: '20260721T120000Z', domain: 'x.com' }, // dropped
    { url: 'https://b.com/2', title: '', seendate: '20260721T120000Z', domain: 'b.com' }, // dropped
    { url: 'https://b.com/3', title: 'Fed holds steady', seendate: '20260720T090000Z', domain: 'b.com' },
  ],
}

describe('finnhub parser', () => {
  it('parses and de-duplicates finnhub articles', () => {
    const raw = [
      { headline: 'Fed holds rates', url: 'https://x.com/1', source: 'Reuters', datetime: 1_750_000_000, image: 'https://x/i.jpg' },
      { headline: 'dup', url: 'https://x.com/1', source: 'Reuters', datetime: 1_750_000_000 },
      { headline: '', url: 'https://x.com/2' },
      { headline: 'no url', url: '' },
      { headline: 'Jobs report', url: 'https://y.com/3', source: 'AP', datetime: 1_750_100_000 },
    ]
    const a = parseFinnhub(raw)
    expect(a.length).toBe(2)
    expect(a[0].source).toBe('Reuters')
    expect(a[0].date).not.toBe('')
  })

  it('returns [] for non-array input', () => {
    expect(parseFinnhub({})).toEqual([])
    expect(parseFinnhub(null)).toEqual([])
  })
})

describe('news parser', () => {
  it('parses, cleans, and de-duplicates GDELT articles', () => {
    const a = parseGdelt(FIXTURE)
    expect(a.length).toBe(2)
    expect(a[0].title).toBe('Markets rally on rate-cut hopes')
    expect(a[0].source).toBe('example.com')
    expect(a[0].date).toBe('2026-07-21T13:30:00Z')
    expect(a[0].image).toBe('https://example.com/a.jpg')
  })

  it('returns an empty array for malformed input', () => {
    expect(parseGdelt(null)).toEqual([])
    expect(parseGdelt({})).toEqual([])
    expect(parseGdelt({ articles: 'nope' })).toEqual([])
  })

  it('builds a per-company query', () => {
    expect(tickerQuery('Apple Inc.')).toContain('"Apple Inc."')
  })

  it('formats relative time and tolerates bad input', () => {
    expect(timeAgo('')).toBe('')
    expect(timeAgo('not-a-date')).toBe('')
    expect(timeAgo(new Date(Date.now() - 3 * 3600_000).toISOString())).toMatch(/h ago/)
  })
})
