/**
 * src/utils/date.ts
 * 
 * Unified date/time handling for entire application
 * 
 * CRITICAL: All database queries must use getDateRange() for filtering
 * All displays must use formatToLocalTimezone() for showing dates
 * This ensures consistency across timezone boundaries, month-ends, leap years
 */

import {
  format,
  parseISO,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  addDays,
  addSeconds,
  subSeconds,
} from 'date-fns';
import { vi } from 'date-fns/locale';

/**
 * Get user's timezone offset in hours
 * Example: Vietnam is UTC+07:00, returns 7
 * 
 * @returns Timezone offset in hours (positive for east, negative for west)
 */
export function getTimezoneOffset(): number {
  return -new Date().getTimezoneOffset() / 60;
}

/**
 * Get user's timezone name
 * Example: "ICT" for Indochina Time (UTC+07:00)
 */
export function getTimezoneName(): string {
  const date = new Date();
  const timeZoneName = new Intl.DateTimeFormat('en-US', {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timeZoneName: 'short',
  })
    .formatToParts(date)
    .find(part => part.type === 'timeZoneName')?.value;

  return timeZoneName || `UTC${getTimezoneOffset() > 0 ? '+' : ''}${getTimezoneOffset()}`;
}

/**
 * Format UTC ISO string to local timezone for display
 * 
 * @param dateString ISO 8601 UTC string: "2026-02-02T03:00:00.000Z"
 * @param formatString date-fns format: 'PPp' (default), 'yyyy-MM-dd HH:mm:ss', 'dd/MM/yyyy', etc.
 * @param locale date-fns locale object (default: Vietnamese)
 * @returns Formatted string in user's local timezone
 * 
 * @example
 * formatToLocalTimezone('2026-02-02T03:00:00.000Z', 'PPp')
 * // → "2 tháng 2, 2026, 10:00" (Vietnam UTC+07:00)
 */
export function formatToLocalTimezone(
  dateString: string,
  formatString = 'PPp',
  locale = vi
): string {
  try {
    if (!dateString) return '';
    const date = parseISO(dateString);
    return format(date, formatString, { locale });
  } catch (error) {
    console.error('[date.ts] formatToLocalTimezone error:', error, dateString);
    return dateString;
  }
}

/**
 * Format only date part to local timezone (without time)
 * 
 * @example
 * formatDateOnly('2026-02-02T03:00:00.000Z')
 * // → "02/02/2026"
 */
export function formatDateOnly(dateString: string): string {
  return formatToLocalTimezone(dateString, 'dd/MM/yyyy');
}

/**
 * Format only time part to local timezone
 * 
 * @example
 * formatTimeOnly('2026-02-02T03:00:00.000Z')
 * // → "10:00:00"
 */
export function formatTimeOnly(dateString: string): string {
  return formatToLocalTimezone(dateString, 'HH:mm:ss');
}

/**
 * Convert local date string (YYYY-MM-DD) to UTC ISO boundaries
 * 
 * This is CRITICAL for date range filtering
 * Converts user's 00:00-23:59 on a date to full UTC day
 * 
 * @param localDateString Local date in YYYY-MM-DD format
 * @returns [utcStart, utcEnd] ISO 8601 UTC strings
 * 
 * @example
 * User: Vietnam UTC+07:00
 * normalizeToUtcDay('2026-02-02')
 * → [
 *     '2026-02-01T17:00:00.000Z',   // User's Feb 2, 00:00:00
 *     '2026-02-02T16:59:59.999Z'    // User's Feb 2, 23:59:59
 *   ]
 */
export function normalizeToUtcDay(localDateString: string): [string, string] {
  try {
    // Parse as local date at 00:00:00
    const parts = localDateString.split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
    const day = parseInt(parts[2], 10);

    // Create date in local timezone at 00:00:00
    const dayStart = new Date(year, month, day, 0, 0, 0, 0);

    // Create end of day at 23:59:59.999
    const dayEnd = new Date(year, month, day, 23, 59, 59, 999);

    // Convert to ISO UTC strings
    const startUtc = dayStart.toISOString();
    const endUtc = dayEnd.toISOString();

    return [startUtc, endUtc];
  } catch (error) {
    console.error('[date.ts] normalizeToUtcDay error:', error, localDateString);
    // Fallback: return start and end of provided date
    const start = `${localDateString}T00:00:00.000Z`;
    const end = `${localDateString}T23:59:59.999Z`;
    return [start, end];
  }
}

