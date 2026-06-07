"use client";

import React, { useMemo } from "react";

const NON_GOLD_COLORS = [
  "#3b82f6", // Blue
  "#10b981", // Green
  "#ef4444", // Red
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#14b8a6", // Teal
  "#f97316", // Orange
];

export default function MultiSegmentSlider({ selectedTickers, customWeights }) {
  const orderedTickers = useMemo(() => {
    return [...selectedTickers].sort((a, b) => {
      const wA = customWeights[a] || 0;
      const wB = customWeights[b] || 0;
      return wB - wA;
    });
  }, [selectedTickers, customWeights]);

  // Stable color helper mapping ticker to consistent color (and GLD to gold)
  const getColorForTicker = (ticker) => {
    if (ticker.toUpperCase() === "GLD") {
      return "#f59e0b"; // Gold/Amber
    }
    const nonGldTickers = selectedTickers.filter(t => t.toUpperCase() !== "GLD");
    const nonGldIdx = nonGldTickers.indexOf(ticker);
    if (nonGldIdx !== -1) {
      return NON_GOLD_COLORS[nonGldIdx % NON_GOLD_COLORS.length];
    }
    return "#3b82f6";
  };

  const N = orderedTickers.length;

  if (N <= 1) {
    return (
      <div className="text-xs text-slate-400 font-mono italic">
        A single asset is automatically allocated 100%. Select at least two assets to adjust weights.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Visual Track */}
      <div
        className="w-full h-8 relative rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center shadow-inner select-none overflow-hidden"
      >
        {/* Colorful segments */}
        {orderedTickers.map((ticker, idx) => {
          const weight = customWeights[ticker] || 0;
          if (weight <= 0) return null;

          const color = getColorForTicker(ticker);

          // Calculate offset start
          let startPct = 0;
          for (let i = 0; i < idx; i++) {
            startPct += customWeights[orderedTickers[i]] || 0;
          }

          return (
            <div
              key={ticker}
              style={{
                left: `${startPct}%`,
                width: `${weight}%`,
                backgroundColor: color,
              }}
              className="absolute top-0 bottom-0 first:rounded-l-xl last:rounded-r-xl transition-all duration-75 flex items-center justify-center text-[10px] font-bold text-white tracking-wide shadow-sm truncate px-1"
            >
              {weight >= 8 && `${ticker} ${weight}%`}
            </div>
          );
        })}

      </div>

      {/* Legend & Details */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800/60 mt-4">
        {orderedTickers.map((ticker) => {
          const weight = customWeights[ticker] || 0;
          const color = getColorForTicker(ticker);
          return (
            <div key={ticker} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/40">
              <div 
                style={{ backgroundColor: color }} 
                className="w-2.5 h-2.5 rounded-full" 
              />
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono">{ticker}</span>
              <span className="text-xs font-bold text-brand-primary font-mono ml-auto">{weight}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
