/**
 * Cairo timezone helpers for prediction daily limits (reset at midnight Cairo).
 * Cairo = UTC+2.
 */

/** Current date string in Africa/Cairo: YYYY-MM-DD */
export function getCairoDateString(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(new Date());
  const year = parts.find((p) => p.type === 'year')?.value ?? '';
  const month = parts.find((p) => p.type === 'month')?.value ?? '';
  const day = parts.find((p) => p.type === 'day')?.value ?? '';
  return `${year}-${month}-${day}`;
}

/** Cairo date string for a given Date (for daily key from createdAt). */
export function getCairoDateStringFromDate(date: Date): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find((p) => p.type === 'year')?.value ?? '';
  const month = parts.find((p) => p.type === 'month')?.value ?? '';
  const day = parts.find((p) => p.type === 'day')?.value ?? '';
  return `${year}-${month}-${day}`;
}

/** Unix timestamp (seconds) for next midnight in Africa/Cairo. Use with Redis EXPIREAT. Respects DST (EET UTC+2 / EEST UTC+3). */
export function getCairoMidnightExpirySeconds(): number {
  const dateStr = getCairoDateString();
  const [y, m, d] = dateStr.split('-').map(Number);
  const tomorrow = new Date(Date.UTC(y, m - 1, d + 1, 12, 0, 0, 0));
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    hour: 'numeric',
    hour12: false,
  });
  const hourAtNoonUtc = parseInt(formatter.format(tomorrow), 10);
  const offset = hourAtNoonUtc - 12;
  const midnightCairoUtc = Date.UTC(y, m - 1, d + 1, -offset, 0, 0, 0);
  return Math.ceil(midnightCairoUtc / 1000);
}

function getCairoDateParts(date: Date): { year: number; month: number; day: number; hour: number } {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  return {
    year: Number(parts.find((p) => p.type === 'year')?.value ?? '0'),
    month: Number(parts.find((p) => p.type === 'month')?.value ?? '0'),
    day: Number(parts.find((p) => p.type === 'day')?.value ?? '0'),
    hour: Number(parts.find((p) => p.type === 'hour')?.value ?? '0'),
  };
}

export function getAnalysisSessionDateString(now = new Date()): string {
  const parts = getCairoDateParts(now);
  const sessionAnchor = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12, 0, 0, 0));
  if (parts.hour < 12) {
    sessionAnchor.setUTCDate(sessionAnchor.getUTCDate() - 1);
  }
  return getCairoDateStringFromDate(sessionAnchor);
}

export function getAnalysisNewsCutoff(now = new Date()): Date {
  const parts = getCairoDateParts(now);
  const cutoffAnchor = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12, 0, 0, 0));
  if (parts.hour < 12) {
    cutoffAnchor.setUTCDate(cutoffAnchor.getUTCDate() - 1);
    cutoffAnchor.setUTCHours(21, 59, 59, 999);
    return cutoffAnchor;
  }
  return now;
}
