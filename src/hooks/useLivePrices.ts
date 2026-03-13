import { useState, useEffect, useRef } from 'react';
import { Stock } from '../types';
import { getAccessToken } from '../lib/auth/tokens';
import { TIMEOUTS } from '../lib/constants';

export function useLivePrices() {
  const [prices, setPrices] = useState<Record<string, Stock>>({});
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectDelayRef = useRef(1000);

  useEffect(() => {
    const connect = () => {
      const token = getAccessToken();
      if (!token) return;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const { hostname, port } = window.location;

      // In dev on Vite (5173) connect to the Node server on 3000.
      // In production the reverse proxy forwards WebSocket on the same host/port.
      const targetPort = port === '5173' ? '3000' : port;
      const portSuffix = targetPort ? `:${targetPort}` : '';
      const wsUrl = `${protocol}//${hostname}${portSuffix}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        // Send token as first message — keeps it out of URL/logs
        ws.send(JSON.stringify({ type: 'AUTH', token }));
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
        ws.close();
      };
    };

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return { prices, isConnected };
}
