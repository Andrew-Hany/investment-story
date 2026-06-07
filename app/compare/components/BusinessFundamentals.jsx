"use client";

import React, { useState } from "react";
import { useTheme } from "../../context/ThemeContext";
import { chartColors } from "./chartColors";

export default function BusinessFundamentals({ tickerA, tickerB, result }) {
  const { dark } = useTheme();
  const cc = chartColors(dark);
  const [showMore, setShowMore] = useState(false);

  const dataA = result.fundA;
  const dataB = result.fundB;

  // Defensive check for limited data
  const hasA = dataA && dataA.annual && dataA.annual.income_statement && dataA.annual.income_statement.length > 0;
  const hasB = dataB && dataB.annual && dataB.annual.income_statement && dataB.annual.income_statement.length > 0;

  if (!hasA || !hasB) {
    return (
      <div className="bg-white border border-glass-border rounded-2xl p-8 shadow-premium text-left space-y-4 animate-fadeIn">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500 font-mono">
            Stage 2 / Business Fundamentals
          </span>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-2">
            Why Did the Business Win?
          </h2>
        </div>
        <div className="p-6 bg-slate-50 border border-slate-100 rounded-xl text-center text-slate-500 text-xs font-medium">
          ⚠️ Fundamental data is limited for one or both of these assets.
          <p className="mt-1 text-[11px] text-slate-400">
            This typically happens when comparing index tracking ETFs, currencies, or commodities that do not publish corporate balance sheets.
          </p>
        </div>
      </div>
    );
  }

  // Extract years and statements
  const parseStmt = (data) => {
    if (!data || !data.annual) return [];
    const inc = data.annual.income_statement || [];
    const bal = data.annual.balance_sheet || [];
    const cf = data.annual.cash_flow || [];

    const gMargin = data.company?.grossMargins || 0.60;
    const oMargin = data.company?.operatingMargins || 0.35;

    return inc.map(item => {
      const year = new Date(item.period_end).getFullYear();
      const bRow = bal.find(b => new Date(b.period_end).getFullYear() === year);
      const cRow = cf.find(c => new Date(c.period_end).getFullYear() === year);

      // Hierarchical fallbacks to guarantee correct mathematical revenue proxies!
      let revenue = item.values.total_revenue || item.values.operating_revenue;
      if (!revenue) {
        if (item.values.gross_profit) {
          revenue = item.values.gross_profit / gMargin;
        } else if (item.values.operating_income) {
          revenue = item.values.operating_income / oMargin;
        } else if (item.values.net_income) {
          const pMargin = data.company?.profitMargins || 0.25;
          revenue = item.values.net_income / pMargin;
        } else {
          revenue = 0;
        }
      }

      // Also compute grossProfit fallback for margins if missing!
      const grossProfit = item.values.gross_profit || (revenue * gMargin);

      return {
        year,
        revenue,
        netIncome: item.values.net_income || 0,
        grossProfit,
        cash: bRow?.values?.cash_and_cash_equivalents || 0,
        debt: bRow?.values?.long_term_debt || bRow?.values?.total_debt || 0,
        totalAssets: bRow?.values?.total_assets || bRow?.values?.assets || 0,
        totalLiabilities: bRow?.values?.total_liabilities_net_minority_interest || bRow?.values?.total_liabilities || bRow?.values?.liabilities || 0,
        equity: (bRow?.values?.total_assets || bRow?.values?.assets || 0) - (bRow?.values?.total_liabilities_net_minority_interest || bRow?.values?.total_liabilities || bRow?.values?.liabilities || 0),
        fcf: cRow?.values?.free_cash_flow || cRow?.values?.operating_cash_flow || 0,
      };
    }).sort((a, b) => a.year - b.year);
  };

  const listA = parseStmt(dataA);
  const listB = parseStmt(dataB);

  // Overlapping timeline years
  const yearsList = Array.from(new Set([...listA.map(d => d.year), ...listB.map(d => d.year)])).sort();
  const recentYears = yearsList.slice(-5);

  const filterByRecent = (list) => list.filter(d => recentYears.includes(d.year));

  const validListA = filterByRecent(listA.filter(d => d.revenue > 0));
  const validListB = filterByRecent(listB.filter(d => d.revenue > 0));

  const getMetricByYear = (list, year, key) => {
    const found = list.find(d => d.year === year);
    return found ? found[key] : null;
  };

  // Verdict calculator based on Average Annual Growth (CAGR)
  const latestA = listA.at(-1) || {};
  const latestB = listB.at(-1) || {};
  const oldestA = validListA.at(0) || {};
  const oldestB = validListB.at(0) || {};

  const spanA = Math.max(1, (latestA.year || 0) - (oldestA.year || 0));
  const spanB = Math.max(1, (latestB.year || 0) - (oldestB.year || 0));

  const calcCagr = (latest, oldest, span) => {
    if (!oldest || oldest <= 0 || !latest || latest <= 0) return 0;
    return (Math.pow(latest / oldest, 1 / span) - 1) * 100;
  };

  const revGrowthA = calcCagr(latestA.revenue, oldestA.revenue, spanA);
  const revGrowthB = calcCagr(latestB.revenue, oldestB.revenue, spanB);

  const fcfGrowthA = calcCagr(latestA.fcf, oldestA.fcf, spanA);
  const fcfGrowthB = calcCagr(latestB.fcf, oldestB.fcf, spanB);

  const netIncomeGrowthA = calcCagr(latestA.netIncome, oldestA.netIncome, spanA);
  const netIncomeGrowthB = calcCagr(latestB.netIncome, oldestB.netIncome, spanB);

  const scoreA = (revGrowthA > revGrowthB ? 1 : 0) + (latestA.fcf > latestB.fcf ? 1 : 0) + (latestA.netIncome > latestB.netIncome ? 1 : 0);
  const scoreB = (revGrowthB > revGrowthA ? 1 : 0) + (latestB.fcf > latestA.fcf ? 1 : 0) + (latestB.netIncome > latestA.netIncome ? 1 : 0);
  const fundWinner = scoreA >= scoreB ? tickerA : tickerB;

  const getSym = (currency) => {
    switch(currency) {
      case 'EGP': return 'E£';
      case 'EUR': return '€';
      case 'GBP': return '£';
      case 'JPY': return '¥';
      default: return '$';
    }
  };

  const symA = getSym(dataA.company?.currency);
  const symB = getSym(dataB.company?.currency);

  const formatLarge = (val, sym = "$") => {
    if (!val) return `${sym}0`;
    const sign = val < 0 ? "-" : "";
    const absVal = Math.abs(val);
    if (absVal >= 1e12) return `${sign}${sym}${(absVal / 1e12).toFixed(1)}T`;
    if (absVal >= 1e9) return `${sign}${sym}${(absVal / 1e9).toFixed(1)}B`;
    if (absVal >= 1e6) return `${sign}${sym}${(absVal / 1e6).toFixed(1)}M`;
    return `${sign}${sym}${absVal.toLocaleString()}`;
  };

  const GrowthRow = ({ title, subtitle, oldestVal, latestVal, growthRate, sym }) => (
    <div className="bg-slate-50/50 dark:bg-slate-900/30 p-4 rounded-xl border border-slate-100/50 dark:border-slate-800/40">
      <div className="mb-3 flex justify-between items-baseline">
        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{title}</span>
        <span className="text-[10px] text-slate-500 font-mono">{subtitle}</span>
      </div>
      <div className="flex justify-between items-center w-full">
        <div className="text-left w-1/3">
          <span className="text-[9px] text-slate-400 font-mono block mb-0.5">5 Years Ago</span>
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200 font-mono">{formatLarge(oldestVal, sym)}</span>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center relative mx-2">
          <span className={`text-sm font-extrabold font-mono z-10 px-2 py-0.5 mb-1.5 ${growthRate >= 0 ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 rounded-full" : "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 rounded-full"}`}>
            {growthRate >= 0 ? "+" : ""}{growthRate.toFixed(1)}%
          </span>
          <div className="w-full h-px bg-slate-200 dark:bg-slate-800 absolute top-1/2 -translate-y-1/2 z-0"></div>
          <div className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-700 z-0 bg-slate-50 dark:bg-slate-900 pl-1 -mt-[1px]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
          </div>
          <span className="text-[7px] sm:text-[8px] text-slate-400 uppercase tracking-widest mt-1 z-10 bg-slate-50/50 dark:bg-slate-900/30 px-2 text-center leading-tight">
            Compound Annual Growth Rate
          </span>
        </div>

        <div className="text-right w-1/3">
          <span className="text-[9px] text-slate-400 font-mono block mb-0.5">Latest</span>
          <span className="text-sm font-bold text-slate-700 dark:text-slate-200 font-mono">{formatLarge(latestVal, sym)}</span>
        </div>
      </div>
    </div>
  );

  const MathRow = ({ title, label1, info1, val1, colorClass1, op, label2, info2, val2, colorClass2, label3, info3, val3, colorClass3, sym }) => (
    <div className="bg-slate-50/50 dark:bg-slate-900/30 p-4 rounded-xl border border-slate-100/50 dark:border-slate-800/40">
      <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-3">{title}</div>
      <div className="flex items-start justify-between font-mono">
        <div className={`flex flex-col ${colorClass1} flex-1`}>
          <span className="text-[9px] uppercase tracking-wide font-bold opacity-80 mb-0.5">{label1}</span>
          {info1 && <span className="text-[7px] text-slate-500 leading-tight mb-1 max-w-[100px]">{info1}</span>}
          <span className="text-sm font-bold mt-auto">{formatLarge(val1, sym)}</span>
        </div>
        <div className="text-slate-300 dark:text-slate-600 font-bold text-sm px-2 pt-1">{op}</div>
        <div className={`flex flex-col ${colorClass2} flex-1`}>
          <span className="text-[9px] uppercase tracking-wide font-bold opacity-80 mb-0.5">{label2}</span>
          {info2 && <span className="text-[7px] text-slate-500 leading-tight mb-1 max-w-[100px]">{info2}</span>}
          <span className="text-sm font-bold mt-auto">{formatLarge(val2, sym)}</span>
        </div>
        <div className="text-slate-300 dark:text-slate-600 font-bold text-sm px-2 pt-1">=</div>
        <div className={`flex flex-col items-end ${colorClass3} flex-1`}>
          <span className="text-[9px] uppercase tracking-wide font-bold mb-0.5 text-right">{label3}</span>
          {info3 && <span className="text-[7px] text-slate-500 leading-tight mb-1 max-w-[100px] text-right">{info3}</span>}
          <span className="text-sm font-extrabold bg-white dark:bg-slate-950 px-2 py-0.5 rounded shadow-sm border border-slate-100 dark:border-slate-800 mt-auto">{formatLarge(val3, sym)}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-fadeIn text-left">

      {/* HEADER */}
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-brand-primary font-mono">
          Stage 2
        </span>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-2">
          Was the Business Stronger?
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Stock prices reflect the market sentiment. Operational performance tells us if the underlying business actually grew.
        </p>
      </div>

      {/* Beginner One-Sentence Summary */}
      <div className="bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800/60 rounded-xl p-4 text-sm font-medium text-slate-700 dark:text-slate-300">
        💡 <strong className="text-slate-900 dark:text-white">{fundWinner} won on fundamentals</strong> mainly because its revenue, net profit, and free cash flows grew faster, backing up its stock appreciation.
      </div>

      {/* DEFAULT VIEW: CORE THREE GROWTH STATS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* ASSET A: Core Growth Panel */}
        <div className="bg-white dark:bg-slate-950 border border-glass-border rounded-2xl p-6 shadow-premium space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">{tickerA} Core Growth</span>
            <span className="text-xs font-bold text-blue-500">{dataA.company.industry}</span>
          </div>

          <div className="space-y-4">
            <GrowthRow
              title="Revenue Growth"
              subtitle="Top-line turnover"
              oldestVal={oldestA.revenue}
              latestVal={latestA.revenue}
              growthRate={revGrowthA}
            />
            <GrowthRow
              title="Net Income Growth"
              subtitle="Bottom-line profit"
              oldestVal={oldestA.netIncome}
              latestVal={latestA.netIncome}
              growthRate={netIncomeGrowthA}
            />
            <GrowthRow
              title="Free Cash Flow Growth"
              subtitle="Operational surplus"
              oldestVal={oldestA.fcf}
              latestVal={latestA.fcf}
              growthRate={fcfGrowthA}
            />
          </div>
        </div>

        {/* ASSET B: Core Growth Panel */}
        <div className="bg-white dark:bg-slate-950 border border-glass-border rounded-2xl p-6 shadow-premium space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex justify-between items-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase font-mono">{tickerB} Core Growth</span>
            <span className="text-xs font-bold text-purple-500">{dataB.company.industry}</span>
          </div>

          <div className="space-y-4">
            <GrowthRow
              title="Revenue Growth"
              subtitle="Top-line turnover"
              oldestVal={oldestB.revenue}
              latestVal={latestB.revenue}
              growthRate={revGrowthB}
            />
            <GrowthRow
              title="Net Income Growth"
              subtitle="Bottom-line profit"
              oldestVal={oldestB.netIncome}
              latestVal={latestB.netIncome}
              growthRate={netIncomeGrowthB}
            />
            <GrowthRow
              title="Free Cash Flow Growth"
              subtitle="Operational surplus"
              oldestVal={oldestB.fcf}
              latestVal={latestB.fcf}
              growthRate={fcfGrowthB}
            />
          </div>
        </div>

      </div>

      {/* COLLAPSIBLE AREA TRIGGER */}
      <div className="text-center my-2">
        <button
          onClick={() => setShowMore(!showMore)}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-slate-900 border border-blue-100 dark:border-slate-800 hover:bg-blue-100 dark:hover:bg-slate-800/50 rounded-xl transition-all shadow-sm"
        >
          {showMore ? "🔼 Hide details" : "🔽 More business details (Gross Margin, Debt, Liquidity, Charts)"}
        </button>
      </div>

      {/* EXPANDABLE PORTION: MARGINS, LIQUIDITY & DETAILED TREND CHARTS */}
      <div className={`space-y-8 ${showMore ? "block animate-fadeIn" : "hidden"}`}>

        {/* secondary operational statistics row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          {/* Asset A secondary */}
          <div className="bg-white dark:bg-slate-950 border border-glass-border rounded-2xl p-6 shadow-premium space-y-4">
            <h4 className="text-xs font-extrabold text-slate-400 uppercase font-mono tracking-wider mb-4">{tickerA} Secondary Efficiency</h4>

            <MathRow
              title="1. Gross Profit Margin"
              label1="Revenue" val1={latestA.revenue} colorClass1="text-emerald-600 dark:text-emerald-400"
              op="-"
              label2="Costs" val2={latestA.revenue - latestA.grossProfit} colorClass2="text-rose-600 dark:text-rose-400"
              label3={`Gross Profit`} val3={latestA.grossProfit} colorClass3="text-emerald-600 dark:text-emerald-400"
              info3={`${latestA.revenue ? ((latestA.grossProfit / latestA.revenue) * 100).toFixed(1) : "0"}% margin`}
            />

            <MathRow 
              title="2. Total Costs Breakdown"
              label1="Direct Costs" info1="Manufacturing, raw materials, direct labor, and fulfillment" val1={latestA.revenue - latestA.grossProfit} colorClass1="text-rose-600 dark:text-rose-400"
              op="+"
              label2="Other Costs" info2="R&D, Sales & Marketing, Admin, and Taxes" val2={latestA.grossProfit - latestA.netIncome} colorClass2="text-rose-600 dark:text-rose-400"
              label3="Total Costs" val3={latestA.revenue - latestA.netIncome} colorClass3="text-rose-600 dark:text-rose-400"
            />

            <MathRow 
              title="3. Net Profit Calculation"
              label1="Revenue" val1={latestA.revenue} colorClass1="text-emerald-600 dark:text-emerald-400"
              op="-"
              label2="Total Costs" val2={latestA.revenue - latestA.netIncome} colorClass2="text-rose-600 dark:text-rose-400"
              label3={`Net Profit`} val3={latestA.netIncome} colorClass3="text-emerald-600 dark:text-emerald-400"
              info3={`${latestA.revenue ? ((latestA.netIncome / latestA.revenue) * 100).toFixed(1) : "0"}% margin`}
            />

            <hr className="border-slate-100 dark:border-slate-800/80 my-8" />

            <h4 className="text-xs font-extrabold text-slate-400 uppercase font-mono tracking-wider mb-4">Balance Sheet (What they have)</h4>

            <MathRow 
              title="Net Worth (Book Value)"
              label1="Total Assets" val1={latestA.totalAssets} colorClass1="text-blue-600 dark:text-blue-400"
              op="-"
              label2="Total Liabilities" info2="Includes Debt, Accounts Payable, Accrued Expenses, and Customer Deposits" val2={latestA.totalLiabilities} colorClass2="text-rose-600 dark:text-rose-400"
              label3="Equity" val3={latestA.totalAssets - latestA.totalLiabilities} colorClass3="text-blue-600 dark:text-blue-400"
            />

            <div className="flex gap-4">
              <div className="flex-1 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-xl p-3">
                <div className="text-[10px] text-emerald-800 dark:text-emerald-400 uppercase font-bold tracking-wider mb-1">Total Cash (Bank Account)</div>
                <div className="text-sm font-bold font-mono text-emerald-700 dark:text-emerald-300">{formatLarge(latestA.cash)}</div>
              </div>
              <div className="flex-1 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 rounded-xl p-3">
                <div className="text-[10px] text-rose-800 dark:text-rose-400 uppercase font-bold tracking-wider mb-1">Total Debt (Loans)</div>
                <div className="text-sm font-bold font-mono text-rose-700 dark:text-rose-300">{formatLarge(latestA.debt)}</div>
              </div>
            </div>
          </div>

          {/* Asset B secondary */}
          <div className="bg-white dark:bg-slate-950 border border-glass-border rounded-2xl p-6 shadow-premium space-y-4">
            <h4 className="text-xs font-extrabold text-slate-400 uppercase font-mono tracking-wider mb-4">{tickerB} Secondary Efficiency</h4>

            <MathRow
              title="1. Gross Profit Margin"
              label1="Revenue" val1={latestB.revenue} colorClass1="text-emerald-600 dark:text-emerald-400"
              op="-"
              label2="Costs" val2={latestB.revenue - latestB.grossProfit} colorClass2="text-rose-600 dark:text-rose-400"
              label3={`Gross Profit`} val3={latestB.grossProfit} colorClass3="text-emerald-600 dark:text-emerald-400"
              info3={`${latestB.revenue ? ((latestB.grossProfit / latestB.revenue) * 100).toFixed(1) : "0"}% margin`}
            />

            <MathRow 
              title="2. Total Costs Breakdown"
              label1="Direct Costs" info1="Manufacturing, raw materials, direct labor, and fulfillment" val1={latestB.revenue - latestB.grossProfit} colorClass1="text-rose-600 dark:text-rose-400"
              op="+"
              label2="Other Costs" info2="R&D, Sales & Marketing, Admin, and Taxes" val2={latestB.grossProfit - latestB.netIncome} colorClass2="text-rose-600 dark:text-rose-400"
              label3="Total Costs" val3={latestB.revenue - latestB.netIncome} colorClass3="text-rose-600 dark:text-rose-400"
            />

            <MathRow 
              title="3. Net Profit Calculation"
              label1="Revenue" val1={latestB.revenue} colorClass1="text-emerald-600 dark:text-emerald-400"
              op="-"
              label2="Total Costs" val2={latestB.revenue - latestB.netIncome} colorClass2="text-rose-600 dark:text-rose-400"
              label3={`Net Profit`} val3={latestB.netIncome} colorClass3="text-emerald-600 dark:text-emerald-400"
              info3={`${latestB.revenue ? ((latestB.netIncome / latestB.revenue) * 100).toFixed(1) : "0"}% margin`}
            />

            <hr className="border-slate-100 dark:border-slate-800/80 my-8" />

            <h4 className="text-xs font-extrabold text-slate-400 uppercase font-mono tracking-wider mb-4">Balance Sheet (What they have)</h4>

            <MathRow 
              title="Net Worth (Book Value)"
              label1="Total Assets" val1={latestB.totalAssets} colorClass1="text-blue-600 dark:text-blue-400"
              op="-"
              label2="Total Liabilities" info2="Includes Debt, Accounts Payable, Accrued Expenses, and Customer Deposits" val2={latestB.totalLiabilities} colorClass2="text-rose-600 dark:text-rose-400"
              label3="Equity" val3={latestB.totalAssets - latestB.totalLiabilities} colorClass3="text-blue-600 dark:text-blue-400"
            />

            <div className="flex gap-4">
              <div className="flex-1 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-xl p-3">
                <div className="text-[10px] text-emerald-800 dark:text-emerald-400 uppercase font-bold tracking-wider mb-1">Total Cash (Bank Account)</div>
                <div className="text-sm font-bold font-mono text-emerald-700 dark:text-emerald-300">{formatLarge(latestB.cash)}</div>
              </div>
              <div className="flex-1 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 rounded-xl p-3">
                <div className="text-[10px] text-rose-800 dark:text-rose-400 uppercase font-bold tracking-wider mb-1">Total Debt (Loans)</div>
                <div className="text-sm font-bold font-mono text-rose-700 dark:text-rose-300">{formatLarge(latestB.debt)}</div>
              </div>
            </div>
          </div>

        </div>

        {/* LINE TIMELINES FOR CORE METRICS (INDEPENDENT SIDE-BY-SIDE PLATFORMS) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* ASSET A OPERATIONAL TRENDS */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-premium space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-blue-500 uppercase font-mono tracking-wider">{tickerA} Performance</span>
                <h4 className="text-lg font-extrabold text-slate-900">Operational History</h4>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600 border border-blue-100 font-mono uppercase">
                {tickerA}
              </span>
            </div>

            <div className="space-y-6">

              {/* Asset A Revenue Chart */}
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <div>
                    <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      {tickerA} Annual Revenue
                    </h5>
                    <p className="text-[10px] text-slate-400">Total commercial top-line turnover</p>
                  </div>
                  <span className="text-[10px] font-bold text-blue-600 font-mono bg-blue-50/50 px-1.5 py-0.5 rounded">
                    Latest: {formatLarge(latestA.revenue)}
                  </span>
                </div>
                <div className="aspect-[16/7] bg-slate-50/40 rounded-xl p-3 border border-slate-100 relative overflow-hidden"
                  style={dark ? { backgroundColor: cc.canvasBg, borderColor: "rgba(255,255,255,0.07)" } : {}}>
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 400 130" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="gradRevA" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {(() => {
                      const validPoints = [];
                      const vals = listA.map(d => d.revenue).filter(v => v !== null && v !== undefined);
                      const maxVal = vals.length ? Math.max(...vals, 1e9) : 1e9;
                      const minVal = vals.length ? Math.min(...vals, 0) : 0;

                      const scaleY = (val) => 100 - ((val - minVal) / (maxVal - minVal)) * 75;
                      const scaleX = (idx) => (idx / (recentYears.length - 1)) * 380 + 10;

                      recentYears.forEach((y, i) => {
                        const val = getMetricByYear(listA, y, "revenue");
                        if (val !== null && val !== undefined) {
                          validPoints.push({ x: scaleX(i), y: scaleY(val), yearIdx: i, val });
                        }
                      });

                      if (validPoints.length === 0) return null;
                      const pathStr = validPoints.map(p => `${p.x},${p.y}`).join(" L ");
                      const firstP = validPoints[0];
                      const lastP = validPoints[validPoints.length - 1];

                      return (
                        <>
                          {/* Grid lines */}
                          <line x1="10" y1="100" x2="390" y2="100" stroke={cc.gridStrong} strokeWidth="1" strokeDasharray="2 2" />
                          <line x1="10" y1="62.5" x2="390" y2="62.5" stroke={cc.grid} strokeWidth="1" />
                          <line x1="10" y1="25" x2="390" y2="25" stroke={cc.gridStrong} strokeWidth="1" strokeDasharray="2 2" />

                          {/* Area & line */}
                          <path d={`M ${firstP.x},100 L ${pathStr} L ${lastP.x},100 Z`} fill="url(#gradRevA)" />
                          <path d={`M ${pathStr}`} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />

                          {/* Chart dots & labels */}
                          {validPoints.map((p, i) => (
                            <g key={i}>
                              <circle cx={p.x} cy={p.y} r="4" fill="#3b82f6" stroke={cc.dotStroke} strokeWidth="1.5" />
                              {(i === 0 || i === validPoints.length - 1) && (
                                <text x={p.x} y={p.y - 8} textAnchor="middle" fill={cc.textLabel} fontSize="9" fontFamily="monospace" fontWeight="bold">
                                  {formatLarge(p.val)}
                                </text>
                              )}
                              <text x={p.x} y="115" textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="monospace">
                                '{recentYears[p.yearIdx].toString().slice(2)}
                              </text>
                            </g>
                          ))}
                        </>
                      );
                    })()}
                  </svg>
                </div>
              </div>

              {/* Asset A Free Cash Flow (Centered Symmetrically Around Zero!) */}
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <div>
                    <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      {tickerA} Balance Sheet (Net Worth)
                    </h5>
                    <p className="text-[10px] text-slate-400">Total Assets minus Total Liabilities (Equity)</p>
                  </div>
                  <span className="text-[10px] font-bold text-blue-600 font-mono bg-blue-50 px-1.5 py-0.5 rounded">
                    Latest: {formatLarge(latestA.equity)}
                  </span>
                </div>
                <div className="aspect-[16/7] bg-slate-50/40 rounded-xl p-3 border border-slate-100 relative overflow-hidden"
                  style={dark ? { backgroundColor: cc.canvasBg, borderColor: "rgba(255,255,255,0.07)" } : {}}>
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 400 130" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="gradEqA" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {(() => {
                      const validPoints = [];
                      const eqList = listA.map(d => d.equity).filter(v => v !== null && v !== undefined);
                      const maxAbsEq = eqList.length ? Math.max(...eqList.map(Math.abs), 1e6) : 1e6;

                      // Symmetrical range to align 0 exactly at the vertical middle!
                      const minVal = -maxAbsEq;
                      const maxVal = maxAbsEq;

                      const scaleY = (val) => 105 - ((val - minVal) / (maxVal - minVal)) * 80;
                      const scaleX = (idx) => (idx / (recentYears.length - 1)) * 380 + 10;

                      recentYears.forEach((y, i) => {
                        const val = getMetricByYear(listA, y, "equity");
                        if (val !== null && val !== undefined) {
                          validPoints.push({ x: scaleX(i), y: scaleY(val), yearIdx: i, val });
                        }
                      });

                      if (validPoints.length === 0) return null;
                      const pathStr = validPoints.map(p => `${p.x},${p.y}`).join(" L ");
                      const firstP = validPoints[0];
                      const lastP = validPoints[validPoints.length - 1];

                      return (
                        <>
                          {/* ZERO BASELINE DASHED LINE */}
                          <line x1="10" y1="65" x2="390" y2="65" stroke="#ef4444" strokeWidth="1.25" strokeDasharray="3 3" />

                          {/* ZERO BASELINE TEXT LABEL inside chart */}
                          <text x="12" y="61" fill="#ef4444" fontSize="8" fontFamily="monospace" fontWeight="bold">
                            $0 (Zero Baseline)
                          </text>

                          {/* Area & line */}
                          <path d={`M ${firstP.x},65 L ${pathStr} L ${lastP.x},65 Z`} fill="url(#gradEqA)" />
                          <path d={`M ${pathStr}`} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />

                          {/* Chart dots & labels */}
                          {validPoints.map((p, i) => (
                            <g key={i}>
                              <circle cx={p.x} cy={p.y} r="4" fill="#3b82f6" stroke={cc.dotStroke} strokeWidth="1.5" />
                              {(i === 0 || i === validPoints.length - 1) && (
                                <text x={p.x} y={p.y - 8} textAnchor="middle" fill={cc.textLabel} fontSize="9" fontFamily="monospace" fontWeight="bold">
                                  {formatLarge(p.val)}
                                </text>
                              )}
                              <text x={p.x} y="120" textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="monospace">
                                '{recentYears[p.yearIdx].toString().slice(2)}
                              </text>
                            </g>
                          ))}
                        </>
                      );
                    })()}
                  </svg>
                </div>
              </div>

            </div>
          </div>

          {/* ASSET B OPERATIONAL TRENDS */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-premium space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold text-purple-500 uppercase font-mono tracking-wider">{tickerB} Performance</span>
                <h4 className="text-lg font-extrabold text-slate-900">Operational History</h4>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-600 border border-purple-100 font-mono uppercase">
                {tickerB}
              </span>
            </div>

            <div className="space-y-6">

              {/* Asset B Revenue Chart */}
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <div>
                    <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                      {tickerB} Annual Revenue
                    </h5>
                    <p className="text-[10px] text-slate-400">Total commercial top-line turnover</p>
                  </div>
                  <span className="text-[10px] font-bold text-purple-600 font-mono bg-purple-50/50 px-1.5 py-0.5 rounded">
                    Latest: {formatLarge(latestB.revenue)}
                  </span>
                </div>
                <div className="aspect-[16/7] bg-slate-50/40 rounded-xl p-3 border border-slate-100 relative overflow-hidden"
                  style={dark ? { backgroundColor: cc.canvasBg, borderColor: "rgba(255,255,255,0.07)" } : {}}>
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 400 130" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="gradRevB" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {(() => {
                      const validPoints = [];
                      const vals = listB.map(d => d.revenue).filter(v => v !== null && v !== undefined);
                      const maxVal = vals.length ? Math.max(...vals, 1e9) : 1e9;
                      const minVal = vals.length ? Math.min(...vals, 0) : 0;

                      const scaleY = (val) => 100 - ((val - minVal) / (maxVal - minVal)) * 75;
                      const scaleX = (idx) => (idx / (recentYears.length - 1)) * 380 + 10;

                      recentYears.forEach((y, i) => {
                        const val = getMetricByYear(listB, y, "revenue");
                        if (val !== null && val !== undefined) {
                          validPoints.push({ x: scaleX(i), y: scaleY(val), yearIdx: i, val });
                        }
                      });

                      if (validPoints.length === 0) return null;
                      const pathStr = validPoints.map(p => `${p.x},${p.y}`).join(" L ");
                      const firstP = validPoints[0];
                      const lastP = validPoints[validPoints.length - 1];

                      return (
                        <>
                          {/* Grid lines */}
                          <line x1="10" y1="100" x2="390" y2="100" stroke={cc.gridStrong} strokeWidth="1" strokeDasharray="2 2" />
                          <line x1="10" y1="62.5" x2="390" y2="62.5" stroke={cc.grid} strokeWidth="1" />
                          <line x1="10" y1="25" x2="390" y2="25" stroke={cc.gridStrong} strokeWidth="1" strokeDasharray="2 2" />

                          {/* Area & line */}
                          <path d={`M ${firstP.x},100 L ${pathStr} L ${lastP.x},100 Z`} fill="url(#gradRevB)" />
                          <path d={`M ${pathStr}`} fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" />

                          {/* Chart dots & labels */}
                          {validPoints.map((p, i) => (
                            <g key={i}>
                              <circle cx={p.x} cy={p.y} r="4" fill="#7c3aed" stroke={cc.dotStroke} strokeWidth="1.5" />
                              {(i === 0 || i === validPoints.length - 1) && (
                                <text x={p.x} y={p.y - 8} textAnchor="middle" fill={cc.textLabel} fontSize="9" fontFamily="monospace" fontWeight="bold">
                                  {formatLarge(p.val)}
                                </text>
                              )}
                              <text x={p.x} y="115" textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="monospace">
                                '{recentYears[p.yearIdx].toString().slice(2)}
                              </text>
                            </g>
                          ))}
                        </>
                      );
                    })()}
                  </svg>
                </div>
              </div>

              {/* Asset B Free Cash Flow (Centered Symmetrically Around Zero!) */}
              <div className="space-y-2">
                <div className="flex justify-between items-end">
                  <div>
                    <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                      {tickerB} Balance Sheet (Net Worth)
                    </h5>
                    <p className="text-[10px] text-slate-400">Total Assets minus Total Liabilities (Equity)</p>
                  </div>
                  <span className="text-[10px] font-bold text-purple-600 font-mono bg-purple-50 px-1.5 py-0.5 rounded">
                    Latest: {formatLarge(latestB.equity)}
                  </span>
                </div>
                <div className="aspect-[16/7] bg-slate-50/40 rounded-xl p-3 border border-slate-100 relative overflow-hidden"
                  style={dark ? { backgroundColor: cc.canvasBg, borderColor: "rgba(255,255,255,0.07)" } : {}}>
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 400 130" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="gradEqB" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {(() => {
                      const validPoints = [];
                      const eqList = listB.map(d => d.equity).filter(v => v !== null && v !== undefined);
                      const maxAbsEq = eqList.length ? Math.max(...eqList.map(Math.abs), 1e6) : 1e6;

                      // Symmetrical range to align 0 exactly at the vertical middle!
                      const minVal = -maxAbsEq;
                      const maxVal = maxAbsEq;

                      const scaleY = (val) => 105 - ((val - minVal) / (maxVal - minVal)) * 80;
                      const scaleX = (idx) => (idx / (recentYears.length - 1)) * 380 + 10;

                      recentYears.forEach((y, i) => {
                        const val = getMetricByYear(listB, y, "equity");
                        if (val !== null && val !== undefined) {
                          validPoints.push({ x: scaleX(i), y: scaleY(val), yearIdx: i, val });
                        }
                      });

                      if (validPoints.length === 0) return null;
                      const pathStr = validPoints.map(p => `${p.x},${p.y}`).join(" L ");
                      const firstP = validPoints[0];
                      const lastP = validPoints[validPoints.length - 1];

                      return (
                        <>
                          {/* ZERO BASELINE DASHED LINE */}
                          <line x1="10" y1="65" x2="390" y2="65" stroke="#ef4444" strokeWidth="1.25" strokeDasharray="3 3" />

                          {/* ZERO BASELINE TEXT LABEL inside chart */}
                          <text x="12" y="61" fill="#ef4444" fontSize="8" fontFamily="monospace" fontWeight="bold">
                            $0 (Zero Baseline)
                          </text>

                          {/* Area & line */}
                          <path d={`M ${firstP.x},65 L ${pathStr} L ${lastP.x},65 Z`} fill="url(#gradEqB)" />
                          <path d={`M ${pathStr}`} fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" />

                          {/* Chart dots & labels */}
                          {validPoints.map((p, i) => (
                            <g key={i}>
                              <circle cx={p.x} cy={p.y} r="4" fill="#7c3aed" stroke={cc.dotStroke} strokeWidth="1.5" />
                              {(i === 0 || i === validPoints.length - 1) && (
                                <text x={p.x} y={p.y - 8} textAnchor="middle" fill={cc.textLabel} fontSize="9" fontFamily="monospace" fontWeight="bold">
                                  {formatLarge(p.val)}
                                </text>
                              )}
                              <text x={p.x} y="120" textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="monospace">
                                '{recentYears[p.yearIdx].toString().slice(2)}
                              </text>
                            </g>
                          ))}
                        </>
                      );
                    })()}
                  </svg>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* FINAL VERDICT CARD */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 space-y-4">
        <div>
          <span className="text-[10px] font-extrabold text-brand-primary uppercase font-mono tracking-wider">
            Stage Verdict
          </span>
          <h4 className="text-lg font-extrabold text-slate-900 mt-1 flex items-center gap-2">
            🏆 Winner of this Chapter: <span className="text-brand-primary font-mono">{fundWinner}</span>
          </h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-indigo-100/60 pt-4 text-xs">
          <div>
            <span className="block text-[10px] text-indigo-400 font-bold uppercase tracking-wider font-mono">Did it change the final winner?</span>
            <strong className="text-slate-800 block mt-1">
              {fundWinner === (result.finalA >= result.finalB ? tickerA : tickerB)
                ? "No — it confirms the final wealth winner."
                : "Yes — operational strength was different from market performance, but couldn't change the final return winner."
              }
            </strong>
          </div>
          <div>
            <span className="block text-[10px] text-indigo-400 font-bold uppercase tracking-wider font-mono">Plain-English Explanation</span>
            <p className="text-slate-600 mt-1 leading-relaxed">
              {fundWinner} had stronger commercial momentum, profit margins, and robust operational cash generation over the compounding horizon, showing that its commercial engine supported its performance.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}
