"use client";

import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import {
  load_prices,
  load_fundamentals,
  load_events
} from "../../lib/analysis_engine/data_access/public_data";
import { build_company_snapshot } from "../../lib/analysis_engine/services/company.js";
import WealthComparison from "./components/WealthComparison";
import BusinessFundamentals from "./components/BusinessFundamentals";
import ValuationReality from "./components/ValuationReality";
import RiskPain from "./components/RiskPain";
import DividendsReinvestment from "./components/DividendsReinvestment";
import CurrencyInflation from "./components/CurrencyInflation";
import EventsTimeline from "./components/EventsTimeline";
import SummaryStoryArrows from "./components/SummaryStoryArrows";
import StoryConnector from "./components/StoryConnector";
import WinnerSplitPanel from "./components/WinnerSplitPanel";
import StorySpine from "./components/StorySpine";
import { calculateTimelineMetrics, getRateForDate } from "./utils/calculations";
import tickersData from "../../public/data/tickers.json";

const MARKET_OPTIONS = [
  { id: "sp500", label: "S&P 500 / SPY" },
  { id: "nasdaq100", label: "Nasdaq-100 / QQQ" },
  { id: "egx30", label: "EGX 30" },
  { id: "all", label: "All assets" },
];

const tickersBySymbol = new Map(tickersData.map((ticker) => [ticker.ticker, ticker]));

function tickersForMarket(marketId) {
  if (marketId === "all") return tickersData;
  return tickersData.filter((ticker) =>
    (ticker.universes || []).some((universe) => universe.id === marketId)
  );
}

function firstTickerForMarket(marketId, fallback) {
  return tickersForMarket(marketId)[0]?.ticker || fallback;
}

