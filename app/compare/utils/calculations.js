/**
 * Pure utility functions for mathematical calculations inside the investment simulator.
 * Separating these from components makes them easy to test, read, and debug.
 */

// ── Price metrics helper ──────────────────────────────────────────────────────
export function computePriceMetrics(pricesArray) {
  if (!pricesArray || pricesArray.length < 50) return null;
  const sorted = [...pricesArray].sort((a, b) => new Date(a.date) - new Date(b.date));
  const n  = sorted.length;
  const gc = (p) => +(p.adj_close ?? p.close);

  const currentPrice  = gc(sorted[n - 1]);
  const idx1yr        = Math.max(0, n - 253);
  const price1YrAgo   = gc(sorted[idx1yr]);
  const oneYearReturn = (currentPrice - price1YrAgo) / price1YrAgo;

  const last252 = sorted.slice(Math.max(0, n - 252));
  const high52w = Math.max(...last252.map(gc));
  const last200 = sorted.slice(Math.max(0, n - 200));
  const ma200   = last200.reduce((s, p) => s + gc(p), 0) / last200.length;

  const closes  = last252.map(gc);
  const logRets = [];
  for (let i = 1; i < closes.length; i++)
    if (closes[i] > 0 && closes[i - 1] > 0)
      logRets.push(Math.log(closes[i] / closes[i - 1]));
  
  const meanLR  = logRets.reduce((s, r) => s + r, 0) / logRets.length;
  const variance = logRets.reduce((s, r) => s + (r - meanLR) ** 2, 0) / logRets.length;
  const annualizedVol = Math.sqrt(variance * 252) * 100;

  return { currentPrice, price1YrAgo, oneYearReturn, high52w, ma200, annualizedVol, sorted };
}


// ── Business Quality Signal (separate from entry risk) ────────────────────────
export function getBusinessQuality(funds) {
  if (!funds?.annual) return { label: "Insufficient Data", color: "slate", desc: "Not enough fundamental data to assess business quality." };

  const inc = funds.annual.income_statement || [];
  const cf  = funds.annual.cash_flow       || [];
  const co  = funds.company || {};

  let score = 0;
  const signals = [];

  // Revenue CAGR (last 3 years)
  const incWithRev = inc.filter(p => p.values.total_revenue > 0);
  if (incWithRev.length >= 3) {
    const r0 = incWithRev[0].values.total_revenue;
    const r2 = incWithRev[Math.min(2, incWithRev.length - 1)].values.total_revenue;
    const revCAGR = ((r0 / r2) ** 0.5 - 1) * 100;
    if (revCAGR > 15)      { score += 3; signals.push(`Revenue CAGR +${revCAGR.toFixed(1)}%`); }
    else if (revCAGR > 5)  { score += 1; signals.push(`Revenue CAGR +${revCAGR.toFixed(1)}%`); }
    else if (revCAGR > 0)  { score += 0; signals.push(`Revenue flat (+${revCAGR.toFixed(1)}%)`); }
    else                   { score -= 2; signals.push(`Revenue declining (${revCAGR.toFixed(1)}%)`); }
  }

  // Net income CAGR
  const incWithNI = inc.filter(p => p.values.net_income !== undefined);
  if (incWithNI.length >= 3) {
    const ni0 = incWithNI[0].values.net_income;
    const ni2 = incWithNI[Math.min(2, incWithNI.length - 1)].values.net_income;
    if (ni0 < 0) {
      score -= 3; signals.push("Net income negative");
    } else if (ni2 > 0) {
      const niCAGR = ((ni0 / ni2) ** 0.5 - 1) * 100;
      if (niCAGR > 15)      { score += 2; signals.push(`Earnings CAGR +${niCAGR.toFixed(1)}%`); }
      else if (niCAGR > 3)  { score += 1; signals.push(`Earnings +${niCAGR.toFixed(1)}%`); }
      else if (niCAGR < -5) { score -= 2; signals.push(`Earnings declining (${niCAGR.toFixed(1)}%)`); }
    }
  }

  // FCF consistency (last 4 years)
  const cfVals = cf.slice(0, 4).map(p => p.values.free_cash_flow).filter(v => v !== undefined);
  if (cfVals.length >= 3) {
    if (cfVals.every(v => v > 0))     { score += 2; signals.push("Consistent positive FCF"); }
    else if (cfVals.some(v => v < 0)) { score -= 1; signals.push("FCF inconsistent"); }
  }

  // Operating margin level (latest year)
  const lat = inc[0]?.values;
  if (lat?.operating_income && lat?.total_revenue) {
    const opM = (lat.operating_income / lat.total_revenue) * 100;
    if (opM > 25)      { score += 2; signals.push(`Op. margin ${opM.toFixed(1)}%`); }
    else if (opM > 10) { score += 1; signals.push(`Op. margin ${opM.toFixed(1)}%`); }
    else if (opM < 0)  { score -= 2; signals.push("Negative operating margin"); }
  }

  // Profit margin from company snapshot
  if (co.profitMargins > 0.20)     score += 1;
  else if (co.profitMargins < 0)   score -= 1;

  let label, color, desc;
  if (score >= 8)      { label = "Very Strong"; color = "emerald"; desc = "Exceptional revenue and earnings growth, high margins, and consistent cash generation."; }
  else if (score >= 4) { label = "Strong";      color = "blue";    desc = "Solid fundamentals with healthy growth trajectory and reliable cash flows."; }
  else if (score >= 1) { label = "Stable";      color = "slate";   desc = "Business is operating steadily with no major red flags, but limited growth momentum."; }
  else                 { label = "Weak";         color = "rose";    desc = "Deteriorating fundamentals — declining revenues, earnings, or persistent cash burn."; }

  return { label, color, score, signals, desc };
}


