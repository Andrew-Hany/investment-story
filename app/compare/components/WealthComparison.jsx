"use client";

import React, { useState, useRef } from "react";
import { useTheme } from "../../context/ThemeContext";
import { chartColors } from "./chartColors";

export default function WealthComparison({ result, currency, initialAmount, years }) {
  const { dark } = useTheme();
  const cc = chartColors(dark);
  const [hoverIdx, setHoverIdx] = useState(null);
  const mainChartRef = useRef(null);
  const chartARef = useRef(null);
  const chartBRef = useRef(null);

  if (!result) return null;

  const timeline = result.timeline;
  const finalA = result.finalA;
  const finalB = result.finalB;
  const finalPriceA = result.finalPriceA || finalA;
  const finalPriceB = result.finalPriceB || finalB;
  const tickerA = result.tickerA;
  const tickerB = result.tickerB;
  const companyA = result.fundA?.company || {};
  const companyB = result.fundB?.company || {};

  // Exact mathematically calculated final dividends delta
  const finalDivA = finalA - finalPriceA;
  const finalDivB = finalB - finalPriceB;

  const pctPriceA = (finalPriceA / finalA) * 100;
  const pctDivA = (finalDivA / finalA) * 100;

  const pctPriceB = (finalPriceB / finalB) * 100;
  const pctDivB = (finalDivB / finalB) * 100;

  const getSymbol = () => {
    if (currency === "EUR") return "€";
    if (currency === "GBP") return "£";
    if (currency === "CAD") return "C$";
    if (currency === "EGP") return "E£";
    if (currency === "AED") return "د.إ";
    return "$";
  };

  const companyDescription = (ticker, company) => {
    const name = company.longName || company.shortName || ticker;
    const descriptions = {
      AAPL: "Apple designs and sells iPhones, Macs, iPads, wearables, and services such as App Store, iCloud, Apple Music, and AppleCare. Its business combines premium hardware, software, and a large services ecosystem.",
      ABNB: "Airbnb runs a global travel marketplace where hosts list homes, apartments, and experiences, and travelers book stays directly through the platform. Its business depends on network scale, trust, search, pricing tools, and travel demand.",
      NVDA: "NVIDIA designs graphics processors and AI accelerators used in data centers, gaming PCs, professional visualization, cars, and robotics. Its business is driven by chips, systems, software, and developer platforms for accelerated computing.",
      MSFT: "Microsoft sells productivity software, cloud infrastructure, business applications, gaming, Windows, and AI tools. Its largest engines include Azure, Microsoft 365, LinkedIn, Dynamics, Windows, and Xbox.",
      AMZN: "Amazon operates a large online marketplace, logistics network, cloud platform, advertising business, and subscription ecosystem. Its business mixes retail scale with high-margin services such as AWS and ads.",
      GOOGL: "Alphabet owns Google Search, YouTube, Android, Google Cloud, and advertising technology. Its core business monetizes user attention and intent through ads, while Cloud and AI add enterprise growth.",
      GOOG: "Alphabet owns Google Search, YouTube, Android, Google Cloud, and advertising technology. Its core business monetizes user attention and intent through ads, while Cloud and AI add enterprise growth.",
      META: "Meta runs Facebook, Instagram, WhatsApp, Messenger, and Threads. Its business mainly sells digital advertising across social platforms, while also investing in AI, messaging, and virtual reality.",
      TSLA: "Tesla designs and sells electric vehicles, energy storage systems, solar products, and charging infrastructure. Its business combines manufacturing scale, software, batteries, and energy products.",
      NFLX: "Netflix sells streaming entertainment subscriptions and advertising-supported plans. Its business depends on global content, recommendation technology, subscriber retention, and pricing power.",
    };

    if (descriptions[ticker]) return descriptions[ticker];
    if (company.industry || company.sector) {
      return `${name} is a ${company.industry || company.sector} company. This section will describe the business model more specifically as richer company profile data is added.`;
    }
    return `${name} is a public company. A richer business description is not available in the local fundamentals data yet.`;
  };

  const CompanyStoryCard = ({ sideLabel, ticker, company, pctDiv, pctPrice, accent, rationaleType }) => {
    const name = company.longName || company.shortName || ticker;
    const accentClasses = accent === "blue"
      ? "bg-blue-50 text-blue-700 border-blue-100"
      : "bg-purple-50 text-purple-700 border-purple-100";

    return (
      <div className="p-6 sm:p-8 space-y-5">
        <div className="space-y-3">
          <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-bold font-mono uppercase ${accentClasses}`}>
            {sideLabel}
          </span>
          <div>
            <h3 className="text-2xl font-black text-slate-900 font-mono">{ticker}</h3>
            <p className="mt-1 text-sm font-bold text-slate-700">{name}</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">
              {companyDescription(ticker, company)}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">What the company does</div>
          <p className="text-sm leading-relaxed text-slate-700">
            {companyDescription(ticker, company)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {company.sector && (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
              {company.sector}
            </span>
          )}
          {company.industry && (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
              {company.industry}
            </span>
          )}
          {company.country && (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
              {company.country}
            </span>
          )}
        </div>

        <div className="rounded-xl border border-slate-100 bg-white p-4">
          <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">Why returns compounded</div>
          <p className="text-xs text-slate-600 leading-relaxed">
            {rationaleType === "growth" ? (
              <>
                {ticker} behaved like a capital-appreciation story in this period. Dividends were small at {pctDiv.toFixed(1)}%, so roughly {pctPrice.toFixed(0)}% of the result came from price growth.
              </>
            ) : (
              <>
                {ticker} behaved like a cash-flow compounding story in this period. Reinvested payouts added about {pctDiv.toFixed(1)}% to the ending value, on top of price movement.
              </>
            )}
          </p>
        </div>
      </div>
    );
  };

  const handleMainMouseMove = (e) => {
    if (!timeline.length || !mainChartRef.current) return;
    const rect = mainChartRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.min(1, Math.max(0, x / rect.width));
    const idx = Math.round(pct * (timeline.length - 1));
    setHoverIdx(idx);
  };

  const handleChartAMouseMove = (e) => {
    if (!timeline.length || !chartARef.current) return;
    const rect = chartARef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.min(1, Math.max(0, x / rect.width));
    const idx = Math.round(pct * (timeline.length - 1));
    setHoverIdx(idx);
  };

  const handleChartBMouseMove = (e) => {
    if (!timeline.length || !chartBRef.current) return;
    const rect = chartBRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.min(1, Math.max(0, x / rect.width));
    const idx = Math.round(pct * (timeline.length - 1));
    setHoverIdx(idx);
  };

  const hoveredData = hoverIdx !== null ? timeline[hoverIdx] : null;

  return (
    <div className="space-y-8 animate-fadeIn text-left">
      
      {/* SECTION TITLE & CONTEXT */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-brand-primary font-mono">
            Stage 1
          </span>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-2">
            Who Won?
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Historical Trajectory: We plot the complete month-by-month journey of your capital (including dividends and FX effects) to visualize how the final wealth gap was formed over time.
          </p>
        </div>
      </div>

      {/* Beginner One-Sentence Summary */}
      <div className="bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800/60 rounded-xl p-4 text-sm font-medium text-slate-700 dark:text-slate-300">
        💡 <strong className="text-slate-900 dark:text-white">{finalA >= finalB ? tickerA : tickerB} won</strong> mainly because price growth dominated every other return driver, turning your starting capital into a final sum of {getSymbol()}{Math.round(Math.max(finalA, finalB)).toLocaleString()}.
      </div>

      {/* 1. DYNAMIC COMPARATIVE TIMELINE */}
      <div className="bg-white border border-glass-border rounded-2xl p-6 shadow-premium relative">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-3 mb-6 gap-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">Historical Wealth Accumulation</span>
          <div className="flex gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5 font-bold">
              <span className="h-2.5 w-2.5 rounded bg-brand-primary" />
              {tickerA}: {getSymbol()}{Math.round(hoveredData ? hoveredData.wealthA : finalA).toLocaleString()}
            </span>
            <span className="flex items-center gap-1.5 font-bold">
              <span className="h-2.5 w-2.5 rounded bg-brand-accent" />
              {tickerB}: {getSymbol()}{Math.round(hoveredData ? hoveredData.wealthB : finalB).toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400 font-bold ml-2 hidden sm:inline">(Dashed lines = Price return only)</span>
          </div>
        </div>

        <div 
          ref={mainChartRef}
          onMouseMove={handleMainMouseMove}
          onMouseLeave={() => setHoverIdx(null)}
          className="aspect-[21/8] w-full bg-slate-50/50 rounded-xl p-4 border border-slate-100 relative cursor-crosshair overflow-hidden"
          style={dark ? { backgroundColor: cc.canvasBg, borderColor: "rgba(255,255,255,0.07)" } : {}}
        >
          <svg className="w-full h-full overflow-visible min-h-[220px]" viewBox="0 0 800 240" preserveAspectRatio="none">
            <defs>
              <linearGradient id="gradMainA" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity={cc.fillOpacityA}/>
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0"/>
              </linearGradient>
              <linearGradient id="gradMainB" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7c3aed" stopOpacity={cc.fillOpacityB}/>
                <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.0"/>
              </linearGradient>
            </defs>

            {/* Grid lines */}
            <line x1="0" y1="200" x2="800" y2="200" stroke={cc.grid} strokeWidth="1.5" />
            <line x1="0" y1="150" x2="800" y2="150" stroke={cc.grid} strokeWidth="1" strokeDasharray="3 3" />
            <line x1="0" y1="100" x2="800" y2="100" stroke={cc.grid} strokeWidth="1" strokeDasharray="3 3" />
            <line x1="0" y1="50"  x2="800" y2="50"  stroke={cc.grid} strokeWidth="1" strokeDasharray="3 3" />

            {(() => {
              const pointsA = [];
              const pointsB = [];
              const pointsPriceA = [];
              const pointsPriceB = [];
              const maxVal = Math.max(finalA, finalB, initialAmount * 1.2);
              const minVal = Math.min(initialAmount * 0.8, ...timeline.map(t => Math.min(t.priceWealthA || t.wealthA, t.priceWealthB || t.wealthB)));
              
              const scaleY = (val) => {
                const ratio = (val - minVal) / (maxVal - minVal);
                return 210 - ratio * 180;
              };

              const stepsCount = timeline.length;
              
              timeline.forEach((item, idx) => {
                const x = (idx / (stepsCount - 1)) * 800;
                pointsA.push(`${x},${scaleY(item.wealthA)}`);
                pointsB.push(`${x},${scaleY(item.wealthB)}`);
                pointsPriceA.push(`${x},${scaleY(item.priceWealthA || item.wealthA)}`);
                pointsPriceB.push(`${x},${scaleY(item.priceWealthB || item.wealthB)}`);
              });

              const lineX = hoverIdx !== null ? (hoverIdx / (stepsCount - 1)) * 800 : null;

              return (
                <>
                  <path d={`M 0,220 L ${pointsA.join(" L ")} L 800,220 Z`} fill="url(#gradMainA)" />
                  <path d={`M 0,220 L ${pointsB.join(" L ")} L 800,220 Z`} fill="url(#gradMainB)" />

                  <path d={`M ${pointsB.join(" L ")}`} fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" />
                  <path d={`M ${pointsA.join(" L ")}`} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />

                  <path d={`M ${pointsPriceB.join(" L ")}`} fill="none" stroke="#7c3aed" strokeWidth="1.5" strokeDasharray="5 5" strokeOpacity="0.6" strokeLinecap="round" />
                  <path d={`M ${pointsPriceA.join(" L ")}`} fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="5 5" strokeOpacity="0.6" strokeLinecap="round" />

                  {lineX !== null && hoveredData && (
                    <g>
                      <line x1={lineX} y1="10" x2={lineX} y2="220" stroke={cc.crosshair} strokeWidth="1" strokeDasharray="3 3" />
                      
                      <circle cx={lineX} cy={scaleY(hoveredData.priceWealthA || hoveredData.wealthA)} r="3" fill="none" stroke="#3b82f6" strokeWidth="1.5" opacity="0.6" />
                      <circle cx={lineX} cy={scaleY(hoveredData.priceWealthB || hoveredData.wealthB)} r="3" fill="none" stroke="#7c3aed" strokeWidth="1.5" opacity="0.6" />

                      <circle cx={lineX} cy={scaleY(hoveredData.wealthA)} r="5" fill="#3b82f6" stroke={cc.dotStroke} strokeWidth="1.5" className="shadow-md" />
                      <circle cx={lineX} cy={scaleY(hoveredData.wealthB)} r="5" fill="#7c3aed" stroke={cc.dotStroke} strokeWidth="1.5" className="shadow-md" />
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
              <div className="flex flex-col">
                <span className="text-blue-400 font-bold">{tickerA}: {getSymbol()}{Math.round(hoveredData.wealthA).toLocaleString()}</span>
                <span className="text-blue-400/60 text-[8px] mt-0.5">Price: {getSymbol()}{Math.round(hoveredData.priceWealthA || hoveredData.wealthA).toLocaleString()}</span>
              </div>
              <span className="text-slate-700">|</span>
              <div className="flex flex-col">
                <span className="text-purple-400 font-bold">{tickerB}: {getSymbol()}{Math.round(hoveredData.wealthB).toLocaleString()}</span>
                <span className="text-purple-400/60 text-[8px] mt-0.5">Price: {getSymbol()}{Math.round(hoveredData.priceWealthB || hoveredData.wealthB).toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>
      </div>


      {/* 3. IN-DEPTH SIDE-BY-SIDE WRITE-UP (WITH VERTICAL BORDER) */}
      <div className="bg-white border border-glass-border rounded-3xl shadow-premium overflow-hidden grid grid-cols-1 md:grid-cols-2 relative">
        <div className="hidden md:block absolute top-0 bottom-0 left-1/2 w-0.5 bg-slate-100 -translate-x-1/2" />

        <CompanyStoryCard
          sideLabel="Left Asset Story"
          ticker={tickerA}
          company={companyA}
          pctDiv={pctDivA}
          pctPrice={pctPriceA}
          accent="blue"
          rationaleType={pctDivA > 5 ? "cash" : "growth"}
        />

        <CompanyStoryCard
          sideLabel="Right Asset Story"
          ticker={tickerB}
          company={companyB}
          pctDiv={pctDivB}
          pctPrice={pctPriceB}
          accent="purple"
          rationaleType={pctDivB > 5 ? "cash" : "growth"}
        />
      </div>

    </div>
  );
}
