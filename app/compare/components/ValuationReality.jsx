"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { useTheme } from "../../context/ThemeContext";
import { chartColors } from "./chartColors";
import { buildDcfValuation, parseValuation } from "../utils/calculations";

const clampPercent = (value) => Math.max(0, Math.min(100, value));

const formatDcfNumber = (val, decimals = 2) => {
  if (val === null || val === undefined || Number.isNaN(Number(val))) return "N/A";
  return Number(val).toFixed(decimals);
};

const formatDcfPercent = (val, decimals = 1) => {
  if (val === null || val === undefined || Number.isNaN(Number(val))) return "N/A";
  return `${val >= 0 ? "+" : ""}${Number(val).toFixed(decimals)}%`;
};

const formatMoneyNative = (val, sym = "$") => {
  if (val === null || val === undefined || Number.isNaN(Number(val))) return "N/A";
  return `${sym}${Number(val).toFixed(2)}`;
};

const formatLarge = (val, sym = "$") => {
  if (val === null || val === undefined || Number.isNaN(Number(val))) return "N/A";
  const sign = val < 0 ? "-" : "";
  const absVal = Math.abs(Number(val));
  if (absVal >= 1e12) return `${sign}${sym}${(absVal / 1e12).toFixed(1)}T`;
  if (absVal >= 1e9) return `${sign}${sym}${(absVal / 1e9).toFixed(1)}B`;
  if (absVal >= 1e6) return `${sign}${sym}${(absVal / 1e6).toFixed(1)}M`;
  return `${sign}${sym}${absVal.toLocaleString()}`;
};

const labelClass = (label) => {
  if (label === "undervalued") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300";
  if (label === "overvalued") return "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300";
  return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300";
};

function DcfMiniPanel({ ticker, dcf, latestRow, currentPE, sym, accentClass, onOpenCalculations }) {
  if (!dcf?.valuation_supported) {
    return (
      <div className="mt-4 rounded-xl border border-slate-150 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/30 p-4">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">DCF Fair Value</div>
        <p className="mt-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
          {dcf?.message || "DCF valuation is not available for this company yet."}
        </p>
      </div>
    );
  }

  const base = dcf.scenarios.base;
  const conservative = dcf.scenarios.conservative;
  const optimistic = dcf.scenarios.optimistic;
  const fairPE = latestRow?.eps > 0 ? base.fair_value_per_share / latestRow.eps : null;
  const priceGap = base.fair_value_per_share - dcf.inputs.current_price;
  const peGap = fairPE !== null ? fairPE - currentPE : null;
  const priceGapIsPositive = priceGap >= 0;
  const peGapIsPositive = peGap !== null ? peGap >= 0 : false;
  const canComparePe = fairPE !== null && currentPE !== null && currentPE !== undefined;
  const minFairValue = Math.min(conservative.fair_value_per_share, base.fair_value_per_share, optimistic.fair_value_per_share);
  const maxFairValue = Math.max(conservative.fair_value_per_share, base.fair_value_per_share, optimistic.fair_value_per_share);
  const currentPricePosition = dcf.inputs.current_price < minFairValue
    ? "below"
    : dcf.inputs.current_price > maxFairValue
      ? "above"
      : "inside";

  const CompareArrow = ({ positive, label }) => (
    <div className="flex min-w-[104px] flex-col items-center justify-center gap-1 px-2">
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
        positive
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
          : "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300"
      }`}>
        {label}
      </span>
      <span className={`text-2xl leading-none font-black ${positive ? "text-emerald-600 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300"}`}>
        →
      </span>
    </div>
  );

  return (
    <div className="mt-4 rounded-xl border border-slate-150 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/30 p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">DCF Fair Value</div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
            Estimated intrinsic value from free cash flow, discounted by WACC.
          </p>
        </div>
        <span className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${labelClass(base.label)}`}>
          {base.label}
        </span>
      </div>

      <div className="space-y-3">
        <div className="rounded-xl border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
          <div className="mb-2 text-[9px] font-bold uppercase tracking-wider text-slate-400">Price to fair value</div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <div>
              <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Current Price</span>
              <span className="block text-lg font-extrabold font-mono text-slate-900 dark:text-white">
                {formatMoneyNative(dcf.inputs.current_price, sym)}
              </span>
            </div>
            <CompareArrow
              positive={priceGapIsPositive}
              label={formatDcfPercent(base.upside_percent)}
            />
            <div className="text-right">
              <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">DCF Fair Value</span>
              <span className={`block text-lg font-extrabold font-mono ${accentClass}`}>
                {formatMoneyNative(base.fair_value_per_share, sym)}
              </span>
            </div>
          </div>
        </div>

        {canComparePe ? (
          <div className="rounded-xl border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-2 text-[9px] font-bold uppercase tracking-wider text-slate-400">Current multiple to fair multiple</div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <div>
                <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Current P/E</span>
                <span className="block text-lg font-extrabold font-mono text-slate-900 dark:text-white">
                  {formatDcfNumber(currentPE, 1)}x
                </span>
              </div>
              <CompareArrow
                positive={peGapIsPositive}
                label={peGap === null ? "N/A" : `${peGap >= 0 ? "+" : ""}${formatDcfNumber(peGap, 1)}x`}
              />
              <div className="text-right">
                <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">Fair P/E</span>
                <span className="block text-lg font-extrabold font-mono text-slate-900 dark:text-white">
                  {formatDcfNumber(fairPE, 1)}x
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-100 bg-white p-3 text-xs font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
            P/E comparison is unavailable because EPS is missing. The DCF fair value still works because it uses free cash flow, cash, debt, shares, WACC, and the current price.
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-100 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
        <div className="mb-3 text-[9px] font-bold uppercase tracking-wider text-slate-400">Scenario fair-value range</div>
        <div className="grid grid-cols-3 gap-2">
          {[
            { name: "Conservative", value: conservative.fair_value_per_share, color: "text-rose-600 dark:text-rose-300" },
            { name: "Base", value: base.fair_value_per_share, color: accentClass },
            { name: "Optimistic", value: optimistic.fair_value_per_share, color: "text-emerald-600 dark:text-emerald-300" },
          ].map((item) => (
            <div key={item.name} className="rounded-lg bg-slate-50 p-3 text-center dark:bg-slate-900">
              <span className="block text-[9px] font-bold uppercase tracking-wider text-slate-400">{item.name}</span>
              <span className={`mt-1 block text-sm font-extrabold font-mono ${item.color}`}>
                {formatMoneyNative(item.value, sym)}
              </span>
            </div>
          ))}
        </div>
        <div className={`mt-3 rounded-lg px-3 py-2 text-[11px] font-bold ${
          currentPricePosition === "inside"
            ? "bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300"
            : currentPricePosition === "above"
              ? "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300"
              : "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
        }`}>
          Current price {formatMoneyNative(dcf.inputs.current_price, sym)} is {
            currentPricePosition === "inside"
              ? "inside the fair-value range."
              : currentPricePosition === "above"
                ? "above even the optimistic fair value."
                : "below the conservative fair value."
          }
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
        <span>FCF {formatLarge(dcf.inputs.latest_fcf, sym)}</span>
        <span className="text-center">WACC {(dcf.inputs.wacc * 100).toFixed(1)}%</span>
        <span className="text-right">g {(base.growth_rate * 100).toFixed(1)}%</span>
      </div>

      <button
        type="button"
        onClick={() => onOpenCalculations({ ticker, dcf, latestRow, currentPE, sym })}
        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200 shadow-sm transition hover:border-brand-primary hover:text-brand-primary"
      >
        Show step-by-step calculations
      </button>

      {dcf.warnings?.length > 0 && (
        <p className="text-[10px] text-amber-700 dark:text-amber-300 font-medium">
          {dcf.warnings[0]}
        </p>
      )}
    </div>
  );
}

