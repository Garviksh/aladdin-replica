import type { FactorDef, Instrument } from '../types/domain'

// The systematic factors that drive the synthetic market. Factor loadings
// (betas) on each instrument determine correlations and scenario sensitivities.
export const FACTORS: FactorDef[] = [
  { key: 'equity', label: 'Equity Market', annualVol: 0.16 },
  { key: 'rates', label: 'Interest Rates', annualVol: 0.06 },
  { key: 'credit', label: 'Credit Spread', annualVol: 0.05 },
  { key: 'commodity', label: 'Commodity', annualVol: 0.2 },
  { key: 'fx', label: 'USD / FX', annualVol: 0.08 },
]

// The instrument the portfolio is benchmarked against (held out of holdings).
export const BENCHMARK_ID = 'SPY'

// Convention for the "rates" factor: a POSITIVE factor return is bond-friendly
// (yields falling / bond prices rising). Bond instruments therefore have
// positive rates betas.
export const INSTRUMENTS: Instrument[] = [
  // ---- Equities ----
  { id: 'AAPL', ticker: 'AAPL', name: 'Apple Inc.', assetClass: 'Equity', sector: 'Information Technology', region: 'North America', currency: 'USD', betas: { equity: 1.15, rates: -0.1 }, idioVol: 0.18, basePrice: 210 },
  { id: 'MSFT', ticker: 'MSFT', name: 'Microsoft Corp.', assetClass: 'Equity', sector: 'Information Technology', region: 'North America', currency: 'USD', betas: { equity: 1.05, rates: -0.08 }, idioVol: 0.16, basePrice: 440 },
  { id: 'NVDA', ticker: 'NVDA', name: 'NVIDIA Corp.', assetClass: 'Equity', sector: 'Information Technology', region: 'North America', currency: 'USD', betas: { equity: 1.5, rates: -0.15 }, idioVol: 0.3, basePrice: 130 },
  { id: 'JPM', ticker: 'JPM', name: 'JPMorgan Chase & Co.', assetClass: 'Equity', sector: 'Financials', region: 'North America', currency: 'USD', betas: { equity: 1.2, rates: 0.25, credit: -0.15 }, idioVol: 0.2, basePrice: 205 },
  { id: 'XOM', ticker: 'XOM', name: 'Exxon Mobil Corp.', assetClass: 'Equity', sector: 'Energy', region: 'North America', currency: 'USD', betas: { equity: 0.9, commodity: 0.5 }, idioVol: 0.22, basePrice: 115 },
  { id: 'NESN', ticker: 'NESN', name: 'Nestlé S.A.', assetClass: 'Equity', sector: 'Consumer Staples', region: 'Europe', currency: 'CHF', betas: { equity: 0.7, fx: 0.4 }, idioVol: 0.14, basePrice: 100 },
  { id: 'SAP', ticker: 'SAP', name: 'SAP SE', assetClass: 'Equity', sector: 'Information Technology', region: 'Europe', currency: 'EUR', betas: { equity: 1.0, fx: 0.35 }, idioVol: 0.19, basePrice: 230 },
  { id: 'TSM', ticker: 'TSM', name: 'Taiwan Semiconductor Mfg.', assetClass: 'Equity', sector: 'Information Technology', region: 'Asia-Pacific', currency: 'USD', betas: { equity: 1.3, fx: 0.3 }, idioVol: 0.26, basePrice: 175 },
  { id: 'BABA', ticker: 'BABA', name: 'Alibaba Group Holding', assetClass: 'Equity', sector: 'Consumer Discretionary', region: 'Emerging Markets', currency: 'USD', betas: { equity: 1.1, fx: 0.5 }, idioVol: 0.32, basePrice: 90 },
  { id: 'VEA', ticker: 'VEA', name: 'Developed Markets ex-US ETF', assetClass: 'Equity', sector: 'Diversified Equity', region: 'Global', currency: 'USD', betas: { equity: 0.9, fx: 0.5 }, idioVol: 0.06, basePrice: 52 },

  // ---- Fixed Income ----
  { id: 'IEF', ticker: 'IEF', name: 'US 7-10Y Treasury ETF', assetClass: 'Fixed Income', sector: 'Government', region: 'North America', currency: 'USD', betas: { rates: 1.0, equity: -0.1 }, idioVol: 0.02, basePrice: 95 },
  { id: 'TLT', ticker: 'TLT', name: 'US 20Y+ Treasury ETF', assetClass: 'Fixed Income', sector: 'Government', region: 'North America', currency: 'USD', betas: { rates: 1.8, equity: -0.15 }, idioVol: 0.03, basePrice: 92 },
  { id: 'LQD', ticker: 'LQD', name: 'US IG Corporate Bond ETF', assetClass: 'Fixed Income', sector: 'Corporate Credit', region: 'North America', currency: 'USD', betas: { rates: 0.8, credit: 0.6 }, idioVol: 0.03, basePrice: 108 },
  { id: 'HYG', ticker: 'HYG', name: 'US High Yield Bond ETF', assetClass: 'Fixed Income', sector: 'Corporate Credit', region: 'North America', currency: 'USD', betas: { credit: 1.0, rates: 0.3, equity: 0.3 }, idioVol: 0.05, basePrice: 78 },
  { id: 'EMB', ticker: 'EMB', name: 'EM Sovereign Bond ETF', assetClass: 'Fixed Income', sector: 'Sovereign Credit', region: 'Emerging Markets', currency: 'USD', betas: { credit: 0.8, rates: 0.6, fx: 0.4 }, idioVol: 0.05, basePrice: 88 },

  // ---- Commodity ----
  { id: 'GLD', ticker: 'GLD', name: 'Gold Trust ETF', assetClass: 'Commodity', sector: 'Precious Metals', region: 'Global', currency: 'USD', betas: { commodity: 0.6, fx: -0.3, equity: -0.05 }, idioVol: 0.1, basePrice: 215 },
  { id: 'USO', ticker: 'USO', name: 'Crude Oil Fund ETF', assetClass: 'Commodity', sector: 'Energy', region: 'Global', currency: 'USD', betas: { commodity: 1.0, equity: 0.2 }, idioVol: 0.25, basePrice: 78 },

  // ---- Benchmark (not held) ----
  { id: 'SPY', ticker: 'SPY', name: 'S&P 500 Index', assetClass: 'Equity', sector: 'Diversified Equity', region: 'North America', currency: 'USD', betas: { equity: 1.0 }, idioVol: 0.015, basePrice: 560 },
]
