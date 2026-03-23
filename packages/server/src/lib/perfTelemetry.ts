import { ONE_MINUTE_MS } from './constants.ts';
import { logger } from './logger.ts';

type RouteStat = {
  count: number;
  totalMs: number;
  maxMs: number;
};

const routeStats = new Map<string, RouteStat>();

function keyOf(method: string, path: string): string {
  return `${method.toUpperCase()} ${path}`;
}

export function recordRequestLatency(method: string, path: string, durationMs: number): void {
  const key = keyOf(method, path);
  const prev = routeStats.get(key);
  if (!prev) {
    routeStats.set(key, { count: 1, totalMs: durationMs, maxMs: durationMs });
    return;
  }
  prev.count += 1;
  prev.totalMs += durationMs;
  if (durationMs > prev.maxMs) prev.maxMs = durationMs;
}

export function flushRequestLatencyTop(limit = 8): void {
  if (routeStats.size === 0) return;
  const snapshot = Array.from(routeStats.entries())
    .map(([route, stat]) => ({
      route,
      count: stat.count,
      avgMs: Math.round(stat.totalMs / stat.count),
      maxMs: stat.maxMs,
    }))
    .sort((a, b) => b.avgMs - a.avgMs)
    .slice(0, limit);
  logger.info('request_latency_top', { routes: snapshot });
  routeStats.clear();
}

export function startPerfTelemetry(): () => void {
  const timer = setInterval(() => flushRequestLatencyTop(), ONE_MINUTE_MS);
  return () => clearInterval(timer);
}

