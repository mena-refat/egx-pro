import { useState, useEffect, useRef, useCallback } from 'react';
import { getAccessToken } from '../lib/auth/tokens';

interface StockData {
  ticker: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  high: number;
  low: number;
  high52w: number;
  low52w: number;
  lastUpdated: number;
}

export const useLiveStockPrices = () => {
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (socketRef.current?.readyState === WebSocket.OPEN) return;

    const token = getAccessToken();
    if (!token) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const { hostname, port } = window.location;
    const targetPort = port === '5173' ? '3000' : (port || '3000');
    const wsUrl = `${protocol}//${hostname}:${targetPort}?token=${encodeURIComponent(token)}`;

    if (import.meta.env.DEV) console.log(`🔌 Connecting to WebSocket: ${wsUrl}`);
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      if (import.meta.env.DEV) console.log('✅ WebSocket Connected');
      setIsConnected(true);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'PRICES_UPDATE' || message.type === 'INITIAL_PRICES') {
          setStocks(message.data);
          setLastUpdated(message.timestamp || Date.now());
        }
      } catch (err) {
        console.error('❌ WebSocket Message Error:', err);
      }
    };

    socket.onclose = () => {
      if (import.meta.env.DEV) console.log('🔌 WebSocket Disconnected. Retrying in 5s...');
      setIsConnected(false);
      socketRef.current = null;
      reconnectTimeoutRef.current = setTimeout(() => {
        setRefreshTrigger(prev => prev + 1);
      }, 5000);
    };

    socket.onerror = (err) => {
      console.error('❌ WebSocket Error:', err);
      socket.close();
    };

    socketRef.current = socket;
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connect, refreshTrigger]);

  return { stocks, lastUpdated, isConnected };
};