// ── Timeline calculation helper ────────────────────────────────────────────────
export function getRateForDate(dateStr, assetCurrency, rates, homeCurrency) {
  if (assetCurrency === homeCurrency || !rates.length) return 1.0;
  const match = rates.find(r => r.date >= dateStr);
  return match ? match.rate : 1.0;
}

export function calculateTimelineMetrics({
  filteredA,
  filteredB,
  fxRatesA,
  fxRatesB,
  currencyA,
  currencyB,
  currency, // user's selected home currency
  startRateA,
  startRateB,
  initialA, // initial native capital for A
  initialB, // initial native capital for B
}) {
  const timeline = [];
  
  let maxDrawA = 0;
  let maxDrawB = 0;
  let peakA = 0;
  let peakB = 0;

  const startRowA = filteredA[0];
  const startRowB = filteredB[0];

  for (let i = 0; i < filteredA.length; i++) {
    const rowA = filteredA[i];
    const dateStr = rowA.date;
    const rowB = getPriceForDate(filteredB, dateStr) || startRowB;

    const currentRateA = getRateForDate(dateStr, currencyA, fxRatesA, currency);
    const currentRateB = getRateForDate(dateStr, currencyB, fxRatesB, currency);

    // native wealth
    const wealthAAsset = (initialA * rowA.adj_close) / startRowA.adj_close;
    const wealthBAsset = (initialB * rowB.adj_close) / startRowB.adj_close;
    const priceWealthAAsset = (initialA * rowA.close) / startRowA.close;
    const priceWealthBAsset = (initialB * rowB.close) / startRowB.close;

    // home currency wealth
    const wealthA = wealthAAsset * currentRateA;
    const wealthB = wealthBAsset * currentRateB;
    const priceWealthA = priceWealthAAsset * currentRateA;
    const priceWealthB = priceWealthBAsset * currentRateB;

    if (wealthA > peakA) peakA = wealthA;
    if (wealthB > peakB) peakB = wealthB;

    const ddA = ((peakA - wealthA) / peakA) * 100;
    const ddB = ((peakB - wealthB) / peakB) * 100;

    if (ddA > maxDrawA) maxDrawA = ddA;
    if (ddB > maxDrawB) maxDrawB = ddB;

    timeline.push({
      date: dateStr,
      wealthA,
      wealthB,
      priceWealthA,
      priceWealthB
    });
  }

  return { timeline, maxDrawA, maxDrawB };
}


// ── Return decomposition helper ───────────────────────────────────────────────
export function decomposeInvestmentReturn({
  finalTotal,       // Final home currency wealth
  finalPriceWealth, // Final home currency price wealth
  initialAmount,    // Initial home currency amount
  startRate,        // Start exchange rate (Home per Native)
  endRate,          // End exchange rate (Home per Native)
  isHome            // Boolean, true if asset is natively priced in home currency
}) {
  // Convert final home-currency totals to native-currency totals
  const assetPriceTotal = finalPriceWealth / endRate;
  const assetDivTotal   = (finalTotal - finalPriceWealth) / endRate;
  const assetTotal      = finalTotal / endRate;
  const nativeStart     = initialAmount / startRate;

  // Price Growth (in home currency, assuming FX remained constant)
  const priceGrowth = (assetPriceTotal * startRate) - initialAmount;

  // Dividend Boost (in home currency, assuming FX remained constant)
  const divBoost = assetDivTotal * startRate;

  // FX Effect
  const fxEffect = isHome ? 0 : assetTotal * (endRate - startRate);
  const fxRatePct = isHome ? 0 : ((endRate - startRate) / startRate) * 100;

  return {
    assetPriceTotal,
    assetDivTotal,
    assetTotal,
    nativeStart,
    priceGrowth,
    divBoost,
    fxEffect,
    fxRatePct
  };
}

