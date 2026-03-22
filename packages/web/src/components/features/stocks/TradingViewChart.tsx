import React, { useEffect, useRef } from 'react';

const WIDGET_SCRIPT = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';

/** رمز السهم في TradingView للبورصة المصرية: EGX:TICKER */
export function toTradingViewSymbol(ticker: string): string {
  return `EGX:${ticker.trim().toUpperCase()}`;
}

export interface TradingViewChartProps {
  /** رمز السهم (مثل COMI) */
  symbol: string;
  /** ارتفاع الحاوية بالبكسل */
  height?: number;
  /** واجهة فاتحة أو داكنة */
  theme?: 'light' | 'dark';
  /** لغة الويدجت: ar | en */
  locale?: string;
  /** الفاصل الزمني الافتراضي */
  interval?: '1' | '5' | '15' | '30' | '60' | 'D' | 'W' | 'M';
}

export function TradingViewChart({
  symbol,
  height = 400,
  theme = 'light',
  locale = 'en',
  interval = 'D',
}: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !symbol) return;

    const tradingViewSymbol = toTradingViewSymbol(symbol);
    const config = {
      autosize: true,
      symbol: tradingViewSymbol,
      interval,
      timezone: 'Africa/Cairo',
      theme,
      backgroundColor: theme === 'dark' ? 'rgba(22, 27, 34, 1)' : 'rgba(255, 255, 255, 1)',
      style: '1',
      locale,
      allow_symbol_change: false,
      hide_side_toolbar: false,
      save_image: true,
      calendar: false,
      studies: [],
      show_popup_button: true,
    };

    container.innerHTML = '';
    const script = document.createElement('script');
    script.src = WIDGET_SCRIPT;
    script.async = true;
    script.textContent = JSON.stringify(config);
    container.appendChild(script);

    return () => {
      container.innerHTML = '';
    };
  }, [symbol, height, theme, locale, interval]);

  return (
    <div
      ref={containerRef}
      className="tradingview-widget-container w-full rounded-xl overflow-hidden"
      style={{ width: '100%', minHeight: height, height }}
    />
  );
}
