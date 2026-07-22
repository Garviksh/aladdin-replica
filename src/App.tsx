import { useState } from 'react'
import { Copilot } from './components/Copilot'
import { DataGate } from './components/DataGate'
import { Header } from './components/Header'
import { StatusBar } from './components/StatusBar'
import { TabNav, type TabDef } from './components/TabNav'
import { PortfolioProvider, usePortfolio } from './state/PortfolioContext'
import { AllocationView } from './views/AllocationView'
import { BacktestView } from './views/BacktestView'
import { ComplianceView } from './views/ComplianceView'
import { DashboardView } from './views/DashboardView'
import { ForecastView } from './views/ForecastView'
import { GuideView } from './views/GuideView'
import { HoldingsView } from './views/HoldingsView'
import { ImpactView } from './views/ImpactView'
import { MacroView } from './views/MacroView'
import { NewsView } from './views/NewsView'
import { PerformanceView } from './views/PerformanceView'
import { RiskView } from './views/RiskView'
import { ScenarioBuilderView } from './views/ScenarioBuilderView'

const TABS: TabDef[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'holdings', label: 'Holdings' },
  { id: 'risk', label: 'Risk' },
  { id: 'performance', label: 'Performance' },
  { id: 'forecast', label: 'Forecast' },
  { id: 'backtest', label: 'Backtest' },
  { id: 'news', label: 'News' },
  { id: 'impact', label: 'Impact' },
  { id: 'scenario', label: 'Scenario' },
  { id: 'macro', label: 'Macro' },
  { id: 'allocation', label: 'Allocation' },
  { id: 'compliance', label: 'Compliance' },
  { id: 'guide', label: 'Guide' },
]

function SampleBanner() {
  const { mode } = usePortfolio()
  if (mode === 'real') return null
  return (
    <div className="databanner">
      <strong>SAMPLE DATA — not real.</strong> Run <code>TWELVE_DATA_KEY=your_key npm run
      refresh-data</code> for live market prices, then reload.
    </div>
  )
}

function Shell() {
  const [tab, setTab] = useState('dashboard')
  return (
    <div className="app">
      <Header />
      <TabNav tabs={TABS} active={tab} onSelect={setTab} />
      <SampleBanner />
      <main className="content">
        {tab === 'dashboard' && <DashboardView />}
        {tab === 'holdings' && <HoldingsView />}
        {tab === 'risk' && <RiskView />}
        {tab === 'performance' && <PerformanceView />}
        {tab === 'forecast' && <ForecastView />}
        {tab === 'backtest' && <BacktestView />}
        {tab === 'news' && <NewsView />}
        {tab === 'impact' && <ImpactView />}
        {tab === 'scenario' && <ScenarioBuilderView />}
        {tab === 'macro' && <MacroView />}
        {tab === 'allocation' && <AllocationView />}
        {tab === 'compliance' && <ComplianceView />}
        {tab === 'guide' && <GuideView />}
      </main>
      <StatusBar />
      <Copilot />
    </div>
  )
}

function Root() {
  const { showGate, setPreview } = usePortfolio()
  if (showGate) return <DataGate onPreview={() => setPreview(true)} />
  return <Shell />
}

export default function App() {
  return (
    <PortfolioProvider>
      <Root />
    </PortfolioProvider>
  )
}
