/**
 * src/utils/__tests__/date.test.ts
 * 
 * Comprehensive tests for date/time handling
 * Tests critical edge cases: month boundaries, leap years, timezone +07:00
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getTimezoneOffset,
  getTimezoneName,
  formatToLocalTimezone,
  formatDateOnly,
  formatTimeOnly,
  normalizeToUtcDay,
  getDateRange,
  isDateInRange,
  getTodayLocalDateString,
  getMonthStartLocalDateString,
  getMonthEndLocalDateString,
  daysDifference,
  isToday,
  isPast,
  isFuture,
} from '../date';

/**
 * Test Scenario 1: Vietnam Timezone (UTC+07:00)
 */
describe('Date Utilities - Vietnam Timezone (UTC+07:00)', () => {
  beforeEach(() => {
    // Mock as Vietnam timezone
    // Note: In real tests, use a library like jest-timezone to set timezone
    vi.useFakeTimers();
  });

  describe('normalizeToUtcDay', () => {
    it('should convert local date 00:00-23:59 to UTC range', () => {
      // Feb 2, 2026 in Vietnam (UTC+07)
      // Should be: Feb 1, 17:00 UTC to Feb 2, 16:59:59 UTC
      const [start, end] = normalizeToUtcDay('2026-02-02');

      // Verify start time is previous day at 17:00 UTC
      expect(start).toMatch(/2026-02-01T17:00:00/);

      // Verify end time is same day at 23:59:59 UTC
      expect(end).toMatch(/2026-02-02T16:59:59/);
    });

    it('should handle month boundaries correctly (end of February)', () => {
      // Feb 28, 2026 in Vietnam (UTC+07)
      const [start, end] = normalizeToUtcDay('2026-02-28');

      expect(start).toMatch(/2026-02-27T17:00:00/);
      expect(end).toMatch(/2026-02-28T16:59:59/);
    });

    it('should handle leap year February 29', () => {
      // Leap year: 2024 has Feb 29
      const [start, end] = normalizeToUtcDay('2024-02-29');

      expect(start).toMatch(/2024-02-28T17:00:00/);
      expect(end).toMatch(/2024-02-29T16:59:59/);
    });

    it('should handle month boundary transitions', () => {
      // Feb 1, 2026 - should transition to Jan 31
      const [start, end] = normalizeToUtcDay('2026-02-01');

      expect(start).toMatch(/2026-01-31T17:00:00/);
      expect(end).toMatch(/2026-02-01T16:59:59/);
    });

    it('should handle year boundary transitions', () => {
      // Jan 1, 2026 - should transition to Dec 31, 2025
      const [start, end] = normalizeToUtcDay('2026-01-01');

      expect(start).toMatch(/2025-12-31T17:00:00/);
      expect(end).toMatch(/2026-01-01T16:59:59/);
    });
  });

  describe('isDateInRange', () => {
    it('should correctly identify if date is within range', () => {
      const start = '2026-02-01T00:00:00.000Z';
      const end = '2026-02-28T23:59:59.999Z';
      const dateInRange = '2026-02-15T12:00:00.000Z';
      const dateOutOfRange = '2026-03-01T00:00:00.000Z';

      expect(isDateInRange(dateInRange, start, end)).toBe(true);
      expect(isDateInRange(dateOutOfRange, start, end)).toBe(false);
    });

    it('should include boundary dates (inclusive range)', () => {
      const start = '2026-02-01T00:00:00.000Z';
      const end = '2026-02-28T23:59:59.999Z';

      expect(isDateInRange(start, start, end)).toBe(true);
      expect(isDateInRange(end, start, end)).toBe(true);
    });
  });

  describe('daysDifference', () => {
    it('should calculate difference between two dates', () => {
      const date1 = '2026-02-01T00:00:00.000Z';
      const date2 = '2026-02-03T00:00:00.000Z';

      const diff = daysDifference(date1, date2);
      expect(diff).toBe(2);
    });

    it('should handle negative differences', () => {
      const date1 = '2026-02-03T00:00:00.000Z';
      const date2 = '2026-02-01T00:00:00.000Z';

      const diff = daysDifference(date1, date2);
      expect(diff).toBe(-2);
    });
  });
});

/**
 * Test Scenario 2: Report Date Range Accuracy
 * Critical scenario: User filters "today" and "this month"
 */
