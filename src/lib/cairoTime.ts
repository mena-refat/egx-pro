/** Cairo timezone */
const CAIRO_TZ = 'Africa/Cairo';

function getCairoParts(now: Date): { hour: number; minute: number; weekday: string } {
  const hourPart = new Intl.DateTimeFormat('en-CA', { timeZone: CAIRO_TZ, hour: 'numeric', hour12: false }).formatToParts(now).find((p) => p.type === 'hour');
  const minutePart = new Intl.DateTimeFormat('en-CA', { timeZone: CAIRO_TZ, minute: '2-digit' }).formatToParts(now).find((p) => p.type === 'minute');
  const weekday = new Intl.DateTimeFormat('en-CA', { timeZone: CAIRO_TZ, weekday: 'short' }).format(now);
  return {
    hour: parseInt(hourPart?.value ?? '0', 10),
    minute: parseInt(minutePart?.value ?? '0', 10),
    weekday,
  };
}

/** Market open: Sun–Thu 10:00–14:30 Cairo */
export function isEgyptMarketOpen(now: Date = new Date()): boolean {
  const { hour, minute, weekday } = getCairoParts(now);
  if (weekday === 'Fri' || weekday === 'Sat') return false;
  const totalMinutes = hour * 60 + minute;
  const open = 10 * 60;
  const close = 14 * 60 + 30;
  return totalMinutes >= open && totalMinutes < close;
}

/** Format time in Cairo (e.g. "11:23") */
export function formatCairoTime(now: Date = new Date()): string {
  return now.toLocaleString('ar-EG', { timeZone: CAIRO_TZ, hour: '2-digit', minute: '2-digit', hour12: false });
}

/** Cairo time in English 12h — returns hour, minute and AM/PM for live colon */
export function formatCairoTimeEn(now: Date = new Date()): { hour: string; minute: string; ampm: 'AM' | 'PM' } {
  const { hour, minute } = getCairoParts(now);
  const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const ampm: 'AM' | 'PM' = hour < 12 ? 'AM' : 'PM';
  return {
    hour: hour12.toString().padStart(2, '0'),
    minute: minute.toString().padStart(2, '0'),
    ampm,
  };
}
