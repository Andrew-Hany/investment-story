const DATA_ROOT = "/data";

export async function load_json(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Failed to fetch ${path}: ${response.status}`);
  return response.json();
}

export async function load_prices(ticker) {
  const normalized = normalize_ticker(ticker);
  const payload = await load_json(`${DATA_ROOT}/prices/${normalized}.json`);
  return payload.prices
    .map((row) => ({ ...row, date: row.date }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function load_fundamentals(ticker) {
  const normalized = normalize_ticker(ticker);
  return load_json(`${DATA_ROOT}/fundamentals/${normalized}.json`);
}

export async function load_events(ticker) {
  const normalized = normalize_ticker(ticker);
  return load_json(`${DATA_ROOT}/events/${normalized}.json`);
}

export function annual_statement_rows(fundamentals, statement_name) {
  return fundamentals.annual[statement_name]
    .map((row) => ({ period_end: row.period_end, ...row.values }))
    .sort((a, b) => a.period_end.localeCompare(b.period_end));
}

export function normalize_ticker(ticker) {
  return String(ticker).trim().toUpperCase();
}
