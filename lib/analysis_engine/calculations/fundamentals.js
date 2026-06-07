export function calculate_revenue_growth(current_revenue, previous_revenue) {
  require_positive(previous_revenue, "previous_revenue");
  require_non_negative(current_revenue, "current_revenue");
  return current_revenue / previous_revenue - 1;
}

export function calculate_gross_margin(gross_profit, revenue) {
  return margin(gross_profit, revenue);
}

export function calculate_operating_margin(operating_income, revenue) {
  return margin(operating_income, revenue);
}

export function calculate_net_margin(net_income, revenue) {
  return margin(net_income, revenue);
}

export function calculate_debt_to_cash(total_debt, total_cash) {
  require_non_negative(total_debt, "total_debt");
  require_positive(total_cash, "total_cash");
  return total_debt / total_cash;
}

export function calculate_market_cap_to_revenue(market_cap, revenue) {
  require_non_negative(market_cap, "market_cap");
  require_positive(revenue, "revenue");
  return market_cap / revenue;
}

export function calculate_cost_ratio(costs, revenue) {
  require_non_negative(costs, "costs");
  require_positive(revenue, "revenue");
  return costs / revenue;
}

export function classify_growth_rate(growth_rate) {
  if (growth_rate < 0) return "shrinking";
  if (growth_rate < 0.05) return "slow";
  if (growth_rate < 0.15) return "steady";
  if (growth_rate < 0.3) return "fast";
  return "very_fast";
}

export function classify_margin(value) {
  if (value < 0) return "negative";
  if (value < 0.05) return "thin";
  if (value < 0.15) return "healthy";
  if (value < 0.3) return "strong";
  return "exceptional";
}

function margin(numerator, revenue) {
  require_positive(revenue, "revenue");
  return numerator / revenue;
}

function require_positive(value, name) {
  if (value <= 0) throw new Error(`${name} must be greater than 0`);
}

function require_non_negative(value, name) {
  if (value < 0) throw new Error(`${name} must be greater than or equal to 0`);
}
