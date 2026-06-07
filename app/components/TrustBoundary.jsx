"use client";

import React, { useState } from "react";

export default function TrustBoundary() {
  const [activeCase, setActiveCase] = useState("expat");

  const cases = {
    expat: {
      title: "Expat Case Study: US Stock from EUR Wallet",
      subtitle: "Which was better: S&P 500 in USD, or converted to your EUR pocket? And why?",
      assetA: {
        name: "S&P 500 (Local USD)",
        value: "$18,240",
        yield: "+82.4%",
        barWidth: "70%",
        metrics: [
          { label: "Price Growth", val: "+65.2%" },
          { label: "FX Impact", val: "0.0% (None)" },
          { label: "Dividends", val: "+17.2%" }
        ]
      },
      assetB: {
        name: "S&P 500 (Realized EUR)",
        value: "€21,750",
        yield: "+117.5%",
        barWidth: "100%",
        metrics: [
          { label: "Price Growth", val: "+65.2%" },
          { label: "FX Impact (USD/EUR)", val: "+35.1% (EUR Weakened)" },
          { label: "Dividends", val: "+17.2%" }
        ]
      },
      why: "EUR weakened significantly against the USD. While the underlying stock grew by 82.4%, your real purchasing power increased by 117.5% because your EUR bought more USD value. Currency exchange was the main winner.",
      lesson: "Never read just the stock price chart. If you invest globally, currency shifts are a major factor that can double your returns or erase them."
    },
    gold: {
      title: "Inflation Shield: Gold vs Cash Savings",
      subtitle: "Which was better to protect wealth? And why did the result happen?",
      assetA: {
        name: "USD Cash Savings",
        value: "$10,250",
        yield: "+2.5% (Flat)",
        barWidth: "30%",
        metrics: [
          { label: "Capital Stability", val: "100.0% (No Volatility)" },
          { label: "FX Impact", val: "0.0%" },
          { label: "Interest Earned", val: "+2.5%" }
        ]
      },
      assetB: {
        name: "Physical Gold Story",
        value: "$15,231",
        yield: "+52.3%",
        barWidth: "75%",
        metrics: [
          { label: "Asset Price Growth", val: "+52.3%" },
          { label: "FX Impact", val: "0.0%" },
          { label: "Cash Yield / Dividend", val: "0.0% (None)" }
        ]
      },
      why: "High inflation decreased the real purchasing power of cash savings despite a tiny 2.5% interest rate. Gold had no dividend yields, but the physical asset price grew by 52.3% as capital fled cash, winning the protection duel.",
      lesson: "Cash is safe from volatility but loses guaranteed purchasing power to inflation. Gold has no cash flow but acts as a physical store of value."
    }
  };

  const currentCase = cases[activeCase];

  return (
    <section id="trust" className="py-24 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 dark:border-slate-800 grid-pattern-fine text-left">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="max-w-3xl mb-12">
          <span className="text-sm font-semibold tracking-wider text-brand-primary uppercase font-mono">
            Interactive Case Lab
          </span>
          <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white dark:text-white tracking-tight mt-2">
            See how we explain why things happened.
          </h2>
          <p className="mt-4 text-base text-slate-600 dark:text-slate-300 dark:text-slate-300 leading-relaxed font-medium">
            Don't just take our word for it. Explore our live interactive comparison studies to see how we break down complex asset classes using real metrics.
          </p>
        </div>

        {/* Dynamic Sandbox Container */}
        <div className="relative rounded-3xl border border-indigo-100 bg-white dark:bg-slate-950 p-8 sm:p-12 shadow-premium overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-indigo-50/40 dark:bg-indigo-900/20 blur-3xl -z-10 animate-pulse" />

          {/* Left Column: Interactive Controls (4 cols) */}
          <div className="lg:col-span-4 flex flex-col justify-between gap-6 border-r border-slate-100 dark:border-slate-800 pr-0 lg:pr-8">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Case Selection</span>
              <div className="flex flex-col gap-3 mt-4">
                <button
                  onClick={() => setActiveCase("expat")}
                  onMouseEnter={() => setActiveCase("expat")}
                  className={`w-full p-4 rounded-xl border text-left transition-all duration-300 ${activeCase === "expat"
                      ? "scale-[1.02] border-brand-primary bg-indigo-50/30 dark:bg-indigo-900/20 shadow-md"
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:scale-[1.02] hover:shadow-md hover:border-slate-300 dark:hover:border-slate-500"
                    }`}
                >
                  <span className="text-xs font-bold text-slate-400 block font-mono group-hover:text-slate-300">CASE STUDY 01</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white mt-1 block">EUR Expat vs USD Assets</span>
                </button>

                <button
                  onClick={() => setActiveCase("gold")}
                  onMouseEnter={() => setActiveCase("gold")}
                  className={`w-full p-4 rounded-xl border text-left transition-all duration-300 ${activeCase === "gold"
                      ? "scale-[1.02] border-brand-primary bg-indigo-50/30 dark:bg-indigo-900/20 shadow-md"
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:scale-[1.02] hover:shadow-md hover:border-slate-300 dark:hover:border-slate-500"
                    }`}
                >
                  <span className="text-xs font-bold text-slate-400 block font-mono group-hover:text-slate-300">CASE STUDY 02</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white mt-1 block">Gold vs Cash Savings</span>
                </button>
              </div>
            </div>

            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100/50 dark:border-indigo-800/30">
              <span className="text-xs font-bold text-brand-primary font-mono block">💡 How to Read:</span>
              <p className="text-xs text-brand-primary/80 dark:text-indigo-300/80 mt-1.5 leading-relaxed font-medium">
                Click a case study option to immediately load its corresponding real driver breakdown and visual yield bars on the right.
              </p>
            </div>
          </div>

          {/* Right Column: High-fidelity Comparison Dashboard (8 cols) */}
          <div className="lg:col-span-8 flex flex-col justify-between gap-8">
            <div>
              <span className="text-[10px] font-bold text-brand-primary uppercase tracking-wider font-mono">Case Lab Result</span>
              <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white dark:text-white mt-2">{currentCase.title}</h3>
              <p className="text-xs text-slate-500 font-medium mt-1 leading-normal">{currentCase.subtitle}</p>

              {/* Graphical Yield Bars */}
              <div className="mt-8 space-y-5">

                {/* Asset A */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold font-mono">
                    <span className="text-slate-600 dark:text-slate-300">{currentCase.assetA.name}</span>
                    <span className="text-slate-800 dark:text-slate-200">{currentCase.assetA.value} ({currentCase.assetA.yield})</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-6 rounded-lg overflow-hidden flex items-center pr-2">
                    <div
                      className="bg-slate-400 h-full rounded-lg transition-all duration-500 ease-out"
                      style={{ width: currentCase.assetA.barWidth }}
                    />
                  </div>
                  {/* Dynamic metrics mapping */}
                  <div className="grid grid-cols-3 gap-2 text-[9px] font-mono text-slate-400 pt-0.5">
                    {currentCase.assetA.metrics.map((m, i) => (
                      <span key={i}>{m.label}: {m.val}</span>
                    ))}
                  </div>
                </div>

                {/* Asset B */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold font-mono">
                    <span className="text-slate-900 dark:text-white">{currentCase.assetB.name}</span>
                    <span className="text-brand-secondary">{currentCase.assetB.value} ({currentCase.assetB.yield})</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-6 rounded-lg overflow-hidden flex items-center pr-2">
                    <div
                      className="bg-brand-primary h-full rounded-lg transition-all duration-500 ease-out"
                      style={{ width: currentCase.assetB.barWidth }}
                    />
                  </div>
                  {/* Dynamic metrics mapping */}
                  <div className="grid grid-cols-3 gap-2 text-[9px] font-mono text-slate-400 pt-0.5">
                    {currentCase.assetB.metrics.map((m, i) => (
                      <span key={i}>{m.label}: {m.val}</span>
                    ))}
                  </div>
                </div>

              </div>
            </div>

            {/* Why & Lesson Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-100 dark:border-slate-800">
              <div className="p-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-left">
                <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 block uppercase font-mono tracking-wider">❓ Why This Happened</span>
                <p className="text-xs text-slate-600 dark:text-slate-300 dark:text-slate-300 mt-2 leading-relaxed font-medium">
                  {currentCase.why}
                </p>
              </div>

              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/30 rounded-xl text-left">
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 block uppercase font-mono tracking-wider">💡 The Key Lesson</span>
                <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-2 leading-relaxed font-semibold">
                  {currentCase.lesson}
                </p>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
