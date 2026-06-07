/**
 * Portfolio Optimizer Calculations Utility
 * 
 * Handles overlapping historical date alignment, covariance matrix calculation,
 * Sharpe Ratio optimization, Min Volatility optimization, and DCA portfolio simulation.
 */

/**
 * Align prices of multiple assets on overlapping dates.
 * Returns a list of dates and the daily returns for each asset.
 */
export function alignAndCalculateReturns(assetsPrices) {
  // assetsPrices is an object: { TICKER: [{ date, adj_close/close }, ...] }
  const tickers = Object.keys(assetsPrices).sort(); // Sort alphabetically for determinism
  if (tickers.length === 0) return { dates: [], returns: {}, priceMap: {} };

  // 1. Find overlapping date range
  let commonDates = null;
  const priceMaps = {};

  tickers.forEach(ticker => {
    const prices = assetsPrices[ticker] || [];
    const dates = new Set(prices.map(p => p.date));
    priceMaps[ticker] = new Map(prices.map(p => [p.date, p.adj_close || p.close]));

    if (commonDates === null) {
      commonDates = dates;
    } else {
      // intersect
      commonDates = new Set([...commonDates].filter(d => dates.has(d)));
    }
  });

  if (!commonDates || commonDates.size < 2) {
    return { dates: [], returns: {}, priceMap: {} };
  }

  const sortedDates = [...commonDates].sort();
  const returns = {};
  tickers.forEach(t => { returns[t] = []; });

  // 2. Compute daily returns
  for (let i = 1; i < sortedDates.length; i++) {
    const prevDate = sortedDates[i - 1];
    const currDate = sortedDates[i];

    tickers.forEach(ticker => {
      const prevPrice = priceMaps[ticker].get(prevDate);
      const currPrice = priceMaps[ticker].get(currDate);
      const dailyReturn = (currPrice - prevPrice) / prevPrice;
      returns[ticker].push(dailyReturn);
    });
  }

  return {
    dates: sortedDates.slice(1),
    returns,
    priceMap: priceMaps,
  };
}

/**
 * Compute covariance matrix and mean annualized returns.
 * Uses geometric (log-return) mean to correctly account for volatility drag.
 * High-volatility assets have their expected return reduced by (vol^2)/2 per year,
 * which is the standard treatment in quantitative finance.
 */
export function computeMetrics(alignedData) {
  const { returns, dates } = alignedData;
  const tickers = Object.keys(returns).sort(); // Sort alphabetically for determinism
  const N = tickers.length;
  const numDays = dates.length;

  if (numDays === 0) return { meanReturns: {}, covariance: [], volatilities: {} };

  const annualizationFactor = 252; // trading days in a year

  // 1. Calculate geometric (log-return) mean returns
  //    Geometric mean correctly accounts for volatility drag:
  //    geometric_return ≈ arithmetic_return - (variance/2)
  //    This prevents high-volatility assets from being grossly overstated.
  const arithmeticMeans = {};
  const meanReturns = {};
  tickers.forEach(t => {
    // Arithmetic mean of raw returns (used for covariance computation)
    const sum = returns[t].reduce((a, b) => a + b, 0);
    arithmeticMeans[t] = sum / numDays;

    // Geometric mean via log returns (used for expected return in optimizer)
    const logReturnSum = returns[t].reduce((a, r) => a + Math.log(1 + r), 0);
    const meanLogReturn = logReturnSum / numDays;
    meanReturns[t] = Math.exp(annualizationFactor * meanLogReturn) - 1;
  });

  // 2. Calculate volatilities and covariance (based on arithmetic means, standard practice)
  const covariance = Array(N).fill(0).map(() => Array(N).fill(0));
  const volatilities = {};

  tickers.forEach((t1, i) => {
    // Volatility of t1
    let sumSq = 0;
    for (let d = 0; d < numDays; d++) {
      sumSq += Math.pow(returns[t1][d] - arithmeticMeans[t1], 2);
    }
    const variance = sumSq / (numDays - 1);
    volatilities[t1] = Math.sqrt(variance * annualizationFactor);

    // Covariances
    tickers.forEach((t2, j) => {
      let sumCov = 0;
      for (let d = 0; d < numDays; d++) {
        sumCov += (returns[t1][d] - arithmeticMeans[t1]) * (returns[t2][d] - arithmeticMeans[t2]);
      }
      covariance[i][j] = (sumCov / (numDays - 1)) * annualizationFactor;
    });
  });

  return {
    meanReturns,
    volatilities,
    covariance,
  };
}


