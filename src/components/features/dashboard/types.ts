export type DataPoint = { value: number; change: number; changePercent: number };

export interface DashboardMarketOverview {
  usdEgp: DataPoint;
  egx30: DataPoint;
  egx30Capped?: DataPoint;
  egx70: DataPoint;
  egx100: DataPoint;
  egx33?: DataPoint;
  egx35?: DataPoint;
  gold: DataPoint;
  lastUpdated: number;
}
