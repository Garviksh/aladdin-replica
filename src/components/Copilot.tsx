import { useEffect, useMemo, useRef, useState } from 'react'
import { askOllamaStream, buildSystemPrompt, ollamaModels, pickModel } from '../assistant/ollama'
import { respond } from '../assistant/respond'
import { buildForecast } from '../engine/forecast'
import { usePortfolio } from '../state/PortfolioContext'

interface Msg {
  role: 'user' | 'bot'
  text: string
}

type Engine = 'checking' | 'ollama' | 'local'

const SUGGESTIONS = [
  "What's my risk?",
  'Any breaches?',
  'Predict the year ahead',
  'Explain the Risk tab',
  'What if NVDA drops 20%?',
]

export function Copilot() {
  const { analytics, seed, mode } = usePortfolio()
  const forecast = useMemo(() => buildForecast(seed, 252, 300, mode), [seed, mode])

  const [open, setOpen] = useState(false)
  const [engine, setEngine] = useState<Engine>('checking')
  const [models, setModels] = useState<string[]>([])
  const [model, setModel] = useState('')
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const bodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let alive = true
    ollamaModels().then((list) => {
      if (!alive) return
      if (list && list.length) {
        setModels(list)
        setModel(pickModel(list))
        setEngine('ollama')
      } else {
        setEngine('local')
      }
    })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    const welcome =
      engine === 'ollama'
        ? `Copilot online via Ollama (${model}) — running locally on your machine, nothing leaves your device. I can see your live dashboard. Ask me to analyze, predict, or explain any section.`
        : engine === 'local'
          ? 'Ollama not detected — using the built-in local assistant. To enable the full LLM: install Ollama, run `ollama pull llama3.2`, then `OLLAMA_ORIGINS=* ollama serve`.'
          : 'Connecting to local Ollama…'
    setMessages((m) => (m.length === 0 ? [{ role: 'bot', text: welcome }] : m))
  }, [engine, model])

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [messages, open])

  const ask = async (text: string) => {
    const q = text.trim()
    if (!q || busy) return
    setInput('')
    setMessages((m) => [...m, { role: 'user', text: q }, { role: 'bot', text: '' }])

    if (engine !== 'ollama') {
      const answer = respond(q, { analytics, seed, mode })
      setMessages((m) => {
        const c = [...m]
        c[c.length - 1] = { role: 'bot', text: answer }
        return c
      })
      return
    }

    setBusy(true)
    const system = buildSystemPrompt(analytics, forecast)
    try {
      await askOllamaStream(
        model,
        [
          { role: 'system', content: system },
          { role: 'user', content: q },
        ],
        (tok) => {
          setMessages((m) => {
            const c = [...m]
            const last = c[c.length - 1]
            c[c.length - 1] = { role: 'bot', text: last.text + tok }
            return c
          })
        },
      )
    } catch {
      const answer = respond(q, { analytics, seed, mode })
      setMessages((m) => {
        const c = [...m]
        c[c.length - 1] = { role: 'bot', text: `(Ollama unavailable — local answer)\n${answer}` }
        return c
      })
      setEngine('local')
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button className="copilot-fab" onClick={() => setOpen(true)} aria-label="Open Copilot">
        ▣ COPILOT
      </button>
    )
  }

  const badge =
    engine === 'ollama' ? `OLLAMA · ${model}` : engine === 'local' ? 'LOCAL' : 'CONNECTING…'

  return (
    <div className="copilot" role="dialog" aria-label="Copilot assistant">
      <div className="copilot-head">
        <span className="copilot-title">▣ COPILOT</span>
        <span className="copilot-badge" title="Runs on your machine — no cloud, no data leaves your device">
          {badge}
        </span>
        {models.length > 1 ? (
          <select
            className="copilot-model"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            title="Ollama model"
          >
            {models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        ) : null}
        <button className="copilot-x" onClick={() => setOpen(false)} aria-label="Close Copilot">
          ✕
        </button>
      </div>
      <div className="copilot-body" ref={bodyRef}>
        {messages.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'msg user' : 'msg bot'}>
            {m.text || (busy && i === messages.length - 1 ? '…' : '')}
          </div>
        ))}
      </div>
      <div className="chips">
        {SUGGESTIONS.map((s) => (
          <button key={s} className="chip" onClick={() => ask(s)} disabled={busy}>
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
          placeholder={busy ? 'Thinking…' : 'Ask about your portfolio…'}
          onChange={(e) => setInput(e.target.value)}
          disabled={busy}
        />
        <button className="btn" type="submit" disabled={busy}>
          Send
        </button>
      </form>
    </div>
  )
}
