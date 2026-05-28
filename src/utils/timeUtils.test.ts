import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatTimeRange, isHappyHourActive } from './timeUtils';
import type { HappyHourWindow } from '../types/venue';

describe('isHappyHourActive', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns true when current day and time fall within a window', () => {
    vi.setSystemTime(new Date('2026-05-28T16:30:00')); // Thursday 4:30 PM

    const windows: HappyHourWindow[] = [
      {
        days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        startTime: '15:00',
        endTime: '18:00',
      },
    ];

    expect(isHappyHourActive(windows)).toBe(true);
  });

  it('returns false outside the window', () => {
    vi.setSystemTime(new Date('2026-05-28T20:00:00'));

    const windows: HappyHourWindow[] = [
      {
        days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        startTime: '15:00',
        endTime: '18:00',
      },
    ];

    expect(isHappyHourActive(windows)).toBe(false);
  });

  it('returns false for empty windows', () => {
    expect(isHappyHourActive([])).toBe(false);
  });
});

describe('formatTimeRange', () => {
  it('formats weekday range and times', () => {
    const window: HappyHourWindow = {
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      startTime: '15:00',
      endTime: '18:00',
    };

    expect(formatTimeRange(window)).toBe('Mon–Fri  3:00 PM – 6:00 PM');
  });
});