function DcfCalculationModal({ payload, onClose }) {
  if (!payload?.dcf?.valuation_supported) return null;
  if (typeof document === "undefined") return null;

  const { ticker, dcf, latestRow, currentPE, sym } = payload;
  const inputs = dcf.inputs;
  const scenario = dcf.scenarios.base;
  const fairPE = latestRow?.eps > 0 ? scenario.fair_value_per_share / latestRow.eps : null;
  const eWeight = inputs.market_cap / (inputs.market_cap + inputs.total_debt);
  const dWeight = inputs.total_debt / (inputs.market_cap + inputs.total_debt);
  const pvForecast = scenario.forecast_fcfs.reduce((sum, row) => sum + row.pv, 0);
  const pvTerminal = scenario.enterprise_value - pvForecast;
  const maxFcf = Math.max(...scenario.forecast_fcfs.map((row) => row.fcf), 1);

  const StepCard = ({ index, title, equation, result, children }) => (
    <div className="rounded-xl border border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-950 p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-extrabold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
          {index}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-extrabold text-slate-900 dark:text-white">{title}</div>
          <div className="mt-2 rounded-lg bg-slate-50 dark:bg-slate-900 px-3 py-2 text-[11px] font-mono text-slate-600 dark:text-slate-300">
            {equation}
          </div>
          <div className="mt-2 text-sm font-extrabold text-slate-900 dark:text-white">{result}</div>
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[86vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-100 bg-white px-5 py-4 dark:border-slate-800 dark:bg-slate-950">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">Base Case DCF Walkthrough</div>
            <h3 className="mt-1 text-lg font-extrabold text-slate-900 dark:text-white sm:text-xl">
              {ticker}: How fair value is calculated
            </h3>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Follow the cash from the business, through WACC, into enterprise value, equity value, and finally fair value per share.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 shadow-sm transition hover:border-rose-300 hover:text-rose-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
          >
            Close
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900 sm:p-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Price</div>
              <div className="mt-1 text-lg font-extrabold font-mono text-slate-900 dark:text-white">{formatMoneyNative(inputs.current_price, sym)}</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900 sm:p-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Base Fair Value</div>
              <div className="mt-1 text-lg font-extrabold font-mono text-blue-600 dark:text-blue-300">{formatMoneyNative(scenario.fair_value_per_share, sym)}</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900 sm:p-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Upside / Downside</div>
              <div className="mt-1 text-lg font-extrabold font-mono text-slate-900 dark:text-white">{formatDcfPercent(scenario.upside_percent)}</div>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-900 sm:p-4">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Fair P/E vs Current</div>
              <div className="mt-1 text-lg font-extrabold font-mono text-slate-900 dark:text-white">{formatDcfNumber(fairPE, 1)}x / {formatDcfNumber(currentPE, 1)}x</div>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <StepCard
              index="1"
              title="Start with cash the business produced"
              equation="Free Cash Flow = Operating Cash Flow - Capital Expenditure"
              result={`Latest FCF used: ${formatLarge(inputs.latest_fcf, sym)}`}
            >
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                This is the cash left after running and investing in the business. The model uses this as the starting point for future cash flows.
              </p>
            </StepCard>

            <StepCard
              index="2"
              title="Estimate the required return"
              equation="Cost of Equity = Risk-free Rate + Beta x Equity Risk Premium"
              result={`${(inputs.risk_free_rate * 100).toFixed(1)}% + ${formatDcfNumber(inputs.beta, 2)} x ${(inputs.equity_risk_premium * 100).toFixed(1)}% = ${(inputs.cost_of_equity * 100).toFixed(1)}%`}
            >
              <div className="mt-3 grid grid-cols-1 gap-2 text-[11px] md:grid-cols-3">
                <div className="rounded-lg bg-slate-50 dark:bg-slate-900 p-3">Cost of debt: {(inputs.cost_of_debt * 100).toFixed(1)}%</div>
                <div className="rounded-lg bg-slate-50 dark:bg-slate-900 p-3">Tax rate: {(inputs.tax_rate * 100).toFixed(1)}%</div>
                <div className="rounded-lg bg-slate-50 dark:bg-slate-900 p-3">WACC: {(inputs.wacc * 100).toFixed(1)}%</div>
              </div>
            </StepCard>

            <StepCard
              index="3"
              title="Blend equity and debt into WACC"
              equation="WACC = E/(D+E) x Cost of Equity + D/(D+E) x Cost of Debt x (1 - Tax Rate)"
              result={`${(eWeight * 100).toFixed(1)}% equity weight + ${(dWeight * 100).toFixed(1)}% debt weight = ${(inputs.wacc * 100).toFixed(1)}% WACC`}
            />

            <div className="rounded-xl border border-slate-150 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
              <div className="text-sm font-extrabold text-slate-900 dark:text-white">4. Forecast the cash flow path</div>
              <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-[11px] font-mono text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                FCF year n = latest FCF x (1 + growth rate)^n
              </div>
              <div className="mt-4 space-y-3">
                {scenario.forecast_fcfs.map((row) => (
                  <div key={row.year} className="grid grid-cols-[64px_1fr_96px] items-center gap-3 text-xs sm:grid-cols-[76px_1fr_120px]">
                    <span className="font-bold text-slate-500">Year {row.year}</span>
                    <div className="h-3 rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-3 rounded-full bg-blue-500"
                        style={{ width: `${clampPercent((row.fcf / maxFcf) * 100)}%` }}
                      />
                    </div>
                    <span className="text-right font-mono font-bold text-slate-900 dark:text-white">{formatLarge(row.fcf, sym)}</span>
                  </div>
                ))}
              </div>
            </div>

            <StepCard
              index="5"
              title="Discount each future cash flow"
              equation="Present Value = Future Value / (1 + WACC)^year"
              result={`PV of forecast FCFs: ${formatLarge(pvForecast, sym)}`}
            >
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
                {scenario.forecast_fcfs.map((row) => (
                  <div key={row.year} className="rounded-lg bg-slate-50 p-3 text-center dark:bg-slate-900">
                    <div className="text-[10px] font-bold uppercase text-slate-400">Y{row.year} PV</div>
                    <div className="mt-1 text-xs font-extrabold font-mono text-slate-900 dark:text-white">{formatLarge(row.pv, sym)}</div>
                  </div>
                ))}
              </div>
            </StepCard>

            <StepCard
              index="6"
              title="Estimate the terminal value"
              equation="Terminal Value = Final Year FCF x (1 + Terminal Growth) / (WACC - Terminal Growth)"
              result={`Terminal value: ${formatLarge(scenario.terminal_value, sym)} | Present value: ${formatLarge(pvTerminal, sym)}`}
            />

            <StepCard
              index="7"
              title="Convert enterprise value to equity value"
              equation="Equity Value = Enterprise Value - Total Debt + Cash"
              result={`${formatLarge(scenario.enterprise_value, sym)} - ${formatLarge(inputs.total_debt, sym)} + ${formatLarge(inputs.cash, sym)} = ${formatLarge(scenario.equity_value, sym)}`}
            />

            <StepCard
              index="8"
              title="Divide by shares and compare with price"
              equation="Fair Value Per Share = Equity Value / Shares Outstanding"
              result={`${formatLarge(scenario.equity_value, sym)} / ${formatLarge(inputs.shares_outstanding, "")} shares = ${formatMoneyNative(scenario.fair_value_per_share, sym)}`}
            >
              <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
                DCF is sensitive to assumptions. Growth, WACC, and terminal growth can move the answer a lot. This is an educational estimate, not investment advice or a price prediction.
              </div>
            </StepCard>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function ValuationReality({ tickerA, tickerB, result, currency, initialAmount }) {
  const { dark } = useTheme();
  const cc = chartColors(dark);

  const [usePSFallback, setUsePSFallback] = useState(false);
  const [openTooltip, setOpenTooltip] = useState(null);
  const [calculationModal, setCalculationModal] = useState(null);

  // Read fundamentals and prices directly from the unified result passed down
  const dataA = result.fundA;
  const dataB = result.fundB;
  const pricesA = result.pricesA;
  const pricesB = result.pricesB;

  const getSymbol = () => {
    if (currency === "EUR") return "€";
    if (currency === "GBP") return "£";
    if (currency === "CAD") return "C$";
    if (currency === "EGP") return "E£";
    if (currency === "AED") return "د.إ";
    return "$";
  };

  // No need for loading states since data is ready from page.js
  if (!dataA || !dataB) {
    return null;
  }

  const hasA = dataA && dataA.annual && dataA.annual.income_statement && dataA.annual.income_statement.length > 0;
  const hasB = dataB && dataB.annual && dataB.annual.income_statement && dataB.annual.income_statement.length > 0;
  const isETFA = tickerA === "SPY" || tickerA === "VOO" || tickerA === "QQQ" || !hasA;
  const isETFB = tickerB === "SPY" || tickerB === "VOO" || tickerB === "QQQ" || !hasB;

  if (isETFA || isETFB) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-glass-border rounded-2xl p-8 shadow-premium text-left space-y-4 animate-fadeIn">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400 font-mono">
            Stage 3 / Valuation Reality
          </span>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-2">
            Did the Price Become Expensive or Cheap?
          </h2>
        </div>
        <div className="p-6 bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl text-center text-slate-500 dark:text-slate-400 text-xs font-medium">
          ⚠️ Valuation metrics are available mainly for individual companies. 
          <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
            ETF or index valuation requires aggregate holdings-level historical accounting data which is not available for this combination.
          </p>
        </div>
      </div>
    );
  }



  const listA = parseValuation(dataA, pricesA);
  const listB = parseValuation(dataB, pricesB);

  const yearsList = Array.from(new Set([...listA.map(d => d.year), ...listB.map(d => d.year)])).sort();
  const recentYears = yearsList.slice(-5); // Use the latest 5 reporting years

  const getRowByYear = (list, year) => {
    return list.find(d => d.year === year) || null;
  };

  const timelineStart = result.timeline[0]?.date;
  const timelineEnd = result.timeline[result.timeline.length - 1]?.date;

  const validListA = listA.filter(d => d.eps > 0);
  const validListB = listB.filter(d => d.eps > 0);

  const getClosestRow = (list, targetDateStr) => {
    if (!list.length || !targetDateStr) return {};
    const targetTime = new Date(targetDateStr).getTime();
    let closest = list[0];
    let minDiff = Infinity;
    for (const row of list) {
      if (!row.date) continue;
      const rTime = new Date(row.date).getTime();
      const diff = Math.abs(rTime - targetTime);
      if (diff < minDiff) {
        minDiff = diff;
        closest = row;
      }
    }
    return closest;
  };

  const startRowA = getClosestRow(validListA, timelineStart);
  const latestRowA = getClosestRow(validListA, timelineEnd);
  
  const startRowB = getClosestRow(validListB, timelineStart);
  const latestRowB = getClosestRow(validListB, timelineEnd);

  const getGrowth = (startVal, endVal) => {
    if (!startVal || startVal <= 0) return 0;
    return ((endVal - startVal) / startVal) * 100;
  };

  const formatNumber = (val, decimals = 2) => {
    if (val === null || val === undefined || Number.isNaN(Number(val))) return "N/A";
    return Number(val).toFixed(decimals);
  };

  const formatGrowthPath = (startVal, endVal, suffix = "", decimals = 2) => {
    return `${formatNumber(startVal, decimals)}${suffix} → ${formatNumber(endVal, decimals)}${suffix}`;
  };

  const MetricChangeRow = ({ label, startVal, endVal, suffix = "", decimals = 2 }) => {
    const growth = getGrowth(startVal, endVal);
    const isPositive = growth >= 0;

    return (
      <div className="col-span-2 grid grid-cols-[1fr_auto_1fr] items-stretch gap-3">
        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
          <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Starting {label}</span>
          <span className="text-base font-extrabold text-slate-900 dark:text-white font-mono">
            {formatNumber(startVal, decimals)}{suffix}
          </span>
        </div>
        <div className="flex items-center justify-center min-w-20">
          <span className={`text-xs font-extrabold font-mono px-2.5 py-1 rounded-full ${
            isPositive
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
              : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300"
          }`}>
            {isPositive ? "+" : ""}{growth.toFixed(1)}%
          </span>
        </div>
        <div className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
          <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Latest {label}</span>
          <span className="text-base font-extrabold text-slate-900 dark:text-white font-mono">
            {formatNumber(endVal, decimals)}{suffix}
          </span>
        </div>
      </div>
    );
  };

  const getVerdict = (startPE, endPE) => {
    if (!startPE || !endPE) return { text: "P/E unavailable", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" };
    const diff = ((endPE - startPE) / startPE) * 100;
    if (diff > 5) return { text: "Investors paid more", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" };
    if (diff < -5) return { text: "Investors paid less", color: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300" };
    return { text: "Valuation stayed similar", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300" };
  };

  const getClosestPriceValue = (prices, targetDateStr) => {
    if (!prices?.length || !targetDateStr) return null;
    const targetTime = new Date(targetDateStr).getTime();
    let closest = prices[0];
    let minDiff = Infinity;

    for (const row of prices) {
      if (!row.date) continue;
      const rowTime = new Date(row.date).getTime();
      const diff = Math.abs(rowTime - targetTime);
      if (diff < minDiff) {
        minDiff = diff;
        closest = row;
      }
    }

    return Number(closest?.close ?? closest?.adj_close) || null;
  };

  const buildAttributionBridge = ({
    ticker,
    latestRow,
    startRow,
    prices,
    finalWealth,
    finalPriceWealth,
  }) => {
    const startCap = initialAmount || 10000;
    const assetCurrency = result.assetCurrencies?.[ticker] || currency;
    const startRate = result.startRates?.[ticker] || 1;
    const endRate = result.endRates?.[ticker] || startRate || 1;
    const hasFx = assetCurrency !== currency;

    const startPriceNative = getClosestPriceValue(prices, timelineStart) || startRow.price;
    const endPriceNative = getClosestPriceValue(prices, timelineEnd) || latestRow.price;

    const epsGrow = startRow.eps && latestRow.eps
      ? (latestRow.eps - startRow.eps) / startRow.eps
      : 0;

    const startPE = startPriceNative && startRow.eps > 0 ? (startPriceNative / startRow.eps) : startRow.pe;
    const endPE = endPriceNative && latestRow.eps > 0 ? (endPriceNative / latestRow.eps) : latestRow.pe;
    const peGrow = startPE && endPE ? (endPE - startPE) / startPE : 0;

    const nativeStart = startCap / startRate;
    const afterEpsNative = nativeStart * (1 + epsGrow);
    const afterMultipleNative = afterEpsNative * (1 + peGrow);

    const epsContrib = (afterEpsNative - nativeStart) * startRate;
    const multContrib = (afterMultipleNative - afterEpsNative) * startRate;
    const fxEffect = hasFx ? afterMultipleNative * (endRate - startRate) : null;
    const divContrib = finalWealth - finalPriceWealth;
    const modelFinal = startCap + epsContrib + multContrib + (fxEffect || 0) + divContrib;

    return {
      start: startCap,
      eps: epsContrib,
      multiple: multContrib,
      fx: fxEffect,
      dividends: divContrib,
      final: modelFinal,
      startPE,
      endPE,
      hasFx,
      assetCurrency,
    };
  };

  const attA = buildAttributionBridge({
    ticker: tickerA,
    latestRow: latestRowA,
    startRow: startRowA,
    prices: pricesA,
    finalWealth: result.finalA,
    finalPriceWealth: result.finalPriceA,
  });
  const attB = buildAttributionBridge({
    ticker: tickerB,
    latestRow: latestRowB,
    startRow: startRowB,
    prices: pricesB,
    finalWealth: result.finalB,
    finalPriceWealth: result.finalPriceB,
  });

  const verdictA = getVerdict(attA.startPE, attA.endPE);
  const verdictB = getVerdict(attB.startPE, attB.endPE);
  const dcfA = buildDcfValuation(tickerA, dataA, pricesA);
  const dcfB = buildDcfValuation(tickerB, dataB, pricesB);

  // Check if EPS is negative/missing to automatically toggle fallback
  const isEpsUnreliable = (!latestRowA.pe || !latestRowB.pe);

  const formatLargeVal = (val) => {
    if (val === null || val === undefined) return "N/A";
    return val.toFixed(2);
  };

  const getSym = (assetCurrency) => {
    switch(assetCurrency) {
      case "EGP": return "E£";
      case "EUR": return "€";
      case "GBP": return "£";
      case "JPY": return "¥";
      case "CAD": return "C$";
      case "AED": return "د.إ";
      default: return "$";
    }
  };

  const symA = getSym(dataA.company?.currency);
  const symB = getSym(dataB.company?.currency);

  const bridgeRowsFor = (att) => {
    return [
      { label: "Starting Capital", val: att.start, color: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
      { label: "Earnings Growth Effect", val: att.eps, color: att.eps >= 0 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400", isDiff: true, infoText: "Equation: Starting Capital × EPS Growth %" },
      { label: "Valuation Expansion Effect", val: att.multiple, color: att.multiple >= 0 ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400", isDiff: true, infoText: "Equation: (Starting Capital + Earnings Effect) × P/E Growth %" },
      {
        label: att.hasFx ? `${att.assetCurrency} to ${currency} FX Effect` : `${att.assetCurrency} to ${currency} FX Effect`,
        val: att.fx,
        color: att.fx === null ? "bg-slate-50 text-slate-400 dark:bg-slate-900/20 dark:text-slate-500" : att.fx >= 0 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-500" : "bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-500",
        isDiff: true,
        isEmpty: att.fx === null,
        infoText: "Equation: Total Native Wealth × Currency Change %"
      },
      { label: "Reinvested Payouts boost", val: att.dividends, color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400", isDiff: true },
      { label: "Model-implied Accumulation", val: att.final, color: "bg-indigo-600 text-white font-extrabold shadow-sm" }
    ];
  };

  return (
    <div className="space-y-8 animate-fadeIn text-left">
      {/* HEADER */}
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-900/30 px-2.5 py-0.5 text-xs font-semibold text-brand-primary dark:text-blue-300 font-mono">
          Stage 3
        </span>
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-2">
          Did the Price Become Expensive or Cheap?
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          A stock return is not only business growth. It also depends on how much investors were willing to pay for each dollar of earnings.
        </p>
      </div>

      {/* Side-by-Side Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ASSET A: Left Card */}
        <div className={`p-6 rounded-2xl border transition-all ${
          result.finalA >= result.finalB 
            ? "bg-slate-50/50 dark:bg-slate-900/30 border-brand-primary/20 shadow-md" 
            : "bg-white dark:bg-slate-950 border-slate-150 dark:border-slate-850/60"
        }`}>
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
              <span className="font-extrabold font-mono text-sm text-slate-800 dark:text-slate-200">{tickerA} Valuation</span>
            </div>
            <span className={`text-[10px] px-2 py-0.5 font-bold rounded uppercase tracking-wider font-mono ${verdictA.color}`}>
              {verdictA.text}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <MetricChangeRow label="EPS" startVal={startRowA.eps} endVal={latestRowA.eps} />
            <MetricChangeRow label="P/E" startVal={attA.startPE} endVal={attA.endPE} suffix="x" />
          </div>

          <DcfMiniPanel
            ticker={tickerA}
            dcf={dcfA}
            latestRow={latestRowA}
            currentPE={attA.endPE}
            sym={symA}
            accentClass="text-blue-600 dark:text-blue-400"
            onOpenCalculations={setCalculationModal}
          />
        </div>

        {/* ASSET B: Right Card */}
        <div className={`p-6 rounded-2xl border transition-all ${
          result.finalB > result.finalA 
            ? "bg-slate-50/50 dark:bg-slate-900/30 border-brand-primary/20 shadow-md" 
            : "bg-white dark:bg-slate-950 border-slate-150 dark:border-slate-850/60"
        }`}>
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-violet-500" />
              <span className="font-extrabold font-mono text-sm text-slate-800 dark:text-slate-200">{tickerB} Valuation</span>
            </div>
            <span className={`text-[10px] px-2 py-0.5 font-bold rounded uppercase tracking-wider font-mono ${verdictB.color}`}>
              {verdictB.text}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <MetricChangeRow label="EPS" startVal={startRowB.eps} endVal={latestRowB.eps} />
            <MetricChangeRow label="P/E" startVal={attB.startPE} endVal={attB.endPE} suffix="x" />
          </div>

          <DcfMiniPanel
            ticker={tickerB}
            dcf={dcfB}
            latestRow={latestRowB}
            currentPE={attB.endPE}
            sym={symB}
            accentClass="text-violet-600 dark:text-violet-400"
            onOpenCalculations={setCalculationModal}
          />
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20 p-4 text-xs font-medium text-amber-800 dark:text-amber-300">
        DCF is sensitive to assumptions. Change growth or WACC and the result can move a lot. This is an estimated fair value model, not investment advice and not a price prediction.
      </div>

      {/* FALLBACK INFO OPTION */}
      {isEpsUnreliable && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 text-xs rounded-xl font-medium">
          ⚠️ P/E is not fully meaningful for this period because one asset EPS is missing or negative.
        </div>
      )}

      {/* CHARTS CONTAINER */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* CHART 1: EPS Over Time */}
        <div className="bg-white dark:bg-slate-950 border border-glass-border rounded-2xl p-6 shadow-premium space-y-4">
          <div>
            <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              📊 Earnings Per Share (EPS) Over Time
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">Separate lines comparing actual operational EPS in US Dollars ($)</p>
          </div>

          <div className="aspect-[16/8] bg-slate-50/40 dark:bg-slate-900/20 rounded-xl p-3 border border-slate-100 dark:border-slate-800 relative overflow-hidden">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 400 130" preserveAspectRatio="none">
              {(() => {
                const chartLabels = [...recentYears, "Now"];
                const numPts = chartLabels.length;

                const getEpsVal = (list, label, latestEps) => label === "Now" ? latestEps : getRowByYear(list, label)?.eps;

                const epsListA = chartLabels.map(l => getEpsVal(listA, l, latestRowA.eps)).filter(v => v !== null && v !== undefined);
                const epsListB = chartLabels.map(l => getEpsVal(listB, l, latestRowB.eps)).filter(v => v !== null && v !== undefined);
                const maxVal = Math.max(...epsListA, ...epsListB, 1.0) * 1.1;

                const scaleY = (val) => 110 - (val / maxVal) * 90;
                const scaleX = (idx) => (idx / (numPts - 1)) * 360 + 20;

                const ptsA = chartLabels.map((l, i) => {
                  const val = getEpsVal(listA, l, latestRowA.eps);
                  return val ? `${scaleX(i)},${scaleY(val)}` : null;
                }).filter(Boolean);
                
                const ptsB = chartLabels.map((l, i) => {
                  const val = getEpsVal(listB, l, latestRowB.eps);
                  return val ? `${scaleX(i)},${scaleY(val)}` : null;
                }).filter(Boolean);

                return (
                  <>
                    {/* Gridlines */}
                    <line x1="20" y1="110" x2="380" y2="110" stroke={cc.gridLine} strokeWidth="1" />
                    <line x1="20" y1="65" x2="380" y2="65" stroke={cc.gridLine} strokeWidth="1" strokeDasharray="2 2" />
                    <line x1="20" y1="20" x2="380" y2="20" stroke={cc.gridLine} strokeWidth="1" strokeDasharray="2 2" />

                    {/* Path Asset A (Blue) */}
                    <path d={`M ${ptsA.join(" L ")}`} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
                    {chartLabels.map((label, i) => {
                      const val = getEpsVal(listA, label, latestRowA.eps);
                      if (!val) return null;
                      return (
                        <g key={`a-${i}`}>
                          <circle cx={scaleX(i)} cy={scaleY(val)} r="3.5" fill="#3b82f6" stroke={cc.dotStroke} strokeWidth="1" />
                          <text x={scaleX(i)} y={scaleY(val) - 8} textAnchor="middle" fill="#3b82f6" fontSize="8" fontWeight="bold">
                            {val.toFixed(2)}
                          </text>
                        </g>
                      );
                    })}

                    {/* Path Asset B (Purple) */}
                    <path d={`M ${ptsB.join(" L ")}`} fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" />
                    {chartLabels.map((label, i) => {
                      const val = getEpsVal(listB, label, latestRowB.eps);
                      if (!val) return null;
                      return (
                        <g key={`b-${i}`}>
                          <circle cx={scaleX(i)} cy={scaleY(val)} r="3.5" fill="#7c3aed" stroke={cc.dotStroke} strokeWidth="1" />
                          <text x={scaleX(i)} y={scaleY(val) + 12} textAnchor="middle" fill="#7c3aed" fontSize="8" fontWeight="bold">
                            {val.toFixed(2)}
                          </text>
                        </g>
                      );
                    })}

                    {/* Year Labels */}
                    {chartLabels.map((l, i) => (
                      <text key={i} x={scaleX(i)} y="125" textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="monospace">
                        {l === "Now" ? "Now" : `'${l.toString().slice(2)}`}
                      </text>
                    ))}
                  </>
                );
              })()}
            </svg>
          </div>
          <div className="flex gap-4 text-[10px] font-mono justify-center">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-blue-500 rounded-full" /> {tickerA} EPS</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-violet-500 rounded-full" /> {tickerB} EPS</span>
          </div>
        </div>

        {/* CHART 2: P/E Ratio Over Time */}
        <div className="bg-white dark:bg-slate-950 border border-glass-border rounded-2xl p-6 shadow-premium space-y-4">
          <div>
            <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              📊 Historical P/E Multiple Path
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">Shows how many dollars investors paid for each $1 of corporate profit</p>
          </div>

          <div className="aspect-[16/8] bg-slate-50/40 dark:bg-slate-900/20 rounded-xl p-3 border border-slate-100 dark:border-slate-800 relative overflow-hidden">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 400 130" preserveAspectRatio="none">
              {(() => {
                const chartLabels = [...recentYears, "Now"];
                const numPts = chartLabels.length;

                const getPeVal = (list, label, endPE) => label === "Now" ? endPE : getRowByYear(list, label)?.pe;

                const peListA = chartLabels.map(l => getPeVal(listA, l, attA.endPE)).filter(v => v !== null && v !== undefined);
                const peListB = chartLabels.map(l => getPeVal(listB, l, attB.endPE)).filter(v => v !== null && v !== undefined);
                const maxVal = Math.max(...peListA, ...peListB, 1.0) * 1.1;

                const scaleY = (val) => 110 - (val / maxVal) * 90;
                const scaleX = (idx) => (idx / (numPts - 1)) * 360 + 20;

                const ptsA = chartLabels.map((l, i) => {
                  const val = getPeVal(listA, l, attA.endPE);
                  return val ? `${scaleX(i)},${scaleY(val)}` : null;
                }).filter(Boolean);
                
                const ptsB = chartLabels.map((l, i) => {
                  const val = getPeVal(listB, l, attB.endPE);
                  return val ? `${scaleX(i)},${scaleY(val)}` : null;
                }).filter(Boolean);

                return (
                  <>
                    {/* Gridlines */}
                    <line x1="20" y1="110" x2="380" y2="110" stroke={cc.gridLine} strokeWidth="1" />
                    <line x1="20" y1="65" x2="380" y2="65" stroke={cc.gridLine} strokeWidth="1" strokeDasharray="2 2" />
                    <line x1="20" y1="20" x2="380" y2="20" stroke={cc.gridLine} strokeWidth="1" strokeDasharray="2 2" />

                    {/* Path Asset A (Blue) */}
                    <path d={`M ${ptsA.join(" L ")}`} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />
                    {chartLabels.map((label, i) => {
                      const val = getPeVal(listA, label, attA.endPE);
                      if (!val) return null;
                      return (
                        <g key={`a-${i}`}>
                          <circle cx={scaleX(i)} cy={scaleY(val)} r="3.5" fill="#3b82f6" stroke={cc.dotStroke} strokeWidth="1" />
                          <text x={scaleX(i)} y={scaleY(val) - 8} textAnchor="middle" fill="#3b82f6" fontSize="8" fontWeight="bold">
                            {val.toFixed(1)}x
                          </text>
                        </g>
                      );
                    })}

                    {/* Path Asset B (Purple) */}
                    <path d={`M ${ptsB.join(" L ")}`} fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" />
                    {chartLabels.map((label, i) => {
                      const val = getPeVal(listB, label, attB.endPE);
                      if (!val) return null;
                      return (
                        <g key={`b-${i}`}>
                          <circle cx={scaleX(i)} cy={scaleY(val)} r="3.5" fill="#7c3aed" stroke={cc.dotStroke} strokeWidth="1" />
                          <text x={scaleX(i)} y={scaleY(val) + 12} textAnchor="middle" fill="#7c3aed" fontSize="8" fontWeight="bold">
                            {val.toFixed(1)}x
                          </text>
                        </g>
                      );
                    })}

                    {/* Year Labels */}
                    {chartLabels.map((l, i) => (
                      <text key={i} x={scaleX(i)} y="125" textAnchor="middle" fill="#94a3b8" fontSize="8" fontFamily="monospace">
                        {l === "Now" ? "Now" : `'${l.toString().slice(2)}`}
                      </text>
                    ))}
                  </>
                );
              })()}
            </svg>
          </div>
          <div className="flex gap-4 text-[10px] font-mono justify-center">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-blue-500 rounded-full" /> {tickerA} P/E Ratio</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 bg-violet-500 rounded-full" /> {tickerB} P/E Ratio</span>
          </div>
        </div>
      </div>

      {/* CHART 3: RETURN ATTRIBUTION BRIDGE (WATERFALL) */}
      <div className="bg-white dark:bg-slate-950 border border-glass-border rounded-2xl p-6 shadow-premium space-y-6">
        <div>
          <h4 className="text-sm font-extrabold text-slate-800 dark:text-slate-200">
            🪜 Return Attribution Bridge (Waterfall)
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            See a simplified model of how starting capital could grow from earnings growth, valuation change, FX, and reinvested payouts.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
          {/* Ticker A Waterfall */}
          <div className="space-y-4">
            <span className="text-xs font-bold font-mono text-blue-500">{tickerA} Return Deconstruction</span>
            
            <div className="space-y-2.5">
              {bridgeRowsFor(attA).map((item, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 rounded-xl border border-slate-100/50 dark:border-slate-800/40">
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5 relative">
                    {item.label}
                    {item.infoText && (
                      <>
                        <button 
                          onClick={() => setOpenTooltip(openTooltip === `A-${idx}` ? null : `A-${idx}`)}
                          className="text-[12px] text-slate-400 hover:text-brand-primary transition-colors focus:outline-none"
                        >
                          ⓘ
                        </button>
                        {openTooltip === `A-${idx}` && (
                          <div className="absolute z-10 bottom-full left-0 mb-1.5 w-48 p-2.5 bg-slate-800 dark:bg-slate-700 text-slate-100 text-[10px] font-normal leading-relaxed rounded-lg shadow-xl border border-slate-600">
                            {item.infoText}
                            <div className="absolute top-full left-4 -mt-px w-2 h-2 bg-slate-800 dark:bg-slate-700 rotate-45 border-r border-b border-slate-600" />
                          </div>
                        )}
                      </>
                    )}
                  </span>
                  <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${item.color}`}>
                    {item.isEmpty ? "—" : `${item.isDiff && item.val >= 0 ? "+" : ""}${getSymbol()}${Math.round(item.val).toLocaleString()}`}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Ticker B Waterfall */}
          <div className="space-y-4">
            <span className="text-xs font-bold font-mono text-purple-500">{tickerB} Return Deconstruction</span>
            
            <div className="space-y-2.5">
              {bridgeRowsFor(attB).map((item, idx) => (
                <div key={idx} className="flex justify-between items-center p-3 rounded-xl border border-slate-100/50 dark:border-slate-800/40">
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1.5 relative">
                    {item.label}
                    {item.infoText && (
                      <>
                        <button 
                          onClick={() => setOpenTooltip(openTooltip === `B-${idx}` ? null : `B-${idx}`)}
                          className="text-[12px] text-slate-400 hover:text-brand-primary transition-colors focus:outline-none"
                        >
                          ⓘ
                        </button>
                        {openTooltip === `B-${idx}` && (
                          <div className="absolute z-10 bottom-full left-0 mb-1.5 w-48 p-2.5 bg-slate-800 dark:bg-slate-700 text-slate-100 text-[10px] font-normal leading-relaxed rounded-lg shadow-xl border border-slate-600">
                            {item.infoText}
                            <div className="absolute top-full left-4 -mt-px w-2 h-2 bg-slate-800 dark:bg-slate-700 rotate-45 border-r border-b border-slate-600" />
                          </div>
                        )}
                      </>
                    )}
                  </span>
                  <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${item.color}`}>
                    {item.isEmpty ? "—" : `${item.isDiff && item.val >= 0 ? "+" : ""}${getSymbol()}${Math.round(item.val).toLocaleString()}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Term Explanations Grid */}
        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-50/50 dark:bg-slate-900/20 p-4 rounded-xl border border-slate-150/40 dark:border-slate-805/40 space-y-1">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              📈 Earnings Growth Effect
            </span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              <strong>Corporate profits in action.</strong> Measures the stock value gained as a direct result of corporate earnings power increasing. If a company doubles its actual earnings per share (EPS), its stock price will double even if investor sentiment stays exactly the same.
            </p>
          </div>
          
          <div className="bg-slate-50/50 dark:bg-slate-900/20 p-4 rounded-xl border border-slate-155/40 dark:border-slate-805/40 space-y-1">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              ⚖️ Valuation Expansion Effect
            </span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              <strong>Investor sentiment & multiples.</strong> Measures changes in the P/E ratio. When optimism rises (e.g., AI expansion), investors pay higher multiples per dollar of earnings, supercharging stock price growth. If multiples shrink, it acts as a drag.
            </p>
          </div>

          <div className="bg-slate-50/50 dark:bg-slate-900/20 p-4 rounded-xl border border-slate-155/40 dark:border-slate-805/40 space-y-1">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              💰 Reinvested Payouts Boost
            </span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              <strong>Cash compounding at work.</strong> Rather than pocketing cash dividends, auto-reinvesting them acquires more fractional shares. This builds a larger ownership base over time, creating a compound return multiplier.
            </p>
          </div>
        </div>
      </div>

      {/* WHY THIS MATTERS EXPLANATION */}
      <div className="bg-slate-50 dark:bg-slate-900/30 border border-slate-150 dark:border-slate-850 rounded-2xl p-5">
        <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider font-mono">
          💡 Why This Matters
        </h5>
        <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
          Revenue and earnings show what the business did. Valuation shows what investors believed. A company can grow earnings but still disappoint if its P/E ratio falls. Another company can rise fast if both earnings and the P/E multiple expand.
        </p>
      </div>

      {/* STAGE VERDICT */}
      <div className="bg-gradient-to-r from-blue-50/50 to-violet-50/50 dark:from-blue-950/20 dark:to-violet-950/20 border border-brand-primary/10 rounded-2xl p-6">
        <h4 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          🏆 Valuation Verdict
        </h4>
        <p className="text-xs text-slate-700 dark:text-slate-350 mt-3 leading-relaxed">
          {(() => {
            const winner = result.finalA >= result.finalB ? tickerA : tickerB;
            const loser = winner === tickerA ? tickerB : tickerA;
            const winnerAtt = winner === tickerA ? attA : attB;
            const loserAtt = winner === tickerA ? attB : attA;

            const isWinnerGrowthDriven = winnerAtt.eps > Math.abs(winnerAtt.multiple);
            const isLoserMultipleCompressed = loserAtt.multiple < 0;

            let text = `${winner}'s spectacular return was driven mainly by `;
            if (isWinnerGrowthDriven) {
              text += `fundamental business growth (earnings rose dramatically). `;
            } else {
              text += `multiple expansion (investors were willing to pay higher multiples for future potential). `;
            }

            if (Math.abs(winnerAtt.multiple) > 0.1 * winnerAtt.eps) {
              text += `Importantly, ${winner} also benefited from massive valuation multiple changes, showing that market optimism supercharged business performance. `;
            }

            if (isLoserMultipleCompressed) {
              text += `Conversely, ${loser} experienced significant multiple compression, meaning investors de-rated the stock and expected less of its future profit stream, acting as a structural return drag.`;
            } else {
              text += `For ${loser}, returns were stable but could not match the combined operational and valuation speed of the leader.`;
            }

            return text;
          })()}
        </p>
      </div>

      <DcfCalculationModal
        payload={calculationModal}
        onClose={() => setCalculationModal(null)}
      />
    </div>
  );
}
