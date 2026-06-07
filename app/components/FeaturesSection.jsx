"use client";

import React, { useState } from "react";

export default function FeaturesSection() {
  const [activeTab, setActiveTab] = useState("story");

  const featureTabs = [
    {
      id: "story",
      title: "1. Single Investment Story",
      badge: "Deep Analysis",
      headline: "Read the full story behind a single investment.",
      copy: "See how an investment behaved historically, then learn what drove the result step by step instead of just staring at a flat return line.",
      highlights: ["Total Return", "FX & Drawdowns", "Value Trends"],
      outputs: [
        "Historical value over time",
        "Price return vs total return",
        "Dividend contribution",
        "FX impact when relevant",
        "Currency FX rate trends",
        "Pain and maximum drawdown metrics"
      ],
      visual: (
        <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-premium h-full flex flex-col justify-between border border-slate-800 text-left relative overflow-hidden">
          <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-emerald-500/10 blur-2xl -z-10" />
          
          <div>
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
              <span className="font-mono text-[10px] text-brand-secondary uppercase font-bold tracking-wider">Historical Driver Split</span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">AAPL / EUR Investor</span>
            </div>
 
            <div className="space-y-4">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">Total Value Achieved</span>
                <span className="text-3xl font-extrabold text-white font-mono tracking-tight">€212,397</span>
                <span className="text-xs text-brand-secondary font-bold ml-1">+212.4% total yield</span>
              </div>
 
              {/* Colorful Visual Stack Bar */}
              <div className="space-y-2 mt-4">
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Compounded Driver Breakdown</span>
                
                {/* Custom Segmented Stack */}
                <div className="h-6 w-full rounded-full overflow-hidden flex border border-slate-950/40">
                  <div className="h-full bg-brand-primary cursor-pointer hover:opacity-90 transition-opacity" style={{ width: "60%" }} title="Price Growth" />
                  <div className="h-full bg-brand-accent cursor-pointer hover:opacity-90 transition-opacity" style={{ width: "25%" }} title="FX Impact" />
                  <div className="h-full bg-brand-secondary cursor-pointer hover:opacity-90 transition-opacity" style={{ width: "15%" }} title="Dividends" />
                </div>
 
                {/* Segment Legend with details */}
                <div className="grid grid-cols-1 xs:grid-cols-3 gap-2 pt-2 text-[10px] font-mono">
                  <div className="flex flex-col border-l-2 border-brand-primary pl-2">
                    <span className="text-slate-400">Price Growth</span>
                    <span className="font-bold text-white">+143.6%</span>
                  </div>
                  <div className="flex flex-col border-l-2 border-brand-accent pl-2">
                    <span className="text-slate-400">FX Benefit</span>
                    <span className="font-bold text-white">+35.1%</span>
                  </div>
                  <div className="flex flex-col border-l-2 border-brand-secondary pl-2">
                    <span className="text-slate-400">Dividends</span>
                    <span className="font-bold text-white">+11.9%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-8 border-t border-slate-800 pt-3 text-[10px] text-slate-500 flex justify-between font-mono">
            <span>Historical analysis</span>
            <span>Not advice</span>
          </div>
        </div>
      )
    },
    {
      id: "comparison",
      title: "2. Side-by-Side Comparison",
      badge: "Side Contrast",
      headline: "Compare the stories side by side.",
      copy: "Instead of asking which chart went up more, compare two investments under the same starting amount, monthly contribution, and time period.",
      highlights: ["Wealth Contrast", "Risk Analysis", "Biz Grids"],
      outputs: [
        "Which investment ended higher historically",
        "How much higher in exact currency terms",
        "Main driver for the performance gap",
        "Drawdown/Risk comparison charts",
        "Dividends compounding comparison",
        "Business metric side-by-side grids"
      ],
      visual: (
        <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-premium h-full flex flex-col justify-between border border-slate-800 text-left relative overflow-hidden">
          <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-brand-primary/10 blur-2xl -z-10" />
 
          <div>
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
              <span className="font-mono text-[10px] text-brand-secondary uppercase font-bold tracking-wider">Contrast Visual</span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">Microsoft vs Gold</span>
            </div>
            
            {/* Visual Contrast Grid */}
            <div className="space-y-4">
              {/* MSFT */}
              <div className="relative p-3 rounded-lg bg-slate-800/40 border border-slate-700/30">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-mono">INVESTMENT A (MSFT)</span>
                    <span className="text-lg font-bold text-white">$143,210</span>
                  </div>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded font-bold font-mono">
                    +143% Return Winner
                  </span>
                </div>
                <div className="mt-2 w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-brand-primary h-full rounded-full" style={{ width: "90%" }} />
                </div>
              </div>
 
              {/* Gold */}
              <div className="relative p-3 rounded-lg bg-slate-800/40 border border-slate-700/30">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-mono">INVESTMENT B (GOLD)</span>
                    <span className="text-lg font-bold text-white">$112,045</span>
                  </div>
                  <span className="text-[10px] bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 px-2 py-0.5 rounded font-bold font-mono">
                    -11% Drawdown Winner
                  </span>
                </div>
                <div className="mt-2 w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-brand-accent h-full rounded-full" style={{ width: "50%" }} />
                </div>
              </div>
            </div>
          </div>
 
          <div className="mt-6 bg-brand-primary/10 p-2.5 rounded border border-brand-primary/20 text-[10px] text-indigo-300 leading-normal">
            📊 MSFT wins in final wealth by $31,165. Gold wins in risk, shielding you from extreme 25% drawdowns.
          </div>
        </div>
      )
    },
    {
      id: "simulator",
      title: "3. Portfolio Simulator",
      badge: "Mix & Match",
      headline: "Test the mix before trusting the idea.",
      copy: "Create an allocation with stocks, gold, cash, and other assets, then see how the portfolio behaved historically with visual rebalancing effects.",
      highlights: ["Stocks & Gold", "Rebalancing Yield", "Risk Cushion"],
      outputs: [
        "Portfolio value over time with contributions",
        "Annualized return of the custom mix",
        "Max drawdown pain points",
        "Asset contribution to return & risk ratios",
        "Rebalancing effect outcomes",
        "Educational explanation of diversification"
      ],
      visual: (
        <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-premium h-full flex flex-col justify-between border border-slate-800 text-left relative overflow-hidden">
          <div>
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
              <span className="font-mono text-[10px] text-brand-secondary uppercase font-bold tracking-wider">Dynamic Asset Pie</span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">Global Balanced</span>
            </div>
 
            {/* Custom Interactive CSS/SVG Pie Diagram */}
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 my-4">
              <div className="relative h-24 w-24 shrink-0 rounded-full border-4 border-slate-950 flex items-center justify-center bg-gradient-to-tr from-brand-primary to-brand-accent">
                <div className="h-16 w-16 rounded-full bg-slate-900 flex items-center justify-center text-[10px] font-mono text-slate-400 font-bold">
                  60/30/10
                </div>
              </div>
 
              <div className="space-y-2 w-full text-xs font-mono">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-brand-primary" />
                    <span>Stocks</span>
                  </div>
                  <span className="font-bold text-white">60%</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-brand-accent" />
                    <span>Gold</span>
                  </div>
                  <span className="font-bold text-white">30%</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-brand-secondary" />
                    <span>Cash</span>
                  </div>
                  <span className="font-bold text-white">10%</span>
                </div>
              </div>
            </div>
 
            <div className="rounded bg-brand-secondary/10 border border-brand-secondary/20 p-2.5 text-[10px] text-brand-secondary font-semibold">
              🔄 Annual Rebalancing: Buying the lagging asset and selling the winner added +0.4% annualized return over buy-and-hold.
            </div>
          </div>
          <div className="mt-4 border-t border-slate-800 pt-2 text-[9px] text-slate-500 font-mono">
            Allocation backtester lab
          </div>
        </div>
      )
    },
    {
      id: "statements",
      title: "4. Financial Statements",
      badge: "Company Story",
      headline: "Learn what the business numbers are saying.",
      copy: "For single stocks, the app helps you read the company story behind the market story. Understand the connection between operations and market yields.",
      highlights: ["Revenue Trend", "FCF Cash Yield", "Margin Drivers"],
      outputs: [
        "Is revenue growing steadily?",
        "Is profit growing at a faster rate?",
        "Are operating margins improving over time?",
        "Does net income convert to real cash flow?",
        "Are assets and liabilities manageable?",
        "Interactive diagrams of equity connections"
      ],
      visual: (
        <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-premium h-full flex flex-col justify-between border border-slate-800 text-left relative overflow-hidden">
          <div>
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
              <span className="font-mono text-[10px] text-brand-secondary uppercase font-bold tracking-wider">Business Pipeline Diagram</span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">MSFT Annual</span>
            </div>
 
            {/* Pipeline Visual Chart representing cash conversion */}
            <div className="space-y-3 font-mono text-[11px] my-3">
              {/* Step 1: Revenue */}
              <div className="flex justify-between items-center p-2 rounded bg-slate-800/40 border border-slate-700/30">
                <span className="text-slate-400">1. Top Line Revenue</span>
                <span className="font-bold text-white">$211.9 Billion</span>
              </div>
              
              <div className="text-center text-xs text-brand-primary">↓ (Operating Costs: -58%)</div>
              
              {/* Step 2: Net Income */}
              <div className="flex justify-between items-center p-2 rounded bg-slate-800/40 border border-slate-700/30">
                <span className="text-slate-400">2. Net Profits</span>
                <span className="font-bold text-white">$88.5 Billion</span>
              </div>
 
              <div className="text-center text-xs text-brand-secondary">↓ (Cash Quality Conversion: 105%)</div>
 
              {/* Step 3: Cash Flow */}
              <div className="flex justify-between items-center p-2 rounded bg-brand-secondary/10 border border-brand-secondary/20">
                <span className="text-brand-secondary font-bold">3. Free Cash Flow (Actual Cash)</span>
                <span className="font-bold text-emerald-400">$92.9 Billion</span>
              </div>
            </div>
          </div>
          
          <div className="rounded bg-indigo-950 border border-indigo-900/40 p-2 text-[9px] text-slate-300">
            ✔️ High quality: Cash Flow exceeds Net Income. This business compounds cleanly.
          </div>
        </div>
      )
    },
    {
      id: "currency",
      title: "5. Currency Reality",
      badge: "Expat Focus",
      headline: "International investing has two stories.",
      copy: "If your money is in EUR but the asset trades in USD, the stock return is only part of the result. Currency shifts can double your return or cut it in half.",
      highlights: ["Local Return", "FX Windfalls", "Rate Volatility"],
      outputs: [
        "Return in local asset currency",
        "Realized return in your own user currency",
        "FX contribution metrics",
        "Annual FX compound impact",
        "Currency volatility measurements",
        "Plain-language explanation of exchange rates"
      ],
      visual: (
        <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-premium h-full flex flex-col justify-between border border-slate-800 text-left relative overflow-hidden">
          <div>
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 mb-4">
              <span className="font-mono text-[10px] text-brand-secondary uppercase font-bold tracking-wider">Currency Wallet Converter</span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">EUR vs USD</span>
            </div>
 
            {/* Dynamic Responsive Wallet Graphic */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 my-4 font-mono text-center w-full">
              <div className="w-full sm:flex-1 p-3 bg-slate-800 rounded border border-slate-700/40">
                <span className="text-[9px] text-slate-400 block">USD ASSET</span>
                <span className="text-sm font-bold text-slate-300">$10,000</span>
                <span className="text-[9px] text-emerald-400 block mt-1">+82.4%</span>
              </div>
              
              <div className="flex flex-col items-center justify-center shrink-0">
                {/* Horizontal arrow on desktop, vertical on mobile */}
                <span className="hidden sm:inline text-slate-500 font-bold text-lg">➔</span>
                <span className="sm:hidden text-slate-500 font-bold text-lg">▼</span>
              </div>
 
              <div className="w-full sm:flex-1 p-3 bg-brand-primary/10 rounded border border-brand-primary/20">
                <span className="text-[9px] text-brand-primary block font-bold">EUR POCKET</span>
                <span className="text-sm font-bold text-white">€11,750</span>
                <span className="text-[9px] text-brand-secondary block mt-1 font-bold">+117.5%</span>
              </div>
            </div>
 
            <div className="p-2.5 bg-indigo-950/40 rounded border border-indigo-900/30 text-xs">
              <span className="text-brand-accent block font-bold text-[10px]">FX Compound Boost (+35.1%)</span>
              <p className="text-[10px] text-slate-300">EUR weakened against USD during this period, increasing your real home-currency returns by an extra 35.1%.</p>
            </div>
          </div>
          <div className="mt-4 border-t border-slate-800 pt-2 text-[9px] text-slate-500 font-mono">
            Expat dual-account tracking model
          </div>
        </div>
      )
    }
  ];

  const currentFeature = featureTabs.find((tab) => tab.id === activeTab);

  return (
    <section id="features" className="py-24 bg-white dark:bg-slate-950 grid-pattern">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl text-left mb-16">
          <span className="text-sm font-semibold tracking-wider text-brand-primary uppercase">
            Product Deep Dive
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-2">
            The features that set us apart.
          </h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400 dark:text-slate-300 leading-relaxed font-medium">
            We do not show generic stock prices or tell you what to buy. We automate the analysis so you can learn how returns are built historically.
          </p>
        </div>

        {/* Tab Controls (Single horizontal scrollable row on mobile showing exactly 3.5 buttons) */}
        <div className="flex flex-row items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-none border-b border-slate-100 dark:border-slate-800 pb-3 mb-6 w-full">
          {featureTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-[27%] sm:w-auto px-1 sm:px-4 py-1.5 text-xs sm:text-sm font-bold rounded-full transition-all duration-200 shrink-0 text-center truncate ${
                activeTab === tab.id
                  ? "bg-brand-primary text-white shadow-sm"
                  : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              }`}
            >
              {tab.badge}
            </button>
          ))}
        </div>

        {/* Tab Content Display */}
        {currentFeature && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-stretch">
            
            {/* Tab Copy Details (7 columns - displays first on desktop, second on mobile) */}
            <div className="lg:col-span-7 flex flex-col justify-center text-left order-2 lg:order-1">
              <span className="text-[10px] sm:text-xs font-mono font-semibold text-brand-primary uppercase animate-pulse">
                {currentFeature.title}
              </span>
              <h3 className="text-xl sm:text-3xl font-extrabold text-slate-900 dark:text-white mt-1 sm:mt-2">
                {currentFeature.headline}
              </h3>
              <p className="mt-2 sm:mt-4 text-xs sm:text-base text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                {currentFeature.copy}
              </p>
 
              {/* 3 Small Highlight Cards (Mobile Only) */}
              <div className="grid grid-cols-3 gap-2 mt-4 sm:hidden">
                {currentFeature.highlights?.map((highlight, index) => (
                  <div key={index} className="bg-blue-50/80 dark:bg-blue-950/30 border border-blue-100/70 dark:border-blue-900/30 rounded-xl p-2 text-center shadow-sm flex flex-col justify-center min-h-[50px] transition-all">
                    <span className="text-[9.5px] font-bold text-blue-750 dark:text-blue-300 leading-tight">
                      {highlight}
                    </span>
                  </div>
                ))}
              </div>

              {/* Checklist Outputs (Hidden on mobile to save vertical space) */}
              <div className="mt-6 hidden sm:block">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 tracking-wide uppercase font-mono">
                  What we analyze for you:
                </span>
                <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {currentFeature.outputs.map((output, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-400">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-brand-primary text-[10px] font-bold">
                        ✓
                      </span>
                      <span>{output}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
 
            {/* Tab Visual Representation (5 columns - displays first on mobile, second on desktop) */}
            <div className="lg:col-span-5 h-full min-h-[220px] order-1 lg:order-2">
              {currentFeature.visual}
            </div>
 
          </div>
        )}

      </div>
    </section>
  );
}
