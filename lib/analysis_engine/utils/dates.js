export function row_on_or_after(rows, value) {
  const target = new Date(value).getTime();
  const row = rows.find((item) => new Date(item.date).getTime() >= target);
  if (!row) throw new Error(`No row on or after ${format_date(value)}`);
  return row;
}

export function row_on_or_before(rows, value) {
  const target = new Date(value).getTime();
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const row = rows[index];
    if (new Date(row.date).getTime() <= target) return row;
  }
  throw new Error(`No row on or before ${format_date(value)}`);
}

function format_date(value) {
  return new Date(value).toISOString().slice(0, 10);
}
