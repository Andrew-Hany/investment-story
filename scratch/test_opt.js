import { optimizePortfolio } from '../app/optimizer/utils/portfolioCalculations.js';

const meanReturns = {
  SPY: 0.12,
  NVDA: 0.35,
  GLD: 0.06
};

const covariance = [
  [0.0225, 0.015, 0.001],
  [0.015, 0.09, -0.002],
  [0.001, -0.002, 0.01]
];

const tickers = ["SPY", "NVDA", "GLD"];

console.log(JSON.stringify(optimizePortfolio(meanReturns, covariance, tickers), null, 2));
