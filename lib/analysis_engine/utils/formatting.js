export function money(value, symbol = "$") {
  return `${symbol}${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function compact_money(value, symbol = "$") {
  const abs_value = Math.abs(value);
  if (abs_value >= 1_000_000_000) return `${symbol}${(value / 1_000_000_000).toFixed(1)}B`;
  if (abs_value >= 1_000_000) return `${symbol}${(value / 1_000_000).toFixed(1)}M`;
  return money(value, symbol);
}

export function pct(value) {
  if (value == null) return "n/a";
  return `${(value * 100).toLocaleString("en-US", { maximumFractionDigits: 1 })}%`;
}