/**
 * Get date range in UTC for database filtering
 * 
 * CRITICAL: All date filtering in repositories MUST use this function
 * 
 * @param rangeType 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'custom'
 * @param startDate For 'custom': local date string (YYYY-MM-DD)
 * @param endDate For 'custom': local date string (YYYY-MM-DD)
 * @returns [startUtc, endUtc] ISO 8601 UTC strings for database query
 * 
 * @example
 * // User: Vietnam UTC+07:00, Current: 2026-02-02 10:30:00
 * 
 * getDateRange('today')
 * // → ['2026-02-01T17:00:00.000Z', '2026-02-02T16:59:59.999Z']
 * 
 * getDateRange('thisMonth')
 * // → ['2026-01-31T17:00:00.000Z', '2026-03-02T16:59:59.999Z']
 * 
 * getDateRange('custom', '2026-02-01', '2026-02-28')
 * // → ['2026-01-31T17:00:00.000Z', '2026-02-28T16:59:59.999Z']
 */
export function getDateRange(
  rangeType:
    | 'today'
    | 'yesterday'
    | 'thisWeek'
    | 'lastWeek'
    | 'thisMonth'
    | 'lastMonth'
    | 'thisYear'
    | 'lastYear'
    | 'custom',
  startDate?: string,
  endDate?: string
): [string, string] {
  try {
    const now = new Date();

    let localStart: Date;
    let localEnd: Date;

    switch (rangeType) {
      case 'today': {
        localStart = startOfDay(now);
        localEnd = endOfDay(now);
        break;
      }

      case 'yesterday': {
        const yesterday = addDays(now, -1);
        localStart = startOfDay(yesterday);
        localEnd = endOfDay(yesterday);
        break;
      }

      case 'thisWeek': {
        // Week starts on Monday in Vietnam (date-fns default with locale)
        localStart = startOfWeek(now, { weekStartsOn: 1 });
        localEnd = endOfWeek(now, { weekStartsOn: 1 });
        break;
      }

      case 'lastWeek': {
        const lastWeekDay = addDays(now, -7);
        localStart = startOfWeek(lastWeekDay, { weekStartsOn: 1 });
        localEnd = endOfWeek(lastWeekDay, { weekStartsOn: 1 });
        break;
      }

      case 'thisMonth': {
        localStart = startOfMonth(now);
        localEnd = endOfMonth(now);
        break;
      }

      case 'lastMonth': {
        const lastMonthDate = addDays(now, -30);
        localStart = startOfMonth(lastMonthDate);
        localEnd = endOfMonth(lastMonthDate);
        break;
      }

      case 'thisYear': {
        localStart = startOfYear(now);
        localEnd = endOfYear(now);
        break;
      }

      case 'lastYear': {
        const lastYearDate = addDays(now, -365);
        localStart = startOfYear(lastYearDate);
        localEnd = endOfYear(lastYearDate);
        break;
      }

      case 'custom': {
        if (!startDate || !endDate) {
          console.warn('[date.ts] getDateRange custom requires startDate and endDate');
          return [new Date().toISOString(), new Date().toISOString()];
        }
        const [utcStart] = normalizeToUtcDay(startDate);
        const [, utcEndOfEndDate] = normalizeToUtcDay(endDate);
        // Use start of startDate and end of endDate
        return [utcStart, utcEndOfEndDate];
      }

      default:
        console.warn(`[date.ts] Unknown rangeType: ${rangeType}`);
        localStart = startOfDay(now);
        localEnd = endOfDay(now);
    }

    // Convert local dates to ISO UTC strings
    const startUtc = localStart.toISOString();
    const endUtc = localEnd.toISOString();

    return [startUtc, endUtc];
  } catch (error) {
    console.error('[date.ts] getDateRange error:', error, rangeType, startDate, endDate);
    const now = new Date().toISOString();
    return [now, now];
  }
}

/**
 * Build SQL WHERE clause for date range filtering
 * Used by repositories for consistent query building
 * 
 * @param dateColumn Column name in database: 'created_at', 'start_date', 'updated_at', etc.
 * @returns WHERE clause: "column_name >= ? AND column_name <= ?"
 * 
 * @example
 * const clause = buildDateRangeWhere('created_at');
 * db.prepare(`SELECT * FROM trips WHERE ${clause}`).all(startUtc, endUtc);
 */
export function buildDateRangeWhere(dateColumn = 'created_at'): string {
  return `${dateColumn} >= ? AND ${dateColumn} <= ?`;
}

/**
 * Check if a date is between two dates (in UTC)
 * Useful for client-side filtering or validation
 * 
 * @param date ISO UTC string
 * @param startDate ISO UTC string
 * @param endDate ISO UTC string
 * @returns true if date is within range (inclusive)
 */
export function isDateInRange(date: string, startDate: string, endDate: string): boolean {
  try {
    const d = parseISO(date);
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    return d >= start && d <= end;
  } catch (error) {
    console.error('[date.ts] isDateInRange error:', error);
    return false;
  }
}

/**
 * Get current time in UTC ISO format
 * Use this when creating new records instead of Date.now()
 * 
 * @returns ISO 8601 UTC string
 * 
 * @example
 * const now = getCurrentUtcTime();
 * db.prepare('INSERT INTO trips (created_at) VALUES (?)').run(now);
 */
