import type { HappyHourWindow } from '../types/venue';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

function minutesSinceMidnight(time24: string): number {
  const [hours, minutes] = time24.split(':').map(Number);
  return (hours ?? 0) * 60 + (minutes ?? 0);
}

function format12Hour(time24: string): string {
  const total = minutesSinceMidnight(time24);
  const hours24 = Math.floor(total / 60);
  const mins = total % 60;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 || 12;
  return `${hours12}:${mins.toString().padStart(2, '0')} ${period}`;
}

function expandDayRange(days: string[]): Set<string> {
  const allDays = DAY_LABELS as unknown as string[];
  const result = new Set<string>();

  if (days.length === 0) return result;

  const indices = days
    .map((d) => allDays.indexOf(d))
    .filter((i) => i >= 0)
    .sort((a, b) => a - b);

  if (indices.length === 0) {
    days.forEach((d) => result.add(d));
    return result;
  }

  const first = indices[0]!;
  const last = indices[indices.length - 1]!;

  if (indices.length >= 2 && last - first === indices.length - 1) {
    for (let i = first; i <= last; i++) {
      result.add(allDays[i]!);
    }
    return result;
  }

  days.forEach((d) => result.add(d));
  return result;
}

function formatDaySpan(days: string[]): string {
  const unique = [...new Set(days)];
  if (unique.length === 0) return '';
  if (unique.length === 1) return unique[0]!;

  const allDays = DAY_LABELS as unknown as string[];
  const indices = unique
    .map((d) => allDays.indexOf(d))
    .filter((i) => i >= 0)
    .sort((a, b) => a - b);

  if (
    indices.length === unique.length &&
    indices.length >= 2 &&
    indices[indices.length - 1]! - indices[0]! === indices.length - 1
  ) {
    return `${allDays[indices[0]!]}–${allDays[indices[indices.length - 1]!]}`;
  }

  return unique.join(', ');
}

export function isHappyHourActive(windows: HappyHourWindow[]): boolean {
  if (windows.length === 0) return false;

  const now = new Date();
  const today = DAY_LABELS[now.getDay()]!;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  return windows.some((window) => {
    const activeDays = expandDayRange(window.days);
    if (!activeDays.has(today)) return false;

    const start = minutesSinceMidnight(window.startTime);
    const end = minutesSinceMidnight(window.endTime);
    return currentMinutes >= start && currentMinutes < end;
  });
}

export function formatTimeRange(window: HappyHourWindow): string {
  const days = formatDaySpan(window.days);
  const start = format12Hour(window.startTime);
  const end = format12Hour(window.endTime);
  return `${days}  ${start} – ${end}`;
}

/**
 * Minutes until the currently-active happy hour window ends, or null if none
 * is active right now. Used to power the "ends in 42 min" countdown.
 */
export function minutesUntilEnd(windows: HappyHourWindow[]): number | null {
  if (windows.length === 0) return null;

  const now = new Date();
  const today = DAY_LABELS[now.getDay()]!;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  let soonest: number | null = null;
  for (const window of windows) {
    const activeDays = expandDayRange(window.days);
    if (!activeDays.has(today)) continue;

    const start = minutesSinceMidnight(window.startTime);
    const end = minutesSinceMidnight(window.endTime);
    if (currentMinutes >= start && currentMinutes < end) {
      const remaining = end - currentMinutes;
      if (soonest === null || remaining < soonest) soonest = remaining;
    }
  }
  return soonest;
}

/** "ends in 42 min" / "ends in 1 hr" / "ends in 1 hr 5 min" */
export function formatCountdown(minutes: number): string {
  if (minutes < 60) return `ends in ${minutes} min`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const hrLabel = `${hrs} hr`;
  return mins === 0 ? `ends in ${hrLabel}` : `ends in ${hrLabel} ${mins} min`;
}
