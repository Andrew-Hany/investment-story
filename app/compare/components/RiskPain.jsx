"use client";

import React from "react";
import { useTheme } from "../../context/ThemeContext";
import { chartColors } from "./chartColors";

export default function RiskPain({ result, currency }) {
  const { dark } = useTheme();
  const cc = chartColors(dark);
  if (!result || !result.timeline) return null;

  const timeline = result.timeline;
  const tickerA = result.tickerA;
  const tickerB = result.tickerB;

  const getSymbol = () => {
    if (currency === "EUR") return "€";
    if (currency === "GBP") return "£";
    if (currency === "CAD") return "C$";
    if (currency === "EGP") return "E£";
    if (currency === "AED") return "د.إ";
    return "$";
  };

  // 1. CALCULATE MATHEMATICALLY PRECISE DRAWDOWN TIMELINES
  let peakA = 0;
  let peakB = 0;
  const drawdownsA = [];
  const drawdownsB = [];

  timeline.forEach((row) => {
    if (row.wealthA > peakA) peakA = row.wealthA;
    if (row.wealthB > peakB) peakB = row.wealthB;

    const ddA = ((peakA - row.wealthA) / peakA) * 100;
    const ddB = ((peakB - row.wealthB) / peakB) * 100;

    drawdownsA.push(ddA);
    drawdownsB.push(ddB);
  });

  const maxDDA = Math.max(...drawdownsA);
  const maxDDB = Math.max(...drawdownsB);

  // 2. VOLATILITY & RETURN PERIODS ANALYSIS
  const getReturns = (key) => {
    const list = [];
    for (let i = 1; i < timeline.length; i++) {
      const prev = timeline[i - 1][key];
      const curr = timeline[i][key];
      list.push(prev > 0 ? (curr - prev) / prev : 0);
    }
    return list;
  };

  const returnsA = getReturns("wealthA");
  const returnsB = getReturns("wealthB");

  const calcVol = (retList) => {
    if (!retList.length) return 0;
    const mean = retList.reduce((a, b) => a + b, 0) / retList.length;
    const variance = retList.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / retList.length;
    // Scale standard deviation to annualized volatility (approx 252 trading steps)
    return Math.sqrt(variance) * Math.sqrt(252) * 100;
  };

  const volA = Math.min(85, Math.max(8, calcVol(returnsA)));
  const volB = Math.min(85, Math.max(8, calcVol(returnsB)));

  // Worst Month and Worst Year Grouping
  const getWorstPeriods = (key) => {
    const months = {};
    const years = {};

    timeline.forEach((row) => {
      const mKey = row.date.slice(0, 7); // YYYY-MM
      const yKey = row.date.slice(0, 4); // YYYY

      if (!months[mKey]) months[mKey] = [];
      if (!years[yKey]) years[yKey] = [];

      months[mKey].push(row[key]);
      years[yKey].push(row[key]);
    });

    const calcWorst = (grouped) => {
      let worst = 0;
      Object.values(grouped).forEach((list) => {
        if (list.length > 1) {
          const first = list[0];
          const last = list[list.length - 1];
          const ret = (last - first) / first * 100;
          if (ret < worst) worst = ret;
        }
      });
      return worst;
    };

    return {
      worstMonth: calcWorst(months),
      worstYear: calcWorst(years),
    };
  };

  const periodsA = getWorstPeriods("wealthA");
  const periodsB = getWorstPeriods("wealthB");

  const stabWinner = maxDDA <= maxDDB ? tickerA : tickerB;
  const retWinner = result.finalA >= result.finalB ? tickerA : tickerB;

  return (
    <div className="space-y-8 animate-fadeIn text-left">
      
      {/* HEADER */}
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-600 font-mono">
          Stage 3 / Volatility & Drawdown
        </span>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-2">
          How Painful Was the Ride?
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Higher return is not the full story. This stage shows what the investor had to survive.
        </p>
      </div>

      {/* Beginner One-Sentence Summary */}
      <div className="bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800/60 rounded-xl p-4 text-sm font-medium text-slate-700 dark:text-slate-300">
        💡 <strong className="text-slate-900 dark:text-white">{retWinner} delivered higher returns</strong>, but holding it required surviving a much deeper drawdown of <span className="text-rose-600 dark:text-rose-400 font-mono font-bold">-{Math.max(maxDDA, maxDDB).toFixed(1)}%</span> compared to <strong className="text-slate-800 dark:text-slate-200">{stabWinner}'s</strong> milder ride of <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">-{Math.min(maxDDA, maxDDB).toFixed(1)}%</span>.
      </div>

      {/* DRAWDOWN TIMELINE CHART */}
      <div className="bg-white border border-glass-border rounded-2xl p-6 shadow-premium">
        <span className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider block">Historical Drawdowns (% Drop from Peak)</span>
        
        <div className="aspect-[21/8] w-full bg-slate-50/50 rounded-xl p-4 border border-slate-100 mt-4 relative overflow-hidden"
             style={dark ? { backgroundColor: cc.canvasBg, borderColor: "rgba(255,255,255,0.07)" } : {}}>
          <svg className="w-full h-full overflow-visible min-h-[160px]" viewBox="0 0 800 160" preserveAspectRatio="none">
            <defs>
              <linearGradient id="gradRedPain" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.0"/>
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0.12"/>
              </linearGradient>
            </defs>

            {/* Baseline zero */}
            <line x1="0" y1="10" x2="800" y2="10" stroke={cc.baseline} strokeWidth="1.5" />
            
            {/* Grid increments */}
            <line x1="0" y1="50" x2="800" y2="50" stroke={cc.grid} strokeDasharray="3 3" />
            <line x1="0" y1="90" x2="800" y2="90" stroke={cc.grid} strokeDasharray="3 3" />
            <line x1="0" y1="130" x2="800" y2="130" stroke={cc.grid} strokeDasharray="3 3" />

            {(() => {
              const pointsA = [];
              const pointsB = [];
              const maxD = Math.max(maxDDA, maxDDB, 15);

              const scaleY = (ddVal) => {
                const ratio = ddVal / maxD;
                return 10 + ratio * 130; // 10 is baseline, scaling downwards!
              };

              const steps = timeline.length;
              timeline.forEach((_, idx) => {
                const x = (idx / (steps - 1)) * 800;
                pointsA.push(`${x},${scaleY(drawdownsA[idx])}`);
                pointsB.push(`${x},${scaleY(drawdownsB[idx])}`);
              });

              return (
                <>
                  {/* RED PAIN AREA UNDER CURVE A */}
                  <path d={`M 0,10 L ${pointsA.join(" L ")} L 800,10 Z`} fill="url(#gradRedPain)" />
                  
                  {/* RED PAIN AREA UNDER CURVE B */}
                  <path d={`M 0,10 L ${pointsB.join(" L ")} L 800,10 Z`} fill="url(#gradRedPain)" />

                  {/* TICKER A LINE (Blue Outline) */}
                  <path d={`M ${pointsA.join(" L ")}`} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />

                  {/* TICKER B LINE (Purple Outline) */}
                  <path d={`M ${pointsB.join(" L ")}`} fill="none" stroke="#7c3aed" strokeWidth="1.75" strokeLinecap="round" />
                </>
              );
            })()}
          </svg>
        </div>

        <div className="flex gap-6 justify-center text-xs font-mono mt-3">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" />{tickerA} Max Peak Drop</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-purple-500" />{tickerB} Max Peak Drop</span>
        </div>
      </div>

      {/* VOLATILITY AND PAIN METRIC CARDS */}
      <div className="space-y-6">
        
        {/* Volatility Card (Fills Whole Width because it contains both) */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-premium">
          <div className="border-b border-slate-100 pb-3 mb-6">
            <span className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">Historical Turbulence</span>
            <h4 className="text-lg font-extrabold text-slate-900 mt-1">Annualized Volatility Comparison</h4>
            <p className="text-xs text-slate-500 mt-1">
              Measures how violently the stock price moved day-to-day. A wider bar represents higher investor anxiety.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono font-bold">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-blue-500"/>{tickerA} Volatility</span>
                <span className="text-blue-600">{volA.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full transition-all" style={{ width: `${volA}%` }} />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono font-bold">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-purple-500"/>{tickerB} Volatility</span>
                <span className="text-purple-600">{volB.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                <div className="bg-purple-500 h-full rounded-full transition-all" style={{ width: `${volB}%` }} />
              </div>
            </div>
          </div>
        </div>

        {/* Survivor Cards (Side by side matching each company's column) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          
          {/* Ticker A Pain Metrics (Left Half) */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-premium space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">{tickerA} Drawdown Intensity</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-600 font-mono uppercase border border-blue-100">
                {tickerA} Left
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[9px] font-mono text-slate-400 uppercase">Worst Month</span>
                <strong className="block text-lg text-rose-600 font-mono mt-0.5">{periodsA.worstMonth.toFixed(1)}%</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[9px] font-mono text-slate-400 uppercase">Worst Year</span>
                <strong className="block text-lg text-rose-600 font-mono mt-0.5">{periodsA.worstYear.toFixed(1)}%</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 col-span-2 flex justify-between items-center">
                <div>
                  <span className="text-[9px] font-mono text-slate-400 uppercase block">Maximum Peak-to-Trough Drop</span>
                  <p className="text-[11px] text-slate-400 mt-0.5">The worst paper loss experienced during the holding ride.</p>
                </div>
                <strong className="text-2xl text-slate-900 font-mono tracking-tight font-extrabold">-{maxDDA.toFixed(1)}%</strong>
              </div>
            </div>
          </div>

          {/* Ticker B Pain Metrics (Right Half) */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-premium space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <span className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">{tickerB} Drawdown Intensity</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-600 font-mono uppercase border border-purple-100">
                {tickerB} Right
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[9px] font-mono text-slate-400 uppercase">Worst Month</span>
                <strong className="block text-lg text-rose-600 font-mono mt-0.5">{periodsB.worstMonth.toFixed(1)}%</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-[9px] font-mono text-slate-400 uppercase">Worst Year</span>
                <strong className="block text-lg text-rose-600 font-mono mt-0.5">{periodsB.worstYear.toFixed(1)}%</strong>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 col-span-2 flex justify-between items-center">
                <div>
                  <span className="text-[9px] font-mono text-slate-400 uppercase block">Maximum Peak-to-Trough Drop</span>
                  <p className="text-[11px] text-slate-400 mt-0.5">The worst paper loss experienced during the holding ride.</p>
                </div>
                <strong className="text-2xl text-slate-900 font-mono tracking-tight font-extrabold">-{maxDDB.toFixed(1)}%</strong>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* VERDICT CARD */}
      <div className="bg-rose-50/50 border border-rose-100/50 rounded-2xl p-6 space-y-4">
        <div>
          <span className="text-[10px] font-extrabold text-rose-600 uppercase font-mono tracking-wider">
            Risk & Stability Verdict
          </span>
          <div className="space-y-1 mt-1">
            <h4 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              🛡️ Low-Pain Leader: <span className="font-mono text-emerald-600">{stabWinner}</span>
            </h4>
            <h5 className="text-xs text-slate-500 font-mono">
              (Returns Leader over timeline: {retWinner})
            </h5>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-rose-100/50 pt-4 text-xs">
          <div>
            <span className="block text-[10px] text-rose-400 font-bold uppercase tracking-wider font-mono">Did it change the final winner?</span>
            <strong className="text-slate-800 block mt-1">
              {stabWinner === retWinner 
                ? "No — the returns leader was also the most stable asset." 
                : `Yes — stability was different. ${retWinner} delivered the final payout winner, but required surviving much deeper drawdowns.`
              }
            </strong>
          </div>
          <div>
            <span className="block text-[10px] text-rose-400 font-bold uppercase tracking-wider font-mono">Plain-English Explanation</span>
            <p className="text-slate-600 mt-1 leading-relaxed">
              While <strong className="font-mono">{retWinner}</strong> delivered the highest ending return, <strong className="font-mono">{stabWinner}</strong> offered a far more stable holding ride with a smaller peak drawdown of <strong>{Math.min(maxDDA, maxDDB).toFixed(1)}%</strong>, saving the investor from emotional capital capitulation.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
