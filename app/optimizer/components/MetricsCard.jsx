"use client";

import React from "react";

export default function MetricsCard({ pReturn, pVolatility, totalGainPct, totalGainNominal, currency }) {
  const sharpe = pVolatility > 0 ? (pReturn - 0.02) / pVolatility : 0;

  const getSymbol = () => {
    if (currency === "EUR") return "€";
    if (currency === "GBP") return "£";
    if (currency === "CAD") return "C$";
    if (currency === "EGP") return "E£";
    if (currency === "AED") return "د.إ";
    return "$";
  };

  const formatMoney = (val) => {
    return `${getSymbol()}${Math.round(val || 0).toLocaleString()}`;
  };

  const cards = [
    {
      title: "Annualized Return (IRR)",
      value: `${(pReturn * 100).toFixed(2)}%`,
      desc: "Annualized internal rate of return of the periodic monthly cash deposits.",
      colorClass: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20",
    },
    {
      title: "Portfolio Volatility",
      value: `${(pVolatility * 100).toFixed(2)}%`,
      desc: "Annualized standard deviation of daily returns (risk proxy).",
      colorClass: "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20",
    },
    {
      title: "Sharpe Ratio",
      value: sharpe.toFixed(2),
      desc: "Risk-adjusted performance (excess DCA return per unit of volatility).",
      colorClass: "text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/20",
    },
    {
      title: "Total Growth",
      value: `+${totalGainPct.toFixed(1)}%`,
      desc: `Total return on periodic capital (${formatMoney(totalGainNominal)} net growth over the period).`,
      colorClass: "text-brand-primary bg-indigo-50 dark:bg-indigo-950/20",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, i) => (
        <div
          key={i}
          className="bg-white dark:bg-slate-900 border border-glass-border rounded-2xl p-6 shadow-premium hover:shadow-premium-hover transition-all duration-300 flex flex-col justify-between"
        >
          <div>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block font-mono">
              {card.title}
            </span>
            <span className={`text-2xl font-black block mt-2 px-2.5 py-1 rounded-xl w-fit ${card.colorClass}`}>
              {card.value}
            </span>
          </div>
          <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 mt-4">
            {card.desc}
          </p>
        </div>
      ))}
    </div>
  );
}
