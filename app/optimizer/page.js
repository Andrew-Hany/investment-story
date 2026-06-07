"use client";

import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { load_prices } from "../../lib/analysis_engine/data_access/public_data";
import tickersData from "../../public/data/tickers.json";
import availableTickers from "../../public/data/available_tickers.json";
import {
  alignAndCalculateReturns,
  computeMetrics,
  optimizePortfolio,
  getPortfolioStats,
  simulatePortfolioDca,
  calculateDcaIrr
} from "./utils/portfolioCalculations";
import AllocationDonut from "./components/AllocationDonut";
import PortfolioGrowthChart from "./components/PortfolioGrowthChart";
import MetricsCard from "./components/MetricsCard";
import MultiSegmentSlider from "./components/MultiSegmentSlider";

const ASSET_PRESETS = {
  highRisk: [
    { ticker: "NVDA", name: "NVIDIA Corp." },
    { ticker: "TSLA", name: "Tesla Inc." },
    { ticker: "AMD", name: "Advanced Micro Devices" },
    { ticker: "PLTR", name: "Palantir Technologies" },
  ],
  etf: [
    { ticker: "SPY", name: "SPDR S&P 500 ETF" },
    { ticker: "QQQ", name: "Invesco QQQ Trust" },
    { ticker: "^CASE30", name: "EGX 30 Index" },
  ],
  gold: [
    { ticker: "GLD", name: "SPDR Gold Shares" },
  ],
};

