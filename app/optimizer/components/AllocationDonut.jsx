"use client";

import React, { useState } from "react";

const PALETTE = [
  "#6366f1", // Indigo
  "#10b981", // Emerald
  "#f59e0b", // Amber/Gold
  "#8b5cf6", // Violet
  "#0ea5e9", // Sky
  "#f43f5e", // Rose
];

export default function AllocationDonut({ weights }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  const entries = Object.entries(weights)
    .filter(([_, w]) => w > 0)
    .sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) return null;

  // Compute angles and paths for SVG donut
  const total = entries.reduce((sum, [_, w]) => sum + w, 0);
  
  let cumPercent = 0;
  const slices = entries.map(([ticker, w], idx) => {
    const percent = w / total;
    const startAngle = cumPercent * 360;
    const endAngle = (cumPercent + percent) * 360;
    cumPercent += percent;

    return {
      ticker,
      w,
      percent,
      startAngle,
      endAngle,
      color: PALETTE[idx % PALETTE.length],
    };
  });

  const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  };

  const describeArc = (x, y, radius, startAngle, endAngle) => {
    const start = polarToCartesian(x, y, radius, endAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
    return [
      "M", start.x, start.y,
      "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
    ].join(" ");
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-glass-border rounded-2xl p-6 shadow-premium flex flex-col items-center gap-6">
      {/* SVG Donut */}
      <div className="relative w-48 h-48 flex-shrink-0">
        <svg className="w-full h-full transform -rotate-90 overflow-visible" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="38" fill="transparent" stroke="var(--color-surface-3)" strokeWidth="10" />
          {slices.map((slice, idx) => {
            const isHovered = hoveredIdx === idx;
            const strokeWidth = isHovered ? 12 : 9;
            const radius = 38;

            // Handle full 360 circle case
            if (slice.percent >= 0.999) {
              return (
                <circle
                  key={slice.ticker}
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="transparent"
                  stroke={slice.color}
                  strokeWidth={strokeWidth}
                  className="transition-all duration-300 cursor-pointer"
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />
              );
            }

            const pathData = describeArc(50, 50, radius, slice.startAngle, slice.endAngle);

            return (
              <path
                key={slice.ticker}
                d={pathData}
                fill="transparent"
                stroke={slice.color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                className="transition-all duration-300 cursor-pointer"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            );
          })}
        </svg>

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none font-mono">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            {hoveredIdx !== null ? slices[hoveredIdx].ticker : "Total"}
          </span>
          <span className="text-lg font-black text-slate-800 dark:text-slate-100">
            {hoveredIdx !== null 
              ? `${(slices[hoveredIdx].percent * 100).toFixed(0)}%` 
              : "100%"
            }
          </span>
        </div>
      </div>

      {/* Legend Vertical List */}
      <div className="w-full flex flex-col gap-1.5">
        {slices.map((slice, idx) => {
          const isHovered = hoveredIdx === idx;
          return (
            <div
              key={slice.ticker}
              className={`flex items-center justify-between p-2 rounded-xl border transition-all duration-200 cursor-pointer ${
                isHovered 
                  ? "bg-slate-50 dark:bg-slate-800 border-slate-200/50 dark:border-slate-700/50 scale-[1.01]" 
                  : "bg-transparent border-transparent"
              }`}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <div className="flex items-center gap-2.5">
                <span 
                  className="h-3 w-3 rounded-full shrink-0 transition-transform duration-300"
                  style={{ backgroundColor: slice.color, transform: isHovered ? "scale(1.2)" : "none" }}
                />
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 uppercase font-mono tracking-wider">
                  {slice.ticker}
                </span>
              </div>
              <span className="text-xs font-extrabold font-mono text-slate-600 dark:text-slate-400">
                {(slice.w * 100).toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
