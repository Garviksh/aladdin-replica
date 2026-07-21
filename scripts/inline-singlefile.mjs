// Inlines the Vite production build into ONE self-contained HTML file that
// opens directly from disk (file://) with no server — every tab, the forecast,
// and the Copilot work offline. Run after `vite build` (see `npm run build:single`).
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const dist = resolve('dist')
const out = resolve(dist, 'aladdin-replica-standalone.html')
let html = readFileSync(resolve(dist, 'index.html'), 'utf8')

// Inline every bundled <script src>.
html = html.replace(/<script[^>]*\ssrc="([^"]+)"[^>]*><\/script>/g, (_m, src) => {
  const code = readFileSync(resolve(dist, src.replace(/^\.\//, '')), 'utf8').replace(
    /<\/script>/g,
    '<\\/script>',
  )
  return `<script type="module">${code}</script>`
})

// Inline every stylesheet <link>.
html = html.replace(/<link[^>]*rel="stylesheet"[^>]*>/g, (m) => {
  const href = m.match(/href="([^"]+)"/)
  if (!href) return m
  const css = readFileSync(resolve(dist, href[1].replace(/^\.\//, '')), 'utf8')
  return `<style>${css}</style>`
})

writeFileSync(out, html)
console.log(`Wrote ${out} (${(html.length / 1024).toFixed(0)} KB)`)