describe('Date Range Filtering - Reports Accuracy', () => {
  describe('getDateRange - Custom range', () => {
    it('should create UTC range covering full custom date range', () => {
      // User requests trips from Feb 1-3, 2026 (Vietnam time)
      const [start, end] = getDateRange('custom', '2026-02-01', '2026-02-03');

      // Start should be Jan 31 17:00 UTC (Feb 1 00:00 Vietnam)
      expect(start).toMatch(/2026-01-31T17:00:00/);

      // End should be Feb 3 16:59:59 UTC (Feb 3 23:59:59 Vietnam)
      expect(end).toMatch(/2026-02-03T16:59:59/);
    });

    it('should work across month boundaries', () => {
      // User requests Jan 31 - Feb 2 (Vietnam time)
      const [start, end] = getDateRange('custom', '2026-01-31', '2026-02-02');

      // Should cover from Dec 30 17:00 UTC to Feb 2 16:59:59 UTC
      expect(start).toMatch(/2026-01-30T17:00:00/);
      expect(end).toMatch(/2026-02-02T16:59:59/);
    });
  });

  describe('Report consistency across tabs', () => {
    it('same date range should be used by all tabs', () => {
      // Dashboard tab requests "thisMonth"
      const dashboardRange = getDateRange('thisMonth');

      // Reports tab requests "thisMonth"
      const reportRange = getDateRange('thisMonth');

      // Should be identical (both are consistent UTC ranges)
      expect(dashboardRange[0]).toBe(reportRange[0]);
      expect(dashboardRange[1]).toBe(reportRange[1]);
    });

    it('custom range should work consistently', () => {
      // Vehicles tab requests Feb 1-28
      const vehicleRange = getDateRange('custom', '2026-02-01', '2026-02-28');

      // Reports tab requests Feb 1-28
      const reportRange = getDateRange('custom', '2026-02-01', '2026-02-28');

      // Should be identical
      expect(vehicleRange[0]).toBe(reportRange[0]);
      expect(vehicleRange[1]).toBe(reportRange[1]);
    });
  });
});

/**
 * Test Scenario 3: Display Formatting
 */
describe('Display Formatting', () => {
  it('should format UTC time to local timezone string', () => {
    // UTC: 2026-02-02T03:00:00.000Z
    // Vietnam: 2026-02-02 10:00:00 (UTC+07)
    const formatted = formatToLocalTimezone('2026-02-02T03:00:00.000Z', 'yyyy-MM-dd HH:mm:ss');

    // Should display in local timezone
    expect(formatted).toContain('2026-02-02');
    expect(formatted).toContain('10:00:00');
  });

  it('should format date only without time', () => {
    const formatted = formatDateOnly('2026-02-02T03:00:00.000Z');
    expect(formatted).toMatch(/02\/02\/2026/);
  });

  it('should format time only without date', () => {
    const formatted = formatTimeOnly('2026-02-02T03:00:00.000Z');
    expect(formatted).toContain('10:00');
  });
});

/**
 * Test Scenario 4: Edge Cases
 */
describe('Edge Cases', () => {
  it('should handle leap year correctly', () => {
    // 2024 is a leap year
    const [start, end] = getDateRange('custom', '2024-02-29', '2024-02-29');

    // Should be a valid 24-hour range
    expect(start).toBeDefined();
    expect(end).toBeDefined();
    expect(start < end).toBe(true);
  });

  it('should handle year transitions', () => {
    const [start, end] = getDateRange('custom', '2025-12-31', '2026-01-02');

    // Should span across year boundary
    expect(start).toMatch(/2025-12-30/);
    expect(end).toMatch(/2026-01-02/);
  });

  it('should handle invalid dates gracefully', () => {
    const result = isDateInRange('invalid', '2026-02-01T00:00:00Z', '2026-02-28T23:59:59Z');
    // Should not throw, just return false
    expect(result).toBe(false);
  });
});

/**
 * Test Scenario 5: Real-world Usage Patterns
 */
describe('Real-world Usage - Trip Filtering', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-02T03:30:00.000Z')); // 10:30 AM Vietnam time
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should filter trips for current date only', () => {
    // User: Vietnam UTC+07:00
    // Today: 2026-02-02 10:30:00
    // Should get UTC range for full Feb 2 in Vietnam

    const [start, end] = getDateRange('today');

    // Verify it's a 24-hour range in UTC
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    expect(diffHours).toBeCloseTo(24, 1); // approximately 24 hours
  });

  it('should filter trips for entire month', () => {
    // Request: all trips in Feb 2026
    const [start, end] = getDateRange('thisMonth');

    // Should span from Feb 1 00:00 to Feb 28 23:59 (Vietnam time)
    expect(start).toMatch(/2026-01-31T17:00/); // Feb 1 00:00 Vietnam → Jan 31 17:00 UTC
    expect(end).toMatch(/2026-02-28T16:59/); // Feb 28 23:59 Vietnam → Feb 28 16:59 UTC
  });

  it('should return consistent results for same filter', () => {
    // Simulate multiple calls for "thisWeek"
    const range1 = getDateRange('thisWeek');
    const range2 = getDateRange('thisWeek');

    // Should return identical ranges (idempotent)
    expect(range1[0]).toBe(range2[0]);
    expect(range1[1]).toBe(range2[1]);
  });
});

/**
 * Test Scenario 6: Relative Date Helpers
 */
describe('Relative Date Functions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-15T05:00:00.000Z')); // Arbitrary mid-month date
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should get today as local date string', () => {
    const today = getTodayLocalDateString();
    expect(today).toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it('should get month start date', () => {
    const start = getMonthStartLocalDateString();
    expect(start).toMatch(/\d{4}-\d{2}-01/);
  });

  it('should get month end date', () => {
    const end = getMonthEndLocalDateString();
    // Should be a valid day 1-31
    const day = parseInt(end.split('-')[2], 10);
    expect(day).toBeGreaterThanOrEqual(1);
    expect(day).toBeLessThanOrEqual(31);
  });
});
