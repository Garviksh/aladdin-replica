export function DataGate({ onPreview }: { onPreview: () => void }) {
  return (
    <div className="gate">
      <div className="gate-box">
        <div className="brand-mark">ALADDIN</div>
        <div className="gate-sub">· REPLICA — Portfolio &amp; Risk Terminal</div>
        <h2 className="gate-h">No live market data loaded</h2>
        <p className="gate-p">
          This terminal runs on <strong>real market data only</strong>. Load real end-of-day prices,
          then reload — no dummy numbers are shown.
        </p>
        <ol className="gate-steps">
          <li>
            Get a free key (30s, no card): <code>https://twelvedata.com/register</code>
          </li>
          <li>
            <code>TWELVE_DATA_KEY=your_key npm run refresh-data</code>
          </li>
          <li>
            <code>npm run dev</code>
          </li>
        </ol>
        <p className="gate-p muted">
          For the AI Copilot, also run Ollama locally: <code>ollama pull llama3.2</code> then{' '}
          <code>OLLAMA_ORIGINS=* ollama serve</code>.
        </p>
        <button className="btn" onClick={onPreview}>
          Preview with sample data (clearly marked, not real)
        </button>
      </div>
    </div>
  )
}