/**
 * Portfolio return and volatility calculations.
 * Expects weights, meanReturns/covariance, and tickers to be aligned (sorted alphabetically).
 */
export function getPortfolioStats(weights, meanReturns, covariance, tickers) {
  const N = tickers.length;
  let pReturn = 0;

  // Expected portfolio return
  tickers.forEach((ticker, i) => {
    pReturn += weights[i] * (meanReturns[ticker] || 0);
  });

  // Expected portfolio variance W^T * Cov * W
  let pVariance = 0;
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      pVariance += weights[i] * weights[j] * covariance[i][j];
    }
  }

  const pVolatility = Math.sqrt(Math.max(0, pVariance));

  return {
    pReturn,
    pVolatility,
  };
}

/**
 * Solves the constrained portfolio optimization problem deterministically
 * using Coordinate Descent with simplex projection / constraint boundaries.
 */
/**
 * Solves the constrained portfolio optimization problem deterministically
 * using Coordinate Descent to minimize a custom penalty-based loss function.
 */
function solveOptimization(meanReturns, covariance, tickers, riskFreeRate, mode) {
  const N = tickers.length;
  if (N === 0) return { weights: Array(N).fill(0), loss: 0 };
  if (N === 1) return { weights: [1.0], loss: 0 };

  const HIGH_RISK = ["NVDA", "TSLA", "AMD", "PLTR", "COIN", "MSTR"];
  const GOLD = ["GLD"];
  const ETF = ["SPY", "QQQ", "^CASE30"];

  const hasEtf = tickers.some(t => ETF.includes(t));
  const hasGold = tickers.some(t => GOLD.includes(t));
  const hasHighRisk = tickers.some(t => HIGH_RISK.includes(t));

  // Determine penalty/weight coefficients based on optimization mode
  let returnWeight = 0;
  let riskWeight = 0;
  let concentrationWeight = 0;
  let etfPenalty = 0;
  let goldPenalty = 0;
  let highRiskPenalty = 0;

  if (mode === 'LOW_RISK') {
    returnWeight = 0.5;
    riskWeight = 15.0;            // Focus heavily on minimizing variance
    concentrationWeight = 2.0;    // Strong penalty to force diversification
    etfPenalty = 0.0;
    goldPenalty = 0.0;
    highRiskPenalty = 15.0;       // Strongly penalize high risk stocks exceeding 20%
  } else if (mode === 'MAX_RETURN') {
    returnWeight = 15.0;          // Focus heavily on expected return
    riskWeight = 0.5;             // Small but non-zero risk penalty
    concentrationWeight = 0.5;    // Prevent putting 100% of portfolio in single asset
    etfPenalty = 0.0;
    goldPenalty = 0.0;
    highRiskPenalty = 0.0;
  } else if (mode === 'CONTROLLED_GROWTH') {
    returnWeight = 3.0;           // Balance expected return
    riskWeight = 3.0;             // and variance
    concentrationWeight = 1.5;    // Encourage diversification among selected assets
    etfPenalty = 40.0;            // Strong penalty to enforce ETF weight >= 40%
    goldPenalty = 20.0;           // Gold weight <= 20%
    highRiskPenalty = 40.0;       // Strong penalty to cap total single stocks <= 20%
  }

  // Hard constraints check: non-negativity, sum equal to 1, and 20% high-risk cap
  const isValid = (w) => {
    let sum = 0;
    let highRiskWeight = 0;
    for (let i = 0; i < N; i++) {
      if (w[i] < -1e-7 || w[i] > 1.0000001) return false;
      sum += w[i];
      if (!ETF.includes(tickers[i]) && !GOLD.includes(tickers[i])) {
        highRiskWeight += w[i];
      }
    }
    if (Math.abs(sum - 1.0) > 1e-4) return false;

    if (mode === 'CONTROLLED_GROWTH') {
      const nonHighRiskCount = tickers.filter(t => ETF.includes(t) || GOLD.includes(t)).length;
      if (nonHighRiskCount > 0 && highRiskWeight > 0.2001) {
        return false;
      }
    }
    return true;
  };

  const getVariance = (w) => {
    let pVariance = 0;
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        pVariance += w[i] * w[j] * covariance[i][j];
      }
    }
    return pVariance;
  };

  // Custom multi-variable loss function to minimize
  const calculateLoss = (w) => {
    const { pReturn } = getPortfolioStats(w, meanReturns, covariance, tickers);
    const pVariance = getVariance(w);

    let etfWeight = 0;
    let goldWeight = 0;
    let highRiskWeight = 0;

    tickers.forEach((t, idx) => {
      if (ETF.includes(t)) etfWeight += w[idx];
      else if (GOLD.includes(t)) goldWeight += w[idx];
      else highRiskWeight += w[idx]; // Any other custom single stock is classified as high-risk stock weight
    });

    const sumSqWeights = w.reduce((sum, val) => sum + val * val, 0);

    const termReturn = -returnWeight * pReturn;
    const termRisk = riskWeight * pVariance;
    const termConcentration = concentrationWeight * sumSqWeights;

    const termEtf = hasEtf ? etfPenalty * Math.pow(Math.max(0, 0.40 - etfWeight), 2) : 0;
    const termGold = hasGold ? goldPenalty * Math.pow(Math.max(0, goldWeight - 0.20), 2) : 0;
    const termHighRisk = hasHighRisk ? highRiskPenalty * Math.pow(Math.max(0, highRiskWeight - 0.20), 2) : 0;

    return termReturn + termRisk + termConcentration + termEtf + termGold + termHighRisk;
  };

  // Start with a valid guess
  let bestWeights = Array(N).fill(1 / N);
  if (mode === 'CONTROLLED_GROWTH') {
    const nonHighRiskTickers = tickers.filter(t => ETF.includes(t) || GOLD.includes(t));
    if (nonHighRiskTickers.length > 0) {
      const highRiskTickers = tickers.filter(t => !ETF.includes(t) && !GOLD.includes(t));
      const hrCount = highRiskTickers.length;
      const nhrCount = nonHighRiskTickers.length;
      if (hrCount > 0) {
        const hrAlloc = 0.20 / hrCount;
        const nhrAlloc = 0.80 / nhrCount;
        bestWeights = tickers.map(t => {
          if (!ETF.includes(t) && !GOLD.includes(t)) return hrAlloc;
          return nhrAlloc;
        });
      }
    }
  }

  let bestLoss = calculateLoss(bestWeights);

  // Coordinate Descent optimization loop
  let step = 0.1;
  const minStep = 1e-6;

  while (step >= minStep) {
    let improved = false;
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        if (i === j) continue;

        const nextWeights = [...bestWeights];
        const actualShift = Math.min(step, nextWeights[i]);
        if (actualShift <= 1e-9) continue;

        nextWeights[i] -= actualShift;
        nextWeights[j] += actualShift;

        if (isValid(nextWeights)) {
          const loss = calculateLoss(nextWeights);
          if (loss < bestLoss - 1e-9) {
            bestWeights = nextWeights;
            bestLoss = loss;
            improved = true;
          }
        }
      }
    }
    if (!improved) {
      step *= 0.5;
    }
  }

  // Normalize final weights to sum precisely to 1.0
  const sum = bestWeights.reduce((a, b) => a + b, 0);
  if (sum > 0) {
    bestWeights = bestWeights.map(x => Math.max(0, x / sum));
  }

  return {
    weights: bestWeights,
    loss: calculateLoss(bestWeights)
  };
}

