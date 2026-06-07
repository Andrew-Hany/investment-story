
"use client";

import React, { useState } from "react";

export default function ProblemSection() {
  const [activeStep, setActiveStep] = useState(null);

  const steps = [
    {
      id: "start",
      title: "1. Start Capital",
      desc: "Your absolute starting capital in your home currency. Traditional tools only see this baseline and the end price, skipping the journey of how returns are actually built.",
    },
    {
      id: "exchange",
      title: "2. Initial Exchange",
      desc: "Because Apple is a US stock and you are a Euro investor, your capital is seamlessly exchanged from EUR to USD to buy the shares at the starting exchange rate."
    },
    {
      id: "price",
      title: "3. Asset Price Growth",
      desc: "The asset price rose in USD. Price growth represents the core underlying commercial demand for the asset.",
    },
    {
      id: "dividends",
      title: "4. Dividends Boost",
      desc: "Quarterly dividend cash flows were collected and automatically reinvested into more shares, compounding your gains."
    },
    {
      id: "prefx",
      title: "5. Before Exchange",
      desc: "The total nominal value of your Apple shares in USD, right before you cash out and convert back to your home currency."
    },
    {
      id: "final",
      title: "6. Final Wallet",
      desc: "Your actual, realized purchasing power in Euro. The shift back to EUR reveals exactly how much FX movements helped or hurt your final return."
    }
  ];

  return (
    <section id="why-story" className="py-24 bg-slate-50/50 dark:bg-slate-900/50 border-y border-slate-100 dark:border-slate-800 grid-pattern-fine overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl text-left mb-12">
          <span className="text-sm font-semibold tracking-wider text-brand-primary uppercase">
            The Second Section: Visualizing the journey
          </span>
          <h2 className="mt-2 text-4xl font-extrabold text-slate-900 dark:text-white sm:text-5xl tracking-tight">
            One graph does not explain an investment.
          </h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-300">
            A price chart only shows the start and end endpoints. Here is the actual step-by-step story of how your final outcome was built, tracked from a single starting capital.
          </p>
        </div>

        {/* FLOWCHART WRAPPER */}
        <div className="bg-white dark:bg-slate-900/40 border border-glass-border dark:border-slate-700 rounded-2xl p-6 shadow-premium mb-8 text-left">
          
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/60 pb-4 mb-8">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Milestone Journey (EUR Investor)</h3>
            <span className="text-xs text-slate-400 font-mono">Interactive Flow Diagram</span>
          </div>

          {/* Flow Container */}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-3 lg:gap-1.5 py-4">
            
            {/* Step 1: START CAPITAL */}
            <div 
              onMouseEnter={() => setActiveStep("start")}
              onMouseLeave={() => setActiveStep(null)}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border w-full lg:flex-1 lg:min-w-0 shadow-sm text-center transition-all duration-300 cursor-pointer ${
                activeStep === "start" ? "border-slate-400 dark:border-slate-500 bg-slate-50 dark:bg-slate-800" : "bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              <span className="text-[8px] text-slate-400 font-mono uppercase font-bold tracking-wider">Start Capital</span>
              <span className="font-mono text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-200 mt-1">€10,000</span>
            </div>

            {/* ARROW 1a: Initial Exchange */}
            <div className="flex flex-col items-center justify-center min-w-[50px] text-center my-1 lg:my-0">
              <span className="text-sm font-bold text-slate-300 dark:text-slate-700 mt-0.5 lg:rotate-0 rotate-90">➔</span>
              <span className="text-[7px] text-slate-400 font-mono font-bold mt-1">1 EUR = $1.10</span>
            </div>

            {/* STEP 1.5: INITIAL EXCHANGE */}
            <div 
              onMouseEnter={() => setActiveStep("exchange")}
              onMouseLeave={() => setActiveStep(null)}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border w-full lg:flex-1 lg:min-w-0 shadow-inner text-center transition-all duration-300 cursor-pointer ${
                activeStep === "exchange" ? "border-slate-400 dark:border-slate-500 bg-slate-100 dark:bg-slate-800" : "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <span className="text-[8px] text-slate-500 font-mono uppercase font-bold tracking-wider">Initial Exchange</span>
              <span className="font-mono text-xs sm:text-sm font-extrabold text-slate-700 dark:text-slate-300 mt-1">$11,000</span>
            </div>

            {/* ARROW 1b: Price Growth Rate */}
            <div className="flex flex-col items-center justify-center min-w-[50px] text-center my-1 lg:my-0">
              <span className="text-[8px] text-blue-600 dark:text-blue-400 font-mono bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-100/50 dark:border-blue-900/30 font-bold uppercase tracking-wider">
                +143.6%
              </span>
              <span className="text-sm font-bold text-slate-300 dark:text-slate-700 mt-0.5 lg:rotate-0 rotate-90">➔</span>
            </div>

            {/* STEP 2: PRICE GROWTH */}
            <div 
              onMouseEnter={() => setActiveStep("price")}
              onMouseLeave={() => setActiveStep(null)}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border w-full lg:flex-1 lg:min-w-0 shadow-sm text-center transition-all duration-300 cursor-pointer ${
                activeStep === "price" ? "border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/40" : "bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              <span className="text-[8px] text-slate-400 font-mono uppercase font-bold tracking-wider">Asset Price Growth</span>
              <span className="font-mono text-xs sm:text-sm font-extrabold text-blue-600 dark:text-blue-400 mt-1">+$15,796</span>
            </div>

            {/* ARROW 2: Dividends Rate */}
            <div className="flex flex-col items-center justify-center min-w-[50px] text-center my-1 lg:my-0">
              <span className="text-[8px] text-emerald-600 dark:text-emerald-400 font-mono bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-100/50 dark:border-emerald-900/30 font-bold uppercase tracking-wider">
                +11.9%
              </span>
              <span className="text-sm font-bold text-slate-300 dark:text-slate-700 mt-0.5 lg:rotate-0 rotate-90">➔</span>
            </div>

            {/* STEP 3: DIVIDENDS */}
            <div 
              onMouseEnter={() => setActiveStep("dividends")}
              onMouseLeave={() => setActiveStep(null)}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border w-full lg:flex-1 lg:min-w-0 shadow-sm text-center transition-all duration-300 cursor-pointer ${
                activeStep === "dividends" ? "border-emerald-400 dark:border-emerald-500 bg-emerald-50 dark:bg-emerald-900/40" : "bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              <span className="text-[8px] text-slate-400 font-mono uppercase font-bold tracking-wider">Dividends Boost</span>
              <span className="font-mono text-xs sm:text-sm font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">+$1,309</span>
            </div>

            {/* ARROW 3a: Pre-FX */}
            <div className="flex flex-col items-center justify-center min-w-[50px] text-center my-1 lg:my-0">
              <span className="text-[8px] text-slate-400 font-mono uppercase font-bold tracking-wider">Pre-FX</span>
              <span className="text-sm font-bold text-slate-300 dark:text-slate-700 mt-0.5 lg:rotate-0 rotate-90">➔</span>
            </div>

            {/* STEP 3.5: BEFORE EXCHANGE TOTAL */}
            <div 
              onMouseEnter={() => setActiveStep("prefx")}
              onMouseLeave={() => setActiveStep(null)}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border w-full lg:flex-1 lg:min-w-0 shadow-inner text-center transition-all duration-300 cursor-pointer ${
                activeStep === "prefx" ? "border-slate-400 dark:border-slate-500 bg-slate-100 dark:bg-slate-800" : "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <span className="text-[8px] text-slate-500 font-mono uppercase font-bold tracking-wider">Before Exchange</span>
              <span className="font-mono text-xs sm:text-sm font-extrabold text-slate-700 dark:text-slate-300 mt-1">$28,105</span>
            </div>

            {/* ARROW 3b: FX Shift */}
            <div className="flex flex-col items-center justify-center min-w-[55px] text-center my-1 lg:my-0">
              <span className="text-[8px] text-violet-600 dark:text-violet-400 font-mono bg-violet-50 dark:bg-violet-950/40 px-2 py-0.5 rounded border border-violet-100/50 dark:border-violet-900/30 font-bold mb-1">
                +35.1% Shift
              </span>
              <span className="text-[10px] font-extrabold text-violet-600 dark:text-violet-400 font-mono">+€3,510</span>
              <span className="text-sm font-bold text-slate-300 dark:text-slate-700 mt-0.5 lg:rotate-0 rotate-90">➔</span>
              <span className="text-[7px] text-slate-400 font-mono font-bold mt-1">1 EUR = $0.97</span>
            </div>

            {/* STEP 4: FINAL WALLET */}
            <div 
              onMouseEnter={() => setActiveStep("final")}
              onMouseLeave={() => setActiveStep(null)}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border w-full lg:flex-1 lg:min-w-0 shadow-sm text-center transition-all duration-300 cursor-pointer ${
                activeStep === "final" ? "border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400" : "bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              <span className="text-[8px] text-slate-400 font-mono uppercase font-bold tracking-wider">Final Wallet</span>
              <span className="font-mono text-xs sm:text-sm font-black mt-1">€29,060</span>
            </div>

          </div>

          {/* DYNAMIC DESCRIPTION BOX */}
          <div className="mt-8 p-5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl min-h-[90px] transition-all duration-300">
            {activeStep ? (
              <div className="animate-fadeIn">
                <span className="text-xs font-bold text-brand-primary uppercase font-mono block">
                  {steps.find((s) => s.id === activeStep)?.title}
                </span>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 mt-1">
                  {steps.find((s) => s.id === activeStep)?.desc}
                </p>
              </div>
            ) : (
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase font-mono block">Interactive Driver Legend</span>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mt-1">How is your final €29,060 value structured?</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">Hover over any step in the milestone arrows above to see how price, currency (FX), and dividends factored into the realized historical outcome.</p>
              </div>
            )}
          </div>
        </div>

        {/* Narrative Context Box */}
        <div className="bg-indigo-900/5 border border-indigo-200 dark:border-indigo-900/50 rounded-2xl p-6">
          <p className="text-sm text-indigo-900 dark:text-indigo-200 leading-relaxed">
            <strong>Why did this happen?</strong> Apple's core business grew, the strong USD currency gave Euro investors a huge tailwind boost, and reinvesting dividends added compound weight. However, unlocking this story required holding through a painful <strong>-21.8% maximum drawdown</strong>. Simple price charts hide these drivers!
          </p>
        </div>

      </div>
    </section>
  );
}