export default function ComparePage() {
  const [marketA, setMarketA] = useState("sp500");
  const [marketB, setMarketB] = useState("egx30");
  const [tickerA, setTickerA] = useState("NVDA");
  const [tickerB, setTickerB] = useState("COMI.CA");
  const [initialAmount, setInitialAmount] = useState(10000);
  const [currency, setCurrency] = useState("EUR");
  const [years, setYears] = useState(5);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const tickersA = tickersForMarket(marketA);
  const tickersB = tickersForMarket(marketB);

  const handleMarketAChange = (marketId) => {
    setMarketA(marketId);
    setTickerA(firstTickerForMarket(marketId, tickerA));
  };

  const handleMarketBChange = (marketId) => {
    setMarketB(marketId);
    setTickerB(firstTickerForMarket(marketId, tickerB));
  };



  const handleCompare = async () => {
    setLoading(true);
    setError(null);
    try {
      const normA = tickerA.trim().toUpperCase();
      const normB = tickerB.trim().toUpperCase();
      const currencyA = tickersBySymbol.get(normA)?.currency || "USD";
      const currencyB = tickersBySymbol.get(normB)?.currency || "USD";

      const [pricesA, pricesB, snapA, snapB, fundA, fundB, eventsA, eventsB] = await Promise.all([
        load_prices(normA),
        load_prices(normB),
        build_company_snapshot(normA).catch(() => null),
        build_company_snapshot(normB).catch(() => null),
        load_fundamentals(normA).catch(() => null),
        load_fundamentals(normB).catch(() => null),
        load_events(normA).catch(() => null),
        load_events(normB).catch(() => null)
      ]);

      if (!pricesA || pricesA.length === 0) throw new Error(`No historical price data for ${normA}`);
      if (!pricesB || pricesB.length === 0) throw new Error(`No historical price data for ${normB}`);

      const startLimit = new Date();
      startLimit.setFullYear(startLimit.getFullYear() - years);
      const startLimitStr = startLimit.toISOString().slice(0, 10);

      const filteredA = pricesA.filter(p => p.date >= startLimitStr);
      const filteredB = pricesB.filter(p => p.date >= startLimitStr);

      if (filteredA.length === 0 || filteredB.length === 0) {
        throw new Error("No overlapping data available for selected year range.");
      }

      const startRowA = filteredA[0];
      const startRowB = filteredB[0];

      const loadFxRates = async (fromCurrency, toCurrency) => {
        if (fromCurrency === toCurrency) return [];
        try {
          const fxData = await fetch(`/investment-story/data/fx/${fromCurrency}_${toCurrency}.json`).then(r => r.ok ? r.json() : null);
          if (fxData && fxData.rates) {
            return fxData.rates;
          }
        } catch (e) {
          console.error(`Error loading FX ${fromCurrency}_${toCurrency} in page.js:`, e);
        }
        return [];
      };

      const [fxRatesA, fxRatesB] = await Promise.all([
        loadFxRates(currencyA, currency),
        loadFxRates(currencyB, currency)
      ]);

      const startRateA = getRateForDate(startLimitStr, currencyA, fxRatesA, currency);
      const startRateB = getRateForDate(startLimitStr, currencyB, fxRatesB, currency);
      const endDate = filteredA[filteredA.length - 1].date;
      const endRateA = getRateForDate(endDate, currencyA, fxRatesA, currency);
      const endRateB = getRateForDate(endDate, currencyB, fxRatesB, currency);

      const initialA = initialAmount / startRateA;
      const initialB = initialAmount / startRateB;

      const { timeline, maxDrawA, maxDrawB } = calculateTimelineMetrics({
        filteredA,
        filteredB,
        fxRatesA,
        fxRatesB,
        currencyA,
        currencyB,
        currency,
        startRateA,
        startRateB,
        initialA,
        initialB,
      });

      const finalA = timeline[timeline.length - 1].wealthA;
      const finalB = timeline[timeline.length - 1].wealthB;
      const finalPriceA = timeline[timeline.length - 1].priceWealthA;
      const finalPriceB = timeline[timeline.length - 1].priceWealthB;

      setResult({
        tickerA: normA,
        tickerB: normB,
        timeline,
        finalA,
        finalB,
        finalPriceA,
        finalPriceB,
        gainA: ((finalA - initialAmount) / initialAmount) * 100,
        gainB: ((finalB - initialAmount) / initialAmount) * 100,
        maxDrawdownA: maxDrawA,
        maxDrawdownB: maxDrawB,
        startRate: startRateA,
        endRate: endRateA,
        startRates: { [normA]: startRateA, [normB]: startRateB },
        endRates: { [normA]: endRateA, [normB]: endRateB },
        assetCurrencies: { [normA]: currencyA, [normB]: currencyB },
        initialAssetAmounts: { [normA]: initialA, [normB]: initialB },
        fxRates: { [normA]: fxRatesA, [normB]: fxRatesB },
        snapA,
        snapB,
        fundA,
        fundB,
        pricesA,
        pricesB,
        eventsA,
        eventsB
      });
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load stock comparison.");
    } finally {
      setLoading(false);
    }
  };

  const getSymbol = () => {
    if (currency === "EUR") return "€";
    if (currency === "GBP") return "£";
    if (currency === "CAD") return "C$";
    if (currency === "EGP") return "E£";
    if (currency === "AED") return "د.إ";
    return "$";
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#f8fafc] dark:bg-background font-sans antialiased text-slate-900 dark:text-slate-50 grid-pattern">
      <Header />

      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 text-left">

        {/* Title */}
        <div className="mb-10 text-center sm:text-left">
          <span className="text-xs font-bold tracking-wider text-brand-primary uppercase font-mono">
            Objective Research Lab
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Stock Comparison Lab
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Analyse and contrast two assets step-by-step using deep, real-world metric reasoning and graphs.
          </p>
        </div>

        {/* SELECTOR CONTROLS */}
        <div className="bg-white border border-glass-border rounded-2xl p-6 shadow-premium mb-8">
          <div className="grid grid-cols-2 lg:grid-cols-8 gap-4 items-end">
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">A Market / Index</label>
              <select
                value={marketA}
                onChange={(e) => handleMarketAChange(e.target.value)}
                className="w-full h-11 border border-slate-200 bg-white rounded-xl px-3 text-sm font-bold focus:border-brand-primary focus:outline-none"
              >
                {MARKET_OPTIONS.map((market) => (
                  <option key={market.id} value={market.id}>
                    {market.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">A Stock</label>
              <select
                value={tickerA}
                onChange={(e) => setTickerA(e.target.value)}
                className="w-full h-11 border border-slate-200 bg-white rounded-xl px-3 text-sm font-bold focus:border-brand-primary focus:outline-none"
              >
                {tickersA.map((t) => (
                  <option key={t.ticker} value={t.ticker}>
                    {t.ticker} - {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">B Market / Index</label>
              <select
                value={marketB}
                onChange={(e) => handleMarketBChange(e.target.value)}
                className="w-full h-11 border border-slate-200 bg-white rounded-xl px-3 text-sm font-bold focus:border-brand-primary focus:outline-none"
              >
                {MARKET_OPTIONS.map((market) => (
                  <option key={market.id} value={market.id}>
                    {market.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">B Stock</label>
              <select
                value={tickerB}
                onChange={(e) => setTickerB(e.target.value)}
                className="w-full h-11 border border-slate-200 bg-white rounded-xl px-3 text-sm font-bold focus:border-brand-primary focus:outline-none"
              >
                {tickersB.map((t) => (
                  <option key={t.ticker} value={t.ticker}>
                    {t.ticker} - {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">Capital</label>
              <input
                type="number"
                value={initialAmount}
                onChange={(e) => setInitialAmount(Number(e.target.value))}
                className="w-full h-11 border border-slate-200 rounded-xl px-3 text-sm font-mono font-bold focus:border-brand-primary focus:outline-none"
              />
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full h-11 border border-slate-200 bg-white rounded-xl px-3 text-sm font-bold focus:border-brand-primary focus:outline-none"
              >
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
                <option value="CAD">CAD (C$)</option>
                <option value="EGP">EGP (E£)</option>
                <option value="AED">AED (د.إ)</option>
              </select>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">Period</label>
              <select
                value={years}
                onChange={(e) => setYears(Number(e.target.value))}
                className="w-full h-11 border border-slate-200 bg-white rounded-xl px-3 text-sm font-bold focus:border-brand-primary focus:outline-none"
              >
                <option value={1}>1 Year</option>
                <option value={3}>3 Years</option>
                <option value={5}>5 Years</option>
                <option value={10}>10 Years</option>
              </select>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <button
                onClick={handleCompare}
                disabled={loading}
                className="w-full h-11 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-sm font-bold transition-all shadow-md disabled:opacity-50"
              >
                {loading ? "Analyzing..." : "Compare"}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl mb-8 font-medium">
            ⚠️ Error: {error}. Please check options list.
          </div>
        )}

        {/* STAGE-BY-STAGE CONTAINER PIPELINE */}
        {result && !loading && (
          <div className="space-y-0 animate-fadeIn relative">

            {/* Lead Story Summary Statement */}
            <div className="bg-indigo-50/40 border border-indigo-100/50 rounded-2xl p-5 text-left shadow-sm mb-10">
              <p className="text-lg font-bold text-slate-900 leading-tight">
                If you had invested <span className="text-brand-primary font-mono">{getSymbol()}{initialAmount.toLocaleString()}</span> in <span className="text-brand-accent font-bold">{result.finalA >= result.finalB ? result.tickerA : result.tickerB}</span> {years} {years === 1 ? "year" : "years"} ago, it would have been better than <span className="text-slate-800 font-bold">{result.finalA >= result.finalB ? result.tickerB : result.tickerA}</span> by <span className="text-brand-secondary font-mono font-extrabold">{getSymbol()}{Math.round(Math.abs(result.finalA - result.finalB)).toLocaleString()}</span>.
              </p>
            </div>

            {/* STORY SPINE: Interactive mental map row overview */}
            <StorySpine
              result={result}
              currency={currency}
              initialAmount={initialAmount}
            />

            {/* STAGE 1 COMPONENT: Wealth outcome with full SVG chart + side-by-side returns breakdown */}
            <div className="mb-10">
              <WealthComparison
                result={result}
                currency={currency}
                initialAmount={initialAmount}
                years={years}
              />
            </div>

            {/* WINNER SPLIT PANEL: Who won and why we're telling this story */}
            <StoryConnector
              chapterNum="The Verdict"
              title="Here's Who Won — And Why It Happened"
              subtitle="Stage 1 revealed the outcome. The next chapters explain every driver."
              icon="🏆"
              accent="indigo"
            />
            <div className="mb-10">
              <WinnerSplitPanel
                result={result}
                currency={currency}
                initialAmount={initialAmount}
                years={years}
              />
            </div>

            {/* CONNECTOR → Chapter 2 */}
            <StoryConnector
              chapterNum="Chapter 2"
              title="Was the Business Stronger?"
              subtitle="Revenue, earnings, margins — did the fundamentals justify the price move?"
              icon="🏛️"
              accent="blue"
            />

            {/* STAGE 2 COMPONENT: Business Fundamentals */}
            <div className="mb-10">
              <BusinessFundamentals
                tickerA={result.tickerA}
                tickerB={result.tickerB}
                result={result}
              />
            </div>

            {/* CONNECTOR → Chapter 3 */}
            <StoryConnector
              chapterNum="Chapter 3"
              title="Did the Price Become Expensive or Cheap?"
              subtitle="Now we separate business performance from market expectations."
              icon="⚖️"
              accent="purple"
            />

            {/* STAGE 3 COMPONENT: Valuation Reality */}
            <div className="mb-10">
              <ValuationReality
                tickerA={result.tickerA}
                tickerB={result.tickerB}
                result={result}
                currency={currency}
                initialAmount={initialAmount}
              />
            </div>

            {/* CONNECTOR → Chapter 4 */}
            <StoryConnector
              chapterNum="Chapter 4"
              title="How Painful Was the Ride?"
              subtitle="Drawdowns, volatility, recovery time — the emotional cost of holding."
              icon="📉"
              accent="rose"
            />

            {/* STAGE 4 COMPONENT: Risk & Pain */}
            <div className="mb-10">
              <RiskPain
                result={result}
                currency={currency}
              />
            </div>

            {/* CONNECTOR → Chapter 5: Events Timeline */}
            <StoryConnector
              chapterNum="Chapter 5"
              title="What Happened Along the Way?"
              subtitle="Major events help explain the big jumps and drops."
              icon="📅"
              accent="indigo"
            />

            {/* STAGE 5 COMPONENT: Events Timeline */}
            <div className="mb-10">
              <EventsTimeline
                result={result}
                currency={currency}
              />
            </div>

            {/* CONNECTOR → Chapter 6: Dividends */}
            <StoryConnector
              chapterNum="Chapter 6"
              title="Did Dividends Matter?"
              subtitle="The compounding power of reinvested cash flows over time."
              icon="💰"
              accent="emerald"
            />

            {/* STAGE 6 COMPONENT: Dividends & Reinvestment */}
            <div className="mb-10">
              <DividendsReinvestment
                result={result}
                currency={currency}
              />
            </div>

            {/* CONNECTOR → Chapter 7: Currency */}
            <StoryConnector
              chapterNum="Chapter 7"
              title="Did Currency Help or Hurt?"
              subtitle="Converting back to your home currency — did FX eat your gains?"
              icon="🌍"
              accent="amber"
            />

            {/* STAGE 7 COMPONENT: Currency FX Reality */}
            <div className="mb-10">
              <CurrencyInflation
                result={result}
                currency={currency}
                initialAmount={initialAmount}
                years={years}
              />
            </div>

            {/* CONNECTOR → Final Chapter */}
            <StoryConnector
              chapterNum="Final Chapter"
              title="What Is the Final Real Result?"
              subtitle="All drivers summarized — price, dividends, FX — and the final winner."
              icon="📖"
              accent="slate"
            />

            {/* STAGE 7: Milestone Journey Summary Story Arrows */}
            <div className="mb-4">
              <SummaryStoryArrows
                result={result}
                currency={currency}
                initialAmount={initialAmount}
              />
            </div>

          </div>
        )}

      </main>

      <Footer />
    </div>
  );
}
