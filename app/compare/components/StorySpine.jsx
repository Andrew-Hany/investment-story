"use client";

import React from "react";
import { decomposeInvestmentReturn } from "../utils/calculations";

export default function StorySpine({ result, currency, initialAmount }) {
  if (!result) return null;

  const tickerA = result.tickerA;
  const tickerB = result.tickerB;
  const finalA = result.finalA; 
  const finalB = result.finalB; 
  const finalPriceA = result.finalPriceA || finalA;
  const finalPriceB = result.finalPriceB || finalB;

  const assetCurrencyA = result.assetCurrencies?.[tickerA] || "USD";
  const assetCurrencyB = result.assetCurrencies?.[tickerB] || "USD";
  const startRateA = result.startRates?.[tickerA] || 1.0;
  const endRateA = result.endRates?.[tickerA] || 1.0;
  const startRateB = result.startRates?.[tickerB] || 1.0;
  const endRateB = result.endRates?.[tickerB] || 1.0;

  const isHomeA = assetCurrencyA === currency;
  const isHomeB = assetCurrencyB === currency;

  const getSymbol = () => {
    if (currency === "EUR") return "€";
    if (currency === "GBP") return "£";
    if (currency === "CAD") return "C$";
    if (currency === "EGP") return "E£";
    if (currency === "AED") return "د.إ";
    return "$";
  };

  // Realized nominal final values in home currency
  const nomTotalA = finalA;
  const nomTotalB = finalB;

  const decA = decomposeInvestmentReturn({
    finalTotal: finalA,
    finalPriceWealth: finalPriceA,
    initialAmount,
    startRate: startRateA,
    endRate: endRateA,
    isHome: isHomeA
  });

  const decB = decomposeInvestmentReturn({
    finalTotal: finalB,
    finalPriceWealth: finalPriceB,
    initialAmount,
    startRate: startRateB,
    endRate: endRateB,
    isHome: isHomeB
  });

  const priceGrowthA = decA.priceGrowth;
  const priceGrowthB = decB.priceGrowth;
  const divBoostA = decA.divBoost;
  const divBoostB = decB.divBoost;
  const fxEffectA = decA.fxEffect;
  const fxEffectB = decB.fxEffect;
  const fxRatePctA = decA.fxRatePct;
  const fxRatePctB = decB.fxRatePct;

  const getNativeSymbol = (curr) => {
    if (curr === "EUR") return "€";
    if (curr === "GBP") return "£";
    if (curr === "CAD") return "C$";
    if (curr === "EGP") return "E£";
    if (curr === "AED") return "د.إ";
    return "$";
  };

  const getSpineRow = (ticker, isWinner, startCap, priceGr, divB, fxEff, finalVal, color, isA) => {
    const symbol = getSymbol();
    const isHome = isA ? isHomeA : isHomeB;
    const assetCurrency = isA ? assetCurrencyA : assetCurrencyB;
    const nativeSymbol = getNativeSymbol(assetCurrency);
    const startRate = isA ? startRateA : startRateB;
    const endRate = isA ? endRateA : endRateB;
    const nativeStart = startCap / startRate;
    
    const preFxTotal = startCap + priceGr + divB;
    const fxPct = preFxTotal > 0 ? (fxEff / preFxTotal) * 100 : 0;
    
    return (
      <div className={`space-y-3 p-5 rounded-2xl border transition-all ${
        isWinner 
          ? "bg-slate-50/50 dark:bg-slate-900/30 border-brand-primary/30 shadow-md" 
          : "bg-transparent border-slate-100 dark:border-slate-800/40"
      }`}>
        {/* Ticker Title Header for Row */}
        <div className="flex items-center justify-between pb-2 border-b border-dashed border-slate-100 dark:border-slate-800/60">
          <div className="flex items-center gap-2.5">
            <span className={`h-3 w-3 rounded-full ${isA ? "bg-blue-500" : "bg-violet-500"}`} />
            <span className="font-mono font-extrabold text-sm text-slate-800 dark:text-slate-200">
              {ticker} Investment Flow
            </span>
            {isWinner && (
              <span className="text-[9px] bg-brand-primary/10 text-brand-primary font-bold px-1.5 py-0.5 rounded uppercase tracking-wider font-mono">
                🏆 Winner
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Start ➔ Final</span>
        </div>

        {/* Visual Capital Flow Cards Grid */}
        <div className="flex flex-row items-center justify-between gap-1 sm:gap-1.5 py-2 overflow-x-auto scrollbar-none w-full">
          {/* STEP 1: START */}
          <div className="flex flex-col items-center justify-center p-1.5 sm:p-3 bg-white dark:bg-slate-950 rounded-lg sm:rounded-xl border border-slate-150 dark:border-slate-850/60 flex-1 min-w-[50px] sm:min-w-0 shadow-sm text-center">
            <span className="text-[6px] sm:text-[8px] text-slate-400 font-mono uppercase font-bold tracking-wider">Start Capital</span>
            <span className="font-mono text-[9px] sm:text-xs md:text-sm font-extrabold text-slate-800 dark:text-slate-200 mt-1">
              {symbol}{Math.round(startCap).toLocaleString()}
            </span>
          </div>

          {!isHome && (
            <>
              {/* ARROW 1a: Initial Exchange */}
              <div className="flex flex-col items-center justify-center min-w-[30px] sm:min-w-[50px] text-center my-0">
                <span className="text-xs sm:text-sm font-bold text-slate-300 dark:text-slate-700 mt-0.5">➔</span>
                <span className="text-[5px] sm:text-[7px] text-slate-400 font-mono font-bold mt-1">
                  {startRate >= 1 ? `1 ${assetCurrency} = ${symbol}${startRate.toFixed(2)}` : `1 ${currency} = ${nativeSymbol}${(1 / startRate).toFixed(2)}`}
                </span>
              </div>

              {/* STEP 1.5: NATIVE START CAPITAL */}
              <div className="flex flex-col items-center justify-center p-1.5 sm:p-3 bg-slate-50 dark:bg-slate-900 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-800 flex-1 min-w-[50px] sm:min-w-0 shadow-inner text-center">
                <span className="text-[6px] sm:text-[8px] text-slate-500 font-mono uppercase font-bold tracking-wider">Initial Exchange</span>
                <span className="font-mono text-[9px] sm:text-xs md:text-sm font-extrabold text-slate-700 dark:text-slate-300 mt-1">
                  {nativeSymbol}{Math.round(nativeStart).toLocaleString()}
                </span>
              </div>
            </>
          )}

          {/* ARROW 1 / 1b: Asset Growth Rate */}
          <div className="flex flex-col items-center justify-center min-w-[30px] sm:min-w-[50px] text-center my-0">
            <span className="text-[6px] sm:text-[8px] text-blue-600 dark:text-blue-400 font-mono bg-blue-50 dark:bg-blue-950/40 px-1 sm:px-2 py-0.5 rounded border border-blue-100/50 dark:border-blue-900/30 font-bold">
              +{((priceGr / startCap) * 100).toFixed(1)}%
            </span>
            <span className="text-xs sm:text-sm font-bold text-slate-300 dark:text-slate-700 mt-0.5">➔</span>
          </div>

          {/* STEP 2: PRICE GROWTH */}
          <div className="flex flex-col items-center justify-center p-1.5 sm:p-3 bg-white dark:bg-slate-950 rounded-lg sm:rounded-xl border border-slate-150 dark:border-slate-850/60 flex-1 min-w-[50px] sm:min-w-0 shadow-sm text-center">
            <span className="text-[6px] sm:text-[8px] text-slate-400 font-mono uppercase font-bold tracking-wider">Asset Price Growth</span>
            
            {isHome ? (
              <span className="font-mono text-[9px] sm:text-xs md:text-sm font-extrabold text-blue-600 dark:text-blue-400 mt-1">
                +{symbol}{Math.round(priceGr).toLocaleString()}
              </span>
            ) : (
              <>
                <span className="font-mono text-[9px] sm:text-xs md:text-sm font-extrabold text-blue-600 dark:text-blue-400 mt-1">
                  +{nativeSymbol}{Math.round(priceGr / startRate).toLocaleString()}
                </span>
              </>
            )}
          </div>

          {/* ARROW 2: Dividends Rate */}
          <div className="flex flex-col items-center justify-center min-w-[35px] sm:min-w-[65px] text-center my-0">
            <span className="text-[6px] sm:text-[8px] text-emerald-600 dark:text-emerald-400 font-mono bg-emerald-50 dark:bg-emerald-950/40 px-1 sm:px-2 py-0.5 rounded border border-emerald-100/50 dark:border-emerald-900/30 font-bold">
              +{((divB / startCap) * 100).toFixed(1)}%
            </span>
            <span className="text-xs sm:text-sm font-bold text-slate-300 dark:text-slate-700 mt-0.5">➔</span>
          </div>

          {/* STEP 3: DIVIDENDS */}
          <div className="flex flex-col items-center justify-center p-1.5 sm:p-3 bg-white dark:bg-slate-950 rounded-lg sm:rounded-xl border border-slate-150 dark:border-slate-850/60 flex-1 min-w-[50px] sm:min-w-0 shadow-sm text-center">
            <span className="text-[6px] sm:text-[8px] text-slate-400 font-mono uppercase font-bold tracking-wider">Dividends Boost</span>
            
            {isHome ? (
              <span className="font-mono text-[9px] sm:text-xs md:text-sm font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                +{symbol}{Math.round(divB).toLocaleString()}
              </span>
            ) : (
              <>
                <span className="font-mono text-[9px] sm:text-xs md:text-sm font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                  +{nativeSymbol}{Math.round(divB / startRate).toLocaleString()}
                </span>
              </>
            )}
          </div>

          {/* ARROW 3: FX Windfall Rate */}
          {!isHomeA && isA && (
            <>
              <div className="flex flex-col items-center justify-center min-w-[35px] sm:min-w-[65px] text-center my-0">
                <span className="text-[6px] sm:text-[8px] text-slate-400 font-mono uppercase font-bold tracking-wider">Pre-FX</span>
                <span className="text-xs sm:text-sm font-bold text-slate-300 dark:text-slate-700 mt-0.5">➔</span>
              </div>

              {/* STEP 3.5: BEFORE EXCHANGE TOTAL */}
              <div className="flex flex-col items-center justify-center p-1.5 sm:p-3 bg-slate-50 dark:bg-slate-900 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-800 flex-1 min-w-[50px] sm:min-w-0 shadow-inner text-center">
                <span className="text-[6px] sm:text-[8px] text-slate-500 font-mono uppercase font-bold tracking-wider">Before Exchange</span>
                <span className="font-mono text-[9px] sm:text-xs md:text-sm font-extrabold text-slate-700 dark:text-slate-300 mt-1">
                  {nativeSymbol}{Math.round(preFxTotal / startRate).toLocaleString()}
                </span>
              </div>

              <div className="flex flex-col items-center justify-center min-w-[35px] sm:min-w-[65px] text-center my-0">
                <span className="text-[6px] sm:text-[8px] text-violet-600 dark:text-violet-400 font-mono bg-violet-50 dark:bg-violet-950/40 px-1 sm:px-2 py-0.5 rounded border border-violet-100/50 dark:border-violet-900/30 font-bold mb-1">
                  {fxPct >= 0 ? "+" : ""}{fxPct.toFixed(1)}% Shift
                </span>
                <span className={`text-[8px] sm:text-[10px] font-extrabold ${fxEff >= 0 ? "text-violet-600 dark:text-violet-400" : "text-rose-600 dark:text-rose-400"} font-mono`}>
                  {fxEff >= 0 ? "+" : "-"}{symbol}{Math.abs(Math.round(fxEff)).toLocaleString()}
                </span>
                <span className="text-xs sm:text-sm font-bold text-slate-300 dark:text-slate-700 mt-0.5">➔</span>
                <span className="text-[5px] sm:text-[7px] text-slate-400 font-mono font-bold mt-1">
                  {endRate >= 1 ? `1 ${assetCurrency} = ${symbol}${endRate.toFixed(2)}` : `1 ${currency} = ${nativeSymbol}${(1 / endRate).toFixed(2)}`}
                </span>
              </div>
            </>
          )}

          {!isHomeB && !isA && (
            <>
              <div className="flex flex-col items-center justify-center min-w-[35px] sm:min-w-[65px] text-center my-0">
                <span className="text-[6px] sm:text-[8px] text-slate-400 font-mono uppercase font-bold tracking-wider">Pre-FX</span>
                <span className="text-xs sm:text-sm font-bold text-slate-300 dark:text-slate-700 mt-0.5">➔</span>
              </div>

              {/* STEP 3.5: BEFORE EXCHANGE TOTAL */}
              <div className="flex flex-col items-center justify-center p-1.5 sm:p-3 bg-slate-50 dark:bg-slate-900 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-800 flex-1 min-w-[50px] sm:min-w-0 shadow-inner text-center">
                <span className="text-[6px] sm:text-[8px] text-slate-500 font-mono uppercase font-bold tracking-wider">Before Exchange</span>
                <span className="font-mono text-[9px] sm:text-xs md:text-sm font-extrabold text-slate-700 dark:text-slate-300 mt-1">
                  {nativeSymbol}{Math.round(preFxTotal / startRate).toLocaleString()}
                </span>
              </div>

              <div className="flex flex-col items-center justify-center min-w-[35px] sm:min-w-[65px] text-center my-0">
                <span className="text-[6px] sm:text-[8px] text-violet-600 dark:text-violet-400 font-mono bg-violet-50 dark:bg-violet-950/40 px-1 sm:px-2 py-0.5 rounded border border-violet-100/50 dark:border-violet-900/30 font-bold mb-1">
                  {fxPct >= 0 ? "+" : ""}{fxPct.toFixed(1)}% Shift
                </span>
                <span className={`text-[8px] sm:text-[10px] font-extrabold ${fxEff >= 0 ? "text-violet-600 dark:text-violet-400" : "text-rose-600 dark:text-rose-400"} font-mono`}>
                  {fxEff >= 0 ? "+" : "-"}{symbol}{Math.abs(Math.round(fxEff)).toLocaleString()}
                </span>
                <span className="text-xs sm:text-sm font-bold text-slate-300 dark:text-slate-700 mt-0.5">➔</span>
                <span className="text-[5px] sm:text-[7px] text-slate-400 font-mono font-bold mt-1">
                  {endRate >= 1 ? `1 ${assetCurrency} = ${symbol}${endRate.toFixed(2)}` : `1 ${currency} = ${nativeSymbol}${(1 / endRate).toFixed(2)}`}
                </span>
              </div>
            </>
          )}

          {/* ARROW 4: Final Total arrow */}
          {((isHomeA && isA) || (isHomeB && !isA)) && (
            <div className="flex flex-col items-center justify-center min-w-[30px] sm:min-w-[55px] text-center my-0">
              <span className="text-[5px] sm:text-[7px] text-slate-400 font-mono uppercase font-bold">
                TOTAL
              </span>
              <span className="text-xs sm:text-sm font-bold text-slate-300 dark:text-slate-700 mt-0.5">➔</span>
            </div>
          )}

          {/* STEP 5: FINAL WALLET */}
          <div className={`flex flex-col items-center justify-center p-1.5 sm:p-3 rounded-lg sm:rounded-xl border flex-1 min-w-[50px] sm:min-w-0 shadow-sm text-center ${
            isWinner 
              ? "bg-indigo-50/60 border-indigo-200 dark:bg-indigo-950/30 dark:border-indigo-900/40 text-indigo-700 dark:text-indigo-400" 
              : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-850/60 text-slate-800 dark:text-slate-200"
          }`}>
            <span className="text-[6px] sm:text-[8px] text-slate-400 font-mono uppercase font-bold tracking-wider">Final Wallet</span>
            <span className="font-mono text-[9px] sm:text-xs md:text-sm font-black mt-1">
              {symbol}{Math.round(finalVal).toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const isWinnerA = nomTotalA >= nomTotalB;

  return (
    <div className="bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-premium mb-8 text-left transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-2 pb-3 border-b border-slate-100 dark:border-slate-800/60">
        <div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider font-mono flex items-center gap-1.5">
            <span>🗺️</span> The Investment Story Spine
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            A single, connected mental map tracking the absolute path of your capital.
          </p>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
          <span>Formula:</span>
          <span>Start + Price + Divs + FX = Final</span>
        </div>
      </div>

      {/* Spine Rows */}
      <div className="space-y-4">
        {getSpineRow(tickerA, isWinnerA, initialAmount, priceGrowthA, divBoostA, fxEffectA, nomTotalA, "blue", true)}
        {getSpineRow(tickerB, !isWinnerA, initialAmount, priceGrowthB, divBoostB, fxEffectB, nomTotalB, "violet", false)}
      </div>
    </div>
  );
}
