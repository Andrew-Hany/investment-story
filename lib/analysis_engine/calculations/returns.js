export function calculate_shares_bought(initial_amount, start_price) {
  require_non_negative(initial_amount, "initial_amount");
  require_positive(start_price, "start_price");
  return initial_amount / start_price;
}

export function calculate_final_value(initial_amount, start_price, end_price) {
  require_non_negative(initial_amount, "initial_amount");
  require_positive(start_price, "start_price");
  require_non_negative(end_price, "end_price");
  return calculate_shares_bought(initial_amount, start_price) * end_price;
}

export function calculate_total_return(start_value, end_value) {
  require_positive(start_value, "start_value");
  require_non_negative(end_value, "end_value");
  return end_value / start_value - 1;
}

export function calculate_annualized_return(start_value, end_value, years) {
  require_positive(start_value, "start_value");
  require_non_negative(end_value, "end_value");
  require_positive(years, "years");
  if (end_value === 0) return -1;
  return (end_value / start_value) ** (1 / years) - 1;
}

export function calculate_investment_result(
  ticker,
  initial_amount,
  start_price,
  end_price,
  years = null,
) {
  const shares = calculate_shares_bought(initial_amount, start_price);
  const final_value = shares * end_price;
  const total_return = calculate_total_return(initial_amount, final_value);

  return {
    ticker,
    initial_amount,
    start_price,
    end_price,
    shares,
    final_value,
    profit: final_value - initial_amount,
    total_return,
    annualized_return:
      years == null ? null : calculate_annualized_return(initial_amount, final_value, years),
  };
}

export function compare_investments(
  first_ticker,
  first_start_price,
  first_end_price,
  second_ticker,
  second_start_price,
  second_end_price,
  initial_amount,
  years = null,
) {
  const first = calculate_investment_result(
    first_ticker,
    initial_amount,
    first_start_price,
    first_end_price,
    years,
  );
  const second = calculate_investment_result(
    second_ticker,
    initial_amount,
    second_start_price,
    second_end_price,
    years,
  );
  const winner_result = first.final_value >= second.final_value ? first : second;
  const loser_result = first.final_value >= second.final_value ? second : first;

  return {
    first,
    second,
    winner: winner_result.ticker,
    loser: loser_result.ticker,
    final_value_difference: winner_result.final_value - loser_result.final_value,
    return_difference: winner_result.total_return - loser_result.total_return,
    winner_multiple:
      loser_result.final_value === 0
        ? Number.POSITIVE_INFINITY
        : winner_result.final_value / loser_result.final_value,
  };
}

function require_positive(value, name) {
  if (value <= 0) throw new Error(`${name} must be greater than 0`);
}

function require_non_negative(value, name) {
  if (value < 0) throw new Error(`${name} must be greater than or equal to 0`);
}
