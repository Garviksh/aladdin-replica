import { useMemo } from 'react'
import { BarChart } from '../components/charts/BarChart'
import { ScatterChart } from '../components/charts/ScatterChart'
import { Panel } from '../components/Panel'
import { getMarket } from '../engine'
import { covByMethod } from '../engine/covariance'
import {
  annualReturn,
  expectedAnnualReturns,
  maxSharpeWeights,
  minVarianceWeights,
  portfolioVol,
  randomPortfolios,
  riskParityWeights,
} from '../engine/optimize'
import { fmtPct } from '../lib/format'
import { usePortfolio } from '../state/PortfolioContext'
import type { AllocationRow } from '../types/domain'

export function AllocationView() {
  const { analytics, seed, mode, covMethod } = usePortfolio()
  const { allocation } = analytics

  const market = useMemo(() => getMarket(seed, mode), [seed, mode])
  const cov = useMemo(() => covByMethod(market.returns, covMethod), [market, covMethod])
  const positions = market.portfolio.positions
  const invested = market.portfolio.investedValue
  const current = positions.map((p) => p.marketValue / invested)
  const minVar = useMemo(() => minVarianceWeights(cov), [cov])
  const riskParity = useMemo(() => riskParityWeights(cov), [cov])
  const volCur = portfolioVol(cov, current)
  const volMin = portfolioVol(cov, minVar)
  const volRp = portfolioVol(cov, riskParity)

  const mu = useMemo(() => expectedAnnualReturns(market.returns), [market])
  const equal = new Array<number>(positions.length).fill(1 / positions.length)
  const maxSharpe = useMemo(() => maxSharpeWeights(cov, mu), [cov, mu])
  const cloud = useMemo(() => randomPortfolios(cov, mu, 500), [cov, mu])
  const mk = (w: number[], label: string) => ({
    x: portfolioVol(cov, w) * 100,
    y: annualReturn(mu, w) * 100,
    label,
  })
  const markers = [
    mk(current, 'Current'),
    mk(minVar, 'Min-Var'),
    mk(maxSharpe, 'Max-Sharpe'),
    mk(riskParity, 'Risk-Parity'),
    mk(equal, 'Equal'),
  ]
  const cloudPoints = cloud.map((p) => ({ x: p.vol * 100, y: p.ret * 100 }))

  const toItems = (rows: AllocationRow[]) =>
    rows.map((r) => ({ label: r.label, value: r.weight, caption: fmtPct(r.weight) }))

  return (
    <div className="view">
      <div className="row three">
        <Panel title="By Asset Class" hint="% of NAV">
          <BarChart items={toItems(allocation.byAssetClass)} />
        </Panel>
        <Panel title="By Sector" hint="% of NAV">
          <BarChart items={toItems(allocation.bySector)} />
        </Panel>
        <Panel title="By Region" hint="% of NAV">
          <BarChart items={toItems(allocation.byRegion)} />
        </Panel>
      </div>

      <Panel
        title="Efficient Frontier"
        hint="random long-only portfolios · x = ann. vol, y = ann. return"
      >
        <ScatterChart
          points={cloudPoints}
          markers={markers}
          xFormat={(v) => `${v.toFixed(0)}%`}
          yFormat={(v) => `${v.toFixed(0)}%`}
        />
      </Panel>

      <Panel
        title="Optimizer — Suggested Weights"
        hint={`ann. vol: current ${fmtPct(volCur)} · min-var ${fmtPct(volMin)} · risk-parity ${fmtPct(volRp)}`}
        flush
      >
        <table className="data">
          <thead>
            <tr>
              <th>Ticker</th>
              <th>Class</th>
              <th className="num">Current</th>
              <th className="num">Min-Var</th>
              <th className="num">Risk-Parity</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((p, i) => (
              <tr key={p.instrument.id}>
                <td className="mono">
                  <strong>{p.instrument.ticker}</strong>
                </td>
                <td>{p.instrument.assetClass}</td>
                <td className="num">{fmtPct(current[i])}</td>
                <td className="num">{fmtPct(minVar[i])}</td>
                <td className="num">{fmtPct(riskParity[i])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      <p className="disclaimer">
        Optimizer weights are model estimates — long-only minimum-variance and equal-risk-contribution
        (risk parity). Not investment advice.
      </p>
    </div>
  )
}
