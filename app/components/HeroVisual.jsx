"use client";

import React, { useState } from "react";

export default function HeroVisual() {
  const [activeFactor, setActiveFactor] = useState(null);

  const factors = [
    {
      id: "price",
      label: "Price Growth",
      aValue: "+143.6%",
      bValue: "+52.3%",
      winner: "Apple Story",
      note: "Price growth was Apple's main driver.",
      color: "text-brand-primary bg-indigo-50 dark:bg-indigo-900/30 border-indigo-100",
      indicatorColor: "bg-brand-primary"
    },
    {
      id: "fx",
      label: "FX Impact (USD/EUR)",
      aValue: "+35.1%",
      bValue: "0.0%",
      winner: "Apple Story",
      note: "EUR weakness boosted USD returns significantly.",
      color: "text-brand-accent bg-violet-50 border-violet-100",
      indicatorColor: "bg-brand-accent"
    },
    {
      id: "dividends",
      label: "Dividends Reinvested",
      aValue: "+11.9%",
      bValue: "0.0%",
      winner: "Apple Story",
      note: "Cash flows compounded and reinvested over time.",
      color: "text-emerald-600 bg-emerald-50 border-emerald-100",
      indicatorColor: "bg-brand-secondary"
    },
    {
      id: "risk",
      label: "Max Drawdown (Pain)",
      aValue: "-21.8%",
      bValue: "-11.2%",
      winner: "Gold Story",
      note: "Gold offered a much smoother, safer ride.",
      color: "text-rose-600 bg-rose-50 border-rose-100",
      indicatorColor: "bg-brand-danger"
    }
  ];

  return (
    <div className="relative w-full rounded-2xl border border-glass-border bg-white dark:bg-slate-900 p-6 shadow-premium transition-all duration-300 hover:shadow-premium-hover grid-pattern-fine">
      {/* Visual Header / Scenario */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-glass-border pb-4 mb-6 gap-2 text-left">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-0.5 text-xs font-semibold text-brand-primary">
            Comparison Lab
          </span>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">Apple vs Gold (EUR Investor)</h3>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          <span>Period: 5 Years</span>
          <span className="rounded border border-slate-200 dark:border-slate-700 px-2 py-0.5">Initial: €10,000</span>
        </div>
      </div>

      {/* Main Grid: Chart + Comparison Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Modern SVG Line Chart (7 columns) */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          <div className="relative aspect-[4/3] w-full rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 p-4">
            
            {/* Chart Legend */}
            <div className="flex justify-between items-center mb-4 text-xs font-semibold">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-brand-primary" />
                <span className="text-slate-800 dark:text-slate-100">Apple (€21,240)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-brand-accent" />
                <span className="text-slate-600 dark:text-slate-300">Gold (€15,231)</span>
              </div>
            </div>

            {/* SVG Graph */}
            <svg className="w-full h-full overflow-visible min-h-[180px]" viewBox="0 0 400 240">
              <defs>
                <linearGradient id="appleGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.15"/>
                  <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0"/>
                </linearGradient>
                <linearGradient id="goldGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.1"/>
                  <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.0"/>
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="0" y1="200" x2="400" y2="200" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="0" y1="150" x2="400" y2="150" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="0" y1="100" x2="400" y2="100" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
              <line x1="0" y1="50"  x2="400" y2="50"  stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />

              {/* Gold Path */}
              <path d="M 0 190 Q 80 180 140 160 T 260 135 T 400 115 L 400 220 L 0 220 Z" fill="url(#goldGradient)" />
              <path
                d="M 0 190 Q 80 180 140 160 T 260 135 T 400 115"
                fill="none"
                stroke="#8b5cf6"
                strokeWidth="2.5"
                className="transition-all duration-300"
                style={{ opacity: activeFactor === "risk" || activeFactor === null ? 1 : 0.4 }}
              />

              {/* Apple Path */}
              <path d="M 0 195 Q 60 175 120 130 T 240 85 T 400 35 L 400 220 L 0 220 Z" fill="url(#appleGradient)" />
              <path
                d="M 0 195 Q 60 175 120 130 T 240 85 T 400 35"
                fill="none"
                stroke="#4f46e5"
                strokeWidth="3.5"
                className="transition-all duration-300"
                style={{ opacity: activeFactor !== "risk" ? 1 : 0.4 }}
              />
            </svg>

            {/* Outcome tag */}
            <div className="absolute bottom-4 left-4 right-4 bg-white/95 dark:bg-slate-900/95 border border-slate-100 dark:border-slate-700 dark:border-slate-700 p-2 rounded-lg text-xs text-slate-500 dark:text-slate-400 shadow-sm flex items-center justify-between">
              <span className="font-semibold text-slate-800 dark:text-slate-100">Outcome Comparison:</span>
              <span className="text-brand-secondary font-bold">Apple ended ahead by €6,009</span>
            </div>
          </div>
        </div>

        {/* Right Side: Factors Comparison Table */}
        <div className="lg:col-span-5 flex flex-col justify-between">
          <div className="border border-slate-100 dark:border-slate-700 rounded-xl overflow-hidden bg-slate-50/30 dark:bg-slate-800/30 text-left">
            <div className="grid grid-cols-3 bg-slate-100/75 dark:bg-slate-800/75 px-3 py-2 text-[10px] font-bold text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700">
              <span>DRIVER</span>
              <span className="text-center text-brand-primary">APPLE</span>
              <span className="text-right text-brand-accent">GOLD</span>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-700">
              {factors.map((factor) => (
                <div
                  key={factor.id}
                  onMouseEnter={() => setActiveFactor(factor.id)}
                  onMouseLeave={() => setActiveFactor(null)}
                  className={`grid grid-cols-3 px-3 py-2.5 items-center cursor-pointer transition-all duration-200 ${
                    activeFactor === factor.id ? "bg-white dark:bg-slate-800 shadow-sm" : "hover:bg-white/50 dark:hover:bg-slate-700/50"
                  }`}
                >
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-slate-800 dark:text-slate-100">{factor.label}</span>
                  </div>
                  <div className="text-center">
                    <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded ${
                      factor.id !== "risk" ? "text-emerald-700 bg-emerald-50" : "text-rose-700 bg-rose-50"
                    }`}>
                      {factor.aValue}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] font-bold font-mono px-1.5 py-0.5 rounded ${
                      factor.id === "risk" ? "text-rose-700 bg-rose-50" : "text-slate-600 dark:text-slate-300 bg-slate-100"
                    }`}>
                      {factor.bValue}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 p-2 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 rounded-lg text-[10px] text-brand-primary text-left">
            💡 Hover rows to highlight driver performance paths in the line chart.
          </div>
        </div>

      </div>
    </div>
  );
}
