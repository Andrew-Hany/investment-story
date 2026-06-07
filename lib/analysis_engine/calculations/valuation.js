export function calculate_pe_ratio(price, eps) {
  require_non_negative(price, "price");
  require_positive(eps, "eps");
  return price / eps;
}

export function calculate_forward_pe(price, forward_eps) {
  return calculate_pe_ratio(price, forward_eps);
}

export function calculate_earnings_yield(eps, price) {
  require_positive(price, "price");
  return eps / price;
}

export function calculate_price_to_sales(market_cap, revenue) {
  require_non_negative(market_cap, "market_cap");
  require_positive(revenue, "revenue");
  return market_cap / revenue;
}

export function calculate_price_to_book(market_cap, book_value) {
  require_non_negative(market_cap, "market_cap");
  require_positive(book_value, "book_value");
  return market_cap / book_value;
}

export function calculate_eps_growth(current_eps, previous_eps) {
  require_positive(previous_eps, "previous_eps");
  return current_eps / previous_eps - 1;
}

export function calculate_margin_of_safety(fair_value, current_price) {
  require_positive(fair_value, "fair_value");
  require_non_negative(current_price, "current_price");
  return (fair_value - current_price) / fair_value;
}

export function classify_pe_level(pe_ratio) {
  require_non_negative(pe_ratio, "pe_ratio");
  if (pe_ratio < 15) return "low";
  if (pe_ratio < 25) return "normal";
  if (pe_ratio < 40) return "high";
  return "extreme";
}

function require_positive(value, name) {
  if (value <= 0) throw new Error(`${name} must be greater than 0`);
}

function require_non_negative(value, name) {
  if (value < 0) throw new Error(`${name} must be greater than or equal to 0`);
}
