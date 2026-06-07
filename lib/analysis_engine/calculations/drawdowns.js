export function calculate_max_drawdown(values) {
  if (!values.length) throw new Error("values must not be empty");

  let peak_value = values[0];
  let peak_index = 0;
  let max_drawdown = 0;
  let max_peak_index = 0;
  let trough_index = 0;

  values.forEach((value, index) => {
    if (value <= 0) throw new Error("values must be greater than 0");

    if (value > peak_value) {
      peak_value = value;
      peak_index = index;
    }

    const drawdown = value / peak_value - 1;
    if (drawdown < max_drawdown) {
      max_drawdown = drawdown;
      max_peak_index = peak_index;
      trough_index = index;
    }
  });

  let recovery_index = null;
  const recovery_level = values[max_peak_index];
  for (let index = trough_index + 1; index < values.length; index += 1) {
    if (values[index] >= recovery_level) {
      recovery_index = index;
      break;
    }
  }

  return {
    max_drawdown,
    peak_index: max_peak_index,
    trough_index,
    recovery_index,
  };
}

export function calculate_period_return(start_value, end_value) {
  if (start_value <= 0) throw new Error("start_value must be greater than 0");
  if (end_value < 0) throw new Error("end_value must be greater than or equal to 0");
  return end_value / start_value - 1;
}

export function calculate_best_period_return(values, window_size) {
  const returns = rolling_returns(values, window_size);
  if (!returns.length) throw new Error("window_size must leave at least one complete period");
  return Math.max(...returns);
}

export function calculate_worst_period_return(values, window_size) {
  const returns = rolling_returns(values, window_size);
  if (!returns.length) throw new Error("window_size must leave at least one complete period");
  return Math.min(...returns);
}

function rolling_returns(values, window_size) {
  if (window_size <= 0) throw new Error("window_size must be greater than 0");
  const returns = [];
  for (let index = window_size; index < values.length; index += 1) {
    returns.push(calculate_period_return(values[index - window_size], values[index]));
  }
  return returns;
}
