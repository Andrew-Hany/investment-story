"use client";

import React, { useState, useRef } from "react";
import { useTheme } from "../../context/ThemeContext";

export default function MonthlyGrowthChart({ result, currency, monthlyAmount, years, mode, setMode }) {
  const { dark } = useTheme();
  const [hoverIdx, setHoverIdx] = useState(null);
  const mainChartRef = useRef(null);

  if (!result) return null;

  const timeline = result.timeline;
  const finalInvested = result.totalInvested;
  const finalValue = result.finalWealth;
  const ticker = result.ticker;

  // Rate sparkline scale calculations
  const rates = timeline.map(item => item.annualRate || 0);
  const maxRate = Math.max(...rates, 0);
  const minRate = Math.min(...rates, 0);
  const rateRange = (maxRate - minRate) || 1;

  const scaleRateY = (val) => 35 - ((val - minRate) / rateRange) * 28;
  const scaleX = (idx) => 80 + (idx / (timeline.length - 1)) * 700;

  const getSymbol = () => {
    if (currency === "EUR") return "€";
    if (currency === "GBP") return "£";
    if (currency === "CAD") return "C$";
    if (currency === "EGP") return "E£";
    if (currency === "AED") return "د.إ";
    return "$";
  };

  const formatCompactMoney = (value) => {
    const absValue = Math.abs(value || 0);
    if (absValue >= 1_000_000) return `${getSymbol()}${(value / 1_000_000).toFixed(absValue >= 10_000_000 ? 1 : 2)}M`;
    if (absValue >= 1_000) return `${getSymbol()}${(value / 1_000).toFixed(absValue >= 100_000 ? 0 : 1)}K`;
    return `${getSymbol()}${Math.round(value || 0).toLocaleString()}`;
  };

  const handleMainMouseMove = (e) => {
    if (!timeline.length || !mainChartRef.current) return;
    const rect = mainChartRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.min(1, Math.max(0, x / rect.width));
    const idx = Math.round(pct * (timeline.length - 1));
    setHoverIdx(idx);
  };

  const hoveredData = hoverIdx !== null ? timeline[hoverIdx] : null;

  return (
    <div className="space-y-8 animate-fadeIn text-left">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-brand-primary font-mono">
            DCA Tracker
          </span>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-2">
            The Compounding Effect
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Historical Trajectory: Visualizing your consistent monthly deposits versus the actual market value of your portfolio.
          </p>
        </div>

        {/* View Toggle Buttons */}
        {setMode && (
          <div className="flex gap-1.5 bg-slate-100 dark:bg-slate-900/50 p-1 rounded-xl border border-slate-200/40 self-start sm:self-center">
            <button
              onClick={() => setMode("past")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono whitespace-nowrap transition-all ${
                mode === "past"
                  ? "bg-white dark:bg-slate-800 text-brand-primary shadow-sm border border-slate-200/20"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              Past Performance
            </button>
            <button
              onClick={() => setMode("future")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono whitespace-nowrap transition-all ${
                mode === "future"
                  ? "bg-white dark:bg-slate-800 text-brand-primary shadow-sm border border-slate-200/20"
                  : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              Future Projection
            </button>
          </div>
        )}
      </div>

      <div className="bg-white border border-glass-border rounded-2xl p-6 shadow-premium relative">
        <div className="mb-3">
          <span className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">Compounding Results</span>
        </div>
        <div className="flex flex-col sm:flex-row justify-start items-start sm:items-center border-b border-slate-100 pb-3 mb-6 gap-2">
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono">
            {/* Cash Deposited */}
            <div className="flex flex-col items-start">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-sans">Cash Deposited</span>
              <span className="text-lg font-bold text-slate-600 dark:text-slate-400">
                {formatCompactMoney(finalInvested)}
              </span>
            </div>

            {/* Plus sign */}
            <span className="text-slate-400 font-bold text-lg px-1 self-end mb-0.5">+</span>

            {/* Compounding Return */}
            <div className="flex flex-col items-start">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-sans">Compounding Growth</span>
              <span className="text-lg font-bold text-brand-primary bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 rounded-md">
                +{formatCompactMoney(finalValue - finalInvested)}
                <span className="text-xs font-semibold ml-1.5 opacity-90">
                  (+{((finalValue - finalInvested) / finalInvested * 100).toFixed(1)}% total
                  <span className="mx-1 opacity-50">|</span>
                  {(result.annualAssetRate ?? result.annualRate) >= 0 ? "+" : ""}{(result.annualAssetRate ?? result.annualRate).toFixed(1)}% stock<span className="ml-0.5 text-[9px] font-bold tracking-wide opacity-60 align-super">annualized</span>
                  {typeof result.annualFxImpact === "number" && Math.abs(result.annualFxImpact) >= 0.05 && (
                    <>
                      <span className="mx-1 opacity-50">|</span>
                      {result.annualFxImpact >= 0 ? "+" : ""}{result.annualFxImpact.toFixed(1)}% FX<span className="ml-0.5 text-[9px] font-bold tracking-wide opacity-60 align-super">annualized</span>
                    </>
                  )}
                  )
                </span>
              </span>
            </div>

            {/* Arrow */}
            <span className="text-slate-400 font-bold text-lg px-2 self-end mb-0.5">→</span>

            {/* Total Value */}
            <div className="flex flex-col items-start">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-sans">Total Portfolio</span>
              <span className="text-2xl font-black text-slate-900 dark:text-slate-50">
                {formatCompactMoney(finalValue)}
              </span>
            </div>
          </div>
        </div>


        <div 
          ref={mainChartRef}
          onMouseMove={handleMainMouseMove}
          onMouseLeave={() => setHoverIdx(null)}
          className="aspect-[21/8] w-full bg-slate-50/50 rounded-xl p-4 border border-slate-100 relative cursor-crosshair overflow-hidden"
          style={dark ? { backgroundColor: "#0f172a", borderColor: "rgba(255,255,255,0.07)" } : {}}
        >
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex flex-row gap-4 items-center bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm px-4 py-2 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-md pointer-events-none font-mono text-[10px] sm:text-xs whitespace-nowrap">
            {hoveredData && (
              <>
                <span className="text-slate-500 font-bold bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-[9px] uppercase tracking-wide">
                  📅 {hoveredData.date}
                </span>
                <span className="h-6 w-[1px] bg-slate-200 dark:bg-slate-700" />
              </>
            )}
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded bg-brand-primary shrink-0" />
              <div className="flex flex-col text-left">
                <span className="text-[10px] text-slate-500 font-semibold leading-tight">{ticker} Portfolio</span>
                <span className="text-xs font-extrabold text-brand-primary leading-tight">
                  {formatCompactMoney(hoveredData ? hoveredData.wealth : finalValue)}
                </span>
              </div>
            </div>
            {result.tickerBenchmark && (
              <>
                <span className="h-6 w-[1px] bg-slate-200 dark:bg-slate-700" />
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded bg-amber-500 shrink-0" />
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] text-slate-500 font-semibold leading-tight">{result.tickerBenchmark} Bench</span>
                    <span className="text-xs font-extrabold text-amber-500 leading-tight">
                      {formatCompactMoney(hoveredData ? (hoveredData.benchmarkWealth || 0) : (timeline[timeline.length - 1].benchmarkWealth || 0))}
                    </span>
                  </div>
                </div>
              </>
            )}
            <span className="h-6 w-[1px] bg-slate-200 dark:bg-slate-700" />
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded bg-slate-300 shrink-0" />
              <div className="flex flex-col text-left">
                <span className="text-[10px] text-slate-500 font-semibold leading-tight">Deposited Capital</span>
                <span className="text-xs font-extrabold text-slate-600 dark:text-slate-400 leading-tight">
                  {formatCompactMoney(hoveredData ? hoveredData.totalInvested : finalInvested)}
                </span>
              </div>
            </div>
          </div>
          <svg className="w-full h-full overflow-visible min-h-[220px]" viewBox="0 0 800 250" preserveAspectRatio="none">
            <defs>
              <linearGradient id="gradValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4"/>
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0"/>
              </linearGradient>
            </defs>

            {(() => {
              const pointsValue = [];
              const pointsInvested = [];
              const pointsBenchmark = [];
              const allBenchValues = timeline.map(item => item.benchmarkWealth || 0).filter(Boolean);
              const maxVal = Math.max(finalValue, finalInvested, ...allBenchValues) * 1.1;
              const minVal = 0; // DCA starts from 0 (or initial deposit)
              
              const scaleY = (val) => {
                const ratio = (val - minVal) / (maxVal - minVal);
                return 210 - ratio * 190;
              };

              const scaleX = (idx) => {
                return 80 + (idx / (timeline.length - 1)) * 700;
              };

              const stepsCount = timeline.length;
              
              timeline.forEach((item, idx) => {
                const x = scaleX(idx);
                pointsValue.push(`${x},${scaleY(item.wealth)}`);
                pointsInvested.push(`${x},${scaleY(item.totalInvested)}`);
                if (item.benchmarkWealth !== undefined && item.benchmarkWealth !== null) {
                  pointsBenchmark.push(`${x},${scaleY(item.benchmarkWealth)}`);
                }
              });

              const lineX = hoverIdx !== null ? scaleX(hoverIdx) : null;

              return (
                <>
                  {/* Grid Lines */}
                  <line x1="80" y1={scaleY(maxVal)} x2="780" y2={scaleY(maxVal)} stroke={dark ? "rgba(255,255,255,0.05)" : "#f1f5f9"} strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="80" y1={scaleY(maxVal * 0.75)} x2="780" y2={scaleY(maxVal * 0.75)} stroke={dark ? "rgba(255,255,255,0.05)" : "#f1f5f9"} strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="80" y1={scaleY(maxVal * 0.5)} x2="780" y2={scaleY(maxVal * 0.5)} stroke={dark ? "rgba(255,255,255,0.05)" : "#f1f5f9"} strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="80" y1={scaleY(maxVal * 0.25)} x2="780" y2={scaleY(maxVal * 0.25)} stroke={dark ? "rgba(255,255,255,0.05)" : "#f1f5f9"} strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="80" y1={scaleY(0)} x2="780" y2={scaleY(0)} stroke={dark ? "rgba(255,255,255,0.1)" : "#e2e8f0"} strokeWidth="1.5" />

                  {/* Y-Axis Ticks (Left Side) */}
                  <text x="70" y={scaleY(maxVal) + 4} fontSize="10" fill={dark ? "rgba(255,255,255,0.4)" : "#94a3b8"} textAnchor="end" className="font-mono">
                    {formatCompactMoney(maxVal)}
                  </text>
                  <text x="70" y={scaleY(maxVal * 0.75) + 4} fontSize="10" fill={dark ? "rgba(255,255,255,0.4)" : "#94a3b8"} textAnchor="end" className="font-mono">
                    {formatCompactMoney(maxVal * 0.75)}
                  </text>
                  <text x="70" y={scaleY(maxVal * 0.5) + 4} fontSize="10" fill={dark ? "rgba(255,255,255,0.4)" : "#94a3b8"} textAnchor="end" className="font-mono">
                    {formatCompactMoney(maxVal * 0.5)}
                  </text>
                  <text x="70" y={scaleY(maxVal * 0.25) + 4} fontSize="10" fill={dark ? "rgba(255,255,255,0.4)" : "#94a3b8"} textAnchor="end" className="font-mono">
                    {formatCompactMoney(maxVal * 0.25)}
                  </text>
                  <text x="70" y={scaleY(0) + 4} fontSize="10" fill={dark ? "rgba(255,255,255,0.4)" : "#94a3b8"} textAnchor="end" className="font-mono">
                    0
                  </text>

                  {/* X-Axis Ticks (Below Graph) */}
                  <text x="80" y="235" fontSize="10" fill={dark ? "rgba(255,255,255,0.4)" : "#94a3b8"} textAnchor="middle" className="font-mono">
                    {timeline[0]?.date.substring(0, 4)}
                  </text>
                  <text x={result.splitIdx !== null && result.splitIdx !== undefined ? scaleX(result.splitIdx) : "430"} y="235" fontSize="10" fill={dark ? "rgba(255,255,255,0.4)" : "#94a3b8"} textAnchor="middle" className="font-mono">
                    {timeline[result.splitIdx !== null && result.splitIdx !== undefined ? result.splitIdx : Math.floor(stepsCount / 2)]?.date.substring(0, 4)}
                  </text>
                  <text x="780" y="235" fontSize="10" fill={dark ? "rgba(255,255,255,0.4)" : "#94a3b8"} textAnchor="middle" className="font-mono">
                    {timeline[stepsCount - 1]?.date.substring(0, 4)}
                  </text>

                  <path d={`M 80,210 L ${pointsValue.join(" L ")} L 780,210 Z`} fill="url(#gradValue)" />

                  {/* Lines Drawing */}
                  {result.splitIdx !== null && result.splitIdx !== undefined ? (
                    <>
                      {/* HISTORICAL PORTION */}
                      {/* Invested Cash Line (Historical) */}
                      <path d={`M ${pointsInvested.slice(0, result.splitIdx + 1).join(" L ")}`} fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeDasharray="5 5" strokeLinecap="round" />
                      {/* Portfolio Value Line (Historical) */}
                      <path d={`M ${pointsValue.slice(0, result.splitIdx + 1).join(" L ")}`} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />

                      {/* PROJECTED PORTION */}
                      {/* Invested Cash Line (Projected) */}
                      <path d={`M ${pointsInvested.slice(result.splitIdx).join(" L ")}`} fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeDasharray="2 3" strokeLinecap="round" opacity="0.7" />
                      {/* Portfolio Value Line (Projected) */}
                      <path d={`M ${pointsValue.slice(result.splitIdx).join(" L ")}`} fill="none" stroke="#3b82f6" strokeWidth="3" strokeDasharray="5 5" strokeLinecap="round" opacity="0.8" />

                      {/* Vertical separator line at Today */}
                      <g>
                        <line x1={scaleX(result.splitIdx)} y1="20" x2={scaleX(result.splitIdx)} y2="210" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 3" />
                        <rect x={scaleX(result.splitIdx) - 30} y="22" width="60" height="16" rx="4" fill="#f59e0b" className="shadow-sm" />
                        <text x={scaleX(result.splitIdx)} y="33" fontSize="8" fontWeight="bold" fill="#ffffff" textAnchor="middle" className="font-sans tracking-wide uppercase">Today</text>
                      </g>
                    </>
                  ) : (
                    <>
                      {/* Invested Cash Line */}
                      <path d={`M ${pointsInvested.join(" L ")}`} fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeDasharray="5 5" strokeLinecap="round" />
                      {/* Portfolio Value Line */}
                      <path d={`M ${pointsValue.join(" L ")}`} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />
                    </>
                  )}

                  {/* Benchmark Path Line */}
                  {pointsBenchmark.length > 0 && (
                    <path d={`M ${pointsBenchmark.join(" L ")}`} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
                  )}

                  {lineX !== null && hoveredData && (
                    <g>
                      <line x1={lineX} y1="20" x2={lineX} y2="210" stroke={dark ? "rgba(255,255,255,0.3)" : "#94a3b8"} strokeWidth="1" strokeDasharray="3 3" />
                      
                      <circle cx={lineX} cy={scaleY(hoveredData.totalInvested)} r="4" fill="#94a3b8" stroke="#ffffff" strokeWidth="1.5" className="shadow-md" />
                      <circle cx={lineX} cy={scaleY(hoveredData.wealth)} r="6" fill="#3b82f6" stroke="#ffffff" strokeWidth="2" className="shadow-md" />
                      {hoveredData.benchmarkWealth !== undefined && hoveredData.benchmarkWealth !== null && (
                        <circle cx={lineX} cy={scaleY(hoveredData.benchmarkWealth)} r="5" fill="#f59e0b" stroke="#ffffff" strokeWidth="1.5" className="shadow-md" />
                      )}
                    </g>
                  )}
                </>
              );
            })()}
          </svg>
        </div>
      </div>
    </div>
  );
}
