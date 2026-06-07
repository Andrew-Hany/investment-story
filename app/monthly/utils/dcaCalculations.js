import { calculateDCATimeline } from "../../compare/utils/calculations";

// Browser-safe date parser to days to prevent Safari and other browser-specific parsing issues
export const parseDateToDays = (dateStr) => {
  if (!dateStr) return 0;
  const parts = dateStr.split('-');
  if (parts.length < 3) return 0;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  return Date.UTC(year, month, day) / (1000 * 60 * 60 * 24);
};

// Calculate IRR (Annualized Internal Rate of Return) for DCA using exact days
export const calculateDcaIrr = (subTimeline, finalWealth) => {
  if (!subTimeline || subTimeline.length <= 1 || finalWealth <= 0) return 0;
  const endDays = parseDateToDays(subTimeline[subTimeline.length - 1].date);
  
  // Find all actual deposit moments and their amounts
  const deposits = [];
  let prevInvested = 0;
  for (let i = 0; i < subTimeline.length; i++) {
    const currentInvested = subTimeline[i].totalInvested;
    const depositAmount = currentInvested - prevInvested;
    if (depositAmount > 0) {
      const depDays = parseDateToDays(subTimeline[i].date);
      const diffYears = Math.max(0, (endDays - depDays) / 365.25);
      deposits.push({ amount: depositAmount, t: diffYears });
    }
    prevInvested = currentInvested;
  }

  if (deposits.length === 0) return 0;

  // Bisection search for the annual rate R
  let low = -0.99; // -99% annual return
  let high = 5.0;  // +500% annual return
  for (let iter = 0; iter < 40; iter++) {
    const R = (low + high) / 2;
    let fv = 0;
    for (const dep of deposits) {
      fv += dep.amount * Math.pow(1 + R, dep.t);
    }
    if (isNaN(fv) || fv < finalWealth) {
      low = R;
    } else {
      high = R;
    }
  }
  return ((low + high) / 2) * 100;
};

export const countMonthlyPrices = (prices) => {
  let count = 0;
  let lastMonthKey = "";
  prices.forEach((price) => {
    const monthKey = price.date.substring(0, 7);
    if (monthKey !== lastMonthKey) {
      count += 1;
      lastMonthKey = monthKey;
    }
  });
  return count;
};

export const predictionRollingYears = (prices) => {
  const monthlyCount = countMonthlyPrices(prices);
  const availableWholeYears = Math.floor((monthlyCount - 1) / 12);
  return availableWholeYears >= 1 ? availableWholeYears : null;
};

export const recentFxAnnualRate = (fxRates, maxYears = 10) => {
  if (!fxRates || fxRates.length < 2) return 0;

  const sortedRates = [...fxRates].sort((a, b) => a.date.localeCompare(b.date));
  const latest = sortedRates[sortedRates.length - 1];
  const startLimit = new Date(`${latest.date}T00:00:00Z`);
  startLimit.setUTCFullYear(startLimit.getUTCFullYear() - maxYears);
  const startLimitStr = startLimit.toISOString().slice(0, 10);
  const start = sortedRates.find(rate => rate.date >= startLimitStr) || sortedRates[0];

  if (!start?.rate || !latest?.rate || start.rate <= 0 || latest.rate <= 0) return 0;

  const elapsedYears = (new Date(`${latest.date}T00:00:00Z`) - new Date(`${start.date}T00:00:00Z`)) / (365.25 * 24 * 3600 * 1000);
  if (elapsedYears <= 0) return 0;

  return (Math.pow(latest.rate / start.rate, 1 / elapsedYears) - 1) * 100;
};

export const fxAnnualRateForPeriod = (fxRates, startDate, endDate) => {
  if (!fxRates || fxRates.length < 2) return 0;

  const sortedRates = [...fxRates].sort((a, b) => a.date.localeCompare(b.date));
  const start = sortedRates.find(rate => rate.date >= startDate) || sortedRates[0];
  const end = [...sortedRates].reverse().find(rate => rate.date <= endDate) || sortedRates[sortedRates.length - 1];

  if (!start?.rate || !end?.rate || start.rate <= 0 || end.rate <= 0) return 0;

  const elapsedYears = (new Date(`${end.date}T00:00:00Z`) - new Date(`${start.date}T00:00:00Z`)) / (365.25 * 24 * 3600 * 1000);
  if (elapsedYears <= 0) return 0;

  return (Math.pow(end.rate / start.rate, 1 / elapsedYears) - 1) * 100;
};

export const combineAnnualRates = (stockRate, fxRate) => (
  ((1 + stockRate / 100) * (1 + fxRate / 100) - 1) * 100
);

