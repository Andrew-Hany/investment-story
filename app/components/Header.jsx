"use client";

import React from "react";
import Link from "next/link";
import { useTheme } from "../context/ThemeContext";

export default function Header() {
  const { dark, toggle } = useTheme();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-glass-border bg-white/80 backdrop-blur-md transition-all duration-300">
      <div className="mx-auto flex max-w-7xl h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left Side: Logo & Navigation */}
        <div className="flex items-center gap-8">
          {/* Brand Logo & Name */}
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-tr from-brand-primary to-brand-accent shadow-md text-white font-mono font-bold text-lg">
              S
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              Investment<span className="bg-gradient-to-r from-brand-primary to-brand-accent bg-clip-text text-transparent">Story</span>
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <Link href="/compare" className="hover:text-brand-primary transition-colors">Compare</Link>
            <Link href="/monthly" className="hover:text-brand-primary transition-colors">DCA Calculator</Link>
            <Link href="/optimizer" className="hover:text-brand-primary transition-colors">Portfolio Optimizer</Link>
          </nav>
        </div>

        {/* Right side: dark toggle */}
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
        </div>
      </div>
    </header>
  );
}
