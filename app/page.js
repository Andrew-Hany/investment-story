"use client";

import React from "react";
import Header from "./components/Header";
import Hero from "./components/Hero";
import ProblemSection from "./components/ProblemSection";
import FeaturesSection from "./components/FeaturesSection";
import TrustBoundary from "./components/TrustBoundary";
import DcaCalculatorSection from "./components/DcaCalculatorSection";
import PortfolioOptimizerSection from "./components/PortfolioOptimizerSection";
import FinalCTA from "./components/FinalCTA";
import Footer from "./components/Footer";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-slate-950 font-sans antialiased text-slate-900 dark:text-slate-50">
      {/* 1. Header/Navigation */}
      <Header />

      {/* Main Flow */}
      <main className="flex-grow">
        {/* 2. Hero Section containing the custom Side-by-Side Comparison table visual */}
        <Hero />

        {/* 3. Problem / Pitfalls Section */}
        <ProblemSection />

        {/* 4. Feature Matrix (Single Story, Comparisons, Simulator, Statements, Currency) */}
        <FeaturesSection />

        {/* 5. Trust and Educational Boundary Section */}
        <TrustBoundary />

        {/* DCA Calculator Section */}
        <DcaCalculatorSection />

        {/* Portfolio Optimizer Section */}
        <PortfolioOptimizerSection />

        {/* 6. Action-driving CTA Section */}
        <FinalCTA />
      </main>

      {/* 7. Structured Educational Footer */}
      <Footer />
    </div>
  );
}
