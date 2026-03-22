import { useState, useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { getAccessToken } from '../lib/auth/tokens';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
const WS_BASE  = process.env.EXPO_PUBLIC_WS_URL ?? API_URL.replace(/^http/, 'ws');

type StockPrice = {
  symbol:        string;
  price:         number;
  change:        number;
  changePercent: number;
  volume:        number;
};

type PriceListener   = (patch: Record<string, StockPrice>) => void;
type ConnectListener = (connected: boolean) => void;

// ─── Shared WebSocket singleton ──────────────────────────────────
// One connection shared across all useLivePrices() callers.
// Tickers are the union of every mounted hook's tickers.
// Benefits:
//   • Only one connection regardless of how many screens/components use this hook
//   • Live prices update immediately when new tickers are added (no reconnect needed)
//   • Proper cleanup when the last hook unmounts

const priceListeners   = new Set<PriceListener>();
const connectListeners = new Set<ConnectListener>();

/**
 * Maps each hook instance (by Symbol id) to its current ticker list.
 * Union of all values = tickers to subscribe to.
 */
const hookTickers = new Map<symbol, string[]>();

let ws:             WebSocket | null                     = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectDelay  = 1_000;
let singletonConn   = false;

function getUnionTickers(): string[] {
  const s = new Set<string>();
  hookTickers.forEach((arr) => arr.forEach((t) => s.add(t)));
  return Array.from(s);
}

function sendSubscribe() {
  const tickers = getUnionTickers();
  if (ws?.readyState === WebSocket.OPEN && tickers.length > 0) {
    ws.send(JSON.stringify({ type: 'SUBSCRIBE', tickers }));
  }
}

async function connectShared() {
  const token = await getAccessToken();
  if (!token || hookTickers.size === 0) return;

  ws = new WebSocket(WS_BASE);

  ws.onopen = () => {
    reconnectDelay = 1_000;
    singletonConn  = true;
    connectListeners.forEach((l) => l(true));
    ws!.send(JSON.stringify({ type: 'AUTH', token }));
    // Small delay so auth is processed before subscribe
    setTimeout(sendSubscribe, 500);
  };

  ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data as string) as { type?: string; data?: unknown };
      if (
        (msg.type === 'PRICES_UPDATE' ||
         msg.type === 'INITIAL_PRICES' ||
         msg.type === 'PRICES') &&
        Array.isArray(msg.data)
      ) {
        const patch: Record<string, StockPrice> = {};
        for (const item of msg.data as Array<Record<string, unknown>>) {
          const key = (item.ticker ?? item.symbol) as string | undefined;
          if (!key) continue;
          patch[key] = {
            symbol:        key,
            price:         Number(item.price)         || 0,
            change:        Number(item.change)        || 0,
            changePercent: Number(item.changePercent) || 0,
            volume:        Number(item.volume)        || 0,
          };
        }
        if (Object.keys(patch).length > 0) {
          priceListeners.forEach((l) => l(patch));
        }
      }
    } catch {
      // ignore malformed frames
    }
  };

  ws.onclose = () => {
    ws            = null;
    singletonConn = false;
    connectListeners.forEach((l) => l(false));
    if (hookTickers.size > 0) {
      reconnectTimer = setTimeout(() => {
        reconnectDelay = Math.min(reconnectDelay * 2, 30_000);
        void connectShared();
      }, reconnectDelay);
    }
  };

  ws.onerror = () => ws?.close();
}

function teardownShared() {
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  ws?.close();
  ws = null;
}

// Register AppState listener once at module level (not per hook)
AppState.addEventListener('change', (state: AppStateStatus) => {
  if (state === 'background' || state === 'inactive') {
    teardownShared();
  } else if (state === 'active' && hookTickers.size > 0 && !ws) {
    void connectShared();
  }
});

// ─── Hook ─────────────────────────────────────────────────────────
export function useLivePrices(tickers: string[] = []) {
  const [prices, setPrices]         = useState<Record<string, StockPrice>>({});
  const [isConnected, setConnected] = useState(singletonConn);
  const hookIdRef                   = useRef<symbol>(Symbol());

  // ── Sync tickers into the global map ────────────────────────────
  // Runs whenever the caller's ticker list changes (join → stable string dep).
  // Sends a new SUBSCRIBE if the WebSocket is already open so new tickers
  // start streaming immediately (no reconnect needed).
  const tickersKey = tickers.join(',');
  useEffect(() => {
    const prev    = hookTickers.get(hookIdRef.current) ?? [];
    hookTickers.set(hookIdRef.current, tickers);

    const prevSet = new Set(prev);
    const hasNew  = tickers.some((t) => !prevSet.has(t));
    if (hasNew && ws?.readyState === WebSocket.OPEN) sendSubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickersKey]);

  // ── Mount / unmount lifecycle ────────────────────────────────────
  useEffect(() => {
    const hookId = hookIdRef.current;
    // Register initial tickers (may already be set by the tickers effect above,
    // but this effect runs first so we initialise here to keep ordering safe)
    hookTickers.set(hookId, tickers);

    // Price listener: only forward prices for tickers this hook cares about
    const onPrices: PriceListener = (patch) => {
      const mine     = hookTickers.get(hookId) ?? [];
      const relevant = Object.entries(patch).filter(([k]) => mine.includes(k));
      if (relevant.length > 0) {
        setPrices((prev) => ({ ...prev, ...Object.fromEntries(relevant) }));
      }
    };

    const onConn: ConnectListener = (v) => setConnected(v);

    priceListeners.add(onPrices);
    connectListeners.add(onConn);

    // Start shared WebSocket if not already running
    if (!ws) void connectShared();

    return () => {
      priceListeners.delete(onPrices);
      connectListeners.delete(onConn);
      hookTickers.delete(hookId);
      // Tear down WebSocket when the last hook unmounts
      if (hookTickers.size === 0) teardownShared();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { prices, isConnected };
}
