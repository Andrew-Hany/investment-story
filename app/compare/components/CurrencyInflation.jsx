"use client";

import React, { useState, useEffect, useRef } from "react";
import { useTheme } from "../../context/ThemeContext";
import { chartColors } from "./chartColors";

export default function CurrencyInflation({ result, currency, initialAmount, years }) {
  const { dark } = useTheme();
  const cc = chartColors(dark);
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoverFXIdx, setHoverFXIdx] = useState(null);
  const fxChartRef = useRef(null);

  const tickerA = result.tickerA;
  const tickerB = result.tickerB;
  const finalA = result.finalA;
  const finalB = result.finalB;

  const handleFXMouseMove = (e) => {
    if (!fxChartRef.current) return;
    
    // Find the first foreign asset to display its FX timeline
    const targetTicker = !isHomeA ? tickerA : (!isHomeB ? tickerB : null);
    if (!targetTicker) return;

    const rates = result.fxRates?.[targetTicker] || [];
    const startLimitStr = result.timeline[0]?.date || "";
    const endLimitStr = result.timeline[result.timeline.length - 1]?.date || "";
    const fxTimeline = rates.filter(r => r.date >= startLimitStr && r.date <= endLimitStr);
    if (!fxTimeline.length) return;
    
    const rect = fxChartRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.min(1, Math.max(0, x / rect.width));
    const idx = Math.round(pct * (fxTimeline.length - 1));
    setHoverFXIdx(idx);
  };

  const getSymbol = () => {
    if (currency === "EUR") return "€";
    if (currency === "GBP") return "£";
    if (currency === "CAD") return "C$";
    if (currency === "EGP") return "E£";
    if (currency === "AED") return "د.إ";
    return "$";
  };

  useEffect(() => {
    // If we wanted to load multiple rates, we'd do it here. 
    // For now, we will skip loading interactive charts and use result.fxRates if needed.
    setLoading(false);
  }, [currency]);

  if (loading) {
    return (
      <div className="bg-white border border-glass-border rounded-2xl p-8 shadow-premium text-center">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-slate-100 rounded w-1/4 mx-auto" />
          <div className="h-8 bg-slate-100 rounded w-1/2 mx-auto" />
        </div>
      </div>
    );
  }

  // 1. GET ASSET CURRENCIES AND RATES
  const assetCurrencyA = result.assetCurrencies?.[tickerA] || "USD";
  const assetCurrencyB = result.assetCurrencies?.[tickerB] || "USD";
  const startRateA = result.startRates?.[tickerA] || 1.0;
  const endRateA = result.endRates?.[tickerA] || 1.0;
  const startRateB = result.startRates?.[tickerB] || 1.0;
  const endRateB = result.endRates?.[tickerB] || 1.0;

  const isHomeA = assetCurrencyA === currency;
  const isHomeB = assetCurrencyB === currency;

  // Wealth in selected currency
  const nominalValA = finalA;
  const nominalValB = finalB;
  const assetValA = finalA / endRateA;
  const assetValB = finalB / endRateB;

  // Convert initial home capital to Asset currency
  const initialAssetA = initialAmount / startRateA;
  const initialAssetB = initialAmount / startRateB;

  return (
    <div className="space-y-8 animate-fadeIn text-left">
      
      {/* HEADER */}
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-brand-primary font-mono">
          Stage 5 / Currency FX Reality
        </span>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-2">
          What Was the Real Result?
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          For investors outside the stock's home currency, returns are significantly affected by FX shifts between currencies.
        </p>
      </div>

      {/* Beginner One-Sentence Summary */}
      <div className="bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800/60 rounded-xl p-4 text-sm font-medium text-slate-700 dark:text-slate-300">
        💡 {(isHomeA && isHomeB) 
          ? "Since both assets are in your home currency, foreign exchange rate shifts had no effect on your final returns."
          : `Because you are viewing in ${currency}, exchange rate shifts changed the local value of your wallet from the raw stock prices.`
        }
      </div>

      {/* PART A: FX (CURRENCY CONVERSION) FRICTION */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-premium space-y-6">
        <div>
          <span className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">Part A / Currency Exchange (FX) Reality</span>
          <h3 className="text-lg font-extrabold text-slate-900 mt-1">The Complete Currency Conversion Journey</h3>
          <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
            Follow your capital as it converts from local currency, buys the asset, compounds in the stock market, and finally translates back to your home wallet.
          </p>
        </div>

        {(isHomeA && isHomeB) ? (
          <div className="p-6 bg-slate-50 border border-slate-100 rounded-xl text-center text-slate-500 text-xs font-mono">
            💡 You are comparing in your home currency. Since the assets are denominated in your home currency, there is zero foreign exchange friction or conversions.
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* Ticker A Journey */}
            {(() => {
              const assetReturnA = ((assetValA - initialAssetA) / initialAssetA) * 100;
              const localReturnA = ((nominalValA - initialAmount) / initialAmount) * 100;
              const fxCashImpactA = isHomeA ? 0 : assetValA * (endRateA - startRateA);
              const fxPctA = isHomeA ? 0 : ((endRateA - startRateA) / startRateA) * 100;

              return (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-blue-500 font-mono uppercase tracking-wider">{tickerA} Currency Journey</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${fxCashImpactA >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                      FX Effect: {fxCashImpactA >= 0 ? "Boost" : "Loss"} ({fxPctA >= 0 ? "+" : ""}{fxPctA.toFixed(1)}%)
                    </span>
                  </div>

                  {/* Horizontal Flow Container */}
                  <div className="grid grid-cols-1 md:grid-cols-7 items-center gap-4 bg-slate-50/50 border border-slate-100 rounded-2xl p-6 font-mono text-center md:text-left relative overflow-hidden">
                    
                    {/* Step 1: Starting EUR */}
                    <div className="col-span-1">
                      <span className="text-[8px] text-slate-400 uppercase block font-semibold">1. Start Wallet</span>
                      <strong className="text-sm text-slate-800 font-extrabold">{getSymbol()}{Math.round(initialAmount).toLocaleString()}</strong>
                      <span className="text-[9px] text-slate-400 block mt-0.5">{currency}</span>
                    </div>

                    {/* Arrow 1: Local -> Asset */}
                    <div className="col-span-1 flex flex-col items-center justify-center">
                      <span className="text-blue-500 text-sm font-bold leading-none">──►</span>
                      <span className="text-[8px] text-slate-500 font-bold mt-1">Convert</span>
                      <span className="text-[7px] text-slate-400">Rate: {startRateA.toFixed(3)}</span>
                    </div>

                    {/* Step 2: Asset Bought */}
                    <div className="col-span-1">
                      <span className="text-[8px] text-slate-400 uppercase block font-semibold">2. Invested</span>
                      <strong className="text-sm text-slate-800 font-extrabold">{isHomeA ? getSymbol() : ""}{Math.round(initialAssetA).toLocaleString()}</strong>
                      <span className="text-[9px] text-slate-400 block mt-0.5">{assetCurrencyA}</span>
                    </div>

                    {/* Arrow 2: Stock Growth */}
                    <div className="col-span-1 flex flex-col items-center justify-center">
                      <span className="text-blue-500 text-sm font-bold leading-none">──►</span>
                      <span className="text-[8px] text-indigo-600 font-extrabold mt-1">Asset Growth</span>
                      <span className="text-[8px] text-emerald-600 font-bold">+{assetReturnA.toFixed(1)}%</span>
                    </div>

                    {/* Step 3: Final Asset value */}
                    <div className="col-span-1">
                      <span className="text-[8px] text-slate-400 uppercase block font-semibold">3. Stock Value</span>
                      <strong className="text-sm text-slate-800 font-extrabold">{isHomeA ? getSymbol() : ""}{Math.round(assetValA).toLocaleString()}</strong>
                      <span className="text-[9px] text-slate-400 block mt-0.5">{assetCurrencyA}</span>
                    </div>

                    {/* Arrow 3: USD -> EUR Back */}
                    <div className="col-span-1 flex flex-col items-center justify-center">
                      <span className="text-blue-500 text-sm font-bold leading-none">──►</span>
                      <span className="text-[8px] text-slate-500 font-bold mt-1">Sell & Convert</span>
                      <span className={`text-[8px] font-bold px-1 rounded ${fxCashImpactA >= 0 ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50"}`}>
                        {fxCashImpactA >= 0 ? "+" : ""}{getSymbol()}{Math.round(fxCashImpactA).toLocaleString()}
                      </span>
                    </div>

                    {/* Step 4: Realized EUR */}
                    <div className="col-span-1 md:text-right">
                      <span className="text-[8px] text-slate-400 uppercase block font-semibold">4. Final Wallet</span>
                      <strong className="text-sm text-blue-600 font-extrabold">{getSymbol()}{Math.round(nominalValA).toLocaleString()}</strong>
                      <span className="text-[9px] text-blue-400 font-bold block mt-0.5">({localReturnA >= 0 ? "+" : ""}{localReturnA.toFixed(1)}% {currency})</span>
                    </div>

                  </div>
                </div>
              );
            })()}

            {/* Ticker B Journey */}
            {(() => {
              const assetReturnB = ((assetValB - initialAssetB) / initialAssetB) * 100;
              const localReturnB = ((nominalValB - initialAmount) / initialAmount) * 100;
              const fxCashImpactB = isHomeB ? 0 : assetValB * (endRateB - startRateB);
              const fxPctB = isHomeB ? 0 : ((endRateB - startRateB) / startRateB) * 100;

              return (
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold text-purple-500 font-mono uppercase tracking-wider">{tickerB} Currency Journey</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono uppercase ${fxCashImpactB >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                      FX Effect: {fxCashImpactB >= 0 ? "Boost" : "Loss"} ({fxPctB >= 0 ? "+" : ""}{fxPctB.toFixed(1)}%)
                    </span>
                  </div>

                  {/* Horizontal Flow Container */}
                  <div className="grid grid-cols-1 md:grid-cols-7 items-center gap-4 bg-slate-50/50 border border-slate-100 rounded-2xl p-6 font-mono text-center md:text-left relative overflow-hidden">
                    
                    {/* Step 1: Starting EUR */}
                    <div className="col-span-1">
                      <span className="text-[8px] text-slate-400 uppercase block font-semibold">1. Start Wallet</span>
                      <strong className="text-sm text-slate-800 font-extrabold">{getSymbol()}{Math.round(initialAmount).toLocaleString()}</strong>
                      <span className="text-[9px] text-slate-400 block mt-0.5">{currency}</span>
                    </div>

                    {/* Arrow 1: Local -> Asset */}
                    <div className="col-span-1 flex flex-col items-center justify-center">
                      <span className="text-purple-500 text-sm font-bold leading-none">──►</span>
                      <span className="text-[8px] text-slate-500 font-bold mt-1">Convert</span>
                      <span className="text-[7px] text-slate-400">Rate: {startRateB.toFixed(3)}</span>
                    </div>

                    {/* Step 2: Asset Bought */}
                    <div className="col-span-1">
                      <span className="text-[8px] text-slate-400 uppercase block font-semibold">2. Invested</span>
                      <strong className="text-sm text-slate-800 font-extrabold">{isHomeB ? getSymbol() : ""}{Math.round(initialAssetB).toLocaleString()}</strong>
                      <span className="text-[9px] text-slate-400 block mt-0.5">{assetCurrencyB}</span>
                    </div>

                    {/* Arrow 2: Stock Growth */}
                    <div className="col-span-1 flex flex-col items-center justify-center">
                      <span className="text-purple-500 text-sm font-bold leading-none">──►</span>
                      <span className="text-[8px] text-indigo-600 font-extrabold mt-1">Asset Growth</span>
                      <span className="text-[8px] text-emerald-600 font-bold">+{assetReturnB.toFixed(1)}%</span>
                    </div>

                    {/* Step 3: Final Asset value */}
                    <div className="col-span-1">
                      <span className="text-[8px] text-slate-400 uppercase block font-semibold">3. Stock Value</span>
                      <strong className="text-sm text-slate-800 font-extrabold">{isHomeB ? getSymbol() : ""}{Math.round(assetValB).toLocaleString()}</strong>
                      <span className="text-[9px] text-slate-400 block mt-0.5">{assetCurrencyB}</span>
                    </div>

                    {/* Arrow 3: USD -> EUR Back */}
                    <div className="col-span-1 flex flex-col items-center justify-center">
                      <span className="text-purple-500 text-sm font-bold leading-none">──►</span>
                      <span className="text-[8px] text-slate-500 font-bold mt-1">Sell & Convert</span>
                      <span className={`text-[8px] font-bold px-1 rounded ${fxCashImpactB >= 0 ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50"}`}>
                        {fxCashImpactB >= 0 ? "+" : ""}{getSymbol()}{Math.round(fxCashImpactB).toLocaleString()}
                      </span>
                    </div>

                    {/* Step 4: Realized EUR */}
                    <div className="col-span-1 md:text-right">
                      <span className="text-[8px] text-slate-400 uppercase block font-semibold">4. Final Wallet</span>
                      <strong className="text-sm text-purple-600 font-extrabold">{getSymbol()}{Math.round(nominalValB).toLocaleString()}</strong>
                      <span className="text-[9px] text-purple-400 font-bold block mt-0.5">({localReturnB >= 0 ? "+" : ""}{localReturnB.toFixed(1)}% {currency})</span>
                    </div>

                  </div>
                </div>
              );
            })()}

            {/* Exchange Rate Timeline Chart */}
            {(() => {
              const targetTicker = !isHomeA ? tickerA : (!isHomeB ? tickerB : null);
              if (!targetTicker) return null;
              
              const rates = result.fxRates?.[targetTicker] || [];
              if (!rates.length) return null;
              
              const targetAssetCurrency = result.assetCurrencies[targetTicker];
              const startLimitStr = result.timeline[0]?.date || "";
              const endLimitStr = result.timeline[result.timeline.length - 1]?.date || "";
              const fxTimeline = rates.filter(r => r.date >= startLimitStr && r.date <= endLimitStr);
              if (!fxTimeline.length) return null;

              const sRate = fxTimeline[0]?.rate || 1.0;
              const eRate = fxTimeline[fxTimeline.length - 1]?.rate || 1.0;

              return (
                <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-100 pb-3 gap-2">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase font-mono tracking-wider">Exchange Rate Timeline</span>
                      <h4 className="text-md font-bold text-slate-900 mt-0.5">{targetAssetCurrency} to {currency} Spot Rates</h4>
                    </div>
                    <div className="flex gap-4 text-[10px] font-mono text-slate-500">
                      <span>Start: <strong className="text-slate-800">{startLimitStr} @ {sRate.toFixed(4)}</strong></span>
                      <span>End: <strong className="text-slate-800">{endLimitStr} @ {eRate.toFixed(4)}</strong></span>
                      <span className={`px-2 py-0.5 rounded font-bold font-mono ${eRate >= sRate ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                        {targetAssetCurrency} {eRate >= sRate ? "strengthened" : "weakened"} by {Math.abs(((eRate - sRate)/sRate * 100)).toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* Interactive SVG Chart */}
                  <div 
                    ref={fxChartRef}
                    onMouseMove={handleFXMouseMove}
                    onMouseLeave={() => setHoverFXIdx(null)}
                    className="aspect-[21/6] w-full bg-slate-50/50 rounded-xl p-4 border border-slate-100 relative cursor-crosshair overflow-hidden animate-fadeIn"
                    style={dark ? { backgroundColor: cc.canvasBg, borderColor: "rgba(255,255,255,0.07)" } : {}}
                  >
                    <svg className="w-full h-full overflow-visible min-h-[140px]" viewBox="0 0 800 120" preserveAspectRatio="none">
                      {(() => {
                        const ratesList = fxTimeline.map(r => r.rate);
                        const maxR = Math.max(...ratesList);
                        const minR = Math.min(...ratesList);
                        const midR = (maxR + minR) / 2;
                        
                        const startYear = new Date(startLimitStr).getFullYear();
                        const endYear = new Date(endLimitStr).getFullYear();

                        const scaleY = (rVal) => 105 - ((rVal - minR) / (maxR - minR)) * 80;
                        const scaleX = (idx) => 50 + (idx / (fxTimeline.length - 1)) * 730;

                        const scaleYearX = (year) => {
                          const tStart = new Date(startLimitStr).getTime();
                          const tEnd = new Date(endLimitStr).getTime();
                          const tCurr = new Date(`${year}-06-01`).getTime();
                          return 50 + ((tCurr - tStart) / (tEnd - tStart)) * 730;
                        };

                        const points = fxTimeline.map((item, idx) => `${scaleX(idx)},${scaleY(item.rate)}`);

                        const hoverX = hoverFXIdx !== null ? scaleX(hoverFXIdx) : null;
                        const hoveredItem = hoverFXIdx !== null ? fxTimeline[hoverFXIdx] : null;

                        return (
                          <>
                            <text x="10" y="24" fill="#94a3b8" fontSize="8" fontFamily="monospace" fontWeight="bold">{maxR.toFixed(4)}</text>
                            <text x="10" y="64" fill="#94a3b8" fontSize="8" fontFamily="monospace" fontWeight="bold">{midR.toFixed(4)}</text>
                            <text x="10" y="104" fill="#94a3b8" fontSize="8" fontFamily="monospace" fontWeight="bold">{minR.toFixed(4)}</text>

                            <line x1="50" y1="100" x2="780" y2="100" stroke={cc.gridStrong} strokeWidth="1.5" />
                            <line x1="50" y1="60"  x2="780" y2="60"  stroke={cc.grid} strokeWidth="1" strokeDasharray="3 3" />
                            <line x1="50" y1="20"  x2="780" y2="20"  stroke={cc.grid} strokeWidth="1" strokeDasharray="3 3" />

                            {Array.from({ length: endYear - startYear + 1 }).map((_, idx) => {
                              const y = startYear + idx;
                              const x = scaleYearX(y);
                              if (x < 50 || x > 780) return null;
                              return (
                                <g key={y}>
                                  <line x1={x} y1="96" x2={x} y2="104" stroke={cc.baseline} strokeWidth="1" />
                                  <text x={x} y="115" textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="monospace">{y}</text>
                                </g>
                              );
                            })}

                            <path d={`M ${points.join(" L ")}`} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />

                            {hoverX !== null && hoveredItem && (
                              <g>
                                <line x1={hoverX} y1="15" x2={hoverX} y2="100" stroke={cc.crosshair} strokeWidth="1" strokeDasharray="2 2" />
                                <circle cx={hoverX} cy={scaleY(hoveredItem.rate)} r="5" fill="#10b981" stroke={cc.dotStroke} strokeWidth="1.5" />
                              </g>
                            )}
                          </>
                        );
                      })()}
                    </svg>

                    {hoverFXIdx !== null && fxTimeline[hoverFXIdx] && (() => {
                      const item = fxTimeline[hoverFXIdx];
                      const pctShift = ((item.rate - sRate) / sRate) * 100;
                      return (
                        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-sm text-slate-100 rounded-xl px-4 py-2 text-[10px] shadow-2xl flex gap-3.5 font-mono border border-slate-800 z-10 pointer-events-none">
                          <span className="text-slate-400">📅 {item.date}</span>
                          <span className="text-slate-700">|</span>
                          <span className="text-emerald-400 font-bold">1 {targetAssetCurrency} = {item.rate.toFixed(4)} {currency}</span>
                          <span className="text-slate-700">|</span>
                          <span className={`font-bold ${pctShift >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            {targetAssetCurrency} Shift: {pctShift >= 0 ? "+" : ""}{pctShift.toFixed(2)}%
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-600 leading-relaxed">
          💡 <strong>How to read this:</strong> Since you buy foreign stocks in their native currency, a <strong>strengthening of that currency</strong> is great news! It means when you sell the stocks and convert back to {currency}, each unit buys more local {currency}. If the foreign currency weakens, your home currency returns are compressed.
        </div>
      </div>

      {/* FINAL VERDICT CARD */}
      {(() => {
        const nominalWinner = nominalValA >= nominalValB ? tickerA : tickerB;
        const changedWinner = (finalA >= finalB ? tickerA : tickerB) !== nominalWinner;
        return (
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 space-y-4">
            <div>
              <span className="text-[10px] font-extrabold text-brand-primary uppercase font-mono tracking-wider">
                Realized Return Verdict
              </span>
              <h4 className="text-lg font-extrabold text-slate-900 mt-1 flex items-center gap-2">
                🏆 Winner of this Chapter: <span className="font-mono text-brand-primary">{nominalWinner}</span>
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-indigo-100/60 pt-4 text-xs">
              <div>
                <span className="block text-[10px] text-indigo-400 font-bold uppercase tracking-wider font-mono">Did it change the final winner?</span>
                <strong className="text-slate-800 block mt-1">
                  {(isHomeA && isHomeB) 
                    ? "No — both assets are in your home currency, so foreign exchange shifts had no effect." 
                    : (changedWinner 
                        ? `Yes — foreign exchange fluctuations shifted the final winner from the raw stock price to ${nominalWinner}!` 
                        : "No — the local currency returns match the asset stock performance."
                      )
                  }
                </strong>
              </div>
              <div>
                <span className="block text-[10px] text-indigo-400 font-bold uppercase tracking-wider font-mono">Plain-English Explanation</span>
                <p className="text-slate-600 mt-1 leading-relaxed">
                  Accounting for all foreign exchange layers, <strong>{nominalWinner}</strong> wins the absolute local wallet crown with a net adjusted realized wealth of <strong>{getSymbol()}{Math.round(Math.max(nominalValA, nominalValB)).toLocaleString()}</strong> in your home currency.
                </p>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}

