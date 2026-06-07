"use client";

import React from "react";

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 py-16 border-t border-slate-800">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start mb-12">
          {/* Brand Col */}
          <div className="md:col-span-5 flex flex-col gap-4 text-left">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded bg-gradient-to-tr from-brand-primary to-brand-accent text-white font-mono font-bold text-md">
                S
              </div>
              <span className="text-lg font-bold text-white tracking-tight">
                Investment<span className="text-indigo-400">Story</span>
              </span>
            </div>
            <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
              An investment analysis learning app automating historical gathering and calculation processes to teach users how to think, not what to buy.
            </p>
          </div>

          {/* Links Col */}
          <div className="md:col-span-3 text-left">
            <h4 className="text-xs font-bold text-slate-200 tracking-wider uppercase mb-4">Core Lab Features</h4>
            <ul className="space-y-2.5 text-sm">
              <li><a href="#why-story" className="hover:text-white transition-colors">Driver Separation</a></li>
              <li><a href="#features" className="hover:text-white transition-colors">Side Comparisons</a></li>
              <li><a href="#features" className="hover:text-white transition-colors">Portfolio Mix Simulator</a></li>
              <li><a href="#features" className="hover:text-white transition-colors">Currency Realizer</a></li>
            </ul>
          </div>

          {/* Regulatory Col */}
          <div className="md:col-span-4 text-left">
            <h4 className="text-xs font-bold text-slate-200 tracking-wider uppercase mb-4">Strict Disclaimer</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Investment Story is an interactive educational sandbox. All calculations, returns, currency metrics, and financial statement visualizers utilize historical records for demonstration purposes only. We do not provide financial, legal, tax, or investment advice.
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
          <span>&copy; {new Date().getFullYear()} Investment Story. All rights reserved.</span>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Data Sources</a>
          </div>
        </div>

      </div>
    </footer>
  );
}
