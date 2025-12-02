/**
 * Date utility functions
 */

/**
 * Parses a date parameter string (YYYY-MM-DD) to a Date object
 */
export function parseDateParam(s: string | null): Date | null {
  if (!s) return null;
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10) - 1;
  const d = parseInt(m[3], 10);
  const dt = new Date(y, mo, d);
  if (isNaN(dt.getTime())) return null;
  return dt;
}

/**
 * Formats a Date object as YYYY-MM-DD
 */
export function formatDateParam(date: Date): string {
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Get term date range based on season and year
 */
export function getTermDateRange(
  season: string,
  year: number,
): { startDate: Date; endDate: Date } {
  let startDate: Date, endDate: Date;

  if (season === "Winter") {
    startDate = new Date(year, 0, 1); // Jan 1
    endDate = new Date(year, 3, 30); // Apr 30
  } else if (season === "Spring") {
    startDate = new Date(year, 4, 1); // May 1
    endDate = new Date(year, 7, 31); // Aug 31
  } else {
    // Fall
    startDate = new Date(year, 8, 1); // Sep 1
    endDate = new Date(year, 11, 31); // Dec 31
  }

  return { startDate, endDate };
}

/**
 * Calculate progress percentage for a term
 */
export function calculateTermProgress(term: string): number {
  const [season, yearStr] = term.split(" ");
  const year = parseInt(yearStr);

  if (!season || isNaN(year)) return 0;

  const { startDate, endDate } = getTermDateRange(season, year);
  const today = new Date();

  const totalDays =
    (endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24);
  const elapsedDays =
    (today.getTime() - startDate.getTime()) / (1000 * 3600 * 24);

  let progress = (elapsedDays / totalDays) * 100;
  if (progress < 0) progress = 0;
  if (progress > 100) progress = 100;

  return progress;
}

/**
 * Convert UTC date to local date (for due dates)
 */
export function utcToLocalDate(utcDateString: string): Date {
  const dueDateUTC = new Date(utcDateString);
  return new Date(
    dueDateUTC.getUTCFullYear(),
    dueDateUTC.getUTCMonth(),
    dueDateUTC.getUTCDate(),
  );
}
