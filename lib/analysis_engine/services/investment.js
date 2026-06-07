import { calculate_event_return } from "../calculations/events";
import { calculate_max_drawdown } from "../calculations/drawdowns";
import { load_events, load_prices, normalize_ticker } from "../data_access/public_data";
import { ceo_events } from "../utils/events";
import { row_on_or_after } from "../utils/dates";
import { build_company_snapshot } from "./company";
import { build_investment_comparison } from "./comparison";

export async function build_investment_analysis({
  ticker,
  benchmark = "SPY",
  initial_amount = 10_000,
  years = null,
  start_date = null,
  end_date = null,
}) {
  const normalized = normalize_ticker(ticker);
  const [comparison, prices, events, company_snapshot] = await Promise.all([
    build_investment_comparison({
      first_ticker: normalized,
      second_ticker: benchmark,
      initial_amount,
      years,
      start_date,
      end_date,
    }),
    load_prices(normalized),
    load_events(normalized),
    build_company_snapshot(normalized),
  ]);
  const resolved_start = comparison.resolved_dates.start_date;
  const resolved_end = comparison.resolved_dates.end_date;
  const start_row = row_on_or_after(prices, resolved_start);
  const path = prices
    .filter((row) => row.date >= resolved_start && row.date <= resolved_end)
    .map((row) => ({ ...row, wealth: (initial_amount * row.adj_close) / start_row.adj_close }));
  const drawdown = calculate_max_drawdown(path.map((row) => row.wealth));
  const ceo_event_rows = ceo_events(events, resolved_start, resolved_end);

  return {
    input: { ticker: normalized, benchmark: normalize_ticker(benchmark), initial_amount, years, start_date, end_date },
    comparison,
    company_snapshot,
    risk: {
      max_drawdown: drawdown,
      peak_date: path[drawdown.peak_index]?.date,
      trough_date: path[drawdown.trough_index]?.date,
      recovery_date: drawdown.recovery_index == null ? null : path[drawdown.recovery_index]?.date,
    },
    events: {
      ceo_events: ceo_event_rows,
      ceo_event_reactions: build_ceo_event_reactions(prices, ceo_event_rows, 60, 120),
    },
  };
}

function build_ceo_event_reactions(prices, ceo_event_rows, periods_before, periods_after) {
  const price_values = prices.map((row) => row.adj_close);
  return ceo_event_rows.map((event) => {
    const event_index = prices.findIndex((row) => row.date >= event.date);
    return {
      date: event.date,
      executive_name: event.executive_name,
      action: event.action,
      reaction: calculate_event_return(price_values, event_index, periods_before, periods_after),
    };
  });
}
