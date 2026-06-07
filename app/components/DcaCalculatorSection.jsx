"use client";

import React, { useState, useEffect, useMemo } from "react";
import { calculateDCATimeline } from "../compare/utils/calculations";

const ASSET_OPTIONS = [
  { ticker: "SPY", name: "S&P 500 ETF (SPY)", currency: "USD" },
  { ticker: "QQQ", name: "Nasdaq-100 ETF (QQQ)", currency: "USD" },
  { ticker: "AAPL", name: "Apple Inc. (AAPL)", currency: "USD" },
  { ticker: "NVDA", name: "NVIDIA Corp. (NVDA)", currency: "USD" },
  { ticker: "GC=F", name: "Gold COMEX (GC=F)", currency: "USD" },
  { ticker: "COMI.CA", name: "Commercial International Bank (COMI)", currency: "EGP" },
];

export default function DcaCalculatorSection() {
  const [ticker, setTicker] = useState("SPY");
  const [monthlyDeposit, setMonthlyDeposit] = useState(500);
  const [years, setYears] = useState(5);
  const [currency, setCurrency] = useState("USD");

  const [prices, setPrices] = useState(null);
  const [fxRates, setFxRates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hoverIdx, setHoverIdx] = useState(null);

  const selectedAsset = useMemo(() => ASSET_OPTIONS.find((a) => a.ticker === ticker), [ticker]);

  // Load prices and FX rates when ticker or currency changes
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/investment-story/data/prices/${ticker}.json`).then((r) => {
          if (!r.ok) throw new Error("Price data not found");
          return r.json();
        });
        setPrices(res.prices || []);

        const assetCurrency = selectedAsset?.currency || "USD";
        if (assetCurrency !== currency) {
          const fxRes = await fetch(`/investment-story/data/fx/${assetCurrency}_${currency}.json`).then((r) =>
            r.ok ? r.json() : null
          );
          if (fxRes && fxRes.rates) {
            setFxRates(fxRes.rates);
          } else {
            setFxRates([]);
          }
        } else {
          setFxRates([]);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load historical data for this asset.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [ticker, currency, selectedAsset]);

  // Calculate timeline
  const dcaResult = useMemo(() => {
    if (!prices || prices.length === 0) return null;

    const startLimit = new Date();
    startLimit.setFullYear(startLimit.getFullYear() - years);
    const startLimitStr = startLimit.toISOString().slice(0, 10);

    const sortedPrices = [...prices].sort((a, b) => a.date.localeCompare(b.date));
    const filteredPrices = sortedPrices.filter((p) => p.date >= startLimitStr);
    if (filteredPrices.length === 0) return null;

    const { timeline, totalInvested } = calculateDCATimeline({
      filteredPrices,
      fxRates,
      assetCurrency: selectedAsset?.currency || "USD",
      homeCurrency: currency,
      monthlyDeposit,
    });

    if (timeline.length === 0) return null;

    const finalWealth = timeline[timeline.length - 1].wealth;
    const totalProfit = finalWealth - totalInvested;
    const profitPct = (totalProfit / totalInvested) * 100;

    return {
      timeline,
      totalInvested,
      finalWealth,
      totalProfit,
      profitPct,
    };
  }, [prices, fxRates, selectedAsset, currency, monthlyDeposit, years]);

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
    if (!dcaResult || !dcaResult.timeline.length) return;
    const x = e.clientX - rect.left;
    const totalPct = x / rect.width;
    const chartPct = (totalPct - 0.075) / 0.9;
    const pct = Math.min(1, Math.max(0, chartPct));
    const idx = Math.round(pct * (dcaResult.timeline.length - 1));
    setHoverIdx(idx);
  };

  const hoveredData = dcaResult && hoverIdx !== null ? dcaResult.timeline[hoverIdx] : null;

  return (
    <section id="dca-calculator" className="py-24 bg-slate-50 dark:bg-slate-900/40 relative overflow-hidden border-y border-slate-100 dark:border-slate-800">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 h-[600px] w-[600px] rounded-full bg-gradient-to-tr from-blue-50/50 to-indigo-50/50 blur-3xl opacity-80" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* SECTION HEADER */}
        <div className="text-center sm:text-left mb-10">
          <span className="text-xs sm:text-sm font-semibold tracking-wider text-brand-primary uppercase font-mono">
            Auto Investing
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-3">
            DCA Compounding Calculator
          </h2>
          <p className="mt-3 max-w-2xl text-base text-slate-500 dark:text-slate-400">
            Dollar Cost Averaging (DCA) builds consistent wealth. See how monthly staggered deposits perform historically across major asset classes, accounting for exchange rates.
          </p>

          {/* 3 Small Highlight Cards (Phones only) */}
          <div className="grid grid-cols-3 gap-2 mt-4 sm:hidden">
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100/70 dark:border-blue-900/30 rounded-xl p-2 text-center shadow-sm flex flex-col justify-center min-h-[50px]">
              <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300">Habit Building</span>
            </div>
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100/70 dark:border-blue-900/30 rounded-xl p-2 text-center shadow-sm flex flex-col justify-center min-h-[50px]">
              <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300">Lower Risk</span>
            </div>
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-100/70 dark:border-blue-900/30 rounded-xl p-2 text-center shadow-sm flex flex-col justify-center min-h-[50px]">
              <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300">No Stress</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Controls Panel (4 cols) */}
          <div className="lg:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-premium space-y-5">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">Select Asset</label>
              <select
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                className="w-full h-11 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl px-3 text-sm font-bold focus:border-brand-primary focus:outline-none"
              >
                {ASSET_OPTIONS.map((asset) => (
                  <option key={asset.ticker} value={asset.ticker}>
                    {asset.name}
                  </option>
                ))}
              </select>
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
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">Home Currency</label>
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
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">Period</label>
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

            {/* Simulated outcome details card */}
            {dcaResult && (
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 font-mono text-xs space-y-2.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Invested:</span>
                  <strong className="text-slate-850 dark:text-slate-200">{sym}{Math.round(dcaResult.totalInvested).toLocaleString()}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Portfolio Value:</span>
                  <strong className="text-slate-900 dark:text-white">{sym}{Math.round(dcaResult.finalWealth).toLocaleString()}</strong>
                </div>
                <div className="flex justify-between border-t border-dashed border-slate-200 dark:border-slate-700 pt-2 font-bold text-brand-primary dark:text-blue-400">
                  <span>Net Return:</span>
                  <span>{dcaResult.totalProfit >= 0 ? "+" : ""}{sym}{Math.round(dcaResult.totalProfit).toLocaleString()} ({dcaResult.profitPct.toFixed(1)}%)</span>
                </div>
              </div>
            )}
          </div>

          {/* Graphics Display Panel (8 cols) */}
          <div className="lg:col-span-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-premium relative min-h-[300px] flex flex-col justify-between">
            {loading ? (
              <div className="flex-grow flex flex-col items-center justify-center p-12 text-slate-400 animate-pulse text-xs font-semibold">
                Simulation calculating...
              </div>
            ) : error ? (
              <div className="flex-grow flex items-center justify-center p-12 text-rose-500 text-xs font-bold text-center">
                {error}
              </div>
            ) : dcaResult ? (
              <>
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3 mb-6">
                  <span className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">Historical DCA Growth Path</span>
                  <span className="text-xs font-mono font-bold text-slate-500">
                    Invested: {sym}{Math.round(hoveredData ? hoveredData.totalInvested : dcaResult.totalInvested).toLocaleString()} · Value: {sym}{Math.round(hoveredData ? hoveredData.wealth : dcaResult.finalWealth).toLocaleString()}
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
                      <linearGradient id="gradDcaLanding" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15"/>
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0"/>
                      </linearGradient>
                    </defs>

                    {/* Grid lines */}
                    <line x1="60" y1="200" x2="780" y2="200" stroke="#e2e8f0" strokeWidth="1.5" />
                    <line x1="60" y1="140" x2="780" y2="140" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                    <line x1="60" y1="80"  x2="780" y2="80"  stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                    <line x1="60" y1="20"  x2="780" y2="20"  stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />

                    {(() => {
                      const pointsWealth = [];
                      const pointsInvested = [];
                      const maxDepositLimit = 2000;
                      const scaleFactor = maxDepositLimit / monthlyDeposit;
                      const maxVal = Math.max(dcaResult.finalWealth * scaleFactor, dcaResult.totalInvested * scaleFactor * 1.2, 100);
                      const midVal = maxVal / 2;

                      const scaleY = (val) => {
                        const ratio = val / maxVal;
                        return 200 - ratio * 180;
                      };

                      const stepsCount = dcaResult.timeline.length;

                      dcaResult.timeline.forEach((item, idx) => {
                        const x = 60 + (idx / (stepsCount - 1)) * 720;
                        pointsWealth.push(`${x},${scaleY(item.wealth)}`);
                        pointsInvested.push(`${x},${scaleY(item.totalInvested)}`);
                      });

                      const lineX = hoverIdx !== null ? 60 + (hoverIdx / (stepsCount - 1)) * 720 : null;

                      // Calculate unique years to display at the bottom
                      const yearTicks = [];
                      const yearIndices = new Set();
                      dcaResult.timeline.forEach((item, idx) => {
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

                          <path d={`M 60,200 L ${pointsWealth.join(" L ")} L 780,200 Z`} fill="url(#gradDcaLanding)" />
                          <path d={`M ${pointsInvested.join(" L ")}`} fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 4" strokeLinecap="round" />
                          <path d={`M ${pointsWealth.join(" L ")}`} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />

                          {lineX !== null && hoveredData && (
                            <g>
                              <line x1={lineX} y1="10" x2={lineX} y2="200" stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
                              <circle cx={lineX} cy={scaleY(hoveredData.totalInvested)} r="4" fill="#64748b" stroke="#ffffff" strokeWidth="1.5" />
                              <circle cx={lineX} cy={scaleY(hoveredData.wealth)} r="5" fill="#3b82f6" stroke="#ffffff" strokeWidth="1.5" />
                            </g>
                          )}
                        </>
                      );
                    })()}
                  </svg>

                  {hoveredData && (
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-slate-950/95 backdrop-blur-md text-slate-100 rounded-xl px-4 py-2 text-[10px] shadow-2xl flex gap-3.5 font-mono border border-slate-800 z-10 text-center">
                      <span className="text-slate-400">📅 {hoveredData.date}</span>
                      <span className="text-slate-700">|</span>
                      <span className="text-slate-300 font-bold">Invested: {sym}{Math.round(hoveredData.totalInvested).toLocaleString()}</span>
                      <span className="text-slate-700">|</span>
                      <span className="text-blue-400 font-bold">Portfolio Value: {sym}{Math.round(hoveredData.wealth).toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {/* Beginner friendly summary */}
                <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                  💡 By allocating {sym}{monthlyDeposit} monthly to {ticker} over {years} years, you converted a total contribution of {sym}{Math.round(dcaResult.totalInvested).toLocaleString()} into a portfolio worth {sym}{Math.round(dcaResult.finalWealth).toLocaleString()}, netting a clean {sym}{Math.round(dcaResult.totalProfit).toLocaleString()} profit.
                </div>
              </>
            ) : null}
          </div>

        </div>

      </div>
    </section>
  );
}
