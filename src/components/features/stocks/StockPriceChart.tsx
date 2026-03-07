import React, { useEffect, useRef } from 'react';
import { createChart, AreaSeries, ColorType } from 'lightweight-charts';

export interface HistoryPoint {
  date: string;
  price: number;
}

interface StockPriceChartProps {
  data: HistoryPoint[];
  height?: number;
  lineColor?: string;
}

/** Price history chart using lightweight-charts (stock/OHLC context). */
export function StockPriceChart({
  data,
  height = 220,
  lineColor = '#8b5cf6',
}: StockPriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);

  useEffect(() => {
    if (!containerRef.current || !data.length) return;

    const chart = createChart(containerRef.current, {
      layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#64748b' },
      grid: { vertLines: { visible: false }, horzLines: { color: 'rgba(100,116,139,0.15)' } },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false },
      height,
    });

    const areaSeries = chart.addSeries(AreaSeries, {
      lineColor,
      topColor: `${lineColor}4D`,
      bottomColor: `${lineColor}0D`,
      lineWidth: 2,
    });

    const seriesData = data.map((d) => {
      const isBusinessDay = /^\d{4}-\d{2}-\d{2}/.test(d.date);
      const time: string | number = isBusinessDay ? d.date.slice(0, 10) : Math.floor(new Date(d.date).getTime() / 1000);
      return { time: time as import('lightweight-charts').Time, value: d.price };
    });
    areaSeries.setData(seriesData);
    chart.timeScale().fitContent();

    chartRef.current = chart;
    return () => {
      chart.remove();
      chartRef.current = null;
    };
  }, [data, height, lineColor]);

  if (!data.length) return <div className="w-full flex items-center justify-center text-slate-400 text-sm" style={{ height }}>—</div>;

  return <div ref={containerRef} className="w-full" style={{ height }} />;
}
