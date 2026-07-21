// Domain model for the ALADDIN·Replica portfolio & risk terminal.
// All monetary values are in the portfolio base currency (USD) unless noted.

export type AssetClass = 'Equity' | 'Fixed Income' | 'Commodity' | 'Cash'

export type Region =
  | 'North America'
  | 'Europe'
  | 'Asia-Pacific'
  | 'Emerging Markets'
  | 'Global'

/** Systematic risk factors that drive the synthetic market. */
export type FactorKey = 'equity' | 'rates' | 'credit' | 'commodity' | 'fx'

export interface FactorDef {
  key: FactorKey
  label: string
  /** Annualized volatility of the factor return. */
  annualVol: number
}

export interface Instrument {
  id: string
  ticker: string
  name: string
  assetClass: AssetClass
  sector: string
  region: Region
  currency: string
  /** Factor loadings (betas). Missing factors are treated as 0. */
  betas: Partial<Record<FactorKey, number>>
  /** Annualized idiosyncratic (stock-specific) volatility. */
  idioVol: number
  basePrice: number
}

export interface Position {
  instrument: Instrument
  quantity: number
  price: number
  prevPrice: number
  marketValue: number
  /** Fraction of total portfolio NAV. */
  weight: number
  dayChangePct: number
  dayPnl: number
  /** Average per-share cost. */
  costBasis: number
  unrealizedPnl: number
}

export interface Portfolio {
  name: string
  baseCurrency: string
  asOf: string
  cash: number
  positions: Position[]
  /** positions + cash */
  totalValue: number
  /** positions only */
  investedValue: number
}

export interface PricePoint {
  t: number
  v: number
}

export interface ComponentRisk {
  ticker: string
  name: string
  weight: number
  standaloneVol: number
  /** Marginal contribution to risk (annualized). */
  marginal: number
  /** Component contribution to risk; sums to portfolio annualVol. */
  contribution: number
  /** Share of total portfolio risk (fraction). */
  pctOfRisk: number
}

export interface FactorExposure {
  key: FactorKey
  label: string
  exposure: number
}

export interface RiskMetrics {
  /** Ex-ante annualized volatility (fraction). */
  annualVol: number
  /** Parametric 1-day 95% VaR (currency, positive = potential loss). */
  var95_1d: number
  var99_1d: number
  /** Historical 1-day 95% VaR (currency). */
  histVar95_1d: number
  /** Parametric 1-day Expected Shortfall / CVaR (currency, positive = loss). */
  cvar95_1d: number
  cvar99_1d: number
  /** Historical 1-day 95% Expected Shortfall (currency). */
  histCvar95_1d: number
  /** Historical 1-day 99% VaR (currency). */
  histVar99_1d: number
  /** Cornish–Fisher (fat-tailed) 1-day VaR (currency). */
  cfVar95_1d: number
  cfVar99_1d: number
  /** Daily-return skewness and excess kurtosis of the book. */
  skew: number
  exKurt: number
  /** Portfolio beta to the benchmark. */
  beta: number
  factorExposures: FactorExposure[]
  components: ComponentRisk[]
  /** Diversification ratio: 1 - portfolioVol / weightedAvgStandaloneVol. */
  diversification: number
  /** VaR coverage backtest (Kupiec + Christoffersen). */
  backtest: VarBacktest
}

export interface VarBacktestLevel {
  level: number
  exceptions: number
  expected: number
  rate: number
  kupiecLR: number
  kupiecP: number
  christoffersenLR: number
  christoffersenP: number
  pass: boolean
}

export interface VarBacktest {
  obs: number
  levels: VarBacktestLevel[]
}

export interface ScenarioResult {
  key: string
  label: string
  description: string
  shocks: Partial<Record<FactorKey, number>>
  pnl: number
  pnlPct: number
}

export interface PerfPoint {
  t: number
  portfolio: number
  benchmark: number
}

export interface AttributionRow {
  label: string
  weight: number
  return: number
  contribution: number
}

export interface Performance {
  /** Cumulative growth of 1 unit, portfolio vs benchmark. */
  series: PerfPoint[]
  /** Daily P&L in currency. */
  pnlSeries: PricePoint[]
  totalReturn: number
  benchmarkReturn: number
  activeReturn: number
  sharpe: number
  sortino: number
  calmar: number
  /** Annualized information ratio vs. benchmark. */
  informationRatio: number
  /** Annualized tracking error (fraction). */
  trackingError: number
  /** Annualized downside deviation (fraction). */
  downsideDeviation: number
  maxDrawdown: number
  bySector: AttributionRow[]
  byAssetClass: AttributionRow[]
}

export type ComplianceStatus = 'pass' | 'warn' | 'breach'

export interface ComplianceRule {
  id: string
  label: string
  description: string
  limit: string
  observed: string
  status: ComplianceStatus
}

export interface AllocationRow {
  label: string
  value: number
  weight: number
}

export interface Allocation {
  byAssetClass: AllocationRow[]
  bySector: AllocationRow[]
  byRegion: AllocationRow[]
}

export interface Analytics {
  portfolio: Portfolio
  risk: RiskMetrics
  performance: Performance
  compliance: ComplianceRule[]
  scenarios: ScenarioResult[]
  allocation: Allocation
  benchmarkName: string
  lookbackDays: number
}
