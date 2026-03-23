/** Performance thresholds used for telemetry/alerts (milliseconds). */
export const PERF_THRESHOLDS_MS = {
  /** warn when request latency crosses this duration */
  slowRequest: 900,
  /** warn when Prisma query latency crosses this duration */
  slowQuery: 250,
} as const;

