import type { VarBacktest, VarBacktestLevel } from '../types/domain'
import { normCdf } from './forecast'

// χ² survival (p-value) helpers.
// χ²(1): P(X>x) = 2·P(Z>√x) = 2(1-Φ(√x)).  χ²(2): P(X>x) = e^(-x/2).
const chi2p1 = (lr: number): number => (lr <= 0 ? 1 : Math.min(1, 2 * (1 - normCdf(Math.sqrt(lr)))))
const chi2p2 = (lr: number): number => (lr <= 0 ? 1 : Math.exp(-lr / 2))

const Z: Record<number, number> = { 0.95: 1.645, 0.99: 2.326 }
const safeLog = (v: number): number => (v > 0 ? Math.log(v) : 0)

/**
 * Backtest parametric-normal VaR against realized daily returns:
 *  - Kupiec POF (unconditional coverage) — are there the right number of exceptions?
 *  - Christoffersen (conditional coverage) — are exceptions independent (not clustered)?
 * A high p-value (> 0.05) means we fail to reject the model — i.e. it looks adequate.
 */
export function computeVarBacktest(
  pRet: number[],
  dailyVol: number,
  levels: number[] = [0.95, 0.99],
): VarBacktest {
  const T = pRet.length
  const out: VarBacktestLevel[] = levels.map((level) => {
    const alpha = 1 - level
    const threshold = -(Z[level] ?? 2.326) * dailyVol // return threshold (negative)
    const ind: number[] = pRet.map((r) => (r < threshold ? 1 : 0))
    const x = ind.reduce((a, b) => a + b, 0)
    const rate = T ? x / T : 0

    // Kupiec proportion-of-failures LR.
    let kupiecLR: number
    if (x === 0) kupiecLR = -2 * T * Math.log(1 - alpha)
    else if (x === T) kupiecLR = -2 * T * Math.log(alpha)
    else
      kupiecLR =
        -2 * ((T - x) * Math.log(1 - alpha) + x * Math.log(alpha)) +
        2 * ((T - x) * Math.log(1 - rate) + x * Math.log(rate))

    // Christoffersen independence (transition counts).
    let n00 = 0
    let n01 = 0
    let n10 = 0
    let n11 = 0
    for (let t = 1; t < T; t++) {
      const prev = ind[t - 1]
      const cur = ind[t]
      if (prev === 0 && cur === 0) n00++
      else if (prev === 0 && cur === 1) n01++
      else if (prev === 1 && cur === 0) n10++
      else n11++
    }
    const pi01 = n00 + n01 ? n01 / (n00 + n01) : 0
    const pi11 = n10 + n11 ? n11 / (n10 + n11) : 0
    const pi = (n01 + n11) / Math.max(1, n00 + n01 + n10 + n11)
    const restricted = (n00 + n10) * safeLog(1 - pi) + (n01 + n11) * safeLog(pi)
    const unrestricted =
      n00 * safeLog(1 - pi01) + n01 * safeLog(pi01) + n10 * safeLog(1 - pi11) + n11 * safeLog(pi11)
    let lrInd = -2 * (restricted - unrestricted)
    if (!Number.isFinite(lrInd) || lrInd < 0) lrInd = 0

    const ccLR = kupiecLR + lrInd
    const kupiecP = chi2p1(kupiecLR)
    const christoffersenP = chi2p2(ccLR)
    return {
      level,
      exceptions: x,
      expected: alpha * T,
      rate,
      kupiecLR,
      kupiecP,
      christoffersenLR: ccLR,
      christoffersenP,
      pass: kupiecP > 0.05 && christoffersenP > 0.05,
    }
  })
  return { obs: T, levels: out }
}
