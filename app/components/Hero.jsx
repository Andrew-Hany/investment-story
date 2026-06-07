"use client";

import React from "react";
import HeroVisual from "./HeroVisual";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-white dark:bg-slate-950 py-16 lg:py-24 grid-pattern">
      {/* Background glowing blob */}
      <div className="absolute top-0 right-0 -z-10 h-[600px] w-[600px] rounded-full bg-gradient-to-tr from-indigo-100/30 to-violet-100/20 blur-3xl opacity-80" />
      <div className="absolute bottom-0 left-0 -z-10 h-[500px] w-[500px] rounded-full bg-gradient-to-br from-emerald-50/20 to-teal-50/10 blur-2xl opacity-60" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Copy Column (5 cols on large screens) */}
          <div className="lg:col-span-5 flex flex-col justify-center text-left">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-brand-primary w-fit mb-6">
              📊 Objective Comparison Lab
            </span>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-none">
              Which was better? <br />
              <span className="bg-gradient-to-r from-brand-primary to-brand-accent bg-clip-text text-transparent">
                And why?
              </span>
            </h1>

            <p className="mt-6 text-lg font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
              We focus on helping you compare investment stories side-by-side objectively. We provide real metrics and explain exactly why outcomes happened historically.
            </p>

            <p className="mt-4 text-sm text-slate-500 dark:text-slate-400 leading-relaxed border-l-2 border-brand-primary/20 pl-4">
              Understand the precise contributors behind price growth, dividends, currency shifts (FX), and drawdown risks so you can make your own logical decisions.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href="#why-story"
                className="inline-flex h-12 items-center justify-center rounded-full bg-brand-primary px-6 text-sm font-semibold text-white shadow-md hover:bg-brand-primary-hover transition-colors"
              >
                Explore the Story Flow
              </a>
              <a
                href="#features"
                className="inline-flex h-12 items-center justify-center rounded-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800/50 px-6 text-sm font-semibold text-slate-700 dark:text-white shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Compare Real Metrics
              </a>
            </div>
          </div>

          {/* Visual Column (7 cols on large screens) */}
          <div className="lg:col-span-7 w-full">
            <HeroVisual />
          </div>

        </div>
      </div>
    </section>
  );
}
