"use client";

import React, { useState, useRef } from "react";
import { useTheme } from "../../context/ThemeContext";

export default function PortfolioGrowthChart({ timeline, currency }) {
  const { dark } = useTheme();
  const [hoverIdx, setHoverIdx] = useState(null);
  const mainChartRef = useRef(null);

  if (!timeline || timeline.length === 0) return null;

  const finalItem = timeline[timeline.length - 1];
  const finalValue = finalItem.wealth;
  const finalInvested = finalItem.totalInvested;

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
    if (absValue >= 1_000_000) return `${getSymbol()}${(value / 1_000_000).toFixed(2)}M`;
    if (absValue >= 1_000) return `${getSymbol()}${(value / 1_000).toFixed(1)}K`;
    return `${getSymbol()}${Math.round(value || 0).toLocaleString()}`;
  };

  const handleMouseMove = (e) => {
    if (!timeline.length || !mainChartRef.current) return;
    const rect = mainChartRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.min(1, Math.max(0, x / rect.width));
    const idx = Math.round(pct * (timeline.length - 1));
    setHoverIdx(idx);
  };

  const hoveredData = hoverIdx !== null ? timeline[hoverIdx] : null;

  // Layout calculations
  const maxVal = Math.max(...timeline.map(item => Math.max(item.wealth, item.totalInvested))) * 1.1;
  const minVal = 0;

  const scaleY = (val) => {
    const ratio = (val - minVal) / (maxVal - minVal);
    return 210 - ratio * 190;
  };

  const scaleX = (idx) => {
    return 85 + (idx / (timeline.length - 1)) * 695;
  };

  const pointsValue = [];
  const pointsInvested = [];

  timeline.forEach((item, idx) => {
    const x = scaleX(idx);
    pointsValue.push(`${x},${scaleY(item.wealth)}`);
    pointsInvested.push(`${x},${scaleY(item.totalInvested)}`);
  });

  const lineX = hoverIdx !== null ? scaleX(hoverIdx) : null;

  return (
    <div className="bg-white dark:bg-slate-900 border border-glass-border rounded-2xl p-6 shadow-premium relative">
      <div className="mb-4 text-left">
        <span className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">Compounding Trajectory</span>
      </div>

      {/* Main interactive chart wrapper */}
      <div
        ref={mainChartRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIdx(null)}
        className="aspect-[21/8] w-full bg-slate-50/50 dark:bg-slate-950/20 rounded-xl p-4 border border-slate-100 dark:border-slate-800 relative cursor-crosshair overflow-hidden"
      >
        {/* Floating Tooltip Header */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex flex-row gap-4 items-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm px-4 py-2 rounded-xl border border-slate-200/50 dark:border-slate-700/50 shadow-md pointer-events-none font-mono text-[10px] sm:text-xs whitespace-nowrap">
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
              <span className="text-[10px] text-slate-500 font-semibold leading-tight">Portfolio Value</span>
              <span className="text-xs font-extrabold text-brand-primary leading-tight">
                {formatCompactMoney(hoveredData ? hoveredData.wealth : finalValue)}
              </span>
            </div>
          </div>
          <span className="h-6 w-[1px] bg-slate-200 dark:bg-slate-700" />
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded bg-slate-300 dark:bg-slate-600 shrink-0" />
            <div className="flex flex-col text-left">
              <span className="text-[10px] text-slate-500 font-semibold leading-tight">Total Capital Invested</span>
              <span className="text-xs font-extrabold text-slate-600 dark:text-slate-400 leading-tight">
                {formatCompactMoney(hoveredData ? hoveredData.totalInvested : finalInvested)}
              </span>
            </div>
          </div>
        </div>

        {/* SVG Drawing */}
        <svg className="w-full h-full overflow-visible min-h-[220px]" viewBox="0 0 800 250" preserveAspectRatio="none">
          <defs>
            <linearGradient id="gradPortfolio" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1="85" y1={scaleY(maxVal)} x2="780" y2={scaleY(maxVal)} stroke={dark ? "rgba(255,255,255,0.05)" : "#f1f5f9"} strokeWidth="1" strokeDasharray="3 3" />
          <line x1="85" y1={scaleY(maxVal * 0.75)} x2="780" y2={scaleY(maxVal * 0.75)} stroke={dark ? "rgba(255,255,255,0.05)" : "#f1f5f9"} strokeWidth="1" strokeDasharray="3 3" />
          <line x1="85" y1={scaleY(maxVal * 0.5)} x2="780" y2={scaleY(maxVal * 0.5)} stroke={dark ? "rgba(255,255,255,0.05)" : "#f1f5f9"} strokeWidth="1" strokeDasharray="3 3" />
          <line x1="85" y1={scaleY(maxVal * 0.25)} x2="780" y2={scaleY(maxVal * 0.25)} stroke={dark ? "rgba(255,255,255,0.05)" : "#f1f5f9"} strokeWidth="1" strokeDasharray="3 3" />
          <line x1="85" y1={scaleY(0)} x2="780" y2={scaleY(0)} stroke={dark ? "rgba(255,255,255,0.1)" : "#e2e8f0"} strokeWidth="1.5" />

          {/* Y Axis Labels */}
          <text x="75" y={scaleY(maxVal) + 4} fontSize="9" fill={dark ? "rgba(255,255,255,0.4)" : "#94a3b8"} textAnchor="end" className="font-mono">
            {formatCompactMoney(maxVal)}
          </text>
          <text x="75" y={scaleY(maxVal * 0.75) + 4} fontSize="9" fill={dark ? "rgba(255,255,255,0.4)" : "#94a3b8"} textAnchor="end" className="font-mono">
            {formatCompactMoney(maxVal * 0.75)}
          </text>
          <text x="75" y={scaleY(maxVal * 0.5) + 4} fontSize="9" fill={dark ? "rgba(255,255,255,0.4)" : "#94a3b8"} textAnchor="end" className="font-mono">
            {formatCompactMoney(maxVal * 0.5)}
          </text>
          <text x="75" y={scaleY(maxVal * 0.25) + 4} fontSize="9" fill={dark ? "rgba(255,255,255,0.4)" : "#94a3b8"} textAnchor="end" className="font-mono">
            {formatCompactMoney(maxVal * 0.25)}
          </text>
          <text x="75" y={scaleY(0) + 4} fontSize="9" fill={dark ? "rgba(255,255,255,0.4)" : "#94a3b8"} textAnchor="end" className="font-mono">
            0
          </text>

          {/* X Axis Labels */}
          <text x="85" y="235" fontSize="10" fill={dark ? "rgba(255,255,255,0.4)" : "#94a3b8"} textAnchor="middle" className="font-mono">
            {timeline[0].date}
          </text>
          <text x="432" y="235" fontSize="10" fill={dark ? "rgba(255,255,255,0.4)" : "#94a3b8"} textAnchor="middle" className="font-mono">
            {timeline[Math.floor(timeline.length / 2)].date}
          </text>
          <text x="780" y="235" fontSize="10" fill={dark ? "rgba(255,255,255,0.4)" : "#94a3b8"} textAnchor="middle" className="font-mono">
            {finalItem.date}
          </text>

          {/* Shaded Area under Portfolio line */}
          <path d={`M 85,210 L ${pointsValue.join(" L ")} L 780,210 Z`} fill="url(#gradPortfolio)" />

          {/* Invested capital line */}
          <path d={`M ${pointsInvested.join(" L ")}`} fill="none" stroke="#94a3b8" strokeWidth="2" strokeDasharray="5 5" strokeLinecap="round" />

          {/* Portfolio wealth line */}
          <path d={`M ${pointsValue.join(" L ")}`} fill="none" stroke="#4f46e5" strokeWidth="3" strokeLinecap="round" />

          {/* Hover effects */}
          {lineX !== null && hoveredData && (
            <g>
              <line x1={lineX} y1="20" x2={lineX} y2="210" stroke={dark ? "rgba(255,255,255,0.3)" : "#94a3b8"} strokeWidth="1" strokeDasharray="3 3" />
              <circle cx={lineX} cy={scaleY(hoveredData.totalInvested)} r="4" fill="#94a3b8" stroke="#ffffff" strokeWidth="1.5" className="shadow" />
              <circle cx={lineX} cy={scaleY(hoveredData.wealth)} r="6" fill="#4f46e5" stroke="#ffffff" strokeWidth="2" className="shadow" />
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}