/**
 * Optimize weights using deterministic numerical solvers.
 * Returns optimized weights, expected returns, volatility, Sharpe ratio, category weights, and final loss for each mode.
 */
export function optimizePortfolio(meanReturns, covariance, tickers, riskFreeRate = 0.02) {
  const sortedTickers = [...tickers].sort();
  const N = sortedTickers.length;

  const HIGH_RISK = ["NVDA", "TSLA", "AMD", "PLTR", "COIN", "MSTR"];
  const GOLD = ["GLD"];
  const ETF = ["SPY", "QQQ", "^CASE30"];

  const buildResult = (w, lossValue) => {
    const { pReturn, pVolatility } = getPortfolioStats(w, meanReturns, covariance, sortedTickers);
    const sharpe = pVolatility > 0 ? (pReturn - riskFreeRate) / pVolatility : 0;

    let etfWeight = 0;
    let goldWeight = 0;
    let highRiskWeight = 0;
    let otherWeight = 0;

    sortedTickers.forEach((t, idx) => {
      if (ETF.includes(t)) etfWeight += w[idx];
      else if (GOLD.includes(t)) goldWeight += w[idx];
      else highRiskWeight += w[idx]; // Custom single stocks (e.g. AAPL) fall into highRiskWeight
    });

    const formattedWeights = {};
    sortedTickers.forEach((t, idx) => {
      formattedWeights[t] = w[idx];
    });

    return {
      weights: formattedWeights,
      expectedReturn: pReturn,
      volatility: pVolatility,
      sharpeRatio: sharpe,
      categoryWeights: {
        etf: etfWeight,
        gold: goldWeight,
        highRisk: highRiskWeight,
        other: otherWeight
      },
      loss: lossValue
    };
  };

  const lowRisk = solveOptimization(meanReturns, covariance, sortedTickers, riskFreeRate, 'LOW_RISK');
  const maxReturn = solveOptimization(meanReturns, covariance, sortedTickers, riskFreeRate, 'MAX_RETURN');
  const controlled = solveOptimization(meanReturns, covariance, sortedTickers, riskFreeRate, 'CONTROLLED_GROWTH');

  const equalW = Array(N).fill(1 / N);
  const equalRes = buildResult(equalW, 0);

  return {
    LOW_RISK: buildResult(lowRisk.weights, lowRisk.loss),
    MAX_RETURN: buildResult(maxReturn.weights, maxReturn.loss),
    CONTROLLED_GROWTH: buildResult(controlled.weights, controlled.loss),
    equal: equalRes
  };
}