export const averageRollingDcaIrr = ({
  prices,
  fxRates,
  assetCurrency,
  homeCurrency,
  monthlyAmount,
  years,
}) => {
  if (!years) {
    const { timeline } = calculateDCATimeline({
      filteredPrices: prices,
      fxRates,
      assetCurrency,
      homeCurrency,
      monthlyDeposit: monthlyAmount,
    });
    if (timeline.length <= 1) return null;
    return calculateDcaIrr(timeline, timeline[timeline.length - 1].wealth);
  }

  const windowMonths = Math.max(1, years * 12);
  const monthlyFirstPrices = [];
  let lastMonthKey = "";

  prices.forEach((price) => {
    const monthKey = price.date.substring(0, 7);
    if (monthKey !== lastMonthKey) {
      monthlyFirstPrices.push(price);
      lastMonthKey = monthKey;
    }
  });

  if (monthlyFirstPrices.length < 2) return null;

  const windowIrrs = [];
  const maxStart = Math.max(0, monthlyFirstPrices.length - windowMonths);

  for (let start = 0; start < maxStart; start++) {
    const end = start + windowMonths;
    const startDate = monthlyFirstPrices[start].date;
    const endDate = monthlyFirstPrices[Math.min(end, monthlyFirstPrices.length - 1)].date;
    const filteredPrices = prices.filter((price) => price.date >= startDate && price.date <= endDate);

    const { timeline } = calculateDCATimeline({
      filteredPrices,
      fxRates,
      assetCurrency,
      homeCurrency,
      monthlyDeposit: monthlyAmount,
    });

    if (timeline.length <= 1) continue;

    const finalWealth = timeline[timeline.length - 1].wealth;
    const irr = calculateDcaIrr(timeline, finalWealth);
    if (Number.isFinite(irr)) windowIrrs.push(irr);
  }

  if (windowIrrs.length === 0) {
    const { timeline } = calculateDCATimeline({
      filteredPrices: prices,
      fxRates,
      assetCurrency,
      homeCurrency,
      monthlyDeposit: monthlyAmount,
    });
    if (timeline.length <= 1) return null;
    return calculateDcaIrr(timeline, timeline[timeline.length - 1].wealth);
  }

  return windowIrrs.reduce((sum, irr) => sum + irr, 0) / windowIrrs.length;
};

export const annualPriceReturns = (prices) => {
  const yearPriceMap = {};
  prices.forEach(p => {
    const yr = p.date.substring(0, 4);
    if (!yearPriceMap[yr]) yearPriceMap[yr] = { close: p.close };
    yearPriceMap[yr].close = p.close;
  });

  const sortedYears = Object.keys(yearPriceMap).sort();
  return sortedYears.slice(1).map((yr, idx) => {
    const prevYr = sortedYears[idx];
    const rate = ((yearPriceMap[yr].close - yearPriceMap[prevYr].close) / yearPriceMap[prevYr].close) * 100;
    return { year: yr, rate };
  });
};

export const priceCagr = (prices, fallback = 10) => {
  const yearPriceMap = {};
  prices.forEach(p => {
    const yr = p.date.substring(0, 4);
    if (!yearPriceMap[yr]) yearPriceMap[yr] = { close: p.close };
    yearPriceMap[yr].close = p.close;
  });

  const sortedYears = Object.keys(yearPriceMap).sort();
  const firstYr = sortedYears[0];
  const lastYr = sortedYears[sortedYears.length - 1];
  const numYears = sortedYears.length - 1;

  return numYears > 0 && yearPriceMap[firstYr]?.close > 0
    ? (Math.pow(yearPriceMap[lastYr].close / yearPriceMap[firstYr].close, 1 / numYears) - 1) * 100
    : fallback;
};

export const estimateFutureAnnualRates = ({
  prices,
  fxRates,
  assetCurrency,
  monthlyAmount,
}) => {
  const stockAnnualRate = averageRollingDcaIrr({
    prices,
    fxRates: [],
    assetCurrency,
    homeCurrency: assetCurrency,
    monthlyAmount,
    years: predictionRollingYears(prices),
  }) ?? priceCagr(prices);
  const annualFxImpact = recentFxAnnualRate(fxRates);
  const totalAnnualRate = combineAnnualRates(stockAnnualRate, annualFxImpact);

  return {
    stockAnnualRate,
    annualFxImpact,
    totalAnnualRate,
  };
};

export const annualToMonthlyRate = (annualRate) => (
  Math.pow(1 + annualRate / 100, 1 / 12) - 1
);

export const projectFutureTimeline = ({
  monthlyAmount,
  annualRate,
  projectionYears,
  benchmarkAnnualRate = null,
  startDate = new Date(),
}) => {
  const futureTimeline = [];
  const rMod = annualToMonthlyRate(annualRate);
  const rOpt = annualToMonthlyRate(annualRate + 3);
  const rCon = annualToMonthlyRate(Math.max(0, annualRate - 3));
  const rBenchmark = benchmarkAnnualRate === null ? null : annualToMonthlyRate(benchmarkAnnualRate);

  let currentWealth = monthlyAmount;
  let currentWealthOpt = monthlyAmount;
  let currentWealthCon = monthlyAmount;
  let currentInvested = monthlyAmount;
  let currentWealthBench = monthlyAmount;
  const currentDate = new Date(startDate);

  futureTimeline.push({
    date: currentDate.toISOString().slice(0, 10),
    totalInvested: currentInvested,
    wealth: currentWealth,
    wealthOptimistic: currentWealthOpt,
    wealthConservative: currentWealthCon,
    annualRate,
    isFuture: true,
    benchmarkWealth: rBenchmark === null ? undefined : currentWealthBench,
  });

  for (let m = 1; m <= projectionYears * 12; m++) {
    currentDate.setMonth(currentDate.getMonth() + 1);
    currentInvested += monthlyAmount;

    currentWealth = (currentWealth + monthlyAmount) * (1 + rMod);
    currentWealthOpt = (currentWealthOpt + monthlyAmount) * (1 + rOpt);
    currentWealthCon = (currentWealthCon + monthlyAmount) * (1 + rCon);
    if (rBenchmark !== null) {
      currentWealthBench = (currentWealthBench + monthlyAmount) * (1 + rBenchmark);
    }

    futureTimeline.push({
      date: currentDate.toISOString().slice(0, 10),
      totalInvested: currentInvested,
      wealth: currentWealth,
      wealthOptimistic: currentWealthOpt,
      wealthConservative: currentWealthCon,
      annualRate,
      isFuture: true,
      benchmarkWealth: rBenchmark === null ? undefined : currentWealthBench,
    });
  }

  return futureTimeline;
};
