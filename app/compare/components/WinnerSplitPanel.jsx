"use client";

import React from "react";

/**
 * WinnerSplitPanel
 *
 * Rendered immediately after Stage 1 (Wealth chart).
 * Shows a big "This won vs That" dueling panel that frames the rest of the story.
 */
export default function WinnerSplitPanel({ result, currency, initialAmount, years }) {
  if (!result) return null;

  const { tickerA, tickerB, finalA, finalB, gainA, gainB, maxDrawdownA, maxDrawdownB } = result;

  const getSymbol = () => {
    if (currency === "EUR") return "€";
    if (currency === "GBP") return "£";
    if (currency === "CAD") return "C$";
    if (currency === "EGP") return "E£";
    if (currency === "AED") return "د.إ";
    return "$";
  };

  const sym = getSymbol();
  const winnerA = finalA >= finalB;
  const winner = winnerA ? tickerA : tickerB;
  const loser = winnerA ? tickerB : tickerA;
  const winnerFinal = winnerA ? finalA : finalB;
  const loserFinal = winnerA ? finalB : finalA;
  const winnerGain = winnerA ? gainA : gainB;
  const loserGain = winnerA ? gainB : gainA;
  const winnerDD = winnerA ? maxDrawdownA : maxDrawdownB;
  const loserDD = winnerA ? maxDrawdownB : maxDrawdownA;
  const gap = Math.abs(finalA - finalB);
  const winnerColor = winnerA ? "blue" : "purple";

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="text-center mb-6">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-500 font-mono uppercase tracking-wider">
          The Verdict Is In
        </span>
        <h3 className="text-xl font-extrabold text-slate-900 mt-2 tracking-tight">
          Now let's understand <em>why</em> {winner} won
        </h3>
        <p className="text-sm text-slate-400 mt-1 max-w-xl mx-auto">
          The story doesn't end at a number. The chapters below break down every layer that separated these two investments.
        </p>
      </div>

      {/* Duel cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
        
        {/* VS Badge in the middle */}
        <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 h-10 w-10 rounded-full bg-white border-2 border-slate-200 items-center justify-center shadow-md">
          <span className="text-[10px] font-black text-slate-400 font-mono">VS</span>
        </div>

        {/* WINNER CARD */}
        <div className="relative rounded-2xl border-2 border-brand-primary bg-gradient-to-br from-indigo-50/60 to-white p-6 shadow-premium">
          <div className="absolute -top-3 -right-3 bg-brand-primary text-white text-[9px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider shadow">
            🏆 Winner
          </div>
          <div className="flex items-center gap-3 mb-4">
            <span className="h-3 w-3 rounded bg-brand-primary" />
            <span className={`text-xs font-bold font-mono uppercase ${winnerA ? "text-blue-600" : "text-purple-600"}`}>
              {winnerA ? "Left Asset · A" : "Right Asset · B"}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <h2 className="text-4xl font-black text-slate-900 font-mono tracking-tight">{winner}</h2>
            <div className="flex flex-wrap gap-1.5 ml-2">
              <span className="inline-flex items-center text-[9px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-1.5 py-0.5 rounded">
                🎯 Main driver: Price growth
              </span>
              {currency !== "USD" && (
                <span className="inline-flex items-center text-[9px] font-bold bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300 px-1.5 py-0.5 rounded">
                  ⚡ Secondary driver: FX
                </span>
              )}
              <span className="inline-flex items-center text-[9px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 px-1.5 py-0.5 rounded">
                💎 Small driver: Dividends
              </span>
              <span className="inline-flex items-center text-[9px] font-bold bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300 px-1.5 py-0.5 rounded">
                ⚠️ Pain cost: Drawdown
              </span>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-brand-primary font-mono">{sym}{Math.round(winnerFinal).toLocaleString()}</span>
              <span className="text-xs text-slate-400 font-mono">final value</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-emerald-100 text-emerald-700 text-xs font-extrabold px-2 py-0.5 rounded font-mono">+{winnerGain.toFixed(1)}%</span>
              <span className="text-[10px] text-slate-400">total return</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="bg-rose-50 text-rose-600 text-[10px] font-bold px-2 py-0.5 rounded font-mono">−{winnerDD.toFixed(1)}% drawdown</span>
              <span className="text-[9px] text-slate-400">max pain</span>
            </div>
          </div>
          <div className="mt-5 pt-4 border-t border-indigo-100">
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Starting from <strong>{sym}{Math.round(initialAmount).toLocaleString()}</strong>, this investment outperformed by a margin of <strong className="text-brand-primary font-mono">{sym}{Math.round(gap).toLocaleString()}</strong> over {years} {years === 1 ? "year" : "years"}. The chapters below explain every driver.
            </p>
          </div>
        </div>

        {/* LOSER CARD */}
        <div className="relative rounded-2xl border border-slate-200 bg-slate-50/50 p-6 overflow-hidden">
          <div className="flex items-center gap-3 mb-4">
            <span className="h-3 w-3 rounded bg-slate-400" />
            <span className="text-xs font-bold font-mono uppercase text-slate-400">
              {winnerA ? "Right Asset · B" : "Left Asset · A"}
            </span>
          </div>
          <h2 className="text-4xl font-black text-slate-400 font-mono tracking-tight">{loser}</h2>
          <div className="mt-4 space-y-2">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-slate-500 font-mono">{sym}{Math.round(loserFinal).toLocaleString()}</span>
              <span className="text-xs text-slate-400 font-mono">final value</span>
            </div>
            <div className="flex items-center gap-2">
              <span className={`${loserGain >= 0 ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"} text-xs font-extrabold px-2 py-0.5 rounded font-mono`}>
                {loserGain >= 0 ? "+" : ""}{loserGain.toFixed(1)}%
              </span>
              <span className="text-[10px] text-slate-400">total return</span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="bg-rose-50 text-rose-600 text-[10px] font-bold px-2 py-0.5 rounded font-mono">−{loserDD.toFixed(1)}% drawdown</span>
              <span className="text-[9px] text-slate-400">max pain</span>
            </div>
          </div>
          <div className="mt-5 pt-4 border-t border-slate-100">
            <p className="text-[11px] text-slate-400 leading-relaxed">
              This investment didn't necessarily underperform its historical averages — but head-to-head, it fell short by <strong className="text-slate-500 font-mono">{sym}{Math.round(gap).toLocaleString()}</strong>. Was it the business, the dividends, or the exchange rate that made the difference?
            </p>
          </div>
        </div>
      </div>

      {/* Teaser row */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: "🏛️", label: "Business Fundamentals", desc: "Did the underlying company perform better?" },
          { icon: "📉", label: "Risk & Drawdown", desc: "Which one caused more pain along the way?" },
          { icon: "💰", label: "Dividend Compounding", desc: "Did reinvested cash flows change the result?" },
          { icon: "🌍", label: "Currency FX Impact", desc: "Did the exchange rate eat or boost your returns?" },
        ].map((item) => (
          <div key={item.label} className="p-3 rounded-xl border border-slate-100 bg-white text-left shadow-sm hover:shadow transition-shadow">
            <div className="text-lg mb-1">{item.icon}</div>
            <div className="text-[10px] font-bold text-slate-700 leading-tight">{item.label}</div>
            <div className="text-[9px] text-slate-400 mt-0.5 leading-snug">{item.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
