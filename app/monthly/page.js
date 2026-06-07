"use client";

import React, { useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { load_prices } from "../../lib/analysis_engine/data_access/public_data";
import { calculateDCATimeline } from "../compare/utils/calculations";
import tickersData from "../../public/data/tickers.json";
import MonthlyGrowthChart from "./components/MonthlyGrowthChart";
import FutureGrowthChart from "./components/FutureGrowthChart";
import {
  annualPriceReturns,
  calculateDcaIrr,
  estimateFutureAnnualRates,
  fxAnnualRateForPeriod,
  projectFutureTimeline,
} from "./utils/dcaCalculations";

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

export default function MonthlyPage() {
  const [mode, setMode] = useState("past"); // "past" or "future"
  const [market, setMarket] = useState("sp500");
  const [ticker, setTicker] = useState("SPY");
  const [monthlyAmount, setMonthlyAmount] = useState(500);
  const [currency, setCurrency] = useState("USD");
  const [years, setYears] = useState(5);
  const [compareBenchmark, setCompareBenchmark] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const availableTickers = tickersForMarket(market);

  const handleMarketChange = (marketId) => {
    setMarket(marketId);
    setTicker(firstTickerForMarket(marketId, ticker));
  };

  const handleSimulate = async () => {
    setLoading(true);
    setError(null);
    try {
      const normTicker = ticker.trim().toUpperCase();
      const assetCurrency = tickersBySymbol.get(normTicker)?.currency || "USD";

      const prices = await load_prices(normTicker);

      if (!prices || prices.length === 0) throw new Error(`No historical price data for ${normTicker}`);

      const loadFxRates = async (fromCurrency, toCurrency) => {
        if (fromCurrency === toCurrency) return [];
        try {
          const fxData = await fetch(`/data/fx/${fromCurrency}_${toCurrency}.json`).then(r => r.ok ? r.json() : null);
          if (fxData && fxData.rates) {
            return fxData.rates;
          }
        } catch (e) {
          console.error(`Error loading FX ${fromCurrency}_${toCurrency}:`, e);
        }
        return [];
      };

      const fxRates = await loadFxRates(assetCurrency, currency);
      let benchCurrency = "USD";
      let benchFxRates = [];
      let benchmarkPrices = null;
      if (compareBenchmark) {
        benchmarkPrices = await load_prices(compareBenchmark.trim().toUpperCase());
        benchCurrency = tickersBySymbol.get(compareBenchmark.trim().toUpperCase())?.currency || "USD";
        benchFxRates = await loadFxRates(benchCurrency, currency);
      }

      // --- 1. HISTORICAL ACTUALS (PAST) ---
      const startLimit = new Date();
      startLimit.setFullYear(startLimit.getFullYear() - years);
      const startLimitStr = startLimit.toISOString().slice(0, 10);

      const filteredPrices = prices.filter(p => p.date >= startLimitStr);

      if (filteredPrices.length === 0) {
        throw new Error("No overlapping data available for selected year range.");
      }

      const { timeline: timelinePast, totalInvested: totalInvestedPast } = calculateDCATimeline({
        filteredPrices,
        fxRates,
        assetCurrency,
        homeCurrency: currency,
        monthlyDeposit: monthlyAmount,
      });
      const { timeline: nativeTimelinePast } = calculateDCATimeline({
        filteredPrices,
        fxRates: [],
        assetCurrency,
        homeCurrency: assetCurrency,
        monthlyDeposit: monthlyAmount,
      });

      if (timelinePast.length === 0) {
        throw new Error("Failed to calculate timeline.");
      }

      timelinePast.forEach((item, idx) => {
        const subTimeline = timelinePast.slice(0, idx + 1);
        item.annualRate = calculateDcaIrr(subTimeline, item.wealth);
        item.isFuture = false;
      });

      if (compareBenchmark && benchmarkPrices) {
        const benchFilteredPrices = benchmarkPrices.filter(p => p.date >= startLimitStr);
        const { timeline: benchTimelinePast } = calculateDCATimeline({
          filteredPrices: benchFilteredPrices,
          fxRates: benchFxRates,
          assetCurrency: benchCurrency,
          homeCurrency: currency,
          monthlyDeposit: monthlyAmount,
        });

        timelinePast.forEach((item, idx) => {
          const match = benchTimelinePast.find(b => b.date.substring(0, 7) === item.date.substring(0, 7))
            || benchTimelinePast[idx]
            || benchTimelinePast[benchTimelinePast.length - 1];
          item.benchmarkWealth = match ? match.wealth : null;
        });
      }

      const finalWealthPast = timelinePast[timelinePast.length - 1].wealth;
      const finalAnnualRatePast = timelinePast[timelinePast.length - 1].annualRate;
      const finalNativeAnnualRatePast = nativeTimelinePast.length > 1
        ? calculateDcaIrr(nativeTimelinePast, nativeTimelinePast[nativeTimelinePast.length - 1].wealth)
        : finalAnnualRatePast;
      const finalFxAnnualRatePast = fxAnnualRateForPeriod(
        fxRates,
        filteredPrices[0].date,
        filteredPrices[filteredPrices.length - 1].date
      );

      const firstPriceDateStr = filteredPrices[0].date;
      const actualYearsVal = (new Date(filteredPrices[filteredPrices.length - 1].date) - new Date(firstPriceDateStr)) / (365.25 * 24 * 3600 * 1000);
      const isLimited = years > Math.ceil(actualYearsVal);

      const pastResult = {
        mode: "past",
        ticker: normTicker,
        tickerBenchmark: compareBenchmark ? compareBenchmark.trim().toUpperCase() : null,
        timeline: timelinePast,
        totalInvested: totalInvestedPast,
        finalWealth: finalWealthPast,
        annualRate: finalAnnualRatePast,
        annualAssetRate: finalNativeAnnualRatePast,
        annualFxImpact: finalFxAnnualRatePast,
        splitIdx: null,
        profit: finalWealthPast - totalInvestedPast,
        profitPct: ((finalWealthPast - totalInvestedPast) / totalInvestedPast) * 100,
        isLimited,
        firstDateStr: firstPriceDateStr,
        actualYearsVal,
      };

      // --- 2. FUTURE PROJECTION
      const yearlyHistory = annualPriceReturns(prices);
      const {
        stockAnnualRate,
        annualFxImpact,
        totalAnnualRate,
      } = estimateFutureAnnualRates({
        prices,
        assetCurrency,
        fxRates,
        monthlyAmount,
      });
      const baselineAnnualRate = Math.max(1, Math.min(totalAnnualRate, 35)); // clamp to sensible range

      // Benchmark: use its own available history as a separate reference line
      let benchBaselineAnnualRate = 10;
      if (compareBenchmark && benchmarkPrices) {
        const { totalAnnualRate: benchTotalAnnualRate } = estimateFutureAnnualRates({
          prices: benchmarkPrices,
          assetCurrency: benchCurrency,
          fxRates: benchFxRates,
          monthlyAmount,
        });
        benchBaselineAnnualRate = Math.max(1, Math.min(benchTotalAnnualRate, 35));
      }

      const futureTimeline = projectFutureTimeline({
        monthlyAmount,
        annualRate: baselineAnnualRate,
        projectionYears: years,
        benchmarkAnnualRate: compareBenchmark ? benchBaselineAnnualRate : null,
      });

      const finalWealth = futureTimeline[futureTimeline.length - 1].wealth;
      const totalInvested = futureTimeline[futureTimeline.length - 1].totalInvested;

      const futureResult = {
        mode: "future",
        ticker: normTicker,
        tickerBenchmark: compareBenchmark ? compareBenchmark.trim().toUpperCase() : null,
        timeline: futureTimeline,
        totalInvested,
        finalWealth,
        annualRate: baselineAnnualRate,
        annualAssetRate: stockAnnualRate,
        annualFxImpact,
        benchmarkAnnualRate: compareBenchmark ? benchBaselineAnnualRate : null,
        splitIdx: null,
        profit: finalWealth - totalInvested,
        profitPct: ((finalWealth - totalInvested) / totalInvested) * 100,
        // Full history actual annual price returns for the bar chart — all years with real +/- returns
        yearlyHistory,
      };

      setResult({
        ticker: normTicker,
        past: pastResult,
        future: futureResult,
      });
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to load simulation.");
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

      <main className="flex-grow max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-12 text-left">

        {/* Title */}
        <div className="mb-10 text-center sm:text-left">
          <span className="text-xs font-bold tracking-wider text-brand-primary uppercase font-mono">
            Dollar Cost Averaging Lab
          </span>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Monthly Investment Simulator
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Discover the compounding effect of investing a fixed amount every month over time.
          </p>
        </div>

        {/* SELECTOR CONTROLS */}
        <div className="bg-white border border-glass-border rounded-2xl p-6 shadow-premium mb-8">
          <div className="grid grid-cols-2 md:grid-cols-8 gap-4 items-end">
            {/* Market */}
            <div className="col-span-2 md:col-span-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">Market</label>
              <select
                value={market}
                onChange={(e) => handleMarketChange(e.target.value)}
                className="w-full h-11 border border-slate-200 bg-white rounded-xl px-3 text-sm font-bold focus:border-brand-primary focus:outline-none"
              >
                {MARKET_OPTIONS.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* Asset */}
            <div className="col-span-2 md:col-span-2">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">Asset to Buy</label>
              <select
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                className="w-full h-11 border border-slate-200 bg-white rounded-xl px-3 text-sm font-bold focus:border-brand-primary focus:outline-none"
              >
                {availableTickers.map((t) => (
                  <option key={t.ticker} value={t.ticker}>
                    {t.ticker} - {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Deposit */}
            <div className="col-span-1 md:col-span-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">Monthly Deposit</label>
              <input
                type="number"
                value={monthlyAmount}
                onChange={(e) => setMonthlyAmount(Number(e.target.value))}
                className="w-full h-11 border border-slate-200 rounded-xl px-3 text-sm font-mono font-bold focus:border-brand-primary focus:outline-none"
              />
            </div>

            {/* Currency */}
            <div className="col-span-1 md:col-span-1">
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

            {/* Period */}
            <div className="col-span-1 md:col-span-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">
                Period
              </label>
              <select
                value={years}
                onChange={(e) => setYears(Number(e.target.value))}
                className="w-full h-11 border border-slate-200 bg-white rounded-xl px-3 text-sm font-bold focus:border-brand-primary focus:outline-none"
              >
                <option value={1}>1 Year</option>
                <option value={3}>3 Years</option>
                <option value={5}>5 Years</option>
                <option value={10}>10 Years</option>
                <option value={15}>15 Years</option>
                <option value={20}>20 Years</option>
              </select>
            </div>

            {/* Compare Benchmark */}
            <div className="col-span-1 md:col-span-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono">Benchmark</label>
              <select
                value={compareBenchmark}
                onChange={(e) => setCompareBenchmark(e.target.value)}
                className="w-full h-11 border border-slate-200 bg-white rounded-xl px-3 text-sm font-bold focus:border-brand-primary focus:outline-none"
              >
                <option value="">None</option>
                <option value="SPY">SPY (S&P 500)</option>
                <option value="QQQ">QQQ (Nasdaq-100)</option>
                <option value="^CASE30">^CASE30 (EGX 30)</option>
              </select>
            </div>

            {/* Button */}
            <div className="col-span-1 md:col-span-1">
              <button
                onClick={handleSimulate}
                disabled={loading}
                className="w-full h-11 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-sm font-bold transition-all shadow-md disabled:opacity-50"
              >
                {loading ? "Working..." : "Simulate"}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl mb-8 font-medium">
            ⚠️ Error: {error}. Please check options list.
          </div>
        )}

        {/* RESULTS SECTION */}
        {result && !loading && (
          <div className="space-y-6 animate-fadeIn relative">
            {result.past.isLimited && (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 text-xs rounded-xl font-semibold flex items-start gap-2.5">
                <span className="text-sm mt-0.5">⚠️</span>
                <div>
                  <p className="font-bold">Limited Historical Data Available</p>
                  <p className="mt-0.5 font-normal text-slate-600 dark:text-slate-400">
                    Historical prices for {result.ticker} are only available starting from {result.past.firstDateStr}.
                    The simulation covers {Math.round(result.past.actualYearsVal)} years instead of the requested {years} years.
                  </p>
                </div>
              </div>
            )}

            {/* CHART COMPONENT */}
            {mode === "future" ? (
              <FutureGrowthChart
                result={result.future}
                pastResult={result.past}
                currency={currency}
                monthlyAmount={monthlyAmount}
                years={years}
                mode={mode}
                setMode={setMode}
              />
            ) : (
              <MonthlyGrowthChart
                result={result.past}
                currency={currency}
                monthlyAmount={monthlyAmount}
                years={years}
                mode={mode}
                setMode={setMode}
              />
            )}

          </div>
        )}

      </main>

      <Footer />
    </div>
  );
}
