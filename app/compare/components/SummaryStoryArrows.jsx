"use client";

import React, { useState, useEffect } from "react";

import { computePriceMetrics, getBusinessQuality } from "../utils/calculations";

export default function SummaryStoryArrows({ result, currency, initialAmount }) {
  const [activeStep, setActiveStep] = useState(null);

  if (!result) return null;

  const tickerA     = result.tickerA;
  const tickerB     = result.tickerB;
  const finalA      = result.finalA;
  const finalB      = result.finalB;
  const finalPriceA = result.finalPriceA || finalA;
  const finalPriceB = result.finalPriceB || finalB;

  const finalDivA = finalA - finalPriceA;
  const finalDivB = finalB - finalPriceB;

  const assetCurrencyA = result.assetCurrencies?.[tickerA] || "USD";
  const assetCurrencyB = result.assetCurrencies?.[tickerB] || "USD";
  const startRateA = result.startRates?.[tickerA] || 1.0;
  const endRateA = result.endRates?.[tickerA] || 1.0;
  const startRateB = result.startRates?.[tickerB] || 1.0;
  const endRateB = result.endRates?.[tickerB] || 1.0;

  const isHomeA = currency === assetCurrencyA;
  const isHomeB = currency === assetCurrencyB;

  const nomTotalA = finalA;
  const nomTotalB = finalB;
  const nomPriceOnlyA = finalPriceA;
  const nomPriceOnlyB = finalPriceB;
  const nomDivOnlyA = finalDivA;
  const nomDivOnlyB = finalDivB;

  const finalAssetA = finalA / endRateA;
  const finalAssetB = finalB / endRateB;

  const priceGrowthCashA = nomPriceOnlyA - initialAmount;
  const priceGrowthCashB = nomPriceOnlyB - initialAmount;
  
  const fxImpactCashA = isHomeA ? 0 : finalAssetA * (endRateA - startRateA);
  const fxImpactCashB = isHomeB ? 0 : finalAssetB * (endRateB - startRateB);
  
  const pricePctA = ((finalPriceA - initialAmount) / initialAmount) * 100;
  const pricePctB = ((finalPriceB - initialAmount) / initialAmount) * 100;
  
  const fxPctA = isHomeA ? 0 : ((endRateA - startRateA) / startRateA) * 100;
  const fxPctB = isHomeB ? 0 : ((endRateB - startRateB) / startRateB) * 100;

  const divPctA = (finalDivA / finalPriceA) * 100;
  const divPctB = (finalDivB / finalPriceB) * 100;

  const winner      = nomTotalA >= nomTotalB ? tickerA : tickerB;
  const winnerTotal = Math.max(nomTotalA, nomTotalB);
  const loserTotal  = Math.min(nomTotalA, nomTotalB);
  const gap         = winnerTotal - loserTotal;

  const getSymbol = () => {
    if (currency === "EUR") return "€";
    if (currency === "GBP") return "£";
    if (currency === "CAD") return "C$";
    if (currency === "EGP") return "E£";
    if (currency === "AED") return "د.إ";
    return "$";
  };

  const fundsA = result.fundA;
  const fundsB = result.fundB;
  const priceMetricsA = result.pricesA ? computePriceMetrics(result.pricesA) : null;
  const priceMetricsB = result.pricesB ? computePriceMetrics(result.pricesB) : null;

  // ═══════════════════════════════════════════════════════════════════════════════
  // ENTRY RISK SCORING (0–100)
  //
  // Weights:  Valuation 35%  |  Momentum 25%  |  Vol/DD 20%
  //           Fundamental Support 15%  |  Dividend Cushion 5%
  //
  // Key principle: Strong fundamentals reduce ENTRY RISK only partially.
  // Stretched valuation + overheated momentum still produce Elevated/High risk
  // even for companies with Very Strong business quality.
  // ═══════════════════════════════════════════════════════════════════════════════
  const getEntryRisk = (ticker, funds, priceMetrics, maxDd, quality) => {
    const ETF_LIST = ["SPY", "VOO", "QQQ", "IVV", "VTI", "SCHB", "VIG"];
    const isETF    = ETF_LIST.includes(ticker) || !funds?.company;
    let confidence = "High";
    const missing  = [];

    // ── BUCKET 1 · Valuation Risk  (35%) ────────────────────────────────────────
    let valRaw  = 50;
    let valDesc = "Valuation data unavailable — bucket scored neutral";

    if (isETF) {
      valRaw  = 45;
      valDesc = "ETF aggregate valuation cannot be assessed at individual-stock level";
      confidence = "Low";
    } else if (funds?.company) {
      const co        = funds.company;
      const annualInc = funds.annual?.income_statement || [];
      const currentPE = co.trailingPE > 0 ? co.trailingPE : null;
      const currentPS = co.marketCap && co.totalRevenue > 0 ? co.marketCap / co.totalRevenue : null;

      // Historical PE: match annual EPS to nearest daily close
      let histPEs = [];
      if (priceMetrics?.sorted && annualInc.length >= 2) {
        for (const period of annualInc.slice(0, 6)) {
          const eps = period.values.diluted_eps ?? period.values.basic_eps;
          if (!eps || eps <= 0) continue;
          const tMs = new Date(period.period_end).getTime();
          let best = null, minD = Infinity;
          for (const p of priceMetrics.sorted) {
            const d = Math.abs(new Date(p.date).getTime() - tMs);
            if (d < minD) { minD = d; best = p.adj_close ?? p.close; }
          }
          if (best > 0) histPEs.push(best / eps);
        }
      }
      const sHistPEs = [...histPEs].sort((a, b) => a - b);
      const medHistPE = histPEs.length >= 2 ? sHistPEs[Math.floor(sHistPEs.length / 2)] : null;

      if (currentPE) {
        if (medHistPE && medHistPE > 0) {
          const prem = (currentPE - medHistPE) / medHistPE;
          const pct  = (Math.abs(prem) * 100).toFixed(0);
          if (prem > 0.60)       { valRaw = 90; valDesc = `P/E ${currentPE.toFixed(1)}x is ${pct}% above 5-yr median (${medHistPE.toFixed(1)}x) — significantly overextended`; }
          else if (prem > 0.30)  { valRaw = 72; valDesc = `P/E ${currentPE.toFixed(1)}x is ${pct}% above 5-yr median (${medHistPE.toFixed(1)}x) — moderately stretched`; }
          else if (prem > 0.10)  { valRaw = 55; valDesc = `P/E ${currentPE.toFixed(1)}x is slightly above 5-yr median (${medHistPE.toFixed(1)}x)`; }
          else if (prem > -0.15) { valRaw = 36; valDesc = `P/E ${currentPE.toFixed(1)}x is near its 5-yr median (${medHistPE.toFixed(1)}x) — fairly valued`; }
          else                   { valRaw = 16; valDesc = `P/E ${currentPE.toFixed(1)}x is ${pct}% below 5-yr median (${medHistPE.toFixed(1)}x) — at a historical discount`; }
        } else {
          if (currentPE > 55)      { valRaw = 82; valDesc = `P/E of ${currentPE.toFixed(1)}x is very high on an absolute basis`; }
          else if (currentPE > 38) { valRaw = 65; valDesc = `P/E of ${currentPE.toFixed(1)}x implies elevated growth expectations`; }
          else if (currentPE > 22) { valRaw = 46; valDesc = `P/E of ${currentPE.toFixed(1)}x is moderately priced`; }
          else                     { valRaw = 24; valDesc = `P/E of ${currentPE.toFixed(1)}x is below the broad market average`; }
          if (confidence === "High") confidence = "Medium";
          missing.push("no 5-yr P/E history");
        }
      } else if (currentPS) {
        if (currentPS > 12)      { valRaw = 80; valDesc = `Earnings absent; P/S of ${currentPS.toFixed(1)}x is extremely elevated`; }
        else if (currentPS > 6)  { valRaw = 62; valDesc = `Earnings absent; P/S of ${currentPS.toFixed(1)}x implies premium revenue pricing`; }
        else if (currentPS > 2)  { valRaw = 40; valDesc = `P/S of ${currentPS.toFixed(1)}x — revenue-based pricing appears reasonable`; }
        else                     { valRaw = 20; valDesc = `P/S of ${currentPS.toFixed(1)}x — inexpensive relative to revenues`; }
        if (confidence === "High") confidence = "Medium";
        missing.push("negative/missing earnings — using P/S");
      } else {
        valRaw = 50; valDesc = "No usable valuation metric available";
        confidence = "Low"; missing.push("no valuation data");
      }
    }

    // ── BUCKET 2 · Momentum / Overheating Risk  (25%) ───────────────────────────
    let momRaw  = 35;
    let momDesc = "Price history unavailable";

    if (priceMetrics) {
      const { oneYearReturn, ma200, high52w, currentPrice } = priceMetrics;
      const yr1  = oneYearReturn * 100;
      const dMA  = ma200 > 0 ? ((currentPrice - ma200) / ma200) * 100 : 0;
      const dH52 = high52w > 0 ? ((currentPrice - high52w) / high52w) * 100 : 0;

      let ms = 0;
      // 1-year return (0–40 pts)
      if (yr1 > 150)       ms += 40;
      else if (yr1 > 100)  ms += 33;
      else if (yr1 > 60)   ms += 25;
      else if (yr1 > 30)   ms += 15;
      else if (yr1 > 10)   ms += 7;
      else if (yr1 < -25)  ms -= 8;
      else if (yr1 < 0)    ms -= 3;

      // 200-day MA distance (0–35 pts)
      if (dMA > 40)        ms += 35;
      else if (dMA > 25)   ms += 27;
      else if (dMA > 15)   ms += 18;
      else if (dMA > 5)    ms += 9;
      else if (dMA > 0)    ms += 4;
      else if (dMA < -15)  ms -= 6;

      // 52-week high proximity (0–25 pts — near high = extended entry)
      if (dH52 >= -2)      ms += 25;
      else if (dH52 >= -8) ms += 16;
      else if (dH52 >= -20) ms += 6;

      momRaw = Math.max(0, Math.min(100, ms));

      const maLabel = dMA >= 0
        ? `${dMA.toFixed(1)}% above 200-day MA`
        : `${Math.abs(dMA).toFixed(1)}% below 200-day MA`;
      const h52Label = dH52 >= -2 ? "near 52-week high" : `${Math.abs(dH52).toFixed(1)}% off 52-week high`;
      momDesc = `1yr return: ${yr1 >= 0 ? "+" : ""}${yr1.toFixed(1)}% · ${maLabel} · ${h52Label}`;
    } else {
      missing.push("price data unavailable");
    }

    // ── BUCKET 3 · Volatility & Drawdown Risk  (20%) ────────────────────────────
    let volRaw  = 40;
    let volDesc = "Volatility estimated from drawdown profile";
    const dd    = Math.abs(maxDd || 0);

    if (priceMetrics) {
      const { annualizedVol } = priceMetrics;
      let vs;
      if (annualizedVol > 70)      vs = 70;
      else if (annualizedVol > 55) vs = 58;
      else if (annualizedVol > 40) vs = 45;
      else if (annualizedVol > 28) vs = 32;
      else if (annualizedVol > 18) vs = 18;
      else                         vs = 7;

      let ds;
      if (dd > 60)      ds = 30;
      else if (dd > 45) ds = 24;
      else if (dd > 30) ds = 16;
      else if (dd > 18) ds = 8;
      else              ds = 2;

      volRaw  = Math.min(100, vs + ds);
      volDesc = `Annualized volatility: ${annualizedVol.toFixed(1)}% · Max drawdown: ${dd.toFixed(1)}%`;
    } else {
      if (dd > 60)      volRaw = 78;
      else if (dd > 45) volRaw = 62;
      else if (dd > 30) volRaw = 46;
      else if (dd > 18) volRaw = 28;
      else              volRaw = 12;
      volDesc = `Max drawdown: ${dd.toFixed(1)}% (annualized vol not computed)`;
    }

    // ── BUCKET 4 · Fundamental Support  (15%) ───────────────────────────────────
    // Question: "Are fundamentals strong enough to justify today's price?"
    // Strong fundamentals reduce entry risk — but only partially.
    // Stretched valuation + overheating dominate the overall score regardless.
    let fundRaw  = 50;
    let fundDesc = "Insufficient data to assess fundamental support";

    if (isETF) {
      fundRaw  = 30;
      fundDesc = "ETF broad diversification provides inherent fundamental support";
    } else if (quality) {
      // Map business quality score → fundamental support raw
      // "Very Strong" means fundamentals DO support the price (low raw)
      // "Weak" means fundamentals do NOT support the price (high raw)
      const qs = quality.score;
      if (qs >= 8)       { fundRaw = 18; fundDesc = `Very strong fundamentals (${quality.signals.slice(0, 2).join(", ")}) provide solid business support for current pricing`; }
      else if (qs >= 4)  { fundRaw = 32; fundDesc = `Strong fundamentals (${quality.signals.slice(0, 2).join(", ")}) support the business case, but cannot offset valuation/momentum risk alone`; }
      else if (qs >= 1)  { fundRaw = 50; fundDesc = "Stable fundamentals — growth is limited but no deterioration"; }
      else               { fundRaw = 72; fundDesc = `Weak fundamentals (${quality.signals.slice(0, 2).join(", ")}) reduce the business case for paying today's price`; }
    } else if (!isETF && funds?.annual?.income_statement?.length >= 3) {
      fundRaw = 50;
      fundDesc = "Fundamental trend computed but quality signal unavailable";
    }

    // ── BUCKET 5 · Dividend Cushion  (5%) ───────────────────────────────────────
    let divRaw  = 50;
    let divDesc = "Dividend data unavailable";

    if (isETF) {
      divRaw = 30; divDesc = "ETFs distribute underlying dividends — moderate passive cushion";
    } else if (funds?.company) {
      const co          = funds.company;
      const sector      = co.sector || "";
      const isDefensive = ["Consumer Defensive", "Utilities", "Real Estate"].includes(sector);
      const divYield    = co.dividendYield > 0 ? co.dividendYield * 100 : 0;
      const cf          = funds.annual?.cash_flow || [];
      let fcfPayout = null;
      if (cf.length >= 1 && cf[0].values.free_cash_flow > 0 && cf[0].values.cash_dividends_paid)
        fcfPayout = Math.abs(cf[0].values.cash_dividends_paid) / cf[0].values.free_cash_flow;

      if (divYield > 0) {
        if (divYield > 4.5)      { divRaw = 8;  divDesc = `Strong yield of ${divYield.toFixed(2)}% — meaningful income cushion`; }
        else if (divYield > 2.5) { divRaw = 22; divDesc = `Solid yield of ${divYield.toFixed(2)}% — good income support`; }
        else if (divYield > 1)   { divRaw = 38; divDesc = `Modest yield of ${divYield.toFixed(2)}% — minor price cushion`; }
        else                     { divRaw = 52; divDesc = `Low yield of ${divYield.toFixed(2)}% — limited dividend protection`; }

        if (fcfPayout !== null) {
          if (fcfPayout > 1.2)       { divRaw = Math.min(100, divRaw + 30); divDesc += ` · payout ${(fcfPayout * 100).toFixed(0)}% of FCF — unsustainable`; }
          else if (fcfPayout > 0.80) { divRaw = Math.min(100, divRaw + 12); divDesc += ` · payout ${(fcfPayout * 100).toFixed(0)}% of FCF — high but manageable`; }
          else                       { divDesc += ` · payout ${(fcfPayout * 100).toFixed(0)}% of FCF — well-covered`; }
        }
      } else {
        if (isDefensive) { divRaw = 62; divDesc = `${sector} sector with no dividend — atypical for defensive classification`; }
        else {
          const latestFCF = cf[0]?.values?.free_cash_flow;
          if (latestFCF > 0) { divRaw = 42; divDesc = "No dividend — positive FCF supports growth-reinvestment model"; }
          else               { divRaw = 60; divDesc = "No dividend and recent FCF negative — no income cushion"; }
        }
      }
    }

    // ── AGGREGATE ────────────────────────────────────────────────────────────────
    const buckets = [
      { label: "Valuation Risk",          desc: valDesc,  raw: Math.round(valRaw),  weight: 0.35 },
      { label: "Momentum / Overheating",  desc: momDesc,  raw: Math.round(momRaw),  weight: 0.25 },
      { label: "Volatility & Drawdown",   desc: volDesc,  raw: Math.round(volRaw),  weight: 0.20 },
      { label: "Fundamental Support",     desc: fundDesc, raw: Math.round(fundRaw), weight: 0.15 },
      { label: "Dividend Cushion",        desc: divDesc,  raw: Math.round(divRaw),  weight: 0.05 },
    ].map(b => ({
      ...b,
      weightedPts: parseFloat((b.raw * b.weight).toFixed(1)),
      maxPts:      Math.round(b.weight * 100),
    }));

    const score = Math.max(0, Math.min(100,
      Math.round(buckets.reduce((s, b) => s + b.weightedPts, 0))
    ));

    if      (missing.length >= 3)                          confidence = "Low";
    else if (missing.length >= 1 && confidence === "High") confidence = "Medium";

    let rating;
    if      (score <= 25) rating = "Low Entry Risk";
    else if (score <= 45) rating = "Moderate Entry Risk";
    else if (score <= 65) rating = "Elevated Entry Risk";
    else if (score <= 82) rating = "High Entry Risk";
    else                  rating = "Very High Entry Risk";

    return { score, buckets, confidence, rating };
  };

  const qualityA = getBusinessQuality(fundsA);
  const qualityB = getBusinessQuality(fundsB);
  const riskA    = getEntryRisk(tickerA, fundsA, priceMetricsA, result.maxDrawdownA, qualityA);
  const riskB    = getEntryRisk(tickerB, fundsB, priceMetricsB, result.maxDrawdownB, qualityB);

  // ─── Build data-driven verdict text ──────────────────────────────────────────
  const buildVerdictText = () => {
    const lines = [];
    for (const [ticker, risk, qual] of [[tickerA, riskA, qualityA], [tickerB, riskB, qualityB]]) {
      const topBucket = [...risk.buckets].sort((a, b) => b.weightedPts - a.weightedPts)[0];
      const qualLabel = qual?.label ?? "unknown";
      const riskLabel = risk.rating.toLowerCase();
      lines.push(
        `${ticker} shows ${qualLabel.toLowerCase()} business quality and ${riskLabel}. ` +
        `The primary risk driver is ${topBucket.label.toLowerCase()} (${topBucket.weightedPts} pts / ${topBucket.maxPts} max).`
      );
    }
    return lines.join(" ");
  };

  // ─── Step descriptions ────────────────────────────────────────────────────────
  const getStepDescription = (stepId, ticker) => {
    const isA      = ticker === tickerA;
    const name     = isA ? tickerA : tickerB;
    const cashTotal = isA ? nomTotalA : nomTotalB;
    const priceCash = isA ? priceGrowthCashA : priceGrowthCashB;
    const pricePct  = isA ? pricePctA : pricePctB;
    const fxCash    = isA ? fxImpactCashA : fxImpactCashB;
    const divCash   = isA ? nomDivOnlyA : nomDivOnlyB;
    const divPct    = isA ? divPctA : divPctB;
    switch (stepId) {
      case "start":     return `We start with an initial home currency deposit of ${getSymbol()}${Math.round(initialAmount).toLocaleString()} in ${currency}. For non-local stocks, this is translated to the asset's currency to make the purchase.`;
      case "price":     return `${name} price appreciation generated ${getSymbol()}${Math.round(priceCash).toLocaleString()} (+${pricePct.toFixed(1)}% in asset base value), representing the core commercial engine of your returns.`;
      case "fx":        return isA ? (isHomeA ? "Since the asset is in your home currency, there is no foreign exchange translation effect on your portfolio." : `The exchange rate shifts added ${getSymbol()}${Math.round(fxCash).toLocaleString()} (${fxPctA >= 0 ? "+" : ""}${fxPctA.toFixed(1)}% currency return shift) to your pocket upon selling.`) : (isHomeB ? "Since the asset is in your home currency, there is no foreign exchange translation effect on your portfolio." : `The exchange rate shifts added ${getSymbol()}${Math.round(fxCash).toLocaleString()} (${fxPctB >= 0 ? "+" : ""}${fxPctB.toFixed(1)}% currency return shift) to your pocket upon selling.`);
      case "dividends": return `Automatic reinvestment of dividends into fractional shares added an extra ${getSymbol()}${Math.round(divCash).toLocaleString()} (+${divPct.toFixed(1)}% compounded multiplier boost) to ${name}'s ending value.`;
      case "result":    return `The final realized payout in your home wallet. ${name} converted back to a final capital sum of ${getSymbol()}${Math.round(cashTotal).toLocaleString()} in ${currency}.`;
      default:          return "";
    }
  };

  // ─── Journey track renderer ───────────────────────────────────────────────────
  const renderTrack = (ticker, isWinner, totalVal, priceCash, pricePct, fxCash, divCash, divPct, colorClass, borderClass, bgLightClass, isHome, assetCurrency, fxPct) => (
    <div className={`p-6 rounded-2xl border ${isWinner ? "border-brand-primary/20 bg-indigo-50/20" : "border-slate-100 bg-slate-50/20"} relative`}>
      {isWinner && (
        <span className="absolute -top-3 right-6 bg-brand-primary text-white text-[9px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm animate-pulse">
          🏆 Winner (+{getSymbol()}{Math.round(gap).toLocaleString()} Gap)
        </span>
      )}
      <div className="flex items-center gap-3 border-b border-slate-100 pb-3 mb-6">
        <span className={`h-3 w-3 rounded ${isWinner ? "bg-brand-primary" : "bg-brand-accent"}`} />
        <h4 className="font-mono font-bold text-slate-800 text-sm">{ticker} Journey Track</h4>
      </div>
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4 lg:gap-2">
        <div onMouseEnter={() => setActiveStep({ id: "start", ticker })} onMouseLeave={() => setActiveStep(null)} className="w-full lg:w-[17%] p-4 rounded-xl border border-slate-200 bg-slate-50 hover:scale-[1.03] hover:shadow-sm transition-all duration-200 cursor-pointer">
          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block font-mono">1. Origin</span>
          <strong className="text-sm font-extrabold text-slate-800 block font-mono mt-0.5">{getSymbol()}{Math.round(initialAmount).toLocaleString()}</strong>
          <span className="text-[9px] text-slate-400 block mt-0.5">{currency} Wallet</span>
        </div>
        <div className="flex flex-col items-center justify-center shrink-0"><span className="text-[8px] font-mono font-bold text-slate-400 uppercase">Buy {assetCurrency}</span><span className="text-slate-300 font-bold text-xl leading-none">➔</span></div>
        <div onMouseEnter={() => setActiveStep({ id: "price", ticker })} onMouseLeave={() => setActiveStep(null)} className={`w-full lg:w-[18%] p-4 rounded-xl border ${borderClass} ${bgLightClass} hover:scale-[1.03] hover:shadow-sm transition-all duration-200 cursor-pointer`}>
          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block font-mono">2. Price Action</span>
          <strong className={`text-sm font-extrabold ${colorClass} block font-mono mt-0.5`}>+{getSymbol()}{Math.round(priceCash).toLocaleString()}</strong>
          <span className="text-[9px] text-slate-400 block mt-0.5 font-bold">+{pricePct.toFixed(1)}% Growth</span>
        </div>
        <div className="flex flex-col items-center justify-center shrink-0"><span className="text-[8px] font-mono font-bold text-slate-400 uppercase">FX Layer</span><span className="text-slate-300 font-bold text-xl leading-none">➔</span></div>
        <div onMouseEnter={() => setActiveStep({ id: "fx", ticker })} onMouseLeave={() => setActiveStep(null)} className={`w-full lg:w-[18%] p-4 rounded-xl border ${isHome ? "border-slate-200 bg-slate-50" : "border-violet-100 bg-violet-50/40"} hover:scale-[1.03] hover:shadow-sm transition-all duration-200 cursor-pointer`}>
          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block font-mono">3. FX Reality</span>
          <strong className={`text-sm font-extrabold ${isHome ? "text-slate-700" : "text-violet-900"} block font-mono mt-0.5`}>{isHome ? "—" : `${fxCash >= 0 ? "+" : ""}${getSymbol()}${Math.round(fxCash).toLocaleString()}`}</strong>
          <span className="text-[9px] text-slate-400 block mt-0.5 font-bold">{isHome ? "No FX Shift" : `${fxPct >= 0 ? "+" : ""}${fxPct.toFixed(1)}% FX Rate`}</span>
        </div>
        <div className="flex flex-col items-center justify-center shrink-0"><span className="text-[8px] font-mono font-bold text-slate-400 uppercase">Reinvest</span><span className="text-slate-300 font-bold text-xl leading-none">➔</span></div>
        <div onMouseEnter={() => setActiveStep({ id: "dividends", ticker })} onMouseLeave={() => setActiveStep(null)} className="w-full lg:w-[18%] p-4 rounded-xl border border-emerald-100 bg-emerald-50/40 hover:scale-[1.03] hover:shadow-sm transition-all duration-200 cursor-pointer">
          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block font-mono">4. Dividends</span>
          <strong className="text-sm font-extrabold text-emerald-800 block font-mono mt-0.5">+{getSymbol()}{Math.round(divCash).toLocaleString()}</strong>
          <span className="text-[9px] text-emerald-600 block mt-0.5 font-bold">+{divPct.toFixed(1)}% Compound</span>
        </div>
        <div className="flex flex-col items-center justify-center shrink-0"><span className="text-[8px] font-mono font-bold text-slate-400 uppercase">Cash out</span><span className="text-slate-300 font-bold text-xl leading-none">➔</span></div>
        <div onMouseEnter={() => setActiveStep({ id: "result", ticker })} onMouseLeave={() => setActiveStep(null)} className={`w-full lg:w-[17%] p-4 rounded-xl border-2 ${isWinner ? "border-brand-primary bg-slate-900 text-white" : "border-slate-800 bg-slate-800 text-slate-200"} hover:scale-[1.03] hover:shadow-sm transition-all duration-200 cursor-pointer`}>
          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider block font-mono">5. Real Return</span>
          <strong className="text-md font-extrabold block font-mono mt-0.5">{getSymbol()}{Math.round(totalVal).toLocaleString()}</strong>
          <span className="text-[9px] text-slate-400 block mt-0.5">Realized Payout</span>
        </div>
      </div>
    </div>
  );

  // ─── Colour helpers ───────────────────────────────────────────────────────────
  const getRiskBadgeColor = (rating) => {
    if (rating === "Very High Entry Risk") return "bg-rose-100 text-rose-800 border-rose-200/50";
    if (rating === "High Entry Risk")      return "bg-orange-100 text-orange-800 border-orange-200/50";
    if (rating === "Elevated Entry Risk")  return "bg-amber-100 text-amber-900 border-amber-200/50";
    if (rating === "Moderate Entry Risk")  return "bg-blue-100 text-blue-800 border-blue-200/50";
    return "bg-emerald-100 text-emerald-800 border-emerald-200/50";
  };
  const getConfidenceColor = (c) => {
    if (c === "High")   return "bg-blue-50 text-blue-700";
    if (c === "Medium") return "bg-slate-100 text-slate-600";
    return "bg-amber-50 text-amber-700";
  };
  const getQualityBadgeColor = (color) => {
    if (color === "emerald") return "bg-emerald-50 text-emerald-700 border-emerald-200/60";
    if (color === "blue")    return "bg-blue-50 text-blue-700 border-blue-200/60";
    if (color === "rose")    return "bg-rose-50 text-rose-700 border-rose-200/60";
    return "bg-slate-100 text-slate-600 border-slate-200/60";
  };
  const getBucketBarColor = (raw) => {
    if (raw >= 71) return "bg-rose-400";
    if (raw >= 51) return "bg-amber-400";
    if (raw >= 31) return "bg-sky-400";
    return "bg-emerald-400";
  };
  const getBucketPtsColor = (raw) => {
    if (raw >= 71) return "text-rose-600";
    if (raw >= 51) return "text-amber-600";
    if (raw >= 31) return "text-sky-600";
    return "text-emerald-600";
  };

  // ─── Risk card renderer ───────────────────────────────────────────────────────
  const renderRiskCard = (ticker, risk, quality, dotColor) => (
    <div className="bg-white border border-slate-150 rounded-2xl p-5 shadow-sm space-y-4">

      {/* Header row */}
      <div className="flex items-center justify-between pb-2.5 border-b border-dashed border-slate-100">
        <span className="font-extrabold font-mono text-sm text-slate-800 flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${dotColor}`} />
          {ticker} Entry Risk Signal
        </span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getRiskBadgeColor(risk.rating)}`}>
          {risk.rating}
        </span>
      </div>

      {/* Three-column summary: Score | Quality | Confidence */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-slate-50/70 rounded-xl p-2.5 border border-slate-100/70">
          <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">Entry Risk</span>
          <span className="text-lg font-extrabold text-slate-800 font-mono leading-tight">
            {risk.score}<span className="text-[10px] text-slate-400 font-normal"> / 100</span>
          </span>
        </div>
        <div className="bg-slate-50/70 rounded-xl p-2.5 border border-slate-100/70">
          <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">Biz Quality</span>
          <span className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded border inline-block mt-0.5 ${getQualityBadgeColor(quality?.color)}`}>
            {quality?.label ?? "N/A"}
          </span>
        </div>
        <div className="bg-slate-50/70 rounded-xl p-2.5 border border-slate-100/70">
          <span className="text-[9px] text-slate-400 block font-bold uppercase tracking-wider">Confidence</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono inline-block mt-0.5 ${getConfidenceColor(risk.confidence)}`}>
            {risk.confidence}
          </span>
        </div>
      </div>

      {/* Bucket breakdown */}
      <div className="space-y-3">
        <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">Entry Risk Breakdown</span>
        {risk.buckets.map((b, i) => (
          <div key={i} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-700">{b.label}</span>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-mono text-slate-400">{Math.round(b.weight * 100)}%</span>
                <span className={`text-[10px] font-extrabold font-mono ${getBucketPtsColor(b.raw)}`}>
                  {b.weightedPts} / {b.maxPts}
                </span>
              </div>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${getBucketBarColor(b.raw)}`}
                style={{ width: `${b.raw}%` }}
              />
            </div>
            <p className="text-[9.5px] text-slate-500 leading-snug">{b.desc}</p>
          </div>
        ))}

        {/* Σ total */}
        <div className="flex items-center justify-between pt-2.5 border-t border-dashed border-slate-200">
          <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider">Σ Total Entry Risk</span>
          <span className="text-[12px] font-extrabold font-mono text-slate-800">{risk.score} / 100</span>
        </div>
      </div>
    </div>
  );

  // ─── Main render ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8 animate-fadeIn text-left pt-6 border-t border-slate-100">

      {/* Section title */}
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-brand-primary font-mono">
          Final Chapter / The Realized Outcome Map
        </span>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-2">
          Milestone Summary: How the Winner Won
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Follow the horizontal conversion pipelines side-by-side. Hover over any step to reveal its localized impact.
        </p>
      </div>

      <div className="bg-white border border-glass-border rounded-3xl p-6 shadow-premium space-y-6">
        {renderTrack(tickerA, winner === tickerA, nomTotalA, priceGrowthCashA, pricePctA, fxImpactCashA, nomDivOnlyA, divPctA, "text-blue-600",   "border-blue-100",   "bg-blue-50/40", isHomeA, assetCurrencyA, fxPctA)}
        {renderTrack(tickerB, winner === tickerB, nomTotalB, priceGrowthCashB, pricePctB, fxImpactCashB, nomDivOnlyB, divPctB, "text-purple-600", "border-purple-100", "bg-purple-50/40", isHomeB, assetCurrencyB, fxPctB)}

        {/* Hover description box */}
        <div className="p-5 bg-slate-50 border border-slate-100 rounded-xl min-h-[90px] transition-all duration-300">
          {activeStep ? (
            <div className="animate-fadeIn">
              <span className="text-xs font-bold text-brand-primary uppercase font-mono block">{activeStep.ticker} Step Detail</span>
              <p className="text-xs text-slate-600 mt-1.5 leading-relaxed font-mono">{getStepDescription(activeStep.id, activeStep.ticker)}</p>
            </div>
          ) : (
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase font-mono block">Interactive Journey Explorer</span>
              <p className="text-sm font-semibold text-slate-700 mt-1">Which factor was the real return driver?</p>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">Hover over any stage above to explore how price growth, FX shifts, and dividend compounding combined to build each asset's realized outcome.</p>
            </div>
          )}
        </div>
      </div>

      {/* Verdict panel */}
      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-indigo-500/10 blur-2xl -z-10" />
        <span className="text-[10px] font-extrabold text-brand-primary uppercase font-mono tracking-wider">Story Verdict</span>
        <h4 className="text-lg font-bold text-slate-900 mt-1">{winner} Wins the Investment Duel</h4>
        <p className="text-xs text-brand-primary/80 mt-2 leading-relaxed">
          From a starting capital of <strong>{getSymbol()}{Math.round(initialAmount).toLocaleString()}</strong>, {winner} compounded your funds into a final realised sum of <strong>{getSymbol()}{Math.round(winnerTotal).toLocaleString()}</strong>, outcompeting the alternative by <strong>{getSymbol()}{Math.round(gap).toLocaleString()}</strong>.
        </p>
      </div>

      {/* ── Current Entry Risk Signal — temporarily hidden, preserved for re-enable ──
      <div className="space-y-5">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 font-mono">
            Forward Outlook
          </span>
          <h3 className="text-lg font-extrabold text-slate-900 tracking-tight mt-1.5">Current Entry Risk Signal</h3>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
            Two separate signals per stock: <strong>Business Quality</strong> (how strong is the company?) and <strong>Entry Risk Score</strong> (how risky is it to enter at today's price?). A great business can still carry high entry risk if valuation and momentum are stretched.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-[10px] font-mono font-bold">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />Low risk</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-sky-400 inline-block" />Moderate</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Elevated</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400 inline-block" />High risk</span>
        </div>

        {loadingFunds ? (
          <div className="bg-slate-50 rounded-2xl p-8 text-center animate-pulse">
            <div className="text-xs text-slate-400 font-medium">Computing entry risk from fundamentals and price history…</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderRiskCard(tickerA, riskA, qualityA, "bg-blue-500")}
            {renderRiskCard(tickerB, riskB, qualityB, "bg-violet-500")}
          </div>
        )}

        <div className="bg-slate-800 rounded-2xl p-5 space-y-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block">How to Read This</span>
          <p className="text-xs text-slate-300 leading-relaxed">
            <strong className="text-white">Great businesses can still be risky entries.</strong> This score does not judge whether the company is good — Business Quality does that separately. Entry Risk judges whether <em>today's entry price</em> looks stretched, stable, or supported by fundamentals. Valuation (35%) and momentum overheating (25%) dominate the entry risk score intentionally.
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-[11px] text-slate-500 leading-relaxed">
          <strong>⚠️ Disclaimer:</strong> This is not financial advice or a buy/sell recommendation. It is a data-based entry risk signal derived from public fundamentals and price history. It does not account for macro conditions, qualitative factors, or individual risk tolerance.
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono block mb-2">Entry Risk Verdict</span>
          <p className="text-xs text-slate-700 leading-relaxed">{buildVerdictText()}</p>
          <p className="text-[10px] text-slate-400 mt-2 italic">
            A historical winner is not always the safer entry today. Entry risk shifts as valuation, momentum, and fundamentals evolve beyond the comparison period.
          </p>
        </div>
      </div>
      ── end hidden section ── */}

    </div>
  );
}
