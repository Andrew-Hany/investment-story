"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "../../context/ThemeContext";
import { chartColors } from "./chartColors";

export default function DividendsReinvestment({ result, currency }) {
  const { dark } = useTheme();
  const cc = chartColors(dark);
  const [dataA, setDataA] = useState(null);
  const [dataB, setDataB] = useState(null);
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);

  const tickerA = result?.tickerA;
  const tickerB = result?.tickerB;
  const timeline = result?.timeline || [];
  const initialAmount = result?.timeline?.[0]?.wealthA ? 10000 : 10000; // Fallback or dynamic check

  const getSymbol = () => {
    if (currency === "EUR") return "€";
    if (currency === "GBP") return "£";
    if (currency === "CAD") return "C$";
    if (currency === "EGP") return "E£";
    if (currency === "AED") return "د.إ";
    return "$";
  };

  useEffect(() => {
    if (!tickerA || !tickerB) return;
    
    async function loadData() {
      setLoading(true);
      try {
        const [resA, resB, fxData] = await Promise.all([
          fetch(`/data/prices/${tickerA.toUpperCase()}.json`).then(r => r.ok ? r.json() : null),
          fetch(`/data/prices/${tickerB.toUpperCase()}.json`).then(r => r.ok ? r.json() : null),
          currency !== "USD" 
            ? fetch(`/data/fx/USD_${currency}.json`).then(r => r.ok ? r.json() : null)
            : null
        ]);

        setDataA(resA);
        setDataB(resB);
        if (fxData && fxData.rates) {
          setRates(fxData.rates);
        }
      } catch (err) {
        console.error("Error loading dividend simulation data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [tickerA, tickerB, currency]);

  if (loading) {
    return (
      <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-premium text-center">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-slate-100 rounded w-1/4 mx-auto" />
          <div className="h-8 bg-slate-100 rounded w-1/2 mx-auto" />
          <div className="h-32 bg-slate-100 rounded" />
        </div>
      </div>
    );
  }

  // Determine starting and ending dates
  const startLimitStr = timeline[0]?.date || "";
  const endLimitStr = timeline[timeline.length - 1]?.date || "";

  // Get FX Rate for final USD conversion
  const startRate = rates.find(r => r.date >= startLimitStr)?.rate || 1.0;
  const endRate = rates.find(r => r.date <= endLimitStr)?.rate || 1.0;

  // Convert initial amount to USD for realistic stock purchase counts
  const initialUSD = currency !== "USD" ? 10000 / startRate : 10000;

  // Filter raw price files
  const pricesA = (dataA?.prices || []).filter(p => p.date >= startLimitStr && p.date <= endLimitStr);
  const pricesB = (dataB?.prices || []).filter(p => p.date >= startLimitStr && p.date <= endLimitStr);

  const startPriceA = pricesA[0]?.close || 1;
  const startPriceB = pricesB[0]?.close || 1;

  // 1. Simulating Share Compounding for Ticker A
  let currentSharesA = initialUSD / startPriceA;
  let initialSharesA = currentSharesA;
  let sharesFromDividendsA = 0;
  const divTimelineA = [];

  pricesA.forEach(p => {
    if (p.dividends > 0) {
      const cashReceived = currentSharesA * p.dividends;
      const sharesBought = cashReceived / p.close;
      currentSharesA += sharesBought;
      sharesFromDividendsA += sharesBought;

      divTimelineA.push({
        date: p.date,
        year: new Date(p.date).getFullYear(),
        cashUSD: cashReceived,
        dividends: p.dividends
      });
    }
  });

  const finalCloseA = pricesA[pricesA.length - 1]?.close || 1;
  const priceOnlyUSDA = initialSharesA * finalCloseA;
  const reinvestedUSDA = currentSharesA * finalCloseA;

  const priceOnlyValA = currency !== "USD" ? priceOnlyUSDA * endRate : priceOnlyUSDA;
  const reinvestedValA = currency !== "USD" ? reinvestedUSDA * endRate : reinvestedUSDA;
  const boostA = reinvestedValA - priceOnlyValA;
  const boostPctA = priceOnlyValA > 0 ? (boostA / priceOnlyValA) * 100 : 0;

  // 2. Simulating Share Compounding for Ticker B
  let currentSharesB = initialUSD / startPriceB;
  let initialSharesB = currentSharesB;
  let sharesFromDividendsB = 0;
  const divTimelineB = [];

  pricesB.forEach(p => {
    if (p.dividends > 0) {
      const cashReceived = currentSharesB * p.dividends;
      const sharesBought = cashReceived / p.close;
      currentSharesB += sharesBought;
      sharesFromDividendsB += sharesBought;

      divTimelineB.push({
        date: p.date,
        year: new Date(p.date).getFullYear(),
        cashUSD: cashReceived,
        dividends: p.dividends
      });
    }
  });

  const finalCloseB = pricesB[pricesB.length - 1]?.close || 1;
  const priceOnlyUSDB = initialSharesB * finalCloseB;
  const reinvestedUSDB = currentSharesB * finalCloseB;

  const priceOnlyValB = currency !== "USD" ? priceOnlyUSDB * endRate : priceOnlyUSDB;
  const reinvestedValB = currency !== "USD" ? reinvestedUSDB * endRate : reinvestedUSDB;
  const boostB = reinvestedValB - priceOnlyValB;
  const boostPctB = priceOnlyValB > 0 ? (boostB / priceOnlyValB) * 100 : 0;

  // Impact categorizer
  const getImpact = (pct) => {
    if (pct < 0.1) return { text: "None", style: "bg-slate-50 text-slate-400" };
    if (pct < 1.5) return { text: "Tiny", style: "bg-blue-50 text-blue-600" };
    if (pct < 6.0) return { text: "Small", style: "bg-indigo-50 text-indigo-600" };
    if (pct < 15.0) return { text: "Meaningful", style: "bg-emerald-50 text-emerald-600" };
    return { text: "Major", style: "bg-teal-50 text-teal-700 font-extrabold" };
  };

  const impactA = getImpact(boostPctA);
  const impactB = getImpact(boostPctB);

  // Verdict calculation
  const totalDivA = divTimelineA.reduce((sum, item) => sum + item.cashUSD, 0) * (currency !== "USD" ? endRate : 1);
  const totalDivB = divTimelineB.reduce((sum, item) => sum + item.cashUSD, 0) * (currency !== "USD" ? endRate : 1);

  const divWinner = totalDivA >= totalDivB ? tickerA : tickerB;
  const priceOnlyWinner = priceOnlyValA >= priceOnlyValB ? tickerA : tickerB;
  const finalWinner = reinvestedValA >= reinvestedValB ? tickerA : tickerB;
  const changedWinner = priceOnlyWinner !== finalWinner;

  const hasDivA = divTimelineA.length > 0;
  const hasDivB = divTimelineB.length > 0;
  const hasAnyDividends = hasDivA || hasDivB;

  // Chart preparation
  const allDivEvents = [];
  divTimelineA.forEach(d => {
    allDivEvents.push({ date: d.date, year: d.year, cash: d.cashUSD * (currency !== "USD" ? endRate : 1), ticker: tickerA });
  });
  divTimelineB.forEach(d => {
    allDivEvents.push({ date: d.date, year: d.year, cash: d.cashUSD * (currency !== "USD" ? endRate : 1), ticker: tickerB });
  });
  allDivEvents.sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="space-y-8 animate-fadeIn text-left">
      
      {/* HEADER */}
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 font-mono">
          Stage 4 / Dividends & Reinvestment
        </span>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-2">
          Did Cash Payouts Change the Winner?
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Dividends are cash paid by the company. If reinvested, they buy more shares and create a small compounding boost.
        </p>
      </div>

      {/* Beginner One-Sentence Summary */}
      <div className="bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800/60 rounded-xl p-4 text-sm font-medium text-slate-700 dark:text-slate-300">
        💡 <strong className="text-slate-900 dark:text-white">{divWinner} paid more dividends</strong>, but they were <strong className="text-slate-800 dark:text-slate-200">{changedWinner ? "large enough to change the final winner!" : "not large enough to change the final winner."}</strong>
      </div>

      {/* 1. DIVIDEND CASH TIMELINE CHART */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-premium">
        <div className="border-b border-slate-100 pb-3 mb-4">
          <span className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">Dividend Payout History</span>
          <h4 className="text-md font-bold text-slate-900 mt-0.5">Timeline of Cash Payouts Received</h4>
        </div>

        {!hasAnyDividends ? (
          <div className="p-8 bg-slate-50 border border-slate-100 rounded-xl text-center text-slate-500 text-xs font-medium">
            ⚠️ No meaningful dividend payments during this period.
            <p className="mt-1 text-[11px] text-slate-400">
              Both {tickerA} and {tickerB} have focused entirely on asset/price appreciation and stock buybacks rather than cash distributions.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="aspect-[21/6] w-full bg-slate-50/50 rounded-xl p-4 border border-slate-100 relative overflow-hidden"
                 style={dark ? { backgroundColor: cc.canvasBg, borderColor: "rgba(255,255,255,0.07)" } : {}}>
              <svg className="w-full h-full overflow-visible" viewBox="0 0 800 120" preserveAspectRatio="none">
                {(() => {
                  const maxCash = Math.max(...allDivEvents.map(e => e.cash), 10);
                  const midCash = maxCash / 2;
                  const startYear = new Date(startLimitStr).getFullYear();
                  const endYear = new Date(endLimitStr).getFullYear();
                  
                  // Left-shifted scale to allow 50px gutter for Y-Axis labels
                  const scaleX = (dateStr) => {
                    const tStart = new Date(startLimitStr).getTime();
                    const tEnd = new Date(endLimitStr).getTime();
                    const tCurr = new Date(dateStr).getTime();
                    return 55 + ((tCurr - tStart) / (tEnd - tStart)) * 725;
                  };

                  const scaleY = (val) => 100 - (val / maxCash) * 80;

                  return (
                    <>
                      {/* Y-Axis Value Labels (Gutter on Left) */}
                      <text x="10" y="24" fill="#94a3b8" fontSize="8" fontFamily="monospace" fontWeight="bold">
                        {getSymbol()}{Math.round(maxCash).toLocaleString()}
                      </text>
                      <text x="10" y="64" fill="#94a3b8" fontSize="8" fontFamily="monospace" fontWeight="bold">
                        {getSymbol()}{Math.round(midCash).toLocaleString()}
                      </text>
                      <text x="10" y="104" fill="#94a3b8" fontSize="8" fontFamily="monospace" fontWeight="bold">
                        {getSymbol()}0
                      </text>

                      {/* Grid Lines */}
                      <line x1="50" y1="100" x2="780" y2="100" stroke={cc.gridStrong} strokeWidth="1.5" />
                      <line x1="50" y1="60"  x2="780" y2="60"  stroke={cc.grid} strokeWidth="1" strokeDasharray="3 3" />
                      <line x1="50" y1="20"  x2="780" y2="20"  stroke={cc.grid} strokeWidth="1" strokeDasharray="3 3" />

                      {/* Year Indicators */}
                      {Array.from({ length: endYear - startYear + 1 }).map((_, idx) => {
                        const y = startYear + idx;
                        const x = scaleX(`${y}-06-01`);
                        if (x < 50 || x > 780) return null;
                        return (
                          <g key={y}>
                            <line x1={x} y1="96" x2={x} y2="104" stroke={cc.baseline} strokeWidth="1" />
                            <text x={x} y="112" textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="monospace">
                              {y}
                            </text>
                          </g>
                        );
                      })}

                      {/* Vertical bars/dots with hover details */}
                      {allDivEvents.map((evt, idx) => {
                        const x = scaleX(evt.date);
                        const y = scaleY(evt.cash);
                        const color = evt.ticker === tickerA ? "#3b82f6" : "#7c3aed";
                        return (
                          <g key={idx} className="group cursor-help">
                            {/* Stem */}
                            <line x1={x} y1="100" x2={x} y2={y} stroke={color} strokeWidth="2.5" strokeLinecap="round" className="opacity-80 group-hover:opacity-100 transition-opacity" />
                            {/* Cap dot */}
                            <circle cx={x} cy={y} r="3.5" fill={color} stroke={cc.dotStroke} strokeWidth="1" className="group-hover:r-[4.5] transition-all" />
                            
                            {/* Label showing exact payment value above the dot */}
                            <text x={x} y={y - 8} textAnchor="middle" fill={color} fontSize="8" fontFamily="monospace" fontWeight="bold" className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                              {getSymbol()}{evt.cash.toFixed(2)}
                            </text>
                          </g>
                        );
                      })}
                    </>
                  );
                })()}
              </svg>
            </div>
            
            <div className="flex gap-6 justify-center text-xs font-mono">
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                {tickerA} Cash Received ({divTimelineA.length} payments)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
                {tickerB} Cash Received ({divTimelineB.length} payments)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 2. REINVESTMENT SHARES STORY */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Asset A Share Compounding Story */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-premium space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h4 className="text-sm font-bold text-slate-900">{tickerA} Share Count Compounding</h4>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100 font-mono uppercase">
              {tickerA} Left
            </span>
          </div>

          <div className="space-y-4">
            <p className="text-xs text-slate-500 leading-relaxed">
              Every dividend payout buys a tiny fraction of a share, which immediately increases the size of subsequent dividends.
            </p>

            <div className="flex items-center justify-between gap-2 p-4 bg-slate-50/50 border border-slate-100 rounded-xl font-mono text-center">
              <div>
                <span className="text-[9px] text-slate-400 uppercase block">Started with</span>
                <strong className="text-sm text-slate-800 font-extrabold">{initialSharesA.toFixed(2)}</strong>
                <span className="text-[10px] text-slate-400 block mt-0.5">shares</span>
                <span className="text-[9px] text-blue-500 font-bold block mt-1">({getSymbol()}{Math.round(initialAmount).toLocaleString()})</span>
              </div>
              
              <div className="text-blue-400 text-lg font-bold">→</div>
              
              <div>
                <span className="text-[9px] text-slate-400 uppercase block">Reinvested Boost</span>
                <strong className="text-sm text-blue-600 font-extrabold">+{sharesFromDividendsA.toFixed(2)}</strong>
                <span className="text-[10px] text-blue-400 block mt-0.5">extra shares</span>
                <span className="text-[9px] text-emerald-600 font-bold block mt-1">(+{getSymbol()}{Math.round(boostA).toLocaleString()})</span>
              </div>
              
              <div className="text-blue-400 text-lg font-bold">→</div>

              <div>
                <span className="text-[9px] text-slate-400 uppercase block">Final Shares</span>
                <strong className="text-sm text-slate-900 font-extrabold">{currentSharesA.toFixed(2)}</strong>
                <span className="text-[10px] text-slate-400 block mt-0.5">total shares</span>
                <span className="text-[9px] text-slate-900 font-extrabold block mt-1">({getSymbol()}{Math.round(reinvestedValA).toLocaleString()})</span>
              </div>
            </div>
          </div>
        </div>

        {/* Asset B Share Compounding Story */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-premium space-y-6">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h4 className="text-sm font-bold text-slate-900">{tickerB} Share Count Compounding</h4>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-600 border border-purple-100 font-mono uppercase">
              {tickerB} Right
            </span>
          </div>

          <div className="space-y-4">
            <p className="text-xs text-slate-500 leading-relaxed">
              Every dividend payout buys a tiny fraction of a share, which immediately increases the size of subsequent dividends.
            </p>

            <div className="flex items-center justify-between gap-2 p-4 bg-slate-50/50 border border-slate-100 rounded-xl font-mono text-center">
              <div>
                <span className="text-[9px] text-slate-400 uppercase block">Started with</span>
                <strong className="text-sm text-slate-800 font-extrabold">{initialSharesB.toFixed(2)}</strong>
                <span className="text-[10px] text-slate-400 block mt-0.5">shares</span>
                <span className="text-[9px] text-blue-500 font-bold block mt-1">({getSymbol()}{Math.round(initialAmount).toLocaleString()})</span>
              </div>
              
              <div className="text-purple-400 text-lg font-bold">→</div>
              
              <div>
                <span className="text-[9px] text-slate-400 uppercase block">Reinvested Boost</span>
                <strong className="text-sm text-purple-600 font-extrabold">+{sharesFromDividendsB.toFixed(2)}</strong>
                <span className="text-[10px] text-purple-400 block mt-0.5">extra shares</span>
                <span className="text-[9px] text-emerald-600 font-bold block mt-1">(+{getSymbol()}{Math.round(boostB).toLocaleString()})</span>
              </div>
              
              <div className="text-purple-400 text-lg font-bold">→</div>

              <div>
                <span className="text-[9px] text-slate-400 uppercase block">Final Shares</span>
                <strong className="text-sm text-slate-900 font-extrabold">{currentSharesB.toFixed(2)}</strong>
                <span className="text-[10px] text-slate-400 block mt-0.5">total shares</span>
                <span className="text-[9px] text-slate-900 font-extrabold block mt-1">({getSymbol()}{Math.round(reinvestedValB).toLocaleString()})</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* 3. FINAL DIVIDEND BOOST */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Ticker A Comparison Card */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-premium space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">{tickerA} Return Decomposition</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${impactA.style} font-mono uppercase`}>
              Impact: {impactA.text}
            </span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-50">
              <span className="text-slate-500">Price-Only final value:</span>
              <strong className="text-slate-800">{getSymbol()}{Math.round(priceOnlyValA).toLocaleString()}</strong>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-50">
              <span className="text-slate-500">With reinvestment value:</span>
              <strong className="text-slate-900 font-bold">{getSymbol()}{Math.round(reinvestedValA).toLocaleString()}</strong>
            </div>
            <div className="flex justify-between py-1.5 text-blue-600 font-bold bg-blue-50/30 px-2 rounded">
              <span>Dividend cash boost:</span>
              <span>+{getSymbol()}{Math.round(boostA).toLocaleString()} (+{boostPctA.toFixed(2)}%)</span>
            </div>
          </div>
        </div>

        {/* Ticker B Comparison Card */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-premium space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <span className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">{tickerB} Return Decomposition</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${impactB.style} font-mono uppercase`}>
              Impact: {impactB.text}
            </span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-50">
              <span className="text-slate-500">Price-Only final value:</span>
              <strong className="text-slate-800">{getSymbol()}{Math.round(priceOnlyValB).toLocaleString()}</strong>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-50">
              <span className="text-slate-500">With reinvestment value:</span>
              <strong className="text-slate-900 font-bold">{getSymbol()}{Math.round(reinvestedValB).toLocaleString()}</strong>
            </div>
            <div className="flex justify-between py-1.5 text-purple-600 font-bold bg-purple-50/30 px-2 rounded">
              <span>Dividend cash boost:</span>
              <span>+{getSymbol()}{Math.round(boostB).toLocaleString()} (+{boostPctB.toFixed(2)}%)</span>
            </div>
          </div>
        </div>

      </div>

      {/* 4. VERDICT CARD */}
      <div className="bg-emerald-50/50 border border-emerald-100/50 rounded-2xl p-6 space-y-4">
        <div>
          <span className="text-[10px] font-extrabold text-emerald-600 uppercase font-mono tracking-wider">
            Reinvestment Verdict
          </span>
          <h4 className="text-lg font-extrabold text-slate-900 mt-1 flex items-center gap-2">
            🏆 Winner of this Chapter: <span className="font-mono text-emerald-600">{divWinner}</span>
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-emerald-100/50 pt-4 text-xs">
          <div>
            <span className="block text-[10px] text-emerald-400 font-bold uppercase tracking-wider font-mono">Did it change the final winner?</span>
            <strong className="text-slate-800 block mt-1">
              {changedWinner 
                ? "Yes! Compounding share dividend acquisition flipped the final wealth results." 
                : "No — price growth dominated and kept the same winner."
              }
            </strong>
          </div>
          <div>
            <span className="block text-[10px] text-emerald-400 font-bold uppercase tracking-wider font-mono">Plain-English Explanation</span>
            <div className="text-slate-600 mt-1 leading-relaxed">
              {changedWinner ? (
                <p>
                  The addition of dividends and compound share accumulation successfully flipped the results. While <strong className="font-mono">{priceOnlyWinner}</strong> won purely on price momentum, the compounding dividend engine of <strong className="font-mono">{finalWinner}</strong> generated a final boost of <strong>+{getSymbol()}{Math.round(Math.max(boostA, boostB)).toLocaleString()}</strong>, turning it into the ultimate total wealth champion.
                </p>
              ) : (
                <p>
                  <strong>{divWinner}</strong> received more financial help from dividends, adding a cash boost of <strong>+{getSymbol()}{Math.round(Math.max(boostA, boostB)).toLocaleString()}</strong> to the final outcome. However, this boost was not large enough to change the overall winner. <strong className="font-mono">{finalWinner}</strong> still won because its underlying stock price expansion and multiple growth far dominated the cash flows.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
