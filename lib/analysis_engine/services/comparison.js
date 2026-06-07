import { compare_investments } from "../calculations/returns";
import { load_prices, normalize_ticker } from "../data_access/public_data";
import { row_on_or_after, row_on_or_before } from "../utils/dates";

export async function build_investment_comparison({
  first_ticker,
  second_ticker,
  initial_amount,
  years = null,
  start_date = null,
  end_date = null,
}) {
  const first = normalize_ticker(first_ticker);
  const second = normalize_ticker(second_ticker);
  const [first_prices, second_prices] = await Promise.all([load_prices(first), load_prices(second)]);
  const actual_end = end_date ?? min_date(first_prices.at(-1).date, second_prices.at(-1).date);
  const actual_start = start_date ?? shift_year(actual_end, -(years ?? 10));
  const first_start = row_on_or_after(first_prices, actual_start);
  const first_end = row_on_or_before(first_prices, actual_end);
  const second_start = row_on_or_after(second_prices, actual_start);
  const second_end = row_on_or_before(second_prices, actual_end);
  const actual_years = year_diff(first_start.date, first_end.date);

  return {
    input: { first_ticker: first, second_ticker: second, initial_amount, years, start_date, end_date },
    resolved_dates: { start_date: first_start.date, end_date: first_end.date, years: actual_years },
    comparison: compare_investments(
      first,
      first_start.adj_close,
      first_end.adj_close,
      second,
      second_start.adj_close,
      second_end.adj_close,
      initial_amount,
      actual_years,
    ),
  };
}

function min_date(first, second) {
  return new Date(first).getTime() <= new Date(second).getTime() ? first : second;
}

function shift_year(date, delta_years) {
  const value = new Date(date);
  value.setFullYear(value.getFullYear() + delta_years);
  return value.toISOString().slice(0, 10);
}

function year_diff(start_date, end_date) {
  return (new Date(end_date).getTime() - new Date(start_date).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
}
