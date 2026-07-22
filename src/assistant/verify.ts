// Lightweight anti-hallucination check: flag currency figures the model quoted
// that don't appear in the grounding snapshot. Currency amounts are distinctive
// enough to check reliably; percentages are too common to verify without noise.

const MONEY = /\(?\$\s?\d[\d,]*(?:\.\d+)?\s?[KMBT]?\)?/g

function normalize(s: string): string {
  return s.replace(/[()\s,$]/g, '').toUpperCase()
}

/** Return currency figures in `answer` (with a K/M/B/T scale) not found in `snapshot`. */
export function flagUnknownFigures(answer: string, snapshot: string): string[] {
  const known = new Set((snapshot.match(MONEY) ?? []).map(normalize))
  const unknown: string[] = []
  for (const raw of answer.match(MONEY) ?? []) {
    const n = normalize(raw)
    // only check scaled amounts (…K/M/B/T); bare dollars reformat too easily
    if (!/[KMBT]$/.test(n)) continue
    if (!known.has(n) && !unknown.includes(raw.trim())) unknown.push(raw.trim())
  }
  return unknown
}
