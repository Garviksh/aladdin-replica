import { useEffect, useRef, useState } from 'react'
import { respond } from '../assistant/respond'
import { usePortfolio } from '../state/PortfolioContext'

interface Msg {
  role: 'user' | 'bot'
  text: string
}

const SUGGESTIONS = [
  "What's my risk?",
  'Any breaches?',
  'Vs the benchmark?',
  '1-year outlook?',
  'What if NVDA drops 20%?',
  'Explain VaR',
]

const WELCOME =
  'Copilot online — running locally on your device. No data leaves your browser. Ask about this book, or tap a suggestion below.'

export function Copilot() {
  const { analytics, seed, mode } = usePortfolio()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([{ role: 'bot', text: WELCOME }])
  const [input, setInput] = useState('')
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [messages, open])

  const ask = (text: string) => {
    const query = text.trim()
    if (!query) return
    const answer = respond(query, { analytics, seed, mode })
    setMessages((m) => [...m, { role: 'user', text: query }, { role: 'bot', text: answer }])
    setInput('')
  }

  if (!open) {
    return (
      <button className="copilot-fab" onClick={() => setOpen(true)} aria-label="Open Copilot">
        ▣ COPILOT
      </button>
    )
  }

  return (
    <div className="copilot" role="dialog" aria-label="Copilot assistant">
      <div className="copilot-head">
        <span className="copilot-title">▣ COPILOT</span>
        <span className="copilot-badge" title="Runs entirely in your browser — makes no network calls">
          LOCAL · PRIVATE
        </span>
        <button className="copilot-x" onClick={() => setOpen(false)} aria-label="Close Copilot">
          ✕
        </button>
      </div>
      <div className="copilot-body" ref={bodyRef}>
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'msg user' : 'msg bot'}>
            {m.text}
          </div>
        ))}
      </div>
      <div className="chips">
        {SUGGESTIONS.map((s) => (
          <button key={s} className="chip" onClick={() => ask(s)}>
            {s}
          </button>
        ))}
      </div>
      <form
        className="copilot-foot"
        onSubmit={(e) => {
          e.preventDefault()
          ask(input)
        }}
      >
        <input
          className="copilot-input"
          value={input}
          placeholder="Ask about your portfolio…"
          onChange={(e) => setInput(e.target.value)}
        />
        <button className="btn" type="submit">
          Send
        </button>
      </form>
    </div>
  )
}