export default function OptimizerPage() {
  const [selectedTickers, setSelectedTickers] = useState(["SPY", "NVDA", "GLD"]);
  const [optGoal, setOptGoal] = useState("CONTROLLED_GROWTH"); // default to CONTROLLED_GROWTH
  const [customWeights, setCustomWeights] = useState({ SPY: 75, NVDA: 10, GLD: 15 });
  const [monthlyAmount, setMonthlyAmount] = useState(500);
  const [currency, setCurrency] = useState("USD");
  const [years, setYears] = useState(5);

  // Custom search state
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);

  const handleSearchChange = (query) => {
    setSearchQuery(query);
    const EXCLUDED = ["SPY", "QQQ", "^CASE30", "GLD"];
    const singleStocks = availableTickers.filter(t => !EXCLUDED.includes(t.ticker.toUpperCase()));

    if (!query.trim()) {
      setSuggestions(singleStocks);
      return;
    }
    const filtered = singleStocks.filter(t =>
      t.ticker.toLowerCase().includes(query.toLowerCase()) ||
      t.name.toLowerCase().includes(query.toLowerCase())
    );
    setSuggestions(filtered);
  };

  const handleSearchFocus = () => {
    const EXCLUDED = ["SPY", "QQQ", "^CASE30", "GLD"];
    const singleStocks = availableTickers.filter(t => !EXCLUDED.includes(t.ticker.toUpperCase()));
    if (!searchQuery.trim()) {
      setSuggestions(singleStocks);
    } else {
      handleSearchChange(searchQuery);
    }
  };

  const handleAddTicker = (ticker) => {
    if (!selectedTickers.includes(ticker)) {
      setSelectedTickers([...selectedTickers, ticker]);
    }
    setSearchQuery("");
    setSuggestions([]);
  };

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  // Auto-adjust custom weights when tickers change to match Controlled Growth profile
  useEffect(() => {
    const HIGH_RISK = ["NVDA", "TSLA", "AMD", "PLTR", "COIN", "MSTR"];
    const GOLD = ["GLD"];
    const ETF = ["SPY", "QQQ", "^CASE30"];

    const etfs = selectedTickers.filter(t => ETF.includes(t));
    const golds = selectedTickers.filter(t => GOLD.includes(t));
    const risks = selectedTickers.filter(t => HIGH_RISK.includes(t));
    const others = selectedTickers.filter(t => !ETF.includes(t) && !GOLD.includes(t) && !HIGH_RISK.includes(t));

    // Target weights: Gold (15%), High Risk (10%), Others (10%), ETFs gets remaining (65%+)
    let goldAlloc = golds.length > 0 ? 15 : 0;
    let riskAlloc = risks.length > 0 ? 10 : 0;
    let otherAlloc = others.length > 0 ? 10 : 0;
    let etfAlloc = 100 - goldAlloc - riskAlloc - otherAlloc;

    const updated = {};

    if (etfs.length > 0) {
      const share = Math.floor(etfAlloc / etfs.length);
      etfs.forEach((t, i) => {
        updated[t] = i === etfs.length - 1 ? etfAlloc - share * (etfs.length - 1) : share;
      });
    } else {
      const extra = etfAlloc;
      const activeCats = (golds.length > 0 ? 1 : 0) + (risks.length > 0 ? 1 : 0) + (others.length > 0 ? 1 : 0);
      if (activeCats > 0) {
        const catShare = extra / activeCats;
        if (golds.length > 0) goldAlloc += catShare;
        if (risks.length > 0) riskAlloc += catShare;
        if (others.length > 0) otherAlloc += catShare;
      }
    }

    if (golds.length > 0) {
      const share = Math.floor(goldAlloc / golds.length);
      golds.forEach((t, i) => {
        updated[t] = i === golds.length - 1 ? goldAlloc - share * (golds.length - 1) : share;
      });
    }
    if (risks.length > 0) {
      const share = Math.floor(riskAlloc / risks.length);
      risks.forEach((t, i) => {
        updated[t] = i === risks.length - 1 ? riskAlloc - share * (risks.length - 1) : share;
      });
    }
    if (others.length > 0) {
      const share = Math.floor(otherAlloc / others.length);
      others.forEach((t, i) => {
        updated[t] = i === others.length - 1 ? otherAlloc - share * (others.length - 1) : share;
      });
    }

    setCustomWeights(updated);
  }, [selectedTickers]);

  // Run simulation automatically when selected options change
  useEffect(() => {
    handleSimulate();
  }, [selectedTickers, optGoal, years, monthlyAmount, currency]);

  const toggleTicker = (ticker) => {
    if (selectedTickers.includes(ticker)) {
      if (selectedTickers.length <= 1) {
        setError("Please select at least one asset.");
        return;
      }
      setSelectedTickers(selectedTickers.filter(t => t !== ticker));
    } else {
      setSelectedTickers([...selectedTickers, ticker]);
    }
    setError(null);
  };

  const handleSliderChange = (targetTicker, newValue) => {
    const val = Number(newValue);

    if (selectedTickers.length === 1) {
      setCustomWeights({ [targetTicker]: 100 });
      setOptGoal("custom");
      return;
    }

    const otherTickers = selectedTickers.filter(t => t !== targetTicker);
    const otherSum = otherTickers.reduce((sum, t) => sum + (customWeights[t] || 0), 0);

    const updated = { ...customWeights };
    updated[targetTicker] = val;

    const remaining = 100 - val;

    if (otherSum > 0) {
      let distributed = 0;
      otherTickers.forEach((t, idx) => {
        if (idx === otherTickers.length - 1) {
          updated[t] = remaining - distributed;
        } else {
          const share = Math.round(((customWeights[t] || 0) / otherSum) * remaining);
          updated[t] = share;
          distributed += share;
        }
      });
    } else {
      const share = Math.floor(remaining / otherTickers.length);
      otherTickers.forEach((t, idx) => {
        if (idx === otherTickers.length - 1) {
          updated[t] = remaining - share * (otherTickers.length - 1);
        } else {
          updated[t] = share;
        }
      });
    }

    setCustomWeights(updated);
    setOptGoal("custom");
  };

  const handleSimulate = async () => {
    if (selectedTickers.length < 1) {
      setError("Please select at least one asset.");
      return;
    }

    if (optGoal === "custom") {
      const sum = Object.values(customWeights).reduce((a, b) => a + b, 0);
      if (Math.abs(sum - 100) > 0.01) {
        setError(`Custom weights must sum to 100%. Current sum: ${sum}%`);
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Fetch prices in parallel
      const pricesMap = {};
      await Promise.all(
        selectedTickers.map(async (ticker) => {
          const prices = await load_prices(ticker);
          if (!prices || prices.length === 0) {
            throw new Error(`Failed to load historical prices for ${ticker}`);
          }
          pricesMap[ticker] = prices;
        })
      );

      // 2. Perform overlapping alignment
      const aligned = alignAndCalculateReturns(pricesMap);
      if (aligned.dates.length < 5) {
        throw new Error("Insufficient overlapping historical data among selected assets.");
      }

      // Compute actual analyzed window for user transparency
      const analyzedStartDate = aligned.dates[0];
      const analyzedEndDate = aligned.dates[aligned.dates.length - 1];
      const analyzedMonths = Math.round(aligned.dates.length / 21); // ~21 trading days per month
      const requestedMonths = years * 12;

      // 3. Compute returns & covariance matrix
      const { meanReturns, volatilities, covariance } = computeMetrics(aligned);

      // 4. Run Optimization Engine
      const opts = optimizePortfolio(meanReturns, covariance, selectedTickers);

      // Determine final weights
      let finalWeights = {};
      let finalLoss = 0;
      if (optGoal === "custom") {
        selectedTickers.forEach(t => {
          finalWeights[t] = (customWeights[t] || 0) / 100;
        });
      } else {
        finalWeights = opts[optGoal].weights;
        finalLoss = opts[optGoal].loss;
        // Populate inputs with the calculated weights so they are visible
        const updatedWeights = {};
        selectedTickers.forEach(t => {
          updatedWeights[t] = Math.round(finalWeights[t] * 100);
        });
        setCustomWeights(updatedWeights);
      }

      // 5. Calculate statistics for selected weights (sorting alphabetically to match covariance matrix)
      const sortedTickersForStats = [...selectedTickers].sort();
      const wArray = sortedTickersForStats.map(t => finalWeights[t]);
      const { pReturn, pVolatility } = getPortfolioStats(wArray, meanReturns, covariance, sortedTickersForStats);

      // 6. Run Portfolio DCA compounding simulation
      const { timeline, totalInvested, finalWealth } = simulatePortfolioDca(
        pricesMap,
        finalWeights,
        monthlyAmount,
        years
      );

      const dcaIrr = calculateDcaIrr(totalInvested, finalWealth, monthlyAmount, timeline.length);

      setResult({
        weights: finalWeights,
        pReturn: dcaIrr,
        pVolatility,
        totalGainNominal: finalWealth - totalInvested,
        totalGainPct: ((finalWealth - totalInvested) / totalInvested) * 100,
        timeline,
        loss: finalLoss,
        categoryWeights: optGoal === "custom" ? null : opts[optGoal].categoryWeights,
        analyzedStartDate,
        analyzedEndDate,
        analyzedMonths,
        requestedMonths,
      });

    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to run optimization simulation.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f8fafc] dark:bg-background font-sans antialiased text-slate-900 dark:text-slate-50 grid-pattern">
      <Header />

      <main className="flex-grow max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 text-left">

        {/* Title */}
        <div className="mb-10 text-center sm:text-left">
          <span className="text-xs font-bold tracking-wider text-brand-primary uppercase font-mono">
            Portfolio Allocation & MVO Lab
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight mt-1">
            Portfolio Optimizer
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Build and optimize portfolios between high risk assets, index funds, and gold using historical metrics.
          </p>
        </div>

        {/* Setup Config Card */}
        <div className="bg-white dark:bg-slate-900 border border-glass-border rounded-2xl p-6 shadow-premium mb-8">
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 font-mono mb-4 uppercase tracking-wider">
            1. Select Assets & Parameters
          </h3>

          <div className="space-y-6">
            {/* Presets / Assets selection */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* High risk presets */}
              <div className="border border-rose-200/50 dark:border-rose-900/30 rounded-xl p-4 bg-rose-50/30 dark:bg-rose-950/10">
                <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider block font-mono mb-3">
                  High Risk Growth Stocks
                </span>
                <div className="space-y-2">
                  {ASSET_PRESETS.highRisk.map(asset => (
                    <label key={asset.ticker} className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={selectedTickers.includes(asset.ticker)}
                        onChange={() => toggleTicker(asset.ticker)}
                        className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-brand-primary focus:ring-brand-primary"
                      />
                      <span>{asset.ticker} <span className="text-[10px] text-slate-400 font-normal">({asset.name})</span></span>
                    </label>
                  ))}
                </div>
              </div>

              {/* ETF presets */}
              <div className="border border-slate-100 dark:border-slate-800 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-950/20">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block font-mono mb-3">
                  Broad Market ETFs
                </span>
                <div className="space-y-2">
                  {ASSET_PRESETS.etf.map(asset => (
                    <label key={asset.ticker} className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={selectedTickers.includes(asset.ticker)}
                        onChange={() => toggleTicker(asset.ticker)}
                        className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-brand-primary focus:ring-brand-primary"
                      />
                      <span>{asset.ticker} <span className="text-[10px] text-slate-400 font-normal">({asset.name})</span></span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Gold presets */}
              <div className="border border-amber-200/50 dark:border-amber-900/30 rounded-xl p-4 bg-amber-50/30 dark:bg-amber-950/10">
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider block font-mono mb-3">
                  Gold Safe Haven
                </span>
                <div className="space-y-2">
                  {ASSET_PRESETS.gold.map(asset => (
                    <label key={asset.ticker} className="flex items-center gap-2.5 cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300">
                      <input
                        type="checkbox"
                        checked={selectedTickers.includes(asset.ticker)}
                        onChange={() => toggleTicker(asset.ticker)}
                        className="h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-brand-primary focus:ring-brand-primary"
                      />
                      <span>{asset.ticker} <span className="text-[10px] text-slate-400 font-normal">({asset.name})</span></span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Custom stock / ETF search input */}
            <div className="relative border border-slate-100 dark:border-slate-800 rounded-xl p-4 bg-slate-50/20 dark:bg-slate-950/10 text-left">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block font-mono mb-2">
                🔍 Add Custom Stock or ETF from Database
              </span>
              <div className="relative max-w-md">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={handleSearchFocus}
                  onBlur={() => setTimeout(() => setSuggestions([]), 250)}
                  placeholder="Click to browse or search from 500+ assets..."
                  className="w-full h-10 border border-slate-200 dark:border-slate-800 rounded-lg pl-3 pr-10 text-xs focus:border-brand-primary focus:outline-none bg-white dark:bg-slate-900 cursor-pointer"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-lg shadow-lg z-20 overflow-y-auto max-h-60">
                    {suggestions.map(s => (
                      <button
                        key={s.ticker}
                        onClick={() => handleAddTicker(s.ticker)}
                        className="w-full px-4 py-2 text-left text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-850 last:border-0 flex justify-between items-center"
                      >
                        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">{s.ticker}</span>
                        <span className="text-slate-400 font-normal truncate max-w-[240px]">{s.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Custom Added Assets tags */}
            {selectedTickers.filter(t =>
              !ASSET_PRESETS.highRisk.some(a => a.ticker === t) &&
              !ASSET_PRESETS.etf.some(a => a.ticker === t) &&
              !ASSET_PRESETS.gold.some(a => a.ticker === t)
            ).length > 0 && (
                <div className="border border-brand-primary/10 rounded-xl p-4 bg-brand-primary/5 text-left">
                  <span className="text-[10px] font-bold text-brand-primary uppercase tracking-wider block font-mono mb-3">
                    Custom Added Assets
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {selectedTickers.filter(t =>
                      !ASSET_PRESETS.highRisk.some(a => a.ticker === t) &&
                      !ASSET_PRESETS.etf.some(a => a.ticker === t) &&
                      !ASSET_PRESETS.gold.some(a => a.ticker === t)
                    ).map(ticker => {
                      const details = availableTickers.find(x => x.ticker === ticker);
                      return (
                        <div key={ticker} className="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold shadow-sm">
                          <span className="font-mono">{ticker}</span>
                          <span className="text-[9px] text-slate-400 font-normal">({details?.name || 'Stock'})</span>
                          <button
                            onClick={() => toggleTicker(ticker)}
                            className="text-slate-400 hover:text-rose-500 font-bold ml-1"
                            title="Remove custom asset"
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

            {/* Inputs controls */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-end">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 font-mono">Monthly Deposit</label>
                <input
                  type="number"
                  value={monthlyAmount}
                  onChange={(e) => setMonthlyAmount(Number(e.target.value))}
                  className="w-full h-11 border border-slate-200 dark:border-slate-800 rounded-xl px-3 text-sm font-mono font-bold focus:border-brand-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 font-mono">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full h-11 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl px-3 text-sm font-bold focus:border-brand-primary focus:outline-none"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="CAD">CAD (C$)</option>
                  <option value="EGP">EGP (E£)</option>
                  <option value="AED">AED (د.إ)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 font-mono">DCA Period</label>
                <select
                  value={years}
                  onChange={(e) => setYears(Number(e.target.value))}
                  className="w-full h-11 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl px-3 text-sm font-bold focus:border-brand-primary focus:outline-none"
                >
                  <option value={1}>1 Year</option>
                  <option value={3}>3 Years</option>
                  <option value={5}>5 Years</option>
                  <option value={10}>10 Years</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 font-mono">Optimization Target</label>
                <select
                  value={optGoal}
                  onChange={(e) => setOptGoal(e.target.value)}
                  className="w-full h-11 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl px-3 text-sm font-bold focus:border-brand-primary focus:outline-none"
                >
                  <option value="CONTROLLED_GROWTH">Controlled Growth</option>
                  <option value="MAX_RETURN">Max Return</option>
                  <option value="LOW_RISK">Low Risk</option>
                  <option value="equal">Equal Allocation</option>
                  {optGoal === "custom" && (
                    <option value="custom" disabled>Custom Allocation (Manual)</option>
                  )}
                </select>
              </div>

              <div className="col-span-2 md:col-span-1">
                <button
                  onClick={handleSimulate}
                  disabled={loading}
                  className="w-full h-11 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-sm font-bold transition-all shadow-md disabled:opacity-50"
                >
                  {loading ? "Working..." : "Optimize & Run"}
                </button>
              </div>
            </div>

            {/* Allocation weights controls */}
            <div className="border border-slate-100 dark:border-slate-800 rounded-xl p-5 bg-slate-50/50 dark:bg-slate-950/20 text-left animate-fadeIn">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block font-mono mb-4">
                ⚙️ Drag segments to adjust weights — Sum: 100%
              </span>
              <MultiSegmentSlider
                selectedTickers={selectedTickers}
                customWeights={customWeights}
                onChange={(updated) => {
                  setCustomWeights(updated);
                  setOptGoal("custom");
                }}
              />
            </div>
          </div>
        </div>

        {/* Rules & Logic Explanation */}
        <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-6 mb-8 text-left">
          <details className="group">
            <summary className="flex items-center justify-between cursor-pointer list-none">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 font-mono uppercase tracking-wider flex items-center gap-2">
                <span>📘 How The Optimization Rules Are Built</span>
              </h3>
              <span className="text-xs text-brand-primary font-mono group-open:hidden">Show Details →</span>
              <span className="text-xs text-brand-primary font-mono hidden group-open:inline">Hide Details ←</span>
            </summary>

            <div className="mt-4 pt-4 border-t border-slate-200/50 dark:border-slate-800/50 space-y-6 text-xs text-slate-600 dark:text-slate-400">
              <p>
                The optimizer runs a deterministic <strong>Coordinate Descent Solver</strong> to minimize a custom <strong>Loss Function</strong>.
                Instead of using random configurations, the algorithm systematically shifts weights to find the portfolio with the absolute minimum loss.
              </p>

              <div className="bg-white dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-900 font-mono text-[11px] leading-relaxed">
                <span className="text-brand-primary font-bold"># General Loss Formula</span><br />
                loss = <br />
                &nbsp;&nbsp;&nbsp;&nbsp;- ReturnWeight * expectedReturn<br />
                &nbsp;&nbsp;&nbsp;&nbsp;+ RiskWeight * portfolioVariance<br />
                &nbsp;&nbsp;&nbsp;&nbsp;+ ConcentrationWeight * sum(weight_i ** 2)<br />
                &nbsp;&nbsp;&nbsp;&nbsp;+ ETF_Penalty * max(0, 0.40 - etfWeight) ** 2<br />
                &nbsp;&nbsp;&nbsp;&nbsp;+ Gold_Penalty * max(0, goldWeight - 0.20) ** 2<br />
                &nbsp;&nbsp;&nbsp;&nbsp;+ HighRisk_Penalty * max(0, highRiskWeight - 0.20) ** 2
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
                <div className="space-y-2">
                  <span className="font-bold text-slate-800 dark:text-slate-200 font-mono text-[11px] uppercase tracking-wider block">🛡️ LOW RISK MODE</span>
                  <p>
                    Goal is to minimize volatility and speculative exposures.
                  </p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li><strong>Risk Penalty (15.0)</strong>: Dominates the calculation to keep variance near zero.</li>
                    <li><strong>High-Risk Penalty (15.0)</strong>: Heavily penalizes speculative stocks exceeding 20%.</li>
                    <li><strong>Diversification Rule (2.0)</strong>: Forces weights to distribute widely, avoiding single-asset concentration.</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <span className="font-bold text-slate-800 dark:text-slate-200 font-mono text-[11px] uppercase tracking-wider block">🚀 MAX RETURN MODE</span>
                  <p>
                    Goal is to maximize raw compounding return.
                  </p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li><strong>Return Reward (15.0)</strong>: Strongly rewards historical expected performance.</li>
                    <li><strong>Risk Penalty (0.5)</strong>: Minimal weight on variance.</li>
                    <li><strong>Concentration Rule (0.5)</strong>: Minor penalty preventing the algorithm from putting 100% in a single high-performer.</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <span className="font-bold text-slate-800 dark:text-slate-200 font-mono text-[11px] uppercase tracking-wider block">⚖️ CONTROLLED GROWTH MODE</span>
                  <p>
                    Goal is balanced risk-adjusted growth matching classic allocation boundaries.
                  </p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li><strong>Balance (3.0 Return / 3.0 Risk)</strong>: Targets optimal Sharpe ratio performance.</li>
                    <li><strong>ETF Rule (40.0 Penalty)</strong>: Encourages ETFs (e.g. SPY, QQQ) to make up at least 40% of the portfolio.</li>
                    <li><strong>Gold Cap (20.0 Penalty)</strong>: Penalizes Gold holdings exceeding 20%.</li>
                    <li><strong>Spec Growth Cap (40.0 Penalty & Hard Limit)</strong>: Penalizes and hard-caps speculative growth stocks at exactly 20.0% weight.</li>
                    <li><strong>Diversification (1.5 Weight)</strong>: Encourages asset weights to distribute dynamically.</li>
                  </ul>
                </div>
              </div>
            </div>
          </details>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl mb-8 font-medium">
            ⚠️ Error: {error}
          </div>
        )}

        {/* Simulation Output */}
        {result && !loading && (
          <div className="space-y-8 animate-fadeIn">
            {/* Visual Header / Summary block */}
            <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 font-mono uppercase tracking-wide">
                2. Optimized Portfolio Outcome
              </h2>
            </div>

            {/* Data window warning — shown when overlap is shorter than requested */}
            {result.analyzedMonths < result.requestedMonths && (
              <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl text-xs text-amber-800 dark:text-amber-300 font-medium">
                <span className="text-base leading-none mt-0.5">⚠️</span>
                <div>
                  <span className="font-bold">Shorter analysis window applied.</span>{" "}
                  You requested <strong>{years} years</strong>, but one or more selected assets only have data from{" "}
                  <strong>{result.analyzedStartDate}</strong>. All assets were evaluated over the same overlapping period:{" "}
                  <strong>{result.analyzedStartDate} → {result.analyzedEndDate}</strong>{" "}
                  (~{Math.round(result.analyzedMonths / 12 * 10) / 10} years). Annualized returns and volatility reflect this window only.
                </div>
              </div>
            )}

            {/* Metrics cards */}
            <MetricsCard
              pReturn={result.pReturn}
              pVolatility={result.pVolatility}
              totalGainNominal={result.totalGainNominal}
              totalGainPct={result.totalGainPct}
              currency={currency}
            />

            {/* Allocation & Trajectory side-by-side */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <AllocationDonut weights={result.weights} />
              </div>
              <div className="lg:col-span-2">
                <PortfolioGrowthChart timeline={result.timeline} currency={currency} />
              </div>
            </div>
          </div>
        )}

      </main>

      <Footer />
    </div>
  );
}
