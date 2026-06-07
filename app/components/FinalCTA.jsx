"use client";

import React from "react";

export default function FinalCTA() {
  return (
    <section id="explore" className="relative py-24 bg-white dark:bg-slate-950 overflow-hidden grid-pattern">
      {/* Background radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10 h-[600px] w-[600px] rounded-full bg-gradient-to-tr from-indigo-50 to-violet-50 blur-3xl opacity-80" />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-brand-primary mb-6">
          🚀 Get Early Access
        </span>

        <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-none">
          Ready to read the story <br />
          behind the numbers?
        </h2>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
          Start learning through historical investment stories, or get in touch with our team if you want to help shape the future of this educational tool.
        </p>

        {/* Buttons */}
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <a
            href="#explore"
            className="inline-flex h-12 items-center justify-center rounded-full bg-brand-primary px-8 text-sm font-semibold text-white shadow-md hover:bg-brand-primary-hover transition-all duration-200"
          >
            Start Exploring the Story
          </a>
          <a
            href="mailto:contribute@investmentstory.com"
            className="inline-flex h-12 items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-8 text-sm font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-all duration-200"
          >
            Contact to Contribute
          </a>
        </div>

        {/* Light hint below button */}
        <p className="text-xs text-slate-400 mt-4">
          Free educational platform. No registration fees or credit cards required.
        </p>

      </div>
    </section>
  );
}
