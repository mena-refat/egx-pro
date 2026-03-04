import { useState, useEffect, useRef } from 'react';
import { Stock } from '../types';

export function useLivePrices() {
  const [prices, setPrices] = useState<Record<string, Stock>>({});
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const { hostname, port } = window.location;

      // في حالة التشغيل عبر Vite على 5173 نخلي الـ WebSocket على 3000 (السيرفر Node)
      const targetPort = port === '5173' ? '3000' : (port || '3000');
      const wsUrl = `${protocol}//${hostname}:${targetPort}`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        console.log('WebSocket connected');
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
          console.error('Failed to parse WebSocket message', error);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        console.log('WebSocket disconnected. Reconnecting in 5s...');
        // Auto reconnect
        reconnectTimeoutRef.current = setTimeout(connect, 5000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
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
