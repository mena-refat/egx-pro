import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { getAccessToken } from '../lib/auth/tokens';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

type StockPrice = {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
};

export function useLivePrices(tickers: string[] = []) {
  const [prices, setPrices] = useState<Record<string, StockPrice>>({});
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const delayRef = useRef(1000);
  const tickersRef = useRef(tickers);

  useEffect(() => {
    tickersRef.current = tickers;
  }, [tickers]);

  const connect = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) return;

    const wsUrl = API_URL.replace(/^http/, 'ws');
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      delayRef.current = 1000;
      ws.send(JSON.stringify({ type: 'AUTH', token }));
      if (tickersRef.current.length > 0) {
        setTimeout(() => {
          ws.send(JSON.stringify({ type: 'SUBSCRIBE', tickers: tickersRef.current }));
        }, 500);
      }
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data as string);
        if (msg.type === 'PRICES' && msg.data) {
          setPrices((prev) => ({ ...prev, ...msg.data }));
        }
      } catch {
        // ignore
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      wsRef.current = null;
      reconnectRef.current = setTimeout(() => {
        delayRef.current = Math.min(delayRef.current * 2, 30_000);
        connect();
      }, delayRef.current);
    };

    ws.onerror = () => ws.close();
  }, []);

  useEffect(() => {
    connect();

    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'background' || state === 'inactive') {
        wsRef.current?.close();
        if (reconnectRef.current) clearTimeout(reconnectRef.current);
      } else if (state === 'active' && !wsRef.current) {
        connect();
      }
    });

    return () => {
      sub.remove();
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { prices, isConnected };
}

