/**
 * مواعيد السوق (Cairo) والذهب (COMEX/LBMA).
 * Cairo: EET UTC+2 (winter) / EEST UTC+3 (summer).
 */

const CAIRO_TZ = 'Africa/Cairo';

/** يوم الجمعة = 5، السبت = 6 في getDay() */
function getCairoNow(): { minutesSinceMidnight: number; day: number; isWeekend: boolean } {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: CAIRO_TZ,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
    day: 'numeric',
    weekday: 'short',
  });
  const parts = formatter.formatToParts(new Date());
  let hour = 0, minute = 0, day = 0;
  for (const p of parts) {
    if (p.type === 'hour') hour = parseInt(p.value, 10);
    if (p.type === 'minute') minute = parseInt(p.value, 10);
    if (p.type === 'weekday') day = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.value);
  }
  const minutesSinceMidnight = hour * 60 + minute;
  const isWeekend = day === 5 || day === 6; // Fri, Sat
  return { minutesSinceMidnight, day, isWeekend };
}

/** أعياد رسمية مصرية (شهر-يوم) — أمثلة؛ يُفضّل استكمال القائمة */
const EGYPT_HOLIDAYS: string[] = [
  '01-01', // رأس السنة
  '04-25', // تحرير سيناء
  '05-01', // عيد العمال
  '07-23', // ثورة 23 يوليو
  '10-06', // نصر أكتوبر
  // رمضان وعيد الفطر والأضحى متغيرة — يمكن إضافتها حسب السنة
];

function isEgyptHoliday(): boolean {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: CAIRO_TZ,
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(new Date());
  let month = '', day = '';
  for (const p of parts) {
    if (p.type === 'month') month = p.value;
    if (p.type === 'day') day = p.value;
  }
  return EGYPT_HOLIDAYS.includes(`${month}-${day}`);
}

export type MarketStatus = 'pre' | 'open' | 'auction' | 'closing' | 'closed';

export interface MarketStatusResult {
  status: MarketStatus;
  label: { ar: string; en: string };
  color: 'green' | 'yellow' | 'red';
}

export function getMarketStatus(): MarketStatusResult {
  const { minutesSinceMidnight, isWeekend } = getCairoNow();
  const closed = isWeekend || isEgyptHoliday();

  if (closed) {
    return {
      status: 'closed',
      label: { ar: 'مغلق', en: 'Closed' },
      color: 'red',
    };
  }

  if (minutesSinceMidnight < 9 * 60 + 30) {
    return { status: 'closed', label: { ar: 'مغلق', en: 'Closed' }, color: 'red' };
  }
  if (minutesSinceMidnight < 10 * 60) {
    return {
      status: 'pre',
      label: { ar: 'جلسة استكشافية', en: 'Pre-market' },
      color: 'yellow',
    };
  }
  if (minutesSinceMidnight < 14 * 60 + 15) {
    return {
      status: 'open',
      label: { ar: 'مفتوح', en: 'Open' },
      color: 'green',
    };
  }
  if (minutesSinceMidnight < 14 * 60 + 25) {
    return {
      status: 'auction',
      label: { ar: 'مزاد الإغلاق', en: 'Closing auction' },
      color: 'yellow',
    };
  }
  if (minutesSinceMidnight < 14 * 60 + 30) {
    return {
      status: 'closing',
      label: { ar: 'إغلاق', en: 'Closing' },
      color: 'yellow',
    };
  }
  return {
    status: 'closed',
    label: { ar: 'مغلق', en: 'Closed' },
    color: 'red',
  };
}

/** للتوافق مع واجهة الأسهم: isOpen + nextOpen/nextClose كـ ISO strings */
export function getMarketStatusForStocks(): { isOpen: boolean; nextOpen: string; nextClose: string } {
  const result = getMarketStatus();
  const isOpen = result.status === 'open' || result.status === 'pre' || result.status === 'auction' || result.status === 'closing';
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: CAIRO_TZ,
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const now = new Date();
  const parts = formatter.formatToParts(now);
  let hour = 0, minute = 0, year = 0, month = 0, day = 0, weekday = '';
  for (const p of parts) {
    if (p.type === 'hour') hour = parseInt(p.value, 10);
    if (p.type === 'minute') minute = parseInt(p.value, 10);
    if (p.type === 'year') year = parseInt(p.value, 10);
    if (p.type === 'month') month = parseInt(p.value, 10);
    if (p.type === 'day') day = parseInt(p.value, 10);
    if (p.type === 'weekday') weekday = p.value;
  }
  const dayIndex = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekday);
  const totalMinutes = hour * 60 + minute;
  const closeMinutes = 14 * 60 + 15;
  let nextOpen = new Date(Date.UTC(year, month - 1, day, 8, 0, 0, 0));
  let nextClose = new Date(Date.UTC(year, month - 1, day, 12, 15, 0, 0));
  if (dayIndex === 5 || dayIndex === 6) {
    const daysToAdd = dayIndex === 5 ? 2 : 1;
    nextOpen.setUTCDate(nextOpen.getUTCDate() + daysToAdd);
    nextClose.setUTCDate(nextClose.getUTCDate() + daysToAdd);
  } else if (totalMinutes >= closeMinutes) {
    nextOpen.setUTCDate(nextOpen.getUTCDate() + 1);
    nextClose.setUTCDate(nextClose.getUTCDate() + 1);
    if (nextOpen.getUTCDay() === 5) {
      nextOpen.setUTCDate(nextOpen.getUTCDate() + 2);
      nextClose.setUTCDate(nextClose.getUTCDate() + 2);
    }
  }
  return {
    isOpen,
    nextOpen: nextOpen.toISOString(),
    nextClose: nextClose.toISOString(),
  };
}

/** سوق الذهب العالمي: الأحد 23:00 GMT → الجمعة 22:00 GMT */
export function getGoldMarketStatus(): { isOpen: boolean; label: { ar: string; en: string } } {
  const gmt = new Date();
  const utcDay = gmt.getUTCDay();
  const utcHours = gmt.getUTCHours();
  const utcMinutes = gmt.getUTCMinutes();
  const utcTotalMinutes = utcDay * 24 * 60 + utcHours * 60 + utcMinutes;

  const sunday23 = 0 * 24 * 60 + 23 * 60;
  const friday22 = 5 * 24 * 60 + 22 * 60;

  const isOpen =
    utcTotalMinutes >= sunday23 && utcTotalMinutes < friday22;

  if (isOpen) {
    return { isOpen: true, label: { ar: 'مفتوح', en: 'Open' } };
  }
  return {
    isOpen: false,
    label: { ar: 'مغلق حتى الأحد', en: 'Closed until Sunday' },
  };
}
