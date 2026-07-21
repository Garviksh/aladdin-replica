import { renderToStaticMarkup } from 'react-dom/server'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import App from '../src/App'
import { PortfolioProvider } from '../src/state/PortfolioContext'
import { AllocationView } from '../src/views/AllocationView'
import { ComplianceView } from '../src/views/ComplianceView'
import { ForecastView } from '../src/views/ForecastView'
import { GuideView } from '../src/views/GuideView'
import { HoldingsView } from '../src/views/HoldingsView'
import { PerformanceView } from '../src/views/PerformanceView'
import { RiskView } from '../src/views/RiskView'

const wrap = (node: ReactNode) =>
  renderToStaticMarkup(<PortfolioProvider>{node}</PortfolioProvider>)

describe('App smoke render', () => {
  it('renders the terminal shell, dashboard, and Copilot launcher', () => {
    const html = renderToStaticMarkup(<App />)
    expect(html).toContain('ALADDIN')
    expect(html).toContain('Net Asset Value')
    expect(html).toContain('Portfolio vs Benchmark')
    expect(html).toContain('COPILOT')
    expect(html).not.toContain('NaN')
  })

  it('renders every view without throwing', () => {
    expect(wrap(<HoldingsView />)).toContain('Holdings')
    expect(wrap(<RiskView />)).toContain('Contribution to Risk')
    expect(wrap(<PerformanceView />)).toContain('Cumulative Performance')
    expect(wrap(<ForecastView />)).toContain('Projected Portfolio Value')
    expect(wrap(<AllocationView />)).toContain('By Sector')
    expect(wrap(<ComplianceView />)).toContain('Mandate Compliance')
    expect(wrap(<GuideView />)).toContain('walkthrough')
  })

  it('does not leak NaN into any rendered view', () => {
    for (const view of [
      <HoldingsView key="h" />,
      <RiskView key="r" />,
      <PerformanceView key="p" />,
      <ForecastView key="f" />,
      <AllocationView key="a" />,
      <ComplianceView key="c" />,
      <GuideView key="g" />,
    ]) {
      expect(wrap(view)).not.toContain('NaN')
    }
  })
})
