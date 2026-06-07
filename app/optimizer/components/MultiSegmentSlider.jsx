"use client";

import React, { useRef, useEffect, useState } from "react";

const NON_GOLD_COLORS = [
  "#3b82f6", // Blue
  "#10b981", // Green
  "#ef4444", // Red
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#14b8a6", // Teal
  "#f97316", // Orange
];

export default function MultiSegmentSlider({ selectedTickers, customWeights, onChange }) {
  const trackRef = useRef(null);
  const [activeHandle, setActiveHandle] = useState(null); // index of split handle being dragged

  // Order tickers from biggest to smallest weight.
  // We initialize the state to a sorted copy of selectedTickers.
  const [orderedTickers, setOrderedTickers] = useState(() => {
    return [...selectedTickers].sort((a, b) => {
      const wA = customWeights[a] || 0;
      const wB = customWeights[b] || 0;
      return wB - wA;
    });
  });

  // Keep orderedTickers in sync, but only when not actively dragging
  useEffect(() => {
    if (activeHandle === null) {
      setOrderedTickers(
        [...selectedTickers].sort((a, b) => {
          const wA = customWeights[a] || 0;
          const wB = customWeights[b] || 0;
          return wB - wA;
        })
      );
    }
  }, [selectedTickers, customWeights, activeHandle]);

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

  // Calculate cumulative percentages representing boundaries between segments
  // e.g. for weights [68, 22, 10], cumulative bounds are [68, 90]
  const getCumulativeBounds = () => {
    const bounds = [];
    let sum = 0;
    for (let i = 0; i < N - 1; i++) {
      sum += customWeights[orderedTickers[i]] || 0;
      bounds.push(sum);
    }
    return bounds;
  };

  const bounds = getCumulativeBounds();

  const handleDrag = (clientX) => {
    if (activeHandle === null || !trackRef.current) return;

    const rect = trackRef.current.getBoundingClientRect();
    const trackWidth = rect.width;
    if (trackWidth <= 0) return;

    // Calculate percentage position of cursor on the track (capped 0 to 100)
    let pct = ((clientX - rect.left) / trackWidth) * 100;
    pct = Math.min(100, Math.max(0, Math.round(pct)));

    // Constrain the handle between its adjacent neighbors
    const minVal = activeHandle > 0 ? bounds[activeHandle - 1] : 0;
    const maxVal = activeHandle < bounds.length - 1 ? bounds[activeHandle + 1] : 100;

    const constrainedPct = Math.min(maxVal, Math.max(minVal, pct));

    // Reconstruct weights from the new cumulative bounds
    const nextBounds = [...bounds];
    nextBounds[activeHandle] = constrainedPct;

    const updated = {};
    let prevBound = 0;
    for (let i = 0; i < N; i++) {
      const ticker = orderedTickers[i];
      const nextBound = i < N - 1 ? nextBounds[i] : 100;
      updated[ticker] = nextBound - prevBound;
      prevBound = nextBound;
    }

    onChange(updated);
  };

  useEffect(() => {
    const onMouseMove = (e) => {
      if (activeHandle !== null) {
        handleDrag(e.clientX);
      }
    };

    const onMouseUp = () => {
      setActiveHandle(null);
    };

    const onTouchMove = (e) => {
      if (activeHandle !== null && e.touches[0]) {
        handleDrag(e.touches[0].clientX);
      }
    };

    if (activeHandle !== null) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
      window.addEventListener("touchmove", onTouchMove);
      window.addEventListener("touchend", onMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onMouseUp);
    };
  }, [activeHandle, bounds]);

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
        ref={trackRef}
        className="w-full h-8 relative rounded-xl bg-slate-200 dark:bg-slate-800 flex items-center shadow-inner select-none overflow-visible"
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

        {/* Drag handles at boundaries */}
        {bounds.map((pct, idx) => (
          <div
            key={idx}
            style={{ left: `${pct}%` }}
            onMouseDown={() => setActiveHandle(idx)}
            onTouchStart={() => setActiveHandle(idx)}
            className="absolute top-1/2 -translate-y-1/2 -ml-2.5 w-5 h-7 bg-white dark:bg-slate-900 border-2 border-brand-primary rounded-md shadow-md cursor-ew-resize z-10 flex flex-col justify-center items-center space-y-0.5 hover:scale-105 active:scale-95 active:border-brand-primary-hover transition-transform"
          >
            <div className="w-[1.5px] h-3 bg-brand-primary rounded-full" />
            <div className="w-[1.5px] h-3 bg-brand-primary rounded-full" />
          </div>
        ))}
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
