/**
 * رموز Yahoo Finance التي تختلف عن النمط TICKER.CA.
 * يُستخدم في مصدر الأسعار وفي getFinancials/getStockHistory لضمان نفس الرمز.
 */
export const YAHOO_SYMBOL_MAP: Record<string, string> = {
  OTMT: 'EGS693V1C014',
  ODHN: 'EGS70321C012',
};

export function toYahooSymbol(egxTicker: string): string {
  const base = egxTicker.trim().toUpperCase();
  const mapped = YAHOO_SYMBOL_MAP[base];
  const suffix = base.endsWith('.CA') ? '' : '.CA';
  return `${mapped ?? base}${suffix}`;
}
