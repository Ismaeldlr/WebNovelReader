const relativeFormatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const longDateFormatter = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});
const shortDateFormatter = new Intl.DateTimeFormat('en', {
  month: 'short',
  day: 'numeric',
});

export function formatRelativeDate(value: string | null): string {
  if (!value) return 'Never';

  const date = new Date(value);
  const diffMs = date.getTime() - Date.now();
  const absMs = Math.abs(diffMs);

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const month = 30 * day;
  const year = 365 * day;

  if (absMs < minute) return 'Just now';
  if (absMs < hour) return relativeFormatter.format(Math.round(diffMs / minute), 'minute');
  if (absMs < day) return relativeFormatter.format(Math.round(diffMs / hour), 'hour');
  if (absMs < month) return relativeFormatter.format(Math.round(diffMs / day), 'day');
  if (absMs < year) return relativeFormatter.format(Math.round(diffMs / month), 'month');
  return relativeFormatter.format(Math.round(diffMs / year), 'year');
}

export function formatLongDate(value: string): string {
  return longDateFormatter.format(new Date(value));
}

export function formatShortDate(value: string): string {
  return shortDateFormatter.format(new Date(value));
}