export function getCurrentUtcTime(): string {
  return new Date().toISOString();
}

/**
 * Get start of today in local timezone as YYYY-MM-DD
 * Useful for date pickers and form defaults
 * 
 * @example
 * getTodayLocalDateString()
 * // → "2026-02-02" (on Feb 2 in Vietnam)
 */
export function getTodayLocalDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get yesterday's date as YYYY-MM-DD
 */
export function getYesterdayLocalDateString(): string {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const year = yesterday.getFullYear();
  const month = String(yesterday.getMonth() + 1).padStart(2, '0');
  const day = String(yesterday.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get start of month in local timezone as YYYY-MM-DD
 */
export function getMonthStartLocalDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}-01`;
}

/**
 * Get end of month in local timezone as YYYY-MM-DD
 */
export function getMonthEndLocalDateString(): string {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const year = lastDay.getFullYear();
  const month = String(lastDay.getMonth() + 1).padStart(2, '0');
  const day = String(lastDay.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculate day difference in local timezone
 * 
 * @param date1 ISO UTC string
 * @param date2 ISO UTC string
 * @returns Number of days between (positive if date2 > date1)
 * 
 * @example
 * daysDifference('2026-02-01T00:00:00.000Z', '2026-02-03T00:00:00.000Z')
 * // → 2
 */
export function daysDifference(date1: string, date2: string): number {
  try {
    const d1 = parseISO(date1);
    const d2 = parseISO(date2);
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.floor((d2.getTime() - d1.getTime()) / msPerDay);
  } catch (error) {
    console.error('[date.ts] daysDifference error:', error);
    return 0;
  }
}

/**
 * Parse and validate ISO UTC date string
 * Returns null if invalid
 * 
 * @example
 * parseUtcDate('2026-02-02T03:00:00.000Z')
 * // → Date object or null
 */
export function parseUtcDate(dateString: string): Date | null {
  try {
    const date = parseISO(dateString);
    // Validate it's a valid date
    if (!isNaN(date.getTime())) {
      return date;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Add days to a UTC date
 * 
 * @param dateString ISO UTC string
 * @param days Number of days to add (negative to subtract)
 * @returns New ISO UTC string
 */
export function addDaysToDate(dateString: string, days: number): string {
  try {
    const date = parseISO(dateString);
    const newDate = addDays(date, days);
    return newDate.toISOString();
  } catch (error) {
    console.error('[date.ts] addDaysToDate error:', error);
    return dateString;
  }
}

/**
 * Check if date is today in local timezone
 */
export function isToday(dateString: string): boolean {
  try {
    const date = parseISO(dateString);
    const now = new Date();
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  } catch (error) {
    console.error('[date.ts] isToday error:', error);
    return false;
  }
}

/**
 * Check if date is in the past
 */
export function isPast(dateString: string): boolean {
  try {
    const date = parseISO(dateString);
    return date < new Date();
  } catch (error) {
    console.error('[date.ts] isPast error:', error);
    return false;
  }
}

/**
 * Check if date is in the future
 */
export function isFuture(dateString: string): boolean {
  try {
    const date = parseISO(dateString);
    return date > new Date();
  } catch (error) {
    console.error('[date.ts] isFuture error:', error);
    return false;
  }
}

/**
 * Format date relative to now (e.g., "2 days ago", "in 3 hours")
 * 
 * @example
 * formatDistanceToNow('2026-02-02T03:00:00.000Z')
 * // → "2 hours ago" or "in 2 hours" depending on current time
 */
export function formatDistanceToNow(dateString: string): string {
  try {
    const date = parseISO(dateString);
    const now = new Date();
    const diffMs = Math.abs(now.getTime() - date.getTime());
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} tuần trước`;

    return formatToLocalTimezone(dateString, 'PPp');
  } catch (error) {
    console.error('[date.ts] formatDistanceToNow error:', error);
    return dateString;
  }
}

/**
 * Debug helper: Show date in all formats for troubleshooting
 */
export function debugDate(dateString: string): object {
  try {
    const date = parseISO(dateString);
    return {
      input: dateString,
      local: formatToLocalTimezone(dateString, 'yyyy-MM-dd HH:mm:ss'),
      timezone: getTimezoneName(),
      offset: getTimezoneOffset(),
      isoUtc: date.toISOString(),
      timestamp: date.getTime(),
      components: {
        year: date.getFullYear(),
        month: date.getMonth() + 1,
        day: date.getDate(),
        hour: date.getHours(),
        minute: date.getMinutes(),
        second: date.getSeconds(),
      },
    };
  } catch (error) {
    console.error('[date.ts] debugDate error:', error);
    return { error: 'Invalid date' };
  }
}
