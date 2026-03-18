const CAIRO_TZ = 'Africa/Cairo';

function getCairoParts(now: Date): { hour: number; minute: number; weekday: string } {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: CAIRO_TZ,
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
    weekday: 'short',
  });
  const parts = fmt.formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '0';
  return {
    hour: parseInt(get('hour'), 10),
    minute: parseInt(get('minute'), 10),
    weekday: get('weekday'),
  };
}

export function isEgyptMarketOpen(now: Date = new Date()): boolean {
  const { hour, minute, weekday } = getCairoParts(now);
  if (weekday === 'Fri' || weekday === 'Sat') return false;
  const total = hour * 60 + minute;
  return total >= 10 * 60 && total < 14 * 60 + 30;
}

export function formatCairoTime(now: Date = new Date()): string {
  return now.toLocaleTimeString('ar-EG', {
    timeZone: CAIRO_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

