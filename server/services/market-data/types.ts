export interface StockQuote {
  symbol:        string;   // e.g. "COMI"
  price:         number;
  change:        number;   // absolute change
  changePercent: number;   // % change
  open:          number;
  high:          number;
  low:           number;
  volume:        number;
  previousClose: number;
  timestamp:     Date;
  source:        'TWELVEDATA' | 'EGXLYTICS' | 'YAHOO' | 'CACHE';
}

export interface DataSourceResult {
  quotes:  Map<string, StockQuote>;
  failed:  string[];   // symbols that failed
  source:  string;
  latency: number;     // ms
}

/** كل source لازم يطبق الـ interface ده */
export interface IMarketDataSource {
  name:     string;
  priority: number;    // 1 = highest (lower number = higher priority)
  isAvailable(): Promise<boolean>;
  fetchQuotes(symbols: string[]): Promise<DataSourceResult>;
}
