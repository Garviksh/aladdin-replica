import { useEffect, useMemo, useRef, useState } from 'react'
import {
  askOllamaStream,
  askOllamaTools,
  buildSystemPrompt,
  ollamaModels,
  pickModel,
} from '../assistant/ollama'
import { makeToolContext, runTool, TOOL_SPECS } from '../assistant/tools'
import { respond } from '../assistant/respond'
import { flagUnknownFigures } from '../assistant/verify'
import { getMarket } from '../engine'
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
  'Top 3 risk drivers',
  'What if NVDA drops 20%?',
  'Compare 2008 vs COVID',
  'Explain the Macro tab',
]

export function Copilot() {
  const { analytics, seed, mode } = usePortfolio()
  const forecast = useMemo(() => buildForecast(seed, 252, 300, mode), [seed, mode])
  const market = useMemo(() => getMarket(seed, mode), [seed, mode])
  const toolCtx = useMemo(() => makeToolContext(analytics, market), [analytics, market])

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
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [messages, open])

  const status =
    engine === 'ollama'
      ? `Ready · OLLAMA ${model} · tool-calling on live data · on-device, nothing leaves your machine.`
      : engine === 'local'
        ? 'Ollama not detected — using the built-in local assistant. Enable the LLM: OLLAMA_ORIGINS=* ollama serve'
        : 'Connecting to local Ollama…'

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
    const setLast = (text: string) =>
      setMessages((m) => {
        const c = [...m]
        c[c.length - 1] = { role: 'bot', text }
        return c
      })
    try {
      // Primary path: agentic tool-calling — the model queries the live engine.
      const { content, toolsUsed } = await askOllamaTools(
        model,
        [
          { role: 'system', content: system },
          { role: 'user', content: q },
        ],
        TOOL_SPECS,
        (name, args) => runTool(name, args, toolCtx),
      )
      const used = [...new Set(toolsUsed)]
      const note = used.length ? `\n\n— queried live data: ${used.join(', ')}` : ''
      setLast((content || '(no answer)') + note)
      // Tool results are already exact engine numbers; only verify snapshot-only answers.
      if (!used.length) {
        const unknown = flagUnknownFigures(content, system)
        if (unknown.length) {
          setMessages((m) => [
            ...m,
            {
              role: 'bot',
              text: `⚠ I couldn't match these figures to your live data — verify them in the tabs: ${unknown.slice(0, 5).join(', ')}.`,
            },
          ])
        }
      }
    } catch {
      // Fallback 1: plain streaming (no tools).
      let full = ''
      try {
        await askOllamaStream(
          model,
          [
            { role: 'system', content: system },
            { role: 'user', content: q },
          ],
          (tok) => {
            full += tok
            setLast(full)
          },
        )
      } catch {
        // Fallback 2: built-in local assistant.
        setLast(`(Ollama unavailable — local answer)\n${respond(q, { analytics, seed, mode })}`)
        setEngine('local')
      }
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
        <div className="copilot-status">{status}</div>
        {messages.length === 0 ? (
          <div className="news-msg">Ask about your book, or tap a suggestion below.</div>
        ) : null}
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
