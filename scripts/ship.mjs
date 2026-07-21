// Logs an update to CHANGELOG.md, commits everything, and pushes.
//   npm run ship -- "what changed"
import { execSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const msg = process.argv.slice(2).join(' ').trim()
if (!msg) { console.error('Usage: npm run ship -- "what changed"'); process.exit(1) }

const FILE = 'CHANGELOG.md'
const MARKER = '<!-- SHIP -->'
const header = `# Changelog\n\nNewest entries on top.\n\n${MARKER}\n`
let text = existsSync(FILE) ? readFileSync(FILE, 'utf8') : header
if (!text.includes(MARKER)) text = header + text

const date = new Date().toISOString().slice(0, 10)
text = text.replace(MARKER, `${MARKER}\n\n## ${date}\n- ${msg}`)
writeFileSync(FILE, text)

execSync('git add -A', { stdio: 'inherit' })
execSync(`git commit -m ${JSON.stringify(msg)}`, { stdio: 'inherit' })
execSync('git push', { stdio: 'inherit' })
console.log(`\n✓ Logged to CHANGELOG.md and pushed: ${msg}`)
