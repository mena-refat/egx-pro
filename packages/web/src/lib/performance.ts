type WebVitalName = 'LCP' | 'CLS' | 'INP' | 'FCP' | 'TTFB';

type WebVitalMetric = {
  name: WebVitalName;
  value: number;
};

function report(metric: WebVitalMetric): void {
  if (!import.meta.env.DEV) return;
  // Dev-only output for local tuning without polluting production logs.
  // eslint-disable-next-line no-console
  console.info(`[perf] ${metric.name}: ${metric.value}`);
}

export function initWebPerformanceTracking(): void {
  if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') return;

  try {
    const navEntries = performance.getEntriesByType('navigation');
    if (navEntries.length > 0) {
      const nav = navEntries[0] as PerformanceNavigationTiming;
      report({ name: 'TTFB', value: Math.round(nav.responseStart) });
    }
  } catch {
    // ignore
  }

  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (last) report({ name: 'LCP', value: Math.round(last.startTime) });
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {
    // ignore unsupported browsers
  }

  try {
    const fcpObserver = new PerformanceObserver((list) => {
      const entry = list.getEntries().find((e) => e.name === 'first-contentful-paint');
      if (entry) report({ name: 'FCP', value: Math.round(entry.startTime) });
    });
    fcpObserver.observe({ type: 'paint', buffered: true });
  } catch {
    // ignore unsupported browsers
  }

  try {
    let cls = 0;
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as Array<PerformanceEntry & { value?: number; hadRecentInput?: boolean }>) {
        if (!entry.hadRecentInput) cls += entry.value ?? 0;
      }
      report({ name: 'CLS', value: Number(cls.toFixed(4)) });
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });
  } catch {
    // ignore unsupported browsers
  }

  try {
    const inpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries() as Array<PerformanceEntry & { duration?: number }>;
      const maxDuration = entries.reduce((max, e) => Math.max(max, e.duration ?? 0), 0);
      if (maxDuration > 0) {
        report({ name: 'INP', value: Math.round(maxDuration) });
      }
    });
    inpObserver.observe({ type: 'event', buffered: true });
  } catch {
    // ignore unsupported browsers
  }
}