/**
 * Simulate DCA trajectory for the weighted portfolio.
 */
export function simulatePortfolioDca(assetsPrices, weights, monthlyAmount, years) {
  const tickers = Object.keys(weights).filter(t => weights[t] > 0);
  if (tickers.length === 0) return { timeline: [], finalWealth: 0, totalInvested: 0 };

  // 1. Gather all price data and group by year-month
  const monthlyData = []; // [{ date: "YYYY-MM", prices: { TICKER: price } }]

  // Find all available year-months for overlap
  const dateMap = {}; // "YYYY-MM" -> { TICKER: price }

  tickers.forEach(ticker => {
    const prices = assetsPrices[ticker] || [];
    prices.forEach(p => {
      const ym = p.date.substring(0, 7); // e.g. "2021-05"
      if (!dateMap[ym]) dateMap[ym] = {};

      // We take the last price in the month as the monthly price
      dateMap[ym][ticker] = p.adj_close || p.close;
    });
  });

  // Filter for overlapping months where ALL weighted assets are present
  const sortedMonths = Object.keys(dateMap)
    .filter(ym => tickers.every(t => dateMap[ym][t] !== undefined))
    .sort();

  // Limit window to requested years
  const numMonths = years * 12;
  const startIdx = Math.max(0, sortedMonths.length - numMonths);
  const simulationMonths = sortedMonths.slice(startIdx);

  if (simulationMonths.length === 0) {
    return { timeline: [], finalWealth: 0, totalInvested: 0 };
  }

  // 2. Perform DCA Simulation
  const timeline = [];
  const shares = {};
  tickers.forEach(t => { shares[t] = 0; });
  let totalInvested = 0;

  simulationMonths.forEach((ym, idx) => {
    totalInvested += monthlyAmount;

    // Invest monthly amount split by weights
    tickers.forEach(ticker => {
      const weight = weights[ticker];
      const alloc = monthlyAmount * weight;
      const price = dateMap[ym][ticker];
      shares[ticker] += alloc / price;
    });

    // Compute current portfolio wealth
    let currentWealth = 0;
    tickers.forEach(ticker => {
      const price = dateMap[ym][ticker];
      currentWealth += shares[ticker] * price;
    });

    timeline.push({
      date: ym,
      totalInvested,
      wealth: currentWealth,
    });
  });

  return {
    timeline,
    totalInvested,
    finalWealth: timeline[timeline.length - 1].wealth,
  };
}

export function calculateDcaIrr(totalInvested, finalWealth, monthlyAmount, simulatedMonths) {
  const months = simulatedMonths;
  if (finalWealth <= 0 || totalInvested <= 0 || months <= 0) return 0;

  let low = -0.1; // -10% monthly
  let high = 0.2; // +20% monthly

  for (let iter = 0; iter < 100; iter++) {
    const mid = (low + high) / 2;
    let val = 0;
    if (Math.abs(mid) < 1e-6) {
      val = monthlyAmount * months;
    } else {
      val = monthlyAmount * (Math.pow(1 + mid, months) - 1) / mid;
    }

    if (val > finalWealth) {
      high = mid;
    } else {
      low = mid;
    }
  }

  const monthlyRate = (low + high) / 2;
  const annualizedRate = Math.pow(1 + monthlyRate, 12) - 1;
  return annualizedRate;
}
