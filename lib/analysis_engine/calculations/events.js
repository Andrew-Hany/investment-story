export function calculate_event_return(prices, event_index, periods_before, periods_after) {
  if (!prices.length) throw new Error("prices must not be empty");
  if (event_index < 0 || event_index >= prices.length) {
    throw new Error("event_index is outside prices");
  }
  if (periods_before < 0) {
    throw new Error("periods_before must be greater than or equal to 0");
  }
  if (periods_after < 0) {
    throw new Error("periods_after must be greater than or equal to 0");
  }

  prices.forEach((price) => {
    if (price <= 0) throw new Error("prices must be greater than 0");
  });

  const before_index = event_index - periods_before >= 0 ? event_index - periods_before : null;
  const after_index = event_index + periods_after < prices.length ? event_index + periods_after : null;
  const event_price = prices[event_index];
  const before_price = before_index == null ? null : prices[before_index];
  const after_price = after_index == null ? null : prices[after_index];

  return {
    event_index,
    before_index,
    after_index,
    event_price,
    before_price,
    after_price,
    before_to_event_return: before_price == null ? null : event_price / before_price - 1,
    event_to_after_return: after_price == null ? null : after_price / event_price - 1,
  };
}
