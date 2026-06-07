import {
  calculate_debt_to_cash,
  calculate_gross_margin,
  calculate_net_margin,
  calculate_revenue_growth,
  classify_growth_rate,
  classify_margin,
} from "../calculations/fundamentals";
import { calculate_pe_ratio, classify_pe_level } from "../calculations/valuation";
import { annual_statement_rows, load_fundamentals, load_prices, normalize_ticker } from "../data_access/public_data";

export async function build_company_snapshot(ticker) {
  const normalized = normalize_ticker(ticker);
  const [fundamentals, prices] = await Promise.all([
    load_fundamentals(normalized),
    load_prices(normalized),
  ]);
  const income = annual_statement_rows(fundamentals, "income_statement");
  const balance = annual_statement_rows(fundamentals, "balance_sheet");
  const latest_income = income.at(-1);
  const previous_income = income.at(-2);
  const latest_balance = balance.at(-1);
  const latest_price = prices.at(-1).adj_close;
  const latest_eps = latest_income.diluted_eps;
  const revenue_growth = calculate_revenue_growth(latest_income.total_revenue, previous_income.total_revenue);
  const gross_margin = calculate_gross_margin(latest_income.gross_profit, latest_income.total_revenue);
  const net_margin = calculate_net_margin(latest_income.net_income, latest_income.total_revenue);
  const debt_to_cash = calculate_debt_to_cash(latest_balance.long_term_debt, latest_balance.cash_and_cash_equivalents);
  const pe_ratio = calculate_pe_ratio(latest_price, latest_eps);

  return {
    ticker: normalized,
    company: fundamentals.company,
    price: {
      latest_date: prices.at(-1).date,
      latest_adj_close: latest_price,
      first_date: prices[0].date,
      last_date: prices.at(-1).date,
    },
    fundamentals: {
      latest_period: latest_income.period_end,
      latest_revenue: latest_income.total_revenue,
      latest_net_income: latest_income.net_income,
      revenue_growth,
      revenue_growth_label: classify_growth_rate(revenue_growth),
      gross_margin,
      gross_margin_label: classify_margin(gross_margin),
      net_margin,
      net_margin_label: classify_margin(net_margin),
      debt_to_cash,
    },
    valuation: {
      latest_price,
      latest_eps,
      pe_ratio,
      pe_label: classify_pe_level(pe_ratio),
      market_cap: fundamentals.company?.marketCap,
    },
  };
}
