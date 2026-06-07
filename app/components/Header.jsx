"use client";
 
import React, { useState } from "react";
import Link from "next/link";
import { useTheme } from "../context/ThemeContext";
 
export default function Header() {
  const { dark, toggle } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
 
  return (
    <header className="sticky top-0 z-50 w-full border-b border-glass-border bg-white/80 dark:bg-slate-950/85 backdrop-blur-md transition-all duration-300">
      <div className="mx-auto flex max-w-7xl h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left Side: Logo & Navigation */}
        <div className="flex items-center gap-8">
          {/* Brand Logo & Name */}
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity flex-shrink-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-tr from-brand-primary to-brand-accent shadow-md text-white font-mono font-bold text-lg">
              S
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Investment<span className="bg-gradient-to-r from-brand-primary to-brand-accent bg-clip-text text-transparent">Story</span>
            </span>
          </Link>
 
          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
            <Link href="/compare" className="hover:text-brand-primary dark:hover:text-brand-primary transition-colors">Compare</Link>
            <Link href="/monthly" className="hover:text-brand-primary dark:hover:text-brand-primary transition-colors">DCA Calculator</Link>
            <Link href="/optimizer" className="hover:text-brand-primary dark:hover:text-brand-primary transition-colors">Portfolio Optimizer</Link>
          </nav>
        </div>
 
        {/* Right side: dark toggle & hamburger */}
        <div className="flex items-center gap-3">
          {/* Dark Mode Toggle */}
          <button
            id="dark-mode-toggle"
            onClick={toggle}
            aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            className="relative h-9 w-16 rounded-full border border-slate-200 bg-slate-100 transition-all duration-300 hover:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/40"
            style={{
              backgroundColor: dark ? "#1e2433" : undefined,
              borderColor: dark ? "rgba(255,255,255,0.1)" : undefined,
            }}
          >
            {/* Track fill */}
            <span
              className="absolute inset-0 rounded-full transition-all duration-300"
              style={{
                background: dark
                  ? "linear-gradient(135deg, #312e81, #1e1b4b)"
                  : "linear-gradient(135deg, #e0e7ff, #f8fafc)",
              }}
            />
            {/* Thumb */}
            <span
              className="absolute top-1 h-7 w-7 rounded-full shadow-md flex items-center justify-center text-sm transition-all duration-300"
              style={{
                left: dark ? "calc(100% - 32px)" : "4px",
                background: dark ? "#4f46e5" : "#ffffff",
                boxShadow: dark
                  ? "0 2px 8px rgba(79,70,229,0.5)"
                  : "0 2px 6px rgba(15,23,42,0.12)",
              }}
            >
              {dark ? "🌙" : "☀️"}
            </span>
          </button>
 
          {/* Mobile Menu Hamburger Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex md:hidden h-9 w-9 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-brand-primary transition-colors focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div className="xl:hidden border-t border-amber-300 bg-amber-100 px-4 py-2 text-center text-xs font-semibold text-amber-900 dark:border-amber-500/40 dark:bg-amber-400/15 dark:text-amber-200">
        This is not yet optimized to look good on this device.
      </div>
 
      {/* Mobile Menu Panel */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 space-y-2 shadow-inner">
          <Link
            href="/compare"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-brand-primary transition-all"
          >
            Compare Metrics
          </Link>
          <Link
            href="/monthly"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-brand-primary transition-all"
          >
            DCA Calculator
          </Link>
          <Link
            href="/optimizer"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-lg text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 hover:text-brand-primary transition-all"
          >
            Portfolio Optimizer
          </Link>
        </div>
      )}
    </header>
  );
}
