const UPDATE_WINDOWS = [
  { hour: 7, minute: 0 },
  { hour: 13, minute: 0 },
  { hour: 18, minute: 0 }
] as const;

function withTime(base: Date, hour: number, minute: number): Date {
  const date = new Date(base);
  date.setHours(hour, minute, 0, 0);
  return date;
}

export function getNextUpdateDate(now: Date): Date {
  const candidates = UPDATE_WINDOWS.map(({ hour, minute }) => withTime(now, hour, minute))
    .filter((date) => date > now)
    .sort((a, b) => a.getTime() - b.getTime());

  if (candidates.length > 0) {
    return candidates[0];
  }

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return withTime(tomorrow, UPDATE_WINDOWS[0].hour, UPDATE_WINDOWS[0].minute);
}

export function getCurrentWindowKey(now: Date): string {
  const windowsToday = UPDATE_WINDOWS.map(({ hour, minute }, index) => ({
    date: withTime(now, hour, minute),
    index
  }));

  const current = windowsToday
    .filter((entry) => entry.date <= now)
    .sort((a, b) => b.date.getTime() - a.date.getTime())[0];

  if (current) {
    const yyyyMmDd = now.toISOString().slice(0, 10);
    return `${yyyyMmDd}-w${current.index}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yyyyMmDd = yesterday.toISOString().slice(0, 10);
  return `${yyyyMmDd}-w2`;
}
