"use client";

import React, { useState } from "react";

export default function ProblemSection() {
  // Set default active step to the first one for mobile wizard navigation
  const [activeStep, setActiveStep] = useState("start");

  const steps = [
    {
      id: "start",
      title: "1. Start Capital",
      val: "€10,000",
      desc: "Your absolute starting capital in your home currency. Traditional tools only see this baseline and the end price, skipping the journey of how returns are actually built.",
    },
    {
      id: "exchange",
      title: "2. Initial Exchange",
      val: "$11,000",
      desc: "Because Apple is a US stock and you are a Euro investor, your capital is seamlessly exchanged from EUR to USD to buy the shares at the starting exchange rate (1 EUR = $1.10)."
    },
    {
      id: "price",
      title: "3. Asset Price Growth",
      val: "+$15,796",
      badge: "+143.6%",
      desc: "The asset price rose in USD. Price growth represents the core underlying commercial demand for the asset.",
    },
    {
      id: "dividends",
      title: "4. Dividends Boost",
      val: "+$1,309",
      badge: "+11.9%",
      desc: "Quarterly dividend cash flows were collected and automatically reinvested into more shares, compounding your gains."
    },
    {
      id: "prefx",
      title: "5. Before Exchange",
      val: "$28,105",
      desc: "The total nominal value of your Apple shares in USD, right before you cash out and convert back to your home currency."
    },
    {
      id: "final",
      title: "6. Final Wallet",
      val: "€29,060",
      badge: "+35.1% Shift",
      desc: "Your actual, realized purchasing power in Euro. The shift back to EUR reveals exactly how much FX movements helped or hurt your final return (converting at 1 EUR = $0.97)."
    }
  ];

  const activeIndex = steps.findIndex(s => s.id === activeStep);

  const handleNext = () => {
    if (activeIndex < steps.length - 1) {
      setActiveStep(steps[activeIndex + 1].id);
    }
  };

  const handlePrev = () => {
    if (activeIndex > 0) {
      setActiveStep(steps[activeIndex - 1].id);
    }
  };

  return (
    <section id="why-story" className="py-24 bg-slate-50/50 dark:bg-slate-900/50 border-y border-slate-100 dark:border-slate-800 grid-pattern-fine overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl text-left mb-6 sm:mb-12">
          <span className="text-sm font-semibold tracking-wider text-brand-primary uppercase">
            Visualizing the journey
          </span>
          <h2 className="hidden sm:block mt-2 text-4xl font-extrabold text-slate-900 dark:text-white sm:text-5xl tracking-tight">
            One graph does not explain an investment.
          </h2>
          <p className="hidden sm:block mt-4 text-lg text-slate-600 dark:text-slate-300">
            A price chart only shows the start and end endpoints. Here is the actual step-by-step story of how your final outcome was built, tracked from a single starting capital.
          </p>
        </div>

        {/* FLOWCHART WRAPPER */}
        <div className="bg-white dark:bg-slate-900/40 border border-glass-border dark:border-slate-700 rounded-2xl p-4 sm:p-6 shadow-premium mb-8 text-left">
          
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/60 pb-4 mb-6">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Milestone Journey (EUR Investor)</h3>
            <span className="text-xs text-slate-400 font-mono">Interactive Flow Diagram</span>
          </div>

          {/* DESKTOP FLOW: Show all side-by-side */}
          <div className="hidden md:flex flex-row items-center justify-between gap-1.5 py-4 w-full">
            {steps.map((step, index) => {
              const isActive = activeStep === step.id;
              return (
                <React.Fragment key={step.id}>
                  {/* Step Card */}
                  <div 
                    onMouseEnter={() => setActiveStep(step.id)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border flex-1 shadow-sm text-center transition-all duration-300 cursor-pointer ${
                      isActive 
                        ? "border-brand-primary bg-indigo-50/20 dark:bg-slate-850" 
                        : "bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                    }`}
                  >
                    <span className="text-[8px] text-slate-400 font-mono uppercase font-bold tracking-wider">{step.title.split(". ")[1]}</span>
                    <span className={`font-mono text-xs sm:text-sm font-extrabold mt-1 ${
                      step.id === "price" ? "text-blue-600 dark:text-blue-400" :
                      step.id === "dividends" ? "text-emerald-600 dark:text-emerald-400" :
                      step.id === "final" ? "text-brand-primary" : "text-slate-800 dark:text-slate-200"
                    }`}>
                      {step.val}
                    </span>
                  </div>
 
                  {/* Arrow if not last */}
                  {index < steps.length - 1 && (
                    <div className="flex flex-col items-center justify-center px-1 text-center">
                      {steps[index + 1].badge && (
                        <span className={`text-[7px] font-mono px-1 rounded border font-bold ${
                          steps[index + 1].id === "price" ? "text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-100" :
                          steps[index + 1].id === "dividends" ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100" :
                          "text-violet-600 bg-violet-50 dark:bg-violet-950/40 border-violet-100"
                        }`}>
                          {steps[index + 1].badge}
                        </span>
                      )}
                      <span className="text-slate-300 dark:text-slate-700 font-bold text-sm">➔</span>
                    </div>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* MOBILE FLOW: Compact Z-shape / Snake grid layout (Non-Scrollable) */}
          <div className="md:hidden flex flex-col items-center gap-3 py-2 w-full">
            
            {/* ROW 1: Start Capital to Initial Exchange */}
            <div className="flex flex-row items-center justify-center w-full gap-2">
              <div 
                onClick={() => setActiveStep("start")}
                onMouseEnter={() => setActiveStep("start")}
                className={`flex-1 flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all duration-200 cursor-pointer ${
                  activeStep === "start" ? "border-brand-primary bg-indigo-50/20 dark:bg-slate-800" : "bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800"
                }`}
              >
                <span className="text-[8px] text-slate-400 font-mono uppercase font-bold tracking-wider">Start Capital</span>
                <span className="font-mono text-xs font-extrabold text-slate-800 dark:text-slate-200 mt-1">€10,000</span>
              </div>
 
              <div className="flex flex-col items-center justify-center text-center px-1">
                <span className="text-[7px] text-slate-400 font-mono font-bold leading-none">1.10 Rate</span>
                <span className="text-slate-300 dark:text-slate-700 font-bold text-xs mt-0.5">➔</span>
              </div>
 
              <div 
                onClick={() => setActiveStep("exchange")}
                onMouseEnter={() => setActiveStep("exchange")}
                className={`flex-1 flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all duration-200 cursor-pointer ${
                  activeStep === "exchange" ? "border-brand-primary bg-slate-100/50 dark:bg-slate-800" : "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800"
                }`}
              >
                <span className="text-[8px] text-slate-500 font-mono uppercase font-bold tracking-wider">Initial Exch</span>
                <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 mt-1">$11,000</span>
              </div>
            </div>
 
            {/* CONNECTOR 1: Downward to Row 2 */}
            <div className="flex flex-col items-center justify-center text-center my-0.5">
              <span className="text-[8px] text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded border border-blue-100 font-mono font-bold">
                Asset Price Growth (+143.6%)
              </span>
              <span className="text-slate-300 dark:text-slate-700 font-bold text-xs mt-1">▼</span>
            </div>
 
            {/* ROW 2: Price Growth to Dividends */}
            <div className="flex flex-row items-center justify-center w-full gap-2">
              <div 
                onClick={() => setActiveStep("price")}
                onMouseEnter={() => setActiveStep("price")}
                className={`flex-1 flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all duration-200 cursor-pointer ${
                  activeStep === "price" ? "border-brand-primary bg-indigo-50/20 dark:bg-slate-800" : "bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800"
                }`}
              >
                <span className="text-[8px] text-slate-400 font-mono uppercase font-bold tracking-wider">Price Growth</span>
                <span className="font-mono text-xs font-extrabold text-blue-600 dark:text-blue-400 mt-1">+$15,796</span>
              </div>
 
              <div className="flex flex-col items-center justify-center text-center px-1">
                <span className="text-[7px] text-emerald-600 font-mono font-bold leading-none">+11.9% Divs</span>
                <span className="text-slate-300 dark:text-slate-700 font-bold text-xs mt-0.5">➔</span>
              </div>
 
              <div 
                onClick={() => setActiveStep("dividends")}
                onMouseEnter={() => setActiveStep("dividends")}
                className={`flex-1 flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all duration-200 cursor-pointer ${
                  activeStep === "dividends" ? "border-brand-primary bg-indigo-50/20 dark:bg-slate-800" : "bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800"
                }`}
              >
                <span className="text-[8px] text-slate-400 font-mono uppercase font-bold tracking-wider">Dividends Boost</span>
                <span className="font-mono text-xs font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">+$1,309</span>
              </div>
            </div>
 
            {/* CONNECTOR 2: Downward to Row 3 */}
            <div className="flex flex-col items-center justify-center text-center my-0.5">
              <span className="text-[8px] text-slate-400 font-mono uppercase font-bold">
                Pre-FX Total Value
              </span>
              <span className="text-slate-300 dark:text-slate-700 font-bold text-xs mt-1">▼</span>
            </div>
 
            {/* ROW 3: Before Exchange to Final Wallet */}
            <div className="flex flex-row items-center justify-center w-full gap-2">
              <div 
                onClick={() => setActiveStep("prefx")}
                onMouseEnter={() => setActiveStep("prefx")}
                className={`flex-1 flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all duration-200 cursor-pointer ${
                  activeStep === "prefx" ? "border-brand-primary bg-slate-100/50 dark:bg-slate-800" : "bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800"
                }`}
              >
                <span className="text-[8px] text-slate-500 font-mono uppercase font-bold tracking-wider">Before Exchange</span>
                <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300 mt-1">$28,105</span>
              </div>
 
              <div className="flex flex-col items-center justify-center text-center px-1">
                <span className="text-[7px] text-violet-600 font-mono font-bold leading-none">+35.1% FX</span>
                <span className="text-slate-300 dark:text-slate-700 font-bold text-xs mt-0.5">➔</span>
              </div>
 
              <div 
                onClick={() => setActiveStep("final")}
                onMouseEnter={() => setActiveStep("final")}
                className={`flex-1 flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all duration-200 cursor-pointer ${
                  activeStep === "final" ? "border-brand-primary bg-indigo-50/20 dark:bg-slate-800" : "bg-white dark:bg-slate-900/50 border-slate-200 dark:border-slate-800"
                }`}
              >
                <span className="text-[8px] text-slate-400 font-mono uppercase font-bold tracking-wider">Final Wallet</span>
                <span className="font-mono text-xs font-black text-brand-primary mt-1">€29,060</span>
              </div>
            </div>
 
          </div>
 
          {/* DESCRIPTION BOX (Visible on both mobile and desktop) */}
          <div className="mt-6 p-5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl min-h-[90px] transition-all duration-300">
            <div>
              <span className="text-xs font-bold text-brand-primary uppercase font-mono block">
                {steps[activeIndex].title}
              </span>
              <p className="text-sm font-semibold text-slate-850 dark:text-slate-100 mt-1 leading-relaxed">
                {steps[activeIndex].desc}
              </p>
            </div>
          </div>

        </div>

        {/* Narrative Context Box */}
        <div className="bg-indigo-900/5 border border-indigo-200 dark:border-indigo-900/50 rounded-2xl p-6">
          <p className="text-sm text-indigo-900 dark:text-indigo-200 leading-relaxed">
            <strong>Why did this happen?</strong> Apple&apos;s core business grew, the strong USD currency gave Euro investors a huge tailwind boost, and reinvesting dividends added compound weight. However, unlocking this story required holding through a painful <strong>-21.8% maximum drawdown</strong>. Simple price charts hide these drivers!
          </p>
        </div>

      </div>
    </section>
  );
}