// ── Valuation & Fundamental Parsing ───────────────────────────────────────────
export function getPriceForDate(prices, dateStr) {
  if (!prices || prices.length === 0 || !dateStr) return null;
  let closest = null;
  let minDiff = Infinity;
  
  const safeDateStr = dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00Z`;
  const targetTime = new Date(safeDateStr).getTime();
  
  if (isNaN(targetTime)) return null;

  for (const p of prices) {
    if (!p.date) continue;
    const pSafe = p.date.includes('T') ? p.date : `${p.date}T00:00:00Z`;
    const pTime = new Date(pSafe).getTime();
    if (isNaN(pTime)) continue;
    
    const diff = Math.abs(pTime - targetTime);
    if (diff < minDiff) {
      minDiff = diff;
      closest = p;
    }
  }
  return closest;
}

export function parseValuation(data, prices) {
  if (!data || !data.annual) return [];
  const inc = data.annual.income_statement || [];
  const cf = data.annual.cash_flow || [];
  const sharesOutstanding = data.company?.sharesOutstanding || 1e9;

  return inc.map(item => {
    const year = new Date(item.period_end).getFullYear();
    const priceRow = getPriceForDate(prices, item.period_end);
    const priceVal = priceRow ? priceRow.close : 1.0;

    const revenue = item.values.total_revenue || item.values.operating_revenue || 0;
    const netIncome = item.values.net_income || 0;
    const eps = item.values.diluted_eps || item.values.basic_eps || (netIncome && sharesOutstanding ? netIncome / sharesOutstanding : null);

    const cfRow = cf.find(c => new Date(c.period_end).getFullYear() === year);
    const fcf = cfRow?.values?.free_cash_flow || cfRow?.values?.operating_cash_flow || 0;

    const pe = (eps && eps > 0) ? (priceVal / eps) : null;
    const ps = (revenue > 0) ? (priceVal / (revenue / sharesOutstanding)) : null;
    const pfcf = (fcf > 0) ? (priceVal / (fcf / sharesOutstanding)) : null;

    return {
      year,
      date: item.period_end,
      eps,
      revenue,
      netIncome,
      fcf,
      price: priceVal,
      pe,
      ps,
      pfcf
    };
  }).sort((a, b) => a.year - b.year);
}

export function computeAttributionBridge(latestRow, startRow, initialAmount, finalWealth, finalPrice, startPriceNative, endPriceNative) {
  const startCap = initialAmount || 10000;
  const epsGrow = startRow.eps && latestRow.eps ? (latestRow.eps - startRow.eps) / startRow.eps : 0;
  
  const startPE = startPriceNative && startRow.eps > 0 ? (startPriceNative / startRow.eps) : startRow.pe;
  const endPE = endPriceNative && latestRow.eps > 0 ? (endPriceNative / latestRow.eps) : latestRow.pe;
  const peGrow = startPE && endPE ? (endPE - startPE) / startPE : 0;
  
  // 1. EPS Contribution
  const wealthEps = startCap * (1 + epsGrow);
  const epsContrib = wealthEps - startCap;

  // 2. Valuation (P/E) Contribution
  const multContrib = wealthEps * peGrow;

  // 3. Timing & FX
  const expectedPriceWealth = startCap + epsContrib + multContrib;
  const timingAndFxContrib = finalPrice - expectedPriceWealth;

  const divContrib = finalWealth - finalPrice;

  return {
    start: startCap,
    eps: epsContrib,
    multiple: multContrib,
    timing: timingAndFxContrib,
    dividends: divContrib,
    final: finalWealth,
    startPE,
    endPE
  };
}

// ── Intrinsic Valuation: FCF DCF with WACC ───────────────────────────────────
const DCF_DEFAULTS = {
  risk_free_rate: 0.045,
  equity_risk_premium: 0.05,
  terminal_growth_rate: 0.025,
  forecast_years: 5,
  conservative_growth: 0.05,
  base_growth: 0.10,
  optimistic_growth: 0.15,
};

const FINANCIAL_SECTOR_TERMS = [
  "financial",
  "bank",
  "insurance",
  "capital markets",
  "credit",
  "mortgage",
  "asset management",
  "broker",
];

function numeric(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function latestPrice(prices) {
  if (!prices?.length) return null;
  const row = [...prices].sort((a, b) => String(a.date).localeCompare(String(b.date))).at(-1);
  return numeric(row?.close ?? row?.adj_close);
}

function latestByYear(rows = []) {
  return [...rows].sort((a, b) => new Date(b.period_end) - new Date(a.period_end));
}

function isFinancialCompany(company = {}) {
  const text = `${company.sector || ""} ${company.industry || ""}`.toLowerCase();
  return FINANCIAL_SECTOR_TERMS.some((term) => text.includes(term));
}

function isSupportedUsOperatingCompany(company = {}) {
  const exchange = String(company.exchange || "").toUpperCase();
  const quoteType = String(company.quoteType || "").toUpperCase();
  return quoteType === "EQUITY" && ["NMS", "NYQ", "NGM", "NCM", "ASE"].includes(exchange);
}

function statementValue(row, keys) {
  for (const key of keys) {
    const value = numeric(row?.values?.[key]);
    if (value !== null) return value;
  }
  return null;
}

function computeFcfFromCashFlow(row) {
  const directFcf = statementValue(row, ["free_cash_flow"]);
  if (directFcf !== null) return directFcf;

  const operatingCashFlow = statementValue(row, ["operating_cash_flow"]);
  const capex = statementValue(row, ["capital_expenditure"]);
  if (operatingCashFlow === null || capex === null) return null;

  return operatingCashFlow - Math.abs(capex);
}

function valuationLabel(upsidePercent) {
  if (upsidePercent > 15) return "undervalued";
  if (upsidePercent < -15) return "overvalued";
  return "fairly valued";
}

function historicalFcfCagr(cashFlowRows = []) {
  const rows = latestByYear(cashFlowRows)
    .map((row) => ({ year: new Date(row.period_end).getFullYear(), fcf: computeFcfFromCashFlow(row) }))
    .filter((row) => row.fcf !== null && row.fcf > 0)
    .sort((a, b) => a.year - b.year);

  if (rows.length < 3) return null;

  const first = rows[0];
  const last = rows.at(-1);
  const years = Math.max(1, last.year - first.year);
  const cagr = Math.pow(last.fcf / first.fcf, 1 / years) - 1;

  if (!Number.isFinite(cagr) || cagr < -0.10 || cagr > 0.30) return null;
  return clamp(cagr, 0.02, 0.20);
}

function revenueCagr(incomeRows = []) {
  const rows = latestByYear(incomeRows)
    .map((row) => ({
      year: new Date(row.period_end).getFullYear(),
      revenue: statementValue(row, ["total_revenue", "operating_revenue"]),
    }))
    .filter((row) => row.revenue !== null && row.revenue > 0)
    .sort((a, b) => a.year - b.year);

  if (rows.length < 3) return null;

  const first = rows[0];
  const last = rows.at(-1);
  const years = Math.max(1, last.year - first.year);
  const cagr = Math.pow(last.revenue / first.revenue, 1 / years) - 1;
  return Number.isFinite(cagr) ? clamp(cagr, 0.03, 0.18) : null;
}

function scenarioGrowthRates(fundamentals, warnings) {
  const fcfGrowth = historicalFcfCagr(fundamentals?.annual?.cash_flow || []);
  const revGrowth = revenueCagr(fundamentals?.annual?.income_statement || []);
  const base = fcfGrowth ?? revGrowth ?? DCF_DEFAULTS.base_growth;

  if (fcfGrowth === null && revGrowth !== null) {
    warnings.push("FCF history is unstable or limited, so revenue growth is used as the base case.");
  } else if (fcfGrowth === null) {
    warnings.push("FCF growth history is unstable or missing, so fallback growth assumptions are used.");
  }

  return {
    conservative: clamp(Math.min(base * 0.6, DCF_DEFAULTS.conservative_growth), 0.02, 0.10),
    base: clamp(base, 0.03, 0.18),
    optimistic: clamp(Math.max(base * 1.4, DCF_DEFAULTS.optimistic_growth), 0.06, 0.22),
  };
}

function buildScenario({ latestFcf, growthRate, wacc, terminalGrowthRate, forecastYears, totalDebt, cash, sharesOutstanding, currentPrice }) {
  const forecast_fcfs = Array.from({ length: forecastYears }, (_, idx) => {
    const year = idx + 1;
    const fcf = latestFcf * Math.pow(1 + growthRate, year);
    return {
      year,
      fcf,
      pv: fcf / Math.pow(1 + wacc, year),
    };
  });

  const finalYearFcf = forecast_fcfs.at(-1).fcf;
  const terminalValue = finalYearFcf * (1 + terminalGrowthRate) / (wacc - terminalGrowthRate);
  const pvTerminalValue = terminalValue / Math.pow(1 + wacc, forecastYears);
  const enterpriseValue = forecast_fcfs.reduce((sum, row) => sum + row.pv, 0) + pvTerminalValue;
  const equityValue = enterpriseValue - totalDebt + cash;
  const fairValuePerShare = equityValue / sharesOutstanding;
  const upsidePercent = (fairValuePerShare / currentPrice - 1) * 100;

  return {
    growth_rate: growthRate,
    forecast_fcfs,
    terminal_value: terminalValue,
    enterprise_value: enterpriseValue,
    equity_value: equityValue,
    fair_value_per_share: fairValuePerShare,
    upside_percent: upsidePercent,
    label: valuationLabel(upsidePercent),
  };
}

export function buildDcfValuation(ticker, fundamentals, prices, assumptions = {}) {
  const config = { ...DCF_DEFAULTS, ...assumptions };
  const terminalGrowthRate = clamp(config.terminal_growth_rate, 0.015, 0.035);
  const warnings = [];
  const company = fundamentals?.company || {};

  const unsupported = (message) => ({
    ticker,
    valuation_supported: false,
    method: "FCF_DCF_WACC",
    message,
    inputs: {},
    scenarios: {},
    warnings,
  });

  if (!fundamentals?.annual) {
    return unsupported("DCF valuation needs company fundamentals and cash flow data.");
  }

  if (isFinancialCompany(company)) {
    return unsupported("DCF valuation is not available for financial companies yet. A book-value/ROE model will be added later.");
  }

  if (!isSupportedUsOperatingCompany(company)) {
    return unsupported("DCF valuation is currently available for normal operating companies in S&P 500 and Nasdaq-style US equity data.");
  }

  const incomeRows = latestByYear(fundamentals.annual.income_statement || []);
  const balanceRows = latestByYear(fundamentals.annual.balance_sheet || []);
  const cashFlowRows = latestByYear(fundamentals.annual.cash_flow || []);
  const latestIncome = incomeRows[0];
  const latestBalance = balanceRows[0];
  const latestCashFlow = cashFlowRows[0];

  const latestFcf = computeFcfFromCashFlow(latestCashFlow);
  if (latestFcf === null) {
    return unsupported("DCF valuation needs operating cash flow and capital expenditure data.");
  }

  if (latestFcf <= 0) {
    return unsupported("DCF is unreliable because free cash flow is negative.");
  }

  const marketCap = numeric(company.marketCap);
  const currentPrice = numeric(company.currentPrice) ?? latestPrice(prices);
  const sharesOutstanding = numeric(company.sharesOutstanding) ?? statementValue(latestIncome, ["basic_average_shares", "diluted_average_shares"]);
  const revenue = statementValue(latestIncome, ["total_revenue", "operating_revenue"]) ?? numeric(company.totalRevenue);
  const cash = statementValue(latestBalance, ["cash_and_cash_equivalents", "cash_cash_equivalents_and_short_term_investments"]) ?? numeric(company.totalCash) ?? 0;
  let totalDebt = statementValue(latestBalance, ["total_debt", "long_term_debt", "current_debt"]) ?? numeric(company.totalDebt);
  let beta = numeric(company.beta);

  if (totalDebt === null) {
    totalDebt = 0;
    warnings.push("Total debt is missing, so debt is treated as 0.");
  }

  if (beta === null || beta <= 0) {
    beta = 1.0;
    warnings.push("Beta is missing, so beta = 1.0 is used.");
  }

  if (!marketCap || !currentPrice || !sharesOutstanding) {
    return unsupported("DCF valuation needs market capitalization, current price, and shares outstanding.");
  }

  const pretaxIncome = statementValue(latestIncome, ["pretax_income"]);
  const taxProvision = statementValue(latestIncome, ["tax_provision"]);
  let taxRate = pretaxIncome && pretaxIncome > 0 && taxProvision !== null ? taxProvision / pretaxIncome : null;
  if (taxRate === null || !Number.isFinite(taxRate) || taxRate < 0) {
    taxRate = 0.21;
    warnings.push("Tax rate is missing or invalid, so a 21% US tax rate is used.");
  }
  taxRate = clamp(taxRate, 0, 0.35);

  const interestExpense = Math.abs(statementValue(latestIncome, ["interest_expense", "interest_expense_non_operating"]) ?? 0);
  let costOfDebt = totalDebt > 0 && interestExpense > 0 ? interestExpense / totalDebt : null;
  if (costOfDebt === null || !Number.isFinite(costOfDebt)) {
    costOfDebt = config.risk_free_rate + 0.02;
    warnings.push("Interest expense is missing, so cost of debt uses risk-free rate plus 2%.");
  }
  costOfDebt = clamp(costOfDebt, 0, 0.15);

  const costOfEquity = config.risk_free_rate + beta * config.equity_risk_premium;
  const capitalBase = marketCap + totalDebt;
  let wacc = capitalBase > 0
    ? (marketCap / capitalBase) * costOfEquity + (totalDebt / capitalBase) * costOfDebt * (1 - taxRate)
    : costOfEquity;
  wacc = clamp(wacc, 0.05, 0.20);

  if (wacc <= terminalGrowthRate) {
    return unsupported("DCF is invalid because terminal growth is greater than or equal to WACC.");
  }

  const growthRates = scenarioGrowthRates(fundamentals, warnings);
  const scenarioInputs = {
    latestFcf,
    wacc,
    terminalGrowthRate,
    forecastYears: config.forecast_years,
    totalDebt,
    cash,
    sharesOutstanding,
    currentPrice,
  };

  return {
    ticker,
    valuation_supported: true,
    method: "FCF_DCF_WACC",
    inputs: {
      latest_fcf: latestFcf,
      fcf_margin: revenue ? latestFcf / revenue : null,
      market_cap: marketCap,
      total_debt: totalDebt,
      cash,
      shares_outstanding: sharesOutstanding,
      current_price: currentPrice,
      beta,
      risk_free_rate: config.risk_free_rate,
      equity_risk_premium: config.equity_risk_premium,
      terminal_growth_rate: terminalGrowthRate,
      forecast_years: config.forecast_years,
      cost_of_equity: costOfEquity,
      cost_of_debt: costOfDebt,
      tax_rate: taxRate,
      wacc,
    },
    scenarios: {
      conservative: buildScenario({ ...scenarioInputs, growthRate: growthRates.conservative }),
      base: buildScenario({ ...scenarioInputs, growthRate: growthRates.base }),
      optimistic: buildScenario({ ...scenarioInputs, growthRate: growthRates.optimistic }),
    },
    warnings,
  };
}

// ── DCA (Dollar Cost Averaging) Timeline Helper ──────────────────────────────
export function calculateDCATimeline({
  filteredPrices,
  fxRates,
  assetCurrency,
  homeCurrency,
  monthlyDeposit,
}) {
  const timeline = [];
  let accumulatedShares = 0;
  let totalInvestedHome = 0;
  let lastMonth = -1;

  for (let i = 0; i < filteredPrices.length; i++) {
    const row = filteredPrices[i];
    const dateStr = row.date;
    const currentPrice = row.adj_close ?? row.close;
    
    // Parse date safely
    const dateObj = new Date(dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00Z`);
    if (isNaN(dateObj.getTime())) continue;
    
    const currentMonth = dateObj.getUTCMonth();
    const currentRate = getRateForDate(dateStr, assetCurrency, fxRates, homeCurrency);

    // If it's a new month, deposit cash and buy shares
    if (currentMonth !== lastMonth) {
      totalInvestedHome += monthlyDeposit;
      const nativeDeposit = monthlyDeposit / currentRate;
      const sharesBought = nativeDeposit / currentPrice;
      accumulatedShares += sharesBought;
      lastMonth = currentMonth;
    }

    const currentNativeWealth = accumulatedShares * currentPrice;
    const currentHomeWealth = currentNativeWealth * currentRate;

    timeline.push({
      date: dateStr,
      totalInvested: totalInvestedHome,
      wealth: currentHomeWealth,
    });
  }

  return { timeline, totalInvested: totalInvestedHome };
}
