"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  alignAndCalculateReturns,
  computeMetrics,
  optimizePortfolio,
  simulatePortfolioDca,
} from "../optimizer/utils/portfolioCalculations";
import MultiSegmentSlider from "../optimizer/components/MultiSegmentSlider";

const SELECTED_TICKERS = ["SPY", "NVDA", "GLD"];

export default function PortfolioOptimizerSection() {
  const [optGoal, setOptGoal] = useState("CONTROLLED_GROWTH"); // "LOW_RISK", "CONTROLLED_GROWTH", "MAX_RETURN"
  const [monthlyDeposit, setMonthlyDeposit] = useState(500);
  const [currency, setCurrency] = useState("USD");
  const [years, setYears] = useState(5);

  const [pricesMap, setPricesMap] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hoverIdx, setHoverIdx] = useState(null);

  // Load prices on mount
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const tempMap = {};
        await Promise.all(
          SELECTED_TICKERS.map(async (ticker) => {
            const res = await fetch(`/investment-story/data/prices/${ticker}.json`).then((r) => {
              if (!r.ok) throw new Error(`Failed to load ${ticker}`);
              return r.json();
            });
            // Make sure the prices are sorted chronologically
            tempMap[ticker] = (res.prices || []).sort((a, b) => a.date.localeCompare(b.date));
          })
        );
        setPricesMap(tempMap);
      } catch (err) {
        console.error(err);
        setError("Failed to load historical portfolio assets.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Compute optimized weights and simulate trajectory for all modes
  const optimizationResult = useMemo(() => {
    if (!pricesMap) return null;

    try {
      // Find the latest date in the dataset to construct lookback window robustly
      let latestDate = "2026-01-01";
      SELECTED_TICKERS.forEach((ticker) => {
        const prices = pricesMap[ticker] || [];
        if (prices.length > 0) {
          const lastDate = prices[prices.length - 1].date;
          if (lastDate > latestDate) latestDate = lastDate;
        }
      });

      const latestYear = parseInt(latestDate.substring(0, 4), 10);
      const cutoffYear = latestYear - years;
      const cutoffStr = `${cutoffYear}${latestDate.substring(4)}`;

      const filteredPrices = {};
      SELECTED_TICKERS.forEach((ticker) => {
        filteredPrices[ticker] = (pricesMap[ticker] || []).filter(
          (p) => p.date >= cutoffStr
        );
      });

      const aligned = alignAndCalculateReturns(filteredPrices);
      if (aligned.dates.length < 5) return null;

      const { meanReturns, covariance } = computeMetrics(aligned);
      const opts = optimizePortfolio(meanReturns, covariance, SELECTED_TICKERS);

      const goals = ["LOW_RISK", "CONTROLLED_GROWTH", "MAX_RETURN"];
      const res = {};

      goals.forEach((goal) => {
        const weights = opts[goal].weights;
        const { timeline, totalInvested, finalWealth } = simulatePortfolioDca(
          filteredPrices,
          weights,
          monthlyDeposit,
          years
        );
        const profit = finalWealth - totalInvested;
        const actualProfitPct = totalInvested > 0 ? (profit / totalInvested) * 100 : 0;

        res[goal] = {
          weights,
          timeline,
          totalInvested,
          finalWealth,
          profit,
          profitPct: actualProfitPct,
          stats: opts[goal],
        };
      });

      return res;
    } catch (err) {
      console.error(err);
      return null;
    }
  }, [pricesMap, monthlyDeposit, years]);

  const allocationWeights = useMemo(() => {
    const newWeights = {};
    if (optimizationResult && optimizationResult[optGoal]) {
      const weights = optimizationResult[optGoal].weights;
      SELECTED_TICKERS.forEach(t => {
        newWeights[t] = Math.round((weights[t] || 0) * 100);
      });
    }
    return newWeights;
  }, [optimizationResult, optGoal]);

  const getSymbol = () => {
    if (currency === "EUR") return "€";
    if (currency === "GBP") return "£";
    if (currency === "CAD") return "C$";
    if (currency === "EGP") return "E£";
    if (currency === "AED") return "د.إ";
    return "$";
  };

  const sym = getSymbol();

  const handleMouseMove = (e, rect) => {
    if (!optimizationResult || !optimizationResult[optGoal]) return;
    const timeline = optimizationResult[optGoal].timeline;
    if (!timeline || !timeline.length) return;
    const x = e.clientX - rect.left;
    const totalPct = x / rect.width;
    const chartPct = (totalPct - 0.075) / 0.9;
    const pct = Math.min(1, Math.max(0, chartPct));
    const idx = Math.round(pct * (timeline.length - 1));
    setHoverIdx(idx);
  };

  const hoveredData = useMemo(() => {
    if (!optimizationResult || hoverIdx === null) return null;
    const lowT = optimizationResult.LOW_RISK.timeline[hoverIdx];
    const balT = optimizationResult.CONTROLLED_GROWTH.timeline[hoverIdx];
    const maxT = optimizationResult.MAX_RETURN.timeline[hoverIdx];
    if (!lowT || !balT || !maxT) return null;
    return {
      date: lowT.date,
      totalInvested: lowT.totalInvested,
      lowRiskWealth: lowT.wealth,
      balWealth: balT.wealth,
      maxWealth: maxT.wealth,
    };
  }, [optimizationResult, hoverIdx]);

  return (
    <section id="portfolio-optimizer" className="py-24 bg-white dark:bg-slate-950 relative overflow-hidden border-y border-slate-100 dark:border-slate-800">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 h-[600px] w-[600px] rounded-full bg-gradient-to-tr from-violet-50/50 to-indigo-50/50 blur-3xl opacity-80" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* SECTION HEADER */}
        <div className="text-left mb-10">
          <span className="text-xs sm:text-sm font-semibold tracking-wider text-brand-primary uppercase font-mono">
            Asset Allocation
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-3">
            Portfolio Optimization Lab
          </h2>
          <p className="mt-3 max-w-2xl text-base text-slate-500 dark:text-slate-400">
            Compare allocation strategies. Choose between Low Risk, Balanced, and Aggressive profiles to see how a Coordinate Descent optimizer distributes assets.
          </p>

          {/* 3 Small Highlight Cards (Phones only) */}
          <div className="grid grid-cols-3 gap-2 mt-4 sm:hidden">
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100/70 dark:border-blue-900/30 rounded-xl p-2 text-center shadow-sm flex flex-col justify-center min-h-[50px]">
              <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300">Optimal Sharpe</span>
            </div>
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100/70 dark:border-blue-900/30 rounded-xl p-2 text-center shadow-sm flex flex-col justify-center min-h-[50px]">
              <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300">Variance Solver</span>
            </div>
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100/70 dark:border-blue-900/30 rounded-xl p-2 text-center shadow-sm flex flex-col justify-center min-h-[50px]">
              <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300">Auto Weights</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Controls Panel (4 cols) */}
          <div className="lg:col-span-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-premium space-y-5">
            
            {/* Goal Target Tabs */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">Choose Allocation Style</label>
              <div className="grid grid-cols-3 gap-2 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl">
                {[
                  { id: "LOW_RISK", label: "Low Risk" },
                  { id: "CONTROLLED_GROWTH", label: "Balanced" },
                  { id: "MAX_RETURN", label: "Max Return" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setOptGoal(tab.id)}
                    className={`h-9 rounded-lg text-xs font-bold transition-all ${
                      optGoal === tab.id
                        ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">Monthly Deposit</label>
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono font-bold text-slate-500">{sym}</span>
                <input
                  type="number"
                  value={monthlyDeposit}
                  onChange={(e) => setMonthlyDeposit(Math.max(10, Number(e.target.value)))}
                  className="flex-grow h-11 border border-slate-200 dark:border-slate-800 rounded-xl px-3 text-sm font-mono font-bold focus:border-brand-primary focus:outline-none bg-white dark:bg-slate-900"
                />
              </div>
              <input
                type="range"
                min="20"
                max="2000"
                step="10"
                value={monthlyDeposit}
                onChange={(e) => setMonthlyDeposit(Number(e.target.value))}
                className="w-full mt-3 accent-brand-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full h-11 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl px-3 text-sm font-bold focus:border-brand-primary focus:outline-none"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="CAD">CAD (C$)</option>
                  <option value="EGP">EGP (E£)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">DCA Period</label>
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
            </div>
          </div>

          {/* Graphics Display Panel (8 cols) */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-premium relative min-h-[300px] flex flex-col justify-between">
            {loading ? (
              <div className="flex-grow flex flex-col items-center justify-center p-12 text-slate-400 animate-pulse text-xs font-semibold">
                Optimization in progress...
              </div>
            ) : error ? (
              <div className="flex-grow flex items-center justify-center p-12 text-rose-500 text-xs font-bold text-center">
                {error}
              </div>
            ) : optimizationResult ? (
              <>
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3 mb-6">
                  <span className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">Historical Portfolio Growth</span>
                  <span className="text-xs font-mono font-bold text-slate-500">
                    Invested: {sym}{Math.round(hoveredData ? hoveredData.totalInvested : optimizationResult[optGoal].totalInvested).toLocaleString()} · Value: {sym}{Math.round(hoveredData ? (optGoal === "LOW_RISK" ? hoveredData.lowRiskWealth : optGoal === "CONTROLLED_GROWTH" ? hoveredData.balWealth : hoveredData.maxWealth) : optimizationResult[optGoal].finalWealth).toLocaleString()}
                  </span>
                </div>

                {/* SVG Graph */}
                <div
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    handleMouseMove(e, rect);
                  }}
                  onMouseLeave={() => setHoverIdx(null)}
                  className="aspect-[21/8] w-full bg-slate-50/50 dark:bg-slate-950/30 rounded-xl p-4 border border-slate-100 dark:border-slate-850 relative cursor-crosshair overflow-hidden"
                >
                  <svg className="w-full h-full overflow-visible min-h-[200px]" viewBox="0 0 800 240" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="gradLow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.15"/>
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.0"/>
                      </linearGradient>
                      <linearGradient id="gradBal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15"/>
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0"/>
                      </linearGradient>
                      <linearGradient id="gradMax" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.15"/>
                        <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0"/>
                      </linearGradient>
                    </defs>

                    {/* Grid lines */}
                    <line x1="60" y1="200" x2="780" y2="200" stroke="#e2e8f0" strokeWidth="1.5" />
                    <line x1="60" y1="140" x2="780" y2="140" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                    <line x1="60" y1="80"  x2="780" y2="80"  stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                    <line x1="60" y1="20"  x2="780" y2="20"  stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />

                    {(() => {
                      const pointsLow = [];
                      const pointsBal = [];
                      const pointsMax = [];
                      const pointsInvested = [];

                      const maxDepositLimit = 2000;
                      const scaleFactor = maxDepositLimit / monthlyDeposit;
                      const maxVal = Math.max(
                        optimizationResult.MAX_RETURN.finalWealth * scaleFactor,
                        optimizationResult.CONTROLLED_GROWTH.finalWealth * scaleFactor,
                        optimizationResult.LOW_RISK.finalWealth * scaleFactor,
                        optimizationResult.LOW_RISK.totalInvested * scaleFactor * 1.2,
                        100
                      );
                      const midVal = maxVal / 2;

                      const scaleY = (val) => {
                        const ratio = val / maxVal;
                        return 200 - ratio * 180;
                      };

                      const timelineLow = optimizationResult.LOW_RISK.timeline;
                      const timelineBal = optimizationResult.CONTROLLED_GROWTH.timeline;
                      const timelineMax = optimizationResult.MAX_RETURN.timeline;

                      const stepsCount = timelineLow.length;

                      timelineLow.forEach((item, idx) => {
                        const x = 60 + (idx / (stepsCount - 1)) * 720;
                        pointsLow.push(`${x},${scaleY(item.wealth)}`);
                        pointsInvested.push(`${x},${scaleY(item.totalInvested)}`);
                      });

                      timelineBal.forEach((item, idx) => {
                        const x = 60 + (idx / (stepsCount - 1)) * 720;
                        pointsBal.push(`${x},${scaleY(item.wealth)}`);
                      });

                      timelineMax.forEach((item, idx) => {
                        const x = 60 + (idx / (stepsCount - 1)) * 720;
                        pointsMax.push(`${x},${scaleY(item.wealth)}`);
                      });

                      const lineX = hoverIdx !== null ? 60 + (hoverIdx / (stepsCount - 1)) * 720 : null;

                      const yearTicks = [];
                      const yearIndices = new Set();
                      timelineLow.forEach((item, idx) => {
                        const year = item.date.substring(0, 4);
                        if (!yearIndices.has(year)) {
                          yearIndices.add(year);
                          yearTicks.push({
                            year,
                            x: 60 + (idx / (stepsCount - 1)) * 720,
                          });
                        }
                      });

                      return (
                        <>
                          {/* Y-Axis scale numbers */}
                          <text x="10" y="24" className="fill-slate-400 dark:fill-slate-500 font-mono text-[9px] font-bold">
                            {sym}{Math.round(maxVal).toLocaleString()}
                          </text>
                          <text x="10" y="144" className="fill-slate-400 dark:fill-slate-500 font-mono text-[9px] font-bold">
                            {sym}{Math.round(midVal).toLocaleString()}
                          </text>
                          <text x="10" y="204" className="fill-slate-400 dark:fill-slate-500 font-mono text-[9px] font-bold">
                            {sym}0
                          </text>

                          {/* X-Axis year ticks & labels */}
                          {yearTicks.map((tick, idx) => (
                            <g key={idx}>
                              <line x1={tick.x} y1="200" x2={tick.x} y2="205" stroke="#cbd5e1" strokeWidth="1.5" />
                              <text x={tick.x} y="222" textAnchor="middle" className="fill-slate-400 dark:fill-slate-500 font-mono text-[9px] font-bold">
                                {tick.year}
                              </text>
                            </g>
                          ))}

                          {/* Area fills for the selected active curve */}
                          {optGoal === "LOW_RISK" && (
                            <path d={`M 60,200 L ${pointsLow.join(" L ")} L 780,200 Z`} fill="url(#gradLow)" />
                          )}
                          {optGoal === "CONTROLLED_GROWTH" && (
                            <path d={`M 60,200 L ${pointsBal.join(" L ")} L 780,200 Z`} fill="url(#gradBal)" />
                          )}
                          {optGoal === "MAX_RETURN" && (
                            <path d={`M 60,200 L ${pointsMax.join(" L ")} L 780,200 Z`} fill="url(#gradMax)" />
                          )}

                          {/* Invested dashed baseline */}
                          <path d={`M ${pointsInvested.join(" L ")}`} fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 4" strokeLinecap="round" />

                          {/* Three simulation lines */}
                          {/* Low Risk: Green/Emerald */}
                          <path d={`M ${pointsLow.join(" L ")}`} fill="none" stroke="#10b981" strokeWidth={optGoal === "LOW_RISK" ? "3" : "1.5"} opacity={optGoal === "LOW_RISK" ? "1.0" : "0.3"} strokeLinecap="round" />

                          {/* Balanced: Blue */}
                          <path d={`M ${pointsBal.join(" L ")}`} fill="none" stroke="#3b82f6" strokeWidth={optGoal === "CONTROLLED_GROWTH" ? "3" : "1.5"} opacity={optGoal === "CONTROLLED_GROWTH" ? "1.0" : "0.3"} strokeLinecap="round" />

                          {/* Max Return: Red/Rose */}
                          <path d={`M ${pointsMax.join(" L ")}`} fill="none" stroke="#f43f5e" strokeWidth={optGoal === "MAX_RETURN" ? "3" : "1.5"} opacity={optGoal === "MAX_RETURN" ? "1.0" : "0.3"} strokeLinecap="round" />

                          {lineX !== null && hoveredData && (
                            <g>
                              <line x1={lineX} y1="10" x2={lineX} y2="200" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
                              <circle cx={lineX} cy={scaleY(hoveredData.totalInvested)} r="4" fill="#64748b" stroke="#ffffff" strokeWidth="1.5" />
                              <circle cx={lineX} cy={scaleY(hoveredData.lowRiskWealth)} r="5" fill="#10b981" stroke="#ffffff" strokeWidth="1.5" />
                              <circle cx={lineX} cy={scaleY(hoveredData.balWealth)} r="5" fill="#3b82f6" stroke="#ffffff" strokeWidth="1.5" />
                              <circle cx={lineX} cy={scaleY(hoveredData.maxWealth)} r="5" fill="#f43f5e" stroke="#ffffff" strokeWidth="1.5" />
                            </g>
                          )}
                        </>
                      );
                    })()}
                  </svg>

                  {hoveredData && (
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-slate-950/95 backdrop-blur-md text-slate-100 rounded-xl px-4 py-2 text-[10px] shadow-2xl flex flex-wrap justify-center items-center gap-x-3.5 gap-y-1 font-mono border border-slate-800 z-10 text-center w-[90%] sm:w-auto">
                      <span className="text-slate-400">📅 {hoveredData.date}</span>
                      <span className="text-slate-700">|</span>
                      <span className="text-slate-350 font-bold">Invested: {sym}{Math.round(hoveredData.totalInvested).toLocaleString()}</span>
                      <span className="text-slate-700">|</span>
                      <span className="text-emerald-400 font-bold">Risk{optGoal === "LOW_RISK" ? "●" : ""}: {sym}{Math.round(hoveredData.lowRiskWealth).toLocaleString()}</span>
                      <span className="text-slate-700">|</span>
                      <span className="text-blue-400 font-bold">Balanced{optGoal === "CONTROLLED_GROWTH" ? "●" : ""}: {sym}{Math.round(hoveredData.balWealth).toLocaleString()}</span>
                      <span className="text-slate-700">|</span>
                      <span className="text-rose-400 font-bold">Max Return{optGoal === "MAX_RETURN" ? "●" : ""}: {sym}{Math.round(hoveredData.maxWealth).toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {/* Beginner friendly summary */}
                <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                  💡 A monthly deposit of {sym}{monthlyDeposit} evaluated over {years} years yields {sym}{Math.round(optimizationResult[optGoal].finalWealth).toLocaleString()} on a total investment of {sym}{Math.round(optimizationResult[optGoal].totalInvested).toLocaleString()} for the selected goal. Sharpe Ratio optimization allocates weights for a net return of +{optimizationResult[optGoal].profitPct.toFixed(1)}%.
                </div>
              </>
            ) : null}
          </div>

        </div>

        {/* Interactive Weight Allocation Slider */}
        {optimizationResult && optimizationResult[optGoal] && (
          <div className="mt-6 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-premium">
            <span className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider block mb-3">
              Allocation Split — {optGoal === "LOW_RISK" ? "Low Risk" : optGoal === "CONTROLLED_GROWTH" ? "Balanced" : "Max Return"}
            </span>
            <MultiSegmentSlider
              selectedTickers={SELECTED_TICKERS}
              customWeights={allocationWeights}
            />
          </div>
        )}

      </div>
    </section>
  );
}
