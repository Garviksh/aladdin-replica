import { useState } from 'react'
import { Copilot } from './components/Copilot'
import { Header } from './components/Header'
import { StatusBar } from './components/StatusBar'
import { TabNav, type TabDef } from './components/TabNav'
import { PortfolioProvider, usePortfolio } from './state/PortfolioContext'
import { AllocationView } from './views/AllocationView'
import { ComplianceView } from './views/ComplianceView'
import { DashboardView } from './views/DashboardView'
import { ForecastView } from './views/ForecastView'
import { GuideView } from './views/GuideView'
import { HoldingsView } from './views/HoldingsView'
import { NewsView } from './views/NewsView'
import { PerformanceView } from './views/PerformanceView'
import { RiskView } from './views/RiskView'

const TABS: TabDef[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'holdings', label: 'Holdings' },
  { id: 'risk', label: 'Risk' },
  { id: 'performance', label: 'Performance' },
  { id: 'forecast', label: 'Forecast' },
  { id: 'news', label: 'News' },
  { id: 'allocation', label: 'Allocation' },
  { id: 'compliance', label: 'Compliance' },
  { id: 'guide', label: 'Guide' },
]

function DemoBanner() {
  const { mode, realAvailable } = usePortfolio()
  if (mode === 'real') return null
  return (
    <div className="databanner">
      Showing <strong>DEMO sample data</strong>. Run <code>npm run refresh-data</code> for real
      market prices
      {realAvailable ? ', then switch DATA: LIVE in the header.' : '.'}
    </div>
  )
}

function Shell() {
  const [tab, setTab] = useState('dashboard')
  return (
    <div className="app">
      <Header />
      <TabNav tabs={TABS} active={tab} onSelect={setTab} />
      <DemoBanner />
      <main className="content">
        {tab === 'dashboard' && <DashboardView />}
        {tab === 'holdings' && <HoldingsView />}
        {tab === 'risk' && <RiskView />}
        {tab === 'performance' && <PerformanceView />}
        {tab === 'forecast' && <ForecastView />}
        {tab === 'news' && <NewsView />}
        {tab === 'allocation' && <AllocationView />}
        {tab === 'compliance' && <ComplianceView />}
        {tab === 'guide' && <GuideView />}
      </main>
      <StatusBar />
      <Copilot />
    </div>
  )
}

export default function App() {
  return (
    <PortfolioProvider>
      <Shell />
    </PortfolioProvider>
  )
}
