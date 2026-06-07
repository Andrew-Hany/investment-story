const fs = require("fs");
const dataA = JSON.parse(fs.readFileSync("public/data/fundamentals/AAPL.json", "utf8"));
const pricesAObj = JSON.parse(fs.readFileSync("public/data/prices/AAPL.json", "utf8"));
const pricesA = pricesAObj.prices.map(row => ({...row, date: row.date})).sort((a,b) => a.date.localeCompare(b.date));

const getPriceForDate = (prices, dateStr) => {
  let closest = prices[0];
  let minDiff = Infinity;
  const targetTime = new Date(dateStr).getTime();
  for (const p of prices) {
    const diff = Math.abs(new Date(p.date).getTime() - targetTime);
    if (diff < minDiff) {
      minDiff = diff;
      closest = p;
    }
  }
  return closest;
};

const parseValuation = (data, prices) => {
  const inc = data.annual.income_statement || [];
  const cf = data.annual.cash_flow || [];
  const sharesOutstanding = data.company?.sharesOutstanding || 1e9;
  return inc.map(item => {
    const year = new Date(item.period_end).getFullYear();
    const priceRow = getPriceForDate(prices, item.period_end);
    const priceVal = priceRow ? priceRow.close : 1.0;
    const eps = item.values.diluted_eps || item.values.basic_eps || null;
    const pe = (eps && eps > 0) ? (priceVal / eps) : null;
    return { year, date: item.period_end, eps, price: priceVal, pe };
  }).sort((a, b) => a.year - b.year);
};

const listA = parseValuation(dataA, pricesA);

const dataB = JSON.parse(fs.readFileSync("public/data/fundamentals/COMI.CA.json", "utf8"));
const pricesBObj = JSON.parse(fs.readFileSync("public/data/prices/COMI.CA.json", "utf8"));
const pricesB = pricesBObj.prices.map(row => ({...row, date: row.date})).sort((a,b) => a.date.localeCompare(b.date));
const listB = parseValuation(dataB, pricesB);

const yearsList = Array.from(new Set([...listA.map(d => d.year), ...listB.map(d => d.year)])).sort();
const recentYears = yearsList.slice(-5);

const validListA = listA.filter(d => d.eps > 0);
const latestRowA = validListA.at(-1) || {};
const startRowA = validListA.find(d => recentYears.includes(d.year)) || {};

const computeAttribution = (latestRow, startRow) => {
  const startCap = 10000;
  const epsGrow = startRow.eps && latestRow.eps ? (latestRow.eps - startRow.eps) / startRow.eps : 0;
  const peGrow = startRow.pe && latestRow.pe ? (latestRow.pe - startRow.pe) / startRow.pe : 0;
  const wealthEps = startCap * (1 + epsGrow);
  const epsContrib = wealthEps - startCap;
  const multContrib = wealthEps * peGrow;
  return { start: startCap, epsGrow, peGrow, epsContrib, multContrib };
};

console.log("AAPL:");
console.log(computeAttribution(latestRowA, startRowA));

