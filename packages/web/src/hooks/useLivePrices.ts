import { useState, useEffect, useRef } from 'react';
import { Stock } from '../types';
import { getAccessToken } from '../lib/auth/tokens';

/** Optional list of tickers to subscribe to; server sends only these. Omit or empty = receive all. */
export function useLivePrices(subscribedTickers?: string[]) {
  const [prices, setPrices] = useState<Record<string, Stock>>({});
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelayRef = useRef(1000);
  const tickersRef = useRef<string[]>([]);
  const subscribeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sendSubscribe = (ws: WebSocket) => {
    if (subscribeTimeoutRef.current) clearTimeout(subscribeTimeoutRef.current);
    subscribeTimeoutRef.current = setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN) {
        const tickers = tickersRef.current;
        ws.send(JSON.stringify({ type: 'SUBSCRIBE', tickers: Array.isArray(tickers) ? tickers : [] }));
      }
      subscribeTimeoutRef.current = null;
    }, 500);
  };

  useEffect(() => {
    tickersRef.current = subscribedTickers ?? [];
  }, [subscribedTickers]);

  useEffect(() => {
    const connect = () => {
      const token = getAccessToken();
      if (!token) return;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const { hostname, port } = window.location;

      const targetPort = port === '5173' ? '3000' : port;
      const portSuffix = targetPort ? `:${targetPort}` : '';
      const wsUrl = `${protocol}//${hostname}${portSuffix}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setConnectionError(null);
        ws.send(JSON.stringify({ type: 'AUTH', token }));
        if (tickersRef.current.length > 0) {
          setTimeout(() => sendSubscribe(ws), 0);
        }
        if (import.meta.env.DEV) console.log('WebSocket connected');
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if ((data.type === 'prices' || data.type === 'INITIAL_PRICES' || data.type === 'PRICES_UPDATE') && Array.isArray(data.data)) {
            const newPrices: Record<string, Stock> = {};
            data.data.forEach((stock: Stock) => {
              newPrices[stock.ticker] = stock;
            });
            setPrices((prev) => ({ ...prev, ...newPrices }));
          }
        } catch (error) {
          if (import.meta.env.DEV) console.error('Failed to parse WebSocket message', error);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        const delay = reconnectDelayRef.current;
        reconnectDelayRef.current = Math.min(reconnectDelayRef.current * 2, 30000);
        if (import.meta.env.DEV) console.log(`WebSocket disconnected. Reconnecting in ${delay}ms...`);
        reconnectTimeoutRef.current = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        setConnectionError('فشل الاتصال بالأسعار المباشرة');
        ws.close();
      };
    };

    const handlePageHide = () => {
      if (reconnectTimeoutRef.current) { clearTimeout(reconnectTimeoutRef.current); reconnectTimeoutRef.current = null; }
      if (subscribeTimeoutRef.current) { clearTimeout(subscribeTimeoutRef.current); subscribeTimeoutRef.current = null; }
      if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    };

    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        reconnectDelayRef.current = 1000;
        connect();
      }
    };

    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('pageshow', handlePageShow);

    connect();

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('pageshow', handlePageShow);
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (subscribeTimeoutRef.current) clearTimeout(subscribeTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  useEffect(() => {
    if (!isConnected || !wsRef.current || tickersRef.current.length === 0) return;
    sendSubscribe(wsRef.current);
  }, [isConnected, subscribedTickers]);

  return { prices, isConnected, connectionError };
}
