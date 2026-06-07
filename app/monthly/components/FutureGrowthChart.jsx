"use client";

import React, { useState, useRef } from "react";
import { useTheme } from "../../context/ThemeContext";

export default function FutureGrowthChart({ result, pastResult, currency, monthlyAmount, years, mode, setMode }) {
  const { dark } = useTheme();
  const [hoverIdx, setHoverIdx] = useState(null);
  const [hoveredBar, setHoveredBar] = useState(null);
  const mainChartRef = useRef(null);

  if (!result) return null;

  const timeline = result.timeline;
  const finalInvested = result.totalInvested;
  const finalValue = result.finalWealth;
  const ticker = result.ticker;

  // Use pre-computed full-history yearly rates from result (all years, not just selected period)
  // Falls back to deriving from pastResult if yearlyHistory is not available
  const yearlyData = result.yearlyHistory && result.yearlyHistory.length > 0
    ? result.yearlyHistory
    : (() => {
        const data = [];
        if (pastResult && pastResult.timeline) {
          const groups = {};
          pastResult.timeline.forEach(item => {
            const yr = item.date.substring(0, 4);
            groups[yr] = item;
          });
          Object.keys(groups).sort().forEach(yr => {
            data.push({ year: yr, rate: groups[yr].annualRate || 0 });
          });
        }
        return data;
      })();

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

  // Optimistic / Conservative calculations for final step to show in header or widgets
  const finalItem = timeline[timeline.length - 1];
  const finalValueOpt = finalItem.wealthOptimistic ?? finalValue;
  const finalValueCon = finalItem.wealthConservative ?? finalValue;

  // Yearly rates bar scale calculations
  const yearlyRates = yearlyData.map(d => d.rate);
  const maxYearlyRate = Math.max(...yearlyRates, 5);
  const minYearlyRate = Math.min(...yearlyRates, -5);
  const yearlyRateRange = maxYearlyRate - minYearlyRate || 1;

  const scaleYearlyRateY = (val) => 115 - ((val - minYearlyRate) / yearlyRateRange) * 103;
  const scaleX = (idx) => 80 + (idx / (timeline.length - 1)) * 700;

  return (
    <div className="space-y-8 animate-fadeIn text-left">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-950/20 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300 font-mono border border-amber-200 dark:border-amber-900/40">
            Future Projection Mode
          </span>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-2">
            Compounding Projection
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Expected Return Projection: Projects potential paths forward starting from today using average historical returns.
          </p>
          <p className="mt-2 max-w-2xl text-[11px] font-medium leading-relaxed text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 rounded-lg px-3 py-2">
            Rough estimate only: this uses historical rolling averages and recent FX trends. It is not an accurate forecast, and future returns can differ materially.
          </p>
        </div>

        {/* View Toggle Buttons */}
        {setMode && (
          <div className="flex gap-1.5 bg-slate-100 dark:bg-slate-900/50 p-1 rounded-xl border border-slate-200/40 self-start sm:self-center">
            <button
              onClick={() => setMode("past")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono whitespace-nowrap transition-all ${mode === "past"
                ? "bg-white dark:bg-slate-800 text-brand-primary shadow-sm border border-slate-200/20"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
            >
              Past Performance
            </button>
            <button
              onClick={() => setMode("future")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono whitespace-nowrap transition-all ${mode === "future"
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
          <span className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">Projection Results</span>
        </div>
        <div className="flex flex-col sm:flex-row justify-start items-start sm:items-center border-b border-slate-100 pb-3 mb-6 gap-2">

          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono">
            {/* Cash Deposited */}
            <div className="flex flex-col items-start">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-sans">Total Invested</span>
              <span className="text-lg font-bold text-slate-600 dark:text-slate-400">
                {formatCompactMoney(finalInvested)}
              </span>
            </div>

            {/* Plus sign */}
            <span className="text-slate-400 font-bold text-lg px-1 self-end mb-0.5">+</span>

            {/* Compounding Return */}
            <div className="flex flex-col items-start">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-sans">Compounding Growth (Est.)</span>
              <span className="text-lg font-bold text-brand-primary bg-blue-50 dark:bg-blue-950/30 px-2 py-0.5 rounded-md">
                +{formatCompactMoney(finalValue - finalInvested)}
                <span className="text-xs font-semibold ml-1.5 opacity-90">
	                  (+{((finalValue - finalInvested) / finalInvested * 100).toFixed(1)}% total
	                  <span className="mx-1 opacity-50">|</span>
	                  {(result.annualAssetRate ?? result.annualRate) >= 0 ? "+" : ""}{(result.annualAssetRate ?? result.annualRate).toFixed(1)}% stock<span className="ml-0.5 text-[9px] font-bold tracking-wide opacity-60 align-super">annual avg</span>
	                  {typeof result.annualFxImpact === "number" && Math.abs(result.annualFxImpact) >= 0.05 && (
	                    <>
	                      <span className="mx-1 opacity-50">|</span>
	                      {result.annualFxImpact >= 0 ? "+" : ""}{result.annualFxImpact.toFixed(1)}% FX<span className="ml-0.5 text-[9px] font-bold tracking-wide opacity-60 align-super">annual avg</span>
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
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-sans">Projected Portfolio</span>
              <span className="text-2xl font-black text-slate-900 dark:text-slate-50">
                {formatCompactMoney(finalValue)}
              </span>
            </div>
          </div>
        </div>

        {/* Title for MINI BAR CHART OF ANNUALIZED IRR FOR PREVIOUS YEARS */}
        <div className="flex justify-between items-center mb-1.5 px-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
            {hoveredBar !== null && yearlyData[hoveredBar] ? (
              <span style={{ color: yearlyData[hoveredBar].rate >= 0 ? (dark ? "#4ade80" : "#16a34a") : (dark ? "#f87171" : "#dc2626") }} className="font-bold">
                Rate in {yearlyData[hoveredBar].year}: {yearlyData[hoveredBar].rate >= 0 ? "+" : ""}{yearlyData[hoveredBar].rate.toFixed(1)}%
              </span>
            ) : (
              "Annual Rates (IRR) for Previous Years"
            )}
          </span>
        </div>

        {/* MINI BAR CHART OF ANNUALIZED IRR FOR PREVIOUS YEARS */}
        <div className="w-full h-36 mb-2 relative border border-slate-100 rounded-xl bg-slate-50/50 p-1 flex items-center overflow-hidden" style={dark ? { backgroundColor: "#0f172a", borderColor: "rgba(255,255,255,0.07)" } : {}}>
          <svg className="w-full h-full overflow-visible animate-fadeIn" viewBox="0 0 800 135" preserveAspectRatio="none">
            {/* Zero reference line */}
            <line x1="80" y1={scaleYearlyRateY(0)} x2="780" y2={scaleYearlyRateY(0)} stroke={dark ? "rgba(255,255,255,0.1)" : "#e2e8f0"} strokeWidth="1" strokeDasharray="2 2" />

            {yearlyData.map((item, idx) => {
              const numYears = yearlyData.length || 1;
              const totalBarWidth = 700;
              const itemWidth = totalBarWidth / numYears;
              const barWidth = Math.min(30, itemWidth * 0.6);
              const x = 80 + idx * itemWidth + (itemWidth - barWidth) / 2;

              const yZero = scaleYearlyRateY(0);
              const yVal = scaleYearlyRateY(item.rate);

              const isPositive = item.rate >= 0;
              const y = isPositive ? yVal : yZero;
              const height = isPositive ? Math.max(2, yZero - yVal) : Math.max(2, yVal - yZero);
              const isHovered = hoveredBar === idx;

              const fill = dark
                ? (isHovered
                  ? (isPositive ? "#4ade80" : "#f87171")
                  : (isPositive ? "#22c55e" : "#ef4444"))
                : (isHovered
                  ? (isPositive ? "#16a34a" : "#dc2626")
                  : (isPositive ? "#22c55e" : "#ef4444"));

              return (
                <g key={item.year}>
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={height}
                    style={{ fill, transition: "fill 0.15s ease" }}
                    rx="3"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredBar(idx)}
                    onMouseLeave={() => setHoveredBar(null)}
                  />
                  {/* Year text label at the bottom */}
                  <text
                    x={x + barWidth / 2}
                    y="127"
                    fontSize="7.5"
                    fill={isHovered ? (dark ? "#ffffff" : "#0f172a") : (dark ? "rgba(255,255,255,0.4)" : "#94a3b8")}
                    fontWeight={isHovered ? "bold" : "normal"}
                    textAnchor="middle"
                    className="font-mono"
                  >
                    {item.year}
                  </text>
                  {/* Rate label above positive bars, or above the zero line for negative bars if hovered */}
                  {isHovered && (
                    <text
                      x={x + barWidth / 2}
                      y={isPositive ? y - 6 : yZero - 6}
                      fontSize="7.5"
                      fontWeight="bold"
                      fill={dark ? (isPositive ? "#4ade80" : "#f87171") : (isPositive ? "#16a34a" : "#dc2626")}
                      textAnchor="middle"
                      className="font-mono"
                    >
                      {item.rate >= 0 ? "+" : ""}{item.rate.toFixed(1)}%
                    </text>
                  )}
                </g>
              );
            })}

            {/* Sparkline Axis values labels */}
            <text x="75" y={scaleYearlyRateY(maxYearlyRate) + 3} fontSize="7" fill={dark ? "rgba(255,255,255,0.3)" : "#94a3b8"} textAnchor="end" className="font-mono">
              +{maxYearlyRate.toFixed(0)}%
            </text>
            <text x="75" y={scaleYearlyRateY(minYearlyRate) + 3} fontSize="7" fill={dark ? "rgba(255,255,255,0.3)" : "#94a3b8"} textAnchor="end" className="font-mono">
              {minYearlyRate.toFixed(0)}%
            </text>
          </svg>
        </div>

        <div
          ref={mainChartRef}
          onMouseMove={handleMainMouseMove}
          onMouseLeave={() => setHoverIdx(null)}
          className="aspect-[21/8] w-full bg-slate-50/50 rounded-xl p-4 border border-slate-100 relative cursor-crosshair overflow-hidden animate-fadeIn"
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
                <span className="text-[10px] text-slate-500 font-semibold leading-tight">{ticker} {hoveredData ? "" : "(Mod)"}</span>
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
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="gradEnvelope" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.12" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.03" />
              </linearGradient>
            </defs>

            {(() => {
              const pointsValue = [];
              const pointsInvested = [];
              const pointsBenchmark = [];
              const allBenchValues = timeline.map(item => item.benchmarkWealth || 0).filter(Boolean);

              // Max value bounding is based on the optimistic wealth curve and benchmark to fit all paths
              const maxVal = Math.max(finalValueOpt, finalInvested, ...allBenchValues) * 1.25;
              const minVal = 0;

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

              // Create path polygon coordinates for the shaded variance envelope over the entire timeline
              const optPoints = [];
              const conPoints = [];
              for (let i = 0; i < timeline.length; i++) {
                const x = scaleX(i);
                optPoints.push(`${x},${scaleY(timeline[i].wealthOptimistic ?? timeline[i].wealth)}`);
                conPoints.unshift(`${x},${scaleY(timeline[i].wealthConservative ?? timeline[i].wealth)}`);
              }
              const envelopePath = `M ${optPoints.join(" L ")} L ${conPoints.join(" L ")} Z`;

              const lineX = hoverIdx !== null ? scaleX(hoverIdx) : null;

              return (
                <>
                  {/* Grid Lines */}
                  <line x1="80" y1={scaleY(maxVal)} x2="780" y2={scaleY(maxVal)} stroke={dark ? "rgba(255,255,255,0.05)" : "#f1f5f9"} strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="80" y1={scaleY(maxVal * 0.75)} x2="780" y2={scaleY(maxVal * 0.75)} stroke={dark ? "rgba(255,255,255,0.05)" : "#f1f5f9"} strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="80" y1={scaleY(maxVal * 0.5)} x2="780" y2={scaleY(maxVal * 0.5)} stroke={dark ? "rgba(255,255,255,0.05)" : "#f1f5f9"} strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="80" y1={scaleY(maxVal * 0.25)} x2="780" y2={scaleY(maxVal * 0.25)} stroke={dark ? "rgba(255,255,255,0.05)" : "#f1f5f9"} strokeWidth="1" strokeDasharray="3 3" />
                  <line x1="80" y1={scaleY(0)} x2="780" y2={scaleY(0)} stroke={dark ? "rgba(255,255,255,0.1)" : "#e2e8f0"} strokeWidth="1.5" />

                  {/* Y-Axis Ticks */}
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

                  {/* X-Axis Ticks */}
                  <text x="80" y="235" fontSize="10" fill={dark ? "rgba(255,255,255,0.4)" : "#94a3b8"} textAnchor="middle" className="font-mono">
                    {timeline[0]?.date.substring(0, 4)}
                  </text>
                  <text x="430" y="235" fontSize="10" fill={dark ? "rgba(255,255,255,0.4)" : "#94a3b8"} textAnchor="middle" className="font-mono">
                    {timeline[Math.floor(stepsCount / 2)]?.date.substring(0, 4)}
                  </text>
                  <text x="780" y="235" fontSize="10" fill={dark ? "rgba(255,255,255,0.4)" : "#94a3b8"} textAnchor="middle" className="font-mono">
                    {timeline[stepsCount - 1]?.date.substring(0, 4)}
                  </text>

                  {/* Projected Shaded Variance Envelope */}
                  {envelopePath && (
                    <path d={envelopePath} fill="url(#gradEnvelope)" />
                  )}

                  {/* LINES */}
                  {/* Cash Invested */}
                  <path d={`M ${pointsInvested.join(" L ")}`} fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeDasharray="5 5" strokeLinecap="round" />

                  {/* Optimistic wealth curve */}
                  <path d={`M ${timeline.map((item, i) => `${scaleX(i)},${scaleY(item.wealthOptimistic)}`).join(" L ")}`} fill="none" stroke="#60a5fa" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.75" />

                  {/* Moderate wealth curve */}
                  <path d={`M ${pointsValue.join(" L ")}`} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" />

                  {/* Conservative wealth curve */}
                  <path d={`M ${timeline.map((item, i) => `${scaleX(i)},${scaleY(item.wealthConservative)}`).join(" L ")}`} fill="none" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.75" />

                  {/* Benchmark Path Line */}
                  {pointsBenchmark.length > 0 && (
                    <path d={`M ${pointsBenchmark.join(" L ")}`} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
                  )}

                  {/* HOVER DETAILS */}
                  {lineX !== null && hoveredData && (
                    <g>
                      <line x1={lineX} y1="20" x2={lineX} y2="210" stroke={dark ? "rgba(255,255,255,0.3)" : "#94a3b8"} strokeWidth="1" strokeDasharray="3 3" />

                      {/* Cash deposited dot */}
                      <circle cx={lineX} cy={scaleY(hoveredData.totalInvested)} r="3.5" fill="#94a3b8" stroke="#ffffff" strokeWidth="1.5" />

                      {/* Moderate value dot */}
                      <circle cx={lineX} cy={scaleY(hoveredData.wealth)} r="5.5" fill="#3b82f6" stroke="#ffffff" strokeWidth="2" />

                      {/* Optimistic and Conservative dots */}
                      <circle cx={lineX} cy={scaleY(hoveredData.wealthOptimistic)} r="4.5" fill="#60a5fa" stroke="#ffffff" strokeWidth="1.5" />
                      <circle cx={lineX} cy={scaleY(hoveredData.wealthConservative)} r="4.5" fill="#6366f1" stroke="#ffffff" strokeWidth="1.5" />

                      {/* Benchmark dot */}
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
