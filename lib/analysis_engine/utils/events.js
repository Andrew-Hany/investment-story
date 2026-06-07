export function ceo_events(events, start_date, end_date) {
  const start = new Date(start_date).getTime();
  const end = new Date(end_date).getTime();

  return (events.timeline_events ?? [])
    .map((event) => {
      const details = event.details && typeof event.details === "object" ? event.details : {};
      return {
        date: event.date,
        event_type: event.event_type,
        description: event.description,
        executive_name: details.executive_name,
        role: details.role ?? "",
        action: details.action ?? "",
      };
    })
    .filter((event) => {
      const date = new Date(event.date).getTime();
      const text = `${event.description ?? ""} ${event.role ?? ""}`.toLowerCase();
      return (
        date >= start &&
        date <= end &&
        (/chief executive officer/.test(text) || /\bceo\b/.test(text))
      );
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}
