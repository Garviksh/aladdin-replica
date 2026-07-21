import { useState } from 'react'
import { Copilot } from './components/Copilot'
import { Header } from './components/Header'
import { StatusBar } from './components/StatusBar'
import { TabNav, type TabDef } from './components/TabNav'
import { PortfolioProvider } from './state/PortfolioContext'
import { AllocationView } from './views/AllocationView'
import { ComplianceView } from './views/ComplianceView'
import { DashboardView } from './views/DashboardView'
import { ForecastView } from './views/ForecastView'
import { GuideView } from './views/GuideView'
import { HoldingsView } from './views/HoldingsView'
import { PerformanceView } from './views/PerformanceView'
import { RiskView } from './views/RiskView'

const TABS: TabDef[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'holdings', label: 'Holdings' },
  { id: 'risk', label: 'Risk' },
  { id: 'performance', label: 'Performance' },
  { id: 'forecast', label: 'Forecast' },
  { id: 'allocation', label: 'Allocation' },
  { id: 'compliance', label: 'Compliance' },
  { id: 'guide', label: 'Guide' },
]

function Shell() {
  const [tab, setTab] = useState('dashboard')
  return (
    <div className="app">
      <Header />
      <TabNav tabs={TABS} active={tab} onSelect={setTab} />
      <main className="content">
        {tab === 'dashboard' && <DashboardView />}
        {tab === 'holdings' && <HoldingsView />}
        {tab === 'risk' && <RiskView />}
        {tab === 'performance' && <PerformanceView />}
        {tab === 'forecast' && <ForecastView />}
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
